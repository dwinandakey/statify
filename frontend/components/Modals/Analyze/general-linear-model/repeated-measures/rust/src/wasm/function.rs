use wasm_bindgen::prelude::*;

use crate::models::{
    config::RepeatedMeasuresConfig,
    data::AnalysisData,
    result::RepeatedMeasureResult,
};
use crate::stats::core;
use crate::stats::rm_model::RmModel;
use crate::utils::{ converter::{ string_to_js_error, format_result }, error::ErrorCollector };

pub fn run_analysis(
    data: &AnalysisData,
    config: &RepeatedMeasuresConfig,
    error_collector: &mut ErrorCollector
) -> Result<Option<RepeatedMeasureResult>, JsValue> {
    let mut executed_functions = Vec::new();

    // The multivariate GLM model (stats/rm_model.rs) computes the
    // multivariate tests, Mauchly, within-/between-subjects effects,
    // contrasts, univariate tests and descriptives. It reads the
    // between-subjects factors and covariates from config.main
    // (FactorsVar, Covariates).
    let has_between_design = config.main.factors_var.as_ref().map_or(false, |f| !f.is_empty())
        || config.main.covariates.as_ref().map_or(false, |c| !c.is_empty());
    // Within-only designs use the same model when it can be built (one
    // within-subjects factor); otherwise (several within-subjects factors)
    // they keep the earlier per-measure modules.
    let mut rm_model: Option<RmModel> = None;
    let mut rm_model_failed = false;
    if !has_between_design {
        if let Ok(model) = RmModel::build(data, config) {
            executed_functions.push("build_rm_model".to_string());
            if model.excluded > 0 {
                error_collector.add_error(
                    "build_rm_model",
                    &format!("{} subject(s) with missing values were excluded (listwise).", model.excluded)
                );
            }
            rm_model = Some(model);
        }
    } else {
        executed_functions.push("build_rm_model".to_string());
        match RmModel::build(data, config) {
            Ok(model) => {
                if model.excluded > 0 {
                    error_collector.add_error(
                        "build_rm_model",
                        &format!("{} subject(s) with missing values were excluded (listwise).", model.excluded)
                    );
                }
                rm_model = Some(model);
            }
            Err(e) => {
                rm_model_failed = true;
                error_collector.add_error("build_rm_model", &e);
            }
        }
    }

    // Step 1: Calculate within-subjects factors (always executed)
    executed_functions.push("parse_within_subject_factors".to_string());
    let mut within_subjects_factors = None;
    match core::parse_within_subject_factors(data, config) {
        Ok(factors) => {
            within_subjects_factors = Some(factors);
        }
        Err(e) => {
            error_collector.add_error("calculate_within_subjects_factors", &e);
        }
    }

    // Step 2: Descriptive statistics if requested in options
    let mut descriptive_statistics = None;
    if config.options.desc_stats {
        executed_functions.push("calculate_descriptive_statistics".to_string());
        let result = match &rm_model {
            Some(model) => Ok(model.descriptives()),
            None => core::calculate_descriptive_statistics(data, config),
        };
        match result {
            Ok(stats) => {
                descriptive_statistics = Some(stats);
            }
            Err(e) => {
                error_collector.add_error("calculate_descriptive_statistics", &e);
            }
        }
    }

    // Step 3: Homogeneity tests (Options: Homogeneity tests) as SPSS prints
    // them for /PRINT=HOMOGENEITY: Box's M and Levene's test. Bartlett's test
    // of sphericity belongs to the residual SSCP matrix (Options: Residual
    // SSCP matrix), as in SPSS.
    let mut homogeneity_tests = None;
    if config.options.homogen_test {
        executed_functions.push("calculate_homogeneity_tests".to_string());
        match &rm_model {
            Some(model) => match model.homogeneity_tests() {
                Ok(tests) => {
                    if let Some(note) = &tests.box_m_note {
                        error_collector.add_error("calculate_homogeneity_tests", note);
                    }
                    homogeneity_tests = Some(tests);
                }
                Err(e) => error_collector.add_error("calculate_homogeneity_tests", &e),
            },
            None => error_collector.add_error(
                "calculate_homogeneity_tests",
                "Homogeneity tests are not computed: the between-subjects model could not be built"
            ),
        }
    }
    let mut bartlett_test = None;
    if config.options.res_sscp_mat {
        if let Some(model) = &rm_model {
            executed_functions.push("calculate_bartlett_test".to_string());
            match model.bartlett_sphericity() {
                Ok(test) => {
                    bartlett_test = Some(test);
                }
                Err(e) => {
                    error_collector.add_error("calculate_bartlett_test", &e);
                }
            }
        }
    }

    // Step 4: Multivariate tests (always executed)
    let mut multivariate_tests = None;
    executed_functions.push("calculate_multivariate_tests".to_string());
    let result = match &rm_model {
        Some(model) => model.multivariate_tests(),
        None if rm_model_failed => Err("Not computed: the between-subjects model could not be built".to_string()),
        None => core::calculate_multivariate_tests(data, config),
    };
    match result {
        Ok(tests) => {
            multivariate_tests = Some(tests);
        }
        Err(e) => {
            error_collector.add_error("calculate_multivariate_tests", &e);
        }
    }

    // Step 5: Mauchly test
    let mut mauchly_test = None;
    executed_functions.push("calculate_mauchly_test".to_string());
    let result = match &rm_model {
        Some(model) =>
            model.mauchly().map(|(test, problems)| {
                for p in &problems {
                    error_collector.add_error("calculate_mauchly_test", p);
                }
                test
            }),
        None if rm_model_failed => Err("Not computed: the between-subjects model could not be built".to_string()),
        None => core::calculate_mauchly_test(data, config),
    };
    match result {
        Ok(test) => {
            mauchly_test = Some(test);
        }
        Err(e) => {
            error_collector.add_error("calculate_mauchly_test", &e);
        }
    }

    // Step 6: Tests of within-subjects effects
    let mut tests_of_within_subjects_effects = None;
    executed_functions.push("calculate_tests_within_subjects_effects".to_string());
    let result = match (&rm_model, &mauchly_test) {
        (Some(model), Some(mauchly)) => Ok(model.within_effects(mauchly)),
        (Some(_), None) => Err("Not computed: Mauchly's test failed".to_string()),
        (None, _) if rm_model_failed => Err("Not computed: the between-subjects model could not be built".to_string()),
        (None, _) => core::calculate_tests_within_subjects_effects(data, config, &mauchly_test),
    };
    match result {
        Ok(tests) => {
            tests_of_within_subjects_effects = Some(tests);
        }
        Err(e) => {
            error_collector.add_error("calculate_tests_within_subjects_effects", &e);
        }
    }

    // Step 6b: Tests of within-subjects effects, multivariate part (> 1 measure)
    let mut within_subjects_multivariate = None;
    if let Some(model) = &rm_model {
        if let Some(result) = model.averaged_multivariate() {
            executed_functions.push("calculate_within_subjects_multivariate".to_string());
            match result {
                Ok(tests) => {
                    within_subjects_multivariate = Some(tests);
                }
                Err(e) => {
                    error_collector.add_error("calculate_within_subjects_multivariate", &e);
                }
            }
        }
    }

    // Step 7: Tests of within-subjects contrasts
    let mut tests_of_within_subjects_contrasts = None;
    executed_functions.push("calculate_tests_within_subjects_contrasts".to_string());
    let result = match &rm_model {
        Some(model) => model.within_contrasts(),
        None if rm_model_failed => Err("Not computed: the between-subjects model could not be built".to_string()),
        None => core::calculate_tests_within_subjects_contrasts(data, config),
    };
    match result {
        Ok(tests) => {
            tests_of_within_subjects_contrasts = Some(tests);
        }
        Err(e) => {
            error_collector.add_error("calculate_tests_within_subjects_contrasts", &e);
        }
    }

    // Step 8: Tests of between-subjects effects
    let mut tests_of_between_subjects_effects = None;
    executed_functions.push("calculate_between_subjects_effects".to_string());
    let result = match &rm_model {
        Some(model) => Ok(model.between_effects()),
        None if rm_model_failed => Err("Not computed: the between-subjects model could not be built".to_string()),
        None => core::calculate_between_subjects_effects(data, config),
    };
    match result {
        Ok(tests) => {
            tests_of_between_subjects_effects = Some(tests);
        }
        Err(e) => {
            error_collector.add_error("calculate_tests_between_subjects_effects", &e);
        }
    }

    // Step 9: Parameter Estimates if requested in options
    let mut parameter_estimates = None;
    if config.options.param_est {
        executed_functions.push("calculate_parameter_estimates".to_string());
        match core::calculate_parameter_estimates(data, config) {
            Ok(estimates) => {
                parameter_estimates = Some(estimates);
            }
            Err(e) => {
                error_collector.add_error("calculate_parameter_estimates", &e);
            }
        }
    }

    // Step 10: General estimable function if requested in options
    let mut general_estimable_function = None;
    if config.options.general_fun {
        executed_functions.push("calculate_general_estimable_function".to_string());
        match core::calculate_general_estimable_function(data, config) {
            Ok(gef) => {
                general_estimable_function = Some(gef);
            }
            Err(e) => {
                error_collector.add_error("calculate_general_estimable_function", &e);
            }
        }
    }

    // Step 11: Within-subjects SSCP Matrix (not yet implemented)
    let within_subjects_sscp = None;

    // Step 12: Between-subjects SSCP Matrix if requested in options
    let mut between_subjects_sscp = None;
    if config.options.sscp_mat {
        executed_functions.push("calculate_between_subjects_sscp".to_string());
        match core::calculate_between_subjects_sscp(data, config) {
            Ok(sscp) => {
                between_subjects_sscp = Some(sscp);
            }
            Err(e) => {
                error_collector.add_error("calculate_between_subjects_sscp", &e);
            }
        }
    }

    // Step 13: Residual SSCP Matrix if requested in options
    let mut residual_matrix = None;
    if config.options.res_sscp_mat {
        executed_functions.push("calculate_residual_matrix".to_string());
        let result = match &rm_model {
            Some(model) => Ok(model.residual_matrix()),
            None => core::calculate_residual_matrix(data, config),
        };
        match result {
            Ok(matrix) => {
                residual_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_residual_matrix", &e);
            }
        }
    }

    // Step 14: SSCP Matrix if requested
    let mut sscp_matrix = None;
    if config.options.sscp_mat {
        executed_functions.push("calculate_sscp_matrix".to_string());
        match core::calculate_sscp_matrix(data, config) {
            Ok(matrix) => {
                sscp_matrix = Some(matrix);
            }
            Err(e) => {
                error_collector.add_error("calculate_sscp_matrix", &e);
            }
        }
    }

    // Step 15: Univariate tests — only meaningful when between-subjects
    // predictors exist. For a purely within-subjects design the function
    // tries to invert an empty X'X (no factors, no covariates) and fails.
    let mut univariate_tests = None;
    let has_between_factors = config
        .main
        .factors_var
        .as_ref()
        .map_or(false, |f| !f.is_empty());
    let has_covariates = config
        .main
        .covariates
        .as_ref()
        .map_or(false, |c| !c.is_empty());
    if has_between_factors || has_covariates {
        executed_functions.push("calculate_univariate_tests".to_string());
        let result = match &rm_model {
            Some(model) => Ok(model.univariate_tests()),
            None if rm_model_failed => Err("Not computed: the between-subjects model could not be built".to_string()),
            None => core::calculate_univariate_tests(data, config),
        };
        match result {
            Ok(tests) => {
                univariate_tests = Some(tests);
            }
            Err(e) => {
                error_collector.add_error("calculate_univariate_tests", &e);
            }
        }
    }

    // Step 17: Post-hoc tests if requested
    let mut posthoc_tests = None;
    if let Some(fix_factor_vars) = &config.posthoc.fix_factor_vars {
        if !fix_factor_vars.is_empty() {
            executed_functions.push("calculate_posthoc_tests".to_string());
            match core::calculate_posthoc_tests(data, config) {
                Ok(tests) => {
                    posthoc_tests = Some(tests);
                }
                Err(e) => {
                    error_collector.add_error("calculate_posthoc_tests", &e);
                }
            }
        }
    }

    // Step 18: Estimated Marginal Means if requested. The model computes
    // them per measure like SPSS (and pairwise comparisons when "Compare main
    // effects" is set); targets it cannot compute are reported, never a panic.
    let mut emmeans = None;
    let mut emmeans_pairwise = None;
    if let Some(target_list) = &config.emmeans.target_list {
        if !target_list.is_empty() {
            executed_functions.push("calculate_emmeans".to_string());
            match &rm_model {
                Some(model) => {
                    match model.emmeans(target_list, config.emmeans.comp_main_effect, config.emmeans.confi_interval_method.as_ref()) {
                        Ok((means, pairs, problems)) => {
                            for problem in problems {
                                error_collector.add_error("calculate_emmeans", &problem);
                            }
                            if !means.is_empty() {
                                emmeans = Some(means);
                            }
                            if !pairs.is_empty() {
                                emmeans_pairwise = Some(pairs);
                            }
                        }
                        Err(e) => error_collector.add_error("calculate_emmeans", &e),
                    }
                }
                None if rm_model_failed => {
                    error_collector.add_error("calculate_emmeans", "Not computed: the between-subjects model could not be built");
                }
                None => {
                    error_collector.add_error(
                        "calculate_emmeans",
                        "Estimated marginal means are not supported for designs with more than one within-subjects factor yet"
                    );
                }
            }
        }
    }

    // Create the final result
    let result = RepeatedMeasureResult {
        within_subjects_factors,
        descriptive_statistics,
        bartlett_test,
        homogeneity_tests,
        multivariate_tests,
        mauchly_test,
        tests_of_within_subjects_effects,
        within_subjects_multivariate,
        tests_of_within_subjects_contrasts,
        tests_of_between_subjects_effects,
        parameter_estimates,
        general_estimable_function,
        within_subjects_sscp,
        between_subjects_sscp,
        residual_matrix,
        sscp_matrix,
        univariate_tests,
        posthoc_tests,
        emmeans,
        emmeans_pairwise,
        executed_functions,
    };

    Ok(Some(result))
}

pub fn get_results(result: &Option<RepeatedMeasureResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => Ok(serde_wasm_bindgen::to_value(result).unwrap()),
        None => Err(string_to_js_error("No analysis results available".to_string())),
    }
}

pub fn get_formatted_results(result: &Option<RepeatedMeasureResult>) -> Result<JsValue, JsValue> {
    format_result(result)
}

pub fn get_executed_functions(result: &Option<RepeatedMeasureResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => Ok(serde_wasm_bindgen::to_value(&result.executed_functions).unwrap()),
        None => Err(string_to_js_error("No analysis has been performed".to_string())),
    }
}

pub fn get_all_errors(error_collector: &ErrorCollector) -> JsValue {
    JsValue::from_str(&error_collector.get_error_summary())
}

pub fn clear_errors(error_collector: &mut ErrorCollector) -> JsValue {
    error_collector.clear();
    JsValue::from_str("Error collector cleared")
}
