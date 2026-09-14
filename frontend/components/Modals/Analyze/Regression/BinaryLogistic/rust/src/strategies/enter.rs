use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};
use std::error::Error;

use crate::models::config::LogisticConfig;
use crate::models::result::{
    CategoricalCoding, CorrelationOfEstimatesRow, FittingWarnings, IterationHistoryBlock,
    IterationHistoryRow, LogisticResult, ModelInfo, ModelSummary, OmniTests, RemainderTest,
    StepDetail, VariableNotInEquation, VariableRow,
};
use crate::stats::irls::FittingWarnings as IrlsFittingWarnings;
use crate::stats::{
    casewise, classification_plot, correlation_of_estimates, hosmer_lemeshow, irls,
    saved_predictions, score_test, table,
};
use crate::stats::design_matrix::VariableGroup;
use crate::stats::wald::calculate_joint_wald_test;

pub fn run(
    x_raw: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    config: &LogisticConfig,
    feature_names: &[String],
    codings: Option<Vec<CategoricalCoding>>,
    variable_groups: &[VariableGroup],
) -> Result<LogisticResult, Box<dyn Error>> {
    let n_samples = x_raw.nrows();
    let n_features = x_raw.ncols();
    let n_f64 = n_samples as f64;

    let mut steps_details: Vec<StepDetail> = Vec::new();

    // ==========================================
    // BLOCK 0: NULL MODEL - STEP 0
    // ==========================================

    // 1. Hitung Log Likelihood Analitik untuk Baseline Zero (P=0.5)
    //    Digunakan saat include_constant = false.
    let ll_05_analytic = n_f64 * 0.5_f64.ln(); // -N * ln(2)

    // Tentukan Model Null (Baseline) berdasarkan konfigurasi Constant
    let (null_model, null_iteration_history, null_ll_actual) = if config.include_constant {
        // --- Kasus 1: Ada Konstanta (Standard) ---
        // Fit intercept-only model secara numerik
        let x_null = DMatrix::from_element(n_samples, 1, 1.0);

        if config.iteration_history {
            let result = irls::fit_with_history(
                &x_null,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            )?;
            let ll = result.model.final_log_likelihood;
            (result.model, Some(result.iteration_history), ll)
        } else {
            let result = irls::fit(
                &x_null,
                y_vector,
                config.max_iterations,
                config.convergence_threshold,
            )?;
            let ll = result.final_log_likelihood;
            (result, None, ll)
        }
    } else {
        // --- Kasus 2: Tidak Ada Konstanta ---
        // Null Model adalah model "Empty" dimana probabilitas setiap case = 0.5
        // Ini adalah standar SPSS untuk "Regression through the origin" (Null model has no terms).
        let predictions = DVector::from_element(n_samples, 0.5);
        let residuals = y_vector - &predictions;
        let weights = DVector::from_element(n_samples, 0.25);

        let dummy_model = irls::FittedModel {
            beta: DVector::zeros(0),
            covariance_matrix: DMatrix::zeros(0, 0),
            final_log_likelihood: ll_05_analytic,
            iterations: 0,
            converged: true,
            residuals,
            weights,
            predictions,
            warnings: IrlsFittingWarnings::default(),
        };

        (dummy_model, None, ll_05_analytic)
    };

    // Calculate z-score
    let z_score_block0 =
        crate::utils::probability::z_score_from_confidence(config.confidence_level);

    // --- 1. Constant Statistics (Null Model) ---
    // SPSS menggunakan formula ANALITIK untuk Wald statistic di Block 0
    // Ini memberikan hasil yang lebih presisi daripada menggunakan covariance matrix dari IRLS
    let block_0_constant = if config.include_constant {
        // Hitung proporsi kasus positif
        let n_positive: f64 = y_vector.iter().filter(|&&y| y > 0.5).count() as f64;
        let n_total: f64 = y_vector.len() as f64;
        let p = n_positive / n_total;
        
        // Clamp p untuk menghindari edge cases (complete separation)
        let p_safe = p.clamp(1e-10, 1.0 - 1e-10);
        
        // Beta0 (Constant) = ln(p / (1-p)) = logit(p)
        let beta_0 = (p_safe / (1.0 - p_safe)).ln();
        
        // SPSS Formula untuk Variance dari Constant di Null Model:
        // Var(β₀) = 1 / (n × p × (1-p))
        // Ini adalah inverse dari Fisher Information untuk intercept-only model
        let variance_beta0 = 1.0 / (n_total * p_safe * (1.0 - p_safe));
        let se_const0 = variance_beta0.sqrt();
        
        // Wald statistic: Wald = β₀² / Var(β₀) = (β₀ / SE)²
        let wald_const0 = if se_const0 > 1e-12 {
            (beta_0 / se_const0).powi(2)
        } else {
            0.0
        };
        
        // P-value dari Chi-Square distribution dengan df=1
        let sig_const0 = if wald_const0 > 0.0 {
            1.0 - ChiSquared::new(1.0)
                .unwrap_or_else(|_| ChiSquared::new(1.0).unwrap())
                .cdf(wald_const0)
        } else {
            1.0
        };

        VariableRow {
            label: "Constant".to_string(),
            b: beta_0,
            error: se_const0,
            wald: wald_const0,
            df: 1,
            sig: sig_const0,
            exp_b: beta_0.exp(),
            lower_ci: (beta_0 - z_score_block0 * se_const0).exp(),
            upper_ci: (beta_0 + z_score_block0 * se_const0).exp(),
        }
    } else {
        VariableRow {
            label: "".to_string(),
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

    // --- 2. Classification Table (Null Model) ---
    let class_table_null =
        table::calculate_classification_table(&null_model.predictions, y_vector, config.cutoff);

    // --- 3. SCORE TEST (Group-aware) ---
    let mut vars_not_in_eq_null = Vec::new();
    let prob_null = if !null_model.predictions.is_empty() {
        null_model.predictions[0]
    } else {
        0.5
    };

    for group in variable_groups.iter() {
        // For multi-column groups (categorical): emit group omnibus row first
        if group.column_indices.len() > 1 {
            let cols: Vec<DVector<f64>> = group.column_indices.iter()
                .map(|&ci| x_raw.column(ci).into_owned())
                .collect();
            let x_group = DMatrix::from_columns(&cols);
            let (group_stat, group_df, group_sig) = score_test::calculate_single_group_score_test(
                &x_group,
                y_vector,
                prob_null,
                config.include_constant,
            );
            vars_not_in_eq_null.push(VariableNotInEquation {
                label: group.name.clone(),
                score: group_stat,
                df: group_df,
                sig: group_sig,
            });
        }

        // Emit individual rows for each column in the group
        for &col_idx in &group.column_indices {
            let col = x_raw.column(col_idx);
            let col_vec: DVector<f64> = col.into();

            let (score_stat, _, sig_val) = score_test::calculate_single_score_test(
                &col_vec,
                y_vector,
                prob_null,
                config.include_constant,
            );

            let label = if col_idx < feature_names.len() {
                feature_names[col_idx].clone()
            } else {
                format!("Var_{}", col_idx + 1)
            };

            vars_not_in_eq_null.push(VariableNotInEquation {
                label,
                score: score_stat,
                df: 1,
                sig: sig_val,
            });
        }
    }

    let (g_chi, g_df, g_sig) = score_test::calculate_global_score_test_with_constant(
        x_raw,
        y_vector,
        prob_null,
        config.include_constant,
    );

    let block_0_iter_history: Option<IterationHistoryBlock> =
        if config.iteration_history && config.include_constant {
            null_iteration_history
                .as_ref()
                .map(|history| IterationHistoryBlock {
                    block: 0,
                    step: 0,
                    variable_names: vec!["Constant".to_string()],
                    rows: history
                        .iter()
                        .map(|rec| IterationHistoryRow {
                            iteration: rec.iteration,
                            neg2_log_likelihood: rec.neg2_log_likelihood,
                            coefficients: rec.coefficients.clone(),
                        })
                        .collect(),
                    initial_neg2ll: Some(-2.0 * null_ll_actual),
                    converged: null_model.converged,
                    final_iteration: null_model.iterations,
                })
        } else {
            None
        };

    let block_0_vars_in_equation =
        if config.include_constant && block_0_constant.label == "Constant" {
            vec![block_0_constant.clone()]
        } else {
            Vec::new()
        };

    steps_details.push(StepDetail {
        step: 0,
        action: "Start".to_string(),
        variable_changed: None,
        summary: ModelSummary {
            log_likelihood: null_ll_actual,
            cox_snell_r_square: 0.0,
            nagelkerke_r_square: 0.0,
            converged: null_model.converged,
            iterations: null_model.iterations,
        },
        classification_table: class_table_null,
        variables_in_equation: block_0_vars_in_equation,
        variables_not_in_equation: vars_not_in_eq_null.clone(),
        remainder_test: Some(RemainderTest {
            chi_square: g_chi,
            df: g_df,
            sig: g_sig,
        }),
        omni_tests: None,
        step_omni_tests: None,
        model_if_term_removed: None,
        hosmer_lemeshow: None,
        correlation_of_estimates: None,
        iteration_history: block_0_iter_history,
        classification_plot_data: None,
    });

    // ==========================================
    // BLOCK 1: FULL MODEL (Enter Method) - STEP 1
    // ==========================================
    let mut x_full = x_raw.clone();
    if config.include_constant {
        x_full = x_full.insert_column(0, 1.0);
    }

    let (full_model, full_iteration_history) = if config.iteration_history {
        let result = irls::fit_with_history(
            &x_full,
            y_vector,
            config.max_iterations,
            config.convergence_threshold,
        )?;
        (result.model, Some(result.iteration_history))
    } else {
        let result = irls::fit(
            &x_full,
            y_vector,
            config.max_iterations,
            config.convergence_threshold,
        )?;
        (result, None)
    };

    let full_log_likelihood = full_model.final_log_likelihood;

    // --- Hitung Omnibus Tests ---
    // Gunakan baseline yang SAMA dengan Block 0.
    // Jika No-Constant, baseline = 0.5 (Zero Model).
    // Jika Constant, baseline = Mean (Intercept Model).
    let baseline_ll_omnibus = null_ll_actual;

    let chi_sq_val = 2.0 * (full_log_likelihood - baseline_ll_omnibus);
    let chi_sq_model = if chi_sq_val < 0.0 { 0.0 } else { chi_sq_val };

    let df_model = n_features as i32;

    let sig_omni = if df_model > 0 {
        1.0 - ChiSquared::new(df_model as f64)?.cdf(chi_sq_model)
    } else {
        1.0
    };

    let omni_tests = OmniTests {
        chi_square: chi_sq_model,
        df: df_model,
        sig: sig_omni,
    };

    // --- Hitung Pseudo R-Squares ---
    // Menggunakan baseline yang sama agar konsisten dengan Omnibus dan Model Summary
    let likelihood_diff_r2 = baseline_ll_omnibus - full_log_likelihood;

    let cox_snell = 1.0 - (likelihood_diff_r2 * (2.0 / n_f64)).exp();
    let max_cox_snell = 1.0 - (baseline_ll_omnibus * (2.0 / n_f64)).exp();

    let nagelkerke = if max_cox_snell > 1e-12 {
        cox_snell / max_cox_snell
    } else {
        0.0
    };

    let model_summary = ModelSummary {
        log_likelihood: full_log_likelihood,
        cox_snell_r_square: cox_snell,
        nagelkerke_r_square: nagelkerke,
        converged: full_model.converged,
        iterations: full_model.iterations,
    };

    let classification_table =
        table::calculate_classification_table(&full_model.predictions, y_vector, config.cutoff);

    // Variables in Equation (Group-aware)
    let mut variables_rows = Vec::new();
    let z_score = crate::utils::probability::z_score_from_confidence(config.confidence_level);
    let chi_dist_1df = ChiSquared::new(1.0)?;
    let beta_offset = if config.include_constant { 1 } else { 0 };

    // Add Constant first (Statify convention)
    if config.include_constant {
        let b = full_model.beta[0];
        let cov_val = full_model.covariance_matrix[(0, 0)];
        let se = if cov_val > 0.0 { cov_val.sqrt() } else { 0.0 };
        let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };
        let sig = if wald > 0.0 { 1.0 - chi_dist_1df.cdf(wald) } else { 1.0 };

        variables_rows.push(VariableRow {
            label: "Constant".to_string(),
            b,
            error: se,
            wald,
            df: 1,
            sig,
            exp_b: b.exp(),
            lower_ci: (b - z_score * se).exp(),
            upper_ci: (b + z_score * se).exp(),
        });
    }

    // Emit group rows for each variable group
    for group in variable_groups.iter() {
        // Find beta indices for this group's columns
        // In Enter method, all columns are included, so col_idx maps directly to beta_offset + col_idx
        let beta_indices: Vec<usize> = group.column_indices.iter()
            .map(|&col_idx| col_idx + beta_offset)
            .collect();

        // For multi-column groups (categorical): emit group omnibus row first
        if group.column_indices.len() > 1 {
            let (joint_wald, joint_df, joint_sig) = calculate_joint_wald_test(
                &full_model.beta,
                &full_model.covariance_matrix,
                &beta_indices,
            );
            variables_rows.push(VariableRow {
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
        for &col_idx in &group.column_indices {
            let beta_idx = col_idx + beta_offset;
            let b = full_model.beta[beta_idx];
            let cov_val = full_model.covariance_matrix[(beta_idx, beta_idx)];
            let se = if cov_val > 0.0 { cov_val.sqrt() } else { 0.0 };
            let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };
            let sig = if wald > 0.0 { 1.0 - chi_dist_1df.cdf(wald) } else { 1.0 };

            let label = if col_idx < feature_names.len() {
                feature_names[col_idx].clone()
            } else {
                format!("Var_{}", col_idx + 1)
            };

            variables_rows.push(VariableRow {
                label,
                b,
                error: se,
                wald,
                df: 1,
                sig,
                exp_b: b.exp(),
                lower_ci: (b - z_score * se).exp(),
                upper_ci: (b + z_score * se).exp(),
            });
        }
    }

    let hl_result = if config.hosmer_lemeshow {
        match hosmer_lemeshow::calculate(y_vector, &full_model.predictions, 10) {
            Ok(res) => Some(res),
            Err(_) => None,
        }
    } else {
        None
    };

    let casewise_result = if config.casewise_listing {
        let y_label_0 = "0";
        let y_label_1 = "1";
        Some(casewise::calculate_casewise_list(
            &x_full,
            y_vector,
            &full_model,
            config,
            y_label_0,
            y_label_1,
        ))
    } else {
        None
    };

    let classification_plot_result = if config.classification_plots {
        let y_label_0 = "FALSE";
        let y_label_1 = "TRUE";
        Some(classification_plot::calculate_classification_plot(
            y_vector,
            &full_model.predictions,
            config.cutoff,
            y_label_0,
            y_label_1,
        ))
    } else {
        None
    };

    let corr_estimates_result: Option<Vec<CorrelationOfEstimatesRow>> = if config.correlations {
        let mut var_names_for_corr: Vec<String> = Vec::new();
        if config.include_constant {
            var_names_for_corr.push("Constant".to_string());
        }
        var_names_for_corr.extend(feature_names.iter().cloned());

        Some(
            correlation_of_estimates::calculate_correlation_of_estimates(
                &full_model.covariance_matrix,
                &var_names_for_corr,
            ),
        )
    } else {
        None
    };

    let block_1_iter_history: Option<IterationHistoryBlock> = if config.iteration_history {
        let mut var_names: Vec<String> = Vec::new();
        if config.include_constant {
            var_names.push("Constant".to_string());
        }
        var_names.extend(feature_names.iter().cloned());

        let block_1_initial_neg2ll = -2.0 * baseline_ll_omnibus;

        full_iteration_history
            .as_ref()
            .map(|history| IterationHistoryBlock {
                block: 1,
                step: 1,
                variable_names: var_names,
                rows: history
                    .iter()
                    .map(|rec| IterationHistoryRow {
                        iteration: rec.iteration,
                        neg2_log_likelihood: rec.neg2_log_likelihood,
                        coefficients: rec.coefficients.clone(),
                    })
                    .collect(),
                initial_neg2ll: Some(block_1_initial_neg2ll),
                converged: full_model.converged,
                final_iteration: full_model.iterations,
            })
    } else {
        None
    };

    let saved_predictions_result =
        saved_predictions::calculate_saved_predictions(&x_full, y_vector, &full_model, config);

    steps_details.push(StepDetail {
        step: 1,
        action: "Entered".to_string(),
        variable_changed: Some("All Variables".to_string()),
        summary: model_summary.clone(),
        classification_table: classification_table.clone(),
        variables_in_equation: variables_rows.clone(),
        variables_not_in_equation: Vec::new(),
        remainder_test: None,
        omni_tests: Some(omni_tests.clone()),
        step_omni_tests: Some(omni_tests.clone()),
        model_if_term_removed: None,
        hosmer_lemeshow: hl_result.clone(),
        correlation_of_estimates: corr_estimates_result.clone(),
        iteration_history: block_1_iter_history,
        classification_plot_data: classification_plot_result.clone(),
    });

    let overall_test = RemainderTest {
        chi_square: g_chi,
        df: g_df,
        sig: g_sig,
    };

    let fitting_warnings_result: Option<FittingWarnings> = {
        let w = &full_model.warnings;
        if w.possible_separation
            || w.quasi_separation
            || w.step_halving_used
            || w.ridge_increased
            || w.near_singular_hessian
            || !w.messages.is_empty()
        {
            Some(FittingWarnings {
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
    };

    let model_info = ModelInfo {
        variables: feature_names.to_vec(),
        n_total: n_samples,
        n_missing: 0,
        n_selected: n_samples,
        y_encoding: std::collections::HashMap::new(),
        x_encodings: None,
        include_constant: config.include_constant,
    };

    Ok(LogisticResult {
        model_info,
        summary: model_summary,
        classification_table,
        variables: variables_rows,
        variables_not_in_equation: vars_not_in_eq_null,
        block_0_constant,
        block_0_variables_not_in: None,
        omni_tests,
        step_history: None,
        steps_detail: Some(steps_details),
        method_used: "Enter".to_string(),
        assumption_tests: None,
        overall_remainder_test: Some(overall_test),
        categorical_codings: codings,
        hosmer_lemeshow: hl_result,
        casewise_list: casewise_result,
        classification_plot_data: classification_plot_result,
        correlation_of_estimates: corr_estimates_result,
        step_summary: None,
        saved_predictions: saved_predictions_result,
        fitting_warnings: fitting_warnings_result,
    })
}
