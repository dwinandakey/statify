use statify_ordinal::{link, inverse_link, LinkFunction};

fn approx_equal(a: f64, b: f64, tol: f64) -> bool {
    (a - b).abs() < tol
}

#[test]
fn link_inverse_roundtrip() {
    let probs = [0.1, 0.5, 0.9];
    let links = [
        LinkFunction::Logit,
        LinkFunction::Probit,
        LinkFunction::ComplementaryLogLog,
        LinkFunction::NegativeLogLog,
        LinkFunction::Cauchit,
    ];

    for link_fn in links {
        for p in probs {
            let eta = link(p, link_fn);
            let p_back = inverse_link(eta, link_fn);
            assert!(approx_equal(p, p_back, 1e-6));
        }
    }
}
