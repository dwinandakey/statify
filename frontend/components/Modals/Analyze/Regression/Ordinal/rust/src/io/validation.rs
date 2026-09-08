use crate::types::{
    LinkFunction, PlumWorkerPayload, PlumValidationResult, ScaleType,
};
use crate::utils::{correlation, variance};

pub fn validate_input(input: &PlumWorkerPayload) -> PlumValidationResult {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    if input.analysis_type != "ORDINAL_REGRESSION_PLUM" {
        errors.push("analysisType harus ORDINAL_REGRESSION_PLUM".to_string());
    }
    if input.procedure != "PLUM" {
        errors.push("procedure harus PLUM".to_string());
    }
    if input.version != "plum-v1" {
        errors.push("version harus plum-v1".to_string());
    }

    if input.response.response_vector.is_empty() {
        errors.push("responseVector tidak boleh kosong".to_string());
    }

    if input.dependent.is_none() {
        errors.push("dependent wajib ada".to_string());
    }

    if !input.factors.is_empty() && !input.covariates.is_empty() {
        let factor_names: std::collections::HashSet<_> =
            input.factors.iter().map(|v| v.name.as_str()).collect();
        for cov in &input.covariates {
            if factor_names.contains(cov.name.as_str()) {
                errors.push("Variabel tidak boleh muncul di factors dan covariates".to_string());
                break;
            }
        }
    }

    let ordered_categories = &input.response.response_categories;
    if ordered_categories.len() < 2 {
        errors.push("responseCategories harus minimal 2".to_string());
    }
    if input.response.category_count != ordered_categories.len() {
        errors.push("categoryCount tidak sesuai responseCategories".to_string());
    }

    if LinkFunction::try_from(input.estimation_options.link_function.as_str()).is_err() {
        errors.push("linkFunction tidak valid".to_string());
    }

    let scale_type = match ScaleType::try_from(if input.scale_model.enabled { "non_constant" } else { "unity" }) {
        Ok(value) => value,
        Err(_) => {
            errors.push("scaleType tidak valid".to_string());
            ScaleType::Unity
        }
    };

    let location_len = input.location_model.location_term_names.len();
    let scale_len = input.scale_model.scale_term_names.len();

    let mut category_counts = vec![0.0; ordered_categories.len()];
    let mut total_weight = 0.0;

    let response_vector = &input.response.response_vector;
    let weights = input.weights.as_ref();
    let location_matrix = &input.location_model.location_design_matrix;
    let scale_matrix = &input.scale_model.scale_design_matrix;

    if location_matrix.is_empty() {
        errors.push("locationDesignMatrix kosong".to_string());
    }
    if location_matrix.len() != response_vector.len() {
        errors.push("jumlah baris X tidak sama dengan panjang responseVector".to_string());
    }

    let expected_cols = location_matrix.get(0).map(|row| row.len()).unwrap_or(0);
    if expected_cols != location_len {
        errors.push("jumlah kolom X tidak sama dengan locationTermNames".to_string());
    }

    let mut x_columns: Vec<Vec<f64>> = vec![Vec::new(); expected_cols.max(1)];
    for (row_index, row) in location_matrix.iter().enumerate() {
        if row.len() != expected_cols {
            errors.push(format!("Panjang row X tidak konsisten pada baris {row_index}"));
            break;
        }
        for (col_index, value) in row.iter().enumerate() {
            if !value.is_finite() {
                errors.push(format!("X tidak finite pada baris {row_index}, kolom {col_index}"));
                break;
            }
            x_columns[col_index].push(*value);
        }
    }

    if scale_type == ScaleType::NonConstant {
        if scale_matrix.len() != response_vector.len() {
            errors.push("jumlah baris Z tidak sama dengan panjang responseVector".to_string());
        }
        let expected_scale_cols = scale_matrix.get(0).map(|row| row.len()).unwrap_or(0);
        if expected_scale_cols != scale_len {
            errors.push("jumlah kolom Z tidak sama dengan scaleTermNames".to_string());
        }
        for (row_index, row) in scale_matrix.iter().enumerate() {
            if row.len() != expected_scale_cols {
                errors.push(format!("Panjang row Z tidak konsisten pada baris {row_index}"));
                break;
            }
            for (col_index, value) in row.iter().enumerate() {
                if !value.is_finite() {
                    errors.push(format!("Z tidak finite pada baris {row_index}, kolom {col_index}"));
                    break;
                }
            }
        }
    }

    for (idx, value) in response_vector.iter().enumerate() {
        if !value.is_finite() {
            errors.push(format!("responseVector tidak finite pada index {idx}"));
            break;
        }
        if *value < 1.0 || *value > ordered_categories.len() as f64 {
            errors.push("responseVector di luar rentang 1..J".to_string());
            break;
        }
        let weight = if let Some(w) = weights {
            if w.len() != response_vector.len() {
                errors.push("panjang weights tidak sama dengan responseVector".to_string());
                break;
            }
            w[idx]
        } else {
            1.0
        };
        if !weight.is_finite() || weight <= 0.0 {
            errors.push(format!("weights tidak valid pada index {idx}"));
            break;
        }
        total_weight += weight;
        let encoded = (*value).round() as usize;
        if encoded > 0 && encoded <= category_counts.len() {
            category_counts[encoded - 1] += weight;
        }
    }

    let options = &input.estimation_options;
    if options.max_iterations == 0 {
        errors.push("maxIterations harus > 0".to_string());
    }
    if options.parameter_tolerance <= 0.0 {
        errors.push("parameterTolerance harus > 0".to_string());
    }
    if options.log_likelihood_tolerance < 0.0 {
        errors.push("logLikelihoodTolerance harus >= 0".to_string());
    }
    if options.singularity_tolerance <= 0.0 {
        errors.push("singularityTolerance harus > 0".to_string());
    }
    if !(50.0..=99.99).contains(&options.confidence_level) {
        errors.push("confidenceLevel harus 50..99.99".to_string());
    }

    if total_weight < 10.0 {
        warnings.push("Jumlah observasi efektif sangat kecil".to_string());
    }

    let max_allowed_params = response_vector.len();
    if location_len > max_allowed_params {
        errors.push("Jumlah parameter aktif melebihi observasi efektif".to_string());
    }

    for predictor in &input.location_model.predictors {
        if predictor.role == "factor" {
            let levels = predictor.levels.as_ref().map(|l| l.len()).unwrap_or(0);
            if levels < 2 {
                errors.push(format!("Factor '{}' memiliki < 2 level", predictor.name));
            }
            let threshold = (response_vector.len() as f64).sqrt().max(20.0);
            if (levels as f64) > threshold {
                warnings.push(format!("Factor '{}' memiliki banyak level ({levels})", predictor.name));
            }
        }
    }

    for (idx, count) in category_counts.iter().enumerate() {
        if *count <= 0.0 {
            warnings.push(format!("Kategori response {} tidak memiliki observasi", idx + 1));
        }
    }

    for (idx, column) in x_columns.iter().enumerate() {
        if variance(column) < 1e-12 {
            warnings.push(format!("Variabel location {} hampir konstan", idx + 1));
        }
    }

    for i in 0..x_columns.len() {
        for j in (i + 1)..x_columns.len() {
            let corr = correlation(&x_columns[i], &x_columns[j]);
            if corr.abs() > 0.999 {
                warnings.push("Multikolinearitas kuat terdeteksi".to_string());
                break;
            }
        }
    }

    PlumValidationResult {
        valid: errors.is_empty(),
        errors,
        warnings,
    }
}
