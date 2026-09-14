import init, { calculate_multinomial_logistic } from "./Multinomial/pkg/statify_multinomial.js";

// Store WASM instance
let wasmInitialized = false;

// Load WASM module
async function ensureWasmReady() {
    if (wasmInitialized) return;

    try {
        console.log("[Multinomial Worker] Loading WASM module...");

        // Get the base URL for the worker
        const baseUrl = new URL('.', self.location.href).href;
        const wasmPath = new URL("./Multinomial/pkg/statify_multinomial_bg.wasm", baseUrl).href;

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

self.onmessage = async (event) => {
    try {
        console.log("[Multinomial Worker] Message received");

        // Load WASM if not already loaded
        await ensureWasmReady();

        const { data, options } = event.data || {};

        // DEBUG: Log input data
        console.log("[Multinomial Worker] Input Data Debug:", {
            dependentLength: data?.dependent?.length,
            dependentSample: data?.dependent?.slice(0, 5),
            independentCount: data?.independent?.length,
            weightsLength: data?.weights?.length,
            weightsSample: data?.weights?.slice(0, 10),
            weightsSum: data?.weights?.reduce((a, b) => a + b, 0),
            variableNames: data?.variableNames,
            options
        });
        console.log("[Multinomial Worker] Input Data JSON:", JSON.stringify({
            dependentLength: data?.dependent?.length,
            dependentSample: data?.dependent?.slice(0, 5),
            independentCount: data?.independent?.length,
            weightsLength: data?.weights?.length,
            weightsSample: data?.weights?.slice(0, 10),
            weightsSum: data?.weights?.reduce((a, b) => a + b, 0),
            variableNames: data?.variableNames,
            options
        }));

        const result = calculate_multinomial_logistic(data, options);

        // DEBUG: Log result
        console.log("[Multinomial Worker] Result Debug:", {
            logLikelihood: result?.logLikelihood,
            nullLogLikelihood: result?.nullLogLikelihood,
            chiSquare: result?.chiSquare,
            df: result?.df,
            pValueModel: result?.pValueModel,
            pseudoRSquare: result?.pseudoRSquare,
            coefficientsShape: [result?.coefficients?.length, result?.coefficients?.[0]?.length],
            neg2LL_final: -2 * (result?.logLikelihood ?? NaN),
            neg2LL_null: -2 * (result?.nullLogLikelihood ?? NaN)
        });
        console.log("[Multinomial Worker] Result JSON:", JSON.stringify({
            logLikelihood: result?.logLikelihood,
            nullLogLikelihood: result?.nullLogLikelihood,
            chiSquare: result?.chiSquare,
            df: result?.df,
            pValueModel: result?.pValueModel,
            neg2LL_final: -2 * (result?.logLikelihood ?? NaN),
            neg2LL_null: -2 * (result?.nullLogLikelihood ?? NaN)
        }));

        console.log("[Multinomial Worker] Analysis complete:", result);

        self.postMessage({ type: "SUCCESS", payload: result });
    } catch (error) {
        console.error("[Multinomial Worker] Error:", error);
        const message = error?.message || String(error);
        self.postMessage({ type: "ERROR", error: message });
    }
};