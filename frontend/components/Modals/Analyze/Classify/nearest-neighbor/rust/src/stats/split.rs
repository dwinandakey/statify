use super::numpy_random::seeded_mt19937;

fn next_uniform_01(rng: &mut rand_mt::Mt) -> f64 {
    let high = (rng.next_u32() >> 5) as u64;
    let low = (rng.next_u32() >> 6) as u64;

    ((high << 26) | low) as f64 / ((1u64 << 53) as f64)
}

pub fn split_training_holdout_with_rng(
    total_cases: usize,
    training_percent: i32,
    rng: &mut rand_mt::Mt,
) -> (Vec<usize>, Vec<usize>) {
    if total_cases == 0 {
        return (Vec::new(), Vec::new());
    }

    let training_ratio = training_percent.clamp(0, 100) as f64 / 100.0;
    let mut training_indices = Vec::new();
    let mut holdout_indices = Vec::new();

    for case_idx in 0..total_cases {
        let u = next_uniform_01(rng);

        if u < training_ratio {
            training_indices.push(case_idx);
        } else {
            holdout_indices.push(case_idx);
        }
    }

    (training_indices, holdout_indices)
}

/// Splits data into training and holdout sets
pub fn split_training_holdout(
    total_cases: usize,
    training_percent: i32,
    use_seed: bool,
    seed: Option<i64>,
) -> (Vec<usize>, Vec<usize>) {
    if total_cases == 0 {
        return (Vec::new(), Vec::new());
    }

    let effective_seed = if use_seed { seed } else { None };
    let mut rng = seeded_mt19937(effective_seed);
    split_training_holdout_with_rng(total_cases, training_percent, &mut rng)
}

#[cfg(test)]
mod tests {
    use super::split_training_holdout;

    #[test]
    fn random_split_with_seed_is_deterministic() {
        let first = split_training_holdout(10, 60, true, Some(1234));
        let second = split_training_holdout(10, 60, true, Some(1234));

        assert_eq!(first, second);
        assert_eq!(first.0, vec![0, 2, 5, 6]);
        assert_eq!(first.1, vec![1, 3, 4, 7, 8, 9]);
    }

    #[test]
    fn random_split_uses_probabilistic_assignment_not_exact_size() {
        let (train, holdout) = split_training_holdout(10, 60, true, Some(1234));

        assert_eq!(train.len(), 4);
        assert_eq!(holdout.len(), 6);
    }

    #[test]
    fn random_split_changes_with_different_seed() {
        let first = split_training_holdout(10, 60, true, Some(1234));
        let second = split_training_holdout(10, 60, true, Some(5678));

        assert_ne!(first, second);
    }

    #[test]
    fn random_split_handles_empty_input_and_clamps_training_percentage() {
        assert_eq!(
            split_training_holdout(0, 60, true, Some(1234)),
            (Vec::new(), Vec::new())
        );
        assert_eq!(
            split_training_holdout(3, -10, true, Some(1234)),
            (Vec::new(), vec![0, 1, 2])
        );
        assert_eq!(
            split_training_holdout(3, 110, true, Some(1234)),
            (vec![0, 1, 2], Vec::new())
        );
    }
}
