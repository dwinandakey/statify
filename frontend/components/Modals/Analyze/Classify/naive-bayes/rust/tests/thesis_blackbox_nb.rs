//! Evaluasi skripsi - Track C2 (black-box menu Naive Bayes), lapisan komputasi Rust.
//!
//! Skenario: BB-17, BB-18 (lapis Rust), BB-19, BB-20, BB-22, BB-23, BB-24, BB-25, BB-26 (isi tabel
//! lengkap), BB-27, BB-28. Sisi antarmuka (TypeScript/React) ada di
//! `naive-bayes/__tests__/thesis/blackbox.nb.*.test.ts(x)`.
//!
//! Semua pemanggilan memakai API publik crate (`wasm::wasm::function::run_analysis` dan fungsi
//! murni di `wasm::stats::*`) tanpa JsValue, sehingga dapat dijalankan native:
//!
//! ```text
//! cargo test --test thesis_blackbox_nb          (dari folder naive-bayes/rust)
//! ```
//!
//! Data: dataset buatan kecil (dibangun di dalam berkas ini) dan, untuk tes berakhiran `_pilkada`,
//! `pilkada_train.csv`. Lokasi dicari berurutan: `THESIS_DATA_DIR`, `<repo>/Claude outputs/`,
//! `<repo>/dataset_untuk_text/`, `E:\KULIAH\Skripsi\SIDANG\`. Bila tidak ditemukan, tes itu
//! mencetak `THESIS_SKIP` dan dilewati; bila variabel lingkungan `THESIS_REQUIRE_DATA` di-set
//! (skrip `run_C2.ps1` melakukannya) berkas yang hilang membuat tes GAGAL (bukan lulus diam-diam).
//!
//! Angka acuan numerik buatan tangan diverifikasi silang dengan scikit-learn (lihat komentar).
//!
//! STATUS VERIFIKASI (jujur): `cargo test` penuh belum dijalankan (crate serde/wasm-bindgen/regex tidak tersedia di
//! sandbox). Tanda tangan, tipe, visibilitas, nama field JSON, dan pesan galat dicocokkan dengan sumber lewat
//! pembacaan. Potongan yang hanya memakai fungsi murni (partisi, k-fold, `validate_fold_count`, metrik BB-25)
//! dikompilasi dan dijalankan sekali dengan `rustc` terhadap modul sumber asli di sandbox (log tidak disimpan, BUKAN bukti resmi). Tes yang memanggil `run_analysis`
//! tidak dapat dieksekusi di sandbox.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::Value;
use statify_text_core::TextVectorizerConfig;

use wasm::models::config::{
    MainConfig, NaiveBayesConfig, NaiveBayesConfigV2, NumericLikelihood, OptionsConfig, OutputConfig,
    TextLikelihood, ValidationConfig,
};
use wasm::models::data::{
    text_negative_message, AnalysisData, DataRecord, DataValue, TextPayload, VariableAlign,
    VariableDefinition, VariableMeasure, VariableRole, VariableType,
};
use wasm::stats::case_summary::TEXT_LEAKAGE_NOTE;
use wasm::stats::classification_table::compute_evaluation_metrics;
use wasm::stats::partition::{
    stratified_k_fold, stratified_train_holdout_split, training_test_split_for_fold,
    validate_fold_count,
};
use wasm::utils::error::ErrorCollector;
use wasm::wasm::function::run_analysis;

// ---------------------------------------------------------------------------------------------
// Pembantu umum
// ---------------------------------------------------------------------------------------------

fn strings(items: &[&str]) -> Vec<String> {
    items.iter().map(|s| s.to_string()).collect()
}

fn weka_cfg() -> TextVectorizerConfig {
    TextVectorizerConfig::from_json_value(serde_json::json!({
        "lowercase": true,
        "stemming_method": "none",
        "stopwords_method": "none",
        "custom_stopwords": null,
        "delimiters": r#"[\s.,;:'"()?!]+"#,
        "ngram_min": 1,
        "ngram_max": 1,
        "formula_standard": "weka",
        "tf_method": "raw",
        "idf_method": "none",
        "normalization": "none",
        "words_to_keep": 1000,
        "min_term_freq": 1
    }))
    .expect("config Weka default valid")
}

fn config_for(
    target: &str,
    method: &str,
    training_percentage: f64,
    folds: i32,
    seed: Option<i64>,
) -> NaiveBayesConfig {
    NaiveBayesConfig {
        main: MainConfig {
            target_var: Some(target.to_string()),
            excluded_var: None,
            candidate_factors: None,
            candidate_covariates: None,
        },
        options: OptionsConfig {
            missing_value_policy: String::new(),
            unseen_category_policy: String::new(),
            smoothing_alpha: 1.0,
            variance_floor: 1e-9,
        },
        validation: ValidationConfig {
            validation_method: method.to_string(),
            training_percentage,
            k_folds: folds,
            random_seed: seed,
        },
        output: OutputConfig {
            case_processing_summary: true,
            attribute_distribution_table: true,
            model_evaluation_metrics: true,
            confusion_matrix: true,
        },
    }
}

fn holdout_config(seed: Option<i64>) -> NaiveBayesConfig {
    config_for("Class", "holdout", 70.0, 10, seed)
}

fn kfold_config(folds: i32, seed: Option<i64>) -> NaiveBayesConfig {
    config_for("Class", "kfold", 70.0, folds, seed)
}

fn record(name: &str, value: DataValue) -> DataRecord {
    DataRecord {
        values: HashMap::from([(name.to_string(), value)]),
    }
}

fn definition(
    name: &str,
    column_index: usize,
    kind: VariableType,
    measure: VariableMeasure,
) -> VariableDefinition {
    VariableDefinition {
        id: None,
        column_index,
        name: name.to_string(),
        r#type: kind,
        width: 8,
        decimals: 2,
        label: None,
        values: vec![],
        missing: vec![],
        columns: 8,
        align: VariableAlign::Right,
        measure,
        role: VariableRole::Input,
    }
}

/// Dataset hanya-target (dipakai bersama payload Text).
fn target_only_data(target: &str, labels: &[String]) -> AnalysisData {
    let rows: Vec<DataRecord> = labels
        .iter()
        .map(|label| record(target, DataValue::Text(label.clone())))
        .collect();
    AnalysisData {
        target_data: vec![rows],
        predictors_data: vec![],
        target_data_defs: vec![],
        predictors_data_defs: vec![],
    }
}

/// Dataset campuran: target `Class`, kovariat `Temp` (scale), faktor `Outlook` (nominal).
/// Kelas A bersuhu 20..24 dan kelas B 24..28 (tumpang tindih sebagian), `Outlook` mengikuti kelas
/// dengan "noise" tiap kelipatan 3, sehingga klasifikasi tidak trivial tetapi deterministik.
/// `counts` = (kelas, jumlah baris) berurutan per blok; `n_missing_target` baris dengan target
/// kosong ditambahkan di akhir. Mengembalikan data dan label kelas baris VALID (urutan sama
/// dengan `PreprocessedData::cases`).
fn mixed_data(counts: &[(&str, usize)], n_missing_target: usize) -> (AnalysisData, Vec<String>) {
    let mut target: Vec<DataRecord> = Vec::new();
    let mut temp: Vec<DataRecord> = Vec::new();
    let mut outlook: Vec<DataRecord> = Vec::new();
    let mut labels: Vec<String> = Vec::new();

    for (class, count) in counts.iter() {
        let high = *class == "B";
        for i in 0..*count {
            let base = if high { 24.0 } else { 20.0 };
            let value = base + (i % 5) as f64;
            let flip = i % 3 == 0;
            let outlook_value = match (high, flip) {
                (false, false) => "sunny",
                (false, true) => "rain",
                (true, false) => "rain",
                (true, true) => "sunny",
            };
            target.push(record("Class", DataValue::Text(class.to_string())));
            temp.push(record("Temp", DataValue::Number(value)));
            outlook.push(record("Outlook", DataValue::Text(outlook_value.to_string())));
            labels.push(class.to_string());
        }
    }
    for i in 0..n_missing_target {
        target.push(record("Class", DataValue::Null));
        temp.push(record("Temp", DataValue::Number(22.0 + i as f64)));
        outlook.push(record("Outlook", DataValue::Text("sunny".to_string())));
    }

    let data = AnalysisData {
        target_data: vec![target],
        predictors_data: vec![temp, outlook],
        target_data_defs: vec![],
        predictors_data_defs: vec![
            vec![definition("Temp", 0, VariableType::Numeric, VariableMeasure::Scale)],
            vec![definition("Outlook", 1, VariableType::String, VariableMeasure::Nominal)],
        ],
    };
    (data, labels)
}

/// Dataset satu kovariat `Skor`: kelas A konstan 5 (8 baris), kelas B 10,11,12,13 diulang dua kali.
fn skor_data() -> AnalysisData {
    let spread = [10.0, 11.0, 12.0, 13.0, 10.0, 11.0, 12.0, 13.0];
    let mut target: Vec<DataRecord> = Vec::new();
    let mut skor: Vec<DataRecord> = Vec::new();
    for _ in 0..8 {
        target.push(record("Class", DataValue::Text("A".to_string())));
        skor.push(record("Skor", DataValue::Number(5.0)));
    }
    for i in 0..8 {
        target.push(record("Class", DataValue::Text("B".to_string())));
        skor.push(record("Skor", DataValue::Number(spread[i])));
    }
    AnalysisData {
        target_data: vec![target],
        predictors_data: vec![skor],
        target_data_defs: vec![],
        predictors_data_defs: vec![vec![definition(
            "Skor",
            0,
            VariableType::Numeric,
            VariableMeasure::Scale,
        )]],
    }
}

/// 20 dokumen (10 pos, 10 neg), tiap dokumen punya satu kata unik.
fn twenty_docs() -> (Vec<String>, Vec<String>) {
    let mut labels = Vec::new();
    let mut docs = Vec::new();
    for i in 0..10 {
        labels.push("pos".to_string());
        docs.push(format!("bagus mantap senang puas unik{}", i));
        labels.push("neg".to_string());
        docs.push(format!("buruk jelek sedih kecewa unik{}", i + 100));
    }
    (labels, docs)
}

fn raw_payload(docs: &[String]) -> TextPayload {
    TextPayload::Raw {
        variable: "Teks".to_string(),
        values: docs.iter().map(|d| Some(d.clone())).collect(),
    }
}

fn raw_config_v2() -> NaiveBayesConfigV2 {
    let mut config_v2 = NaiveBayesConfigV2::default();
    config_v2.text = Some(weka_cfg());
    config_v2
}

/// Jalankan `run_analysis`; panik bila gagal. Mengembalikan JSON hasil dan kolektor galat
/// (peringatan non-fatal ikut tercatat di kolektor).
fn run_ok(
    data: &AnalysisData,
    config: &NaiveBayesConfig,
    config_v2: &NaiveBayesConfigV2,
    payload: &TextPayload,
) -> (Value, ErrorCollector) {
    let mut errors = ErrorCollector::default();
    let result = run_analysis(data, config, config_v2, payload, &mut errors)
        .unwrap_or_else(|| panic!("analisis harus berhasil: {}", errors.get_error_summary()));
    (serde_json::to_value(&result).expect("serialisasi hasil"), errors)
}

/// Jalankan `run_analysis` yang HARUS gagal; mengembalikan ringkasan galat kolektor.
fn run_err(
    data: &AnalysisData,
    config: &NaiveBayesConfig,
    config_v2: &NaiveBayesConfigV2,
    payload: &TextPayload,
) -> String {
    let mut errors = ErrorCollector::default();
    let result = run_analysis(data, config, config_v2, payload, &mut errors);
    assert!(result.is_none(), "analisis seharusnya gagal tetapi berhasil");
    assert!(errors.has_errors(), "analisis gagal tanpa galat tercatat");
    errors.get_error_summary()
}

/// Buang bidang yang memang berubah antar-run (`trained_at`).
fn stable(json: &Value) -> Value {
    let mut copy = json.clone();
    if let Some(model) = copy.get_mut("trained_model") {
        if let Some(object) = model.as_object_mut() {
            object.remove("trained_at");
        }
    }
    copy
}

/// Bandingkan dua JSON: struktur/string/bool/null harus sama persis; angka dalam toleransi `tol`.
fn assert_json_close(path: &str, a: &Value, b: &Value, tol: f64) {
    match (a, b) {
        (Value::Number(x), Value::Number(y)) => {
            let xf = x.as_f64().unwrap_or(f64::NAN);
            let yf = y.as_f64().unwrap_or(f64::NAN);
            assert!(
                (xf - yf).abs() <= tol || (xf.is_nan() && yf.is_nan()),
                "{}: {} != {}",
                path,
                xf,
                yf
            );
        }
        (Value::Array(xs), Value::Array(ys)) => {
            assert_eq!(xs.len(), ys.len(), "{}: panjang array berbeda", path);
            for (i, (x, y)) in xs.iter().zip(ys.iter()).enumerate() {
                assert_json_close(&format!("{}[{}]", path, i), x, y, tol);
            }
        }
        (Value::Object(xs), Value::Object(ys)) => {
            assert_eq!(xs.len(), ys.len(), "{}: jumlah kunci berbeda", path);
            for (key, x) in xs.iter() {
                match ys.get(key) {
                    Some(y) => assert_json_close(&format!("{}.{}", path, key), x, y, tol),
                    None => panic!("{}: kunci {} tidak ada di sisi kedua", path, key),
                }
            }
        }
        _ => assert_eq!(a, b, "{}", path),
    }
}

fn matrix_of(json: &Value) -> Vec<Vec<u64>> {
    json["confusion_matrix"]["matrix"]
        .as_array()
        .expect("matrix")
        .iter()
        .map(|row| {
            row.as_array()
                .expect("baris matrix")
                .iter()
                .map(|v| v.as_u64().expect("bilangan bulat"))
                .collect()
        })
        .collect()
}

fn u64_of(json: &Value, key: &str) -> u64 {
    json[key].as_u64().unwrap_or_else(|| panic!("{} bukan bilangan bulat: {}", key, json[key]))
}

fn f64_of(value: &Value) -> f64 {
    value.as_f64().unwrap_or_else(|| panic!("bukan angka: {}", value))
}

/// (mean, std_dev) kelas `class` dari satu baris Attribute Distribution numerik.
fn numeric_stat(attribute: &Value, class: &str) -> (f64, f64) {
    let rows = attribute["numeric"]["per_class"].as_array().expect("per_class");
    let row = rows
        .iter()
        .find(|r| r["class"] == class)
        .unwrap_or_else(|| panic!("kelas {} tidak ada", class));
    (f64_of(&row["mean"]), f64_of(&row["std_dev"]))
}

// ---------------------------------------------------------------------------------------------
// BB-17 - Complement + prediktor numerik/kategorik (NB_E_COMPLEMENT_MIXED)
// ---------------------------------------------------------------------------------------------

#[test]
fn bb17_complement_dengan_prediktor_numerik_kategorik_menghasilkan_nb_e_complement_mixed() {
    // 30 baris valid, prediktor Temp (numerik) + Outlook (kategorik) + Raw Text.
    let (data, _labels) = mixed_data(&[("A", 15), ("B", 15)], 0);
    let docs: Vec<String> = (0..30).map(|i| format!("kata{} umum", i)).collect();
    let mut config_v2 = raw_config_v2();
    config_v2.options.text_likelihood = TextLikelihood::Complement;

    let summary = run_err(&data, &holdout_config(Some(42)), &config_v2, &raw_payload(&docs));
    assert!(summary.contains("NB_E_COMPLEMENT_MIXED"), "{}", summary);
    assert!(
        summary.contains("this model also has 2 numeric/categorical predictor(s)"),
        "{}",
        summary
    );
    assert!(
        summary.contains("Complement Naive Bayes can only be used when the model contains Text Features only"),
        "{}",
        summary
    );
}

#[test]
fn bb17_complement_dengan_hanya_text_features_berhasil_tanpa_prior() {
    let (labels, docs) = twenty_docs();
    let mut config_v2 = raw_config_v2();
    config_v2.options.text_likelihood = TextLikelihood::Complement;
    let (json, _) = run_ok(
        &target_only_data("Class", &labels),
        &holdout_config(Some(42)),
        &config_v2,
        &raw_payload(&docs),
    );
    assert_eq!(json["trained_model"]["text"]["likelihood"], "complement");
    assert_eq!(json["trained_model"]["text"]["uses_class_prior"], false);
}

// ---------------------------------------------------------------------------------------------
// BB-18 - Text alpha 0 atau > maksimum (lapis Rust)
// ---------------------------------------------------------------------------------------------

#[test]
fn bb18_text_alpha_nol_dan_di_atas_999_ditolak_di_rust() {
    let (labels, docs) = twenty_docs();
    let data = target_only_data("Class", &labels);
    for bad in [0.0_f64, 1000.0_f64, -1.0_f64] {
        let mut config_v2 = raw_config_v2();
        config_v2.options.text_alpha = bad;
        let summary = run_err(&data, &holdout_config(Some(42)), &config_v2, &raw_payload(&docs));
        assert!(
            summary.contains("Text smoothing alpha must be greater than 0 and at most 999"),
            "alpha {}: {}",
            bad,
            summary
        );
    }
}

#[test]
fn bb18_text_alpha_batas_atas_999_diterima() {
    let (labels, docs) = twenty_docs();
    let mut config_v2 = raw_config_v2();
    config_v2.options.text_alpha = 999.0;
    let (json, _) = run_ok(
        &target_only_data("Class", &labels),
        &holdout_config(Some(42)),
        &config_v2,
        &raw_payload(&docs),
    );
    assert_eq!(json["trained_model"]["text"]["alpha"].as_f64(), Some(999.0));
}

// ---------------------------------------------------------------------------------------------
// BB-19 - Word-Vector bernilai negatif (NB_E_TEXT_NEGATIVE)
// ---------------------------------------------------------------------------------------------

fn vector_payload(columns: &[&str], negative_columns: &[usize], n_rows: usize) -> TextPayload {
    let values: Vec<Vec<Option<f64>>> = (0..n_rows)
        .map(|row| {
            (0..columns.len())
                .map(|col| {
                    if row == 3 && negative_columns.contains(&col) {
                        Some(-0.5)
                    } else {
                        Some(((row + col) % 3) as f64)
                    }
                })
                .collect()
        })
        .collect();
    TextPayload::Vector {
        columns: strings(columns),
        values,
    }
}

#[test]
fn bb19_kolom_vektor_negatif_menghentikan_analisis_dengan_nb_e_text_negative_dan_nama_kolom() {
    let (labels, _docs) = twenty_docs();
    let data = target_only_data("Class", &labels);
    let payload = vector_payload(&["VEC_a", "VEC_b"], &[1], labels.len());
    let summary = run_err(&data, &holdout_config(Some(42)), &NaiveBayesConfigV2::default(), &payload);
    assert!(summary.contains("NB_E_TEXT_NEGATIVE"), "{}", summary);
    assert!(summary.contains("'VEC_b'"), "{}", summary);
    assert!(!summary.contains("'VEC_a'"), "{}", summary);
    assert!(summary.contains("(1 column(s) affected)"), "{}", summary);
    // Kalimat persis dari sumber (`text_negative_message`).
    assert!(summary.contains(&text_negative_message("VEC_b", 1)), "{}", summary);
}

#[test]
fn bb19_beberapa_kolom_negatif_menyebut_kolom_pertama_dan_jumlah() {
    let (labels, _docs) = twenty_docs();
    let data = target_only_data("Class", &labels);
    let payload = vector_payload(&["VEC_a", "VEC_b", "VEC_c"], &[1, 2], labels.len());
    let summary = run_err(&data, &holdout_config(Some(42)), &NaiveBayesConfigV2::default(), &payload);
    assert!(summary.contains("'VEC_b'"), "{}", summary);
    assert!(summary.contains("(2 column(s) affected)"), "{}", summary);
}

#[test]
fn bb19_tanpa_nilai_negatif_analisis_berjalan() {
    let (labels, _docs) = twenty_docs();
    let data = target_only_data("Class", &labels);
    let payload = vector_payload(&["VEC_a", "VEC_b"], &[], labels.len());
    let (json, _) = run_ok(&data, &holdout_config(Some(42)), &NaiveBayesConfigV2::default(), &payload);
    assert_eq!(json["trained_model"]["text"]["source"], "vector");
}

// ---------------------------------------------------------------------------------------------
// BB-20 - Gaussian (Weka min. std) + Attribute Distribution
// ---------------------------------------------------------------------------------------------

#[test]
fn bb20_gaussian_biasa_tidak_menandai_likelihood_dan_std_kelas_konstan_nyaris_nol() {
    let (json, _) = run_ok(
        &skor_data(),
        &holdout_config(Some(42)),
        &NaiveBayesConfigV2::default(),
        &TextPayload::None,
    );
    let attribute = &json["attribute_distribution"][0];
    assert_eq!(attribute["name"], "Skor");
    assert_eq!(attribute["role"], "numerical");
    assert!(attribute.get("likelihood").is_none(), "Gaussian biasa tidak boleh menandai likelihood");
    let (mean_a, std_a) = numeric_stat(attribute, "A");
    assert!((mean_a - 5.0).abs() < 1e-9);
    assert!(std_a < 1e-3, "std kelas konstan harus nyaris nol, dapat {}", std_a);
    let (mean_b, std_b) = numeric_stat(attribute, "B");
    assert!((mean_b - 11.5).abs() < 1e-9);
    // Varians populasi B = 1.25
    assert!((std_b - 1.25_f64.sqrt()).abs() < 1e-9, "std B = {}", std_b);
    // Tanpa Text dan Gaussian biasa: ekspor tetap schema 1.1.
    assert_eq!(json["trained_model"]["schema_version"], "1.1");
}

#[test]
fn bb20_gaussian_weka_min_std_menaikkan_std_kelas_konstan_dan_menampilkan_atribut_distribusi() {
    let mut config_v2 = NaiveBayesConfigV2::default();
    config_v2.options.numeric_likelihood = NumericLikelihood::GaussianMinstd;
    let (json, _) = run_ok(&skor_data(), &holdout_config(Some(42)), &config_v2, &TextPayload::None);

    // Analisis berjalan: metrik dan confusion matrix ada.
    assert!(json["confusion_matrix"]["grand_total"].as_u64().unwrap_or(0) > 0);
    assert!(json["evaluation_metrics"]["overall_accuracy"].is_number());

    // Attribute Distribution Table tampil untuk atribut numerik dengan penanda min-std.
    let attribute = &json["attribute_distribution"][0];
    assert_eq!(attribute["name"], "Skor");
    assert_eq!(attribute["role"], "numerical");
    assert_eq!(attribute["likelihood"], "gaussian_minstd");
    let note = attribute["likelihood_note"].as_str().expect("likelihood_note");
    assert!(note.contains("minimum standard deviation floor"), "{}", note);

    // Nilai unik lintas kelas {5,10,11,12,13}: precision = (13-5)/4 = 2, min_std = 2/6 = 1/3,
    // min_var = 1/9. Kelas A (varians 0) dinaikkan ke 1/9 -> std = 1/3; kelas B (varians 1.25) tetap.
    let (mean_a, std_a) = numeric_stat(attribute, "A");
    assert!((mean_a - 5.0).abs() < 1e-9);
    assert!((std_a - 1.0 / 3.0).abs() < 1e-9, "std A = {}", std_a);
    let (_, std_b) = numeric_stat(attribute, "B");
    assert!((std_b - 1.25_f64.sqrt()).abs() < 1e-9, "std B = {}", std_b);

    // Ekspor memuat jenis likelihood dan min_variance, schema naik ke 2.0.
    let model = &json["trained_model"];
    assert_eq!(model["schema_version"], "2.0");
    assert_eq!(model["features"][0]["likelihood"], "gaussian_minstd");
    let min_variance = f64_of(&model["features"][0]["min_variance"]);
    assert!((min_variance - 1.0 / 9.0).abs() < 1e-9, "min_variance = {}", min_variance);
}

// ---------------------------------------------------------------------------------------------
// BB-22 - Holdout 70% seed 42, dua kali
// ---------------------------------------------------------------------------------------------

#[test]
fn bb22_partisi_holdout_70_seed_42_deterministik_dan_stratified() {
    let labels: Vec<String> = {
        let mut v = Vec::new();
        for _ in 0..40 {
            v.push("A".to_string());
        }
        for _ in 0..20 {
            v.push("B".to_string());
        }
        v
    };
    let first = stratified_train_holdout_split(&labels, 70, Some(42));
    let second = stratified_train_holdout_split(&labels, 70, Some(42));
    assert_eq!(first, second, "seed yang sama harus menghasilkan partisi yang sama");

    // Setiap indeks tepat sekali di salah satu partisi.
    let mut all: Vec<usize> = first
        .training_indices
        .iter()
        .chain(first.holdout_indices.iter())
        .copied()
        .collect();
    all.sort_unstable();
    assert_eq!(all, (0..labels.len()).collect::<Vec<usize>>());

    // Stratified: kedua kelas hadir di training maupun holdout.
    for class in ["A", "B"] {
        let in_train = first.training_indices.iter().filter(|&&i| labels[i] == class).count();
        let in_holdout = first.holdout_indices.iter().filter(|&&i| labels[i] == class).count();
        assert!(in_train > 0 && in_holdout > 0, "kelas {} tidak muncul di salah satu partisi", class);
    }
    // Proporsi kelas A di training mendekati 2/3 (40 dari 60), toleransi 1 baris.
    let a_train = first.training_indices.iter().filter(|&&i| labels[i] == "A").count();
    assert_eq!(a_train, (40.0_f64 * 0.7).round() as usize);
}

#[test]
fn bb22_run_analysis_holdout_70_seed_42_dua_kali_menghasilkan_keluaran_identik() {
    let (data, labels) = mixed_data(&[("A", 15), ("B", 15)], 2);
    let config = holdout_config(Some(42));
    let (first, _) = run_ok(&data, &config, &NaiveBayesConfigV2::default(), &TextPayload::None);
    let (second, _) = run_ok(&data, &config, &NaiveBayesConfigV2::default(), &TextPayload::None);

    // Bilangan bulat (confusion matrix) harus identik persis.
    assert_eq!(first["confusion_matrix"], second["confusion_matrix"]);
    assert_eq!(first["case_processing_summary"], second["case_processing_summary"]);
    // Seluruh hasil (kecuali cap waktu ekspor) sama dalam toleransi 1e-12.
    assert_json_close("hasil", &stable(&first), &stable(&second), 1e-12);

    // Ukuran holdout konsisten dengan fungsi partisi yang sama (seed 42, 70%).
    let split = stratified_train_holdout_split(&labels, 70, Some(42));
    assert_eq!(u64_of(&first["confusion_matrix"], "grand_total") as usize, split.holdout_indices.len());
    assert_eq!(split.training_indices.len() + split.holdout_indices.len(), 30);

    // Skenario validasi tercatat apa adanya.
    let scenario = &first["case_processing_summary"]["validation_scenario"];
    assert_eq!(scenario["method"], "holdout");
    assert_eq!(scenario["training_percentage"].as_f64(), Some(70.0));
    assert_eq!(scenario["holdout_percentage"].as_f64(), Some(30.0));
    assert_eq!(scenario["seed"].as_i64(), Some(42));
}

// ---------------------------------------------------------------------------------------------
// BB-23 - 10-fold CV, metrik dari gabungan prediksi semua fold
// ---------------------------------------------------------------------------------------------

#[test]
fn bb23_stratified_10_fold_saling_lepas_menutup_semua_baris_dan_tanpa_peringatan() {
    let mut labels: Vec<String> = Vec::new();
    for _ in 0..15 {
        labels.push("A".to_string());
    }
    for _ in 0..15 {
        labels.push("B".to_string());
    }
    let kfold = stratified_k_fold(&labels, 10, Some(42)).expect("10 fold sah untuk 30 baris");
    assert_eq!(kfold.folds.len(), 10);
    assert!(kfold.warning.is_none(), "10 <= kelas terkecil (15): tidak ada peringatan");

    // Tiap indeks tepat sekali sebagai data uji.
    let mut all: Vec<usize> = kfold.folds.iter().flat_map(|f| f.iter().copied()).collect();
    all.sort_unstable();
    assert_eq!(all, (0..30).collect::<Vec<usize>>());

    // Round-robin per kelas: tiap kelas 15 baris -> fold 0..4 mendapat 2, fold 5..9 mendapat 1.
    let mut sizes: Vec<usize> = kfold.folds.iter().map(|f| f.len()).collect();
    sizes.sort_unstable();
    assert_eq!(sizes, vec![2, 2, 2, 2, 2, 4, 4, 4, 4, 4]);

    // Training = semua indeks selain fold itu; tidak beririsan dengan uji.
    for fold_idx in 0..10 {
        let (train, test) = training_test_split_for_fold(&kfold.folds, fold_idx);
        assert_eq!(train.len() + test.len(), 30);
        assert!(test.iter().all(|t| !train.contains(t)));
    }

    // Seed sama -> fold sama.
    let again = stratified_k_fold(&labels, 10, Some(42)).expect("ulang");
    assert_eq!(kfold, again);
}

#[test]
fn bb23_run_analysis_10_fold_confusion_matrix_menghitung_semua_baris_valid_sekali() {
    let (data, _labels) = mixed_data(&[("A", 15), ("B", 15)], 0);
    let (json, _) = run_ok(
        &data,
        &kfold_config(10, Some(42)),
        &NaiveBayesConfigV2::default(),
        &TextPayload::None,
    );

    // Metrik berasal dari gabungan prediksi seluruh fold: total = 30 (bukan ukuran satu fold).
    let matrix = matrix_of(&json);
    let grand_total: u64 = matrix.iter().map(|row| row.iter().sum::<u64>()).sum();
    assert_eq!(grand_total, 30);
    assert_eq!(u64_of(&json["confusion_matrix"], "grand_total"), 30);
    // Total baris = jumlah anggota kelas sebenarnya (tiap baris diuji tepat sekali).
    let row_totals: Vec<u64> = json["confusion_matrix"]["row_totals"]
        .as_array()
        .expect("row_totals")
        .iter()
        .map(|v| v.as_u64().expect("bilangan bulat"))
        .collect();
    assert_eq!(row_totals, vec![15, 15]);

    // Overall accuracy = diagonal / total dari matriks gabungan.
    let trace: u64 = (0..matrix.len()).map(|i| matrix[i][i]).sum();
    let accuracy = f64_of(&json["evaluation_metrics"]["overall_accuracy"]);
    assert!((accuracy - (trace as f64) / 30.0).abs() < 1e-9, "accuracy {} vs {}", accuracy, trace);

    let scenario = &json["case_processing_summary"]["validation_scenario"];
    assert_eq!(scenario["method"], "kfold");
    assert_eq!(scenario["folds"].as_i64(), Some(10));
    assert_eq!(scenario["seed"].as_i64(), Some(42));
    assert!(scenario["training_percentage"].is_null());
}

// ---------------------------------------------------------------------------------------------
// BB-24 - Fold melebihi anggota kelas terkecil / jumlah instance
// ---------------------------------------------------------------------------------------------

#[test]
fn bb24_fold_melebihi_kelas_terkecil_hanya_peringatan_dan_analisis_tetap_berjalan() {
    // Kelas A hanya 3 baris, 5 fold > 3.
    let warning = validate_fold_count(5, 15, 3).expect("masih sah").expect("harus ada peringatan");
    assert!(warning.contains("exceeds the smallest class size (3)"), "{}", warning);

    let (data, _labels) = mixed_data(&[("A", 3), ("B", 12)], 0);
    let (json, errors) = run_ok(
        &data,
        &kfold_config(5, Some(42)),
        &NaiveBayesConfigV2::default(),
        &TextPayload::None,
    );
    assert_eq!(u64_of(&json["confusion_matrix"], "grand_total"), 15);
    // Peringatan tercatat di kolektor galat konteks `validation.kfold` (bukan galat berkode).
    assert!(errors.has_errors());
    let summary = errors.get_error_summary();
    assert!(summary.contains("validation.kfold"), "{}", summary);
    assert!(summary.contains("exceeds the smallest class size (3)"), "{}", summary);
    assert!(!summary.contains("NB_E_"), "peringatan fold tidak memakai kode NB_E_*: {}", summary);
}

#[test]
fn bb24_fold_melebihi_jumlah_instance_ditolak_tanpa_kode_nb_e() {
    let message = validate_fold_count(40, 15, 3).expect_err("40 fold > 15 instance harus ditolak");
    assert!(
        message.contains("Number of folds (40) cannot be greater than the number of valid instances (15)"),
        "{}",
        message
    );
    let zero = validate_fold_count(0, 15, 3).expect_err("0 fold harus ditolak");
    assert!(zero.contains("Number of folds must be at least 1"), "{}", zero);

    let (data, _labels) = mixed_data(&[("A", 15), ("B", 15)], 0);
    let summary = run_err(
        &data,
        &kfold_config(40, Some(42)),
        &NaiveBayesConfigV2::default(),
        &TextPayload::None,
    );
    assert!(summary.contains("validation.kfold"), "{}", summary);
    assert!(
        summary.contains("cannot be greater than the number of valid instances (30)"),
        "{}",
        summary
    );
    assert!(!summary.contains("NB_E_"), "galat fold tidak berkode NB_E_*: {}", summary);
}

#[test]
fn bb24_stratified_k_fold_mengembalikan_err_untuk_fold_melebihi_instance() {
    let labels = strings(&["A", "A", "B", "B", "B"]);
    let error = stratified_k_fold(&labels, 6, Some(42)).expect_err("6 fold > 5 instance");
    assert!(error.contains("cannot be greater than the number of valid instances (5)"), "{}", error);
    // Tepat sama dengan jumlah instance masih sah (dengan peringatan karena > kelas terkecil).
    let ok = stratified_k_fold(&labels, 5, Some(42)).expect("5 fold = 5 instance sah");
    assert_eq!(ok.folds.len(), 5);
    assert!(ok.warning.is_some());
}

// ---------------------------------------------------------------------------------------------
// BB-25 - CPS, metrik, confusion matrix
// ---------------------------------------------------------------------------------------------

#[test]
fn bb25_metrik_dan_confusion_matrix_nilai_acuan_buatan_tangan_cocok_dengan_sklearn() {
    // actual    = A A A A B B B B B B
    // predicted = A A A B B B B B B A
    // sklearn (1.9.1): confusion [[3,1],[1,5]]; precision/recall/F1 per kelas [0.75, 0.8333333];
    // macro 0.7916667; weighted 0.8; micro 0.8; accuracy 0.8; kappa 0.5833333.
    let actual = strings(&["A", "A", "A", "A", "B", "B", "B", "B", "B", "B"]);
    let predicted = strings(&["A", "A", "A", "B", "B", "B", "B", "B", "B", "A"]);
    let classes = strings(&["A", "B"]);
    let (confusion, metrics) = compute_evaluation_metrics(&actual, &predicted, &classes);

    assert_eq!(confusion.matrix, vec![vec![3, 1], vec![1, 5]]);
    assert_eq!(confusion.row_totals, vec![4, 6]);
    assert_eq!(confusion.col_totals, vec![4, 6]);
    assert_eq!(confusion.grand_total, 10);
    assert!((confusion.percentages[0][0] - 30.0).abs() < 1e-9);
    assert!((confusion.percentages[1][1] - 50.0).abs() < 1e-9);

    let tol = 1e-6;
    assert!((metrics.per_class[0].precision - 0.75).abs() < tol);
    assert!((metrics.per_class[0].recall - 0.75).abs() < tol);
    assert!((metrics.per_class[0].f1 - 0.75).abs() < tol);
    assert!((metrics.per_class[0].accuracy - 0.8).abs() < tol);
    assert!((metrics.per_class[1].precision - 5.0 / 6.0).abs() < tol);
    assert!((metrics.per_class[1].recall - 5.0 / 6.0).abs() < tol);
    assert!((metrics.per_class[1].f1 - 5.0 / 6.0).abs() < tol);
    assert!((metrics.macro_average.precision - 0.7916667).abs() < tol);
    assert!((metrics.macro_average.recall - 0.7916667).abs() < tol);
    assert!((metrics.macro_average.f1 - 0.7916667).abs() < tol);
    assert!((metrics.weighted_average.precision - 0.8).abs() < tol);
    assert!((metrics.weighted_average.f1 - 0.8).abs() < tol);
    assert!((metrics.micro_average.precision - 0.8).abs() < tol);
    assert!((metrics.micro_average.recall - 0.8).abs() < tol);
    assert!((metrics.overall_accuracy - 0.8).abs() < tol);
    assert!((metrics.cohens_kappa - 0.5833333).abs() < tol);
}

#[test]
fn bb25_run_analysis_menghasilkan_cps_metrik_dan_confusion_matrix_konsisten() {
    // 30 baris valid + 2 baris target kosong = 32 instance.
    let (data, _labels) = mixed_data(&[("A", 15), ("B", 15)], 2);
    let (json, _) = run_ok(
        &data,
        &holdout_config(Some(42)),
        &NaiveBayesConfigV2::default(),
        &TextPayload::None,
    );

    // Case Processing Summary
    let cps = &json["case_processing_summary"];
    assert_eq!(cps["total_instances"].as_u64(), Some(32));
    assert_eq!(cps["valid_instances"].as_u64(), Some(30));
    assert_eq!(cps["excluded_target_missing"].as_u64(), Some(2));
    assert_eq!(cps["target_variable"], "Class");
    assert_eq!(cps["attribute_variables"], serde_json::json!(["Temp", "Outlook"]));
    assert_eq!(cps["validation_scenario"]["method"], "holdout");
    assert!(cps.get("text_features").is_none(), "model v1 tidak memuat baris Text features");

    // Confusion Matrix: konsistensi total dan persentase.
    let cm = &json["confusion_matrix"];
    assert_eq!(cm["classes"], serde_json::json!(["A", "B"]));
    let matrix = matrix_of(&json);
    assert_eq!(matrix.len(), 2);
    let grand_total = u64_of(cm, "grand_total");
    let sum_matrix: u64 = matrix.iter().map(|r| r.iter().sum::<u64>()).sum();
    assert_eq!(sum_matrix, grand_total);
    let row_totals: Vec<u64> = cm["row_totals"].as_array().expect("row_totals").iter().map(|v| v.as_u64().expect("int")).collect();
    let col_totals: Vec<u64> = cm["col_totals"].as_array().expect("col_totals").iter().map(|v| v.as_u64().expect("int")).collect();
    assert_eq!(row_totals.iter().sum::<u64>(), grand_total);
    assert_eq!(col_totals.iter().sum::<u64>(), grand_total);
    let percent_sum: f64 = cm["percentages"]
        .as_array()
        .expect("percentages")
        .iter()
        .map(|row| row.as_array().expect("baris").iter().map(f64_of).sum::<f64>())
        .sum();
    assert!((percent_sum - 100.0).abs() < 1e-6, "jumlah persentase {}", percent_sum);

    // Model Evaluation Metrics dihitung dari matriks yang sama.
    let metrics = &json["evaluation_metrics"];
    let trace: u64 = (0..2).map(|i| matrix[i][i]).sum();
    let accuracy = f64_of(&metrics["overall_accuracy"]);
    assert!((accuracy - (trace as f64) / (grand_total as f64)).abs() < 1e-9);
    let per_class = metrics["per_class"].as_array().expect("per_class");
    assert_eq!(per_class.len(), 2);
    for (i, entry) in per_class.iter().enumerate() {
        assert_eq!(entry["class"], if i == 0 { "A" } else { "B" });
        if row_totals[i] > 0 {
            let recall = (matrix[i][i] as f64) / (row_totals[i] as f64);
            assert!((f64_of(&entry["recall"]) - recall).abs() < 1e-9);
        }
        if col_totals[i] > 0 {
            let precision = (matrix[i][i] as f64) / (col_totals[i] as f64);
            assert!((f64_of(&entry["precision"]) - precision).abs() < 1e-9);
        }
    }
    // Micro average pada klasifikasi satu-label = akurasi keseluruhan.
    assert!((f64_of(&metrics["micro_avg"]["precision"]) - accuracy).abs() < 1e-9);
    assert!((f64_of(&metrics["micro_avg"]["recall"]) - accuracy).abs() < 1e-9);
    let kappa = f64_of(&metrics["cohens_kappa"]);
    assert!((-1.0..=1.0).contains(&kappa), "kappa {}", kappa);

    // Attribute Distribution memuat kedua atribut sesuai urutan payload.
    let attributes = json["attribute_distribution"].as_array().expect("attribute_distribution");
    assert_eq!(attributes.len(), 2);
    assert_eq!(attributes[0]["name"], "Temp");
    assert_eq!(attributes[0]["role"], "numerical");
    assert_eq!(attributes[1]["name"], "Outlook");
    assert_eq!(attributes[1]["role"], "categorical");
}

// ---------------------------------------------------------------------------------------------
// BB-26 - isi tabel lengkap untuk Download CSV / Copy
// ---------------------------------------------------------------------------------------------

#[test]
fn bb26_text_feature_table_lengkap_memuat_enam_kolom_untuk_csv_dan_tsv() {
    let (labels, docs) = twenty_docs();
    let (json, _) = run_ok(
        &target_only_data("Class", &labels),
        &holdout_config(Some(42)),
        &raw_config_v2(),
        &raw_payload(&docs),
    );
    let table = &json["text_feature_table"];
    assert_eq!(table["likelihood"], "multinomial");
    let full = table["full"].as_array().expect("full");
    assert!(!full.is_empty());
    for entry in full {
        for key in ["term", "class", "count", "log_weight", "probability", "score"] {
            assert!(entry.get(key).is_some(), "kolom {} hilang pada entri {}", key, entry);
        }
        assert!(entry["term"].is_string());
        assert!(entry["class"].is_string());
        assert!(entry["count"].is_number());
        assert!(entry["log_weight"].is_number());
    }
    let n_terms = json["trained_model"]["text"]["terms"].as_array().expect("terms").len();
    assert_eq!(full.len(), n_terms * 2, "dua kelas x jumlah term");
}

// ---------------------------------------------------------------------------------------------
// BB-27 - peringatan kebocoran jalur Word-Vector
// ---------------------------------------------------------------------------------------------

#[test]
fn bb27_jalur_vector_memuat_catatan_kebocoran_sedangkan_jalur_raw_tidak() {
    let (labels, docs) = twenty_docs();
    let data = target_only_data("Class", &labels);

    // Jalur vector: hitung kemunculan 4 kata sentimen sebagai kolom vektor.
    let columns = ["bagus", "senang", "buruk", "sedih"];
    let values: Vec<Vec<Option<f64>>> = docs
        .iter()
        .map(|doc| {
            columns
                .iter()
                .map(|col| Some(doc.split_whitespace().filter(|w| w == col).count() as f64))
                .collect()
        })
        .collect();
    let vector = TextPayload::Vector {
        columns: strings(&columns),
        values,
    };
    let (json_vector, _) = run_ok(&data, &holdout_config(Some(42)), &NaiveBayesConfigV2::default(), &vector);
    let summary = &json_vector["case_processing_summary"]["text_features"];
    assert_eq!(summary["source"], "vector");
    assert_eq!(summary["leakage_note"], TEXT_LEAKAGE_NOTE);
    assert_eq!(
        summary["leakage_note"],
        "The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic."
    );

    // Jalur raw: tidak ada catatan kebocoran (vektorisasi di-fit per holdout/fold).
    let (json_raw, _) = run_ok(&data, &holdout_config(Some(42)), &raw_config_v2(), &raw_payload(&docs));
    let raw_summary = &json_raw["case_processing_summary"]["text_features"];
    assert_eq!(raw_summary["source"], "raw");
    assert!(raw_summary["leakage_note"].is_null());
}

// ---------------------------------------------------------------------------------------------
// BB-28 - Export Model (JSON schema 2.0 berisi resep)
// ---------------------------------------------------------------------------------------------

#[test]
fn bb28_export_raw_text_schema_2_0_memuat_resep_dan_dapat_diserialisasi_ulang() {
    let (labels, docs) = twenty_docs();
    let (json, _) = run_ok(
        &target_only_data("Class", &labels),
        &holdout_config(Some(42)),
        &raw_config_v2(),
        &raw_payload(&docs),
    );
    let model = &json["trained_model"];
    assert_eq!(model["schema_version"], "2.0");
    assert_eq!(model["model_type"], "naive_bayes");
    assert!(model["trained_at"].is_string());
    assert_eq!(model["target"]["name"], "Class");
    assert_eq!(model["target"]["classes"], serde_json::json!(["neg", "pos"]));
    for key in [
        "features",
        "smoothing_alpha",
        "variance_floor",
        "feature_order",
        "label_mapping",
        "validation_config",
        "missing_value_policy",
        "unseen_category_policy",
        "text",
    ] {
        assert!(model.get(key).is_some(), "kunci ekspor {} hilang", key);
    }

    let text = &model["text"];
    assert_eq!(text["source"], "raw");
    assert_eq!(text["raw_variable"], "Teks");
    let recipe = &text["recipe"];
    assert!(recipe.is_object(), "ekspor jalur raw wajib memuat resep");
    assert_eq!(recipe["recipe_version"], "1.0");
    assert_eq!(recipe["vocabulary"], text["terms"]);
    let n_terms = text["terms"].as_array().expect("terms").len();
    assert_eq!(recipe["idf"].as_array().expect("idf").len(), n_terms);
    assert_eq!(recipe["doc_freq"].as_array().expect("doc_freq").len(), n_terms);
    assert_eq!(recipe["n_docs"].as_u64(), Some(20));

    // Serialisasi teks lalu baca ulang menghasilkan dokumen yang sama (berkas .json yang diunduh).
    let serialized = serde_json::to_string_pretty(model).expect("serialisasi ekspor");
    let reparsed: Value = serde_json::from_str(&serialized).expect("baca ulang ekspor");
    assert_json_close("ekspor", model, &reparsed, 1e-12);
}

#[test]
fn bb28_export_vector_schema_2_0_tanpa_resep_dan_export_numerik_biasa_schema_1_1() {
    let (labels, docs) = twenty_docs();
    let data = target_only_data("Class", &labels);
    let columns = ["bagus", "buruk"];
    let values: Vec<Vec<Option<f64>>> = docs
        .iter()
        .map(|doc| {
            columns
                .iter()
                .map(|col| Some(doc.split_whitespace().filter(|w| w == col).count() as f64))
                .collect()
        })
        .collect();
    let payload = TextPayload::Vector {
        columns: strings(&columns),
        values,
    };
    let (vector_json, _) = run_ok(&data, &holdout_config(Some(42)), &NaiveBayesConfigV2::default(), &payload);
    let text = &vector_json["trained_model"]["text"];
    assert_eq!(vector_json["trained_model"]["schema_version"], "2.0");
    assert_eq!(text["source"], "vector");
    assert!(text["recipe"].is_null(), "jalur vector tidak membawa resep");
    assert_eq!(text["columns"], serde_json::json!(["bagus", "buruk"]));

    let (mixed, _labels) = mixed_data(&[("A", 15), ("B", 15)], 0);
    let (numeric_json, _) = run_ok(&mixed, &holdout_config(Some(42)), &NaiveBayesConfigV2::default(), &TextPayload::None);
    assert_eq!(numeric_json["trained_model"]["schema_version"], "1.1");
    assert!(numeric_json["trained_model"].get("text").is_none());
}

// ---------------------------------------------------------------------------------------------
// Dataset pilkada (BB-22, BB-23, BB-25) - hanya bila berkas tersedia
// ---------------------------------------------------------------------------------------------

fn find_pilkada_train() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(dir) = std::env::var("THESIS_DATA_DIR") {
        candidates.push(Path::new(&dir).join("pilkada_train.csv"));
    }
    // naive-bayes/rust -> naive-bayes -> Classify -> Analyze -> Modals -> components -> frontend -> repo
    let manifest = Path::new(env!("CARGO_MANIFEST_DIR"));
    candidates.push(manifest.join("../../../../../../../Claude outputs/pilkada_train.csv"));
    candidates.push(manifest.join("../../../../../../../dataset_untuk_text/pilkada_train.csv"));
    candidates.push(PathBuf::from("E:\\KULIAH\\Skripsi\\SIDANG\\pilkada_train.csv"));
    candidates.into_iter().find(|path| path.is_file())
}

/// Satu baris CSV (RFC 4180 sederhana; kutip hanya berlaku di awal kolom).
fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        if in_quotes {
            if c == '"' {
                if chars.peek() == Some(&'"') {
                    current.push('"');
                    chars.next();
                } else {
                    in_quotes = false;
                }
            } else {
                current.push(c);
            }
        } else if c == '"' && current.is_empty() {
            in_quotes = true;
        } else if c == ',' {
            fields.push(std::mem::take(&mut current));
        } else {
            current.push(c);
        }
    }
    fields.push(current);
    fields
}

/// (label Sentiment, teks Text Tweet) per baris, atau None bila berkas tidak tersedia.
fn load_pilkada() -> Option<(Vec<String>, Vec<String>)> {
    let path = match find_pilkada_train() {
        Some(path) => path,
        None => {
            if std::env::var("THESIS_REQUIRE_DATA").is_ok() {
                panic!("THESIS_REQUIRE_DATA di-set tetapi pilkada_train.csv tidak ditemukan (set THESIS_DATA_DIR).");
            }
            eprintln!("THESIS_SKIP: pilkada_train.csv tidak ditemukan; tes dilewati (set THESIS_DATA_DIR).");
            return None;
        }
    };
    let bytes = std::fs::read(&path).expect("baca pilkada_train.csv");
    let content = String::from_utf8_lossy(&bytes).into_owned();
    let mut labels: Vec<String> = Vec::new();
    let mut texts: Vec<String> = Vec::new();
    for (index, line) in content.lines().enumerate() {
        if index == 0 || line.trim().is_empty() {
            continue;
        }
        let fields = parse_csv_line(line.trim_end_matches(|c: char| c == '\r' || c == '\n'));
        let label = fields.get(1).map(|s| s.trim().to_string()).unwrap_or_default();
        let text = fields.get(3).cloned().unwrap_or_default();
        if label.is_empty() {
            continue;
        }
        labels.push(label);
        texts.push(text);
    }
    assert!(labels.len() > 100, "pilkada_train.csv terbaca terlalu sedikit baris: {}", labels.len());
    Some((labels, texts))
}

fn run_pilkada(
    labels: &[String],
    texts: &[String],
    config: &NaiveBayesConfig,
) -> Value {
    let data = target_only_data("Sentiment", labels);
    let payload = TextPayload::Raw {
        variable: "Text Tweet".to_string(),
        values: texts.iter().map(|t| Some(t.clone())).collect(),
    };
    let (json, _) = run_ok(&data, config, &raw_config_v2(), &payload);
    json
}

#[test]
fn bb22_pilkada_holdout_70_seed_42_dua_kali_menghasilkan_keluaran_identik() {
    let (labels, texts) = match load_pilkada() {
        Some(loaded) => loaded,
        None => return,
    };
    let config = config_for("Sentiment", "holdout", 70.0, 10, Some(42));
    let first = run_pilkada(&labels, &texts, &config);
    let second = run_pilkada(&labels, &texts, &config);
    assert_eq!(first["confusion_matrix"], second["confusion_matrix"]);
    assert_json_close("pilkada", &stable(&first), &stable(&second), 1e-12);

    let split = stratified_train_holdout_split(&labels, 70, Some(42));
    assert_eq!(
        u64_of(&first["confusion_matrix"], "grand_total") as usize,
        split.holdout_indices.len()
    );
}

#[test]
fn bb23_pilkada_10_fold_cv_metrik_dari_gabungan_prediksi_semua_fold() {
    let (labels, texts) = match load_pilkada() {
        Some(loaded) => loaded,
        None => return,
    };
    let config = config_for("Sentiment", "kfold", 70.0, 10, Some(42));
    let json = run_pilkada(&labels, &texts, &config);
    // Setiap baris diuji tepat satu kali lintas 10 fold.
    assert_eq!(u64_of(&json["confusion_matrix"], "grand_total") as usize, labels.len());
    let matrix = matrix_of(&json);
    let trace: u64 = (0..matrix.len()).map(|i| matrix[i][i]).sum();
    let accuracy = f64_of(&json["evaluation_metrics"]["overall_accuracy"]);
    assert!((accuracy - (trace as f64) / (labels.len() as f64)).abs() < 1e-9);
    // Dua kelas, jumlah baris per kelas sama dengan jumlah anggota kelas pada berkas.
    let negative = labels.iter().filter(|l| l.as_str() == "negative").count() as u64;
    let positive = labels.iter().filter(|l| l.as_str() == "positive").count() as u64;
    let row_totals: Vec<u64> = json["confusion_matrix"]["row_totals"]
        .as_array()
        .expect("row_totals")
        .iter()
        .map(|v| v.as_u64().expect("bilangan bulat"))
        .collect();
    assert_eq!(row_totals, vec![negative, positive]);
}
