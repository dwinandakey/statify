use nalgebra::DMatrix;
use statify_ordinal::{
    compute_gvif_diagnostics, EncodedPredictorBlock, GvifOptions,
};

fn block(name: &str, predictor_type: &str, column_indices: Vec<usize>) -> EncodedPredictorBlock {
    EncodedPredictorBlock {
        predictor_name: name.to_string(),
        predictor_type: predictor_type.to_string(),
        column_indices,
    }
}

#[test]
fn gvif_handles_covariate_and_multilevel_factor() {
    let x = DMatrix::from_row_slice(
        6,
        3,
        &[
            1.0, 1.0, 0.0,
            2.0, 1.0, 0.0,
            3.0, 0.0, 1.0,
            4.0, 0.0, 1.0,
            5.0, 0.0, 0.0,
            6.0, 0.0, 0.0,
        ],
    );
    let result = compute_gvif_diagnostics(
        &x,
        vec![
            block("Income", "Covariate", vec![0]),
            block("Education", "Factor", vec![1, 2]),
        ],
        GvifOptions::default(),
    );

    assert_eq!(result.rows.len(), 2);
    let education = result.rows.iter().find(|row| row.predictor == "Education").unwrap();
    assert_eq!(education.df, 2);
    assert!(education.gvif.is_finite());
    assert!(education.adjusted_gvif.is_finite());
}

#[test]
fn gvif_is_high_for_strongly_correlated_covariates() {
    let mut values = Vec::new();
    for i in 0..40 {
        let x1 = i as f64;
        let x2 = x1 * 2.0 + ((i % 3) as f64) * 0.001;
        values.extend_from_slice(&[x1, x2]);
    }
    let x = DMatrix::from_row_slice(40, 2, &values);
    let result = compute_gvif_diagnostics(
        &x,
        vec![
            block("x1", "Covariate", vec![0]),
            block("x2", "Covariate", vec![1]),
        ],
        GvifOptions::default(),
    );

    assert_eq!(result.rows.len(), 2);
    assert!(result.rows.iter().all(|row| row.adjusted_gvif >= 5.0));
}

#[test]
fn gvif_drops_zero_variance_columns_without_panic() {
    let x = DMatrix::from_row_slice(
        5,
        3,
        &[
            1.0, 1.0, 0.0,
            2.0, 1.0, 1.0,
            3.0, 1.0, 0.0,
            4.0, 1.0, 1.0,
            5.0, 1.0, 0.0,
        ],
    );
    let result = compute_gvif_diagnostics(
        &x,
        vec![
            block("x1", "Covariate", vec![0]),
            block("constant_factor_column", "Factor", vec![1]),
            block("group", "Factor", vec![2]),
        ],
        GvifOptions::default(),
    );

    assert!(result.warnings.iter().any(|warning| warning.contains("zero variance")));
    assert!(result.rows.iter().all(|row| row.gvif.is_finite()));
}

#[test]
fn gvif_regularizes_singular_correlation_matrix() {
    let x = DMatrix::from_row_slice(
        5,
        3,
        &[
            1.0, 2.0, 1.0,
            2.0, 4.0, 0.0,
            3.0, 6.0, 1.0,
            4.0, 8.0, 0.0,
            5.0, 10.0, 1.0,
        ],
    );
    let result = compute_gvif_diagnostics(
        &x,
        vec![
            block("x1", "Covariate", vec![0]),
            block("x2", "Covariate", vec![1]),
            block("group", "Factor", vec![2]),
        ],
        GvifOptions::default(),
    );

    assert!(result.warnings.iter().any(|warning| warning.contains("near-singular")));
    assert!(result.rows.iter().all(|row| row.gvif.is_finite()));
}

#[test]
fn gvif_requires_two_encoded_columns() {
    let x = DMatrix::from_row_slice(4, 1, &[1.0, 2.0, 3.0, 4.0]);
    let result = compute_gvif_diagnostics(
        &x,
        vec![block("x1", "Covariate", vec![0])],
        GvifOptions::default(),
    );

    assert!(result.rows.is_empty());
    assert!(result.warnings.iter().any(|warning| warning.contains("at least two")));
}
