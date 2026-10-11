//! Tes tesis Track A (c): stopword Indonesia dan Inggris, stopword kustom, stemmer Sastrawi (Indonesia) dan
//! Porter/Snowball (Inggris), serta n-gram 1-5.
//!
//! Sumber harapan:
//!   - `eval_data/pipeline_cases.json`  : keluaran `testing/text_analytics_eval/unit/reference_values.py` (penyaringan
//!     stopword dan pembangkitan n-gram dihitung ulang di Python, independen dari Rust);
//!   - `eval_data/stopwords_id.json` / `stopwords_en.json` : salinan `INDONESIAN_STOPWORDS` /
//!     `ENGLISH_STOPWORDS` dari `StringToWordVector/constants/stopwords.ts`. Daftar inilah yang dikirim UI ke
//!     Rust lewat `custom_stopwords` (lihat `config.ts::buildCustomStopwords`); kesamaan isinya dengan berkas
//!     TypeScript dijaga oleh tes Jest `StringToWordVector/__tests__/eval/stopwords.eval.test.ts`.
//!
//! KETERBATASAN STEMMER (jujur): keluaran Sastrawi/Porter tidak dapat dihitung ulang di sandbox ini (tidak ada
//! Sastrawi/NLTK). Ekspektasi KETAT hanya dipakai untuk (1) pasangan yang sudah terbukti di tes lama repo
//! (`memakan` -> `makan`, `running` -> `run`) dan (2) contoh Porter2 klasik dari dokumentasi algoritma Snowball
//! English (langkah 1a/1b: cats, ponies, caresses, ties, cries, jumped). Untuk kata Indonesia lain hanya sifat
//! (properti) yang diuji: tidak kosong, tidak lebih panjang, huruf kecil, deterministik.
//!
//! Sudah tercakup oleh tes lama (tidak diulang): `characterization.rs::{ngram_unigram_vs_bigram,
//! stopwords_custom_tidak_peka_huruf_besar_kecil, stemming_indonesia_memakan_menjadi_makan,
//! stemming_inggris_running_menjadi_run, stemming_selalu_lowercase_walau_opsi_lowercase_mati}`,
//! `s2_pipeline.rs::{t6_stopwords_json_rusak_menghasilkan_invalid_stopwords, stopwords_metode_bawaan_dengan_daftar_dari_frontend_memfilter,
//! stopwords_tanpa_daftar_lanjut_tanpa_filter, pipeline_stopwords_dan_stemming_inggris, validasi_rentang_config}`.

use statify_text_core::{
    fit, ngram, preprocess_documents, run_pipeline, stemmer, stopwords, StemmingMethod, StopwordsMethod,
    TextVectorizerConfig,
};

const PIPELINE_JSON: &str = include_str!("eval_data/pipeline_cases.json");
const STOPWORDS_ID_JSON: &str = include_str!("eval_data/stopwords_id.json");
const STOPWORDS_EN_JSON: &str = include_str!("eval_data/stopwords_en.json");

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

fn docs(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| s.to_string()).collect()
}

/// Token hasil pipeline NLP (tokenize -> stopword -> stem -> n-gram) untuk satu dokumen.
fn tokens_of(doc: &str, overrides: serde_json::Value) -> Vec<String> {
    let c = cfg(overrides);
    let mut hasil = preprocess_documents(&[doc.to_string()], &c).expect("preprocess harus sukses");
    assert_eq!(hasil.len(), 1, "satu dokumen -> satu entri");
    hasil.remove(0)
}

fn json_strings(v: &serde_json::Value) -> Vec<String> {
    v.as_array()
        .expect("harus array")
        .iter()
        .map(|x| x.as_str().expect("harus string").to_string())
        .collect::<Vec<String>>()
}

fn pipeline_data() -> serde_json::Value {
    serde_json::from_str(PIPELINE_JSON).expect("pipeline_cases.json harus JSON valid")
}

// ════════════════════════════ Stopword ════════════════════════════════════

#[test]
fn daftar_stopword_bawaan_dimuat_utuh_oleh_build_set() {
    let id = stopwords::build_set(StopwordsMethod::Indonesian, &Some(STOPWORDS_ID_JSON.to_string()))
        .expect("daftar ID harus valid")
        .expect("daftar ID tidak boleh None");
    assert_eq!(id.len(), 758, "INDONESIAN_STOPWORDS berisi 758 entri unik");
    for w in ["yang", "dan", "saya", "tidak", "adalah"] {
        assert!(id.contains(&w.to_string()), "'{}' harus ada di daftar Indonesia", w);
    }
    for w in ["suka", "makan", "nasi"] {
        assert!(!id.contains(&w.to_string()), "'{}' bukan stopword Indonesia", w);
    }

    let en = stopwords::build_set(StopwordsMethod::English, &Some(STOPWORDS_EN_JSON.to_string()))
        .expect("daftar EN harus valid")
        .expect("daftar EN tidak boleh None");
    assert_eq!(en.len(), 1298, "ENGLISH_STOPWORDS berisi 1298 entri unik");
    for w in ["the", "and", "is", "not"] {
        assert!(en.contains(&w.to_string()), "'{}' harus ada di daftar Inggris", w);
    }
    for w in ["dog", "fox", "quick"] {
        assert!(!en.contains(&w.to_string()), "'{}' bukan stopword Inggris", w);
    }
}

#[test]
fn stopword_bawaan_indonesia_dan_inggris_sesuai_acuan_python() {
    let data = pipeline_data();
    let cases = data["stopword_cases"].as_array().expect("stopword_cases");
    assert_eq!(cases.len(), 5, "jumlah skenario acuan berubah; jalankan ulang reference_values.py");
    for c in cases {
        let name = c["name"].as_str().expect("name");
        let method = c["method"].as_str().expect("method");
        let lista = if method == "indonesian" { STOPWORDS_ID_JSON } else { STOPWORDS_EN_JSON };
        let tokens = tokens_of(
            c["doc"].as_str().expect("doc"),
            serde_json::json!({
                "stopwords_method": method,
                "custom_stopwords": lista,
                "lowercase": c["lowercase"].as_bool().expect("lowercase"),
            }),
        );
        assert_eq!(tokens, json_strings(&c["expected_tokens"]), "skenario {}", name);
    }
}

#[test]
fn stopword_indonesia_membuang_kata_negasi_tidak() {
    // Keputusan pemilik (PLAN_FIX.md butir (e) README): daftar bawaan memuat kata negasi "tidak".
    let t = tokens_of(
        "Saya tidak suka nasi",
        serde_json::json!({ "stopwords_method": "indonesian", "custom_stopwords": STOPWORDS_ID_JSON }),
    );
    assert_eq!(t, vec!["suka", "nasi"]);
}

#[test]
fn stopword_inggris_tidak_peka_huruf_besar_kecil_walau_lowercase_mati() {
    // lowercase=false: token asli dipertahankan, pencocokan stopword tetap case-insensitive.
    let t = tokens_of(
        "The Quick Fox AND Dog",
        serde_json::json!({
            "stopwords_method": "english", "custom_stopwords": STOPWORDS_EN_JSON, "lowercase": false
        }),
    );
    assert_eq!(t, vec!["Quick", "Fox", "Dog"]);
}

#[test]
fn stopword_kustom_dinormalkan_lowercase_unik_dan_terurut_pada_resep() {
    // Daftar kustom bercampur huruf dan duplikat ("alpha" dan "ALPHA").
    let d = docs(&["alpha beta gamma zeta delta", "gamma delta"]);
    let c = cfg(serde_json::json!({
        "stopwords_method": "custom",
        "custom_stopwords": r#"["Zeta","alpha","ALPHA","beta"]"#,
    }));
    let model = fit(&d, &c).expect("fit harus sukses");
    assert_eq!(model.resolved_stopwords, vec!["alpha", "beta", "zeta"]);
    assert_eq!(model.vocabulary, vec!["delta", "gamma"]);

    // Penyaringan case-insensitive pada dokumen berhuruf campuran.
    let t = tokens_of(
        "alpha Beta gamma ZETA delta",
        serde_json::json!({ "stopwords_method": "custom", "custom_stopwords": r#"["Zeta","alpha","ALPHA","beta"]"# }),
    );
    assert_eq!(t, vec!["gamma", "delta"]);
}

#[test]
fn stopword_metode_none_mengabaikan_daftar_yang_dikirim() {
    let t = tokens_of(
        "saya tidak suka nasi",
        serde_json::json!({ "stopwords_method": "none", "custom_stopwords": STOPWORDS_ID_JSON }),
    );
    assert_eq!(t, vec!["saya", "tidak", "suka", "nasi"]);
}

#[test]
fn stopword_tanpa_daftar_atau_daftar_kosong_tidak_menyaring_apa_pun() {
    for daftar in [serde_json::json!(null), serde_json::json!(""), serde_json::json!("[]")] {
        let t = tokens_of(
            "saya tidak suka nasi",
            serde_json::json!({ "stopwords_method": "indonesian", "custom_stopwords": daftar }),
        );
        assert_eq!(t, vec!["saya", "tidak", "suka", "nasi"], "daftar = {}", daftar);
    }
}

#[test]
fn stopword_json_bukan_array_string_ditolak_invalid_stopwords() {
    for buruk in [r#"{"a":1}"#, "[1,2]", "bukan json", r#"["a", 2]"#] {
        let c = cfg(serde_json::json!({ "stopwords_method": "custom", "custom_stopwords": buruk }));
        let e = preprocess_documents(&docs(&["saya suka nasi"]), &c).unwrap_err();
        assert_eq!(e.code, "INVALID_STOPWORDS", "masukan {}", buruk);
    }
}

#[test]
fn stopword_disaring_sebelum_stemming() {
    // Stopword "makan" membuang token "makan" asli; "memakan" lolos penyaringan lalu di-stem menjadi "makan".
    // Seandainya urutan terbalik (stem dulu, saring kemudian) hasilnya kosong.
    let t = tokens_of(
        "makan memakan",
        serde_json::json!({
            "stopwords_method": "custom", "custom_stopwords": r#"["makan"]"#, "stemming_method": "indonesian"
        }),
    );
    assert_eq!(t, vec!["makan"]);
}

// ════════════════════════════ N-gram 1-5 ══════════════════════════════════

#[test]
fn ngram_generate_semua_rentang_1_sampai_5_sesuai_acuan_python() {
    let data = pipeline_data();
    let cases = data["ngram_cases"].as_array().expect("ngram_cases");
    assert_eq!(cases.len(), 18, "15 rentang (1..=5) + 3 kasus tepi");
    for c in cases {
        let lo = c["min"].as_u64().expect("min") as usize;
        let hi = c["max"].as_u64().expect("max") as usize;
        let tokens = json_strings(&c["tokens"]);
        let expected = json_strings(&c["expected"]);
        assert_eq!(ngram::generate(tokens, lo, hi), expected, "rentang ({}, {})", lo, hi);
    }
}

#[test]
fn ngram_melalui_pipeline_penuh_semua_rentang_sah() {
    let data = pipeline_data();
    let cases = data["ngram_cases"].as_array().expect("ngram_cases");
    for c in cases {
        let lo = c["min"].as_u64().expect("min") as usize;
        let hi = c["max"].as_u64().expect("max") as usize;
        let doc = json_strings(&c["tokens"]).join(" ");
        let t = tokens_of(&doc, serde_json::json!({ "ngram_min": lo, "ngram_max": hi }));
        assert_eq!(t, json_strings(&c["expected"]), "rentang ({}, {}) pada '{}'", lo, hi, doc);
    }
}

#[test]
fn ngram_jumlah_term_sama_dengan_rumus_untuk_tujuh_kata_berbeda() {
    // L = 7 kata unik: jumlah n-gram unik = sum_{n=lo..hi} (L - n + 1).
    // Nilai acuan (reference_values.py): (1,1)=7 (1,2)=13 (1,3)=18 (1,4)=22 (1,5)=25 (2,2)=6 (3,5)=12.
    let doc = "a b c d e f g";
    for (lo, hi, jumlah) in [(1usize, 1usize, 7usize), (1, 2, 13), (1, 3, 18), (1, 4, 22), (1, 5, 25), (2, 2, 6), (3, 5, 12)] {
        let out = run_pipeline(
            &docs(&[doc]),
            &cfg(serde_json::json!({ "ngram_min": lo, "ngram_max": hi })),
        )
        .expect("pipeline harus sukses");
        assert_eq!(out.vocabulary.len(), jumlah, "rentang ({}, {})", lo, hi);
        assert_eq!(out.stats.vocabulary_size, jumlah, "rentang ({}, {})", lo, hi);
    }
}

#[test]
fn ngram_hanya_bigram_tanpa_unigram_dan_token_kurang_dari_minimum_menghasilkan_kosong() {
    assert_eq!(
        tokens_of("a b c", serde_json::json!({ "ngram_min": 2, "ngram_max": 2 })),
        vec!["a b", "b c"]
    );
    // Dua token tidak cukup untuk trigram -> tanpa token; bila SEMUA dokumen begitu -> EMPTY_VOCABULARY.
    assert!(tokens_of("a b", serde_json::json!({ "ngram_min": 3, "ngram_max": 3 })).is_empty());
    let e = run_pipeline(
        &docs(&["a b"]),
        &cfg(serde_json::json!({ "ngram_min": 3, "ngram_max": 3 })),
    )
    .unwrap_err();
    assert_eq!(e.code, "EMPTY_VOCABULARY");
}

#[test]
fn ngram_dibentuk_setelah_stopword_dan_stemming_dan_tidak_melintasi_kata_terbuang() {
    // "saya" dibuang sebelum n-gram: tidak ada bigram "saya suka".
    let t = tokens_of(
        "saya suka makan nasi",
        serde_json::json!({
            "stopwords_method": "custom", "custom_stopwords": r#"["saya"]"#, "ngram_min": 1, "ngram_max": 2
        }),
    );
    assert_eq!(t, vec!["suka", "makan", "nasi", "suka makan", "makan nasi"]);

    // Stemming dulu ("memakan" -> "makan"), baru bigram dibentuk dari kata dasar: tanpa stemming bigramnya
    // akan "memakan makan" dan "makan memakan". (Hanya kata yang stem-nya terbukti di tes lama yang dipakai.)
    let t = tokens_of(
        "memakan makan memakan",
        serde_json::json!({ "stemming_method": "indonesian", "ngram_min": 1, "ngram_max": 2 }),
    );
    assert_eq!(t, vec!["makan", "makan", "makan", "makan makan", "makan makan"]);
}

#[test]
fn ngram_di_luar_rentang_1_sampai_5_ditolak_invalid_config() {
    for (lo, hi) in [(0usize, 1usize), (1, 6), (3, 2), (6, 6)] {
        let c = cfg(serde_json::json!({ "ngram_min": lo, "ngram_max": hi }));
        let e = preprocess_documents(&docs(&["a b c"]), &c).unwrap_err();
        assert_eq!(e.code, "INVALID_CONFIG", "rentang ({}, {})", lo, hi);
    }
}

// ════════════════════════════ Stemmer ═════════════════════════════════════

#[test]
fn stemmer_indonesia_pasangan_yang_terbukti_di_tes_lama() {
    // Pasangan terbukti oleh characterization.rs (dijalankan pengguna di Windows).
    assert_eq!(stemmer::stem(vec!["memakan".to_string()], "indonesian"), vec!["makan"]);
    // Kata dasar tidak berubah (stem kata dasar = dirinya sendiri).
    assert_eq!(stemmer::stem(vec!["makan".to_string()], "indonesian"), vec!["makan"]);
}

#[test]
fn stemmer_indonesia_sifat_umum_pada_kata_berimbuhan() {
    // Hanya properti (keluaran persis tidak dapat diverifikasi di sandbox ini).
    let kata = [
        "perekonomian",
        "pertumbuhan",
        "membanggakan",
        "mengajarkan",
        "dimakan",
        "berlari",
        "pembelajaran",
        "kemanusiaan",
    ];
    let masukan: Vec<String> = kata.iter().map(|k| k.to_string()).collect();
    let hasil = stemmer::stem(masukan.clone(), "indonesian");
    assert_eq!(hasil.len(), kata.len(), "satu masukan -> satu keluaran (tidak ada yang kosong)");
    for (asli, stem) in kata.iter().zip(hasil.iter()) {
        assert!(!stem.is_empty(), "stem '{}' kosong", asli);
        assert!(stem.len() <= asli.len(), "stem '{}' -> '{}' lebih panjang", asli, stem);
        assert_eq!(stem, &stem.to_lowercase(), "stem '{}' harus huruf kecil", asli);
    }
    // Deterministik, termasuk lewat cache memo pada kata berulang dalam satu batch.
    assert_eq!(stemmer::stem(masukan.clone(), "indonesian"), hasil);
    let berulang = stemmer::stem(vec!["dimakan".to_string(), "dimakan".to_string()], "indonesian");
    assert_eq!(berulang[0], berulang[1]);
    // Kata berimbuhan yang jelas tidak ada dalam daftar kata dasar harus berubah.
    for (i, k) in kata.iter().enumerate() {
        if ["dimakan", "berlari", "membanggakan"].contains(k) {
            assert_ne!(hasil[i], *k, "'{}' seharusnya terpangkas", k);
        }
    }
}

#[test]
fn stemmer_inggris_contoh_porter2_klasik() {
    // Contoh langkah 1a/1b algoritma Snowball English (dokumentasi Porter2).
    let pasangan = [
        ("running", "run"),
        ("cats", "cat"),
        ("dogs", "dog"),
        ("jumped", "jump"),
        ("caresses", "caress"),
        ("ponies", "poni"),
        ("ties", "tie"),
        ("cries", "cri"),
        ("caress", "caress"),
    ];
    let masukan: Vec<String> = pasangan.iter().map(|(k, _)| k.to_string()).collect();
    let hasil = stemmer::stem(masukan, "english");
    let harapan: Vec<String> = pasangan.iter().map(|(_, s)| s.to_string()).collect();
    assert_eq!(hasil, harapan);
}

#[test]
fn stemmer_memaksa_lowercase_dan_metode_lain_mengembalikan_token_apa_adanya() {
    assert_eq!(stemmer::stem(vec!["MEMAKAN".to_string()], "indonesian"), stemmer::stem(vec!["memakan".to_string()], "indonesian"));
    assert_eq!(stemmer::stem(vec!["RUNNING".to_string()], "english"), vec!["run"]);
    // Metode tak dikenal / none: token dikembalikan apa adanya (tidak di-lowercase, tidak di-stem).
    assert_eq!(stemmer::stem(vec!["Running".to_string()], "bogus"), vec!["Running"]);
    let none = stemmer::stem_batch(vec![vec!["Running".to_string(), "Cats".to_string()]], StemmingMethod::None, None);
    assert_eq!(none[0], vec!["Running", "Cats"]);
}

#[test]
fn stemmer_inggris_melalui_pipeline_dan_batch_sejajar() {
    let c = cfg(serde_json::json!({ "stemming_method": "english" }));
    let hasil = preprocess_documents(&docs(&["Running cats DOGS", "", "cats cats"]), &c).expect("harus sukses");
    assert_eq!(hasil.len(), 3, "indeks dokumen sejajar");
    assert_eq!(hasil[0], vec!["run", "cat", "dog"]);
    assert!(hasil[1].is_empty());
    assert_eq!(hasil[2], vec!["cat", "cat"]);
}
