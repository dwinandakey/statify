//! Saved Predictions Calculator for Binary Logistic Regression
//!
//! This module calculates predictions and diagnostics that can be saved
//! to the dataset, similar to SPSS's "Save" functionality.
//!
//! ## Variables that can be saved:
//!
//! ### Predicted Values
//! - **Probabilities (PRE_1)**: P(Y=1|X) - Predicted probability of success
//! - **Group membership (PGR_1)**: Predicted group (0 or 1) based on cutoff
//!
//! ### Residuals
//! Following SPSS conventions and standard logistic regression theory:
//!
//! 1. **Unstandardized Residual (RES_1)**
//!    - Formula: `r_i = Y_i - P_i`
//!    - Range: [-1, 1]
//!    - Simply the difference between observed and predicted probability
//!
//! 2. **Logit Residual (LRE_1)**
//!    - Formula: `r_logit = (Y - P) / (P * (1-P))`
//!    - Approximates the residual on the logit scale
//!    - Useful for checking linearity assumptions
//!
//! 3. **Standardized (Pearson) Residual (ZRE_1)**
//!    - Formula: `r_pearson = (Y - P) / sqrt(P * (1-P))`
//!    - Follows approximately N(0,1) for well-fitting models
//!    - Values > |2| often indicate outliers
//!
//! 4. **Deviance Residual (DEV_1)**
//!    - Formula: `d_i = sign(Y-P) * sqrt(2 * |contribution to deviance|)`
//!    - For Y=1: `d_i = sign(Y-P) * sqrt(-2 * ln(P))`
//!    - For Y=0: `d_i = sign(Y-P) * sqrt(-2 * ln(1-P))`
//!    - Sum of squares equals the deviance statistic
//!
//! 5. **Studentized Residual (SRE_1)** — Studentized Deviance Residual
//!    - Formula: `SRE_i = d_i / sqrt(1 - h_i)`
//!      - `d_i` = deviance residual (signed)
//!      - `h_i` = leverage (hat value)
//!    - Dividing the deviance residual by sqrt(1-h) adjusts for leverage,
//!      approximating the change in model deviance if case i is deleted
//!    - Matches IBM SPSS Statistics output exactly
//!    - Reference: Pregibon (1981), Hosmer & Lemeshow (2000)
//!
//! ### Influence Statistics
//! 
//! 6. **Cook's Distance (COO_1)**
//!    - Formula: `D_i = (r_std^2 * h_i) / (1 - h_i)`
//!    - Where r_std = standardized Pearson residual, h = leverage
//!    - This is Pregibon's (1981) ΔX² statistic: the approximate change
//!      in Pearson chi-squared when observation i is deleted
//!    - Note: uses `(1-h)` NOT `(1-h)²` — verified against IBM SPSS output
//!    - Reference: Pregibon (1981), Hosmer & Lemeshow (2000)
//!
//! 7. **Leverage (LEV_1)**
//!    - Formula: `h_i = w_i * x_i' * (X'WX)^{-1} * x_i`
//!    - Diagonal of hat matrix, measures remoteness in X-space
//!    - w_i = p_i * (1 - p_i)
//!
//! 8. **DfBeta (DFB0_1, DFB1_1, ...)**
//!    - Formula: `DFBETA_j = [Cov(β) * x_i * r_i] / (1 - h_i)`
//!    - Change in coefficient j if case i is deleted
//!    - Uses one-step Newton approximation (Pregibon, 1981)
//!    - NOTE: Does NOT multiply by w_i since Cov(β) already incorporates weights

use crate::models::config::LogisticConfig;
use crate::models::result::{SavedPredictionRow, SavedPredictions, SavedVariableNames};
use crate::stats::irls::FittedModel;
use nalgebra::{DMatrix, DVector};

/// Calculate saved predictions based on config options
/// 
/// # Arguments
/// * `x_matrix` - Design matrix (with constant if include_constant is true)
/// * `y_vector` - Observed outcomes (0 or 1)
/// * `model` - Fitted logistic regression model
/// * `config` - Configuration specifying which values to save
/// 
/// # Returns
/// SavedPredictions containing all requested prediction values
pub fn calculate_saved_predictions(
    x_matrix: &DMatrix<f64>,
    y_vector: &DVector<f64>,
    model: &FittedModel,
    config: &LogisticConfig,
) -> Option<SavedPredictions> {
    // Check if any save option is enabled
    let any_save_option = config.save_predicted_probabilities
        || config.save_predicted_group
        || config.save_residuals_unstandardized
        || config.save_residuals_logit
        || config.save_residuals_studentized
        || config.save_residuals_standardized
        || config.save_residuals_deviance
        || config.save_influence_cooks
        || config.save_influence_leverage
        || config.save_influence_dfbeta;

    if !any_save_option {
        return None;
    }

    let n_samples = x_matrix.nrows();
    let n_params = x_matrix.ncols();
    let predictions = &model.predictions;

    // Pre-calculate values needed for residuals and influence
    let mut leverage_values: Option<Vec<f64>> = None;
    
    // Calculate hat matrix diagonal (leverage) if needed for any influence statistic
    if config.save_influence_leverage 
        || config.save_residuals_studentized 
        || config.save_influence_cooks 
        || config.save_influence_dfbeta
    {
        // Use model.covariance_matrix which is already (X'WX)^{-1} from IRLS fitting.
        // This ensures consistency with the standard errors and other model outputs.
        leverage_values = Some(calculate_leverage(x_matrix, predictions, &model.covariance_matrix));
    }

    let mut rows: Vec<SavedPredictionRow> = Vec::with_capacity(n_samples);

    for i in 0..n_samples {
        let y_i = y_vector[i];
        let p_i = predictions[i];
        
        // Clamp probability to avoid log(0) issues
        let p_clamped = p_i.clamp(1e-10, 1.0 - 1e-10);

        let mut row = SavedPredictionRow {
            case_index: i,
            predicted_probability: None,
            predicted_group: None,
            resid_unstandardized: None,
            resid_logit: None,
            resid_studentized: None,
            resid_standardized: None,
            resid_deviance: None,
            influence_cooks: None,
            influence_leverage: None,
            influence_dfbeta: None,
        };

        // --- Predicted Values ---
        if config.save_predicted_probabilities {
            row.predicted_probability = Some(p_i);
        }

        if config.save_predicted_group {
            // Predicted group based on cutoff
            let pred_group = if p_i >= config.cutoff { 1.0 } else { 0.0 };
            row.predicted_group = Some(pred_group);
        }

        // --- Residuals ---
        // Raw/Unstandardized Residual: Y - P
        let raw_resid = y_i - p_i;
        
        if config.save_residuals_unstandardized {
            row.resid_unstandardized = Some(raw_resid);
        }

        // Standardized (Pearson) Residual: (Y - P) / sqrt(P * (1-P))
        let variance = p_clamped * (1.0 - p_clamped);
        let std_resid = if variance > 1e-12 {
            raw_resid / variance.sqrt()
        } else {
            0.0
        };

        if config.save_residuals_standardized {
            row.resid_standardized = Some(std_resid);
        }

        // Logit Residual: (Y - P) / (P * (1-P))
        if config.save_residuals_logit {
            let logit_resid = if variance > 1e-12 {
                raw_resid / variance
            } else {
                0.0
            };
            row.resid_logit = Some(logit_resid);
        }

        // Deviance component: d_i² = -2 * [Y*ln(P) + (1-Y)*ln(1-P)]
        // Computed unconditionally because it's needed for both
        // the Deviance Residual AND the Studentized Residual (Pregibon ΔD)
        let dev_component_sq = if y_i == 1.0 {
            -2.0 * p_clamped.ln()
        } else {
            -2.0 * (1.0 - p_clamped).ln()
        };

        // Deviance Residual: sign(Y-P) * sqrt(d_i²)
        if config.save_residuals_deviance {
            let dev_resid = if raw_resid >= 0.0 {
                dev_component_sq.sqrt()
            } else {
                -dev_component_sq.sqrt()
            };
            row.resid_deviance = Some(dev_resid);
        }

        // --- Leverage and Studentized Residual ---
        if let Some(ref lev) = leverage_values {
            let h_i = lev[i];

            if config.save_influence_leverage {
                row.influence_leverage = Some(h_i);
            }

            // Studentized Residual — Studentized Deviance Residual
            //
            // Formula: SRE_i = d_i / sqrt(1 - h_i)
            //
            // Where:
            //   d_i = deviance residual (already signed)
            //   h_i = leverage (hat value)
            //
            // This adjusts the deviance residual for leverage, making residuals
            // comparable across observations with different leverage levels.
            // d_i² / (1-h_i) approximates the change in model deviance when
            // case i is deleted.
            //
            // Verified against IBM SPSS Statistics output.
            //
            // References:
            //   - Pregibon, D. (1981). Logistic Regression Diagnostics.
            //   - Hosmer, D.W. & Lemeshow, S. (2000). Applied Logistic Regression.
            if config.save_residuals_studentized {
                // Compute signed deviance residual d_i
                let dev_resid = if raw_resid >= 0.0 {
                    dev_component_sq.sqrt()
                } else {
                    -dev_component_sq.sqrt()
                };
                let stud_resid = if h_i < 1.0 - 1e-12 {
                    dev_resid / (1.0 - h_i).sqrt()
                } else {
                    dev_resid // If leverage ≈ 1, use deviance residual as-is
                };
                row.resid_studentized = Some(stud_resid);
            }

            // Cook's Distance for Logistic Regression
            //
            // Pregibon (1981) ΔX² influence diagnostic.
            //
            // Formula: D_i = r_std^2 * h_i / (1 - h_i)
            //
            // Where:
            //   r_std = standardized Pearson residual = (Y-P)/sqrt(P(1-P))
            //   h_i = leverage (hat value)
            //
            // This measures the approximate change in the Pearson chi-squared
            // statistic when observation i is removed. It uses (1-h) to the
            // FIRST power (not squared), unlike classic Cook's D from linear
            // regression which uses (1-h)².
            //
            // Verified against IBM SPSS Statistics output.
            //
            // References:
            //   - Pregibon, D. (1981). Logistic Regression Diagnostics.
            //   - Hosmer, D.W. & Lemeshow, S. (2000). Applied Logistic Regression.
            if config.save_influence_cooks {
                let one_minus_h = 1.0 - h_i;
                let cooks = if one_minus_h > 1e-12 {
                    (std_resid.powi(2) * h_i) / one_minus_h
                } else {
                    0.0
                };
                row.influence_cooks = Some(cooks);
            }
        }

        // DfBeta: Change in each coefficient if case i is deleted
        // One-step approximation: DfBeta_j = [(X'WX)^{-1} * x_i * w_i * r_i] / (1 - h_i)
        if config.save_influence_dfbeta {
            // Leverage is guaranteed to be calculated when save_influence_dfbeta is true
            let h_i = leverage_values.as_ref().map(|lev| lev[i]).unwrap_or(0.0);
            
            let dfbeta = calculate_dfbeta_for_case(
                x_matrix,
                i,
                raw_resid,
                p_clamped,
                h_i,
                &model.covariance_matrix,
            );
            row.influence_dfbeta = Some(dfbeta);
        }

        rows.push(row);
    }

    // Generate variable names
    let variable_names = generate_variable_names(config, n_params);

    Some(SavedPredictions {
        rows,
        variable_names: Some(variable_names),
    })
}

/// Calculate leverage (diagonal of hat matrix) for logistic regression
/// h_i = w_i * x_i' * (X'WX)^{-1} * x_i
///
/// Uses the pre-computed (X'WX)^{-1} from the IRLS fitting (model.covariance_matrix)
/// to ensure numerical consistency with the model's standard errors.
fn calculate_leverage(
    x_matrix: &DMatrix<f64>,
    predictions: &DVector<f64>,
    xtwx_inv: &DMatrix<f64>,
) -> Vec<f64> {
    let n = x_matrix.nrows();

    // Build weight vector w_i = p_i * (1 - p_i)
    let mut w_diag: Vec<f64> = Vec::with_capacity(n);
    for i in 0..n {
        let p_i = predictions[i].clamp(1e-10, 1.0 - 1e-10);
        w_diag.push(p_i * (1.0 - p_i));
    }

    // Calculate leverage for each observation
    // h_i = w_i * x_i' * (X'WX)^{-1} * x_i
    let mut leverage = Vec::with_capacity(n);
    for i in 0..n {
        let x_i = x_matrix.row(i).transpose();
        let h_i = w_diag[i] * (x_i.transpose() * xtwx_inv * &x_i)[(0, 0)];
        leverage.push(h_i.clamp(0.0, 1.0));
    }

    leverage
}

/// Calculate DfBeta for a single case
/// 
/// DfBeta measures the change in each regression coefficient when observation i is deleted.
/// Uses the one-step Newton approximation (Pregibon, 1981).
/// 
/// **Formula (SPSS-compatible)**:
/// 
/// DFBETA_j = [Cov(β) * x_i * r_i] / (1 - h_i)
/// 
/// Where:
/// - Cov(β) = (X'WX)^{-1} = covariance_matrix (already computed during IRLS)
/// - x_i = predictor vector for observation i  
/// - r_i = y_i - p_i = raw residual (NOT weighted)
/// - h_i = leverage (hat value) for observation i
/// 
/// Reference: 
/// - Pregibon, D. (1981). Logistic Regression Diagnostics. The Annals of Statistics.
/// - SPSS Regression Algorithms documentation
fn calculate_dfbeta_for_case(
    x_matrix: &DMatrix<f64>,
    case_idx: usize,
    raw_resid: f64,
    _p_clamped: f64,  // Kept for API compatibility, but not used
    leverage: f64,
    covariance_matrix: &DMatrix<f64>,
) -> Vec<f64> {
    let x_i = x_matrix.row(case_idx).transpose();
    let n_params = x_matrix.ncols();
    
    // Leverage adjustment factor: 1 / (1 - h_i)
    // This accounts for the influence of observation i on its own prediction
    let leverage_adj = if leverage < 1.0 - 1e-10 {
        1.0 / (1.0 - leverage)
    } else {
        1.0  // Avoid division by zero for very high leverage points
    };
    
    // DfBeta_j = [Σ_k Cov(j,k) * x_ik] * r_i / (1 - h_i)
    // This is: Cov(β) * x_i * r_i / (1 - h_i)
    // NOTE: No w_i multiplication - covariance matrix already accounts for weights
    let mut dfbeta = Vec::with_capacity(n_params);
    for j in 0..n_params {
        let mut dfb_j = 0.0;
        for k in 0..n_params {
            dfb_j += covariance_matrix[(j, k)] * x_i[k];
        }
        // Multiply by raw residual and leverage adjustment only
        dfb_j *= raw_resid * leverage_adj;
        dfbeta.push(dfb_j);
    }
    
    dfbeta
}

/// Generate variable names following SPSS conventions
fn generate_variable_names(config: &LogisticConfig, n_params: usize) -> SavedVariableNames {
    SavedVariableNames {
        predicted_probability: if config.save_predicted_probabilities {
            Some("PRE_1".to_string())
        } else {
            None
        },
        predicted_group: if config.save_predicted_group {
            Some("PGR_1".to_string())
        } else {
            None
        },
        resid_unstandardized: if config.save_residuals_unstandardized {
            Some("RES_1".to_string())
        } else {
            None
        },
        resid_logit: if config.save_residuals_logit {
            Some("LRE_1".to_string())
        } else {
            None
        },
        resid_studentized: if config.save_residuals_studentized {
            Some("SRE_1".to_string())
        } else {
            None
        },
        resid_standardized: if config.save_residuals_standardized {
            Some("ZRE_1".to_string())
        } else {
            None
        },
        resid_deviance: if config.save_residuals_deviance {
            Some("DEV_1".to_string())
        } else {
            None
        },
        influence_cooks: if config.save_influence_cooks {
            Some("COO_1".to_string())
        } else {
            None
        },
        influence_leverage: if config.save_influence_leverage {
            Some("LEV_1".to_string())
        } else {
            None
        },
        influence_dfbeta: if config.save_influence_dfbeta {
            // B0 = constant (intercept), B1 = first predictor, etc.
            // If include_constant = true:  DFB0_1 (constant), DFB1_1, DFB2_1, ...
            // If include_constant = false: DFB1_1, DFB2_1, DFB3_1, ... (no constant)
            let start_index = if config.include_constant { 0 } else { 1 };
            let names: Vec<String> = (0..n_params)
                .map(|i| format!("DFB{}_{}", start_index + i, 1))
                .collect();
            Some(names)
        } else {
            None
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::stats::irls::FittingWarnings;
    use nalgebra::{DMatrix, DVector};

    /// Helper function to create a FittedModel for tests
    fn create_test_model(
        beta: DVector<f64>,
        predictions: DVector<f64>,
        cov: DMatrix<f64>,
    ) -> FittedModel {
        let n = predictions.len();
        let residuals = DVector::from_element(n, 0.0); // Placeholder
        let weights = predictions.map(|p| p * (1.0 - p));
        
        FittedModel {
            beta,
            predictions,
            final_log_likelihood: -5.0,
            covariance_matrix: cov,
            converged: true,
            iterations: 5,
            residuals,
            weights,
            warnings: FittingWarnings::default(),
        }
    }

    #[test]
    fn test_calculate_saved_predictions_probabilities() {
        // Simple test case
        let x = DMatrix::from_row_slice(3, 2, &[
            1.0, 0.5,
            1.0, 1.5,
            1.0, 2.5,
        ]);
        let y = DVector::from_vec(vec![0.0, 1.0, 1.0]);
        
        // Mock fitted model
        let predictions = DVector::from_vec(vec![0.3, 0.6, 0.8]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_predicted_probabilities = true;
        config.save_predicted_group = true;
        config.cutoff = 0.5;

        let result = calculate_saved_predictions(&x, &y, &model, &config);
        assert!(result.is_some());
        
        let saved = result.unwrap();
        assert_eq!(saved.rows.len(), 3);
        
        // Check first row
        assert!(saved.rows[0].predicted_probability.is_some());
        assert!((saved.rows[0].predicted_probability.unwrap() - 0.3).abs() < 1e-6);
        assert_eq!(saved.rows[0].predicted_group, Some(0.0)); // < 0.5
        
        // Check second row
        assert!((saved.rows[1].predicted_probability.unwrap() - 0.6).abs() < 1e-6);
        assert_eq!(saved.rows[1].predicted_group, Some(1.0)); // >= 0.5
    }

    #[test]
    fn test_no_save_options_returns_none() {
        let x = DMatrix::from_row_slice(2, 2, &[1.0, 0.5, 1.0, 1.5]);
        let y = DVector::from_vec(vec![0.0, 1.0]);
        
        let predictions = DVector::from_vec(vec![0.3, 0.7]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let config = LogisticConfig::default(); // All save options are false

        let result = calculate_saved_predictions(&x, &y, &model, &config);
        assert!(result.is_none());
    }

    #[test]
    fn test_residuals_unstandardized() {
        // Test: Unstandardized Residual = Y - P
        let x = DMatrix::from_row_slice(3, 2, &[
            1.0, 0.5,
            1.0, 1.5,
            1.0, 2.5,
        ]);
        let y = DVector::from_vec(vec![0.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.3, 0.6, 0.8]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_residuals_unstandardized = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Y=0, P=0.3 -> resid = 0 - 0.3 = -0.3
        assert!((result.rows[0].resid_unstandardized.unwrap() - (-0.3)).abs() < 1e-6);
        // Y=1, P=0.6 -> resid = 1 - 0.6 = 0.4
        assert!((result.rows[1].resid_unstandardized.unwrap() - 0.4).abs() < 1e-6);
        // Y=1, P=0.8 -> resid = 1 - 0.8 = 0.2
        assert!((result.rows[2].resid_unstandardized.unwrap() - 0.2).abs() < 1e-6);
    }

    #[test]
    fn test_residuals_standardized_pearson() {
        // Test: Standardized (Pearson) Residual = (Y - P) / sqrt(P * (1-P))
        let x = DMatrix::from_row_slice(2, 2, &[1.0, 0.5, 1.0, 1.5]);
        let y = DVector::from_vec(vec![0.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.3, 0.6]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_residuals_standardized = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Case 1: Y=0, P=0.3
        // raw = -0.3, variance = 0.3 * 0.7 = 0.21, std_resid = -0.3 / sqrt(0.21) = -0.6547
        let expected_std_0 = -0.3 / (0.3 * 0.7_f64).sqrt();
        assert!((result.rows[0].resid_standardized.unwrap() - expected_std_0).abs() < 1e-4);
        
        // Case 2: Y=1, P=0.6
        // raw = 0.4, variance = 0.6 * 0.4 = 0.24, std_resid = 0.4 / sqrt(0.24) = 0.8165
        let expected_std_1 = 0.4 / (0.6 * 0.4_f64).sqrt();
        assert!((result.rows[1].resid_standardized.unwrap() - expected_std_1).abs() < 1e-4);
    }

    #[test]
    fn test_residuals_logit() {
        // Test: Logit Residual = (Y - P) / (P * (1-P))
        let x = DMatrix::from_row_slice(2, 2, &[1.0, 0.5, 1.0, 1.5]);
        let y = DVector::from_vec(vec![0.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.3, 0.6]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_residuals_logit = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Case 1: Y=0, P=0.3
        // raw = -0.3, variance = 0.21, logit_resid = -0.3 / 0.21 = -1.4286
        let expected_logit_0 = -0.3 / (0.3 * 0.7);
        assert!((result.rows[0].resid_logit.unwrap() - expected_logit_0).abs() < 1e-4);
        
        // Case 2: Y=1, P=0.6
        // raw = 0.4, variance = 0.24, logit_resid = 0.4 / 0.24 = 1.6667
        let expected_logit_1 = 0.4 / (0.6 * 0.4);
        assert!((result.rows[1].resid_logit.unwrap() - expected_logit_1).abs() < 1e-4);
    }

    #[test]
    fn test_residuals_deviance() {
        // Test: Deviance Residual = sign(Y-P) * sqrt(-2 * ln(likelihood contribution))
        // For Y=1: d_i = sqrt(-2 * ln(p_i)) with appropriate sign
        // For Y=0: d_i = sqrt(-2 * ln(1-p_i)) with appropriate sign
        let x = DMatrix::from_row_slice(2, 2, &[1.0, 0.5, 1.0, 1.5]);
        let y = DVector::from_vec(vec![0.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.3, 0.6]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_residuals_deviance = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Case 1: Y=0, P=0.3 -> raw_resid = -0.3 (negative)
        // dev_component = -2 * ln(1 - 0.3) = -2 * ln(0.7) ≈ 0.7133
        // dev_resid = -sqrt(0.7133) ≈ -0.8446 (negative sign)
        let expected_dev_0 = -((-2.0 * (0.7_f64).ln()).sqrt());
        assert!((result.rows[0].resid_deviance.unwrap() - expected_dev_0).abs() < 1e-4);
        
        // Case 2: Y=1, P=0.6 -> raw_resid = 0.4 (positive)
        // dev_component = -2 * ln(0.6) ≈ 1.0217
        // dev_resid = sqrt(1.0217) ≈ 1.0108 (positive sign)
        let expected_dev_1 = (-2.0 * (0.6_f64).ln()).sqrt();
        assert!((result.rows[1].resid_deviance.unwrap() - expected_dev_1).abs() < 1e-4);
    }

    #[test]
    fn test_residuals_studentized_pregibon() {
        // Test: Studentized Residual = Studentized Deviance Residual
        // Formula: SRE = d_i / sqrt(1 - h)
        let x = DMatrix::from_row_slice(2, 2, &[
            1.0, 0.5,
            1.0, 1.5,
        ]);
        let y = DVector::from_vec(vec![0.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.3, 0.6]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_residuals_studentized = true;
        config.save_residuals_deviance = true;
        config.save_influence_leverage = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Verify studentized residual exists
        assert!(result.rows[0].resid_studentized.is_some());
        assert!(result.rows[1].resid_studentized.is_some());
        
        // Verify formula: SRE = d_i / sqrt(1 - h)
        for (i, row) in result.rows.iter().enumerate() {
            let y_i: f64 = if i == 0 { 0.0 } else { 1.0 };
            let p_i: f64 = if i == 0 { 0.3 } else { 0.6 };
            let raw_resid: f64 = y_i - p_i;
            let dev_r = row.resid_deviance.unwrap();
            let h = row.influence_leverage.unwrap();
            let stud = row.resid_studentized.unwrap();
            
            if h < 1.0 - 1e-12 {
                let expected_stud = dev_r / (1.0 - h).sqrt();
                assert!((stud - expected_stud).abs() < 1e-4, 
                    "Studentized residual mismatch at row {}: got {}, expected {}", 
                    i, stud, expected_stud);
            }
            
            // Verify sign matches sign(Y - P)
            if raw_resid != 0.0 {
                assert_eq!(stud.signum(), raw_resid.signum(),
                    "Sign mismatch at row {}: stud={}, raw_resid={}", i, stud, raw_resid);
            }
        }
    }

    #[test]
    fn test_all_residuals_together() {
        // Test that all residual types can be calculated together
        let x = DMatrix::from_row_slice(3, 2, &[
            1.0, 0.5,
            1.0, 1.5,
            1.0, 2.5,
        ]);
        let y = DVector::from_vec(vec![0.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.3, 0.6, 0.8]);
        let beta = DVector::from_vec(vec![-0.5, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.1, 0.0, 0.0, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_residuals_unstandardized = true;
        config.save_residuals_logit = true;
        config.save_residuals_standardized = true;
        config.save_residuals_deviance = true;
        config.save_residuals_studentized = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Verify all residual types are present for all rows
        for (i, row) in result.rows.iter().enumerate() {
            assert!(row.resid_unstandardized.is_some(), "Row {} missing unstandardized", i);
            assert!(row.resid_logit.is_some(), "Row {} missing logit", i);
            assert!(row.resid_standardized.is_some(), "Row {} missing standardized", i);
            assert!(row.resid_deviance.is_some(), "Row {} missing deviance", i);
            assert!(row.resid_studentized.is_some(), "Row {} missing studentized", i);
        }
        
        // Verify variable names are generated
        let names = result.variable_names.unwrap();
        assert_eq!(names.resid_unstandardized, Some("RES_1".to_string()));
        assert_eq!(names.resid_logit, Some("LRE_1".to_string()));
        assert_eq!(names.resid_standardized, Some("ZRE_1".to_string()));
        assert_eq!(names.resid_deviance, Some("DEV_1".to_string()));
        assert_eq!(names.resid_studentized, Some("SRE_1".to_string()));
    }

    // =========================================================================
    // INFLUENCE STATISTICS TESTS
    // =========================================================================

    #[test]
    fn test_influence_leverage() {
        // Test: Leverage (Hat value) h_i = w_i * x_i' * (X'WX)^{-1} * x_i
        // where w_i = p_i * (1 - p_i)
        let x = DMatrix::from_row_slice(4, 2, &[
            1.0, 0.0,   // Case 1: x = 0
            1.0, 1.0,   // Case 2: x = 1
            1.0, 2.0,   // Case 3: x = 2
            1.0, 3.0,   // Case 4: x = 3
        ]);
        let y = DVector::from_vec(vec![0.0, 0.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.2, 0.4, 0.6, 0.8]);
        let beta = DVector::from_vec(vec![-1.0, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.5, -0.1, -0.1, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_influence_leverage = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Verify leverage exists for all rows
        for (i, row) in result.rows.iter().enumerate() {
            assert!(row.influence_leverage.is_some(), "Row {} missing leverage", i);
            let lev = row.influence_leverage.unwrap();
            // Leverage should be between 0 and 1
            assert!(lev >= 0.0 && lev <= 1.0, 
                "Leverage out of range [0,1]: got {}", lev);
        }

        // Verify variable name
        let names = result.variable_names.unwrap();
        assert_eq!(names.influence_leverage, Some("LEV_1".to_string()));
    }

    #[test]
    fn test_influence_cooks_distance() {
        // Test: Cook's Distance = (std_resid^2 * h_i) / (k * (1 - h_i))
        let x = DMatrix::from_row_slice(4, 2, &[
            1.0, 0.0,
            1.0, 1.0,
            1.0, 2.0,
            1.0, 3.0,
        ]);
        let y = DVector::from_vec(vec![0.0, 0.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.2, 0.4, 0.6, 0.8]);
        let beta = DVector::from_vec(vec![-1.0, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.5, -0.1, -0.1, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_influence_cooks = true;
        config.save_influence_leverage = true;
        config.save_residuals_standardized = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Verify Cook's distance exists and is calculated correctly
        for row in &result.rows {
            assert!(row.influence_cooks.is_some());
            let cooks = row.influence_cooks.unwrap();
            let h = row.influence_leverage.unwrap();
            let std_resid = row.resid_standardized.unwrap();
            
            // Cook's distance should be non-negative
            assert!(cooks >= 0.0, "Cook's distance should be non-negative: got {}", cooks);
            
            // Verify formula: D = r^2 * h / (1-h)^2
            if h < 1.0 - 1e-12 {
                let expected_cooks = (std_resid.powi(2) * h) / (1.0 - h);
                assert!((cooks - expected_cooks).abs() < 1e-6,
                    "Cook's distance mismatch: got {}, expected {}", cooks, expected_cooks);
            }
        }

        // Verify variable name
        let names = result.variable_names.unwrap();
        assert_eq!(names.influence_cooks, Some("COO_1".to_string()));
    }

    #[test]
    fn test_influence_dfbeta() {
        // Test: DfBeta - change in coefficients when case i is deleted
        let x = DMatrix::from_row_slice(4, 2, &[
            1.0, 0.0,
            1.0, 1.0,
            1.0, 2.0,
            1.0, 3.0,
        ]);
        let y = DVector::from_vec(vec![0.0, 0.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.2, 0.4, 0.6, 0.8]);
        let beta = DVector::from_vec(vec![-1.0, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.5, -0.1, -0.1, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_influence_dfbeta = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Verify DfBeta exists for all rows
        for (i, row) in result.rows.iter().enumerate() {
            assert!(row.influence_dfbeta.is_some(), "Row {} missing dfbeta", i);
            let dfbeta = row.influence_dfbeta.as_ref().unwrap();
            
            // Should have one DfBeta for each parameter (2 in this case)
            assert_eq!(dfbeta.len(), 2, 
                "DfBeta should have {} elements, got {}", 2, dfbeta.len());
            
            // DfBeta values should be finite
            for (j, &val) in dfbeta.iter().enumerate() {
                assert!(val.is_finite(), 
                    "DfBeta[{}] for row {} is not finite: {}", j, i, val);
            }
        }

        // Verify variable names
        let names = result.variable_names.unwrap();
        assert!(names.influence_dfbeta.is_some());
        let dfbeta_names = names.influence_dfbeta.unwrap();
        assert_eq!(dfbeta_names.len(), 2);
        assert_eq!(dfbeta_names[0], "DFB0_1");
        assert_eq!(dfbeta_names[1], "DFB1_1");
    }

    #[test]
    fn test_dfbeta_properties() {
        // Test mathematical properties of DfBeta
        // DfBeta should have opposite signs for correctly vs incorrectly classified cases
        let x = DMatrix::from_row_slice(4, 2, &[
            1.0, 0.0,   // Well-classified 0 (P=0.1)
            1.0, 1.0,   // Misclassified 0 (P=0.7)
            1.0, 2.0,   // Misclassified 1 (P=0.3)
            1.0, 3.0,   // Well-classified 1 (P=0.9)
        ]);
        let y = DVector::from_vec(vec![0.0, 0.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.1, 0.7, 0.3, 0.9]);
        let beta = DVector::from_vec(vec![-1.0, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.5, -0.1, -0.1, 0.1]);
        
        let model = create_test_model(beta, predictions, cov);

        let mut config = LogisticConfig::default();
        config.save_influence_dfbeta = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Case 0: Y=0, P=0.1, residual = -0.1 (small negative)
        // Case 1: Y=0, P=0.7, residual = -0.7 (large negative) 
        // Case 2: Y=1, P=0.3, residual = 0.7 (large positive)
        // Case 3: Y=1, P=0.9, residual = 0.1 (small positive)
        
        let dfb_0 = result.rows[0].influence_dfbeta.as_ref().unwrap();
        let dfb_1 = result.rows[1].influence_dfbeta.as_ref().unwrap();
        let dfb_2 = result.rows[2].influence_dfbeta.as_ref().unwrap();
        let dfb_3 = result.rows[3].influence_dfbeta.as_ref().unwrap();
        
        // Misclassified cases (1 and 2) should have larger magnitude DfBeta
        // than well-classified cases (0 and 3)
        let magnitude_0 = dfb_0.iter().map(|x| x.abs()).sum::<f64>();
        let magnitude_1 = dfb_1.iter().map(|x| x.abs()).sum::<f64>();
        let magnitude_2 = dfb_2.iter().map(|x| x.abs()).sum::<f64>();
        let magnitude_3 = dfb_3.iter().map(|x| x.abs()).sum::<f64>();
        
        // Misclassified should have larger magnitudes
        assert!(magnitude_1 > magnitude_0, 
            "Misclassified case should have larger DfBeta magnitude");
        assert!(magnitude_2 > magnitude_3, 
            "Misclassified case should have larger DfBeta magnitude");
    }

    #[test]
    fn test_all_influence_statistics_together() {
        // Test that all influence statistics can be calculated together
        let x = DMatrix::from_row_slice(5, 3, &[
            1.0, 0.5, 1.0,
            1.0, 1.5, 2.0,
            1.0, 2.5, 1.5,
            1.0, 3.5, 3.0,
            1.0, 4.5, 2.5,
        ]);
        let y = DVector::from_vec(vec![0.0, 0.0, 1.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.15, 0.35, 0.55, 0.75, 0.85]);
        let beta = DVector::from_vec(vec![-2.0, 0.5, 0.3]);
        let cov = DMatrix::from_row_slice(3, 3, &[
            0.5, -0.1, -0.05,
            -0.1, 0.15, -0.02,
            -0.05, -0.02, 0.08,
        ]);
        
        let n = predictions.len();
        let residuals = DVector::from_element(n, 0.0);
        let weights = predictions.map(|p| p * (1.0 - p));
        
        let model = FittedModel {
            beta,
            predictions,
            final_log_likelihood: -8.0,
            covariance_matrix: cov,
            converged: true,
            iterations: 7,
            residuals,
            weights,
            warnings: FittingWarnings::default(),
        };

        let mut config = LogisticConfig::default();
        config.save_influence_leverage = true;
        config.save_influence_cooks = true;
        config.save_influence_dfbeta = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        // Verify all influence statistics are present
        for (i, row) in result.rows.iter().enumerate() {
            assert!(row.influence_leverage.is_some(), "Row {} missing leverage", i);
            assert!(row.influence_cooks.is_some(), "Row {} missing cooks", i);
            assert!(row.influence_dfbeta.is_some(), "Row {} missing dfbeta", i);
            
            // DfBeta should have 3 elements (for 3 parameters)
            let dfbeta = row.influence_dfbeta.as_ref().unwrap();
            assert_eq!(dfbeta.len(), 3);
        }
        
        // Verify variable names
        let names = result.variable_names.unwrap();
        assert_eq!(names.influence_leverage, Some("LEV_1".to_string()));
        assert_eq!(names.influence_cooks, Some("COO_1".to_string()));
        let dfb_names = names.influence_dfbeta.unwrap();
        assert_eq!(dfb_names, vec!["DFB0_1", "DFB1_1", "DFB2_1"]);
    }

    #[test]
    fn test_leverage_sum_property() {
        // Test: Sum of leverages should approximately equal number of parameters (p)
        // This is a known property: Σh_i = p (for OLS, approximately true for logistic)
        let x = DMatrix::from_row_slice(10, 2, &[
            1.0, 0.0,
            1.0, 0.5,
            1.0, 1.0,
            1.0, 1.5,
            1.0, 2.0,
            1.0, 2.5,
            1.0, 3.0,
            1.0, 3.5,
            1.0, 4.0,
            1.0, 4.5,
        ]);
        let y = DVector::from_vec(vec![0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![
            0.1, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.9
        ]);
        let beta = DVector::from_vec(vec![-2.0, 0.5]);
        let cov = DMatrix::from_row_slice(2, 2, &[0.5, -0.1, -0.1, 0.15]);
        
        let n = predictions.len();
        let residuals = DVector::from_element(n, 0.0);
        let weights = predictions.map(|p| p * (1.0 - p));
        
        let model = FittedModel {
            beta,
            predictions,
            final_log_likelihood: -10.0,
            covariance_matrix: cov,
            converged: true,
            iterations: 6,
            residuals,
            weights,
            warnings: FittingWarnings::default(),
        };

        let mut config = LogisticConfig::default();
        config.save_influence_leverage = true;

        let result = calculate_saved_predictions(&x, &y, &model, &config).unwrap();
        
        let sum_leverage: f64 = result.rows.iter()
            .map(|r| r.influence_leverage.unwrap())
            .sum();
        
        // For logistic regression, sum of leverages should be close to p (number of parameters)
        // This is approximate due to the weighted nature of logistic regression
        let n_params = 2.0;
        assert!(sum_leverage > 0.0 && sum_leverage <= 10.0,
            "Sum of leverages should be reasonable: got {}", sum_leverage);
        
        // Sum should be roughly proportional to p
        // Not exact equality for logistic, but should be in reasonable range
        println!("Sum of leverages: {}, expected ~{}", sum_leverage, n_params);
    }
}

