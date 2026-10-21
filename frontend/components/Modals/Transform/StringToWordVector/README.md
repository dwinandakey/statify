# String to Word Vector (STWV)

Menu **Transform → String to Word Vector** mengubah satu variabel teks pada dataset aktif Statify menjadi kolom numerik vektor kata (bag-of-words dengan term weighting TF, IDF, dan normalization). Semua komputasi berjalan di browser dengan pola Client-Side Rendering (CSR): antarmuka React di main thread, komputasi Rust yang dikompilasi ke WebAssembly di dalam Web Worker.

Dokumen ini untuk pengembang manusia. Aturan ringkas bagi agen AI ada di `AGENTS.md` (folder yang sama).

## 1. Posisi dalam Modul Text Analytics

Modul Text Analytics terdiri atas tiga menu dan satu core library Rust bersama:

```
String to Word Vector  ──(kolom vektor kata, mis. VEC_makan)──►  Naive Bayes (path Word-Vector)
   Transform menu                                                Analyze → Classify
                                                                      │ Export Model (JSON)
                                                                      ▼
                                                                 Apply Model
                                                                 Analyze → Classify

        Ketiganya memakai crate yang sama: frontend/public/workers/TextAnalytics/statify-text-core
```

- STWV menulis kolom vektor ke dataset. Kolom ini dapat dipakai Naive Bayes lewat kotak **Word-Vector Variables**, lalu Apply Model memetakan kolom tersebut berdasarkan nama.
- Naive Bayes juga punya path **Raw Text** yang memakai panel opsi yang sama (`OptionsTab.tsx` dan `config.ts` dari folder ini) tanpa melewati STWV. Pada path tersebut preprocessing recipe dibangun dari training data dan ikut diekspor ke model.
- STWV sendiri **tidak menyimpan recipe**. Vocabulary, IDF, dan rata-rata norma dihitung dari seluruh baris dataset pada saat itu.

Fitur buku yang dicakup menu ini: TA-F02 sampai TA-F12 (F14 sampai F19), use case UC-01. Rumus dan preprocessing (F01 sampai F12) diimplementasikan di core library.

## 2. Struktur direktori

```
StringToWordVector/
├── StringToWordVectorModal.tsx   Panel (sidebar) dengan tab Variables/Options, tombol OK/Reset/Cancel, tur bantuan
├── VariablesTab.tsx              Daftar variabel teks dan kotak "Target Variable"
├── OptionsTab.tsx                Seluruh opsi; juga dipakai ulang tab Text Preprocessing Naive Bayes
├── config.ts                     StwvConfig, STWV_DEFAULT_CONFIG, validateStwvConfig, toRustConfig, getVectorDecimals
├── types.ts                      VectorizerConfigPayload, VectorizerOutput, AppError (satu-satunya definisi)
├── stringToWord.processor.ts     Web Worker: init WASM sekali, process_text_data, kirim Float64Array (transfer)
├── constants/
│   ├── vectorization-options.ts  Opsi TF/IDF/Normalization (label, rumus, LaTeX), engineFormulaMode, ranksByWordCount
│   └── stopwords.ts              Daftar stopword bawaan Indonesia dan Inggris
├── hooks/
│   ├── useStringToWordVector.ts  State dan orkestrasi: validasi → data → Worker → kolom dataset → Output Viewer
│   └── tourConfig.ts             Langkah tur bantuan (ID/EN) dan id elemen
├── utils/
│   ├── buildDocuments.ts         Sel kolom → dokumen teks (null → "", baris tidak dibuang)
│   ├── packedMatrix.ts           packMatrix (Worker) dan unpackMatrix bertahap (main thread)
│   ├── buildColumnData.ts        Matriks → daftar kolom (nama awalan + term)
│   ├── columnPrefix.ts           DEFAULT_COLUMN_PREFIX "VEC_", validasi awalan (maks. 32 karakter)
│   ├── resolveVariable.ts        Mencari ulang variabel terpilih (id → tempId → name)
│   ├── normalizeWorkerError.ts   Galat apa pun → { code, message }
│   ├── formatStwvError.ts        { code, message } → "Pesan. (KODE)"
│   ├── buildStwvOutput.ts        Tabel Processing Summary, Settings, Vocabulary (maks. 200 baris)
│   ├── describeStwvOutput.ts     Interpretasi otomatis (HTML, deterministik) per tabel
│   └── writeStwvOutput.ts        Menulis log/analytic/statistic ke Output Viewer (useResultStore)
├── rust/                         Crate statify-string-to-word: pembungkus wasm-bindgen tipis atas core library
│   ├── Cargo.toml
│   └── src/lib.rs                process_text_data(js_data, js_config)
├── wasm-output/                  Hasil wasm-pack yang di-commit (dipakai langsung oleh Worker)
├── __tests__/                    Tes Jest unit (lama) dan __tests__/eval (paket evaluasi skripsi)
│   └── eval/                     Black-box (C1), white-box validateColumnPrefix, rumus, stopword
└── docs/                         Dokumen riwayat pengembangan (lihat bagian 10)
```

## 3. Alur data

```
UI (StringToWordVectorModal → VariablesTab / OptionsTab)
  │ OK
  ▼
hooks/useStringToWordVector.runAndAddToDataset
  1. validateStwvConfig + validateColumnPrefix        (gagal → pesan, Worker tidak dipanggil)
  2. resolveVariable, checkAndSave, getVariableData   (data dibaca dari IndexedDB)
  3. buildDocuments; semua kosong → EMPTY_DATA
  4. postMessage({ data, config: toRustConfig(config) })
  ▼
Web Worker  stringToWord.processor.ts
  init() WASM sekali → process_text_data → packMatrix → postMessage(..., { transfer: [buffer] })
  ▼
WASM  rust/src/lib.rs  →  statify_text_core::fit_transform → output_from_model (dense)
  ▼
main thread: unpackMatrix (potongan ≤ 20 ms, jeda setTimeout 0) → number[][]
  ▼
buildColumnData → useDataStore.addVariableColumns → useVariableStore.registerVariableMetadata → loadVariables
  ▼
buildStwvOutput + writeStwvOutput → Output Viewer (Processing Summary, Settings, Vocabulary)
```

Catatan alur:

- **Pengiriman matriks.** Worker tidak mengirim `number[][]`. Matriks diratakan menjadi satu `Float64Array` row-major (`{ rows, cols, data }`) dan buffernya di-transfer tanpa salin. Main thread menyusun ulang `number[][]` baris demi baris dan memberi jeda ke event loop setiap lewat 20 ms (`SLICE_BUDGET_MS`). Nilai float64 disalin apa adanya sehingga hasilnya identik. Perubahan ini menghilangkan long task saat hasil diterima (lihat bagian 8). Hook tetap menerima bentuk lama `{ matrix }` dari Worker.
- **Baris tetap sejajar.** Sel `null`/kosong/hanya spasi menjadi dokumen `""` dan menghasilkan vektor nol. Satu dokumen input selalu menjadi satu baris output.
- **Penyimpanan.** Kolom baru masuk ke dataset aktif melalui `useDataStore` (Dexie/IndexedDB), metadata melalui `useVariableStore`, ringkasan melalui `useResultStore`. Pengaturan panel STWV **tidak** disimpan: setiap kali panel dibuka, opsi kembali ke `STWV_DEFAULT_CONFIG`. Yang disimpan ke IndexedDB adalah pengaturan Naive Bayes (kunci `"NaiveBayes"`, termasuk field `text: StwvConfig` dari tab Text Preprocessing yang digabung dengan default lewat `mergeWithDefaults`) dan Apply Model (kunci `"ApplyModel"`).

## 4. Opsi dan validasi

| Opsi (tab Options) | Default | Nilai sah / validasi |
|---|---|---|
| Vector Column Name | `VEC_` | Tidak kosong, tanpa spasi, maks. 32 karakter, diawali huruf/@/#/$, lalu huruf, angka, `.`, `_`, @, #, $ |
| Lowercase | aktif | Tidak berlaku saat stemming aktif (stemmer selalu menghasilkan huruf kecil) |
| Stopwords Removal | None | None, Indonesian, English, Custom (satu kata per baris). Mengetik di kotak teks otomatis memilih Custom |
| Stemming | None | None, Indonesian (Sastrawi), English (Snowball/Porter2) |
| Tokenizer | Word | Word (unigram) atau N-gram dengan min/max 1–5 dan min ≤ max |
| Delimiters | `[\s.,;:'"()?!]+` | Regular expression, tidak boleh kosong; regex tidak sah ditolak Rust (`INVALID_REGEX`) |
| Term Frequency (TF) | Raw count | binary, raw, log1p, sublinear, normalized |
| Inverse Document Frequency (IDF) | None | none, standard, smooth, plus1 |
| Normalization | None | none, l2, l1, doc_length |
| Words to Keep | 1000 | Bilangan bulat ≥ 0; 0 = simpan semua kata |
| Min term frequency | 1 | Bilangan bulat ≥ 1 |

Bila ada opsi tidak sah, panel menampilkan "Some options are invalid:" beserta pesannya dan tombol OK nonaktif (UC-01 alur alternatif 5a). Validasi yang sama diulang di hook dan di Rust.

TF, IDF, dan Normalization dapat dikombinasikan bebas (pilihan "Formula standard" sudah dihapus pada revisi pasca-sidang). Field `formula_standard` tetap dikirim ke Rust sebagai nilai internal yang diturunkan `engineFormulaMode`: kombinasi dalam kelompok setara WEKA (`binary|raw|log1p` × `none|standard` × `none|doc_length`) menjadi `weka`, kelompok setara scikit-learn (`binary|raw|sublinear` × `none|smooth|plus1` × `none|l2|l1`) menjadi `sklearn`, sisanya `custom`.

### Rumus

Notasi: `f` = kemunculan term dalam dokumen, `|d|` = jumlah token dokumen setelah preprocessing, `N` = jumlah dokumen, `df` = jumlah dokumen yang memuat term.

| Komponen | Nilai | Rumus |
|---|---|---|
| TF | binary | 1 bila f > 0, selain itu 0 |
| TF | raw | f |
| TF | log1p | ln(1 + f) |
| TF | sublinear | 1 + ln(f) bila f > 0, selain itu 0 |
| TF | normalized | f / \|d\| |
| IDF | none | 1 |
| IDF | standard | ln(N / df) |
| IDF | smooth | ln((1 + N) / (1 + df)) + 1 |
| IDF | plus1 | ln(N / df) + 1 |
| Normalization | l2 | v / ‖v‖₂ |
| Normalization | l1 | v / Σ\|v\| |
| Normalization | doc_length | v · (rata-rata ‖v‖₂) / ‖v‖₂ |

Urutan nilai sel: TF, dikalikan IDF, lalu dinormalisasi. Baris bernorma nol tetap nol.

### Pemilihan vocabulary

1. Hitung total kemunculan dan df setiap term dalam satu lintasan.
2. Buang term dengan total kemunculan < Min term frequency.
3. Bila Words to Keep > 0, ambil term teratas: mode `weka`/`sklearn` merangking dengan total kemunculan, mode `custom` dengan jumlah TF × IDF; nilai seri diurutkan alfabetis. Pemotongan bersifat ketat (berbeda dengan WEKA yang menyimpan semua term seri di batas).
4. Vocabulary akhir diurutkan alfabetis dan menjadi urutan kolom.
5. Vocabulary kosong → `EMPTY_VOCABULARY`.

## 5. Keluaran

**Kolom dataset** (satu per term, ditambahkan di akhir dataset):

- Nama dasar = awalan + term (mis. `VEC_makan`), lalu dibuat unik dan sah oleh `processVariableName`. Nama akhir bisa berbeda dari awalan + term (contoh di integration testing IT-01: term `&` menghasilkan kolom `VEC`). Bila penamaan gagal, nama cadangan `<awalan>VAR_<indeks>`.
- Tipe `NUMERIC`, measure `scale`, role `input`, label `Vector of "<term>"`.
- Desimal 0 bila nilainya pasti bulat (TF binary/raw, IDF none, normalization none), selain itu 4. Nilai tersimpan utuh; hanya tampilan yang dibulatkan.
- Nilai selalu ≥ 0, sesuai syarat Naive Bayes Multinomial/Bernoulli/Complement.

**Output Viewer**: satu log (`STRING TO WORD VECTOR <variabel> /PREFIX=<awalan>`), ringkasan teks, lalu tabel Processing Summary, Settings, dan Vocabulary (maks. 200 baris pertama; kolom dataset tetap lengkap), masing-masing dengan interpretasi otomatis.

**Kode error** ditampilkan sebagai `Pesan. (KODE)`:

| Asal | Kode |
|---|---|
| Rust (core library) | `EMPTY_INPUT`, `EMPTY_VOCABULARY`, `INVALID_CONFIG`, `INVALID_DATA`, `INVALID_REGEX`, `INVALID_STOPWORDS`, `SERIALIZE_ERROR` |
| TypeScript (hook/Worker) | `INVALID_CONFIG`, `INVALID_COLUMN_NAME`, `VARIABLE_NOT_FOUND`, `EMPTY_DATA`, `SAVE_FAILED`, `INTERNAL_ERROR`, `WORKER_ERROR`, `WASM_ERROR` (default `normalizeWorkerError`) |

Bila error terjadi sebelum kolom ditambahkan, dataset tidak berubah (UC-01 alur alternatif 7a). Kegagalan menulis Output Viewer tidak membatalkan kolom yang sudah ditambahkan (muncul toast warning).

## 6. Build WASM

`wasm-output/` di-commit dan diimpor langsung oleh Worker, jadi build hanya perlu bila `rust/` atau core library berubah. Skrip `build-wasm.sh` yang disebut dokumen lama sudah tidak ada di repo.

Di laptop pengembang, Smart App Control dapat memblokir build Rust/WASM di Windows (jangan dimatikan), dan crate STWV hanya dapat dibangun di WSL Ubuntu. Tulis skrip `.sh` dulu (kutipan PowerShell → bash rumit), misalnya:

```bash
#!/usr/bin/env bash
set -e
source "$HOME/.cargo/env"
export CARGO_TARGET_DIR="$HOME/cargo-target/stwv"
cd /mnt/c/Data/KULIAH/Skripsi/statify64/frontend/components/Modals/Transform/StringToWordVector/rust
wasm-pack build --target web --out-dir ../wasm-output --release
```

Jalankan dari PowerShell, lalu kembalikan berkas yang ditimpa wasm-pack:

```powershell
wsl -d Ubuntu -e bash /mnt/c/path/ke/build_stwv.sh
cd C:\Data\KULIAH\Skripsi\statify64\frontend\components\Modals\Transform\StringToWordVector\wasm-output
git checkout -- .gitignore package.json
Remove-Item README.md
```

wasm-pack menulis `.gitignore` berisi `*` dan `package.json` baru; keduanya harus dikembalikan. Toolchain pengujian final: rustc 1.99.1, wasm-pack 0.15.0.

## 7. Menjalankan tes

Semua perintah Jest dijalankan dari folder `frontend` (memakai `frontend/jest.config.js`).

```powershell
cd C:\Data\KULIAH\Skripsi\statify64\frontend
npx jest components/Modals/Transform/StringToWordVector                      # semua tes STWV (16 suite)
npx jest components/Modals/Transform/StringToWordVector --testPathIgnorePatterns=__tests__/eval   # tes unit lama saja
npx jest components/Modals/Transform/StringToWordVector/__tests__/eval/blackbox.stwv --runInBand  # black-box C1
```

Tes Rust untuk rumus dan preprocessing ada di core library (crate STWV hanya pembungkus tanpa tes sendiri):

```powershell
cd C:\Data\KULIAH\Skripsi\statify64\frontend\public\workers\TextAnalytics\statify-text-core
$env:CARGO_PROFILE_TEST_DEBUG = "0"    # bila Application Control memblokir biner tes
cargo test
cargo test --test eval_blackbox_stwv   # bagian Rust black-box STWV
```

Uji ulang penuh modul: `frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\run_all.ps1` (hanya performa: `run_all.ps1 -SkipBaseline -Only E`; black-box STWV saja: `run_C1.ps1`). Paket evaluasi hanya berada di `naive-bayes/text_analytics_eval`, dan data ujinya di `text_analytics_eval/accuracy/datasets` (lihat `MANIFEST.md`).

## 8. Ringkasan hasil pengujian final

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

Rincian String to Word Vector:

- Jest: 171 tes dalam 16 suite (106 lama + 65 evaluasi).
- Black-box (track C1): Jest 35/35, Rust 31/31.
- White-box: `validateColumnPrefix` V(G) = 7, 7/7 jalur.
- Waktu String to Word Vector kini mencakup penyusunan ulang matriks di main thread (`unpackMatrix`), sehingga naik 16–40% dibanding buku v19, tetapi long task hilang.

## 9. Batasan yang diketahui

1. STWV tidak menyimpan recipe. Menjalankan ulang pada data baru menghasilkan vocabulary dan skala yang berbeda. Untuk prediksi data baru dengan recipe yang konsisten, gunakan path Raw Text di Naive Bayes lalu Apply Model.
2. Vocabulary dan IDF dihitung dari seluruh dataset sebelum validasi Naive Bayes, sehingga evaluasi pada path Word-Vector dapat sedikit optimis (Naive Bayes menampilkan warning).
3. Words to Keep memotong ketat; WEKA menyimpan semua term seri di batas (mis. 1.042 term pada Pilkada).
4. Stemming selalu menghasilkan huruf kecil.
5. Daftar stopword bawaan memuat kata negasi (`tidak`, `bukan`, `not`, `no`, dst.). Untuk analisis sentimen pertimbangkan None atau daftar Custom.
6. Output ke UI berupa matriks dense; dataset sangat besar berat di memori.
7. Tokenizer berbasis delimiter tidak menangani URL, mention, hashtag, atau kata ulang berangka (`seolah2`) secara khusus.

## 10. Rujukan

- `AGENTS.md` (folder ini): peta berkas, invarian, dan cara verifikasi untuk agen AI.
- `frontend/public/workers/TextAnalytics/statify-text-core/`: core library (Pipeline, `fit`/`transform`/`fit_transform`, `TextVectorizerModel`).
- `frontend/components/Modals/Analyze/Classify/naive-bayes/AGENTS.md` dan `docs/AGENTS_V2.md`: konsumen `OptionsTab`/`config.ts` dan path Word-Vector.
- `frontend/components/Modals/Analyze/Classify/apply-model/AGENTS.md`: pemetaan kolom vektor berdasarkan nama.
- `frontend/app/help/components/statistics-guide/text-analytics/string-to-word-vector/`: panduan Help.
- Dokumen riwayat di `docs/` (lihat bagian Dokumen lain).

### Dokumen lain

Dokumen riwayat Tahap 1 dikumpulkan di `docs/`. Statusnya historis: sebagian isinya usang (preset "Formula standard", label "English (Porter)", `build-wasm.sh`, path `frontend/rust-crates`, jumlah tes lama). Bila berbeda, README ini, `AGENTS.md`, dan kode yang berlaku.

| Berkas | Isi | Status |
|---|---|---|
| `docs/AUDIT_REPORT.md` | Audit STWV sebelum Tahap 1 (3 Oktober 2026). | Historis |
| `docs/PLAN_FIX.md` | Rencana perbaikan Tahap 1; §3 memuat kontrak config, fit/vocabulary, API, dan korpus acuan yang dirujuk `statify-text-core`. | Historis; §3 masih dirujuk sebagai latar kontrak |
| `docs/plan-reports/` | Laporan fase S1–S9 dan `CATATAN_TAHAP2_float_roundtrip.md` (sudah diterapkan). | Historis |

`DOKUMENTASI.md` dan `Rust_Implementation_Plan.md` lama sudah dihapus; riwayatnya ada di git.
