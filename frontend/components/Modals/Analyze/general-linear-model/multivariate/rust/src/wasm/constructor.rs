use serde::Serialize;
use nalgebra::{ DMatrix, DVector };
use statrs::distribution::{ ChiSquared, Continuous, ContinuousCDF, FisherSnedecor, Normal, StudentsT };
use wasm_bindgen::prelude::*;

use crate::models::{
    config::{ MultivariateConfig, VarianceMode },
    data::{ AnalysisData, DataRecord, DataValue, VariableDefinition },
    result::{
        KnownCovarianceInput,
        KnownCovarianceInterval,
        KnownCovarianceTest,
        MultivariateResult,
        SimultaneousConfidenceIntervals,
        SimultaneousInterval,
    },
};
use crate::stats::common::{
    compute_per_group_covariances,
    data_value_to_string,
    extract_dependent_value,
    get_factor_levels,
    merge_records,
};
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

    /// Simultaneous confidence intervals (T² and Bonferroni) for the mean
    /// vector components (Options → Simultaneous CI). The frontend calls it
    /// only when the option is checked, after get_formatted_results(); the
    /// intervals are computed on demand from the stored (listwise-complete)
    /// data, so an analysis without them is unchanged. On error the message
    /// goes to the error collector (context "calculate_simultaneous_ci") and
    /// null is returned.
    pub fn get_simultaneous_ci(&mut self) -> Result<JsValue, JsValue> {
        self.logger.add_log("calculate_simultaneous_ci");
        match calculate_simultaneous_ci(&self.data, &self.config) {
            Ok(ci) => {
                let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
                ci.serialize(&serializer)
                    .map_err(|e| JsValue::from_str(&format!("Failed to serialize simultaneous confidence intervals: {}", e)))
            }
            Err(e) => {
                self.error_collector.add_error("calculate_simultaneous_ci", &e);
                Ok(JsValue::NULL)
            }
        }
    }

    /// Chi-square test of the mean vector with a known population covariance
    /// matrix Σ ("Population covariance matrix (Σ) known" in Test Values,
    /// Test Values (δ₀) or Paired), with the matching simultaneous
    /// intervals. `known` is a KnownCovarianceInput. The frontend calls it
    /// only when Σ was entered, after get_formatted_results(); like
    /// get_simultaneous_ci it works on the stored (listwise-complete) data,
    /// so an analysis without it is unchanged. On error the message goes to
    /// the error collector (context "calculate_known_covariance_test") and
    /// null is returned.
    pub fn get_known_covariance_test(&mut self, known: JsValue) -> Result<JsValue, JsValue> {
        self.logger.add_log("calculate_known_covariance_test");
        let input: Result<KnownCovarianceInput, String> = serde_wasm_bindgen
            ::from_value(known)
            .map_err(|e| format!("Invalid known covariance matrix input: {}", e));
        match input.and_then(|k| calculate_known_covariance_test(&self.data, &self.config, &k)) {
            Ok(test) => {
                let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);
                test.serialize(&serializer)
                    .map_err(|e| JsValue::from_str(&format!("Failed to serialize the known covariance test: {}", e)))
            }
            Err(e) => {
                self.error_collector.add_error("calculate_known_covariance_test", &e);
                Ok(JsValue::NULL)
            }
        }
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

const SIMULTANEOUS_CI_DESIGN_MESSAGE: &str =
    "Simultaneous confidence intervals are available for the one-sample, paired, and two-sample Hotelling T² designs (no Fixed Factor, or one Fixed Factor with two levels, without covariates or WLS weight).";

/// Simultaneous confidence intervals for the components of a mean vector
/// (Johnson & Wichern, Applied Multivariate Statistical Analysis, 6th ed.;
/// references by subsection only, see testing/fitur-v4/rujukan-jw.md).
/// F(ν₁, ν₂; α) and t(ν; α) are upper-α quantiles; sᵢᵢ are the diagonal
/// elements of the sample covariance matrix (divisor n − 1).
///
/// One sample (§5.4), and the paired test on the differences d (§6.2):
///   T²:         x̄ᵢ ± √( p(n−1)/(n−p) · F(p, n−p; α) ) · √(sᵢᵢ/n)
///   Bonferroni: x̄ᵢ ± t(n−1; α/(2p)) · √(sᵢᵢ/n)
/// Two samples, Σ₁ = Σ₂ (§6.3):
///   T²:         (x̄₁ᵢ − x̄₂ᵢ) ± c · √( (1/n₁ + 1/n₂) · s_pooled,ᵢᵢ ),
///               c² = (n₁+n₂−2)p/(n₁+n₂−p−1) · F(p, n₁+n₂−p−1; α)
///   Bonferroni: t(n₁+n₂−2; α/(2p)) in place of c
/// Two samples, Σ₁ ≠ Σ₂ (§6.3, Krishnamoorthy–Yu), consistent with the
/// Welch test in Multivariate Tests (same ν, not rounded):
///   T²:         (x̄₁ᵢ − x̄₂ᵢ) ± c · √( s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂ ),
///               c² = νp/(ν−p+1) · F(p, ν−p+1; α)
///   Bonferroni: Welch t per component, t(νᵢ; α/(2p)) in place of c, with
///               νᵢ = (s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂)² /
///                    ((s₁ᵢᵢ/n₁)²/(n₁−1) + (s₂ᵢᵢ/n₂)²/(n₂−1))
///
/// μ₁ is the first and μ₂ the second level of the factor in output-table
/// order (numeric when both parse as numbers, as in Descriptive
/// Statistics). α = Significance Level (Options).
fn calculate_simultaneous_ci(
    data: &AnalysisData,
    config: &MultivariateConfig,
) -> Result<SimultaneousConfidenceIntervals, String> {
    let alpha = config.options.sig_level.unwrap_or(0.05);
    if !(alpha > 0.0 && alpha < 1.0) {
        return Err(
            "Significance Level must be greater than 0 and less than 1 to compute simultaneous confidence intervals.".to_string()
        );
    }
    let dep_vars = config.main.dep_var.clone().unwrap_or_default();
    let p = dep_vars.len();
    if p == 0 {
        return Err("No dependent variables specified".to_string());
    }
    let has_covariates = config.main.covar.as_ref().map_or(false, |c| !c.is_empty());
    if has_covariates || config.main.wls_weight.is_some() {
        return Err(SIMULTANEOUS_CI_DESIGN_MESSAGE.to_string());
    }
    let factors = config.main.fix_factor.clone().unwrap_or_default();
    let pf = p as f64;
    let bonferroni_prob = 1.0 - alpha / (2.0 * pf);

    // bonferroni: (reference, [(critical, df)] per component).
    let build = |design: &str,
                 sample_sizes: Vec<usize>,
                 factor: Option<String>,
                 levels: Vec<String>,
                 t2: (f64, &str, Vec<f64>),
                 bonferroni: (&str, Vec<(f64, f64)>),
                 estimates: Vec<f64>,
                 std_errors: Vec<f64>| {
        let intervals = dep_vars
            .iter()
            .enumerate()
            .map(|(i, dv)| {
                let (critical, df) = bonferroni.1[i];
                SimultaneousInterval {
                    dependent_variable: dv.clone(),
                    estimate: estimates[i],
                    std_error: std_errors[i],
                    t2_lower: estimates[i] - t2.0 * std_errors[i],
                    t2_upper: estimates[i] + t2.0 * std_errors[i],
                    bonferroni_critical: critical,
                    bonferroni_df: df,
                    bonferroni_lower: estimates[i] - critical * std_errors[i],
                    bonferroni_upper: estimates[i] + critical * std_errors[i],
                }
            })
            .collect();
        SimultaneousConfidenceIntervals {
            design: design.to_string(),
            confidence_level: 1.0 - alpha,
            p,
            sample_sizes,
            factor,
            levels,
            t2_critical: t2.0,
            t2_reference: t2.1.to_string(),
            t2_df: t2.2,
            bonferroni_reference: bonferroni.0.to_string(),
            intervals,
        }
    };

    match factors.len() {
        0 => {
            let groups = compute_per_group_covariances(data, config, &[])?;
            let g = groups.first().ok_or_else(|| {
                format!("Simultaneous confidence intervals need more cases than dependent variables (n > p = {}).", p)
            })?;
            let n = g.n as f64;
            let f = upper_quantile_f(pf, n - pf, alpha)?;
            let c_t2 = (pf * (n - 1.0) / (n - pf) * f).sqrt();
            let c_bonferroni = quantile_t(n - 1.0, bonferroni_prob)?;
            let estimates: Vec<f64> = (0..p).map(|i| g.mean[i]).collect();
            let std_errors: Vec<f64> = (0..p).map(|i| (g.covariance[(i, i)] / n).sqrt()).collect();
            Ok(build(
                "one_sample",
                vec![g.n],
                None,
                Vec::new(),
                (c_t2, "F", vec![pf, n - pf]),
                ("t", vec![(c_bonferroni, n - 1.0); p]),
                estimates,
                std_errors,
            ))
        }
        1 => {
            let factor = factors[0].clone();
            let mut levels = get_factor_levels(data, &factor)?;
            levels.sort_by(|a, b| match (a.parse::<f64>(), b.parse::<f64>()) {
                (Ok(x), Ok(y)) => x.partial_cmp(&y).unwrap_or(std::cmp::Ordering::Equal),
                _ => a.cmp(b),
            });
            if levels.len() != 2 {
                return Err(format!(
                    "Simultaneous confidence intervals for two samples need the Fixed Factor to have exactly two levels; '{}' has {}.",
                    factor,
                    levels.len()
                ));
            }
            let groups = compute_per_group_covariances(data, config, &[factor.clone()])?;
            let find = |level: &String| {
                groups
                    .iter()
                    .find(|g| g.label.get(&factor) == Some(level))
                    .ok_or_else(|| {
                        format!(
                            "Simultaneous confidence intervals need more cases than dependent variables in each group ({} = {}).",
                            factor, level
                        )
                    })
            };
            let g1 = find(&levels[0])?;
            let g2 = find(&levels[1])?;
            let (n1, n2) = (g1.n as f64, g2.n as f64);
            let estimates: Vec<f64> = (0..p).map(|i| g1.mean[i] - g2.mean[i]).collect();
            if config.main.variance_mode == VarianceMode::Welch {
                let nu = krishnamoorthy_yu_nu(g1, g2)?;
                let df2 = nu - pf + 1.0;
                if !(df2 > 0.0 && df2.is_finite()) {
                    return Err(format!(
                        "Welch df2 = ν − p + 1 = {} is not positive; check sample sizes vs p.",
                        df2
                    ));
                }
                let f = upper_quantile_f(pf, df2, alpha)?;
                let c_t2 = (nu * pf / df2 * f).sqrt();
                let mut std_errors = Vec::with_capacity(p);
                let mut bonferroni = Vec::with_capacity(p);
                for i in 0..p {
                    let a = g1.covariance[(i, i)] / n1;
                    let b = g2.covariance[(i, i)] / n2;
                    // Welch–Satterthwaite df of component i.
                    let nu_i = (a + b).powi(2) / (a * a / (n1 - 1.0) + b * b / (n2 - 1.0));
                    std_errors.push((a + b).sqrt());
                    bonferroni.push((quantile_t(nu_i, bonferroni_prob)?, nu_i));
                }
                Ok(build(
                    "two_sample_unequal",
                    vec![g1.n, g2.n],
                    Some(factor.clone()),
                    levels.clone(),
                    (c_t2, "F", vec![pf, df2]),
                    ("welch_t", bonferroni),
                    estimates,
                    std_errors,
                ))
            } else {
                let df_error = n1 + n2 - 2.0;
                let f = upper_quantile_f(pf, n1 + n2 - pf - 1.0, alpha)?;
                let c_t2 = (df_error * pf / (n1 + n2 - pf - 1.0) * f).sqrt();
                let c_bonferroni = quantile_t(df_error, bonferroni_prob)?;
                let std_errors: Vec<f64> = (0..p)
                    .map(|i| {
                        let pooled = ((n1 - 1.0) * g1.covariance[(i, i)] + (n2 - 1.0) * g2.covariance[(i, i)]) / df_error;
                        ((1.0 / n1 + 1.0 / n2) * pooled).sqrt()
                    })
                    .collect();
                Ok(build(
                    "two_sample_pooled",
                    vec![g1.n, g2.n],
                    Some(factor.clone()),
                    levels.clone(),
                    (c_t2, "F", vec![pf, n1 + n2 - pf - 1.0]),
                    ("t", vec![(c_bonferroni, df_error); p]),
                    estimates,
                    std_errors,
                ))
            }
        }
        _ => Err(SIMULTANEOUS_CI_DESIGN_MESSAGE.to_string()),
    }
}

const KNOWN_COVARIANCE_DESIGN_MESSAGE: &str =
    "The chi-square test with a known covariance matrix is available for the one-sample, paired, and two-sample designs (no Fixed Factor, or one Fixed Factor with two levels, without covariates or WLS weight).";

/// Levels of a factor in output-table order (numeric when both parse as
/// numbers), as calculate_simultaneous_ci orders them.
fn sorted_levels(data: &AnalysisData, factor: &str) -> Result<Vec<String>, String> {
    let mut levels = get_factor_levels(data, factor)?;
    levels.sort_by(|a, b| match (a.parse::<f64>(), b.parse::<f64>()) {
        (Ok(x), Ok(y)) => x.partial_cmp(&y).unwrap_or(std::cmp::Ordering::Equal),
        _ => a.cmp(b),
    });
    Ok(levels)
}

/// (n, x̄) of the cases with `factor = level` (all cases when `level` is
/// None). The stored data are listwise-complete; a case without a number
/// for every dependent variable is skipped all the same.
fn group_mean(
    records: &[DataRecord],
    dep_vars: &[String],
    level: Option<(&str, &str)>,
) -> (usize, DVector<f64>) {
    let p = dep_vars.len();
    let mut sum = DVector::<f64>::zeros(p);
    let mut n = 0usize;
    for record in records {
        if let Some((factor, value)) = level {
            if record.values.get(factor).map(data_value_to_string).as_deref() != Some(value) {
                continue;
            }
        }
        let row: Vec<f64> = dep_vars.iter().filter_map(|dv| extract_dependent_value(record, dv)).collect();
        if row.len() != p {
            continue;
        }
        for (i, v) in row.iter().enumerate() {
            sum[i] += v;
        }
        n += 1;
    }
    if n > 0 {
        sum /= n as f64;
    }
    (n, sum)
}

/// p × p matrix from the user's input: finite, symmetric (the dialog fills
/// the lower triangle from the upper one), positive diagonal and positive
/// definite (Cholesky). The dialog checks the same before Continue.
fn known_matrix(rows: Option<&Vec<Vec<f64>>>, p: usize, label: &str) -> Result<DMatrix<f64>, String> {
    let rows = rows.ok_or_else(|| format!("Known covariance matrix {} is missing.", label))?;
    if rows.len() != p || rows.iter().any(|r| r.len() != p) {
        return Err(format!("Known covariance matrix {} must be {} × {} (one row and column per dependent variable).", label, p, p));
    }
    let m = DMatrix::from_fn(p, p, |i, j| rows[i][j]);
    if m.iter().any(|v| !v.is_finite()) {
        return Err(format!("Known covariance matrix {}: every entry must be a number.", label));
    }
    if (0..p).any(|i| m[(i, i)] <= 0.0) {
        return Err(format!("Known covariance matrix {}: the diagonal entries (variances) must be greater than 0.", label));
    }
    let scale = m.iter().fold(0.0f64, |a, v| a.max(v.abs()));
    for i in 0..p {
        for j in (i + 1)..p {
            if (m[(i, j)] - m[(j, i)]).abs() > 1e-12 * scale {
                return Err(format!("Known covariance matrix {} must be symmetric.", label));
            }
        }
    }
    if m.clone().cholesky().is_none() {
        return Err(format!("Known covariance matrix {} is not positive definite.", label));
    }
    Ok(m)
}

/// Chi-square test of the mean vector with a known population covariance
/// matrix (Johnson & Wichern, Applied Multivariate Statistical Analysis,
/// 6th ed.: x̄ ~ N_p(μ, Σ/n), §4.4, and (x − μ)ᵀΣ⁻¹(x − μ) ~ χ²(p) for
/// x ~ N_p(μ, Σ), §4.2; see testing/fitur-v4/rujukan-jw.md). With V the
/// covariance matrix of the estimate, the statistic is (est − h)ᵀV⁻¹(est − h)
/// ~ χ²(p) under H₀:
///   one sample (and the paired test on d): est = x̄, h = μ₀, V = Σ/n
///   two samples, Σ₁ = Σ₂ = Σ:  est = x̄₁ − x̄₂, h = δ₀, V = (1/n₁ + 1/n₂)Σ
///   two samples, Σ₁ and Σ₂:    est = x̄₁ − x̄₂, h = δ₀, V = Σ₁/n₁ + Σ₂/n₂
/// δ₀ is subtracted from the first level by the frontend before the
/// analysis (two-sample-delta.ts), so here h = 0 and x̄₁ − x̄₂ already
/// includes −δ₀. Simultaneous intervals for component i:
///   χ²:         estᵢ ± √χ²(p; α) · √Vᵢᵢ
///   Bonferroni: estᵢ ± z(α/(2p)) · √Vᵢᵢ
/// χ²(p; α) and z(α/(2p)) are upper quantiles; α = Significance Level
/// (Options).
fn calculate_known_covariance_test(
    data: &AnalysisData,
    config: &MultivariateConfig,
    known: &KnownCovarianceInput,
) -> Result<KnownCovarianceTest, String> {
    let alpha = config.options.sig_level.unwrap_or(0.05);
    if !(alpha > 0.0 && alpha < 1.0) {
        return Err("Significance Level must be greater than 0 and less than 1.".to_string());
    }
    let dep_vars = config.main.dep_var.clone().unwrap_or_default();
    let p = dep_vars.len();
    if p == 0 {
        return Err("No dependent variables specified".to_string());
    }
    let has_covariates = config.main.covar.as_ref().map_or(false, |c| !c.is_empty());
    if has_covariates || config.main.wls_weight.is_some() {
        return Err(KNOWN_COVARIANCE_DESIGN_MESSAGE.to_string());
    }
    let factors = config.main.fix_factor.clone().unwrap_or_default();
    let records = merge_records(data);

    let (sample_sizes, factor, levels, estimate, hypothesized, v) = match known.design.as_str() {
        "one_sample" => {
            if !factors.is_empty() {
                return Err(KNOWN_COVARIANCE_DESIGN_MESSAGE.to_string());
            }
            let sigma = known_matrix(known.sigma.as_ref(), p, "Σ")?;
            let (n, mean) = group_mean(&records, &dep_vars, None);
            if n == 0 {
                return Err("No complete cases.".to_string());
            }
            let mu0 = config.main.test_values.clone().unwrap_or_else(|| vec![0.0; p]);
            if mu0.len() != p {
                return Err(format!("Test Values must have {} entries.", p));
            }
            (vec![n], None, Vec::new(), mean, DVector::from_vec(mu0), sigma / (n as f64))
        }
        "two_sample_common" | "two_sample_separate" => {
            if factors.len() != 1 {
                return Err(KNOWN_COVARIANCE_DESIGN_MESSAGE.to_string());
            }
            let factor = factors[0].clone();
            let levels = sorted_levels(data, &factor)?;
            if levels.len() != 2 {
                return Err(format!(
                    "The chi-square test with a known covariance matrix for two samples needs the Fixed Factor to have exactly two levels; '{}' has {}.",
                    factor,
                    levels.len()
                ));
            }
            let (n1, m1) = group_mean(&records, &dep_vars, Some((&factor, &levels[0])));
            let (n2, m2) = group_mean(&records, &dep_vars, Some((&factor, &levels[1])));
            if n1 == 0 || n2 == 0 {
                return Err(format!("Each level of '{}' needs at least one complete case.", factor));
            }
            let (f1, f2) = (n1 as f64, n2 as f64);
            let v = if known.design == "two_sample_common" {
                known_matrix(known.sigma.as_ref(), p, "Σ")? * (1.0 / f1 + 1.0 / f2)
            } else {
                let s1 = known_matrix(known.sigma1.as_ref(), p, &format!("Σ₁ ({} = {})", factor, levels[0]))?;
                let s2 = known_matrix(known.sigma2.as_ref(), p, &format!("Σ₂ ({} = {})", factor, levels[1]))?;
                s1 / f1 + s2 / f2
            };
            (vec![n1, n2], Some(factor), levels, m1 - m2, DVector::zeros(p), v)
        }
        other => {
            return Err(format!("Unknown design '{}' for the known covariance test.", other));
        }
    };

    let diff = &estimate - &hypothesized;
    let chol = v
        .clone()
        .cholesky()
        .ok_or_else(|| "The covariance matrix of the mean vector is not positive definite.".to_string())?;
    let chi_square = diff.dot(&chol.solve(&diff));
    let pf = p as f64;
    let chi_dist = ChiSquared::new(pf).map_err(|e| format!("Chi-square distribution: {}", e))?;
    let significance = chi_dist.sf(chi_square);
    let chi_critical = polish_quantile(&chi_dist, 1.0 - alpha, chi_dist.inverse_cdf(1.0 - alpha)).sqrt();
    let normal = Normal::new(0.0, 1.0).map_err(|e| format!("Normal distribution: {}", e))?;
    let z_prob = 1.0 - alpha / (2.0 * pf);
    let z_critical = polish_quantile(&normal, z_prob, normal.inverse_cdf(z_prob));

    let intervals = dep_vars
        .iter()
        .enumerate()
        .map(|(i, dv)| {
            let se = v[(i, i)].sqrt();
            KnownCovarianceInterval {
                dependent_variable: dv.clone(),
                estimate: estimate[i],
                std_error: se,
                chi_square_lower: estimate[i] - chi_critical * se,
                chi_square_upper: estimate[i] + chi_critical * se,
                bonferroni_lower: estimate[i] - z_critical * se,
                bonferroni_upper: estimate[i] + z_critical * se,
            }
        })
        .collect();

    Ok(KnownCovarianceTest {
        design: known.design.clone(),
        p,
        sample_sizes,
        factor,
        levels,
        hypothesized: if known.design == "one_sample" { hypothesized.iter().copied().collect() } else { Vec::new() },
        chi_square,
        df: pf,
        significance,
        confidence_level: 1.0 - alpha,
        chi_square_critical: chi_critical,
        z_critical,
        intervals,
    })
}

/// Newton steps on the CDF from statrs' quantile, so the quantile is exact
/// to double precision (the chi-square/gamma quantile of statrs stops after
/// a few bisection and Newton steps).
fn polish_quantile<D: ContinuousCDF<f64, f64> + Continuous<f64, f64>>(dist: &D, prob: f64, start: f64) -> f64 {
    let mut x = start;
    for _ in 0..10 {
        let density = dist.pdf(x);
        if !(density.is_finite() && density > 0.0) {
            break;
        }
        let next = x - (dist.cdf(x) - prob) / density;
        if !next.is_finite() {
            break;
        }
        let done = (next - x).abs() <= 1e-15 * x.abs().max(1.0);
        x = next;
        if done {
            break;
        }
    }
    x
}

fn upper_quantile_f(df1: f64, df2: f64, alpha: f64) -> Result<f64, String> {
    let dist = FisherSnedecor::new(df1, df2).map_err(|_| {
        format!("Simultaneous confidence intervals need more cases than dependent variables (F({}, {})).", df1, df2)
    })?;
    Ok(polish_quantile(&dist, 1.0 - alpha, dist.inverse_cdf(1.0 - alpha)))
}

fn quantile_t(df: f64, prob: f64) -> Result<f64, String> {
    let dist = StudentsT::new(0.0, 1.0, df).map_err(|_| {
        format!("Simultaneous confidence intervals need at least two cases (t with {} df).", df)
    })?;
    Ok(polish_quantile(&dist, prob, dist.inverse_cdf(prob)))
}

/// Krishnamoorthy–Yu (2004) degrees of freedom ν of the two-sample Welch
/// Hotelling T² — the same formula as calculate_welch_two_sample_t2
/// (stats/multivariate_tests.rs), which is private to that module:
///   V = S₁/n₁ + S₂/n₂, Vᵢ = Sᵢ/nᵢ,
///   1/ν = Σᵢ [1/(nᵢ − 1)] · {tr((VᵢV⁻¹)²) + (tr(VᵢV⁻¹))²} / (p² + p).
/// ν does not depend on the order of the two groups. testing/fitur-v4
/// (v4-check) verifies that ν − p + 1 here equals the Error df of the Welch
/// row in Multivariate Tests.
fn krishnamoorthy_yu_nu(
    g1: &crate::stats::common::GroupCovariance,
    g2: &crate::stats::common::GroupCovariance,
) -> Result<f64, String> {
    let p = g1.mean.len() as f64;
    let v1 = &g1.covariance / (g1.n as f64);
    let v2 = &g2.covariance / (g2.n as f64);
    let v = &v1 + &v2;
    let v_inv = v
        .clone()
        .try_inverse()
        .ok_or_else(|| "V = S₁/n₁ + S₂/n₂ is singular".to_string())?;
    let denom = p * p + p;
    let m1 = &v1 * &v_inv;
    let m2 = &v2 * &v_inv;
    let inv_nu = (1.0 / (g1.n as f64 - 1.0)) * ((&m1 * &m1).trace() + m1.trace().powi(2)) / denom
        + (1.0 / (g2.n as f64 - 1.0)) * ((&m2 * &m2).trace() + m2.trace().powi(2)) / denom;
    if !inv_nu.is_finite() || inv_nu <= 0.0 {
        return Err("Welch degrees-of-freedom computation produced a non-positive value".to_string());
    }
    Ok(1.0 / inv_nu)
}
