use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KMedoidsInput {
    pub data: Vec<Vec<f64>>,
    pub n_clusters: usize,
    /// "PAM", "FastPAM", "CLARA", atau "CLARANS"
    pub method: String,
    pub max_iterations: usize,
    /// "euclidean" atau "manhattan"
    pub distance_metric: String,
    pub random_seed: Option<u64>,
    /// Jumlah run dengan seed berbeda; hasil terbaik yang dipakai
    #[serde(default = "default_n_init")]
    pub n_init: usize,
    /// Berhenti jika perbaikan cost lebih kecil dari nilai ini
    #[serde(default = "default_convergence_tolerance")]
    pub convergence_tolerance: f64,
    /// PAM: Some(true) = BUILD (deterministik), Some(false) = inisialisasi acak, None = true
    #[serde(default)]
    pub use_build_phase: Option<bool>,
    /// PAM: Some(true) = jalur gaya R, Some(false) = jalur native, None = true
    #[serde(default)]
    pub use_r_implementation: Option<bool>,
    /// CLARA: jumlah sub-sampel (default 5)
    #[serde(default = "default_clara_num_samples")]
    pub clara_num_samples: usize,
    /// CLARA: ukuran sampel eksplisit (default 40 + 2*k)
    #[serde(default)]
    pub clara_sample_size: Option<usize>,
    /// CLARANS: jumlah pencarian lokal (default 2)
    #[serde(default = "default_clarans_num_local")]
    pub clarans_num_local: usize,
    /// CLARANS: batas maksimum tetangga yang diperiksa
    #[serde(default)]
    pub clarans_max_neighbors: Option<usize>,
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
    /// Nilai objektif (jarak rata-rata): total_distance / n
    #[serde(default)]
    pub avg_cost: f64,
    /// Total cost setelah fase BUILD
    #[serde(default)]
    pub total_cost_build: f64,
    /// Total cost setelah fase SWAP (final)
    #[serde(default)]
    pub total_cost_swap: f64,
    pub iterations: usize,
    pub converged: bool,
    /// Cost tiap iterasi (indeks 0 = cost awal sebelum swap pertama)
    #[serde(default)]
    pub cost_history: Vec<f64>,
    /// Skor silhouette per objek, dihitung di dalam WASM dari distance matrix
    /// yang sudah ada. Terisi untuk PAM; kosong untuk CLARA/CLARANS.
    #[serde(default)]
    pub silhouette_scores: Vec<f64>,
    /// Medoid di tiap langkah: [0] = awal (setelah BUILD), [i] = setelah swap ke-i.
    /// Layoutnya sama dengan cost_history.
    #[serde(default)]
    pub medoid_history: Vec<Vec<usize>>,
    /// CLARA: cost per sampel pada seluruh dataset. Kosong untuk PAM/CLARANS.
    #[serde(default)]
    pub sample_costs: Vec<f64>,
    /// CLARA: jumlah iterasi PAM per sampel
    #[serde(default)]
    pub sample_pam_iterations: Vec<usize>,
    /// CLARA: indeks (mulai dari 1) sampel terbaik. 0 berarti tidak berlaku.
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusteringResult {
    pub cluster_assignments: Vec<usize>,
    pub medoid_indices: Vec<usize>,
    pub total_cost: f64,
    pub iterations: usize,
    pub converged: bool,
}

pub type Point = Vec<f64>;

/// Input untuk menjalankan PAM pada rentang nilai k dalam satu panggilan WASM.
/// Distance matrix dibangun sekali dan dipakai ulang untuk semua k.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KMedoidsRangeInput {
    pub data: Vec<Vec<f64>>,
    pub k_min: usize,
    pub k_max: usize,
    /// Hanya untuk logging; mode range selalu memakai PAM
    pub method: String,
    pub max_iterations: usize,
    pub distance_metric: String,
    pub random_seed: Option<u64>,
    #[serde(default = "default_convergence_tolerance")]
    pub convergence_tolerance: f64,
}

/// Satu entri hasil dari `run_k_medoids_range`.
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
    /// Rata-rata silhouette dari distance matrix bersama, dihitung di WASM
    /// sehingga worker tidak perlu menghitungnya lagi di JS.
    pub silhouette_overall: f64,
}

/// Input `standardize_data`: matriks numerik dan metode penskalaan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardizeInput {
    pub data: Vec<Vec<f64>>,
    /// "zscore" | "minmax" | "none" (nilai lain dianggap "none")
    pub method: String,
}

/// Output `standardize_data`: matriks hasil penskalaan dengan bentuk yang sama.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StandardizeOutput {
    pub matrix: Vec<Vec<f64>>,
}

/// Input `calculate_wcss` (metode Elbow): hasil clustering beserta datanya.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WcssInput {
    pub data: Vec<Vec<f64>>,
    pub labels: Vec<usize>,
    pub medoid_indices: Vec<usize>,
    pub distance_metric: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WcssOutput {
    pub wcss: f64,
}