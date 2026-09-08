use nalgebra::DMatrix;
use statrs::distribution::{ ChiSquared, ContinuousCDF };
use std::collections::HashMap;

use crate::models::{
    config::RepeatedMeasuresConfig,
    data::{ AnalysisData, DataValue },
    result::{ MauchlyTest, MauchlyTestEntry },
};

use super::core::parse_within_subject_factors;

/// Build an orthonormal Helmert contrast matrix M of shape (k-1) × k.
/// Each row sums to zero and M·Mᵀ = I_{k-1}. Mauchly's W and the GG
/// epsilon are invariant under any orthonormal contrast, so this matches
/// SPSS's behavior of working on the orthonormalized transform.
fn build_orthonormal_contrast(k: usize) -> DMatrix<f64> {
    let mut m = DMatrix::<f64>::zeros(k - 1, k);
    for i in 1..k {
        let scale = ((i * (i + 1)) as f64).sqrt();
        for j in 0..i {
            m[(i - 1, j)] = -1.0 / scale;
        }
        m[(i - 1, i)] = (i as f64) / scale;
    }
    m
}

/// Calculate Mauchly's Test of Sphericity
pub fn calculate_mauchly_test(
    data: &AnalysisData,
    config: &RepeatedMeasuresConfig
) -> Result<MauchlyTest, String> {
    // Get within-subjects factors
    let within_factors = parse_within_subject_factors(data, config)?;

    let mut tests = HashMap::new();
    let mut design = None;

    // Process each within-subjects factor
    for (factor_name, factors) in &within_factors.measures {
        // We need at least 2 levels for the test
        if factors.len() < 2 {
            continue;
        }

        // Extract variable names for this factor
        let var_names: Vec<String> = factors
            .iter()
            .map(|f| f.dependent_variable.clone())
            .collect();

        // Extract data values
        let mut data_matrix = Vec::new();

        for record_group in &data.subject_data {
            let mut subject_data = Vec::new();

            for var_name in &var_names {
                let mut found = false;

                for record in record_group {
                    if let Some(data_value) = record.values.get(var_name) {
                        match data_value {
                            DataValue::Number(val) => {
                                subject_data.push(*val);
                                found = true;
                                break;
                            }
                            _ => {
                                continue;
                            }
                        }
                    }
                }

                if !found {
                    subject_data.push(0.0); // Missing data handling
                }
            }

            if subject_data.len() == var_names.len() {
                data_matrix.push(subject_data);
            }
        }

        // Convert to nalgebra matrix
        let n_subjects = data_matrix.len();
        let n_vars = var_names.len();

        if n_subjects < 2 || n_vars < 2 {
            continue; // Not enough data for the test
        }

        let mut matrix = DMatrix::zeros(n_subjects, n_vars);
        for (i, row) in data_matrix.iter().enumerate() {
            for (j, &val) in row.iter().enumerate() {
                matrix[(i, j)] = val;
            }
        }

        // Calculate covariance matrix.
        // Compute column means then broadcast-subtract — the previous
        // ones * means' construction had mismatched dimensions.
        let col_means: Vec<f64> = (0..n_vars)
            .map(|j| {
                (0..n_subjects).map(|i| matrix[(i, j)]).sum::<f64>()
                    / (n_subjects as f64)
            })
            .collect();
        let mut centered = matrix.clone();
        for i in 0..n_subjects {
            for j in 0..n_vars {
                centered[(i, j)] -= col_means[j];
            }
        }

        let cov_matrix = (centered.transpose() * &centered) / ((n_subjects - 1) as f64);

        // Apply orthonormal within-subjects contrast (Helmert) to get the
        // (k-1)×(k-1) transformed covariance Σ_t. Mauchly's W and the
        // Greenhouse-Geisser ε are invariant under the choice of orthonormal
        // contrast, so this matches SPSS exactly.
        let k = n_vars;
        let p_dim = k - 1;
        let contrast_matrix = build_orthonormal_contrast(k);
        let contrast_t = contrast_matrix.transpose();
        let transformed_cov = &contrast_matrix * &cov_matrix * &contrast_t;
        // Symmetrize to clean up floating-point noise.
        let sym_t = (transformed_cov.clone() + transformed_cov.transpose()) / 2.0;

        // Mauchly's W = |Σ_t| / (tr(Σ_t)/p)^p, where p = k-1.
        // Use direct LU determinant and direct trace — eigenvalue products
        // accumulate rounding error (~1e-10) which can shift the chi-square
        // and p-value at the 4th decimal.
        let det_t = sym_t.determinant();
        let trace_t = sym_t.trace();
        let mean_eig = trace_t / (p_dim as f64);
        let mauchly_w = if mean_eig.abs() < 1e-12 {
            0.0
        } else {
            det_t / mean_eig.powi(p_dim as i32)
        };

        // Eigenvalues of Σ_t — only needed for the Greenhouse-Geisser ε.
        let eig = nalgebra::SymmetricEigen::new(sym_t.clone());
        let eigenvalues: Vec<f64> = eig.eigenvalues.iter().copied().collect();

        // Approximate chi-square with the standard correction:
        //   χ² = -(n - 1 - (2p² + p + 2)/(6p)) · ln(W)
        // (Mauchly 1940; reproduced in IBM SPSS Algorithms manual.)
        let n = n_subjects as f64;
        let p_f = p_dim as f64;
        let correction = (2.0 * p_f * p_f + p_f + 2.0) / (6.0 * p_f);
        let chi_square = if mauchly_w > 0.0 {
            -(n - 1.0 - correction) * mauchly_w.ln()
        } else {
            f64::INFINITY
        };

        // df for χ²: p(p+1)/2 - 1 (same as k(k-1)/2 - 1 with p = k-1)
        let df = p_dim * (p_dim + 1) / 2 - 1;

        let chi_squared_dist = ChiSquared::new(df as f64).map_err(|e| e.to_string())?;
        let significance = if chi_square.is_finite() {
            1.0 - chi_squared_dist.cdf(chi_square)
        } else {
            0.0
        };

        // Greenhouse-Geisser ε = (Σλᵢ)² / (p · Σλᵢ²) using the true
        // eigenvalues of Σ_t.
        let sum_eig: f64 = eigenvalues.iter().sum();
        let sum_sq_eig: f64 = eigenvalues.iter().map(|&e| e * e).sum();
        let greenhouse_geisser_epsilon = if sum_sq_eig < 1e-12 {
            1.0
        } else {
            (sum_eig * sum_eig) / (p_f * sum_sq_eig)
        };

        // Huynh-Feldt ε: (n·p·ε_GG - 2) / (p·(n - 1 - p·ε_GG)), capped at 1.
        let huynh_feldt_epsilon = if n_subjects <= k {
            greenhouse_geisser_epsilon.min(1.0)
        } else {
            let num = n * p_f * greenhouse_geisser_epsilon - 2.0;
            let den = p_f * (n - 1.0 - p_f * greenhouse_geisser_epsilon);
            if den.abs() < 1e-12 {
                greenhouse_geisser_epsilon.min(1.0)
            } else {
                (num / den).min(1.0).max(greenhouse_geisser_epsilon)
            }
        };

        // Lower bound ε = 1/(k-1)
        let lower_bound_epsilon = 1.0 / p_f;

        // Within-subjects effect name (e.g., "perlakuan") is read from the
        // factor_values populated by parse_within_subject_factors. The map
        // key (factor_name) is actually the *measure* name (e.g.,
        // "perlakuan_anjing") — keep that as the HashMap key and let the
        // formatter look up the measure separately.
        let ws_factor_name = factors[0]
            .factor_values
            .keys()
            .next()
            .cloned()
            .unwrap_or_else(|| factor_name.clone());

        let test_entry = MauchlyTestEntry {
            effect: ws_factor_name.clone(),
            mauchly_w,
            chi_square: if chi_square.is_finite() { chi_square } else { 0.0 },
            df,
            significance,
            greenhouse_geisser_epsilon,
            huynh_feldt_epsilon,
            lower_bound_epsilon,
        };

        tests.insert(ws_factor_name, test_entry);

        // Design line: SPSS reports e.g. "Design: Intercept; Within Subjects
        // Design: perlakuan".
        if design.is_none() {
            let ws_design = factors[0]
                .factor_values
                .keys()
                .next()
                .cloned()
                .unwrap_or_else(|| "within-subjects".to_string());
            design = Some(ws_design);
        }
    }

    // Add a note about interpretation
    let note = Some(
        "Tests the null hypothesis that the error covariance matrix of the orthonormalized transformed dependent variables is proportional to an identity matrix.".to_string()
    );

    Ok(MauchlyTest {
        tests,
        design,
        note,
    })
}
