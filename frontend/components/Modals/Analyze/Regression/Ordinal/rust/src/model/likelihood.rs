use crate::model::{cell_probabilities_raw, cumulative_probabilities};
use crate::types::{AggregatedData, PlumParameters, PlumSpec};

pub fn log_likelihood(params: &PlumParameters, data: &AggregatedData, spec: &PlumSpec) -> f64 {
    let mut ll = 0.0;
    for subpop in &data.subpopulations {
        let cumulative = cumulative_probabilities(params, subpop, spec);
        let pi = cell_probabilities_raw(&cumulative);
        for (count, prob) in subpop.counts.iter().zip(pi.iter()) {
            if *count > 0.0 {
                ll += count * prob.ln();
            }
        }
    }
    ll
}
