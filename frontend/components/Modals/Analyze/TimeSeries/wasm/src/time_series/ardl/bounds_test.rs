use wasm_bindgen::prelude::*;
use crate::ARDL;
use crate::time_series::helper_structs::{BoundsTestResult, CriticalValues};

#[wasm_bindgen]
impl ARDL {
    /// Pesaran ARDL Bounds Test for Cointegration
    /// F-statistic untuk test: H0: No long-run relationship
    pub fn calculate_bounds_test(&self, unrestricted_ssr: f64, restricted_ssr: f64, n_obs: usize) -> BoundsTestResult {
        let k = self.n_vars; // Use struct field instead of x.len()
        
        // F-statistic = ((SSR_r - SSR_u) / k) / (SSR_u / (n - k - 1))
        let numerator = (restricted_ssr - unrestricted_ssr) / k as f64;
        let denominator = unrestricted_ssr / (n_obs - k - 1) as f64;
        let f_stat = numerator / denominator;
        
        // Critical values dari Pesaran et al (2001) Table CI(iii) Case III
        // Simplified: untuk k=2, n=100, α=5%
        // I(0) bound = 3.79, I(1) bound = 4.85
        let i0_bound = 3.79;
        let i1_bound = 4.85;
        
        // Decision
        let has_cointegration = if f_stat > i1_bound {
            true  // Reject H0, cointegration exists
        } else if f_stat < i0_bound {
            false // Cannot reject H0
        } else {
            false // Inconclusive
        };
        
        BoundsTestResult {
            f_statistic: f_stat,
            has_cointegration,
        }
    }
}

// Internal helper methods (not exposed to WASM)
impl ARDL {
    /// Get critical values untuk bounds test (internal use only)
    pub fn get_critical_values(&self, alpha: f64) -> CriticalValues {
        // Simplified critical values (untuk k=1-5, n=100)
        // Seharusnya lookup table berdasarkan k dan n
        let k = self.n_vars;
        
        let (i0, i1) = match (k, (alpha * 100.0) as usize) {
            (1, 10) => (2.72, 3.77),  // k=1, α=10%
            (1, 5) => (3.23, 4.35),   // k=1, α=5%
            (2, 10) => (3.17, 4.14),  // k=2, α=10%
            (2, 5) => (3.79, 4.85),   // k=2, α=5%
            (3, 10) => (3.47, 4.45),  // k=3, α=10%
            (3, 5) => (4.23, 5.23),   // k=3, α=5%
            _ => (3.79, 4.85)         // Default
        };
        
        CriticalValues {
            i0_bound: i0,
            i1_bound: i1,
        }
    }
}
