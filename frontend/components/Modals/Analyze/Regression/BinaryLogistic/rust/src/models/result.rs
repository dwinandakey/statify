use serde::{Deserialize, Serialize};
use std::collections::HashMap; // Tambahan import

// ============================================================================
// FITTING WARNINGS - Peringatan dari proses IRLS fitting
// ============================================================================

/// Flags untuk warning yang terdeteksi selama fitting
/// Digunakan untuk melaporkan masalah potensial ke user
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FittingWarnings {
    /// True jika terdeteksi kemungkinan complete separation
    #[serde(default)]
    pub possible_separation: bool,
    /// True jika terdeteksi quasi-complete separation
    #[serde(default)]
    pub quasi_separation: bool,
    /// True jika ada step-halving yang digunakan
    #[serde(default)]
    pub step_halving_used: bool,
    /// Jumlah total step-halving iterations
    #[serde(default)]
    pub step_halving_count: usize,
    /// True jika ridge parameter harus ditingkatkan
    #[serde(default)]
    pub ridge_increased: bool,
    /// Final ridge parameter yang digunakan
    #[serde(default)]
    pub final_lambda: f64,
    /// True jika matrix hampir singular
    #[serde(default)]
    pub near_singular_hessian: bool,
    /// Pesan warning untuk user
    #[serde(default)]
    pub messages: Vec<String>,
}

// Struktur untuk satu baris hasil VIF
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VifRow {
    pub variable: String,
    pub tolerance: f64, // 1 / VIF
    pub vif: f64,
}

// Struktur untuk satu baris hasil Box-Tidwell
// Output format mengacu pada R's car::boxTidwell() (Fox & Weisberg, 2011)
// dan teori asli Box & Tidwell (1962)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BoxTidwellRow {
    pub variable: String,         // Nama variabel asli

    // --- Kolom utama (sesuai R output) ---
    #[serde(default)]
    pub mle_lambda: f64,          // MLE of λ (power transformation): λ̂ = 1 + γ̂/β̂
    #[serde(default)]
    pub score_z: f64,             // Score Statistic z = γ̂ / SE(γ̂)
    #[serde(default)]
    pub df: i32,                  // Degrees of freedom (always 1)
    pub sig: f64,                 // P-value Pr(>|z|)

    // --- Detail koefisien ---
    #[serde(default)]
    pub b_original: f64,          // β̂ of X in augmented model
    #[serde(default)]
    pub b_interaction: f64,       // γ̂ of X·ln(X) in augmented model
    #[serde(default)]
    pub se_interaction: f64,      // SE(γ̂)

    // --- Flags ---
    pub is_significant: bool,     // Helper flag (p < 0.05)
    #[serde(default)]
    pub skipped: bool,
    #[serde(default)]
    pub skip_reason: String,
    #[serde(default)]
    pub note: String,

    // --- Backward compat (deprecated but kept for serialization) ---
    #[serde(default)]
    pub interaction_term: String,
    #[serde(default)]
    pub b: f64,                   // Same as b_interaction
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CorrelationRow {
    pub variable: String,
    pub values: Vec<f64>, // Nilai korelasi terhadap variabel lain urut index
}

// Wrapper untuk menampung semua hasil uji asumsi
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AssumptionResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vif: Option<Vec<VifRow>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub box_tidwell: Option<Vec<BoxTidwellRow>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_matrix: Option<Vec<CorrelationRow>>,
}

// --- BARU: Hosmer-Lemeshow Structures ---
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HosmerLemeshowGroup {
    pub group: usize,
    pub size: usize,
    pub observed_1: usize, // Event terjadi (Y=1)
    pub expected_1: f64,   // Sum of predicted prob
    pub observed_0: usize, // Event tidak terjadi (Y=0)
    pub expected_0: f64,   // Sum of (1 - predicted prob)
    pub total_observed: usize,
}

// --- BARU: Classification Plot Data Structures ---
/// Represents a single data point for the classification plot
/// Contains the predicted probability and observed group for each case
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ClassificationPlotPoint {
    pub case_number: usize,          // Case number (1-indexed)
    pub predicted_probability: f64,  // Predicted probability P(Y=1)
    pub observed_group: u8,          // Observed group: 0 or 1
    pub observed_label: String,      // Label for observed group (e.g., "F" or "T")
}

/// Represents the complete classification plot data
/// Contains all data points and metadata needed for rendering
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ClassificationPlotData {
    pub data_points: Vec<ClassificationPlotPoint>,  // All case data
    pub cutoff: f64,                                 // Classification cutoff (default 0.5)
    pub label_0: String,                             // Label for group 0 (e.g., "FALSE")
    pub label_1: String,                             // Label for group 1 (e.g., "TRUE")
    pub n_group_0: usize,                            // Total cases in group 0
    pub n_group_1: usize,                            // Total cases in group 1
}

// --- BARU: Casewise Listing Structures ---
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CasewiseRow {
    pub case_number: usize,           // Nomor kasus (1-indexed)
    pub selected: String,             // Status seleksi ("S" untuk selected)
    pub observed: f64,                // Nilai observasi aktual (0 atau 1)
    pub observed_label: String,       // Label kategori aktual
    pub predicted: f64,               // Nilai prediksi (0 atau 1)
    pub predicted_label: String,      // Label kategori prediksi  
    pub predicted_group: String,      // Grup prediksi (**=incorrect)
    pub predicted_probability: f64,   // Probabilitas P(Y=1)
    pub resid_zresid: f64,            // Residual Standardized (ZResid)
    
    // Opsional - SPSS menyediakan banyak jenis residual
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_raw: Option<f64>,       // Residual Unstandardized
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_logit: Option<f64>,     // Residual Logit
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_studentized: Option<f64>, // Residual Studentized
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_deviance: Option<f64>,  // Residual Deviance
    
    // Influence statistics
    #[serde(skip_serializing_if = "Option::is_none")]
    pub leverage: Option<f64>,        // Leverage (hat value)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cooks_distance: Option<f64>,  // Cook's Distance
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dfbeta: Option<Vec<f64>>,     // DfBeta per variable
}

// --- BARU: Saved Predictions untuk Tab Save ---
/// Struktur untuk menyimpan hasil prediksi per kasus yang akan di-save ke dataset
/// Ini adalah output dari opsi "Save" di UI SPSS
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SavedPredictionRow {
    pub case_index: usize,            // Index kasus (0-indexed untuk mapping ke data)
    
    // Predicted Values
    #[serde(skip_serializing_if = "Option::is_none")]
    pub predicted_probability: Option<f64>,  // PRE_1: P(Y=1)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub predicted_group: Option<f64>,        // PGR_1: Predicted group (0 atau 1)
    
    // Residuals
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_unstandardized: Option<f64>,   // RES_1: Y - P
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_logit: Option<f64>,            // LRE_1: Logit residual
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_studentized: Option<f64>,      // SRE_1: Studentized residual
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_standardized: Option<f64>,     // ZRE_1: Standardized (Pearson) residual
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_deviance: Option<f64>,         // DEV_1: Deviance residual
    
    // Influence Statistics
    #[serde(skip_serializing_if = "Option::is_none")]
    pub influence_cooks: Option<f64>,        // COO_1: Cook's distance
    #[serde(skip_serializing_if = "Option::is_none")]
    pub influence_leverage: Option<f64>,     // LEV_1: Leverage (hat value)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub influence_dfbeta: Option<Vec<f64>>,  // DFB0_1, DFB1_1, ...: DfBeta per variable
}

/// Wrapper untuk semua saved predictions dengan metadata
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SavedPredictions {
    pub rows: Vec<SavedPredictionRow>,
    
    // Metadata untuk naming variabel baru
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variable_names: Option<SavedVariableNames>,
}

/// Nama variabel yang akan ditambahkan ke dataset (mengikuti konvensi SPSS)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SavedVariableNames {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub predicted_probability: Option<String>,  // PRE_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub predicted_group: Option<String>,        // PGR_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_unstandardized: Option<String>,   // RES_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_logit: Option<String>,            // LRE_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_studentized: Option<String>,      // SRE_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_standardized: Option<String>,     // ZRE_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resid_deviance: Option<String>,         // DEV_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub influence_cooks: Option<String>,        // COO_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub influence_leverage: Option<String>,     // LEV_1
    #[serde(skip_serializing_if = "Option::is_none")]
    pub influence_dfbeta: Option<Vec<String>>,  // DFB0_1, DFB1_1, ...
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HosmerLemeshowResult {
    pub chi_square: f64,
    pub df: usize,
    pub sig: f64,
    pub contingency_table: Vec<HosmerLemeshowGroup>,
}

// --- Model Summary ---
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelSummary {
    pub log_likelihood: f64,
    pub cox_snell_r_square: f64,
    pub nagelkerke_r_square: f64,
    pub converged: bool,
    pub iterations: usize,
}

// --- Classification Table ---
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ClassificationTable {
    pub observed_0_predicted_0: i32, // True Negative
    pub observed_0_predicted_1: i32, // False Positive
    pub percentage_correct_0: f64,

    pub observed_1_predicted_0: i32, // False Negative
    pub observed_1_predicted_1: i32, // True Positive
    pub percentage_correct_1: f64,

    pub overall_percentage: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VariableRow {
    pub label: String,
    pub b: f64,
    pub error: f64,
    pub wald: f64,
    pub df: i32,
    pub sig: f64,
    pub exp_b: f64,
    pub lower_ci: f64,
    pub upper_ci: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VariableNotInEquation {
    pub label: String,
    pub score: f64,
    pub df: i32,
    pub sig: f64,
}

// --- Struktur untuk Model if Term Removed ---
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelIfTermRemovedRow {
    pub label: String,
    pub model_log_likelihood: f64, // LL model jika variabel ini dibuang
    pub change_in_neg2ll: f64,     // Selisih -2LL
    pub df: i32,
    pub sig_change: f64, // Signifikansi perubahan
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OmniTests {
    pub chi_square: f64,
    pub df: i32,
    pub sig: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OmnibusResult {
    pub chi_square: f64,
    pub df: i32,
    pub sig: f64,
}

// --- BARU: Iteration History Structures (SPSS Style) ---
/// Represents a single iteration row in SPSS's Iteration History table
/// Shows the convergence progress of the IRLS algorithm
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IterationHistoryRow {
    pub iteration: usize,           // Iteration number (1-indexed like SPSS)
    pub neg2_log_likelihood: f64,   // -2 Log Likelihood at this iteration
    pub coefficients: Vec<f64>,     // Coefficient values at this iteration
}

/// Represents a complete iteration history block for a step
/// SPSS shows separate blocks for Block 0 (null model) and Block 1 (with covariates)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IterationHistoryBlock {
    pub block: usize,               // Block number (0 or 1)
    pub step: usize,                // Step within block (for stepwise methods)
    pub variable_names: Vec<String>, // Names of coefficients (Constant, Var1, etc.)
    pub rows: Vec<IterationHistoryRow>, // Iteration data
    pub initial_neg2ll: Option<f64>, // Initial -2LL (for sub-step a. in SPSS)
    pub converged: bool,            // Whether convergence was achieved
    pub final_iteration: usize,     // Final iteration count
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StepHistory {
    pub step: usize,
    pub action: String,
    pub variable: String,
    pub score_statistic: f64,
    pub improvement_chi_sq: f64,
    pub model_log_likelihood: f64,
    pub nagelkerke_r2: f64,
}

/// Represents a row in the Step Summary table (SPSS style)
/// Shows improvement statistics, model statistics, correct classification %, and variable action
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StepSummaryRow {
    pub step: usize,
    // Improvement statistics
    pub improvement_chi_square: f64,
    pub improvement_df: i32,
    pub improvement_sig: f64,
    // Model statistics  
    pub model_chi_square: f64,
    pub model_df: i32,
    pub model_sig: f64,
    // Classification
    pub correct_pct: f64,
    // Variable action
    pub variable_action: String,  // e.g., "IN: age", "OUT: trestbps"
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StepDetail {
    pub step: usize,
    pub action: String, // "Start", "Entered", "Removed"
    pub variable_changed: Option<String>,
    pub summary: ModelSummary,
    pub classification_table: ClassificationTable,
    pub variables_in_equation: Vec<VariableRow>,
    pub variables_not_in_equation: Vec<VariableNotInEquation>,

    // Field untuk Model if Term Removed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_if_term_removed: Option<Vec<ModelIfTermRemovedRow>>,

    pub remainder_test: Option<RemainderTest>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub omni_tests: Option<OmniTests>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_omni_tests: Option<OmniTests>,

    // --- BARU: Hosmer Lemeshow per Step ---
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hosmer_lemeshow: Option<HosmerLemeshowResult>,

    // --- BARU: Correlation of Estimates per Step ---
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_of_estimates: Option<Vec<CorrelationOfEstimatesRow>>,

    // --- BARU: Iteration History per Step (SPSS Style) ---
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iteration_history: Option<IterationHistoryBlock>,

    // --- BARU: Classification Plot Data per Step ---
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classification_plot_data: Option<ClassificationPlotData>,
}

// --- Struktur untuk Correlation of Estimates ---
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CorrelationOfEstimatesRow {
    pub variable: String,         // Nama variabel (termasuk Constant)
    pub values: Vec<f64>,         // Nilai korelasi terhadap variabel lain (urut)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RemainderTest {
    pub chi_square: f64,
    pub df: i32,
    pub sig: f64,
}

// --- Struktur untuk Output Categorical Variables Codings ---

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FrequencyCount {
    pub category_label: String, // misal: "Male", "Female"
    pub frequency: usize,
    pub parameter_codings: Vec<f64>, // misal: [1.0] atau [0.0]
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CategoricalCoding {
    pub variable_label: String, // misal: "Gender"
    pub categories: Vec<FrequencyCount>,
}

// --- Struktur Metadata Model (BARU) ---
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelInfo {
    pub variables: Vec<String>,
    pub n_total: usize,
    pub n_missing: usize,
    pub n_selected: usize,
    pub y_encoding: HashMap<String, i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x_encodings: Option<HashMap<String, HashMap<String, f64>>>,
    // Flag untuk menandai apakah constant (intercept) disertakan dalam model
    #[serde(default = "default_include_constant")]
    pub include_constant: bool,
}

// Helper function untuk default value saat deserialize
fn default_include_constant() -> bool {
    true
}

#[derive(Serialize, Deserialize)]
pub struct LogisticResult {
    // Tambahkan field ini agar formatters di frontend bisa mengakses metadata
    pub model_info: ModelInfo,

    #[serde(rename = "model_summary")]
    pub summary: ModelSummary,

    pub classification_table: ClassificationTable,

    #[serde(rename = "variables_in_equation")]
    pub variables: Vec<VariableRow>,

    #[serde(rename = "variables_not_in_equation")]
    pub variables_not_in_equation: Vec<VariableNotInEquation>,

    #[serde(
        rename = "overall_remainder_test",
        skip_serializing_if = "Option::is_none"
    )]
    pub overall_remainder_test: Option<RemainderTest>,

    #[serde(rename = "block_0_constant")]
    pub block_0_constant: VariableRow,

    #[serde(
        rename = "block_0_variables_not_in",
        skip_serializing_if = "Option::is_none"
    )]
    pub block_0_variables_not_in: Option<Vec<VariableNotInEquation>>,

    pub omni_tests: OmniTests,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_history: Option<Vec<StepHistory>>,

    #[serde(rename = "steps_detail", skip_serializing_if = "Option::is_none")]
    pub steps_detail: Option<Vec<StepDetail>>,

    // --- Step Summary (SPSS Style - for stepwise methods) ---
    #[serde(rename = "step_summary", skip_serializing_if = "Option::is_none")]
    pub step_summary: Option<Vec<StepSummaryRow>>,

    pub method_used: String,

    #[serde(rename = "assumption_tests", skip_serializing_if = "Option::is_none")]
    pub assumption_tests: Option<AssumptionResult>,

    // --- Field untuk informasi Coding ---
    #[serde(
        rename = "categorical_codings",
        skip_serializing_if = "Option::is_none"
    )]
    pub categorical_codings: Option<Vec<CategoricalCoding>>,

    // --- BARU: Hosmer Lemeshow Final Model ---
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hosmer_lemeshow: Option<HosmerLemeshowResult>,

    // --- BARU: Casewise Listing of Residuals ---
    #[serde(rename = "casewise_list", skip_serializing_if = "Option::is_none")]
    pub casewise_list: Option<Vec<CasewiseRow>>,

    // --- BARU: Classification Plot Data ---
    #[serde(rename = "classification_plot_data", skip_serializing_if = "Option::is_none")]
    pub classification_plot_data: Option<ClassificationPlotData>,

    // --- BARU: Correlation of Estimates (Final Model) ---
    #[serde(rename = "correlation_of_estimates", skip_serializing_if = "Option::is_none")]
    pub correlation_of_estimates: Option<Vec<CorrelationOfEstimatesRow>>,

    // --- BARU: Saved Predictions (Tab Save di UI) ---
    #[serde(rename = "saved_predictions", skip_serializing_if = "Option::is_none")]
    pub saved_predictions: Option<SavedPredictions>,

    // --- BARU: Fitting Warnings (dari IRLS robust solver) ---
    #[serde(rename = "fitting_warnings", skip_serializing_if = "Option::is_none")]
    pub fitting_warnings: Option<FittingWarnings>,
}
