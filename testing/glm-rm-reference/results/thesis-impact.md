# Perubahan kode GLM Repeated Measures untuk naskah: baseline `8e2ddbd2` → branch `fix/rm-correctness`

Isi dokumen:
- daftar faktual perbedaan kode, dari `git diff 8e2ddbd2 HEAD` dan inventaris item Rust (`harness/rust_inventory.py`, parser berbasis baris; keluaran di `thesis-impact-inventory.json`);
- path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/`, kecuali disebut lain.

## a. Item yang ditambah, dihapus, atau diganti namanya (wasm/, models/, stats/, utils/)

**Tidak ada** struct, field, enum, method, atau fungsi yang **dihapus** atau **diganti namanya**. Semua perubahan berupa penambahan item atau perubahan isi fungsi.

### Berkas baru
| Berkas | Item |
|---|---|
| `stats/rm_model.rs` (1413 baris) | **struct** `Term { name, cols, factors }`, `MeasureData { name, variables, y }`, `BetweenFactor { name, levels, labels }`, `RmModel { factor, k, measures, factors, subject_levels, x, xtx_inv, terms, n, rank, excluded, alpha, sum_of_squares, contrast }` |
| | **enum** `WithinContrast { Polynomial, Repeated }` (pub), `Component { Within, Between(usize) }` (privat, untuk target EM Means) |
| | **type** `EmmeansOutput = (HashMap<String, Vec<EstimatedMarginalMean>>, HashMap<String, Vec<PairwiseComparison>>, Vec<String>)` |
| | **fungsi bebas** pub: `helmert`, `within_contrast_type`, `polynomial` |
| | **fungsi bebas** privat: `number`, `level_key`, `find_value`, `def_index`, `between_column`, `sort_levels`, `value_label`, `polynomial_label`, `median`, `trimmed_mean`, `stats`, `hstack` |
| | **method** `RmModel` pub: `build`, `design_note`, `error_df`, `hypothesis`, `error`, `within`, `average`, `multivariate_tests`, `mauchly`, `within_effects`, `within_contrasts`, `averaged_multivariate`, `between_effects`, `univariate_tests`, `descriptives`, `emmeans`, `levene`, `box_m`, `homogeneity_tests`, `residual_matrix`, `bartlett_sphericity` |
| | **method** `RmModel` privat: `coefficients`, `within_sources`, `between_sources`, `effect_rows`, `effect_codes`, `marginal_l`, `estimate`, `response`, `parse_target`, `component_name`, `component_levels`, `cells`, `cell_anova` |
| `stats/glm_tests.rs` (215 baris) | **fungsi** pub: `noncentral_f_cdf`, `observed_power`, `sphericity_significance`, `f_significance`, `multivariate_statistics` |
| | **fungsi** privat: `eigenvalues_e_inv_h` |
| `utils/collections.rs` | **type** `HashMap<K, V> = indexmap::IndexMap<K, V>`, `HashSet<T> = indexmap::IndexSet<T>` |

Deklarasi modul baru: `pub mod glm_tests;` dan `pub mod rm_model;` di `stats/mod.rs`, serta `pub mod collections;` di `utils/mod.rs`. Dependensi baru di `Cargo.toml`: `indexmap = { version = "2", features = ["serde"] }`.

### Berkas yang ada: item ditambah
| Berkas | Perubahan |
|---|---|
| `models/result.rs` | **struct baru** `BoxMTest { box_m, f, df1, df2, significance }`, `HomogeneityTests { box_m, box_m_note, levene, design }`, `LeveneEntry { based_on, statistic, df1, df2, significance }`, `PairwiseComparison { dependent_variable, factor_name, level_i, level_j, mean_difference, std_error, significance, confidence_interval, adjustment }` |
| | **field baru** `RepeatedMeasureResult`: `homogeneity_tests: Option<HomogeneityTests>`, `within_subjects_multivariate: Option<MultivariateTests>`, `emmeans_pairwise: Option<HashMap<String, Vec<PairwiseComparison>>>` |
| | **field baru** `ResidualMatrix`: `covariance: Option<HashMap<String, HashMap<String, f64>>>`, `correlation: Option<…>` |
| `stats/multivariate_tests.rs` | **fungsi baru** `doubly_multivariate_tests` (dipakai hanya lewat modul lama, lihat c) |

### Berkas yang ada: hanya isi yang berubah (nama item tetap)
| Berkas | Perubahan isi |
|---|---|
| `wasm/function.rs` | `run_analysis`: alur baru (lihat b dan c). `get_results`, `get_formatted_results`, `get_executed_functions`, `get_all_errors`, `clear_errors`: tidak berubah. |
| `stats/common.rs` | `get_factor_levels` (melewati Null, level diurutkan: numerik naik, selain itu leksikografis); `build_design_matrix_and_response` (intercept, kovariat, kode efek, produk interaksi; nilai faktor dibaca dari `factors_data[f][s]`) |
| `stats/mauchly_test.rs` | Hasil dikunci per **measure** (sebelumnya per nama faktor within); Sig. memakai `glm_tests::sphericity_significance` (koreksi ω₂) |
| `stats/within_subjects_effects.rs` | Epsilon diambil dengan `mauchly.tests.get(<measure>)` |
| `stats/bartlett_test.rs` | `calculate_bartlett_test_from_residual`: W = \|S\|/(tr S/p)^p dengan S = E/(n − r); χ² = −ρ(n − r)·ln W; `likelihood_ratio` = W^(n/2) |
| `stats/residual_sscp_matrix.rs` | Tiga literal `ResidualMatrix` mendapat `covariance: None, correlation: None` |
| `models/data.rs` | Hanya komentar dokumentasi tata letak data |
| `stats/between_subjects_effects.rs`, `between_subjects_sscp.rs`, `descriptive_statistics.rs`, `emmeans.rs`, `estimable_function.rs`, `parameter_estimates.rs`, `parse_factors.rs`, `posthoc.rs`, `profile_plots.rs`, `sscp_matrix.rs`, `univariate_tests.rs`, `utils/error.rs` | Hanya import: `use std::collections::HashMap;` → `use crate::utils::collections::HashMap;` |
| `wasm/constructor.rs` | Tidak berubah |

## b. Perubahan jumlah

| Ukuran | Baseline `8e2ddbd2` | HEAD |
|---|---|---|
| Field `RepeatedMeasureResult` | 18 | 21 (+ `homogeneity_tests`, `within_subjects_multivariate`, `emmeans_pairwise`) |
| Struct di `models/result.rs` | 37 | 41 (+ `BoxMTest`, `HomogeneityTests`, `LeveneEntry`, `PairwiseComparison`) |
| Enum di `models/result.rs` | 0 | 0 |
| Fungsi di `stats/common.rs` | 34 | 34 (nama sama) |
| Berkas `.rs` di `wasm/ models/ stats/ utils/` | — | + 3 (`stats/rm_model.rs`, `stats/glm_tests.rs`, `utils/collections.rs`) |
| Baris `wasm/function.rs` | 299 | 464 |

### Urutan pemanggilan `run_analysis` (nama di `executed_functions`, kondisinya, dan fungsi yang dipanggil)

**Baseline:** 16 langkah, semuanya fungsi `core::…` (modul lama).

| # | `executed_functions` | Kondisi | Dipanggil |
|---|---|---|---|
| 1 | `parse_within_subject_factors` | selalu | `core::parse_within_subject_factors` |
| 2 | `calculate_descriptive_statistics` | `options.desc_stats` | `core::calculate_descriptive_statistics` |
| 3 | `calculate_bartlett_test` | `options.homogen_test` | `core::calculate_bartlett_test` |
| 4 | `calculate_multivariate_tests` | selalu | `core::calculate_multivariate_tests` |
| 5 | `calculate_mauchly_test` | selalu | `core::calculate_mauchly_test` |
| 6 | `calculate_tests_within_subjects_effects` | selalu | `core::calculate_tests_within_subjects_effects` |
| 7 | `calculate_tests_within_subjects_contrasts` | selalu | `core::calculate_tests_within_subjects_contrasts` |
| 8 | `calculate_between_subjects_effects` | selalu | `core::calculate_between_subjects_effects` |
| 9 | `calculate_parameter_estimates` | `options.param_est` | `core::…` |
| 10 | `calculate_general_estimable_function` | `options.general_fun` | `core::…` |
| 11 | (tidak ada; "Within-subjects SSCP Matrix (not yet implemented)") | — | — |
| 12 | `calculate_between_subjects_sscp` | `options.sscp_mat` | `core::…` |
| 13 | `calculate_residual_matrix` | `options.res_sscp_mat` | `core::calculate_residual_matrix` |
| 14 | `calculate_sscp_matrix` | `options.sscp_mat` | `core::…` |
| 15 | `calculate_univariate_tests` | ada faktor between atau kovariat | `core::calculate_univariate_tests` |
| 17 | `calculate_posthoc_tests` | `posthoc.fix_factor_vars` tidak kosong | `core::…` |
| 18 | `calculate_emmeans` | `emmeans.target_list` tidak kosong | `core::calculate_emmeans` |

**HEAD:**

| # | `executed_functions` | Kondisi | Dipanggil |
|---|---|---|---|
| 0 | `build_rm_model` | selalu | `RmModel::build`; bila `excluded > 0` → pesan "… excluded (listwise)" |
| 1 | `parse_within_subject_factors` | selalu | `core::parse_within_subject_factors` (tabel Within-Subjects Factors) |
| — | **keluar awal** | `RmModel::build` gagal | Hasil hanya berisi `within_subjects_factors` dan `executed_functions`; alasan di Errors Logs |
| 2 | `calculate_descriptive_statistics` | `options.desc_stats` | `RmModel::descriptives` |
| 3 | `calculate_homogeneity_tests` | `options.homogen_test` | `RmModel::homogeneity_tests` (Box's M dan Levene; `box_m_note` dicatat bila ada) |
| 3b | `calculate_bartlett_test` | `options.res_sscp_mat` | `RmModel::bartlett_sphericity` → `bartlett_test::calculate_bartlett_test_from_residual` |
| 4 | `calculate_multivariate_tests` | selalu | `RmModel::multivariate_tests` |
| 5 | `calculate_mauchly_test` | selalu | `RmModel::mauchly` (pesan untuk matriks galat singular) |
| 6 | `calculate_tests_within_subjects_effects` | selalu (butuh hasil 5) | `RmModel::within_effects` |
| 6b | `calculate_within_subjects_multivariate` | lebih dari 1 measure | `RmModel::averaged_multivariate` |
| 7 | `calculate_tests_within_subjects_contrasts` | selalu | `RmModel::within_contrasts` (Polynomial atau Repeated; jenis lain → Err) |
| 8 | `calculate_between_subjects_effects` | selalu | `RmModel::between_effects` |
| 9 | `calculate_parameter_estimates` | `options.param_est` | `core::…` (tidak berubah) |
| 10 | `calculate_general_estimable_function` | `options.general_fun` | `core::…` (tidak berubah) |
| 11 | (tidak ada; `within_subjects_sscp = None`) | — | — |
| 12 | `calculate_between_subjects_sscp` | `options.sscp_mat` | `core::…` (tidak berubah) |
| 13 | `calculate_residual_matrix` | `options.res_sscp_mat` | `RmModel::residual_matrix` |
| 14 | `calculate_sscp_matrix` | `options.sscp_mat` | `core::…` (tidak berubah) |
| 15 | `calculate_univariate_tests` | ada faktor between atau kovariat | `RmModel::univariate_tests` |
| 17 | `calculate_posthoc_tests` | `posthoc.fix_factor_vars` tidak kosong | `core::…` (tidak berubah) |
| 18 | `calculate_emmeans` | `emmeans.target_list` tidak kosong | `RmModel::emmeans` (target tak valid → pesan per target) |

Cabang yang tidak lagi terjangkau:
- Di langkah 2, 4–8, 13, dan 15 kode masih memuat cabang `None => core::…`.
- Di langkah 3 dan 18 ada cabang `None` yang menulis pesan ("… the between-subjects model could not be built"; di langkah 18 juga "… more than one within-subjects factor yet").

Karena ada keluar awal setelah langkah 1, `rm_model` selalu `Some` di titik-titik tersebut, sehingga cabang itu tidak terjangkau.

## c. Perubahan alur

1. **Konstruktor** `RepeatedMeasureAnalysis::new` (`wasm/constructor.rs`) tidak berubah. Ia mem-parse `subject_data`, `factors_data`, `covar_data`, ketiga `*_defs`, dan `config_data` dengan `serde_wasm_bindgen`, memvalidasi `main.SubVar`, lalu memanggil `function::run_analysis`.
2. **`run_analysis`** kini selalu memanggil **`RmModel::build`** lebih dulu. Baseline langsung memanggil modul `core::…` per tabel.
   - `RmModel` adalah model GLM multivariat (pendekatan SPSS GLM) yang dibangun sekali per analisis. Isinya:
     - Y per measure (n × k);
     - matriks desain between X: intercept, kovariat, faktor berkode efek, dan interaksi faktorial penuh;
     - `xtx_inv`, `terms`, dan `rank`;
     - kontras within: `within()` Helmert ortonormal untuk uji; `within_contrasts()` Polynomial ortonormal atau Repeated;
     - variabel "Average": `average()` Σy/√k untuk Polynomial, Σy/k untuk Repeated.
   - Semua tabel inti (Descriptive, Homogeneity, Multivariate, Mauchly, Within/Between Effects, Contrasts, Univariate, Residual SSCP, Bartlett, EM Means dan Pairwise) dihitung dari model yang sama. Nilai p, power, dan statistik multivariat dihitung lewat `glm_tests`.
3. **Titik validasi dan penolakan baru** (`RmModel::build` → `Err`, lalu analisis keluar awal):
   - lebih dari satu faktor within ("Designs with more than one within-subjects factor are not supported in this version");
   - tidak ada variabel within ("No within-subjects variables");
   - faktor within < 2 level;
   - jumlah level tidak sama antar-measure;
   - tata letak `factors_data`/`covar_data` tidak satu rekaman per subjek ("Data layout error for …", `between_column`);
   - faktor atau kovariat tidak ditemukan di defs;
   - faktor between < 2 level;
   - subjek lengkap ≤ jumlah parameter ("Not enough complete subjects …");
   - X'X singular ("The between-subjects design matrix is singular …").
   - Subjek dengan nilai hilang dikeluarkan (listwise) dan dilaporkan, tanpa menghentikan analisis.
4. **Titik penolakan per tabel** (pesan di Errors Logs, tabel lain tetap dihitung):
   - matriks galat singular: `eigenvalues_e_inv_h` untuk Multivariate, `RmModel::mauchly` untuk Mauchly (W = 0, χ² dan Sig. kosong);
   - jenis kontras selain Polynomial/Repeated (`within_contrast_type`);
   - Homogeneity tanpa faktor between;
   - Box's M: sel kurang kasus, atau matriks kovarians sel/gabungan singular;
   - target EM Means yang bukan faktor desain.
5. **Kapan modul lama dipakai:**
   - `core::parse_within_subject_factors` (tabel Within-Subjects Factors);
   - Parameter Estimates, General Estimable Function, Between-Subjects SSCP, SSCP Matrix, dan Post Hoc, yang tidak diubah dan tidak divalidasi.

   Modul lama untuk tabel inti (`calculate_multivariate_tests`, `calculate_mauchly_test`, `calculate_tests_within_subjects_*`, `calculate_between_subjects_effects`, `calculate_univariate_tests`, `calculate_emmeans`, `calculate_residual_matrix`, `calculate_descriptive_statistics`, `calculate_bartlett_test`) masih ada di kode, tetapi tidak lagi dipanggil. Pada baseline, `calculate_bartlett_test` dipanggil untuk opsi Homogeneity tests.
6. **Hasil dikembalikan** seperti sebelumnya: `RepeatedMeasureResult` disimpan di `analysis.result` dan diserialisasi oleh `get_results`/`get_formatted_results` (`serde_wasm_bindgen`).
   - Urutan iterasi map kini deterministik, karena `HashMap` di crate ini adalah `IndexMap` (urutan sisip).

## d. Status temuan lama

| Temuan | Baseline | HEAD |
|---|---|---|
| `within_subjects_sscp` | Field `RepeatedMeasureResult.within_subjects_sscp: Option<WithinSubjectsSSCP>` selalu `None` (Step 11 "not yet implemented") | **Masih berlaku**: tetap `None` (juga di hasil keluar awal) |
| `stats/profile_plots.rs` | 389 baris, `fn create_profile_plots`, tidak dideklarasikan di `stats/mod.rs` (tidak dikompilasi) | **Masih berlaku**: tetap tidak dideklarasikan; hanya import `HashMap` yang berubah |
| `stats/summary_processing.rs` | Berkas kosong (0 baris), dideklarasikan `pub mod summary_processing;`, di-*re-export* `pub use crate::stats::summary_processing::*;` di `stats/core.rs` (peringatan unused import) | **Masih berlaku**: tidak berubah |
| `FunctionLogger` (`utils/log.rs`) | Struct dengan `add_log`, `has_logs`, `get_log_summary`, `get_executed_functions`; tidak dipakai (`run_analysis` memakai `Vec<String>` `executed_functions`) | **Masih berlaku**: tidak berubah dan tidak dipakai |

## e. Perubahan sisi TypeScript yang terlihat di diagram

Path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/`.

1. **Payload `factors_data` / `covar_data`** (`services/repeated-measures-analysis.ts`):
   - **Baseline:** tiga panggilan `getSlicedData` terpisah (DV, faktor, kovariat). Faktor dan kovariat diubah ke bentuk **per subjek** (`factors_data[s] = [{ faktor…: nilai }]`), tidak cocok dengan Rust yang membaca per variabel.
   - **HEAD:** satu `getSlicedData` untuk `[...DV, ...FactorsVar, ...Covariates]`.
     - `subject_data` tetap per subjek: `subject_data[s] = [{ <nama ter-encode>: nilai }]`.
     - `factors_data[f][s]` dan `covar_data[c][s]` dikirim **per variabel**, persis seperti keluaran `getSlicedData`.
   - Kontrak pesan worker (`{id, payload}` → `{id, ok, results, errors}`) dan `shared/glm-execution.ts` tidak berubah.
2. **`dialogs/repeated-measures-main.tsx`:**
   - `executeRepeatedMeasures` menurunkan `model.BetSubVar = [...FactorsVar, ...Covariates]`, `emmeans.SrcList`, `plots.SrcList`, dan `posthoc.SrcList` dari `mainData`. Sebelumnya `BetSubVar` basi pada run pertama.
   - `emmeans.SrcList` juga memuat faktor within.
   - Label bawaan `contrast.FactorList` menjadi `"<faktor>(Polynomial)"`, dan entri dicocokkan dengan `split("(")[0].trim()`.
3. **Dialog Contrast** (`dialogs/contrast.tsx`):
   - Pilihan dibatasi ke `RM_CONTRAST_METHODS` = Polynomial dan Repeated, dengan catatan "Only Polynomial (default) and Repeated contrasts are supported in this version." Baseline menampilkan tujuh pilihan `CONTRASTMETHOD`, dan semuanya diabaikan mesin.
   - Nama faktor diambil dengan `split("(")[0].trim()` (perbaikan format `FactorList` yang menumpuk).
   - Bawaan `RepeatedMeasuresContrastDefault.ContrastMethod` = `"polynomial"` (`constants/repeated-measures-default.ts`; sebelumnya `"none"`).
4. **Dialog Define** (`dialogs/define/repeated-measures-dialog.tsx`): `handleAddFactor` dan `handleContinue` menolak lebih dari satu faktor within dengan `toast.error("Designs with more than one within-subjects factor are not supported in this version.")`.
5. **Pemformat dan output** (`services/repeated-measures-analysis-formatter.ts`, `-output.ts`):
   - Key tabel baru: `box_m_test`, `levene_test`, `tests_within_subjects_effects__multivariate`, `emmeans_pairwise_*`.
   - Tabel `residual_sscp_matrix` kini tiga blok (SSCP, Covariance, Correlation).
   - Label Bartlett "Likelihood Ratio".
   - Tabel Mauchly dikunci per measure.
