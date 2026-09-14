use std::collections::HashMap;

use crate::models::{
    config::MultivariateConfig,
    data::AnalysisData,
    result::ResidualPlotData,
};

use super::core::{
    build_design_matrix_and_response,
    generate_interaction_terms,
    to_dmatrix,
    to_dvector,
};

/// Compute per-row residual diagnostic data (Observed, Predicted,
/// Standardised Residual) for every Dependent Variable in the model.
///
/// The frontend turns the returned map into the three scatter plots SPSS
/// shows under the GLM Multivariate Options dialog's "Residual plot"
/// checkbox: Observed × Predicted, Predicted × Std. Residual, and
/// Observed × Std. Residual.
///
/// Standardised residual = rᵢ / √(MSE · (1 − hᵢᵢ)) where hᵢᵢ is the
/// i-th leverage (diagonal of the hat matrix X(X'X)⁻¹X').
pub fn calculate_residual_plots(
    data: &AnalysisData,
    config: &MultivariateConfig,
) -> Result<HashMap<String, ResidualPlotData>, String> {
    if !config.options.res_plot {
        return Err("Residual plots not requested.".to_string());
    }

    let dependent_vars: Vec<String> = data
        .dependent_data_defs
        .iter()
        .flat_map(|defs| defs.iter().map(|def| def.name.clone()))
        .collect();

    if dependent_vars.is_empty() {
        return Err("No dependent variables available for residual plots.".to_string());
    }

    let model_str = build_model_string(config);

    let mut result: HashMap<String, ResidualPlotData> = HashMap::new();
    for dep_var in &dependent_vars {
        let (x_matrix, y_vector) =
            build_design_matrix_and_response(data, config, dep_var)?;
        if x_matrix.is_empty() || y_vector.is_empty() {
            continue;
        }

        let x_mat = to_dmatrix(&x_matrix);
        let y_vec = to_dvector(&y_vector);

        let xtx = &x_mat.transpose() * &x_mat;
        let xty = &x_mat.transpose() * &y_vec;
        let xtx_inv = match xtx.clone().try_inverse() {
            Some(inv) => inv,
            None => continue, // Skip DV when X'X is singular.
        };
        let beta = &xtx_inv * &xty;

        let y_hat = &x_mat * &beta;
        let residuals = &y_vec - &y_hat;

        let n = y_vector.len();
        let p_cols = x_matrix[0].len();
        if n <= p_cols {
            continue;
        }
        let df_error = n - p_cols;

        let ss_error: f64 = residuals.iter().map(|r| r.powi(2)).sum();
        let ms_error = ss_error / (df_error as f64);
        if ms_error <= 0.0 || !ms_error.is_finite() {
            continue;
        }

        // h_ii = x_i (X'X)⁻¹ x_iᵀ
        let mut std_residuals = Vec::with_capacity(n);
        for i in 0..n {
            let x_i = x_mat.row(i);
            let h_ii = (x_i * &xtx_inv * x_i.transpose())[(0, 0)];
            let var_resid_i = ms_error * (1.0 - h_ii).max(0.0);
            let std_r = if var_resid_i > 0.0 {
                residuals[i] / var_resid_i.sqrt()
            } else {
                0.0
            };
            std_residuals.push(std_r);
        }

        let observed: Vec<f64> = y_vector.iter().copied().collect();
        let predicted: Vec<f64> = y_hat.iter().copied().collect();

        result.insert(
            dep_var.clone(),
            ResidualPlotData {
                dependent_variable: dep_var.clone(),
                model: model_str.clone(),
                observed,
                predicted,
                std_residual: std_residuals,
            },
        );
    }

    if result.is_empty() {
        Err(
            "Failed to compute residual plots for any dependent variable.".to_string(),
        )
    } else {
        Ok(result)
    }
}

/// Build the "Model: Intercept + faktorA + faktorB + faktorA * faktorB"
/// line that SPSS prints at the bottom of each residual plot panel.
fn build_model_string(config: &MultivariateConfig) -> String {
    let mut terms: Vec<String> = Vec::new();
    if config.model.intercept {
        terms.push("Intercept".to_string());
    }
    let factors = config
        .main
        .fix_factor
        .as_ref()
        .cloned()
        .unwrap_or_default();
    for f in &factors {
        terms.push(f.clone());
    }
    if let Some(covars) = &config.main.covar {
        for c in covars {
            terms.push(c.clone());
        }
    }
    if factors.len() > 1 {
        for term in generate_interaction_terms(&factors) {
            terms.push(term);
        }
    }
    format!("Model: {}", terms.join(" + "))
}
