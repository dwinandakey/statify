// K-Medoids Data Models

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KMedoidsInput {
    pub data: Vec<Vec<f64>>,
    pub n_clusters: usize,
    pub method: String, // "PAM", "FastPAM", "CLARA", "CLARANS"
    pub max_iterations: usize,
    pub distance_metric: String, // "euclidean", "manhattan"
    pub random_seed: Option<u64>,
    #[serde(default = "default_n_init")]
    pub n_init: usize, // Number of times to run with different seeds, keep best result
    #[serde(default = "default_convergence_tolerance")]
    pub convergence_tolerance: f64, // Stop if cost improvement < tolerance
    #[serde(default)]
    pub use_build_phase: Option<bool>, // PAM: Some(true)=BUILD (deterministic), Some(false)=random init, None=true
    #[serde(default)]
    pub use_r_implementation: Option<bool>, // PAM: Some(true)=R-style path, Some(false)=native path, None=true
    #[serde(default = "default_clara_num_samples")]
    pub clara_num_samples: usize, // CLARA: number of sub-samples (default 5)
    #[serde(default)]
    pub clara_sample_size: Option<usize>, // CLARA: explicit sample size (default: 40 + 2*k)
    #[serde(default = "default_clarans_num_local")]
    pub clarans_num_local: usize, // CLARANS: number of local searches (default 2)
    #[serde(default)]
    pub clarans_max_neighbors: Option<usize>, // CLARANS: explicit max neighbors
}

fn default_n_init() -> usize { 10 }
fn default_convergence_tolerance() -> f64 { 0.0 }
fn default_clara_num_samples() -> usize { 5 }
fn default_clarans_num_local() -> usize { 2 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KMedoidsOutput {
    pub cluster_assignments: Vec<usize>,
    pub medoids_indices: Vec<usize>,
    pub medoids: Vec<Vec<f64>>,
    pub distances_to_medoids: Vec<f64>,
    pub total_distance: f64,
    /// Objective value (average distance): total_distance / n.
    #[serde(default)]
    pub avg_cost: f64,
    /// Total cost setelah fase BUILD.
    #[serde(default)]
    pub total_cost_build: f64,
    /// Total cost setelah fase SWAP (final).
    #[serde(default)]
    pub total_cost_swap: f64,
    pub iterations: usize,
    pub converged: bool,
    /// Cost at each iteration (index 0 = initial cost before any swap)
    #[serde(default)]
    pub cost_history: Vec<f64>,
    /// Per-object silhouette scores computed inside WASM from the already-built
    /// distance matrix.  Populated for PAM runs; empty vec for CLARA/CLARANS.
    #[serde(default)]
    pub silhouette_scores: Vec<f64>,
    /// Medoid indices at each step: [0] = initial (after BUILD), [i] = after swap i.
    /// Mirrors cost_history layout so UI can show exact medoids per iteration.
    #[serde(default)]
    pub medoid_history: Vec<Vec<usize>>,
    /// Per-sample costs for CLARA (length = num_samples). Empty for PAM/CLARANS.
    /// Each entry is the total cost on the full dataset for that sample's medoids.
    #[serde(default)]
    pub sample_costs: Vec<f64>,
    /// Per-sample PAM iterations for CLARA.
    #[serde(default)]
    pub sample_pam_iterations: Vec<usize>,
    /// 1-based index of the best sample (lowest cost) for CLARA. 0 means N/A.
    #[serde(default)]
    pub clara_best_sample_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterStatistics {
    pub cluster_id: usize,
    pub size: usize,
    pub within_cluster_distance: f64,
    pub silhouette_score: f64,
}

/// General clustering result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusteringResult {
    pub cluster_assignments: Vec<usize>,
    pub medoid_indices: Vec<usize>,
    pub total_cost: f64,
    pub iterations: usize,
    pub converged: bool,
}

/// Represents a data point with coordinates
pub type Point = Vec<f64>;

// ── Range (multi-k) request / response types ─────────────────────────────────

/// Input for running PAM across a range of k values in one WASM call.
/// The distance matrix is built once internally and reused for all k values.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KMedoidsRangeInput {
    pub data: Vec<Vec<f64>>,
    pub k_min: usize,
    pub k_max: usize,
    pub method: String,           // used for logging; range always runs PAM internally
    pub max_iterations: usize,
    pub distance_metric: String,
    pub random_seed: Option<u64>,
    #[serde(default = "default_convergence_tolerance")]
    pub convergence_tolerance: f64,
}

/// One result entry returned by `run_k_medoids_range`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KMedoidsRangeItem {
    pub k: usize,
    pub cluster_assignments: Vec<usize>,
    pub medoids_indices: Vec<usize>,
    pub total_distance: f64,
    pub iterations: usize,
    pub converged: bool,
    #[serde(default)]
    pub cost_history: Vec<f64>,
    /// Average silhouette score computed from the shared distance matrix.
    /// Pre-computed in WASM so the worker can skip JS silhouette computation.
    pub silhouette_overall: f64,
}
