/// CLARANS (Clustering Large Applications based on RANdomized Search)
/// 
/// Randomized search-based K-Medoids algorithm
/// 
/// Algorithm:
/// 1. Start with random set of medoids
/// 2. Randomly sample from neighbors (potential swaps)
/// 3. Use PAM cost differential logic (4 cases) for O(n) swap evaluation
/// 4. If better neighbor found, move to it
/// 5. Repeat for multiple local searches
/// 6. Return best result
/// 
/// Time Complexity: O(restarts * (n*k + max_neighbors * n))
/// Space Complexity: O(n²) for distance matrix
/// 
/// Advantages:
/// - More efficient than exhaustive PAM for large datasets
/// - Better exploration of solution space than PAM
/// - Good for spatial data
/// 
/// References:
/// - Ng, R.T. and Han, J. (1994)
///   "Efficient and Effective Clustering Methods for Spatial Data Mining"
/// - Ng, R.T. and Han, J. (2002)
///   "CLARANS: A Method for Clustering Objects for Spatial Data Mining"

use crate::algorithms::pam::build_distance_matrix;
use crate::models::ClusteringResult;
use crate::utils::distance::DistanceMetric;
use crate::utils::validation::validate_clustering_input;
use ndarray::Array2;
use rand::seq::SliceRandom;
use rand::Rng;
use rand::SeedableRng;

/// Configuration for CLARANS algorithm
#[derive(Debug, Clone)]
pub struct CLARANSConfig {
    /// Number of clusters (k)
    pub k: usize,
    
    /// Distance metric to use
    pub metric: DistanceMetric,
    
    /// Number of local searches to perform
    pub num_local: usize,
    
    /// Maximum number of neighbors to check per local search
    pub max_neighbors: usize,
    
    /// Random seed for reproducibility
    pub random_seed: Option<u64>,
}

impl Default for CLARANSConfig {
    fn default() -> Self {
        Self {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_local: 2,
            max_neighbors: 250, // Originally max(250, 1.25% of neighbors)
            random_seed: None,
        }
    }
}

impl CLARANSConfig {
    /// Create config with automatic max_neighbors calculation
    /// Uses max(250, 1.25% of total possible neighbors)
    pub fn new(k: usize, n: usize, metric: DistanceMetric) -> Self {
        let total_neighbors = k * (n - k); // Total possible swaps
        let auto_max_neighbors = 250.max((total_neighbors as f64 * 0.0125) as usize);
        
        Self {
            k,
            metric,
            num_local: 2,
            max_neighbors: auto_max_neighbors,
            random_seed: None,
        }
    }
}

/// Result from CLARANS clustering
#[derive(Debug, Clone)]
pub struct CLARANSResult {
    /// Medoid indices
    pub medoids: Vec<usize>,
    
    /// Cluster assignments (point index -> cluster index)
    pub assignments: Vec<usize>,
    
    /// Total cost (sum of distances to nearest medoid)
    pub total_cost: f64,
    
    /// Number of local searches performed
    pub local_searches: usize,
    
    /// Total number of neighbors checked across all searches
    pub neighbors_checked: usize,
}

/// Run CLARANS clustering algorithm
pub fn run_clarans(data: &[Vec<f64>], config: &CLARANSConfig) -> Result<CLARANSResult, String> {
    // Validate input
    validate_clustering_input(data, config.k)?;

    let n = data.len();
    let k = config.k;

    // k == n: every point is its own medoid; SWAP has no candidates → trivial.
    if k >= n {
        let medoids: Vec<usize> = (0..n).collect();
        let assignments: Vec<usize> = (0..n).collect();
        return Ok(CLARANSResult {
            medoids,
            assignments,
            total_cost: 0.0,
            local_searches: 0,
            neighbors_checked: 0,
        });
    }

    // Build distance matrix
    let dist: Array2<f64> = build_distance_matrix(data, &config.metric);

    // Initialize RNG
    let mut rng = if let Some(seed) = config.random_seed {
        rand::rngs::StdRng::seed_from_u64(seed)
    } else {
        rand::rngs::StdRng::from_entropy()
    };

    let mut min_cost = f64::INFINITY;
    let mut best_medoids: Vec<usize> = Vec::new();
    let mut total_neighbors_checked = 0;

    // Cache arrays for PAM optimization
    let mut nearest_indices = vec![0; n];
    let mut d_nearest = vec![0.0; n];
    let mut d_second = vec![0.0; n];

    // Step 1: Repeat num_local times
    for _local_idx in 0..config.num_local {
        // Step 2: Select k random medoids
        let mut current_medoids = random_initial_medoids(n, k, &mut rng);
        
        // Initial cost and cache update
        let mut current_cost = update_cache(&dist, &current_medoids, n, &mut nearest_indices, &mut d_nearest, &mut d_second);

        let mut j = 0;
        // Step 3-6: Search for better neighbor
        loop {
            if j >= config.max_neighbors {
                break; // Local minimum found
            }

            // Step 4: Pick a random neighbor (swap one medoid with one non-medoid)
            let om_idx = rng.gen_range(0..k);
            let op = loop {
                let candidate = rng.gen_range(0..n);
                if !current_medoids.contains(&candidate) {
                    break candidate;
                }
            };

            // Step 5: Calculate cost differential using PAM 4-cases logic (O(n))
            let delta = cost_differential_optimized(
                &dist,
                om_idx,
                op,
                n,
                &nearest_indices,
                &d_nearest,
                &d_second
            );

            total_neighbors_checked += 1;

            if delta < 0.0 {
                // Better neighbor found! Move to it.
                current_medoids[om_idx] = op;
                current_cost += delta;
                
                // Update cache for next neighbor checks
                update_cache(&dist, &current_medoids, n, &mut nearest_indices, &mut d_nearest, &mut d_second);
                
                j = 0; // Reset counter
            } else {
                j += 1;
            }
        }

        // Step 7: Compare local minimum with global best
        if current_cost < min_cost {
            min_cost = current_cost;
            best_medoids = current_medoids.clone();
        }
    }

    if best_medoids.is_empty() {
        return Err("CLARANS failed to find any valid clustering".to_string());
    }

    // Final assignments
    let final_assignments = assign_to_medoids(&dist, &best_medoids, n);

    Ok(CLARANSResult {
        medoids: best_medoids,
        assignments: final_assignments,
        total_cost: min_cost,
        local_searches: config.num_local,
        neighbors_checked: total_neighbors_checked,
    })
}

/// Update the nearest and second-nearest medoid information for each point (O(n*k))
fn update_cache(
    dist: &Array2<f64>,
    medoids: &[usize],
    n: usize,
    nearest_indices: &mut [usize],
    d_nearest: &mut [f64],
    d_second: &mut [f64],
) -> f64 {
    let mut total_cost = 0.0;
    for i in 0..n {
        let mut dn = f64::INFINITY;
        let mut ds = f64::INFINITY;
        let mut ni = 0;

        for (idx, &m) in medoids.iter().enumerate() {
            let d = dist[[i, m]];
            if d < dn {
                ds = dn;
                dn = d;
                ni = idx;
            } else if d < ds {
                ds = d;
            }
        }
        nearest_indices[i] = ni;
        d_nearest[i] = dn;
        d_second[i] = ds;
        total_cost += dn;
    }
    total_cost
}

/// Calculate cost change if medoids[om_idx] is replaced by op (O(n))
/// Based on PAM's 4 cases logic
fn cost_differential_optimized(
    dist: &Array2<f64>,
    om_idx: usize,
    op: usize,
    n: usize,
    nearest_indices: &[usize],
    d_nearest: &[f64],
    d_second: &[f64],
) -> f64 {
    let mut total_delta = 0.0;
    for j in 0..n {
        let dn = d_nearest[j];
        let ds = d_second[j];
        let dop = dist[[j, op]];

        if nearest_indices[j] == om_idx {
            // Cases 1 & 2: Point was assigned to the medoid being replaced
            if dop >= ds {
                // Case 1: Closest becomes the previous second-closest
                total_delta += ds - dn;
            } else {
                // Case 2: Closest becomes the new medoid Op
                total_delta += dop - dn;
            }
        } else {
            // Cases 3 & 4: Point was assigned to another medoid
            if dop < dn {
                // Case 4: New medoid Op is closer than current closest
                total_delta += dop - dn;
            }
            // Case 3: Current closest remains closest (delta = 0)
        }
    }
    total_delta
}

/// Random initial medoid selection
fn random_initial_medoids<R: Rng>(n: usize, k: usize, rng: &mut R) -> Vec<usize> {
    let mut indices: Vec<usize> = (0..n).collect();
    indices.shuffle(rng);
    indices.into_iter().take(k).collect()
}

/// Final assignment to nearest medoid
fn assign_to_medoids(dist: &Array2<f64>, medoids: &[usize], n: usize) -> Vec<usize> {
    (0..n)
        .map(|i| {
            medoids
                .iter()
                .enumerate()
                .min_by(|&(_, &a), &(_, &b)| {
                    dist[[i, a]]
                        .partial_cmp(&dist[[i, b]])
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .map(|(idx, _)| idx)
                .unwrap_or(0)
        })
        .collect()
}

/// Convert CLARANSResult to ClusteringResult for compatibility
impl From<CLARANSResult> for ClusteringResult {
    fn from(clarans_result: CLARANSResult) -> Self {
        ClusteringResult {
            cluster_assignments: clarans_result.assignments,
            medoid_indices: clarans_result.medoids,
            total_cost: clarans_result.total_cost,
            iterations: clarans_result.local_searches,
            converged: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_clarans_basic_clustering() {
        let data = vec![
            vec![0.0, 0.0],
            vec![1.0, 0.0],
            vec![0.0, 1.0],
            vec![10.0, 10.0],
            vec![11.0, 10.0],
            vec![10.0, 11.0],
        ];
        
        let config = CLARANSConfig {
            k: 2,
            metric: DistanceMetric::Euclidean,
            num_local: 2,
            max_neighbors: 10,
            random_seed: Some(42),
        };
        
        let result = run_clarans(&data, &config).unwrap();
        
        assert_eq!(result.medoids.len(), 2);
        assert_eq!(result.assignments.len(), 6);
        assert!(result.total_cost > 0.0);
        assert_eq!(result.local_searches, 2);
    }
    
    #[test]
    fn test_clarans_deterministic_with_seed() {
        let data = vec![
            vec![0.0, 0.0],
            vec![1.0, 1.0],
            vec![2.0, 2.0],
            vec![10.0, 10.0],
            vec![11.0, 11.0],
            vec![12.0, 12.0],
        ];
        
        let config = CLARANSConfig {
            k: 2,
            num_local: 2,
            max_neighbors: 10,
            random_seed: Some(123),
            ..Default::default()
        };
        
        let result1 = run_clarans(&data, &config).unwrap();
        let result2 = run_clarans(&data, &config).unwrap();
        
        assert_eq!(result1.medoids, result2.medoids);
        assert_eq!(result1.total_cost, result2.total_cost);
    }
}
