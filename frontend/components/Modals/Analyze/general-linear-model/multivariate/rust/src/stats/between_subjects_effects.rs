use std::collections::HashMap;

use crate::models::{
    config::{ MultivariateConfig, SumOfSquaresMethod },
    data::AnalysisData,
    result::{ TestEffectEntry, TestsBetweenSubjectsEffects },
};

use super::core::{
    build_design_matrix_and_response,
    calculate_f_significance,
    calculate_mean,
    calculate_observed_power,
    generate_interaction_terms,
    get_factor_levels,
    parse_interaction_term,
    to_dmatrix,
    to_dvector,
};

/// Calculate tests of between-subjects effects (ANOVA)
pub fn calculate_tests_between_subjects_effects(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<TestsBetweenSubjectsEffects, String> {
    let mut effects = HashMap::new();
    let mut r_squared = HashMap::new();
    let mut adjusted_r_squared = HashMap::new();
    // Observed power at the configured significance level (SPSS /CRITERIA=ALPHA).
    let alpha = config.options.sig_level.unwrap_or(0.05);

    // Get dependent variables
    let dependent_vars = data.dependent_data_defs
        .iter()
        .flat_map(|defs| defs.iter().map(|def| def.name.clone()))
        .collect::<Vec<String>>();

    // Prepare design matrix (X) and dependent variable vectors (Y)
    for (dv_idx, dep_var) in dependent_vars.iter().enumerate() {
        let mut effect_results: HashMap<String, TestEffectEntry> = HashMap::new();

        // For One-Sample Hotelling T² with Test Values (μ₀): the Intercept
        // effect's Sum of Squares must reflect deviation from μ₀ₖ, not from
        // 0. Mirrors the parameter_estimates.rs shift and the SPSS workaround
        // of computing `d_var = var − μ₀` before running GLM. Defaults to 0
        // (current behavior) when test_values is None.
        let mu0_k: f64 = config.main.test_values
            .as_ref()
            .and_then(|tv| tv.get(dv_idx).copied())
            .unwrap_or(0.0);

        // Build design matrix and response vector
        let (x_matrix, y_vector) = build_design_matrix_and_response(data, config, dep_var)?;
        // Same columns in deviation (sum-to-zero) coding, for the Type III
        // tests (Intercept, factors, interactions). The dummy-coded design
        // stays in use for the fit and elsewhere (Parameter Estimates).
        let x_deviation = deviation_coded_design(&x_matrix, data, config);

        // Calculate total sum of squares
        let mean_y = calculate_mean(&y_vector);
        let ss_total = y_vector
            .iter()
            .map(|y| (y - mean_y).powi(2))
            .sum::<f64>();

        // Fit the model
        let x_mat = to_dmatrix(&x_matrix);
        let y_vec = to_dvector(&y_vector);

        let x_transpose_x = &x_mat.transpose() * &x_mat;
        let x_transpose_y = &x_mat.transpose() * &y_vec;

        // Get parameter estimates (beta coefficients)
        let beta = match x_transpose_x.try_inverse() {
            Some(inv) => inv * x_transpose_y,
            None => {
                return Err(
                    "Could not invert X'X matrix - possibly due to multicollinearity".to_string()
                );
            }
        };

        // Calculate fitted values and residuals
        let y_hat = &x_mat * &beta;
        let residuals = &y_vec - &y_hat;

        // Calculate error sum of squares (SSE)
        let ss_error = residuals
            .iter()
            .map(|r| r.powi(2))
            .sum::<f64>();

        // Calculate model (regression) sum of squares
        let ss_model = ss_total - ss_error;

        // Calculate degrees of freedom
        let n = y_vector.len();
        let p = x_matrix[0].len(); // Number of parameters (including intercept)
        let df_model = p - 1;
        let df_error = n - p;
        let df_total = n - 1;

        // Calculate mean squares
        let ms_model = ss_model / (df_model as f64);
        let ms_error = ss_error / (df_error as f64);

        // Calculate F-statistic
        let f_value = ms_model / ms_error;
        let significance = calculate_f_significance(df_model, df_error, f_value);

        // Calculate effect size (partial eta squared)
        let partial_eta_squared = ss_model / (ss_model + ss_error);

        // Calculate noncentrality parameter and observed power
        let noncent_parameter = ss_model / ms_error;
        let observed_power = calculate_observed_power(df_model, df_error, f_value, alpha);

        // Add "Corrected Model" effect
        effect_results.insert("Corrected Model".to_string(), TestEffectEntry {
            sum_of_squares: ss_model,
            df: df_model,
            mean_square: ms_model,
            f_value,
            significance,
            partial_eta_squared,
            noncent_parameter,
            observed_power,
        });

        // Add "Intercept" effect if included
        if config.model.intercept {
            // Type III SS for Intercept: SSE without the intercept column −
            // SSE of the full model, both in deviation coding (tests the
            // unweighted mean of the cell means; n·(ȳ − μ₀)² without factors).
            // With Test Values the response is y − μ₀ₖ, as the SPSS workaround
            // of running GLM on `d_var = var − μ₀`; the other effects do not
            // depend on the shift because the intercept is in both models.
            let y_shifted: Vec<f64> = y_vector.iter().map(|y| y - mu0_k).collect();
            // Type I and II (v5): R(μ) = n·ȳ² (weighted grand mean), as the
            // first term of the sequential decomposition; Type II adjusts the
            // intercept for no other effect, since every effect contains it
            // (menunggu SPSS: mv6 Type II). Type III/IV unchanged.
            let intercept_ss = match config.model.sum_of_square_method {
                SumOfSquaresMethod::TypeI | SumOfSquaresMethod::TypeII => {
                    let n_obs = y_shifted.len() as f64;
                    let mean = y_shifted.iter().sum::<f64>() / n_obs;
                    n_obs * mean * mean
                }
                _ =>
                    sse_without_columns(&x_deviation, &y_shifted, &[0])? -
                        sse_without_columns(&x_deviation, &y_shifted, &[])?,
            };
            let intercept_df = 1;
            let intercept_ms = intercept_ss;
            let intercept_f = intercept_ms / ms_error;
            let intercept_sig = calculate_f_significance(intercept_df, df_error, intercept_f);
            let intercept_eta = intercept_ss / (intercept_ss + ss_error);
            let intercept_noncent = intercept_ss / ms_error;
            let intercept_power = calculate_observed_power(
                intercept_df,
                df_error,
                intercept_f,
                alpha
            );

            effect_results.insert("Intercept".to_string(), TestEffectEntry {
                sum_of_squares: intercept_ss,
                df: intercept_df,
                mean_square: intercept_ms,
                f_value: intercept_f,
                significance: intercept_sig,
                partial_eta_squared: intercept_eta,
                noncent_parameter: intercept_noncent,
                observed_power: intercept_power,
            });
        }

        // Add "Error" effect
        effect_results.insert("Error".to_string(), TestEffectEntry {
            sum_of_squares: ss_error,
            df: df_error,
            mean_square: ms_error,
            f_value: 0.0, // Not applicable for Error
            significance: 0.0, // Not applicable for Error
            partial_eta_squared: 0.0, // Not applicable for Error
            noncent_parameter: 0.0, // Not applicable for Error
            observed_power: 0.0, // Not applicable for Error
        });

        // Add "Corrected Total" effect
        effect_results.insert("Corrected Total".to_string(), TestEffectEntry {
            sum_of_squares: ss_total,
            df: df_total,
            mean_square: 0.0, // Not applicable for Total
            f_value: 0.0, // Not applicable for Total
            significance: 0.0, // Not applicable for Total
            partial_eta_squared: 0.0, // Not applicable for Total
            noncent_parameter: 0.0, // Not applicable for Total
            observed_power: 0.0, // Not applicable for Total
        });

        // Add "Total" (uncorrected) as SPSS: Σ(y − μ₀)² with df = n. With Test
        // Values the SPSS workaround runs GLM on d = y − μ₀, so μ₀ₖ is
        // subtracted (0 otherwise).
        let ss_uncorrected_total = y_vector
            .iter()
            .map(|y| (y - mu0_k).powi(2))
            .sum::<f64>();
        effect_results.insert("Total".to_string(), TestEffectEntry {
            sum_of_squares: ss_uncorrected_total,
            df: n,
            mean_square: 0.0, // Not applicable for Total
            f_value: 0.0, // Not applicable for Total
            significance: 0.0, // Not applicable for Total
            partial_eta_squared: 0.0, // Not applicable for Total
            noncent_parameter: 0.0, // Not applicable for Total
            observed_power: 0.0, // Not applicable for Total
        });

        // If there are factors, calculate Type I, II, III, or IV SS for each
        if let Some(factors) = &config.main.fix_factor {
            for factor in factors {
                let factor_cols = get_factor_columns(&x_matrix, factor, data, config)?;
                // Each encoded column contributes one numerator df.
                let factor_df = factor_cols.len();

                if factor_df > 0 {
                    let factor_ss = effect_ss(
                        &x_matrix,
                        &x_deviation,
                        &y_vector,
                        factor,
                        &factor_cols,
                        data,
                        config
                    )?;

                    let factor_ms = factor_ss / (factor_df as f64);
                    let factor_f = factor_ms / ms_error;
                    let factor_sig = calculate_f_significance(factor_df, df_error, factor_f);
                    let factor_eta = factor_ss / (factor_ss + ss_error);
                    let factor_noncent = factor_ss / ms_error;
                    let factor_power = calculate_observed_power(
                        factor_df,
                        df_error,
                        factor_f,
                        alpha
                    );

                    effect_results.insert(factor.clone(), TestEffectEntry {
                        sum_of_squares: factor_ss,
                        df: factor_df,
                        mean_square: factor_ms,
                        f_value: factor_f,
                        significance: factor_sig,
                        partial_eta_squared: factor_eta,
                        noncent_parameter: factor_noncent,
                        observed_power: factor_power,
                    });
                }
            }

            // Calculate interaction effects if there are multiple factors
            // (none in the main-effects model).
            if factors.len() > 1 && config.model.non_cust {
                let interaction_terms = generate_interaction_terms(factors);

                for term in &interaction_terms {
                    // Determine columns for this interaction
                    let interaction_cols = get_interaction_columns(&x_matrix, term, data, config)?;
                    let interaction_df = interaction_cols.len();

                    if interaction_df > 0 {
                        let interaction_ss = effect_ss(
                            &x_matrix,
                            &x_deviation,
                            &y_vector,
                            term,
                            &interaction_cols,
                            data,
                            config
                        )?;

                        let interaction_ms = interaction_ss / (interaction_df as f64);
                        let interaction_f = interaction_ms / ms_error;
                        let interaction_sig = calculate_f_significance(
                            interaction_df,
                            df_error,
                            interaction_f
                        );
                        let interaction_eta = interaction_ss / (interaction_ss + ss_error);
                        let interaction_noncent = interaction_ss / ms_error;
                        let interaction_power = calculate_observed_power(
                            interaction_df,
                            df_error,
                            interaction_f,
                            alpha
                        );

                        effect_results.insert(term.clone(), TestEffectEntry {
                            sum_of_squares: interaction_ss,
                            df: interaction_df,
                            mean_square: interaction_ms,
                            f_value: interaction_f,
                            significance: interaction_sig,
                            partial_eta_squared: interaction_eta,
                            noncent_parameter: interaction_noncent,
                            observed_power: interaction_power,
                        });
                    }
                }
            }
        }

        // Calculate R-squared and adjusted R-squared
        let r2 = 1.0 - ss_error / ss_total;
        let adj_r2 = 1.0 - ss_error / (df_error as f64) / (ss_total / (df_total as f64));

        // Store results for this dependent variable
        effects.insert(dep_var.clone(), effect_results);
        r_squared.insert(dep_var.clone(), r2);
        adjusted_r_squared.insert(dep_var.clone(), adj_r2);
    }

    Ok(TestsBetweenSubjectsEffects {
        effects,
        r_squared,
        adjusted_r_squared,
    })
}

/// Helper functions for different types of Sum of Squares
pub fn calculate_type_i_ss(
    x_matrix: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    factor_cols: &Vec<usize>,
    _data: &AnalysisData,
    _config: &MultivariateConfig
) -> Result<f64, String> {
    // True Type I SS — sequential / hierarchical decomposition:
    //   SS(effect | preceding effects) = SSR(model with cols [0..min_col])
    //                                  − SSR(model with cols [0..=max_col])
    //
    // build_design_matrix places columns in canonical SPSS order:
    //   [intercept] [factor_1 dummies] [factor_2 dummies] … [interactions]
    // so the column index naturally encodes the "order of entry" and the
    // sequential Type I formula reduces to: fit two models that differ by
    // the contiguous block of columns belonging to this effect.
    //
    // The previous implementation removed `factor_cols` while keeping
    // every other column (including later interactions). That is the
    // Type III "drop this factor from the full model" formula, which
    // gives different values from Type I whenever the dummy-coded design
    // is non-orthogonal — e.g. dummy-coded main effects vs. their
    // cross-product interaction in a balanced Two-Way design.
    if factor_cols.is_empty() {
        return Ok(0.0);
    }
    let min_col = *factor_cols.iter().min().unwrap();
    let max_col = *factor_cols.iter().max().unwrap();

    // Reduced model: every column with index < min_col.
    let reduced_x: Vec<Vec<f64>> = x_matrix
        .iter()
        .map(|row| row[..min_col].to_vec())
        .collect();
    // Extended model: every column with index ≤ max_col.
    let extended_x: Vec<Vec<f64>> = x_matrix
        .iter()
        .map(|row| row[..=max_col].to_vec())
        .collect();

    // When the reduced model has no columns (very first effect entering
    // before the intercept), fall back to SST.
    let reduced_ssr = if reduced_x.first().map_or(0, |r| r.len()) == 0 {
        let mean_y = y_vector.iter().sum::<f64>() / (y_vector.len() as f64);
        y_vector.iter().map(|y| (y - mean_y).powi(2)).sum::<f64>()
    } else {
        fit_model_and_get_ss(&reduced_x, y_vector)?
    };
    let extended_ssr = fit_model_and_get_ss(&extended_x, y_vector)?;

    Ok(reduced_ssr - extended_ssr)
}

pub fn calculate_type_ii_ss(
    x_matrix: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    factor: &str,
    factor_cols: &Vec<usize>,
    _data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<f64, String> {
    // Type II SS: the effect adjusted for every effect that does not contain
    // it (SPSS / car Type II):
    //   SSE(model without the effect and without the effects containing it)
    //   − SSE(model without the effects containing it).
    // Both models keep every lower-order term of what they contain, so the
    // result does not depend on dummy vs deviation coding. (The previous body
    // dropped only the effect's own columns from the full model — the Type
    // III formula, and with dummy coding a simple effect at the reference
    // level whenever an interaction containing the effect is in the model.)
    let containing = containing_effect_columns(x_matrix, factor, _data, config);
    let mut without_effect = containing.clone();
    without_effect.extend(factor_cols.iter().copied());
    Ok(
        sse_without_columns(x_matrix, y_vector, &without_effect)? -
            sse_without_columns(x_matrix, y_vector, &containing)?
    )
}

pub fn calculate_type_iii_ss(
    x_matrix: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    _effect: &str,
    effect_cols: &Vec<usize>,
    _data: &AnalysisData,
    _config: &MultivariateConfig
) -> Result<f64, String> {
    // Type III SS: SSE without the effect's columns − SSE of the full model.
    // This is the Type III test only when `x_matrix` is deviation (sum-to-
    // zero) coded, as calculate_tests_between_subjects_effects passes it
    // (deviation_coded_design); with dummy coding it would test the effect at
    // the reference level of the factors it interacts with.

    // Full model
    let full_model_ss = fit_model_and_get_ss(&x_matrix, &y_vector)?;

    // Create reduced model without the effect columns
    let mut reduced_x = Vec::new();
    for row in x_matrix {
        let mut new_row = Vec::new();
        for (j, val) in row.iter().enumerate() {
            if !effect_cols.contains(&j) {
                new_row.push(*val);
            }
        }
        reduced_x.push(new_row);
    }

    let reduced_model_ss = fit_model_and_get_ss(&reduced_x, &y_vector)?;

    // Type III SS is the difference between full and reduced model SS
    Ok(reduced_model_ss - full_model_ss)
}

pub fn calculate_type_iv_ss(
    x_matrix: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    effect: &str,
    effect_cols: &Vec<usize>,
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<f64, String> {
    // Type IV SS calculation - similar to Type III but adjusted for empty cells
    // This is a simplification - actual Type IV calculation requires more complex logic

    // For this simplified implementation, we'll use the Type III calculation
    calculate_type_iii_ss(x_matrix, y_vector, effect, effect_cols, data, config)
}

/// SS of a factor or interaction term with the configured SS type: Type I and
/// II on the dummy-coded design, Type III and IV on its deviation-coded copy.
fn effect_ss(
    x_matrix: &Vec<Vec<f64>>,
    x_deviation: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    effect: &str,
    effect_cols: &Vec<usize>,
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<f64, String> {
    match config.model.sum_of_square_method {
        SumOfSquaresMethod::TypeI =>
            calculate_type_i_ss(x_matrix, y_vector, effect_cols, data, config),
        SumOfSquaresMethod::TypeII =>
            calculate_type_ii_ss(x_matrix, y_vector, effect, effect_cols, data, config),
        SumOfSquaresMethod::TypeIII =>
            calculate_type_iii_ss(x_deviation, y_vector, effect, effect_cols, data, config),
        SumOfSquaresMethod::TypeIV =>
            calculate_type_iv_ss(x_deviation, y_vector, effect, effect_cols, data, config),
    }
}

/// Helper function to fit model and get error sum of squares
pub fn fit_model_and_get_ss(x_matrix: &Vec<Vec<f64>>, y_vector: &Vec<f64>) -> Result<f64, String> {
    let x_mat = to_dmatrix(x_matrix);
    let y_vec = to_dvector(y_vector);

    let x_transpose_x = &x_mat.transpose() * &x_mat;
    let x_transpose_y = &x_mat.transpose() * &y_vec;

    // Get parameter estimates (beta coefficients)
    let beta = match x_transpose_x.try_inverse() {
        Some(inv) => inv * x_transpose_y,
        None => {
            return Err(
                "Could not invert X'X matrix - possibly due to multicollinearity".to_string()
            );
        }
    };

    // Calculate fitted values and residuals
    let y_hat = &x_mat * &beta;
    let residuals = &y_vec - &y_hat;

    // Calculate error sum of squares (SSE)
    let ss_error = residuals
        .iter()
        .map(|r| r.powi(2))
        .sum::<f64>();

    Ok(ss_error)
}

/// Helper function to get columns corresponding to a factor
pub fn get_factor_columns(
    x_matrix: &Vec<Vec<f64>>,
    factor: &str,
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<Vec<usize>, String> {
    let mut factor_cols = Vec::new();

    // Start column index after intercept if present
    let mut col_start = if config.model.intercept { 1 } else { 0 };

    if let Some(factors) = &config.main.fix_factor {
        for f in factors {
            if let Ok(levels) = get_factor_levels(data, f) {
                let num_dummies = levels.len() - 1; // One less dummy than levels

                if f == factor {
                    // These are the columns for our target factor
                    for i in 0..num_dummies {
                        factor_cols.push(col_start + i);
                    }
                }

                col_start += num_dummies;
            }
        }
    }

    // If no columns found, this could mean it's an interaction term
    if factor_cols.is_empty() && factor.contains('*') {
        factor_cols = get_interaction_columns(x_matrix, factor, data, config)?;
    }

    Ok(factor_cols)
}

/// Helper function to get columns corresponding to an interaction term
pub fn get_interaction_columns(
    x_matrix: &Vec<Vec<f64>>,
    interaction_term: &str,
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<Vec<usize>, String> {
    let mut interaction_cols = Vec::new();

    if x_matrix.is_empty() || x_matrix[0].is_empty() {
        return Ok(interaction_cols);
    }

    // Start after all main effects
    let mut col_start = 0;

    // Skip intercept if present
    if config.model.intercept {
        col_start += 1;
    }

    // Skip main effect columns
    if let Some(factors) = &config.main.fix_factor {
        for f in factors {
            if let Ok(levels) = get_factor_levels(data, f) {
                col_start += levels.len() - 1;
            }
        }
    }

    // Skip covariates
    if let Some(covariates) = &config.main.covar {
        col_start += covariates.len();
    }

    // Interaction columns are appended in the same order as generate_interaction_terms.
    // Each interaction term occupies (a-1)·(b-1)·... columns (Cartesian product
    // of factor dummies), NOT a single column. The previous code only returned
    // one column index per term, collapsing the interaction df to 1.
    if let Some(factors) = &config.main.fix_factor {
        if factors.len() > 1 {
            let interaction_terms = generate_interaction_terms(factors);
            let mut offset = 0usize;
            for term in &interaction_terms {
                let term_factors = parse_interaction_term(term);
                let mut term_width = 1usize;
                for f in &term_factors {
                    if let Ok(levels) = get_factor_levels(data, f) {
                        term_width *= levels.len().saturating_sub(1);
                    }
                }
                if term_width == 0 {
                    continue;
                }
                if term == interaction_term {
                    for k in 0..term_width {
                        let c = col_start + offset + k;
                        if c < x_matrix[0].len() {
                            interaction_cols.push(c);
                        }
                    }
                    return Ok(interaction_cols);
                }
                offset += term_width;
            }
        }
    }

    Ok(interaction_cols)
}

/// The design of build_design_matrix_and_response with the same columns in
/// deviation (sum-to-zero) coding: a factor's dummy columns are all 0 for
/// its last level, which becomes −1 in every column of that factor, and each
/// interaction column is recomputed as the product of the recoded factor
/// columns (same row-major order as the builder). Intercept and covariate
/// columns are unchanged. Rows already deviation coded (contrast Deviation)
/// are left as they are.
fn deviation_coded_design(
    x_matrix: &Vec<Vec<f64>>,
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Vec<Vec<f64>> {
    let mut x = x_matrix.clone();
    let factors = match &config.main.fix_factor {
        Some(f) if !f.is_empty() => f.clone(),
        _ => return x,
    };
    let mut factor_cols: HashMap<String, Vec<usize>> = HashMap::new();
    for factor in &factors {
        let cols = get_factor_columns(x_matrix, factor, data, config).unwrap_or_default();
        for row in x.iter_mut() {
            if !cols.is_empty() && cols.iter().all(|&c| row[c] == 0.0) {
                for &c in &cols {
                    row[c] = -1.0;
                }
            }
        }
        factor_cols.insert(factor.clone(), cols);
    }
    if factors.len() > 1 && config.model.non_cust {
        for term in generate_interaction_terms(&factors) {
            let term_cols = get_interaction_columns(x_matrix, &term, data, config).unwrap_or_default();
            let parts: Vec<Vec<usize>> = parse_interaction_term(&term)
                .iter()
                .map(|f| factor_cols.get(f).cloned().unwrap_or_default())
                .collect();
            let dims: Vec<usize> = parts.iter().map(|c| c.len()).collect();
            let width: usize = dims.iter().product();
            if width == 0 || width != term_cols.len() {
                continue;
            }
            let mut strides = vec![1usize; dims.len()];
            for k in (0..dims.len().saturating_sub(1)).rev() {
                strides[k] = strides[k + 1] * dims[k + 1];
            }
            for row in x.iter_mut() {
                for (c, &col) in term_cols.iter().enumerate() {
                    let mut value = 1.0;
                    for (f_idx, cols) in parts.iter().enumerate() {
                        value *= row[cols[(c / strides[f_idx]) % dims[f_idx]]];
                    }
                    row[col] = value;
                }
            }
        }
    }
    x
}

/// Error sum of squares of the model without the given columns (Σy² when no
/// column is left).
fn sse_without_columns(
    x_matrix: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    drop: &[usize]
) -> Result<f64, String> {
    let reduced: Vec<Vec<f64>> = x_matrix
        .iter()
        .map(|row| {
            row.iter()
                .enumerate()
                .filter(|(j, _)| !drop.contains(j))
                .map(|(_, v)| *v)
                .collect()
        })
        .collect();
    if reduced.first().map_or(true, |r| r.is_empty()) {
        return Ok(y_vector.iter().map(|y| y * y).sum());
    }
    fit_model_and_get_ss(&reduced, y_vector)
}

/// Columns of the interaction terms that contain `effect` (every factor of
/// `effect` appears in the term), excluding `effect` itself.
fn containing_effect_columns(
    x_matrix: &Vec<Vec<f64>>,
    effect: &str,
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Vec<usize> {
    let factors = match &config.main.fix_factor {
        Some(f) if f.len() > 1 && config.model.non_cust => f.clone(),
        _ => return Vec::new(),
    };
    let effect_factors = parse_interaction_term(effect);
    let mut cols = Vec::new();
    for term in generate_interaction_terms(&factors) {
        if term == effect {
            continue;
        }
        let term_factors = parse_interaction_term(&term);
        if effect_factors.iter().all(|f| term_factors.contains(f)) {
            cols.extend(get_interaction_columns(x_matrix, &term, data, config).unwrap_or_default());
        }
    }
    cols
}
