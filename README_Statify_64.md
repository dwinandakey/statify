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
| 3 | GLM multivariate dan repeated measures | Muhammad Ilham Cahyanto (222212756) | [GLM Multivariate dan Repeated Measures](#glm-multivariate-dan-repeated-measures) |
| 4 | Time series | _(diisi)_ | _(diisi)_ |
| 5 | Regresi logistik biner | Dwinanda Muhammad Keyzha (222212576) | [Regresi Logistik Biner](#regresi-logistik-biner) |
| 6 | Regresi logistik ordinal | _(diisi)_ | _(diisi)_ |
| 7 | Regresi logistik multinomial | Willy Sumbayak (222212916) | [Regresi Logistik Multinomial](#regresi-logistik-multinomial) |
| 8 | Analisis diskriminan | Muhammad Zacky Heta Warman (222212775) | [Analisis Diskriminan](#analisis-diskriminan) |
| 9 | Nearest neighbor | _(diisi)_ | _(diisi)_ |
| 10 | K-medoids | _(diisi)_ | _(diisi)_ |
| 11 | Text analytics | _(diisi)_ | _(diisi)_ |

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

## GLM Multivariate dan Repeated Measures

**Nama**             : Muhammad Ilham Cahyanto  
**NIM**              : 222212756  
**Judul Skripsi**    : PENGEMBANGAN MODUL PEMODELAN LINIER PEUBAH GANDA DAN PENGUKURAN BERULANG PADA APLIKASI STATIFY  
**Dosen Pembimbing** : Firdaus, M.B.A.  

### Deskripsi singkat

Modul ini menambahkan dua prosedur General Linear Model (GLM) ke Statify:

- **GLM Multivariate** menganalisis lebih dari satu variabel dependen sekaligus. Prosedur ini mencakup MANOVA satu dan dua arah, MANCOVA, uji vektor rata-rata satu populasi, dua populasi, dan berpasangan (Hotelling's T²), serta uji khi-kuadrat bila matriks kovarians populasi Σ diketahui.
- **GLM Repeated Measures** menganalisis data yang diukur berulang pada subjek yang sama. Prosedur ini mencakup desain within-subjects, desain campuran (within dan between), desain dengan kovariat, dan desain *doubly multivariate* (lebih dari satu measure), lengkap dengan uji sferisitas Mauchly dan koreksi epsilon.

Kedua prosedur dihitung dengan Rust/WebAssembly di dalam Web Worker, jadi data tidak dikirim ke server dan tampilan tidak membeku saat perhitungan berjalan. Keluaran mengikuti prosedur GLM pada SPSS dan sudah divalidasi terhadap keluaran IBM SPSS Statistics 27 dengan toleransi 0,001.

### Cara mengakses

**GLM Multivariate**: menu **Analyze > General Linear Model > Multivariate...** membuka dialog dengan panel variabel dan tombol subdialog:

| Bagian | Fungsi |
|---|---|
| Variabel | Memilih Dependent Variables, Fixed Factor(s), Covariate(s), dan WLS Weight |
| Model | Full factorial atau model kustom, jenis Sum of Squares (Type I–IV), intercept |
| Contrasts | Kontras per faktor: Deviation, Simple, Difference, Helmert, Repeated, Polynomial |
| Post Hoc | Perbandingan berganda LSD, Bonferroni, dan Sidak |
| EM Means | Estimated marginal means dan perbandingan efek utama (LSD, Bonferroni, Sidak) |
| Save | Nilai prediksi, residual, leverage, dan statistik koefisien |
| Options | Statistik yang ditampilkan, uji homogenitas, selang kepercayaan simultan, taraf signifikansi |
| Bootstrap | Selang kepercayaan bootstrap (percentile dan BCa), sampling sederhana atau berstrata |
| Test Values | Nilai uji μ₀ untuk uji vektor rata-rata satu populasi |
| Paired | Pasangan variabel untuk Hotelling's T² berpasangan, dengan nilai uji δ₀ |
| Covariance Matrices | Muncul bila ada satu faktor dengan dua level. Pilihan Equal (Σ gabungan) atau Unequal (Welch-Satterthwaite), serta Test Values (δ₀) untuk uji dua populasi |

Subdialog Test Values, Test Values (δ₀), dan Paired juga menyediakan isian matriks kovarians Σ yang diketahui.

**GLM Repeated Measures**: menu **Analyze > General Linear Model > Repeated Measures...** memakai alur dua tahap:

1. **Define**: menentukan nama faktor within-subjects, jumlah levelnya, dan nama measure.
2. **Dialog utama**: memetakan variabel dataset ke setiap sel (level × measure), lalu memilih Between-Subjects Factor(s) dan Covariate(s). Tombol **Back to Define** kembali ke tahap pertama.

| Bagian | Fungsi |
|---|---|
| Model | Full factorial atau model kustom untuk efek within dan between, dengan Sum of Squares Type III |
| Contrasts | Kontras faktor within-subjects: Polynomial (bawaan, sama dengan SPSS) atau Repeated |
| EM Means | Estimated marginal means dan perbandingan berpasangan (LSD, Bonferroni, Sidak) |
| Save | Nilai prediksi, residual, leverage, dan statistik koefisien |
| Options | Statistik yang ditampilkan, uji homogenitas, taraf signifikansi |

Plots (kedua prosedur) dan Post Hoc (Repeated Measures) belum didukung di versi ini, dan tombolnya dinonaktifkan. Untuk perbandingan berpasangan pada Repeated Measures, gunakan EM Means > Compare main effects.

### Fitur

**GLM Multivariate**

- **Desain**: MANOVA satu dan dua arah, MANCOVA, model kustom (misalnya model efek utama tanpa interaksi), dan analisis berbobot (WLS). Sum of Squares Type I sampai IV, termasuk penanganan sel kosong pada Type IV.
- **Uji vektor rata-rata (Hotelling's T²)**:
  - satu populasi, dengan nilai uji μ₀;
  - dua populasi, dengan nilai uji δ₀ dan pilihan matriks kovarians sama (Σ gabungan) atau tidak sama (Welch-Satterthwaite, df pecahan);
  - berpasangan, dengan nilai uji δ₀. Kolom selisih d = v₁ − v₂ dibentuk otomatis.
- **Σ diketahui**: uji khi-kuadrat untuk satu populasi, dua populasi, dan berpasangan. Matriks yang dimasukkan diperiksa (diagonal positif dan definit positif) sebelum analisis dijalankan.
- **Selang kepercayaan simultan**: T² dan Bonferroni; untuk kasus Unequal memakai Krishnamoorthy–Yu dan Welch t.
- **Uji multivariat**: Pillai's Trace, Wilks' Lambda, Hotelling's Trace, dan Roy's Largest Root, beserta partial eta squared, noncentrality, dan observed power.
- **Analisis lanjutan**: kontras, post hoc, EM means, dan bootstrap.

**GLM Repeated Measures**

- **Desain**: within-subjects murni, campuran within × between, dengan kovariat, dan *doubly multivariate*.
- **Sferisitas**: uji Mauchly beserta epsilon Greenhouse-Geisser, Huynh-Feldt, dan Lower-bound. Epsilon mengoreksi df pada Tests of Within-Subjects Effects.
- **Uji multivariat** untuk efek within-subjects (Pillai, Wilks, Hotelling, Roy).
- **Kontras within-subjects** Polynomial dan Repeated, serta EM means dengan perbandingan berpasangan.

**Keduanya**

- Statistik deskriptif, uji homogenitas (Box's M, Levene, Bartlett's test of sphericity), estimasi parameter, matriks SSCP, *general estimable function*, ukuran efek, dan observed power.
- Penyimpanan nilai prediksi, residual, dan leverage ke dataset.
- Tur fitur interaktif di dalam dialog.
- Pesan galat yang jelas bila data atau pengaturan tidak memenuhi syarat analisis.

### Keluaran

Tabel dan catatan kaki mengikuti format SPSS.

**GLM Multivariate**

- Between-Subjects Factors dan Descriptive Statistics.
- Box's Test of Equality of Covariance Matrices, Bartlett's Test of Sphericity, dan Levene's Test of Equality of Error Variances.
- **Multivariate Tests**, ditambah Chi-Square Test (Known Covariance Matrix) bila Σ diketahui.
- Simultaneous Confidence Intervals (T² dan Bonferroni, atau versi Σ diketahui).
- Tests of Between-Subjects Effects dan Parameter Estimates.
- Between-Subjects SSCP Matrix, Residual SSCP Matrix, dan General Estimable Function.
- Contrast Results (K Matrix) beserta uji multivariat dan univariatnya, Estimated Marginal Means, dan Multiple Comparisons.

**GLM Repeated Measures**

- Within-Subjects Factors dan Descriptive Statistics.
- Box's M, Levene, dan Bartlett.
- Multivariate Tests untuk efek within-subjects.
- **Mauchly's Test of Sphericity** (W, Approx. Chi-Square, df, Sig., dan tiga epsilon).
- **Tests of Within-Subjects Effects** dengan empat baris per efek (Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, Lower-bound).
- Tests of Within-Subjects Contrasts dan Tests of Between-Subjects Effects.
- Parameter Estimates, matriks SSCP, Estimated Marginal Means, Pairwise Comparisons, dan Univariate Tests.

### Alur kerja

```
dialogs/*-main.tsx                        Mengumpulkan variabel dan opsi, disimpan di IndexedDB
        |
services/*-analysis.ts                    Memotong data, membuang kasus tidak lengkap, menyusun payload
        |                                 (RM: memetakan variabel ke sel level x measure; MV: kolom
        |                                 selisih untuk Paired, validasi matriks Sigma)
services/*-analysis-worker.ts             Web Worker yang memuat WASM dari rust/pkg
        |
rust/ (crate wasm per modul)              Design matrix, Sum of Squares Type I-IV, uji multivariat,
        |                                 Mauchly dan epsilon (RM), Hotelling T2 dan Sigma diketahui (MV)
services/*-analysis-formatter.ts          Menyusun tabel gaya SPSS beserta catatan kaki
        |
IndexedDB -> halaman Result               Log, analytic, dan statistic disimpan lalu ditampilkan
```

### Struktur direktori

Lokasi kode: `frontend/components/Modals/Analyze/general-linear-model/`

```
general-linear-model/
├── multivariate/
│   ├── README.md, architecture.md, development-step.md   # Dokumentasi teknis modul
│   ├── constants/                    # Nilai bawaan dialog dan daftar metode
│   ├── dialogs/
│   │   ├── multivariate-main.tsx     # Container: orkestrasi worker dan simpan hasil
│   │   ├── dialog.tsx                # Dialog utama dan panel Covariance Matrices
│   │   ├── model.tsx, contrast.tsx, posthoc.tsx, emmeans.tsx,
│   │   │   save.tsx, options.tsx, bootstrap.tsx, plots.tsx
│   │   ├── test-values.tsx           # Nilai uji mu0 (satu populasi)
│   │   ├── two-sample-delta.tsx      # Nilai uji delta0 (dua populasi)
│   │   ├── paired.tsx                # Hotelling's T2 berpasangan
│   │   └── known-sigma-matrix.tsx    # Isian matriks Sigma diketahui
│   ├── hooks/                        # tourConfig.ts, useTourGuide.ts
│   ├── services/
│   │   ├── multivariate-analysis.ts            # Menyiapkan payload dan menjalankan worker
│   │   ├── multivariate-analysis-worker.ts     # Web Worker
│   │   ├── multivariate-analysis-formatter.ts  # Tabel gaya SPSS
│   │   ├── multivariate-analysis-output.ts     # Menyimpan hasil ke halaman Result
│   │   ├── paired-difference.ts      # Kolom selisih untuk uji berpasangan
│   │   ├── two-sample-delta.ts       # Uji dua populasi dengan delta0
│   │   ├── known-sigma.ts            # Validasi dan uji khi-kuadrat Sigma diketahui
│   │   └── empty-cells.ts            # Penanganan sel kosong
│   ├── types/
│   ├── test/, __test__/              # Jest (unit, acuan SPSS, performa)
│   └── rust/                         # Crate Rust -> WebAssembly
│       ├── pkg/                      # Hasil build yang dimuat worker
│       └── src/
│           ├── lib.rs
│           ├── models/               # config, data, result
│           ├── stats/                # core, multivariate_tests, between_subjects_effects,
│           │                         # box_m_test, levene_test, bartlett_test, sscp_matrix,
│           │                         # parameter_estimates, emmeans, posthoc, bootstrap, ...
│           ├── wasm/                 # constructor.rs, function.rs (API ke JavaScript)
│           ├── utils/
│           └── test/                 # Validasi Rust terhadap nilai SPSS
├── repeated-measures/
│   ├── README.md, architecture.md, development-step.md
│   ├── constants/
│   ├── dialogs/
│   │   ├── define/                   # Tahap Define: faktor within, level, measure
│   │   ├── repeated-measures-main.tsx
│   │   ├── dialog.tsx                # Dialog utama dan pemetaan sel level x measure
│   │   └── model.tsx, contrast.tsx, emmeans.tsx, save.tsx, options.tsx,
│   │       posthoc.tsx, plots.tsx
│   ├── hooks/
│   ├── services/                     # analysis, worker, formatter, output
│   ├── types/
│   ├── __test__/                     # Jest (struktur keluaran, acuan SPSS, performa)
│   └── rust/
│       ├── pkg/
│       └── src/
│           ├── stats/                # rm_model, mauchly_test, within_subjects_effects,
│           │                         # multivariate_tests, parse_factors, glm_tests,
│           │                         # between_subjects_effects, emmeans, ...
│           ├── wasm/, models/, utils/
│           └── test/
└── shared/                           # Dipakai MV dan RM: eksekusi GLM, kolom effect size,
                                      # catatan kaki SPSS, pesan galat
```

File pendukung di luar folder modul:

| File | Fungsi |
|---|---|
| `frontend/components/Modals/Analyze/general-linear-model/GeneralLinearModelRegistry.tsx` | Mendaftarkan dialog Multivariate dan Repeated Measures ke sistem modal |
| `frontend/components/Modals/Analyze/general-linear-model/general-linear-model-menu.tsx` | Entri menu Analyze > General Linear Model |
| `frontend/app/help/components/statistics-guide/multivariate/` | Panduan penggunaan GLM Multivariate di halaman Help |
| `frontend/app/help/components/statistics-guide/repeated-measures/` | Panduan penggunaan GLM Repeated Measures di halaman Help |

### Build ulang WASM

Lakukan hanya bila kode Rust berubah. Build final skripsi memakai rustc 1.95.0 dan wasm-pack 0.14.0.

```bash
cd frontend/components/Modals/Analyze/general-linear-model/multivariate/rust
cargo test --lib                 # unit test dan validasi
wasm-pack build --target web     # menulis ke rust/pkg

cd ../../repeated-measures/rust
cargo test --lib
wasm-pack build --target web
```

Berbeda dengan modul yang memakai `public/workers/`, worker GLM di-bundle oleh Next.js dan memuat WASM langsung dari `rust/pkg`. Karena itu, hasil build tidak perlu disalin ke folder lain. Commit berkas di `rust/pkg/` (`wasm_bg.wasm`, `wasm.js`, `wasm.d.ts`, `wasm_bg.wasm.d.ts`, `package.json`) beserta `Cargo.lock` kedua crate.

### Pengujian

- **Unit test Rust** (`cargo test --lib` di folder `rust/` masing-masing), termasuk validasi terhadap nilai SPSS dan pengujian jalur dasar (*basis path*).
- **Jest** dari folder `frontend/`. Jalankan secara serial karena setiap suite memuat WASM:

  ```bash
  npx jest --runInBand general-linear-model/multivariate general-linear-model/repeated-measures general-linear-model/shared
  ```

  Suite `repeated-measures-reference.test.ts` membaca dataset dari `testing/glm-rm-reference/data/`. Data ini tersedia di branch `ilham`, tetapi sudah dihapus dari `main`. Di `main`, ambil dulu datanya dari commit build final, lalu jalankan Jest. Hasilnya 14 suite lulus, dengan 4.080 test lulus dan 12 test berstatus *todo*:

  ```bash
  git restore --source=3552b5dc -- testing/glm-rm-reference/data
  ```

- **Validasi numerik terhadap SPSS 27**, dengan toleransi |Statify − SPSS| ≤ 0,001:
  - **Multivariate**: 9 konfigurasi. Konfigurasinya adalah satu populasi, dua populasi, berpasangan, MANOVA satu arah beserta post hoc, MANOVA dua arah dengan dan tanpa interaksi, data tak seimbang, dan data dengan nilai hilang. Sebanyak 2.339 nilai yang punya padanan di Statify semuanya lulus.
  - **Repeated Measures**: 4 dataset (within-only dua measure, dua desain campuran, dan dataset Gambar 51). Sebanyak 1.047 nilai cocok.
- **Black-box**: 78 skenario pada build final, semuanya sesuai.
- **White-box**: *basis path testing* dan *code coverage* pada inti Rust dan services TypeScript, dengan nilai harapan dari SPSS 27 atau R 4.3.2.

Data, sintaks SPSS, keluaran SPSS, harness, dan laporan pengujian tersimpan di folder `testing/` pada commit build final [`3552b5dc`](https://git.stis.ac.id/222212887/statify64/-/tree/3552b5dc5a02743ff9466a32454cc9dc546b1335/testing). Folder ini sudah tidak ada di `main`. Isinya antara lain:

- `glm-mv-reference/` dan `glm-rm-reference/`: validasi terhadap SPSS;
- `black-box/`: skenario dan hasil eksekusi;
- `whitebox/`: laporan white-box v6.

### Dokumentasi

- Dokumentasi teknis (arsitektur, alur data, algoritma): [multivariate/architecture.md](frontend/components/Modals/Analyze/general-linear-model/multivariate/architecture.md) dan [repeated-measures/architecture.md](frontend/components/Modals/Analyze/general-linear-model/repeated-measures/architecture.md), serta README di masing-masing folder modul.
- Panduan di dalam aplikasi: halaman **Help**, bagian GLM Multivariate dan GLM Repeated Measures (dwibahasa Indonesia/Inggris).
- Panduan penggunaan Statify (umum): [PANDUAN PENGGUNAAN STATIFY.pdf](1.%20Panduan%20Penggunaan/PANDUAN%20PENGGUNAAN%20STATIFY.pdf).
- Panduan penggunaan modul: _(tautan menyusul)_

---

## Analisis Diskriminan

**Nama**             : Muhammad Zacky Heta Warman  
**NIM**              : 222212775  
**Judul Skripsi**    : PENGEMBANGAN MODUL ANALISIS DISKRIMINAN PADA APLIKASI STATISTIK STATIFY  
**Dosen Pembimbing** : Firdaus, M.B.A.  

### Deskripsi singkat

Modul ini menyediakan analisis diskriminan untuk satu variabel pengelompokan kategorik dan sejumlah variabel bebas numerik. Analisis membentuk fungsi diskriminan kanonik, yaitu kombinasi linear variabel bebas yang paling memisahkan kelompok. Fungsi itu dipakai untuk dua tujuan sekaligus: menjelaskan variabel mana yang membedakan kelompok, dan mengklasifikasikan kasus ke salah satu kelompok. Jumlah fungsi yang terbentuk paling banyak min(jumlah kelompok − 1, jumlah variabel bebas).

Perhitungan berjalan dengan Rust/WebAssembly di dalam Web Worker, jadi data tidak dikirim ke server. Keluaran mengikuti prosedur DISCRIMINANT pada SPSS, termasuk format angka dan catatan kakinya.

### Cara mengakses

Menu **Analyze > Classify > Discriminant...** membuka dialog dengan tab berikut:

| Tab | Fungsi |
|---|---|
| Variables | Memilih metode (Enter independents together atau Use stepwise method), Grouping Variable beserta Define Range, Independents, dan Selection Variable (opsional) |
| Statistics | Statistik deskriptif, koefisien fungsi, dan matriks |
| Method | Hanya muncul pada metode stepwise. Mengatur kriteria seleksi variabel dan tampilan langkah |
| Classify | Prior probabilities, matriks kovarians untuk klasifikasi, tabel klasifikasi, dan plot |
| Save | Menyimpan hasil per kasus ke dataset dan mengekspor model ke XML |
| Bootstrap | Hanya muncul pada metode Enter independents together. Mengatur bootstrap untuk koefisien terstandarisasi |
| Assumptions | Menjalankan uji asumsi secara terpisah dari analisis utama |

Ikon **?** di pojok kiri bawah dialog menjalankan tur fitur yang menyorot setiap bagian dialog secara berurutan. Pengaturan dialog tersimpan otomatis untuk pembukaan berikutnya.

### Fitur

- **Metode**: semua variabel bebas dimasukkan sekaligus (Together), atau seleksi bertahap (Stepwise).
- **Kriteria stepwise**: Wilks' Lambda, Unexplained Variance, Mahalanobis Distance, Smallest F Ratio, dan Rao's V (dengan V-to-enter). Batas masuk dan keluar memakai nilai F atau probabilitas F. Opsi tampilan mencakup ringkasan langkah dan F untuk jarak antarpasangan kelompok.
- **Statistics**:
  - Descriptives: Means dan Univariate ANOVAs (uji kesamaan rata-rata kelompok), serta Box's M.
  - Function Coefficients: Fisher's (fungsi klasifikasi) dan Unstandardized.
  - Matrices: korelasi dan kovarians within-groups, kovarians separate-groups, dan kovarians total.
- **Classify**:
  - Prior probabilities: sama untuk semua kelompok atau dihitung dari ukuran kelompok.
  - Matriks kovarians: within-groups (gabungan) atau separate-groups.
  - Casewise results dengan batas jumlah kasus, summary table, dan klasifikasi *leave-one-out* (validasi silang).
  - Plot combined-groups, separate-groups, dan territorial map.
  - Penggantian nilai hilang dengan rata-rata.
- **Selection Variable dan Generate Split**: fungsi diestimasi hanya dari kasus terpilih, sedangkan kasus lain tetap diklasifikasikan dan dilaporkan terpisah. Tombol **Generate Split...** membuat variabel baru 1 = training dan 0 = testing (bawaan 70% training, seed 2000000, dapat berstrata), lalu menjadikannya Selection Variable.
- **Save**: kelompok prediksi (`Dis_1`), skor diskriminan (`Dis1_1`, …), dan probabilitas keanggotaan tiap kelompok, mengikuti penamaan `DISCRIMINANT /SAVE` di SPSS. Model juga dapat diekspor ke berkas XML yang diunduh lewat browser.
- **Bootstrap**: jumlah sampel (bawaan 1000), seed Mersenne Twister (bawaan 2000000), selang kepercayaan Percentile atau BCa, serta sampling Simple atau Stratified. Hasilnya berupa bias, galat baku, dan selang kepercayaan untuk setiap koefisien terstandarisasi.
- **Uji asumsi** (tombol **Run Assumption Tests**, dapat dijalankan tanpa analisis lengkap): multikolinearitas (Tolerance dan VIF, batas VIF 10), normalitas multivariat Henze-Zirkler, dan normalitas univariat Anderson-Darling per kelompok. Homogenitas matriks kovarians diuji dengan Box's M dari tab Statistics.
- **Validasi input** sebelum data dikirim ke worker. Misalnya, Define Range wajib diisi, sama seperti `/GROUPS=var(min max)` di SPSS.
- **Interpretasi**: setiap tabel disertai uraian singkat (`services/discriminant-interpretation.ts`).

### Keluaran

Tabel, plot, dan catatan kaki mengikuti format SPSS:

- Analysis Case Processing Summary, Group Statistics, dan Tests of Equality of Group Means.
- Pooled Within-Groups Covariance dan Correlation Matrix, serta Covariance Matrices (separate-groups dan total).
- Log Determinants dan Test Results (Box's M).
- Untuk metode stepwise: Variables Entered/Removed, Variables in the Analysis, Variables Not in the Analysis, Wilks' Lambda per langkah, dan Pairwise Group Comparisons.
- Summary of Canonical Discriminant Functions:
  - Eigenvalues dan Wilks' Lambda;
  - Standardized Canonical Discriminant Function Coefficients dan Structure Matrix;
  - Canonical Discriminant Function Coefficients dan Functions at Group Centroids.
- Classification Statistics:
  - Classification Processing Summary dan Prior Probabilities for Groups;
  - Classification Function Coefficients;
  - Casewise Statistics (kasus salah klasifikasi ditandai `**`);
  - Classification Results, termasuk baris Cross-validated dan kasus testing bila ada Selection Variable.
- Plot: Combined-Groups Plot, Separate-Groups Plot, dan Territorial Map. Bila hanya terbentuk satu fungsi, plot ditampilkan sebagai histogram per kelompok.
- Hasil bootstrap koefisien terstandarisasi.
- Uji asumsi: Assumption Checks Summary, Multicollinearity (Tolerance and VIF), Multivariate Normality within Groups (Henze-Zirkler Test), dan Univariate Normality within Groups (Anderson-Darling).

### Alur kerja

```
dialogs/discriminant-main.tsx             Mengumpulkan variabel dan opsi (state di hooks/useDiscriminantState.ts)
        |
services/discriminant-validation.ts       Memeriksa input (Define Range, jumlah variabel, dst.)
        |
public/workers/Classify/Discriminant/discriminant.worker.js
        |                                 Memuat WASM dari ./pkg lalu membuat DiscriminantAnalysis
rust/ (crate wasm)                        Matriks SSCP, eigen, fungsi kanonik, seleksi stepwise,
        |                                 klasifikasi, leave-one-out, Box's M, bootstrap, uji asumsi
services/discriminant-analysis-formatter.ts
        |                                 Menyusun tabel dan plot gaya SPSS
services/store.ts                         Menambahkan interpretasi lalu menyimpan hasil
        |
IndexedDB -> halaman Result               Log, analytic, dan statistic disimpan lalu ditampilkan
```

### Struktur direktori

Lokasi kode: `frontend/components/Modals/Analyze/Classify/discriminant/`

```
discriminant/
├── constants/
│   └── discriminant-default.ts       # Nilai bawaan setiap tab
├── dialogs/
│   ├── discriminant-main.tsx         # Dialog utama, tab Variables, Generate Split, orkestrasi worker
│   ├── statistics.tsx
│   ├── method.tsx                    # Kriteria stepwise
│   ├── classify.tsx
│   ├── save.tsx                      # Save dan ekspor XML
│   ├── bootstrap.tsx
│   └── assumptions.tsx               # Tombol Run Assumption Tests
├── hooks/
│   ├── useDiscriminantState.ts       # State dialog dan payload ke engine
│   └── tourConfig.ts                 # Konfigurasi tur fitur
├── services/
│   ├── discriminant-analysis-formatter.ts  # Tabel dan plot gaya SPSS
│   ├── discriminant-interpretation.ts      # Teks interpretasi tiap tabel
│   ├── discriminant-number-format.ts       # Format angka mengikuti pivot table SPSS
│   ├── discriminant-validation.ts          # Validasi input sebelum dikirim ke worker
│   ├── discriminant-split.ts               # Variabel training/testing (Generate Split)
│   ├── discriminant-save.ts                # Variabel hasil Save ke dataset
│   ├── discriminant-xml-export.ts          # Ekspor model ke XML
│   ├── store.ts                            # Menyimpan hasil ke halaman Result
│   └── formatter.ts                        # Entry point formatter
├── types/
│   └── discriminant.ts
├── __tests__/
│   ├── integration/                  # Jest white-box: alur analisis, Generate Split, uji asumsi
│   │   └── fixtures/iris.csv
│   └── unit/                         # Test Rust white-box: eigen dan klasifikasi
└── rust/                             # Crate Rust -> WebAssembly
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── models/                   # config, data, result
        ├── stats/                    # core, basic_processing, matrix_calculation, group_statistics,
        │                             # equality_test, box_m_test, log_determinant,
        │                             # canonical_function, structure_matrix, classification_result,
        │                             # casewise_statistics, prior_probabilities, separate_covariance,
        │                             # stepwise_method, stepwise_statistics, variable_selection,
        │                             # pairwise_comparison, statistical_test, bootstrap, assumptions
        ├── wasm/                     # constructor.rs, function.rs (API ke JavaScript)
        └── utils/                    # converter, error, log
```

File pendukung di luar folder modul:

| File | Fungsi |
|---|---|
| `frontend/public/workers/Classify/Discriminant/discriminant.worker.js` | Web Worker yang memuat WASM dan menjalankan analisis |
| `frontend/public/workers/Classify/Discriminant/pkg/` | Paket WASM hasil build yang dibaca worker |
| `frontend/components/Modals/Analyze/Classify/ClassifyRegistry.tsx` | Mendaftarkan dialog ke sistem modal |
| `frontend/components/Modals/Analyze/Classify/classify-menu.tsx` | Entri menu Analyze > Classify |
| `frontend/app/help/components/statistics-guide/discriminant/` | Panduan penggunaan di halaman Help |

### Build ulang WASM

Lakukan hanya bila kode Rust berubah.

```bash
cd frontend/components/Modals/Analyze/Classify/discriminant/rust
cargo test                       # unit test, termasuk test white-box di ../__tests__/unit
wasm-pack build --target web     # menulis ke rust/pkg
```

Setelah itu salin `wasm_bg.wasm`, `wasm.js`, `wasm.d.ts`, `wasm_bg.wasm.d.ts`, dan `package.json` dari `rust/pkg` ke `frontend/public/workers/Classify/Discriminant/pkg/`. Worker hanya membaca salinan ini.

### Pengujian

- **Unit test Rust** (`cargo test` di folder `rust/`): 23 test, terdiri atas 2 test bootstrap di `src/`, 14 test klasifikasi, dan 7 test eigen di `__tests__/unit/`.
- **Integrasi white-box** dengan Jest dari folder `frontend/`, memakai data `iris.csv`: 3 suite dan 17 test untuk alur analisis, Generate Split, dan uji asumsi.

  ```bash
  npx jest --runInBand Classify/discriminant
  ```

- **Mode presisi** untuk mencocokkan angka dengan SPSS melebihi digit yang ditampilkan. Jalankan `localStorage.setItem("discriminant.decimals", "10")` di console browser, maka semua statistik dicetak dengan jumlah desimal tersebut (1–15). Judul keluaran menandai mode ini supaya tidak tertukar dengan keluaran biasa.

### Dokumentasi

- Panduan di dalam aplikasi: halaman **Help**, bagian Discriminant Analysis (dwibahasa Indonesia/Inggris). Isinya mencakup variabel, metode stepwise, statistik, klasifikasi, save dan bootstrap, uji asumsi, serta cara membaca keluaran.
- Panduan penggunaan Statify (umum): [PANDUAN PENGGUNAAN STATIFY.pdf](1.%20Panduan%20Penggunaan/PANDUAN%20PENGGUNAAN%20STATIFY.pdf).
- Panduan penggunaan modul: _(tautan menyusul)_

