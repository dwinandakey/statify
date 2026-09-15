// perbaikan BISA 

use std::collections::HashMap;
use nalgebra::DMatrix;
use crate::models::{
    config::{ExtractionMethod, FactorAnalysisConfig},
    data::AnalysisData,
    result::{
        ComponentTransformationMatrix,
        ExtractionResult,
        RotationResult,
    },
};

use super::core::{ calculate_matrix, extract_data_matrix, extract_factors };

// Rotate factors using specified method
pub fn rotate_factors(
    extraction_result: &ExtractionResult,
    config: &FactorAnalysisConfig
) -> Result<RotationResult, String> {
    if config.rotation.none {
        // No rotation, return original loadings
        return Ok(RotationResult {
            rotated_loadings: extraction_result.loadings.clone(),
            transformation_matrix: DMatrix::identity(
                extraction_result.n_factors,
                extraction_result.n_factors
            ),
            factor_correlations: None,
            iterations_required: 0,
            is_converged: true,
            convergence_value: 0.0,
        });
    }

    if config.rotation.varimax {
        rotate_varimax(extraction_result, config)
    } else if config.rotation.quartimax {
        rotate_quartimax(extraction_result, config)
    } else if config.rotation.equimax {
        rotate_equimax(extraction_result, config)
    } else if config.rotation.oblimin {
        rotate_oblimin(extraction_result, config)
    } else if config.rotation.promax {
        rotate_promax(extraction_result, config)
    } else {
        // Default to varimax
        rotate_varimax(extraction_result, config)
    }
}

// Varimax rotation 
pub fn rotate_varimax(
    extraction_result: &ExtractionResult,
    config: &FactorAnalysisConfig
) -> Result<RotationResult, String> {

    let is_pca = matches!(config.extraction.method, ExtractionMethod::PrincipalComponents);

    // Varimax is defined on standardized loadings. For covariance extraction,
    // convert the rotated solution back to raw units only after rotation.
    let mut processed_loadings = extraction_result
        .standardized_loadings
        .as_ref()
        .unwrap_or(&extraction_result.loadings)
        .clone();
    let n_rows = processed_loadings.nrows(); 
    let n_cols = processed_loadings.ncols(); 

    // =========================================================
    // 0. PRE-PROCESS: Standardize Unrotated Signs
    // =========================================================
    for j in 0..n_cols {
        let mut col_sum = 0.0;
        for i in 0..n_rows {
            col_sum += processed_loadings[(i, j)];
        }
        
        if col_sum < 0.0 {
            for i in 0..n_rows {
                processed_loadings[(i, j)] *= -1.0;
            }
        }
    }

    let loadings = &processed_loadings;

    // =========================================================
    // 1. Kaiser normalization
    // =========================================================
    let mut h = vec![0.0; n_rows];
    let mut normalized_loadings = loadings.clone();

    for i in 0..n_rows {
        let mut ss = 0.0;
        for j in 0..n_cols {
            ss += loadings[(i, j)] * loadings[(i, j)];
        }
        h[i] = ss.sqrt().max(1e-12); // avoid divide by zero
        for j in 0..n_cols {
            normalized_loadings[(i, j)] /= h[i];
        }
    }

    // =========================================================
    // 2. Initialize rotation matrix
    // =========================================================
    let mut transformation_matrix = DMatrix::<f64>::identity(n_cols, n_cols);

    let max_iterations = if config.rotation.max_iter > 0 {
        config.rotation.max_iter as usize
    } else {
        25
    };

    // let tol = if is_pca { 1e-5 } else { 1e-7 };
    // let criterion_tol = if is_pca { 1e-8 } else { 1e-10 };
    let tol = if is_pca { 1e-4 } else { 1e-7 };
    let _criterion_tol = if is_pca { 1e-5 } else { 1e-10 };
    let p = n_rows as f64;

    let compute_varimax_criterion = |lambda: &DMatrix<f64>| -> f64 {
        let mut criterion = 0.0;
        for j in 0..n_cols {
            let mut sum_sq = 0.0;
            let mut sum_four = 0.0;
            for i in 0..n_rows {
                let v = lambda[(i, j)];
                let v2 = v * v;
                sum_sq += v2;
                sum_four += v2 * v2;
            }
            criterion += sum_four - (sum_sq * sum_sq) / p;
        }
        criterion
    };

    let mut previous_criterion = compute_varimax_criterion(&normalized_loadings);
    
    // Tracking Variables
    let mut iterations_required = 0;
    let mut is_converged = false;
    let mut final_convergence = 0.0;
    let mut confirmation_sweep = false;

    // =========================================================
    // 3. SPSS-like pairwise varimax (orthomax gamma=1)
    // =========================================================
    for _ in 0..max_iterations {
        iterations_required += 1;
        let mut max_angle: f64 = 0.0;

        for a in 0..n_cols.saturating_sub(1) {
            for b in (a + 1)..n_cols {
                let mut sum_u = 0.0;
                let mut sum_v = 0.0;
                let mut sum_u2_minus_v2 = 0.0;
                let mut sum_2uv = 0.0;

                for i in 0..n_rows {
                    let x = normalized_loadings[(i, a)];
                    let y = normalized_loadings[(i, b)];
                    let u = x * x - y * y;
                    let v = 2.0 * x * y;

                    sum_u += u;
                    sum_v += v;
                    sum_u2_minus_v2 += u * u - v * v;
                    sum_2uv += 2.0 * u * v;
                }

                let numerator = sum_2uv - (2.0 / p) * sum_u * sum_v;
                let denominator = sum_u2_minus_v2 - (sum_u * sum_u - sum_v * sum_v) / p;
                let phi = 0.25 * numerator.atan2(denominator);
                max_angle = max_angle.max(phi.abs());

                if phi.abs() > tol {
                    let c = phi.cos();
                    let s = phi.sin();

                    for i in 0..n_rows {
                        let xa = normalized_loadings[(i, a)];
                        let xb = normalized_loadings[(i, b)];
                        normalized_loadings[(i, a)] = c * xa + s * xb;
                        normalized_loadings[(i, b)] = -s * xa + c * xb;
                    }

                    for i in 0..n_cols {
                        let ta = transformation_matrix[(i, a)];
                        let tb = transformation_matrix[(i, b)];
                        transformation_matrix[(i, a)] = c * ta + s * tb;
                        transformation_matrix[(i, b)] = -s * ta + c * tb;
                    }
                }
            }
        }

    let current_criterion = compute_varimax_criterion(&normalized_loadings);
        let _criterion_change = (current_criterion - previous_criterion).abs();
        previous_criterion = current_criterion;

        // Untuk algoritma Jacobi, nilai yang dilaporkan adalah 
        // Maximum Absolute Rotation Angle, bukan Criterion Change
        final_convergence = max_angle; 

        let criteria_met = max_angle < tol; 
        
        if criteria_met {
            if confirmation_sweep {
                is_converged = true;
                break;
            }
            confirmation_sweep = true;
        } else {
            confirmation_sweep = false;
        }
    }


    // =========================================================
    // 4. De-normalize rotated standardized loadings
    // =========================================================
    let mut standardized_rotated_loadings = normalized_loadings.clone();
    for i in 0..n_rows {
        for j in 0..n_cols {
            standardized_rotated_loadings[(i, j)] *= h[i];
        }
    }

    let mut rotated_loadings = standardized_rotated_loadings.clone();
    if let Some(standard_deviations) = &extraction_result.standard_deviations {
        for i in 0..n_rows {
            for j in 0..n_cols {
                rotated_loadings[(i, j)] *= standard_deviations[i];
            }
        }
    }

    // =========================================================
    // 5. SPSS-style sign reflection (Fix Rotated Columns)
    // =========================================================
    for j in 0..n_cols {
        if standardized_rotated_loadings[(0, j)] < 0.0 {
            for i in 0..n_rows {
                rotated_loadings[(i, j)] *= -1.0;
                standardized_rotated_loadings[(i, j)] *= -1.0;
            }
            for i in 0..n_cols {
                transformation_matrix[(i, j)] *= -1.0;
            }
        }
    }

    // =========================================================
    // 6. SORT COMPONENTS BY VARIANCE (SPSS STYLE)
    // =========================================================
    let mut col_variances: Vec<(usize, f64)> = (0..n_cols)
        .map(|j| {
            let ssl: f64 = (0..n_rows)
                .map(|i| standardized_rotated_loadings[(i, j)].powi(2))
                .sum();
            (j, ssl)
        })
        .collect();

    col_variances.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    let mut sorted_loadings = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut sorted_transform = DMatrix::<f64>::zeros(n_cols, n_cols);

    for (new_col_idx, (old_col_idx, _)) in col_variances.iter().enumerate() {
        for i in 0..n_rows {
            sorted_loadings[(i, new_col_idx)] = rotated_loadings[(i, *old_col_idx)];
        }
        for i in 0..n_cols {
            sorted_transform[(i, new_col_idx)] = transformation_matrix[(i, *old_col_idx)];
        }
    }

    Ok(RotationResult {
        rotated_loadings: sorted_loadings,
        transformation_matrix: sorted_transform,
        factor_correlations: None, 
        iterations_required,
        is_converged,
        convergence_value: final_convergence,
    })
}

pub fn rotate_quartimax(
    extraction_result: &ExtractionResult,
    config: &FactorAnalysisConfig
) -> Result<RotationResult, String> {

    let loadings = &extraction_result.loadings;
    let n_rows = loadings.nrows();
    let n_cols = loadings.ncols();

    let mut h = vec![0.0; n_rows];
    let mut normalized_loadings = loadings.clone();

    for i in 0..n_rows {
        let mut ss = 0.0;
        for j in 0..n_cols {
            ss += loadings[(i, j)].powi(2);
        }
        h[i] = ss.sqrt().max(1e-12);
        for j in 0..n_cols {
            normalized_loadings[(i, j)] /= h[i];
        }
    }

    let gamma = 0.0_f64; 
    let p_f64 = n_rows as f64;
    let max_iterations = config.rotation.max_iter as usize;
    // let tol = 1e-6;
    let tol = 1e-4;

    let mut transformation_matrix = DMatrix::<f64>::identity(n_cols, n_cols);
    let mut rotated_normalized = normalized_loadings.clone();

    let mut iterations_required = 0;
    let mut is_converged = false;
    let mut final_convergence = 0.0;
    let mut confirmation_sweep = false;

    for _ in 0..max_iterations {
        iterations_required += 1;
        let mut max_angle = 0.0_f64;

        for j in 0..n_cols {
            for k in (j + 1)..n_cols {
                let mut a = 0.0;
                let mut b = 0.0;
                let mut c = 0.0;
                let mut d = 0.0;

                for i in 0..n_rows {
                    let x = rotated_normalized[(i, j)];
                    let y = rotated_normalized[(i, k)];
                    
                    let u = x.powi(2) - y.powi(2);
                    let v = 2.0 * x * y;

                    a += u;
                    b += v;
                    c += u.powi(2) - v.powi(2);
                    d += 2.0 * u * v;
                }

                let num = d - (2.0 * gamma * a * b) / p_f64;
                let den = c - (gamma * (a.powi(2) - b.powi(2))) / p_f64;
                
                let phi = num.atan2(den);
                let angle = phi / 4.0;

                max_angle = max_angle.max(angle.abs());

                if angle.abs() > 1e-6 {
                    let cos_t = angle.cos();
                    let sin_t = angle.sin();

                    for i in 0..n_rows {
                        let x = rotated_normalized[(i, j)];
                        let y = rotated_normalized[(i, k)];
                        rotated_normalized[(i, j)] = x * cos_t + y * sin_t;
                        rotated_normalized[(i, k)] = -x * sin_t + y * cos_t;
                    }

                    for i in 0..n_cols {
                        let tx = transformation_matrix[(i, j)];
                        let ty = transformation_matrix[(i, k)];
                        transformation_matrix[(i, j)] = tx * cos_t + ty * sin_t;
                        transformation_matrix[(i, k)] = -tx * sin_t + ty * cos_t;
                    }
                }
            }
        }

        final_convergence = max_angle;
        if max_angle < tol {
            if confirmation_sweep {
                is_converged = true;
                break;
            }
            confirmation_sweep = true;
        } else {
            confirmation_sweep = false;
        }
    }

    let mut rotated_loadings = rotated_normalized;
    for i in 0..n_rows {
        for j in 0..n_cols {
            rotated_loadings[(i, j)] *= h[i];
        }
    }

    for j in 0..n_cols {
        let mut sum = 0.0;
        for i in 0..n_rows {
            sum += rotated_loadings[(i, j)];
        }
        if sum < 0.0 {
            for i in 0..n_rows {
                rotated_loadings[(i, j)] *= -1.0;
            }
            for i in 0..n_cols {
                transformation_matrix[(i, j)] *= -1.0;
            }
        }
    }

    Ok(RotationResult {
        rotated_loadings,
        transformation_matrix,
        factor_correlations: None,
        iterations_required,
        is_converged,
        convergence_value: final_convergence,
    })
}

pub fn rotate_equimax(
    extraction_result: &ExtractionResult,
    config: &FactorAnalysisConfig
) -> Result<RotationResult, String> {

    let loadings = &extraction_result.loadings;
    let n_rows = loadings.nrows();
    let n_cols = loadings.ncols();

    let mut h = vec![0.0; n_rows];
    let mut normalized_loadings = loadings.clone();

    for i in 0..n_rows {
        let mut ss = 0.0;
        for j in 0..n_cols {
            ss += loadings[(i, j)].powi(2);
        }
        h[i] = ss.sqrt().max(1e-12);
        for j in 0..n_cols {
            normalized_loadings[(i, j)] /= h[i];
        }
    }

    let gamma = n_cols as f64 / 2.0; 
    let p_f64 = n_rows as f64;
    let max_iterations = config.rotation.max_iter as usize;
    // let tol = 1e-6;
    let tol = 1e-4;

    let mut transformation_matrix = DMatrix::<f64>::identity(n_cols, n_cols);
    let mut rotated_normalized = normalized_loadings.clone();

    let mut iterations_required = 0;
    let mut is_converged = false;
    let mut final_convergence = 0.0;
    let mut confirmation_sweep = false;

    for _ in 0..max_iterations {
        iterations_required += 1;
        let mut max_angle = 0.0_f64;

        for j in 0..n_cols {
            for k in (j + 1)..n_cols {
                let mut a = 0.0;
                let mut b = 0.0;
                let mut c = 0.0;
                let mut d = 0.0;

                for i in 0..n_rows {
                    let x = rotated_normalized[(i, j)];
                    let y = rotated_normalized[(i, k)];
                    
                    let u = x.powi(2) - y.powi(2);
                    let v = 2.0 * x * y;

                    a += u;
                    b += v;
                    c += u.powi(2) - v.powi(2);
                    d += 2.0 * u * v;
                }

                let num = d - (2.0 * gamma * a * b) / p_f64;
                let den = c - (gamma * (a.powi(2) - b.powi(2))) / p_f64;
                
                let phi = num.atan2(den);
                let angle = phi / 4.0;

                max_angle = max_angle.max(angle.abs());

                if angle.abs() > 1e-6 {
                    let cos_t = angle.cos();
                    let sin_t = angle.sin();

                    for i in 0..n_rows {
                        let x = rotated_normalized[(i, j)];
                        let y = rotated_normalized[(i, k)];
                        rotated_normalized[(i, j)] = x * cos_t + y * sin_t;
                        rotated_normalized[(i, k)] = -x * sin_t + y * cos_t;
                    }

                    for i in 0..n_cols {
                        let tx = transformation_matrix[(i, j)];
                        let ty = transformation_matrix[(i, k)];
                        transformation_matrix[(i, j)] = tx * cos_t + ty * sin_t;
                        transformation_matrix[(i, k)] = -tx * sin_t + ty * cos_t;
                    }
                }
            }
        }
        
        final_convergence = max_angle;
        if max_angle < tol {
            if confirmation_sweep {
                is_converged = true;
                break;
            }
            confirmation_sweep = true;
        } else {
            confirmation_sweep = false;
        }
    }

    let mut rotated_loadings = rotated_normalized;
    for i in 0..n_rows {
        for j in 0..n_cols {
            rotated_loadings[(i, j)] *= h[i];
        }
    }

    for j in 0..n_cols {
        let mut sum = 0.0;
        for i in 0..n_rows {
            sum += rotated_loadings[(i, j)];
        }
        if sum < 0.0 {
            for i in 0..n_rows {
                rotated_loadings[(i, j)] *= -1.0;
            }
            for i in 0..n_cols {
                transformation_matrix[(i, j)] *= -1.0;
            }
        }
    }

    // SPSS orders covariance-based rotated components by the rescaled
    // (standardized) sums of squared loadings, not by raw-unit magnitudes.
    // Keep the transformation matrix aligned with that same permutation.
    let mut column_order: Vec<(usize, f64)> = (0..n_cols)
        .map(|j| {
            let sum_of_squared_loadings = (0..n_rows)
                .map(|i| {
                    let loading = if let Some(standard_deviations) = &extraction_result.standard_deviations {
                        rotated_loadings[(i, j)] / standard_deviations[i].max(1e-12)
                    } else {
                        rotated_loadings[(i, j)]
                    };
                    loading.powi(2)
                })
                .sum();
            (j, sum_of_squared_loadings)
        })
        .collect();
    column_order.sort_by(|a, b| {
        b.1.partial_cmp(&a.1)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut sorted_loadings = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut sorted_transformation = DMatrix::<f64>::zeros(n_cols, n_cols);
    for (new_column, (old_column, _)) in column_order.iter().enumerate() {
        for i in 0..n_rows {
            sorted_loadings[(i, new_column)] = rotated_loadings[(i, *old_column)];
        }
        for i in 0..n_cols {
            sorted_transformation[(i, new_column)] =
                transformation_matrix[(i, *old_column)];
        }
    }

    Ok(RotationResult {
        rotated_loadings: sorted_loadings,
        transformation_matrix: sorted_transformation,
        factor_correlations: None,
        iterations_required,
        is_converged,
        convergence_value: final_convergence,
    })
}


// =========================================================
// HELPER: Direct Oblimin Objective & Gradient
// Menggunakan parameter L (Pattern Matrix) secara langsung
// =========================================================
fn compute_oblimin_obj_grad_l(
    l_mat: &DMatrix<f64>,
    gamma: f64
) -> (f64, DMatrix<f64>) {
    let n_rows = l_mat.nrows();
    let n_cols = l_mat.ncols();

    // C = L \circ L (Loadings dikuadratkan)
    let mut c_mat = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut col_sums = vec![0.0; n_cols];

    for j in 0..n_cols {
        for i in 0..n_rows {
            let v = l_mat[(i, j)].powi(2);
            c_mat[(i, j)] = v;
            col_sums[j] += v;
        }
    }

    // M * C = C_ij - (gamma / p) * sum(C_j)
    let mut mc_mat = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut mc_row_sums = vec![0.0; n_rows];
    let gamma_p = gamma / (n_rows as f64);

    for i in 0..n_rows {
        for j in 0..n_cols {
            let v = c_mat[(i, j)] - gamma_p * col_sums[j];
            mc_mat[(i, j)] = v;
            mc_row_sums[i] += v;
        }
    }

    // Hitung Gradient w.r.t L dan Objective Function
    let mut dq = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut obj = 0.0;

    for i in 0..n_rows {
        for j in 0..n_cols {
            let mcn_ij = mc_row_sums[i] - mc_mat[(i, j)];
            dq[(i, j)] = l_mat[(i, j)] * mcn_ij;
            obj += c_mat[(i, j)] * mcn_ij;
        }
    }

    (obj / 4.0, dq)
}

// =========================================================
// Direct Oblimin Rotation 
// =========================================================
pub fn rotate_oblimin(
    extraction_result: &ExtractionResult,
    config: &FactorAnalysisConfig
) -> Result<RotationResult, String> {
    
    let unrotated_loadings = extraction_result
        .standardized_loadings
        .as_ref()
        .unwrap_or(&extraction_result.loadings);
    let n_rows = unrotated_loadings.nrows();
    let n_cols = unrotated_loadings.ncols();
    let gamma = config.rotation.delta; 

    let start_t = DMatrix::<f64>::identity(n_cols, n_cols);

    // Kaiser Normalization
    let mut h = vec![0.0; n_rows];
    let mut a_mat = unrotated_loadings.clone(); 
    for i in 0..n_rows {
        let mut ss = 0.0;
        for j in 0..n_cols {
            ss += unrotated_loadings[(i, j)].powi(2);
        }
        h[i] = ss.sqrt().max(1e-12); 
        for j in 0..n_cols {
            a_mat[(i, j)] /= h[i];
        }
    }

    let mut t_mat = start_t; 
    let max_iter = if config.rotation.max_iter > 0 {
        config.rotation.max_iter as usize
    } else {
        250
    };
    
    // =========================================================
    // STRATEGI DUAL TOLERANCE
    // =========================================================
    let tol_spss = 1e-4;     // Toleransi description di UI (Footnote iterasi)
    let tol_compute = 1e-11; // Toleransi komputasi dalam (Presisi matriks)

    let mut iterations_reported = 0;
    let mut true_iterations = 0;
    let mut spss_iterations_found = false;
    let mut is_converged = false;
    
    let mut final_convergence = 0.0;

    let t_inv_init = t_mat.clone().try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
    let mut l_mat = &a_mat * t_inv_init.transpose();
    let (mut current_obj, mut g_q) = compute_oblimin_obj_grad_l(&l_mat, gamma);

    let mut alpha = 1.0;

    for _iter in 0..max_iter {
        true_iterations += 1;
        
        let t_inv = t_mat.clone().try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
        let g = -1.0 * (l_mat.transpose() * &g_q * &t_inv).transpose();

        let tg = t_mat.transpose() * &g;
        let mut x_diag = DMatrix::<f64>::zeros(n_cols, n_cols);
        for i in 0..n_cols { x_diag[(i, i)] = tg[(i, i)]; }
        let gp = &g - &t_mat * &x_diag;

        let mut found = false;
        let mut best_t = t_mat.clone();
        let mut best_obj = current_obj;

        alpha *= 2.0;

        for _s in 0..15 {
            let mut t_new = &t_mat - alpha * &gp;
            
            let mut scale_diag = DMatrix::<f64>::zeros(n_cols, n_cols);
            for j in 0..n_cols {
                let mut col_sq_sum = 0.0;
                for i in 0..n_cols { col_sq_sum += t_new[(i, j)].powi(2); }
                scale_diag[(j, j)] = 1.0 / col_sq_sum.sqrt().max(1e-12);
            }
            t_new = t_new * scale_diag;

            let t_new_inv = t_new.clone().try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
            let l_new = &a_mat * t_new_inv.transpose();
            let (obj_new, g_q_new) = compute_oblimin_obj_grad_l(&l_new, gamma);
            
            let mut diff_tr = 0.0;
            let t_diff = &t_mat - &t_new;
            let gp_t_diff = gp.transpose() * t_diff;
            for i in 0..n_cols { diff_tr += gp_t_diff[(i, i)]; }

            if !obj_new.is_nan() && obj_new < current_obj - 0.5 * diff_tr {
                best_obj = obj_new;
                best_t = t_new;
                g_q = g_q_new; 
                l_mat = l_new; 
                found = true;
                break;
            }
            alpha *= 0.5; 
        }

        if found {
            let obj_change = (current_obj - best_obj).abs();
            final_convergence = obj_change;
            
            t_mat = best_t;
            current_obj = best_obj;
            
            // 1. KUNCI ITERASI: Ambil foto jumlah iterasi saat perubahan < 1e-4
            if obj_change < tol_spss && !spss_iterations_found {
                iterations_reported = true_iterations;
                spss_iterations_found = true;
            }
            
            // 2. LANJUTKAN KOMPUTASI: Jangan berhenti sampai matriks mencapai 1e-11
            if obj_change < tol_compute {
                if !spss_iterations_found {
                    iterations_reported = true_iterations;
                }
                is_converged = true;
                break;
            }
        } else {
            if !spss_iterations_found {
                iterations_reported = true_iterations;
            }
            is_converged = true;
            break;
        }
    }

    let t_inv_final = t_mat.clone().try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
    let t_spss = t_inv_final.transpose();

    let l_final = &a_mat * &t_spss;
    let mut standardized_pattern = DMatrix::<f64>::zeros(n_rows, n_cols);
    for i in 0..n_rows {
        for j in 0..n_cols {
            standardized_pattern[(i, j)] = l_final[(i, j)] * h[i];
        }
    }

    let mut pattern = standardized_pattern.clone();
    if let Some(standard_deviations) = &extraction_result.standard_deviations {
        for i in 0..n_rows {
            for j in 0..n_cols {
                pattern[(i, j)] *= standard_deviations[i];
            }
        }
    }

    let mut phi = t_mat.transpose() * &t_mat;
    for i in 0..n_cols { phi[(i, i)] = 1.0; } 

    let mut col_stats: Vec<(usize, f64)> = (0..n_cols)
        .map(|j| {
            let ssl: f64 = (0..n_rows)
                .map(|i| standardized_pattern[(i, j)].powi(2))
                .sum();
            (j, ssl)
        })
        .collect();

    col_stats.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let new_indices: Vec<usize> = col_stats.iter().map(|x| x.0).collect();

    let mut sorted_pattern = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut sorted_t = DMatrix::<f64>::zeros(n_cols, n_cols);
    let mut sorted_standardized_pattern = DMatrix::<f64>::zeros(n_rows, n_cols);
    
    for (new_idx, &old_idx) in new_indices.iter().enumerate() {
        for i in 0..n_rows { sorted_pattern[(i, new_idx)] = pattern[(i, old_idx)]; }
        for i in 0..n_cols { sorted_t[(i, new_idx)] = t_spss[(i, old_idx)]; }
        for i in 0..n_rows { sorted_standardized_pattern[(i, new_idx)] = standardized_pattern[(i, old_idx)]; }
    }

    let mut sorted_phi = DMatrix::<f64>::zeros(n_cols, n_cols);
    for (new_row, &old_row) in new_indices.iter().enumerate() {
        for (new_col, &old_col) in new_indices.iter().enumerate() {
            sorted_phi[(new_row, new_col)] = phi[(old_row, old_col)];
        }
    }

    for j in 0..n_cols {
        let sign_reference = if config.extraction.covariance {
            // For covariance extraction, retain the established SPSS
            // orientation based on the first variable in each component.
            0
        } else {
            // Correlation extraction uses the dominant standardized loading
            // to reproduce SPSS's component sign convention.
            (0..n_rows)
                .max_by(|&left, &right| {
                    sorted_standardized_pattern[(left, j)]
                        .abs()
                        .partial_cmp(&sorted_standardized_pattern[(right, j)].abs())
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .unwrap_or(0)
        };

        if sorted_standardized_pattern[(sign_reference, j)] < 0.0 {
            for i in 0..n_rows {
                sorted_pattern[(i, j)] *= -1.0;
                sorted_standardized_pattern[(i, j)] *= -1.0;
            }
            for i in 0..n_cols { sorted_t[(i, j)] *= -1.0; }
            for k in 0..n_cols {
                if k != j {
                    sorted_phi[(j, k)] *= -1.0;
                    sorted_phi[(k, j)] *= -1.0;
                }
            }
        }
    }

    Ok(RotationResult {
        rotated_loadings: sorted_pattern,
        transformation_matrix: sorted_t,
        factor_correlations: Some(sorted_phi),
        iterations_required: iterations_reported, // Output akan menunjukkan iterasi ke-2
        is_converged, 
        convergence_value: final_convergence,
    })
}




// =========================================================
// Promax Rotation
// =========================================================
pub fn rotate_promax(
    extraction_result: &ExtractionResult,
    config: &FactorAnalysisConfig
) -> Result<RotationResult, String> {

    let varimax_result = rotate_varimax(extraction_result, config)?;
    let t_varimax = &varimax_result.transformation_matrix;

    let unrotated = &extraction_result.loadings;
    let n_rows = unrotated.nrows();
    let n_cols = unrotated.ncols();
    let kappa = if config.rotation.kappa > 0 { config.rotation.kappa as f64 } else { 4.0 };

    // 1. Kaiser Normalization
    let mut h = vec![0.0; n_rows];
    let mut lambda_norm = DMatrix::<f64>::zeros(n_rows, n_cols);
    for i in 0..n_rows {
        let mut ss = 0.0;
        for j in 0..n_cols {
            ss += unrotated[(i, j)].powi(2);
        }
        h[i] = ss.sqrt().max(1e-12);
        for j in 0..n_cols {
            lambda_norm[(i, j)] = unrotated[(i, j)] / h[i];
        }
    }

    // 2. Normalized Varimax Pattern
    let v_norm = &lambda_norm * t_varimax;

    // 3. Asymmetric Target Matrix (from Normalized Varimax)
    let mut target = DMatrix::<f64>::zeros(n_rows, n_cols);
    for i in 0..n_rows {
        for j in 0..n_cols {
            let v = v_norm[(i, j)];
            target[(i, j)] = v.signum() * v.abs().powf(kappa);
        }
    }

    // 4. OLS Regression (Harus pada Normalized metric!)
    let vt = v_norm.transpose();
    let vtv = &vt * &v_norm;
    let vtb = &vt * &target;
    let w_mat = vtv.try_inverse().ok_or("Promax: singular regression matrix")? * vtb;

    // 5. Column Normalization
    let wtw = w_mat.transpose() * &w_mat;
    let wtw_inv = wtw.try_inverse().ok_or("Promax: singular W'W matrix")?;
    let mut d_mat = DMatrix::<f64>::zeros(n_cols, n_cols);
    for j in 0..n_cols {
        d_mat[(j, j)] = wtw_inv[(j, j)].sqrt();
    }

    let t_promax = w_mat * d_mat;
    let mut t_full = t_varimax * &t_promax;

    // 6. Factor Correlation Matrix
    let t_inv = t_full.clone().try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
    let mut phi = &t_inv * t_inv.transpose();
    for i in 0..n_cols { phi[(i, i)] = 1.0; }

    // 7. Raw Pattern Matrix
    let mut pattern = unrotated * &t_full;

    // 8. Sign Reflection
    for j in 0..n_cols {
        let mut sum = 0.0;
        for i in 0..n_rows {
            sum += pattern[(i, j)];
        }
        if sum < 0.0 {
            for i in 0..n_rows { pattern[(i, j)] *= -1.0; }
            for k in 0..n_cols { t_full[(k, j)] *= -1.0; }
            for k in 0..n_cols {
                if k != j {
                    phi[(j, k)] *= -1.0;
                    phi[(k, j)] *= -1.0;
                }
            }
        }
    }

    // 9. Sort by Sum of Squared Loadings
    let mut ordering: Vec<(usize, f64)> = (0..n_cols)
        .map(|j| {
            let ss: f64 = (0..n_rows).map(|i| pattern[(i, j)].powi(2)).sum();
            (j, ss)
        })
        .collect();
    ordering.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let indices: Vec<usize> = ordering.iter().map(|x| x.0).collect();

    let mut sorted_pattern = DMatrix::<f64>::zeros(n_rows, n_cols);
    let mut sorted_t = DMatrix::<f64>::zeros(n_cols, n_cols);
    let mut sorted_phi = DMatrix::<f64>::zeros(n_cols, n_cols);

    for (new_col, &old_col) in indices.iter().enumerate() {
        for i in 0..n_rows { sorted_pattern[(i, new_col)] = pattern[(i, old_col)]; }
        for i in 0..n_cols { sorted_t[(i, new_col)] = t_full[(i, old_col)]; }
    }
    for (new_row, &old_row) in indices.iter().enumerate() {
        for (new_col, &old_col) in indices.iter().enumerate() {
            sorted_phi[(new_row, new_col)] = phi[(old_row, old_col)];
        }
    }

    Ok(RotationResult {
        rotated_loadings: sorted_pattern,
        transformation_matrix: sorted_t,
        factor_correlations: Some(sorted_phi),
        iterations_required: varimax_result.iterations_required,
        is_converged: varimax_result.is_converged,
        convergence_value: varimax_result.convergence_value,
    })
}


pub fn calculate_component_transformation_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ComponentTransformationMatrix, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let base_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
    let rotation_result = rotate_factors(&extraction_result, config)?;

    // Create component transformation matrix directly
    let transformation_matrix = &rotation_result.transformation_matrix;
    let n_rows = transformation_matrix.nrows();
    let n_cols = transformation_matrix.ncols();

    let mut components = Vec::with_capacity(n_rows);

    for i in 0..n_rows {
        let mut row = Vec::with_capacity(n_cols);

        for j in 0..n_cols {
            row.push(transformation_matrix[(i, j)]);
        }

        components.push(row);
    }

    Ok(ComponentTransformationMatrix { components })
}

use crate::models::result::{PatternMatrix, StructureMatrix, ComponentCorrelationMatrix, RotatedComponentMatrix};

pub fn calculate_pattern_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<PatternMatrix, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let base_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
    let rotation_result = rotate_factors(&extraction_result, config)?;

    let mut components = HashMap::new();
    let pattern_loadings = &rotation_result.rotated_loadings;
    let n_rows = pattern_loadings.nrows();
    let n_cols = pattern_loadings.ncols();

    for (i, var_name) in var_names.iter().enumerate() {
        if i < n_rows {
            let mut loadings = Vec::with_capacity(n_cols);

            for j in 0..n_cols {
                loadings.push(pattern_loadings[(i, j)]);
            }

            components.insert(var_name.clone(), loadings);
        }
    }

    Ok(PatternMatrix {
        components,
        variable_order: var_names,
        iterations_required: rotation_result.iterations_required,
        is_converged: rotation_result.is_converged,
        convergence_value: rotation_result.convergence_value,
    })
}

pub fn calculate_structure_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<StructureMatrix, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let base_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
    let rotation_result = rotate_factors(&extraction_result, config)?;

    let pattern_loadings = &rotation_result.rotated_loadings;
    let n_rows = pattern_loadings.nrows();
    let n_cols = pattern_loadings.ncols();

    let mut structure_loadings = pattern_loadings.clone();

    if let Some(factor_correlations) = &rotation_result.factor_correlations {
        structure_loadings = pattern_loadings * factor_correlations;
    }

    let mut components = HashMap::new();

    for (i, var_name) in var_names.iter().enumerate() {
        if i < n_rows {
            let mut loadings = Vec::with_capacity(n_cols);

            for j in 0..n_cols {
                loadings.push(structure_loadings[(i, j)]);
            }

            components.insert(var_name.clone(), loadings);
        }
    }

    Ok(StructureMatrix {
        components,
        variable_order: var_names,
        iterations_required: rotation_result.iterations_required,
        is_converged: rotation_result.is_converged,
        convergence_value: rotation_result.convergence_value,
    })
}

pub fn calculate_component_correlation_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ComponentCorrelationMatrix, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let base_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
    let rotation_result = rotate_factors(&extraction_result, config)?;

    let mut correlations = Vec::new();

    if let Some(factor_corrs) = &rotation_result.factor_correlations {
        let n_cols = factor_corrs.ncols();

        for i in 0..n_cols {
            let mut row = Vec::with_capacity(n_cols);

            for j in 0..n_cols {
                row.push(factor_corrs[(i, j)]);
            }

            correlations.push(row);
        }
    }

    Ok(ComponentCorrelationMatrix {
        correlations,
    })
}

pub fn calculate_rotated_component_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<RotatedComponentMatrix, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let base_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
    let rotation_result = rotate_factors(&extraction_result, config)?;

    let mut components = HashMap::new();
    let rotated_loadings = &rotation_result.rotated_loadings;
    let n_rows = rotated_loadings.nrows();
    let n_cols = rotated_loadings.ncols();

    for (i, var_name) in var_names.iter().enumerate() {
        if i < n_rows {
            let mut loadings = Vec::with_capacity(n_cols);
            for j in 0..n_cols {
                loadings.push(rotated_loadings[(i, j)]);
            }
            components.insert(var_name.clone(), loadings);
        }
    }

    Ok(RotatedComponentMatrix {
        components,
        variable_order: var_names,
        is_converged: rotation_result.is_converged,
        iterations_required: rotation_result.iterations_required,
        convergence_value: rotation_result.convergence_value,
    })
}