//! Bootstrap resampling for discriminant analysis.
//!
//! Implements case resampling (simple or stratified-by-group) with a seeded
//! Mersenne Twister, re-fits the canonical discriminant functions on each
//! resample, and summarises the standardized canonical discriminant function
//! coefficients with Bias, Std. Error and a confidence interval (Percentile or
//! BCa) — mirroring SPSS's "Bootstrap" output for those coefficients.
//!
//! Notes / scope:
//! - The model (selected variable set) is held fixed at the main analysis's
//!   selection; resampling perturbs the coefficient estimates, not the variable
//!   selection. This matches the common "bootstrap the fitted model" approach.
//! - Discriminant function signs are arbitrary per fit, so every resample is
//!   sign-aligned to the original solution before its coefficients are pooled —
//!   without this the bootstrap distribution would be meaningless (bimodal ±).

use std::collections::HashMap;

use rand_mt::Mt;
use statrs::distribution::{ContinuousCDF, Normal};

use crate::models::{
    result::{BootstrapCoefficient, BootstrapResults},
    AnalysisData, DiscriminantConfig,
};

use super::core::{
    calculate_between_groups_sscp, calculate_group_means, calculate_overall_means,
    calculate_pooled_within_matrix, extract_analyzed_dataset, get_stepwise_selected_variables,
    process_discriminant_coefficients, solve_eigenvalue_problem, AnalyzedDataset,
};

/// One resampled/observed case: its group label and predictor values (in the
/// same order as the model's variable list).
#[derive(Clone)]
struct Case {
    group: String,
    values: Vec<f64>,
}

/// Top-level bootstrap entry point. Returns `Err` when bootstrap is not
/// requested or the data is insufficient for a stable fit.
pub fn calculate_bootstrap(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<BootstrapResults, String> {
    if !config.bootstrap.perform_boot_strapping {
        return Err("Bootstrap not requested".to_string());
    }

    let n_samples = config.bootstrap.num_of_samples;
    if n_samples <= 0 {
        return Err("Number of bootstrap samples must be greater than 0".to_string());
    }

    let dataset = extract_analyzed_dataset(data, config)?;
    let variables = get_stepwise_selected_variables(data, config)?;
    if variables.is_empty() {
        return Err("No variables available for bootstrap".to_string());
    }

    let num_functions = std::cmp::min(dataset.num_groups.saturating_sub(1), variables.len());
    if num_functions == 0 {
        return Err("No discriminant functions available for bootstrap".to_string());
    }

    // Original solution — reference for sign alignment, bias and BCa.
    let (orig_unstd, orig_std) = canonical_coeffs_from_dataset(&dataset, &variables, num_functions)
        .ok_or_else(|| "Failed to compute original canonical coefficients".to_string())?;

    let cases = extract_cases(&dataset, &variables);

    // Mersenne Twister, seeded when the user set a seed.
    let seed: u32 = if config.bootstrap.seed {
        config.bootstrap.seed_value as u32
    } else {
        rand::random::<u32>()
    };
    let mut rng = Mt::new(seed);

    let stratified = config.bootstrap.stratified;
    let p = variables.len();

    // samples[var][function] = bootstrap estimates of the standardized coefficient.
    let mut samples: Vec<Vec<Vec<f64>>> =
        vec![vec![Vec::with_capacity(n_samples as usize); num_functions]; p];

    for _ in 0..n_samples {
        let resampled = if stratified {
            resample_stratified(&cases, &dataset.group_labels, &mut rng)
        } else {
            resample_simple(&cases, &mut rng)
        };

        let ds = dataset_from_cases(&resampled, &variables, &dataset.group_labels);
        if ds.num_groups < 2 {
            continue; // Degenerate resample (a group vanished) — skip.
        }

        if let Some((unstd, std)) = canonical_coeffs_from_dataset(&ds, &variables, num_functions) {
            let signs = alignment_signs(&orig_unstd, &unstd, &variables, num_functions);
            for (vi, var) in variables.iter().enumerate() {
                if let Some(coefs) = std.get(var) {
                    for f in 0..num_functions {
                        let val = coefs.get(f).copied().unwrap_or(0.0) * signs[f];
                        samples[vi][f].push(val);
                    }
                }
            }
        }
    }

    let use_bca = config.bootstrap.bca;
    let level = if config.bootstrap.level > 0.0 {
        config.bootstrap.level
    } else {
        95.0
    };
    let alpha = 1.0 - level / 100.0;

    // Jackknife acceleration per (variable, function) for BCa.
    let accel = if use_bca {
        Some(jackknife_acceleration(
            &cases,
            &variables,
            &dataset.group_labels,
            num_functions,
            &orig_unstd,
        ))
    } else {
        None
    };

    let mut standardized = Vec::with_capacity(p);
    for (vi, var) in variables.iter().enumerate() {
        let mut original = vec![0.0; num_functions];
        let mut bias = vec![0.0; num_functions];
        let mut std_error = vec![0.0; num_functions];
        let mut ci_lower = vec![0.0; num_functions];
        let mut ci_upper = vec![0.0; num_functions];

        for f in 0..num_functions {
            let orig = orig_std.get(var).and_then(|c| c.get(f)).copied().unwrap_or(0.0);
            original[f] = orig;

            let est = &samples[vi][f];
            if est.is_empty() {
                continue;
            }

            let mean = est.iter().sum::<f64>() / est.len() as f64;
            bias[f] = mean - orig;
            std_error[f] = std_dev(est, mean);

            let (lo, hi) = if use_bca {
                let a = accel.as_ref().map(|m| m[vi][f]).unwrap_or(0.0);
                bca_interval(est, orig, a, alpha)
            } else {
                percentile_interval(est, alpha)
            };
            ci_lower[f] = lo;
            ci_upper[f] = hi;
        }

        standardized.push(BootstrapCoefficient {
            variable: var.clone(),
            original,
            bias,
            std_error,
            ci_lower,
            ci_upper,
        });
    }

    let functions: Vec<String> = (1..=num_functions)
        .map(|i| format!("Function {}", i))
        .collect();

    Ok(BootstrapResults {
        num_samples: n_samples,
        level,
        ci_method: if use_bca { "BCa".to_string() } else { "Percentile".to_string() },
        sampling: if stratified { "Stratified".to_string() } else { "Simple".to_string() },
        functions,
        variables,
        standardized,
    })
}

/// Fit the canonical discriminant functions on a dataset and return the
/// (unstandardized, standardized) coefficient maps. Mirrors the math of
/// `calculate_eigen_statistics` + `calculate_canonical_functions` but operates
/// directly on an `AnalyzedDataset` (no I/O, no stepwise) so it can be called
/// thousands of times cheaply. Returns `None` if the fit is not possible.
fn canonical_coeffs_from_dataset(
    dataset: &AnalyzedDataset,
    variables: &[String],
    num_functions: usize,
) -> Option<(HashMap<String, Vec<f64>>, HashMap<String, Vec<f64>>)> {
    let df_within = dataset.total_cases as i64 - dataset.num_groups as i64;
    if df_within <= 0 || num_functions == 0 {
        return None;
    }

    let pooled = calculate_pooled_within_matrix(dataset, variables);
    let between = calculate_between_groups_sscp(dataset, variables);

    // Raw within SSCP = pooled covariance * df_within.
    let mut w_sscp = pooled.clone();
    w_sscp *= df_within as f64;

    let (_eigenvalues, eigenvectors) = solve_eigenvalue_problem(&w_sscp, &between, num_functions);

    // Scale eigenvectors by sqrt(df_within), matching calculate_eigen_statistics.
    let scale = (df_within as f64).sqrt();
    let scaled: Vec<Vec<f64>> = eigenvectors
        .iter()
        .map(|row| row.iter().map(|v| v * scale).collect())
        .collect();

    let (unstd, std) = process_discriminant_coefficients(
        &scaled,
        variables,
        &pooled,
        &dataset.overall_means,
        num_functions,
    );

    Some((unstd, std))
}

/// Reconstruct the per-case observations from the dataset (variable order
/// preserved). Each group contributes its cases in storage (index) order.
fn extract_cases(dataset: &AnalyzedDataset, variables: &[String]) -> Vec<Case> {
    let mut cases = Vec::new();
    for group in &dataset.group_labels {
        let n = dataset
            .group_data
            .get(&variables[0])
            .and_then(|g| g.get(group))
            .map_or(0, |v| v.len());

        for i in 0..n {
            let values: Vec<f64> = variables
                .iter()
                .map(|var| {
                    dataset
                        .group_data
                        .get(var)
                        .and_then(|g| g.get(group))
                        .and_then(|v| v.get(i))
                        .copied()
                        .unwrap_or(0.0)
                })
                .collect();
            cases.push(Case {
                group: group.clone(),
                values,
            });
        }
    }
    cases
}

/// Build an `AnalyzedDataset` from a set of (resampled) cases, recomputing group
/// and overall means. Group order follows `group_order`, restricted to groups
/// actually present.
fn dataset_from_cases(
    cases: &[Case],
    variables: &[String],
    group_order: &[String],
) -> AnalyzedDataset {
    // group_data[var][group] = Vec<f64>
    let mut group_data: HashMap<String, HashMap<String, Vec<f64>>> = HashMap::new();
    for var in variables {
        group_data.insert(var.clone(), HashMap::new());
    }

    for case in cases {
        for (vi, var) in variables.iter().enumerate() {
            group_data
                .get_mut(var)
                .unwrap()
                .entry(case.group.clone())
                .or_default()
                .push(case.values[vi]);
        }
    }

    // Present groups, in the original order.
    let present: std::collections::HashSet<&String> = cases.iter().map(|c| &c.group).collect();
    let group_labels: Vec<String> = group_order
        .iter()
        .filter(|g| present.contains(*g))
        .cloned()
        .collect();

    let group_means = calculate_group_means(&group_data, &group_labels, variables);
    let overall_means = calculate_overall_means(&group_data, &group_labels, variables);

    AnalyzedDataset {
        group_data,
        group_labels: group_labels.clone(),
        group_means,
        overall_means,
        num_groups: group_labels.len(),
        total_cases: cases.len(),
    }
}

/// Draw a uniform random index in `0..n` from the Mersenne Twister. Uses the
/// generator's inherent `next_u32` to avoid coupling to a specific `rand`
/// trait version; modulo bias is negligible for resampling.
fn next_index(rng: &mut Mt, n: usize) -> usize {
    (rng.next_u32() as usize) % n
}

/// Simple bootstrap: draw `cases.len()` cases uniformly with replacement.
fn resample_simple(cases: &[Case], rng: &mut Mt) -> Vec<Case> {
    let n = cases.len();
    (0..n).map(|_| cases[next_index(rng, n)].clone()).collect()
}

/// Stratified bootstrap: within each group, draw nᵢ cases with replacement so
/// group sizes are preserved.
fn resample_stratified(cases: &[Case], group_order: &[String], rng: &mut Mt) -> Vec<Case> {
    let mut by_group: HashMap<&String, Vec<&Case>> = HashMap::new();
    for c in cases {
        by_group.entry(&c.group).or_default().push(c);
    }

    let mut out = Vec::with_capacity(cases.len());
    for group in group_order {
        if let Some(group_cases) = by_group.get(group) {
            let m = group_cases.len();
            for _ in 0..m {
                out.push(group_cases[next_index(rng, m)].clone());
            }
        }
    }
    out
}

/// Per-function sign to apply to a resampled solution so it is oriented like the
/// original (dot product of unstandardized coefficient vectors ≥ 0).
fn alignment_signs(
    orig_unstd: &HashMap<String, Vec<f64>>,
    unstd: &HashMap<String, Vec<f64>>,
    variables: &[String],
    num_functions: usize,
) -> Vec<f64> {
    (0..num_functions)
        .map(|f| {
            let mut dot = 0.0;
            for var in variables {
                let a = orig_unstd.get(var).and_then(|c| c.get(f)).copied().unwrap_or(0.0);
                let b = unstd.get(var).and_then(|c| c.get(f)).copied().unwrap_or(0.0);
                dot += a * b;
            }
            if dot < 0.0 {
                -1.0
            } else {
                1.0
            }
        })
        .collect()
}

/// Sample standard deviation (n-1 denominator).
fn std_dev(values: &[f64], mean: f64) -> f64 {
    let n = values.len();
    if n < 2 {
        return 0.0;
    }
    let ss: f64 = values.iter().map(|&v| (v - mean).powi(2)).sum();
    (ss / (n as f64 - 1.0)).sqrt()
}

/// Type-7 (linear interpolation) quantile of an already-sorted slice.
fn quantile_sorted(sorted: &[f64], q: f64) -> f64 {
    let n = sorted.len();
    if n == 0 {
        return 0.0;
    }
    if n == 1 {
        return sorted[0];
    }
    let q = q.clamp(0.0, 1.0);
    let h = (n as f64 - 1.0) * q;
    let lo = h.floor() as usize;
    let hi = h.ceil() as usize;
    if lo == hi {
        sorted[lo]
    } else {
        sorted[lo] + (h - lo as f64) * (sorted[hi] - sorted[lo])
    }
}

/// Percentile confidence interval at the two-sided level implied by `alpha`.
fn percentile_interval(estimates: &[f64], alpha: f64) -> (f64, f64) {
    let mut sorted = estimates.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let lo = quantile_sorted(&sorted, alpha / 2.0);
    let hi = quantile_sorted(&sorted, 1.0 - alpha / 2.0);
    (lo, hi)
}

/// Bias-corrected and accelerated (BCa) confidence interval.
fn bca_interval(estimates: &[f64], original: f64, accel: f64, alpha: f64) -> (f64, f64) {
    let n = estimates.len();
    if n < 2 {
        return (original, original);
    }

    let mut sorted = estimates.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let normal = match Normal::new(0.0, 1.0) {
        Ok(d) => d,
        Err(_) => return percentile_interval(estimates, alpha),
    };

    // Bias-correction z0 from the proportion of estimates below the original.
    let below = estimates.iter().filter(|&&v| v < original).count() as f64;
    let prop = (below / n as f64).clamp(1e-6, 1.0 - 1e-6);
    let z0 = normal.inverse_cdf(prop);

    let z_lo = normal.inverse_cdf(alpha / 2.0);
    let z_hi = normal.inverse_cdf(1.0 - alpha / 2.0);

    let adjust = |z: f64| -> f64 {
        let num = z0 + z;
        let denom = 1.0 - accel * num;
        let p = z0 + num / denom;
        normal.cdf(p).clamp(0.0, 1.0)
    };

    let lo = quantile_sorted(&sorted, adjust(z_lo));
    let hi = quantile_sorted(&sorted, adjust(z_hi));
    (lo, hi)
}

/// Jackknife acceleration `a` for every (variable, function), needed by BCa.
/// Leaves out one case at a time, re-fits, sign-aligns to the original, and
/// applies the standard skewness-of-jackknife formula.
fn jackknife_acceleration(
    cases: &[Case],
    variables: &[String],
    group_order: &[String],
    num_functions: usize,
    orig_unstd: &HashMap<String, Vec<f64>>,
) -> Vec<Vec<f64>> {
    let p = variables.len();
    let n = cases.len();

    // theta[var][function] = Vec of leave-one-out standardized estimates.
    let mut theta: Vec<Vec<Vec<f64>>> = vec![vec![Vec::with_capacity(n); num_functions]; p];

    for skip in 0..n {
        let subset: Vec<Case> = cases
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != skip)
            .map(|(_, c)| c.clone())
            .collect();

        let ds = dataset_from_cases(&subset, variables, group_order);
        if ds.num_groups < 2 {
            continue;
        }

        if let Some((unstd, std)) = canonical_coeffs_from_dataset(&ds, variables, num_functions) {
            let signs = alignment_signs(orig_unstd, &unstd, variables, num_functions);
            for (vi, var) in variables.iter().enumerate() {
                if let Some(coefs) = std.get(var) {
                    for f in 0..num_functions {
                        theta[vi][f].push(coefs.get(f).copied().unwrap_or(0.0) * signs[f]);
                    }
                }
            }
        }
    }

    let mut accel = vec![vec![0.0; num_functions]; p];
    for vi in 0..p {
        for f in 0..num_functions {
            let vals = &theta[vi][f];
            if vals.len() < 2 {
                continue;
            }
            let mean = vals.iter().sum::<f64>() / vals.len() as f64;
            // The jackknife uses (mean - θ_i); sign cancels in the ratio.
            let mut num = 0.0;
            let mut den = 0.0;
            for &v in vals {
                let d = mean - v;
                num += d.powi(3);
                den += d.powi(2);
            }
            let denom = 6.0 * den.powf(1.5);
            accel[vi][f] = if denom.abs() > 1e-12 { num / denom } else { 0.0 };
        }
    }

    accel
}
