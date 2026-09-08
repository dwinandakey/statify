//! Classification results for discriminant analysis.
//!
//! This module implements functions to calculate classification results,
//! including original and cross-validated classifications.

use nalgebra::DVector;
use rayon::prelude::*;
use std::collections::HashMap;

use crate::models::result::{
    CanonicalFunctions, ClassificationFunctionCoefficients, EigenDescription,
};
use crate::models::{result::ClassificationResults, AnalysisData, DiscriminantConfig};

use super::core::{
    calculate_canonical_functions, calculate_eigen_statistics, calculate_pooled_within_matrix,
    extract_analyzed_dataset, get_stepwise_selected_variables, AnalyzedDataset, EPSILON,
};

use crate::stats::matrix_calculation::calculate_pooled_within_matrix_no_epsilon;

/// Calculate classification results for discriminant analysis
pub fn calculate_classification_results(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<ClassificationResults, String> {
    let dataset = extract_analyzed_dataset(data, config)?;
    let grouping_var = &config.main.grouping_variable;

    // Pastikan kita HANYA menggunakan variabel yang lolos stepwise!
    let variables_to_use: Vec<String> = if config.main.stepwise {
        get_stepwise_selected_variables(data, config)?
    } else {
        config
            .main
            .independent_variables
            .iter()
            .filter(|v| *v != grouping_var)
            .cloned()
            .collect()
    };

    if variables_to_use.is_empty() {
        return Err("No independent variables available for classification.".into());
    }

    let eigen_stats = calculate_eigen_statistics(data, config)?;
    let canonical_functions = calculate_canonical_functions(data, config)?;

    let mut original_classification = HashMap::new();
    let mut original_percentage = HashMap::new();

    for group in &dataset.group_labels {
        original_classification.insert(group.clone(), vec![0; dataset.group_labels.len()]);
        original_percentage.insert(group.clone(), vec![0.0; dataset.group_labels.len()]);
    }

    // --- MENGHITUNG ORIGINAL CLASSIFICATION (Bebas Bug Indexing) ---
    for group_name in &dataset.group_labels {
        let n_cases = dataset
            .group_data
            .get(&variables_to_use[0])
            .and_then(|g| g.get(group_name))
            .map_or(0, |v| v.len());

        for i in 0..n_cases {
            // Tarik data per-case dengan aman
            let mut case_values = Vec::with_capacity(variables_to_use.len());
            for var in &variables_to_use {
                let val = dataset
                    .group_data
                    .get(var)
                    .unwrap()
                    .get(group_name)
                    .unwrap()[i];
                case_values.push(val);
            }

            // Klasifikasikan menggunakan logika anti-underflow yang sama dengan Casewise
            let predicted_idx = classify_case_safe(
                &case_values,
                &canonical_functions,
                &eigen_stats,
                &dataset,
                &variables_to_use,
                config,
            );

            if let Some(counts) = original_classification.get_mut(group_name) {
                counts[predicted_idx] += 1;
            }
        }
    }

    // Kalkulasi Persentase Original
    for group in &dataset.group_labels {
        if let Some(counts) = original_classification.get(group) {
            let total_cases = counts.iter().sum::<i32>() as f64;
            if total_cases > 0.0 {
                if let Some(percentages) = original_percentage.get_mut(group) {
                    for (i, &count) in counts.iter().enumerate() {
                        percentages[i] = ((count as f64) * 100.0) / total_cases;
                    }
                }
            }
        }
    }

    // --- MENGHITUNG CROSS-VALIDATED CLASSIFICATION (SPSS Matching) ---
    let (cross_validated_classification, cross_validated_percentage) = if config.classify.leave {
        calculate_cross_validation(config, &dataset, &variables_to_use)?
    } else {
        (None, None)
    };

    Ok(ClassificationResults {
        original_classification,
        cross_validated_classification,
        original_percentage,
        cross_validated_percentage,
    })
}

/// Calculate cross-validation results using leave-one-out method
fn calculate_cross_validation(
    config: &DiscriminantConfig,
    dataset: &AnalyzedDataset,
    variables_to_use: &[String],
) -> Result<
    (
        Option<HashMap<String, Vec<i32>>>,
        Option<HashMap<String, Vec<f64>>>,
    ),
    String,
> {
    let mut cv_classification = HashMap::new();
    let mut cv_percentage = HashMap::new();

    for group in &dataset.group_labels {
        cv_classification.insert(group.clone(), vec![0; dataset.group_labels.len()]);
        cv_percentage.insert(group.clone(), vec![0.0; dataset.group_labels.len()]);
    }

    let p_vars = variables_to_use.len();

    // Kumpulkan semua case
    let mut all_cases: Vec<(String, usize, Vec<f64>)> = Vec::new();
    for group_name in &dataset.group_labels {
        let n_cases = dataset
            .group_data
            .get(&variables_to_use[0])
            .and_then(|g| g.get(group_name))
            .map_or(0, |v| v.len());
        for i in 0..n_cases {
            let case_values: Vec<f64> = variables_to_use
                .iter()
                .map(|var| {
                    dataset
                        .group_data
                        .get(var)
                        .unwrap()
                        .get(group_name)
                        .unwrap()[i]
                })
                .collect();
            all_cases.push((group_name.clone(), i, case_values));
        }
    }

    let cv_results: Vec<(String, usize)> = all_cases
        .par_iter()
        .filter_map(|(group_name, case_idx, case_values)| {
            let group_cases = all_cases.iter().filter(|(g, _, _)| g == group_name).count();
            if group_cases <= 1 {
                return None;
            } // Skip grup yang hanya punya 1 anggota

            // Clone dataset asli dan buang 1 case ini (Sangat efisien!)
            let mut leave_dataset = dataset.clone();
            leave_dataset.total_cases -= 1;

            for var in variables_to_use {
                if let Some(g_data) = leave_dataset.group_data.get_mut(var) {
                    if let Some(v_data) = g_data.get_mut(group_name) {
                        v_data.remove(*case_idx);
                    }
                }

                // Update ulang Rata-rata Grup (Group Means)
                let mut sum = 0.0;
                let mut count = 0;
                if let Some(v_data) = leave_dataset.group_data.get(var).unwrap().get(group_name) {
                    for &val in v_data {
                        sum += val;
                        count += 1;
                    }
                }
                let new_mean = if count > 0 { sum / count as f64 } else { 0.0 };
                leave_dataset
                    .group_means
                    .get_mut(group_name)
                    .unwrap()
                    .insert(var.clone(), new_mean);
            }

            // Hitung jarak Mahalanobis menggunakan Observation Space (Seperti SPSS)
            let pooled_cov =
                calculate_pooled_within_matrix_no_epsilon(&leave_dataset, variables_to_use);
            let mut reg_cov = pooled_cov.clone();
            for i in 0..p_vars {
                reg_cov[(i, i)] += EPSILON;
            }
            let inv_cov = reg_cov
                .try_inverse()
                .unwrap_or_else(|| nalgebra::DMatrix::identity(p_vars, p_vars));

            let priors = if config.classify.all_group_equal {
                vec![1.0 / (leave_dataset.num_groups as f64); leave_dataset.num_groups]
            } else {
                calculate_group_priors(&leave_dataset)
            };

            let mut group_probs = Vec::new();
            let x_vec = nalgebra::DVector::from_vec(case_values.clone());

            for (g_idx, target_group) in leave_dataset.group_labels.iter().enumerate() {
                let mut diff = nalgebra::DVector::zeros(p_vars);
                for (v_idx, var_name) in variables_to_use.iter().enumerate() {
                    let g_mean = leave_dataset
                        .group_means
                        .get(target_group)
                        .unwrap()
                        .get(var_name)
                        .copied()
                        .unwrap_or(0.0);
                    diff[v_idx] = x_vec[v_idx] - g_mean;
                }

                let d2 = (diff.transpose() * &inv_cov * &diff)[0];

                // Menggunakan properti Logaritma Natural agar bebas dari Underflow!
                let log_prob = priors[g_idx].ln() - 0.5 * d2;
                group_probs.push((g_idx, log_prob));
            }

            // Urutkan dan ambil yang probabilitasnya paling tinggi
            group_probs
                .sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
            Some((group_name.clone(), group_probs[0].0))
        })
        .collect();

    // Rekapitulasi jumlah
    for (group_name, predicted_idx) in cv_results {
        cv_classification.get_mut(&group_name).unwrap()[predicted_idx] += 1;
    }

    // Rekapitulasi persentase
    for group in &dataset.group_labels {
        if let Some(counts) = cv_classification.get(group) {
            let total_cases = counts.iter().sum::<i32>() as f64;
            if total_cases > 0.0 {
                if let Some(percentages) = cv_percentage.get_mut(group) {
                    for (i, &count) in counts.iter().enumerate() {
                        percentages[i] = ((count as f64) * 100.0) / total_cases;
                    }
                }
            }
        }
    }

    Ok((Some(cv_classification), Some(cv_percentage)))
}

/// Classify a case securely (Anti-Underflow)
fn classify_case_safe(
    case_values: &[f64],
    canonical_functions: &CanonicalFunctions,
    eigen_stats: &EigenDescription,
    dataset: &AnalyzedDataset,
    variables_to_use: &[String],
    config: &DiscriminantConfig,
) -> usize {
    let num_functions = eigen_stats.eigenvalue.len();
    let num_groups = dataset.group_labels.len();

    let mut disc_scores = vec![0.0; num_functions];
    for (var_idx, var_name) in variables_to_use.iter().enumerate() {
        if let Some(coefs) = canonical_functions.coefficients.get(var_name) {
            for func_idx in 0..num_functions {
                if func_idx < coefs.len() && var_idx < case_values.len() {
                    disc_scores[func_idx] += case_values[var_idx] * coefs[func_idx];
                }
            }
        }
    }

    if let Some(constants) = canonical_functions.coefficients.get("(Constant)") {
        for func_idx in 0..num_functions.min(constants.len()) {
            disc_scores[func_idx] += constants[func_idx];
        }
    }

    let priors = if config.classify.all_group_equal {
        vec![1.0 / (num_groups as f64); num_groups]
    } else {
        calculate_group_priors(dataset)
    };

    let mut group_probs = Vec::with_capacity(num_groups);

    for (g_idx, target_group) in dataset.group_labels.iter().enumerate() {
        let mut d2 = 0.0;
        if let Some(centroid) = canonical_functions.function_at_centroids.get(target_group) {
            for (fi, &score) in disc_scores.iter().enumerate() {
                if fi < centroid.len() {
                    d2 += (score - centroid[fi]).powi(2);
                }
            }
        }
        if d2.is_nan() {
            d2 = f64::MAX;
        }

        let log_prior = priors[g_idx].ln();
        let log_prob = log_prior - 0.5 * d2;
        group_probs.push((g_idx, log_prob));
    }

    group_probs.sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    group_probs[0].0
}

/// Calculate group prior probabilities
fn calculate_group_priors(dataset: &AnalyzedDataset) -> Vec<f64> {
    let mut priors = Vec::new();
    let total = dataset.total_cases as f64;

    if total == 0.0 {
        return vec![1.0 / dataset.num_groups as f64; dataset.num_groups];
    }

    for group in &dataset.group_labels {
        let count = dataset
            .group_data
            .values()
            .next()
            .unwrap()
            .get(group)
            .map_or(0, |v| v.len());
        priors.push(count as f64 / total);
    }
    priors
}

/// Calculate Fisher's linear discriminant function coefficients
pub fn calculate_summary_classification(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<ClassificationFunctionCoefficients, String> {
    let dataset = extract_analyzed_dataset(data, config)?;
    let grouping_var = &config.main.grouping_variable;

    // Pastikan tabel "Classification Function Coefficients" juga difilter dari stepwise!
    let variables: Vec<String> = if config.main.stepwise {
        get_stepwise_selected_variables(data, config)?
    } else {
        config
            .main
            .independent_variables
            .iter()
            .filter(|v| *v != grouping_var)
            .cloned()
            .collect()
    };

    let pooled_within = calculate_pooled_within_matrix(&dataset, &variables);

    let pooled_within_inv = match pooled_within.try_inverse() {
        Some(inv) => inv,
        None => return Err("Failed to invert pooled within-groups matrix".to_string()),
    };

    let mut coefficients: HashMap<String, Vec<f64>> = HashMap::new();
    let mut constant_terms: Vec<f64> = Vec::with_capacity(dataset.group_labels.len());
    let mut groups: Vec<usize> = Vec::with_capacity(dataset.group_labels.len());

    for (group_idx, group) in dataset.group_labels.iter().enumerate() {
        groups.push(group_idx + 1);

        let mut group_means = DVector::zeros(variables.len());
        for (var_idx, var_name) in variables.iter().enumerate() {
            let mean = dataset
                .group_means
                .get(group)
                .and_then(|m| m.get(var_name))
                .copied()
                .unwrap_or(0.0);
            group_means[var_idx] = mean;
        }

        for (var_idx, var_name) in variables.iter().enumerate() {
            let coef = ((dataset.total_cases - dataset.num_groups) as f64)
                * (0..variables.len())
                    .map(|l| pooled_within_inv[(var_idx, l)] * group_means[l])
                    .sum::<f64>();

            coefficients
                .entry(var_name.clone())
                .or_insert_with(|| vec![0.0; dataset.group_labels.len()])[group_idx] = coef;
        }

        let prior = 1.0 / (dataset.group_labels.len() as f64);
        let log_prior = prior.ln();

        let half_sum = 0.5
            * variables
                .iter()
                .enumerate()
                .map(|(var_idx, var_name)| {
                    let coef = coefficients
                        .get(var_name)
                        .map(|c| c[group_idx])
                        .unwrap_or(0.0);
                    coef * group_means[var_idx]
                })
                .sum::<f64>();

        constant_terms.push(log_prior - half_sum);
    }

    Ok(ClassificationFunctionCoefficients {
        groups,
        variables: variables.clone(),
        coefficients,
        constant_terms,
    })
}
