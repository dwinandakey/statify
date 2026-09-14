fn euclidean_distance(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let mut sum_sq = 0.0;
    for i in 0..a.len() {
        let diff = a[i] - b[i];
        sum_sq += diff * diff;
    }

    sum_sq.sqrt()
}

fn main() {
    let point_a = vec![1.0, 2.0, 3.0];
    let point_b = vec![4.0, 6.0, 8.0];
    let distance = euclidean_distance(&point_a, &point_b);

    println!("point_a: {:?}", point_a);
    println!("point_b: {:?}", point_b);
    println!("euclidean_distance: {}", distance);
}
