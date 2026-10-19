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
| 7 | Regresi logistik multinomial | _Willy Sumbayak (222212916)_ | _Regresi Logistik Multinomial_ |
| 8 | Analisis diskriminan | _(diisi)_ | _(diisi)_ |
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
