//! Parity check of `calculate_vif` against R's `car::vif()` on a real
//! `glm(family = binomial)` fit.
//!
//! Data: IBM HR Analytics Employee Attrition (N = 1470), columns kept in
//! `fixtures/hr_attrition_vif.csv`. R reference model:
//!
//!   glm(Attrition_Num ~ Age + BusinessTravel + DistanceFromHome +
//!         MaritalStatus + MonthlyIncome + MonthlyRate + OverTime +
//!         TotalWorkingYears + YearsAtCompany, family = binomial)
//!   vif(model)            # GVIF, Df, GVIF^(1/(2*Df))
//!   Tolerance = 1 / GVIF
//!
//! The expected numbers below are exactly what R printed (3 decimals).
//!
//! Why this needs its own test: `vcov(glm)` is evaluated with the IRLS
//! weights of the iterate *before* glm.fit's last coefficient update, and
//! glm.fit stops as soon as |dev - devold| / (|dev| + 0.1) < 1e-8. For this
//! dataset that is iteration 5, so R's GVIF differs from the fully converged
//! GVIF by ~1e-4 - enough to flip the 3rd printed decimal of Age,
//! TotalWorkingYears and YearsAtCompany (1.736 vs 1.737, 3.373 vs 3.374,
//! 1.571 vs 1.572). `calculate_vif` therefore reproduces glm.fit's iteration
//! instead of iterating to full convergence.

use nalgebra::{DMatrix, DVector};
use statify_logistic::stats::assumptions::calculate_vif;

const CSV: &str = include_str!("fixtures/hr_attrition_vif.csv");

/// (variable, Tolerance, GVIF, Df, GVIF^(1/(2*Df))) as printed by R.
const R_REFERENCE: [(&str, &str, &str, usize, &str); 9] = [
    ("Age", "0.576", "1.737", 1, "1.318"),
    ("BusinessTravel", "0.979", "1.021", 2, "1.005"),
    ("DistanceFromHome", "0.971", "1.029", 1, "1.015"),
    ("MaritalStatus", "0.963", "1.038", 2, "1.009"),
    ("MonthlyIncome", "0.515", "1.942", 1, "1.394"),
    ("MonthlyRate", "0.986", "1.014", 1, "1.007"),
    ("OverTime", "0.966", "1.035", 1, "1.017"),
    ("TotalWorkingYears", "0.296", "3.374", 1, "1.837"),
    ("YearsAtCompany", "0.636", "1.572", 1, "1.254"),
];

/// Builds the fully expanded design matrix (no intercept column - that is
/// added inside `calculate_vif`) plus the term -> column grouping, in the
/// same order as the R formula. Dummy columns use the first alphabetical
/// level as reference like R's treatment contrasts; GVIF does not depend on
/// that choice.
fn load_hr_attrition() -> (DMatrix<f64>, DVector<f64>, Vec<(String, Vec<usize>)>) {
    let mut y = Vec::new();
    let mut rows: Vec<Vec<f64>> = Vec::new();

    for line in CSV.lines().skip(1).filter(|l| !l.trim().is_empty()) {
        let f: Vec<&str> = line.split(',').collect();
        assert_eq!(f.len(), 10, "malformed fixture row: {line}");

        y.push(if f[0] == "Yes" { 1.0 } else { 0.0 });

        let num = |i: usize| f[i].parse::<f64>().expect("numeric fixture field");
        let is = |i: usize, level: &str| if f[i] == level { 1.0 } else { 0.0 };

        rows.push(vec![
            num(1),                          // Age
            is(2, "Travel_Frequently"),      // BusinessTravel (ref Non-Travel)
            is(2, "Travel_Rarely"),
            num(3),                          // DistanceFromHome
            is(4, "Married"),                // MaritalStatus (ref Divorced)
            is(4, "Single"),
            num(5),                          // MonthlyIncome
            num(6),                          // MonthlyRate
            is(7, "Yes"),                    // OverTime (ref No)
            num(8),                          // TotalWorkingYears
            num(9),                          // YearsAtCompany
        ]);
    }

    let n = rows.len();
    assert_eq!(n, 1470, "fixture should hold the full 1470-row dataset");
    let flat: Vec<f64> = rows.into_iter().flatten().collect();
    let x = DMatrix::from_row_slice(n, 11, &flat);

    let groups = vec![
        ("Age".to_string(), vec![0]),
        ("BusinessTravel".to_string(), vec![1, 2]),
        ("DistanceFromHome".to_string(), vec![3]),
        ("MaritalStatus".to_string(), vec![4, 5]),
        ("MonthlyIncome".to_string(), vec![6]),
        ("MonthlyRate".to_string(), vec![7]),
        ("OverTime".to_string(), vec![8]),
        ("TotalWorkingYears".to_string(), vec![9]),
        ("YearsAtCompany".to_string(), vec![10]),
    ];

    (x, DVector::from_vec(y), groups)
}

#[test]
fn vif_table_matches_r_car_vif_to_three_decimals() {
    let (x, y, groups) = load_hr_attrition();
    let result = calculate_vif(&x, &y, &groups).expect("calculate_vif should succeed");
    assert_eq!(result.len(), R_REFERENCE.len());

    let mut mismatches = Vec::new();
    for (row, (name, tol, gvif, df, adj)) in result.iter().zip(R_REFERENCE.iter()) {
        assert_eq!(row.variable, *name, "term order must follow the formula");
        assert_eq!(row.df, *df, "{name}: Df");
        assert!(row.is_gvif, "{name}: table has 3-level terms, so GVIF^(1/2Df) is the display scale");

        let got = (
            format!("{:.3}", row.tolerance),
            format!("{:.3}", row.gvif),
            format!("{:.3}", row.vif),
        );
        if got.0 != *tol || got.1 != *gvif || got.2 != *adj {
            mismatches.push(format!(
                "{name}: Statify (tol {}, GVIF {}, adj {}) vs R (tol {tol}, GVIF {gvif}, adj {adj}) \
                 [raw GVIF = {:.6}]",
                got.0, got.1, got.2, row.gvif
            ));
        }
    }

    assert!(
        mismatches.is_empty(),
        "VIF table differs from R's car::vif():\n  {}",
        mismatches.join("\n  ")
    );
}

#[test]
fn raw_gvif_follows_glm_fit_iteration_rather_than_full_convergence() {
    // Age / TotalWorkingYears / YearsAtCompany are the three terms whose 3rd
    // decimal is decided by glm.fit stopping after 5 iterations.
    //   r_default : GVIF from glm.fit's default 5-iteration fit; rounds to the
    //               1.737 / 3.374 / 1.572 that R prints.
    //   converged : GVIF at the fully converged MLE; rounds to 1.736 / 3.373 /
    //               1.571 (what Statify printed before the glm.fit emulation,
    //               and what R prints with glm.control(epsilon = 1e-10)).
    // Pinning the raw numbers explains a regression by the value itself, not
    // just a flipped last digit.
    let cases = [
        ("Age", 1.736552, 1.736488),
        ("TotalWorkingYears", 3.373771, 3.373493),
        ("YearsAtCompany", 1.571510, 1.571457),
    ];

    let (x, y, groups) = load_hr_attrition();
    let result = calculate_vif(&x, &y, &groups).unwrap();
    let raw = |name: &str| result.iter().find(|r| r.variable == name).unwrap().gvif;

    for (name, r_default, converged) in cases {
        let got = raw(name);
        assert!(
            (got - r_default).abs() < 2e-6,
            "{name}: GVIF {got:.7} should follow glm.fit's 5-iteration vcov ({r_default:.6})"
        );
        assert!(
            (got - converged).abs() > 2e-5,
            "{name}: GVIF {got:.7} collapsed onto the fully converged value ({converged:.6})"
        );
    }
}
