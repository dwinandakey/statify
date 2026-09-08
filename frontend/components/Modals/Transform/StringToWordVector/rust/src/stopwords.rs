use crate::error::AppError;
use hashbrown::HashSet;

/// Stopwords filter: buang token yang ada di dalam HashSet stopwords.
///
/// Daftar stopwords dikirim dari frontend sebagai JSON string (array of strings).
/// Pengecekan bersifat case-insensitive tanpa mengubah token asli.
pub fn filter(
    tokens: Vec<String>,
    stopwords_method: &str,
    custom_stopwords_json: &Option<String>,
) -> Result<Vec<String>, AppError> {
    // Jika method "none", langsung return tanpa filter
    if stopwords_method == "none" {
        return Ok(tokens);
    }

    // Parse JSON array stopwords dari frontend
    let stopwords_set: HashSet<String> = match custom_stopwords_json {
        Some(json_str) if !json_str.is_empty() => {
            let list: Vec<String> = serde_json::from_str(json_str).map_err(|e| {
                AppError::new(
                    "INVALID_STOPWORDS",
                    &format!("Gagal mem-parse JSON stopwords: {}. Pastikan format adalah array string JSON.", e),
                )
            })?;
            // Simpan dalam lowercase agar pengecekan case-insensitive
            list.into_iter().map(|s| s.to_lowercase()).collect()
        }
        // custom_stopwords null/kosong tapi method bukan "none" → lanjut tanpa filter
        _ => return Ok(tokens),
    };

    let filtered = tokens
        .into_iter()
        .filter(|t| !stopwords_set.contains(&t.to_lowercase()))
        .collect();

    Ok(filtered)
}
