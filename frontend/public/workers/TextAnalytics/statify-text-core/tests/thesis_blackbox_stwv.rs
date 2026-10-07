//! Track C1 (Black-box String to Word Vector): sisi KOMPUTASI skenario BB-02, BB-04, BB-05 (inti),
//! BB-06 (inti), BB-07, BB-08, BB-09, BB-10, BB-11, BB-12.
//!
//! Cara pemanggilan sama dengan aplikasi (`StringToWordVector/rust/src/lib.rs`):
//!   `fit_transform(&docs, &config)` lalu `output_from_model(&model, &csr)`.
//! Konfigurasi dibentuk dari payload JSON yang sama dengan yang dikirim antarmuka
//! (`toRustConfig(STWV_DEFAULT_CONFIG)`, dikunci oleh tes Jest
//! `blackbox.stwv.options.test.tsx` -> "Kontrak payload default").
//!
//! Nilai acuan dihitung SECARA INDEPENDEN di Python (tanpa kode Statify):
//!   testing/thesis-eval/blackbox/reference_bb02.py          -> logs/reference_bb02.txt
//!   testing/thesis-eval/blackbox/c1_reference_extra.py      -> logs/reference_bb_c1_extra.txt
//! Angka di bawah disalin dari kedua log tersebut. Kolom/baris acuan BB-09 berasal dari
//! scikit-learn 1.9.1 TfidfVectorizer (smooth_idf=True, norm="l2").
//!
//! Dijalankan: `cargo test --test thesis_blackbox_stwv` (dari folder statify-text-core).

use statify_text_core::{
    fit, fit_transform, output_from_model, FormulaStandard, IdfMethod, Normalization, StemmingMethod,
    StopwordsMethod, TextError, TextVectorizerConfig, TfMethod, VectorizerOutput,
};

/// Payload default yang dikirim antarmuka (sama dengan keluaran `toRustConfig(STWV_DEFAULT_CONFIG)`).
const DEFAULT_PAYLOAD: &str =
    include_str!("../../../../../../testing/thesis-eval/blackbox/data/c1_payload_default.json");

/// Daftar stopword Indonesian bawaan aplikasi (JSON array; identik dengan `INDONESIAN_STOPWORDS`,
/// disamakan oleh tes Jest "berkas acuan Rust c1_stopwords_indonesian.json identik ...").
const STOPWORDS_ID_JSON: &str =
    include_str!("../../../../../../testing/thesis-eval/blackbox/data/c1_stopwords_indonesian.json");

const TOL: f64 = 1e-9;

// ── Helper ───────────────────────────────────────────────────────────────────

/// Korpus acuan D (logs/reference_bb02.txt).
fn korpus_d() -> Vec<String> {
    docs(&["Saya suka makan nasi", "Saya tidak suka nasi!", "Makan, makan, makan"])
}

fn docs(list: &[&str]) -> Vec<String> {
    list.iter().map(|s| s.to_string()).collect()
}

/// dataset_untuk_text/dataset_inggris_testing.csv (10 baris, tanpa header).
fn dataset_inggris() -> Vec<String> {
    docs(&[
        "I am running to the beautiful park!",
        "The parks are very beautiful today.",
        "She ran away from the running dog.",
        "DOGS, cats, and birds are animals.",
        "He is playing a game of chess.",
        "Played games, play games, playing games.",
        "To be or not to be, that is the question.",
        "beautiful beautiful beautiful park.",
        "Stop running! she shouted.",
        "A game of chess is played by two players.",
    ])
}

/// dataset_untuk_text/dataset_indonesia_testing.csv (10 baris, tanpa header; baris ke-8 hanya spasi).
fn dataset_indonesia() -> Vec<String> {
    docs(&[
        "Saya sedang memakan nasi goreng di warung itu.",
        "Makanan ini sangat enak dan murah.",
        "Dimakan oleh kucing peliharaan saya!",
        "Kucing itu berlari-lari mengejar tikus.",
        "MAKAN nasi goreng setiap hari? Tentu saja!",
        "Kucing, tikus, dan anjing adalah hewan.",
        "berlari berlari berlari.",
        "   ",
        "Apakah kamu suka makan nasi uduk?",
        "Nasi goreng dimakan kucing berlari.",
    ])
}

/// Payload default + penimpaan field tertentu (meniru perubahan opsi di antarmuka).
fn cfg(overrides: serde_json::Value) -> TextVectorizerConfig {
    let mut base: serde_json::Value = serde_json::from_str(DEFAULT_PAYLOAD).expect("payload default harus JSON sah");
    if let (Some(b), Some(o)) = (base.as_object_mut(), overrides.as_object()) {
        for (k, v) in o {
            b.insert(k.clone(), v.clone());
        }
    }
    TextVectorizerConfig::from_json_value(base).expect("config uji harus valid")
}

/// Persis alur aplikasi: fit_transform lalu output_from_model.
fn run_app(docs: &[String], c: &TextVectorizerConfig) -> Result<VectorizerOutput, TextError> {
    let (model, csr) = fit_transform(docs, c)?;
    Ok(output_from_model(&model, &csr))
}

fn expect_err(docs: &[String], c: &TextVectorizerConfig) -> TextError {
    match run_app(docs, c) {
        Ok(_) => panic!("seharusnya gagal, tetapi berhasil"),
        Err(e) => e,
    }
}

fn assert_matrix(actual: &[Vec<f64>], expected: &[Vec<f64>], tol: f64) {
    assert_eq!(actual.len(), expected.len(), "jumlah baris berbeda");
    for (r, (a_row, e_row)) in actual.iter().zip(expected.iter()).enumerate() {
        assert_eq!(a_row.len(), e_row.len(), "jumlah kolom baris {} berbeda", r);
        for (c, (a, e)) in a_row.iter().zip(e_row.iter()).enumerate() {
            assert!((a - e).abs() < tol, "sel [{}][{}]: dapat {} seharusnya {}", r, c, a, e);
        }
    }
}

fn is_zero_row(row: &[f64]) -> bool {
    row.iter().all(|&v| v == 0.0)
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-02  Default Weka pada korpus acuan
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb02_payload_default_dari_aplikasi_diterima_inti_sebagai_weka_raw() {
    let c = cfg(serde_json::json!({}));
    assert!(c.lowercase);
    assert_eq!(c.stemming_method, StemmingMethod::None);
    assert_eq!(c.stopwords_method, StopwordsMethod::None);
    assert_eq!(c.formula_standard, FormulaStandard::Weka);
    assert_eq!(c.tf_method, TfMethod::Raw);
    assert_eq!(c.idf_method, IdfMethod::None);
    assert_eq!(c.normalization, Normalization::None);
    assert_eq!((c.ngram_min, c.ngram_max), (1, 1));
    assert_eq!((c.words_to_keep, c.min_term_freq), (1000, 1));
}

#[test]
fn bb02_default_weka_korpus_acuan_menghasilkan_lima_kolom_vec() {
    let out = run_app(&korpus_d(), &cfg(serde_json::json!({}))).expect("default Weka harus berhasil");

    // Lima term, urut alfabetis (aturan kosakata inti): sama dengan logs/reference_bb02.txt
    assert_eq!(out.vocabulary, vec!["makan", "nasi", "saya", "suka", "tidak"]);
    assert_eq!(out.vocabulary.len(), 5);

    // Nama kolom dataset yang akan dibentuk aplikasi: awalan VEC_ + term
    let kolom: Vec<String> = out.vocabulary.iter().map(|t| format!("VEC_{}", t)).collect();
    assert_eq!(kolom, vec!["VEC_makan", "VEC_nasi", "VEC_saya", "VEC_suka", "VEC_tidak"]);

    // Nilai = hitungan kata (raw), tanpa IDF, tanpa normalisasi
    let expected = vec![
        vec![1.0, 1.0, 1.0, 1.0, 0.0],
        vec![0.0, 1.0, 1.0, 1.0, 1.0],
        vec![3.0, 0.0, 0.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, TOL);

    assert_eq!(out.stats.total_documents, 3);
    assert_eq!(out.stats.vocabulary_size, 5);
    assert_eq!(out.stats.empty_documents, 0);
    assert_eq!(out.stats.formula_standard, "weka");
    assert_eq!(out.stats.method, "TF: raw, IDF: none, Norm: none, Keep: 1000, MinFreq: 1");
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-04  n-gram min=1 max=2
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb04_ngram_1_2_kosakata_memuat_unigram_dan_bigram() {
    let out = run_app(&korpus_d(), &cfg(serde_json::json!({ "ngram_min": 1, "ngram_max": 2 }))).unwrap();

    assert_eq!(
        out.vocabulary,
        vec![
            "makan",
            "makan makan",
            "makan nasi",
            "nasi",
            "saya",
            "saya suka",
            "saya tidak",
            "suka",
            "suka makan",
            "suka nasi",
            "tidak",
            "tidak suka",
        ]
    );
    let unigram = out.vocabulary.iter().filter(|t| !t.contains(' ')).count();
    let bigram = out.vocabulary.iter().filter(|t| t.contains(' ')).count();
    assert_eq!(unigram, 5);
    assert_eq!(bigram, 7);

    let expected = vec![
        vec![1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0],
        vec![3.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, TOL);
    assert_eq!(out.stats.vocabulary_size, 12);
}

#[test]
fn bb04_ngram_2_2_hanya_bigram_tanpa_unigram() {
    let out = run_app(&korpus_d(), &cfg(serde_json::json!({ "ngram_min": 2, "ngram_max": 2 }))).unwrap();
    assert_eq!(
        out.vocabulary,
        vec![
            "makan makan",
            "makan nasi",
            "saya suka",
            "saya tidak",
            "suka makan",
            "suka nasi",
            "tidak suka",
        ]
    );
    assert!(out.vocabulary.iter().all(|t| t.contains(' ')));
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-05  n-gram tidak sah (sisi inti; antarmuka diuji di Jest)
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb05_inti_menolak_ngram_min_lebih_besar_dari_max() {
    let e = expect_err(&korpus_d(), &cfg(serde_json::json!({ "ngram_min": 3, "ngram_max": 2 })));
    assert_eq!(e.code, "INVALID_CONFIG");
    assert_eq!(
        e.message,
        "Invalid n-gram range: the minimum size (3) is greater than the maximum size (2)."
    );
}

#[test]
fn bb05_inti_menolak_ngram_max_di_atas_5_dan_menerima_5() {
    let e = expect_err(&korpus_d(), &cfg(serde_json::json!({ "ngram_min": 1, "ngram_max": 6 })));
    assert_eq!(e.code, "INVALID_CONFIG");
    assert_eq!(e.message, "The maximum n-gram size (6) exceeds the limit of 5.");

    assert!(run_app(&korpus_d(), &cfg(serde_json::json!({ "ngram_min": 1, "ngram_max": 5 }))).is_ok());
}

#[test]
fn bb05_inti_menolak_ngram_min_nol() {
    let e = expect_err(&korpus_d(), &cfg(serde_json::json!({ "ngram_min": 0, "ngram_max": 1 })));
    assert_eq!(e.code, "INVALID_CONFIG");
    assert!(e.message.starts_with("The minimum n-gram size cannot be 0."), "pesan: {}", e.message);
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-06  Delimiters regex tidak valid
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb06_regex_tidak_valid_menghasilkan_invalid_regex() {
    for pola in ["[(", "(", "*"] {
        let e = expect_err(&korpus_d(), &cfg(serde_json::json!({ "delimiters": pola })));
        assert_eq!(e.code, "INVALID_REGEX", "pola {:?}", pola);
        assert!(
            e.message.starts_with("The delimiter regex pattern is invalid:"),
            "pola {:?}, pesan: {}",
            pola,
            e.message
        );
    }
}

#[test]
fn bb06_regex_sah_dengan_delimiter_kustom_tetap_berjalan() {
    // Delimiter hanya koma/titik koma: "Saya suka makan nasi" tidak dipecah pada spasi.
    let out = run_app(&docs(&["a b,c;d"]), &cfg(serde_json::json!({ "delimiters": "[,;]+" }))).unwrap();
    assert_eq!(out.vocabulary, vec!["a b", "c", "d"]);
}

#[test]
fn bb06_temuan_c1_01_delimiter_hanya_spasi_jatuh_ke_pola_bawaan_inti() {
    // compile_regex memperlakukan delimiter yang kosong setelah trim sebagai "tidak diisi" dan memakai
    // r"[\s\p{P}]+". Delimiter " " (satu spasi) yang lolos validasi antarmuka (panjang > 0) karena itu
    // ikut memecah pada tanda baca ("a-b" -> "a", "b"), bukan hanya pada spasi. Tes ini mencatat perilaku saat ini.
    let out = run_app(&docs(&["a-b c"]), &cfg(serde_json::json!({ "delimiters": " " }))).unwrap();
    assert_eq!(out.vocabulary, vec!["a", "b", "c"]);

    // Bandingkan: delimiter spasi eksplisit r"[ ]+" memang mempertahankan "a-b".
    let eksplisit = run_app(&docs(&["a-b c"]), &cfg(serde_json::json!({ "delimiters": "[ ]+" }))).unwrap();
    assert_eq!(eksplisit.vocabulary, vec!["a-b", "c"]);
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-07  Stopword Indonesian, lalu Custom
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb07_stopword_indonesian_membuang_kata_pada_daftar_dari_kosakata() {
    let daftar: Vec<String> = serde_json::from_str(STOPWORDS_ID_JSON).expect("daftar bawaan harus array JSON");
    assert_eq!(daftar.len(), 758);
    assert!(daftar.iter().any(|w| w == "saya"));
    assert!(daftar.iter().any(|w| w == "tidak"));
    assert!(!daftar.iter().any(|w| w == "suka"));

    let c = cfg(serde_json::json!({
        "stopwords_method": "indonesian",
        "custom_stopwords": STOPWORDS_ID_JSON,
    }));
    let out = run_app(&korpus_d(), &c).unwrap();

    // "saya" dan "tidak" ada di daftar -> hilang; makan, nasi, suka tersisa
    assert_eq!(out.vocabulary, vec!["makan", "nasi", "suka"]);
    for kata in &out.vocabulary {
        assert!(!daftar.contains(kata), "term {:?} seharusnya sudah dibuang", kata);
    }
    let expected = vec![vec![1.0, 1.0, 1.0], vec![0.0, 1.0, 1.0], vec![3.0, 0.0, 0.0]];
    assert_matrix(&out.matrix, &expected, TOL);
}

#[test]
fn bb07_stopword_custom_menggantikan_daftar_dan_kata_lain_kembali_muncul() {
    // Urutan seperti skenario: Indonesian dahulu (saya hilang) ...
    let id = run_app(
        &korpus_d(),
        &cfg(serde_json::json!({ "stopwords_method": "indonesian", "custom_stopwords": STOPWORDS_ID_JSON })),
    )
    .unwrap();
    assert!(!id.vocabulary.contains(&"saya".to_string()));

    // ... lalu Custom hanya berisi "suka": suka hilang, saya dan tidak muncul kembali.
    let c = cfg(serde_json::json!({ "stopwords_method": "custom", "custom_stopwords": r#"["suka"]"# }));
    let out = run_app(&korpus_d(), &c).unwrap();
    assert_eq!(out.vocabulary, vec!["makan", "nasi", "saya", "tidak"]);
    let expected = vec![
        vec![1.0, 1.0, 1.0, 0.0],
        vec![0.0, 1.0, 1.0, 1.0],
        vec![3.0, 0.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, TOL);
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-08  Stemming Sastrawi dan Porter
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb08_stemming_sastrawi_memakan_menjadi_makan() {
    let d = docs(&["memakan nasi", "Memakan, makan nasi"]);

    // Tanpa stemming: "memakan" dan "makan" adalah dua term berbeda.
    let tanpa = run_app(&d, &cfg(serde_json::json!({}))).unwrap();
    assert!(tanpa.vocabulary.contains(&"memakan".to_string()));

    let c = cfg(serde_json::json!({ "stemming_method": "indonesian" }));
    let out = run_app(&d, &c).unwrap();
    assert!(!out.vocabulary.contains(&"memakan".to_string()), "kosakata: {:?}", out.vocabulary);
    let kol = out.vocabulary.iter().position(|t| t == "makan").expect("kolom makan harus ada");
    // dokumen 1: memakan -> makan (1); dokumen 2: memakan + makan -> makan (2)
    assert_eq!(out.matrix[0][kol], 1.0);
    assert_eq!(out.matrix[1][kol], 2.0);
}

#[test]
fn bb08_stemming_sastrawi_dimakan_menjadi_makan() {
    let d = docs(&["Dimakan kucing", "makan kucing"]);
    let out = run_app(&d, &cfg(serde_json::json!({ "stemming_method": "indonesian" }))).unwrap();
    assert!(!out.vocabulary.contains(&"dimakan".to_string()), "kosakata: {:?}", out.vocabulary);
    let kol = out.vocabulary.iter().position(|t| t == "makan").expect("kolom makan harus ada");
    assert_eq!(out.matrix[0][kol], 1.0);
    assert_eq!(out.matrix[1][kol], 1.0);
}

#[test]
fn bb08_stemming_porter_running_menjadi_run_dan_parks_menjadi_park() {
    let d = docs(&[
        "I am running to the beautiful park!",
        "The parks are very beautiful today.",
        "She ran away from the running dog.",
    ]);
    let tanpa = run_app(&d, &cfg(serde_json::json!({}))).unwrap();
    assert!(tanpa.vocabulary.contains(&"running".to_string()));
    assert!(tanpa.vocabulary.contains(&"parks".to_string()));

    let out = run_app(&d, &cfg(serde_json::json!({ "stemming_method": "english" }))).unwrap();
    assert!(!out.vocabulary.contains(&"running".to_string()), "kosakata: {:?}", out.vocabulary);
    assert!(!out.vocabulary.contains(&"parks".to_string()), "kosakata: {:?}", out.vocabulary);

    let run = out.vocabulary.iter().position(|t| t == "run").expect("kolom run harus ada");
    let park = out.vocabulary.iter().position(|t| t == "park").expect("kolom park harus ada");
    // run: dok1 (running) = 1, dok2 = 0, dok3 (running; "ran" tetap "ran") = 1
    assert_eq!(out.matrix[0][run], 1.0);
    assert_eq!(out.matrix[1][run], 0.0);
    assert_eq!(out.matrix[2][run], 1.0);
    // park: dok1 (park) = 1, dok2 (parks) = 1
    assert_eq!(out.matrix[0][park], 1.0);
    assert_eq!(out.matrix[1][park], 1.0);
    assert_eq!(out.matrix[2][park], 0.0);
}

#[test]
fn bb08_stemming_porter_played_menjadi_play() {
    let out = run_app(&docs(&["played play"]), &cfg(serde_json::json!({ "stemming_method": "english" }))).unwrap();
    assert_eq!(out.vocabulary, vec!["play"]);
    assert_eq!(out.matrix[0][0], 2.0);
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-09  Formula standard scikit-learn
// ═════════════════════════════════════════════════════════════════════════════

fn cfg_sklearn_standard() -> TextVectorizerConfig {
    // Persis nilai yang ditetapkan antarmuka saat radio "scikit-learn" dipilih:
    // TF = Count (raw), IDF = Smooth, Normalization = L2 (Jest: BB-09 memilih scikit-learn ...).
    cfg(serde_json::json!({
        "formula_standard": "sklearn",
        "tf_method": "raw",
        "idf_method": "smooth",
        "normalization": "l2",
    }))
}

#[test]
fn bb09_sklearn_standard_cocok_dengan_tfidfvectorizer_pada_korpus_acuan() {
    let out = run_app(&korpus_d(), &cfg_sklearn_standard()).unwrap();
    assert_eq!(out.vocabulary, vec!["makan", "nasi", "saya", "suka", "tidak"]);

    // Acuan: scikit-learn 1.9.1 TfidfVectorizer(smooth_idf=True, norm="l2") — logs/reference_bb_c1_extra.txt
    let expected = vec![
        vec![0.5, 0.5, 0.5, 0.5, 0.0],
        vec![
            0.0,
            0.45985352875883484,
            0.45985352875883484,
            0.45985352875883484,
            0.604652128305311,
        ],
        vec![1.0, 0.0, 0.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, 1e-9);

    // Setiap baris tidak-nol berpanjang L2 = 1
    for row in &out.matrix {
        let norma: f64 = row.iter().map(|v| v * v).sum::<f64>().sqrt();
        assert!((norma - 1.0).abs() < 1e-9, "norma L2 baris = {}", norma);
    }
    assert_eq!(out.stats.formula_standard, "sklearn");
    assert_eq!(out.stats.method, "TF: raw, IDF: smooth, Norm: l2, Keep: 1000, MinFreq: 1");
}

#[test]
fn bb09_sklearn_standard_idf_smooth_dan_df_sesuai_rumus() {
    let model = fit(&korpus_d(), &cfg_sklearn_standard()).unwrap();
    assert_eq!(model.n_docs, 3);
    assert_eq!(model.doc_freq, vec![2, 2, 2, 2, 1]);
    // idf = ln((1+N)/(1+df)) + 1; acuan scikit-learn idf_
    let expected = [1.2876820724517808_f64, 1.2876820724517808, 1.2876820724517808, 1.2876820724517808, 1.6931471805599454];
    assert_eq!(model.idf.len(), expected.len());
    for (a, e) in model.idf.iter().zip(expected.iter()) {
        assert!((a - e).abs() < 1e-12, "idf dapat {} seharusnya {}", a, e);
    }
}

#[test]
fn bb09_sklearn_kombinasi_di_luar_standar_ditolak_inti() {
    // log1p tidak sah untuk standar sklearn; antarmuka menyembunyikan opsinya, inti juga menolak.
    let c = cfg(serde_json::json!({
        "formula_standard": "sklearn",
        "tf_method": "log1p",
        "idf_method": "smooth",
        "normalization": "l2",
    }));
    let e = expect_err(&korpus_d(), &c);
    assert_eq!(e.code, "INVALID_CONFIG");
    assert_eq!(e.message, "TF method \"log1p\" is not valid for the sklearn standard.");
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-10  Words to Keep = 10, Min term frequency = 2
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb10_words_to_keep_10_min_freq_2_dataset_inggris() {
    let c = cfg(serde_json::json!({ "words_to_keep": 10, "min_term_freq": 2 }));
    let out = run_app(&dataset_inggris(), &c).unwrap();

    // 16 kandidat (total >= 2); 10 teratas menurut hitungan turun, seri alfabetis;
    // urutan kolom alfabetis (logs/reference_bb_c1_extra.txt, BB-10).
    assert_eq!(
        out.vocabulary,
        vec!["a", "are", "be", "beautiful", "chess", "games", "is", "running", "the", "to"]
    );
    assert!(out.vocabulary.len() <= 10);

    // Setiap term terpilih berfrekuensi total >= 2 pada seluruh dokumen
    for j in 0..out.vocabulary.len() {
        let total: f64 = out.matrix.iter().map(|r| r[j]).sum();
        assert!(total >= 2.0, "term {:?} hanya muncul {} kali", out.vocabulary[j], total);
    }

    let expected = vec![
        vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
        vec![0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0],
        vec![0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 2.0],
        vec![0.0, 0.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, TOL);
    assert_eq!(out.stats.method, "TF: raw, IDF: none, Norm: none, Keep: 10, MinFreq: 2");
}

#[test]
fn bb10_min_freq_2_tanpa_batas_words_to_keep_menyisakan_16_term() {
    let c = cfg(serde_json::json!({ "words_to_keep": 1000, "min_term_freq": 2 }));
    let out = run_app(&dataset_inggris(), &c).unwrap();
    assert_eq!(out.vocabulary.len(), 16);
}

#[test]
fn bb10_batas_tepat_sepuluh_kandidat_dataset_indonesia() {
    let c = cfg(serde_json::json!({ "words_to_keep": 10, "min_term_freq": 2 }));
    let out = run_app(&dataset_indonesia(), &c).unwrap();
    assert_eq!(
        out.vocabulary,
        vec!["berlari", "dan", "dimakan", "goreng", "itu", "kucing", "makan", "nasi", "saya", "tikus"]
    );
    let expected = vec![
        vec![0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0],
        vec![0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0],
        vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0],
        vec![0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
        vec![3.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0],
        vec![1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, TOL);
    // Baris ke-8 (hanya spasi) menjadi vektor nol
    assert!(is_zero_row(&out.matrix[7]));
    assert_eq!(out.stats.empty_documents, 1);
}

#[test]
fn bb10_words_to_keep_nol_menyimpan_semua_term() {
    let c = cfg(serde_json::json!({ "words_to_keep": 0, "min_term_freq": 1 }));
    let out = run_app(&dataset_indonesia(), &c).unwrap();
    // 34 term unik pada dataset (logs/reference_bb_c1_extra.txt, BB-10b)
    assert_eq!(out.vocabulary.len(), 34);
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-11  Stopword + min freq membuang semua kata -> EMPTY_VOCABULARY
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn bb11_semua_kata_stopword_menghasilkan_empty_vocabulary() {
    let c = cfg(serde_json::json!({
        "stopwords_method": "custom",
        "custom_stopwords": r#"["saya","suka","makan","nasi","tidak"]"#,
    }));
    let e = expect_err(&korpus_d(), &c);
    assert_eq!(e.code, "EMPTY_VOCABULARY");
    assert_eq!(
        e.message,
        "The vocabulary is empty after text preprocessing. Try using fewer stopwords or changing the stemming setting."
    );
}

#[test]
fn bb11_dokumen_hanya_berisi_stopword_indonesian_menghasilkan_empty_vocabulary() {
    let d = docs(&["saya tidak", "tidak saya"]);
    let c = cfg(serde_json::json!({ "stopwords_method": "indonesian", "custom_stopwords": STOPWORDS_ID_JSON }));
    let e = expect_err(&d, &c);
    assert_eq!(e.code, "EMPTY_VOCABULARY");
}

#[test]
fn bb11_stopword_dan_min_freq_bersama_membuang_semua_kata() {
    // Stopword "makan" dibuang; sisa saya/nasi/suka (total 2) dan tidak (1) semuanya < 3.
    let c = cfg(serde_json::json!({
        "stopwords_method": "custom",
        "custom_stopwords": r#"["makan"]"#,
        "min_term_freq": 3,
    }));
    let e = expect_err(&korpus_d(), &c);
    assert_eq!(e.code, "EMPTY_VOCABULARY");
    assert_eq!(
        e.message,
        "The vocabulary is empty after applying the minimum term frequency. Try lowering the minimum term frequency."
    );
}

#[test]
fn bb11_min_freq_lebih_besar_dari_semua_total_menghasilkan_empty_vocabulary_dan_batasnya_4_masih_lolos() {
    let e = expect_err(&korpus_d(), &cfg(serde_json::json!({ "min_term_freq": 5 })));
    assert_eq!(e.code, "EMPTY_VOCABULARY");

    // makan muncul 1 + 3 = 4 kali: min_term_freq = 4 menyisakan tepat satu term
    let out = run_app(&korpus_d(), &cfg(serde_json::json!({ "min_term_freq": 4 }))).unwrap();
    assert_eq!(out.vocabulary, vec!["makan"]);
    assert_matrix(&out.matrix, &vec![vec![1.0], vec![0.0], vec![3.0]], TOL);
}

// ═════════════════════════════════════════════════════════════════════════════
// BB-12  Sel kosong -> vektor nol, jumlah baris tetap
// ═════════════════════════════════════════════════════════════════════════════

fn dokumen_dengan_sel_kosong() -> Vec<String> {
    // Antarmuka mengubah null/undefined menjadi "" (buildDocuments); sel hanya spasi dikirim apa adanya.
    docs(&["Saya suka makan nasi", "", "Saya tidak suka nasi!", "   ", "Makan, makan, makan"])
}

#[test]
fn bb12_sel_kosong_menjadi_vektor_nol_dan_jumlah_baris_tetap() {
    let out = run_app(&dokumen_dengan_sel_kosong(), &cfg(serde_json::json!({}))).unwrap();
    assert_eq!(out.vocabulary, vec!["makan", "nasi", "saya", "suka", "tidak"]);
    assert_eq!(out.matrix.len(), 5, "jumlah baris harus tetap 5");

    let expected = vec![
        vec![1.0, 1.0, 1.0, 1.0, 0.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0],
        vec![0.0, 1.0, 1.0, 1.0, 1.0],
        vec![0.0, 0.0, 0.0, 0.0, 0.0],
        vec![3.0, 0.0, 0.0, 0.0, 0.0],
    ];
    assert_matrix(&out.matrix, &expected, TOL);
    assert!(is_zero_row(&out.matrix[1]));
    assert!(is_zero_row(&out.matrix[3]));
    assert_eq!(out.stats.total_documents, 5);
    assert_eq!(out.stats.empty_documents, 2);
}

#[test]
fn bb12_sel_kosong_di_awal_dan_akhir_tetap_sejajar() {
    let d = docs(&["", "Saya suka", ""]);
    let out = run_app(&d, &cfg(serde_json::json!({}))).unwrap();
    assert_eq!(out.vocabulary, vec!["saya", "suka"]);
    assert_matrix(&out.matrix, &vec![vec![0.0, 0.0], vec![1.0, 1.0], vec![0.0, 0.0]], TOL);
    assert_eq!(out.stats.empty_documents, 2);
}

#[test]
fn bb12_baris_nol_tetap_nol_dan_terbatas_pada_normalisasi_l2_sklearn() {
    let c = cfg(serde_json::json!({
        "formula_standard": "sklearn",
        "tf_method": "raw",
        "idf_method": "smooth",
        "normalization": "l2",
    }));
    let out = run_app(&dokumen_dengan_sel_kosong(), &c).unwrap();
    assert_eq!(out.matrix.len(), 5);
    assert!(is_zero_row(&out.matrix[1]));
    assert!(is_zero_row(&out.matrix[3]));
    for row in &out.matrix {
        for v in row {
            assert!(v.is_finite(), "ada nilai tak terbatas: {}", v);
        }
    }
}

#[test]
fn bb12_seluruh_sel_kosong_ditolak_inti_dengan_empty_input() {
    let e = expect_err(&docs(&["", "   ", ""]), &cfg(serde_json::json!({})));
    assert_eq!(e.code, "EMPTY_INPUT");
}
