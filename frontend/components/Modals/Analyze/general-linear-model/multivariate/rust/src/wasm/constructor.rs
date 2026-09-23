use wasm_bindgen::prelude::*;

use crate::models::{
    config::MultivariateConfig,
    data::{ AnalysisData, DataRecord, DataValue, VariableDefinition },
    result::MultivariateResult,
};
use crate::stats::common::merge_records;
use crate::utils::{ converter::string_to_js_error, error::ErrorCollector };
use crate::utils::log::FunctionLogger;
use crate::wasm::function;

#[wasm_bindgen]
pub struct MultivariateAnalysis {
    config: MultivariateConfig,
    data: AnalysisData,
    result: Option<MultivariateResult>,
    error_collector: ErrorCollector,
    logger: FunctionLogger,
}

#[wasm_bindgen]
impl MultivariateAnalysis {
    #[wasm_bindgen(constructor)]
    pub fn new(
        dep_data: JsValue,
        fix_factor_data: JsValue,
        covar_data: JsValue,
        wls_data: JsValue,
        dep_data_defs: JsValue,
        fix_factor_data_defs: JsValue,
        covar_data_defs: JsValue,
        wls_data_defs: JsValue,
        config_data: JsValue
    ) -> Result<MultivariateAnalysis, JsValue> {
        // Initialize error collector
        let mut error_collector = ErrorCollector::default();

        // Initialize function logger
        let logger = FunctionLogger::default();

        // Parse input data using serde_wasm_bindgen
        let dependent_data: Vec<Vec<DataRecord>> = match serde_wasm_bindgen::from_value(dep_data) {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse dependent data: {}", e);
                error_collector.add_error("constructor.dependent_data", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let fix_factor_data: Vec<Vec<DataRecord>> = match
            serde_wasm_bindgen::from_value(fix_factor_data)
        {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse fixed factor data: {}", e);
                error_collector.add_error("constructor.fix_factor_data", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let covariate_data: Option<Vec<Vec<DataRecord>>> = match
            serde_wasm_bindgen::from_value(covar_data)
        {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse covariate data: {}", e);
                error_collector.add_error("constructor.covariate_data", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let wls_data: Option<Vec<Vec<DataRecord>>> = match serde_wasm_bindgen::from_value(wls_data) {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse WLS weight data: {}", e);
                error_collector.add_error("constructor.wls_data", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let dependent_data_defs: Vec<Vec<VariableDefinition>> = match
            serde_wasm_bindgen::from_value(dep_data_defs)
        {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse dependent data definitions: {}", e);
                error_collector.add_error("constructor.dependent_data_defs", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let fix_factor_data_defs: Vec<Vec<VariableDefinition>> = match
            serde_wasm_bindgen::from_value(fix_factor_data_defs)
        {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse fixed factor data definitions: {}", e);
                error_collector.add_error("constructor.fix_factor_data_defs", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let covariate_data_defs: Option<Vec<Vec<VariableDefinition>>> = match
            serde_wasm_bindgen::from_value(covar_data_defs)
        {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse covariate data definitions: {}", e);
                error_collector.add_error("constructor.covariate_data_defs", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let wls_data_defs: Option<Vec<Vec<VariableDefinition>>> = match
            serde_wasm_bindgen::from_value(wls_data_defs)
        {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse WLS weight data definitions: {}", e);
                error_collector.add_error("constructor.wls_data_defs", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        let config: MultivariateConfig = match serde_wasm_bindgen::from_value(config_data) {
            Ok(data) => data,
            Err(e) => {
                let msg = format!("Failed to parse configuration: {}", e);
                error_collector.add_error("constructor.config", &msg);
                return Err(string_to_js_error(msg));
            }
        };

        // Validate important configuration
        if config.main.dep_var.is_none() {
            let msg = "Dependent variable must be selected for multivariate analysis".to_string();
            error_collector.add_error("config.validation.dep_var", &msg);
            return Err(string_to_js_error(msg));
        }

        // Validate model configuration
        if !config.model.non_cust && !config.model.custom && !config.model.build_custom_term {
            let msg = "Model specification method must be selected".to_string();
            error_collector.add_error("config.validation.model", &msg);
            return Err(string_to_js_error(msg));
        }

        // Validate fixed factors if using post-hoc tests
        if config.posthoc.src_list.as_ref().map_or(false, |list| !list.is_empty()) {
            if config.main.fix_factor.as_ref().map_or(true, |list| list.is_empty()) {
                let msg = "Fixed factors must be specified for post-hoc tests".to_string();
                error_collector.add_error("config.validation.posthoc", &msg);
                return Err(string_to_js_error(msg));
            }
        }

        // Validate bootstrap settings
        if config.bootstrap.perform_boot_strapping {
            if
                config.bootstrap.stratified &&
                config.bootstrap.strata_variables.as_ref().map_or(true, |list| list.is_empty())
            {
                let msg = "Strata variables must be specified for stratified bootstrap".to_string();
                error_collector.add_error("config.validation.bootstrap.strata", &msg);
                return Err(string_to_js_error(msg));
            }
        }

        // Validate TestValues (μ₀) for Hotelling T² one-population test.
        if let Some(ref tv) = config.main.test_values {
            let dep_var_len = config.main.dep_var.as_ref().map(|v| v.len()).unwrap_or(0);
            if tv.len() != dep_var_len {
                let msg = format!(
                    "TestValues must have the same length as Dependent Variables. \
                     Got {} values for {} dependent variables.",
                    tv.len(),
                    dep_var_len
                );
                error_collector.add_error("config.validation.test_values.length", &msg);
                return Err(string_to_js_error(msg));
            }
            if tv.iter().any(|v| v.is_nan()) {
                let msg = "TestValues contains NaN. Please ensure all numeric inputs are filled in correctly.".to_string();
                error_collector.add_error("config.validation.test_values.nan", &msg);
                return Err(string_to_js_error(msg));
            }
        }

        // Store data
        let data = AnalysisData {
            dependent_data,
            fix_factor_data,
            covariate_data,
            wls_data,
            dependent_data_defs,
            fix_factor_data_defs,
            covariate_data_defs,
            wls_data_defs,
        };

        // Cases with a missing value on any analysis variable are excluded
        // (listwise) before the analysis runs, as SPSS GLM does.
        let (data, excluded) = listwise_complete_cases(&data);
        if excluded > 0 && data.dependent_data.iter().all(|slot| slot.is_empty()) {
            let msg = "No complete cases: every case has a missing value.".to_string();
            error_collector.add_error("listwise_deletion", &msg);
            return Err(string_to_js_error(msg));
        }
        if excluded > 0 {
            error_collector.add_error(
                "listwise_deletion",
                &format!("{} case(s) with missing values were excluded (listwise).", excluded)
            );
        }

        // Create instance
        let mut analysis = MultivariateAnalysis {
            config,
            data,
            result: None,
            error_collector,
            logger,
        };

        // Run the analysis using the function from function.rs
        match
            function::run_analysis(
                &analysis.data,
                &analysis.config,
                &mut analysis.error_collector,
                &mut analysis.logger
            )
        {
            Ok(result) => {
                analysis.result = result;
                Ok(analysis)
            }
            Err(e) => Err(e),
        }
    }

    // Use functions from function.rs
    pub fn get_results(&self) -> Result<JsValue, JsValue> {
        function::get_results(&self.result)
    }

    pub fn get_formatted_results(&self) -> Result<JsValue, JsValue> {
        function::get_formatted_results(&self.result)
    }

    pub fn get_executed_functions(&self) -> Result<JsValue, JsValue> {
        function::get_executed_functions(&self.result)
    }

    pub fn get_all_errors(&self) -> JsValue {
        function::get_all_errors(&self.error_collector)
    }

    pub fn get_all_log(&self) -> Result<JsValue, JsValue> {
        function::get_all_log(&self.logger)
    }

    pub fn clear_errors(&mut self) -> JsValue {
        function::clear_errors(&mut self.error_collector)
    }
}

/// Listwise deletion as SPSS GLM does (/MISSING=EXCLUDE): keep only the rows
/// with a finite number for every dependent variable, covariate and WLS
/// weight and a non-empty value for every fixed factor (the variables named
/// in the definitions; a row's value is looked up across all slots, as
/// merge_records does). Returns the data with the same slot layout and the
/// number of excluded rows.
///
/// Only system-missing (null) cells count: the variable definitions carry no
/// user-missing values (`getVarDefs` sends `missing: []`).
fn listwise_complete_cases(data: &AnalysisData) -> (AnalysisData, usize) {
    let numeric_ok = |v: &DataValue| matches!(v, DataValue::Number(x) if x.is_finite());
    let factor_ok = |v: &DataValue| {
        match v {
            DataValue::Null => false,
            DataValue::Number(x) => x.is_finite(),
            DataValue::Text(s) => !s.trim().is_empty(),
            DataValue::Boolean(_) => true,
        }
    };
    let names = |defs: Option<&Vec<Vec<VariableDefinition>>>| -> Vec<String> {
        defs.map_or(Vec::new(), |d| d.iter().flatten().map(|def| def.name.clone()).collect())
    };
    let groups: [(Vec<String>, &dyn Fn(&DataValue) -> bool); 4] = [
        (names(Some(&data.dependent_data_defs)), &numeric_ok),
        (names(Some(&data.fix_factor_data_defs)), &factor_ok),
        (names(data.covariate_data_defs.as_ref()), &numeric_ok),
        (names(data.wls_data_defs.as_ref()), &numeric_ok),
    ];

    let keep: Vec<bool> = merge_records(data)
        .iter()
        .map(|record| {
            groups.iter().all(|(vars, ok)| {
                vars.iter().all(|v| record.values.get(v).map_or(false, |value| ok(value)))
            })
        })
        .collect();
    let excluded = keep.iter().filter(|k| !**k).count();
    if excluded == 0 {
        return (data.clone(), 0);
    }

    let filter = |slots: &Vec<Vec<DataRecord>>| -> Vec<Vec<DataRecord>> {
        slots
            .iter()
            .map(|slot| {
                slot.iter()
                    .enumerate()
                    .filter(|(i, _)| keep.get(*i).copied().unwrap_or(false))
                    .map(|(_, r)| r.clone())
                    .collect()
            })
            .collect()
    };
    let complete = AnalysisData {
        dependent_data: filter(&data.dependent_data),
        fix_factor_data: filter(&data.fix_factor_data),
        covariate_data: data.covariate_data.as_ref().map(|d| filter(d)),
        wls_data: data.wls_data.as_ref().map(|d| filter(d)),
        dependent_data_defs: data.dependent_data_defs.clone(),
        fix_factor_data_defs: data.fix_factor_data_defs.clone(),
        covariate_data_defs: data.covariate_data_defs.clone(),
        wls_data_defs: data.wls_data_defs.clone(),
    };
    (complete, excluded)
}
