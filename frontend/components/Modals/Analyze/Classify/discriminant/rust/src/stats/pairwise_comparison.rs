//! Pairwise comparisons between groups for discriminant analysis.
//!
//! This module implements SPSS's "Pairwise Group Comparisons" table
//! (Method → Display → F for pairwise distances): for every pair of groups, an
//! F statistic testing the squared Mahalanobis distance between their centroids.

use std::collections::HashMap;
use rayon::prelude::*;

use crate::{
    models::result::PairwiseComparison,
    stats::core::{calculate_p_value_from_f, AnalyzedDataset},
    stats::matrix_calculation::{group_mahalanobis_with_inv, pooled_within_inverse},
};

/// Generate pairwise comparisons between groups
///
/// For groups i and j, using the variables currently in the model:
///
///   D²_ij = (x̄_i − x̄_j)' S_pooled⁻¹ (x̄_i − x̄_j)
///   F_ij  = (n − g − p + 1) · n_i · n_j · D²_ij / (p · (n − g) · (n_i + n_j)),
///           with df = (p, n − g − p + 1)
///
/// S_pooled is the within-groups covariance pooled over ALL g groups (df = n − g),
/// which is what the (n − g) term in F assumes. This is the same D² and F that the
/// Smallest F Ratio method uses (calculate_min_f_ratio_with_groups).
///
/// # Parameters
/// * `dataset` - The analyzed dataset
/// * `variables` - Variables to use in the comparisons
/// * `step` - Current step in the stepwise procedure
///
/// # Returns
/// A HashMap mapping each group to its comparisons with every other group
pub fn generate_pairwise_comparisons(
    dataset: &AnalyzedDataset,
    variables: &[String],
    step: i32
) -> HashMap<String, Vec<PairwiseComparison>> {
    if variables.is_empty() || dataset.group_labels.len() < 2 {
        return HashMap::new();
    }

    let p = variables.len() as f64;
    let n = dataset.total_cases as f64;
    let g = dataset.num_groups as f64;
    let df2 = n - g - p + 1.0;

    if (n - g) <= 0.0 || df2 <= 0.0 {
        return HashMap::new();
    }

    // The pooled inverse depends only on the variable set, so it is computed once.
    let inv = pooled_within_inverse(dataset, variables);

    let group_size = |group: &str| -> f64 {
        dataset.group_data
            .get(&variables[0])
            .and_then(|gd| gd.get(group))
            .map_or(0.0, |v| v.len() as f64)
    };

    dataset.group_labels
        .par_iter()
        .map(|group_i| {
            let n_i = group_size(group_i);
            let comparisons = dataset.group_labels
                .iter()
                .filter(|&group_j| group_j != group_i)
                .filter_map(|group_j| {
                    let n_j = group_size(group_j);
                    if n_i <= 0.0 || n_j <= 0.0 {
                        return None;
                    }

                    let d2 = group_mahalanobis_with_inv(
                        dataset,
                        group_i,
                        group_j,
                        variables,
                        inv.as_ref()
                    );
                    let f_value = (d2 * df2 * n_i * n_j) / (p * (n - g) * (n_i + n_j));

                    Some(PairwiseComparison {
                        step,
                        group_name: group_j.clone(),
                        f_value,
                        significance: calculate_p_value_from_f(f_value, p, df2),
                        df1: variables.len() as i32,
                        df2: df2 as i32,
                    })
                })
                .collect::<Vec<_>>();

            (group_i.clone(), comparisons)
        })
        .filter(|(_, comparisons)| !comparisons.is_empty())
        .collect()
}
