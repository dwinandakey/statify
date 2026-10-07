//! Tes tesis Track A (a): rumus TF, IDF, dan normalisasi terhadap nilai acuan INDEPENDEN.
//!
//! Nilai acuan dihitung oleh `testing/thesis-eval/unit/reference_values.py` (Python + numpy, dari
//! DEFINISI rumus pada `vectorizer.rs`/PLAN_FIX.md, bukan dari keluaran Rust) dan disimpan di
//! `tests/thesis_data/formula_grid.json`. Keluaran skrip: `testing/thesis-eval/logs/reference_values.txt`.
//!
//! Korpus D (D1, D2, D3) = "Saya suka makan nasi" / "Saya tidak suka nasi!" / "Makan, makan, makan".
//! Toleransi 1e-6 (nilai acuan JSON berpresisi penuh, jadi pada praktiknya jauh lebih ketat).
//!
//! Tes yang SUDAH ada di `s3_formulas.rs` (golden §3.6: raw/none, log1p+standard, raw+standard+doc_length,
//! sklearn smooth+l2, plus1+l2, sublinear+smooth, l1 dan l2 menjumlah/bernorma satu) tidak diulang secara
//! terpisah, tetapi nilainya ikut tercakup oleh grid 80 kombinasi di sini sebagai verifikasi silang.

use statify_text_core::{run_pipeline, TextVectorizerConfig, VectorizerOutput};

const TOL: f64 = 1e-6;
const GRID_JSON: &str = include_str!("thesis_data/formula_grid.json");

/// Korpus acuan D.
fn korpus_d() -> Vec<String> {
    vec![
        "Saya suka makan nasi".to_string(),
        "Saya tidak suka nasi!".to_string(),
        "Makan, makan, makan".to_string(),
    ]
}

/// Config dasar (Weka raw/none/none); field dapat ditimpa lewat `overrides`.
fn cfg(overrides: serde_json::Value) -> TextVectorizerConfig {
    let mut base = serde_json::json!({
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
        "min_term_freq": 1,
    });
    if let (Some(b), Some(o)) = (base.as_object_mut(), overrides.as_object()) {
        for (k, v) in o {
            b.insert(k.clone(), v.clone());
        }
    }
    TextVectorizerConfig::from_json_value(base).expect("config uji harus valid")
}

fn run(docs: &[String], overrides: serde_json::Value) -> VectorizerOutput {
    run_pipeline(docs, &cfg(overrides)).expect("pipeline harus sukses")
}

fn grid() -> serde_json::Value {
    serde_json::from_str(GRID_JSON).expect("formula_grid.json harus JSON valid")
}

/// Ambil matriks acuan satu kombinasi dari grid.
fn expected(grid: &serde_json::Value, tf: &str, idf: &str, norm: &str) -> Vec<Vec<f64>> {
    let entries = grid["entries"].as_array().expect("entries harus array");
    for e in entries {
        if e["tf"].as_str() == Some(tf) && e["idf"].as_str() == Some(idf) && e["norm"].as_str() == Some(norm) {
            return e["matrix"]
                .as_array()
                .expect("matrix harus array")
                .iter()
                .map(|row| {
                    row.as_array()
                        .expect("baris harus array")
                        .iter()
                        .map(|x| x.as_f64().expect("sel harus f64"))
                        .collect::<Vec<f64>>()
                })
                .collect::<Vec<Vec<f64>>>();
        }
    }
    panic!("kombinasi {} {} {} tidak ada di formula_grid.json", tf, idf, norm);
}

fn assert_matrix(actual: &[Vec<f64>], exp: &[Vec<f64>], ctx: &str) {
    assert_eq!(actual.len(), exp.len(), "[{}] jumlah baris berbeda", ctx);
    for (r, (a_row, e_row)) in actual.iter().zip(exp.iter()).enumerate() {
        assert_eq!(a_row.len(), e_row.len(), "[{}] jumlah kolom baris {} berbeda", ctx, r);
        for (c, (a, e)) in a_row.iter().zip(e_row.iter()).enumerate() {
            assert!(
                (a - e).abs() < TOL,
                "[{}] sel [{}][{}]: dapat {} seharusnya {}",
                ctx,
                r,
                c,
                a,
                e
            );
        }
    }
}

fn assert_close(actual: f64, exp: f64, ctx: &str) {
    assert!((actual - exp).abs() < TOL, "[{}] dapat {} seharusnya {}", ctx, actual, exp);
}

const VOCAB_D: [&str; 5] = ["makan", "nasi", "saya", "suka", "tidak"];

/// Jalankan satu kombinasi pada standar `custom` (menerima semua kombinasi) dan bandingkan dengan grid.
fn check_combo(tf: &str, idf: &str, norm: &str) -> VectorizerOutput {
    let g = grid();
    let out = run(
        &korpus_d(),
        serde_json::json!({
            "formula_standard": "custom", "tf_method": tf, "idf_method": idf, "normalization": norm
        }),
    );
    assert_eq!(out.vocabulary, VOCAB_D);
    assert_matrix(&out.matrix, &expected(&g, tf, idf, norm), &format!("{}/{}/{}", tf, idf, norm));
    out
}

// ── TF: lima rumus (idf = none, norm = none) ────────────────────────────────

#[test]
fn tf_binary_pada_korpus_d() {
    let out = check_combo("binary", "none", "none");
    // "makan" muncul 3x di D3 tetapi TF binary tetap 1.
    assert_close(out.matrix[2][0], 1.0, "binary D3 makan");
    assert_close(out.matrix[0][0], 1.0, "binary D1 makan");
}

#[test]
fn tf_raw_pada_korpus_d() {
    let out = check_combo("raw", "none", "none");
    assert_close(out.matrix[2][0], 3.0, "raw D3 makan");
}

#[test]
fn tf_log1p_pada_korpus_d() {
    let out = check_combo("log1p", "none", "none");
    // ln(1 + 1) = 0.693147 ; ln(1 + 3) = ln 4 = 1.386294 (hitung tangan)
    assert_close(out.matrix[0][0], 0.693147, "log1p c=1");
    assert_close(out.matrix[2][0], 1.386294, "log1p c=3");
}

#[test]
fn tf_sublinear_pada_korpus_d() {
    let out = check_combo("sublinear", "none", "none");
    // 1 + ln 1 = 1 ; 1 + ln 3 = 2.098612 (hitung tangan)
    assert_close(out.matrix[0][0], 1.0, "sublinear c=1");
    assert_close(out.matrix[2][0], 2.098612, "sublinear c=3");
}

#[test]
fn tf_normalized_pada_korpus_d() {
    let out = check_combo("normalized", "none", "none");
    // D1/D2 punya 4 token -> 1/4 ; D3 punya 3 token (semua "makan") -> 3/3 = 1.
    assert_close(out.matrix[0][0], 0.25, "normalized D1");
    assert_close(out.matrix[1][4], 0.25, "normalized D2 tidak");
    assert_close(out.matrix[2][0], 1.0, "normalized D3");
}

// ── IDF: tiga rumus (tf = raw, norm = none) ─────────────────────────────────

#[test]
fn idf_standard_pada_korpus_d() {
    let out = check_combo("raw", "standard", "none");
    // ln(3/2) = 0.405465 (df = 2) ; ln(3/1) = 1.098612 (df = 1, "tidak")
    assert_close(out.matrix[0][0], 0.405465, "standard df=2");
    assert_close(out.matrix[1][4], 1.098612, "standard df=1");
    assert_close(out.matrix[2][0], 3.0 * 0.405465, "standard D3 = 3 x idf");
}

#[test]
fn idf_smooth_pada_korpus_d() {
    let out = check_combo("raw", "smooth", "none");
    // ln(4/3) + 1 = 1.287682 (df = 2) ; ln(4/2) + 1 = 1.693147 (df = 1)
    assert_close(out.matrix[0][0], 1.287682, "smooth df=2");
    assert_close(out.matrix[1][4], 1.693147, "smooth df=1");
}

#[test]
fn idf_plus1_pada_korpus_d() {
    let out = check_combo("raw", "plus1", "none");
    // ln(3/2) + 1 = 1.405465 (df = 2) ; ln(3/1) + 1 = 2.098612 (df = 1)
    assert_close(out.matrix[0][0], 1.405465, "plus1 df=2");
    assert_close(out.matrix[1][4], 2.098612, "plus1 df=1");
}

// ── Normalisasi baris: L1, L2, doc_length (tf = raw, idf = smooth) ──────────

#[test]
fn normalisasi_l1_nilai_acuan_dan_jumlah_satu() {
    let out = check_combo("raw", "smooth", "l1");
    for (r, row) in out.matrix.iter().enumerate() {
        let s: f64 = row.iter().map(|x| x.abs()).sum();
        assert!((s - 1.0).abs() < 1e-12, "baris {} jumlah |v| = {}", r, s);
    }
    // D2: 1.287682 x3 dan 1.693147 -> jumlah 5.556193 ; sel pertama 1.287682/5.556193 = 0.231756
    assert_close(out.matrix[1][1], 0.231756, "l1 D2 nasi");
    assert_close(out.matrix[1][4], 0.304732, "l1 D2 tidak");
}

#[test]
fn normalisasi_l2_nilai_acuan_dan_norma_satu() {
    let out = check_combo("raw", "smooth", "l2");
    for (r, row) in out.matrix.iter().enumerate() {
        let n: f64 = row.iter().map(|x| x * x).sum::<f64>().sqrt();
        assert!((n - 1.0).abs() < 1e-12, "baris {} norma = {}", r, n);
    }
    assert_close(out.matrix[1][1], 0.459854, "l2 D2 nasi");
    assert_close(out.matrix[1][4], 0.604652, "l2 D2 tidak");
}

#[test]
fn normalisasi_doc_length_semua_baris_bernorma_rata_rata() {
    let out = check_combo("raw", "smooth", "doc_length");
    // Norma L2 baris sebelum normalisasi (raw x smooth): 2.575364, 2.800200, 3.863046 -> rata-rata 3.079537.
    let avg = 3.079537;
    for (r, row) in out.matrix.iter().enumerate() {
        let n: f64 = row.iter().map(|x| x * x).sum::<f64>().sqrt();
        assert_close(n, avg, &format!("norma baris {} setelah doc_length", r));
    }
    assert_close(out.matrix[0][0], 1.539768, "doc_length D1 makan");
    assert_close(out.matrix[2][0], 3.079537, "doc_length D3 makan");
}

// ── Grid penuh 5 TF x 4 IDF x 4 normalisasi = 80 kombinasi ───────────────────

#[test]
fn grid_80_kombinasi_pada_standar_custom() {
    let g = grid();
    let entries = g["entries"].as_array().expect("entries");
    assert_eq!(entries.len(), 80, "grid harus memuat 5 x 4 x 4 kombinasi");
    for e in entries {
        let tf = e["tf"].as_str().expect("tf");
        let idf = e["idf"].as_str().expect("idf");
        let norm = e["norm"].as_str().expect("norm");
        let out = run(
            &korpus_d(),
            serde_json::json!({
                "formula_standard": "custom", "tf_method": tf, "idf_method": idf, "normalization": norm
            }),
        );
        assert_eq!(out.vocabulary, VOCAB_D, "{}/{}/{}", tf, idf, norm);
        let exp = expected(&g, tf, idf, norm);
        assert_matrix(&out.matrix, &exp, &format!("{}/{}/{}", tf, idf, norm));
        // Semua sel hingga (tanpa NaN/Inf), termasuk idf standard bernilai ln(N/df) > 0.
        for row in &out.matrix {
            assert!(row.iter().all(|v| v.is_finite()), "{}/{}/{} memuat NaN/Inf", tf, idf, norm);
        }
        assert_eq!(
            out.stats.method,
            format!("TF: {}, IDF: {}, Norm: {}, Keep: 1000, MinFreq: 1", tf, idf, norm)
        );
    }
}

#[test]
fn grid_preset_weka_hanya_kombinasi_sah_dan_hasil_sama() {
    let g = grid();
    let entries = g["entries"].as_array().expect("entries");
    let mut jumlah = 0;
    for e in entries {
        if e["weka_ok"].as_bool() != Some(true) {
            continue;
        }
        let tf = e["tf"].as_str().expect("tf");
        let idf = e["idf"].as_str().expect("idf");
        let norm = e["norm"].as_str().expect("norm");
        let out = run(
            &korpus_d(),
            serde_json::json!({
                "formula_standard": "weka", "tf_method": tf, "idf_method": idf, "normalization": norm
            }),
        );
        assert_eq!(out.stats.formula_standard, "weka");
        assert_matrix(&out.matrix, &expected(&g, tf, idf, norm), &format!("weka {}/{}/{}", tf, idf, norm));
        jumlah += 1;
    }
    assert_eq!(jumlah, 12, "preset Weka: 3 TF x 2 IDF x 2 normalisasi");
}

#[test]
fn grid_preset_sklearn_hanya_kombinasi_sah_dan_hasil_sama() {
    let g = grid();
    let entries = g["entries"].as_array().expect("entries");
    let mut jumlah = 0;
    for e in entries {
        if e["sklearn_ok"].as_bool() != Some(true) {
            continue;
        }
        let tf = e["tf"].as_str().expect("tf");
        let idf = e["idf"].as_str().expect("idf");
        let norm = e["norm"].as_str().expect("norm");
        let out = run(
            &korpus_d(),
            serde_json::json!({
                "formula_standard": "sklearn", "tf_method": tf, "idf_method": idf, "normalization": norm
            }),
        );
        assert_eq!(out.stats.formula_standard, "sklearn");
        assert_matrix(&out.matrix, &expected(&g, tf, idf, norm), &format!("sklearn {}/{}/{}", tf, idf, norm));
        jumlah += 1;
    }
    assert_eq!(jumlah, 27, "preset sklearn: 3 TF x 3 IDF x 3 normalisasi");
}

// ── Definisi T(d) pada TF normalized ────────────────────────────────────────

#[test]
fn tf_normalized_memakai_total_token_termasuk_ngram_sebelum_pemangkasan() {
    // Dokumen "a b c" dan "a a" dengan n-gram 1-2: T(d1) = 3 unigram + 2 bigram = 5, T(d2) = 2 + 1 = 3.
    // min_term_freq = 2 menyisakan satu kata ("a": total 3) tetapi T(d) tidak berubah:
    // sel = 1/5 = 0.2 dan 2/3 = 0.666667 (acuan: reference_values.py, bagian "TF normalized").
    let docs = vec!["a b c".to_string(), "a a".to_string()];
    let out = run(
        &docs,
        serde_json::json!({
            "formula_standard": "custom", "tf_method": "normalized",
            "ngram_min": 1, "ngram_max": 2, "min_term_freq": 2
        }),
    );
    assert_eq!(out.vocabulary, vec!["a"]);
    assert_close(out.matrix[0][0], 0.2, "T(d1)=5");
    assert_close(out.matrix[1][0], 0.666667, "T(d2)=3");
}
