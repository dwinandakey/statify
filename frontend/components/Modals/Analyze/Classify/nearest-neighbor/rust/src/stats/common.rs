pub use super::distance::*;
pub use super::normalization::*;
pub use super::prediction::*;
pub use super::split::*;

use crate::models::{config::KnnConfig, data::KnnData};

/// Fixes the per-run context before any preprocessing, so every step of one
/// analysis (feature selection, k selection, final model, outputs) shares the
/// same valid cases and the same training/holdout split. Without a user seed
/// the split stays random: a fresh seed is drawn for each run.
pub fn prepare_run_config(config: &KnnConfig) -> KnnConfig {
    let mut run_config = config.clone();

    if !config.partition.set_seed && run_config.run.partition_seed.is_none() {
        run_config.run.partition_seed = Some(rand::random::<u32>() as i64);
    }

    if run_config.run.case_filter_features.is_none() {
        run_config.run.case_filter_features =
            Some(super::feature_selection::feature_universe(config));
    }

    run_config
}

pub fn determine_effective_k(knn_data: &KnnData, config: &KnnConfig) -> Result<usize, String> {
    let requested_k = config.neighbors.specify_k.max(1) as usize;
    let available_neighbors = knn_data.training_indices.len().saturating_sub(1).max(1);

    Ok(requested_k.min(available_neighbors))
}
