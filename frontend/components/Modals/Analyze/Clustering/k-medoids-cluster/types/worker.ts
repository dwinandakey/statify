/**
 * Web Worker Types for K-Medoids Clustering
 * Defines message protocol between main thread and worker
 */

export type ClusteringMethod = "PAM" | "CLARA" | "CLARANS";
export type DistanceMetric = "euclidean" | "manhattan";

/**
 * Input data structure for clustering
 */
export interface ClusteringInput {
    /** Full data matrix. May be omitted when data was already cached via setData. */
    data?: number[][];
    n_clusters: number;
    method: ClusteringMethod;
    max_iterations: number;
    distance_metric: DistanceMetric;
    random_seed?: number | null;
    n_init?: number;
    convergence_tolerance?: number;
    /** PAM only: true = BUILD initialization, false = random initialization. */
    use_build_phase?: boolean;
    /** PAM only: true = R-style path, false = native non-R path. */
    use_r_implementation?: boolean;
    /** CLARA: number of sub-samples to draw (default: 5) */
    clara_num_samples?: number;
    /** CLARA: explicit sample size per sub-sample (default: 40 + 2*k) */
    clara_sample_size?: number;
    /** CLARANS: number of local searches to perform (default: 2) */
    clarans_num_local?: number;
    /** CLARANS: maximum number of neighbors to check per search (default: max(250, 1.25% of n*k)) */
    clarans_max_neighbors?: number;
}

/**
 * Input for running PAM across a range of k values in one WASM call.
 * The distance matrix is built once inside WASM and reused for all k.
 */
export interface ClusteringRangeInput {
    data?: number[][];   // omit when data is already cached via setData
    k_min: number;
    k_max: number;
    method: ClusteringMethod;
    max_iterations: number;
    distance_metric: DistanceMetric;
    random_seed?: number | null;
    convergence_tolerance?: number;
}

/** One result from a range clustering call (one entry per k value) */
export interface ClusteringRangeItem {
    k: number;
    labels: number[];
    medoids: number[];
    cost: number;
    iterations: number;
    converged: boolean;
    cost_history?: number[];
    /** Silhouette score computed inside the worker (off main thread) */
    silhouetteScore?: number;
    /** WCSS score for the Elbow method, computed inside the worker */
    wcssScore?: number;
}

/**
 * Result from clustering algorithm
 */
export interface ClusteringResult {
    labels: number[];
    medoids: number[];
    cost: number;
    /** Objective average cost: total cost / n. */
    avgCost?: number;
    /** Total cost after BUILD phase (before any SWAP). */
    total_cost_build?: number;
    /** Total cost after SWAP phase (final). */
    total_cost_swap?: number;
    iterations: number;
    converged: boolean;
    iteration_history?: { iteration: number; cost: number }[];
    /** Raw cost per step from WASM: [0]=BUILD cost, [1..n]=cost after each swap.
     *  Sent by the worker when iteration_history is not separately built. */
    cost_history?: number[];
    /** Medoid indices at each step: [0]=initial (after BUILD), [i]=after swap i.
     *  Parallel to cost_history / iteration_history. */
    medoid_history?: number[][];
    /** Per-object silhouette scores computed by WASM (one entry per data point) */
    silhouette_scores?: number[];
    /** Per-object distances to the assigned medoid, computed by WASM from the
     *  exact same distance matrix used for PAM — matches R's pam()$clusinfo "av.dist".
     *  Avoids re-computing in JS with a potentially different metric or precision. */
    distances_to_medoids?: number[];
    /** Lightweight silhouette score computed inside the worker (off main thread) */
    silhouetteScore?: number;
    /** WCSS score for the Elbow method, computed inside the worker */
    wcssScore?: number;
}

/**
 * Progress update from worker
 */
export interface ProgressUpdate {
    stage: string;
    progress: number;
    message: string;
}

/**
 * Messages sent TO worker
 */
export type WorkerRequestMessage = 
    | { type: "init"; wasmPath?: string; id?: number }
    | { type: "setData"; data: number[][]; id?: number }
    | { type: "cluster"; input: ClusteringInput; id?: number }
    | { type: "cluster_range"; input: ClusteringRangeInput; id?: number }
    | { type: "cancel"; id?: number }
    | { type: "ping"; id?: number };

/**
 * Messages received FROM worker
 */
export type WorkerResponseMessage =
    | { type: "ready"; requestId?: number }
    | { type: "dataStored"; requestId?: number }
    | { type: "progress"; data: ProgressUpdate }
    /** Streaming: initial medoids sent immediately after the BUILD phase, before SWAPs. */
    | { type: "partial_result"; data: { initial_medoids: number[] }; requestId?: number }
    | { type: "success"; result: ClusteringResult; requestId?: number }
    | { type: "range_success"; results: ClusteringRangeItem[]; requestId?: number }
    | { type: "error"; error: string; requestId?: number }
    | { type: "cancelled"; requestId?: number }
    | { type: "pong"; requestId?: number };

/**
 * Worker wrapper class for type-safe communication
 */
export class ClusterWorker {
    private worker: Worker | null = null;
    private messageId = 0;
    private callbacks = new Map<number, {
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
    }>();
    private progressCallback?: (progress: ProgressUpdate) => void;
    /** Called immediately after the PAM BUILD phase with initial medoid indices. */
    onPartialResult?: (data: { initial_medoids: number[] }) => void;

    constructor(workerOrPath: Worker | string) {
        this.worker = workerOrPath instanceof Worker
            ? workerOrPath
            : new Worker(workerOrPath, { type: "module" });
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
    }

    private handleMessage(event: MessageEvent<WorkerResponseMessage>) {
        const message = event.data;

        if (message.type === "progress") {
            if (this.progressCallback) {
                this.progressCallback(message.data);
            }
            return; // Always skip callback resolution for progress messages
        }

        // Stream initial medoids to the caller before the SWAP phase finishes.
        if (message.type === "partial_result") {
            if (this.onPartialResult) {
                this.onPartialResult(message.data);
            }
            return;
        }

        // Look up callback by the requestId echoed from the worker.
        // This prevents stray messages (e.g. the auto-init "ready") from
        // resolving the wrong pending callback.
        const requestId = message.requestId;
        if (requestId === undefined) return; // no ID → unsolicited message, ignore

        const callbacks = this.callbacks.get(requestId);
        if (!callbacks) return;

        switch (message.type) {
            case "ready":
            case "pong":
            case "dataStored":
                callbacks.resolve(message);
                this.callbacks.delete(requestId);
                break;
            case "range_success":
                callbacks.resolve(message.results);
                this.callbacks.delete(requestId);
                break;
            case "success":
                callbacks.resolve(message.result);
                this.callbacks.delete(requestId);
                break;
            case "error":
                callbacks.reject(new Error(message.error));
                this.callbacks.delete(requestId);
                break;
            case "cancelled":
                callbacks.reject(new Error("Operation cancelled"));
                this.callbacks.delete(requestId);
                break;
        }
    }

    private handleError(error: ErrorEvent) {
        // Reject ALL pending callbacks: we cannot tell which request caused
        // the error from an ErrorEvent (no requestId attached), and leaving
        // orphaned callbacks would permanently hang awaited cluster() calls.
        // Previously this used `this.messageId` (the last-sent ID) which
        // rejected the wrong promise when multiple requests were in-flight.
        this.callbacks.forEach((callbacks, id) => {
            callbacks.reject(error);
            this.callbacks.delete(id);
        });
        console.error("Worker error:", error);
    }

    private sendMessage(message: WorkerRequestMessage): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error("Worker not initialized"));
                return;
            }

            this.messageId++;
            const id = this.messageId;
            this.callbacks.set(id, { resolve, reject });
            this.worker.postMessage({ ...message, id });
        });
    }

    /**
     * Initialize WASM module in worker
     */
    async init(wasmPath?: string): Promise<void> {
        await this.sendMessage({
            type: "init",
            wasmPath: wasmPath ?? "/workers/Clustering/K-Medoids/wasm_bg.wasm",
        });
    }

    /**
     * Cache data matrix in the worker to avoid re-serializing on every cluster() call.
     * Call this once before looping over multiple k values.
     */
    async setData(data: number[][]): Promise<void> {
        await this.sendMessage({ type: "setData", data });
    }

    /**
     * Run clustering algorithm
     */
    async cluster(
        input: ClusteringInput,
        onProgress?: (progress: ProgressUpdate) => void
    ): Promise<ClusteringResult> {
        this.progressCallback = onProgress;
        return this.sendMessage({ type: "cluster", input }) as Promise<ClusteringResult>;
    }

    /**
     * Run PAM for a range of k values in a single WASM call.
     * Builds the distance matrix once inside WASM — dramatically faster than
     * calling cluster() in a loop for auto-k selection.
     */
    async clusterRange(
        input: ClusteringRangeInput,
        onProgress?: (progress: ProgressUpdate) => void
    ): Promise<ClusteringRangeItem[]> {
        this.progressCallback = onProgress;
        return this.sendMessage({ type: "cluster_range", input }) as Promise<ClusteringRangeItem[]>;
    }

    /**
     * Cancel ongoing clustering
     */
    cancel(): void {
        if (this.worker) {
            this.worker.postMessage({ type: "cancel" });
        }
    }

    /**
     * Ping worker to check if alive
     */
    async ping(): Promise<void> {
        await this.sendMessage({ type: "ping" });
    }

    /**
     * Terminate worker
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.callbacks.clear();
    }
}
