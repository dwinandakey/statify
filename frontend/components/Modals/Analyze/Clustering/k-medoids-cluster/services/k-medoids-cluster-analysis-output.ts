// k-medoids-cluster-analysis-output.ts
import { useResultStore } from "@/stores/useResultStore";
import type { Table } from "@/types/Table";
import type { Variable } from "@/types/Variable";

interface ClusteringResult {
    labels: number[];
    medoids: number[];
    cost: number;
    iterations: number;
    converged: boolean;
}

interface AutomaticKSelection {
    method: string;
    testedRange: { min: number; max: number };
    scores: Array<{ k: number; score: number }>;
    optimalK: number;
    optimalScore: number;
}

interface ClusteringConfig {
    options?: {
        NormalizationMethod?: "none" | "zscore" | "minmax";
        Standardize?: boolean;
    };
    iterate: {
        Method?: string;
        NormalizationMethod?: "none" | "zscore" | "minmax";
        Standardize?: boolean;
    };
    results: {
        ShowCaseCount: boolean;
        ShowIterationHistory: boolean;
    };
    main: {
        Cluster: number;
        DistanceMetric?: string;
    };
}

function resolveNormalizationLabel(config: ClusteringConfig): string | null {
    const method = config.options?.NormalizationMethod ?? config.iterate.NormalizationMethod;
    if (method === "zscore") return "Z-score Standardization";
    if (method === "minmax") return "Min-Max Normalization";

    const hasStandardizeFlag = config.options?.Standardize !== undefined || config.iterate.Standardize !== undefined;
    const standardizeFlag = config.options?.Standardize ?? config.iterate.Standardize;

    if (hasStandardizeFlag) {
        return standardizeFlag ? "Z-score Standardization" : null;
    }

    return null;
}

function resolveDistanceMetricLabel(metric?: string): string {
    return metric === "manhattan" ? "Manhattan" : "Euclidean";
}

interface KMedoidsAnalysisResult {
    success: boolean;
    message: string;
    result: ClusteringResult;
    config: ClusteringConfig;
    automaticKSelection?: AutomaticKSelection;
}

type DataRow = Record<string, string | number | boolean | null | undefined>;

export async function resultKMedoidsCluster(
    analysisResult: KMedoidsAnalysisResult,
    dataVariables: DataRow[],
    variables: Variable[]
) {
    try {
        const { addLog, addAnalytic, addStatistic } = useResultStore.getState();
        const { result, config, automaticKSelection } = analysisResult;

        // Validate result structure
        if (!result?.labels || !Array.isArray(result.labels)) {
            throw new Error("Clustering result is missing required fields (labels, medoids, etc.)");
        }

        // Create main log
        const method = config.iterate.Method ?? "PAM";
        const titleMessage = `K-Medoids Cluster Analysis (${method})`;
        const logId = await addLog({ log: titleMessage });
        const normalizationLabel = resolveNormalizationLabel(config);
        const distanceMetricLabel = resolveDistanceMetricLabel(config.main.DistanceMetric);

        // Collect all tables
        const allTables: Table[] = [];

        // 📊 Case Processing Summary
        const validCases = dataVariables.length;
        const missingCases = 0;
        const outlierCases = 0;
        allTables.push({
            key: "case_processing_summary",
            title: "Case Processing Summary",
            columnHeaders: [
                { header: "Case Status", key: "caseStatus" },
                { header: "N", key: "count" },
                { header: "Percentage (%)", key: "percentage" },
            ],
            rows: [
                {
                    rowHeader: [],
                    caseStatus: "Valid",
                    count: validCases.toString(),
                    percentage: validCases > 0 ? "100.0" : "0.0",
                },
                {
                    rowHeader: [],
                    caseStatus: "Missing",
                    count: missingCases.toString(),
                    percentage: "0.0",
                },
                {
                    rowHeader: [],
                    caseStatus: "Outlier",
                    count: outlierCases.toString(),
                    percentage: "0.0",
                },
                {
                    rowHeader: [],
                    caseStatus: "Total",
                    count: validCases.toString(),
                    percentage: "100.0",
                },
            ],
        });

        // 📈 Number of Cases per Cluster (Cluster Summary)
        if (config.results.ShowCaseCount) {
            const clusterCounts: Record<number, number> = {};
            result.labels.forEach(label => {
                clusterCounts[label] = (clusterCounts[label] ?? 0) + 1;
            });

            allTables.push({
                key: "cluster_summary",
                title: "Number of Cases in each Cluster",
                columnHeaders: [
                    { header: "Cluster" },
                    { header: "Number of Cases" },
                    { header: "% of Total" }
                ],
                rows: Object.entries(clusterCounts).map(([cluster, count]) => ({
                    rowHeader: [],
                    Cluster: `Cluster ${parseInt(cluster) + 1}`,
                    Cases: count,
                    Percent: `${((count / validCases) * 100).toFixed(1)}%`
                }))
            });
        }

        // 📋 Cluster Profiles (always shown)
        const clusterProfiles = Array.from({ length: config.main.Cluster }, (_, clusterIdx) => {
            const clusterMembers = dataVariables.filter((_, rowIndex) => result.labels[rowIndex] === clusterIdx);
            const size = clusterMembers.length;
            const percentage = validCases > 0 ? (size / validCases) * 100 : 0;

            const row: Record<string, string | number> = {
                Cluster: `Cluster ${clusterIdx + 1}`,
                Size: size,
                Percentage: `${percentage.toFixed(1)}%`,
                MedoidID: result.medoids[clusterIdx] !== undefined ? `★ ${result.medoids[clusterIdx] + 1}` : "N/A",
            };

            variables.forEach((variable) => {
                const values = clusterMembers
                    .map((member) => member[variable.name])
                    .filter((value): value is number => typeof value === "number" && isFinite(value));

                row[`Avg_${variable.name}`] = values.length > 0
                    ? (values.reduce((total, value) => total + value, 0) / values.length).toFixed(4)
                    : "N/A";
            });

            return {
                rowHeader: [],
                ...row,
            };
        });

        allTables.push({
            key: "cluster_profiles",
            title: "Cluster Profiles",
            columnHeaders: [
                { header: "Cluster", key: "Cluster" },
                { header: "Size", key: "Size" },
                { header: "Percentage (%)", key: "Percentage" },
                { header: "Medoid ID", key: "MedoidID" },
                { header: "Silhouette", key: "Silhouette" },
                ...variables.map((v) => ({ header: `Avg ${v.label ?? v.name}`, key: `Avg_${v.name}` })),
            ],
            rows: clusterProfiles,
        });

        // 🎯 Final Cluster Centers (Medoids) - always shown
        const medoidData = result.medoids.map((medoidIdx, clusterIdx) => {
            const medoidRow = dataVariables[medoidIdx];
            const row: Record<string, string | number> = {
                Cluster: `Cluster ${clusterIdx + 1}`,
                CaseNumber: medoidIdx + 1
            };
            variables.forEach(v => {
                const value = medoidRow[v.name];
                row[v.name] = typeof value === "number" ? value.toFixed(4) : String(value ?? "");
            });
            return { rowHeader: [] as string[], ...row };
        });

        allTables.push({
            key: "final_cluster_centers",
            title: "Final Cluster Centers (Medoids)",
            columnHeaders: [
                { header: "Cluster" },
                { header: "Case #" },
                ...variables.map(v => ({ header: v.label ?? v.name }))
            ],
            rows: medoidData
        });

        // 💰 Total Cost / Dissimilarity (always shown)
        allTables.push({
            key: "total_cost",
            title: "Total Within-Cluster Dissimilarity",
            columnHeaders: [
                { header: "Metric" },
                { header: "Value" }
            ],
            rows: [
                {
                    rowHeader: [],
                    Metric: "Total Cost (Sum of Distances)",
                    Value: result.cost.toFixed(4)
                },
                {
                    rowHeader: [],
                    Metric: "Average Distance to Medoid",
                    Value: (result.cost / dataVariables.length).toFixed(4)
                }
            ]
        });

        // 📊 Iteration History & Convergence Information
        if (config.results.ShowIterationHistory) {
            allTables.push({
                key: "iteration_history",
                title: "Iteration History & Convergence",
                columnHeaders: [
                    { header: "Metric" },
                    { header: "Value" }
                ],
                rows: [
                    { rowHeader: [], Metric: "Total Iterations", Value: result.iterations.toString() },
                    { rowHeader: [], Metric: "Converged", Value: result.converged ? "Yes" : "No" },
                    { rowHeader: [], Metric: "Final Cost", Value: result.cost.toFixed(4) },
                    { rowHeader: [], Metric: "Algorithm Used", Value: method },
                    { rowHeader: [], Metric: "Distance Metric", Value: config.main.DistanceMetric ?? "Euclidean" }
                ]
            });
        }

        // 🔍 Automatic K Selection Results
        if (automaticKSelection) {
            const kSelectionData = automaticKSelection.scores.map(({ k, score }) => ({
                rowHeader: [] as string[],
                K: k.toString(),
                Score: score.toFixed(4)
            }));

            allTables.push({
                key: "automatic_k_selection",
                title: `Automatic K Selection (${automaticKSelection.method})`,
                columnHeaders: [
                    { header: "Number of Clusters (k)" },
                    { header: "Score" }
                ],
                rows: kSelectionData
            });
        }

        // Create single analytic with all results
        const analyticId = await addAnalytic(logId, {
            title: `K-Medoids Cluster Analysis`,
            note: [
                automaticKSelection
                    ? `Automatic k selection: k=${automaticKSelection.optimalK} (${automaticKSelection.method})`
                    : `Manual k selection: k=${config.main.Cluster}, Algorithm: ${method}`,
                normalizationLabel ? `Preprocessing Method: ${normalizationLabel}` : null,
                `Distance Metric: ${distanceMetricLabel}`,
            ]
                .filter((part): part is string => Boolean(part))
                .join(", "),
        });

        // Add single statistic containing all tables
        await addStatistic(analyticId, {
            title: `K-Medoids Clustering Results`,
            description: `Complete clustering analysis with ${result.medoids.length} clusters`,
            output_data: JSON.stringify({ tables: allTables }),
            components: `K-Medoids Analysis`,
        });

        return { success: true };

    } catch (error) {
        throw error;
    }
}