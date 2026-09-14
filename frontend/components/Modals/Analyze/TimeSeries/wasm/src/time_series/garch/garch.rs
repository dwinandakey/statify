use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub struct GARCH {
    pub(crate) data: Vec<f64>,      // Returns
    pub(crate) p: usize,            // GARCH order
    pub(crate) q: usize,            // ARCH order
    omega: f64,          // Constant
    alpha: Vec<f64>,     // ARCH coefficients
    beta: Vec<f64>,      // GARCH coefficients
    variance: Vec<f64>,  // Conditional variance
    gamma: Vec<f64>,     // Asymmetry coefficients (EGARCH/TGARCH)
    aic: f64,
    bic: f64,
    log_likelihood: f64,
    mu: f64,             // Mean constant
    mu_se: f64,
    mu_z: f64,
    mu_p: f64,
    omega_se: f64,
    omega_z: f64,
    omega_p: f64,
    alpha_se: Vec<f64>,
    alpha_z: Vec<f64>,
    alpha_p: Vec<f64>,
    beta_se: Vec<f64>,
    beta_z: Vec<f64>,
    beta_p: Vec<f64>,
    gamma_se: Vec<f64>,
    gamma_z: Vec<f64>,
    gamma_p: Vec<f64>,
}
#[wasm_bindgen]
impl GARCH {
    #[wasm_bindgen(constructor)]
    pub fn new(data: Vec<f64>, p: usize, q: usize) -> GARCH {
        GARCH {
            data,
            p,
            q,
            omega: 0.0,
            alpha: vec![0.0; q],
            beta: vec![0.0; p],
            variance: Vec::new(),
            gamma: Vec::new(),
            aic: 0.0,
            bic: 0.0,
            log_likelihood: 0.0,
            mu: 0.0,
            mu_se: 0.0,
            mu_z: 0.0,
            mu_p: 1.0,
            omega_se: 0.0,
            omega_z: 0.0,
            omega_p: 1.0,
            alpha_se: vec![0.0; q],
            alpha_z: vec![0.0; q],
            alpha_p: vec![1.0; q],
            beta_se: vec![0.0; p],
            beta_z: vec![0.0; p],
            beta_p: vec![1.0; p],
            gamma_se: Vec::new(),
            gamma_z: Vec::new(),
            gamma_p: Vec::new(),
        }
    }
    // Getters
    pub fn get_data(&self) -> Vec<f64> { self.data.clone() }
    pub fn get_p(&self) -> usize { self.p }
    pub fn get_q(&self) -> usize { self.q }
    pub fn get_omega(&self) -> f64 { self.omega }
    pub fn get_alpha(&self) -> Vec<f64> { self.alpha.clone() }
    pub fn get_beta(&self) -> Vec<f64> { self.beta.clone() }
    pub fn get_variance(&self) -> Vec<f64> { self.variance.clone() }
    pub fn get_gamma(&self) -> Vec<f64> { self.gamma.clone() }
    pub fn get_aic(&self) -> f64 { self.aic }
    pub fn get_bic(&self) -> f64 { self.bic }
    pub fn get_log_likelihood(&self) -> f64 { self.log_likelihood }
    pub fn get_residuals(&self) -> Vec<f64> {
        self.data.iter().map(|&y| y - self.mu).collect()
    }
    pub fn get_mu(&self) -> f64 { self.mu }
    pub fn get_mu_se(&self) -> f64 { self.mu_se }
    pub fn get_mu_z(&self) -> f64 { self.mu_z }
    pub fn get_mu_p(&self) -> f64 { self.mu_p }
    pub fn get_omega_se(&self) -> f64 { self.omega_se }
    pub fn get_omega_z(&self) -> f64 { self.omega_z }
    pub fn get_omega_p(&self) -> f64 { self.omega_p }
    pub fn get_alpha_se(&self) -> Vec<f64> { self.alpha_se.clone() }
    pub fn get_alpha_z(&self) -> Vec<f64> { self.alpha_z.clone() }
    pub fn get_alpha_p(&self) -> Vec<f64> { self.alpha_p.clone() }
    pub fn get_beta_se(&self) -> Vec<f64> { self.beta_se.clone() }
    pub fn get_beta_z(&self) -> Vec<f64> { self.beta_z.clone() }
    pub fn get_beta_p(&self) -> Vec<f64> { self.beta_p.clone() }
    pub fn get_gamma_se(&self) -> Vec<f64> { self.gamma_se.clone() }
    pub fn get_gamma_z(&self) -> Vec<f64> { self.gamma_z.clone() }
    pub fn get_gamma_p(&self) -> Vec<f64> { self.gamma_p.clone() }

    // Setters
    pub fn set_omega(&mut self, omega: f64) { self.omega = omega; }
    pub fn set_alpha(&mut self, alpha: Vec<f64>) { self.alpha = alpha; }
    pub fn set_beta(&mut self, beta: Vec<f64>) { self.beta = beta; }
    pub fn set_variance(&mut self, variance: Vec<f64>) { self.variance = variance; }
    pub fn set_gamma(&mut self, gamma: Vec<f64>) { self.gamma = gamma; }
    pub fn set_aic(&mut self, aic: f64) { self.aic = aic; }
    pub fn set_bic(&mut self, bic: f64) { self.bic = bic; }
    pub fn set_log_likelihood(&mut self, ll: f64) { self.log_likelihood = ll; }
    pub fn set_mu(&mut self, mu: f64) { self.mu = mu; }
    pub fn set_mu_se(&mut self, se: f64) { self.mu_se = se; }
    pub fn set_mu_z(&mut self, z: f64) { self.mu_z = z; }
    pub fn set_mu_p(&mut self, p: f64) { self.mu_p = p; }
    pub fn set_omega_se(&mut self, se: f64) { self.omega_se = se; }
    pub fn set_omega_z(&mut self, z: f64) { self.omega_z = z; }
    pub fn set_omega_p(&mut self, p: f64) { self.omega_p = p; }
    pub fn set_alpha_se(&mut self, se: Vec<f64>) { self.alpha_se = se; }
    pub fn set_alpha_z(&mut self, z: Vec<f64>) { self.alpha_z = z; }
    pub fn set_alpha_p(&mut self, p: Vec<f64>) { self.alpha_p = p; }
    pub fn set_beta_se(&mut self, se: Vec<f64>) { self.beta_se = se; }
    pub fn set_beta_z(&mut self, z: Vec<f64>) { self.beta_z = z; }
    pub fn set_beta_p(&mut self, p: Vec<f64>) { self.beta_p = p; }
    pub fn set_gamma_se(&mut self, se: Vec<f64>) { self.gamma_se = se; }
    pub fn set_gamma_z(&mut self, z: Vec<f64>) { self.gamma_z = z; }
    pub fn set_gamma_p(&mut self, p: Vec<f64>) { self.gamma_p = p; }
}