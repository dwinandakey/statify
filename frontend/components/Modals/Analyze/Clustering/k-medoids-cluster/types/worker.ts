export type ClusteringMethod = "PAM" | "CLARA" | "CLARANS";
export type DistanceMetric = "euclidean" | "manhattan";

export interface ClusteringInput {
    data?: number[][];
    n_clusters: number;
    method: ClusteringMethod;
    max_iterations: number;
    distance_metric: DistanceMetric;
    random_seed?: number | null;
    n_init?: number;
    convergence_tolerance?: number;
    use_build_phase?: boolean;
    use_r_implementation?: boolean;
    clara_num_samples?: number;
    clara_sample_size?: number;
    clarans_num_local?: number;
    clarans_max_neighbors?: number;
}
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

export interface ClusteringRangeItem {
    k: number;
    labels: number[];
    medoids: number[];
    cost: number;
    iterations: number;
    converged: boolean;
    cost_history?: number[];
    silhouetteScore?: number;
    wcssScore?: number;
}

export interface ClusteringResult {
    labels: number[];
    medoids: number[];
    cost: number;
    avgCost?: number;
    total_cost_build?: number;
    total_cost_swap?: number;
    iterations: number;
    converged: boolean;
    iteration_history?: { iteration: number; cost: number }[];
    cost_history?: number[];
    medoid_history?: number[][];
    silhouette_scores?: number[];
    distances_to_medoids?: number[];
    silhouetteScore?: number;
    wcssScore?: number;
}

export interface ProgressUpdate {
    stage: string;
    progress: number;
    message: string;
}

export type WorkerRequestMessage = 
    | { type: "init"; wasmPath?: string; id?: number }
    | { type: "setData"; data: number[][]; id?: number }
    | { type: "cluster"; input: ClusteringInput; id?: number }
    | { type: "cluster_range"; input: ClusteringRangeInput; id?: number }
    | { type: "cancel"; id?: number }
    | { type: "ping"; id?: number };

export type WorkerResponseMessage =
    | { type: "ready"; requestId?: number }
    | { type: "dataStored"; requestId?: number }
    | { type: "progress"; data: ProgressUpdate }
    | { type: "partial_result"; data: { initial_medoids: number[] }; requestId?: number }
    | { type: "success"; result: ClusteringResult; requestId?: number }
    | { type: "range_success"; results: ClusteringRangeItem[]; requestId?: number }
    | { type: "error"; error: string; requestId?: number }
    | { type: "cancelled"; requestId?: number }
    | { type: "pong"; requestId?: number };

export class ClusterWorker {
    private worker: Worker | null = null;
    private messageId = 0;
    private callbacks = new Map<number, {
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
    }>();
    private progressCallback?: (progress: ProgressUpdate) => void;
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

        if (message.type === "partial_result") {
            if (this.onPartialResult) {
                this.onPartialResult(message.data);
            }
            return;
        }

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

    private handleError(event: ErrorEvent | Event) {
        const message =
            "message" in event && typeof event.message === "string" && event.message
                ? event.message
                : "Worker encountered an unknown error";
        const error = new Error(message);
        this.callbacks.forEach((callbacks, id) => {
            callbacks.reject(error);
            this.callbacks.delete(id);
        });
        console.error("Worker error:", event);
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

    async init(wasmPath?: string): Promise<void> {
        await this.sendMessage({
            type: "init",
            wasmPath: wasmPath ?? "/workers/Clustering/K-Medoids/wasm_bg.wasm",
        });
    }

    async setData(data: number[][]): Promise<void> {
        await this.sendMessage({ type: "setData", data });
    }

    async cluster(
        input: ClusteringInput,
        onProgress?: (progress: ProgressUpdate) => void
    ): Promise<ClusteringResult> {
        this.progressCallback = onProgress;
        return this.sendMessage({ type: "cluster", input }) as Promise<ClusteringResult>;
    }

    async clusterRange(
        input: ClusteringRangeInput,
        onProgress?: (progress: ProgressUpdate) => void
    ): Promise<ClusteringRangeItem[]> {
        this.progressCallback = onProgress;
        return this.sendMessage({ type: "cluster_range", input }) as Promise<ClusteringRangeItem[]>;
    }

    cancel(): void {
        if (this.worker) {
            this.worker.postMessage({ type: "cancel" });
        }
    }

    async ping(): Promise<void> {
        await this.sendMessage({ type: "ping" });
    }

    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.callbacks.clear();
    }
}
