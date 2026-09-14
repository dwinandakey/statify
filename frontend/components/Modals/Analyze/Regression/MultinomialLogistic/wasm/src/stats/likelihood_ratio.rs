use crate::models::config::MultinomialConfig;
use crate::models::result::LikelihoodRatioTest;
use crate::stats::core::PrimaryResults;
use crate::stats::log_likelihood::calculate_ll;
use crate::stats::newton_raphson::run_newton_raphson_internal;
use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};

/// Hitung Likelihood Ratio Tests untuk setiap variabel.
/// Parameter `full_ll` adalah LL model penuh yang sudah dihitung sebelumnya.
pub fn calculate_likelihood_ratio_tests(
    X: &DMatrix<f64>,
    primary: &PrimaryResults,
    config: &MultinomialConfig,
    _full_beta: &DVector<f64>,
    full_ll: f64,
) -> Vec<LikelihoodRatioTest> {
    let mut tests = Vec::new();
    let p = primary.n_params;
    let J = primary.n_categories;
    let j_minus_1 = (J.saturating_sub(1)) as u32;

    if p == 0 || J < 2 {
        return tests;
    }

    let full_neg2ll = -2.0 * full_ll;
    let k_full = (J - 1) * p;
    let n_eff = primary.weights.iter().copied().sum::<f64>().max(1.0);

    // Group columns by SPSS-like effect names:
    // - "Intercept" remains its own effect.
    // - Continuous covariates stay as-is.
    let mut grouped_effects: Vec<(String, Vec<usize>)> = Vec::new();
    for var_idx in 0..p {
        let raw_name = primary
            .variable_names
            .get(var_idx)
            .cloned()
            .unwrap_or_else(|| format!("X{}", var_idx));
        let effect_name = if raw_name == "Intercept" {
            "Intercept".to_string()
        } else if let Some((base, _)) = raw_name.split_once('=') {
            base.trim().to_string()
        } else {
            raw_name
        };

        if let Some((_, idxs)) = grouped_effects
            .iter_mut()
            .find(|(name, _)| *name == effect_name)
        {
            idxs.push(var_idx);
        } else {
            grouped_effects.push((effect_name, vec![var_idx]));
        }
    }

    for (effect_name, remove_indices) in grouped_effects {
        if effect_name == "Intercept" {
            tests.push(LikelihoodRatioTest {
                effect: effect_name,
                aic_reduced: full_neg2ll + 2.0 * (k_full as f64),
                bic_reduced: full_neg2ll + n_eff.ln() * (k_full as f64),
                neg2_log_likelihood_reduced: full_neg2ll,
                chi_square: 0.0,
                df: 0,
                p_value: f64::NAN,
                equivalent_to_final: true,
            });
            continue;
        }

        // Buat reduced design matrix (hapus kolom var_idx)
        let mut reduced_elements = Vec::new();
        for i in 0..primary.n_cases {
            for j in 0..p {
                if !remove_indices.contains(&j) {
                    reduced_elements.push(X[(i, j)]);
                }
            }
        }

        let removed_count = remove_indices.len();
        let reduced_cols = p.saturating_sub(removed_count);
        if reduced_cols == 0 {
            continue;
        }

        let reduced_X = DMatrix::from_row_slice(primary.n_cases, reduced_cols, &reduced_elements);

        let reduced_primary = PrimaryResults {
            design_matrix: reduced_X.clone(),
            y_categories: primary.y_categories.clone(),
            category_map: primary.category_map.clone(),
            reference_index: primary.reference_index,
            n_cases: primary.n_cases,
            n_params: reduced_cols,
            n_categories: J,
            weights: primary.weights.clone(),
            variable_names: primary.variable_names.clone(),
            stepwise_trace: Vec::new(),
        };

        let reduced_ll = match run_newton_raphson_internal(&reduced_X, &reduced_primary, config) {
            Ok((beta, _, _, _)) => calculate_ll(
                &reduced_X,
                &beta,
                &primary.y_categories,
                &primary.category_map,
                &primary.weights,
                primary.reference_index,
                reduced_cols,
            ),
            Err(_) => continue,
        };

        // LR statistic: -2(LL_reduced - LL_full)
        let lr_chi2 = (-2.0 * (reduced_ll - full_ll)).max(0.0);

        if lr_chi2.is_nan() || lr_chi2.is_infinite() {
            continue;
        }

        let df = j_minus_1;
        let p_value = if df == 0 {
            f64::NAN
        } else {
            let chi_dist = ChiSquared::new(df as f64).unwrap();
            1.0 - chi_dist.cdf(lr_chi2)
        };

        let k_reduced = (J - 1) * reduced_cols;
        let neg2ll_reduced = -2.0 * reduced_ll;
        let aic_reduced = neg2ll_reduced + 2.0 * (k_reduced as f64);
        let bic_reduced = neg2ll_reduced + n_eff.ln() * (k_reduced as f64);

        tests.push(LikelihoodRatioTest {
            effect: effect_name,
            aic_reduced,
            bic_reduced,
            neg2_log_likelihood_reduced: neg2ll_reduced,
            chi_square: lr_chi2,
            df,
            p_value,
            equivalent_to_final: false,
        });
    }

    tests
}
