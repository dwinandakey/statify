use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};

/// Menghitung Score Statistic dan P-Value untuk calon variabel baru
pub fn calculate_score_test(
    residuals: &DVector<f64>,      // (y - pi)
    weights: &DVector<f64>,        // pi * (1 - pi)
    current_x: &DMatrix<f64>,      // Matriks X model saat ini
    candidate_col: &DVector<f64>,  // Kolom data kandidat
    inv_cov_matrix: &DMatrix<f64>, // Matriks Kovarians model saat ini
) -> (f64, f64) {
    // Mengembalikan (Score Chi-Sq, P-Value)

    // 1. Hitung Score Vector (U) = z' * (y - pi)
    let u_val = candidate_col.dot(residuals);

    // 2. Hitung Information Varians
    // V = z'Wz - z'WX * (X'WX)^-1 * X'Wz

    // a. z'Wz (Bobot diagonal, jadi element-wise)
    let weighted_candidate = candidate_col.component_mul(weights);
    let term1 = candidate_col.dot(&weighted_candidate);

    // b. Jika current_x kosong (tidak ada variabel dalam model), term2 = 0
    let term2 = if current_x.ncols() > 0 && inv_cov_matrix.ncols() > 0 {
        // z'WX
        let z_w_x = weighted_candidate.transpose() * current_x;

        // Bagian kanan: (z'WX) * CovMatrix * (X'Wz)
        let term2_mat = &z_w_x * inv_cov_matrix * z_w_x.transpose();
        term2_mat[(0, 0)]
    } else {
        0.0
    };

    let variance = term1 - term2;

    // Cek singularitas/variance 0
    if variance <= 1e-12 {
        return (0.0, 1.0); // P-value 1.0 (tidak signifikan)
    }

    // 3. Score Statistic = U^2 / V
    let score_stat = (u_val * u_val) / variance;

    // 4. Hitung P-Value (Chi-Square df=1)
    let p_value = match ChiSquared::new(1.0) {
        Ok(dist) => 1.0 - dist.cdf(score_stat),
        Err(_) => 1.0,
    };

    (score_stat, p_value)
}

/// Menghitung Score Test untuk satu variabel kandidat
/// 
/// # Arguments
/// * `x_col` - Kolom variabel kandidat
/// * `y` - Vector dependen (0/1)
/// * `null_prob` - Probabilitas null (jika include_constant, ini adalah y_mean; jika tidak, ini adalah 0.5)
/// * `include_constant` - Apakah model menyertakan constant
/// 
/// # Returns
/// (Score statistic, df, Sig)
pub fn calculate_single_score_test(
    x_col: &DVector<f64>,
    y: &DVector<f64>,
    null_prob: f64,
    include_constant: bool,
) -> (f64, i32, f64) {
    let n = x_col.len();
    
    // Residuals: y - p_null
    let residuals: DVector<f64> = y.map(|yi| yi - null_prob);
    
    // Variance dari null model
    let w_val = null_prob * (1.0 - null_prob);
    
    // Score U = x' * residuals
    let u = x_col.dot(&residuals);
    
    // Information matrix tergantung pada include_constant
    let info = if include_constant {
        // Dengan constant: perlu menghitung variance yang sudah adjusted untuk centering
        // I = w * [x'x - (sum(x))^2 / n]
        let x_sum: f64 = x_col.iter().sum();
        let x_sq_sum: f64 = x_col.iter().map(|v| v * v).sum();
        w_val * (x_sq_sum - (x_sum * x_sum) / (n as f64))
    } else {
        // Tanpa constant: I = w * x'x
        let x_sq_sum: f64 = x_col.iter().map(|v| v * v).sum();
        w_val * x_sq_sum
    };
    
    // Score statistic = U^2 / I
    let score_stat = if info > 1e-12 {
        (u * u) / info
    } else {
        0.0
    };
    
    // P-value
    let sig = match ChiSquared::new(1.0) {
        Ok(dist) => {
            if score_stat > 0.0 {
                1.0 - dist.cdf(score_stat)
            } else {
                1.0
            }
        }
        Err(_) => 1.0,
    };
    
    (score_stat, 1, sig)
}

// Menghitung apakah sekumpulan variabel X secara simultan signifikan dibandingkan Null Model
// PERBAIKAN: Tambahkan parameter include_constant
pub fn calculate_global_score_test(
    x: &DMatrix<f64>, // Matrix Covariates (TANPA kolom Intercept)
    y: &DVector<f64>,
    null_prob: f64, // Rata-rata Y (proporsi kasus positif) atau 0.5 jika tanpa constant
) -> (f64, i32, f64) {
    // Returns: (ChiSquare, df, Sig)
    // Ini adalah versi yang compatible dengan kode lama (assume include_constant = true)
    calculate_global_score_test_with_constant(x, y, null_prob, true)
}

/// Menghitung Global Score Test dengan opsi include_constant
/// 
/// # Arguments
/// * `x` - Matrix Covariates (TANPA kolom Intercept)
/// * `y` - Vector dependen (0/1)
/// * `null_prob` - Probabilitas null (y_mean jika include_constant, 0.5 jika tidak)
/// * `include_constant` - Apakah model menyertakan constant
/// 
/// # Returns
/// (ChiSquare, df, Sig)
pub fn calculate_global_score_test_with_constant(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    null_prob: f64,
    include_constant: bool,
) -> (f64, i32, f64) {
    let n = x.nrows();
    let k = x.ncols(); // df = jumlah variabel

    // 1. Hitung Residuals Null Model: (y - p_0)
    let residuals = y.map(|yi| yi - null_prob);

    // 2. Hitung Score Vector (U): X' * residuals
    let u = x.transpose() * &residuals;

    // 3. Hitung Information Matrix (I) di titik Null
    let w_val = null_prob * (1.0 - null_prob);

    let xt_x = x.transpose() * x;
    
    // PERBEDAAN KUNCI:
    // - Dengan constant: I = w * [X'X - (1/n) * (sum_x * sum_x')]  (centered)
    // - Tanpa constant: I = w * X'X  (uncentered)
    let info_matrix = if include_constant {
        // Dengan constant: perlu koreksi untuk centering
        let ones = DVector::from_element(n, 1.0);
        let x_sums = x.transpose() * &ones;
        let correction = (&x_sums * x_sums.transpose()) / (n as f64);
        (xt_x - correction) * w_val
    } else {
        // Tanpa constant: tidak perlu koreksi
        xt_x * w_val
    };

    // 4. Hitung Score Statistic: U' * inv(I) * U
    let score_stat = match info_matrix.clone().cholesky() {
        Some(chol) => {
            let solution = chol.solve(&u);
            u.dot(&solution)
        }
        None => {
            match info_matrix.try_inverse() {
                Some(inv) => {
                    let term = &inv * &u;
                    u.dot(&term)
                }
                None => 0.0,
            }
        }
    };

    // 5. Hitung P-Value
    let sig = match ChiSquared::new(k as f64) {
        Ok(dist) => {
            if score_stat > 0.0 {
                1.0 - dist.cdf(score_stat)
            } else {
                1.0
            }
        }
        Err(_) => 1.0,
    };

    (score_stat, k as i32, sig)
}

/// Menghitung Score Test untuk sekelompok variabel kandidat (multi-df).
/// Digunakan untuk variabel kategorik dengan lebih dari 2 kategori.
///
/// # Arguments
/// * `residuals` - Residuals dari model saat ini (y - pi)
/// * `weights` - Weights dari model saat ini (pi * (1 - pi))
/// * `current_x` - Matriks X model saat ini (termasuk intercept jika ada)
/// * `candidate_cols` - Matriks kolom kandidat (multiple columns for a group)
/// * `inv_cov_matrix` - Matriks Kovarians model saat ini
///
/// # Returns
/// (Score statistic, df, P-Value)
pub fn calculate_group_score_test(
    residuals: &DVector<f64>,
    weights: &DVector<f64>,
    current_x: &DMatrix<f64>,
    candidate_cols: &DMatrix<f64>,
    inv_cov_matrix: &DMatrix<f64>,
) -> (f64, i32, f64) {
    let k = candidate_cols.ncols();
    if k == 0 {
        return (0.0, 0, 1.0);
    }

    // Untuk single column, delegate ke fungsi existing
    if k == 1 {
        let col = candidate_cols.column(0).into_owned();
        let (stat, pval) = calculate_score_test(
            residuals, weights, current_x, &col, inv_cov_matrix,
        );
        return (stat, 1, pval);
    }

    // 1. Hitung Score Vector (U) = Z' * residuals  (k x 1)
    let u = candidate_cols.transpose() * residuals;

    // 2. Hitung Information Matrix
    // V = Z'WZ - Z'WX * (X'WX)^-1 * X'WZ

    // Z'WZ (k x k)
    let mut z_weighted = candidate_cols.clone();
    for (row_idx, &weight) in weights.iter().enumerate() {
        for col_idx in 0..k {
            z_weighted[(row_idx, col_idx)] *= weight;
        }
    }
    let term1 = candidate_cols.transpose() * &z_weighted;

    // Z'WX * (X'WX)^-1 * X'WZ
    let term2 = if current_x.ncols() > 0 && inv_cov_matrix.ncols() > 0 {
        let z_w_x = z_weighted.transpose() * current_x; // k x p
        let correction = &z_w_x * inv_cov_matrix * z_w_x.transpose(); // k x k
        correction
    } else {
        DMatrix::zeros(k, k)
    };

    let variance = term1 - term2;

    // 3. Score Statistic = U' * Var^-1 * U
    let score_stat = match variance.clone().cholesky() {
        Some(chol) => {
            let solution = chol.solve(&u);
            u.dot(&solution)
        }
        None => {
            match variance.try_inverse() {
                Some(inv) => {
                    let term = &inv * &u;
                    u.dot(&term)
                }
                None => 0.0,
            }
        }
    };

    // 4. P-Value (Chi-Square df=k)
    let df = k as i32;
    let p_value = match ChiSquared::new(df as f64) {
        Ok(dist) => {
            if score_stat > 0.0 {
                1.0 - dist.cdf(score_stat)
            } else {
                1.0
            }
        }
        Err(_) => 1.0,
    };

    (score_stat, df, p_value)
}

/// Menghitung Score Test untuk sekelompok variabel di null model (Block 0, analytical).
/// Digunakan untuk variabel kategorik dengan lebih dari 2 kategori.
///
/// # Arguments
/// * `x_cols` - Matriks kolom variabel (multiple columns for a group)
/// * `y` - Vector dependen (0/1)
/// * `null_prob` - Probabilitas null
/// * `include_constant` - Apakah model menyertakan constant
///
/// # Returns
/// (Score statistic, df, Sig)
pub fn calculate_single_group_score_test(
    x_cols: &DMatrix<f64>,
    y: &DVector<f64>,
    null_prob: f64,
    include_constant: bool,
) -> (f64, i32, f64) {
    let n = x_cols.nrows();
    let k = x_cols.ncols();

    if k == 0 {
        return (0.0, 0, 1.0);
    }

    // Untuk single column, delegate ke fungsi existing
    if k == 1 {
        let col = x_cols.column(0).into_owned();
        let (stat, df, sig) = calculate_single_score_test(&col, y, null_prob, include_constant);
        return (stat, df, sig);
    }

    // Residuals: y - p_null
    let residuals: DVector<f64> = y.map(|yi| yi - null_prob);

    // Variance dari null model
    let w_val = null_prob * (1.0 - null_prob);

    // Score U = X' * residuals (k x 1)
    let u = x_cols.transpose() * &residuals;

    // Information matrix (k x k)
    let xt_x = x_cols.transpose() * x_cols;

    let info_matrix = if include_constant {
        // Dengan constant: perlu koreksi untuk centering
        let ones = DVector::from_element(n, 1.0);
        let x_sums = x_cols.transpose() * &ones; // k x 1
        let correction = (&x_sums * x_sums.transpose()) / (n as f64); // k x k
        (xt_x - correction) * w_val
    } else {
        xt_x * w_val
    };

    // Score statistic = U' * I^-1 * U
    let score_stat = match info_matrix.clone().cholesky() {
        Some(chol) => {
            let solution = chol.solve(&u);
            u.dot(&solution)
        }
        None => {
            match info_matrix.try_inverse() {
                Some(inv) => {
                    let term = &inv * &u;
                    u.dot(&term)
                }
                None => 0.0,
            }
        }
    };

    // P-value
    let df = k as i32;
    let sig = match ChiSquared::new(df as f64) {
        Ok(dist) => {
            if score_stat > 0.0 {
                1.0 - dist.cdf(score_stat)
            } else {
                1.0
            }
        }
        Err(_) => 1.0,
    };

    (score_stat, df, sig)
}

