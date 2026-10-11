// perbaikan 17/1/2026

use std::collections::HashMap;
use nalgebra::{DMatrix, SVD};
use super::matrix::calculate_raw_variances;
use super::common::chi_square_cdf;
use super::core::{ calculate_matrix, extract_data_matrix, extract_factors, rotate_factors };
use crate::models::{
    config::{FactorAnalysisConfig, ExtractionMethod, ExtractionStatus}, // Menambahkan ExtractionStatus
    data::AnalysisData,
    result::{
        Communalities,
        ComponentCorrelationMatrix,
        ComponentMatrix,
        ComponentScoreCoefficientMatrix,
        ComponentScoreCovarianceMatrix,
        ComponentTransformationMatrix,
        // ExtractionResult,
        GoodnessOfFitTest,
        PatternMatrix,
        ReproducedCorrelations,
        ReproducedCovariances,
        RotatedComponentMatrix,
        RotationResult,
        ScreePlot,
        StructureMatrix,
        TotalVarianceComponent,
        TotalVarianceExplained,
        TotalVarianceBlock,
    },
};



// =========================================================================
// 1. Communalities (FIXED LOGIC ORDER & COVARIANCE HANDLING)
// =========================================================================
pub fn calculate_communalities(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<Communalities, String> {

    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let is_covariance_extraction = config.extraction.covariance;

    let matrix_type = if is_covariance_extraction {
        "covariance"
    } else if config.extraction.correlation {
        "correlation"
    } else {
        "correlation" 
    };

    // 1. Lakukan Ekstraksi Faktor
    let matrix_for_extraction = calculate_matrix(&data_matrix, matrix_type)?; 
    let extraction_result = extract_factors(&matrix_for_extraction, config, &var_names)?;

    // 2. Hitung Varians Murni (Raw Variances)
    let raw_variances = calculate_raw_variances(&data_matrix)?; 

    // Sekarang report.rs murni mengikuti status dari 7 internal state, tanpa menebak manual.
    let suppress_extraction = matches!(
        extraction_result.extraction_status,
        ExtractionStatus::NonConvergence |
        ExtractionStatus::NoLocalMinimum |
        ExtractionStatus::SingularMatrix |
        ExtractionStatus::ImproperSolution |
        ExtractionStatus::FailedExtraction
    );

    // // Heywood warning murni mengandalkan status dari engine
    // let heywood_warning_flag = matches!(
    //     extraction_result.extraction_status,
    //     ExtractionStatus::HeywoodWarning
    // );

    // Heywood warning murni mengandalkan boolean asli, BUKAN dari status enum.
    // Ini memastikan footnote tetap muncul di tabel Communalities meskipun ekstraksi dihentikan (NoLocalMinimum).
    let heywood_warning_flag = extraction_result.has_heywood_case;

    // Hitung SMC untuk Initial Value
    let corr_matrix = calculate_matrix(&data_matrix, "correlation")?;
    let smc_values: Vec<f64> = match corr_matrix.try_inverse() {
        Some(inv) => {
            (0..var_names.len())
                .map(|i| {
                    let r_ii = inv[(i, i)];
                    if r_ii > 0.0 { (1.0 - 1.0 / r_ii).max(0.0) } else { 0.0 }
                })
                .collect()
        },
        None => vec![0.0; var_names.len()] 
    };

    let mut raw_initial = HashMap::new();
    let mut rescaled_initial = HashMap::new();
    let mut extraction = HashMap::new();
    let mut rescaled_extraction = HashMap::new();

    for (i, var_name) in var_names.iter().enumerate() {
        
        //  LOGIKA INITIAL VALUES 
        match config.extraction.method {
            ExtractionMethod::PrincipalComponents => {
                rescaled_initial.insert(var_name.clone(), 1.0);
                if is_covariance_extraction {
                    raw_initial.insert(var_name.clone(), raw_variances[i]);
                } else {
                    raw_initial.insert(var_name.clone(), 1.0);
                }
            },
            _ => {
                let smc = if i < smc_values.len() { smc_values[i] } else { 0.0 };
                rescaled_initial.insert(var_name.clone(), smc);

                if is_covariance_extraction {
                    let raw_val = smc * raw_variances[i];
                    raw_initial.insert(var_name.clone(), raw_val);
                } else {
                    raw_initial.insert(var_name.clone(), smc);
                }
            }
        }

        //  PENGISIAN EXTRACTION VALUES 
        // Hanya isi jika suppress == false
        if !suppress_extraction {
            if i < extraction_result.communalities.len() {
                let raw_ext_val = extraction_result.communalities[i];
                
                if is_covariance_extraction {
                    // Covariance Mode
                    extraction.insert(var_name.clone(), raw_ext_val); // Raw
                    if raw_variances[i] > 0.0 {
                        rescaled_extraction.insert(var_name.clone(), raw_ext_val / raw_variances[i]);
                    } else {
                        rescaled_extraction.insert(var_name.clone(), 0.0);
                    }
                } else {
                    // Correlation Mode
                    extraction.insert(var_name.clone(), raw_ext_val);
                    rescaled_extraction.insert(var_name.clone(), raw_ext_val);
                }
            }
        }
    }

    Ok(Communalities {
        raw_initial,
        rescaled_initial,
        extraction, 
        rescaled_extraction,
        variable_order: var_names,
        extraction_matrix_type: matrix_type.to_string(),
        suppress_extraction,
        heywood_warning_flag,
    })
}


// =========================================================================
// 2. Total Variance Explained (Fixed: Using matches! macro)
// =========================================================================

// Helper closure
fn create_components(eigenvalues: &[f64], total_variance: f64) -> Vec<TotalVarianceComponent> {
    let mut components = Vec::new();
    let mut cumulative = 0.0;
    
    for &eig in eigenvalues {
        let percent = if total_variance > 0.0 { (eig / total_variance) * 100.0 } else { 0.0 };
        cumulative += percent;
        
        components.push(TotalVarianceComponent {
            total: eig,
            percent_of_variance: percent,
            cumulative_percent: cumulative,
        });
    }
    components
}


// =========================================================================
// 2. Total Variance Explained (Diperbarui untuk Rescaling Covariance & Rotasi)
// =========================================================================

pub fn calculate_total_variance_explained(
    initial_eigenvalues: &[f64],    
    extraction_eigenvalues: &[f64], 
    rotation_eigenvalues: Option<&[f64]>,
    total_variance: f64,
    n_variables: usize, 
    matrix_type: &str,
    suppress_extraction: bool,
    rescaled_extraction_eigenvalues: Option<&[f64]>, 
    rescaled_rotation_eigenvalues: Option<&[f64]>,   
) -> TotalVarianceExplained {
    
    // Dapatkan jumlah komponen yang diekstrak dari panjang array extraction_eigenvalues
    let n_factors = extraction_eigenvalues.len(); 

    match matrix_type {
        "correlation" => {
            let initial = create_components(initial_eigenvalues, total_variance);
            
            let (extraction, rotation) = if suppress_extraction {
                (Vec::new(), None) 
            } else {
                let ext = create_components(extraction_eigenvalues, total_variance);
                
                //  Pastikan n_factors > 1 agar rotasi tidak None
                let rot = if n_factors > 1 {
                    rotation_eigenvalues.map(|values| create_components(values, total_variance))
                } else {
                    None
                };
                
                (ext, rot)
            };

            TotalVarianceExplained {
                blocks: vec![
                    TotalVarianceBlock {
                        label: "Component".to_string(),
                        initial,
                        extraction,
                        rotation,
                    }
                ],
                extraction_matrix_type: "correlation".to_string(),
            }
        }

        "covariance" => {
            let raw_initial = create_components(initial_eigenvalues, total_variance);
            
            let raw_extraction = if suppress_extraction {
                Vec::new() 
            } else {
                create_components(extraction_eigenvalues, total_variance)
            };

            //  Tambahkan kondisi n_factors <= 1
            let raw_rotation = if suppress_extraction || rotation_eigenvalues.is_none() || n_factors <= 1 {
                None
            } else {
                Some(create_components(rotation_eigenvalues.unwrap(), total_variance))
            };

            //  Initial selalu sama antara raw dan rescaled di Covariance
            let rescaled_initial = raw_initial.clone(); 

            // LOGIKA RESCALED: Total varians adalah p (jumlah variabel), bukan total raw varians
            let p_variance = n_variables as f64; 

            let rescaled_extraction = if suppress_extraction || rescaled_extraction_eigenvalues.is_none() {
                Vec::new()
            } else {
                create_components(rescaled_extraction_eigenvalues.unwrap(), p_variance)
            };

            // Tambahkan kondisi n_factors <= 1
            let rescaled_rotation = if suppress_extraction || rescaled_rotation_eigenvalues.is_none() || n_factors <= 1 {
                None
            } else {
                Some(create_components(rescaled_rotation_eigenvalues.unwrap(), p_variance))
            };

            TotalVarianceExplained {
                blocks: vec![
                    TotalVarianceBlock {
                        label: "Raw".to_string(),
                        initial: raw_initial,
                        extraction: raw_extraction,
                        rotation: raw_rotation,
                    },
                    TotalVarianceBlock {
                        label: "Rescaled".to_string(),
                        initial: rescaled_initial,
                        extraction: rescaled_extraction,
                        rotation: rescaled_rotation,
                    },
                ],
                extraction_matrix_type: "covariance".to_string(),
            }
        }

        _ => panic!("Unknown matrix type"),
    }
}

pub fn calculate_total_variance_explained_from_data(
    data: &AnalysisData,
    config: &FactorAnalysisConfig,
) -> Result<TotalVarianceExplained, String> {

    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let n_variables = var_names.len();

    let is_covariance = config.extraction.covariance;
    let matrix_type = if is_covariance { "covariance" } else { "correlation" };

    let matrix = calculate_matrix(&data_matrix, matrix_type)?;

    // STEP A: HITUNG INITIAL EIGENVALUES
    let eigen_decomp = matrix.clone().symmetric_eigen();
    let mut initial_eigenvalues: Vec<f64> = eigen_decomp.eigenvalues.data.as_vec().clone();
    initial_eigenvalues.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

    let total_variance: f64 = if is_covariance {
        initial_eigenvalues.iter().sum()
    } else {
        n_variables as f64
    };

    // Ambil Raw Variances untuk kalkulasi rescale dan deteksi Heywood
    let raw_variances = calculate_raw_variances(&data_matrix)?;

    // STEP B: HITUNG EXTRACTION EIGENVALUES
    let extraction_result = match extract_factors(&matrix, config, &var_names) {
        Ok(result) => Some(result),
        Err(e) => {
            if matches!(config.extraction.method, ExtractionMethod::MaximumLikelihood) {
                let empty: Vec<f64> = Vec::new();
                return Ok(calculate_total_variance_explained(
                    &initial_eigenvalues,
                    &empty,
                    None,
                    total_variance,
                    n_variables,
                    matrix_type,
                    true,
                    None,
                    None, // Format parameter baru
                ));
            }
            return Err(e);
        }
    };

    let extraction_result = extraction_result.expect("extraction_result must exist");

    // Langsung adopsi status dari ExtractionResult (Diagnostic Engine)
    let suppress_extraction = matches!(
        extraction_result.extraction_status,
        ExtractionStatus::NonConvergence |
        ExtractionStatus::NoLocalMinimum |
        ExtractionStatus::SingularMatrix |
        ExtractionStatus::ImproperSolution |
        ExtractionStatus::FailedExtraction
    );

    let k = extraction_result.n_factors;
    let limit = std::cmp::min(k, extraction_result.eigenvalues.len());
    let extraction_eigenvalues = extraction_result.eigenvalues[0..limit].to_vec();

    // STEP C: HITUNG RESCALED EIGENVALUES JIKA COVARIANCE
    let mut rescaled_ext_evals = None;
    if is_covariance && !suppress_extraction {
        let mut evals = Vec::with_capacity(k);
        for j in 0..k {
            let mut ssl = 0.0;
            for i in 0..n_variables {
                if raw_variances[i] > 0.0 {
                    let std_load = extraction_result.loadings[(i, j)] / raw_variances[i].sqrt();
                    ssl += std_load.powi(2);
                }
            }
            evals.push(ssl);
        }
        rescaled_ext_evals = Some(evals);
    }

    // STEP D: ROTATION EIGENVALUES (Disesuaikan agar sekaligus hitung Raw & Rescaled)
    let mut raw_rot_evals = None;
    let mut rescaled_rot_evals = None;

    if !suppress_extraction && !config.rotation.none && config.rotation.rotated_sol {
        if let Ok(rot_res) = rotate_factors(&extraction_result, config) {
            
            // HANYA HITUNG JIKA ROTASI BERHASIL KONVERGEN
            if rot_res.is_converged {
                // PERBAIKAN 1: Gunakan Structure Matrix untuk perhitungan Oblique, bukan Pattern Matrix
                let pattern_matrix = &rot_res.rotated_loadings;
                let structure_matrix = if let Some(phi) = &rot_res.factor_correlations {
                    pattern_matrix * phi
                } else {
                    pattern_matrix.clone()
                };

                let n_cols = structure_matrix.ncols();

                let mut raw_ssl_list = Vec::with_capacity(n_cols);
                let mut rescaled_ssl_list = Vec::with_capacity(n_cols);

                for j in 0..n_cols {
                    let mut raw_ssl = 0.0;
                    let mut rescaled_ssl = 0.0;
                    for i in 0..n_variables {
                        // Hitung kuadrat dari Structure Matrix, bukan rotated_loadings
                        let l = structure_matrix[(i, j)]; 
                        raw_ssl += l.powi(2);
                        
                        if is_covariance && raw_variances[i] > 0.0 {
                            rescaled_ssl += (l / raw_variances[i].sqrt()).powi(2);
                        }
                    }
                    raw_ssl_list.push(raw_ssl);
                    if is_covariance {
                        rescaled_ssl_list.push(rescaled_ssl);
                    }
                }
              
                // urutan komponen aslinya pada blok Rotation Sums of Squared Loadings.
                raw_rot_evals = Some(raw_ssl_list);

                if is_covariance {
                    rescaled_rot_evals = Some(rescaled_ssl_list);
                }
            }
        }
    }

    Ok(calculate_total_variance_explained(
        &initial_eigenvalues,
        &extraction_eigenvalues,
        raw_rot_evals.as_deref(),
        total_variance,
        n_variables,
        matrix_type,
        suppress_extraction, 
        rescaled_ext_evals.as_deref(),
        rescaled_rot_evals.as_deref(),
    ))
}

// // =========================================================================
// // 3. FUNGSI LAINNYA (Original Code - Tidak Ada Perubahan)
// // =========================================================================

pub fn calculate_component_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ComponentMatrix, String> {

    let (data_matrix, var_names) = extract_data_matrix(data, config)?;

    let matrix_type = if config.extraction.covariance {
        "covariance"
    } else {
        "correlation"
    };

    let matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&matrix, config, &var_names)?;

    let mut loadings = extraction_result.loadings.clone();
    let (n_rows, n_cols) = loadings.shape();

    // =========================================================
    // PERBAIKAN:  Sign Reflection untuk Unrotated Matrix
    // menggunakan jumlah absolut kolom, bukan sum of cubes
    // =========================================================
    for col in 0..n_cols {
        let mut col_sum = 0.0;
        for row in 0..n_rows {
            col_sum += loadings[(row, col)];
        }
         
        // Jika total penjumlahan kolom negatif, balik seluruh tandanya
        if col_sum < 0.0 {
            for row in 0..n_rows {
                loadings[(row, col)] *= -1.0;
            }
        }
    }

    let mut components = HashMap::new();
    for (i, var_name) in var_names.iter().enumerate() {
        let mut row = Vec::with_capacity(n_cols);
        for j in 0..n_cols {
            row.push(loadings[(i, j)]);
        }
        components.insert(var_name.clone(), row);
    }

    Ok(ComponentMatrix {
        components,
        variable_order: var_names,
    })
}

pub fn calculate_reproduced_correlations(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ReproducedCorrelations, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let corr_matrix = calculate_matrix(&data_matrix, "correlation")?;
    let extraction_result = extract_factors(&corr_matrix, config, &var_names)?;

    let k = extraction_result.n_factors;
    let mut reproduced_correlation = HashMap::new();
    let mut residual = HashMap::new();

    let loadings = &extraction_result.loadings;
    let loadings_k = if k < loadings.ncols() {
        loadings.columns(0, k).into_owned()
    } else {
        loadings.clone()
    };

    let reproduced_matrix = &loadings_k * loadings_k.transpose();

    for (i, var_name) in var_names.iter().enumerate() {
        let mut var_reproduced = HashMap::new();
        let mut var_residual = HashMap::new();

        for (j, other_var) in var_names.iter().enumerate() {
            let repro_corr = if i < reproduced_matrix.nrows() && j < reproduced_matrix.ncols() {
                reproduced_matrix[(i, j)]
            } else { 0.0 };
            var_reproduced.insert(other_var.clone(), repro_corr);

            let orig_corr = if i < corr_matrix.nrows() && j < corr_matrix.ncols() {
                corr_matrix[(i, j)]
            } else {
                if i == j { 1.0 } else { 0.0 }
            };

            let residual_corr = orig_corr - repro_corr;
            var_residual.insert(other_var.clone(), residual_corr);
        }
        reproduced_correlation.insert(var_name.clone(), var_reproduced);
        residual.insert(var_name.clone(), var_residual);
    }

    Ok(ReproducedCorrelations {
        reproduced_correlation,
        residual,
        variable_order: var_names,
    })
}



pub fn calculate_reproduced_covariances(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ReproducedCovariances, String> {
    
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    
    // 1. Ambil Matriks Kovarians (Observed)
    let cov_matrix = calculate_matrix(&data_matrix, "covariance")?;
    
    // 2. Ekstraksi Faktor
    let extraction_result = extract_factors(&cov_matrix, config, &var_names)?;

    let k = extraction_result.n_factors;
    let loadings = &extraction_result.loadings;
    
    // Ambil k kolom pertama (Loadings aktif)
    let loadings_k = if k < loadings.ncols() {
        loadings.columns(0, k).into_owned()
    } else {
        loadings.clone()
    };

    // 3. Hitung REPRODUCED TABLE (untuk ditampilkan)
    // Formula R: reproduced_table <- Lambda %*% t(Lambda)
    // PENTING: TIDAK override diagonal!
    let reproduced_table = &loadings_k * loadings_k.transpose();

    // 4. Hitung REPRODUCED MODEL (untuk residual)
    // Formula R: reproduced_model <- reproduced_table + Psi
    // Di mana Psi = diag(uniquenesses) = diag(Variance - Communality)
    let n = var_names.len();
    let reproduced_model = DMatrix::from_fn(n, n, |i, j| {
        if i == j {
            // Diagonal reproduced_model = Communality + Uniqueness = Variance
            // Ini membuat residual diagonal = 0
            cov_matrix[(i, i)]
        } else {
            reproduced_table[(i, j)]
        }
    });

    let mut reproduced_covariance = HashMap::new();
    let mut residual = HashMap::new();

    for (i, var_name) in var_names.iter().enumerate() {
        let mut var_reproduced = HashMap::new();
        let mut var_residual = HashMap::new();

        for (j, other_var) in var_names.iter().enumerate() {
            // Nilai Reproduced TABLE (untuk ditampilkan)
            let repro_val = if i < reproduced_table.nrows() && j < reproduced_table.ncols() {
                reproduced_table[(i, j)]
            } else { 0.0 };
            var_reproduced.insert(other_var.clone(), repro_val);

            // Nilai Observed (Data Asli)
            let orig_val = if i < cov_matrix.nrows() && j < cov_matrix.ncols() {
                cov_matrix[(i, j)]
            } else { 0.0 };

            // Nilai Reproduced MODEL (untuk residual)
            let repro_model_val = if i < reproduced_model.nrows() && j < reproduced_model.ncols() {
                reproduced_model[(i, j)]
            } else { 0.0 };

            // Nilai Residual = Observed - Reproduced Model
            let residual_val = orig_val - repro_model_val;
            var_residual.insert(other_var.clone(), residual_val);
        }
        reproduced_covariance.insert(var_name.clone(), var_reproduced);
        residual.insert(var_name.clone(), var_residual);
    }

    Ok(ReproducedCovariances {
        reproduced_covariance,
        residual,
        variable_order: var_names,
    })
}


// =========================================================================
// 2b. Goodness-of-fit Test (GLS) 
// =========================================================================
pub fn calculate_goodness_of_fit_test(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<GoodnessOfFitTest, String> {
    if !matches!(config.extraction.method, ExtractionMethod::GeneralizedLeastSquares) {
        return Err("Goodness-of-fit test only implemented for GLS.".to_string());
    }

    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let n_cases = data_matrix.nrows();
    let p = var_names.len();
    if n_cases < 2 || p == 0 {
        return Err("Insufficient data for goodness-of-fit test.".to_string());
    }

    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let s_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&s_matrix, config, &var_names)?;
    let k = extraction_result.n_factors;
    if k == 0 {
        return Err("No factors retained for goodness-of-fit test.".to_string());
    }

    let loadings = &extraction_result.loadings;
    let mut sigma = loadings * loadings.transpose();

    // Diagonal matriks model Sigma adalah (L * L^T) + Uniqueness
    for i in 0..p {
        let variance = if config.extraction.covariance {
            s_matrix[(i, i)]
        } else {
            1.0
        };

        let communality = extraction_result.communalities.get(i).copied().unwrap_or(0.0);
        let uniqueness = (variance - communality).max(1e-9);
        sigma[(i, i)] += uniqueness;
    }

    // Menggunakan .clone() agar tidak bermasalah dengan borrow checker saat di-build ke WASM
    let s_inv = s_matrix
        .clone()
        .try_inverse()
        .ok_or("Failed to invert observed matrix for goodness-of-fit test.")?;

    // GLS discrepancy: F = 0.5 * tr( A * A ), A = (S - Sigma) * S^-1
    let residual = &s_matrix - &sigma;
    let a_matrix = residual * s_inv;
    let a_squared = &a_matrix * &a_matrix;

    let mut trace_val = 0.0;
    for i in 0..p {
        trace_val += a_squared[(i, i)];
    }

    let f_gls = 0.5 * trace_val;

    // menggunakan Koreksi Bartlett untuk uji Goodness-of-Fit pada GLS 
    // Rumus Multiplier = N - 1 - (2p + 5)/6 - 2k/3
    let p_f64 = p as f64;
    let k_f64 = k as f64;
    let multiplier = (n_cases as f64) - 1.0 - ((2.0 * p_f64 + 5.0) / 6.0) - ((2.0 * k_f64) / 3.0);
    
    // Kalikan multiplier dengan nilai fungsi objektif GLS
    let chi_square = multiplier.max(0.0) * f_gls;

    let df = ((p as f64 - k as f64).powi(2) - (p + k) as f64) / 2.0;
    let df_value = if df > 0.0 { df } else { 1.0 };
    let df_usize = df_value.round().max(1.0) as usize;

    let significance = 1.0 - chi_square_cdf(chi_square, df_value);

    Ok(GoodnessOfFitTest {
        chi_square,
        df: df_usize,
        significance,
    })
}



pub fn calculate_scree_plot(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ScreePlot, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&matrix, config, &var_names)?;

    let n_variables = var_names.len();
    let mut eigenvalues = extraction_result.eigenvalues.clone();

    // ML/iterative unstable case may suppress extraction (n_factors == 0),
    // which can leave scree values empty. Fallback to initial matrix eigenvalues
    // so scree plot remains visible and informative.
    if extraction_result.n_factors == 0
        || eigenvalues.is_empty()
        || eigenvalues.iter().all(|v| v.abs() < 1e-12)
    {
        let eig = matrix.clone().symmetric_eigen();
        eigenvalues = eig.eigenvalues.data.as_vec().clone();
        eigenvalues.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    }

    eigenvalues.resize(n_variables, 0.0);
    let mut component_numbers = Vec::with_capacity(n_variables);
    for i in 0..n_variables {
        component_numbers.push(i + 1);
    }

    Ok(ScreePlot {
        eigenvalues,
        component_numbers,
    })
}


// =========================================================================
// HELPER: Robust Sqrt (Mencegah Crash pada nilai negatif kecil)
// =========================================================================
pub fn symmetric_matrix_sqrt_robust(matrix: &DMatrix<f64>) -> Option<DMatrix<f64>> {
    let n = matrix.nrows();
    if n != matrix.ncols() { return None; }
    
    let eigen = matrix.clone().symmetric_eigen();
    let mut d_sqrt = DMatrix::zeros(n, n);
    
    for i in 0..n {
        let val = eigen.eigenvalues[i];
        if val < -1e-5 {
            return None; // Error jika matriks benar-benar negatif
        } else {
            d_sqrt[(i, i)] = val.max(0.0).sqrt(); // Toleransi noise negatif
        }
    }
    Some(eigen.eigenvectors.clone() * d_sqrt * eigen.eigenvectors.transpose())
}

// Wrapper agar fungsi lama tetap ada tapi menggunakan logika robust yang baru
pub fn symmetric_matrix_sqrt(matrix: &DMatrix<f64>) -> Option<DMatrix<f64>> {
    symmetric_matrix_sqrt_robust(matrix)
}

// =========================================================================
// HELPER: Pseudoinverse (Moore-Penrose) menggunakan SVD untuk Non-Positive Definite Matrix
// =========================================================================
/// Compute Moore-Penrose pseudoinverse using SVD
/// This is robust for singular and near-singular matrices
pub fn compute_pseudoinverse(matrix: &DMatrix<f64>) -> Result<DMatrix<f64>, String> {
    let (m, n) = matrix.shape();
    
    // Try regular inversion first for efficiency
    if let Some(inv) = matrix.clone().try_inverse() {
        return Ok(inv);
    }
    
    // Fallback to SVD-based pseudoinverse for singular/near-singular matrices
    let svd = SVD::new(matrix.clone(), true, true);
    
    // Get U, V, and singular values
    let u = svd.u.ok_or("SVD failed: U matrix unavailable")?;
    let v_t = svd.v_t.ok_or("SVD failed: V^T matrix unavailable")?;
    let singular_values = &svd.singular_values;
    
    // Compute threshold for singular values (Golub-Kahan rule)
    let max_sv = singular_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let threshold = (m.max(n) as f64) * max_sv * 1e-14;
    
    // Build reciprocal of singular values with thresholding
    let mut s_inv = DMatrix::zeros(n, m);
    for i in 0..singular_values.len() {
        if singular_values[i] > threshold {
            s_inv[(i, i)] = 1.0 / singular_values[i];
        }
        // else: keep as 0 for small singular values
    }
    
    // Pseudoinverse = V * S^-1 * U^T
    Ok(v_t.transpose() * s_inv * u.transpose())
}

// =========================================================================
// FUNGSI 1: Calculate Component Score Coefficient Matrix
// =========================================================================
pub fn calculate_component_score_coefficient_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ComponentScoreCoefficientMatrix, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
    let base_matrix = calculate_matrix(&data_matrix, matrix_type)?;
    let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
    let rotation_result = rotate_factors(&extraction_result, config)?;
    
    let is_pca = matches!(config.extraction.method, ExtractionMethod::PrincipalComponents);

    let n_rows = extraction_result.loadings.nrows();
    let n_cols = extraction_result.loadings.ncols();
    let mut coefficients = DMatrix::zeros(n_rows, n_cols);

    let raw_variances = calculate_raw_variances(&data_matrix)?;

    if is_pca {
        if config.rotation.oblimin || config.rotation.promax {
            let r_matrix = calculate_matrix(&data_matrix, "correlation")?;
            let r_inverse = match r_matrix.clone().try_inverse() {
                Some(inv) => inv,
                None => compute_pseudoinverse(&r_matrix)?,
            };
            let mut standardized_pattern = rotation_result.rotated_loadings.clone();

            if config.extraction.covariance {
                for i in 0..n_rows {
                    let std_dev = raw_variances[i].sqrt().max(1e-12);
                    for j in 0..n_cols {
                        standardized_pattern[(i, j)] /= std_dev;
                    }
                }
            }

            let structure_matrix = if let Some(phi) = &rotation_result.factor_correlations {
                &standardized_pattern * phi
            } else {
                standardized_pattern
            };
            coefficients = &r_inverse * &structure_matrix;
        } else {
        // EXACT SPSS ALGORITHM FOR PCA: W = A * D^(-1) * (T^T)^(-1)
        let t_mat = &rotation_result.transformation_matrix;
        
        // Proteksi inversi T yang lebih aman
        let t_inv_t = if config.rotation.none || !rotation_result.is_converged {
            DMatrix::identity(n_cols, n_cols)
        } else {
            t_mat.clone().try_inverse()
                .unwrap_or_else(|| DMatrix::identity(n_cols, n_cols))
                .transpose()
        };
        
        for i in 0..n_rows {
            // CRITICAL: Ekstraksi Covariance memerlukan pengali Standar Deviasi
            let std_dev = if config.extraction.covariance && raw_variances[i] > 0.0 {
                raw_variances[i].sqrt()
            } else {
                1.0
            };

            for j in 0..n_cols {
                let mut sum = 0.0;
                for k in 0..n_cols {
                    let a_ik = extraction_result.loadings[(i, k)];
                    let d_k = extraction_result.eigenvalues[k];
                    
                    // Proteksi division by zero presisi tinggi
                    let ad_ik = if d_k.abs() > 1e-12 { a_ik / d_k } else { 0.0 };
                    sum += ad_ik * t_inv_t[(k, j)];
                }
                coefficients[(i, j)] = sum * std_dev;
            }
        }
        }
    } else {
        // REGRESSION METHOD FOR NON-PCA (PAF, ML, GLS)
        let r_matrix = calculate_matrix(&data_matrix, "correlation")?;
        let mut pattern_matrix = rotation_result.rotated_loadings.clone();
        
        // CRITICAL: SPSS internal selalu menggunakan "Rescaled Pattern Matrix" untuk kalkulasi skor jika metode Covariance
        if config.extraction.covariance {
            for i in 0..n_rows {
                let std_dev = if raw_variances[i] > 0.0 { raw_variances[i].sqrt() } else { 1.0 };
                for j in 0..n_cols {
                    pattern_matrix[(i, j)] /= std_dev; 
                }
            }
        }

        // Gunakan pseudoinverse sebagai fallback jika korelasi tidak bisa di-invers
        let r_inverse = match r_matrix.clone().try_inverse() {
            Some(inv) => inv,
            None => compute_pseudoinverse(&r_matrix).unwrap_or_else(|_| DMatrix::zeros(n_rows, n_rows))
        };
        
        let structure_matrix = if let Some(phi) = &rotation_result.factor_correlations {
            &pattern_matrix * phi
        } else {
            pattern_matrix.clone()
        };
        
        if config.scores.regression {
            coefficients = &r_inverse * &structure_matrix;
        } else if config.scores.bartlett {
            let mut u_inv_squared = DMatrix::zeros(n_rows, n_rows);
            for i in 0..n_rows {
                let u2 = (1.0 - extraction_result.communalities[i]).max(1e-9);
                u_inv_squared[(i, i)] = 1.0 / u2;
            }
            let p = &pattern_matrix;
            let term_inner = p.transpose() * &u_inv_squared * p;
            let term_inner_inv = term_inner.try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
            coefficients = &u_inv_squared * p * term_inner_inv;
        } else if config.scores.anderson {
            let b = &r_inverse * &structure_matrix;
            let g_matrix = b.transpose() * &r_matrix * &b;
            if let Some(g_sqrt) = symmetric_matrix_sqrt_robust(&g_matrix) {
                let g_sqrt_inv = g_sqrt.try_inverse().unwrap_or_else(|| DMatrix::identity(n_cols, n_cols));
                coefficients = b * g_sqrt_inv;
            } else {
                coefficients = b;
            }
        }
    }

    let mut result = ComponentScoreCoefficientMatrix {
        components: std::collections::HashMap::new(),
        variable_order: var_names.clone(),
    };
    for (i, var_name) in var_names.iter().enumerate() {
        if i < coefficients.nrows() {
            let mut row = Vec::with_capacity(n_cols);
            for j in 0..n_cols {
                row.push(coefficients[(i, j)]);
            }
            result.components.insert(var_name.clone(), row);
        }
    }
    Ok(result)
}

// =========================================================================
// FUNGSI 2: Calculate Component Score Covariance Matrix
// =========================================================================
pub fn calculate_component_score_covariance_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<ComponentScoreCovarianceMatrix, String> {

    let is_pca = matches!(config.extraction.method, ExtractionMethod::PrincipalComponents);
    let has_rotation = !config.rotation.none && config.rotation.rotated_sol;
    let is_oblique = config.rotation.oblimin || config.rotation.promax;

    // Untuk Unrotated PCA, output secara matematis selalu Matriks Identitas murni
    if is_pca && (!has_rotation || !is_oblique) {
        let (data_matrix, var_names) = extract_data_matrix(data, config)?;
        let base_matrix = calculate_matrix(&data_matrix, "correlation")?;
        let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
        let cov = DMatrix::<f64>::identity(extraction_result.n_factors, extraction_result.n_factors);
        let mut output = Vec::new();
        for i in 0..cov.nrows() {
            output.push(cov.row(i).iter().cloned().collect());
        }
        return Ok(ComponentScoreCovarianceMatrix { components: output });
    }

    if config.extraction.covariance {
        // ======================================================
        // MODE COVARIANCE (Normal: W^T * Sigma * W)
        // ======================================================
        let coeff_result = calculate_component_score_coefficient_matrix(data, config)?;
        let n_factors = coeff_result.components.values().next().map(|v| v.len()).unwrap_or(0);
        if n_factors == 0 {
            return Err("No factors found for covariance calculation".to_string());
        }

        let (data_matrix, _) = extract_data_matrix(data, config)?;
        let n_vars = coeff_result.variable_order.len();
        let mut w_matrix = DMatrix::<f64>::zeros(n_vars, n_factors);
        
        for (row_idx, var_name) in coeff_result.variable_order.iter().enumerate() {
            if let Some(vals) = coeff_result.components.get(var_name) {
                for (col_idx, &val) in vals.iter().enumerate() {
                    if col_idx < n_factors {
                        w_matrix[(row_idx, col_idx)] = val;
                    }
                }
            }
        }
        
        let cov_matrix = calculate_matrix(&data_matrix, "covariance")?;
        let final_cov = w_matrix.transpose() * cov_matrix * &w_matrix;
        
        let mut output_components = Vec::new();
        for i in 0..final_cov.nrows() {
            let mut row = Vec::new();
            for j in 0..final_cov.ncols() {
                row.push(final_cov[(i, j)]);
            }
            output_components.push(row);
        }
        
        Ok(ComponentScoreCovarianceMatrix { components: output_components })

    } else {
        // ======================================================
        // MODE CORRELATION (Replikasi Cacat Komputasi SPSS: 2.985)
        // Memaksa penggunaan S^T * R_broken^-1 * S
        // ======================================================
        let (data_matrix, var_names) = extract_data_matrix(data, config)?;
        let base_matrix = calculate_matrix(&data_matrix, "correlation")?;
        let extraction_result = extract_factors(&base_matrix, config, &var_names)?;
        let rotation_result = rotate_factors(&extraction_result, config)?;
        
        let pattern_matrix = rotation_result.rotated_loadings.clone();
        let structure_matrix = if let Some(phi) = &rotation_result.factor_correlations {
            &pattern_matrix * phi
        } else {
            pattern_matrix.clone()
        };

        let corr_matrix = calculate_matrix(&data_matrix, "correlation")?;
        
        //  ALGORITMA GAUSS-JORDAN SWEEP 
        let n = corr_matrix.nrows();
        let mut a = corr_matrix.clone();
        let tol = 1e-4; // Batas toleransi IBM SPSS

        for k in 0..n {
            let pivot = a[(k, k)];
            
            // JIKA PIVOT SINGULAR (< 1e-4), dilewati  
            // Baris dan kolom matriks TIDAK dinolkan, meninggalkan sampah komputasi (garbage memory)
            if pivot.abs() >= tol {
                // 1. Bagi baris k dengan pivot
                for j in 0..n {
                    if j != k { a[(k, j)] /= pivot; }
                }
                
                // 2. Eliminasi baris lainnya
                for i in 0..n {
                    if i != k {
                        let factor = a[(i, k)];
                        for j in 0..n {
                            if j != k { a[(i, j)] -= factor * a[(k, j)]; }
                        }
                    }
                }
                
                // 3. Bagi kolom k dengan -pivot
                for i in 0..n {
                    if i != k { a[(i, k)] = -a[(i, k)] / pivot; }
                }
                
                // 4. Inversi elemen pivot utama
                a[(k, k)] = 1.0 / pivot;
            }
        }
        
        // Matriks `a` sekarang adalah invers yang cacat. 
        // Saat dikalikan dengan matriks struktur, ini akan melahirkan nilai meledak seperti 2.985!
        let covariance_matrix = structure_matrix.transpose() * a * structure_matrix;

        let mut output_components = Vec::new();
        for i in 0..covariance_matrix.nrows() {
            let mut row = Vec::new();
            for j in 0..covariance_matrix.ncols() {
                row.push(covariance_matrix[(i, j)]);
            }
            output_components.push(row);
        }

        Ok(ComponentScoreCovarianceMatrix {
            components: output_components,
        })
    }
}

pub fn calculate_factor_scores(
    data: &AnalysisData,
    config: &FactorAnalysisConfig,
    coefficients_matrix: &ComponentScoreCoefficientMatrix,
) -> Result<HashMap<String, Vec<f64>>, String> {
    let (data_matrix, var_names) = extract_data_matrix(data, config)?;
    let n_rows = data_matrix.nrows();
    let n_cols = data_matrix.ncols();
    let mut z_matrix = DMatrix::zeros(n_rows, n_cols);
    for j in 0..n_cols {
        let col = data_matrix.column(j);
        let sum: f64 = col.sum();
        let mean = sum / n_rows as f64;
        let mut sum_sq_diff = 0.0;
        for i in 0..n_rows {
            sum_sq_diff += (col[i] - mean).powi(2);
        }
        let std_dev = (sum_sq_diff / (n_rows as f64 - 1.0)).sqrt();
        let divisor = if std_dev == 0.0 { 1.0 } else { std_dev };
        for i in 0..n_rows {
            z_matrix[(i, j)] = (col[i] - mean) / divisor;
        }
    }

    let n_factors = coefficients_matrix.components.values().next().map(|v| v.len()).unwrap_or(0);
    if n_factors == 0 {
        return Err("No factors found in coefficient matrix".to_string());
    }

    let mut coeff_mat = DMatrix::zeros(n_cols, n_factors);
    for (row_idx, var_name) in var_names.iter().enumerate() {
        if let Some(coeffs) = coefficients_matrix.components.get(var_name) {
            for (col_idx, &val) in coeffs.iter().enumerate() {
                if col_idx < n_factors {
                    coeff_mat[(row_idx, col_idx)] = val;
                }
            }
        }
    }

    let scores_matrix = z_matrix * coeff_mat;
    let mut result_scores = HashMap::new();
    for factor_idx in 0..n_factors {
        let factor_name = format!("FAC{}_1", factor_idx + 1);
        let mut factor_values = Vec::with_capacity(n_rows);
        for row_idx in 0..n_rows {
            factor_values.push(scores_matrix[(row_idx, factor_idx)]);
        }
        result_scores.insert(factor_name, factor_values);
    }
    Ok(result_scores)
}


pub fn create_rotated_component_matrix(
    rotation_result: &RotationResult,
    var_names: &[String]
) -> RotatedComponentMatrix {
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
    RotatedComponentMatrix {
        components,
        variable_order: var_names.to_vec(),
        is_converged: rotation_result.is_converged,               
        iterations_required: rotation_result.iterations_required,
        convergence_value: rotation_result.convergence_value,
    }
}

pub fn create_component_transformation_matrix(
    rotation_result: &RotationResult
) -> ComponentTransformationMatrix {
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
    ComponentTransformationMatrix { components }
}

pub fn create_pattern_matrix(
    rotation_result: &RotationResult,
    var_names: &[String]
) -> PatternMatrix {
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
    PatternMatrix {
        components,
        variable_order: var_names.to_vec(),
        is_converged: rotation_result.is_converged,               
        iterations_required: rotation_result.iterations_required,
        convergence_value: rotation_result.convergence_value,
    }
}

pub fn create_structure_matrix(
    rotation_result: &RotationResult,
    var_names: &[String]
) -> StructureMatrix {
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
    StructureMatrix {
        components,
        variable_order: var_names.to_vec(),
        is_converged: rotation_result.is_converged,               
        iterations_required: rotation_result.iterations_required,
        convergence_value: rotation_result.convergence_value,
    }
}

pub fn create_component_correlation_matrix(
    rotation_result: &RotationResult
) -> ComponentCorrelationMatrix {
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
    ComponentCorrelationMatrix { correlations }
}

// ini cuma kode test aja
#[cfg(test)]
mod tests {
    use super::calculate_total_variance_explained;

    #[test]
    fn total_variance_uses_rotation_values_when_provided() {
        let initial_eigenvalues = vec![3.6998, 2.2083, 1.1612];
        let extraction_eigenvalues = vec![3.6998, 2.2083, 1.1612];
        let rotation_eigenvalues = vec![2.6950, 2.6269, 1.7474];

        let result = calculate_total_variance_explained(
            &initial_eigenvalues,
            &extraction_eigenvalues,
            Some(&rotation_eigenvalues),
            8.0,
            8,
            "correlation",
            false,
            None, 
            None, 
        );

        let block = &result.blocks[0];
        let rotation = block.rotation.as_ref().expect("rotation block must exist");

        assert!((rotation[0].total - 2.6950).abs() < 1e-9);
        assert!((rotation[1].total - 2.6269).abs() < 1e-9);
        assert!((rotation[2].total - 1.7474).abs() < 1e-9);

        assert!((rotation[0].total - block.extraction[0].total).abs() > 1e-6);
        assert!((rotation[1].total - block.extraction[1].total).abs() > 1e-6);
    }

    #[test]
    fn total_variance_rotation_none_when_not_provided() {
        let initial_eigenvalues = vec![3.6998, 2.2083, 1.1612];
        let extraction_eigenvalues = vec![3.6998, 2.2083, 1.1612];

        let result = calculate_total_variance_explained(
            &initial_eigenvalues,
            &extraction_eigenvalues,
            None,
            8.0,
            8,
            "correlation",
            false,
            None,
            None, 
        );

        assert!(result.blocks[0].rotation.is_none());
    }
}