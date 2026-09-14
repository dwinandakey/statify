// Load WASM fresh every time (no caching — always load latest build)
async function loadWasm() {
    try {
        console.log("[Discriminant Worker] Loading WASM module...");

        // WASM pkg lives right next to the worker at ./pkg/
        const baseUrl = new URL('./', self.location.href).href;
        const wasmUrl = baseUrl + 'pkg/wasm_bg.wasm';
        const jsUrl = baseUrl + 'pkg/wasm.js';

        console.log("[Discriminant Worker] WASM URL:", jsUrl);

        // Import wasm.js — it has DiscriminantAnalysis class and __wbg_init()
        const wasmModule = await import(/* webpackIgnore: true */ jsUrl);

        // Initialize WASM: fetch wasm, instantiate, wire up helpers
        await wasmModule.default({ module_or_path: wasmUrl });

        console.log("[Discriminant Worker] WASM loaded successfully");
        console.log("[Discriminant Worker] DiscriminantAnalysis:", typeof wasmModule.DiscriminantAnalysis);

        // Debug: verify WASM binary is fresh by logging current timestamp
        console.log("[Discriminant Worker] WASM binary timestamp:", new Date().toISOString());

        return wasmModule;
    } catch (error) {
        console.error("[Discriminant Worker] Failed to load WASM:", error);
        throw new Error(`WASM loading failed: ${error}`);
    }
}

self.onmessage = async (event) => {
    try {
        console.log("[Discriminant Worker] Message received");

        const wasm = await loadWasm();

        const { group_data, independent_data, selection_data, group_data_defs, independent_data_defs, selection_data_defs, config_data } = event.data || {};

        console.log("[Discriminant Worker] Received data:", {
            groupDataLength: group_data?.length,
            independentDataLength: independent_data?.length,
            selectionDataLength: selection_data?.length,
        });

        // DEBUG: Log method config being sent to WASM
        console.log("[Discriminant Worker] Method config being sent:", config_data?.method);

        // Create discriminant analysis instance
        const discriminant = new wasm.DiscriminantAnalysis(
            group_data,
            independent_data,
            selection_data,
            group_data_defs,
            independent_data_defs,
            selection_data_defs,
            config_data
        );

        // Get results
        const formattedResults = discriminant.get_formatted_results();
        const log = discriminant.get_all_log();
        const errors = discriminant.get_all_errors();

        // DEBUG: Check if unweighted_n and weighted_n are in the WASM output
        console.log("[Discriminant Worker] === DEBUG GROUP STATS ===");
        if (formattedResults && formattedResults.group_statistics) {
            const gs = formattedResults.group_statistics;
            console.log("[Discriminant Worker] group_statistics keys:", Object.keys(gs));
            console.log("[Discriminant Worker] unweighted_n:", gs.unweighted_n);
            console.log("[Discriminant Worker] weighted_n:", gs.weighted_n);
        } else {
            console.log("[Discriminant Worker] group_statistics is missing or null!");
        }
        console.log("[Discriminant Worker] === END DEBUG ===");

        console.log("[Discriminant Worker] Analysis complete");
        console.log("[Discriminant Worker] Results:", formattedResults);
        console.log("[Discriminant Worker] Log:", log);
        console.log("[Discriminant Worker] Errors:", errors);

        // Clean up WASM instance
        discriminant.free();

        self.postMessage({
            type: "SUCCESS",
            payload: {
                formattedResults,
                log,
                errors
            }
        });
    } catch (error) {
        console.error("[Discriminant Worker] Error:", error);
        const message = error?.message || String(error);
        self.postMessage({ type: "ERROR", error: message });
    }
};