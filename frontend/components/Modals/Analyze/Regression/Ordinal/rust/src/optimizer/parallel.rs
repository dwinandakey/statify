use nalgebra::{DMatrix, DVector};
use statrs::distribution::{ChiSquared, ContinuousCDF};

use crate::links::inverse_link;
use crate::optimizer::starting_values_location_only;
use crate::types::{
    EstimationOptions, FitResult, IterationHistoryRow, ParallelLinesTest, PlumError,
    PlumParameters, PlumSpec,
};
use crate::utils::{clamp_prob, dot, max_abs_vector, EPS};

#[derive(Clone, Debug)]
struct NonParallelParameters {
    theta: Vec<f64>,
    beta_by_split: Vec<Vec<f64>>,
}

pub fn fit_non_parallel_location_only(
    data: &crate::types::AggregatedData,
    spec: &PlumSpec,
    options: &EstimationOptions,
) -> Result<FitResult, PlumError> {
    let t = spec.threshold_count();
    let p = spec.location_parameter_count();

    if spec.category_count < 3 || p == 0 {
        return Err(PlumError::InvalidInput(
            "Test of parallel lines is not applicable because the response has fewer than 3 categories or there are no slope parameters.".to_string(),
        ));
    }

    let parallel_start = starting_values_location_only(data, spec);
    let mut params = NonParallelParameters {
        theta: parallel_start.theta,
        beta_by_split: vec![parallel_start.beta; t],
    };
    apply_non_parallel_threshold_monotonicity(&mut params);

    let mut vec = params_to_vector(&params);
    let mut ll = non_parallel_log_likelihood(&params, data, spec);
    let mut converged = false;
    let mut iterations_run = 0;
    let mut last_abs_change_minus2_log_likelihood = None;
    let mut last_max_abs_change_parameters = None;
    let mut warnings = Vec::new();

    println!("[ORDINAL][PARALLEL_LINES][START]");

    for iter in 0..options.max_iterations {
        let grad = finite_difference_gradient(&vec, data, spec);
        if max_abs_vector(&grad) < options.gradient_tolerance {
            converged = true;
            break;
        }

        let hessian = finite_difference_hessian(&vec, data, spec);
        let information = -hessian;
        let direction = solve_linear_system(&information, &grad).unwrap_or_else(|| {
            warnings.push("Parallel lines general model used gradient fallback because the information matrix was singular.".to_string());
            scaled_gradient_direction(&grad)
        });

        let previous_vec = vec.clone();
        let previous_ll = ll;
        let step =
            non_parallel_step_halving(&vec, &direction, ll, data, spec, options.max_step_halving);

        vec = step.0;
        ll = step.1;
        iterations_run = iter + 1;

        let ll_diff = (ll - previous_ll).abs();
        let delta_max = max_abs_vector(&(vec.clone() - previous_vec));
        last_abs_change_minus2_log_likelihood = Some(ll_diff * 2.0);
        last_max_abs_change_parameters = Some(delta_max);

        if ll_diff < options.convergence_tolerance || delta_max < options.parameter_tolerance {
            converged = true;
            break;
        }
    }

    let final_params = vector_to_params(&vec, t, p);
    let final_ll = non_parallel_log_likelihood(&final_params, data, spec);

    if !converged {
        warnings.push("The general model may be unstable or failed to converge.".to_string());
    }

    println!(
        "[ORDINAL][PARALLEL_LINES][GENERAL_LL] {{\"logLikelihood\":{},\"minus2LogLikelihood\":{},\"converged\":{}}}",
        final_ll,
        -2.0 * final_ll,
        converged
    );

    Ok(FitResult {
        params: PlumParameters {
            theta: final_params.theta,
            beta: flatten_beta(&final_params.beta_by_split),
            tau: Vec::new(),
        },
        information: None,
        covariance: None,
        correlation: None,
        log_likelihood: final_ll,
        minus2_log_likelihood: -2.0 * final_ll,
        converged,
        iterations: iterations_run,
        iteration_history: Vec::<IterationHistoryRow>::new(),
        last_abs_change_minus2_log_likelihood,
        last_max_abs_change_parameters,
        warnings,
    })
}

pub fn test_parallel_lines(
    parallel_fit: &FitResult,
    non_parallel_fit: &FitResult,
    p: usize,
    j: usize,
) -> ParallelLinesTest {
    let raw_chi_square =
        -2.0 * parallel_fit.log_likelihood - (-2.0 * non_parallel_fit.log_likelihood);
    let chi_square = if raw_chi_square < 0.0 && raw_chi_square.abs() < 1e-8 {
        0.0
    } else {
        raw_chi_square
    };
    let df = (j as f64 - 2.0) * p as f64;
    let sig = if df > 0.0 {
        let chi = ChiSquared::new(df).unwrap();
        Some(1.0 - chi.cdf(chi_square.max(0.0)))
    } else {
        None
    };

    println!(
        "[ORDINAL][PARALLEL_LINES][RESULT] {{\"parallelMinus2LL\":{},\"generalMinus2LL\":{},\"chiSquare\":{},\"df\":{},\"sig\":{:?},\"converged\":{}}}",
        parallel_fit.minus2_log_likelihood,
        non_parallel_fit.minus2_log_likelihood,
        chi_square,
        df,
        sig,
        non_parallel_fit.converged
    );

    ParallelLinesTest {
        minus2_log_likelihood_parallel: parallel_fit.minus2_log_likelihood,
        minus2_log_likelihood_non_parallel: non_parallel_fit.minus2_log_likelihood,
        chi_square,
        df,
        sig,
        converged: non_parallel_fit.converged,
    }
}

fn params_to_vector(params: &NonParallelParameters) -> DVector<f64> {
    let mut values = Vec::with_capacity(
        params.theta.len()
            + params
                .beta_by_split
                .iter()
                .map(|beta| beta.len())
                .sum::<usize>(),
    );
    values.extend_from_slice(&params.theta);
    for beta in &params.beta_by_split {
        values.extend_from_slice(beta);
    }
    DVector::from_vec(values)
}

fn vector_to_params(vec: &DVector<f64>, threshold_count: usize, p: usize) -> NonParallelParameters {
    let theta = vec.rows(0, threshold_count).iter().cloned().collect();
    let mut beta_by_split = Vec::with_capacity(threshold_count);
    for split in 0..threshold_count {
        let start = threshold_count + split * p;
        beta_by_split.push(vec.rows(start, p).iter().cloned().collect());
    }
    let mut params = NonParallelParameters {
        theta,
        beta_by_split,
    };
    apply_non_parallel_threshold_monotonicity(&mut params);
    params
}

fn flatten_beta(beta_by_split: &[Vec<f64>]) -> Vec<f64> {
    let mut beta = Vec::new();
    for split_beta in beta_by_split {
        beta.extend_from_slice(split_beta);
    }
    beta
}

fn apply_non_parallel_threshold_monotonicity(params: &mut NonParallelParameters) {
    for idx in 1..params.theta.len() {
        if params.theta[idx] <= params.theta[idx - 1] {
            params.theta[idx] = params.theta[idx - 1] + 1e-6;
        }
    }
}

fn non_parallel_log_likelihood(
    params: &NonParallelParameters,
    data: &crate::types::AggregatedData,
    spec: &PlumSpec,
) -> f64 {
    let mut ll = 0.0;
    for subpop in &data.subpopulations {
        let pi = non_parallel_cell_probabilities(params, &subpop.x, spec);
        for (count, prob) in subpop.counts.iter().zip(pi.iter()) {
            if *count > 0.0 {
                ll += count * prob.max(EPS).ln();
            }
        }
    }
    ll
}

fn non_parallel_cell_probabilities(
    params: &NonParallelParameters,
    x: &[f64],
    spec: &PlumSpec,
) -> Vec<f64> {
    let t = spec.threshold_count();
    let mut gamma = Vec::with_capacity(t);

    for split in 0..t {
        let eta = params.theta[split] - dot(x, &params.beta_by_split[split]);
        let mut value = clamp_prob(inverse_link(eta, spec.link_function));
        if split > 0 && value <= gamma[split - 1] {
            value = (gamma[split - 1] + EPS).min(1.0 - EPS);
        }
        gamma.push(value);
    }

    let mut pi = vec![0.0; t + 1];
    pi[0] = clamp_prob(gamma[0]);
    for idx in 1..t {
        pi[idx] = clamp_prob(gamma[idx] - gamma[idx - 1]);
    }
    pi[t] = clamp_prob(1.0 - gamma[t - 1]);

    let sum: f64 = pi.iter().sum();
    if sum > EPS {
        for value in &mut pi {
            *value = clamp_prob(*value / sum);
        }
    }
    pi
}

fn finite_difference_gradient(
    vec: &DVector<f64>,
    data: &crate::types::AggregatedData,
    spec: &PlumSpec,
) -> DVector<f64> {
    let t = spec.threshold_count();
    let p = spec.location_parameter_count();
    let mut grad = DVector::zeros(vec.len());

    for i in 0..vec.len() {
        let step = 1e-5 * (1.0 + vec[i].abs());
        let mut plus = vec.clone();
        let mut minus = vec.clone();
        plus[i] += step;
        minus[i] -= step;
        let plus_params = vector_to_params(&plus, t, p);
        let minus_params = vector_to_params(&minus, t, p);
        let ll_plus = non_parallel_log_likelihood(&plus_params, data, spec);
        let ll_minus = non_parallel_log_likelihood(&minus_params, data, spec);
        grad[i] = (ll_plus - ll_minus) / (2.0 * step);
    }

    grad
}

fn finite_difference_hessian(
    vec: &DVector<f64>,
    data: &crate::types::AggregatedData,
    spec: &PlumSpec,
) -> DMatrix<f64> {
    let k = vec.len();
    let mut hessian = DMatrix::zeros(k, k);

    for i in 0..k {
        let step = 1e-4 * (1.0 + vec[i].abs());
        let mut plus = vec.clone();
        let mut minus = vec.clone();
        plus[i] += step;
        minus[i] -= step;
        let grad_plus = finite_difference_gradient(&plus, data, spec);
        let grad_minus = finite_difference_gradient(&minus, data, spec);
        let diff = (grad_plus - grad_minus) / (2.0 * step);
        for j in 0..k {
            hessian[(j, i)] = diff[j];
        }
    }

    hessian
}

fn solve_linear_system(matrix: &DMatrix<f64>, gradient: &DVector<f64>) -> Option<DVector<f64>> {
    let mut info = matrix.clone();
    let mut ridge = 1e-8;
    for _ in 0..5 {
        if let Some(solution) = info.clone().lu().solve(gradient) {
            if solution.iter().all(|value| value.is_finite()) {
                return Some(solution);
            }
        }
        let n = info.nrows();
        for i in 0..n {
            info[(i, i)] += ridge;
        }
        ridge *= 10.0;
    }
    None
}

fn scaled_gradient_direction(gradient: &DVector<f64>) -> DVector<f64> {
    let max_grad = max_abs_vector(gradient).max(1.0);
    gradient / max_grad
}

fn non_parallel_step_halving(
    current: &DVector<f64>,
    direction: &DVector<f64>,
    current_ll: f64,
    data: &crate::types::AggregatedData,
    spec: &PlumSpec,
    max_step_halving: usize,
) -> (DVector<f64>, f64) {
    let t = spec.threshold_count();
    let p = spec.location_parameter_count();
    let mut step = 1.0;
    let mut best_vec = current.clone();
    let mut best_ll = current_ll;

    for _ in 0..max_step_halving.max(1) {
        let candidate = current + direction * step;
        let candidate_params = vector_to_params(&candidate, t, p);
        let candidate_vec = params_to_vector(&candidate_params);
        let candidate_ll = non_parallel_log_likelihood(&candidate_params, data, spec);

        if candidate_ll.is_finite() && candidate_ll >= best_ll {
            best_vec = candidate_vec;
            best_ll = candidate_ll;
            break;
        }
        step *= 0.5;
    }

    (best_vec, best_ll)
}
