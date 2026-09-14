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
use crate::stats::table;
use crate::stats::hosmer_lemeshow;
use crate::stats::casewise;
use crate::stats::correlation_of_estimates;
use crate::stats::classification_plot;
use crate::stats::saved_predictions;

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

    let mut included_indices: Vec<usize> = Vec::new();
    let mut included_group_indices: Vec<usize> = Vec::new();
    let mut steps_history: Vec<StepHistory> = Vec::new();
    let mut steps_details: Vec<StepDetail> = Vec::new();

    // --- STEP 0: NULL MODEL ---
    let (mut current_model, null_iter_history, null_log_likelihood) = if config.include_constant {
        // Standard: Fit intercept-only model
        let null_x = DMatrix::from_element(n_samples, 1, 1.0);
        
        // Use fit_with_history if iteration_history is enabled
        let (model, history) = if config.iteration_history {
            let result = fit_with_history(
                &null_x,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Null Model): {}", e)))?;
            (result.model, Some(result.iteration_history))
        } else {
            let result = fit(
                &null_x,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Null Model): {}", e)))?;
            (result, None)
        };
        
        let null_ll = model.final_log_likelihood;
        (model, history, null_ll)
    } else {
        // No constant: Use baseline model with predictions = 0.5
        // LL = sum(y*log(0.5) + (1-y)*log(0.5)) = n*log(0.5)
        let n = n_samples as f64;
        let baseline_ll = n * 0.5_f64.ln();  // -n * ln(2)
        
        // Create dummy model for null baseline
        let dummy_model = FittedModel {
            beta: DVector::from_element(0, 0.0),
            covariance_matrix: DMatrix::from_element(0, 0, 0.0),
            predictions: DVector::from_element(n_samples, 0.5),
            residuals: y_vector - DVector::from_element(n_samples, 0.5),
            weights: DVector::from_element(n_samples, 0.25),  // p*(1-p) = 0.25
            final_log_likelihood: baseline_ll,
            iterations: 0,
            converged: true,
            warnings: FittingWarnings::default(),
        };
        (dummy_model, None, baseline_ll)
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
        prev_log_likelihood,
        prev_n_vars,
        feature_names,
        config,
        block_0_iter_history,
        variable_groups, &included_group_indices,
    );

    // --- FIX: Override Block 0 score tests with ANALYTICAL computation ---
    // Menggunakan calculate_single_score_test() dan calculate_global_score_test_with_constant()
    // yang sama dengan metode Enter, agar hasilnya konsisten dengan SPSS.
    //
    // KUNCI: Menggunakan prob_null ANALITIK (n1/N) bukan dari IRLS predictions.
    // Untuk global score test, formula mengasumsikan U_0 = sum(y_i - p) = 0 (score
    // intercept di MLE = 0). Ini hanya tepat jika p = n1/N PERSIS.
    // Jika p dari IRLS sedikit berbeda (akibat convergence tolerance 0.001),
    // maka U_0 ≠ 0 dan error-nya teramplifikasi melalui matrix inversion di joint test.
    // Ref: Hosmer & Lemeshow (2000), Section 2.4 — Score test evaluated at MLE under H0.
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

    // Ambil data Block 0 Constant dari snapshot yang baru dibuat (dengan pengecekan)
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

    // --- STEPWISE LOOP (Group-aware) ---
    loop {
        step_count += 1;
        let n_groups = variable_groups.len();
        if step_count > n_groups * 2 + 10 {
            break; // Safety break
        }

        let mut best_candidate_group_idx: Option<usize> = None;
        let mut best_score_stat = 0.0;
        let mut _best_score_df = 1_i32;

        // A. FORWARD ENTRY (Score Test - Group-aware)
        let design_matrix = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);

        for (g_idx, group) in variable_groups.iter().enumerate() {
            if included_group_indices.contains(&g_idx) {
                continue;
            }

            let (stat, df, p_val) = if group.column_indices.len() == 1 {
                let candidate_col = x_matrix.column(group.column_indices[0]).into_owned();
                let (s, p) = calculate_score_test(
                    &current_model.residuals, &current_model.weights,
                    &design_matrix, &candidate_col, &current_model.covariance_matrix,
                );
                (s, 1, p)
            } else {
                let cols: Vec<DVector<f64>> = group.column_indices.iter()
                    .map(|&ci| x_matrix.column(ci).into_owned()).collect();
                let candidate_matrix = DMatrix::from_columns(&cols);
                calculate_group_score_test(
                    &current_model.residuals, &current_model.weights,
                    &design_matrix, &candidate_matrix, &current_model.covariance_matrix,
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

        // Enter best group
        if let Some(g_idx) = best_candidate_group_idx {
            let group = &variable_groups[g_idx];
            let mut trial_group_indices = included_group_indices.clone();
            trial_group_indices.push(g_idx);
            let trial_col_indices: Vec<usize> = trial_group_indices.iter()
                .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();
            let trial_x = build_design_matrix(x_matrix, &trial_col_indices, n_samples, config.include_constant);

            let fit_result = if config.iteration_history {
                match fit_with_history(&trial_x, y_vector, config.max_iterations, config.convergence_threshold) {
                    Ok(result) => { step_iter_history = Some(result.iteration_history); Ok(result.model) }
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
                    improvement_chi_sq: 2.0 * (new_model.final_log_likelihood - current_model.final_log_likelihood).abs(),
                    model_log_likelihood: new_model.final_log_likelihood,
                    nagelkerke_r2: calculate_nagelkerke(null_log_likelihood, new_model.final_log_likelihood, n_samples),
                });

                prev_log_likelihood = current_model.final_log_likelihood;
                prev_n_vars = included_indices.len();

                included_group_indices = trial_group_indices;
                included_indices = trial_col_indices;
                current_model = new_model;
                variable_added = true;

                let step_history_block: Option<IterationHistoryBlock> = if config.iteration_history {
                    step_iter_history.as_ref().map(|history| {
                        let mut var_names: Vec<String> = Vec::new();
                        if config.include_constant { var_names.push("Constant".to_string()); }
                        for &idx in &included_indices {
                            let label = if idx < feature_names.len() { feature_names[idx].clone() } else { format!("Var_{}", idx + 1) };
                            var_names.push(label);
                        }
                        IterationHistoryBlock {
                            block: 1, step: step_count, variable_names: var_names,
                            rows: history.iter().map(|rec| IterationHistoryRow {
                                iteration: rec.iteration, neg2_log_likelihood: rec.neg2_log_likelihood,
                                coefficients: rec.coefficients.clone(),
                            }).collect(),
                            initial_neg2ll: Some(-2.0 * prev_log_likelihood),
                            converged: current_model.converged, final_iteration: current_model.iterations,
                        }
                    })
                } else { None };

                let step_detail = calculate_step_snapshot(
                    step_count, "Entered".to_string(), Some(group.name.clone()),
                    &current_model, x_matrix, y_vector, &included_indices,
                    null_log_likelihood, prev_log_likelihood, prev_n_vars,
                    feature_names, config, step_history_block,
                    variable_groups, &included_group_indices,
                );
                steps_details.push(step_detail);
            }
        }

        // B. BACKWARD REMOVAL (Conditional Parameter Estimate - Group-aware)
        if variable_added && included_group_indices.len() > 1 {
            let mut worst_group_loc: Option<usize> = None;
            let mut max_p_val = 0.0;

            let full_x_design = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
            let beta_offset = if config.include_constant { 1 } else { 0 };

            for (loc, &g_idx) in included_group_indices.iter().enumerate() {
                // Skip the just-entered group
                if best_candidate_group_idx == Some(g_idx) { continue; }

                let group = &variable_groups[g_idx];
                let beta_indices: Vec<usize> = group.column_indices.iter()
                    .filter_map(|&col_idx| included_indices.iter().position(|&c| c == col_idx).map(|pos| pos + beta_offset))
                    .collect();

                // Compute conditional LL for this group
                let mut beta_cond = current_model.beta.clone();
                for &bi in &beta_indices {
                    let cov_jj = current_model.covariance_matrix[(bi, bi)];
                    let beta_j = current_model.beta[bi];
                    if cov_jj.abs() > 1e-15 {
                        for k in 0..beta_cond.len() {
                            if !beta_indices.contains(&k) {
                                let cov_kj = current_model.covariance_matrix[(k, bi)];
                                beta_cond[k] -= (cov_kj / cov_jj) * beta_j;
                            }
                        }
                    }
                    beta_cond[bi] = 0.0;
                }

                let linear_pred = &full_x_design * &beta_cond;
                let mut conditional_ll = 0.0;
                for i in 0..y_vector.len() {
                    let eta = linear_pred[i];
                    let p = if eta > 0.0 { 1.0 / (1.0 + (-eta).exp()) } else { let e = eta.exp(); e / (1.0 + e) };
                    let p_clamped = p.clamp(1e-15, 1.0 - 1e-15);
                    conditional_ll += y_vector[i] * p_clamped.ln() + (1.0 - y_vector[i]) * (1.0 - p_clamped).ln();
                }

                let group_df = group.column_indices.len() as f64;
                let change_raw = 2.0 * (current_model.final_log_likelihood - conditional_ll);
                let change_abs = if change_raw < 1e-9 { 0.0 } else { change_raw };
                let p_val_remove = if change_abs < 1e-9 { 1.0 } else {
                    1.0 - ChiSquared::new(group_df).unwrap_or(ChiSquared::new(1.0).unwrap()).cdf(change_abs)
                };

                if p_val_remove > config.p_removal && p_val_remove > max_p_val {
                    max_p_val = p_val_remove;
                    worst_group_loc = Some(loc);
                }
            }

            if let Some(loc) = worst_group_loc {
                step_count += 1;

                let removed_group_idx = included_group_indices[loc];
                let removed_group_name = variable_groups[removed_group_idx].name.clone();

                prev_log_likelihood = current_model.final_log_likelihood;
                prev_n_vars = included_indices.len();

                included_group_indices.remove(loc);
                included_indices = included_group_indices.iter()
                    .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

                let reduced_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
                let mut removal_iter_history: Option<Vec<IterationRecord>> = None;
                let fit_result = if config.iteration_history {
                    match fit_with_history(&reduced_x, y_vector, config.max_iterations, config.convergence_threshold) {
                        Ok(result) => { removal_iter_history = Some(result.iteration_history); Ok(result.model) }
                        Err(e) => Err(e),
                    }
                } else {
                    fit(&reduced_x, y_vector, config.max_iterations, config.convergence_threshold)
                };

                if let Ok(reduced_model) = fit_result {
                    steps_history.push(StepHistory {
                        step: step_count, action: "Removed".to_string(),
                        variable: removed_group_name.clone(), score_statistic: 0.0,
                        improvement_chi_sq: 2.0 * (current_model.final_log_likelihood - reduced_model.final_log_likelihood).abs(),
                        model_log_likelihood: reduced_model.final_log_likelihood,
                        nagelkerke_r2: calculate_nagelkerke(null_log_likelihood, reduced_model.final_log_likelihood, n_samples),
                    });

                    current_model = reduced_model;

                    let removal_history_block: Option<IterationHistoryBlock> = if config.iteration_history {
                        removal_iter_history.as_ref().map(|history| {
                            let mut var_names: Vec<String> = Vec::new();
                            if config.include_constant { var_names.push("Constant".to_string()); }
                            for &idx in &included_indices {
                                let label = if idx < feature_names.len() { feature_names[idx].clone() } else { format!("Var_{}", idx + 1) };
                                var_names.push(label);
                            }
                            IterationHistoryBlock {
                                block: 1, step: step_count, variable_names: var_names,
                                rows: history.iter().map(|rec| IterationHistoryRow {
                                    iteration: rec.iteration, neg2_log_likelihood: rec.neg2_log_likelihood,
                                    coefficients: rec.coefficients.clone(),
                                }).collect(),
                                initial_neg2ll: Some(-2.0 * prev_log_likelihood),
                                converged: current_model.converged, final_iteration: current_model.iterations,
                            }
                        })
                    } else { None };

                    let step_detail = calculate_step_snapshot(
                        step_count, "Removed".to_string(), Some(removed_group_name),
                        &current_model, x_matrix, y_vector, &included_indices,
                        null_log_likelihood, prev_log_likelihood, prev_n_vars,
                        feature_names, config, removal_history_block,
                        variable_groups, &included_group_indices,
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
        method_used: "Forward Conditional".to_string(),
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

fn build_design_matrix(original_x: &DMatrix<f64>, indices: &[usize], rows: usize, include_constant: bool) -> DMatrix<f64> {
    let mut columns = Vec::new();
    if include_constant {
        columns.push(DVector::from_element(rows, 1.0));
    }
    for &idx in indices {
        columns.push(original_x.column(idx).into_owned());
    }
    if columns.is_empty() {
        DMatrix::zeros(rows, 0)
    } else {
        DMatrix::from_columns(&columns)
    }
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
    y_vector: &DVector<f64>, // Digunakan untuk hitung manual residuals
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
    let x_in = build_design_matrix(full_x, included_indices, full_x.nrows(), include_constant);

    // 4. Hitung Score Vector: U = X_out^T * (y - p)
    // PERBAIKAN: Hitung manual raw residuals (y - p)
    let raw_residuals = y_vector - &model.predictions;
    let u = x_out.transpose() * &raw_residuals;

    // 5. Hitung Matriks Informasi
    // Gunakan model.weights yang merupakan p(1-p)
    let mut x_out_weighted = x_out.clone();
    for (row_idx, &weight) in model.weights.iter().enumerate() {
        for col_idx in 0..x_out.ncols() {
            x_out_weighted[(row_idx, col_idx)] *= weight;
        }
    }

    let v_out = x_out.transpose() * &x_out_weighted; // X_out^T W X_out
    let v_cross = x_out_weighted.transpose() * &x_in; // X_out^T W X_in

    // 6. Variance Score yang Disesuaikan (Adjusted Variance)
    // inv_info_in = (X_in^T W X_in)^-1 (Covariance Matrix dari model)
    let inv_info_in = &model.covariance_matrix;

    // Handle case when x_in has no columns (no constant and no included variables)
    let adjusted_var = if x_in.ncols() > 0 && inv_info_in.ncols() > 0 {
        let correction = &v_cross * inv_info_in * v_cross.transpose();
        v_out - correction
    } else {
        // No correction needed when there are no included variables
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

// --- HELPER UNTUK MODEL IF TERM REMOVED (Conditional Parameter Estimates - Group-aware) ---
// SPSS "Conditional" method: adjusts remaining betas using covariance matrix
// when setting β_j = 0. Footnote: "Based on conditional parameter estimates"
// Groups categorical dummy variables together (e.g., ChestPain with df=3)
fn calculate_model_if_term_removed(
    model: &FittedModel,
    x_matrix: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    included_indices: &[usize],
    config: &LogisticConfig,
    n_samples: usize,
    variable_groups: &[VariableGroup],
    included_group_indices: &[usize],
) -> Option<Vec<ModelIfTermRemovedRow>> {
    if included_group_indices.is_empty() {
        return None;
    }

    // Build the full design matrix for conditional LL computation
    let full_design = build_design_matrix(x_matrix, included_indices, n_samples, config.include_constant);
    let beta_offset = if config.include_constant { 1 } else { 0 };

    let mut rows = Vec::new();

    for &g_idx in included_group_indices {
        let group = &variable_groups[g_idx];

        // Find beta indices for all columns in this group
        let beta_indices: Vec<usize> = group.column_indices.iter()
            .filter_map(|&col_idx| included_indices.iter().position(|&c| c == col_idx).map(|pos| pos + beta_offset))
            .collect();

        if beta_indices.is_empty() {
            continue;
        }

        // Compute conditional LL using multivariate conditional parameter estimates.
        // For a group with multiple betas (e.g., categorical with k-1 dummies):
        //   β_r_cond = β̂_r - Σ_rg × Σ_gg⁻¹ × β̂_g
        //   β_g_cond = 0
        // This is the correct multivariate generalization. For single-beta groups (df=1),
        // this reduces to: β_k_cond = β_k - (Cov_kj / Cov_jj) × β_j
        let n_group = beta_indices.len();
        let remaining_indices: Vec<usize> = (0..model.beta.len())
            .filter(|i| !beta_indices.contains(i))
            .collect();

        // Extract Σ_gg (covariance sub-matrix for group betas)
        let mut sigma_gg = DMatrix::zeros(n_group, n_group);
        for (i, &bi) in beta_indices.iter().enumerate() {
            for (j, &bj) in beta_indices.iter().enumerate() {
                sigma_gg[(i, j)] = model.covariance_matrix[(bi, bj)];
            }
        }

        // Extract β_g (group beta sub-vector)
        let mut beta_g = DVector::zeros(n_group);
        for (i, &bi) in beta_indices.iter().enumerate() {
            beta_g[i] = model.beta[bi];
        }

        // Compute Σ_gg⁻¹ × β_g
        let sigma_gg_inv_beta_g = match sigma_gg.try_inverse() {
            Some(inv) => inv * &beta_g,
            None => { continue; } // Skip if singular
        };

        // Adjust remaining betas: β_r_cond = β̂_r - Σ_rg × (Σ_gg⁻¹ × β̂_g)
        let mut beta_cond = model.beta.clone();
        for &ri in &remaining_indices {
            let mut adjustment = 0.0;
            for (j, &bj) in beta_indices.iter().enumerate() {
                adjustment += model.covariance_matrix[(ri, bj)] * sigma_gg_inv_beta_g[j];
            }
            beta_cond[ri] -= adjustment;
        }

        // Zero out group betas
        for &bi in &beta_indices {
            beta_cond[bi] = 0.0;
        }

        // Compute log-likelihood with conditional parameters
        let linear_pred = &full_design * &beta_cond;
        let mut conditional_ll = 0.0;
        for i in 0..y_vector.len() {
            let eta = linear_pred[i];
            let p = if eta > 0.0 { 1.0 / (1.0 + (-eta).exp()) } else { let e = eta.exp(); e / (1.0 + e) };
            let p_clamped = p.clamp(1e-15, 1.0 - 1e-15);
            conditional_ll += y_vector[i] * p_clamped.ln() + (1.0 - y_vector[i]) * (1.0 - p_clamped).ln();
        }

        let group_df = group.column_indices.len() as f64;
        let change_raw = 2.0 * (model.final_log_likelihood - conditional_ll);
        let change_val = if change_raw < 1e-9 { 0.0 } else { change_raw };

        let sig = if change_val > 0.0 {
            1.0 - ChiSquared::new(group_df).unwrap_or(ChiSquared::new(1.0).unwrap()).cdf(change_val)
        } else {
            1.0
        };

        rows.push(ModelIfTermRemovedRow {
            label: group.name.clone(),
            model_log_likelihood: conditional_ll,
            change_in_neg2ll: change_val,
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
        log_likelihood: model.final_log_likelihood,
        cox_snell_r_square: cox_snell,
        nagelkerke_r_square: calculate_nagelkerke(null_ll, model.final_log_likelihood, n),
        converged: model.converged,
        iterations: model.iterations,
    };

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

    // SPSS convention: positive when variable entered, negative when removed
    let chi_sq_step = 2.0 * (model.final_log_likelihood - prev_ll);
    let df_step = (included_indices.len() as i32 - prev_n_vars as i32).abs();
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

    let model_if_term_removed = calculate_model_if_term_removed(
        model,
        full_x,
        y_vector,
        included_indices,
        config,
        n,
        variable_groups,
        included_group_indices,
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
