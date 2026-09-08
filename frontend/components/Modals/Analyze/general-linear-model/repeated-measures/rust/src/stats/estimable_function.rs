use std::collections::HashMap;

use crate::models::{
    config::RepeatedMeasuresConfig,
    data::AnalysisData,
    result::GeneralEstimableFunction,
};

/// Calculate general estimable function
pub fn calculate_general_estimable_function(
    data: &AnalysisData,
    config: &RepeatedMeasuresConfig
) -> Result<GeneralEstimableFunction, String> {
    let mut matrix = HashMap::new();

    let mut param_names = vec!["Intercept".to_string()];
    if let Some(factors) = &config.main.factors_var {
        for f in factors {
            param_names.push(f.clone());
        }
    }

    // Create contrast vectors for each parameter
    for (i, param_name) in param_names.iter().enumerate() {
        // We'll create several different contrast vectors
        let contrasts = ["L1", "L2", "L3", "L5", "L7", "L9"];
        let mut param_contrasts = HashMap::new();

        for contrast in &contrasts {
            // Create simple contrasts - each contrast tests one parameter against others
            // For demonstration purposes:
            // - L1 tests intercept vs. others
            // - L2, L3 test first two factors against each other
            // - L5, L7, L9 test other combinations

            let contrast_value = match *contrast {
                "L1" => if param_name == "Intercept" { 1 } else { 0 }
                "L2" => if i == 1 { 1 } else { 0 }
                "L3" => if i == 2 { 1 } else { 0 }
                "L5" => if i == 1 { 1 } else if i == 2 { -1 } else { 0 }
                "L7" => if i == 3 { 1 } else { 0 }
                "L9" => if i == 4 { 1 } else { 0 }
                _ => 0,
            };

            param_contrasts.insert(contrast.to_string(), contrast_value);
        }

        matrix.insert(param_name.clone(), param_contrasts);
    }

    Ok(GeneralEstimableFunction {
        matrix,
        design: Some(
            format!(
                "Intercept + {}",
                config.main.factors_var.as_ref().map_or("".to_string(), |f| f.join(" + "))
            )
        ),
    })
}
