// Validation utilities for K-Medoids

use crate::models::KMedoidsInput;

/// Validate input parameters
pub fn validate_input(input: &KMedoidsInput) -> Result<(), String> {
    if input.data.is_empty() {
        return Err("Data cannot be empty".to_string());
    }

    if input.n_clusters == 0 {
        return Err("Number of clusters must be greater than 0".to_string());
    }

    if input.n_clusters > input.data.len() {
        return Err("Number of clusters cannot exceed number of data points".to_string());
    }

    // k == n is technically valid for PAM (trivially: every point is its own
    // medoid) but meaningless in practice and causes an infinite loop in the
    // CLARANS neighbor-search.  Reject it here for all methods.
    if input.n_clusters == input.data.len() && input.data.len() > 1 {
        return Err(format!(
            "Number of clusters ({}) must be less than the number of data points ({})",
            input.n_clusters, input.data.len()
        ));
    }

    if input.max_iterations == 0 {
        return Err("Maximum iterations must be greater than 0".to_string());
    }

    if input.method == "CLARA" {
        if let Some(sample_size) = input.clara_sample_size {
            if sample_size <= input.n_clusters {
                return Err(format!(
                    "CLARA sample size ({}) must be strictly greater than the number of clusters ({})",
                    sample_size, input.n_clusters
                ));
            }
        }
    }

    // Validate all data points have the same dimension
    if let Some(first_point) = input.data.first() {
        let dim = first_point.len();
        if dim == 0 {
            return Err("Data points cannot be empty".to_string());
        }
        
        for (idx, point) in input.data.iter().enumerate() {
            if point.len() != dim {
                return Err(format!(
                    "All data points must have the same dimension. Point {} has dimension {}, expected {}",
                    idx, point.len(), dim
                ));
            }
        }
    }

    Ok(())
}

/// Validate raw data for clustering algorithms
pub fn validate_clustering_input(data: &[Vec<f64>], k: usize) -> Result<(), String> {
    if data.is_empty() {
        return Err("Data cannot be empty".to_string());
    }

    if k == 0 {
        return Err("Number of clusters must be greater than 0".to_string());
    }

    if k > data.len() {
        return Err(format!(
            "Number of clusters ({}) cannot exceed number of data points ({})",
            k, data.len()
        ));
    }

    // k == n: every point would be its own medoid.  CLARANS has no non-medoid
    // candidates and would loop forever; reject it universally.
    if k == data.len() && data.len() > 1 {
        return Err(format!(
            "Number of clusters ({}) must be less than the number of data points ({})",
            k, data.len()
        ));
    }

    // Validate all data points have the same dimension
    if let Some(first_point) = data.first() {
        let dim = first_point.len();
        if dim == 0 {
            return Err("Data points cannot be empty".to_string());
        }
        
        for (idx, point) in data.iter().enumerate() {
            if point.len() != dim {
                return Err(format!(
                    "All data points must have the same dimension. Point {} has dimension {}, expected {}",
                    idx, point.len(), dim
                ));
            }
        }
    }

    Ok(())
}
