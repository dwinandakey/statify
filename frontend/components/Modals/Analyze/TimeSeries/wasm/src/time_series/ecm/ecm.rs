use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ECM {
    pub(crate) y: Vec<f64>,          // Dependent variable
    pub(crate) x_flat: Vec<f64>,     // Independent vars, flattened (n_obs * n_x)
    pub(crate) n_x: usize,           // Number of independent variables
    pub(crate) max_lag_adf: usize,   // Lag for ADF test
    #[allow(dead_code)]
    pub(crate) max_lag_ecm: usize,   // Lag for ECM (currently unused in basic version)

    // ── Long-run regression: Y = c + β₁X₁ + β₂X₂ + …
    pub(crate) lr_coefficients: Vec<f64>,  // [intercept, β₁, β₂, ...]
    pub(crate) lr_std_errors:   Vec<f64>,
    pub(crate) lr_t_statistics: Vec<f64>,
    pub(crate) lr_p_values:     Vec<f64>,
    pub(crate) lr_residuals:    Vec<f64>,  // Equilibrium error / ECT
    pub(crate) lr_r_squared:    f64,
    pub(crate) lr_adj_r_squared: f64,
    pub(crate) lr_f_statistic:  f64,

    // ── Cointegration test (ADF on residuals)
    pub(crate) adf_statistic:  f64,
    pub(crate) adf_p_value:    f64,
    pub(crate) is_cointegrated: bool,

    // ── Short-run ECM: ΔY = α + γ·ECT(-1) + φ₁·ΔX₁ + φ₂·ΔX₂ + …
    pub(crate) ecm_coefficients: Vec<f64>,  // [α, γ, φ₁, φ₂, ...]
    pub(crate) ecm_std_errors:   Vec<f64>,
    pub(crate) ecm_t_statistics: Vec<f64>,
    pub(crate) ecm_p_values:     Vec<f64>,
    pub(crate) ecm_residuals:    Vec<f64>,
    pub(crate) ecm_r_squared:    f64,
    pub(crate) ecm_adj_r_squared: f64,
    pub(crate) ecm_f_statistic:  f64,

    // ── Diagnostic Tests (Short-run Residuals) ─────────────────────────────
    pub(crate) jb_stat: f64,
    pub(crate) jb_p_value: f64,
    pub(crate) bg_stat: f64,
    pub(crate) bg_p_value: f64,
    pub(crate) bp_stat: f64,
    pub(crate) bp_p_value: f64,
}

#[wasm_bindgen]
impl ECM {
    #[wasm_bindgen(constructor)]
    pub fn new(
        y: Vec<f64>,
        x_flat: Vec<f64>,
        n_x: usize,
        max_lag_adf: usize,
        max_lag_ecm: usize,
    ) -> ECM {
        ECM {
            y,
            x_flat,
            n_x,
            max_lag_adf,
            max_lag_ecm,
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
            ecm_coefficients: Vec::new(),
            ecm_std_errors: Vec::new(),
            ecm_t_statistics: Vec::new(),
            ecm_p_values: Vec::new(),
            ecm_residuals: Vec::new(),
            ecm_r_squared: 0.0,
            ecm_adj_r_squared: 0.0,
            ecm_f_statistic: 0.0,
            jb_stat: 0.0,
            jb_p_value: 1.0,
            bg_stat: 0.0,
            bg_p_value: 1.0,
            bp_stat: 0.0,
            bp_p_value: 1.0,
        }
    }

    // ── Long-run getters ────────────────────────────────────────────────────
    pub fn get_lr_coefficients(&self)  -> Vec<f64> { self.lr_coefficients.clone() }
    pub fn get_lr_std_errors(&self)    -> Vec<f64> { self.lr_std_errors.clone() }
    pub fn get_lr_t_statistics(&self)  -> Vec<f64> { self.lr_t_statistics.clone() }
    pub fn get_lr_p_values(&self)      -> Vec<f64> { self.lr_p_values.clone() }
    pub fn get_lr_residuals(&self)     -> Vec<f64> { self.lr_residuals.clone() }
    pub fn get_lr_r_squared(&self)     -> f64 { self.lr_r_squared }
    pub fn get_lr_adj_r_squared(&self) -> f64 { self.lr_adj_r_squared }
    pub fn get_lr_f_statistic(&self)   -> f64 { self.lr_f_statistic }

    // ── Cointegration getters ───────────────────────────────────────────────
    pub fn get_adf_statistic(&self) -> f64  { self.adf_statistic }
    pub fn get_adf_p_value(&self)   -> f64  { self.adf_p_value }
    pub fn get_is_cointegrated(&self) -> bool { self.is_cointegrated }

    // ── ECM getters ─────────────────────────────────────────────────────────
    pub fn get_ecm_coefficients(&self)  -> Vec<f64> { self.ecm_coefficients.clone() }
    pub fn get_ecm_std_errors(&self)    -> Vec<f64> { self.ecm_std_errors.clone() }
    pub fn get_ecm_t_statistics(&self)  -> Vec<f64> { self.ecm_t_statistics.clone() }
    pub fn get_ecm_p_values(&self)      -> Vec<f64> { self.ecm_p_values.clone() }
    pub fn get_ecm_residuals(&self)     -> Vec<f64> { self.ecm_residuals.clone() }
    pub fn get_ecm_r_squared(&self)     -> f64 { self.ecm_r_squared }
    pub fn get_ecm_adj_r_squared(&self) -> f64 { self.ecm_adj_r_squared }
    pub fn get_ecm_f_statistic(&self)   -> f64 { self.ecm_f_statistic }

    // ── Diagnostic getters ──────────────────────────────────────────────────
    pub fn get_jb_stat(&self) -> f64 { self.jb_stat }
    pub fn get_jb_p_value(&self) -> f64 { self.jb_p_value }
    pub fn get_bg_stat(&self) -> f64 { self.bg_stat }
    pub fn get_bg_p_value(&self) -> f64 { self.bg_p_value }
    pub fn get_bp_stat(&self) -> f64 { self.bp_stat }
    pub fn get_bp_p_value(&self) -> f64 { self.bp_p_value }

    // ── Legacy compat ───────────────────────────────────────────────────────
    /// For backward compat with old bivariate structs
    pub fn get_long_run_beta0(&self) -> f64 { self.lr_coefficients.get(0).copied().unwrap_or(0.0) }
    pub fn get_long_run_beta1(&self) -> f64 { self.lr_coefficients.get(1).copied().unwrap_or(0.0) }
    pub fn get_r_squared(&self)      -> f64 { self.ecm_r_squared }

    // ── Main entry point (exposed to WASM) ──────────────────────────────────
    /// Run the full ECM chain:
    /// 1. Long-run OLS: Y = c + β₁X₁ + ...
    /// 2. Cointegration test (ADF on residuals)
    /// 3. Short-run ECM: ΔY = α + γ·ECT(-1) + φ·ΔX + ε
    /// 4. Classical Assumptions on ECM residuals
    pub fn estimate_ecm(&mut self) {
        self.estimate_long_run();
        self.test_cointegration();
        // Always run short-run, even if not cointegrated (user can interpret)
        self.estimate_short_run();
        // Run Classical Assumptions on ECM short-run residuals
        self.run_classical_assumptions();
    }
}