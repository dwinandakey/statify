# AGENTS.md: statify-text-core

Core library Rust murni (`rlib`, tanpa `wasm-bindgen`) untuk text preprocessing, term weighting, recipe (`TextVectorizerModel`), matriks Compressed Sparse Row (`CsrMatrix`; "CSR" di dokumen ini berarti format tersebut), dan likelihood teks Naive Bayes. Dipakai lewat path dependency oleh tiga crate WASM. Penjelasan lengkap: `README.md` di folder ini.

## Siapa yang bergantung pada crate ini

| Crate | Cargo.toml | Titik pemakaian utama |
|---|---|---|
| String to Word Vector | `frontend/components/Modals/Transform/StringToWordVector/rust/Cargo.toml` | `rust/src/lib.rs::process_text_data` → `fit_transform` + `output_from_model` |
| Naive Bayes | `frontend/components/Modals/Analyze/Classify/naive-bayes/rust/Cargo.toml` | `src/models/config.rs` (`TextVectorizerConfig::from_json_value`), `src/stats/raw_text.rs` (`fit`/`transform` per split), `src/stats/text_features.rs`, `src/stats/text_feature_table.rs` (`nb_text`), `src/stats/save.rs` (ekspor `text.recipe`) |
| Apply Model | `frontend/components/Modals/Analyze/Classify/apply-model/rust/Cargo.toml` | `src/scoring/text.rs` (`parse_recipe` → `transform`, `nb_text::score_rows`) |

Setiap perubahan di sini mengubah ketiga WASM. Jalankan tes ketiga crate, bukan hanya core.

## Peta berkas

- `src/lib.rs`: ekspor publik; `run_pipeline`, `preprocess_documents` (kompatibilitas, dipakai tes).
- `src/config.rs`: `TextVectorizerConfig` + enum (snake_case; alias lama `none`→binary, `log`→sublinear, `idf`→standard); `from_json_value`/`from_json_str` → `INVALID_CONFIG`.
- `src/validator.rs`: `validate` (dokumen), `validate_config` (ngram 1..=5, `min_term_freq ≥ 1`), `validate_formula` (tabel kombinasi weka/sklearn; custom bebas). `NGRAM_MAX_LIMIT = 5`.
- `src/tokenizer.rs`: `tokenize`, `compile_regex` (pola kosong → `[\s\p{P}]+`; regex rusak → `INVALID_REGEX`).
- `src/stopwords.rs`: `build_set` (JSON array → set lowercase; JSON rusak → `INVALID_STOPWORDS`; kosong/null → tanpa filter), `filter_with_set`.
- `src/stemmer.rs`: `stem_batch` (Sastrawi `Dictionary` + `Stemmer`, `rust_stemmers::Algorithm::English` = Snowball/Porter2; lowercase internal; cache per batch; token kosong dibuang).
- `src/ngram.rs`: `generate` (gabung dengan spasi, setelah stemming).
- `src/pipeline.rs`: `prepare`, `prepare_with_stopwords` (crate-private, untuk transform), `Pipeline::tokens_batch`, `resolved_stopwords`.
- `src/vectorizer.rs`: `fit_tokens`, `rows_for_model`, `finish_rows`, `row_from_counts` (dipakai fit DAN transform), `tf_value`, `idf_value`, `output_from_model`.
- `src/model.rs`: `TextVectorizerModel`, `RECIPE_VERSION = "1.0"`, `CsrMatrix::to_dense`, `fit`, `transform`, `fit_transform`, `validate_model`.
- `src/nb_text.rs`: `TextLikelihood`, `TextNbParams`, `train`, `score_rows`, `top_k`, `safe_ln`.
- `tests/*.rs` (155 tes) dan `tests/eval_data/*.json` (acuan independen).

## Invarian (jangan dilanggar)

Konsistensi training (STWV/NB) ↔ Apply Model:

1. **Satu mesin teks.** Tokenizer, stopword, stemmer, vectorizer, dan likelihood teks hanya ada di crate ini (`naive-bayes/docs/AGENTS_V2.md` V13, P-V2). Jangan menyalin logika ini ke crate NB/AM/STWV.
2. **`transform` hanya membaca recipe.** Vocabulary, `idf`, `avg_doc_norm`, dan `resolved_stopwords` berasal dari model; tidak ada df/IDF/norma yang dihitung dari data yang ditransformasi. Term OOV diabaikan. Transform memakai `resolved_stopwords`, bukan mem-parse ulang `config.custom_stopwords`.
3. **Jalur fit dan transform identik.** Keduanya memakai `Pipeline::tokens_batch`, `row_from_counts`, dan `finish_rows`. `fit_transform(docs)` harus sama persis dengan `transform(&fit(docs), docs)`.
4. **Urutan pipeline tetap:** lowercase (opsional) → split regex → stopword (case-insensitive, dicocokkan pada token sebelum stemming) → stemming (selalu lowercase) → n-gram. Urutan nilai sel: TF → × IDF → normalization.
5. **Urutan kolom = vocabulary alfabetis byte-wise.** NB mengekspor `text.terms == recipe.vocabulary`; AM menolak recipe bila `vocabulary != terms` atau panjang `idf`/`doc_freq` tidak sama (`AM_E_NB2_TEXT_SHAPE`); model raw tanpa recipe ditolak dengan `AM_E_NB2_TEXT_SOURCE` (`apply-model/rust/src/scoring/text.rs`).
6. **Satu dokumen masuk = satu baris keluar.** Dokumen kosong/whitespace/semua OOV → baris nol (tanpa NaN/Inf). `fit` menolak array kosong dan semua-kosong (`EMPTY_INPUT`); `transform` menolak array kosong tetapi menerima dokumen yang semuanya kosong.
7. **Format recipe stabil.** Field `TextVectorizerModel`/`TextVectorizerConfig` diserialisasi ke file model schema 2.0 (`text.recipe`) dan dibaca ulang oleh AM. Field baru wajib `#[serde(default)]` agar file model lama tetap terbaca; menghapus/mengganti nama field atau mengubah `RECIPE_VERSION` memutus model lama (`transform` → `INVALID_DATA`). Cerminkan perubahan di `apply-model/types/model-schema.ts` (`TextVectorizerRecipe`, `TextVectorizerRecipeConfig`) dan di `StringToWordVector/types.ts` / `config.ts::toRustConfig`.
8. **`serde_json` dengan `float_roundtrip`** (di `Cargo.toml` ini) agar IDF dan `avg_doc_norm` bit-identik setelah simpan-muat sebagai teks. Jangan dihapus. Feature unification Cargo juga mengaktifkannya untuk crate STWV.
9. **`sastrawi-rs = "=0.5.3"`** dikunci di core dan STWV (0.5.1 panik pada token yang karakter keduanya multibita). Cargo.lock tidak ikut git; jangan longgarkan versi.
10. **Kesamaan skor NB ↔ AM** (P-V3): `nb_text::score_rows` adalah satu-satunya fungsi skor Text; hasilnya tanpa `ln prior`. Complement dengan K ≥ 2 tidak memakai prior (`uses_class_prior = false`). Bernoulli selalu menambah Σ A_ct, juga untuk baris nol. Golden §6.7 diuji di core, NB, dan AM (toleransi 10⁻⁶ core, 10⁻⁹ NB ↔ AM).
11. **Kode error** `TextError.code` adalah kontrak: `EMPTY_INPUT`, `INVALID_CONFIG`, `INVALID_REGEX`, `INVALID_STOPWORDS`, `EMPTY_VOCABULARY`, `INVALID_DATA`, `SERIALIZE_ERROR`. Pesan berbahasa Inggris. Jangan mengganti nama kode tanpa memperbarui pemetaan di STWV/NB/AM dan tes Jest-nya.
12. **Words to Keep:** mode `weka`/`sklearn` → rangking total kemunculan; `custom` → Σ TF × IDF; seri → alfabetis; `words_to_keep = 0` = simpan semua. Min term frequency memakai total kemunculan, bukan df. `formula_standard` diturunkan UI lewat `StringToWordVector/constants/vectorization-options.ts::engineFormulaMode`; tabelnya harus sama dengan `validator.rs::validate_formula`.
13. **Tanpa panic** pada CSR rusak (`to_dense`, `row_entries` melewati indeks di luar rentang dan nilai non-finite). Nilai negatif ditolak oleh pemanggil (`NB_E_TEXT_NEGATIVE` / `AM_E_TEXT_NEGATIVE`), bukan oleh core. Aturan missing/NotScored juga milik AM/NB, bukan core.

## Verifikasi perubahan

PowerShell, satu perintah per baris (set env hanya bila Application Control memblokir biner tes):

```powershell
$env:CARGO_PROFILE_TEST_DEBUG = '0'
cd C:\Data\KULIAH\Skripsi\statify64\frontend\public\workers\TextAnalytics\statify-text-core
cargo test
cd C:\Data\KULIAH\Skripsi\statify64\frontend\components\Modals\Analyze\Classify\naive-bayes\rust
cargo test
cd C:\Data\KULIAH\Skripsi\statify64\frontend\components\Modals\Analyze\Classify\apply-model\rust
cargo test
```

Harapan saat ini: core 155, Naive Bayes 242, Apply Model 167, semuanya lulus (`naive-bayes/text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md`). Tes core tidak ada di `src/` (`--lib` = 0 tes); semuanya di `tests/`.

Build WASM ketiga menu (core sendiri tidak dibangun menjadi WASM):

- Smart App Control di laptop pengembang dapat memblokir build Rust/WASM di Windows; jangan mematikannya. Build WASM selalu di WSL Ubuntu: tulis skrip `.sh` dulu (kutip PowerShell ke bash rumit), jalankan `wsl -d Ubuntu -e bash <skrip>.sh`, dan di skrip `source $HOME/.cargo/env` serta set `CARGO_TARGET_DIR` di `$HOME`. Repo tidak menyimpan skrip build (`build-wasm.sh` sudah tidak ada).
- `cargo test` crate core, Naive Bayes, dan Apply Model bisa di Windows (`$env:CARGO_PROFILE_TEST_DEBUG = "0"` bila Application Control memblokir biner tes). Crate String to Word Vector hanya dapat dibangun di WSL.
- Build WASM dan `run_all.ps1` menulis berkas: jalankan hanya bila diminta Lewis dan tidak ada thread lain yang sedang menguji.
- Langkah per menu ada di `AGENTS.md` masing-masing. Setelah `wasm-pack build` String to Word Vector, kembalikan `StringToWordVector/wasm-output/.gitignore` dan `package.json` (git checkout) dan hapus `README.md` buatan wasm-pack.
- Lalu jalankan Jest ketiga menu dan, bila perlu, uji ulang penuh `naive-bayes/text_analytics_eval/run_all.ps1` (performa: `-SkipBaseline -Only E`).

Bila mengubah angka atau rumus: perbarui acuan lewat skrip Python di `naive-bayes/text_analytics_eval/unit/reference_values.py` (bukan dengan menyalin keluaran Rust), lalu jalankan ulang `eval_formulas`, `eval_vocab_limit`, `eval_text_pipeline`.

## Jebakan yang diketahui

- Kamus Sastrawi dibuat setiap `prepare` (sekali per `fit`/`transform`). Panggil per batch, jangan per dokumen.
- CSR menyimpan entri nol eksplisit (mis. IDF standard = ln(N/df) = 0 bila term ada di semua dokumen). `empty_documents` menghitung baris tanpa entri, bukan baris bernilai nol.
- TF `normalized` membagi dengan jumlah token dokumen setelah n-gram dan sebelum pemangkasan vocabulary (`processed[d].len()`).
- `avg_doc_norm` dihitung dari baris latih sebelum normalisasi dan hanya dari baris bernorma > 0; recipe `doc_length` tanpa `avg_doc_norm` → `INVALID_DATA`.
- Daftar stopword Indonesia/Inggris ada di TypeScript (`StringToWordVector/constants/stopwords.ts`), dikirim sebagai `custom_stopwords`. `tests/eval_data/stopwords_*.json` adalah salinannya; ubah keduanya bersamaan.
- Delimiter default UI `[\s.,;:'"()?!]+` berbeda dari fallback core `[\s\p{P}]+` (dipakai hanya bila pola kosong; UI menolak pola kosong).
- `TfMethod::v1_label` / `IdfMethod::v1_label` tidak dipakai lagi; `stats.method` memakai `as_str`.
- AM menormalkan float bulat (mis. `2.0`) menjadi integer sebelum deserialisasi recipe (`apply-model/rust/src/scoring/text.rs::normalize_integers`) karena field `u32`/`usize`.
- Komentar lama menyebut "Tahap 2 belum dikerjakan" atau `float_roundtrip` "belum diterapkan": keduanya sudah selesai.

## Aturan proyek

- Jangan `git commit`, `git push`, `git add`, `git stash`, atau `git checkout` sendiri. Siapkan perubahan, lalu berikan perintah PowerShell (baris per baris) dan draf pesan commit untuk direview Lewis. Branch kerja `dija-v2`, identitas commit "Dija".
- Jangan deploy.
- Paket evaluasi hanya di `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/` (bukan `testing/`). Data uji di `text_analytics_eval/accuracy/datasets/` (lihat `MANIFEST.md`). Jangan merujuk folder "Claude outputs".
- Angka pengujian di dokumen harus sama dengan `text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md`: Rust 564 (core 155 / Naive Bayes 242 / Apply Model 167), Jest 1.250 dalam 80 suite (String to Word Vector 171 / Naive Bayes 388 / Apply Model 691), cakupan baris Jest 72,18% / 94,43% / 97,80%, white-box 54 jalur. Bila jumlah tes berubah, laporkan angka barunya.
- Penulisan: "WEKA", "Snowball/Porter2", "Client-Side Rendering (CSR)" pada penyebutan pertama, nama menu String to Word Vector, Naive Bayes, Apply Model. Teks UI berbahasa Inggris.
