// Load WASM fresh every time (no caching — always load latest build)
async function loadWasm() {
    try {
        // WASM pkg lives right next to the worker at ./pkg/
        const baseUrl = new URL('./', self.location.href).href;
        const wasmUrl = baseUrl + 'pkg/wasm_bg.wasm';
        const jsUrl = baseUrl + 'pkg/wasm.js';

        // Import wasm.js — it has DiscriminantAnalysis class and __wbg_init()
        const wasmModule = await import(/* webpackIgnore: true */ jsUrl);

        // Initialize WASM: fetch wasm, instantiate, wire up helpers
        await wasmModule.default({ module_or_path: wasmUrl });

        return wasmModule;
    } catch (error) {
        console.error("[Discriminant Worker] Failed to load WASM:", error);
        throw new Error(`WASM loading failed: ${error}`);
    }
}

self.onmessage = async (event) => {
    // Timing for lib/analysisTiming: durations are measured on this worker's own
    // clock and only the numbers are posted back, because the main thread's
    // performance.now() has a different time origin.
    const workerStart = performance.now();
    try {
        const wasm = await loadWasm();
        const wasmReady = performance.now();

        const { group_data, independent_data, selection_data, strata_data, group_data_defs, independent_data_defs, selection_data_defs, config_data } = event.data || {};

        // Create discriminant analysis instance (runs the whole analysis)
        const discriminant = new wasm.DiscriminantAnalysis(
            group_data,
            independent_data,
            selection_data,
            group_data_defs,
            independent_data_defs,
            selection_data_defs,
            config_data,
            strata_data
        );

        // Get results
        const formattedResults = discriminant.get_formatted_results();
        const log = discriminant.get_all_log();
        const errors = discriminant.get_all_errors();
        const computeDone = performance.now();

        // Clean up WASM instance
        discriminant.free();

        self.postMessage({
            type: "SUCCESS",
            payload: {
                formattedResults,
                log,
                errors
            },
            timing: {
                wasmInitMs: wasmReady - workerStart,
                computeMs: computeDone - wasmReady,
                workerTotalMs: performance.now() - workerStart
            }
        });
    } catch (error) {
        console.error("[Discriminant Worker] Error:", error);
        const message = error?.message || String(error);
        self.postMessage({ type: "ERROR", error: message });
    }
};
