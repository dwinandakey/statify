use rayon::prelude::*;
use std::collections::HashMap;

use crate::models::{
    result::{
        CanonicalFunctions, CasewiseStatistics, CrossValidatedCasewiseStatistics,
        HighestGroupStatistics, ScatterData,
    },
    AnalysisData, DiscriminantConfig,
};

use super::core::{
    calculate_canonical_functions, calculate_eigen_statistics, calculate_p_value_from_chi_square,
    calculate_pooled_within_matrix_no_epsilon, calculate_prior_probabilities,
    extract_analyzed_dataset, get_stepwise_selected_variables,
    EPSILON,
};

/// Calculate detailed statistics for each case
pub fn calculate_casewise_statistics(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<CasewiseStatistics, String> {

    if !config.classify.case {
        return Err("Casewise statistics not requested in configuration".to_string());
    }

    let dataset = extract_analyzed_dataset(data, config)?;
    let grouping_var = &config.main.grouping_variable;

    // Gunakan variabel hasil stepwise jika diaktifkan
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

    let canonical_functions = calculate_canonical_functions(data, config)?;
    let eigen_stats = calculate_eigen_statistics(data, config)?;
    let num_functions = eigen_stats.eigenvalue.len();

    let mut case_number = Vec::new();
    let mut actual_group = Vec::new();
    let mut predicted_group = Vec::new();

    let mut highest_p_value = Vec::new();
    let mut highest_df = Vec::new();
    let mut highest_p_g_equals_d = Vec::new();
    let mut highest_squared_mahalanobis_distance = Vec::new();
    let mut highest_group = Vec::new();

    let mut second_p_value = Vec::new();
    let mut second_df = Vec::new();
    let mut second_p_g_equals_d = Vec::new();
    let mut second_squared_mahalanobis_distance = Vec::new();
    let mut second_group = Vec::new();

    let mut discriminant_scores: HashMap<String, Vec<f64>> = (1..=num_functions)
        .map(|i| (format!("Function {}", i), Vec::new()))
        .collect();

    let prior_probs = calculate_prior_probabilities(data, config)?;

    let limit = if config.classify.limit {
        let val = config.classify.limit_value.unwrap_or(i32::MAX);
        if val <= 0 {
            usize::MAX
        } else {
            val as usize
        }
    } else {
        usize::MAX
    };

    let mut case_idx = 0;
    let mut processed_cases = 0;

    // [PERBAIKAN UTAMA]: Ekstrak data langsung dari `dataset` yang sudah terjamin matang (f64).
    // Loop langsung berdasarkan grup yang ada di dataset untuk mencegah mismatch data.
    for group_name in &dataset.group_labels {
        let n_cases = dataset
            .group_data
            .get(&variables_to_use[0])
            .and_then(|g| g.get(group_name))
            .map(|v| v.len())
            .unwrap_or(0);

        for i in 0..n_cases {
            if processed_cases >= limit {
                break;
            }

            case_idx += 1;
            processed_cases += 1;

            // Pasti terisi angka aslinya, tidak akan lagi bernilai 0.0 semua!
            let mut case_values = Vec::with_capacity(variables_to_use.len());
            for var in &variables_to_use {
                let val = dataset
                    .group_data
                    .get(var)
                    .and_then(|g| g.get(group_name))
                    .map(|v| v[i])
                    .unwrap_or(0.0);
                case_values.push(val);
            }

            let disc_scores = calculate_discriminant_scores(
                &case_values,
                &canonical_functions,
                &variables_to_use,
                num_functions,
            );

            for (func_idx, score) in disc_scores.iter().enumerate() {
                if let Some(scores) =
                    discriminant_scores.get_mut(&format!("Function {}", func_idx + 1))
                {
                    // Pastikan tidak ada NaN yang lolos ke frontend
                    scores.push(if score.is_nan() { 0.0 } else { *score });
                }
            }

            let mut group_probs = Vec::new();
            let mut group_distances = Vec::new();

            for (g_idx, target_group) in dataset.group_labels.iter().enumerate() {
                // Jarak Mahalanobis di dalam ruang Kanonikal adalah persis Jarak Euclidean
                let mut d2 = 0.0;
                if let Some(centroid) = canonical_functions.function_at_centroids.get(target_group)
                {
                    for (func_idx, &score) in disc_scores.iter().enumerate() {
                        if func_idx < centroid.len() {
                            d2 += (score - centroid[func_idx]).powi(2);
                        }
                    }
                }
                if d2.is_nan() {
                    d2 = f64::MAX;
                }
                group_distances.push((g_idx, d2));

                let prior = if g_idx < prior_probs.prior_probabilities.len() {
                    prior_probs.prior_probabilities[g_idx]
                } else {
                    1.0 / (dataset.num_groups as f64)
                };

                let log_prior = prior.ln();
                let log_prob = log_prior - 0.5 * d2;
                group_probs.push((g_idx, log_prob));
            }

            group_probs
                .sort_by(|(_, a), (_, b)| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

            let max_log_prob = group_probs[0].1;
            let mut sum_exp = 0.0;
            for (_, log_prob) in &mut group_probs {
                *log_prob = (*log_prob - max_log_prob).exp();
                sum_exp += *log_prob;
            }

            if sum_exp > 0.0 {
                for (_, prob) in &mut group_probs {
                    *prob /= sum_exp;
                }
            }

            let highest = &group_probs[0];
            let second = if group_probs.len() > 1 {
                &group_probs[1]
            } else {
                highest
            };

            let highest_dist = group_distances
                .iter()
                .find(|(idx, _)| *idx == highest.0)
                .unwrap()
                .1;
            let second_dist = group_distances
                .iter()
                .find(|(idx, _)| *idx == second.0)
                .unwrap()
                .1;

            case_number.push(case_idx);
            actual_group.push(group_name.clone());
            predicted_group.push(dataset.group_labels[highest.0].clone());

            let p_val_highest = calculate_p_value_from_chi_square(highest_dist, num_functions);
            let p_val_second = calculate_p_value_from_chi_square(second_dist, num_functions);

            highest_p_value.push(p_val_highest);
            highest_df.push(num_functions);
            highest_p_g_equals_d.push(highest.1);
            highest_squared_mahalanobis_distance.push(highest_dist);
            highest_group.push(dataset.group_labels[highest.0].clone());

            second_p_value.push(p_val_second);
            second_df.push(num_functions);
            second_p_g_equals_d.push(second.1);
            second_squared_mahalanobis_distance.push(second_dist);
            second_group.push(dataset.group_labels[second.0].clone());
        }
    }

    // ---- CROSS-VALIDATED (Leave-One-Out) ----
    // Only compute if config.classify.leave is true
    let cross_validated = if config.classify.leave {
        let cv_result = calculate_cross_validated_casewise(
            data,
            config,
            &dataset,
            &variables_to_use,
            num_functions,
        )?;
        Some(cv_result)
    } else {
        None
    };

    Ok(CasewiseStatistics {
        case_number,
        actual_group,
        predicted_group,
        highest_group: HighestGroupStatistics {
            p_value: highest_p_value,
            df: highest_df,
            p_g_equals_d: highest_p_g_equals_d,
            squared_mahalanobis_distance: highest_squared_mahalanobis_distance,
            group: highest_group,
        },
        second_highest_group: HighestGroupStatistics {
            p_value: second_p_value,
            df: second_df,
            p_g_equals_d: second_p_g_equals_d,
            squared_mahalanobis_distance: second_squared_mahalanobis_distance,
            group: second_group,
        },
        discriminant_scores,
        cross_validated,
    })
}

/// Compute cross-validated (leave-one-out) casewise statistics.
/// Each case is classified using discriminant functions derived from all OTHER cases.
/// Compute cross-validated (leave-one-out) casewise statistics.
/// Each case is classified using discriminant functions derived from all OTHER cases.
fn calculate_cross_validated_casewise(
    data: &AnalysisData,
    config: &DiscriminantConfig,
    dataset: &super::core::AnalyzedDataset,
    variables_to_use: &[String],
    _num_functions: usize,
) -> Result<CrossValidatedCasewiseStatistics, String> {

    // Guard against empty variables
    if variables_to_use.is_empty() {
        return Err("No variables available for casewise statistics".to_string());
    }

    let prior_probs = calculate_prior_probabilities(data, config)?;
    let p_vars = variables_to_use.len();

    // Collect all cases (group_name, case_index, case_values, original_idx) in order
    // The 4th element tracks the original sequential index for correct sorting
    let mut all_cases: Vec<(String, usize, Vec<f64>, usize)> = Vec::new();
    let mut original_idx = 0;
    for group_name in &dataset.group_labels {
        let n_cases = dataset
            .group_data
            .get(&variables_to_use[0])
            .and_then(|g| g.get(group_name))
            .map(|v| v.len())
            .unwrap_or(0);

        for i in 0..n_cases {
            let case_values: Vec<f64> = variables_to_use
                .iter()
                .map(|var| {
                    dataset
                        .group_data
                        .get(var)
                        .and_then(|g| g.get(group_name))
                        .map(|v| v[i])
                        .unwrap_or(0.0)
                })
                .collect();
            all_cases.push((group_name.clone(), i, case_values, original_idx));
            original_idx += 1;
        }
    }

    let total_cases = all_cases.len();

    // Process in parallel using rayon
    let results: Vec<CrossValidatedCaseResult> = all_cases
        .par_iter()
        .enumerate()
        .filter_map(
            |(_local_idx, (group_name, case_idx, case_values, original_idx))| {
                // Skip single-case groups (can't compute LOO for n=1)
                let group_cases = all_cases
                    .iter()
                    .filter(|(g, _, _, _)| g == group_name)
                    .count();
                if group_cases <= 1 {
                    return None;
                }

                // Create temp data with this case removed.
                let mut temp_data = data.clone();

                // The raw data arrays are flat per-variable: one row per case in the
                // original input order, with group_data/independent_data parallel by
                // row. `case_idx` is the index WITHIN the group, so map it to the raw
                // row index of the `case_idx`-th case that belongs to `group_name`.
                // (Previously the within-group index was used directly, which removed
                // the wrong case for every group after the first — so leave-one-out
                // never actually dropped the target case for groups 2, 3, …)
                let grouping_var = &config.main.grouping_variable;
                let matches_group = |record: &crate::models::data::DataRecord| -> bool {
                    match record.values.get(grouping_var) {
                        Some(crate::models::data::DataValue::Number(n)) => {
                            n.to_string() == *group_name
                        }
                        Some(crate::models::data::DataValue::Text(t)) => t == group_name,
                        _ => false,
                    }
                };

                let global_case_idx = {
                    let grouping_col = temp_data.group_data.first()?;
                    let mut seen = 0usize;
                    let mut found = None;
                    for (raw_idx, record) in grouping_col.iter().enumerate() {
                        if matches_group(record) {
                            if seen == *case_idx {
                                found = Some(raw_idx);
                                break;
                            }
                            seen += 1;
                        }
                    }
                    found
                }?;

                // Remove the case from every parallel column (grouping + independent).
                for col in temp_data.group_data.iter_mut() {
                    if global_case_idx < col.len() {
                        col.remove(global_case_idx);
                    }
                }
                for var_idx in 0..temp_data.independent_data.len() {
                    if global_case_idx < temp_data.independent_data[var_idx].len() {
                        temp_data.independent_data[var_idx].remove(global_case_idx);
                    }
                }

                let leave_dataset = match extract_analyzed_dataset(&temp_data, config) {
                    Ok(ds) => ds,
                    Err(_) => return None,
                };

                // --- PERBAIKAN SPSS: CROSS-VALIDATED MENGGUNAKAN OBSERVATION SPACE ---
                // Hitung Pooled Covariance Matrix Inverse secara langsung (tanpa Fungsi Kanonikal)
                let pooled_cov =
                    calculate_pooled_within_matrix_no_epsilon(&leave_dataset, variables_to_use);
                let mut reg_cov = pooled_cov.clone();
                for i in 0..p_vars {
                    reg_cov[(i, i)] += EPSILON;
                }
                let inv_cov = reg_cov
                    .try_inverse()
                    .unwrap_or_else(|| nalgebra::DMatrix::identity(p_vars, p_vars));

                let mut group_probs: Vec<(usize, f64)> = Vec::new();
                let mut group_distances: Vec<(usize, f64)> = Vec::new();
                let x_vec = nalgebra::DVector::from_vec(case_values.clone());

                // Hitung D^2 untuk setiap grup di ruang observasi
                for (g_idx, target_group) in leave_dataset.group_labels.iter().enumerate() {
                    let mut diff = nalgebra::DVector::zeros(p_vars);
                    for (v_idx, var_name) in variables_to_use.iter().enumerate() {
                        let g_mean = leave_dataset
                            .group_means
                            .get(target_group)
                            .and_then(|m| m.get(var_name))
                            .copied()
                            .unwrap_or(0.0);
                        diff[v_idx] = x_vec[v_idx] - g_mean;
                    }

                    // D^2 = (x - mean)^T * S^-1 * (x - mean)
                    let d2 = (diff.transpose() * &inv_cov * &diff)[0];
                    group_distances.push((g_idx, d2));

                    let prior = if g_idx < prior_probs.prior_probabilities.len() {
                        prior_probs.prior_probabilities[g_idx]
                    } else {
                        1.0 / (leave_dataset.num_groups as f64)
                    };

                    let log_prob = prior.ln() - 0.5 * d2;
                    group_probs.push((g_idx, log_prob));
                }

                group_probs.sort_by(|(_, a), (_, b)| {
                    b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal)
                });

                if group_probs.is_empty() {
                    return None;
                }

                let max_log_prob = group_probs[0].1;
                let mut sum_exp = 0.0;
                for (_, log_prob) in &mut group_probs {
                    *log_prob = (*log_prob - max_log_prob).exp();
                    sum_exp += *log_prob;
                }
                if sum_exp > 0.0 {
                    for (_, prob) in &mut group_probs {
                        *prob /= sum_exp;
                    }
                }

                let highest = &group_probs[0];
                let second = if group_probs.len() > 1 {
                    &group_probs[1]
                } else {
                    highest
                };

                let highest_dist = group_distances
                    .iter()
                    .find(|(idx, _)| *idx == highest.0)
                    .unwrap()
                    .1;
                let second_dist = group_distances
                    .iter()
                    .find(|(idx, _)| *idx == second.0)
                    .unwrap()
                    .1;

                // SPSS menggunakan df = p (jumlah variabel) untuk jarak di observation space!
                let df_cv = p_vars;

                let p_val_highest = calculate_p_value_from_chi_square(highest_dist, df_cv);
                let p_val_second = calculate_p_value_from_chi_square(second_dist, df_cv);

                let highest_group_name = leave_dataset
                    .group_labels
                    .get(highest.0)
                    .cloned()
                    .unwrap_or_default();
                let second_group_name = leave_dataset
                    .group_labels
                    .get(second.0)
                    .cloned()
                    .unwrap_or_default();

                Some(CrossValidatedCaseResult {
                    actual_group: group_name.clone(),
                    predicted_group: highest_group_name.clone(),
                    highest_p_value: p_val_highest,
                    highest_df: df_cv,
                    highest_p_g_equals_d: highest.1,
                    highest_squared_mahalanobis_distance: highest_dist,
                    highest_group: highest_group_name,
                    second_p_value: p_val_second,
                    second_df: df_cv,
                    second_p_g_equals_d: second.1,
                    second_squared_mahalanobis_distance: second_dist,
                    second_group: second_group_name,
                    original_idx: *original_idx,
                    discriminant_scores: None, // SPSS mengosongkan ini untuk Cross-Validated
                })
            },
        )
        .collect();

    // Sort results back into original sequential case order
    let mut sorted_results = results;
    sorted_results.sort_by_key(|r| r.original_idx);

    let case_number: Vec<usize> = (1..=total_cases).collect();
    let actual_group: Vec<String> = all_cases.iter().map(|(g, _, _, _)| g.clone()).collect();
    let predicted_group: Vec<String> = sorted_results
        .iter()
        .map(|r| r.predicted_group.clone())
        .collect();

    let highest_p_value: Vec<f64> = sorted_results.iter().map(|r| r.highest_p_value).collect();
    let highest_df: Vec<usize> = sorted_results.iter().map(|r| r.highest_df).collect();
    let highest_p_g_equals_d: Vec<f64> = sorted_results
        .iter()
        .map(|r| r.highest_p_g_equals_d)
        .collect();
    let highest_squared_mahalanobis_distance: Vec<f64> = sorted_results
        .iter()
        .map(|r| r.highest_squared_mahalanobis_distance)
        .collect();
    let highest_group_cv: Vec<String> = sorted_results
        .iter()
        .map(|r| r.highest_group.clone())
        .collect();

    let second_p_value: Vec<f64> = sorted_results.iter().map(|r| r.second_p_value).collect();
    let second_df: Vec<usize> = sorted_results.iter().map(|r| r.second_df).collect();
    let second_p_g_equals_d: Vec<f64> = sorted_results
        .iter()
        .map(|r| r.second_p_g_equals_d)
        .collect();
    let second_squared_mahalanobis_distance: Vec<f64> = sorted_results
        .iter()
        .map(|r| r.second_squared_mahalanobis_distance)
        .collect();
    let second_group_cv: Vec<String> = sorted_results
        .iter()
        .map(|r| r.second_group.clone())
        .collect();

    Ok(CrossValidatedCasewiseStatistics {
        case_number,
        actual_group,
        predicted_group,
        highest_group: HighestGroupStatistics {
            p_value: highest_p_value,
            df: highest_df,
            p_g_equals_d: highest_p_g_equals_d,
            squared_mahalanobis_distance: highest_squared_mahalanobis_distance,
            group: highest_group_cv,
        },
        second_highest_group: HighestGroupStatistics {
            p_value: second_p_value,
            df: second_df,
            p_g_equals_d: second_p_g_equals_d,
            squared_mahalanobis_distance: second_squared_mahalanobis_distance,
            group: second_group_cv,
        },
        discriminant_scores: None,
    })
}
#[allow(dead_code)]
struct CrossValidatedCaseResult {
    actual_group: String,
    predicted_group: String,
    highest_p_value: f64,
    highest_df: usize,
    highest_p_g_equals_d: f64,
    highest_squared_mahalanobis_distance: f64,
    highest_group: String,
    second_p_value: f64,
    second_df: usize,
    second_p_g_equals_d: f64,
    second_squared_mahalanobis_distance: f64,
    second_group: String,
    discriminant_scores: Option<Vec<f64>>,
    /// Original sequential index for correct sorting
    original_idx: usize,
}

/// Compute per-case discriminant scores for scatter plot rendering.
/// Does NOT require config.classify.case — called when combine || sep_grp is true.
pub fn calculate_scatter_data(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<ScatterData, String> {
    let dataset = extract_analyzed_dataset(data, config)?;
    let grouping_var = &config.main.grouping_variable;

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

    let canonical_functions = calculate_canonical_functions(data, config)?;
    let eigen_stats = calculate_eigen_statistics(data, config)?;
    let num_functions = eigen_stats.eigenvalue.len();

    let mut actual_group: Vec<String> = Vec::new();
    let mut discriminant_scores: HashMap<String, Vec<f64>> = (1..=num_functions)
        .map(|i| (format!("Function {}", i), Vec::new()))
        .collect();

    for group_name in &dataset.group_labels {
        let n = if variables_to_use.is_empty() {
            0
        } else {
            dataset.group_data
                .get(&variables_to_use[0])
                .and_then(|g| g.get(group_name))
                .map(|v| v.len())
                .unwrap_or(0)
        };

        for i in 0..n {
            actual_group.push(group_name.clone());

            let case_values: Vec<f64> = variables_to_use
                .iter()
                .map(|var| {
                    dataset.group_data
                        .get(var)
                        .and_then(|g| g.get(group_name))
                        .map(|v| v[i])
                        .unwrap_or(0.0)
                })
                .collect();

            let scores = calculate_discriminant_scores(
                &case_values,
                &canonical_functions,
                &variables_to_use,
                num_functions,
            );

            for (func_idx, score) in scores.iter().enumerate() {
                let key = format!("Function {}", func_idx + 1);
                if let Some(sv) = discriminant_scores.get_mut(&key) {
                    sv.push(if score.is_nan() { 0.0 } else { *score });
                }
            }
        }
    }

    Ok(ScatterData { actual_group, discriminant_scores })
}

/// Calculate discriminant scores for a case
fn calculate_discriminant_scores(
    case_values: &[f64],
    canonical_functions: &CanonicalFunctions,
    variables: &[String],
    num_functions: usize,
) -> Vec<f64> {
    let mut discriminant_scores = vec![0.0; num_functions];

    for (var_idx, var_name) in variables.iter().enumerate() {
        if let Some(coefs) = canonical_functions.coefficients.get(var_name) {
            for func_idx in 0..num_functions {
                if func_idx < coefs.len() && var_idx < case_values.len() {
                    discriminant_scores[func_idx] += case_values[var_idx] * coefs[func_idx];
                }
            }
        }
    }

    if let Some(constants) = canonical_functions.coefficients.get("(Constant)") {
        for func_idx in 0..num_functions.min(constants.len()) {
            discriminant_scores[func_idx] += constants[func_idx];
        }
    }

    discriminant_scores
}
