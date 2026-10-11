//! Unit test white-box RM terhadap nilai SPSS 27
//! (testing/glm-rm-reference/spss-output/spss-values.json).
//!
//! - RmModel (stats/rm_model.rs): jalur yang dipakai produksi
//!   (wasm/function.rs membangun RmModel untuk setiap desain).
//! - calculate_mauchly_test (stats/mauchly_test.rs) dan
//!   calculate_tests_within_subjects_effects (stats/within_subjects_effects.rs):
//!   modul lama. Di wasm/function.rs keduanya hanya dipanggil pada cabang
//!   `None` yang tidak dapat dicapai (bila RmModel::build gagal, run_analysis
//!   sudah return lebih dulu). Keduanya diuji langsung sebagai unit, pada
//!   desain within-only (desain yang ditangani modul lama: df galat n − 1).
use serde_json::{ json, Value };

use super::wb_support::{ build_payload, read_csv, spss_rows, Comparison, Design, SPSS_TOL };
use crate::models::result::{ MauchlyTest, MultivariateTests, TestsBetweenSubjectsEffects, TestsWithinSubjectsEffects };
use crate::stats::core::{ calculate_mauchly_test, calculate_tests_within_subjects_effects };
use crate::stats::rm_model::RmModel;

fn gambar51() -> Design<'static> {
    Design {
        factors: vec![("perlakuan", 4)],
        measures: vec![("anjing", vec!["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"])],
        between: vec![],
        options: json!({}),
        contrast: None,
    }
}

fn dataset_a() -> Design<'static> {
    Design {
        factors: vec![("waktu", 3)],
        measures: vec![("cemas", vec!["cemas1", "cemas2", "cemas3"]), ("stres", vec!["stres1", "stres2", "stres3"])],
        between: vec![],
        options: json!({ "DescStats": true, "EstEffectSize": true, "ObsPower": true }),
        contrast: None,
    }
}

fn dataset_b() -> Design<'static> {
    Design {
        factors: vec![("waktu", 4)],
        measures: vec![("skor", vec!["w1", "w2", "w3", "w4"])],
        between: vec!["kelompok"],
        options: json!({ "DescStats": true, "EstEffectSize": true, "ObsPower": true }),
        contrast: None,
    }
}

fn f(r: &Value, key: &str) -> String {
    r[key].as_str().unwrap_or("").to_string()
}

fn compare_mauchly(cmp: &mut Comparison, dataset: &str, m: &MauchlyTest) {
    for r in spss_rows(dataset, "mauchly") {
        let measure = f(&r, "measure");
        let field = f(&r, "field");
        let e = m.tests.get(&measure);
        let v = e.map(|e| match field.as_str() {
            "Mauchly's W" => e.mauchly_w,
            "Approx. Chi-Square" => e.chi_square,
            "df" => e.df as f64,
            "Sig." => e.significance,
            "Greenhouse-Geisser" => e.greenhouse_geisser_epsilon,
            "Huynh-Feldt" => e.huynh_feldt_epsilon,
            "Lower-bound" => e.lower_bound_epsilon,
            other => panic!("field Mauchly tak dikenal: {}", other),
        });
        cmp.check(&format!("{} mauchly {} {}", dataset, measure, field), v, r["value"].as_f64().unwrap(), SPSS_TOL);
    }
}

fn compare_within_effects(cmp: &mut Comparison, dataset: &str, w: &TestsWithinSubjectsEffects, fields: &[&str]) {
    for r in spss_rows(dataset, "within_effects") {
        let field = f(&r, "field");
        if !fields.contains(&field.as_str()) {
            continue;
        }
        let (measure, source, correction) = (f(&r, "measure"), f(&r, "source"), f(&r, "correction"));
        let row = w.measures
            .get(&measure)
            .and_then(|m| m.sources.iter().find(|s| s.source == source && s.assumption_type == correction));
        let v = row.map(|s| match field.as_str() {
            "SS" => s.sum_of_squares,
            "df" => s.df,
            "Mean Square" => s.mean_square,
            "F" => s.f,
            "Sig." => s.significance,
            "Partial Eta Squared" => s.partial_eta_squared,
            "Noncent. Parameter" => s.noncent_parameter,
            "Observed Power" => s.observed_power,
            other => panic!("field within tak dikenal: {}", other),
        });
        cmp.check(&format!("{} within {} {} {} {}", dataset, measure, source, correction, field), v, r["value"].as_f64().unwrap(), SPSS_TOL);
    }
}

fn compare_multivariate(cmp: &mut Comparison, dataset: &str, table: &str, mv: &MultivariateTests) {
    for r in spss_rows(dataset, table) {
        let source = f(&r, "source");
        let (effect, stat) = source.split_once(" | ").expect("sumber 'efek | statistik'");
        let field = f(&r, "field");
        let e = mv.effects.get(effect).and_then(|m| m.get(stat));
        let v = e.map(|e| match field.as_str() {
            "Value" => e.value,
            "F" => e.f,
            "Hypothesis df" => e.hypothesis_df,
            "Error df" => e.error_df,
            "Sig." => e.significance,
            "Partial Eta Squared" => e.partial_eta_squared,
            "Noncent. Parameter" => e.noncent_parameter,
            "Observed Power" => e.observed_power,
            other => panic!("field multivariat tak dikenal: {}", other),
        });
        cmp.check(&format!("{} {} {} {}", dataset, table, source, field), v, r["value"].as_f64().unwrap(), SPSS_TOL);
    }
}

fn compare_between(cmp: &mut Comparison, dataset: &str, b: &TestsBetweenSubjectsEffects) {
    for r in spss_rows(dataset, "between_effects") {
        let (measure, source, field) = (f(&r, "measure"), f(&r, "source"), f(&r, "field"));
        let e = b.effects.get(&measure).and_then(|m| m.get(&source));
        let v = e.map(|e| match field.as_str() {
            "SS" => e.sum_of_squares,
            "df" => e.df as f64,
            "Mean Square" => e.mean_square,
            "F" => e.f_value,
            "Sig." => e.significance,
            "Partial Eta Squared" => e.partial_eta_squared,
            "Noncent. Parameter" => e.noncent_parameter,
            "Observed Power" => e.observed_power,
            other => panic!("field between tak dikenal: {}", other),
        });
        cmp.check(&format!("{} between {} {} {}", dataset, measure, source, field), v, r["value"].as_f64().unwrap(), SPSS_TOL);
    }
}

const ALL_WITHIN_FIELDS: [&str; 8] = ["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"];

// ---- RmModel (jalur produksi) -------------------------------------------

#[test]
fn rm_model_gambar51_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/gambar51.csv"), &gambar51());
    let model = RmModel::build(&data, &config).expect("RmModel gambar51");
    assert_eq!(model.excluded, 0);
    let mut cmp = Comparison::default();
    let (mauchly, problems) = model.mauchly().expect("mauchly");
    assert!(problems.is_empty(), "{:?}", problems);
    compare_mauchly(&mut cmp, "gambar51", &mauchly);
    compare_within_effects(&mut cmp, "gambar51", &model.within_effects(&mauchly), &ALL_WITHIN_FIELDS);
    compare_multivariate(&mut cmp, "gambar51", "multivariate", &model.multivariate_tests().expect("multivariate"));
    compare_between(&mut cmp, "gambar51", &model.between_effects());
    cmp.finish("RmModel gambar51");
}

#[test]
fn rm_model_dataset_a_dua_measure_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_a.csv"), &dataset_a());
    let model = RmModel::build(&data, &config).expect("RmModel a");
    let mut cmp = Comparison::default();
    let (mauchly, _) = model.mauchly().expect("mauchly");
    compare_mauchly(&mut cmp, "a", &mauchly);
    compare_within_effects(&mut cmp, "a", &model.within_effects(&mauchly), &ALL_WITHIN_FIELDS);
    compare_multivariate(&mut cmp, "a", "multivariate", &model.multivariate_tests().expect("multivariate"));
    compare_between(&mut cmp, "a", &model.between_effects());
    cmp.finish("RmModel a");
}

#[test]
fn rm_model_dataset_b_campuran_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_b.csv"), &dataset_b());
    let model = RmModel::build(&data, &config).expect("RmModel b");
    let mut cmp = Comparison::default();
    let (mauchly, _) = model.mauchly().expect("mauchly");
    compare_mauchly(&mut cmp, "b", &mauchly);
    compare_within_effects(&mut cmp, "b", &model.within_effects(&mauchly), &ALL_WITHIN_FIELDS);
    compare_multivariate(&mut cmp, "b", "multivariate", &model.multivariate_tests().expect("multivariate"));
    compare_between(&mut cmp, "b", &model.between_effects());
    cmp.finish("RmModel b");
}

/// Epsilon GG, HF, LB dan koreksi df/Sig. pada Tests of Within-Subjects
/// Effects (dataset b: HF dibatasi 1, cabang `.min(1.0)`).
#[test]
fn rm_model_epsilon_gg_hf_lb_dataset_b() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_b.csv"), &dataset_b());
    let model = RmModel::build(&data, &config).unwrap();
    let (mauchly, _) = model.mauchly().unwrap();
    let e = &mauchly.tests["skor"];
    let mut cmp = Comparison::default();
    cmp.check("b GG", Some(e.greenhouse_geisser_epsilon), 0.8946909662383676, SPSS_TOL);
    cmp.check("b HF (dibatasi 1)", Some(e.huynh_feldt_epsilon), 1.0, 0.0);
    cmp.check("b LB = 1/(k-1)", Some(e.lower_bound_epsilon), 1.0 / 3.0, 1e-15);
    // df terkoreksi = df x epsilon (SPSS: waktu GG df = 3 x 0.89469 = 2.68407).
    compare_within_effects(&mut cmp, "b", &model.within_effects(&mauchly), &["df", "Mean Square", "Sig."]);
    cmp.finish("RmModel b epsilon");
}

// ---- Modul lama (within-only) -------------------------------------------

#[test]
fn legacy_mauchly_gambar51_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/gambar51.csv"), &gambar51());
    let mut cmp = Comparison::default();
    compare_mauchly(&mut cmp, "gambar51", &calculate_mauchly_test(&data, &config).expect("mauchly lama"));
    cmp.finish("calculate_mauchly_test gambar51");
}

#[test]
fn legacy_mauchly_dataset_a_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_a.csv"), &dataset_a());
    let mut cmp = Comparison::default();
    compare_mauchly(&mut cmp, "a", &calculate_mauchly_test(&data, &config).expect("mauchly lama"));
    cmp.finish("calculate_mauchly_test a");
}

/// SS, df, MS, F dan Sig. untuk Sphericity Assumed, GG, HF, LB dan baris
/// Error; epsilon dari calculate_mauchly_test (alur modul lama).
#[test]
fn legacy_within_effects_gambar51_koreksi_epsilon_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/gambar51.csv"), &gambar51());
    let mauchly = calculate_mauchly_test(&data, &config).ok();
    let w = calculate_tests_within_subjects_effects(&data, &config, &mauchly).expect("within lama");
    let mut cmp = Comparison::default();
    compare_within_effects(&mut cmp, "gambar51", &w, &["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared"]);
    cmp.finish("calculate_tests_within_subjects_effects gambar51");
}

#[test]
fn legacy_within_effects_dataset_a_koreksi_epsilon_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_a.csv"), &dataset_a());
    let mauchly = calculate_mauchly_test(&data, &config).ok();
    let w = calculate_tests_within_subjects_effects(&data, &config, &mauchly).expect("within lama");
    let mut cmp = Comparison::default();
    compare_within_effects(&mut cmp, "a", &w, &["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared"]);
    cmp.finish("calculate_tests_within_subjects_effects a");
}

/// Observed Power modul lama (aproksimasi normal) terhadap SPSS.
#[test]
fn legacy_within_effects_observed_power_sesuai_spss() {
    let (data, config) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_a.csv"), &dataset_a());
    let mauchly = calculate_mauchly_test(&data, &config).ok();
    let w = calculate_tests_within_subjects_effects(&data, &config, &mauchly).expect("within lama");
    let mut cmp = Comparison::default();
    compare_within_effects(&mut cmp, "a", &w, &["Noncent. Parameter", "Observed Power"]);
    cmp.finish("calculate_tests_within_subjects_effects a (power)");
}
