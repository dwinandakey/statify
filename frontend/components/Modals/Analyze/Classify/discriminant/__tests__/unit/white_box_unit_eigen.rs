//! White-box unit test of the main analysis unit of the discriminant engine:
//! `calculate_eigen_statistics` (stats/canonical_function.rs).
//!
//! The unit follows the key-formula flow of the thesis pseudocode:
//!   W (within SSCP) -> B (between SSCP) -> B v = λ W v -> % variance -> canonical r.
//!
//! Basis path testing: V(G) = 9 (8 predicates + 1). Two basis paths (the zero-iteration
//! exits of the two scaling loops) are infeasible, so there are 7 test cases. The
//! numbered nodes and paths are listed in docs/white-box-unit-eigen.md.
//!
//! Run from rust/:  cargo test --test white_box_unit_eigen -- --test-threads=1

use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;

use wasm::models::{AnalysisData, DataRecord, DataValue, DiscriminantConfig};
use wasm::stats::canonical_function::{calculate_eigen_statistics, clear_selected_vars_cache};
use wasm::stats::common::{
    clear_analysis_warnings, extract_analyzed_dataset, take_analysis_warnings,
};
use wasm::stats::matrix_calculation::{
    calculate_between_groups_sscp, calculate_pooled_within_matrix_no_epsilon,
};

/// The warning sink and the stepwise cache are process-wide / thread-wide state, so the
/// test cases run one at a time.
static SERIAL: Mutex<()> = Mutex::new(());

// ---------------------------------------------------------------------------------------
// Input builders
// ---------------------------------------------------------------------------------------

fn record(name: &str, value: f64) -> DataRecord {
    let mut values = HashMap::new();
    values.insert(name.to_string(), DataValue::Number(value));
    DataRecord { values }
}

/// One grouping column `g` and one column per predictor, rows in the same order.
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

fn config(stepwise: bool, predictors: &[&str], f_entry: f64) -> DiscriminantConfig {
    serde_json::from_value(json!({
        "main": {
            "GroupingVariable": "g", "IndependentVariables": predictors,
            "Together": !stepwise, "Stepwise": stepwise, "SelectionVariable": null
        },
        "defineRange": { "minRange": 1.0, "maxRange": 3.0 },
        "setValue": { "Value": null },
        "statistics": {
            "Means": false, "ANOVA": false, "BoxM": false, "Fisher": false,
            "Unstandardized": false, "WGCorrelation": false, "WGCovariance": false,
            "SGCovariance": false, "TotalCovariance": false
        },
        "method": { "Wilks": true, "FValue": true, "FEntry": f_entry, "FRemoval": 2.71 },
        "classify": {
            "AllGroupEqual": true, "GroupSize": false, "WithinGroup": true, "SepGroup": false,
            "Case": false, "Limit": false, "LimitValue": null, "Summary": false, "Leave": false,
            "Combine": false, "SepGrp": false, "Terr": false, "Replace": false
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

/// Reference data set: 3 groups x 3 cases, 2 predictors, hand-computable.
///
///   group 1: (1,2) (2,-1) (3,2)   mean (2,1)
///   group 2: (3,4) (4,5)  (5,6)   mean (4,5)
///   group 3: (5,3) (6,4)  (7,2)   mean (6,3)
///
///   W = [[6, 1], [1, 10]]   B = [[24, 12], [12, 24]]   T = W + B = [[30, 13], [13, 34]]
///   |W| = 59, |T| = 851, Wilks' Λ = 59/851
///   det(B - λW) = 59λ² - 360λ + 432 = 0  ->  λ = (180 ± 48√3) / 59
fn reference() -> AnalysisData {
    let groups = vec![1., 1., 1., 2., 2., 2., 3., 3., 3.];
    let x1 = vec![1., 2., 3., 3., 4., 5., 5., 6., 7.];
    let x2 = vec![2., -1., 2., 4., 5., 6., 3., 4., 2.];
    dataset(&groups, &[("x1", x1), ("x2", x2)])
}

const TOL: f64 = 1e-6;

fn assert_close(actual: f64, expected: f64, what: &str) {
    assert!(
        (actual - expected).abs() < TOL,
        "{}: got {}, expected {}",
        what,
        actual,
        expected
    );
}

fn lock() -> std::sync::MutexGuard<'static, ()> {
    let guard = SERIAL.lock().unwrap_or_else(|e| e.into_inner());
    clear_analysis_warnings();
    clear_selected_vars_cache();
    guard
}

// ---------------------------------------------------------------------------------------
// TC-01  Path 1 (baseline): enter method, valid data, regular W, no NaN
// ---------------------------------------------------------------------------------------
#[test]
fn tc01_baseline_hand_calculated_eigen_solution() {
    let _g = lock();
    let data = reference();
    let cfg = config(false, &["x1", "x2"], 3.84);

    // Step 1-2 of the pseudocode: W and B.
    let ds = extract_analyzed_dataset(&data, &cfg).unwrap();
    let vars = vec!["x1".to_string(), "x2".to_string()];
    let w_cov = calculate_pooled_within_matrix_no_epsilon(&ds, &vars);
    let b = calculate_between_groups_sscp(&ds, &vars);
    let df = (ds.total_cases - ds.num_groups) as f64; // n - g = 6
    let w = &w_cov * df;
    assert_close(w[(0, 0)], 6.0, "W11");
    assert_close(w[(0, 1)], 1.0, "W12");
    assert_close(w[(1, 1)], 10.0, "W22");
    assert_close(b[(0, 0)], 24.0, "B11");
    assert_close(b[(0, 1)], 12.0, "B12");
    assert_close(b[(1, 1)], 24.0, "B22");

    // Step 3-5: eigenvalues, % of variance, canonical correlation.
    let r = calculate_eigen_statistics(&data, &cfg).unwrap();
    assert_eq!(r.functions, vec!["Function 1", "Function 2"]);

    let root = 48.0 * 3.0_f64.sqrt();
    let l1 = (180.0 + root) / 59.0; // 4.459973...
    let l2 = (180.0 - root) / 59.0; // 1.641721...
    assert_close(r.eigenvalue[0], l1, "λ1");
    assert_close(r.eigenvalue[1], l2, "λ2");
    assert_close(
        r.variance_percentage[0],
        100.0 * l1 / (l1 + l2),
        "% variance 1",
    );
    assert_close(
        r.variance_percentage[1],
        100.0 * l2 / (l1 + l2),
        "% variance 2",
    );
    assert_close(
        r.cumulative_percentage[0],
        r.variance_percentage[0],
        "cumulative 1",
    );
    assert_close(r.cumulative_percentage[1], 100.0, "cumulative 2");
    assert_close(r.canonical_correlation[0], (l1 / (1.0 + l1)).sqrt(), "r1");
    assert_close(r.canonical_correlation[1], (l2 / (1.0 + l2)).sqrt(), "r2");

    // Wilks' identity: Π 1/(1+λ) = |W| / |W + B| = 59 / 851.
    let wilks: f64 = r.eigenvalue.iter().map(|l| 1.0 / (1.0 + l)).product();
    assert_close(wilks, 59.0 / 851.0, "Wilks' lambda from eigenvalues");

    // Eigenvectors a (flattened [variable][function]) satisfy, whatever their sign:
    //   aᵀ S a = 1 with S = W/(n-g)   and   B a = λ W a.
    let a = |var: usize, f: usize| r.eigenvector[var * 2 + f];
    for f in 0..2 {
        let (a1, a2) = (a(0, f), a(1, f));
        let wa = (
            w[(0, 0)] * a1 + w[(0, 1)] * a2,
            w[(1, 0)] * a1 + w[(1, 1)] * a2,
        );
        assert_close((a1 * wa.0 + a2 * wa.1) / df, 1.0, "aᵀ S a");
        let ba = (
            b[(0, 0)] * a1 + b[(0, 1)] * a2,
            b[(1, 0)] * a1 + b[(1, 1)] * a2,
        );
        assert_close(ba.0, r.eigenvalue[f] * wa.0, "B a = λ W a (row 1)");
        assert_close(ba.1, r.eigenvalue[f] * wa.1, "B a = λ W a (row 2)");
    }
    // Functions are uncorrelated within groups: a1ᵀ S a2 = 0.
    let (p1, p2) = ((a(0, 0), a(1, 0)), (a(0, 1), a(1, 1)));
    let w_p2 = (
        w[(0, 0)] * p2.0 + w[(0, 1)] * p2.1,
        w[(1, 0)] * p2.0 + w[(1, 1)] * p2.1,
    );
    assert_close((p1.0 * w_p2.0 + p1.1 * w_p2.1) / df, 0.0, "a1ᵀ S a2");

    assert!(take_analysis_warnings().is_empty(), "no warning expected");
}

// ---------------------------------------------------------------------------------------
// TC-02  Path 2: no valid group after the Define Range filter -> Err from the extraction
// ---------------------------------------------------------------------------------------
#[test]
fn tc02_no_valid_group_returns_error() {
    let _g = lock();
    // Every group code (9) lies outside Define Range [1, 3].
    let data = dataset(
        &[9.0; 9],
        &[("x1", vec![1., 2., 3., 3., 4., 5., 5., 6., 7.])],
    );
    let r = calculate_eigen_statistics(&data, &config(false, &["x1"], 3.84));
    assert_eq!(r.unwrap_err(), "No valid groups found after filtering");
}

// ---------------------------------------------------------------------------------------
// TC-03  Path 3: stepwise = true and the selection succeeds (both variables enter)
// ---------------------------------------------------------------------------------------
#[test]
fn tc03_stepwise_selection_ok_gives_same_functions() {
    let _g = lock();
    let data = reference();

    let enter = calculate_eigen_statistics(&data, &config(false, &["x1", "x2"], 3.84)).unwrap();
    clear_selected_vars_cache();
    let step = calculate_eigen_statistics(&data, &config(true, &["x1", "x2"], 3.84)).unwrap();

    // Same model {x1, x2}: same eigenvalues; the variables may come in another order,
    // so the coefficient rows are compared as a set of absolute values.
    for f in 0..2 {
        assert_close(
            step.eigenvalue[f],
            enter.eigenvalue[f],
            "λ (stepwise vs enter)",
        );
    }
    let sorted_abs = |v: &Vec<f64>| {
        let mut s: Vec<f64> = v.iter().map(|x| x.abs()).collect();
        s.sort_by(|a, b| a.partial_cmp(b).unwrap());
        s
    };
    let (se, ss) = (
        sorted_abs(&enter.eigenvector),
        sorted_abs(&step.eigenvector),
    );
    assert_eq!(se.len(), ss.len());
    for (x, y) in se.iter().zip(ss.iter()) {
        assert_close(*y, *x, "|eigenvector| set");
    }
}

// ---------------------------------------------------------------------------------------
// TC-04  Path 4: stepwise = true and no variable meets the entry criterion -> Err
// ---------------------------------------------------------------------------------------
#[test]
fn tc04_stepwise_no_variable_entered_returns_error() {
    let _g = lock();
    let data = reference();
    // F to enter = 1e6 cannot be reached by any candidate.
    let r = calculate_eigen_statistics(&data, &config(true, &["x1", "x2"], 1.0e6));
    let message = r.unwrap_err();
    assert!(
        message.contains("no variable met the entry criteria"),
        "unexpected message: {}",
        message
    );
}

// ---------------------------------------------------------------------------------------
// TC-05  Path 5: fewer than two groups -> no discriminant function (num_functions == 0)
// ---------------------------------------------------------------------------------------
#[test]
fn tc05_single_group_returns_error() {
    let _g = lock();
    let data = dataset(
        &[1.0; 9],
        &[("x1", vec![1., 2., 3., 3., 4., 5., 5., 6., 7.])],
    );
    let r = calculate_eigen_statistics(&data, &config(false, &["x1"], 3.84));
    assert_eq!(
        r.unwrap_err(),
        "Not enough groups or variables for canonical functions"
    );
}

// ---------------------------------------------------------------------------------------
// TC-06  Path 8: singular W (x2 = 2·x1) -> warning, pseudo-inverse, function still returned
// ---------------------------------------------------------------------------------------
#[test]
fn tc06_singular_within_matrix_warns_and_uses_pseudo_inverse() {
    let _g = lock();
    let groups = vec![1., 1., 1., 2., 2., 2., 3., 3., 3.];
    let x1 = vec![1., 2., 3., 3., 4., 5., 5., 6., 7.];
    let x2: Vec<f64> = x1.iter().map(|v| 2.0 * v).collect();
    let data = dataset(&groups, &[("x1", x1), ("x2", x2)]);

    let r = calculate_eigen_statistics(&data, &config(false, &["x1", "x2"], 3.84)).unwrap();

    // Rank 1: B11 / W11 = 24 / 6 = 4 for the only non-zero direction.
    assert_close(r.eigenvalue[0], 4.0, "λ1");
    assert!(
        r.eigenvalue[1].abs() < 1e-9,
        "λ2 must be 0, got {}",
        r.eigenvalue[1]
    );
    assert_close(r.variance_percentage[0], 100.0, "% variance 1");
    assert_close(r.variance_percentage[1], 0.0, "% variance 2");

    let warnings = take_analysis_warnings();
    assert_eq!(warnings.len(), 1);
    assert_eq!(warnings[0].0, "canonical_functions");
    assert!(warnings[0].1.contains("singular"));
}

// ---------------------------------------------------------------------------------------
// TC-07  Path 9: negative rounding eigenvalue -> canonical correlation set to 0, not NaN
// ---------------------------------------------------------------------------------------
#[test]
fn tc07_negative_rounding_eigenvalue_gives_zero_correlation() {
    let _g = lock();
    // Group means (2,1) (4,7) (6,13) lie exactly on a line, so B has rank 1 and the
    // second eigenvalue is only rounding noise. W is the same as in the reference set.
    let groups = vec![1., 1., 1., 2., 2., 2., 3., 3., 3.];
    let x1 = vec![1., 2., 3., 3., 4., 5., 5., 6., 7.];
    let x2 = vec![2., -1., 2., 6., 7., 8., 13., 14., 12.];
    let data = dataset(&groups, &[("x1", x1), ("x2", x2)]);

    let r = calculate_eigen_statistics(&data, &config(false, &["x1", "x2"], 3.84)).unwrap();

    // λ1 = tr(W⁻¹B) = 1392 / 59 for this rank-1 B.
    assert_close(r.eigenvalue[0], 1392.0 / 59.0, "λ1");
    assert!(
        r.eigenvalue[1] < 0.0,
        "branch precondition: λ2 = {} must be < 0",
        r.eigenvalue[1]
    );
    assert!(r.eigenvalue[1].abs() < 1e-9);
    // sqrt(λ2 / (1 + λ2)) is NaN for λ2 < 0; the unit replaces it by 0.
    assert_eq!(r.canonical_correlation[1], 0.0);
    assert!(!r.canonical_correlation[1].is_nan());
    assert!(r.canonical_correlation[0] > 0.0 && r.canonical_correlation[0] < 1.0);
}
