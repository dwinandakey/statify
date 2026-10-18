//! Test white-box untuk fungsi privat stats/multivariate_tests.rs; disertakan
//! di akhir berkas itu dengan `#[cfg(test)] #[path = ...] mod wb_internal;`,
//! sehingga tidak ikut dikompilasi ke WASM.
//!
//! test_df: basis path TDF-J1 dan TDF-J2 (testing/whitebox/basis-path/).
use super::*;

/// TDF-J1: df bulat (dalam 1e-9) dibulatkan, minimal 1.
/// Oracle: SPSS mv4 treatment Pillai Hypothesis df = 4; batas df = 0 -> 1
/// sesuai spesifikasi (komentar v5: "rounded, at least 1").
#[test]
fn tdf_j1_df_bulat() {
    assert_eq!(test_df(4.0), 4.0);
    assert_eq!(test_df(4.0 + 1e-10), 4.0);
    assert_eq!(test_df(0.0), 1.0);
}

/// TDF-J2: df pecahan tidak dibulatkan.
/// Oracle: SPSS mv9 kelompok Wilks' Lambda Error df = 48.82535052622494.
#[test]
fn tdf_j2_df_pecahan() {
    assert_eq!(test_df(48.82535052622494), 48.82535052622494);
    assert_eq!(test_df(4.0 + 1e-8), 4.0 + 1e-8);
}
