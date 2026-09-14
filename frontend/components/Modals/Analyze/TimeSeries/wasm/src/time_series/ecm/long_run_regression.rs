use crate::ECM;
use crate::time_series::ecm::ols_helper::{ols_matrix, OLSResult};

impl ECM {
    /// Build the X matrix for current obs: each row is [1, x₁, x₂, ...]
    pub(crate) fn build_x_matrix(&self) -> Vec<Vec<f64>> {
        let n = self.y.len();
        let nx = self.n_x;
        (0..n).map(|i| {
            let mut row = vec![1.0f64]; // intercept
            for k in 0..nx {
                row.push(self.x_flat[k * n + i]);
            }
            row
        }).collect()
    }

    /// OLS regression: Y_t = c + β₁X₁_t + β₂X₂_t + …
    pub fn estimate_long_run(&mut self) {
        let x_mat = self.build_x_matrix();
        let res: OLSResult = ols_matrix(&self.y, &x_mat);

        self.lr_residuals    = res.get_residuals();
        self.lr_coefficients = res.get_coefficients();
        self.lr_std_errors   = res.get_std_errors();
        self.lr_t_statistics = res.get_t_statistics();
        self.lr_p_values     = res.get_p_values();
        self.lr_r_squared    = res.r_squared;
        self.lr_adj_r_squared= res.adj_r_squared;
        self.lr_f_statistic  = res.f_statistic;
    }
}