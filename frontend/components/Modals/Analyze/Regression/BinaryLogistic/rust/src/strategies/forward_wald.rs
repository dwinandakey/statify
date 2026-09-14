use crate::models::config::LogisticConfig;
use crate::models::result::{
    CategoricalCoding, CorrelationOfEstimatesRow, FittingWarnings as ResultFittingWarnings,
    IterationHistoryBlock, IterationHistoryRow, LogisticResult, ModelInfo, ModelSummary, OmniTests, RemainderTest,
    StepDetail, StepHistory, StepSummaryRow, VariableNotInEquation, VariableRow,
};
use crate::stats::irls::{fit, fit_with_history, FittedModel, FittingWarnings, IterationRecord};
use crate::stats::score_test::{calculate_score_test, calculate_group_score_test};
use crate::stats::design_matrix::VariableGroup;
use crate::stats::wald::calculate_joint_wald_test;
// --- TAMBAHAN IMPORT ---
use crate::stats::hosmer_lemeshow;
use crate::stats::casewise;
use crate::stats::correlation_of_estimates;
use crate::stats::classification_plot;
use crate::stats::saved_predictions;
use crate::stats::table;

use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};
use wasm_bindgen::JsValue;

pub fn run(
    x_matrix: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    config: &LogisticConfig,
    feature_names: &[String],
    codings: Option<Vec<CategoricalCoding>>,
    variable_groups: &[VariableGroup],
) -> Result<LogisticResult, JsValue> {
    let n_samples = x_matrix.nrows();
    let _n_total_vars = x_matrix.ncols();
    let n_groups = variable_groups.len();

    // Track included GROUPS (not individual columns)
    let mut included_group_indices: Vec<usize> = Vec::new();
    // Derive included column indices from groups
    let mut included_indices: Vec<usize> = Vec::new();
    let mut steps_history: Vec<StepHistory> = Vec::new();
    // Vektor baru untuk menyimpan snapshot lengkap
    let mut steps_details: Vec<StepDetail> = Vec::new();

    // --- STEP 0: NULL MODEL ---
    // Jika include_constant = true, null model adalah intercept-only
    // Jika include_constant = false, kita hitung baseline LL secara analitis
    let (mut current_model, null_iter_history, null_log_likelihood) = if config.include_constant {
        let null_x = DMatrix::from_element(n_samples, 1, 1.0);
        
        // Use fit_with_history if iteration_history is enabled
        if config.iteration_history {
            let result = fit_with_history(
                &null_x,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Null Model): {}", e)))?;
            let ll = result.model.final_log_likelihood;
            (result.model, Some(result.iteration_history), ll)
        } else {
            let result = fit(
                &null_x,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Null Model): {}", e)))?;
            let ll = result.final_log_likelihood;
            (result, None, ll)
        }
    } else {
        // Tanpa constant: Null model log-likelihood adalah -n*ln(2) (prediksi 0.5 untuk semua)
        let n = n_samples as f64;
        let null_ll = n * 0.5_f64.ln(); // = n * ln(0.5) = -n * ln(2)
        
        let predictions = DVector::from_element(n_samples, 0.5);
        let residuals = y_vector - &predictions;
        let weights = DVector::from_element(n_samples, 0.25);
        
        let dummy_model = FittedModel {
            beta: DVector::zeros(0),
            covariance_matrix: DMatrix::zeros(0, 0),
            final_log_likelihood: null_ll,
            iterations: 0,
            converged: true,
            residuals,
            weights,
            predictions,
            warnings: FittingWarnings::default(),
        };
        
        (dummy_model, None, null_ll)
    };

    // Tracking untuk Step Chi-Square
    let mut prev_log_likelihood = null_log_likelihood;
    let mut prev_n_vars = 0;

    // Build iteration history block for Block 0
    let block_0_iter_history: Option<IterationHistoryBlock> = if config.iteration_history && config.include_constant {
        null_iter_history.as_ref().map(|history| {
            IterationHistoryBlock {
                block: 0,
                step: 0,
                variable_names: vec!["Constant".to_string()],
                rows: history.iter().map(|rec| IterationHistoryRow {
                    iteration: rec.iteration,
                    neg2_log_likelihood: rec.neg2_log_likelihood,
                    coefficients: rec.coefficients.clone(),
                }).collect(),
                initial_neg2ll: Some(-2.0 * null_log_likelihood),
                converged: current_model.converged,
                final_iteration: current_model.iterations,
            }
        })
    } else {
        None
    };

    // --- CAPTURE STEP 0 (Block 0) ---
    let step0_detail = calculate_step_snapshot(
        0,
        "Start".to_string(),
        None,
        &current_model,
        x_matrix,
        y_vector,
        &included_indices,
        null_log_likelihood,
        prev_log_likelihood, // Prev = Null untuk Step 0
        prev_n_vars,
        feature_names,
        config, // Pass config
        block_0_iter_history, // BARU: Iteration history
        variable_groups,
        &included_group_indices,
    );
    steps_details.push(step0_detail);

    // Ambil data Block 0 Constant dari snapshot yang baru dibuat
    let block_0_row = if config.include_constant && !steps_details[0].variables_in_equation.is_empty() {
        steps_details[0].variables_in_equation[0].clone()
    } else {
        // Dummy row untuk kasus tanpa constant
        VariableRow {
            label: "(No Constant)".to_string(),
            b: 0.0,
            error: 0.0,
            wald: 0.0,
            df: 0,
            sig: 1.0,
            exp_b: 1.0,
            lower_ci: 1.0,
            upper_ci: 1.0,
        }
    };

    let mut step_count = 0;

    // --- STEPWISE LOOP ---
    loop {
        step_count += 1;
        if step_count > n_groups * 2 + 10 {
            break; // Safety break
        }

        let mut best_candidate_group_idx: Option<usize> = None;
        let mut best_score_stat = 0.0;
        let mut _best_score_df = 1_i32;

        // ---------------------------------------------------------
        // A. FORWARD ENTRY: Score Test (Group-aware)
        // SPSS selects the VARIABLE GROUP with the LARGEST Score statistic
        // among those meeting the p_entry threshold.
        // For categorical vars, this is a joint score test (multi-df).
        // ---------------------------------------------------------
        let design_matrix = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);

        for (g_idx, group) in variable_groups.iter().enumerate() {
            if included_group_indices.contains(&g_idx) {
                continue;
            }

            let (stat, df, p_val) = if group.column_indices.len() == 1 {
                // Single column: standard score test
                let candidate_col = x_matrix.column(group.column_indices[0]).into_owned();
                let (s, p) = calculate_score_test(
                    &current_model.residuals,
                    &current_model.weights,
                    &design_matrix,
                    &candidate_col,
                    &current_model.covariance_matrix,
                );
                (s, 1, p)
            } else {
                // Multi-column group: joint score test
                let cols: Vec<DVector<f64>> = group.column_indices.iter()
                    .map(|&ci| x_matrix.column(ci).into_owned())
                    .collect();
                let candidate_matrix = DMatrix::from_columns(&cols);
                calculate_group_score_test(
                    &current_model.residuals,
                    &current_model.weights,
                    &design_matrix,
                    &candidate_matrix,
                    &current_model.covariance_matrix,
                )
            };

            if p_val < config.p_entry && stat > best_score_stat {
                best_score_stat = stat;
                _best_score_df = df;
                best_candidate_group_idx = Some(g_idx);
            }
        }

        let mut variable_added = false;
        let mut step_iter_history: Option<Vec<IterationRecord>> = None;

        // Masukkan Group Terbaik
        if let Some(g_idx) = best_candidate_group_idx {
            let group = &variable_groups[g_idx];
            let mut trial_group_indices = included_group_indices.clone();
            trial_group_indices.push(g_idx);
            // Derive column indices from groups
            let trial_col_indices: Vec<usize> = trial_group_indices.iter()
                .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied())
                .collect();
            let trial_x = build_design_matrix(x_matrix, &trial_col_indices, n_samples, config.include_constant);

            // Use fit_with_history if iteration_history is enabled
            let fit_result = if config.iteration_history {
                match fit_with_history(
                    &trial_x,
                    y_vector,
                    config.max_iterations,
                    config.convergence_threshold,
                ) {
                    Ok(result) => {
                        step_iter_history = Some(result.iteration_history);
                        Ok(result.model)
                    }
                    Err(e) => Err(e),
                }
            } else {
                fit(&trial_x, y_vector, config.max_iterations, config.convergence_threshold)
            };

            if let Ok(new_model) = fit_result {
                steps_history.push(StepHistory {
                    step: step_count,
                    action: "Entered".to_string(),
                    variable: group.name.clone(),
                    score_statistic: best_score_stat,
                    improvement_chi_sq: best_score_stat,
                    model_log_likelihood: new_model.final_log_likelihood,
                    nagelkerke_r2: calculate_nagelkerke(
                        null_log_likelihood,
                        new_model.final_log_likelihood,
                        n_samples,
                    ),
                });

                // Update tracker sebelum update current
                prev_log_likelihood = current_model.final_log_likelihood;
                prev_n_vars = included_indices.len();

                included_group_indices = trial_group_indices;
                included_indices = trial_col_indices;
                current_model = new_model;
                variable_added = true;

                // Build iteration history block for this step
                let step_history_block: Option<IterationHistoryBlock> = if config.iteration_history {
                    step_iter_history.as_ref().map(|history| {
                        let mut var_names: Vec<String> = Vec::new();
                        if config.include_constant {
                            var_names.push("Constant".to_string());
                        }
                        for &idx in &included_indices {
                            let label = if idx < feature_names.len() {
                                feature_names[idx].clone()
                            } else {
                                format!("Var_{}", idx + 1)
                            };
                            var_names.push(label);
                        }
                        IterationHistoryBlock {
                            block: 1,
                            step: step_count,
                            variable_names: var_names,
                            rows: history.iter().map(|rec| IterationHistoryRow {
                                iteration: rec.iteration,
                                neg2_log_likelihood: rec.neg2_log_likelihood,
                                coefficients: rec.coefficients.clone(),
                            }).collect(),
                            initial_neg2ll: Some(-2.0 * current_model.final_log_likelihood),
                            converged: current_model.converged,
                            final_iteration: current_model.iterations,
                        }
                    })
                } else {
                    None
                };

                // --- CAPTURE STEP N (Entered) ---
                let step_detail = calculate_step_snapshot(
                    step_count,
                    "Entered".to_string(),
                    Some(group.name.clone()),
                    &current_model,
                    x_matrix,
                    y_vector,
                    &included_indices,
                    null_log_likelihood,
                    prev_log_likelihood,
                    prev_n_vars,
                    feature_names,
                    config,
                    step_history_block,
                    variable_groups,
                    &included_group_indices,
                );
                steps_details.push(step_detail);
            }
        }

        // ---------------------------------------------------------
        // B. BACKWARD REMOVAL: Wald Test (Group-aware)
        // For categorical groups: use joint Wald test (multi-df)
        // ---------------------------------------------------------
        if !included_group_indices.is_empty() {
            let mut worst_group_loc: Option<usize> = None;
            let mut max_p_val = -1.0;
            let mut wald_stat_removed = 0.0;
            let beta_offset = if config.include_constant { 1 } else { 0 };

            for (loc, &g_idx) in included_group_indices.iter().enumerate() {
                // Hindari membuang group yang baru saja masuk di langkah yang sama
                if variable_added && best_candidate_group_idx == Some(g_idx) {
                    continue;
                }

                let group = &variable_groups[g_idx];

                // Find beta indices for this group
                let beta_indices: Vec<usize> = group.column_indices.iter()
                    .filter_map(|&col_idx| {
                        included_indices.iter().position(|&c| c == col_idx)
                            .map(|pos| pos + beta_offset)
                    })
                    .collect();

                let (wald, _df, p_val) = calculate_joint_wald_test(
                    &current_model.beta,
                    &current_model.covariance_matrix,
                    &beta_indices,
                );

                if p_val > config.p_removal && p_val > max_p_val {
                    max_p_val = p_val;
                    worst_group_loc = Some(loc);
                    wald_stat_removed = wald;
                }
            }

            // Eksekusi Penghapusan
            if let Some(loc) = worst_group_loc {
                // SPSS assigns each action (entry/removal) its own step number
                step_count += 1;

                let removed_group_idx = included_group_indices[loc];
                let removed_group_name = variable_groups[removed_group_idx].name.clone();

                // Update tracker sebelum update current
                prev_log_likelihood = current_model.final_log_likelihood;
                prev_n_vars = included_indices.len();

                included_group_indices.remove(loc);
                // Rebuild included_indices from remaining groups
                included_indices = included_group_indices.iter()
                    .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied())
                    .collect();

                // Re-fit model setelah penghapusan
                let reduced_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);

                // Use fit_with_history if iteration_history is enabled
                let mut removal_iter_history: Option<Vec<IterationRecord>> = None;
                let fit_result = if config.iteration_history {
                    match fit_with_history(
                        &reduced_x,
                        y_vector,
                        config.max_iterations,
                        config.convergence_threshold,
                    ) {
                        Ok(result) => {
                            removal_iter_history = Some(result.iteration_history);
                            Ok(result.model)
                        }
                        Err(e) => Err(e),
                    }
                } else {
                    fit(&reduced_x, y_vector, config.max_iterations, config.convergence_threshold)
                };

                if let Ok(reduced_model) = fit_result {
                    steps_history.push(StepHistory {
                        step: step_count,
                        action: "Removed".to_string(),
                        variable: removed_group_name.clone(),
                        score_statistic: 0.0,
                        improvement_chi_sq: wald_stat_removed,
                        model_log_likelihood: reduced_model.final_log_likelihood,
                        nagelkerke_r2: calculate_nagelkerke(
                            null_log_likelihood,
                            reduced_model.final_log_likelihood,
                            n_samples,
                        ),
                    });

                    current_model = reduced_model;

                    // Build iteration history block for removal step
                    let removal_history_block: Option<IterationHistoryBlock> = if config.iteration_history {
                        removal_iter_history.as_ref().map(|history| {
                            let mut var_names: Vec<String> = Vec::new();
                            if config.include_constant {
                                var_names.push("Constant".to_string());
                            }
                            for &idx in &included_indices {
                                let label = if idx < feature_names.len() {
                                    feature_names[idx].clone()
                                } else {
                                    format!("Var_{}", idx + 1)
                                };
                                var_names.push(label);
                            }
                            IterationHistoryBlock {
                                block: 1,
                                step: step_count,
                                variable_names: var_names,
                                rows: history.iter().map(|rec| IterationHistoryRow {
                                    iteration: rec.iteration,
                                    neg2_log_likelihood: rec.neg2_log_likelihood,
                                    coefficients: rec.coefficients.clone(),
                                }).collect(),
                                initial_neg2ll: Some(-2.0 * current_model.final_log_likelihood),
                                converged: current_model.converged,
                                final_iteration: current_model.iterations,
                            }
                        })
                    } else {
                        None
                    };

                    // --- CAPTURE STEP N (Removed) ---
                    let step_detail = calculate_step_snapshot(
                        step_count,
                        "Removed".to_string(),
                        Some(removed_group_name),
                        &current_model,
                        x_matrix,
                        y_vector,
                        &included_indices,
                        null_log_likelihood,
                        prev_log_likelihood,
                        prev_n_vars,
                        feature_names,
                        config,
                        removal_history_block,
                        variable_groups,
                        &included_group_indices,
                    );
                    steps_details.push(step_detail);
                }
            }
        }

        // Break condition
        let last_step_num = steps_history.last().map(|s| s.step).unwrap_or(0);
        if last_step_num < step_count {
            break;
        }
    }

    // --- FINAL RESULT CONSTRUCTION ---
    let final_step = steps_details.last().unwrap().clone();

    // Overall Omnibus (Kumulatif Model)
    let chi_sq_model = 2.0 * (current_model.final_log_likelihood - null_log_likelihood).abs();
    let df_model = included_indices.len() as i32;
    let omni_sig = if df_model > 0 {
        1.0 - ChiSquared::new(df_model as f64).unwrap().cdf(chi_sq_model)
    } else {
        1.0
    };

    // --- BARU: Hitung Casewise Listing Jika Diminta ---
    let casewise_result = if config.casewise_listing && !included_indices.is_empty() {
        let final_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
        let y_label_0 = "0";
        let y_label_1 = "1";
        
        Some(casewise::calculate_casewise_list(
            &final_x,
            y_vector,
            &current_model,
            config,
            y_label_0,
            y_label_1,
        ))
    } else {
        None
    };

    // --- BARU: Ambil Correlation of Estimates dari final step ---
    let corr_estimates_final = final_step.correlation_of_estimates.clone();

    // --- BARU: Generate Step Summary (SPSS Style) ---
    let step_summary: Vec<StepSummaryRow> = steps_details.iter()
        .filter(|s| s.step > 0) // Skip Step 0 (null model)
        .map(|s| {
            let improvement_chi = s.step_omni_tests.as_ref().map(|o| o.chi_square).unwrap_or(0.0);
            let improvement_df = s.step_omni_tests.as_ref().map(|o| o.df).unwrap_or(1);
            let improvement_sig = s.step_omni_tests.as_ref().map(|o| o.sig).unwrap_or(1.0);
            
            let model_chi = s.omni_tests.as_ref().map(|o| o.chi_square).unwrap_or(0.0);
            let model_df = s.omni_tests.as_ref().map(|o| o.df).unwrap_or(1);
            let model_sig = s.omni_tests.as_ref().map(|o| o.sig).unwrap_or(1.0);
            
            let var_action = match s.action.as_str() {
                "Entered" => format!("IN: {}", s.variable_changed.clone().unwrap_or_default()),
                "Removed" => format!("OUT: {}", s.variable_changed.clone().unwrap_or_default()),
                _ => s.variable_changed.clone().unwrap_or_default(),
            };
            
            StepSummaryRow {
                step: s.step,
                improvement_chi_square: improvement_chi,
                improvement_df,
                improvement_sig,
                model_chi_square: model_chi,
                model_df,
                model_sig,
                correct_pct: s.classification_table.overall_percentage,
                variable_action: var_action,
            }
        })
        .collect();

    Ok(LogisticResult {
        model_info: ModelInfo::default(),
        summary: final_step.summary,
        classification_table: final_step.classification_table,
        variables: final_step.variables_in_equation,
        variables_not_in_equation: final_step.variables_not_in_equation,
        omni_tests: OmniTests {
            chi_square: chi_sq_model,
            df: df_model,
            sig: omni_sig,
        },
        step_history: Some(steps_history),
        steps_detail: Some(steps_details),
        block_0_constant: block_0_row,
        block_0_variables_not_in: None,
        method_used: "Forward Wald".to_string(),
        assumption_tests: None,
        overall_remainder_test: final_step.remainder_test,
        categorical_codings: codings,
        // --- MODIFIKASI: AMBIL HL DARI FINAL STEP ---
        hosmer_lemeshow: final_step.hosmer_lemeshow,
        casewise_list: casewise_result,
        classification_plot_data: if config.classification_plots && !included_indices.is_empty() {
            Some(classification_plot::calculate_classification_plot(
                y_vector,
                &current_model.predictions,
                config.cutoff,
                "FALSE",
                "TRUE",
            ))
        } else {
            None
        },
        // --- BARU: Correlation of Estimates ---
        correlation_of_estimates: corr_estimates_final,
        // --- BARU: Step Summary ---
        step_summary: if step_summary.is_empty() { None } else { Some(step_summary) },
        // --- BARU: Saved Predictions ---
        saved_predictions: if !included_indices.is_empty() {
            let final_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
            saved_predictions::calculate_saved_predictions(
                &final_x,
                y_vector,
                &current_model,
                config,
            )
        } else {
            None
        },
        // --- BARU: Fitting Warnings dari IRLS ---
        fitting_warnings: {
            let w = &current_model.warnings;
            if w.possible_separation || w.quasi_separation || w.step_halving_used 
               || w.ridge_increased || w.near_singular_hessian || !w.messages.is_empty() {
                Some(ResultFittingWarnings {
                    possible_separation: w.possible_separation,
                    quasi_separation: w.quasi_separation,
                    step_halving_used: w.step_halving_used,
                    step_halving_count: w.step_halving_count,
                    ridge_increased: w.ridge_increased,
                    final_lambda: w.final_lambda,
                    near_singular_hessian: w.near_singular_hessian,
                    messages: w.messages.clone(),
                })
            } else {
                None
            }
        },
    })
}

// --- HELPER FUNCTIONS ---

fn build_design_matrix(original_x: &DMatrix<f64>, indices: &[usize], rows: usize, include_constant: bool) -> DMatrix<f64> {
    let mut columns: Vec<DVector<f64>> = Vec::new();
    
    // Tambahkan kolom intercept hanya jika include_constant = true
    if include_constant {
        columns.push(DVector::from_element(rows, 1.0));
    }
    
    for &idx in indices {
        columns.push(original_x.column(idx).into_owned());
    }
    
    // Jika tidak ada kolom sama sekali (tanpa constant dan tanpa variabel), kembalikan matriks kosong
    if columns.is_empty() {
        return DMatrix::zeros(rows, 0);
    }
    
    DMatrix::from_columns(&columns)
}

fn calculate_nagelkerke(null_ll: f64, model_ll: f64, n: usize) -> f64 {
    let diff = null_ll - model_ll;
    let cox_snell = 1.0 - (diff * (2.0 / n as f64)).exp();
    let max_r2 = 1.0 - (null_ll * (2.0 / n as f64)).exp();
    if max_r2 > 1e-12 {
        cox_snell / max_r2
    } else {
        0.0
    }
}

// --- HELPER UNTUK OVERALL STATISTICS (RESIDUAL CHI-SQUARE) ---
fn calculate_overall_remainder_stats(
    full_x: &DMatrix<f64>,
    _y_vector: &DVector<f64>,
    included_indices: &[usize],
    model: &FittedModel,
    include_constant: bool,
) -> Option<RemainderTest> {
    let n_total_vars = full_x.ncols();
    // 1. Identifikasi variabel yang belum masuk (Excluded)
    let excluded_indices: Vec<usize> = (0..n_total_vars)
        .filter(|i| !included_indices.contains(i))
        .collect();

    if excluded_indices.is_empty() {
        return None;
    }

    // 2. Bangun Matriks X untuk Excluded Variables (X_out)
    let mut x_out_cols = Vec::new();
    for &idx in &excluded_indices {
        x_out_cols.push(full_x.column(idx).into_owned());
    }
    let x_out = DMatrix::from_columns(&x_out_cols);

    // 3. Bangun Matriks X untuk Included Variables (X_in)
    // Termasuk Intercept jika include_constant = true
    let x_in = build_design_matrix(full_x, included_indices, full_x.nrows(), include_constant);

    // 4. Hitung Score Vector: U = X_out^T * residuals
    let u = x_out.transpose() * &model.residuals;

    // 5. Hitung Matriks Informasi
    // Optimalisasi perkalian matriks diagonal W:
    let mut x_out_weighted = x_out.clone();
    for (row_idx, &weight) in model.weights.iter().enumerate() {
        for col_idx in 0..x_out.ncols() {
            x_out_weighted[(row_idx, col_idx)] *= weight;
        }
    }

    let v_out = x_out.transpose() * &x_out_weighted; // X_out^T W X_out

    // 6. Variance Score yang Disesuaikan (Adjusted Variance)
    // Jika x_in kosong (tidak ada variabel dalam model), tidak ada koreksi
    let adjusted_var = if x_in.ncols() > 0 && model.covariance_matrix.ncols() > 0 {
        let v_cross = x_out_weighted.transpose() * &x_in; // X_out^T W X_in
        let inv_info_in = &model.covariance_matrix;
        let correction = &v_cross * inv_info_in * v_cross.transpose();
        v_out - correction
    } else {
        v_out
    };

    // 7. Hitung Statistik Score Global: S = U^T * Var(U)^-1 * U
    let score_stat = match adjusted_var.cholesky() {
        Some(chol) => {
            let sol = chol.solve(&u);
            u.dot(&sol)
        }
        None => 0.0,
    };

    let df = excluded_indices.len() as i32;
    let sig = if score_stat > 0.0 && df > 0 {
        1.0 - ChiSquared::new(df as f64).unwrap().cdf(score_stat)
    } else {
        1.0
    };

    Some(RemainderTest {
        chi_square: score_stat,
        df,
        sig,
    })
}

// Helper function untuk snapshot
fn calculate_step_snapshot(
    step: usize,
    action: String,
    variable_changed: Option<String>,
    model: &FittedModel,
    full_x: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    included_indices: &[usize],
    null_ll: f64,
    prev_ll: f64,
    prev_n_vars: usize,
    feature_names: &[String],
    config: &LogisticConfig,
    iteration_history: Option<IterationHistoryBlock>,
    variable_groups: &[VariableGroup],
    included_group_indices: &[usize],
) -> StepDetail {
    let n = y_vector.len();
    let _n_total_vars = full_x.ncols();
    let chi_dist_1df = ChiSquared::new(1.0).unwrap();
    let z_score = crate::utils::probability::z_score_from_confidence(config.confidence_level);

    // 1. Model Summary Statistics
    let diff = null_ll - model.final_log_likelihood;
    let cox_snell = 1.0 - (diff * (2.0 / n as f64)).exp();

    let summary = ModelSummary {
        log_likelihood: model.final_log_likelihood,
        cox_snell_r_square: cox_snell,
        nagelkerke_r_square: calculate_nagelkerke(null_ll, model.final_log_likelihood, n),
        converged: model.converged,
        iterations: model.iterations,
    };

    // 2. MODEL / BLOCK OMNIBUS (Vs Null)
    let chi_sq_model = 2.0 * (model.final_log_likelihood - null_ll).abs();
    let df_model = included_indices.len() as i32;
    let sig_model = if df_model > 0 {
        1.0 - ChiSquared::new(df_model as f64).unwrap().cdf(chi_sq_model)
    } else {
        1.0
    };

    let omni_tests_model = OmniTests {
        chi_square: chi_sq_model,
        df: df_model,
        sig: sig_model,
    };

    // 3. STEP OMNIBUS (Vs Previous Step)
    let chi_sq_step = if step == 0 {
        chi_sq_model
    } else {
        2.0 * (model.final_log_likelihood - prev_ll)
    };

    let df_step = if step == 0 {
        df_model
    } else {
        (included_indices.len() as i32 - prev_n_vars as i32).abs()
    };

    let sig_step = if df_step > 0 && chi_sq_step.abs() > 1e-9 {
        1.0 - ChiSquared::new(df_step as f64).unwrap().cdf(chi_sq_step.abs())
    } else {
        1.0
    };

    let omni_tests_step = OmniTests {
        chi_square: chi_sq_step,
        df: df_step,
        sig: sig_step,
    };

    // 4. Classification Table
    let class_table = table::calculate_classification_table(&model.predictions, y_vector, config.cutoff);

    // 5. Variables In Equation (Group-aware)
    let mut variables_in = Vec::new();
    let beta_offset = if config.include_constant { 1 } else { 0 };
    
    // Tambahkan Constant hanya jika include_constant = true
    if config.include_constant {
        let (b_int, se_int, wald_int) = if step == 0 && included_indices.is_empty() {
            let n_positive: f64 = y_vector.iter().filter(|&&y| y > 0.5).count() as f64;
            let n_total: f64 = y_vector.len() as f64;
            let p = (n_positive / n_total).clamp(1e-10, 1.0 - 1e-10);
            let beta_0 = (p / (1.0 - p)).ln();
            let variance_beta0 = 1.0 / (n_total * p * (1.0 - p));
            let se_0 = variance_beta0.sqrt();
            let wald_0 = if se_0 > 1e-12 { (beta_0 / se_0).powi(2) } else { 0.0 };
            (beta_0, se_0, wald_0)
        } else {
            let b = model.beta[0];
            let se = model.covariance_matrix[(0, 0)].sqrt();
            let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };
            (b, se, wald)
        };
        
        variables_in.push(VariableRow {
            label: "Constant".to_string(),
            b: b_int,
            error: se_int,
            wald: wald_int,
            df: 1,
            sig: 1.0 - chi_dist_1df.cdf(wald_int),
            exp_b: b_int.exp(),
            lower_ci: (b_int - z_score * se_int).exp(),
            upper_ci: (b_int + z_score * se_int).exp(),
        });
    }

    // Emit group rows for included variable groups
    for &g_idx in included_group_indices {
        let group = &variable_groups[g_idx];
        
        // Find beta indices for this group's columns
        let beta_indices: Vec<usize> = group.column_indices.iter()
            .filter_map(|&col_idx| {
                included_indices.iter().position(|&c| c == col_idx)
                    .map(|pos| pos + beta_offset)
            })
            .collect();

        // For multi-column groups (categorical): emit group omnibus row first
        if group.column_indices.len() > 1 && !beta_indices.is_empty() {
            let (joint_wald, joint_df, joint_sig) = calculate_joint_wald_test(
                &model.beta,
                &model.covariance_matrix,
                &beta_indices,
            );
            variables_in.push(VariableRow {
                label: group.name.clone(),
                b: 0.0,
                error: 0.0,
                wald: joint_wald,
                df: joint_df,
                sig: joint_sig,
                exp_b: 0.0,
                lower_ci: 0.0,
                upper_ci: 0.0,
            });
        }

        // Emit individual rows for each column in the group
        for (_sub_idx, &col_idx) in group.column_indices.iter().enumerate() {
            if let Some(pos) = included_indices.iter().position(|&c| c == col_idx) {
                let beta_idx = pos + beta_offset;
                let b = model.beta[beta_idx];
                let se = model.covariance_matrix[(beta_idx, beta_idx)].sqrt();
                let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };

                let label = if col_idx < feature_names.len() {
                    feature_names[col_idx].clone()
                } else {
                    format!("Var_{}", col_idx + 1)
                };

                variables_in.push(VariableRow {
                    label,
                    b,
                    error: se,
                    wald,
                    df: 1,
                    sig: 1.0 - chi_dist_1df.cdf(wald),
                    exp_b: b.exp(),
                    lower_ci: (b - z_score * se).exp(),
                    upper_ci: (b + z_score * se).exp(),
                });
            }
        }
    }

    // 6. Variables Not In Equation (Group-aware)
    let mut variables_not_in = Vec::new();
    let current_design_matrix = build_design_matrix(full_x, included_indices, n, config.include_constant);

    for (g_idx, group) in variable_groups.iter().enumerate() {
        if included_group_indices.contains(&g_idx) {
            continue;
        }

        // For multi-column groups: emit group omnibus row first
        if group.column_indices.len() > 1 {
            let cols: Vec<DVector<f64>> = group.column_indices.iter()
                .map(|&ci| full_x.column(ci).into_owned())
                .collect();
            let candidate_matrix = DMatrix::from_columns(&cols);
            let (group_stat, group_df, group_pval) = calculate_group_score_test(
                &model.residuals,
                &model.weights,
                &current_design_matrix,
                &candidate_matrix,
                &model.covariance_matrix,
            );
            variables_not_in.push(VariableNotInEquation {
                label: group.name.clone(),
                score: group_stat,
                df: group_df,
                sig: group_pval,
            });
        }

        // Emit individual rows
        for &col_idx in &group.column_indices {
            let candidate_col = full_x.column(col_idx).into_owned();
            let (stat, p_val) = calculate_score_test(
                &model.residuals,
                &model.weights,
                &current_design_matrix,
                &candidate_col,
                &model.covariance_matrix,
            );

            let label = if col_idx < feature_names.len() {
                feature_names[col_idx].clone()
            } else {
                format!("Var_{}", col_idx + 1)
            };

            variables_not_in.push(VariableNotInEquation {
                label,
                score: stat,
                df: 1,
                sig: p_val,
            });
        }
    }

    // 7. Remainder Test (Overall Statistics)
    let remainder_test =
        calculate_overall_remainder_stats(full_x, y_vector, included_indices, model, config.include_constant);

    // --- MODIFIKASI: HITUNG HOSMER-LEMESHOW ---
    let hl_result = if config.hosmer_lemeshow && step > 0 {
        match hosmer_lemeshow::calculate(y_vector, &model.predictions, 10) {
            Ok(res) => Some(res),
            Err(_) => None,
        }
    } else {
        None
    };

    // --- BARU: HITUNG CORRELATION OF ESTIMATES ---
    let corr_estimates_result: Option<Vec<CorrelationOfEstimatesRow>> = if config.correlations && step > 0 {
        // Build variable names (Constant + included vars)
        let mut var_names_for_corr: Vec<String> = Vec::new();
        if config.include_constant {
            var_names_for_corr.push("Constant".to_string());
        }
        for &idx in included_indices {
            let label = if idx < feature_names.len() {
                feature_names[idx].clone()
            } else {
                format!("Var_{}", idx + 1)
            };
            var_names_for_corr.push(label);
        }
        
        Some(correlation_of_estimates::calculate_correlation_of_estimates(
            &model.covariance_matrix,
            &var_names_for_corr,
        ))
    } else {
        None
    };

    // --- BARU: HITUNG CLASSIFICATION PLOT DATA ---
    let classification_plot_result = if config.classification_plots && step > 0 {
        let y_label_0 = "FALSE";
        let y_label_1 = "TRUE";
        Some(classification_plot::calculate_classification_plot(
            y_vector,
            &model.predictions,
            config.cutoff,
            y_label_0,
            y_label_1,
        ))
    } else {
        None
    };

    StepDetail {
        step,
        action,
        variable_changed,
        summary,
        classification_table: class_table,
        variables_in_equation: variables_in,
        variables_not_in_equation: variables_not_in,
        remainder_test,
        omni_tests: Some(omni_tests_model),     
        step_omni_tests: Some(omni_tests_step),
        model_if_term_removed: None,
        // --- MASUKKAN HOSMER LEMESHOW ---
        hosmer_lemeshow: hl_result,
        // --- BARU: CORRELATION OF ESTIMATES ---
        correlation_of_estimates: corr_estimates_result,
        // --- BARU: ITERATION HISTORY ---
        iteration_history,
        // --- BARU: CLASSIFICATION PLOT DATA ---
        classification_plot_data: classification_plot_result,
    }
}

