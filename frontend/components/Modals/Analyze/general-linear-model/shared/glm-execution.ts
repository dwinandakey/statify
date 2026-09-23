/**
 * Execution mode and Web Worker lifecycle shared by the GLM Multivariate and
 * Repeated Measures services (compare_web_workers.md §3.4).
 *
 * - The requested mode is read from localStorage["glm-execution-mode"] for
 *   every analysis: "main" runs the original main-thread path, anything else
 *   (including a storage failure) runs the WASM computation in a Web Worker.
 * - The mode actually used is "worker", "main", or "main-fallback" (the
 *   worker could not be created). Services report it in the
 *   `glm-analysis-end` performance mark so experiment runs can be verified.
 */

export type GlmModule = "multivariate" | "repeated-measures";
export type GlmRequestedMode = "worker" | "main";
export type GlmExecutionMode = "worker" | "main" | "main-fallback";

export const GLM_EXECUTION_MODE_KEY = "glm-execution-mode";

/**
 * Deliberately generous: main-thread mode has no time limit, so the worker
 * must not abort an analysis that main-thread mode would have finished.
 */
export const GLM_WORKER_TIMEOUT_MS = 10 * 60 * 1000;

export type GlmWorkerRequest<P> = { id: number; payload: P };

export type GlmWorkerResponse<R> =
    | { id: number; ok: true; results: R; errors: string }
    | { id: number; ok: false; error: string };

export type GlmComputation<R> = { results: R; errors: string };

export function readRequestedGlmMode(): GlmRequestedMode {
    try {
        return window.localStorage.getItem(GLM_EXECUTION_MODE_KEY) === "main"
            ? "main"
            : "worker";
    } catch {
        return "worker";
    }
}

/** The Worker itself could not be constructed; callers fall back to the main thread. */
export class GlmWorkerUnavailableError extends Error {
    constructor(cause: unknown) {
        super(`Web Worker could not be created: ${String(cause)}`);
        this.name = "GlmWorkerUnavailableError";
    }
}

/**
 * An analysis error reported by the worker. The worker sends `String(thrown)`
 * and `toString()` returns it unchanged, so the error toast shows the same
 * text as the main-thread path, which renders `String(err)`.
 */
export class GlmWorkerTaskError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GlmWorkerTaskError";
    }

    toString(): string {
        return this.message;
    }
}

type PendingRequest<R> = {
    resolve: (value: GlmComputation<R>) => void;
    reject: (reason: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
};

/**
 * Owns one reusable worker per module: created on the first analysis, so WASM
 * is initialised once per worker. On any failure (worker error, timeout, or a
 * failed analysis) the worker is terminated and the next analysis creates a
 * new one.
 */
export class GlmWorkerClient<P, R> {
    private worker: Worker | null = null;
    private nextId = 0;
    private readonly pending = new Map<number, PendingRequest<R>>();

    constructor(
        private readonly module: GlmModule,
        private readonly createWorker: () => Worker
    ) {}

    /** Throws GlmWorkerUnavailableError synchronously when no worker can be created. */
    run(payload: P, timeoutMs = GLM_WORKER_TIMEOUT_MS): Promise<GlmComputation<R>> {
        const worker = this.getOrCreateWorker();
        const id = ++this.nextId;

        return new Promise<GlmComputation<R>>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.reset(
                    new Error(`GLM ${this.module} worker timed out after ${timeoutMs} ms`)
                );
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });

            try {
                const request: GlmWorkerRequest<P> = { id, payload };
                worker.postMessage(request);
            } catch (err) {
                this.reset(err);
            }
        });
    }

    private getOrCreateWorker(): Worker {
        if (this.worker) return this.worker;

        let worker: Worker;
        try {
            if (typeof Worker === "undefined") {
                throw new Error("Worker is not defined in this environment");
            }
            worker = this.createWorker();
        } catch (err) {
            throw new GlmWorkerUnavailableError(err);
        }

        worker.onmessage = (event: MessageEvent<GlmWorkerResponse<R>>) =>
            this.handleResponse(event.data);
        worker.onerror = (event: ErrorEvent) =>
            this.reset(
                new Error(
                    `GLM ${this.module} worker error: ${event.message || "unknown error"}`
                )
            );
        worker.onmessageerror = () =>
            this.reset(
                new Error(`GLM ${this.module} worker reply could not be deserialized`)
            );

        this.worker = worker;
        return worker;
    }

    private handleResponse(response: GlmWorkerResponse<R>): void {
        const request = this.pending.get(response.id);
        if (!request) return;

        clearTimeout(request.timer);
        this.pending.delete(response.id);

        if (response.ok) {
            request.resolve({ results: response.results, errors: response.errors });
            return;
        }

        request.reject(new GlmWorkerTaskError(response.error));
        // A failed analysis may leave the WASM instance in an undefined state
        // (e.g. after a Rust panic), so the next analysis gets a fresh worker.
        this.reset(new Error(`GLM ${this.module} worker was reset after a failed analysis`));
    }

    private reset(reason: unknown): void {
        this.worker?.terminate();
        this.worker = null;
        for (const request of this.pending.values()) {
            clearTimeout(request.timer);
            request.reject(reason);
        }
        this.pending.clear();
    }
}

/**
 * Runs the WASM computation in the requested mode and reports the mode that
 * was actually used. Only a worker that cannot be created falls back to the
 * main thread; any other worker failure is surfaced as an analysis error.
 */
export async function executeGlmComputation<P, R>({
    module,
    client,
    payload,
    runOnMainThread,
}: {
    module: GlmModule;
    client: GlmWorkerClient<P, R>;
    payload: P;
    runOnMainThread: (payload: P) => Promise<GlmComputation<R>>;
}): Promise<GlmComputation<R> & { mode: GlmExecutionMode }> {
    if (readRequestedGlmMode() === "main") {
        return { ...(await runOnMainThread(payload)), mode: "main" };
    }

    try {
        return { ...(await client.run(payload)), mode: "worker" };
    } catch (err) {
        if (!(err instanceof GlmWorkerUnavailableError)) throw err;
        console.warn(
            `[GLM ${module}] ${err.message}. Running on the main thread (mode "main-fallback").`
        );
        return { ...(await runOnMainThread(payload)), mode: "main-fallback" };
    }
}

// Performance marks read by the Playwright experiment (compare_web_workers.md §4).
// They are diagnostics only, so a failing mark never fails the analysis.

export function markGlmAnalysisStart(): void {
    try {
        performance.mark("glm-analysis-start");
    } catch {
        // ignore
    }
}

export function markGlmAnalysisEnd(module: GlmModule, mode: GlmExecutionMode): void {
    try {
        performance.mark("glm-analysis-end", { detail: { module, mode } });
    } catch {
        // ignore
    }
}
