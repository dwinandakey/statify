# Fakta kode GLM Repeated Measures untuk class diagram dan sequence diagram

Dokumen ini adalah hasil investigasi saja; tidak ada kode yang diubah.

- **Kondisi kode:** HEAD branch `fix/rm-correctness`, commit `c8ed2984`.
- **Path Rust:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/`.
- **Path TypeScript:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/`.
- **Tipe:** ditulis persis seperti di deklarasi. `HashMap` di crate ini adalah alias `crate::utils::collections::HashMap` = `indexmap::IndexMap` (B.3).

---

## A. `models/result.rs`

Semua struct di berkas ini ber-atribut `#[derive(Debug, Serialize, Deserialize, Clone)]`. Tidak ada enum di berkas ini.

### A.1 Daftar 41 struct (urut kemunculan)

| # | Struct | Baris |
|---|---|---|
| 1 | `RepeatedMeasureResult` | 5 |
| 2 | `WithinSubjectsFactors` | 35 |
| 3 | `WithinSubjectFactor` | 40 |
| 4 | `DescriptiveStatistics` | 46 |
| 5 | `StatGroup` | 52 |
| 6 | `StatsEntry` | 60 |
| 7 | `HomogeneityTests` | 67 |
| 8 | `BoxMTest` | 78 |
| 9 | `LeveneEntry` | 87 |
| 10 | `BartlettTest` | 96 |
| 11 | `MultivariateTests` | 106 |
| 12 | `MultivariateTestEntry` | 113 |
| 13 | `MauchlyTest` | 126 |
| 14 | `MauchlyTestEntry` | 133 |
| 15 | `TestsWithinSubjectsEffects` | 145 |
| 16 | `WithinSubjectsEffectsResult` | 150 |
| 17 | `WithinSubjectsEffectSource` | 155 |
| 18 | `TestsWithinSubjectsContrasts` | 169 |
| 19 | `WithinSubjectsContrastsResult` | 174 |
| 20 | `WithinSubjectsContrastSource` | 179 |
| 21 | `TestsBetweenSubjectsEffects` | 193 |
| 22 | `TestEffectEntry` | 200 |
| 23 | `ParameterEstimates` | 212 |
| 24 | `ParameterEstimateEntry` | 217 |
| 25 | `ConfidenceInterval` | 230 |
| 26 | `GeneralEstimableFunction` | 236 |
| 27 | `BetweenSubjectsSSCP` | 242 |
| 28 | `BetweenSSCPMatrix` | 248 |
| 29 | `WithinSubjectsSSCP` | 253 |
| 30 | `ResidualMatrix` | 260 |
| 31 | `SSCPMatrix` | 273 |
| 32 | `UnivariateTests` | 279 |
| 33 | `UnivariateTestEntry` | 285 |
| 34 | `PostHocTest` | 298 |
| 35 | `PairwiseComparison` | 311 |
| 36 | `EstimatedMarginalMean` | 325 |
| 37 | `PlotData` | 335 |
| 38 | `PlotSeries` | 352 |
| 39 | `PlotPoint` | 364 |
| 40 | `LegendItem` | 371 |
| 41 | `SavedVariables` | 379 |

Struct baru dibanding baseline `8e2ddbd2`: `HomogeneityTests`, `BoxMTest`, `LeveneEntry`, `PairwiseComparison`.

### A.2 Deklarasi lengkap (urut sesuai kode)

**`RepeatedMeasureResult`** (21 field)
```rust
pub struct RepeatedMeasureResult {
    pub within_subjects_factors: Option<WithinSubjectsFactors>,
    pub descriptive_statistics: Option<HashMap<String, DescriptiveStatistics>>,
    pub bartlett_test: Option<BartlettTest>,
    pub homogeneity_tests: Option<HomogeneityTests>,            // baru
    pub multivariate_tests: Option<MultivariateTests>,
    pub mauchly_test: Option<MauchlyTest>,
    pub tests_of_within_subjects_effects: Option<TestsWithinSubjectsEffects>,
    pub within_subjects_multivariate: Option<MultivariateTests>, // baru
    pub tests_of_within_subjects_contrasts: Option<TestsWithinSubjectsContrasts>,
    pub tests_of_between_subjects_effects: Option<TestsBetweenSubjectsEffects>,
    pub parameter_estimates: Option<ParameterEstimates>,
    pub general_estimable_function: Option<GeneralEstimableFunction>,
    pub within_subjects_sscp: Option<WithinSubjectsSSCP>,
    pub between_subjects_sscp: Option<BetweenSubjectsSSCP>,
    pub residual_matrix: Option<ResidualMatrix>,
    pub sscp_matrix: Option<SSCPMatrix>,
    pub univariate_tests: Option<UnivariateTests>,
    pub posthoc_tests: Option<HashMap<String, Vec<PostHocTest>>>,
    pub emmeans: Option<HashMap<String, Vec<EstimatedMarginalMean>>>,
    pub emmeans_pairwise: Option<HashMap<String, Vec<PairwiseComparison>>>, // baru
    pub executed_functions: Vec<String>,
}
```

**`HomogeneityTests`**
```rust
pub struct HomogeneityTests {
    pub box_m: Option<BoxMTest>,
    pub box_m_note: Option<String>,
    pub levene: HashMap<String, Vec<LeveneEntry>>,
    pub design: String,
}
```

**`BoxMTest`**
```rust
pub struct BoxMTest {
    pub box_m: f64,
    pub f: f64,
    pub df1: f64,
    pub df2: f64,
    pub significance: f64,
}
```

**`LeveneEntry`**
```rust
pub struct LeveneEntry {
    pub based_on: String,
    pub statistic: f64,
    pub df1: f64,
    pub df2: f64,
    pub significance: f64,
}
```

**`PairwiseComparison`**
```rust
pub struct PairwiseComparison {
    pub dependent_variable: String,
    pub factor_name: String,
    pub level_i: String,
    pub level_j: String,
    pub mean_difference: f64,
    pub std_error: f64,
    pub significance: f64,
    pub confidence_interval: ConfidenceInterval,
    pub adjustment: String,
}
```

**`ResidualMatrix`**
```rust
pub struct ResidualMatrix {
    pub matrix_type: String,
    pub values: HashMap<String, HashMap<String, f64>>,
    pub description: Option<String>,
    #[serde(default)]
    pub covariance: Option<HashMap<String, HashMap<String, f64>>>,   // baru
    #[serde(default)]
    pub correlation: Option<HashMap<String, HashMap<String, f64>>>,  // baru
}
```

**`BartlettTest`**
```rust
pub struct BartlettTest {
    pub likelihood_ratio: f64,
    pub approx_chi_square: f64,
    pub df: usize,
    pub significance: f64,
    pub description: Option<String>,
    pub design: Option<String>,
}
```

**`WithinSubjectsFactors`** / **`WithinSubjectFactor`**
```rust
pub struct WithinSubjectsFactors {
    pub measures: HashMap<String, Vec<WithinSubjectFactor>>,
}
pub struct WithinSubjectFactor {
    pub factor_values: HashMap<String, String>,
    pub dependent_variable: String,
}
```

**`MultivariateTests`** / **`MultivariateTestEntry`**
```rust
pub struct MultivariateTests {
    pub effects: HashMap<String, HashMap<String, MultivariateTestEntry>>,
    pub design: Option<String>,
    pub alpha: Option<f64>,
}
pub struct MultivariateTestEntry {
    pub value: f64,
    pub f: f64,
    pub hypothesis_df: f64,
    pub error_df: f64,
    pub significance: f64,
    pub partial_eta_squared: f64,
    pub noncent_parameter: f64,
    pub observed_power: f64,
    pub is_exact_statistic: bool,
}
```

**`MauchlyTest`** / **`MauchlyTestEntry`**
```rust
pub struct MauchlyTest {
    pub tests: HashMap<String, MauchlyTestEntry>,
    pub design: Option<String>,
    pub note: Option<String>,
}
pub struct MauchlyTestEntry {
    pub effect: String,
    pub mauchly_w: f64,
    pub chi_square: f64,
    pub df: usize,
    pub significance: f64,
    pub greenhouse_geisser_epsilon: f64,
    pub huynh_feldt_epsilon: f64,
    pub lower_bound_epsilon: f64,
}
```

**`TestsWithinSubjectsEffects`** → **`WithinSubjectsEffectsResult`** → **`WithinSubjectsEffectSource`**
```rust
pub struct TestsWithinSubjectsEffects {
    pub measures: HashMap<String, WithinSubjectsEffectsResult>,
}
pub struct WithinSubjectsEffectsResult {
    pub sources: Vec<WithinSubjectsEffectSource>,
}
pub struct WithinSubjectsEffectSource {
    pub source: String,
    pub assumption_type: String,
    pub sum_of_squares: f64,
    pub df: f64,
    pub mean_square: f64,
    pub f: f64,
    pub significance: f64,
    pub partial_eta_squared: f64,
    pub noncent_parameter: f64,
    pub observed_power: f64,
}
```

**`TestsWithinSubjectsContrasts`** → **`WithinSubjectsContrastsResult`** → **`WithinSubjectsContrastSource`**
```rust
pub struct TestsWithinSubjectsContrasts {
    pub measures: HashMap<String, WithinSubjectsContrastsResult>,
}
pub struct WithinSubjectsContrastsResult {
    pub sources: Vec<WithinSubjectsContrastSource>,
}
pub struct WithinSubjectsContrastSource {
    pub source: String,
    pub factor_values: HashMap<String, String>,
    pub sum_of_squares: f64,
    pub df: usize,
    pub mean_square: f64,
    pub f: f64,
    pub significance: f64,
    pub partial_eta_squared: f64,
    pub noncent_parameter: f64,
    pub observed_power: f64,
}
```
Catatan tipe: `df` bertipe `f64` di `WithinSubjectsEffectSource`, tetapi `usize` di `WithinSubjectsContrastSource`.

**`TestsBetweenSubjectsEffects`** / **`TestEffectEntry`**
```rust
pub struct TestsBetweenSubjectsEffects {
    pub effects: HashMap<String, HashMap<String, TestEffectEntry>>,
    pub r_squared: HashMap<String, f64>,
    pub adjusted_r_squared: HashMap<String, f64>,
}
pub struct TestEffectEntry {
    pub sum_of_squares: f64,
    pub df: usize,
    pub mean_square: f64,
    pub f_value: f64,
    pub significance: f64,
    pub partial_eta_squared: f64,
    pub noncent_parameter: f64,
    pub observed_power: f64,
}
```

**`EstimatedMarginalMean`** (dan `ConfidenceInterval` yang dipakainya)
```rust
pub struct EstimatedMarginalMean {
    pub dependent_variable: String,
    pub factor_name: String,
    pub factor_value: String,
    pub mean: f64,
    pub std_error: f64,
    pub confidence_interval: ConfidenceInterval,
}
pub struct ConfidenceInterval {
    pub lower_bound: f64,
    pub upper_bound: f64,
}
```

### A.3 Field yang nama dan tipenya sama, tetapi maknanya berubah

Pembanding: baseline `8e2ddbd2`. Isi di HEAD diisi oleh `RmModel`.

| Struct.field | Baseline | HEAD |
|---|---|---|
| Semua field `HashMap<…>` | `std::collections::HashMap`, urutan iterasi/serialisasi acak per instance | `indexmap::IndexMap`, urutan = urutan sisip (deterministik) |
| `MauchlyTest.tests` (kunci) | Nama **faktor within** (`tests.insert(ws_factor_name, …)`); dengan > 1 measure, entri saling menimpa | Nama **measure** (`tests.insert(m.name.clone(), …)`); satu entri per measure |
| `MauchlyTestEntry.effect` | Nama faktor within | Nama faktor within (`self.factor`), tetap sama; sekarang dibedakan dari kunci |
| `MauchlyTest.design` | Nama faktor (mis. `"time"`) | `design_note()`: `"Intercept[ + <term> …]; Within Subjects Design: <faktor>"` |
| `MauchlyTestEntry.mauchly_w`, `chi_square`, `significance` | Sig. dari χ² tanpa koreksi | Sig. = `sphericity_significance` (koreksi ω₂). Bila matriks galat singular: `mauchly_w` = 0.0, `chi_square` dan `significance` = `f64::NAN` |
| `BartlettTest` (seluruh isi) | Diisi dari opsi **Homogeneity tests** oleh `calculate_bartlett_test`: uji korelasi = identitas pada **variabel faktor between**; `likelihood_ratio` = determinan matriks korelasi | Diisi dari opsi **Residual SSCP matrix** oleh `RmModel::bartlett_sphericity` → `calculate_bartlett_test_from_residual`: kovarians residual ∝ identitas; `likelihood_ratio` = W^(n/2) dengan W = \|S\|/(tr S/p)^p |
| `BartlettTest.design` | `"Bartlett's Test of Sphericity"` | `"Bartlett's Test of Sphericity for Residual Matrix"` |
| `TestsBetweenSubjectsEffects.effects[m][src].sum_of_squares`, `mean_square` | Variabel rata-rata (Σy/k) pada jalur lama | Variabel "Average" = Σy/√k (Polynomial) atau Σy/k (Repeated), SS tipe III dari `RmModel::hypothesis` |
| `TestsBetweenSubjectsEffects.effects[m]` (kunci dalam) | Tergantung modul lama; faktor kategorik bisa dikodekan 0.0 | `"Intercept"`, setiap term (kovariat, faktor, interaksi `a * b`), lalu `"Error"` |
| `TestEffectEntry.significance` baris `"Error"` | `1.0` | `f64::NAN` |
| `WithinSubjectsEffectSource.noncent_parameter` (baris GG/HF/LB) | F × df tak terkoreksi | F × df terkoreksi (`f * d1`, `d1 = df * eps`) |
| `WithinSubjectsEffectSource.observed_power`, `WithinSubjectsContrastSource.observed_power`, `TestEffectEntry.observed_power`, `MultivariateTestEntry.observed_power` | Aproksimasi | `glm_tests::observed_power`: F nonsentral dengan λ = F·df1 |
| `WithinSubjectsContrastSource.source` | Nama **measure** (`"score"`, `"Error(score)"`) | Nama **faktor within** atau interaksinya (`"time"`, `"time * g"`, `"Error(time)"`) |
| `WithinSubjectsContrastSource.factor_values` | Kunci = nama measure, nilai = `"Level j vs. Level j+1"` | Kunci = nama faktor (atau `"Error(<faktor>)"`), nilai = `"Linear"`, `"Quadratic"`, `"Cubic"`, `"Order d"` (Polynomial) atau `"Level j vs. Level j+1"` (Repeated) |
| `MultivariateTests.effects` (kunci luar) | Dengan > 1 measure, entri per measure dikunci nama faktor (saling menimpa) | Efek within: `"<faktor>"`, `"<faktor> * <term>"`. Dengan > 1 measure juga efek between: `"Intercept"` dan setiap term (doubly multivariate) |
| `EstimatedMarginalMean.dependent_variable` | Variabel dependen per sel within (nama ter-encode) | **Nama measure** (`m.name`) |
| `EstimatedMarginalMean.factor_name` / `factor_value` | Faktor between; level | Nama target (`"(OVERALL)"`, faktor, atau `"a * b"`); level, atau gabungan level dengan `" · "` |
| `ResidualMatrix.description` | `"Degrees of freedom: {df}"` | `"Based on Type III Sum of Squares"` |
| `ResidualMatrix.values` | SSCP dari modul lama | SSCP galat model penuh `RmModel::error(Y)`; kunci = nama variabel ter-encode |
| `UnivariateTests.tests[dv]` | SS model dibagi "secara proporsional" | Tipe III per variabel dependen: `"Corrected Model"` (bila ada term), `"Intercept"`, setiap term, `"Error"`, `"Total"`, `"Corrected Total"` |
| `DescriptiveStatistics.groups` | Modul lama | Tanpa faktor between: satu `StatGroup` dengan `factor_name` = faktor within dan `factor_value` = nomor level. Dengan faktor between: satu per sel (label digabung `" · "`), lalu `"Total"` |
| `RepeatedMeasureResult.executed_functions` | Dimulai `"parse_within_subject_factors"` | Dimulai `"build_rm_model"`; string baru: `"calculate_homogeneity_tests"`, `"calculate_within_subjects_multivariate"` (D.2) |

---

## B. `stats/rm_model.rs`, `stats/glm_tests.rs`, `utils/collections.rs`

### B.1 Struct dan enum `rm_model.rs`

`Term`, `MeasureData`, `BetweenFactor`, dan `RmModel` tidak memiliki atribut `derive`.

```rust
pub struct Term {
    pub name: String,
    pub cols: Vec<usize>,
    pub factors: Vec<usize>,
}

pub struct MeasureData {
    pub name: String,
    pub variables: Vec<String>,
    pub y: DMatrix<f64>,
}

pub struct BetweenFactor {
    pub name: String,
    pub levels: Vec<String>,
    pub labels: Vec<String>,
}

pub struct RmModel {
    pub factor: String,
    pub k: usize,
    pub measures: Vec<MeasureData>,
    pub factors: Vec<BetweenFactor>,
    pub subject_levels: Vec<Vec<usize>>,
    pub x: DMatrix<f64>,
    pub xtx_inv: DMatrix<f64>,
    pub terms: Vec<Term>,
    pub n: usize,
    pub rank: usize,
    pub excluded: usize,
    pub alpha: f64,
    pub sum_of_squares: String,
    pub contrast: Result<WithinContrast, String>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum WithinContrast {
    Polynomial,
    Repeated,
}

#[derive(Clone, Copy, PartialEq)]
enum Component {          // privat
    Within,
    Between(usize),
}

pub type EmmeansOutput = (
    HashMap<String, Vec<EstimatedMarginalMean>>,
    HashMap<String, Vec<PairwiseComparison>>,
    Vec<String>,
);
```

### B.2 Signature (visibilitas, parameter, tipe kembalian)

**Fungsi bebas pub di `rm_model.rs`**

| Signature |
|---|
| `pub fn helmert(k: usize) -> DMatrix<f64>` |
| `pub fn within_contrast_type(config: &RepeatedMeasuresConfig, factor: &str) -> Result<WithinContrast, String>` |
| `pub fn polynomial(k: usize) -> DMatrix<f64>` |

Fungsi bebas privat: `number`, `level_key`, `find_value`, `def_index`, `between_column`, `sort_levels`, `value_label`, `polynomial_label`, `median`, `trimmed_mean`, `stats`, `hstack`.

**Method pub `impl RmModel`** (21)

| Signature |
|---|
| `pub fn build(data: &AnalysisData, config: &RepeatedMeasuresConfig) -> Result<RmModel, String>` |
| `pub fn design_note(&self) -> String` |
| `pub fn error_df(&self) -> usize` |
| `pub fn hypothesis(&self, y: &DMatrix<f64>, cols: &[usize]) -> DMatrix<f64>` |
| `pub fn error(&self, y: &DMatrix<f64>) -> DMatrix<f64>` |
| `pub fn within(&self, m: &MeasureData) -> DMatrix<f64>` |
| `pub fn average(&self, m: &MeasureData) -> DMatrix<f64>` |
| `pub fn multivariate_tests(&self) -> Result<MultivariateTests, String>` |
| `pub fn mauchly(&self) -> Result<(MauchlyTest, Vec<String>), String>` |
| `pub fn within_effects(&self, mauchly: &MauchlyTest) -> TestsWithinSubjectsEffects` |
| `pub fn within_contrasts(&self) -> Result<TestsWithinSubjectsContrasts, String>` |
| `pub fn averaged_multivariate(&self) -> Option<Result<MultivariateTests, String>>` |
| `pub fn between_effects(&self) -> TestsBetweenSubjectsEffects` |
| `pub fn univariate_tests(&self) -> UnivariateTests` |
| `pub fn descriptives(&self) -> HashMap<String, DescriptiveStatistics>` |
| `pub fn emmeans(&self, targets: &[String], compare: bool, method: Option<&CIMethod>) -> Result<EmmeansOutput, String>` |
| `pub fn levene(&self) -> HashMap<String, Vec<LeveneEntry>>` |
| `pub fn box_m(&self) -> Result<BoxMTest, String>` |
| `pub fn homogeneity_tests(&self) -> Result<HomogeneityTests, String>` |
| `pub fn residual_matrix(&self) -> ResidualMatrix` |
| `pub fn bartlett_sphericity(&self) -> Result<BartlettTest, String>` |

Method privat `impl RmModel` (13):
- `fn coefficients(&self, y: &DMatrix<f64>) -> DMatrix<f64>`
- `fn within_sources(&self) -> Vec<(String, Vec<usize>)>`
- `fn between_sources(&self) -> Vec<(String, Vec<usize>)>`
- `fn effect_rows(&self, source: &str, ss: f64, df: f64, ss_error: f64, df_error: f64, corrections: &[(&str, f64)]) -> Vec<WithinSubjectsEffectSource>`
- `fn effect_codes(&self, fi: usize, level: usize) -> Vec<f64>`
- `fn marginal_l(&self, levels: &[(usize, usize)]) -> DMatrix<f64>`
- `fn estimate(&self, l: &DMatrix<f64>, y: &DMatrix<f64>) -> (f64, f64)`
- `fn response(&self, m: &MeasureData, within: Option<usize>) -> DMatrix<f64>`
- `fn parse_target(&self, target: &str) -> Result<Vec<Component>, String>`
- `fn component_name(&self, c: Component) -> String`
- `fn component_levels(&self, c: Component) -> Vec<String>`
- `fn cells(&self) -> (Vec<usize>, usize)`
- `fn cell_anova(z: &[f64], cell: &[usize], n_cells: usize) -> (f64, f64, f64, Vec<f64>, Vec<usize>)` (fungsi asosiatif, tanpa `self`)

**Fungsi `glm_tests.rs`**

| Visibilitas | Signature |
|---|---|
| pub | `pub fn noncentral_f_cdf(x: f64, df1: f64, df2: f64, lambda: f64) -> f64` |
| pub | `pub fn observed_power(f: f64, df1: f64, df2: f64, alpha: f64) -> f64` |
| pub | `pub fn sphericity_significance(chi_square: f64, p: usize, v: f64, rho: f64) -> f64` |
| pub | `pub fn f_significance(f: f64, df1: f64, df2: f64) -> f64` |
| pub | `pub fn multivariate_statistics(h: &DMatrix<f64>, e: &DMatrix<f64>, q: f64, v: f64, alpha: f64) -> Result<HashMap<String, MultivariateTestEntry>, String>` |
| privat | `fn eigenvalues_e_inv_h(h: &DMatrix<f64>, e: &DMatrix<f64>) -> Result<Vec<f64>, String>` |

### B.3 Isi `utils/collections.rs`

```rust
//! Map and set types used across the crate.
//!
//! `std::collections::HashMap` iterates in an order that depends on its random
//! hash keys. On wasm32 those keys change every time a new map is created in
//! the same module instance, so iterating the same data gave a different
//! order on every analysis run in a reused instance (worker or main thread):
//! row order changed, and for designs with several measures values were
//! paired with the wrong measure. These aliases keep insertion order
//! (definition order of variables, factors and measures), which makes every
//! result deterministic and matches SPSS's ordering.
pub type HashMap<K, V> = indexmap::IndexMap<K, V>;
pub type HashSet<T> = indexmap::IndexSet<T>;
```

---

## C. `stats/mod.rs` dan `stats/core.rs`

### C.1 Modul di `stats/mod.rs` (20, urut deklarasi)

`core`, `bartlett_test`, `between_subjects_effects`, `between_subjects_sscp`, `common`, `descriptive_statistics`, `emmeans`, `estimable_function`, `glm_tests`, `mauchly_test`, `multivariate_tests`, `parameter_estimates`, `parse_factors`, `posthoc`, `residual_sscp_matrix`, `rm_model`, `sscp_matrix`, `summary_processing`, `univariate_tests`, `within_subjects_effects`.

Berkas `stats/profile_plots.rs` ada di folder, tetapi **tidak** dideklarasikan di `stats/mod.rs`, jadi tidak ikut dikompilasi.

### C.2 `pub use` di `core.rs`

`core.rs` berisi **17** pernyataan `pub use crate::stats::<modul>::*;`, untuk modul:
`bartlett_test`, `between_subjects_effects`, `between_subjects_sscp`, `common`, `descriptive_statistics`, `emmeans`, `estimable_function`, `mauchly_test`, `multivariate_tests`, `parameter_estimates`, `parse_factors`, `posthoc`, `residual_sscp_matrix`, `sscp_matrix`, `summary_processing` (berkas kosong), `univariate_tests`, `within_subjects_effects`.

`rm_model` dan `glm_tests` **tidak** di-re-export lewat `core.rs`:
- `wasm/function.rs` mengimpor `RmModel` langsung, dan fungsi lama lewat `core`.
- `rm_model.rs` mengimpor `glm_tests` langsung (`use super::glm_tests::{ f_significance, multivariate_statistics, observed_power, sphericity_significance };`) dan satu fungsi lama lewat `core` (`use super::core::parse_within_subject_factors;`).

Baris `use` di `wasm/function.rs`:
```rust
use wasm_bindgen::prelude::*;

use crate::models::{
    config::RepeatedMeasuresConfig,
    data::AnalysisData,
    result::RepeatedMeasureResult,
};
use crate::stats::core;
use crate::stats::rm_model::RmModel;
use crate::utils::{ converter::{ string_to_js_error, format_result }, error::ErrorCollector };
```

### C.3 Modul perhitungan lama dan 16 fungsi entrinya

| Modul (15) | Fungsi entri |
|---|---|
| `parse_factors` | `parse_within_subject_factors` |
| `descriptive_statistics` | `calculate_descriptive_statistics` |
| `bartlett_test` | `calculate_bartlett_test` |
| `multivariate_tests` | `calculate_multivariate_tests` |
| `mauchly_test` | `calculate_mauchly_test` |
| `within_subjects_effects` | `calculate_tests_within_subjects_effects`, `calculate_tests_within_subjects_contrasts` |
| `between_subjects_effects` | `calculate_between_subjects_effects` |
| `parameter_estimates` | `calculate_parameter_estimates` |
| `estimable_function` | `calculate_general_estimable_function` |
| `between_subjects_sscp` | `calculate_between_subjects_sscp` |
| `residual_sscp_matrix` | `calculate_residual_matrix` |
| `sscp_matrix` | `calculate_sscp_matrix` |
| `univariate_tests` | `calculate_univariate_tests` |
| `posthoc` | `calculate_posthoc_tests` |
| `emmeans` | `calculate_emmeans` |

**Kelompok 1: masih dipanggil `run_analysis`** (terjangkau pada alur utama), 6 fungsi:
- `core::parse_within_subject_factors` (langkah 1, selalu);
- `core::calculate_parameter_estimates` (`config.options.param_est`);
- `core::calculate_general_estimable_function` (`config.options.general_fun`);
- `core::calculate_between_subjects_sscp` (`config.options.sscp_mat`);
- `core::calculate_sscp_matrix` (`config.options.sscp_mat`);
- `core::calculate_posthoc_tests` (`posthoc.fix_factor_vars` tidak kosong).

**Kelompok 2: dipakai tidak langsung oleh `RmModel`:**

| Fungsi lama | Modul | Pemanggil |
|---|---|---|
| `parse_within_subject_factors` | `parse_factors` | `RmModel::build` (`let within = parse_within_subject_factors(data, config)?;`); juga di kelompok 1 |
| `calculate_bartlett_test_from_residual` (bukan salah satu dari 16 entri) | `bartlett_test` | `RmModel::bartlett_sphericity` (`super::bartlett_test::calculate_bartlett_test_from_residual(&self.error(&y), self.n, self.rank)`) |
| `matrix_determinant`, `from_dmatrix`, `chi_square_cdf` | `common` (lewat `core`) | `calculate_bartlett_test_from_residual` |

**Kelompok 3: tidak dipanggil pada alur utama**, 10 fungsi:
- Masih dirujuk di cabang `None => core::…` yang tidak terjangkau karena ada keluar awal (D.1): `calculate_descriptive_statistics`, `calculate_multivariate_tests`, `calculate_mauchly_test`, `calculate_tests_within_subjects_effects`, `calculate_tests_within_subjects_contrasts`, `calculate_between_subjects_effects`, `calculate_residual_matrix`, `calculate_univariate_tests`.
- Tidak dirujuk sebagai pemanggilan sama sekali: `calculate_bartlett_test` dan `calculate_emmeans`. Di `function.rs` keduanya hanya muncul sebagai string di `executed_functions` dan konteks `add_error`.

Fungsi pub non-entri yang tidak dirujuk di mana pun: `calculate_residual_covariance`, `calculate_residual_correlation`, `calculate_bartlett_sphericity_test` (`residual_sscp_matrix.rs`), serta `calculate_hypothesis_sscp` dan `calculate_error_sscp` (`sscp_matrix.rs`). `doubly_multivariate_tests` (`multivariate_tests.rs`) hanya dipanggil dari `calculate_multivariate_tests` (kelompok 3).

### C.4 Fungsi di `common.rs`

- **32** fungsi `pub fn` tingkat atas;
- **2** fungsi privat tingkat atas: `generate_combinations`, `generate_factor_combinations`;
- **1** fungsi bersarang (`fn generate_level_combinations`, di dalam fungsi lain).

Totalnya **34** fungsi tingkat atas, atau **35** deklarasi `fn` termasuk yang bersarang. `RmModel` tidak memanggil `common.rs` secara langsung.

---

## D. `wasm/function.rs`, `run_analysis` (Tahap 2)

### D.1 Signature dan nilai kembali

```rust
pub fn run_analysis(
    data: &AnalysisData,
    config: &RepeatedMeasuresConfig,
    error_collector: &mut ErrorCollector
) -> Result<Option<RepeatedMeasureResult>, JsValue>
```

- Fungsi ini **selalu mengembalikan `Ok(Some(…))`**. Tidak ada `?`, `return Err`, atau `Ok(None)` di badannya.
- Ada dua titik `return`:
  1. **Keluar awal** (baris 59–83), bila `RmModel::build` gagal (`rm_model_failed == true`):
     ```rust
     return Ok(Some(RepeatedMeasureResult {
         within_subjects_factors,          // Some(..) atau None, dari core::parse_within_subject_factors
         descriptive_statistics: None,
         bartlett_test: None,
         homogeneity_tests: None,
         multivariate_tests: None,
         mauchly_test: None,
         tests_of_within_subjects_effects: None,
         within_subjects_multivariate: None,
         tests_of_within_subjects_contrasts: None,
         tests_of_between_subjects_effects: None,
         parameter_estimates: None,
         general_estimable_function: None,
         within_subjects_sscp: None,
         between_subjects_sscp: None,
         residual_matrix: None,
         sscp_matrix: None,
         univariate_tests: None,
         posthoc_tests: None,
         emmeans: None,
         emmeans_pairwise: None,
         executed_functions,               // ["build_rm_model", "parse_within_subject_factors"]
     }));
     ```
     Pesan `Err` dari `RmModel::build` sudah dicatat dengan `error_collector.add_error("build_rm_model", &e)`.
  2. **Akhir normal** (baris 412–436): `Ok(Some(result))` dengan ke-21 field terisi dari langkah-langkah di D.2.
- Di `RepeatedMeasureAnalysis::new` (`wasm/constructor.rs`), cabang `Err(e) => Err(e)` untuk hasil `run_analysis` karena itu tidak pernah terjadi.

### D.2 Urutan langkah

"Konteks" = argumen pertama `error_collector.add_error`. Setelah baris 59, `rm_model` selalu `Some(model)`.

| No. | `executed_functions.push(…)` | Kondisi (ekspresi di kode) | Dipanggil (argumen) | Field yang diisi | Konteks `add_error` |
|---|---|---|---|---|---|
| 0 | `"build_rm_model"` | tanpa syarat | `RmModel::build(data, config)` | (variabel `rm_model`) | `"build_rm_model"`: pesan `Err`, atau `"{n} subject(s) with missing values were excluded (listwise)."` bila `model.excluded > 0` |
| 1 | `"parse_within_subject_factors"` | tanpa syarat | `core::parse_within_subject_factors(data, config)` | `within_subjects_factors` | `"calculate_within_subjects_factors"` |
| — | — | `if rm_model_failed` | `return Ok(Some(…))` (D.1) | — | — |
| 2 | `"calculate_descriptive_statistics"` | `config.options.desc_stats` | `model.descriptives()` | `descriptive_statistics` | `"calculate_descriptive_statistics"` |
| 3 | `"calculate_homogeneity_tests"` | `config.options.homogen_test` | `model.homogeneity_tests()` | `homogeneity_tests` | `"calculate_homogeneity_tests"` (pesan `Err`, atau `tests.box_m_note` bila `Some`) |
| 3b | `"calculate_bartlett_test"` | `config.options.res_sscp_mat` dan `if let Some(model) = &rm_model` | `model.bartlett_sphericity()` | `bartlett_test` | `"calculate_bartlett_test"` |
| 4 | `"calculate_multivariate_tests"` | tanpa syarat | `model.multivariate_tests()` | `multivariate_tests` | `"calculate_multivariate_tests"` |
| 5 | `"calculate_mauchly_test"` | tanpa syarat | `model.mauchly()`, lalu `.map(\|(test, problems)\| …)` | `mauchly_test` | `"calculate_mauchly_test"` (setiap `problems[i]`, atau pesan `Err`) |
| 6 | `"calculate_tests_within_subjects_effects"` | tanpa syarat | `model.within_effects(mauchly)` bila `(Some(model), Some(mauchly))`; `Err("Not computed: Mauchly's test failed")` bila `(Some(_), None)` | `tests_of_within_subjects_effects` | `"calculate_tests_within_subjects_effects"` |
| 6b | `"calculate_within_subjects_multivariate"` | `if let Some(model) = &rm_model` dan `if let Some(result) = model.averaged_multivariate()` (> 1 measure) | `model.averaged_multivariate()` | `within_subjects_multivariate` | `"calculate_within_subjects_multivariate"` |
| 7 | `"calculate_tests_within_subjects_contrasts"` | tanpa syarat | `model.within_contrasts()` | `tests_of_within_subjects_contrasts` | `"calculate_tests_within_subjects_contrasts"` |
| 8 | `"calculate_between_subjects_effects"` | tanpa syarat | `model.between_effects()` | `tests_of_between_subjects_effects` | `"calculate_tests_between_subjects_effects"` (berbeda dari string `executed_functions`) |
| 9 | `"calculate_parameter_estimates"` | `config.options.param_est` | `core::calculate_parameter_estimates(data, config)` | `parameter_estimates` | `"calculate_parameter_estimates"` |
| 10 | `"calculate_general_estimable_function"` | `config.options.general_fun` | `core::calculate_general_estimable_function(data, config)` | `general_estimable_function` | `"calculate_general_estimable_function"` |
| 11 | (tidak ada) | — | `let within_subjects_sscp = None;` | `within_subjects_sscp` = `None` | — |
| 12 | `"calculate_between_subjects_sscp"` | `config.options.sscp_mat` | `core::calculate_between_subjects_sscp(data, config)` | `between_subjects_sscp` | `"calculate_between_subjects_sscp"` |
| 13 | `"calculate_residual_matrix"` | `config.options.res_sscp_mat` | `model.residual_matrix()` | `residual_matrix` | `"calculate_residual_matrix"` |
| 14 | `"calculate_sscp_matrix"` | `config.options.sscp_mat` | `core::calculate_sscp_matrix(data, config)` | `sscp_matrix` | `"calculate_sscp_matrix"` |
| 15 | `"calculate_univariate_tests"` | `has_between_factors \|\| has_covariates` (dari `config.main.factors_var` / `config.main.covariates` tidak kosong) | `model.univariate_tests()` | `univariate_tests` | `"calculate_univariate_tests"` |
| 17 | `"calculate_posthoc_tests"` | `if let Some(fix_factor_vars) = &config.posthoc.fix_factor_vars` dan `!fix_factor_vars.is_empty()` | `core::calculate_posthoc_tests(data, config)` | `posthoc_tests` | `"calculate_posthoc_tests"` |
| 18 | `"calculate_emmeans"` | `if let Some(target_list) = &config.emmeans.target_list` dan `!target_list.is_empty()` | `model.emmeans(target_list, config.emmeans.comp_main_effect, config.emmeans.confi_interval_method.as_ref())` | `emmeans` (bila `means` tidak kosong), `emmeans_pairwise` (bila `pairs` tidak kosong) | `"calculate_emmeans"` (setiap `problem`, atau pesan `Err`) |

Nomor langkah mengikuti komentar di kode ("Step 1" … "Step 18"; tidak ada Step 16). Langkah 0, 3b, dan 6b adalah tambahan tanpa nomor "Step" di kode.

### D.3 Langkah tanpa syarat dan bersyarat

- **Tanpa syarat (7):** 0 `build_rm_model`, 1 `parse_within_subject_factors`, 4 `calculate_multivariate_tests`, 5 `calculate_mauchly_test`, 6 `calculate_tests_within_subjects_effects`, 7 `calculate_tests_within_subjects_contrasts`, 8 `calculate_between_subjects_effects`.
  - Langkah 4–8 hanya dijalankan bila tidak terjadi keluar awal.
- **Bersyarat (12):** 2, 3, 3b, 6b, 9, 10, 12, 13, 14, 15, 17, 18.
- Ditambah satu cabang keluar awal (`if rm_model_failed`) dan satu langkah tanpa pemanggilan (11).

### D.4 Mauchly ke `within_effects`

```rust
let result = match (&rm_model, &mauchly_test) {
    (Some(model), Some(mauchly)) => Ok(model.within_effects(mauchly)),
    (Some(_), None) => Err("Not computed: Mauchly's test failed".to_string()),
    ...
};
```

- `mauchly_test: Option<MauchlyTest>` hasil langkah 5 diteruskan sebagai `&MauchlyTest` (argumen `mauchly`).
- Di dalam `within_effects`, epsilon per measure diambil dengan `mauchly.tests.get(&m.name)`, yaitu kunci nama measure.

---

## E. Alur internal `RmModel`

### E.1 `RmModel::build(data, config)`

Urutan:
1. `parse_within_subject_factors(data, config)?`: memetakan variabel ter-encode `"<var>_(<level>,<measure>)"` ke measure dan level (regex `(\w+)_\((\d+(?:,\d+)*),(\w+)\)`).
2. `factor_names` dari `config.model.def_factors` (dipisah `';'`).
3. Nama faktor within = kunci pertama `factor_values`, atau `factor_names.first()`, atau `"Factor"`.
4. Variabel per measure diurutkan menurut level. `k` = jumlah level measure pertama.
5. `n_all = data.subject_data.len()`. `factor_list` = `config.main.factors_var`, `covariate_list` = `config.main.covariates`. Kolom dibaca dengan `between_column(&data.factors_data, &data.factors_data_defs, f, n_all, "between-subjects factor")` dan `between_column(&covariate_data, &covariate_defs, c, n_all, "covariate")`. Tata letak: `data[f][s]`.
6. **Listwise:** subjek dipakai hanya bila semua nilai DV numerik, semua level faktor ada, dan semua kovariat numerik. `n` = jumlah subjek yang dipakai, `excluded = n_all - n`.
7. Level faktor between dikumpulkan dari subjek yang dipakai, diurutkan dengan `sort_levels` (numerik naik, selain itu leksikografis). Label diambil dari *value label* (`value_label`). Lalu dibentuk `subject_levels`.
8. **Matriks desain X:** kolom intercept, lalu satu kolom per kovariat (`Term` dengan `factors` kosong), lalu kode efek (level terakhir = −1) untuk setiap subset faktor (semua interaksi, urut ukuran subset). Setiap subset menjadi satu `Term` bernama `"a * b"`.
9. `rank = x.ncols()`; cek `n <= rank`.
10. `xtx_inv = (Xᵀ X).try_inverse()`; cek singular.
11. `MeasureData { name, variables, y }` dengan y berukuran n × k.
12. `contrast = within_contrast_type(config, &factor)`, dibaca dari `config.contrast.factor_list` (E.5). Hasilnya disimpan sebagai `Result`, sehingga jenis kontras yang tidak didukung **tidak** menggagalkan `build`.
13. `alpha = config.options.sig_level.unwrap_or(0.05)`, `sum_of_squares = format!("{:?}", config.model.sum_of_square_method)`.

Kondisi `Err` (pesan persis):

| Kondisi | Pesan |
|---|---|
| Regex tidak valid (di `parse_within_subject_factors`) | pesan error `regex` |
| `factor_names.len() > 1` | `"Designs with more than one within-subjects factor are not supported in this version"` |
| `within.measures.is_empty()` | `"No within-subjects variables"` |
| `k < 2` | `"The within-subjects factor needs at least 2 levels"` |
| jumlah level tidak sama antar-measure | `"All measures must have the same number of within-subjects levels"` |
| variabel tidak ada di defs (`between_column`) | `"{what} '{name}' not found in the data definitions"` |
| indeks variabel tanpa data | `"No data for {what} '{name}'"` |
| panjang kolom ≠ jumlah subjek | `"Data layout error for {what} '{name}': expected one record per subject ({n} subjects), got {m} records. factors_data/covar_data must hold one array per variable with one record per subject."` |
| faktor between < 2 level | `"Between-subjects factor '{name}' has fewer than 2 levels"` |
| `n <= rank` | `"Not enough complete subjects ({n}) for a design with {rank} parameters"` |
| `Xᵀ X` tidak dapat diinvers | `"The between-subjects design matrix is singular (empty cells or collinear covariates)"` |

`{what}` = `"between-subjects factor"` atau `"covariate"`.

### E.2 `RmModel::multivariate_tests`

- `v = error_df() = n − rank`.
- **Efek between** (hanya bila `measures.len() > 1`):
  - `T_all = hstack(average(m) untuk setiap measure)`;
  - `E = error(T_all)`;
  - untuk setiap `(name, cols)` di `between_sources()` (`"Intercept"` kolom 0, lalu setiap term): `H = hypothesis(T_all, cols)`.
- **Efek within:**
  - `Z_all = hstack(within(m) untuk setiap measure)` (Helmert ortonormal);
  - `E = error(Z_all)`;
  - untuk setiap `(name, cols)` di `within_sources()` (faktor kolom 0, lalu `"<faktor> * <term>"`): `H = hypothesis(Z_all, cols)`.
- `hypothesis(y, cols)` = Bᴶᵀ [(XᵀX)⁻¹ᴶᴶ]⁻¹ Bᴶ dengan B = (XᵀX)⁻¹Xᵀy (disimetrikan). `error(y)` = (y − XB)ᵀ(y − XB).
- Fungsi `glm_tests`: `multivariate_statistics(&H, &E, cols.len() as f64, v, self.alpha)`.
  - Di dalamnya `eigenvalues_e_inv_h` (cek singular: nilai eigen minimum E ≤ 1e-10 × maksimum), lalu Pillai, Wilks (F Rao), Hotelling, Roy, `f_significance`, dan `observed_power`.
  - `Err` diberi awalan `"{name}: "`.
- `design = Some(self.design_note())`, `alpha = Some(self.alpha)`.

### E.3 `RmModel::mauchly`

Per measure m:
- `S = error(within(m)) / v`, dengan `within(m) = Y_m · helmert(k)ᵀ` (Helmert ortonormal, (k−1) × k). p = k − 1.
- Nilai eigen S dari `SymmetricEigen`. **Singular** bila `!(max_eig > 0.0) || min_eig <= 1e-10 * max_eig`.
  - **Cabang singular:** W = 0.0, `chi_square` = `f64::NAN`, `significance` = `f64::NAN`. Pesan ditambahkan ke `problems`: `"{measure}: the error covariance matrix of the transformed variables is singular, so Mauchly's W = 0 and its chi-square and significance cannot be computed"`.
  - **Cabang biasa:**
    - W = det(S) / (tr(S)/p)^p (0 bila tr(S)/p ≈ 0).
    - `correction` = (2p² + p + 2)/(6p).
    - χ² = −(v − correction)·ln W (∞ bila W ≤ 0, lalu disimpan sebagai 0.0).
    - `rho = 1 − correction / v`.
    - Sig. = `sphericity_significance(chi_square, p, v, rho)` = P(χ²_f > c) + ω₂·[P(χ²_{f+4} > c) − P(χ²_f > c)], dengan ω₂ = (p+2)(p−1)(p−2)(2p³+6p²+3p+2)/(288·p²·v²·ρ²).
- df = p(p+1)/2 − 1.
- Epsilon dihitung di `RmModel::mauchly`, dari nilai eigen yang sama, **dan untuk kedua cabang**:
  - **Greenhouse-Geisser:** (Σλ)² / (p·Σλ²), atau 1.0 bila Σλ² < 1e-12.
  - **Huynh-Feldt:** bila `n <= k`, `min(gg, 1)`. Selain itu `den = p·(v − p·gg)`; bila |den| < 1e-12 hasilnya `min(gg, 1)`, bila tidak `min(1, max(gg, (n·p·gg − 2)/den))`.
  - **Lower-bound:** 1/p.
- Hasil: `MauchlyTestEntry` disisipkan dengan kunci `m.name`, dan `effect = self.factor`. `MauchlyTest.design = Some(design_note())`, `note` = kalimat hipotesis nol.
- Nilai kembali: `Ok((test, problems))`. `run_analysis` mencatat setiap `problems[i]` dengan konteks `"calculate_mauchly_test"`.

### E.4 `RmModel::within_effects(mauchly)`

Per measure m:
- `Z = within(m)`, `ss_error = trace(error(Z))`, `df_error = p·v`.
- `eps = mauchly.tests.get(&m.name)`. Koreksinya dalam urutan `assumption_type`:
  - `("Sphericity Assumed", 1.0)`;
  - `("Greenhouse-Geisser", greenhouse_geisser_epsilon)`;
  - `("Huynh-Feldt", huynh_feldt_epsilon)`;
  - `("Lower-bound", lower_bound_epsilon)`.

  Cadangan bila entri tidak ada: 1.0, 1.0, dan 1/p.
- Untuk setiap `(name, cols)` di `within_sources()`: `ss = trace(hypothesis(Z, cols))` dan `df = p·cols.len()`, lalu `effect_rows` menghasilkan 4 baris:
  - `F = (ss/df)/(ss_error/df_error)`, sama di keempat baris;
  - `d1 = df·eps`, `d2 = df_error·eps`;
  - `mean_square = ss/d1`, `significance = f_significance(F, d1, d2)`;
  - `partial_eta_squared = ss/(ss + ss_error)`;
  - `noncent_parameter = F·d1`, `observed_power = observed_power(F, d1, d2, alpha)` (`glm_tests`).
- Terakhir 4 baris `"Error(<faktor>)"`: `df = df_error·eps`, `mean_square = ss_error/(df_error·eps)`, dan field uji = 0.0.

### E.5 `RmModel::within_contrasts`

- Jenis kontras = `self.contrast.clone()?`, diisi di `build` oleh `within_contrast_type(config, &factor)`.
  - Sumbernya `config.contrast.factor_list` (TS: `contrast.FactorList`), yaitu entri yang nama sebelum `'('`-nya = faktor. Diambil kelompok kurung terakhir (`rsplit_once('(')`), bagian sebelum `','`, huruf kecil.
  - `""`, `"none"`, atau `"polynomial"` → `WithinContrast::Polynomial`; `"repeated"` → `WithinContrast::Repeated`; selain itu `Err("Contrast type '{other}' for the within-subjects factor '{factor}' is not supported yet; use Polynomial or Repeated")`.
  - `config.contrast.contrast_method` (TS `ContrastMethod`) **tidak dibaca** oleh mesin Rust.
- Per measure dan per j = 0 … k−2:
  - **Polynomial:** label `"Linear"`, `"Quadratic"`, `"Cubic"`, `"Order d"`; d = Y·(baris j dari `polynomial(k)`), yaitu kontras polinomial ortonormal (Gram-Schmidt dua kali atas pangkat terpusat).
  - **Repeated:** label `"Level {j+1} vs. Level {j+2}"`; d = y_{j+1} − y_j, tidak dinormalisasi.
  - `ss_error = error(d)`, `ms_error = ss_error / v`. Untuk setiap within source: `ss = hypothesis(d, cols)`, `df = cols.len()`, `F`, `f_significance`, η², `noncent = F·df`, `observed_power(F, df, v, alpha)`.
  - `factor_values = {<faktor>: label}`. Baris error: `source = "Error(<faktor>)"`, `factor_values = {"Error(<faktor>)": label}`, `df = v`.
- Urutan baris: semua kontras faktor, lalu kontras tiap interaksi, lalu baris error.
- Komentar dokumentasi di atas method ini masih menyebut hanya "adjacent levels, Level j vs. Level j+1".

### E.6 `RmModel::between_effects`

- Per measure: `T = average(m)`.
  - Kontras **Polynomial** (atau `contrast` = `Err`): T = Σ_j y_j / √k.
  - Kontras **Repeated**: T = Σ_j y_j / k.
- `ss_error = error(T)`, `ms_error = ss_error/v`.
- Untuk setiap `(name, cols)` di `between_sources()` (`"Intercept"`, lalu setiap term): SS tipe III = `hypothesis(T, cols)[(0,0)]`, `df = cols.len()`, `F`, `f_significance`, η², `noncent = F·df`, `observed_power`.
- Baris `"Error"`: `significance = f64::NAN`.
- Juga menghitung `r_squared` dan `adjusted_r_squared` per measure.
- Komentar dokumentasi method ini masih menyebut "normalized as Σ y / √k".

### E.7 Method lain (satu kalimat masing-masing)

- **`descriptives`:** menghitung mean, simpangan baku (n − 1), dan n setiap variabel dependen per sel faktor between (label digabung `" · "`) ditambah baris `"Total"`; tanpa faktor between, satu baris berlabel nomor level.
- **`homogeneity_tests`:** mengembalikan `Err` bila tidak ada faktor between; bila ada, menjalankan `box_m()` (Box's M dengan aproksimasi F Box 1949; bila gagal, pesannya masuk `box_m_note`) dan `levene()` (Levene per variabel dependen: Based on Mean, Median, Median with adjusted df, trimmed mean 5%).
- **`bartlett_sphericity`:** memanggil `bartlett_test::calculate_bartlett_test_from_residual(&self.error(&Y), self.n, self.rank)` dengan Y = semua variabel dependen.
- **`averaged_multivariate`:** untuk > 1 measure, menjumlahkan blok diagonal SSCP hipotesis dan galat Z_all per kontras (H*, E*) lalu memanggil `multivariate_statistics(&H*, &E*, cols.len()·p, v·p, alpha)`; untuk 1 measure mengembalikan `None`.
- **`univariate_tests`:** uji tipe III per variabel dependen terhadap X (Corrected Model, Intercept, setiap term, Error, Total, Corrected Total).
- **`residual_matrix`:** SSCP galat semua variabel dependen `error(Y)` beserta Covariance (SSCP/v) dan Correlation.
- **`emmeans`:** untuk setiap target (`"(OVERALL)"`, faktor within/between, atau interaksi) menghitung rata-rata marginal per measure dengan L·B (faktor yang tidak disebut diberi bobot sama, kovariat pada rata-ratanya) dengan SE = √(L(XᵀX)⁻¹Lᵀ·MSE) dan CI t(v); bila `compare` diset dan target berupa satu faktor, menghitung perbandingan berpasangan LSD/Bonferroni/Sidak (untuk faktor within lewat variabel selisih). Target yang tidak valid menjadi pesan di elemen ketiga `EmmeansOutput`.

Komentar dokumentasi "Bartlett's Test of Sphericity of the residual covariance matrix…" terletak di atas `residual_matrix`, bukan di atas `bartlett_sphericity`.

---

## F. Tahap 1 dan Tahap 3

### F.1 `wasm/constructor.rs`

`git diff 8e2ddbd2 HEAD -- rust/src/wasm/constructor.rs` **kosong**: berkas tidak berubah.

Konstruktor `#[wasm_bindgen(constructor)] pub fn new(subject_data: JsValue, factors_data: JsValue, covar_data: JsValue, subject_data_defs: JsValue, factors_data_defs: JsValue, covar_data_defs: JsValue, config_data: JsValue) -> Result<RepeatedMeasureAnalysis, JsValue>` menerima **7 argumen**. Urutannya:
1. Tujuh parse `serde_wasm_bindgen::from_value`; masing-masing mengembalikan `Err` bila gagal, dengan konteks `constructor.<nama>`.
2. **Satu validasi:** `config.main.sub_var` `None` atau kosong → `"At least one subject variable must be selected for repeated measures analysis"`, konteks `"config.validation.sub_var"`.
3. Membentuk `AnalysisData`, lalu `function::run_analysis(...)`; hasilnya disimpan di `analysis.result`.

Struct `RepeatedMeasureAnalysis` (field privat): `config: RepeatedMeasuresConfig`, `data: AnalysisData`, `result: Option<RepeatedMeasureResult>`, `error_collector: ErrorCollector`.

### F.2 `utils/converter.rs` `format_result`

Bila `result` = `None`: `Err(JsValue::from_str("No repeated measures analysis results available"))`. Berkas ini juga tidak berubah dari baseline. Karena `run_analysis` selalu mengembalikan `Some`, cabang ini tidak terjangkau lewat konstruktor.

Bila serialisasi gagal: `"Failed to serialize repeated measures results: {e}"`.

Serialisasi memakai `serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true)`.

### F.3 Pemanggil konstruktor dan `get_formatted_results`

| Mode | Berkas | Fungsi / handler |
|---|---|---|
| worker | `services/repeated-measures-analysis-worker.ts` | `self.onmessage`: `init()` (sekali, `wasmReady`) → `new RepeatedMeasureAnalysis(payload.subject_data, payload.factors_data, payload.covar_data, payload.subject_data_defs, payload.factors_data_defs, payload.covar_data_defs, payload.config_data)` → `get_formatted_results()`, `get_all_errors()` → `free()` → `self.postMessage({ id, ok: true, results, errors })`, atau `{ id, ok: false, error }` bila gagal |
| main / main-fallback | `services/repeated-measures-analysis.ts` | `runRepeatedMeasuresOnMainThread(payload)`, dengan urutan yang sama |
| pemilih mode | `services/repeated-measures-analysis.ts` | `computeRepeatedMeasures(payload)` → `executeGlmComputation({ module: "repeated-measures", client: repeatedMeasuresWorker, payload, runOnMainThread })` (`shared/glm-execution.ts`) |

Worker dibuat oleh `new GlmWorkerClient("repeated-measures", () => new Worker(new URL("./repeated-measures-analysis-worker.ts", import.meta.url), { type: "module" }))`. `analyzeRepeatedMeasures` membangun payload, memanggil `computeRepeatedMeasures`, lalu `transformRepeatedMeasureResult` dan `resultRepeatedMeasures`.

---

## G. Sisi TypeScript

### G.1 Kunci tabel dari `transformRepeatedMeasureResult`

Urutan pemanggilan pemformat, dan kondisi tiap tabel:

| # | Kunci | Kondisi muncul | Jumlah |
|---|---|---|---|
| 1 | `within_subjects_factors_<measure>` | `within_subjects_factors.measures` ada; per measure dengan daftar tidak kosong | M |
| 2 | `descriptive_statistics_<dv>` | `descriptive_statistics` ada (opsi DescStats) | D = k·M |
| 3 | `box_m_test` | `homogeneity_tests.box_m` ada (opsi HomogenTest, ada faktor between, Box's M terhitung) | 0/1 |
| 4 | `levene_test` | `homogeneity_tests.levene` tidak kosong | 0/1 |
| 5 | `bartlett_test` | `bartlett_test` ada (opsi ResSscpMat) | 0/1 |
| 6 | `multivariate_tests` | `multivariate_tests.effects` ada (tidak ada bila matriks galat singular) | 0/1 |
| 7 | `mauchly_test` | `mauchly_test.tests` ada | 1 |
| 8 | `tests_within_subjects_effects__multivariate` | `within_subjects_multivariate.effects` ada (M > 1) | 0/1 |
| 9 | `tests_within_subjects_effects_<measure>` | `tests_of_within_subjects_effects.measures` ada | M |
| 10 | `tests_within_subjects_contrasts_<measure>` | `tests_of_within_subjects_contrasts.measures` ada; daftar sumber tidak kosong | M |
| 11 | `tests_between_subjects_effects` | `tests_of_between_subjects_effects.effects` ada | 1 |
| 12 | `parameter_estimates_<dv>` | `parameter_estimates.estimates` ada (opsi ParamEst, modul lama) | per kunci |
| 13 | `general_estimable_function` | `general_estimable_function.matrix` ada dan punya parameter (opsi GeneralFun) | 0/1 |
| 14 | `residual_sscp_matrix` | `residual_matrix.values` ada (opsi ResSscpMat) | 0/1 |
| 15 | `sscp_matrix_<kategori>` | `sscp_matrix.categories` ada (opsi SscpMat); kategori `"Lack of Fit"`, `"Pure Error"` | 0/2 |
| 16 | `univariate_tests_<dv>` | `univariate_tests.tests` ada (ada faktor between atau kovariat) | D |
| 17 | `posthoc_tests_<dv>` | `posthoc_tests` ada (`FixFactorVars` tidak kosong) | per kunci |
| 18 | `emmeans_<target>` | `emmeans` ada (daftar EM Means tidak kosong) | T (jumlah target valid) |
| 19 | `emmeans_pairwise_<faktor>` | `emmeans_pairwise` ada (Compare main effects, target satu faktor) | C |
| 20 | `error_table` | `errors` tidak kosong. Service selalu mengirim minimal `["No errors occurred."]`, jadi tabel ini selalu ada | 1 |

**Jumlah tabel minimum dengan opsi bawaan** (semua opsi Options mati, tanpa EM Means/Post Hoc, model berhasil dibangun, matriks galat nonsingular):
- **within-only:** 3M + 4, ditambah 1 bila M > 1. Untuk 1 measure: **7** (`within_subjects_factors_…`, `multivariate_tests`, `mauchly_test`, `tests_within_subjects_effects_…`, `tests_within_subjects_contrasts_…`, `tests_between_subjects_effects`, `error_table`);
- **dengan faktor between atau kovariat:** tambah D tabel `univariate_tests_<dv>`;
- **bila `RmModel::build` gagal** (keluar awal): M + 1 (Within-Subjects Factors dan Errors Logs).

**Jumlah maksimum** tidak tetap, karena bergantung pada jumlah measure, level, target, dan kunci keluaran modul lama:
- Rumus: M + D + 1 + 1 + 1 + 1 + 1 + [M>1] + M + M + 1 + P + 1 + 1 + 2 + D + H + T + C + 1.
- P = kunci `parameter_estimates`, H = kunci `posthoc_tests`, T = target EM Means valid, C = target satu faktor yang dibandingkan.
- Contoh 1 measure, 3 level (D = 3), 1 faktor between, semua opsi Options, 4 target EM Means (2 target satu faktor dibandingkan), tanpa Post Hoc, dengan P = D: 1 + 3 + 1 + 1 + 1 + 1 + 1 + 0 + 1 + 1 + 1 + 3 + 1 + 1 + 2 + 3 + 0 + 4 + 2 + 1 = **33**.

Semua kunci di atas disimpan oleh `services/repeated-measures-analysis-output.ts` (`findTable` / `startsWith`; prefiks `emmeans_` mencakup `emmeans_pairwise_`), dengan urutan penyimpanan sendiri. Contohnya, `levene_test` disimpan sebelum `tests_between_subjects_effects`.

### G.2 Bentuk payload (`services/repeated-measures-analysis.ts`)

Satu `getSlicedData` untuk `[...realSubjectNames, ...FactorsVariables, ...CovariateVariables]` menghasilkan data **per variabel** (luar = variabel, dalam = subjek; satu rekaman `{ <nama asli>: nilai }` per subjek). Lalu:

| Argumen | Bentuk | Contoh satu elemen |
|---|---|---|
| `subject_data` | **Per subjek:** `subject_data[s]` = array berisi **satu** `DataRecord` yang memuat semua DV dengan nama ter-encode | Dataset (c), subjek 1: `subject_data[0] = [ { "p1_(1,nilai)": 60, "p2_(2,nilai)": 60, "p3_(3,nilai)": 64 } ]` |
| `factors_data` | **Per variabel:** `factors_data[f][s]` = `{ <faktor f>: nilai subjek s }`, dengan f mengikuti `factors_data_defs` | Dataset (c): `factors_data[0] = [ { "metode": 1 }, …, { "metode": 2 } ]` (20 rekaman, satu per subjek) |
| `covar_data` | **Per variabel:** `covar_data[c][s]`; `[]` bila tidak ada kovariat | Ilustrasi dengan kovariat bernama `usia`: `covar_data[0] = [ { "usia": <nilai subjek 1> }, … ]`. Dataset (c): `[]` |
| `subject_data_defs` | Per variabel; `name` diganti nama ter-encode | `[ [ { …, "name": "p1_(1,nilai)" } ], … ]` |
| `factors_data_defs`, `covar_data_defs` | `getVarDefs(variables, FactorsVariables / CovariateVariables)` | — |

Tipe Rust penerimanya (`models/data.rs`): `AnalysisData { subject_data: Vec<Vec<DataRecord>>, factors_data: Vec<Vec<DataRecord>>, covariate_data: Option<Vec<Vec<DataRecord>>>, subject_data_defs: Vec<Vec<VariableDefinition>>, factors_data_defs: Vec<Vec<VariableDefinition>>, covariate_data_defs: Option<Vec<Vec<VariableDefinition>>> }`, dengan `DataRecord { #[serde(flatten)] values: HashMap<String, DataValue> }` dan `DataValue` = `Number(f64) | Text(String) | Boolean(bool) | Null` (`#[serde(untagged)]`).

Baseline mengirim `factors_data` dan `covar_data` **per subjek** (`[[{ "metode": 1 }], [{ "metode": 1 }], …]`), dari tiga panggilan `getSlicedData` terpisah.

### G.3 Konfigurasi kontras

| Field TS (`config_data.contrast`) | Serde Rust (`ContrastConfig`) | Dibaca mesin Rust? | Nilai bawaan |
|---|---|---|---|
| `FactorList: string[] \| null` | `factor_list: Option<Vec<String>>` | **Ya**, oleh `within_contrast_type` | `RepeatedMeasuresContrastDefault.FactorList = null`. Setelah faktor didefinisikan, `useEffect` di `dialogs/repeated-measures-main.tsx` mengisinya `["<faktor>(Polynomial)"]`. Setelah "Change" di dialog Contrast: `"<faktor> (<method>, Ref: Last)"` |
| `ContrastMethod: string \| null` | `contrast_method: ContrastMethod` | Tidak (hanya dialog: label bawaan `FactorList` dan pilihan Select) | `"polynomial"` (`constants/repeated-measures-default.ts`) |
| `Last: boolean`, `First: boolean` | `last: bool`, `first: bool` | Tidak | `true`, `false` |

Pilihan di dialog Contrast (`dialogs/contrast.tsx`): `RM_CONTRAST_METHODS` = Polynomial, Repeated.
