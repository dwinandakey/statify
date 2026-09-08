use wasm_bindgen::prelude::*;

/// Full OLS result: coefficients, SE, t-stat, p-value for each param
#[wasm_bindgen]
pub struct OLSResult {
    pub n_obs: usize,
    pub n_params: usize,   // including intercept
    coefficients: Vec<f64>,
    std_errors:   Vec<f64>,
    t_statistics: Vec<f64>,
    p_values:     Vec<f64>,
    residuals:    Vec<f64>,
    fitted:       Vec<f64>,
    pub r_squared:  f64,
    pub adj_r_squared: f64,
    pub f_statistic: f64,
    pub sse: f64,
}

#[wasm_bindgen]
impl OLSResult {
    pub fn get_coefficients(&self) -> Vec<f64> { self.coefficients.clone() }
    pub fn get_std_errors(&self)   -> Vec<f64> { self.std_errors.clone() }
    pub fn get_t_statistics(&self) -> Vec<f64> { self.t_statistics.clone() }
    pub fn get_p_values(&self)     -> Vec<f64> { self.p_values.clone() }
    pub fn get_residuals(&self)    -> Vec<f64> { self.residuals.clone() }
    pub fn get_fitted(&self)       -> Vec<f64> { self.fitted.clone() }
    
    // For backward-compat (bivariate ECM): beta0 = coef[0], beta1 = coef[1]
    pub fn get_beta0(&self) -> f64 { self.coefficients.get(0).copied().unwrap_or(0.0) }
    pub fn get_beta1(&self) -> f64 { self.coefficients.get(1).copied().unwrap_or(0.0) }
}

/// Approximate Student-t p-value (two-tailed) using normal approximation for large df
/// For large df, t-dist ≈ normal, so we use Zelen & Severo (1964) approximation for CDF
fn t_p_value(t_stat: f64, df: usize) -> f64 {
    if df == 0 { return 1.0; }
    let t = t_stat.abs();
    let df = df as f64;
    
    // Use normal approximation for large df, otherwise use beta function approx
    // This is the Cornish-Fisher approximation for the t-distribution CDF
    let x = df / (df + t * t);
    // Regularized incomplete beta function approximation
    let p_one_tail = 0.5 * regularized_incomplete_beta(df / 2.0, 0.5, x);
    (2.0 * p_one_tail).min(1.0)
}

/// Regularized incomplete beta function I_x(a, b) approximation
/// Using continued fraction representation (Lentz's method)
fn regularized_incomplete_beta(a: f64, b: f64, x: f64) -> f64 {
    if x <= 0.0 { return 0.0; }
    if x >= 1.0 { return 1.0; }
    
    // Use symmetry relation if needed
    if x > (a + 1.0) / (a + b + 2.0) {
        return 1.0 - regularized_incomplete_beta(b, a, 1.0 - x);
    }
    
    let lbeta = ln_gamma(a) + ln_gamma(b) - ln_gamma(a + b);
    let front = (x.ln() * a + (1.0 - x).ln() * b - lbeta).exp() / a;
    
    // Lentz continued fraction
    let cf = beta_continued_fraction(a, b, x);
    (front * cf).min(1.0)
}

fn beta_continued_fraction(a: f64, b: f64, x: f64) -> f64 {
    let max_iter = 200;
    let eps = 3e-7;
    let fpmin = 1e-30;

    let qab = a + b;
    let qap = a + 1.0;
    let qam = a - 1.0;
    let mut c = 1.0;
    let mut d = 1.0 - qab * x / qap;
    if d.abs() < fpmin { d = fpmin; }
    d = 1.0 / d;
    let mut h = d;

    for m in 1..=max_iter {
        let m = m as f64;
        let m2 = 2.0 * m;
        // Even step
        let mut aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1.0 + aa * d;
        if d.abs() < fpmin { d = fpmin; }
        c = 1.0 + aa / c;
        if c.abs() < fpmin { c = fpmin; }
        d = 1.0 / d;
        h *= d * c;
        // Odd step
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1.0 + aa * d;
        if d.abs() < fpmin { d = fpmin; }
        c = 1.0 + aa / c;
        if c.abs() < fpmin { c = fpmin; }
        d = 1.0 / d;
        let del = d * c;
        h *= del;
        if (del - 1.0).abs() < eps { break; }
    }
    h
}

/// Stirling approximation for ln(Gamma(x))
fn ln_gamma(x: f64) -> f64 {
    if x <= 0.0 { return f64::INFINITY; }
    // Lanczos coefficients
    let g = 7.0;
    let p = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    let x = x - 1.0;
    let t = x + g + 0.5;
    let mut ser = p[0];
    for (i, &c) in p[1..].iter().enumerate() {
        ser += c / (x + (i + 1) as f64);
    }
    0.5 * (2.0 * std::f64::consts::PI).ln() + ser.ln() + (x + 0.5) * t.ln() - t
}

/// General multi-X OLS: X matrix (n×k) already includes intercept column.
/// Returns full OLSResult with SE, t-stat, p-value.
pub fn ols_matrix(y: &[f64], x_mat: &[Vec<f64>]) -> OLSResult {
    let n = y.len();
    let k = if n > 0 { x_mat[0].len() } else { 0 };
    
    if n < k + 1 {
        return empty_ols_result(k);
    }
    
    // X'X (k×k) and X'y (k×1)
    let mut xtx = vec![vec![0.0f64; k]; k];
    let mut xty = vec![0.0f64; k];
    
    for i in 0..n {
        for j in 0..k {
            xty[j] += x_mat[i][j] * y[i];
            for l in 0..k {
                xtx[j][l] += x_mat[i][j] * x_mat[i][l];
            }
        }
    }
    
    // Invert X'X using Gaussian elimination with partial pivoting
    let xtx_inv = match invert_matrix(&xtx) {
        Some(inv) => inv,
        None => return empty_ols_result(k),
    };
    
    // Coefficients: β = (X'X)⁻¹ X'y
    let mut beta = vec![0.0f64; k];
    for j in 0..k {
        for l in 0..k {
            beta[j] += xtx_inv[j][l] * xty[l];
        }
    }
    
    // Residuals and fitted values
    let mut residuals = vec![0.0f64; n];
    let mut fitted = vec![0.0f64; n];
    for i in 0..n {
        let yhat: f64 = (0..k).map(|j| beta[j] * x_mat[i][j]).sum();
        fitted[i] = yhat;
        residuals[i] = y[i] - yhat;
    }
    
    // SSE and SST for R²
    let sse: f64 = residuals.iter().map(|r| r * r).sum();
    let mean_y: f64 = y.iter().sum::<f64>() / n as f64;
    let sst: f64 = y.iter().map(|yi| (yi - mean_y).powi(2)).sum();
    
    let df_resid = n - k;  // degrees of freedom
    let sigma2 = sse / df_resid as f64;  // s²
    
    let r_squared = if sst > 0.0 { 1.0 - sse / sst } else { 0.0 };
    let adj_r_squared = if df_resid > 0 && sst > 0.0 {
        1.0 - (sse / df_resid as f64) / (sst / (n - 1) as f64)
    } else { 0.0 };
    
    let df_model = k - 1; // excluding intercept
    let f_statistic = if df_model > 0 && sse > 0.0 {
        ((sst - sse) / df_model as f64) / sigma2
    } else { 0.0 };
    
    // SE(β_j) = sqrt(σ² * (X'X)⁻¹_jj)
    let mut std_errors = vec![0.0f64; k];
    let mut t_statistics = vec![0.0f64; k];
    let mut p_values = vec![0.0f64; k];
    
    for j in 0..k {
        let se = (sigma2 * xtx_inv[j][j]).sqrt();
        std_errors[j] = se;
        let t = if se > 0.0 { beta[j] / se } else { 0.0 };
        t_statistics[j] = t;
        p_values[j] = t_p_value(t, df_resid);
    }
    
    OLSResult {
        n_obs: n,
        n_params: k,
        coefficients: beta,
        std_errors,
        t_statistics,
        p_values,
        residuals,
        fitted,
        r_squared,
        adj_r_squared,
        f_statistic,
        sse,
    }
}

fn empty_ols_result(k: usize) -> OLSResult {
    OLSResult {
        n_obs: 0, n_params: k,
        coefficients: vec![0.0; k], std_errors: vec![0.0; k],
        t_statistics: vec![0.0; k], p_values: vec![1.0; k],
        residuals: vec![], fitted: vec![],
        r_squared: 0.0, adj_r_squared: 0.0, f_statistic: 0.0, sse: 0.0,
    }
}

/// Invert a square matrix using Gauss-Jordan elimination
pub fn invert_matrix(mat: &[Vec<f64>]) -> Option<Vec<Vec<f64>>> {
    let n = mat.len();
    let mut aug: Vec<Vec<f64>> = mat.iter().enumerate().map(|(i, row)| {
        let mut r = row.clone();
        for j in 0..n {
            r.push(if i == j { 1.0 } else { 0.0 });
        }
        r
    }).collect();
    
    for col in 0..n {
        // Partial pivot
        let pivot = (col..n).max_by(|&a, &b| aug[a][col].abs().partial_cmp(&aug[b][col].abs()).unwrap_or(std::cmp::Ordering::Equal))?;
        aug.swap(col, pivot);
        
        let diag = aug[col][col];
        if diag.abs() < 1e-12 { return None; }
        
        for j in 0..(2 * n) {
            aug[col][j] /= diag;
        }
        for row in 0..n {
            if row != col {
                let factor = aug[row][col];
                for j in 0..(2 * n) {
                    let val = aug[col][j] * factor;
                    aug[row][j] -= val;
                }
            }
        }
    }
    
    Some(aug.iter().map(|row| row[n..].to_vec()).collect())
}
