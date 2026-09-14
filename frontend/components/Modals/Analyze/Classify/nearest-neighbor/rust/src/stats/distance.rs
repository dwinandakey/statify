use std::cmp::Ordering;

const NEIGHBOR_TIE_EPSILON: f64 = 1e-12;

/// Calculates distance between two points using specified metric.
pub fn calculate_distance(point1: &[f64], point2: &[f64], use_euclidean: bool) -> f64 {
    calculate_distance_with_weights(point1, point2, use_euclidean, None)
}

/// Calculates distance between two points using optional per-feature weights.
pub fn calculate_distance_with_weights(
    point1: &[f64],
    point2: &[f64],
    use_euclidean: bool,
    feature_weights: Option<&[f64]>,
) -> f64 {
    let min_len = point1.len().min(point2.len());

    if use_euclidean {
        let sum_squared = (0..min_len)
            .filter_map(|i| {
                if !point1[i].is_finite() || !point2[i].is_finite() {
                    return None;
                }

                let diff = point1[i] - point2[i];
                let weight = feature_weights
                    .and_then(|weights| weights.get(i).copied())
                    .unwrap_or(1.0);
                Some(weight * diff * diff)
            })
            .sum::<f64>();

        sum_squared.sqrt()
    } else {
        (0..min_len)
            .filter_map(|i| {
                if !point1[i].is_finite() || !point2[i].is_finite() {
                    return None;
                }

                let weight = feature_weights
                    .and_then(|weights| weights.get(i).copied())
                    .unwrap_or(1.0);
                Some(weight * (point1[i] - point2[i]).abs())
            })
            .sum::<f64>()
    }
}

pub fn find_k_nearest_neighbors(
    query_point: &[f64],
    data_matrix: &[Vec<f64>],
    indices: &[usize],
    k: usize,
    use_euclidean: bool,
    original_case_indices: Option<&[usize]>,
) -> Vec<(usize, f64)> {
    find_k_nearest_neighbors_with_weights(
        query_point,
        data_matrix,
        indices,
        k,
        use_euclidean,
        original_case_indices,
        None,
    )
}

pub fn find_k_nearest_neighbors_with_weights(
    query_point: &[f64],
    data_matrix: &[Vec<f64>],
    indices: &[usize],
    k: usize,
    use_euclidean: bool,
    original_case_indices: Option<&[usize]>,
    feature_weights: Option<&[f64]>,
) -> Vec<(usize, f64)> {
    let mut distances: Vec<(usize, f64)> = indices
        .iter()
        .filter_map(|&idx| {
            if idx < data_matrix.len() {
                let distance = calculate_distance_with_weights(
                    query_point,
                    &data_matrix[idx],
                    use_euclidean,
                    feature_weights,
                );
                Some((idx, distance))
            } else {
                None
            }
        })
        .collect();

    distances.sort_by(|a, b| compare_neighbors(a, b, original_case_indices));
    distances.into_iter().take(k.max(1)).collect()
}

fn compare_neighbors(
    left: &(usize, f64),
    right: &(usize, f64),
    original_case_indices: Option<&[usize]>,
) -> Ordering {
    let distance_order = if !left.1.is_finite() && !right.1.is_finite() {
        Ordering::Equal
    } else if !left.1.is_finite() {
        Ordering::Greater
    } else if !right.1.is_finite() {
        Ordering::Less
    } else if (left.1 - right.1).abs() <= NEIGHBOR_TIE_EPSILON {
        Ordering::Equal
    } else {
        left.1.partial_cmp(&right.1).unwrap_or(Ordering::Equal)
    };

    distance_order.then_with(|| {
        let left_case_idx = original_case_indices
            .and_then(|indices| indices.get(left.0).copied())
            .unwrap_or(left.0);
        let right_case_idx = original_case_indices
            .and_then(|indices| indices.get(right.0).copied())
            .unwrap_or(right.0);

        right_case_idx
            .cmp(&left_case_idx)
            .then_with(|| right.0.cmp(&left.0))
    })
}

pub fn calculate_euclidean_distance(point1: &[f64], point2: &[f64]) -> f64 {
    calculate_distance(point1, point2, true)
}

pub fn calculate_manhattan_distance(point1: &[f64], point2: &[f64]) -> f64 {
    calculate_distance(point1, point2, false)
}

#[cfg(test)]
mod tests {
    use super::{
        calculate_distance_with_weights, calculate_euclidean_distance,
        calculate_manhattan_distance, find_k_nearest_neighbors,
        find_k_nearest_neighbors_with_weights,
    };

    #[test]
    fn euclidean_and_manhattan_match_sklearn_metrics() {
        let a = [0.0, 0.0];
        let b = [3.0, 4.0];

        assert_eq!(calculate_euclidean_distance(&a, &b), 5.0);
        assert_eq!(calculate_manhattan_distance(&a, &b), 7.0);
    }

    #[test]
    fn full_one_hot_nominal_mismatch_contributes_per_dimension() {
        let android = [1.0, 0.0, 0.0];
        let desktop = [0.0, 0.0, 1.0];

        assert_eq!(
            calculate_euclidean_distance(&android, &desktop),
            2.0_f64.sqrt()
        );
        assert_eq!(calculate_manhattan_distance(&android, &desktop), 2.0);
    }

    #[test]
    fn weighted_euclidean_and_manhattan_apply_feature_weights() {
        let a = [0.0, 0.0];
        let b = [3.0, 4.0];
        let weights = [0.25, 0.75];

        assert_eq!(
            calculate_distance_with_weights(&a, &b, true, Some(&weights)),
            (0.25_f64 * 9.0 + 0.75_f64 * 16.0).sqrt()
        );
        assert_eq!(
            calculate_distance_with_weights(&a, &b, false, Some(&weights)),
            0.25 * 3.0 + 0.75 * 4.0
        );
    }

    #[test]
    fn nearest_neighbors_break_distance_ties_by_original_case_index_descending() {
        let data_matrix = vec![vec![0.0], vec![1.0], vec![1.0], vec![1.0]];
        let original_case_indices = vec![10, 20, 40, 30];
        let neighbors = find_k_nearest_neighbors(
            &data_matrix[0],
            &data_matrix,
            &[1, 2, 3],
            3,
            true,
            Some(&original_case_indices),
        );

        assert_eq!(
            neighbors.iter().map(|(idx, _)| *idx).collect::<Vec<_>>(),
            vec![2, 3, 1]
        );
    }

    #[test]
    fn nearest_neighbors_treat_almost_equal_distances_as_ties() {
        let data_matrix = vec![vec![0.0], vec![1.0], vec![1.0 + 5e-13]];
        let original_case_indices = vec![0, 1, 2];
        let neighbors = find_k_nearest_neighbors(
            &data_matrix[0],
            &data_matrix,
            &[1, 2],
            2,
            false,
            Some(&original_case_indices),
        );

        assert_eq!(
            neighbors.iter().map(|(idx, _)| *idx).collect::<Vec<_>>(),
            vec![2, 1]
        );
    }

    #[test]
    fn distance_skips_non_finite_dimensions_and_defaults_missing_weights_to_one() {
        let a = [0.0, f64::NAN, 2.0];
        let b = [3.0, 10.0, 6.0];
        let weights = [0.25];

        assert_eq!(
            calculate_distance_with_weights(&a, &b, true, Some(&weights)),
            (0.25_f64 * 9.0 + 16.0).sqrt()
        );
        assert_eq!(
            calculate_distance_with_weights(&a, &b, false, Some(&weights)),
            0.25 * 3.0 + 4.0
        );
    }

    #[test]
    fn nearest_neighbors_ignore_invalid_indices_and_keep_one_neighbor_when_k_is_zero() {
        let data_matrix = vec![vec![0.0], vec![3.0], vec![1.0]];
        let neighbors =
            find_k_nearest_neighbors(&data_matrix[0], &data_matrix, &[99, 1, 2], 0, true, None);

        assert_eq!(neighbors, vec![(2, 1.0)]);
    }

    #[test]
    fn nearest_neighbors_sort_non_finite_distances_last() {
        let data_matrix = vec![vec![0.0], vec![1.0], vec![2.0]];
        let weights = [-1.0];
        let neighbors = find_k_nearest_neighbors_with_weights(
            &data_matrix[0],
            &data_matrix,
            &[1, 2],
            2,
            true,
            None,
            Some(&weights),
        );

        assert!(neighbors[0].1.is_nan());
        assert!(neighbors[1].1.is_nan());
        assert_eq!(
            neighbors.iter().map(|(idx, _)| *idx).collect::<Vec<_>>(),
            vec![2, 1]
        );
    }
}
