/**
 * Factor Analysis Web Worker
 *
 * Menjalankan komputasi analisis faktor (WASM) di thread terpisah
 * agar tidak memblokir main thread UI saat memproses data besar.
 *
 * Supported actions:
 *   - "warmup_factor_analysis": Memuat dan inisialisasi WASM lebih awal
 *   - "run_factor_analysis": Menjalankan full factor analysis via WASM
 *
 * Message format:
 *   {
 *     action: "run_factor_analysis",
 *     requestId: string,
 *     slicedDataForTarget: any[],
 *     slicedDataForValue: any[],
 *     varDefsForTarget: any[][],
 *     varDefsForValue: any[][],
 *     configData: object,
 *   }
 * 
 * Response format (semua membawa requestId):
 *   SUCCESS: { type: "SUCCESS", payload: { ... }, action, requestId }
 *   ERROR:   { type: "ERROR", payload: string, action, requestId }
 *   PROGRESS:{ type: "PROGRESS", payload: { stage, message, percent }, action, requestId }
 */
let initWasm = null;
let FactorAnalysisClass = null;
let wasmInitPromise = null;
let wasmReady = false;

function stringifyWorkerError(error) {
  if (!error) return "Unknown worker error.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function postMessageSafe(type, action, requestId, payload) {
  self.postMessage({
    type,
    action,
    requestId,
    payload,
  });
}

async function ensureWasmReady(action, requestId) {
  if (wasmReady) return;

  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const workerVersion = new URL(import.meta.url).searchParams.get("v");
      const wasmJsUrl = new URL("./pkg/wasm.js", import.meta.url);
      const wasmBgUrl = new URL("./pkg/wasm_bg.wasm", import.meta.url);

      if (workerVersion) {
        wasmJsUrl.searchParams.set("v", workerVersion);
        wasmBgUrl.searchParams.set("v", workerVersion);
      }

      const wasmModule = await import(wasmJsUrl.href);
      initWasm = wasmModule.default;
      FactorAnalysisClass = wasmModule.FactorAnalysis;

      if (typeof initWasm !== "function" || !FactorAnalysisClass) {
        throw new Error(
          "Invalid WASM module exports. Expected default init and FactorAnalysis class."
        );
      }

      await initWasm(wasmBgUrl);
      wasmReady = true;
    })().catch((error) => {
      wasmInitPromise = null;
      wasmReady = false;
      initWasm = null;
      FactorAnalysisClass = null;
      throw error;
    });
  }

  postMessageSafe("PROGRESS", action, requestId, {
    stage: "init",
    message: "Initializing WASM module...",
    percent: 10,
  });

  await wasmInitPromise;
}

self.onmessage = async (event) => {
  const {
    action,
    requestId,
    slicedDataForTarget,
    slicedDataForValue,
    varDefsForTarget,
    varDefsForValue,
    configData,
  } = event.data || {};

  if (!action) {
    postMessageSafe(
      "ERROR",
      "unknown",
      requestId,
      "Missing action in worker message."
    );
    return;
  }

  try {
    if (action === "warmup_factor_analysis") {
      await ensureWasmReady(action, requestId);
      postMessageSafe("SUCCESS", action, requestId, { warmedUp: true });
      return;
    }

    if (action !== "run_factor_analysis") {
      postMessageSafe("ERROR", action, requestId, `Unknown action: ${action}`);
      return;
    }

    if (!slicedDataForTarget || slicedDataForTarget.length === 0) {
      throw new Error("No target data provided to worker.");
    }

    if (!configData) {
      throw new Error("No configuration data provided to worker.");
    }

    await ensureWasmReady(action, requestId);

    postMessageSafe("PROGRESS", action, requestId, {
      stage: "computing",
      message: "Running Factor Analysis computation...",
      percent: 45,
    });

    let factor = null;

    try {
      factor = new FactorAnalysisClass(
        slicedDataForTarget,
        slicedDataForValue,
        varDefsForTarget,
        varDefsForValue,
        configData
      );

      postMessageSafe("PROGRESS", action, requestId, {
        stage: "formatting",
        message: "Retrieving formatted results...",
        percent: 80,
      });

      const results = factor.get_formatted_results();
      const errors = factor.get_all_errors();

      postMessageSafe("PROGRESS", action, requestId, {
        stage: "done",
        message: "Factor Analysis completed.",
        percent: 100,
      });

      postMessageSafe("SUCCESS", action, requestId, {
        results,
        errors,
      });
    } finally {
      if (factor && typeof factor.free === "function") {
        factor.free();
      }
    }
  } catch (error) {
    postMessageSafe("ERROR", action, requestId, stringifyWorkerError(error));
  }
};
