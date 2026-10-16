import { useState } from "react";
import type { Variable } from "@/types/Variable";
import type { DataRow } from "@/types/Data";
import { toast } from "sonner";
import { ChartService } from "@/services/chart/ChartService";
import { useResultStore } from "@/stores/useResultStore";
import { getTimeSeriesWorker } from "@/utils/timeseriesWorkerPool";
import type { TimeSeriesSplitState } from "../../Common/useTimeSeriesSplit";

export const useAnalyzeHook = (
    selectedVariables: Variable[],
    data: DataRow[],
    selectedPeriod: any,
    pOrder: number,
    qOrder: number,
    modelType: string, // "GARCH", "EGARCH", "TGARCH", "IGARCH", "ARCH"
    includeForecast: boolean,
    forecastHorizon: number,
    splitConfig: TimeSeriesSplitState,
    onSaveSplitToDataView: (totalRows: number, validRowIndices: number[], splitIndex: number, testPredictions?: number[]) => Promise<void>,
    onClose: () => void
) => {
    const { addLog, addAnalytic, addStatistic } = useResultStore();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const handleAnalyzes = async () => {
        if (selectedVariables.length === 0) {
            setErrorMsg("Please select at least one variable");
            return;
        }

        setIsCalculating(true);
        setErrorMsg(null);

        try {
            const variable = selectedVariables[0];
            const returns: number[] = [];
            const validRowIndices: number[] = [];

            data.forEach((row, rIdx) => {
                const value = row[variable.columnIndex];
                if (value !== null && value !== undefined && !isNaN(Number(value))) {
                    returns.push(Number(value));
                    validRowIndices.push(rIdx);
                }
            });

            if (returns.length < 10) {
                throw new Error("Insufficient data points (minimum 10 required)");
            }

            const effectiveP = modelType === "ARCH" ? 0 : pOrder;
            const client = getTimeSeriesWorker();

            client.onMessage(async (e) => {
                const { status, result, error } = e.data;

                if (status === "success") {
                    try {
                        const tables = [];
                        const charts = [];

                        if (splitConfig.splitEnabled) {
                            // --- SPLIT MODE RESULTS ---
                            toast.success(`${modelType} split evaluation completed!`);

                            // Keep the legacy sections unchanged; split metadata is additive.
                            tables.push({
                                title: `Estimation sample: obs 1–${result.trainSize} (training) | Testing sample: obs ${result.trainSize + 1}–${returns.length}`,
                                columnHeaders: [{ header: "Sample", key: "sample" }],
                                rows: [{
                                    sample: `Estimation sample: obs 1–${result.trainSize} (training) | Testing sample: obs ${result.trainSize + 1}–${returns.length}`
                                }]
                            });
                            tables.push({
                                title: "Time Series Data Split Summary",
                                columnHeaders: [
                                    { header: "Partition / Setting", key: "setting" },
                                    { header: "Details", key: "details" }
                                ],
                                rows: [
                                    {
                                        setting: "Metode Evaluasi Split",
                                        details: splitConfig.splitMode === "holdout"
                                            ? "Dynamic multi-step forecast from the end of the training sample (chronological holdout)"
                                            : `Static one-step forecast with actual updates (${splitConfig.rollingType === "expanding" ? "Expanding Window" : "Fixed Window"})`
                                    },
                                    {
                                        setting: "Proporsi Target Training",
                                        details: `${Math.round(result.trainRatio * 100)}%`
                                    },
                                    {
                                        setting: "Data Training (In-Sample)",
                                        details: `Observasi 1 .. ${result.trainSize} (${result.trainSize} data)`
                                    },
                                    {
                                        setting: "Data Testing (Out-of-Sample)",
                                        details: `Observasi ${result.trainSize + 1} .. ${returns.length} (${result.testSize} data)`
                                    },
                                    {
                                        setting: "Total Observasi Efektif",
                                        details: `${returns.length} data`
                                    }
                                ]
                            });

                            // Legacy Mean Equation section, estimated from training data.
                            if (result.coefficients) {
                                tables.push({
                                    title: "Mean Equation",
                                    columnHeaders: [
                                        { header: "Variable", key: "rowHeader" },
                                        { header: "Coefficient", key: "coefficient" },
                                        { header: "Std. Error", key: "stdError" },
                                        { header: "z-Statistic", key: "tStat" },
                                        { header: "Prob.", key: "pValue" }
                                    ],
                                    rows: [
                                        {
                                            rowHeader: ["C (μ)"],
                                            coefficient: result.coefficients.mu,
                                            stdError: result.coefficients.mu_se || "-",
                                            tStat: result.coefficients.mu_z || "-",
                                            pValue: result.coefficients.mu_p || "-"
                                        }
                                    ],
                                    footer: `${result.meanEquation || "Mean equation: y_t = μ + ε_t"}; fitted/forecast mean: ${result.fittedMeanEquation || "ŷ_t = μ"}.`
                                });
                                tables.push({
                                    title: "Mean Equation Specification",
                                    columnHeaders: [
                                        { header: "Equation", key: "equation" },
                                        { header: "Fitted / Forecast", key: "fitted" }
                                    ],
                                    rows: [{
                                        equation: result.meanEquation || "y_t = μ + ε_t",
                                        fitted: `${result.forecastMeanEquation || result.fittedMeanEquation || "ŷ_t = μ"}; ${result.forecastMethod || (splitConfig.splitMode === "holdout" ? "dynamic" : "static")} forecast`
                                    }]
                                });

                                // Variance Equation Table (Training)
                                const varRows = [];
                                if (result.coefficients.omega !== undefined) {
                                    varRows.push({
                                        rowHeader: ["Omega (ω)"],
                                        coefficient: result.coefficients.omega,
                                        stdError: result.coefficients.omega_se || "-",
                                        tStat: result.coefficients.omega_z || "-",
                                        pValue: result.coefficients.omega_p || "-"
                                    });
                                }
                                if (Array.isArray(result.coefficients.alpha)) {
                                    result.coefficients.alpha.forEach((a: string, idx: number) => {
                                        varRows.push({
                                            rowHeader: [idx === 0 ? "RESID(-1)^2" : `RESID(-${idx + 1})^2`],
                                            coefficient: a,
                                            stdError: result.coefficients.alpha_se?.[idx] || "-",
                                            tStat: result.coefficients.alpha_z?.[idx] || "-",
                                            pValue: result.coefficients.alpha_p?.[idx] || "-"
                                        });
                                    });
                                }
                                if (Array.isArray(result.coefficients.gamma)) {
                                    result.coefficients.gamma.forEach((g: string, idx: number) => {
                                        varRows.push({
                                            rowHeader: [`Gamma (${idx + 1})`],
                                            coefficient: g,
                                            stdError: result.coefficients.gamma_se?.[idx] || "-",
                                            tStat: result.coefficients.gamma_z?.[idx] || "-",
                                            pValue: result.coefficients.gamma_p?.[idx] || "-"
                                        });
                                    });
                                }
                                if (Array.isArray(result.coefficients.beta)) {
                                    result.coefficients.beta.forEach((b: string, idx: number) => {
                                        varRows.push({
                                            rowHeader: [idx === 0 ? "GARCH(-1)" : `GARCH(-${idx + 1})`],
                                            coefficient: b,
                                            stdError: result.coefficients.beta_se?.[idx] || "-",
                                            tStat: result.coefficients.beta_z?.[idx] || "-",
                                            pValue: result.coefficients.beta_p?.[idx] || "-"
                                        });
                                    });
                                }

                                tables.push({
                                    title: "Variance Equation",
                                    columnHeaders: [
                                        { header: "Variable", key: "rowHeader" },
                                        { header: "Coefficient", key: "coefficient" },
                                        { header: "Std. Error", key: "stdError" },
                                        { header: "z-Statistic", key: "tStat" },
                                        { header: "Prob.", key: "pValue" }
                                    ],
                                    rows: varRows
                                });
                            }

                            // Preserve the standard training diagnostics in split output.
                            if (result.diagnostics) {
                                tables.push({
                                    title: "Diagnostics",
                                    columnHeaders: [
                                        { header: "Statistic", key: "statName" },
                                        { header: "Value", key: "statValue" },
                                        { header: "Statistic", key: "statName2" },
                                        { header: "Value", key: "statValue2" }
                                    ],
                                    rows: [
                                        { statName: "R-squared", statValue: result.diagnostics.rSquared, statName2: "Mean dependent var", statValue2: result.diagnostics.meanDependentVar },
                                        { statName: "Adjusted R-squared", statValue: result.diagnostics.adjRSquared, statName2: "S.D. dependent var", statValue2: result.diagnostics.sdDependentVar },
                                        { statName: "S.E. of regression", statValue: result.diagnostics.seRegression, statName2: "Akaike info criterion", statValue2: result.diagnostics.aic },
                                        { statName: "Sum squared resid", statValue: result.diagnostics.sumSquaredResid, statName2: "Schwarz criterion (BIC)", statValue2: result.diagnostics.bic },
                                        { statName: "Log likelihood", statValue: result.diagnostics.logLikelihood, statName2: "Hannan-Quinn criter.", statValue2: result.diagnostics.hq },
                                        { statName: "Durbin-Watson stat", statValue: result.diagnostics.durbinWatson, statName2: "", statValue2: "" }
                                    ]
                                });
                            }

                            // Preserve the standard in-sample charts alongside split charts.
                            const trainVariance: number[] = result.trainVariance || [];
                            if (trainVariance.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: trainVariance.map((value, index) => ({
                                        category: String(index + 1),
                                        value
                                    })),
                                    chartMetadata: {
                                        title: "Conditional Variance",
                                        subtitle: `${modelType} Training Sample`
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Time", y: "Variance" }
                                    }
                                }));
                            }

                            const trainResiduals: number[] = result.trainResiduals || [];
                            if (trainResiduals.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: trainResiduals.map((value, index) => ({
                                        category: String(index + 1),
                                        value
                                    })),
                                    chartMetadata: {
                                        title: "Residuals",
                                        subtitle: `${modelType} Training Sample`
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Time", y: "Residual" }
                                    }
                                }));
                            }

                            // 3. Out-of-Sample Forecast Evaluation Table
                            if (result.metrics) {
                                tables.push({
                                    title: "Out-of-Sample Forecast Evaluation (Testing Sample)",
                                    columnHeaders: [
                                        { header: "Akurasi Metrik", key: "metric" },
                                        { header: "Nilai Prediksi Mean (ŷ)", key: "meanVal" },
                                        { header: "Keterangan", key: "note" }
                                    ],
                                    rows: [
                                        { metric: "Root Mean Squared Error (RMSE)", meanVal: result.metrics.rmse, note: "Akar rerata kuadrat galat ramalan" },
                                        { metric: "Mean Absolute Error (MAE)", meanVal: result.metrics.mae, note: "Rerata selisih absolut ramalan" },
                                        { metric: "Mean Absolute Percentage Error (MAPE)", meanVal: result.metrics.mape, note: "Persentase galat terhadap aktual" },
                                        { metric: "Theil's Inequality Coefficient (U)", meanVal: result.metrics.theilU, note: "0 = Peramalan sempurna, 1 = Naive" },
                                        { metric: "95% Prediction Interval Coverage", meanVal: result.coverage95, note: "Proporsi aktual jatuh di rentang [Lower, Upper 95%]" }
                                    ]
                                });
                            }

                            const splitMeanRows = [
                                ...(result.trainData || []).map((actual: number, index: number) => ({
                                    sample: "Training",
                                    observation: index + 1,
                                    actual,
                                    yHat: result.trainYHat?.[index]
                                })),
                                ...(result.testActual || []).map((actual: number, index: number) => ({
                                    sample: "Testing",
                                    observation: result.trainSize + index + 1,
                                    actual,
                                    yHat: result.testYHat?.[index]
                                }))
                            ];
                            if (splitMeanRows.length > 0) {
                                tables.push({
                                    title: "Mean Fitted Values & Forecasts (ŷ)",
                                    columnHeaders: [
                                        { header: "Sample", key: "sample" },
                                        { header: "Observation", key: "observation" },
                                        { header: "Actual y", key: "actual" },
                                        { header: "ŷ", key: "yHat" },
                                        { header: "ε = y − ŷ", key: "error" }
                                    ],
                                    rows: splitMeanRows.map((row: any) => ({
                                        ...row,
                                        error: typeof row.actual === "number" && typeof row.yHat === "number"
                                            ? row.actual - row.yHat
                                            : "-"
                                    })),
                                    footer: `${result.meanEquation || "Mean equation: y_t = μ + ε_t"}; ${result.fittedMeanEquation || "ŷ_t = μ"}. Training values are fitted in-sample and testing values are forecasts out-of-sample.`
                                });
                            }

                            // 4. Variance Forecast Evaluation Table
                            if (result.varianceMetrics) {
                                tables.push({
                                    title: "Variance Forecast Evaluation (Proxy ε² vs σ²)",
                                    columnHeaders: [
                                        { header: "Metrik Evaluasi Volatilitas", key: "vMetric" },
                                        { header: "Nilai", key: "vVal" }
                                    ],
                                    rows: [
                                        { vMetric: "Variance MSE (Proxy Error)", vVal: result.varianceMetrics.mse },
                                        { vMetric: "Variance RMSE", vVal: result.varianceMetrics.rmse },
                                        { vMetric: "Variance MAE", vVal: result.varianceMetrics.mae }
                                    ]
                                });
                            }

                            if (includeForecast && forecastHorizon > 0 && Array.isArray(result.testVarianceForecast)) {
                                const H = Math.min(
                                    Math.max(1, Math.min(100, forecastHorizon)),
                                    result.testVarianceForecast.length
                                );
                                const splitForecastRows = Array.from({ length: H }, (_, index) => ({
                                    step: `T1 + ${index + 1}`,
                                    yHat: result.testYHat?.[index] ?? result.coefficients?.mu,
                                    variance: result.testVarianceForecast[index],
                                    volatility: result.testVolatilityForecast?.[index],
                                    lower95: result.testLower95?.[index],
                                    upper95: result.testUpper95?.[index]
                                }));
                                tables.push({
                                    title: `Multi-Step Forecast (Horizon = ${H} Periods)`,
                                    columnHeaders: [
                                        { header: "Period", key: "step" },
                                        { header: "ŷ (Mean Forecast)", key: "yHat" },
                                        { header: "σ² (Variance)", key: "variance" },
                                        { header: "σ (Volatility)", key: "volatility" },
                                        { header: "Lower 95% CI", key: "lower95" },
                                        { header: "Upper 95% CI", key: "upper95" }
                                    ],
                                    rows: splitForecastRows,
                                    footer: splitConfig.splitMode === "holdout"
                                        ? "Dynamic forecasts begin at the end of the training sample."
                                        : "Static one-step forecasts use actual observations from the preceding testing period."
                                });
                            }

                            // Charts: In-Sample vs Out-of-Sample Variance
                            const combinedVarianceChartData = [
                                ...(result.trainVariance || []).map((v: number, i: number) => ({
                                    category: String(i + 1),
                                    value: v
                                })),
                                ...(result.testVarianceForecast || []).map((v: number, i: number) => ({
                                    category: String(result.trainSize + i + 1),
                                    value: v
                                }))
                            ];

                            const varianceChart = ChartService.createChartJSON({
                                chartType: "Line Chart",
                                chartData: combinedVarianceChartData,
                                chartMetadata: {
                                    title: "Conditional Variance: In-Sample Fit & Out-of-Sample Forecast",
                                    subtitle: `${modelType} Split Evaluation (Cutoff at obs ${result.trainSize})`
                                },
                                chartConfig: {
                                    axisLabels: { x: "Time Index", y: "Variance (σ²)" }
                                }
                            });
                            charts.push(varianceChart);

                            tables.push({
                                title: "Volatility Model Interpretation",
                                columnHeaders: [{ header: "Interpretation", key: "interpretation" }],
                                rows: [{
                                    interpretation: `${modelType} conditional variance is reported for the training and testing periods.`
                                }]
                            });

                            const interpretationIndex = tables.findIndex((table) => table.title === "Volatility Model Interpretation");
                            const forecastIndex = tables.findIndex((table) => table.title === "Out-of-Sample Forecast Evaluation (Testing Sample)");
                            if (interpretationIndex >= 0 && forecastIndex >= 0 && interpretationIndex > forecastIndex) {
                                const [interpretationTable] = tables.splice(interpretationIndex, 1);
                                tables.splice(forecastIndex, 0, interpretationTable);
                            }

                            // Save to Data View if selected
                            await onSaveSplitToDataView(data.length, validRowIndices, result.trainSize, result.testYHat);

                        } else {
                            // --- FULL SAMPLE ESTIMATION ---
                            toast.success(`${modelType} estimation completed!`);

                            // 1. Parameter Tables
                            if (result.coefficients) {
                                tables.push({
                                    title: "Mean Equation",
                                    columnHeaders: [
                                        { header: "Variable", key: "rowHeader" },
                                        { header: "Coefficient", key: "coefficient" },
                                        { header: "Std. Error", key: "stdError" },
                                        { header: "z-Statistic", key: "tStat" },
                                        { header: "Prob.", key: "pValue" }
                                    ],
                                    rows: [
                                        {
                                            rowHeader: ["C"],
                                            coefficient: result.coefficients.mu,
                                            stdError: result.coefficients.mu_se || "-",
                                            tStat: result.coefficients.mu_z || "-",
                                            pValue: result.coefficients.mu_p || "-"
                                        }
                                    ]
                                });
                                tables.push({
                                    title: "Mean Equation Specification",
                                    columnHeaders: [
                                        { header: "Equation", key: "equation" },
                                        { header: "Fitted / Forecast", key: "fitted" }
                                    ],
                                    rows: [{
                                        equation: "y_t = μ + ε_t",
                                        fitted: "ŷ_t = μ"
                                    }]
                                });

                                if (Array.isArray(result.data) && result.data.length > 0) {
                                    tables.push({
                                        title: "Mean Fitted Values & Forecasts (ŷ)",
                                        columnHeaders: [
                                            { header: "Observation", key: "observation" },
                                            { header: "Actual y", key: "actual" },
                                            { header: "ŷ (Fitted)", key: "yHat" },
                                            { header: "ε = y − ŷ", key: "error" }
                                        ],
                                        rows: result.data.map((actual: number, index: number) => ({
                                            observation: index + 1,
                                            actual,
                                            yHat: result.coefficients.mu,
                                            error: actual - Number(result.coefficients.mu)
                                        })),
                                        footer: "The fitted mean is estimated from the full sample. The point forecast is ŷ_t = μ̂; the residual is ε̂_t = y_t − ŷ_t."
                                    });
                                }

                                const varRows = [];
                                if (result.coefficients.omega !== undefined) {
                                    varRows.push({
                                        rowHeader: ["C"],
                                        coefficient: result.coefficients.omega,
                                        stdError: result.coefficients.omega_se || "-",
                                        tStat: result.coefficients.omega_z || "-",
                                        pValue: result.coefficients.omega_p || "-"
                                    });
                                }
                                if (Array.isArray(result.coefficients.alpha)) {
                                    result.coefficients.alpha.forEach((a: string, idx: number) => {
                                        varRows.push({
                                            rowHeader: [idx === 0 ? "RESID(-1)^2" : `RESID(-${idx + 1})^2`],
                                            coefficient: a,
                                            stdError: result.coefficients.alpha_se?.[idx] || "-",
                                            tStat: result.coefficients.alpha_z?.[idx] || "-",
                                            pValue: result.coefficients.alpha_p?.[idx] || "-"
                                        });
                                    });
                                }
                                if (Array.isArray(result.coefficients.gamma)) {
                                    result.coefficients.gamma.forEach((g: string, idx: number) => {
                                        varRows.push({
                                            rowHeader: [`Gamma (${idx + 1})`],
                                            coefficient: g,
                                            stdError: result.coefficients.gamma_se?.[idx] || "-",
                                            tStat: result.coefficients.gamma_z?.[idx] || "-",
                                            pValue: result.coefficients.gamma_p?.[idx] || "-"
                                        });
                                    });
                                }
                                if (Array.isArray(result.coefficients.beta)) {
                                    result.coefficients.beta.forEach((b: string, idx: number) => {
                                        varRows.push({
                                            rowHeader: [idx === 0 ? "GARCH(-1)" : `GARCH(-${idx + 1})`],
                                            coefficient: b,
                                            stdError: result.coefficients.beta_se?.[idx] || "-",
                                            tStat: result.coefficients.beta_z?.[idx] || "-",
                                            pValue: result.coefficients.beta_p?.[idx] || "-"
                                        });
                                    });
                                }

                                tables.push({
                                    title: "Variance Equation",
                                    columnHeaders: [
                                        { header: "Variable", key: "rowHeader" },
                                        { header: "Coefficient", key: "coefficient" },
                                        { header: "Std. Error", key: "stdError" },
                                        { header: "z-Statistic", key: "tStat" },
                                        { header: "Prob.", key: "pValue" }
                                    ],
                                    rows: varRows
                                });
                                tables.push({
                                    title: "Variance Equation Specification",
                                    columnHeaders: [
                                        { header: "Model", key: "model" },
                                        { header: "Equation", key: "equation" }
                                    ],
                                    rows: [{
                                        model: modelType,
                                        equation: result.varianceForecastEquation ? `${modelType}: ${result.varianceForecastEquation}` : modelType === "EGARCH"
                                            ? "log(σ²_t) = ω + α·|z_{t-1}| + γ·z_{t-1} + β·log(σ²_{t-1})"
                                            : modelType === "TGARCH"
                                                ? "σ²_t = ω + (α + γ·I(ε_{t-1}<0))·ε²_{t-1} + β·σ²_{t-1}"
                                                : "σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}"
                                    }]
                                });
                            }

                            // Diagnostics Table
                            if (result.diagnostics) {
                                tables.push({
                                    title: "Diagnostics",
                                    columnHeaders: [
                                        { header: "Statistic", key: "statName" },
                                        { header: "Value", key: "statValue" },
                                        { header: "Statistic", key: "statName2" },
                                        { header: "Value", key: "statValue2" }
                                    ],
                                    rows: [
                                        { statName: "R-squared", statValue: result.diagnostics.rSquared, statName2: "Mean dependent var", statValue2: result.diagnostics.meanDependentVar },
                                        { statName: "Adjusted R-squared", statValue: result.diagnostics.adjRSquared, statName2: "S.D. dependent var", statValue2: result.diagnostics.sdDependentVar },
                                        { statName: "S.E. of regression", statValue: result.diagnostics.seRegression, statName2: "Akaike info criterion", statValue2: result.diagnostics.aic },
                                        { statName: "Sum squared resid", statValue: result.diagnostics.sumSquaredResid, statName2: "Schwarz criterion (BIC)", statValue2: result.diagnostics.bic },
                                        { statName: "Log likelihood", statValue: result.diagnostics.logLikelihood, statName2: "Hannan-Quinn criter.", statValue2: result.diagnostics.hq },
                                        { statName: "Durbin-Watson stat", statValue: result.diagnostics.durbinWatson, statName2: "", statValue2: "" }
                                    ]
                                });
                            }

                            // Standard In-Sample Charts
                            const varianceData: number[] = result.variance || [];
                            if (varianceData.length > 0) {
                                const varianceChartData = varianceData.map((v, i) => ({
                                    category: String(i + 1),
                                    value: v
                                }));
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: varianceChartData,
                                    chartMetadata: {
                                        title: "Conditional Variance",
                                        subtitle: `${modelType} Process`
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Time", y: "Variance" }
                                    }
                                }));
                            }

                            const residualsData: number[] = result.residuals || [];
                            if (residualsData.length > 0) {
                                const residualsChartData = residualsData.map((r, i) => ({
                                    category: String(i + 1),
                                    value: r
                                }));
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: residualsChartData,
                                    chartMetadata: {
                                        title: "Residuals",
                                        subtitle: `${modelType} Process`
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Time", y: "Residual" }
                                    }
                                }));
                            }

                            // If Forecast was requested, compute multi-step forecast table
                            if (includeForecast && forecastHorizon > 0 && result.coefficients) {
                                const muVal = parseFloat(result.coefficients.mu) || 0;
                                const omegaVal = parseFloat(result.coefficients.omega) || 0.1;
                                const alphaVals = (result.coefficients.alpha || []).map((v: string) => parseFloat(v) || 0);
                                const betaVals = (result.coefficients.beta || []).map((v: string) => parseFloat(v) || 0);
                                const gammaVals = (result.coefficients.gamma || []).map((v: string) => parseFloat(v) || 0);

                                // Request GARCH_FORECAST from worker or generate inline
                                const H = Math.max(1, Math.min(100, forecastHorizon));
                                const pLen = Math.max(1, effectiveP);
                                const qLen = Math.max(1, qOrder);
                                const histVar = result.variance.slice(-pLen);
                                const histRes = result.residuals.slice(-qLen);

                                const forecastSteps = [];
                                let lastV = histVar[histVar.length - 1] || 1.0;
                                for (let h = 1; h <= H; h++) {
                                    let vNext = omegaVal;
                                    for (let i = 0; i < qLen; i++) {
                                        vNext += (alphaVals[i] || 0) * (histRes[histRes.length - 1 - i] ? Math.pow(histRes[histRes.length - 1 - i], 2) : lastV);
                                    }
                                    for (let j = 0; j < pLen; j++) {
                                        vNext += (betaVals[j] || 0) * lastV;
                                    }
                                    vNext = Math.max(1e-8, vNext);
                                    const vol = Math.sqrt(vNext);
                                    forecastSteps.push({
                                        step: `T + ${h}`,
                                        yHat: muVal.toFixed(4),
                                        variance: vNext.toFixed(4),
                                        volatility: vol.toFixed(4),
                                        lower95: (muVal - 1.96 * vol).toFixed(4),
                                        upper95: (muVal + 1.96 * vol).toFixed(4)
                                    });
                                    lastV = vNext;
                                }

                                tables.push({
                                    title: `Multi-Step Forecast (Horizon = ${H} Periods)`,
                                    columnHeaders: [
                                        { header: "Period", key: "step" },
                                        { header: "ŷ (Mean Forecast)", key: "yHat" },
                                        { header: "σ² (Variance)", key: "variance" },
                                        { header: "σ (Volatility)", key: "volatility" },
                                        { header: "Lower 95% CI", key: "lower95" },
                                        { header: "Upper 95% CI", key: "upper95" }
                                    ],
                                    rows: forecastSteps
                                });

                                // Add Forecast Chart
                                const forecastChartData = forecastSteps.map((f, idx) => ({
                                    category: f.step,
                                    varianceForecast: parseFloat(f.variance),
                                    volatilityForecast: parseFloat(f.volatility)
                                }));

                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: forecastChartData,
                                    chartMetadata: {
                                        title: "Multi-Step Conditional Variance Forecast",
                                        subtitle: `Forecast Horizon: ${H} steps ahead`
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Forecast Step", y: "Variance / Volatility" }
                                    }
                                }));
                            }
                        }

                        // Dispatch Results to Result Store
                        const logMsg = splitConfig.splitEnabled
                            ? `${modelType} Split Data Evaluation on ${variable.name}`
                            : `${modelType} Estimation on ${variable.name}`;
                        const logId = await addLog({ log: logMsg });
                        const analyticId = await addAnalytic(logId, {
                            title: `${modelType} Results`,
                            note: `p=${pOrder}, q=${qOrder}${splitConfig.splitEnabled ? " (Train-Test Split)" : ""}`
                        });

                        await addStatistic(analyticId, {
                            title: `${modelType} Estimation Output`,
                            output_data: JSON.stringify({ tables, charts }),
                            components: "GarchAnalysis",
                            description: `Results for ${modelType} model`
                        });

                        onClose();

                    } catch (err) {
                        console.error("Error processing results:", err);
                        setErrorMsg("Error processing results for display.");
                    } finally {
                        client.release();
                        setIsCalculating(false);
                    }

                } else {
                    setErrorMsg(error || "Unknown worker error");
                    toast.error(`Estimation Failed: ${error}`);
                    client.release();
                    setIsCalculating(false);
                }
            });

            client.onError((err) => {
                console.error("Worker connection error:", err);
                setErrorMsg("Failed to connect to worker");
                setIsCalculating(false);
                client.release();
            });

            if (splitConfig.splitEnabled) {
                client.post({
                    type: "GARCH_SPLIT",
                    payload: {
                        data: returns,
                        p: effectiveP,
                        q: qOrder,
                        modelType,
                        trainRatio: splitConfig.trainRatio,
                        splitMode: splitConfig.splitMode,
                        rollingType: splitConfig.rollingType
                    }
                });
            } else {
                client.post({
                    type: modelType,
                    payload: {
                        data: returns,
                        p: effectiveP,
                        q: qOrder
                    }
                });
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setErrorMsg(errorMessage);
            toast.error(`Analysis Failed: ${errorMessage}`);
            console.error("Analysis error:", error);
            setIsCalculating(false);
        }
    };

    return {
        errorMsg,
        isCalculating,
        handleAnalyzes,
    };
};
