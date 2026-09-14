use crate::error::AppError;
use serde::Serialize;
use std::collections::{BTreeSet, HashMap, HashSet};

/// Struct output final yang dikirim ke JavaScript.
#[derive(Serialize)]
pub struct VectorizerOutput {
    pub vocabulary: Vec<String>,
    pub matrix: Vec<Vec<f64>>,
    pub stats: OutputStats,
}

#[derive(Serialize)]
pub struct OutputStats {
    pub total_documents: usize,
    pub vocabulary_size: usize,
    pub method: String,
}

/// Vectorizer: mengubah koleksi token per dokumen menjadi matriks angka.
///
/// Formula yang digunakan (kompatibel sklearn):
/// - Boolean   : 1.0 jika term ada, 0.0 jika tidak
/// - Natural TF: count(t, d) — frekuensi mentah
/// - tf        : count(t, d) / total_terms(d) — frekuensi relatif
/// - tfidf     : TF(t,d) × IDF(t), dengan IDF = log((1+N)/(1+df)) + 1 (sklearn smooth)
///               Dilanjutkan dengan L2 normalization per baris agar kompatibel sklearn.
pub fn vectorize(
    processed: Vec<Vec<String>>,
    tf_method: &str,
    idf_method: &str,
    words_to_keep: usize,
) -> Result<VectorizerOutput, AppError> {
    // 1. Bangun vocabulary (BTreeSet → sudah sorted A-Z, hasil deterministik)
    let mut vocab_set: BTreeSet<String> = BTreeSet::new();
    for doc_tokens in &processed {
        for token in doc_tokens {
            vocab_set.insert(token.clone());
        }
    }
    let mut vocabulary: Vec<String> = vocab_set.into_iter().collect();

    if vocabulary.is_empty() {
        return Err(AppError::new(
            "EMPTY_VOCABULARY",
            "Vocabulary kosong setelah preprocessing. Coba kurangi stopwords atau ubah konfigurasi stemming.",
        ));
    }

    let n = processed.len();
    let v_initial = vocabulary.len();

    // 2. Jika words_to_keep > 0 dan lebih kecil dari vocabulary awal, lakukan penyaringan
    if words_to_keep > 0 && words_to_keep < v_initial {
        // A. Hitung Document Frequency (df) awal untuk menghitung IDF awal
        let mut initial_df = vec![0.0_f64; v_initial];
        let doc_sets: Vec<HashSet<&str>> = processed
            .iter()
            .map(|doc_tokens| doc_tokens.iter().map(|s| s.as_str()).collect())
            .collect();

        for (i, term) in vocabulary.iter().enumerate() {
            let mut count = 0.0;
            for doc_set in &doc_sets {
                if doc_set.contains(term.as_str()) {
                    count += 1.0;
                }
            }
            initial_df[i] = count;
        }

        // B. Hitung IDF awal
        let mut initial_idf = vec![1.0_f64; v_initial];
        if idf_method != "none" {
            for (i, &d) in initial_df.iter().enumerate() {
                initial_idf[i] = match idf_method {
                    "idf" => (n as f64 / d).ln(),
                    "smooth" => ((1.0 + n as f64) / (1.0 + d)).ln() + 1.0,
                    _ => 1.0,
                };
            }
        }

        // C. Hitung total TF untuk setiap kata di semua dokumen
        let mut tf_sum = vec![0.0_f64; v_initial];
        for doc_tokens in &processed {
            let total = doc_tokens.len() as f64;
            let mut counts: HashMap<&str, f64> = HashMap::new();
            for token in doc_tokens {
                *counts.entry(token.as_str()).or_insert(0.0) += 1.0;
            }
            for (i, term) in vocabulary.iter().enumerate() {
                let count = *counts.get(term.as_str()).unwrap_or(&0.0);
                let tf = match tf_method {
                    "none" | "binary" => if count > 0.0 { 1.0 } else { 0.0 },
                    "raw" => count,
                    "normalized" => if total > 0.0 { count / total } else { 0.0 },
                    "log" => if count > 0.0 { 1.0 + count.ln() } else { 0.0 },
                    _ => count,
                };
                tf_sum[i] += tf;
            }
        }

        // D. Hitung skor kepentingan (TF * IDF) untuk masing-masing kata
        let mut term_scores: Vec<(usize, f64)> = (0..v_initial)
            .map(|i| {
                let score = tf_sum[i] * initial_idf[i];
                (i, score)
            })
            .collect();

        // E. Urutkan: skor tertinggi ke terendah, jika seri urutkan secara alfabetis
        term_scores.sort_by(|a, b| {
            b.1.partial_cmp(&a.1)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| vocabulary[a.0].cmp(&vocabulary[b.0]))
        });

        // F. Ambil kata sebanyak words_to_keep
        term_scores.truncate(words_to_keep);

        // G. Urutkan kembali berdasarkan abjad aslinya untuk menjaga kerapian kolom
        let mut selected_indices: Vec<usize> = term_scores.iter().map(|&(i, _)| i).collect();
        selected_indices.sort_by(|&a, &b| vocabulary[a].cmp(&vocabulary[b]));

        let mut new_vocabulary = Vec::with_capacity(selected_indices.len());
        for idx in selected_indices {
            new_vocabulary.push(vocabulary[idx].clone());
        }
        vocabulary = new_vocabulary;
    }

    let v = vocabulary.len();

    // Index vocabulary untuk lookup O(1)
    let vocab_index: HashMap<&str, usize> = vocabulary
        .iter()
        .enumerate()
        .map(|(i, t)| (t.as_str(), i))
        .collect();

    // 3. Hitung Document Frequency (df[i] = jumlah dokumen yang mengandung term i)
    let mut df = vec![0.0_f64; v];
    for doc_tokens in &processed {
        let doc_set: HashSet<&str> = doc_tokens.iter().map(|s| s.as_str()).collect();
        for (i, term) in vocabulary.iter().enumerate() {
            if doc_set.contains(term.as_str()) {
                df[i] += 1.0;
            }
        }
    }

    // 4. Hitung IDF berdasarkan idf_method
    let mut idf = vec![1.0_f64; v];
    if idf_method != "none" {
        for (i, &d) in df.iter().enumerate() {
            idf[i] = match idf_method {
                "idf" => (n as f64 / d).ln(),
                "smooth" => ((1.0 + n as f64) / (1.0 + d)).ln() + 1.0,
                _ => 1.0,
            };
        }
    }

    // 5. Bangun matriks (baris = dokumen, kolom = term di vocabulary)
    let mut matrix: Vec<Vec<f64>> = Vec::with_capacity(n);

    for doc_tokens in &processed {
        let mut row = vec![0.0_f64; v];
        let total = doc_tokens.len() as f64;

        // Hitung term count per dokumen dalam satu pass
        let mut counts: HashMap<&str, f64> = HashMap::new();
        for token in doc_tokens {
            *counts.entry(token.as_str()).or_insert(0.0) += 1.0;
        }

        for (term, &idx) in &vocab_index {
            let count = *counts.get(term).unwrap_or(&0.0);
            
            let tf = match tf_method {
                "none" | "binary" => if count > 0.0 { 1.0 } else { 0.0 },
                "raw" => count,
                "normalized" => if total > 0.0 { count / total } else { 0.0 },
                "log" => if count > 0.0 { 1.0 + count.ln() } else { 0.0 },
                _ => count, // default raw
            };

            row[idx] = tf * idf[idx];
        }

        matrix.push(row);
    }

    Ok(VectorizerOutput {
        stats: OutputStats {
            total_documents: n,
            vocabulary_size: v,
            method: format!("TF: {}, IDF: {}, Limit: {}", tf_method, idf_method, words_to_keep),
        },
        vocabulary,
        matrix,
    })
}
