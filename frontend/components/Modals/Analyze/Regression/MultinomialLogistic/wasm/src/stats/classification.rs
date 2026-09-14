use crate::models::result::ClassificationTable;
use crate::stats::core::PrimaryResults;
use crate::stats::probabilities::compute_probs_with_offset;
use nalgebra::{DMatrix, DVector};

/// Hitung Classification Table (confusion matrix + accuracy percentage).
pub fn calculate_classification_table(
    X: &DMatrix<f64>,
    beta: &DVector<f64>,
    primary: &PrimaryResults,
) -> ClassificationTable {
    let n = primary.n_cases;
    let J = primary.n_categories;
    let p = primary.n_params;
    let ref_idx = primary.reference_index;

    let mut observed = Vec::new();
    let mut predicted = Vec::new();
    let mut confusion = vec![vec![0.0f64; J]; J];
    let mut total_weight = 0.0f64;
    let mut correct_weight = 0.0f64;

    for i in 0..n {
        let weight = primary.weights.get(i).copied().unwrap_or(1.0);
        if !weight.is_finite() || weight <= 0.0 {
            continue;
        }

        // Find observed category index
        let obs_cat = primary.y_categories[i];
        let obs_idx = primary
            .category_map
            .iter()
            .position(|&c| c == obs_cat)
            .unwrap();

        let probs = compute_probs_with_offset(X, beta, i, J, p, ref_idx);

        // Find predicted category (highest probability)
        let pred_idx = probs
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(idx, _)| idx)
            .unwrap();

        observed.push(obs_idx);
        predicted.push(pred_idx);
        confusion[obs_idx][pred_idx] += weight;
        total_weight += weight;
        if obs_idx == pred_idx {
            correct_weight += weight;
        }
    }

    // Hitung overall percentage berbasis weight
    let overall_pct = if total_weight > 0.0 {
        (correct_weight / total_weight) * 100.0
    } else {
        0.0
    };

    let mut category_pcts = vec![0.0f64; J];
    for j in 0..J {
        let row_sum: f64 = confusion[j].iter().sum();
        if row_sum > 0.0 {
            category_pcts[j] = (confusion[j][j] / row_sum) * 100.0;
        }
    }

    ClassificationTable {
        observed,
        predicted,
        confusion_matrix: confusion,
        overall_percentage: overall_pct,
        category_percentages: category_pcts,
    }
}
