fn min_max_normalize(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return Vec::new();
    }

    let mut min_val = f64::INFINITY;
    let mut max_val = f64::NEG_INFINITY;

    for &v in values {
        if v < min_val {
            min_val = v;
        }
        if v > max_val {
            max_val = v;
        }
    }

    let range = max_val - min_val;
    if range == 0.0 {
        return vec![0.0; values.len()];
    }

    values.iter().map(|v| (v - min_val) / range).collect()
}

fn main() {
    let data = vec![10.0, 12.0, 15.0, 20.0];
    let normalized = min_max_normalize(&data);

    println!("input: {:?}", data);
    println!("normalized: {:?}", normalized);
}
