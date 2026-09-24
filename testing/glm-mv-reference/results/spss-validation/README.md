# Validasi GLM Multivariate terhadap SPSS 27

Diperbarui 2026-09-24 untuk **skripsi-final-v2** (branch `ilham`), setelah perbaikan step 1–14. Validasi v1 (`skripsi-final-v1`, step 1–10) tetap tercakup; v2 menambah mv8 (Two-Way tanpa interaksi) dan mv4ph (Multiple Comparisons).

## Ringkasan

Nilai pembanding berasal dari keluaran SPSS 27 yang dijalankan pengguna dari `spss/mv1..mv7.sps` dan diekspor ke `spss-output/*.xlsx` (beserta `.spv`). Toleransinya |Statify − SPSS| ≤ 0,001.

- **Hasil akhir (v2):** dari 2351 nilai SPSS (9 konfigurasi: mv1–mv8 dan mv4ph), 2339 punya padanan di Statify, dan **ke-2339 nilai itu lulus (0 gagal)**. 12 nilai tidak punya padanan (§5). (v1: 1686 dari 1698, mv1–mv7.)
- **Presisi:** selisih maksimum pada nilai SPSS presisi penuh adalah 5,8·10⁻¹⁰, termasuk Observed Power (maks 2,6·10⁻¹⁰). 108 nilai yang disimpan SPSS sebagai teks (tiga desimal, atau dua desimal bertanda `*` pada Multiple Comparisons) berselisih paling banyak 5,0·10⁻⁴.
- **Dari awal ke akhir:** validasi awal (mv1–mv5, kode `82a63b45`) memberi 887 lulus dan 77 gagal dari 964 nilai berpadanan. Kegagalan itu berasal dari 5 penyebab. Dataset turunan mv6 (two-way tak seimbang) dan mv7 (nilai hilang) memunculkan 3 penyebab lagi. Kedelapan penyebab diperbaiki satu per satu (§3, §4) tanpa regresi. Descriptive Statistics dua faktor ditambahkan di step 9.
- **Pemeriksaan tiap langkah:** keluaran main thread dan web worker byte-identik untuk ketujuh konfigurasi, dan Jest penuh kembali ke baseline 49 suite gagal (suite yang sudah gagal sebelum pekerjaan ini). API publik WASM (glue JS, `.d.ts`) tidak berubah di semua langkah.
- **API publik crate Rust:** sama dengan `82a63b45` sejak step 8e. Step 8b dan 8c sempat menambah dua fungsi `pub`, dan step 8e mengoreksinya (§4.11). Rincian perubahan kode ada di `results/thesis-impact.md`.

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
   | mv8 (v2) | seperti mv5; dialog **Model** → **Build Terms**, drag `faktorA` dan `faktorB` ke Model (model efek utama, `/DESIGN=faktorA faktorB`) |
   | mv4ph (v2) | seperti mv4; dialog **Post Hoc** → drag `treatment` ke "Post Hoc Tests for:", centang LSD, Bonferroni, Sidak (`/POSTHOC=treatment(LSD BONFERRONI SIDAK)`) |

   Options untuk semua konfigurasi: Descriptive statistics, Estimates of effect size, dan Observed power. Homogeneity tests dicentang untuk mv2 dan mv4–mv8 (termasuk mv4ph).

   Errors Logs kosong untuk mv1–mv6. mv7 mencatat "2 case(s) with missing values were excluded (listwise)." (§4.6).
3. **Pengambilan nilai Statify.** Harness memasang penyadap `Worker` di sisi uji; kode aplikasi tidak diubah untuk keperluan ini. Penyadap merekam:
   - payload permintaan ke worker (data yang sudah dipotong dan konfigurasi dialog);
   - hasil mentah WASM dalam respons worker, pada presisi penuh sebelum dibulatkan formatter: `<cfg>.raw.json`;
   - tabel yang disimpan dan ditampilkan aplikasi (4 desimal): `<cfg>.json`.
4. **Nilai acuan SPSS.** `harness/spss_extract.py` membaca xlsx dengan pustaka standar Python dan menulis `spss-output/spss-values.json`: 2351 nilai (v1: 1698), masing-masing dengan `source` (berkas dan tabel).
5. **Perbandingan.** `harness/compare-spss.mjs` memakai pemetaan di `harness/mapping.mjs`.
   - **Sumber nilai Statify:** hasil mentah worker (presisi penuh). Sejak step 4, baris *Total* juga diambil dari hasil mentah.
   - **Pemeriksaan tampilan:** semua sel yang lulus juga dicek pada tabel tampilan, dan tidak ada yang gagal.
6. **Uji acuan Jest.**
   - Berkas: `frontend/.../multivariate/__test__/multivariate-reference.test.ts`, dengan fixture `__test__/fixtures/mv-reference-values.json` yang dibuat oleh `harness/make-fixture.mjs`.
   - Fixture memuat payload worker dari run UI dan semua nilai SPSS beserta sumbernya. Tidak ada nilai harapan yang berasal dari Statify.
   - Uji memutar ulang payload lewat `rust/pkg` dan `transformMultivariateResult`. Hasil akhirnya (v2): **2339 lulus, 0 gagal, 12 todo** (todo = tanpa padanan). Angka ini sama dengan perbandingan jalur UI.

Nilai F yang dicetak SPSS dengan huruf catatan kaki ("2.436b", "Exact statistic" atau "upper bound") disimpan SPSS sebagai teks tiga desimal. Selisih wajar untuk nilai ini ≤ 5·10⁻⁴.

**Baris kosong di akhir data (mv2, mv7).** CSV termuat 67 baris, tetapi `getSlicedData` memotong baris kosong di ujung, sehingga payload ke WASM berisi 64 baris. Nilai hilang *di tengah* data (mv7: x2 kasus 15, x4 kasus 45) dibuang oleh listwise deletion di Rust (§4.6), sehingga N = 62, sama dengan SPSS.

## 2. Hasil akhir per tabel (step 14, skripsi-final-v2)

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
| mv5 | Descriptive Statistics | 90 | 90 | 90 | 0 | 2,8·10⁻¹⁴ | — |
| mv5 | Box's Test | 5 | 5 | 5 | 0 | 2,7·10⁻¹² | — |
| mv5 | Multivariate Tests | 128 | 128 | 128 | 0 | 5,8·10⁻¹⁰ | 12 · 4,4·10⁻⁴ |
| mv5 | Levene's Test | 32 | 32 | 32 | 0 | 2,7·10⁻¹⁴ | — |
| mv5 | Tests of Between-Subjects Effects | 94 | 94 | 94 | 0 | 2,6·10⁻¹⁰ | 2 · 4,0·10⁻⁴ |
| mv6 | Between-Subjects Factors | 6 | 6 | 6 | 0 | 0 | — |
| mv6 | Descriptive Statistics | 90 | 90 | 90 | 0 | 2,8·10⁻¹⁴ | — |
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
| mv8 | Between-Subjects Factors | 6 | 6 | 6 | 0 | 0 | — |
| mv8 | Descriptive Statistics | 90 | 90 | 90 | 0 | 2,8·10⁻¹⁴ | — |
| mv8 | Box's Test | 5 | 5 | 5 | 0 | 2,7·10⁻¹² | — |
| mv8 | Multivariate Tests (Intercept, faktorA, faktorB; tanpa interaksi) | 96 | 96 | 96 | 0 | 3,5·10⁻¹⁰ | 10 · 4,1·10⁻⁴ |
| mv8 | Levene's Test (satu baris per DV, residual model) | 8 | 8 | 8 | 0 | 3,9·10⁻¹⁴ | — |
| mv8 | Tests of Between-Subjects Effects (tanpa interaksi) | 78 | 78 | 78 | 0 | 1,2·10⁻¹⁰ | 2 · 2,1·10⁻⁴ |
| mv4ph | Between-Subjects Factors | 3 | 3 | 3 | 0 | 0 | — |
| mv4ph | Descriptive Statistics | 24 | 24 | 24 | 0 | 8,9·10⁻¹⁶ | — |
| mv4ph | Box's Test | 5 | 5 | 5 | 0 | 9,2·10⁻¹¹ | — |
| mv4ph | Multivariate Tests | 64 | 64 | 64 | 0 | 7,6·10⁻¹³ | 6 · 1,4·10⁻⁴ |
| mv4ph | Levene's Test | 32 | 32 | 32 | 0 | 5,8·10⁻¹⁵ | — |
| mv4ph | Tests of Between-Subjects Effects | 62 | 62 | 62 | 0 | 5,3·10⁻¹³ | 2 · 0 |
| mv4ph | Multiple Comparisons (LSD, Bonferroni, Sidak) | 180 | 180 | 180 | 0 | 4,3·10⁻¹¹ | 14 · 0 |
| **Total** | | **2351** | **2339** | **2339** | **12** | **5,8·10⁻¹⁰** | **108 · 5,0·10⁻⁴** |

Sumber: `results/fix-steps/step14-spss-v2/compare-spss.txt` dan `compare-spss.json`. Baris mv1–mv7 sama dengan step 9 dan step 10 (0 regresi).

## 3. Riwayat perbaikan

Setiap langkah diperiksa dengan `harness/check-step.sh` dan hasilnya disimpan di `results/fix-steps/<langkah>/`. Isi pemeriksaan:

1. build WASM, dengan syarat glue JS dan `.d.ts` tidak berubah dan, sejak step 8e, API publik crate Rust sama dengan `82a63b45` (`rust_api.py`);
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
| step8d-levene-adjusted-df | `a9fb2414` | df2 Levene "Based on Median and with adjusted df" (§4.8) | 1538 → 1542 | 1698 |
| step8e-private-api | `28b942db` | Koreksi API: pembantu step 8 dijadikan privat; `run_analysis` kembali seperti `82a63b45` (§4.11) | 1542 → 1542 | 1698 |
| step9-descriptive-two-factor | `ab21928c` | Descriptive Statistics dua faktor (§4.12) | 1542 → **1686** | 1698 |
| step10-welch-power | `1c7335d8` | Observed Power mode Unequal (Welch) dari F nonsentral (§4.13) | 1686 → 1686 | 1698 |
| step11-main-effects (v2) | `59fe397e` | Two-Way MANOVA tanpa interaksi dari dialog Model (§4.14) | — (dicek R) | 1698 |
| step12-posthoc (v2) | `53f1a978` | Post hoc MV: LSD, Bonferroni, Sidak per metode; CI Sidak (§4.15) | — (dicek R) | 1698 |
| step13-pre-spss (v2) | `d4dfd820`, `d1b3ab15` | Opsi yang tidak berfungsi dinonaktifkan; pemeriksaan lengkap sebelum SPSS mv8/mv4ph | 1686 → 1686 | 1698 |
| step14-spss-v2 (v2) | `d78df40b` | Keluaran SPSS mv8 dan mv4ph; Levene model efek utama seperti SPSS (§4.16) | 1686 → **2339** | 2351 |

Semua langkah: **0 regresi**, main = worker byte-identik, dan API publik WASM tidak berubah. API publik crate Rust sama dengan `82a63b45` di semua langkah kecuali 8b–8d (§4.11).

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
  - Fungsi ini dipanggil sekali sebelum analisis, jadi semua tabel memakai kasus yang sama. Jumlah kasus yang dibuang dicatat di Errors Logs. Sejak step 8e, fungsi ini privat di `wasm/constructor.rs` dan dipanggil di `MultivariateAnalysis::new`. Di step 8b fungsi ini `pub` di `common.rs` dan dipanggil di awal `run_analysis` (§4.11).
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

### 4.11 Koreksi aturan API (step 8e)

- **Masalah:** step 8b dan 8c menambah dua fungsi `pub`: `listwise_complete_cases` di `common.rs` dan `effect_hypothesis_sscps` di `between_subjects_effects.rs`. Ini melanggar aturan "tanpa item pub baru". Pemeriksaan per langkah saat itu hanya mengecek glue JS dan `.d.ts` WASM, sehingga pelanggaran tidak tertangkap.
- **Perbaikan:**
  - `listwise_complete_cases` menjadi fungsi privat di `wasm/constructor.rs`, dipanggil di `MultivariateAnalysis::new` sebelum `run_analysis`. `wasm/function.rs` kembali identik dengan `82a63b45`.
  - `effect_hypothesis_sscps` dan `residual_sscp` menjadi fungsi privat di `multivariate_tests.rs`, dengan salinan privat `deviation_coded_design` dan `containing_effect_columns`.
  - `check-step.sh` kini menjalankan `rust_api.py 82a63b45 WORKTREE` dan gagal bila ada perubahan publik.
- **Hasil:**
  - Tabel tampilan identik dengan step 8d.
  - Hasil mentah hanya berbeda ≤ 8,9·10⁻¹⁵ di Levene, ditambah urutan konteks di ringkasan error. Sebabnya urutan iterasi `HashMap` yang sudah ada (`step8e-private-api/refactor-check.txt`).

### 4.12 Descriptive Statistics dua faktor (144 nilai, mv5 dan mv6; step 9)

- **Sebelum:** `descriptive_statistics.rs` hanya memakai faktor pertama. Tabel berisi level faktorA dan Total, tanpa sel A×B dan tanpa marginal faktorB.
- **Perbaikan:**
  - Grup bertingkat lewat field `StatGroup.subgroups` yang sudah ada (fungsi privat `level_groups`): level faktor pertama → level faktor kedua + Total, lalu blok Total. Level diurutkan menaik seperti SPSS.
  - Formatter menambah satu kolom label per tingkat. Tabel satu faktor tidak berubah (tampilan mv1–mv4 dan mv7 identik dengan step 8e).
- **Label level:** baik tabel satu faktor maupun dua faktor menampilkan kode nilai ("1", "2"), bukan label nilai SPSS ("A1", "laki-laki"). Ini perilaku formatter yang sudah ada.

### 4.13 Observed Power mode Unequal / Welch (step 10; tanpa nilai SPSS)

- **Sebelum:** `calculate_welch_two_sample_t2` memakai heuristik 1 − 0,1/F (0,5 bila F ≤ 1). Mode ini tidak punya padanan di SPSS GLM, sehingga tidak tercakup langkah 1.
- **Perbaikan:** `calculate_observed_power(df1, df2, F, alpha)` dengan df (dibulatkan) dan F yang sama dengan Sig. entri tersebut, dan alpha = `config.options.sig_level.unwrap_or(0.05)`.
- **Hasil:** mv2 dengan radio Unequal (`jk`, Hotelling's Trace; F = 23,2926, df 4 dan 55): power 0,9957067968 → 0,9999999999300. Nilai dari R `1 − pf(qf(0,95; 4, 55), 4, 55, ncp = 4F)` = 0,9999999999306 (`step10-welch-power/welch-power-check.txt`). Tampilan mv1–mv7 identik dengan step 9, karena ketujuhnya memakai Equal (Pooled).

### 4.14 Two-Way MANOVA tanpa interaksi (v2, step 11; mv8)

- **Sebelum:** dialog Model menawarkan Full Factorial, Build Terms, dan Build Custom Terms, tetapi Rust tidak membaca isinya, sehingga desain selalu faktorial penuh.
- **Perbaikan:**
  - `normalize_model_spec` (privat, di awal `run_analysis`) mereduksi model ke faktorial penuh (`NonCust = true`) atau efek utama (`NonCust = false`). Bentuk lain ditolak dengan pesan.
  - Suku interaksi hanya masuk ke desain, H multivariat, dan tabel bila `NonCust`.
  - Pada model efek utama, H Intercept dan E dihitung dari desain aditif.
- **Hasil:** mv8 cocok dengan SPSS (283 nilai) dan R. Jalur faktorial penuh tidak berubah: keluaran mv1–mv7 dan sel eksperimen byte-identik dengan v1.

### 4.15 Multiple Comparisons (v2, step 12; mv4ph)

- **Sebelum:** hanya satu metode per analisis (prioritas Bonferroni → Sidak → LSD). Scheffe hanya mengganti label. Metode lain di dialog diabaikan. CI Sidak memakai 1 − (1 − α/2)^(1/c).
- **Perbaikan:**
  - Satu baris per metode yang dicentang (LSD, Bonferroni, Sidak), dan CI Sidak dengan α′ = 1 − (1 − α)^(1/c) seperti SPSS.
  - Dialog hanya mengaktifkan tiga metode itu.
  - Statify menyimpan pasangan I < J; baris SPSS (J, I) dicocokkan sebagai −(I, J) dengan batas CI ditukar.
- **Hasil:** 180 nilai lulus, selisih maksimum 4,3·10⁻¹¹.

### 4.16 Levene's Test untuk model selain faktorial penuh (v2, step 14; mv8)

- **Temuan dari SPSS:** untuk `/DESIGN=faktorA faktorB`, SPSS menampilkan satu baris per DV (F, df1 = 7, df2 = 24) dengan catatan "Design: Intercept + faktorA + faktorB", tanpa empat varian "Based on …". Nilainya sama dengan ANOVA atas 8 sel dari |residual model aditif| (dicek R: 1,04525383206 dan 2,04087113403), bukan |y − rata-rata sel|.
- **Perbaikan:** `model_residual_levene` (privat) untuk model efek utama, `test_basis` "Based on Model Residuals". Faktorial penuh tidak berubah.
- **Hasil:** 8 nilai lulus.

## 5. Tanpa padanan (12 nilai)

- **Descriptive Statistics GLM mv1 (12 nilai).** SPSS menampilkan statistik selisih x − μ₀, sedangkan Statify menampilkan variabel asli. Variabel asli sudah dibandingkan lewat tabel Report (12/12 lulus).

## 6. Belum dicakup

- **User-missing values.** `getVarDefs` (`frontend/hooks/useVariable.ts`, hook bersama) selalu mengirim `missing: []`, sehingga definisi user-missing tidak sampai ke Rust.
- **Desain rank-deficient atau sel kosong.** SPSS memakai invers umum. Statify berhenti dengan error inversi X'X. Type IV sama dengan Type III.
- **Mode Unequal (Welch-Satterthwaite, Krishnamoorthy-Yu):** tidak ada padanan di SPSS GLM.
- **Kovariat, WLS, Parameter Estimates, SSCP, EM Means, Contrast, Save, Bootstrap:** tidak diminta di sintaks.
- **Post Hoc (v2):** hanya LSD, Bonferroni, dan Sidak (divalidasi, mv4ph). Metode lain dinonaktifkan di dialog.
- **Plots:** dinonaktifkan di dialog (v2). Profile plots tidak ditampilkan.
- **Model kustom (v2):** hanya faktorial penuh dan model efek utama (semua faktor dan kovariat, tanpa interaksi). Model dengan sebagian interaksi, suku bersarang, atau interaksi dengan kovariat ditolak dengan pesan. Tabel sekunder pada model efek utama (Parameter Estimates, EM Means, SSCP, residual) mengikuti desain aditif tetapi tidak divalidasi SPSS.
- **Kolom T² di Statify (mv1, mv3):** tidak punya padanan di SPSS.
- **Saved Variables:** tabel menomori kasus setelah listwise deletion (1..N lengkap), bukan nomor baris asli.

## 7. Cara mengulang

Satu langkah lengkap (build WASM, build produksi, run UI main dan worker, perbandingan SPSS, cek regresi, uji acuan, Jest penuh):

```
bash testing/glm-mv-reference/harness/check-step.sh <label> <compare-spss.json langkah sebelumnya> mv1,mv2,mv3,mv4,mv5,mv6,mv7,mv8,mv4ph
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
