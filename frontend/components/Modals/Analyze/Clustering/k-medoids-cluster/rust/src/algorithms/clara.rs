/// Algoritma
/// Mengambil beberapa sampel dari dataset
/// Menerapkan PAM pada setiap sampel
/// Menghitung kualitas setiap hasil PAM pada seluruh dataset
/// Mengembalikan hasil pengelompokan terbaik

/// Referensi:
/// - Kaufman, L. and Rousseeuw, P.J. (1990)
///   "Finding Groups in Data: An Introduction to Cluster Analysis"

use crate::algorithms::pam::{run_pam, PAMConfig};
use crate::models::ClusteringResult;
use crate::utils::distance::{calculate_distance, DistanceMetric};
use crate::utils::validation::validate_clustering_input;
use rand::seq::SliceRandom;
use rand::SeedableRng;

/// Detail satu sampling run (untuk dikirim ke JS sebagai sampling history)
#[derive(Debug, Clone)]
pub struct SampleRecord {
    /// 1-based sample number
    pub sample_index: usize,
    /// Number of points in this sample
    pub sample_size: usize,
    /// Total cost evaluated on the **entire** dataset for this sample's medoids
    pub cost: f64,
    /// Number of PAM SWAP iterations performed on this sample
    pub pam_iterations: usize,
}

#[derive(Debug, Clone)]
pub struct CLARAConfig {
    /// Number of clusters (k)
    pub k: usize,
    
    /// Distance metric to use
    pub metric: DistanceMetric,
    
    /// Number of samples to draw
    pub num_samples: usize,
    
    /// Size of each sample (should be > k, typically 40 + 2*k)
    pub sample_size: usize,
    
    /// Maximum iterations for PAM on each sample
    pub max_iterations: usize,
    
    /// Random seed for reproducibility
    pub random_seed: Option<u64>,
    
    /// Use BUILD phase for PAM initialization
    pub use_build_phase: bool,
}

impl Default for CLARAConfig {
    fn default() -> Self {
        Self {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_samples: 5,
            sample_size: 40 + 2 * 2, // 40 + 2*k
            max_iterations: 100,
            random_seed: None,
            use_build_phase: true,
        }
    }
}

impl CLARAConfig {
    /// Create a new CLARA config with automatic sample size
    pub fn new(k: usize, metric: DistanceMetric) -> Self {
        Self {
            k,
            metric,
            sample_size: 40 + 2 * k,
            ..Default::default()
        }
    }
}

/// Result from CLARA clustering
#[derive(Debug, Clone)]
pub struct CLARAResult {
    /// Medoid indices (in original data)
    pub medoids: Vec<usize>,
    
    /// Cluster assignments (point index -> cluster index)
    pub assignments: Vec<usize>,
    
    /// Total cost (sum of distances to nearest medoid)
    pub total_cost: f64,
    
    /// Number of samples tried
    pub samples_tried: usize,
    
    /// Best sample cost (cost on sample data)
    pub best_sample_cost: f64,

    pub samples: Vec<SampleRecord>,   
    pub best_sample_index: usize,       
}

pub fn run_clara(data: &[Vec<f64>], config: &CLARAConfig) -> Result<CLARAResult, String> {
    // Validate input
    validate_clustering_input(data, config.k)?;
    
    let n = data.len();
    
    // Validate sample size
    if config.sample_size < config.k {
        return Err(format!(
            "Sample size ({}) must be at least k ({})",
            config.sample_size, config.k
        ));
    }
    
    let sample_size = config.sample_size.min(n);
    
    if sample_size < config.k {
        return Err(format!(
            "Dataset too small. Need at least {} points for k={}",
            config.k, config.k
        ));
    }
    
    if n <= sample_size {
        let pam_config = PAMConfig {
            k: config.k,
            metric: config.metric.clone(),
            max_iterations: config.max_iterations,
            random_seed: config.random_seed,
            use_build_phase: config.use_build_phase,
            epsilon: 1e-6,
            n_init: 1, // CLARA handles multiple samples itself
            use_r_implementation: false,
        };
        
        let pam_result = run_pam(data, &pam_config)?;
        
        let fallback_cost = pam_result.total_cost;
        let fallback_iters = pam_result.iterations;
        return Ok(CLARAResult {
            medoids: pam_result.medoids,
            assignments: pam_result.assignments,
            total_cost: pam_result.total_cost,
            samples_tried: 1,
            best_sample_cost: pam_result.total_cost,
            samples: vec![SampleRecord {
                sample_index: 1,
                sample_size,
                cost: fallback_cost,
                pam_iterations: fallback_iters,
            }],
            best_sample_index: 1,
        });
    }
    
    // Initialize RNG
    let mut rng = if let Some(seed) = config.random_seed {
        rand::rngs::StdRng::seed_from_u64(seed)
    } else {
        rand::rngs::StdRng::from_entropy()
    };
    
    let mut best_medoids: Vec<usize> = Vec::new();
    let mut best_cost = f64::INFINITY;
    let mut best_sample_cost = f64::INFINITY;
    let mut sample_records: Vec<SampleRecord> = Vec::new();  // ← BARU  
    let mut best_sample_index: usize = 1;                    // ← BARU
    
    // Try multiple samples
    for sample_idx in 0..config.num_samples {
        // Draw random sample
        let sample_indices = draw_sample(n, sample_size, &mut rng);
        let sample_data: Vec<Vec<f64>> = sample_indices
            .iter()
            .map(|&idx| data[idx].clone())
            .collect();
        
        // Run PAM on sample
        let pam_config = PAMConfig {
            k: config.k,
            metric: config.metric.clone(),
            max_iterations: config.max_iterations,
            random_seed: Some(sample_idx as u64), // Different seed for each sample
            use_build_phase: config.use_build_phase,
            epsilon: 1e-6,
            n_init: 1, // CLARA handles multiple samples itself
            use_r_implementation: false,
        };
        
        let pam_result = match run_pam(&sample_data, &pam_config) {
            Ok(result) => result,
            Err(_) => continue, // Skip this sample if PAM fails
        };
        
        // Map sample medoids back to original indices
        let medoids_in_original: Vec<usize> = pam_result
            .medoids
            .iter()
            .map(|&sample_idx| sample_indices[sample_idx])
            .collect();
        
        // Calculate cost on entire dataset
        let (_assignments, total_cost) = assign_and_cost(data, &medoids_in_original, &config.metric);

        // ── BARU: simpan record tiap sample ──
        sample_records.push(SampleRecord {
            sample_index: sample_idx + 1,          // 1-based
            sample_size,
            cost: total_cost,
            pam_iterations: pam_result.iterations, // pastikan PAMResult expose field ini
        });
        
        // Update best if this is better
        if total_cost < best_cost {
            best_cost = total_cost;
            best_medoids = medoids_in_original;
            best_sample_cost = pam_result.total_cost;
            best_sample_index = sample_idx + 1;    // ← BARU
        }
    }
    
    if best_medoids.is_empty() {
        return Err("CLARA failed to find valid clustering in any sample".to_string());
    }
    
    // Final assignment with best medoids
    let (assignments, total_cost) = assign_and_cost(data, &best_medoids, &config.metric);
    
    Ok(CLARAResult {
        medoids: best_medoids,
        assignments,
        total_cost,
        samples_tried: config.num_samples,
        best_sample_cost,
        samples: sample_records,        // ← BARU
        best_sample_index,              // ← BARU
    })
}

/// Draw a random sample of indices
fn draw_sample<R: rand::Rng>(n: usize, sample_size: usize, rng: &mut R) -> Vec<usize> {
    let mut indices: Vec<usize> = (0..n).collect();
    indices.shuffle(rng);
    indices.into_iter().take(sample_size).collect()
}

/// Assign all points to nearest medoid and calculate total cost
fn assign_and_cost(
    data: &[Vec<f64>],
    medoids: &[usize],
    metric: &DistanceMetric,
) -> (Vec<usize>, f64) {
    let mut assignments = vec![0; data.len()];
    let mut total_cost = 0.0;
    
    for (i, point) in data.iter().enumerate() {
        let mut min_dist = f64::INFINITY;
        let mut best_cluster = 0;
        
        for (cluster_idx, &medoid_idx) in medoids.iter().enumerate() {
            let dist = calculate_distance(point, &data[medoid_idx], metric);
            if dist < min_dist {
                min_dist = dist;
                best_cluster = cluster_idx;
            }
        }
        
        assignments[i] = best_cluster;
        total_cost += min_dist;
    }
    
    (assignments, total_cost)
}

/// Convert CLARAResult to ClusteringResult for compatibility
impl From<CLARAResult> for ClusteringResult {
    fn from(clara_result: CLARAResult) -> Self {
        ClusteringResult {
            cluster_assignments: clara_result.assignments,
            medoid_indices: clara_result.medoids,
            total_cost: clara_result.total_cost,
            iterations: clara_result.samples_tried,
            converged: true,
        }
    }
}