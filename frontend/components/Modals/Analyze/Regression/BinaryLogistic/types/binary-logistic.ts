import type { Variable } from "@/types/Variable";

// =========================================================================
// 1. CONFIGURATION TYPES (Input dari UI)
// =========================================================================

export interface BinaryLogisticSaveParams {
  predictedProbabilities: boolean;
  predictedGroup: boolean;
  residualsUnstandardized: boolean;
  residualsLogit: boolean;
  residualsStudentized: boolean;
  residualsStandardized: boolean;
  residualsDeviance: boolean;
  influenceCooks: boolean;
  influenceLeverage: boolean;
  influenceDfBeta: boolean;
}

export const DEFAULT_BINARY_LOGISTIC_SAVE_PARAMS: BinaryLogisticSaveParams = {
  predictedProbabilities: false,
  predictedGroup: false,
  residualsUnstandardized: false,
  residualsLogit: false,
  residualsStudentized: false,
  residualsStandardized: false,
  residualsDeviance: false,
  influenceCooks: false,
  influenceLeverage: false,
  influenceDfBeta: false,
};

export interface BinaryLogisticOptionsParams {
  classificationPlots: boolean;
  hosmerLemeshow: boolean;
  casewiseListing: boolean;
  casewiseType: "outliers" | "all";
  casewiseOutliers: number;
  correlations: boolean;
  iterationHistory: boolean;
  ciForExpB: boolean;
  ciLevel: number;
  displayAtEachStep: boolean;
  probEntry: number;
  probRemoval: number;
  classificationCutoff: number;
  maxIterations: number;
  includeConstant: boolean;
}

export const DEFAULT_BINARY_LOGISTIC_OPTIONS_PARAMS: BinaryLogisticOptionsParams =
  {
    classificationPlots: false,
    hosmerLemeshow: false,
    casewiseListing: false,
    casewiseType: "outliers",
    casewiseOutliers: 2.0,
    correlations: false,
    iterationHistory: false,
    ciForExpB: false,
    ciLevel: 95,
    displayAtEachStep: true, // Default: At each step (same as SPSS)
    probEntry: 0.05,
    probRemoval: 0.1,
    classificationCutoff: 0.5,
    maxIterations: 20,
    includeConstant: true,
  };

/**
 * Valid input ranges for the Options tab's numeric fields. These mirror what
 * the Rust worker can actually accept - e.g. max_iterations is a Rust
 * `usize`, so a negative value fails JSON deserialization outright rather
 * than producing a normal validation error.
 */
export const OPTIONS_PARAM_RANGES = {
  casewiseOutliers: { min: 0.1, max: 100 },
  ciLevel: { min: 1, max: 99.99 },
  probEntry: { min: 0.001, max: 0.999 },
  probRemoval: { min: 0.001, max: 0.999 },
  classificationCutoff: { min: 0.01, max: 0.99 },
  maxIterations: { min: 1, max: 1000 },
} as const;

/**
 * Validates the Options tab's numeric fields against OPTIONS_PARAM_RANGES.
 * Returns a list of human-readable error messages (empty if all valid).
 */
export function validateOptionsParams(
  params: BinaryLogisticOptionsParams
): string[] {
  const errors: string[] = [];
  const r = OPTIONS_PARAM_RANGES;

  const inRange = (value: number, range: { min: number; max: number }) =>
    !Number.isNaN(value) && value >= range.min && value <= range.max;

  if (
    !inRange(params.maxIterations, r.maxIterations) ||
    !Number.isInteger(params.maxIterations)
  ) {
    errors.push(
      `Maximum Iterations harus berupa bilangan bulat antara ${r.maxIterations.min} dan ${r.maxIterations.max}.`
    );
  }

  if (!inRange(params.ciLevel, r.ciLevel)) {
    errors.push(
      `CI for exp(B) harus di antara ${r.ciLevel.min}% dan ${r.ciLevel.max}%.`
    );
  }

  if (!inRange(params.probEntry, r.probEntry)) {
    errors.push(
      `Probability for Stepwise (Entry) harus di antara ${r.probEntry.min} dan ${r.probEntry.max}.`
    );
  }

  if (!inRange(params.probRemoval, r.probRemoval)) {
    errors.push(
      `Probability for Stepwise (Removal) harus di antara ${r.probRemoval.min} dan ${r.probRemoval.max}.`
    );
  }

  if (!inRange(params.classificationCutoff, r.classificationCutoff)) {
    errors.push(
      `Classification Cutoff harus di antara ${r.classificationCutoff.min} dan ${r.classificationCutoff.max}.`
    );
  }

  if (!inRange(params.casewiseOutliers, r.casewiseOutliers)) {
    errors.push(
      `Outliers outside (std. dev.) harus di antara ${r.casewiseOutliers.min} dan ${r.casewiseOutliers.max}.`
    );
  }

  return errors;
}

export type ContrastMethodType =
  | "Indicator"
  | "Simple"
  | "Difference"
  | "Helmert"
  | "Repeated"
  | "Polynomial"
  | "Deviation";

export type ReferenceCategoryType = "Last" | "First";

export interface CategoricalVarSetting {
  name: string;
  contrast: ContrastMethodType;
  referenceCategory: ReferenceCategoryType;
}

export interface BinaryLogisticCategoricalParams {
  covariates: string[];
  /** Per-variable contrast/reference settings (SPSS style) */
  variableSettings: Record<string, CategoricalVarSetting>;
}

export const DEFAULT_CONTRAST: ContrastMethodType = "Indicator";
export const DEFAULT_REFERENCE: ReferenceCategoryType = "Last";

export const DEFAULT_BINARY_LOGISTIC_CATEGORICAL_PARAMS: BinaryLogisticCategoricalParams =
  {
    covariates: [],
    variableSettings: {},
  };

export interface BinaryLogisticAssumptionParams {
  multicollinearity: boolean;
  boxTidwell: boolean;
}

export const DEFAULT_BINARY_LOGISTIC_ASSUMPTION_PARAMS: BinaryLogisticAssumptionParams =
  {
    multicollinearity: false,
    boxTidwell: false,
  };

// Main Options
export interface BinaryLogisticOptions {
  dependent: Variable | null;
  covariates: Variable[];
  factors: Variable[];
  method:
    | "Enter"
    | "Forward: Conditional"
    | "Forward: LR"
    | "Forward: Wald"
    | "Backward: Conditional"
    | "Backward: LR"
    | "Backward: Wald";

  // Sub-configuration objects
  optionParams: BinaryLogisticOptionsParams;
  categoricalParams: BinaryLogisticCategoricalParams;
  saveParams: BinaryLogisticSaveParams;
  assumptionParams: BinaryLogisticAssumptionParams;
}

export const DEFAULT_BINARY_LOGISTIC_OPTIONS: BinaryLogisticOptions = {
  dependent: null,
  covariates: [],
  factors: [],
  method: "Enter",
  optionParams: DEFAULT_BINARY_LOGISTIC_OPTIONS_PARAMS,
  categoricalParams: DEFAULT_BINARY_LOGISTIC_CATEGORICAL_PARAMS,
  saveParams: DEFAULT_BINARY_LOGISTIC_SAVE_PARAMS,
  assumptionParams: DEFAULT_BINARY_LOGISTIC_ASSUMPTION_PARAMS,
};

// =========================================================================
// 2. RESULT TYPES (Output dari Worker/Rust)
// =========================================================================

// Interface reusable untuk Summary dan Classification Table
export interface ModelSummary {
  log_likelihood: number;
  cox_snell_r_square: number;
  nagelkerke_r_square: number;
  converged?: boolean;
  iterations?: number;
}

export interface ClassificationTable {
  observed_0_predicted_0: number;
  observed_0_predicted_1: number;
  percentage_correct_0: number;
  observed_1_predicted_0: number;
  observed_1_predicted_1: number;
  percentage_correct_1: number;
  overall_percentage: number;
}

// Representasi satu baris variabel di tabel "Variables in Equation"
export interface VariableRow {
  label: string;
  b: number;
  error: number; // Rust mengirim field ini dengan nama 'error' (Standard Error)
  wald: number;
  df: number;
  sig: number;
  exp_b: number;
  lower_ci: number;
  upper_ci: number;
}

export interface VifRow {
  variable: string;
  tolerance: number;
  vif: number;
}

export interface BoxTidwellRow {
  variable: string;
  // R-style output fields (Fox & Weisberg 2011)
  mle_lambda?: number;       // MLE of power transformation λ
  score_z?: number;          // Score Statistic z = γ̂ / SE(γ̂)
  df?: number;               // Degrees of freedom (always 1)
  sig: number;               // Pr(>|z|)
  b_original?: number;       // β̂ of X in augmented model
  b_interaction?: number;    // γ̂ of X·ln(X) in augmented model
  se_interaction?: number;   // SE(γ̂)
  is_significant: boolean;
  skipped?: boolean;
  skip_reason?: string;
  note?: string;
  // Backward compat
  interaction_term?: string;
  b?: number;
}

export interface AssumptionResult {
  vif?: VifRow[];
  box_tidwell?: BoxTidwellRow[];
  correlation_matrix?: number[][];
  feature_names?: string[];
}

// Representasi satu baris di tabel "Variables NOT in Equation"
export interface VariableNotInEquation {
  label: string;
  score: number;
  df: number;
  sig: number;
}

// Representasi untuk Overall Statistics (Remainder Test)
export interface RemainderTest {
  chi_square: number;
  df: number;
  sig: number;
}

// Representasi Step History (Ringkasan per langkah)
export interface StepHistory {
  step: number;
  action: string;
  variable: string;
  score_statistic: number;
  improvement_chi_sq: number;
  model_log_likelihood: number;
  nagelkerke_r2: number;
  variables_in_equation?: VariableRow[];
  variables_not_in_equation?: VariableNotInEquation[];
}

export interface ModelIfTermRemovedRow {
  label: string;
  model_log_likelihood: number;
  change_in_neg2ll: number;
  df: number;
  sig_change: number;
}

export interface OmniTestsResult {
  chi_square: number;
  df: number;
  sig: number;
}

export interface FrequencyCount {
  category_label: string;
  frequency: number;
  parameter_codings: number[];
}

export interface CategoricalCoding {
  variable_label: string;
  categories: FrequencyCount[];
}

// --- BARU: Hosmer-Lemeshow Types ---
export interface HosmerLemeshowGroup {
  group: number;
  size: number;
  observed_1: number;
  expected_1: number;
  observed_0: number;
  expected_0: number;
  total_observed: number;
}

export interface HosmerLemeshowResult {
  chi_square: number;
  df: number;
  sig: number;
  contingency_table: HosmerLemeshowGroup[];
}

// --- BARU: Iteration History Types (SPSS Style) ---
export interface IterationHistoryRow {
  iteration: number;
  neg2_log_likelihood: number;
  coefficients: number[];
}

export interface IterationHistoryBlock {
  block: number;
  step: number;
  variable_names: string[];
  rows: IterationHistoryRow[];
  initial_neg2ll?: number;
  converged: boolean;
  final_iteration: number;
}

// Ini memetakan struct StepDetail dari Rust
export interface StepDetail {
  step: number;
  action: string; // "Start", "Entered", "Removed"
  variable_changed?: string;
  summary: ModelSummary;
  classification_table: ClassificationTable;
  variables_in_equation: VariableRow[];
  variables_not_in_equation: VariableNotInEquation[];
  remainder_test?: RemainderTest;
  omni_tests?: OmniTestsResult;
  step_omni_tests?: OmniTestsResult;
  model_if_term_removed?: ModelIfTermRemovedRow[];

  // --- BARU: Field Hosmer Lemeshow per step ---
  hosmer_lemeshow?: HosmerLemeshowResult;

  // --- BARU: Field Correlation of Estimates per step ---
  correlation_of_estimates?: CorrelationOfEstimatesRow[];

  // --- BARU: Field Iteration History per step ---
  iteration_history?: IterationHistoryBlock;

  // --- BARU: Field Classification Plot Data per step ---
  classification_plot_data?: ClassificationPlotData;
}

// --- BARU: Correlation of Estimates Types ---
export interface CorrelationOfEstimatesRow {
  variable: string;    // Nama variabel (termasuk Constant)
  values: number[];    // Nilai korelasi terhadap variabel lain (urut)
}

// --- BARU: Casewise Listing Types ---
export interface CasewiseRow {
  case_number: number;          // Nomor kasus (1-indexed)
  selected: string;             // Status seleksi ("S" untuk selected)
  observed: number;             // Nilai observasi aktual (0 atau 1)
  observed_label: string;       // Label kategori aktual
  predicted: number;            // Nilai prediksi (0 atau 1)
  predicted_label: string;      // Label kategori prediksi  
  predicted_group: string;      // Grup prediksi (**=incorrect)
  predicted_probability: number; // Probabilitas P(Y=1)
  resid_zresid: number;         // Residual Standardized (ZResid)
  
  // Opsional - SPSS menyediakan banyak jenis residual
  resid_raw?: number;           // Residual Unstandardized
  resid_logit?: number;         // Residual Logit
  resid_studentized?: number;   // Residual Studentized
  resid_deviance?: number;      // Residual Deviance
  
  // Influence statistics
  leverage?: number;            // Leverage (hat value)
  cooks_distance?: number;      // Cook's Distance
  dfbeta?: number[];            // DfBeta per variable
}

// --- BARU: Step Summary Types (SPSS Style) ---
export interface StepSummaryRow {
  step: number;
  // Improvement statistics
  improvement_chi_square: number;
  improvement_df: number;
  improvement_sig: number;
  // Model statistics  
  model_chi_square: number;
  model_df: number;
  model_sig: number;
  // Classification
  correct_pct: number;
  // Variable action
  variable_action: string;  // e.g., "IN: age", "OUT: trestbps"
}

// --- BARU: Classification Plot Types ---
export interface ClassificationPlotPoint {
  case_number: number;          // Case number (1-indexed)
  predicted_probability: number; // Predicted probability P(Y=1)
  observed_group: number;       // Observed group: 0 or 1
  observed_label: string;       // Label for observed group (e.g., "F" or "T")
}

export interface ClassificationPlotData {
  data_points: ClassificationPlotPoint[];  // All case data
  cutoff: number;                           // Classification cutoff (default 0.5)
  label_0: string;                          // Label for group 0 (e.g., "FALSE")
  label_1: string;                          // Label for group 1 (e.g., "TRUE")
  n_group_0: number;                        // Total cases in group 0
  n_group_1: number;                        // Total cases in group 1
}

// --- BARU: Saved Predictions Types (untuk Tab Save) ---
export interface SavedPredictionRow {
  case_index: number;                        // Index kasus (0-indexed untuk mapping ke data)
  
  // Predicted Values
  predicted_probability?: number;            // PRE_1: P(Y=1)
  predicted_group?: number;                  // PGR_1: Predicted group (0 atau 1)
  
  // Residuals
  resid_unstandardized?: number;             // RES_1: Y - P
  resid_logit?: number;                      // LRE_1: Logit residual
  resid_studentized?: number;                // SRE_1: Studentized residual
  resid_standardized?: number;               // ZRE_1: Standardized (Pearson) residual
  resid_deviance?: number;                   // DEV_1: Deviance residual
  
  // Influence Statistics
  influence_cooks?: number;                  // COO_1: Cook's distance
  influence_leverage?: number;               // LEV_1: Leverage (hat value)
  influence_dfbeta?: number[];               // DFB0_1, DFB1_1, ...: DfBeta per variable
}

// Nama variabel yang akan ditambahkan ke dataset (mengikuti konvensi SPSS)
export interface SavedVariableNames {
  predicted_probability?: string;            // PRE_1
  predicted_group?: string;                  // PGR_1
  resid_unstandardized?: string;             // RES_1
  resid_logit?: string;                      // LRE_1
  resid_studentized?: string;                // SRE_1
  resid_standardized?: string;               // ZRE_1
  resid_deviance?: string;                   // DEV_1
  influence_cooks?: string;                  // COO_1
  influence_leverage?: string;               // LEV_1
  influence_dfbeta?: string[];               // DFB0_1, DFB1_1, ...
}

// Wrapper untuk semua saved predictions dengan metadata
export interface SavedPredictions {
  rows: SavedPredictionRow[];
  variable_names?: SavedVariableNames;
}

// Fitting Warnings dari IRLS solver
export interface FittingWarnings {
  possible_separation?: boolean;
  quasi_separation?: boolean;
  step_halving_used?: boolean;
  step_halving_count?: number;
  ridge_increased?: boolean;
  final_lambda?: number;
  near_singular_hessian?: boolean;
  messages?: string[];
}

// Struktur utama hasil analisis yang dikirim dari Worker
export interface LogisticResult {
  method_used?: string;

  // Field ini memetakan ModelSummary dari Rust
  model_summary: ModelSummary;

  // Field ini memetakan ClassificationTable dari Rust
  classification_table: ClassificationTable;

  // Block 1 Variables (Final)
  variables_in_equation: VariableRow[];

  // Block 0 Variables / Final Variables not in equation
  variables_not_in_equation: VariableNotInEquation[];

  // Block 0 Constant (Backward compatibility / shortcut)
  block_0_constant?: VariableRow;

  // Final Omnibus Tests
  omni_tests: {
    chi_square: number;
    df: number;
    sig: number;
  };

  // Final Overall Remainder Test (jika ada variabel sisa)
  overall_remainder_test?: RemainderTest;

  // Optional: info tambahan dari worker (misal encoding Y)
  model_info?: {
    y_encoding?: Record<string, number>;
    n_samples?: number;
    n_missing?: number;
    step_number?: number;
  };

  // History ringkas (untuk tabel Step History)
  step_history?: StepHistory[];

  // --- BARU: Detail lengkap setiap langkah (Block 0, Step 1, dst.) ---
  steps_detail?: StepDetail[];

  assumption_tests?: AssumptionResult;

  categorical_codings?: CategoricalCoding[];

  // --- BARU: Field Hosmer Lemeshow Final Model ---
  hosmer_lemeshow?: HosmerLemeshowResult;

  // --- BARU: Casewise Listing of Residuals ---
  casewise_list?: CasewiseRow[];

  // --- BARU: Classification Plot Data ---
  classification_plot_data?: ClassificationPlotData;

  // --- BARU: Correlation of Estimates (Final Model) ---
  correlation_of_estimates?: CorrelationOfEstimatesRow[];

  // --- BARU: Step Summary (SPSS Style - for stepwise methods) ---
  step_summary?: StepSummaryRow[];

  // --- BARU: Saved Predictions (Tab Save output) ---
  saved_predictions?: SavedPredictions;

  // --- BARU: Fitting Warnings (dari IRLS robust solver) ---
  fitting_warnings?: FittingWarnings;
}

// =========================================================================
// 3. UI OUTPUT TYPE (Format Akhir untuk Ditampilkan)
// =========================================================================

export interface ColumnHeader {
  header: string;
  key?: string; // Optional karena parent header mungkin tidak punya key data langsung
  align?: "left" | "right" | "center";
  children?: ColumnHeader[];
}

export interface TableResultContent {
  columnHeaders: ColumnHeader[];
  rows: any[];
  // Field opsional untuk styling spesifik tabel
  style?: "standard" | "compact";
}

// Ini adalah struktur wrapper baru untuk setiap "Kartu" output
export interface AnalysisSection {
  id: string; // ID Unik untuk key React
  title: string; // Judul Card (misal: "Model Summary")
  description?: string; // Deskripsi di bawah judul (termasuk note + interpretasi)
  type: "table" | "text" | "chart"; // Future-proofing
  data: TableResultContent; // Data mentah tabel
  chartData?: any; // Chart data for GeneralChartContainer (when type is "chart")
}

export interface BinaryLogisticOutput {
  sections: AnalysisSection[];
}
