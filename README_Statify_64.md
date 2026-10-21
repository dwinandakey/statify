# Statify: Pengembangan Angkatan 64

Dokumen ini merangkum kontributor dan modul yang dikembangkan oleh mahasiswa **Politeknik Statistika STIS angkatan 64**. Gambaran umum aplikasi, cara menjalankan, dan struktur repositori ada di [README.md](README.md).

## Pengantar

Pada siklus pengembangan tahun ini, Tim Statify mengembangkan sebelas modul secara paralel, yaitu modul uji statistik parametrik dan nonparametrik lanjutan, analisis faktor, GLM multivariate dan repeated measures, time series, regresi logistik biner, regresi logistik ordinal, regresi logistik multinomial, analisis diskriminan, nearest neighbor, K-medoids, serta text analytics.

Seluruh modul dikembangkan di atas arsitektur yang sama: antarmuka React di browser, perhitungan statistik dengan **Rust yang dikompilasi ke WebAssembly** di dalam Web Worker, dan tampilan hasil bergaya SPSS. Modul-modul tersebut digabung ke satu aplikasi Statify yang dapat diakses di https://statify-dev.student.stis.ac.id/.

## Daftar Modul dan Kontributor

| No | Modul | Mahasiswa | Bagian |
|---|---|---|---|
| 1 | Uji statistik parametrik dan nonparametrik lanjutan | _(diisi)_ | _(diisi)_ |
| 2 | Analisis faktor | _(diisi)_ | _(diisi)_ |
| 3 | GLM multivariate dan repeated measures | _(diisi)_ | _(diisi)_ |
| 4 | Time series | _(diisi)_ | _(diisi)_ |
| 5 | Regresi logistik biner | Dwinanda Muhammad Keyzha (222212576) | [Regresi Logistik Biner](#regresi-logistik-biner) |
| 6 | Regresi logistik ordinal | _(diisi)_ | _(diisi)_ |
| 7 | Regresi logistik multinomial | Willy Sumbayak (222212916) | [Regresi Logistik Multinomial](#regresi-logistik-multinomial) |
| 8 | Analisis diskriminan | _(diisi)_ | _(diisi)_ |
| 9 | Nearest neighbor | _(diisi)_ | _(diisi)_ |
| 10 | K-medoids | _(diisi)_ | _(diisi)_ |
| 11 | Text analytics | Yedija Lewi Suryadi (222212921) | [Text Analytics](#text-analytics) |

### Cara menambahkan bagian modul

Salin kerangka berikut ke bagian bawah dokumen ini, ganti isinya, lalu isi tautan pada tabel di atas. Berkas panduan penggunaan disimpan di folder [1. Panduan Penggunaan](1.%20Panduan%20Penggunaan/).

```markdown
## Nama Modul

**Nama**             : ...
**NIM**              : ...
**Judul Skripsi**    : ...
**Dosen Pembimbing** : ...

### Deskripsi singkat
### Cara mengakses (menu dan tab)
### Fitur dan keluaran
### Struktur direktori
### Dokumentasi (rumus dan panduan penggunaan)
```

---

## Regresi Logistik Biner

**Nama**             : Dwinanda Muhammad Keyzha  
**NIM**              : 222212576  
**Judul Skripsi**    : PENGEMBANGAN STATIFY: APLIKASI ANALISIS STATISTIK MODUL REGRESI LOGISTIK BINER  
**Dosen Pembimbing** : Erna Nurmawati, S.S.T., M.T.  

### Deskripsi singkat

Modul ini menyediakan analisis regresi logistik untuk variabel dependen biner (dua kategori). Estimasi parameter memakai *iteratively reweighted least squares* (IRLS) yang dihitung dengan Rust/WebAssembly di browser, jadi data tidak dikirim ke server. Hasil dibandingkan dengan keluaran SPSS dan R pada ketelitian tiga desimal.

### Cara mengakses

Menu **Analyze > Regression > Binary Logistic...** membuka dialog dengan lima tab:

| Tab | Fungsi |
|---|---|
| Variables | Memilih variabel dependen, kovariat, dan metode seleksi |
| Categorical | Menentukan kovariat kategorik beserta kontras dan kategori referensinya |
| Save | Menyimpan hasil per kasus ke dataset |
| Options | Mengatur opsi keluaran dan kriteria estimasi |
| Assumption | Menjalankan uji asumsi |

### Fitur

- **Metode seleksi variabel**: Enter, Forward (Conditional, LR, Wald), dan Backward (Conditional, LR, Wald).
- **Variabel kategorik**: kontras dan kategori referensi dapat diatur per variabel.
- **Opsi**: selang kepercayaan untuk Exp(B), cut value klasifikasi, jumlah iterasi maksimum, probabilitas entry dan removal, konstanta, Hosmer-Lemeshow, classification plot, casewise listing, iteration history, correlations of estimates, serta tampilan pada setiap step atau step terakhir.
- **Save**: predicted probabilities, predicted group, residual (unstandardized, logit, studentized, standardized, deviance), dan ukuran pengaruh (Cook's distance, leverage, DfBeta).
- **Uji asumsi**: multikolinearitas (VIF/GVIF) dan linearitas logit (Box-Tidwell).
- **Log analisis**: setiap eksekusi mencatat sintaks bergaya SPSS.

### Keluaran

Tabel dan catatan kaki mengikuti format SPSS:

- Case Processing Summary, Dependent Variable Encoding, dan Categorical Variables Codings.
- **Block 0** (Beginning Block).
- **Block 1**: Omnibus Tests of Model Coefficients, Model Summary (-2 Log likelihood, Cox & Snell R Square, Nagelkerke R Square), Classification Table, Variables in the Equation, Variables not in the Equation, dan Step Summary untuk metode stepwise.
- Hosmer and Lemeshow Test, Iteration History, Correlation Matrix of Estimates, Classification Plot, serta Casewise List.
- Peringatan estimasi bila terdeteksi: separasi (lengkap atau kuasi) dan matriks Hessian yang hampir singular.
- Tabel uji asumsi (VIF/GVIF dan Box-Tidwell).

Setiap tabel disertai interpretasi singkat.

### Alur kerja

```
dialogs/BinaryLogisticMain.tsx            Mengumpulkan variabel dan opsi
        |
public/workers/Regression/binaryLogistic.worker.js
        |                                 Menghapus kasus tidak lengkap, mengodekan kovariat,
        |                                 lalu memanggil WASM
rust/ (crate statify-logistic)            IRLS, strategi seleksi, uji Wald/Score/LR,
        |                                 Hosmer-Lemeshow, uji asumsi
services/formatter*.ts                    Menyusun tabel gaya SPSS dan interpretasi
        |
IndexedDB -> halaman Result               Log, analytic, dan statistic disimpan lalu ditampilkan
```

### Struktur direktori

Lokasi kode: `frontend/components/Modals/Analyze/Regression/BinaryLogistic/`

```
BinaryLogistic/
├── dialogs/
│   ├── BinaryLogisticMain.tsx        # Dialog utama, orkestrasi worker, simpan hasil
│   ├── VariablesTab.tsx
│   ├── CategoricalTab.tsx
│   ├── SaveTab.tsx
│   ├── OptionsTab.tsx
│   └── AssumptionChecksTab.tsx
├── hooks/
│   └── tourConfig.ts                 # Konfigurasi tur fitur
├── services/
│   ├── formatter.ts                  # Entry point pemformat hasil
│   ├── formatter_block0.ts           # Tabel Block 0
│   ├── formatter_block1.ts           # Tabel Block 1 (Omnibus, Model Summary, dst.)
│   ├── formatter_hosmer.ts
│   ├── formatter_classification_plot.ts
│   ├── formatter_casewise.ts
│   ├── formatter_correlation_estimates.ts
│   ├── formatter_iteration_history.ts
│   ├── formatter_step_summary.ts
│   ├── formatter_assumptions.ts      # VIF/GVIF dan Box-Tidwell
│   ├── formatter_warnings.ts
│   ├── formatter_summary.ts
│   ├── formatter_utils.ts            # Format angka, p-value, dan teks interpretasi
│   └── syntaxGenerator.ts            # Log sintaks bergaya SPSS
├── types/
│   └── binary-logistic.ts            # Tipe opsi, hasil worker, dan section output
└── rust/                             # Crate Rust -> WebAssembly
    └── src/
        ├── lib.rs                    # Fungsi yang diekspor ke JavaScript
        ├── models/                   # config.rs, result.rs
        ├── stats/                    # irls, design_matrix, wald, score_test, hosmer_lemeshow,
        │                             # classification_plot, casewise, saved_predictions,
        │                             # correlation_of_estimates, assumptions, metrics, table
        ├── strategies/               # enter, forward_*, backward_*
        └── utils/                    # conversion, math, probability
```

File pendukung di luar folder modul:

| File | Fungsi |
|---|---|
| `frontend/public/workers/Regression/binaryLogistic.worker.js` | Web Worker yang menyiapkan data dan memanggil WASM |
| `frontend/public/workers/Regression/Binary/pkg/` | Paket WASM hasil build yang dibaca worker |
| `frontend/components/Modals/ModalRegistry.tsx` | Mendaftarkan dialog ke sistem modal |
| `frontend/app/help/components/statistics-guide/binary-logistic/` | Panduan penggunaan di halaman Help |

### Build ulang WASM

Lakukan hanya bila kode Rust berubah.

```bash
cd frontend/components/Modals/Analyze/Regression/BinaryLogistic/rust
cargo test                       # unit test
wasm-pack build --target web     # menulis ke rust/pkg
```

Setelah itu salin lima berkas dari `rust/pkg` ke `frontend/public/workers/Regression/Binary/pkg/`:

- `statify_logistic_bg.wasm`
- `statify_logistic.js`
- `statify_logistic.d.ts`
- `statify_logistic_bg.wasm.d.ts`
- `package.json`

Worker hanya membaca salinan ini, jadi bila langkah penyalinan terlewat, tampilan akan tetap memakai angka dari versi lama. Berkas `logistic_wasm*` di folder tujuan adalah sisa versi lama dan tidak dipakai worker.

### Pengujian

- **Unit test Rust** (`cargo test` di folder `rust/`): 27 test pada `stats/assumptions.rs`, `casewise.rs`, `classification_plot.rs`, `correlation_of_estimates.rs`, dan `saved_predictions.rs`.
- **Perbandingan dengan SPSS dan R**: hasil model, uji, dan diagnostik dibandingkan dengan keluaran SPSS dan R pada tiga desimal.

### Dokumentasi

- Panduan penggunaan modul: [Panduan Penggunaan Statify Regresi Logistik Biner](1.%20Panduan%20Penggunaan/Panduan%20Penggunaan%20Statify%20Regresi%20Logistik%20Biner.docx.pdf).
- Panduan penggunaan Statify (umum): [PANDUAN PENGGUNAAN STATIFY.pdf](1.%20Panduan%20Penggunaan/PANDUAN%20PENGGUNAAN%20STATIFY.pdf).
- Panduan di dalam aplikasi: halaman **Help**, bagian Binary Logistic Regression.
- Dokumentasi rumus: _(tautan menyusul)_

---

## Regresi Logistik Multinomial

**Nama**             : Willy Sumbayak  
**NIM**              : 222212916  
**Judul Skripsi**    : PENGEMBANGAN MODUL REGRESI LOGISTIK MULTINOMIAL PADA APLIKASI STATIFY  
**Dosen Pembimbing** : Dr. Achmad Syahrul Choir, S.S.T., M.Si.  

### Deskripsi singkat

Modul ini menyediakan analisis regresi logistik untuk variabel dependen nominal dengan lebih dari dua kategori (model *baseline-category logit*). Parameter diestimasi dengan metode *maximum likelihood* melalui Newton-Raphson dengan *step-halving*. Perhitungan berjalan dengan Rust/WebAssembly di browser, jadi data tidak dikirim ke server. Format keluaran mengikuti prosedur NOMREG pada SPSS.

### Cara mengakses

Menu **Analyze > Regression > Multinomial Logistic...** membuka dialog dengan lima tab:

| Tab | Fungsi |
|---|---|
| Variables | Memilih variabel dependen, faktor (*fixed*), dan kovariat |
| Statistics | Memilih statistik dan tabel yang ditampilkan |
| Criteria | Mengatur kriteria iterasi dan konvergensi |
| Options | Mengatur kategori referensi, skala dispersi, opsi stepwise, dan hierarki |
| Save | Menyimpan hasil per kasus ke dataset |

### Fitur

- **Kategori referensi**: kategori pertama, terakhir, atau kustom.
- **Criteria**: iterasi maksimum, konvergensi parameter, konvergensi log-likelihood, kriteria singularitas, dan delta untuk sel kosong.
- **Options**: skala dispersi (None, User defined, Pearson, Deviance), probabilitas dan uji entry/removal (Likelihood ratio atau Score), serta aturan hierarki.
- **Statistics**: Pseudo R-square, Step summary, Model fitting information, Information criteria, Cell probabilities, Classification table, Goodness-of-fit, Monotonicity measures, Estimates, Likelihood ratio tests, Asymptotic correlations, dan Asymptotic covariances.
- **Save**: estimated response probabilities, predicted category, predicted category probability, dan probabilitas kategori aktual.

### Keluaran

Tabel mengikuti format SPSS:

- Case Processing Summary.
- Model Fitting Information (-2 Log likelihood, Chi-square, AIC, BIC).
- Goodness-of-Fit (Pearson dan Deviance).
- Pseudo R-Square (Cox & Snell, Nagelkerke, McFadden).
- Likelihood Ratio Tests per efek.
- Parameter Estimates (B, Std. Error, Wald, df, Sig., Exp(B), dan selang kepercayaan) untuk setiap kategori non-referensi.
- Classification Table, Observed and Predicted Frequencies (cell probabilities), serta matriks korelasi dan kovarians asimtotik.

Setiap tabel disertai interpretasi singkat (`dialogs/interpretations.ts`).

### Alur kerja

```
dialogs/MultinomialLogisticMain.tsx       Mengumpulkan variabel dan opsi
        |
public/workers/Regression/multinomialLogistic.worker.js
        |                                 Menyiapkan data lalu memanggil WASM
wasm/ (crate statify-multinomial)         Design matrix, Newton-Raphson, log-likelihood,
        |                                 Wald, LR test, goodness-of-fit, klasifikasi
dialogs/interpretations.ts                Interpretasi tabel
        |
IndexedDB -> halaman Result               Log, analytic, dan statistic disimpan lalu ditampilkan
```

### Struktur direktori

Lokasi kode: `frontend/components/Modals/Analyze/Regression/MultinomialLogistic/`

```
MultinomialLogistic/
├── ALGORITMA_DAN_RUMUS.md            # Dokumentasi algoritma dan rumus
├── diagrams/                         # Diagram alur modul
├── dialogs/
│   ├── MultinomialLogisticMain.tsx   # Dialog utama, orkestrasi worker, simpan hasil
│   ├── VariablesTab.tsx
│   ├── StatisticsTab.tsx
│   ├── CriteriaTab.tsx
│   ├── OptionsTab.tsx
│   ├── SaveTab.tsx
│   └── interpretations.ts            # Teks interpretasi hasil
├── hooks/
│   └── tourConfig.ts                 # Konfigurasi tur fitur
└── wasm/                             # Crate Rust -> WebAssembly
    ├── multinomialLogistic.worker.ts
    └── src/
        ├── lib.rs                    # Fungsi yang diekspor ke JavaScript
        ├── models/                   # config.rs, result.rs
        └── stats/                    # core, estimation, newton_raphson, probabilities,
                                      # log_likelihood, likelihood_ratio, goodness_of_fit,
                                      # classification, cell_probabilities, format_results
```

File pendukung di luar folder modul:

| File | Fungsi |
|---|---|
| `frontend/public/workers/Regression/multinomialLogistic.worker.js` | Web Worker yang menyiapkan data dan memanggil WASM |
| `frontend/public/workers/Regression/Multinomial/pkg/` | Paket WASM hasil build yang dibaca worker |
| `frontend/components/Modals/ModalRegistry.tsx` | Mendaftarkan dialog ke sistem modal |
| `frontend/app/help/components/statistics-guide/multinomial-logistic/` | Panduan penggunaan di halaman Help |

### Build ulang WASM

Lakukan hanya bila kode Rust berubah.

```bash
cd frontend/components/Modals/Analyze/Regression/MultinomialLogistic/wasm
cargo test                       # unit test
wasm-pack build --target web     # menulis ke wasm/pkg
```

Setelah itu salin berkas `statify_multinomial*` dan `package.json` dari `wasm/pkg` ke `frontend/public/workers/Regression/Multinomial/pkg/`. Worker hanya membaca salinan ini.

### Pengujian

- **Unit test Rust** (`cargo test` di folder `wasm/`).
- **Perbandingan dengan SPSS**: estimasi parameter, uji model, dan goodness-of-fit dibandingkan dengan keluaran SPSS NOMREG.

### Dokumentasi

- Dokumentasi algoritma dan rumus: [ALGORITMA_DAN_RUMUS.md](frontend/components/Modals/Analyze/Regression/MultinomialLogistic/ALGORITMA_DAN_RUMUS.md).
- Panduan penggunaan Statify (umum): [PANDUAN PENGGUNAAN STATIFY.pdf](1.%20Panduan%20Penggunaan/PANDUAN%20PENGGUNAAN%20STATIFY.pdf).
- Panduan di dalam aplikasi: halaman **Help**, bagian Multinomial Logistic Regression.
- Panduan penggunaan modul: _(tautan menyusul)_

---

## Text Analytics

**Nama**             : Yedija Lewi Suryadi  
**NIM**              : 222212921  
**Judul Skripsi**    : PENGEMBANGAN MODUL TEXT ANALYTICS PADA APLIKASI STATISTIK STATIFY (Fitur Text Preprocessing dan Klasifikasi Naive Bayes)  
**Dosen Pembimbing** : Dr. Eng. Lya Hulliyyatus Suadaa, S.S.T., M.T.  

### Deskripsi singkat

Modul ini menyediakan klasifikasi teks melalui tiga menu yang saling terhubung. **String to Word Vector** melakukan text preprocessing dan term weighting. **Naive Bayes** melatih dan mengevaluasi model dengan likelihood Multinomial, Bernoulli, atau Complement untuk fitur teks, ditambah Gaussian untuk prediktor numerik dan Categorical untuk prediktor kategorik. **Apply Model** menerapkan trained model ke data baru. Ketiga menu memakai satu core library Rust bersama, `statify-text-core`, sehingga teks diproses dengan kode yang sama saat transformasi, pelatihan, dan penerapan model. Perhitungan berjalan dengan Rust/WebAssembly di Web Worker dengan pendekatan Client-Side Rendering (CSR), jadi data tidak dikirim ke server. Hasil dibandingkan dengan scikit-learn dan WEKA.

### Cara mengakses

Menu **Transform > String to Word Vector...** membuka panel dengan dua tab:

| Tab | Fungsi |
|---|---|
| Variables | Memilih satu variabel teks (STRING) sebagai Target Variable |
| Options | Mengatur preprocessing, term weighting, dan awalan nama kolom |

Menu **Analyze > Classify > Naive Bayes...** membuka panel dengan lima tab:

| Tab | Fungsi |
|---|---|
| Variables | Memilih target, prediktor, dan Text Features (Raw Text Variable atau Word-Vector Variables) |
| Text Preprocessing | Opsi yang sama dengan String to Word Vector; aktif hanya bila Raw Text Variable terisi |
| Options | Memilih likelihood teks dan nilai smoothing |
| Validation | Mengatur holdout atau k-fold cross-validation dan random seed |
| Output | Memilih tabel yang ditampilkan dan Top-k terms per class |

Menu **Analyze > Classify > Apply Model...** membuka panel dengan empat tab:

| Tab | Fungsi |
|---|---|
| Model | Memuat trained model; tab lain aktif setelah model dimuat |
| Variables | Memetakan fitur model ke variabel dataset dan memilih Actual target (opsional) |
| Save | Mengatur kolom hasil prediksi yang ditulis ke dataset |
| Output | Memilih tabel yang ditampilkan |

### Fitur

**String to Word Vector**

- **Preprocessing**: Lowercase, tokenizer Word atau N-gram (1–5) dengan delimiter regular expression, Stopwords Removal (None, Indonesian, English, Custom), dan Stemming (None, Indonesian (Sastrawi), English (Snowball/Porter2)).
- **Term weighting**: Term Frequency (binary, raw, log1p, sublinear, normalized), Inverse Document Frequency (none, standard, smooth, plus1), dan Normalization (none, L2, L1, doc_length). Ketiganya dapat dikombinasikan bebas.
- **Vocabulary**: Words to Keep (default 1.000; 0 = semua kata) dan Min term frequency.
- **Kolom vektor**: satu kolom numerik per term dengan awalan yang dapat diubah (default `VEC_`). Satu dokumen selalu menjadi satu baris; sel kosong menjadi vektor nol.

**Naive Bayes**

- **Text Features**: kolom vektor dari String to Word Vector (Word-Vector Variables) atau satu kolom teks mentah (Raw Text Variable) yang diproses di tab Text Preprocessing.
- **Model**: Gaussian (numerik), Categorical dengan Smoothing Alpha (kategorik), serta Multinomial, Bernoulli, atau Complement dengan Text Alpha (teks). Complement hanya untuk model yang berisi fitur teks saja.
- **Validasi**: stratified holdout (Training % 1–99, default 70%) atau stratified k-fold cross-validation (k ≥ 2), dengan random seed opsional (Mersenne Twister). Model final dilatih ulang pada seluruh baris valid.
- **Export Model**: model diunduh sebagai file JSON (default `Naive_Bayes_Model_Export.json`). Jalur Raw Text ikut menyimpan preprocessing recipe (vocabulary, IDF, stopword).
- **Peringatan non-blokir** untuk risiko data leakage pada jalur Word-Vector.

**Apply Model**

- **Sumber model**: upload file `.json` (maks. 10 MB), From Output Viewer, atau Statify built-in model (katalog masih kosong). Schema `1.0`, `1.1`, dan `2.0` diterima.
- **Pemetaan**: auto-map berdasarkan nama. Jalur Raw Text memakai recipe dari model tanpa menghitung ulang vocabulary atau IDF. Kolom vektor yang tidak ditemukan diisi 0.
- **Save**: `NB_PredictedValue`, `NB_PredictedProbability`, dan opsional `NB_Probability_<kelas>` sebagai variabel baru. Variabel lama tidak ditimpa.
- **Evaluasi**: metrik dan confusion matrix dihitung bila Actual target dipilih.

Label UI dan pesan galat berbahasa Inggris dengan kode di akhir kalimat, misalnya `(AM_E_MAP_UNMAPPED)`. Setiap menu punya tur bantuan dwibahasa.

### Keluaran

Tabel di Output Viewer, masing-masing dengan interpretasi otomatis:

| Menu | Tabel |
|---|---|
| String to Word Vector | Processing Summary, Settings, Vocabulary (maks. 200 baris; kolom dataset tetap lengkap) |
| Naive Bayes | Case Processing Summary, Attribute Distribution Table, Model Evaluation Metrics, Cohen's Kappa, Confusion Matrix, Text Feature Table (Download CSV dan Copy (TSV)), dan kartu Export Model |
| Apply Model | Model Summary, Case Processing Summary, Prediction Distribution, Saved Variables, serta Model Evaluation Metrics, Cohen's Kappa, dan Confusion Matrix bila Actual target diisi |

### Alur kerja

```
Transform > String to Word Vector             Analyze > Classify > Naive Bayes / Apply Model
StringToWordVectorModal.tsx                   dialogs/naive-bayes-main.tsx, dialogs/apply-model-main.tsx
        |                                     Mengumpulkan variabel dan opsi
hooks/useStringToWordVector.ts                services/naive-bayes-analysis.ts, services/apply-model-analysis.ts
        |                                     Validasi, membaca data dari IndexedDB, menyusun payload
Web Worker                                    stringToWord.processor.ts,
        |                                     public/workers/Classify/{NaiveBayes,ApplyModel}/*.worker.js
WASM (crate per menu)                         statify-string-to-word, wasm (Naive Bayes), wasm (Apply Model)
        |                                     Ketiganya memanggil statify-text-core: preprocessing,
        |                                     TF/IDF/normalization, likelihood teks
services/*formatter*, *interpretation*        Menyusun tabel dan interpretasi
        |
IndexedDB -> Output Viewer dan dataset aktif  Kolom baru, log, analytic, dan statistic disimpan lalu ditampilkan
```

Alur antarmenu:

```
String to Word Vector --kolom VEC_*--> Naive Bayes --Export Model (JSON / Output Viewer)--> Apply Model --> kolom NB_*
                       (atau Raw Text langsung ke Naive Bayes, recipe ikut diekspor)
```

### Struktur direktori

Lokasi kode: `frontend/components/Modals/Transform/StringToWordVector/`, `frontend/components/Modals/Analyze/Classify/naive-bayes/`, `frontend/components/Modals/Analyze/Classify/apply-model/`, dan `frontend/public/workers/TextAnalytics/statify-text-core/`

```
StringToWordVector/
├── StringToWordVectorModal.tsx       # Panel utama, tab Variables/Options
├── VariablesTab.tsx, OptionsTab.tsx  # OptionsTab dipakai ulang tab Text Preprocessing Naive Bayes
├── config.ts                         # Default, validasi, dan konversi config ke Rust
├── stringToWord.processor.ts         # Web Worker
├── constants/                        # Opsi TF/IDF/Normalization, daftar stopword
├── hooks/                            # useStringToWordVector.ts (orkestrasi), tourConfig.ts
├── utils/                            # Matriks, nama kolom, tabel dan interpretasi output
├── rust/                             # Crate statify-string-to-word (pembungkus core)
└── wasm-output/                      # Paket WASM hasil build yang dibaca worker

naive-bayes/
├── dialogs/                          # naive-bayes-main.tsx dan tab options, validation, output, text-preprocessing
├── components/                       # Tab Variables, Export Model, Text Feature Table
├── hooks/                            # Validasi, peringatan teks, tourConfig.ts
├── services/                         # Orkestrasi, formatter, output, pesan galat, interpretasi
├── constants/, types/
├── rust/                             # Crate wasm: models, stats (partisi, training, prediksi, metrik, export), wasm
└── text_analytics_eval/              # Paket evaluasi skripsi untuk ketiga menu dan core library

apply-model/
├── adapters/                         # Registry dan validasi schema model
├── dialogs/                          # apply-model-main.tsx dan tab model, variables, save, output
├── hooks/                            # Aturan pemetaan, Save, Output, validasi terpusat, tourConfig.ts
├── services/                         # Pemuat model, orkestrasi, formatter, interpretasi, simpan kolom
├── constants/, types/
└── rust/                             # Crate wasm: models, scoring (naive_bayes, text), stats, wasm

statify-text-core/
├── src/                              # config, tokenizer, stopwords, stemmer, ngram, pipeline,
│                                     # vectorizer, model (recipe, matriks jarang), nb_text
└── tests/                            # Tes integrasi dan nilai acuan eval_data/
```

File pendukung di luar folder modul:

| File | Fungsi |
|---|---|
| `frontend/public/workers/Classify/NaiveBayes/naive-bayes.worker.js` | Web Worker Naive Bayes yang memanggil WASM |
| `frontend/public/workers/Classify/NaiveBayes/pkg/` | Paket WASM Naive Bayes yang dibaca worker |
| `frontend/public/workers/Classify/ApplyModel/apply-model.worker.js` | Web Worker Apply Model yang memanggil WASM |
| `frontend/public/workers/Classify/ApplyModel/pkg/` | Paket WASM Apply Model yang dibaca worker |
| `frontend/components/Modals/Transform/TransformRegistry.ts` | Mendaftarkan panel String to Word Vector |
| `frontend/components/Modals/Analyze/Classify/ClassifyRegistry.tsx` | Mendaftarkan panel Naive Bayes dan Apply Model |
| `frontend/app/dashboard/components/layout/HamburgerMenu.tsx`, `frontend/components/Modals/Transform/TransformMenu.tsx`, `frontend/components/Modals/Analyze/Classify/classify-menu.tsx` | Entri menu |
| `frontend/components/Output/Statistics/index.tsx` | Komponen output Export Model dan Text Feature Table |
| `frontend/app/help/components/statistics-guide/text-analytics/` | Panduan penggunaan di halaman Help |

### Build ulang WASM

Lakukan hanya bila kode Rust berubah. `statify-text-core` tidak dibangun sendiri; bila core berubah, bangun ulang ketiga crate menu. Smart App Control di laptop pengembang dapat memblokir build di Windows, jadi build dilakukan di WSL Ubuntu (`source $HOME/.cargo/env`, `CARGO_TARGET_DIR` di `$HOME`).

```bash
# String to Word Vector, dari StringToWordVector/rust
wasm-pack build --target web --out-dir ../wasm-output --release

# Naive Bayes, dari naive-bayes/rust; Apply Model, dari apply-model/rust
wasm-pack build --target web --release   # menulis ke rust/pkg
```

Tujuan hasil build:

- String to Word Vector: langsung ke `wasm-output/`. Kembalikan `.gitignore` dan `package.json` yang ditimpa wasm-pack, lalu hapus `README.md`.
- Naive Bayes: salin `wasm.js`, `wasm_bg.wasm`, `wasm.d.ts`, `wasm_bg.wasm.d.ts` ke `frontend/public/workers/Classify/NaiveBayes/pkg/`, lalu naikkan versi cache di `NAIVE_BAYES_WASM_VERSION` dan dua URL `?v=` di worker.
- Apply Model: salin empat berkas yang sama ke `frontend/public/workers/Classify/ApplyModel/pkg/`, lalu naikkan `APPLY_MODEL_WASM_VERSION` dan konstanta versi di worker.

Worker hanya membaca salinan ini. Rincian skrip ada di README tiap folder.

### Pengujian

Angka mengikuti laporan final uji ulang 22 Oktober 2026. Tidak ada tes yang gagal atau dilewati.

- **Unit test Rust** (`cargo test` di folder crate): 564 tes, yaitu core library 155, Naive Bayes 242, dan Apply Model 167.
- **Unit test Jest** (dari folder `frontend`): 1.250 tes dalam 80 suite, yaitu String to Word Vector 171, Naive Bayes 388, dan Apply Model 691. Cakupan baris 72,18%, 94,43%, dan 97,80%.
- **White-box testing**: 54 jalur, semuanya lulus.
- **Black-box testing**: 56 skenario; tes otomatis Jest 194/194 dan Rust 67/67 lulus.
- **Integration testing**: IT-01 sampai IT-05 lulus, termasuk uji lewat UI Statify di Chrome 155 (48/48).
- **Perbandingan dengan scikit-learn dan WEKA**: pada test data Pilkada (270 baris), prediksi Statify sama dengan scikit-learn 270/270 untuk konfigurasi K1–K5, dan sama dengan WEKA 270/270 pada K1, K2, K5 setelah vocabulary disamakan. Dataset tambahan: SMS Spam dan SmSA.
- **Performance testing**: data hingga 17.974 dokumen diproses di bawah 2,5 detik (terlama 1.900,2 ms, Naive Bayes 10-fold) tanpa long task.

Uji ulang penuh: `frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\run_all.ps1`. Data uji ada di `text_analytics_eval/accuracy/datasets/`.

### Dokumentasi

- README String to Word Vector: [README.md](frontend/components/Modals/Transform/StringToWordVector/README.md).
- README Naive Bayes: [README.md](frontend/components/Modals/Analyze/Classify/naive-bayes/README.md).
- README Apply Model: [README.md](frontend/components/Modals/Analyze/Classify/apply-model/README.md).
- README core library: [README.md](frontend/public/workers/TextAnalytics/statify-text-core/README.md).
- Laporan final pengujian: [LAPORAN_UJI_ULANG_22Okt.md](frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md).
- Panduan penggunaan modul: tergabung dalam [PANDUAN PENGGUNAAN STATIFY.pdf](1.%20Panduan%20Penggunaan/PANDUAN%20PENGGUNAAN%20STATIFY.pdf).
- Panduan di dalam aplikasi: halaman **Help**, bagian Text Analytics.
