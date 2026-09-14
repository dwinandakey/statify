use nalgebra::{ DMatrix, DVector };
use statrs::distribution::{ FisherSnedecor, ContinuousCDF };
use std::collections::HashMap;

use crate::models::{
    config::RepeatedMeasuresConfig,
    data::{ AnalysisData, DataValue },
    result::{
        MauchlyTest,
        TestsWithinSubjectsContrasts,
        TestsWithinSubjectsEffects,
        WithinSubjectsContrastSource,
        WithinSubjectsContrastsResult,
        WithinSubjectsEffectSource,
        WithinSubjectsEffectsResult,
    },
};

use super::core::parse_within_subject_factors;

/// Calculate tests of within-subjects effects
pub fn calculate_tests_within_subjects_effects(
    data: &AnalysisData,
    config: &RepeatedMeasuresConfig,
    mauchly_test: &Option<MauchlyTest>
) -> Result<TestsWithinSubjectsEffects, String> {
    let mut measures = HashMap::new();

    // Get within-subjects factors
    let within_factors = parse_within_subject_factors(data, config)?;

    // Process each within-subjects factor.
    // `measure_name` is the HashMap key (e.g. "perlakuan_anjing"); the within-
    // subjects factor name (e.g. "perlakuan") lives in factor_values keys and
    // is what SPSS prints in the Source column.
    for (measure_name, factors) in &within_factors.measures {
        let factor_name = factors
            .first()
            .and_then(|f| f.factor_values.keys().next().cloned())
            .unwrap_or_else(|| measure_name.clone());
        let mut sources = Vec::new();

        // Extract variable names for this factor
        let var_names: Vec<String> = factors
            .iter()
            .map(|f| f.dependent_variable.clone())
            .collect();

        // Extract data values
        let mut data_matrix = Vec::new();

        for record_group in &data.subject_data {
            let mut subject_data = Vec::new();

            for var_name in &var_names {
                let mut found = false;

                for record in record_group {
                    if let Some(data_value) = record.values.get(var_name) {
                        match data_value {
                            DataValue::Number(val) => {
                                subject_data.push(*val);
                                found = true;
                                break;
                            }
                            _ => {
                                continue;
                            }
                        }
                    }
                }

                if !found {
                    subject_data.push(0.0); // Missing data handling
                }
            }

            if subject_data.len() == var_names.len() {
                data_matrix.push(subject_data);
            }
        }

        // Convert to nalgebra matrix
        let n_subjects = data_matrix.len();
        let n_vars = var_names.len();

        if n_subjects < 2 || n_vars < 2 {
            continue; // Not enough data for analysis
        }

        let mut matrix = DMatrix::zeros(n_subjects, n_vars);
        for (i, row) in data_matrix.iter().enumerate() {
            for (j, &val) in row.iter().enumerate() {
                matrix[(i, j)] = val;
            }
        }

        // Calculate means
        let means = DVector::from_iterator(
            n_vars,
            (0..n_vars).map(|j| {
                (0..n_subjects).map(|i| matrix[(i, j)]).sum::<f64>() / (n_subjects as f64)
            })
        );

        // Calculate grand mean
        let grand_mean = means.sum() / (n_vars as f64);

        // Calculate sum of squares for factor
        let ss_factor =
            (n_subjects as f64) *
            means
                .iter()
                .map(|&mean| (mean - grand_mean).powi(2))
                .sum::<f64>();

        // Per-subject means (across levels) — needed to remove between-subject
        // variation from the error term.
        let subject_means: Vec<f64> = (0..n_subjects)
            .map(|i| {
                (0..n_vars).map(|j| matrix[(i, j)]).sum::<f64>() / (n_vars as f64)
            })
            .collect();

        // Repeated-measures error: SS_error = Σ_{i,j} (y_ij − row_mean_i − col_mean_j + grand_mean)².
        // The previous formula Σ(y_ij − col_mean_j)² conflated SS_error with
        // SS_subjects, inflating the error term.
        let mut ss_error = 0.0;
        for i in 0..n_subjects {
            for j in 0..n_vars {
                let resid =
                    matrix[(i, j)] - subject_means[i] - means[j] + grand_mean;
                ss_error += resid * resid;
            }
        }

        // Calculate degrees of freedom
        let df_factor = (n_vars - 1) as f64;
        let df_error = df_factor * ((n_subjects - 1) as f64);

        // Calculate mean squares
        let ms_factor = ss_factor / df_factor;
        let ms_error = ss_error / df_error;

        // Calculate F value
        let f = ms_factor / ms_error;

        // Calculate significance (p-value)
        let f_dist = FisherSnedecor::new(df_factor, df_error).map_err(|e| e.to_string())?;
        let significance = 1.0 - f_dist.cdf(f);

        // Calculate effect size
        let partial_eta_squared = ss_factor / (ss_factor + ss_error);

        // Calculate noncentrality parameter
        let noncent_parameter = ss_factor / ms_error;

        // Calculate observed power using approximation
        let observed_power = calculate_observed_power(f, df_factor, df_error, 0.05);

        // Create within-subjects effect source for sphericity assumed
        let sphericity_assumed = WithinSubjectsEffectSource {
            source: factor_name.clone(),
            assumption_type: "Sphericity Assumed".to_string(),
            sum_of_squares: ss_factor,
            df: df_factor,
            mean_square: ms_factor,
            f,
            significance,
            partial_eta_squared,
            noncent_parameter,
            observed_power,
        };

        sources.push(sphericity_assumed);

        // Apply corrections if Mauchly's test is available
        if let Some(mauchly) = mauchly_test {
            if let Some(test) = mauchly.tests.get(&factor_name) {
                // Greenhouse-Geisser correction
                let gg_df_factor = df_factor * test.greenhouse_geisser_epsilon;
                let gg_df_error = df_error * test.greenhouse_geisser_epsilon;
                let gg_f_dist = FisherSnedecor::new(gg_df_factor, gg_df_error).map_err(|e|
                    e.to_string()
                )?;
                let gg_significance = 1.0 - gg_f_dist.cdf(f);
                let gg_observed_power = calculate_observed_power(
                    f,
                    gg_df_factor,
                    gg_df_error,
                    0.05
                );

                let greenhouse_geisser = WithinSubjectsEffectSource {
                    source: factor_name.clone(),
                    assumption_type: "Greenhouse-Geisser".to_string(),
                    sum_of_squares: ss_factor,
                    df: gg_df_factor,
                    mean_square: ss_factor / gg_df_factor,
                    f,
                    significance: gg_significance,
                    partial_eta_squared,
                    noncent_parameter,
                    observed_power: gg_observed_power,
                };

                sources.push(greenhouse_geisser);

                // Huynh-Feldt correction
                let hf_df_factor = df_factor * test.huynh_feldt_epsilon;
                let hf_df_error = df_error * test.huynh_feldt_epsilon;
                let hf_f_dist = FisherSnedecor::new(hf_df_factor, hf_df_error).map_err(|e|
                    e.to_string()
                )?;
                let hf_significance = 1.0 - hf_f_dist.cdf(f);
                let hf_observed_power = calculate_observed_power(
                    f,
                    hf_df_factor,
                    hf_df_error,
                    0.05
                );

                let huynh_feldt = WithinSubjectsEffectSource {
                    source: factor_name.clone(),
                    assumption_type: "Huynh-Feldt".to_string(),
                    sum_of_squares: ss_factor,
                    df: hf_df_factor,
                    mean_square: ss_factor / hf_df_factor,
                    f,
                    significance: hf_significance,
                    partial_eta_squared,
                    noncent_parameter,
                    observed_power: hf_observed_power,
                };

                sources.push(huynh_feldt);

                // Lower-bound correction
                let lb_df_factor = df_factor * test.lower_bound_epsilon;
                let lb_df_error = df_error * test.lower_bound_epsilon;
                let lb_f_dist = FisherSnedecor::new(lb_df_factor, lb_df_error).map_err(|e|
                    e.to_string()
                )?;
                let lb_significance = 1.0 - lb_f_dist.cdf(f);
                let lb_observed_power = calculate_observed_power(
                    f,
                    lb_df_factor,
                    lb_df_error,
                    0.05
                );

                let lower_bound = WithinSubjectsEffectSource {
                    source: factor_name.clone(),
                    assumption_type: "Lower-bound".to_string(),
                    sum_of_squares: ss_factor,
                    df: lb_df_factor,
                    mean_square: ss_factor / lb_df_factor,
                    f,
                    significance: lb_significance,
                    partial_eta_squared,
                    noncent_parameter,
                    observed_power: lb_observed_power,
                };

                sources.push(lower_bound);

                // Error rows with corrections
                sources.push(WithinSubjectsEffectSource {
                    source: format!("Error({})", factor_name),
                    assumption_type: "Greenhouse-Geisser".to_string(),
                    sum_of_squares: ss_error,
                    df: df_error * test.greenhouse_geisser_epsilon,
                    mean_square: ss_error / (df_error * test.greenhouse_geisser_epsilon),
                    f: 0.0, significance: 0.0, partial_eta_squared: 0.0,
                    noncent_parameter: 0.0, observed_power: 0.0,
                });
                sources.push(WithinSubjectsEffectSource {
                    source: format!("Error({})", factor_name),
                    assumption_type: "Huynh-Feldt".to_string(),
                    sum_of_squares: ss_error,
                    df: df_error * test.huynh_feldt_epsilon,
                    mean_square: ss_error / (df_error * test.huynh_feldt_epsilon),
                    f: 0.0, significance: 0.0, partial_eta_squared: 0.0,
                    noncent_parameter: 0.0, observed_power: 0.0,
                });
                sources.push(WithinSubjectsEffectSource {
                    source: format!("Error({})", factor_name),
                    assumption_type: "Lower-bound".to_string(),
                    sum_of_squares: ss_error,
                    df: df_error * test.lower_bound_epsilon,
                    mean_square: ss_error / (df_error * test.lower_bound_epsilon),
                    f: 0.0, significance: 0.0, partial_eta_squared: 0.0,
                    noncent_parameter: 0.0, observed_power: 0.0,
                });
            }
        }

        // Always add SA Error row (after all effect+corrected rows)
        // Insert SA error before any corrected error rows
        let error_sa = WithinSubjectsEffectSource {
            source: format!("Error({})", factor_name),
            assumption_type: "Sphericity Assumed".to_string(),
            sum_of_squares: ss_error,
            df: df_error,
            mean_square: ms_error,
            f: 0.0, significance: 0.0, partial_eta_squared: 0.0,
            noncent_parameter: 0.0, observed_power: 0.0,
        };
        // Find position to insert SA error (after last non-error source for this factor)
        let insert_pos = sources.iter().position(|s| s.source.starts_with("Error("))
            .unwrap_or(sources.len());
        sources.insert(insert_pos, error_sa);

        // Add to results — keyed by measure name so the formatter renders one
        // table per measure (matches SPSS layout).
        let result = WithinSubjectsEffectsResult { sources };
        measures.insert(measure_name.clone(), result);
    }

    Ok(TestsWithinSubjectsEffects { measures })
}

/// Calculate observed power using the non-central F distribution approximation
fn calculate_observed_power(f: f64, df1: f64, df2: f64, alpha: f64) -> f64 {
    // This is a simplified approximation
    let noncentrality = f * df1;
    let critical_f = f_critical(df1, df2, alpha);

    // Power approximation based on normal distribution
    let z = (f - critical_f) / (2.0 * f).sqrt();
    normal_cdf(z)
}

/// Calculate critical F value
fn f_critical(df1: f64, df2: f64, alpha: f64) -> f64 {
    // Approximation using Wilson-Hilferty transformation
    let z_alpha = normal_quantile(1.0 - alpha);
    let term1 = 1.0 - 2.0 / (9.0 * df2);
    let term2 = z_alpha * (2.0 / (9.0 * df2)).sqrt();

    let chi2 = df2 * (term1 + term2).powi(3);
    chi2 / df1
}

/// Standard normal CDF approximation
fn normal_cdf(x: f64) -> f64 {
    0.5 * (1.0 + erf(x / (2.0_f64).sqrt()))
}

/// Standard normal quantile approximation
fn normal_quantile(p: f64) -> f64 {
    // Approximation from Abramowitz and Stegun
    if p <= 0.0 {
        return f64::NEG_INFINITY;
    }
    if p >= 1.0 {
        return f64::INFINITY;
    }

    let q = if p < 0.5 { p } else { 1.0 - p };
    let t = (-2.0 * q.ln()).sqrt();

    let c0 = 2.515517;
    let c1 = 0.802853;
    let c2 = 0.010328;
    let d1 = 1.432788;
    let d2 = 0.189269;
    let d3 = 0.001308;

    let numer = c0 + c1 * t + c2 * t.powi(2);
    let denom = 1.0 + d1 * t + d2 * t.powi(2) + d3 * t.powi(3);

    let x = t - numer / denom;

    if p < 0.5 {
        -x
    } else {
        x
    }
}

/// Error function approximation
fn erf(x: f64) -> f64 {
    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let x = x.abs();
    let t = 1.0 / (1.0 + 0.3275911 * x);
    let y = 1.0 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * (-x * x).exp();
    sign * y
}

/// Calculate tests of within-subjects contrasts using repeated (adjacent) contrasts
pub fn calculate_tests_within_subjects_contrasts(
    data: &AnalysisData,
    config: &RepeatedMeasuresConfig
) -> Result<TestsWithinSubjectsContrasts, String> {
    use statrs::distribution::{ FisherSnedecor, ContinuousCDF };

    let within_factors = parse_within_subject_factors(data, config)?;
    let mut measures = HashMap::new();

    for (factor_name, factors) in &within_factors.measures {
        let k = factors.len();
        if k < 2 {
            continue;
        }

        let var_names: Vec<String> = factors.iter().map(|f| f.dependent_variable.clone()).collect();

        // Build data matrix (subjects × levels)
        let mut data_matrix: Vec<Vec<f64>> = Vec::new();
        for record_group in &data.subject_data {
            let mut row = Vec::new();
            for var_name in &var_names {
                let mut val = 0.0;
                for record in record_group {
                    if let Some(DataValue::Number(v)) = record.values.get(var_name) {
                        val = *v;
                        break;
                    }
                }
                row.push(val);
            }
            if row.len() == k { data_matrix.push(row); }
        }

        let n = data_matrix.len();
        if n < 2 { continue; }

        let mut sources = Vec::new();

        // Repeated (adjacent) contrasts: level j vs level j+1
        for j in 0..(k - 1) {
            let label = format!("Level {} vs. Level {}", j + 1, j + 2);

            // Contrast scores D_i = y_i[j+1] - y_i[j]
            let d_scores: Vec<f64> = data_matrix.iter().map(|row| row[j + 1] - row[j]).collect();
            let d_mean = d_scores.iter().sum::<f64>() / (n as f64);

            let ss_effect = (n as f64) * d_mean * d_mean;
            let ss_error: f64 = d_scores.iter().map(|&d| (d - d_mean).powi(2)).sum();

            let df_effect = 1usize;
            let df_error = n - 1;
            let ms_effect = ss_effect;
            let ms_error = ss_error / (df_error as f64);

            let f_val = if ms_error > 0.0 { ms_effect / ms_error } else { 0.0 };
            let significance = if ms_error > 0.0 {
                let f_dist = FisherSnedecor::new(1.0, df_error as f64).map_err(|e| e.to_string())?;
                1.0 - f_dist.cdf(f_val)
            } else { 1.0 };

            let partial_eta_squared = ss_effect / (ss_effect + ss_error);
            let noncent_parameter = f_val * (df_effect as f64);
            let observed_power = calculate_observed_power(f_val, 1.0, df_error as f64, 0.05);

            let mut factor_values = HashMap::new();
            factor_values.insert(factor_name.clone(), label.clone());

            // Effect source
            sources.push(WithinSubjectsContrastSource {
                source: factor_name.clone(),
                factor_values: factor_values.clone(),
                sum_of_squares: ss_effect,
                df: df_effect,
                mean_square: ms_effect,
                f: f_val,
                significance,
                partial_eta_squared,
                noncent_parameter,
                observed_power,
            });

            // Error source
            let mut err_factor_values = HashMap::new();
            err_factor_values.insert(format!("Error({})", factor_name), label.clone());
            sources.push(WithinSubjectsContrastSource {
                source: format!("Error({})", factor_name),
                factor_values: err_factor_values,
                sum_of_squares: ss_error,
                df: df_error,
                mean_square: ms_error,
                f: 0.0,
                significance: 0.0,
                partial_eta_squared: 0.0,
                noncent_parameter: 0.0,
                observed_power: 0.0,
            });
        }

        measures.insert(factor_name.clone(), WithinSubjectsContrastsResult { sources });
    }

    Ok(TestsWithinSubjectsContrasts { measures })
}
