//! White-box unit test of the classification unit of the discriminant engine:
//! `calculate_classification_results` (stats/classification_result.rs).
//!
//! The unit follows the pseudocode flow after the eigen step:
//!   functions -> constants and centroids -> prior -> case score -> d² -> argmax(ln π − ½d²)
//!   -> counts and row percentages -> leave-one-out.
//!
//! Basis path testing: V(G) = 25, of which 12 paths are feasible (TC-01 .. TC-12). TC-13
//! and TC-14 are complementary property tests of the cut-off. Nodes and paths are listed
//! in docs/white-box-unit-classification.md.
//!
//! Run from rust/:  cargo test --test white_box_unit_classification -- --test-threads=1

use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;

use wasm::models::{AnalysisData, DataRecord, DataValue, DiscriminantConfig};
use wasm::stats::canonical_function::{calculate_canonical_functions, clear_selected_vars_cache};
use wasm::stats::classification_result::calculate_classification_results;
use wasm::stats::common::{clear_analysis_warnings, take_analysis_warnings, MeanSubstitutedCase};

/// The warning sink is process-wide and the stepwise cache is thread-wide.
static SERIAL: Mutex<()> = Mutex::new(());

const TOL: f64 = 1e-6;

// ---------------------------------------------------------------------------------------
// Input builders
// ---------------------------------------------------------------------------------------

fn record(name: &str, value: f64) -> DataRecord {
    let mut values = HashMap::new();
    values.insert(name.to_string(), DataValue::Number(value));
    DataRecord { values }
}

fn dataset(groups: &[f64], predictors: &[(&str, Vec<f64>)]) -> AnalysisData {
    AnalysisData {
        group_data: vec![groups.iter().map(|&v| record("g", v)).collect()],
        independent_data: predictors
            .iter()
            .map(|(name, values)| values.iter().map(|&v| record(name, v)).collect())
            .collect(),
        selection_data: None,
        strata_data: None,
        row_numbers: None,
        group_data_defs: vec![],
        independent_data_defs: vec![],
        selection_data_defs: None,
    }
}

struct Options {
    stepwise: bool,
    f_entry: f64,
    leave: bool,
    group_size_priors: bool,
}

impl Default for Options {
    fn default() -> Self {
        Options {
            stepwise: false,
            f_entry: 3.84,
            leave: false,
            group_size_priors: false,
        }
    }
}

fn config(predictors: &[&str], o: Options) -> DiscriminantConfig {
    serde_json::from_value(json!({
        "main": {
            "GroupingVariable": "g", "IndependentVariables": predictors,
            "Together": !o.stepwise, "Stepwise": o.stepwise, "SelectionVariable": null
        },
        "defineRange": { "minRange": 1.0, "maxRange": 3.0 },
        "setValue": { "Value": null },
        "statistics": {
            "Means": false, "ANOVA": false, "BoxM": false, "Fisher": false,
            "Unstandardized": false, "WGCorrelation": false, "WGCovariance": false,
            "SGCovariance": false, "TotalCovariance": false
        },
        "method": { "Wilks": true, "FValue": true, "FEntry": o.f_entry, "FRemoval": 2.71 },
        "classify": {
            "AllGroupEqual": !o.group_size_priors, "GroupSize": o.group_size_priors,
            "WithinGroup": true, "SepGroup": false, "Case": false, "Limit": false,
            "LimitValue": null, "Summary": true, "Leave": o.leave, "Combine": false,
            "SepGrp": false, "Terr": false, "Replace": false
        },
        "save": { "Predicted": false, "Discriminant": false, "Probabilities": false, "XmlFile": null },
        "bootstrap": {
            "PerformBootStrapping": false, "NumOfSamples": 0, "Seed": false, "SeedValue": 0,
            "Level": 95.0, "Percentile": false, "BCa": false, "Simple": false,
            "Stratified": false, "Variables": [], "StrataVariables": null
        }
    }))
    .expect("valid test configuration")
}

/// An extra case to classify (unselected = testing part, or ungrouped).
fn extra(group: &str, x: f64, selected: bool) -> MeanSubstitutedCase {
    let mut values = HashMap::new();
    values.insert("x".to_string(), x);
    MeanSubstitutedCase {
        row: 0,
        group: group.to_string(),
        values,
        selected,
    }
}

/// Reference data set, one predictor x, two groups of four cases, hand-computable.
///
///   group 1: 2, 4, 5, 13     mean 6      SS = 70
///   group 2: 12, 20, 24, 26  mean 20.5   SS = 115
///
///   overall mean 13.25, W = 185, S = W/(n-g) = 185/6, B = 420.5, λ = 420.5/185
///   a = 1/√S = √(6/185) = 0.180090,  a₀ = −13.25·a,  centroids = ±7.25·a = ±1.305652
///   Equal priors: the cut-off is the midpoint of the centroids, x = 13.25.
///
///   Original:   group 1 → [4, 0] (x = 13 < 13.25 is correct),  group 2 → [1, 3] (x = 12 → 1)
///   Leave-one-out: x = 13 and x = 12 are misclassified → group 1 [3, 1], group 2 [1, 3]
fn reference() -> AnalysisData {
    dataset(
        &[1., 1., 1., 1., 2., 2., 2., 2.],
        &[("x", vec![2., 4., 5., 13., 12., 20., 24., 26.])],
    )
}

fn assert_close(actual: f64, expected: f64, what: &str) {
    assert!(
        (actual - expected).abs() < TOL,
        "{}: got {}, expected {}",
        what,
        actual,
        expected
    );
}

fn counts(map: &HashMap<String, Vec<i32>>, group: &str) -> Vec<i32> {
    map.get(group)
        .unwrap_or_else(|| panic!("no row for group {}", group))
        .clone()
}

fn percents(map: &HashMap<String, Vec<f64>>, group: &str) -> Vec<f64> {
    map.get(group)
        .unwrap_or_else(|| panic!("no row for group {}", group))
        .clone()
}

fn assert_percents(actual: &[f64], expected: &[f64], what: &str) {
    assert_eq!(actual.len(), expected.len(), "{}: length", what);
    for (a, e) in actual.iter().zip(expected) {
        assert_close(*a, *e, what);
    }
}

fn lock() -> std::sync::MutexGuard<'static, ()> {
    let guard = SERIAL.lock().unwrap_or_else(|e| e.into_inner());
    clear_analysis_warnings();
    clear_selected_vars_cache();
    guard
}

// ---------------------------------------------------------------------------------------
// TC-01  Path 1 (baseline): enter method, equal priors, no extra cases, no leave-one-out
// ---------------------------------------------------------------------------------------
#[test]
fn tc01_baseline_original_classification_and_centroids() {
    let _g = lock();
    let data = reference();
    let cfg = config(&["x"], Options::default());

    // Stage values the classification rests on: coefficient, constant, centroids.
    let f = calculate_canonical_functions(&data, &cfg).unwrap();
    let a = f.coefficients["x"][0];
    let a_expected = (6.0_f64 / 185.0).sqrt();
    assert_close(a.abs(), a_expected, "|a| = 1/√S");
    assert_close(
        f.coefficients["(Constant)"][0],
        -13.25 * a,
        "constant = −a·x̄",
    );
    assert_close(
        f.standardized_coefficients["x"][0].abs(),
        1.0,
        "standardized = a·√S",
    );
    let (c1, c2) = (
        f.function_at_centroids["1"][0],
        f.function_at_centroids["2"][0],
    );
    assert_close(c1, a * (6.0 - 13.25), "centroid group 1");
    assert_close(c2, a * (20.5 - 13.25), "centroid group 2");
    assert_close(c1 + c2, 0.0, "centroids of equal-sized groups sum to 0");
    assert!(c1 * c2 < 0.0);

    // The unit itself.
    let r = calculate_classification_results(&data, &cfg, &[], &[], &[]).unwrap();
    assert_eq!(counts(&r.original_classification, "1"), vec![4, 0]);
    assert_eq!(counts(&r.original_classification, "2"), vec![1, 3]);
    assert_percents(
        &percents(&r.original_percentage, "1"),
        &[100.0, 0.0],
        "% group 1",
    );
    assert_percents(
        &percents(&r.original_percentage, "2"),
        &[25.0, 75.0],
        "% group 2",
    );
    // Hit ratio = (4 + 3) / 8 = 87.5 %.
    let hits: i32 = ["1", "2"]
        .iter()
        .enumerate()
        .map(|(i, g)| counts(&r.original_classification, g)[i])
        .sum();
    assert_close(100.0 * hits as f64 / 8.0, 87.5, "hit ratio");

    assert!(r.cross_validated_classification.is_none());
    assert!(r.unselected_classification.is_none());
    assert!(r.ungrouped_classification.is_none());
    assert!(r.unselected_ungrouped_classification.is_none());
    assert!(take_analysis_warnings().is_empty());
}

// ---------------------------------------------------------------------------------------
// TC-02  Path 2: no valid group -> Err from the extraction
// ---------------------------------------------------------------------------------------
#[test]
fn tc02_no_valid_group_returns_error() {
    let _g = lock();
    let data = dataset(
        &[9.0; 8],
        &[("x", vec![2., 4., 5., 13., 12., 20., 24., 26.])],
    );
    let r =
        calculate_classification_results(&data, &config(&["x"], Options::default()), &[], &[], &[]);
    assert_eq!(r.unwrap_err(), "No valid groups found after filtering");
}

// ---------------------------------------------------------------------------------------
// TC-03  Path 3: stepwise = true, selection succeeds -> same table as TC-01
// ---------------------------------------------------------------------------------------
#[test]
fn tc03_stepwise_ok_gives_same_table() {
    let _g = lock();
    let o = Options {
        stepwise: true,
        ..Options::default()
    };
    let r =
        calculate_classification_results(&reference(), &config(&["x"], o), &[], &[], &[]).unwrap();
    assert_eq!(counts(&r.original_classification, "1"), vec![4, 0]);
    assert_eq!(counts(&r.original_classification, "2"), vec![1, 3]);
}

// ---------------------------------------------------------------------------------------
// TC-04  Path 4: stepwise = true, no variable enters -> Err
// ---------------------------------------------------------------------------------------
#[test]
fn tc04_stepwise_no_variable_entered_returns_error() {
    let _g = lock();
    let o = Options {
        stepwise: true,
        f_entry: 1.0e6,
        ..Options::default()
    };
    let r = calculate_classification_results(&reference(), &config(&["x"], o), &[], &[], &[]);
    assert!(r
        .unwrap_err()
        .contains("no variable met the entry criteria"));
}

// ---------------------------------------------------------------------------------------
// TC-05  Path 5: no predictor at all -> Err
// ---------------------------------------------------------------------------------------
#[test]
fn tc05_no_predictor_returns_error() {
    let _g = lock();
    let data = dataset(&[1., 1., 1., 1., 2., 2., 2., 2.], &[]);
    let r =
        calculate_classification_results(&data, &config(&[], Options::default()), &[], &[], &[]);
    assert_eq!(
        r.unwrap_err(),
        "No independent variables available for classification."
    );
}

// ---------------------------------------------------------------------------------------
// TC-06  Path 6: a single group -> Err from the eigen step
// ---------------------------------------------------------------------------------------
#[test]
fn tc06_single_group_returns_error() {
    let _g = lock();
    let data = dataset(
        &[1.0; 8],
        &[("x", vec![2., 4., 5., 13., 12., 20., 24., 26.])],
    );
    let r =
        calculate_classification_results(&data, &config(&["x"], Options::default()), &[], &[], &[]);
    assert_eq!(
        r.unwrap_err(),
        "Not enough groups or variables for canonical functions"
    );
}

// ---------------------------------------------------------------------------------------
// TC-07  Path 7: unselected (testing) cases are classified in their own block
// ---------------------------------------------------------------------------------------
#[test]
fn tc07_unselected_cases_block() {
    let _g = lock();
    let unselected = [
        extra("1", 10.0, false),
        extra("1", 15.0, false),
        extra("2", 14.0, false),
    ];
    let r = calculate_classification_results(
        &reference(),
        &config(&["x"], Options::default()),
        &[],
        &unselected,
        &[],
    )
    .unwrap();

    let c = r.unselected_classification.expect("unselected block");
    assert_eq!(counts(&c, "1"), vec![1, 1]); // 10 -> 1, 15 -> 2
    assert_eq!(counts(&c, "2"), vec![0, 1]); // 14 -> 2
    let p = r.unselected_percentage.expect("unselected percentages");
    assert_percents(&percents(&p, "1"), &[50.0, 50.0], "% unselected group 1");
    assert_percents(&percents(&p, "2"), &[0.0, 100.0], "% unselected group 2");
    // The testing cases never change the original (training) table.
    assert_eq!(counts(&r.original_classification, "1"), vec![4, 0]);
    assert!(r.unselected_ungrouped_classification.is_none());
}

// ---------------------------------------------------------------------------------------
// TC-08  Path 8: an unselected case whose group is not an analysis group is not counted
// ---------------------------------------------------------------------------------------
#[test]
fn tc08_unselected_case_of_unknown_group_is_skipped() {
    let _g = lock();
    let unselected = [extra("9", 10.0, false)];
    let r = calculate_classification_results(
        &reference(),
        &config(&["x"], Options::default()),
        &[],
        &unselected,
        &[],
    )
    .unwrap();

    let c = r.unselected_classification.expect("block exists");
    assert_eq!(counts(&c, "1"), vec![0, 0]);
    assert_eq!(counts(&c, "2"), vec![0, 0]);
    let p = r.unselected_percentage.unwrap();
    assert_percents(&percents(&p, "1"), &[0.0, 0.0], "% empty row 1");
    assert_percents(&percents(&p, "2"), &[0.0, 0.0], "% empty row 2");
}

// ---------------------------------------------------------------------------------------
// TC-09  Path 9: only an unselected ungrouped case -> block with empty counts + its own row
// ---------------------------------------------------------------------------------------
#[test]
fn tc09_only_unselected_ungrouped_cases() {
    let _g = lock();
    let ungrouped = [
        extra("ungrouped", 3.0, false),
        extra("ungrouped", 20.0, false),
    ];
    let r = calculate_classification_results(
        &reference(),
        &config(&["x"], Options::default()),
        &[],
        &[],
        &ungrouped,
    )
    .unwrap();

    let c = r.unselected_classification.expect("block exists");
    assert_eq!(counts(&c, "1"), vec![0, 0]);
    assert_eq!(counts(&c, "2"), vec![0, 0]);
    assert_eq!(r.unselected_ungrouped_classification, Some(vec![1, 1])); // 3 -> 1, 20 -> 2
    assert_percents(
        &r.unselected_ungrouped_percentage.unwrap(),
        &[50.0, 50.0],
        "% ungrouped",
    );
    assert!(r.ungrouped_classification.is_none());
}

// ---------------------------------------------------------------------------------------
// TC-10  Path 10: selected ungrouped cases -> "Ungrouped cases" row of the original block
// ---------------------------------------------------------------------------------------
#[test]
fn tc10_selected_ungrouped_cases_row() {
    let _g = lock();
    let ungrouped = [
        extra("ungrouped", 5.0, true),
        extra("ungrouped", 14.0, true),
        extra("ungrouped", 30.0, true),
    ];
    let r = calculate_classification_results(
        &reference(),
        &config(&["x"], Options::default()),
        &[],
        &[],
        &ungrouped,
    )
    .unwrap();

    assert_eq!(r.ungrouped_classification, Some(vec![1, 2])); // 5 -> 1; 14, 30 -> 2
    assert_percents(
        &r.ungrouped_percentage.unwrap(),
        &[100.0 / 3.0, 200.0 / 3.0],
        "% ungrouped",
    );
    assert!(r.unselected_classification.is_none());
    // Ungrouped cases never count toward the original table.
    assert_eq!(counts(&r.original_classification, "1"), vec![4, 0]);
}

// ---------------------------------------------------------------------------------------
// TC-11  Path 11: leave-one-out, cross-validation succeeds
// ---------------------------------------------------------------------------------------
#[test]
fn tc11_leave_one_out_cross_validation() {
    let _g = lock();
    let o = Options {
        leave: true,
        ..Options::default()
    };
    let r =
        calculate_classification_results(&reference(), &config(&["x"], o), &[], &[], &[]).unwrap();

    // Original table is unchanged by leave-one-out.
    assert_eq!(counts(&r.original_classification, "1"), vec![4, 0]);
    // Held-out means: x = 13 -> μ₁₍₋ᵢ₎ = 11/3, |13 − 11/3| = 9.33 > |13 − 20.5| = 7.5 -> group 2;
    //                 x = 12 -> μ₂₍₋ᵢ₎ = 70/3, |12 − 70/3| = 11.33 > |12 − 6| = 6 -> group 1.
    let cv = r
        .cross_validated_classification
        .expect("cross-validated block");
    assert_eq!(counts(&cv, "1"), vec![3, 1]);
    assert_eq!(counts(&cv, "2"), vec![1, 3]);
    let cvp = r.cross_validated_percentage.unwrap();
    assert_percents(&percents(&cvp, "1"), &[75.0, 25.0], "% CV group 1");
    assert_percents(&percents(&cvp, "2"), &[25.0, 75.0], "% CV group 2");
    assert!(take_analysis_warnings().is_empty());
}

// ---------------------------------------------------------------------------------------
// TC-12  Path 12: leave-one-out cannot be computed -> original table kept, warning raised
// ---------------------------------------------------------------------------------------
#[test]
fn tc12_leave_one_out_failure_keeps_original_table() {
    let _g = lock();
    // Two groups of two cases, two predictors: W has rank 2 (df = 2), but holding out one
    // case leaves df = 1, so the pooled within-groups matrix becomes singular.
    let data = dataset(
        &[1., 1., 2., 2.],
        &[("x1", vec![1., 2., 5., 6.]), ("x2", vec![1., 3., 2., 1.])],
    );
    let o = Options {
        leave: true,
        ..Options::default()
    };
    let r =
        calculate_classification_results(&data, &config(&["x1", "x2"], o), &[], &[], &[]).unwrap();

    assert!(r.cross_validated_classification.is_none());
    assert!(r.cross_validated_percentage.is_none());
    assert_eq!(
        counts(&r.original_classification, "1").iter().sum::<i32>(),
        2
    );
    assert_eq!(
        counts(&r.original_classification, "2").iter().sum::<i32>(),
        2
    );

    let warnings = take_analysis_warnings();
    assert!(
        warnings
            .iter()
            .any(|(ctx, msg)| ctx == "cross_validation" && msg.contains("cannot be computed")),
        "expected a cross_validation warning, got {:?}",
        warnings
    );
}

// ---------------------------------------------------------------------------------------
// TC-13  Complementary: with equal priors the cut-off is the midpoint of the centroids
// ---------------------------------------------------------------------------------------
#[test]
fn tc13_cutoff_is_midpoint_of_centroids_with_equal_priors() {
    let _g = lock();
    // Midpoint of the group means (6 + 20.5) / 2 = 13.25; ± 0.01 either side.
    let unselected = [extra("1", 13.24, false), extra("2", 13.26, false)];
    let r = calculate_classification_results(
        &reference(),
        &config(&["x"], Options::default()),
        &[],
        &unselected,
        &[],
    )
    .unwrap();
    let c = r.unselected_classification.unwrap();
    assert_eq!(counts(&c, "1"), vec![1, 0]); // 13.24 -> group 1
    assert_eq!(counts(&c, "2"), vec![0, 1]); // 13.26 -> group 2
}

// ---------------------------------------------------------------------------------------
// TC-14  Complementary: the cut-off moves by S·ln(π₁/π₂)/(μ₂ − μ₁) with unequal priors
// ---------------------------------------------------------------------------------------
#[test]
fn tc14_cutoff_shifts_with_group_size_priors() {
    let _g = lock();
    // group 1: 0..5 (n = 6, mean 2.5), group 2: 6, 8 (n = 2, mean 7); W = 17.5 + 2 = 19.5,
    // S = 19.5 / 6 = 3.25. Equal priors: cut = 4.75.
    // Group-size priors π = (0.75, 0.25): cut = 4.75 + 3.25 · ln 3 / 4.5 = 5.5435.
    // The case x = 5 (group 1) is on the group 2 side only under equal priors.
    let data = dataset(
        &[1., 1., 1., 1., 1., 1., 2., 2.],
        &[("x", vec![0., 1., 2., 3., 4., 5., 6., 8.])],
    );

    let equal =
        calculate_classification_results(&data, &config(&["x"], Options::default()), &[], &[], &[])
            .unwrap();
    assert_eq!(counts(&equal.original_classification, "1"), vec![5, 1]);
    assert_eq!(counts(&equal.original_classification, "2"), vec![0, 2]);

    let o = Options {
        group_size_priors: true,
        ..Options::default()
    };
    let sized = calculate_classification_results(&data, &config(&["x"], o), &[], &[], &[]).unwrap();
    assert_eq!(counts(&sized.original_classification, "1"), vec![6, 0]);
    assert_eq!(counts(&sized.original_classification, "2"), vec![0, 2]);

    let cut = 4.75 + 3.25 * 3.0_f64.ln() / 4.5;
    assert!(
        5.0 < cut && cut < 6.0,
        "cut-off {} must lie between x = 5 and x = 6",
        cut
    );
}
