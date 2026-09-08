use std::collections::HashMap;

use crate::models::{
    config::MultivariateConfig,
    data::AnalysisData,
    result::{ DescriptiveStatistics, StatGroup, StatsEntry },
};

use super::core::{
    calculate_mean,
    calculate_std_deviation,
    extract_dependent_value,
    get_factor_levels,
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
            let factors = config.main.fix_factor.as_ref().unwrap();
            let factor = &factors[0];

            if let Ok(levels) = get_factor_levels(data, factor) {
                let mut all_values: Vec<f64> = Vec::new();

                for level in &levels {
                    let values: Vec<f64> = merged
                        .iter()
                        .filter_map(|rec| {
                            // Use the merged record which has both factor and DV keys.
                            use super::common::data_value_to_string;
                            let fv = rec.values
                                .get(factor.as_str())
                                .map(data_value_to_string);
                            if fv.as_deref() == Some(level.as_str()) {
                                extract_dependent_value(rec, &dep_var)
                            } else {
                                None
                            }
                        })
                        .collect();

                    if !values.is_empty() {
                        let mean = calculate_mean(&values);
                        let std_dev = calculate_std_deviation(&values, Some(mean));
                        all_values.extend_from_slice(&values);

                        descriptive_stats.groups.push(StatGroup {
                            factor_name: factor.clone(),
                            factor_value: level.clone(),
                            stats: StatsEntry {
                                mean,
                                std_deviation: std_dev,
                                n: values.len(),
                            },
                            subgroups: None,
                        });
                    }
                }

                // Total row across all levels (matches SPSS format).
                if !all_values.is_empty() {
                    let total_mean = calculate_mean(&all_values);
                    let total_std = calculate_std_deviation(&all_values, Some(total_mean));
                    descriptive_stats.groups.push(StatGroup {
                        factor_name: factor.clone(),
                        factor_value: "Total".to_string(),
                        stats: StatsEntry {
                            mean: total_mean,
                            std_deviation: total_std,
                            n: all_values.len(),
                        },
                        subgroups: None,
                    });
                }
            }
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
