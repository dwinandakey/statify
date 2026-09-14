// Cluster evaluation metrics for K-Medoids

use crate::utils::distance::calculate_distance_str;

/// Calculate silhouette coefficient for a single point
pub fn silhouette_coefficient(
    point_idx: usize,
    cluster_assignments: &[usize],
    data: &[Vec<f64>],
    metric: &str,
) -> f64 {
    let own_cluster = cluster_assignments[point_idx];
    let n_clusters = cluster_assignments.iter().max().unwrap_or(&0) + 1;

    // Calculate a(i): average distance to points in same cluster
    let same_cluster_points: Vec<usize> = cluster_assignments
        .iter()
        .enumerate()
        .filter(|(idx, &cluster)| cluster == own_cluster && *idx != point_idx)
        .map(|(idx, _)| idx)
        .collect();

    let a = if same_cluster_points.is_empty() {
        0.0
    } else {
        same_cluster_points
            .iter()
            .map(|&other_idx| calculate_distance_str(&data[point_idx], &data[other_idx], metric))
            .sum::<f64>()
            / same_cluster_points.len() as f64
    };

    // Calculate b(i): minimum average distance to points in other clusters
    let mut min_avg_distance = f64::INFINITY;
    
    for cluster_id in 0..n_clusters {
        if cluster_id == own_cluster {
            continue;
        }

        let other_cluster_points: Vec<usize> = cluster_assignments
            .iter()
            .enumerate()
            .filter(|(_, &cluster)| cluster == cluster_id)
            .map(|(idx, _)| idx)
            .collect();

        if !other_cluster_points.is_empty() {
            let avg_distance = other_cluster_points
                .iter()
                .map(|&other_idx| calculate_distance_str(&data[point_idx], &data[other_idx], metric))
                .sum::<f64>()
                / other_cluster_points.len() as f64;

            if avg_distance < min_avg_distance {
                min_avg_distance = avg_distance;
            }
        }
    }

    let b = min_avg_distance;

    // Calculate silhouette coefficient
    if a < b {
        (b - a) / b
    } else if a > b {
        (b - a) / a
    } else {
        0.0
    }
}

/// Calculate average silhouette score for all points
pub fn average_silhouette_score(
    cluster_assignments: &[usize],
    data: &[Vec<f64>],
    metric: &str,
) -> f64 {
    if data.len() <= 1 {
        return 0.0;
    }

    let scores: Vec<f64> = (0..data.len())
        .map(|idx| silhouette_coefficient(idx, cluster_assignments, data, metric))
        .collect();

    scores.iter().sum::<f64>() / scores.len() as f64
}
