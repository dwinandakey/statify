// Unit tests for K-Medoids

#[cfg(test)]
mod tests {
    use crate::utils::distance::{
        euclidean_distance, manhattan_distance, build_distance_matrix, DistanceMetric,
    };
    use crate::utils::validation::*;
    use crate::models::KMedoidsInput;
    use crate::stats::normalization::{normalize_data, NormalizationMethod};

    /// UT-DIST-01: Euclidean distance dua titik berbeda.
    /// P1=(0,0), P2=(3,4) -> jarak = 5.0 (segitiga 3-4-5).
    #[test]
    fn test_euclidean_distance_ut_dist_01() {
        let p1 = vec![0.0, 0.0];
        let p2 = vec![3.0, 4.0];
        let dist = euclidean_distance(&p1, &p2);
        assert!(
            (dist - 5.0).abs() < 1e-10,
            "UT-DIST-01: diharapkan 5.0, dapat {}",
            dist
        );
    }

    /// UT-DIST-02: Manhattan distance dua titik berbeda.
    /// P1=(1,1), P2=(4,5) -> jarak = |4-1| + |5-1| = 3 + 4 = 7.0.
    #[test]
    fn test_manhattan_distance_ut_dist_02() {
        let p1 = vec![1.0, 1.0];
        let p2 = vec![4.0, 5.0];
        let dist = manhattan_distance(&p1, &p2);
        assert!(
            (dist - 7.0).abs() < 1e-10,
            "UT-DIST-02: diharapkan 7.0, dapat {}",
            dist
        );
    }

    /// UT-VAL-01: Data kosong harus ditolak validasi.
    #[test]
    fn test_validate_input_ut_val_01_empty_data() {
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

    /// UT-VAL-02: n_clusters melebihi jumlah data point harus ditolak.
    #[test]
    fn test_validate_input_ut_val_02_too_many_clusters() {
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

    /// UT-VAL-03: Input yang sepenuhnya valid harus lolos validasi (kontrol positif).
    #[test]
    fn test_validate_input_ut_val_03_valid() {
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

    /// UT-PAM-05: Jumlah medoid hasil PAM harus tepat k (bukan n) dan seluruh
    /// assignment valid. Dataset 10 titik (2 gerombolan terpisah), k=2.
    #[test]
    fn test_run_pam_ut_pam_05_k2_returns_two_medoids() {
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

    /// UT-PAM-06: Inisialisasi random (tanpa fase BUILD) tetap menghasilkan
    /// jumlah medoid = k dan assignment valid. Dataset 15 titik, k=3.
    #[test]
    fn test_run_pam_ut_pam_06_random_init_k3_returns_three_medoids() {
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

    /// UT-PAM-07: Regresi — dataset besar (n=500, k=2) tidak boleh
    /// mengembalikan 500 medoid (bug lama: vektor assignment sepanjang n
    /// tertukar dipakai sebagai daftar medoid sepanjang k).
    #[test]
    fn test_run_pam_ut_pam_07_n500_k2_does_not_return_n_medoids() {
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

    /// UT-PRE-01: Normalisasi min-max pada data numerik normal.
    /// Data uji [10, 20, 30, 40] harus ternormalisasi ke [0.0, 0.33, 0.67, 1.0].
    #[test]
    fn test_minmax_normalization_ut_pre_01() {
        let data = vec![vec![10.0], vec![20.0], vec![30.0], vec![40.0]];
        let (normalized, _) = normalize_data(&data, NormalizationMethod::MinMax);

        let expected = [0.0, 0.33, 0.67, 1.0];
        for (row, &exp) in normalized.iter().zip(expected.iter()) {
            assert!(
                (row[0] - exp).abs() < 0.01,
                "UT-PRE-01: diharapkan {}, dapat {}",
                exp, row[0]
            );
        }
    }

    /// UT-PRE-02: Normalisasi min-max pada kolom dengan varians nol (semua nilai sama).
    /// Kolom [5, 5, 5, 5] tidak boleh menyebabkan pembagian dengan nol (NaN/Inf);
    /// implementasi saat ini memetakan kolom konstan ke nilai tengah 0.5.
    #[test]
    fn test_minmax_normalization_ut_pre_02() {
        let data = vec![vec![5.0], vec![5.0], vec![5.0], vec![5.0]];
        let (normalized, _) = normalize_data(&data, NormalizationMethod::MinMax);

        for row in &normalized {
            assert!(
                row[0].is_finite(),
                "UT-PRE-02: hasil harus finite (bukan NaN/Inf) untuk kolom varians nol, dapat {}",
                row[0]
            );
            assert!(
                (row[0] - 0.5).abs() < 1e-10,
                "UT-PRE-02: kolom varians nol harus dipetakan ke 0.5 (nilai tengah), dapat {}",
                row[0]
            );
        }
    }

    /// UT-PRE-03: Standardisasi z-score pada data numerik normal.
    /// Kolom [10, 20, 30, 40] (mean=25) harus terstandarisasi dengan mean hasil ≈ 0
    /// dan std hasil ≈ 1. CATATAN: implementasi saat ini pakai standar deviasi
    /// SAMPEL (n-1, selaras dengan R scale()), bukan populasi (n) seperti di
    /// tabel skenario — std sampel ≈12.91 (bukan ≈11.18), sehingga nilai
    /// ternormalisasi ≈[-1.16,-0.39,0.39,1.16] (bukan ≈[-1.34,-0.45,0.45,1.34]).
    #[test]
    fn test_zscore_normalization_ut_pre_03() {
        let data = vec![vec![10.0], vec![20.0], vec![30.0], vec![40.0]];
        let (normalized, stats) = normalize_data(&data, NormalizationMethod::ZScore);

        assert!((stats[0].mean - 25.0).abs() < 1e-10, "mean harus 25, dapat {}", stats[0].mean);
        assert!(
            (stats[0].std_dev - 12.91).abs() < 0.01,
            "std sampel (n-1) harus ≈12.91, dapat {}", stats[0].std_dev
        );

        let expected = [-1.16, -0.39, 0.39, 1.16];
        for (row, &exp) in normalized.iter().zip(expected.iter()) {
            assert!(
                (row[0] - exp).abs() < 0.01,
                "UT-PRE-03: diharapkan {}, dapat {}",
                exp, row[0]
            );
        }

        let n = normalized.len() as f64;
        let mean: f64 = normalized.iter().map(|row| row[0]).sum::<f64>() / n;
        let variance: f64 = normalized.iter().map(|row| (row[0] - mean).powi(2)).sum::<f64>() / (n - 1.0);
        assert!(mean.abs() < 1e-10, "mean hasil harus ≈0, dapat {}", mean);
        assert!((variance.sqrt() - 1.0).abs() < 1e-10, "std sampel hasil harus ≈1, dapat {}", variance.sqrt());
    }

    /// UT-PRE-05: Standardisasi z-score pada kolom mengandung outlier ekstrem.
    /// Kolom [1, 2, 3, 1000] tidak boleh menghasilkan NaN/Inf, dan z-score
    /// outlier (1000) harus jauh lebih besar (dalam nilai absolut) dari titik lain.
    /// CATATAN: tabel skenario memakai std POPULASI (÷n) sehingga mengharapkan
    /// z(1000)≈1.73; implementasi saat ini memakai std SAMPEL (÷n-1, lihat
    /// UT-PRE-03), yang untuk data ini menghasilkan std≈499.0007 sehingga
    /// z(1000)≈1.5. Test disesuaikan ke kode aktual.
    #[test]
    fn test_zscore_normalization_ut_pre_05_outlier() {
        let data = vec![vec![1.0], vec![2.0], vec![3.0], vec![1000.0]];
        let (normalized, stats) = normalize_data(&data, NormalizationMethod::ZScore);

        // Tidak boleh ada NaN/Inf sama sekali.
        for row in &normalized {
            assert!(row[0].is_finite(), "UT-PRE-05: hasil harus finite, dapat {}", row[0]);
        }

        assert!((stats[0].mean - 251.5).abs() < 1e-9, "mean harus 251.5, dapat {}", stats[0].mean);
        assert!(
            (stats[0].std_dev - 499.0007).abs() < 1e-3,
            "std sampel (n-1) harus ≈499.0007, dapat {}", stats[0].std_dev
        );

        let z_outlier = normalized[3][0];
        assert!(
            (z_outlier - 1.5).abs() < 1e-3,
            "UT-PRE-05: z-score outlier harus ≈1.5 (std sampel), dapat {}", z_outlier
        );

        // Outlier harus punya |z| jauh lebih besar dari titik lain.
        let max_other = normalized[..3].iter().map(|r| r[0].abs()).fold(0.0_f64, f64::max);
        assert!(
            z_outlier.abs() > max_other,
            "UT-PRE-05: |z-score| outlier ({}) harus lebih besar dari titik lain ({})",
            z_outlier.abs(), max_other
        );
    }

    /// UT-PRE-06: Konsistensi pemilihan metode preprocessing (min-max vs z-score)
    /// sesuai parameter pengguna. Parameter method="zscore" pada kolom
    /// [10,20,30,40] harus memanggil jalur standarisasi z-score (BUKAN
    /// min-max), dengan hasil sesuai UT-PRE-03. Diuji lewat
    /// `NormalizationMethod::from_str`, dispatch logic yang sama persis
    /// dipakai `wasm::standardize_data` (diekstrak supaya bisa dites tanpa
    /// melewati boundary JsValue/WASM).
    #[test]
    fn test_ut_pre_06_method_dispatch_zscore_not_minmax() {
        let resolved = NormalizationMethod::from_str("zscore");
        assert_eq!(
            resolved, NormalizationMethod::ZScore,
            "UT-PRE-06: method=\"zscore\" harus resolve ke varian ZScore, bukan MinMax"
        );
        assert_ne!(resolved, NormalizationMethod::MinMax, "UT-PRE-06: jangan sampai salah jalur ke MinMax");

        // Case-insensitive juga harus konsisten.
        assert_eq!(NormalizationMethod::from_str("ZSCORE"), NormalizationMethod::ZScore);
        assert_eq!(NormalizationMethod::from_str("minmax"), NormalizationMethod::MinMax);

        // Hasil akhir jalur yang terpanggil harus sesuai UT-PRE-03 (z-score),
        // BUKAN sesuai UT-PRE-01 (min-max), untuk data yang sama.
        let data = vec![vec![10.0], vec![20.0], vec![30.0], vec![40.0]];
        let (normalized, _) = normalize_data(&data, resolved);

        let expected_zscore = [-1.16, -0.39, 0.39, 1.16]; // sama seperti UT-PRE-03
        for (row, &exp) in normalized.iter().zip(expected_zscore.iter()) {
            assert!(
                (row[0] - exp).abs() < 0.01,
                "UT-PRE-06: hasil harus mengikuti jalur z-score (UT-PRE-03), diharapkan {}, dapat {}",
                exp, row[0]
            );
        }

        // Pastikan BUKAN hasil min-max (UT-PRE-01) — nilai pertama min-max = 0.0,
        // sedangkan z-score = -1.16; keduanya jauh berbeda jadi tidak mungkin tertukar diam-diam.
        assert!(
            (normalized[0][0] - 0.0).abs() > 0.5,
            "UT-PRE-06: hasil tampaknya memakai jalur min-max, bukan z-score"
        );
    }

    /// UT-PRE-04: Standardisasi z-score pada kolom dengan standar deviasi nol
    /// (semua nilai sama). Kolom [5, 5, 5, 5] tidak boleh menyebabkan pembagian
    /// dengan nol (NaN/Inf); hasil harus default [0, 0, 0, 0].
    /// Diuji lewat crate::stats::normalization::normalize_data, satu-satunya
    /// implementasi normalisasi yang benar-benar dipanggil produksi lewat
    /// wasm::standardize_data (lihat catatan di stats/mod.rs).
    #[test]
    fn test_zscore_normalization_ut_pre_04() {
        let data = vec![vec![5.0], vec![5.0], vec![5.0], vec![5.0]];
        let (normalized, stats) = normalize_data(&data, NormalizationMethod::ZScore);

        assert!(
            (stats[0].std_dev - 1.0).abs() < 1e-10,
            "UT-PRE-04: std_dev harus di-fallback ke 1.0 untuk menghindari pembagian nol, dapat {}",
            stats[0].std_dev
        );

        for row in &normalized {
            assert!(
                row[0].is_finite(),
                "UT-PRE-04: hasil harus finite (bukan NaN/Inf), dapat {}",
                row[0]
            );
            assert!(
                (row[0] - 0.0).abs() < 1e-10,
                "UT-PRE-04: hasil harus 0, dapat {}",
                row[0]
            );
        }
    }

    // ── A. Distance metric tests ──────────────────────────────────────────────

    /// UT-DIST-03: Jarak antara dua titik identik (Euclidean).
    /// P1=(2,2), P2=(2,2) -> jarak = 0.0.
    #[test]
    fn test_euclidean_distance_ut_dist_03_identical_points() {
        let p1 = vec![2.0, 2.0];
        let p2 = vec![2.0, 2.0];
        let dist = euclidean_distance(&p1, &p2);
        assert_eq!(dist, 0.0, "UT-DIST-03: diharapkan 0.0, dapat {}", dist);
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

    /// UT-DIST-04: Sifat simetris matriks jarak untuk 5 titik.
    /// d(i,j) == d(j,i) harus terpenuhi untuk seluruh pasangan.
    #[test]
    fn test_build_distance_matrix_ut_dist_04_symmetry() {
        let data = vec![
            vec![0.0, 0.0],
            vec![3.0, 4.0],
            vec![1.0, 1.0],
            vec![-2.0, 5.0],
            vec![7.0, -3.0],
        ];
        let matrix = build_distance_matrix(&data, &DistanceMetric::Euclidean);
        for i in 0..data.len() {
            for j in 0..data.len() {
                assert!(
                    (matrix[i][j] - matrix[j][i]).abs() < 1e-10,
                    "UT-DIST-04: d({},{})={} != d({},{})={}",
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

    /// UT-VAL-04: k == n (dengan n > 1) harus ditolak karena menyebabkan
    /// CLARANS loop tak terbatas (tidak ada kandidat non-medoid untuk swap).
    #[test]
    fn test_validate_input_ut_val_04_k_equals_n() {
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

    /// UT-VAL-05: n_clusters = 0 harus ditolak.
    #[test]
    fn test_validate_input_ut_val_05_k_zero() {
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

    /// UT-VAL-06: max_iterations = 0 harus ditolak.
    #[test]
    fn test_validate_input_ut_val_06_max_iter_zero() {
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

    /// UT-VAL-07: Data jagged (baris dengan dimensi/jumlah variabel berbeda) harus ditolak.
    #[test]
    fn test_validate_input_ut_val_07_jagged_data() {
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

    /// UT-VAL-08: Baris kosong (vektor fitur panjang 0) harus ditolak.
    #[test]
    fn test_validate_input_ut_val_08_empty_point() {
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

    /// UT-CLARA-10: clara_sample_size <= k harus ditolak saat validasi input.
    #[test]
    fn test_validate_clara_ut_clara_10_sample_too_small() {
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

    /// UT-PAM-01: Fase BUILD (langkah 1) memilih medoid PERTAMA = titik
    /// paling sentral (total jarak ke seluruh titik lain minimum).
    ///
    /// CATATAN METODOLOGI: klaim ini HANYA berlaku untuk langkah pertama
    /// BUILD, bukan untuk pasangan k medoid akhir secara keseluruhan — BUILD
    /// adalah heuristik greedy (medoid berikutnya dipilih greedy berdasar
    /// pengurangan cost marginal), BUKAN exhaustive search ke semua C(n,k)
    /// kombinasi. Itulah sebabnya fase SWAP ada setelahnya, untuk
    /// memperbaiki hasil BUILD yang belum tentu optimal secara global.
    /// Percobaan awal menguji "cost pasangan BUILD = cost minimum dari
    /// SEMUA kombinasi 2 medoid" GAGAL (BUILD costnya 6.95, padahal ada
    /// kombinasi lain dengan cost 5.66) -- membuktikan klaim itu salah.
    /// Klaim yang benar (dan terbukti true) adalah spesifik langkah 1 ini.
    #[test]
    fn test_pam_build_ut_pam_01_first_medoid_is_most_central() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::{euclidean_distance, DistanceMetric};

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![1.0, 0.0], vec![0.0, 1.0], vec![1.0, 1.0], vec![0.5, 0.5],
            vec![10.0, 10.0], vec![11.0, 10.0], vec![10.0, 11.0], vec![11.0, 11.0], vec![10.5, 10.5],
        ];
        let n = data.len();

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

        let result = run_pam(&data, &config).expect("PAM gagal");
        let build_medoids = result.medoid_history[0].clone();
        assert_eq!(build_medoids.len(), 2, "UT-PAM-01: fase BUILD harus memilih 2 medoid");

        let total_distance_to_others = |p: usize| -> f64 {
            (0..n)
                .filter(|&i| i != p)
                .map(|i| euclidean_distance(&data[i], &data[p]))
                .sum::<f64>()
        };

        let distances: Vec<f64> = (0..n).map(total_distance_to_others).collect();
        let min_total_distance = distances.iter().cloned().fold(f64::INFINITY, f64::min);

        let most_central_points: Vec<usize> = (0..n)
            .filter(|&p| (distances[p] - min_total_distance).abs() < 1e-9)
            .collect();
        // Titik paling sentral (jarak total minimum) untuk dataset ini adalah
        // idx 3 dan idx 5 (dasi, 71.33), BUKAN idx 4/9 (73.57) yang tampak
        // "sentral" secara visual sebagai centroid gerombolan masing-masing.
        // idx 3/5 justru lebih sentral karena posisinya di "sudut yang saling
        // berhadapan" antar dua gerombolan, sehingga total jaraknya ke SEMUA
        // titik (bukan cuma gerombolannya sendiri) lebih kecil.

        let first_medoid_is_central = build_medoids
            .iter()
            .any(|&m| most_central_points.contains(&m));

        assert!(
            first_medoid_is_central,
            "UT-PAM-01: salah satu medoid BUILD {:?} harus termasuk titik paling sentral {:?} (total jarak minimum={})",
            build_medoids, most_central_points, min_total_distance
        );
    }

    /// UT-PAM-02: Fase BUILD (langkah 2 dst.) memilih medoid berikutnya
    /// secara GREEDY — titik yang memberi pengurangan cost marginal terbesar
    /// terhadap medoid yang sudah terpilih, dihitung satu per satu (bukan
    /// exhaustive search membandingkan ke seluruh kombinasi pasangan).
    ///
    /// Dataset & medoid pertama SAMA PERSIS dengan UT-PAM-01 (idx 3, terbukti
    /// titik paling sentral di test itu). BUILD-nya sendiri (result aktual)
    /// menghasilkan medoid kedua = idx 9 — test ini membuktikan idx 9 memang
    /// kandidat dengan pengurangan cost marginal TERBESAR di antara 9
    /// kandidat lain, dihitung satu-per-satu terhadap medoid pertama (idx 3).
    #[test]
    fn test_pam_build_ut_pam_02_second_medoid_is_greedy_marginal_best() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::{euclidean_distance, DistanceMetric};

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![1.0, 0.0], vec![0.0, 1.0], vec![1.0, 1.0], vec![0.5, 0.5],
            vec![10.0, 10.0], vec![11.0, 10.0], vec![10.0, 11.0], vec![11.0, 11.0], vec![10.5, 10.5],
        ];
        let n = data.len();

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

        let result = run_pam(&data, &config).expect("PAM gagal");
        let build_medoids = result.medoid_history[0].clone();

        let first_medoid = 3usize; // terbukti di UT-PAM-01: titik paling sentral
        assert!(
            build_medoids.contains(&first_medoid),
            "UT-PAM-02: medoid pertama idx {} (dari UT-PAM-01) harus ada di hasil BUILD {:?}",
            first_medoid, build_medoids
        );
        let actual_second_medoid = build_medoids
            .iter()
            .copied()
            .find(|&m| m != first_medoid)
            .expect("harus ada medoid kedua");

        // cost_before: total cost kalau SEMUA titik memakai medoid pertama saja.
        let cost_before: f64 = (0..n)
            .filter(|&i| i != first_medoid)
            .map(|i| euclidean_distance(&data[i], &data[first_medoid]))
            .sum();

        // Untuk tiap kandidat c (selain medoid pertama), hitung pengurangan
        // cost marginal satu-per-satu terhadap medoid pertama SAJA (bukan
        // dibandingkan ke seluruh 45 kombinasi pasangan) -- persis definisi
        // langkah greedy BUILD ke-2.
        let marginal_reduction = |c: usize| -> f64 {
            let cost_after: f64 = (0..n)
                .filter(|&i| i != first_medoid && i != c)
                .map(|i| {
                    let d_first = euclidean_distance(&data[i], &data[first_medoid]);
                    let d_c = euclidean_distance(&data[i], &data[c]);
                    d_first.min(d_c)
                })
                .sum();
            cost_before - cost_after
        };

        let mut best_candidate = usize::MAX;
        let mut best_reduction = f64::NEG_INFINITY;
        for c in 0..n {
            if c == first_medoid { continue; }
            let r = marginal_reduction(c);
            if r > best_reduction {
                best_reduction = r;
                best_candidate = c;
            }
        }

        assert_eq!(
            actual_second_medoid, best_candidate,
            "UT-PAM-02: medoid kedua hasil BUILD (idx {}) harus sama dengan kandidat pengurangan cost marginal terbesar (idx {}, reduction={})",
            actual_second_medoid, best_candidate, best_reduction
        );
    }

    /// UT-PAM-03: Fase SWAP memperbaiki hasil BUILD yang belum optimal.
    /// Dataset & medoid awal SAMA PERSIS dengan UT-PAM-01/02 (BUILD costnya
    /// 6.95 -- BUKTI bahwa BUILD adalah heuristik greedy, bukan exhaustive
    /// search, karena kombinasi terbaik dari SEMUA C(10,2)=45 pasangan
    /// sebenarnya 5.66 dari pasangan (4,9)). Test ini membuktikan fase SWAP
    /// berhasil memperbaiki hasil BUILD itu mendekati/menyamai optimum
    /// global tsb, bukan diam di local optimum BUILD yang lebih buruk.
    #[test]
    fn test_pam_swap_ut_pam_03_improves_on_build() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::{euclidean_distance, DistanceMetric};

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![1.0, 0.0], vec![0.0, 1.0], vec![1.0, 1.0], vec![0.5, 0.5],
            vec![10.0, 10.0], vec![11.0, 10.0], vec![10.0, 11.0], vec![11.0, 11.0], vec![10.5, 10.5],
        ];
        let n = data.len();

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

        let result = run_pam(&data, &config).expect("PAM gagal");

        // Brute force: cost minimum global dari SELURUH C(10,2)=45 kombinasi
        // pasangan medoid (dipakai sebagai patokan optimum sesungguhnya).
        let cost_for_pair = |a: usize, b: usize| -> f64 {
            (0..n)
                .map(|i| {
                    let d_a = euclidean_distance(&data[i], &data[a]);
                    let d_b = euclidean_distance(&data[i], &data[b]);
                    d_a.min(d_b)
                })
                .sum::<f64>()
        };
        let mut global_min_cost = f64::INFINITY;
        for a in 0..n {
            for b in (a + 1)..n {
                let c = cost_for_pair(a, b);
                if c < global_min_cost {
                    global_min_cost = c;
                }
            }
        }

        // SWAP harus memperbaiki (menurunkan) cost dibanding BUILD saja.
        assert!(
            result.total_cost_swap < result.total_cost_build - 1e-9,
            "UT-PAM-03: cost SWAP ({}) harus lebih rendah dari cost BUILD ({}) -- SWAP tidak memperbaiki apa pun",
            result.total_cost_swap, result.total_cost_build
        );

        // Setelah SWAP, cost akhir harus mencapai (atau sangat mendekati)
        // optimum global hasil brute force -- membuktikan SWAP benar-benar
        // keluar dari local optimum BUILD menuju solusi terbaik yang ada.
        assert!(
            (result.total_cost_swap - global_min_cost).abs() < 1e-6,
            "UT-PAM-03: cost akhir SWAP ({}) harus mencapai optimum global brute force ({})",
            result.total_cost_swap, global_min_cost
        );
    }

    /// UT-PAM-04: max_iterations dihormati -- PAM harus berhenti tepat pada
    /// batas iterasi yang ditentukan kalau belum konvergen, bukan jalan terus
    /// melebihi batas.
    #[test]
    fn test_pam_ut_pam_04_respects_max_iterations() {
        use crate::algorithms::pam::{run_pam, PAMConfig};
        use crate::utils::distance::DistanceMetric;

        // Dataset acak (tidak rapi) dengan k relatif besar supaya SWAP
        // berpotensi butuh banyak iterasi untuk konvergen secara alami.
        let data: Vec<Vec<f64>> = (0..40)
            .map(|i| {
                let x = ((i * 37) % 97) as f64;
                let y = ((i * 53) % 89) as f64;
                vec![x, y]
            })
            .collect();

        let max_iterations = 2usize;
        let config = PAMConfig {
            k: 5,
            metric: DistanceMetric::Euclidean,
            max_iterations,
            random_seed: Some(7),
            use_build_phase: false, // random init -> SWAP kemungkinan besar belum konvergen di iterasi ke-2
            epsilon: 0.0,
            n_init: 1,
            use_r_implementation: false,
        };

        let result = run_pam(&data, &config).expect("PAM gagal");

        assert!(
            result.iterations <= max_iterations,
            "UT-PAM-04: iterations ({}) tidak boleh melebihi max_iterations ({})",
            result.iterations, max_iterations
        );
        // cost_history mencatat 1 entri awal (BUILD/init) + 1 entri per iterasi SWAP.
        assert!(
            result.cost_history.len() <= max_iterations + 1,
            "UT-PAM-04: panjang cost_history ({}) tidak boleh melebihi max_iterations+1 ({})",
            result.cost_history.len(), max_iterations + 1
        );
    }

    // ── C. PAM algorithm tests ────────────────────────────────────────────────

    /// UT-PAM-08: cost_history harus monoton non-increasing — PAM hanya
    /// menerima swap yang memperbaiki (atau mempertahankan) cost, tidak
    /// pernah menerima swap yang memperburuk.
    #[test]
    fn test_pam_ut_pam_08_cost_decreases_monotonically() {
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

    /// UT-PAM-09: Flag `converged` harus true pada data yang terpisah
    /// sempurna (2 gerombolan sangat jauh, seharusnya tidak butuh banyak
    /// swap untuk mencapai titik stabil).
    #[test]
    fn test_pam_ut_pam_09_converged_flag_on_simple_data() {
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

    /// UT-PAM-10: Dengan random_seed yang sama, PAM (inisialisasi random)
    /// harus menghasilkan medoid akhir yang identik di dua kali jalan
    /// (deterministik, bukan acak beneran).
    #[test]
    fn test_pam_ut_pam_10_deterministic_with_seed() {
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

    /// UT-PAM-11: PAM harus bekerja dengan metrik Manhattan (bukan cuma
    /// Euclidean) dan tetap menghasilkan output yang valid (k medoid,
    /// assignment dalam rentang benar).
    #[test]
    fn test_pam_ut_pam_11_with_manhattan_metric() {
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

    /// UT-CLARA-01: CLARA harus mengembalikan tepat k medoid.
    #[test]
    fn test_clara_ut_clara_01_returns_k_medoids() {
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

    /// UT-CLARA-02: Semua assignment dari CLARA harus berada dalam rentang 0..k-1.
    #[test]
    fn test_clara_ut_clara_02_valid_assignments() {
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

    /// UT-CLARA-03: CLARA harus merekam tepat num_samples SampleRecord dalam
    /// field samples (satu record per sampel yang dicoba).
    #[test]
    fn test_clara_ut_clara_03_sample_costs_length() {
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

    /// UT-CLARA-04: CLARA harus memilih sample dengan cost (dievaluasi di
    /// SELURUH dataset) TERENDAH di antara semua num_samples sampel yang
    /// dicoba -- bukan sampel sembarang atau sampel terakhir. Ini properti
    /// inti algoritma CLARA (langkah "return the best clustering result").
    #[test]
    fn test_clara_ut_clara_04_selects_lowest_cost_sample() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..25)
            .map(|i| vec![i as f64, (i % 5) as f64])
            .collect();
        let num_samples = 6;
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

        // Cost akhir yang dilaporkan harus sama dengan cost TERENDAH di
        // antara seluruh record sample yang tercatat.
        let min_sample_cost = result
            .samples
            .iter()
            .map(|s| s.cost)
            .fold(f64::INFINITY, f64::min);

        assert!(
            (result.total_cost - min_sample_cost).abs() < 1e-9,
            "UT-CLARA-04: total_cost akhir ({}) harus sama dengan cost sample terendah ({}) dari {} sampel",
            result.total_cost, min_sample_cost, result.samples.len()
        );

        // Tidak ada satupun sample lain yang cost-nya lebih rendah dari yang dipilih.
        for s in &result.samples {
            assert!(
                result.total_cost <= s.cost + 1e-9,
                "UT-CLARA-04: ada sample idx {} dengan cost {} lebih rendah dari hasil terpilih {}",
                s.sample_index, s.cost, result.total_cost
            );
        }
    }

    /// UT-CLARA-05: Cost akhir CLARA harus dievaluasi terhadap SELURUH
    /// dataset (bukan cuma sub-sample) -- dibuktikan dengan menghitung ulang
    /// cost secara independen (assign tiap titik dari SEMUA n data ke
    /// medoid terpilih) dan mencocokkannya dengan total_cost yang dilaporkan.
    #[test]
    fn test_clara_ut_clara_05_cost_evaluated_on_full_dataset() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::{euclidean_distance, DistanceMetric};

        let data: Vec<Vec<f64>> = (0..25)
            .map(|i| vec![i as f64, (i % 5) as f64])
            .collect();
        let n = data.len();

        let config = CLARAConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_samples: 4,
            sample_size: 10, // jauh lebih kecil dari n=25 -> benar-benar sampling, bukan fallback PAM
            max_iterations: 30,
            random_seed: Some(99),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA gagal");

        // Hitung ulang cost secara independen atas SELURUH n=25 titik,
        // pakai medoids hasil CLARA.
        let recomputed_cost: f64 = (0..n)
            .map(|i| {
                result
                    .medoids
                    .iter()
                    .map(|&m| euclidean_distance(&data[i], &data[m]))
                    .fold(f64::INFINITY, f64::min)
            })
            .sum();

        assert!(
            (result.total_cost - recomputed_cost).abs() < 1e-9,
            "UT-CLARA-05: total_cost dilaporkan ({}) harus sama dengan cost hitung ulang atas seluruh dataset ({})",
            result.total_cost, recomputed_cost
        );
    }

    /// UT-CLARA-06: Dataset kecil (n <= sample_size) harus fallback ke PAM
    /// tunggal (bukan sampling berkali-kali) -- samples_tried=1 dan hanya
    /// ada 1 SampleRecord, karena sampling atas seluruh dataset itu sendiri
    /// tidak ada gunanya.
    #[test]
    fn test_clara_ut_clara_06_small_dataset_falls_back_to_single_pam() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..10)
            .map(|i| vec![i as f64, (i % 3) as f64])
            .collect();
        let n = data.len(); // 10

        let config = CLARAConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_samples: 5,
            sample_size: 40, // >> n=10 -> harus fallback
            max_iterations: 30,
            random_seed: Some(1),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA gagal");

        assert_eq!(
            result.samples_tried, 1,
            "UT-CLARA-06: dataset kecil (n={}) harus fallback ke 1x PAM, bukan {} sampel",
            n, result.samples_tried
        );
        assert_eq!(result.samples.len(), 1, "UT-CLARA-06: hanya 1 SampleRecord saat fallback");
        assert_eq!(result.medoids.len(), 2);
    }

    /// UT-CLARA-07: Dengan seed yang sama, CLARA harus menghasilkan medoid
    /// akhir yang identik di dua kali jalan (deterministik).
    #[test]
    fn test_clara_ut_clara_07_deterministic_with_seed() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..30)
            .map(|i| vec![(i % 3) as f64 * 10.0, (i / 3) as f64])
            .collect();
        let config = CLARAConfig {
            k: 3,
            metric: DistanceMetric::Euclidean,
            num_samples: 4,
            sample_size: 12,
            max_iterations: 30,
            random_seed: Some(55),
            use_build_phase: true,
        };

        let r1 = run_clara(&data, &config).expect("CLARA run 1 gagal");
        let r2 = run_clara(&data, &config).expect("CLARA run 2 gagal");
        assert_eq!(r1.medoids, r2.medoids, "UT-CLARA-07: CLARA dengan seed sama harus menghasilkan medoid yang sama");
    }

    /// UT-CLARA-08: CLARA harus bekerja dengan metrik Manhattan (bukan cuma
    /// Euclidean) dan tetap menghasilkan output yang valid.
    #[test]
    fn test_clara_ut_clara_08_with_manhattan_metric() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..25)
            .map(|i| vec![i as f64, (i % 5) as f64])
            .collect();
        let config = CLARAConfig {
            k: 2,
            metric: DistanceMetric::Manhattan,
            num_samples: 4,
            sample_size: 10,
            max_iterations: 30,
            random_seed: Some(3),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA Manhattan gagal");
        assert_eq!(result.medoids.len(), 2);
        assert_eq!(result.assignments.len(), data.len());
        for &a in &result.assignments {
            assert!(a < 2, "UT-CLARA-08: assignment {} di luar rentang k=2", a);
        }
    }

    /// UT-CLARA-09: best_sample_index harus menunjuk ke entri yang benar di
    /// `samples[]` -- cost pada `samples[best_sample_index-1]` harus sama
    /// dengan total_cost akhir yang dilaporkan (konsistensi internal,
    /// bukan cuma "ada index-nya" tapi index-nya benar-benar cocok).
    #[test]
    fn test_clara_ut_clara_09_best_sample_index_is_consistent() {
        use crate::algorithms::clara::{run_clara, CLARAConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..25)
            .map(|i| vec![i as f64, (i % 5) as f64])
            .collect();
        let config = CLARAConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_samples: 5,
            sample_size: 10,
            max_iterations: 30,
            random_seed: Some(17),
            use_build_phase: true,
        };

        let result = run_clara(&data, &config).expect("CLARA gagal");

        assert!(
            result.best_sample_index >= 1 && result.best_sample_index <= result.samples.len(),
            "UT-CLARA-09: best_sample_index ({}) harus dalam rentang 1..={}",
            result.best_sample_index, result.samples.len()
        );

        let referenced_record = result
            .samples
            .iter()
            .find(|s| s.sample_index == result.best_sample_index)
            .expect("UT-CLARA-09: best_sample_index harus cocok dengan salah satu sample_index di samples[]");

        assert!(
            (referenced_record.cost - result.total_cost).abs() < 1e-9,
            "UT-CLARA-09: cost pada samples[best_sample_index-1] ({}) harus sama dengan total_cost akhir ({})",
            referenced_record.cost, result.total_cost
        );
    }

    // ── E. CLARANS algorithm tests ────────────────────────────────────────────

    /// UT-CLARANS-01: CLARANS harus mengembalikan tepat k medoid.
    #[test]
    fn test_clarans_ut_clarans_01_returns_k_medoids() {
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

    /// UT-CLARANS-02: Semua assignment dari CLARANS harus berada dalam rentang 0..k-1.
    #[test]
    fn test_clarans_ut_clarans_02_valid_assignments() {
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

    /// UT-CLARANS-03: Dengan seed yang sama, CLARANS harus menghasilkan
    /// medoid yang identik (deterministik).
    #[test]
    fn test_clarans_ut_clarans_03_deterministic_with_seed() {
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
        assert_eq!(r1.medoids, r2.medoids, "UT-CLARANS-03: CLARANS dengan seed sama harus deterministik");
    }

    /// UT-CLARANS-04: Jumlah local search yang dilaporkan (`local_searches`)
    /// harus sama persis dengan `config.num_local` -- membuktikan parameter
    /// "numlocal" dari algoritma CLARANS (Ng & Han) benar-benar dihormati.
    #[test]
    fn test_clarans_ut_clarans_04_local_searches_matches_num_local() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i / 5) as f64 * 20.0, (i % 5) as f64])
            .collect();
        let k = 3;
        let n = data.len();
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);
        config.num_local = 4;
        config.random_seed = Some(10);

        let result = run_clarans(&data, &config).expect("CLARANS gagal");
        assert_eq!(
            result.local_searches, 4,
            "UT-CLARANS-04: local_searches ({}) harus sama dengan config.num_local (4)",
            result.local_searches
        );
    }

    /// UT-CLARANS-05: max_neighbors=0 harus membuat local search berhenti
    /// SEBELUM mengevaluasi tetangga manapun (parameter "maxneighbor"
    /// dihormati sebagai batas ketat, bukan cuma saran). neighbors_checked
    /// harus tepat 0.
    #[test]
    fn test_clarans_ut_clarans_05_max_neighbors_zero_checks_nothing() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i / 5) as f64 * 20.0, (i % 5) as f64])
            .collect();
        let k = 3;
        let n = data.len();
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);
        config.max_neighbors = 0;
        config.num_local = 3;
        config.random_seed = Some(5);

        let result = run_clarans(&data, &config).expect("CLARANS gagal");
        assert_eq!(
            result.neighbors_checked, 0,
            "UT-CLARANS-05: max_neighbors=0 harus membuat neighbors_checked=0, dapat {}",
            result.neighbors_checked
        );
        // Tetap harus menghasilkan k medoid valid (medoid random awal, tanpa perbaikan).
        assert_eq!(result.medoids.len(), k);
    }

    /// UT-CLARANS-06: Edge case k == n harus DITOLAK oleh validasi input
    /// (bukan diproses sebagai trivial) -- CLARANS tidak punya kandidat
    /// non-medoid untuk swap kalau k==n, sehingga bisa infinite loop kalau
    /// tidak ditolak lebih dulu. Sekaligus membuktikan k terkecil yang VALID
    /// (k=n-1) tetap berjalan normal tanpa crash.
    ///
    /// CATATAN: `run_clarans` sendiri punya cabang `if k >= n { trivial }`
    /// di kode-nya, tapi cabang itu KODE MATI -- validate_clustering_input
    /// sudah menolak k==n maupun k>n lebih dulu, jadi cabang itu tidak
    /// pernah benar-benar tercapai lewat pemakaian normal.
    #[test]
    fn test_clarans_ut_clarans_06_k_equals_n_is_rejected() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = vec![vec![0.0, 0.0], vec![1.0, 1.0], vec![2.0, 2.0]];
        let n = data.len(); // 3

        // k == n harus ditolak.
        let config_invalid = CLARANSConfig::new(n, n, DistanceMetric::Euclidean);
        let result_invalid = run_clarans(&data, &config_invalid);
        assert!(
            result_invalid.is_err(),
            "UT-CLARANS-06: k==n harus ditolak validasi, bukan diproses"
        );

        // k = n-1 (nilai k terkecil yang valid) harus tetap berjalan normal.
        let k_valid = n - 1;
        let config_valid = CLARANSConfig::new(k_valid, n, DistanceMetric::Euclidean);
        let result_valid = run_clarans(&data, &config_valid).expect("CLARANS gagal pada k=n-1");
        assert_eq!(result_valid.medoids.len(), k_valid);
    }

    /// UT-CLARANS-07: CLARANS harus bekerja dengan metrik Manhattan (bukan
    /// cuma Euclidean) dan tetap menghasilkan output yang valid.
    #[test]
    fn test_clarans_ut_clarans_07_with_manhattan_metric() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i / 5) as f64 * 20.0, (i % 5) as f64])
            .collect();
        let k = 3;
        let n = data.len();
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Manhattan);
        config.random_seed = Some(8);

        let result = run_clarans(&data, &config).expect("CLARANS Manhattan gagal");
        assert_eq!(result.medoids.len(), k);
        assert_eq!(result.assignments.len(), data.len());
        for &a in &result.assignments {
            assert!(a < k, "UT-CLARANS-07: assignment {} di luar rentang k={}", a, k);
        }
    }

    /// UT-CLARANS-08: total_cost yang dilaporkan harus sama dengan hitung
    /// ulang independen atas SELURUH dataset memakai medoid hasil CLARANS
    /// (konsistensi internal, bukan cuma "ada angkanya").
    #[test]
    fn test_clarans_ut_clarans_08_total_cost_is_consistent() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::{euclidean_distance, DistanceMetric};

        let data: Vec<Vec<f64>> = (0..15)
            .map(|i| vec![(i / 5) as f64 * 20.0, (i % 5) as f64])
            .collect();
        let k = 3;
        let n = data.len();
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);
        config.random_seed = Some(21);

        let result = run_clarans(&data, &config).expect("CLARANS gagal");

        let recomputed_cost: f64 = (0..n)
            .map(|i| {
                result
                    .medoids
                    .iter()
                    .map(|&m| euclidean_distance(&data[i], &data[m]))
                    .fold(f64::INFINITY, f64::min)
            })
            .sum();

        assert!(
            (result.total_cost - recomputed_cost).abs() < 1e-9,
            "UT-CLARANS-08: total_cost dilaporkan ({}) harus sama dengan hitung ulang ({})",
            result.total_cost, recomputed_cost
        );
    }

    /// UT-CLARANS-09: Pada data yang terpisah jelas (2 gerombolan), hasil
    /// clustering harus mengisi kedua cluster (tidak ada cluster kosong) --
    /// membuktikan local search benar-benar menemukan struktur yang wajar,
    /// bukan cuma jalan tanpa validasi hasil.
    #[test]
    fn test_clarans_ut_clarans_09_no_empty_cluster_on_separated_data() {
        use crate::algorithms::clarans::{run_clarans, CLARANSConfig};
        use crate::utils::distance::DistanceMetric;

        let data: Vec<Vec<f64>> = vec![
            vec![0.0, 0.0], vec![0.1, 0.0], vec![0.0, 0.1], vec![0.1, 0.1], vec![0.05, 0.05],
            vec![50.0, 50.0], vec![50.1, 50.0], vec![50.0, 50.1], vec![50.1, 50.1], vec![50.05, 50.05],
        ];
        let n = data.len();
        let k = 2;
        let mut config = CLARANSConfig::new(k, n, DistanceMetric::Euclidean);
        config.random_seed = Some(2);
        config.num_local = 3;

        let result = run_clarans(&data, &config).expect("CLARANS gagal");

        let sizes: Vec<usize> = (0..k)
            .map(|c| result.assignments.iter().filter(|&&a| a == c).count())
            .collect();
        for (c, &sz) in sizes.iter().enumerate() {
            assert!(sz >= 1, "UT-CLARANS-09: cluster {} kosong pada data yang terpisah jelas", c);
        }
    }

    // ── F. Kualitas Cluster (Silhouette & WCSS) ─────────────────────────────

    /// UT-EVAL-01: Silhouette score pada data yang terpisah jelas (2 cluster
    /// jauh, masing-masing 2 titik) harus mendekati 1 (baik), dicocokkan ke
    /// nilai eksak hasil hitung tangan.
    /// data=[0,1,10,11] (1D), labels=[0,0,1,1].
    /// Titik 0: a=1 (jarak ke titik1), b=10.5 (rata2 ke {10,11}) -> (10.5-1)/10.5=19/21≈0.9048
    /// Titik 1: a=1, b=9.5 (rata2 ke {10,11} dari titik1: 9,10) -> 8.5/9.5=17/19≈0.8947
    /// Titik 2,3 simetris dengan titik 1,0.
    #[test]
    fn test_silhouette_ut_eval_01_well_separated_near_one() {
        let data = vec![vec![0.0], vec![1.0], vec![10.0], vec![11.0]];
        let labels = vec![0usize, 0, 1, 1];
        let n = data.len();
        let k = 2;

        let dist = crate::algorithms::pam::build_distance_matrix(&data, &DistanceMetric::Euclidean);
        let scores = crate::algorithms::pam::compute_silhouette_from_dist(&dist, &labels, n, k);

        let expected = [19.0 / 21.0, 17.0 / 19.0, 17.0 / 19.0, 19.0 / 21.0];
        for i in 0..n {
            assert!(
                (scores[i] - expected[i]).abs() < 1e-9,
                "UT-EVAL-01: titik {} diharapkan {}, dapat {}",
                i, expected[i], scores[i]
            );
            assert!(scores[i] > 0.8, "UT-EVAL-01: titik {} harus >0.8 (baik), dapat {}", i, scores[i]);
        }
    }

    /// UT-EVAL-02: Silhouette rata-rata pada cluster dengan pemisahan BURUK
    /// (titik yang berdekatan sengaja dipisah ke cluster berbeda) harus
    /// mendekati 0 atau negatif -- kebalikan dari UT-EVAL-01.
    /// data=[0,1,2,3], labels=[0,1,1,0] (endpoint disatukan, tengah disatukan
    /// -- struktur spasial dan label tidak selaras).
    #[test]
    fn test_silhouette_ut_eval_02_poor_separation_near_zero_or_negative() {
        let data = vec![vec![0.0], vec![1.0], vec![2.0], vec![3.0]];
        let labels = vec![0usize, 1, 1, 0];
        let n = data.len();
        let k = 2;

        let dist = crate::algorithms::pam::build_distance_matrix(&data, &DistanceMetric::Euclidean);
        let scores = crate::algorithms::pam::compute_silhouette_from_dist(&dist, &labels, n, k);

        // Titik 0 & 3 (endpoint, satu cluster tapi berjauhan) harus negatif.
        assert!(scores[0] < 0.0, "UT-EVAL-02: titik 0 harus negatif, dapat {}", scores[0]);
        assert!(scores[3] < 0.0, "UT-EVAL-02: titik 3 harus negatif, dapat {}", scores[3]);

        let avg: f64 = scores.iter().sum::<f64>() / n as f64;
        assert!(
            avg < 0.1,
            "UT-EVAL-02: rata-rata silhouette harus mendekati 0/negatif pada pemisahan buruk, dapat {}",
            avg
        );
        // Kontras eksplisit dengan UT-EVAL-01 (~0.9) -- pemisahan buruk harus jauh lebih rendah.
        assert!(avg < 0.9 - 0.5, "UT-EVAL-02: rata-rata harus jauh di bawah kasus terpisah jelas");
    }

    /// UT-EVAL-03: Cluster beranggota 1 titik -> silhouette tidak terdefinisi,
    /// harus default 0 (bukan NaN/panic karena pembagian oleh (len-1)=0).
    #[test]
    fn test_silhouette_ut_eval_03_single_element_cluster_defaults_zero() {
        let data = vec![vec![0.0], vec![1.0], vec![2.0]];
        let labels = vec![0usize, 1, 1]; // cluster 0 cuma titik ke-0
        let n = data.len();
        let k = 2;

        let dist = crate::algorithms::pam::build_distance_matrix(&data, &DistanceMetric::Euclidean);
        let scores = crate::algorithms::pam::compute_silhouette_from_dist(&dist, &labels, n, k);

        assert_eq!(scores[0], 0.0, "UT-EVAL-03: cluster 1 anggota harus default 0, bukan NaN");
        assert!(scores[0].is_finite(), "UT-EVAL-03: tidak boleh NaN/Inf");
    }

    /// UT-EVAL-04: k<=1 -> seluruh silhouette score harus 0 (tidak terdefinisi
    /// tanpa cluster pembanding), bukan crash.
    #[test]
    fn test_silhouette_ut_eval_04_k_one_returns_all_zero() {
        let data = vec![vec![0.0], vec![1.0], vec![2.0]];
        let labels = vec![0usize, 0, 0];
        let n = data.len();

        let dist = crate::algorithms::pam::build_distance_matrix(&data, &DistanceMetric::Euclidean);
        let scores = crate::algorithms::pam::compute_silhouette_from_dist(&dist, &labels, n, 1);

        assert_eq!(scores, vec![0.0, 0.0, 0.0], "UT-EVAL-04: k=1 harus menghasilkan semua skor 0");
    }

    /// UT-EVAL-05: WCSS (Euclidean) pada dataset dengan nilai yang bisa
    /// dihitung tangan. data=[(0,0),(2,0),(10,0),(12,0)], labels=[0,0,1,1],
    /// medoids=[0,2]. Jarak: 0,2,0,2 -> kuadrat dijumlah = 0+4+0+4=8.
    #[test]
    fn test_wcss_ut_eval_05_euclidean_known_value() {
        use crate::utils::distance::compute_wcss;

        let data = vec![vec![0.0, 0.0], vec![2.0, 0.0], vec![10.0, 0.0], vec![12.0, 0.0]];
        let labels = vec![0usize, 0, 1, 1];
        let medoid_indices = vec![0usize, 2];

        let wcss = compute_wcss(&data, &labels, &medoid_indices, &DistanceMetric::Euclidean);
        assert!((wcss - 8.0).abs() < 1e-10, "UT-EVAL-05: diharapkan 8.0, dapat {}", wcss);
    }

    /// UT-EVAL-06: WCSS (Manhattan) dataset sama seperti UT-EVAL-05. Jarak
    /// tidak dikuadratkan untuk Manhattan: 0+2+0+2=4.
    #[test]
    fn test_wcss_ut_eval_06_manhattan_known_value() {
        use crate::utils::distance::compute_wcss;

        let data = vec![vec![0.0, 0.0], vec![2.0, 0.0], vec![10.0, 0.0], vec![12.0, 0.0]];
        let labels = vec![0usize, 0, 1, 1];
        let medoid_indices = vec![0usize, 2];

        let wcss = compute_wcss(&data, &labels, &medoid_indices, &DistanceMetric::Manhattan);
        assert!((wcss - 4.0).abs() < 1e-10, "UT-EVAL-06: diharapkan 4.0, dapat {}", wcss);
    }

    /// UT-EVAL-07: WCSS harus 0 kalau setiap titik adalah medoidnya sendiri
    /// (jarak ke medoid = 0 untuk semua titik).
    #[test]
    fn test_wcss_ut_eval_07_zero_when_points_are_own_medoids() {
        use crate::utils::distance::compute_wcss;

        let data = vec![vec![1.0, 1.0], vec![5.0, 5.0]];
        let labels = vec![0usize, 1];
        let medoid_indices = vec![0usize, 1];

        let wcss = compute_wcss(&data, &labels, &medoid_indices, &DistanceMetric::Euclidean);
        assert_eq!(wcss, 0.0, "UT-EVAL-07: WCSS harus 0 ketika semua titik adalah medoidnya sendiri");
    }

    /// UT-EVAL-08: WCSS tidak boleh NAIK ketika k bertambah (properti dasar
    /// metode Elbow) -- menambah medoid hanya bisa memperkecil atau
    /// mempertahankan total jarak, karena tiap titik selalu memilih medoid
    /// TERDEKAT di antara pilihan yang makin banyak.
    #[test]
    fn test_wcss_ut_eval_08_non_increasing_as_k_grows() {
        use crate::utils::distance::compute_wcss;

        let data = vec![
            vec![0.0, 0.0], vec![1.0, 0.0], vec![5.0, 0.0], vec![6.0, 0.0],
            vec![20.0, 0.0], vec![21.0, 0.0], vec![40.0, 0.0], vec![41.0, 0.0],
        ];

        // k=2: medoid di titik 0 dan titik 4 (tengah dataset).
        let labels_k2 = vec![0usize, 0, 0, 0, 1, 1, 1, 1];
        let medoids_k2 = vec![0usize, 4];
        let wcss_k2 = compute_wcss(&data, &labels_k2, &medoids_k2, &DistanceMetric::Euclidean);

        // k=4: tambah medoid di titik 2 dan titik 6 -> tiap titik makin dekat ke medoidnya.
        let labels_k4 = vec![0usize, 0, 1, 1, 2, 2, 3, 3];
        let medoids_k4 = vec![0usize, 2, 4, 6];
        let wcss_k4 = compute_wcss(&data, &labels_k4, &medoids_k4, &DistanceMetric::Euclidean);

        assert!(
            wcss_k4 <= wcss_k2 + 1e-9,
            "UT-EVAL-08: WCSS k=4 ({}) tidak boleh lebih besar dari k=2 ({})",
            wcss_k4, wcss_k2
        );
        assert!(wcss_k4 < wcss_k2, "UT-EVAL-08: WCSS k=4 harus strictly lebih kecil (medoid lebih dekat)");
    }
}
