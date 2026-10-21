# AGENTS.md — String to Word Vector (STWV)

Panduan untuk agen AI yang mengubah kode di `frontend/components/Modals/Transform/StringToWordVector/`. Penjelasan lengkap untuk manusia ada di `README.md`. Dokumen riwayat Tahap 1 ada di `docs/` (`PLAN_FIX.md`, `AUDIT_REPORT.md`, `plan-reports/`; historis). Bila berbeda dengan kode, ikuti kode.

## 1. Aturan proyek

- Jangan `git commit`, `git push`, `git add`, `git stash`, atau `git checkout` sendiri. Siapkan perubahan, lalu berikan perintah PowerShell (baris per baris) dan draf pesan commit untuk direview Lewis. Branch kerja `dija-v2`, identitas commit "Dija".
- Jangan deploy.
- Paket evaluasi hanya di `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/` (bukan `testing/`). Data uji di `text_analytics_eval/accuracy/datasets/` (lihat `MANIFEST.md`). Jangan merujuk folder "Claude outputs".
- Angka pengujian di dokumen harus sama dengan `text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md`: Rust 564 (core 155 / Naive Bayes 242 / Apply Model 167), Jest 1.250 dalam 80 suite (String to Word Vector 171 / Naive Bayes 388 / Apply Model 691), cakupan baris Jest 72,18% / 94,43% / 97,80%, white-box 54 jalur. Bila jumlah tes berubah, laporkan angka barunya.
- Penulisan: "WEKA", "Snowball/Porter2", "Client-Side Rendering (CSR)" pada penyebutan pertama, nama menu String to Word Vector, Naive Bayes, Apply Model. Teks UI berbahasa Inggris.

## 2. Peta berkas

| Path | Isi kunci |
|---|---|
| `StringToWordVectorModal.tsx` | `handleOk` (validasi → `runAndAddToDataset` → tutup), `handleReset`, tur bantuan, tampilan error via `formatStwvError` |
| `VariablesTab.tsx` | Daftar variabel (`type === "STRING"` atau `measure === "nominal"`) dan kotak "Target Variable" |
| `OptionsTab.tsx` | Panel opsi; prop `columnPrefix` opsional (Naive Bayes memakainya tanpa prop itu); label stemming `English (Snowball/Porter2)` |
| `config.ts` | `StwvConfig`, `STWV_DEFAULT_CONFIG`, `validateStwvConfig`, `toRustConfig`, `getVectorDecimals` |
| `types.ts` | `VectorizerConfigPayload`, `VectorizerOutput`, `AppError` (satu-satunya definisi) |
| `constants/vectorization-options.ts` | `TF_OPTIONS`/`IDF_OPTIONS`/`NORM_OPTIONS`, `engineFormulaMode`, `ranksByWordCount`, `isOptionAllowed` |
| `constants/stopwords.ts` | `INDONESIAN_STOPWORDS`, `ENGLISH_STOPWORDS` |
| `hooks/useStringToWordVector.ts` | `runWorker` (Worker lazy, `unpackMatrix`), `addVectorColumns`, `runAndAddToDataset`, `reset` |
| `hooks/tourConfig.ts` | `STWV_TOUR_IDS`, `getStwvTourSteps(lang)` |
| `stringToWord.processor.ts` | Worker: `initWasm` sekali, `process_text_data`, `packMatrix`, `postMessage(..., { transfer: [packedMatrix.data.buffer] })` |
| `utils/packedMatrix.ts` | `PackedMatrix {rows, cols, data: Float64Array}`, `packMatrix`, `unpackMatrix` (`SLICE_BUDGET_MS = 20`) |
| `utils/buildDocuments.ts` | `buildDocuments`, `areAllDocumentsEmpty`, `EMPTY_DATA_ERROR` |
| `utils/buildColumnData.ts` | `buildColumnData(result, resolveName, prefix)` |
| `utils/columnPrefix.ts` | `DEFAULT_COLUMN_PREFIX = "VEC_"`, `MAX_COLUMN_PREFIX_LENGTH = 32`, `validateColumnPrefix` |
| `utils/normalizeWorkerError.ts` / `utils/formatStwvError.ts` | Normalisasi galat ke `{code, message}`; format tampilan `Pesan. (KODE)` |
| `utils/buildStwvOutput.ts` / `describeStwvOutput.ts` / `writeStwvOutput.ts` | Tabel Output Viewer (`MAX_VOCABULARY_ROWS = 200`), interpretasi HTML, penulisan ke `useResultStore` |
| `utils/resolveVariable.ts` | Re-resolve variabel (id → tempId → name) |
| `rust/src/lib.rs` | `process_text_data` → `statify_text_core::fit_transform` → `output_from_model` (dense) |
| `wasm-output/` | Hasil wasm-pack yang di-commit (`statify_string_to_word*.js/.wasm/.d.ts`) |

Logika preprocessing dan rumus ada di `frontend/public/workers/TextAnalytics/statify-text-core/src/` (`config.rs`, `validator.rs`, `pipeline.rs`, `vectorizer.rs`, `model.rs`). Perubahan rumus dilakukan di sana, bukan di folder ini, dan berdampak ke Naive Bayes dan Apply Model.

## 3. Invarian (jangan dilanggar)

### 3.1 Kontrak Worker ↔ main thread

- Permintaan: `{ data: string[], config: VectorizerConfigPayload }`.
- Sukses: `{ status: "success", payload: { vocabulary, stats, packedMatrix } }`. `packedMatrix.data` adalah `Float64Array` row-major dengan panjang `rows × cols`, `cols = vocabulary.length`, dan buffernya ada di daftar transfer. Jangan kembali mengirim `number[][]` dari Worker (long task kembali muncul).
- Error: `{ status: "error", payload: { code, message } }`, selalu lewat `normalizeWorkerError`.
- Hook wajib tetap menerima bentuk lama `payload.matrix` bila `packedMatrix` tidak ada. FakeWorker di `__tests__/eval/blackbox.stwv.modal.test.tsx` membalas dengan `matrix`.
- `unpackMatrix` harus menyalin float64 apa adanya (tanpa pembulatan) dan tetap bertahap (yield `setTimeout(0)` setelah lewat 20 ms). Baris pendek diisi 0 oleh `packMatrix`.
- `buffer` milik Worker menjadi kosong setelah transfer; jangan memakai `packedMatrix` lagi di Worker setelah `postMessage`.

### 3.2 Kontrak kolom Word-Vector (dikonsumsi Naive Bayes dan Apply Model)

- Satu kolom per term, urutan = vocabulary alfabetis (byte-wise), ditambahkan di akhir dataset. `values[i] = matrix[i][j]`: baris kolom sejajar dengan baris dataset. Jangan membuang baris kosong (`buildDocuments` mengubah `null`/`undefined` menjadi `""`, Rust menghasilkan vektor nol).
- Metadata: `type: "NUMERIC"`, `measure: "scale"`, `role: "input"`, `label: 'Vector of "<term>"'`, `decimals` dari `getVectorDecimals` (0 atau 4), `width: 8`, `columns: 64`.
- Nama dasar `prefix + term`, disahkan oleh `processVariableName`; nama akhir bisa berbeda (IT-01: term `&` → kolom `VEC`). Nama cadangan `${prefix}VAR_${colIndex}`.
- Semua nilai ≥ 0. Naive Bayes menolak kolom teks bernilai negatif (`NB_E_TEXT_NEGATIVE`, `naive-bayes/rust/src/models/data.rs`) dan kotak Word-Vector hanya menerima `NUMERIC` (`naive-bayes/components/variables-tab.tsx`).
- Naive Bayes menyimpan **nama kolom** sebagai `text.terms` di model; Apply Model memetakan kolom model ke variabel dataset berdasarkan nama (cocok persis, lalu case-insensitive bila kandidatnya tunggal); kolom tak terpetakan dianggap 0 (`apply-model/services/apply-model-analysis.ts`). Mengubah skema nama kolom atau awalan default `VEC_` merusak model dan tes integrasi IT-01 (`apply-model/services/__tests__/eval/integration.it01.vector-nb.test.ts`, `naive-bayes/components/__tests__/eval/integration.it01.leakage-ui.test.tsx`).

### 3.3 Konfigurasi dan payload Rust

- `toRustConfig` mengirim snake_case sesuai `VectorizerConfigPayload`: `lowercase, stemming_method, stopwords_method, custom_stopwords (JSON string | null), delimiters, ngram_min, ngram_max, formula_standard, tf_method, idf_method, normalization, words_to_keep, min_term_freq`. Mode Word memaksa `ngram_min = ngram_max = 1`. `words_to_keep = 0` berarti semua kata (jangan dipaksa 1000).
- `formula_standard` internal, diturunkan `engineFormulaMode`; jangan dihapus karena file model lama menyimpannya dan Rust memakainya untuk validasi kombinasi serta cara merangking Words to Keep.
- Nilai enum: TF `binary|raw|log1p|sublinear|normalized`, IDF `none|standard|smooth|plus1`, Normalization `none|l1|l2|doc_length`, stemming `none|indonesian|english`, stopwords `none|indonesian|english|custom`. Rust masih menerima alias lama (TF `none`, `log`; IDF `idf`).
- `toRustConfig` dan `validateStwvConfig` juga dipakai Naive Bayes (path Raw Text, payload model, validasi tab Text Preprocessing) dan oleh tes integrasi Apply Model. Mengubah tanda tangan atau perilakunya berdampak ke dua menu tersebut.
- `StwvConfig` adalah bentuk yang disimpan Naive Bayes ke IndexedDB (kunci `"NaiveBayes"`, field `text`) dan digabung dengan default lewat `mergeWithDefaults` (`naive-bayes/constants/naive-bayes-default.ts`). Menambah field: beri default di `STWV_DEFAULT_CONFIG`; mengganti nama atau menghapus field: perbarui `mergeWithDefaults` agar data lama tetap terbaca. Panel STWV sendiri tidak menyimpan pengaturan ke IndexedDB.

### 3.4 Validasi dan error

- Pesan validasi (Inggris, persis; diuji black-box BB-13 dan tes unit):
  - `N-gram min and max sizes must be whole numbers between 1 and 5.`
  - `N-gram min size cannot be greater than max size.`
  - `Words to Keep must be a whole number of 0 or more (0 keeps all words).`
  - `Min term frequency must be a whole number of 1 or more.`
  - `Delimiters cannot be empty.`
  - Pesan `validateColumnPrefix` di `utils/columnPrefix.ts`.
- Opsi tidak sah → daftar pesan tampil, tombol OK nonaktif, Worker tidak dipanggil. Input angka Words to Keep/Min term frequency tidak dibulatkan diam-diam (`parseNumberInput`); n-gram di-clamp 1..5.
- `validateColumnPrefix` adalah objek white-box (V(G) = 7, 7 path, `__tests__/eval/whitebox.validateColumnPrefix.test.ts`). Mengubah cabangnya mengubah angka white-box di buku.
- Kode galat Rust: `EMPTY_INPUT, EMPTY_VOCABULARY, INVALID_CONFIG, INVALID_DATA, INVALID_REGEX, INVALID_STOPWORDS, SERIALIZE_ERROR`. Kode TS: `INVALID_CONFIG, INVALID_COLUMN_NAME, VARIABLE_NOT_FOUND, EMPTY_DATA, SAVE_FAILED, INTERNAL_ERROR, WORKER_ERROR, WASM_ERROR`. Tampilan: `formatStwvError` → `Pesan. (KODE)`.
- Galat sebelum `addVariableColumns` tidak boleh mengubah dataset. Galat Output Viewer setelah kolom ditambahkan hanya memunculkan toast warning.
- `checkAndSave()` wajib dipanggil sebelum `getVariableData` (edit sel tertunda) dan sebelum `addVariableColumns` (tanpa itu kolom baru tidak tersimpan).

### 3.5 Label

- Label stemming Inggris: `English (Snowball/Porter2)` di `OptionsTab.tsx`, `hooks/tourConfig.ts`, interpretasi `describeStwvOutput.ts`, dan panduan Help. Mesin memakai `rust_stemmers::Algorithm::English` (Snowball English/Porter2). Jangan kembali ke "English (Porter)". Tes black-box BB-08 memeriksa label ini.

## 4. Verifikasi perubahan

Dari `C:\Data\KULIAH\Skripsi\statify64\frontend`:

```powershell
npx jest components/Modals/Transform/StringToWordVector
npx jest components/Modals/Transform/StringToWordVector/__tests__/packedMatrix.test.ts
npx jest components/Modals/Transform/StringToWordVector/__tests__/eval/blackbox.stwv --runInBand
npx jest components/Modals/Analyze/Classify/naive-bayes components/Modals/Analyze/Classify/apply-model   # bila config.ts, OptionsTab, buildColumnData, atau columnPrefix berubah
```

Harapan: STWV 171 tes dalam 16 suite lulus (angka final laporan 22 Okt). Bila menambah tes, sebutkan angka barunya dan tandai bahwa laporan/buku perlu diperbarui.

Rust (rumus/preprocessing, di core library):

```powershell
cd C:\Data\KULIAH\Skripsi\statify64\frontend\public\workers\TextAnalytics\statify-text-core
$env:CARGO_PROFILE_TEST_DEBUG = "0"
cargo test
```

Core library: 155 tes. Uji ulang penuh: `text_analytics_eval\run_all.ps1`; performa saja `run_all.ps1 -SkipBaseline -Only E` (tutup aplikasi lain agar RAM bebas cukup).

## 5. Build WASM

- Smart App Control di laptop pengembang dapat memblokir build Rust/WASM di Windows; jangan mematikannya. Build WASM selalu di WSL Ubuntu: tulis skrip `.sh` dulu (kutip PowerShell ke bash rumit), jalankan `wsl -d Ubuntu -e bash <skrip>.sh`, dan di skrip `source $HOME/.cargo/env` serta set `CARGO_TARGET_DIR` di `$HOME`. Repo tidak menyimpan skrip build (`build-wasm.sh` sudah tidak ada).
- `cargo test` crate core, Naive Bayes, dan Apply Model bisa di Windows (`$env:CARGO_PROFILE_TEST_DEBUG = "0"` bila Application Control memblokir biner tes). Crate String to Word Vector hanya dapat dibangun di WSL.
- Build WASM dan `run_all.ps1` menulis berkas: jalankan hanya bila diminta Lewis dan tidak ada thread lain yang sedang menguji.
- Diperlukan bila `rust/` atau core library berubah; `wasm-output/` di-commit dan dipakai langsung Worker. Di skrip, dari folder `rust/`: `wasm-pack build --target web --out-dir ../wasm-output --release`.
- Sesudah build: `git checkout -- wasm-output/.gitignore wasm-output/package.json` dan hapus `wasm-output/README.md` buatan wasm-pack. Jangan meng-commit `.gitignore` berisi `*`.

## 6. Jebakan yang diketahui

- `hooks/useStringToWordVector.ts` dimuat di tes lewat `__tests__/eval/helpers/loadStwvHook.ts`, yang mengganti teks `import.meta.url` secara literal dan me-resolve impor relatif dari folder `hooks/`. Pertahankan `new URL("../stringToWord.processor.ts", import.meta.url)` apa adanya, dan pakai impor relatif (`../...`) atau alias `@/` yang sudah dimock di tes.
- Worker dibuat lazy dan dipakai ulang; `init()` WASM hanya sekali per Worker. Worker di-terminate saat komponen unmount.
- Baris Stemming di tabel Settings Output Viewer harus sama dengan label UI: "Indonesian (Sastrawi)" / "English (Snowball/Porter2)" (`utils/buildStwvOutput.ts` `describeStemming`, diuji di `__tests__/eval/formula-output.eval.test.ts`).
- Mengetik di kotak stopword otomatis mengganti metode menjadi Custom; isi kotak untuk Indonesian/English hanya tampilan daftar bawaan.
- `stats.empty_documents` dan `stats.formula_standard` opsional di tipe TS (build WASM lama tidak mengisinya). Jumlah dokumen bervektor nol di Output Viewer dihitung ulang dari matriks (`countZeroRows`).
- Output ke UI dense (`csr.to_dense()`); dataset besar (puluhan ribu dokumen × ribuan term) berat di memori. Waktu STWV yang dilaporkan sudah mencakup `unpackMatrix`.
- Words to Keep memotong ketat; perbedaan jumlah term dengan WEKA (term seri di batas) adalah perilaku yang disengaja dan terdokumentasi di buku.
- Stopword bawaan memuat kata negasi; ini keputusan pemilik, jangan diubah tanpa persetujuan.
