# Pemetaan kebutuhan fungsional (Tabel 5 revisi) ke kode: GLM Multivariate dan GLM Repeated Measures

- **Versi yang dipetakan:** **skripsi-final-v2** (branch `ilham`, tag `skripsi-final-v2`, commit `d863de09`). Pemetaan v1 (`skripsi-final-v1`, `e365897d`) ada di riwayat git berkas ini (commit `db546515`).
- **Metode:** penelusuran kode (dialog, subdialog, service, formatter, crate Rust). Semua pesan dalam dokumen ini disalin dari kode v2: huruf, tanda baca, dan titik di akhir.
- **Path singkatan:**
  - `MV/` = `frontend/components/Modals/Analyze/general-linear-model/multivariate/`
  - `RM/` = `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/`
  - `GLM/` = `frontend/components/Modals/Analyze/general-linear-model/`

## Redaksi Tabel 5 yang direvisi

Hanya KF10, KF11, KF12, dan KF14 yang berubah. KF lain memakai redaksi semula.

- **KF10:** Sistem dapat melakukan pemeriksaan asumsi, yaitu uji Box's M dan uji Levene secara opsional, serta uji sferisitas Mauchly yang dihitung otomatis pada desain pengukuran berulang.
- **KF11:** Sistem dapat melakukan uji lanjut secara opsional dengan metode LSD, Bonferroni, dan Sidak, melalui Post Hoc pada GLM Multivariate dan perbandingan berpasangan rata-rata marginal (EM Means, Compare main effects) pada GLM Repeated Measures.
- **KF12:** Sistem dapat melakukan analisis profil (uji kesejajaran, kesamaan level, dan kerataan) melalui desain pengukuran berulang dengan faktor antarsubjek.
- **KF14:** Sistem dapat menampilkan hasil analisis dalam bentuk tabel serta grafik diagnostik residual pada GLM Multivariate.

## Ringkasan status (v2, terhadap redaksi revisi)

| KF | Kebutuhan (ringkas) | Status v1 (redaksi lama) | Status v2 (redaksi revisi) |
|---|---|---|---|
| KF1 | Pemilihan analisis di kelompok GLM Multivariate | TERPENUHI | TERPENUHI |
| KF2 | Uji vektor rata-rata satu populasi | TERPENUHI | TERPENUHI |
| KF3 | Dua populasi, kovarians sama dan tidak sama | TERPENUHI | TERPENUHI |
| KF4 | Uji berpasangan | TERPENUHI | TERPENUHI |
| KF5 | One-Way MANOVA | TERPENUHI | TERPENUHI |
| KF6 | Two-Way MANOVA dengan dan tanpa interaksi | SEBAGIAN | **TERPENUHI** |
| KF7 | Pemilihan analisis di kelompok GLM Repeated Measures | TERPENUHI | TERPENUHI |
| KF8 | Antarmuka pendefinisian faktor within-subjects | TERPENUHI (catatan validasi) | TERPENUHI (catatan validasi diselesaikan) |
| KF9 | Desain pengukuran berulang | TERPENUHI | TERPENUHI |
| KF10 | Pemeriksaan asumsi: Box's M dan Levene opsional, Mauchly otomatis | SEBAGIAN | **TERPENUHI** |
| KF11 | Uji lanjut LSD, Bonferroni, Sidak (Post Hoc MV; EM Means RM) | SEBAGIAN | **TERPENUHI** |
| KF12 | Analisis profil lewat desain RM dengan faktor antarsubjek | BELUM | **TERPENUHI** |
| KF13 | Hasil analisis sesuai data dan konfigurasi | TERPENUHI | TERPENUHI |
| KF14 | Tabel serta grafik diagnostik residual di MV | SEBAGIAN | **TERPENUHI** |

Status yang berubah dari v1: KF6, KF10, KF11, KF12, dan KF14 menjadi TERPENUHI. KF6 berubah karena perubahan kode di v2; KF10, KF11, KF12, dan KF14 berubah karena redaksi Tabel 5 direvisi dan didukung perubahan kode v2. Keterbatasan terhadap redaksi lama dicatat di bagian akhir.

---

## KF1. Pemilihan analisis pada kelompok GLM Multivariate — TERPENUHI

**Fitur:** menu Analyze → General Linear Model → **Multivariate** (`GLM/general-linear-model-menu.tsx`). Dialog utama `MV/dialogs/dialog.tsx` berisi:
- daftar Dependent Variables, Fixed Factor(s), Covariate(s), dan WLS Weight;
- tombol Model, Contrasts, Plots (nonaktif), Post Hoc, EM Means, Save, Options, Bootstrap, Test Values, dan Paired;
- radio Covariance Matrices, yang hanya muncul bila Fixed Factor tepat satu;
- tombol Reset, Cancel, dan OK.

Prosedur dipilih lewat isian dialog (keputusan: TERPENUHI):

| Prosedur | Isian |
|---|---|
| Satu populasi | Test Values |
| Dua populasi | Satu faktor dengan 2 level, plus radio Covariance Matrices |
| Berpasangan | Paired |
| One-Way | Satu faktor |
| Two-Way | Dua faktor, plus dialog Model |

## KF2. Uji vektor rata-rata satu populasi — TERPENUHI

- **Fitur:** subdialog **Test Values** ("Test Values (μ₀) — Hotelling T² Satu Populasi", isian `mu0-0`, `mu0-1`, …).
- **Keluaran:** Multivariate Tests dengan baris efek **"Hotelling T² (vs μ₀)"**.
- **Penyesuaian otomatis (keputusan 4):** jumlah μ₀ selalu sama dengan jumlah DV.
  - Subdialog membuat satu isian per DV (`resizeTestValues`, `MV/dialogs/test-values.tsx`).
  - Saat OK, vektor dipotong atau ditambah 0 (`MV/dialogs/multivariate-main.tsx`, `normalizedTestValues`).
  - Pesan Rust "TestValues must have the same length …" tidak terjangkau lewat UI.

## KF3. Dua populasi, kovarians sama dan tidak sama — TERPENUHI

- **Fitur:** radio **Covariance Matrices**, muncul hanya bila Fixed Factor tepat satu:
  - **Equal (Pooled estimate of Σ)** (`variance-pooled`);
  - **Unequal (Welch-Satterthwaite)** (`variance-welch`).
- **Keluaran Unequal:** baris efek "<faktor> — Welch-Satterthwaite" dengan hanya Hotelling's Trace. Catatan tabel diakhiri "— Computed using Welch-Satterthwaite approximation for unequal covariance matrices.".
- **Faktor dengan ≠ 2 level:** Errors Logs, konteks `calculate_multivariate_tests`, pesan `VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>.`.

## KF4. Uji berpasangan — TERPENUHI

- **Fitur:** subdialog **Paired** ("Paired (Hotelling T²) — Vektor Selisih").
- **Keluaran:** tabel "Multivariate Tests — Hotelling T² Berpasangan", dengan baris efek "Hotelling T² Berpasangan".
- **Pesan (toast):**
  - "Tambahkan minimal satu pasangan variabel.";
  - "Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris.";
  - "Pasangan harus berisi dua variabel yang berbeda.".

## KF5. One-Way MANOVA — TERPENUHI

Satu Fixed Factor (> 2 level). Keluaran: Between-Subjects Factors, Descriptive Statistics, Multivariate Tests (Intercept dan faktor; Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root), dan Tests of Between-Subjects Effects.

## KF6. Two-Way MANOVA dengan dan tanpa interaksi — TERPENUHI (v2)

- **Dengan interaksi:** dialog Model → **Full Factorial** (bawaan). Multivariate Tests dan Tests of Between-Subjects Effects memuat baris `faktorA*faktorB`.
- **Tanpa interaksi:**
  - Dialog Model → **Build Terms**, lalu drag setiap faktor satu per satu ke kotak Model (pilihan Type tidak dipakai).
  - Atau **Build Custom Terms** tanpa suku `*`.
  - Tidak ada baris interaksi. Levene tampil satu baris per DV ("Based on Model Residuals").
- **Kode:** `normalize_model_spec` (privat, awal `run_analysis`, `MV/rust/src/wasm/function.rs`), dan penjaga `config.model.non_cust` di builder desain, BSE, uji multivariat, SSCP, parameter, dan residual plot.
- **Validasi:** SPSS mv5 (dengan interaksi) dan mv8 (tanpa interaksi, `/DESIGN=faktorA faktorB`).
- **Penolakan model kustom:** toast galat analisis (tabel "Temuan" di bawah).

## KF7. Pemilihan analisis pada kelompok GLM Repeated Measures — TERPENUHI

Menu Analyze → General Linear Model → **Repeated Measures** membuka dialog **Define**, lalu dialog utama RM (`RM/dialogs/dialog.tsx`). Dialog utama berisi:
- Within-Subjects Variables, Between-Subjects Factor(s), dan Covariates;
- tombol Model, Contrasts, Plots (nonaktif), Post Hoc (nonaktif), EM Means, Save, dan Options;
- tombol Back to Define, Reset, Cancel, dan OK.

## KF8. Pendefinisian faktor within-subjects — TERPENUHI

- **Dialog Define** (`RM/dialogs/define/repeated-measures-dialog.tsx`):
  - Within-Subject Factor Name dan Number of Levels, dengan tombol Add, Change, dan Remove;
  - Measure Name, dengan tombol Add, Change, dan Remove;
  - tombol Reset, Cancel, dan Define.
- **v2:** Define dan OK kini memvalidasi dengan toast (sebelumnya dialog tertutup tanpa pesan).

Pesan persis (toast):

| Kondisi | Pesan |
|---|---|
| Add faktor, nama kosong | `Factor name cannot be empty.` |
| Add faktor, nama berspasi/simbol | `Factor name cannot contain spaces or special characters. Use only letters, numbers, and underscores.` |
| Add faktor, level bukan angka | `Number of levels must be a valid number.` |
| Add faktor, level di luar 2–99 | `Number of levels must be between 2 and 99.` |
| Add measure, nama kosong | `Measure name cannot be empty.` |
| Add measure, nama berspasi/simbol | `Measure name cannot contain spaces or special characters. Use only letters, numbers, and underscores.` |
| Add measure, nama sudah ada | `A measure with this name already exists.` |
| Add faktor kedua, atau Define dengan > 1 faktor | `Designs with more than one within-subjects factor are not supported in this version.` |
| Define tanpa faktor (v2) | `Add a within-subjects factor (name and number of levels) before clicking Define.` |
| Define tanpa measure (v2) | `Add a measure name before clicking Define.` |
| OK dengan slot within yang belum diisi (v2) | `Please assign a variable to every within-subjects slot.` |

`A factor with this name already exists.` tidak terjangkau lewat Add, karena faktor kedua sudah ditolak lebih dulu dengan pesan multi-faktor. `No within-subjects variables are defined. Go back to Define and add a within-subjects factor and a measure.` juga tidak terjangkau, karena Define kini menolak konfigurasi tanpa faktor atau measure.

## KF9. Desain pengukuran berulang — TERPENUHI

Keluaran:
- Within-Subjects Factors;
- Descriptive Statistics (opsional);
- Multivariate Tests;
- Mauchly's Test of Sphericity;
- Tests of Within-Subjects Effects (Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, Lower-bound);
- Tests of Within-Subjects Contrasts (bawaan Polynomial; Repeated lewat Contrasts);
- Tests of Between-Subjects Effects;
- untuk > 1 measure: Tests of Within-Subjects Effects (Multivariate).

Divalidasi SPSS (1318 nilai; gambar51, a, b, c, d).

## KF10. Pemeriksaan asumsi — TERPENUHI (redaksi revisi)

| Uji | MV | RM |
|---|---|---|
| Box's M | Opsional: Options → **Homogenity Tests** → "Box's Test of Equality of Covariance Matrices" | Opsional: Options → **Homogenity Tests** → "Box's Test of Equality of Covariance Matrices" |
| Levene | Opsional, dengan pengaturan yang sama → "Levene's Test of Equality of Error Variances". Faktorial penuh: 4 baris per DV (Based on Mean, Based on Median, Based on Median and with adjusted df, Based on trimmed mean). Model efek utama: 1 baris per DV "Based on Model Residuals" (v2, seperti SPSS). | Opsional, dengan pengaturan yang sama (4 baris per measure dan level) |
| Mauchly | — (tidak ada faktor within) | **Otomatis** (selalu dihitung): "Mauchly's Test of Sphericity" |

Bukti: MV `MV/rust/src/wasm/function.rs` (Box, Bartlett, dan Levene bila `options.homogen_test`); RM `RM/rust/src/wasm/function.rs` (homogeneity bila `homogen_test`; Mauchly tanpa syarat).

## KF11. Uji lanjut LSD, Bonferroni, Sidak — TERPENUHI (redaksi revisi)

- **MV Post Hoc** (`MV/dialogs/posthoc.tsx`):
  - Hanya LSD, Bonferroni, dan Sidak yang aktif. 15 metode lain nonaktif, dengan catatan "Only LSD, Bonferroni, and Sidak are supported in this version."
  - Tabel "Multiple Comparisons — <faktor>" berisi satu baris per metode per pasangan. Bila hanya satu metode, judulnya "Multiple Comparisons — <faktor> (<metode>)" dengan catatan "Based on observed means. <metode> adjustment."; bila lebih dari satu metode, ada kolom Test.
  - Divalidasi SPSS (mv4ph, 180 nilai).
- **RM:**
  - Tombol **Post Hoc** nonaktif, dengan keterangan "Post Hoc is not supported in this version. Use EM Means > Compare main effects for pairwise comparisons."
  - Uji lanjut lewat **EM Means** → **Compare Main Effects** dan **Confidence Interval Adjustment** (LSD(None), Bonferroni, Sidak).
  - Menghasilkan tabel "Pairwise Comparisons" dengan catatan "Based on estimated marginal means. Adjustment for multiple comparisons: <LSD (none) | Bonferroni | Sidak>. …".
  - Divalidasi SPSS (EM Means rm_c, Bonferroni).

## KF12. Analisis profil — TERPENUHI (redaksi revisi, keputusan 3)

Desain RM dengan satu faktor between, misalnya `rm_b`: `waktu` 4 level dan `kelompok` between.

| Uji profil | Baris keluaran |
|---|---|
| Kesejajaran | `waktu * kelompok` di Multivariate Tests dan di Tests of Within-Subjects Effects |
| Kesamaan level | `kelompok` di Tests of Between-Subjects Effects |
| Kerataan | `waktu` di Multivariate Tests dan di Tests of Within-Subjects Effects |

Tidak ada grafik profil (Plots nonaktif).

## KF13. Hasil analisis sesuai data dan konfigurasi — TERPENUHI

- **Jalur:** OK → service → WASM (Web Worker bawaan, atau main thread) → formatter → IndexedDB → halaman Result.
- **Kesesuaian dengan SPSS 27:** MV 2339/2339, RM 1318.
- **Toast MV:** "Running Multivariate analysis..." lalu "Multivariate analysis has been completed successfully."
- **Galat analisis MV:** toast "An error occurred during Multivariate analysis." dan baris kedua "Error: <pesan>"; tidak ada log hasil.
- **Galat analisis RM (v2):** toast `An error occurred during Repeated Measures analysis. Error: <pesan>`.
- **Toast dobel:** setiap toast tampil dua kali di seluruh aplikasi, karena ada dua `<Toaster>` (bawaan, di luar GLM).

## KF14. Tabel serta grafik diagnostik residual di MV — TERPENUHI (redaksi revisi)

- **Tabel:** halaman Result (`frontend/app/dashboard/result/components/ResultOutput.tsx`), dengan tombol Show Full/Show Less untuk tabel panjang.
- **Grafik:** MV Options → **Residual Plots** → entri grafik **"Scatter Plot Matrix"** per DV (Observed × Predicted × Std. Residual).
- **Plots:** tombol Plots MV dan RM nonaktif, dengan keterangan "Plots are not supported in this version."
- **Options RM:** Spread-Vs.-Level Plots, Residual Plots, dan Lack of Fit Test nonaktif, dengan keterangan "Spread-vs.-level plots, residual plots, and the lack-of-fit test are not supported in this version."

---

## Temuan untuk skenario negatif (diperiksa terhadap kode v2)

"Toast galat MV" = toast "An error occurred during Multivariate analysis." dengan baris kedua "Error: <pesan>", dan tidak ada log hasil. Semua toast tampil dua kali (dua `<Toaster>`).

| Kondisi | Tempat tampil | Pesan persis |
|---|---|---|
| MV: DV < 2 (tanpa Paired) | Toast peringatan; dialog tetap terbuka (OK tidak dinonaktifkan) | `Please select at least two dependent variables for multivariate analysis.` |
| MV: tanpa faktor, kovariat, maupun Test Values | Toast peringatan | `Please select at least one fixed factor or covariate.` |
| MV: jumlah μ₀ ≠ jumlah DV | Tidak terjadi: disesuaikan otomatis (KF2) | — |
| MV: Paired tanpa pasangan / pasangan tidak lengkap / variabel sama | Toast | `Tambahkan minimal satu pasangan variabel.` / `Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris.` / `Pasangan harus berisi dua variabel yang berbeda.` |
| MV: model kustom tanpa suku (Build Terms, kotak Model kosong) | Toast galat MV (konteks `config.validation.model_terms` tidak tampil karena tidak ada log) | `The custom model has no terms. Add terms in the Model dialog or choose Full Factorial.` |
| MV: suku model bukan faktor atau kovariat terpilih (faktor dihapus dari Fixed Factor setelah dimasukkan ke Model) | Toast galat MV | `Model term '<nama>' is not a selected fixed factor or covariate.` |
| MV: interaksi dengan kovariat (Build Custom Terms) | Toast galat MV | `Interaction terms with covariates are not supported in this version.` |
| MV: faktor atau kovariat tidak dimasukkan sebagai efek utama | Toast galat MV | `The custom model must include every fixed factor and covariate as a main effect ('<nama>' is missing).` |
| MV: suku bersarang (Build Custom Terms, tombol Within) | Toast galat MV | `Nested terms are not supported in this version.` |
| MV: sebagian interaksi (≥ 3 faktor, misalnya F1, F2, F3, F1 * F2) | Toast galat MV | `Only the full factorial model and the main-effects model are supported in this version.` |
| MV: Unequal dengan faktor ≠ 2 level | Errors Logs, konteks `calculate_multivariate_tests`; Multivariate Tests tidak tampil | `VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>.` |
| MV: nilai hilang (mv7) | Errors Logs, konteks `listwise_deletion` | `2 case(s) with missing values were excluded (listwise).` |
| MV: semua kasus punya nilai hilang (`bb-mv-no-complete.csv`) | Toast galat MV | `No complete cases: every case has a missing value.` |
| MV: matriks galat singular (`bb-mv-singular.csv`, y3 = y1 + y2) | Errors Logs, konteks `calculate_multivariate_tests`; Multivariate Tests tidak tampil; tabel lain tampil | `Failed to calculate test statistics for intercept: Failed to invert error matrix: Matrix is singular and cannot be inverted` |
| RM: Define tanpa faktor / tanpa measure | Toast (v2) | `Add a within-subjects factor (name and number of levels) before clicking Define.` / `Add a measure name before clicking Define.` |
| RM: faktor within kedua | Toast | `Designs with more than one within-subjects factor are not supported in this version.` |
| RM: OK dengan slot within kosong | Toast (v2) | `Please assign a variable to every within-subjects slot.` |
| RM: nilai hilang (`bb-rm-listwise.csv`) | Errors Logs, konteks `build_rm_model` | `2 subject(s) with missing values were excluded (listwise).` |
| RM: matriks galat singular (`repeated-measures-5000-L10-M1.csv`) | Errors Logs; 16 tabel (tanpa Multivariate Tests); Mauchly W = 0 dengan χ² dan Sig. kosong | `time: The error SSCP matrix is singular (the transformed dependent variables are linearly dependent), so multivariate statistics cannot be computed` dan `score: the error covariance matrix of the transformed variables is singular, so Mauchly's W = 0 and its chi-square and significance cannot be computed` |
| Data besar (MV 2000, RM 40000) | Web Worker (bawaan): halaman tetap responsif selama perhitungan | — (`result_compare.md` §11–§12) |

Perubahan dari pemetaan v1:
- Baris "RM: Define tanpa faktor/measure lalu OK" (dulu: dialog tertutup tanpa pesan) kini menjadi toast di Define dan OK.
- Toast galat analisis RM ditambahkan.
- Model kustom yang ditolak dan Levene model efek utama adalah perilaku baru v2.
- Pesan singular MV dan "No complete cases" diperiksa pada WASM v2 dengan dataset baru (`testing/black-box/data/`).

## Pesan yang tidak bisa dipicu dari UI

Pesan berikut ada di kode v2, tetapi validasi di dialog selalu berjalan lebih dulu, sehingga kondisinya tidak pernah sampai ke kode tersebut. Karena itu pesan ini tidak dijadikan skenario black-box. Path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/`.

| Pesan | Lokasi pesan | Alasan tidak terjangkau |
|---|---|---|
| `TestValues must have the same length as Dependent Variables. Got <n> values for <m> dependent variables.` | `multivariate/rust/src/wasm/constructor.rs:171-183` | Saat subdialog dibuka, jumlah isian μ₀ disesuaikan dengan jumlah DV (`multivariate/dialogs/test-values.tsx:18-42`, `resizeTestValues`). Saat OK, vektor μ₀ dipotong atau ditambah 0 sampai sama panjang dengan DV (`multivariate/dialogs/multivariate-main.tsx:185-202`, `normalizedTestValues`). Konfigurasi yang dikirim ke WASM selalu sama panjang. |
| `Dependent variable must be selected for multivariate analysis` | `multivariate/rust/src/wasm/constructor.rs:137-141` | OK ditolak bila DV kurang dari dua, kecuali pada mode Paired (`multivariate/dialogs/dialog.tsx:247-262`). Pada mode Paired, service mengisi DepVar dengan nama variabel selisih (`multivariate/services/multivariate-analysis.ts:108`). |
| `Model specification method must be selected` | `multivariate/rust/src/wasm/constructor.rs:144-148` | Dialog Model memakai radio: tepat satu dari NonCust, Custom, dan BuildCustomTerm bernilai true (`multivariate/dialogs/model.tsx:68-74`). Bawaannya NonCust = true (`multivariate/constants/multivariate-default.ts:25-27`). |
| `Fixed factors must be specified for post-hoc tests` | `multivariate/rust/src/wasm/constructor.rs:151-157` | Daftar sumber Post Hoc (`SrcList`) selalu disalin dari Fixed Factor(s) di dialog utama (`multivariate/dialogs/multivariate-main.tsx:112-115`). Daftar itu tidak pernah terisi bila Fixed Factor kosong. |
| `A factor with this name already exists.` | `repeated-measures/dialogs/define/repeated-measures-dialog.tsx:72-81` | Penolakan faktor within kedua dijalankan lebih dulu: `handleAddFactor` berhenti di baris 150-153 bila sudah ada satu faktor, sebelum `isFactorNameValid` di baris 156. Pada Change (baris 171-183), satu-satunya faktor adalah faktor yang sedang diubah, dan faktor itu dikecualikan dari pemeriksaan duplikat (baris 76). |
| `No within-subjects variables are defined. Go back to Define and add a within-subjects factor and a measure.` | `repeated-measures/dialogs/dialog.tsx:183-188` | Define menolak konfigurasi tanpa faktor atau tanpa measure (`repeated-measures/dialogs/define/repeated-measures-dialog.tsx:342-349`). Karena itu dialog utama selalu dibuka dengan minimal satu slot. |
| `At least one subject variable must be selected for repeated measures analysis` | `repeated-measures/rust/src/wasm/constructor.rs:111-116` | Slot selalu ada (baris sebelumnya), dan OK ditolak bila ada slot yang belum diisi (`repeated-measures/dialogs/dialog.tsx:190-193`). |
| `Designs with more than one within-subjects factor are not supported in this version` (Rust, tanpa titik) | `repeated-measures/rust/src/stats/rm_model.rs:270-273` | Faktor within kedua sudah ditolak di Define, dengan pesan versi UI yang diakhiri titik (`repeated-measures/dialogs/define/repeated-measures-dialog.tsx:150-153` dan `338-341`). |
| `Estimated marginal means are not supported for designs with more than one within-subjects factor yet` | `repeated-measures/rust/src/wasm/function.rs:400-404` | Sama dengan baris sebelumnya: desain dengan lebih dari satu faktor within tidak dapat dibuat dari UI. |

## Keterbatasan terhadap redaksi Tabel 5 lama (dicatat, bukan skenario)

- Uji normalitas multivariat tidak ada di kedua modul.
- Mauchly tidak dapat dinonaktifkan (redaksi revisi: dihitung otomatis).
- Post hoc selain LSD, Bonferroni, dan Sidak tidak tersedia. RM tidak punya Post Hoc between-subjects (diganti EM Means).
- Tidak ada uji profil bernama sendiri maupun grafik profil. Analisis profil dilakukan lewat tabel RM (KF12).
- Grafik hanya Scatter Plot Matrix residual di MV. RM tidak punya grafik. Spread vs. level MV tampil sebagai tabel.
- Model kustom hanya faktorial penuh atau efek utama. Bentuk lain ditolak (KF6).
