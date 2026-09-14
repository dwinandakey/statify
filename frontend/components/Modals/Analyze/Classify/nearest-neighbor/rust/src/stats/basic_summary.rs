use crate::models::{
    config::KnnConfig,
    data::AnalysisData,
    result::{CaseProcessingSummary, ProcessingSummaryDetail},
};

use super::preprocess_data::preprocess_knn_data;

pub fn basic_processing_summary(
    data: &AnalysisData,
    config: &KnnConfig,
) -> Result<CaseProcessingSummary, String> {
    let total_cases = data
        .features_data
        .iter()
        .map(|ds| ds.len())
        .chain(data.target_data.iter().map(|ds| ds.len()))
        .max()
        .unwrap_or(0);

    if total_cases == 0 {
        return Err("No data available for processing".to_string());
    }

    let knn_data = preprocess_knn_data(data, config)?;
    let valid_cases = knn_data.training_indices.len() + knn_data.holdout_indices.len();
    let excluded_cases = total_cases - valid_cases;
    let training_n = knn_data.training_indices.len();
    let holdout_n = knn_data.holdout_indices.len();
    let training_percent = (training_n as f64 / valid_cases as f64) * 100.0;
    let holdout_percent = (holdout_n as f64 / valid_cases as f64) * 100.0;

    Ok(CaseProcessingSummary {
        training: ProcessingSummaryDetail {
            n: Some(training_n),
            percent: Some(training_percent),
        },
        holdout: ProcessingSummaryDetail {
            n: Some(holdout_n),
            percent: Some(holdout_percent),
        },
        valid: ProcessingSummaryDetail {
            n: Some(valid_cases),
            percent: Some((valid_cases as f64 / total_cases as f64) * 100.0),
        },
        excluded: ProcessingSummaryDetail {
            n: Some(excluded_cases),
            percent: Some((excluded_cases as f64 / total_cases as f64) * 100.0),
        },
        total: ProcessingSummaryDetail {
            n: Some(total_cases),
            percent: None,
        },
    })
}
