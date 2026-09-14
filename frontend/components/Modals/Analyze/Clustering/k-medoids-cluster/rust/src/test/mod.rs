// Unit tests for K-Medoids

#[cfg(test)]
mod tests {
    use crate::utils::distance::{
        euclidean_distance, manhattan_distance, build_distance_matrix, DistanceMetric,
    };
    use crate::utils::validation::*;
    use crate::models::KMedoidsInput;

    #[test]
    fn test_euclidean_distance() {
        let p1 = vec![0.0, 0.0];
        let p2 = vec![3.0, 4.0];
        let dist = euclidean_distance(&p1, &p2);
        assert!((dist - 5.0).abs() < 1e-10);
    }

    #[test]
    fn test_manhattan_distance() {
        let p1 = vec![0.0, 0.0];
        let p2 = vec![3.0, 4.0];
        let dist = manhattan_distance(&p1, &p2);
        assert!((dist - 7.0).abs() < 1e-10);
    }

    #[test]
    fn test_validate_input_empty_data() {
        let input = KMedoidsInput {
            data: vec![],
            n_clusters: 2,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(true),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };

        assert!(validate_input(&input).is_err());
    }

    #[test]
    fn test_validate_input_too_many_clusters() {
        let input = KMedoidsInput {
            data: vec![vec![1.0, 2.0], vec![3.0, 4.0]],
            n_clusters: 5,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(true),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };

        assert!(validate_input(&input).is_err());
    }

    #[test]
    fn test_validate_input_valid() {
        let input = KMedoidsInput {
            data: vec![vec![1.0, 2.0], vec![3.0, 4.0], vec![5.0, 6.0]],
            n_clusters: 2,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(true),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };

        assert!(validate_input(&input).is_ok());
    }

    // ── Assignment integrity tests ────────────────────────────────────────────
    // These tests guard against the pam_build destructuring bug where the
    // n-length assignment vector was accidentally used as the k-length medoid
    // index list.  If that bug reappears, run_pam returns medoids.len() == n
    // instead of k, causing TypeScript to report k = N clusters in all tables.

    /// 10 points with k=2: verify exactly 2 medoids and valid assignments.
    #[test]
    fn test_run_pam_k2_returns_two_medoids() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        // Two tight clusters well-separated in 2D
        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![0.1, 0.0], vec![0.0, 0.1], vec![0.1, 0.1], vec![0.05, 0.05],
            vec![5.0, 5.0], vec![5.1, 5.0], vec![5.0, 5.1], vec![5.1, 5.1], vec![5.05, 5.05],
        ];
        let n = data.len(); // 10
        let k = 2;

        let config = PAMConfig {
            k,
            metric: DistanceMetric::Euclidean,
            max_iterations: 50,
            random_seed: Some(42),
            use_build_phase: true,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM failed");

        // ── Core invariant: medoids.len() must equal k, NOT n ──
        assert_eq!(
            result.medoids.len(), k,
            "medoids.len()={} but expected k={}. \
             This indicates the pam_build(dist,k) return value is being \
             destructured in the wrong order (taking assi[n] instead of meds[k]).",
            result.medoids.len(), k
        );

        // Every medoid index must be a valid row index
        for &m in &result.medoids {
            assert!(m < n, "medoid index {} out of bounds (n={})", m, n);
        }

        // assignments must have length n with values in 0..k-1
        assert_eq!(result.assignments.len(), n);
        for &a in &result.assignments {
            assert!(a < k, "assignment value {} out of range (k={})", a, k);
        }

        // The two well-separated clusters should each have at least 1 member
        let sizes: Vec<usize> = (0..k)
            .map(|c| result.assignments.iter().filter(|&&a| a == c).count())
            .collect();
        for (c, &sz) in sizes.iter().enumerate() {
            assert!(sz >= 1, "cluster {} is empty — algorithm did not converge to 2 clusters", c);
        }
    }

    /// Random-init path (use_build_phase=false): same invariants must hold.
    #[test]
    fn test_run_pam_random_init_k3_returns_three_medoids() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i / 5) as f64 * 10.0, (i % 5) as f64])
            .collect();
        let k = 3;

        let config = PAMConfig {
            k,
            metric: DistanceMetric::Euclidean,
            max_iterations: 100,
            random_seed: Some(0),
            use_build_phase: false,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM (random init) failed");

        assert_eq!(
            result.medoids.len(), k,
            "random-init PAM: medoids.len()={} expected k={}",
            result.medoids.len(), k
        );
        assert_eq!(result.assignments.len(), data.len());
        for &a in &result.assignments {
            assert!(a < k);
        }
    }

    /// Regression: 500 observations, k=2 must NEVER return 500 medoids.
    #[test]
    fn test_run_pam_n500_k2_does_not_return_n_medoids() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        // Generate 500 2D points split into 2 obvious clusters
        let data: Vec<Vec<f64>> = (0..500_usize)
            .map(|i| {
                let cluster = (i / 250) as f64;
                vec![cluster * 100.0 + (i % 250) as f64 * 0.01,
                     cluster * 100.0 + (i % 250) as f64 * 0.01]
            })
            .collect();
        let n = data.len(); // 500
        let k = 2;

        let config = PAMConfig {
            k,
            metric: DistanceMetric::Euclidean,
            max_iterations: 100,
            random_seed: Some(1),
            use_build_phase: true,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM n=500 k=2 failed");

        assert_eq!(
            result.medoids.len(), k,
            "n=500, k=2 regression: medoids.len()={} — algorithm returned k=N instead of k={}",
            result.medoids.len(), k
        );
        assert_ne!(
            result.medoids.len(), n,
            "CRITICAL: medoids.len() == n ({}) — pam_build destructuring bug is back!", n
        );
        assert_eq!(result.assignments.len(), n);
    }

    // ── A. Distance metric tests ──────────────────────────────────────────────

    /// Jarak dari suatu titik ke dirinya sendiri harus 0 (Euclidean).
    #[test]
    fn test_euclidean_distance_same_point() {
        let p = vec![3.0, 5.0, -2.0];
        assert_eq!(euclidean_distance(&p, &p), 0.0);
    }

    /// Jarak dari suatu titik ke dirinya sendiri harus 0 (Manhattan).
    #[test]
    fn test_manhattan_distance_same_point() {
        let p = vec![3.0, 5.0, -2.0];
        assert_eq!(manhattan_distance(&p, &p), 0.0);
    }

    /// Euclidean 4D: (1,2,3,4) ke (5,6,7,8) = sqrt(64) = 8.0
    #[test]
    fn test_euclidean_distance_higher_dimension() {
        let p1 = vec![1.0, 2.0, 3.0, 4.0];
        let p2 = vec![5.0, 6.0, 7.0, 8.0];
        assert!((euclidean_distance(&p1, &p2) - 8.0).abs() < 1e-10);
    }

    /// Matriks jarak harus simetris: d[i][j] == d[j][i].
    #[test]
    fn test_build_distance_matrix_symmetry() {
        let data = vec![
            vec![0.0, 0.0],
            vec![3.0, 4.0],
            vec![1.0, 1.0],
        ];
        let matrix = build_distance_matrix(&data, &DistanceMetric::Euclidean);
        for i in 0..data.len() {
            for j in 0..data.len() {
                assert!(
                    (matrix[i][j] - matrix[j][i]).abs() < 1e-10,
                    "matrix[{}][{}]={} != matrix[{}][{}]={}",
                    i, j, matrix[i][j], j, i, matrix[j][i]
                );
            }
        }
    }

    /// Diagonal matriks jarak harus selalu 0: d[i][i] == 0.
    #[test]
    fn test_build_distance_matrix_diagonal_zero() {
        let data = vec![
            vec![1.0, 2.0],
            vec![3.0, 4.0],
            vec![5.0, 6.0],
        ];
        let matrix = build_distance_matrix(&data, &DistanceMetric::Euclidean);
        for i in 0..data.len() {
            assert_eq!(matrix[i][i], 0.0, "diagonal[{}] should be 0, got {}", i, matrix[i][i]);
        }
    }

    /// DistanceMetric::from_str harus menerima "euclidean" dan "manhattan" (case-insensitive).
    #[test]
    fn test_distance_metric_from_str_valid() {
        assert!(DistanceMetric::from_str("euclidean").is_ok());
        assert!(DistanceMetric::from_str("manhattan").is_ok());
        assert!(DistanceMetric::from_str("EUCLIDEAN").is_ok());
    }

    /// DistanceMetric::from_str harus menolak metrik yang tidak dikenal.
    #[test]
    fn test_distance_metric_from_str_invalid() {
        assert!(DistanceMetric::from_str("chebyshev").is_err());
        assert!(DistanceMetric::from_str("cosine").is_err());
        assert!(DistanceMetric::from_str("").is_err());
    }

    // ── B. Validation tests ───────────────────────────────────────────────────

    /// k == n (dengan n > 1) harus ditolak karena menyebabkan CLARANS loop tak terbatas.
    #[test]
    fn test_validate_input_k_equals_n() {
        let input = KMedoidsInput {
            data: vec![vec![1.0], vec![2.0], vec![3.0]],
            n_clusters: 3,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(false),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };
        assert!(validate_input(&input).is_err(), "k == n should be invalid");
    }

    /// n_clusters = 0 harus ditolak.
    #[test]
    fn test_validate_input_k_zero() {
        let input = KMedoidsInput {
            data: vec![vec![1.0], vec![2.0]],
            n_clusters: 0,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(false),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };
        assert!(validate_input(&input).is_err(), "k=0 should be invalid");
    }

    /// max_iterations = 0 harus ditolak.
    #[test]
    fn test_validate_input_max_iter_zero() {
        let input = KMedoidsInput {
            data: vec![vec![1.0], vec![2.0], vec![3.0]],
            n_clusters: 2,
            method: "PAM".to_string(),
            max_iterations: 0,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(false),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };
        assert!(validate_input(&input).is_err(), "max_iterations=0 should be invalid");
    }

    /// Data jagged (baris dengan dimensi berbeda) harus ditolak.
    #[test]
    fn test_validate_input_jagged_data() {
        let input = KMedoidsInput {
            data: vec![vec![1.0, 2.0], vec![3.0], vec![4.0, 5.0]],
            n_clusters: 2,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(false),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };
        assert!(validate_input(&input).is_err(), "jagged data should be invalid");
    }

    /// Baris kosong (vektor fitur panjang 0) harus ditolak.
    #[test]
    fn test_validate_input_empty_point() {
        let input = KMedoidsInput {
            data: vec![vec![], vec![], vec![]],
            n_clusters: 2,
            method: "PAM".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(false),
            clara_num_samples: 5,
            clara_sample_size: None,
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };
        assert!(validate_input(&input).is_err(), "empty feature vectors should be invalid");
    }

    /// CLARA: clara_sample_size <= k harus ditolak.
    #[test]
    fn test_validate_clara_sample_too_small() {
        let input = KMedoidsInput {
            data: vec![vec![1.0], vec![2.0], vec![3.0], vec![4.0], vec![5.0]],
            n_clusters: 2,
            method: "CLARA".to_string(),
            max_iterations: 100,
            distance_metric: "euclidean".to_string(),
            random_seed: None,
            n_init: 1,
            convergence_tolerance: 0.0,
            use_build_phase: Some(true),
            use_r_implementation: Some(false),
            clara_num_samples: 5,
            clara_sample_size: Some(2), // == k, harus gagal
            clarans_num_local: 2,
            clarans_max_neighbors: None,
        };
        assert!(validate_input(&input).is_err(), "CLARA sample_size <= k should be invalid");
    }

    // ── C. PAM algorithm tests ────────────────────────────────────────────────

    /// cost_history harus monoton non-increasing: PAM hanya menerima swap yang memperbaiki cost.
    #[test]
    fn test_pam_cost_decreases_monotonically() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![0.2, 0.1], vec![0.1, 0.2],
            vec![9.0, 9.0], vec![9.2, 9.1], vec![9.1, 9.2],
        ];
        let config = PAMConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            max_iterations: 50,
            random_seed: Some(42),
            use_build_phase: true,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM failed");
        for window in result.cost_history.windows(2) {
            assert!(
                window[0] >= window[1] - 1e-10,
                "cost naik dari {} ke {} — PAM menerima swap yang buruk",
                window[0], window[1]
            );
        }
    }

    /// Pada data yang terpisah sempurna, PAM harus konvergen (converged = true).
    #[test]
    fn test_pam_converged_flag_on_simple_data() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![0.1, 0.0], vec![0.0, 0.1],
            vec![100.0, 100.0], vec![100.1, 100.0], vec![100.0, 100.1],
        ];
        let config = PAMConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            max_iterations: 100,
            random_seed: Some(0),
            use_build_phase: true,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM failed");
        assert!(result.converged, "PAM harus konvergen pada data yang terpisah sempurna");
    }

    /// Dengan seed yang sama, PAM harus menghasilkan medoid yang identik (deterministik).
    #[test]
    fn test_pam_deterministic_with_seed() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..20)
            .map(|i| vec![(i % 10) as f64, (i / 10) as f64 * 5.0])
            .collect();
        let config = PAMConfig {
            k: 3,
            metric: DistanceMetric::Euclidean,
            max_iterations: 50,
            random_seed: Some(123),
            use_build_phase: false,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let r1 = run_pam(&data, &config).expect("PAM run 1 gagal");
        let r2 = run_pam(&data, &config).expect("PAM run 2 gagal");
        assert_eq!(r1.medoids, r2.medoids, "PAM dengan seed sama harus menghasilkan medoid yang sama");
    }

    /// PAM harus bekerja dengan metrik Manhattan dan menghasilkan output yang valid.
    #[test]
    fn test_pam_with_manhattan_metric() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![1.0, 0.0], vec![0.0, 1.0],
            vec![10.0, 10.0], vec![11.0, 10.0], vec![10.0, 11.0],
        ];
        let config = PAMConfig {
            k: 2,
            metric: DistanceMetric::Manhattan,
            max_iterations: 50,
            random_seed: Some(0),
            use_build_phase: true,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM Manhattan gagal");
        assert_eq!(result.medoids.len(), 2);
        assert_eq!(result.assignments.len(), data.len());
        for &a in &result.assignments {
            assert!(a < 2, "assignment {} di luar rentang k=2", a);
        }
    }

    /// k=1: semua titik harus masuk ke cluster 0 dan ada tepat 1 medoid.
    #[test]
    fn test_pam_single_cluster_assigns_all_to_zero() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = vec![
            vec![1.0, 2.0], vec![3.0, 4.0], vec![5.0, 6.0],
            vec![7.0, 8.0], vec![9.0, 10.0],
        ];
        let config = PAMConfig {
            k: 1,
            metric: DistanceMetric::Euclidean,
            max_iterations: 50,
            random_seed: Some(0),
            use_build_phase: true,
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM k=1 gagal");
        assert_eq!(result.medoids.len(), 1, "k=1 harus menghasilkan tepat satu medoid");
        for &a in &result.assignments {
            assert_eq!(a, 0, "k=1: setiap titik harus masuk ke cluster 0");
        }
    }

    // ── D. CLARA algorithm tests ──────────────────────────────────────────────

    /// CLARA harus mengembalikan tepat k medoid.
    #[test]
    fn test_clara_returns_k_medoids() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..30)
            .map(|i| vec![(i % 3) as f64 * 10.0, (i / 10) as f64])
            .collect();
        let k = 3;
        let config = CLARAConfig {
            k,
            metric: DistanceMetric::Euclidean,
            num_samples: 3,
            sample_size: 40 + 2 * k,
            max_iterations: 50,
            random_seed: Some(42),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA gagal");
        assert_eq!(result.medoids.len(), k, "CLARA harus mengembalikan tepat k medoid");
    }

    /// Semua assignment dari CLARA harus berada dalam rentang 0..k-1.
    #[test]
    fn test_clara_valid_assignments() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..20)
            .map(|i| vec![(i % 2) as f64 * 50.0, i as f64 * 0.1])
            .collect();
        let k = 2;
        let config = CLARAConfig {
            k,
            metric: DistanceMetric::Euclidean,
            num_samples: 3,
            sample_size: 40 + 2 * k,
            max_iterations: 50,
            random_seed: Some(7),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA gagal");
        assert_eq!(result.assignments.len(), data.len());
        for &a in &result.assignments {
            assert!(a < k, "assignment {} di luar rentang k={}", a, k);
        }
    }

    /// CLARA harus merekam tepat num_samples SampleRecord dalam field samples.
    #[test]
    fn test_clara_sample_costs_length() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..25)
            .map(|i| vec![i as f64, (i % 5) as f64])
            .collect();
        let num_samples = 4;
        let config = CLARAConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_samples,
            sample_size: 10,
            max_iterations: 30,
            random_seed: Some(99),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA gagal");
        assert_eq!(
            result.samples.len(), num_samples,
            "CLARA harus merekam satu SampleRecord per sampel"
        );
    }

    // ── E. CLARANS algorithm tests ────────────────────────────────────────────

    /// CLARANS harus mengembalikan tepat k medoid.
    #[test]
    fn test_clarans_returns_k_medoids() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..20)
            .map(|i| vec![(i / 10) as f64 * 100.0, (i % 10) as f64])
            .collect();
        let k = 2;
        let n = data.len();
        let config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);

        let result = run_clarans(&data, &config).expect("CLARANS gagal");
        assert_eq!(result.medoids.len(), k, "CLARANS harus mengembalikan tepat k medoid");
    }

    /// Semua assignment dari CLARANS harus berada dalam rentang 0..k-1.
    #[test]
    fn test_clarans_valid_assignments() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i / 5) as f64 * 20.0, (i % 5) as f64])
            .collect();
        let k = 3;
        let n = data.len();
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);
        config.random_seed = Some(55);

        let result = run_clarans(&data, &config).expect("CLARANS gagal");
        assert_eq!(result.assignments.len(), data.len());
        for &a in &result.assignments {
            assert!(a < k, "assignment {} di luar rentang k={}", a, k);
        }
    }

    /// Dengan seed yang sama, CLARANS harus menghasilkan medoid yang identik (deterministik).
    #[test]
    fn test_clarans_deterministic_with_seed() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i % 5) as f64 * 3.0, (i / 5) as f64 * 20.0])
            .collect();
        let k = 3;
        let n = data.len();
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);
        config.random_seed = Some(77);

        let r1 = run_clarans(&data, &config).expect("CLARANS run 1 gagal");
        let r2 = run_clarans(&data, &config).expect("CLARANS run 2 gagal");
        assert_eq!(r1.medoids, r2.medoids, "CLARANS dengan seed sama harus deterministik");
    }
}
