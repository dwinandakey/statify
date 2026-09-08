use wasm_bindgen::prelude::*;
use serde::Deserialize;

// ─────────────────────────────────────────────────────────────────────────────
// Deklarasi modul
// ─────────────────────────────────────────────────────────────────────────────
mod error;
mod validator;
mod tokenizer;
mod stopwords;
mod stemmer;
mod ngram;
mod vectorizer;

use error::AppError;

// ─────────────────────────────────────────────────────────────────────────────
// Config struct — harus cocok dengan objek JSON yang dikirim Web Worker
// ─────────────────────────────────────────────────────────────────────────────
#[derive(Deserialize)]
pub struct VectorizerConfig {
    pub lowercase: bool,
    /// "none" | "indonesian" | "english"
    pub stemming_method: String,
    /// "none" | "indonesian" | "english" | "custom"
    pub stopwords_method: String,
    /// JSON string berisi array stopwords: "[\"ada\",\"adalah\",...]"
    pub custom_stopwords: Option<String>,
    /// Pola Regex untuk delimiter tokenizer, contoh: r"[\s\p{P}]+"
    pub delimiters: String,
    pub ngram_min: usize,
    pub ngram_max: usize,
    /// "binary" | "raw" | "normalized" | "log"
    pub tf_method: String,
    /// "none" | "idf" | "smooth"
    pub idf_method: String,
    pub words_to_keep: usize,
}

// ─────────────────────────────────────────────────────────────────────────────
// Init panic hook (dipanggil sekali di awal setiap invokasi)
// ─────────────────────────────────────────────────────────────────────────────
#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ─────────────────────────────────────────────────────────────────────────────
// Fungsi utama yang dipanggil oleh Web Worker
// ─────────────────────────────────────────────────────────────────────────────
/// Menerima:
/// - `js_data`   : Array<string> (kolom teks dari dataset)
/// - `js_config` : VectorizerConfig object
///
/// Mengembalikan JSON: { vocabulary, matrix, stats } atau { code, message } jika error.
#[wasm_bindgen]
pub fn process_text_data(js_data: JsValue, js_config: JsValue) -> Result<JsValue, JsValue> {
    init_panic_hook();

    // ── Parse config dari JavaScript ─────────────────────────────────────────
    let config: VectorizerConfig = serde_wasm_bindgen::from_value(js_config)
        .map_err(|e| AppError::new("INVALID_CONFIG", &format!("Gagal parse konfigurasi: {}", e)).to_js())?;

    // ── Parse array dokumen dari JavaScript ──────────────────────────────────
    let raw_docs: Vec<String> = serde_wasm_bindgen::from_value(js_data)
        .map_err(|e| AppError::new("INVALID_DATA", &format!("Gagal parse data teks: {}", e)).to_js())?;

    // ── Validasi awal ─────────────────────────────────────────────────────────
    validator::validate(&raw_docs, config.ngram_min, config.ngram_max)
        .map_err(|e| e.to_js())?;


    // ── Compile regex SEKALI di luar loop (optimasi kritis) ───────────────────
    let re = tokenizer::compile_regex(&config.delimiters)
        .map_err(|e| e.to_js())?;

    // ── Pipeline NLP per dokumen ──────────────────────────────────────────────
    // Urutan: Tokenize → Filter Stopwords → Stem → N-Gram
    let processed: Vec<Vec<String>> = raw_docs
        .iter()
        .map(|doc| {
            // [1] Lowercase + Tokenize (Regex split)
            let tokens = tokenizer::tokenize(doc, config.lowercase, &re);

            // [2] Filter Stopwords (case-insensitive, dari JSON frontend)
            let tokens = stopwords::filter(tokens, &config.stopwords_method, &config.custom_stopwords)
                .unwrap_or_else(|_| vec![]); // fallback: lewati filter jika error parse

            // [3] Stemming (lowercase internal, tidak ubah output asli)
            let tokens = stemmer::stem(tokens, &config.stemming_method);

            // [4] N-Gram (setelah stemming agar bigram terbentuk dari kata dasar)
            let tokens = ngram::generate(tokens, config.ngram_min, config.ngram_max);

            tokens
        })
        .collect();

    // ── Vectorize (bangun vocabulary + matriks angka) ─────────────────────────
    let output = vectorizer::vectorize(processed, &config.tf_method, &config.idf_method, config.words_to_keep)
        .map_err(|e| e.to_js())?;

    // ── Serialize output ke JsValue ───────────────────────────────────────────
    serde_wasm_bindgen::to_value(&output)
        .map_err(|e| AppError::new("SERIALIZE_ERROR", &format!("Gagal serialize output: {}", e)).to_js())
}
