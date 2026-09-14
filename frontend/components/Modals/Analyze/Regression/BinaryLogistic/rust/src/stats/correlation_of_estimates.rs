use crate::models::result::CorrelationOfEstimatesRow;
use nalgebra::DMatrix;

/// Calculate Correlation Matrix of Parameter Estimates from Covariance Matrix
/// 
/// The correlation matrix is derived from the covariance matrix using:
/// corr(i,j) = cov(i,j) / sqrt(cov(i,i) * cov(j,j))
/// 
/// This is similar to SPSS's "Correlations" output option in Binary Logistic Regression.
/// 
/// # Arguments
/// * `covariance_matrix` - The covariance matrix of parameter estimates (from IRLS)
/// * `variable_names` - Names of variables including "Constant" if applicable
/// 
/// # Returns
/// A vector of CorrelationOfEstimatesRow, each containing variable name and correlation values
pub fn calculate_correlation_of_estimates(
    covariance_matrix: &DMatrix<f64>,
    variable_names: &[String],
) -> Vec<CorrelationOfEstimatesRow> {
    let p = covariance_matrix.nrows();
    
    // Safety check: dimensions must match
    if p == 0 || variable_names.is_empty() {
        return Vec::new();
    }
    
    // Calculate correlation matrix from covariance matrix
    let mut correlation_rows: Vec<CorrelationOfEstimatesRow> = Vec::with_capacity(p);
    
    // Pre-calculate standard deviations (sqrt of diagonal elements)
    let std_devs: Vec<f64> = (0..p)
        .map(|i| {
            let var = covariance_matrix[(i, i)];
            if var > 0.0 { var.sqrt() } else { 1.0 } // Avoid division by zero
        })
        .collect();
    
    for i in 0..p {
        let mut corr_values: Vec<f64> = Vec::with_capacity(p);
        
        for j in 0..p {
            if i == j {
                // Diagonal is always 1.0
                corr_values.push(1.0);
            } else {
                // corr(i,j) = cov(i,j) / (sd_i * sd_j)
                let cov_ij = covariance_matrix[(i, j)];
                let denominator = std_devs[i] * std_devs[j];
                
                let corr = if denominator > 1e-12 {
                    cov_ij / denominator
                } else {
                    0.0
                };
                
                // Clamp to valid correlation range [-1, 1]
                corr_values.push(corr.clamp(-1.0, 1.0));
            }
        }
        
        // Get variable name, fallback to generic if index out of bounds
        let var_name = if i < variable_names.len() {
            variable_names[i].clone()
        } else {
            format!("Var_{}", i + 1)
        };
        
        correlation_rows.push(CorrelationOfEstimatesRow {
            variable: var_name,
            values: corr_values,
        });
    }
    
    correlation_rows
}

#[cfg(test)]
mod tests {
    use super::*;
    use nalgebra::DMatrix;
    
    #[test]
    fn test_correlation_from_covariance() {
        // Example 2x2 covariance matrix
        // cov(X,X) = 4.0, cov(Y,Y) = 9.0, cov(X,Y) = 3.0
        // corr(X,Y) = 3.0 / (2.0 * 3.0) = 0.5
        let cov = DMatrix::from_row_slice(2, 2, &[
            4.0, 3.0,
            3.0, 9.0
        ]);
        
        let names = vec!["X".to_string(), "Y".to_string()];
        let result = calculate_correlation_of_estimates(&cov, &names);
        
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].variable, "X");
        assert_eq!(result[1].variable, "Y");
        
        // Diagonal should be 1.0
        assert!((result[0].values[0] - 1.0).abs() < 1e-10);
        assert!((result[1].values[1] - 1.0).abs() < 1e-10);
        
        // Off-diagonal correlation
        assert!((result[0].values[1] - 0.5).abs() < 1e-10);
        assert!((result[1].values[0] - 0.5).abs() < 1e-10);
    }
    
    #[test]
    fn test_diagonal_matrix() {
        // Diagonal covariance matrix = zero correlations off-diagonal
        let cov = DMatrix::from_row_slice(3, 3, &[
            1.0, 0.0, 0.0,
            0.0, 2.0, 0.0,
            0.0, 0.0, 3.0
        ]);
        
        let names = vec!["A".to_string(), "B".to_string(), "C".to_string()];
        let result = calculate_correlation_of_estimates(&cov, &names);
        
        // All off-diagonal should be 0
        assert!((result[0].values[1]).abs() < 1e-10);
        assert!((result[0].values[2]).abs() < 1e-10);
        assert!((result[1].values[0]).abs() < 1e-10);
    }
}
