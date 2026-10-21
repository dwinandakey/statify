# statify-text-core

Core library Rust bersama untuk Modul Text Analytics Statify. Crate ini berisi seluruh logika text preprocessing (lowercase, tokenisasi, stopword, stemming Sastrawi dan Snowball/Porter2, n-gram), term weighting (TF, IDF, normalization), pembentukan dan penerapan preprocessing recipe (`TextVectorizerModel`), matriks jarang format Compressed Sparse Row (`CsrMatrix`), serta likelihood Naive Bayes untuk fitur teks (Multinomial, Bernoulli, Complement).

Crate ini adalah library Rust murni (`crate-type = ["rlib"]`): tidak memakai `wasm-bindgen`, tidak punya UI, dan tidak dibangun sendiri menjadi WebAssembly. Ia dikompilasi ke dalam modul WebAssembly milik tiga menu yang memakainya.

Di buku skripsi, crate ini adalah feature set "Inti pemrosesan teks" (F01 sampai F13; kebutuhan TA-F04 sampai TA-F10, TA-F17, TA-F26).

## Posisi dalam modul

Modul Text Analytics berjalan sepenuhnya di browser dengan Client-Side Rendering (CSR): data teks tidak dikirim ke server. (Di dokumen ini, `CsrMatrix` dan "matriks CSR" merujuk ke format Compressed Sparse Row, bukan Client-Side Rendering.) Alurnya String to Word Vector → Naive Bayes → Apply Model, dan ketiganya memakai crate ini sebagai satu sumber kebenaran sehingga teks diproses identik saat transformasi, pelatihan, dan penerapan model.

```
UI React (menu) → hooks → service TS → Web Worker → WASM (crate menu) → statify-text-core
                                                                        ↓
                                     Output Viewer / dataset aktif / IndexedDB (di sisi TS)
```

| Crate yang bergantung | Cargo.toml | Yang dipakai dari core |
|---|---|---|
| `statify-string-to-word` (String to Word Vector) | `frontend/components/Modals/Transform/StringToWordVector/rust/Cargo.toml` | `fit_transform` + `output_from_model` (keluaran dense ke UI); resep tidak disimpan |
| `wasm` (Naive Bayes) | `frontend/components/Modals/Analyze/Classify/naive-bayes/rust/Cargo.toml` | `TextVectorizerConfig::from_json_value`, `fit`/`transform`/`fit_transform` per holdout/fold dan model final, `nb_text::{train, score_rows, top_k}`, serialisasi `TextVectorizerModel` ke `text.recipe` (schema 2.0) |
| `wasm` (Apply Model) | `frontend/components/Modals/Analyze/Classify/apply-model/rust/Cargo.toml` | deserialisasi `text.recipe` → `transform`, `nb_text::score_rows` |

Ketiganya memakai path dependency (bukan salinan kode). Konfigurasi dari UI dibentuk oleh `StringToWordVector/config.ts::toRustConfig`, yang juga dipakai Naive Bayes untuk path Raw Text.

## Struktur direktori

| Path | Tanggung jawab |
|---|---|
| `Cargo.toml` | Dependensi: `serde`, `serde_json` (fitur `float_roundtrip`), `rust-stemmers 1.2`, `sastrawi-rs =0.5.3`, `hashbrown 0.14`, `regex 1.10` |
| `src/lib.rs` | Ekspor publik; `run_pipeline`, `preprocess_documents` (API kompatibilitas) |
| `src/config.rs` | `TextVectorizerConfig` dan enum `StopwordsMethod`, `StemmingMethod`, `FormulaStandard`, `TfMethod`, `IdfMethod`, `Normalization` (JSON snake_case, alias nilai lama) |
| `src/error.rs` | `TextError { code, message }` |
| `src/validator.rs` | Validasi dokumen, rentang konfigurasi, dan kombinasi rumus per `formula_standard` |
| `src/tokenizer.rs` | Lowercase opsional dan split regex pemisah |
| `src/stopwords.rs` | Set stopword dari JSON (case-insensitive) |
| `src/stemmer.rs` | Sastrawi (Nazief-Adriani) dan Snowball/Porter2 (`rust_stemmers::Algorithm::English`), dengan cache per batch |
| `src/ngram.rs` | N-gram 1–5, dibentuk setelah stemming |
| `src/pipeline.rs` | `Pipeline` yang dibangun sekali (regex, set stopword, kamus Sastrawi) lalu dipakai untuk semua dokumen |
| `src/vectorizer.rs` | Pemilihan vocabulary (Min term frequency, Words to Keep), TF × IDF, normalization, penyusunan CSR, keluaran dense |
| `src/model.rs` | `TextVectorizerModel` (recipe), `CsrMatrix`, `fit`, `transform`, `fit_transform` |
| `src/nb_text.rs` | Likelihood teks Naive Bayes: `train`, `score_rows`, `top_k` |
| `tests/` | 10 berkas tes integrasi (lihat bagian Pengujian) |
| `tests/eval_data/` | Nilai acuan independen (Python) dan salinan daftar stopword UI |
| `target/` | Hasil build lokal (tidak di-commit) |

## Alur pemrosesan

1. **Validasi** (`validator.rs`): array dokumen kosong atau semua dokumen kosong ditolak (`EMPTY_INPUT`); `ngram_min ≥ 1`, `ngram_min ≤ ngram_max ≤ 5`, `min_term_freq ≥ 1`, dan kombinasi TF/IDF/normalization harus sah untuk `formula_standard` (`INVALID_CONFIG`).
2. **Pipeline** per dokumen, urutannya tetap: lowercase (opsional) → tokenisasi regex → buang stopword (tanpa membedakan huruf besar/kecil) → stemming (token selalu di-lowercase sebelum di-stem) → n-gram. Satu dokumen masukan selalu menghasilkan satu baris keluaran.
3. **Fit** (`vectorizer.rs::fit_tokens`): satu lintasan menghitung total kemunculan dan document frequency; buang term dengan total < Min term frequency; bila Words to Keep > 0 dan term lebih banyak, rangking (mode `weka`/`sklearn`: total kemunculan; mode `custom`: Σ TF × IDF; seri → alfabetis) lalu potong; urutkan vocabulary alfabetis byte-wise sebagai urutan kolom; hitung IDF dan `avg_doc_norm` (hanya `doc_length`).
4. **Transform** (`model.rs::transform`): memakai vocabulary, IDF, `avg_doc_norm`, dan `resolved_stopwords` dari recipe tanpa menghitung ulang statistik apa pun; term di luar vocabulary diabaikan.
5. **Nilai sel**: TF → × IDF → normalization, disimpan sebagai CSR.

Rumus:

| Pilihan | Nilai mesin | Rumus |
|---|---|---|
| TF | `binary`, `raw`, `log1p`, `sublinear`, `normalized` | 1 bila f > 0; f; ln(1 + f); 1 + ln f; f / jumlah token dokumen |
| IDF | `none`, `standard`, `smooth`, `plus1` | 1; ln(N/df); ln((1+N)/(1+df)) + 1; ln(N/df) + 1 |
| Normalization | `none`, `l1`, `l2`, `doc_length` | —; v/Σ\|v\|; v/‖v‖₂; v · avg‖v‖₂ / ‖v‖₂ |

`formula_standard` adalah field internal: UI membiarkan pengguna mengombinasikan TF, IDF, dan normalization secara bebas, lalu `StringToWordVector/constants/vectorization-options.ts::engineFormulaMode` memilih `weka`, `sklearn`, atau `custom` dari kombinasi itu. Default UI: Raw count, IDF None, normalization None, Words to Keep 1000, Min term frequency 1.

Daftar stopword bahasa Indonesia dan Inggris tidak tertanam di Rust: UI mengirimnya sebagai JSON array di `custom_stopwords` (`StringToWordVector/constants/stopwords.ts`). Bila `stopwords_method` bukan `none` tetapi `custom_stopwords` kosong atau `null`, tidak ada stopword yang dibuang.

## API publik

```rust
pub fn prepare(cfg: &TextVectorizerConfig) -> Result<Pipeline, TextError>;
pub fn fit(docs: &[String], cfg: &TextVectorizerConfig) -> Result<TextVectorizerModel, TextError>;
pub fn transform(model: &TextVectorizerModel, docs: &[String]) -> Result<CsrMatrix, TextError>;
pub fn fit_transform(docs: &[String], cfg: &TextVectorizerConfig)
    -> Result<(TextVectorizerModel, CsrMatrix), TextError>;
pub fn output_from_model(model: &TextVectorizerModel, csr: &CsrMatrix) -> VectorizerOutput;

pub struct TextVectorizerModel {      // Serialize + Deserialize; disebut "recipe"
    pub recipe_version: String,       // RECIPE_VERSION = "1.0"
    pub config: TextVectorizerConfig,
    pub resolved_stopwords: Vec<String>, // lowercase, unik, urut alfabetis
    pub vocabulary: Vec<String>,         // urutan kolom
    pub idf: Vec<f64>,                   // sejajar vocabulary (1.0 bila IDF none)
    pub doc_freq: Vec<u32>,
    pub n_docs: u32,
    pub avg_doc_norm: Option<f64>,       // hanya untuk doc_length
}

// nb_text
pub fn train(x: &CsrMatrix, y: &[usize], n_classes: usize, classes: &[String],
             likelihood: TextLikelihood, alpha: f64) -> TextNbParams;
pub fn score_rows(params: &TextNbParams, x: &CsrMatrix) -> Vec<Vec<f64>>; // tanpa ln prior
pub fn top_k(params: &TextNbParams, terms: &[String], k: usize) -> Vec<Vec<(usize, f64)>>;
```

Kode error `TextError`: `EMPTY_INPUT`, `INVALID_CONFIG`, `INVALID_REGEX`, `INVALID_STOPWORDS`, `EMPTY_VOCABULARY`, `INVALID_DATA`, `SERIALIZE_ERROR`. Pesan error berbahasa Inggris (mengikuti UI). Crate menu membungkusnya: STWV melempar objek JS `{ code, message }`; Naive Bayes dan Apply Model memetakan ke kode milik masing-masing (`NB_E_*`, `AM_E_*`).

## Build dan pengujian

Crate ini tidak dibangun menjadi WASM secara langsung. Setelah mengubah kode di sini, bangun ulang WASM ketiga menu (lihat README tiap menu): String to Word Vector → `StringToWordVector/wasm-output/`, Naive Bayes → `public/workers/Classify/NaiveBayes/pkg/`, Apply Model → `public/workers/Classify/ApplyModel/pkg/`.

Catatan lingkungan: laptop pengembang memakai Smart App Control sehingga build Rust/WASM di Windows dapat diblokir. Build WASM dilakukan lewat WSL Ubuntu (`wsl -d Ubuntu -e bash <skrip>` dengan `source $HOME/.cargo/env` dan `CARGO_TARGET_DIR` di `$HOME`). `cargo test` untuk core, Naive Bayes, dan Apply Model dapat berjalan di Windows.

Menjalankan tes core (PowerShell, dari akar repo):

```powershell
cd frontend\public\workers\TextAnalytics\statify-text-core
$env:CARGO_PROFILE_TEST_DEBUG = '0'   # hanya bila Application Control memblokir biner tes
cargo test
```

Subset yang dipakai skrip evaluasi:

```powershell
# baseline (78 tes lama), dari text_analytics_eval/run_all.ps1
cargo test --lib --test characterization --test nb_text --test s2_pipeline --test s3_formulas --test s4_fit_transform
# tes evaluasi Track A, dari text_analytics_eval/run_A.ps1
cargo test --test eval_formulas -- --test-threads=1
cargo test --test eval_vocab_limit -- --test-threads=1
cargo test --test eval_text_pipeline -- --test-threads=1
```

Uji ulang penuh seluruh modul: `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/run_all.ps1` (performa saja: `-SkipBaseline -Only E`).

## Pengujian

Tabel ini sama persis di README keempat folder Modul Text Analytics. Sumber tunggal: `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md` (uji ulang 22 Oktober 2026). Bila ada angka yang berbeda, laporan itu yang berlaku. Tidak ada tes yang gagal atau dilewati.

| Besaran | Hasil final |
|---|---|
| Tes Rust | 564 lulus: core library 155, Naive Bayes 242, Apply Model 167 |
| Tes Jest | 1.250 lulus dalam 80 suite: String to Word Vector 171, Naive Bayes 388, Apply Model 691 |
| Cakupan baris Jest | String to Word Vector 72,18%, Naive Bayes 94,43%, Apply Model 97,80% (cakupan Rust tidak diukur) |
| White-box | 54 jalur, semuanya lulus |
| Black-box | 56 skenario buku; tes otomatis Jest 194/194 dan Rust 67/67 lulus |
| Integrasi | IT-01 sampai IT-05 lulus |
| Waktu eksekusi (rata-rata, Chrome 155 headless, 900 sampai 17.974 dokumen) | String to Word Vector default 71,1 sampai 1.503,9 ms; Naive Bayes holdout 70% 96,6 sampai 597,3 ms; Naive Bayes 10-fold 146,7 sampai 1.900,2 ms; Apply Model 73,7 sampai 428,0 ms |
| Long task | Tidak ada pada data ≤ 17.974 dokumen; pada 36.305 dokumen hanya String to Word Vector, maksimum 72 ms |
| Toolchain | rustc 1.99.1, wasm-pack 0.15.0, Node 24.20.0, Chrome 155 |

Rincian core library: 155 tes, semuanya lulus (78 tes lama + 77 tes evaluasi). Cakupan baris Rust tidak diukur karena cargo-llvm-cov tidak terpasang. Sebaran per berkas:

| Berkas | Tes | Isi |
|---|---|---|
| `characterization.rs` | 10 | Mengunci perilaku v1 saat logika dipindah dari crate STWV |
| `s2_pipeline.rs` | 16 | Pipeline sekali-inisialisasi, `TextError`, enum config dan alias lama |
| `s3_formulas.rs` | 17 | Mode rumus, normalization, Min term frequency, Words to Keep, dokumen kosong tanpa NaN |
| `s4_fit_transform.rs` | 22 | `fit`/`transform`/`fit_transform`, recipe, CSR, round-trip JSON |
| `nb_text.rs` | 13 | Likelihood Multinomial/Bernoulli/Complement dan Top-k (golden `naive-bayes/docs/AGENTS_V2.md` §6.7) |
| `eval_formulas.rs` | 15 | Grid TF × IDF × normalization terhadap acuan Python (toleransi 10⁻⁶) |
| `eval_vocab_limit.rs` | 9 | Words to Keep dan Min term frequency pada nilai seri |
| `eval_text_pipeline.rs` | 20 | Stopword Indonesia/Inggris/kustom, Sastrawi, Snowball/Porter2, n-gram 1–5 |
| `eval_blackbox_stwv.rs` | 31 | Sisi komputasi skenario black-box String to Word Vector |
| `eval_integration.rs` | 2 | Peran `float_roundtrip` pada simpan-muat model (IT-05) |

Nilai acuan `tests/eval_data/*.json` dibuat oleh skrip di `naive-bayes/text_analytics_eval/unit/reference_values.py` dan `naive-bayes/text_analytics_eval/blackbox/`. `stopwords_id.json` dan `stopwords_en.json` adalah salinan `StringToWordVector/constants/stopwords.ts`; kesamaannya dijaga tes Jest `StringToWordVector/__tests__/eval/stopwords.eval.test.ts`.

## Rujukan

- `frontend/components/Modals/Transform/StringToWordVector/docs/PLAN_FIX.md` §3 (historis): kontrak config (§3.1), fit/vocabulary (§3.2), API dan recipe (§3.4), keluaran (§3.5), korpus acuan (§3.6).
- `frontend/components/Modals/Analyze/Classify/naive-bayes/docs/AGENTS_V2.md`: V7 (anti-leakage), V13 dan P-V2/P-V3 (satu mesin teks, kesamaan skor NB ↔ AM), §6 (rumus likelihood), §8 (schema 2.0, `text.recipe`).
- `frontend/components/Modals/Transform/StringToWordVector/docs/plan-reports/`: catatan fase S1–S9 dan `CATATAN_TAHAP2_float_roundtrip.md` (sudah diterapkan).
- `AGENTS.md` di folder ini: panduan singkat untuk agen AI yang mengubah crate ini.
