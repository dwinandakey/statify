//! Implementation of variable selection methods for discriminant analysis.
//!
//! This module provides implementations of different methods for
//! computing F-to-enter and F-to-remove statistics in stepwise discriminant analysis.

use super::core::{
    calculate_min_mahalanobis_distance, calculate_overall_wilks_lambda, calculate_raos_v,
    calculate_univariate_f, AnalyzedDataset, MethodType,
};

/// Calculate F-to-enter for a variable based on the selected method
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
/// * `method_type` - The method to use
///
/// # Returns
/// A tuple of (F-to-enter, Wilks' lambda)
pub fn calculate_variable_f_to_enter(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
    method_type: MethodType,
) -> (f64, f64) {
    match method_type {
        MethodType::Wilks => calculate_f_to_enter_wilks(variable, dataset, current_variables),
        MethodType::Unexplained => {
            calculate_f_to_enter_unexplained(variable, dataset, current_variables)
        }
        MethodType::Mahalanobis => {
            calculate_f_to_enter_mahalanobis(variable, dataset, current_variables)
        }
        MethodType::FRatio => calculate_f_to_enter_fratio(variable, dataset, current_variables),
        MethodType::Raos => calculate_f_to_enter_raos(variable, dataset, current_variables),
    }
}

/// Calculate F-to-remove for a variable based on the selected method
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
/// * `method_type` - The method to use
///
/// # Returns
/// A tuple of (F-to-remove, Wilks' lambda)
pub fn calculate_variable_f_to_remove(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
    method_type: MethodType,
) -> (f64, f64) {
    match method_type {
        MethodType::Wilks => calculate_f_to_remove_wilks(variable, dataset, current_variables),
        MethodType::Unexplained => {
            calculate_f_to_remove_unexplained(variable, dataset, current_variables)
        }
        MethodType::Mahalanobis => {
            calculate_f_to_remove_mahalanobis(variable, dataset, current_variables)
        }
        MethodType::FRatio => calculate_f_to_remove_fratio(variable, dataset, current_variables),
        MethodType::Raos => calculate_f_to_remove_raos(variable, dataset, current_variables),
    }
}

/// Calculate F-to-enter using Wilks' lambda method
///
/// This method minimizes Wilks' lambda by selecting the variable
/// that produces the greatest reduction in lambda.
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-enter, Wilks' lambda)
fn calculate_f_to_enter_wilks(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    if current_variables.is_empty() {
        return calculate_univariate_f(variable, dataset);
    }

    let current_wilks = calculate_overall_wilks_lambda(dataset, current_variables);

    let mut new_variables = current_variables.to_vec();
    new_variables.push(variable.to_string());
    let new_wilks = calculate_overall_wilks_lambda(dataset, &new_variables);

    let df1 = dataset.num_groups - 1;
    let df2 = dataset.total_cases - (current_variables.len() + 1) - dataset.num_groups;

    // [PERBAIKAN KRUSIAL]: Pembagi harus new_wilks!
    let f_value = if df2 > 0 && new_wilks < current_wilks && new_wilks > 0.0 {
        (((current_wilks - new_wilks) / new_wilks) * (df2 as f64)) / (df1 as f64)
    } else {
        0.0
    };

    (f_value, new_wilks)
}

/// Calculate F-to-remove using Wilks' lambda method
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-remove, Wilks' lambda)
fn calculate_f_to_remove_wilks(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // Calculate Wilks' lambda for current model
    let current_wilks = calculate_overall_wilks_lambda(dataset, current_variables);

    // Calculate Wilks' lambda with variable removed
    let reduced_variables: Vec<String> = current_variables
        .iter()
        .filter(|&v| v != variable)
        .cloned()
        .collect();

    let reduced_wilks = if reduced_variables.is_empty() {
        1.0
    } else {
        calculate_overall_wilks_lambda(dataset, &reduced_variables)
    };

    // F-to-remove formula: F = ((Λ_R - Λ_C) / Λ_C) × (df2 / df1)
    // where Λ_R = Wilks' lambda of reduced model (var removed)
    //       Λ_C = Wilks' lambda of current model (var included)
    // df1 = g - 1, df2 = n - p - g (same as F-to-enter for symmetry)
    let df1 = dataset.num_groups - 1;
    let df2 = dataset.total_cases - current_variables.len() - dataset.num_groups + 1;

    let f_value = if df2 > 0 && reduced_wilks > current_wilks && current_wilks > 0.0 {
        (((reduced_wilks - current_wilks) / current_wilks) * (df2 as f64)) / (df1 as f64)
    } else {
        0.0
    };

    (f_value, reduced_wilks)
}

/// Calculate F-to-enter using Unexplained Variance method
///
/// This method follows the SPSS univariate criterion (ibmc0.c:2551-2567):
/// for candidate variable x, do univariate regression of x on the current
/// in-model variables using the pooled within-groups covariance, then:
///
///     unexplained = (N - k) / N · (1 - R²)
///     F_to_enter = ((N - k - p - 1) / p) · unexplained / (1 - unexplained)
///
/// where N = total_cases, k = num_groups, p = |M ∪ {x}|, R² is the squared
/// multiple correlation of x with the in-model variables computed from
/// the within-groups correlation matrix.
///
/// # Parameters
/// * `variable` - The candidate variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-enter, Wilks' lambda proxy)
fn calculate_f_to_enter_unexplained(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // SPSS shows the standard partial Wilks F in the "F to Enter" column for the
    // Unexplained Variance method, and gates entry on it (FIN = 3.84). The method
    // statistic ("Residual Variance") only ranks candidates and is computed in
    // analyze_variables_not_in_model (stored in min_d_squared).
    calculate_f_to_enter_wilks(variable, dataset, current_variables)
}

/// Calculate F-to-remove using Unexplained Variance method
///
/// For variable v in model M, compute the criterion on the reduced
/// model M \ {v} using the same SPSS univariate formula. p is the
/// number of variables in M \ {v} (i.e. |M| - 1).
///
/// # Parameters
/// * `variable` - The variable in the model to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-remove, Wilks' lambda proxy)
fn calculate_f_to_remove_unexplained(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // Standard partial Wilks F-to-remove (FOUT = 2.71 gate). The "Residual
    // Variance" column for variables in the model is computed separately.
    calculate_f_to_remove_wilks(variable, dataset, current_variables)
}

/// Calculate F-to-enter using Mahalanobis Distance method
///
/// This method maximizes the minimum Mahalanobis distance
/// between any two groups.
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-enter, Wilks' lambda)
fn calculate_f_to_enter_mahalanobis(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // 1. Gatekeeper: Dapatkan F-to-enter murni dengan mendelegasikan tugas ke Wilks
    // (Ini otomatis menangani df1, df2, dan pengecekan saat array kosong)
    let (f_value, _) = calculate_f_to_enter_wilks(variable, dataset, current_variables);

    // 2. Ranking: Hitung Mahalanobis D² dengan simulasi penambahan variabel ini
    let mut new_variables = current_variables.to_vec();
    new_variables.push(variable.to_string());

    let new_min_d2 = calculate_min_mahalanobis_distance(dataset, &new_variables);

    // 3. Kembalikan F-to-enter standar, dan proxy -min_d2 agar sorting Mahalanobis bekerja benar
    let wilks_lambda = -new_min_d2;

    (f_value, wilks_lambda)
}

/// Calculate F-to-remove using Mahalanobis Distance method
///
/// This method measures the decrease in minimum Mahalanobis distance
/// when a variable is removed from the model.
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-remove, Wilks' lambda proxy)
fn calculate_f_to_remove_mahalanobis(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // 1. Dapatkan nilai Standard Partial F (sebagai Gatekeeper)
    let (f_value, _) = calculate_f_to_remove_wilks(variable, dataset, current_variables);

    // 2. Dapatkan nilai Mahalanobis D² (sebagai Ranking)
    let reduced_variables: Vec<String> = current_variables
        .iter()
        .filter(|&v| v != variable)
        .cloned()
        .collect();

    let reduced_min_d2 = if reduced_variables.is_empty() {
        0.0
    } else {
        calculate_min_mahalanobis_distance(dataset, &reduced_variables)
    };

    let wilks_lambda = if reduced_variables.is_empty() {
        1.0
    } else {
        -reduced_min_d2
    };

    (f_value, wilks_lambda)
}

/// Calculate F-to-enter using Smallest F Ratio method
///
/// This method maximizes the minimum F ratio between any two groups.
///
/// # Parameters
/// * `variable` - The variable to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-enter, Wilks' lambda)
fn calculate_f_to_enter_fratio(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // SPSS shows the standard partial Wilks F in the "F to Enter" column for the
    // Smallest F Ratio method, and gates entry on it (FIN = 3.84). The method
    // statistic ("Min. F" + Between Groups) only ranks candidates and is computed
    // in analyze_variables_not_in_model (stored in min_d_squared / between_groups).
    calculate_f_to_enter_wilks(variable, dataset, current_variables)
}

/// Calculate F-to-remove using Smallest F Ratio method
///
/// For variable v in model M, F-to-remove is the minimum F_ij across all
/// group pairs evaluated on the reduced model M \ {v} — same shape as
/// F-to-enter but on the smaller set (SPSS does not report a difference).
///
/// # Parameters
/// * `variable` - The variable in the model to test
/// * `dataset` - The analyzed dataset
/// * `current_variables` - Variables currently in the model
///
/// # Returns
/// A tuple of (F-to-remove, Wilks' lambda proxy)
fn calculate_f_to_remove_fratio(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // Standard partial Wilks F-to-remove (FOUT = 2.71 gate). The "Min. F" column
    // for variables in the model is computed separately.
    calculate_f_to_remove_wilks(variable, dataset, current_variables)
}

/// Calculate F-to-enter using Rao's V method
///
/// Returns (partial_wilks_f, proxy_for_V_with) where:
/// - partial_wilks_f: the standard partial F-to-enter (what SPSS shows in the "F to Enter"
///   column for Rao's V; same partial-Wilks formula used by every method).
/// - proxy_for_V_with: 1/(1 + V_with/n), so that raosVFromProxy() in the formatter can
///   recover the cumulative Rao's V after entry (V_with = V(M ∪ {x})).
///
/// Selection of which variable to enter is done on ΔV stored separately in
/// VariableNotInAnalysis.min_d_squared by analyze_variables_not_in_model.
fn calculate_f_to_enter_raos(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // V_with for the proxy (displayed as "Rao's V" column via raosVFromProxy in formatter)
    let mut new_variables = current_variables.to_vec();
    new_variables.push(variable.to_string());
    let new_v = calculate_raos_v(dataset, &new_variables);

    // "F to Enter" column: partial Wilks F — same as every other stepwise method
    let (partial_f, _) = calculate_f_to_enter_wilks(variable, dataset, current_variables);

    let wilks_lambda = if new_v > 0.0 {
        1.0 / (1.0 + new_v / (dataset.total_cases as f64))
    } else {
        1.0
    };

    (partial_f, wilks_lambda)
}

/// Calculate F-to-remove using Rao's V method
///
/// Returns (partial_wilks_f, proxy_for_V_reduced) where:
/// - partial_wilks_f: the standard partial F-to-remove (what SPSS shows in the "F to Remove"
///   column; same partial-Wilks formula used by every method).
/// - proxy_for_V_reduced: 1/(1 + V_reduced/n), so raosVFromProxy() in the formatter recovers
///   V(M \ {v}) — the "Rao's V" column in Variables in the Analysis table.
///
/// calculate_f_to_remove_wilks handles the single-variable case (reduced = empty → lambda = 1.0).
fn calculate_f_to_remove_raos(
    variable: &str,
    dataset: &AnalyzedDataset,
    current_variables: &[String],
) -> (f64, f64) {
    // "F to Remove" column: partial Wilks F
    let (partial_f, _) = calculate_f_to_remove_wilks(variable, dataset, current_variables);

    // V of reduced model: for the "Rao's V" column via raosVFromProxy
    let reduced_variables: Vec<String> = current_variables
        .iter()
        .filter(|&v| v != variable)
        .cloned()
        .collect();

    let reduced_v = if reduced_variables.is_empty() {
        0.0
    } else {
        calculate_raos_v(dataset, &reduced_variables)
    };

    let wilks_lambda = if reduced_v > 0.0 {
        1.0 / (1.0 + reduced_v / (dataset.total_cases as f64))
    } else {
        1.0
    };

    (partial_f, wilks_lambda)
}
