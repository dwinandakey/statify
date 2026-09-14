use nalgebra::DMatrix;

use crate::models::{
    config::{ ExtractionMethod, FactorAnalysisConfig, ExtractionStatus },
    result::ExtractionResult,
};

use crate::stats::extraction_rules::*;


pub fn extract_factors(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    
    let mut result = match config.extraction.method {
        ExtractionMethod::PrincipalComponents =>
            extract_principal_components(matrix, config, var_names),
        ExtractionMethod::UnweightedLeastSquares =>
            extract_unweighted_least_squares(matrix, config, var_names),
        ExtractionMethod::GeneralizedLeastSquares =>
            extract_generalized_least_squares(matrix, config, var_names),
        ExtractionMethod::MaximumLikelihood =>
            extract_maximum_likelihood(matrix, config, var_names),
        ExtractionMethod::PrincipalAxisFactoring =>
            extract_principal_axis_factoring(matrix, config, var_names),
        ExtractionMethod::AlphaFactoring => extract_alpha_factoring(matrix, config, var_names),
        ExtractionMethod::ImageFactoring => extract_image_factoring(matrix, config, var_names),
    };

    if let Ok(ref mut res) = result {
        standardize_component_signs(&mut res.loadings); 
    }

    result
}

// --------------------------------------------------------------------------------
// DIAGNOSTIC ENGINE GATEKEEPER
// --------------------------------------------------------------------------------
fn build_extraction_result(
    loadings: DMatrix<f64>,
    eigenvalues: Vec<f64>,
    communalities: Vec<f64>,
    explained_variance: Vec<f64>,
    cumulative_variance: Vec<f64>,
    n_factors: usize,
    var_names: &[String],
    has_heywood_case: bool,
    converged: bool,
    singular_matrix: bool,
    improper_solution: bool,
) -> ExtractionResult {

    let mut result = ExtractionResult {
        loadings,
        standardized_loadings: None,
        standard_deviations: None,
        eigenvalues,
        communalities,
        explained_variance,
        cumulative_variance,
        n_factors,
        var_names: var_names.to_vec(),
        has_heywood_case,
        status: ExtractionStatus::Success, // Sesuai dengan definisi struct 
        extraction_status: ExtractionStatus::Success,
        warning_message: None,
    };

    // Evaluasi 7 State Internal   
    assign_extraction_status(
        &mut result,
        singular_matrix,
        converged,
        improper_solution,
    );
    result
}


pub fn standardize_component_signs(loadings: &mut DMatrix<f64>) {
    let (nrows, ncols) = loadings.shape();
    
    for col in 0..ncols {
        let mut max_abs_val = 0.0;
        let mut max_raw_val = 0.0;

        // Cari elemen dengan nilai absolut terbesar di dalam kolom (komponen)
        for row in 0..nrows {
            let val = loadings[(row, col)];
            if val.abs() > max_abs_val {
                max_abs_val = val.abs();
                max_raw_val = val;
            }
        }

        //  Jika elemen absolut terbesar bernilai negatif,
        // balik (flip) tanda seluruh baris di kolom tersebut.
        if max_raw_val < 0.0 {
            let mut column = loadings.column_mut(col);
            column *= -1.0;
        }
    }
}

// --------------------------------------------------------------------------------
// 1. PRINCIPAL COMPONENTS ANALYSIS (PCA)
// --------------------------------------------------------------------------------
pub fn extract_principal_components(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();
    let eigen = matrix.clone().symmetric_eigen();

    let mut indices: Vec<usize> = (0..n_vars).collect();
    indices.sort_by(|&i, &j|
        eigen.eigenvalues[j].partial_cmp(&eigen.eigenvalues[i]).unwrap_or(std::cmp::Ordering::Equal)
    );

    let mut eigenvalues = Vec::with_capacity(n_vars);
    let mut eigenvectors = DMatrix::zeros(n_vars, n_vars);

    for i in 0..n_vars {
        eigenvalues.push(eigen.eigenvalues[indices[i]]);
        for j in 0..n_vars {
            eigenvectors[(j, i)] = eigen.eigenvectors[(j, indices[i])];
        }
    }

    let n_factors = determine_factors_to_retain(&eigenvalues, config);
    web_sys::console::log_1(&format!("Statify trying to extract: {} factors", n_factors).into());

    if n_factors == 0 {
        return Err("No factors meet the retention criteria".to_string());
    }

    let mut loadings = DMatrix::zeros(n_vars, n_factors);
    for i in 0..n_vars {
        for j in 0..n_factors {
            loadings[(i, j)] = eigenvectors[(i, j)] * eigenvalues[j].sqrt();
        }
    }

    let mut communalities = vec![0.0; n_vars];
    for i in 0..n_vars {
        for j in 0..n_factors {
            communalities[i] += eigenvalues[j].abs() * eigenvectors[(i, j)].powi(2);
        }
    }

    let total_variance: f64 = if config.extraction.covariance {
        eigenvalues.iter().sum()
    } else {
        n_vars as f64
    };

    let explained_variance: Vec<f64> = eigenvalues
        .iter()
        .take(n_factors)
        .map(|&val| if total_variance > 0.0 { (val / total_variance) * 100.0 } else { 0.0 })
        .collect();

    let mut cumulative_variance = vec![0.0; n_factors];
    let mut cum_sum = 0.0;
    for (i, &var) in explained_variance.iter().enumerate() {
        cum_sum += var;
        cumulative_variance[i] = cum_sum;
    }

    // PCA adalah metode non-iteratif, jadi selalu konvergen.
    let converged = true;
    let has_heywood_case = communalities.iter().any(|&x| x >= 0.999);
    let improper_solution = communalities.iter().any(|&x| x.is_nan());

    let mut result = build_extraction_result(
        loadings,
        eigenvalues, // PCA mem-pass semua eigenvalues untuk scree plot/report
        communalities,
        explained_variance,
        cumulative_variance,
        n_factors,
        var_names,
        has_heywood_case,
        converged,
        false, // singular matrix check bisa ditambahkan di luar jika perlu
        improper_solution,
    );

    let mut standardized_loadings = result.loadings.clone();
    if config.extraction.covariance {
        let mut standard_deviations = Vec::with_capacity(n_vars);
        for i in 0..n_vars {
            let std_dev = matrix[(i, i)].abs().sqrt().max(1e-12);
            standard_deviations.push(std_dev);
            for j in 0..n_factors {
                standardized_loadings[(i, j)] /= std_dev;
            }
        }
        result.standard_deviations = Some(standard_deviations);
    }
    result.standardized_loadings = Some(standardized_loadings);
    Ok(result)
}

// --------------------------------------------------------------------------------
// 2. PRINCIPAL AXIS FACTORING (PAF)
// --------------------------------------------------------------------------------
pub fn extract_principal_axis_factoring(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();
    
    if config.extraction.covariance {
        // JALUR 1: ANALYSIS = COVARIANCE
        let mut variances = vec![0.0; n_vars];
        let mut std_devs = vec![0.0; n_vars];
        for i in 0..n_vars {
            variances[i] = matrix[(i, i)];
            if variances[i] <= 0.0 { return Err(format!("Var {} has <= 0 variance", i)); }
            std_devs[i] = variances[i].sqrt();
        }

        let mut temp_corr = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            for j in 0..n_vars {
                temp_corr[(i, j)] = matrix[(i, j)] / (std_devs[i] * std_devs[j]);
            }
        }

        let mut communalities = vec![0.0; n_vars];
        match temp_corr.clone().try_inverse() {
            Some(inv) => {
                for i in 0..n_vars {
                    let r_ii = inv[(i, i)];
                    let smc = if r_ii > 1e-12 { 1.0 - (1.0 / r_ii) } else { 0.0 };
                    let safe_smc = smc.max(0.0).min(0.9999);
                    communalities[i] = safe_smc * variances[i]; 
                }
            },
            None => {
                for i in 0..n_vars {
                    let mut max_r = 0.0;
                    for j in 0..n_vars {
                        if i != j {
                            let r = temp_corr[(i, j)].abs();
                            if r > max_r { max_r = r; }
                        }
                    }
                    communalities[i] = max_r * variances[i];
                }
            }
        }

        let eigen_check = matrix.clone().symmetric_eigen();
        let mut init_evals: Vec<f64> = eigen_check.eigenvalues.iter().cloned().collect();
        init_evals.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
        let n_factors = determine_factors_to_retain(&init_evals, config);
        
        if n_factors == 0 { return Err("No factors retainable".to_string()); }

        let max_iter = if config.extraction.max_iter > 0 { config.extraction.max_iter as usize } else { 25 };
        let mut final_loadings = DMatrix::zeros(n_vars, n_factors);
        let mut work_matrix = matrix.clone(); 
        
        let mut converged = false;

        for _iter in 0..max_iter {
            for i in 0..n_vars {
                work_matrix[(i, i)] = communalities[i];
            }

            let eigen = work_matrix.clone().symmetric_eigen();
            
            let mut indices: Vec<usize> = (0..n_vars).collect();
            indices.sort_by(|&i, &j| 
                eigen.eigenvalues[j].partial_cmp(&eigen.eigenvalues[i]).unwrap_or(std::cmp::Ordering::Equal)
            );

            let sorted_vals: Vec<f64> = indices.iter().map(|&i| eigen.eigenvalues[i]).collect();
            let mut sorted_vecs = DMatrix::zeros(n_vars, n_vars);
            for i in 0..n_vars {
                for j in 0..n_vars {
                    sorted_vecs[(i, j)] = eigen.eigenvectors[(i, indices[j])];
                }
            }

            let mut current_loadings = DMatrix::zeros(n_vars, n_factors);
            for i in 0..n_vars {
                for j in 0..n_factors {
                    if sorted_vals[j] > 0.0 {
                        current_loadings[(i, j)] = sorted_vecs[(i, j)] * sorted_vals[j].sqrt();
                    }
                }
            }

            let mut new_communalities = vec![0.0; n_vars];
            for i in 0..n_vars {
                let mut sum_sq = 0.0;
                for j in 0..n_factors {
                    sum_sq += current_loadings[(i, j)].powi(2);
                }
                
                let limit = variances[i] * 0.9999;
                if sum_sq > limit { sum_sq = limit; }
                new_communalities[i] = sum_sq;
            }

            let mut max_change = 0.0;
            for i in 0..n_vars {
                let denom = if communalities[i].abs() < 1e-10 { 1.0 } else { communalities[i] };
                let change = (new_communalities[i] - communalities[i]).abs() / denom;
                if change > max_change { max_change = change; }
            }

            communalities = new_communalities;
            final_loadings = current_loadings;

            if max_change < 0.001 { 
                converged = true;
                break; 
            }
        }

        let mut extracted_evals = Vec::new();
        let mut explained_pct = Vec::new();
        let total_variance: f64 = matrix.diagonal().sum();

        for j in 0..n_factors {
            let mut col_sq = 0.0;
            for i in 0..n_vars {
                if j < final_loadings.ncols() {
                    col_sq += final_loadings[(i, j)].powi(2);
                }
            }
            extracted_evals.push(col_sq);
            if total_variance > 0.0 {
                explained_pct.push((col_sq / total_variance) * 100.0);
            } else {
                explained_pct.push(0.0);
            }
        }

        let mut cum_sum = 0.0;
        let mut cum_var = Vec::new();
        for &v in &explained_pct {
            cum_sum += v;
            cum_var.push(cum_sum);
        }

        let has_heywood_case = communalities.iter().enumerate().any(|(i, &x)| x >= variances[i] * 0.999);
        let improper_solution = communalities.iter().any(|&x| x.is_nan()) || extracted_evals.iter().any(|&x| x.is_nan());

        return Ok(build_extraction_result(
            final_loadings,
            extracted_evals,
            communalities,
            explained_pct,
            cum_var,
            n_factors,
            var_names,
            has_heywood_case,
            converged,
            false,
            improper_solution,
        ));

    } else {
        // JALUR 2: ANALYSIS = CORRELATION
        let n_vars = matrix.nrows();
        
        let mut communalities = vec![0.0; n_vars];
        match matrix.clone().try_inverse() {
            Some(inv) => {
                for i in 0..n_vars {
                    let r_ii = inv[(i, i)];
                    if r_ii > 1e-12 {
                        communalities[i] = 1.0 - (1.0 / r_ii);
                    } else {
                        communalities[i] = 0.0;
                    }
                    if communalities[i] > 0.9999 { communalities[i] = 0.9999; }
                    if communalities[i] < 0.0 { communalities[i] = 0.0; }
                }
            },
            None => {
                for i in 0..n_vars {
                    let mut max_r = 0.0;
                    for j in 0..n_vars {
                        if i != j {
                            let r = matrix[(i, j)].abs();
                            if r > max_r { max_r = r; }
                        }
                    }
                    communalities[i] = max_r;
                }
            }
        }

        let eigen_check = matrix.clone().symmetric_eigen();
        let mut init_evals: Vec<f64> = eigen_check.eigenvalues.iter().cloned().collect();
        init_evals.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
        let n_factors = determine_factors_to_retain(&init_evals, config);
        
        if n_factors == 0 { return Err("No factors retainable".to_string()); }

        let max_iter = if config.extraction.max_iter > 0 { config.extraction.max_iter as usize } else { 25 };
        let mut final_loadings = DMatrix::zeros(n_vars, n_factors);
        let mut work_matrix = matrix.clone();
        
        let mut converged = false;

        for _iter in 0..max_iter {
            for i in 0..n_vars {
                work_matrix[(i, i)] = communalities[i];
            }

            let eigen = work_matrix.clone().symmetric_eigen();
            
            let mut indices: Vec<usize> = (0..n_vars).collect();
            indices.sort_by(|&i, &j| 
                eigen.eigenvalues[j].partial_cmp(&eigen.eigenvalues[i]).unwrap_or(std::cmp::Ordering::Equal)
            );

            let sorted_vals: Vec<f64> = indices.iter().map(|&i| eigen.eigenvalues[i]).collect();
            let mut sorted_vecs = DMatrix::zeros(n_vars, n_vars);
            for i in 0..n_vars {
                for j in 0..n_vars {
                    sorted_vecs[(i, j)] = eigen.eigenvectors[(i, indices[j])];
                }
            }

            let mut current_loadings = DMatrix::zeros(n_vars, n_factors);
            for i in 0..n_vars {
                for j in 0..n_factors {
                    if sorted_vals[j] > 0.0 {
                        current_loadings[(i, j)] = sorted_vecs[(i, j)] * sorted_vals[j].sqrt();
                    }
                }
            }

            let mut new_communalities = vec![0.0; n_vars];
            for i in 0..n_vars {
                let mut sum_sq = 0.0;
                for j in 0..n_factors {
                    sum_sq += current_loadings[(i, j)].powi(2);
                }
                if sum_sq > 0.9999 { sum_sq = 0.9999; }
                new_communalities[i] = sum_sq;
            }

            let mut max_change = 0.0;
            for i in 0..n_vars {
                let change = (new_communalities[i] - communalities[i]).abs();
                if change > max_change { max_change = change; }
            }

            communalities = new_communalities;
            final_loadings = current_loadings;

            if max_change < 0.001 { 
                converged = true;
                break; 
            }
        }

        let mut extracted_evals = Vec::new();
        let mut explained_pct = Vec::new();
        let total_variance = n_vars as f64; 

        for j in 0..n_factors {
            let mut col_sq = 0.0;
            for i in 0..n_vars {
                if j < final_loadings.ncols() {
                    col_sq += final_loadings[(i, j)].powi(2);
                }
            }
            extracted_evals.push(col_sq);
            if total_variance > 0.0 {
                explained_pct.push((col_sq / total_variance) * 100.0);
            } else {
                explained_pct.push(0.0);
            }
        }

        let mut cum_sum = 0.0;
        let mut cum_var = Vec::new();
        for &v in &explained_pct {
            cum_sum += v;
            cum_var.push(cum_sum);
        }

        let has_heywood_case = communalities.iter().any(|&x| x >= 0.999);
        let improper_solution = communalities.iter().any(|&x| x.is_nan()) || extracted_evals.iter().any(|&x| x.is_nan());

        return Ok(build_extraction_result(
            final_loadings,
            extracted_evals,
            communalities,
            explained_pct,
            cum_var,
            n_factors,
            var_names,
            has_heywood_case,
            converged,
            false,
            improper_solution,
        ));
    }
}

pub fn determine_factors_to_retain(eigenvalues: &[f64], config: &FactorAnalysisConfig) -> usize {
    if config.extraction.factor {
        if let Some(max) = config.extraction.max_factors {
            let max_usize = max as usize;
            if max_usize > 0 && max_usize <= eigenvalues.len() {
                return max_usize;
            }
        }
    }

    let total_eigenvalue: f64 = eigenvalues.iter().sum();
    let n_vars = eigenvalues.len() as f64;
    
    let mean_eigenvalue = if n_vars > 0.0 { 
        total_eigenvalue / n_vars 
    } else { 
        1.0 
    };

    let multiplier = if config.extraction.eigen_val <= 0.0 {
        1.0 
    } else {
        config.extraction.eigen_val
    };

    let threshold = multiplier * mean_eigenvalue;

    let count = eigenvalues
        .iter()
        .take_while(|&&val| val >= threshold)
        .count();

    if count == 0 { 1 } else { count }
}

// --------------------------------------------------------------------------------
// 3. UNWEIGHTED LEAST SQUARES (ULS)
// --------------------------------------------------------------------------------
pub fn extract_unweighted_least_squares(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();

    let mut communalities: Vec<f64> = if let Some(inv_corr) = matrix.clone().try_inverse() {
        (0..n_vars)
            .map(|i| {
                let diag_inv = inv_corr[(i, i)];
                if diag_inv > 0.0 {
                    (1.0 - 1.0 / diag_inv).clamp(0.0, 0.9999)
                } else {
                    0.0
                }
            })
            .collect()
    } else {
        let mut fallback = vec![0.0; n_vars];
        for i in 0..n_vars {
            let mut max_r = 0.0;
            for j in 0..n_vars {
                if i != j {
                    let r_ij = matrix[(i, j)].abs();
                    if r_ij > max_r {
                        max_r = r_ij;
                    }
                }
            }
            fallback[i] = max_r;
        }
        fallback
    };

    let r_matrix = matrix.clone();
    let max_iterations = if config.extraction.max_iter > 0 { config.extraction.max_iter as usize } else { 25 };
    let convergence_criterion = 0.001; 
    let mut converged = false;

    for _iter in 0..max_iterations {
        let mut reduced_matrix = r_matrix.clone();
        for i in 0..n_vars {
            reduced_matrix[(i, i)] = communalities[i];
        }

        let eigen = reduced_matrix.symmetric_eigen();
        let mut indices: Vec<usize> = (0..n_vars).collect();
        indices.sort_by(|&i, &j|
            eigen.eigenvalues[j]
                .partial_cmp(&eigen.eigenvalues[i])
                .unwrap_or(std::cmp::Ordering::Equal)
        );

        let sorted_eigenvalues: Vec<f64> = indices
            .iter()
            .map(|&i| eigen.eigenvalues[i])
            .collect();

        let mut sorted_eigenvectors = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            for j in 0..n_vars {
                sorted_eigenvectors[(i, j)] = eigen.eigenvectors[(i, indices[j])];
            }
        }

        let positive_eigenvalues: Vec<f64> = sorted_eigenvalues.iter().cloned().map(|x| x.max(0.0)).collect();
        let n_factors = determine_factors_to_retain(&positive_eigenvalues, config);
        
        if n_factors == 0 {
            return Err("No factors meet the retention criteria".to_string());
        }

        let mut new_communalities = vec![0.0; n_vars];
        for i in 0..n_vars {
            let mut sum_sq = 0.0;
            for j in 0..n_factors {
                if sorted_eigenvalues[j] > 0.0 {
                    let loading = sorted_eigenvectors[(i, j)] * sorted_eigenvalues[j].sqrt();
                    sum_sq += loading.powi(2);
                }
            }

            if sum_sq > 0.9999 { sum_sq = 0.9999; }
            if sum_sq < 0.0 { sum_sq = 0.0; }
            
            new_communalities[i] = sum_sq;
        }

        let mut max_change = 0.0;
        for i in 0..n_vars {
            let change = (new_communalities[i] - communalities[i]).abs();
            if change > max_change {
                max_change = change;
            }
        }

        communalities = new_communalities;

        if max_change < convergence_criterion {
            converged = true;
            break; 
        }
    }

    let mut final_reduced_matrix = r_matrix.clone();
    for i in 0..n_vars {
        final_reduced_matrix[(i, i)] = communalities[i];
    }

    let final_eigen = final_reduced_matrix.symmetric_eigen();
    let mut final_indices: Vec<usize> = (0..n_vars).collect();
    final_indices.sort_by(|&i, &j| {
        final_eigen.eigenvalues[j]
            .partial_cmp(&final_eigen.eigenvalues[i])
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let final_sorted_evals: Vec<f64> = final_indices
        .iter()
        .map(|&i| final_eigen.eigenvalues[i])
        .collect();

    let mut final_sorted_evecs = DMatrix::zeros(n_vars, n_vars);
    for i in 0..n_vars {
        for j in 0..n_vars {
            final_sorted_evecs[(i, j)] = final_eigen.eigenvectors[(i, final_indices[j])];
        }
    }

    let positive_evals: Vec<f64> = final_sorted_evals.iter().cloned().map(|x| x.max(0.0)).collect();
    let n_factors = determine_factors_to_retain(&positive_evals, config);

    calculate_final_result(
        n_vars, 
        n_factors, 
        &final_sorted_evals, 
        &final_sorted_evecs, 
        var_names,
        converged // Passing converged variable
    )
}

fn calculate_final_result(
    n_vars: usize,
    n_factors: usize,
    sorted_eigenvalues: &[f64],
    sorted_eigenvectors: &DMatrix<f64>,
    var_names: &[String],
    converged: bool
) -> Result<ExtractionResult, String> {
    
    let mut loadings = DMatrix::zeros(n_vars, n_factors);
    for i in 0..n_vars {
        for j in 0..n_factors {
            if sorted_eigenvalues[j] > 0.0 {
                loadings[(i, j)] =
                    sorted_eigenvectors[(i, j)] * sorted_eigenvalues[j].sqrt();
            }
        }
    }

    let mut final_communalities = vec![0.0; n_vars];
    let mut has_heywood_case = false; 

    for i in 0..n_vars {
        let mut sum_sq = 0.0;
        for j in 0..n_factors {
            sum_sq += loadings[(i, j)].powi(2);
        }
        
        if sum_sq >= 0.999 {
            has_heywood_case = true;
            let scale = (0.999 / sum_sq).sqrt();
            for j in 0..n_factors {
                loadings[(i, j)] *= scale;
            }
            sum_sq = 0.999;
        }
        
        final_communalities[i] = sum_sq; 
    }

    let total_variance = n_vars as f64;
    let mut explained_variance = Vec::new();
    let mut extracted_eigenvalues = Vec::new(); 

    for j in 0..n_factors {
        let mut col_sq = 0.0;
        for i in 0..n_vars {
            col_sq += loadings[(i, j)].powi(2);
        }
        extracted_eigenvalues.push(col_sq);

        let pct = if total_variance > 0.0 { 
            (col_sq / total_variance) * 100.0 
        } else { 0.0 };
        explained_variance.push(pct);
    }

    let mut cumulative_variance = vec![0.0; n_factors];
    let mut cum_sum = 0.0;
    for (i, &var) in explained_variance.iter().enumerate() {
        cum_sum += var;
        cumulative_variance[i] = cum_sum;
    }

    let improper_solution = final_communalities.iter().any(|&x| x.is_nan()) || extracted_eigenvalues.iter().any(|&x| x.is_nan());

    Ok(build_extraction_result(
        loadings,
        extracted_eigenvalues, 
        final_communalities,
        explained_variance,
        cumulative_variance,
        n_factors,
        var_names,
        has_heywood_case,
        converged,
        false,
        improper_solution,
    ))
}

// --------------------------------------------------------------------------------
// 4. GENERALIZED LEAST SQUARES (GLS)
// --------------------------------------------------------------------------------
pub fn extract_generalized_least_squares(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();

    let initial_eigen = matrix.clone().symmetric_eigen();
    let mut initial_eigvals: Vec<f64> = initial_eigen.eigenvalues.iter().cloned().collect();
    initial_eigvals.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

    let n_factors = determine_factors_to_retain(&initial_eigvals, config);
    if n_factors == 0 {
        return Err("No factors meet the retention criteria".to_string());
    }

    let w_matrix = match matrix.clone().try_inverse() {
        Some(inv) => inv,
        None => return Err("Correlation matrix is not invertible. GLS requires a positive definite matrix.".to_string()),
    };

    let mut h_matrix = DMatrix::zeros(n_vars, n_vars);
    for i in 0..n_vars {
        for j in 0..n_vars {
            h_matrix[(i, j)] = w_matrix[(i, j)].powi(2);
        }
    }

    let mut psi = vec![0.0; n_vars];
    for i in 0..n_vars {
        let r_ii = w_matrix[(i, i)];
        psi[i] = if r_ii > 0.0 { 1.0 / r_ii } else { 0.5 };
        psi[i] = psi[i].clamp(0.001, 0.999);
    }

    let max_iterations = if config.extraction.max_iter > 25 { config.extraction.max_iter as usize } else { 50 };
    let convergence_criterion = 0.001;

    let mut final_loadings = DMatrix::zeros(n_vars, n_factors);
    let mut has_heywood_case = false;
    let mut converged = false;

    for _iteration in 0..max_iterations {
        let mut psi_inv_sqrt = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            psi_inv_sqrt[(i, i)] = 1.0 / psi[i].sqrt();
        }

        let weighted_matrix = &psi_inv_sqrt * matrix * &psi_inv_sqrt;
        let eigen = weighted_matrix.symmetric_eigen();

        let mut indices: Vec<usize> = (0..n_vars).collect();
        indices.sort_by(|&i, &j|
            eigen.eigenvalues[j].partial_cmp(&eigen.eigenvalues[i]).unwrap_or(std::cmp::Ordering::Equal)
        );

        let mut loadings = DMatrix::zeros(n_vars, n_factors);
        for j in 0..n_factors {
            let eig_val = eigen.eigenvalues[indices[j]];
            let scale = if eig_val > 1.0 { (eig_val - 1.0).sqrt() } else { 0.0 };
            
            let mut sum_vec = 0.0;
            for i in 0..n_vars {
                sum_vec += eigen.eigenvectors[(i, indices[j])];
            }
            let sign = if sum_vec < 0.0 { -1.0 } else { 1.0 };

            for i in 0..n_vars {
                loadings[(i, j)] = psi[i].sqrt() * eigen.eigenvectors[(i, indices[j])] * sign * scale;
            }
        }

        let w_loadings = &w_matrix * &loadings;
        let mut d_vec = vec![0.0; n_vars];
        for i in 0..n_vars {
            let mut sum_sq = 0.0;
            for j in 0..n_factors {
                sum_sq += w_loadings[(i, j)].powi(2);
            }
            d_vec[i] = w_matrix[(i, i)] - sum_sq;
        }

        let mut new_psi = psi.clone();
        for _cd_iter in 0..100 {
            let mut max_cd_change = 0.0;
            for i in 0..n_vars {
                let mut sum_h_psi = 0.0;
                for j in 0..n_vars {
                    if i != j {
                        sum_h_psi += h_matrix[(i, j)] * new_psi[j];
                    }
                }
                
                let unconstrained = (d_vec[i] - sum_h_psi) / h_matrix[(i, i)];
                let constrained = unconstrained.clamp(0.001, 0.999);
                
                let diff = (constrained - new_psi[i]).abs();
                if diff > max_cd_change {
                    max_cd_change = diff;
                }
                new_psi[i] = constrained;
            }
            if max_cd_change < 1e-6 { 
                break;
            }
        }

        let mut max_change = 0.0;
        has_heywood_case = false;

        for i in 0..n_vars {
            let change = (new_psi[i] - psi[i]).abs();
            if change > max_change {
                max_change = change;
            }
            psi[i] = new_psi[i];
            
            if psi[i] <= 0.0011 {
                has_heywood_case = true;
            }
        }

        final_loadings = loadings;

        if max_change < convergence_criterion {
            converged = true;
            break;
        }
    }

    let mut communalities = vec![0.0; n_vars];
    for i in 0..n_vars {
        communalities[i] = 1.0 - psi[i];
    }

    let mut extracted_eigenvalues = vec![0.0; n_factors];
    for j in 0..n_factors {
        let mut sum_sq = 0.0;
        for i in 0..n_vars {
            sum_sq += final_loadings[(i, j)].powi(2);
        }
        extracted_eigenvalues[j] = sum_sq;
    }

    let total_variance: f64 = matrix.diagonal().sum();
    
    let explained_variance: Vec<f64> = extracted_eigenvalues
        .iter()
        .map(|&val| if total_variance > 0.0 { (val / total_variance) * 100.0 } else { 0.0 })
        .collect();

    let mut cumulative_variance = vec![0.0; n_factors];
    let mut cum_sum = 0.0;
    for (i, &var) in explained_variance.iter().enumerate() {
        cum_sum += var;
        cumulative_variance[i] = cum_sum;
    }

    let improper_solution = communalities.iter().any(|&x| x.is_nan()) || extracted_eigenvalues.iter().any(|&x| x.is_nan());

    Ok(build_extraction_result(
        final_loadings,
        extracted_eigenvalues,
        communalities,
        explained_variance,
        cumulative_variance,
        n_factors,
        var_names,
        has_heywood_case,
        converged,
        false,
        improper_solution,
    ))
}

// --------------------------------------------------------------------------------
// 5. MAXIMUM LIKELIHOOD (ML)
// --------------------------------------------------------------------------------
pub fn extract_maximum_likelihood(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();

    let initial_eigen = matrix.clone().symmetric_eigen();
    let mut initial_eigvals: Vec<f64> = initial_eigen.eigenvalues.iter().cloned().collect();
    initial_eigvals.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

    let n_factors = determine_factors_to_retain(&initial_eigvals, config);
    if n_factors == 0 {
        return Err("No factors meet the retention criteria".to_string());
    }

    let mut communalities = vec![0.0; n_vars];
    if let Some(inv) = matrix.clone().try_inverse() {
        for i in 0..n_vars {
            let r_ii = inv[(i, i)];
            if r_ii > 0.0 {
                communalities[i] = 1.0 - 1.0 / r_ii;
            } else {
                communalities[i] = 0.5;
            }
        }
    } else {
        for i in 0..n_vars {
            let mut max_r = 0.0;
            for j in 0..n_vars {
                if i != j {
                    let val = matrix[(i, j)].abs();
                    if val > max_r { max_r = val; }
                }
            }
            communalities[i] = max_r;
        }
    }

    for val in &mut communalities {
        if *val >= 1.0 { *val = 0.999; }
        if *val <= 0.0 { *val = 0.001; }
    }

    let mut psi_squared = vec![0.0; n_vars];
    for i in 0..n_vars {
        psi_squared[i] = 1.0 - communalities[i];
    }

    let max_iterations = if config.extraction.max_iter > 25 {
        config.extraction.max_iter as usize
    } else {
        25
    };
    
    let convergence_criterion = 1e-8; 
    
    let mut final_loadings = DMatrix::zeros(n_vars, n_factors);
    let mut converged = false;
    let mut has_heywood_case = false;

    for _iteration in 0..max_iterations {
        let mut psi_inv_sqrt = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            let val = psi_squared[i].max(0.0001); 
            psi_inv_sqrt[(i, i)] = 1.0 / val.sqrt();
        }

        let weighted_r = &psi_inv_sqrt * matrix * &psi_inv_sqrt;
        let eigen = weighted_r.symmetric_eigen();

        let mut indices: Vec<usize> = (0..n_vars).collect();
        indices.sort_by(|&i, &j|
            eigen.eigenvalues[j]
                .partial_cmp(&eigen.eigenvalues[i])
                .unwrap_or(std::cmp::Ordering::Equal)
        );

        let sorted_eigenvalues: Vec<f64> = indices.iter()
            .map(|&i| eigen.eigenvalues[i].max(0.0))
            .collect();
            
        let mut sorted_eigenvectors = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            for j in 0..n_vars {
                sorted_eigenvectors[(i, j)] = eigen.eigenvectors[(i, indices[j])];
            }
        }

        let mut loadings = DMatrix::zeros(n_vars, n_factors);
        for i in 0..n_vars {
            for j in 0..n_factors {
                let eig_val = sorted_eigenvalues[j];
                let scale_factor = if eig_val > 1.0 { (eig_val - 1.0).sqrt() } else { 0.0 };
                
                let val = psi_squared[i].max(0.0001);
                loadings[(i, j)] = val.sqrt() * sorted_eigenvectors[(i, j)] * scale_factor;
            }
        }

        let mut new_communalities = vec![0.0; n_vars];
        let mut new_psi_squared = vec![0.0; n_vars];
        let mut max_change = 0.0;
        
        has_heywood_case = false;

        for i in 0..n_vars {
            let mut sum_sq = 0.0;
            for j in 0..n_factors {
                sum_sq += loadings[(i, j)].powi(2);
            }

            if sum_sq >= 0.999 {
                has_heywood_case = true;
                sum_sq = 0.999;
            }
            
            new_communalities[i] = sum_sq;
            new_psi_squared[i] = 1.0 - sum_sq;
            
            let change = (new_communalities[i] - communalities[i]).abs();
            if change > max_change {
                max_change = change;
            }
        }

        communalities = new_communalities;
        psi_squared = new_psi_squared;
        final_loadings = loadings;

        if max_change < convergence_criterion {
            converged = true;
            break;
        }
    }

    if has_heywood_case {
        web_sys::console::log_1(
            &"[ML] Heywood case detected; solution should be interpreted with caution.".into(),
        );
    }

    if !converged {
        web_sys::console::log_1(
            &"[ML] Did not fully converge within internal maximum iterations.".into(),
        );
    }

    let mut extracted_eigenvalues = vec![0.0; n_factors];
    for j in 0..n_factors {
        let mut sum_sq = 0.0;
        for i in 0..n_vars {
            sum_sq += final_loadings[(i, j)].powi(2);
        }
        extracted_eigenvalues[j] = sum_sq;
    }

    let total_variance: f64 = matrix.diagonal().sum(); 
    
    let explained_variance: Vec<f64> = extracted_eigenvalues
        .iter()
        .map(|&val| if total_variance > 0.0 { (val / total_variance) * 100.0 } else { 0.0 })
        .collect();

    let mut cumulative_variance = vec![0.0; n_factors];
    let mut cum_sum = 0.0;
    for (i, &var) in explained_variance.iter().enumerate() {
        cum_sum += var;
        cumulative_variance[i] = cum_sum;
    }

    // kunci agar diagnostic engine membaca improper_solution
    let improper_solution = communalities.iter().any(|&x| x.is_nan()) || extracted_eigenvalues.iter().any(|&x| x.is_nan());

    Ok(build_extraction_result(
        final_loadings,
        extracted_eigenvalues,
        communalities,
        explained_variance,
        cumulative_variance,
        n_factors,
        var_names,
        has_heywood_case,
        converged,
        false,
        improper_solution,
    ))
}

// --------------------------------------------------------------------------------
// 6. ALPHA FACTORING
// --------------------------------------------------------------------------------
pub fn extract_alpha_factoring(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();

    let determinant = matrix.determinant();
    if determinant.abs() < 1e-8 {
        return Err("Correlation matrix is nearly singular for alpha factoring".to_string());
    }

    let mut h_initial = vec![0.0; n_vars];

    match matrix.clone().try_inverse() {
        Some(inv) => {
            for i in 0..n_vars {
                h_initial[i] = 1.0 - 1.0 / inv[(i, i)];
                if h_initial[i] < 0.0 || h_initial[i] > 1.0 {
                    h_initial[i] = 0.5;
                }
            }
        }
        None => {
            for i in 0..n_vars {
                let mut max_corr = 0.0;
                for j in 0..n_vars {
                    if i != j {
                        let corr = matrix[(i, j)].abs();
                        if corr > max_corr {
                            max_corr = corr;
                        }
                    }
                }
                h_initial[i] = max_corr;
            }
        }
    };

    let max_iterations = config.extraction.max_iter as usize;
    let convergence_criterion = 0.001;

    let mut h_current = h_initial.clone();
    // let mut converged = false;

    for _iteration in 0..max_iterations {
        let mut h_sqrt = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            h_sqrt[(i, i)] = h_current[i].sqrt();
        }

        let identity = DMatrix::identity(n_vars, n_vars);
        let r_minus_i = matrix - &identity;
        let transformed = &h_sqrt * &r_minus_i * &h_sqrt + identity;

        let eigen = transformed.symmetric_eigen();

        let mut indices: Vec<usize> = (0..n_vars).collect();
        indices.sort_by(|&i, &j|
            eigen.eigenvalues[j]
                .partial_cmp(&eigen.eigenvalues[i])
                .unwrap_or(std::cmp::Ordering::Equal)
        );

        let sorted_eigenvalues: Vec<f64> = indices
            .iter()
            .map(|&i| eigen.eigenvalues[i].max(0.0)) 
            .collect();

        let mut sorted_eigenvectors = DMatrix::zeros(n_vars, n_vars);
        for i in 0..n_vars {
            for j in 0..n_vars {
                sorted_eigenvectors[(i, j)] = eigen.eigenvectors[(i, indices[j])];
            }
        }

        let n_factors = determine_factors_to_retain(&sorted_eigenvalues, config);
        if n_factors == 0 {
            return Err("No factors meet the retention criteria".to_string());
        }

        let mut h_new = vec![0.0; n_vars];
        for k in 0..n_vars {
            let mut sum = 0.0;
            for j in 0..n_factors {
                sum += sorted_eigenvalues[j].abs() * sorted_eigenvectors[(k, j)].powi(2);
            }
            h_new[k] = sum * h_current[k];

            if h_new[k] < 1e-6 {
                return Err("Zero communality detected in alpha factoring".to_string());
            }
        }

        let mut max_change = 0.0;
        for i in 0..n_vars {
            let change = (h_new[i] - h_current[i]).abs();
            if change > max_change {
                max_change = change;
            }
        }

        if max_change < convergence_criterion {
            // converged = true;
            let mut loadings = DMatrix::zeros(n_vars, n_factors);
            for i in 0..n_vars {
                for j in 0..n_factors {
                    loadings[(i, j)] =
                        h_current[i].sqrt() *
                        sorted_eigenvectors[(i, j)] *
                        sorted_eigenvalues[j].sqrt();
                }
            }

            let total_variance: f64 = if config.extraction.covariance {
                sorted_eigenvalues.iter().sum()
            } else {
                h_new.iter().sum()
            };
            let explained_variance: Vec<f64> = sorted_eigenvalues
                .iter()
                .take(n_factors)
                .map(|&val| if total_variance > 0.0 { (val / total_variance) * 100.0 } else { 0.0 })
                .collect();

            let mut cumulative_variance = vec![0.0; n_factors];
            let mut cum_sum = 0.0;
            for (i, &var) in explained_variance.iter().enumerate() {
                cum_sum += var;
                cumulative_variance[i] = cum_sum;
            }

            let improper_solution = h_new.iter().any(|&x| x.is_nan()) || sorted_eigenvalues.iter().take(n_factors).any(|&x| x.is_nan());
            let has_heywood_case = h_new.iter().any(|&x| x >= 0.999);

            return Ok(build_extraction_result(
                loadings,
                sorted_eigenvalues.into_iter().take(n_factors).collect(),
                h_new,
                explained_variance,
                cumulative_variance,
                n_factors,
                var_names,
                has_heywood_case,
                true,
                false,
                improper_solution,
            ));
        }

        h_current = h_new;
    }

    Err("Alpha factoring failed to converge within the maximum iterations".to_string())
}

// --------------------------------------------------------------------------------
// 7. IMAGE FACTORING
// --------------------------------------------------------------------------------
pub fn extract_image_factoring(
    matrix: &DMatrix<f64>,
    config: &FactorAnalysisConfig,
    var_names: &[String]
) -> Result<ExtractionResult, String> {
    let n_vars = matrix.nrows();

    let r_inverse = match matrix.clone().try_inverse() {
        Some(inv) => inv,
        None => {
            return Err("Correlation matrix is singular for image factoring".to_string());
        }
    };

    let mut s_matrix = DMatrix::zeros(n_vars, n_vars);
    for i in 0..n_vars {
        s_matrix[(i, i)] = 1.0 / r_inverse[(i, i)].sqrt();
    }

    let s_inv = s_matrix.clone().try_inverse().unwrap(); 
    let transformed = &s_inv * matrix * &s_inv;

    let eigen = transformed.symmetric_eigen();

    let mut indices: Vec<usize> = (0..n_vars).collect();
    indices.sort_by(|&i, &j|
        eigen.eigenvalues[j].partial_cmp(&eigen.eigenvalues[i]).unwrap_or(std::cmp::Ordering::Equal)
    );

    let sorted_eigenvalues: Vec<f64> = indices
        .iter()
        .map(|&i| eigen.eigenvalues[i])
        .collect();

    let mut sorted_eigenvectors = DMatrix::zeros(n_vars, n_vars);
    for i in 0..n_vars {
        for j in 0..n_vars {
            sorted_eigenvectors[(i, j)] = eigen.eigenvectors[(i, indices[j])];
        }
    }

    let mut n_factors = 0;
    for &val in &sorted_eigenvalues {
        if val > 1.0 {
            n_factors += 1;
        } else {
            break;
        }
    }

    if n_factors == 0 {
        return Err("No factors with eigenvalues > 1 in image factoring".to_string());
    }

    let mut loadings = DMatrix::zeros(n_vars, n_factors);
    for i in 0..n_vars {
        for j in 0..n_factors {
            loadings[(i, j)] =
                (s_matrix[(i, i)] * sorted_eigenvectors[(i, j)] * (sorted_eigenvalues[j] - 1.0)) /
                sorted_eigenvalues[j].sqrt();
        }
    }

    let mut communalities = vec![0.0; n_vars];
    for i in 0..n_vars {
        for j in 0..n_factors {
            communalities[i] +=
                ((sorted_eigenvalues[j] - 1.0).powi(2) * sorted_eigenvectors[(i, j)].powi(2)) /
                (sorted_eigenvalues[j] * r_inverse[(i, i)]);
        }
    }

    let total_variance = if config.extraction.covariance {
        sorted_eigenvalues.iter().sum()
    } else {
        n_vars as f64
    };
    let explained_variance: Vec<f64> = (0..n_factors)
        .map(|j| if total_variance > 0.0 { (sorted_eigenvalues[j] / total_variance) * 100.0 } else { 0.0 })
        .collect();

    let mut cumulative_variance = vec![0.0; n_factors];
    let mut cum_sum = 0.0;
    for (i, &var) in explained_variance.iter().enumerate() {
        cum_sum += var;
        cumulative_variance[i] = cum_sum;
    }

    let _image_covar = matrix + &s_matrix * &r_inverse * &s_matrix - &s_matrix * 2.0;
    let _anti_image_covar = &s_matrix * &r_inverse * &s_matrix;

    // Image factoring juga bersifat direct calculation (bukan iteratif)
    let converged = true;
    let has_heywood_case = communalities.iter().any(|&x| x >= 0.999);
    let improper_solution = communalities.iter().any(|&x| x.is_nan()) || sorted_eigenvalues.iter().take(n_factors).any(|&x| x.is_nan());

    Ok(build_extraction_result(
        loadings,
        sorted_eigenvalues.into_iter().take(n_factors).collect(),
        communalities,
        explained_variance,
        cumulative_variance,
        n_factors,
        var_names,
        has_heywood_case,
        converged,
        false,
        improper_solution,
    ))
}