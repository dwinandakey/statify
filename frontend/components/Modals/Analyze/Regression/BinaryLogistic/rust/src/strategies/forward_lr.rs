use crate::models::config::LogisticConfig;
use crate::models::result::{
    CategoricalCoding, CorrelationOfEstimatesRow, FittingWarnings as ResultFittingWarnings,
    IterationHistoryBlock, IterationHistoryRow, LogisticResult, ModelIfTermRemovedRow, ModelInfo, ModelSummary, OmniTests, RemainderTest,
    StepDetail, StepHistory, StepSummaryRow, VariableNotInEquation, VariableRow,
};
use crate::stats::irls::{fit, fit_with_history, FittedModel, FittingWarnings, IterationRecord};
use crate::stats::score_test::{calculate_score_test, calculate_single_score_test, calculate_global_score_test_with_constant, calculate_group_score_test};
use crate::stats::design_matrix::VariableGroup;
use crate::stats::wald::calculate_joint_wald_test;
use crate::stats::hosmer_lemeshow;
use crate::stats::casewise;
use crate::stats::correlation_of_estimates;
use crate::stats::classification_plot;
use crate::stats::saved_predictions;
use crate::stats::table;

use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};
use wasm_bindgen::JsValue;

// Tambahkan argument feature_names: &[String]
pub fn run(
    x_matrix: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    config: &LogisticConfig,
    feature_names: &[String],
    codings: Option<Vec<CategoricalCoding>>,
    variable_groups: &[VariableGroup],
) -> Result<LogisticResult, JsValue> {
    let n_samples = x_matrix.nrows();
    let n_total_vars = x_matrix.ncols();

    let mut included_indices: Vec<usize> = Vec::new();
    let mut included_group_indices: Vec<usize> = Vec::new();
    let mut steps_history: Vec<StepHistory> = Vec::new();
    let mut steps_details: Vec<StepDetail> = Vec::new();
    let chi_dist_1df = ChiSquared::new(1.0).unwrap();

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
        // Ini adalah baseline ketika tidak ada predictor dan tidak ada intercept
        let n = n_samples as f64;
        let null_ll = n * 0.5_f64.ln(); // = n * ln(0.5) = -n * ln(2)
        
        // Buat model "kosong" dengan prediksi 0.5 untuk semua observasi
        let predictions = DVector::from_element(n_samples, 0.5);
        let residuals = y_vector - &predictions;
        let weights = DVector::from_element(n_samples, 0.25); // 0.5 * (1 - 0.5)
        
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

    // CAPTURE STEP 0
    let mut step0_detail = calculate_step_snapshot(
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
        feature_names, // Pass feature names
        config,        // Pass config for re-fitting
        block_0_iter_history,
        variable_groups,
        &included_group_indices,
    );

    // --- FIX: Override Block 0 score tests with ANALYTICAL computation ---
    // Menggunakan calculate_single_score_test() dan calculate_global_score_test_with_constant()
    // yang sama dengan metode Forward Conditional, agar hasilnya konsisten dengan SPSS.
    {
        let prob_null = if config.include_constant {
            let n_positive = y_vector.iter().filter(|&&y| y > 0.5).count() as f64;
            let n_total = y_vector.len() as f64;
            let p = n_positive / n_total;
            p.clamp(1e-15, 1.0 - 1e-15)
        } else {
            0.5
        };

        let mut analytical_vars_not_in = Vec::new();
        for group in variable_groups.iter() {
            if group.column_indices.len() > 1 {
                let cols: Vec<DVector<f64>> = group.column_indices.iter()
                    .map(|&ci| x_matrix.column(ci).into_owned()).collect();
                let x_group = DMatrix::from_columns(&cols);
                let (gs, gd, gp) = crate::stats::score_test::calculate_single_group_score_test(
                    &x_group, y_vector, prob_null, config.include_constant,
                );
                analytical_vars_not_in.push(VariableNotInEquation {
                    label: group.name.clone(), score: gs, df: gd, sig: gp,
                });
            }
            for &col_idx in &group.column_indices {
                let col_vec: DVector<f64> = x_matrix.column(col_idx).into();
                let (score_stat, _, sig_val) = calculate_single_score_test(
                    &col_vec, y_vector, prob_null, config.include_constant,
                );
                let label = if col_idx < feature_names.len() { feature_names[col_idx].clone() } else { format!("Var_{}", col_idx + 1) };
                analytical_vars_not_in.push(VariableNotInEquation { label, score: score_stat, df: 1, sig: sig_val });
            }
        }

        let (g_chi, g_df, g_sig) = calculate_global_score_test_with_constant(
            x_matrix, y_vector, prob_null, config.include_constant,
        );

        step0_detail.variables_not_in_equation = analytical_vars_not_in;
        step0_detail.remainder_test = Some(RemainderTest {
            chi_square: g_chi, df: g_df, sig: g_sig,
        });
    }

    steps_details.push(step0_detail);

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
        if step_count > n_total_vars * 2 {
            break;
        }

        let mut best_candidate_group_idx = None;
        let mut best_score_stat = 0.0;

        // A. FORWARD ENTRY (Score Test - Group-aware)
        let current_x_for_score = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);

        for (g_idx, group) in variable_groups.iter().enumerate() {
            if !included_group_indices.contains(&g_idx) {
                let (stat, _df, p_val) = if group.column_indices.len() == 1 {
                    let candidate_col = x_matrix.column(group.column_indices[0]).into_owned();
                    let (s, p) = calculate_score_test(
                        &current_model.residuals,
                        &current_model.weights,
                        &current_x_for_score,
                        &candidate_col,
                        &current_model.covariance_matrix,
                    );
                    (s, 1, p)
                } else {
                    let cols: Vec<DVector<f64>> = group.column_indices.iter()
                        .map(|&ci| x_matrix.column(ci).into_owned()).collect();
                    let candidate_matrix = DMatrix::from_columns(&cols);
                    calculate_group_score_test(
                        &current_model.residuals,
                        &current_model.weights,
                        &current_x_for_score,
                        &candidate_matrix,
                        &current_model.covariance_matrix,
                    )
                };

                if p_val < config.p_entry && stat > best_score_stat {
                    best_score_stat = stat;
                    best_candidate_group_idx = Some(g_idx);
                }
            }
        }

        let mut variable_added = false;
        let mut step_iter_history: Option<Vec<IterationRecord>> = None;

        // Jika ada kandidat masuk
        if let Some(g_idx_in) = best_candidate_group_idx {
            let group_in = &variable_groups[g_idx_in];
            let mut trial_group_indices = included_group_indices.clone();
            trial_group_indices.push(g_idx_in);

            let trial_indices: Vec<usize> = trial_group_indices.iter()
                .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

            let trial_x = build_design_matrix(x_matrix, &trial_indices, n_samples, config.include_constant);

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
                    variable: group_in.name.clone(), // Nama Asli
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

                included_group_indices = trial_group_indices.clone();
                included_indices = trial_indices.clone();
                current_model = new_model;
                variable_added = true;

                // Build iteration history block for this step
                let step_history_block: Option<IterationHistoryBlock> = if config.iteration_history {
                    step_iter_history.as_ref().map(|history| {
                        let mut var_names: Vec<String> = Vec::new();
                        // Tambahkan Constant hanya jika include_constant = true
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
                            initial_neg2ll: Some(-2.0 * prev_log_likelihood),
                            converged: current_model.converged,
                            final_iteration: current_model.iterations,
                        }
                    })
                } else {
                    None
                };

                // CAPTURE STEP N (Entered)
                let step_detail = calculate_step_snapshot(
                    step_count,
                    "Entered".to_string(),
                    Some(group_in.name.clone()),
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

        // B. BACKWARD REMOVAL (Likelihood Ratio Test)
        // Berbeda dengan Conditional/Wald, LR menghitung selisih Log Likelihood
        if variable_added && included_group_indices.len() > 1 {
            let mut worst_idx_loc = None;
            let mut max_p_val = 0.0;
            let mut lr_stat_removed = 0.0;
            let mut reduced_model_candidate: Option<FittedModel> = None;
            let mut removal_iter_history_candidate: Option<Vec<IterationRecord>> = None;

            for (loc, &g_idx) in included_group_indices.iter().enumerate() {
                // Jangan buang variabel yang baru saja masuk di step yang sama
                if Some(g_idx) != best_candidate_group_idx {
                    // Buat model sementara tanpa grup k
                    let mut trial_group_indices_remove = included_group_indices.clone();
                    trial_group_indices_remove.remove(loc);

                    let trial_indices_remove: Vec<usize> = trial_group_indices_remove.iter()
                        .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

                    let trial_x_remove =
                        build_design_matrix(x_matrix, &trial_indices_remove, n_samples, config.include_constant);

                    // Use fit_with_history if iteration_history is enabled
                    let fit_result = if config.iteration_history {
                        match fit_with_history(
                            &trial_x_remove,
                            y_vector,
                            config.max_iterations,
                            config.convergence_threshold,
                        ) {
                            Ok(result) => Ok((result.model, Some(result.iteration_history))),
                            Err(e) => Err(e),
                        }
                    } else {
                        match fit(&trial_x_remove, y_vector, config.max_iterations, config.convergence_threshold) {
                            Ok(model) => Ok((model, None)),
                            Err(e) => Err(e),
                        }
                    };

                    if let Ok((temp_model, temp_iter_history)) = fit_result {
                        // LR Statistic = 2 * (LL_full - LL_reduced)
                        // Karena LL negatif, dan LL_full > LL_reduced (lebih dekat ke 0),
                        // maka (LL_full - LL_reduced) harus positif.
                        let lr_stat = 2.0
                            * (current_model.final_log_likelihood
                                - temp_model.final_log_likelihood)
                                .abs();

                        // Hitung Sig
                        let group_df = variable_groups[g_idx].column_indices.len() as f64;
                        let p_val_remove = 1.0 - ChiSquared::new(group_df).unwrap_or(chi_dist_1df.clone()).cdf(lr_stat);

                        if p_val_remove > config.p_removal && p_val_remove > max_p_val {
                            max_p_val = p_val_remove;
                            worst_idx_loc = Some(loc);
                            lr_stat_removed = lr_stat;
                            reduced_model_candidate = Some(temp_model);
                            removal_iter_history_candidate = temp_iter_history;
                        }
                    }
                }
            }

            // Hapus variabel terburuk jika memenuhi kriteria removal
            if let Some(loc) = worst_idx_loc {
                // SPSS assigns each action (entry/removal) its own step number
                step_count += 1;

                let removed_group_idx = included_group_indices[loc];
                let removed_group_name = variable_groups[removed_group_idx].name.clone();

                // Update tracker sebelum update current
                prev_log_likelihood = current_model.final_log_likelihood;
                prev_n_vars = included_indices.len();

                included_group_indices.remove(loc);
                included_indices = included_group_indices.iter()
                    .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

                if let Some(reduced_model) = reduced_model_candidate {
                    steps_history.push(StepHistory {
                        step: step_count,
                        action: "Removed".to_string(),
                        variable: removed_group_name.clone(), // Nama Asli
                        score_statistic: 0.0,
                        improvement_chi_sq: lr_stat_removed, // Change in -2LL
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
                        removal_iter_history_candidate.as_ref().map(|history| {
                            let mut var_names: Vec<String> = Vec::new();
                            // Tambahkan Constant hanya jika include_constant = true
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
                                initial_neg2ll: Some(-2.0 * prev_log_likelihood),
                                converged: current_model.converged,
                                final_iteration: current_model.iterations,
                            }
                        })
                    } else {
                        None
                    };

                    // CAPTURE STEP N (Removed)
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

        if !variable_added {
            break;
        }
    }

    let final_step = steps_details.last().unwrap().clone();

    // Overall Omnibus (Step Terakhir)
    let omni = final_step.omni_tests.unwrap_or(OmniTests {
        chi_square: 0.0,
        df: 0,
        sig: 1.0,
    });

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

    // --- BARU: Hitung Classification Plot Data Jika Diminta ---
    let classification_plot_result = if config.classification_plots && !included_indices.is_empty() {
        let y_label_0 = "FALSE";
        let y_label_1 = "TRUE";
        
        Some(classification_plot::calculate_classification_plot(
            y_vector,
            &current_model.predictions,
            config.cutoff,
            y_label_0,
            y_label_1,
        ))
    } else {
        None
    };

    // --- BARU: Calculate Saved Predictions Jika Ada Opsi Save yang Diaktifkan ---
    let saved_predictions_result = if !included_indices.is_empty() {
        let final_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
        saved_predictions::calculate_saved_predictions(
            &final_x,
            y_vector,
            &current_model,
            config,
        )
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

    // Extract Block 0 data before steps_details is moved into the result
    let block_0_vars_not_in = steps_details.first().map(|s| s.variables_not_in_equation.clone());

    Ok(LogisticResult {
        model_info: ModelInfo {
            variables: feature_names.to_vec(),
            n_total: n_samples,
            n_missing: 0,
            n_selected: n_samples,
            y_encoding: std::collections::HashMap::new(),
            x_encodings: None,
            include_constant: config.include_constant,
        },
        summary: final_step.summary,
        classification_table: final_step.classification_table,
        variables: final_step.variables_in_equation,
        variables_not_in_equation: final_step.variables_not_in_equation,
        omni_tests: omni,
        step_history: Some(steps_history),
        steps_detail: Some(steps_details),
        block_0_constant: block_0_row,
        block_0_variables_not_in: block_0_vars_not_in,
        method_used: "Forward LR".to_string(),
        assumption_tests: None,
        overall_remainder_test: final_step.remainder_test,
        categorical_codings: codings,
        // --- MODIFIKASI: AMBIL HL DARI FINAL STEP ---
        hosmer_lemeshow: final_step.hosmer_lemeshow,
        casewise_list: casewise_result,
        classification_plot_data: classification_plot_result, // BARU: Classification Plot Data
        // --- BARU: Correlation of Estimates ---
        correlation_of_estimates: corr_estimates_final,
        // --- BARU: Step Summary ---
        step_summary: if step_summary.is_empty() { None } else { Some(step_summary) },
        // --- BARU: Saved Predictions ---
        saved_predictions: saved_predictions_result,
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
    _y_vector: &DVector<f64>, // Unused here as we rely on residuals
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
    // Tanpa Intercept, karena intercept sudah ada di model (included)
    let mut x_out_cols = Vec::new();
    for &idx in &excluded_indices {
        x_out_cols.push(full_x.column(idx).into_owned());
    }
    let x_out = DMatrix::from_columns(&x_out_cols);

    // 3. Bangun Matriks X untuk Included Variables (X_in)
    // Ini harus PERSIS sama dengan matriks yang digunakan untuk fit model (termasuk intercept jika ada)
    let x_in = build_design_matrix(full_x, included_indices, full_x.nrows(), include_constant);

    // 4. Hitung Score Vector: U = X_out^T * residuals
    // residuals = y - p
    let u = x_out.transpose() * &model.residuals;

    // 5. Hitung Matriks Informasi
    // V_out = X_out^T * W * X_out
    // V_cross = X_out^T * W * X_in

    // Optimalisasi perkalian matriks diagonal W:
    let mut x_out_weighted = x_out.clone();
    for (row_idx, &weight) in model.weights.iter().enumerate() {
        for col_idx in 0..x_out.ncols() {
            x_out_weighted[(row_idx, col_idx)] *= weight;
        }
    }

    let v_out = x_out.transpose() * &x_out_weighted; // X_out^T W X_out
    let v_cross = x_out_weighted.transpose() * &x_in; // X_out^T W X_in

    // 6. Variance Score yang Disesuaikan (Adjusted Variance)
    // Var(U) = V_out - V_cross * Inv(I_in) * V_cross^T
    // model.covariance_matrix adalah Inv(I_in) = (X_in^T W X_in)^-1
    let inv_info_in = &model.covariance_matrix;

    let correction = &v_cross * inv_info_in * v_cross.transpose();
    let adjusted_var = v_out - correction;

    // 7. Hitung Statistik Score Global: S = U^T * Var(U)^-1 * U
    // Gunakan Cholesky decomposition untuk kestabilan inversi
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

// --- HELPER UNTUK MODEL IF TERM REMOVED ---
fn calculate_model_if_term_removed(
    current_model_ll: f64,
    x_matrix: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    null_log_likelihood: f64, // <-- PASS NULL LL
    config: &LogisticConfig,
    n_samples: usize,
    variable_groups: &[VariableGroup],
    included_group_indices: &[usize],
) -> Option<Vec<ModelIfTermRemovedRow>> {
    if included_group_indices.is_empty() {
        return None;
    }

    let mut rows = Vec::new();

    for (loc, &g_idx) in included_group_indices.iter().enumerate() {
        let group = &variable_groups[g_idx];
        // 1. Buat subset index tanpa grup ini
        let mut subset_groups = included_group_indices.to_vec();
        subset_groups.remove(loc);
        
        let subset_indices: Vec<usize> = subset_groups.iter()
            .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

        let reduced_ll;

        // 2. Jika subset kosong, berarti kembali ke Null Model
        if subset_indices.is_empty() {
            // SPSS convention: when include_constant=false and no predictors remain,
            // the model has ZERO parameters. SPSS reports LL = 0.0 for this degenerate case.
            // When include_constant=true, the reduced model is the intercept-only (null) model.
            if config.include_constant {
                reduced_ll = null_log_likelihood;
            } else {
                reduced_ll = 0.0;
            }
        } else {
            // Re-fit model subset
            let x_subset = build_design_matrix(x_matrix, &subset_indices, n_samples, config.include_constant);
            if let Ok(reduced_model) = fit(
                &x_subset,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            ) {
                reduced_ll = reduced_model.final_log_likelihood;
            } else {
                continue; // Skip jika error fitting
            }
        }

        // 3. Hitung Change in -2 Log Likelihood
        let change_val = 2.0 * (current_model_ll - reduced_ll).abs();

        // Safety: Jika sangat kecil, anggap 0
        let change_val_clean = if change_val < 1e-9 { 0.0 } else { change_val };

        let group_df = group.column_indices.len() as f64;
        let sig = if change_val_clean > 0.0 {
            1.0 - ChiSquared::new(group_df).unwrap_or(ChiSquared::new(1.0).unwrap()).cdf(change_val_clean)
        } else {
            1.0
        };

        rows.push(ModelIfTermRemovedRow {
            label: group.name.clone(),
            model_log_likelihood: reduced_ll,
            change_in_neg2ll: change_val_clean,
            df: group_df as i32,
            sig_change: sig,
        });
    }

    if rows.is_empty() {
        None
    } else {
        Some(rows)
    }
}

fn calculate_step_snapshot(
    step: usize, action: String, variable_changed: Option<String>,
    model: &FittedModel, full_x: &DMatrix<f64>, y_vector: &DVector<f64>,
    included_indices: &[usize], null_ll: f64, prev_ll: f64, prev_n_vars: usize,
    feature_names: &[String], config: &LogisticConfig,
    iteration_history: Option<IterationHistoryBlock>,
    variable_groups: &[VariableGroup], included_group_indices: &[usize],
) -> StepDetail {
    let n = y_vector.len();
    let _n_total_vars = full_x.ncols();
    let chi_dist_1df = ChiSquared::new(1.0).unwrap();
    let z_score = crate::utils::probability::z_score_from_confidence(config.confidence_level);

    let diff = null_ll - model.final_log_likelihood;
    let cox_snell = 1.0 - (diff * (2.0 / n as f64)).exp();

    let summary = ModelSummary {
        log_likelihood: model.final_log_likelihood, cox_snell_r_square: cox_snell,
        nagelkerke_r_square: calculate_nagelkerke(null_ll, model.final_log_likelihood, n),
        converged: model.converged, iterations: model.iterations,
    };

    let chi_sq_model = 2.0 * (model.final_log_likelihood - null_ll).abs();
    let df_model = included_indices.len() as i32;
    let sig_model = if df_model > 0 { 1.0 - ChiSquared::new(df_model as f64).unwrap().cdf(chi_sq_model) } else { 1.0 };
    let omni_tests_model = OmniTests { chi_square: chi_sq_model, df: df_model, sig: sig_model };

    let chi_sq_step = 2.0 * (model.final_log_likelihood - prev_ll);
    let df_step = (included_indices.len() as i32 - prev_n_vars as i32).abs();
    let sig_step = if df_step > 0 && chi_sq_step.abs() > 1e-9 {
        1.0 - ChiSquared::new(df_step as f64).unwrap().cdf(chi_sq_step.abs())
    } else { 1.0 };
    let omni_tests_step = OmniTests { chi_square: chi_sq_step, df: df_step, sig: sig_step };

    let model_if_term_removed = calculate_model_if_term_removed(
        model.final_log_likelihood, full_x, y_vector, null_ll, config, n, variable_groups, &included_group_indices,
    );

    let class_table = table::calculate_classification_table(&model.predictions, y_vector, config.cutoff);

    // Variables In Equation (Group-aware)
    let mut variables_in = Vec::new();
    let beta_offset = if config.include_constant { 1 } else { 0 };

    if config.include_constant {
        let (b_int, se_int, wald_int) = if step == 0 && included_indices.is_empty() {
            let n_positive: f64 = y_vector.iter().filter(|&&y| y > 0.5).count() as f64;
            let n_total: f64 = y_vector.len() as f64;
            let p = (n_positive / n_total).clamp(1e-10, 1.0 - 1e-10);
            let beta_0 = (p / (1.0 - p)).ln();
            let se_0 = (1.0 / (n_total * p * (1.0 - p))).sqrt();
            let wald_0 = if se_0 > 1e-12 { (beta_0 / se_0).powi(2) } else { 0.0 };
            (beta_0, se_0, wald_0)
        } else {
            let b = model.beta[0]; let se = model.covariance_matrix[(0, 0)].sqrt();
            let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };
            (b, se, wald)
        };
        variables_in.push(VariableRow {
            label: "Constant".to_string(), b: b_int, error: se_int, wald: wald_int, df: 1,
            sig: 1.0 - chi_dist_1df.cdf(wald_int), exp_b: b_int.exp(),
            lower_ci: (b_int - z_score * se_int).exp(), upper_ci: (b_int + z_score * se_int).exp(),
        });
    }

    for &g_idx in included_group_indices {
        let group = &variable_groups[g_idx];
        let beta_indices: Vec<usize> = group.column_indices.iter()
            .filter_map(|&col_idx| included_indices.iter().position(|&c| c == col_idx).map(|pos| pos + beta_offset))
            .collect();
        if group.column_indices.len() > 1 && !beta_indices.is_empty() {
            let (jw, jd, js) = calculate_joint_wald_test(&model.beta, &model.covariance_matrix, &beta_indices);
            variables_in.push(VariableRow { label: group.name.clone(), b: 0.0, error: 0.0, wald: jw, df: jd, sig: js, exp_b: 0.0, lower_ci: 0.0, upper_ci: 0.0 });
        }
        for &col_idx in &group.column_indices {
            if let Some(pos) = included_indices.iter().position(|&c| c == col_idx) {
                let bi = pos + beta_offset; let b = model.beta[bi]; let se = model.covariance_matrix[(bi, bi)].sqrt();
                let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };
                let label = if col_idx < feature_names.len() { feature_names[col_idx].clone() } else { format!("Var_{}", col_idx + 1) };
                variables_in.push(VariableRow { label, b, error: se, wald, df: 1, sig: 1.0 - chi_dist_1df.cdf(wald), exp_b: b.exp(), lower_ci: (b - z_score * se).exp(), upper_ci: (b + z_score * se).exp() });
            }
        }
    }

    // Variables Not In Equation (Group-aware)
    let mut variables_not_in = Vec::new();
    let current_design_matrix = build_design_matrix(full_x, included_indices, n, config.include_constant);

    for (g_idx, group) in variable_groups.iter().enumerate() {
        if included_group_indices.contains(&g_idx) { continue; }
        if group.column_indices.len() > 1 {
            let cols: Vec<DVector<f64>> = group.column_indices.iter().map(|&ci| full_x.column(ci).into_owned()).collect();
            let cm = DMatrix::from_columns(&cols);
            let (gs, gd, gp) = calculate_group_score_test(&model.residuals, &model.weights, &current_design_matrix, &cm, &model.covariance_matrix);
            variables_not_in.push(VariableNotInEquation { label: group.name.clone(), score: gs, df: gd, sig: gp });
        }
        for &col_idx in &group.column_indices {
            if !included_indices.contains(&col_idx) {
                let candidate_col = full_x.column(col_idx).into_owned();
                let (stat, p_val) = calculate_score_test(&model.residuals, &model.weights, &current_design_matrix, &candidate_col, &model.covariance_matrix);
                let label = if col_idx < feature_names.len() { feature_names[col_idx].clone() } else { format!("Var_{}", col_idx + 1) };
                variables_not_in.push(VariableNotInEquation { label, score: stat, df: 1, sig: p_val });
            }
        }
    }

    // --- FIX: GUNAKAN HELPER UNTUK OVERALL STATISTICS ---
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
        let mut var_names_for_corr: Vec<String> = Vec::new();
        // Tambahkan Constant hanya jika include_constant = true
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
        model_if_term_removed,
        // --- MASUKKAN HASIL HOSMER-LEMESHOW ---
        hosmer_lemeshow: hl_result,
        // --- BARU: CORRELATION OF ESTIMATES ---
        correlation_of_estimates: corr_estimates_result,
        // --- BARU: ITERATION HISTORY ---
        iteration_history,
        // --- BARU: CLASSIFICATION PLOT DATA ---
        classification_plot_data: classification_plot_result,
    }
}
