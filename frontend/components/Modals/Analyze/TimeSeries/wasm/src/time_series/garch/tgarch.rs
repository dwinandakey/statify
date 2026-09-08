use wasm_bindgen::prelude::*;
use crate::GARCH;
use crate::time_series::garch::optimizer::estimate_tgarch_lbfgs;

#[wasm_bindgen]
impl GARCH {
    /// TGARCH(p,q) / GJR-GARCH — Threshold GARCH
    ///
    /// Model: σ²_t = ω + Σ(α_i + γ_i·I_{t-i})·ε²_{t-i} + Σ β_j·σ²_{t-j}
    /// dimana I_{t-i} = 1 jika ε_{t-i} < 0 (leverage effect indicator)
    ///
    /// Interpretasi γ_i:
    ///   - γ_i > 0: bad news (ε < 0) meningkatkan volatilitas lebih besar
    ///   - γ_i = 0: simetrik (sama dengan GARCH standar)
    ///
    /// Estimasi: L-BFGS dengan analytical gradient.
    pub fn estimate_tgarch(&mut self) {
        let (mu_opt, omega_opt, alpha_opt, gamma_opt, beta_opt, variance, log_lik, se) =
            estimate_tgarch_lbfgs(&self.data, self.p, self.q);

        let max_lag = self.p.max(self.q).max(1);
        let n_eff = self.data.len() - max_lag;

        let aic = self.calculate_aic(log_lik);
        let bic = self.calculate_bic(log_lik, n_eff);

        self.set_mu(mu_opt);
        self.set_omega(omega_opt);
        self.set_alpha(alpha_opt);
        self.set_gamma(gamma_opt);
        self.set_beta(beta_opt);
        self.set_variance(variance);
        self.set_log_likelihood(log_lik);
        self.set_aic(aic);
        self.set_bic(bic);

        // Calculate z-stats and p-values
        // layout: [mu, omega, alpha_1..q, gamma_1..q, beta_1..p]
        let mut coefs = vec![mu_opt, omega_opt];
        coefs.extend(self.get_alpha());
        coefs.extend(self.get_gamma());
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

        let mut gamma_se = Vec::new();
        let mut gamma_z = Vec::new();
        let mut gamma_p = Vec::new();
        for i in 0..self.q {
            gamma_se.push(se[2 + self.q + i]);
            gamma_z.push(z_stats[2 + self.q + i]);
            gamma_p.push(p_values[2 + self.q + i]);
        }
        self.set_gamma_se(gamma_se);
        self.set_gamma_z(gamma_z);
        self.set_gamma_p(gamma_p);

        let mut beta_se = Vec::new();
        let mut beta_z = Vec::new();
        let mut beta_p = Vec::new();
        for j in 0..self.p {
            beta_se.push(se[2 + 2 * self.q + j]);
            beta_z.push(z_stats[2 + 2 * self.q + j]);
            beta_p.push(p_values[2 + 2 * self.q + j]);
        }
        self.set_beta_se(beta_se);
        self.set_beta_z(beta_z);
        self.set_beta_p(beta_p);
    }

    /// Hitung conditional variance untuk TGARCH secara manual (untuk inspeksi).
    pub fn calculate_tgarch_variance(
        &self,
        omega: f64,
        alpha: Vec<f64>,
        gamma: Vec<f64>,
        beta: Vec<f64>,
    ) -> Vec<f64> {
        let data = self.get_data();
        let n = data.len();
        let max_lag = self.p.max(self.q);
        let mut variance = Vec::with_capacity(n);

        let var_uncon: f64 = data.iter().map(|r| r * r).sum::<f64>() / n as f64;

        for _ in 0..max_lag {
            variance.push(var_uncon);
        }

        for t in max_lag..n {
            let mut var_t = omega;

            // ARCH terms with threshold: Σ(α_i + γ_i·I_{t-i})·ε²_{t-i}
            for (i, &alpha_i) in alpha.iter().enumerate() {
                if t > i {
                    let epsilon = data[t - 1 - i];
                    let indicator = if epsilon < 0.0 { 1.0 } else { 0.0 };
                    let coef = alpha_i + gamma.get(i).unwrap_or(&0.0) * indicator;
                    var_t += coef * epsilon * epsilon;
                }
            }

            // GARCH terms: Σ β_j·σ²_{t-j}
            for (j, &beta_j) in beta.iter().enumerate() {
                if t > j {
                    var_t += beta_j * variance[t - 1 - j];
                }
            }

            variance.push(var_t.max(1e-8));
        }

        variance
    }
}
