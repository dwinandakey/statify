use nalgebra::{DMatrix, DVector};
use std::error::Error;

// ============================================================================
// CONSTANTS - Threshold dan Parameter untuk Robustness
// ============================================================================

/// Probability clipping bounds untuk mencegah log(0) atau log(1)
const PROB_MIN: f64 = 1e-10;
const PROB_MAX: f64 = 1.0 - 1e-10;

/// Threshold untuk mendeteksi Complete Separation
/// Jika |beta| melebihi nilai ini, kemungkinan terjadi separation
const BETA_EXPLOSION_THRESHOLD: f64 = 20.0;

/// Threshold untuk quasi-complete separation (probabilitas ekstrem)
const EXTREME_PROB_THRESHOLD: f64 = 1e-6;
const EXTREME_PROB_RATIO: f64 = 0.10; // 10% kasus dengan probabilitas ekstrem

/// Step-halving parameters
const MAX_STEP_HALVING: usize = 10;
const STEP_HALVING_FACTOR: f64 = 0.5;

/// Adaptive ridge regularization
const INITIAL_LAMBDA: f64 = 1e-9;
const MAX_LAMBDA: f64 = 1e-3;
const LAMBDA_INCREASE_FACTOR: f64 = 10.0;

/// Condition number threshold untuk ill-conditioned matrix
const CONDITION_NUMBER_THRESHOLD: f64 = 1e10;

// ============================================================================
// WARNING FLAGS - Untuk melaporkan masalah ke user
// ============================================================================

/// Flags untuk warning yang terdeteksi selama fitting
#[derive(Debug, Clone, Default)]
pub struct FittingWarnings {
    /// True jika terdeteksi kemungkinan complete separation
    pub possible_separation: bool,
    /// True jika terdeteksi quasi-complete separation
    pub quasi_separation: bool,
    /// True jika ada step-halving yang digunakan
    pub step_halving_used: bool,
    /// Jumlah total step-halving iterations
    pub step_halving_count: usize,
    /// True jika ridge parameter harus ditingkatkan
    pub ridge_increased: bool,
    /// Final ridge parameter yang digunakan
    pub final_lambda: f64,
    /// True jika matrix hampir singular
    pub near_singular_hessian: bool,
    /// Pesan warning untuk user
    pub messages: Vec<String>,
}

/// A single iteration record for the iteration history table
#[derive(Debug, Clone)]
pub struct IterationRecord {
    pub iteration: usize,
    pub neg2_log_likelihood: f64,
    pub coefficients: Vec<f64>,
}

#[derive(Debug, Clone)]
pub struct FittedModel {
    pub beta: DVector<f64>,
    pub covariance_matrix: DMatrix<f64>,
    pub predictions: DVector<f64>,
    pub final_log_likelihood: f64,
    pub iterations: usize,
    pub converged: bool,
    pub residuals: DVector<f64>,
    pub weights: DVector<f64>,
    /// Warning flags dari proses fitting
    pub warnings: FittingWarnings,
}

/// Extended fitted model that includes iteration history
#[derive(Debug, Clone)]
pub struct FittedModelWithHistory {
    pub model: FittedModel,
    pub iteration_history: Vec<IterationRecord>,
}

// ============================================================================
// HELPER FUNCTIONS - Utility untuk operasi numerik yang aman
// ============================================================================

/// Sigmoid function dengan clipping untuk stabilitas numerik
#[inline]
fn safe_sigmoid(z: f64) -> f64 {
    let prob = 1.0 / (1.0 + (-z).exp());
    prob.clamp(PROB_MIN, PROB_MAX)
}

/// Hitung log-likelihood dengan handling numerik yang aman
fn calculate_log_likelihood_safe(y: &DVector<f64>, mu: &DVector<f64>) -> f64 {
    y.iter()
        .zip(mu.iter())
        .map(|(&yi, &mui)| {
            let mui_safe = mui.clamp(PROB_MIN, PROB_MAX);
            yi * mui_safe.ln() + (1.0 - yi) * (1.0 - mui_safe).ln()
        })
        .sum()
}

/// Hitung prediksi dari beta
fn compute_predictions(x: &DMatrix<f64>, beta: &DVector<f64>) -> DVector<f64> {
    let xb = x * beta;
    xb.map(safe_sigmoid)
}

/// Deteksi tanda-tanda complete separation
fn detect_separation(
    beta: &DVector<f64>,
    predictions: &DVector<f64>,
    warnings: &mut FittingWarnings,
) {
    // 1. Cek apakah ada koefisien yang "meledak"
    let max_beta = beta.iter().map(|b| b.abs()).fold(0.0_f64, f64::max);
    if max_beta > BETA_EXPLOSION_THRESHOLD {
        warnings.possible_separation = true;
        warnings.messages.push(format!(
            "Warning: Large coefficient detected (|β| = {:.2}). \
             Possible complete or quasi-complete separation.",
            max_beta
        ));
    }

    // 2. Cek proporsi prediksi ekstrem
    let n = predictions.len();
    let extreme_count = predictions
        .iter()
        .filter(|&&p| p < EXTREME_PROB_THRESHOLD || p > (1.0 - EXTREME_PROB_THRESHOLD))
        .count();

    let extreme_ratio = extreme_count as f64 / n as f64;
    if extreme_ratio > EXTREME_PROB_RATIO {
        warnings.quasi_separation = true;
        if !warnings.possible_separation {
            warnings.messages.push(format!(
                "Warning: {:.1}% of predicted probabilities are extreme (< {:.0e} or > {:.0e}). \
                 This may indicate quasi-complete separation.",
                extreme_ratio * 100.0,
                EXTREME_PROB_THRESHOLD,
                1.0 - EXTREME_PROB_THRESHOLD
            ));
        }
    }
}

/// Estimasi condition number dari matrix untuk deteksi ill-conditioning
fn estimate_condition_number(matrix: &DMatrix<f64>) -> f64 {
    // Gunakan SVD untuk estimasi akurat
    let svd = matrix.clone().svd(false, false);
    let singular_values = &svd.singular_values;
    if singular_values.len() > 0 {
        let max_sv = singular_values.iter().cloned().fold(0.0_f64, f64::max);
        let min_sv = singular_values.iter().cloned().fold(f64::MAX, f64::min);
        if min_sv > 1e-15 {
            return max_sv / min_sv;
        }
    }
    f64::INFINITY
}

/// Solve linear system dengan multiple fallback strategies
fn solve_linear_system(
    hessian: &DMatrix<f64>,
    gradient: &DVector<f64>,
    lambda: f64,
    warnings: &mut FittingWarnings,
) -> Result<(DVector<f64>, f64), String> {
    let p = hessian.nrows();
    let identity = DMatrix::identity(p, p);
    let mut current_lambda = lambda;
    
    // Coba dengan increasing ridge parameter jika diperlukan
    for attempt in 0..5 {
        let hessian_reg = hessian + identity.scale(current_lambda);
        
        // Cek condition number
        let cond = estimate_condition_number(&hessian_reg);
        if cond > CONDITION_NUMBER_THRESHOLD {
            warnings.near_singular_hessian = true;
            current_lambda *= LAMBDA_INCREASE_FACTOR;
            if current_lambda > MAX_LAMBDA {
                current_lambda = MAX_LAMBDA;
            }
            warnings.ridge_increased = true;
            continue;
        }

        // Strategy 1: Cholesky decomposition (paling cepat untuk positive definite)
        if let Some(chol) = hessian_reg.clone().cholesky() {
            let delta = chol.solve(&gradient);
            if !delta.iter().any(|x| x.is_nan() || x.is_infinite()) {
                warnings.final_lambda = current_lambda;
                return Ok((delta, current_lambda));
            }
        }

        // Strategy 2: LU decomposition
        if let Some(delta) = hessian_reg.clone().lu().solve(&gradient) {
            if !delta.iter().any(|x| x.is_nan() || x.is_infinite()) {
                warnings.final_lambda = current_lambda;
                return Ok((delta, current_lambda));
            }
        }

        // Strategy 3: SVD (paling robust tapi paling lambat)
        let svd = hessian_reg.clone().svd(true, true);
        if let Ok(delta) = svd.solve(&gradient, 1e-10) {
            if !delta.iter().any(|x| x.is_nan() || x.is_infinite()) {
                warnings.final_lambda = current_lambda;
                return Ok((delta, current_lambda));
            }
        }

        // Tingkatkan regularization dan coba lagi
        current_lambda *= LAMBDA_INCREASE_FACTOR;
        if current_lambda > MAX_LAMBDA {
            current_lambda = MAX_LAMBDA;
        }
        warnings.ridge_increased = true;

        if attempt == 4 {
            warnings.near_singular_hessian = true;
            warnings.messages.push(
                "Warning: Hessian matrix is severely ill-conditioned. \
                 Results may be unreliable. This often indicates perfect \
                 multicollinearity among predictors.".to_string()
            );

            // LAST RESORT: Use pseudo-inverse with heavy regularization
            // like SPSS, we still produce results even with singular Hessian
            let heavy_reg = hessian + identity.scale(MAX_LAMBDA);
            let svd = heavy_reg.svd(true, true);
            if let Ok(delta) = svd.solve(&gradient, 1e-8) {
                if !delta.iter().any(|x| x.is_nan() || x.is_infinite()) {
                    warnings.final_lambda = MAX_LAMBDA;
                    return Ok((delta, MAX_LAMBDA));
                }
            }

            // ABSOLUTE LAST RESORT: Return zero delta (no update)
            // This effectively freezes the current iteration's parameters
            warnings.messages.push(
                "Warning: Could not solve linear system even with heavy regularization. \
                 Using last available parameter estimates.".to_string()
            );
            warnings.final_lambda = MAX_LAMBDA;
            return Ok((DVector::zeros(p), MAX_LAMBDA));
        }
    }

    // This should be unreachable due to the attempt == 4 block above,
    // but as a safety net, return zero delta instead of an error
    warnings.near_singular_hessian = true;
    warnings.messages.push(
        "Warning: Hessian matrix is singular. Using last available parameter estimates.".to_string()
    );
    Ok((DVector::zeros(p), MAX_LAMBDA))
}

/// Step-halving line search untuk memastikan log-likelihood meningkat
fn step_halving_search(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    beta_old: &DVector<f64>,
    delta: &DVector<f64>,
    ll_old: f64,
    warnings: &mut FittingWarnings,
) -> (DVector<f64>, f64, DVector<f64>) {
    let mut step_size = 1.0;
    let mut beta_new = beta_old + delta;
    let mut mu_new = compute_predictions(x, &beta_new);
    let mut ll_new = calculate_log_likelihood_safe(y, &mu_new);

    // Backtracking line search
    for _ in 0..MAX_STEP_HALVING {
        // Jika log-likelihood meningkat (atau initial step), terima
        if ll_new > ll_old || ll_old == f64::NEG_INFINITY {
            break;
        }

        // Kurangi step size
        step_size *= STEP_HALVING_FACTOR;
        beta_new = beta_old + delta.scale(step_size);
        mu_new = compute_predictions(x, &beta_new);
        ll_new = calculate_log_likelihood_safe(y, &mu_new);

        warnings.step_halving_used = true;
        warnings.step_halving_count += 1;
    }

    // Jika setelah step-halving masih lebih buruk, gunakan step terkecil
    if ll_new < ll_old && ll_old != f64::NEG_INFINITY {
        step_size = STEP_HALVING_FACTOR.powi(MAX_STEP_HALVING as i32);
        beta_new = beta_old + delta.scale(step_size);
        mu_new = compute_predictions(x, &beta_new);
        ll_new = calculate_log_likelihood_safe(y, &mu_new);
        
        warnings.messages.push(
            "Warning: Step-halving did not improve log-likelihood. \
             Algorithm may be near a saddle point or the model may not be appropriate.".to_string()
        );
    }

    (beta_new, ll_new, mu_new)
}

// ============================================================================
// MAIN FITTING FUNCTIONS
// ============================================================================

pub fn fit(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    max_iter: usize,
    tol: f64,
) -> Result<FittedModel, Box<dyn Error>> {
    let n = x.nrows();
    let p = x.ncols();

    // Inisialisasi
    let mut beta = DVector::zeros(p);
    let mut beta_prev = beta.clone(); // Track previous beta for convergence check
    let mut log_likelihood_prev = f64::NEG_INFINITY;
    let mut current_lambda = INITIAL_LAMBDA;
    let identity = DMatrix::identity(p, p);

    let mut predictions = DVector::from_element(n, 0.5);
    let mut residuals = DVector::zeros(n);
    let mut weights_diag = DVector::zeros(n);
    let mut converged = false;
    let mut final_iter = 0;
    let mut warnings = FittingWarnings::default();

    // Main IRLS loop
    for iter in 0..max_iter {
        final_iter = iter + 1;

        // 1. Hitung Prediksi dengan sigmoid yang aman
        let mu = compute_predictions(x, &beta);

        // 2. Hitung Bobot dan Residuals
        let w_diag = mu.map(|pi| {
            let w = pi * (1.0 - pi);
            // Minimum weight untuk stabilitas
            if w < 1e-10 { 1e-10 } else { w }
        });
        residuals = y - &mu;

        // 3. Hitung Gradient (Score Vector): X' * (y - mu)
        let gradient = x.transpose() * &residuals;

        // 4. Hitung Hessian (Fisher Information): X' * W * X
        let mut xt_w = x.transpose();
        for (col_index, mut col) in xt_w.column_iter_mut().enumerate() {
            col *= w_diag[col_index];
        }
        let hessian = &xt_w * x;

        // 5. Solve untuk delta dengan robust solver
        let (delta, new_lambda) = match solve_linear_system(&hessian, &gradient, current_lambda, &mut warnings) {
            Ok(result) => result,
            Err(e) => return Err(e.into()),
        };
        current_lambda = new_lambda;

        // 6. Step-halving line search
        let ll_current = if iter == 0 {
            calculate_log_likelihood_safe(y, &mu)
        } else {
            log_likelihood_prev
        };

        let (beta_new, ll_new, mu_new) = step_halving_search(
            x, y, &beta, &delta, ll_current, &mut warnings
        );

        beta = beta_new;
        predictions = mu_new;

        // 7. Update residuals setelah step
        residuals = y - &predictions;
        let w_diag_new = predictions.map(|pi| {
            let w = pi * (1.0 - pi);
            if w < 1e-10 { 1e-10 } else { w }
        });
        weights_diag = w_diag_new;

        // 8. Cek Separation
        detect_separation(&beta, &predictions, &mut warnings);

        // 9. Cek Konvergensi
        // Ref: SPSS Algorithm Specification — "Estimation terminated because
        // parameter estimates changed by less than .001"
        // Kriteria UTAMA: max|Δβ_actual| < tol (default 0.001)
        // Menggunakan ACTUAL parameter change (setelah step-halving),
        // bukan delta (proposed Newton step) — konsisten dengan fit_with_history().
        let param_change = beta.iter()
            .zip(beta_prev.iter())
            .map(|(b_new, b_old)| (b_new - b_old).abs())
            .fold(0.0_f64, f64::max);
        if param_change < tol && iter > 0 {
            converged = true;
            log_likelihood_prev = ll_new; // Keep final LL for post-loop use
            let _ = log_likelihood_prev; // Suppress unused assignment warning
            break;
        }
        log_likelihood_prev = ll_new;
        beta_prev = beta.clone();

        // Early stopping jika separation terdeteksi dan sudah banyak iterasi
        if warnings.possible_separation && iter > max_iter / 2 {
            warnings.messages.push(format!(
                "Warning: Stopping early at iteration {} due to possible separation.",
                final_iter
            ));
            break;
        }
    }

    // --- FINAL PASS: Hitung Covariance Matrix ---
    // PENTING: Untuk final covariance matrix, gunakan PURE Fisher Information Matrix
    // TANPA ridge regularization. Ridge hanya digunakan selama iterasi untuk stabilitas,
    // tidak untuk perhitungan final standard errors (sesuai SPSS/SAS convention).
    let mut xt_w_final = x.transpose();
    for (col_index, mut col) in xt_w_final.column_iter_mut().enumerate() {
        col *= weights_diag[col_index];
    }
    let hessian_pure = &xt_w_final * x; // Pure Hessian tanpa ridge
    let hessian_regularized = &hessian_pure + identity.scale(current_lambda);

    // Coba inverse pure Hessian terlebih dahulu (SPSS standard)
    // Fallback ke regularized hanya jika pure Hessian singular
    let covariance_matrix = if let Some(inv) = hessian_pure.clone().try_inverse() {
        if inv.iter().any(|x| x.is_nan() || x.is_infinite()) {
            // Pure inverse gagal, coba regularized
            if let Some(inv_reg) = hessian_regularized.clone().try_inverse() {
                if !inv_reg.iter().any(|x| x.is_nan() || x.is_infinite()) {
                    warnings.messages.push(
                        "Note: Small regularization applied to compute covariance matrix.".to_string()
                    );
                    inv_reg
                } else {
                    // Fallback ke pseudo-inverse via SVD
                    let svd = hessian_pure.clone().svd(true, true);
                    svd.pseudo_inverse(1e-10).unwrap_or_else(|_| DMatrix::identity(p, p))
                }
            } else {
                let svd = hessian_pure.clone().svd(true, true);
                svd.pseudo_inverse(1e-10).unwrap_or_else(|_| DMatrix::identity(p, p))
            }
        } else {
            inv
        }
    } else {
        // Pure Hessian singular, coba regularized dulu
        if let Some(inv_reg) = hessian_regularized.clone().try_inverse() {
            if !inv_reg.iter().any(|x| x.is_nan() || x.is_infinite()) {
                warnings.messages.push(
                    "Note: Small regularization applied to compute covariance matrix.".to_string()
                );
                inv_reg
            } else {
                let svd = hessian_pure.svd(true, true);
                match svd.pseudo_inverse(1e-10) {
                    Ok(pinv) => pinv,
                    Err(_) => {
                        warnings.messages.push(
                            "Warning: Could not compute covariance matrix. \
                             Standard errors may be unreliable.".to_string()
                        );
                        DMatrix::identity(p, p)
                    }
                }
            }
        } else {
            // SVD pseudo-inverse sebagai fallback terakhir
            let svd = hessian_pure.svd(true, true);
            match svd.pseudo_inverse(1e-10) {
                Ok(pinv) => pinv,
                Err(_) => {
                    warnings.messages.push(
                        "Warning: Could not compute covariance matrix. \
                         Standard errors may be unreliable.".to_string()
                    );
                    DMatrix::identity(p, p)
                }
            }
        }
    };

    warnings.final_lambda = current_lambda;

    // FINAL: Recompute LL from actual final beta for maximum precision.
    // During IRLS, LL comes from step_halving_search which should already be
    // consistent, but recomputing eliminates any floating-point drift from
    // intermediate cached values.
    let final_ll = calculate_log_likelihood_safe(y, &predictions);

    Ok(FittedModel {
        beta,
        covariance_matrix,
        predictions,
        residuals,
        weights: weights_diag,
        final_log_likelihood: final_ll,
        iterations: final_iter,
        converged,
        warnings,
    })
}

/// IRLS fitting with iteration history tracking
/// Returns both the fitted model and a history of each iteration's coefficients and -2LL
/// This is used for SPSS-style "Iteration History" output
pub fn fit_with_history(
    x: &DMatrix<f64>,
    y: &DVector<f64>,
    max_iter: usize,
    tol: f64,
) -> Result<FittedModelWithHistory, Box<dyn Error>> {
    let n = x.nrows();
    let p = x.ncols();

    // Inisialisasi
    let mut beta = DVector::zeros(p);
    let mut log_likelihood_prev = f64::NEG_INFINITY;
    let mut current_lambda = INITIAL_LAMBDA;
    let identity = DMatrix::identity(p, p);

    let mut predictions = DVector::from_element(n, 0.5);
    let mut residuals = DVector::zeros(n);
    let mut weights_diag = DVector::zeros(n);
    let mut converged = false;
    let mut final_iter = 0;
    let mut warnings = FittingWarnings::default();

    // Vector untuk menyimpan iteration history
    let mut iteration_history: Vec<IterationRecord> = Vec::new();

    // Initial log-likelihood dihitung untuk keperluan internal saja
    let initial_mu = compute_predictions(x, &beta);
    let _initial_ll = calculate_log_likelihood_safe(y, &initial_mu);

    // Main IRLS loop
    for iter in 0..max_iter {
        final_iter = iter + 1;

        // 1. Hitung Prediksi dengan sigmoid yang aman
        let mu = compute_predictions(x, &beta);

        // 2. Hitung Bobot dan Residuals
        let w_diag = mu.map(|pi| {
            let w = pi * (1.0 - pi);
            // Minimum weight untuk stabilitas
            if w < 1e-10 { 1e-10 } else { w }
        });
        residuals = y - &mu;

        // 3. Hitung Gradient (Score Vector): X' * (y - mu)
        let gradient = x.transpose() * &residuals;

        // 4. Hitung Hessian (Fisher Information): X' * W * X
        let mut xt_w = x.transpose();
        for (col_index, mut col) in xt_w.column_iter_mut().enumerate() {
            col *= w_diag[col_index];
        }
        let hessian = &xt_w * x;

        // 5. Solve untuk delta dengan robust solver
        let (delta, new_lambda) = match solve_linear_system(&hessian, &gradient, current_lambda, &mut warnings) {
            Ok(result) => result,
            Err(e) => return Err(e.into()),
        };
        current_lambda = new_lambda;

        // 6. Step-halving line search
        let ll_current = if iter == 0 {
            calculate_log_likelihood_safe(y, &mu)
        } else {
            log_likelihood_prev
        };

        let (beta_new, ll_new, mu_new) = step_halving_search(
            x, y, &beta, &delta, ll_current, &mut warnings
        );

        beta = beta_new;
        predictions = mu_new;

        // 7. IMMEDIATELY update residuals dan weights agar sinkron dengan beta/predictions baru
        // FIX: Sebelumnya update ini ada SETELAH convergence check, sehingga saat break
        // terjadi, residuals/weights masih dari iterasi sebelumnya (stale data).
        // Ini menyebabkan covariance matrix dan score test menjadi sedikit off.
        residuals = y - &predictions;
        let w_diag_new = predictions.map(|pi| {
            let w = pi * (1.0 - pi);
            if w < 1e-10 { 1e-10 } else { w }
        });
        weights_diag = w_diag_new;

        // 8. Hitung -2LL untuk iterasi ini
        let neg2ll_new = -2.0 * ll_new;

        // 9. Catat iteration history TERLEBIH DAHULU (SPSS-style)
        // SPSS mencatat iterasi TERMASUK iterasi di mana konvergensi terdeteksi
        iteration_history.push(IterationRecord {
            iteration: final_iter,
            neg2_log_likelihood: neg2ll_new,
            coefficients: beta.iter().cloned().collect(),
        });

        // 10. Cek Konvergensi SETELAH mencatat iterasi
        // Ref: SPSS Algorithm Specification — "Estimation terminated because
        // parameter estimates changed by less than .001"
        // Kriteria UTAMA: max|Δβ_actual| < tol (default 0.001)
        // Parameter convergence WAJIB terpenuhi. -2LL change saja TIDAK cukup
        // karena likelihood surface bisa flat meski parameter belum stabil.
        let param_converged = if iteration_history.len() > 1 {
            let prev_record = &iteration_history[iteration_history.len() - 2];
            
            // Cek parameter change (max absolute change across all coefficients)
            let param_change = beta.iter()
                .zip(prev_record.coefficients.iter())
                .map(|(b_new, b_old)| (b_new - b_old).abs())
                .fold(0.0_f64, f64::max);
            param_change < tol
        } else {
            false
        };

        // iter > 0 untuk memastikan minimal 2 iterasi tercatat
        if param_converged && iter > 0 {
            converged = true;
            log_likelihood_prev = ll_new;
            let _ = log_likelihood_prev; // Suppress unused assignment warning
            break;
        }

        log_likelihood_prev = ll_new;

        // 11. Cek Separation
        detect_separation(&beta, &predictions, &mut warnings);

        // Early stopping jika separation terdeteksi dan sudah banyak iterasi
        if warnings.possible_separation && iter > max_iter / 2 {
            warnings.messages.push(format!(
                "Warning: Stopping early at iteration {} due to possible separation.",
                final_iter
            ));
            break;
        }
    }

    // --- FINAL PASS: Hitung Covariance Matrix ---
    // PENTING: Untuk final covariance matrix, gunakan PURE Fisher Information Matrix
    // TANPA ridge regularization. Ridge hanya digunakan selama iterasi untuk stabilitas,
    // tidak untuk perhitungan final standard errors (sesuai SPSS/SAS convention).
    let mut xt_w_final = x.transpose();
    for (col_index, mut col) in xt_w_final.column_iter_mut().enumerate() {
        col *= weights_diag[col_index];
    }
    let hessian_pure = &xt_w_final * x; // Pure Hessian tanpa ridge
    let hessian_regularized = &hessian_pure + identity.scale(current_lambda);

    // Coba inverse pure Hessian terlebih dahulu (SPSS standard)
    // Fallback ke regularized hanya jika pure Hessian singular
    let covariance_matrix = if let Some(inv) = hessian_pure.clone().try_inverse() {
        if inv.iter().any(|x| x.is_nan() || x.is_infinite()) {
            // Pure inverse gagal, coba regularized
            if let Some(inv_reg) = hessian_regularized.clone().try_inverse() {
                if !inv_reg.iter().any(|x| x.is_nan() || x.is_infinite()) {
                    warnings.messages.push(
                        "Note: Small regularization applied to compute covariance matrix.".to_string()
                    );
                    inv_reg
                } else {
                    // Fallback ke pseudo-inverse via SVD
                    let svd = hessian_pure.clone().svd(true, true);
                    svd.pseudo_inverse(1e-10).unwrap_or_else(|_| DMatrix::identity(p, p))
                }
            } else {
                let svd = hessian_pure.clone().svd(true, true);
                svd.pseudo_inverse(1e-10).unwrap_or_else(|_| DMatrix::identity(p, p))
            }
        } else {
            inv
        }
    } else {
        // Pure Hessian singular, coba regularized dulu
        if let Some(inv_reg) = hessian_regularized.clone().try_inverse() {
            if !inv_reg.iter().any(|x| x.is_nan() || x.is_infinite()) {
                warnings.messages.push(
                    "Note: Small regularization applied to compute covariance matrix.".to_string()
                );
                inv_reg
            } else {
                let svd = hessian_pure.svd(true, true);
                match svd.pseudo_inverse(1e-10) {
                    Ok(pinv) => pinv,
                    Err(_) => {
                        warnings.messages.push(
                            "Warning: Could not compute covariance matrix. \
                             Standard errors may be unreliable.".to_string()
                        );
                        DMatrix::identity(p, p)
                    }
                }
            }
        } else {
            // SVD pseudo-inverse sebagai fallback terakhir
            let svd = hessian_pure.svd(true, true);
            match svd.pseudo_inverse(1e-10) {
                Ok(pinv) => pinv,
                Err(_) => {
                    warnings.messages.push(
                        "Warning: Could not compute covariance matrix. \
                         Standard errors may be unreliable.".to_string()
                    );
                    DMatrix::identity(p, p)
                }
            }
        }
    };

    warnings.final_lambda = current_lambda;

    // Gunakan jumlah iterasi yang benar-benar dicatat (bukan final_iter dari loop)
    // SPSS melaporkan iterasi terakhir yang tercatat, bukan iterasi ketika konvergensi terdeteksi
    let actual_iterations = if !iteration_history.is_empty() {
        iteration_history.last().unwrap().iteration
    } else {
        final_iter
    };

    // FINAL: Recompute LL from actual final beta for maximum precision.
    let final_ll = calculate_log_likelihood_safe(y, &predictions);

    let model = FittedModel {
        beta,
        covariance_matrix,
        predictions,
        residuals,
        weights: weights_diag,
        final_log_likelihood: final_ll,
        iterations: actual_iterations,
        converged,
        warnings,
    };

    Ok(FittedModelWithHistory {
        model,
        iteration_history,
    })
}

/// Helper function to calculate log-likelihood for a given beta (legacy compatibility)
#[allow(dead_code)]
fn calculate_log_likelihood(x: &DMatrix<f64>, y: &DVector<f64>, beta: &DVector<f64>) -> f64 {
    let mu = compute_predictions(x, beta);
    calculate_log_likelihood_safe(y, &mu)
}
