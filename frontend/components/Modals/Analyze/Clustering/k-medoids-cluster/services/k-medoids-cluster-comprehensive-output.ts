import { useResultStore } from "@/stores/useResultStore";
import type { Table } from "@/types/Table";
import type { Variable } from "@/types/Variable";
import type { KMedoidsOutput, KMedoidsSummary, ObjectAssignment, MedoidInfo, ClusterProfile, IterationHistory, MedoidDistanceMatrix, DistanceMatrix, SilhouetteClusterScore } from "../types/output";
import { buildCaseProcessingSummary, recoverMedoidsFromMismatch } from "./k-medoids-cluster-guards";

interface ClusteringResult {
    labels: number[];
    medoids: number[];
    cost: number;
    avgCost?: number;
    avg_cost?: number;
    total_cost_build?: number;
    total_cost_swap?: number;
    iterations: number;
    converged: boolean;
    silhouette_scores?: number[];
    iteration_history?: { iteration: number; cost: number }[];
    cost_history?: number[];
    medoid_history?: number[][];
    sample_costs?: number[];
    sample_pam_iterations?: number[];
    clara_best_sample_index?: number;
}

interface AutomaticKSelection {
    method: string;
    testedRange: { min: number; max: number };
    scores: Array<{
        k: number;
        score: number;
        silhouetteScore?: number;
        totalCost?: number;
    }>;
    optimalK: number;
    optimalScore: number;
}

interface KMedoidsAnalysisResult {
    success: boolean;
    message: string;
    result: ClusteringResult;
    config: any;
    preprocessingSummary?: {
        initialN: number;
        afterPreprocessingN: number;
        missingRowsRemoved: number;
        outlierRowsRemoved: number;
        missingByVariable: Record<string, number>;
    };
    automaticKSelection?: AutomaticKSelection;
    kChartSelection?: AutomaticKSelection;
}

type NormalizationKind = "none" | "zscore" | "minmax";

function resolveNormalizationMethod(config: any): NormalizationKind {
    const methodFromOptions = config?.options?.NormalizationMethod as NormalizationKind | undefined;
    const methodFromIterate = config?.iterate?.NormalizationMethod as NormalizationKind | undefined;

    if (methodFromOptions) return methodFromOptions;
    if (methodFromIterate) return methodFromIterate;

    const hasStandardizeFlag =
        config?.options?.Standardize !== undefined ||
        config?.iterate?.Standardize !== undefined;
    const standardizeFlag =
        config?.options?.Standardize ??
        config?.iterate?.Standardize;

    if (hasStandardizeFlag) {
        return standardizeFlag ? "zscore" : "none";
    }

    return "none";
}

function euclideanDistance(p1: number[], p2: number[]): number {
    if (!p1 || !p2 || p1.length !== p2.length) return 0;
    let sum = 0;
    for (let i = 0; i < p1.length; i++) {
        const diff = (p1[i] || 0) - (p2[i] || 0);
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

function manhattanDistance(p1: number[], p2: number[]): number {
    if (!p1 || !p2 || p1.length !== p2.length) return 0;
    let sum = 0;
    for (let i = 0; i < p1.length; i++) {
        sum += Math.abs((p1[i] || 0) - (p2[i] || 0));
    }
    return sum;
}

type DistanceMetricKind = "euclidean" | "manhattan";

function calculateDistance(
    p1: number[],
    p2: number[],
    metric: DistanceMetricKind
): number {
    return metric === "manhattan"
        ? manhattanDistance(p1, p2)
        : euclideanDistance(p1, p2);
}

function calculateObjectSilhouette(
    objectIdx: number,
    cluster: number,
    dataMatrix: number[][],
    labels: number[],
    metric: DistanceMetricKind
): number {
    const n = dataMatrix.length;
    const point = dataMatrix[objectIdx];
    
    let sameClusterDistances: number[] = [];
    for (let j = 0; j < n; j++) {
        if (labels[j] === cluster && j !== objectIdx) {
            sameClusterDistances.push(calculateDistance(point, dataMatrix[j], metric));
        }
    }
    
    const a_i = sameClusterDistances.length > 0
        ? sameClusterDistances.reduce((a, b) => a + b, 0) / sameClusterDistances.length
        : 0;
    
    // b(i): rata-rata jarak minimum ke cluster lain
    const uniqueClusters = Array.from(new Set(labels)).filter(c => c !== cluster);
    let minAvgDistance = Infinity;
    
    for (const otherCluster of uniqueClusters) {
        let otherDistances: number[] = [];
        for (let j = 0; j < n; j++) {
            if (labels[j] === otherCluster) {
                otherDistances.push(calculateDistance(point, dataMatrix[j], metric));
            }
        }
        
        if (otherDistances.length > 0) {
            const avg = otherDistances.reduce((a, b) => a + b, 0) / otherDistances.length;
            if (avg < minAvgDistance) {
                minAvgDistance = avg;
            }
        }
    }
    
    const b_i = minAvgDistance === Infinity ? 0 : minAvgDistance;
    
    if (a_i === 0 && b_i === 0) return 0;
    return (b_i - a_i) / Math.max(a_i, b_i);
}

async function calculateSilhouetteScoresAsync(
    dataMatrix: number[][],
    labels: number[],
    metric: DistanceMetricKind,
    chunkSize: number = 50
): Promise<number[]> {
    const n = dataMatrix.length;
    const scores: number[] = new Array(n);
    
    for (let i = 0; i < n; i += chunkSize) {
        const end = Math.min(i + chunkSize, n);
        
        for (let j = i; j < end; j++) {
            scores[j] = calculateObjectSilhouette(j, labels[j], dataMatrix, labels, metric);
        }
        
        if (end < n) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    return scores;
}

function calculateMedoidDistanceMatrix(
    standardizedMatrix: number[][],
    medoidFilteredIndices: number[],
    metric: DistanceMetricKind
): MedoidDistanceMatrix {
    const k = medoidFilteredIndices.length;
    const distances: number[][] = Array(k).fill(0).map(() => Array(k).fill(0));
    
    for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
            const medoid1 = medoidFilteredIndices[i];
            const medoid2 = medoidFilteredIndices[j];
            const point1 = standardizedMatrix[medoid1] || [];
            const point2 = standardizedMatrix[medoid2] || [];
            
            const dist = calculateDistance(point1, point2, metric);
            distances[i][j] = dist;
            distances[j][i] = dist;
        }
    }
    
    return {
        clusterLabels: Array.from({ length: k }, (_, i) => i + 1),
        distances
    };
}

async function buildDistanceMatrix(
    clusteringMatrix: number[][],
    orderedFilteredIndices: number[],
    labels: string[],
    clusters: number[],
    metric: DistanceMetricKind,
    yieldToUI: () => Promise<void>
): Promise<DistanceMatrix> {
    const n = orderedFilteredIndices.length;
    const distances: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        const idxI = orderedFilteredIndices[i];
        const pointI = clusteringMatrix[idxI] || [];
        for (let j = i + 1; j < n; j++) {
            const idxJ = orderedFilteredIndices[j];
            const pointJ = clusteringMatrix[idxJ] || [];
            const dist = calculateDistance(pointI, pointJ, metric);
            distances[i][j] = dist;
            distances[j][i] = dist;
        }
        if (i % 25 === 0) {
            await yieldToUI();
        }
    }

    return { labels, clusters, distances };
}

function generateClusterLabel(
    meanAttributes: Record<string, number>,
    clusterIdx: number
): string {
    const entries = Object.entries(meanAttributes);
    if (entries.length === 0) return `Cluster ${clusterIdx + 1}`;
    
    entries.sort((a, b) => b[1] - a[1]);
    const dominantAttr = entries[0][0];
    
    return `Cluster ${clusterIdx + 1}: High ${dominantAttr}`;
}

export async function generateComprehensiveKMedoidsOutput(
    analysisResult: KMedoidsAnalysisResult,
    dataVariables: any[],
    variables: Variable[],
    caseLabelColumnIndex: number | null = null,
    standardizedMatrix?: number[][]
) {
    const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

    try {
        const { addLog, addAnalytic, addStatistic } = useResultStore.getState();
        const { result, config, automaticKSelection, kChartSelection } = analysisResult;
        const chartSelection = automaticKSelection ?? kChartSelection;

        if (!result || !result.labels || !Array.isArray(result.labels)) {
            throw new Error("Invalid clustering result structure");
        }

        const method = config.iterate.Method || "PAM";
        const normalizedMethod = String(method).toUpperCase();
        const normalizationMethod = resolveNormalizationMethod(config);
        const distanceMetric: DistanceMetricKind =
            config?.main?.DistanceMetric === "manhattan" ? "manhattan" : "euclidean";
        const useNormalization = normalizationMethod !== "none";
        const normalizationLabel = normalizationMethod === "zscore"
            ? "Z-score"
            : normalizationMethod === "minmax"
            ? "Min-Max"
            : "Tanpa normalisasi";

        const configK: number = (() => {
            if (automaticKSelection?.optimalK && automaticKSelection.optimalK >= 2) {
                return automaticKSelection.optimalK;
            }
            const manualK = config?.main?.Cluster;
            if (typeof manualK === 'number' && manualK >= 2) return manualK;
            return result.medoids.length;
        })();

        if (result.medoids.length !== configK) {
            console.error(
                `[ComprehensiveOutput] ⚠️ k-mismatch: config says k=${configK} but ` +
                `result.medoids has ${result.medoids.length} entries. ` +
                `Stale WASM binary suspected. Using config k=${configK}. ` +
                `Fix: rebuild WASM with wasm-pack build --target web.`
            );
        }
        const k = configK;

        const validRowIndices: number[] = dataVariables.map((_: any, idx: number) => idx);

        const n = validRowIndices.length;
        const nTotal = dataVariables.length;

        const origToFiltered = new Array(nTotal).fill(-1);
        validRowIndices.forEach((origIdx, filtIdx) => { origToFiltered[origIdx] = filtIdx; });

        const safeLabels: number[] = result.labels.map(l =>
            (typeof l === 'number' && l >= 0 && l < k) ? l : 0
        );

        const rawMedoids = Array.isArray(result.medoids) ? result.medoids : [];
        const slicedMedoids = rawMedoids.slice(0, k);
        const hasInvalidMedoid = slicedMedoids.some(
            (m) => !Number.isInteger(m) || m < 0 || m >= n
        );
        const hasDuplicateMedoid = new Set(slicedMedoids).size !== slicedMedoids.length;
        const hasMissingMedoid = slicedMedoids.length < k;

        const safeMedoids: number[] =
            hasInvalidMedoid || hasDuplicateMedoid || hasMissingMedoid
                ? (() => {
                      console.warn(
                          `[ComprehensiveOutput] Invalid medoid set detected ` +
                          `(len=${slicedMedoids.length}, unique=${new Set(slicedMedoids).size}, k=${k}). Recovering medoids from labels.`
                      );
                      return recoverMedoidsFromMismatch(slicedMedoids, safeLabels, k, n);
                  })()
                : slicedMedoids;

        const safeMedoidsOrig: number[] = safeMedoids.map(fi => validRowIndices[fi] ?? fi);

        const dataMatrix = validRowIndices.map((origIdx: number) =>
            variables.map(v => {
                const val = dataVariables[origIdx][v.columnIndex as number];
                return typeof val === 'number' && isFinite(val) ? val : 0;
            })
        );

        const clusteringMatrix = standardizedMatrix && standardizedMatrix.length === n
            ? standardizedMatrix
            : dataMatrix;

        await yieldToUI();

        // Pakai silhouette per objek dari worker jika ada; jika tidak, hitung di main thread (per chunk).
        let silhouetteScores: number[];
        if (result.silhouette_scores && result.silhouette_scores.length === n) {
            silhouetteScores = result.silhouette_scores;
        } else {
            silhouetteScores = await calculateSilhouetteScoresAsync(
                clusteringMatrix,
                safeLabels,
                distanceMetric
            );
        }

        const averageSilhouette = silhouetteScores.reduce((a, b) => a + b, 0) / silhouetteScores.length;

        const clusterSizes = Array(k).fill(0);
        safeLabels.forEach((label: number) => {
            if (label >= 0 && label < k) clusterSizes[label]++;
        });

        const largestCluster = clusterSizes.reduce(
            (max, size, idx) => size > max.size ? { id: idx + 1, size } : max,
            { id: 1, size: clusterSizes[0] }
        );

        const smallestCluster = clusterSizes.reduce(
            (min, size, idx) => size < min.size ? { id: idx + 1, size } : min,
            { id: 1, size: clusterSizes[0] }
        );

        const dataByCluster: Map<number, any[]> = new Map();
        validRowIndices.forEach((origIdx, filtIdx) => {
            const label = safeLabels[filtIdx];
            if (!dataByCluster.has(label)) dataByCluster.set(label, []);
            const cluster = dataByCluster.get(label);
            if (cluster) {
                cluster.push(dataVariables[origIdx]);
            }
        });

        await yieldToUI();

        // Berisi indeks baris ASLI agar pengecekan isMedoid benar.
        const medoidSet = new Set<number>(safeMedoidsOrig);

        const getCaseLabel = (row: any, fallbackCaseNumber: number): string => {
            if (caseLabelColumnIndex == null || caseLabelColumnIndex < 0) {
                return `Case ${fallbackCaseNumber}`;
            }
            const rawValue = row?.[caseLabelColumnIndex];
            if (rawValue === null || rawValue === undefined) {
                return `Case ${fallbackCaseNumber}`;
            }
            const label = String(rawValue).trim();
            return label.length > 0 ? label : `Case ${fallbackCaseNumber}`;
        };

        // Utamakan jarak per objek dari WASM (dihitung dari distance matrix yang sama
        // dengan PAM, sehingga cocok dengan pam() di R). Fallback ke hitung ulang di JS
        // hanya jika WASM tidak menyediakannya (binary lama, atau jalur CLARA/CLARANS).
        const wasmDistances: number[] | undefined =
            Array.isArray((result as any).distances_to_medoids) &&
            (result as any).distances_to_medoids.length === n
                ? (result as any).distances_to_medoids
                : undefined;

        // objectId/objectName memakai indeks baris ASLI agar nomor kasus sama dengan R.
        const assignments: ObjectAssignment[] = validRowIndices.map((origIdx, filtIdx) => {
            const clusterLabel = safeLabels[filtIdx];
            const medoidOrigIdx = safeMedoidsOrig[clusterLabel];
            const isMedoid = medoidSet.has(origIdx);

            let distanceToMedoid: number;
            if (wasmDistances) {
                distanceToMedoid = wasmDistances[filtIdx] ?? 0;
            } else if (isMedoid) {
                distanceToMedoid = 0;
            } else {
                const medoidFiltIdx = safeMedoids[clusterLabel];
                const medoidPoint = medoidFiltIdx != null && clusteringMatrix[medoidFiltIdx] ? clusteringMatrix[medoidFiltIdx] : [];
                const objectPoint = clusteringMatrix[filtIdx] || [];
                distanceToMedoid = medoidPoint.length > 0 && objectPoint.length > 0
                    ? calculateDistance(objectPoint, medoidPoint, distanceMetric)
                    : 0;
            }

            const row = dataVariables[origIdx];
            const attributes: Record<string, number | string> = {};
            const standardizedAttributes: Record<string, number> = {};
            variables.forEach(v => {
                attributes[v.name] = row[v.columnIndex as number] ?? 0;
            });
            variables.forEach((v, varIdx) => {
                const standardizedValue = clusteringMatrix[filtIdx]?.[varIdx];
                standardizedAttributes[v.name] =
                    standardizedValue != null && isFinite(standardizedValue)
                        ? standardizedValue
                        : 0;
            });

            return {
                objectId: origIdx + 1,
                objectName: getCaseLabel(row, origIdx + 1),
                clusterLabel: clusterLabel + 1,
                distanceToMedoid: isFinite(distanceToMedoid) && distanceToMedoid >= 0 ? distanceToMedoid : 0,
                isMedoid,
                silhouetteScore: silhouetteScores[filtIdx] != null && isFinite(silhouetteScores[filtIdx])
                    ? silhouetteScores[filtIdx]
                    : 0,
                attributes,
                standardizedAttributes: useNormalization ? standardizedAttributes : undefined,
            };
        });

        const shouldBuildDistanceMatrix =
            config?.options?.ShowDistanceMatrixTable ?? false;
        let distanceMatrix: DistanceMatrix | undefined;

        if (shouldBuildDistanceMatrix) {
            const orderMeta = validRowIndices.map((origIdx, filtIdx) => {
                const row = dataVariables[origIdx];
                return {
                    filtIdx,
                    origIdx,
                    label: getCaseLabel(row, origIdx + 1),
                    clusterLabel: (safeLabels[filtIdx] ?? 0) + 1,
                };
            });

            orderMeta.sort((a, b) =>
                a.clusterLabel - b.clusterLabel || a.origIdx - b.origIdx
            );

            const orderedFilteredIndices = orderMeta.map(item => item.filtIdx);
            const orderedLabels = orderMeta.map(item => item.label);
            const orderedClusters = orderMeta.map(item => item.clusterLabel);

            distanceMatrix = await buildDistanceMatrix(
                clusteringMatrix,
                orderedFilteredIndices,
                orderedLabels,
                orderedClusters,
                distanceMetric,
                yieldToUI
            );
        }

        const buildCost: number | undefined = typeof result.total_cost_build === "number"
            ? result.total_cost_build
            : Array.isArray(result.cost_history) && result.cost_history.length > 0
            ? result.cost_history[0]
            : result.iteration_history && result.iteration_history.length > 0
            ? result.iteration_history[0].cost
            : undefined;

        const swapCost: number = typeof result.total_cost_swap === "number"
            ? result.total_cost_swap
            : Array.isArray(result.cost_history) && result.cost_history.length > 0
            ? result.cost_history[result.cost_history.length - 1]
            : typeof result.cost === "number"
            ? result.cost
            : 0;

        const avgCost: number = typeof result.avgCost === "number"
            ? result.avgCost
            : typeof result.avg_cost === "number"
            ? result.avg_cost
            : n > 0
            ? swapCost / n
            : 0;

        // Utamakan jumlah iterasi eksplisit; jika tidak ada, simpulkan dari history.
        // Bentuk history [init, iter1, iter2, ...], jadi iterasi swap = panjang - 1.
        const inferredIterations = Array.isArray(result.cost_history) && result.cost_history.length > 0
            ? Math.max(result.cost_history.length - 1, 0)
            : Array.isArray(result.iteration_history) && result.iteration_history.length > 0
            ? Math.max(result.iteration_history.length - 1, 0)
            : 0;
        const totalIterations =
            typeof result.iterations === "number" && result.iterations > 0
                ? result.iterations
                : inferredIterations;

        const summary: KMedoidsSummary = {
            numClusters: k,
            totalCost: swapCost,
            avgCost,
            buildCost,
            swapCost,
            convergenceTolerance:
                typeof config?.iterate?.ConvergenceCriterion === "number"
                    ? config.iterate.ConvergenceCriterion
                    : undefined,
            averageSilhouetteScore: averageSilhouette,
            totalIterations,
            converged: result.converged,
            largestCluster,
            smallestCluster,
            numCases: n,
            numVariables: variables.length
        };

        const medoids: MedoidInfo[] = safeMedoidsOrig.map((medoidOrigIdx, clusterIdx) => {
            const medoidRow = dataVariables[medoidOrigIdx];
            const medoidFiltIdx = safeMedoids[clusterIdx];
            const attributes: Record<string, number | string> = {};
            const standardizedAttributes: Record<string, number> = {};
            variables.forEach(v => {
                attributes[v.name] = medoidRow[v.columnIndex as number] ?? 0;
            });
            variables.forEach((v, varIdx) => {
                const value = medoidFiltIdx != null ? clusteringMatrix[medoidFiltIdx]?.[varIdx] : undefined;
                standardizedAttributes[v.name] = value != null && isFinite(value) ? value : 0;
            });

            // Dihitung dari assignments yang sudah ada (menghindari hitung ulang O(k×n))
            let withinClusterDist = 0;
            let count = 0;
            assignments.forEach(a => {
                if (a.clusterLabel === clusterIdx + 1 && !a.isMedoid) {
                    withinClusterDist += a.distanceToMedoid;
                    count++;
                }
            });

            return {
                clusterLabel: clusterIdx + 1,
                objectId: medoidOrigIdx + 1,
                objectName: getCaseLabel(medoidRow, medoidOrigIdx + 1),
                attributes,
                standardizedAttributes,
                clusterSize: clusterSizes[clusterIdx],
                withinClusterDistance: count > 0 ? withinClusterDist / count : 0
            };
        });

        const clusterProfiles: ClusterProfile[] = Array.from({ length: k }, (_, clusterIdx) => {
            const clusterMembers = dataByCluster.get(clusterIdx) || [];
            const size = clusterMembers.length;
            const percentage = (size / n) * 100;

            const meanAttributes: Record<string, number> = {};
            variables.forEach(v => {
                const values = clusterMembers
                    .map(row => {
                        const val = row[v.columnIndex as number];
                        return typeof val === 'number' ? val : parseFloat(val);
                    })
                    .filter(val => isFinite(val));
                meanAttributes[v.name] = values.length > 0
                    ? values.reduce((a: number, b: number) => a + b, 0) / values.length
                    : 0;
            });

            const clusterSilhouettes = silhouetteScores.filter((_, idx) => safeLabels[idx] === clusterIdx);
            const avgSilhouette = clusterSilhouettes.length > 0
                ? clusterSilhouettes.reduce((a, b) => a + b, 0) / clusterSilhouettes.length
                : 0;

            return {
                clusterLabel: clusterIdx + 1,
                size,
                percentage,
                meanAttributes,
                medoidId: safeMedoidsOrig[clusterIdx] + 1,
                withinClusterDistance: medoids[clusterIdx].withinClusterDistance,
                silhouetteScore: avgSilhouette,
                descriptiveLabel: generateClusterLabel(meanAttributes, clusterIdx)
            };
        });

        const rawIterHistory: { iteration: number; cost: number }[] | undefined =
            result.iteration_history
                ? result.iteration_history
                : Array.isArray(result.cost_history) && result.cost_history.length > 0
                    ? (result.cost_history as number[]).map((cost, idx) => ({ iteration: idx, cost }))
                    : undefined;

        const iterationHistory: IterationHistory[] = rawIterHistory
            ? rawIterHistory.map((item, idx) => {
                  const cost = item.cost != null ? item.cost : 0;
                  const prevCost = idx > 0 ? rawIterHistory[idx - 1].cost : cost;

                  // Untuk entri terakhir, pakai swapCost dari WASM sebagai final.
                  const isLastIteration = idx === rawIterHistory.length - 1;
                  const finalCost = isLastIteration ? swapCost : cost;

                  return {
                      iteration: item.iteration ?? idx,
                      totalCost: finalCost,
                      improvement: idx > 0 ? prevCost - cost : 0,
                      // Setiap entri cost_history[1..] adalah satu swap; Init (idx=0) tidak ada swap.
                      swapsMade: idx === 0 ? 0 : 1,
                      medoids: result.medoid_history?.[idx],
                  };
              })
            : [{ iteration: 0, totalCost: swapCost, improvement: 0, swapsMade: 0, medoids: result.medoids }];

        const isManualMode = config?.main?.ClusterMode === "manual";
        const shouldBuildManualOptimalKChart =
            !automaticKSelection &&
            isManualMode &&
            ((config?.evaluation?.ShowOptimalKChart ??
                config?.options?.ShowOptimalKChart ??
                false) ||
                (config?.evaluation?.ShowOptimalKTable ?? false));

        const elbowData = chartSelection
            ? chartSelection.scores.map((item: any) => {
                  const isSilhouetteMethod =
                      chartSelection.method === "Silhouette" ||
                      chartSelection.method === "silhouette";
                  const resolvedTotalCost =
                      item.totalCost != null && isFinite(item.totalCost)
                          ? item.totalCost
                          : isSilhouetteMethod
                          ? 0
                          : (item.score ?? 0);
                  return {
                      k: item.k,
                      totalCost: resolvedTotalCost,
                      silhouetteScore:
                          item.silhouetteScore != null && isFinite(item.silhouetteScore)
                              ? item.silhouetteScore
                              : isSilhouetteMethod
                              ? (item.score ?? 0)
                              : 0,
                  };
              })
                        : shouldBuildManualOptimalKChart
                        ? [{
                                    k,
                                    totalCost: isFinite(swapCost) ? swapCost : (result.cost ?? 0),
                                    silhouetteScore: isFinite(averageSilhouette) ? averageSilhouette : 0,
                            }]
            : undefined;

        const medoidDistanceMatrix = calculateMedoidDistanceMatrix(
            clusteringMatrix,
            safeMedoids,
            distanceMetric
        );

        const silhouettePerCluster: SilhouetteClusterScore[] = clusterProfiles.map(profile => {
            const clusterIdx = profile.clusterLabel - 1;
            const clusterScores = silhouetteScores
                .filter((score, idx) => safeLabels[idx] === clusterIdx && score != null && isFinite(score));
            
            return {
                clusterLabel: profile.clusterLabel,
                averageScore: profile.silhouetteScore,
                minScore: clusterScores.length > 0 ? Math.min(...clusterScores) : 0,
                maxScore: clusterScores.length > 0 ? Math.max(...clusterScores) : 0,
                count: clusterScores.length
            };
        });

        await yieldToUI();

        const claraNumSamples = config?.iterate?.NumSamples ?? 5;
        const claraConfiguredSampleSize = config?.iterate?.SampleSize ?? (40 + 2 * k);
        const claraEffectiveSampleSize = Math.min(claraConfiguredSampleSize, n);

        const rawSampleCosts: number[] | undefined =
            normalizedMethod === "CLARA"
                ? (() => {
                    if (Array.isArray(result.sample_costs) && result.sample_costs.length > 0) {
                        return (result.sample_costs as number[]).filter(
                            (c: unknown) => typeof c === "number" && isFinite(c as number)
                        );
                    }
                    if (Array.isArray(result.cost_history) && result.cost_history.length > 0) {
                        return (result.cost_history as number[]).filter(
                            (c: unknown) => typeof c === "number" && isFinite(c as number)
                        );
                    }
                    console.warn("[ComprehensiveOutput] CLARA: no sample costs found in result — samplingCosts will be undefined");
                    return undefined;
                })()
                : undefined;

        const claraSamplingCosts = rawSampleCosts && rawSampleCosts.length > 0 ? rawSampleCosts : undefined;
        const resolvedClaraNumSamples =
            claraSamplingCosts && claraSamplingCosts.length > 0
                ? claraSamplingCosts.length
                : claraNumSamples;

        // Utamakan indeks sampel terbaik dari WASM; fallback ke sampel dengan cost minimum.
        const claraBestSampleIndex: number | undefined =
            normalizedMethod === "CLARA"
                ? (() => {
                    if (
                        typeof result.clara_best_sample_index === "number" &&
                        result.clara_best_sample_index > 0
                    ) {
                        return result.clara_best_sample_index;
                    }
                    if (claraSamplingCosts && claraSamplingCosts.length > 0) {
                        return claraSamplingCosts.findIndex(
                            (cost) => cost === Math.min(...claraSamplingCosts)
                        ) + 1;
                    }
                    return undefined;
                })()
                : undefined;

        const resolvedOptimalKMethod: "silhouette" | "elbow" | undefined = chartSelection
            ? (
            chartSelection.method === "Silhouette" ||
            chartSelection.method === "silhouette"
                    ? "silhouette"
                    : "elbow"
            )
            : config?.main?.ClusterMode === "automatic"
            ? (
                config?.main?.AutoKMethod === "elbow"
                    ? "elbow"
                    : "silhouette"
            )
            : shouldBuildManualOptimalKChart
            ? (
                config?.main?.AutoKMethod === "elbow"
                    ? "elbow"
                    : "silhouette"
            )
            : undefined;

        const comprehensiveOutput: KMedoidsOutput = {
            summary,
            assignments,
            medoids,
            clusterProfiles,
            iterationHistory,
            algorithmMethod: normalizedMethod,
            normalizationMethod,
            claraConvergence: normalizedMethod === "CLARA"
                ? {
                    numSamples: resolvedClaraNumSamples,
                    sampleSize: claraEffectiveSampleSize,
                    bestTotalCost: swapCost,
                    bestCost: swapCost,
                    ...(typeof claraBestSampleIndex === "number" && claraBestSampleIndex > 0
                        ? { bestSampleIndex: claraBestSampleIndex }
                        : {}),
                    ...(claraSamplingCosts && claraSamplingCosts.length > 0
                        ? {
                            samplingCosts: claraSamplingCosts,
                            samples: claraSamplingCosts.map((cost: number, idx: number) => ({
                                sampleIndex: idx + 1,
                                sampleSize: claraEffectiveSampleSize,
                                cost,
                                pamIterations: (Array.isArray(result.sample_pam_iterations) && result.sample_pam_iterations.length > idx)
                                    ? result.sample_pam_iterations[idx]
                                    : (result.iterations ?? 0),
                            })),
                        }
                        : {}),
                }
                : undefined,
            elbowData,
            optimalKMethod: resolvedOptimalKMethod,
            clusterMode: config?.main?.ClusterMode === "automatic" ? "automatic" : "manual",
            autoKMethod: config?.main?.AutoKMethod === "elbow" ? "elbow" : "silhouette",
            medoidDistanceMatrix,
            distanceMatrix,
            silhouetteScores: {
                overall: isFinite(averageSilhouette) ? averageSilhouette : 0,
                perCluster: silhouettePerCluster,
                perObject: silhouetteScores.map(s => s != null && isFinite(s) ? s : 0)
            },
            tables: [], // diisi di bawah
            visualizationOptions: {
                // Mode konvergensi selalu menampilkan detail iteration history
                showIterationHistory:
                    (config?.results?.ShowConvergenceAlgorithm ?? true)
                        ? true
                        : (config?.results?.ShowIterationHistory ?? true),
                showPCAProjection: config?.options?.ShowPCAProjection ?? true,
                showClusterScatterPlot: config?.options?.ShowClusterScatterPlot ?? false,
                showClusterSizeDistribution: config?.options?.ShowClusterSizeDistribution ?? false,
                showDistanceMatrixBetweenMedoids: config?.options?.ShowDistanceMatrixBetweenMedoids ?? false,
                showDistanceMatrixTable: config?.options?.ShowDistanceMatrixTable ?? false,
                showClusterMedoids: config?.results?.ShowClusterMedoids ?? true,
                showObjectAssignments: config?.results?.ShowClusterMembership ?? false,
                showCaseCount: config?.results?.ShowCaseCount ?? true,
                showTotalCost: true,
                showSilhouettePerObject: config?.evaluation?.ShowSilhouettePlot ?? false,
                // Fallback ke field Options lama agar config tersimpan sebelum reorganisasi tetap jalan
                showOptimalKChart:
                    config?.evaluation?.ShowOptimalKChart ??
                    config?.options?.ShowOptimalKChart ??
                    false,
                showOptimalKTable: config?.evaluation?.ShowOptimalKTable ?? false,
                showOverallQualityAssessment: config?.evaluation?.ShowOverallQualityAssessment ?? true,
                showConvergenceAlgorithm: config?.results?.ShowConvergenceAlgorithm ?? true,
                showSamplingHistory: config?.results?.ShowSamplingHistory ?? true,
                // Grafik konvergensi kini satu grup dengan tabelnya di tab Results.
                // Fallback ke field Options lama agar config tersimpan tetap jalan.
                showConvergenceChart:
                    config?.results?.ShowConvergenceChart ??
                    config?.options?.ShowConvergenceChart ??
                    false,
            },
            variables: variables.map(v => ({ name: v.name, label: v.label || v.name }))
        };

        const allTables: Table[] = [];
        const caseSummary = buildCaseProcessingSummary(n, nTotal, {
            initialN: analysisResult.preprocessingSummary?.initialN,
            preprocessedN: analysisResult.preprocessingSummary?.afterPreprocessingN,
            missingRowsRemoved: analysisResult.preprocessingSummary?.missingRowsRemoved,
            outlierRowsRemoved: analysisResult.preprocessingSummary?.outlierRowsRemoved,
            missingByVariable: analysisResult.preprocessingSummary?.missingByVariable,
        });

        allTables.push({
            key: "case_processing_summary",
            title: "Case Processing Summary",
            columnHeaders: [
                { header: "", key: "caseStatus" },
                { header: "N", key: "n" },
                { header: "Percentage (%)", key: "percentage" },
            ],
            rows: [
                { rowHeader: ["Valid"], caseStatus: "Valid", n: caseSummary.validN.toString(), percentage: caseSummary.validPercent },
                { rowHeader: ["Missing"], caseStatus: "Missing", n: caseSummary.missingN.toString(), percentage: caseSummary.missingPercent },
                { rowHeader: ["Outlier"], caseStatus: "Outlier", n: caseSummary.outlierRowsRemoved.toString(), percentage: caseSummary.totalN > 0 ? ((caseSummary.outlierRowsRemoved / caseSummary.totalN) * 100).toFixed(1) : "0.0" },
                { rowHeader: ["Total"], caseStatus: "Total", n: caseSummary.totalN.toString(), percentage: "100.0" },
            ],
        });

        allTables.push({
            key: "number_of_cases_per_cluster",
            title: "Number of Cases per Cluster",
            columnHeaders: [
                { header: "", key: "label" },
                { header: "", key: "clusterNo" },
                { header: "N", key: "n" },
            ],
            rows: [
                ...clusterProfiles.map((profile, index) => ({
                    rowHeader: index === 0
                        ? ["Cluster", profile.clusterLabel.toString()]
                        : ["", profile.clusterLabel.toString()],
                    n: profile.size.toString(),
                })),
                { rowHeader: ["Valid"], n: caseSummary.validN.toString() },
                { rowHeader: ["Missing"], n: caseSummary.missingN.toString() },
            ],
        });

        allTables.push({
            key: "analysis_settings",
            title: "Analysis Settings",
            columnHeaders: [{ header: "Setting" }, { header: "Value" }],
            rows: [
                { rowHeader: [], Setting: "Method", Value: `${method} Method` },
                { rowHeader: [], Setting: "Distance Measure", Value: config.main.DistanceMetric || "Euclidean" },
                { rowHeader: [], Setting: "Normalization Method", Value: normalizationLabel },
                { rowHeader: [], Setting: "Initial data", Value: caseSummary.initialN.toString() },
                { rowHeader: [], Setting: "After preprocessing", Value: caseSummary.preprocessedN.toString() },
                { rowHeader: [], Setting: "Missing rows removed", Value: caseSummary.missingRowsRemoved.toString() },
                { rowHeader: [], Setting: "Missing Variables", Value: caseSummary.missingVariablesText },
            ],
        });

        const hideBuildAverage = normalizedMethod === "CLARA" || normalizedMethod === "CLARANS";

        allTables.push({
            key: "summary",
            title: "Clustering Summary",
            columnHeaders: [{ header: "Metric" }, { header: "Value" }],
            rows: [
                { rowHeader: [], Metric: "Number of Clusters", Value: k.toString() },
                { rowHeader: [], Metric: "Total Cases", Value: n.toString() },
                { rowHeader: [], Metric: "Normalization", Value: normalizationLabel },
            ...(hideBuildAverage ? [] : [{ rowHeader: [], Metric: "Average Cost (BUILD)", Value: buildCost != null && n > 0 ? (buildCost / n).toFixed(4) : "N/A" }]),
                { rowHeader: [], Metric: "Average Cost (Objective)", Value: avgCost.toFixed(4) },
                { rowHeader: [], Metric: "Total Cost (BUILD)", Value: buildCost != null ? buildCost.toFixed(4) : "N/A" },
                { rowHeader: [], Metric: "Total Cost (SWAP)", Value: swapCost.toFixed(4) },
                { rowHeader: [], Metric: "Average Silhouette Score", Value: averageSilhouette.toFixed(4) },
                { rowHeader: [], Metric: "Quality", Value: averageSilhouette >= 0.7 ? "Very Strong" : averageSilhouette >= 0.5 ? "Strong" : "Moderate" },
                { rowHeader: [], Metric: "Iterations", Value: result.iterations.toString() },
                { rowHeader: [], Metric: "Converged", Value: result.converged ? "Yes" : "No" }
            ]
        });

        allTables.push({
            key: "cluster_profiles",
            title: "Cluster Profiles",
            columnHeaders: [
                { header: "Cluster", key: "Cluster" },
                { header: "Size", key: "Size" },
                { header: "%", key: "Percentage" },
                { header: "Medoid ID", key: "MedoidID" },
                { header: "Silhouette", key: "Silhouette" },
                ...variables.map(v => ({ header: `Avg ${v.label || v.name}`, key: `Avg_${v.name}` }))
            ],
            rows: clusterProfiles.map(profile => ({
                rowHeader: [],
                Cluster: `Cluster ${profile.clusterLabel}`,
                Size: profile.size,
                Percentage: profile.percentage.toFixed(1),
                MedoidID: profile.medoidId,
                Silhouette: profile.silhouetteScore.toFixed(3),
                ...Object.fromEntries(
                    variables.map(v => [`Avg_${v.name}`, profile.meanAttributes[v.name].toFixed(2)])
                )
            }))
        });

        allTables.push({
            key: "total_cost_dissimilarity",
            title: "Total Cost / Dissimilarity",
            columnHeaders: [{ header: "Metric" }, { header: "Value" }],
            rows: [
                ...(hideBuildAverage ? [] : [
                    { rowHeader: [], Metric: "Total Cost (BUILD)", Value: buildCost != null && isFinite(buildCost) ? buildCost.toFixed(4) : "N/A" },
                    { rowHeader: [], Metric: "Average Cost (BUILD)", Value: buildCost != null && n > 0 ? (buildCost / n).toFixed(4) : "N/A" },
                ]),
                { rowHeader: [], Metric: "Total Cost (SWAP)", Value: isFinite(swapCost) ? swapCost.toFixed(4) : "N/A" },
                { rowHeader: [], Metric: "Average Cost (SWAP)", Value: isFinite(avgCost) ? avgCost.toFixed(4) : "N/A" },
            ],
        });

        const membershipNormalizationLabel = normalizationMethod === "zscore"
            ? "Z-score"
            : normalizationMethod === "minmax"
            ? "Min-Max"
            : "Standardized";

        allTables.push({
            key: "cluster_membership",
            title: "Cluster Membership",
            columnHeaders: [
                { header: "ID", key: "ID" },
                { header: "Cluster", key: "Cluster" },
                { header: "Distance", key: "Distance" },
                { header: "Silhouette", key: "Silhouette" },
                ...variables.map(v => ({ header: v.label || v.name, key: v.name })),
                ...(useNormalization
                    ? variables.map(v => ({
                        header: `${v.label || v.name} (${membershipNormalizationLabel})`,
                        key: `${v.name}_zscore`,
                    }))
                    : []),
            ],
            rows: assignments.map(a => ({
                rowHeader: [],
                ID: a.isMedoid ? `★ ${a.objectId}` : a.objectId.toString(),
                Cluster: a.clusterLabel.toString(),
                Distance: a.distanceToMedoid.toFixed(4),
                Silhouette: typeof a.silhouetteScore === "number" ? a.silhouetteScore.toFixed(3) : "N/A",
                ...Object.fromEntries(
                    variables.map(v => {
                        const value = a.attributes[v.name];
                        return [v.name, typeof value === "number" && isFinite(value) ? value.toFixed(4) : (value ?? "N/A")];
                    })
                ),
                ...Object.fromEntries(
                    useNormalization
                        ? variables.map(v => {
                            const standardizedValue = a.standardizedAttributes?.[v.name];
                            return [
                                `${v.name}_zscore`,
                                typeof standardizedValue === "number" && isFinite(standardizedValue)
                                    ? standardizedValue.toFixed(4)
                                    : "N/A",
                            ];
                        })
                        : []
                ),
            })),
        });

        const medoidStandardizedValues = useNormalization
            ? medoids.flatMap((medoid) =>
                  variables.map((v) => medoid.standardizedAttributes?.[v.name] ?? 0)
              )
            : [];
        const allMedoidZScoresNearZero =
            useNormalization &&
            medoidStandardizedValues.length > 0 &&
            medoidStandardizedValues.every((v) => Math.abs(v) < 1e-9);

        allTables.push({
            key: "medoids",
            title: useNormalization
                ? `Final Medoids (${normalizationLabel})`
                : "Final Medoids (Original Scale)",
            columnHeaders: [
                { header: "Cluster", key: "Cluster" },
                { header: "Medoid ID", key: "MedoidID" },
                ...variables.map(v => ({ header: v.label || v.name, key: v.name }))
            ],
            rows: medoids.map(medoid => ({
                rowHeader: [],
                Cluster: `Cluster ${medoid.clusterLabel}`,
                MedoidID: `★ ${medoid.objectId}`,
                ...Object.fromEntries(
                    variables.map(v => {
                        if (useNormalization) {
                            const standardizedValue = medoid.standardizedAttributes?.[v.name];
                            if (typeof standardizedValue === 'number' && isFinite(standardizedValue)) {
                                return [v.name, standardizedValue.toFixed(4)];
                            }
                            return [v.name, "0.0000"];
                        }

                        const originalValue = medoid.attributes[v.name];
                        if (typeof originalValue === 'number' && isFinite(originalValue)) {
                            return [v.name, originalValue.toFixed(4)];
                        }
                        return [v.name, String(originalValue ?? "-")];
                    })
                )
            })),
                        ...(allMedoidZScoresNearZero && normalizationMethod === "zscore"
                ? {
                      footer:
                          "All medoid Z-scores are ~0. This usually happens when the variables used have very small or constant variance on the valid data after preprocessing.",
                  }
                : {}),
        });

        // Tidak berlaku untuk CLARA, yang menampilkan tabel Sampling History
        if (normalizedMethod !== "CLARA" && iterationHistory.length > 0) {
            const fmtConvergenceCost = (val: number): string => {
                if (!isFinite(val)) return "—";
                if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
                if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
                return val.toFixed(1);
            };
            const medoidLabel = (m: MedoidInfo): string =>
                m.objectName || `ID_${String(m.objectId).padStart(3, "0")}`;
            const medoidStr = (indices?: number[]): string => {
                if (indices && indices.length > 0) {
                    return indices.map(idx => `Case ${idx + 1}`).join(", ");
                }
                return medoids.length > 0 ? medoids.map(medoidLabel).join(", ") : "—";
            };

            const initEntry = iterationHistory[0];
            const iterEntries = iterationHistory.slice(1);
            const numIterations = iterEntries.length;

            allTables.push({
                key: "convergence_algorithm",
                title: `Algorithm Convergence (${numIterations} Iterations)`,
                columnHeaders: [
                    { header: "Iteration" },
                    { header: "Active Medoids" },
                    { header: "Total Cost" },
                    { header: "Status" },
                ],
                rows: [
                    {
                        rowHeader: ["Init"],
                        "Active Medoids": `${medoidStr(initEntry.medoids)} (BUILD)`,
                        "Total Cost": fmtConvergenceCost(initEntry.totalCost),
                        Status: numIterations === 0 && result.converged ? "Converged" : "Initialization",
                    },
                    ...iterEntries.map((row, i) => {
                        const isLast = i === iterEntries.length - 1;
                        const isConverged = isLast && result.converged;
                        const isChanged = row.improvement > 0.0001;
                        return {
                            rowHeader: [String(i + 1)],
                            "Active Medoids": medoidStr(row.medoids),
                            "Total Cost": fmtConvergenceCost(row.totalCost),
                            Status: isConverged ? "Converged" : isChanged ? "Changed" : "Stable",
                        };
                    }),
                ],
            });
        }

        allTables.push({
            key: "distance_matrix_medoids",
            title: "Distance Matrix Between Medoids",
            columnHeaders: [
                { header: "" },
                ...medoidDistanceMatrix.clusterLabels.map(label => ({ header: `C${label}`, key: `c${label}` })),
            ],
            rows: medoidDistanceMatrix.clusterLabels.map((rowLabel, i) => ({
                rowHeader: [`C${rowLabel}`],
                ...Object.fromEntries(
                    medoidDistanceMatrix.clusterLabels.map((colLabel, j) => {
                        const distance = medoidDistanceMatrix.distances[i]?.[j];
                        const safeDistance = distance !== null && isFinite(distance) ? distance : 0;
                        return [`c${colLabel}`, safeDistance.toFixed(2)];
                    })
                ),
            })),
            ...({
                footer: "Lower values indicate more similar clusters. Higher values indicate better separation.",
            }),
        });

        comprehensiveOutput.tables = allTables;


        const titleMessage = `K-Medoids Cluster Analysis (${method})`;
        const logId = await addLog({ log: titleMessage });

        const analyticId = await addAnalytic(logId, {
            title: `K-Medoids Clustering Results`,
            note: automaticKSelection
                ? `Automatic k selection: k=${automaticKSelection.optimalK} (${automaticKSelection.method})`
                : `Manual k selection: k=${k}, Algorithm: ${method}`,
        });

        const caseProcessingSummaryTable = allTables.find(t => t.key === "case_processing_summary");
        if (caseProcessingSummaryTable) {
            await addStatistic(analyticId, {
                title: `Case Processing Summary`,
                description: `Case Processing Summary`,
                output_data: JSON.stringify({ tables: [caseProcessingSummaryTable] }),
                components: `K-Medoids Case Processing Summary`,
            });
        }

        const numberOfCasesPerClusterTable = allTables.find(t => t.key === "number_of_cases_per_cluster");
        if (numberOfCasesPerClusterTable && (comprehensiveOutput.visualizationOptions?.showCaseCount ?? true)) {
            await addStatistic(analyticId, {
                title: `Number of Cases per Cluster`,
                description: `Number of Cases per Cluster`,
                output_data: JSON.stringify({ tables: [numberOfCasesPerClusterTable] }),
                components: `K-Medoids Number of Cases per Cluster`,
            });
        }

        const clusterProfilesTable = allTables.find(t => t.key === "cluster_profiles");
        if (clusterProfilesTable) {
            await addStatistic(analyticId, {
                title: `Cluster Profiles`,
                description: `Cluster Profiles`,
                output_data: JSON.stringify({ tables: [clusterProfilesTable] }),
                components: `K-Medoids Cluster Profiles`,
            });
        }

        const totalCostDissimilarityTable = allTables.find(t => t.key === "total_cost_dissimilarity");
        if (totalCostDissimilarityTable) {
            await addStatistic(analyticId, {
                title: `Total Cost / Dissimilarity`,
                description: `Total Cost / Dissimilarity`,
                output_data: JSON.stringify({ tables: [totalCostDissimilarityTable] }),
                components: `K-Medoids Total Cost Dissimilarity`,
            });
        }

        const clusterMembershipTable = allTables.find(t => t.key === "cluster_membership");
        if (clusterMembershipTable && (comprehensiveOutput.visualizationOptions?.showObjectAssignments ?? true)) {
            const clusterMembershipOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "clusterMembershipOnly",
            };
            await addStatistic(analyticId, {
                title: `Cluster Membership`,
                description: `Cluster Membership`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: clusterMembershipOutput,
                }),
                components: `K-Medoids Cluster Membership`,
            });
        }

        const medoidsTable = allTables.find(t => t.key === "medoids");
        if (medoidsTable && (comprehensiveOutput.visualizationOptions?.showClusterMedoids ?? true)) {
            await addStatistic(analyticId, {
                title: `Cluster Medoids`,
                description: `Cluster Medoids`,
                output_data: JSON.stringify({ tables: [medoidsTable] }),
                components: `K-Medoids Cluster Medoids`,
            });
        }

        const distanceMatrixMedoidsTable = allTables.find(t => t.key === "distance_matrix_medoids");
        if (distanceMatrixMedoidsTable && (comprehensiveOutput.visualizationOptions?.showDistanceMatrixBetweenMedoids ?? true)) {
            await addStatistic(analyticId, {
                title: `Distance Matrix Between Medoids`,
                description: `Distance Matrix Between Medoids`,
                output_data: JSON.stringify({ tables: [distanceMatrixMedoidsTable] }),
                components: `K-Medoids Distance Matrix Between Medoids`,
            });
        }

        if (comprehensiveOutput.distanceMatrix) {
            const distanceMatrixTableOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                viewMode: "distanceMatrixTableOnly",
            };
            await addStatistic(analyticId, {
                title: `Distance Matrix Table (All Objects)`,
                description: `Distance Matrix Table (All Objects)`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: distanceMatrixTableOutput,
                }),
                components: `K-Medoids Distance Matrix Table`,
            });
        }

        const convergenceAlgorithmTable = allTables.find(t => t.key === "convergence_algorithm");
        if (convergenceAlgorithmTable && (comprehensiveOutput.visualizationOptions?.showConvergenceAlgorithm ?? true)) {
            await addStatistic(analyticId, {
                title: `Algorithm Convergence`,
                description: `Algorithm Convergence`,
                output_data: JSON.stringify({ tables: [convergenceAlgorithmTable] }),
                components: `K-Medoids Algorithm Convergence`,
            });
        }

        if (
            normalizedMethod !== "CLARA" &&
            iterationHistory.length > 0 &&
            (comprehensiveOutput.visualizationOptions?.showConvergenceChart ?? false)
        ) {
            const convergenceChartOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "convergenceChartOnly",
            };
            await addStatistic(analyticId, {
                title: `Algorithm Convergence Chart`,
                description: `Algorithm Convergence Chart`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: convergenceChartOutput,
                }),
                components: `K-Medoids Algorithm Convergence Chart`,
            });
        }

        // Hanya untuk metode CLARA
        if (
            normalizedMethod === "CLARA" &&
            claraSamplingCosts &&
            claraSamplingCosts.length > 0 &&
            (comprehensiveOutput.visualizationOptions?.showSamplingHistory ?? true)
        ) {
            const samplingHistoryTable: Table = {
                key: "sampling_history",
                title: "Sampling History (CLARA)",
                columnHeaders: [
                    { header: "Sample" },
                    { header: "Sample Size", key: "SampleSize" },
                    { header: "PAM Iterations", key: "PamIterations" },
                    { header: "Cost", key: "Cost" },
                    { header: "Best", key: "Best" },
                ],
                rows: claraSamplingCosts.map((cost, idx) => {
                    const sampleIndex = idx + 1;
                    const pamIterations = Array.isArray(result.sample_pam_iterations) && result.sample_pam_iterations.length > idx
                        ? result.sample_pam_iterations[idx]
                        : (result.iterations ?? 0);
                    return {
                        rowHeader: [`Sample ${sampleIndex}`],
                        SampleSize: claraEffectiveSampleSize.toString(),
                        PamIterations: pamIterations.toString(),
                        Cost: cost.toFixed(4),
                        Best: sampleIndex === claraBestSampleIndex ? "★" : "",
                    };
                }),
            };
            await addStatistic(analyticId, {
                title: `Sampling History (CLARA)`,
                description: `Sampling History (CLARA)`,
                output_data: JSON.stringify({ tables: [samplingHistoryTable] }),
                components: `K-Medoids Sampling History`,
            });
        }

        if (comprehensiveOutput.visualizationOptions?.showSilhouettePerObject ?? false) {
            const silhouetteOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "silhouettePerObjectOnly",
            };
            await addStatistic(analyticId, {
                title: `Silhouette Score`,
                description: `Silhouette Score`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: silhouetteOutput,
                }),
                components: `K-Medoids Silhouette Score`,
            });

            // Tabel ringkasan pendamping, dipakai untuk cetak PDF
            const silhouettePrintTable: Table = {
                key: "silhouette_by_cluster_print",
                title: "Silhouette Score",
                columnHeaders: [
                    { header: "Cluster" },
                    { header: "Average", key: "Average" },
                    { header: "Min", key: "Min" },
                    { header: "Max", key: "Max" },
                    { header: "Count", key: "Count" },
                ],
                rows: silhouettePerCluster.map(s => ({
                    rowHeader: [`Cluster ${s.clusterLabel}`],
                    Average: s.averageScore.toFixed(3),
                    Min: s.minScore.toFixed(3),
                    Max: s.maxScore.toFixed(3),
                    Count: s.count.toString(),
                })),
            };
            await addStatistic(analyticId, {
                title: `Silhouette Score (Table)`,
                description: `Summary table of silhouette values per cluster, used for PDF printing.`,
                output_data: JSON.stringify({ tables: [silhouettePrintTable] }),
                components: `K-Medoids Silhouette Score Table`,
            });
        }

        // Chart dikontrol checkbox "Optimal K Chart" di tab Options (Visualization);
        // tabelnya punya checkbox sendiri di tab Evaluation.
        const hasOptimalKData =
            Boolean(comprehensiveOutput.elbowData && comprehensiveOutput.elbowData.length > 0) ||
            Boolean(comprehensiveOutput.optimalKMethod);
        const shouldShowOptimalKCard =
            comprehensiveOutput.visualizationOptions?.showOptimalKChart ?? hasOptimalKData;
        if (shouldShowOptimalKCard) {
            const optimalKChartOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "optimalKChartOnly",
            };
            await addStatistic(analyticId, {
                title: `Optimal K Chart`,
                description: `Optimal K Chart`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: optimalKChartOutput,
                }),
                components: `K-Medoids Optimal K Chart`,
            });
        }

        const shouldShowOptimalKTable =
            comprehensiveOutput.visualizationOptions?.showOptimalKTable ?? false;
        if (shouldShowOptimalKTable && elbowData && elbowData.length > 0) {
            const optimalKPrintTable: Table = {
                key: "optimal_k_print",
                title: "Optimal K Table",
                columnHeaders: [
                    { header: "K" },
                    { header: "Total Cost", key: "TotalCost" },
                    { header: "Silhouette Score", key: "SilhouetteScore" },
                ],
                rows: elbowData.map(point => ({
                    rowHeader: [point.k.toString()],
                    TotalCost: point.totalCost.toFixed(4),
                    SilhouetteScore: point.silhouetteScore.toFixed(4),
                })),
            };
            await addStatistic(analyticId, {
                title: `Optimal K Table`,
                description: `Optimal K data table (cost & silhouette for each candidate k).`,
                output_data: JSON.stringify({ tables: [optimalKPrintTable] }),
                components: `K-Medoids Optimal K Table`,
            });
        }

        // PCA hanya bermakna jika variabel lebih dari 2
        const shouldShowPCAProjection =
            (comprehensiveOutput.visualizationOptions?.showPCAProjection ?? true) &&
            variables.length > 2;
        if (shouldShowPCAProjection) {
            const pcaProjectionOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "pcaProjectionOnly",
            };
            await addStatistic(analyticId, {
                title: `PCA Projection`,
                description: `PCA Projection`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: pcaProjectionOutput,
                }),
                components: `K-Medoids PCA Projection`,
            });
        }

        if (comprehensiveOutput.visualizationOptions?.showClusterScatterPlot ?? true) {
            const clusterScatterPlotOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "clusterScatterPlotOnly",
            };
            await addStatistic(analyticId, {
                title: `Cluster Scatter Plot`,
                description: `Cluster Scatter Plot`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: clusterScatterPlotOutput,
                }),
                components: `K-Medoids Cluster Scatter Plot`,
            });
        }

        if (comprehensiveOutput.visualizationOptions?.showClusterSizeDistribution ?? true) {
            const clusterSizeDistributionOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "clusterSizeDistributionOnly",
            };
            await addStatistic(analyticId, {
                title: `Cluster Size Distribution`,
                description: `Cluster Size Distribution`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: clusterSizeDistributionOutput,
                }),
                components: `K-Medoids Cluster Size Distribution`,
            });
        }

        await yieldToUI();

        if (comprehensiveOutput.visualizationOptions?.showOverallQualityAssessment ?? true) {
            await addStatistic(analyticId, {
                title: `K-Medoids Comprehensive Analysis`,
                description: `Complete clustering analysis with ${k} clusters (Silhouette: ${averageSilhouette.toFixed(3)})`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: comprehensiveOutput
                }),
                components: `Overall Quality Assessment`,
            });
        }

        return { success: true, output: comprehensiveOutput };

    } catch (error) {
        console.error("❌ Error generating comprehensive output:", error);
        console.error("Error details:", {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        throw error;
    }
}