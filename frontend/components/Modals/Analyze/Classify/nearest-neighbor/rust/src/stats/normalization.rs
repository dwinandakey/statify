use nalgebra::DMatrix;

/// Normalizes features using adjusted normalization to range [-1, 1]
/// Uses nalgebra for more efficient matrix operations
pub fn normalize_features(data_matrix: &mut [Vec<f64>]) {
    if data_matrix.is_empty() {
        return;
    }

    let n_rows = data_matrix.len();
    let n_features = data_matrix[0].len();

    let mut matrix = DMatrix::zeros(n_rows, n_features);
    for i in 0..n_rows {
        for j in 0..n_features {
            if j < data_matrix[i].len() {
                matrix[(i, j)] = data_matrix[i][j];
            }
        }
    }

    for j in 0..n_features {
        let col = matrix.column(j);
        let min_val = col.min();
        let max_val = col.max();

        if (max_val - min_val).abs() < f64::EPSILON {
            for row in data_matrix.iter_mut().take(n_rows) {
                if j < row.len() {
                    row[j] = 0.0;
                }
            }
            continue;
        }

        for row in data_matrix.iter_mut().take(n_rows) {
            if j < row.len() {
                row[j] = (2.0 * (row[j] - min_val)) / (max_val - min_val) - 1.0;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_features;

    #[test]
    fn normalization_returns_early_for_empty_matrix() {
        let mut matrix = Vec::new();

        normalize_features(&mut matrix);

        assert!(matrix.is_empty());
    }

    #[test]
    fn normalization_maps_range_to_minus_one_and_one_and_constant_column_to_zero() {
        let mut matrix = vec![vec![10.0, 5.0], vec![20.0, 5.0], vec![30.0, 5.0]];

        normalize_features(&mut matrix);

        assert_eq!(
            matrix,
            vec![vec![-1.0, 0.0], vec![0.0, 0.0], vec![1.0, 0.0]]
        );
    }
}
