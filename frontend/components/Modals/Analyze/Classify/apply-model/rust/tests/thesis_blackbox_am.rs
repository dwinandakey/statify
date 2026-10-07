//! Evaluasi skripsi — Track C3, black-box Apply Model (AM): skenario BB-33 (prediksi dengan Actual
//! target + evaluasi) dan BB-35 (isi ringkasan hasil: Model Summary, Case Processing Summary,
//! Prediction Distribution) pada tingkat Rust (`run_apply_model` / `run_apply_model_with_text`).
//!
//! Angka acuan BUKAN disalin dari keluaran Rust: semuanya dihitung ulang secara independen oleh
//! `testing/thesis-eval/tools/c3_am_oracle.py` (Python murni) dan dicantumkan sebagai literal di sini.
//! Selain itu, skor log kasus D1 juga dihitung ulang di dalam tes ini memakai rumus Naive Bayes
//! (prior, kategorikal, Gaussian) tanpa memanggil kode produksi.
//!
//! Kasus A : model D1 (schema 1.1; Outlook kategorikal + Temp numerik) pada dataset D3 (6 baris),
//!           Actual `Play` = No, Yes, Yes, No, Yes, Maybe.
//! Kasus B : model teks Raw (fixture `nb-model-v2_0-raw.json`) pada 4 dokumen, Actual = pos, pos, pos, neg.
//!
//! Toleransi: 1e-6 untuk skor log kasus A (model berpresisi penuh); 1e-9 untuk metrik/persentase
//! yang dihitung langsung dari cacah; probabilitas posterior dibandingkan pada nilai yang sudah
//! dibulatkan 4 desimal oleh `round4` (tepat). Skor log kasus B tidak dibandingkan langsung karena
//! `log_weights` fixture dibulatkan 6 desimal; yang diuji adalah keluaran akhir (kelas dan P 4 desimal).
//!
//! Berkas ini terpisah (`cargo test --test thesis_blackbox_am`) supaya galat kompilasi di sini tidak
//! mengganggu `tests/text_scoring.rs`.

use std::collections::HashMap;
use std::f64::consts::PI;

use serde_json::{json, Value};

use wasm::models::data::{
    DataRecord, DataValue, VariableAlign, VariableDefinition, VariableMeasure, VariableRole,
    VariableType,
};
use wasm::models::payload::{MappingEntry, TextPayload, TextValues};
use wasm::models::result::ApplyModelRawResult;
use wasm::scoring::{build_scorer, RowScore};
use wasm::wasm::function::{run_apply_model, run_apply_model_with_text};

const TOL_SKOR: f64 = 1e-6;
const TOL_EXACT: f64 = 1e-9;

const FIXTURE_D1: &str = include_str!("../../services/__fixtures__/nb-model-v1_1.json");
const FIXTURE_RAW: &str = include_str!("../../services/__fixtures__/nb-model-v2_0-raw.json");

// ---------------------------------------------------------------------------
// Pembantu umum
// ---------------------------------------------------------------------------

fn assert_close(actual: f64, expected: f64, tol: f64, ctx: &str) {
    assert!(
        (actual - expected).abs() < tol,
        "{ctx}: diperoleh {actual}, diharapkan {expected} (toleransi {tol})"
    );
}

fn assert_opt_close(actual: Option<f64>, expected: Option<f64>, tol: f64, ctx: &str) {
    match (actual, expected) {
        (Some(a), Some(e)) => assert_close(a, e, tol, ctx),
        (None, None) => {}
        (a, e) => panic!("{ctx}: diperoleh {a:?}, diharapkan {e:?}"),
    }
}

fn num(value: f64) -> DataValue {
    DataValue::Number(value)
}

fn txt(value: &str) -> DataValue {
    DataValue::Text(value.to_string())
}

fn record(name: &str, value: DataValue) -> DataRecord {
    let mut values = HashMap::new();
    values.insert(name.to_string(), value);
    DataRecord { values }
}

fn make_def(
    name: &str,
    column_index: usize,
    measure: VariableMeasure,
    var_type: VariableType,
) -> VariableDefinition {
    VariableDefinition {
        id: None,
        column_index,
        name: name.to_string(),
        r#type: var_type,
        width: 8,
        decimals: 0,
        label: None,
        values: Vec::new(),
        missing: Vec::new(),
        columns: 64,
        align: VariableAlign::Right,
        measure,
        role: VariableRole::Input,
    }
}

fn mapping_entry(feature: &str, variable: &str) -> MappingEntry {
    MappingEntry {
        feature: feature.to_string(),
        variable: variable.to_string(),
    }
}

fn model_d1() -> Value {
    serde_json::from_str(FIXTURE_D1).expect("fixture D1 JSON valid")
}

fn model_raw() -> Value {
    serde_json::from_str(FIXTURE_RAW).expect("fixture raw JSON valid")
}

/// Nilai prediktor dataset D3 (apply-model/AGENTS.md; sel kosong = teks kosong atau Null).
/// Baris 5: Outlook teks kosong + Temp Null (semua prediktor missing -> NotScored).
/// Baris 6: Outlook Null, Temp 80.
fn d3_outlook() -> Vec<DataValue> {
    vec![
        txt("Overcast"),
        txt("Sunny"),
        txt("Foggy"),
        txt("Sunny"),
        txt(""),
        DataValue::Null,
    ]
}

fn d3_temp() -> Vec<DataValue> {
    vec![
        num(85.0),
        num(71.0),
        num(72.0),
        DataValue::Null,
        DataValue::Null,
        num(80.0),
    ]
}

/// Kolom Actual `Play` pada D3: baris 6 = "Maybe" (kelas yang tidak dikenal model).
fn d3_actual_values() -> Vec<DataValue> {
    vec![txt("No"), txt("Yes"), txt("Yes"), txt("No"), txt("Yes"), txt("Maybe")]
}

struct Payload {
    predictors: Vec<Vec<DataRecord>>,
    defs: Vec<Vec<VariableDefinition>>,
    mapping: Vec<MappingEntry>,
}

/// Payload prediktor D3; `outlook_var`/`temp_var` = nama variabel di dataset (boleh berbeda dari nama fitur model).
fn d3_payload(outlook_var: &str, temp_var: &str) -> Payload {
    Payload {
        predictors: vec![
            d3_outlook().into_iter().map(|v| record(outlook_var, v)).collect(),
            d3_temp().into_iter().map(|v| record(temp_var, v)).collect(),
        ],
        defs: vec![
            vec![make_def(outlook_var, 0, VariableMeasure::Nominal, VariableType::String)],
            vec![make_def(temp_var, 1, VariableMeasure::Scale, VariableType::Numeric)],
        ],
        mapping: vec![
            mapping_entry("Outlook", outlook_var),
            mapping_entry("Temp", temp_var),
        ],
    }
}

fn actual_slice(variable: &str, values: Vec<DataValue>) -> (Vec<Vec<DataRecord>>, Vec<Vec<VariableDefinition>>) {
    (
        vec![values.into_iter().map(|v| record(variable, v)).collect()],
        vec![vec![make_def(variable, 2, VariableMeasure::Nominal, VariableType::String)]],
    )
}

/// Jalankan model D1 pada D3. `with_actual` = kolom Actual `Play` dipetakan atau tidak.
fn run_d1(with_actual: bool, outlook_var: &str, temp_var: &str) -> ApplyModelRawResult {
    let payload = d3_payload(outlook_var, temp_var);
    let (actual, actual_defs) = if with_actual {
        actual_slice("Play", d3_actual_values())
    } else {
        (Vec::new(), Vec::new())
    };
    run_apply_model(
        &payload.predictors,
        &payload.defs,
        &payload.mapping,
        &actual,
        &actual_defs,
        &model_d1(),
    )
    .expect("hasil Apply Model D1")
}

/// Kasus B: model teks Raw pada 4 dokumen (dokumen ke-3 kosong -> tidak diskor).
fn run_text_case(with_actual: bool) -> ApplyModelRawResult {
    let docs: Vec<Option<String>> = vec![
        Some("makan nasi enak".to_string()),
        Some("Saya tidak suka nasi!".to_string()),
        Some(String::new()),
        Some("Makan, makan, makan".to_string()),
    ];
    let payload = TextPayload {
        source: "raw".to_string(),
        mapped_columns: None,
        values: TextValues::Raw(docs),
    };
    let (actual, actual_defs) = if with_actual {
        actual_slice("Sentimen", vec![txt("pos"), txt("pos"), txt("pos"), txt("neg")])
    } else {
        (Vec::new(), Vec::new())
    };
    run_apply_model_with_text(&[], &[], &[], &actual, &actual_defs, &model_raw(), Some(&payload))
        .expect("hasil Apply Model teks")
}

fn parameter<'a>(result: &'a ApplyModelRawResult, label: &str) -> Option<&'a str> {
    result
        .model_summary
        .parameters
        .iter()
        .find(|p| p.label == label)
        .map(|p| p.value.as_str())
}

fn as_f64(value: &Value) -> f64 {
    value.as_f64().expect("nilai JSON harus angka")
}

fn predicted_labels(result: &ApplyModelRawResult) -> Vec<Option<&str>> {
    result.predictions.predicted.iter().map(|p| p.as_deref()).collect()
}

// ---------------------------------------------------------------------------
// Rumus independen Naive Bayes untuk D1 (tanpa kode produksi)
// ---------------------------------------------------------------------------

/// ln N(x; mu, var) = -0.5 ln(2 pi var) - (x - mu)^2 / (2 var).
fn ln_gaussian(x: f64, mu: f64, var: f64) -> f64 {
    -0.5 * (2.0 * PI * var).ln() - (x - mu) * (x - mu) / (2.0 * var)
}

/// Skor log D1 per kelas [No, Yes] untuk (Outlook, Temp) dengan kategori dikenal dan Temp ada.
fn d1_score_formula(outlook: &str, temp: f64) -> [f64; 2] {
    let cats = ["Overcast", "Rain", "Sunny"];
    let dist_no = [0.5_f64, 1.0 / 6.0, 1.0 / 3.0];
    let dist_yes = [1.0_f64 / 6.0, 1.0 / 3.0, 0.5];
    let idx = cats.iter().position(|c| *c == outlook).expect("kategori dikenal");
    [
        0.5_f64.ln() + dist_no[idx].ln() + ln_gaussian(temp, 84.0, 56.0 / 3.0),
        0.5_f64.ln() + dist_yes[idx].ln() + ln_gaussian(temp, 72.0, 8.0 / 3.0),
    ]
}

fn scored_log_scores(row: RowScore) -> Vec<f64> {
    match row {
        RowScore::Scored { log_scores, .. } => log_scores,
        RowScore::NotScored => panic!("baris seharusnya diskor"),
    }
}

// ---------------------------------------------------------------------------
// BB-33 — prediksi dengan Actual target (kasus A: model D1 pada D3)
// ---------------------------------------------------------------------------

#[test]
fn bb33_d1_d3_prediksi_dan_probabilitas_cocok_oracle() {
    let result = run_d1(true, "Outlook", "Temp");

    assert_eq!(result.predictions.predicted.len(), 6);
    assert_eq!(
        predicted_labels(&result),
        vec![Some("No"), Some("Yes"), Some("Yes"), Some("Yes"), None, Some("No")]
    );

    // (probabilitas kelas No, probabilitas kelas Yes) per baris, dibulatkan 4 desimal; baris 5 tidak diskor.
    let expected: [Option<(f64, f64)>; 6] = [
        Some((1.0, 0.0)),
        Some((0.0033, 0.9967)),
        Some((0.0079, 0.9921)),
        Some((0.4, 0.6)),
        None,
        Some((1.0, 0.0)),
    ];
    for (row, exp) in expected.iter().enumerate() {
        let ctx = format!("baris {}", row + 1);
        assert_opt_close(
            result.predictions.class_probabilities[0][row],
            exp.map(|e| e.0),
            TOL_EXACT,
            &format!("{ctx} P(No)"),
        );
        assert_opt_close(
            result.predictions.class_probabilities[1][row],
            exp.map(|e| e.1),
            TOL_EXACT,
            &format!("{ctx} P(Yes)"),
        );
        assert_opt_close(
            result.predictions.max_probability[row],
            exp.map(|e| if e.0 > e.1 { e.0 } else { e.1 }),
            TOL_EXACT,
            &format!("{ctx} max"),
        );
    }
}

#[test]
fn bb33_d1_d3_skor_log_cocok_oracle_dan_rumus_independen() {
    let scorer = build_scorer(&model_d1()).expect("model D1 valid");

    // Skor log dari oracle Python (Kasus A), 10 desimal.
    let oracle: [(usize, [f64; 2]); 5] = [
        (0, [-3.7953883096, -35.5817598095]),
        (1, [-8.7008534178, -2.9831475208]),
        (2, [-8.7243577412, -3.8942598095]),
        (3, [-1.7917594692, -1.3862943611]),
        (5, [-5.2957863126, -15.8942598095]),
    ];
    let outlook = d3_outlook();
    let temp = d3_temp();
    for (row, exp) in oracle.iter() {
        let values = vec![outlook[*row].clone(), temp[*row].clone()];
        let scores = scored_log_scores(scorer.score_row(&values));
        assert_eq!(scores.len(), 2, "baris {} jumlah kelas", row + 1);
        for c in 0..2 {
            assert_close(scores[c], exp[c], TOL_SKOR, &format!("baris {} skor[{}] vs oracle", row + 1, c));
        }
    }

    // Rumus independen (kategori dikenal dan Temp ada): baris 1 (Overcast, 85) dan baris 2 (Sunny, 71).
    for (row, name, t) in [(0usize, "Overcast", 85.0_f64), (1usize, "Sunny", 71.0_f64)] {
        let values = vec![outlook[row].clone(), temp[row].clone()];
        let scores = scored_log_scores(scorer.score_row(&values));
        let formula = d1_score_formula(name, t);
        for c in 0..2 {
            assert_close(scores[c], formula[c], TOL_SKOR, &format!("baris {} skor[{}] vs rumus", row + 1, c));
        }
    }

    // Baris 4 (Sunny, Temp hilang): hanya prior + kategorikal => ln 0.5 + ln(1/3) dan ln 0.5 + ln 0.5.
    let row4 = scored_log_scores(scorer.score_row(&[txt("Sunny"), DataValue::Null]));
    assert_close(row4[0], 0.5_f64.ln() + (1.0_f64 / 3.0).ln(), TOL_SKOR, "baris 4 skor[No]");
    assert_close(row4[1], 0.5_f64.ln() + 0.5_f64.ln(), TOL_SKOR, "baris 4 skor[Yes]");

    // Baris 5 (semua prediktor hilang) tidak diskor.
    assert_eq!(
        scorer.score_row(&[txt(""), DataValue::Null]),
        RowScore::NotScored
    );
}

#[test]
fn bb33_d1_d3_evaluasi_matriks_konfusi_dan_metrik_cocok_oracle() {
    let result = run_d1(true, "Outlook", "Temp");
    let ev = result.evaluation.as_ref().expect("evaluasi ada karena Actual dipetakan");

    // Pengecualian baris: baris 5 tidak diskor, baris 6 Actual "Maybe" tidak dikenal.
    assert_eq!(ev.evaluated_rows, 4);
    assert_eq!(ev.excluded_not_scored, 1);
    assert_eq!(ev.excluded_actual_unknown_class, 1);
    assert_eq!(ev.excluded_actual_missing, 0);

    let cm = &ev.confusion_matrix;
    assert_eq!(cm["classes"], json!(["No", "Yes"]));
    assert_eq!(cm["matrix"], json!([[1, 1], [0, 2]])); // baris = Actual, kolom = Prediksi
    assert_eq!(cm["row_totals"], json!([2, 2]));
    assert_eq!(cm["col_totals"], json!([1, 3]));
    assert_eq!(cm["grand_total"], json!(4));

    let m = &ev.evaluation_metrics;
    let per = &m["per_class"];
    // Kelas No: TP=1, FP=0, FN=1, TN=2.
    assert_eq!(per[0]["class"], json!("No"));
    assert_close(as_f64(&per[0]["accuracy"]), 0.75, TOL_EXACT, "No accuracy");
    assert_close(as_f64(&per[0]["precision"]), 1.0, TOL_EXACT, "No precision");
    assert_close(as_f64(&per[0]["recall"]), 0.5, TOL_EXACT, "No recall");
    assert_close(as_f64(&per[0]["f1"]), 2.0 / 3.0, TOL_EXACT, "No f1");
    // Kelas Yes: TP=2, FP=1, FN=0, TN=1.
    assert_eq!(per[1]["class"], json!("Yes"));
    assert_close(as_f64(&per[1]["accuracy"]), 0.75, TOL_EXACT, "Yes accuracy");
    assert_close(as_f64(&per[1]["precision"]), 2.0 / 3.0, TOL_EXACT, "Yes precision");
    assert_close(as_f64(&per[1]["recall"]), 1.0, TOL_EXACT, "Yes recall");
    assert_close(as_f64(&per[1]["f1"]), 0.8, TOL_EXACT, "Yes f1");

    // Rata-rata: makro = berbobot (dukungan 2 dan 2), mikro = akurasi keseluruhan.
    for key in ["macro_avg", "weighted_avg"] {
        assert_close(as_f64(&m[key]["precision"]), 5.0 / 6.0, TOL_EXACT, &format!("{key} precision"));
        assert_close(as_f64(&m[key]["recall"]), 0.75, TOL_EXACT, &format!("{key} recall"));
        assert_close(as_f64(&m[key]["f1"]), 0.7333333333333334, TOL_EXACT, &format!("{key} f1"));
    }
    for field in ["precision", "recall", "f1"] {
        assert_close(as_f64(&m["micro_avg"][field]), 0.75, TOL_EXACT, &format!("micro {field}"));
    }
    assert_close(as_f64(&m["overall_accuracy"]), 0.75, TOL_EXACT, "overall accuracy");
    assert_close(as_f64(&m["cohens_kappa"]), 0.5, TOL_EXACT, "kappa");
}

#[test]
fn bb33_d1_d3_peringatan_actual_kelas_tak_dikenal() {
    let result = run_d1(true, "Outlook", "Temp");
    let pairs: Vec<(String, u32)> = result
        .warnings
        .iter()
        .map(|w| (w.code.clone(), w.count))
        .collect();
    assert_eq!(
        pairs,
        vec![
            ("AM_W_ROWS_NOT_SCORED".to_string(), 1),
            ("AM_W_UNSEEN_CATEGORY".to_string(), 2),
            ("AM_W_ACTUAL_UNKNOWN_CLASS".to_string(), 1),
        ]
    );
}

#[test]
fn bb33_tanpa_actual_prediksi_tetap_ada_dan_evaluasi_none() {
    let tanpa = run_d1(false, "Outlook", "Temp");
    assert!(tanpa.evaluation.is_none());
    assert!(
        tanpa.warnings.iter().all(|w| w.code != "AM_W_ACTUAL_UNKNOWN_CLASS"),
        "peringatan Actual tidak boleh muncul tanpa Actual"
    );

    // Prediksi identik dengan eksekusi yang memakai Actual (Actual tidak mempengaruhi skor).
    let dengan = run_d1(true, "Outlook", "Temp");
    assert_eq!(tanpa.predictions.predicted, dengan.predictions.predicted);
    assert_eq!(tanpa.predictions.max_probability, dengan.predictions.max_probability);
    assert_eq!(tanpa.predictions.class_probabilities, dengan.predictions.class_probabilities);
}

#[test]
fn bb33_actual_tidak_lengkap_ditolak_dengan_am_e_payload() {
    let payload = d3_payload("Outlook", "Temp");
    // Satu slice Actual tetapi actualDefs kosong.
    let (actual, _) = actual_slice("Play", d3_actual_values());
    let hasil = run_apply_model(
        &payload.predictors,
        &payload.defs,
        &payload.mapping,
        &actual,
        &[],
        &model_d1(),
    );
    match hasil {
        Ok(_) => panic!("seharusnya Err AM_E_PAYLOAD"),
        Err(e) => assert!(e.starts_with("AM_E_PAYLOAD"), "pesan galat: {e}"),
    }
}

#[test]
fn bb33_teks_raw_actual_prediksi_dan_evaluasi_cocok_oracle() {
    let result = run_text_case(true);

    assert_eq!(
        predicted_labels(&result),
        vec![Some("pos"), Some("neg"), None, Some("pos")]
    );
    // (P(neg), P(pos)) dari oracle Python, 4 desimal.
    let expected: [Option<(f64, f64)>; 4] = [
        Some((0.1509, 0.8491)),
        Some((0.7596, 0.2404)),
        None,
        Some((0.0094, 0.9906)),
    ];
    for (row, exp) in expected.iter().enumerate() {
        assert_opt_close(
            result.predictions.class_probabilities[0][row],
            exp.map(|e| e.0),
            TOL_EXACT,
            &format!("baris {} P(neg)", row + 1),
        );
        assert_opt_close(
            result.predictions.class_probabilities[1][row],
            exp.map(|e| e.1),
            TOL_EXACT,
            &format!("baris {} P(pos)", row + 1),
        );
    }

    let ev = result.evaluation.as_ref().expect("evaluasi ada");
    assert_eq!(ev.evaluated_rows, 3);
    assert_eq!(ev.excluded_not_scored, 1);
    assert_eq!(ev.excluded_actual_unknown_class, 0);
    assert_eq!(ev.excluded_actual_missing, 0);

    let cm = &ev.confusion_matrix;
    assert_eq!(cm["classes"], json!(["neg", "pos"]));
    assert_eq!(cm["matrix"], json!([[0, 1], [1, 1]]));
    assert_eq!(cm["row_totals"], json!([1, 2]));
    assert_eq!(cm["col_totals"], json!([1, 2]));
    assert_eq!(cm["grand_total"], json!(3));

    let m = &ev.evaluation_metrics;
    let per = &m["per_class"];
    assert_close(as_f64(&per[0]["precision"]), 0.0, TOL_EXACT, "neg precision");
    assert_close(as_f64(&per[0]["recall"]), 0.0, TOL_EXACT, "neg recall");
    assert_close(as_f64(&per[0]["f1"]), 0.0, TOL_EXACT, "neg f1");
    assert_close(as_f64(&per[0]["accuracy"]), 1.0 / 3.0, TOL_EXACT, "neg accuracy");
    assert_close(as_f64(&per[1]["precision"]), 0.5, TOL_EXACT, "pos precision");
    assert_close(as_f64(&per[1]["recall"]), 0.5, TOL_EXACT, "pos recall");
    assert_close(as_f64(&per[1]["f1"]), 0.5, TOL_EXACT, "pos f1");
    assert_close(as_f64(&per[1]["accuracy"]), 1.0 / 3.0, TOL_EXACT, "pos accuracy");

    for field in ["precision", "recall", "f1"] {
        assert_close(as_f64(&m["macro_avg"][field]), 0.25, TOL_EXACT, &format!("macro {field}"));
        assert_close(as_f64(&m["weighted_avg"][field]), 1.0 / 3.0, TOL_EXACT, &format!("weighted {field}"));
        assert_close(as_f64(&m["micro_avg"][field]), 1.0 / 3.0, TOL_EXACT, &format!("micro {field}"));
    }
    assert_close(as_f64(&m["overall_accuracy"]), 1.0 / 3.0, TOL_EXACT, "overall accuracy");
    assert_close(as_f64(&m["cohens_kappa"]), -0.5, TOL_EXACT, "kappa");
}

// ---------------------------------------------------------------------------
// BB-35 — isi ringkasan hasil (Model Summary, Case Processing Summary, Prediction Distribution)
// ---------------------------------------------------------------------------

#[test]
fn bb35_model_summary_d1_memuat_metadata_fitur_dan_parameter() {
    // Nama variabel dataset berbeda dari nama fitur model: pemetaan harus tercermin di ringkasan.
    let result = run_d1(true, "Cuaca", "Suhu");
    let summary = &result.model_summary;

    assert_eq!(summary.model_type, "naive_bayes");
    assert_eq!(summary.schema_version, "1.1");
    assert_eq!(summary.trained_at.as_deref(), Some("2026-10-01T00:00:00.000Z"));
    assert_eq!(summary.target_name, "Play");
    assert_eq!(summary.classes, vec!["No".to_string(), "Yes".to_string()]);
    assert!(!summary.legacy_unseen_handling);

    assert_eq!(summary.features.len(), 2);
    assert_eq!(summary.features[0].name, "Outlook");
    assert_eq!(summary.features[0].role, "categorical");
    assert_eq!(summary.features[0].mapped_variable, "Cuaca");
    assert_eq!(summary.features[1].name, "Temp");
    assert_eq!(summary.features[1].role, "numerical");
    assert_eq!(summary.features[1].mapped_variable, "Suhu");

    assert_eq!(parameter(&result, "Smoothing alpha"), Some("1"));
    let floor = 1e-9_f64.to_string();
    assert_eq!(parameter(&result, "Variance floor"), Some(floor.as_str()));
    assert_eq!(parameter(&result, "Validation (training)"), Some("Holdout 70% / 30%, seed 42"));
    // Model tanpa Text: tidak ada baris parameter teks.
    assert_eq!(parameter(&result, "Text source"), None);
    assert_eq!(parameter(&result, "Rows with empty text"), None);
}

#[test]
fn bb35_case_processing_summary_d1_d3() {
    let result = run_d1(true, "Outlook", "Temp");
    let cps = &result.case_processing_summary;
    assert_eq!(cps.total_rows, 6);
    assert_eq!(cps.scored_rows, 5);
    assert_eq!(cps.not_scored_all_missing, 1);
    assert_eq!(cps.rows_with_missing_predictor, 2); // baris 4 (Temp hilang) dan baris 6 (Outlook hilang)
    assert_eq!(cps.rows_with_unseen_category, 2); // baris 3 ("Foggy") dan baris 6 (hilang -> kategori asing)
}

#[test]
fn bb35_prediction_distribution_d1_d3() {
    let result = run_d1(true, "Outlook", "Temp");
    let dist = &result.prediction_distribution;
    assert_eq!(dist.classes, vec!["No".to_string(), "Yes".to_string()]);
    assert_eq!(dist.counts, vec![2, 3]);
    assert_eq!(dist.percentages.len(), 2);
    assert_close(dist.percentages[0], 40.0, TOL_EXACT, "persen No");
    assert_close(dist.percentages[1], 60.0, TOL_EXACT, "persen Yes");
    assert_eq!(dist.not_scored, 1);
    // Jumlah cacah + tidak diskor = total baris.
    let diskor: u32 = dist.counts.iter().sum();
    assert_eq!(diskor + dist.not_scored, result.case_processing_summary.total_rows);
}

#[test]
fn bb35_ringkasan_model_teks_raw() {
    let result = run_text_case(true);

    let summary = &result.model_summary;
    assert_eq!(summary.model_type, "naive_bayes");
    assert_eq!(summary.schema_version, "2.0");
    assert_eq!(summary.target_name, "Sentimen");
    assert_eq!(summary.classes, vec!["neg".to_string(), "pos".to_string()]);
    assert!(summary.features.is_empty(), "model hanya-teks tidak punya fitur biasa");
    assert_eq!(parameter(&result, "Text source"), Some("raw"));
    assert_eq!(parameter(&result, "Text likelihood"), Some("multinomial"));
    assert_eq!(parameter(&result, "Rows with empty text"), Some("1"));
    assert_eq!(parameter(&result, "Text features zero-filled"), None);

    let cps = &result.case_processing_summary;
    assert_eq!(cps.total_rows, 4);
    assert_eq!(cps.scored_rows, 3);
    assert_eq!(cps.not_scored_all_missing, 1);

    let dist = &result.prediction_distribution;
    assert_eq!(dist.classes, vec!["neg".to_string(), "pos".to_string()]);
    assert_eq!(dist.counts, vec![1, 2]);
    assert_close(dist.percentages[0], 100.0 / 3.0, TOL_EXACT, "persen neg");
    assert_close(dist.percentages[1], 200.0 / 3.0, TOL_EXACT, "persen pos");
    assert_eq!(dist.not_scored, 1);
}

#[test]
fn bb35_hasil_dapat_diserialisasi_dan_kuncinya_lengkap() {
    // Kontrak bentuk hasil yang dibaca sisi TypeScript (transformApplyModelResult).
    let result = run_d1(true, "Outlook", "Temp");
    let json_value = serde_json::to_value(&result).expect("hasil dapat diserialisasi");
    for key in [
        "model_summary",
        "case_processing_summary",
        "prediction_distribution",
        "predictions",
        "evaluation",
        "warnings",
    ] {
        assert!(json_value.get(key).is_some(), "kunci {key} hilang pada hasil");
    }
    assert!(json_value["evaluation"].is_object());

    let tanpa = serde_json::to_value(run_d1(false, "Outlook", "Temp")).expect("hasil tanpa Actual");
    assert!(tanpa["evaluation"].is_null(), "tanpa Actual, evaluation = null");
}
