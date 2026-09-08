use wasm_bindgen::JsValue;
use serde::Serialize;

use crate::models::result::{
    DiscriminantResult,
    ProcessingSummary,
    EqualityTests,
    BoxMTest,
    LogDeterminants,
    EigenDescription,
    WilksLambdaTest,
    VariableInAnalysis,
    PairwiseComparison,
    HighestGroupStatistics,
    GroupHistogram,
    ScoreValue,
};

// Konversi dari String error ke JsValue untuk interaksi WASM
pub fn string_to_js_error(error: String) -> JsValue {
    JsValue::from_str(&error)
}

pub fn format_result(result: &Option<DiscriminantResult>) -> Result<JsValue, JsValue> {
    match result {
        Some(result) => {
            let formatted = FormatResult::from_analysis_result(result);
            Ok(serde_wasm_bindgen::to_value(&formatted).unwrap())
        }
        None => Err(JsValue::from_str("No discriminant analysis results available")),
    }
}

#[derive(Serialize)]
struct FormatResult {
    processing_summary: Option<ProcessingSummary>,
    group_statistics: Option<FormattedGroupStatistics>,
    equality_tests: Option<EqualityTests>,
    canonical_functions: Option<FormattedCanonicalFunctions>,
    structure_matrix: Option<FormattedStructureMatrix>,
    classification_results: Option<FormattedClassificationResults>,
    box_m_test: Option<BoxMTest>,
    pooled_matrices: Option<FormattedPooledMatrices>,
    covariance_matrices: Option<FormattedCovarianceMatrices>,
    log_determinants: Option<LogDeterminants>,
    eigen_description: Option<EigenDescription>,
    stepwise_statistics: Option<FormattedStepwiseStatistics>,
    wilks_lambda_test: Option<WilksLambdaTest>,
    casewise_statistics: Option<FormattedCasewiseStatistics>,
    prior_probabilities: Option<FormattedPriorProbabilities>,
    classification_function_coefficients: Option<FormattedClassificationFunctionCoefficients>,
    discriminant_histograms: Option<FormattedDiscriminantHistograms>,
    scatter_data: Option<FormattedScatterData>,
    bootstrap_results: Option<crate::models::result::BootstrapResults>,
    // Already display-shaped (Vec-based), so passed straight through.
    assumption_results: Option<crate::models::result::AssumptionResults>,
    territorial_map: bool,
}

#[derive(Serialize)]
struct FormattedScatterData {
    actual_group: Vec<String>,
    discriminant_scores: Vec<ScoreValue>,
}

#[derive(Serialize)]
struct FormattedGroupStatistics {
    groups: Vec<String>,
    variables: Vec<String>,
    means: Vec<GroupValue>,
    std_deviations: Vec<GroupValue>,
    unweighted_n: Vec<GroupValue>,
    weighted_n: Vec<GroupValue>,
}

#[derive(Serialize)]
struct GroupValue {
    variable: String,
    values: Vec<f64>,
}

#[derive(Serialize)]
struct FormattedCanonicalFunctions {
    coefficients: Vec<FunctionValue>,
    standardized_coefficients: Vec<FunctionValue>,
    function_at_centroids: Vec<GroupCentroid>,
}

#[derive(Serialize)]
struct FunctionValue {
    variable: String,
    values: Vec<f64>,
}

#[derive(Serialize)]
struct GroupCentroid {
    group: String,
    values: Vec<f64>,
}

#[derive(Serialize)]
struct FormattedStructureMatrix {
    variables: Vec<String>,
    correlations: Vec<FunctionValue>,
}

#[derive(Serialize)]
struct FormattedClassificationResults {
    original_classification: Vec<GroupClassification>,
    cross_validated_classification: Option<Vec<GroupClassification>>,
    original_percentage: Vec<GroupPercentage>,
    cross_validated_percentage: Option<Vec<GroupPercentage>>,
}

#[derive(Serialize)]
struct GroupClassification {
    group: String,
    counts: Vec<i32>,
}

#[derive(Serialize)]
struct GroupPercentage {
    group: String,
    percentages: Vec<f64>,
}

#[derive(Serialize)]
struct FormattedPooledMatrices {
    variables: Vec<String>,
    covariance: Vec<MatrixEntry>,
    correlation: Vec<MatrixEntry>,
}

#[derive(Serialize)]
struct MatrixEntry {
    variable: String,
    values: Vec<ValueEntry>,
}

#[derive(Serialize)]
struct ValueEntry {
    variable: String,
    value: f64,
}

#[derive(Serialize)]
struct FormattedCovarianceMatrices {
    groups: Vec<String>,
    variables: Vec<String>,
    matrices: Vec<GroupMatrixEntry>,
    note_df: String,
}

#[derive(Serialize)]
struct GroupMatrixEntry {
    group: String,
    matrix: Vec<MatrixEntry>,
}

#[derive(Serialize)]
struct FormattedStepwiseStatistics {
    method: String,
    num_groups: usize,
    variables_entered: Vec<String>,
    variables_removed: Vec<Option<String>>,
    min_d_squared: Vec<f64>,
    between_groups: Vec<String>,
    wilks_lambda: Vec<f64>,
    f_to_enter: Vec<f64>,
    f_to_enter_df1: Vec<i32>,
    f_to_enter_df2: Vec<i32>,
    significance: Vec<f64>,
    wilks_exact_f: Vec<f64>,
    wilks_exact_df1: Vec<i32>,
    wilks_exact_df2: Vec<i32>,
    wilks_exact_sig: Vec<f64>,
    raos_v: Vec<f64>,
    raos_v_sig: Vec<f64>,
    change_in_v: Vec<f64>,
    change_sig: Vec<f64>,
    variables_in_analysis: Vec<StepVariables>,
    variables_not_in_analysis: Vec<StepVariables>,
    pairwise_comparisons: Vec<GroupPairComparison>,
}

#[derive(Serialize)]
struct StepVariables {
    step: String,
    variables: Vec<VariableInAnalysis>,
}

#[derive(Serialize)]
struct GroupPairComparison {
    step: String,
    group1: String,
    group2: String,
    comparisons: Vec<PairwiseComparison>,
}

#[derive(Serialize)]
struct FormattedCasewiseStatistics {
    case_number: Vec<usize>,
    actual_group: Vec<String>,
    predicted_group: Vec<String>,
    highest_group: HighestGroupStatistics,
    second_highest_group: HighestGroupStatistics,
    discriminant_scores: Vec<ScoreValue>,
    cross_validated: Option<FormattedCrossValidatedCasewiseStatistics>,
}

#[derive(Serialize)]
struct FormattedCrossValidatedCasewiseStatistics {
    case_number: Vec<usize>,
    actual_group: Vec<String>,
    predicted_group: Vec<String>,
    highest_group: HighestGroupStatistics,
    second_highest_group: HighestGroupStatistics,
    discriminant_scores: Option<Vec<ScoreValue>>,
}

#[derive(Serialize)]
struct FormattedPriorProbabilities {
    groups: Vec<String>,
    prior_probabilities: Vec<f64>,
    cases_used: Vec<GroupCases>,
    total: f64,
}

#[derive(Serialize)]
struct GroupCases {
    case_type: String,
    counts: Vec<usize>,
}

#[derive(Serialize)]
struct FormattedClassificationFunctionCoefficients {
    groups: Vec<usize>,
    variables: Vec<String>,
    coefficients: Vec<GroupCoefficient>,
    constant_terms: Vec<f64>,
}

#[derive(Serialize)]
struct GroupCoefficient {
    variable: String,
    values: Vec<f64>,
}

#[derive(Serialize)]
struct FormattedDiscriminantHistograms {
    functions: Vec<String>,
    groups: Vec<String>,
    histograms: Vec<HistogramEntry>,
}

#[derive(Serialize)]
struct HistogramEntry {
    function: String,
    group: String,
    histogram: GroupHistogram,
}

impl FormatResult {
    fn from_analysis_result(result: &DiscriminantResult) -> Self {
        // Transform GroupStatistics
        let group_statistics = result.group_statistics.as_ref().map(|stats| {
            // Debug: log raw stats to see if unweighted_n/weighted_n are populated
            web_sys::console::log_1(&format!("Raw GroupStatistics - groups: {:?}", stats.groups).into());
            web_sys::console::log_1(&format!("Raw GroupStatistics - variables: {:?}", stats.variables).into());
            web_sys::console::log_1(&format!("Raw GroupStatistics - unweighted_n keys: {:?}", stats.unweighted_n.keys().collect::<Vec<_>>()).into());
            web_sys::console::log_1(&format!("Raw GroupStatistics - weighted_n keys: {:?}", stats.weighted_n.keys().collect::<Vec<_>>()).into());

            for var in &stats.variables {
                if let Some(n_values) = stats.unweighted_n.get(var) {
                    web_sys::console::log_1(&format!("  {} unweighted_n: {:?}", var, n_values).into());
                }
                if let Some(n_values) = stats.weighted_n.get(var) {
                    web_sys::console::log_1(&format!("  {} weighted_n: {:?}", var, n_values).into());
                }
            }

            let means = stats.variables
                .iter()
                .map(|var| {
                    let values = stats.groups
                        .iter()
                        .enumerate()
                        .map(|(j, _group)| {
                            stats.means.get(var)
                                .and_then(|v| v.get(j))
                                .copied()
                                .unwrap_or(0.0)
                        })
                        .collect();

                    GroupValue {
                        variable: var.clone(),
                        values,
                    }
                })
                .collect();

            let std_deviations = stats.variables
                .iter()
                .map(|var| {
                    let values = stats.groups
                        .iter()
                        .enumerate()
                        .map(|(j, _group)| {
                            stats.std_deviations.get(var)
                                .and_then(|v| v.get(j))
                                .copied()
                                .unwrap_or(0.0)
                        })
                        .collect();

                    GroupValue {
                        variable: var.clone(),
                        values,
                    }
                })
                .collect();

            let unweighted_n = stats.variables
                .iter()
                .map(|var| {
                    let values = stats.groups
                        .iter()
                        .enumerate()
                        .map(|(j, _group)| {
                            stats.unweighted_n.get(var)
                                .and_then(|v| v.get(j))
                                .copied()
                                .unwrap_or(0.0)
                        })
                        .collect();

                    GroupValue {
                        variable: var.clone(),
                        values,
                    }
                })
                .collect();

            let weighted_n = stats.variables
                .iter()
                .map(|var| {
                    let values = stats.groups
                        .iter()
                        .enumerate()
                        .map(|(j, _group)| {
                            stats.weighted_n.get(var)
                                .and_then(|v| v.get(j))
                                .copied()
                                .unwrap_or(0.0)
                        })
                        .collect();

                    GroupValue {
                        variable: var.clone(),
                        values,
                    }
                })
                .collect();

            FormattedGroupStatistics {
                groups: stats.groups.clone(),
                variables: stats.variables.clone(),
                means,
                std_deviations,
                unweighted_n,
                weighted_n,
            }
        });

        // Transform CanonicalFunctions
        let canonical_functions = result.canonical_functions.as_ref().map(|funcs| {
            let coefficients = funcs.coefficients
                .iter()
                .map(|(var, values)| {
                    FunctionValue {
                        variable: var.clone(),
                        values: values.clone(),
                    }
                })
                .collect();

            let standardized_coefficients = funcs.standardized_coefficients
                .iter()
                .map(|(var, values)| {
                    FunctionValue {
                        variable: var.clone(),
                        values: values.clone(),
                    }
                })
                .collect();

            let function_at_centroids = funcs.function_at_centroids
                .iter()
                .map(|(group, values)| {
                    GroupCentroid {
                        group: group.clone(),
                        values: values.clone(),
                    }
                })
                .collect();

            FormattedCanonicalFunctions {
                coefficients,
                standardized_coefficients,
                function_at_centroids,
            }
        });

        // Transform StructureMatrix
        let structure_matrix = result.structure_matrix.as_ref().map(|matrix| {
            let correlations = matrix.correlations
                .iter()
                .map(|(var, values)| {
                    FunctionValue {
                        variable: var.clone(),
                        values: values.clone(),
                    }
                })
                .collect();

            FormattedStructureMatrix {
                variables: matrix.variables.clone(),
                correlations,
            }
        });

        // Transform ClassificationResults
        let classification_results = result.classification_results.as_ref().map(|results| {
            let original_classification = results.original_classification
                .iter()
                .map(|(group, counts)| {
                    GroupClassification {
                        group: group.clone(),
                        counts: counts.clone(),
                    }
                })
                .collect();

            let cross_validated_classification = results.cross_validated_classification
                .as_ref()
                .map(|cross_val| {
                    cross_val
                        .iter()
                        .map(|(group, counts)| {
                            GroupClassification {
                                group: group.clone(),
                                counts: counts.clone(),
                            }
                        })
                        .collect()
                });

            let original_percentage = results.original_percentage
                .iter()
                .map(|(group, percentages)| {
                    GroupPercentage {
                        group: group.clone(),
                        percentages: percentages.clone(),
                    }
                })
                .collect();

            let cross_validated_percentage = results.cross_validated_percentage
                .as_ref()
                .map(|cross_val| {
                    cross_val
                        .iter()
                        .map(|(group, percentages)| {
                            GroupPercentage {
                                group: group.clone(),
                                percentages: percentages.clone(),
                            }
                        })
                        .collect()
                });

            FormattedClassificationResults {
                original_classification,
                cross_validated_classification,
                original_percentage,
                cross_validated_percentage,
            }
        });

        // Transform PooledMatrices
        let pooled_matrices = result.pooled_matrices.as_ref().map(|matrices| {
            let covariance = matrices.variables
                .iter()
                .map(|var| {
                    let values = matrices.variables
                        .iter()
                        .map(|other_var| {
                            let value = matrices.covariance
                                .get(var)
                                .and_then(|row| row.get(other_var))
                                .cloned()
                                .unwrap_or(0.0);

                            ValueEntry {
                                variable: other_var.clone(),
                                value,
                            }
                        })
                        .collect();

                    MatrixEntry {
                        variable: var.clone(),
                        values,
                    }
                })
                .collect();

            let correlation = matrices.variables
                .iter()
                .map(|var| {
                    let values = matrices.variables
                        .iter()
                        .map(|other_var| {
                            let value = matrices.correlation
                                .get(var)
                                .and_then(|row| row.get(other_var))
                                .cloned()
                                .unwrap_or(0.0);

                            ValueEntry {
                                variable: other_var.clone(),
                                value,
                            }
                        })
                        .collect();

                    MatrixEntry {
                        variable: var.clone(),
                        values,
                    }
                })
                .collect();

            FormattedPooledMatrices {
                variables: matrices.variables.clone(),
                covariance,
                correlation,
            }
        });

        // Transform CovarianceMatrices
        let covariance_matrices = result.covariance_matrices.as_ref().map(|matrices| {
            let matrices_entries = matrices.groups
                .iter()
                .map(|group| {
                    let matrix = matrices.variables
                        .iter()
                        .map(|var| {
                            let values = matrices.variables
                                .iter()
                                .map(|other_var| {
                                    let value = matrices.matrices
                                        .get(group)
                                        .and_then(|group_matrix| group_matrix.get(var))
                                        .and_then(|row| row.get(other_var))
                                        .cloned()
                                        .unwrap_or(0.0);

                                    ValueEntry {
                                        variable: other_var.clone(),
                                        value,
                                    }
                                })
                                .collect();

                            MatrixEntry {
                                variable: var.clone(),
                                values,
                            }
                        })
                        .collect();

                    GroupMatrixEntry {
                        group: group.clone(),
                        matrix,
                    }
                })
                .collect();

            FormattedCovarianceMatrices {
                groups: matrices.groups.clone(),
                variables: matrices.variables.clone(),
                matrices: matrices_entries,
                note_df: matrices.note_df.clone(),
            }
        });

        // Transform StepwiseStatistics
        let stepwise_statistics = result.stepwise_statistics.as_ref().map(|stats| {
            let variables_in_analysis = stats.variables_in_analysis
                .iter()
                .map(|(step, vars)| {
                    StepVariables {
                        step: step.clone(),
                        variables: vars.clone(),
                    }
                })
                .collect();

            let variables_not_in_analysis = stats.variables_not_in_analysis
                .iter()
                .map(|(step, vars)| {
                    StepVariables {
                        step: step.clone(),
                        variables: vars
                            .iter()
                            .map(|v| {
                                // Convert VariableNotInAnalysis to VariableInAnalysis for simplicity
                                // This is just a placeholder, you might need actual conversion logic
                                VariableInAnalysis {
                                    variable: v.variable.clone(),
                                    tolerance: v.tolerance,
                                    min_tolerance: v.min_tolerance,
                                    f_to_enter: v.f_to_enter,
                                    f_to_remove: v.f_to_enter,
                                    wilks_lambda: v.wilks_lambda,
                                    min_d_squared: v.min_d_squared,
                                    between_groups: v.between_groups.clone(),
                                }
                            })
                            .collect(),
                    }
                })
                .collect();

            let pairwise_comparisons = stats.pairwise_comparisons
                .iter()
                .flat_map(|(step, group_comps)| {
                    group_comps
                        .iter()
                        .map(|(group1, comps)| {
                            GroupPairComparison {
                                step: step.clone(),
                                group1: group1.clone(),
                                group2: "".to_string(), // Would need actual group2 info
                                comparisons: comps.clone(),
                            }
                        })
                        .collect::<Vec<GroupPairComparison>>()
                })
                .collect();

            FormattedStepwiseStatistics {
                method: stats.method.clone(),
                num_groups: stats.num_groups,
                variables_entered: stats.variables_entered.clone(),
                variables_removed: stats.variables_removed.clone(),
                min_d_squared: stats.min_d_squared.clone(),
                between_groups: stats.between_groups.clone(),
                wilks_lambda: stats.wilks_lambda.clone(),
                f_to_enter: stats.f_to_enter.clone(),
                f_to_enter_df1: stats.f_to_enter_df1.clone(),
                f_to_enter_df2: stats.f_to_enter_df2.clone(),
                significance: stats.significance.clone(),
                wilks_exact_f: stats.wilks_exact_f.clone(),
                wilks_exact_df1: stats.wilks_exact_df1.clone(),
                wilks_exact_df2: stats.wilks_exact_df2.clone(),
                wilks_exact_sig: stats.wilks_exact_sig.clone(),
                raos_v: stats.raos_v.clone(),
                raos_v_sig: stats.raos_v_sig.clone(),
                change_in_v: stats.change_in_v.clone(),
                change_sig: stats.change_sig.clone(),
                variables_in_analysis,
                variables_not_in_analysis,
                pairwise_comparisons,
            }
        });

        // Transform CasewiseStatistics
        let casewise_statistics = result.casewise_statistics.as_ref().map(|stats| {
            let discriminant_scores = stats.discriminant_scores
                .iter()
                .map(|(func, values)| {
                    ScoreValue {
                        function: func.clone(),
                        values: values.clone(),
                    }
                })
                .collect();

            // Transform cross-validated casewise statistics if present
            let cross_validated = stats.cross_validated.as_ref().map(|cv| {
                FormattedCrossValidatedCasewiseStatistics {
                    case_number: cv.case_number.clone(),
                    actual_group: cv.actual_group.clone(),
                    predicted_group: cv.predicted_group.clone(),
                    highest_group: cv.highest_group.clone(),
                    second_highest_group: cv.second_highest_group.clone(),
                    discriminant_scores: None, // Always None; SPSS leaves this blank
                }
            });

            FormattedCasewiseStatistics {
                case_number: stats.case_number.clone(),
                actual_group: stats.actual_group.clone(),
                predicted_group: stats.predicted_group.clone(),
                highest_group: stats.highest_group.clone(),
                second_highest_group: stats.second_highest_group.clone(),
                discriminant_scores,
                cross_validated,
            }
        });

        // Transform PriorProbabilities
        let prior_probabilities = result.prior_probabilities.as_ref().map(|probs| {
            let cases_used = probs.cases_used
                .iter()
                .map(|(case_type, counts)| {
                    GroupCases {
                        case_type: case_type.clone(),
                        counts: counts.clone(),
                    }
                })
                .collect();

            FormattedPriorProbabilities {
                groups: probs.groups.clone(),
                prior_probabilities: probs.prior_probabilities.clone(),
                cases_used,
                total: probs.total,
            }
        });

        // Transform ClassificationFunctionCoefficients
        let classification_function_coefficients = result.classification_function_coefficients
            .as_ref()
            .map(|coeffs| {
                let coefficients = coeffs.variables
                    .iter()
                    .map(|var| {
                        let values = coeffs.coefficients.get(var).cloned().unwrap_or_default();

                        GroupCoefficient {
                            variable: var.clone(),
                            values,
                        }
                    })
                    .collect();

                FormattedClassificationFunctionCoefficients {
                    groups: coeffs.groups.clone(),
                    variables: coeffs.variables.clone(),
                    coefficients,
                    constant_terms: coeffs.constant_terms.clone(),
                }
            });

        // Transform DiscriminantHistograms
        let discriminant_histograms = result.discriminant_histograms.as_ref().map(|hists| {
            let histograms = hists.functions
                .iter()
                .flat_map(|func| {
                    hists.groups
                        .iter()
                        .filter_map(|group| {
                            // Hanya lanjutkan jika histogram ditemukan untuk func ini
                            if let Some(histogram) = hists.histograms.get(func) {
                                Some(HistogramEntry {
                                    function: func.clone(),
                                    group: group.clone(),
                                    histogram: histogram.clone(),
                                })
                            } else {
                                None
                            }
                        })
                        .collect::<Vec<HistogramEntry>>()
                })
                .collect();

            FormattedDiscriminantHistograms {
                functions: hists.functions.clone(),
                groups: hists.groups.clone(),
                histograms,
            }
        });

        // Transform ScatterData
        let scatter_data = result.scatter_data.as_ref().map(|sd| {
            let discriminant_scores = sd.discriminant_scores
                .iter()
                .map(|(func, values)| ScoreValue {
                    function: func.clone(),
                    values: values.clone(),
                })
                .collect();
            FormattedScatterData {
                actual_group: sd.actual_group.clone(),
                discriminant_scores,
            }
        });

        FormatResult {
            processing_summary: Some(result.processing_summary.clone()),
            group_statistics,
            equality_tests: result.equality_tests.clone(),
            canonical_functions,
            structure_matrix,
            classification_results,
            box_m_test: result.box_m_test.clone(),
            pooled_matrices,
            covariance_matrices,
            log_determinants: result.log_determinants.clone(),
            eigen_description: result.eigen_description.clone(),
            stepwise_statistics,
            wilks_lambda_test: result.wilks_lambda_test.clone(),
            casewise_statistics,
            prior_probabilities,
            classification_function_coefficients,
            discriminant_histograms,
            scatter_data,
            bootstrap_results: result.bootstrap_results.clone(),
            assumption_results: result.assumption_results.clone(),
            territorial_map: result.territorial_map,
        }
    }
}
