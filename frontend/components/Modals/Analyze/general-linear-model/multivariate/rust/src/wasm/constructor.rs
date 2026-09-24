use serde::Serialize;
use statrs::distribution::{ ChiSquared, Continuous, ContinuousCDF, FisherSnedecor, Normal, StudentsT };
use wasm_bindgen::prelude::*;

use crate::models::{
    config::{ MultivariateConfig, VarianceMode },
    data::{ AnalysisData, DataRecord, DataValue, VariableDefinition },
    result::{ MultivariateResult, SimultaneousConfidenceIntervals, SimultaneousInterval },
};
use crate::stats::common::{ compute_per_group_covariances, get_factor_levels, merge_records };
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
/// (Johnson & Wichern, Applied Multivariate Statistical Analysis, 6th ed.).
/// F(ν₁, ν₂; α), t(ν; α), χ²(ν; α) and z(α) are upper-α quantiles; sᵢᵢ are
/// the diagonal elements of the sample covariance matrix (divisor n − 1).
///
/// One sample, and the paired test on the differences d (sec. 5.4,
/// Result 5.3 for the T² intervals; sec. 6.2 for paired comparisons):
///   T²:         x̄ᵢ ± √( p(n−1)/(n−p) · F(p, n−p; α) ) · √(sᵢᵢ/n)
///   Bonferroni: x̄ᵢ ± t(n−1; α/(2p)) · √(sᵢᵢ/n)
/// Two samples, Σ₁ = Σ₂ (sec. 6.3, Result 6.2):
///   T²:         (x̄₁ᵢ − x̄₂ᵢ) ± c · √( (1/n₁ + 1/n₂) · s_pooled,ᵢᵢ ),
///               c² = (n₁+n₂−2)p/(n₁+n₂−p−1) · F(p, n₁+n₂−p−1; α)
///   Bonferroni: t(n₁+n₂−2; α/(2p)) in place of c
/// Two samples, Σ₁ ≠ Σ₂ (sec. 6.3, Result 6.4, large samples):
///   χ²:         (x̄₁ᵢ − x̄₂ᵢ) ± √( χ²(p; α) ) · √( s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂ )
///   Bonferroni: z(α/(2p)) in place of √χ²
/// The Welch test itself uses the Krishnamoorthy–Yu approximation, which
/// has no standard simultaneous-interval counterpart in Johnson & Wichern;
/// hence the large-sample intervals of Result 6.4.
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

    let build = |design: &str,
                 sample_sizes: Vec<usize>,
                 factor: Option<String>,
                 levels: Vec<String>,
                 t2: (f64, &str, Vec<f64>),
                 bonferroni: (f64, &str, Option<f64>),
                 estimates: Vec<f64>,
                 std_errors: Vec<f64>| {
        let intervals = dep_vars
            .iter()
            .enumerate()
            .map(|(i, dv)| SimultaneousInterval {
                dependent_variable: dv.clone(),
                estimate: estimates[i],
                std_error: std_errors[i],
                t2_lower: estimates[i] - t2.0 * std_errors[i],
                t2_upper: estimates[i] + t2.0 * std_errors[i],
                bonferroni_lower: estimates[i] - bonferroni.0 * std_errors[i],
                bonferroni_upper: estimates[i] + bonferroni.0 * std_errors[i],
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
            bonferroni_critical: bonferroni.0,
            bonferroni_reference: bonferroni.1.to_string(),
            bonferroni_df: bonferroni.2,
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
                (c_bonferroni, "t", Some(n - 1.0)),
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
                let c_chi = upper_quantile_chi2(pf, alpha)?.sqrt();
                let z = quantile_normal(bonferroni_prob)?;
                let std_errors: Vec<f64> = (0..p)
                    .map(|i| (g1.covariance[(i, i)] / n1 + g2.covariance[(i, i)] / n2).sqrt())
                    .collect();
                Ok(build(
                    "two_sample_unequal",
                    vec![g1.n, g2.n],
                    Some(factor.clone()),
                    levels.clone(),
                    (c_chi, "chi-square", vec![pf]),
                    (z, "z", None),
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
                    (c_bonferroni, "t", Some(df_error)),
                    estimates,
                    std_errors,
                ))
            }
        }
        _ => Err(SIMULTANEOUS_CI_DESIGN_MESSAGE.to_string()),
    }
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

fn upper_quantile_chi2(df: f64, alpha: f64) -> Result<f64, String> {
    let dist = ChiSquared::new(df).map_err(|e| e.to_string())?;
    Ok(polish_quantile(&dist, 1.0 - alpha, dist.inverse_cdf(1.0 - alpha)))
}

fn quantile_t(df: f64, prob: f64) -> Result<f64, String> {
    let dist = StudentsT::new(0.0, 1.0, df).map_err(|_| {
        format!("Simultaneous confidence intervals need at least two cases (t with {} df).", df)
    })?;
    Ok(polish_quantile(&dist, prob, dist.inverse_cdf(prob)))
}

fn quantile_normal(prob: f64) -> Result<f64, String> {
    let dist = Normal::new(0.0, 1.0).map_err(|e| e.to_string())?;
    Ok(polish_quantile(&dist, prob, dist.inverse_cdf(prob)))
}
