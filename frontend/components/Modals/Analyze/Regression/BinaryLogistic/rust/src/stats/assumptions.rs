use crate::models::result::{BoxTidwellRow, CorrelationRow, VifRow};
use nalgebra::{DMatrix, DVector};

/// Menghitung VIF (Variance Inflation Factor) dengan OLS
/// VIF_j = 1 / (1 - R_j^2)
pub fn calculate_vif(x: &DMatrix<f64>, feature_names: &[String]) -> Result<Vec<VifRow>, String> {
    let (rows, cols) = x.shape();

    // Minimal 2 variabel untuk mendeteksi multikolinearitas antar variabel
    if cols < 2 {
        return Ok(vec![]);
    }

    let mut results = Vec::new();

    for i in 0..cols {
        // 1. Target (y) adalah kolom ke-i (variabel yang sedang diuji)
        let y_curr = x.column(i).into_owned();

        // 2. Predictors (X) adalah semua kolom SELAIN i, ditambah Intercept
        // Kita perlu menyusun matriks design baru
        let mut predictors_vec = Vec::with_capacity(rows * cols); // (cols-1 + 1 intercept) * rows

        // Tambahkan kolom Intercept (semua bernilai 1.0)
        for _ in 0..rows {
            predictors_vec.push(1.0);
        }

        // Tambahkan kolom predictor lainnya
        for j in 0..cols {
            if i == j {
                continue;
            }
            predictors_vec.extend(x.column(j).iter());
        }

        let x_design = DMatrix::from_vec(rows, cols, predictors_vec);

        // 3. Hitung OLS: b = (X'X)^-1 X'y
        let xt = x_design.transpose();
        let xtx = &xt * &x_design;

        // Gunakan try_inverse untuk menangani singular matrix (multikolinearitas sempurna)
        let (tolerance, vif) = match xtx.try_inverse() {
            Some(xtx_inv) => {
                let xty = &xt * &y_curr;
                let b = &xtx_inv * &xty;

                // 4. Hitung R Squared
                let y_pred = &x_design * b;
                let y_mean = y_curr.mean();

                let sst: f64 = y_curr.iter().map(|&v| (v - y_mean).powi(2)).sum();
                let sse: f64 = (y_curr - y_pred).iter().map(|&v| v.powi(2)).sum();

                // Hindari pembagian nol jika variansi target 0
                let r_sq = if sst.abs() < 1e-9 {
                    1.0
                } else {
                    1.0 - (sse / sst)
                };

                // Batasi R^2 max 1.0
                let r_sq = r_sq.max(0.0).min(1.0);

                let tol = 1.0 - r_sq;
                let v = if tol < 1e-9 { 1000.0 } else { 1.0 / tol }; // Cap max VIF untuk stabilitas

                (tol, v)
            }
            None => (0.0, 999.9), // Kasus singular matrix
        };

        results.push(VifRow {
            variable: feature_names[i].clone(),
            tolerance,
            vif,
        });
    }

    Ok(results)
}

/// Box-Tidwell Test for Linearity of the Logit
///
/// Implementation based on:
/// - Box, G. E. P. & Tidwell, P. W. (1962). Transformation of the independent
///   variables. Technometrics, 4, 531–550.
/// - Fox, J. (1997). Applied Regression, Linear Models, and Related Methods. Sage.
/// - Fox, J. & Weisberg, S. (2011). An R Companion to Applied Regression (2nd ed.). Sage.
///
/// The test checks whether the relationship between each continuous predictor X
/// and the logit of Y is linear. Under H₀ the power transformation parameter
/// λ = 1 (i.e., no transformation needed). The procedure:
///
/// 1. For each eligible continuous predictor Xⱼ compute the "constructed variable"
///    Xⱼ·ln(Xⱼ).
/// 2. Fit the augmented logistic model simultaneously containing ALL original
///    covariates plus ALL constructed variables (R-style simultaneous approach).
/// 3. For each constructed variable γ̂ⱼ (coefficient of Xⱼ·ln(Xⱼ)), compute:
///    - Score z = γ̂ⱼ / SE(γ̂ⱼ)
///    - p-value = 2·Φ(−|z|)   (two-tailed)
///    - MLE of λⱼ = 1 + γ̂ⱼ / β̂ⱼ   (one-step approximation; Hosmer & Lemeshow 2000)
/// 4. If significant (p < α) → the linearity-in-the-logit assumption is violated
///    for Xⱼ and a power transformation X^λ̂ should be considered.
///
/// **Simultaneous vs per-variable:**
/// R's `car::boxTidwell()` adds ALL constructed variables at once so that the
/// covariance matrix accounts for inter-correlations between constructed
/// variables. This implementation follows the same approach. If the simultaneous
/// model is numerically unstable, it falls back to per-variable testing.
///
/// **Eligibility rules:**
/// - Binary / dichotomous variables (≤ 2 unique values): SKIP
/// - Variables with very few unique values (≤ 4): SKIP (likely ordinal)
/// - Constant variables: SKIP
/// - Variables with values ≤ 0: a uniform shift X' = X − min(X) + 1 is applied
pub fn calculate_box_tidwell(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    feature_names: &[String],
) -> Result<Vec<BoxTidwellRow>, String> {
    let (rows, cols) = x.shape();

    if rows != y.len() {
        return Err("Dimensi X dan Y tidak sesuai.".to_string());
    }

    // ================================================================
    // PHASE 1: Classify each variable as eligible or skipped
    // ================================================================
    struct EligibleVar {
        col_idx: usize,
        name: String,
        shift: f64,
        interaction_col: DVector<f64>,
        note: String,
    }

    let mut eligible_vars: Vec<EligibleVar> = Vec::new();
    let mut skipped_results: Vec<BoxTidwellRow> = Vec::new();
    // Each entry: Ok(index into eligible_vars) or Err(index into skipped_results)
    let mut order: Vec<Result<usize, usize>> = Vec::new();

    for (i, name) in feature_names.iter().enumerate() {
        let col_x = x.column(i);
        let x_vals: Vec<f64> = col_x.iter().cloned().collect();
        let x_min = x_vals.iter().cloned().fold(f64::INFINITY, f64::min);
        let x_max = x_vals.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

        // --- Constant variable ---
        if (x_max - x_min).abs() < 1e-10 {
            let idx = skipped_results.len();
            skipped_results.push(make_skipped_row(
                name,
                "Constant variable (no variation)",
                "",
            ));
            order.push(Err(idx));
            continue;
        }

        // Unique values
        let mut unique_vals: Vec<f64> = x_vals.clone();
        unique_vals.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        unique_vals.dedup_by(|a, b| (*a - *b).abs() < 1e-9);
        let n_unique = unique_vals.len();

        // --- Binary variable ---
        if n_unique <= 2 {
            let idx = skipped_results.len();
            skipped_results.push(make_skipped_row(
                name,
                "Binary variable — Box-Tidwell test is not applicable for dichotomous variables. The test only applies to continuous predictors.",
                "",
            ));
            order.push(Err(idx));
            continue;
        }

        // --- Few unique values (likely ordinal/categorical) ---
        if n_unique <= 4 {
            let idx = skipped_results.len();
            skipped_results.push(make_skipped_row(
                name,
                &format!(
                    "Only {} unique values detected — likely a categorical/ordinal variable. Box-Tidwell test only applies to continuous predictors.",
                    n_unique
                ),
                "",
            ));
            order.push(Err(idx));
            continue;
        }

        // --- Handle non-positive values with uniform shift ---
        let has_non_positive = x_min <= 0.0;
        let shift = if has_non_positive { -x_min + 1.0 } else { 0.0 };
        let note_text = if has_non_positive {
            format!(
                "Variable contains values ≤ 0 (min={:.3}). A uniform shift of {:.3} was applied (X' = X + {:.3}) before computing X'·ln(X').",
                x_min, shift, shift
            )
        } else {
            String::new()
        };

        // --- Compute constructed variable: (X + shift) · ln(X + shift) ---
        let mut interaction_vec = Vec::with_capacity(rows);
        for &val in col_x.iter() {
            let x_shifted = (val + shift).max(1e-10);
            interaction_vec.push(x_shifted * x_shifted.ln());
        }
        let interaction_col = DVector::from_vec(interaction_vec.clone());

        // Check interaction term has variation
        let int_min = interaction_vec.iter().cloned().fold(f64::INFINITY, f64::min);
        let int_max = interaction_vec.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        if (int_max - int_min).abs() < 1e-10 {
            let idx = skipped_results.len();
            skipped_results.push(make_skipped_row(
                name,
                "Interaction term X·ln(X) has no variation after transformation. Test cannot be computed.",
                &note_text,
            ));
            order.push(Err(idx));
            continue;
        }

        let elig_idx = eligible_vars.len();
        eligible_vars.push(EligibleVar {
            col_idx: i,
            name: name.clone(),
            shift,
            interaction_col,
            note: note_text,
        });
        order.push(Ok(elig_idx));
    }

    // If no eligible variables, return the skipped results
    if eligible_vars.is_empty() {
        return Ok(reassemble_results(&order, &skipped_results, &[]));
    }

    // ================================================================
    // PHASE 2: Build augmented design matrix (SIMULTANEOUS approach)
    //
    //   [Intercept, X₁, X₂, ..., Xₖ, X_{e1}·ln(X_{e1}), ..., X_{em}·ln(X_{em})]
    //
    // where e1..em are the eligible variable indices.
    // ================================================================
    let n_eligible = eligible_vars.len();
    let total_cols = 1 + cols + n_eligible;

    let mut x_design = DMatrix::zeros(rows, total_cols);

    // Column 0: Intercept
    for r in 0..rows {
        x_design[(r, 0)] = 1.0;
    }

    // Columns 1..=cols: All original X variables
    for j in 0..cols {
        for r in 0..rows {
            x_design[(r, 1 + j)] = x[(r, j)];
        }
    }

    // Columns (1+cols)...: Interaction terms for eligible variables
    for (eidx, evar) in eligible_vars.iter().enumerate() {
        let col_offset = 1 + cols + eidx;
        for r in 0..rows {
            x_design[(r, col_offset)] = evar.interaction_col[r];
        }
    }

    // ================================================================
    // PHASE 3: Fit the augmented logistic model via IRLS
    // ================================================================
    match fit_logit_augmented(&x_design, y) {
        Ok(fit_result) => {
            let mut eligible_results = Vec::with_capacity(n_eligible);

            for (eidx, evar) in eligible_vars.iter().enumerate() {
                let interaction_coeff_idx = 1 + cols + eidx;
                let original_coeff_idx = 1 + evar.col_idx;

                let gamma = fit_result.beta[interaction_coeff_idx];
                let beta_orig = fit_result.beta[original_coeff_idx];
                let se_gamma = fit_result.se[interaction_coeff_idx];

                let z_score = if se_gamma > 1e-12 { gamma / se_gamma } else { 0.0 };
                let p_value = 2.0 * standard_normal_cdf(-z_score.abs());

                // MLE of λ = 1 + γ̂ / β̂ (Box & Tidwell 1962, Fox 1997)
                let mle_lambda = if beta_orig.abs() > 1e-12 {
                    1.0 + gamma / beta_orig
                } else {
                    f64::NAN
                };

                let interaction_label = if evar.shift > 0.0 {
                    format!("{} by ln({}+{:.1})", evar.name, evar.name, evar.shift)
                } else {
                    format!("{} by ln({})", evar.name, evar.name)
                };

                eligible_results.push(BoxTidwellRow {
                    variable: evar.name.clone(),
                    mle_lambda,
                    score_z: z_score,
                    df: 1,
                    sig: p_value,
                    b_original: beta_orig,
                    b_interaction: gamma,
                    se_interaction: se_gamma,
                    is_significant: p_value < 0.05,
                    skipped: false,
                    skip_reason: String::new(),
                    note: evar.note.clone(),
                    interaction_term: interaction_label,
                    b: gamma,
                });
            }

            Ok(reassemble_results(&order, &skipped_results, &eligible_results))
        }
        Err(_) => {
            // Simultaneous model failed → fall back to per-variable testing
            let mut eligible_results = Vec::with_capacity(n_eligible);

            for evar in eligible_vars.iter() {
                match fit_per_variable(x, y, cols, rows, &evar.interaction_col, evar.col_idx) {
                    Ok(pvr) => {
                        let z_score = if pvr.se_gamma > 1e-12 { pvr.gamma / pvr.se_gamma } else { 0.0 };
                        let p_value = 2.0 * standard_normal_cdf(-z_score.abs());
                        let mle_lambda = if pvr.beta_orig.abs() > 1e-12 {
                            1.0 + pvr.gamma / pvr.beta_orig
                        } else {
                            f64::NAN
                        };

                        let interaction_label = if evar.shift > 0.0 {
                            format!("{} by ln({}+{:.1})", evar.name, evar.name, evar.shift)
                        } else {
                            format!("{} by ln({})", evar.name, evar.name)
                        };

                        eligible_results.push(BoxTidwellRow {
                            variable: evar.name.clone(),
                            mle_lambda,
                            score_z: z_score,
                            df: 1,
                            sig: p_value,
                            b_original: pvr.beta_orig,
                            b_interaction: pvr.gamma,
                            se_interaction: pvr.se_gamma,
                            is_significant: p_value < 0.05,
                            skipped: false,
                            skip_reason: String::new(),
                            note: if evar.note.is_empty() {
                                "Per-variable testing used (simultaneous model did not converge).".to_string()
                            } else {
                                format!("{} Per-variable testing used (simultaneous model did not converge).", evar.note)
                            },
                            interaction_term: interaction_label,
                            b: pvr.gamma,
                        });
                    }
                    Err(e) => {
                        eligible_results.push(BoxTidwellRow {
                            variable: evar.name.clone(),
                            mle_lambda: f64::NAN,
                            score_z: 0.0,
                            df: 1,
                            sig: 1.0,
                            b_original: 0.0,
                            b_interaction: 0.0,
                            se_interaction: 0.0,
                            is_significant: false,
                            skipped: true,
                            skip_reason: format!("Computation failed: {}", e),
                            note: evar.note.clone(),
                            interaction_term: format!("{} by ln({})", evar.name, evar.name),
                            b: 0.0,
                        });
                    }
                }
            }

            Ok(reassemble_results(&order, &skipped_results, &eligible_results))
        }
    }
}

// ============================================================================
// HELPER: Pearson correlation between two vectors
// ============================================================================
#[allow(dead_code)]
fn pearson_correlation(a: &[f64], b: &[f64]) -> f64 {
    let n = a.len() as f64;
    if n < 2.0 { return 0.0; }

    let mean_a: f64 = a.iter().sum::<f64>() / n;
    let mean_b: f64 = b.iter().sum::<f64>() / n;

    let mut cov = 0.0;
    let mut var_a = 0.0;
    let mut var_b = 0.0;

    for i in 0..a.len() {
        let da = a[i] - mean_a;
        let db = b[i] - mean_b;
        cov += da * db;
        var_a += da * da;
        var_b += db * db;
    }

    let denom = (var_a * var_b).sqrt();
    if denom < 1e-15 { 0.0 } else { cov / denom }
}

// ============================================================================
// HELPER: Create a skipped BoxTidwellRow
// ============================================================================
fn make_skipped_row(name: &str, reason: &str, note: &str) -> BoxTidwellRow {
    BoxTidwellRow {
        variable: name.to_string(),
        mle_lambda: f64::NAN,
        score_z: 0.0,
        df: 1,
        sig: 1.0,
        b_original: 0.0,
        b_interaction: 0.0,
        se_interaction: 0.0,
        is_significant: false,
        skipped: true,
        skip_reason: reason.to_string(),
        note: note.to_string(),
        interaction_term: format!("{} by ln({})", name, name),
        b: 0.0,
    }
}

// ============================================================================
// HELPER: Reassemble results in original variable order
// ============================================================================
fn reassemble_results(
    order: &[Result<usize, usize>],
    skipped: &[BoxTidwellRow],
    eligible: &[BoxTidwellRow],
) -> Vec<BoxTidwellRow> {
    order
        .iter()
        .map(|entry| match entry {
            Err(idx) => skipped[*idx].clone(),
            Ok(idx) => eligible[*idx].clone(),
        })
        .collect()
}

// ============================================================================
// Fit result structures
// ============================================================================
struct AugmentedFitResult {
    beta: DVector<f64>,
    se: DVector<f64>,
}

struct PerVariableFitResult {
    gamma: f64,
    beta_orig: f64,
    se_gamma: f64,
}

// ============================================================================
// SIMULTANEOUS AUGMENTED MODEL FIT via IRLS
// ============================================================================
fn fit_logit_augmented(
    x_design: &DMatrix<f64>,
    y: &DVector<f64>,
) -> Result<AugmentedFitResult, String> {
    let rows = x_design.nrows();
    let total_cols = x_design.ncols();

    let mut beta = DVector::zeros(total_cols);
    let max_iter = 30;
    let tolerance = 1e-6;
    let prob_min = 1e-10;
    let prob_max = 1.0 - 1e-10;

    for iter in 0..max_iter {
        let linear_pred = x_design * &beta;

        let pi: DVector<f64> = linear_pred.map(|val| {
            (1.0 / (1.0 + (-val).exp())).max(prob_min).min(prob_max)
        });

        let w_diag: DVector<f64> = pi.map(|p| (p * (1.0 - p)).max(1e-10));

        let residuals = y - &pi;

        let gradient = x_design.transpose() * &residuals;

        let mut hessian = DMatrix::zeros(total_cols, total_cols);
        for r in 0..total_cols {
            for c in r..total_cols {
                let mut sum = 0.0;
                for i in 0..rows {
                    sum += x_design[(i, r)] * x_design[(i, c)] * w_diag[i];
                }
                hessian[(r, c)] = sum;
                if r != c {
                    hessian[(c, r)] = sum;
                }
            }
        }

        // Ridge for numerical stability
        for j in 0..total_cols {
            hessian[(j, j)] += 1e-8;
        }

        match hessian.clone().try_inverse() {
            Some(inv_hessian) => {
                let step = &inv_hessian * &gradient;
                beta = &beta + &step;

                let max_step = step.iter().map(|v| v.abs()).fold(0.0f64, f64::max);

                if max_step < tolerance || iter == max_iter - 1 {
                    let se: DVector<f64> = DVector::from_iterator(
                        total_cols,
                        (0..total_cols).map(|j| {
                            let v = inv_hessian[(j, j)];
                            if v > 0.0 { v.sqrt() } else { f64::NAN }
                        }),
                    );
                    return Ok(AugmentedFitResult { beta, se });
                }
            }
            None => {
                return Err("Singular Hessian matrix in augmented model".into());
            }
        }
    }

    Err("Augmented model did not converge".into())
}

// ============================================================================
// PER-VARIABLE FALLBACK FIT
// ============================================================================
fn fit_per_variable(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    cols: usize,
    rows: usize,
    interaction_col: &DVector<f64>,
    original_var_idx: usize,
) -> Result<PerVariableFitResult, String> {
    let total_cols = 1 + cols + 1;
    let mut x_design = DMatrix::zeros(rows, total_cols);

    for r in 0..rows {
        x_design[(r, 0)] = 1.0;
    }
    for j in 0..cols {
        for r in 0..rows {
            x_design[(r, 1 + j)] = x[(r, j)];
        }
    }
    for r in 0..rows {
        x_design[(r, total_cols - 1)] = interaction_col[r];
    }

    let interaction_idx = total_cols - 1;
    let original_idx = 1 + original_var_idx;

    let fit = fit_logit_augmented(&x_design, y)?;

    Ok(PerVariableFitResult {
        gamma: fit.beta[interaction_idx],
        beta_orig: fit.beta[original_idx],
        se_gamma: fit.se[interaction_idx],
    })
}

// ============================================================================
// Standard Normal CDF (Abramowitz & Stegun approximation)
// ============================================================================
fn standard_normal_cdf(x: f64) -> f64 {
    if x < -8.0 { return 0.0; }
    if x > 8.0 { return 1.0; }

    let z_abs = x.abs();
    let t = 1.0 / (1.0 + 0.2316419 * z_abs);
    let d = 0.3989422804014337 * (-z_abs * z_abs / 2.0).exp();
    let prob = d
        * t
        * (0.319381530
            + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));

    if x >= 0.0 { 1.0 - prob } else { prob }
}

/// Menghitung Pearson Correlation Matrix
pub fn calculate_correlation_matrix(
    x: &DMatrix<f64>,
    feature_names: &[String],
) -> Result<Vec<CorrelationRow>, String> {
    let (rows, cols) = x.shape();
    if rows < 2 {
        return Err("Not enough data points".to_string());
    }

    let mut result_rows = Vec::new();

    // 1. Hitung Mean dan Standar Deviasi untuk setiap kolom
    let mut means = Vec::new();
    let mut std_devs = Vec::new();

    for j in 0..cols {
        let col = x.column(j);
        let mean = col.mean();
        let variance = col.iter().map(|&v| (v - mean).powi(2)).sum::<f64>() / ((rows - 1) as f64);
        let std_dev = variance.sqrt();

        means.push(mean);
        std_devs.push(std_dev);
    }

    // 2. Hitung Korelasi (Pairwise)
    for i in 0..cols {
        let mut row_values = Vec::new();

        for j in 0..cols {
            if i == j {
                row_values.push(1.0); // Korelasi dengan diri sendiri = 1
            } else {
                let col_i = x.column(i);
                let col_j = x.column(j);

                let mean_i = means[i];
                let mean_j = means[j];
                let sd_i = std_devs[i];
                let sd_j = std_devs[j];

                // Covariance formula: sum((x - mean_x) * (y - mean_y)) / (n-1)
                let covariance: f64 = col_i
                    .iter()
                    .zip(col_j.iter())
                    .map(|(&val_i, &val_j)| (val_i - mean_i) * (val_j - mean_j))
                    .sum::<f64>()
                    / ((rows - 1) as f64);

                // Correlation formula: Covariance / (SD_x * SD_y)
                let corr = if sd_i.abs() < 1e-9 || sd_j.abs() < 1e-9 {
                    0.0 // Avoid division by zero if variance is 0
                } else {
                    covariance / (sd_i * sd_j)
                };

                // Clamp value to range [-1, 1] to handle precision errors
                row_values.push(corr.max(-1.0).min(1.0));
            }
        }

        result_rows.push(CorrelationRow {
            variable: feature_names[i].clone(),
            values: row_values,
        });
    }

    Ok(result_rows)
}
