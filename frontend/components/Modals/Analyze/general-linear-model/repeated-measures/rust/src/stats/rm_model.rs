//! Repeated measures as a multivariate GLM (the approach of SPSS GLM):
//! one row per subject, the within-subjects cells of every measure as
//! dependent variables, and a between-subjects design matrix X
//! (intercept, covariates, effect-coded between-subjects factors and their
//! full-factorial interactions).
//!
//! - Within-subjects tests use the orthonormal contrasts Z_m = Y_m·Cᵀ of each
//!   measure; between-subjects tests use T_m = Σ_j y_mj / √k.
//! - Type III hypothesis SSCP for the columns J of a term:
//!   H = (B_J)ᵀ [(XᵀX)⁻¹_JJ]⁻¹ B_J with B = (XᵀX)⁻¹XᵀY; the error SSCP is
//!   E = (Y − XB)ᵀ(Y − XB) with v = n − rank(X) degrees of freedom.
//! - Subjects with a missing value on any variable of the analysis are
//!   excluded (listwise), as SPSS does.
//!
//! Data layout (see also `models::data`): `subject_data[s]` holds the
//! records of subject s (dependent variables under their encoded names);
//! `factors_data[f][s]` / `covariate_data[c][s]` hold the value of
//! between-subjects factor f / covariate c for subject s, with f and c
//! following `factors_data_defs` / `covariate_data_defs`.
use nalgebra::{ DMatrix, SymmetricEigen };
use statrs::distribution::{ ChiSquared, ContinuousCDF };

use crate::models::{
    config::RepeatedMeasuresConfig,
    data::{ AnalysisData, DataRecord, DataValue, VariableDefinition },
    result::{
        DescriptiveStatistics,
        MauchlyTest,
        MauchlyTestEntry,
        MultivariateTestEntry,
        MultivariateTests,
        StatGroup,
        StatsEntry,
        TestEffectEntry,
        TestsBetweenSubjectsEffects,
        TestsWithinSubjectsContrasts,
        TestsWithinSubjectsEffects,
        UnivariateTestEntry,
        UnivariateTests,
        WithinSubjectsContrastSource,
        WithinSubjectsContrastsResult,
        WithinSubjectsEffectSource,
        WithinSubjectsEffectsResult,
    },
};
use crate::utils::collections::HashMap;

use super::core::parse_within_subject_factors;
use super::glm_tests::{ f_significance, multivariate_statistics, observed_power };

/// One term of the between-subjects design: its columns in X.
pub struct Term {
    pub name: String,
    pub cols: Vec<usize>,
}

pub struct MeasureData {
    pub name: String,
    /// Encoded variable names in level order (e.g. "w1_(1,skor)").
    pub variables: Vec<String>,
    /// n × k values of the kept subjects.
    pub y: DMatrix<f64>,
}

pub struct BetweenFactor {
    pub name: String,
    /// Sorted levels (numeric ascending when all numeric, as SPSS).
    pub levels: Vec<String>,
    /// Display labels of the levels (value labels when defined).
    pub labels: Vec<String>,
}

pub struct RmModel {
    pub factor: String,
    pub k: usize,
    pub measures: Vec<MeasureData>,
    pub factors: Vec<BetweenFactor>,
    /// Level index per kept subject and between-subjects factor.
    pub subject_levels: Vec<Vec<usize>>,
    pub x: DMatrix<f64>,
    pub xtx_inv: DMatrix<f64>,
    pub terms: Vec<Term>,
    pub n: usize,
    pub rank: usize,
    pub excluded: usize,
    pub alpha: f64,
    pub sum_of_squares: String,
}

fn number(value: Option<&DataValue>) -> Option<f64> {
    match value {
        Some(DataValue::Number(v)) if v.is_finite() => Some(*v),
        _ => None,
    }
}

fn level_key(value: Option<&DataValue>) -> Option<String> {
    match value {
        Some(DataValue::Number(v)) if v.is_finite() => Some(format!("{}", v)),
        Some(DataValue::Text(t)) if !t.trim().is_empty() => Some(t.clone()),
        Some(DataValue::Boolean(b)) => Some(b.to_string()),
        _ => None,
    }
}

fn find_value<'a>(records: &'a [DataRecord], name: &str) -> Option<&'a DataValue> {
    records.iter().find_map(|r| r.values.get(name))
}

/// Index of a variable in a defs list (Vec<Vec<VariableDefinition>>).
fn def_index(defs: &[Vec<VariableDefinition>], name: &str) -> Option<usize> {
    defs.iter().position(|d| d.iter().any(|v| v.name == name))
}

/// Values of one between-subjects variable for every subject, from the
/// variable-major layout `data[f][s]`.
fn between_column(
    data: &[Vec<DataRecord>],
    defs: &[Vec<VariableDefinition>],
    name: &str,
    n_subjects: usize,
    what: &str
) -> Result<Vec<Option<DataValue>>, String> {
    let f = def_index(defs, name).ok_or_else(|| format!("{} '{}' not found in the data definitions", what, name))?;
    let column = data
        .get(f)
        .ok_or_else(|| format!("No data for {} '{}'", what, name))?;
    if column.len() != n_subjects {
        return Err(
            format!(
                "Data layout error for {} '{}': expected one record per subject ({} subjects), got {} records. factors_data/covar_data must hold one array per variable with one record per subject.",
                what,
                name,
                n_subjects,
                column.len()
            )
        );
    }
    Ok(column.iter().map(|r| r.values.get(name).cloned()).collect())
}

fn sort_levels(levels: &mut Vec<String>) {
    let numeric: Option<Vec<f64>> = levels.iter().map(|l| l.parse::<f64>().ok()).collect();
    if numeric.is_some() {
        levels.sort_by(|a, b| a.parse::<f64>().unwrap().partial_cmp(&b.parse::<f64>().unwrap()).unwrap());
    } else {
        levels.sort();
    }
}

fn value_label(defs: &[Vec<VariableDefinition>], name: &str, level: &str) -> String {
    def_index(defs, name)
        .and_then(|i| defs[i].iter().find(|v| v.name == name))
        .and_then(|def| {
            def.values.iter().find(|vl| level_key(Some(&vl.value)).as_deref() == Some(level)).map(|vl| vl.label.clone())
        })
        .filter(|l| !l.trim().is_empty())
        .unwrap_or_else(|| level.to_string())
}

/// Orthonormal Helmert contrasts, (k−1) × k (rows orthonormal, sum to zero).
pub fn helmert(k: usize) -> DMatrix<f64> {
    let mut m = DMatrix::<f64>::zeros(k - 1, k);
    for i in 1..k {
        let scale = ((i * (i + 1)) as f64).sqrt();
        for j in 0..i {
            m[(i - 1, j)] = -1.0 / scale;
        }
        m[(i - 1, i)] = (i as f64) / scale;
    }
    m
}

impl RmModel {
    pub fn build(data: &AnalysisData, config: &RepeatedMeasuresConfig) -> Result<RmModel, String> {
        let within = parse_within_subject_factors(data, config)?;
        let factor_names: Vec<String> = config.model.def_factors
            .as_deref()
            .unwrap_or("")
            .split(';')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if factor_names.len() > 1 {
            return Err("Designs with more than one within-subjects factor are not supported yet".to_string());
        }
        if within.measures.is_empty() {
            return Err("No within-subjects variables".to_string());
        }
        let factor = within.measures
            .values()
            .next()
            .and_then(|f| f.first())
            .and_then(|f| f.factor_values.keys().next().cloned())
            .or_else(|| factor_names.first().cloned())
            .unwrap_or_else(|| "Factor".to_string());

        // Variables of each measure in level order.
        let mut measure_vars: Vec<(String, Vec<String>)> = Vec::new();
        for (measure, cells) in &within.measures {
            let mut cells: Vec<(u32, String)> = cells
                .iter()
                .map(|c| {
                    let level = c.factor_values.values().next().and_then(|v| v.parse::<u32>().ok()).unwrap_or(0);
                    (level, c.dependent_variable.clone())
                })
                .collect();
            cells.sort_by_key(|c| c.0);
            measure_vars.push((measure.clone(), cells.into_iter().map(|c| c.1).collect()));
        }
        let k = measure_vars[0].1.len();
        if k < 2 {
            return Err("The within-subjects factor needs at least 2 levels".to_string());
        }
        if measure_vars.iter().any(|(_, v)| v.len() != k) {
            return Err("All measures must have the same number of within-subjects levels".to_string());
        }

        let n_all = data.subject_data.len();
        let factor_list: Vec<String> = config.main.factors_var.clone().unwrap_or_default();
        let covariate_list: Vec<String> = config.main.covariates.clone().unwrap_or_default();
        let factor_columns: Vec<Vec<Option<DataValue>>> = factor_list
            .iter()
            .map(|f| between_column(&data.factors_data, &data.factors_data_defs, f, n_all, "between-subjects factor"))
            .collect::<Result<_, _>>()?;
        let covariate_data = data.covariate_data.clone().unwrap_or_default();
        let covariate_defs = data.covariate_data_defs.clone().unwrap_or_default();
        let covariate_columns: Vec<Vec<Option<DataValue>>> = covariate_list
            .iter()
            .map(|c| between_column(&covariate_data, &covariate_defs, c, n_all, "covariate"))
            .collect::<Result<_, _>>()?;

        // Listwise selection of complete subjects.
        let mut rows: Vec<(Vec<f64>, Vec<String>, Vec<f64>)> = Vec::new();
        for s in 0..n_all {
            let mut y = Vec::with_capacity(k * measure_vars.len());
            let mut ok = true;
            for (_, vars) in &measure_vars {
                for v in vars {
                    match number(find_value(&data.subject_data[s], v)) {
                        Some(x) => y.push(x),
                        None => {
                            ok = false;
                            break;
                        }
                    }
                }
                if !ok {
                    break;
                }
            }
            let levels: Vec<Option<String>> = factor_columns.iter().map(|c| level_key(c[s].as_ref())).collect();
            let covs: Vec<Option<f64>> = covariate_columns.iter().map(|c| number(c[s].as_ref())).collect();
            if ok && levels.iter().all(|l| l.is_some()) && covs.iter().all(|c| c.is_some()) {
                rows.push((y, levels.into_iter().map(|l| l.unwrap()).collect(), covs.into_iter().map(|c| c.unwrap()).collect()));
            }
        }
        let n = rows.len();
        let excluded = n_all - n;

        // Between-subjects factors and their sorted levels.
        let mut factors: Vec<BetweenFactor> = Vec::new();
        for (fi, name) in factor_list.iter().enumerate() {
            let mut levels: Vec<String> = Vec::new();
            for r in &rows {
                if !levels.contains(&r.1[fi]) {
                    levels.push(r.1[fi].clone());
                }
            }
            sort_levels(&mut levels);
            if levels.len() < 2 {
                return Err(format!("Between-subjects factor '{}' has fewer than 2 levels", name));
            }
            let labels = levels.iter().map(|l| value_label(&data.factors_data_defs, name, l)).collect();
            factors.push(BetweenFactor { name: name.clone(), levels, labels });
        }
        let subject_levels: Vec<Vec<usize>> = rows
            .iter()
            .map(|r| factors.iter().enumerate().map(|(fi, f)| f.levels.iter().position(|l| *l == r.1[fi]).unwrap()).collect())
            .collect();

        // Design matrix: intercept, covariates, factor effects (deviation
        // coding, last level = −1) and all interactions of factors.
        let mut columns: Vec<Vec<f64>> = vec![vec![1.0; n]];
        let mut terms: Vec<Term> = Vec::new();
        for (ci, name) in covariate_list.iter().enumerate() {
            terms.push(Term { name: name.clone(), cols: vec![columns.len()] });
            columns.push(rows.iter().map(|r| r.2[ci]).collect());
        }
        let effect_cols: Vec<Vec<Vec<f64>>> = factors
            .iter()
            .enumerate()
            .map(|(fi, f)| {
                let last = f.levels.len() - 1;
                (0..last)
                    .map(|j| {
                        subject_levels
                            .iter()
                            .map(|sl| if sl[fi] == j { 1.0 } else if sl[fi] == last { -1.0 } else { 0.0 })
                            .collect()
                    })
                    .collect()
            })
            .collect();
        let n_factors = factors.len();
        let mut subsets: Vec<Vec<usize>> = (1..(1usize << n_factors))
            .map(|mask| (0..n_factors).filter(|i| mask & (1 << i) != 0).collect::<Vec<usize>>())
            .collect();
        subsets.sort_by(|a, b| a.len().cmp(&b.len()).then(a.cmp(b)));
        for subset in subsets {
            let mut products: Vec<Vec<f64>> = vec![vec![1.0; n]];
            for &fi in &subset {
                let mut next = Vec::new();
                for p in &products {
                    for col in &effect_cols[fi] {
                        next.push(p.iter().zip(col).map(|(a, b)| a * b).collect());
                    }
                }
                products = next;
            }
            let name = subset.iter().map(|&fi| factors[fi].name.clone()).collect::<Vec<_>>().join(" * ");
            let start = columns.len();
            columns.extend(products);
            terms.push(Term { name, cols: (start..columns.len()).collect() });
        }
        let x = DMatrix::from_fn(n, columns.len(), |i, j| columns[j][i]);
        let rank = x.ncols();
        if n <= rank {
            return Err(format!("Not enough complete subjects ({}) for a design with {} parameters", n, rank));
        }
        let xtx_inv = (x.transpose() * &x)
            .try_inverse()
            .ok_or_else(|| "The between-subjects design matrix is singular (empty cells or collinear covariates)".to_string())?;

        let mut measures = Vec::new();
        for (mi, (name, variables)) in measure_vars.into_iter().enumerate() {
            let y = DMatrix::from_fn(n, k, |i, j| rows[i].0[mi * k + j]);
            measures.push(MeasureData { name, variables, y });
        }

        Ok(RmModel {
            factor,
            k,
            measures,
            factors,
            subject_levels,
            x,
            xtx_inv,
            terms,
            n,
            rank,
            excluded,
            alpha: config.options.sig_level.unwrap_or(0.05),
            sum_of_squares: format!("{:?}", config.model.sum_of_square_method),
        })
    }

    /// SPSS-style design note: "Intercept + g; Within Subjects Design: f".
    pub fn design_note(&self) -> String {
        let mut between = vec!["Intercept".to_string()];
        between.extend(self.terms.iter().map(|t| t.name.clone()));
        format!("{}; Within Subjects Design: {}", between.join(" + "), self.factor)
    }

    pub fn error_df(&self) -> usize {
        self.n - self.rank
    }

    fn coefficients(&self, y: &DMatrix<f64>) -> DMatrix<f64> {
        &self.xtx_inv * self.x.transpose() * y
    }

    /// Type III hypothesis SSCP of the columns `cols` of X.
    pub fn hypothesis(&self, y: &DMatrix<f64>, cols: &[usize]) -> DMatrix<f64> {
        let b = self.coefficients(y);
        let lb = DMatrix::from_fn(cols.len(), y.ncols(), |i, j| b[(cols[i], j)]);
        let m = DMatrix::from_fn(cols.len(), cols.len(), |i, j| self.xtx_inv[(cols[i], cols[j])]);
        let m_inv = m.try_inverse().unwrap_or_else(|| DMatrix::zeros(cols.len(), cols.len()));
        let h = lb.transpose() * m_inv * lb;
        (h.clone() + h.transpose()) / 2.0
    }

    pub fn error(&self, y: &DMatrix<f64>) -> DMatrix<f64> {
        let residual = y - &self.x * self.coefficients(y);
        let e = residual.transpose() * &residual;
        (e.clone() + e.transpose()) / 2.0
    }

    /// Within-subjects transform Z = Y·Cᵀ (n × (k−1)).
    pub fn within(&self, m: &MeasureData) -> DMatrix<f64> {
        &m.y * helmert(self.k).transpose()
    }

    /// Between-subjects transform T = Σ_j y_j / √k (n × 1).
    pub fn average(&self, m: &MeasureData) -> DMatrix<f64> {
        let root = (self.k as f64).sqrt();
        DMatrix::from_fn(self.n, 1, |i, _| m.y.row(i).sum() / root)
    }

    /// (source name, columns) of the within-subjects effects: the factor
    /// (intercept of Z) and its interactions with every between term.
    fn within_sources(&self) -> Vec<(String, Vec<usize>)> {
        let mut out = vec![(self.factor.clone(), vec![0])];
        for t in &self.terms {
            out.push((format!("{} * {}", self.factor, t.name), t.cols.clone()));
        }
        out
    }

    fn between_sources(&self) -> Vec<(String, Vec<usize>)> {
        let mut out = vec![("Intercept".to_string(), vec![0])];
        for t in &self.terms {
            out.push((t.name.clone(), t.cols.clone()));
        }
        out
    }

    pub fn multivariate_tests(&self) -> Result<MultivariateTests, String> {
        let v = self.error_df() as f64;
        let mut effects: HashMap<String, HashMap<String, MultivariateTestEntry>> = HashMap::new();
        if self.measures.len() > 1 {
            let t_all = hstack(self.measures.iter().map(|m| self.average(m)).collect());
            let e = self.error(&t_all);
            for (name, cols) in self.between_sources() {
                let stats = multivariate_statistics(&self.hypothesis(&t_all, &cols), &e, cols.len() as f64, v, self.alpha)
                    .map_err(|err| format!("{}: {}", name, err))?;
                effects.insert(name, stats);
            }
        }
        let z_all = hstack(self.measures.iter().map(|m| self.within(m)).collect());
        let e = self.error(&z_all);
        for (name, cols) in self.within_sources() {
            let stats = multivariate_statistics(&self.hypothesis(&z_all, &cols), &e, cols.len() as f64, v, self.alpha)
                .map_err(|err| format!("{}: {}", name, err))?;
            effects.insert(name, stats);
        }
        Ok(MultivariateTests {
            effects,
            design: Some(self.design_note()),
            alpha: Some(self.alpha),
        })
    }

    /// Mauchly's test per measure on the error SSCP of the full model.
    pub fn mauchly(&self) -> Result<MauchlyTest, String> {
        let v = self.error_df() as f64;
        let p = self.k - 1;
        let p_f = p as f64;
        let n = self.n as f64;
        let mut tests = HashMap::new();
        for m in &self.measures {
            let s = self.error(&self.within(m)) / v;
            let det = s.determinant();
            let trace = s.trace();
            let mean_eig = trace / p_f;
            let w = if mean_eig.abs() < 1e-12 { 0.0 } else { det / mean_eig.powi(p as i32) };
            let correction = (2.0 * p_f * p_f + p_f + 2.0) / (6.0 * p_f);
            let chi_square = if w > 0.0 { -(v - correction) * w.ln() } else { f64::INFINITY };
            let df = p * (p + 1) / 2 - 1;
            let significance = if df == 0 {
                f64::NAN
            } else if chi_square.is_finite() {
                1.0 - ChiSquared::new(df as f64).map_err(|e| e.to_string())?.cdf(chi_square)
            } else {
                0.0
            };
            let eig: Vec<f64> = SymmetricEigen::new(s.clone()).eigenvalues.iter().copied().collect();
            let sum: f64 = eig.iter().sum();
            let sum_sq: f64 = eig.iter().map(|e| e * e).sum();
            let gg = if sum_sq < 1e-12 { 1.0 } else { (sum * sum) / (p_f * sum_sq) };
            // Huynh-Feldt: (n·p·ε − 2) / (p·(n − r − p·ε)), at most 1.
            let hf = if self.n <= self.k {
                gg.min(1.0)
            } else {
                let den = p_f * (v - p_f * gg);
                if den.abs() < 1e-12 { gg.min(1.0) } else { ((n * p_f * gg - 2.0) / den).min(1.0).max(gg) }
            };
            tests.insert(m.name.clone(), MauchlyTestEntry {
                effect: self.factor.clone(),
                mauchly_w: w,
                chi_square: if chi_square.is_finite() { chi_square } else { 0.0 },
                df,
                significance,
                greenhouse_geisser_epsilon: gg,
                huynh_feldt_epsilon: hf,
                lower_bound_epsilon: 1.0 / p_f,
            });
        }
        Ok(MauchlyTest {
            tests,
            design: Some(self.design_note()),
            note: Some(
                "Tests the null hypothesis that the error covariance matrix of the orthonormalized transformed dependent variables is proportional to an identity matrix.".to_string()
            ),
        })
    }

    fn effect_rows(
        &self,
        source: &str,
        ss: f64,
        df: f64,
        ss_error: f64,
        df_error: f64,
        corrections: &[(&str, f64)]
    ) -> Vec<WithinSubjectsEffectSource> {
        let f = (ss / df) / (ss_error / df_error);
        corrections
            .iter()
            .map(|(label, eps)| {
                let d1 = df * eps;
                let d2 = df_error * eps;
                WithinSubjectsEffectSource {
                    source: source.to_string(),
                    assumption_type: label.to_string(),
                    sum_of_squares: ss,
                    df: d1,
                    mean_square: ss / d1,
                    f,
                    significance: f_significance(f, d1, d2),
                    partial_eta_squared: ss / (ss + ss_error),
                    noncent_parameter: f * d1,
                    observed_power: observed_power(f, d1, d2, self.alpha),
                }
            })
            .collect()
    }

    /// Tests of within-subjects effects per measure (4 corrections).
    pub fn within_effects(&self, mauchly: &MauchlyTest) -> TestsWithinSubjectsEffects {
        let v = self.error_df() as f64;
        let p = (self.k - 1) as f64;
        let mut measures = HashMap::new();
        for m in &self.measures {
            let z = self.within(m);
            let ss_error = self.error(&z).trace();
            let df_error = p * v;
            let eps = mauchly.tests.get(&m.name);
            let corrections: Vec<(&str, f64)> = vec![
                ("Sphericity Assumed", 1.0),
                ("Greenhouse-Geisser", eps.map_or(1.0, |e| e.greenhouse_geisser_epsilon)),
                ("Huynh-Feldt", eps.map_or(1.0, |e| e.huynh_feldt_epsilon)),
                ("Lower-bound", eps.map_or(1.0 / p, |e| e.lower_bound_epsilon))
            ];
            let mut sources = Vec::new();
            for (name, cols) in self.within_sources() {
                let ss = self.hypothesis(&z, &cols).trace();
                sources.extend(self.effect_rows(&name, ss, p * (cols.len() as f64), ss_error, df_error, &corrections));
            }
            for (label, e) in &corrections {
                sources.push(WithinSubjectsEffectSource {
                    source: format!("Error({})", self.factor),
                    assumption_type: label.to_string(),
                    sum_of_squares: ss_error,
                    df: df_error * e,
                    mean_square: ss_error / (df_error * e),
                    f: 0.0,
                    significance: 0.0,
                    partial_eta_squared: 0.0,
                    noncent_parameter: 0.0,
                    observed_power: 0.0,
                });
            }
            measures.insert(m.name.clone(), WithinSubjectsEffectsResult { sources });
        }
        TestsWithinSubjectsEffects { measures }
    }

    /// Tests of within-subjects contrasts per measure with the contrasts
    /// Statify uses (adjacent levels, "Level j vs. Level j+1"), each
    /// tested against the error of the full between-subjects model.
    pub fn within_contrasts(&self) -> TestsWithinSubjectsContrasts {
        let v = self.error_df();
        let mut measures = HashMap::new();
        for m in &self.measures {
            let mut effects = Vec::new();
            let mut errors = Vec::new();
            for j in 0..(self.k - 1) {
                let label = format!("Level {} vs. Level {}", j + 1, j + 2);
                let d = DMatrix::from_fn(self.n, 1, |i, _| m.y[(i, j + 1)] - m.y[(i, j)]);
                let ss_error = self.error(&d)[(0, 0)];
                let ms_error = ss_error / (v as f64);
                for (name, cols) in self.within_sources() {
                    let ss = self.hypothesis(&d, &cols)[(0, 0)];
                    let df = cols.len();
                    let f = if ms_error > 0.0 { (ss / (df as f64)) / ms_error } else { 0.0 };
                    let mut fv = HashMap::new();
                    fv.insert(self.factor.clone(), label.clone());
                    effects.push((name.clone(), j, WithinSubjectsContrastSource {
                        source: name.clone(),
                        factor_values: fv,
                        sum_of_squares: ss,
                        df,
                        mean_square: ss / (df as f64),
                        f,
                        significance: f_significance(f, df as f64, v as f64),
                        partial_eta_squared: ss / (ss + ss_error),
                        noncent_parameter: f * (df as f64),
                        observed_power: observed_power(f, df as f64, v as f64, self.alpha),
                    }));
                }
                let mut fv = HashMap::new();
                fv.insert(format!("Error({})", self.factor), label.clone());
                errors.push(WithinSubjectsContrastSource {
                    source: format!("Error({})", self.factor),
                    factor_values: fv,
                    sum_of_squares: ss_error,
                    df: v,
                    mean_square: ms_error,
                    f: 0.0,
                    significance: 0.0,
                    partial_eta_squared: 0.0,
                    noncent_parameter: 0.0,
                    observed_power: 0.0,
                });
            }
            // Group rows by source (all contrasts of the factor, then of each
            // interaction), then the error rows, as SPSS lays the table out.
            let order: Vec<String> = self.within_sources().into_iter().map(|s| s.0).collect();
            let mut sources = Vec::new();
            for name in &order {
                for (n, _, row) in &effects {
                    if n == name {
                        sources.push(row.clone());
                    }
                }
            }
            sources.extend(errors);
            measures.insert(m.name.clone(), WithinSubjectsContrastsResult { sources });
        }
        TestsWithinSubjectsContrasts { measures }
    }

    /// Tests of between-subjects effects per measure (transformed variable:
    /// average, normalized as Σ y / √k like SPSS).
    pub fn between_effects(&self) -> TestsBetweenSubjectsEffects {
        let v = self.error_df();
        let mut effects = HashMap::new();
        let mut r_squared = HashMap::new();
        let mut adjusted_r_squared = HashMap::new();
        for m in &self.measures {
            let t = self.average(m);
            let ss_error = self.error(&t)[(0, 0)];
            let ms_error = ss_error / (v as f64);
            let mut rows = HashMap::new();
            for (name, cols) in self.between_sources() {
                let ss = self.hypothesis(&t, &cols)[(0, 0)];
                let df = cols.len();
                let f = (ss / (df as f64)) / ms_error;
                rows.insert(name, TestEffectEntry {
                    sum_of_squares: ss,
                    df,
                    mean_square: ss / (df as f64),
                    f_value: f,
                    significance: f_significance(f, df as f64, v as f64),
                    partial_eta_squared: ss / (ss + ss_error),
                    noncent_parameter: f * (df as f64),
                    observed_power: observed_power(f, df as f64, v as f64, self.alpha),
                });
            }
            rows.insert("Error".to_string(), TestEffectEntry {
                sum_of_squares: ss_error,
                df: v,
                mean_square: ms_error,
                f_value: 0.0,
                significance: f64::NAN,
                partial_eta_squared: 0.0,
                noncent_parameter: 0.0,
                observed_power: 0.0,
            });
            let mean = t.mean();
            let ss_total: f64 = t.iter().map(|x| (x - mean).powi(2)).sum();
            let r2 = if ss_total > 0.0 { 1.0 - ss_error / ss_total } else { 0.0 };
            let adj = 1.0 - (1.0 - r2) * ((self.n - 1) as f64) / (v as f64);
            effects.insert(m.name.clone(), rows);
            r_squared.insert(m.name.clone(), r2);
            adjusted_r_squared.insert(m.name.clone(), adj);
        }
        TestsBetweenSubjectsEffects { effects, r_squared, adjusted_r_squared }
    }

    /// Univariate Type III tests of the between-subjects design for every
    /// dependent variable (each within-subjects cell of each measure):
    /// Corrected Model, Intercept, every term, Error, Total, Corrected Total.
    pub fn univariate_tests(&self) -> UnivariateTests {
        let v = self.error_df();
        let mut tests = HashMap::new();
        let model_cols: Vec<usize> = self.terms.iter().flat_map(|t| t.cols.clone()).collect();
        for m in &self.measures {
            for (j, var) in m.variables.iter().enumerate() {
                let y = DMatrix::from_fn(self.n, 1, |i, _| m.y[(i, j)]);
                let ss_error = self.error(&y)[(0, 0)];
                let ms_error = ss_error / (v as f64);
                let mut rows = Vec::new();
                let mut push = |source: &str, ss: f64, df: usize| {
                    let f = (ss / (df as f64)) / ms_error;
                    rows.push(UnivariateTestEntry {
                        source: source.to_string(),
                        sum_of_squares: ss,
                        df,
                        mean_square: Some(ss / (df as f64)),
                        f: Some(f),
                        significance: Some(f_significance(f, df as f64, v as f64)),
                        partial_eta_squared: Some(ss / (ss + ss_error)),
                        noncent_parameter: Some(f * (df as f64)),
                        observed_power: Some(observed_power(f, df as f64, v as f64, self.alpha)),
                    });
                };
                if !model_cols.is_empty() {
                    push("Corrected Model", self.hypothesis(&y, &model_cols)[(0, 0)], model_cols.len());
                }
                for (name, cols) in self.between_sources() {
                    push(&name, self.hypothesis(&y, &cols)[(0, 0)], cols.len());
                }
                let blank = |source: &str, ss: f64, df: usize, ms: Option<f64>| UnivariateTestEntry {
                    source: source.to_string(),
                    sum_of_squares: ss,
                    df,
                    mean_square: ms,
                    f: None,
                    significance: None,
                    partial_eta_squared: None,
                    noncent_parameter: None,
                    observed_power: None,
                };
                let mean = y.mean();
                rows.push(blank("Error", ss_error, v, Some(ms_error)));
                rows.push(blank("Total", y.iter().map(|x| x * x).sum(), self.n, None));
                rows.push(blank("Corrected Total", y.iter().map(|x| (x - mean).powi(2)).sum(), self.n - 1, None));
                tests.insert(var.clone(), rows);
            }
        }
        UnivariateTests { tests, alpha: Some(self.alpha) }
    }

    /// Descriptive statistics per dependent variable: one row per cell of the
    /// between-subjects factors, then Total.
    pub fn descriptives(&self) -> HashMap<String, DescriptiveStatistics> {
        let mut out = HashMap::new();
        let cells: Vec<Vec<usize>> = {
            let mut cells = vec![vec![]];
            for f in &self.factors {
                let mut next = Vec::new();
                for c in &cells {
                    for l in 0..f.levels.len() {
                        let mut c2 = c.clone();
                        c2.push(l);
                        next.push(c2);
                    }
                }
                cells = next;
            }
            cells
        };
        let factor_label = self.factors.iter().map(|f| f.name.clone()).collect::<Vec<_>>().join(" * ");
        for m in &self.measures {
            for (j, var) in m.variables.iter().enumerate() {
                let mut groups = Vec::new();
                if !self.factors.is_empty() {
                    for cell in &cells {
                        let values: Vec<f64> = (0..self.n)
                            .filter(|&i| self.subject_levels[i] == *cell)
                            .map(|i| m.y[(i, j)])
                            .collect();
                        let label = cell
                            .iter()
                            .enumerate()
                            .map(|(fi, &l)| self.factors[fi].labels[l].clone())
                            .collect::<Vec<_>>()
                            .join(" · ");
                        groups.push(StatGroup { factor_name: factor_label.clone(), factor_value: label, stats: stats(&values), subgroups: None });
                    }
                }
                let all: Vec<f64> = (0..self.n).map(|i| m.y[(i, j)]).collect();
                groups.push(StatGroup {
                    factor_name: if self.factors.is_empty() { self.factor.clone() } else { factor_label.clone() },
                    factor_value: "Total".to_string(),
                    stats: stats(&all),
                    subgroups: None,
                });
                out.insert(var.clone(), DescriptiveStatistics { dependent_variable: var.clone(), groups });
            }
        }
        out
    }
}

fn stats(values: &[f64]) -> StatsEntry {
    let n = values.len();
    let mean = if n > 0 { values.iter().sum::<f64>() / (n as f64) } else { f64::NAN };
    let var = if n > 1 { values.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / ((n - 1) as f64) } else { f64::NAN };
    StatsEntry { mean, std_deviation: var.sqrt(), n }
}

fn hstack(blocks: Vec<DMatrix<f64>>) -> DMatrix<f64> {
    let rows = blocks[0].nrows();
    let cols: usize = blocks.iter().map(|b| b.ncols()).sum();
    let mut out = DMatrix::<f64>::zeros(rows, cols);
    let mut c = 0;
    for b in blocks {
        out.view_mut((0, c), (rows, b.ncols())).copy_from(&b);
        c += b.ncols();
    }
    out
}
