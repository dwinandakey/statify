/* eslint-disable no-console */
/**
 * K-Medoids Clustering Web Worker
 * Runs WASM clustering algorithms in background thread
 */

import type { WorkerRequestMessage, WorkerResponseMessage, ClusteringInput, ClusteringRangeInput, ClusteringRangeItem } from "../types/worker";
import { recoverMedoidsFromMismatch } from "./k-medoids-cluster-guards";

// Import WASM module - will be initialized when worker starts
type WasmModule = {
    test_connection: () => string;
    run_k_medoids: (input: unknown) => Record<string, unknown>;
    run_k_medoids_typed: (...args: unknown[]) => Record<string, unknown>;
    run_k_medoids_range: (input: unknown) => Record<string, unknown>[];
    run_silhouette?: (input: unknown) => Record<string, unknown>;
    initThreadPool?: (n: number) => Promise<void>;
};
let wasmModule: WasmModule | null = null;
let wasmInitialized = false;
let currentOperation: AbortController | null = null;
/** Data matrix cached via setData – avoids re-serialization in auto-k loops */
let cachedData: number[][] | null = null;

// ── Lightweight silhouette & WCSS helpers (run inside worker thread) ─────────

const MAX_SILHOUETTE_SAMPLE = 300;

function normalizeDistanceMetric(metric: unknown): "euclidean" | "manhattan" {
    const normalized = String(metric ?? "euclidean").toLowerCase();
    if (normalized === "manhattan" || normalized === "cityblock" || normalized === "l1") {
        return "manhattan";
    }
    return "euclidean";
}

function workerEuclidean(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
}

function workerManhattan(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s;
}

function workerDistance(a: number[], b: number[], metric: "euclidean" | "manhattan"): number {
    return metric === "manhattan" ? workerManhattan(a, b) : workerEuclidean(a, b);
}

function computeSilhouette(
    data: number[][],
    labels: number[],
    nClusters: number,
    metric: "euclidean" | "manhattan"
): number {
    const n = data.length;
    if (nClusters <= 1 || nClusters >= n || n === 0) return 0;

    let sampleData = data;
    let sampleLabels = labels;
    if (n > MAX_SILHOUETTE_SAMPLE) {
        const perCluster = Math.max(1, Math.floor(MAX_SILHOUETTE_SAMPLE / nClusters));
        const indices: number[] = [];
        for (let c = 0; c < nClusters; c++) {
            const ci = labels.reduce<number[]>((a, l, i) => { if (l === c) a.push(i); return a; }, []);
            const step = Math.max(1, Math.floor(ci.length / perCluster));
            for (let j = 0; j < ci.length && indices.length < MAX_SILHOUETTE_SAMPLE; j += step)
                indices.push(ci[j]);
        }
        sampleData = indices.map(i => data[i]);
        sampleLabels = indices.map(i => labels[i]);
    }

    const sn = sampleData.length;
    const clusters: number[][] = Array.from({ length: nClusters }, () => []);
    for (let i = 0; i < sn; i++) clusters[sampleLabels[i]].push(i);

    let total = 0;
    for (let i = 0; i < sn; i++) {
        const ci = sampleLabels[i];
        const same = clusters[ci];
        let a = 0;
        if (same.length > 1) {
            for (const j of same) if (i !== j) a += workerDistance(sampleData[i], sampleData[j], metric);
            a /= (same.length - 1);
        }
        let b = Infinity;
        for (let oc = 0; oc < nClusters; oc++) {
            if (oc === ci) continue;
            const op = clusters[oc];
            if (op.length === 0) continue;
            let d = 0;
            for (const j of op) d += workerDistance(sampleData[i], sampleData[j], metric);
            b = Math.min(b, d / op.length);
        }
        total += b === Infinity ? 0 : (b - a) / Math.max(a, b);
    }
    return total / sn;
}

function computeWCSS(
    data: number[][],
    labels: number[],
    medoidIndices: number[],
    metric: "euclidean" | "manhattan"
): number {
    let wcss = 0;
    for (let i = 0; i < data.length; i++) {
        const m = medoidIndices[labels[i]];
        const dist = workerDistance(data[i], data[m], metric);
        wcss += metric === "manhattan" ? dist : dist ** 2;
    }
    return wcss;
}

/**
 * Compute per-object silhouette scores in the worker thread (off main thread).
 * For n > MAX_PER_OBJECT, uses a stratified sample and assigns 0 to unsampled
 * points — avoids O(n²) cost for large datasets while keeping representative scores.
 */
const MAX_PER_OBJECT = 2000;
function computeSilhouettePerObject(
    data: number[][],
    labels: number[],
    nClusters: number,
    metric: "euclidean" | "manhattan"
): number[] {
    const n = data.length;
    if (nClusters <= 1 || nClusters >= n || n === 0) return new Array(n).fill(0);

    const clusters: number[][] = Array.from({ length: nClusters }, () => []);
    for (let i = 0; i < n; i++) clusters[labels[i]].push(i);

    // Build the list of indices to compute; for large n, stratified sample only
    let computeIndices: number[];
    if (n <= MAX_PER_OBJECT) {
        computeIndices = Array.from({ length: n }, (_, i) => i);
    } else {
        const perCluster = Math.max(1, Math.floor(MAX_PER_OBJECT / nClusters));
        computeIndices = [];
        for (let c = 0; c < nClusters; c++) {
            const ci = clusters[c];
            const step = Math.max(1, Math.floor(ci.length / perCluster));
            for (let j = 0; j < ci.length && computeIndices.length < MAX_PER_OBJECT; j += step)
                computeIndices.push(ci[j]);
        }
    }

    const scores = new Array(n).fill(0);
    for (const i of computeIndices) {
        const ci = labels[i];
        const same = clusters[ci];
        let a = 0;
        if (same.length > 1) {
            for (const j of same) if (i !== j) a += workerDistance(data[i], data[j], metric);
            a /= same.length - 1;
        }
        let b = Infinity;
        for (let oc = 0; oc < nClusters; oc++) {
            if (oc === ci) continue;
            const op = clusters[oc];
            if (op.length === 0) continue;
            let d = 0;
            for (const j of op) d += workerDistance(data[i], data[j], metric);
            b = Math.min(b, d / op.length);
        }
        scores[i] = b === Infinity ? 0 : (b - a) / Math.max(a, b);
    }
    return scores;
}

/**
 * Initialize WASM module
 */
async function initializeWasm(wasmPath?: string, requestId?: number): Promise<void> {
    if (wasmInitialized) {
        // Already ready — reply immediately so init() callers don't hang
        postMessage({ type: "ready", requestId } as WorkerResponseMessage);
        return;
    }

    try {
        // Import WASM module dynamically
        const wasmImport = await import("@/public/workers/Clustering/K-Medoids/wasm");

        // Initialize WASM using explicit public path first. This avoids
        // brittle relative URL resolution when worker chunks are relocated.
        const initCandidates: (string | undefined)[] = [
            wasmPath,
            "/workers/Clustering/K-Medoids/wasm_bg.wasm",
            undefined,
        ];
        let initialized = false;
        let lastInitError: unknown = null;

        for (const candidate of initCandidates) {
            if (initialized) break;
            try {
                await wasmImport.default(candidate as string | undefined);
                initialized = true;
            } catch (initError) {
                lastInitError = initError;
                if (candidate) {
                    console.warn(`[Worker] WASM init failed for path: ${candidate}`, initError);
                } else {
                    console.warn("[Worker] WASM init failed using module-relative fallback", initError);
                }
            }
        }

        if (!initialized) {
            throw lastInitError ?? new Error("Unable to initialize WASM module");
        }
        const moduleInstance = wasmImport as unknown as WasmModule;
        wasmModule = moduleInstance;
        wasmInitialized = true;

        // ── Rayon thread pool (wasm-bindgen-rayon, `threading` feature) ────────
        // When the WASM module was compiled with `--features threading`, it
        // exports `initThreadPool(n)` which spawns n WebWorker threads and
        // initialises rayon's global pool.  This requires the page to be served
        // with Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers
        // so SharedArrayBuffer is available.  If the module was built without
        // the feature (or SAB is unavailable) the function won't exist — we
        // fall through silently and run single-threaded.
        if (typeof moduleInstance.initThreadPool === "function") {
            try {
                const numThreads = navigator.hardwareConcurrency || 4;
                await moduleInstance.initThreadPool(numThreads);
            } catch (e) {
                console.warn("[Worker] Thread pool init skipped (single-threaded build or no SAB):", e);
            }
        }

        // Test connection
        moduleInstance.test_connection();

        postMessage({ type: "ready", requestId } as WorkerResponseMessage);
    } catch (error) {
        console.error("[Worker] Failed to initialize WASM:", error);
        postMessage({ 
            type: "error", 
            error: `WASM initialization failed: ${error}`,
            requestId,
        } as WorkerResponseMessage);
        throw error;
    }
}

/**
 * Send progress update to main thread
 */
function sendProgress(stage: string, progress: number, message: string): void {
    postMessage({
        type: "progress",
        data: { stage, progress, message }
    } as WorkerResponseMessage);
}

// ── Typed-array fast path helper ─────────────────────────────────────────────
// Flattens a row-major number[][] into a Float64Array so we can call
// run_k_medoids_typed() instead of the serde-based run_k_medoids().
// Measured speedup for n=1000, d=10: ~35 ms serde → ~2 ms typed arrays.
function flattenMatrix(data: number[][]): Float64Array {
    const n = data.length;
    const d = n > 0 ? data[0].length : 0;
    const flat = new Float64Array(n * d);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < d; j++) {
            flat[i * d + j] = data[i][j];
        }
    }
    return flat;
}

/**
 * Run clustering algorithm
 */
async function runClustering(input: ClusteringInput, requestId?: number): Promise<void> {
    if (!wasmInitialized || !wasmModule) {
        postMessage({ 
            type: "error", 
            error: "WASM not initialized",
            requestId,
        } as WorkerResponseMessage);
        return;
    }

    // Create abort controller for cancellation
    currentOperation = new AbortController();

    try {
        sendProgress("preparing", 0, "Preparing data...");

        // Resolve data: use caller-provided data or fall back to cached matrix
        const resolvedData = (input.data && input.data.length > 0) ? input.data : cachedData;

        // Validate input
        if (!resolvedData || resolvedData.length === 0) {
            throw new Error("No data provided and no cached data available");
        }

        if (input.n_clusters < 2) {
            throw new Error("Number of clusters must be at least 2");
        }

        if (input.n_clusters > resolvedData.length) {
            throw new Error("Number of clusters cannot exceed number of data points");
        }

        // WASM requires k < n strictly (k == n leaves no non-medoid candidates
        // for CLARANS and is meaningless for PAM). Catch it here with a clear message.
        if (input.n_clusters >= resolvedData.length) {
            throw new Error(
                `Number of clusters (${input.n_clusters}) must be less than the number of data points (${resolvedData.length}). ` +
                `Please reduce the number of clusters or add more data rows.`
            );
        }

        sendProgress("preparing", 20, `Processing ${resolvedData.length} data points...`);

        // Check for cancellation
        if (currentOperation.signal.aborted) {
            postMessage({ type: "cancelled", requestId } as WorkerResponseMessage);
            return;
        }

        // ── Choose fast typed-array path vs serde-JSON path ──────────────────
        // The typed path avoids serde_wasm_bindgen overhead for the data matrix
        // AND allows live per-iteration progress callbacks from Rust to JS.
        // Fallback to the serde path for CLARA/CLARANS (not yet in typed API).
        const normalizedMetric = normalizeDistanceMetric(input.distance_metric);
        const isPAM = (input.method || "pam").toLowerCase() === "pam";
        // Typed path currently hardcodes R-style BUILD initialization in WASM.
        // If caller requests non-R/random init, force serde path so those flags apply.
        const requiresCustomPamInit = input.use_build_phase === false || input.use_r_implementation === false;
        // Typed path is known to be unreliable for Manhattan in some builds — use serde path instead.
        const typedMetricSupported = normalizedMetric === "euclidean";
        const hasTypedApi = isPAM && typedMetricSupported && !requiresCustomPamInit && typeof wasmModule.run_k_medoids_typed === "function";

        if (input.n_clusters < 2 || !Number.isInteger(input.n_clusters)) {
            console.error(`[Worker] INVALID k=${input.n_clusters} — must be an integer ≥ 2. Possible stale state from prior run.`);
        }

        let result: Record<string, unknown>;

        if (hasTypedApi) {
            // ── Fast path: Float64Array input + callback ──────────────────────
            sendProgress("clustering", 40, `Running PAM (typed-array path)…`);

            const n = resolvedData.length;
            const d = resolvedData[0]?.length ?? 0;
            const flatData = flattenMatrix(resolvedData);

            // Progress callback: fired from Rust after each SWAP iteration.
            // Clamps the displayed progress to 40..89 range (matching the serde path).
            const maxIter = input.max_iterations || 100;
            const onProgress = (iter: number, cost: number) => {
                const pct = 40 + Math.min(49, Math.round((iter / maxIter) * 49));
                sendProgress("clustering", pct, `Iteration ${iter} — cost ${cost.toFixed(4)}`);
            };

            // ── Streaming: send initial medoids before the SWAP phase ────────
            // Fired by Rust once after the BUILD phase.  Lets the UI show cluster
            // centres immediately instead of waiting for all SWAP iterations.
            const onInitialMedoids = (medoidsArr: Uint32Array) => {
                const initial_medoids = Array.from(medoidsArr);
                postMessage({
                    type: "partial_result",
                    data: { initial_medoids },
                    requestId,
                } as WorkerResponseMessage);
                sendProgress(
                    "clustering", 41,
                    `Initial medoids ready: [${initial_medoids.join(", ")}] — running SWAP phase…`
                );
            };

            result = wasmModule.run_k_medoids_typed(
                flatData,
                n,
                d,
                input.n_clusters,
                "pam",
                maxIter,
                normalizedMetric,
                BigInt(input.random_seed !== null && input.random_seed !== undefined ? Math.trunc(input.random_seed) : -1),
                input.convergence_tolerance ?? 0.0,
                input.n_init ?? 1,
                onProgress,
                onInitialMedoids,
            );

            // cluster_assignments and silhouette_scores come back as typed arrays.
            // Convert to plain arrays for downstream code compatibility.
            if (result.cluster_assignments instanceof Uint32Array) {
                result.cluster_assignments = Array.from(result.cluster_assignments as Uint32Array);
            }
            if (result.medoids_indices instanceof Uint32Array) {
                result.medoids_indices = Array.from(result.medoids_indices as Uint32Array);
            }
            if (result.silhouette_scores instanceof Float64Array) {
                result.silhouette_scores = Array.from(result.silhouette_scores as Float64Array);
            }
            if (result.distances_to_medoids instanceof Float64Array) {
                result.distances_to_medoids = Array.from(result.distances_to_medoids as Float64Array);
            }
            if (result.cost_history instanceof Float64Array) {
                result.cost_history = Array.from(result.cost_history as Float64Array);
            }
            // medoid_history is a JS Array of Uint32Arrays from the typed path
            if (Array.isArray(result.medoid_history)) {
                result.medoid_history = (result.medoid_history as (Uint32Array | number[])[]).map((arr) =>
    arr instanceof Uint32Array ? Array.from(arr) : (Array.isArray(arr) ? arr : [])
);
            }

        } else {
            // ── Serde-JSON fallback path (CLARA / CLARANS / old build) ────────
            const wasmInput = {
                data: resolvedData,
                n_clusters: input.n_clusters,
                method: input.method,
                max_iterations: input.max_iterations,
                distance_metric: normalizedMetric,
                ...(input.random_seed !== null && input.random_seed !== undefined ? { random_seed: input.random_seed } : {}),
                n_init: input.n_init ?? 1,
                convergence_tolerance: input.convergence_tolerance ?? 0.0,
                use_build_phase: input.use_build_phase ?? true,
                use_r_implementation: input.use_r_implementation ?? true,
                clara_num_samples: input.clara_num_samples ?? 5,
                ...(input.clara_sample_size !== null && input.clara_sample_size !== undefined ? { clara_sample_size: input.clara_sample_size } : {}),
                clarans_num_local: input.clarans_num_local ?? 2,
                ...(input.clarans_max_neighbors !== null && input.clarans_max_neighbors !== undefined ? { clarans_max_neighbors: input.clarans_max_neighbors } : {}),
            };
            sendProgress("clustering", 40, `Running ${input.method} algorithm…`);
            result = wasmModule.run_k_medoids(wasmInput);
        }

        sendProgress("finalizing", 90, "Finalizing results...");

        // Check for cancellation before sending result
        if (currentOperation.signal.aborted) {
            postMessage({ type: "cancelled", requestId } as WorkerResponseMessage);
            return;
        }

        // Send result back to main thread (map WASM output format to TypeScript format)
        const labels: number[] = (result.cluster_assignments ?? result.labels ?? []) as number[];
        const rawMedoids: number[] = (result.medoids_indices ?? result.medoid_indices ?? result.medoids ?? []) as number[];

        // ── k-integrity guard ────────────────────────────────────────────────────
        // If the WASM binary is stale (compiled before the pam_build destructuring
        // fix), `medoids_indices` may contain the full n-length assignment vector
        // instead of the k-length medoid-index vector.  Detect this and truncate
        // so downstream TypeScript always receives exactly n_clusters medoids.
        // Root cause: kmedoids::pam_build returns (loss, assi[n], meds[k]);
        // old code accidentally took element [1] (assi) instead of element [2] (meds).
        let medoids: number[];
        if (rawMedoids.length !== input.n_clusters) {
            console.error(
                `[Worker] ⚠️ k-mismatch detected: expected ${input.n_clusters} medoids from WASM, got ${rawMedoids.length}.` +
                ` This usually means the WASM binary is stale. Rebuild with: wasm-pack build --target web.` +
                ` Attempting label-based medoid recovery to keep indices valid.`
            );
            medoids = recoverMedoidsFromMismatch(
                rawMedoids,
                labels,
                input.n_clusters,
                resolvedData.length
            );
        } else {
            medoids = rawMedoids;
        }

        // Compute silhouette + WCSS here in the worker thread (off main thread).
        // Per-object scores are always computed so generateComprehensiveKMedoidsOutput
        // can skip the expensive O(n²) JS fallback on the main thread.
        let silhouetteScore: number;
        let silhouettePerObject: number[] = [];

        sendProgress("silhouette", 92, "Computing silhouette scores...");

        // Priority 1: WASM embeds per-object scores inside the PAM result itself
        // (added in the cache-optimisation refactor — reuses the dist matrix already
        //  built by PAM, so no extra distance computation is needed).
        const wasmEmbeddedScores: number[] = (result.silhouette_scores ?? []) as number[];
        if (wasmEmbeddedScores.length === resolvedData.length) {
            silhouettePerObject = wasmEmbeddedScores;
        } else if (typeof wasmModule.run_silhouette === "function") {
            // Priority 2: dedicated WASM silhouette function (legacy path)
            try {
                const silResult = wasmModule.run_silhouette({
                    data: resolvedData,
                    labels,
                    n_clusters: input.n_clusters,
                    distance_metric: normalizedMetric,
                });
                silhouetteScore = typeof silResult?.overall === "number" ? silResult.overall : 0;
                silhouettePerObject = Array.isArray(silResult?.per_object) ? silResult.per_object : [];
            } catch {
                silhouettePerObject = [];
            }
        }

        // Priority 3: JS fallback (O(n²) in worker thread — non-blocking for main UI)
        if (silhouettePerObject.length !== resolvedData.length) {
            silhouettePerObject = computeSilhouettePerObject(
                resolvedData,
                labels,
                input.n_clusters,
                normalizedMetric
            );
        }
        silhouetteScore = silhouettePerObject.length > 0
            ? silhouettePerObject.reduce((s, v) => s + v, 0) / silhouettePerObject.length
            : 0;

        const wcssScore = computeWCSS(
            resolvedData,
            labels,
            medoids,
            normalizedMetric
        );

        // distances_to_medoids from WASM is the authoritative source — computed
        // from the exact same distance matrix used for PAM (matches R pam() output).
        const rawDist = result.distances_to_medoids;
        const distances_to_medoids: number[] | undefined =
            rawDist instanceof Float64Array
                ? Array.from(rawDist as Float64Array)
                : Array.isArray(rawDist) && rawDist.length > 0
                ? rawDist
                : undefined;

        const explicitIterations = result.iterations;
        const inferredIterations = Array.isArray(result.cost_history) && result.cost_history.length > 0
            ? Math.max(result.cost_history.length - 1, 0)
            : 0;
        const totalIterations =
            typeof explicitIterations === "number" && explicitIterations > 0
                ? explicitIterations
                : inferredIterations;

        const totalCost = (result.total_distance ?? result.total_cost ?? result.cost ?? 0) as number;
        const avgCost =
            typeof result.avg_cost === "number"
                ? result.avg_cost
                : typeof result.avgCost === "number"
                ? result.avgCost
                : labels.length > 0
                ? totalCost / labels.length
                : 0;

        const mappedResult = {
            labels,
            medoids,
            cost: totalCost,
            avgCost,
            total_cost_build:
                result.total_cost_build ??
                (Array.isArray(result.cost_history) && result.cost_history.length > 0
                    ? result.cost_history[0]
                    : undefined),
            total_cost_swap:
                result.total_cost_swap ??
                (Array.isArray(result.cost_history) && result.cost_history.length > 0
                    ? result.cost_history[result.cost_history.length - 1]
                    : undefined),
            iterations: totalIterations,
            converged: (result.converged ?? false) as boolean,
            cost_history: (result.cost_history ?? []) as number[],
            medoid_history: (result.medoid_history ?? []) as (number[] | Uint32Array)[],
            // Use WASM per-object scores (fast) so generateComprehensiveKMedoidsOutput
            // skips the O(n²) JavaScript fallback in calculateSilhouetteScoresAsync
            silhouette_scores: silhouettePerObject.length > 0 ? silhouettePerObject : ((result.silhouette_scores ?? []) as number[]),
            distances_to_medoids,
            silhouetteScore,
            wcssScore,
            // CLARA-specific: per-sample costs on the full dataset (empty for PAM/CLARANS)
            sample_costs: Array.isArray(result.sample_costs) ? result.sample_costs : [],
            // CLARA-specific: per-sample PAM iterations
            sample_pam_iterations: Array.isArray(result.sample_pam_iterations) ? result.sample_pam_iterations : [],
            // CLARA-specific: 1-based index of the best sample (0 = N/A for PAM/CLARANS)
            clara_best_sample_index: typeof result.clara_best_sample_index === "number"
                ? result.clara_best_sample_index
                : 0,
        };
        
        sendProgress("complete", 100, "Analysis complete!");
        
        postMessage({
            type: "success",
            result: mappedResult,
            requestId,
        } as WorkerResponseMessage);

    } catch (error) {
        console.error("[Worker] Clustering error:", error);
        postMessage({ 
            type: "error", 
            error: error instanceof Error ? error.message : String(error),
            requestId,
        } as WorkerResponseMessage);
    } finally {
        currentOperation = null;
    }
}

/**
 * Cancel current operation
 */
function cancelOperation(): void {
    if (currentOperation) {
        currentOperation.abort();
    }
}

/**
 * Run clustering for a range of k values using a single WASM call.
 * The distance matrix is built once inside WASM — no JS overhead per k.
 */
async function runClusteringRange(input: ClusteringRangeInput, requestId?: number): Promise<void> {
    if (!wasmInitialized || !wasmModule) {
        postMessage({ type: "error", error: "WASM not initialized", requestId } as WorkerResponseMessage);
        return;
    }
    if (!wasmModule.run_k_medoids_range) {
        postMessage({ type: "error", error: "run_k_medoids_range not available in this WASM build", requestId } as WorkerResponseMessage);
        return;
    }

    try {
        const resolvedData = (input.data && input.data.length > 0) ? input.data : cachedData;
        if (!resolvedData || resolvedData.length === 0) {
            throw new Error("No data provided and no cached data available");
        }

        // For the exploration pass we only need a relative ranking of k values,
        // not optimal assignments for all n points.  Subsample to ≤RANGE_SAMPLE
        // points so the O(k×n²) SWAP phase stays fast regardless of dataset size.
        // The final single-k clustering always uses the full dataset.
        const RANGE_SAMPLE = MAX_SILHOUETTE_SAMPLE; // 300 — same cap used for silhouette
        let rangeData = resolvedData;
        if (resolvedData.length > RANGE_SAMPLE) {
            const step = Math.floor(resolvedData.length / RANGE_SAMPLE);
            rangeData = [];
            for (let i = 0; i < resolvedData.length && rangeData.length < RANGE_SAMPLE; i += step) {
                rangeData.push(resolvedData[i]);
            }
        }

        sendProgress("preparing", 5, `Building distance matrix for n=${rangeData.length}...`);

        const normalizedMetric = normalizeDistanceMetric(input.distance_metric);
        const wasmInput = {
            data: rangeData,
            k_min: input.k_min,
            k_max: input.k_max,
            method: input.method,
            max_iterations: input.max_iterations,
            distance_metric: normalizedMetric,
            random_seed: input.random_seed ?? null,
            convergence_tolerance: input.convergence_tolerance ?? 0.0,
        };

        sendProgress("clustering", 20, `Testing k=${input.k_min}..${input.k_max} (single WASM call)...`);

        const rawResults: Record<string, unknown>[] = wasmModule.run_k_medoids_range(wasmInput);

        sendProgress("scoring", 80, "Computing silhouette scores...");

        // Map WASM output and compute silhouette/WCSS in worker (off main thread).
        // Use rangeData for scoring — labels/medoids are indices into rangeData.
        const metric = normalizeDistanceMetric(input.distance_metric);
        const items: ClusteringRangeItem[] = rawResults.map((item) => {
            const labels: number[] = (item.cluster_assignments ?? []) as number[];
            const medoids: number[] = (item.medoids_indices ?? []) as number[];
            const k = item.k as number;
            // Prefer the WASM-computed silhouette_overall (reuses shared dist matrix).
            // Fall back to the JS computation only if the field is absent (old build).
            const silhouetteScore = typeof item.silhouette_overall === "number"
                ? item.silhouette_overall
                : computeSilhouette(rangeData, labels, k, metric);
            return {
                k,
                labels,
                medoids,
                cost: (item.total_distance ?? 0) as number,
                iterations: (item.iterations ?? 0) as number,
                converged: (item.converged ?? false) as boolean,
                cost_history: (item.cost_history ?? []) as number[],
                silhouetteScore,
                wcssScore: computeWCSS(rangeData, labels, medoids, metric),
            };
        });

        sendProgress("complete", 100, "Range analysis complete!");
        postMessage({ type: "range_success", results: items, requestId } as WorkerResponseMessage);

    } catch (error) {
        console.error("[Worker] Range clustering error:", error);
        postMessage({
            type: "error",
            error: error instanceof Error ? error.message : String(error),
            requestId,
        } as WorkerResponseMessage);
    }
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
    const message = event.data;
    const requestId: number | undefined = (message as WorkerRequestMessage & { id?: number }).id;

    try {
        switch (message.type) {
            case "init":
                await initializeWasm(message.wasmPath, requestId);
                break;

            case "setData":
                cachedData = message.data;
                postMessage({ type: "dataStored", requestId } as WorkerResponseMessage);
                break;

            case "cluster":
                await runClustering(message.input, requestId);
                break;

            case "cluster_range":
                await runClusteringRange(message.input, requestId);
                break;

            case "cancel":
                cancelOperation();
                postMessage({ type: "cancelled", requestId } as WorkerResponseMessage);
                break;

            case "ping":
                postMessage({ type: "pong", requestId } as WorkerResponseMessage);
                break;

            default:
                console.warn("[Worker] Unknown message type:", message);
        }
    } catch (error) {
        console.error("[Worker] Message handling error:", error);
        postMessage({ 
            type: "error", 
            error: error instanceof Error ? error.message : String(error),
            requestId,
        } as WorkerResponseMessage);
    }
};

// Handle worker errors
self.onerror = (error: string | Event) => {
    console.error("[Worker] Global error:", error);
    let errorMessage = "Unknown worker error";
    
    if (typeof error === 'string') {
        errorMessage = error;
    } else if (error instanceof ErrorEvent) {
    errorMessage = error.message;
}
    
    postMessage({ 
        type: "error", 
        error: errorMessage
    } as WorkerResponseMessage);
};

// Auto-initialize on worker start
initializeWasm().catch(error => {
    console.error("[Worker] Auto-init failed:", error);
});
