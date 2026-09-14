use std::collections::HashMap;

use crate::{
    models::{
        config::{ MultivariateConfig, VarianceMode },
        data::AnalysisData,
        result::{ MultivariateTestEntry, MultivariateTests },
    },
    stats::core::get_factor_levels,
};

use super::{
    common::{
        calculate_f_significance,
        compute_per_group_covariances,
        generate_interaction_terms,
        matrix_inverse,
        matrix_multiply,
    },
    core::{ data_value_to_string, extract_dependent_value, parse_interaction_term },
};
use nalgebra::DMatrix;

/// Calculate multivariate tests for each effect in the model
/// Multivariate tests examine effects across all dependent variables simultaneously
pub fn calculate_multivariate_tests(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<MultivariateTests, String> {
    // Check if there are any dependent variables
    if config.main.dep_var.is_none() || config.main.dep_var.as_ref().unwrap().is_empty() {
        return Err("No dependent variables specified".to_string());
    }

    // Need at least 2 dependent variables for multivariate tests
    let dependent_vars = config.main.dep_var.as_ref().unwrap();
    if dependent_vars.len() < 2 {
        return Err("Need at least 2 dependent variables for multivariate tests".to_string());
    }

    // Get factors and initialize effects HashMap
    let factors = config.main.fix_factor.as_ref().map_or(Vec::new(), |f| f.clone());
    let mut effects = HashMap::new();

    // Default alpha value
    let alpha = config.options.sig_level.unwrap_or(0.05);

    // Extract values for all dependent variables, row-aligned via merged records.
    // This ensures all_values[dv_i][row_idx] corresponds to the same physical row
    // across DVs, factors, and covariates.
    let merged_for_values = super::common::merge_records(data);
    let mut all_values: Vec<Vec<f64>> = Vec::new();
    for dep_var in dependent_vars {
        let mut values = Vec::new();
        for record in &merged_for_values {
            if let Some(value) = extract_dependent_value(record, dep_var) {
                values.push(value);
            }
        }
        all_values.push(values);
    }

    // Calculate SSCP matrices for hypothesis and error
    // Calculate H and E matrices for each effect

    // 1. Calculate SSCP matrices for intercept (overall model)
    let (h_matrix, e_matrix, hypothesis_df, error_df) = match
        calculate_hypothesis_error_matrices(
            data,
            config,
            "Intercept",
            dependent_vars,
            &all_values,
            None
        )
    {
        Ok(result) => result,
        Err(e) => {
            return Err(format!("Failed to calculate matrices for intercept: {}", e));
        }
    };

    // Calculate multivariate test statistics for intercept
    let intercept_tests = match
        calculate_multivariate_test_statistics(
            &h_matrix,
            &e_matrix,
            hypothesis_df,
            error_df,
            alpha,
            dependent_vars.len()
        )
    {
        Ok(tests) => tests,
        Err(e) => {
            return Err(format!("Failed to calculate test statistics for intercept: {}", e));
        }
    };

    effects.insert("Intercept".to_string(), intercept_tests);

    // 2. Calculate multivariate test statistics for each main effect (factor)
    for factor in &factors {
        let (h_matrix, e_matrix, hypothesis_df, error_df) = match
            calculate_hypothesis_error_matrices(
                data,
                config,
                factor,
                dependent_vars,
                &all_values,
                None
            )
        {
            Ok(result) => result,
            Err(e) => {
                return Err(format!("Failed to calculate matrices for factor {}: {}", factor, e));
            }
        };

        let factor_tests = match
            calculate_multivariate_test_statistics(
                &h_matrix,
                &e_matrix,
                hypothesis_df,
                error_df,
                alpha,
                dependent_vars.len()
            )
        {
            Ok(tests) => tests,
            Err(e) => {
                return Err(
                    format!("Failed to calculate test statistics for factor {}: {}", factor, e)
                );
            }
        };

        effects.insert(factor.clone(), factor_tests);
    }

    // 3. Calculate multivariate test statistics for interactions (if multiple factors)
    if factors.len() > 1 {
        let interaction_terms = generate_interaction_terms(&factors);

        for term in interaction_terms {
            let term_factors: Vec<String> = parse_interaction_term(&term);

            let (h_matrix, e_matrix, hypothesis_df, error_df) = match
                calculate_hypothesis_error_matrices(
                    data,
                    config,
                    &term,
                    dependent_vars,
                    &all_values,
                    Some(&term_factors)
                )
            {
                Ok(result) => result,
                Err(e) => {
                    return Err(
                        format!("Failed to calculate matrices for interaction {}: {}", term, e)
                    );
                }
            };

            let interaction_tests = match
                calculate_multivariate_test_statistics(
                    &h_matrix,
                    &e_matrix,
                    hypothesis_df,
                    error_df,
                    alpha,
                    dependent_vars.len()
                )
            {
                Ok(tests) => tests,
                Err(e) => {
                    return Err(
                        format!(
                            "Failed to calculate test statistics for interaction {}: {}",
                            term,
                            e
                        )
                    );
                }
            };

            effects.insert(term.clone(), interaction_tests);
        }
    }

    // Welch-Satterthwaite override for two-sample Hotelling T². Activates
    // only when the design has exactly one Fixed Factor with two levels and
    // the user opted in via VarianceMode::Welch. We replace the pooled-SSCP
    // entry for that factor while leaving Intercept and other effects
    // untouched.
    if config.main.variance_mode == VarianceMode::Welch {
        if factors.len() != 1 {
            return Err(format!(
                "VarianceMode = Welch requires exactly one Fixed Factor; got {}.",
                factors.len()
            ));
        }
        let factor = &factors[0];
        let levels = get_factor_levels(data, factor)?;
        if levels.len() != 2 {
            return Err(format!(
                "VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '{}' has {}.",
                factor,
                levels.len()
            ));
        }
        let welch_tests = calculate_welch_two_sample_t2(data, config, factor)?;
        effects.insert(factor.clone(), welch_tests);
    }

    // Create the final result
    let design_note = if config.main.variance_mode == VarianceMode::Welch {
        Some(format!(
            "Type {:?} sum of squares (Welch-Satterthwaite for {})",
            &config.model.sum_of_square_method,
            config
                .main
                .fix_factor
                .as_ref()
                .and_then(|v| v.first())
                .cloned()
                .unwrap_or_default()
        ))
    } else {
        Some(format!("Type {:?} sum of squares", &config.model.sum_of_square_method))
    };

    Ok(MultivariateTests {
        effects,
        design: design_note,
        alpha: Some(alpha),
    })
}

/// Hotelling T² two-sample test with unequal covariance matrices, using the
/// Krishnamoorthy-Yu (2004) multivariate Welch-Satterthwaite approximation.
///
///   V       = S₁/n₁ + S₂/n₂
///   d       = x̄₁ − x̄₂
///   T²      = dᵀ V⁻¹ d
///   1/ν     = Σ_{i=1,2} [1/(n_i − 1)] · {tr((Vᵢ V⁻¹)²) + (tr(Vᵢ V⁻¹))²} / (p² + p)
///   F       = ((ν − p + 1)/(p ν)) · T²   ~   F(p, ν − p + 1)
///
/// Returns the single Hotelling's Trace entry — Pillai/Wilks/Roy are not
/// defined in the unequal-covariance setting and are omitted upstream.
fn calculate_welch_two_sample_t2(
    data: &AnalysisData,
    config: &MultivariateConfig,
    factor: &str,
) -> Result<HashMap<String, MultivariateTestEntry>, String> {
    let groups = compute_per_group_covariances(data, config, &[factor.to_string()])?;
    if groups.len() != 2 {
        return Err(format!(
            "Welch two-sample Hotelling T² needs exactly two groups with n > p; got {}.",
            groups.len()
        ));
    }
    let g1 = &groups[0];
    let g2 = &groups[1];
    let p = g1.mean.len();
    if p == 0 {
        return Err("No dependent variables available for Welch Hotelling T²".to_string());
    }
    if g2.mean.len() != p {
        return Err("Group mean vectors have inconsistent dimensions".to_string());
    }

    let v1 = &g1.covariance / (g1.n as f64);
    let v2 = &g2.covariance / (g2.n as f64);
    let v = &v1 + &v2;
    let v_inv = v
        .clone()
        .try_inverse()
        .ok_or_else(|| "V = S₁/n₁ + S₂/n₂ is singular".to_string())?;

    let d = &g1.mean - &g2.mean;
    let t_squared = (d.transpose() * &v_inv * &d)[(0, 0)];

    // Krishnamoorthy-Yu degrees of freedom.
    let denom = (p as f64) * (p as f64) + (p as f64);
    let m1 = &v1 * &v_inv;
    let m2 = &v2 * &v_inv;
    let trace_m1 = m1.trace();
    let trace_m2 = m2.trace();
    let trace_m1_sq = (&m1 * &m1).trace();
    let trace_m2_sq = (&m2 * &m2).trace();

    let inv_nu = (1.0 / (g1.n as f64 - 1.0))
        * (trace_m1_sq + trace_m1.powi(2))
        / denom
        + (1.0 / (g2.n as f64 - 1.0))
            * (trace_m2_sq + trace_m2.powi(2))
            / denom;
    if !inv_nu.is_finite() || inv_nu <= 0.0 {
        return Err("Welch degrees-of-freedom computation produced a non-positive value".to_string());
    }
    let nu = 1.0 / inv_nu;

    let df1 = p as f64;
    let df2 = nu - df1 + 1.0;
    if !(df2 > 0.0 && df2.is_finite()) {
        return Err(format!(
            "Welch df2 = ν − p + 1 = {} is not positive; check sample sizes vs p.",
            df2
        ));
    }

    let f_stat = ((nu - df1 + 1.0) / (df1 * nu)) * t_squared;
    let significance = calculate_f_significance(
        df1.round().max(1.0) as usize,
        df2.round().max(1.0) as usize,
        f_stat,
    );
    let noncent = f_stat * df1;

    let entry = MultivariateTestEntry {
        value: t_squared,
        f: f_stat,
        hypothesis_df: df1,
        error_df: df2,
        significance,
        partial_eta_squared: t_squared / (t_squared + nu),
        noncent_parameter: noncent,
        observed_power: if f_stat > 1.0 {
            (1.0 - 0.1 / f_stat).min(1.0)
        } else {
            0.5
        },
        is_exact_statistic: false,
    };

    // Welch only yields Hotelling's Trace; upstream label/formatter knows to
    // skip the other three statistics in this mode.
    let mut out = HashMap::new();
    out.insert("Hotelling's Trace".to_string(), entry);
    Ok(out)
}

/// Calculate hypothesis and error matrices for a given effect
fn calculate_hypothesis_error_matrices(
    data: &AnalysisData,
    config: &MultivariateConfig,
    effect: &str,
    dependent_vars: &[String],
    all_values: &[Vec<f64>],
    factors_in_effect: Option<&[String]>
) -> Result<(Vec<Vec<f64>>, Vec<Vec<f64>>, f64, f64), String> {
    let p = dependent_vars.len();
    let n_obs = all_values[0].len();

    // 1. Calculate grand means for each dependent variable
    let mut grand_means = Vec::new();
    for values in all_values {
        let mean = if !values.is_empty() {
            values.iter().sum::<f64>() / (values.len() as f64)
        } else {
            0.0
        };
        grand_means.push(mean);
    }

    // 2. Calculate hypothesis (H) and error (E) matrices depending on the effect
    let mut h_matrix = vec![vec![0.0; p]; p];
    let mut e_matrix = vec![vec![0.0; p]; p];

    if effect == "Intercept" {
        // Hotelling T² one-population test parameterizes the Intercept H matrix
        // by μ₀: H = n · (x̄ − μ₀)(x̄ − μ₀)ᵀ. When TestValues is absent we
        // fall back to μ₀ = 0, which reproduces the original behavior.
        let mu0: Vec<f64> = match &config.main.test_values {
            Some(tv) => {
                if tv.len() != p {
                    return Err(format!(
                        "TestValues length ({}) must equal number of Dependent Variables ({})",
                        tv.len(),
                        p
                    ));
                }
                tv.clone()
            }
            None => vec![0.0; p],
        };

        let centered: Vec<f64> = grand_means
            .iter()
            .zip(mu0.iter())
            .map(|(g, m)| g - m)
            .collect();

        // H matrix is set below, after cell means are available for the
        // Type III intercept formula when factors are present.

        // SPSS uses the full-model residual SSCP for the error matrix (the same
        // E that is used for every effect), not the corrected total SSCP. Build
        // cells from the full set of fixed factors and accumulate within-cell
        // residuals around each cell mean.
        let factors = config.main.fix_factor.as_ref().map_or(Vec::new(), |f| f.clone());
        let merged = super::common::merge_records(data);

        // Map each row to a cell key (concatenation of its factor values).
        let mut row_cell: Vec<Option<String>> = Vec::with_capacity(n_obs);
        for record in &merged {
            if factors.is_empty() {
                // No factors: a single cell containing every row.
                row_cell.push(Some(String::new()));
            } else {
                let mut key_parts: Vec<String> = Vec::with_capacity(factors.len());
                let mut all_present = true;
                for factor in &factors {
                    match record.values.get(factor) {
                        Some(v) => key_parts.push(data_value_to_string(v)),
                        None => {
                            all_present = false;
                            break;
                        }
                    }
                }
                row_cell.push(if all_present { Some(key_parts.join("|")) } else { None });
            }
        }

        // Compute per-cell means and counts.
        let mut cell_keys: Vec<String> = Vec::new();
        let mut cell_idx_by_key: HashMap<String, usize> = HashMap::new();
        let mut cell_values: Vec<Vec<Vec<f64>>> = Vec::new();
        for row_idx in 0..n_obs {
            if let Some(Some(key)) = row_cell.get(row_idx).cloned() {
                let idx = match cell_idx_by_key.get(&key) {
                    Some(&i) => i,
                    None => {
                        let i = cell_keys.len();
                        cell_keys.push(key.clone());
                        cell_idx_by_key.insert(key, i);
                        cell_values.push(vec![Vec::new(); p]);
                        i
                    }
                };
                for dv_i in 0..p {
                    if row_idx < all_values[dv_i].len() {
                        cell_values[idx][dv_i].push(all_values[dv_i][row_idx]);
                    }
                }
            }
        }

        let mut cell_means: Vec<Vec<f64>> = Vec::with_capacity(cell_keys.len());
        for c_idx in 0..cell_keys.len() {
            let mut means = Vec::with_capacity(p);
            for dv_i in 0..p {
                let vals = &cell_values[c_idx][dv_i];
                let m = if !vals.is_empty() {
                    vals.iter().sum::<f64>() / (vals.len() as f64)
                } else {
                    0.0
                };
                means.push(m);
            }
            cell_means.push(means);
        }

        // Intercept H matrix.
        // When factors are present use the Type III unweighted-mean formula:
        //   H[i,j] = sum_k(ȳ_ki) × sum_k(ȳ_kj) / Σ_k(1/n_k)
        // This gives the same result as N × ȳ² only for balanced designs.
        // When no factors are present (one-population T² or paired), fall back
        // to the original: H[i,j] = N × (x̄_i − μ₀_i) × (x̄_j − μ₀_j).
        if factors.is_empty() {
            // No-factor case: one-population T² with optional μ₀.
            for i in 0..p {
                for j in 0..p {
                    h_matrix[i][j] = (n_obs as f64) * centered[i] * centered[j];
                }
            }
        } else {
            // Factor case: Type III intercept SSCP.
            let mut sum_means = vec![0.0_f64; p];
            let mut sum_inv_n = 0.0_f64;
            for c_idx in 0..cell_keys.len() {
                let n_k = cell_values[c_idx][0].len();
                if n_k > 0 {
                    for dv_i in 0..p {
                        sum_means[dv_i] += cell_means[c_idx][dv_i];
                    }
                    sum_inv_n += 1.0 / (n_k as f64);
                }
            }
            if sum_inv_n > 0.0 {
                for i in 0..p {
                    for j in 0..p {
                        h_matrix[i][j] = sum_means[i] * sum_means[j] / sum_inv_n;
                    }
                }
            } else {
                // Fallback (degenerate): weighted formula.
                for i in 0..p {
                    for j in 0..p {
                        h_matrix[i][j] = (n_obs as f64) * centered[i] * centered[j];
                    }
                }
            }
        }

        // E = sum over rows of (y_i - cell_mean)(y_j - cell_mean).
        for i in 0..p {
            for j in 0..p {
                let mut e_sum = 0.0;
                for row_idx in 0..n_obs {
                    if let Some(Some(key)) = row_cell.get(row_idx) {
                        if let Some(&c_idx) = cell_idx_by_key.get(key) {
                            if row_idx < all_values[i].len() && row_idx < all_values[j].len() {
                                let r_i = all_values[i][row_idx] - cell_means[c_idx][i];
                                let r_j = all_values[j][row_idx] - cell_means[c_idx][j];
                                e_sum += r_i * r_j;
                            }
                        }
                    }
                }
                e_matrix[i][j] = e_sum;
            }
        }

        let n_cells = cell_keys.len().max(1);
        let error_df = (n_obs - n_cells) as f64;
        return Ok((h_matrix, e_matrix, 1.0, error_df));
    } else if factors_in_effect.is_none() || factors_in_effect.unwrap().is_empty() {
        // Main effect — single factor.
        // Build merged per-row records so each row's DV value aligns with its
        // factor level.
        let factor_levels = get_factor_levels(data, effect)?;
        let level_count = factor_levels.len();

        let merged = super::common::merge_records(data);

        // Determine each row's level index (None if missing/unknown level).
        let mut record_level_idx: Vec<Option<usize>> = Vec::with_capacity(n_obs);
        for record in &merged {
            let val = record.values.get(effect).map(|v| data_value_to_string(v));
            let idx = val.and_then(|v| factor_levels.iter().position(|l| l == &v));
            record_level_idx.push(idx);
        }

        // Bucket DV values by level using row-aligned indices.
        let mut level_values: Vec<Vec<Vec<f64>>> =
            vec![vec![Vec::new(); p]; level_count];
        for row_idx in 0..n_obs {
            if let Some(Some(level_idx)) = record_level_idx.get(row_idx).copied() {
                for dv_i in 0..p {
                    if row_idx < all_values[dv_i].len() {
                        level_values[level_idx][dv_i].push(all_values[dv_i][row_idx]);
                    }
                }
            }
        }

        // Compute level means and ns.
        let mut level_means: Vec<Vec<f64>> = Vec::with_capacity(level_count);
        let mut level_ns: Vec<usize> = Vec::with_capacity(level_count);
        for k in 0..level_count {
            let mut means = Vec::with_capacity(p);
            for dv_i in 0..p {
                let vals = &level_values[k][dv_i];
                let mean = if !vals.is_empty() {
                    vals.iter().sum::<f64>() / (vals.len() as f64)
                } else {
                    0.0
                };
                means.push(mean);
            }
            level_means.push(means);
            level_ns.push(level_values[k][0].len());
        }

        // H = sum_k n_k * (mean_k - grand_mean) (mean_k - grand_mean)'
        for i in 0..p {
            for j in 0..p {
                let mut h_sum = 0.0;
                for k in 0..level_count {
                    h_sum += (level_ns[k] as f64) *
                        (level_means[k][i] - grand_means[i]) *
                        (level_means[k][j] - grand_means[j]);
                }
                h_matrix[i][j] = h_sum;
            }
        }

        // E for Multivariate Tests of a main effect must be the FULL-model
        // residual SSCP (residuals around cell means using ALL fixed factors),
        // not residuals around this factor's own level means. SPSS uses one
        // pooled E for every effect — Intercept, main effects, and
        // interactions — so the dfs and F approximations line up across
        // effects in multi-factor designs. Previously this branch shadowed
        // the pooled E with a one-way residual, giving inflated
        // error_df (n_obs - levels_of_this_factor) and incorrect F values
        // for faktorA, faktorB, ... in Two-Way MANOVA.
        let all_factors = config.main.fix_factor.as_ref().map_or(Vec::new(), |f| f.clone());
        let (e_full, error_df) = compute_full_model_residual_sscp(
            data, &all_factors, &all_values, n_obs, p,
        );

        let hypothesis_df = (level_count - 1) as f64;

        return Ok((h_matrix, e_full, hypothesis_df, error_df));
    } else {
        // Interaction effect
        let interaction_factors = factors_in_effect.unwrap();

        // Get levels for each factor in the interaction
        let mut factor_levels = Vec::new();
        for factor in interaction_factors {
            let levels = get_factor_levels(data, factor)?;
            factor_levels.push((factor.clone(), levels));
        }

        // Generate all combinations of levels
        let mut level_combinations = Vec::new();
        let mut current_combo = HashMap::new();

        fn generate_level_combinations(
            factor_levels: &[(String, Vec<String>)],
            current_combo: &mut HashMap<String, String>,
            index: usize,
            result: &mut Vec<HashMap<String, String>>
        ) {
            if index == factor_levels.len() {
                result.push(current_combo.clone());
                return;
            }

            let (factor, levels) = &factor_levels[index];
            for level in levels {
                current_combo.insert(factor.clone(), level.clone());
                generate_level_combinations(factor_levels, current_combo, index + 1, result);
            }
        }

        generate_level_combinations(&factor_levels, &mut current_combo, 0, &mut level_combinations);

        // Build merged per-row records so each row's DV value aligns with its
        // factor levels.
        let merged = super::common::merge_records(data);

        // Determine each row's combination index by matching all factor values.
        let mut record_combo_idx: Vec<Option<usize>> = Vec::with_capacity(n_obs);
        for record in &merged {
            let mut found: Option<usize> = None;
            for (c_idx, combo) in level_combinations.iter().enumerate() {
                let matches = combo.iter().all(|(f, l)| {
                    record.values.get(f)
                        .map(|v| data_value_to_string(v))
                        .map_or(false, |v| &v == l)
                });
                if matches {
                    found = Some(c_idx);
                    break;
                }
            }
            record_combo_idx.push(found);
        }

        // Bucket DV values by combination using row-aligned indices.
        let mut combo_values: Vec<Vec<Vec<f64>>> =
            vec![vec![Vec::new(); p]; level_combinations.len()];
        for row_idx in 0..n_obs {
            if let Some(Some(c_idx)) = record_combo_idx.get(row_idx).copied() {
                for dv_i in 0..p {
                    if row_idx < all_values[dv_i].len() {
                        combo_values[c_idx][dv_i].push(all_values[dv_i][row_idx]);
                    }
                }
            }
        }

        let mut combo_means: Vec<Vec<f64>> = Vec::new();
        let mut combo_ns: Vec<usize> = Vec::new();
        for c_idx in 0..level_combinations.len() {
            let mut means = Vec::with_capacity(p);
            for dv_i in 0..p {
                let vals = &combo_values[c_idx][dv_i];
                let m = if !vals.is_empty() {
                    vals.iter().sum::<f64>() / (vals.len() as f64)
                } else {
                    0.0
                };
                means.push(m);
            }
            combo_means.push(means);
            combo_ns.push(combo_values[c_idx][0].len());
        }

        // For Type III SS, compute main-effect means per factor level
        // (row-aligned bucketing).
        let mut factor_effect_means: HashMap<String, HashMap<String, (Vec<f64>, usize)>> =
            HashMap::new();
        for factor in interaction_factors {
            let levels = get_factor_levels(data, factor)?;
            let mut by_level: HashMap<String, (Vec<f64>, usize)> = HashMap::new();
            for level in &levels {
                let mut buckets: Vec<Vec<f64>> = vec![Vec::new(); p];
                for (i, record) in merged.iter().enumerate() {
                    if i >= n_obs {
                        break;
                    }
                    let val = record.values.get(factor).map(|v| data_value_to_string(v));
                    if val.as_deref() == Some(level.as_str()) {
                        for dv_i in 0..p {
                            if i < all_values[dv_i].len() {
                                buckets[dv_i].push(all_values[dv_i][i]);
                            }
                        }
                    }
                }
                let mut means = Vec::with_capacity(p);
                for dv_i in 0..p {
                    let m = if !buckets[dv_i].is_empty() {
                        buckets[dv_i].iter().sum::<f64>() / (buckets[dv_i].len() as f64)
                    } else {
                        0.0
                    };
                    means.push(m);
                }
                let n = buckets[0].len();
                by_level.insert(level.clone(), (means, n));
            }
            factor_effect_means.insert(factor.clone(), by_level);
        }

        // Calculate H matrix for the interaction (Type III SS - only interaction effect)
        for i in 0..p {
            for j in 0..p {
                let mut h_sum = 0.0;
                for (c, combo) in level_combinations.iter().enumerate() {
                    if c >= combo_means.len() || c >= combo_ns.len() {
                        continue;
                    }

                    // Calculate expected mean based on main effects
                    let mut expected_i = grand_means[i];
                    let mut expected_j = grand_means[j];

                    // Add main effect adjustments
                    for (factor, level) in combo {
                        if let Some(level_means) = factor_effect_means.get(factor) {
                            if let Some((means, _)) = level_means.get(level) {
                                // Add main effect (centered around grand mean)
                                expected_i += means[i] - grand_means[i];
                                expected_j += means[j] - grand_means[j];
                            }
                        }
                    }

                    // Calculate interaction effect (observed - expected)
                    let interaction_i = combo_means[c][i] - expected_i;
                    let interaction_j = combo_means[c][j] - expected_j;

                    // Add to H matrix
                    h_sum += (combo_ns[c] as f64) * interaction_i * interaction_j;
                }
                h_matrix[i][j] = h_sum;
            }
        }

        // E matrix for interaction — row-aligned residuals around combo means.
        for i in 0..p {
            for j in 0..p {
                let mut e_sum = 0.0;
                for row_idx in 0..n_obs {
                    if let Some(Some(c_idx)) = record_combo_idx.get(row_idx).copied() {
                        if c_idx < combo_means.len()
                            && row_idx < all_values[i].len()
                            && row_idx < all_values[j].len()
                        {
                            let r_i = all_values[i][row_idx] - combo_means[c_idx][i];
                            let r_j = all_values[j][row_idx] - combo_means[c_idx][j];
                            e_sum += r_i * r_j;
                        }
                    }
                }
                e_matrix[i][j] = e_sum;
            }
        }

        // Calculate degrees of freedom for interaction
        let mut hypothesis_df = 1.0;
        for (factor, _) in &factor_levels {
            let levels = get_factor_levels(data, factor)?;
            hypothesis_df *= (levels.len() - 1) as f64;
        }

        let total_combinations = level_combinations.len();
        let error_df = (n_obs - total_combinations) as f64;

        return Ok((h_matrix, e_matrix, hypothesis_df, error_df));
    }
}

/// Compute the (real parts of the) eigenvalues of the product matrix `m`.
/// For HE^-1 the eigenvalues are non-negative reals when H is PSD and E is PD;
/// any tiny imaginary parts coming from numerical noise are discarded.
fn eigenvalues_real(m: &[Vec<f64>]) -> Vec<f64> {
    let n = m.len();
    if n == 0 {
        return Vec::new();
    }

    let flat: Vec<f64> = (0..n)
        .flat_map(|i| (0..n).map(move |j| m[i].get(j).copied().unwrap_or(0.0)))
        .collect();
    let dm = DMatrix::from_row_slice(n, n, &flat);

    let complex_eigs = dm.complex_eigenvalues();
    complex_eigs.iter().map(|c| c.re).collect()
}

/// Calculate multivariate test statistics from hypothesis and error matrices.
///
/// Statistics derived from the eigenvalues λ₁,…,λ_s of HE^-1:
///   - Pillai's Trace V    = Σ λ_i / (1 + λ_i)
///   - Wilks' Lambda Λ     = Π 1 / (1 + λ_i)
///   - Hotelling's Trace U = Σ λ_i
///   - Roy's Largest Root  = max λ_i
///
/// F approximations follow Rao (Wilks), Pillai-Bartlett (Pillai), and
/// the Lawley-Hotelling / upper-bound conventions used by SPSS.
fn calculate_multivariate_test_statistics(
    h_matrix: &[Vec<f64>],
    e_matrix: &[Vec<f64>],
    hypothesis_df: f64,
    error_df: f64,
    alpha: f64,
    p: usize
) -> Result<HashMap<String, MultivariateTestEntry>, String> {
    let mut test_results = HashMap::new();

    // HE^-1 and its eigenvalues.
    let e_inverse = matrix_inverse(e_matrix)
        .map_err(|e| format!("Failed to invert error matrix: {}", e))?;
    let he_inv = matrix_multiply(h_matrix, &e_inverse)
        .map_err(|e| format!("Failed to multiply H*E^-1: {}", e))?;

    let mut eigenvalues = eigenvalues_real(&he_inv);
    // Numerical noise can produce small negatives; clamp to zero.
    for v in eigenvalues.iter_mut() {
        if *v < 0.0 {
            *v = 0.0;
        }
    }
    eigenvalues.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));

    // Aggregate quantities
    let hotelling_trace: f64 = eigenvalues.iter().sum();
    let pillai_trace: f64 = eigenvalues.iter().map(|l| l / (1.0 + l)).sum();
    let wilks_lambda: f64 = eigenvalues.iter().fold(1.0, |acc, l| acc / (1.0 + l));
    let roys_root: f64 = eigenvalues.iter().cloned().fold(0.0_f64, f64::max);

    let p_f = p as f64;
    let s = p_f.min(hypothesis_df).max(1.0);
    let m_param = ((p_f - hypothesis_df).abs() - 1.0) / 2.0;
    let n_param = (error_df - p_f - 1.0) / 2.0;

    let exact_when_s_one = (p == 1) || (hypothesis_df <= 1.0 + 1e-12);

    // ── Pillai's Trace ────────────────────────────────────────────────────
    let (f_pillai, hyp_df_pillai, error_df_pillai) = {
        let denom_v = (s - pillai_trace).max(1e-12);
        let f = ((2.0 * n_param + s + 1.0) / (2.0 * m_param + s + 1.0))
            * (pillai_trace / denom_v);
        let df1 = s * (2.0 * m_param + s + 1.0);
        let df2 = s * (2.0 * n_param + s + 1.0);
        (f, df1, df2)
    };
    let sig_pillai = calculate_f_significance(
        hyp_df_pillai.round().max(1.0) as usize,
        error_df_pillai.round().max(1.0) as usize,
        f_pillai
    );
    let eta_squared_pillai = if s > 0.0 { pillai_trace / s } else { 0.0 };

    // ── Wilks' Lambda (Rao's F) ───────────────────────────────────────────
    let (f_wilks, hyp_df_wilks, error_df_wilks) = {
        let pq = p_f * hypothesis_df;
        let t_denom = (p_f * p_f + hypothesis_df * hypothesis_df) - 5.0;
        let t = if t_denom > 0.0 {
            ((pq * pq - 4.0) / t_denom).sqrt()
        } else {
            1.0
        };
        let r = error_df - (p_f - hypothesis_df + 1.0) / 2.0;
        let df1 = pq;
        let df2 = (r * t) - (pq - 2.0) / 2.0;

        let lambda_root = if t > 0.0 {
            wilks_lambda.powf(1.0 / t)
        } else {
            wilks_lambda
        };
        let f = if df1 > 0.0 && lambda_root > 0.0 {
            ((1.0 - lambda_root) / lambda_root) * (df2 / df1)
        } else {
            0.0
        };
        (f, df1, df2)
    };
    let sig_wilks = calculate_f_significance(
        hyp_df_wilks.round().max(1.0) as usize,
        error_df_wilks.round().max(1.0) as usize,
        f_wilks
    );
    let eta_squared_wilks = if s > 0.0 {
        1.0 - wilks_lambda.powf(1.0 / s)
    } else {
        0.0
    };

    // ── Hotelling's Trace ─────────────────────────────────────────────────
    let (f_hotelling, hyp_df_hotelling, error_df_hotelling) = {
        let df1 = s * (2.0 * m_param + s + 1.0);
        let df2 = 2.0 * (s * n_param + 1.0);
        let f = if df1 > 0.0 {
            (df2 / df1) * (hotelling_trace / s)
        } else {
            0.0
        };
        (f, df1, df2)
    };
    let sig_hotelling = calculate_f_significance(
        hyp_df_hotelling.round().max(1.0) as usize,
        error_df_hotelling.round().max(1.0) as usize,
        f_hotelling
    );
    let eta_squared_hotelling = hotelling_trace / (1.0 + hotelling_trace);

    // ── Roy's Largest Root (upper bound F) ────────────────────────────────
    let (f_roy, hyp_df_roy, error_df_roy) = {
        let df1 = p_f.max(hypothesis_df);
        let df2 = error_df - df1 + hypothesis_df;
        let f = if df1 > 0.0 && df2 > 0.0 {
            roys_root * df2 / df1
        } else {
            0.0
        };
        (f, df1, df2)
    };
    let sig_roy = calculate_f_significance(
        hyp_df_roy.round().max(1.0) as usize,
        error_df_roy.round().max(1.0) as usize,
        f_roy
    );
    let eta_squared_roy = roys_root / (1.0 + roys_root);

    // For the s=1 case all four tests share the same exact F, so reuse df.
    let (f_pillai, hyp_df_pillai, error_df_pillai,
         f_wilks, hyp_df_wilks, error_df_wilks,
         f_hotelling, hyp_df_hotelling, error_df_hotelling,
         f_roy, hyp_df_roy, error_df_roy,
         sig_pillai, sig_wilks, sig_hotelling, sig_roy)
    = if exact_when_s_one {
        let df1 = p_f;
        let df2 = error_df - p_f + 1.0;
        let f_exact = if df1 > 0.0 && df2 > 0.0 && roys_root.is_finite() {
            roys_root * df2 / df1
        } else {
            0.0
        };
        let sig = calculate_f_significance(
            df1.round().max(1.0) as usize,
            df2.round().max(1.0) as usize,
            f_exact
        );
        (f_exact, df1, df2,
         f_exact, df1, df2,
         f_exact, df1, df2,
         f_exact, df1, df2,
         sig, sig, sig, sig)
    } else {
        (f_pillai, hyp_df_pillai, error_df_pillai,
         f_wilks, hyp_df_wilks, error_df_wilks,
         f_hotelling, hyp_df_hotelling, error_df_hotelling,
         f_roy, hyp_df_roy, error_df_roy,
         sig_pillai, sig_wilks, sig_hotelling, sig_roy)
    };

    let noncent_parameter_pillai = f_pillai * hyp_df_pillai;
    let noncent_parameter_wilks = f_wilks * hyp_df_wilks;
    let noncent_parameter_hotelling = f_hotelling * hyp_df_hotelling;
    let noncent_parameter_roy = f_roy * hyp_df_roy;

    let power_pillai = if f_pillai > 1.0 { (1.0 - 0.1 / f_pillai).min(1.0) } else { 0.5 };
    let power_wilks = if f_wilks > 1.0 { (1.0 - 0.1 / f_wilks).min(1.0) } else { 0.5 };
    let power_hotelling = if f_hotelling > 1.0 { (1.0 - 0.1 / f_hotelling).min(1.0) } else { 0.5 };
    let power_roy = if f_roy > 1.0 { (1.0 - 0.1 / f_roy).min(1.0) } else { 0.5 };

    let _ = alpha;

    test_results.insert("Pillai's Trace".to_string(), MultivariateTestEntry {
        value: pillai_trace,
        f: f_pillai,
        hypothesis_df: hyp_df_pillai,
        error_df: error_df_pillai,
        significance: sig_pillai,
        partial_eta_squared: eta_squared_pillai,
        noncent_parameter: noncent_parameter_pillai,
        observed_power: power_pillai,
        is_exact_statistic: exact_when_s_one,
    });

    test_results.insert("Wilks' Lambda".to_string(), MultivariateTestEntry {
        value: wilks_lambda,
        f: f_wilks,
        hypothesis_df: hyp_df_wilks,
        error_df: error_df_wilks,
        significance: sig_wilks,
        partial_eta_squared: eta_squared_wilks,
        noncent_parameter: noncent_parameter_wilks,
        observed_power: power_wilks,
        is_exact_statistic: exact_when_s_one,
    });

    test_results.insert("Hotelling's Trace".to_string(), MultivariateTestEntry {
        value: hotelling_trace,
        f: f_hotelling,
        hypothesis_df: hyp_df_hotelling,
        error_df: error_df_hotelling,
        significance: sig_hotelling,
        partial_eta_squared: eta_squared_hotelling,
        noncent_parameter: noncent_parameter_hotelling,
        observed_power: power_hotelling,
        is_exact_statistic: exact_when_s_one,
    });

    test_results.insert("Roy's Largest Root".to_string(), MultivariateTestEntry {
        value: roys_root,
        f: f_roy,
        hypothesis_df: hyp_df_roy,
        error_df: error_df_roy,
        significance: sig_roy,
        partial_eta_squared: eta_squared_roy,
        noncent_parameter: noncent_parameter_roy,
        observed_power: power_roy,
        is_exact_statistic: exact_when_s_one,
    });

    Ok(test_results)
}

/// Compute the full-model residual SSCP (the pooled E matrix) and the
/// associated error degrees of freedom (n_obs − n_cells) using cell means
/// formed by ALL fixed factors. This matches what SPSS uses as the common
/// error term for every effect in a GLM Multivariate run, regardless of
/// whether that effect is the Intercept, a main effect, or an interaction.
fn compute_full_model_residual_sscp(
    data: &AnalysisData,
    factors: &[String],
    all_values: &[Vec<f64>],
    n_obs: usize,
    p: usize,
) -> (Vec<Vec<f64>>, f64) {
    let merged = super::common::merge_records(data);

    // Map each row to a cell key formed by concatenating its factor values.
    let mut row_cell: Vec<Option<String>> = Vec::with_capacity(n_obs);
    for record in &merged {
        if factors.is_empty() {
            // No factors → a single cell containing every row.
            row_cell.push(Some(String::new()));
        } else {
            let mut key_parts: Vec<String> = Vec::with_capacity(factors.len());
            let mut all_present = true;
            for factor in factors {
                match record.values.get(factor) {
                    Some(v) => key_parts.push(data_value_to_string(v)),
                    None => {
                        all_present = false;
                        break;
                    }
                }
            }
            row_cell.push(if all_present { Some(key_parts.join("|")) } else { None });
        }
    }

    // Per-cell means + counts.
    let mut cell_keys: Vec<String> = Vec::new();
    let mut cell_idx_by_key: HashMap<String, usize> = HashMap::new();
    let mut cell_values: Vec<Vec<Vec<f64>>> = Vec::new();
    for row_idx in 0..n_obs {
        if let Some(Some(key)) = row_cell.get(row_idx).cloned() {
            let idx = match cell_idx_by_key.get(&key) {
                Some(&i) => i,
                None => {
                    let i = cell_keys.len();
                    cell_keys.push(key.clone());
                    cell_idx_by_key.insert(key, i);
                    cell_values.push(vec![Vec::new(); p]);
                    i
                }
            };
            for dv_i in 0..p {
                if row_idx < all_values[dv_i].len() {
                    cell_values[idx][dv_i].push(all_values[dv_i][row_idx]);
                }
            }
        }
    }

    let mut cell_means: Vec<Vec<f64>> = Vec::with_capacity(cell_keys.len());
    for c_idx in 0..cell_keys.len() {
        let mut means = Vec::with_capacity(p);
        for dv_i in 0..p {
            let vals = &cell_values[c_idx][dv_i];
            let m = if !vals.is_empty() {
                vals.iter().sum::<f64>() / (vals.len() as f64)
            } else {
                0.0
            };
            means.push(m);
        }
        cell_means.push(means);
    }

    // E[i][j] = Σ_rows (y_ir − ȳ_cell_i)(y_jr − ȳ_cell_j)
    let mut e_matrix = vec![vec![0.0; p]; p];
    for i in 0..p {
        for j in 0..p {
            let mut e_sum = 0.0;
            for row_idx in 0..n_obs {
                if let Some(Some(key)) = row_cell.get(row_idx) {
                    if let Some(&c_idx) = cell_idx_by_key.get(key) {
                        if row_idx < all_values[i].len() && row_idx < all_values[j].len() {
                            let r_i = all_values[i][row_idx] - cell_means[c_idx][i];
                            let r_j = all_values[j][row_idx] - cell_means[c_idx][j];
                            e_sum += r_i * r_j;
                        }
                    }
                }
            }
            e_matrix[i][j] = e_sum;
        }
    }

    let n_cells = cell_keys.len().max(1);
    let error_df = (n_obs - n_cells) as f64;
    (e_matrix, error_df)
}
