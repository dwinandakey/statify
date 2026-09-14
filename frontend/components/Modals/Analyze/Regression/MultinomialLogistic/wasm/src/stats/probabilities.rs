use nalgebra::{DMatrix, DVector};

/// Hitung probabilitas softmax dengan log-sum-exp trick untuk stabilitas numerik.
/// Stabilitas numerik dijamin sepenuhnya oleh log-sum-exp shift.

pub fn compute_probabilities(
    X: &DMatrix<f64>,
    beta: &DVector<f64>,
    n_cases: usize,
    J: usize,
    p: usize,
    ref_idx: usize,
) -> DMatrix<f64> {
    let mut pi = DMatrix::zeros(n_cases, J);
    for i in 0..n_cases {
        let mut logits = vec![0.0f64; J];
        let mut max_logit: f64 = 0.0;

        for j in 0..J {
            if j == ref_idx {
                logits[j] = 0.0;
            } else {
                let j_idx = if j < ref_idx { j } else { j - 1 };
                let b_j = beta.rows(j_idx * p, p);
                // Tidak ada clamp — biarkan logit tumbuh bebas seperti SPSS
                // log-sum-exp shift di bawah sudah cukup untuk stabilitas
                logits[j] = b_j.dot(&X.row(i).transpose());
            }
            max_logit = max_logit.max(logits[j]);
        }

        let mut sum_exp = 0.0;
        for j in 0..J {
            logits[j] -= max_logit;
            sum_exp += logits[j].exp();
        }

        for j in 0..J {
            pi[(i, j)] = logits[j].exp() / sum_exp;
        }
    }
    pi
}

/// Hitung probabilitas untuk satu observasi menggunakan b_offset (tidak pakai index j_idx).
/// Berguna untuk fungsi klasifikasi dan goodness-of-fit yang tidak memerlukan ref_idx remapping.
pub fn compute_probs_with_offset(
    X: &DMatrix<f64>,
    beta: &DVector<f64>,
    i: usize,
    J: usize,
    p: usize,
    ref_idx: usize,
) -> Vec<f64> {
    let mut probs = vec![0.0f64; J];
    let mut sum_exp = 0.0;
    let mut b_offset = 0;

    for j in 0..J {
        let logit = if j == ref_idx {
            0.0
        } else {
            let bj = beta.rows(b_offset, p);
            b_offset += p;
            bj.dot(&X.row(i).transpose())
        };
        probs[j] = logit.exp();
        sum_exp += probs[j];
    }

    for j in 0..J {
        probs[j] /= sum_exp;
    }

    probs
}
