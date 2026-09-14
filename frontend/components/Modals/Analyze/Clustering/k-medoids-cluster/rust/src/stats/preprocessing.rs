// Preprocessing pipeline for K-Medoids clustering

/// Preprocessing configuration
#[derive(Debug, Clone)]
pub struct PreprocessingConfig {
    /// Handle missing values (NaN, Inf)
    pub handle_missing: MissingValueStrategy,
}

impl Default for PreprocessingConfig {
    fn default() -> Self {
        Self {
            handle_missing: MissingValueStrategy::RemoveRow,
        }
    }
}

/// Strategy for handling missing values
#[derive(Debug, Clone, Copy)]
pub enum MissingValueStrategy {
    /// Remove rows with any missing values
    RemoveRow,
    /// Replace with feature mean
    ReplaceWithMean,
    /// Replace with feature median
    ReplaceWithMedian,
    /// Replace with constant value
    ReplaceWithConstant(f64),
    /// Keep as is (may cause errors in algorithms)
    KeepAsIs,
}

/// Result of preprocessing
#[derive(Debug, Clone)]
pub struct PreprocessedData {
    /// Processed data matrix
    pub data: Vec<Vec<f64>>,
    
    /// Original indices from the input matrix.
    pub original_indices: Vec<usize>,
    
    /// Number of rows removed due to missing values
    pub missing_rows_removed: usize,
}

/// Preprocess data for K-Medoids clustering
pub fn preprocess_data(
    data: &[Vec<f64>],
    config: &PreprocessingConfig,
) -> Result<PreprocessedData, String> {
    if data.is_empty() {
        return Err("Input data is empty".to_string());
    }

    // Step 1: Handle missing values
    let (cleaned_data, original_indices, missing_removed) = handle_missing_values(data, config.handle_missing)?;

    if cleaned_data.is_empty() {
        return Err("All data points were removed during missing value handling".to_string());
    }

    Ok(PreprocessedData {
        data: cleaned_data,
        original_indices,
        missing_rows_removed: missing_removed,
    })
}

/// Handle missing values in data
fn handle_missing_values(
    data: &[Vec<f64>],
    strategy: MissingValueStrategy,
) -> Result<(Vec<Vec<f64>>, Vec<usize>, usize), String> {
    match strategy {
        MissingValueStrategy::KeepAsIs => {
            let indices = (0..data.len()).collect();
            Ok((data.to_vec(), indices, 0))
        }
        MissingValueStrategy::RemoveRow => {
            let mut cleaned = Vec::new();
            let mut indices = Vec::new();

            for (idx, row) in data.iter().enumerate() {
                if row.iter().all(|v| v.is_finite()) {
                    cleaned.push(row.clone());
                    indices.push(idx);
                }
            }

            let removed = data.len() - cleaned.len();
            Ok((cleaned, indices, removed))
        }
        MissingValueStrategy::ReplaceWithMean => {
            replace_with_statistic(data, |values| {
                let valid: Vec<f64> = values.iter().copied().filter(|v| v.is_finite()).collect();
                if valid.is_empty() {
                    0.0
                } else {
                    valid.iter().sum::<f64>() / valid.len() as f64
                }
            })
        }
        MissingValueStrategy::ReplaceWithMedian => {
            replace_with_statistic(data, |values| {
                let mut valid: Vec<f64> = values.iter().copied().filter(|v| v.is_finite()).collect();
                if valid.is_empty() {
                    0.0
                } else {
                    valid.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                    valid[valid.len() / 2]
                }
            })
        }
        MissingValueStrategy::ReplaceWithConstant(value) => {
            let replaced = data
                .iter()
                .map(|row| {
                    row.iter()
                        .map(|&v| if v.is_finite() { v } else { value })
                        .collect()
                })
                .collect();
            let indices = (0..data.len()).collect();
            Ok((replaced, indices, 0))
        }
    }
}

/// Replace missing values with a calculated statistic
fn replace_with_statistic<F>(
    data: &[Vec<f64>],
    calc_fn: F,
) -> Result<(Vec<Vec<f64>>, Vec<usize>, usize), String>
where
    F: Fn(&[f64]) -> f64,
{
    if data.is_empty() {
        return Ok((vec![], vec![], 0));
    }

    let n_features = data[0].len();
    let mut feature_replacements = Vec::with_capacity(n_features);

    // Calculate replacement value for each feature
    for feature_idx in 0..n_features {
        let values: Vec<f64> = data.iter().map(|row| row[feature_idx]).collect();
        feature_replacements.push(calc_fn(&values));
    }

    // Replace missing values
    let replaced = data
        .iter()
        .map(|row| {
            row.iter()
                .enumerate()
                .map(|(idx, &v)| {
                    if v.is_finite() {
                        v
                    } else {
                        feature_replacements[idx]
                    }
                })
                .collect()
        })
        .collect();

    let indices = (0..data.len()).collect();
    Ok((replaced, indices, 0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preprocess_data_basic() {
        let data = vec![
            vec![1.0, 10.0],
            vec![2.0, 20.0],
            vec![3.0, 30.0],
            vec![4.0, 40.0],
            vec![5.0, 50.0],
        ];

        let config = PreprocessingConfig::default();
        let result = preprocess_data(&data, &config).unwrap();

        assert_eq!(result.data.len(), 5);
        assert_eq!(result.missing_rows_removed, 0);
    }

    #[test]
    fn test_handle_missing_values_remove() {
        let data = vec![
            vec![1.0, 2.0],
            vec![f64::NAN, 3.0],
            vec![4.0, 5.0],
        ];

        let (cleaned, indices, removed) =
            handle_missing_values(&data, MissingValueStrategy::RemoveRow).unwrap();

        assert_eq!(cleaned.len(), 2);
        assert_eq!(removed, 1);
        assert_eq!(indices, vec![0, 2]);
    }

    #[test]
    fn test_handle_missing_values_replace_mean() {
        let data = vec![
            vec![1.0, 2.0],
            vec![f64::NAN, 4.0],
            vec![3.0, 6.0],
        ];

        let (cleaned, _, _) =
            handle_missing_values(&data, MissingValueStrategy::ReplaceWithMean).unwrap();

        // Mean of first column (1.0, 3.0) = 2.0
        assert_eq!(cleaned[1][0], 2.0);
        assert_eq!(cleaned[1][1], 4.0);
    }

    #[test]
    fn test_preprocess_with_outlier_removal() {
        let data = vec![
            vec![1.0],
            vec![2.0],
            vec![3.0],
            vec![4.0],
            vec![100.0], // Outlier
        ];

        let config = PreprocessingConfig {
            handle_missing: MissingValueStrategy::RemoveRow,
        };

        let result = preprocess_data(&data, &config).unwrap();

        assert_eq!(result.data.len(), 5); // Outlier is kept (no outlier preprocessing)
    }

    #[test]
    fn test_preprocess_with_normalization() {
        let data = vec![
            vec![1.0, 10.0],
            vec![2.0, 20.0],
            vec![3.0, 30.0],
        ];

        let config = PreprocessingConfig {
            handle_missing: MissingValueStrategy::RemoveRow,
        };

        let result = preprocess_data(&data, &config).unwrap();

        // No normalization in k-means-aligned preprocessing
        assert_eq!(result.data[0][0], 1.0);
        assert_eq!(result.data[2][0], 3.0);
    }

    #[test]
    fn test_preprocess_keeps_duplicate_rows() {
        let data = vec![
            vec![1.0, 10.0],
            vec![2.0, 20.0],
            vec![1.0, 10.0], // Duplicate of first row
            vec![3.0, 30.0],
        ];

        let config = PreprocessingConfig {
            handle_missing: MissingValueStrategy::RemoveRow,
        };

        let result = preprocess_data(&data, &config).unwrap();

        assert_eq!(result.data.len(), 4);
        assert_eq!(result.original_indices, vec![0, 1, 2, 3]);
    }
}
