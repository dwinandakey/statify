//! Test white-box untuk fungsi privat wasm/constructor.rs; disertakan di akhir
//! berkas itu dengan `#[cfg(test)] #[path = ...] mod wb_internal;`, sehingga
//! tidak ikut dikompilasi ke WASM.
//!
//! - known_matrix: basis path (KM-J01..KM-J10, testing/whitebox/basis-path/).
//! - calculate_known_covariance_test: uji khi-kuadrat Σ diketahui terhadap
//!   R 4.3.2 (testing/final/bagian1/known-sigma-r.csv, kolom "r"; masukan
//!   Σ, μ₀, α, desain dari known-sigma-statify.json, tanpa memakai
//!   keluaran Statify di berkas itu).
use serde_json::{ json, Map, Value };

use super::*;
use crate::test::wb_mv_support::{ data, config, read_csv_complete, read_text, Comparison, Spec };

fn rows(v: &[&[f64]]) -> Vec<Vec<f64>> {
    v.iter().map(|r| r.to_vec()).collect()
}

fn err(r: Result<DMatrix<f64>, String>) -> String {
    r.expect_err("seharusnya Err")
}

// ---- known_matrix: basis path --------------------------------------------

#[test]
fn km_j01_tidak_ada() {
    assert!(err(known_matrix(None, 2, "Σ")).contains("is missing"));
}

#[test]
fn km_j02_jumlah_baris() {
    let m = rows(&[&[1.0, 0.0], &[0.0, 1.0], &[0.0, 0.0]]);
    assert!(err(known_matrix(Some(&m), 2, "Σ")).contains("must be 2 × 2"));
}

#[test]
fn km_j03_panjang_baris() {
    let m = rows(&[&[1.0, 0.0], &[1.0]]);
    assert!(err(known_matrix(Some(&m), 2, "Σ")).contains("must be 2 × 2"));
}

#[test]
fn km_j04_nan() {
    let m = rows(&[&[1.0, f64::NAN], &[f64::NAN, 1.0]]);
    assert!(err(known_matrix(Some(&m), 2, "Σ")).contains("every entry must be a number"));
}

#[test]
fn km_j05_diagonal() {
    let m = rows(&[&[0.0, 0.0], &[0.0, 1.0]]);
    assert!(err(known_matrix(Some(&m), 2, "Σ")).contains("diagonal entries (variances) must be greater than 0"));
}

#[test]
fn km_j06_p_nol() {
    let m: Vec<Vec<f64>> = vec![];
    let ok = known_matrix(Some(&m), 0, "Σ").expect("0 x 0 tidak melanggar syarat apa pun");
    assert_eq!(ok.shape(), (0, 0));
}

#[test]
fn km_j07_p_satu() {
    let m = rows(&[&[4.0]]);
    assert_eq!(known_matrix(Some(&m), 1, "Σ").unwrap()[(0, 0)], 4.0);
}

#[test]
fn km_j08_tidak_simetris() {
    let m = rows(&[&[2.0, 1.0], &[0.5, 2.0]]);
    assert!(err(known_matrix(Some(&m), 2, "Σ")).contains("must be symmetric"));
}

/// [[1, 2], [2, 1]]: nilai eigen 3 dan -1 (R: eigen(matrix(c(1,2,2,1),2))).
#[test]
fn km_j09_tidak_definit_positif() {
    let m = rows(&[&[1.0, 2.0], &[2.0, 1.0]]);
    assert!(err(known_matrix(Some(&m), 2, "Σ")).contains("is not positive definite"));
}

/// Σ_A kasus K1 (definit positif; dipakai R pada known-sigma.R).
#[test]
fn km_j10_sigma_a() {
    let m = rows(&[&[36.0, -630.0, -320.0, -5.0], &[-630.0, 15000.0, 6700.0, 107.0], &[-320.0, 6700.0, 4700.0, 44.0], &[-5.0, 107.0, 44.0, 1.0]]);
    let ok = known_matrix(Some(&m), 4, "Σ").unwrap();
    assert_eq!(ok[(1, 2)], 6700.0);
    assert_eq!(ok[(3, 0)], -5.0);
}

// ---- Uji khi-kuadrat Σ diketahui vs R ------------------------------------

fn r_oracle(case: &str) -> Vec<(String, f64)> {
    read_text("testing/final/bagian1/known-sigma-r.csv")
        .lines()
        .skip(1)
        .map(|l| l.split(',').map(|s| s.trim_matches('"').to_string()).collect::<Vec<_>>())
        .filter(|c| c[0] == case)
        .map(|c| (c[1].clone(), c[2].parse::<f64>().unwrap()))
        .collect()
}

fn case_input(id: &str) -> Value {
    let all: Vec<Value> = serde_json::from_str(&read_text("testing/final/bagian1/known-sigma-statify.json")).unwrap();
    let c = all.into_iter().find(|c| c["id"] == id).unwrap();
    // Hanya masukan kasus; keluaran Statify ("statify", "t2_...") tidak dipakai.
    json!({ "design": c["design"], "sigma": c["sigma"], "sigma1": c["sigma1"], "sigma2": c["sigma2"],
            "mu0": c["mu0"], "alpha": c["alpha"], "csv": c["csv"], "dep": c["dep"], "factor": c["factor"], "pairs": c["pairs"] })
}

fn run_case(id: &str) {
    let c = case_input(id);
    let csv = format!("testing/glm-mv-reference/data/{}", c["csv"].as_str().unwrap());
    let factor: Vec<String> = c["factor"].as_str().map(|f| vec![f.to_string()]).unwrap_or_default();
    let (dep, rows): (Vec<String>, Vec<Map<String, Value>>) = if let Some(pairs) = c["pairs"].as_array() {
        // Berpasangan: d = v1 - v2 per baris (paired-difference.ts), lalu uji satu populasi.
        let pairs: Vec<(String, String)> = pairs.iter().map(|p| (p[0].as_str().unwrap().to_string(), p[1].as_str().unwrap().to_string())).collect();
        let vars: Vec<&str> = pairs.iter().flat_map(|(a, b)| [a.as_str(), b.as_str()]).collect();
        let names: Vec<String> = (1..=pairs.len()).map(|i| format!("d{}", i)).collect();
        let rows = read_csv_complete(&csv, &vars)
            .into_iter()
            .map(|r| names.iter().zip(&pairs).map(|(n, (a, b))| (n.clone(), json!(r[a].as_f64().unwrap() - r[b].as_f64().unwrap()))).collect())
            .collect();
        (names, rows)
    } else {
        let dep: Vec<String> = c["dep"].as_array().unwrap().iter().map(|v| v.as_str().unwrap().to_string()).collect();
        let vars: Vec<&str> = dep.iter().chain(factor.iter()).map(|s| s.as_str()).collect();
        let rows = read_csv_complete(&csv, &vars);
        (dep, rows)
    };
    let dep_refs: Vec<&str> = dep.iter().map(|s| s.as_str()).collect();
    let fac_refs: Vec<&str> = factor.iter().map(|s| s.as_str()).collect();
    let mut spec = Spec::new(&dep_refs, &fac_refs);
    spec.sig_level = c["alpha"].as_f64().unwrap();
    if c["design"] == "one_sample" {
        spec.test_values = Some(c["mu0"].as_array().unwrap().iter().map(|v| v.as_f64().unwrap()).collect());
    }
    let known: KnownCovarianceInput = serde_json::from_value(json!({
        "design": c["design"], "sigma": c["sigma"], "sigma1": c["sigma1"], "sigma2": c["sigma2"]
    }))
    .unwrap();
    let t = calculate_known_covariance_test(&data(&rows, &spec), &config(&spec), &known).expect("uji Σ diketahui");

    let mut cmp = Comparison::default();
    for (key, r) in r_oracle(id) {
        let i = key.trim_start_matches(|ch: char| ch.is_alphabetic()).parse::<usize>().ok().map(|k| k - 1);
        let iv = i.map(|k| &t.intervals[k]);
        let v = match key.trim_end_matches(|ch: char| ch.is_ascii_digit()) {
            "chi" => t.chi_square,
            "sig" => t.significance,
            "crit" => t.chi_square_critical,
            "z" => t.z_critical,
            "est" => iv.unwrap().estimate,
            "se" => iv.unwrap().std_error,
            "chiL" => iv.unwrap().chi_square_lower,
            "chiU" => iv.unwrap().chi_square_upper,
            "bonL" => iv.unwrap().bonferroni_lower,
            "bonU" => iv.unwrap().bonferroni_upper,
            other => panic!("kunci oracle tak dikenal: {}", other),
        };
        // Kriteria validasi R proyek ini: selisih mutlak < 1e-8.
        cmp.check(&format!("{} {}", id, key), Some(v), r, 1e-8);
    }
    assert_eq!(t.df, dep.len() as f64);
    cmp.finish(&format!("Σ diketahui {}", id));
}

#[test]
fn known_sigma_k1_satu_populasi_sesuai_r() {
    run_case("K1");
}

#[test]
fn known_sigma_k1_alpha_010_sesuai_r() {
    run_case("K1-a10");
}

#[test]
fn known_sigma_k2_dua_populasi_sigma_sama_sesuai_r() {
    run_case("K2");
}

#[test]
fn known_sigma_k3_dua_populasi_sigma_berbeda_sesuai_r() {
    run_case("K3");
}

#[test]
fn known_sigma_k4_berpasangan_sesuai_r() {
    run_case("K4-0");
}
