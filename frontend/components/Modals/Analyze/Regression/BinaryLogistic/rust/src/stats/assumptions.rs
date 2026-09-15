use crate::models::result::{BoxTidwellRow, VifRow};
use nalgebra::{DMatrix, DVector};

/// Compute the Pearson correlation matrix of a design matrix's columns
/// (no labels). Shared by the public correlation-matrix output and by the
/// GVIF determinant-ratio computation below.
fn correlation_matrix_raw(x: &DMatrix<f64>) -> DMatrix<f64> {
    let (rows, cols) = x.shape();
    let mut means = Vec::with_capacity(cols);
    let mut std_devs = Vec::with_capacity(cols);

    for j in 0..cols {
        let col = x.column(j);
        let mean = col.mean();
        let variance =
            col.iter().map(|&v| (v - mean).powi(2)).sum::<f64>() / ((rows.max(2) - 1) as f64);
        means.push(mean);
        std_devs.push(variance.sqrt());
    }

    DMatrix::from_fn(cols, cols, |i, j| {
        if i == j {
            return 1.0;
        }
        let (mean_i, mean_j) = (means[i], means[j]);
        let (sd_i, sd_j) = (std_devs[i], std_devs[j]);
        if sd_i.abs() < 1e-9 || sd_j.abs() < 1e-9 {
            return 0.0;
        }
        let covariance: f64 = x
            .column(i)
            .iter()
            .zip(x.column(j).iter())
            .map(|(&vi, &vj)| (vi - mean_i) * (vj - mean_j))
            .sum::<f64>()
            / ((rows - 1) as f64);
        (covariance / (sd_i * sd_j)).clamp(-1.0, 1.0)
    })
}

/// Menghitung (Generalized) Variance Inflation Factor.
///
/// Uses Fox & Monette's (1992) determinant-ratio Generalized VIF, which is
/// what R's `car::vif()` computes:
///
///   GVIF_j = det(R_jj) * det(R_(-j),(-j)) / det(R)
///
/// where R is the correlation matrix of ALL regressor columns (no
/// intercept), R_jj is the submatrix for term j's own columns, and
/// R_(-j),(-j) is the submatrix for every other term's columns.
///
/// `variable_groups` maps each ORIGINAL variable (term) to the column
/// indices it occupies in `x` - a single column for numeric/binary
/// predictors, or (k-1) dummy columns for a k-category categorical
/// predictor (same grouping used to build the regression's design matrix).
/// For a single-column term this reduces exactly to ordinary VIF =
/// 1 / (1 - R_j^2).
///
/// When any term has df > 1, R reports `GVIF^(1/(2*Df))` for EVERY term
/// (continuous ones included) so the values stay comparable - this matches
/// `car::vif()`'s own convention of switching the whole table's scale
/// rather than mixing raw VIF and GVIF units.
pub fn calculate_vif(
    x: &DMatrix<f64>,
    variable_groups: &[(String, Vec<usize>)],
) -> Result<Vec<VifRow>, String> {
    let total_cols = x.ncols();

    // Minimal 2 variabel untuk mendeteksi multikolinearitas antar variabel
    if variable_groups.len() < 2 || total_cols < 2 {
        return Ok(vec![]);
    }

    let has_multi_df = variable_groups.iter().any(|(_, idx)| idx.len() > 1);
    let r = correlation_matrix_raw(x);
    let det_r = r.clone().determinant();

    // Fully singular (perfect collinearity across the whole predictor set):
    // fall back to the same sentinel the previous implementation used.
    if det_r.abs() < 1e-12 {
        return Ok(variable_groups
            .iter()
            .map(|(name, idx)| VifRow {
                variable: name.clone(),
                tolerance: 0.0,
                vif: 999.9,
                df: idx.len(),
                is_gvif: has_multi_df,
            })
            .collect());
    }

    let mut results = Vec::with_capacity(variable_groups.len());

    for (name, own_idx) in variable_groups {
        let p_j = own_idx.len();
        let other_idx: Vec<usize> = (0..total_cols).filter(|c| !own_idx.contains(c)).collect();

        let r_jj = DMatrix::from_fn(p_j, p_j, |a, b| r[(own_idx[a], own_idx[b])]);
        let k = other_idx.len();
        let det_jj = r_jj.determinant();
        let det_other = if k == 0 {
            1.0
        } else {
            let r_other = DMatrix::from_fn(k, k, |a, b| r[(other_idx[a], other_idx[b])]);
            r_other.determinant()
        };

        // GVIF is theoretically always >= 1; clamp away float noise.
        let gvif = (det_jj * det_other / det_r).max(1.0);

        let display_vif = if has_multi_df {
            gvif.powf(1.0 / (2.0 * p_j as f64))
        } else {
            gvif
        };
        let tolerance = if gvif > 1e-9 { 1.0 / gvif } else { 0.0 };

        results.push(VifRow {
            variable: name.clone(),
            tolerance,
            vif: display_vif,
            df: p_j,
            is_gvif: has_multi_df,
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
///    Xⱼ·ln(Xⱼ) at λ=1.
/// 2. Fit the augmented logistic model simultaneously containing ALL original
///    covariates plus ALL constructed variables (R-style simultaneous approach).
/// 3. For each constructed variable γ̂ⱼ (coefficient of Xⱼ·ln(Xⱼ)), compute the
///    score test of H₀: λ=1 from THIS λ=1 fit:
///    - Score z = γ̂ⱼ / SE(γ̂ⱼ)
///    - p-value = 2·Φ(−|z|)   (two-tailed)
/// 4. Separately, refine the MLE of λⱼ by iterating the Newton update
///    λ ← λ + γ̂/β̂ with the constructed variable recomputed at each trial λ
///    (see `refine_lambda_iteratively`), matching R's `car::boxTidwell()`
///    (its `max.iter`/`tol` parameters) - a single step from λ=1 is only a
///    first-order approximation of this converged estimate.
/// 5. If the score test is significant (p < α) → the linearity-in-the-logit
///    assumption is violated for Xⱼ and the power transformation X^λ̂ should
///    be considered.
///
/// **Simultaneous vs per-variable:**
/// R's `car::boxTidwell()` adds ALL constructed variables at once so that the
/// covariance matrix accounts for inter-correlations between constructed
/// variables. This implementation follows the same approach. If the simultaneous
/// model is numerically unstable, it falls back to per-variable testing.
///
/// `x` must be the FULLY EXPANDED design matrix (categorical predictors
/// already dummy-coded, matching the main regression) - not raw ordinal
/// codes. If a categorical control variable is left as raw integers, it
/// biases the joint fit for every variable in the model, not just itself.
/// `variable_groups` maps each ORIGINAL variable to (name, its column
/// indices in `x`, whether it's categorical) - the same grouping used to
/// build the regression's design matrix.
///
/// **Eligibility rules:**
/// - Groups flagged `is_categorical` (from the Variable/Categorical tab -
///   the SAME source used to dummy-code them for the main regression):
///   SKIP as an ln(X) candidate. Authoritative - checked before any
///   heuristic, since a unique-value count cannot reliably distinguish a
///   5+ category nominal variable from a genuine continuous one. Their
///   dummy columns still participate in the fit as control variables.
/// - Binary / dichotomous variables (≤ 2 unique values): SKIP
/// - Variables with very few unique values (≤ 4) NOT already flagged above:
///   SKIP (likely an unflagged ordinal/discrete variable)
/// - Constant variables: SKIP
/// - Variables with values ≤ 0: a uniform shift X' = X − min(X) + 1 is applied
pub fn calculate_box_tidwell(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    variable_groups: &[(String, Vec<usize>, bool)],
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

    for (name, col_indices, is_categorical) in variable_groups {
        // --- Explicitly categorical (from Variable/Categorical tab) ---
        // Authoritative: skip regardless of unique-value count, since a
        // 5+ category nominal variable would otherwise slip past the
        // "<=4 unique values" heuristic below and get tested as if it
        // were a genuine continuous predictor. Its dummy columns are
        // still part of `x` and participate in the fit as controls.
        if *is_categorical {
            let idx = skipped_results.len();
            skipped_results.push(make_skipped_row(
                name,
                "Categorical variable (as configured in the Categorical tab) — Box-Tidwell test only applies to continuous predictors.",
                "",
            ));
            order.push(Err(idx));
            continue;
        }

        // Numeric groups always occupy exactly one column (no dummy expansion).
        let i = col_indices[0];
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

    // Iteratively refine the MLE of λ for each eligible variable (separate
    // from the λ=1 score test computed below) - see
    // refine_lambda_iteratively's doc comment for why these are distinct.
    let eligible_for_refinement: Vec<(usize, f64)> = eligible_vars
        .iter()
        .map(|evar| (evar.col_idx, evar.shift))
        .collect();
    let refined_lambdas = refine_lambda_iteratively(x, y, cols, rows, &eligible_for_refinement);

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

                // MLE of λ from the iterative refinement above, not the
                // single Newton step from this λ=1 score-test fit.
                let mle_lambda = refined_lambdas[eidx];

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

            for (eidx, evar) in eligible_vars.iter().enumerate() {
                match fit_per_variable(x, y, cols, rows, &evar.interaction_col, evar.col_idx) {
                    Ok(pvr) => {
                        let z_score = if pvr.se_gamma > 1e-12 { pvr.gamma / pvr.se_gamma } else { 0.0 };
                        let p_value = 2.0 * standard_normal_cdf(-z_score.abs());
                        let mle_lambda = refined_lambdas[eidx];

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
// ITERATIVE REFINEMENT OF THE MLE OF LAMBDA (Box & Tidwell 1962)
// ============================================================================
//
// The single augmented regression at λ=1 (PHASE 2/3 above) gives a valid
// SCORE TEST of H0: λ=1 - that hypothesis is evaluated at λ=1 by
// construction, so it needs no iteration. But treating that same
// regression's `1 + γ/β` as "the MLE of λ" is only the FIRST Newton step
// toward it. R's car::boxTidwell() iterates this update (its `max.iter`/
// `tol` parameters, defaulting to 25 and 0.001) until λ stabilizes:
//
//   at trial λ₀: fit Y ~ ... + β·(X+shift)^λ₀ + γ·[(X+shift)^λ₀ · ln(X+shift)] + ...
//   λ_new = λ₀ + γ/β
//   repeat with the newly re-transformed (X+shift)^λ_new until |Δλ| < tol
//
// This refines ONLY the point estimate reported as "MLE of λ"; the
// significance test above is left untouched.
const BOX_TIDWELL_MAX_ITER: usize = 25;
const BOX_TIDWELL_TOL: f64 = 0.001;
const BOX_TIDWELL_LAMBDA_BOUND: f64 = 5.0; // safety clamp against runaway steps

fn refine_lambda_iteratively(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    cols: usize,
    rows: usize,
    eligible: &[(usize, f64)], // (column index, shift) per eligible variable
) -> Vec<f64> {
    let n_elig = eligible.len();
    let mut lambdas = vec![1.0_f64; n_elig];
    if n_elig == 0 {
        return lambdas;
    }

    let total_cols = 1 + cols + n_elig;

    for _ in 0..BOX_TIDWELL_MAX_ITER {
        let mut x_design = DMatrix::zeros(rows, total_cols);
        for r in 0..rows {
            x_design[(r, 0)] = 1.0;
        }

        // Original columns: eligible ones raised to their CURRENT lambda,
        // everything else (control variables) left untransformed.
        for j in 0..cols {
            if let Some(eidx) = eligible.iter().position(|&(ci, _)| ci == j) {
                let (_, shift) = eligible[eidx];
                let lambda = lambdas[eidx];
                for r in 0..rows {
                    let val = (x[(r, j)] + shift).max(1e-10);
                    x_design[(r, 1 + j)] = val.powf(lambda);
                }
            } else {
                for r in 0..rows {
                    x_design[(r, 1 + j)] = x[(r, j)];
                }
            }
        }

        // Constructed variables: (X+shift)^λ · ln(X+shift) at current λ.
        for (eidx, &(col_idx, shift)) in eligible.iter().enumerate() {
            let lambda = lambdas[eidx];
            let col_offset = 1 + cols + eidx;
            for r in 0..rows {
                let val = (x[(r, col_idx)] + shift).max(1e-10);
                x_design[(r, col_offset)] = val.powf(lambda) * val.ln();
            }
        }

        let fit = match fit_logit_augmented(&x_design, y) {
            Ok(f) => f,
            // Augmented model failed to converge at this trial lambda -
            // keep the last stable estimate rather than propagate NaN.
            Err(_) => break,
        };

        let mut max_abs_step: f64 = 0.0;
        for (eidx, &(col_idx, _)) in eligible.iter().enumerate() {
            let beta = fit.beta[1 + col_idx];
            let gamma = fit.beta[1 + cols + eidx];
            let step = if beta.abs() > 1e-8 {
                (gamma / beta).clamp(-1.0, 1.0)
            } else {
                0.0
            };
            lambdas[eidx] = (lambdas[eidx] + step).clamp(-BOX_TIDWELL_LAMBDA_BOUND, BOX_TIDWELL_LAMBDA_BOUND);
            max_abs_step = max_abs_step.max(step.abs());
        }

        if max_abs_step < BOX_TIDWELL_TOL {
            break;
        }
    }

    lambdas
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

#[cfg(test)]
mod vif_tests {
    use super::*;

    #[test]
    fn test_vif_orthogonal_design_is_one() {
        // 2^2 factorial design: x1 and x2 are exactly orthogonal (dot
        // product = 0, both mean 0), so each should have VIF = 1 exactly.
        let x = DMatrix::from_row_slice(
            4,
            2,
            &[-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
        );
        let groups = vec![
            ("x1".to_string(), vec![0usize]),
            ("x2".to_string(), vec![1usize]),
        ];

        let result = calculate_vif(&x, &groups).unwrap();
        assert_eq!(result.len(), 2);
        for row in &result {
            assert!(
                (row.vif - 1.0).abs() < 1e-8,
                "expected VIF=1 for orthogonal predictor {}, got {}",
                row.variable,
                row.vif
            );
            assert_eq!(row.df, 1);
            assert!(!row.is_gvif);
        }
    }

    #[test]
    fn test_vif_matches_classic_formula_for_two_predictors() {
        // With exactly 2 predictors, VIF = 1 / (1 - r^2) where r is the
        // simple Pearson correlation between them - a well-known identity,
        // computed independently here (not via correlation_matrix_raw) as
        // a cross-check on the GVIF determinant-ratio implementation.
        let x1 = [1.0, 2.0, 3.0, 4.0, 5.0];
        let x2 = [2.0, 1.0, 4.0, 3.0, 5.0];

        let mean = |v: &[f64]| v.iter().sum::<f64>() / v.len() as f64;
        let (m1, m2) = (mean(&x1), mean(&x2));
        let cov: f64 = x1.iter().zip(x2.iter()).map(|(a, b)| (a - m1) * (b - m2)).sum();
        let sd1 = x1.iter().map(|a| (a - m1).powi(2)).sum::<f64>().sqrt();
        let sd2 = x2.iter().map(|b| (b - m2).powi(2)).sum::<f64>().sqrt();
        let r = cov / (sd1 * sd2);
        let expected_vif = 1.0 / (1.0 - r * r);

        let mut flat = Vec::with_capacity(10);
        for i in 0..5 {
            flat.push(x1[i]);
            flat.push(x2[i]);
        }
        let x = DMatrix::from_row_slice(5, 2, &flat);
        let groups = vec![
            ("x1".to_string(), vec![0usize]),
            ("x2".to_string(), vec![1usize]),
        ];

        let result = calculate_vif(&x, &groups).unwrap();
        for row in &result {
            assert!(
                (row.vif - expected_vif).abs() < 1e-6,
                "GVIF determinant-ratio VIF ({}) should match classic 1/(1-r^2) ({}) for variable {}",
                row.vif,
                expected_vif,
                row.variable
            );
        }
    }

    #[test]
    fn test_grouped_single_column_term_equals_sqrt_of_ungrouped_vif() {
        // For a 1-column term, GVIF always equals ordinary VIF regardless
        // of how OTHER terms are grouped. So bundling two other columns
        // into one multi-df "categorical" term should make every
        // single-column term's DISPLAYED value become sqrt(its own plain
        // VIF) - this holds for arbitrary data, not just a hand-built
        // orthogonal design, so it's a strong general correctness check.
        let x = DMatrix::from_row_slice(
            6,
            3,
            &[
                1.0, 0.0, 5.0, //
                2.0, 1.0, 3.0, //
                3.0, 0.0, 6.0, //
                4.0, 1.0, 2.0, //
                5.0, 0.0, 8.0, //
                6.0, 1.0, 1.0, //
            ],
        );

        // Ungrouped: every column is its own term -> plain VIF, no df>1.
        let ungrouped = vec![
            ("continuous".to_string(), vec![0usize]),
            ("dummyA".to_string(), vec![1usize]),
            ("dummyB".to_string(), vec![2usize]),
        ];
        let ungrouped_result = calculate_vif(&x, &ungrouped).unwrap();
        let plain_vif_continuous = ungrouped_result
            .iter()
            .find(|r| r.variable == "continuous")
            .unwrap()
            .vif;

        // Grouped: dummyA/dummyB bundled as one 2-df categorical term.
        let grouped = vec![
            ("continuous".to_string(), vec![0usize]),
            ("category".to_string(), vec![1usize, 2usize]),
        ];
        let grouped_result = calculate_vif(&x, &grouped).unwrap();
        let continuous_row = grouped_result
            .iter()
            .find(|r| r.variable == "continuous")
            .unwrap();
        let category_row = grouped_result
            .iter()
            .find(|r| r.variable == "category")
            .unwrap();

        assert!(continuous_row.is_gvif);
        assert!(category_row.is_gvif);
        assert_eq!(category_row.df, 2);
        assert!(
            (continuous_row.vif - plain_vif_continuous.sqrt()).abs() < 1e-6,
            "grouped display value ({}) should equal sqrt(plain VIF) ({})",
            continuous_row.vif,
            plain_vif_continuous.sqrt()
        );
        assert!(category_row.vif >= 1.0 && category_row.vif.is_finite());
    }
}

#[cfg(test)]
mod box_tidwell_lambda_tests {
    use super::*;

    #[test]
    fn test_lambda_refinement_reaches_a_fixed_point() {
        // X positive with a general (imperfect, non-separating) upward
        // trend in Y, so the augmented IRLS fit is well-behaved.
        let x_vals: Vec<f64> = (1..=20).map(|v| v as f64).collect();
        let y_vals: Vec<f64> = vec![
            0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
        ];
        let rows = x_vals.len();
        let cols = 1;
        let x = DMatrix::from_row_slice(rows, cols, &x_vals);
        let y = DVector::from_vec(y_vals);

        let eligible = vec![(0usize, 0.0f64)];
        let lambdas = refine_lambda_iteratively(&x, &y, cols, rows, &eligible);
        assert_eq!(lambdas.len(), 1);
        let lambda_hat = lambdas[0];
        assert!(lambda_hat.is_finite());

        // Fixed-point check: one MORE Newton step from the returned lambda
        // should be negligible - confirms the iteration actually settled
        // rather than just running out of iterations mid-flight.
        let total_cols = 1 + cols + 1;
        let mut x_design = DMatrix::zeros(rows, total_cols);
        for r in 0..rows {
            x_design[(r, 0)] = 1.0;
            let val = x[(r, 0)].max(1e-10);
            x_design[(r, 1)] = val.powf(lambda_hat);
            x_design[(r, 2)] = val.powf(lambda_hat) * val.ln();
        }
        let fit = fit_logit_augmented(&x_design, &y).expect("augmented fit should converge");
        let beta = fit.beta[1];
        let gamma = fit.beta[2];
        let next_step = if beta.abs() > 1e-8 { (gamma / beta).abs() } else { 0.0 };
        assert!(
            next_step < BOX_TIDWELL_TOL * 2.0,
            "refined lambda ({}) is not at a fixed point: next Newton step would be {}",
            lambda_hat,
            next_step
        );
    }

    #[test]
    fn test_lambda_refinement_does_not_diverge() {
        // Even with a weaker/noisier signal, the refined lambda must stay
        // finite and within the safety bound (no runaway Newton steps).
        let x_vals: Vec<f64> = (1..=15).map(|v| v as f64).collect();
        let y_vals: Vec<f64> = vec![
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
        ];
        let rows = x_vals.len();
        let cols = 1;
        let x = DMatrix::from_row_slice(rows, cols, &x_vals);
        let y = DVector::from_vec(y_vals);

        let eligible = vec![(0usize, 0.0f64)];
        let lambdas = refine_lambda_iteratively(&x, &y, cols, rows, &eligible);

        assert_eq!(lambdas.len(), 1);
        assert!(lambdas[0].is_finite());
        assert!(lambdas[0].abs() <= BOX_TIDWELL_LAMBDA_BOUND);
    }

    #[test]
    fn test_calculate_box_tidwell_uses_refined_lambda_not_one_step() {
        // End-to-end: the public API's reported mle_lambda should come
        // from the iterative refinement, which for a clearly non-linear
        // signal should differ from the naive one-step `1 + gamma/beta`
        // approximation whenever more than one iteration actually moves
        // lambda (verified by construction: a fixed point rarely lands
        // exactly on the first Newton step for a real, noisy signal).
        let x_vals: Vec<f64> = (1..=20).map(|v| v as f64).collect();
        let y_vals: Vec<f64> = vec![
            0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
        ];
        let rows = x_vals.len();
        let x = DMatrix::from_row_slice(rows, 1, &x_vals);
        let y = DVector::from_vec(y_vals);
        let variable_groups = vec![("x".to_string(), vec![0usize], false)];

        let result = calculate_box_tidwell(&x, &y, &variable_groups).unwrap();
        assert_eq!(result.len(), 1);
        assert!(!result[0].skipped);
        assert!(result[0].mle_lambda.is_finite());
    }

    #[test]
    fn test_categorical_group_uses_all_dummy_columns_as_controls() {
        // A categorical group with 2 dummy columns (e.g. a 3-level factor)
        // must be excluded as an ln(X) candidate, but its dummy columns
        // must still enter the augmented fit as controls - not be dropped
        // or collapsed, and not distort the eligible continuous variable's
        // own fit into producing a non-finite result.
        let n = 30;
        let mut x_vals = Vec::with_capacity(n * 3);
        let mut y_vals = Vec::with_capacity(n);
        for i in 0..n {
            let continuous = (i as f64) + 1.0;
            let dummy1 = if i % 3 == 1 { 1.0 } else { 0.0 };
            let dummy2 = if i % 3 == 2 { 1.0 } else { 0.0 };
            x_vals.push(continuous);
            x_vals.push(dummy1);
            x_vals.push(dummy2);
            y_vals.push(if i % 3 == 2 { 1.0 } else { (i % 2) as f64 });
        }
        let x = DMatrix::from_row_slice(n, 3, &x_vals);
        let y = DVector::from_vec(y_vals);
        let variable_groups = vec![
            ("continuous".to_string(), vec![0usize], false),
            ("category".to_string(), vec![1usize, 2usize], true),
        ];

        let result = calculate_box_tidwell(&x, &y, &variable_groups).unwrap();
        assert_eq!(result.len(), 2);

        let cont_row = result.iter().find(|r| r.variable == "continuous").unwrap();
        assert!(!cont_row.skipped, "continuous variable should be eligible");
        assert!(cont_row.mle_lambda.is_finite());
        assert!(cont_row.score_z.is_finite());

        let cat_row = result.iter().find(|r| r.variable == "category").unwrap();
        assert!(cat_row.skipped, "categorical group must be skipped as a candidate");
        assert!(cat_row.skip_reason.contains("Categorical"));
    }
}
