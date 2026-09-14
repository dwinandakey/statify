// Silhouette Score Calculation for K-Medoids

use crate::utils::distance::{calculate_distance, DistanceMetric};

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/// Build an inverted index: cluster_indices[c] = sorted indices of points in cluster c.
/// Built once and reused for all per-point calculations.
fn build_cluster_indices(labels: &[usize], n_clusters: usize) -> Vec<Vec<usize>> {
    let mut cluster_indices: Vec<Vec<usize>> = vec![Vec::new(); n_clusters];
    for (i, &label) in labels.iter().enumerate() {
        if label < n_clusters {
            cluster_indices[label].push(i);
        }
    }
    cluster_indices
}

/// Compute the silhouette coefficient for a single point given the precomputed
/// cluster index map.  Sums are accumulated in-place — no temporary Vec is allocated.
fn point_silhouette_inner(
    point_idx: usize,
    cluster_label: usize,
    data: &[Vec<f64>],
    cluster_indices: &[Vec<usize>],
    metric: &DistanceMetric,
) -> f64 {
    let same_cluster = &cluster_indices[cluster_label];

    // Single-element cluster → silhouette is undefined, returned as 0.
    if same_cluster.len() <= 1 {
        return 0.0;
    }

    // a(i): average distance to other points in the same cluster.
    let mut a_sum = 0.0_f64;
    for &j in same_cluster {
        if j != point_idx {
            a_sum += calculate_distance(&data[point_idx], &data[j], metric);
        }
    }
    let a_i = a_sum / (same_cluster.len() - 1) as f64;

    // b(i): minimum average distance to points in any other cluster.
    // Iterate over all clusters once; no HashSet construction needed.
    let mut b_i = f64::MAX;
    for (c, indices) in cluster_indices.iter().enumerate() {
        if c == cluster_label || indices.is_empty() {
            continue;
        }
        let mut sum = 0.0_f64;
        for &j in indices {
            sum += calculate_distance(&data[point_idx], &data[j], metric);
        }
        let avg = sum / indices.len() as f64;
        if avg < b_i {
            b_i = avg;
        }
    }

    if b_i == f64::MAX {
        // No other cluster exists.
        return 0.0;
    }

    // s(i) = (b - a) / max(a, b).  Numerically stable: when a == b, returns 0.
    let denom = a_i.max(b_i);
    if denom == 0.0 {
        0.0
    } else {
        (b_i - a_i) / denom
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API — signatures unchanged
// ──────────────────────────────────────────────────────────────────────────────

/// Calculate silhouette score for a single point.
///
/// When called individually this function builds the cluster index map from
/// `labels`.  For bulk calculations prefer `calculate_all_silhouettes` which
/// builds the map only once.
pub fn calculate_point_silhouette(
    point_idx: usize,
    cluster_label: usize,
    data: &[Vec<f64>],
    labels: &[usize],
    metric: &DistanceMetric,
) -> f64 {
    let n_clusters = labels.iter().copied().max().map(|m| m + 1).unwrap_or(0);
    let cluster_indices = build_cluster_indices(labels, n_clusters);
    point_silhouette_inner(point_idx, cluster_label, data, &cluster_indices, metric)
}

/// Calculate silhouette scores for all points.
///
/// Cluster indices are built once and reused for all per-point calculations.
/// NOTE: rayon parallel iteration is intentionally omitted — `rayon` uses OS
/// thread pools which do not exist in `wasm32-unknown-unknown` and would
/// cause a runtime panic when called in WASM.
pub fn calculate_all_silhouettes(
    data: &[Vec<f64>],
    labels: &[usize],
    metric: &DistanceMetric,
) -> Vec<f64> {
    if data.is_empty() {
        return Vec::new();
    }

    let n_clusters = labels.iter().copied().max().map(|m| m + 1).unwrap_or(0);
    let cluster_indices = build_cluster_indices(labels, n_clusters);

    (0..data.len())
        .map(|i| point_silhouette_inner(i, labels[i], data, &cluster_indices, metric))
        .collect()
}

/// Calculate average silhouette score for the entire clustering.
pub fn calculate_average_silhouette(
    data: &[Vec<f64>],
    labels: &[usize],
    metric: &DistanceMetric,
) -> f64 {
    let silhouettes = calculate_all_silhouettes(data, labels, metric);
    if silhouettes.is_empty() {
        return 0.0;
    }
    silhouettes.iter().sum::<f64>() / silhouettes.len() as f64
}

/// Calculate average silhouette score per cluster.
pub fn calculate_silhouette_per_cluster(
    data: &[Vec<f64>],
    labels: &[usize],
    n_clusters: usize,
    metric: &DistanceMetric,
) -> Vec<f64> {
    let all_silhouettes = calculate_all_silhouettes(data, labels, metric);

    // Build per-cluster sums and counts in one pass.
    let mut sums = vec![0.0_f64; n_clusters];
    let mut counts = vec![0usize; n_clusters];
    for (i, &label) in labels.iter().enumerate() {
        if label < n_clusters {
            sums[label] += all_silhouettes[i];
            counts[label] += 1;
        }
    }

    sums.iter()
        .zip(counts.iter())
        .map(|(&s, &c)| if c == 0 { 0.0 } else { s / c as f64 })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_silhouette_calculation() {
        let data = vec![
            vec![1.0, 2.0],
            vec![1.5, 2.5],
            vec![8.0, 9.0],
            vec![8.5, 9.5],
        ];
        let labels = vec![0, 0, 1, 1];
        let metric = DistanceMetric::Euclidean;

        let avg_score = calculate_average_silhouette(&data, &labels, &metric);
        assert!(avg_score > 0.5); // Well-separated clusters should have high score
    }

    #[test]
    fn test_single_element_cluster() {
        let data = vec![vec![0.0], vec![10.0], vec![20.0]];
        // Each point in its own cluster
        let labels = vec![0, 1, 2];
        let metric = DistanceMetric::Euclidean;

        let scores = calculate_all_silhouettes(&data, &labels, &metric);
        // Single-element clusters → all silhouettes should be 0
        for s in &scores {
            assert_eq!(*s, 0.0);
        }
    }

    #[test]
    fn test_per_cluster_scores() {
        let data = vec![
            vec![0.0, 0.0],
            vec![0.5, 0.5],
            vec![10.0, 10.0],
            vec![10.5, 10.5],
        ];
        let labels = vec![0, 0, 1, 1];
        let metric = DistanceMetric::Euclidean;

        let per_cluster = calculate_silhouette_per_cluster(&data, &labels, 2, &metric);
        assert_eq!(per_cluster.len(), 2);
        assert!(per_cluster[0] > 0.5);
        assert!(per_cluster[1] > 0.5);
    }

    /// Semua nilai silhouette harus berada dalam rentang [-1, 1].
    #[test]
    fn test_silhouette_values_in_range() {
        // Penugasan berselang-seling (buruk) — pastikan nilai tetap dalam [-1, 1]
        let data = vec![
            vec![0.0, 0.0], vec![2.0, 0.0], vec![4.0, 0.0], vec![6.0, 0.0],
        ];
        let labels = vec![0, 1, 0, 1];
        let metric = DistanceMetric::Euclidean;

        let scores = calculate_all_silhouettes(&data, &labels, &metric);
        for s in &scores {
            assert!(*s >= -1.0 && *s <= 1.0, "silhouette {} berada di luar [-1, 1]", s);
        }
    }

    /// Data kosong harus mengembalikan vektor kosong tanpa panic.
    #[test]
    fn test_silhouette_empty_data_returns_empty_vec() {
        let data: Vec<Vec<f64>> = vec![];
        let labels: Vec<usize> = vec![];
        let metric = DistanceMetric::Euclidean;

        let scores = calculate_all_silhouettes(&data, &labels, &metric);
        assert!(scores.is_empty(), "data kosong harus mengembalikan vektor silhouette kosong");
    }

    /// Penugasan cluster yang buruk (berselang-seling) harus menghasilkan silhouette rata-rata negatif.
    ///
    /// Kalkulasi manual (1D Euclidean):
    ///   data=[0,2,4,6], labels=[0,1,0,1]
    ///   cluster0={0,4}, cluster1={2,6}
    ///   s(0)=0.0, s(1)=-0.5, s(2)=-0.5, s(3)=0.0  →  avg = -0.25
    #[test]
    fn test_silhouette_poor_separation_negative_score() {
        let data = vec![vec![0.0], vec![2.0], vec![4.0], vec![6.0]];
        let labels = vec![0, 1, 0, 1];
        let metric = DistanceMetric::Euclidean;

        let avg = calculate_average_silhouette(&data, &labels, &metric);
        assert!(
            avg < 0.0,
            "penugasan berselang-seling harus menghasilkan silhouette negatif, dapat {}",
            avg
        );
    }

    /// Verifikasi nilai silhouette dengan kalkulasi manual.
    ///
    /// data=[(0,0),(1,0),(10,0),(11,0)], labels=[0,0,1,1]
    ///   s(0)=9.5/10.5, s(1)=8.5/9.5, s(2)=8.5/9.5, s(3)=9.5/10.5  →  avg ≈ 0.8997
    #[test]
    fn test_silhouette_known_value() {
        let data = vec![
            vec![0.0, 0.0], vec![1.0, 0.0], vec![10.0, 0.0], vec![11.0, 0.0],
        ];
        let labels = vec![0, 0, 1, 1];
        let metric = DistanceMetric::Euclidean;

        let avg = calculate_average_silhouette(&data, &labels, &metric);
        assert!(
            (avg - 0.8997).abs() < 0.001,
            "diharapkan silhouette rata-rata ≈ 0.8997, dapat {}",
            avg
        );
    }

    /// calculate_silhouette_per_cluster harus mengembalikan satu nilai per cluster.
    #[test]
    fn test_silhouette_per_cluster_length() {
        let data = vec![
            vec![0.0, 0.0], vec![1.0, 0.0],
            vec![10.0, 0.0], vec![11.0, 0.0],
            vec![20.0, 0.0], vec![21.0, 0.0],
        ];
        let labels = vec![0, 0, 1, 1, 2, 2];
        let metric = DistanceMetric::Euclidean;

        let per_cluster = calculate_silhouette_per_cluster(&data, &labels, 3, &metric);
        assert_eq!(per_cluster.len(), 3, "harus mengembalikan satu skor per cluster");
    }
}

