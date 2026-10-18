use std::collections::HashMap;

use crate::models::{
    config::MultivariateConfig,
    data::{ AnalysisData, DataRecord },
    result::{ DescriptiveStatistics, StatGroup, StatsEntry },
};

use super::core::{
    calculate_mean,
    calculate_std_deviation,
    extract_dependent_value,
    get_factor_levels,
    data_value_to_string,
    merge_records,
};

/// Calculate descriptive statistics
pub fn calculate_descriptive_statistics(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<HashMap<String, DescriptiveStatistics>, String> {
    let mut result = HashMap::new();

    // Merge all data streams so DV values and factor values align by row index.
    let merged = merge_records(data);

    let dependent_vars = data.dependent_data_defs
        .iter()
        .flat_map(|defs| defs.iter().map(|def| def.name.clone()))
        .collect::<Vec<String>>();

    for dep_var in dependent_vars {
        let mut descriptive_stats = DescriptiveStatistics {
            dependent_variable: dep_var.clone(),
            groups: Vec::new(),
        };

        let has_factors = config.main.fix_factor
            .as_ref()
            .map_or(false, |f| !f.is_empty());

        if has_factors {
            // Every factor with its levels in ascending order, as SPSS: the
            // table is nested (levels of the first factor, within each the
            // levels of the second, ..., each block closed by Total).
            let factors: Vec<(String, Vec<String>)> = config.main.fix_factor
                .as_ref()
                .unwrap()
                .iter()
                .filter_map(|f| get_factor_levels(data, f).ok().map(|mut levels| {
                    sort_levels(&mut levels);
                    (f.clone(), levels)
                }))
                .collect();
            let rows: Vec<&DataRecord> = merged.iter().collect();
            descriptive_stats.groups = level_groups(&rows, &factors, &dep_var);
        } else {
            // No factors — overall statistics.
            let values: Vec<f64> = merged
                .iter()
                .filter_map(|rec| extract_dependent_value(rec, &dep_var))
                .collect();

            if !values.is_empty() {
                let mean = calculate_mean(&values);
                let std_dev = calculate_std_deviation(&values, Some(mean));
                descriptive_stats.groups.push(StatGroup {
                    factor_name: "Overall".to_string(),
                    factor_value: "".to_string(),
                    stats: StatsEntry {
                        mean,
                        std_deviation: std_dev,
                        n: values.len(),
                    },
                    subgroups: None,
                });
            }
        }

        result.insert(dep_var, descriptive_stats);
    }

    Ok(result)
}

/// Groups of the first factor in `factors` over `rows` (levels with at least
/// one value of `dep_var`, then Total); when more factors follow, each group
/// holds the groups of the next factor within it as `subgroups`.
fn level_groups(
    rows: &[&DataRecord],
    factors: &[(String, Vec<String>)],
    dep_var: &str
) -> Vec<StatGroup> {
    let Some(((factor, levels), rest)) = factors.split_first() else {
        return Vec::new();
    };
    let group = |value: &str, rows: &[&DataRecord]| -> Option<StatGroup> {
        let values: Vec<f64> = rows
            .iter()
            .filter_map(|rec| extract_dependent_value(rec, dep_var))
            .collect();
        if values.is_empty() {
            return None;
        }
        let mean = calculate_mean(&values);
        Some(StatGroup {
            factor_name: factor.clone(),
            factor_value: value.to_string(),
            stats: StatsEntry {
                mean,
                std_deviation: calculate_std_deviation(&values, Some(mean)),
                n: values.len(),
            },
            subgroups: if rest.is_empty() { None } else { Some(level_groups(rows, rest, dep_var)) },
        })
    };

    let mut groups: Vec<StatGroup> = levels
        .iter()
        .filter_map(|level| {
            let level_rows: Vec<&DataRecord> = rows
                .iter()
                .copied()
                .filter(|rec| rec.values.get(factor.as_str()).map(data_value_to_string).as_deref() == Some(level.as_str()))
                .collect();
            group(level, &level_rows)
        })
        .collect();
    // Total row across all levels (matches SPSS format).
    groups.extend(group("Total", rows));
    groups
}

/// Ascending level order as SPSS: numerically when both levels are numbers,
/// otherwise as text.
fn sort_levels(levels: &mut [String]) {
    levels.sort_by(|a, b| match (a.parse::<f64>(), b.parse::<f64>()) {
        (Ok(x), Ok(y)) => x.partial_cmp(&y).unwrap_or(std::cmp::Ordering::Equal),
        _ => a.cmp(b),
    });
}
