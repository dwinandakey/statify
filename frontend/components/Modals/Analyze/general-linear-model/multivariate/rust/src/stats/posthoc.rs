use std::collections::HashMap;

use crate::models::{
    config::MultivariateConfig,
    data::AnalysisData,
    result::{ ConfidenceInterval, PostHocTest },
};

use super::core::{
    calculate_mean,
    calculate_t_critical,
    calculate_t_significance,
    get_factor_levels,
    get_level_values,
};
use super::common::{ data_value_to_string, extract_dependent_value, merge_records };

/// Pooled mean-square error from the FULL model (residuals around cell
/// means using every fixed factor) and the matching error degrees of
/// freedom (n_obs − n_cells). SPSS post-hoc tests use this same MSE for
/// every pairwise comparison so the Std. Error is constant across rows
/// in a balanced design — quite different from a per-pair two-sample
/// pooled variance. Returns (MSE, df_error).
fn compute_model_mse(
    data: &AnalysisData,
    config: &MultivariateConfig,
    dep_var: &str,
) -> Option<(f64, usize)> {
    let factors = config.main.fix_factor.as_ref().cloned().unwrap_or_default();
    let merged = merge_records(data);

    let mut cell_sums: HashMap<String, (f64, f64, usize)> = HashMap::new();
    // value: (sum, sum_sq, n) per cell; used to compute residual SS as
    // Σ y² − Σ (Σy)²/n per cell.
    let mut n_obs: usize = 0;
    for record in &merged {
        let y = match extract_dependent_value(record, dep_var) {
            Some(v) => v,
            None => continue,
        };
        let key = if factors.is_empty() {
            String::new()
        } else {
            let mut parts = Vec::with_capacity(factors.len());
            let mut all_present = true;
            for f in &factors {
                match record.values.get(f) {
                    Some(v) => parts.push(data_value_to_string(v)),
                    None => {
                        all_present = false;
                        break;
                    }
                }
            }
            if !all_present {
                continue;
            }
            parts.join("|")
        };
        let entry = cell_sums.entry(key).or_insert((0.0, 0.0, 0));
        entry.0 += y;
        entry.1 += y * y;
        entry.2 += 1;
        n_obs += 1;
    }
    if cell_sums.is_empty() {
        return None;
    }
    let mut ss_error = 0.0;
    for (_, (sum, sum_sq, n)) in cell_sums.iter() {
        if *n == 0 {
            continue;
        }
        ss_error += sum_sq - (sum * sum) / (*n as f64);
    }
    let n_cells = cell_sums.len();
    if n_obs <= n_cells {
        return None;
    }
    let df_error = n_obs - n_cells;
    Some((ss_error / df_error as f64, df_error))
}

/// Calculate post-hoc tests
pub fn calculate_posthoc_tests(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<HashMap<String, Vec<PostHocTest>>, String> {
    let mut result = HashMap::new();

    // Get dependent variables
    let dependent_vars = data.dependent_data_defs
        .iter()
        .flat_map(|defs| defs.iter().map(|def| def.name.clone()))
        .collect::<Vec<String>>();

    // Read the factors the user moved into "Post Hoc Tests for" (FixFactorVars).
    // src_list is the *available* factor pool — it's auto-populated from main
    // FixFactor and represents the SOURCE of the picker, not the user's
    // selection. Using src_list here means we run post-hoc on factors the
    // user explicitly did NOT pick (and skip the ones they did). SPSS post-hoc
    // applies to the factors moved into the right-hand list.
    if let Some(factor_list) = &config.posthoc.fix_factor_vars {
        if factor_list.is_empty() {
            return Err("No factors specified for post-hoc tests.".to_string());
        }

        for dep_var in &dependent_vars {
            let mut tests = Vec::new();

            // Compute the model-pooled MSE ONCE per DV. Every pairwise
            // comparison uses this same MSE and df_error — that is the
            // SPSS convention and is essential for SE to come out constant
            // (in balanced designs) and for adjusted p-values to land in
            // the right range.
            let (mse_full, df_full) = match compute_model_mse(data, config, dep_var) {
                Some(v) => v,
                None => continue, // Can't run post-hoc without a usable MSE.
            };

            for factor in factor_list {
                if let Ok(levels) = get_factor_levels(data, factor) {
                    // For each factor, perform pairwise comparisons between levels
                    for i in 0..levels.len() {
                        for j in i + 1..levels.len() {
                            let level_i = &levels[i];
                            let level_j = &levels[j];

                            // Get values for each level
                            let values_i = get_level_values(data, factor, level_i, dep_var)?;
                            let values_j = get_level_values(data, factor, level_j, dep_var)?;

                            if !values_i.is_empty() && !values_j.is_empty() {
                                // Calculate means
                                let mean_i = calculate_mean(&values_i);
                                let mean_j = calculate_mean(&values_j);
                                let mean_diff = mean_i - mean_j;

                                let n_i = values_i.len();
                                let n_j = values_j.len();

                                // Standard Error from the FULL-model MSE,
                                //   SE = √(MSE · (1/n_i + 1/n_j)),
                                // NOT from a per-pair pooled variance. SPSS uses
                                // the pooled within-cells MSE across every level
                                // of every fixed factor so the SE is uniform per
                                // (n_i, n_j) pair — matches the Tests of
                                // Between-Subjects Effects "Error MS" column.
                                let std_error = (
                                    mse_full *
                                    (1.0 / (n_i as f64) + 1.0 / (n_j as f64))
                                ).sqrt();

                                // df for the t reference distribution is the
                                // full-model error df (n_obs − n_cells), not
                                // the two-sample n_i + n_j − 2.
                                let df = df_full;
                                let t_value = mean_diff / std_error;
                                let mut significance = calculate_t_significance(df, t_value);

                                // Apply multiple comparison correction based on selected method.
                                // SPSS conventions:
                                //   Bonferroni:  p_adj = min(1, c · p_raw)
                                //   Sidak:       p_adj = 1 − (1 − p_raw)^c
                                // The old code multiplied a clamped p by c — producing
                                // values up to c (e.g. 5.49 instead of 1.000), which is
                                // obviously not a probability.
                                if config.posthoc.bonfe {
                                    let total_comparisons = (levels.len() * (levels.len() - 1)) / 2;
                                    significance =
                                        (significance * (total_comparisons as f64)).min(1.0);
                                } else if config.posthoc.sidak {
                                    let total_comparisons = (levels.len() * (levels.len() - 1)) / 2;
                                    let one_minus =
                                        (1.0 - significance).max(0.0).min(1.0);
                                    significance = (1.0 -
                                        one_minus.powf(total_comparisons as f64))
                                        .min(1.0)
                                        .max(0.0);
                                }

                                // Calculate confidence interval (default 95%)
                                let alpha = 0.05;
                                let mut t_critical = calculate_t_critical(df, alpha / 2.0);

                                // Adjust critical value for multiple comparisons if needed
                                if config.posthoc.bonfe {
                                    let total_comparisons = (levels.len() * (levels.len() - 1)) / 2;
                                    t_critical = calculate_t_critical(
                                        df,
                                        alpha / (2.0 * (total_comparisons as f64))
                                    );
                                } else if config.posthoc.sidak {
                                    let total_comparisons = (levels.len() * (levels.len() - 1)) / 2;
                                    t_critical = calculate_t_critical(
                                        df,
                                        1.0 -
                                            (1.0 - alpha / 2.0).powf(
                                                1.0 / (total_comparisons as f64)
                                            )
                                    );
                                }

                                let ci_lower = mean_diff - t_critical * std_error;
                                let ci_upper = mean_diff + t_critical * std_error;

                                // Determine which posthoc test was used
                                let test_type = if config.posthoc.bonfe {
                                    "Bonferroni"
                                } else if config.posthoc.sidak {
                                    "Sidak"
                                } else if config.posthoc.scheffe {
                                    "Scheffe"
                                } else if config.posthoc.lsd {
                                    "LSD"
                                } else {
                                    "Pairwise Comparison"
                                };

                                tests.push(PostHocTest {
                                    dependent_variable: dep_var.clone(),
                                    test_type: test_type.to_string(),
                                    factor_name: factor.clone(),
                                    i_level: level_i.clone(),
                                    j_level: level_j.clone(),
                                    mean_difference: mean_diff,
                                    std_error,
                                    significance,
                                    confidence_interval: ConfidenceInterval {
                                        lower_bound: ci_lower,
                                        upper_bound: ci_upper,
                                    },
                                });
                            }
                        }
                    }
                }
            }

            if !tests.is_empty() {
                result.insert(dep_var.clone(), tests);
            }
        }
    }

    if result.is_empty() {
        Err("No post-hoc tests were performed.".to_string())
    } else {
        Ok(result)
    }
}
