# Apply Model (Analyze → Classify → Apply Model)

Menu Apply Model menerapkan model klasifikasi yang **sudah dilatih** di menu Naive Bayes ke dataset aktif Statify.
Untuk setiap baris, menu ini menghitung kelas prediksi dan probabilitasnya, menulis hasilnya sebagai **variabel baru**
di Data View (variabel lama tidak pernah ditimpa), dan menampilkan ringkasan di Output Viewer. Bila pengguna memilih
variabel kelas sebenarnya (*Actual target*), menu ini juga menghitung metrik evaluasi dan confusion matrix.
Menu ini tidak melatih model.

Fitur buku skripsi: TA-F23–TA-F30 (F32–F39), use case UC-07, UC-08, UC-09, skenario black-box BB-44–BB-56.

## 1. Posisi dalam Modul Text Analytics

```
String to Word Vector ──(kolom VEC_*)──▶ Naive Bayes ──(Export Model, JSON)──▶ Apply Model ──▶ kolom NB_* + Output Viewer
        │                                    │                                      │
        └──────────── statify-text-core (crate Rust bersama: preprocessing, TF-IDF, likelihood teks) ─────────┘
```

- **String to Word Vector** (`frontend/components/Modals/Transform/StringToWordVector`) mengubah teks menjadi kolom vektor kata.
- **Naive Bayes** (`../naive-bayes`) melatih dan mengevaluasi model, lalu mengekspornya sebagai JSON. Model jalur
  Raw Text menyimpan *preprocessing recipe* (konfigurasi, stopword final, vocabulary, IDF, rata-rata norma).
- **Apply Model** (folder ini) memuat JSON itu, memetakan fitur ke variabel dataset, lalu menghitung prediksi di
  Rust/WebAssembly.
- **statify-text-core** (`frontend/public/workers/TextAnalytics/statify-text-core`) adalah satu-satunya implementasi
  preprocessing teks dan likelihood teks. Crate Apply Model memakainya lewat *path dependency*
  (`rust/Cargo.toml`), sehingga teks baru diproses dengan kode yang sama persis seperti saat pelatihan.

Aplikasi memakai pendekatan Client-Side Rendering (CSR): seluruh komputasi berjalan di browser pengguna,
di dalam Web Worker yang memuat modul WebAssembly.

## 2. Struktur direktori

| Folder / berkas | Tanggung jawab |
|---|---|
| `adapters/` | Registry model per algoritma. `types.ts` (interface `ClassifierModelAdapter`, `ModelDescriptor`), `registry.ts` (`CLASSIFIER_MODEL_ADAPTERS`, `getModelAdapter`, `validateAnyModel`), `naive-bayes-adapter.ts` (validasi schema 1.0/1.1/2.0 dan descriptor untuk UI). |
| `constants/` | `apply-model-codes.ts` (semua kode `AM_E_*`/`AM_W_*`/`AM_I_*` dan pesannya), `apply-model-default.ts` (default form), `builtin-models.ts` (katalog model bawaan, saat ini kosong). |
| `types/` | `model-schema.ts` (bentuk JSON model NB), `apply-model.ts` (state form per tab), `apply-model-worker.ts` (payload worker dan `ApplyModelRawResult`). |
| `hooks/` | Fungsi aturan murni: `useApplyModelMappingRules.ts` (auto-map dan validasi pemetaan, termasuk teks), `useApplyModelSaveRules.ts` (nama dan tipe kolom output), `useApplyModelOutputRules.ts`, `useApplyModelValidation.ts` (validasi terpusat), `tourConfig.ts` (langkah tur Help). |
| `dialogs/` | UI: `apply-model-main.tsx` (container, IndexedDB, OK/Reset/Cancel/Help), `model-tab.tsx`, `variables-tab.tsx`, `save-tab.tsx`, `output-tab.tsx`, `collapsible-name-list.tsx` (daftar kolom vektor yang diisi 0, dimuat bertahap 200 nama). |
| `services/` | `model-loader.ts` (tiga sumber model), `apply-model-analysis.ts` (orkestrator, payload, worker, `APPLY_MODEL_WASM_VERSION`), `apply-model-formatter.ts`, `apply-model-interpretation.ts` (interpretasi otomatis), `apply-model-output.ts` (Output Viewer), `apply-model-save-variables.ts` (tulis kolom), `apply-model-error-messages.ts`, `__fixtures__/` (model contoh). |
| `rust/` | Crate wasm-pack `wasm`. `src/models/` (payload, data, hasil), `src/scoring/` (`mod.rs` trait `ClassifierScorer` + `build_scorer`, `naive_bayes.rs`, `text.rs`), `src/stats/` (posterior, ringkasan, evaluasi, salinan modul NB), `src/utils/`, `src/wasm/` (kelas `ApplyModelAnalysis`), `tests/` (`text_scoring.rs`, `eval_blackbox_am.rs`, `eval_compare.rs`). |
| `__tests__/eval/` | Helper bersama tes evaluasi skripsi (black-box, integrasi). Tes evaluasinya sendiri ada di `*/__tests__/eval/`. |

Berkas di luar folder yang menjadi bagian menu ini (path relatif terhadap `frontend/`): `public/workers/Classify/ApplyModel/apply-model.worker.js`
dan `pkg/` (hasil build WASM), serta wiring di `components/Modals/Analyze/Classify/classify-menu.tsx`, `ClassifyRegistry.tsx`,
`types/modalTypes.ts` (`ModalApplyModel`), `app/dashboard/layout.tsx` (lebar sidebar 40%), `hooks/useIndexedDB.ts`
(key `"ApplyModel"`), dan panduan Help di `app/help/components/statistics-guide/text-analytics/apply-model/`.

## 3. Alur data

```
dialogs/apply-model-main.tsx
  ├─ Tab Model ──▶ services/model-loader.ts ──▶ adapters/registry.ts::validateAnyModel ──▶ naive-bayes-adapter.ts
  ├─ Tab Variables ──▶ hooks/useApplyModelMappingRules.ts (autoMapFeatures, validateMapping)
  ├─ Tab Save / Output ──▶ hooks/useApplyModelSaveRules.ts, useApplyModelOutputRules.ts
  └─ hooks/useApplyModelValidation.ts (OK aktif hanya bila tidak ada issue "error")
        │ OK: simpan form ke IndexedDB "ApplyModel", lalu toast.promise(applyModel(...))
        ▼
services/apply-model-analysis.ts::applyModel
  1. validasi ulang model, hitung kolom output + nama akhir (sebelum worker)
  2. satu getSlicedData untuk prediktor, kolom vektor terpetakan, dan actual target
     (teks Raw dibaca langsung dari data tanpa parseFloat: readRawTextValues)
  3. new Worker("/workers/Classify/ApplyModel/apply-model.worker.js?v=<versi>", { type: "module" })
        ▼ postMessage({ predictors, predictorDefs, mapping, actual, actualDefs, model, text? })
apply-model.worker.js ──▶ new ApplyModelAnalysis(... 7 argumen) (WASM)
        ▼
rust/src/wasm/function.rs::run_apply_model_with_text
  build_scorer(model) → NaiveBayesScorer::from_json (validasi lapis kedua)
  → TextModel::prepare (raw: statify_text_core::transform dengan recipe; vector: matriks jarang + isi 0)
  → nb_text::score_rows → score_row_with_text per baris → posterior → ringkasan → evaluasi
        ▼ ApplyModelRawResult
services/apply-model-formatter.ts + apply-model-interpretation.ts → apply-model-output.ts (Output Viewer)
services/apply-model-save-variables.ts → useVariableStore.addVariables (satu kali, kolom baru)
```

Prinsip: komputasi probabilitas di Rust; orkestrasi, penamaan kolom, dan penulisan ke store di TypeScript.

## 4. Memuat model dari Naive Bayes

Tiga sumber (tab Model, radio "Model Source"). Semua sumber berakhir di `validateAnyModel` yang sama.

| Sumber | Fungsi | Perilaku |
|---|---|---|
| Upload file (.json) | `loadModelFromFile` | Nama harus berakhiran `.json` (selain itu `AM_E_PARSE`), ukuran ≤ 10 MB (`MAX_MODEL_FILE_BYTES`, selain itu `AM_E_FILE_TOO_LARGE`), JSON gagal di-parse → `AM_E_PARSE`. Label sumber `File: <nama>`. |
| From Output Viewer | `listResultStoreModels`, `loadModelFromResultStore` | Menelusuri `useResultStore` (memanggil `loadResults()` sekali bila `logs` kosong), memilih statistic dengan `components === "Export Model"` lalu membaca `output_data.naiveBayesTrainedModel` (string JSON di-parse bila perlu). Urutan terbaru dulu (id statistic menurun). Statistic yang tidak ditemukan → `AM_E_NO_MODEL`. |
| Statify built-in model | `loadBuiltinModel` | `fetch(entry.path)` dari `BUILTIN_MODELS`; katalog **kosong**, sehingga UI menampilkan "There are no built-in Statify models yet." |

Model yang lolos validasi disimpan di state form (`model.ModelJson`) dan ikut dipersist ke IndexedDB saat OK.
Memuat model baru mereset pemetaan (lalu auto-map ulang) dan pengaturan Save; pengaturan Output dipertahankan.

**Schema yang diterima** (`naive-bayes-adapter.ts`, `SUPPORTED_SCHEMA_VERSIONS`):

| Schema | Asal | Catatan |
|---|---|---|
| `1.0` | Export NB lama | Valid dengan peringatan `AM_W_LEGACY_SCHEMA`; kategori tak dikenal dilewati saat scoring. |
| `1.1` | NB tanpa fitur teks | Wajib `target.class_counts` dan `class_totals` per fitur categorical; kategori tak dikenal diberi `α / (class_total + α·K)`. |
| `2.0` | NB dengan fitur teks atau likelihood per fitur | Seperti 1.1, ditambah blok `text` (source `raw`/`vector`, likelihood `multinomial`/`bernoulli`/`complement`, `terms`, `log_weights`, `class_term_counts`, `recipe` untuk raw, `columns` untuk vector) dan field `likelihood` per fitur numerik (`gaussian`/`gaussian_minstd`). |

## 5. Pemetaan variabel (tab Variables)

- **Fitur numerik/kategorik.** Auto-map memakai nama persis, lalu nama tanpa beda huruf besar/kecil bila kandidatnya
  tepat satu. Satu variabel hanya untuk satu fitur. Categorical ↔ variabel `nominal`/`ordinal`; numerical ↔ variabel
  `scale` bukan STRING. Setiap fitur wajib dipetakan (`AM_E_MAP_UNMAPPED`, `AM_E_MAP_ROLE_MISMATCH`,
  `AM_E_MAP_NUMERIC_TYPE`, `AM_E_MAP_DUPLICATE`, `AM_E_MAP_MEASURE_UNKNOWN`, `AM_E_MAP_VAR_NOT_FOUND`).
- **Raw Text Variable** (model `text.source = "raw"`). Auto-map mencari variabel bernama sama dengan
  `text.raw_variable`. Pilihan dropdown hanya variabel bertipe STRING. Wajib diisi (`AM_E_MAP_RAW_TEXT_UNMAPPED`,
  `AM_E_MAP_RAW_TEXT_TYPE`).
- **Word-Vector Columns** (model `text.source = "vector"`). Setiap nama di `text.columns` (nama kolom vektor saat
  pelatihan, misalnya `VEC_makan`) dicocokkan ke variabel dataset dengan aturan nama yang sama (indeks nama untuk
  ribuan kolom). Tidak ada tabel per kolom; UI menampilkan ringkasan "m of V vector columns found; n treated as 0."
  dan daftar kolom yang diisi 0. Kolom yang tidak ditemukan **tidak memblokir** OK (info `AM_I_TEXT_ZERO_FILLED`).
  Bila tidak satu pun kolom ditemukan dan model tidak punya fitur lain, muncul peringatan `AM_W_TEXT_ALL_ZERO_FILLED`
  (semua baris tidak akan diprediksi). Kolom terpetakan bertipe STRING → `AM_E_MAP_NUMERIC_TYPE`.
- **Actual target (optional).** Variabel `nominal`/`ordinal` yang bukan prediktor (termasuk bukan variabel teks).
  Auto-map mengisinya bila ada variabel bernama sama dengan target model.

## 6. Preprocessing teks pada data baru

- **Jalur Raw Text.** Rust memanggil `statify_text_core::transform(recipe, dokumen)` dengan recipe dari model
  (`rust/src/scoring/text.rs::prepare_raw`). `transform` hanya membaca recipe: vocabulary, IDF, stopword, dan
  rata-rata norma tidak dihitung ulang dari data baru, dan kata di luar vocabulary diabaikan. Ini fungsi yang sama
  dengan yang dipakai menu String to Word Vector dan Naive Bayes, sehingga teks baru direpresentasikan pada ruang
  fitur yang sama dengan training data.
- **Jalur Word-Vector.** Model tidak membawa recipe. Nilai kolom `VEC_*` di dataset baru dipakai apa adanya; kolom
  tak ditemukan diisi 0, sel kosong/non-angka diisi 0, nilai negatif ditolak (`AM_E_TEXT_NEGATIVE`). Bila kolom itu
  dibuat dengan menjalankan String to Word Vector ulang pada data baru, vocabulary/IDF/normalisasi dihitung dari data
  baru, sehingga tidak setara dengan saat pelatihan. Untuk teks, jalur Raw Text lebih disarankan.
- **Teks kosong.** Teks kosong/spasi dihitung sebagai prediktor missing. Baris yang semua prediktornya missing tidak
  diprediksi (*Not scored*); bila masih ada prediktor lain, teks kosong diperlakukan sebagai dokumen tanpa kata.

## 7. Opsi utama dan validasi

| Tab | Opsi | Validasi |
|---|---|---|
| Model | Model Source, file/Output Viewer/built-in | Kode pemuatan dan validasi model (`AM_E_PARSE` … `AM_E_CLASS_TOTALS_INVALID`, `AM_E_NB2_*`). Model gagal validasi tidak disimpan ke state. Tab lain nonaktif sampai model dimuat. |
| Variables | pemetaan fitur, Raw Text Variable, Word-Vector Columns, Actual target | §5 di atas. |
| Save | Predicted value (selalu), Predicted probability (default ON), probability per kelas (default OFF), Name prefix (default `NB`), Use custom names | Nama: tidak kosong, pola `^[A-Za-z@#$][A-Za-z0-9._@#$]*$`, ≤ 64 karakter, bukan kata cadangan, tidak kembar (`AM_E_NAME_*`). Nama yang bentrok dengan variabel lama diberi akhiran oleh `processVariableName` (`AM_W_NAME_ADJUSTED`), dan kolom "Final name" menampilkan hasil akhirnya. |
| Output | Model Summary, Case Processing Summary, Prediction Distribution, Evaluation metrics, Confusion matrix (semua default ON) | Dua yang terakhir nonaktif selama Actual target kosong. |

Validasi terjadi dua lapis dengan kode yang sama: TypeScript saat model dimuat dan sebelum OK
(`useApplyModelValidation.ts`), Rust saat scoring (`scoring/naive_bayes.rs`, `scoring/text.rs`,
`wasm/function.rs::validate_payload`). Pesan Rust selalu berawalan kode (`"AM_E_XXX: detail"`), lalu
`getUserFriendlyApplyModelError` mengubahnya menjadi kalimat Inggris dengan kode di akhir, misalnya
"... (AM_E_MAP_UNMAPPED)". Label UI dan pesan berbahasa Inggris.

Tombol: **OK** (nonaktif bila ada error; validasi ulang saat diklik), **Reset** (form ke default, hapus data
IndexedDB), **Cancel**, **Help** (tur pop-up langkah demi langkah, dwibahasa). Bila dataset berubah, hanya pemetaan dan
nama kolom kustom yang disusun ulang; model tetap.

## 8. Hasil

Kolom yang ditulis (urutan tetap): `NB_PredictedValue` (NUMERIC bila semua nama kelas berupa angka, selain itu
STRING; measure nominal), `NB_PredictedProbability` (NUMERIC, scale, 4 desimal), dan opsional
`NB_Probability_<kelas>`. Baris yang tidak diprediksi dibiarkan kosong. Semua kolom ditulis dengan satu panggilan
`addVariables`.

Output Viewer (log "Apply Model", analytic "Apply Model Result"): Model Summary, Case Processing Summary,
Prediction Distribution, Saved Variables (selalu), serta Evaluation Metrics, Cohen's Kappa, dan Confusion Matrix bila
Actual target diisi. Setiap tabel diberi interpretasi otomatis (`apply-model-interpretation.ts`).

## 9. Build WASM dan menjalankan tes

### Build WASM (WSL Ubuntu)

Laptop pengembangan memakai Smart App Control, sehingga build Rust/WASM di Windows bisa diblokir. Build dilakukan di
WSL Ubuntu. Repo tidak menyimpan skrip build; contoh skrip `build_am.sh` (simpan di luar repo):

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$HOME/.cargo/env"
export CARGO_TARGET_DIR="$HOME/cargo-target/apply-model"
cd /mnt/c/Data/KULIAH/Skripsi/statify64/frontend/components/Modals/Analyze/Classify/apply-model/rust
wasm-pack build --target web --release
```

```powershell
wsl -d Ubuntu -e bash /path/ke/build_am.sh
$src = "frontend\components\Modals\Analyze\Classify\apply-model\rust\pkg"
$dst = "frontend\public\workers\Classify\ApplyModel\pkg"
Copy-Item -Force "$src\wasm.js","$src\wasm_bg.wasm","$src\wasm.d.ts","$src\wasm_bg.wasm.d.ts" $dst
```

Salin hanya empat berkas itu (`pkg/.gitignore` dan `pkg/package.json` di `public` sudah dilacak git). Setelah `pkg`
diganti, naikkan versi cache di **dua** tempat dengan nilai sama: `APPLY_MODEL_WASM_VERSION` di
`services/apply-model-analysis.ts` dan konstanta di `apply-model.worker.js` (saat ini `apply-model-v3-20261022a`).

### Tes

```powershell
# Rust (dari apply-model\rust). Bila Application Control memblokir biner tes: $env:CARGO_PROFILE_TEST_DEBUG = "0"
cargo test --lib --test text_scoring          # tes bawaan menu
cargo test --test eval_blackbox_am            # black-box skripsi (Track C3)
cargo test --test eval_compare -- --nocapture # opsional, butuh accuracy/out/model_statify_<K>.json; menulis berkas di out/

# Jest (WAJIB dari folder frontend)
npx jest components/Modals/Analyze/Classify/apply-model --coverage=false
npx jest components/Modals/Analyze/Classify/apply-model --testPathIgnorePatterns=__tests__/eval   # tanpa tes evaluasi
npx jest blackbox.am. --runInBand                                                                  # black-box AM saja

# Lint dan tipe
npx eslint components/Modals/Analyze/Classify/apply-model --ext .ts,.tsx --max-warnings=0
npx tsc --noEmit -p .
```

Uji ulang seluruh modul: `powershell -ExecutionPolicy Bypass -File
frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\run_all.ps1` (hanya performa:
`-SkipBaseline -Only E`). Skrip ini menulis log ke `text_analytics_eval\logs\`.

## 10. Ringkasan hasil pengujian final

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

Rincian Apply Model:

- Rust: 167 tes (154 lama + 13 evaluasi). Jest: 691 tes (447 lama + 244 evaluasi).
- Black-box: BB-44–BB-56 (13 skenario buku); track C3 Jest 95/95, Rust 12/12.
- White-box: `loadModelFromFile` V(G) = 6, 6/6 jalur.
- IT-03: 630/630 kelas sama; selisih probabilitas maksimum 5 × 10⁻⁵ karena pembulatan 4 desimal.
- Overhead Worker pada 40 dokumen: 49,4 ms.

## 11. Dokumen terkait

| Dokumen | Isi |
|---|---|
| `AGENTS.md` | Kontrak dan aturan untuk agen AI yang mengubah folder ini. |
| `docs/DOKUMENTASI.md` | Panduan pengguna, landasan teori (rumus scoring, contoh T1–T7, golden teks), dan catatan teknis. |
| `docs/PLAN.md` | Riwayat implementasi v1 (Fase 0–18) dan data uji D1–D3. |
| `../naive-bayes/docs/AGENTS_V2.md` (§8, §10) | Kontrak schema 2.0 dan Apply Model v2 (fitur teks). |
| `../naive-bayes/text_analytics_eval/` | Paket evaluasi skripsi; data uji di `accuracy/datasets/` (lihat `MANIFEST.md`). |
| `frontend/app/help/components/statistics-guide/text-analytics/apply-model/` | Panduan Help > Panduan Statistik untuk pengguna. |

### Dokumen lain

Folder `docs/` menyimpan dua dokumen v1 yang dipertahankan karena dirujuk komentar tes (contoh T1–T7, data uji D1–D3):

| Berkas | Status |
|---|---|
| `docs/DOKUMENTASI.md` | Acuan untuk landasan teori dan contoh T1–T7; bagian versi WASM, Help, angka tes, dan build sudah diselaraskan dengan kode per 22 Oktober 2026. Bila berbeda, README ini dan kode yang berlaku. |
| `docs/PLAN.md` | Historis (rencana dan riwayat implementasi v1). |

`VERIFY-RESULT.md` (laporan verifikasi v1, 3 Oktober 2026) sudah dihapus; riwayatnya ada di git.
