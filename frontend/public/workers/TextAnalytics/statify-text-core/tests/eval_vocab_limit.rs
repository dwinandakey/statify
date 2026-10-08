//! Tes tesis Track A (b): *Words to Keep* dan *Min term frequency* pada kasus nilai seri (tie-break).
//!
//! Aturan yang diuji (vectorizer.rs `fit_tokens` langkah 2-4; PLAN_FIX.md D7 dan §3.2; README STWV butir 3):
//!   1. term dengan TOTAL kemunculan (raw count di seluruh dokumen, bukan df) < min_term_freq dibuang;
//!   2. bila words_to_keep > 0 dan jumlah term > words_to_keep: rangking, lalu potong KETAT;
//!        weka/sklearn : total count menurun, seri -> alfabetis (byte-wise) naik;
//!        custom       : skor sum_d TF(d) x IDF menurun (IDF = 1 bila none), seri -> alfabetis;
//!   3. urutan kolom akhir = alfabetis byte-wise.
//!
//! Harapan skenario berasal dari `eval_data/vocab_limit_cases.json`, ditulis oleh
//! `testing/text_analytics_eval/unit/reference_values.py` (implementasi aturan di atas yang independen dari Rust;
//! skrip memastikan harapan tulisan-tangan = hitungan acuan). Log: `logs/reference_values.txt`.
//!
//! Sudah tercakup oleh tes lama (tidak diulang): `s3_formulas.rs::words_to_keep_tie_break_alfabetis_weka_dan_sklearn`
//! (korpus D keep=2), `words_to_keep_1_weka_adalah_makan_dengan_count_4`, `words_to_keep_0_menyimpan_semua_kata`,
//! `min_term_freq_2_membuang_tidak`, `min_term_freq_diterapkan_sebelum_words_to_keep`,
//! `min_term_freq_terlalu_besar_menghasilkan_empty_vocabulary`. Catatan: pernyataan seri-tiga-arah pada tes lama
//! `words_to_keep_tie_break_alfabetis_weka_dan_sklearn` berbentuk tautologi (membandingkan `out.vocabulary`
//! dengan dirinya sendiri), sehingga kasus itu dijaga ulang secara nyata di berkas ini.

use statify_text_core::{fit, run_pipeline, TextVectorizerConfig, VectorizerOutput};

const CASES_JSON: &str = include_str!("eval_data/vocab_limit_cases.json");

fn korpus_d() -> Vec<String> {
    vec![
        "Saya suka makan nasi".to_string(),
        "Saya tidak suka nasi!".to_string(),
        "Makan, makan, makan".to_string(),
    ]
}

fn docs(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| s.to_string()).collect()
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

fn run(d: &[String], overrides: serde_json::Value) -> VectorizerOutput {
    run_pipeline(d, &cfg(overrides)).expect("pipeline harus sukses")
}

fn strs(v: &[String]) -> Vec<&str> {
    v.iter().map(|s| s.as_str()).collect()
}

// ── Data-driven: seluruh skenario dari reference_values.py ──────────────────

#[test]
fn skenario_acuan_words_to_keep_dan_min_term_freq() {
    let data: serde_json::Value = serde_json::from_str(CASES_JSON).expect("vocab_limit_cases.json harus JSON valid");
    let cases = data["cases"].as_array().expect("cases harus array");
    assert_eq!(cases.len(), 16, "jumlah skenario acuan berubah; jalankan ulang reference_values.py");
    for c in cases {
        let name = c["name"].as_str().expect("name");
        let d: Vec<String> = c["docs"]
            .as_array()
            .expect("docs")
            .iter()
            .map(|x| x.as_str().expect("doc string").to_string())
            .collect();
        let expected: Vec<String> = c["expected_vocabulary"]
            .as_array()
            .expect("expected_vocabulary")
            .iter()
            .map(|x| x.as_str().expect("term string").to_string())
            .collect();
        let out = run(&d, c["overrides"].clone());
        assert_eq!(out.vocabulary, expected, "skenario {}", name);
        assert_eq!(out.stats.vocabulary_size, expected.len(), "skenario {}", name);
        assert_eq!(out.matrix.len(), d.len(), "skenario {}", name);
        for row in &out.matrix {
            assert_eq!(row.len(), expected.len(), "skenario {}: lebar matriks = ukuran kosakata", name);
        }
    }
}

// ── Words to Keep: seri ─────────────────────────────────────────────────────

#[test]
fn words_to_keep_seri_tiga_arah_di_batas_dipilih_alfabetis_bukan_urutan_kemunculan() {
    // "c b a" + "z z": z=2; a=b=c=1 seri. Keep 2 -> z + (seri terkecil alfabetis = a). Urutan kolom: a, z.
    let out = run(&docs(&["c b a", "z z"]), serde_json::json!({ "words_to_keep": 2 }));
    assert_eq!(out.vocabulary, vec!["a", "z"]);
    assert_eq!(out.matrix, vec![vec![1.0, 0.0], vec![0.0, 2.0]]);
}

#[test]
fn words_to_keep_memotong_ketat_walau_banyak_term_seri() {
    // Weka asli menyimpan semua term seri di batas; Statify memotong tepat words_to_keep kolom (README STWV (c)).
    let out = run(&docs(&["a b c d"]), serde_json::json!({ "words_to_keep": 1 }));
    assert_eq!(out.vocabulary, vec!["a"]);
    assert_eq!(out.stats.vocabulary_size, 1);
    assert_eq!(out.matrix, vec![vec![1.0]]);

    for k in 1..=3usize {
        let out = run(&docs(&["f e d c b a"]), serde_json::json!({ "words_to_keep": k }));
        assert_eq!(out.vocabulary.len(), k, "words_to_keep = {}", k);
    }
}

#[test]
fn words_to_keep_seri_diurutkan_bytewise_huruf_besar_sebelum_huruf_kecil() {
    // lowercase = false: "Mango" (M=77) < "Zebra" (Z=90) < "apple" (a=97). Keep 2 -> Mango, Zebra.
    let out = run(
        &docs(&["Zebra apple Mango"]),
        serde_json::json!({ "words_to_keep": 2, "lowercase": false }),
    );
    assert_eq!(out.vocabulary, vec!["Mango", "Zebra"]);
}

#[test]
fn words_to_keep_hasil_stabil_pada_pengulangan_walau_urutan_hashmap_acak() {
    // HashMap memakai RandomState berbeda tiap instance: bila tie-break bergantung pada urutan iterasi,
    // hasil akan berubah antar pemanggilan. Seluruh pemanggilan harus identik.
    let d = docs(&["f e d c b a", "a b"]);
    let acuan = run(&d, serde_json::json!({ "words_to_keep": 3 })).vocabulary;
    // a=2, b=2 (teratas); c..f = 1 seri -> "c" terkecil.
    assert_eq!(acuan, vec!["a", "b", "c"]);
    for _ in 0..30 {
        assert_eq!(run(&d, serde_json::json!({ "words_to_keep": 3 })).vocabulary, acuan);
    }
}

#[test]
fn words_to_keep_sama_dengan_atau_melebihi_jumlah_kandidat_tidak_memotong() {
    for k in [5usize, 6, 1000] {
        let out = run(&korpus_d(), serde_json::json!({ "words_to_keep": k }));
        assert_eq!(out.vocabulary, vec!["makan", "nasi", "saya", "suka", "tidak"], "keep = {}", k);
    }
}

#[test]
fn words_to_keep_3_pada_korpus_d_memilih_makan_nasi_saya() {
    // makan=4 teratas; nasi=saya=suka=2 seri -> nasi, saya (suka tersingkir alfabetis).
    for o in [
        serde_json::json!({ "words_to_keep": 3 }),
        serde_json::json!({ "formula_standard": "sklearn", "idf_method": "smooth", "words_to_keep": 3 }),
    ] {
        let out = run(&korpus_d(), o);
        assert_eq!(out.vocabulary, vec!["makan", "nasi", "saya"]);
    }
}

// ── Words to Keep pada preset Custom (skor TF x IDF) ────────────────────────

#[test]
fn custom_ranking_memakai_skor_bukan_total_count_dan_seri_alfabetis() {
    // a muncul 1x di dokumen pendek (TF normalized 1.0); x muncul 7x di dokumen 10 token (0.7); b 3x (0.3).
    // Custom (sum TF): a=1.0 > x=0.7 > b=0.3 -> keep 2 = a, x. Weka (total count): x=7, b=3 -> b, x.
    let d = docs(&["a", "b b b x x x x x x x"]);
    let custom = run(
        &d,
        serde_json::json!({
            "formula_standard": "custom", "tf_method": "normalized", "idf_method": "none", "words_to_keep": 2
        }),
    );
    assert_eq!(custom.vocabulary, vec!["a", "x"]);
    let weka = run(&d, serde_json::json!({ "words_to_keep": 2 }));
    assert_eq!(weka.vocabulary, vec!["b", "x"]);

    // Semua skor sama (TF binary, IDF none) -> seri -> alfabetis.
    let seri = run(
        &docs(&["d c b a"]),
        serde_json::json!({
            "formula_standard": "custom", "tf_method": "binary", "idf_method": "none", "words_to_keep": 2
        }),
    );
    assert_eq!(seri.vocabulary, vec!["a", "b"]);
}

// ── Min term frequency ──────────────────────────────────────────────────────

#[test]
fn min_term_freq_batas_inklusif_count_sama_dipertahankan() {
    // x=3, y=2, z=1.
    let d = docs(&["x x x y y z"]);
    assert_eq!(run(&d, serde_json::json!({ "min_term_freq": 1 })).vocabulary, vec!["x", "y", "z"]);
    assert_eq!(run(&d, serde_json::json!({ "min_term_freq": 2 })).vocabulary, vec!["x", "y"]);
    assert_eq!(run(&d, serde_json::json!({ "min_term_freq": 3 })).vocabulary, vec!["x"]);
    let e = run_pipeline(&d, &cfg(serde_json::json!({ "min_term_freq": 4 }))).unwrap_err();
    assert_eq!(e.code, "EMPTY_VOCABULARY");
}

#[test]
fn min_term_freq_menghitung_total_kemunculan_bukan_jumlah_dokumen() {
    // x: total 3 tetapi df = 1 (satu dokumen) -> lolos min_term_freq = 3.
    // y: total 2 dengan df = 2 -> gugur.
    let d = docs(&["x x x", "y", "y"]);
    let out = run(&d, serde_json::json!({ "min_term_freq": 3 }));
    assert_eq!(out.vocabulary, vec!["x"]);
    assert_eq!(out.stats.empty_documents, 2, "dokumen yang kehilangan semua term menjadi baris nol");
}

#[test]
fn min_term_freq_lalu_words_to_keep_dengan_seri() {
    // d=1 gugur (mtf=2); a=b=c=2 seri; keep 2 -> a, b.
    let d = docs(&["a a b b c c d"]);
    let out = run(&d, serde_json::json!({ "min_term_freq": 2, "words_to_keep": 2 }));
    assert_eq!(out.vocabulary, vec!["a", "b"]);
}

#[test]
fn min_term_freq_dihitung_pada_token_ngram_juga() {
    // "a b a b": unigram a=2, b=2; bigram "a b"=2, "b a"=1. min_term_freq=2 -> a, a b, b (urut byte-wise).
    let out = run(
        &docs(&["a b a b"]),
        serde_json::json!({ "min_term_freq": 2, "ngram_min": 1, "ngram_max": 2 }),
    );
    assert_eq!(strs(&out.vocabulary), vec!["a", "a b", "b"]);
}

// ── Konsistensi model: df/IDF hanya untuk kosakata akhir, N dari seluruh dokumen ──

#[test]
fn pemangkasan_kosakata_tidak_mengubah_n_dokumen_dan_df_term_yang_tersisa() {
    // D dengan keep 2 -> [makan, nasi]; N tetap 3 (semua dokumen), df makan = 2 (D1, D3), nasi = 2 (D1, D2).
    let model = fit(
        &korpus_d(),
        &cfg(serde_json::json!({ "words_to_keep": 2, "idf_method": "standard" })),
    )
    .expect("fit harus sukses");
    assert_eq!(model.vocabulary, vec!["makan", "nasi"]);
    assert_eq!(model.n_docs, 3);
    assert_eq!(model.doc_freq, vec![2, 2]);
    let idf_acuan = (3.0_f64 / 2.0).ln(); // 0.405465 (hitung tangan, reference_values.txt)
    assert_eq!(model.idf.len(), 2);
    for v in &model.idf {
        assert!((v - idf_acuan).abs() < 1e-6, "idf {} seharusnya {}", v, idf_acuan);
    }
}
