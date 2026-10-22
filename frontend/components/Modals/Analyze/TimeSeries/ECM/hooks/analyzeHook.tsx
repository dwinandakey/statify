import { useState } from "react";
import type { Variable } from "@/types/Variable";
import type { DataRow } from "@/types/Data";
import type { CellUpdate } from "@/stores/useDataStore";
import { toast } from "sonner";
import { ChartService } from "@/services/chart/ChartService";
import { useResultStore } from "@/stores/useResultStore";
import { useVariableStore } from "@/stores/useVariableStore";
import { getTimeSeriesWorker } from "@/utils/timeseriesWorkerPool";
import type { TimeSeriesSplitState } from "../../Common/useTimeSeriesSplit";

export const useAnalyzeHook = (
    dependentVariable: Variable[],
    independentVariable: Variable[],
    data: DataRow[],
    selectedPeriod: any,
    maxLagADF: number,
    saveLongRun: boolean,
    saveShortRun: boolean,
    splitConfig?: TimeSeriesSplitState,
    onSaveSplitToDataView?: (totalRows: number, validRowIndices: number[], splitIndex: number, testPredictions?: number[]) => Promise<void>,
    onClose?: () => void
) => {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const { addLog, addAnalytic, addStatistic } = useResultStore();

    const handleAnalyzes = async () => {
        if (dependentVariable.length === 0 || independentVariable.length === 0) {
            setErrorMsg("Please select both dependent and independent variables");
            return;
        }

        setIsCalculating(true);
        setErrorMsg(null);

        try {

            // Extract Y and X data, ensuring no missing values in any row
            const yVar = dependentVariable[0];
            const yData: number[] = [];
            const xData: number[] = [];
            const n_vars = independentVariable.length;
            const validRowIndices: number[] = [];

            let rIdx = 0;
            for (const row of data) {
                const yValue = row[yVar.columnIndex];
                if (yValue === null || yValue === undefined || isNaN(Number(yValue))) {
                    rIdx++;
                    continue; // Skip rows with missing Y
                }

                let xRowValid = true;
                const xRowValues = [];
                for (const xVar of independentVariable) {
                    const xValue = row[xVar.columnIndex];
                    if (xValue === null || xValue === undefined || isNaN(Number(xValue))) {
                        xRowValid = false;
                        break;
                    }
                    xRowValues.push(Number(xValue));
                }

                if (xRowValid) {
                    yData.push(Number(yValue));
                    xData.push(...xRowValues);
                    validRowIndices.push(rIdx);
                }
                rIdx++;
            }

            if (yData.length < 10) {
                throw new Error("Insufficient data points (minimum 10 required)");
            }

            console.log(`Running ECM Analysis with ${yData.length} observations`);
            console.time("Statify ECM Execution Time");

            const client = getTimeSeriesWorker();

            if (splitConfig?.splitEnabled) {
                client.post({
                    type: "ECM_SPLIT",
                    payload: {
                        y: yData,
                        x: xData,
                        n_vars: n_vars,
                        max_lag_adf: maxLagADF,
                        trainRatio: splitConfig.trainRatio,
                        splitMode: splitConfig.splitMode,
                        rollingType: splitConfig.rollingType
                    }
                });
            } else {
                client.post({
                    type: "ECM",
                    payload: {
                        y: yData,
                        x: xData,
                        n_vars: n_vars,
                        max_lag_adf: maxLagADF,
                    }
                });
            }

            client.onMessage(async (e) => {
                const { status, result, error } = e.data;
                
                if (status === "success") {
                    console.timeEnd("Statify ECM Execution Time");
                    console.log("ECM Results:", result);
                    
                    try {
                        const tables = [];
                        let charts: any[] = [];

                        if (splitConfig?.splitEnabled) {
                            toast.success("ECM split evaluation completed!");

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
                                            ? "Mode 1: Holdout Kronologis (Fixed Split / Dynamic Forecast)"
                                            : `Mode 2: Rolling Window (${splitConfig.rollingType === "expanding" ? "Expanding Window" : "Fixed Window"})`
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
                                        details: `Observasi ${result.trainSize + 1} .. ${yData.length} (${result.testSize} data)`
                                    },
                                    {
                                        setting: "Kointegrasi (ADF on Residuals)",
                                        details: result.cointegration.isCointegrated ? "Terkointegrasi (Hubungan Jangka Panjang Valid)" : "Tidak Terkointegrasi"
                                    }
                                ]
                            });

                            // Long Run Coefficients Table
                            const longRunRows = [];
                            longRunRows.push({
                                var: "C (Intercept)",
                                coef: result.longRun.coefficients[0],
                                se: result.longRun.stdErrors[0],
                                tstat: result.longRun.tStats[0],
                                prob: result.longRun.pValues[0]
                            });
                            for (let i = 0; i < independentVariable.length; i++) {
                                longRunRows.push({
                                    var: independentVariable[i].name,
                                    coef: result.longRun.coefficients[i + 1],
                                    se: result.longRun.stdErrors[i + 1],
                                    tstat: result.longRun.tStats[i + 1],
                                    prob: result.longRun.pValues[i + 1]
                                });
                            }
                            tables.push({
                                title: "Long-Run Cointegration Equation (Estimated on Training Sample)",
                                columnHeaders: [
                                    { header: "Variable", key: "var" },
                                    { header: "Coefficient", key: "coef" },
                                    { header: "Std. Error", key: "se" },
                                    { header: "t-Statistic", key: "tstat" },
                                    { header: "Prob.", key: "prob" }
                                ],
                                rows: longRunRows,
                                footer: `R-squared: ${result.longRun.rSquared ?? ''}`
                            });

                            // Out-of-Sample Forecast Evaluation
                            if (result.metrics) {
                                tables.push({
                                    title: "Out-of-Sample Forecast Accuracy Evaluation (Testing Sample)",
                                    columnHeaders: [
                                        { header: "Metrik Akurasi", key: "metric" },
                                        { header: "Nilai Prediksi Level (ŷ)", key: "val" },
                                        { header: "Keterangan", key: "desc" }
                                    ],
                                    rows: [
                                        { metric: "Root Mean Squared Error (RMSE)", val: result.metrics.rmse, desc: "Akar rerata kuadrat selisih ramalan" },
                                        { metric: "Mean Absolute Error (MAE)", val: result.metrics.mae, desc: "Rerata selisih absolut nilai aktual vs ramalan" },
                                        { metric: "Mean Absolute Percentage Error (MAPE)", val: result.metrics.mape, desc: "Rata-rata persentase galat peramalan" },
                                        { metric: "Theil's Inequality Coefficient (U)", val: result.metrics.theilU, desc: "Ukuran performa peramalan relatif (0 = sempurna)" }
                                    ]
                                });
                            }

                            // Chart: Actual vs Forecast
                            const chartData = [
                                ...result.trainActual.map((act: number, i: number) => ({
                                    category: String(i + 1),
                                    actual: act,
                                    forecast: null
                                })),
                                ...result.testActual.map((act: number, i: number) => ({
                                    category: String(result.trainSize + i + 1),
                                    actual: act,
                                    forecast: result.testYHat[i]
                                }))
                            ];

                            charts.push(ChartService.createChartJSON({
                                chartType: "Line Chart",
                                chartData,
                                chartMetadata: {
                                    title: "ECM: In-Sample Level & Out-of-Sample Forecast",
                                    subtitle: `Split cutoff at observation ${result.trainSize}`
                                },
                                chartConfig: {
                                    axisLabels: { x: "Time Index", y: yVar.name }
                                },
                                chartVariables: {
                                    x: ["category"],
                                    y: ["actual", "forecast"]
                                }
                            }));

                            if (result.longRun?.diagnostics) {
                                const d = result.longRun.diagnostics;
                                tables.push({
                                    title: "Long Run Fit & Diagnostics (Estimated on Training Sample)",
                                    columnHeaders: [
                                        { header: "Statistic", key: "col1" },
                                        { header: "Value", key: "val1" },
                                        { header: "Statistic", key: "col2" },
                                        { header: "Value", key: "val2" }
                                    ],
                                    rows: [
                                        { col1: "R-squared", val1: d.rSquared, col2: "Mean dependent var", val2: d.meanDependentVar },
                                        { col1: "Adjusted R-squared", val1: d.adjRSquared, col2: "S.D. dependent var", val2: d.sdDependentVar },
                                        { col1: "S.E. of regression", val1: d.seRegression, col2: "Akaike info criterion", val2: d.aic },
                                        { col1: "Sum squared resid", val1: d.sumSquaredResid, col2: "Schwarz criterion", val2: d.bic },
                                        { col1: "Log likelihood", val1: d.logLikelihood, col2: "Hannan-Quinn criter.", val2: d.hq },
                                        { col1: "F-statistic", val1: d.fStatistic, col2: "Durbin-Watson stat", val2: d.durbinWatson }
                                    ],
                                    footer: `All long-run and short-run parameters were estimated using training observations 1–${result.trainSize}.`
                                });
                            }

                            if (result.ecm?.diagnostics) {
                                const d = result.ecm.diagnostics;
                                tables.push({
                                    title: "Short Run ECM Fit & Diagnostics (Estimated on Training Sample)",
                                    columnHeaders: [
                                        { header: "Statistic", key: "col1" },
                                        { header: "Value", key: "val1" },
                                        { header: "Statistic", key: "col2" },
                                        { header: "Value", key: "val2" }
                                    ],
                                    rows: [
                                        { col1: "R-squared", val1: d.rSquared, col2: "Mean dependent var", val2: d.meanDependentVar },
                                        { col1: "Adjusted R-squared", val1: d.adjRSquared, col2: "S.D. dependent var", val2: d.sdDependentVar },
                                        { col1: "S.E. of regression", val1: d.seRegression, col2: "Akaike info criterion", val2: d.aic },
                                        { col1: "Sum squared resid", val1: d.sumSquaredResid, col2: "Schwarz criterion", val2: d.bic },
                                        { col1: "Log likelihood", val1: d.logLikelihood, col2: "Hannan-Quinn criter.", val2: d.hq },
                                        { col1: "F-statistic", val1: d.fStatistic, col2: "Durbin-Watson stat", val2: d.durbinWatson }
                                    ],
                                    footer: `Short-run ECM estimated using the training sample (observations 1–${result.trainSize}); testing observations were not used for estimation or diagnostics.`
                                });
                            }

                            const ecmResiduals = result.ecm?.residuals || [];
                            if (ecmResiduals.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: ecmResiduals.map((value: number, index: number) => ({
                                        category: String(index + 1),
                                        value
                                    })),
                                    chartMetadata: {
                                        title: "ECM Residuals",
                                        subtitle: "Short-Run Training Sample"
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Time", y: "Residual" }
                                    }
                                }));
                            }

                            if (Array.isArray(result.correlogram) && result.correlogram.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: result.correlogram.map((row: any) => ({
                                        category: String(row.lag),
                                        value: parseFloat(row.ac)
                                    })),
                                    chartMetadata: {
                                        title: "ECM Residual Correlogram Plot (ACF & PACF)",
                                        subtitle: "Autocorrelation by Lag"
                                    },
                                    chartConfig: {
                                        axisLabels: { x: "Lag", y: "ACF" }
                                    }
                                }));
                            }

                            const longRunValues = result.longRun?.coefficients || [];
                            tables.push({
                                title: `Long Run Regression: ${yVar.name} ~ C + ${independentVariable.map(v => v.name).join(" + ")}`,
                                columnHeaders: [
                                    { header: "Variable", key: "var" },
                                    { header: "Coefficient", key: "coef" },
                                    { header: "Std. Error", key: "se" },
                                    { header: "t-Statistic", key: "tstat" },
                                    { header: "Prob.", key: "prob" }
                                ],
                                rows: longRunValues.map((coef: any, index: number) => ({
                                    var: index === 0 ? "C (Intercept)" : independentVariable[index - 1]?.name || `X${index}`,
                                    coef,
                                    se: result.longRun?.stdErrors?.[index] ?? "-",
                                    tstat: result.longRun?.tStats?.[index] ?? "-",
                                    prob: result.longRun?.pValues?.[index] ?? "-"
                                }))
                            });
                            tables.push({
                                title: "Cointegration Test (ADF on Residuals)",
                                columnHeaders: [{ header: "Statistic", key: "stat" }, { header: "Value", key: "value" }],
                                rows: [
                                    { stat: "ADF statistic", value: result.cointegration?.adfStat ?? result.cointegration?.statistic ?? "-" },
                                    { stat: "Prob.", value: result.cointegration?.pValue ?? "-" },
                                    { stat: "Cointegrated", value: result.cointegration?.isCointegrated ? "Yes" : "No" }
                                ]
                            });
                            const ecmValues = result.ecm?.coefficients || [];
                            tables.push({
                                title: `Short Run (ECM): D(${yVar.name}) ~ C + ECT(-1) + ${independentVariable.map(v => "D(" + v.name + ")").join(" + ")}`,
                                columnHeaders: [
                                    { header: "Variable", key: "var" },
                                    { header: "Coefficient", key: "coef" },
                                    { header: "Std. Error", key: "se" },
                                    { header: "t-Statistic", key: "tstat" },
                                    { header: "Prob.", key: "prob" }
                                ],
                                rows: ecmValues.map((coef: any, index: number) => ({
                                    var: index === 0 ? "C" : index === 1 ? "ECT(-1)" : `D(${independentVariable[index - 2]?.name || "X"})`,
                                    coef,
                                    se: result.ecm?.stdErrors?.[index] ?? "-",
                                    tstat: result.ecm?.tStats?.[index] ?? "-",
                                    prob: result.ecm?.pValues?.[index] ?? "-"
                                }))
                            });
                            tables.push({
                                title: "Classical Assumptions (Residual Diagnostics)",
                                columnHeaders: [{ header: "Test", key: "test" }, { header: "Statistic", key: "stat" }, { header: "Prob.", key: "prob" }],
                                rows: [
                                    { test: "Jarque-Bera", stat: result.diagnostics?.jarqueBera?.stat ?? "-", prob: result.diagnostics?.jarqueBera?.prob ?? "-" },
                                    { test: "Breusch-Godfrey", stat: result.diagnostics?.breuschGodfrey?.stat ?? "-", prob: result.diagnostics?.breuschGodfrey?.prob ?? "-" },
                                    { test: "Breusch-Pagan", stat: result.diagnostics?.breuschPagan?.stat ?? "-", prob: result.diagnostics?.breuschPagan?.prob ?? "-" }
                                ]
                            });
                            tables.push({
                                title: "Correlogram of ECM Residuals (ACF & PACF)",
                                columnHeaders: [{ header: "Lag", key: "lag" }, { header: "AC", key: "ac" }, { header: "PAC", key: "pac" }, { header: "Q-stat", key: "qStat" }, { header: "Prob.", key: "prob" }],
                                rows: result.correlogram || []
                            });
                            tables.push({
                                title: "Model Interpretation",
                                columnHeaders: [{ header: "Interpretation", key: "value" }],
                                rows: [{ value: result.cointegration?.isCointegrated ? "The variables are cointegrated; the ECM describes short-run adjustment toward long-run equilibrium." : "Cointegration was not established; interpret the ECM long-run relation with caution." }]
                            });
                            if (result.longRun?.residuals?.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: result.longRun.residuals.map((value: number, index: number) => ({
                                        category: String(index + 1),
                                        value
                                    })),
                                    chartMetadata: { title: "Equilibrium Error (Residuals)", subtitle: "Long Run Training Sample" },
                                    chartConfig: { axisLabels: { x: "Time", y: "Residual" } }
                                }));
                            }
                            if (result.ecm?.residuals?.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: result.ecm.residuals.map((value: number, index: number) => ({
                                        category: String(index + 1),
                                        value
                                    })),
                                    chartMetadata: { title: "ECM Residuals", subtitle: "Short Run Training Sample" },
                                    chartConfig: { axisLabels: { x: "Time", y: "Residual" } }
                                }));
                            }
                            if (result.correlogram?.length > 0) {
                                charts.push(ChartService.createChartJSON({
                                    chartType: "Line Chart",
                                    chartData: result.correlogram.flatMap((row: any) => [
                                        { category: `${row.lag} ACF`, value: row.ac },
                                        { category: `${row.lag} PACF`, value: row.pac }
                                    ]),
                                    chartMetadata: { title: "ECM Residual Correlogram Plot (ACF & PACF)", subtitle: "Training Sample" },
                                    chartConfig: { axisLabels: { x: "Lag", y: "Correlation" } }
                                }));
                            }
                            tables.push({
                                title: "Model Interpretation Summary (ECM)",
                                columnHeaders: [{ header: "Summary", key: "value" }],
                                rows: [{ value: "Training-only ECM estimates, diagnostics, residuals, and correlogram are reported above; testing observations are reserved for out-of-sample forecast evaluation." }]
                            });

                            if (onSaveSplitToDataView) {
                                await onSaveSplitToDataView(data.length, validRowIndices, result.trainSize, result.testYHat);
                            }

                            const logMsg = `ECM Split Data Evaluation on ${yVar.name}`;
                            const logId = await addLog({ log: logMsg });
                            const analyticId = await addAnalytic(logId, {
                                title: "ECM Split Evaluation Results",
                                note: `Train-Test Split (${Math.round(result.trainRatio * 100)}%)`
                            });

                            await addStatistic(analyticId, {
                                title: "ECM Split Evaluation Output",
                                output_data: JSON.stringify({ tables, charts }),
                                components: "EcmAnalysis",
                                description: "ECM Train-Test Split results"
                            });

                            if (onClose) onClose();
                            return;
                        }

                        const isCointegrated = result.cointegration.isCointegrated;
                        toast.success("ECM estimation completed!");

                        // 1. Long Run Table
                        const longRunRows = [];
                        longRunRows.push({
                            var: "C (Intercept)",
                            coef: result.longRun.coefficients[0],
                            se: result.longRun.stdErrors[0],
                            tstat: result.longRun.tStats[0],
                            prob: result.longRun.pValues[0]
                        });
                        for (let i = 0; i < independentVariable.length; i++) {
                            longRunRows.push({
                                var: independentVariable[i].name,
                                coef: result.longRun.coefficients[i + 1],
                                se: result.longRun.stdErrors[i + 1],
                                tstat: result.longRun.tStats[i + 1],
                                prob: result.longRun.pValues[i + 1]
                            });
                        }

                        tables.push({
                            title: `Long Run Regression: ${yVar.name} ~ C + ${independentVariable.map(v => v.name).join(" + ")}`,
                            columnHeaders: [
                                { header: "Variable", key: "var" },
                                { header: "Coefficient", key: "coef" },
                                { header: "Std. Error", key: "se" },
                                { header: "t-Statistic", key: "tstat" },
                                { header: "Prob.", key: "prob" }
                            ],
                            rows: longRunRows,
                            footer: `R-squared: ${result.longRun.rSquared} | Adjusted R-squared: ${result.longRun.adjRSquared} | F-statistic: ${result.longRun.fStat}`
                        });

                        if (result.longRun?.diagnostics) {
                            const d = result.longRun.diagnostics;
                            tables.push({
                                title: "Long Run Fit & Diagnostics",
                                columnHeaders: [
                                    { header: "Statistic", key: "col1" },
                                    { header: "Value", key: "val1" },
                                    { header: "Statistic", key: "col2" },
                                    { header: "Value", key: "val2" }
                                ],
                                rows: [
                                    { col1: "R-squared", val1: d.rSquared, col2: "Mean dependent var", val2: d.meanDependentVar },
                                    { col1: "Adjusted R-squared", val1: d.adjRSquared, col2: "S.D. dependent var", val2: d.sdDependentVar },
                                    { col1: "S.E. of regression", val1: d.seRegression, col2: "Akaike info criterion", val2: d.aic },
                                    { col1: "Sum squared resid", val1: d.sumSquaredResid, col2: "Schwarz criterion", val2: d.bic },
                                    { col1: "Log likelihood", val1: d.logLikelihood, col2: "Hannan-Quinn criter.", val2: d.hq },
                                    { col1: "F-statistic", val1: d.fStatistic, col2: "Durbin-Watson stat", val2: d.durbinWatson },
                                    { col1: "Prob(F-statistic)", val1: d.probFStatistic, col2: "", val2: "" }
                                ]
                            });
                        }

                        // 2. Cointegration Test Table
                        tables.push({
                            title: "Cointegration Test (ADF on Residuals)",
                            columnHeaders: [
                                { header: "Statistic", key: "col" },
                                { header: "Value", key: "val" }
                            ],
                            rows: [
                                { col: "ADF Statistic", val: result.cointegration.adfStat },
                                { col: "p-value", val: result.cointegration.pValue },
                                { col: "Result", val: isCointegrated ? "Cointegrated" : "Not Cointegrated" }
                            ]
                        });
                        
                        // 3. Short Run ECM Table
                        const ecmRows = [];
                        ecmRows.push({
                            var: "C (Intercept)",
                            coef: result.ecm.coefficients[0],
                            se: result.ecm.stdErrors[0],
                            tstat: result.ecm.tStats[0],
                            prob: result.ecm.pValues[0]
                        });
                        ecmRows.push({
                            var: "ECT(-1)",
                            coef: result.ecm.coefficients[1],
                            se: result.ecm.stdErrors[1],
                            tstat: result.ecm.tStats[1],
                            prob: result.ecm.pValues[1]
                        });
                        for (let i = 0; i < independentVariable.length; i++) {
                            ecmRows.push({
                                var: `D(${independentVariable[i].name})`,
                                coef: result.ecm.coefficients[i + 2],
                                se: result.ecm.stdErrors[i + 2],
                                tstat: result.ecm.tStats[i + 2],
                                prob: result.ecm.pValues[i + 2]
                            });
                        }

                        tables.push({
                            title: `Short Run (ECM): D(${yVar.name}) ~ C + ECT(-1) + ${independentVariable.map(v => "D(" + v.name + ")").join(" + ")}`,
                            columnHeaders: [
                                { header: "Variable", key: "var" },
                                { header: "Coefficient", key: "coef" },
                                { header: "Std. Error", key: "se" },
                                { header: "t-Statistic", key: "tstat" },
                                { header: "Prob.", key: "prob" }
                            ],
                            rows: ecmRows,
                            footer: `R-squared: ${result.ecm.rSquared} | Adjusted R-squared: ${result.ecm.adjRSquared} | F-statistic: ${result.ecm.fStat}`
                        });

                        if (result.ecm?.diagnostics) {
                            const d = result.ecm.diagnostics;
                            tables.push({
                                title: "Short Run ECM Fit & Diagnostics",
                                columnHeaders: [
                                    { header: "Statistic", key: "col1" },
                                    { header: "Value", key: "val1" },
                                    { header: "Statistic", key: "col2" },
                                    { header: "Value", key: "val2" }
                                ],
                                rows: [
                                    { col1: "R-squared", val1: d.rSquared, col2: "Mean dependent var", val2: d.meanDependentVar },
                                    { col1: "Adjusted R-squared", val1: d.adjRSquared, col2: "S.D. dependent var", val2: d.sdDependentVar },
                                    { col1: "S.E. of regression", val1: d.seRegression, col2: "Akaike info criterion", val2: d.aic },
                                    { col1: "Sum squared resid", val1: d.sumSquaredResid, col2: "Schwarz criterion", val2: d.bic },
                                    { col1: "Log likelihood", val1: d.logLikelihood, col2: "Hannan-Quinn criter.", val2: d.hq },
                                    { col1: "F-statistic", val1: d.fStatistic, col2: "Durbin-Watson stat", val2: d.durbinWatson },
                                    { col1: "Prob(F-statistic)", val1: d.probFStatistic, col2: "", val2: "" }
                                ]
                            });
                        }

                        // 4. Classical Assumptions Table
                        tables.push({
                            title: "Classical Assumptions (Residual Diagnostics)",
                            columnHeaders: [
                                { header: "Test", key: "test" },
                                { header: "Statistic", key: "stat" },
                                { header: "Prob.", key: "prob" },
                                { header: "Interpretation", key: "interp" }
                            ],
                            rows: [
                                { 
                                    test: "Normality (Jarque-Bera)", 
                                    stat: result.diagnostics.jarqueBera.stat, 
                                    prob: result.diagnostics.jarqueBera.prob,
                                    interp: parseFloat(result.diagnostics.jarqueBera.prob) > 0.05 ? "Normal" : "Not Normal"
                                },
                                { 
                                    test: "Autocorrelation (Breusch-Godfrey LM)", 
                                    stat: result.diagnostics.breuschGodfrey.stat, 
                                    prob: result.diagnostics.breuschGodfrey.prob,
                                    interp: parseFloat(result.diagnostics.breuschGodfrey.prob) > 0.05 ? "No Autocorrelation" : "Autocorrelation Present"
                                },
                                { 
                                    test: "Heteroskedasticity (Breusch-Pagan)", 
                                    stat: result.diagnostics.breuschPagan.stat, 
                                    prob: result.diagnostics.breuschPagan.prob,
                                    interp: parseFloat(result.diagnostics.breuschPagan.prob) > 0.05 ? "Homoskedastic" : "Heteroskedastic"
                                }
                            ]
                        });

                        // 5. Correlogram of ECM Residuals Table
                        if (result.correlogram && result.correlogram.length > 0) {
                            tables.push({
                                title: "Correlogram of ECM Residuals (ACF & PACF)",
                                columnHeaders: [
                                    { header: "Lag", key: "lag" },
                                    { header: "Autocorrelation (AC)", key: "ac" },
                                    { header: "Partial Correlation (PAC)", key: "pac" },
                                    { header: "Q-Stat", key: "qStat" },
                                    { header: "Prob.", key: "pValue" }
                                ],
                                rows: result.correlogram.map((item: any) => ({
                                    lag: item.lag,
                                    ac: item.ac,
                                    pac: item.pac,
                                    qStat: item.qStat,
                                    pValue: item.prob
                                })),
                                footer: "Ljung-Box Q-statistic tests for null hypothesis of zero autocorrelation up to lag k."
                            });
                        }

                        // 6. Interpretations Summary
                        const ectCoef = parseFloat(result.ecm.coefficients[1]);
                        const ectProb = parseFloat(result.ecm.pValues[1]);
                        
                        let ecmInterpretation = "";
                        if (ectCoef < 0 && ectProb < 0.05) {
                            ecmInterpretation = `ECM is valid. The Error Correction Term (ECT) is negative and significant (p = ${ectProb.toFixed(4)}), indicating adjustment towards long-run equilibrium at a speed of ${Math.abs(ectCoef * 100).toFixed(2)}% per period.`;
                        } else if (ectCoef >= 0) {
                            ecmInterpretation = `ECM might not be valid. ECT is positive (Coef = ${ectCoef.toFixed(4)}). A valid ECM requires a negative ECT to pull the system back to equilibrium.`;
                        } else {
                            ecmInterpretation = `ECM is not statistically significant because ECT is negative but has a p-value > 0.05 (p = ${ectProb.toFixed(4)}).`;
                        }

                        tables.push({
                            title: "Model Interpretation",
                            columnHeaders: [
                                { header: "Component", key: "col" },
                                { header: "Description", key: "val" }
                            ],
                            rows: [
                                { col: "Cointegration", val: isCointegrated ? "Variables are cointegrated (Long-run relationship exists)." : "Variables are NOT cointegrated." },
                                { col: "Short-Run ECM", val: ecmInterpretation }
                            ]
                        });

                        charts = [];

                        if (result.longRun?.residuals?.length > 0) {
                            const resData = result.longRun.residuals.map((val: number, i: number) => ({
                                category: String(i + 1),
                                value: val
                            }));
                            const residualsChart = ChartService.createChartJSON({
                                chartType: "Line Chart",
                                chartData: resData,
                                chartMetadata: { title: "Equilibrium Error (Residuals)", subtitle: "Long Run" },
                                chartConfig: { axisLabels: { x: "Time", y: "Residual" } }
                            });
                            charts.push(residualsChart);
                        }

                        if (result.ecm?.residuals?.length > 0) {
                            const ecmResData = result.ecm.residuals.map((val: number, i: number) => ({
                                category: String(i + 1),
                                value: val
                            }));
                            const ecmResidualsChart = ChartService.createChartJSON({
                                chartType: "Line Chart",
                                chartData: ecmResData,
                                chartMetadata: { title: "ECM Residuals", subtitle: "Short Run" },
                                chartConfig: { axisLabels: { x: "Time", y: "Residual" } }
                            });
                            charts.push(ecmResidualsChart);
                        }

                        // ACF & PACF Correlogram Chart for ECM
                        if (result.correlogram && result.correlogram.length > 0) {
                            const acfPacfData: Array<{ category: string; subcategory: string; value: number }> = [];
                            result.correlogram.forEach((item: any) => {
                                acfPacfData.push({
                                    category: String(item.lag),
                                    subcategory: "ACF",
                                    value: parseFloat(item.ac)
                                });
                                acfPacfData.push({
                                    category: String(item.lag),
                                    subcategory: "PACF",
                                    value: parseFloat(item.pac)
                                });
                            });

                            const correlogramChart = ChartService.createChartJSON({
                                chartType: "Multiple Line Chart",
                                chartData: acfPacfData,
                                chartVariables: { x: ["lag"], y: ["ACF", "PACF"] },
                                chartMetadata: { 
                                    title: "ECM Residual Correlogram Plot (ACF & PACF)", 
                                    subtitle: "Autocorrelation & Partial Correlation by Lag" 
                                },
                                chartConfig: { 
                                    axisLabels: { x: "Lag", y: "Correlation" },
                                    chartColor: ["#2563eb", "#dc2626"]
                                }
                            });
                            charts.push(correlogramChart);
                        }

                        // Save residuals if requested
                        if (saveLongRun || saveShortRun) {
                            const currentVarCount = useVariableStore.getState().variables.length;
                            const existingVars = useVariableStore.getState().variables.map(v => v.name);
                            
                            const findNextNumber = (prefix: string) => {
                                const pattern = new RegExp(`^${prefix}_(\\d+)$`);
                                let maxNum = 0;
                                existingVars.forEach(name => {
                                    const match = name.match(pattern);
                                    if (match) {
                                        const num = parseInt(match[1], 10);
                                        if (num > maxNum) maxNum = num;
                                    }
                                });
                                return maxNum + 1;
                            };

                            const varsForStore: Partial<Variable>[] = [];
                            const aggregatedUpdates: CellUpdate[] = [];
                            let addedVarsCount = 0;

                            if (saveLongRun && result.longRun?.residuals) {
                                const resNumber = findNextNumber("RES_LR");
                                const varIndex = currentVarCount + addedVarsCount;
                                
                                varsForStore.push({
                                    name: `RES_LR_${resNumber}`,
                                    label: `Long-Run Residuals - ECM`,
                                    type: "NUMERIC" as const,
                                    width: 12,
                                    decimals: 5,
                                    measure: "scale" as const,
                                    columnIndex: varIndex,
                                    values: []
                                });
                                
                                const lrResids = result.longRun.residuals;
                                lrResids.forEach((val: number, i: number) => {
                                    const origRowIdx = validRowIndices[i];
                                    if (origRowIdx !== undefined) {
                                        aggregatedUpdates.push({
                                            row: origRowIdx,
                                            col: varIndex,
                                            value: Number(val.toFixed(5)),
                                        });
                                    }
                                });
                                addedVarsCount++;
                            }

                            if (saveShortRun && result.ecm?.residuals) {
                                const resNumber = findNextNumber("RES_SR");
                                const varIndex = currentVarCount + addedVarsCount;
                                
                                varsForStore.push({
                                    name: `RES_SR_${resNumber}`,
                                    label: `Short-Run ECM Residuals - ECM`,
                                    type: "NUMERIC" as const,
                                    width: 12,
                                    decimals: 5,
                                    measure: "scale" as const,
                                    columnIndex: varIndex,
                                    values: []
                                });
                                
                                const ecmResids = result.ecm.residuals;
                                ecmResids.forEach((val: number, i: number) => {
                                    const origRowIdx = validRowIndices[1 + i]; // short-run starts at index 1 in ECM
                                    if (origRowIdx !== undefined) {
                                        aggregatedUpdates.push({
                                            row: origRowIdx,
                                            col: varIndex,
                                            value: Number(val.toFixed(5)),
                                        });
                                    }
                                });
                                addedVarsCount++;
                            }

                            if (varsForStore.length > 0) {
                                await useVariableStore.getState().addVariables(varsForStore, aggregatedUpdates);
                                toast.success("Residuals saved to dataset successfully!");
                            }
                        }

                        // Dispatch
                        const logMsg = `ECM: ${yVar.name} vs ${independentVariable.map(v => v.name).join(", ")}`;
                        const logId = await addLog({ log: logMsg });
                        const analyticId = await addAnalytic(logId, { title: "ECM Analysis", note: "Error Correction Model" });

                        await addStatistic(analyticId, {
                            title: "ECM Output",
                            output_data: JSON.stringify({ tables, charts }),
                            components: "EcmAnalysis",
                            description: "Cointegration and Error Correction results"
                        });
                        
                        setTimeout(() => {
                            onClose?.();
                            client.release();
                        }, 1500);

                    } catch (err) {
                        console.error("Processing Error", err);
                        setErrorMsg("Failed to process results.");
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

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            setErrorMsg(errorMessage);
            toast.error(`ECM Estimation Failed: ${errorMessage}`);
            console.error("ECM estimation error:", error);
            setIsCalculating(false);
        }
    };

    return {
        errorMsg,
        isCalculating,
        handleAnalyzes,
    };
};
