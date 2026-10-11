//! Pendukung test white-box MV: membaca data acuan (testing/glm-mv-reference)
//! dan nilai SPSS 27, lalu membangun AnalysisData/MultivariateConfig seperti
//! services/multivariate-analysis.ts (satu slot per variabel, getSlicedData)
//! setelah listwise (seperti listwise_complete_cases di wasm/constructor.rs).
//! Nilai harapan selalu dari berkas SPSS/R, tidak dari Statify.
use std::path::PathBuf;

use serde_json::{ json, Map, Value };

use crate::models::{ config::MultivariateConfig, data::AnalysisData };

pub fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../../../../..")
}

pub fn read_text(rel: &str) -> String {
    let path = repo_root().join(rel);
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("gagal membaca {}: {}", path.display(), e))
}

/// Baris CSV yang lengkap pada `vars` (listwise), sebagai objek JSON.
pub fn read_csv_complete(rel: &str, vars: &[&str]) -> Vec<Map<String, Value>> {
    let text = read_text(rel);
    let mut lines = text.trim_end().lines();
    let head: Vec<String> = lines.next().unwrap().split(',').map(|s| s.trim().trim_matches('"').to_string()).collect();
    lines
        .map(|line| {
            let cells: Vec<&str> = line.split(',').collect();
            head.iter()
                .enumerate()
                .map(|(i, name)| {
                    let raw = cells.get(i).copied().unwrap_or("").trim();
                    (name.clone(), raw.parse::<f64>().map(|x| json!(x)).unwrap_or(Value::Null))
                })
                .collect::<Map<String, Value>>()
        })
        .filter(|r| vars.iter().all(|v| r.get(*v).map_or(false, |x| x.is_number())))
        .collect()
}

fn def(name: &str, i: usize, nominal: bool) -> Value {
    json!({
        "id": i + 1, "columnIndex": i, "name": name, "type": "NUMERIC", "width": 8, "decimals": 2,
        "label": name, "values": [], "missing": [], "columns": 8, "align": "right",
        "measure": if nominal { "nominal" } else { "scale" }, "role": "input"
    })
}

pub struct Spec<'a> {
    pub dep: Vec<&'a str>,
    pub factors: Vec<&'a str>,
    pub test_values: Option<Vec<f64>>,
    pub variance_mode: &'a str,
    pub sig_level: f64,
}

impl<'a> Spec<'a> {
    pub fn new(dep: &[&'a str], factors: &[&'a str]) -> Self {
        Spec { dep: dep.to_vec(), factors: factors.to_vec(), test_values: None, variance_mode: "Pooled", sig_level: 0.05 }
    }
}

pub fn config(spec: &Spec) -> MultivariateConfig {
    serde_json::from_value(json!({
        "main": { "DepVar": spec.dep, "FixFactor": spec.factors, "Covar": null, "WlsWeight": null,
                  "TestValues": spec.test_values, "VarianceMode": spec.variance_mode },
        "model": { "NonCust": true, "Custom": false, "BuildCustomTerm": false, "FactorsVar": spec.factors,
                   "BuildTermMethod": "mainEffects", "FactorsModel": spec.factors, "TermsVar": null, "CovModel": null,
                   "RandomModel": null, "TermText": null, "SumOfSquareMethod": "typeIII", "Intercept": true },
        "contrast": { "FactorList": spec.factors, "ContrastMethod": "none", "Last": true, "First": false },
        "plots": { "SrcList": null, "AxisList": null, "LineList": null, "PlotList": null, "FixFactorVars": null,
                   "RandFactorVars": null, "LineChartType": false, "BarChartType": false, "IncludeErrorBars": false,
                   "ConfidenceInterval": false, "StandardError": false, "Multiplier": 2,
                   "IncludeRefLineForGrandMean": false, "YAxisStart0": false },
        "posthoc": { "SrcList": null, "FixFactorVars": null, "Lsd": false, "Bonfe": false, "Sidak": false,
                     "Scheffe": false, "Regwf": false, "Regwq": false, "Snk": false, "Tu": false, "Tub": false,
                     "Dun": false, "Hoc": false, "Gabriel": false, "Waller": false, "ErrorRatio": 100,
                     "Dunnett": false, "CategoryMethod": "last", "Twosided": true, "LtControl": false,
                     "GtControl": false, "Tam": false, "Dunt": false, "Games": false, "Dunc": false },
        "emmeans": { "SrcList": null, "TargetList": null, "CompMainEffect": false, "ConfiIntervalMethod": "lsdNone" },
        "save": { "ResWeighted": false, "PreWeighted": false, "StdStatistics": false, "CooksD": false,
                  "Leverage": false, "UnstandardizedRes": false, "WeightedRes": false, "StandardizedRes": false,
                  "StudentizedRes": false, "DeletedRes": false, "CoeffStats": false, "NewDataSet": false,
                  "DatasetName": null, "WriteNewDataSet": false, "FilePath": null },
        "options": { "DescStats": true, "EstEffectSize": true, "ObsPower": true, "ParamEst": false,
                     "SscpMat": false, "ResSscpMat": false, "HomogenTest": false, "SprVsLevel": false,
                     "ResPlot": false, "LackOfFit": false, "GeneralFun": false, "SigLevel": spec.sig_level,
                     "CoefficientMatrix": false, "TransformMat": false },
        "bootstrap": { "PerformBootStrapping": false, "NumOfSamples": 200, "Seed": true, "SeedValue": 200000,
                       "Level": 95.0, "Percentile": true, "BCa": false, "Simple": true, "Stratified": false,
                       "Variables": null, "StrataVariables": null }
    }))
    .expect("MultivariateConfig valid")
}

/// AnalysisData dengan satu slot per variabel (tata letak getSlicedData).
pub fn data(rows: &[Map<String, Value>], spec: &Spec) -> AnalysisData {
    let slot = |name: &str| json!(rows.iter().map(|r| json!({ name: r[name].clone() })).collect::<Vec<_>>());
    serde_json::from_value(json!({
        "dependent_data": spec.dep.iter().map(|v| slot(v)).collect::<Vec<_>>(),
        "fix_factor_data": spec.factors.iter().map(|v| slot(v)).collect::<Vec<_>>(),
        "covariate_data": null,
        "wls_data": null,
        "dependent_data_defs": spec.dep.iter().enumerate().map(|(i, v)| json!([def(v, i, false)])).collect::<Vec<_>>(),
        "fix_factor_data_defs": spec.factors.iter().enumerate().map(|(i, v)| json!([def(v, spec.dep.len() + i, true)])).collect::<Vec<_>>(),
        "covariate_data_defs": null,
        "wls_data_defs": null
    }))
    .expect("AnalysisData valid")
}

pub fn load(rel: &str, spec: &Spec) -> (AnalysisData, MultivariateConfig) {
    let vars: Vec<&str> = spec.dep.iter().chain(spec.factors.iter()).copied().collect();
    (data(&read_csv_complete(rel, &vars), spec), config(spec))
}

/// Nilai SPSS 27 MV: spss-values.json (mv1..mv8) dan
/// testing/final/bagian2/spss-values-bagian2.json (mv9, mv6 Type I/II, δ₀).
pub fn spss_rows(config: &str, table: &str) -> Vec<Value> {
    let mut all: Vec<Value> = serde_json::from_str(&read_text("testing/glm-mv-reference/spss-output/spss-values.json")).unwrap();
    let extra: Vec<Value> = serde_json::from_str(&read_text("testing/final/bagian2/spss-values-bagian2.json")).unwrap();
    all.extend(extra);
    all.into_iter().filter(|r| r["config"] == config && r["table"] == table).collect()
}

pub const SPSS_TOL: f64 = 1e-3;

#[derive(Default)]
pub struct Comparison {
    pub compared: usize,
    pub failures: Vec<String>,
}

impl Comparison {
    pub fn check(&mut self, label: &str, statify: Option<f64>, expected: f64, tol: f64) {
        self.compared += 1;
        match statify {
            Some(v) if (v - expected).abs() <= tol => {}
            Some(v) => self.failures.push(format!("{}: Statify {} vs acuan {} (selisih {:.3e})", label, v, expected, (v - expected).abs())),
            None => self.failures.push(format!("{}: tidak ada nilai Statify (acuan {})", label, expected)),
        }
    }

    pub fn finish(self, name: &str) {
        println!("{}: {} nilai acuan dibandingkan, {} lulus, {} gagal", name, self.compared, self.compared - self.failures.len(), self.failures.len());
        assert!(self.compared > 0, "{}: tidak ada nilai acuan yang dibandingkan", name);
        assert!(self.failures.is_empty(), "{}: {} dari {} nilai di luar toleransi:\n{}", name, self.failures.len(), self.compared, self.failures.join("\n"));
    }
}
