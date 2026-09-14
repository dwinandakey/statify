use wasm_bindgen::prelude::*;

use crate::models::{
    config::DiscriminantConfig,
    data::AnalysisData,
    result::DiscriminantResult,
};
use crate::stats::core;
use crate::utils::converter::format_result;
use crate::utils::log::FunctionLogger;
use crate::utils::{ converter::string_to_js_error, error::ErrorCollector };

pub fn run_analysis(
    data: &AnalysisData,
    config: &DiscriminantConfig,
    error_collector: &mut ErrorCollector,
    logger: &mut FunctionLogger
) -> Result<Option<DiscriminantResult>, JsValue> {
    web_sys::console::log_1(&"Starting discriminant analysis".into());

    // Reset the per-analysis stepwise-selection cache so this run never reuses a
    // selection from a previous analysis in the same worker instance.
    core::clear_selected_vars_cache();

    // Log configuration to track which methods will be executed
    web_sys::console::log_1(&format!("Config: {:?}", config).into());

    // Log data to track the input data
    web_sys::console::log_1(&format!("Data: {:?}", data).into());

    // Step 1: Basic processing summary (always executed)
    logger.add_log("basic_processing_summary");
    let processing_summary = match core::basic_processing_summary(data, config) {
        Ok(summary) => summary,
        Err(e) => {
            error_collector.add_error("basic_processing_summary", &e);
            return Err(string_to_js_error(e));
        }
    };

    web_sys::console::log_1(&format!("Processing Summary: {:?}", processing_summary).into());

    // Filter Data
    let filtered_data = match core::filter_valid_cases(data, config) {
        Ok(filtered) => filtered,
        Err(e) => {
            error_collector.add_error("filter_valid_cases", &e);
            return Err(string_to_js_error(e));
        }
    };

    web_sys::console::log_1(&format!("Filtered Data: {:?}", filtered_data).into());

    // Step 2: Group statistics if requested
    let mut group_statistics = None;
    logger.add_log("calculate_group_statistics");
    match core::calculate_group_statistics(&filtered_data, config) {
        Ok(stats) => {
            group_statistics = Some(stats);
            web_sys::console::log_1(&format!("Group Statistics: {:?}", group_statistics).into());
        }
        Err(e) => {
            error_collector.add_error("calculate_group_statistics", &e);
            // Continue execution despite errors for non-critical functions
        }
    }

    // Step 3: Equality tests if requested
    let mut equality_tests = None;
    if config.statistics.anova {
        logger.add_log("calculate_equality_tests");
        match core::calculate_equality_tests(&filtered_data, config) {
            Ok(tests) => {
                equality_tests = Some(tests);
                web_sys::console::log_1(&format!("Equaltiy Test: {:?}", equality_tests).into());
            }
            Err(e) => {
                error_collector.add_error("calculate_equality_tests", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    // Step 5: Pooled matrices if requested
    let mut pooled_matrices = None;
    if config.statistics.wg_correlation || config.statistics.wg_covariance {
        logger.add_log("calculate_pooled_matrices");
        match core::calculate_pooled_matrices(&filtered_data, config) {
            Ok(matrices) => {
                pooled_matrices = Some(matrices);
                web_sys::console::log_1(&format!("Pooled Matrices: {:?}", pooled_matrices).into());
            }
            Err(e) => {
                error_collector.add_error("calculate_pooled_matrices", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    // Step 6: Covariance matrices if requested
    let mut covariance_matrices = None;
    if config.statistics.sg_covariance || config.statistics.total_covariance {
        logger.add_log("calculate_covariance_matrices");
        match core::calculate_covariance_matrices(&filtered_data, config) {
            Ok(matrices) => {
                covariance_matrices = Some(matrices);
                web_sys::console::log_1(
                    &format!("Covariance Matrices: {:?}", covariance_matrices).into()
                );
            }
            Err(e) => {
                error_collector.add_error("calculate_covariance_matrices", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    // Step 7: Log determinants if Box's M test is requested
    let mut log_determinants = None;
    let mut box_m_test = None;
    if config.statistics.box_m {
        logger.add_log("calculate_log_determinants");
        match core::calculate_log_determinants(&filtered_data, config) {
            Ok(determinants) => {
                log_determinants = Some(determinants);
                web_sys::console::log_1(
                    &format!("Log Determinants: {:?}", log_determinants).into()
                );
            }
            Err(e) => {
                error_collector.add_error("calculate_log_determinants", &e);
                // Continue execution despite errors for non-critical functions
            }
        }

        logger.add_log("calculate_box_m_test");
        match core::calculate_box_m_test(&filtered_data, config) {
            Ok(test) => {
                box_m_test = Some(test);
                web_sys::console::log_1(&format!("Box M: {:?}", box_m_test).into());
            }
            Err(e) => {
                error_collector.add_error("calculate_box_m_test", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    // Step 8: If stepwise analysis is requested
    let mut stepwise_statistics = None;
    let mut wilks_lambda_test = None;

    if config.main.stepwise {
        // Stepwise statistics
        logger.add_log("calculate_stepwise_statistics");
        match core::calculate_stepwise_statistics(&filtered_data, config) {
            Ok(statistics) => {
                // Prime the cache from this single stepwise run so eigen/canonical/
                // structure/wilks/casewise/classification reuse the selection instead
                // of recomputing the whole procedure.
                core::prime_selected_vars_cache(core::select_final_variables(&statistics, config));
                stepwise_statistics = Some(statistics);
                web_sys::console::log_1(
                    &format!("Stepwise Statistics: {:?}", stepwise_statistics).into()
                );
            }
            Err(e) => {
                error_collector.add_error("calculate_stepwise_statistics", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }

    // Eigen Values
    logger.add_log("calculate_eigen_values");
    let eigen_description = match core::calculate_eigen_statistics(&filtered_data, config) {
        Ok(values) => {
            web_sys::console::log_1(&format!("Eigen Values: {:?}", values).into());
            Some(values)
        }
        Err(e) => {
            error_collector.add_error("calculate_eigen_values", &e);
            return Err(string_to_js_error(e));
        }
    };

    // Wilks' Lambda test
    logger.add_log("calculate_wilks_lambda_test");
    match core::calculate_wilks_lambda_test(&filtered_data, config) {
        Ok(test) => {
            wilks_lambda_test = Some(test);
            web_sys::console::log_1(&format!("Wilks' Lambda Test: {:?}", wilks_lambda_test).into());
        }
        Err(e) => {
            error_collector.add_error("calculate_wilks_lambda_test", &e);
            // Continue execution despite errors for non-critical functions
        }
    }

    // Step 9: Calculate canonical functions (always executed)
    logger.add_log("calculate_canonical_functions");
    let canonical_functions = match core::calculate_canonical_functions(&filtered_data, config) {
        Ok(functions) => {
            web_sys::console::log_1(&format!("Canonical Functions: {:?}", functions).into());
            Some(functions)
        }
        Err(e) => {
            error_collector.add_error("calculate_canonical_functions", &e);
            return Err(string_to_js_error(e));
        }
    };

    // Step 10: Calculate structure matrix
    logger.add_log("calculate_structure_matrix");
    let structure_matrix = match core::calculate_structure_matrix(&filtered_data, config) {
        Ok(matrix) => {
            web_sys::console::log_1(&format!("Structure Matrix: {:?}", matrix).into());
            Some(matrix)
        }
        Err(e) => {
            error_collector.add_error("calculate_structure_matrix", &e);
            None
        }
    };

    // Step 11: Classification results if requested
    let mut classification_function_coefficients = None;
    let mut prior_probabilities = None;
    // Prior Probabilities for Groups accompany any classification output, so
    // compute them whenever a summary, casewise, or leave-one-out table is asked for.
    if config.classify.summary || config.classify.case || config.classify.leave {
        logger.add_log("calculate_prior_probabilities");
        match core::calculate_prior_probabilities(&filtered_data, config) {
            Ok(probabilities) => {
                prior_probabilities = Some(probabilities);
                web_sys::console::log_1(
                    &format!("Prior Probabilities: {:?}", prior_probabilities).into()
                );
            }
            Err(e) => {
                error_collector.add_error("calculate_prior_probabilities", &e);
                // Continue execution despite errors for non-critical functions
            }
        }
    }
    if config.classify.summary {
        logger.add_log("calculate_summary_classification");
        match core::calculate_summary_classification(&filtered_data, config) {
            Ok(functions) => {
                classification_function_coefficients = Some(functions);
                web_sys::console::log_1(
                    &format!(
                        "Summary Classification: {:?}",
                        classification_function_coefficients
                    ).into()
                );
            }
            Err(e) => {
                error_collector.add_error("calculate_summary_classification", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    let mut casewise_statistics = None;
    if config.classify.case {
        logger.add_log("Casewise Statistics");
        match core::calculate_casewise_statistics(&filtered_data, config) {
            Ok(stats) => {
                casewise_statistics = Some(stats);
                web_sys::console::log_1(
                    &format!("Casewise Statistics: {:?}", casewise_statistics).into()
                );
            }
            Err(e) => {
                error_collector.add_error("calculate_casewise_statistics", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    // Compute lightweight scatter data for plot rendering when case==false
    // but the user wants scatter plots (combine or sep_grp checked).
    let mut scatter_data = None;
    if !config.classify.case && (config.classify.combine || config.classify.sep_grp) {
        match core::calculate_scatter_data(&filtered_data, config) {
            Ok(sd) => {
                scatter_data = Some(sd);
            }
            Err(e) => {
                error_collector.add_error("calculate_scatter_data", &e);
            }
        }
    }

    // Bootstrap resampling. Holds the selected model fixed (reuses the cached
    // selection) and refits the canonical coefficients directly on each resample,
    // so it neither re-runs stepwise nor disturbs the cache.
    // Bootstrap applies only to "enter independents together"; it is never run
    // under the stepwise method even if a stale config flag lingers.
    let mut bootstrap_results = None;
    if config.bootstrap.perform_boot_strapping && !config.main.stepwise {
        logger.add_log("calculate_bootstrap");
        match core::calculate_bootstrap(&filtered_data, config) {
            Ok(b) => {
                bootstrap_results = Some(b);
            }
            Err(e) => {
                error_collector.add_error("calculate_bootstrap", &e);
            }
        }
    }

    // Pre-results assumption checks (multicollinearity, multivariate &
    // univariate normality). Computed once from the filtered data;
    // each table carries its own PASS/VIOLATED warning to the output.
    let mut assumption_results = None;
    let want_assumptions = config.assumptions.multicollinearity
        || config.assumptions.multivariate_normality
        || config.assumptions.univariate_normality;
    if want_assumptions {
        logger.add_log("calculate_assumptions");
        match core::calculate_assumptions(&filtered_data, config) {
            Ok(a) => {
                assumption_results = Some(a);
            }
            Err(e) => {
                error_collector.add_error("calculate_assumptions", &e);
            }
        }
    }

    let mut classification_results = None;
    if config.classify.leave {
        logger.add_log("calculate_classification_results");
        match core::calculate_classification_results(&filtered_data, config) {
            Ok(results) => {
                web_sys::console::log_1(&format!("Classification Results: {:?}", results).into());
                classification_results = Some(results);
            }
            Err(e) => {
                error_collector.add_error("calculate_classification_results", &e);
                // Continue execution despite errors for non-critical functions
            }
        };
    }

    // Create the final result
    let result = DiscriminantResult {
        processing_summary,
        group_statistics,
        equality_tests,
        canonical_functions,
        structure_matrix,
        classification_results,
        box_m_test,
        pooled_matrices,
        covariance_matrices,
        log_determinants,
        stepwise_statistics,
        eigen_description,
        wilks_lambda_test,
        casewise_statistics,
        prior_probabilities,
        classification_function_coefficients,
        discriminant_histograms: None,
        scatter_data,
        bootstrap_results,
        assumption_results,
        territorial_map: config.classify.terr,
    };

    Ok(Some(result))
}

pub fn get_results(result: &Option<DiscriminantResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => {
            if let Some(ref step_stats) = result.stepwise_statistics {
                web_sys::console::log_1(&format!(
                    "[get_results] min_d_squared: {:?}, len={}",
                    step_stats.min_d_squared,
                    step_stats.min_d_squared.len()
                ).into());
            }
            let js_val = serde_wasm_bindgen::to_value(result).unwrap();
            web_sys::console::log_1(&format!("[get_results] serialized").into());
            Ok(js_val)
        }
        None => Err(string_to_js_error("No analysis results available".to_string())),
    }
}

pub fn get_formatted_results(result: &Option<DiscriminantResult>) -> Result<JsValue, JsValue> {
    format_result(result)
}

pub fn get_all_errors(error_collector: &ErrorCollector) -> JsValue {
    JsValue::from_str(&error_collector.get_error_summary())
}

pub fn get_all_log(logger: &FunctionLogger) -> Result<JsValue, JsValue> {
    Ok(serde_wasm_bindgen::to_value(&logger.get_executed_functions()).unwrap_or(JsValue::NULL))
}
