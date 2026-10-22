use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};

/// Menghitung Joint Wald Test untuk sekelompok variabel (multi-df).
/// (wald_statistic, df, p_value)
pub fn calculate_joint_wald_test(
    beta: &DVector<f64>,
    covariance_matrix: &DMatrix<f64>,
    beta_indices: &[usize],
) -> (f64, i32, f64) {
    let k = beta_indices.len();
    if k == 0 {
        return (0.0, 0, 1.0);
    }

    // Untuk single variable, gunakan formula sederhana (b/se)^2
    if k == 1 {
        let idx = beta_indices[0];
        let b = beta[idx];
        let se = covariance_matrix[(idx, idx)].sqrt();
        let wald = if se > 1e-12 { (b / se).powi(2) } else { 0.0 };
        let p_val = match ChiSquared::new(1.0) {
            Ok(dist) => 1.0 - dist.cdf(wald),
            Err(_) => 1.0,
        };
        return (wald, 1, p_val);
    }

    // Ekstrak subvektor beta_G
    let beta_g = DVector::from_fn(k, |i, _| beta[beta_indices[i]]);

    // Ekstrak submatriks Cov_GG
    let cov_gg = DMatrix::from_fn(k, k, |i, j| {
        covariance_matrix[(beta_indices[i], beta_indices[j])]
    });

    // Hitung W = β_G' × Cov_GG^(-1) × β_G
    let wald_stat = match cov_gg.clone().cholesky() {
        Some(chol) => {
            let solution = chol.solve(&beta_g);
            beta_g.dot(&solution)
        }
        None => {
            // Fallback ke pseudo-inverse jika Cholesky gagal
            match cov_gg.try_inverse() {
                Some(inv) => {
                    let term = &inv * &beta_g;
                    beta_g.dot(&term)
                }
                None => 0.0,
            }
        }
    };

    // P-value dari Chi-Square distribution dengan df=k
    let df = k as i32;
    let p_val = match ChiSquared::new(df as f64) {
        Ok(dist) => {
            if wald_stat > 0.0 {
                1.0 - dist.cdf(wald_stat)
            } else {
                1.0
            }
        }
        Err(_) => 1.0,
    };

    (wald_stat, df, p_val)
}
