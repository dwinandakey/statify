use crate::models::result::ClassificationTable;
use nalgebra::DVector;

pub fn calculate_classification_table(
    predicted_probs: &DVector<f64>,
    observed_y: &DVector<f64>,
    cutoff: f64,
) -> ClassificationTable {
    let mut obs_0_pred_0 = 0;
    let mut obs_0_pred_1 = 0;
    let mut obs_1_pred_0 = 0;
    let mut obs_1_pred_1 = 0;

    // PERBAIKAN: Tambahkan toleransi kecil untuk menangani floating point precision
    // Ketika P = 0.5 tepat (misalnya dari model tanpa constant), 
    // floating point mungkin menyimpannya sebagai 0.4999999... atau 0.5000001...
    // Toleransi ini memastikan P = 0.5 tepat dianggap >= cutoff
    let epsilon = 1e-10;

    for (pred_prob, obs) in predicted_probs.iter().zip(observed_y.iter()) {
        // Gunakan >= dengan toleransi: jika (pred_prob + epsilon) >= cutoff
        let predicted_class = if *pred_prob >= (cutoff - epsilon) { 1.0 } else { 0.0 };

        // PERBAIKAN: Tambahkan 'f64' agar tipe data jelas
        let is_obs_0 = (obs - 0.0f64).abs() < 1e-9;
        let is_obs_1 = (obs - 1.0f64).abs() < 1e-9;
        let is_pred_0 = (predicted_class - 0.0f64).abs() < 1e-9;

        if is_obs_0 {
            if is_pred_0 {
                obs_0_pred_0 += 1;
            } else {
                obs_0_pred_1 += 1;
            }
        } else if is_obs_1 {
            if is_pred_0 {
                obs_1_pred_0 += 1;
            } else {
                obs_1_pred_1 += 1;
            }
        }
    }

    let total_obs_0 = (obs_0_pred_0 + obs_0_pred_1) as f64;
    let pct_0 = if total_obs_0 > 0.0 {
        (obs_0_pred_0 as f64 / total_obs_0) * 100.0
    } else {
        0.0
    };

    let total_obs_1 = (obs_1_pred_0 + obs_1_pred_1) as f64;
    let pct_1 = if total_obs_1 > 0.0 {
        (obs_1_pred_1 as f64 / total_obs_1) * 100.0
    } else {
        0.0
    };

    let total_all = total_obs_0 + total_obs_1;
    let overall = if total_all > 0.0 {
        ((obs_0_pred_0 + obs_1_pred_1) as f64 / total_all) * 100.0
    } else {
        0.0
    };

    ClassificationTable {
        observed_0_predicted_0: obs_0_pred_0,
        observed_0_predicted_1: obs_0_pred_1,
        percentage_correct_0: pct_0,

        observed_1_predicted_0: obs_1_pred_0,
        observed_1_predicted_1: obs_1_pred_1,
        percentage_correct_1: pct_1,

        overall_percentage: overall,
    }
}
