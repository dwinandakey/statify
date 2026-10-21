# AGENTS.md — Naive Bayes (Analyze → Classify → Naive Bayes)

Aturan kerja untuk agen AI yang mengubah kode di folder ini. Gambaran umum untuk manusia ada di `README.md`.
Rumus likelihood teks, schema 2.0, dan kode galat v2 dikunci di `docs/AGENTS_V2.md` (§6, §8, §11); dokumen ini
menggantikan versi lama AGENTS.md (kontrak desain v1) dan mencatat perilaku kode saat ini (branch `dija-v2`,
22 Oktober 2026). Bila `docs/AGENTS_V2.md` berbeda dengan kode, kode yang berlaku (contoh: pilihan Gaussian min. std
sudah dihapus dari UI).

## Aturan proyek

- Jangan `git commit`, `git push`, `git add`, `git stash`, atau `git checkout` sendiri. Siapkan perubahan, lalu berikan perintah PowerShell (baris per baris) dan draf pesan commit untuk direview Lewis. Branch kerja `dija-v2`, identitas commit "Dija".
- Jangan deploy.
- Paket evaluasi hanya di `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/` (bukan `testing/`). Data uji di `text_analytics_eval/accuracy/datasets/` (lihat `MANIFEST.md`). Jangan merujuk folder "Claude outputs".
- Angka pengujian di dokumen harus sama dengan `text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md`: Rust 564 (core 155 / Naive Bayes 242 / Apply Model 167), Jest 1.250 dalam 80 suite (String to Word Vector 171 / Naive Bayes 388 / Apply Model 691), cakupan baris Jest 72,18% / 94,43% / 97,80%, white-box 54 jalur. Bila jumlah tes berubah, laporkan angka barunya.
- Penulisan: "WEKA", "Snowball/Porter2", "Client-Side Rendering (CSR)" pada penyebutan pertama, nama menu String to Word Vector, Naive Bayes, Apply Model. Teks UI berbahasa Inggris.
- Jangan mengubah folder modul lain (`nearest-neighbor`, `tree`, dst.) atau komponen bersama (`VariableListManager`,
  `components/ui/*`, `useModal`, `useIndexedDB`, store global) demi kebutuhan Naive Bayes.
- Jangan menyalin kode tokenizer/stemmer/vectorizer/likelihood teks ke crate ini. Pakai `statify-text-core`
  (`frontend/public/workers/TextAnalytics/statify-text-core`).
- Pesan galat: kalimat ramah pengguna dulu, kode internal di akhir dalam kurung,
  mis. `... (NB_E_TEXT_NEGATIVE)`.

## Peta berkas kunci

| Path | Isi |
|---|---|
| `dialogs/naive-bayes-main.tsx` | `NaiveBayesContainer`; `getNaiveBayesSelectedVariables`, `buildRawTextValues`, `getTabLeaveError`, `getEffectiveNumericPredictors`; IndexedDB key `"NaiveBayes"` + `_variablesFingerprint`; `handleOK`. |
| `hooks/useNaiveBayesValidation.ts` | `getEffectiveTextSource`, `getTextColumnNames`, `getEffectivePredictors` (satu-satunya sumber predictor efektif), `useNaiveBayesValidation`, `getNumericInputError`. |
| `hooks/useNaiveBayesTextRules.ts` | Peringatan non-blokir W-VEC (≥ 20 kolom, sampel 1.000 baris), W-STR (rasio unik ≥ 50%, sampel 5.000), W-LEAK. |
| `dialogs/options.tsx` | `getSmoothingAlphaError`, `getTextAlphaError` (teks identik dengan `getNumericInputError`), `pruneNumericOverrides`. |
| `dialogs/validation.tsx`, `dialogs/output.tsx` | Input Training %, KFolds, seed; checkbox output dan Top-k (`parseTopK`: kosong → NaN). |
| `constants/naive-bayes-default.ts` | Default form, `mergeWithDefaults` (memaksa `NumericLikelihood: "gaussian"`, override `{}`). |
| `types/naive-bayes.ts` | Tipe form dan `NaiveBayesTextPayload`. |
| `services/naive-bayes-analysis.ts` | `NAIVE_BAYES_WASM_VERSION`, `buildNaiveBayesWorkerConfig`, `buildNaiveBayesTextPayload`, `splitNaiveBayesDataVariables`, `getNaiveBayesEngineWarnings`, `analyzeNaiveBayes`. |
| `services/naive-bayes-error-messages.ts` | `getUserFriendlyNaiveBayesError` (pencocokan substring; kode `NB_E_*` dicek lebih dulu). |
| `services/naive-bayes-analysis-output.ts` | Menulis statistic ke Output Viewer, termasuk `"Export Model"` dengan `output_data = {naiveBayesTrainedModel}`. |
| `components/export-model-output.tsx`, `export-model-action.tsx` | Unduh JSON (`Naive_Bayes_Model_Export.json`). |
| `components/text-feature-table-output.tsx` | Text Feature Table, Download CSV (BOM, CRLF), Copy (TSV) batas 5 MB. |
| `rust/src/wasm/constructor.rs`, `function.rs` | `NaiveBayesAnalysis::new`, `run_analysis`, `get_formatted_results` (serializer `maps_as_objects` + `missing_as_null`). |
| `rust/src/stats/partition.rs` | `validate_fold_count`, `stratified_k_fold`, holdout stratified. |
| `rust/src/models/data.rs` | `TextPayload`, `text_negative_message` (`NB_E_TEXT_NEGATIVE`). |
| `rust/src/stats/raw_text.rs` | Fit teks per holdout/fold dan model final; `NB_E_TEXT_EMPTY_VOCAB(_FOLD)`, `NB_E_TEXT_CONFIG`. |
| `rust/src/stats/save.rs` | `ExportedModel` (1.1), `ExportedModelV2` (2.0), `export_requires_schema_2`, `build_export`. |
| `frontend/public/workers/Classify/NaiveBayes/naive-bayes.worker.js` | Worker; dua URL `?v=` harus sama dengan `NAIVE_BAYES_WASM_VERSION`. |

## Invarian

**Validasi (UC-03 alur alternatif 4a)**
- K-fold minimal 2, di UI dan di Rust. UI: `"The number of folds must be at least 2."`
  (`useNaiveBayesValidation.ts:255-256`). Rust: `"Number of folds must be at least 2 (got {})."` (`partition.rs:179-181`).
  Folds > jumlah instance → `Err` (analisis gagal). Folds > kelas terkecil → `Ok(Some(warning))`, analisis tetap jalan
  dan peringatan tampil sebagai baris Note di output.
- Smoothing Alpha: `> 0`, `≤ 999`. Text Alpha: `> 0`, `≤ 999`, hanya dicek bila Text Features terisi. Top-k:
  bilangan bulat 1–1000, hanya dicek bila Text Features terisi **dan** `TextFeatureTable` dicentang. Training % 1–99.
  Seed 0–4294967295 atau `null`.
- Nilai tidak sah tetap diteruskan ke form (`updateFormData`), tidak dibuang. Akibatnya: pesan di bawah kolom,
  `getTabLeaveError` menahan pindah tab, dan `handleOK` menampilkan toast lalu berhenti sebelum `analyzeNaiveBayes`.
  Jangan kembali ke pola "abaikan nilai tidak sah dan pertahankan nilai lama".
- Teks pesan di `options.tsx` dan `getNumericInputError` harus identik. Teks ini juga dipakai buku (Tabel white-box
  `getNumericInputError`, 29 jalur) dan tes `hooks/__tests__/eval/whitebox.*`. Mengubah teks atau struktur cabang
  berarti mengubah tes white-box dan buku; minta persetujuan Lewis dulu.
- Tombol OK `disabled={!validation.isValid}`: target wajib, dan (predictor efektif tidak kosong atau Text Features
  terisi). Complement bersama predictor Numeric/Categorical memblokir OK. Jalur Raw Text memvalidasi `validateStwvConfig`.

**Data dan payload**
- Predictor efektif hanya dari `getEffectivePredictors`. Mode `exclude` mengeluarkan target, `ExcludedVar`,
  `RawTextVar`, `TextVectorVars`, dan variabel `measure === "unknown"`; variabel STRING lain tetap ikut.
- Urutan `dataVariables`: `[target, ...predictor efektif, ...kolom Word-Vector]`. Kolom Raw Text tidak lewat
  `getSlicedData` (parseFloat merusak teks); dikirim lewat `rawTextValues`, `""`/spasi → `null`.
- Word-Vector: `null`/non-finite → 0 di Rust; nilai negatif → galat
  `NB_E_TEXT_NEGATIVE: Text vector column '{kolom}' contains negative values ({n} column(s) affected). ...`.
  Format ini diparse `naive-bayes-error-messages.ts` (nama kolom di antara kutip tunggal, jumlah dari `(\d+) column`).
  Jangan ubah format tanpa mengubah parser dan tesnya.
- `config.Text` hanya diisi (`toRustConfig`) untuk jalur Raw Text; selain itu `null`. `TextTopK` di luar 1–1000
  diganti 100 sebelum dikirim (pengaman; validasi UI tetap yang menahan).
- Jalur Raw Text anti-leakage: resep teks di-fit hanya pada data latih tiap holdout/fold; model final di-fit pada
  seluruh baris valid.
- Fungsi yang disalin Apply Model dan harus tetap identik: `rust/src/stats/preprocess_data.rs::data_value_to_label`
  dan `is_missing_value`, `rust/src/stats/classification_table.rs`, rumus Gaussian/Categorical di
  `rust/src/stats/prediction.rs`. Perubahan wajib disertai revisi `../apply-model`.

**Format file model (dibaca Apply Model, `../apply-model/adapters/naive-bayes-adapter.ts`)**
- `model_type: "naive_bayes"`. Schema `"1.1"` bila tidak ada Text Features dan tidak ada `gaussian_minstd`
  (struct `ExportedModel`, harus identik dengan v1 kecuali `trained_at`); selain itu `"2.0"` (`ExportedModelV2`).
- Field 1.1: `schema_version`, `model_type`, `trained_at`, `target{name, classes (urut alfabetis byte), class_priors,
  class_counts}`, `features[]` (categorical: `name, role, categories, distribution{kelas: prob[]}, class_totals`;
  numerical: `name, role, mean, variance` setelah variance floor), `smoothing_alpha`, `variance_floor` (1e-9),
  `feature_order`, `label_mapping`, `validation_config`, `missing_value_policy`, `unseen_category_policy`.
- Schema 2.0 menambah `likelihood` dan `min_variance` per fitur serta blok `text` (`source`, `likelihood`, `alpha`,
  `terms`, `raw_variable`, `columns`, `log_weights`, `log_weights_absent`, `class_term_counts`, `uses_class_prior`,
  `recipe`). `text: null` bila tanpa Text. Detail di `docs/AGENTS_V2.md` §8.
- Apply Model menerima `schema_version` `1.0`, `1.1`, `2.0`; file `.json` maksimal 10 MB; dari Output Viewer ia mencari
  statistic berkomponen `"Export Model"` dengan key `naiveBayesTrainedModel`. Jangan me-rename key komponen
  `"Export Model"`, `"Text Feature Table"`, atau `naiveBayesTrainedModel`.
- Mesin Rust masih mendukung `gaussian_minstd` (untuk config/model lama dan tesnya). UI dan `mergeWithDefaults`
  selalu mengirim `"gaussian"`. Jangan menghapus dukungan di Rust tanpa keputusan Lewis.

**Kode galat** (`NB_E_*`, dipetakan di `services/naive-bayes-error-messages.ts`): `NB_E_TEXT_NEGATIVE`,
`NB_E_TEXT_RAW_MISSING` (TS), `NB_E_TEXT_EMPTY_VOCAB_FOLD`, `NB_E_TEXT_EMPTY_VOCAB`, `NB_E_COMPLEMENT_MIXED`,
`NB_E_TEXT_SHAPE`, `NB_E_TEXT_CONFIG: [KODE_CORE] pesan`. Kode baru harus dicek sebelum cabang kata umum
(`target`, `predictor`, `fold`) supaya tidak salah tangkap.

## Verifikasi perubahan

Jalankan dari akar repo kecuali disebut lain. Jangan menjalankan perintah yang menulis berkas (build, `--coverage`)
bila thread lain sedang menjalankan uji di repo yang sama.

```powershell
# Jest (wajib dari frontend; jest.config.ts di akar repo usang)
cd frontend
npx jest components/Modals/Analyze/Classify/naive-bayes
npx jest components/Modals/Analyze/Classify/apply-model     # bila menyentuh format model atau payload
cd ..

# Rust Naive Bayes (bisa di Windows)
cd frontend\components\Modals\Analyze\Classify\naive-bayes\rust
$env:CARGO_PROFILE_TEST_DEBUG = "0"   # bila Application Control memblokir biner tes
$env:TA_EVAL_REQUIRE_DATA = "1"       # bila tidak di-set, tes bb22/bb23 dilewati diam-diam saat data tidak ditemukan
cargo test
```

Tes spesifik: validasi `hooks/__tests__/useNaiveBayesValidation.test.ts`, `hooks/__tests__/eval/whitebox.*.test.ts`,
`hooks/__tests__/eval/kfold.eval.test.ts`; container `__tests__/eval/blackbox.nb.container.test.tsx`; payload
`hooks/__tests__/naiveBayesPayload.test.ts`, `services/__tests__/eval/payload_equivalence.nb.test.ts`; galat
`services/__tests__/naive-bayes-error-messages.test.ts`; Rust `cargo test --test eval_partition`,
`cargo test --test eval_blackbox_nb`.

Uji ulang penuh paket evaluasi (lama, menulis log):
`powershell -ExecutionPolicy Bypass -File frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\run_all.ps1`
(performa saja: `-SkipBaseline -Only E`).

Harapan: Rust Naive Bayes 242 tes, Jest Naive Bayes 388 tes, semuanya lulus (angka seluruh modul ada di Aturan proyek).

## Build WASM

- Smart App Control di laptop pengembang dapat memblokir build Rust/WASM di Windows; jangan mematikannya. Build WASM selalu di WSL Ubuntu: tulis skrip `.sh` dulu (kutip PowerShell ke bash rumit), jalankan `wsl -d Ubuntu -e bash <skrip>.sh`, dan di skrip `source $HOME/.cargo/env` serta set `CARGO_TARGET_DIR` di `$HOME`. Repo tidak menyimpan skrip build (`build-wasm.sh` sudah tidak ada).
- `cargo test` crate core, Naive Bayes, dan Apply Model bisa di Windows (`$env:CARGO_PROFILE_TEST_DEBUG = "0"` bila Application Control memblokir biner tes). Crate String to Word Vector hanya dapat dibangun di WSL.
- Build WASM dan `run_all.ps1` menulis berkas: jalankan hanya bila diminta Lewis dan tidak ada thread lain yang sedang menguji.
- Di skrip, dari folder `rust/`: `wasm-pack build --target web --release`.
- Salin hanya `wasm.js`, `wasm_bg.wasm`, `wasm.d.ts`, `wasm_bg.wasm.d.ts` ke
  `frontend/public/workers/Classify/NaiveBayes/pkg/` (jangan `.gitignore`/`package.json`).
- Naikkan versi `naive-bayes-v3-YYYYMMDDx` di `NAIVE_BAYES_WASM_VERSION` dan dua URL `?v=` worker sekaligus.

## Jebakan yang diketahui

- `getSlicedData` memakai parseFloat: jangan pernah mengirim kolom Raw Text lewat jalur itu.
- `serde_wasm_bindgen::to_value` polos mengubah `HashMap` menjadi JS `Map` (hilang saat `JSON.stringify`) dan `None`
  menjadi `undefined`. Pertahankan serializer kustom di `function.rs`.
- `Number("")` = 0, sehingga Smoothing Alpha kosong memunculkan "must be greater than 0"; Top-k kosong menjadi NaN.
- Perubahan daftar variabel dataset (nama/tipe/measure) mereset seluruh form dan menghapus data IndexedDB.
- Tab Text Preprocessing nonaktif bila Raw Text Variable kosong; tur bantuan memindah tab tanpa `getTabLeaveError`.
- `cargo test` di crate Apply Model (`eval_compare.rs`) menulis ulang `text_analytics_eval/accuracy/out/pred_statify_rust_K*.csv`
  (selisih pembulatan float); kembalikan berkas itu bila tidak dimaksudkan berubah.
- Banyak MD di `text_analytics_eval/` (REPORT, HANDOFF, ENV, sebagian E_performance) masih memuat angka 8 dan 21 Oktober.
  Angka yang berlaku hanya di `LAPORAN_UJI_ULANG_22Okt.md`.
