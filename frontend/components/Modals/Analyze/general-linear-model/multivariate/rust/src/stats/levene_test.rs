use std::collections::HashMap;
use statrs::distribution::{ ContinuousCDF, FisherSnedecor };

use crate::models::{
    config::MultivariateConfig,
    data::{ AnalysisData, DataValue },
    result::{ LeveneTest, LeveneResult },
};

use super::core::{
    build_design_matrix_and_response,
    calculate_mean,
    data_value_to_string,
    extract_dependent_value,
    get_factor_combinations,
    matches_combination,
    merge_records,
    to_dmatrix,
    to_dvector,
};

/// Calculate median of a list of values
fn calculate_median(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let mut sorted_values = values.to_vec();
    sorted_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let n = sorted_values.len();
    if n % 2 == 0 {
        // Even number of elements, take average of middle two
        (sorted_values[n / 2 - 1] + sorted_values[n / 2]) / 2.0
    } else {
        // Odd number of elements, take middle one
        sorted_values[n / 2]
    }
}

/// Interpolated 5% trimmed mean for Levene's "Based on trimmed mean"
/// variant — matches SPSS / R `mean(x, trim=0.05)` semantics.
///
/// For a sample of size `n`, the algorithm "removes" `n·p` observations
/// from each tail. When `n·p` is not an integer (e.g. n=4, p=0.05 ⇒
/// trim = 0.2), the boundary observations are PARTIALLY trimmed:
///
///   trimmed_mean = [(1−f)·x_{(k)} + Σ x_{(k+1..n−k−2)} + (1−f)·x_{(n−k−1)}]
///                  / [n · (1 − 2p)]
///
/// where k = floor(n·p) and f = n·p − k.
///
/// The previous implementation used integer `floor(n·p)`, which for
/// n ≤ 19 collapses to 0 and silently reverts to the regular mean —
/// producing a "Based on trimmed mean" row identical to "Based on Mean".
/// The Posten 2×4 design (n=4 per cell) tripped exactly that path, so
/// Statify reported 1.638 instead of SPSS's 1.493.
fn calculate_trimmed_mean(values: &[f64]) -> f64 {
    const TRIM_FRACTION: f64 = 0.05;
    if values.is_empty() {
        return 0.0;
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let n = sorted.len();
    let np = (n as f64) * TRIM_FRACTION;
    let k = np.floor() as usize;
    let f = np - (k as f64);

    // Guard against degenerate sizes where there's nothing left after
    // trimming. The interpolated formula needs at least the two boundary
    // observations and a non-zero effective denominator.
    if n <= 2 * k + 1 || (1.0 - 2.0 * TRIM_FRACTION) <= 0.0 {
        return calculate_mean(values);
    }

    let lower_boundary = sorted[k];
    let upper_boundary = sorted[n - k - 1];
    let mut sum = (1.0 - f) * (lower_boundary + upper_boundary);

    // Indices [k+1 .. n-k-2] are fully retained.
    if k + 1 <= n - k - 2 {
        for v in &sorted[k + 1..=n - k - 2] {
            sum += v;
        }
    }

    let denom = (n as f64) * (1.0 - 2.0 * TRIM_FRACTION);
    sum / denom
}

/// Calculate Levene's Test for homogeneity of variances
/// This tests whether the error variance of the dependent variables is equal across groups
pub fn calculate_levene_test(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<Vec<LeveneTest>, String> {
    // Check if homogeneity test is requested
    if !config.options.homogen_test {
        return Err("Levene's test not requested in configuration".to_string());
    }

    let mut result = Vec::new();

    // Get dependent variables
    let dependent_vars = match &config.main.dep_var {
        Some(dep_vars) => dep_vars.clone(),
        None => {
            // If no specific dependent variables are provided, use all from the data
            data.dependent_data_defs
                .iter()
                .flat_map(|defs| defs.iter().map(|def| def.name.clone()))
                .collect::<Vec<String>>()
        }
    };

    if dependent_vars.is_empty() {
        return Err("No dependent variables found for Levene's test".to_string());
    }

    // Build design string
    let mut design_string = if config.model.intercept {
        "Intercept".to_string()
    } else {
        "".to_string()
    };

    // Add covariates to design string
    if let Some(covariates) = &config.main.covar {
        if !covariates.is_empty() {
            if !design_string.is_empty() {
                design_string.push_str(" + ");
            }
            design_string.push_str(&covariates.join(" + "));
        }
    }

    // Add factors to design string
    if let Some(factors) = &config.main.fix_factor {
        if !factors.is_empty() {
            if !design_string.is_empty() {
                design_string.push_str(" + ");
            }
            design_string.push_str(&factors.join(" + "));
        }
    }

    // Main-effects model (not the full factorial): as SPSS, one test per
    // dependent variable, an ANOVA over the cells of the fixed factors on the
    // absolute residuals of the specified model.
    if !config.model.non_cust {
        for dep_var in &dependent_vars {
            result.push(LeveneTest {
                dependent_variable: dep_var.clone(),
                levene: vec![model_residual_levene(data, config, dep_var, &design_string)?],
            });
        }
        return Ok(result);
    }

    // Get between-subjects factors combinations
    let combinations = get_factor_combinations(data, config)?;

    // If we have no combinations but still have dependent variables, we might need to run
    // Levene's test across the entire dataset without grouping
    if combinations.is_empty() {
        return Ok(result); // No combinations means no groups to test homogeneity between
    }

    for dep_var in dependent_vars {
        // Collect values by group for Levene's test
        let mut group_values: HashMap<String, Vec<f64>> = HashMap::new();

        if let Some(factors) = &config.main.fix_factor {
            // If we have factors, group by factor combinations
            if !factors.is_empty() {
                for combo in &combinations {
                    let group_key = combo
                        .iter()
                        .map(|(f, v)| format!("{}={}", f, v))
                        .collect::<Vec<String>>()
                        .join(", ");

                    let merged = merge_records(data);
                    let mut values = Vec::new();
                    for record in &merged {
                        if matches_combination(record, combo, data, config) {
                            if let Some(value) = extract_dependent_value(record, &dep_var) {
                                values.push(value);
                            }
                        }
                    }

                    if !values.is_empty() {
                        group_values.insert(group_key, values);
                    }
                }
            }
        }

        // Skip if insufficient groups for analysis
        if group_values.len() < 2 {
            continue; // Need at least 2 groups to test homogeneity of variance
        }

        // Calculate various statistics for each group
        let mut group_means = HashMap::new();
        let mut group_medians = HashMap::new();
        let mut group_trimmed_means = HashMap::new();

        for (group, values) in &group_values {
            group_means.insert(group.clone(), calculate_mean(values));
            group_medians.insert(group.clone(), calculate_median(values));
            group_trimmed_means.insert(group.clone(), calculate_trimmed_mean(values));
        }

        // Arrays to hold the four types of Levene test results
        let mut levene_results = Vec::new();

        // Common data structure preparation
        let mut all_abs_deviations = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];
        let mut all_group_indices = [Vec::new(), Vec::new(), Vec::new(), Vec::new()];
        let mut group_keys = Vec::new();

        for (idx, (group, values)) in group_values.iter().enumerate() {
            // Get the various centers for this group
            let group_mean = group_means[group];
            let group_median = group_medians[group];
            let group_trimmed_mean = group_trimmed_means[group];

            for value in values {
                // Calculate absolute deviations from different centers
                all_abs_deviations[0].push((*value - group_mean).abs()); // Based on Mean
                all_abs_deviations[1].push((*value - group_median).abs()); // Based on Median
                all_abs_deviations[2].push((*value - group_median).abs()); // Based on Median (for adjusted df)
                all_abs_deviations[3].push((*value - group_trimmed_mean).abs()); // Based on trimmed mean

                // Store group indices for all tests
                for i in 0..4 {
                    all_group_indices[i].push(idx);
                }
            }
            group_keys.push(group.clone());
        }

        // Calculate all four Levene's test variants
        let test_names = [
            "Based on Mean",
            "Based on Median",
            "Based on Median and with adjusted df",
            "Based on trimmed mean",
        ];

        for test_idx in 0..4 {
            let abs_deviations = &all_abs_deviations[test_idx];
            let group_indices = &all_group_indices[test_idx];

            // Calculate Levene's statistic (ANOVA on absolute deviations)
            let n_total = abs_deviations.len();
            let k = group_values.len();

            // Calculate group means of absolute deviations
            let mut group_abs_means = vec![0.0; k];
            let mut group_counts = vec![0; k];

            for i in 0..abs_deviations.len() {
                let group_idx = group_indices[i];
                group_abs_means[group_idx] += abs_deviations[i];
                group_counts[group_idx] += 1;
            }

            for i in 0..k {
                if group_counts[i] > 0 {
                    group_abs_means[i] /= group_counts[i] as f64;
                }
            }

            // Calculate overall mean of absolute deviations
            let overall_abs_mean = calculate_mean(abs_deviations);

            // Calculate between-groups sum of squares
            let mut ss_between = 0.0;
            for i in 0..k {
                ss_between +=
                    (group_counts[i] as f64) * (group_abs_means[i] - overall_abs_mean).powi(2);
            }

            // Calculate within-groups sum of squares
            let mut ss_within = 0.0;
            for i in 0..abs_deviations.len() {
                let group_idx = group_indices[i];
                ss_within += (abs_deviations[i] - group_abs_means[group_idx]).powi(2);
            }

            // Calculate degrees of freedom
            let df1 = k - 1;
            let df2_std = (n_total - k) as f64;

            // Calculate mean squares (always use standard df2 for ms_within and F)
            let ms_between = ss_between / (df1 as f64);
            let ms_within = ss_within / df2_std;

            // Calculate F-statistic
            let f_statistic = ms_between / ms_within;

            // df2 for p-value:
            // test_idx==2 ("Based on Median and with adjusted df") uses the
            // Satterthwaite df of the pooled within-group SS — df2_adj can be
            // fractional. All other variants use the standard residual
            // df2 = N - k.
            let df2: f64 = if test_idx == 2 {
                // Satterthwaite as SPSS: df2_adj = (Σᵢ uᵢ)² / Σᵢ[uᵢ²/(nᵢ-1)]
                // where uᵢ = Σⱼ (zᵢⱼ − z̄ᵢ)² is the within-group SS of the
                // absolute deviations. (The Welch form with s²ᵢ/nᵢ agrees only
                // when every group has the same size.)
                let mut sum_term = 0.0_f64;
                let mut sum_term_sq_over_df = 0.0_f64;
                for gi in 0..k {
                    let ni = group_counts[gi] as f64;
                    if ni <= 1.0 { continue; }
                    let zi_mean = group_abs_means[gi];
                    let ss_i: f64 = (0..abs_deviations.len())
                        .filter(|&j| group_indices[j] == gi)
                        .map(|j| (abs_deviations[j] - zi_mean).powi(2))
                        .sum();
                    sum_term += ss_i;
                    sum_term_sq_over_df += ss_i * ss_i / (ni - 1.0);
                }
                if sum_term_sq_over_df > 0.0 {
                    sum_term * sum_term / sum_term_sq_over_df
                } else {
                    df2_std
                }
            } else {
                df2_std
            };

            // Calculate significance (p-value) using the appropriate df2
            let significance = FisherSnedecor::new(df1 as f64, df2)
                .map(|dist| 1.0 - dist.cdf(f_statistic))
                .unwrap_or(0.0);

            levene_results.push(LeveneResult {
                levene_statistic: f_statistic,
                df1,
                df2,
                significance,
                function: None,
                design: Some(format!("Design: {}", design_string)),
                test_basis: Some(test_names[test_idx].to_string()),
            });
        }

        result.push(LeveneTest {
            dependent_variable: dep_var.clone(),
            levene: levene_results,
        });
    }

    if result.is_empty() {
        return Err("Could not calculate Levene's test for any dependent variable".to_string());
    }

    Ok(result)
}

/// Levene's test of a model other than the full factorial (SPSS): one-way
/// ANOVA of |y - fitted| (residuals of the design of
/// build_design_matrix_and_response) over the cells of all fixed factors;
/// df1 = cells - 1, df2 = n - cells.
fn model_residual_levene(
    data: &AnalysisData,
    config: &MultivariateConfig,
    dep_var: &str,
    design_string: &str
) -> Result<LeveneResult, String> {
    let (x, y) = build_design_matrix_and_response(data, config, dep_var)?;
    let x_mat = to_dmatrix(&x);
    let y_vec = to_dvector(&y);
    let xtx_inv = (x_mat.transpose() * &x_mat)
        .try_inverse()
        .ok_or_else(|| "Could not invert X'X matrix - possibly due to multicollinearity".to_string())?;
    let residuals = &y_vec - &x_mat * (xtx_inv * (x_mat.transpose() * &y_vec));

    // Cell of each design row (the rows of the builder: merged records with a
    // value of the dependent variable, in order).
    let factors = config.main.fix_factor.clone().unwrap_or_default();
    let cells: Vec<String> = merge_records(data)
        .iter()
        .filter(|record| extract_dependent_value(record, dep_var).is_some())
        .map(|record| {
            factors
                .iter()
                .map(|f| record.values.get(f).map(data_value_to_string).unwrap_or_default())
                .collect::<Vec<String>>()
                .join("|")
        })
        .collect();
    if cells.len() != residuals.len() {
        return Err("Levene's test: residuals and cells do not match".to_string());
    }

    let mut groups: Vec<(String, Vec<f64>)> = Vec::new();
    for (cell, r) in cells.iter().zip(residuals.iter()) {
        match groups.iter_mut().find(|(key, _)| key == cell) {
            Some((_, values)) => values.push(r.abs()),
            None => groups.push((cell.clone(), vec![r.abs()])),
        }
    }
    let k = groups.len();
    let n = cells.len();
    if k < 2 || n <= k {
        return Err("Levene's test needs at least two cells and more cases than cells".to_string());
    }
    let all: Vec<f64> = groups.iter().flat_map(|(_, v)| v.iter().copied()).collect();
    let grand = calculate_mean(&all);
    let mut ss_between = 0.0;
    let mut ss_within = 0.0;
    for (_, values) in &groups {
        let mean = calculate_mean(values);
        ss_between += (values.len() as f64) * (mean - grand).powi(2);
        ss_within += values.iter().map(|v| (v - mean).powi(2)).sum::<f64>();
    }
    let df1 = (k - 1) as f64;
    let df2 = (n - k) as f64;
    let f = (ss_between / df1) / (ss_within / df2);
    let significance = match FisherSnedecor::new(df1, df2) {
        Ok(dist) if f.is_finite() => 1.0 - dist.cdf(f),
        _ => f64::NAN,
    };
    Ok(LeveneResult {
        levene_statistic: f,
        df1: k - 1,
        df2,
        significance,
        function: None,
        design: Some(format!("Design: {}", design_string)),
        test_basis: Some("Based on Model Residuals".to_string()),
    })
}
