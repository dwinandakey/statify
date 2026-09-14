use crate::models::config::{AnalysisData, MultinomialConfig};
use crate::models::result::StepwiseStep;
use crate::stats::log_likelihood::calculate_ll;
use crate::stats::newton_raphson::{compute_score_and_information, run_newton_raphson_internal};
use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};

#[derive(Clone, Debug)]
struct EffectGroup {
    name: String,
    columns: Vec<usize>,
    mandatory: bool,
    is_factor: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum StepwiseMethod {
    Enter,
    ForwardLR,
    BackwardLR,
    StepwiseLR,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum SelectionTest {
    LikelihoodRatio,
    Score,
}

pub struct PrimaryResults {
    pub design_matrix: DMatrix<f64>,
    pub y_categories: Vec<f64>,
    pub category_map: Vec<f64>,
    pub reference_index: usize,
    pub n_cases: usize,
    pub n_params: usize,
    pub n_categories: usize,
    pub weights: Vec<f64>,
    pub variable_names: Vec<String>,
    pub stepwise_trace: Vec<StepwiseStep>,
}

fn parse_stepwise_method(config: &MultinomialConfig) -> StepwiseMethod {
    match config.stepwise_method.as_deref().unwrap_or("enter") {
        "forwardLR" => StepwiseMethod::ForwardLR,
        "backwardLR" => StepwiseMethod::BackwardLR,
        "stepwiseLR" => StepwiseMethod::StepwiseLR,
        _ => StepwiseMethod::Enter,
    }
}

fn parse_selection_test(value: Option<&String>) -> SelectionTest {
    match value.map(|v| v.as_str()) {
        Some("score") => SelectionTest::Score,
        _ => SelectionTest::LikelihoodRatio,
    }
}

fn parse_probability(value: Option<&String>, default: f64) -> f64 {
    value
        .and_then(|text| text.trim().parse::<f64>().ok())
        .filter(|prob| prob.is_finite() && *prob > 0.0 && *prob < 1.0)
        .unwrap_or(default)
}

fn parse_usize_limit(value: Option<&String>) -> Option<usize> {
    let text = value?.trim();
    if text.is_empty() {
        return None;
    }
    text.parse::<usize>().ok().filter(|v| *v > 0)
}

fn build_effect_groups(variable_names: &[String]) -> Vec<EffectGroup> {
    let mut groups: Vec<EffectGroup> = Vec::new();

    for (idx, raw_name) in variable_names.iter().enumerate() {
        let (name, mandatory) = if raw_name == "Intercept" {
            ("Intercept".to_string(), true)
        } else if let Some((base, _)) = raw_name.split_once('=') {
            (base.trim().to_string(), false)
        } else {
            (raw_name.trim().to_string(), false)
        };

        // Consider this group a "factor" if any of the originating variable names
        // contained an '=' (encoded factor levels like "Var=Level").
        let is_factor = raw_name.contains('=');

        if let Some(existing) = groups.iter_mut().find(|group| group.name == name) {
            existing.columns.push(idx);
            // once a factor flag is set for the group keep it
            existing.is_factor = existing.is_factor || is_factor;
        } else {
            groups.push(EffectGroup {
                name,
                columns: vec![idx],
                mandatory,
                is_factor,
            });
        }
    }

    groups
}

fn split_name_tokens(name: &str) -> Vec<String> {
    // Split on common non-word delimiters to extract component tokens (e.g., "A:B" -> ["A","B"]).
    name.split(|c: char| !c.is_alphanumeric() && c != '_')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn parents_of(group_name: &str, all_names: &[String]) -> Vec<String> {
    let tokens = split_name_tokens(group_name);
    // Any token that matches a group name is considered a parent candidate.
    all_names
        .iter()
        .filter(|other| {
            if other.as_str() == group_name {
                return false;
            }
            let other_tokens = split_name_tokens(other);
            if other_tokens.is_empty() {
                return false;
            }
            // A term other is a parent if all its component tokens are present in group_name
            other_tokens.iter().all(|ot| tokens.contains(ot))
        })
        .cloned()
        .collect()
}

fn build_matrix_from_columns(x: &DMatrix<f64>, columns: &[usize]) -> DMatrix<f64> {
    let mut elements = Vec::with_capacity(x.nrows() * columns.len());
    for row in 0..x.nrows() {
        for &col in columns {
            elements.push(x[(row, col)]);
        }
    }
    DMatrix::from_row_slice(x.nrows(), columns.len(), &elements)
}

fn build_primary_from_columns(
    base: &PrimaryResults,
    matrix: DMatrix<f64>,
    columns: &[usize],
) -> PrimaryResults {
    let variable_names = columns
        .iter()
        .filter_map(|idx| base.variable_names.get(*idx).cloned())
        .collect::<Vec<_>>();

    PrimaryResults {
        design_matrix: matrix,
        y_categories: base.y_categories.clone(),
        category_map: base.category_map.clone(),
        reference_index: base.reference_index,
        n_cases: base.n_cases,
        n_params: columns.len(),
        n_categories: base.n_categories,
        weights: base.weights.clone(),
        variable_names,
        stepwise_trace: base.stepwise_trace.clone(),
    }
}

fn fit_reduced_model(
    base_x: &DMatrix<f64>,
    base_primary: &PrimaryResults,
    config: &MultinomialConfig,
    columns: &[usize],
) -> Result<(DMatrix<f64>, PrimaryResults, DVector<f64>, f64), String> {
    if columns.is_empty() {
        return Err("Tidak ada kolom yang tersisa untuk difit.".to_string());
    }

    let reduced_x = build_matrix_from_columns(base_x, columns);
    let reduced_primary = build_primary_from_columns(base_primary, reduced_x.clone(), columns);
    let (beta, _, _, _) = run_newton_raphson_internal(&reduced_x, &reduced_primary, config)?;
    let ll = calculate_ll(
        &reduced_x,
        &beta,
        &reduced_primary.y_categories,
        &reduced_primary.category_map,
        &reduced_primary.weights,
        reduced_primary.reference_index,
        reduced_primary.n_params,
    );

    Ok((reduced_x, reduced_primary, beta, ll))
}

fn effect_test_statistic(
    base_x: &DMatrix<f64>,
    base_primary: &PrimaryResults,
    config: &MultinomialConfig,
    selected_columns: &[usize],
    effect_columns: &[usize],
    test: SelectionTest,
) -> Result<(f64, f64), String> {
    let mut full_columns = selected_columns.to_vec();
    for &column in effect_columns {
        if !full_columns.contains(&column) {
            full_columns.push(column);
        }
    }

    let (_, reduced_primary, reduced_beta, reduced_ll) =
        fit_reduced_model(base_x, base_primary, config, selected_columns)?;

    let full_x = build_matrix_from_columns(base_x, &full_columns);
    let full_primary = build_primary_from_columns(base_primary, full_x.clone(), &full_columns);
    let full_p = full_primary.n_params;
    let reduced_p = reduced_primary.n_params;
    let block_count = base_primary.n_categories.saturating_sub(1);
    let candidate_p = full_p.saturating_sub(reduced_p);

    if candidate_p == 0 {
        return Ok((0.0, 1.0));
    }

    match test {
        SelectionTest::LikelihoodRatio => {
            let (_, _, _, full_ll) =
                fit_reduced_model(base_x, base_primary, config, &full_columns)?;
            let stat = (2.0 * (full_ll - reduced_ll)).max(0.0);
            let df = (candidate_p * block_count) as f64;
            let p_value = if df > 0.0 {
                1.0 - ChiSquared::new(df)
                    .map_err(|_| "Gagal menghitung p-value LR.".to_string())?
                    .cdf(stat)
            } else {
                1.0
            };
            Ok((stat, p_value))
        }
        SelectionTest::Score => {
            let mut beta_full = DVector::zeros(block_count * full_p);
            for block in 0..block_count {
                let source_start = block * reduced_p;
                let target_start = block * full_p;
                for k in 0..reduced_p {
                    beta_full[target_start + k] = reduced_beta[source_start + k];
                }
            }

            let (gradient, information) =
                compute_score_and_information(&full_x, &full_primary, &beta_full);

            let mut nuisance_indices = Vec::with_capacity(block_count * reduced_p);
            let mut candidate_indices = Vec::with_capacity(block_count * candidate_p);
            for block in 0..block_count {
                let block_start = block * full_p;
                nuisance_indices.extend(block_start..block_start + reduced_p);
                candidate_indices.extend(block_start + reduced_p..block_start + full_p);
            }

            let u_candidate = extract_vector(&gradient, &candidate_indices);
            let i11 = extract_matrix(&information, &nuisance_indices, &nuisance_indices);
            let i12 = extract_matrix(&information, &nuisance_indices, &candidate_indices);
            let i21 = extract_matrix(&information, &candidate_indices, &nuisance_indices);
            let i22 = extract_matrix(&information, &candidate_indices, &candidate_indices);

            let i11_inv = i11
                .try_inverse()
                .ok_or_else(|| "Matriks informasi score singular.".to_string())?;
            let efficient_information = i22 - i21 * i11_inv * i12;
            let efficient_inv = efficient_information
                .try_inverse()
                .ok_or_else(|| "Matriks score efektif singular.".to_string())?;

            let stat = (u_candidate.transpose() * efficient_inv * u_candidate)[(0, 0)].max(0.0);
            let df = candidate_indices.len() as f64;
            let p_value = if df > 0.0 {
                1.0 - ChiSquared::new(df)
                    .map_err(|_| "Gagal menghitung p-value score.".to_string())?
                    .cdf(stat)
            } else {
                1.0
            };

            Ok((stat, p_value))
        }
    }
}

fn extract_vector(source: &DVector<f64>, indices: &[usize]) -> DVector<f64> {
    let mut values = Vec::with_capacity(indices.len());
    for &idx in indices {
        values.push(source[idx]);
    }
    DVector::from_vec(values)
}

fn extract_matrix(
    source: &DMatrix<f64>,
    row_indices: &[usize],
    col_indices: &[usize],
) -> DMatrix<f64> {
    let mut values = Vec::with_capacity(row_indices.len() * col_indices.len());
    for &row in row_indices {
        for &col in col_indices {
            values.push(source[(row, col)]);
        }
    }
    DMatrix::from_row_slice(row_indices.len(), col_indices.len(), &values)
}

fn select_effects(
    base_x: &DMatrix<f64>,
    base_primary: &PrimaryResults,
    config: &MultinomialConfig,
) -> Result<(Vec<usize>, Vec<StepwiseStep>), String> {
    let method = parse_stepwise_method(config);
    let constrain_hierarchy = config.constrain_hierarchy.unwrap_or(false);
    let hierarchy_mode = config
        .hierarchy_mode
        .as_deref()
        .unwrap_or("treat_covariates_like_factors");
    if method == StepwiseMethod::Enter {
        return Ok(((0..base_primary.n_params).collect(), Vec::new()));
    }

    let entry_test = parse_selection_test(config.stepwise_entry_test.as_ref());
    let removal_test = parse_selection_test(config.stepwise_removal_test.as_ref());
    let entry_probability = parse_probability(config.stepwise_entry_probability.as_ref(), 0.05);
    let removal_probability = parse_probability(config.stepwise_removal_probability.as_ref(), 0.10);
    let min_effects = parse_usize_limit(config.minimum_stepped_effects.as_ref()).unwrap_or(0);
    let max_effects =
        parse_usize_limit(config.maximum_stepped_effects.as_ref()).unwrap_or(usize::MAX);

    let effect_groups = build_effect_groups(&base_primary.variable_names);
    let mut selected_groups: Vec<EffectGroup> = match method {
        StepwiseMethod::BackwardLR => effect_groups.clone(),
        _ => effect_groups
            .iter()
            .filter(|group| group.mandatory)
            .cloned()
            .collect(),
    };
    let mut candidate_groups: Vec<EffectGroup> = match method {
        StepwiseMethod::BackwardLR => Vec::new(),
        _ => effect_groups
            .iter()
            .filter(|group| !group.mandatory)
            .cloned()
            .collect(),
    };

    let mut selected_columns = flatten_effects(&selected_groups);
    let mut stepwise_trace: Vec<StepwiseStep> = Vec::new();
    let mut step_number: u32 = 1;
    if selected_columns.is_empty() {
        if let Some(first_candidate) = candidate_groups.first().cloned() {
            selected_groups.push(first_candidate.clone());
            candidate_groups.remove(0);
            selected_columns = flatten_effects(&selected_groups);
            stepwise_trace.push(StepwiseStep {
                step: step_number,
                action: "Enter".to_string(),
                effect: first_candidate.name,
                test: "Initial model".to_string(),
                chi_square: 0.0,
                p_value: 1.0,
                selected_effects: selected_groups
                    .iter()
                    .map(|group| group.name.clone())
                    .collect(),
            });
            step_number += 1;
        } else {
            return Err("Tidak ada prediktor yang dapat dipilih.".to_string());
        }
    }

    let mut changed = true;
    while changed {
        changed = false;

        let non_mandatory_selected = selected_groups
            .iter()
            .filter(|group| !group.mandatory)
            .count();

        if matches!(
            method,
            StepwiseMethod::ForwardLR | StepwiseMethod::StepwiseLR
        ) && non_mandatory_selected < max_effects
            && !candidate_groups.is_empty()
        {
            let mut best_index: Option<usize> = None;
            let mut best_stat = f64::NEG_INFINITY;
            let mut best_p = 1.0;

            for (idx, candidate) in candidate_groups.iter().enumerate() {
                // If hierarchy constraint is active, ensure parent effects are present
                if constrain_hierarchy {
                    let all_names: Vec<String> =
                        effect_groups.iter().map(|g| g.name.clone()).collect();
                    let parents = parents_of(&candidate.name, &all_names);
                    // Depending on hierarchy_mode, decide which parents are required
                    let mut parents_required = parents.clone();
                    if hierarchy_mode == "consider_only_factorial_terms" {
                        parents_required = parents
                            .into_iter()
                            .filter(|p| {
                                effect_groups
                                    .iter()
                                    .find(|g| &g.name == p)
                                    .map(|g| g.is_factor)
                                    .unwrap_or(false)
                            })
                            .collect();
                    } else if hierarchy_mode == "within_covariate_effects" {
                        // If candidate contains any covariate token, require only factor parents
                        let is_candidate_factor = candidate.is_factor;
                        if !is_candidate_factor {
                            parents_required = parents
                                .into_iter()
                                .filter(|p| {
                                    effect_groups
                                        .iter()
                                        .find(|g| &g.name == p)
                                        .map(|g| g.is_factor)
                                        .unwrap_or(false)
                                })
                                .collect();
                        }
                    }

                    let mut all_present = true;
                    for parent_name in parents_required.iter() {
                        if !selected_groups.iter().any(|g| &g.name == parent_name) {
                            all_present = false;
                            break;
                        }
                    }
                    if !all_present {
                        continue;
                    }
                }
                let (stat, p_value) = effect_test_statistic(
                    base_x,
                    base_primary,
                    config,
                    &selected_columns,
                    &candidate.columns,
                    entry_test,
                )?;
                if p_value < best_p || (p_value == best_p && stat > best_stat) {
                    best_index = Some(idx);
                    best_stat = stat;
                    best_p = p_value;
                }
            }

            if let Some(index) = best_index {
                if best_p < entry_probability {
                    let candidate = candidate_groups.remove(index);
                    let effect_name = candidate.name.clone();
                    selected_groups.push(candidate);
                    selected_columns = flatten_effects(&selected_groups);
                    stepwise_trace.push(StepwiseStep {
                        step: step_number,
                        action: "Enter".to_string(),
                        effect: effect_name,
                        test: match entry_test {
                            SelectionTest::LikelihoodRatio => "Likelihood ratio".to_string(),
                            SelectionTest::Score => "Score".to_string(),
                        },
                        chi_square: best_stat,
                        p_value: best_p,
                        selected_effects: selected_groups
                            .iter()
                            .map(|group| group.name.clone())
                            .collect(),
                    });
                    step_number += 1;
                    changed = true;
                }
            }
        }

        let non_mandatory_selected = selected_groups
            .iter()
            .filter(|group| !group.mandatory)
            .count();
        if matches!(
            method,
            StepwiseMethod::BackwardLR | StepwiseMethod::StepwiseLR
        ) && non_mandatory_selected > min_effects
        {
            let mut worst_index: Option<usize> = None;
            let mut worst_stat = f64::NEG_INFINITY;
            let mut worst_p = f64::NEG_INFINITY;

            for (idx, selected) in selected_groups.iter().enumerate() {
                if selected.mandatory {
                    continue;
                }

                let reduced_columns = flatten_effects_without(&selected_groups, idx);
                let (stat, p_value) = effect_test_statistic(
                    base_x,
                    base_primary,
                    config,
                    &reduced_columns,
                    &selected.columns,
                    removal_test,
                )?;

                if p_value > worst_p || (p_value == worst_p && stat > worst_stat) {
                    worst_index = Some(idx);
                    worst_stat = stat;
                    worst_p = p_value;
                }
            }

            if let Some(index) = worst_index {
                if worst_p > removal_probability {
                    let removed = selected_groups.remove(index);
                    let removed_name = removed.name.clone();
                    if matches!(method, StepwiseMethod::StepwiseLR)
                        && !candidate_groups
                            .iter()
                            .any(|group| group.name == removed.name)
                    {
                        candidate_groups.push(removed);
                        candidate_groups.sort_by(|a, b| a.name.cmp(&b.name));
                    }
                    selected_columns = flatten_effects(&selected_groups);
                    stepwise_trace.push(StepwiseStep {
                        step: step_number,
                        action: "Remove".to_string(),
                        effect: removed_name,
                        test: match removal_test {
                            SelectionTest::LikelihoodRatio => "Likelihood ratio".to_string(),
                            SelectionTest::Score => "Score".to_string(),
                        },
                        chi_square: worst_stat,
                        p_value: worst_p,
                        selected_effects: selected_groups
                            .iter()
                            .map(|group| group.name.clone())
                            .collect(),
                    });
                    step_number += 1;
                    changed = true;
                }
            }
        }
    }

    if selected_columns.is_empty() {
        return Err("Stepwise selection menghasilkan model kosong.".to_string());
    }

    Ok((selected_columns, stepwise_trace))
}

fn flatten_effects(groups: &[EffectGroup]) -> Vec<usize> {
    let mut columns = Vec::new();
    for group in groups {
        for &column in &group.columns {
            if !columns.contains(&column) {
                columns.push(column);
            }
        }
    }
    columns.sort_unstable();
    columns
}

fn flatten_effects_without(groups: &[EffectGroup], excluded_index: usize) -> Vec<usize> {
    let mut columns = Vec::new();
    for (idx, group) in groups.iter().enumerate() {
        if idx == excluded_index {
            continue;
        }
        for &column in &group.columns {
            if !columns.contains(&column) {
                columns.push(column);
            }
        }
    }
    columns.sort_unstable();
    columns
}

pub fn perform_primary_calculation(
    data: &AnalysisData,
    config: &MultinomialConfig,
) -> Result<PrimaryResults, String> {
    let mut unique_cats: Vec<f64> = data.dependent.clone();
    unique_cats.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    unique_cats.dedup_by(|a, b| (*a - *b).abs() < f64::EPSILON);

    let j_count = unique_cats.len();
    if j_count < 2 {
        return Err("Variabel dependen harus memiliki minimal 2 kategori.".to_string());
    }

    let ref_idx = match config.reference_category.as_str() {
        "first" => 0,
        "last" => j_count - 1,
        value => unique_cats
            .iter()
            .position(|&c| c == value.parse::<f64>().unwrap_or(unique_cats[j_count - 1]))
            .unwrap_or(j_count - 1),
    };

    let n_rows = data.dependent.len();
    let n_vars = data.independent.len();
    let mut x_elements = Vec::new();

    for i in 0..n_rows {
        if config.include_intercept {
            x_elements.push(1.0);
        }
        for j in 0..n_vars {
            x_elements.push(data.independent[j][i]);
        }
    }

    let n_cols_x = if config.include_intercept {
        n_vars + 1
    } else {
        n_vars
    };
    let x_matrix = DMatrix::from_row_slice(n_rows, n_cols_x, &x_elements);
    let weights = data.weights.clone().unwrap_or_else(|| vec![1.0; n_rows]);

    let mut var_names = Vec::new();
    if config.include_intercept {
        var_names.push("Intercept".to_string());
    }

    if let Some(ref names) = data.variable_names {
        var_names.extend_from_slice(names);
    } else {
        for i in 0..n_vars {
            var_names.push(format!("X{}", i + 1));
        }
    }

    let base_primary = PrimaryResults {
        design_matrix: x_matrix,
        y_categories: data.dependent.clone(),
        category_map: unique_cats.clone(),
        reference_index: ref_idx,
        n_cases: n_rows,
        n_params: n_cols_x,
        n_categories: j_count,
        weights: weights.clone(),
        variable_names: var_names,
        stepwise_trace: Vec::new(),
    };

    let (selected_columns, stepwise_trace) =
        select_effects(&base_primary.design_matrix, &base_primary, config)?;
    let selected_matrix = build_matrix_from_columns(&base_primary.design_matrix, &selected_columns);
    let mut selected_primary =
        build_primary_from_columns(&base_primary, selected_matrix, &selected_columns);
    selected_primary.stepwise_trace = stepwise_trace;

    Ok(selected_primary)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_name_tokens_simple() {
        assert_eq!(
            split_name_tokens("A:B"),
            vec!["A".to_string(), "B".to_string()]
        );
        assert_eq!(
            split_name_tokens("Var_C.D"),
            vec!["Var_C".to_string(), "D".to_string()]
        );
        assert_eq!(split_name_tokens("Single"), vec!["Single".to_string()]);
        assert_eq!(
            split_name_tokens("A-B_C"),
            vec!["A".to_string(), "B_C".to_string()]
        );
    }

    #[test]
    fn test_parents_of_basic() {
        let all = vec![
            "A".to_string(),
            "B".to_string(),
            "A:B".to_string(),
            "C".to_string(),
            "D:E".to_string(),
        ];

        let parents = parents_of("A:B", &all);
        // parents_of may return in any order; check contains
        assert!(parents.contains(&"A".to_string()));
        assert!(parents.contains(&"B".to_string()));
        // should not include unrelated
        assert!(!parents.contains(&"C".to_string()));
    }

    #[test]
    fn test_build_effect_groups_is_factor() {
        let names = vec![
            "Intercept".to_string(),
            "X=1".to_string(),
            "X=2".to_string(),
            "Y".to_string(),
            "Z=cat".to_string(),
        ];

        let groups = build_effect_groups(&names);
        // Find X group
        let x_group = groups.iter().find(|g| g.name == "X").expect("X group");
        assert!(x_group.is_factor, "X should be detected as factor");
        // columns should include the two X columns (indexes 1 and 2)
        assert!(x_group.columns.contains(&1));
        assert!(x_group.columns.contains(&2));

        let y_group = groups.iter().find(|g| g.name == "Y").expect("Y group");
        assert!(!y_group.is_factor, "Y should not be a factor");
    }
}
