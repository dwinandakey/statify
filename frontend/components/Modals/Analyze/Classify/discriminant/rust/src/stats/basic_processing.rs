use crate::models::{ result::ProcessingSummary, AnalysisData, DiscriminantConfig };
use crate::models::data::{ DataRecord, DataValue };

pub fn basic_processing_summary(
    data: &AnalysisData,
    config: &DiscriminantConfig
) -> Result<ProcessingSummary, String> {
    web_sys::console::log_1(&"Executing basic_processing_summary".into());

    let total_cases: usize = data.group_data
        .iter()
        .map(|group| group.len())
        .sum();
    let min_range = config.define_range.min_range;
    let max_range = config.define_range.max_range;
    let group_var = &config.main.grouping_variable;

    // Each predictor lives in its own column of `independent_data`, whose records are
    // keyed by that predictor only, so a case is checked row by row in each
    // predictor's own column. (Looking a predictor up in every column made a single
    // missing value anywhere mark every case as missing.)
    let predictor_columns: Vec<(&String, Option<&Vec<DataRecord>>)> = config.main.independent_variables
        .iter()
        .filter(|v| *v != group_var)
        .map(|var| {
            let column = data.independent_data
                .iter()
                .find(|records| records.iter().any(|r| r.values.contains_key(var)));
            (var, column)
        })
        .collect();

    let mut missing_group_codes = 0;
    let mut missing_disc_vars = 0;
    let mut both_missing = 0;

    for (row, record) in data.group_data.iter().flatten().enumerate() {
        let has_missing_group = match record.values.get(group_var) {
            Some(DataValue::Number(val)) =>
                val.is_nan() ||
                    min_range.map_or(false, |min| *val < min) ||
                    max_range.map_or(false, |max| *val > max),
            Some(DataValue::Null) => true,
            Some(DataValue::Text(s)) if s.trim().is_empty() => true,
            None => true,
            _ => false,
        };

        let has_missing_disc = predictor_columns.iter().any(|(var, column)| {
            match column.and_then(|c| c.get(row)).and_then(|r| r.values.get(*var)) {
                Some(DataValue::Number(val)) => val.is_nan(),
                Some(DataValue::Text(s)) => s.trim().is_empty(),
                Some(DataValue::Null) => true,
                None => true,
                _ => false,
            }
        });

        if has_missing_group && has_missing_disc {
            both_missing += 1;
        } else if has_missing_group {
            missing_group_codes += 1;
        } else if has_missing_disc {
            missing_disc_vars += 1;
        }
    }

    let excluded_cases = missing_group_codes + missing_disc_vars + both_missing;
    let valid_cases = total_cases - excluded_cases;

    // Classification Processing Summary. With "Replace missing values with mean", a
    // case whose only problem is a missing predictor is still classified, so it is
    // not excluded from the classification output.
    let classification_missing_disc_vars = if config.classify.replace {
        0
    } else {
        missing_disc_vars
    };
    let classification_used_cases =
        total_cases - missing_group_codes - both_missing - classification_missing_disc_vars;

    let calc_percent = |value: usize| -> f64 {
        if total_cases == 0 { 0.0 } else { ((value as f64) * 100.0) / (total_cases as f64) }
    };

    Ok(ProcessingSummary {
        valid_cases,
        excluded_cases,
        total_cases,
        valid_percent: Some(calc_percent(valid_cases)),
        missing_group_codes: Some(missing_group_codes),
        missing_group_percent: Some(calc_percent(missing_group_codes)),
        missing_disc_vars: Some(missing_disc_vars),
        missing_disc_percent: Some(calc_percent(missing_disc_vars)),
        both_missing: Some(both_missing),
        both_missing_percent: Some(calc_percent(both_missing)),
        total_excluded_percent: Some(calc_percent(excluded_cases)),
        classification_missing_disc_vars: Some(classification_missing_disc_vars),
        classification_used_cases: Some(classification_used_cases),
    })
}
