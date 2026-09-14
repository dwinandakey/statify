// perbaikan 15/1/2026
// perbaikan bisa (9/1/2026)

// Peran function.rs itu orchestrator / pipeline, bukan formatter dan bukan UI adapter.

use wasm_bindgen::prelude::*;
use crate::models::{
    config::{FactorAnalysisConfig, ExtractionStatus},
    data::AnalysisData,
    result::{FactorAnalysisResult, AnalysisStatus},
};
use crate::stats::core;
use crate::utils::converter::format_result;
use crate::utils::{ converter::string_to_js_error, error::ErrorCollector };

// =========================================================================
// HELPER: Detect Data Quality Issues (Near-Constant or Extreme Variance Variables)
// =========================================================================
fn detect_data_quality_warnings(data: &AnalysisData) -> Vec<String> {
    let mut warnings = Vec::new();
    
    if data.target_data.is_empty() || data.target_data[0].is_empty() {
        return warnings;
    }
    
    let first_row = &data.target_data[0];
    if first_row.is_empty() {
        return warnings;
    }
    
    // Get variable names from target_data_defs
    let var_names: Vec<String> = if !data.target_data_defs.is_empty() && !data.target_data_defs[0].is_empty() {
        data.target_data_defs[0].iter().map(|def| def.name.clone()).collect()
    } else {
        (0..first_row[0].values.len()).map(|i| format!("Var{}", i + 1)).collect()
    };
    
    // Check each variable (column)
    for (var_idx, var_name) in var_names.iter().enumerate() {
        let mut col_values = Vec::new();
        
        // Extract column values from all rows
        for row in &data.target_data {
            if var_idx < row.len() {
                if let Some(value) = row[var_idx].values.get(var_name.as_str()) {
                    if let crate::models::data::DataValue::Number(val) = value {
                        col_values.push(*val);
                    }
                }
            }
        }
        
        if col_values.is_empty() {
            continue;
        }
        
        // Calculate mean and variance
        let n = col_values.len() as f64;
        let mean: f64 = col_values.iter().sum::<f64>() / n;
        let variance: f64 = col_values.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f64>() / n.max(1.0);
        let std_dev = variance.sqrt();
        
        // Detect near-constant variables (std dev < 0.001)
        if std_dev < 0.001 && std_dev > 0.0 {
            warnings.push(format!(
                "Variable '{}' has very small variance (SD={:.6}). This may cause singularity issues.",
                var_name, std_dev
            ));
        } else if std_dev == 0.0 {
            warnings.push(format!(
                "Variable '{}' is constant (no variance). This will cause singularity in the matrix.",
                var_name
            ));
        }
        
        // Detect extreme variance (std dev > 1000)
        if std_dev > 1000.0 {
            warnings.push(format!(
                "Variable '{}' has extreme variance (SD={:.2}). Check for outliers or data scaling issues.",
                var_name, std_dev
            ));
        }
    }
    
    warnings
}

pub fn run_analysis(
    data: &AnalysisData,
    config: &FactorAnalysisConfig,
    error_collector: &mut ErrorCollector
) -> Result<Option<FactorAnalysisResult>, JsValue> {
    web_sys::console::log_1(&"Starting factor analysis".into());

    // Initialize result with executed functions tracking
    let mut executed_functions = Vec::new();

    // Log configuration to track which methods will be executed
    web_sys::console::log_1(&format!("Config: {:?}", config).into());

    // Filter Data based on value target if present
    let filtered_data = match core::filter_valid_cases(data, config) {
        Ok(filtered) => filtered,
        Err(e) => {
            error_collector.add_error("filter_valid_cases", &e);
            return Err(string_to_js_error(e));
        }
    };

    // Step 1: Calculate Descriptive Statistics if requested
    let mut descriptive_statistics = None;
    if config.descriptives.univar_desc {
        executed_functions.push("calculate_descriptive_statistics".to_string());
        match core::calculate_descriptive_statistics(&filtered_data, config) {
            Ok(stats) => {
                descriptive_statistics = Some(stats);
            }
            Err(e) => {
                error_collector.add_error("calculate_descriptive_statistics", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 2: Calculate Correlation Matrix (always calculated)
    let mut correlation_matrix = None;
    executed_functions.push("calculate_correlation_matrix".to_string());
    match core::calculate_correlation_matrix(&filtered_data, config) {
        Ok(matrix) => {
            correlation_matrix = Some(matrix);
        }
        Err(e) => {
            error_collector.add_error("calculate_correlation_matrix", &e);
            // Continue execution despite errors for non-critical functions
        }
    }

    // Step 2b: Calculate Covariance Matrix if selected
    let mut covariance_matrix = None;
    if config.extraction.covariance {
        executed_functions.push("calculate_covariance_matrix".to_string());
        match core::calculate_covariance_matrix(&filtered_data, config) {
            Ok(matrix) => {
                covariance_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_covariance_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 3: Calculate Inverse Correlation Matrix if requested
    let mut inverse_correlation_matrix = None;
    if config.descriptives.inverse && config.extraction.correlation {
        executed_functions.push("calculate_inverse_correlation_matrix".to_string());
        match core::calculate_inverse_correlation_matrix(&filtered_data, config) {
            Ok(matrix) => {
                inverse_correlation_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_inverse_correlation_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 3b: Calculate Inverse Covariance Matrix if requested
    let mut inverse_covariance_matrix = None;
    if config.descriptives.inverse && config.extraction.covariance {
        executed_functions.push("calculate_inverse_covariance_matrix".to_string());
        match core::calculate_inverse_covariance_matrix(&filtered_data, config) {
            Ok(matrix) => {
                inverse_covariance_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_inverse_covariance_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 4: Calculate KMO and Bartlett's Test if requested
    let mut kmo_bartletts_test = None;
    if config.descriptives.kmo {
        executed_functions.push("calculate_kmo_bartletts_test".to_string());
        match core::calculate_kmo_bartletts_test(&filtered_data, config) {
            Ok(test) => {
                kmo_bartletts_test = Some(test);
            }
            Err(e) => {
                error_collector.add_error("calculate_kmo_bartletts_test", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 5: Calculate Anti-Image Matrices if requested
    let mut anti_image_matrices = None;
    if config.descriptives.anti_image {
        executed_functions.push("calculate_anti_image_matrices".to_string());
        match core::calculate_anti_image_matrices(&filtered_data, config) {
            Ok(matrices) => {
                anti_image_matrices = Some(matrices);
            }
            Err(e) => {
                error_collector.add_error("calculate_anti_image_matrices", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 6: Calculate Communalities
    executed_functions.push("calculate_communalities".to_string());
    let communalities = match core::calculate_communalities(&filtered_data, config) {
        Ok(communalities) => Some(communalities),
        Err(e) => {
            error_collector.add_error("calculate_communalities", &e);
            None
        }
    };

    // Step 7: Calculate Total Variance Explained
    executed_functions.push("calculate_total_variance_explained".to_string());
    let total_variance_explained =
    match core::calculate_total_variance_explained_from_data(&filtered_data, config) {
        Ok(variance) => Some(variance),
        Err(e) => {
            error_collector.add_error("calculate_total_variance_explained", &e);
            None
        }
    };

    // Step 8: Calculate Factor/Component Matrix
    executed_functions.push("calculate_component_matrix".to_string());
    let component_matrix = match core::calculate_component_matrix(&filtered_data, config) {
        Ok(matrix) => Some(matrix),
        Err(e) => {
            error_collector.add_error("calculate_component_matrix", &e);
            None
        }
    };

    let extracted_factors = component_matrix
        .as_ref()
        .map(|matrix| {
            matrix
                .components
                .values()
                .next()
                .map(|values| values.len())
                .unwrap_or(0)
        })
        .unwrap_or(0);

    let communalities_allow_extraction = communalities
        .as_ref()
        .map(|communalities| !communalities.suppress_extraction)
        .unwrap_or(true);

    let _has_heywood_case = communalities
        .as_ref()
        .map(|communalities| communalities.heywood_warning_flag)
        .unwrap_or(false);

    let is_converged = extracted_factors > 0 && communalities_allow_extraction;
    let render_late_outputs = is_converged;
    let rotation_requested = !config.rotation.none && config.rotation.rotated_sol;
    let can_rotate = render_late_outputs && rotation_requested && extracted_factors > 1;
    let mut is_rotation_converged = true;

    // Step 9: Calculate Scree Plot if requested
    let mut scree_plot = None;
    if config.extraction.scree {
        executed_functions.push("calculate_scree_plot".to_string());
        match core::calculate_scree_plot(&filtered_data, config) {
            Ok(plot) => {
                scree_plot = Some(plot);
            }
            Err(e) => {
                error_collector.add_error("calculate_scree_plot", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 10: Calculate Reproduced Correlations or Covariances based on extraction type
    let mut reproduced_correlations = None;
    let mut reproduced_covariances = None;
    if config.descriptives.reproduced {
        if config.extraction.correlation {
            executed_functions.push("calculate_reproduced_correlations".to_string());
            match core::calculate_reproduced_correlations(&filtered_data, config) {
                Ok(correlations) => {
                    reproduced_correlations = Some(correlations);
                }
                Err(e) => {
                    error_collector.add_error("calculate_reproduced_correlations", &e);
                    // Continue execution despite errors for non-critical functions
                }
            }
        } else if config.extraction.covariance {
            executed_functions.push("calculate_reproduced_covariances".to_string());
            match core::calculate_reproduced_covariances(&filtered_data, config) {
                Ok(covariances) => {
                    reproduced_covariances = Some(covariances);
                }
                Err(e) => {
                    error_collector.add_error("calculate_reproduced_covariances", &e);
                    // Continue execution despite errors for non-critical functions
                }
            }
        }
    }

  
    // Step 11: Calculate Rotated Component Matrix if not using 'None' rotation method
    let mut rotated_component_matrix = None;
    if can_rotate {
        executed_functions.push("calculate_rotated_component_matrix".to_string());
        match core::calculate_rotated_component_matrix(&filtered_data, config) {
            Ok(matrix) => {
                if !matrix.is_converged {
                    is_rotation_converged = false; // --- UPDATE STATUS KONVERGENSI ---
                }
                rotated_component_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_rotated_component_matrix", &e);
            }
        }
    }

    // Step 12: Calculate Component Transformation Matrix if rotation is performed
    let mut component_transformation_matrix = None;
    if can_rotate {
        executed_functions.push("calculate_component_transformation_matrix".to_string());
        match core::calculate_component_transformation_matrix(&filtered_data, config) {
            Ok(matrix) => {
                component_transformation_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_component_transformation_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 12a: Calculate Pattern Matrix if oblique rotation is performed
    let mut pattern_matrix = None;
    if can_rotate && (config.rotation.oblimin || config.rotation.promax) {
        executed_functions.push("calculate_pattern_matrix".to_string());
        match core::calculate_pattern_matrix(&filtered_data, config) {
            Ok(matrix) => {
                if !matrix.is_converged {
                    is_rotation_converged = false; //  UPDATE STATUS KONVERGENSI 
                }
                pattern_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_pattern_matrix", &e);
            }
        }
    }


    // Step 12b: Calculate Structure Matrix if oblique rotation is performed
    let mut structure_matrix = None;
    if can_rotate && (config.rotation.oblimin || config.rotation.promax) {
        executed_functions.push("calculate_structure_matrix".to_string());
        match core::calculate_structure_matrix(&filtered_data, config) {
            Ok(matrix) => {
                if !matrix.is_converged {
                    is_rotation_converged = false; //  UPDATE STATUS KONVERGENSI 
                }
                structure_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_structure_matrix", &e);
            }
        }
    }

    // Step 12c: Calculate Component Correlation Matrix if oblique rotation is performed
    let mut component_correlation_matrix = None;
    if can_rotate && (config.rotation.oblimin || config.rotation.promax) {
        executed_functions.push("calculate_component_correlation_matrix".to_string());
        match core::calculate_component_correlation_matrix(&filtered_data, config) {
            Ok(matrix) => {
                component_correlation_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_component_correlation_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    //  EVALUASI DIAGNOSTIC ENGINE SEBELUM MEMBUAT STATUS  
    let mut actual_status = String::from("Success");
    let mut warning_msg = None;
    let mut is_converged = true; 
    let mut has_heywood_case = false;

    if let Ok((data_matrix, var_names)) = core::extract_data_matrix(&filtered_data, config) {
        let matrix_type = if config.extraction.covariance { "covariance" } else { "correlation" };
        
        if let Ok(base_matrix) = core::calculate_matrix(&data_matrix, matrix_type) {
            if let Ok(ext_result) = core::extract_factors(&base_matrix, config, &var_names) {
                
                // 1. Ambil nama enum asli dan pesan peringatan
                actual_status = format!("{:?}", ext_result.extraction_status);
                warning_msg = ext_result.warning_message;
                
                // 2. Ambil flag heywood murni
                has_heywood_case = ext_result.has_heywood_case;
                
                // 3. KUNCI: is_converged HANYA true jika Success atau HeywoodWarning
                is_converged = matches!(
                    ext_result.extraction_status,
                    ExtractionStatus::Success | ExtractionStatus::HeywoodWarning
                );
            }
        }
    }

    // Gunakan is_converged yang didapat dari engine untuk dikirim ke UI
    // PERBAIKAN: Tambahkan data quality warnings
    let data_quality_warnings = detect_data_quality_warnings(&filtered_data);
    let analysis_status = Some(AnalysisStatus {
        is_converged,
        extracted_factors,
        terminated_early: !is_converged,
        termination_reason: warning_msg,
        has_heywood_case,
        extraction_status: Some(actual_status),
        data_quality_warnings: if data_quality_warnings.is_empty() { None } else { Some(data_quality_warnings) },
    });

    let goodness_of_fit_test = if is_converged {
        if matches!(
            config.extraction.method,
            crate::models::config::ExtractionMethod::GeneralizedLeastSquares
                | crate::models::config::ExtractionMethod::MaximumLikelihood
        ) {
            executed_functions.push("calculate_goodness_of_fit_test".to_string());

            if matches!(
                config.extraction.method,
                crate::models::config::ExtractionMethod::GeneralizedLeastSquares
            ) {
                match core::calculate_goodness_of_fit_test(&filtered_data, config) {
                    Ok(test) => Some(test),
                    Err(e) => {
                        error_collector.add_error("calculate_goodness_of_fit_test", &e);
                        None
                    }
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    // Inisialisasi variabel untuk menampung skor akhir (nilai per responden)
    let mut factor_scores = None;

    // Step 13: Calculate Component Score Coefficient Matrix
    // Matrix diperlukan untuk 2 kebutuhan:
    // 1) DisplayFactor: tampilkan tabel coefficient/covariance matrix
    // 2) SaveVar: hitung factor scores untuk disimpan sebagai variabel baru
    let mut component_score_coefficient_matrix = None;
    if render_late_outputs && (config.scores.display_factor || config.scores.save_var) && is_rotation_converged {
        executed_functions.push("calculate_component_score_coefficient_matrix".to_string());
        match core::calculate_component_score_coefficient_matrix(&filtered_data, config) {
            Ok(matrix) => {
                // Simpan matriks ke hasil hanya saat user meminta ditampilkan.
                if config.scores.display_factor {
                    component_score_coefficient_matrix = Some(matrix.clone());
                }

                // Hitung factor scores hanya saat user meminta Save as variables.
                if config.scores.save_var {
                    executed_functions.push("calculate_factor_scores".to_string());
                    match core::calculate_factor_scores(&filtered_data, config, &matrix) {
                        Ok(scores) => {
                            factor_scores = Some(scores);
                            web_sys::console::log_1(&"Factor scores calculated successfully".into());
                        }
                        Err(e) => {
                            error_collector.add_error("calculate_factor_scores", &e);
                        }
                    }
                }
            }

            Err(e) => {
                error_collector.add_error("calculate_component_score_coefficient_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Step 14: Calculate Component Score Covariance Matrix only when display is requested
    let mut component_score_covariance_matrix = None;
    if render_late_outputs && config.scores.display_factor && is_rotation_converged{
        executed_functions.push("calculate_component_score_covariance_matrix".to_string());
        match core::calculate_component_score_covariance_matrix(&filtered_data, config) {
            Ok(matrix) => {
                component_score_covariance_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_component_score_covariance_matrix", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    let mut result = FactorAnalysisResult {
    descriptive_statistics,
    scree_plot,
    correlation_matrix,
    inverse_correlation_matrix,
    covariance_matrix,
    inverse_covariance_matrix,
    kmo_bartletts_test,
    anti_image_matrices,
    communalities,
    total_variance_explained,
    component_matrix,
    reproduced_correlations,
    reproduced_covariances,
    rotated_component_matrix,
    component_transformation_matrix,
    pattern_matrix,
    structure_matrix,
    component_correlation_matrix,
    analysis_status,
    goodness_of_fit_test,
    component_score_coefficient_matrix,
    component_score_covariance_matrix,
    factor_scores,
    loading_plot: None,
};

if config.rotation.loading_plot && render_late_outputs {
    executed_functions.push("generate_loading_plots".to_string());
    match core::generate_loading_plots(&result) {
        Ok(plot) => {
            result.loading_plot = Some(plot);
        }
        Err(e) => {
            error_collector.add_error("generate_loading_plots", &e);
        }
    }
}

Ok(Some(result))

}

pub fn get_results(result: &Option<FactorAnalysisResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => Ok(serde_wasm_bindgen::to_value(result).unwrap()),
        None => Err(string_to_js_error("No analysis results available".to_string())),
    }
}

pub fn get_formatted_results(result: &Option<FactorAnalysisResult>, config: &FactorAnalysisConfig) -> Result<JsValue, JsValue> {
    format_result(result, config)
}

pub fn get_all_errors(error_collector: &ErrorCollector) -> JsValue {
    JsValue::from_str(&error_collector.get_error_summary())
}

pub fn clear_errors(error_collector: &mut ErrorCollector) -> JsValue {
    error_collector.clear();
    JsValue::from_str("Error collector cleared")
}
