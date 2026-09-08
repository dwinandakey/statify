"use strict";
import { recoverMedoidsFromMismatch } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/services/k-medoids-cluster-guards";
let wasmModule = null;
let wasmInitialized = false;
let currentOperation = null;
let cachedData = null;
const MAX_SILHOUETTE_SAMPLE = 300;
function workerEuclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}
function computeSilhouette(data, labels, nClusters) {
  const n = data.length;
  if (nClusters <= 1 || nClusters >= n || n === 0) return 0;
  let sampleData = data;
  let sampleLabels = labels;
  if (n > MAX_SILHOUETTE_SAMPLE) {
    const perCluster = Math.max(1, Math.floor(MAX_SILHOUETTE_SAMPLE / nClusters));
    const indices = [];
    for (let c = 0; c < nClusters; c++) {
      const ci = labels.reduce((a, l, i) => {
        if (l === c) a.push(i);
        return a;
      }, []);
      const step = Math.max(1, Math.floor(ci.length / perCluster));
      for (let j = 0; j < ci.length && indices.length < MAX_SILHOUETTE_SAMPLE; j += step)
        indices.push(ci[j]);
    }
    sampleData = indices.map((i) => data[i]);
    sampleLabels = indices.map((i) => labels[i]);
  }
  const sn = sampleData.length;
  const clusters = Array.from({ length: nClusters }, () => []);
  for (let i = 0; i < sn; i++) clusters[sampleLabels[i]].push(i);
  let total = 0;
  for (let i = 0; i < sn; i++) {
    const ci = sampleLabels[i];
    const same = clusters[ci];
    let a = 0;
    if (same.length > 1) {
      for (const j of same) if (i !== j) a += workerEuclidean(sampleData[i], sampleData[j]);
      a /= same.length - 1;
    }
    let b = Infinity;
    for (let oc = 0; oc < nClusters; oc++) {
      if (oc === ci) continue;
      const op = clusters[oc];
      if (op.length === 0) continue;
      let d = 0;
      for (const j of op) d += workerEuclidean(sampleData[i], sampleData[j]);
      b = Math.min(b, d / op.length);
    }
    total += b === Infinity ? 0 : (b - a) / Math.max(a, b);
  }
  return total / sn;
}
function computeWCSS(data, labels, medoidIndices) {
  let wcss = 0;
  for (let i = 0; i < data.length; i++) {
    const m = medoidIndices[labels[i]];
    wcss += workerEuclidean(data[i], data[m]) ** 2;
  }
  return wcss;
}
const MAX_PER_OBJECT = 2e3;
function computeSilhouettePerObject(data, labels, nClusters) {
  const n = data.length;
  if (nClusters <= 1 || nClusters >= n || n === 0) return new Array(n).fill(0);
  const clusters = Array.from({ length: nClusters }, () => []);
  for (let i = 0; i < n; i++) clusters[labels[i]].push(i);
  let computeIndices;
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
      for (const j of same) if (i !== j) a += workerEuclidean(data[i], data[j]);
      a /= same.length - 1;
    }
    let b = Infinity;
    for (let oc = 0; oc < nClusters; oc++) {
      if (oc === ci) continue;
      const op = clusters[oc];
      if (op.length === 0) continue;
      let d = 0;
      for (const j of op) d += workerEuclidean(data[i], data[j]);
      b = Math.min(b, d / op.length);
    }
    scores[i] = b === Infinity ? 0 : (b - a) / Math.max(a, b);
  }
  return scores;
}
async function initializeWasm(wasmPath, requestId) {
  if (wasmInitialized) {
    postMessage({ type: "ready", requestId });
    return;
  }
  try {
    const wasmImport = await import("@/public/workers/Clustering/K-Medoids/wasm");
    const initCandidates = [
      wasmPath,
      "/workers/Clustering/K-Medoids/wasm_bg.wasm",
      void 0
    ];
    let initialized = false;
    let lastInitError = null;
    for (const candidate of initCandidates) {
      if (initialized) break;
      try {
        await wasmImport.default(candidate);
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
      throw lastInitError || new Error("Unable to initialize WASM module");
    }
    wasmModule = wasmImport;
    wasmInitialized = true;
    if (typeof wasmModule.initThreadPool === "function") {
      try {
        const numThreads = navigator.hardwareConcurrency || 4;
        await wasmModule.initThreadPool(numThreads);
        console.log(`[Worker] Rayon thread pool initialized: ${numThreads} threads`);
      } catch (e) {
        console.warn("[Worker] Thread pool init skipped (single-threaded build or no SAB):", e);
      }
    }
    const testResult = wasmModule.test_connection();
    console.log("[Worker] WASM initialized:", testResult);
    postMessage({ type: "ready", requestId });
  } catch (error) {
    console.error("[Worker] Failed to initialize WASM:", error);
    postMessage({
      type: "error",
      error: `WASM initialization failed: ${error}`,
      requestId
    });
    throw error;
  }
}
function sendProgress(stage, progress, message) {
  postMessage({
    type: "progress",
    data: { stage, progress, message }
  });
}
function flattenMatrix(data) {
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
async function runClustering(input, requestId) {
  if (!wasmInitialized || !wasmModule) {
    postMessage({
      type: "error",
      error: "WASM not initialized",
      requestId
    });
    return;
  }
  currentOperation = new AbortController();
  try {
    sendProgress("preparing", 0, "Preparing data...");
    const resolvedData = input.data && input.data.length > 0 ? input.data : cachedData;
    if (!resolvedData || resolvedData.length === 0) {
      throw new Error("No data provided and no cached data available");
    }
    if (input.n_clusters < 2) {
      throw new Error("Number of clusters must be at least 2");
    }
    if (input.n_clusters > resolvedData.length) {
      throw new Error("Number of clusters cannot exceed number of data points");
    }
    // WASM requires k < n strictly (k == n leaves no non-medoid candidates for CLARANS).
    if (input.n_clusters >= resolvedData.length) {
      throw new Error(
        `Number of clusters (${input.n_clusters}) must be less than the number of data points (${resolvedData.length}). ` +
        `Please reduce the number of clusters or add more data rows.`
      );
    }
    sendProgress("preparing", 20, `Processing ${resolvedData.length} data points...`);
    if (currentOperation.signal.aborted) {
      postMessage({ type: "cancelled", requestId });
      return;
    }
    const isPAM = (input.method || "pam").toLowerCase() === "pam";
    const hasTypedApi = isPAM && typeof wasmModule.run_k_medoids_typed === "function";
    console.log(`[Worker] k-pipeline CHECK: input.n_clusters=${input.n_clusters} (expected = user's k)`);
    console.log("[Worker] Running clustering:", {
      method: input.method,
      n_clusters: input.n_clusters,
      data_points: resolvedData.length,
      dimensions: resolvedData[0]?.length || 0,
      path: hasTypedApi ? "typed-array (fast)" : "serde-JSON (fallback)"
    });
    if (input.n_clusters < 2 || !Number.isInteger(input.n_clusters)) {
      console.error(`[Worker] INVALID k=${input.n_clusters} \u2014 must be an integer \u2265 2. Possible stale state from prior run.`);
    }
    const startTime = performance.now();
    let result;
    if (hasTypedApi) {
      sendProgress("clustering", 40, `Running PAM (typed-array path)\u2026`);
      const n = resolvedData.length;
      const d = resolvedData[0]?.length ?? 0;
      const flatData = flattenMatrix(resolvedData);
      const maxIter = input.max_iterations || 100;
      const onProgress = (iter, cost) => {
        const pct = 40 + Math.min(49, Math.round(iter / maxIter * 49));
        sendProgress("clustering", pct, `Iteration ${iter} \u2014 cost ${cost.toFixed(4)}`);
      };
      const onInitialMedoids = (medoidsArr) => {
        const initial_medoids = Array.from(medoidsArr);
        postMessage({
          type: "partial_result",
          data: { initial_medoids },
          requestId
        });
        sendProgress(
          "clustering",
          41,
          `Initial medoids ready: [${initial_medoids.join(", ")}] \u2014 running SWAP phase\u2026`
        );
      };
      result = wasmModule.run_k_medoids_typed(
        flatData,
        n,
        d,
        input.n_clusters,
        "pam",
        maxIter,
        input.distance_metric || "euclidean",
        BigInt(input.random_seed != null ? Math.trunc(input.random_seed) : -1),
        input.convergence_tolerance || 0,
        input.n_init || 1,
        onProgress,
        onInitialMedoids
      );
      if (result.cluster_assignments instanceof Uint32Array) {
        result.cluster_assignments = Array.from(result.cluster_assignments);
      }
      if (result.medoids_indices instanceof Uint32Array) {
        result.medoids_indices = Array.from(result.medoids_indices);
      }
      if (result.silhouette_scores instanceof Float64Array) {
        result.silhouette_scores = Array.from(result.silhouette_scores);
      }
      if (result.distances_to_medoids instanceof Float64Array) {
        result.distances_to_medoids = Array.from(result.distances_to_medoids);
      }
      if (result.cost_history instanceof Float64Array) {
        result.cost_history = Array.from(result.cost_history);
      }
      if (Array.isArray(result.medoid_history)) {
        result.medoid_history = result.medoid_history.map(
          (arr) => arr instanceof Uint32Array ? Array.from(arr) : Array.isArray(arr) ? arr : []
        );
      }
    } else {
      const wasmInput = {
        data: resolvedData,
        n_clusters: input.n_clusters,
        method: input.method,
        max_iterations: input.max_iterations,
        distance_metric: input.distance_metric,
        random_seed: input.random_seed,
        // n_init is ignored for PAM (BUILD phase is deterministic) but kept
        // for CLARA/CLARANS; use 1 as default to match the typed-array path.
        n_init: input.n_init ?? 1,
        convergence_tolerance: input.convergence_tolerance || 0,
        clara_num_samples: input.clara_num_samples ?? 5,
        ...input.clara_sample_size != null ? { clara_sample_size: input.clara_sample_size } : {}
      };
      sendProgress("clustering", 40, `Running ${input.method} algorithm\u2026`);
      result = wasmModule.run_k_medoids(wasmInput);
    }
    const duration = ((performance.now() - startTime) / 1e3).toFixed(2);
    console.log("[Worker] Clustering completed in", duration, "seconds");
    sendProgress("finalizing", 90, "Finalizing results...");
    if (currentOperation.signal.aborted) {
      postMessage({ type: "cancelled", requestId });
      return;
    }
    const labels = result.cluster_assignments || result.labels || [];
    const rawMedoids = result.medoids_indices || result.medoid_indices || result.medoids || [];
    let medoids;
    if (rawMedoids.length !== input.n_clusters) {
      console.error(
        `[Worker] \u26A0\uFE0F k-mismatch detected: expected ${input.n_clusters} medoids from WASM, got ${rawMedoids.length}. This usually means the WASM binary is stale. Rebuild with: wasm-pack build --target web. Attempting label-based medoid recovery to keep indices valid.`
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
    let silhouetteScore;
    let silhouettePerObject = [];
    sendProgress("silhouette", 92, "Computing silhouette scores...");
    const wasmEmbeddedScores = result.silhouette_scores || [];
    if (wasmEmbeddedScores.length === resolvedData.length) {
      silhouettePerObject = wasmEmbeddedScores;
    } else if (typeof wasmModule.run_silhouette === "function") {
      try {
        const silResult = wasmModule.run_silhouette({
          data: resolvedData,
          labels,
          n_clusters: input.n_clusters,
          distance_metric: input.distance_metric
        });
        silhouetteScore = typeof silResult?.overall === "number" ? silResult.overall : 0;
        silhouettePerObject = Array.isArray(silResult?.per_object) ? silResult.per_object : [];
      } catch {
        silhouettePerObject = [];
      }
    }
    if (silhouettePerObject.length !== resolvedData.length) {
      silhouettePerObject = computeSilhouettePerObject(resolvedData, labels, input.n_clusters);
    }
    silhouetteScore = silhouettePerObject.length > 0 ? silhouettePerObject.reduce((s, v) => s + v, 0) / silhouettePerObject.length : 0;
    const wcssScore = computeWCSS(resolvedData, labels, medoids);
    const rawDist = result.distances_to_medoids;
    const distances_to_medoids = rawDist instanceof Float64Array ? Array.from(rawDist) : Array.isArray(rawDist) && rawDist.length > 0 ? rawDist : void 0;
    const totalCost = result.total_distance || result.total_cost || result.cost || 0;
    const avgCost = typeof result.avg_cost === "number" ? result.avg_cost : typeof result.avgCost === "number" ? result.avgCost : labels.length > 0 ? totalCost / labels.length : 0;
    const mappedResult = {
      labels,
      medoids,
      cost: totalCost,
      avgCost,
      total_cost_build: result.total_cost_build ?? (Array.isArray(result.cost_history) && result.cost_history.length > 0 ? result.cost_history[0] : void 0),
      total_cost_swap: result.total_cost_swap ?? (Array.isArray(result.cost_history) && result.cost_history.length > 0 ? result.cost_history[result.cost_history.length - 1] : void 0),
      iterations: result.iterations || 0,
      converged: result.converged || false,
      cost_history: result.cost_history || [],
      medoid_history: result.medoid_history || [],
      // Use WASM per-object scores (fast) so generateComprehensiveKMedoidsOutput
      // skips the O(n²) JavaScript fallback in calculateSilhouetteScoresAsync
      silhouette_scores: silhouettePerObject.length > 0 ? silhouettePerObject : result.silhouette_scores || [],
      distances_to_medoids,
      silhouetteScore,
      wcssScore
    };
    console.log("[Worker] Mapped result:", {
      labelsCount: mappedResult.labels.length,
      medoidsCount: mappedResult.medoids.length,
      cost: mappedResult.cost,
      silhouetteScore,
      wcssScore,
      sampleLabels: mappedResult.labels.slice(0, 5),
      medoids: mappedResult.medoids
    });
    sendProgress("complete", 100, "Analysis complete!");
    postMessage({
      type: "success",
      result: mappedResult,
      requestId
    });
  } catch (error) {
    console.error("[Worker] Clustering error:", error);
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
      requestId
    });
  } finally {
    currentOperation = null;
  }
}
function cancelOperation() {
  if (currentOperation) {
    currentOperation.abort();
    console.log("[Worker] Operation cancelled");
  }
}
async function runClusteringRange(input, requestId) {
  if (!wasmInitialized || !wasmModule) {
    postMessage({ type: "error", error: "WASM not initialized", requestId });
    return;
  }
  if (!wasmModule.run_k_medoids_range) {
    postMessage({ type: "error", error: "run_k_medoids_range not available in this WASM build", requestId });
    return;
  }
  try {
    const resolvedData = input.data && input.data.length > 0 ? input.data : cachedData;
    if (!resolvedData || resolvedData.length === 0) {
      throw new Error("No data provided and no cached data available");
    }
    const RANGE_SAMPLE = MAX_SILHOUETTE_SAMPLE;
    let rangeData = resolvedData;
    if (resolvedData.length > RANGE_SAMPLE) {
      const step = Math.floor(resolvedData.length / RANGE_SAMPLE);
      rangeData = [];
      for (let i = 0; i < resolvedData.length && rangeData.length < RANGE_SAMPLE; i += step) {
        rangeData.push(resolvedData[i]);
      }
      console.log(`[Worker] Range scan: subsampled ${resolvedData.length} \u2192 ${rangeData.length} points`);
    }
    sendProgress("preparing", 5, `Building distance matrix for n=${rangeData.length}...`);
    const wasmInput = {
      data: rangeData,
      k_min: input.k_min,
      k_max: input.k_max,
      method: input.method,
      max_iterations: input.max_iterations,
      distance_metric: input.distance_metric,
      random_seed: input.random_seed ?? null,
      convergence_tolerance: input.convergence_tolerance ?? 0
    };
    console.log("[Worker] Running k-range clustering:", {
      k_min: wasmInput.k_min,
      k_max: wasmInput.k_max,
      n: rangeData.length,
      method: wasmInput.method
    });
    sendProgress("clustering", 20, `Testing k=${input.k_min}..${input.k_max} (single WASM call)...`);
    const startTime = performance.now();
    const rawResults = wasmModule.run_k_medoids_range(wasmInput);
    const elapsed = ((performance.now() - startTime) / 1e3).toFixed(2);
    console.log(`[Worker] Range clustering done in ${elapsed}s, ${rawResults.length} results`);
    sendProgress("scoring", 80, "Computing silhouette scores...");
    const items = rawResults.map((item) => {
      const labels = item.cluster_assignments || [];
      const medoids = item.medoids_indices || [];
      const k = item.k;
      const silhouetteScore = typeof item.silhouette_overall === "number" ? item.silhouette_overall : computeSilhouette(rangeData, labels, k);
      return {
        k,
        labels,
        medoids,
        cost: item.total_distance || 0,
        iterations: item.iterations || 0,
        converged: item.converged || false,
        cost_history: item.cost_history || [],
        silhouetteScore,
        wcssScore: computeWCSS(rangeData, labels, medoids)
      };
    });
    sendProgress("complete", 100, "Range analysis complete!");
    postMessage({ type: "range_success", results: items, requestId });
  } catch (error) {
    console.error("[Worker] Range clustering error:", error);
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
      requestId
    });
  }
}
self.onmessage = async (event) => {
  const message = event.data;
  const requestId = message.id;
  try {
    switch (message.type) {
      case "init":
        await initializeWasm(message.wasmPath, requestId);
        break;
      case "setData":
        cachedData = message.data;
        console.log(`[Worker] Data cached: ${cachedData.length} rows`);
        postMessage({ type: "dataStored", requestId });
        break;
      case "cluster":
        await runClustering(message.input, requestId);
        break;
      case "cluster_range":
        await runClusteringRange(message.input, requestId);
        break;
      case "cancel":
        cancelOperation();
        postMessage({ type: "cancelled", requestId });
        break;
      case "ping":
        postMessage({ type: "pong", requestId });
        break;
      default:
        console.warn("[Worker] Unknown message type:", message);
    }
  } catch (error) {
    console.error("[Worker] Message handling error:", error);
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
      requestId
    });
  }
};
self.onerror = (error) => {
  console.error("[Worker] Global error:", error);
  let errorMessage = "Unknown worker error";
  if (typeof error === "string") {
    errorMessage = error;
  } else if ("message" in error && typeof error.message === "string") {
    errorMessage = error.message;
  }
  postMessage({
    type: "error",
    error: errorMessage
  });
};
console.log("[Worker] K-Medoids Clustering Worker started");
initializeWasm().catch((error) => {
  console.error("[Worker] Auto-init failed:", error);
});
