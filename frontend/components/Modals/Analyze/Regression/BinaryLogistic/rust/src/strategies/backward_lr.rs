use crate::models::config::LogisticConfig;
use crate::models::result::{
    CategoricalCoding, CorrelationOfEstimatesRow, FittingWarnings as ResultFittingWarnings,
    IterationHistoryBlock, IterationHistoryRow, LogisticResult, ModelIfTermRemovedRow, ModelInfo, ModelSummary, OmniTests, RemainderTest,
    StepDetail, StepHistory, StepSummaryRow, VariableNotInEquation, VariableRow,
};
use crate::stats::irls::{fit, fit_with_history, FittedModel, FittingWarnings, IterationRecord};
use crate::stats::score_test::{calculate_score_test, calculate_group_score_test};
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
    let n_groups = variable_groups.len();
    let chi_dist_1df = ChiSquared::new(1.0).unwrap();
    let z_score = crate::utils::probability::z_score_from_confidence(config.confidence_level);

    // ========================================================================
    // BLOCK 0: NULL MODEL
    // ========================================================================
    let sum_y: f64 = y_vector.sum();
    let n_1 = sum_y;
    let n_0 = n_samples as f64 - n_1;
    let n_f64 = n_samples as f64;

    if n_1 == 0.0 || n_0 == 0.0 {
        return Err(JsValue::from_str(
            "Data Y harus memiliki minimal satu kelas 0 dan satu kelas 1.",
        ));
    }

    // Null model depends on include_constant:
    // - With constant: p_null = n1/n (MLE), LL = n1*ln(p) + n0*ln(1-p)
    // - Without constant: p_null = 0.5, LL = n*ln(0.5)
    let (p_null, null_log_likelihood, block_0_row) = if config.include_constant {
        let p = n_1 / n_f64;
        let ll = n_1 * p.ln() + n_0 * (1.0 - p).ln();
        let b0_val = (n_1 / n_0).ln();
        let b0_se = (1.0 / n_1 + 1.0 / n_0).sqrt();
        let b0_wald = (b0_val / b0_se).powi(2);
        let b0_sig = 1.0 - chi_dist_1df.cdf(b0_wald);
        let row = VariableRow {
            label: "Constant".to_string(),
            b: b0_val,
            error: b0_se,
            wald: b0_wald,
            df: 1,
            sig: b0_sig,
            exp_b: b0_val.exp(),
            lower_ci: (b0_val - z_score * b0_se).exp(),
            upper_ci: (b0_val + z_score * b0_se).exp(),
        };
        (p, ll, row)
    } else {
        let ll = n_f64 * 0.5_f64.ln();
        let row = VariableRow {
            label: "(No Constant)".to_string(),
            b: 0.0,
            error: 0.0,
            wald: 0.0,
            df: 0,
            sig: 1.0,
            exp_b: 1.0,
            lower_ci: 1.0,
            upper_ci: 1.0,
        };
        (0.5, ll, row)
    };

    // Variables Not in Equation Block 0 (Score Tests)
    let mut block_0_vars_not_in = Vec::new();

    for group in variable_groups.iter() {
        if group.column_indices.len() > 1 {
            let cols: Vec<DVector<f64>> = group.column_indices.iter()
                .map(|&ci| x_matrix.column(ci).into_owned()).collect();
            let x_group = DMatrix::from_columns(&cols);
            let (gs, gd, gp) = crate::stats::score_test::calculate_single_group_score_test(
                &x_group, y_vector, p_null, config.include_constant,
            );
            block_0_vars_not_in.push(VariableNotInEquation {
                label: group.name.clone(), score: gs, df: gd, sig: gp,
            });
        }
        for &col_idx in &group.column_indices {
            let col = x_matrix.column(col_idx).into_owned();
            let (stat, _, p_val) = crate::stats::score_test::calculate_single_score_test(
                &col, y_vector, p_null, config.include_constant,
            );
            let label = if col_idx < feature_names.len() { feature_names[col_idx].clone() } else { format!("Var_{}", col_idx) };
            block_0_vars_not_in.push(VariableNotInEquation { label, score: stat, df: 1, sig: p_val });
        }
    }

    // Overall Stats Block 0
    let (g_chi, g_df, g_sig) = crate::stats::score_test::calculate_global_score_test_with_constant(
        x_matrix,
        y_vector,
        p_null,
        config.include_constant,
    );
    block_0_vars_not_in.push(VariableNotInEquation {
        label: "Overall Statistics".to_string(),
        score: g_chi,
        df: g_df,
        sig: g_sig,
    });

    // Build dummy null model struct for step0 snapshot
    let null_residuals = y_vector.map(|y| y - p_null);
    let null_weight_scalar = p_null * (1.0 - p_null);
    let null_weights = DVector::from_element(n_samples, null_weight_scalar);
    let dummy_null_model_struct = if config.include_constant {
        let b0_val = (n_1 / n_0).ln();
        let b0_se = (1.0 / n_1 + 1.0 / n_0).sqrt();
        let null_cov_matrix = DMatrix::from_element(1, 1, b0_se.powi(2));
        FittedModel {
            beta: DVector::from_element(1, b0_val),
            covariance_matrix: null_cov_matrix,
            final_log_likelihood: null_log_likelihood,
            iterations: 0,
            converged: true,
            residuals: null_residuals.clone(),
            weights: null_weights.clone(),
            predictions: DVector::from_element(n_samples, p_null),
            warnings: FittingWarnings::default(),
        }
    } else {
        FittedModel {
            beta: DVector::zeros(0),
            covariance_matrix: DMatrix::zeros(0, 0),
            final_log_likelihood: null_log_likelihood,
            iterations: 0,
            converged: true,
            residuals: null_residuals.clone(),
            weights: null_weights.clone(),
            predictions: DVector::from_element(n_samples, 0.5),
            warnings: FittingWarnings::default(),
        }
    };

    // ========================================================================
    // BLOCK 0: STEP 0 (NULL MODEL) - untuk Iteration History
    // ========================================================================
    let null_model_for_step0: FittedModel;
    let block_0_iter_history: Option<IterationHistoryBlock>;

    if config.iteration_history && config.include_constant {
        let null_x = DMatrix::from_element(n_samples, 1, 1.0);
        let result = fit_with_history(
            &null_x,
            y_vector,
            config.max_iterations,
            config.convergence_threshold,
        ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Null Model): {}", e)))?;
        
        block_0_iter_history = Some(IterationHistoryBlock {
            block: 0,
            step: 0,
            variable_names: vec!["Constant".to_string()],
            rows: result.iteration_history.iter().map(|rec| IterationHistoryRow {
                iteration: rec.iteration,
                neg2_log_likelihood: rec.neg2_log_likelihood,
                coefficients: rec.coefficients.clone(),
            }).collect(),
            initial_neg2ll: Some(-2.0 * null_log_likelihood),
            converged: result.model.converged,
            final_iteration: result.model.iterations,
        });
        null_model_for_step0 = result.model;
    } else {
        // Use analytical/dummy model for step0
        null_model_for_step0 = dummy_null_model_struct.clone();
        block_0_iter_history = None;
    }

    // ========================================================================
    // BLOCK 1: BACKWARD LR (START WITH FULL MODEL)
    // ========================================================================

    // --- STEP 1 (Start): FULL MODEL ---
    let mut included_indices: Vec<usize> = (0..n_total_vars).collect();
    let mut included_group_indices: Vec<usize> = (0..n_groups).collect();
    let mut steps_history: Vec<StepHistory> = Vec::new();
    let mut steps_details: Vec<StepDetail> = Vec::new();

    let empty_indices: Vec<usize> = Vec::new();
    let empty_group_indices: Vec<usize> = Vec::new();
    let step0_detail = calculate_step_snapshot(
        0, "Start".to_string(), None, &null_model_for_step0, x_matrix, y_vector,
        &empty_indices, null_log_likelihood, 0.0, feature_names, config, n_samples, block_0_iter_history,
        variable_groups, &empty_group_indices,
    );
    steps_details.push(step0_detail);

    let full_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
    let (mut current_model, full_iter_history) = if config.iteration_history {
        let result = fit_with_history(&full_x, y_vector, config.max_iterations, config.convergence_threshold,
        ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Full Model): {}", e)))?;
        (result.model, Some(result.iteration_history))
    } else {
        let result = fit(&full_x, y_vector, config.max_iterations, config.convergence_threshold,
        ).map_err(|e| JsValue::from_str(&format!("IRLS Error (Full Model): {}", e)))?;
        (result, None)
    };

    let mut prev_model_chi_sq = 2.0 * (current_model.final_log_likelihood - null_log_likelihood);

    let step1_iter_history: Option<IterationHistoryBlock> = if config.iteration_history {
        full_iter_history.as_ref().map(|history| {
            let mut var_names: Vec<String> = Vec::new();
            if config.include_constant { var_names.push("Constant".to_string()); }
            for &idx in &included_indices {
                let label = if idx < feature_names.len() { feature_names[idx].clone() } else { format!("Var_{}", idx + 1) };
                var_names.push(label);
            }
            IterationHistoryBlock {
                block: 1, step: 1, variable_names: var_names,
                rows: history.iter().map(|rec| IterationHistoryRow {
                    iteration: rec.iteration, neg2_log_likelihood: rec.neg2_log_likelihood, coefficients: rec.coefficients.clone(),
                }).collect(),
                initial_neg2ll: Some(-2.0 * current_model.final_log_likelihood),
                converged: current_model.converged, final_iteration: current_model.iterations,
            }
        })
    } else { None };

    let step1_detail = calculate_step_snapshot(
        1, "Entered".to_string(), Some("All Variables".to_string()),
        &current_model, x_matrix, y_vector, &included_indices,
        null_log_likelihood, 0.0, feature_names, config, n_samples, step1_iter_history,
        variable_groups, &included_group_indices,
    );
    steps_details.push(step1_detail);

    let mut step_count = 1;

    // --- LOOP ELIMINASI (Likelihood Ratio - Group-aware) ---
    loop {
        step_count += 1;
        let mut worst_group_loc: Option<usize> = None;
        let mut max_p_val = -1.0;
        let mut _worst_change_val = 0.0;

        // Evaluate each included group by LR test (refit without group)
        if !included_group_indices.is_empty() {
            for (loc, &g_idx) in included_group_indices.iter().enumerate() {
                let group = &variable_groups[g_idx];
                let mut temp_group_indices = included_group_indices.clone();
                temp_group_indices.remove(loc);
                let temp_col_indices: Vec<usize> = temp_group_indices.iter()
                    .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

                let reduced_ll;
                if temp_col_indices.is_empty() {
                    reduced_ll = null_log_likelihood;
                } else {
                    let reduced_x = build_design_matrix(x_matrix, &temp_col_indices, n_samples, config.include_constant);
                    if let Ok(temp_model) = fit(&reduced_x, y_vector, config.max_iterations, config.convergence_threshold) {
                        reduced_ll = temp_model.final_log_likelihood;
                    } else { continue; }
                }

                let group_df = group.column_indices.len() as f64;
                let change_abs = 2.0 * (current_model.final_log_likelihood - reduced_ll).abs();
                let p_val_remove = if change_abs < 1e-9 { 1.0 } else {
                    1.0 - ChiSquared::new(group_df).unwrap_or(chi_dist_1df.clone()).cdf(change_abs)
                };

                if p_val_remove > max_p_val {
                    max_p_val = p_val_remove;
                    worst_group_loc = Some(loc);
                    _worst_change_val = change_abs;
                }
            }
        }

        let mut variable_removed = false;
        if let Some(loc) = worst_group_loc {
            if max_p_val > config.p_removal {
                let removed_group_idx = included_group_indices[loc];
                let removed_group_name = variable_groups[removed_group_idx].name.clone();

                included_group_indices.remove(loc);
                included_indices = included_group_indices.iter()
                    .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

                let reduced_x = build_design_matrix(x_matrix, &included_indices, n_samples, config.include_constant);
                let mut step_iter_history: Option<Vec<IterationRecord>> = None;
                let fit_result = if config.iteration_history {
                    match fit_with_history(&reduced_x, y_vector, config.max_iterations, config.convergence_threshold) {
                        Ok(result) => { step_iter_history = Some(result.iteration_history); Ok(result.model) }
                        Err(e) => Err(e),
                    }
                } else {
                    fit(&reduced_x, y_vector, config.max_iterations, config.convergence_threshold)
                };

                if let Ok(new_model) = fit_result {
                    current_model = new_model;
                    let current_model_chi_sq = 2.0 * (current_model.final_log_likelihood - null_log_likelihood);
                    let step_chi_sq_val = current_model_chi_sq - prev_model_chi_sq;
                    prev_model_chi_sq = current_model_chi_sq;

                    let (_cox, nagel) = calculate_r_squares(null_log_likelihood, current_model.final_log_likelihood, n_samples);
                    steps_history.push(StepHistory {
                        step: step_count, action: "Removed".to_string(), variable: removed_group_name.clone(),
                        score_statistic: 0.0, improvement_chi_sq: step_chi_sq_val,
                        model_log_likelihood: current_model.final_log_likelihood, nagelkerke_r2: nagel,
                    });

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
                                    iteration: rec.iteration, neg2_log_likelihood: rec.neg2_log_likelihood, coefficients: rec.coefficients.clone(),
                                }).collect(),
                                initial_neg2ll: Some(-2.0 * current_model.final_log_likelihood),
                                converged: current_model.converged, final_iteration: current_model.iterations,
                            }
                        })
                    } else { None };

                    let step_detail = calculate_step_snapshot(
                        step_count, "Removed".to_string(), Some(removed_group_name),
                        &current_model, x_matrix, y_vector, &included_indices,
                        null_log_likelihood, step_chi_sq_val, feature_names, config, n_samples, step_history_block,
                        variable_groups, &included_group_indices,
                    );
                    steps_details.push(step_detail);
                    variable_removed = true;
                }
            }
        }

        if !variable_removed || included_group_indices.is_empty() {
            break;
        }
    }

    let final_step = steps_details.last().unwrap().clone();

    // Final Omni
    let chi_sq_model = 2.0 * (current_model.final_log_likelihood - null_log_likelihood).abs();
    let df_model = included_indices.len() as i32;
    let omni_sig = if df_model > 0 {
        1.0 - ChiSquared::new(df_model as f64).unwrap().cdf(chi_sq_model)
    } else {
        1.0
    };
    let omni = OmniTests {
        chi_square: chi_sq_model,
        df: df_model,
        sig: omni_sig,
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
        .filter(|s| s.step > 0) // Skip Step 0 untuk backward juga
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
                "Start" => "All Variables Entered".to_string(),
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
        block_0_constant: block_0_row,
        block_0_variables_not_in: Some(block_0_vars_not_in),
        omni_tests: omni,
        step_history: Some(steps_history),
        steps_detail: Some(steps_details),
        method_used: "Backward LR".to_string(), // Label Method
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

fn calculate_r_squares(null_ll: f64, model_ll: f64, n: usize) -> (f64, f64) {
    let ratio_exponent = (2.0 / n as f64) * (null_ll - model_ll);
    let cox_snell = 1.0 - ratio_exponent.exp();
    let max_r2 = 1.0 - ((2.0 / n as f64) * null_ll).exp();
    let nagelkerke = if max_r2 > 1e-12 {
        cox_snell / max_r2
    } else {
        0.0
    };
    (cox_snell, nagelkerke)
}

fn calculate_step_snapshot(
    step: usize, action: String, variable_changed: Option<String>,
    model: &FittedModel, full_x: &DMatrix<f64>, y_vector: &DVector<f64>,
    included_indices: &[usize], null_ll: f64, step_chi_sq_val: f64,
    feature_names: &[String], config: &LogisticConfig, n_samples: usize,
    iteration_history: Option<IterationHistoryBlock>,
    variable_groups: &[VariableGroup], included_group_indices: &[usize],
) -> StepDetail {
    let _n_total_vars = full_x.ncols();
    let chi_dist_1df = ChiSquared::new(1.0).unwrap();
    let z_score = crate::utils::probability::z_score_from_confidence(config.confidence_level);

    let (cox, nagel) = calculate_r_squares(null_ll, model.final_log_likelihood, n_samples);
    let summary = ModelSummary {
        log_likelihood: model.final_log_likelihood,
        cox_snell_r_square: cox,
        nagelkerke_r_square: nagel,
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

    let sig_step = if step_chi_sq_val.abs() > 1e-9 {
        1.0 - chi_dist_1df.cdf(step_chi_sq_val.abs())
    } else {
        if step == 1 {
            0.0
        } else {
            1.0
        }
    };

    let final_step_chi = if step == 1 {
        chi_sq_model
    } else {
        step_chi_sq_val
    };
    let final_step_df = if step == 1 { df_model } else { 1 };
    let final_step_sig = if step == 1 { sig_model } else { sig_step };

    let omni_tests_step = OmniTests {
        chi_square: final_step_chi,
        df: final_step_df,
        sig: final_step_sig,
    };

    let model_if_term_removed = calculate_model_if_term_removed(
        model.final_log_likelihood,
        full_x,
        y_vector,
        null_ll,
        config,
        n_samples,
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
                let label = if col_idx < feature_names.len() { feature_names[col_idx].clone() } else { format!("Var_{}", col_idx) };
                variables_in.push(VariableRow { label, b, error: se, wald, df: 1, sig: 1.0 - chi_dist_1df.cdf(wald), exp_b: b.exp(), lower_ci: (b - z_score * se).exp(), upper_ci: (b + z_score * se).exp() });
            }
        }
    }

    // Variables Not In Equation (Group-aware)
    let mut variables_not_in = Vec::new();
    let current_design_matrix = build_design_matrix(full_x, included_indices, n_samples, config.include_constant);

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
                let label = if col_idx < feature_names.len() { feature_names[col_idx].clone() } else { format!("Var_{}", col_idx) };
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
        model_if_term_removed,
        remainder_test,
        omni_tests: Some(omni_tests_model),
        step_omni_tests: Some(omni_tests_step),
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

fn calculate_model_if_term_removed(
    current_model_ll: f64,
    x_matrix: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    null_log_likelihood: f64,
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
        // 1. Build subset without this group
        let mut subset_groups = included_group_indices.to_vec();
        subset_groups.remove(loc);

        let subset_indices: Vec<usize> = subset_groups.iter()
            .flat_map(|&gi| variable_groups[gi].column_indices.iter().copied()).collect();

        let reduced_ll;

        // 2. If subset is empty, fall back to null model
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
            // Re-fit model without this group
            let x_subset = build_design_matrix(x_matrix, &subset_indices, n_samples, config.include_constant);
            if let Ok(reduced_model) = fit(
                &x_subset,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            ) {
                reduced_ll = reduced_model.final_log_likelihood;
            } else {
                continue; // Skip if fitting error
            }
        }

        // 3. Compute Change in -2 Log Likelihood
        let change_val = 2.0 * (current_model_ll - reduced_ll).abs();

        // Safety: if very small, treat as 0
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

fn calculate_overall_remainder_stats(
    full_x: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    included_indices: &[usize],
    model: &FittedModel,
    include_constant: bool,
) -> Option<RemainderTest> {
    let n_total_vars = full_x.ncols();
    let excluded_indices: Vec<usize> = (0..n_total_vars)
        .filter(|i| !included_indices.contains(i))
        .collect();

    if excluded_indices.is_empty() {
        return None;
    }

    let mut x_out_cols = Vec::new();
    for &idx in &excluded_indices {
        x_out_cols.push(full_x.column(idx).into_owned());
    }
    let x_out = DMatrix::from_columns(&x_out_cols);

    let raw_residuals = y_vector - &model.predictions;
    let u = x_out.transpose() * &raw_residuals;

    let x_in = if included_indices.is_empty() && include_constant {
        DMatrix::from_element(full_x.nrows(), 1, 1.0)
    } else {
        build_design_matrix(full_x, included_indices, full_x.nrows(), include_constant)
    };

    let mut x_out_weighted = x_out.clone();
    for (row_idx, &weight) in model.weights.iter().enumerate() {
        for col_idx in 0..x_out.ncols() {
            x_out_weighted[(row_idx, col_idx)] *= weight;
        }
    }

    let v_out = x_out.transpose() * &x_out_weighted;
    let v_cross = x_out_weighted.transpose() * &x_in;
    let inv_info_in = &model.covariance_matrix;
    
    // Handle case when x_in has no columns (no constant and no included variables)
    let adjusted_var = if x_in.ncols() > 0 && inv_info_in.ncols() > 0 {
        let correction = &v_cross * inv_info_in * v_cross.transpose();
        v_out - correction
    } else {
        // No correction needed when there are no included variables
        v_out
    };

    let score_stat = match adjusted_var.cholesky() {
        Some(chol) => {
            let sol = chol.solve(&u);
            u.dot(&sol)
        }
        None => 0.0,
    };

    let df = excluded_indices.len() as i32;
    let sig = if score_stat > 1e-9 && df > 0 {
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
