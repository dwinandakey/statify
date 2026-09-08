use crate::ARDL;

// Note: generate_lags is NOT #[wasm_bindgen] because it returns tuple (internal use only)
impl ARDL {
    /// Generate lagged variables untuk ARDL regression (internal function)
    pub fn generate_lags(&self) -> (Vec<Vec<f64>>, Vec<f64>) {
        let n = self.y.len();
        let max_lag = self.p.max(*self.q.iter().max().unwrap_or(&0));
        let n_obs = n - max_lag;
        
        let mut x_matrix: Vec<Vec<f64>> = Vec::new();
        
        // Constant
        x_matrix.push(vec![1.0; n_obs]);
        
        // Lagged Y: Y_{t-1}, ..., Y_{t-p}
        for lag in 1..=self.p {
            let mut lagged = Vec::new();
            for t in max_lag..n {
                if t >= lag {
                    lagged.push(self.y[t - lag]);
                }
            }
            x_matrix.push(lagged);
        }
        
        // Lagged X variables (using flattened array)
        for var_idx in 0..self.n_vars {
            let q_j = self.q[var_idx];
            
            for lag in 0..=q_j {
                let mut lagged = Vec::new();
                for t in max_lag..n {
                    if t >= lag {
                        lagged.push(self.get_x(var_idx, t - lag));
                    }
                }
                x_matrix.push(lagged);
            }
        }
        
        // Y vector
        let y_vec = self.y[max_lag..].to_vec();
        
        (x_matrix, y_vec)
    }
}