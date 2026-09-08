use statify_ordinal::cell_probabilities;

#[test]
fn cell_probabilities_sum_to_one() {
    let cumulative = vec![0.2, 0.6];
    let probs = cell_probabilities(&cumulative);
    let sum: f64 = probs.iter().sum();
    assert!((sum - 1.0).abs() < 1e-9);
    for prob in probs {
        assert!(prob >= 0.0);
    }
}
