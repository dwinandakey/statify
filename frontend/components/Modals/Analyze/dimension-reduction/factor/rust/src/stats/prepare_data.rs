
// perbaikan bisa (9/1/2026)

use std::collections::HashMap;

use nalgebra::DMatrix;

use crate::models::{
    config::FactorAnalysisConfig,
    data::{ AnalysisData, DataRecord, DataValue },
};

fn data_value_matches_selection(value: &DataValue, selection: &str) -> bool {
    let selection = selection.trim();

    match value {
        DataValue::Number(number) => selection
            .parse::<f64>()
            .map(|expected| number.is_finite() && expected.is_finite() && *number == expected)
            .unwrap_or(false),
        DataValue::Text(text) => text == selection,
        DataValue::Boolean(boolean) => selection.eq_ignore_ascii_case(&boolean.to_string()),
        DataValue::Null => false,
    }
}

pub fn extract_data_matrix(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<(DMatrix<f64>, Vec<String>), String> {
    // ambil variables target
    let var_names = if let Some(vars) = &config.main.target_var {
        // klo variabel spesifik disediakan, pake variabel itu sesuai urutan yang ditentukan
        vars.clone()
    } else {
        // Kumpulkan semua variabel numerik dari semua dataset sambil mempertahankan urutannya
        let mut seen = std::collections::HashSet::new();
        let mut ordered_vars = Vec::new();

        for dataset in &data.target_data {
            for record in dataset {
                for (key, value) in &record.values {
                    if matches!(value, DataValue::Number(_)) && !seen.contains(key) {
                        seen.insert(key.clone());
                        ordered_vars.push(key.clone());
                    }
                }
            }
        }

        ordered_vars
    };

    if var_names.is_empty() {
        return Err("No valid variables found".to_string());
    }

    // Proses semua records dari semua dataset
    // ambil jumlah kasus maksimum di semua dataset
    let num_cases = data.target_data
        .iter()
        .map(|dataset| dataset.len())
        .max()
        .unwrap_or(0);

    if num_cases == 0 {
        return Err("No data records found".to_string());
    }

    // Prepare to collect data for each case
    let mut collected_records: Vec<HashMap<String, DataValue>> = vec![HashMap::new(); num_cases];

    // For each dataset, collect values for all variables
    for dataset in &data.target_data {
        for (case_idx, record) in dataset.iter().enumerate() {
            if case_idx < num_cases {
                // Merge this record's values into the case's collection
                for (var_name, value) in &record.values {
                    collected_records[case_idx].insert(var_name.clone(), value.clone());
                }
            }
        }
    }

    // Convert ke DataRecords
    let records: Vec<DataRecord> = collected_records
        .into_iter()
        .map(|values| DataRecord { values })
        .collect();

    // menerapkan filter variabel seleksi sebelum menangani nilai yang hilang
    let filtered_records = if let Some(value_target) = &config.main.value_target {
        if let Some(selection) = &config.value.selection {
            let mut filtered = Vec::new();

            for (case_idx, record) in records.iter().enumerate() {
                let matches_selection = data.value_target_data.iter().any(|value_dataset| {
                    value_dataset
                        .get(case_idx)
                        .and_then(|value_record| value_record.values.get(value_target))
                        .map(|value| data_value_matches_selection(value, selection))
                        .unwrap_or(false)
                });

                if matches_selection {
                    filtered.push(record.clone());
                }
            }

            filtered
        } else {
            // No selection specified, use all records
            records.clone()
        }
    } else {
        // No value_target specified, use all records
        records.clone()
    };

    if filtered_records.is_empty() {
        return Err("No valid records after filtering".to_string());
    }

    // Count valid records based on options
    let mut valid_records: Vec<Vec<f64>> = Vec::new();

    for record in &filtered_records {
        let mut row = Vec::new();
        let mut has_missing = false;

        // mulai perbaikan 21.1.2026
        for var_name in &var_names {
            match record.values.get(var_name) {
                Some(DataValue::Number(value)) => row.push(*value),
                _ => {
                    has_missing = true;
                    if config.options.replace_mean {
                        row.push(f64::NAN); // Nanti diganti mean
                    } else if config.options.exclude_pair_wise {
                        
                        // Jika Pair-wise, kita JANGAN break. Kita masukkan NaN.
                        // Nanti perhitungan matriks Korelasi harus pintar mengabaikan NaN ini.
                        row.push(f64::NAN); 
                    } else {
                        // Jika List-wise (default), kita skip row ini
                        break; 
                    }
                }
            }
        }

        // Update logika validasi row
        // Jika Pair-wise, kita terima row meskipun has_missing (selama row length lengkap dengan NaN)
        if !has_missing || config.options.exclude_pair_wise || (has_missing && config.options.replace_mean) {
            if row.len() == var_names.len() {
                valid_records.push(row);
            }
        }
    }

    if valid_records.is_empty() {
        return Err("No valid records after filtering".to_string());
    }

    // Replace NaN with means if requested
    if config.options.replace_mean {
        replace_missing_with_means(&mut valid_records);
    }

    // Convert to DMatrix
    let n_rows = valid_records.len();
    let n_cols = var_names.len();
    let mut data_matrix = DMatrix::zeros(n_rows, n_cols);

    for i in 0..n_rows {
        for j in 0..n_cols {
            data_matrix[(i, j)] = valid_records[i][j];
        }
    }

    Ok((data_matrix, var_names))
}

#[cfg(test)]
mod tests {
    use super::data_value_matches_selection;
    use crate::models::data::DataValue;

    #[test]
    fn numeric_selection_matches_equivalent_text_representations() {
        assert!(data_value_matches_selection(&DataValue::Number(1.0), "1"));
        assert!(data_value_matches_selection(&DataValue::Number(1.0), " 1.0 "));
        assert!(!data_value_matches_selection(&DataValue::Number(1.0), "2"));
    }

    #[test]
    fn text_and_boolean_selection_values_match_exactly() {
        assert!(data_value_matches_selection(&DataValue::Text("Active".into()), "Active"));
        assert!(!data_value_matches_selection(&DataValue::Text("Active".into()), "active"));
        assert!(data_value_matches_selection(&DataValue::Boolean(true), "TRUE"));
    }
}

// Replace missing values (NaN) with column means
pub fn replace_missing_with_means(data: &mut Vec<Vec<f64>>) {
    if data.is_empty() {
        return;
    }

    let n_cols = data[0].len();
    let mut means = vec![0.0; n_cols];
    let mut counts = vec![0; n_cols];

    // Calculate means
    for row in data.iter() {
        for (j, &val) in row.iter().enumerate() {
            if !val.is_nan() {
                means[j] += val;
                counts[j] += 1;
            }
        }
    }

    for j in 0..n_cols {
        if counts[j] > 0 {
            means[j] /= counts[j] as f64;
        }
    }

    // Replace missing values
    for row in data.iter_mut() {
        for j in 0..n_cols {
            if row[j].is_nan() {
                row[j] = means[j];
            }
        }
    }
}

// filter_valid_cases - New function to filter data based on configuration
pub fn filter_valid_cases(
    data: &AnalysisData,
    config: &FactorAnalysisConfig
) -> Result<AnalysisData, String> {
    // Extract the data matrix to validate the data
    let (_, _) = extract_data_matrix(data, config)?;

    // Return filtered data
    Ok(AnalysisData {
        target_data: data.target_data.clone(),
        value_target_data: data.value_target_data.clone(),
        target_data_defs: data.target_data_defs.clone(),
        value_target_data_defs: data.value_target_data_defs.clone(),
        eigenvalues: None,
        total_variance: None,
        n_variables: 0,
    })
}
