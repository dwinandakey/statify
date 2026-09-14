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
    data_value_to_string,
    extract_dependent_value,
    generate_interaction_terms,
    get_factor_levels,
    merge_records,
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
        let observed_power = calculate_observed_power(df_model, df_error, f_value, 0.05);

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
            // Type III SS for Intercept in unbalanced designs:
            //   SS = (Σᵢ ȳᵢ)² / Σᵢ(1/nᵢ)
            // This equals N * grand_mean² only for balanced designs.
            // Fall back to N * ȳ² when no factors are present (one-pop T² case).
            //
            // When μ₀ₖ ≠ 0 (Test Values mode) we shift every group mean (or
            // the grand mean in the no-factor fallback) by μ₀ₖ, which is
            // arithmetically identical to running GLM on `d_var = var − μ₀`
            // and matches the reference SPSS output.
            let intercept_ss = if config.main.fix_factor
                .as_ref()
                .map_or(false, |f| !f.is_empty())
            {
                let factor = &config.main.fix_factor.as_ref().unwrap()[0];
                let merged_rows = merge_records(data);
                let mut sum_group_means = 0.0_f64;
                let mut sum_inv_n = 0.0_f64;
                if let Ok(levels) = get_factor_levels(data, factor) {
                    for level in &levels {
                        let group_vals: Vec<f64> = merged_rows
                            .iter()
                            .filter_map(|rec| {
                                let fv = rec.values
                                    .get(factor.as_str())
                                    .map(|v| data_value_to_string(v));
                                if fv.as_deref() == Some(level.as_str()) {
                                    extract_dependent_value(rec, dep_var)
                                } else {
                                    None
                                }
                            })
                            .collect();
                        if !group_vals.is_empty() {
                            sum_group_means += calculate_mean(&group_vals) - mu0_k;
                            sum_inv_n += 1.0 / (group_vals.len() as f64);
                        }
                    }
                }
                if sum_inv_n > 0.0 {
                    sum_group_means * sum_group_means / sum_inv_n
                } else {
                    (n as f64) * (mean_y - mu0_k).powi(2)
                }
            } else {
                (n as f64) * (mean_y - mu0_k).powi(2)
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
                0.05
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

        // If there are factors, calculate Type I, II, III, or IV SS for each
        if let Some(factors) = &config.main.fix_factor {
            for factor in factors {
                let factor_cols = get_factor_columns(&x_matrix, factor, data, config)?;
                // Each encoded column contributes one numerator df.
                let factor_df = factor_cols.len();

                if factor_df > 0 {
                    // Calculate factor SS based on the SS type
                    let factor_ss = match config.model.sum_of_square_method {
                        SumOfSquaresMethod::TypeI => {
                            // Type I SS (sequential)
                            calculate_type_i_ss(&x_matrix, &y_vector, &factor_cols, data, config)?
                        }
                        SumOfSquaresMethod::TypeII => {
                            // Type II SS
                            calculate_type_ii_ss(
                                &x_matrix,
                                &y_vector,
                                factor,
                                &factor_cols,
                                data,
                                config
                            )?
                        }
                        SumOfSquaresMethod::TypeIII => {
                            // Type III SS (default)
                            calculate_type_iii_ss(
                                &x_matrix,
                                &y_vector,
                                factor,
                                &factor_cols,
                                data,
                                config
                            )?
                        }
                        SumOfSquaresMethod::TypeIV => {
                            // Type IV SS
                            calculate_type_iv_ss(
                                &x_matrix,
                                &y_vector,
                                factor,
                                &factor_cols,
                                data,
                                config
                            )?
                        }
                    };

                    let factor_ms = factor_ss / (factor_df as f64);
                    let factor_f = factor_ms / ms_error;
                    let factor_sig = calculate_f_significance(factor_df, df_error, factor_f);
                    let factor_eta = factor_ss / (factor_ss + ss_error);
                    let factor_noncent = factor_ss / ms_error;
                    let factor_power = calculate_observed_power(
                        factor_df,
                        df_error,
                        factor_f,
                        0.05
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
            if factors.len() > 1 {
                let interaction_terms = generate_interaction_terms(factors);

                for term in &interaction_terms {
                    // Determine columns for this interaction
                    let interaction_cols = get_interaction_columns(&x_matrix, term, data, config)?;
                    let interaction_df = interaction_cols.len();

                    if interaction_df > 0 {
                        // Calculate interaction SS based on the SS type
                        let interaction_ss = match config.model.sum_of_square_method {
                            SumOfSquaresMethod::TypeI => {
                                // Type I SS (sequential)
                                calculate_type_i_ss(
                                    &x_matrix,
                                    &y_vector,
                                    &interaction_cols,
                                    data,
                                    config
                                )?
                            }
                            SumOfSquaresMethod::TypeII => {
                                // Type II SS
                                calculate_type_ii_ss(
                                    &x_matrix,
                                    &y_vector,
                                    term,
                                    &interaction_cols,
                                    data,
                                    config
                                )?
                            }
                            SumOfSquaresMethod::TypeIII => {
                                // Type III SS (default)
                                calculate_type_iii_ss(
                                    &x_matrix,
                                    &y_vector,
                                    term,
                                    &interaction_cols,
                                    data,
                                    config
                                )?
                            }
                            SumOfSquaresMethod::TypeIV => {
                                // Type IV SS
                                calculate_type_iv_ss(
                                    &x_matrix,
                                    &y_vector,
                                    term,
                                    &interaction_cols,
                                    data,
                                    config
                                )?
                            }
                        };

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
                            0.05
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
    // Type II SS calculation
    // Adjusted for all other appropriate effects

    // Create a model with all main effects except the current factor
    let mut reduced_x = Vec::new();
    for row in x_matrix {
        let mut new_row = Vec::new();
        for (j, val) in row.iter().enumerate() {
            if !factor_cols.contains(&j) {
                new_row.push(*val);
            }
        }
        reduced_x.push(new_row);
    }

    let full_model_ss = fit_model_and_get_ss(&x_matrix, &y_vector)?;
    let reduced_model_ss = fit_model_and_get_ss(&reduced_x, &y_vector)?;

    // Type II SS is the difference between full and reduced model SS
    Ok(reduced_model_ss - full_model_ss)
}

pub fn calculate_type_iii_ss(
    x_matrix: &Vec<Vec<f64>>,
    y_vector: &Vec<f64>,
    _effect: &str,
    effect_cols: &Vec<usize>,
    _data: &AnalysisData,
    _config: &MultivariateConfig
) -> Result<f64, String> {
    // Type III SS calculation
    // Adjusted for all other effects and orthogonal to any effects that contain it

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
