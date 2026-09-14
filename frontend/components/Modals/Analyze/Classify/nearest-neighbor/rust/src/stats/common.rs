pub use super::distance::*;
pub use super::normalization::*;
pub use super::prediction::*;
pub use super::split::*;

use crate::models::{config::KnnConfig, data::KnnData};

pub fn determine_effective_k(knn_data: &KnnData, config: &KnnConfig) -> Result<usize, String> {
    let requested_k = config.neighbors.specify_k.max(1) as usize;
    let available_neighbors = knn_data.training_indices.len().saturating_sub(1).max(1);

    Ok(requested_k.min(available_neighbors))
}
