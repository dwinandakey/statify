use wasm_bindgen::prelude::*;
use crate::ARDL;
use crate::time_series::ecm::ols_helper::ols_matrix;

impl ARDL {
    /// 1 - CDF of Chi-Square with 1 df
    fn chi_square_1_p_value(x: f64) -> f64 {
        if x <= 0.0 { return 1.0; }
        let z = x.sqrt();
        2.0 * (1.0 - Self::standard_normal_cdf(z))
    }

    /// 1 - CDF of Chi-Square with 2 df
    fn chi_square_2_p_value(x: f64) -> f64 {
        if x <= 0.0 { return 1.0; }
        (-x / 2.0).exp()
    }

    /// Approximate 1 - CDF of Chi-Square for general df
    fn chi_square_p_value(x: f64, df: f64) -> f64 {
        if df == 1.0 { return Self::chi_square_1_p_value(x); }
        if df == 2.0 { return Self::chi_square_2_p_value(x); }
        if x <= 0.0 { return 1.0; }
        let z = ((x / df).powf(1.0 / 3.0) - (1.0 - 2.0 / (9.0 * df))) / (2.0 / (9.0 * df)).sqrt();
        1.0 - Self::standard_normal_cdf(z)
    }

    fn standard_normal_cdf(x: f64) -> f64 {
        let t = 1.0 / (1.0 + 0.2316419 * x.abs());
        let poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
        let pdf = (-x * x / 2.0).exp() / (2.0 * core::f64::consts::PI).sqrt();
        if x >= 0.0 { 1.0 - pdf * poly } else { pdf * poly }
    }

    fn mackinnon_p_value(tau: f64, n: usize) -> f64 {
        let n = n as f64;
        let tau_inf = -2.8621;
        let _tau_adj = tau - (tau_inf * 0.1 / n);
        let z = tau + 2.5; 
        Self::standard_normal_cdf(z)
    }
}

#[wasm_bindgen]
impl ARDL {
    #[wasm_bindgen]
    pub fn estimate_ardl_ecm(&mut self) -> Result<(), JsValue> {
        let n = self.y.len();
        if n < 10 {
            return Err(JsValue::from_str("Insufficient data points"));
        }

        // ==========================================
        // STEP 1 & 2: Long-Run Regression (Level)
        // Y_t = c + Σ β_k X_{k, t} + ε_t
        // ==========================================
        let mut x_mat_lr: Vec<Vec<f64>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut row = vec![1.0];
            for k in 0..self.n_vars {
                row.push(self.get_x(k, i));
            }
            x_mat_lr.push(row);
        }
        
        let lr_res = ols_matrix(&self.y, &x_mat_lr);
        self.lr_coefficients = lr_res.get_coefficients();
        self.lr_std_errors = lr_res.get_std_errors();
        self.lr_t_statistics = lr_res.get_t_statistics();
        self.lr_p_values = lr_res.get_p_values();
        self.lr_residuals = lr_res.get_residuals();
        self.lr_r_squared = lr_res.r_squared;
        self.lr_adj_r_squared = lr_res.adj_r_squared;
        self.lr_f_statistic = lr_res.f_statistic;

        // ==========================================
        // STEP 3: Cointegration Test (ADF on LR Residuals)
        // ==========================================
        let resid = &self.lr_residuals;
        let max_lag = 1; // Explicit max_lag for Engel-Granger representation
        
        let mut adf_test_stat = 0.0;
        let mut adf_p_val = 1.0;
        let mut is_coint = false;
        
        let delta_resid: Vec<f64> = resid.windows(2).map(|w| w[1] - w[0]).collect();
        let n_eff_adf = delta_resid.len() - max_lag;
        
        if n_eff_adf > 2 {
            let y_vec_adf: Vec<f64> = delta_resid[max_lag..].to_vec();
            let x_mat_adf: Vec<Vec<f64>> = (0..n_eff_adf).map(|i| {
                let mut row = vec![resid[max_lag + i]]; 
                for k in 1..=max_lag {
                    row.push(delta_resid[max_lag + i - k]); 
                }
                row
            }).collect();
            
            let res_adf = ols_matrix(&y_vec_adf, &x_mat_adf);
            let gamma = res_adf.get_coefficients().get(0).copied().unwrap_or(0.0);
            let se_gamma = res_adf.get_std_errors().get(0).copied().unwrap_or(1.0);
            adf_test_stat = if se_gamma > 0.0 { gamma / se_gamma } else { 0.0 };
            
            adf_p_val = Self::mackinnon_p_value(adf_test_stat, n);
            let critical_5pct = -3.37 - 4.2 / n as f64;
            is_coint = adf_test_stat < critical_5pct;
        }

        self.adf_statistic = adf_test_stat;
        self.adf_p_value = adf_p_val;
        self.is_cointegrated = is_coint;

        // ==========================================
        // STEP 4: Short-Run ARDL-ECM
        // ==========================================
        let max_q = self.q.iter().copied().max().unwrap_or(0);
        let max_lag_val = std::cmp::max(self.p, max_q);
        
        let start_idx = max_lag_val + 1;
        if start_idx >= n {
            return Err(JsValue::from_str("Not enough observations for requested lags"));
        }
        let eff_n = n - start_idx;

        let delta_y: Vec<f64> = self.y.windows(2).map(|w| w[1] - w[0]).collect();
        let mut delta_xs: Vec<Vec<f64>> = Vec::new();
        for k in 0..self.n_vars {
            let mut dx_col = Vec::with_capacity(n - 1);
            for i in 1..n {
                dx_col.push(self.get_x(k, i) - self.get_x(k, i - 1));
            }
            delta_xs.push(dx_col);
        }

        let mut y_sr = Vec::with_capacity(eff_n);
        let mut x_mat_sr: Vec<Vec<f64>> = Vec::with_capacity(eff_n);
        
        for t in start_idx..n {
            y_sr.push(delta_y[t - 1]);
            
            let mut row = vec![1.0]; // Intercept
            row.push(self.lr_residuals[t - 1]); // ECT(-1)
            
            for i in 1..=self.p {
                row.push(delta_y[(t - 1) - i]); // D(Y) lags
            }
            
            for k in 0..self.n_vars {
                for j in 0..=self.q[k] {
                    row.push(delta_xs[k][(t - 1) - j]); // D(X) lags
                }
            }
            x_mat_sr.push(row);
        }

        let sr_res = ols_matrix(&y_sr, &x_mat_sr);
        self.sr_coefficients = sr_res.get_coefficients();
        self.sr_std_errors = sr_res.get_std_errors();
        self.sr_t_statistics = sr_res.get_t_statistics();
        self.sr_p_values = sr_res.get_p_values();
        self.sr_residuals = sr_res.get_residuals();
        self.sr_r_squared = sr_res.r_squared;
        self.sr_adj_r_squared = sr_res.adj_r_squared;
        self.sr_f_statistic = sr_res.f_statistic;

        // ==========================================
        // STEP 5: Classical Assumptions
        // ==========================================
        let resid = &self.sr_residuals;
        if resid.len() < 4 {
            return Ok(());
        }

        // a) Normality (Jarque-Bera)
        let resid_n = resid.len() as f64;
        let mean = resid.iter().sum::<f64>() / resid_n;
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
        m2 /= resid_n; m3 /= resid_n; m4 /= resid_n;
        
        if m2 > 0.0 {
            let skewness = m3 / m2.powf(1.5);
            let kurtosis = m4 / (m2 * m2);
            self.jb_stat = (resid_n / 6.0) * (skewness * skewness + (kurtosis - 3.0).powi(2) / 4.0);
            self.jb_p_value = Self::chi_square_2_p_value(self.jb_stat);
        }

        // b) Autocorrelation (Breusch-Godfrey LM test, lag=1)
        let n_cols_sr = if !x_mat_sr.is_empty() { x_mat_sr[0].len() } else { 0 };
        if eff_n > 3 && n_cols_sr > 0 {
            let bg_n = eff_n - 1;
            let bg_y: Vec<f64> = resid[1..eff_n].to_vec();
            
            // Build BG X matrix row-by-row: [original X row (shifted), lagged residual]
            let mut bg_x_mat: Vec<Vec<f64>> = Vec::with_capacity(bg_n);
            for i in 0..bg_n {
                let mut row = x_mat_sr[i + 1].clone(); // original X row (shifted by 1)
                row.push(resid[i]); // lagged residual e_{t-1}
                bg_x_mat.push(row);
            }
            
            let bg_res = ols_matrix(&bg_y, &bg_x_mat);
            self.bg_stat = bg_n as f64 * bg_res.r_squared;
            self.bg_p_value = Self::chi_square_1_p_value(self.bg_stat);
        }

        // c) Heteroskedasticity (Breusch-Pagan)
        // Regress e_t^2 on original x_mat_sr
        let bp_y: Vec<f64> = resid.iter().map(|&r| r * r).collect();
        let bp_res = ols_matrix(&bp_y, &x_mat_sr);
        self.bp_stat = eff_n as f64 * bp_res.r_squared;
        let bp_df = if n_cols_sr > 1 { (n_cols_sr - 1) as f64 } else { 1.0 };
        self.bp_p_value = Self::chi_square_p_value(self.bp_stat, bp_df);

        Ok(())
    }
}
