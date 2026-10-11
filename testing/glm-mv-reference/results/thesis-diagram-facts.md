# Fakta kode GLM Multivariate untuk sequence diagram (Tahap 1 dan Tahap 2 Bagian 1)

Dokumen ini adalah hasil investigasi saja; tidak ada kode yang diubah. Pembaruan untuk skripsi-final-v2 ada di bagian "Pembaruan skripsi-final-v2" di bawah.

- **Kondisi kode:** HEAD branch `validation/mv-spss`. Investigasi awal pada commit `6e4c5a89`; diperbarui untuk commit `1c7335d8` (Observed Power Welch, B.5 dan B.6).
- **Nomor baris `stats/multivariate_tests.rs`:** mengacu pada `6e4c5a89`. Sejak `1c7335d8`, baris sesudah 348 bergeser **+5** (mis. `calculate_hypothesis_error_matrices` di 379, `calculate_multivariate_test_statistics` di 609, `effect_hypothesis_sscps` di 946). Berkas lain tidak berubah.
- **Pembanding:** baseline `82a63b45` (sebelum perbaikan).
- **Path Rust:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/src/`.
- **Nama:** fungsi, variabel, konteks galat, dan pesan ditulis persis seperti di kode. Nomor baris mengacu pada `6e4c5a89`; untuk `stats/multivariate_tests.rs` lihat catatan pergeseran di atas.
- **Modul `core`:** `stats/core.rs` hanya berisi `pub use` dari semua modul `stats/*`. Karena itu `core::get_factor_levels` dan `common::get_factor_levels` adalah fungsi yang sama (`stats/common.rs`).


---

## Pembaruan skripsi-final-v2 (tag `skripsi-final-v2`, branch `ilham`)

Bagian A dan B di bawah ditulis untuk `6e4c5a89` / `1c7335d8` (skripsi-final-v1). Di v2 (langkah 11–14, `thesis-impact.md` §e), yang berubah untuk kedua diagram adalah:

**Tahap 1 (`MultivariateAnalysis::new`):** tidak berubah. Konstruktor identik dengan v1, termasuk `listwise_complete_cases`.

**Awal `run_analysis` (`wasm/function.rs`):** langkah baru sebelum `basic_processing_summary`:

| # | Langkah | Kode | Bila gagal |
|---|---|---|---|
| 0a | Salin konfigurasi | `let mut model_config = config.clone();` | — |
| 0b | Normalisasi model dialog Model | `normalize_model_spec(&mut model_config)` (privat, baru): Full Factorial → langsung `Ok`; Build Terms / Build Custom Terms setara faktorial penuh → `NonCust = true`; hanya efek utama → `NonCust = false` | `error_collector.add_error("config.validation.model_terms", &msg)`; `return Err(string_to_js_error(msg))`. Pesan: "Nested terms are not supported in this version.", "The custom model has no terms. Add terms in the Model dialog or choose Full Factorial.", "Model term '<t>' is not a selected fixed factor or covariate.", "Interaction terms with covariates are not supported in this version.", "The custom model must include every fixed factor and covariate as a main effect ('<nama>' is missing).", "Only the full factorial model and the main-effects model are supported in this version." |
| 0c | Pakai konfigurasi hasil normalisasi | `let config = &model_config;` | — |

Dengan langkah ini, cabang `Err(e)` di konstruktor (A.1 langkah 24) **dapat terjangkau** di v2 (model kustom yang ditolak). Pada v1 cabang itu tidak terjangkau.

**Tahap 2 Bagian 1 (`calculate_multivariate_tests`):**

| Langkah di B.1 | Perubahan v2 |
|---|---|
| #7 `generate_interaction_terms(&factors)` untuk `terms` | Kondisi menjadi `factors.len() > 1 && config.model.non_cust` |
| #8 `effect_hypothesis_sscps(...)` | Pada model efek utama (`!non_cust`), hasilnya juga memuat `"Intercept"` (H Intercept dari desain berkode deviasi tanpa kolom intercept, pada y − μ₀) dan entri galat model aditif `MAIN_EFFECTS_ERROR_KEY` (E residual, df n − kolom desain) |
| #9, #12 `calculate_hypothesis_error_matrices(...)` | Di awal fungsi: bila `!config.model.non_cust`, H dan df diambil dari `term_sscp.get(effect)` (termasuk Intercept), serta E dan df galat dari `term_sscp.get(MAIN_EFFECTS_ERROR_KEY)`, lalu `return`. Cabang lama (Intercept rata-rata sel, E sel faktorial penuh) hanya untuk faktorial penuh. |
| #15–#18 loop interaksi | Kondisi menjadi `factors.len() > 1 && config.model.non_cust` (tidak ada baris interaksi pada model efek utama) |
| #19–#25 Welch, `design_note`, return | Tidak berubah |

Fungsi lain yang ikut membaca `config.model.non_cust` (di luar diagram Tahap 2 Bagian 1): `build_design_matrix_and_response`, `calculate_tests_between_subjects_effects`, `calculate_between_subjects_sscp`, `generate_parameter_names`, `build_model_string` (residual plots), `compute_model_mse` (post hoc), dan `calculate_levene_test` (satu uji per DV lewat `model_residual_levene`).

**Nomor baris `stats/multivariate_tests.rs` di v2:** bergeser dari angka di bawah. Nama fungsi dan urutan panggilan untuk faktorial penuh tetap.

---

## A. `MultivariateAnalysis::new` (`wasm/constructor.rs`), untuk diagram Tahap 1

### A.1 Urutan lengkap dari awal sampai return

Signature (baris 25–35, tidak berubah sejak `82a63b45`):

```rust
#[wasm_bindgen(constructor)]
pub fn new(
    dep_data: JsValue,
    fix_factor_data: JsValue,
    covar_data: JsValue,
    wls_data: JsValue,
    dep_data_defs: JsValue,
    fix_factor_data_defs: JsValue,
    covar_data_defs: JsValue,
    wls_data_defs: JsValue,
    config_data: JsValue
) -> Result<MultivariateAnalysis, JsValue>
```

Pola galat yang sama dipakai di setiap langkah yang bisa gagal (langkah 3–16 dan 19):
1. `error_collector.add_error(<konteks>, &msg)`;
2. `return Err(string_to_js_error(msg))`.

`string_to_js_error` (`utils/converter.rs`) hanya membungkus pesan: `JsValue::from_str(&error)`.

| # | Baris | Langkah | Kode / kondisi | Bila gagal: konteks `add_error` dan pesan |
|---|---|---|---|---|
| 1 | 37 | Inisialisasi pengumpul galat | `let mut error_collector = ErrorCollector::default();` | — |
| 2 | 40 | Inisialisasi logger | `let logger = FunctionLogger::default();` | — |
| 3 | 43–50 | Parse argumen 1 | `let dependent_data: Vec<Vec<DataRecord>> = serde_wasm_bindgen::from_value(dep_data)` | `"constructor.dependent_data"`, `format!("Failed to parse dependent data: {}", e)` |
| 4 | 52–61 | Parse argumen 2 | `let fix_factor_data: Vec<Vec<DataRecord>> = serde_wasm_bindgen::from_value(fix_factor_data)` | `"constructor.fix_factor_data"`, `"Failed to parse fixed factor data: {}"` |
| 5 | 63–72 | Parse argumen 3 | `let covariate_data: Option<Vec<Vec<DataRecord>>> = serde_wasm_bindgen::from_value(covar_data)` | `"constructor.covariate_data"`, `"Failed to parse covariate data: {}"` |
| 6 | 74–81 | Parse argumen 4 | `let wls_data: Option<Vec<Vec<DataRecord>>> = serde_wasm_bindgen::from_value(wls_data)` | `"constructor.wls_data"`, `"Failed to parse WLS weight data: {}"` |
| 7 | 83–92 | Parse argumen 5 | `let dependent_data_defs: Vec<Vec<VariableDefinition>> = serde_wasm_bindgen::from_value(dep_data_defs)` | `"constructor.dependent_data_defs"`, `"Failed to parse dependent data definitions: {}"` |
| 8 | 94–103 | Parse argumen 6 | `let fix_factor_data_defs: Vec<Vec<VariableDefinition>> = serde_wasm_bindgen::from_value(fix_factor_data_defs)` | `"constructor.fix_factor_data_defs"`, `"Failed to parse fixed factor data definitions: {}"` |
| 9 | 105–114 | Parse argumen 7 | `let covariate_data_defs: Option<Vec<Vec<VariableDefinition>>> = serde_wasm_bindgen::from_value(covar_data_defs)` | `"constructor.covariate_data_defs"`, `"Failed to parse covariate data definitions: {}"` |
| 10 | 116–125 | Parse argumen 8 | `let wls_data_defs: Option<Vec<Vec<VariableDefinition>>> = serde_wasm_bindgen::from_value(wls_data_defs)` | `"constructor.wls_data_defs"`, `"Failed to parse WLS weight data definitions: {}"` |
| 11 | 127–134 | Parse argumen 9 | `let config: MultivariateConfig = serde_wasm_bindgen::from_value(config_data)` | `"constructor.config"`, `"Failed to parse configuration: {}"` |
| 12 | 137–141 | Validasi 1: variabel dependen | `config.main.dep_var.is_none()` | `"config.validation.dep_var"`, `"Dependent variable must be selected for multivariate analysis"` |
| 13 | 144–148 | Validasi 2: metode model | `!config.model.non_cust && !config.model.custom && !config.model.build_custom_term` | `"config.validation.model"`, `"Model specification method must be selected"` |
| 14 | 151–157 | Validasi 3: post hoc | `config.posthoc.src_list` tidak kosong **dan** `config.main.fix_factor` `None` atau kosong | `"config.validation.posthoc"`, `"Fixed factors must be specified for post-hoc tests"` |
| 15 | 160–169 | Validasi 4: bootstrap | `config.bootstrap.perform_boot_strapping` **dan** `config.bootstrap.stratified` **dan** `config.bootstrap.strata_variables` `None` atau kosong | `"config.validation.bootstrap.strata"`, `"Strata variables must be specified for stratified bootstrap"` |
| 16a | 172–183 | Validasi 5 (a): panjang μ₀ | Bila `config.main.test_values` = `Some(tv)`: `tv.len() != dep_var_len` (`dep_var_len` = panjang `config.main.dep_var`, 0 bila `None`) | `"config.validation.test_values.length"`, `format!("TestValues must have the same length as Dependent Variables. Got {} values for {} dependent variables.", tv.len(), dep_var_len)` |
| 16b | 184–188 | Validasi 5 (b): NaN di μ₀ | Masih di `Some(tv)`: `tv.iter().any(\|v\| v.is_nan())` | `"config.validation.test_values.nan"`, `"TestValues contains NaN. Please ensure all numeric inputs are filled in correctly."` |
| 17 | 192–201 | Perakitan data | `let data = AnalysisData { dependent_data, fix_factor_data, covariate_data, wls_data, dependent_data_defs, fix_factor_data_defs, covariate_data_defs, wls_data_defs };` | — |
| 18 | 205 | **Listwise deletion** (baru) | `let (data, excluded) = listwise_complete_cases(&data);` (`data` di-*shadow* oleh data yang sudah difilter) | — |
| 19 | 206–210 | **Tidak ada kasus lengkap** (baru) | `excluded > 0 && data.dependent_data.iter().all(\|slot\| slot.is_empty())` | `"listwise_deletion"`, `"No complete cases: every case has a missing value."` (A.3) |
| 20 | 211–216 | **Catat kasus yang dibuang** (baru) | `excluded > 0` → `error_collector.add_error("listwise_deletion", &format!("{} case(s) with missing values were excluded (listwise).", excluded));` dan tidak return | — (bukan galat fatal; tampil di Errors Logs) |
| 21 | 219–225 | Pembentukan instance | `let mut analysis = MultivariateAnalysis { config, data, result: None, error_collector, logger };` | — |
| 22 | 228–235 | Jalankan analisis | `function::run_analysis(&analysis.data, &analysis.config, &mut analysis.error_collector, &mut analysis.logger)` → `Result<Option<MultivariateResult>, JsValue>` | — |
| 23 | 236–239 | Hasil `Ok(result)` | `analysis.result = result;` lalu `Ok(analysis)` | — |
| 24 | 240 | Hasil `Err(e)` | `Err(e)` diteruskan apa adanya | — |

Catatan untuk diagram:
- **Validasi:** ada lima kelompok validasi (langkah 12–16). Kelompok ke-5 (TestValues) berisi dua pemeriksaan berurutan.
- **Cabang `Err` di langkah 24 tidak terjangkau dalam praktik.** `run_analysis` (`wasm/function.rs`, identik dengan `82a63b45`) tidak punya `return` maupun operator `?`. Setiap langkah di dalamnya memakai `match … { Ok(..) => …, Err(e) => error_collector.add_error("<nama langkah>", &e) }` dan fungsi selalu berakhir dengan `Ok(Some(result))` (baris 361).
- **Perbedaan dengan `82a63b45`:** hanya langkah 18–20, ditambah import `DataValue` dan `use crate::stats::common::merge_records;`. Langkah 1–17 dan 21–24 identik.

### A.2 Signature `listwise_complete_cases`

`wasm/constructor.rs` baris 279, fungsi bebas **privat** (tanpa `pub`) di luar blok `impl`:

```rust
fn listwise_complete_cases(data: &AnalysisData) -> (AnalysisData, usize)
```

- **Kembalian:** tuple `(AnalysisData, usize)`.
  - Elemen 1: data dengan tata letak slot yang sama, hanya berisi baris lengkap. Definisi variabel (`*_defs`) disalin apa adanya.
  - Elemen 2: jumlah baris yang dibuang.
  - Bila tidak ada baris yang dibuang, hasilnya `(data.clone(), 0)`.
- **Urutan di dalamnya:**
  1. Menyusun empat kelompok (nama variabel dari definisi, predikat):
     - `dependent_data_defs`: `numeric_ok` (`DataValue::Number(x)` dengan `x.is_finite()`);
     - `fix_factor_data_defs`: `factor_ok` (bukan `Null`, `Number` berhingga, `Text` tidak kosong setelah `trim`, atau `Boolean`);
     - `covariate_data_defs`: `numeric_ok`;
     - `wls_data_defs`: `numeric_ok`.
  2. `merge_records(data)` (`stats/common.rs` baris 265, pub, sudah ada sejak `82a63b45`), lalu satu `keep: Vec<bool>` per baris: baris dipertahankan bila setiap variabel di keempat kelompok ada di record dan lolos predikatnya.
  3. `excluded` = jumlah `false` di `keep`. Bila `excluded == 0`, fungsi langsung return.
  4. Selain itu, setiap slot `dependent_data`, `fix_factor_data`, `covariate_data`, dan `wls_data` difilter per indeks baris dengan `keep`.
- **Hanya system-missing:** definisi variabel tidak membawa user-missing (`getVarDefs` mengirim `missing: []`, lihat komentar baris 277–278).

### A.3 Apakah galat "No complete cases" dicatat ke `error_collector`?

**Ya**, dicatat dulu, baru dikembalikan (baris 207–209):

```rust
let msg = "No complete cases: every case has a missing value.".to_string();
error_collector.add_error("listwise_deletion", &msg);
return Err(string_to_js_error(msg));
```

- **Konteks:** `"listwise_deletion"`.
- **Pesan:** `"No complete cases: every case has a missing value."`.
- **Kondisi:** `excluded > 0 && data.dependent_data.iter().all(|slot| slot.is_empty())`.

Catatan:
- Setelah `return Err`, instance tidak pernah dibuat. `error_collector` hanya variabel lokal konstruktor, sehingga entri itu tidak bisa dibaca JS lewat `get_all_errors()`. Hal yang sama berlaku untuk semua galat parse dan validasi (langkah 3–16).
- Yang sampai ke JS adalah `JsValue` string pesan yang dilempar oleh `new MultivariateAnalysis(...)`:
  - Di worker (`services/multivariate-analysis-worker.ts`), pesan ditangkap `catch (err)` lalu dikirim `{ id, ok: false, error: String(err) }`. `shared/glm-execution.ts` kemudian me-*reject* dengan `new GlmWorkerTaskError(response.error)`.
  - Di mode main (`runMultivariateOnMainThread`, `services/multivariate-analysis.ts`), konstruktor dipanggil di luar `try`, sehingga pesan dilempar ke pemanggil.
- Entri `"listwise_deletion"` dengan pesan "N case(s) … excluded" (langkah 20) **terbaca** lewat `get_all_errors()`, karena instance terbentuk.

---

## B. `calculate_multivariate_tests` (`stats/multivariate_tests.rs`), untuk diagram Tahap 2 Bagian 1

Signature (baris 35–38, tidak berubah):

```rust
pub fn calculate_multivariate_tests(
    data: &AnalysisData,
    config: &MultivariateConfig
) -> Result<MultivariateTests, String>
```

Dipanggil dari `run_analysis` (`wasm/function.rs` baris 147–156):
- `logger.add_log("calculate_multivariate_tests")`, lalu `core::calculate_multivariate_tests(data, config)`;
- bila `Ok(tests)`: `multivariate_tests = Some(tests)`;
- bila `Err(e)`: `error_collector.add_error("calculate_multivariate_tests", &e)`.

### B.1 Urutan lengkap pemanggilan

Pemanggil "CMT" = `calculate_multivariate_tests`, "CHEM" = `calculate_hypothesis_error_matrices`, "CMTS" = `calculate_multivariate_test_statistics`, "EHS" = `effect_hypothesis_sscps`. Semua fungsi di `multivariate_tests.rs` privat kecuali CMT. Galat dari setiap langkah bertanda `?` atau `return Err` langsung mengakhiri CMT dengan `Err(String)`.

| # | Pemanggil | Dipanggil (argumen persis) | Nilai kembali | Kondisi |
|---|---|---|---|---|
| 1 | CMT (40–42) | — pemeriksaan | `Err("No dependent variables specified")` | `config.main.dep_var` `None` atau kosong |
| 2 | CMT (45–48) | — pemeriksaan | `Err("Need at least 2 dependent variables for multivariate tests")` | `dependent_vars.len() < 2` |
| 3 | CMT (51) | — `let factors = config.main.fix_factor.as_ref().map_or(Vec::new(), \|f\| f.clone());` | `Vec<String>` | selalu |
| 4 | CMT (55) | — `let alpha = config.options.sig_level.unwrap_or(0.05);` | `f64` | selalu |
| 5 | CMT (60) | `super::common::merge_records(data)` | `Vec<DataRecord>` (`merged_for_values`) | selalu |
| 6 | CMT (62–70) | `extract_dependent_value(record, dep_var)` | `Option<f64>`; nilai `Some` dikumpulkan ke `all_values: Vec<Vec<f64>>` (satu vektor per DV) | loop per `dep_var` × per `record` |
| 7 | CMT (73–76) | `generate_interaction_terms(&factors)` | `Vec<String>` (mis. `"A*B"`), ditambahkan ke `terms` (awalnya `factors.clone()`) | hanya bila `factors.len() > 1` |
| 8 | CMT (77–81) | `effect_hypothesis_sscps(data, config, &terms, dependent_vars)?` | `HashMap<String, (Vec<Vec<f64>>, usize)>` = `term_sscp` (B.2) | bila `terms` tidak kosong; bila kosong, `term_sscp = HashMap::new()` |
| 9 | CMT (87–101) | `calculate_hypothesis_error_matrices(data, config, "Intercept", dependent_vars, &all_values, &term_sscp)` | `(h_matrix, e_matrix, hypothesis_df, error_df)`; galat → `Err(format!("Failed to calculate matrices for intercept: {}", e))` | selalu |
| 10 | CMT (104–118) | `calculate_multivariate_test_statistics(&h_matrix, &e_matrix, hypothesis_df, error_df, alpha, dependent_vars.len())` | `HashMap<String, MultivariateTestEntry>`; galat → `"Failed to calculate test statistics for intercept: {}"` | selalu |
| 11 | CMT (120) | `effects.insert("Intercept".to_string(), intercept_tests)` | — | selalu |
| 12 | CMT (124–138) | `calculate_hypothesis_error_matrices(data, config, factor, dependent_vars, &all_values, &term_sscp)` | tuple seperti #9; galat → `"Failed to calculate matrices for factor {}: {}"` | **loop** `for factor in &factors` |
| 13 | CMT (140–156) | `calculate_multivariate_test_statistics(&h_matrix, &e_matrix, hypothesis_df, error_df, alpha, dependent_vars.len())` | galat → `"Failed to calculate test statistics for factor {}: {}"` | di dalam loop #12 |
| 14 | CMT (158) | `effects.insert(factor.clone(), factor_tests)` | — | di dalam loop #12 |
| 15 | CMT (163) | `generate_interaction_terms(&factors)` | `interaction_terms: Vec<String>` (dipanggil lagi, hasil sama dengan #7) | hanya bila `factors.len() > 1` |
| 16 | CMT (166–182) | `calculate_hypothesis_error_matrices(data, config, &term, dependent_vars, &all_values, &term_sscp)` | galat → `"Failed to calculate matrices for interaction {}: {}"` | **loop** `for term in interaction_terms` |
| 17 | CMT (184–204) | `calculate_multivariate_test_statistics(&h_matrix, &e_matrix, hypothesis_df, error_df, alpha, dependent_vars.len())` | galat → `"Failed to calculate test statistics for interaction {}: {}"` | di dalam loop #16 |
| 18 | CMT (206) | `effects.insert(term.clone(), interaction_tests)` | — | di dalam loop #16 |
| 19 | CMT (216–221) | — pemeriksaan | `Err(format!("VarianceMode = Welch requires exactly one Fixed Factor; got {}.", factors.len()))` | `config.main.variance_mode == VarianceMode::Welch` dan `factors.len() != 1` |
| 20 | CMT (223) | `get_factor_levels(data, factor)?` (`factor = &factors[0]`) | `Vec<String>` `levels` | mode Welch |
| 21 | CMT (224–230) | — pemeriksaan | `Err(format!("VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '{}' has {}.", factor, levels.len()))` | mode Welch dan `levels.len() != 2` |
| 22 | CMT (231) | `calculate_welch_two_sample_t2(data, config, factor)?` | `HashMap<String, MultivariateTestEntry>` (hanya kunci `"Hotelling's Trace"`) | mode Welch |
| 23 | CMT (232) | `effects.insert(factor.clone(), welch_tests)` — **menimpa** entri faktor dari #14 | — | mode Welch |
| 24 | CMT (236–250) | `ss_type_label(&config.model.sum_of_square_method)` | `&'static str` (`"Type I"` … `"Type IV"`) → `design_note`: `"{} sum of squares (Welch-Satterthwaite for {})"` (Welch, `{}` kedua = faktor pertama) atau `"{} sum of squares"` | selalu |
| 25 | CMT (252–256) | return | `Ok(MultivariateTests { effects, design: design_note, alpha: Some(alpha) })` | — |

**Di dalam CHEM** (baris 374–574), untuk setiap panggilan #9, #12, dan #16:

| # | Dipanggil | Kondisi |
|---|---|---|
| c1 | — `grand_means` dihitung dari `all_values` (tanpa panggilan fungsi) | selalu |
| c2 | Cabang Intercept (400–559): `super::common::merge_records(data)` (432), `data_value_to_string(v)` per faktor per record (445); tanpa panggilan fungsi lain. Return `Ok((h_matrix, e_matrix, 1.0, error_df))` | `effect == "Intercept"` |
| c3 | `term_sscp.get(effect).cloned()`, galat bila tidak ada: `format!("No hypothesis SSCP for effect '{}'", effect)` (567–570) | efek faktor atau interaksi |
| c4 | `compute_full_model_residual_sscp(data, &all_factors, all_values, n_obs, p)` (572), dengan `all_factors` = `config.main.fix_factor` (atau kosong). Di dalamnya: `super::common::merge_records(data)` dan `data_value_to_string`. Kembali `(e_full, error_df)`. | efek faktor atau interaksi (dihitung ulang per efek) |
| c5 | Return `Ok((h_matrix, e_full, hypothesis_df as f64, error_df))` | efek faktor atau interaksi |

**Di dalam CMTS** (baris 604–830), untuk setiap panggilan #10, #13, dan #17, berurutan:
1. `matrix_inverse(e_matrix)`; galat → `"Failed to invert error matrix: {}"`.
2. `matrix_multiply(h_matrix, &e_inverse)`; galat → `"Failed to multiply H*E^-1: {}"`.
3. `eigenvalues_real(&he_inv)`.
4. `calculate_f_significance(df1, df2, f)` untuk Pillai, Wilks, Hotelling, lalu Roy (4 kali). df dibulatkan: `.round().max(1.0) as usize`.
5. Bila `exact_when_s_one` (`p == 1` atau `hypothesis_df <= 1.0 + 1e-12`): satu kali lagi `calculate_f_significance`. F eksak itu dipakai untuk keempat statistik.
6. `calculate_observed_power(...)` 4 kali lewat closure `power` (B.6).
7. Empat `test_results.insert` dengan kunci `"Pillai's Trace"`, `"Wilks' Lambda"`, `"Hotelling's Trace"`, dan `"Roy's Largest Root"`.

### B.2 `effect_hypothesis_sscps`: kapan, argumen, hasil, dan urutan di dalamnya

- **Kapan:** **sekali**, sebelum perhitungan Intercept dan sebelum kedua loop (langkah #8). Tidak dipanggil per efek. Tidak dipanggil sama sekali bila `terms` kosong (tanpa Fixed Factor).
- **Argumen:** `effect_hypothesis_sscps(data, config, &terms, dependent_vars)`, dengan `terms` = semua faktor (urut `config.main.fix_factor`), diikuti semua suku interaksi dari `generate_interaction_terms(&factors)` bila faktor > 1.
- **Signature** (baris 941, privat):

  ```rust
  fn effect_hypothesis_sscps(
      data: &AnalysisData,
      config: &MultivariateConfig,
      effects: &[String],
      dependent_vars: &[String]
  ) -> Result<HashMap<String, (Vec<Vec<f64>>, usize)>, String>
  ```

- **Isi hasil:** kunci = nama suku (`"F1"`, `"F1*F2"`, …); nilai = `(H, df_h)`.
  - `H` adalah matriks SSCP hipotesis p × p (`Vec<Vec<f64>>`). Diagonalnya sama dengan SS univariat Tests of Between-Subjects Effects untuk jenis SS yang dipilih.
  - `df_h` = jumlah kolom desain efek (`effect_cols.len()`).
- **Urutan panggilan di dalamnya:**
  1. `build_design_matrix_and_response(data, config, dep_var)?` (`stats/common.rs` baris 856). Dipanggil **per DV** (p kali). `x` hanya diambil dari DV pertama; DV berikutnya hanya dicek jumlah barisnya (galat `"Dependent variables have different numbers of cases"`), dan `y`-nya dikumpulkan ke `ys`.
  2. `deviation_coded_design(&x_matrix, data, config)` sekali, untuk semua jenis SS. Di dalamnya:
     - `get_factor_columns(x_matrix, factor, data, config)` per faktor;
     - bila faktor > 1: `generate_interaction_terms(&factors)`, lalu per suku `get_interaction_columns(x_matrix, &term, data, config)` dan `parse_interaction_term(&term)`.
  3. `to_dmatrix(&x_matrix)`, lalu `to_dmatrix(&x_deviation)`, lalu `DMatrix::from_fn(n, p, |r, c| ys[c][r])` (Y).
  4. **Loop per efek** di `effects`:
     1. `get_factor_columns(&x_matrix, effect, data, config)?` (`stats/between_subjects_effects.rs` baris 504). Untuk suku interaksi (nama mengandung `*`), fungsi ini memanggil `get_interaction_columns`. Galat bila hasil kosong: `format!("No design columns for effect '{}'", effect)`.
     2. Pilih model A dan B menurut `config.model.sum_of_square_method`:

        | Jenis SS | Desain | Kolom dibuang di model A | Kolom dibuang di model B | Pusatkan bila A kosong |
        |---|---|---|---|---|
        | `TypeI` | dummy | `min_col..n_cols` | `max_col+1..n_cols` | `true` |
        | `TypeII` | dummy | `containing` + `effect_cols` | `containing` | `false` |
        | `TypeIII` / `TypeIV` | deviasi | `effect_cols` | tidak ada | `false` |

        Untuk `TypeII` saja, `containing_effect_columns(&x_matrix, effect, data, config)` dipanggil dulu. Di dalamnya: `parse_interaction_term(effect)`, `generate_interaction_terms(&factors)`, dan per suku yang memuat efek: `parse_interaction_term(&term)` dan `get_interaction_columns(...)`.
     3. `residual_sscp(x, &y_mat, &drop_a, center_empty)?`, lalu `residual_sscp(x, &y_mat, &drop_b, false)?`. `H` = hasil pertama − hasil kedua.
        - `residual_sscp` (baris 1000, privat): `x.select_columns(keep)`, `(XₖᵀXₖ).try_inverse()`, lalu residual `Y − Xₖ(XₖᵀXₖ)⁻¹XₖᵀY` dan `RᵀR`.
        - Bila tidak ada kolom tersisa: `YᵀY`, atau SSCP terpusat bila `center_when_empty`.
        - Galat inversi: `"Could not invert X'X matrix - possibly due to multicollinearity"`. Galat ini diteruskan dengan `?` sampai CMT, sehingga seluruh Multivariate Tests gagal (termasuk Intercept, karena #8 mendahului #9).
     4. `out.insert(effect.clone(), (h_rows, effect_cols.len()))`.

`deviation_coded_design` dan `containing_effect_columns` di `multivariate_tests.rs` (baris 1032 dan 1086) adalah salinan privat fungsi bernama sama di `between_subjects_effects.rs`. `get_factor_columns` dan `get_interaction_columns` adalah fungsi pub yang sudah ada di `between_subjects_effects.rs`.

### B.3 Signature baru `calculate_hypothesis_error_matrices` dan pemakaian `term_sscp`

```rust
fn calculate_hypothesis_error_matrices(
    data: &AnalysisData,
    config: &MultivariateConfig,
    effect: &str,
    dependent_vars: &[String],
    all_values: &[Vec<f64>],
    term_sscp: &HashMap<String, (Vec<Vec<f64>>, usize)>
) -> Result<(Vec<Vec<f64>>, Vec<Vec<f64>>, f64, f64), String>
```

- **Beda dengan `82a63b45`:** hanya parameter terakhir. Dulu `factors_in_effect: Option<&[String]>`: pemanggil Intercept dan faktor memberi `None`, pemanggil interaksi memberi `Some(&term_factors)` dengan `term_factors = parse_interaction_term(&term)`. Kini ketiganya memberi `&term_sscp`. Fungsi tetap privat, dan tipe kembaliannya sama: `(H, E, df_hipotesis, df_galat)`.
- **Pemakaian `term_sscp`:**
  - **Efek utama dan interaksi:** `H` dan `df_h` diambil langsung dari `term_sscp.get(effect)` (c3), dan `E` dari `compute_full_model_residual_sscp` (c4). Cabang lama dihapus: H efek utama Σ n_k(ȳ_k − ȳ)(ȳ_k − ȳ)ᵀ, H interaksi dari deviasi sel − marginal, beserta fungsi bersarang `generate_level_combinations`.
  - **Intercept:** `term_sscp` **tidak dipakai**. Cabang Intercept menghitung H dan E sendiri (B.4) dan return sebelum baris yang membaca `term_sscp`.

### B.4 Apakah cabang Intercept berubah dibanding `82a63b45`?

**Tidak.** Teks dari `if effect == "Intercept" {` sampai `return Ok((h_matrix, e_matrix, 1.0, error_df));` identik dengan `82a63b45`. Isinya:
- **μ₀:** diambil dari `config.main.test_values` (galat `"TestValues length ({}) must equal number of Dependent Variables ({})"` bila panjangnya salah), atau `vec![0.0; p]` bila `None`.
- **Tanpa faktor (Hotelling satu populasi, termasuk berpasangan):** `H[i][j] = n_obs · (x̄_i − μ₀_i)(x̄_j − μ₀_j)`.
- **Dengan faktor (Type III intercept):** `H[i][j] = Σ_k ȳ_ki · Σ_k ȳ_kj / Σ_k (1/n_k)` atas sel semua faktor. Bila `sum_inv_n` = 0, dipakai rumus tanpa faktor sebagai fallback.
- **E:** SSCP residual terhadap rata-rata sel (satu sel bila tanpa faktor). `df_h = 1,0` dan `error_df = n_obs − jumlah sel`.

Yang berubah di sekitarnya hanya sumber data. Sejak `e6874140`/`28b942db`, `data` yang masuk sudah melewati listwise deletion di konstruktor.

### B.5 Apakah cabang Welch berubah?

**Tidak.**
- Bagian Welch di CMT (langkah #19–#23) sama dengan `82a63b45`: pemeriksaan jumlah faktor, `get_factor_levels(data, factor)?`, pemeriksaan dua level, `calculate_welch_two_sample_t2(data, config, factor)?`, lalu `effects.insert(factor.clone(), welch_tests)` yang menimpa entri faktor.
- Fungsi `calculate_welch_two_sample_t2` identik dengan `82a63b45` sampai `6e4c5a89`. Sejak `1c7335d8`, hanya perhitungan Observed Power-nya yang berubah (lihat di bawah). Urutan panggilannya kini: `compute_per_group_covariances(data, config, &[factor.to_string()])?`, lalu `calculate_f_significance(...)`, lalu `calculate_observed_power(...)`.
- Perubahan lain terkait Welch ada di `design_note` (#24): dulu `"Type {:?} sum of squares (Welch-Satterthwaite for {})"`, kini `ss_type_label(...)`.

Dua fakta untuk diagram:
- Di mode Welch, entri faktor tetap dihitung dulu dengan cara pooled (#12–#14, termasuk H dari `term_sscp`), lalu ditimpa.
- Observed Power di `calculate_welch_two_sample_t2`:
  - Sampai `6e4c5a89`: heuristik lama `if f_stat > 1.0 { (1.0 - 0.1 / f_stat).min(1.0) } else { 0.5 }` (baris 358–362).
  - Sejak `1c7335d8`: `let alpha = config.options.sig_level.unwrap_or(0.05);` lalu `calculate_observed_power(df1.round().max(1.0) as usize, df2.round().max(1.0) as usize, f_stat, alpha)` (baris 349–357), dengan df dan F yang sama dengan Sig. entri tersebut.
  - Mode Welch tidak punya padanan SPSS. Nilai barunya dicek terhadap R (`fix-steps/step10-welch-power/welch-power-check.txt`).

### B.6 Di mana `calculate_observed_power` dipanggil, dan dari mana alpha

- **Di `multivariate_tests.rs`: hanya di CMTS** (baris 773–779), lewat closure:

  ```rust
  let power = |f: f64, df1: f64, df2: f64| {
      calculate_observed_power(df1.round().max(1.0) as usize, df2.round().max(1.0) as usize, f, alpha)
  };
  ```

  Closure itu dipanggil 4 kali (Pillai, Wilks, Hotelling, Roy), dengan F dan df yang sama dengan Sig. (setelah penggantian F eksak bila `exact_when_s_one`). Dengan begitu fungsi ini terpanggil sekali per statistik per efek: Intercept, tiap faktor, dan tiap interaksi.
- **Signature:** `pub fn calculate_observed_power(df1: usize, df2: usize, f_value: f64, alpha: f64) -> f64` (`stats/common.rs` baris 99, tidak berubah). Isinya kini F nonsentral lewat `noncentral_f_cdf` privat.
- **Alpha:**
  1. Di CMT: `let alpha = config.options.sig_level.unwrap_or(0.05);` (baris 55). Field `OptionsConfig.sig_level: Option<f64>`, serde `"SigLevel"` (`models/config.rs` baris 310–311). Nilainya dari input "SigLevel" di dialog Options (`dialogs/options.tsx`), bawaan `SigLevel: 0.05` (`constants/multivariate-default.ts`).
  2. `alpha` diteruskan sebagai argumen ke CMTS di #10, #13, dan #17.
- **Beda dengan `82a63b45`:** CMTS dulu menerima `alpha` tetapi tidak memakainya (`let _ = alpha;`), dan power dihitung `1 − 0,1/F`.
- **Juga di `calculate_welch_two_sample_t2`** (sejak `1c7335d8`, baris 352–357): sekali per analisis mode Welch. Alpha di sini dibaca langsung dari `config.options.sig_level.unwrap_or(0.05)` di dalam fungsi, bukan diteruskan dari CMT; nilainya sama (B.5).
- **Pemanggil lain di crate (di luar Tahap 2 Bagian 1):** `between_subjects_effects.rs` (baris 116, 147, 231, 280) dan `univariate_tests.rs`.

### B.7 Apakah `generate_interaction_terms` masih dipanggil?

**Ya.** Di `multivariate_tests.rs` ada empat tempat pemanggilan:

| Tempat | Baris | Kondisi |
|---|---|---|
| CMT: menyusun `terms` untuk EHS (#7) | 75 | `factors.len() > 1` (**baru**) |
| CMT: loop interaksi (#15) | 163 | `factors.len() > 1` (sudah ada sejak `82a63b45`) |
| `deviation_coded_design` (di dalam EHS) | 1055 | `factors.len() > 1` |
| `containing_effect_columns` (di dalam EHS) | 1098 | hanya `TypeII`, dan `fix_factor.len() > 1` |

Fungsinya `pub fn generate_interaction_terms(factors: &[String]) -> Vec<String>` (`stats/common.rs` baris 411, tidak berubah). Hasilnya semua kombinasi berukuran 2..=N, digabung dengan `"*"` tanpa spasi.
