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
