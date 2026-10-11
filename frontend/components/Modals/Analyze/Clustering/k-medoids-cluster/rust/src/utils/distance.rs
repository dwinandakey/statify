// Distance metrics for K-Medoids

use serde::{Deserialize, Serialize};

/// Distance metric enum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DistanceMetric {
    Euclidean,
    Manhattan,
}

impl DistanceMetric {
    /// Convert string to DistanceMetric
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "euclidean" => Ok(DistanceMetric::Euclidean),
            "manhattan" => Ok(DistanceMetric::Manhattan),
            _ => Err(format!("Unknown distance metric: {}", s)),
        }
    }
    
    /// Convert to string representation
    pub fn to_str(&self) -> &str {
        match self {
            DistanceMetric::Euclidean => "euclidean",
            DistanceMetric::Manhattan => "manhattan",
        }
    }
}

/// Menghitung Euclidean distance antara dua titik
pub fn euclidean_distance(point1: &[f64], point2: &[f64]) -> f64 {
    let d = point1
        .iter()
        .zip(point2.iter())
        .map(|(a, b)| (a - b).powi(2))
        .sum::<f64>()
        .sqrt();
    
    if d.is_finite() { d } else { 1e10 } 
}

/// Menghitung Manhattan distance antara dua titik
pub fn manhattan_distance(point1: &[f64], point2: &[f64]) -> f64 {
    let d: f64 = point1
        .iter()
        .zip(point2.iter())
        .map(|(a, b)| (a - b).abs())
        .sum::<f64>();
    
    if d.is_finite() { d } else { 1e10 } // Safeguard against NaN/Inf
}

/// Calculate distance based on specified metric
pub fn calculate_distance(point1: &[f64], point2: &[f64], metric: &DistanceMetric) -> f64 {
    match metric {
        DistanceMetric::Euclidean => euclidean_distance(point1, point2),
        DistanceMetric::Manhattan => manhattan_distance(point1, point2),
    }
}

/// Calculate distance based on string metric (legacy)
pub fn calculate_distance_str(point1: &[f64], point2: &[f64], metric: &str) -> f64 {
    match metric {
        "manhattan" => manhattan_distance(point1, point2),
        _ => euclidean_distance(point1, point2), // default
    }
}

/// Build a distance matrix for all points
pub fn build_distance_matrix(data: &[Vec<f64>], metric: &DistanceMetric) -> Vec<Vec<f64>> {
    let n = data.len();
    let mut matrix = vec![vec![0.0; n]; n];
    
    for i in 0..n {
        for j in (i + 1)..n {
            let dist = calculate_distance(&data[i], &data[j], metric);
            matrix[i][j] = dist;
            matrix[j][i] = dist;
        }
    }
    
    matrix
}

/// Build a distance matrix for all points (string-based metric, legacy)
pub fn build_distance_matrix_str(data: &[Vec<f64>], metric: &str) -> Vec<Vec<f64>> {
    let n = data.len();
    let mut matrix = vec![vec![0.0; n]; n];

    for i in 0..n {
        for j in (i + 1)..n {
            let dist = calculate_distance_str(&data[i], &data[j], metric);
            matrix[i][j] = dist;
            matrix[j][i] = dist;
        }
    }

    matrix
}

/// Within-Cluster Sum of Squares (WCSS) for the Elbow method.
///
/// For Euclidean distance this sums squared distances (the classic WCSS
/// definition). For Manhattan distance it sums raw (unsquared) distances —
/// matching the TypeScript `calculateWCSS`/`computeWCSS` implementations this
/// replaces, since "sum of squared Manhattan distances" is not the standard
/// quantity reported alongside the Manhattan/L1 metric.
pub fn compute_wcss(
    data: &[Vec<f64>],
    labels: &[usize],
    medoid_indices: &[usize],
    metric: &DistanceMetric,
) -> f64 {
    data.iter()
        .enumerate()
        .map(|(i, point)| {
            let medoid_idx = medoid_indices[labels[i]];
            let dist = calculate_distance(point, &data[medoid_idx], metric);
            match metric {
                DistanceMetric::Manhattan => dist,
                DistanceMetric::Euclidean => dist * dist,
            }
        })
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// data=[(0,0),(2,0),(10,0),(12,0)], labels=[0,0,1,1], medoids=[0,2]
    /// Euclidean: d(0,0)=0, d(1,0)=2, d(2,2)=0, d(3,2)=2 -> squared sum = 0+4+0+4 = 8
    #[test]
    fn test_compute_wcss_euclidean_known_value() {
        let data = vec![
            vec![0.0, 0.0],
            vec![2.0, 0.0],
            vec![10.0, 0.0],
            vec![12.0, 0.0],
        ];
        let labels = vec![0, 0, 1, 1];
        let medoid_indices = vec![0, 2];

        let wcss = compute_wcss(&data, &labels, &medoid_indices, &DistanceMetric::Euclidean);
        assert!((wcss - 8.0).abs() < 1e-10, "expected WCSS=8.0, got {}", wcss);
    }

    /// Same layout, Manhattan: distances are 0,2,0,2 -> summed (not squared) = 4
    #[test]
    fn test_compute_wcss_manhattan_known_value() {
        let data = vec![
            vec![0.0, 0.0],
            vec![2.0, 0.0],
            vec![10.0, 0.0],
            vec![12.0, 0.0],
        ];
        let labels = vec![0, 0, 1, 1];
        let medoid_indices = vec![0, 2];

        let wcss = compute_wcss(&data, &labels, &medoid_indices, &DistanceMetric::Manhattan);
        assert!((wcss - 4.0).abs() < 1e-10, "expected WCSS=4.0, got {}", wcss);
    }

    /// A point exactly at its medoid contributes 0 to WCSS.
    #[test]
    fn test_compute_wcss_zero_when_all_points_are_medoids() {
        let data = vec![vec![1.0, 1.0], vec![5.0, 5.0]];
        let labels = vec![0, 1];
        let medoid_indices = vec![0, 1];

        let wcss = compute_wcss(&data, &labels, &medoid_indices, &DistanceMetric::Euclidean);
        assert_eq!(wcss, 0.0);
    }
}
