# Pemetaan kebutuhan fungsional (Tabel 5) ke kode: GLM Multivariate dan GLM Repeated Measures

- **Versi yang dipetakan:** branch `ilham`, tag `skripsi-final-v1` (commit `e365897d`).
- **Metode:** penelusuran kode saja (dialog, subdialog, service, formatter, dan crate Rust). Tidak ada kode yang diubah dan tidak ada pengujian yang dijalankan.
- **Path singkatan:**
  - `MV/` = `frontend/components/Modals/Analyze/general-linear-model/multivariate/`
  - `RM/` = `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/`
  - `GLM/` = `frontend/components/Modals/Analyze/general-linear-model/`

## Ringkasan status

| KF | Kebutuhan (ringkas) | Status |
|---|---|---|
| KF1 | Pemilihan analisis di kelompok GLM Multivariate | TERPENUHI (pemilihan implisit lewat isian dialog, lihat catatan) |
| KF2 | Uji vektor rata-rata satu populasi | TERPENUHI |
| KF3 | Uji dua populasi, kovarians sama dan tidak sama | TERPENUHI (varian "tidak sama" tanpa acuan SPSS) |
| KF4 | Uji berpasangan | TERPENUHI |
| KF5 | One-Way MANOVA | TERPENUHI |
| KF6 | Two-Way MANOVA dengan dan tanpa interaksi | **SEBAGIAN**: "tanpa interaksi" tidak berjalan |
| KF7 | Pemilihan analisis di kelompok GLM Repeated Measures | TERPENUHI |
| KF8 | Antarmuka pendefinisian faktor within-subjects | TERPENUHI (dengan catatan validasi) |
| KF9 | Desain pengukuran berulang | TERPENUHI (satu faktor within) |
| KF10 | Uji asumsi opsional: normalitas multivariat, Box's M, Mauchly | **SEBAGIAN**: normalitas multivariat tidak ada; Mauchly tidak opsional |
| KF11 | Uji lanjut (post hoc) opsional | **SEBAGIAN**: MV hanya 4 metode (Scheffe hanya label); Post Hoc RM tidak menghasilkan perbandingan |
| KF12 | Analisis profil (kesejajaran, kesamaan level, kerataan) dan grafik profil | **BELUM** |
| KF13 | Hasil analisis sesuai data dan konfigurasi | TERPENUHI |
| KF14 | Melihat hasil dalam tabel dan grafik | **SEBAGIAN**: tabel lengkap; grafik hanya residual plot MV |

---

## KF1. Pemilihan analisis pada kelompok GLM Multivariate — TERPENUHI (dengan catatan)

**a. Fitur:**
- **Menu:** Analyze → General Linear Model → **Multivariate** (`GLM/general-linear-model-menu.tsx`, `ModalType.ModalMultivariate`).
- **Dialog utama:** `MV/dialogs/dialog.tsx`, dengan daftar Dependent Variables, Fixed Factor(s), Covariate(s), dan WLS Weight, serta tombol Model, Contrasts, Plots, Post Hoc, EM Means, Save, Options, Bootstrap, **Test Values**, dan **Paired**.
- **Pemilihan prosedur:** prosedur peubah ganda dipilih lewat isian dialog, bukan lewat daftar prosedur:

| Prosedur | Isian yang memilihnya |
|---|---|
| Uji vektor rata-rata satu populasi | ≥ 2 DV, tanpa faktor, Test Values (μ₀) diisi |
| Dua populasi | ≥ 2 DV, 1 Fixed Factor dengan 2 level, radio **Covariance Matrices** |
| Berpasangan | Tombol **Paired** (pasangan variabel) |
| One-Way MANOVA | ≥ 2 DV, 1 Fixed Factor dengan > 2 level |
| Two-Way MANOVA | ≥ 2 DV, 2 Fixed Factor |

- **Bantuan:** tur fitur (ikon ?) dan halaman bantuan GLM di help center (`frontend/app/help/components/statistics-guide/multivariate/`).

**b. Bukti:** `MV/dialogs/dialog.tsx` (`handleContinue` baris 242–286; tombol baris 347–416; radio baris 422–491).

**Catatan:** tidak ada daftar atau pilihan eksplisit "prosedur" (misalnya dropdown berisi lima prosedur). Status TERPENUHI bila "fitur pemilihan analisis" diartikan sebagai menu **Multivariate** beserta konfigurasi dialog. Bila KF1 dimaksudkan sebagai pemilih prosedur eksplisit, statusnya SEBAGIAN.

## KF2. Uji vektor rata-rata satu populasi — TERPENUHI

**a. Fitur:**
- **Subdialog Test Values:** judul "Test Values (μ₀) — Hotelling T² Satu Populasi" (`MV/dialogs/test-values.tsx`), dengan isian `mu0-0`, `mu0-1`, … per DV, serta tombol **Continue**, **Cancel**, dan **Clear**.
- **Validasi dialog utama:** tanpa faktor, dialog meminta ≥ 2 DV. Syarat "fixed factor or covariate" dilewati bila Test Values terisi.
- **Keluaran:** Descriptive Statistics, Multivariate Tests (baris Intercept, uji H₀: μ = μ₀), dan Tests of Between-Subjects Effects (Corrected Model, Intercept, Error, Total, Corrected Total).

**b. Bukti:**
- `MV/dialogs/dialog.tsx` baris 250–277;
- `MV/dialogs/multivariate-main.tsx` baris 181–195: panjang μ₀ disesuaikan otomatis dengan jumlah DV saat OK;
- Rust `MV/rust/src/stats/multivariate_tests.rs` (cabang Intercept memakai `config.main.test_values`).
- **Validasi SPSS:** mv1, `testing/glm-mv-reference/results/spss-validation/README.md`.

**Catatan untuk skenario negatif:** jumlah μ₀ yang berbeda dari jumlah DV **tidak dapat terjadi lewat UI**.
- Subdialog selalu membuat satu isian per DV (`resizeTestValues`), dan saat OK vektor dipotong atau ditambah 0 (`multivariate-main.tsx` baris 181–195).
- Pesan Rust `TestValues must have the same length as Dependent Variables. Got {} values for {} dependent variables.` (`MV/rust/src/wasm/constructor.rs` baris 172–183) tidak terjangkau dari UI.

## KF3. Dua populasi, kovarians sama dan tidak sama — TERPENUHI (dengan catatan)

**a. Fitur:**
- **Radio Covariance Matrices:** muncul di dialog utama **hanya bila Fixed Factor tepat satu**. Pilihannya:
  - **Equal (Pooled estimate of Σ)** (`variance-pooled`, bawaan);
  - **Unequal (Welch-Satterthwaite)** (`variance-welch`).
  - Tooltip menyebut Unequal untuk Σ₁ ≠ Σ₂ dan hanya berlaku untuk faktor dengan tepat 2 level.
- **Equal:** Hotelling T² dua sampel lewat GLM (Multivariate Tests baris faktor, empat statistik), divalidasi SPSS (mv2).
- **Unequal:** `calculate_welch_two_sample_t2` (Krishnamoorthy–Yu). Entri faktor diganti hanya dengan baris **Hotelling's Trace**, dan catatan tabel menjadi "… sum of squares (Welch-Satterthwaite for <faktor>)".

**b. Bukti:** `MV/dialogs/dialog.tsx` baris 153–159 dan 422–491; `MV/rust/src/stats/multivariate_tests.rs` (`calculate_multivariate_tests` cabang `VarianceMode::Welch`, `calculate_welch_two_sample_t2`).

**Catatan:**
- **Unequal tidak punya padanan di SPSS GLM**, sehingga tidak divalidasi SPSS. Power-nya dicek terhadap R (`testing/glm-mv-reference/results/fix-steps/step10-welch-power/welch-power-check.txt`).
- **Faktor dengan ≠ 2 level:** Rust menolak dengan `VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>.`, dicatat di Errors Logs dan Multivariate Tests tidak tampil.

## KF4. Uji berpasangan — TERPENUHI

**a. Fitur:**
- **Subdialog Paired:** judul "Paired (Hotelling T²) — Vektor Selisih" (`MV/dialogs/paired.tsx`). Pengguna menyusun pasangan Variable 1 dan Variable 2, dengan δ₀ opsional.
- **Pesan validasi:**
  - "Tambahkan minimal satu pasangan variabel.";
  - "Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris.";
  - "Pasangan harus berisi dua variabel yang berbeda.".
- **Cara kerja:** analisis dijalankan sebagai uji satu populasi pada vektor selisih (`MV/services/paired-difference.ts`, `multivariate-analysis.ts` baris ±105–115).
- **Keluaran:** Descriptive Statistics (nama "v1 − v2"), Multivariate Tests (Intercept), dan Tests of Between-Subjects Effects.

**b. Bukti:** berkas di atas; validasi SPSS mv3.

## KF5. One-Way MANOVA — TERPENUHI

**a. Fitur:** ≥ 2 DV dan satu Fixed Factor dengan > 2 level.
- Keluaran: Between-Subjects Factors, Descriptive Statistics, Multivariate Tests (Intercept dan faktor; Pillai, Wilks, Hotelling, Roy), dan Tests of Between-Subjects Effects.
- Opsional: Box's Test dan Levene's Test.

**b. Bukti:** `MV/rust/src/stats/multivariate_tests.rs`, `between_subjects_effects.rs`; validasi SPSS mv4.

## KF6. Two-Way MANOVA dengan dan tanpa interaksi — SEBAGIAN

**a. Fitur:**
- **Dengan interaksi (bawaan, Full Factorial):** 2 Fixed Factor. Multivariate Tests dan Tests of Between-Subjects Effects memuat baris A, B, dan **A * B**. Descriptive Statistics bertingkat (A × B dan marginal). Divalidasi SPSS: mv5 (seimbang) dan mv6 (tak seimbang).
- **Dialog Model** (`MV/dialogs/model.tsx`): radio **Full Factorial**, **Build Terms** (metode dari `MV/constants/multivariate-method.ts`: `interaction`, `mainEffects`, `all2Way`, …), dan **Build Custom Terms**, serta Sum of squares dan Include intercept.

**c. Yang tidak ada:** **model tanpa interaksi tidak dijalankan.**
- Crate Rust MV tidak pernah membaca field model kustom: `FactorsModel`, `TermsVar`, `TermText`, `BuildTermMethod`, `CovModel`, dan `FactorsVar`. `grep` di `MV/rust/src` di luar `models/config.rs` dan `test/` tidak menemukan pemakaian. `NonCust`, `Custom`, dan `BuildCustomTerm` hanya dicek di `MV/rust/src/wasm/constructor.rs` baris 144 (validasi "Model specification method must be selected").
- Desain selalu faktorial penuh. `build_design_matrix_and_response` (`MV/rust/src/stats/common.rs`) selalu menambah semua suku interaksi (`generate_interaction_terms`), dan `calculate_multivariate_tests` selalu membuat baris interaksi bila faktor > 1.
- **Akibat:** memilih **Build Terms → Main effects** di dialog Model tetap menghasilkan baris **A * B**, dan SS efek utama dihitung dari model penuh.
- Yang dibaca dari dialog Model hanya **Sum of squares** (`SumOfSquareMethod`) dan **Include intercept** (`Intercept`).

## KF7. Pemilihan analisis pada kelompok GLM Repeated Measures — TERPENUHI

**a. Fitur:** menu Analyze → General Linear Model → **Repeated Measures** (`ModalType.ModalRepeatedMeasures`) membuka dialog **Define** lebih dulu, lalu dialog utama. Kelompok ini hanya punya satu prosedur (desain pengukuran berulang). Dialog utama berisi Within-Subjects Variables, Between-Subjects Factor(s), dan Covariates, serta tombol Model, Contrasts, Plots, Post Hoc, EM Means, Save, Options, dan **Back to Define**.

**b. Bukti:** `GLM/general-linear-model-menu.tsx`; `RM/dialogs/repeated-measures-main.tsx`; `RM/dialogs/dialog.tsx`.

## KF8. Antarmuka pendefinisian faktor within-subjects — TERPENUHI (dengan catatan)

**a. Fitur:** dialog **Define** (`RM/dialogs/define/repeated-measures-dialog.tsx`):
- **Isian:** Within-Subject Factor Name dan Number of Levels, dengan tombol **Add**, **Change**, dan **Remove** (Change/Remove aktif hanya bila ada faktor terpilih); Measure Name dengan tombol **Add**, **Change**, dan **Remove**; serta tombol **Reset**, **Cancel**, dan **Define**.
- **Pesan validasi:**
  - "Factor name cannot be empty.";
  - "Factor name cannot contain spaces or special characters. Use only letters, numbers, and underscores.";
  - "A factor with this name already exists.";
  - "Number of levels must be a valid number.";
  - "Number of levels must be between 2 and 99.";
  - "Measure name cannot be empty.";
  - "Measure name cannot contain spaces or special characters. Use only letters, numbers, and underscores.";
  - "A measure with this name already exists.".
- **Faktor within kedua ditolak** saat **Add** (baris 150–152) dan saat **Define** (baris 338–341) dengan toast **"Designs with more than one within-subjects factor are not supported in this version."** (dengan titik di akhir). Rust juga menolaknya: `RmModel::build` gagal dan alasannya masuk Errors Logs.

**Catatan:**
1. **Define tidak memvalidasi isi.** Dialog tetap lanjut walaupun tidak ada faktor atau tidak ada measure. `generateCombinations` mengembalikan daftar kosong (baris 295), sehingga dialog utama tidak punya slot within.
   - Saat OK, konstruktor Rust menolak dengan "At least one subject variable must be selected for repeated measures analysis" (`RM/rust/src/wasm/constructor.rs` baris 111–116).
   - Namun `executeRepeatedMeasures` (`RM/dialogs/repeated-measures-main.tsx` baris 250–290) hanya mencetak galat ke konsol lalu menutup dialog. **Tidak ada pesan yang tampil ke pengguna.**
2. **Measure wajib** diisi agar slot within terbentuk.

## KF9. Desain pengukuran berulang — TERPENUHI

**a. Fitur:** satu faktor within (2–99 level), satu atau lebih measure, faktor between dan kovariat opsional.
- **Keluaran:** Within-Subjects Factors, Descriptive Statistics, Multivariate Tests, Mauchly's Test of Sphericity, Tests of Within-Subjects Effects (Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, Lower-bound), Tests of Within-Subjects Contrasts (bawaan Polynomial, atau Repeated lewat dialog Contrasts), dan Tests of Between-Subjects Effects.
- **Dengan > 1 measure:** Tests of Within-Subjects Effects (Multivariate).
- **Listwise:** "N subject(s) with missing values were excluded (listwise)." di Errors Logs.

**b. Bukti:** `RM/rust/src/stats/rm_model.rs` (`RmModel`), `RM/rust/src/wasm/function.rs` (`run_analysis`); validasi SPSS 1318 nilai (gambar51, a, b, c, d) di `testing/glm-rm-reference/results/`.

## KF10. Pemeriksaan asumsi opsional — SEBAGIAN

| Uji | MV | RM | Opsional? |
|---|---|---|---|
| **Normalitas multivariat** | **Tidak ada** | **Tidak ada** | — |
| **Box's M** | Options → **Homogeneity tests** (`HomogenTest`) → Box's Test of Equality of Covariance Matrices | Options → **Homogeneity tests** → Box's Test (di Homogeneity Tests) | Ya, di kedua modul |
| **Mauchly** | Tidak relevan (tidak ada faktor within) | **Selalu dihitung** (Mauchly's Test of Sphericity) | **Tidak** |
| Levene (bukan KF10, ikut Homogeneity tests) | Levene's Test of Equality of Error Variances | Levene's Test (di Homogeneity Tests) | Ya |
| Bartlett's Test of Sphericity | Ikut Homogeneity tests | Ikut **Residual SSCP matrix** | Ya |

**b. Bukti:**
- MV `MV/rust/src/wasm/function.rs` baris 47–85: Box, Bartlett, dan Levene hanya bila `config.options.homogen_test`.
- RM `RM/rust/src/wasm/function.rs`: Homogeneity baris 107–125 (bila `homogen_test`); Mauchly baris 159–180 (tanpa syarat, `executed_functions.push("calculate_mauchly_test")` selalu).

**c. Yang tidak ada:**
1. **Uji normalitas multivariat tidak ada di kedua modul.** `grep` Mardia, Henze, Royston, normality, dan Shapiro di `MV/` dan `RM/` tidak menemukan apa pun, dan tidak ada opsi di dialog Options. (Mardia hanya ada di modul lain, `Analyze/Classify/discriminant`, di luar cakupan GLM.)
2. **Mauchly di RM tidak dapat dinonaktifkan**, karena selalu dihitung dan ditampilkan.

## KF11. Uji lanjut (post hoc) opsional — SEBAGIAN

**MV:**
- **Subdialog Post Hoc** (`MV/dialogs/posthoc.tsx`) menawarkan 18 metode: LSD, Bonferroni, Sidak, Scheffe, R-E-G-W-F, R-E-G-W-Q, SNK, Tukey, Tukey's B, Duncan, Hochberg's, Gabriel, Waller-Duncan, Dunnett, Tamhane's T2, Dunnett's T3, Games-Howell, Dunnett's C. (Isian lain di dialog, seperti Type I/Type II Error Ratio, arah uji Dunnett, dan kategori kontrol, adalah parameter, bukan metode.)
- **Jalannya:** bila faktor dipindah ke "Post Hoc Tests for" (`FixFactorVars`), `calculate_posthoc_tests` membandingkan setiap pasangan level per DV dengan MSE model. Hasilnya tabel **"Multiple Comparisons — <faktor>"** (`MV/services/multivariate-analysis-formatter.ts` bagian 15).
- **Yang tidak ada:**
  - Rust hanya membaca `bonfe`, `sidak`, `scheffe`, dan `lsd` (`MV/rust/src/stats/posthoc.rs` baris 168–218).
  - Bonferroni dan Sidak menyesuaikan Sig. LSD tanpa penyesuaian.
  - **Scheffe hanya mengganti label**, dan Sig.-nya sama dengan LSD.
  - Metode lain (Tukey, Games-Howell, Dunnett, dan seterusnya) **diabaikan**: hasilnya berlabel "Pairwise Comparison" tanpa penyesuaian.
  - Post hoc MV tidak divalidasi SPSS.

**RM:**
- **Subdialog Post Hoc** (`RM/dialogs/posthoc.tsx`), dengan faktor between.
- **Yang tidak ada:** menurut kode, **Post Hoc RM tidak menghasilkan perbandingan.**
  - `RM/rust/src/stats/posthoc.rs` memakai `config.posthoc.src_list` (semua faktor between yang tersedia), bukan pilihan pengguna `fix_factor_vars`.
  - Nilainya diambil lewat `get_level_values` (`RM/rust/src/stats/common.rs` baris 490–511), yang mencari nilai faktor between di record `subject_data`.
  - Service mengirim faktor between di `factors_data[f][s]` (`RM/services/repeated-measures-analysis.ts` baris 115–121), bukan di `subject_data`, sehingga nilai level tidak pernah ditemukan.
  - Ini kesimpulan dari kode; belum dijalankan.
- **Yang tersedia dan berjalan di RM:** **EM Means → Compare main effects** (LSD, Bonferroni, Sidak) menghasilkan tabel **Pairwise Comparisons** untuk faktor within dan between (`RmModel::emmeans`, formatter `formatEmmeansPairwise`). Fitur ini divalidasi terhadap SPSS (EM Means rm_c).

## KF12. Analisis profil — BELUM

**c. Yang tidak ada:**
1. **Tidak ada uji kesejajaran, kesamaan level, dan kerataan profil** yang diberi nama atau tabel sendiri di kedua modul. `grep` parallel, flatness, profile analysis, kesejajaran, dan kerataan tidak menemukan apa pun.
2. **Grafik profil tidak tampil di kedua modul:**
   - **MV:** dialog **Plots** (`MV/dialogs/plots.tsx`, Line Chart / Bar Chart) memicu `generate_plots` di Rust (`MV/rust/src/wasm/function.rs` baris 254–262), tetapi formatter dan output **tidak pernah memakai** `data.plots`. Tidak ada entri grafik profil di halaman Result.
   - **RM:** `RM/rust/src/stats/profile_plots.rs` **tidak dideklarasikan** di `RM/rust/src/stats/mod.rs`, sehingga tidak dikompilasi. `run_analysis` RM tidak membaca `config.plots`, jadi dialog **Plots** RM tidak berdampak.

**Catatan (bukan pemenuhan):** secara statistik, analisis profil dua kelompok setara dengan desain pengukuran berulang dengan satu faktor between:
- kesejajaran ≈ interaksi within × between (Multivariate Tests atau Tests of Within-Subjects Effects);
- kesamaan level ≈ efek between (Tests of Between-Subjects Effects);
- kerataan ≈ efek within.

Tabel-tabel itu tersedia di RM (misalnya data rm_b dan rm_c) dan divalidasi SPSS, tetapi tidak diberi label "analisis profil" dan tanpa grafik profil. Apakah ini dianggap memenuhi KF12 adalah keputusan penulis.

## KF13. Hasil analisis sesuai data dan konfigurasi — TERPENUHI

**a. Fitur:**
- **Jalur:** OK → service (`computeMultivariate` / `analyzeRepeatedMeasures`) → WASM (main thread atau Web Worker, `GLM/shared/glm-execution.ts`) → formatter → tabel disimpan (IndexedDB) → halaman Result.
- **Kesesuaian dengan SPSS 27:** MV 1686/1686 nilai (mv1–mv7), RM 1318 nilai.
- **Pesan:** toast MV "Running Multivariate analysis..." lalu "Multivariate analysis has been completed successfully." (`MV/dialogs/multivariate-main.tsx` baris 214–228). RM tidak menampilkan toast (lihat KF8 catatan 1).

**b. Bukti:** `testing/RELEASE-NOTES.md` §2, `testing/glm-mv-reference/results/spss-validation/README.md`, `testing/glm-rm-reference/results/`.

## KF14. Melihat hasil dalam tabel dan grafik — SEBAGIAN

**a. Fitur:** halaman **Result** (`frontend/app/dashboard/result/components/ResultOutput.tsx`). Setiap analisis tampil sebagai log dengan tabel (`DataTableRenderer`, tombol Show Full/Show Less untuk tabel panjang, salin dan unduh SVG).

| Modul | Tabel | Grafik yang benar-benar tampil |
|---|---|---|
| MV | Tabel-tabel KF2–KF6, Levene/Box/Bartlett, Parameter Estimates, SSCP, Residual SSCP, Contrast/L-Matrix/Custom Hypothesis, EM Means, Multiple Comparisons, Homogeneous Subsets, Spread vs. Level (sebagai **tabel**), Saved Variables, Errors Logs | **Hanya "Scatter Plot Matrix"** (Observed × Predicted × Std. Residual per DV) dari Options → **Residual plot** (`ResPlot`) (`MV/services/multivariate-analysis-formatter.ts` bagian 18b; `multivariate-analysis-output.ts` baris 347–384) |
| RM | Tabel-tabel KF9, Homogeneity Tests, Residual SSCP (+ Bartlett), Parameter Estimates, EM Means dan Pairwise Comparisons, Errors Logs | **Tidak ada.** Options Spread vs. level plot (`SprVsLevel`), Residual plot (`ResPlot`), dan Lack of fit ada di dialog, tetapi tidak dibaca `RM/rust/src/wasm/function.rs`. Dialog Plots juga tidak berdampak (KF12). |

**c. Yang tidak ada:** grafik profil di kedua modul (KF12); grafik apa pun di RM; grafik Spread vs. Level di MV (ditampilkan sebagai tabel).

---

## Temuan tambahan untuk skenario negatif (Langkah 2)

| Kondisi | Perilaku menurut kode | Pesan persis |
|---|---|---|
| MV: DV < 2 | Toast peringatan; dialog tetap terbuka (OK tidak dinonaktifkan) | "Please select at least two dependent variables for multivariate analysis." |
| MV: tanpa faktor, kovariat, maupun Test Values | Toast peringatan | "Please select at least one fixed factor or covariate." |
| MV: jumlah Test Values ≠ jumlah DV | **Tidak terjadi lewat UI** (disesuaikan otomatis, KF2) | Pesan Rust tidak terjangkau |
| MV: nilai hilang | Kasus dibuang listwise; Errors Logs | "<n> case(s) with missing values were excluded (listwise)." (mv7: 2 kasus) |
| MV: semua kasus punya nilai hilang | Konstruktor gagal; toast galat | "An error occurred during Multivariate analysis." + "Error: No complete cases: every case has a missing value." |
| MV: desain rank-deficient / matriks tak terinvers | Analisis tetap selesai; tabel yang gagal tidak tampil; Errors Logs konteks `calculate_multivariate_tests` / `calculate_tests_between_subjects_effects` | mis. "Could not invert X'X matrix - possibly due to multicollinearity"; "Failed to invert error matrix: …" |
| MV: Unequal dengan faktor ≠ 2 level | Errors Logs; Multivariate Tests tidak tampil | "VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>." |
| RM: faktor within kedua | Toast galat di Define | "Designs with more than one within-subjects factor are not supported in this version." |
| RM: nilai hilang | Subjek dibuang listwise; Errors Logs | "<n> subject(s) with missing values were excluded (listwise)." |
| RM: matriks galat singular | Tabel lain tetap tampil; Mauchly W = 0 dengan χ² dan Sig. kosong; Multivariate Tests tidak dihitung; pesan di Errors Logs | mis. "time: The error SSCP matrix is singular (the transformed dependent variables are linearly dependent), so multivariate statistics cannot be computed" (data `repeated-measures-5000-L10-M1.csv`) |
| RM: Define tanpa faktor/measure lalu OK | Dialog tertutup **tanpa pesan**; galat hanya di konsol | (konsol) "At least one subject variable must be selected for repeated measures analysis" |
| Data besar | Web Worker (bawaan); main thread tetap responsif | — (eksperimen `result_compare.md` §11–§12) |

**Dataset untuk Langkah 2:**
- `testing/glm-rm-reference/data` **tidak memuat data RM dengan nilai hilang** (5 berkas, 0 sel kosong). Skenario listwise RM akan memerlukan dataset kecil baru di `testing/black-box/data/`.
- Skenario matriks singular MV juga memerlukan dataset kecil baru (misalnya DV kedua = 2 × DV pertama).
- Untuk data besar dan singular RM tersedia `testing/glm-web-worker/results/*/data/` (MV 2000 kasus, RM 5000–40000 subjek, varian noise dan non-noise).
