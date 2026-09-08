use std::collections::HashMap;

use crate::models::{result::StructureMatrix, AnalysisData, DiscriminantConfig};

use super::core::{
    calculate_canonical_functions, calculate_pooled_within_matrix_no_epsilon,
    extract_analyzed_dataset, EPSILON,
};

/// Calculate structure matrix for discriminant functions
///
/// This function calculates the pooled within-groups correlations between
/// each original variable and each discriminant function (structure loadings).
///
/// The structure loading formula (SPSS convention):
///   Loading(X_i, Z_m) = Cov(X_i, Z_m) / StdDev(X_i)
/// where:
///   Z_m = sum_k(b_k[m] * X_k)  — the m-th discriminant function
///   Cov(X_i, Z_m) = sum_k(S_pooled[i][k] * b_k[m])
///                 — row-i of pooled covariance matrix dot column-m of unstandardized coefs
///
/// # Parameters
/// * `data` - The analysis data
/// * `config` - The discriminant analysis configuration
///
/// # Returns
/// A StructureMatrix object with correlations between variables and functions
pub fn calculate_structure_matrix(
    data: &AnalysisData,
    config: &DiscriminantConfig,
) -> Result<StructureMatrix, String> {
    web_sys::console::log_1(&"Executing calculate_structure_matrix".into());

    // IMPORTANT: Filter out the grouping variable
    // SPSS menghitung Structure Matrix untuk SEMUA variabel kandidat
    let grouping_var = &config.main.grouping_variable;
    let all_variables: Vec<String> = config
        .main
        .independent_variables
        .iter()
        .filter(|v| *v != grouping_var)
        .cloned()
        .collect();

    if all_variables.is_empty() {
        return Err("No independent variables found after filtering grouping variable.".into());
    }

    let canonical_functions = calculate_canonical_functions(data, config)?;
    let num_functions = canonical_functions
        .coefficients
        .get("(Constant)")
        .map_or(0, |v| v.len());

    if num_functions == 0 {
        return Ok(StructureMatrix {
            variables: all_variables.clone(),
            correlations: HashMap::new(),
        });
    }

    let dataset = extract_analyzed_dataset(data, config)?;

    // --- STEP 1: Gunakan matriks kovarians yang SUDAH TERJAMIN BENAR dari core ---
    // Menggunakan DMatrix dari nalgebra sehingga hitungannya sangat presisi
    let s_pooled = calculate_pooled_within_matrix_no_epsilon(&dataset, &all_variables);
    let num_all_vars = all_variables.len();

    let mut correlations = HashMap::new();

    // --- STEP 2: Hitung Structure Loadings ---
    for i in 0..num_all_vars {
        // Standar deviasi variabel X_i (akar dari varians di diagonal matriks)
        let std_dev_i = s_pooled[(i, i)].sqrt();
        let mut var_correlations = Vec::with_capacity(num_functions);

        for m in 0..num_functions {
            let mut cov_xz = 0.0;

            // Hitung Cov(X_i, Z_m) menggunakan Unstandardized Coefficients (b)
            for (var_k_name, coefs) in &canonical_functions.coefficients {
                if var_k_name == "(Constant)" {
                    continue; // Abaikan konstanta
                }

                if let Some(k) = all_variables.iter().position(|v| v == var_k_name) {
                    if m < coefs.len() {
                        // S_pooled[i][k] * b_k[m]
                        cov_xz += s_pooled[(i, k)] * coefs[m];
                    }
                }
            }

            // Hitung Korelasi / Structure Loading
            // Rumus asli: Cov(X_i, Z_m) / (StdDev(X_i) * StdDev(Z_m))
            // Karena Eigenvector kita (Unstandardized Coefs) sudah di-scale dengan akar df,
            // maka varians Z_m (fungsi diskriminan) = 1.0, sehingga StdDev(Z_m) = 1.0!
            let loading = if std_dev_i > EPSILON {
                cov_xz / std_dev_i
            } else {
                0.0
            };

            var_correlations.push(loading);
        }

        correlations.insert(all_variables[i].clone(), var_correlations);
    }

    Ok(StructureMatrix {
        variables: all_variables,
        correlations,
    })
}
