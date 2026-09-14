use wasm_bindgen::prelude::*;
use crate::GARCH;
use crate::time_series::garch::optimizer::estimate_garch_lbfgs;

#[wasm_bindgen]
impl GARCH {
    /// Calculate AIC: -2·LL + 2·k
    pub fn calculate_aic(&self, log_likelihood: f64) -> f64 {
        let k = 2 + self.p + self.q; // mu + omega + alpha + beta
        -2.0 * log_likelihood + 2.0 * k as f64
    }

    /// Calculate BIC: -2·LL + k·ln(n)
    pub fn calculate_bic(&self, log_likelihood: f64, n: usize) -> f64 {
        let k = 2 + self.p + self.q;
        -2.0 * log_likelihood + (k as f64) * (n as f64).ln()
    }

    /// Estimasi GARCH(p,q) via L-BFGS dengan analytical gradient.
    pub fn estimate(&mut self) {
        let (mu_opt, omega_opt, alpha_opt, beta_opt, variance, log_lik, se) =
            estimate_garch_lbfgs(&self.data, self.p, self.q);

        let max_lag = self.p.max(self.q).max(1);
        let n_eff = self.data.len() - max_lag;

        let aic = self.calculate_aic(log_lik);
        let bic = self.calculate_bic(log_lik, n_eff);

        self.set_mu(mu_opt);
        self.set_omega(omega_opt);
        self.set_alpha(alpha_opt);
        self.set_beta(beta_opt);
        self.set_variance(variance);
        self.set_log_likelihood(log_lik);
        self.set_aic(aic);
        self.set_bic(bic);

        // Calculate z-stats and p-values
        let mut coefs = vec![mu_opt, omega_opt];
        coefs.extend(self.get_alpha());
        coefs.extend(self.get_beta());

        let (z_stats, p_values) = crate::time_series::garch::optimizer::compute_z_and_p(&coefs, &se);

        self.set_mu_se(se[0]);
        self.set_mu_z(z_stats[0]);
        self.set_mu_p(p_values[0]);

        self.set_omega_se(se[1]);
        self.set_omega_z(z_stats[1]);
        self.set_omega_p(p_values[1]);

        let mut alpha_se = Vec::new();
        let mut alpha_z = Vec::new();
        let mut alpha_p = Vec::new();
        for i in 0..self.q {
            alpha_se.push(se[2 + i]);
            alpha_z.push(z_stats[2 + i]);
            alpha_p.push(p_values[2 + i]);
        }
        self.set_alpha_se(alpha_se);
        self.set_alpha_z(alpha_z);
        self.set_alpha_p(alpha_p);

        let mut beta_se = Vec::new();
        let mut beta_z = Vec::new();
        let mut beta_p = Vec::new();
        for j in 0..self.p {
            beta_se.push(se[2 + self.q + j]);
            beta_z.push(z_stats[2 + self.q + j]);
            beta_p.push(p_values[2 + self.q + j]);
        }
        self.set_beta_se(beta_se);
        self.set_beta_z(beta_z);
        self.set_beta_p(beta_p);
    }
}