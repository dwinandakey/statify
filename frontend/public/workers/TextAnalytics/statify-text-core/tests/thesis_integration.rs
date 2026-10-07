//! Tes tesis Track F (IT-05, sisi Rust): peran serde_json `float_roundtrip` pada penyimpanan model.
//!
//! Konteks: pada IT-05 model disimpan ke berkas JSON lalu dimuat dalam sesi baru. Di aplikasi (browser) teks JSON
//! ditulis dan dibaca oleh JavaScript (JSON.stringify/JSON.parse, round-trip eksak untuk double hingga); modul wasm
//! NB/AM menerima model sebagai objek (serde_wasm_bindgen) sehingga tidak mem-parse teks JSON. Fitur
//! `float_roundtrip` (Cargo.toml crate ini) tetap menjadi jaminan untuk setiap kode Rust yang membaca model sebagai TEKS
//! (mis. tes Rust, alat baris perintah): tanpa fitur itu serde_json dapat menggeser hasil baca sebanyak 1 ulp.
//!
//! Dua tes:
//!   1. f64 acak (seed 42) -> `to_string` / `to_string_pretty` -> `from_str` -> bit identik.
//!   2. Model vectorizer (K1: Weka raw/none/none; K5: log1p/standard/doc_length) -> JSON berformat rapi (seperti berkas
//!      Export Model) -> dimuat ulang -> idf bit identik dan `transform` menghasilkan CSR identik pada data latih dan baru.
//!
//! Tes ini TIDAK dapat dikompilasi di sandbox evaluasi (tidak ada cargo/crates); dijalankan pengguna di Windows lewat
//! `run_F.ps1` (cargo test --test thesis_integration).

use statify_text_core::{fit, transform, TextVectorizerConfig, TextVectorizerModel};

/// Pembangkit LCG 64-bit deterministik (seed 42).
struct Lcg(u64);
impl Lcg {
    fn next(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        self.0
    }
}

#[test]
fn f64_acak_json_roundtrip_bit_identik() {
    let mut rng = Lcg(42);
    let mut nilai: Vec<f64> = vec![
        0.1,
        0.2,
        0.30000000000000004,
        1.0 / 3.0,
        f64::EPSILON,
        f64::MIN_POSITIVE,
        f64::MAX,
        5e-324,
        -0.5,
        1.1104084639816971,
        1.1104084639816973,
        (0.5f64).ln(),
        -std::f64::consts::LN_2,
    ];
    while nilai.len() < 100_000 {
        let x = f64::from_bits(rng.next());
        if x.is_finite() {
            nilai.push(x);
        }
    }

    for x in &nilai {
        let teks = serde_json::to_string(x).unwrap();
        let balik: f64 = serde_json::from_str(&teks).unwrap();
        assert_eq!(balik.to_bits(), x.to_bits(), "round-trip skalar menggeser {} (teks {})", x, teks);
    }

    // Larik, dibaca sebagai Vec<f64> maupun serde_json::Value, dengan penulisan rapat dan rapi (indentasi seperti berkas model).
    for tulis in [serde_json::to_string(&nilai).unwrap(), serde_json::to_string_pretty(&nilai).unwrap()] {
        let vec_balik: Vec<f64> = serde_json::from_str(&tulis).unwrap();
        assert_eq!(vec_balik.len(), nilai.len());
        for (a, b) in vec_balik.iter().zip(nilai.iter()) {
            assert_eq!(a.to_bits(), b.to_bits());
        }
        let value: serde_json::Value = serde_json::from_str(&tulis).unwrap();
        let arr = value.as_array().unwrap();
        assert_eq!(arr.len(), nilai.len());
        for (v, b) in arr.iter().zip(nilai.iter()) {
            assert_eq!(v.as_f64().unwrap().to_bits(), b.to_bits());
        }
    }
}

fn korpus() -> Vec<String> {
    [
        "Saya suka makan nasi goreng",
        "Saya tidak suka nasi basah",
        "Makan makan makan setiap hari",
        "Pemilihan kepala daerah berjalan lancar dan damai",
        "Calon pemimpin harus jujur dan amanah",
        "Tidak suka dengan janji kampanye yang kosong",
        "Debat kandidat sangat bagus dan informatif",
        "Hasil survei menunjukkan dukungan meningkat",
        "Kampanye hitam merusak demokrasi kita",
        "Pemimpin baik membawa perubahan nyata",
        "Janji palsu membuat rakyat kecewa",
        "Saya percaya pada kandidat yang jujur",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect()
}

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

#[test]
fn model_k1_k5_json_rapi_dimuat_ulang_transform_identik() {
    let latih = korpus();
    let baru: Vec<String> = ["Saya suka kandidat jujur", "tidak ada janji palsu hari ini"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    let kasus = [
        ("K1 weka raw/none/none", serde_json::json!({})),
        (
            "K5 weka log1p/standard/doc_length",
            serde_json::json!({ "tf_method": "log1p", "idf_method": "standard", "normalization": "doc_length" }),
        ),
        (
            "K4 sklearn raw/smooth/l2",
            serde_json::json!({ "formula_standard": "sklearn", "idf_method": "smooth", "normalization": "l2" }),
        ),
    ];
    for (nama, overrides) in kasus {
        let config = cfg(overrides);
        let model = fit(&latih, &config).unwrap_or_else(|e| panic!("{}: fit gagal: {}", nama, e));
        let teks = serde_json::to_string_pretty(&model).unwrap_or_else(|e| panic!("{}: {}", nama, e));
        let pulih: TextVectorizerModel =
            serde_json::from_str(&teks).unwrap_or_else(|e| panic!("{}: muat ulang gagal: {}", nama, e));

        assert_eq!(pulih.vocabulary, model.vocabulary, "{}", nama);
        assert_eq!(pulih.doc_freq, model.doc_freq, "{}", nama);
        assert_eq!(pulih.n_docs, model.n_docs, "{}", nama);
        assert_eq!(pulih.idf.len(), model.idf.len(), "{}", nama);
        for (a, b) in pulih.idf.iter().zip(model.idf.iter()) {
            assert_eq!(a.to_bits(), b.to_bits(), "{}: idf bergeser", nama);
        }
        assert_eq!(
            pulih.avg_doc_norm.map(f64::to_bits),
            model.avg_doc_norm.map(f64::to_bits),
            "{}: avg_doc_norm bergeser",
            nama
        );

        let asli_latih = transform(&model, &latih).unwrap_or_else(|e| panic!("{}: {}", nama, e));
        let ulang_latih = transform(&pulih, &latih).unwrap_or_else(|e| panic!("{}: {}", nama, e));
        assert_eq!(asli_latih, ulang_latih, "{}: CSR data latih berbeda", nama);
        let asli_baru = transform(&model, &baru).unwrap_or_else(|e| panic!("{}: {}", nama, e));
        let ulang_baru = transform(&pulih, &baru).unwrap_or_else(|e| panic!("{}: {}", nama, e));
        assert_eq!(asli_baru, ulang_baru, "{}: CSR data baru berbeda", nama);
    }
}
