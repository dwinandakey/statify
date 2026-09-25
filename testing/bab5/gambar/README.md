# Tangkapan layar build final untuk naskah

- **Build:** `BUILD_ID` `IdywReo5MTivt50HHa3VO`; WASM MV `wasm_bg.6145c2bf.wasm`, RM `wasm_bg.2bc2b212.wasm`; server `http://localhost:3101`.
- **Pembuatan:** 2026-09-25, lewat UI asli dengan `testing/final/harness/bab5-gambar.cjs` (Playwright, Chromium bawaan, profil bersih per bagian, mode worker).
- **Ukuran:** dialog dipotret selebar viewport 1600 × 1000 px; kartu hasil dipotret dengan klip selebar halaman (1600 px).
- **Data:**
  - satu populasi: `hotelling 1 populasi.csv`;
  - dua populasi: `hotelling 2 populasi independen.csv`;
  - Model/Post Hoc: `two-way manova.csv`;
  - RM: `rm_b.csv`.
- **Contoh sleeping dog (J&W §6.2) pada build yang sama:** `../sleeping-dog/`.

| Berkas | Isi | Ukuran (px) |
|---|---|---|
| `hasil-01-multivariate-tests-catatan-kaki.png` | Tabel Multivariate Tests dua populasi dengan catatan H₀ δ₀ dan catatan kaki gaya SPSS | 1600 × 743 |
| `hasil-02-ci-simultan.png` | Tabel Simultaneous Confidence Intervals (T² dan Bonferroni) | 1600 × 676 |
| `hasil-03-uji-khi-kuadrat.png` | Tabel Chi-Square Test (Known Covariance Matrix), satu populasi | 1600 × 512 |
| `hasil-04-ci-sigma-diketahui.png` | Tabel Simultaneous Confidence Intervals (Known Covariance Matrix) | 1600 × 676 |
| `hasil-05-mauchly.png` | Tabel Mauchly's Test of Sphericity (rm_b) | 1600 × 512 |
| `hasil-06-within-subjects-effects.png` | Tabel Tests of Within-Subjects Effects (rm_b) dengan catatan kaki alpha | 1600 × 811 |
| `mv-01-dialog-utama.png` | Dialog utama GLM Multivariate (satu populasi: DV mpg, disp, hp, wt) | 1600 × 1000 |
| `mv-02-test-values.png` | Subdialog Test Values (μ₀), kotak Σ diketahui belum dicentang | 1600 × 1000 |
| `mv-03-sigma-diketahui-satu-populasi.png` | Subdialog Test Values dengan Σ diketahui (segitiga bawah terisi otomatis) | 1600 × 1000 |
| `mv-04-options.png` | Subdialog Options (Descriptive statistics, Estimates of effect size, Observed power, Simultaneous CI) | 1600 × 1000 |
| `mv-05-delta0.png` | Subdialog Test Values (δ₀) dua populasi | 1600 × 1000 |
| `mv-06-sigma-diketahui-dua-populasi.png` | Subdialog Test Values (δ₀) dengan Σ₁ dan Σ₂ diketahui (berlabel level faktor) | 1600 × 1000 |
| `mv-07-dialog-utama-dua-populasi.png` | Dialog utama dua populasi: panel Covariance Matrices dan ringkasan δ₀ · Σ₁, Σ₂ known | 1600 × 1000 |
| `mv-08-model.png` | Subdialog Model (Full Factorial, Build Terms, Build Custom Terms; Sum of Squares) | 1600 × 1000 |
| `mv-09-post-hoc.png` | Subdialog Post Hoc (LSD, Bonferroni, Sidak aktif; metode lain nonaktif) | 1600 × 1000 |
| `rm-01-define.png` | Dialog Define GLM Repeated Measures (faktor waktu 4 level, measure skor) | 1600 × 1000 |
| `rm-02-dialog-utama.png` | Dialog utama GLM Repeated Measures (w1–w4, faktor between kelompok) | 1600 × 1000 |
