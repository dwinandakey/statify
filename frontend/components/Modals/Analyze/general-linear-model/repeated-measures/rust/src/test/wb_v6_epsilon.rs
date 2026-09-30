//! Test perbaikan v6 (temuan T1 dan T2) pada RmModel (jalur produksi).
//!
//! Oracle: keluaran SPSS 27 testing/whitebox/spss-tertunda/wb_rm_konfirmasi.xlsx
//! (diekstrak ke wb_rm_konfirmasi-values.json oleh ekstrak_konfirmasi.R) dan
//! nilai SPSS 27 dataset gambar51/b di spss-values.json.
//! Kriteria: |Statify - SPSS| <= 0,001; untuk SS dan Mean Square data yang
//! dikali 1e-5 (orde 1e-5) dipakai selisih relatif <= 1e-6, karena kriteria
//! mutlak 0,001 tidak bermakna pada besaran sekecil itu.
use serde_json::{ json, Map, Value };

use super::wb_support::{ build_payload, read_csv, read_text, spss_rows, Comparison, Design, SPSS_TOL };
use crate::models::result::{ MauchlyTest, TestsWithinSubjectsEffects };
use crate::stats::rm_model::RmModel;

fn gambar51_design() -> Design<'static> {
    Design {
        factors: vec![("perlakuan", 4)],
        measures: vec![("anjing", vec!["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"])],
        between: vec![],
        options: json!({}),
        contrast: None,
    }
}

fn dataset_b_design() -> Design<'static> {
    Design {
        factors: vec![("waktu", 4)],
        measures: vec![("skor", vec!["w1", "w2", "w3", "w4"])],
        between: vec!["kelompok"],
        options: json!({ "DescStats": true, "EstEffectSize": true, "ObsPower": true }),
        contrast: None,
    }
}

/// Baris CSV dengan kolom `cols` dikalikan `c` (kolom lain tetap).
fn scaled(rel: &str, cols: &[&str], c: f64) -> Vec<Map<String, Value>> {
    read_csv(rel)
        .into_iter()
        .map(|r| r.into_iter().map(|(k, v)| {
            let v = if cols.contains(&k.as_str()) { json!(v.as_f64().unwrap() * c) } else { v };
            (k, v)
        }).collect())
        .collect()
}

fn run(rows: &[Map<String, Value>], design: &Design) -> (MauchlyTest, TestsWithinSubjectsEffects) {
    let (data, cfg) = build_payload(rows, design);
    let model = RmModel::build(&data, &cfg).expect("RmModel");
    let (mauchly, _) = model.mauchly().expect("mauchly");
    let within = model.within_effects(&mauchly);
    (mauchly, within)
}

fn konfirmasi(dataset: &str) -> Vec<Value> {
    let all: Vec<Value> = serde_json::from_str(&read_text("testing/whitebox/spss-tertunda/wb_rm_konfirmasi-values.json")).unwrap();
    all.into_iter().filter(|r| r["dataset"] == dataset).collect()
}

/// Bandingkan Mauchly (measure `measure`) dan within-effects dengan baris SPSS.
fn compare(cmp: &mut Comparison, label: &str, rows: &[Value], measure: &str, m: &MauchlyTest, w: &TestsWithinSubjectsEffects, relative_ss: bool) {
    let e = &m.tests[measure];
    for r in rows {
        let field = r["field"].as_str().unwrap();
        let expected = r["value"].as_f64().unwrap();
        let (value, tol) = if r["table"] == "mauchly" {
            let v = match field {
                "Mauchly's W" => e.mauchly_w,
                "Approx. Chi-Square" => e.chi_square,
                "df" => e.df as f64,
                "Sig." => e.significance,
                "Greenhouse-Geisser" => e.greenhouse_geisser_epsilon,
                "Huynh-Feldt" => e.huynh_feldt_epsilon,
                _ => e.lower_bound_epsilon,
            };
            (Some(v), SPSS_TOL)
        } else {
            let source = r["source"].as_str().unwrap();
            let correction = r["correction"].as_str().unwrap();
            let s = w.measures[measure].sources.iter().find(|s| s.source == source && s.assumption_type == correction);
            let v = s.map(|s| match field {
                "SS" => s.sum_of_squares,
                "df" => s.df,
                "Mean Square" => s.mean_square,
                "F" => s.f,
                _ => s.significance,
            });
            let tol = if relative_ss && (field == "SS" || field == "Mean Square") { 1e-6 * expected.abs() } else { SPSS_TOL };
            (v, tol)
        };
        cmp.check(&format!("{} {} {} {} {}", label, r["table"], r["source"], r["correction"], field), value, expected, tol);
    }
}

// ---- T1: epsilon tidak bergantung pada skala data ------------------------

/// Gambar 51 x 1e-5 terhadap SPSS 27 (39 nilai: Mauchly + Tests of
/// Within-Subjects Effects). Sebelum v6: GG = HF = 1.
#[test]
fn v6_t1_skala_1e_5_sesuai_spss() {
    let rows = scaled("testing/glm-rm-reference/data/gambar51.csv", &["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"], 1e-5);
    let (m, w) = run(&rows, &gambar51_design());
    let mut cmp = Comparison::default();
    compare(&mut cmp, "gambar51 x 1e-5", &konfirmasi("gambar51_skala_1e-5"), "anjing", &m, &w, true);
    cmp.finish("v6 T1 skala 1e-5 vs SPSS");
}

/// Epsilon, W, chi-kuadrat dan Sig. Mauchly sama pada data x 1e-5, x 1 dan
/// x 1e5 (within-only Gambar 51 dan campuran b), dan sama dengan SPSS 27
/// data asli.
#[test]
fn v6_t1_epsilon_sama_pada_skala_1e_5_1_1e5() {
    let cases: [(&str, &str, &[&str], Design); 2] = [
        ("gambar51", "testing/glm-rm-reference/data/gambar51.csv", &["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"], gambar51_design()),
        ("b", "testing/glm-rm-reference/data/rm_b.csv", &["w1", "w2", "w3", "w4"], dataset_b_design()),
    ];
    let mut cmp = Comparison::default();
    for (dataset, csv, cols, design) in cases.iter() {
        let spss = spss_rows(dataset, "mauchly");
        let mut reference: Option<[f64; 6]> = None;
        for c in [1e-5, 1.0, 1e5] {
            let (m, _) = run(&scaled(csv, cols, c), design);
            let (measure, e) = m.tests.iter().next().unwrap();
            let got = [e.mauchly_w, e.chi_square, e.significance, e.greenhouse_geisser_epsilon, e.huynh_feldt_epsilon, e.lower_bound_epsilon];
            for r in spss.iter().filter(|r| r["measure"] == measure.as_str()) {
                let i = match r["field"].as_str().unwrap() {
                    "Mauchly's W" => 0, "Approx. Chi-Square" => 1, "Sig." => 2,
                    "Greenhouse-Geisser" => 3, "Huynh-Feldt" => 4, "Lower-bound" => 5, _ => continue,
                };
                cmp.check(&format!("{} x {:e} {}", dataset, c, r["field"]), Some(got[i]), r["value"].as_f64().unwrap(), SPSS_TOL);
            }
            // Antar-skala: identik sampai pembulatan (selisih relatif <= 1e-9).
            match reference {
                None => reference = Some(got),
                Some(base) => for (i, name) in ["W", "chi", "Sig.", "GG", "HF", "LB"].iter().enumerate() {
                    cmp.check(&format!("{} x {:e} {} = x 1e-5", dataset, c, name), Some(got[i]), base[i], 1e-9 * base[i].abs().max(1e-300));
                },
            }
        }
    }
    cmp.finish("v6 T1 invarian skala");
}

// ---- T2: Huynh-Feldt pada n = k ------------------------------------------

/// n = k = 4 terhadap SPSS 27 (39 nilai). Sebelum v6: HF = GG = .6520;
/// SPSS: HF = 1, df HF = 3 dan 9.
#[test]
fn v6_t2_n_sama_k_sesuai_spss() {
    let rows = read_csv("testing/whitebox/spss-tertunda/n_sama_k.csv");
    let (m, w) = run(&rows, &Design {
        factors: vec![("t", 4)],
        measures: vec![("m", vec!["x1", "x2", "x3", "x4"])],
        between: vec![],
        options: json!({}),
        contrast: None,
    });
    // SPSS menamai measure MEASURE_1 dan faktor t; Statify memakai nama measure "m".
    let mut cmp = Comparison::default();
    compare(&mut cmp, "n = k", &konfirmasi("n_sama_k"), "m", &m, &w, false);
    cmp.finish("v6 T2 n = k vs SPSS");
}

// ---- Perilaku yang dipertahankan -------------------------------------------

/// S_t = 0 (y_ij = a_i + b_j): epsilon tetap 1 (perilaku sebelum v6), juga
/// setelah data dikali 1e-5 dan 1e5.
#[test]
fn v6_st_nol_epsilon_tetap_1() {
    for c in [1e-5, 1.0, 1e5] {
        let a = [0.0, 2.0, 4.0, 6.0, 8.0];
        let b = [1.0, 3.0, 4.0, 7.0];
        let rows: Vec<Map<String, Value>> = a
            .iter()
            .map(|ai| (1..=4).map(|j| (format!("x{}", j), json!((ai + b[j - 1]) * c))).collect())
            .collect();
        let (m, _) = run(&rows, &Design {
            factors: vec![("t", 4)],
            measures: vec![("m", vec!["x1", "x2", "x3", "x4"])],
            between: vec![],
            options: json!({}),
            contrast: None,
        });
        let e = &m.tests["m"];
        assert_eq!(e.greenhouse_geisser_epsilon, 1.0, "GG x {:e}", c);
        assert_eq!(e.huynh_feldt_epsilon, 1.0, "HF x {:e}", c);
        assert!((e.lower_bound_epsilon - 1.0 / 3.0).abs() < 1e-15);
    }
}
