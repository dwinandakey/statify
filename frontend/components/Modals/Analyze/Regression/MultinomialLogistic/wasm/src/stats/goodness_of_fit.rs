use crate::models::config::MultinomialConfig;
use crate::models::result::GoodnessOfFit;
use crate::stats::core::PrimaryResults;
use crate::stats::probabilities::compute_probs_with_offset;
use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};
use std::collections::HashMap;

/// Hitung Goodness-of-Fit Tests sesuai spesifikasi SPSS.
///
/// SPSS menggunakan formula berbasis subpopulasi (pola kovariat unik):
///   Pearson: chi2 = sum_i sum_j (n_ij - n_i*pi_ij)^2 / (n_i*pi_ij)
///   Deviance: D = 2 * sum_i sum_j n_ij * log(n_ij / (n_i*pi_ij))
///   df = m*(J-1) - (J-1)*p  dimana m = jumlah pola kovariat unik
pub fn calculate_goodness_of_fit(
    x: &DMatrix<f64>,
    beta: &DVector<f64>,
    primary: &PrimaryResults,
    config: &MultinomialConfig,
) -> GoodnessOfFit {
    let n = primary.n_cases;
    let j_count = primary.n_categories;
    let p = primary.n_params;
    let ref_idx = primary.reference_index;

    // Resolve columns used to define subpopulation patterns.
    // SPSS-like behavior:
    // - default: all model predictors (factors+covariates)
    // - variable list mode: selected predictors only
    let mut subpop_columns: Vec<usize> = match config.subpopulation_mode.as_deref() {
        Some("variableList") => config
            .subpopulation_columns
            .clone()
            .unwrap_or_default()
            .into_iter()
            .map(|idx| idx as usize)
            .map(|idx| {
                if config.include_intercept {
                    idx + 1
                } else {
                    idx
                }
            })
            .filter(|idx| *idx < x.ncols())
            .collect(),
        _ => (0..x.ncols())
            .filter(|idx| !(config.include_intercept && *idx == 0))
            .collect(),
    };

    subpop_columns.sort_unstable();
    subpop_columns.dedup();
    if subpop_columns.is_empty() {
        subpop_columns = (0..x.ncols())
            .filter(|idx| !(config.include_intercept && *idx == 0))
            .collect();
    }

    let canonical_bits = |value: f64| {
        if value == 0.0 {
            0_u64
        } else {
            value.to_bits()
        }
    };

    // --- Agregasi observasi berdasarkan pola kovariat unik ---
    // Key: nilai kovariat subpopulasi persis (bit-level) agar tidak terjadi penggabungan pola palsu.
    // Value: (n_i total, observed count per kategori, expected count per kategori)
    let mut pattern_map: HashMap<Vec<u64>, (f64, Vec<f64>, Vec<f64>)> = HashMap::new();

    for i in 0..n {
        let weight = primary.weights.get(i).copied().unwrap_or(1.0);
        if !weight.is_finite() || weight <= 0.0 {
            continue;
        }

        let probs = compute_probs_with_offset(x, beta, i, j_count, p, ref_idx);

        let key: Vec<u64> = subpop_columns
            .iter()
            .map(|&j| canonical_bits(x[(i, j)]))
            .collect();
        let obs_cat = primary.y_categories[i];
        let obs_idx = primary
            .category_map
            .iter()
            .position(|&c| c == obs_cat)
            .unwrap();
        let entry = pattern_map
            .entry(key)
            .or_insert((0.0, vec![0.0; j_count], vec![0.0; j_count]));
        entry.0 += weight;
        entry.1[obs_idx] += weight;
        for (j, prob) in probs.iter().enumerate() {
            entry.2[j] += weight * prob;
        }
    }

    let mut pearson_chi2 = 0.0;
    let mut deviance = 0.0;

    for (_, (_n_i, observed_counts, expected_counts)) in &pattern_map {
        // Pearson: sum_j (n_ij - n_i*pi_ij)^2 / (n_i*pi_ij)
        for j in 0..j_count {
            let expected = expected_counts[j];
            if expected > 1e-10 {
                let obs = observed_counts[j];
                pearson_chi2 += (obs - expected).powi(2) / expected;
            }
        }

        // Deviance: 2 * sum_j n_ij * log(n_ij / (n_i*pi_ij))
        for j in 0..j_count {
            let obs = observed_counts[j];
            let expected = expected_counts[j];
            if obs > 1e-10 && expected > 1e-10 {
                deviance += 2.0 * obs * (obs / expected).ln();
            }
        }
    }

    // df = m*(J-1) - (J-1)*p, dimana m = jumlah pola kovariat unik
    let m = pattern_map.len();
    let df = (m * (j_count - 1)).saturating_sub((j_count - 1) * p);
    let df_val = df.max(1) as f64;

    let chi_dist = ChiSquared::new(df_val).unwrap();
    let pearson_p = 1.0 - chi_dist.cdf(pearson_chi2);
    let deviance_p = 1.0 - chi_dist.cdf(deviance);

    GoodnessOfFit {
        pearson_chi_square: pearson_chi2,
        pearson_df: df as u32,
        pearson_p_value: pearson_p,
        deviance,
        deviance_df: df as u32,
        deviance_p_value: deviance_p,
    }
}
