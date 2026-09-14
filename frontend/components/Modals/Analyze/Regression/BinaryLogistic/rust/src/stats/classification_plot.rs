//! Classification Plot Data Generation
//! 
//! This module generates data for the Classification Plot visualization,
//! which shows the distribution of predicted probabilities for each observed group.
//! 
//! The Classification Plot is a stacked histogram-like visualization where:
//! - X-axis: Predicted probability (0 to 1)
//! - Y-axis: Frequency
//! - Two groups (typically "F" for FALSE/0 and "T" for TRUE/1) are shown
//! 
//! This is the modern equivalent of SPSS's ASCII-art classification plot.

use crate::models::result::{ClassificationPlotData, ClassificationPlotPoint};
use nalgebra::DVector;

/// Calculate classification plot data from model predictions
/// 
/// # Arguments
/// * `y_vector` - Observed binary outcomes (0 or 1)
/// * `predictions` - Predicted probabilities from the model
/// * `cutoff` - Classification cutoff (default 0.5)
/// * `label_0` - Label for group 0 (e.g., "FALSE", "No", etc.)
/// * `label_1` - Label for group 1 (e.g., "TRUE", "Yes", etc.)
/// 
/// # Returns
/// ClassificationPlotData containing all data points needed for visualization
pub fn calculate_classification_plot(
    y_vector: &DVector<f64>,
    predictions: &DVector<f64>,
    cutoff: f64,
    label_0: &str,
    label_1: &str,
) -> ClassificationPlotData {
    let n = y_vector.len();
    let mut data_points: Vec<ClassificationPlotPoint> = Vec::with_capacity(n);
    let mut n_group_0: usize = 0;
    let mut n_group_1: usize = 0;

    // Generate short labels (first character) for plot symbols
    let short_label_0 = label_0.chars().next().unwrap_or('F').to_uppercase().to_string();
    let short_label_1 = label_1.chars().next().unwrap_or('T').to_uppercase().to_string();

    for i in 0..n {
        let y_obs = y_vector[i];
        let prob = predictions[i];
        
        // Determine observed group
        let observed_group = if y_obs > 0.5 { 1u8 } else { 0u8 };
        let observed_label = if observed_group == 1 { 
            short_label_1.clone() 
        } else { 
            short_label_0.clone() 
        };

        // Count groups
        if observed_group == 0 {
            n_group_0 += 1;
        } else {
            n_group_1 += 1;
        }

        data_points.push(ClassificationPlotPoint {
            case_number: i + 1,  // 1-indexed
            predicted_probability: prob,
            observed_group,
            observed_label,
        });
    }

    ClassificationPlotData {
        data_points,
        cutoff,
        label_0: label_0.to_string(),
        label_1: label_1.to_string(),
        n_group_0,
        n_group_1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nalgebra::DVector;

    #[test]
    fn test_classification_plot_basic() {
        // Create test data
        let y = DVector::from_vec(vec![0.0, 0.0, 1.0, 1.0, 1.0]);
        let predictions = DVector::from_vec(vec![0.2, 0.4, 0.6, 0.8, 0.9]);
        
        let result = calculate_classification_plot(&y, &predictions, 0.5, "FALSE", "TRUE");
        
        assert_eq!(result.data_points.len(), 5);
        assert_eq!(result.n_group_0, 2);
        assert_eq!(result.n_group_1, 3);
        assert_eq!(result.cutoff, 0.5);
        
        // Check first point (group 0)
        assert_eq!(result.data_points[0].observed_group, 0);
        assert_eq!(result.data_points[0].observed_label, "F");
        
        // Check last point (group 1)
        assert_eq!(result.data_points[4].observed_group, 1);
        assert_eq!(result.data_points[4].observed_label, "T");
    }
}
