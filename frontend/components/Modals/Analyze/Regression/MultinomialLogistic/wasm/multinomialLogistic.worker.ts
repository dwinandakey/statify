import init, { calculate_multinomial_logistic } from "./pkg/statify_multinomial.js";

// Store WASM instance
let wasmInitialized = false;

// Load WASM module
async function ensureWasmReady() {
    if (wasmInitialized) return;

    try {
        console.log("[Multinomial Worker] Loading WASM module...");

        // Get the base URL for the worker
        const baseUrl = new URL('.', self.location.href).href;
        const wasmPath = new URL("./pkg/statify_multinomial_bg.wasm", baseUrl).href;

        console.log("[Multinomial Worker] WASM Path:", wasmPath);

        // Initialize WASM
        await init({ module_or_path: wasmPath });
        wasmInitialized = true;

        console.log("[Multinomial Worker] WASM loaded successfully");
    } catch (error) {
        console.error("[Multinomial Worker] Failed to load WASM:", error);
        throw new Error(`WASM loading failed: ${error}`);
    }
}

self.onmessage = async (event: MessageEvent) => {
    try {
        console.log("[Multinomial Worker] Message received");

        // Load WASM if not already loaded
        await ensureWasmReady();

        const { data, options } = event.data || {};
        console.log("[Multinomial Worker] Received data:", {
            dependentLength: data?.dependent?.length,
            independentCount: data?.independent?.length,
            options
        });

        const result = calculate_multinomial_logistic(data, options);
        console.log("[Multinomial Worker] Analysis complete:", result);

        self.postMessage({ type: "SUCCESS", payload: result });
    } catch (error: any) {
        console.error("[Multinomial Worker] Error:", error);
        const message = error?.message || String(error);
        self.postMessage({ type: "ERROR", error: message });
    }
};
