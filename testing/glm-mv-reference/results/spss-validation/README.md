# Validasi GLM Multivariate terhadap SPSS 27

Diperbarui 2026-09-23, setelah perbaikan step 1–8d (branch `validation/mv-spss`, commit terakhir `a9fb2414`).

## Ringkasan

Nilai pembanding berasal dari keluaran SPSS 27 yang dijalankan pengguna dari `spss/mv1..mv7.sps` dan diekspor ke `spss-output/*.xlsx` (beserta `.spv`). Toleransinya |Statify − SPSS| ≤ 0,001.

- **Hasil akhir:** dari 1698 nilai SPSS, 1542 punya padanan di Statify, dan **ke-1542 nilai itu lulus (0 gagal)**. 156 nilai tidak punya padanan (§6).
- **Presisi:** selisih maksimum pada nilai SPSS presisi penuh adalah 5,8·10⁻¹⁰, termasuk Observed Power (maks 2,6·10⁻¹⁰). 74 nilai yang disimpan SPSS sebagai teks tiga desimal berselisih paling banyak 5,0·10⁻⁴.
- **Dari awal ke akhir:** validasi awal (mv1–mv5, kode `82a63b45`) memberi 887 lulus dan 77 gagal dari 964 nilai berpadanan. Kegagalan itu berasal dari 5 penyebab. Dataset turunan mv6 (two-way tak seimbang) dan mv7 (nilai hilang) memunculkan 3 penyebab lagi. Kedelapan penyebab diperbaiki satu per satu (§3, §4) tanpa regresi.
- **Pemeriksaan tiap langkah:** keluaran main thread dan web worker byte-identik untuk ketujuh konfigurasi, API publik WASM tidak berubah, dan Jest penuh kembali ke baseline 49 suite gagal (suite yang sudah gagal sebelum pekerjaan ini).

## 1. Alur

1. **Build produksi.** `next build`, lalu `next start -p 3101`.
2. **Jalur UI** (`harness/ui-run.cjs`, Playwright/Chromium). Tiap konfigurasi dijalankan pada konteks browser baru:
   - impor CSV `data/*.csv` lewat File > Import > CSV;
   - `localStorage["glm-execution-mode"]` = `"worker"` atau `"main"`;
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
   | mv6 | seperti mv5, data `two-way manova tak seimbang` (N = 26, ukuran sel 2–4) |
   | mv7 | seperti mv2, data `hotelling 2 populasi independen dengan nilai hilang` (67 baris, 62 lengkap) |

   Options untuk semua konfigurasi: Descriptive statistics, Estimates of effect size, dan Observed power. Homogeneity tests dicentang untuk mv2 dan mv4–mv7.

   Errors Logs kosong untuk mv1–mv6. mv7 mencatat "2 case(s) with missing values were excluded (listwise)." (§4.6).
3. **Pengambilan nilai Statify.** Harness memasang penyadap `Worker` di sisi uji; kode aplikasi tidak diubah untuk keperluan ini. Penyadap merekam:
   - payload permintaan ke worker (data yang sudah dipotong dan konfigurasi dialog);
   - hasil mentah WASM dalam respons worker, pada presisi penuh sebelum dibulatkan formatter: `<cfg>.raw.json`;
   - tabel yang disimpan dan ditampilkan aplikasi (4 desimal): `<cfg>.json`.
4. **Nilai acuan SPSS.** `harness/spss_extract.py` membaca xlsx dengan pustaka standar Python dan menulis `spss-output/spss-values.json`: 1698 nilai, masing-masing dengan `source` (berkas dan tabel).
5. **Perbandingan.** `harness/compare-spss.mjs` memakai pemetaan di `harness/mapping.mjs`.
   - **Sumber nilai Statify:** hasil mentah worker (presisi penuh). Sejak step 4, baris *Total* juga diambil dari hasil mentah.
   - **Pemeriksaan tampilan:** semua sel yang lulus juga dicek pada tabel tampilan, dan tidak ada yang gagal.
6. **Uji acuan Jest.**
   - Berkas: `frontend/.../multivariate/__test__/multivariate-reference.test.ts`, dengan fixture `__test__/fixtures/mv-reference-values.json` yang dibuat oleh `harness/make-fixture.mjs`.
   - Fixture memuat payload worker dari run UI dan semua nilai SPSS beserta sumbernya. Tidak ada nilai harapan yang berasal dari Statify.
   - Uji memutar ulang payload lewat `rust/pkg` dan `transformMultivariateResult`. Hasil akhirnya: **1542 lulus, 0 gagal, 156 todo** (todo = tanpa padanan). Angka ini sama dengan perbandingan jalur UI.

Nilai F yang dicetak SPSS dengan huruf catatan kaki ("2.436b", "Exact statistic" atau "upper bound") disimpan SPSS sebagai teks tiga desimal. Selisih wajar untuk nilai ini ≤ 5·10⁻⁴.

**Baris kosong di akhir data (mv2, mv7).** CSV termuat 67 baris, tetapi `getSlicedData` memotong baris kosong di ujung, sehingga payload ke WASM berisi 64 baris. Nilai hilang *di tengah* data (mv7: x2 kasus 15, x4 kasus 45) dibuang oleh listwise deletion di Rust (§4.6), sehingga N = 62, sama dengan SPSS.

## 2. Hasil akhir per tabel (step 8d)

Kolom tabel:

- **Dibandingkan:** nilai yang punya padanan di Statify.
- **Selisih maks:** selisih terbesar pada nilai SPSS presisi penuh.
- **Teks SPSS:** jumlah nilai yang disimpan SPSS sebagai teks tiga desimal, dan selisih terbesarnya.

| Konfig | Tabel | Nilai | Dibandingkan | Lulus | Tanpa padanan | Selisih maks | Teks SPSS |
|---|---|---|---|---|---|---|---|
| mv1 | Report (MEANS, variabel asli) ↔ Descriptive Statistics | 12 | 12 | 12 | 0 | 2,8·10⁻¹⁴ | — |
| mv1 | Descriptive Statistics (GLM, selisih x − μ₀) | 12 | 0 | 0 | 12 | — | — |
| mv1 | Multivariate Tests | 32 | 32 | 32 | 0 | 3,8·10⁻¹³ | 4 · 4,8·10⁻⁴ |
| mv1 | Tests of Between-Subjects Effects | 76 | 76 | 76 | 0 | 1,6·10⁻¹⁰ | 4 · 0 |
| mv2 | Between-Subjects Factors | 2 | 2 | 2 | 0 | 0 | — |
| mv2 | Descriptive Statistics | 36 | 36 | 36 | 0 | 3,6·10⁻¹⁵ | — |
| mv2 | Box's Test | 5 | 5 | 5 | 0 | 2,5·10⁻¹¹ | — |
| mv2 | Multivariate Tests | 64 | 64 | 64 | 0 | 3,2·10⁻¹² | 8 · 4,1·10⁻⁴ |
| mv2 | Levene's Test | 64 | 64 | 64 | 0 | 1,6·10⁻¹³ | — |
| mv2 | Tests of Between-Subjects Effects | 124 | 124 | 124 | 0 | 2,3·10⁻¹² | 4 · 5,0·10⁻⁴ |
| mv3 | Descriptive Statistics | 6 | 6 | 6 | 0 | 1,8·10⁻¹⁵ | — |
| mv3 | Multivariate Tests | 32 | 32 | 32 | 0 | 3,9·10⁻¹³ | 4 · 6,0·10⁻⁵ |
| mv3 | Tests of Between-Subjects Effects | 38 | 38 | 38 | 0 | 5,2·10⁻¹³ | 2 · 0 |
| mv4 | Between-Subjects Factors | 3 | 3 | 3 | 0 | 0 | — |
| mv4 | Descriptive Statistics | 24 | 24 | 24 | 0 | 8,9·10⁻¹⁶ | — |
| mv4 | Box's Test | 5 | 5 | 5 | 0 | 9,2·10⁻¹¹ | — |
| mv4 | Multivariate Tests | 64 | 64 | 64 | 0 | 7,6·10⁻¹³ | 6 · 1,4·10⁻⁴ |
| mv4 | Levene's Test | 32 | 32 | 32 | 0 | 5,8·10⁻¹⁵ | — |
| mv4 | Tests of Between-Subjects Effects | 62 | 62 | 62 | 0 | 5,3·10⁻¹³ | 2 · 0 |
| mv5 | Between-Subjects Factors | 6 | 6 | 6 | 0 | 0 | — |
| mv5 | Descriptive Statistics | 90 | 18 | 18 | 72 | 2,8·10⁻¹⁴ | — |
| mv5 | Box's Test | 5 | 5 | 5 | 0 | 2,7·10⁻¹² | — |
| mv5 | Multivariate Tests | 128 | 128 | 128 | 0 | 5,8·10⁻¹⁰ | 12 · 4,4·10⁻⁴ |
| mv5 | Levene's Test | 32 | 32 | 32 | 0 | 2,7·10⁻¹⁴ | — |
| mv5 | Tests of Between-Subjects Effects | 94 | 94 | 94 | 0 | 2,6·10⁻¹⁰ | 2 · 4,0·10⁻⁴ |
| mv6 | Between-Subjects Factors | 6 | 6 | 6 | 0 | 0 | — |
| mv6 | Descriptive Statistics | 90 | 18 | 18 | 72 | 2,8·10⁻¹⁴ | — |
| mv6 | Box's Test | 5 | 5 | 5 | 0 | 3,3·10⁻¹² | — |
| mv6 | Multivariate Tests | 128 | 128 | 128 | 0 | 2,2·10⁻¹⁰ | 12 · 3,1·10⁻⁴ |
| mv6 | Levene's Test | 32 | 32 | 32 | 0 | 2,0·10⁻¹⁴ | — |
| mv6 | Tests of Between-Subjects Effects | 94 | 94 | 94 | 0 | 9,1·10⁻¹¹ | 2 · 4,6·10⁻⁴ |
| mv7 | Between-Subjects Factors | 2 | 2 | 2 | 0 | 0 | — |
| mv7 | Descriptive Statistics | 36 | 36 | 36 | 0 | 7,1·10⁻¹⁵ | — |
| mv7 | Box's Test | 5 | 5 | 5 | 0 | 4,4·10⁻¹¹ | — |
| mv7 | Multivariate Tests | 64 | 64 | 64 | 0 | 6,8·10⁻¹² | 8 · 2,7·10⁻⁴ |
| mv7 | Levene's Test | 64 | 64 | 64 | 0 | 2,9·10⁻¹³ | — |
| mv7 | Tests of Between-Subjects Effects | 124 | 124 | 124 | 0 | 7,3·10⁻¹² | 4 · 4,2·10⁻⁴ |
| **Total** | | **1698** | **1542** | **1542** | **156** | **5,8·10⁻¹⁰** | **74 · 5,0·10⁻⁴** |

Sumber: `results/fix-steps/step8d-levene-adjusted-df/compare-spss.txt` dan `compare-spss.json`.

## 3. Riwayat perbaikan

Setiap langkah diperiksa dengan `harness/check-step.sh` dan hasilnya disimpan di `results/fix-steps/<langkah>/`. Isi pemeriksaan:

1. build WASM, dengan syarat glue JS dan `.d.ts` tidak berubah;
2. build produksi, lalu run UI ketujuh konfigurasi dalam mode main dan worker;
3. perbandingan SPSS, cek regresi terhadap langkah sebelumnya (`regress.mjs`), dan cek keluaran main = worker;
4. uji acuan Jest;
5. Jest penuh dibandingkan baseline 49 suite.

Satu commit per langkah.

| Langkah | Commit | Perbaikan | Lulus (sebelum → sesudah) | Nilai SPSS |
|---|---|---|---|---|
| step0-baseline | `466a296b` | Harness pemeriksaan per langkah; kode `82a63b45` | 887 | 1048 |
| step1-power | `d0862fa7` | Observed Power dari distribusi F nonsentral (§4.1) | 887 → 930 | 1048 |
| step2-hotelling-eta | `58d18c65` | Partial eta² Hotelling's Trace (§4.3) | 930 → 933 | 1048 |
| step3-box | `23c73a5e` | Box's F dan Sig. (§4.5) | 933 → 934 | 1048 |
| step4-total | `5c90a5c7` | Baris Total = Σ(y − μ₀)², df = n (§4.4) | 934 → 936 | 1048 |
| step5-display | `1519d1e2` | Tampilan Corrected Model df = 0 dan catatan jenis SS (§4.9) | 936 → 936 | 1048 |
| step6-type3 | `94165e9a` | SS Type III dari desain berkode deviasi; Intercept dan Type II (§4.2) | 936 → 964 | 1048 |
| step8a-mv67-before | `a0c2e531` | Keluaran SPSS mv6 dan mv7 ditambahkan; kode tidak diubah | 964 → 1259 | 1698 |
| step8b-listwise | `e6874140` | Listwise deletion (§4.6) | 1259 → 1470 | 1698 |
| step8c-mv-unbalanced | `d94a148f` | H uji multivariat untuk desain tak seimbang; builder desain lebih cepat (§4.7, §4.10) | 1470 → 1538 | 1698 |
| step8d-levene-adjusted-df | `a9fb2414` | df2 Levene "Based on Median and with adjusted df" (§4.8) | 1538 → **1542** | 1698 |

Semua langkah: **0 regresi**, main = worker byte-identik, dan API publik WASM tidak berubah.

Catatan Jest penuh: di step2, step8b, dan step8c, dua `multivariate.performance.test.ts` (ambang 5 detik) sempat gagal. Di step2 dan step8b penyebabnya beban mesin: waktunya setara HEAD saat diulang terpisah, dan step8b lulus setelah Jest penuh dijalankan ulang (catatan di pesan commit). Di step8c penyebabnya nyata, yaitu builder desain yang lambat. Masalah itu diperbaiki di langkah yang sama sebelum commit (§4.10).

## 4. Penyebab dan perbaikan

Semua path relatif ke `frontend/components/Modals/Analyze/general-linear-model/multivariate/`.

### 4.1 Observed Power (43 nilai + 4 di baris efek utama mv5)

- **Sebelum:**
  - `rust/src/stats/common.rs` `calculate_observed_power` menghitung `1 − exp(−λ/2)`, tanpa α dan df2.
  - `multivariate_tests.rs` memakai heuristik `1 − 0,1/F`.
- **Rumus SPSS:** Power = 1 − F_nc(F_crit(1 − α; df1, df2); df1, df2, λ = F·df1).
- **Perbaikan:**
  - `calculate_observed_power` memakai F nonsentral (`noncentral_f_cdf`, algoritme sama dengan modul RM yang sudah tervalidasi).
  - α diambil dari konfigurasi, baik untuk keempat statistik multivariat maupun Tests of Between-Subjects Effects.
- **Hasil:** 120 nilai Observed Power, selisih maksimum 2,6·10⁻¹⁰.

### 4.2 SS Type III efek utama bila ada interaksi (28 nilai, mv5)

- **Sebelum:**
  - `between_subjects_effects.rs` membuang kolom efek dari desain dummy 0/1. Dengan interaksi di model, cara itu menguji efek sederhana pada level referensi faktor lain.
  - SS Intercept hanya memakai faktor pertama.
  - Type II memakai rumus Type III.
- **Perbaikan:**
  - Type III (faktor, interaksi, Type IV) dihitung dari salinan desain berkode deviasi (`deviation_coded_design`). Desain dummy tetap dipakai untuk fit dan Parameter Estimates.
  - SS Intercept = SSE tanpa kolom intercept − SSE penuh, pada y − μ₀.
  - Type II menyesuaikan efek terhadap efek yang tidak memuatnya (`containing_effect_columns`).
- **Pemeriksaan tak seimbang:** `step6-type3/unbalanced-r-check.txt` (R `car::Anova`), selisih ≤ 2·10⁻¹⁰.

### 4.3 Partial eta² Hotelling's Trace bila s > 1 (3 nilai, mv4 dan mv5)

- **Sebelum:** `T/(1 + T)`.
- **Perbaikan:** (T/s)/(T/s + 1), dengan s = min(p, df_h), seperti SPSS.

### 4.4 Baris Total pada desain tak seimbang (2 nilai, mv4)

- **Sebelum:** formatter membentuk Total = SS Intercept + SS Corrected Total. Rumus ini hanya benar tanpa faktor atau pada desain seimbang.
- **Perbaikan:** Rust mengisi entri `Total` = Σ(y − μ₀)² dengan df = n, dan formatter memakainya.

### 4.5 Box's F bila ρ₂ < ρ₁² (1 nilai, mv4)

- **Sebelum:** cabang F = χ²/f₁, dan Sig. dihitung dengan df2 yang dibulatkan ke bawah.
- **Perbaikan:** F = (1 − ρ₁ − f₁/f₂)·M/f₁ dengan f₂ = (f₁ + 2)/|ρ₂ − ρ₁²| untuk semua kasus. Sig. dihitung dari F(f₁, f₂) tanpa pembulatan.

### 4.6 Nilai hilang di tengah data (211 nilai, mv7)

- **Sebelum:** Rust MV (`merge_records`) tidak membuang kasus yang hilang. N per variabel berbeda (x1 64, x2 63), dan semua tabel mv7 gagal.
- **Perbaikan:**
  - `common.rs` `listwise_complete_cases` membuang baris yang tidak punya angka berhingga pada setiap DV, kovariat, atau bobot WLS, atau yang punya nilai kosong pada faktor. Variabel yang diperiksa adalah yang dinamai di definisi, dan nilainya dicari di semua slot.
  - Fungsi ini dipakai sekali di awal `run_analysis` (`wasm/function.rs`), jadi semua tabel memakai kasus yang sama. Jumlah kasus yang dibuang dicatat di Errors Logs.
  - Bila tidak ada kasus lengkap, analisis berhenti dengan error.
- **Batas:** hanya system-missing. User-missing tidak ikut, karena `getVarDefs` mengirim `missing: []` (§6).

### 4.7 Uji multivariat efek utama dan interaksi pada desain tak seimbang (68 nilai, mv6)

- **Sebelum:** H efek utama = Σ n_k(ȳ_k − ȳ)(ȳ_k − ȳ)ᵀ, dan H interaksi dari deviasi sel terhadap marginal. Keduanya hanya tepat untuk desain seimbang, sehingga mv5 lulus tetapi mv6 gagal.
- **Perbaikan:**
  - `between_subjects_effects.rs` `effect_hypothesis_sscps` memakai desain dan jenis SS yang sama dengan Tests of Between-Subjects Effects.
  - Setiap jenis SS adalah SSE(model A) − SSE(model B) untuk dua himpunan kolom. Karena itu H = R_Aᵀ R_A − R_Bᵀ R_B, dengan R matriks residual semua DV, dan diagonalnya sama dengan SS univariat.
  - E adalah SSCP residual model penuh untuk semua efek.
- **Pemeriksaan jenis SS lain:** `step8c-mv-unbalanced/sstype-r-check.txt`. Type I (SSCP sekuensial, seperti `anova.mlm`), Type II, dan Type III (`car::Anova`) pada mv6 cocok dengan R, selisih ≤ 10⁻¹⁴.

### 4.8 df2 Levene "Based on Median and with adjusted df" (4 nilai, mv6)

- **Sebelum:** bentuk Welch, (Σ s²ᵢ/nᵢ)² / Σ[(s²ᵢ/nᵢ)²/(nᵢ − 1)]. Hasilnya sama dengan SPSS hanya bila semua nᵢ sama, sehingga mv2 dan mv5 lulus.
- **Perbaikan:** Satterthwaite atas SS gabungan, df2 = (Σ uᵢ)² / Σ[uᵢ²/(nᵢ − 1)], dengan uᵢ jumlah kuadrat dalam grup dari simpangan absolut terhadap median. Untuk mv6 hasilnya 11,13686 dan 10,56258, sama dengan SPSS.

### 4.9 Temuan tampilan (tanpa kegagalan numerik)

- **Corrected Model dengan df = 0 (mv1, mv3):** sebelumnya menampilkan Sig. "<.001" dan Observed Power 0. Sekarang Mean Square, F, Sig., dan Observed Power dikosongkan, seperti SPSS.
- **Catatan Multivariate Tests:** sebelumnya tertulis "Type TypeIII sum of squares"; sekarang "Type III sum of squares".

### 4.10 Kecepatan builder desain

- **Masalah:** `common.rs` `build_design_matrix_and_response` memanggil `get_factor_levels`, yang memindai seluruh data, untuk setiap baris dan setiap faktor.
- **Perbaikan:** level faktor sekarang dihitung sekali per build. Untuk 500 baris × 3 faktor, waktunya turun dari 678 ms ke 9 ms (native).
- **Dampak:** Tests of Between-Subjects Effects, Parameter Estimates, Save, dan H uji multivariat ikut lebih cepat. `multivariate.performance.test.ts` (500 baris × 5 DV × 3 faktor) turun dari 4,1 s ke 1,9 s.
- **Catatan perilaku:** data uji itu rank-deficient (F3 ditentukan oleh F1). Sejak step8c, Multivariate Tests melaporkan error inversi X'X seperti Tests of Between-Subjects Effects, bukan angka dari rumus lama.

## 5. Tanpa padanan (156 nilai)

- **Descriptive Statistics dua faktor (144 nilai, mv5 dan mv6).** `descriptive_statistics.rs` hanya memakai faktor pertama. Tabel berisi level faktorA dan Total, tanpa sel A×B dan tanpa marginal faktorB.
- **Descriptive Statistics GLM mv1 (12 nilai).** SPSS menampilkan statistik selisih x − μ₀, sedangkan Statify menampilkan variabel asli. Variabel asli sudah dibandingkan lewat tabel Report (12/12 lulus).

## 6. Belum dicakup

- **User-missing values.** `getVarDefs` (`frontend/hooks/useVariable.ts`, hook bersama) selalu mengirim `missing: []`, sehingga definisi user-missing tidak sampai ke Rust.
- **Desain rank-deficient atau sel kosong.** SPSS memakai invers umum. Statify berhenti dengan error inversi X'X. Type IV sama dengan Type III.
- **Mode Unequal (Welch-Satterthwaite, Krishnamoorthy-Yu):** tidak ada padanan di SPSS GLM.
- **Kovariat, WLS, Parameter Estimates, SSCP, EM Means, Post Hoc, Contrast, Plots, Save, Bootstrap:** tidak diminta di sintaks.
- **Kolom T² di Statify (mv1, mv3):** tidak punya padanan di SPSS.
- **Saved Variables:** tabel menomori kasus setelah listwise deletion (1..N lengkap), bukan nomor baris asli.

## 7. Cara mengulang

Satu langkah lengkap (build WASM, build produksi, run UI main dan worker, perbandingan SPSS, cek regresi, uji acuan, Jest penuh):

```
bash testing/glm-mv-reference/harness/check-step.sh <label> <compare-spss.json langkah sebelumnya> mv1,mv2,mv3,mv4,mv5,mv6,mv7
```

Langkah per bagian:

```
# server produksi di port 3101 (frontend: next build && next start -p 3101)
node testing/glm-mv-reference/harness/ui-run.cjs --base=http://localhost:3101 --configs=mv1,mv2,mv3,mv4,mv5,mv6,mv7 --mode=worker --out=<folder>
python testing/glm-mv-reference/harness/spss_extract.py
node testing/glm-mv-reference/harness/compare-spss.mjs --run=<folder> --out=<folder>
node testing/glm-mv-reference/harness/make-fixture.mjs --run=<folder>
cd frontend && npx jest components/Modals/Analyze/general-linear-model/multivariate/__test__/multivariate-reference.test.ts
```
