import init, { GARCH, ECM, ARDL } from "./timeseries.js";

self.onmessage = async (e) => {
    const { type, payload } = e.data;
    
    try {
        await init();
        
        let result = {};
        
        // Helper to format numbers to 4 decimal places
        const fmt = (n) => typeof n === 'number' ? n.toFixed(4) : n;
        const fmtArray = (arr) => arr.map(n => typeof n === 'number' ? n.toFixed(4) : n);

        const computeDiagnostics = (model, data, residuals, p, q, modelType) => {
            const n = data.length;
            const k_mean = 1; // Intercept C
            
            let k_var = 1 + p + q;
            if (modelType === "EGARCH" || modelType === "TGARCH") {
                k_var = 1 + 2 * q + p;
            } else if (modelType === "ARCH") {
                k_var = 1 + q;
            } else if (modelType === "IGARCH") {
                k_var = p + q; // 1 (omega) + p + q - 1 (sum restriction)
            }
            
            const k_total = k_mean + k_var;
            const mean_y = data.reduce((sum, val) => sum + val, 0) / n;
            const sst = data.reduce((sum, val) => sum + Math.pow(val - mean_y, 2), 0);
            const sd_y = Math.sqrt(sst / (n - 1));
            const sse = residuals.reduce((sum, val) => sum + val * val, 0);
            const se_reg = Math.sqrt(sse / (n - k_mean));
            const r2 = sst > 0 ? (1 - sse / sst) : 0;
            const adj_r2 = r2;
            
            let dw_num = 0;
            for (let t = 1; t < n; t++) {
                dw_num += Math.pow(residuals[t] - residuals[t-1], 2);
            }
            const dw = sse > 0 ? (dw_num / sse) : 0;
            const ll = model.get_log_likelihood();
            
            const aic = (-2 * ll + 2 * k_total) / n;
            const bic = (-2 * ll + k_total * Math.log(n)) / n;
            const hq = (-2 * ll + 2 * k_total * Math.log(Math.log(n))) / n;
            
            return {
                rSquared: fmt(r2),
                adjRSquared: fmt(adj_r2),
                seRegression: fmt(se_reg),
                sumSquaredResid: fmt(sse),
                logLikelihood: fmt(ll),
                durbinWatson: fmt(dw),
                meanDependentVar: fmt(mean_y),
                sdDependentVar: fmt(sd_y),
                aic: fmt(aic),
                bic: fmt(bic),
                hq: fmt(hq)
            };
        };

        const normalCDF = (x) => {
            const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
            const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
            const pdf = Math.exp(-x * x / 2.0) / Math.sqrt(2.0 * Math.PI);
            return x >= 0.0 ? 1.0 - pdf * poly : pdf * poly;
        };

        const fDistPValue = (f, df1, df2) => {
            if (f <= 0) return 1.0;
            const d = 2.0 / (9.0 * df1);
            const e = 2.0 / (9.0 * df2);
            const A = 1.0 - e;
            const B = 1.0 - d;
            const C = Math.pow(f, 1.0 / 3.0);
            const num = A * C - B;
            const den = Math.sqrt(e * C * C + d);
            if (den === 0) return 1.0;
            const z = num / den;
            return 1.0 - normalCDF(z);
        };

        const computeRegressionDiagnostics = (y, residuals, nParams) => {
            const n = y.length;
            const k = nParams;
            
            const mean_y = y.reduce((sum, val) => sum + val, 0) / n;
            const sst = y.reduce((sum, val) => sum + Math.pow(val - mean_y, 2), 0);
            const sd_y = n > 1 ? Math.sqrt(sst / (n - 1)) : 0;
            const sse = residuals.reduce((sum, val) => sum + val * val, 0);
            const se_reg = n > k ? Math.sqrt(sse / (n - k)) : 0;
            
            const r2 = sst > 0 ? (1 - sse / sst) : 0;
            const adj_r2 = n > k && sst > 0 ? (1 - (sse / (n - k)) / (sst / (n - 1))) : r2;
            
            const f_stat = (n > k && k > 1) ? ((sst - sse) / (k - 1)) / (sse / (n - k)) : 0;
            const f_pval = (n > k && k > 1) ? fDistPValue(f_stat, k - 1, n - k) : 1.0;

            const ll = -0.5 * n * (1.0 + Math.log(2.0 * Math.PI) + Math.log(sse / n));

            const aic = (-2.0 * ll + 2.0 * k) / n;
            const bic = (-2.0 * ll + k * Math.log(n)) / n;
            const hq = (-2.0 * ll + 2.0 * k * Math.log(Math.log(n))) / n;

            let dw_num = 0;
            for (let t = 1; t < n; t++) {
                dw_num += Math.pow(residuals[t] - residuals[t-1], 2);
            }
            const dw = sse > 0 ? (dw_num / sse) : 0;

            return {
                rSquared: fmt(r2),
                adjRSquared: fmt(adj_r2),
                seRegression: fmt(se_reg),
                sumSquaredResid: fmt(sse),
                logLikelihood: fmt(ll),
                fStatistic: fmt(f_stat),
                probFStatistic: fmt(f_pval),
                meanDependentVar: fmt(mean_y),
                sdDependentVar: fmt(sd_y),
                aic: fmt(aic),
                bic: fmt(bic),
                hq: fmt(hq),
                durbinWatson: fmt(dw)
            };
        };


        if (type === "GARCH" || type === "ARCH") {
            const { data, p, q } = payload;
            const model = new GARCH(new Float64Array(data), p, q);
            model.estimate();
            
            result = {
                modelType: type,
                p, q,
                coefficients: {
                    mu: fmt(model.get_mu()),
                    mu_se: fmt(model.get_mu_se()),
                    mu_z: fmt(model.get_mu_z()),
                    mu_p: fmt(model.get_mu_p()),
                    
                    omega: fmt(model.get_omega()),
                    omega_se: fmt(model.get_omega_se()),
                    omega_z: fmt(model.get_omega_z()),
                    omega_p: fmt(model.get_omega_p()),

                    alpha: fmtArray(Array.from(model.get_alpha())),
                    alpha_se: fmtArray(Array.from(model.get_alpha_se())),
                    alpha_z: fmtArray(Array.from(model.get_alpha_z())),
                    alpha_p: fmtArray(Array.from(model.get_alpha_p())),

                    beta: fmtArray(Array.from(model.get_beta())),
                    beta_se: fmtArray(Array.from(model.get_beta_se())),
                    beta_z: fmtArray(Array.from(model.get_beta_z())),
                    beta_p: fmtArray(Array.from(model.get_beta_p())),
                },
                diagnostics: computeDiagnostics(model, Array.from(model.get_data()), Array.from(model.get_residuals()), p, q, type),
                variance: Array.from(model.get_variance()),
                residuals: Array.from(model.get_residuals()),
                data: Array.from(model.get_data())
            };
            model.free();
        } 
        else if (type === "EGARCH") {
            const { data, p, q } = payload;
            const model = new GARCH(new Float64Array(data), p, q);
            
            // Check if estimate_egarch exists (it should if WASM matches source)
            if (typeof model.estimate_egarch === 'function') {
                model.estimate_egarch();
            } else {
                 console.warn("estimate_egarch not found on GARCH object. Running estimate() instead.");
                 model.estimate();
            }
           
            result = {
                modelType: type,
                p, q,
                coefficients: {
                    mu: fmt(model.get_mu()),
                    mu_se: fmt(model.get_mu_se()),
                    mu_z: fmt(model.get_mu_z()),
                    mu_p: fmt(model.get_mu_p()),

                    omega: fmt(model.get_omega()),
                    omega_se: fmt(model.get_omega_se()),
                    omega_z: fmt(model.get_omega_z()),
                    omega_p: fmt(model.get_omega_p()),

                    alpha: fmtArray(Array.from(model.get_alpha())),
                    alpha_se: fmtArray(Array.from(model.get_alpha_se())),
                    alpha_z: fmtArray(Array.from(model.get_alpha_z())),
                    alpha_p: fmtArray(Array.from(model.get_alpha_p())),

                    gamma: fmtArray(Array.from(model.get_gamma())),
                    gamma_se: fmtArray(Array.from(model.get_gamma_se())),
                    gamma_z: fmtArray(Array.from(model.get_gamma_z())),
                    gamma_p: fmtArray(Array.from(model.get_gamma_p())),

                    beta: fmtArray(Array.from(model.get_beta())),
                    beta_se: fmtArray(Array.from(model.get_beta_se())),
                    beta_z: fmtArray(Array.from(model.get_beta_z())),
                    beta_p: fmtArray(Array.from(model.get_beta_p())),
                },
                diagnostics: computeDiagnostics(model, Array.from(model.get_data()), Array.from(model.get_residuals()), p, q, type),
                variance: Array.from(model.get_variance()),
                residuals: Array.from(model.get_residuals()),
                data: Array.from(model.get_data())
            };
            model.free();
        }
        else if (type === "TGARCH") {
             const { data, p, q } = payload;
             const model = new GARCH(new Float64Array(data), p, q);
             
             if (typeof model.estimate_tgarch === 'function') {
                model.estimate_tgarch();
             } else {
                 console.warn("estimate_tgarch not found on GARCH object. Running estimate() instead.");
                 model.estimate();
             }

             result = {
                modelType: type,
                p, q,
                coefficients: {
                    mu: fmt(model.get_mu()),
                    mu_se: fmt(model.get_mu_se()),
                    mu_z: fmt(model.get_mu_z()),
                    mu_p: fmt(model.get_mu_p()),

                    omega: fmt(model.get_omega()),
                    omega_se: fmt(model.get_omega_se()),
                    omega_z: fmt(model.get_omega_z()),
                    omega_p: fmt(model.get_omega_p()),

                    alpha: fmtArray(Array.from(model.get_alpha())),
                    alpha_se: fmtArray(Array.from(model.get_alpha_se())),
                    alpha_z: fmtArray(Array.from(model.get_alpha_z())),
                    alpha_p: fmtArray(Array.from(model.get_alpha_p())),

                    gamma: fmtArray(Array.from(model.get_gamma())),
                    gamma_se: fmtArray(Array.from(model.get_gamma_se())),
                    gamma_z: fmtArray(Array.from(model.get_gamma_z())),
                    gamma_p: fmtArray(Array.from(model.get_gamma_p())),

                    beta: fmtArray(Array.from(model.get_beta())),
                    beta_se: fmtArray(Array.from(model.get_beta_se())),
                    beta_z: fmtArray(Array.from(model.get_beta_z())),
                    beta_p: fmtArray(Array.from(model.get_beta_p())),
                },
                diagnostics: computeDiagnostics(model, Array.from(model.get_data()), Array.from(model.get_residuals()), p, q, type),
                variance: Array.from(model.get_variance()),
                residuals: Array.from(model.get_residuals()),
                data: Array.from(model.get_data())
             };
             model.free();
        } 
        else if (type === "IGARCH") {
              const { data, p, q } = payload;
              const model = new GARCH(new Float64Array(data), p, q);
              
              if (typeof model.estimate_igarch === 'function') {
                 model.estimate_igarch();
              } else {
                  console.warn("estimate_igarch not found on GARCH object. Running estimate() instead.");
                  model.estimate();
              }

              result = {
                 modelType: type,
                 p, q,
                 coefficients: {
                     mu: fmt(model.get_mu()),
                     mu_se: fmt(model.get_mu_se()),
                     mu_z: fmt(model.get_mu_z()),
                     mu_p: fmt(model.get_mu_p()),

                     omega: fmt(model.get_omega()),
                     omega_se: fmt(model.get_omega_se()),
                     omega_z: fmt(model.get_omega_z()),
                     omega_p: fmt(model.get_omega_p()),

                     alpha: fmtArray(Array.from(model.get_alpha())),
                     alpha_se: fmtArray(Array.from(model.get_alpha_se())),
                     alpha_z: fmtArray(Array.from(model.get_alpha_z())),
                     alpha_p: fmtArray(Array.from(model.get_alpha_p())),

                     beta: fmtArray(Array.from(model.get_beta())),
                     beta_se: fmtArray(Array.from(model.get_beta_se())),
                     beta_z: fmtArray(Array.from(model.get_beta_z())),
                     beta_p: fmtArray(Array.from(model.get_beta_p())),
                 },
                 diagnostics: computeDiagnostics(model, Array.from(model.get_data()), Array.from(model.get_residuals()), p, q, type),
                 variance: Array.from(model.get_variance()),
                 residuals: Array.from(model.get_residuals()),
                 data: Array.from(model.get_data())
              };
              model.free();
         }
        else if (type === "ECM") {
            const { y, x, n_vars, max_lag_adf, max_lag_ecm } = payload;
            const model = new ECM(new Float64Array(y), new Float64Array(x), n_vars, max_lag_adf, max_lag_ecm);
            model.estimate_ecm();
            
            const y_arr = Array.from(y);
            const delta_y = [];
            for (let i = 1; i < y_arr.length; i++) {
                delta_y.push(y_arr[i] - y_arr[i-1]);
            }
            const lrCoefs = Array.from(model.get_lr_coefficients());
            const lrResids = Array.from(model.get_lr_residuals());
            const ecmCoefs = Array.from(model.get_ecm_coefficients());
            const ecmResids = Array.from(model.get_ecm_residuals());

            result = {
                longRun: {
                    coefficients: fmtArray(lrCoefs),
                    stdErrors: fmtArray(Array.from(model.get_lr_std_errors())),
                    tStats: fmtArray(Array.from(model.get_lr_t_statistics())),
                    pValues: fmtArray(Array.from(model.get_lr_p_values())),
                    residuals: lrResids,
                    rSquared: fmt(model.get_lr_r_squared()),
                    adjRSquared: fmt(model.get_lr_adj_r_squared()),
                    fStat: fmt(model.get_lr_f_statistic()),
                    diagnostics: computeRegressionDiagnostics(y_arr, lrResids, lrCoefs.length),
                },
                cointegration: {
                    adfStat: fmt(model.get_adf_statistic()),
                    pValue: fmt(model.get_adf_p_value()),
                    isCointegrated: model.get_is_cointegrated(),
                },
                ecm: {
                    coefficients: fmtArray(ecmCoefs),
                    stdErrors: fmtArray(Array.from(model.get_ecm_std_errors())),
                    tStats: fmtArray(Array.from(model.get_ecm_t_statistics())),
                    pValues: fmtArray(Array.from(model.get_ecm_p_values())),
                    residuals: ecmResids,
                    rSquared: fmt(model.get_ecm_r_squared()),
                    adjRSquared: fmt(model.get_ecm_adj_r_squared()),
                    fStat: fmt(model.get_ecm_f_statistic()),
                    diagnostics: computeRegressionDiagnostics(delta_y, ecmResids, ecmCoefs.length),
                },
                diagnostics: {
                    jarqueBera: { stat: fmt(model.get_jb_stat()), prob: fmt(model.get_jb_p_value()) },
                    breuschGodfrey: { stat: fmt(model.get_bg_stat()), prob: fmt(model.get_bg_p_value()) },
                    breuschPagan: { stat: fmt(model.get_bp_stat()), prob: fmt(model.get_bp_p_value()) }
                }
            };
            model.free();
        }
        else if (type === "ARDL") {
            const { y, x, n_vars, p, q } = payload;
            const model = new ARDL(
                new Float64Array(y), 
                new Float64Array(x), 
                n_vars, 
                p, 
                new Uint32Array(q)
            );
            model.estimate_ardl_ecm();
            
            const y_arr = Array.from(y);
            const q_arr = Array.from(q);
            const max_q = Math.max(...q_arr);
            const max_lag_val = Math.max(p, max_q);
            const start_idx = max_lag_val + 1;
            const y_sr = [];
            for (let t = start_idx; t < y_arr.length; t++) {
                y_sr.push(y_arr[t] - y_arr[t-1]);
            }

            const lrCoefs = Array.from(model.get_lr_coefficients());
            const lrResids = Array.from(model.get_lr_residuals());
            const srCoefs = Array.from(model.get_sr_coefficients());
            const srResids = Array.from(model.get_sr_residuals());

            result = {
                longRun: {
                    coefficients: fmtArray(lrCoefs),
                    stdErrors: fmtArray(Array.from(model.get_lr_std_errors())),
                    tStats: fmtArray(Array.from(model.get_lr_t_statistics())),
                    pValues: fmtArray(Array.from(model.get_lr_p_values())),
                    residuals: lrResids,
                    rSquared: fmt(model.get_lr_r_squared()),
                    adjRSquared: fmt(model.get_lr_adj_r_squared()),
                    fStat: fmt(model.get_lr_f_statistic()),
                    diagnostics: computeRegressionDiagnostics(y_arr, lrResids, lrCoefs.length),
                },
                cointegration: {
                    statistic: fmt(model.get_adf_statistic()),
                    pValue: fmt(model.get_adf_p_value()),
                    isCointegrated: model.get_is_cointegrated(),
                },
                shortRun: {
                    coefficients: fmtArray(srCoefs),
                    stdErrors: fmtArray(Array.from(model.get_sr_std_errors())),
                    tStats: fmtArray(Array.from(model.get_sr_t_statistics())),
                    pValues: fmtArray(Array.from(model.get_sr_p_values())),
                    residuals: srResids,
                    rSquared: fmt(model.get_sr_r_squared()),
                    adjRSquared: fmt(model.get_sr_adj_r_squared()),
                    fStat: fmt(model.get_sr_f_statistic()),
                    diagnostics: computeRegressionDiagnostics(y_sr, srResids, srCoefs.length),
                },
                diagnostics: {
                    jarqueBera: { stat: fmt(model.get_jb_stat()), prob: fmt(model.get_jb_p_value()) },
                    breuschGodfrey: { stat: fmt(model.get_bg_stat()), prob: fmt(model.get_bg_p_value()) },
                    breuschPagan: { stat: fmt(model.get_bp_stat()), prob: fmt(model.get_bp_p_value()) }
                }
            };
            model.free();
        }
        else if (type === "ARCH_LM") {
            const { residuals, lags } = payload;
            
            const lmResult = GARCH.arch_lm_test(new Float64Array(residuals), lags);
            
            result = {
                statistic: fmt(lmResult.lm_statistic),      // Obs*R-squared
                pValue: fmt(lmResult.p_value),               // Prob. Chi-Square
                fStatistic: fmt(lmResult.f_statistic),       // F-statistic
                fPValue: fmt(lmResult.f_p_value),            // Prob. F
                isHomoscedastic: !lmResult.has_arch_effect,
                testName: "ARCH-LM Test",
                lags: lags,
            };
            
            lmResult.free();
        }
        
        self.postMessage({ status: "success", result });
        
    } catch (err) {
        console.error("Worker Error:", err);
        self.postMessage({ status: "error", error: err.message || err.toString() });
    }
};
