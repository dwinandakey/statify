// Statistical calculations for K-Medoids
//
// evaluation.rs, outlier_detection.rs, preprocessing.rs and silhouette.rs were
// removed: none of them were reachable from the WASM entry points in `wasm/`.
// Silhouette is computed inline in `algorithms::pam` (reusing the distance
// matrix); missing-value handling and normalization method selection live in
// the TypeScript service layer, with normalize_data() here as the one Rust
// implementation actually called via `wasm::standardize_data`.

pub mod normalization;

pub use normalization::*;
