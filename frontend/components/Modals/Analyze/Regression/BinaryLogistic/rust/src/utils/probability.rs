// src/utils/probability.rs
use statrs::distribution::{ChiSquared, ContinuousCDF};

/// Menghitung P-Value untuk Chi-Square Test
/// (Digunakan di Omnibus Test & Stepwise Criteria)
pub fn chi_square_significance(chi_sq_val: f64, df: i32) -> f64 {
    if df <= 0 || chi_sq_val < 0.0 {
        return 1.0; // Tidak signifikan / Error safety
    }
    
    match ChiSquared::new(df as f64) {
        Ok(dist) => 1.0 - dist.cdf(chi_sq_val),
        Err(_) => 1.0,
    }
}

/// Menghitung P-Value untuk Wald Test (Z-distribution atau Chi-Sq 1 df)
/// Wald biasanya diasumsikan mengikuti Chi-Square dengan df=1
pub fn wald_significance(wald_stat: f64) -> f64 {
    chi_square_significance(wald_stat, 1)
}

/// Calculate z-score for a given confidence level
/// confidence_level should be between 0 and 1 (e.g., 0.95 for 95% CI)
/// Returns the z-score for the upper tail (e.g., 1.96 for 95%)
pub fn z_score_from_confidence(confidence_level: f64) -> f64 {
    use statrs::distribution::{Normal, ContinuousCDF};
    
    // Ensure confidence level is valid
    let conf = if confidence_level > 1.0 {
        // Assume it's a percentage like 95, convert to 0.95
        confidence_level / 100.0
    } else {
        confidence_level
    };
    
    let alpha = 1.0 - conf;
    let tail_probability = 1.0 - alpha / 2.0;
    
    // Use standard normal distribution
    match Normal::new(0.0, 1.0) {
        Ok(dist) => {
            // Use inverse CDF (quantile function)
            // We need the z-value such that P(Z <= z) = tail_probability
            dist.inverse_cdf(tail_probability)
        }
        Err(_) => 1.96, // Fallback to 95% CI z-score
    }
}