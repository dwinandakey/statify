//! Unit test white-box calculate_multivariate_tests (stats/multivariate_tests.rs):
//! Pillai, Wilks, Hotelling, Roy terhadap SPSS 27; Wilks dengan df pecahan
//! (mv9) dan Welch T² (Krishnamoorthy–Yu) terhadap R 4.3.2.
use serde_json::Value;

use super::wb_mv_support::{ load, spss_rows, Comparison, Spec, SPSS_TOL };
use crate::models::result::MultivariateTests;
use crate::stats::core::calculate_multivariate_tests;

fn norm(s: &str) -> String {
    s.chars().filter(|c| !c.is_whitespace()).collect()
}

/// Semua nilai tabel Multivariate Tests SPSS untuk satu konfigurasi.
fn compare_multivariate(cmp: &mut Comparison, config: &str, result: &MultivariateTests) {
    for r in spss_rows(config, "Multivariate Tests") {
        let labels: Vec<&str> = r["labels"].as_array().unwrap().iter().map(|v| v.as_str().unwrap()).collect();
        let (effect, stat) = (labels[0], labels[1]);
        let field = r["field"].as_str().unwrap();
        let entry = result.effects
            .iter()
            .find(|(k, _)| norm(k) == norm(effect))
            .and_then(|(_, m)| m.get(stat));
        let v = entry.map(|e| match field {
            "Value" => e.value,
            "F" => e.f,
            "Hypothesis df" => e.hypothesis_df,
            "Error df" => e.error_df,
            "Sig." => e.significance,
            "Partial Eta Squared" => e.partial_eta_squared,
            "Noncent. Parameter" => e.noncent_parameter,
            "Observed Power" => e.observed_power,
            other => panic!("field tak dikenal: {}", other),
        });
        cmp.check(&format!("{} {} / {} {}", config, effect, stat, field), v, r["value"].as_f64().unwrap(), SPSS_TOL);
    }
}

fn run(config_name: &str, csv: &str, spec: Spec) {
    let (data, config) = load(&format!("testing/glm-mv-reference/data/{}", csv), &spec);
    let result = calculate_multivariate_tests(&data, &config).expect("multivariate tests");
    let mut cmp = Comparison::default();
    compare_multivariate(&mut cmp, config_name, &result);
    cmp.finish(&format!("calculate_multivariate_tests {}", config_name));
}

#[test]
fn mv1_satu_populasi_test_values_sesuai_spss() {
    let mut spec = Spec::new(&["mpg", "disp", "hp", "wt"], &[]);
    spec.test_values = Some(vec![20.0, 200.0, 150.0, 3.0]);
    run("mv1", "hotelling 1 populasi.csv", spec);
}

#[test]
fn mv2_dua_populasi_sesuai_spss() {
    run("mv2", "hotelling 2 populasi independen.csv", Spec::new(&["x1", "x2", "x3", "x4"], &["jk"]));
}

#[test]
fn mv4_one_way_empat_statistik_sesuai_spss() {
    run("mv4", "one-way manova.csv", Spec::new(&["y1", "y2"], &["treatment"]));
}

#[test]
fn mv5_two_way_faktorial_penuh_sesuai_spss() {
    run("mv5", "two-way manova.csv", Spec::new(&["Y1A1", "Y2A1"], &["faktorA", "faktorB"]));
}

#[test]
fn mv6_two_way_tak_seimbang_sesuai_spss() {
    run("mv6", "two-way manova tak seimbang.csv", Spec::new(&["Y1A1", "Y2A1"], &["faktorA", "faktorB"]));
}

#[test]
fn mv9_tiga_dv_empat_level_sesuai_spss() {
    run("mv9", "one-way manova tiga dv empat level.csv", Spec::new(&["y1", "y2", "y3"], &["kelompok"]));
}

/// Wilks' Lambda Rao F dengan df galat pecahan (p = 3, df_h = 3): Sig.
/// dihitung dengan df pecahan 48.825..., bukan dibulatkan (v5).
/// Oracle R 4.3.2: testing/fitur-v5/results/b1-mv9-vs-r.txt (kolom R).
/// Sig. dengan df dibulatkan (perilaku v4) = 1.2213582779585508e-6, selisih
/// relatif 1,8%. Kriteria: kriteria R proyek (selisih mutlak < 1e-8) dan
/// selisih relatif Sig. < 1e-4 (membedakan df pecahan dari df dibulatkan).
/// Observed Power tidak dibandingkan dengan R: b1-mv9-vs-r.txt dibuat sebelum
/// commit 81921e12 (noncentrality Wilks mengikuti SPSS); power diuji terhadap
/// SPSS di mv9_tiga_dv_empat_level_sesuai_spss.
#[test]
fn mv9_wilks_df_pecahan_sesuai_r() {
    let (data, config) = load("testing/glm-mv-reference/data/one-way manova tiga dv empat level.csv", &Spec::new(&["y1", "y2", "y3"], &["kelompok"]));
    let result = calculate_multivariate_tests(&data, &config).unwrap();
    let w = &result.effects["kelompok"]["Wilks' Lambda"];
    let mut cmp = Comparison::default();
    cmp.check("Wilks value", Some(w.value), 0.12586225126490364, 1e-12);
    cmp.check("Wilks F", Some(w.f), 7.287943048070715, 1e-10);
    cmp.check("Wilks df1", Some(w.hypothesis_df), 9.0, 0.0);
    cmp.check("Wilks df2 pecahan", Some(w.error_df), 48.82535052622494, 1e-10);
    cmp.check("Wilks Sig.", Some(w.significance), 1.2436874258247529e-6, 1e-8);
    cmp.check("Wilks Sig. / R (relatif)", Some(w.significance / 1.2436874258247529e-6), 1.0, 1e-4);
    cmp.finish("Wilks df pecahan (mv9)");
}

/// Welch T² dua populasi (Krishnamoorthy–Yu 2004) pada data mv2.
/// Oracle R 4.3.2: testing/fitur-v4/r/welch_sig_r.csv baris "asli".
/// Kriteria R proyek: selisih mutlak < 1e-8; Sig. juga relatif < 1e-4
/// (Sig. dengan df dibulatkan, sig_bulat, berbeda 4,7%).
#[test]
fn welch_t2_dua_populasi_sesuai_r() {
    let mut spec = Spec::new(&["x1", "x2", "x3", "x4"], &["jk"]);
    spec.variance_mode = "Welch";
    let (data, config) = load("testing/glm-mv-reference/data/hotelling 2 populasi independen.csv", &spec);
    let result = calculate_multivariate_tests(&data, &config).unwrap();
    let r: Vec<Value> = {
        let text = super::wb_mv_support::read_text("testing/fitur-v4/r/welch_sig_r.csv");
        let line = text.lines().nth(1).unwrap().to_string();
        line.split("\",\"").skip(1).map(|s| Value::from(s.trim_matches('"').parse::<f64>().unwrap())).collect()
    };
    // Kolom: t_squared, nu, df1, df2, f, sig_fraksional, sig_bulat.
    let (t2, _nu, df1, df2, f, sig) = (r[0].as_f64().unwrap(), r[1].as_f64().unwrap(), r[2].as_f64().unwrap(),
                                      r[3].as_f64().unwrap(), r[4].as_f64().unwrap(), r[5].as_f64().unwrap());
    let h = &result.effects["jk"]["Hotelling's Trace"];
    let mut cmp = Comparison::default();
    cmp.check("Welch T²", Some(h.value), t2, 1e-8);
    cmp.check("Welch F", Some(h.f), f, 1e-8);
    cmp.check("Welch df1 = p", Some(h.hypothesis_df), df1, 0.0);
    cmp.check("Welch df2 = ν − p + 1", Some(h.error_df), df2, 1e-8);
    cmp.check("Welch Sig.", Some(h.significance), sig, 1e-8);
    cmp.check("Welch Sig. / R (relatif)", Some(h.significance / sig), 1.0, 1e-4);
    assert!(result.effects["jk"].get("Pillai's Trace").is_none(), "mode Welch hanya menghasilkan Hotelling's Trace");
    cmp.finish("Welch T² (mv2)");
}
