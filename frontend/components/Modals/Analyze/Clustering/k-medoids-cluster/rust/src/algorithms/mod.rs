/// K-Medoids clustering algorithms module
/// 
/// This module contains implementations of various K-Medoids algorithms:
/// - PAM (Partitioning Around Medoids) - Classical algorithm
/// - CLARA (Clustering LARge Applications) - For large datasets
/// - CLARANS (Clustering Large Applications based on RANdomized Search) - For spatial data
/// - FastPAM - Optimized version (future)

pub mod pam;
pub mod clara;
pub mod clarans;

// Re-export main functions
pub use pam::{run_pam, run_pam_r_style, PAMConfig, PAMResult};
pub use clara::{run_clara, CLARAConfig, CLARAResult};
pub use clarans::{run_clarans, CLARANSConfig, CLARANSResult};
