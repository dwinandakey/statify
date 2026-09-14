use wasm_bindgen::prelude::*;
use crate::ARDL;

#[wasm_bindgen]
impl ARDL {
    /// Calculate long-run coefficients from ARDL short-run estimates
    /// Long-run: θ_j = (Σβ_{j,k}) / (1 - Σα_i)
    pub fn calculate_long_run_coefficients(&self, short_run_coef: Vec<f64>) -> Vec<f64> {
        let mut long_run = Vec::new();
        
        // Extract coefficients from short_run_coef
        // Structure: [constant, α_1, ..., α_p, β_{1,0}, β_{1,1}, ..., β_{1,q1}, β_{2,0}, ...]
        
        let mut idx = 1; // Skip constant
        
        // Sum of AR coefficients: Σα_i
        let mut sum_ar = 0.0;
        for _ in 0..self.p {
            if idx < short_run_coef.len() {
                sum_ar += short_run_coef[idx];
                idx += 1;
            }
        }
        
        let denominator = 1.0 - sum_ar;
        
        if denominator.abs() < 1e-8 {
            // Non-stationary case
            return vec![f64::NAN; self.n_vars];
        }
        
        // For each X variable, sum its DL coefficients
        for var_idx in 0..self.n_vars {
            let q_j = self.q[var_idx];
            let mut sum_dl = 0.0;
            for _ in 0..=q_j {
                if idx < short_run_coef.len() {
                    sum_dl += short_run_coef[idx];
                    idx += 1;
                }
            }
            
            // Long-run coefficient
            let lr_coef = sum_dl / denominator;
            long_run.push(lr_coef);
        }
        
        long_run
    }
    
    /// Calculate standard errors for long-run coefficients (Delta method)
    /// SE(θ_j) ≈ SE(short_run) / (1 - Σα_i)  (simplified)
    pub fn calculate_long_run_se(&self, short_run_se: Vec<f64>) -> Vec<f64> {
        let mut lr_se = Vec::new();
        
        let mut idx = 1;
        let mut sum_ar = 0.0;
        for _ in 0..self.p {
            if idx < short_run_se.len() {
                sum_ar += short_run_se[idx];
                idx += 1;
            }
        }
        
        let denominator = 1.0 - sum_ar;
        
        for var_idx in 0..self.n_vars {
            let q_j = self.q[var_idx];
            let mut sum_se = 0.0;
            for _ in 0..=q_j {
                if idx < short_run_se.len() {
                    sum_se += short_run_se[idx].powi(2);
                    idx += 1;
                }
            }
            
            let se = (sum_se.sqrt()) / denominator.abs();
            lr_se.push(se);
        }
        
        lr_se
    }
}
