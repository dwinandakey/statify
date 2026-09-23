# Validasi GLM Multivariate terhadap SPSS 27 (2026-09-23)

## Ringkasan

Nilai pembanding berasal dari keluaran SPSS 27 yang dijalankan pengguna dari `spss/mv1..mv5.sps` dan diekspor ke `spss-output/*.xlsx` (beserta `.spv`). Statify diuji pada branch `validation/mv-spss`, commit `82a63b45`. **Kode modul Multivariate tidak diubah.**

- **Nilai SPSS:** 1048 nilai. 964 punya padanan di Statify: **887 lulus, 77 gagal**. 84 nilai tidak punya padanan.
- **Penyebab kegagalan:** 77 kegagalan berasal dari 5 penyebab (§4). Diagnosis selesai, tetapi **belum diperbaiki** sampai disetujui.
- **Tabel yang lulus seluruhnya:** Descriptive Statistics (kecuali sel dua faktor), Between-Subjects Factors, dan Levene's Test (4 baris per variabel). Selisih maksimumnya ≤ 10⁻¹³.
- **Tabel yang lulus, kecuali kolom yang disebut di §4:** Multivariate Tests dan Tests of Between-Subjects Effects. Kolom yang bermasalah adalah Observed Power, eta² Hotelling pada s > 1, efek utama Two-Way, baris Total pada desain tak seimbang, dan Box's F pada mv4.

## 1. Alur

1. **Build produksi.** `next build` dari commit `82a63b45`, lalu `next start -p 3101`.
2. **Jalur UI** (`harness/ui-run.cjs`, Playwright/Chromium 143). Tiap konfigurasi dijalankan pada konteks browser baru:
   - impor CSV `data/*.csv` lewat File > Import > CSV;
   - `localStorage["glm-execution-mode"] = "worker"`;
   - mengisi dialog asli: Analyze > General Linear Model > Multivariate;
   - klik OK dan tunggu tanda `glm-analysis-end`.

   Pengisian dialog per konfigurasi:

   | Konfigurasi | Isian dialog |
   |---|---|
   | mv1 | DV mpg, disp, hp, wt; tombol **Test Values** μ₀ = 20, 200, 150, 3 |
   | mv2 | DV x1–x4; Fixed Factor jk; radio **Equal (Pooled estimate of Σ)** |
   | mv3 | Tombol **Paired**: pasangan (kedalaman1, kedalaman2) dan (ukuran1, ukuran2) |
   | mv4 | DV y1, y2; Fixed Factor treatment |
   | mv5 | DV Y1A1, Y2A1; Fixed Factor faktorA, faktorB |

   Options untuk semua konfigurasi: Descriptive statistics, Estimates of effect size, dan Observed power. Homogeneity tests hanya untuk mv2, mv4, dan mv5.

   Kelima run berjalan dalam mode `worker` (terkonfirmasi dari tanda `glm-analysis-end`) dengan 0 error di Errors Logs (`statify-output/run-report.json`).
3. **Pengambilan nilai Statify.** Harness memasang penyadap `Worker` di sisi uji; kode aplikasi tidak diubah. Penyadap merekam:
   - payload permintaan ke worker (data yang sudah dipotong dan konfigurasi dialog);
   - hasil mentah WASM dalam respons worker, pada presisi penuh sebelum dibulatkan formatter: `statify-output/<cfg>.raw.json`;
   - tabel yang disimpan dan ditampilkan aplikasi (4 desimal): `statify-output/<cfg>.json`.
4. **Nilai acuan SPSS.** `harness/spss_extract.py` membaca xlsx dengan pustaka standar Python dan menulis `spss-output/spss-values.json`: 1048 nilai, masing-masing dengan `source` (berkas dan tabel).
5. **Perbandingan.** `harness/compare-spss.mjs` memakai pemetaan di `harness/mapping.mjs`, dengan toleransi |Statify − SPSS| ≤ 0,001.
   - **Sumber nilai Statify:** hasil mentah worker (presisi penuh). Satu pengecualian: baris *Total* pada Tests of Between-Subjects Effects dibentuk sendiri oleh formatter, jadi nilainya diambil dari tabel tampilan.
   - **Pemeriksaan tampilan:** semua sel yang lulus juga dicek pada tabel tampilan, dan tidak ada yang gagal.
   - **Keluaran:** `compare-spss.txt` dan `compare-spss.json`.
6. **Uji acuan Jest.**
   - Berkas: `frontend/.../multivariate/__test__/multivariate-reference.test.ts`, dengan fixture `__test__/fixtures/mv-reference-values.json` yang dibuat oleh `harness/make-fixture.mjs`.
   - Fixture memuat payload worker dari run UI dan semua nilai SPSS beserta sumbernya. Tidak ada nilai harapan yang berasal dari Statify.
   - Uji memutar ulang payload lewat `rust/pkg` dan `transformMultivariateResult`. Hasilnya: **887 lulus, 77 gagal, 84 todo** (todo = tanpa padanan). Angka ini sama dengan perbandingan jalur UI.
   - Uji ini adalah berkas baru di `__test__/`; kode modul tidak diubah.

Nilai F yang dicetak SPSS dengan huruf catatan kaki ("2.436b", "Exact statistic" atau "upper bound") disimpan SPSS sebagai teks tiga desimal (48 nilai). Selisih wajar untuk nilai ini ≤ 5·10⁻⁴.

**Baris kosong mv2.** CSV termuat 67 baris (`dataRows` = 67), tetapi payload ke WASM berisi 64 baris per variabel, karena `getSlicedData` memotong baris kosong di ujung. N = 64 di Between-Subjects Factors dan Descriptive Statistics sama dengan SPSS (N of Rows 67, dipakai 64).

## 2. Hasil per tabel

Kolom tabel:

- **Dibandingkan:** nilai yang punya padanan di Statify.
- **Selisih maks (lulus):** selisih terbesar di antara nilai yang lulus pada presisi penuh, tanpa Observed Power (lihat §4.1) dan tanpa nilai teks SPSS.
- **Teks SPSS:** selisih terbesar pada nilai yang disimpan SPSS dengan tiga desimal.

| Konfig | Tabel | Nilai | Dibandingkan | Lulus | Gagal | Tanpa padanan | Selisih maks (lulus) | Teks SPSS |
|---|---|---|---|---|---|---|---|---|
| mv1 | Report (MEANS, variabel asli) ↔ Descriptive Statistics | 12 | 12 | 12 | 0 | 0 | 2,8·10⁻¹⁴ | — |
| mv1 | Descriptive Statistics (GLM, selisih x − μ₀) | 12 | 0 | 0 | 0 | 12 | — | — |
| mv1 | Multivariate Tests | 32 | 32 | 28 | 4 | 0 | 1,5·10⁻¹³ | 4,8·10⁻⁴ |
| mv1 | Tests of Between-Subjects Effects | 76 | 76 | 72 | 4 | 0 | 1,2·10⁻¹⁰ | — ¹ |
| mv2 | Between-Subjects Factors | 2 | 2 | 2 | 0 | 0 | 0 | — |
| mv2 | Descriptive Statistics | 36 | 36 | 36 | 0 | 0 | 3,6·10⁻¹⁵ | — |
| mv2 | Box's Test | 5 | 5 | 5 | 0 | 0 | 3,9·10⁻⁹ | — |
| mv2 | Multivariate Tests | 64 | 64 | 60 | 4 | 0 | 3,2·10⁻¹² | 4,1·10⁻⁴ |
| mv2 | Levene's Test | 64 | 64 | 64 | 0 | 0 | 9,3·10⁻¹⁴ | — |
| mv2 | Tests of Between-Subjects Effects | 124 | 124 | 120 | 4 | 0 | 2,3·10⁻¹² | 5,0·10⁻⁴ |
| mv3 | Descriptive Statistics | 6 | 6 | 6 | 0 | 0 | 1,8·10⁻¹⁵ | — |
| mv3 | Multivariate Tests | 32 | 32 | 28 | 4 | 0 | 3,6·10⁻¹⁵ | 6,0·10⁻⁵ |
| mv3 | Tests of Between-Subjects Effects | 38 | 38 | 36 | 2 | 0 | 3,4·10⁻¹³ | — |
| mv4 | Between-Subjects Factors | 3 | 3 | 3 | 0 | 0 | 0 | — |
| mv4 | Descriptive Statistics | 24 | 24 | 24 | 0 | 0 | 8,9·10⁻¹⁶ | — |
| mv4 | Box's Test | 5 | 5 | 4 | 1 | 0 | 7,7·10⁻⁴ ² | — |
| mv4 | Multivariate Tests | 64 | 64 | 59 | 5 | 0 | 9,9·10⁻¹⁴ | 1,4·10⁻⁴ |
| mv4 | Levene's Test | 32 | 32 | 32 | 0 | 0 | 5,8·10⁻¹⁵ | — |
| mv4 | Tests of Between-Subjects Effects | 62 | 62 | 55 | 7 | 0 | 1,7·10⁻¹³ | — |
| mv5 | Between-Subjects Factors | 6 | 6 | 6 | 0 | 0 | 0 | — |
| mv5 | Descriptive Statistics | 90 | 18 | 18 | 0 | 72 | 2,8·10⁻¹⁴ | — |
| mv5 | Box's Test | 5 | 5 | 5 | 0 | 0 | 4,5·10⁻⁷ ³ | — |
| mv5 | Multivariate Tests | 128 | 128 | 118 | 10 | 0 | 5,8·10⁻¹⁰ | 4,4·10⁻⁴ |
| mv5 | Levene's Test | 32 | 32 | 32 | 0 | 0 | 2,7·10⁻¹⁴ | — |
| mv5 | Tests of Between-Subjects Effects | 94 | 94 | 62 | 32 | 0 | 1,5·10⁻¹⁰ | 4,0·10⁻⁴ |
| **Total** | | **1048** | **964** | **887** | **77** | **84** | | |

¹ Baris Total mv1 diambil dari tabel tampilan (4 desimal). Selisih maksimumnya 3,0·10⁻⁵.

² Sig. Box mv4 lulus (0,70558 vs 0,70635), tetapi berasal dari rumus yang sama dengan F yang gagal (§4.5).

³ Sig. dihitung dengan df2 yang dibulatkan ke bawah menjadi bilangan bulat (2064 alih-alih 2064,62), lihat §4.5.

**Selisih maksimum keseluruhan** di antara nilai yang lulus: 7,7·10⁻⁴ (Sig. Box mv4). Kalau Box mv4 dan nilai teks SPSS dikecualikan, selisih maksimumnya 3,9·10⁻⁹ (Sig. Box mv2).

## 3. Kegagalan (77) per penyebab

| Penyebab | Jumlah | Konfig | Contoh (Statify vs SPSS) |
|---|---|---|---|
| Observed Power: rumus pendekatan, bukan F non-sentral | 43 (+4 di baris efek utama mv5) | semua | mv1 Multivariate Intercept: 0,9589 vs 0,6199. mv4 BSE y2: 0,9933 vs 0,5331 |
| SS Type III efek utama pada desain dengan interaksi | 28 | mv5 | faktorA × ultimate strain: SS 124,03 vs 614,25; F 4,04 vs 20,02 |
| Partial eta² Hotelling's Trace bila s > 1 | 3 | mv4, mv5 | mv4 treatment: 0,9086 vs 0,8325 |
| Baris Total pada desain tak seimbang | 2 | mv4 | y1: 191,7143 vs 216; y2: 240 vs 272 |
| Box's F bila ρ₂ < ρ₁² | 1 | mv4 | 0,466600 vs 0,465540 |

Dari 74 nilai Observed Power, 27 "lulus" hanya kebetulan: kedua nilai mendekati 1 (19 nilai), atau pendekatannya kebetulan jatuh dekat nilai SPSS (8 nilai, mv4 Intercept dan mv5 faktorA). Rumusnya tetap salah untuk semua 74 nilai (§4.1).

## 4. Diagnosis (belum diperbaiki, menunggu persetujuan)

Semua path relatif ke `frontend/components/Modals/Analyze/general-linear-model/multivariate/`.

### 4.1 Observed Power

- **Univariat.** `rust/src/stats/common.rs:96-104` `calculate_observed_power` menghitung `1 − exp(−λ/2)` dengan λ = F·df1, tanpa α dan tanpa df2. Fungsi ini dipakai `between_subjects_effects.rs:113, 181, 278, 364` (Corrected Model, Intercept, faktor, interaksi).
- **Multivariat.** `rust/src/stats/multivariate_tests.rs:993-996` memakai heuristik `1 − 0,1/F` (atau 0,5 bila F ≤ 1). Parameter `alpha` diabaikan (`let _ = alpha;`, baris 998).
- **Rumus SPSS.** Power = 1 − F_nc(F_crit(1−α; df1, df2); df1, df2, λ = F·df1). Dicek dengan R (`pf(qf(.95,d1,d2), d1, d2, ncp=F*d1, lower=FALSE)`):
  - mv1 Multivariate 0,6198564457 (SPSS 0,6198564454);
  - mv4 BSE y2 0,5330993767 (SPSS 0,5330993763);
  - mv5 faktorB Pillai 0,5230071712 (SPSS 0,5230071710).
- **Perbaikan.**
  - Port `noncentral_f_cdf` dan `observed_power` dari `repeated-measures/rust/src/stats/glm_tests.rs:14-85`, yang sudah tervalidasi SPSS pada modul RM.
  - Ganti isi `calculate_observed_power`.
  - Pada `multivariate_tests.rs:993-996`, pakai `observed_power(f, df1, df2, alpha)` per statistik.
- **Ukuran:** kecil, sekitar 80 baris dan satu kali rebuild WASM (sekitar 1–2 jam termasuk validasi ulang).
- **Terkait, di luar cakupan validasi ini:** `calculate_observed_power_t` (`common.rs:107-115`, untuk Parameter Estimates) memakai pendekatan serupa, dan power Welch di `multivariate_tests.rs:330` tidak punya padanan SPSS.

### 4.2 SS Type III efek utama bila ada interaksi (mv5)

- **Lokasi.** `rust/src/stats/between_subjects_effects.rs:487-517` `calculate_type_iii_ss` membuang kolom efek dari desain dummy 0/1 (sel referensi) buatan `core::build_design_matrix_and_response`, lalu mengambil selisih SSE.
- **Akibat.** Kalau model memuat interaksi, cara ini menguji efek sederhana pada level referensi faktor lain. Contoh: SS faktorA untuk ultimate torque = 0,10125, persis efek A pada B4 (4·(7,555 − 7,33)²/2). Nilai SPSS adalah 1,2051.
- **Yang sudah benar.** Interaksi dan uji multivariat efek utama sudah benar, karena memakai jalur lain.
- **Perbaikan.** Hitung SS Type III dari desain berkode deviasi (sum-to-zero) khusus di `between_subjects_effects.rs`, sementara desain dummy tetap dipakai untuk Parameter Estimates. Dengan desain itu, membuang kolom efek memberi Type III yang benar selama tidak ada sel kosong.
- **Ukuran:** sedang, sekitar 60–100 baris (sekitar setengah hari termasuk uji data tak seimbang).
- **Terkait, tidak menimbulkan kegagalan di data ini:**
  - SS Intercept (baris 138-174) hanya memakai `fix_factor[0]`.
  - Type II (baris 457-485) memakai rumus yang sama dengan Type III.
  - H multivariat efek utama (`multivariate_tests.rs`, cabang "Main effect — single factor", sekitar baris 532-590) memakai Σ n_k(ȳ_k − ȳ)(ȳ_k − ȳ)ᵀ, yang hanya tepat untuk desain multi-faktor seimbang. mv5 seimbang, jadi hasilnya lulus.

### 4.3 Partial eta² Hotelling's Trace (mv4, mv5)

- **Lokasi.** `rust/src/stats/multivariate_tests.rs:936` menghitung `T/(1+T)`.
- **Rumus SPSS.** (T/s)/(T/s + 1), dengan s = min(p, df_h). Contoh mv5 faktorB: (0,43775/2)/(0,43775/2 + 1) = 0,17957146818977 (SPSS 0,17957146818977177).
- **Ukuran:** 1–2 baris.

### 4.4 Baris Total (mv4)

- **Lokasi.** `services/multivariate-analysis-formatter.ts:790-804` membentuk Total = SS Intercept (Type III) + SS Corrected Total.
- **Akibat.** Rumus ini hanya sama dengan Σy² bila SS Intercept = n·ȳ², yaitu tanpa faktor atau pada desain seimbang. mv4 (n = 3, 2, 3) memberi 191,7143 dan 240, sedangkan SPSS memberi 216 dan 272.
- **Perbaikan.** Rust menghitung Total = Σ(y − μ₀)² dengan df = n (`between_subjects_effects.rs`, di sebelah Corrected Total, baris 212-222), lalu formatter memakainya.
- **Ukuran:** kecil, sekitar 30 baris Rust + TS.

### 4.5 Box's F (mv4)

- **Lokasi.** `rust/src/stats/box_m_test.rs:155-162`. Bila ρ₂ < ρ₁², Statify memakai F = χ²/f₁ = (1 − ρ₁)·M/f₁.
- **Rumus SPSS.** SPSS tetap memakai F = (1 − ρ₁ − f₁/f₂)·M/f₁ dengan f₂ = (f₁ + 2)/|ρ₂ − ρ₁²|. Hasilnya 0,4655399750614528, sama dengan SPSS 0,46553997506145306.
- **Masalah kedua.** Sig. dihitung dengan `df2_val as usize` (baris 153), sehingga df2 dibulatkan ke bawah (mv5: 2064,62 → 2064, selisih Sig. 4,5·10⁻⁷).
- **Catatan.** Grup 2 mv4 (n = 2 ≤ p) dikeluarkan oleh Statify dan juga oleh SPSS (df1 = 3 di keduanya).
- **Ukuran:** kecil, sekitar 10 baris.

### 4.6 Temuan tanpa kegagalan numerik

- **Descriptive Statistics dua faktor (72 nilai tanpa padanan).** `rust/src/stats/descriptive_statistics.rs:44` hanya memakai `factors[0]`. Tabel mv5 berisi level faktorA dan Total saja, tanpa sel A×B dan tanpa marginal faktorB. `StatGroup.subgroups` sudah ada tetapi belum dipakai.
  - Perbaikan: Rust (sel dan marginal sesuai urutan SPSS) + `formatDescriptiveStatistics`.
  - Ukuran: sedang, sekitar 100–150 baris.
- **Corrected Model dengan df = 0 (mv1, mv3, intercept-only).** Tabel menampilkan Sig. "<.001" dan Observed Power "0", sedangkan SPSS mengosongkan keduanya.
  - Penyebab: `calculate_f_significance` mengembalikan 0 untuk df1 = 0 (`common.rs:40-41`), dan `blankInferential` di formatter (`multivariate-analysis-formatter.ts:855-884`) tidak memperhitungkan df = 0.
  - Ukuran: beberapa baris.
- **Catatan tabel Multivariate Tests** tertulis "Type TypeIII sum of squares". Ini kosmetik.

## 5. Belum dicakup

- **Mode Unequal (Welch-Satterthwaite, Krishnamoorthy-Yu):** tidak ada padanan di SPSS GLM.
- **Desain multi-faktor tak seimbang:** mv5 seimbang. Risiko pada H multivariat efek utama dan SS Intercept (§4.2) belum diuji.
- **Kovariat, WLS, Parameter Estimates, SSCP, EM Means, Post Hoc, Contrast, Plots, Save, Bootstrap:** tidak diminta di sintaks.
- **Missing value di tengah data:** Rust MV (`merge_records`) tidak melakukan listwise deletion. Validasi ini hanya mencakup baris kosong di ujung (mv2).
- **SPSS Descriptive Statistics GLM mv1** (statistik x − μ₀). Statify menampilkan variabel asli, dan variabel asli sudah dibandingkan lewat tabel Report (12/12 lulus).
- **Kolom T² di Statify (mv1, mv3):** tidak punya padanan di SPSS.

## 6. Cara mengulang

```
# server produksi di port 3101 (frontend: next build && next start -p 3101)
node testing/glm-mv-reference/harness/ui-run.cjs --base=http://localhost:3101 --mode=worker
python testing/glm-mv-reference/harness/spss_extract.py
node testing/glm-mv-reference/harness/compare-spss.mjs
node testing/glm-mv-reference/harness/make-fixture.mjs
cd frontend && npx jest components/Modals/Analyze/general-linear-model/multivariate/__test__/multivariate-reference.test.ts
```
