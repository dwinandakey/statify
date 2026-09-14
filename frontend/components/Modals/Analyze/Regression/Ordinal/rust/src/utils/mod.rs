use nalgebra::DVector;

pub const EPS: f64 = 1e-12;
const EXP_CLAMP: f64 = 700.0;

pub fn clamp_prob(p: f64) -> f64 {
    if !p.is_finite() {
        EPS
    } else if p < EPS {
        EPS
    } else if p > 1.0 - EPS {
        1.0 - EPS
    } else {
        p
    }
}

pub fn safe_exp(x: f64) -> f64 {
    if x > EXP_CLAMP {
        EXP_CLAMP.exp()
    } else if x < -EXP_CLAMP {
        (-EXP_CLAMP).exp()
    } else {
        x.exp()
    }
}

pub fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

pub fn max_abs(values: &[f64]) -> f64 {
    values
        .iter()
        .fold(0.0, |acc, v| acc.max(v.abs()))
}

pub fn max_abs_vector(vector: &DVector<f64>) -> f64 {
    vector.iter().fold(0.0, |acc, v| acc.max(v.abs()))
}

pub fn is_finite_non_negative(value: f64) -> bool {
    value.is_finite() && value >= 0.0
}

pub fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        0.0
    } else {
        values.iter().sum::<f64>() / values.len() as f64
    }
}

pub fn variance(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let mu = mean(values);
    let mut sum = 0.0;
    for v in values {
        let diff = v - mu;
        sum += diff * diff;
    }
    sum / (values.len() as f64 - 1.0)
}

pub fn correlation(x: &[f64], y: &[f64]) -> f64 {
    if x.len() != y.len() || x.len() < 2 {
        return 0.0;
    }
    let mean_x = mean(x);
    let mean_y = mean(y);
    let mut num = 0.0;
    let mut denom_x = 0.0;
    let mut denom_y = 0.0;
    for (xi, yi) in x.iter().zip(y.iter()) {
        let dx = xi - mean_x;
        let dy = yi - mean_y;
        num += dx * dy;
        denom_x += dx * dx;
        denom_y += dy * dy;
    }
    if denom_x <= 0.0 || denom_y <= 0.0 {
        0.0
    } else {
        num / (denom_x.sqrt() * denom_y.sqrt())
    }
}
