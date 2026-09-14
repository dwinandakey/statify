use nalgebra::{DMatrix, DVector};
use std::collections::{BTreeMap, HashMap};
use std::error::Error;

use crate::models::config::{
    CategoricalVarConfig, ContrastMethod, LogisticConfig, ReferenceCategory,
};
use crate::models::result::{CategoricalCoding, FrequencyCount};

/// Represents a logical variable group in the design matrix.
/// For numeric variables: one group with one column.
/// For categorical variables with k categories: one group with k-1 columns.
#[derive(Debug, Clone)]
pub struct VariableGroup {
    pub name: String,               // Original variable name (e.g., "ChestPain")
    pub column_indices: Vec<usize>, // Indices into the design matrix columns
    pub is_categorical: bool,
}

pub struct DesignMatrixResult {
    pub matrix: DMatrix<f64>,
    pub feature_names: Vec<String>,
    pub codings: Vec<CategoricalCoding>,
    pub variable_groups: Vec<VariableGroup>,
}

/// Helper: Generate Polynomial Contrasts using Gram-Schmidt Orthogonalization
/// Ini menghasilkan angka yang sangat presisi dan ortogonal, sesuai standar SPSS.
fn generate_polynomial_contrasts(n_categories: usize) -> Vec<Vec<f64>> {
    let k = n_categories;
    let n_dummies = k - 1;

    // 1. Basis vectors (Linear=x, Quad=x^2...)
    let x_vals: Vec<f64> = (0..k).map(|i| i as f64).collect();

    let mut raw_vectors: Vec<Vec<f64>> = Vec::new();
    for p in 0..=n_dummies {
        let vec: Vec<f64> = x_vals.iter().map(|&x| x.powi(p as i32)).collect();
        raw_vectors.push(vec);
    }

    // 2. Gram-Schmidt
    let mut ortho_vectors: Vec<Vec<f64>> = Vec::new();
    let mut basis: Vec<Vec<f64>> = Vec::new();

    for p in 0..=n_dummies {
        let mut v = raw_vectors[p].clone();

        // Subtract projections
        for prev_vec in &basis {
            let dot_prod: f64 = v.iter().zip(prev_vec).map(|(a, b)| a * b).sum();
            let prev_sq_sum: f64 = prev_vec.iter().map(|a| a * a).sum();

            if prev_sq_sum > 1e-9 {
                let coef = dot_prod / prev_sq_sum;
                for i in 0..k {
                    v[i] -= coef * prev_vec[i];
                }
            }
        }
        basis.push(v);
    }

    // 3. Normalize (Euclidean Norm)
    // Kita skip index 0 (Constant)
    for p in 1..=n_dummies {
        let mut v = basis[p].clone();

        let sq_sum: f64 = v.iter().map(|x| x * x).sum();
        let norm_factor = sq_sum.sqrt();

        if norm_factor > 1e-9 {
            for val in &mut v {
                *val /= norm_factor;
            }
        }
        ortho_vectors.push(v);
    }

    ortho_vectors
}

pub fn build(
    x_raw: &DMatrix<f64>,
    feature_names: &[String],
    config: &LogisticConfig,
) -> Result<DesignMatrixResult, Box<dyn Error>> {
    let n_rows = x_raw.nrows();
    let n_cols = x_raw.ncols();

    let mut final_columns: Vec<DVector<f64>> = Vec::new();
    let mut final_names: Vec<String> = Vec::new();
    let mut codings_report: Vec<CategoricalCoding> = Vec::new();
    let mut variable_groups: Vec<VariableGroup> = Vec::new();

    let cat_map: HashMap<usize, &CategoricalVarConfig> = config
        .categorical_variables
        .iter()
        .map(|c| (c.column_index, c))
        .collect();

    for col_idx in 0..n_cols {
        let col_data = x_raw.column(col_idx).into_owned();
        let col_name = if col_idx < feature_names.len() {
            feature_names[col_idx].clone()
        } else {
            format!("Var_{}", col_idx)
        };

        if let Some(cat_config) = cat_map.get(&col_idx) {
            // === 1. Identifikasi & Sort ===
            let mut frequency_map: BTreeMap<String, usize> = BTreeMap::new();
            for val in col_data.iter() {
                let key = val.to_string();
                *frequency_map.entry(key).or_insert(0) += 1;
            }

            let mut categories: Vec<String> = frequency_map.keys().cloned().collect();
            categories.sort_by(|a, b| {
                let na = a.parse::<f64>();
                let nb = b.parse::<f64>();
                match (na, nb) {
                    (Ok(val_a), Ok(val_b)) => val_a
                        .partial_cmp(&val_b)
                        .unwrap_or(std::cmp::Ordering::Equal),
                    _ => a.cmp(b),
                }
            });

            let n_categories = categories.len();

            if n_categories < 2 {
                final_columns.push(col_data);
                final_names.push(col_name);
                continue;
            }

            // === 2. Setup Parameter ===
            let n_dummies = n_categories - 1;
            let mut dummy_columns: Vec<Vec<f64>> = vec![vec![0.0; n_rows]; n_dummies];
            let mut dummy_names: Vec<String> = Vec::new();
            let mut param_codings: HashMap<usize, Vec<f64>> = HashMap::new();

            let ref_idx = match cat_config.reference {
                ReferenceCategory::First => 0,
                ReferenceCategory::Last => n_categories - 1,
            };
            let method = &cat_config.method;

            // Pre-calculate Polynomial Vectors
            let poly_vectors = if *method == ContrastMethod::Polynomial {
                Some(generate_polynomial_contrasts(n_categories))
            } else {
                None
            };

            // === 3. GENERATE KODE KONTRAS ===
            for (cat_i, _cat_label) in categories.iter().enumerate() {
                let mut codes = vec![0.0; n_dummies];

                match method {
                    // INDICATOR: Ref=0, Target=1
                    ContrastMethod::Indicator => {
                        if cat_i != ref_idx {
                            let col_idx = if ref_idx == 0 { cat_i - 1 } else { cat_i };
                            if col_idx < n_dummies {
                                codes[col_idx] = 1.0;
                            }
                        }
                    }

                    // SIMPLE: Target = (k-1)/k, Others = -1/k
                    ContrastMethod::Simple => {
                        let k = n_categories as f64;
                        // Tentukan index dummy mana yang mewakili kategori ini
                        // Jika Ref=First(0), maka Cat 1 -> Dummy 0.
                        // Jika Ref=Last, maka Cat 0 -> Dummy 0.
                        let my_dummy_idx = if ref_idx == 0 {
                            if cat_i == 0 {
                                None
                            } else {
                                Some(cat_i - 1)
                            }
                        } else {
                            if cat_i == n_categories - 1 {
                                None
                            } else {
                                Some(cat_i)
                            }
                        };

                        for j in 0..n_dummies {
                            match my_dummy_idx {
                                Some(idx) if idx == j => {
                                    // Ini adalah kategori Target untuk kolom ini
                                    codes[j] = (k - 1.0) / k;
                                }
                                _ => {
                                    // Kategori lain (termasuk Reference)
                                    codes[j] = -1.0 / k;
                                }
                            }
                        }
                    }

                    // DEVIATION: Ref=-1, Target=1
                    ContrastMethod::Deviation => {
                        if cat_i == ref_idx {
                            codes = vec![-1.0; n_dummies];
                        } else {
                            let col_idx = if ref_idx == 0 { cat_i - 1 } else { cat_i };
                            if col_idx < n_dummies {
                                codes[col_idx] = 1.0;
                            }
                        }
                    }

                    // DIFFERENCE (Reverse Helmert)
                    ContrastMethod::Difference => {
                        for j in 0..n_dummies {
                            let target_level = j + 1;
                            if cat_i == target_level {
                                let n_prev = target_level as f64;
                                codes[j] = n_prev / (n_prev + 1.0);
                            } else if cat_i < target_level {
                                let n_prev = target_level as f64;
                                codes[j] = -1.0 / (n_prev + 1.0);
                            } else {
                                codes[j] = 0.0;
                            }
                        }
                    }

                    // HELMERT
                    ContrastMethod::Helmert => {
                        for j in 0..n_dummies {
                            let current_level = j;
                            if cat_i == current_level {
                                let n_remaining = (n_categories - 1 - j) as f64;
                                codes[j] = n_remaining / (n_remaining + 1.0);
                            } else if cat_i > current_level {
                                let n_remaining = (n_categories - 1 - j) as f64;
                                codes[j] = -1.0 / (n_remaining + 1.0);
                            } else {
                                codes[j] = 0.0;
                            }
                        }
                    }

                    // REPEATED: SPSS Matrix Standard
                    ContrastMethod::Repeated => {
                        let k = n_categories as f64;
                        for j in 0..n_dummies {
                            let col_idx_1based = (j + 1) as f64;
                            if (cat_i as f64) < col_idx_1based {
                                codes[j] = (k - col_idx_1based) / k;
                            } else {
                                codes[j] = -(col_idx_1based) / k;
                            }
                        }
                    }

                    // POLYNOMIAL (Orthogonal)
                    ContrastMethod::Polynomial => {
                        if let Some(vecs) = &poly_vectors {
                            for j in 0..n_dummies {
                                if j < vecs.len() {
                                    codes[j] = vecs[j][cat_i];
                                }
                            }
                        }
                    }
                }
                param_codings.insert(cat_i, codes);
            }

            // === 4. Set Nama Kolom Dummy ===
            // SPSS Convention: Gunakan indeks parameter 1-indexed, bukan nilai kategori.
            // Contoh: sex dengan 2 kategori (Female, Male) dan reference=Last (Male)
            // -> 1 dummy column dengan nama sex(1), bukan sex(0) atau sex(Female)
            // Ini merujuk ke "Parameter coding column (1)" di tabel Categorical Variables Codings
            for j in 0..n_dummies {
                let name = match method {
                    ContrastMethod::Indicator
                    | ContrastMethod::Simple
                    | ContrastMethod::Deviation => {
                        // SPSS uses 1-indexed parameter column number: (1), (2), etc.
                        // NOT the category value or label
                        format!("{}({})", col_name, j + 1)
                    }
                    ContrastMethod::Difference => {
                        // SPSS: Difference contrast juga menggunakan indeks 1-indexed
                        format!("{}({})", col_name, j + 1)
                    }
                    ContrastMethod::Helmert => {
                        // SPSS: Helmert contrast juga menggunakan indeks 1-indexed
                        format!("{}({})", col_name, j + 1)
                    }
                    ContrastMethod::Repeated => {
                        // SPSS: Repeated contrast juga menggunakan indeks 1-indexed
                        format!("{}({})", col_name, j + 1)
                    }
                    ContrastMethod::Polynomial => {
                        let types = vec!["Linear", "Quadratic", "Cubic", "4th", "5th"];
                        let type_label = if j < types.len() { types[j] } else { "Poly" };
                        format!("{}({})", col_name, type_label)
                    }
                };
                dummy_names.push(name);
            }

            // === 5. Isi Matrix ===
            for (row_i, &val) in col_data.iter().enumerate() {
                let key = val.to_string();
                if let Some(cat_idx) = categories.iter().position(|c| c == &key) {
                    if let Some(codes) = param_codings.get(&cat_idx) {
                        for (d_idx, &code_val) in codes.iter().enumerate() {
                            if d_idx < dummy_columns.len() {
                                dummy_columns[d_idx][row_i] = code_val;
                            }
                        }
                    }
                }
            }

            // === 6. Finalisasi Output ===
            let group_start_idx = final_columns.len();
            for (d_vec, d_name) in dummy_columns.into_iter().zip(dummy_names.into_iter()) {
                final_columns.push(DVector::from_vec(d_vec));
                final_names.push(d_name);
            }
            let group_end_idx = final_columns.len();

            // Build variable group for this categorical variable
            variable_groups.push(VariableGroup {
                name: col_name.clone(),
                column_indices: (group_start_idx..group_end_idx).collect(),
                is_categorical: true,
            });

            let mut category_counts: Vec<FrequencyCount> = Vec::new();
            for (i, cat_label) in categories.iter().enumerate() {
                let freq = *frequency_map.get(cat_label).unwrap_or(&0);
                let codes = param_codings.get(&i).cloned().unwrap_or_default();

                category_counts.push(FrequencyCount {
                    category_label: cat_label.clone(),
                    frequency: freq,
                    parameter_codings: codes,
                });
            }

            codings_report.push(CategoricalCoding {
                variable_label: col_name,
                categories: category_counts,
            });
        } else {
            // Numeric — single column group
            let col_idx_in_final = final_columns.len();
            final_columns.push(col_data);
            final_names.push(col_name.clone());
            variable_groups.push(VariableGroup {
                name: col_name,
                column_indices: vec![col_idx_in_final],
                is_categorical: false,
            });
        }
    }

    if final_columns.is_empty() {
        return Err("No columns generated for design matrix".into());
    }

    let result_matrix = DMatrix::from_columns(&final_columns);

    Ok(DesignMatrixResult {
        matrix: result_matrix,
        feature_names: final_names,
        codings: codings_report,
        variable_groups,
    })
}
