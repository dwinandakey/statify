use wasm_bindgen::prelude::*;
use crate::GARCH;
#[wasm_bindgen]
impl GARCH {
    /// Calculate log-likelihood: LL = -0.5 Σ(ln(σ²_t) + ε²_t/σ²_t)
    pub fn calculate_log_likelihood(&self, variance: Vec<f64>) -> f64 {
        let data = self.get_data();
        let max_lag = self.p.max(self.q);
        let mut log_lik = 0.0;
        
        for (i, &var) in variance.iter().enumerate() {
            if var > 0.0 && i + max_lag < data.len() {
                let epsilon = data[i + max_lag];
                log_lik += -0.5 * (var.ln() + epsilon * epsilon / var);
            }
        }
        
        log_lik
    }
}