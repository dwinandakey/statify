# Dampak perubahan skripsi-final-v2 → build final ke naskah BAB IV

- **Rentang:** tag `skripsi-final-v2` (`d863de09`) sampai build final di branch `ilham` (tag `skripsi-final-v5`).
- **Tahapan:** v3 (perbaikan hasil black-box iterasi 1), v4 (δ₀ dan CI simultan), v5 (tampilan gaya SPSS, df pecahan, Type I/II/IV), final (uji khi-kuadrat dengan Σ diketahui).
- **Path:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/` (disingkat `MV/` untuk `multivariate/` dan `RM/` untuk `repeated-measures/`).
- **Sumber rinci:** `testing/RELEASE-NOTES.md` (§v3, §v4, §v5, §F), `testing/fitur-v4/thesis-impact-v4.md`, `testing/fitur-v5/thesis-impact-v5.md`.

## 1. API publik Rust

Diperiksa dengan `testing/glm-mv-reference/harness/rust_api.py` terhadap `82a63b45`. Daftar lengkap ada di `testing/final/rust-api-allowed.json` (9 item). **Crate RM tidak berubah sejak v2.**

| Versi | Crate MV: perubahan publik | Berkas |
|---|---|---|
| v3 | Tidak ada | — |
| v4 | Method `MultivariateAnalysis::get_simultaneous_ci(&mut self) -> Result<JsValue, JsValue>`; struct `SimultaneousConfidenceIntervals`, `SimultaneousInterval` | `MV/rust/src/wasm/constructor.rs`, `MV/rust/src/models/result.rs` |
| v5 | Fungsi `calculate_f_significance_df(df1: f64, df2: f64, f_value: f64) -> f64`, `calculate_observed_power_df(d1: f64, d2: f64, f_value: f64, alpha: f64) -> f64` | `MV/rust/src/stats/common.rs` |
| final | Method `MultivariateAnalysis::get_known_covariance_test(&mut self, known: JsValue) -> Result<JsValue, JsValue>`; struct `KnownCovarianceInput`, `KnownCovarianceTest`, `KnownCovarianceInterval` | `MV/rust/src/wasm/constructor.rs`, `MV/rust/src/models/result.rs` |

- **Tetap sama:** `MultivariateResult`, `OptionsConfig`, `MainConfig`, dan konstruktor `MultivariateAnalysis::new`. Kedua method baru tidak menambah field ke struct hasil.
- **Alasannya:** di wasm32, menambah field atau kode di konstruktor mengubah urutan kunci `HashMap` dan hasil jalur lama (temuan v4 dan v5).
- **Glue `pkg/wasm.js` dan `wasm.d.ts`:** bertambah dua method (v4, final); selain itu tidak berubah.

## 2. `run_analysis` (Rust MV) dan urutan pemanggilan WASM

- **`run_analysis` (`MV/rust/src/wasm/function.rs`):** tidak ada langkah baru sejak v2. Perubahan v5 ada di dalam langkah yang sudah ada:
  - `calculate_multivariate_tests`: Sig. dan Observed Power memakai df pecahan (Wilks' Lambda Rao bila p ≥ 3 dan df_h ≥ 3, uji Welch);
  - `calculate_tests_between_subjects_effects` dan SSCP hipotesis Intercept: Type I dan II memakai R(μ) = n·ȳ².
- **Perubahan final di dalam langkah yang ada (temuan pembanding SPSS, tanpa perubahan API):**
  - `calculate_multivariate_tests`: Noncent. Parameter Wilks' Lambda = df₂·η²/(1 − η²) bila Rao t ≠ s (p ≥ 3 dan df_h ≥ 3), dan Observed Power dihitung pada λ itu;
  - `calculate_observed_power_df` (`stats/common.rs`): F = 0 memberi power = α, sebelumnya 0.
- **Urutan pemanggilan dari worker/main thread (baru):**
  1. `new MultivariateAnalysis(...)`, yang menjalankan `run_analysis`;
  2. `get_formatted_results()`;
  3. bila Options → Simultaneous CI dicentang: `get_simultaneous_ci()` (v4);
  4. bila Σ diketahui diisi: `get_known_covariance_test(known)` (final);
  5. `get_all_errors()`;
  6. `free()`.
- **Respons worker:** hasil langkah 3 dan 4 ditaruh sebagai `results.simultaneous_confidence_intervals` dan `results.known_covariance_test`. Bentuk pesan worker (`{ id, ok, results, errors }`) tidak berubah. Payload worker bertambah field opsional `known_covariance` (hanya bila Σ diisi).

## 3. Per gambar dan subbab BAB IV

### 3.1 Class diagram GLM Multivariate (4.8.1 satu populasi, 4.8.2 dua populasi, 4.8.3 berpasangan)

| Tambahan | Versi | Keterangan |
|---|---|---|
| Kelas WASM `MultivariateAnalysis`: method `get_simultaneous_ci()`, `get_known_covariance_test(known)` | v4, final | Relasi ke struct hasil `SimultaneousConfidenceIntervals`/`SimultaneousInterval` dan `KnownCovarianceTest`/`KnownCovarianceInterval`; masukan `KnownCovarianceInput` |
| `MultivariateMainType`: `TwoSampleTestValues`, `KnownSigma`, `TwoSampleKnownSigma`; `PairedModeType.knownSigma`; tipe `TwoSampleKnownSigmaType` | v4, final | Tidak dikirim ke Rust lewat config |
| `MultivariateOptionsType.SimultaneousCI` | v4 | Checkbox Options |
| Dialog `MultivariateTwoSampleDelta` (`MV/dialogs/two-sample-delta.tsx`) | v4 | 4.8.2 |
| Komponen `KnownSigmaCheckbox`, `KnownSigmaMatrix` (`MV/dialogs/known-sigma-matrix.tsx`) | final | Dipakai dialog Test Values (4.8.1), Test Values (δ₀) (4.8.2), Paired (4.8.3) |
| Service `two-sample-delta.ts` (`factorLevels`, `shiftFirstLevel`, `restoreDescriptiveStatistics`) | v4 | 4.8.2 |
| Service `known-sigma.ts` (`parseKnownSigma`, `isPositiveDefinite`, `resolveKnownCovariance`) | final | Validasi dialog dan pemilihan desain Σ |
| Service `empty-cells.ts` (`emptyFactorCells`) | v5 | Two-Way, Type IV |
| Modul bersama `shared/error-message.ts`, `shared/effect-size-columns.ts`, `shared/spss-footnotes.ts`; helper `formatGlmStat`, `formatGlmNumber`, `formatGlmSig` di `hooks/useFormatter.ts` | v5 | Dipakai MV dan RM |

### 3.2 Sequence diagram MV tahap 1 (dialog → service → WASM)

- **4.8.1 (satu populasi):** di subdialog Test Values, bila Σ dicentang, Continue menjalankan validasi Σ (angka, diagonal positif, Cholesky). Bila gagal, subdialog tetap terbuka dengan pesan (final).
- **4.8.2 (dua populasi):**
  - sebelum WASM, langkah TypeScript "geser level pertama sebesar δ₀" bila δ₀ ≠ 0 (v4);
  - validasi Σ atau Σ₁, Σ₂ di subdialog δ₀ (final);
  - δ₀ dan Σ dibuang bila Fixed Factor(s) diubah.
- **4.8.3 (berpasangan):** validasi Σd di bagian C subdialog Paired (final); pembentukan kolom selisih tidak berubah.
- **Semua MV:**
  - service memanggil `resolveKnownCovariance` sebelum WASM (final);
  - pemeriksaan sel kosong bila Type IV (v5), sebelum WASM;
  - pesan galat toast memakai `errorMessage` (v5; tidak lagi "Error: Error:").

### 3.3 Sequence diagram MV tahap 2 (WASM → formatter → output)

- **Sesudah `get_formatted_results()`:** panggilan opsional `get_simultaneous_ci()` (v4) dan `get_known_covariance_test(known)` (final), lihat §2.
- **Formatter** (`MV/services/multivariate-analysis-formatter.ts`), urutan tabel baru:
  1. Multivariate Tests;
  2. **Chi-Square Test (Known Covariance Matrix)** (final);
  3. **Simultaneous Confidence Intervals** (v4);
  4. **Simultaneous Confidence Intervals (Known Covariance Matrix)** (final);
  5. Tests of Between-Subjects Effects.
- **Pascaproses formatter:**
  - catatan H₀/δ₀ dan catatan "data geser" (`annotateTwoSampleDelta`, v4);
  - catatan kaki gaya SPSS (`addSpssFootnotes`, v5);
  - penyaringan kolom effect size/power menurut Options (`applyEffectSizePowerColumns`, v5).
- **Output** (`MV/services/multivariate-analysis-output.ts`): tiga tabel baru di atas disimpan sebagai analytic sendiri.

### 3.4 Diagram GLM Repeated Measures

- **Crate RM:** tidak berubah sejak v2; class diagram RM sisi Rust tetap.
- **Sequence Define/dialog:**
  - slot within tetap bila Define diklik tanpa perubahan (v3);
  - Number of Levels kosong/bukan angka → "Number of levels must be a valid number." (v3).
- **Dialog Model RM:** Sum of Squares hanya Type III (pilihan lain nonaktif, dengan keterangan) (v5).
- **Formatter RM:**
  - 4 desimal dan df tanpa desimal (v5);
  - kolom effect size/power menurut Options (v5);
  - catatan kaki gaya SPSS (`applyRmFootnotes`, v5);
  - toast galat memakai `errorMessage` (v5).

## 4. Tabel dan kolom keluaran baru atau berubah

| Tabel | Versi | Perubahan |
|---|---|---|
| Levene's Test (MV) | v3 | Catatan diakhiri "Design: …" (dengan suku interaksi pada faktorial penuh) |
| Multivariate Tests (MV) | v4, v5 | Catatan H₀ δ₀; catatan kaki SPSS (Design, Exact statistic, batas atas Roy, alpha); Sig. dan Observed Power Wilks dengan df pecahan |
| Simultaneous Confidence Intervals | v4 | Baru: Mean/Mean Difference, Std. Error, μ₀/δ₀, T² dan Bonferroni (Lower, Upper, Contains) |
| Chi-Square Test (Known Covariance Matrix) | final | Baru: Hypothesis, Chi-Square, df, Sig. |
| Simultaneous Confidence Intervals (Known Covariance Matrix) | final | Baru: selang χ² dan Bonferroni (z) |
| Tests of Between-Subjects Effects (MV) | v5 | Type I/II Intercept = R(μ); baris alpha di catatan |
| Semua tabel MV/RM | v5 | Angka 4 desimal tetap; kolom Partial Eta Squared, Noncent. Parameter, Observed Power hanya bila opsinya dicentang |
| Tabel RM (Multivariate Tests, Within-Subjects Effects/Contrasts, Between-Subjects Effects) | v5 | Catatan kaki gaya SPSS |

## 5. Dialog dan opsi baru atau nonaktif

| Dialog | Versi | Perubahan |
|---|---|---|
| MV utama, panel Covariance Matrices | v4, final | Tombol "Test Values (δ₀)" dan ringkasan δ₀ (+ "· Σ known" / "· Σ₁, Σ₂ known") |
| MV Test Values (μ₀) | final | Kotak "Population covariance matrix (Σ) known" dan matriks Σ |
| MV Test Values (δ₀) (baru) | v4, final | Isian δ₀ per DV; kotak Σ, pilihan satu Σ atau Σ₁ dan Σ₂ |
| MV Paired | v3, final | Pesan pasangan belum lengkap (v3); kotak Σd di bagian C (final) |
| MV Options | v4 | Checkbox "Simultaneous CI (T² & Bonferroni)"; validasi Significance Level (0, 1) |
| MV Model, Sum of Squares Type IV | v5 | Ditolak (toast) bila ada sel kosong pada ≥ 2 faktor |
| RM Model | v5 | Hanya Type III aktif |
| RM Define | v3 | Validasi Number of Levels |

## 6. Kebutuhan fungsional (Tabel 5)

Usulan redaksi KF2–KF4 ("… dengan matriks kovarians populasi tidak diketahui (uji T²) maupun diketahui (uji khi-kuadrat) …") ada di `testing/black-box/pemetaan-kebutuhan.md` ("Perubahan final"). Usulan ini menunggu konfirmasi pembimbing.

## 7. Perapian teks tampilan (2026-09-26)

Teks yang terlihat pengguna di modul GLM Multivariate dan Repeated Measures dirapikan: tanda pisah panjang "—", pemisah " · ", tanda panah dalam kalimat, dan deskripsi tabel yang generik diganti. Perhitungan, payload, respons WASM, dan urutan tabel tidak berubah. Yang perlu disesuaikan di naskah (teks, gambar, dan sequence diagram yang menyebut judul):

| Tempat | Sebelum | Sesudah |
|---|---|---|
| Judul subdialog μ₀ | Test Values (μ₀) — Hotelling T² Satu Populasi | Multivariate: Test Values (μ₀) |
| Judul subdialog δ₀ | Test Values (δ₀) — Hotelling T² Dua Populasi | Multivariate: Test Values (δ₀) |
| Judul subdialog Paired | Paired (Hotelling T²) — Vektor Selisih | Multivariate: Paired |
| Tooltip Covariance Matrices | … tidak terpenuhi — misal saat Box's M test signifikan. | … tidak terpenuhi, misalnya bila uji Box's M signifikan. |
| Ringkasan δ₀ dan Σ | δ₀ = [3, 2, 10, 1] · Σ known / · Σ₁, Σ₂ known | δ₀ = [3, 2, 10, 1]; Σ known / ; Σ₁ and Σ₂ known |
| Judul Multivariate Tests berpasangan | Multivariate Tests — Hotelling T² Berpasangan | Multivariate Tests (baris efek tetap "Hotelling T² Berpasangan") |
| Baris efek Welch | jk — Welch-Satterthwaite | jk (Welch-Satterthwaite) |
| Catatan Welch | … (Welch-Satterthwaite for jk) — Computed using Welch-Satterthwaite approximation for unequal covariance matrices. | … (Welch-Satterthwaite for jk). The jk effect is computed with the Welch-Satterthwaite approximation for unequal covariance matrices. |
| Catatan R Squared (Tests of Between-Subjects Effects) | a. R Squared = … (Adjusted R Squared = …) — x1 | a. R Squared = … (Adjusted R Squared = …) for x1 |
| Judul tabel lain | Multiple Comparisons — f (m), Estimated Marginal Means — f, Between-Subjects SSCP Matrix — t, SSCP Matrix — c (MV dan RM), &lt;uji&gt; — Dependent Variable: y, Spread vs. Level — Dependent Variable: y | Multiple Comparisons: f (m), Estimated Marginal Means: f, Between-Subjects SSCP Matrix: t, SSCP Matrix: c, &lt;uji&gt;, Dependent Variable: y, Spread vs. Level, Dependent Variable: y |
| Grafik residual | Observed × Predicted × Std. Residual — y1 (entri "Observed × Predicted × Std. Residual Plots") | Residual Plots: y1 (entri "Residual Plots") |
| Label K-Matrix | 95% Confidence Interval — Lower/Upper Bound | 95% Confidence Interval, Lower/Upper Bound |
| Catatan CI simultan | … (α = 0.05 from Options → Significance Level). Krishnamoorthy–Yu, Welch–Satterthwaite | … (α = 0.05, the Significance Level in Options). Krishnamoorthy-Yu, Welch-Satterthwaite |
| Deskripsi tabel (halaman Result) | Kalimat generik, misalnya "A significant Sig. (< .05) indicates that the effect significantly influences …", "Useful for interpreting …", "— pure visual convention …", "Errors logs from the analysis." | Kalimat pendek yang menyebut isi tabel; batas Sig. merujuk ke Significance Level di Options (bukan ".05" tetap); "Messages and warnings produced during the analysis." (MV 24 deskripsi, RM 9) |
| Pesan pasangan belum lengkap (service) | Pair n is incomplete — both … | Pair n is incomplete: both … |
| Teks tur panduan RM/MV | (e.g. "time"), (e.g. 3 for pre / post / follow-up), (level × measure), analysed | such as "time", such as 3 for pre, post, and follow-up, one slot per level and measure, analyzed |
