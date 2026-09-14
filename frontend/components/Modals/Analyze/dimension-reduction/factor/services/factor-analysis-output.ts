//  perbaikan bisa (9/1/2026)
//  REVISI: Mengelompokkan semua output dalam satu blok "Factor Analysis" (28/1/2026)
//  REVISI: Menambahkan style syntax log untuk Factor Analysis (29/1/2026)

import {FactorFinalResultType} from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor-worker";
import {Table} from "@/types/Table";
import {useResultStore} from "@/stores/useResultStore";
import {useDataStore, ColumnData} from "@/stores/useDataStore";
import {useVariableStore} from "@/stores/useVariableStore";
import {generateFactorAnalysisLog} from "./factor-log-generator";

// fungsi untuk membantu muncul variables baru dengan nama unik saat save as variables 
function generateUniqueFactorNames(
    existingVariableNames: string[],
    factorScores: Array<{ variable_name: string; values: number[] }>
): Map<string, string> {
    const nameMap = new Map<string, string>();
    
    // Extract suffix numbers dari kolom existing yang match pattern FACx_y
    const factorPattern = /^FAC(\d+)_(\d+)$/;
    const maxSuffixByFactor = new Map<number, number>();
    
    for (const varName of existingVariableNames) {
        const match = varName.match(factorPattern);
        if (match) {
            const factorNum = parseInt(match[1]);
            const suffix = parseInt(match[2]);
            const currentMax = maxSuffixByFactor.get(factorNum) || 0;
            maxSuffixByFactor.set(factorNum, Math.max(currentMax, suffix));
        }
    }
    
    // Cari suffix tertinggi across all factors untuk consistency
    const maxSuffix = Math.max(0, ...Array.from(maxSuffixByFactor.values()));
    const newSuffix = maxSuffix + 1;
    
    // Generate new unique names dengan suffix yang sama untuk semua factor scores
    for (const score of factorScores) {
        const match = score.variable_name.match(factorPattern);
        if (match) {
            const factorNum = parseInt(match[1]);
            const newName = `FAC${factorNum}_${newSuffix}`;
            nameMap.set(score.variable_name, newName);
        } else {
            // Jika tidak match pattern (shouldn't happen), keep original name
            nameMap.set(score.variable_name, score.variable_name);
        }
    }
    
    return nameMap;
}

export async function resultFactorAnalysis({
    formattedResult,
    configData,
}: FactorFinalResultType) {
    try {
        const { addLog, addAnalytic, addStatistic } = useResultStore.getState();

        const findTable = (key: string) => {
            const foundTable = formattedResult.tables.find(
                (table: Table) => table.key === key
            );
            return foundTable ? JSON.stringify({ tables: [foundTable] }) : null;
        };


        const findRawTable = (key: string): Table | null => {
    const table = formattedResult.tables.find(
        (table: Table) => table.key === key
    );

    if (!table) {
        console.warn(`[FactorAnalysis] Table '${key}' not found`);
        return null;
    }

    return table;
};

        // Helper untuk extract description dari table interpretation
        const getTableDescription = (key: string, defaultText: string): string => {
            const rawTable = findRawTable(key);
            return rawTable?.interpretation || defaultText;
        };

        const analysisStatus = formattedResult.analysisStatus;
        const hasSuccessfulExtraction = Boolean(
            analysisStatus?.isConverged && analysisStatus.extractedFactors > 0
        );


        const factorAnalysisResult = async () => {
            /*
             *  Create Log and Single Analytic Group for Factor Analysis
             *  Semua output akan dikelompokkan dalam satu blok "Factor Analysis"
             *  Generate style syntax log berdasarkan konfigurasi yang dipilih user
             * */
            const extractionMethod = configData.extraction.Method;
            const showScreePlot = configData.extraction.Scree === true;

            const logMessage = generateFactorAnalysisLog(configData);
            const logId = await addLog({ log: logMessage });
            
            // Satu analyticId untuk semua statistik output 
            const analyticId = await addAnalytic(logId, {
                title: `Factor Analysis`,
                note: "",
            });

            /*
             *  Descriptive Statistics Result 
             * */
            const descriptiveStatistics = findTable("descriptive_statistics");
            if (descriptiveStatistics) {
                await addStatistic(analyticId, {
                    title: `Descriptive Statistics`,
                    description: getTableDescription("descriptive_statistics", "Descriptive Statistics"),
                    output_data: descriptiveStatistics,
                    components: `Descriptive Statistics`,
                });
            }

            /*
             *  Correlation Matrix Result 
             * */
            const correlationMatrix = findTable("correlation_matrix");
            if (correlationMatrix) {
                const tableDescription = getTableDescription("correlation_matrix", "Correlation Matrix");
                
                await addStatistic(analyticId, {
                    title: `Correlation Matrix`,
                    description: tableDescription,
                    output_data: correlationMatrix,
                    components: `Correlation Matrix`,
                });
            }

            /*
             *  Inverse Correlation Matrix Result 
             * */
            const inverseCorrelationMatrix = findTable(
                "inverse_correlation_matrix"
            );
            if (inverseCorrelationMatrix) {
                await addStatistic(analyticId, {
                    title: `Inverse of Correlation Matrix`,
                    description: getTableDescription("inverse_correlation_matrix", "Inverse of Correlation Matrix"),
                    output_data: inverseCorrelationMatrix,
                    components: `Inverse of Correlation Matrix`,
                });
            }

            /*
             *  Covariance Matrix Result 
             * */
            const covarianceMatrix = findTable("covariance_matrix");
            if (covarianceMatrix) {
                const tableDescription = getTableDescription("covariance_matrix", "Covariance Matrix");
                
                await addStatistic(analyticId, {
                    title: `Covariance Matrix`,
                    description: tableDescription,
                    output_data: covarianceMatrix,
                    components: `Covariance Matrix`,
                });
            }

            /*
             *  Inverse Covariance Matrix Result 
             * */
            const inverseCovarianceMatrix = findTable(
                "inverse_covariance_matrix"
            );
            if (inverseCovarianceMatrix) {
                await addStatistic(analyticId, {
                    title: `Inverse of Covariance Matrix`,
                    description: `Inverse of Covariance Matrix`,
                    output_data: inverseCovarianceMatrix,
                    components: `Inverse of Covariance Matrix`,
                });
            }

            /*
             *  KMO and Bartlett's Test Result 
             * */
            const kmoBartlettsTest = findTable("kmo_bartletts_test");
            if (kmoBartlettsTest) {
                await addStatistic(analyticId, {
                    title: `KMO and Bartlett's Test`,
                    description: getTableDescription("kmo_bartletts_test", "KMO and Bartlett's Test"),
                    output_data: kmoBartlettsTest,
                    components: `KMO and Bartlett's Test`,
                });
            }

            /*
             *  Anti-image Matrices Result 
             * */
            const antiImageMatrices = findTable("anti_image_matrices");
            if (antiImageMatrices) {
                await addStatistic(analyticId, {
                    title: `Anti-image Matrices`,
                    description: getTableDescription("anti_image_matrices", "Anti-image Matrices"),
                    output_data: antiImageMatrices,
                    components: `Anti-image Matrices`,
                });
            }

            /*
             *  Communalities Result 
             * */
            const communalities = findTable("communalities");
            if (communalities) {
                await addStatistic(analyticId, {
                    title: `Communalities`,
                    description: getTableDescription("communalities", "Communalities"),
                    output_data: communalities,
                    components: `Communalities`,
                });
            }

            /*
             *  Total Variance Explained Result 
             * */
            const totalVarianceExplained = findTable("total_variance_explained");

            if (totalVarianceExplained) {
                await addStatistic(analyticId, {
                    title: `Total Variance Explained`,
                    description: getTableDescription("total_variance_explained", "Total Variance Explained"),
                    output_data: totalVarianceExplained,
                    components: `Total Variance Explained`,
                });
            } else {
                console.warn("Total Variance Explained table not found in formatted results!");
            }

            /*
             *  Goodness-of-fit Test Result
             *  Only for GLS and ML methods
             * */
            const isGLSOrML = extractionMethod === "GeneralizedLeastSqr" || extractionMethod === "MaxLikelihood";
            const goodnessOfFitTest = findTable("goodness_of_fit_test");
            if (goodnessOfFitTest && hasSuccessfulExtraction && isGLSOrML) {
                await addStatistic(analyticId, {
                    title: `Goodness-of-fit Test`,
                    description: getTableDescription("goodness_of_fit_test", "Goodness-of-fit Test"),
                    output_data: goodnessOfFitTest,
                    components: `Goodness-of-fit Test`,
                });
            }

            /*
             * Scree Plot Chart
             * Menampilkan Diagram Scree Plot
             * */
            const chartData = (formattedResult as any).screePlotChart;
            
            if (chartData && showScreePlot) {
                await addStatistic(analyticId, {
                    title: `Scree Plot`,
                    description: `Eigenvalues vs Component Number`,
                    output_data: JSON.stringify(chartData),
                    components: "ScreePlot", 
                });
            }


            /*
             * Component Matrix Result 
             * */
            const componentMatrix = findTable("component_matrix");
            const componentMatrixRaw = findRawTable("component_matrix");
            if (componentMatrix && componentMatrixRaw) {
                const tableTitle = componentMatrixRaw.title;
                await addStatistic(analyticId, {
                    title: tableTitle,
                    description: getTableDescription("component_matrix", tableTitle),
                    output_data: componentMatrix,
                    components: tableTitle,
                });
            }

            /*
             * Reproduced Correlations Result 
             * */
            const reproducedCorrelations = findTable("reproduced_correlations");
            if (reproducedCorrelations && hasSuccessfulExtraction) {
                await addStatistic(analyticId, {
                    title: `Reproduced Correlations`,
                    description: getTableDescription("reproduced_correlations", "Reproduced Correlations"),
                    output_data: reproducedCorrelations,
                    components: `Reproduced Correlations`,
                });
            }

            /*
             * Reproduced Covariances Result 
             * */
            const reproducedCovariances = findTable("reproduced_covariances");
            if (reproducedCovariances && hasSuccessfulExtraction && configData.extraction.Covariance === true) {
                await addStatistic(analyticId, {
                    title: `Reproduced Covariances`,
                    // description: `Reproduced Covariances`,
                    description: getTableDescription("reproduced_covariances", "Reproduced Covariances"),
                    output_data: reproducedCovariances,
                    components: `Reproduced Covariances`,
                });
            }

            /*
             * Rotated Component Matrix Result
             * */
            const rotatedComponentMatrix = findTable(
                "rotated_component_matrix"
            );
            const rotatedComponentMatrixRaw = findRawTable(
                "rotated_component_matrix"
            );
            if (rotatedComponentMatrix && rotatedComponentMatrixRaw && hasSuccessfulExtraction) {
                const tableTitle = rotatedComponentMatrixRaw.title;
                await addStatistic(analyticId, {
                    title: tableTitle,
                    description: getTableDescription("rotated_component_matrix", tableTitle),
                    output_data: rotatedComponentMatrix,
                    components: tableTitle,
                });
            }

            /*
             * Component Transformation Matrix Result
             * */
            const componentTransformationMatrix = findTable(
                "component_transformation_matrix"
            );
            const componentTransformationMatrixRaw = findRawTable(
                "component_transformation_matrix"
            );
            if (componentTransformationMatrix && componentTransformationMatrixRaw && hasSuccessfulExtraction) {
                const tableTitle = componentTransformationMatrixRaw.title;
                await addStatistic(analyticId, {
                    title: tableTitle,
                    description: getTableDescription("component_transformation_matrix", tableTitle),
                    output_data: componentTransformationMatrix,
                    components: tableTitle,
                });
            }

            /*
             * Pattern Matrix Result
             * */
            const patternMatrix = findTable("pattern_matrix");
            if (patternMatrix && hasSuccessfulExtraction) {
                await addStatistic(analyticId, {
                    title: `Pattern Matrix`,
                    // description: `Pattern Matrix`,
                    description: getTableDescription("pattern_matrix", "Pattern Matrix"),
                    output_data: patternMatrix,
                    components: `Pattern Matrix`,
                });
            }

            /*
             * Structure Matrix Result
             * */
            const structureMatrix = findTable("structure_matrix");
            if (structureMatrix && hasSuccessfulExtraction) {
                await addStatistic(analyticId, {
                    title: `Structure Matrix`,
                    // description: `Structure Matrix`,
                    description: getTableDescription("structure_matrix", "Structure Matrix"),
                    output_data: structureMatrix,
                    components: `Structure Matrix`,
                });
            }

            /*
             * Component Correlation Matrix Result
             * */
            const componentCorrelationMatrix = findTable(
                "component_correlation_matrix"
            );
            const componentCorrelationMatrixRaw = findRawTable(
                "component_correlation_matrix"
            );
            if (componentCorrelationMatrix && componentCorrelationMatrixRaw && hasSuccessfulExtraction) {
                const tableTitle = componentCorrelationMatrixRaw.title;
                await addStatistic(analyticId, {
                    title: tableTitle,
                    description: tableTitle,
                    output_data: componentCorrelationMatrix,
                    components: tableTitle,
                });
            }

            if (configData.scores.DisplayFactor) {
                /*
                 * Component Score Coefficient Matrix Result 
                 * */
                const componentScoreCoefficientMatrix = findTable(
                    "component_score_coefficient_matrix"
                );
                const componentScoreCoefficientMatrixRaw = findRawTable(
                    "component_score_coefficient_matrix"
                );
                // PERBAIKAN: Tampilkan table jika ada, meskipun extraction gagal (non-positive definite matrix)
                // Pseudoinverse fallback di Rust memastikan matrix tetap tersedia
                if (componentScoreCoefficientMatrix && componentScoreCoefficientMatrixRaw) {
                    const tableTitle = componentScoreCoefficientMatrixRaw.title;
                    await addStatistic(analyticId, {
                        title: tableTitle,
                        description: getTableDescription("component_score_coefficient_matrix", tableTitle),
                        output_data: componentScoreCoefficientMatrix,
                        components: tableTitle,
                    });
                }

                /*
                 * Component Score Covariance Matrix Result 
                 * */
                const componentScoreCovarianceMatrix = findTable(
                    "component_score_covariance_matrix"
                );
                const componentScoreCovarianceMatrixRaw = findRawTable(
                    "component_score_covariance_matrix"
                );
                // PERBAIKAN: Tampilkan table jika ada, meskipun extraction gagal (non-positive definite matrix)
                if (componentScoreCovarianceMatrix && componentScoreCovarianceMatrixRaw) {
                    const tableTitle = componentScoreCovarianceMatrixRaw.title;
                    await addStatistic(analyticId, {
                        title: tableTitle,
                        description: getTableDescription("component_score_covariance_matrix", tableTitle),
                        output_data: componentScoreCovarianceMatrix,
                        components: tableTitle,
                    });
                }
            }

              /*
             * Loading Plot  
             */
            // Ambil data dari Rust (sesuai struct baru)
            const loadingPlotDataRaw = (formattedResult as any).loadingPlotChart;

            if (loadingPlotDataRaw && hasSuccessfulExtraction) {
                // Kita simpan data mentah saja (JSON), karena komponen React yang akan mengolahnya
                const chartPayload = {
                    type: "PLOTLY_LOADING_PLOT", // Penanda untuk Frontend merender komponen yg benar
                    data: loadingPlotDataRaw
                };

                await addStatistic(analyticId, {
                    title: `Loading Plot`,
                    description: `Factor Loadings (${loadingPlotDataRaw.axis_labels.length} Components)`,
                    // Simpan JSON mentah ini ke database/state
                    output_data: JSON.stringify(chartPayload),
                    components: "LoadingPlot", 
                });
            }
        };

        await factorAnalysisResult();

        /*
         * Save Factor Scores as Variables (Save as Variables Logic) 
         * */
        if (hasSuccessfulExtraction && configData.scores.SaveVar && formattedResult.factorScores && formattedResult.factorScores.length > 0) {
            try {
                // Get stores
                const dataStore = useDataStore.getState();
                const variableStore = useVariableStore.getState();

                // Step 0: Generate unique factor variable names (FAC1_1, FAC2_1, FAC1_2, etc)
                const existingVariableNames = variableStore.variables.map(v => v.name);
                const uniqueFactorNames = generateUniqueFactorNames(existingVariableNames, formattedResult.factorScores);

                // Convert factor scores to ColumnData format with unique names applied
                const columnDataList: ColumnData[] = formattedResult.factorScores.map((score: any) => {
                    const uniqueName = uniqueFactorNames.get(score.variable_name) || score.variable_name;
                    return {
                        variable_name: uniqueName,
                        values: score.values,
                    };
                });

                // Step 1: Inject data values into the grid
                const { startColumnIndex, endColumnIndex } = await dataStore.addVariableColumns(columnDataList);

                // Step 2: Register variable metadata WITHOUT manipulating the data structure
                // This prevents column shifting and ensures proper header/data alignment
                if (startColumnIndex >= 0 && endColumnIndex >= 0) {
                    const newVariablesData = columnDataList.map((column, index) => ({
                        columnIndex: startColumnIndex + index,
                        name: column.variable_name,
                        type: 'NUMERIC' as const,
                        width: 8,
                        decimals: 2,
                        label: `Factor Score: ${column.variable_name}`,
                        values: [],
                        missing: null,
                        columns: 64,
                        align: 'right' as const,
                        measure: 'scale' as const,
                        role: 'input' as const,
                    }));

                    // Use registerVariableMetadata instead of addVariables to avoid column shifting
                    // registerVariableMetadata only updates the metadata, preserving the data structure
                    await variableStore.registerVariableMetadata(newVariablesData);

                    // Save variable metadata to database
                    await variableStore.saveVariables();
                }
            } catch (error) {
                console.error("Failed to inject factor scores into data grid:", error);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
