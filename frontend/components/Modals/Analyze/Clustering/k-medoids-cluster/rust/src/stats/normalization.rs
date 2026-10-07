/// Metode normalisasi/standardisasi data.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NormalizationMethod {
    /// Z-score: (x - mean) / std_dev
    ZScore,
    /// Min-Max: (x - min) / (max - min)
    MinMax,
    /// Min-Max ke rentang [a, b]
    MinMaxRange(f64, f64),
    /// Robust scaling dengan median dan IQR (tahan terhadap outlier)
    Robust,
    /// Tanpa normalisasi
    None,
}

impl NormalizationMethod {
    /// Mengubah nama metode ("zscore" | "minmax" | selain itu -> None) menjadi
    /// varian yang sesuai, tanpa membedakan huruf besar/kecil. Ini satu-satunya
    /// logika pemilihan yang dipakai `wasm::standardize_data`, sehingga bisa
    /// di-unit-test tanpa melewati batas JsValue/WASM.
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "zscore" => NormalizationMethod::ZScore,
            "minmax" => NormalizationMethod::MinMax,
            _ => NormalizationMethod::None,
        }
    }
}

/// Statistik untuk satu fitur/variabel.
#[derive(Debug, Clone)]
pub struct FeatureStatistics {
    pub mean: f64,
    pub std_dev: f64,
    pub min: f64,
    pub max: f64,
    pub median: f64,
    pub q1: f64,
    pub q3: f64,
    pub iqr: f64,
}

/// Menghitung statistik untuk setiap fitur. Nilai NaN/infinite diabaikan.
pub fn calculate_feature_statistics(data: &[Vec<f64>]) -> Vec<FeatureStatistics> {
    if data.is_empty() {
        return vec![];
    }

    let n_features = data[0].len();
    let mut stats = Vec::with_capacity(n_features);

    for feature_idx in 0..n_features {
        let mut values: Vec<f64> = data
            .iter()
            .map(|row| row[feature_idx])
            .filter(|v| v.is_finite())
            .collect();

        if values.is_empty() {
            // Semua nilai tidak valid, pakai nilai default
            stats.push(FeatureStatistics {
                mean: 0.0,
                std_dev: 1.0,
                min: 0.0,
                max: 1.0,
                median: 0.0,
                q1: 0.0,
                q3: 1.0,
                iqr: 1.0,
            });
            continue;
        }

        values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let n = values.len();
        let mean = values.iter().sum::<f64>() / n as f64;
        // Varians sampel (pembagi n-1), sama dengan scale() di R dan
        // standardizeZScore() versi TypeScript yang digantikan.
        let variance = if n > 1 {
            values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / (n - 1) as f64
        } else {
            0.0
        };
        let std_dev = variance.sqrt();

        let min = values[0];
        let max = values[n - 1];
        let median = calculate_percentile(&values, 50.0);
        let q1 = calculate_percentile(&values, 25.0);
        let q3 = calculate_percentile(&values, 75.0);
        let iqr = q3 - q1;

        stats.push(FeatureStatistics {
            mean,
            // Hindari pembagian dengan nol
            std_dev: if std_dev > 1e-10 { std_dev } else { 1.0 },
            min,
            max,
            median,
            q1,
            q3,
            iqr: if iqr > 1e-10 { iqr } else { 1.0 },
        });
    }

    stats
}

/// Menghitung persentil dari nilai yang sudah terurut (interpolasi linear).
fn calculate_percentile(sorted_values: &[f64], percentile: f64) -> f64 {
    if sorted_values.is_empty() {
        return 0.0;
    }
    
    let n = sorted_values.len();
    let rank = (percentile / 100.0) * (n - 1) as f64;
    let lower_idx = rank.floor() as usize;
    let upper_idx = rank.ceil() as usize;
    
    if lower_idx == upper_idx {
        sorted_values[lower_idx]
    } else {
        let weight = rank - lower_idx as f64;
        sorted_values[lower_idx] * (1.0 - weight) + sorted_values[upper_idx] * weight
    }
}

/// Menormalisasi data dengan metode tertentu; mengembalikan data dan statistiknya.
pub fn normalize_data(
    data: &[Vec<f64>],
    method: NormalizationMethod,
) -> (Vec<Vec<f64>>, Vec<FeatureStatistics>) {
    let stats = calculate_feature_statistics(data);
    let normalized = normalize_with_statistics(data, &stats, method);
    (normalized, stats)
}

/// Menormalisasi data memakai statistik yang sudah dihitung sebelumnya.
/// Nilai tidak valid (NaN/infinite) diganti 0.
pub fn normalize_with_statistics(
    data: &[Vec<f64>],
    stats: &[FeatureStatistics],
    method: NormalizationMethod,
) -> Vec<Vec<f64>> {
    if data.is_empty() {
        return vec![];
    }

    match method {
        NormalizationMethod::None => data.to_vec(),
        _ => {
            data.iter()
                .map(|row| {
                    row.iter()
                        .enumerate()
                        .map(|(idx, &value)| {
                            if !value.is_finite() {
                                return 0.0;
                            }
                            
                            let stat = &stats[idx];
                            
                            match method {
                                NormalizationMethod::ZScore => {
                                    (value - stat.mean) / stat.std_dev
                                }
                                NormalizationMethod::MinMax => {
                                    let range = stat.max - stat.min;
                                    if range > 1e-10 {
                                        (value - stat.min) / range
                                    } else {
                                        // Semua nilai sama, petakan ke tengah
                                        0.5
                                    }
                                }
                                NormalizationMethod::MinMaxRange(a, b) => {
                                    let range = stat.max - stat.min;
                                    if range > 1e-10 {
                                        a + (value - stat.min) * (b - a) / range
                                    } else {
                                        (a + b) / 2.0
                                    }
                                }
                                NormalizationMethod::Robust => {
                                    (value - stat.median) / stat.iqr
                                }
                                NormalizationMethod::None => value,
                            }
                        })
                        .collect()
                })
                .collect()
        }
    }
}

/// Mengembalikan satu nilai ternormalisasi ke skala aslinya.
pub fn denormalize_value(
    normalized_value: f64,
    stat: &FeatureStatistics,
    method: NormalizationMethod,
) -> f64 {
    match method {
        NormalizationMethod::None => normalized_value,
        NormalizationMethod::ZScore => {
            normalized_value * stat.std_dev + stat.mean
        }
        NormalizationMethod::MinMax => {
            normalized_value * (stat.max - stat.min) + stat.min
        }
        NormalizationMethod::MinMaxRange(a, b) => {
            (normalized_value - a) * (stat.max - stat.min) / (b - a) + stat.min
        }
        NormalizationMethod::Robust => {
            normalized_value * stat.iqr + stat.median
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zscore_normalization() {
        let data = vec![
            vec![1.0, 10.0],
            vec![2.0, 20.0],
            vec![3.0, 30.0],
            vec![4.0, 40.0],
            vec![5.0, 50.0],
        ];

        let (_normalized, stats) = normalize_data(&data, NormalizationMethod::ZScore);

        for col in 0..2 {
            let mean: f64 = _normalized.iter().map(|row| row[col]).sum::<f64>() / 5.0;
            assert!((mean).abs() < 1e-10, "Mean should be ~0, got {}", mean);
        }

        assert!((stats[0].mean - 3.0).abs() < 1e-10);
        assert!((stats[1].mean - 30.0).abs() < 1e-10);
    }

    #[test]
    fn test_minmax_normalization() {
        let data = vec![
            vec![0.0, 10.0],
            vec![5.0, 20.0],
            vec![10.0, 30.0],
        ];

        let (normalized, _) = normalize_data(&data, NormalizationMethod::MinMax);

        for row in &normalized {
            for &val in row {
                assert!(val >= 0.0 && val <= 1.0, "Value {} should be in [0,1]", val);
            }
        }

        assert_eq!(normalized[0][0], 0.0);
        assert_eq!(normalized[2][0], 1.0);
    }

    #[test]
    fn test_robust_normalization() {
        let data = vec![
            vec![1.0],
            vec![2.0],
            vec![3.0],
            vec![4.0],
            vec![100.0], // outlier
        ];

        let (_normalized, stats) = normalize_data(&data, NormalizationMethod::Robust);

        // Median dan IQR tidak terpengaruh outlier
        assert_eq!(stats[0].median, 3.0);
        assert!((stats[0].iqr - 2.0).abs() < 1e-10);
    }

    /// Setelah Z-score, simpangan baku SAMPEL (n-1) setiap kolom harus ≈ 1.
    /// (Bukan simpangan baku populasi — lihat catatan pada calculate_feature_statistics.)
    #[test]
    fn test_zscore_std_approximately_one() {
        let data = vec![
            vec![2.0, 10.0],
            vec![4.0, 20.0],
            vec![6.0, 30.0],
            vec![8.0, 40.0],
            vec![10.0, 50.0],
        ];
        let (normalized, _) = normalize_data(&data, NormalizationMethod::ZScore);

        for col in 0..2 {
            let values: Vec<f64> = normalized.iter().map(|row| row[col]).collect();
            let mean = values.iter().sum::<f64>() / values.len() as f64;
            let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / (values.len() - 1) as f64;
            let std = variance.sqrt();
            assert!(
                (std - 1.0).abs() < 1e-10,
                "kolom {} std sampel harus 1.0 setelah Z-score, dapat {}",
                col, std
            );
        }
    }

    /// MinMaxRange(a, b) harus memetakan nilai minimum ke a dan maksimum ke b.
    #[test]
    fn test_minmax_range_custom_bounds() {
        let data = vec![vec![0.0], vec![5.0], vec![10.0]];
        let (normalized, _) = normalize_data(&data, NormalizationMethod::MinMaxRange(0.0, 100.0));

        assert!((normalized[0][0] - 0.0).abs() < 1e-10, "min harus dipetakan ke 0");
        assert!((normalized[2][0] - 100.0).abs() < 1e-10, "max harus dipetakan ke 100");
        assert!((normalized[1][0] - 50.0).abs() < 1e-10, "titik tengah harus dipetakan ke 50");
    }

    /// Kolom konstan (semua nilai sama) dengan MinMax harus dipetakan ke 0.5.
    #[test]
    fn test_normalize_constant_column_minmax() {
        let data = vec![vec![7.0], vec![7.0], vec![7.0]];
        let (normalized, _) = normalize_data(&data, NormalizationMethod::MinMax);

        for row in &normalized {
            assert!(
                (row[0] - 0.5).abs() < 1e-10,
                "kolom konstan harus dipetakan ke 0.5, dapat {}",
                row[0]
            );
        }
    }

    /// Z-score normalize lalu denormalize harus mengembalikan nilai asli (round-trip).
    #[test]
    fn test_denormalize_zscore_roundtrip() {
        let data = vec![
            vec![3.0, 15.0],
            vec![6.0, 30.0],
            vec![9.0, 45.0],
        ];
        let (normalized, stats) = normalize_data(&data, NormalizationMethod::ZScore);

        let original = data[0][0];
        let roundtrip = denormalize_value(normalized[0][0], &stats[0], NormalizationMethod::ZScore);
        assert!(
            (roundtrip - original).abs() < 1e-10,
            "ZScore round-trip gagal: diharapkan {}, dapat {}",
            original, roundtrip
        );
    }

    /// MinMax normalize lalu denormalize harus mengembalikan nilai asli (round-trip).
    #[test]
    fn test_denormalize_minmax_roundtrip() {
        let data = vec![
            vec![2.0, 100.0],
            vec![5.0, 200.0],
            vec![8.0, 300.0],
        ];
        let (normalized, stats) = normalize_data(&data, NormalizationMethod::MinMax);

        let original = data[1][1];
        let roundtrip = denormalize_value(normalized[1][1], &stats[1], NormalizationMethod::MinMax);
        assert!(
            (roundtrip - original).abs() < 1e-10,
            "MinMax round-trip gagal: diharapkan {}, dapat {}",
            original, roundtrip
        );
    }
}