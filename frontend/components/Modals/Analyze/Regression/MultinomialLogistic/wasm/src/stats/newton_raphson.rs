use crate::models::config::MultinomialConfig;
use crate::stats::core::PrimaryResults;
use crate::stats::log_likelihood::{calculate_ll, calculate_smoothed_category_totals};
use crate::stats::probabilities::compute_probabilities;
use nalgebra::{DMatrix, DVector};

const MAX_STEP_HALVINGS: usize = 5; // SPSS: MXSTEP(5)

pub(crate) fn initialize_beta_spss(
    primary: &PrimaryResults,
    config: &MultinomialConfig,
) -> DVector<f64> {
    let p = primary.n_params;
    let j_count = primary.n_categories;
    let ref_idx = primary.reference_index;
    let mut beta = DVector::zeros((j_count - 1) * p);

    let (n_total, n_j) = calculate_smoothed_category_totals(primary, config.delta);
    if n_total <= 0.0 || ref_idx >= n_j.len() {
        return beta;
    }

    let p_ref = n_j[ref_idx] / n_total;
    for j in 0..j_count {
        if j == ref_idx {
            continue;
        }

        let p_j = n_j[j] / n_total;
        let intercept_init = if p_j > 0.0 && p_ref > 0.0 {
            (p_j / p_ref).ln()
        } else {
            0.0
        };
        let j_idx = if j < ref_idx { j } else { j - 1 };
        beta[j_idx * p] = intercept_init;
    }

    beta
}

pub(crate) fn compute_score_and_information(
    X: &DMatrix<f64>,
    primary: &PrimaryResults,
    beta: &DVector<f64>,
) -> (DVector<f64>, DMatrix<f64>) {
    let n_cases = primary.n_cases;
    let p = primary.n_params;
    let J = primary.n_categories;
    let ref_idx = primary.reference_index;

    let pi = compute_probabilities(X, beta, n_cases, J, p, ref_idx);
    let mut gradient = DVector::zeros((J - 1) * p);
    let mut information = DMatrix::zeros((J - 1) * p, (J - 1) * p);

    for j in 0..J {
        if j == ref_idx {
            continue;
        }
        let j_idx = if j < ref_idx { j } else { j - 1 };

        for s in 0..p {
            let mut score = 0.0;
            for i in 0..n_cases {
                let n_i = primary.weights[i];
                let n_ij =
                    if (primary.y_categories[i] - primary.category_map[j]).abs() < f64::EPSILON {
                        n_i
                    } else {
                        0.0
                    };
                score += X[(i, s)] * (n_ij - n_i * pi[(i, j)]);
            }
            gradient[j_idx * p + s] = score;
        }
    }

    for j in 0..J {
        if j == ref_idx {
            continue;
        }
        let j_idx = if j < ref_idx { j } else { j - 1 };

        for j_prime in 0..J {
            if j_prime == ref_idx {
                continue;
            }
            let j_prime_idx = if j_prime < ref_idx {
                j_prime
            } else {
                j_prime - 1
            };

            for s in 0..p {
                for t in 0..p {
                    let mut info_val = 0.0;
                    for i in 0..n_cases {
                        let n_i = primary.weights[i];
                        let delta_jj_prime = if j == j_prime { 1.0 } else { 0.0 };
                        info_val += n_i
                            * pi[(i, j)]
                            * (delta_jj_prime - pi[(i, j_prime)])
                            * X[(i, s)]
                            * X[(i, t)];
                    }
                    information[(j_idx * p + s, j_prime_idx * p + t)] = info_val;
                }
            }
        }
    }

    (gradient, information)
}

/// Jalankan Newton-Raphson dengan step-halving hingga konvergen.
/// Mengembalikan (beta, hessian_final, iter_count, converged).
pub fn run_newton_raphson(
    X: &DMatrix<f64>,
    primary: &PrimaryResults,
    config: &MultinomialConfig,
    beta_init: DVector<f64>,
) -> Result<(DVector<f64>, DMatrix<f64>, u32, bool), String> {
    let n_cases = primary.n_cases;
    let p = primary.n_params;
    let J = primary.n_categories;
    let ref_idx = primary.reference_index;

    let mut beta = if beta_init.nrows() == (J - 1) * p {
        beta_init
    } else {
        initialize_beta_spss(primary, config)
    };
    let mut gradient = DVector::zeros((J - 1) * p);
    let mut hessian = DMatrix::zeros((J - 1) * p, (J - 1) * p);
    let mut converged = false;
    let mut iter_count = 0u32;

    for _ in 0..config.iterations {
        iter_count += 1;

        // 1. Hitung probabilitas softmax
        let pi = compute_probabilities(X, &beta, n_cases, J, p, ref_idx);

        // SPSS: Cek separation mulai iterasi ke-20 (CHKSEP=20)
        // SPSS melaporkan warning tapi TIDAK berhenti — terus iterasi
        if iter_count >= 20 {
            if let Some(sep_msg) = check_separation(
                &pi,
                &primary.y_categories,
                &primary.category_map,
                n_cases,
                J,
            ) {
                eprintln!("WARNING [iter {}]: {}", iter_count, sep_msg);
                // Jangan break — SPSS terus iterasi dan melaporkan koefisien yang besar
            }
        }

        // 2. Score Function (Gradient): dl/db_j,s = sum_i x_is (n_ij - n_i pi_ij)
        let (computed_gradient, computed_hessian) =
            compute_score_and_information(X, primary, &beta);
        gradient.copy_from(&computed_gradient);

        hessian.copy_from(&(-computed_hessian));

        // 4. Newton-Raphson update: β^(t+1) = β^(t) - H^-1 * g
        let h_inv_g = match hessian.clone().try_inverse() {
            Some(inv_h) => inv_h * &gradient,
            None => {
                return Err("Hessian matrix is singular. The model may be overparameterized or have perfect separation.".to_string());
            }
        };

        // Current log-likelihood untuk step-halving
        let current_ll = calculate_ll(
            X,
            &beta,
            &primary.y_categories,
            &primary.category_map,
            &primary.weights,
            ref_idx,
            p,
        );

        // Step-halving: jika LL turun, kurangi step size
        let mut step_size = 1.0;
        let mut new_beta = &beta - &h_inv_g * step_size;
        let mut new_ll = calculate_ll(
            X,
            &new_beta,
            &primary.y_categories,
            &primary.category_map,
            &primary.weights,
            ref_idx,
            p,
        );

        let mut accepted_step = new_ll >= current_ll;
        for _ in 0..MAX_STEP_HALVINGS {
            if accepted_step {
                break;
            }
            step_size *= 0.5;
            new_beta = &beta - &h_inv_g * step_size;
            new_ll = calculate_ll(
                X,
                &new_beta,
                &primary.y_categories,
                &primary.category_map,
                &primary.weights,
                ref_idx,
                p,
            );
            accepted_step = new_ll >= current_ll;
        }

        // SPSS-like safeguard: never accept a step that decreases LL.
        if !accepted_step {
            break;
        }

        // Kriteria konvergensi SPSS
        let param_change = (&new_beta - &beta).abs().max();
        let ll_change = (new_ll - current_ll).abs();
        let max_score = gradient.abs().max();

        beta = new_beta;

        // Konvergensi SPSS NOMREG:
        // PCONVERGE (default 1e-6): max absolute parameter change
        // LCONVERGE (default 0.0 = disabled): LL change threshold
        let pconv = if config.pconverge > 0.0 {
            config.pconverge
        } else {
            config.tolerance
        };
        let ll_converged = config.lconverge > 0.0 && ll_change < config.lconverge;
        let param_converged = param_change < pconv;
        let score_converged = max_score < pconv;

        // SPSS NOMREG practical convergence: parameter and score stabilization.
        if iter_count > 1 && (ll_converged || param_converged || score_converged) {
            converged = true;
            break;
        }
    }

    // === SOLUSI #1: Explicit Hessian Recomputation at Final β ===
    // SPSS recomputes Hessian at final converged coefficients
    // This ensures SE, Wald, and p-values match SPSS exactly
    let (_, hessian_final_info) = compute_score_and_information(X, primary, &beta);
    let hessian_final = -hessian_final_info;

    Ok((beta, hessian_final, iter_count, converged))
}

/// Versi internal Newton-Raphson tanpa step-halving (digunakan oleh likelihood ratio tests).
/// Mengembalikan (beta, var_covar, iter_count, converged).
pub fn run_newton_raphson_internal(
    X: &DMatrix<f64>,
    primary: &PrimaryResults,
    config: &MultinomialConfig,
) -> Result<(DVector<f64>, DMatrix<f64>, u32, bool), String> {
    let n_cases = primary.n_cases;
    let p = primary.n_params;
    let J = primary.n_categories;
    let ref_idx = primary.reference_index;

    let mut beta = initialize_beta_spss(primary, config);
    let mut gradient = DVector::zeros((J - 1) * p);
    let mut converged = false;
    let mut iter_count = 0u32;

    for _ in 0..config.iterations {
        iter_count += 1;
        gradient.fill(0.0);

        let mut pi = DMatrix::zeros(n_cases, J);
        for i in 0..n_cases {
            let mut logits = vec![0.0f64; J];
            let mut b_offset = 0;
            let mut max_l: f64 = 0.0;
            for j in 0..J {
                if j == ref_idx {
                    logits[j] = 0.0;
                } else {
                    let b_j = beta.rows(b_offset, p);
                    // Tidak ada clamp — log-sum-exp shift sudah cukup untuk stabilitas
                    logits[j] = b_j.dot(&X.row(i).transpose());
                    b_offset += p;
                }
                if logits[j] > max_l {
                    max_l = logits[j];
                }
            }
            let mut sum_exp = 0.0;
            for j in 0..J {
                sum_exp += (logits[j] - max_l).exp();
            }
            for j in 0..J {
                pi[(i, j)] = (logits[j] - max_l).exp() / sum_exp;
            }
        }

        let mut g_offset = 0;
        for j in 0..J {
            if j == ref_idx {
                continue;
            }
            for k in 0..p {
                let mut val = 0.0;
                for i in 0..n_cases {
                    let y_ij = if (primary.y_categories[i] - primary.category_map[j]).abs()
                        < f64::EPSILON
                    {
                        1.0
                    } else {
                        0.0
                    };
                    val += primary.weights[i] * X[(i, k)] * (y_ij - pi[(i, j)]);
                }
                gradient[g_offset + k] = val;
            }
            g_offset += p;
        }

        let mut new_hessian = DMatrix::zeros((J - 1) * p, (J - 1) * p);
        let mut j_idx = 0;
        for j in 0..J {
            if j == ref_idx {
                continue;
            }
            let mut m_idx = 0;
            for m in 0..J {
                if m == ref_idx {
                    continue;
                }
                for k in 0..p {
                    for l in 0..p {
                        let mut val = 0.0;
                        for i in 0..n_cases {
                            let delta_jm = if j == m { 1.0 } else { 0.0 };
                            val -= primary.weights[i]
                                * X[(i, k)]
                                * X[(i, l)]
                                * pi[(i, j)]
                                * (delta_jm - pi[(i, m)]);
                        }
                        new_hessian[(j_idx * p + k, m_idx * p + l)] = val;
                    }
                }
                m_idx += 1;
            }
            j_idx += 1;
        }
        let delta_beta_vec = new_hessian
            .clone()
            .try_inverse()
            .map(|inv_h| inv_h * &gradient)
            .ok_or_else(|| "Matriks Hessian singular.".to_string())?;

        // Hitung LL saat ini untuk step-halving
        let current_ll_int = calculate_ll(
            X,
            &beta,
            &primary.y_categories,
            &primary.category_map,
            &primary.weights,
            ref_idx,
            p,
        );

        // Step-halving (SPSS MXSTEP=5)
        let mut step = 1.0_f64;
        let mut new_beta_int = &beta - &delta_beta_vec * step;
        let mut new_ll_int = calculate_ll(
            X,
            &new_beta_int,
            &primary.y_categories,
            &primary.category_map,
            &primary.weights,
            ref_idx,
            p,
        );
        let mut accepted_step_int = new_ll_int >= current_ll_int;
        for _ in 0..5usize {
            if accepted_step_int {
                break;
            }
            step *= 0.5;
            new_beta_int = &beta - &delta_beta_vec * step;
            new_ll_int = calculate_ll(
                X,
                &new_beta_int,
                &primary.y_categories,
                &primary.category_map,
                &primary.weights,
                ref_idx,
                p,
            );
            accepted_step_int = new_ll_int >= current_ll_int;
        }

        if !accepted_step_int {
            break;
        }

        // Konvergensi SPSS: max absolute parameter change
        let param_change_int = (&new_beta_int - &beta).abs().max();
        let ll_change_int = (new_ll_int - current_ll_int).abs();
        let max_score_int = gradient.abs().max();

        beta = new_beta_int;

        let pconv_int = if config.pconverge > 0.0 {
            config.pconverge
        } else {
            config.tolerance
        };
        let ll_conv_int = config.lconverge > 0.0 && ll_change_int < config.lconverge;
        let param_conv_int = param_change_int < pconv_int;
        let score_conv_int = max_score_int < pconv_int;

        if iter_count > 1 && (ll_conv_int || param_conv_int || score_conv_int) {
            converged = true;
            break;
        }
    }

    // === SOLUSI #1: Explicit Hessian Recomputation at Final β (for LR tests) ===
    let pi_final_int = DMatrix::from_fn(n_cases, J, |i, j| {
        let mut logits = vec![0.0f64; J];
        let mut b_offset = 0;
        let mut max_l: f64 = 0.0;
        for jj in 0..J {
            if jj == ref_idx {
                logits[jj] = 0.0;
            } else {
                let b_j = beta.rows(b_offset, p);
                logits[jj] = b_j.dot(&X.row(i).transpose());
                b_offset += p;
            }
            if logits[jj] > max_l {
                max_l = logits[jj];
            }
        }
        let mut sum_exp = 0.0;
        for jj in 0..J {
            sum_exp += (logits[jj] - max_l).exp();
        }
        (logits[j] - max_l).exp() / sum_exp
    });

    let mut hessian_final_int = DMatrix::zeros((J - 1) * p, (J - 1) * p);
    for j in 0..J {
        if j == ref_idx {
            continue;
        }
        let j_idx = if j < ref_idx { j } else { j - 1 };

        for j_prime in 0..J {
            if j_prime == ref_idx {
                continue;
            }
            let j_prime_idx = if j_prime < ref_idx {
                j_prime
            } else {
                j_prime - 1
            };

            for s in 0..p {
                for t in 0..p {
                    let mut hess_val = 0.0;
                    for i in 0..n_cases {
                        let n_i = primary.weights[i];
                        let delta_jj_prime = if j == j_prime { 1.0 } else { 0.0 };
                        hess_val -= n_i
                            * pi_final_int[(i, j)]
                            * (delta_jj_prime - pi_final_int[(i, j_prime)])
                            * X[(i, s)]
                            * X[(i, t)];
                    }
                    hessian_final_int[(j_idx * p + s, j_prime_idx * p + t)] = hess_val;
                }
            }
        }
    }

    let var_covar = hessian_final_int
        .map(|x| -x)
        .try_inverse()
        .ok_or("Gagal menghitung matriks varians-kovarians")?;

    Ok((beta, var_covar, iter_count, converged))
}

/// Deteksi complete separation: semua kasus diprediksi sempurna.
/// SPSS mulai cek di iterasi ke-20 (ITER_CHKSEP default).
fn check_separation(
    pi: &DMatrix<f64>,
    y_categories: &[f64],
    category_map: &[f64],
    n_cases: usize,
    j_categories: usize,
) -> Option<String> {
    let mut perfect_count = 0usize;
    for i in 0..n_cases {
        let pred_j = (0..j_categories)
            .max_by(|&a, &b| pi[(i, a)].partial_cmp(&pi[(i, b)]).unwrap())
            .unwrap();
        let obs_j = category_map
            .iter()
            .position(|&c| (c - y_categories[i]).abs() < f64::EPSILON)
            .unwrap_or(0);
        if pred_j == obs_j {
            perfect_count += 1;
        }
    }
    if perfect_count == n_cases {
        Some(
            "Complete separation detected: all cases perfectly predicted. \
             MLE does not exist. Consider removing predictors or using \
             regularization."
                .to_string(),
        )
    } else {
        None
    }
}
