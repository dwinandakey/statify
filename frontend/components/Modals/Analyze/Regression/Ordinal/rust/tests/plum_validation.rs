use std::collections::HashMap;

use serde_json::json;
use statify_ordinal::{
    validate_input, PlumEstimationOptions, PlumLocationModel, PlumMetadata, PlumPredictor,
    PlumResponse, PlumScaleModel, PlumWorkerPayload,
};

fn base_input() -> PlumWorkerPayload {
    let response_vector = vec![1.0];
    let location_design_matrix = vec![vec![0.0]];

    PlumWorkerPayload {
        analysis_type: "ORDINAL_REGRESSION_PLUM".to_string(),
        procedure: "PLUM".to_string(),
        version: "plum-v1".to_string(),
        weights: None,
        dependent: None,
        factors: Vec::new(),
        covariates: Vec::new(),
        factor_level_metadata: Vec::new(),
        response: PlumResponse {
            variable_name: "y".to_string(),
            column_index: 0,
            response_categories: vec![json!(1.0), json!(2.0)],
            response_vector: response_vector.clone(),
            category_count: 2,
        },
        location_model: PlumLocationModel {
            predictors: vec![PlumPredictor {
                id: Some("x1".to_string()),
                name: "x1".to_string(),
                column_index: Some(0),
                role: "continuous".to_string(),
                levels: None,
                reference_category: None,
                variables: None,
                encoded_column_count: Some(1),
            }],
            location_design_matrix: location_design_matrix.clone(),
            location_term_names: vec!["x1".to_string()],
            parameter_count: 1,
            factor_level_metadata: Vec::new(),
        },
        scale_model: PlumScaleModel {
            enabled: false,
            predictors: Vec::new(),
            scale_design_matrix: Vec::new(),
            scale_term_names: Vec::new(),
            parameter_count: 0,
        },
        estimation_options: PlumEstimationOptions {
            link_function: "Logit".to_string(),
            max_iterations: 50,
            max_step_halving: 10,
            log_likelihood_tolerance: 1e-6,
            parameter_tolerance: 1e-6,
            singularity_tolerance: 1e-6,
            confidence_level: 95.0,
            zero_cell_adjustment: 0.0,
        },
        output_options: serde_json::Value::Null,
        saved_variables: None,
        row_index_map: Vec::new(),
        existing_column_names: Vec::new(),
        metadata: PlumMetadata {
            model_type: "location_only".to_string(),
            total_rows: response_vector.len(),
            valid_rows: response_vector.len(),
            dropped_rows: 0,
            response_category_count: 2,
            location_parameter_count: 1,
            scale_parameter_count: 0,
            reference_categories: HashMap::new(),
            factor_level_metadata: Vec::new(),
        },
    }
}

#[test]
fn validation_fails_on_category_count() {
    let mut input = base_input();
    input.response.response_categories = vec![json!(1.0)];
    input.response.category_count = 1;
    let result = validate_input(&input);
    assert!(!result.valid);
}

#[test]
fn validation_fails_on_x_length() {
    let mut input = base_input();
    input.location_model.location_design_matrix = vec![vec![0.0, 1.0]];
    let result = validate_input(&input);
    assert!(!result.valid);
}

#[test]
fn validation_fails_on_missing_z_for_nonconstant() {
    let mut input = base_input();
    input.scale_model.enabled = true;
    input.scale_model.scale_design_matrix = Vec::new();
    input.scale_model.scale_term_names = vec!["z1".to_string()];
    let result = validate_input(&input);
    assert!(!result.valid);
}
