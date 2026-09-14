use std::collections::{BTreeSet, HashMap};

use crate::models::{
    config::KnnConfig,
    data::{AnalysisData, DataValue, VariableMeasure},
    result::{SavedVariable, SavedVariables},
};

use super::core::preprocess_knn_data;
use super::partition::EXCLUDED_FOLD;
use super::prediction_results::{calculate_prediction_computation, PredictionComputation};

pub fn calculate_saved_variables(
    data: &AnalysisData,
    config: &KnnConfig,
) -> Result<Option<SavedVariables>, String> {
    if !config.save.has_target_var
        && !config.save.is_cate_target_var
        && !config.save.random_assign_to_partition
        && !config.save.random_assign_to_fold
    {
        return Ok(None);
    }

    if config.save.has_target_var || config.save.is_cate_target_var {
        let computation = calculate_prediction_computation(data, config)?;
        return build_saved_variables(data, config, &computation);
    }

    let knn_data = preprocess_knn_data(data, config)?;
    let total_cases = count_raw_cases(data).max(
        knn_data
            .processed_case_indices
            .iter()
            .copied()
            .max()
            .map(|idx| idx + 1)
            .unwrap_or(0),
    );

    let mut variables = Vec::new();

    if config.save.random_assign_to_partition {
        variables.push(build_partition_variable(
            total_cases,
            &knn_data.processed_case_indices,
            &knn_data.training_indices,
            &knn_data.holdout_indices,
        ));
    }

    if config.save.random_assign_to_fold {
        variables.push(build_fold_variable(
            total_cases,
            &knn_data.processed_case_indices,
            &knn_data.cross_validation_folds,
        ));
    }

    if variables.is_empty() {
        Ok(None)
    } else {
        Ok(Some(SavedVariables { variables }))
    }
}

pub fn build_saved_variables(
    data: &AnalysisData,
    config: &KnnConfig,
    computation: &PredictionComputation,
) -> Result<Option<SavedVariables>, String> {
    if !config.save.has_target_var
        && !config.save.is_cate_target_var
        && !config.save.random_assign_to_partition
        && !config.save.random_assign_to_fold
    {
        return Ok(None);
    }

    let knn_data = &computation.knn_data;
    let total_cases = count_raw_cases(data).max(
        knn_data
            .processed_case_indices
            .iter()
            .copied()
            .max()
            .map(|idx| idx + 1)
            .unwrap_or(0),
    );

    let mut variables = Vec::new();
    let target_is_categorical = knn_data.target_is_categorical();

    if config.save.has_target_var {
        variables.push(build_predicted_value_variable(
            total_cases,
            &knn_data.processed_case_indices,
            &computation.predicted_values,
            &knn_data.target_measure,
        ));
    }

    if config.save.is_cate_target_var && target_is_categorical {
        let max_categories = config.save.max_cats_to_save.unwrap_or(25).max(0) as usize;
        variables.extend(build_probability_variables(
            total_cases,
            &knn_data.processed_case_indices,
            &computation.category_probabilities,
            max_categories,
        ));
    }

    if config.save.random_assign_to_partition {
        variables.push(build_partition_variable(
            total_cases,
            &knn_data.processed_case_indices,
            &knn_data.training_indices,
            &knn_data.holdout_indices,
        ));
    }

    if config.save.random_assign_to_fold {
        variables.push(build_fold_variable(
            total_cases,
            &knn_data.processed_case_indices,
            &knn_data.cross_validation_folds,
        ));
    }

    if variables.is_empty() {
        Ok(None)
    } else {
        Ok(Some(SavedVariables { variables }))
    }
}

fn build_predicted_value_variable(
    total_cases: usize,
    processed_case_indices: &[usize],
    predictions: &[DataValue],
    target_measure: &VariableMeasure,
) -> SavedVariable {
    let mut values = vec![DataValue::Null; total_cases];
    for (processed_idx, &raw_idx) in processed_case_indices.iter().enumerate() {
        if raw_idx < values.len() {
            values[raw_idx] = predictions
                .get(processed_idx)
                .cloned()
                .unwrap_or(DataValue::Null);
        }
    }

    let numeric_prediction = predictions
        .iter()
        .any(|value| matches!(value, DataValue::Number(value) if value.is_finite()));
    let measure = match target_measure {
        VariableMeasure::Scale => "scale",
        VariableMeasure::Ordinal => "ordinal",
        VariableMeasure::Nominal => "nominal",
        VariableMeasure::Unknown => {
            if numeric_prediction {
                "scale"
            } else {
                "nominal"
            }
        }
    };

    SavedVariable {
        name: "KNN_PredictedValue".to_string(),
        label: "KNN predicted value or category".to_string(),
        variable_type: if numeric_prediction {
            "NUMERIC"
        } else {
            "STRING"
        }
        .to_string(),
        measure: measure.to_string(),
        decimals: if measure == "scale" { 2 } else { 0 },
        values,
    }
}

fn build_probability_variables(
    total_cases: usize,
    processed_case_indices: &[usize],
    category_probabilities: &HashMap<String, Vec<f64>>,
    max_categories: usize,
) -> Vec<SavedVariable> {
    let mut categories: Vec<String> = category_probabilities.keys().cloned().collect();
    categories.sort();
    categories.truncate(max_categories);

    categories
        .iter()
        .map(|category| {
            let mut values = vec![DataValue::Null; total_cases];
            if let Some(probabilities) = category_probabilities.get(category) {
                for (processed_idx, &raw_idx) in processed_case_indices.iter().enumerate() {
                    if raw_idx < values.len() {
                        values[raw_idx] = DataValue::Number(
                            probabilities.get(processed_idx).copied().unwrap_or(0.0),
                        );
                    }
                }
            }

            SavedVariable {
                name: format!("KNN_Probability_{}", sanitize_name_part(category)),
                label: format!("KNN predicted probability for {}", category),
                variable_type: "NUMERIC".to_string(),
                measure: "scale".to_string(),
                decimals: 4,
                values,
            }
        })
        .collect()
}

fn build_partition_variable(
    total_cases: usize,
    processed_case_indices: &[usize],
    training_indices: &[usize],
    holdout_indices: &[usize],
) -> SavedVariable {
    let training_set: BTreeSet<usize> = training_indices.iter().copied().collect();
    let holdout_set: BTreeSet<usize> = holdout_indices.iter().copied().collect();
    let mut values = vec![DataValue::Null; total_cases];

    for (processed_idx, &raw_idx) in processed_case_indices.iter().enumerate() {
        if raw_idx >= values.len() {
            continue;
        }

        if training_set.contains(&processed_idx) {
            values[raw_idx] = DataValue::Number(1.0);
        } else if holdout_set.contains(&processed_idx) {
            values[raw_idx] = DataValue::Number(0.0);
        }
    }

    SavedVariable {
        name: "KNN_Partition".to_string(),
        label: "KNN training or holdout partition".to_string(),
        variable_type: "NUMERIC".to_string(),
        measure: "nominal".to_string(),
        decimals: 0,
        values,
    }
}

fn build_fold_variable(
    total_cases: usize,
    processed_case_indices: &[usize],
    folds: &[usize],
) -> SavedVariable {
    let mut values = vec![DataValue::Null; total_cases];
    let uses_zero_based_folds = folds.contains(&0);

    for (processed_idx, &raw_idx) in processed_case_indices.iter().enumerate() {
        if raw_idx < values.len() {
            if let Some(fold) = folds.get(processed_idx).copied() {
                if fold != EXCLUDED_FOLD {
                    let saved_fold = if uses_zero_based_folds {
                        fold + 1
                    } else {
                        fold
                    };
                    values[raw_idx] = DataValue::Number(saved_fold as f64);
                } else {
                    values[raw_idx] = DataValue::Number(0.0);
                }
            }
        }
    }

    SavedVariable {
        name: "KNN_Fold".to_string(),
        label: "KNN cross-validation fold".to_string(),
        variable_type: "NUMERIC".to_string(),
        measure: "nominal".to_string(),
        decimals: 0,
        values,
    }
}

fn count_raw_cases(data: &AnalysisData) -> usize {
    data.features_data
        .iter()
        .map(|ds| ds.len())
        .chain(data.target_data.iter().map(|ds| ds.len()))
        .chain(
            data.case_data
                .as_ref()
                .into_iter()
                .flat_map(|datasets| datasets.iter().map(|ds| ds.len())),
        )
        .max()
        .unwrap_or(0)
}

fn sanitize_name_part(value: &str) -> String {
    let mut sanitized = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();

    if sanitized.is_empty() {
        sanitized = "Category".to_string();
    }

    if sanitized
        .chars()
        .next()
        .map(|ch| ch.is_ascii_digit())
        .unwrap_or(true)
    {
        sanitized.insert_str(0, "C_");
    }

    sanitized.chars().take(48).collect()
}
