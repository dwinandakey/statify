use std::collections::HashSet;

use crate::models::{
    config::KnnConfig,
    data::{AnalysisData, DataValue, KnnData},
    result::{FeatureSelectionStep, FeatureSelectionSummary, KFeatureSelectionSummary},
};

use super::{
    core::{determine_effective_k, find_k_nearest_neighbors, preprocess_knn_data},
    prediction::{
        calculate_categorical_prediction, calculate_mean_prediction, calculate_median_prediction,
        category_key,
    },
};

#[derive(Clone, Debug)]
pub struct FeatureSelectionResult {
    pub summary: FeatureSelectionSummary,
    pub steps: Vec<FeatureSelectionStep>,
    pub selected_features: Vec<String>,
    pub selected_k: Option<usize>,
    pub k_summary: Vec<KFeatureSelectionSummary>,
}

#[derive(Clone, Debug)]
struct TrialResult {
    feature: String,
    error: f64,
}

pub fn calculate_feature_selection(
    data: &AnalysisData,
    config: &KnnConfig,
) -> Result<FeatureSelectionResult, String> {
    if config.neighbors.auto_selection {
        return calculate_feature_selection_with_auto_k(data, config);
    }

    let mut result = calculate_forward_feature_selection(data, config)?;
    let k = evaluate_k(data, config, &result.selected_features).unwrap_or(0);
    result.selected_k = (k > 0).then_some(k);
    if k > 0 {
        result.k_summary = vec![KFeatureSelectionSummary {
            k,
            selected_features: result.selected_features.clone(),
            error: result.summary.final_error,
            stopping_reason: result.summary.stopping_reason.clone(),
            selected: true,
        }];
    }

    Ok(result)
}

fn calculate_feature_selection_with_auto_k(
    data: &AnalysisData,
    config: &KnnConfig,
) -> Result<FeatureSelectionResult, String> {
    let mut trials = Vec::new();

    for k in candidate_k_values(config) {
        let trial_config = config_with_k(config, k);
        let trial = calculate_forward_feature_selection(data, &trial_config)?;
        trials.push((k, trial));
    }

    let Some((best_index, _)) =
        trials
            .iter()
            .enumerate()
            .min_by(|(_, (left_k, left)), (_, (right_k, right))| {
                left.summary
                    .final_error
                    .total_cmp(&right.summary.final_error)
                    .then_with(|| left_k.cmp(right_k))
            })
    else {
        return Err("No k candidates could be evaluated for feature selection".to_string());
    };

    let mut k_summary = Vec::with_capacity(trials.len());
    for (index, (k, trial)) in trials.iter().enumerate() {
        k_summary.push(KFeatureSelectionSummary {
            k: *k,
            selected_features: trial.selected_features.clone(),
            error: trial.summary.final_error,
            stopping_reason: trial.summary.stopping_reason.clone(),
            selected: index == best_index,
        });
    }

    let (selected_k, mut best_result) = trials.swap_remove(best_index);
    best_result.selected_k = Some(selected_k);
    best_result.k_summary = k_summary;

    Ok(best_result)
}

fn calculate_forward_feature_selection(
    data: &AnalysisData,
    config: &KnnConfig,
) -> Result<FeatureSelectionResult, String> {
    if !config.features.perform_selection {
        return Err("Feature selection is not enabled".to_string());
    }

    let all_features = feature_universe(config);
    if all_features.is_empty() {
        return Err("No candidate features are available for feature selection".to_string());
    }

    let forced_features = sanitize_feature_list(
        config.features.forced_entry_var.as_deref().unwrap_or(&[]),
        &all_features,
    );
    let mut selected_features = forced_features.clone();
    let original_candidate_features = sanitize_feature_list(
        config
            .features
            .forward_selection
            .as_deref()
            .unwrap_or(&all_features),
        &all_features,
    )
    .into_iter()
    .filter(|feature| !selected_features.contains(feature))
    .collect::<Vec<_>>();
    let mut candidate_features = original_candidate_features.clone();

    let uses_minimum_change = config.features.below_min;
    let uses_fixed_number = !uses_minimum_change;

    let stopping_method = if uses_minimum_change {
        "minimum_change"
    } else {
        "fixed_number"
    };

    let mut steps = Vec::new();
    let mut previous_error = if selected_features.is_empty() {
        None
    } else {
        Some(evaluate_subset(data, config, &selected_features)?)
    };

    if let Some(error) = previous_error {
        if error <= f64::EPSILON {
            let removed_features = removed_features(&all_features, &selected_features);
            return Ok(FeatureSelectionResult {
                summary: FeatureSelectionSummary {
                    enabled: true,
                    method: "forward_selection".to_string(),
                    forced_features,
                    candidate_features: original_candidate_features,
                    selected_features: selected_features.clone(),
                    removed_features,
                    final_error: 0.0,
                    stopping_method: stopping_method.to_string(),
                    stopping_reason: "zero_error".to_string(),
                    evaluation_strategy: "training_set".to_string(),
                },
                steps,
                selected_features,
                selected_k: None,
                k_summary: Vec::new(),
            });
        }
    }

    let max_additional = if uses_minimum_change {
        candidate_features.len()
    } else if uses_fixed_number {
        fixed_additional_count(config, all_features.len(), forced_features.len())
            .min(candidate_features.len())
    } else {
        0
    };

    if max_additional == 0 {
        let final_error = previous_error
            .unwrap_or_else(|| evaluate_subset(data, config, &all_features).unwrap_or(0.0));
        let removed_features = removed_features(&all_features, &selected_features);
        return Ok(FeatureSelectionResult {
            summary: FeatureSelectionSummary {
                enabled: true,
                method: "forward_selection".to_string(),
                forced_features,
                candidate_features: original_candidate_features,
                selected_features: selected_features.clone(),
                removed_features,
                final_error,
                stopping_method: stopping_method.to_string(),
                stopping_reason: "max_features_reached".to_string(),
                evaluation_strategy: "training_set".to_string(),
            },
            steps,
            selected_features,
            selected_k: None,
            k_summary: Vec::new(),
        });
    }

    let mut stopping_reason = "candidate_features_exhausted".to_string();
    let mut final_error = previous_error.unwrap_or(f64::INFINITY);

    while !candidate_features.is_empty() && steps.len() < max_additional {
        let best_trial = best_candidate(data, config, &selected_features, &candidate_features)?;
        let next_features = with_feature(&selected_features, &best_trial.feature);
        let improvement = previous_error.map(|error| error - best_trial.error);

        steps.push(FeatureSelectionStep {
            step_number: steps.len() + 1,
            selected_feature: best_trial.feature.clone(),
            trial_error: best_trial.error,
            improvement,
            selected_features_after_step: next_features.clone(),
        });

        let should_stop = if uses_minimum_change {
            minimum_change_stop_reason(previous_error, best_trial.error, config.features.min_change)
        } else {
            None
        };

        candidate_features.retain(|feature| feature != &best_trial.feature);

        if should_stop.as_deref() == Some("error_deteriorated") {
            stopping_reason = should_stop.unwrap();
            final_error = previous_error.unwrap_or(best_trial.error);
            break;
        }

        selected_features = next_features;
        final_error = best_trial.error;
        previous_error = Some(best_trial.error);

        if let Some(reason) = should_stop {
            stopping_reason = reason;
            break;
        }

        if steps.len() >= max_additional && uses_fixed_number {
            stopping_reason = "max_features_reached".to_string();
            break;
        }

        if candidate_features.is_empty() {
            stopping_reason = "candidate_features_exhausted".to_string();
        }
    }

    let removed_features = removed_features(&all_features, &selected_features);

    Ok(FeatureSelectionResult {
        summary: FeatureSelectionSummary {
            enabled: true,
            method: "forward_selection".to_string(),
            forced_features,
            candidate_features: original_candidate_features,
            selected_features: selected_features.clone(),
            removed_features,
            final_error,
            stopping_method: stopping_method.to_string(),
            stopping_reason,
            evaluation_strategy: "training_set".to_string(),
        },
        steps,
        selected_features,
        selected_k: None,
        k_summary: Vec::new(),
    })
}

pub fn config_with_selected_features(
    config: &KnnConfig,
    selected_features: &[String],
) -> KnnConfig {
    let mut selected_config = config.clone();
    if !selected_features.is_empty() {
        selected_config.main.feature_var = Some(selected_features.to_vec());
    }
    selected_config
}

pub fn config_with_selected_features_and_k(
    config: &KnnConfig,
    selected_features: &[String],
    selected_k: Option<usize>,
) -> KnnConfig {
    let mut selected_config = config_with_selected_features(config, selected_features);
    if let Some(k) = selected_k {
        selected_config.neighbors.specify_k = k as i32;
    }
    selected_config
}

fn config_with_k(config: &KnnConfig, k: usize) -> KnnConfig {
    let mut selected_config = config.clone();
    selected_config.neighbors.specify_k = k as i32;
    selected_config
}

fn candidate_k_values(config: &KnnConfig) -> Vec<usize> {
    let min_k = config
        .neighbors
        .min_k
        .unwrap_or(config.neighbors.specify_k)
        .max(1);
    let max_k = config.neighbors.max_k.unwrap_or(min_k).max(1);
    let start = min_k.min(max_k) as usize;
    let end = min_k.max(max_k) as usize;

    (start..=end).collect()
}

fn feature_universe(config: &KnnConfig) -> Vec<String> {
    let mut features = Vec::new();

    for feature in config.main.feature_var.as_deref().unwrap_or(&[]) {
        push_unique(&mut features, feature);
    }

    for feature in config.features.forward_selection.as_deref().unwrap_or(&[]) {
        push_unique(&mut features, feature);
    }

    for feature in config.features.forced_entry_var.as_deref().unwrap_or(&[]) {
        push_unique(&mut features, feature);
    }

    features
}

fn sanitize_feature_list(features: &[String], universe: &[String]) -> Vec<String> {
    let universe_set = universe.iter().collect::<HashSet<_>>();
    let mut sanitized = Vec::new();

    for feature in features {
        if universe_set.contains(feature) {
            push_unique(&mut sanitized, feature);
        }
    }

    sanitized
}

fn push_unique(features: &mut Vec<String>, feature: &str) {
    if !features.iter().any(|existing| existing == feature) {
        features.push(feature.to_string());
    }
}

fn fixed_additional_count(config: &KnnConfig, feature_count: usize, forced_count: usize) -> usize {
    if let Some(max_to_select) = config.features.max_to_select {
        return max_to_select.max(0) as usize;
    }

    feature_count.min(20).saturating_sub(forced_count)
}

fn best_candidate(
    data: &AnalysisData,
    config: &KnnConfig,
    selected_features: &[String],
    candidate_features: &[String],
) -> Result<TrialResult, String> {
    let mut best: Option<TrialResult> = None;

    for candidate in candidate_features {
        let trial_features = with_feature(selected_features, candidate);
        let error = evaluate_subset(data, config, &trial_features)?;
        let trial = TrialResult {
            feature: candidate.clone(),
            error,
        };

        best = match best {
            Some(current) if current.error <= trial.error => Some(current),
            _ => Some(trial),
        };
    }

    best.ok_or_else(|| "No feature selection candidates could be evaluated".to_string())
}

fn with_feature(selected_features: &[String], feature: &str) -> Vec<String> {
    let mut features = selected_features.to_vec();
    push_unique(&mut features, feature);
    features
}

fn minimum_change_stop_reason(
    previous_error: Option<f64>,
    next_error: f64,
    min_change: f64,
) -> Option<String> {
    if next_error <= f64::EPSILON {
        return Some("zero_error".to_string());
    }

    let previous_error = previous_error?;

    if previous_error <= f64::EPSILON {
        return Some("zero_error".to_string());
    }

    let relative_change = ((previous_error - next_error).abs()) / previous_error;
    if previous_error > next_error && relative_change <= min_change {
        return Some("minimum_change_reached".to_string());
    }

    if (previous_error - next_error).abs() <= f64::EPSILON {
        return Some("no_error_change".to_string());
    }

    if previous_error < next_error && relative_change > 2.0 * min_change {
        return Some("error_deteriorated".to_string());
    }

    None
}

pub(crate) fn evaluate_subset(
    data: &AnalysisData,
    config: &KnnConfig,
    selected_features: &[String],
) -> Result<f64, String> {
    if selected_features.is_empty() {
        return Err("At least one feature is required to evaluate KNN".to_string());
    }

    let selected_config = config_with_selected_features(config, selected_features);
    let knn_data = preprocess_knn_data(data, &selected_config)?;
    let k = determine_effective_k(&knn_data, &selected_config)?;

    if knn_data.training_indices.is_empty() {
        return Err("Feature selection requires at least one training case".to_string());
    }

    if knn_data.target_is_numeric_scale() {
        Ok(training_sse(&knn_data, &selected_config, k))
    } else {
        Ok(training_error_rate(&knn_data, &selected_config, k))
    }
}

fn evaluate_k(
    data: &AnalysisData,
    config: &KnnConfig,
    selected_features: &[String],
) -> Result<usize, String> {
    let selected_config = config_with_selected_features(config, selected_features);
    let knn_data = preprocess_knn_data(data, &selected_config)?;
    determine_effective_k(&knn_data, &selected_config)
}

fn training_error_rate(knn_data: &KnnData, config: &KnnConfig, k: usize) -> f64 {
    let mut total = 0usize;
    let mut correct = 0usize;

    for &idx in &knn_data.training_indices {
        let candidate_indices = training_candidates(knn_data, idx);
        if candidate_indices.is_empty() {
            continue;
        }

        let neighbors = find_k_nearest_neighbors(
            &knn_data.data_matrix[idx],
            &knn_data.data_matrix,
            &candidate_indices,
            k,
            config.neighbors.metric_eucli,
            Some(&knn_data.processed_case_indices),
        );
        let predicted = calculate_categorical_prediction(&neighbors, &knn_data.target_values);

        if category_key(Some(&knn_data.target_values[idx])) == category_key(Some(&predicted)) {
            correct += 1;
        }
        total += 1;
    }

    if total == 0 {
        100.0
    } else {
        (1.0 - (correct as f64 / total as f64)) * 100.0
    }
}

fn training_sse(knn_data: &KnnData, config: &KnnConfig, k: usize) -> f64 {
    let mut sse = 0.0;

    for &idx in &knn_data.training_indices {
        let candidate_indices = training_candidates(knn_data, idx);
        if candidate_indices.is_empty() {
            continue;
        }

        let neighbors = find_k_nearest_neighbors(
            &knn_data.data_matrix[idx],
            &knn_data.data_matrix,
            &candidate_indices,
            k,
            config.neighbors.metric_eucli,
            Some(&knn_data.processed_case_indices),
        );
        let predicted = if config.neighbors.predictions_median {
            calculate_median_prediction(&neighbors, &knn_data.target_values)
        } else {
            calculate_mean_prediction(&neighbors, &knn_data.target_values)
        };

        if let (DataValue::Number(actual), DataValue::Number(predicted)) =
            (&knn_data.target_values[idx], predicted)
        {
            sse += (actual - predicted).powi(2);
        }
    }

    sse
}

fn training_candidates(knn_data: &KnnData, idx: usize) -> Vec<usize> {
    knn_data
        .training_indices
        .iter()
        .copied()
        .filter(|&candidate_idx| candidate_idx != idx)
        .collect()
}

fn removed_features(all_features: &[String], selected_features: &[String]) -> Vec<String> {
    all_features
        .iter()
        .filter(|feature| !selected_features.contains(feature))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::minimum_change_stop_reason;

    #[test]
    fn minimum_change_stops_when_next_error_is_zero() {
        assert_eq!(
            minimum_change_stop_reason(Some(10.0), 0.0, 0.05),
            Some("zero_error".to_string())
        );
        assert_eq!(
            minimum_change_stop_reason(None, 0.0, 0.05),
            Some("zero_error".to_string())
        );
    }

    #[test]
    fn minimum_change_stops_and_keeps_feature_for_small_improvement() {
        assert_eq!(
            minimum_change_stop_reason(Some(0.200), 0.198, 0.05),
            Some("minimum_change_reached".to_string())
        );
    }

    #[test]
    fn minimum_change_reverts_feature_for_large_deterioration() {
        assert_eq!(
            minimum_change_stop_reason(Some(0.10), 0.20, 0.05),
            Some("error_deteriorated".to_string())
        );
    }

    #[test]
    fn minimum_change_stops_and_keeps_feature_when_error_does_not_change() {
        assert_eq!(
            minimum_change_stop_reason(Some(0.10), 0.10, 0.05),
            Some("no_error_change".to_string())
        );
    }

    #[test]
    fn minimum_change_continues_for_meaningful_improvement() {
        assert_eq!(minimum_change_stop_reason(Some(0.20), 0.10, 0.05), None);
    }
}
