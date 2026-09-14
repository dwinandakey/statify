use serde::de::Error as DeError;
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Deserialize)]
#[serde(untagged)]
enum NumberLike {
    F64(f64),
    I64(i64),
    U64(u64),
    Str(String),
}

impl NumberLike {
    fn into_f64(self) -> Result<f64, String> {
        match self {
            NumberLike::F64(v) => Ok(v),
            NumberLike::I64(v) => Ok(v as f64),
            NumberLike::U64(v) => Ok(v as f64),
            NumberLike::Str(s) => s
                .trim()
                .parse::<f64>()
                .map_err(|_| format!("invalid numeric string: '{}'", s)),
        }
    }
}

fn deserialize_vec_f64<'de, D>(deserializer: D) -> Result<Vec<f64>, D::Error>
where
    D: Deserializer<'de>,
{
    let raw: Vec<NumberLike> = Vec::deserialize(deserializer)?;
    raw.into_iter()
        .map(|v| v.into_f64().map_err(D::Error::custom))
        .collect()
}

fn deserialize_matrix_f64<'de, D>(deserializer: D) -> Result<Vec<Vec<f64>>, D::Error>
where
    D: Deserializer<'de>,
{
    let raw: Vec<Vec<NumberLike>> = Vec::deserialize(deserializer)?;
    raw.into_iter()
        .map(|row| {
            row.into_iter()
                .map(|v| v.into_f64().map_err(D::Error::custom))
                .collect()
        })
        .collect()
}

fn deserialize_option_vec_f64<'de, D>(deserializer: D) -> Result<Option<Vec<f64>>, D::Error>
where
    D: Deserializer<'de>,
{
    let raw: Option<Vec<NumberLike>> = Option::deserialize(deserializer)?;
    raw.map(|vals| {
        vals.into_iter()
            .map(|v| v.into_f64().map_err(D::Error::custom))
            .collect()
    })
    .transpose()
}

fn default_pconverge() -> f64 {
    1e-6 // SPSS NOMREG default PCONVERGE = 1e-6
}
fn default_lconverge() -> f64 {
    0.0 // SPSS NOMREG default LCONVERGE = 0 (disabled)
}
fn default_iterations() -> u32 {
    100 // SPSS NOMREG default MXITER = 100
}
fn default_singularity() -> f64 {
    1e-8 // SPSS-like singularity threshold for generalized inverse fallback
}
fn default_delta() -> f64 {
    0.5 // SPSS NOMREG default delta for empty cells
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MultinomialConfig {
    #[serde(default)]
    pub subpopulation_mode: Option<String>,
    #[serde(default)]
    pub subpopulation_columns: Option<Vec<u32>>,
    pub reference_category: String,
    pub confidence_interval: f64,
    #[serde(default)]
    pub dispersion_scale: Option<String>,
    #[serde(default)]
    pub dispersion_value: Option<String>,
    #[serde(default)]
    pub stepwise_method: Option<String>,
    #[serde(default)]
    pub stepwise_entry_probability: Option<String>,
    #[serde(default)]
    pub stepwise_entry_test: Option<String>,
    #[serde(default)]
    pub stepwise_removal_probability: Option<String>,
    #[serde(default)]
    pub stepwise_removal_test: Option<String>,
    #[serde(default)]
    pub minimum_stepped_effects: Option<String>,
    #[serde(default)]
    pub maximum_stepped_effects: Option<String>,
    #[serde(default)]
    pub constrain_hierarchy: Option<bool>,
    #[serde(default)]
    pub hierarchy_mode: Option<String>,
    #[serde(default = "default_iterations")]
    pub iterations: u32,
    pub tolerance: f64,
    /// SPSS PCONVERGE: max absolute parameter change threshold (default 1e-6)
    #[serde(default = "default_pconverge")]
    pub pconverge: f64,
    /// SPSS LCONVERGE: log-likelihood change threshold (default 0.0 = disabled)
    #[serde(default = "default_lconverge")]
    pub lconverge: f64,
    /// Singularity criterion for matrix inversion fallback
    #[serde(default = "default_singularity")]
    pub singularity: f64,
    /// Added to empty cells (delta) for sparse/empty category smoothing
    #[serde(default = "default_delta")]
    pub delta: f64,
    pub include_intercept: bool,
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisData {
    #[serde(deserialize_with = "deserialize_vec_f64")]
    pub dependent: Vec<f64>,
    #[serde(deserialize_with = "deserialize_matrix_f64")]
    pub independent: Vec<Vec<f64>>,
    // Option::unwrap_or digunakan nanti jika null
    #[serde(default, deserialize_with = "deserialize_option_vec_f64")]
    pub weights: Option<Vec<f64>>,
    pub variable_names: Option<Vec<String>>,
}
