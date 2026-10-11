// perbaikan BISA (9/1/2026)
use serde::{ Deserialize, Serialize };
use std::collections::HashMap;
use nalgebra::DMatrix;
use crate::models::config::ExtractionStatus;

#[derive(Debug, Serialize, Deserialize, Clone)]

// JSON untuk menampilkan output (untuk menyimpan output)
pub struct FactorAnalysisResult {
    #[serde(rename = "descriptive_statistics")]
    pub descriptive_statistics: Option<Vec<DescriptiveStatistic>>,
    #[serde(rename = "scree_plot")]
    pub scree_plot: Option<ScreePlot>,
    #[serde(rename = "correlation_matrix")]
    pub correlation_matrix: Option<CorrelationMatrix>,
    #[serde(rename = "inverse_correlation_matrix")]
    pub inverse_correlation_matrix: Option<InverseCorrelationMatrix>,
    #[serde(rename = "covariance_matrix")]
    pub covariance_matrix: Option<CovarianceMatrix>,
    #[serde(rename = "inverse_covariance_matrix")]
    pub inverse_covariance_matrix: Option<InverseCovarianceMatrix>,
    #[serde(rename = "kmo_bartletts_test")]
    pub kmo_bartletts_test: Option<KMOBartlettsTest>,
    #[serde(rename = "analysis_status")]
    pub analysis_status: Option<AnalysisStatus>,
    #[serde(rename = "goodness_of_fit_test")]
    pub goodness_of_fit_test: Option<GoodnessOfFitTest>,
    #[serde(rename = "anti_image_matrices")]
    pub anti_image_matrices: Option<AntiImageMatrices>,
    #[serde(rename = "communalities")]
    pub communalities: Option<Communalities>,
    #[serde(rename = "total_variance_explained")]
    pub total_variance_explained: Option<TotalVarianceExplained>,
    #[serde(rename = "component_matrix")]
    pub component_matrix: Option<ComponentMatrix>,
    #[serde(rename = "reproduced_correlations")]
    pub reproduced_correlations: Option<ReproducedCorrelations>,
    #[serde(rename = "reproduced_covariances")]
    pub reproduced_covariances: Option<ReproducedCovariances>,
    #[serde(rename = "rotated_component_matrix")]
    pub rotated_component_matrix: Option<RotatedComponentMatrix>,
    #[serde(rename = "component_transformation_matrix")]
    pub component_transformation_matrix: Option<ComponentTransformationMatrix>,
    #[serde(rename = "component_score_coefficient_matrix")]
    pub component_score_coefficient_matrix: Option<ComponentScoreCoefficientMatrix>,
    #[serde(rename = "component_score_covariance_matrix")]
    pub component_score_covariance_matrix: Option<ComponentScoreCovarianceMatrix>,
    /// Menyimpan nilai skor faktor per responden (misal: FAC1_1, FAC2_1)
    /// Key: Nama Variabel Baru (String), Value: Array nilai untuk semua baris (Vec<f64>)
    #[serde(rename = "factor_scores")]
    pub factor_scores: Option<HashMap<String, Vec<f64>>>,
    #[serde(rename = "pattern_matrix")]
    pub pattern_matrix: Option<PatternMatrix>,
    #[serde(rename = "structure_matrix")]
    pub structure_matrix: Option<StructureMatrix>,
    #[serde(rename = "component_correlation_matrix")]
    pub component_correlation_matrix: Option<ComponentCorrelationMatrix>,
    #[serde(rename = "loading_plot")]
    pub loading_plot: Option<LoadingPlot>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DescriptiveStatistic {
    pub variable: String,
    pub mean: f64,
    #[serde(rename = "std_deviation")]
    pub std_deviation: f64,
    #[serde(rename = "analysis_n")]
    pub analysis_n: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScreePlot {
    pub eigenvalues: Vec<f64>,
    #[serde(rename = "component_numbers")]
    pub component_numbers: Vec<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CorrelationMatrix {
    pub correlations: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "sig_values")]
    pub sig_values: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InverseCorrelationMatrix {
    pub inverse_correlations: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CovarianceMatrix {
    pub covariances: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
    pub determinant: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InverseCovarianceMatrix {
    pub inverse_covariances: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
    pub determinant: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KMOBartlettsTest {
    #[serde(rename = "kaiser_meyer_olkin")]
    pub kaiser_meyer_olkin: f64,
    #[serde(rename = "bartletts_test_chi_square")]
    pub bartletts_test_chi_square: f64,
    pub df: usize,
    pub significance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalysisStatus {
    #[serde(rename = "is_converged")]
    pub is_converged: bool,
    #[serde(rename = "extracted_factors")]
    pub extracted_factors: usize,
    #[serde(rename = "terminated_early")]
    pub terminated_early: bool,
    #[serde(rename = "termination_reason")]
    pub termination_reason: Option<String>,
    #[serde(rename = "has_heywood_case")]
    pub has_heywood_case: bool,
    #[serde(rename = "extraction_status")]
    pub extraction_status: Option<String>,
    //  Data quality warnings untuk near-constant atau extreme variance variables
    #[serde(rename = "data_quality_warnings")]
    pub data_quality_warnings: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoodnessOfFitTest {
    #[serde(rename = "chi_square")]
    pub chi_square: f64,
    pub df: usize,
    pub significance: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntiImageMatrices {
    #[serde(rename = "anti_image_covariance")]
    pub anti_image_covariance: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "anti_image_correlation")]
    pub anti_image_correlation: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Communalities {
    // Varians Mentah (Variabel jika Kovariansi)
    pub raw_initial: HashMap<String, f64>,

    // Varians Tereskalasi (seharusnya selalu bernilai 1.0)
    pub rescaled_initial: HashMap<String, f64>,
    
    // Extraction values (raw untuk covariance, nilai langsung untuk correlation)
    pub extraction: HashMap<String, f64>,
    
    // Rescaled Extraction values (untuk covariance mode)
    // Ini adalah extraction / variance untuk setiap variabel
    #[serde(rename = "rescaled_extraction")]
    pub rescaled_extraction: HashMap<String, f64>,
    
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,

    // Track which matrix type was used for extraction
    #[serde(rename = "extraction_matrix_type")]
    pub extraction_matrix_type: String, // "correlation" or "covariance"

    // SPSS-style control flags for frontend rendering
    #[serde(rename = "suppress_extraction")]
    pub suppress_extraction: bool,
    #[serde(rename = "heywood_warning_flag")]
    pub heywood_warning_flag: bool,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TotalVarianceBlock {
    pub label: String, // "Component" | "Raw" | "Rescaled"
    pub initial: Vec<TotalVarianceComponent>,
    pub extraction: Vec<TotalVarianceComponent>,
    pub rotation: Option<Vec<TotalVarianceComponent>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TotalVarianceExplained {
    pub blocks: Vec<TotalVarianceBlock>,

    #[serde(rename = "extraction_matrix_type")]
    pub extraction_matrix_type: String, // "correlation" | "covariance"
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TotalVarianceComponent {
    pub total: f64,
    #[serde(rename = "percent_of_variance")]
    pub percent_of_variance: f64,
    #[serde(rename = "cumulative_percent")]
    pub cumulative_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentMatrix {
    pub components: HashMap<String, Vec<f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReproducedCorrelations {
    pub reproduced_correlation: HashMap<String, HashMap<String, f64>>,
    pub residual: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReproducedCovariances {
    pub reproduced_covariance: HashMap<String, HashMap<String, f64>>,
    pub residual: HashMap<String, HashMap<String, f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RotatedComponentMatrix {
    pub components: HashMap<String, Vec<f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
    #[serde(rename = "is_converged")]
    pub is_converged: bool,
    #[serde(rename = "iterations_required")]
    pub iterations_required: u32,
    #[serde(rename = "convergence_value")]
    pub convergence_value: f64, 
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentTransformationMatrix {
    pub components: Vec<Vec<f64>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentScoreCoefficientMatrix {
    pub components: HashMap<String, Vec<f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentScoreCovarianceMatrix {
    pub components: Vec<Vec<f64>>,
}

pub struct ExtractionResult {
    pub loadings: DMatrix<f64>,
    pub standardized_loadings: Option<DMatrix<f64>>,
    pub standard_deviations: Option<Vec<f64>>,
    pub eigenvalues: Vec<f64>,
    pub communalities: Vec<f64>,
    pub explained_variance: Vec<f64>,
    pub cumulative_variance: Vec<f64>,
    pub n_factors: usize,
    pub var_names: Vec<String>,
    // pub has_heywood_case: bool,
    pub status: ExtractionStatus,
    pub has_heywood_case: bool,
    pub extraction_status: ExtractionStatus,
    pub warning_message: Option<String>,
}

pub struct RotationResult {
    pub rotated_loadings: DMatrix<f64>,
    pub transformation_matrix: DMatrix<f64>,
    pub factor_correlations: Option<DMatrix<f64>>,
    pub is_converged: bool,      
    pub iterations_required: u32,
    pub convergence_value: f64,
    // Revisi 31 Mei 2026
    // pub normalized_loadings: Option<DMatrix<f64>>, 
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PatternMatrix {
    pub components: HashMap<String, Vec<f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
    #[serde(rename = "is_converged")]
    pub is_converged: bool,      
    #[serde(rename = "iterations_required")]
    pub iterations_required: u32,
    #[serde(rename = "convergence_value")]
    pub convergence_value: f64, 
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StructureMatrix {
    pub components: HashMap<String, Vec<f64>>,
    #[serde(rename = "variable_order")]
    pub variable_order: Vec<String>,
    #[serde(rename = "is_converged")]
    pub is_converged: bool,      
    #[serde(rename = "iterations_required")]
    pub iterations_required: u32,
    #[serde(rename = "convergence_value")]
    pub convergence_value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentCorrelationMatrix {
    pub correlations: Vec<Vec<f64>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoadingPlot {
    /// Label sumbu (misal: ["Component 1", "Component 2", "Component 3"])
    pub axis_labels: Vec<String>,
    /// Data titik variabel
    pub points: Vec<LoadingPoint>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoadingPoint {
    /// Nama variabel (misal: "VAR0001")
    pub label: String,
    /// Koordinat: [x, y] atau [x, y, z]
    pub coordinates: Vec<f64>, 
}

impl ExtractionResult {

    pub fn failed(
        status: ExtractionStatus,
        msg: &str
    ) -> Self {

        Self {
            loadings: nalgebra::DMatrix::zeros(0,0),
            standardized_loadings: None,
            standard_deviations: None,
            eigenvalues: vec![],
            communalities: vec![],
            explained_variance: vec![],
            cumulative_variance: vec![],
            n_factors: 0,
            var_names: vec![],
            has_heywood_case: false,
            status: status.clone(), 
            extraction_status: status,
            warning_message: Some(msg.to_string()),
        }
    }
}