use serde::Serialize;
use wasm_bindgen::JsValue;

use crate::models::result::{
    CaseProcessingSummary, ClassificationTable, ErrorSummary, FeatureSelectionStep,
    FeatureSelectionSummary, KFeatureSelectionSummary, KSelectionChart, NearestNeighborAnalysis,
    NearestNeighbors, PredictionResults, PredictorImportanceEntry, PredictorSpace, SavedVariables,
    SystemSettings,
};

pub fn string_to_js_error(error: String) -> JsValue {
    JsValue::from_str(&error)
}

pub fn format_result(result: &Option<NearestNeighborAnalysis>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => {
            let formatted = FormatResult::from_analysis_result(result);
            Ok(serde_wasm_bindgen::to_value(&formatted).unwrap())
        }
        None => Err(JsValue::from_str("No analysis results available")),
    }
}

#[derive(Serialize)]
struct FormatResult {
    case_processing_summary: Option<CaseProcessingSummary>,
    feature_selection_summary: Option<FeatureSelectionSummary>,
    feature_selection_steps: Option<Vec<FeatureSelectionStep>>,
    k_feature_selection_summary: Option<Vec<KFeatureSelectionSummary>>,
    k_selection_chart: Option<KSelectionChart>,
    prediction_results: Option<PredictionResults>,
    system_settings: Option<SystemSettings>,
    predictor_importance: Option<FormattedPredictorImportance>,
    classification_table: Option<ClassificationTable>,
    error_summary: Option<ErrorSummary>,
    predictor_space: Option<PredictorSpace>,
    nearest_neighbors: Option<NearestNeighbors>,
    saved_variables: Option<SavedVariables>,
}

#[derive(Serialize)]
struct FormattedPredictorImportance {
    predictors: Vec<PredictorEntry>,
    target: String,
    entries: Vec<PredictorImportanceEntry>,
    k: usize,
}

#[derive(Serialize)]
struct PredictorEntry {
    name: String,
    value: f64,
}

impl FormatResult {
    fn from_analysis_result(result: &NearestNeighborAnalysis) -> Self {
        let predictor_importance = result.predictor_importance.as_ref().map(|pi| {
            let predictors = pi
                .predictors
                .iter()
                .map(|(name, value)| PredictorEntry {
                    name: name.clone(),
                    value: *value,
                })
                .collect();

            FormattedPredictorImportance {
                predictors,
                target: pi.target.clone(),
                entries: pi.entries.clone(),
                k: pi.k,
            }
        });

        FormatResult {
            case_processing_summary: result.case_processing_summary.clone(),
            feature_selection_summary: result.feature_selection_summary.clone(),
            feature_selection_steps: result.feature_selection_steps.clone(),
            k_feature_selection_summary: result.k_feature_selection_summary.clone(),
            k_selection_chart: result.k_selection_chart.clone(),
            prediction_results: result.prediction_results.clone(),
            system_settings: result.system_settings.clone(),
            predictor_importance,
            classification_table: result.classification_table.clone(),
            error_summary: result.error_summary.clone(),
            predictor_space: result.predictor_space.clone(),
            nearest_neighbors: result.nearest_neighbors.clone(),
            saved_variables: result.saved_variables.clone(),
        }
    }
}
