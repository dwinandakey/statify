use nalgebra::{DMatrix, DVector};

use crate::links::d_inverse_link;
use crate::model::{cell_probabilities_raw, cumulative_probabilities, linear_predictor, scale_sigma};
use crate::types::{AggregatedData, PlumParameters, PlumSpec, ScaleType};
use crate::utils::{max_abs_vector, EPS};

pub fn gradient(params: &PlumParameters, data: &AggregatedData, spec: &PlumSpec) -> DVector<f64> {
    let k = spec.parameter_count();
    let mut grad = DVector::zeros(k);
    let t = spec.threshold_count();
    let p = spec.location_parameter_count();
    let q = spec.scale_parameter_count();

    for subpop in &data.subpopulations {
        let sigma = scale_sigma(&subpop.z, &params.tau, spec.scale_type);
        let mut eta = Vec::with_capacity(t);
        let mut gprime = Vec::with_capacity(t);
        for j in 0..t {
            let eta_j = linear_predictor(
                params.theta[j],
                &subpop.x,
                &params.beta,
                &subpop.z,
                &params.tau,
                spec.scale_type,
            );
            eta.push(eta_j);
            gprime.push(d_inverse_link(eta_j, spec.link_function));
        }

        let cumulative = cumulative_probabilities(params, subpop, spec);
        let pi = cell_probabilities_raw(&cumulative);

        for param_index in 0..k {
            let mut dgamma = vec![0.0; t];
            if param_index < t {
                let j = param_index;
                dgamma[j] = gprime[j] / sigma;
            } else if param_index < t + p {
                let r = param_index - t;
                let coeff = -subpop.x[r] / sigma;
                for j in 0..t {
                    dgamma[j] = gprime[j] * coeff;
                }
            } else if param_index < t + p + q {
                let s = param_index - t - p;
                if spec.scale_type == ScaleType::NonConstant {
                    let coeff = -subpop.z[s];
                    for j in 0..t {
                        dgamma[j] = gprime[j] * coeff * eta[j];
                    }
                }
            }

            let mut dpi = vec![0.0; t + 1];
            if t > 0 {
                dpi[0] = dgamma[0];
                for j in 1..t {
                    dpi[j] = dgamma[j] - dgamma[j - 1];
                }
                dpi[t] = -dgamma[t - 1];
            } else {
                dpi[0] = 0.0;
            }

            let mut sum = 0.0;
            for idx in 0..subpop.counts.len() {
                let count = subpop.counts[idx];
                if count > 0.0 {
                    let prob = if pi[idx] > EPS { pi[idx] } else { EPS };
                    sum += count * dpi[idx] / prob;
                }
            }
            grad[param_index] += sum;
        }
    }

    grad
}

pub fn hessian(params: &PlumParameters, data: &AggregatedData, spec: &PlumSpec) -> DMatrix<f64> {
    finite_difference_hessian(params, data, spec)
}

pub fn expected_information(
    params: &PlumParameters,
    data: &AggregatedData,
    spec: &PlumSpec,
) -> DMatrix<f64> {
    let hess = finite_difference_hessian(params, data, spec);
    -hess
}

fn finite_difference_hessian(
    params: &PlumParameters,
    data: &AggregatedData,
    spec: &PlumSpec,
) -> DMatrix<f64> {
    let base_vec = params.to_vector(spec);
    let k = base_vec.len();
    let mut hessian = DMatrix::zeros(k, k);
    let step_scale = 1e-5;

    for i in 0..k {
        let mut plus = base_vec.clone();
        let mut minus = base_vec.clone();
        let step = step_scale * (1.0 + base_vec[i].abs());
        plus[i] += step;
        minus[i] -= step;
        let params_plus = PlumParameters::from_vector(&plus, spec);
        let params_minus = PlumParameters::from_vector(&minus, spec);
        let grad_plus = gradient(&params_plus, data, spec);
        let grad_minus = gradient(&params_minus, data, spec);
        let diff = (grad_plus - grad_minus) / (2.0 * step);
        for j in 0..k {
            hessian[(j, i)] = diff[j];
        }
    }

    if max_abs_vector(&hessian.diagonal().clone_owned()) == 0.0 {
        hessian += DMatrix::identity(k, k) * 1e-12;
    }

    hessian
}
