use std::collections::HashMap;

use crate::models::{
    config::MultivariateConfig,
    data::AnalysisData,
    result::BetweenSubjectFactors,
};

use super::core::{ data_value_to_string, get_factor_levels };

/// Calculate basic processing summary
pub fn basic_processing_summary(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<HashMap<String, BetweenSubjectFactors>, String> {
    let mut result = HashMap::new();

    // Process between-subjects factors
    if let Some(factors) = &config.main.fix_factor {
        for factor in factors {
            if let Ok(levels) = get_factor_levels(data, factor) {
                let mut factor_summary = BetweenSubjectFactors {
                    value_counts: HashMap::new(),
                    value_labels: HashMap::new(),
                    n: None,
                };

                // Count occurrences of each level
                for level in &levels {
                    let count = data.fix_factor_data
                        .iter()
                        .flat_map(|records| records.iter())
                        .filter(|record| {
                            record.values
                                .get(factor)
                                .map(|v| data_value_to_string(v) == *level)
                                .unwrap_or(false)
                        })
                        .count();

                    factor_summary.value_counts.insert(level.clone(), count);
                }

                // Look up user-defined value labels from the variable definition.
                'defs: for defs in &data.fix_factor_data_defs {
                    for def in defs {
                        if def.name == *factor {
                            for vl in &def.values {
                                let key = data_value_to_string(&vl.value);
                                factor_summary.value_labels.insert(key, vl.label.clone());
                            }
                            break 'defs;
                        }
                    }
                }

                // Set total count
                let total_count = factor_summary.value_counts.values().sum();
                factor_summary.n = Some(total_count);

                result.insert(factor.clone(), factor_summary);
            }
        }
    }

    Ok(result)
}
