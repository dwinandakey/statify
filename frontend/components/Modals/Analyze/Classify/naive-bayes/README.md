# Naive Bayes (Analyze → Classify → Naive Bayes)

Menu **Naive Bayes** melatih dan mengevaluasi satu model Naive Bayes langsung dari dataset aktif Statify. Satu model
dapat memuat tiga kelompok predictor sekaligus: numerik (Gaussian), kategorik (Categorical dengan Laplace smoothing), dan
fitur teks (Multinomial, Bernoulli, atau Complement). Model terlatih dapat diekspor ke JSON lalu diterapkan ke data baru
lewat menu **Apply Model**. Seluruh komputasi berjalan di peramban dengan pola Client-Side Rendering (CSR): UI React →
Web Worker → WebAssembly (Rust).

Menu ini memenuhi kebutuhan fungsional TA-F13 sampai TA-F22 (fitur F20–F31) dan use case UC-03 (melatih dan
mengevaluasi model), UC-04 (mengatur validasi), dan UC-06 (mengekspor trained model) pada buku skripsi.

## Posisi dalam Modul Text Analytics

```
String to Word Vector (Transform)  --kolom VEC_*-->  Naive Bayes (Classify)  --file JSON / Output Viewer-->  Apply Model (Classify)
            \__________________________ statify-text-core (crate Rust bersama) ___________________________/
```

- **String to Word Vector** (`frontend/components/Modals/Transform/StringToWordVector`) menulis kolom vektor kata ke
  dataset. Kolom itu dapat dipakai Naive Bayes sebagai **Word-Vector Variables**.
- **Naive Bayes** (folder ini) dapat juga menerima satu kolom teks mentah (**Raw Text Variable**) dan memproses teks
  sendiri pada tab **Text Preprocessing**, memakai panel opsi dan mesin yang sama dengan String to Word Vector.
- **Apply Model** (`../apply-model`) membaca hasil **Export Model** menu ini, baik dari file JSON maupun dari Output Viewer.
- **statify-text-core** (`frontend/public/workers/TextAnalytics/statify-text-core`) memuat tokenizer, stopword,
  stemming (Sastrawi dan Snowball/Porter2), n-gram, TF/IDF/normalisasi, resep preprocessing, dan rumus likelihood teks
  (`nb_text`). Crate Naive Bayes dan Apply Model memakainya lewat path dependency, sehingga skor kedua menu identik.

## Struktur direktori

| Path | Tanggung jawab |
|---|---|
| `dialogs/` | Container `naive-bayes-main.tsx` (tab, state form, IndexedDB, validasi tab dan OK, tur bantuan) dan tab `options.tsx`, `validation.tsx`, `output.tsx`, `text-preprocessing.tsx`. `dialogs/__tests__/eval/` berisi uji black-box persistensi. |
| `components/` | Komponen presentasional: tab Variables (`variables-tab.tsx`, `dataset-variable-list.tsx` dengan Filter dan Select All (filtered)), aksi Export Model (`export-model-action.tsx`, `export-model-output.tsx`), dan Text Feature Table (`text-feature-table-output.tsx`). `components/__tests__/` berisi tes komponen. |
| `hooks/` | Logika murni: validasi terpusat (`useNaiveBayesValidation.ts`), peringatan non-blokir W-VEC/W-STR/W-LEAK (`useNaiveBayesTextRules.ts`), langkah tur (`tourConfig.ts`). `hooks/__tests__/eval/` berisi uji white-box dan k-fold. |
| `services/` | Orkestrasi analisis (`naive-bayes-analysis.ts`), formatter hasil (`naive-bayes-analysis-formatter.ts`), penulisan ke Output Viewer (`naive-bayes-analysis-output.ts`), pesan galat ramah pengguna (`naive-bayes-error-messages.ts`), teks interpretasi (`naive-bayes-interpretation.ts`). |
| `constants/` | Nilai default form dan `mergeWithDefaults` untuk data IndexedDB lama. |
| `types/` | Tipe form, payload Text, dan props container (`naive-bayes.ts`). |
| `__tests__/` | Tes tur bantuan dan uji black-box otomatis container, output, dan validasi (`__tests__/eval/`). |
| `rust/` | Crate `wasm`: `src/models` (config, data, payload Text), `src/stats` (preprocessing, partisi, Mersenne Twister, training, prediksi, metrik, tabel atribut, tabel kata, export), `src/wasm` (binding `NaiveBayesAnalysis`), `src/utils`; `tests/` berisi `eval_partition.rs` dan `eval_blackbox_nb.rs`. |
| `text_analytics_eval/` | Paket evaluasi skripsi untuk ketiga menu dan core library (lihat bagian khusus di bawah). |
| `docs/` | Dokumen kontrak v2 dan rencana pengembangan (lihat Dokumen lain). |

Berkas di luar folder yang menjadi bagian menu ini: worker `frontend/public/workers/Classify/NaiveBayes/naive-bayes.worker.js`
dan hasil build WASM di `.../NaiveBayes/pkg/`, registrasi menu di `../ClassifyRegistry.tsx` (container `"sidebar"`), lebar
sidebar di `frontend/app/dashboard/layout.tsx`, registry komponen output `"Export Model"` dan `"Text Feature Table"` di
`frontend/components/Output/Statistics/index.tsx`, serta panduan Help di
`frontend/app/help/components/statistics-guide/text-analytics/`.

## Alur data

1. **UI** (`dialogs/naive-bayes-main.tsx`): form disimpan di IndexedDB dengan key `"NaiveBayes"` beserta sidik jari
   daftar variabel. Bila daftar variabel dataset berubah, seluruh form direset ke default.
2. **Hooks**: `useNaiveBayesValidation` menentukan apakah OK aktif; `getNumericInputError` memeriksa angka saat pindah
   tab dan saat OK ditekan.
3. **Container** menyusun data dengan `getSlicedData` untuk `[target, ...predictor efektif, ...kolom Word-Vector]`. Teks
   Raw Text diambil langsung dari sel asli (`buildRawTextValues`), tidak lewat `getSlicedData`, supaya teks seperti
   `"3 kucing lucu"` tidak berubah menjadi angka 3.
4. **Service** (`analyzeNaiveBayes`) membangun payload Text dan config, lalu mengirimnya ke Web Worker
   `/workers/Classify/NaiveBayes/naive-bayes.worker.js?v=naive-bayes-v3-20261022a`.
5. **Web Worker** memuat WASM dan memanggil `new NaiveBayesAnalysis(target, predictors, targetDefs, predictorsDefs, config, text)`.
6. **WASM Rust** melakukan preprocessing, partisi stratified (holdout atau k-fold, Mersenne Twister), evaluasi, lalu
   melatih ulang model final pada seluruh baris valid dan membentuk file export.
7. **Output Viewer**: Case Processing Summary, Attribute Distribution Table, Model Evaluation Metrics, Confusion Matrix,
   Text Feature Table (dengan Download CSV dan Copy (TSV)), dan kartu Export Model. Hasil tersimpan di result store
   (IndexedDB) sehingga Apply Model dapat memuat model langsung dari Output Viewer.

## Opsi utama dan validasinya

| Tab | Opsi | Default | Validasi (pesan sama persis dengan kode) |
|---|---|---|---|
| Variables | Target (nominal/ordinal); predictor mode **Exclude** atau **Candidate Factors/Covariates**; **Text Features**: Raw Text Variable (maks. 1, STRING) atau Word-Vector Variables (NUMERIC), saling eksklusif | mode Exclude | OK nonaktif bila target kosong atau predictor efektif dan Text Features sama-sama kosong. W-VEC, W-STR, dan W-LEAK hanya peringatan. |
| Text Preprocessing | Opsi String to Word Vector (aktif hanya bila Raw Text Variable terisi) | `STWV_DEFAULT_CONFIG` | `validateStwvConfig` |
| Options | Numeric: Gaussian (satu-satunya pilihan di UI) | Gaussian | — |
| Options | Categorical: Smoothing Alpha | 1 | `> 0` dan `≤ 999` ("Smoothing Alpha must be greater than 0.", "Smoothing Alpha must not exceed 999.") |
| Options | Text: Multinomial / Bernoulli / Complement, Text Alpha (smoothing) | Multinomial, 1 | Text Alpha `> 0` dan `≤ 999` (hanya bila Text Features terisi). Complement hanya sah bila model berisi Text Features saja. |
| Validation | Training and Holdout Partition (Training % 1–99) atau Cross-Validation Folds | holdout 70% | Folds bilangan bulat **minimal 2** ("The number of folds must be at least 2."). Folds > jumlah kasus: analisis ditolak Rust. Folds > kelas terkecil: analisis tetap jalan dengan peringatan. |
| Validation | Random seed (opsional) | kosong | bilangan bulat 0–4294967295 |
| Output | Empat tabel v1, Text Feature Table, Top-k terms per class | semua tercentang, k = 100 | Top-k bilangan bulat 1–1000 (hanya bila Text Features terisi dan Text Feature Table dicentang) |

**Nilai tidak sah menahan analisis (UC-03 alur alternatif 4a).** Nilai Smoothing Alpha, Text Alpha, Folds, dan Top-k
yang tidak sah tetap disimpan di form (tidak dibuang diam-diam). Pesan galat tampil di bawah kolom, perpindahan ke tab
lain ditahan dengan toast, dan tombol OK menampilkan toast galat tanpa menjalankan analisis.

**Kolom Word-Vector bernilai negatif (UC-03 alur 6a).** Rust menolak analisis dengan kode `NB_E_TEXT_NEGATIVE` yang
menyebut nama kolom pertama dan jumlah kolom bermasalah; UI menerjemahkannya menjadi pesan berbahasa Inggris dengan kode di
akhir kalimat. Kode lain: `NB_E_TEXT_EMPTY_VOCAB_FOLD`, `NB_E_TEXT_EMPTY_VOCAB`, `NB_E_COMPLEMENT_MIXED`,
`NB_E_TEXT_CONFIG`, `NB_E_TEXT_SHAPE`, `NB_E_TEXT_RAW_MISSING`.

**File model (Export Model).** Nama default `Naive_Bayes_Model_Export.json`. Schema `"1.1"` dipakai bila model tanpa
Text Features (sama persis dengan v1); selain itu schema `"2.0"` dengan blok `text` (sumber, likelihood, alpha, terms,
log weights, jumlah per kelas, dan resep preprocessing untuk jalur Raw Text). Apply Model menerima schema `1.0`, `1.1`,
dan `2.0`, file berekstensi `.json` maksimal 10 MB. Rinciannya ada di `AGENTS.md`.

## Build WASM dan menjalankan tes

Perintah dijalankan dari akar repo kecuali disebut lain.

**Build WASM (lewat WSL Ubuntu).** Windows di perangkat skripsi memakai Smart App Control, sehingga build Rust/WASM di
Windows dapat diblokir. Build dilakukan di WSL Ubuntu dengan `source $HOME/.cargo/env` dan `CARGO_TARGET_DIR` di
`$HOME`, lalu salin empat berkas hasil ke worker:

```bash
# di dalam WSL, dari folder crate naive-bayes/rust
source $HOME/.cargo/env
export CARGO_TARGET_DIR=$HOME/cargo-target/naive-bayes
wasm-pack build --target web --release
cp pkg/wasm.js pkg/wasm_bg.wasm pkg/wasm.d.ts pkg/wasm_bg.wasm.d.ts <repo>/frontend/public/workers/Classify/NaiveBayes/pkg/
```

Setelah menyalin, naikkan versi cache-busting di tiga tempat dengan nilai yang sama: `NAIVE_BAYES_WASM_VERSION`
(`services/naive-bayes-analysis.ts`) serta dua URL `?v=` di `naive-bayes.worker.js`. Jangan menyalin `pkg/.gitignore`
atau `pkg/package.json`. Skrip build WSL tidak disimpan di repo.

**Tes Rust** (bisa di Windows; bila Application Control memblokir biner tes, set `CARGO_PROFILE_TEST_DEBUG=0`):

```powershell
cd frontend\components\Modals\Analyze\Classify\naive-bayes\rust
$env:TA_EVAL_REQUIRE_DATA = "1"   # agar tes bb22/bb23 gagal, bukan dilewati, bila pilkada_train.csv tidak ditemukan
cargo test
```

**Tes Jest** (wajib dari folder `frontend`, karena `jest.config.ts` di akar repo usang):

```powershell
cd frontend
npx jest components/Modals/Analyze/Classify/naive-bayes
```

Perintah ini menjalankan tes lama dan tes evaluasi (`__tests__/eval`) sekaligus.

## Hasil pengujian final

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

Rincian Naive Bayes:

- Rust: 242 tes (203 lama + 39 evaluasi). Jest: 388 tes (241 lama + 147 evaluasi).
- Black-box (track C2): Jest 64/64, Rust 24/24.
- White-box: `getNumericInputError` 29/29 jalur, `useNaiveBayesValidation` 12/12 jalur layak (1 jalur infeasible).
- Pada dataset Pilkada (270 baris uji), prediksi Statify sama dengan scikit-learn 270/270 untuk konfigurasi K1–K5.
  Angka akurasi lengkap (termasuk WEKA) ada di laporan final.

## Paket evaluasi `text_analytics_eval/`

Folder ini berisi seluruh bahan pengujian skripsi untuk String to Word Vector, Naive Bayes, Apply Model, dan core library.

- **Isi.** Track A (unit), B (white-box), C1–C3 (black-box per menu), D (akurasi terhadap scikit-learn dan WEKA), E
  (waktu eksekusi), dan F (integrasi antarmenu). Masing-masing punya skrip `run_<track>.ps1` dan dokumen hasil
  (`A_unit.md`, `B_whitebox.md`, `C_blackbox_C*.md`, `D_accuracy.md`, `E_performance.md`, `F_integration.md`). Subfolder:
  `accuracy/` (pembanding scikit-learn), `blackbox/`, `headless/` (pustaka Node yang memanggil WASM yang sama),
  `integration/`, `perf/` (harness peramban dan headless), `weka/`, `tools/`, `logs/`.
- **Uji ulang penuh.** Dari akar repo:
  `powershell -ExecutionPolicy Bypass -File frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\run_all.ps1`.
  Opsi `-SkipBaseline`, `-SkipTracks`, `-SkipE`, `-SkipRust`, dan `-Only A,B,...`. Untuk performa saja:
  `run_all.ps1 -SkipBaseline -Only E` (tutup aplikasi lain dan colokkan daya). Skrip menulis log ke `logs/` dan
  memperbarui tabel dokumen track serta `REPORT.md` lewat `tools/`.
- **Data uji.** Semua dataset ada di `text_analytics_eval/accuracy/datasets/` (Pilkada latih/uji, SMS Spam, SmSA,
  20 Newsgroups untuk beban performa). `MANIFEST.md` di folder itu mencatat sumber, lisensi, jumlah baris, sebaran kelas,
  dan sha256 setiap berkas.
- **Laporan final.** `LAPORAN_UJI_ULANG_22Okt.md` adalah laporan final dan menggantikan angka di laporan sebelumnya
  (`LAPORAN_PEMBERSIHAN_TES_21Okt.md`, `REPORT.md`, `HANDOFF_PENULISAN_SKRIPSI.md`). Bila ada angka yang berbeda, ikuti
  laporan final.
- **Dokumen Markdown tetap di tempatnya.** Berbeda dengan dokumen menu yang dikumpulkan ke `docs/`, MD di
  `text_analytics_eval/` (dokumen track, `REPORT.md`, `BUGS*.md`, `templates/`, `report/`, laporan uji ulang) tidak
  dipindah karena skrip `run_*.ps1` dan `tools/` (mis. `apply_results.py`, `merge_docs.py`) menulis ke path berkas itu,
  dan `REPORT.md` serta `HANDOFF_PENULISAN_SKRIPSI.md` merujuk path relatifnya.

## Dokumen lain

| Dokumen | Status |
|---|---|
| `AGENTS.md` | Aturan untuk agen AI yang mengubah kode folder ini. |
| `docs/AGENTS_V2.md` | Kontrak v2 (rumus likelihood §6, schema 2.0 §8, kode galat §11); masih menjadi acuan rumus, schema, dan kode galat, dan dirujuk komentar kode. Bila berbeda dengan kode, kode yang berlaku. |
| `../apply-model/AGENTS.md` | Kontrak pembaca file model. |
| `docs/PLAN_V2.md` | Rencana Tahap 2 (Naive Bayes v2 dan Apply Model v2). Historis; dipertahankan karena dirujuk komentar kode. |
| `docs/PLAN_V3_UI_EN.md` | Rencana alih bahasa UI ke bahasa Inggris (v3). Historis; dipertahankan karena dirujuk komentar kode dan `text_analytics_eval/C_blackbox_C3.md`. |

`DOKUMENTASI.md`, `README_V2.md`, `PLAN.md`, `plan-reports-v2/`, dan `plan-reports-v3/` lama sudah dihapus; riwayatnya ada
di git.
