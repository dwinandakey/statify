# Multivariate General Linear Model (GLM) Analysis

## Deskripsi

Modul ini mengimplementasikan fitur **General Linear Model > Multivariate** (MANOVA) di Statify dengan arsitektur frontend TypeScript + backend statistik Rust/WASM. Komponen ini mengikuti pola UI sidebar seperti `univariate`, dengan alur konfigurasi utama dan sub-dialog (Model, Contrasts, Plots, Post Hoc, EM Means, Save, Options, Bootstrap).

## Cakupan Output

Output utama yang didukung modul ini:

- Between-Subjects Factors
- Descriptive Statistics per dependent variable
- Box's M Test of Equality of Covariance Matrices
- Levene's Test of Equality of Error Variances
- Bartlett's Test of Sphericity
- Multivariate Tests:
  - Pillai's Trace
  - Wilks' Lambda
  - Hotelling's Trace
  - Roy's Largest Root
- Tests of Between-Subjects Effects
- Parameter Estimates
- Between-Subjects SSCP
- Residual SSCP Matrix
- SSCP Matrix
- EM Means dan komponen terkait
- Contrast Coefficients
- Saved Variables summary

## Struktur Folder

```text
multivariate/
├── constants/
├── dialogs/
│   ├── dialog.tsx
│   ├── multivariate-main.tsx
│   ├── model.tsx
│   ├── contrast.tsx
│   ├── plots.tsx
│   ├── posthoc.tsx
│   ├── emmeans.tsx
│   ├── save.tsx
│   ├── options.tsx
│   └── bootstrap.tsx
├── hooks/
│   ├── useTourGuide.ts
│   └── tourConfig.ts
├── rust/
│   ├── src/
│   │   ├── models/
│   │   ├── stats/
│   │   ├── wasm/
│   │   └── test/
│   │       └── multivariate_validation.rs
│   └── pkg/
├── services/
│   ├── multivariate-analysis.ts
│   ├── multivariate-analysis-formatter.ts
│   └── multivariate-analysis-output.ts
└── types/
    ├── multivariate.ts
    └── multivariate-worker.ts
```

## Build WASM

Dari folder `multivariate/rust`:

```bash
wasm-pack build --target web
```

Output build akan dihasilkan ke `multivariate/rust/pkg`.

## Menjalankan Test

### Rust validation tests

Dari folder `multivariate/rust`:

```bash
cargo test --lib
```

Test yang tersedia saat ini mencakup:

- Validasi komputasi tabel inti untuk dataset A/B/C
- Smoke numeric checks untuk:
  - Multivariate tests
  - Box's M
  - Tests of between-subjects effects
  - Parameter estimates
- Basic performance guard (threshold 5 detik pada dataset menengah)

## Catatan Implementasi

- UI container `multivariate-main.tsx` menggunakan alur section-switch (sidebar flow), konsisten dengan Univariate.
- Modul bootstrap Rust sudah menangani:
  - simple bootstrap
  - stratified bootstrap
  - percentile CI
  - BCa CI (dengan estimasi acceleration jackknife)
- Placeholder logic pada pemetaan kolom interaction di between-subjects effects sudah diganti dengan pemetaan deterministik berdasarkan konstruksi design matrix.

## Referensi Statistik

- IBM SPSS Statistics Algorithms
- Rencher, A. C. - Methods of Multivariate Analysis
- Johnson, R. A. & Wichern, D. W. - Applied Multivariate Statistical Analysis
