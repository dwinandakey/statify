use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ARDL {
    pub(crate) y: Vec<f64>,
    pub(crate) x_flat: Vec<f64>,  // Flattened 2D array
    pub(crate) n_vars: usize,     // Number of X variables
    pub(crate) n_obs: usize,      // Number of observations per variable
    pub(crate) p: usize,          // AutoRegressive order for Delta Y
    pub(crate) q: Vec<usize>,     // Distributed Lag order for Delta X
    
    // ── Step 1 & 2: Long Run Equation (Level) ──
    pub(crate) lr_coefficients: Vec<f64>,
    pub(crate) lr_std_errors: Vec<f64>,
    pub(crate) lr_t_statistics: Vec<f64>,
    pub(crate) lr_p_values: Vec<f64>,
    pub(crate) lr_residuals: Vec<f64>,
    pub(crate) lr_r_squared: f64,
    pub(crate) lr_adj_r_squared: f64,
    pub(crate) lr_f_statistic: f64,

    // ── Step 3: Cointegration Test (ADF on Residuals) ──
    pub(crate) adf_statistic:  f64,
    pub(crate) adf_p_value:    f64,
    pub(crate) is_cointegrated: bool,

    // ── Step 4: Short Run ARDL-ECM ──
    pub(crate) sr_coefficients: Vec<f64>,
    pub(crate) sr_std_errors: Vec<f64>,
    pub(crate) sr_t_statistics: Vec<f64>,
    pub(crate) sr_p_values: Vec<f64>,
    pub(crate) sr_residuals: Vec<f64>,
    pub(crate) sr_r_squared: f64,
    pub(crate) sr_adj_r_squared: f64,
    pub(crate) sr_f_statistic: f64,

    // ── Step 5: Classical Assumptions on SR ──
    pub(crate) jb_stat: f64,
    pub(crate) jb_p_value: f64,
    pub(crate) bg_stat: f64,
    pub(crate) bg_p_value: f64,
    pub(crate) bp_stat: f64,
    pub(crate) bp_p_value: f64,
}

#[wasm_bindgen]
impl ARDL {
    #[wasm_bindgen(constructor)]
    pub fn new(
        y: Vec<f64>, 
        x_flat: Vec<f64>,
        n_vars: usize,
        p: usize,
        q_flat: Vec<usize>
    ) -> Result<ARDL, JsValue> {
        let n_obs = y.len();
        
        if x_flat.len() != n_vars * n_obs {
            return Err(JsValue::from_str("X dimensions mismatch"));
        }
        
        if q_flat.len() != n_vars {
            return Err(JsValue::from_str("Q length mismatch"));
        }
        
        Ok(ARDL {
            y,
            x_flat,
            n_vars,
            n_obs,
            p,
            q: q_flat,
            
            lr_coefficients: Vec::new(),
            lr_std_errors: Vec::new(),
            lr_t_statistics: Vec::new(),
            lr_p_values: Vec::new(),
            lr_residuals: Vec::new(),
            lr_r_squared: 0.0,
            lr_adj_r_squared: 0.0,
            lr_f_statistic: 0.0,

            adf_statistic: 0.0,
            adf_p_value: 1.0,
            is_cointegrated: false,

            sr_coefficients: Vec::new(),
            sr_std_errors: Vec::new(),
            sr_t_statistics: Vec::new(),
            sr_p_values: Vec::new(),
            sr_residuals: Vec::new(),
            sr_r_squared: 0.0,
            sr_adj_r_squared: 0.0,
            sr_f_statistic: 0.0,

            jb_stat: 0.0,
            jb_p_value: 1.0,
            bg_stat: 0.0,
            bg_p_value: 1.0,
            bp_stat: 0.0,
            bp_p_value: 1.0,
        })
    }
    
    // Helper: Get X variable i at observation t
    pub fn get_x(&self, var_index: usize, obs_index: usize) -> f64 {
        if var_index >= self.n_vars || obs_index >= self.n_obs {
            return 0.0;
        }
        self.x_flat[var_index * self.n_obs + obs_index]
    }
    
    // Getters
    pub fn get_lr_coefficients(&self) -> Vec<f64> { self.lr_coefficients.clone() }
    pub fn get_lr_std_errors(&self) -> Vec<f64> { self.lr_std_errors.clone() }
    pub fn get_lr_t_statistics(&self) -> Vec<f64> { self.lr_t_statistics.clone() }
    pub fn get_lr_p_values(&self) -> Vec<f64> { self.lr_p_values.clone() }
    pub fn get_lr_residuals(&self) -> Vec<f64> { self.lr_residuals.clone() }
    pub fn get_lr_r_squared(&self) -> f64 { self.lr_r_squared }
    pub fn get_lr_adj_r_squared(&self) -> f64 { self.lr_adj_r_squared }
    pub fn get_lr_f_statistic(&self) -> f64 { self.lr_f_statistic }

    pub fn get_adf_statistic(&self) -> f64 { self.adf_statistic }
    pub fn get_adf_p_value(&self) -> f64 { self.adf_p_value }
    pub fn get_is_cointegrated(&self) -> bool { self.is_cointegrated }

    pub fn get_sr_coefficients(&self) -> Vec<f64> { self.sr_coefficients.clone() }
    pub fn get_sr_std_errors(&self) -> Vec<f64> { self.sr_std_errors.clone() }
    pub fn get_sr_t_statistics(&self) -> Vec<f64> { self.sr_t_statistics.clone() }
    pub fn get_sr_p_values(&self) -> Vec<f64> { self.sr_p_values.clone() }
    pub fn get_sr_residuals(&self) -> Vec<f64> { self.sr_residuals.clone() }
    pub fn get_sr_r_squared(&self) -> f64 { self.sr_r_squared }
    pub fn get_sr_adj_r_squared(&self) -> f64 { self.sr_adj_r_squared }
    pub fn get_sr_f_statistic(&self) -> f64 { self.sr_f_statistic }

    pub fn get_jb_stat(&self) -> f64 { self.jb_stat }
    pub fn get_jb_p_value(&self) -> f64 { self.jb_p_value }
    pub fn get_bg_stat(&self) -> f64 { self.bg_stat }
    pub fn get_bg_p_value(&self) -> f64 { self.bg_p_value }
    pub fn get_bp_stat(&self) -> f64 { self.bp_stat }
    pub fn get_bp_p_value(&self) -> f64 { self.bp_p_value }

    pub fn get_n_vars(&self) -> usize { self.n_vars }
    pub fn get_n_obs(&self) -> usize { self.n_obs }
}