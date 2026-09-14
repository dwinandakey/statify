use wasm_bindgen::prelude::*;
use crate::GARCH;
#[wasm_bindgen]
impl GARCH {
    /// Calculate conditional variance: σ²_t = ω + Σα_i·ε²_{t-i} + Σβ_j·σ²_{t-j}
    pub fn calculate_variance(&self, omega: f64, alpha: Vec<f64>, beta: Vec<f64>) -> Vec<f64> {
        let data = self.get_data();
        let n = data.len();
        let max_lag = self.p.max(self.q);
        let mut variance = Vec::with_capacity(n);
        
        // Unconditional variance untuk initial values
        let var_uncon: f64 = data.iter().map(|r| r * r).sum::<f64>() / n as f64;
        
        for _ in 0..max_lag {
            variance.push(var_uncon);
        }
        
        for t in max_lag..n {
            let mut var_t = omega;
            
            // ARCH terms: Σα_i·ε²_{t-i}
            for (i, &alpha_i) in alpha.iter().enumerate() {
                if t > i {
                    var_t += alpha_i * data[t - 1 - i].powi(2);
                }
            }
            
            // GARCH terms: Σβ_j·σ²_{t-j}
            for (j, &beta_j) in beta.iter().enumerate() {
                if t > j {
                    var_t += beta_j * variance[t - 1 - j];
                }
            }
            
            variance.push(var_t.max(1e-8)); // Ensure positive
        }
        
        variance
    }
}