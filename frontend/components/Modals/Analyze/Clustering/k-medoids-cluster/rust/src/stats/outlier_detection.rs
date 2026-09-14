// Outlier Detection for K-Medoids preprocessing

use crate::stats::normalization::FeatureStatistics;

/// Outlier detection methods
#[derive(Debug, Clone, Copy)]
pub enum OutlierDetectionMethod {
    /// IQR method: values outside [Q1 - k*IQR, Q3 + k*IQR]
    IQR { multiplier: f64 },
    /// Z-score method: |z| > threshold
    ZScore { threshold: f64 },
    /// Modified Z-score using MAD (Median Absolute Deviation)
    ModifiedZScore { threshold: f64 },
    /// No outlier detection
    None,
}

impl Default for OutlierDetectionMethod {
    fn default() -> Self {
        OutlierDetectionMethod::IQR { multiplier: 1.5 }
    }
}

/// Outlier information for a data point
#[derive(Debug, Clone)]
pub struct OutlierInfo {
    pub is_outlier: bool,
    pub outlier_features: Vec<usize>, // Which features are outliers
    pub outlier_score: f64,            // Overall outlier score
}

/// Detect outliers in the dataset
pub fn detect_outliers(
    data: &[Vec<f64>],
    stats: &[FeatureStatistics],
    method: OutlierDetectionMethod,
) -> Vec<OutlierInfo> {
    match method {
        OutlierDetectionMethod::None => {
            vec![
                OutlierInfo {
                    is_outlier: false,
                    outlier_features: vec![],
                    outlier_score: 0.0,
                };
                data.len()
            ]
        }
        OutlierDetectionMethod::IQR { multiplier } => {
            detect_outliers_iqr(data, stats, multiplier)
        }
        OutlierDetectionMethod::ZScore { threshold } => {
            detect_outliers_zscore(data, stats, threshold)
        }
        OutlierDetectionMethod::ModifiedZScore { threshold } => {
            detect_outliers_modified_zscore(data, threshold)
        }
    }
}

/// IQR-based outlier detection
fn detect_outliers_iqr(
    data: &[Vec<f64>],
    stats: &[FeatureStatistics],
    multiplier: f64,
) -> Vec<OutlierInfo> {
    data.iter()
        .map(|row| {
            let mut outlier_features = Vec::new();
            let mut outlier_count = 0;

            for (idx, &value) in row.iter().enumerate() {
                if !value.is_finite() {
                    continue;
                }

                let stat = &stats[idx];
                let lower_bound = stat.q1 - multiplier * stat.iqr;
                let upper_bound = stat.q3 + multiplier * stat.iqr;

                if value < lower_bound || value > upper_bound {
                    outlier_features.push(idx);
                    outlier_count += 1;
                }
            }

            let outlier_score = outlier_count as f64 / row.len() as f64;
            let is_outlier = !outlier_features.is_empty();

            OutlierInfo {
                is_outlier,
                outlier_features,
                outlier_score,
            }
        })
        .collect()
}

/// Z-score based outlier detection
fn detect_outliers_zscore(
    data: &[Vec<f64>],
    stats: &[FeatureStatistics],
    threshold: f64,
) -> Vec<OutlierInfo> {
    data.iter()
        .map(|row| {
            let mut outlier_features = Vec::new();
            let mut max_zscore: f64 = 0.0;

            for (idx, &value) in row.iter().enumerate() {
                if !value.is_finite() {
                    continue;
                }

                let stat = &stats[idx];
                let z_score = ((value - stat.mean) / stat.std_dev).abs();

                if z_score > threshold {
                    outlier_features.push(idx);
                }

                max_zscore = max_zscore.max(z_score);
            }

            OutlierInfo {
                is_outlier: !outlier_features.is_empty(),
                outlier_features,
                outlier_score: max_zscore / threshold,
            }
        })
        .collect()
}

/// Modified Z-score using MAD (more robust to outliers)
fn detect_outliers_modified_zscore(data: &[Vec<f64>], threshold: f64) -> Vec<OutlierInfo> {
    if data.is_empty() {
        return vec![];
    }

    let n_features = data[0].len();
    
    // Calculate MAD for each feature
    let mut feature_mads = Vec::with_capacity(n_features);
    let mut feature_medians = Vec::with_capacity(n_features);

    for feature_idx in 0..n_features {
        let mut values: Vec<f64> = data
            .iter()
            .map(|row| row[feature_idx])
            .filter(|v| v.is_finite())
            .collect();

        if values.is_empty() {
            feature_medians.push(0.0);
            feature_mads.push(1.0);
            continue;
        }

        values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let median = values[values.len() / 2];
        feature_medians.push(median);

        // Calculate MAD: median(|x_i - median|)
        let mut deviations: Vec<f64> = values.iter().map(|v| (v - median).abs()).collect();
        deviations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let mad = deviations[deviations.len() / 2];

        // Constant 1.4826 makes MAD consistent with std for normal distribution
        feature_mads.push(if mad > 1e-10 { mad * 1.4826 } else { 1.0 });
    }

    // Detect outliers
    data.iter()
        .map(|row| {
            let mut outlier_features = Vec::new();
            let mut max_modified_zscore: f64 = 0.0;

            for (idx, &value) in row.iter().enumerate() {
                if !value.is_finite() {
                    continue;
                }

                let modified_z = ((value - feature_medians[idx]) / feature_mads[idx]).abs();

                if modified_z > threshold {
                    outlier_features.push(idx);
                }

                max_modified_zscore = max_modified_zscore.max(modified_z);
            }

            OutlierInfo {
                is_outlier: !outlier_features.is_empty(),
                outlier_features,
                outlier_score: max_modified_zscore / threshold,
            }
        })
        .collect()
}

/// Remove outliers from dataset
pub fn remove_outliers(
    data: &[Vec<f64>],
    outlier_info: &[OutlierInfo],
) -> Vec<Vec<f64>> {
    data.iter()
        .zip(outlier_info.iter())
        .filter(|(_, info)| !info.is_outlier)
        .map(|(row, _)| row.clone())
        .collect()
}

/// Get indices of outliers
pub fn get_outlier_indices(outlier_info: &[OutlierInfo]) -> Vec<usize> {
    outlier_info
        .iter()
        .enumerate()
        .filter(|(_, info)| info.is_outlier)
        .map(|(idx, _)| idx)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::stats::normalization::calculate_feature_statistics;

    #[test]
    fn test_iqr_outlier_detection() {
        let data = vec![
            vec![1.0],
            vec![2.0],
            vec![3.0],
            vec![4.0],
            vec![5.0],
            vec![100.0], // Clear outlier
        ];

        let stats = calculate_feature_statistics(&data);
        let outliers = detect_outliers(
            &data,
            &stats,
            OutlierDetectionMethod::IQR { multiplier: 1.5 },
        );

        // Last point should be detected as outlier
        assert!(outliers[5].is_outlier);
        
        // First 5 points should not be outliers
        for i in 0..5 {
            assert!(!outliers[i].is_outlier);
        }
    }

    #[test]
    fn test_zscore_outlier_detection() {
        let data = vec![
            vec![10.0],
            vec![11.0],
            vec![12.0],
            vec![13.0],
            vec![14.0],
            vec![50.0], // Outlier
        ];

        let stats = calculate_feature_statistics(&data);
        let outliers = detect_outliers(
            &data,
            &stats,
            OutlierDetectionMethod::ZScore { threshold: 2.0 },
        );

        // Last point should be outlier
        assert!(outliers[5].is_outlier);
    }

    #[test]
    fn test_remove_outliers() {
        let data = vec![
            vec![1.0],
            vec![2.0],
            vec![100.0],
            vec![3.0],
        ];

        let stats = calculate_feature_statistics(&data);
        let outliers = detect_outliers(
            &data,
            &stats,
            OutlierDetectionMethod::IQR { multiplier: 1.5 },
        );

        let cleaned = remove_outliers(&data, &outliers);

        // Should have 3 points (removed the outlier at index 2)
        assert_eq!(cleaned.len(), 3);
    }
}
