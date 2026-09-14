use wasm_bindgen::prelude::*;
use crate::GARCH;
use crate::time_series::garch::optimizer::estimate_igarch_lbfgs;

#[wasm_bindgen]
impl GARCH {
    /// IGARCH(p,q) — Integrated GARCH
    ///
    /// Model: σ²_t = ω + Σ α_i·ε²_{t-i} + Σ β_j·σ²_{t-j}
    /// dengan restriksi: Σ α_i + Σ β_j = 1
    ///
    /// Estimasi: L-BFGS menggunakan stick-breaking parameterization.
    pub fn estimate_igarch(&mut self) {
        let (mu_opt, omega_opt, alpha_opt, beta_opt, variance, log_lik, se) =
            estimate_igarch_lbfgs(&self.data, self.p, self.q);

        let max_lag = self.p.max(self.q).max(1);
        let n_eff = self.data.len() - max_lag;

        // Gunakan jumlah parameter independen k = 1 (mu) + 1 (omega) + p + q - 1
        let k_indep = 1 + self.p + self.q;
        let aic = -2.0 * log_lik + 2.0 * k_indep as f64;
        let bic = -2.0 * log_lik + (k_indep as f64) * (n_eff as f64).ln();

        self.set_mu(mu_opt);
        self.set_omega(omega_opt);
        self.set_alpha(alpha_opt);
        self.set_beta(beta_opt);
        self.set_variance(variance);
        self.set_log_likelihood(log_lik);
        self.set_aic(aic);
        self.set_bic(bic);

        // Calculate z-stats and p-values
        // layout: [mu, omega, alpha_1..q, beta_1..p]
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
