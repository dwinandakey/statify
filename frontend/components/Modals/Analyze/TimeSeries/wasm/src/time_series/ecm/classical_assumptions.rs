use crate::ECM;
use crate::time_series::ecm::ols_helper::ols_matrix;
use core::f64;

impl ECM {
    /// Run classical assumptions on the short-run ECM residuals
    pub fn run_classical_assumptions(&mut self) {
        let residuals = self.ecm_residuals.clone();
        let n = residuals.len();

        if n < 4 {
            return; // Not enough data
        }

        self.run_normality_test(&residuals);
        self.run_autocorrelation_test(&residuals);
        self.run_heteroskedasticity_test(&residuals);
    }

    /// Jarque-Bera Test for Normality
    fn run_normality_test(&mut self, resid: &[f64]) {
        let n = resid.len() as f64;
        let mean = resid.iter().sum::<f64>() / n;
        
        let mut m2 = 0.0;
        let mut m3 = 0.0;
        let mut m4 = 0.0;
        
        for &r in resid {
            let dev = r - mean;
            let dev2 = dev * dev;
            m2 += dev2;
            m3 += dev2 * dev;
            m4 += dev2 * dev2;
        }
        
        m2 /= n;
        m3 /= n;
        m4 /= n;
        
        if m2 <= 0.0 {
            return;
        }

        let skewness = m3 / m2.powf(1.5);
        let kurtosis = m4 / (m2 * m2);
        
        // JB = (n/6) * (S^2 + (K - 3)^2 / 4)
        let jb_stat = (n / 6.0) * (skewness * skewness + (kurtosis - 3.0).powi(2) / 4.0);
        
        // Asymptotically Chi-Square(2)
        let p_value = chi_square_2_p_value(jb_stat);
        
        self.jb_stat = jb_stat;
        self.jb_p_value = p_value;
    }

    /// Breusch-Godfrey LM Test for Autocorrelation (lag = 1)
    fn run_autocorrelation_test(&mut self, resid: &[f64]) {
        let n = resid.len();
        let p = 1; // 1 lag for simple BG test
        
        if n <= p + 2 { return; }

        let eff_n = n - p; // number of observations for the regression
        
        // e_t
        let y_vec = resid[p..n].to_vec();
        
        // Original X matrix used for the short-run ECM but truncated for effective n
        // It has 2 + nx columns: [Intercept, ECT(-1), ΔX₁, ΔX₂, ...]
        // We also add lagged e_{t-1} as an additional independent variable
        
        // First retrieve ΔY, ΔX, ECT(-1) slices
        let nx = self.n_x;
        
        // To precisely match the original X, we rebuild it for eff_n observations
        // ΔX columns are from the original dataset. We stored them implicitly.
        // Easiest approach: we reconstruct the original X matrix row by row.
        
        // Re-extract first differences (same as estimate_short_run)
        let delta_y: Vec<f64> = self.y.windows(2).map(|w| w[1] - w[0]).collect(); // length n_orig - 1
        let m = delta_y.len(); // this should equal the length of ecm_residuals (n)
        
        let ect_lag: Vec<f64> = self.lr_residuals[..m].to_vec();
        
        let mut delta_xs: Vec<Vec<f64>> = Vec::new();
        let n_orig = self.y.len();
        for k in 0..nx {
            let col: Vec<f64> = (0..n_orig).map(|i| self.x_flat[k * n_orig + i]).collect();
            delta_xs.push(col.windows(2).map(|w| w[1] - w[0]).collect());
        }

        // Build X matrix for auxiliary regression: [intercept, ECT(-1), ΔX..., e_{t-1}]
        let x_mat: Vec<Vec<f64>> = (0..eff_n).map(|i| {
            // i+p points to the current observation in the residual array
            let idx = i + p;
            
            let mut row = vec![1.0, ect_lag[idx]];
            for k in 0..nx {
                row.push(delta_xs[k][idx]);
            }
            // Add lag of residual
            row.push(resid[i]); // e_{t-1}
            row
        }).collect();

        // Run regression
        let res = ols_matrix(&y_vec, &x_mat);
        
        // BG LM statistic = n * R² (where n is the effective number of observations in regression)
        let bg_stat = eff_n as f64 * res.r_squared;
        
        // Asymptotically Chi-Square(p)
        let p_value = chi_square_1_p_value(bg_stat);
        
        self.bg_stat = bg_stat;
        self.bg_p_value = p_value;
    }

    /// Breusch-Pagan-Godfrey Test for Heteroskedasticity
    fn run_heteroskedasticity_test(&mut self, resid: &[f64]) {
        let n = resid.len();
        
        // e_t^2
        let y_vec: Vec<f64> = resid.iter().map(|&r| r * r).collect();
        
        // Original X matrix (intercept, ECT(-1), ΔX...)
        let nx = self.n_x;
        let delta_y: Vec<f64> = self.y.windows(2).map(|w| w[1] - w[0]).collect();
        let m = delta_y.len();
        let ect_lag: Vec<f64> = self.lr_residuals[..m].to_vec();
        
        let mut delta_xs: Vec<Vec<f64>> = Vec::new();
        let n_orig = self.y.len();
        for k in 0..nx {
            let col: Vec<f64> = (0..n_orig).map(|i| self.x_flat[k * n_orig + i]).collect();
            delta_xs.push(col.windows(2).map(|w| w[1] - w[0]).collect());
        }

        let x_mat: Vec<Vec<f64>> = (0..n).map(|i| {
            let mut row = vec![1.0, ect_lag[i]];
            for k in 0..nx {
                row.push(delta_xs[k][i]);
            }
            row
        }).collect();
        
        let res = ols_matrix(&y_vec, &x_mat);
        
        // BP stat = n * R^2
        let bp_stat = n as f64 * res.r_squared;
        
        // Non-intercept predictors (k) -> Chi-Square(k)
        let df = 1 + nx;
        let p_value = chi_square_p_value(bp_stat, df as f64);
        
        self.bp_stat = bp_stat;
        self.bp_p_value = p_value;
    }
}

/// Helper: 1 - CDF of Chi-Square with 1 df
fn chi_square_1_p_value(x: f64) -> f64 {
    if x <= 0.0 { return 1.0; }
    // Chi-Square(1) is the square of a standard normal
    let z = x.sqrt();
    2.0 * (1.0 - standard_normal_cdf(z))
}

/// Helper: 1 - CDF of Chi-Square with 2 df
fn chi_square_2_p_value(x: f64) -> f64 {
    if x <= 0.0 { return 1.0; }
    // Exact CDF for df=2 is 1 - e^(-x/2). P-value is exactly e^(-x/2)
    (-x / 2.0).exp()
}

/// Helper: Approximate 1 - CDF of Chi-Square for general df
fn chi_square_p_value(x: f64, df: f64) -> f64 {
    if df == 1.0 { return chi_square_1_p_value(x); }
    if df == 2.0 { return chi_square_2_p_value(x); }
    if x <= 0.0 { return 1.0; }
    
    // Wilson-Hilferty transformation (very accurate proxy to normal distribution for Chi-Sq)
    let z = ((x / df).powf(1.0 / 3.0) - (1.0 - 2.0 / (9.0 * df))) / (2.0 / (9.0 * df)).sqrt();
    1.0 - standard_normal_cdf(z)
}

fn standard_normal_cdf(x: f64) -> f64 {
    let t = 1.0 / (1.0 + 0.2316419 * x.abs());
    let poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    let pdf = (-x * x / 2.0).exp() / (2.0 * core::f64::consts::PI).sqrt();
    if x >= 0.0 {
        1.0 - pdf * poly
    } else {
        pdf * poly
    }
}
