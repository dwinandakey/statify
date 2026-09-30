//! Pendukung test white-box RM: membaca data acuan dan nilai SPSS 27 dari
//! testing/glm-rm-reference, lalu membangun AnalysisData dan
//! RepeatedMeasuresConfig persis seperti buildPayload() di
//! testing/glm-rm-reference/harness/statify-rm.mjs (tata letak
//! variable-major, sama dengan services/repeated-measures-analysis.ts).
//! Nilai harapan selalu berasal dari berkas SPSS/R, tidak dari Statify.
use std::path::PathBuf;

use serde_json::{ json, Map, Value };

use crate::models::{ config::RepeatedMeasuresConfig, data::AnalysisData };

/// Akar repositori (crate ada di frontend/components/Modals/Analyze/
/// general-linear-model/repeated-measures/rust).
pub fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../../../../..")
}

pub fn read_text(rel: &str) -> String {
    let path = repo_root().join(rel);
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("gagal membaca {}: {}", path.display(), e))
}

/// Baris CSV sebagai objek JSON: sel kosong -> null, angka -> number,
/// selain itu string (sama dengan readCsv() di statify-rm.mjs).
pub fn read_csv(rel: &str) -> Vec<Map<String, Value>> {
    let text = read_text(rel);
    let mut lines = text.trim().lines();
    let head: Vec<String> = lines.next().expect("header CSV").split(',').map(|s| s.trim().to_string()).collect();
    lines
        .map(|line| {
            let cells: Vec<&str> = line.split(',').collect();
            head.iter()
                .enumerate()
                .map(|(i, name)| {
                    let raw = cells.get(i).copied().unwrap_or("").trim();
                    let v = if raw.is_empty() {
                        Value::Null
                    } else if let Ok(x) = raw.parse::<f64>() {
                        json!(x)
                    } else {
                        json!(raw)
                    };
                    (name.clone(), v)
                })
                .collect()
        })
        .collect()
}

pub struct Design<'a> {
    pub factors: Vec<(&'a str, usize)>,
    pub measures: Vec<(&'a str, Vec<&'a str>)>,
    pub between: Vec<&'a str>,
    pub options: Value,
    pub contrast: Option<&'a str>,
}

fn var_def(name: &str, i: usize, nominal: bool, string: bool) -> Value {
    json!({
        "id": i + 1, "columnIndex": i, "name": name,
        "type": if string { "STRING" } else { "NUMERIC" },
        "width": 8, "decimals": if string { 0 } else { 2 },
        "label": "", "values": [], "missing": [], "columns": 72,
        "align": if string { "left" } else { "right" },
        "measure": if nominal { "nominal" } else { "scale" }, "role": "input"
    })
}

fn cell_levels(factors: &[(&str, usize)]) -> Vec<Vec<usize>> {
    let mut tuples: Vec<Vec<usize>> = vec![vec![]];
    for (_, levels) in factors {
        let mut next = Vec::new();
        for t in &tuples {
            for l in 1..=*levels {
                let mut u = t.clone();
                u.push(l);
                next.push(u);
            }
        }
        tuples = next;
    }
    tuples
}

/// Payload (data, config) seperti buildPayload() di harness RM.
pub fn build_payload(rows: &[Map<String, Value>], design: &Design) -> (AnalysisData, RepeatedMeasuresConfig) {
    let mut cfg: Value = serde_json::from_str(&read_text("testing/glm-rm-reference/harness/config-template.json")).unwrap();
    let tuples = cell_levels(&design.factors);
    let mut encoded = Vec::new();
    let mut subject_cols = Vec::new();
    for (measure, cols) in &design.measures {
        for (c, col) in cols.iter().enumerate() {
            let levels: Vec<String> = tuples[c].iter().map(|l| l.to_string()).collect();
            encoded.push(format!("{}_({},{})", col, levels.join(","), measure));
            subject_cols.push(*col);
        }
    }
    let between: Vec<String> = design.between.iter().map(|s| s.to_string()).collect();
    cfg["main"]["SubVar"] = json!(encoded);
    cfg["main"]["FactorsVar"] = if between.is_empty() { Value::Null } else { json!(between) };
    cfg["main"]["Covariates"] = Value::Null;
    cfg["model"]["DefFactors"] = json!(design.factors.iter().map(|(n, _)| *n).collect::<Vec<_>>().join(";"));
    cfg["model"]["BetSubVar"] = json!(between);
    cfg["emmeans"]["SrcList"] = json!(between);
    cfg["plots"]["SrcList"] = if between.is_empty() { Value::Null } else { json!(between) };
    if !between.is_empty() {
        cfg["posthoc"]["SrcList"] = json!(between);
    }
    if let Value::Object(opts) = &design.options {
        for (k, v) in opts {
            cfg["options"][k] = v.clone();
        }
    }
    if let Some(contrast) = design.contrast {
        cfg["contrast"]["FactorList"] = json!(design.factors.iter().map(|(n, _)| format!("{}({})", n, contrast)).collect::<Vec<_>>());
    }

    let subject_data: Vec<Value> = rows
        .iter()
        .map(|r| {
            let rec: Map<String, Value> = subject_cols
                .iter()
                .enumerate()
                .map(|(i, col)| (encoded[i].clone(), r.get(*col).cloned().unwrap_or(Value::Null)))
                .collect();
            json!([rec])
        })
        .collect();
    let factors_data: Vec<Value> = between
        .iter()
        .map(|n| json!(rows.iter().map(|r| json!({ n.as_str(): r.get(n).cloned().unwrap_or(Value::Null) })).collect::<Vec<_>>()))
        .collect();
    let is_string = |n: &str| rows.iter().any(|r| r.get(n).map_or(false, |v| v.is_string()));
    let data = json!({
        "subject_data": subject_data,
        "factors_data": factors_data,
        "covariate_data": [],
        "subject_data_defs": encoded.iter().enumerate().map(|(i, n)| json!([var_def(n, i, false, false)])).collect::<Vec<_>>(),
        "factors_data_defs": between.iter().enumerate().map(|(i, n)| json!([var_def(n, subject_cols.len() + i, true, is_string(n))])).collect::<Vec<_>>(),
        "covariate_data_defs": []
    });
    (
        serde_json::from_value(data).expect("AnalysisData valid"),
        serde_json::from_value(cfg).expect("RepeatedMeasuresConfig valid"),
    )
}

/// Nilai SPSS 27 RM (testing/glm-rm-reference/spss-output/spss-values.json)
/// untuk satu dataset dan tabel.
pub fn spss_rows(dataset: &str, table: &str) -> Vec<Value> {
    let all: Vec<Value> = serde_json::from_str(&read_text("testing/glm-rm-reference/spss-output/spss-values.json")).unwrap();
    all.into_iter().filter(|r| r["dataset"] == dataset && r["table"] == table).collect()
}

/// Kriteria validasi skripsi: |Statify - SPSS| <= 0,001.
pub const SPSS_TOL: f64 = 1e-3;

/// Pengumpul perbandingan: setiap nilai dicatat; test gagal bila ada satu
/// saja yang di luar toleransi atau tidak punya padanan di Statify.
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
