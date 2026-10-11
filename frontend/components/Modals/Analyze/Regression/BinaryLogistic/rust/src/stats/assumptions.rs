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

/// Convert a covariance matrix to a correlation matrix (R's `cov2cor()`):
/// divide each entry by the geometric mean of its row/column variances.
fn cov_to_cor(v: &DMatrix<f64>) -> DMatrix<f64> {
    let n = v.nrows();
    let sd: Vec<f64> = (0..n).map(|i| v[(i, i)].max(0.0).sqrt()).collect();
    DMatrix::from_fn(n, n, |i, j| {
        if i == j {
            return 1.0;
        }
        if sd[i].abs() < 1e-12 || sd[j].abs() < 1e-12 {
            return 0.0;
        }
        (v[(i, j)] / (sd[i] * sd[j])).clamp(-1.0, 1.0)
    })
}

// ----------------------------------------------------------------------------
// R-faithful logistic fit (stats::glm.fit) - the source of vcov(model)
// ----------------------------------------------------------------------------

/// `.Machine$double.eps`; R's `binomial()` clamps `linkinv()`/`mu.eta()` with it.
const R_DBL_EPSILON: f64 = f64::EPSILON;

/// `binomial(link = "logit")$linkinv(eta)`, evaluated like R's C routine:
/// `exp(eta)` is replaced by eps (or 1/eps) beyond |eta| = 30.
fn r_logit_linkinv(eta: f64) -> f64 {
    let t = if eta < -30.0 {
        R_DBL_EPSILON
    } else if eta > 30.0 {
        1.0 / R_DBL_EPSILON
    } else {
        eta.exp()
    };
    t / (1.0 + t)
}

/// `binomial(link = "logit")$mu.eta(eta)` = dmu/deta, eps outside |eta| <= 30.
fn r_logit_mu_eta(eta: f64) -> f64 {
    if eta.abs() > 30.0 {
        R_DBL_EPSILON
    } else {
        let e = eta.exp();
        e / ((1.0 + e) * (1.0 + e))
    }
}

/// `sum(binomial()$dev.resids(y, mu, 1))` for a 0/1 response.
fn r_binomial_deviance(y: &DVector<f64>, mu: &DVector<f64>) -> f64 {
    let y_log_y = |y: f64, mu: f64| if y != 0.0 { y * (y / mu).ln() } else { 0.0 };
    y.iter()
        .zip(mu.iter())
        .map(|(&yi, &mi)| 2.0 * (y_log_y(yi, mi) + y_log_y(1.0 - yi, 1.0 - mi)))
        .sum()
}

/// Reproduces `stats::glm.fit()` for `binomial(link = "logit")` under R's
/// default `glm.control()` (epsilon = 1e-8, maxit = 25) and returns
/// `vcov(model)` exactly as R reports it - the matrix `car::vif()` reads.
///
/// That matrix is NOT the information matrix at the final coefficients.
/// glm.fit stops as soon as |dev - devold| / (|dev| + 0.1) < epsilon and keeps
/// the QR / working weights of the iteration that *produced* the returned
/// coefficients, i.e. weights evaluated one Fisher-scoring step earlier. So
/// `vcov(model)` = (X'WX)^-1 with a slightly stale W, and R's GVIF differs from
/// the fully converged value in the 4th-5th significant digit (on the
/// HR-Attrition data R stops after 5 iterations: Age 1.7366 in R vs 1.7365
/// converged, which prints as 1.737 vs 1.736). Iterating to full convergence
/// is the more exact number but is not what R prints, so mirror R step for
/// step: same `mustart`, same weighted least squares via Householder QR
/// (`Cdqrls`), same deviance stopping rule.
///
/// Returns `Err` wherever R itself would leave the well-behaved path
/// (aliased column, step-halving, non-convergence); the caller then falls
/// back to the fully converged `fit_logit_augmented`.
fn glm_fit_vcov_like_r(x_design: &DMatrix<f64>, y: &DVector<f64>) -> Result<DMatrix<f64>, String> {
    const EPSILON: f64 = 1e-8; // glm.control(epsilon)
    const MAX_ITER: usize = 25; // glm.control(maxit)
    const QR_TOL: f64 = 1e-11; // min(1e-7, epsilon / 1000): Cdqrls' rank tolerance

    let (n, p) = x_design.shape();
    if n <= p {
        return Err("too few observations for the glm.fit emulation".into());
    }

    // family$initialize (prior weights = 1): mustart = (y + 0.5) / 2, then
    // eta = linkfun(mustart) and mu = linkinv(eta).
    let mut eta = y.map(|yi| {
        let mustart = (yi + 0.5) / 2.0;
        (mustart / (1.0 - mustart)).ln()
    });
    let mut mu = eta.map(r_logit_linkinv);
    let mut dev_old = r_binomial_deviance(y, &mu);

    let mut r_last: Option<DMatrix<f64>> = None;
    let mut converged = false;

    for _ in 0..MAX_ITER {
        // Working response z and working weights w = sqrt(mu.eta^2 / V(mu)),
        // both evaluated at the CURRENT (pre-update) eta / mu.
        let mu_eta = eta.map(r_logit_mu_eta);
        let w = DVector::from_iterator(
            n,
            (0..n).map(|i| (mu_eta[i] * mu_eta[i] / (mu[i] * (1.0 - mu[i]))).sqrt()),
        );
        let zw = DVector::from_iterator(
            n,
            (0..n).map(|i| (eta[i] + (y[i] - mu[i]) / mu_eta[i]) * w[i]),
        );
        let xw = DMatrix::from_fn(n, p, |i, j| x_design[(i, j)] * w[i]);

        // Weighted least squares through Householder QR, like R's Cdqrls.
        let col_norms: Vec<f64> = (0..p).map(|j| xw.column(j).norm()).collect();
        let qr = xw.qr();
        let r = qr.r();
        if (0..p).any(|j| !(r[(j, j)].abs() > QR_TOL * col_norms[j])) {
            return Err("aliased (rank-deficient) design column".into());
        }
        let mut qtz = zw;
        qr.q_tr_mul(&mut qtz);
        let coef = r
            .solve_upper_triangular(&qtz.rows(0, p))
            .ok_or_else(|| "singular R factor".to_string())?;
        if coef.iter().any(|c| !c.is_finite()) {
            return Err("non-finite coefficients".into());
        }

        eta = x_design * &coef;
        mu = eta.map(r_logit_linkinv);
        let dev = r_binomial_deviance(y, &mu);
        // This is where glm.fit would start step-halving (divergence, fitted
        // probabilities at 0/1); not reproduced - use the fallback instead.
        if !dev.is_finite() || mu.iter().any(|&m| !(m > 0.0 && m < 1.0)) {
            return Err("fit left the valid region (possible separation)".into());
        }

        r_last = Some(r); // keeps the QR of the iteration that produced `coef`
        if (dev - dev_old).abs() / (dev.abs() + 0.1) < EPSILON {
            converged = true;
            break;
        }
        dev_old = dev;
    }

    if !converged {
        return Err("glm.fit emulation did not converge".into());
    }

    // summary.glm(): covmat.unscaled = chol2inv(R) = (R'R)^-1 (dispersion = 1
    // for the binomial family).
    let r = r_last.ok_or_else(|| "no QR factor was produced".to_string())?;
    let r_inv = r
        .solve_upper_triangular(&DMatrix::identity(p, p))
        .ok_or_else(|| "singular R factor".to_string())?;
    Ok(&r_inv * r_inv.transpose())
}

/// Build the weighted correlation matrix R's `car::vif()` actually uses for
/// a fitted GLM: `cov2cor(vcov(model)[-intercept, -intercept])`, where
/// `vcov(model) = (X'WX)^-1` and W = diag(p̂ᵢ(1-p̂ᵢ)) comes from THIS
/// logistic fit (Fox & Monette 1992's Generalized VIF, generalized to GLMs
/// via the model's own Fisher information - not the plain correlation of
/// X, which is only equivalent to this for an OLS/lm fit where W = I).
///
/// `vcov(model)` is taken from `glm_fit_vcov_like_r` so the numbers agree with
/// R at printed precision (see its docs for why that differs from the fully
/// converged information matrix in the 3rd decimal). If that emulation cannot
/// be used, the fully converged `fit_logit_augmented` is used instead.
fn weighted_correlation_from_fit(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
) -> Result<DMatrix<f64>, String> {
    let (rows, cols) = x.shape();
    let mut x_design = DMatrix::zeros(rows, 1 + cols);
    for r in 0..rows {
        x_design[(r, 0)] = 1.0;
        for c in 0..cols {
            x_design[(r, 1 + c)] = x[(r, c)];
        }
    }

    let vcov = match glm_fit_vcov_like_r(&x_design, y) {
        Ok(vcov) => vcov,
        Err(_) => fit_logit_augmented(&x_design, y)?.vcov,
    };
    // Drop the intercept row/col, same as car::vif()'s `v[-1, -1]`.
    let v = vcov.view((1, 1), (cols, cols)).into_owned();
    Ok(cov_to_cor(&v))
}

// ----------------------------------------------------------------------------
// Exact linear dependencies (aliased columns)
// ----------------------------------------------------------------------------

/// Relative size below which a design column counts as an exact linear
/// combination of the columns before it: R's `lm.fit`/`glm.fit` default
/// (`tol = 1e-11` in `Cdqrls`), the rule that turns a coefficient into `NA`.
const ALIAS_TOL: f64 = 1e-11;

/// A column "takes part" in a dependency when it carries at least this share
/// of the dependent column's length (scale-free, so MonthlyRate-sized columns
/// and 0/1 dummies are judged alike).
const ALIAS_PARTICIPATION: f64 = 1e-6;

struct AliasScan {
    /// Columns R's glm would drop from the fit (NA coefficient): redundant
    /// given the columns before them.
    dropped: Vec<bool>,
    /// Dropped columns plus the earlier columns they are an exact combination
    /// of. A term touching one of these has no finite (G)VIF.
    involved: Vec<bool>,
}

/// Finds the exact linear dependencies among the columns of `x` and the
/// (implicit) intercept, using the same rule as R: walk the columns in order
/// and drop each one that adds nothing to those before it (`|R_jj| <= 1e-11 *
/// ||x_j||` in the Householder QR). A column that never varies is therefore
/// aliased with the intercept, and of two identical columns the later one is
/// dropped.
fn find_aliased_columns(x: &DMatrix<f64>) -> AliasScan {
    let (n, p) = x.shape();
    let mut scan = AliasScan {
        dropped: vec![false; p],
        involved: vec![false; p],
    };
    // Too few rows for a full-column-rank design: nothing meaningful to scan
    // (the fit itself reports that case).
    if n <= p + 1 {
        return scan;
    }

    // Design columns still in play: 0 is the intercept, c + 1 is column c of `x`.
    let mut keep: Vec<usize> = (0..=p).collect();
    loop {
        let m = keep.len();
        let design = DMatrix::from_fn(n, m, |i, c| {
            if keep[c] == 0 {
                1.0
            } else {
                x[(i, keep[c] - 1)]
            }
        });
        let norms: Vec<f64> = (0..m).map(|c| design.column(c).norm()).collect();
        let r = design.qr().r();

        // First column (the intercept, 0, is never a candidate) that adds
        // numerically nothing to the ones before it.
        let Some(j) = (1..m).find(|&c| !(r[(c, c)].abs() > ALIAS_TOL * norms[c])) else {
            break;
        };

        // x_j = sum_k coef_k * x_k over the independent columns before it;
        // R_11 * coef = R_1j in the triangular factor.
        let r_before = r.view((0, 0), (j, j)).into_owned();
        let r_column = r.view((0, j), (j, 1)).into_owned();
        if let Some(coef) = r_before.solve_upper_triangular(&r_column) {
            for k in 1..j {
                if coef[k].abs() * norms[k] > ALIAS_PARTICIPATION * norms[j] {
                    scan.involved[keep[k] - 1] = true;
                }
            }
        }
        scan.dropped[keep[j] - 1] = true;
        scan.involved[keep[j] - 1] = true;
        keep.remove(j);
    }

    scan
}

/// Row for a term whose (G)VIF is infinite or cannot be computed. `999.9` is
/// the established "no finite value" marker the output formatter already
/// shows as problematic.
fn perfect_collinearity_row(name: &str, df: usize, is_gvif: bool) -> VifRow {
    VifRow {
        variable: name.to_string(),
        tolerance: 0.0,
        gvif: 999.9,
        vif: 999.9,
        df,
        is_gvif,
    }
}

/// Determinant of the principal submatrix of `r` on the rows/columns `idx`.
fn principal_minor(r: &DMatrix<f64>, idx: &[usize]) -> f64 {
    DMatrix::from_fn(idx.len(), idx.len(), |a, b| r[(idx[a], idx[b])]).determinant()
}

/// Given a (possibly weighted) correlation matrix `r` of the regressor
/// columns, compute the Fox & Monette (1992) determinant-ratio Generalized
/// VIF for each term:
///
///   GVIF_j = det(R_jj) * det(R_(-j),(-j)) / det(R)
///
/// `variable_groups` maps each term to the column indices it occupies in `r`
/// - a single column for numeric/binary predictors, or (k-1) dummy columns
/// for a k-category categorical predictor. For a single-column term this
/// reduces exactly to ordinary VIF = 1/(1-R_j^2). Columns of `r` that belong
/// to no listed term still count as the "other" regressors.
///
/// When `has_multi_df` is set (some term of the model has df > 1),
/// `GVIF^(1/(2*Df))` is reported for EVERY term (continuous ones included) so
/// the values stay comparable - matches `car::vif()`'s own convention of
/// switching the whole table's scale rather than mixing raw VIF and GVIF units.
///
/// There is deliberately NO "det(R) is tiny, so call everything singular"
/// cut-off. det(R) of the coefficient correlation matrix can fall far below
/// 1e-12 for a perfectly computable model - a few strongly collinear terms
/// are enough (HR-Attrition with the nested Department/JobRole factors:
/// det = 9e-18 yet cond(R) = 4e7, and car::vif() simply divides). Only a
/// determinant that is not positive and finite (numerically singular), or a
/// per-term value that round-off pushed clearly below its theoretical minimum
/// of 1, falls back to the 999.9 marker - for that term, or for all of them
/// when the matrix itself is unusable.
fn gvif_rows(
    r: &DMatrix<f64>,
    variable_groups: &[(String, Vec<usize>)],
    has_multi_df: bool,
) -> Vec<VifRow> {
    let total_cols = r.nrows();
    let det_r = r.determinant();
    let usable = det_r.is_finite() && det_r > 0.0;

    variable_groups
        .iter()
        .map(|(name, own_idx)| {
            let p_j = own_idx.len();

            let gvif = if usable {
                let other_idx: Vec<usize> =
                    (0..total_cols).filter(|c| !own_idx.contains(c)).collect();
                let det_other = if other_idx.is_empty() {
                    1.0
                } else {
                    principal_minor(r, &other_idx)
                };
                let g = principal_minor(r, own_idx) * det_other / det_r;
                // GVIF >= 1 (Fischer's inequality); a clearly smaller value
                // means round-off corrupted the determinants. Within 1e-3 of
                // 1 is just noise: clamp.
                (g.is_finite() && g >= 1.0 - 1e-3).then(|| g.max(1.0))
            } else {
                None
            };

            match gvif {
                Some(g) => VifRow {
                    variable: name.clone(),
                    tolerance: 1.0 / g,
                    gvif: g,
                    vif: if has_multi_df {
                        g.powf(1.0 / (2.0 * p_j as f64))
                    } else {
                        g
                    },
                    df: p_j,
                    is_gvif: has_multi_df,
                },
                None => perfect_collinearity_row(name, p_j, has_multi_df),
            }
        })
        .collect()
}

/// Menghitung (Generalized) Variance Inflation Factor untuk model regresi
/// logistik yang sesungguhnya di-fit (bukan aproksimasi linear/unweighted).
///
/// This now genuinely matches R's `car::vif()` applied to the actual fitted
/// `glm(family=binomial)` object: the correlation matrix is derived from
/// `vcov(model) = (X'WX)^-1`, W = diag(p̂ᵢ(1-p̂ᵢ)) from THIS logistic fit -
/// not from the plain correlation of X (that older approach is only
/// equivalent to `car::vif()` for an `lm`, where W = I; for a `glm` the two
/// diverge because W varies per observation).
///
/// `x` must be the FULLY EXPANDED design matrix (categorical predictors
/// already dummy-coded), matching the main regression. `variable_groups`
/// maps each ORIGINAL variable to its column indices in `x`, same grouping
/// used to build the regression's design matrix.
///
/// If the weighted fit fails to converge (e.g. near-perfect separation),
/// falls back to the plain correlation-of-X approximation rather than
/// failing the whole request - collinearity among predictors is still a
/// meaningful (if less precise) diagnostic even when the logistic fit
/// itself is unstable.
///
/// Exact linear dependencies (a column that is a combination of the others
/// or of the intercept) are handled the way R's glm handles them: the
/// redundant column gets no coefficient and is left out of the fit. R's
/// `car::vif()` then refuses to run at all; Statify instead reports every
/// term involved in the dependency as problematic (tolerance 0, 999.9) and
/// still computes all the other terms on the remaining model, so one
/// duplicated column does not blank out the whole table.
pub fn calculate_vif(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    variable_groups: &[(String, Vec<usize>)],
) -> Result<Vec<VifRow>, String> {
    // Minimal 2 variabel untuk mendeteksi multikolinearitas antar variabel
    if variable_groups.len() < 2 || x.ncols() < 2 {
        return Ok(vec![]);
    }
    let has_multi_df = variable_groups.iter().any(|(_, idx)| idx.len() > 1);

    // Terms touching an exact dependency have no finite (G)VIF; the dependent
    // columns themselves are dropped from the fit.
    let alias = find_aliased_columns(x);
    let blocked: Vec<bool> = variable_groups
        .iter()
        .map(|(_, idx)| idx.iter().any(|&c| alias.involved[c]))
        .collect();

    let kept: Vec<usize> = (0..x.ncols()).filter(|&c| !alias.dropped[c]).collect();
    let mut fit_index = vec![usize::MAX; x.ncols()];
    for (new, &old) in kept.iter().enumerate() {
        fit_index[old] = new;
    }
    // Dropped columns only ever belong to blocked terms, so every column of a
    // live term survives and has a position in the reduced design.
    let live_terms: Vec<(String, Vec<usize>)> = variable_groups
        .iter()
        .zip(&blocked)
        .filter(|(_, &is_blocked)| !is_blocked)
        .map(|((name, idx), _)| (name.clone(), idx.iter().map(|&c| fit_index[c]).collect()))
        .collect();

    let mut live_rows = Vec::new();
    if !live_terms.is_empty() {
        let x_fit = x.select_columns(kept.iter());
        let r = weighted_correlation_from_fit(&x_fit, y)
            .unwrap_or_else(|_| correlation_matrix_raw(&x_fit));
        live_rows = gvif_rows(&r, &live_terms, has_multi_df);
    }

    let mut live_rows = live_rows.into_iter();
    Ok(variable_groups
        .iter()
        .zip(&blocked)
        .map(|((name, idx), &is_blocked)| {
            if is_blocked {
                perfect_collinearity_row(name, idx.len(), has_multi_df)
            } else {
                live_rows.next().expect("one computed row per live term")
            }
        })
        .collect())
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
/// 4. If the score test is significant (p < α) → the linearity-in-the-logit
///    assumption is violated for Xⱼ and a power/log transformation (or
///    treating Xⱼ as categorical) should be considered.
///
/// Only the λ=1 score test is reported (Score Statistic, df, Sig.) - not a
/// separately-refined MLE of λ. That iterative estimate is only weakly
/// identified whenever the score test itself is non-significant (the data
/// can't distinguish λ=1 from nearby values), and is numerically unstable
/// near degenerate λ (X^λ → constant as λ→0), so it was dropped rather than
/// shown alongside a test that already answers the "linear or not" question.
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

                let interaction_label = if evar.shift > 0.0 {
                    format!("{} by ln({}+{:.1})", evar.name, evar.name, evar.shift)
                } else {
                    format!("{} by ln({})", evar.name, evar.name)
                };

                eligible_results.push(BoxTidwellRow {
                    variable: evar.name.clone(),
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

                        let interaction_label = if evar.shift > 0.0 {
                            format!("{} by ln({}+{:.1})", evar.name, evar.name, evar.shift)
                        } else {
                            format!("{} by ln({})", evar.name, evar.name)
                        };

                        eligible_results.push(BoxTidwellRow {
                            variable: evar.name.clone(),
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
    vcov: DMatrix<f64>,
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
                    return Ok(AugmentedFitResult { beta, se, vcov: inv_hessian });
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

#[cfg(test)]
mod vif_tests {
    use super::*;

    #[test]
    fn test_vif_orthogonal_design_is_one() {
        // 2^2 factorial design: x1 and x2 are exactly orthogonal (dot
        // product = 0, both mean 0), so each should have VIF = 1 exactly.
        //
        // Exercises the GVIF determinant-ratio math (gvif_rows)
        // directly on the unweighted X correlation - the weighted-fit path
        // (calculate_vif with a y) is covered separately below.
        let x = DMatrix::from_row_slice(
            4,
            2,
            &[-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0],
        );
        let groups = vec![
            ("x1".to_string(), vec![0usize]),
            ("x2".to_string(), vec![1usize]),
        ];

        let r = correlation_matrix_raw(&x);
        let result = gvif_rows(&r, &groups, false);
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
        // Exercises gvif_rows directly - see note above.
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

        let r = correlation_matrix_raw(&x);
        let result = gvif_rows(&r, &groups, false);
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

        let r = correlation_matrix_raw(&x);

        // Ungrouped: every column is its own term -> plain VIF, no df>1.
        let ungrouped = vec![
            ("continuous".to_string(), vec![0usize]),
            ("dummyA".to_string(), vec![1usize]),
            ("dummyB".to_string(), vec![2usize]),
        ];
        let ungrouped_result = gvif_rows(&r, &ungrouped, false);
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
        let grouped_result = gvif_rows(&r, &grouped, true);
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

    #[test]
    fn test_duplicate_column_design_degrades_gracefully() {
        // Two identical columns are an exact dependency: the glm.fit emulation
        // refuses an aliased design (Err), and calculate_vif must not even
        // get that far - it blocks both terms up front and still answers with
        // a "problematic" value instead of erroring out or panicking.
        let x1 = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
        let y_vals = [0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];

        let mut flat = Vec::with_capacity(20);
        for v in x1 {
            flat.push(v);
            flat.push(v); // exact duplicate of x1
        }
        let x = DMatrix::from_row_slice(10, 2, &flat);
        let y = DVector::from_row_slice(&y_vals);
        let groups = vec![
            ("x1".to_string(), vec![0usize]),
            ("x1_copy".to_string(), vec![1usize]),
        ];

        let mut x_design = DMatrix::zeros(10, 3);
        for r in 0..10 {
            x_design[(r, 0)] = 1.0;
            x_design[(r, 1)] = x[(r, 0)];
            x_design[(r, 2)] = x[(r, 1)];
        }
        assert!(
            glm_fit_vcov_like_r(&x_design, &y).is_err(),
            "aliased design must be rejected by the glm.fit emulation"
        );

        let result = calculate_vif(&x, &y, &groups).expect("must still answer");
        assert_eq!(result.len(), 2);
        for row in &result {
            assert!(
                row.vif >= 100.0,
                "{}: expected a huge VIF, got {}",
                row.variable,
                row.vif
            );
        }
    }

    // ---- deterministic synthetic data (no rand dependency) -------------------

    fn lcg_stream(seed: u64) -> impl FnMut() -> f64 {
        let mut state = seed;
        move || {
            state = state
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            (state >> 11) as f64 / (1u64 << 53) as f64
        }
    }

    /// Roughly N(0, 1): the sum of 12 uniforms minus 6.
    fn pseudo_normal(next: &mut impl FnMut() -> f64) -> f64 {
        (0..12).map(|_| next()).sum::<f64>() - 6.0
    }

    /// 0/1 draw from a logistic model, so the fit is well posed (no separation).
    fn bernoulli_from_logit(next: &mut impl FnMut() -> f64, logit: f64) -> f64 {
        if next() < 1.0 / (1.0 + (-logit).exp()) {
            1.0
        } else {
            0.0
        }
    }

    fn single_column_terms(names: &[&str]) -> Vec<(String, Vec<usize>)> {
        names
            .iter()
            .enumerate()
            .map(|(i, n)| (n.to_string(), vec![i]))
            .collect()
    }

    fn row<'a>(rows: &'a [VifRow], name: &str) -> &'a VifRow {
        rows.iter().find(|r| r.variable == name).unwrap()
    }

    #[test]
    fn test_near_singular_full_rank_design_still_reports_every_term() {
        // Three near-duplicate pairs (corr ~ 0.999995, GVIF ~ 1e5 each) push
        // det(R) of the coefficient correlation matrix far below 1e-12 even
        // though the design is full rank and perfectly computable. R's
        // car::vif() just reports big-but-finite values for the pairs and
        // ordinary values for everything else; the old "det(R) < 1e-12 means
        // singular -> 999.9 for EVERY term" rule wiped out the innocent
        // terms as well.
        let n = 500;
        let mut next = lcg_stream(20_261_009);
        let mut flat = Vec::with_capacity(n * 8);
        let mut y = Vec::with_capacity(n);
        for _ in 0..n {
            let (u1, u2, u3) = (
                pseudo_normal(&mut next),
                pseudo_normal(&mut next),
                pseudo_normal(&mut next),
            );
            let (a, b) = (pseudo_normal(&mut next), pseudo_normal(&mut next));
            let (v1, v2, v3) = (
                u1 + 0.003 * pseudo_normal(&mut next),
                u2 + 0.003 * pseudo_normal(&mut next),
                u3 + 0.003 * pseudo_normal(&mut next),
            );
            flat.extend_from_slice(&[u1, v1, u2, v2, u3, v3, a, b]);
            y.push(bernoulli_from_logit(
                &mut next,
                -0.4 + 0.5 * a - 0.4 * b + 0.3 * u1 - 0.3 * u2 + 0.2 * u3,
            ));
        }
        let x = DMatrix::from_row_slice(n, 8, &flat);
        let y = DVector::from_vec(y);
        let names = ["u1", "v1", "u2", "v2", "u3", "v3", "a", "b"];

        let result = calculate_vif(&x, &y, &single_column_terms(&names)).unwrap();
        assert_eq!(result.len(), names.len());

        for name in ["u1", "v1", "u2", "v2", "u3", "v3"] {
            let r = row(&result, name);
            assert!(r.tolerance > 0.0, "{name}: must not be the 999.9 sentinel");
            assert!(
                r.gvif.is_finite() && r.gvif > 1e3 && r.gvif != 999.9,
                "{name}: expected a large finite GVIF, got {}",
                r.gvif
            );
        }
        for name in ["a", "b"] {
            let r = row(&result, name);
            assert!(
                r.gvif >= 1.0 && r.gvif < 1.5 && r.tolerance > 0.5,
                "{name}: unrelated predictor must keep an ordinary GVIF, got {} (tolerance {})",
                r.gvif,
                r.tolerance
            );
        }
    }

    #[test]
    fn test_exact_dependency_blocks_only_the_terms_it_involves() {
        // x2 is an exact multiple of x1: R's glm gives x2 an NA coefficient
        // and car::vif() refuses to run. Statify reports both members of the
        // dependency as problematic (tolerance 0, 999.9) but must leave the
        // unrelated terms alone - with exactly the values of the model that
        // simply omits x2.
        let n = 300;
        let mut next = lcg_stream(42);
        let (mut full, mut without_x2, mut y) = (Vec::new(), Vec::new(), Vec::new());
        for _ in 0..n {
            let x1 = 10.0 + 4.0 * pseudo_normal(&mut next);
            let x3 = pseudo_normal(&mut next);
            let x4 = 0.5 * x3 + pseudo_normal(&mut next); // so the VIFs are not all ~1
            full.extend_from_slice(&[x1, 3.0 * x1, x3, x4]);
            without_x2.extend_from_slice(&[x1, x3, x4]);
            y.push(bernoulli_from_logit(
                &mut next,
                0.2 * (x1 - 10.0) + 0.5 * x3 - 0.4 * x4,
            ));
        }
        let x = DMatrix::from_row_slice(n, 4, &full);
        let x_reduced = DMatrix::from_row_slice(n, 3, &without_x2);
        let y = DVector::from_vec(y);

        let result =
            calculate_vif(&x, &y, &single_column_terms(&["x1", "x2", "x3", "x4"])).unwrap();
        let reduced =
            calculate_vif(&x_reduced, &y, &single_column_terms(&["x1", "x3", "x4"])).unwrap();

        for name in ["x1", "x2"] {
            let r = row(&result, name);
            assert_eq!((r.tolerance, r.gvif, r.vif), (0.0, 999.9, 999.9), "{name}");
        }
        for name in ["x3", "x4"] {
            let (r, r_ref) = (row(&result, name), row(&reduced, name));
            assert!(
                r.tolerance > 0.0 && r.gvif >= 1.0 && r.gvif < 5.0,
                "{name}: unrelated predictor wrongly blocked, GVIF {}",
                r.gvif
            );
            assert!(
                (r.gvif - r_ref.gvif).abs() < 1e-9,
                "{name}: GVIF {} should equal the model without x2 ({})",
                r.gvif,
                r_ref.gvif
            );
        }
    }

    #[test]
    fn test_constant_column_is_aliased_with_the_intercept() {
        // A column that never varies duplicates the intercept (R: NA
        // coefficient). Only that term is blocked; the rest are untouched.
        let n = 300;
        let mut next = lcg_stream(7);
        let (mut full, mut without_const, mut y) = (Vec::new(), Vec::new(), Vec::new());
        for _ in 0..n {
            let a = pseudo_normal(&mut next);
            let b = 0.6 * a + pseudo_normal(&mut next);
            full.extend_from_slice(&[a, 7.0, b]);
            without_const.extend_from_slice(&[a, b]);
            y.push(bernoulli_from_logit(&mut next, -0.3 + 0.6 * a - 0.5 * b));
        }
        let x = DMatrix::from_row_slice(n, 3, &full);
        let x_reduced = DMatrix::from_row_slice(n, 2, &without_const);
        let y = DVector::from_vec(y);

        let result = calculate_vif(&x, &y, &single_column_terms(&["a", "const", "b"])).unwrap();
        let reduced = calculate_vif(&x_reduced, &y, &single_column_terms(&["a", "b"])).unwrap();

        let c = row(&result, "const");
        assert_eq!((c.tolerance, c.gvif, c.vif), (0.0, 999.9, 999.9));
        for name in ["a", "b"] {
            let (r, r_ref) = (row(&result, name), row(&reduced, name));
            assert!(r.tolerance > 0.0 && r.gvif < 5.0, "{name}: GVIF {}", r.gvif);
            assert!((r.gvif - r_ref.gvif).abs() < 1e-9, "{name}");
        }
    }

    #[test]
    fn test_calculate_vif_uses_weighted_fit_from_y() {
        // End-to-end: calculate_vif(x, y, groups) should fit a logistic
        // model internally and derive GVIF from ITS weighted vcov, not
        // from the plain correlation of x. With two strongly correlated
        // continuous predictors, both terms should still come back
        // finite, >= 1, and clearly above 1 (real collinearity present)
        // regardless of the exact weighting - this is a sanity check on
        // the new code path, not a hand-derived reference value (unlike
        // the determinant-ratio tests above, which pin down the algebra
        // independently of any fitting).
        let x1 = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0];
        let x2 = [1.1, 1.9, 3.2, 3.8, 5.3, 5.7, 7.1, 8.2]; // ~ x1, r > 0.99
        let y_vals = [0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0];

        let mut flat = Vec::with_capacity(16);
        for i in 0..8 {
            flat.push(x1[i]);
            flat.push(x2[i]);
        }
        let x = DMatrix::from_row_slice(8, 2, &flat);
        let y = DVector::from_row_slice(&y_vals);
        let groups = vec![
            ("x1".to_string(), vec![0usize]),
            ("x2".to_string(), vec![1usize]),
        ];

        let result = calculate_vif(&x, &y, &groups).unwrap();
        assert_eq!(result.len(), 2);
        for row in &result {
            assert!(row.vif.is_finite() && row.vif >= 1.0);
            assert!(row.tolerance > 0.0 && row.tolerance <= 1.0);
            assert!(
                row.vif > 2.0,
                "expected clear collinearity signal for {}, got VIF={}",
                row.variable,
                row.vif
            );
        }
    }
}

#[cfg(test)]
mod box_tidwell_tests {
    use super::*;

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
        assert!(cont_row.score_z.is_finite());

        let cat_row = result.iter().find(|r| r.variable == "category").unwrap();
        assert!(cat_row.skipped, "categorical group must be skipped as a candidate");
        assert!(cat_row.skip_reason.contains("Categorical"));
    }
}
