use wasm_bindgen::prelude::*;
use crate::GARCH;
use crate::time_series::helper_structs::ArchLMResult;
use crate::time_series::ecm::ols_helper::invert_matrix;

#[wasm_bindgen]
impl GARCH {
    /// ARCH-LM Test (Engle 1982)
    /// H0: No ARCH effects (α_1 = α_2 = ... = α_q = 0)
    /// Auxiliary regression: e²_t = β_0 + β_1·e²_{t-1} + ... + β_q·e²_{t-q}
    /// Test statistics:
    ///   Obs*R² (LM stat) ~ Chi²(q)   [matches EViews "Obs*R-squared"]
    ///   F-stat ~ F(q, n-q-1)          [matches EViews "F-statistic"]
    pub fn arch_lm_test(residuals: Vec<f64>, lags: usize) -> ArchLMResult {
        let n = residuals.len();

        if n <= lags + 1 || lags == 0 {
            return ArchLMResult {
                lm_statistic: 0.0,
                p_value: 1.0,
                f_statistic: 0.0,
                f_p_value: 1.0,
                has_arch_effect: false,
            };
        }

        // Squared residuals
        let e_sq: Vec<f64> = residuals.iter().map(|e| e * e).collect();

        // Effective observations and number of regressors (incl. intercept)
        let n_obs = n - lags;       // observations in auxiliary regression
        let k = 1 + lags;           // number of parameters (intercept + q lags)
        let df_reg = lags;          // numerator df for F-test  (= q lag terms)
        let df_resid = n_obs - k;   // denominator df = n_obs - q - 1

        if df_resid < 1 {
            return ArchLMResult {
                lm_statistic: 0.0,
                p_value: 1.0,
                f_statistic: 0.0,
                f_p_value: 1.0,
                has_arch_effect: false,
            };
        }

        // --- Build y and X ---
        // y = e²_t  for t = lags..n
        let y_vec: Vec<f64> = (lags..n).map(|t| e_sq[t]).collect();

        // X rows = [1, e²_{t-1}, ..., e²_{t-q}]
        let x_mat: Vec<Vec<f64>> = (0..n_obs)
            .map(|i| {
                let t = i + lags;
                let mut row = vec![1.0];
                for lag in 1..=lags {
                    row.push(e_sq[t - lag]);
                }
                row
            })
            .collect();

        // --- OLS: β = (X'X)⁻¹ X'y ---
        let mut xtx = vec![vec![0.0f64; k]; k];
        let mut xty = vec![0.0f64; k];
        for i in 0..n_obs {
            for j in 0..k {
                xty[j] += x_mat[i][j] * y_vec[i];
                for l in 0..k {
                    xtx[j][l] += x_mat[i][j] * x_mat[i][l];
                }
            }
        }

        let xtx_inv = match invert_matrix(&xtx) {
            Some(inv) => inv,
            None => {
                return ArchLMResult {
                    lm_statistic: 0.0,
                    p_value: 1.0,
                    f_statistic: 0.0,
                    f_p_value: 1.0,
                    has_arch_effect: false,
                };
            }
        };

        let mut beta = vec![0.0f64; k];
        for j in 0..k {
            for l in 0..k {
                beta[j] += xtx_inv[j][l] * xty[l];
            }
        }

        // --- Compute SSE, SST, R² ---
        let mean_y: f64 = y_vec.iter().sum::<f64>() / n_obs as f64;
        let sst: f64 = y_vec.iter().map(|&yi| (yi - mean_y).powi(2)).sum();

        let mut sse = 0.0f64;
        for i in 0..n_obs {
            let y_hat: f64 = (0..k).map(|j| beta[j] * x_mat[i][j]).sum();
            sse += (y_vec[i] - y_hat).powi(2);
        }

        let r_squared = if sst > 1e-30 {
            (1.0 - sse / sst).max(0.0)
        } else {
            0.0
        };

        // --- Test statistics ---
        // Obs*R² (LM) ~ Chi²(q) — matches EViews "Obs*R-squared"
        let lm_stat = n_obs as f64 * r_squared;
        let p_chi2  = chi_square_p_value(lm_stat, df_reg);

        // F-stat = (R²/q) / ((1-R²)/(n_obs-q-1)) — matches EViews "F-statistic"
        let ssr = sst - sse;                // regression sum of squares
        let msr = if df_reg > 0 { ssr / df_reg as f64 } else { 0.0 };
        let mse = sse / df_resid as f64;
        let f_stat = if mse > 1e-30 { msr / mse } else { 0.0 };
        let p_f = f_p_value(f_stat, df_reg, df_resid);

        let has_arch = p_chi2 < 0.05;

        ArchLMResult {
            lm_statistic: lm_stat,
            p_value: p_chi2,
            f_statistic: f_stat,
            f_p_value: p_f,
            has_arch_effect: has_arch,
        }
    }
}

// ─── Chi-Square p-value (survival function 1-CDF) ─────────────────────────

fn chi_square_p_value(x: f64, df: usize) -> f64 {
    if x <= 0.0 { return 1.0; }
    let p = match df {
        0 => 1.0,
        1 => 2.0 * (1.0 - standard_normal_cdf(x.sqrt())),
        2 => (-x / 2.0).exp(),
        _ => {
            let d = df as f64;
            let cbrt = (x / d).powf(1.0 / 3.0);
            let mu    = 1.0 - 2.0 / (9.0 * d);
            let sigma = (2.0 / (9.0 * d)).sqrt();
            let z = (cbrt - mu) / sigma;
            1.0 - standard_normal_cdf(z)
        }
    };
    p.max(0.0).min(1.0)
}

// ─── F-distribution p-value using regularised incomplete Beta ────────────
// P(F(d1,d2) > f) = I_{d2/(d2+d1·f)}(d2/2, d1/2)

fn f_p_value(f: f64, d1: usize, d2: usize) -> f64 {
    if f <= 0.0 { return 1.0; }
    let d1 = d1 as f64;
    let d2 = d2 as f64;
    let x = d2 / (d2 + d1 * f);
    regularized_incomplete_beta(d2 / 2.0, d1 / 2.0, x)
        .max(0.0)
        .min(1.0)
}

// ─── Regularised incomplete Beta I_x(a, b) via Lentz continued fraction ──

fn regularized_incomplete_beta(a: f64, b: f64, x: f64) -> f64 {
    if x <= 0.0 { return 0.0; }
    if x >= 1.0 { return 1.0; }
    if x > (a + 1.0) / (a + b + 2.0) {
        return 1.0 - regularized_incomplete_beta(b, a, 1.0 - x);
    }
    let lbeta = ln_gamma(a) + ln_gamma(b) - ln_gamma(a + b);
    let front  = (x.ln() * a + (1.0 - x).ln() * b - lbeta).exp() / a;
    (front * beta_cf(a, b, x)).min(1.0)
}

fn beta_cf(a: f64, b: f64, x: f64) -> f64 {
    let fpmin = 1e-30;
    let eps   = 3e-7;
    let qab = a + b;
    let qap = a + 1.0;
    let qam = a - 1.0;
    let mut c = 1.0;
    let mut d = (1.0 - qab * x / qap).abs().max(fpmin);
    d = 1.0 / d;
    let mut h = d;
    for m in 1..=200usize {
        let mf = m as f64;
        let m2 = 2.0 * mf;
        let mut aa = mf * (b - mf) * x / ((qam + m2) * (a + m2));
        d = (1.0 + aa * d).abs().max(fpmin);
        c = (1.0 + aa / c).abs().max(fpmin);
        d = 1.0 / d;
        h *= d * c;
        aa = -(a + mf) * (qab + mf) * x / ((a + m2) * (qap + m2));
        d = (1.0 + aa * d).abs().max(fpmin);
        c = (1.0 + aa / c).abs().max(fpmin);
        d = 1.0 / d;
        let del = d * c;
        h *= del;
        if (del - 1.0).abs() < eps { break; }
    }
    h
}

fn ln_gamma(x: f64) -> f64 {
    if x <= 0.0 { return f64::INFINITY; }
    let g = 7.0;
    let p = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let x1 = x - 1.0;
    let t  = x1 + g + 0.5;
    let mut ser = p[0];
    for (i, &c) in p[1..].iter().enumerate() {
        ser += c / (x1 + (i + 1) as f64);
    }
    0.5 * (2.0 * core::f64::consts::PI).ln() + ser.ln() + (x1 + 0.5) * t.ln() - t
}

// ─── Standard normal CDF (Abramowitz & Stegun §26.2.17) ──────────────────

fn standard_normal_cdf(x: f64) -> f64 {
    let t = 1.0 / (1.0 + 0.2316419 * x.abs());
    let poly = t * (0.319_381_530
        + t * (-0.356_563_782
        + t * (1.781_477_937
        + t * (-1.821_255_978
        + t * 1.330_274_429))));
    let pdf = (-x * x / 2.0).exp() / (2.0 * core::f64::consts::PI).sqrt();
    if x >= 0.0 { 1.0 - pdf * poly } else { pdf * poly }
}
