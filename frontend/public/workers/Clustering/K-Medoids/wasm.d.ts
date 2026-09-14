/* tslint:disable */
/* eslint-disable */

export class KMedoidsCluster {
    free(): void;
    [Symbol.dispose](): void;
    constructor();
}

/**
 * Initialize panic hook for better error messages in WASM
 */
export function init_panic_hook(): void;

export function run_k_medoids(input_value: any): any;

/**
 * Run PAM for a range of k values in a single call.
 * Builds the O(n²) distance matrix **once** and reuses it for all k values,
 * eliminating the biggest bottleneck in automatic-k selection.
 */
export function run_k_medoids_range(input_value: any): any;

/**
 * Fast PAM entry-point that avoids `serde_wasm_bindgen` for bulk arrays.
 *
 * Parameters
 * ----------
 * flat_data            — row-major Float64Array of shape (n_rows × n_cols)
 * n_rows, n_cols       — shape of the data matrix
 * n_clusters           — k
 * method               — "pam" (only PAM is supported here; use run_k_medoids for CLARA/CLARANS)
 * max_iterations       — max SWAP iterations
 * distance_metric      — "euclidean" | "manhattan"
 * random_seed          — i64; use -1 for no seed
 * convergence_tolerance — stop when Δcost < this value (0 → exact convergence)
 * n_init               — ignored for PAM (BUILD is deterministic); kept for API parity
 * on_progress          — optional JS callback(iteration: number, cost: number)
 *                        fired after every SWAP step so the UI can show live progress
 * on_initial_medoids   — optional JS callback(medoids: Uint32Array)
 *                        fired once immediately after the BUILD phase completes,
 *                        before any SWAP iteration starts.  Enables streaming the
 *                        initial cluster centres to the UI while SWAP is still running.
 *
 * Returns a plain JS object with **typed-array** fields so the worker can
 * pass them as Transferable objects in postMessage() (zero-copy):
 *   { cluster_assignments: Uint32Array,
 *     silhouette_scores:   Float64Array,
 *     distances_to_medoids: Float64Array,
 *     cost_history:        Float64Array,
 *     medoids_indices:     Uint32Array,
 *     total_distance:      number,
 *     iterations:          number,
 *     converged:           boolean }
 */
export function run_k_medoids_typed(flat_data: Float64Array, n_rows: number, n_cols: number, n_clusters: number, method: string, max_iterations: number, distance_metric: string, random_seed: bigint, convergence_tolerance: number, n_init: number, on_progress?: Function | null, on_initial_medoids?: Function | null): any;

export function test_connection(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_kmedoidscluster_free: (a: number, b: number) => void;
    readonly kmedoidscluster_new: () => number;
    readonly run_k_medoids: (a: any) => [number, number, number];
    readonly run_k_medoids_range: (a: any) => [number, number, number];
    readonly run_k_medoids_typed: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: bigint, l: number, m: number, n: number, o: number) => [number, number, number];
    readonly test_connection: () => [number, number];
    readonly init_panic_hook: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
