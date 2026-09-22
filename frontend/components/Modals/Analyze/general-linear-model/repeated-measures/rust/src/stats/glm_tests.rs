//! Shared test statistics for the multivariate GLM approach to repeated
//! measures (SPSS GLM algorithms): multivariate statistics from hypothesis
//! and error SSCP matrices, and observed power from the noncentral F
//! distribution.
use nalgebra::{ DMatrix, SymmetricEigen };
use statrs::distribution::{ ContinuousCDF, FisherSnedecor };
use statrs::function::{ beta::beta_reg, gamma::ln_gamma };

use crate::models::result::MultivariateTestEntry;
use crate::utils::collections::HashMap;

/// P(F' ≤ x) for the noncentral F distribution with df1, df2 and
/// noncentrality λ, as a Poisson mixture of regularized incomplete betas.
pub fn noncentral_f_cdf(x: f64, df1: f64, df2: f64, lambda: f64) -> f64 {
    if x <= 0.0 {
        return 0.0;
    }
    let y = (df1 * x) / (df1 * x + df2);
    if lambda <= 0.0 {
        return beta_reg(df1 / 2.0, df2 / 2.0, y);
    }
    let half = lambda / 2.0;
    // Sum outward from the Poisson mode so large λ does not underflow.
    let mode = half.floor();
    let weight = |j: f64| (-half + j * half.ln() - ln_gamma(j + 1.0)).exp();
    let term = |j: f64| weight(j) * beta_reg(df1 / 2.0 + j, df2 / 2.0, y);
    let mut sum = term(mode);
    let mut j = mode + 1.0;
    loop {
        let t = term(j);
        sum += t;
        if weight(j) < 1e-16 || j > mode + 100_000.0 {
            break;
        }
        j += 1.0;
    }
    let mut j = mode - 1.0;
    while j >= 0.0 {
        let t = term(j);
        sum += t;
        if weight(j) < 1e-16 {
            break;
        }
        j -= 1.0;
    }
    sum.min(1.0).max(0.0)
}

/// Observed power of an F test at level alpha: noncentrality = F · df1 (as
/// SPSS prints in "Noncent. Parameter").
pub fn observed_power(f: f64, df1: f64, df2: f64, alpha: f64) -> f64 {
    if !f.is_finite() || f <= 0.0 || df1 <= 0.0 || df2 <= 0.0 {
        return f64::NAN;
    }
    let central = match FisherSnedecor::new(df1, df2) {
        Ok(d) => d,
        Err(_) => return f64::NAN,
    };
    let critical = central.inverse_cdf(1.0 - alpha);
    1.0 - noncentral_f_cdf(critical, df1, df2, f * df1)
}

/// Upper-tail p-value of the central F distribution.
pub fn f_significance(f: f64, df1: f64, df2: f64) -> f64 {
    if !f.is_finite() || df1 <= 0.0 || df2 <= 0.0 {
        return f64::NAN;
    }
    match FisherSnedecor::new(df1, df2) {
        Ok(d) => (1.0 - d.cdf(f)).max(0.0),
        Err(_) => f64::NAN,
    }
}

/// Eigenvalues of E⁻¹H through the symmetric form (E^-1/2 H E^-1/2).
fn eigenvalues_e_inv_h(h: &DMatrix<f64>, e: &DMatrix<f64>) -> Result<Vec<f64>, String> {
    let chol = e
        .clone()
        .cholesky()
        .ok_or_else(|| "Error SSCP matrix is not positive definite".to_string())?;
    let l_inv = chol
        .l()
        .try_inverse()
        .ok_or_else(|| "Error SSCP matrix is singular".to_string())?;
    let sym = &l_inv * h * l_inv.transpose();
    let sym = (sym.clone() + sym.transpose()) / 2.0;
    let mut ev: Vec<f64> = SymmetricEigen::new(sym).eigenvalues.iter().map(|v| v.max(0.0)).collect();
    ev.sort_by(|a, b| b.partial_cmp(a).unwrap());
    Ok(ev)
}

/// Pillai, Wilks, Hotelling-Lawley and Roy for hypothesis SSCP `h`
/// (hypothesis df `q`) and error SSCP `e` (error df `v`) with the F
/// approximations, partial eta squared, noncentrality and observed power of
/// the SPSS GLM algorithms. All four are exact when min(p, q) = 1.
pub fn multivariate_statistics(
    h: &DMatrix<f64>,
    e: &DMatrix<f64>,
    q: f64,
    v: f64,
    alpha: f64
) -> Result<HashMap<String, MultivariateTestEntry>, String> {
    let p = e.nrows() as f64;
    let ev = eigenvalues_e_inv_h(h, e)?;
    let s = p.min(q);
    let m = ((p - q).abs() - 1.0) / 2.0;
    let n = (v - p - 1.0) / 2.0;

    let pillai: f64 = ev.iter().map(|l| l / (1.0 + l)).sum();
    let wilks: f64 = ev.iter().map(|l| 1.0 / (1.0 + l)).product();
    let hotelling: f64 = ev.iter().sum();
    let roy: f64 = ev.first().copied().unwrap_or(0.0);

    let exact = s <= 1.0;
    let mut out = HashMap::new();
    let mut add = |name: &str, value: f64, f: f64, df1: f64, df2: f64, eta: f64, is_exact: bool| {
        out.insert(name.to_string(), MultivariateTestEntry {
            value,
            f,
            hypothesis_df: df1,
            error_df: df2,
            significance: f_significance(f, df1, df2),
            partial_eta_squared: eta,
            noncent_parameter: f * df1,
            observed_power: observed_power(f, df1, df2, alpha),
            is_exact_statistic: is_exact,
        });
    };

    // Pillai's trace
    let df1 = s * (2.0 * m + s + 1.0);
    let df2 = s * (2.0 * n + s + 1.0);
    let f = ((2.0 * n + s + 1.0) / (2.0 * m + s + 1.0)) * (pillai / (s - pillai));
    add("Pillai's Trace", pillai, f, df1, df2, pillai / s, exact);

    // Wilks' lambda (Rao's F)
    let t = if p * p + q * q - 5.0 > 0.0 {
        ((p * p * q * q - 4.0) / (p * p + q * q - 5.0)).sqrt()
    } else {
        1.0
    };
    let df1 = p * q;
    let df2 = (v - (p - q + 1.0) / 2.0) * t - (p * q - 2.0) / 2.0;
    let w_t = wilks.powf(1.0 / t);
    let f = ((1.0 - w_t) / w_t) * (df2 / df1);
    add("Wilks' Lambda", wilks, f, df1, df2, 1.0 - wilks.powf(1.0 / s), exact);

    // Hotelling-Lawley trace
    let df1 = s * (2.0 * m + s + 1.0);
    let df2 = 2.0 * (s * n + 1.0);
    let f = (df2 * hotelling) / (s * s * (2.0 * m + s + 1.0));
    add("Hotelling's Trace", hotelling, f, df1, df2, (hotelling / s) / (hotelling / s + 1.0), exact);

    // Roy's largest root (upper bound on F unless s = 1)
    let r = p.max(q);
    let df1 = r;
    let df2 = v - r + q;
    let f = roy * df2 / df1;
    add("Roy's Largest Root", roy, f, df1, df2, roy / (1.0 + roy), exact);

    Ok(out)
}
