//! Pre-results assumption checks for discriminant analysis.
//!
//! Discriminant analysis (LDA) assumes: equal group covariance matrices
//! (covered by Box's M), multivariate normality, no severe multicollinearity
//! among predictors, and univariate normality of each predictor.
//!
//! This module computes multicollinearity (tolerance/VIF), multivariate
//! normality (Henze–Zirkler on the full dataset), and univariate normality
//! (Anderson–Darling per predictor), plus an at-a-glance summary used to surface
//! PASS/VIOLATED warnings at the top of the output. The normality tests are
//! computed on the pooled dataset to match R's `MVN::mvn`. It reuses the same
//! `AnalyzedDataset` machinery as the rest of the analysis.

use nalgebra::{DMatrix, DVector, SymmetricEigen};
use statrs::distribution::{ContinuousCDF, Normal};

use crate::models::result::{
    AssumptionResults, AssumptionSummaryRow, HenzeZirklerResult, MulticollinearityResult,
    UnivariateNormalityResult,
};
use crate::models::{AnalysisData, DiscriminantConfig};
use crate::stats::core::{
    calculate_pooled_within_matrix_no_epsilon, extract_analyzed_dataset, AnalyzedDataset, EPSILON,
};

/// VIF at or above this indicates problematic multicollinearity.
const VIF_THRESHOLD: f64 = 10.0;
/// Condition index at or above this indicates problematic multicollinearity.
const CONDITION_THRESHOLD: f64 = 30.0;
/// Significance level for the normality verdicts.
const NORMALITY_ALPHA: f64 = 0.05;

/// Entry point: compute every requested assumption check and the summary.
pub fn calculate_assumptions(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<AssumptionResults, String> {
    let dataset = extract_analyzed_dataset(data, config)?;

    // Exclude the grouping variable, consistent with the matrices output.
    let grouping_var = &config.main.grouping_variable;
    let variables: Vec<String> = config
        .main
        .independent_variables
        .iter()
        .filter(|v| *v != grouping_var)
        .cloned()
        .collect();

    if variables.is_empty() {
        return Err("No independent variables found after filtering grouping variable.".into());
    }

    let a = &config.assumptions;

    let multicollinearity = if a.multicollinearity {
        Some(compute_multicollinearity(&dataset, &variables))
    } else {
        None
    };
    let multivariate_normality = if a.multivariate_normality {
        Some(compute_henze_zirkler(&dataset, &variables))
    } else {
        None
    };
    let univariate_normality = if a.univariate_normality {
        Some(compute_univariate_normality(&dataset, &variables))
    } else {
        None
    };

    let summary = build_summary(
        multicollinearity.as_ref(),
        multivariate_normality.as_ref(),
        univariate_normality.as_ref(),
    );

    Ok(AssumptionResults {
        summary,
        multicollinearity,
        multivariate_normality,
        univariate_normality,
    })
}

// ── Small numeric helpers ───────────────────────────────────────────────────

/// Replace non-finite values with 0.0 so the JSON never carries NaN/Inf.
fn fin(x: f64) -> f64 {
    if x.is_finite() {
        x
    } else {
        0.0
    }
}

/// Pool all cases of one variable across every group, in group-label order.
fn pooled_column(dataset: &AnalyzedDataset, variable: &str) -> Vec<f64> {
    let mut out = Vec::new();
    for group in &dataset.group_labels {
        if let Some(vals) = dataset.group_data.get(variable).and_then(|g| g.get(group)) {
            out.extend_from_slice(vals);
        }
    }
    out
}

/// Build the full n×p case matrix (rows = all cases pooled across groups,
/// cols = variables). Returns `None` if columns are missing or ragged.
fn full_case_matrix(dataset: &AnalyzedDataset, variables: &[String]) -> Option<DMatrix<f64>> {
    let p = variables.len();
    if p == 0 {
        return None;
    }
    let columns: Vec<Vec<f64>> = variables.iter().map(|v| pooled_column(dataset, v)).collect();
    let n = columns[0].len();
    if n == 0 || columns.iter().any(|c| c.len() != n) {
        return None;
    }
    let mut m = DMatrix::zeros(n, p);
    for (j, col) in columns.iter().enumerate() {
        for i in 0..n {
            m[(i, j)] = col[i];
        }
    }
    Some(m)
}

// ── 1. Multicollinearity ────────────────────────────────────────────────────

/// Tolerance/VIF from the inverse pooled within-groups correlation matrix, plus
/// condition indices from that matrix's eigenvalues. VIF ≥ 10 (tolerance ≤ 0.1)
/// or condition index ≥ 30 flags problematic multicollinearity.
fn compute_multicollinearity(
    dataset: &AnalyzedDataset,
    variables: &[String],
) -> MulticollinearityResult {
    let p = variables.len();
    let cov = calculate_pooled_within_matrix_no_epsilon(dataset, variables);

    // Correlation matrix R from the pooled within covariance.
    let mut r = DMatrix::<f64>::identity(p, p);
    for i in 0..p {
        for j in 0..p {
            let denom = (cov[(i, i)] * cov[(j, j)]).sqrt();
            r[(i, j)] = if denom > EPSILON {
                cov[(i, j)] / denom
            } else if i == j {
                1.0
            } else {
                0.0
            };
        }
    }

    // VIF = diagonal of R⁻¹; tolerance = 1/VIF.
    let (tolerance, vif, singular) = match r.clone().try_inverse() {
        Some(r_inv) => {
            let mut tol = Vec::with_capacity(p);
            let mut vifs = Vec::with_capacity(p);
            for i in 0..p {
                let v = r_inv[(i, i)].max(1.0).min(1.0e6); // VIF ≥ 1 by construction
                vifs.push(fin(v));
                tol.push(fin(1.0 / v));
            }
            (tol, vifs, false)
        }
        None => {
            // Perfectly collinear predictors: report sentinel high VIF.
            (vec![0.0; p], vec![1.0e6; p], true)
        }
    };

    // Condition indices from the eigenvalues of R (descending).
    let eig = SymmetricEigen::new(r);
    let mut eigs: Vec<f64> = eig.eigenvalues.iter().copied().collect();
    eigs.sort_by(|a, b| b.partial_cmp(a).unwrap_or(std::cmp::Ordering::Equal));
    let lambda_max = eigs.first().copied().unwrap_or(0.0);

    let mut dimension = Vec::with_capacity(p);
    let mut eigenvalue = Vec::with_capacity(p);
    let mut condition_index = Vec::with_capacity(p);
    for (k, &lam) in eigs.iter().enumerate() {
        dimension.push((k + 1) as i32);
        eigenvalue.push(fin(lam));
        let ci = if lam > EPSILON {
            (lambda_max / lam).sqrt()
        } else {
            1.0e6
        };
        condition_index.push(fin(ci.min(1.0e6)));
    }

    let max_vif = vif.iter().copied().fold(0.0_f64, f64::max);
    let max_condition_index = condition_index.iter().copied().fold(0.0_f64, f64::max);
    let violated = singular || max_vif >= VIF_THRESHOLD || max_condition_index >= CONDITION_THRESHOLD;

    let note = if singular {
        "Not met: a predictor is a near-perfect linear combination of others (the within-groups correlation matrix is singular). Remove redundant predictors.".to_string()
    } else if violated {
        format!(
            "Not met: VIF ≥ {:.0} indicates predictors are strongly inter-correlated. Consider removing or combining predictors.",
            VIF_THRESHOLD
        )
    } else {
        format!(
            "Met: all VIF < {:.0}, so there is no severe multicollinearity among predictors.",
            VIF_THRESHOLD
        )
    };

    MulticollinearityResult {
        variables: variables.to_vec(),
        tolerance,
        vif,
        dimension,
        eigenvalue,
        condition_index,
        max_vif: fin(max_vif),
        max_condition_index: fin(max_condition_index),
        vif_threshold: VIF_THRESHOLD,
        condition_threshold: CONDITION_THRESHOLD,
        violated,
        note,
    }
}

// ── 2. Multivariate normality (Henze–Zirkler) ───────────────────────────────

struct HzStat {
    hz: f64,
    p_value: f64,
}

/// Henze–Zirkler multivariate normality statistic for an n×p case matrix.
/// Uses the MLE (÷n) covariance. The statistic is approximately lognormal under
/// multivariate normality, so the returned p-value is its upper tail. Returns
/// `None` when n ≤ p (covariance not invertible).
fn henze_zirkler(x: &DMatrix<f64>) -> Option<HzStat> {
    let n = x.nrows();
    let p = x.ncols();
    if n <= p || n < 3 {
        return None;
    }

    // Column means and centered matrix Y.
    let mut mean = DVector::zeros(p);
    for j in 0..p {
        let mut s = 0.0;
        for i in 0..n {
            s += x[(i, j)];
        }
        mean[j] = s / n as f64;
    }
    let mut y = x.clone();
    for i in 0..n {
        for j in 0..p {
            y[(i, j)] -= mean[j];
        }
    }

    // MLE covariance S = (1/n) Yᵀ Y, and its inverse.
    let s = (y.transpose() * &y) / (n as f64);
    let s_inv = s.try_inverse()?;

    // D = Y S⁻¹ Yᵀ (n×n). D[i,i] is the squared Mahalanobis distance of case i
    // to the mean; D[i,j] is the cross-product used for pairwise distances
    // D_ij = D[i,i] + D[j,j] − 2·D[i,j].
    let d = (&y * &s_inv) * y.transpose();

    let nn = n as f64;
    let pp = p as f64;

    // Smoothing parameter β.
    let beta = (1.0 / (2.0_f64).sqrt()) * ((nn * (2.0 * pp + 1.0)) / 4.0).powf(1.0 / (pp + 4.0));
    let b2 = beta * beta;

    // Double sum over pairwise Mahalanobis distances.
    let mut sum_pair = 0.0;
    for i in 0..n {
        for j in 0..n {
            let dij = d[(i, i)] + d[(j, j)] - 2.0 * d[(i, j)];
            sum_pair += (-(b2) / 2.0 * dij).exp();
        }
    }
    // Single sum over distances to the mean.
    let mut sum_single = 0.0;
    for i in 0..n {
        sum_single += (-(b2) / (2.0 * (1.0 + b2)) * d[(i, i)]).exp();
    }

    let hz = nn
        * ((1.0 / (nn * nn)) * sum_pair
            - 2.0 * (1.0 + b2).powf(-pp / 2.0) * (1.0 / nn) * sum_single
            + (1.0 + 2.0 * b2).powf(-pp / 2.0));

    // Mean and variance of HZ under multivariate normality, then convert to the
    // matching lognormal (meanlog, sdlog) and read off the upper-tail p-value.
    let a = 1.0 + 2.0 * b2;
    let wb = (1.0 + b2) * (1.0 + 3.0 * b2);
    let b4 = b2 * b2;
    let b8 = b4 * b4;

    let mu = 1.0 - a.powf(-pp / 2.0) * (1.0 + pp * b2 / a + pp * (pp + 2.0) * b4 / (2.0 * a * a));
    let si2 = 2.0 * (1.0 + 4.0 * b2).powf(-pp / 2.0)
        + 2.0
            * a.powf(-pp)
            * (1.0 + 2.0 * pp * b4 / (a * a) + 3.0 * pp * (pp + 2.0) * b8 / (4.0 * a.powi(4)))
        - 4.0
            * wb.powf(-pp / 2.0)
            * (1.0 + 3.0 * pp * b4 / (2.0 * wb) + pp * (pp + 2.0) * b8 / (2.0 * wb * wb));

    let p_value = if hz > 0.0 && mu > 0.0 && si2 > 0.0 {
        let pmu = (mu * mu / (si2 + mu * mu).sqrt()).ln();
        let psi = ((si2 + mu * mu) / (mu * mu)).ln().sqrt();
        if psi > 0.0 {
            let z = (hz.ln() - pmu) / psi;
            match Normal::new(0.0, 1.0) {
                Ok(nd) => (1.0 - nd.cdf(z)).clamp(0.0, 1.0),
                Err(_) => 1.0,
            }
        } else {
            1.0
        }
    } else {
        1.0
    };

    Some(HzStat {
        hz: fin(hz),
        p_value: fin(p_value),
    })
}

/// Henze–Zirkler test on the full dataset (all cases pooled across groups),
/// matching R's `MVN::mvn(data)` which returns a single multivariate statistic.
fn compute_henze_zirkler(dataset: &AnalyzedDataset, variables: &[String]) -> HenzeZirklerResult {
    let matrix = full_case_matrix(dataset, variables);
    let n = matrix.as_ref().map_or(0, |m| m.nrows());
    let result = matrix.and_then(|m| henze_zirkler(&m));

    match result {
        Some(hz) => {
            let is_normal = hz.p_value > NORMALITY_ALPHA;
            let note = if is_normal {
                "Met: the data are multivariate normal (Henze–Zirkler not significant, p > 0.05).".to_string()
            } else {
                "Not met: multivariate normality is rejected (Henze–Zirkler significant, p ≤ 0.05).".to_string()
            };
            HenzeZirklerResult {
                n: n as i32,
                hz: hz.hz,
                p_value: hz.p_value,
                normal: is_normal,
                violated: !is_normal,
                note,
            }
        }
        None => HenzeZirklerResult {
            n: n as i32,
            hz: 0.0,
            p_value: 1.0,
            normal: true,
            violated: false,
            note: "Could not be tested: too few cases relative to the number of predictors to compute a non-singular covariance.".to_string(),
        },
    }
}

// ── 3. Univariate normality (Anderson–Darling per variable) ─────────────────

/// Natural log of the standard-normal CDF, floored to avoid -∞ in the tails.
fn ln_std_normal_cdf(normal: &Normal, z: f64) -> f64 {
    let c = normal.cdf(z);
    if c <= 0.0 {
        -700.0
    } else {
        c.ln()
    }
}

/// Anderson–Darling test for normality on a pooled column, matching R's
/// `nortest::ad.test` (used internally by `MVN::mvn`). Returns the raw A²
/// statistic and the p-value from the small-sample-corrected A*². The sample
/// standard deviation uses the (n−1) denominator, as in R. Returns `None` when
/// n < 8 or the column is constant.
fn anderson_darling(values: &[f64]) -> Option<(f64, f64)> {
    let n = values.len();
    if n < 8 {
        return None;
    }
    let nn = n as f64;
    let mean = values.iter().sum::<f64>() / nn;
    let var = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / (nn - 1.0);
    let sd = var.sqrt();
    if sd <= EPSILON {
        return None; // constant column
    }

    let mut sorted: Vec<f64> = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let normal = Normal::new(0.0, 1.0).ok()?;
    let z: Vec<f64> = sorted.iter().map(|x| (x - mean) / sd).collect();
    let logp1: Vec<f64> = z.iter().map(|&zi| ln_std_normal_cdf(&normal, zi)).collect();
    let logp2: Vec<f64> = z.iter().map(|&zi| ln_std_normal_cdf(&normal, -zi)).collect();

    // A² = -n - (1/n) Σ (2i-1)[ln Φ(z_i) + ln Φ(-z_{n+1-i})]
    let mut h = 0.0;
    for i in 0..n {
        let coef = 2.0 * ((i + 1) as f64) - 1.0;
        h += coef * (logp1[i] + logp2[n - 1 - i]);
    }
    let a2 = -nn - h / nn;

    // Small-sample correction and the D'Agostino–Stephens p-value.
    let aa = (1.0 + 0.75 / nn + 2.25 / (nn * nn)) * a2;
    let pval = if aa < 0.2 {
        1.0 - (-13.436 + 101.14 * aa - 223.73 * aa * aa).exp()
    } else if aa < 0.34 {
        1.0 - (-8.318 + 42.796 * aa - 59.938 * aa * aa).exp()
    } else if aa < 0.6 {
        (0.9177 - 4.279 * aa - 1.38 * aa * aa).exp()
    } else if aa < 10.0 {
        (1.2937 - 5.709 * aa + 0.0186 * aa * aa).exp()
    } else {
        3.7e-24
    };

    Some((fin(a2), fin(pval.clamp(0.0, 1.0))))
}

/// Anderson–Darling univariate normality for each predictor, computed on the
/// full pooled dataset (all cases across groups), matching R's `MVN::mvn`.
fn compute_univariate_normality(
    dataset: &AnalyzedDataset,
    variables: &[String],
) -> UnivariateNormalityResult {
    let mut vars = Vec::new();
    let mut statistic = Vec::new();
    let mut p_value = Vec::new();
    let mut normal = Vec::new();
    let mut any_violation = false;
    let mut counted = 0usize;

    for var in variables {
        let values = pooled_column(dataset, var);
        if let Some((a2, p)) = anderson_darling(&values) {
            let is_normal = p > NORMALITY_ALPHA;
            if !is_normal {
                any_violation = true;
            }
            counted += 1;
            vars.push(var.clone());
            statistic.push(a2);
            p_value.push(p);
            normal.push(is_normal);
        }
    }

    let note = if counted == 0 {
        "Could not be tested: no predictor has enough cases (n ≥ 8) for the Anderson–Darling test.".to_string()
    } else if any_violation {
        "Not met: one or more predictors are not normal (Anderson–Darling significant, p ≤ 0.05). Check the predictors marked NO.".to_string()
    } else {
        "Met: all predictors are univariate normal (Anderson–Darling, p > 0.05).".to_string()
    };

    UnivariateNormalityResult {
        variables: vars,
        statistic,
        p_value,
        normal,
        violated: any_violation,
        note,
    }
}

// ── Summary ─────────────────────────────────────────────────────────────────

fn status_row(assumption: &str, test: &str, finding: String, violated: bool) -> AssumptionSummaryRow {
    AssumptionSummaryRow {
        assumption: assumption.to_string(),
        test: test.to_string(),
        finding,
        status: if violated { "Violated" } else { "Met" }.to_string(),
        violated,
    }
}

fn build_summary(
    mc: Option<&MulticollinearityResult>,
    mv: Option<&HenzeZirklerResult>,
    uv: Option<&UnivariateNormalityResult>,
) -> Vec<AssumptionSummaryRow> {
    let mut rows = Vec::new();

    if let Some(m) = mc {
        rows.push(status_row(
            "Multicollinearity",
            "Tolerance / VIF",
            format!("Max VIF = {:.2}", m.max_vif),
            m.violated,
        ));
    }
    if let Some(m) = mv {
        rows.push(status_row(
            "Multivariate normality",
            "Henze–Zirkler",
            format!("HZ = {:.3}, p = {:.3}", m.hz, m.p_value),
            m.violated,
        ));
    }
    if let Some(u) = uv {
        let bad = u.normal.iter().filter(|&&ok| !ok).count();
        rows.push(status_row(
            "Univariate normality",
            "Anderson–Darling",
            format!("{} of {} predictors non-normal", bad, u.normal.len()),
            u.violated,
        ));
    }

    rows
}
