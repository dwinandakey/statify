//! Basis path testing (McCabe) untuk parse_within_subject_factors (PWF) dan
//! calculate_mauchly_test (MAU). Flow graph, V(G), dan daftar jalur ada di
//! testing/whitebox/basis-path/basis_paths.py; setiap test di sini memakai
//! ID jalurnya. Jalur tak layak tidak punya test (alasannya dicatat di
//! basis_paths.py).
//!
//! Oracle: SPSS 27 (spss-values.json), R 4.3.2 yang divalidasi terhadap SPSS
//! (testing/whitebox/oracle/oracle-rm-mauchly.R/.json), atau spesifikasi
//! tertulis (format nama variabel, komentar kode). Tidak ada nilai harapan
//! yang diambil dari keluaran Statify.
use serde_json::{ json, Map, Value };

use super::wb_support::{ build_payload, read_csv, read_text, spss_rows, Comparison, Design, SPSS_TOL };
use crate::models::{ config::RepeatedMeasuresConfig, data::{ AnalysisData, DataValue }, result::MauchlyTest };
use crate::stats::core::{ calculate_mauchly_test, parse_within_subject_factors };
use crate::stats::rm_model::RmModel;

// ---- Pendukung -----------------------------------------------------------

fn config(def_factors: Option<&str>) -> RepeatedMeasuresConfig {
    let mut cfg: Value = serde_json::from_str(&read_text("testing/glm-rm-reference/harness/config-template.json")).unwrap();
    cfg["model"]["DefFactors"] = match def_factors {
        Some(d) => json!(d),
        None => Value::Null,
    };
    serde_json::from_value(cfg).unwrap()
}

fn data_with_defs(groups: &[&[&str]]) -> AnalysisData {
    let defs: Vec<Value> = groups
        .iter()
        .map(|g| json!(g.iter().enumerate().map(|(i, n)| json!({
            "id": i + 1, "columnIndex": i, "name": n, "type": "NUMERIC", "width": 8, "decimals": 2,
            "label": "", "values": [], "missing": [], "columns": 72, "align": "right", "measure": "scale", "role": "input"
        })).collect::<Vec<_>>()))
        .collect();
    serde_json::from_value(json!({
        "subject_data": [], "factors_data": [], "covariate_data": [],
        "subject_data_defs": defs, "factors_data_defs": [], "covariate_data_defs": []
    }))
    .unwrap()
}

fn gambar51() -> (AnalysisData, RepeatedMeasuresConfig) {
    build_payload(&read_csv("testing/glm-rm-reference/data/gambar51.csv"), &Design {
        factors: vec![("perlakuan", 4)],
        measures: vec![("anjing", vec!["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"])],
        between: vec![],
        options: json!({}),
        contrast: None,
    })
}

/// Data within-only dari matriks n x k (kolom x1..xk, measure "m", faktor "t").
fn within_only(rows: &[Vec<f64>]) -> (AnalysisData, RepeatedMeasuresConfig) {
    let k = rows[0].len();
    let cols: Vec<String> = (1..=k).map(|j| format!("x{}", j)).collect();
    let maps: Vec<Map<String, Value>> = rows
        .iter()
        .map(|r| cols.iter().cloned().zip(r.iter().map(|v| json!(v))).collect())
        .collect();
    let col_refs: Vec<&str> = cols.iter().map(|s| s.as_str()).collect();
    build_payload(&maps, &Design { factors: vec![("t", k)], measures: vec![("m", col_refs)], between: vec![], options: json!({}), contrast: None })
}

fn oracle_case(name: &str) -> Value {
    let v: Value = serde_json::from_str(&read_text("testing/whitebox/oracle/oracle-rm-mauchly.json")).unwrap();
    v["cases"][name].clone()
}

fn compare_to_spss(cmp: &mut Comparison, dataset: &str, m: &MauchlyTest) {
    for r in spss_rows(dataset, "mauchly") {
        let measure = r["measure"].as_str().unwrap();
        let field = r["field"].as_str().unwrap();
        let e = m.tests.get(measure);
        let v = e.map(|e| match field {
            "Mauchly's W" => e.mauchly_w,
            "Approx. Chi-Square" => e.chi_square,
            "df" => e.df as f64,
            "Sig." => e.significance,
            "Greenhouse-Geisser" => e.greenhouse_geisser_epsilon,
            "Huynh-Feldt" => e.huynh_feldt_epsilon,
            _ => e.lower_bound_epsilon,
        });
        cmp.check(&format!("{} {} {}", dataset, measure, field), v, r["value"].as_f64().unwrap(), SPSS_TOL);
    }
}

fn compare_to_r(cmp: &mut Comparison, label: &str, m: &MauchlyTest, measure: &str, case: &Value, fields: &[&str]) {
    let e = m.tests.get(measure);
    for f in fields {
        let v = e.map(|e| match *f {
            "w" => e.mauchly_w,
            "gg" => e.greenhouse_geisser_epsilon,
            "hf" => e.huynh_feldt_epsilon,
            _ => e.lower_bound_epsilon,
        });
        cmp.check(&format!("{} {}", label, f), v, case[*f].as_f64().unwrap(), SPSS_TOL);
    }
}

// ---- parse_within_subject_factors ---------------------------------------

#[test]
fn pwf_j2_tanpa_definisi() {
    let r = parse_within_subject_factors(&data_with_defs(&[]), &config(Some("waktu"))).unwrap();
    assert!(r.measures.is_empty());
}

#[test]
fn pwf_j3_grup_kosong() {
    let r = parse_within_subject_factors(&data_with_defs(&[&[]]), &config(Some("waktu"))).unwrap();
    assert!(r.measures.is_empty());
}

#[test]
fn pwf_j4_nama_tidak_cocok() {
    let r = parse_within_subject_factors(&data_with_defs(&[&["skor"]]), &config(Some("waktu"))).unwrap();
    assert!(r.measures.is_empty());
}

#[test]
fn pwf_j6_satu_level_bernama() {
    let r = parse_within_subject_factors(&data_with_defs(&[&["w1_(1,skor)"]]), &config(Some("waktu"))).unwrap();
    let f = &r.measures["skor"];
    assert_eq!(f.len(), 1);
    assert_eq!(f[0].dependent_variable, "w1_(1,skor)");
    assert_eq!(f[0].factor_values.len(), 1);
    assert_eq!(f[0].factor_values["waktu"], "1");
}

#[test]
fn pwf_j7_level_tanpa_nama() {
    let r = parse_within_subject_factors(&data_with_defs(&[&["w1_(1,2,skor)"]]), &config(Some("waktu"))).unwrap();
    let f = &r.measures["skor"][0].factor_values;
    assert_eq!(f.len(), 2);
    assert_eq!(f["waktu"], "1");
    assert_eq!(f["Factor2"], "2");
}

#[test]
fn pwf_j9_tanpa_def_factors() {
    let r = parse_within_subject_factors(&data_with_defs(&[&["w1_(1,skor)"]]), &config(None)).unwrap();
    let f = &r.measures["skor"][0].factor_values;
    assert_eq!(f.len(), 1);
    assert_eq!(f["Level1"], "1");
}

// ---- calculate_mauchly_test ---------------------------------------------

#[test]
fn mau_j01_dasar_gambar51() {
    let (data, cfg) = gambar51();
    let mut cmp = Comparison::default();
    compare_to_spss(&mut cmp, "gambar51", &calculate_mauchly_test(&data, &cfg).unwrap());
    cmp.finish("MAU-J01");
}

#[test]
fn mau_j03_tanpa_measure() {
    let (mut data, cfg) = gambar51();
    for (i, g) in data.subject_data_defs.iter_mut().enumerate() {
        g[0].name = format!("perlakuan{}", i + 1);
    }
    let m = calculate_mauchly_test(&data, &cfg).unwrap();
    assert!(m.tests.is_empty());
    assert!(m.design.is_none());
}

#[test]
fn mau_j04_satu_level() {
    let (data, cfg) = within_only(&[vec![1.0], vec![2.0], vec![4.0]]);
    let m = calculate_mauchly_test(&data, &cfg).unwrap();
    assert!(m.tests.is_empty());
}

#[test]
fn mau_j05_tanpa_subjek() {
    let (mut data, cfg) = gambar51();
    data.subject_data.clear();
    let m = calculate_mauchly_test(&data, &cfg).unwrap();
    assert!(m.tests.is_empty());
}

/// Record subjek 15 kosong: SPSS mengeluarkan subjek (listwise).
#[test]
fn mau_j07_record_kosong() {
    let (mut data, cfg) = gambar51();
    data.subject_data[14].clear();
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "MAU-J07", &calculate_mauchly_test(&data, &cfg).unwrap(), "anjing",
                 &oracle_case("listwise_tanpa_subjek15"), &["w", "gg", "hf", "lb"]);
    cmp.finish("MAU-J07");
}

#[test]
fn mau_j08_record_terpecah() {
    let (mut data, cfg) = gambar51();
    for group in data.subject_data.iter_mut() {
        let mut first = group[0].clone();
        let mut second = group[0].clone();
        first.values.retain(|k, _| k.starts_with("perlakuan1") || k.starts_with("perlakuan2"));
        second.values.retain(|k, _| k.starts_with("perlakuan3") || k.starts_with("perlakuan4"));
        *group = vec![first, second];
    }
    let mut cmp = Comparison::default();
    compare_to_spss(&mut cmp, "gambar51", &calculate_mauchly_test(&data, &cfg).unwrap());
    cmp.finish("MAU-J08");
}

/// perlakuan2 subjek 1 = null: SPSS mengeluarkan subjek (listwise).
#[test]
fn mau_j09_nilai_null() {
    let (mut data, cfg) = gambar51();
    *data.subject_data[0][0].values.get_mut("perlakuan2_(2,anjing)").unwrap() = DataValue::Null;
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "MAU-J09", &calculate_mauchly_test(&data, &cfg).unwrap(), "anjing",
                 &oracle_case("listwise_tanpa_subjek1"), &["w", "gg", "hf", "lb"]);
    cmp.finish("MAU-J09");
}

/// Uji tambahan (bukan anggota basis): kunci perlakuan4 subjek 15 tidak ada.
#[test]
fn mau_t1_kunci_tidak_ada() {
    let (mut data, cfg) = gambar51();
    data.subject_data[14][0].values.shift_remove("perlakuan4_(4,anjing)");
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "MAU-T1", &calculate_mauchly_test(&data, &cfg).unwrap(), "anjing",
                 &oracle_case("listwise_tanpa_subjek15"), &["w", "gg", "hf", "lb"]);
    cmp.finish("MAU-T1");
}

#[test]
fn mau_j12_satu_subjek() {
    let (mut data, cfg) = gambar51();
    data.subject_data.truncate(1);
    let m = calculate_mauchly_test(&data, &cfg).unwrap();
    assert!(m.tests.is_empty());
}

/// y_ij = a_i + b_j: S_t = 0. Konvensi terdokumentasi (rm_model.rs): matriks
/// singular -> W = 0; LB = 1/(k-1) selalu.
#[test]
fn mau_j18_st_nol() {
    let a = [0.0, 2.0, 4.0, 6.0, 8.0];
    let b = [1.0, 3.0, 4.0, 7.0];
    let rows: Vec<Vec<f64>> = a.iter().map(|ai| b.iter().map(|bj| ai + bj).collect()).collect();
    let (data, cfg) = within_only(&rows);
    let m = calculate_mauchly_test(&data, &cfg).unwrap();
    let e = &m.tests["m"];
    assert_eq!(e.mauchly_w, 0.0);
    assert!((e.lower_bound_epsilon - 1.0 / 3.0).abs() < 1e-15);
}

#[test]
fn mau_j19_kontras_singular() {
    let rows = vec![vec![2.0, 7.0, 5.0], vec![4.0, 9.0, 9.0], vec![7.0, 12.0, 6.0], vec![11.0, 16.0, 12.0]];
    let (data, cfg) = within_only(&rows);
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "MAU-J19", &calculate_mauchly_test(&data, &cfg).unwrap(), "m",
                 &oracle_case("kontras_singular"), &["w", "gg", "hf", "lb"]);
    cmp.finish("MAU-J19");
}

/// gambar51 x 1e-5: W, GG, HF invarian terhadap skala (SPSS gambar51 = R skala_1e_5).
#[test]
fn mau_j20_skala_kecil() {
    let rows: Vec<Map<String, Value>> = read_csv("testing/glm-rm-reference/data/gambar51.csv")
        .into_iter()
        .map(|r| r.into_iter().map(|(k, v)| (k, json!(v.as_f64().unwrap() * 1e-5))).collect())
        .collect();
    let (data, cfg) = build_payload(&rows, &Design {
        factors: vec![("perlakuan", 4)],
        measures: vec![("anjing", vec!["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"])],
        between: vec![], options: json!({}), contrast: None,
    });
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "MAU-J20", &calculate_mauchly_test(&data, &cfg).unwrap(), "anjing",
                 &oracle_case("skala_1e_5"), &["w", "gg", "hf", "lb"]);
    cmp.finish("MAU-J20");
}

#[test]
fn mau_j21_n_sama_k() {
    let rows = vec![vec![10.0, 12.0, 15.0, 11.0], vec![8.0, 11.0, 13.0, 14.0], vec![12.0, 12.0, 18.0, 13.0], vec![9.0, 14.0, 16.0, 12.0]];
    let (data, cfg) = within_only(&rows);
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "MAU-J21", &calculate_mauchly_test(&data, &cfg).unwrap(), "m",
                 &oracle_case("n_sama_k"), &["w", "gg", "hf", "lb"]);
    cmp.finish("MAU-J21");
}

#[test]
fn mau_j24_dua_measure() {
    let (data, cfg) = build_payload(&read_csv("testing/glm-rm-reference/data/rm_a.csv"), &Design {
        factors: vec![("waktu", 3)],
        measures: vec![("cemas", vec!["cemas1", "cemas2", "cemas3"]), ("stres", vec!["stres1", "stres2", "stres3"])],
        between: vec![], options: json!({}), contrast: None,
    });
    let m = calculate_mauchly_test(&data, &cfg).unwrap();
    assert_eq!(m.tests.len(), 2);
    assert_eq!(m.design.as_deref(), Some("waktu"));
    let mut cmp = Comparison::default();
    compare_to_spss(&mut cmp, "a", &m);
    cmp.finish("MAU-J24");
}

// ---- Uji yang sama pada RmModel (jalur produksi) --------------------------
// Ambang absolut `sum_sq < 1e-12 -> GG = 1` dan cabang `n <= k -> HF = GG`
// juga ada di RmModel::mauchly; dua test ini memeriksa jalur produksi
// dengan oracle yang sama.

#[test]
fn rm_model_epsilon_invarian_skala_1e_5() {
    let rows: Vec<Map<String, Value>> = read_csv("testing/glm-rm-reference/data/gambar51.csv")
        .into_iter()
        .map(|r| r.into_iter().map(|(k, v)| (k, json!(v.as_f64().unwrap() * 1e-5))).collect())
        .collect();
    let (data, cfg) = build_payload(&rows, &Design {
        factors: vec![("perlakuan", 4)],
        measures: vec![("anjing", vec!["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"])],
        between: vec![], options: json!({}), contrast: None,
    });
    let (m, _) = RmModel::build(&data, &cfg).unwrap().mauchly().unwrap();
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "RmModel skala 1e-5", &m, "anjing", &oracle_case("skala_1e_5"), &["w", "gg", "hf", "lb"]);
    cmp.finish("RmModel skala 1e-5");
}

#[test]
fn rm_model_hf_n_sama_k() {
    let rows = vec![vec![10.0, 12.0, 15.0, 11.0], vec![8.0, 11.0, 13.0, 14.0], vec![12.0, 12.0, 18.0, 13.0], vec![9.0, 14.0, 16.0, 12.0]];
    let (data, cfg) = within_only(&rows);
    let (m, _) = RmModel::build(&data, &cfg).unwrap().mauchly().unwrap();
    let mut cmp = Comparison::default();
    compare_to_r(&mut cmp, "RmModel n = k", &m, "m", &oracle_case("n_sama_k"), &["w", "gg", "hf", "lb"]);
    cmp.finish("RmModel n = k");
}
