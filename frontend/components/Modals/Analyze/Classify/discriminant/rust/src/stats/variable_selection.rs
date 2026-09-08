//! Variable selection for discriminant analysis.
//!
//! This module implements variable selection algorithms and criteria
//! for discriminant analysis.

use rayon::prelude::*;

use crate::models::{
    result::{VariableInAnalysis, VariableNotInAnalysis},
    DiscriminantConfig,
};

use super::core::{
    calculate_min_f_ratio_with_groups, calculate_min_mahalanobis_distance_with_groups,
    calculate_raos_v, calculate_tolerance, calculate_total_unexplained_variation,
    calculate_variable_f_to_enter, calculate_variable_f_to_remove,
    AnalyzedDataset, MethodType, TOLERANCE_THRESHOLD, EPSILON,
};

/// Determine the method type from configuration
///
/// # Parameters
/// * `config` - The discriminant analysis configuration
///
/// # Returns
/// The method type to use for variable selection
pub fn determine_method_type(config: &DiscriminantConfig) -> MethodType {
    match true {
        _ if config.method.wilks => MethodType::Wilks,
        _ if config.method.unexplained => MethodType::Unexplained,
        _ if config.method.mahalonobis => MethodType::Mahalanobis,
        _ if config.method.f_ratio => MethodType::FRatio,
        _ if config.method.raos => MethodType::Raos,
        _ => MethodType::Wilks, // Default
    }
}

/// Analyze variables not in the model
///
/// This function calculates statistics for variables not yet included
/// in the discriminant model, to determine which should be entered next.
///
/// # Parameters
/// * `variables` - Variables not in the model
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
/// * `config` - The discriminant analysis configuration
///
/// # Returns
/// A vector of VariableNotInAnalysis with statistics for each variable
pub fn analyze_variables_not_in_model(
    variables: &[String],
    dataset: &AnalyzedDataset,
    current_variables: &[String],
    config: &DiscriminantConfig,
) -> Vec<VariableNotInAnalysis> {
    let method_type = determine_method_type(config);

    // Parallel analysis of variables
    let results: Vec<Option<VariableNotInAnalysis>> = variables
        .par_iter()
        .map(|var_name| {
            // Calculate tolerance
            let (tolerance, min_tolerance) =
                calculate_tolerance(var_name, dataset, current_variables);

            // Tolerance check: reject if tolerance < 0.001 (SPSS default)
            if tolerance < TOLERANCE_THRESHOLD || min_tolerance < TOLERANCE_THRESHOLD {
                return None;
            }
            let vin = if tolerance > EPSILON { 1.0 / tolerance } else { f64::MAX };
            if vin > 10.0 {
                // VIN > 10 indicates severe multicollinearity — reject variable
                return None;
            }

            // Calculate F-to-enter
            let (f_to_enter, wilks_lambda) =
                calculate_variable_f_to_enter(var_name, dataset, current_variables, method_type);

            // The method-specific statistic used to RANK candidates (f_to_enter is the
            // partial Wilks F that gates entry; min_d_squared holds the ranking stat):
            //   Mahalanobis → min D² with candidate (+ closest pair in between_groups)
            //   Rao's V     → ΔV (increase in Rao's V)
            //   Smallest F  → min pairwise F with candidate (+ pair in between_groups)
            //   Unexplained → Residual Variance with candidate
            let mut candidate_vars = current_variables.to_vec();
            candidate_vars.push(var_name.clone());
            let (min_d_squared, between_groups) = match method_type {
                MethodType::Mahalanobis => {
                    let r = calculate_min_mahalanobis_distance_with_groups(dataset, &candidate_vars);
                    (r.min_d2, format!("{} and {}", r.group_i, r.group_j))
                }
                MethodType::Raos => {
                    let current_v = if current_variables.is_empty() {
                        0.0
                    } else {
                        calculate_raos_v(dataset, current_variables)
                    };
                    let new_v = calculate_raos_v(dataset, &candidate_vars);
                    (new_v - current_v, String::new())
                }
                MethodType::FRatio => {
                    let r = calculate_min_f_ratio_with_groups(dataset, &candidate_vars);
                    let pair = if r.group_i.is_empty() {
                        String::new()
                    } else {
                        format!("{} and {}", r.group_i, r.group_j)
                    };
                    (r.min_f, pair)
                }
                MethodType::Unexplained => (
                    calculate_total_unexplained_variation(dataset, &candidate_vars),
                    String::new(),
                ),
                _ => (0.0, String::new()),
            };

            Some(VariableNotInAnalysis {
                variable: var_name.clone(),
                tolerance,
                min_tolerance,
                f_to_enter,
                wilks_lambda,
                min_d_squared,
                between_groups,
            })
        })
        .collect();

    // Filter out None values and collect results
    let mut variables_not_in_analysis: Vec<VariableNotInAnalysis> =
        results.into_iter().filter_map(|x| x).collect();

    // Sort variables — method-dependent ranking (best candidate first):
    // Mahalanobis: wilks_lambda is -min_D², lowest = highest min D² = best
    // Rao's V / Smallest F: highest method stat (ΔV / min F) in min_d_squared = best
    // Unexplained: lowest method stat (Residual Variance) in min_d_squared = best
    // All others (Wilks): highest F-to-enter = best
    match method_type {
        MethodType::Mahalanobis => {
            variables_not_in_analysis.sort_unstable_by(|a, b| {
                a.wilks_lambda
                    .partial_cmp(&b.wilks_lambda)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        MethodType::Raos | MethodType::FRatio => {
            // Highest method statistic first (max ΔV / max of the smallest F ratio)
            variables_not_in_analysis.sort_unstable_by(|a, b| {
                b.min_d_squared
                    .partial_cmp(&a.min_d_squared)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        MethodType::Unexplained => {
            // Lowest residual variance first (minimize unexplained variation)
            variables_not_in_analysis.sort_unstable_by(|a, b| {
                a.min_d_squared
                    .partial_cmp(&b.min_d_squared)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        _ => {
            variables_not_in_analysis.sort_unstable_by(|a, b| {
                b.f_to_enter
                    .partial_cmp(&a.f_to_enter)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
    }

    // SPSS only displays the top 4 ranked candidates in the "Variables not in
    // the Analysis" table, but selects from the full ranked list. We keep
    // the full ranked list and let display callers (create_step_data) slice
    // the top 4 — the selection routines (find_best_variable_to_enter) need
    // the full list.
    variables_not_in_analysis
}

/// Analyze variables in the model
///
/// This function calculates statistics for variables already included
/// in the discriminant model, to determine which should be removed.
///
/// # Parameters
/// * `variables` - Variables in the model
/// * `dataset` - The analyzed dataset
/// * `method_type` - The method to use for variable selection
/// * `config` - The discriminant analysis configuration
///
/// # Returns
/// A vector of VariableInAnalysis with statistics for each variable
pub fn analyze_variables_in_model(
    variables: &[String],
    dataset: &AnalyzedDataset,
    method_type: MethodType,
    _config: &DiscriminantConfig,
) -> Vec<VariableInAnalysis> {
    // Parallel analysis of variables
    let results: Vec<VariableInAnalysis> = variables
        .par_iter()
        .map(|var_name| {
            // Create a set of variables excluding the current one
            let other_variables: Vec<String> = variables
                .iter()
                .filter(|&v| v != var_name)
                .cloned()
                .collect();

            // Calculate tolerance
            let (tolerance, min_tolerance) = calculate_tolerance(var_name, dataset, &other_variables);

            // Calculate F-to-remove
            let (f_to_remove, wilks_lambda) =
                calculate_variable_f_to_remove(var_name, dataset, variables, method_type);

            // Method-specific statistic for the model with this variable EXCLUDED
            // (the reduced model) — what SPSS shows in the "Min. D Squared" /
            // "Min. F" / "Residual Variance" column for variables in the analysis.
            let (min_d_squared, between_groups) = match method_type {
                MethodType::Mahalanobis => {
                    let r = calculate_min_mahalanobis_distance_with_groups(dataset, &other_variables);
                    (r.min_d2, format!("{} and {}", r.group_i, r.group_j))
                }
                MethodType::FRatio => {
                    let r = calculate_min_f_ratio_with_groups(dataset, &other_variables);
                    let pair = if r.group_i.is_empty() {
                        String::new()
                    } else {
                        format!("{} and {}", r.group_i, r.group_j)
                    };
                    (r.min_f, pair)
                }
                MethodType::Unexplained => (
                    calculate_total_unexplained_variation(dataset, &other_variables),
                    String::new(),
                ),
                _ => (0.0, String::new()),
            };

            VariableInAnalysis {
                variable: var_name.clone(),
                tolerance,
                min_tolerance,
                f_to_remove,
                f_to_enter: 0.0,
                wilks_lambda,
                min_d_squared,
                between_groups,
            }
        })
        .collect();

    let mut variables_in_analysis = results;

    // Sort order is method-dependent:
    // Rao's V: sort by wilks_lambda proxy DESCENDING = ascending Rao's V of reduced model
    //          (lower reduced V = more indispensable, shown first — matches SPSS ordering)
    // Others: sort by F-to-remove ascending (least stable variable first)
    match method_type {
        MethodType::Raos => {
            variables_in_analysis.sort_unstable_by(|a, b| {
                b.wilks_lambda
                    .partial_cmp(&a.wilks_lambda)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        _ => {
            variables_in_analysis.sort_unstable_by(|a, b| {
                a.f_to_remove
                    .partial_cmp(&b.f_to_remove)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
    }

    variables_in_analysis
}

/// Find the best variable to enter the model
///
/// This function identifies the variable that should be entered into
/// the model next, based on the selected method.
///
/// # Parameters
/// * `variables` - Variables not in the model
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
/// * `method_type` - The method to use for variable selection
/// * `config` - The discriminant analysis configuration
///
/// # Returns
/// A tuple of (optional variable name, statistics)
pub fn find_best_variable_to_enter(
    variables: &[String],
    dataset: &AnalyzedDataset,
    current_variables: &[String],
    method_type: MethodType,
    config: &DiscriminantConfig,
) -> (Option<String>, VariableNotInAnalysis) {
    // Default empty result
    let default_result = VariableNotInAnalysis {
        variable: String::new(),
        tolerance: 0.0,
        min_tolerance: 0.0,
        f_to_enter: 0.0,
        wilks_lambda: 1.0,
        min_d_squared: 0.0,
        between_groups: String::new(),
    };

    if variables.is_empty() {
        return (None, default_result);
    }

    // Analyze all candidate variables
    let candidates = analyze_variables_not_in_model(variables, dataset, current_variables, config);

    if candidates.is_empty() {
        return (None, default_result);
    }

    // For Mahalanobis method: rank by new_min_d2 directly (stored as -new_min_d2 in wilks_lambda).
    // The candidate with LOWEST wilks_lambda (most negative = highest min D²) is best.
    // For other methods (Wilks, Unexplained, FRatio, Raos): rank by F-to-enter (descending).
    let best_candidate = match method_type {
        MethodType::Mahalanobis => {
            // wilks_lambda proxy is -new_min_d2, so lowest wilks_lambda = highest new_min_d2
            candidates
                .iter()
                .min_by(|a, b| {
                    a.wilks_lambda
                        .partial_cmp(&b.wilks_lambda)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .cloned()
        }
        MethodType::Raos => {
            // Candidates are already sorted descending by ΔV (min_d_squared).
            // Return the first one — should_enter_variable applies both VIN and FIN gates.
            candidates.first().cloned()
        }
        _ => {
            // For Wilks, Unexplained, F-ratio — use highest F-to-enter.
            // candidates is already sorted descending by f_to_enter from
            // analyze_variables_not_in_model, so first element is best.
            candidates.first().cloned()
        }
    };

    best_candidate
        .map(|best| (Some(best.variable.clone()), best))
        .unwrap_or((None, default_result))
}

/// Find the worst variable to remove from the model
///
/// This function identifies the variable that should be removed from
/// the model, based on the selected method.
///
/// # Parameters
/// * `variables` - Variables in the model
/// * `dataset` - The analyzed dataset
/// * `method_type` - The method to use for variable selection
/// * `config` - The discriminant analysis configuration
///
/// # Returns
/// A tuple of (optional variable name, statistics)
pub fn find_worst_variable_to_remove(
    variables: &[String],
    dataset: &AnalyzedDataset,
    method_type: MethodType,
    config: &DiscriminantConfig,
) -> (Option<String>, VariableInAnalysis) {
    // Default empty result
    let default_result = VariableInAnalysis {
        variable: String::new(),
        tolerance: 0.0,
        min_tolerance: 0.0,
        f_to_remove: f64::MAX,
        f_to_enter: 0.0,
        wilks_lambda: 0.0,
        min_d_squared: 0.0,
        between_groups: String::new(),
    };

    if variables.is_empty() {
        return (None, default_result);
    }

    // Analyze all variables in the model
    let candidates = analyze_variables_in_model(variables, dataset, method_type, config);

    if candidates.is_empty() {
        return (None, default_result);
    }

    // [PERBAIKAN 2]: Hapus logika eksekusi (should_remove).
    // Fungsi ini murni hanya untuk mencari variabel dengan F-to-remove terendah.
    // Keputusan untuk menghapus atau tidak diserahkan kembali ke process_variable_removal
    // di stepwise_statistics.rs.
    let worst_candidate = candidates.first().cloned();

    if let Some(worst) = worst_candidate {
        (Some(worst.variable.clone()), worst)
    } else {
        (None, default_result)
    }
}
