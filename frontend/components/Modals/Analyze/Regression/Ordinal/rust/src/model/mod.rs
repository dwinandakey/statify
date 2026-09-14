pub mod derivatives;
pub mod likelihood;
pub mod links;

use crate::links::inverse_link;
use crate::types::{PlumParameters, PlumSpec, ScaleType, Subpopulation};
use crate::utils::{clamp_prob, dot, safe_exp, EPS};

pub fn scale_sigma(z: &[f64], tau: &[f64], scale_type: ScaleType) -> f64 {
    match scale_type {
        ScaleType::Unity => 1.0,
        ScaleType::NonConstant => {
            let eta = dot(z, tau);
            let sigma = safe_exp(eta);
            if sigma.is_finite() && sigma > 0.0 { sigma } else { 1.0 }
        }
    }
}

pub fn linear_predictor(
    theta_j: f64,
    x: &[f64],
    beta: &[f64],
    z: &[f64],
    tau: &[f64],
    scale_type: ScaleType,
) -> f64 {
    let location = dot(x, beta);
    let sigma = scale_sigma(z, tau, scale_type);
    (theta_j - location) / sigma
}

pub fn cumulative_probabilities(
    params: &PlumParameters,
    subpop: &Subpopulation,
    spec: &PlumSpec,
) -> Vec<f64> {
    let mut cumulative = Vec::with_capacity(spec.threshold_count());
    for j in 0..spec.threshold_count() {
        let eta = linear_predictor(
            params.theta[j],
            &subpop.x,
            &params.beta,
            &subpop.z,
            &params.tau,
            spec.scale_type,
        );
        let mut gamma = inverse_link(eta, spec.link_function);
        gamma = clamp_prob(gamma);
        cumulative.push(gamma);
    }
    cumulative
}

pub fn cell_probabilities(cumulative: &[f64]) -> Vec<f64> {
    let raw = cell_probabilities_raw(cumulative);
    let sum: f64 = raw.iter().sum();
    if sum <= EPS {
        return raw;
    }
    raw.iter().map(|v| v / sum).collect()
}

pub fn cell_probabilities_raw(cumulative: &[f64]) -> Vec<f64> {
    if cumulative.is_empty() {
        return vec![1.0];
    }
    let j = cumulative.len() + 1;
    let mut pi = vec![0.0; j];
    pi[0] = clamp_prob(cumulative[0]);
    for idx in 1..cumulative.len() {
        let diff = cumulative[idx] - cumulative[idx - 1];
        pi[idx] = clamp_prob(diff);
    }
    pi[j - 1] = clamp_prob(1.0 - cumulative[cumulative.len() - 1]);
    pi
}
