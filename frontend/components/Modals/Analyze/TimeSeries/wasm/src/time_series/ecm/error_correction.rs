use crate::ECM;
use crate::time_series::ecm::ols_helper::ols_matrix;

impl ECM {
    /// Compute first difference of a slice
    fn first_diff(v: &[f64]) -> Vec<f64> {
        v.windows(2).map(|w| w[1] - w[0]).collect()
    }

    /// Short-run ECM: ΔY_t = α + γ·ECT_{t-1} + φ₁·ΔX₁_t + φ₂·ΔX₂_t + …
    pub fn estimate_short_run(&mut self) {
        let n  = self.y.len();
        let nx = self.n_x;

        if n < 3 || self.lr_residuals.len() < 2 {
            return;
        }

        // ΔY (length n-1)
        let delta_y = Self::first_diff(&self.y);
        let m = delta_y.len(); // = n - 1

        // ECT lagged: ECT_{t-1} = lr_residuals[0..m]  (residual from t=0..n-2)
        let ect_lag: Vec<f64> = self.lr_residuals[..m].to_vec();

        // ΔXₖ (length n-1) for k = 0..nx
        let mut delta_xs: Vec<Vec<f64>> = Vec::new();
        for k in 0..nx {
            let col: Vec<f64> = (0..n).map(|i| self.x_flat[k * n + i]).collect();
            delta_xs.push(Self::first_diff(&col));
        }

        // Build X matrix: [1, ECT(-1), ΔX₁, ΔX₂, ...]
        let x_mat: Vec<Vec<f64>> = (0..m).map(|i| {
            let mut row = vec![1.0, ect_lag[i]];
            for k in 0..nx {
                row.push(delta_xs[k][i]);
            }
            row
        }).collect();

        let res = ols_matrix(&delta_y, &x_mat);

        self.ecm_coefficients  = res.get_coefficients();
        self.ecm_std_errors    = res.get_std_errors();
        self.ecm_t_statistics  = res.get_t_statistics();
        self.ecm_p_values      = res.get_p_values();
        self.ecm_residuals     = res.get_residuals();
        self.ecm_r_squared     = res.r_squared;
        self.ecm_adj_r_squared = res.adj_r_squared;
        self.ecm_f_statistic   = res.f_statistic;
    }
}