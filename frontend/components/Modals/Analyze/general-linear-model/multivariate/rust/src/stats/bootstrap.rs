use std::collections::HashMap;

use rand::{ Rng, SeedableRng };
use rand::rngs::StdRng;
use statrs::distribution::{ ContinuousCDF, Normal };

use crate::models::{ config::MultivariateConfig, data::{ AnalysisData, DataRecord, DataValue } };

/// Perform bootstrap analysis
pub fn perform_bootstrap_analysis(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<(), String> {
    if !config.bootstrap.perform_boot_strapping {
        return Ok(());
    }

    let dep_vars = config.main.dep_var
        .as_ref()
        .filter(|vars| !vars.is_empty())
        .ok_or_else(|| "No dependent variables specified for bootstrap".to_string())?;

    let records = collect_records(data);
    if records.is_empty() {
        return Err("No records available for bootstrap".to_string());
    }

    let num_samples = config.bootstrap.num_of_samples
        .ok_or_else(|| "Number of bootstrap samples must be specified".to_string())?;

    if num_samples <= 0 {
        return Err("Number of bootstrap samples must be greater than 0".to_string());
    }

    let confidence_level = normalize_confidence_level(config.bootstrap.level.unwrap_or(95.0));
    let alpha = (1.0 - confidence_level).clamp(1e-12, 1.0 - 1e-12);

    let mut rng = if config.bootstrap.seed {
        let seed = config.bootstrap.seed_value.unwrap_or(200000).max(0) as u64;
        StdRng::seed_from_u64(seed)
    } else {
        StdRng::from_entropy()
    };

    let strata_groups = if config.bootstrap.stratified {
        let strata_vars = config.bootstrap.strata_variables
            .as_ref()
            .filter(|vars| !vars.is_empty())
            .ok_or_else(|| "StrataVariables must be specified for stratified bootstrap".to_string())?;
        build_strata_groups(&records, strata_vars)
    } else {
        HashMap::new()
    };

    if config.bootstrap.stratified && strata_groups.is_empty() {
        return Err("Stratified bootstrap requested but no valid strata groups were found".to_string());
    }

    let mut bootstrap_distributions: HashMap<String, Vec<f64>> = dep_vars
        .iter()
        .map(|name| (name.clone(), Vec::with_capacity(num_samples as usize)))
        .collect();

    for _ in 0..(num_samples as usize) {
        let sample_indices = if config.bootstrap.stratified {
            sample_stratified_indices(&strata_groups, &mut rng)
        } else {
            sample_simple_indices(records.len(), &mut rng)
        };

        for dep_var in dep_vars {
            if let Some(mean) = sample_mean(&records, &sample_indices, dep_var) {
                if let Some(distribution) = bootstrap_distributions.get_mut(dep_var) {
                    distribution.push(mean);
                }
            }
        }
    }

    for dep_var in dep_vars {
        let distribution = bootstrap_distributions
            .get(dep_var)
            .ok_or_else(|| format!("Missing bootstrap distribution for dependent variable {}", dep_var))?;

        if distribution.is_empty() {
            return Err(
                format!(
                    "Bootstrap distribution is empty for dependent variable {}",
                    dep_var
                )
            );
        }

        let full_indices: Vec<usize> = (0..records.len()).collect();
        let original = sample_mean(&records, &full_indices, dep_var)
            .ok_or_else(|| format!("Unable to compute original estimate for {}", dep_var))?;

        let (_lower, _upper) = if config.bootstrap.bca {
            bca_interval(distribution, original, &records, dep_var, alpha)?
        } else {
            percentile_interval(distribution, alpha)
        };

        // Intervals are computed here to validate the full bootstrap workflow.
        // Result wiring can consume these values in a follow-up enhancement.
    }

    Ok(())
}

fn collect_records(data: &AnalysisData) -> Vec<&DataRecord> {
    data.dependent_data.iter().flat_map(|records| records.iter()).collect()
}

fn normalize_confidence_level(level: f64) -> f64 {
    if level > 1.0 {
        (level / 100.0).clamp(0.0, 1.0)
    } else {
        level.clamp(0.0, 1.0)
    }
}

fn build_strata_groups(
    records: &[&DataRecord],
    strata_vars: &[String]
) -> HashMap<String, Vec<usize>> {
    let mut groups: HashMap<String, Vec<usize>> = HashMap::new();

    for (idx, record) in records.iter().enumerate() {
        let key = strata_vars
            .iter()
            .map(|name| {
                record.values
                    .get(name)
                    .map(data_value_to_key)
                    .unwrap_or_else(|| "null".to_string())
            })
            .collect::<Vec<String>>()
            .join("|");

        groups.entry(key).or_default().push(idx);
    }

    groups.retain(|_, indices| !indices.is_empty());
    groups
}

fn data_value_to_key(value: &DataValue) -> String {
    match value {
        DataValue::Number(v) => format!("{:.12}", v),
        DataValue::Text(s) => s.clone(),
        DataValue::Boolean(b) => b.to_string(),
        DataValue::Null => "null".to_string(),
    }
}

fn sample_simple_indices(n: usize, rng: &mut StdRng) -> Vec<usize> {
    let mut indices = Vec::with_capacity(n);
    for _ in 0..n {
        indices.push(rng.gen_range(0..n));
    }
    indices
}

fn sample_stratified_indices(
    groups: &HashMap<String, Vec<usize>>,
    rng: &mut StdRng
) -> Vec<usize> {
    let total_size: usize = groups.values().map(|idx| idx.len()).sum();
    let mut indices = Vec::with_capacity(total_size);

    for group_indices in groups.values() {
        for _ in 0..group_indices.len() {
            let pick = group_indices[rng.gen_range(0..group_indices.len())];
            indices.push(pick);
        }
    }

    indices
}

fn sample_mean(records: &[&DataRecord], indices: &[usize], dep_var: &str) -> Option<f64> {
    let mut sum = 0.0;
    let mut count = 0usize;

    for idx in indices {
        if let Some(record) = records.get(*idx) {
            if let Some(DataValue::Number(value)) = record.values.get(dep_var) {
                sum += value;
                count += 1;
            }
        }
    }

    if count == 0 {
        None
    } else {
        Some(sum / (count as f64))
    }
}

fn percentile_interval(values: &[f64], alpha: f64) -> (f64, f64) {
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let lower = quantile(&sorted, alpha / 2.0);
    let upper = quantile(&sorted, 1.0 - alpha / 2.0);
    (lower, upper)
}

fn bca_interval(
    bootstrap_values: &[f64],
    original_estimate: f64,
    records: &[&DataRecord],
    dep_var: &str,
    alpha: f64
) -> Result<(f64, f64), String> {
    let mut sorted = bootstrap_values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let normal = Normal::new(0.0, 1.0).map_err(|e| format!("Failed to create Normal(0,1): {}", e))?;

    let b = sorted.len() as f64;
    let proportion_less = (sorted.iter().filter(|v| **v < original_estimate).count() as f64) / b;
    let clamped_prop = proportion_less.clamp(1.0 / (2.0 * b), 1.0 - (1.0 / (2.0 * b)));
    let z0 = normal.inverse_cdf(clamped_prop);

    let a = jackknife_acceleration(records, dep_var).unwrap_or(0.0);

    let z_alpha_low = normal.inverse_cdf(alpha / 2.0);
    let z_alpha_high = normal.inverse_cdf(1.0 - alpha / 2.0);

    let adj_low = adjusted_bca_probability(z0, a, z_alpha_low, &normal);
    let adj_high = adjusted_bca_probability(z0, a, z_alpha_high, &normal);

    let lower = quantile(&sorted, adj_low);
    let upper = quantile(&sorted, adj_high);

    Ok((lower, upper))
}

fn adjusted_bca_probability(z0: f64, a: f64, z_alpha: f64, normal: &Normal) -> f64 {
    let denom = 1.0 - a * (z0 + z_alpha);
    if denom.abs() < 1e-12 {
        return normal.cdf(z0 + z_alpha).clamp(0.0, 1.0);
    }

    let adjusted_z = z0 + ((z0 + z_alpha) / denom);
    normal.cdf(adjusted_z).clamp(0.0, 1.0)
}

fn jackknife_acceleration(records: &[&DataRecord], dep_var: &str) -> Option<f64> {
    let values: Vec<f64> = records
        .iter()
        .filter_map(|record| {
            if let Some(DataValue::Number(v)) = record.values.get(dep_var) {
                Some(*v)
            } else {
                None
            }
        })
        .collect();

    if values.len() < 3 {
        return Some(0.0);
    }

    let total_sum: f64 = values.iter().sum();
    let n = values.len();

    let mut jackknife_estimates = Vec::with_capacity(n);
    for value in &values {
        let estimate = (total_sum - *value) / ((n - 1) as f64);
        jackknife_estimates.push(estimate);
    }

    let theta_dot = jackknife_estimates.iter().sum::<f64>() / (jackknife_estimates.len() as f64);

    let mut numerator = 0.0;
    let mut denominator_component = 0.0;
    for estimate in jackknife_estimates {
        let diff = theta_dot - estimate;
        numerator += diff.powi(3);
        denominator_component += diff.powi(2);
    }

    let denominator = 6.0 * denominator_component.powf(1.5);
    if denominator.abs() < 1e-12 {
        Some(0.0)
    } else {
        Some(numerator / denominator)
    }
}

fn quantile(sorted_values: &[f64], probability: f64) -> f64 {
    if sorted_values.is_empty() {
        return f64::NAN;
    }

    if sorted_values.len() == 1 {
        return sorted_values[0];
    }

    let p = probability.clamp(0.0, 1.0);
    let position = p * ((sorted_values.len() - 1) as f64);
    let lower_idx = position.floor() as usize;
    let upper_idx = position.ceil() as usize;

    if lower_idx == upper_idx {
        sorted_values[lower_idx]
    } else {
        let weight = position - (lower_idx as f64);
        sorted_values[lower_idx] * (1.0 - weight) + sorted_values[upper_idx] * weight
    }
}
