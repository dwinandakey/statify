use std::collections::HashMap;

use crate::models::{
    config::MultivariateConfig,
    data::{
        AnalysisData,
        DataRecord,
        DataValue,
        VariableAlign,
        VariableDefinition,
        VariableMeasure,
        VariableRole,
        VariableType,
    },
};
use crate::stats::core::{
    calculate_box_test,
    calculate_multivariate_tests,
    calculate_parameter_estimates,
    calculate_tests_between_subjects_effects,
};
use serde_json::json;

fn numeric_def(name: &str, column_index: usize) -> VariableDefinition {
    VariableDefinition {
        id: None,
        column_index,
        name: name.to_string(),
        r#type: VariableType::Numeric,
        width: 8,
        decimals: 3,
        label: Some(name.to_string()),
        values: vec![],
        missing: vec![],
        columns: 8,
        align: VariableAlign::Right,
        measure: VariableMeasure::Scale,
        role: VariableRole::Input,
    }
}

fn nominal_def(name: &str, column_index: usize) -> VariableDefinition {
    VariableDefinition {
        id: None,
        column_index,
        name: name.to_string(),
        r#type: VariableType::String,
        width: 16,
        decimals: 0,
        label: Some(name.to_string()),
        values: vec![],
        missing: vec![],
        columns: 16,
        align: VariableAlign::Left,
        measure: VariableMeasure::Nominal,
        role: VariableRole::Input,
    }
}

fn build_config(dep_vars: &[&str], factors: &[&str], covars: &[&str]) -> MultivariateConfig {
    let factors_var: Vec<String> = factors
        .iter()
        .map(|v| v.to_string())
        .chain(covars.iter().map(|v| v.to_string()))
        .collect();

    serde_json::from_value(json!({
        "main": {
            "DepVar": dep_vars,
            "FixFactor": factors,
            "Covar": if covars.is_empty() { serde_json::Value::Null } else { json!(covars) },
            "WlsWeight": null
        },
        "model": {
            "NonCust": true,
            "Custom": false,
            "BuildCustomTerm": false,
            "FactorsVar": factors_var,
            "BuildTermMethod": "mainEffects",
            "FactorsModel": factors,
            "TermsVar": null,
            "CovModel": null,
            "RandomModel": null,
            "TermText": null,
            "SumOfSquareMethod": "typeIII",
            "Intercept": true
        },
        "contrast": {
            "FactorList": factors,
            "ContrastMethod": "none",
            "Last": true,
            "First": false
        },
        "plots": {
            "SrcList": null,
            "AxisList": null,
            "LineList": null,
            "PlotList": null,
            "FixFactorVars": null,
            "RandFactorVars": null,
            "LineChartType": false,
            "BarChartType": false,
            "IncludeErrorBars": false,
            "ConfidenceInterval": false,
            "StandardError": false,
            "Multiplier": 2,
            "IncludeRefLineForGrandMean": false,
            "YAxisStart0": false
        },
        "posthoc": {
            "SrcList": null,
            "FixFactorVars": null,
            "Lsd": false,
            "Bonfe": false,
            "Sidak": false,
            "Scheffe": false,
            "Regwf": false,
            "Regwq": false,
            "Snk": false,
            "Tu": false,
            "Tub": false,
            "Dun": false,
            "Hoc": false,
            "Gabriel": false,
            "Waller": false,
            "ErrorRatio": 100,
            "Dunnett": false,
            "CategoryMethod": "last",
            "Twosided": true,
            "LtControl": false,
            "GtControl": false,
            "Tam": false,
            "Dunt": false,
            "Games": false,
            "Dunc": false
        },
        "emmeans": {
            "SrcList": null,
            "TargetList": null,
            "CompMainEffect": false,
            "ConfiIntervalMethod": "lsdNone"
        },
        "save": {
            "ResWeighted": false,
            "PreWeighted": false,
            "StdStatistics": false,
            "CooksD": false,
            "Leverage": false,
            "UnstandardizedRes": false,
            "WeightedRes": false,
            "StandardizedRes": false,
            "StudentizedRes": false,
            "DeletedRes": false,
            "CoeffStats": false,
            "NewDataSet": false,
            "DatasetName": null,
            "WriteNewDataSet": false,
            "FilePath": null
        },
        "options": {
            "DescStats": true,
            "EstEffectSize": true,
            "ObsPower": true,
            "ParamEst": true,
            "SscpMat": false,
            "ResSscpMat": false,
            "HomogenTest": true,
            "SprVsLevel": false,
            "ResPlot": false,
            "LackOfFit": false,
            "GeneralFun": false,
            "SigLevel": 0.05,
            "CoefficientMatrix": false,
            "TransformMat": false
        },
        "bootstrap": {
            "PerformBootStrapping": false,
            "NumOfSamples": 200,
            "Seed": true,
            "SeedValue": 200000,
            "Level": 95.0,
            "Percentile": true,
            "BCa": false,
            "Simple": true,
            "Stratified": false,
            "Variables": null,
            "StrataVariables": null
        }
    }))
    .expect("valid multivariate config")
}

fn build_analysis_data(
    records: Vec<DataRecord>,
    dep_vars: &[&str],
    factors: &[&str],
    covars: &[&str],
) -> AnalysisData {
    let dep_defs = dep_vars
        .iter()
        .enumerate()
        .map(|(idx, name)| numeric_def(name, idx))
        .collect::<Vec<_>>();

    let factor_defs = factors
        .iter()
        .enumerate()
        .map(|(idx, name)| vec![nominal_def(name, dep_vars.len() + idx)])
        .collect::<Vec<_>>();

    let covar_defs = if covars.is_empty() {
        None
    } else {
        Some(
            covars
                .iter()
                .enumerate()
                .map(|(idx, name)| vec![numeric_def(name, dep_vars.len() + factors.len() + idx)])
                .collect::<Vec<_>>(),
        )
    };

    AnalysisData {
        dependent_data: vec![records.clone()],
        fix_factor_data: (0..factors.len()).map(|_| records.clone()).collect(),
        covariate_data: if covars.is_empty() {
            None
        } else {
            Some((0..covars.len()).map(|_| records.clone()).collect())
        },
        wls_data: None,
        dependent_data_defs: vec![dep_defs],
        fix_factor_data_defs: factor_defs,
        covariate_data_defs: covar_defs,
        wls_data_defs: None,
    }
}

fn make_record(entries: &[(&str, DataValue)]) -> DataRecord {
    let mut values = HashMap::new();
    for (name, value) in entries {
        values.insert((*name).to_string(), value.clone());
    }
    DataRecord { values }
}

fn dataset_a() -> (AnalysisData, MultivariateConfig) {
    let dep_vars = ["Y1", "Y2"];
    let factors = ["Group"];
    let covars: [&str; 0] = [];

    let mut records = Vec::new();
    let noise_1 = [-1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4];
    let noise_2 = [1.1, 0.8, 0.5, 0.2, 0.0, -0.1, -0.3, -0.6, -0.9, -1.2];
    let groups = ["A", "B", "C"];

    for (g_idx, group) in groups.iter().enumerate() {
        for i in 0..10 {
            let y1 = 10.0 + (g_idx as f64) * 4.0 + noise_1[i];
            let y2 = 20.0 + (g_idx as f64) * 3.0 + noise_2[i];

            records.push(
                make_record(&[
                    ("Group", DataValue::Text((*group).to_string())),
                    ("Y1", DataValue::Number(y1)),
                    ("Y2", DataValue::Number(y2)),
                ])
            );
        }
    }

    (
        build_analysis_data(records, &dep_vars, &factors, &covars),
        build_config(&dep_vars, &factors, &covars),
    )
}

fn dataset_b() -> (AnalysisData, MultivariateConfig) {
    let dep_vars = ["Y1", "Y2", "Y3"];
    let factors = ["Group", "Treatment"];
    let covars = ["Cov1"];

    let mut records = Vec::new();
    let groups = ["A", "B", "C"];
    let treatments = ["T1", "T2"];
    let noise = [-0.7, -0.5, -0.2, -0.1, 0.0, 0.2, 0.3, 0.5, 0.7, 0.9];

    for (g_idx, group) in groups.iter().enumerate() {
        for (t_idx, treatment) in treatments.iter().enumerate() {
            for i in 0..10 {
                let cov1 = 0.5 + (i as f64) * 0.3 + (g_idx as f64) * 0.2;
                let base = 12.0 + (g_idx as f64) * 2.2 + (t_idx as f64) * 1.7;

                let y1 = base + 0.5 * cov1 + noise[i];
                let y2 = (base * 1.25) - 0.4 * cov1 + noise[9 - i];
                let y3 = 6.0 + (g_idx as f64) * 1.6 - (t_idx as f64) * 1.1 + 0.8 * cov1 + noise[i] * 0.5;

                records.push(
                    make_record(&[
                        ("Group", DataValue::Text((*group).to_string())),
                        ("Treatment", DataValue::Text((*treatment).to_string())),
                        ("Cov1", DataValue::Number(cov1)),
                        ("Y1", DataValue::Number(y1)),
                        ("Y2", DataValue::Number(y2)),
                        ("Y3", DataValue::Number(y3)),
                    ])
                );
            }
        }
    }

    (
        build_analysis_data(records, &dep_vars, &factors, &covars),
        build_config(&dep_vars, &factors, &covars),
    )
}

fn dataset_c() -> (AnalysisData, MultivariateConfig) {
    let dep_vars = ["SepalLength", "SepalWidth"];
    let factors = ["Species"];
    let covars: [&str; 0] = [];

    let mut records = Vec::new();
    let counts = [("setosa", 8usize), ("versicolor", 11usize), ("virginica", 13usize)];

    for (group_idx, (species, n)) in counts.iter().enumerate() {
        for i in 0..*n {
            let phase = (i as f64) * 0.25;
            let sepal_length = 5.0 + (group_idx as f64) * 0.9 + (phase.sin() * 0.3) + (i as f64) * 0.03;
            let sepal_width = 3.4 - (group_idx as f64) * 0.25 + (phase.cos() * 0.2) - (i as f64) * 0.01;

            records.push(
                make_record(&[
                    ("Species", DataValue::Text((*species).to_string())),
                    ("SepalLength", DataValue::Number(sepal_length)),
                    ("SepalWidth", DataValue::Number(sepal_width)),
                ])
            );
        }
    }

    (
        build_analysis_data(records, &dep_vars, &factors, &covars),
        build_config(&dep_vars, &factors, &covars),
    )
}

fn assert_finite(v: f64, label: &str) {
    assert!(v.is_finite(), "{} should be finite, got {}", label, v);
}

#[test]
fn dataset_a_core_tables_are_computable() {
    let (data, config) = dataset_a();

    let box_test = calculate_box_test(&data, &config).expect("box test should compute");
    assert_finite(box_test.box_m, "box_m");
    assert!(box_test.df1 > 0, "df1 should be positive");

    let multivariate = calculate_multivariate_tests(&data, &config)
        .expect("multivariate tests should compute");
    assert!(!multivariate.effects.is_empty(), "multivariate effects should not be empty");
    assert!(multivariate.effects.contains_key("Group"), "Group multivariate effect should exist");

    let between = calculate_tests_between_subjects_effects(&data, &config)
        .expect("between-subjects effects should compute");
    assert!(between.effects.contains_key("Y1"), "Y1 effects should exist");
    assert!(between.effects.contains_key("Y2"), "Y2 effects should exist");

    let y1_group = between.effects
        .get("Y1")
        .and_then(|m| m.get("Group"))
        .expect("Y1 Group effect should exist");
    assert!((y1_group.df as i32) == 2, "Y1 Group df should be 2");
    assert!(y1_group.f_value > 100.0, "Y1 Group F should be strongly significant");

    let params = calculate_parameter_estimates(&data, &config)
        .expect("parameter estimates should compute");
    assert!(params.estimates.contains_key("Y1"), "Y1 parameters should exist");
    assert!(params.estimates.contains_key("Y2"), "Y2 parameters should exist");
    assert_eq!(box_test.df1, 6);
    assert!(box_test.f >= 0.0, "Box F should be non-negative");
}

#[test]
fn dataset_b_core_tables_are_computable() {
    let (data, config) = dataset_b();

    let box_test = calculate_box_test(&data, &config).expect("box test should compute");
    assert_finite(box_test.box_m, "box_m");
    assert_finite(box_test.f, "box_f");

    let multivariate = calculate_multivariate_tests(&data, &config)
        .expect("multivariate tests should compute");
    assert!(!multivariate.effects.is_empty(), "multivariate effects should not be empty");
    assert!(multivariate.effects.contains_key("Group"), "Group multivariate effect should exist");
    assert!(multivariate.effects.contains_key("Treatment"), "Treatment multivariate effect should exist");
    assert!(multivariate.effects.contains_key("Group*Treatment"), "Interaction multivariate effect should exist");

    let between = calculate_tests_between_subjects_effects(&data, &config)
        .expect("between-subjects effects should compute");
    assert!(between.effects.contains_key("Y1"), "Y1 effects should exist");
    assert!(between.effects.contains_key("Y2"), "Y2 effects should exist");
    assert!(between.effects.contains_key("Y3"), "Y3 effects should exist");

    let params = calculate_parameter_estimates(&data, &config)
        .expect("parameter estimates should compute");
    assert!(params.estimates.contains_key("Y1"), "Y1 parameters should exist");
    assert!(params.estimates.contains_key("Y2"), "Y2 parameters should exist");
    assert!(params.estimates.contains_key("Y3"), "Y3 parameters should exist");

    let y3_group = between.effects
        .get("Y3")
        .and_then(|m| m.get("Group"))
        .expect("Y3 Group effect should exist");
    assert!((y3_group.df as i32) == 2, "Y3 Group df should be 2");
    assert!(box_test.df1 == 30, "Dataset B Box df1 should be 30");
    assert!(box_test.f >= 0.0, "Box F should be non-negative");
}

#[test]
fn dataset_c_core_tables_are_computable() {
    let (data, config) = dataset_c();

    let box_test = calculate_box_test(&data, &config).expect("box test should compute");
    assert_finite(box_test.box_m, "box_m");

    let multivariate = calculate_multivariate_tests(&data, &config)
        .expect("multivariate tests should compute");
    assert!(!multivariate.effects.is_empty(), "multivariate effects should not be empty");
    assert!(multivariate.effects.contains_key("Species"), "Species multivariate effect should exist");

    let between = calculate_tests_between_subjects_effects(&data, &config)
        .expect("between-subjects effects should compute");
    assert!(between.effects.contains_key("SepalLength"), "SepalLength effects should exist");
    assert!(between.effects.contains_key("SepalWidth"), "SepalWidth effects should exist");

    let params = calculate_parameter_estimates(&data, &config)
        .expect("parameter estimates should compute");
    assert!(params.estimates.contains_key("SepalLength"), "SepalLength parameters should exist");
    assert!(params.estimates.contains_key("SepalWidth"), "SepalWidth parameters should exist");
    assert_eq!(box_test.df1, 6);
    assert!(box_test.f > 0.0, "Box F should be positive for dataset C");
}

// Hotelling T² one-population validation against APG Modul 3 reference values.
// Dataset: mtcars (32 cars × 4 selected DVs: mpg, disp, hp, wt).
// μ₀ = [20, 200, 150, 3].
// Expected: T² ≈ 10.78587, F ≈ 2.4355, df1=4, df2=28, p ≈ 0.07058.
fn mtcars_records() -> Vec<DataRecord> {
    // Columns: mpg, disp, hp, wt (R's mtcars built-in dataset).
    let rows: [(f64, f64, f64, f64); 32] = [
        (21.0, 160.0, 110.0, 2.620),
        (21.0, 160.0, 110.0, 2.875),
        (22.8, 108.0, 93.0, 2.320),
        (21.4, 258.0, 110.0, 3.215),
        (18.7, 360.0, 175.0, 3.440),
        (18.1, 225.0, 105.0, 3.460),
        (14.3, 360.0, 245.0, 3.570),
        (24.4, 146.7, 62.0, 3.190),
        (22.8, 140.8, 95.0, 3.150),
        (19.2, 167.6, 123.0, 3.440),
        (17.8, 167.6, 123.0, 3.440),
        (16.4, 275.8, 180.0, 4.070),
        (17.3, 275.8, 180.0, 3.730),
        (15.2, 275.8, 180.0, 3.780),
        (10.4, 472.0, 205.0, 5.250),
        (10.4, 460.0, 215.0, 5.424),
        (14.7, 440.0, 230.0, 5.345),
        (32.4, 78.7, 66.0, 2.200),
        (30.4, 75.7, 52.0, 1.615),
        (33.9, 71.1, 65.0, 1.835),
        (21.5, 120.1, 97.0, 2.465),
        (15.5, 318.0, 150.0, 3.520),
        (15.2, 304.0, 150.0, 3.435),
        (13.3, 350.0, 245.0, 3.840),
        (19.2, 400.0, 175.0, 3.845),
        (27.3, 79.0, 66.0, 1.935),
        (26.0, 120.3, 91.0, 2.140),
        (30.4, 95.1, 113.0, 1.513),
        (15.8, 351.0, 264.0, 3.170),
        (19.7, 145.0, 175.0, 2.770),
        (15.0, 301.0, 335.0, 3.570),
        (21.4, 121.0, 109.0, 2.780),
    ];

    rows.iter()
        .map(|(mpg, disp, hp, wt)| {
            make_record(&[
                ("mpg", DataValue::Number(*mpg)),
                ("disp", DataValue::Number(*disp)),
                ("hp", DataValue::Number(*hp)),
                ("wt", DataValue::Number(*wt)),
            ])
        })
        .collect()
}

#[test]
fn hotelling_t2_one_population_mtcars_matches_apg_modul_3() {
    let dep_vars = ["mpg", "disp", "hp", "wt"];
    let factors: [&str; 0] = [];
    let covars: [&str; 0] = [];

    let records = mtcars_records();
    let data = build_analysis_data(records, &dep_vars, &factors, &covars);
    let mut config = build_config(&dep_vars, &factors, &covars);
    config.main.test_values = Some(vec![20.0, 200.0, 150.0, 3.0]);

    let multivariate = calculate_multivariate_tests(&data, &config)
        .expect("multivariate tests should compute");

    let intercept = multivariate
        .effects
        .get("Intercept")
        .expect("Intercept effect should exist");

    let hotelling = intercept
        .get("Hotelling's Trace")
        .expect("Hotelling's Trace entry should exist");

    // T² = (n − 1) · Hotelling's Trace; here n = 32 so factor = 31.
    let t_squared = hotelling.value * 31.0;
    assert!(
        (t_squared - 10.78587).abs() < 0.001,
        "Expected T² ≈ 10.78587, got {}",
        t_squared
    );

    assert!(
        (hotelling.f - 2.4355).abs() < 0.001,
        "Expected F ≈ 2.4355, got {}",
        hotelling.f
    );

    assert!(
        (hotelling.hypothesis_df - 4.0).abs() < 1e-9,
        "Expected hypothesis_df = 4, got {}",
        hotelling.hypothesis_df
    );

    assert!(
        (hotelling.error_df - 28.0).abs() < 1e-9,
        "Expected error_df = 28, got {}",
        hotelling.error_df
    );

    assert!(
        (hotelling.significance - 0.07058).abs() < 0.001,
        "Expected significance ≈ 0.07058, got {}",
        hotelling.significance
    );
}

#[test]
fn hotelling_t2_with_zero_mu0_matches_default_intercept() {
    // Backward compatibility: explicit zero μ₀ vector should produce the
    // same Intercept H matrix that the pre-feature code computed implicitly.
    let dep_vars = ["mpg", "disp", "hp", "wt"];
    let factors: [&str; 0] = [];
    let covars: [&str; 0] = [];

    let records = mtcars_records();
    let data = build_analysis_data(records, &dep_vars, &factors, &covars);

    // Baseline: TestValues = None → original behaviour (μ₀ = 0).
    let baseline_config = build_config(&dep_vars, &factors, &covars);
    let baseline = calculate_multivariate_tests(&data, &baseline_config)
        .expect("baseline multivariate tests should compute");
    let baseline_hotelling = baseline
        .effects
        .get("Intercept")
        .and_then(|m| m.get("Hotelling's Trace"))
        .expect("baseline Hotelling entry");

    // Explicit zero vector.
    let mut zero_config = build_config(&dep_vars, &factors, &covars);
    zero_config.main.test_values = Some(vec![0.0; 4]);
    let with_zero = calculate_multivariate_tests(&data, &zero_config)
        .expect("zero-μ₀ multivariate tests should compute");
    let zero_hotelling = with_zero
        .effects
        .get("Intercept")
        .and_then(|m| m.get("Hotelling's Trace"))
        .expect("zero-μ₀ Hotelling entry");

    assert!(
        (baseline_hotelling.value - zero_hotelling.value).abs() < 1e-9,
        "Hotelling's Trace must match baseline when μ₀ = 0"
    );
    assert!(
        (baseline_hotelling.f - zero_hotelling.f).abs() < 1e-9,
        "F must match baseline when μ₀ = 0"
    );
}

#[test]
fn hotelling_t2_length_mismatch_returns_error() {
    let dep_vars = ["mpg", "disp", "hp", "wt"];
    let factors: [&str; 0] = [];
    let covars: [&str; 0] = [];

    let records = mtcars_records();
    let data = build_analysis_data(records, &dep_vars, &factors, &covars);
    let mut config = build_config(&dep_vars, &factors, &covars);
    // Only 3 values for 4 DVs.
    config.main.test_values = Some(vec![20.0, 200.0, 150.0]);

    let result = calculate_multivariate_tests(&data, &config);
    assert!(
        result.is_err(),
        "Expected length mismatch to surface as an error"
    );
}

#[test]
fn multivariate_performance_dataset_b_under_five_seconds() {
    use std::time::Instant;

    let (data, config) = dataset_b();
    let start = Instant::now();

    let _ = calculate_multivariate_tests(&data, &config).expect("multivariate tests should compute");
    let _ = calculate_tests_between_subjects_effects(&data, &config)
        .expect("between-subjects effects should compute");

    let elapsed = start.elapsed();
    assert!(
        elapsed.as_secs_f64() < 5.0,
        "Performance threshold exceeded: {:?}",
        elapsed
    );
}

// ─── Hotelling T² two-sample (Welch-Satterthwaite) validation ────────────────

/// Deterministic two-group multivariate dataset with deliberately different
/// covariance structures (heteroscedastic). Group "L" is laki-laki (n=20,
/// lower-variance), group "P" is perempuan (n=24, higher-variance). Four
/// dependent variables (X1..X4) are generated from a fixed pattern so the
/// computation is reproducible across machines.
fn two_sample_heteroscedastic_dataset() -> (AnalysisData, MultivariateConfig) {
    let dep_vars = ["X1", "X2", "X3", "X4"];
    let factors = ["emosi"];
    let covars: [&str; 0] = [];

    let mut records: Vec<DataRecord> = Vec::new();
    let l_noise: [f64; 20] = [
        -0.6, -0.4, -0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3, 0.35,
        -0.5, -0.2, -0.1, 0.0, 0.05, 0.15, 0.25, 0.32, 0.4, 0.5,
    ];
    let p_noise: [f64; 24] = [
        -2.0, -1.6, -1.3, -1.0, -0.7, -0.4, -0.2, 0.0, 0.2, 0.4,
        0.7, 1.0, 1.3, 1.6, 1.9, 2.2, -1.8, -1.1, -0.5, 0.1,
        0.6, 1.2, 1.7, 2.3,
    ];
    for (i, &n) in l_noise.iter().enumerate() {
        let phase = (i as f64) * 0.17;
        let x1 = 12.0 + n + phase.sin() * 0.2;
        let x2 = 18.0 + 0.6 * n + phase.cos() * 0.3;
        let x3 = 8.0 - 0.4 * n + (i as f64) * 0.02;
        let x4 = 25.0 + 0.5 * n - phase.sin() * 0.15;
        records.push(make_record(&[
            ("emosi", DataValue::Text("L".to_string())),
            ("X1", DataValue::Number(x1)),
            ("X2", DataValue::Number(x2)),
            ("X3", DataValue::Number(x3)),
            ("X4", DataValue::Number(x4)),
        ]));
    }
    for (i, &n) in p_noise.iter().enumerate() {
        let phase = (i as f64) * 0.21 + 1.3;
        let x1 = 14.5 + n + phase.sin() * 0.5;
        let x2 = 20.0 + 0.8 * n + phase.cos() * 0.6;
        let x3 = 9.5 - 0.7 * n + (i as f64) * 0.04;
        let x4 = 27.0 + 0.9 * n - phase.sin() * 0.4;
        records.push(make_record(&[
            ("emosi", DataValue::Text("P".to_string())),
            ("X1", DataValue::Number(x1)),
            ("X2", DataValue::Number(x2)),
            ("X3", DataValue::Number(x3)),
            ("X4", DataValue::Number(x4)),
        ]));
    }

    let data = build_analysis_data(records, &dep_vars, &factors, &covars);
    let config = build_config(&dep_vars, &factors, &covars);
    (data, config)
}

/// Manual T² (pooled) computation as ground truth: T² = (n1·n2)/(n1+n2) ·
/// dᵀ Sp⁻¹ d with Sp the pooled covariance ((n1−1)S1 + (n2−1)S2)/(n1+n2−2).
fn manual_pooled_t2(
    g1_rows: &[[f64; 4]],
    g2_rows: &[[f64; 4]],
) -> (f64, f64, usize) {
    use nalgebra::{ DMatrix, DVector };

    let summarize = |rows: &[[f64; 4]]| -> (DVector<f64>, DMatrix<f64>, usize) {
        let n = rows.len();
        let mut mean = [0.0f64; 4];
        for r in rows {
            for j in 0..4 {
                mean[j] += r[j];
            }
        }
        for m in &mut mean {
            *m /= n as f64;
        }
        let mut cov = DMatrix::<f64>::zeros(4, 4);
        for r in rows {
            for i in 0..4 {
                for j in 0..4 {
                    cov[(i, j)] += (r[i] - mean[i]) * (r[j] - mean[j]);
                }
            }
        }
        cov /= (n - 1) as f64;
        (DVector::from_vec(mean.to_vec()), cov, n)
    };

    let (m1, s1, n1) = summarize(g1_rows);
    let (m2, s2, n2) = summarize(g2_rows);
    let d = &m1 - &m2;
    let pooled = ((n1 - 1) as f64 * &s1 + (n2 - 1) as f64 * &s2)
        / ((n1 + n2 - 2) as f64);
    let pooled_inv = pooled.try_inverse().expect("Sp invertible");
    let scale = (n1 as f64) * (n2 as f64) / ((n1 + n2) as f64);
    let t2 = scale * (d.transpose() * &pooled_inv * &d)[(0, 0)];
    let p = 4.0;
    let df_e = (n1 + n2 - 2) as f64;
    let f = ((df_e - p + 1.0) / (p * df_e)) * t2;
    (t2, f, n1 + n2 - 2)
}

/// Manual Welch T² + Krishnamoorthy-Yu ν as ground truth.
fn manual_welch_t2(
    g1_rows: &[[f64; 4]],
    g2_rows: &[[f64; 4]],
) -> (f64, f64, f64) {
    use nalgebra::{ DMatrix, DVector };

    let summarize = |rows: &[[f64; 4]]| -> (DVector<f64>, DMatrix<f64>, usize) {
        let n = rows.len();
        let mut mean = [0.0f64; 4];
        for r in rows {
            for j in 0..4 {
                mean[j] += r[j];
            }
        }
        for m in &mut mean {
            *m /= n as f64;
        }
        let mut cov = DMatrix::<f64>::zeros(4, 4);
        for r in rows {
            for i in 0..4 {
                for j in 0..4 {
                    cov[(i, j)] += (r[i] - mean[i]) * (r[j] - mean[j]);
                }
            }
        }
        cov /= (n - 1) as f64;
        (DVector::from_vec(mean.to_vec()), cov, n)
    };

    let (m1, s1, n1) = summarize(g1_rows);
    let (m2, s2, n2) = summarize(g2_rows);
    let v1 = &s1 / (n1 as f64);
    let v2 = &s2 / (n2 as f64);
    let v = &v1 + &v2;
    let v_inv = v.clone().try_inverse().expect("V invertible");
    let d = &m1 - &m2;
    let t2 = (d.transpose() * &v_inv * &d)[(0, 0)];

    let p = 4.0_f64;
    let denom = p * p + p;
    let m1m = &v1 * &v_inv;
    let m2m = &v2 * &v_inv;
    let tr1 = m1m.trace();
    let tr2 = m2m.trace();
    let tr1_sq = (&m1m * &m1m).trace();
    let tr2_sq = (&m2m * &m2m).trace();
    let inv_nu = (1.0 / (n1 as f64 - 1.0)) * (tr1_sq + tr1.powi(2)) / denom
        + (1.0 / (n2 as f64 - 1.0)) * (tr2_sq + tr2.powi(2)) / denom;
    let nu = 1.0 / inv_nu;
    let f = ((nu - p + 1.0) / (p * nu)) * t2;
    (t2, nu, f)
}

fn extract_two_sample_rows(
    data: &AnalysisData,
) -> (Vec<[f64; 4]>, Vec<[f64; 4]>) {
    let mut l = Vec::new();
    let mut p = Vec::new();
    for record in &data.dependent_data[0] {
        let label = match record.values.get("emosi") {
            Some(DataValue::Text(s)) => s.clone(),
            _ => continue,
        };
        let row = [
            match record.values.get("X1") { Some(DataValue::Number(v)) => *v, _ => continue },
            match record.values.get("X2") { Some(DataValue::Number(v)) => *v, _ => continue },
            match record.values.get("X3") { Some(DataValue::Number(v)) => *v, _ => continue },
            match record.values.get("X4") { Some(DataValue::Number(v)) => *v, _ => continue },
        ];
        if label == "L" {
            l.push(row);
        } else {
            p.push(row);
        }
    }
    (l, p)
}

#[test]
fn hotelling_t2_two_sample_pooled_matches_manual() {
    let (data, mut config) = two_sample_heteroscedastic_dataset();
    config.main.variance_mode =
        crate::models::config::VarianceMode::Pooled;

    let (l_rows, p_rows) = extract_two_sample_rows(&data);
    let (t2_manual, f_manual, df_e_manual) =
        manual_pooled_t2(&l_rows, &p_rows);

    let multivariate = calculate_multivariate_tests(&data, &config)
        .expect("multivariate tests should compute");
    let entry = multivariate
        .effects
        .get("emosi")
        .and_then(|m| m.get("Hotelling's Trace"))
        .expect("emosi Hotelling's Trace entry should exist");

    // For pooled MANOVA two-sample case, hotelling_trace = T²/(n1+n2−2).
    let t2_from_entry = entry.value * (df_e_manual as f64);
    assert!(
        (t2_from_entry - t2_manual).abs() < 1e-6,
        "Pooled T² mismatch — manual {} vs pipeline {}",
        t2_manual,
        t2_from_entry
    );
    assert!(
        (entry.f - f_manual).abs() < 1e-6,
        "Pooled F mismatch — manual {} vs pipeline {}",
        f_manual,
        entry.f
    );
}

#[test]
fn hotelling_t2_two_sample_welch_matches_manual_krishnamoorthy_yu() {
    let (data, mut config) = two_sample_heteroscedastic_dataset();
    config.main.variance_mode =
        crate::models::config::VarianceMode::Welch;

    let (l_rows, p_rows) = extract_two_sample_rows(&data);
    let (t2_manual, nu_manual, f_manual) =
        manual_welch_t2(&l_rows, &p_rows);

    let multivariate = calculate_multivariate_tests(&data, &config)
        .expect("Welch multivariate tests should compute");
    let entry = multivariate
        .effects
        .get("emosi")
        .and_then(|m| m.get("Hotelling's Trace"))
        .expect("emosi Welch Hotelling entry should exist");

    // In Welch mode the entry stores T² directly in `value` and ν in
    // hypothesis_df + error_df − 1 (since hypothesis_df = p, error_df = ν − p + 1).
    assert!(
        (entry.value - t2_manual).abs() < 1e-6,
        "Welch T² mismatch — manual {} vs pipeline {}",
        t2_manual,
        entry.value
    );
    assert!(
        (entry.f - f_manual).abs() < 1e-6,
        "Welch F mismatch — manual {} vs pipeline {}",
        f_manual,
        entry.f
    );
    let nu_from_entry = entry.error_df + entry.hypothesis_df - 1.0;
    assert!(
        (nu_from_entry - nu_manual).abs() < 1e-6,
        "Welch ν mismatch — manual {} vs pipeline {}",
        nu_manual,
        nu_from_entry
    );

    // Pillai/Wilks/Roy must NOT be emitted in Welch mode — Welch override
    // installs only the Hotelling's Trace entry.
    let test_map = multivariate.effects.get("emosi").unwrap();
    assert_eq!(test_map.len(), 1, "Welch should emit one statistic only");
}

#[test]
fn welch_mode_requires_exactly_two_groups_returns_error() {
    // dataset_a has 3 levels for "Group" — Welch should refuse.
    let (data, mut config) = dataset_a();
    config.main.variance_mode =
        crate::models::config::VarianceMode::Welch;

    let result = calculate_multivariate_tests(&data, &config);
    assert!(
        result.is_err(),
        "Expected Welch with 3-level factor to error out"
    );
    let msg = result.unwrap_err();
    assert!(
        msg.contains("two levels"),
        "Error message should mention the two-level requirement; got: {}",
        msg
    );
}
