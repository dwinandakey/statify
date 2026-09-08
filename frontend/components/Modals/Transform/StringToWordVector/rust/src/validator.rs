use crate::error::AppError;

/// Validasi input sebelum memasuki pipeline NLP.
/// Menangkap error sedini mungkin agar tidak ada crash di tengah proses.
///
/// Parameter:
/// - `docs`      : slice dokumen teks mentah
/// - `ngram_min` : batas bawah N-Gram (harus >= 1)
/// - `ngram_max` : batas atas N-Gram (harus >= ngram_min)
pub fn validate(docs: &[String], ngram_min: usize, ngram_max: usize) -> Result<(), AppError> {
    if docs.is_empty() {
        return Err(AppError::new(
            "EMPTY_INPUT",
            "Array dokumen kosong. Pastikan variabel yang dipilih memiliki data.",
        ));
    }
    if docs.iter().all(|d| d.trim().is_empty()) {
        return Err(AppError::new("EMPTY_INPUT", "Semua dokumen berisi string kosong."));
    }
    if ngram_min == 0 {
        return Err(AppError::new(
            "INVALID_CONFIG",
            "ngram_min tidak boleh 0. Nilai minimum yang valid adalah 1.",
        ));
    }
    if ngram_min > ngram_max {
        return Err(AppError::new(
            "INVALID_CONFIG",
            &format!(
                "Konfigurasi N-Gram tidak valid: ngram_min ({}) > ngram_max ({}).",
                ngram_min, ngram_max
            ),
        ));
    }
    Ok(())
}
