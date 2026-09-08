use rust_stemmers::{Algorithm, Stemmer as EnStemmer};

/// Stemmer: memangkas token ke bentuk dasarnya.
///
/// Catatan penting:
/// - Sastrawi (Nazief-Adriani) dan Porter SENSITIF huruf kapital.
///   Oleh karena itu, setiap token dipaksa `.to_lowercase()` secara internal
///   sebelum dikirim ke stemmer, TERLEPAS dari setting `lowercase` pengguna.
/// - Dictionary sastrawi HARUS diinisialisasi di luar fungsi ini (mahal).
///   Fungsi ini menerima referensi ke stemmer yang sudah siap.
/// - Token hasil stemming yang kosong difilter dari output.
pub fn stem(tokens: Vec<String>, stemming_method: &str) -> Vec<String> {
    match stemming_method {
        "indonesian" => {
            // Inisialisasi Dictionary & Stemmer sastrawi
            // Dictionary::new() memuat FST — pastikan dipanggil di lib.rs di luar loop
            let dict = sastrawi::Dictionary::new();
            let stemmer = sastrawi::Stemmer::new(&dict);
            tokens
                .into_iter()
                .map(|t| stemmer.stem_word(&t.to_lowercase()).to_string())
                .filter(|t: &String| !t.is_empty())
                .collect()
        }
        "english" => {
            let stemmer = EnStemmer::create(Algorithm::English);
            tokens
                .into_iter()
                .map(|t| stemmer.stem(&t.to_lowercase()).to_string())
                .filter(|t| !t.is_empty())
                .collect()
        }
        // "none" atau method tidak dikenal → kembalikan token apa adanya
        _ => tokens,
    }
}
