# Perubahan kode GLM Multivariate untuk naskah: baseline `82a63b45` → `skripsi-final-v2` (branch `ilham`)

Versi dokumen: **skripsi-final-v2**. Perubahan dari `skripsi-final-v1` (`e365897d`) ke v2 ditandai "(v2)" dan dirangkum di §e.

Isi dokumen:
- **Sumber:** daftar faktual perbedaan kode dari `git diff 82a63b45 HEAD` dan dua skrip:
  - `harness/rust_api.py`: inventaris API publik crate Rust (fungsi pub, struct/enum beserta field, method) dan fungsi privat;
  - `harness/fn_changes.py`: daftar fungsi yang ditambah, dihapus, atau isinya berubah (Rust dan `services/*.ts`).
- **Path:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/multivariate/`, kecuali disebut lain.
- **Aturan yang berlaku selama perbaikan:**
  - tidak ada fungsi pub, struct, field, enum, atau method publik yang ditambah atau dihapus;
  - tidak ada signature yang berubah;
  - fungsi pembantu baru dibuat privat di berkas yang memakainya.

  Sejak step 8e, `check-step.sh` menolak langkah yang melanggar aturan ini (`rust_api.py 82a63b45 WORKTREE`).

Cara mengulang:

```
python testing/glm-mv-reference/harness/rust_api.py 82a63b45 HEAD
python testing/glm-mv-reference/harness/fn_changes.py 82a63b45 HEAD
```

## a. Konfirmasi: API publik dan alur tidak berubah

| Ukuran | Baseline `82a63b45` | HEAD |
|---|---|---|
| Fungsi pub di `rust/src/stats/common.rs` | 34 | 34 (nama dan signature sama) |
| Fungsi pub di seluruh crate | 79 | 79 |
| Struct di `rust/src/models/result.rs` | 40 | 40 |
| Struct di seluruh crate | 58 | 58 |
| Enum di seluruh crate | 11 | 11 |
| Field `MultivariateResult` | 24 | 24 (nama dan tipe sama) |
| Method `MultivariateAnalysis` (pub) | 7: `new`, `get_results`, `get_formatted_results`, `get_executed_functions`, `get_all_errors`, `get_all_log`, `clear_errors` | 7, sama |
| Method publik di seluruh crate | 15 | 15 |
| Perubahan publik menurut `rust_api.py` | — | **0** (`public_changes: []`) |
| `rust/src/wasm/function.rs` (termasuk `run_analysis`) | — | **(v2) satu langkah baru di awal `run_analysis`**: `normalize_model_spec` (lihat di bawah); langkah lain identik. Pada v1, berkas ini identik dengan baseline. |
| `rust/src/models/` (`config.rs`, `data.rs`, `result.rs`) | — | identik |
| Glue JS dan `.d.ts` WASM (`rust/pkg/wasm.js`, `wasm.d.ts`) | — | identik (dicek tiap langkah) |

**Alur `run_analysis`: satu langkah baru di awal (v2).** Urutan langkah lain, kondisinya, nama di `executed_functions`, dan fungsi `core::…` yang dipanggil sama dengan baseline. Langkah baru:

1. `let mut model_config = config.clone();` lalu `normalize_model_spec(&mut model_config)`.
2. Bila gagal: `error_collector.add_error("config.validation.model_terms", &msg)` dan `return Err(string_to_js_error(msg))`. Galat ini sampai ke pengguna sebagai toast lewat konstruktor.
3. Bila berhasil: `let config = &model_config;`. Semua langkah berikutnya memakai konfigurasi yang dinormalisasi.

Untuk model **Full Factorial** (bawaan, dan semua konfigurasi validasi serta eksperimen), `normalize_model_spec` langsung kembali tanpa perubahan. Keluaran WASM mv1–mv7 dan sel eksperimen byte-identik dengan v1.

Normalisasi sengaja diletakkan di `run_analysis`, bukan di konstruktor. Kunci hash `std::HashMap` di wasm32 ditentukan saat `HashMap` pertama dibuat di `MultivariateAnalysis::new` (`ErrorCollector`) dan bergantung pada posisi stack. Menambah kode di `new` menggeser urutan kunci dan digit terakhir Levene (≤ 1,8·10⁻¹⁴), sehingga keluaran tidak lagi byte-identik (bukti: `fix-steps/step11-main-effects/full-factorial-byte-check.txt`).

Satu-satunya perubahan di jalur masuk ada **di `MultivariateAnalysis::new`** (`rust/src/wasm/constructor.rs`), sebelum `run_analysis` dipanggil:

1. Setelah validasi konfigurasi dan pembentukan `AnalysisData`, data dilewatkan ke fungsi privat baru `listwise_complete_cases`.
2. Bila ada kasus yang dibuang, `error_collector` mendapat entri konteks `listwise_deletion` ("N case(s) with missing values were excluded (listwise).").
3. Bila tidak ada kasus lengkap sama sekali, konstruktor mengembalikan error "No complete cases: every case has a missing value.".
4. Struct `MultivariateAnalysis` menyimpan data yang sudah difilter, lalu `run_analysis` dipanggil seperti semula.

Di luar modul Multivariate: tidak ada perubahan di `shared/` (termasuk `shared/glm-execution.ts`), `frontend/hooks/`, maupun kontrak pesan worker. Crate Rust RM tidak berubah. (v2) Dialog RM berubah di sisi TypeScript (§e).

## b. Fungsi yang ditambah atau dihapus (semuanya privat)

| Berkas | Ditambah (privat) | Dihapus |
|---|---|---|
| `rust/src/stats/common.rs` | `noncentral_f_cdf` | — |
| `rust/src/stats/box_m_test.rs` | `f_upper_tail` | — |
| `rust/src/stats/between_subjects_effects.rs` | `effect_ss`, `deviation_coded_design`, `sse_without_columns`, `containing_effect_columns` | — |
| `rust/src/stats/multivariate_tests.rs` | `ss_type_label`, `effect_hypothesis_sscps`, `residual_sscp`, `deviation_coded_design`¹, `containing_effect_columns`¹ | `generate_level_combinations`² |
| `rust/src/stats/descriptive_statistics.rs` | `level_groups`, `sort_levels` | — |
| `rust/src/wasm/constructor.rs` | `listwise_complete_cases` | — |
| `rust/src/wasm/function.rs` | `normalize_model_spec` (v2) | — |
| `rust/src/stats/levene_test.rs` | `model_residual_levene` (v2) | — |

¹ Salinan privat dari fungsi bernama sama di `between_subjects_effects.rs`. Salinan ini diperlukan karena pembantu di sana privat dan aturan melarang menambah `pub` (termasuk `pub(crate)`).

² Fungsi privat *bersarang* di dalam `calculate_hypothesis_error_matrices`. Fungsi ini ikut terhapus bersama cabang H interaksi lama (step 8c). `rust_api.py` tidak mendaftarnya karena bukan item tingkat atas.

Total fungsi privat tingkat atas baru: 16 (14 di v1, ditambah 2 di v2). (v2) Ada juga satu konstanta privat `MAIN_EFFECTS_ERROR_KEY` di `multivariate_tests.rs`. Tidak ada deklarasi modul, berkas `.rs`, atau dependensi `Cargo.toml` baru.

## c. Fungsi yang isinya berubah (nama dan signature tetap)

| Berkas | Fungsi | Perubahan isi | Langkah |
|---|---|---|---|
| `rust/src/stats/common.rs` | `calculate_observed_power` (pub) | Power = 1 − F_nc(F_crit(1 − α; df1, df2); df1, df2, λ = F·df1) lewat `noncentral_f_cdf` (sebelumnya 1 − exp(−λ/2)) | 1 |
| | `build_design_matrix_and_response` (pub) | Level faktor dihitung sekali per build (map `factor_levels`), bukan per baris. Kolom dan nilai desain sama. | 8c |
| `rust/src/stats/multivariate_tests.rs` | `calculate_multivariate_tests` (pub) | H faktor dan interaksi dihitung sekali untuk semua suku (`effect_hypothesis_sscps`) dan diteruskan ke `calculate_hypothesis_error_matrices`; catatan desain memakai `ss_type_label` ("Type III sum of squares") | 5, 8c |
| | `calculate_hypothesis_error_matrices` (privat) | Cabang efek utama (Σ n_k(ȳ_k − ȳ)(ȳ_k − ȳ)ᵀ) dan cabang interaksi (deviasi sel − marginal) diganti H dari `effect_hypothesis_sscps` dan E = SSCP residual model penuh. Signature privat mendapat parameter `term_sscp`, dan parameter `factors_in_effect` dihapus. Cabang Intercept tidak berubah. | 8c |
| | `calculate_multivariate_test_statistics` (privat) | Partial eta² Hotelling's Trace = (T/s)/(T/s + 1); Observed Power keempat statistik lewat `calculate_observed_power` dengan α konfigurasi (sebelumnya 1 − 0,1/F) | 1, 2 |
| | `calculate_welch_two_sample_t2` (privat) | Observed Power = `calculate_observed_power(df1, df2, F, alpha)` dengan df dan F yang sama dengan Sig. entri, alpha = `config.options.sig_level.unwrap_or(0.05)` (sebelumnya 1 − 0,1/F, atau 0,5 bila F ≤ 1). Hanya dipakai pada mode Unequal (Welch). | 10 |
| `rust/src/stats/between_subjects_effects.rs` | `calculate_tests_between_subjects_effects` (pub) | α dari konfigurasi; SS Intercept dari desain berkode deviasi pada y − μ₀; entri `Total` = Σ(y − μ₀)², df = n; SS faktor dan interaksi lewat `effect_ss` (Type III/IV dari desain berkode deviasi) | 1, 4, 6, 8c |
| | `calculate_type_ii_ss` (pub) | Efek disesuaikan terhadap efek yang tidak memuatnya (`containing_effect_columns`, `sse_without_columns`) | 6 |
| | `calculate_type_iii_ss` (pub) | Hanya komentar (kode sama; pemanggil kini mengirim desain berkode deviasi) | 6 |
| `rust/src/stats/box_m_test.rs` | `calculate_box_test` (pub) | F = (1 − ρ₁ − f₁/f₂)·M/f₁ untuk semua kasus (cabang χ²/f₁ dihapus); Sig. dari F(f₁, f₂) tanpa membulatkan f₂ (`f_upper_tail`) | 3 |
| `rust/src/stats/levene_test.rs` | `calculate_levene_test` (pub) | df2 "Based on Median and with adjusted df" = (Σ uᵢ)²/Σ[uᵢ²/(nᵢ − 1)] (sebelumnya bentuk Welch dengan s²ᵢ/nᵢ) | 8d |
| `rust/src/stats/descriptive_statistics.rs` | `calculate_descriptive_statistics` (pub) | Semua faktor dipakai. Grup bertingkat lewat field `StatGroup.subgroups` yang sudah ada (level faktor pertama → level faktor kedua + Total …). Level diurutkan menaik seperti SPSS. Satu faktor: struktur sama (subgroups `None`). | 9 |
| `rust/src/wasm/constructor.rs` | `MultivariateAnalysis::new` (pub) | Listwise deletion sebelum `run_analysis` (lihat a) | 8b, 8e |
| `rust/src/wasm/function.rs` | `run_analysis` (pub) | (v2) Normalisasi model di awal (lihat a) | 11 |
| `services/multivariate-analysis-formatter.ts` | `formatTestsBetweenSubjectsEffects` (privat) | Baris Total dari entri `Total` hasil Rust (sebelumnya SS Intercept + SS Corrected Total); baris dengan df = 0 mengosongkan Mean Square, F, Sig., Observed Power | 4, 5 |
| | `formatDescriptiveStatistics` (privat) | Satu kolom label per tingkat grup (`group_label`, `group_label_2`, …) bila ada subgroups. Tabel satu faktor tidak berubah. | 9 |

Perubahan isi fungsi di v2 (model efek utama, post hoc, Levene) dicantumkan di §e. Tidak ada fungsi lain yang isinya berubah, baik di `rust/src/` maupun di `services/*.ts`. Menurut `fn_changes.py`, berkas lain di modul ini identik atau hanya berubah di luar fungsi (import).

## d. Perubahan perilaku yang terlihat pengguna

- Angka yang berubah menjadi sama dengan SPSS 27. Rinciannya di `results/spss-validation/README.md` §3–§4.
- **Errors Logs:** muncul entri `listwise_deletion` bila ada kasus yang dibuang.
- **Descriptive Statistics** untuk dua faktor atau lebih: tabel bertingkat (A × B dan marginal), bukan lagi hanya faktor pertama.
- **Desain rank-deficient:** Multivariate Tests kini memberi error inversi X'X seperti Tests of Between-Subjects Effects, bukan angka dari rumus lama.
- **Waktu analisis:** berubah karena jalur komputasi berubah (builder desain lebih cepat, H dari fit matriks). Eksperimen Web Worker sel Multivariate diulang (`result_compare.md` §12).

## e. Perubahan skripsi-final-v1 (`e365897d`) → skripsi-final-v2

Sumber: `fn_changes.py e365897d HEAD` dan `rust_api.py 82a63b45 HEAD` (0 perubahan publik; 79 fungsi pub, 34 di `common.rs`, 40 struct `result.rs`, 24 field `MultivariateResult`, 7 method `MultivariateAnalysis`, semuanya sama).

### e.1 Fungsi Rust yang isinya berubah atau ditambah

| Berkas | Fungsi | Perubahan | Langkah |
|---|---|---|---|
| `rust/src/wasm/function.rs` | `run_analysis` (pub) | Normalisasi model di awal (§a) | 11 |
| | `normalize_model_spec` (privat, baru) | Membaca dialog Model (`NonCust`, `Custom`, `BuildCustomTerm`, `FactorsModel`). Model setara faktorial penuh → `NonCust = true`. Semua faktor dan kovariat sebagai efek utama tanpa interaksi → `NonCust = false` (model efek utama). Bentuk lain ditolak: suku bersarang, sebagian interaksi, faktor atau kovariat terlewat, interaksi dengan kovariat, atau daftar kosong. | 11 |
| `rust/src/stats/common.rs` | `build_design_matrix_and_response` (pub) | Kolom interaksi hanya bila `config.model.non_cust` | 11 |
| `rust/src/stats/between_subjects_effects.rs` | `calculate_tests_between_subjects_effects` (pub) | Baris interaksi hanya bila `non_cust` | 11 |
| | `deviation_coded_design`, `containing_effect_columns` (privat) | Kolom atau suku interaksi hanya bila `non_cust` | 11 |
| `rust/src/stats/multivariate_tests.rs` | `calculate_multivariate_tests` (pub) | Suku interaksi (untuk `effect_hypothesis_sscps` dan loop interaksi) hanya bila `non_cust` | 11 |
| | `effect_hypothesis_sscps` (privat) | Model efek utama: juga H Intercept (desain berkode deviasi tanpa kolom intercept, pada y − μ₀) dan E residual model aditif (df n − kolom desain) | 11 |
| | `calculate_hypothesis_error_matrices` (privat) | Model efek utama: H dan E diambil dari `effect_hypothesis_sscps`, termasuk Intercept. Faktorial penuh: tidak berubah. | 11 |
| | `deviation_coded_design`, `containing_effect_columns` (salinan privat) | Seperti di `between_subjects_effects.rs` | 11 |
| `rust/src/stats/between_subjects_sscp.rs` | `calculate_between_subjects_sscp` (pub) | SSCP interaksi hanya bila `non_cust` | 11 |
| `rust/src/stats/parameter_estimates.rs` | `generate_parameter_names` (pub) | Nama parameter interaksi hanya bila `non_cust` | 11 |
| `rust/src/stats/residual_plots.rs` | `build_model_string` (privat) | Suku interaksi hanya bila `non_cust` | 11 |
| `rust/src/stats/posthoc.rs` | `compute_model_mse` (privat) | Model efek utama: MSE dari SSE desain aditif | 11 |
| | `calculate_posthoc_tests` (pub) | Satu baris per metode yang dicentang, berurutan LSD, Bonferroni, Sidak (sebelumnya satu metode per analisis); label Scheffe dihapus; CI Sidak dengan α′ = 1 − (1 − α)^(1/c); α dari Options | 12 |
| `rust/src/stats/levene_test.rs` | `calculate_levene_test` (pub) | Model efek utama: satu uji per DV lewat `model_residual_levene` | 14 |
| | `model_residual_levene` (privat, baru) | ANOVA atas sel faktor dari \|residual model\| (df1 = sel − 1, df2 = n − sel), `test_basis` "Based on Model Residuals", seperti SPSS untuk desain selain faktorial penuh | 14 |

### e.2 TypeScript (dialog dan formatter)

| Berkas | Perubahan | Langkah |
|---|---|---|
| `services/multivariate-analysis-formatter.ts` `formatPosthocTests` | Catatan dua level tanpa Scheffé | 12 |
| `dialogs/posthoc.tsx` (MV) | Hanya LSD, Bonferroni, Sidak yang aktif; 15 metode lain, isian Waller, dan isian Dunnett dinonaktifkan; flag metode lain dimatikan saat dialog dibuka; catatan "Only LSD, Bonferroni, and Sidak are supported in this version." | 12 |
| `dialogs/dialog.tsx` (MV) | Tombol Plots dinonaktifkan ("Plots are not supported in this version.") | 13 |
| `repeated-measures/dialogs/dialog.tsx` | Post Hoc dan Plots dinonaktifkan dengan keterangan; OK memeriksa slot within ("Please assign a variable to every within-subjects slot.") | 12, 13 |
| `repeated-measures/dialogs/options.tsx` | Spread-vs-level plots, residual plots, dan lack of fit dinonaktifkan dan dimatikan | 13 |
| `repeated-measures/dialogs/define/repeated-measures-dialog.tsx` | Define memeriksa faktor dan measure (toast) | 13 |
| `repeated-measures/dialogs/repeated-measures-main.tsx` | `posthoc.FixFactorVars` dikirim kosong; galat analisis ditampilkan sebagai toast | 12, 13 |

### e.3 Perilaku yang terlihat pengguna (v2)

- **Two-Way MANOVA tanpa interaksi:** dialog Model → Build Terms (drag `faktorA`, `faktorB`) atau Build Custom Terms tanpa suku `*`. Tabel tidak memuat baris interaksi, dan Levene tampil satu baris per DV ("Based on Model Residuals"). Divalidasi SPSS (mv8).
- **Post hoc MV:** LSD, Bonferroni, dan Sidak sekaligus dalam satu tabel "Multiple Comparisons — <faktor>" (kolom Test). Divalidasi SPSS (mv4ph).
- **Opsi yang tidak berfungsi** tampil nonaktif dengan keterangan. RM menampilkan toast untuk Define atau OK yang belum lengkap dan untuk galat analisis.
- **Waktu analisis:** jalur Full Factorial tidak berubah, dan keluaran sel eksperimen Web Worker identik dengan v1 (`fix-steps/step14-spss-v2/experiment-output-check.txt`). Hasil eksperimen `result_compare.md` §11–§12 tetap berlaku.
