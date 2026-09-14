use wasm_bindgen::prelude::*;

// Helper structs for WASM returns (fields are public, no need for getters)
// IMPORTANT: No impl blocks with getters - would cause infinite recursion

#[wasm_bindgen]
pub struct ArchLMResult {
    pub lm_statistic: f64,
    pub p_value: f64,
    pub has_arch_effect: bool,
    pub f_statistic: f64,
    pub f_p_value: f64,
}

#[wasm_bindgen]
pub struct CointegrationResult {
    pub adf_statistic: f64,
    pub is_cointegrated: bool,
}

#[wasm_bindgen]
pub struct BoundsTestResult {
    pub f_statistic: f64,
    pub has_cointegration: bool,
}

// CriticalValues is internal-only (not exposed to WASM)
pub struct CriticalValues {
    pub i0_bound: f64,
    pub i1_bound: f64,
}

