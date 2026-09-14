// k-medoids-cluster-comprehensive-output.ts
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
    silhouette_scores?: number[]; // Per-object silhouette scores from WASM
    iteration_history?: { iteration: number; cost: number }[];
    /** Raw cost per step: [0]=BUILD cost, [1..n]=cost after each swap (sent by worker). */
    cost_history?: number[];
    /** Medoid indices at each step: [0]=initial, [i]=after swap i. */
    medoid_history?: number[][];
    /** CLARA: cost per sample on the full dataset (length = num_samples). Empty for PAM/CLARANS. */
    sample_costs?: number[];
    /** CLARA: pam iterations per sample. */
    sample_pam_iterations?: number[];
    /** CLARA: 1-based index of the best sample. 0 means N/A (PAM/CLARANS). */
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

/**
 * Calculate Euclidean distance between two points
 * Returns 0 if points are invalid
 */
function euclideanDistance(p1: number[], p2: number[]): number {
    if (!p1 || !p2 || p1.length !== p2.length) return 0;
    let sum = 0;
    for (let i = 0; i < p1.length; i++) {
        const diff = (p1[i] || 0) - (p2[i] || 0);
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Calculate Manhattan distance between two points
 */
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

/**
 * Calculate silhouette score for a single object (TypeScript fallback)
 */
function calculateObjectSilhouette(
    objectIdx: number,
    cluster: number,
    dataMatrix: number[][],
    labels: number[],
    metric: DistanceMetricKind
): number {
    const n = dataMatrix.length;
    const point = dataMatrix[objectIdx];
    
    // Calculate a(i): average distance to points in same cluster
    let sameClusterDistances: number[] = [];
    for (let j = 0; j < n; j++) {
        if (labels[j] === cluster && j !== objectIdx) {
            sameClusterDistances.push(calculateDistance(point, dataMatrix[j], metric));
        }
    }
    
    const a_i = sameClusterDistances.length > 0
        ? sameClusterDistances.reduce((a, b) => a + b, 0) / sameClusterDistances.length
        : 0;
    
    // Calculate b(i): minimum average distance to other clusters
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
    
    // Silhouette score
    if (a_i === 0 && b_i === 0) return 0;
    return (b_i - a_i) / Math.max(a_i, b_i);
}

/**
 * Calculate silhouette scores in chunks to avoid blocking UI
 * Yields control back to browser between chunks
 */
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
        
        // Calculate chunk
        for (let j = i; j < end; j++) {
            scores[j] = calculateObjectSilhouette(j, labels[j], dataMatrix, labels, metric);
        }
        
        // Yield to browser to keep UI responsive
        if (end < n) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    return scores;
}

/**
 * Calculate distance matrix between medoids
 */
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

/**
 * Build full distance matrix for all valid rows (sorted by cluster label)
 */
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

/**
 * Generate descriptive label for cluster based on attributes
 */
function generateClusterLabel(
    meanAttributes: Record<string, number>,
    clusterIdx: number
): string {
    // Simple heuristic: find dominant attribute
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
    // Tiny helper: yield the main thread so the browser can paint/handle events
    // between heavy synchronous sections.  Costs ~1 ms but prevents "frozen" UI.
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

        // ── Authoritative k: prefer config value over WASM-derived medoid count ──
        // result.medoids.length MUST equal the configured k.  If they differ it
        // means the WASM binary is stale (old pam_build destructuring bug where
        // the n-length assignment vector was mistakenly used as the medoid list).
        // Using the config value protects table generation from reporting k = N.
        const configK: number = (() => {
            // Automatic k: the actual chosen k is stored in automaticKSelection.
            if (automaticKSelection?.optimalK && automaticKSelection.optimalK >= 2) {
                return automaticKSelection.optimalK;
            }
            const manualK = config?.main?.Cluster;
            if (typeof manualK === 'number' && manualK >= 2) return manualK;
            // Last resort: trust the medoid count (correct when WASM is up-to-date).
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
        // ── Valid-row mapping ─────────────────────────────────────────────────
        // The analysis service filters dataVariables → dataMatrix (drops rows where
        // any selected variable is non-finite) BEFORE sending to WASM.  WASM therefore
        // returns labels/medoids indexed into the FILTERED matrix (0..N_valid-1), not
        // into the original full dataVariables array (0..N_total-1).
        //
        // We re-derive the same filter here so we can:
        //  1. Map WASM label index → original row index (case number shown to user)
        //  2. Map WASM medoid index → original row index (medoid case numbers)
        //  3. Correctly compute silhouette / cluster profiles on valid rows only
        //
        // This makes case numbers and cluster assignments match R's pam() output.
        const validRowIndices: number[] = [];
        dataVariables.forEach((row: any, origIdx: number) => {
            const valid = variables.every(v => {
                const val = row[v.columnIndex as number];
                return isFinite(typeof val === 'number' ? val : parseFloat(val));
            });
            if (valid) validRowIndices.push(origIdx);
        });

        // n = number of cases actually sent to WASM (= result.labels.length).
        // nTotal = total original rows (used for display only).
        const n = validRowIndices.length;
        const nTotal = dataVariables.length;

        // Reverse map: original index → filtered index (-1 = row excluded due to missing values).
        const origToFiltered = new Array(nTotal).fill(-1);
        validRowIndices.forEach((origIdx, filtIdx) => { origToFiltered[origIdx] = filtIdx; });

        // Re-map labels early (needed by medoid recovery logic below).
        const safeLabels: number[] = result.labels.map(l =>
            (typeof l === 'number' && l >= 0 && l < k) ? l : 0
        );

        // Clamp result.medoids to the first k entries and recover if invalid.
        // safeMedoids[j] is an index into the FILTERED matrix (0..n-1).
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

        // Map WASM medoid indices (filtered) → original row indices.
        // This is what matches R's id.med output (1-based case numbers).
        const safeMedoidsOrig: number[] = safeMedoids.map(fi => validRowIndices[fi] ?? fi);

        // safeLabels[i] is the cluster for the i-th VALID row (filtIdx i).

        // Build data matrix aligned with safeLabels (valid rows only, same order as WASM input).
        const dataMatrix = validRowIndices.map((origIdx: number) =>
            variables.map(v => {
                const val = dataVariables[origIdx][v.columnIndex as number];
                return typeof val === 'number' && isFinite(val) ? val : 0;
            })
        );

        const clusteringMatrix = standardizedMatrix && standardizedMatrix.length === n
            ? standardizedMatrix
            : dataMatrix;

        // Yield after building the data matrix (O(n×d) work)
        await yieldToUI();

        // Use pre-computed per-object silhouette scores from the worker when available.
        // Fallback: compute asynchronously on main thread (chunked to stay non-blocking).
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

        // Calculate cluster sizes — iterate safeLabels (N_valid, not N_total)
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

        // Pre-group data rows by cluster — iterate valid rows only so indices align.
        const dataByCluster: Map<number, any[]> = new Map();
        validRowIndices.forEach((origIdx, filtIdx) => {
            const label = safeLabels[filtIdx];
            if (!dataByCluster.has(label)) dataByCluster.set(label, []);
            const cluster = dataByCluster.get(label);
            if (cluster) {
                cluster.push(dataVariables[origIdx]);
            }
        });

        // Yield before building assignment objects (O(n) object allocations)
        await yieldToUI();

        // medoidSet contains ORIGINAL row indices so isMedoid checks work correctly.
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

        // Prefer the per-object distances already computed by WASM from the exact
        // same distance matrix used for PAM.  This matches R pam() precisely.
        // Fall back to JS Euclidean re-computation only if WASM did not supply them
        // (e.g. old WASM binary, CLARA/CLARANS path that skips the field).
        const wasmDistances: number[] | undefined =
            Array.isArray((result as any).distances_to_medoids) &&
            (result as any).distances_to_medoids.length === n
                ? (result as any).distances_to_medoids
                : undefined;

        // Build object assignments — iterate valid rows only.
        // objectId/objectName use the ORIGINAL row index so case numbers match R.
        const assignments: ObjectAssignment[] = validRowIndices.map((origIdx, filtIdx) => {
            const clusterLabel = safeLabels[filtIdx];
            const medoidOrigIdx = safeMedoidsOrig[clusterLabel];
            const isMedoid = medoidSet.has(origIdx);

            let distanceToMedoid: number;
            if (wasmDistances) {
                // Authoritative: from Rust distance matrix (correct metric, no JS rounding).
                // filtIdx aligns with WASM output (both indexed over valid rows only).
                distanceToMedoid = wasmDistances[filtIdx] ?? 0;
            } else if (isMedoid) {
                distanceToMedoid = 0;
            } else {
                // Fallback: JS Euclidean re-computation.
                // safeMedoids[clusterLabel] is the filtered index of the medoid.
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

        // Single source of truth (R-compatible): gunakan nilai dari WASM.
        // Jangan hitung ulang total cost di JS agar tidak menyimpang dari R.
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

        // Prefer explicit iteration count, but infer from history when absent.
        // History shape is [init, iter1, iter2, ...], so subtract 1 for swap iterations.
        const inferredIterations = Array.isArray(result.cost_history) && result.cost_history.length > 0
            ? Math.max(result.cost_history.length - 1, 0)
            : Array.isArray(result.iteration_history) && result.iteration_history.length > 0
            ? Math.max(result.iteration_history.length - 1, 0)
            : 0;
        const totalIterations =
            typeof result.iterations === "number" && result.iterations > 0
                ? result.iterations
                : inferredIterations;

        // Build summary with calculated total cost
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

        // Build medoid information
        // safeMedoidsOrig[j] is the ORIGINAL row index of the j-th medoid → matches R's id.med.
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

            // Calculate within-cluster distance from already-computed assignments (avoids O(k×n) euclidean recomputation)
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

        // Build cluster profiles
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

            // Calculate silhouette for this cluster
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

        // Build iteration history
        // cost_history layout from Rust: [0]=init_cost, [1..n_iter]=cost after each swap.
        // item.iteration is 0-based (0=Init, 1=first swap, ...) — use ?? (not ||) to
        // preserve iteration=0 for Init and avoid duplicate React keys (0||1==1||2==1).
        //
        // The worker path sends `cost_history` (plain number[]) rather than
        // `iteration_history` ({iteration,cost}[]).  Normalise both sources into
        // the same [{iteration, cost}] shape before mapping so that either path
        // produces the full per-iteration table.
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
                      // Every entry in cost_history[1..] represents an actual swap;
                      // Init (idx=0) has no swap.
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

        // Build optimal-k chart data.
        // Automatic mode gets full k-range scores; manual mode gets the selected k point
        // so the chart can still be shown in output when user chooses k manually.
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
                      // totalCost always carries the elbow/WCSS curve if available.
                      totalCost: resolvedTotalCost,
                      // silhouetteScore is always the actual silhouette value
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

        // Calculate medoid distance matrix in standardized space
        // (same space used for PAM clustering).
        const medoidDistanceMatrix = calculateMedoidDistanceMatrix(
            clusteringMatrix,
            safeMedoids,
            distanceMetric
        );

        // Silhouette scores per cluster
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

        // Yield before building comprehensive output object + tables
        await yieldToUI();

        const claraNumSamples = config?.iterate?.NumSamples ?? 5;
        const claraConfiguredSampleSize = config?.iterate?.SampleSize ?? (40 + 2 * k);
        const claraEffectiveSampleSize = Math.min(claraConfiguredSampleSize, n);

        // ── Priority 1: dedicated sample_costs field (new WASM builds) ──
        // ── Priority 2: cost_history fallback (also populated by new WASM for CLARA) ──
        const rawSampleCosts: number[] | undefined =
            normalizedMethod === "CLARA"
                ? (() => {
                    // Primary: result.sample_costs sent by new WASM builds
                    if (Array.isArray(result.sample_costs) && result.sample_costs.length > 0) {
                        console.log("[ComprehensiveOutput] CLARA: using result.sample_costs =", result.sample_costs);
                        return (result.sample_costs as number[]).filter(
                            (c: unknown) => typeof c === "number" && isFinite(c as number)
                        );
                    }
                    // Fallback: cost_history is also set to per-sample costs by the same WASM update
                    if (Array.isArray(result.cost_history) && result.cost_history.length > 0) {
                        console.log("[ComprehensiveOutput] CLARA: falling back to result.cost_history =", result.cost_history);
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

        // Prefer the 1-based best-sample index sent by WASM; compute from min cost as fallback.
        const claraBestSampleIndex: number | undefined =
            normalizedMethod === "CLARA"
                ? (() => {
                    // Primary: WASM-computed best sample index
                    if (
                        typeof result.clara_best_sample_index === "number" &&
                        result.clara_best_sample_index > 0
                    ) {
                        return result.clara_best_sample_index;
                    }
                    // Fallback: derive from minimum cost
                    if (claraSamplingCosts && claraSamplingCosts.length > 0) {
                        return claraSamplingCosts.findIndex(
                            (cost) => cost === Math.min(...claraSamplingCosts)
                        ) + 1;
                    }
                    return undefined;
                })()
                : undefined;

        console.log("[ComprehensiveOutput] CLARA convergence summary:", {
            claraSamplingCosts,
            claraBestSampleIndex,
            claraNumSamples,
            claraEffectiveSampleSize,
        });

        // Build comprehensive output
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
                                // Use the per-sample PAM iterations sent from WASM
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
            tables: [], // Will be populated below
            visualizationOptions: {
                // Convergence mode always exposes iteration history details.
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
                // Total Cost is always shown in output.
                showTotalCost: true,
                showSilhouettePerObject: config?.evaluation?.ShowSilhouettePlot ?? false,
                // "Optimal K Chart" and its companion table both live in the Evaluation tab.
                // Falls back to the pre-reorg Options field so saved configs keep working.
                showOptimalKChart:
                    config?.evaluation?.ShowOptimalKChart ??
                    config?.options?.ShowOptimalKChart ??
                    false,
                showOptimalKTable: config?.evaluation?.ShowOptimalKTable ?? false,
                showOverallQualityAssessment: config?.evaluation?.ShowOverallQualityAssessment ?? true,
                showConvergenceAlgorithm: config?.results?.ShowConvergenceAlgorithm ?? true,
                showSamplingHistory: config?.results?.ShowSamplingHistory ?? true,
                // Grafik konvergensi kini satu grup dengan tabelnya di tab Results.
                // Falls back to the pre-reorg Options field so saved configs keep working.
                showConvergenceChart:
                    config?.results?.ShowConvergenceChart ??
                    config?.options?.ShowConvergenceChart ??
                    false,
            },
            variables: variables.map(v => ({ name: v.name, label: v.label || v.name }))
        };

        // Create tables (keeping existing format for compatibility)
        const allTables: Table[] = [];
        const caseSummary = buildCaseProcessingSummary(n, nTotal, {
            initialN: analysisResult.preprocessingSummary?.initialN,
            preprocessedN: analysisResult.preprocessingSummary?.afterPreprocessingN,
            missingRowsRemoved: analysisResult.preprocessingSummary?.missingRowsRemoved,
            outlierRowsRemoved: analysisResult.preprocessingSummary?.outlierRowsRemoved,
            missingByVariable: analysisResult.preprocessingSummary?.missingByVariable,
        });

        // Case Processing Summary table (should be first) - SPSS format
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

        // Number of Cases per Cluster table - SPSS format
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

        // Analysis Settings table
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

        // Summary table
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

        // Cluster profiles table
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

        // Total Cost / Dissimilarity table — same metrics shown in the Total Cost / Dissimilarity
        // summary card, as its own titled table section.
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

        // Cluster membership table — same shape as the "Cluster Assignments" table
        // shown in the Data Tables tab (ID, Cluster, Distance, Silhouette, variables,
        // plus standardized variables when normalization is enabled).
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

        // Medoids table
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

        // Convergence Algorithm table — same shape as the table
        // rendered by ConvergenceAlgorithmPanel in the Convergence tab. Not applicable to
        // CLARA, which shows a Sampling History table instead.
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

        // Distance Matrix Between Medoids table — mirrors DistanceMatrixHeatmap's own table.
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

        console.log("💾 Saving to result store...");

        // Save to result store THE NEW COMPREHENSIVE FORMAT
        const titleMessage = `K-Medoids Cluster Analysis (${method})`;
        const logId = await addLog({ log: titleMessage });
        console.log("✅ Log created:", logId);

        const analyticId = await addAnalytic(logId, {
            title: `K-Medoids Clustering Results`,
            note: automaticKSelection
                ? `Automatic k selection: k=${automaticKSelection.optimalK} (${automaticKSelection.method})`
                : `Manual k selection: k=${k}, Algorithm: ${method}`,
        });
        console.log("✅ Analytic created:", analyticId);

        // Save Case Processing Summary as separate statistic (first output)
        const caseProcessingSummaryTable = allTables.find(t => t.key === "case_processing_summary");
        if (caseProcessingSummaryTable) {
            const statId1 = await addStatistic(analyticId, {
                title: `Case Processing Summary`,
                description: `Case Processing Summary`,
                output_data: JSON.stringify({ tables: [caseProcessingSummaryTable] }),
                // Deliberately not the shared "Case Processing Summary" key: that name is
                // registered in the global StatisticsComponents registry (outside this module)
                // to a component with no Copy/SVG buttons. Using a distinct components value
                // here makes ResultOutput fall back to the generic DataTableRenderer path,
                // which matches the standard table template (title + Copy/SVG buttons).
                components: `K-Medoids Case Processing Summary`,
            });
            console.log("✅ Case Processing Summary saved:", statId1);
        }

        // Save Number of Cases per Cluster as separate statistic (own titled section, like Case Processing Summary)
        // Gated by the "Number of Cases per Cluster" checkbox in the Results tab.
        const numberOfCasesPerClusterTable = allTables.find(t => t.key === "number_of_cases_per_cluster");
        if (numberOfCasesPerClusterTable && (comprehensiveOutput.visualizationOptions?.showCaseCount ?? true)) {
            const statId1a = await addStatistic(analyticId, {
                title: `Number of Cases per Cluster`,
                description: `Number of Cases per Cluster`,
                output_data: JSON.stringify({ tables: [numberOfCasesPerClusterTable] }),
                // Distinct components value (not the shared registry key) so ResultOutput
                // falls back to the generic DataTableRenderer path, matching the standard
                // table template (title + Copy/SVG buttons) — same approach as above.
                components: `K-Medoids Number of Cases per Cluster`,
            });
            console.log("✅ Number of Cases per Cluster saved:", statId1a);
        }

        // Save Cluster Profiles as separate statistic (own titled section, like Case Processing Summary)
        const clusterProfilesTable = allTables.find(t => t.key === "cluster_profiles");
        if (clusterProfilesTable) {
            const statId1b = await addStatistic(analyticId, {
                title: `Cluster Profiles`,
                description: `Cluster Profiles`,
                output_data: JSON.stringify({ tables: [clusterProfilesTable] }),
                // Distinct components value (not the shared registry key) so ResultOutput
                // falls back to the generic DataTableRenderer path, matching the standard
                // table template (title + Copy/SVG buttons) — same approach as above.
                components: `K-Medoids Cluster Profiles`,
            });
            console.log("✅ Cluster Profiles saved:", statId1b);
        }

        // Save Total Cost / Dissimilarity as separate statistic (own titled section, like Case
        // Processing Summary)
        const totalCostDissimilarityTable = allTables.find(t => t.key === "total_cost_dissimilarity");
        if (totalCostDissimilarityTable) {
            const statId1cost = await addStatistic(analyticId, {
                title: `Total Cost / Dissimilarity`,
                description: `Total Cost / Dissimilarity`,
                output_data: JSON.stringify({ tables: [totalCostDissimilarityTable] }),
                // Distinct components value (not the shared registry key) so ResultOutput
                // falls back to the generic DataTableRenderer path, matching the standard
                // table template (title + Copy/SVG buttons) — same approach as above.
                components: `K-Medoids Total Cost Dissimilarity`,
            });
            console.log("✅ Total Cost / Dissimilarity saved:", statId1cost);
        }

        // Save Cluster Membership as separate statistic (own titled section, like Case Processing Summary).
        // Uses the same customRenderer hook as the comprehensive analysis (below) so the table
        // gets real pagination (Prev/Next) instead of rendering all rows at once via the generic
        // DataTableRenderer path. `tables`/`distanceMatrix` are dropped to avoid duplicating the
        // (potentially large) formatted tables and full distance matrix already stored in the
        // comprehensive analysis statistic — the membership view only needs `assignments`.
        // Gated by the "Cluster Membership" checkbox in the Results tab.
        const clusterMembershipTable = allTables.find(t => t.key === "cluster_membership");
        if (clusterMembershipTable && (comprehensiveOutput.visualizationOptions?.showObjectAssignments ?? true)) {
            const clusterMembershipOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "clusterMembershipOnly",
            };
            const statId1c = await addStatistic(analyticId, {
                title: `Cluster Membership`,
                description: `Cluster Membership`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: clusterMembershipOutput,
                }),
                components: `K-Medoids Cluster Membership`,
            });
            console.log("✅ Cluster Membership saved:", statId1c);
        }

        // Save Cluster Medoids as separate statistic (own titled section, like Case Processing Summary)
        // Gated by the "Cluster Medoids" checkbox in the Results tab.
        const medoidsTable = allTables.find(t => t.key === "medoids");
        if (medoidsTable && (comprehensiveOutput.visualizationOptions?.showClusterMedoids ?? true)) {
            const statId1d = await addStatistic(analyticId, {
                title: `Cluster Medoids`,
                description: `Cluster Medoids`,
                output_data: JSON.stringify({ tables: [medoidsTable] }),
                // Distinct components value (not the shared registry key) so ResultOutput
                // falls back to the generic DataTableRenderer path, matching the standard
                // table template (title + Copy/SVG buttons) — same approach as above.
                components: `K-Medoids Cluster Medoids`,
            });
            console.log("✅ Cluster Medoids saved:", statId1d);
        }

        // Save Distance Matrix Between Medoids as separate statistic (own titled section, like
        // Case Processing Summary)
        const distanceMatrixMedoidsTable = allTables.find(t => t.key === "distance_matrix_medoids");
        if (distanceMatrixMedoidsTable && (comprehensiveOutput.visualizationOptions?.showDistanceMatrixBetweenMedoids ?? true)) {
            const statId1m = await addStatistic(analyticId, {
                title: `Distance Matrix Between Medoids`,
                description: `Distance Matrix Between Medoids`,
                output_data: JSON.stringify({ tables: [distanceMatrixMedoidsTable] }),
                // Distinct components value (not the shared registry key) so ResultOutput
                // falls back to the generic DataTableRenderer path, matching the standard
                // table template (title + Copy/SVG buttons) — same approach as above.
                components: `K-Medoids Distance Matrix Between Medoids`,
            });
            console.log("✅ Distance Matrix Between Medoids saved:", statId1m);
        }

        // Save Distance Matrix Table (All Objects) as separate statistic (own titled section, like
        // Case Processing Summary). Uses the same customRenderer hook so the section renders the
        // actual full pairwise distance matrix table (paginated, sorted by cluster) with its
        // Excel/CSV download buttons, instead of a flat data table. Only saved when the matrix
        // was actually built (opt-in, since it's O(n²) and can be large). Unlike the other
        // customRenderer statistics, `distanceMatrix` is deliberately kept (not cleared) here —
        // it's the whole point of this section.
        if (comprehensiveOutput.distanceMatrix) {
            const distanceMatrixTableOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                viewMode: "distanceMatrixTableOnly",
            };
            const statId1n = await addStatistic(analyticId, {
                title: `Distance Matrix Table (All Objects)`,
                description: `Distance Matrix Table (All Objects)`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: distanceMatrixTableOutput,
                }),
                components: `K-Medoids Distance Matrix Table`,
            });
            console.log("✅ Distance Matrix Table (All Objects) saved:", statId1n);
        }

        // Save Algorithm Convergence (table) as separate statistic (own titled section, like Case
        // Processing Summary). Gated by the "Algorithm Convergence" checkbox in the Results tab.
        // Plain table only — the cost-per-iteration chart is a separate, independently-toggled
        // section below (see "Algorithm Convergence Chart"), controlled by its own checkbox in
        // the Options/Visualization tab so users can opt into the table without the chart or vice versa.
        const convergenceAlgorithmTable = allTables.find(t => t.key === "convergence_algorithm");
        if (convergenceAlgorithmTable && (comprehensiveOutput.visualizationOptions?.showConvergenceAlgorithm ?? true)) {
            const statId1e = await addStatistic(analyticId, {
                title: `Algorithm Convergence`,
                description: `Algorithm Convergence`,
                output_data: JSON.stringify({ tables: [convergenceAlgorithmTable] }),
                // Distinct components value (not the shared registry key) so ResultOutput
                // falls back to the generic DataTableRenderer path, matching the standard
                // table template (title + Copy/SVG buttons) — same approach as above.
                components: `K-Medoids Algorithm Convergence`,
            });
            console.log("✅ Algorithm Convergence saved:", statId1e);
        }

        // Save Algorithm Convergence Chart as a separate, independently-toggled statistic.
        // Gated by the "Algorithm Convergence Chart" checkbox in the Options/Visualization tab
        // (not the Results-tab table checkbox above) so the chart can be shown/hidden on its own.
        // Uses the same customRenderer hook so the section renders the actual ConvergenceChart
        // (dual-axis: total cost + improvement per iteration) instead of a flat data table.
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
            const statId1eChart = await addStatistic(analyticId, {
                title: `Algorithm Convergence Chart`,
                description: `Algorithm Convergence Chart`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: convergenceChartOutput,
                }),
                components: `K-Medoids Algorithm Convergence Chart`,
            });
            console.log("✅ Algorithm Convergence Chart saved:", statId1eChart);
        }

        // Save Sampling History (CLARA) as separate statistic (own titled section, like Case
        // Processing Summary). Only applicable to the CLARA method, and gated by the
        // "Sampling History (CLARA)" checkbox in the Results tab.
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
            const statId1sh = await addStatistic(analyticId, {
                title: `Sampling History (CLARA)`,
                description: `Sampling History (CLARA)`,
                output_data: JSON.stringify({ tables: [samplingHistoryTable] }),
                components: `K-Medoids Sampling History`,
            });
            console.log("✅ Sampling History (CLARA) saved:", statId1sh);
        }

        // Save Silhouette Score as separate statistic (own titled section, like Case Processing
        // Summary). Uses the same customRenderer hook as Cluster Membership so the section renders
        // the actual silhouette plot (one bar per object, R style) instead of a flat data table.
        // Gated by the "Silhouette Score" checkbox in the Evaluation tab.
        if (comprehensiveOutput.visualizationOptions?.showSilhouettePerObject ?? false) {
            const silhouetteOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "silhouettePerObjectOnly",
            };
            const statId1f = await addStatistic(analyticId, {
                title: `Silhouette Score`,
                description: `Silhouette Score`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: silhouetteOutput,
                }),
                components: `K-Medoids Silhouette Score`,
            });
            console.log("✅ Silhouette Score saved:", statId1f);

            // Companion plain-table statistic — see the Cluster Membership comment above.
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
            const statId1fTable = await addStatistic(analyticId, {
                title: `Silhouette Score (Table)`,
                description: `Summary table of silhouette values per cluster, used for PDF printing.`,
                output_data: JSON.stringify({ tables: [silhouettePrintTable] }),
                components: `K-Medoids Silhouette Score Table`,
            });
            console.log("✅ Silhouette Score (print table) saved:", statId1fTable);
        }

        // Save Optimal K Chart as separate statistic (own titled section, like Case Processing
        // Summary). Uses the same customRenderer hook so the section renders the actual optimal-K
        // chart (silhouette curve, elbow curve, or elbow with silhouette annotation) instead of a
        // flat data table. Gated by the "Optimal K Chart" checkbox in the Options tab
        // (Visualization); the data table below has its own checkbox in the Evaluation tab.
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
            const statId1h = await addStatistic(analyticId, {
                title: `Optimal K Chart`,
                description: `Optimal K Chart`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: optimalKChartOutput,
                }),
                components: `K-Medoids Optimal K Chart`,
            });
            console.log("✅ Optimal K Chart saved:", statId1h);
        }

        // Save Optimal K Table as its own statistic — gated by the "Optimal K Table" checkbox
        // in the Evaluation tab, independent of the chart above.
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
            const statId1hTable = await addStatistic(analyticId, {
                title: `Optimal K Table`,
                description: `Optimal K data table (cost & silhouette for each candidate k).`,
                output_data: JSON.stringify({ tables: [optimalKPrintTable] }),
                components: `K-Medoids Optimal K Table`,
            });
            console.log("✅ Optimal K Table saved:", statId1hTable);
        }

        // Save PCA Projection as separate statistic (own titled section, like Case Processing
        // Summary). Uses the same customRenderer hook so the section renders the actual PCA
        // projection scatter plot instead of a flat data table. Only meaningful with >2 variables.
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
            const statId1j = await addStatistic(analyticId, {
                title: `PCA Projection`,
                description: `PCA Projection`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: pcaProjectionOutput,
                }),
                components: `K-Medoids PCA Projection`,
            });
            console.log("✅ PCA Projection saved:", statId1j);
        }

        // Save Cluster Scatter Plot as separate statistic (own titled section, like Case
        // Processing Summary). Uses the same customRenderer hook so the section renders the
        // actual 2D scatter plot (with its X/Y variable selectors) instead of a flat data table.
        if (comprehensiveOutput.visualizationOptions?.showClusterScatterPlot ?? true) {
            const clusterScatterPlotOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "clusterScatterPlotOnly",
            };
            const statId1k = await addStatistic(analyticId, {
                title: `Cluster Scatter Plot`,
                description: `Cluster Scatter Plot`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: clusterScatterPlotOutput,
                }),
                components: `K-Medoids Cluster Scatter Plot`,
            });
            console.log("✅ Cluster Scatter Plot saved:", statId1k);
        }

        // Save Cluster Size Distribution as separate statistic (own titled section, like Case
        // Processing Summary). Uses the same customRenderer hook so the section renders the
        // actual donut chart instead of a flat data table.
        if (comprehensiveOutput.visualizationOptions?.showClusterSizeDistribution ?? true) {
            const clusterSizeDistributionOutput: KMedoidsOutput = {
                ...comprehensiveOutput,
                tables: [],
                distanceMatrix: undefined,
                viewMode: "clusterSizeDistributionOnly",
            };
            const statId1l = await addStatistic(analyticId, {
                title: `Cluster Size Distribution`,
                description: `Cluster Size Distribution`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: clusterSizeDistributionOutput,
                }),
                components: `K-Medoids Cluster Size Distribution`,
            });
            console.log("✅ Cluster Size Distribution saved:", statId1l);
        }

        // Yield to UI before the large JSON.stringify + IndexedDB write.
        // The comprehensiveOutput object can be 200 KB–2 MB for large datasets;
        // serialising it synchronously would freeze the main thread for 50–400 ms.
        await yieldToUI();

        // Save comprehensive output - Use custom renderer approach.
        // Store as a special marker that will trigger custom OutputRenderer.
        // This entry's only visible content is the Overall Quality Assessment card (the "full"
        // viewMode branch in OutputRenderer renders nothing else), so it must be skipped entirely
        // when the checkbox is off — ResultOutput renders `components` as a section header for
        // ANY statistic sharing that name regardless of the card's own internal visibility check,
        // so merely hiding the card left a bare "Overall Quality Assessment" header + description
        // behind even when unchecked.
        if (comprehensiveOutput.visualizationOptions?.showOverallQualityAssessment ?? true) {
            const statId2 = await addStatistic(analyticId, {
                title: `K-Medoids Comprehensive Analysis`,
                description: `Complete clustering analysis with ${k} clusters (Silhouette: ${averageSilhouette.toFixed(3)})`,
                output_data: JSON.stringify({
                    customRenderer: "KMedoidsOutputRenderer",
                    data: comprehensiveOutput
                }),
                components: `Overall Quality Assessment`,
            });
            console.log("✅ Comprehensive Analysis saved:", statId2);
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
