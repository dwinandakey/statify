use liblbfgs::lbfgs;
use crate::time_series::ecm::ols_helper::invert_matrix;

const LOG_2_PI: f64 = 1.8378770664093454; // ln(2*pi)

// Helper standard normal CDF & error function for p-value calculation
fn normal_cdf(x: f64) -> f64 {
    0.5 * (1.0 + erf(x / 2.0_f64.sqrt()))
}

fn erf(x: f64) -> f64 {
    let a1 = 0.254829592;
    let a2 = -0.284496736;
    let a3 = 1.421413741;
    let a4 = -1.453152027;
    let a5 = 1.061405429;
    let p = 0.3275911;
    
    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let x = x.abs();
    
    let t = 1.0 / (1.0 + p * x);
    let y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * (-x * x).exp();
    
    sign * y
}

// Helper: compute z-stat and p-value from coefficients and standard errors
pub(crate) fn compute_z_and_p(coef: &[f64], se: &[f64]) -> (Vec<f64>, Vec<f64>) {
    let n = coef.len();
    let mut z_stats = vec![0.0; n];
    let mut p_values = vec![1.0; n];
    for i in 0..n {
        let s = se[i];
        if s > 0.0 {
            let z = coef[i] / s;
            z_stats[i] = z;
            p_values[i] = 2.0 * (1.0 - normal_cdf(z.abs()));
        }
    }
    (z_stats, p_values)
}

// =====================================================================
// GARCH(p,q) — Analytical Gradient & OPG Standard Errors
// =====================================================================
//
// Parameter layout:
//   x = [mu, ln(ω), ln(α₁)..ln(αq), ln(β₁)..ln(βp)]
//
fn garch_neg_ll_and_grad(
    data: &[f64],
    x: &[f64],
    p: usize,
    q: usize,
    var_buf: &mut Vec<f64>,
    grad: &mut [f64],
) -> f64 {
    let n = data.len();
    let n_params = 2 + q + p;
    let max_lag = p.max(q).max(1);

    for &val in x.iter() {
        if val.is_nan() || val.is_infinite() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
    }

    let mu = x[0];
    let omega = x[1].exp();
    let alpha: Vec<f64> = (1..=q).map(|i| x[1 + i].exp()).collect();
    let beta: Vec<f64> = (1..=p).map(|j| x[1 + q + j].exp()).collect();

    let persistence = alpha.iter().sum::<f64>() + beta.iter().sum::<f64>();
    let mut penalty = 0.0;
    let limit = 0.999;
    if persistence >= limit {
        let diff = persistence - limit;
        penalty = 1e5 * diff * diff;
    }

    if omega.is_nan() || omega.is_infinite() 
        || alpha.iter().any(|&a| a.is_nan() || a.is_infinite())
        || beta.iter().any(|&b| b.is_nan() || b.is_infinite()) 
    {
        for g in grad.iter_mut() {
            *g = 0.0;
        }
        return 1e15;
    }

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 =
        (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);



    var_buf.clear();
    for _ in 0..max_lag {
        var_buf.push(var_uncon);
    }

    for g in grad.iter_mut() {
        *g = 0.0;
    }

    let win = p.max(1);
    let mut dvar_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_params]; win];
    let mut neg_ll = 0.0f64;

    for t in max_lag..n {
        let mut var_t = omega;
        for (i, &ai) in alpha.iter().enumerate() {
            var_t += ai * residuals[t - 1 - i].powi(2);
        }
        for (j, &bj) in beta.iter().enumerate() {
            var_t += bj * var_buf[t - 1 - j];
        }
        if var_t.is_nan() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
        var_t = var_t.min(1e20).max(1e-8);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dvar_cur = vec![0.0f64; n_params];

        // ∂σ²_t/∂mu
        let mut d_mu = 0.0;
        for (i, &ai) in alpha.iter().enumerate() {
            d_mu += -2.0 * ai * residuals[t - 1 - i];
        }
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dvar_win[(t - 1 - j) % win][0];
        }
        dvar_cur[0] = d_mu;

        // ∂σ²_t/∂ω
        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dvar_win[(t - 1 - j) % win][1];
        }
        dvar_cur[1] = d_omega;

        // ∂σ²_t/∂α_i
        for i in 0..q {
            let k = 2 + i;
            let mut d_alpha = residuals[t - 1 - i].powi(2);
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dvar_win[(t - 1 - j) % win][k];
            }
            dvar_cur[k] = d_alpha;
        }

        // ∂σ²_t/∂β_j
        for j in 0..p {
            let k = 2 + q + j;
            let mut d_beta = var_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dvar_win[(t - 1 - j2) % win][k];
            }
            dvar_cur[k] = d_beta;
        }

        for val in dvar_cur.iter_mut() {
            if val.is_nan() {
                *val = 0.0;
            } else if *val > 1e10 {
                *val = 1e10;
            } else if *val < -1e10 {
                *val = -1e10;
            }
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t) / var_t;

        let mut g_t = vec![0.0; n_params];
        g_t[0] = factor * dvar_cur[0] - eps / var_t;
        g_t[1] = factor * dvar_cur[1] * omega;
        for i in 0..q {
            g_t[2 + i] = factor * dvar_cur[2 + i] * alpha[i];
        }
        for j in 0..p {
            g_t[2 + q + j] = factor * dvar_cur[2 + q + j] * beta[j];
        }

        for k in 0..n_params {
            grad[k] += g_t[k];
        }

        neg_ll += 0.5 * (var_t.ln() + eps2 / var_t);
        dvar_win[cur_slot] = dvar_cur;
    }

    if persistence >= limit {
        let diff = persistence - limit;
        let factor_penalty = 2.0 * 1e5 * diff;
        for i in 0..q {
            grad[1 + i] += factor_penalty * alpha[i];
        }
        for j in 0..p {
            grad[1 + q + j] += factor_penalty * beta[j];
        }
    }

    neg_ll + penalty
}

// OPG standard error computation for GARCH
fn compute_garch_opg_se(
    data: &[f64],
    p: usize,
    q: usize,
    mu: f64,
    omega: f64,
    alpha: &[f64],
    beta: &[f64],
) -> Option<Vec<f64>> {
    let n = data.len();
    let n_params = 2 + q + p;
    let max_lag = p.max(q).max(1);

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 = (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);

    let mut var_buf = Vec::with_capacity(n);
    for _ in 0..max_lag {
        var_buf.push(var_uncon);
    }

    let win = p.max(1);
    let mut dvar_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_params]; win];
    let mut opg_matrix = vec![vec![0.0f64; n_params]; n_params];

    for t in max_lag..n {
        let mut var_t = omega;
        for (i, &ai) in alpha.iter().enumerate() {
            var_t += ai * residuals[t - 1 - i].powi(2);
        }
        for (j, &bj) in beta.iter().enumerate() {
            var_t += bj * var_buf[t - 1 - j];
        }
        if var_t.is_nan() {
            return None;
        }
        var_t = var_t.min(1e20).max(1e-8);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dvar_cur = vec![0.0f64; n_params];

        // d_mu
        let mut d_mu = 0.0;
        for (i, &ai) in alpha.iter().enumerate() {
            d_mu += -2.0 * ai * residuals[t - 1 - i];
        }
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dvar_win[(t - 1 - j) % win][0];
        }
        dvar_cur[0] = d_mu;

        // d_omega
        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dvar_win[(t - 1 - j) % win][1];
        }
        dvar_cur[1] = d_omega;

        // d_alpha
        for i in 0..q {
            let k = 2 + i;
            let mut d_alpha = residuals[t - 1 - i].powi(2);
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dvar_win[(t - 1 - j) % win][k];
            }
            dvar_cur[k] = d_alpha;
        }

        // d_beta
        for j in 0..p {
            let k = 2 + q + j;
            let mut d_beta = var_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dvar_win[(t - 1 - j2) % win][k];
            }
            dvar_cur[k] = d_beta;
        }

        for val in dvar_cur.iter_mut() {
            if val.is_nan() {
                *val = 0.0;
            } else if *val > 1e10 {
                *val = 1e10;
            } else if *val < -1e10 {
                *val = -1e10;
            }
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t) / var_t;

        let mut g_t = vec![0.0; n_params];
        g_t[0] = factor * dvar_cur[0] - eps / var_t;
        g_t[1] = factor * dvar_cur[1];
        for i in 0..q {
            g_t[2 + i] = factor * dvar_cur[2 + i];
        }
        for j in 0..p {
            g_t[2 + q + j] = factor * dvar_cur[2 + q + j];
        }

        for k in 0..n_params {
            for l in 0..n_params {
                opg_matrix[k][l] += g_t[k] * g_t[l];
            }
        }
        dvar_win[cur_slot] = dvar_cur;
    }

    let inv_opg = invert_matrix(&opg_matrix)?;
    let mut se = vec![0.0; n_params];
    for k in 0..n_params {
        se[k] = inv_opg[k][k].max(0.0).sqrt();
    }

    Some(se)
}

pub(crate) fn estimate_garch_lbfgs(
    data: &[f64],
    p: usize,
    q: usize,
) -> (f64, f64, Vec<f64>, Vec<f64>, Vec<f64>, f64, Vec<f64>) {
    let n = data.len();
    let n_params = 2 + q + p;
    let max_lag = p.max(q).max(1);

    if n < 10 {
        let vu = data.iter().map(|r| r * r).sum::<f64>() / n.max(1) as f64;
        return (0.0, vu * 0.1, vec![0.1; q], vec![0.8; p], vec![vu; n], 0.0, vec![0.0; n_params]);
    }

    let sample_mean: f64 = data.iter().sum::<f64>() / n as f64;
    let residuals_init: Vec<f64> = data.iter().map(|&r| r - sample_mean).collect();
    let var_uncon: f64 = residuals_init.iter().map(|r| r * r).sum::<f64>() / n as f64;

    let mut x = vec![0.0f64; n_params];
    x[0] = sample_mean;
    x[1] = (var_uncon * 0.05).max(1e-12).ln();
    for i in 1..=q {
        x[1 + i] = 0.10_f64.ln();
    }
    for j in 1..=p {
        x[1 + q + j] = 0.80_f64.ln();
    }

    let mut var_buf = Vec::with_capacity(n);
    let _ = lbfgs()
        .with_max_iterations(500)
        .with_epsilon(1e-7)
        .minimize(
            &mut x,
            |x_cur, gx| {
                let neg_ll = garch_neg_ll_and_grad(data, x_cur, p, q, &mut var_buf, gx);
                Ok(neg_ll)
            },
            |_| false,
        );

    let mu_opt = x[0];
    let omega_opt = x[1].exp();
    let alpha_opt: Vec<f64> = (1..=q).map(|i| x[1 + i].exp()).collect();
    let beta_opt: Vec<f64> = (1..=p).map(|j| x[1 + q + j].exp()).collect();

    // Recompute final variance buffer
    let residuals_opt: Vec<f64> = data.iter().map(|&r| r - mu_opt).collect();
    let var_uncon_opt = (residuals_opt.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);
    
    var_buf.clear();
    for _ in 0..max_lag {
        var_buf.push(var_uncon_opt);
    }
    for t in max_lag..n {
        let mut vt = omega_opt;
        for (i, &ai) in alpha_opt.iter().enumerate() {
            vt += ai * residuals_opt[t - 1 - i].powi(2);
        }
        for (j, &bj) in beta_opt.iter().enumerate() {
            vt += bj * var_buf[t - 1 - j];
        }
        var_buf.push(vt.min(1e20).max(1e-8));
    }

    // Full log-likelihood (including standard constant)
    let n_eff = n - max_lag;
    let log_lik_unadj: f64 = var_buf
        .iter()
        .enumerate()
        .skip(max_lag)
        .filter(|(_, &v)| v > 0.0)
        .map(|(t, &v)| -0.5 * (v.ln() + residuals_opt[t].powi(2) / v))
        .sum();
    let log_lik = log_lik_unadj + (n_eff as f64) * (-0.5 * LOG_2_PI);

    let se = compute_garch_opg_se(data, p, q, mu_opt, omega_opt, &alpha_opt, &beta_opt)
        .unwrap_or_else(|| vec![0.0; n_params]);

    (mu_opt, omega_opt, alpha_opt, beta_opt, var_buf, log_lik, se)
}

// =====================================================================
// EGARCH(p,q) — Analytical Gradient & OPG Standard Errors
// =====================================================================
//
// Parameter layout:
//   x = [mu, ω, ln(α₁..q), γ₁..q, β₁..p]
//
fn egarch_neg_ll_and_grad(
    data: &[f64],
    x: &[f64],
    p: usize,
    q: usize,
    h_buf: &mut Vec<f64>,
    var_buf: &mut Vec<f64>,
    grad: &mut [f64],
) -> f64 {
    let n = data.len();
    for &val in x.iter() {
        if val.is_nan() || val.is_infinite() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
    }
    let n_params = 1 + 1 + 2 * q + p; // mu, omega, alpha, gamma, beta
    let max_lag = p.max(q).max(1);

    let mu = x[0];
    let omega = x[1];
    let alpha: Vec<f64> = (1..=q).map(|i| x[1 + i].exp()).collect();
    let gamma_v: Vec<f64> = (1..=q).map(|i| x[1 + q + i]).collect();
    let beta: Vec<f64> = (1 + 2 * q + 1..=1 + 2 * q + p).map(|i| x[i]).collect();

    let persistence = beta.iter().map(|&b| b.abs()).sum::<f64>();
    let mut penalty = 0.0;
    let limit = 0.999;
    if persistence >= limit {
        let diff = persistence - limit;
        penalty = 1e5 * diff * diff;
    }

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 =
        (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);
    let h_uncon = var_uncon.ln();



    h_buf.clear();
    var_buf.clear();
    for _ in 0..max_lag {
        h_buf.push(h_uncon);
        var_buf.push(var_uncon);
    }

    for g in grad.iter_mut() {
        *g = 0.0;
    }

    let win = p.max(1);
    let mut dh_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_params]; win];
    let mut neg_ll = 0.0f64;

    for t in max_lag..n {
        let mut h_t = omega;
        for (i, (&ai, &gi)) in alpha.iter().zip(gamma_v.iter()).enumerate() {
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals[t - 1 - i] / sigma_prev;
            h_t += ai * z_prev.abs() + gi * z_prev;
        }
        if h_t.is_nan() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
        h_t = h_t.min(46.0).max(-46.0);
        let var_t = h_t.exp().max(1e-8);
        h_buf.push(h_t);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dh_cur = vec![0.0f64; n_params];

        // ∂h_t/∂mu
        let mut d_mu = 0.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dh_win[(t - 1 - j) % win][0];
        }
        dh_cur[0] = d_mu;

        // ∂h_t/∂ω
        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dh_win[(t - 1 - j) % win][1];
        }
        dh_cur[1] = d_omega;

        // ∂h_t/∂α_i
        for i in 0..q {
            let k = 2 + i;
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals[t - 1 - i] / sigma_prev;
            let mut d_alpha = z_prev.abs();
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dh_win[(t - 1 - j) % win][k];
            }
            dh_cur[k] = d_alpha;
        }

        // ∂h_t/∂γ_i
        for i in 0..q {
            let k = 2 + q + i;
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals[t - 1 - i] / sigma_prev;
            let mut d_gamma = z_prev;
            for (j, &bj) in beta.iter().enumerate() {
                d_gamma += bj * dh_win[(t - 1 - j) % win][k];
            }
            dh_cur[k] = d_gamma;
        }

        // ∂h_t/∂β_j
        for j in 0..p {
            let k = 2 + 2 * q + j;
            let mut d_beta = h_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dh_win[(t - 1 - j2) % win][k];
            }
            dh_cur[k] = d_beta;
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t);

        let mut g_t = vec![0.0; n_params];
        g_t[0] = factor * dh_cur[0] - eps / var_t;
        g_t[1] = factor * dh_cur[1];
        for i in 0..q {
            g_t[2 + i] = factor * dh_cur[2 + i] * alpha[i];
        }
        for i in 0..q {
            g_t[2 + q + i] = factor * dh_cur[2 + q + i];
        }
        for j in 0..p {
            g_t[2 + 2 * q + j] = factor * dh_cur[2 + 2 * q + j];
        }

        for k in 0..n_params {
            grad[k] += g_t[k];
        }

        neg_ll += 0.5 * (h_t + eps2 / var_t);
        dh_win[cur_slot] = dh_cur;
    }

    if persistence >= limit {
        let diff = persistence - limit;
        let factor_penalty = 2.0 * 1e5 * diff;
        for j in 0..p {
            let sign = if beta[j] >= 0.0 { 1.0 } else { -1.0 };
            grad[2 + 2 * q + j] += factor_penalty * sign;
        }
    }

    neg_ll + penalty
}

// OPG standard error computation for EGARCH
fn compute_egarch_opg_se(
    data: &[f64],
    p: usize,
    q: usize,
    mu: f64,
    omega: f64,
    alpha: &[f64],
    gamma_v: &[f64],
    beta: &[f64],
) -> Option<Vec<f64>> {
    let n = data.len();
    let n_params = 1 + 1 + 2 * q + p;
    let max_lag = p.max(q).max(1);

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 = (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);
    let h_uncon = var_uncon.ln();

    let mut h_buf = Vec::with_capacity(n);
    let mut var_buf = Vec::with_capacity(n);
    for _ in 0..max_lag {
        h_buf.push(h_uncon);
        var_buf.push(var_uncon);
    }

    let win = p.max(1);
    let mut dh_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_params]; win];
    let mut opg_matrix = vec![vec![0.0f64; n_params]; n_params];

    for t in max_lag..n {
        let mut h_t = omega;
        for (i, (&ai, &gi)) in alpha.iter().zip(gamma_v.iter()).enumerate() {
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals[t - 1 - i] / sigma_prev;
            h_t += ai * z_prev.abs() + gi * z_prev;
        }
        for (j, &bj) in beta.iter().enumerate() {
            h_t += bj * h_buf[t - 1 - j];
        }
        if h_t.is_nan() {
            return None;
        }
        h_t = h_t.min(46.0).max(-46.0);
        let var_t = h_t.exp().max(1e-8);
        h_buf.push(h_t);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dh_cur = vec![0.0f64; n_params];

        // d_mu
        let mut d_mu = 0.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dh_win[(t - 1 - j) % win][0];
        }
        dh_cur[0] = d_mu;

        // d_omega
        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dh_win[(t - 1 - j) % win][1];
        }
        dh_cur[1] = d_omega;

        // d_alpha
        for i in 0..q {
            let k = 2 + i;
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals[t - 1 - i] / sigma_prev;
            let mut d_alpha = z_prev.abs();
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dh_win[(t - 1 - j) % win][k];
            }
            dh_cur[k] = d_alpha;
        }

        // d_gamma
        for i in 0..q {
            let k = 2 + q + i;
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals[t - 1 - i] / sigma_prev;
            let mut d_gamma = z_prev;
            for (j, &bj) in beta.iter().enumerate() {
                d_gamma += bj * dh_win[(t - 1 - j) % win][k];
            }
            dh_cur[k] = d_gamma;
        }

        // d_beta
        for j in 0..p {
            let k = 2 + 2 * q + j;
            let mut d_beta = h_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dh_win[(t - 1 - j2) % win][k];
            }
            dh_cur[k] = d_beta;
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t);

        let mut g_t = vec![0.0; n_params];
        g_t[0] = factor * dh_cur[0] - eps / var_t;
        g_t[1] = factor * dh_cur[1];
        for i in 0..q {
            g_t[2 + i] = factor * dh_cur[2 + i];
        }
        for i in 0..q {
            g_t[2 + q + i] = factor * dh_cur[2 + q + i];
        }
        for j in 0..p {
            g_t[2 + 2 * q + j] = factor * dh_cur[2 + 2 * q + j];
        }

        for k in 0..n_params {
            for l in 0..n_params {
                opg_matrix[k][l] += g_t[k] * g_t[l];
            }
        }
        dh_win[cur_slot] = dh_cur;
    }

    let inv_opg = invert_matrix(&opg_matrix)?;
    let mut se = vec![0.0; n_params];
    for k in 0..n_params {
        se[k] = inv_opg[k][k].max(0.0).sqrt();
    }

    Some(se)
}

pub(crate) fn estimate_egarch_lbfgs(
    data: &[f64],
    p: usize,
    q: usize,
) -> (f64, f64, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, f64, Vec<f64>) {
    let n = data.len();
    let n_params = 1 + 1 + 2 * q + p;
    let max_lag = p.max(q).max(1);

    if n < 10 {
        let vu = data.iter().map(|r| r * r).sum::<f64>() / n.max(1) as f64;
        return (0.0, 0.0, vec![0.3; q], vec![-0.1; q], vec![0.85; p], vec![vu; n], 0.0, vec![0.0; n_params]);
    }

    let sample_mean: f64 = data.iter().sum::<f64>() / n as f64;
    let residuals_init: Vec<f64> = data.iter().map(|&r| r - sample_mean).collect();
    let var_uncon: f64 = residuals_init.iter().map(|r| r * r).sum::<f64>() / n as f64;
    let h_uncon = var_uncon.max(1e-12).ln();

    let mut x = vec![0.0f64; n_params];
    x[0] = sample_mean;
    x[1] = h_uncon * 0.15;
    for i in 1..=q {
        x[1 + i] = 0.30_f64.ln();
    }
    for i in 1..=q {
        x[1 + q + i] = -0.05;
    }
    for j in 1..=p {
        x[1 + 2 * q + j] = 0.85;
    }

    let mut h_buf = Vec::with_capacity(n);
    let mut var_buf = Vec::with_capacity(n);

    let _ = lbfgs()
        .with_max_iterations(500)
        .with_epsilon(1e-7)
        .minimize(
            &mut x,
            |x_cur, gx| {
                let neg_ll = egarch_neg_ll_and_grad(data, x_cur, p, q, &mut h_buf, &mut var_buf, gx);
                Ok(neg_ll)
            },
            |_| false,
        );

    let mu_opt = x[0];
    let omega_opt = x[1];
    let alpha_opt: Vec<f64> = (1..=q).map(|i| x[1 + i].exp()).collect();
    let gamma_opt: Vec<f64> = (1..=q).map(|i| x[1 + q + i]).collect();
    let beta_opt: Vec<f64> = (1 + 2 * q + 1..=1 + 2 * q + p).map(|i| x[i]).collect();

    // Recompute final variance
    let residuals_opt: Vec<f64> = data.iter().map(|&r| r - mu_opt).collect();
    let var_uncon_opt = (residuals_opt.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);
    let h_uncon_opt = var_uncon_opt.ln();

    h_buf.clear();
    var_buf.clear();
    for _ in 0..max_lag {
        h_buf.push(h_uncon_opt);
        var_buf.push(var_uncon_opt);
    }
    for t in max_lag..n {
        let mut h_t = omega_opt;
        for (i, (&ai, &gi)) in alpha_opt.iter().zip(gamma_opt.iter()).enumerate() {
            let sigma_prev = var_buf[t - 1 - i].max(1e-16).sqrt();
            let z_prev = residuals_opt[t - 1 - i] / sigma_prev;
            h_t += ai * z_prev.abs() + gi * z_prev;
        }
        for (j, &bj) in beta_opt.iter().enumerate() {
            h_t += bj * h_buf[t - 1 - j];
        }
        h_t = h_t.min(46.0).max(-46.0);
        let var_t = h_t.exp().max(1e-8);
        h_buf.push(h_t);
        var_buf.push(var_t);
    }

    let n_eff = n - max_lag;
    let log_lik_unadj: f64 = h_buf
        .iter()
        .zip(var_buf.iter())
        .zip(residuals_opt.iter())
        .skip(max_lag)
        .map(|((&h, &v), &e)| -0.5 * (h + e * e / v))
        .sum();
    let log_lik = log_lik_unadj + (n_eff as f64) * (-0.5 * LOG_2_PI);

    let se = compute_egarch_opg_se(data, p, q, mu_opt, omega_opt, &alpha_opt, &gamma_opt, &beta_opt)
        .unwrap_or_else(|| vec![0.0; n_params]);

    (mu_opt, omega_opt, alpha_opt, gamma_opt, beta_opt, var_buf, log_lik, se)
}

// =====================================================================
// TGARCH(p,q) / GJR-GARCH — Analytical Gradient & OPG Standard Errors
// =====================================================================
//
// Parameter layout:
//   x = [mu, ln(ω), ln(α₁..q), γ₁..q, ln(β₁..p)]
//
fn tgarch_neg_ll_and_grad(
    data: &[f64],
    x: &[f64],
    p: usize,
    q: usize,
    var_buf: &mut Vec<f64>,
    grad: &mut [f64],
) -> f64 {
    let n = data.len();
    for &val in x.iter() {
        if val.is_nan() || val.is_infinite() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
    }
    let n_params = 2 + 2 * q + p;
    let max_lag = p.max(q).max(1);

    let mu = x[0];
    let omega = x[1].exp();
    let alpha: Vec<f64> = (1..=q).map(|i| x[1 + i].exp()).collect();
    let gamma_v: Vec<f64> = (1..=q).map(|i| x[1 + q + i]).collect();
    let beta: Vec<f64> = (1 + 2 * q + 1..=1 + 2 * q + p).map(|i| x[i].exp()).collect();

    let persistence = alpha.iter().sum::<f64>() + 0.5 * gamma_v.iter().sum::<f64>() + beta.iter().sum::<f64>();
    let mut penalty = 0.0;
    let limit = 0.999;
    if persistence >= limit {
        let diff = persistence - limit;
        penalty = 1e5 * diff * diff;
    }

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 =
        (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);



    var_buf.clear();
    for _ in 0..max_lag {
        var_buf.push(var_uncon);
    }

    for g in grad.iter_mut() {
        *g = 0.0;
    }

    let win = p.max(1);
    let mut dvar_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_params]; win];
    let mut neg_ll = 0.0f64;

    for t in max_lag..n {
        let mut var_t = omega;
        for (i, (&ai, &gi)) in alpha.iter().zip(gamma_v.iter()).enumerate() {
            let eps_prev = residuals[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            var_t += (ai + gi * indicator) * eps_prev * eps_prev;
        }
        if var_t.is_nan() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
        var_t = var_t.min(1e20).max(1e-8);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dvar_cur = vec![0.0f64; n_params];

        // ∂σ²_t/∂mu
        let mut d_mu = 0.0;
        for (i, (&ai, &gi)) in alpha.iter().zip(gamma_v.iter()).enumerate() {
            let eps_prev = residuals[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            d_mu += -2.0 * (ai + gi * indicator) * eps_prev;
        }
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dvar_win[(t - 1 - j) % win][0];
        }
        dvar_cur[0] = d_mu;

        // ∂σ²_t/∂ω
        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dvar_win[(t - 1 - j) % win][1];
        }
        dvar_cur[1] = d_omega;

        // ∂σ²_t/∂α_i
        for i in 0..q {
            let k = 2 + i;
            let mut d_alpha = residuals[t - 1 - i].powi(2);
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dvar_win[(t - 1 - j) % win][k];
            }
            dvar_cur[k] = d_alpha;
        }

        // ∂σ²_t/∂γ_i
        for i in 0..q {
            let k = 2 + q + i;
            let eps_prev = residuals[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            let mut d_gamma = indicator * eps_prev * eps_prev;
            for (j, &bj) in beta.iter().enumerate() {
                d_gamma += bj * dvar_win[(t - 1 - j) % win][k];
            }
            dvar_cur[k] = d_gamma;
        }

        // ∂σ²_t/∂β_j
        for j in 0..p {
            let k = 2 + 2 * q + j;
            let mut d_beta = var_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dvar_win[(t - 1 - j2) % win][k];
            }
            dvar_cur[k] = d_beta;
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t) / var_t;

        let mut g_t = vec![0.0; n_params];
        g_t[0] = factor * dvar_cur[0] - eps / var_t;
        g_t[1] = factor * dvar_cur[1] * omega;
        for i in 0..q {
            g_t[2 + i] = factor * dvar_cur[2 + i] * alpha[i];
        }
        for i in 0..q {
            g_t[2 + q + i] = factor * dvar_cur[2 + q + i];
        }
        for j in 0..p {
            g_t[2 + 2 * q + j] = factor * dvar_cur[2 + 2 * q + j] * beta[j];
        }

        for k in 0..n_params {
            grad[k] += g_t[k];
        }

        neg_ll += 0.5 * (var_t.ln() + eps2 / var_t);
        dvar_win[cur_slot] = dvar_cur;
    }

    if persistence >= limit {
        let diff = persistence - limit;
        let factor_penalty = 2.0 * 1e5 * diff;
        for i in 0..q {
            grad[2 + i] += factor_penalty * alpha[i];
        }
        for i in 0..q {
            grad[2 + q + i] += factor_penalty * 0.5;
        }
        for j in 0..p {
            grad[2 + 2 * q + j] += factor_penalty * beta[j];
        }
    }

    neg_ll + penalty
}

// OPG standard error computation for TGARCH
fn compute_tgarch_opg_se(
    data: &[f64],
    p: usize,
    q: usize,
    mu: f64,
    omega: f64,
    alpha: &[f64],
    gamma_v: &[f64],
    beta: &[f64],
) -> Option<Vec<f64>> {
    let n = data.len();
    let n_params = 2 + 2 * q + p;
    let max_lag = p.max(q).max(1);

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 = (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);

    let mut var_buf = Vec::with_capacity(n);
    for _ in 0..max_lag {
        var_buf.push(var_uncon);
    }

    let win = p.max(1);
    let mut dvar_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_params]; win];
    let mut opg_matrix = vec![vec![0.0f64; n_params]; n_params];

    for t in max_lag..n {
        let mut var_t = omega;
        for (i, (&ai, &gi)) in alpha.iter().zip(gamma_v.iter()).enumerate() {
            let eps_prev = residuals[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            var_t += (ai + gi * indicator) * eps_prev * eps_prev;
        }
        for (j, &bj) in beta.iter().enumerate() {
            var_t += bj * var_buf[t - 1 - j];
        }
        if var_t.is_nan() {
            return None;
        }
        var_t = var_t.min(1e20).max(1e-8);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dvar_cur = vec![0.0f64; n_params];

        // d_mu
        let mut d_mu = 0.0;
        for (i, (&ai, &gi)) in alpha.iter().zip(gamma_v.iter()).enumerate() {
            let eps_prev = residuals[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            d_mu += -2.0 * (ai + gi * indicator) * eps_prev;
        }
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dvar_win[(t - 1 - j) % win][0];
        }
        dvar_cur[0] = d_mu;

        // d_omega
        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dvar_win[(t - 1 - j) % win][1];
        }
        dvar_cur[1] = d_omega;

        // d_alpha
        for i in 0..q {
            let k = 2 + i;
            let mut d_alpha = residuals[t - 1 - i].powi(2);
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dvar_win[(t - 1 - j) % win][k];
            }
            dvar_cur[k] = d_alpha;
        }

        // d_gamma
        for i in 0..q {
            let k = 2 + q + i;
            let eps_prev = residuals[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            let mut d_gamma = indicator * eps_prev * eps_prev;
            for (j, &bj) in beta.iter().enumerate() {
                d_gamma += bj * dvar_win[(t - 1 - j) % win][k];
            }
            dvar_cur[k] = d_gamma;
        }

        // d_beta
        for j in 0..p {
            let k = 2 + 2 * q + j;
            let mut d_beta = var_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dvar_win[(t - 1 - j2) % win][k];
            }
            dvar_cur[k] = d_beta;
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t) / var_t;

        let mut g_t = vec![0.0; n_params];
        g_t[0] = factor * dvar_cur[0] - eps / var_t;
        g_t[1] = factor * dvar_cur[1];
        for i in 0..q {
            g_t[2 + i] = factor * dvar_cur[2 + i];
        }
        for i in 0..q {
            g_t[2 + q + i] = factor * dvar_cur[2 + q + i];
        }
        for j in 0..p {
            g_t[2 + 2 * q + j] = factor * dvar_cur[2 + 2 * q + j];
        }

        for k in 0..n_params {
            for l in 0..n_params {
                opg_matrix[k][l] += g_t[k] * g_t[l];
            }
        }
        dvar_win[cur_slot] = dvar_cur;
    }

    let inv_opg = invert_matrix(&opg_matrix)?;
    let mut se = vec![0.0; n_params];
    for k in 0..n_params {
        se[k] = inv_opg[k][k].max(0.0).sqrt();
    }

    Some(se)
}

pub(crate) fn estimate_tgarch_lbfgs(
    data: &[f64],
    p: usize,
    q: usize,
) -> (f64, f64, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, f64, Vec<f64>) {
    let n = data.len();
    let n_params = 2 + 2 * q + p;
    let max_lag = p.max(q).max(1);

    if n < 10 {
        let vu = data.iter().map(|r| r * r).sum::<f64>() / n.max(1) as f64;
        return (0.0, vu * 0.1, vec![0.05; q], vec![0.08; q], vec![0.85; p], vec![vu; n], 0.0, vec![0.0; n_params]);
    }

    let sample_mean: f64 = data.iter().sum::<f64>() / n as f64;
    let residuals_init: Vec<f64> = data.iter().map(|&r| r - sample_mean).collect();
    let var_uncon: f64 = residuals_init.iter().map(|r| r * r).sum::<f64>() / n as f64;

    let mut x = vec![0.0f64; n_params];
    x[0] = sample_mean;
    x[1] = (var_uncon * 0.05).max(1e-12).ln();
    for i in 1..=q {
        x[1 + i] = 0.05_f64.ln();
    }
    for i in 1..=q {
        x[1 + q + i] = 0.08;
    }
    for j in 1..=p {
        x[1 + 2 * q + j] = 0.85_f64.ln();
    }

    let mut var_buf = Vec::with_capacity(n);
    let _ = lbfgs()
        .with_max_iterations(500)
        .with_epsilon(1e-7)
        .minimize(
            &mut x,
            |x_cur, gx| {
                let neg_ll = tgarch_neg_ll_and_grad(data, x_cur, p, q, &mut var_buf, gx);
                Ok(neg_ll)
            },
            |_| false,
        );

    let mu_opt = x[0];
    let omega_opt = x[1].exp();
    let alpha_opt: Vec<f64> = (1..=q).map(|i| x[1 + i].exp()).collect();
    let gamma_opt: Vec<f64> = (1..=q).map(|i| x[1 + q + i]).collect();
    let beta_opt: Vec<f64> = (1 + 2 * q + 1..=1 + 2 * q + p).map(|i| x[i].exp()).collect();

    // Recompute final variance
    let residuals_opt: Vec<f64> = data.iter().map(|&r| r - mu_opt).collect();
    let var_uncon_opt = (residuals_opt.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);
    
    var_buf.clear();
    for _ in 0..max_lag {
        var_buf.push(var_uncon_opt);
    }
    for t in max_lag..n {
        let mut vt = omega_opt;
        for (i, (&ai, &gi)) in alpha_opt.iter().zip(gamma_opt.iter()).enumerate() {
            let eps_prev = residuals_opt[t - 1 - i];
            let indicator = if eps_prev < 0.0 { 1.0 } else { 0.0 };
            vt += (ai + gi * indicator) * eps_prev * eps_prev;
        }
        for (j, &bj) in beta_opt.iter().enumerate() {
            vt += bj * var_buf[t - 1 - j];
        }
        var_buf.push(vt.min(1e20).max(1e-8));
    }

    let n_eff = n - max_lag;
    let log_lik_unadj: f64 = var_buf
        .iter()
        .enumerate()
        .skip(max_lag)
        .filter(|(_, &v)| v > 0.0)
        .map(|(t, &v)| -0.5 * (v.ln() + residuals_opt[t].powi(2) / v))
        .sum();
    let log_lik = log_lik_unadj + (n_eff as f64) * (-0.5 * LOG_2_PI);

    let se = compute_tgarch_opg_se(data, p, q, mu_opt, omega_opt, &alpha_opt, &gamma_opt, &beta_opt)
        .unwrap_or_else(|| vec![0.0; n_params]);

    (mu_opt, omega_opt, alpha_opt, gamma_opt, beta_opt, var_buf, log_lik, se)
}

// =====================================================================
// IGARCH(p,q) — Integrated GARCH Model
// =====================================================================

fn safe_sigmoid(x: f64) -> f64 {
    if x >= 0.0 {
        1.0 / (1.0 + (-x).exp())
    } else {
        let ex = x.exp();
        ex / (1.0 + ex)
    }
}

// Stick-breaking map: maps unconstrained theta (size k-1) to w (sums to 1, non-negative, size k).
// Also returns the Jacobian J where J[i][j] = d(w_i) / d(theta_j).
fn stick_breaking_with_jacobian(theta: &[f64]) -> (Vec<f64>, Vec<Vec<f64>>) {
    let k = theta.len() + 1;
    let mut w = vec![0.0; k];
    let mut s = vec![0.0; k - 1];
    let mut remaining = 1.0;
    for i in 0..k - 1 {
        s[i] = safe_sigmoid(theta[i]);
        w[i] = remaining * s[i];
        remaining -= w[i];
    }
    w[k - 1] = remaining;

    let mut jacobian = vec![vec![0.0; k - 1]; k];
    for i in 0..k {
        for j in 0..k - 1 {
            if j < i {
                jacobian[i][j] = -w[i] * s[j];
            } else if j == i {
                jacobian[i][j] = w[i] * (1.0 - s[j]);
            } else {
                jacobian[i][j] = 0.0;
            }
        }
    }
    (w, jacobian)
}

fn igarch_neg_ll_and_grad(
    data: &[f64],
    x: &[f64],
    p: usize,
    q: usize,
    var_buf: &mut Vec<f64>,
    grad: &mut [f64],
) -> f64 {
    let n = data.len();
    let k_terms = q + p;
    let n_params = 2 + k_terms - 1;
    let max_lag = p.max(q).max(1);

    for &val in x.iter() {
        if val.is_nan() || val.is_infinite() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
    }

    let mu = x[0];
    let omega = x[1].exp();
    
    let theta = &x[2..n_params];
    let (w, jacobian) = stick_breaking_with_jacobian(theta);
    let alpha = &w[0..q];
    let beta = &w[q..q+p];

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 = (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);

    var_buf.clear();
    for _ in 0..max_lag {
        var_buf.push(var_uncon);
    }

    for g in grad.iter_mut() {
        *g = 0.0;
    }

    let win = p.max(1);
    let n_natural = 2 + k_terms;
    let mut dvar_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_natural]; win];
    let mut neg_ll = 0.0f64;

    let mut grad_natural = vec![0.0; n_natural];

    for t in max_lag..n {
        let mut var_t = omega;
        for (i, &ai) in alpha.iter().enumerate() {
            var_t += ai * residuals[t - 1 - i].powi(2);
        }
        if var_t.is_nan() {
            for g in grad.iter_mut() {
                *g = 0.0;
            }
            return 1e15;
        }
        var_t = var_t.min(1e20).max(1e-8);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dvar_cur = vec![0.0f64; n_natural];

        let mut d_mu = 0.0;
        for (i, &ai) in alpha.iter().enumerate() {
            d_mu += -2.0 * ai * residuals[t - 1 - i];
        }
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dvar_win[(t - 1 - j) % win][0];
        }
        dvar_cur[0] = d_mu;

        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dvar_win[(t - 1 - j) % win][1];
        }
        dvar_cur[1] = d_omega;

        for i in 0..q {
            let k_idx = 2 + i;
            let mut d_alpha = residuals[t - 1 - i].powi(2);
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dvar_win[(t - 1 - j) % win][k_idx];
            }
            dvar_cur[k_idx] = d_alpha;
        }

        for j in 0..p {
            let k_idx = 2 + q + j;
            let mut d_beta = var_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dvar_win[(t - 1 - j2) % win][k_idx];
            }
            dvar_cur[k_idx] = d_beta;
        }

        for val in dvar_cur.iter_mut() {
            if val.is_nan() {
                *val = 0.0;
            } else if *val > 1e10 {
                *val = 1e10;
            } else if *val < -1e10 {
                *val = -1e10;
            }
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t) / var_t;

        let mut g_t = vec![0.0; n_natural];
        g_t[0] = factor * dvar_cur[0] - eps / var_t;
        g_t[1] = factor * dvar_cur[1] * omega;
        for i in 0..q {
            g_t[2 + i] = factor * dvar_cur[2 + i];
        }
        for j in 0..p {
            g_t[2 + q + j] = factor * dvar_cur[2 + q + j];
        }

        for k_idx in 0..n_natural {
            grad_natural[k_idx] += g_t[k_idx];
        }

        neg_ll += 0.5 * (var_t.ln() + eps2 / var_t);
        dvar_win[cur_slot] = dvar_cur;
    }

    grad[0] = grad_natural[0];
    grad[1] = grad_natural[1];

    for j in 0..k_terms-1 {
        let mut g_theta = 0.0;
        for i in 0..k_terms {
            g_theta += grad_natural[2 + i] * jacobian[i][j];
        }
        grad[2 + j] = g_theta;
    }

    neg_ll
}

fn compute_igarch_opg_se(
    data: &[f64],
    p: usize,
    q: usize,
    mu: f64,
    omega: f64,
    theta: &[f64],
) -> Option<Vec<f64>> {
    let n = data.len();
    let k_terms = q + p;
    let n_phi = 2 + k_terms - 1;
    let n_psi = 2 + k_terms;
    let max_lag = p.max(q).max(1);

    let (w, jacobian) = stick_breaking_with_jacobian(theta);
    let alpha = &w[0..q];
    let beta = &w[q..q+p];

    let residuals: Vec<f64> = data.iter().map(|&r| r - mu).collect();
    let var_uncon: f64 = (residuals.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);

    let mut var_buf = Vec::with_capacity(n);
    for _ in 0..max_lag {
        var_buf.push(var_uncon);
    }

    let win = p.max(1);
    let mut dvar_win: Vec<Vec<f64>> = vec![vec![0.0f64; n_psi]; win];
    let mut opg_matrix = vec![vec![0.0f64; n_phi]; n_phi];

    for t in max_lag..n {
        let mut var_t = omega;
        for (i, &ai) in alpha.iter().enumerate() {
            var_t += ai * residuals[t - 1 - i].powi(2);
        }
        for (j, &bj) in beta.iter().enumerate() {
            var_t += bj * var_buf[t - 1 - j];
        }
        if var_t.is_nan() {
            return None;
        }
        var_t = var_t.min(1e20).max(1e-8);
        var_buf.push(var_t);

        let cur_slot = t % win;
        let mut dvar_cur = vec![0.0f64; n_psi];

        let mut d_mu = 0.0;
        for (i, &ai) in alpha.iter().enumerate() {
            d_mu += -2.0 * ai * residuals[t - 1 - i];
        }
        for (j, &bj) in beta.iter().enumerate() {
            d_mu += bj * dvar_win[(t - 1 - j) % win][0];
        }
        dvar_cur[0] = d_mu;

        let mut d_omega = 1.0;
        for (j, &bj) in beta.iter().enumerate() {
            d_omega += bj * dvar_win[(t - 1 - j) % win][1];
        }
        dvar_cur[1] = d_omega;

        for i in 0..q {
            let k_idx = 2 + i;
            let mut d_alpha = residuals[t - 1 - i].powi(2);
            for (j, &bj) in beta.iter().enumerate() {
                d_alpha += bj * dvar_win[(t - 1 - j) % win][k_idx];
            }
            dvar_cur[k_idx] = d_alpha;
        }

        for j in 0..p {
            let k_idx = 2 + q + j;
            let mut d_beta = var_buf[t - 1 - j];
            for (j2, &bj2) in beta.iter().enumerate() {
                d_beta += bj2 * dvar_win[(t - 1 - j2) % win][k_idx];
            }
            dvar_cur[k_idx] = d_beta;
        }

        for val in dvar_cur.iter_mut() {
            if val.is_nan() {
                *val = 0.0;
            } else if *val > 1e10 {
                *val = 1e10;
            } else if *val < -1e10 {
                *val = -1e10;
            }
        }

        let eps = residuals[t];
        let eps2 = eps.powi(2);
        let factor = 0.5 * (1.0 - eps2 / var_t) / var_t;

        let mut g_t_phi = vec![0.0; n_phi];
        g_t_phi[0] = factor * dvar_cur[0] - eps / var_t;
        g_t_phi[1] = factor * dvar_cur[1];
        
        for j in 0..k_terms-1 {
            let mut g_theta = 0.0;
            for i in 0..k_terms {
                g_theta += factor * dvar_cur[2 + i] * jacobian[i][j];
            }
            g_t_phi[2 + j] = g_theta;
        }

        for k_idx in 0..n_phi {
            for l_idx in 0..n_phi {
                opg_matrix[k_idx][l_idx] += g_t_phi[k_idx] * g_t_phi[l_idx];
            }
        }
        dvar_win[cur_slot] = dvar_cur;
    }

    let inv_opg_phi = invert_matrix(&opg_matrix)?;

    let mut j_psi = vec![vec![0.0f64; n_phi]; n_psi];
    j_psi[0][0] = 1.0;
    j_psi[1][1] = 1.0;
    for i in 0..k_terms {
        for j in 0..k_terms-1 {
            j_psi[2 + i][2 + j] = jacobian[i][j];
        }
    }

    let mut se = vec![0.0; n_psi];
    for k_idx in 0..n_psi {
        let mut var_k = 0.0;
        for r in 0..n_phi {
            for c in 0..n_phi {
                var_k += j_psi[k_idx][r] * inv_opg_phi[r][c] * j_psi[k_idx][c];
            }
        }
        se[k_idx] = var_k.max(0.0).sqrt();
    }

    Some(se)
}

pub(crate) fn estimate_igarch_lbfgs(
    data: &[f64],
    p: usize,
    q: usize,
) -> (f64, f64, Vec<f64>, Vec<f64>, Vec<f64>, f64, Vec<f64>) {
    let n = data.len();
    let k_terms = q + p;
    let n_params = 2 + k_terms - 1;
    let n_psi = 2 + k_terms;
    let max_lag = p.max(q).max(1);

    if n < 10 {
        let vu = data.iter().map(|r| r * r).sum::<f64>() / n.max(1) as f64;
        return (0.0, vu * 0.1, vec![0.1; q], vec![0.9; p], vec![vu; n], 0.0, vec![0.0; n_psi]);
    }

    let sample_mean: f64 = data.iter().sum::<f64>() / n as f64;
    let residuals_init: Vec<f64> = data.iter().map(|&r| r - sample_mean).collect();
    let var_uncon: f64 = residuals_init.iter().map(|r| r * r).sum::<f64>() / n as f64;

    let mut x = vec![0.0f64; n_params];
    x[0] = sample_mean;
    x[1] = (var_uncon * 0.05).max(1e-12).ln();
    
    for i in 0..k_terms-1 {
        x[2 + i] = 0.0;
    }

    let mut var_buf = Vec::with_capacity(n);
    let _ = lbfgs()
        .with_max_iterations(500)
        .with_epsilon(1e-7)
        .minimize(
            &mut x,
            |x_cur, gx| {
                let neg_ll = igarch_neg_ll_and_grad(data, x_cur, p, q, &mut var_buf, gx);
                Ok(neg_ll)
            },
            |_| false,
        );

    let mu_opt = x[0];
    let omega_opt = x[1].exp();
    let theta_opt = &x[2..n_params];
    let (w_opt, _) = stick_breaking_with_jacobian(theta_opt);
    let alpha_opt = w_opt[0..q].to_vec();
    let beta_opt = w_opt[q..q+p].to_vec();

    let residuals_opt: Vec<f64> = data.iter().map(|&r| r - mu_opt).collect();
    let var_uncon_opt = (residuals_opt.iter().map(|r| r * r).sum::<f64>() / n as f64).max(1e-12);
    
    var_buf.clear();
    for _ in 0..max_lag {
        var_buf.push(var_uncon_opt);
    }
    for t in max_lag..n {
        let mut vt = omega_opt;
        for (i, &ai) in alpha_opt.iter().enumerate() {
            vt += ai * residuals_opt[t - 1 - i].powi(2);
        }
        for (j, &bj) in beta_opt.iter().enumerate() {
            vt += bj * var_buf[t - 1 - j];
        }
        var_buf.push(vt.min(1e20).max(1e-8));
    }

    let n_eff = n - max_lag;
    let log_lik_unadj: f64 = var_buf
        .iter()
        .enumerate()
        .skip(max_lag)
        .filter(|(_, &v)| v > 0.0)
        .map(|(t, &v)| -0.5 * (v.ln() + residuals_opt[t].powi(2) / v))
        .sum();
    let log_lik = log_lik_unadj + (n_eff as f64) * (-0.5 * LOG_2_PI);

    let se = compute_igarch_opg_se(data, p, q, mu_opt, omega_opt, theta_opt)
        .unwrap_or_else(|| vec![0.0; n_psi]);

    (mu_opt, omega_opt, alpha_opt, beta_opt, var_buf, log_lik, se)
}
