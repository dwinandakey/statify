use std::collections::HashMap;

use serde_json::json;
use statify_ordinal::{
    aggregate_data, build_plum_output, fit_plum, multinomial_log_likelihood_constant,
    EstimationOptions, IterationHistoryOptions, PlumEstimationOptions, PlumLocationModel,
    PlumMetadata, PlumPredictor, PlumResponse, PlumSavedVariableOptions, PlumScaleModel, PlumSpec,
    PlumWorkerPayload,
};

fn build_input() -> PlumWorkerPayload {
    let response_vector = vec![1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
    let location_design_matrix = vec![
        vec![0.1],
        vec![0.2],
        vec![0.3],
        vec![0.4],
        vec![0.5],
        vec![0.6],
        vec![0.7],
        vec![0.8],
        vec![0.9],
    ];

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
            response_categories: vec![json!(1.0), json!(2.0), json!(3.0)],
            response_vector: response_vector.clone(),
            category_count: 3,
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
            max_iterations: 100,
            max_step_halving: 10,
            log_likelihood_tolerance: 1e-4,
            parameter_tolerance: 1e-4,
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
            response_category_count: 3,
            location_parameter_count: 1,
            scale_parameter_count: 0,
            reference_categories: HashMap::new(),
            factor_level_metadata: Vec::new(),
        },
    }
}

#[test]
fn location_only_fit_converges() {
    let input = build_input();
    let data = aggregate_data(&input).expect("data");
    let spec = PlumSpec::from_input(&input).expect("spec");
    let options = EstimationOptions::from_payload(Some(&input.estimation_options));
    let history_options = IterationHistoryOptions::disabled();

    let fit = fit_plum(&data, &spec, &options, &history_options).expect("fit");

    assert!(fit.converged);
    assert_eq!(fit.params.theta.len(), spec.threshold_count());
    assert_eq!(fit.params.beta.len(), spec.location_parameter_count());

    let output = build_plum_output(&input, &data, &spec, &fit).expect("output");
    assert!(!output.parameter_estimates.is_empty());
}

#[test]
fn displayed_minus2_log_likelihood_is_consistent_for_all_links() {
    let links = [
        "Logit",
        "Probit",
        "Complementary Log-Log",
        "Negative Log-Log",
        "Cauchit",
    ];

    for link in links {
        let mut input = build_input();
        input.estimation_options.link_function = link.to_string();
        input.output_options = json!({
            "summaryStatistics": true,
            "printLogLikelihood": "Including"
        });

        let data = aggregate_data(&input).expect("data");
        let spec = PlumSpec::from_input(&input).expect("spec");
        let options = EstimationOptions::from_payload(Some(&input.estimation_options));
        let history_options = IterationHistoryOptions::disabled();
        let fit = fit_plum(&data, &spec, &options, &history_options).expect("fit");
        let output = build_plum_output(&input, &data, &spec, &fit).expect("output");
        let expected_constant = multinomial_log_likelihood_constant(&data);

        assert_eq!(
            output.log_likelihood_display_mode, "SPSS_COMPATIBLE",
            "{link}: Rust output must own the requested displayed PLUM/SPSS mode"
        );
        assert!(
            (output.log_likelihood_constant - expected_constant).abs() < 1e-9,
            "{link}: log-likelihood constant must match aggregated SPSS multinomial constant"
        );
        assert!(
            (output.log_likelihood_complete
                - (output.log_likelihood_kernel + output.log_likelihood_constant))
                .abs()
                < 1e-9,
            "{link}: complete log-likelihood must be kernel + constant"
        );
        assert!(
            (output.log_likelihood - output.log_likelihood_complete).abs() < 1e-9,
            "{link}: Including mode must display the complete SPSS-compatible log-likelihood"
        );

        assert!(
            (output.minus2_log_likelihood - (-2.0 * output.log_likelihood)).abs() < 1e-9,
            "{link}: top-level -2LL must be computed from displayed log-likelihood"
        );
        assert!(
            (output.minus2_log_likelihood_displayed - output.minus2_log_likelihood).abs() < 1e-9,
            "{link}: displayed -2LL must match top-level -2LL"
        );

        let summary = output.summary_statistics.expect("summary");
        assert!(
            (summary.model.minus2_log_likelihood - output.minus2_log_likelihood).abs() < 1e-9,
            "{link}: model fitting table must use the same displayed -2LL"
        );
    }
}

#[test]
fn parallel_lines_test_is_computed_for_all_links_when_requested() {
    let links = [
        "Logit",
        "Probit",
        "Complementary Log-Log",
        "Negative Log-Log",
        "Cauchit",
    ];

    for link in links {
        let mut input = build_input();
        input.estimation_options.link_function = link.to_string();
        input.output_options = json!({
            "summaryStatistics": true,
            "testOfParallelLines": true
        });

        let data = aggregate_data(&input).expect("data");
        let spec = PlumSpec::from_input(&input).expect("spec");
        let options = EstimationOptions::from_payload(Some(&input.estimation_options));
        let history_options = IterationHistoryOptions::disabled();
        let fit = fit_plum(&data, &spec, &options, &history_options).expect("fit");
        let output = build_plum_output(&input, &data, &spec, &fit).expect("output");
        let test = output
            .test_of_parallel_lines
            .unwrap_or_else(|| panic!("{link}: expected parallel lines test result"));

        assert!(
            test.minus2_log_likelihood_parallel.is_finite(),
            "{link}: parallel -2LL must be finite"
        );
        assert!(
            test.minus2_log_likelihood_non_parallel.is_finite(),
            "{link}: general -2LL must be finite"
        );
        assert!(
            test.chi_square.is_finite(),
            "{link}: chi-square must be finite"
        );
        assert_eq!(test.df, 1.0, "{link}: df must be (J - 2) * p");
        assert!(
            test.sig.is_some(),
            "{link}: sig must be available for df > 0"
        );
    }
}

#[test]
fn saved_variables_are_computed_by_rust_output() {
    let mut input = build_input();
    input.saved_variables = Some(PlumSavedVariableOptions {
        predicted_response_category: Some(true),
        estimated_response_probabilities: Some(true),
        predicted_category_probability: Some(true),
        actual_category_probability: Some(true),
        ..Default::default()
    });
    input.row_index_map = (0..input.response.response_vector.len()).collect();

    let data = aggregate_data(&input).expect("data");
    let spec = PlumSpec::from_input(&input).expect("spec");
    let options = EstimationOptions::from_payload(Some(&input.estimation_options));
    let history_options = IterationHistoryOptions::disabled();
    let fit = fit_plum(&data, &spec, &options, &history_options).expect("fit");
    let output = build_plum_output(&input, &data, &spec, &fit).expect("output");
    let saved = output.saved_variables.expect("saved variables");

    assert_eq!(saved.batch_suffix, 1);
    assert_eq!(saved.columns.len(), 6);
    assert!(saved.columns.iter().any(|column| column.name == "PRE_1"));
    assert!(saved.columns.iter().any(|column| column.name == "EST1_1"));
    assert!(saved.columns.iter().any(|column| column.name == "EST2_1"));
    assert!(saved.columns.iter().any(|column| column.name == "EST3_1"));
    assert!(saved.columns.iter().any(|column| column.name == "PCP_1"));
    assert!(saved.columns.iter().any(|column| column.name == "ACP_1"));
    assert!(saved
        .columns
        .iter()
        .all(|column| column.values.len() == input.metadata.total_rows));
}
