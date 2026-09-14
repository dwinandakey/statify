use nalgebra::DMatrix;

use crate::models::{
    config::ExtractionStatus,
    result::ExtractionResult,
};

pub fn detect_singular_matrix(matrix: &DMatrix<f64>) -> bool {
    matrix.clone().try_inverse().is_none()
}

pub fn detect_heywood(communalities: &[f64]) -> bool {
    communalities.iter().any(|&x| x >= 0.999)
}

pub fn detect_improper_solution(communalities: &[f64]) -> bool {
    communalities.iter().any(|&x| x.is_nan() || x < 0.0 || x > 1.05)
}

pub fn detect_no_local_minimum(
    converged: bool,
    iterations_used: usize,
    max_iter: usize
) -> bool {
    !converged && iterations_used >= max_iter
}

pub fn assign_extraction_status(
    result: &mut ExtractionResult,
    singular_matrix: bool,
    converged: bool,
    improper_solution: bool,
) {
    // 1. Singular matrix = Fatal Error
    if singular_matrix {
        result.extraction_status = ExtractionStatus::SingularMatrix;
        result.warning_message = Some("Correlation matrix is singular.".to_string());
        return;
    }

    // 2. Improper solution (NaN/Infinite di matriks) = Fatal Error
    if improper_solution {
        result.extraction_status = ExtractionStatus::ImproperSolution;
        result.warning_message = Some("Improper factor solution detected. Matrix contains NaN or Infinite values.".to_string());
        return;
    }

    // 3. Non-convergence / No Local Minimum = Fatal Error
    // INI HARUS DICEK SEBELUM HEYWOOD CASE!
    if !converged {
        if result.n_factors > 0 && result.loadings.nrows() > 0 {
            result.extraction_status = ExtractionStatus::NoLocalMinimum;
            result.warning_message = Some("No local minimum was found. Extraction was terminated.".to_string());
        } else {
            result.extraction_status = ExtractionStatus::NonConvergence;
            result.warning_message = Some("Extraction failed to converge within iteration limit.".to_string());
        }
        return;
    }

    // 4. Heywood case (Communality >= 1.0) = Warning Only
    if result.has_heywood_case {
        result.extraction_status = ExtractionStatus::HeywoodWarning;
        // Menggunakan string yang sama persis dengan SPSS (termasuk typo "communalitiy" dari SPSS)
        result.warning_message = Some("One or more communalitiy estimates greater than 1 were encountered during iterations. The resulting solution should be interpreted with caution.".to_string());
        return;
    }

    // 5. Success
    result.extraction_status = ExtractionStatus::Success;
    result.warning_message = None;
}