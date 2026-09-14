use statrs::distribution::{ContinuousCDF, Normal};

use crate::types::LinkFunction;
use crate::utils::{clamp_prob, safe_exp};

pub fn link(p: f64, link: LinkFunction) -> f64 {
    let p = clamp_prob(p);
    match link {
        LinkFunction::Logit => (p / (1.0 - p)).ln(),
        LinkFunction::Probit => normal_inverse(p),
        LinkFunction::ComplementaryLogLog => (-(1.0 - p).ln()).ln(),
        LinkFunction::NegativeLogLog => -(-p.ln()).ln(),
        LinkFunction::Cauchit => (std::f64::consts::PI * (p - 0.5)).tan(),
    }
}

pub fn inverse_link(eta: f64, link: LinkFunction) -> f64 {
    match link {
        LinkFunction::Logit => stable_logistic(eta),
        LinkFunction::Probit => normal_cdf(eta),
        LinkFunction::ComplementaryLogLog => 1.0 - safe_exp(-safe_exp(eta)),
        LinkFunction::NegativeLogLog => safe_exp(-safe_exp(-eta)),
        LinkFunction::Cauchit => 0.5 + eta.atan() / std::f64::consts::PI,
    }
}

pub fn d_inverse_link(eta: f64, link: LinkFunction) -> f64 {
    match link {
        LinkFunction::Logit => {
            let p = stable_logistic(eta);
            p * (1.0 - p)
        }
        LinkFunction::Probit => normal_pdf(eta),
        LinkFunction::ComplementaryLogLog => {
            let t = safe_exp(eta);
            t * safe_exp(-t)
        }
        LinkFunction::NegativeLogLog => {
            let t = safe_exp(-eta);
            safe_exp(-t) * t
        }
        LinkFunction::Cauchit => 1.0 / (std::f64::consts::PI * (1.0 + eta * eta)),
    }
}

pub fn d2_inverse_link(eta: f64, link: LinkFunction) -> f64 {
    match link {
        LinkFunction::Logit => {
            let p = stable_logistic(eta);
            let d = p * (1.0 - p);
            d * (1.0 - 2.0 * p)
        }
        LinkFunction::Probit => -eta * normal_pdf(eta),
        LinkFunction::ComplementaryLogLog => {
            let t = safe_exp(eta);
            let d = t * safe_exp(-t);
            d * (1.0 - t)
        }
        LinkFunction::NegativeLogLog => {
            let t = safe_exp(-eta);
            let d = safe_exp(-t) * t;
            d * (t - 1.0)
        }
        LinkFunction::Cauchit => {
            let denom = 1.0 + eta * eta;
            -2.0 * eta / (std::f64::consts::PI * denom * denom)
        }
    }
}

fn stable_logistic(eta: f64) -> f64 {
    if eta >= 0.0 {
        1.0 / (1.0 + safe_exp(-eta))
    } else {
        let e = safe_exp(eta);
        e / (1.0 + e)
    }
}

fn normal_cdf(x: f64) -> f64 {
    let normal = Normal::new(0.0, 1.0).unwrap();
    normal.cdf(x)
}

fn normal_inverse(p: f64) -> f64 {
    let normal = Normal::new(0.0, 1.0).unwrap();
    normal.inverse_cdf(p)
}

fn normal_pdf(x: f64) -> f64 {
    let coeff = (2.0 * std::f64::consts::PI).sqrt();
    safe_exp(-0.5 * x * x) / coeff
}
