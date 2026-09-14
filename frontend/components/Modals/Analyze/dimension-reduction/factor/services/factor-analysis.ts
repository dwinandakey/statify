// Ini file Service Layer utama yang bertugas sebagai orkestrator atau jembatan antara Frontend Next.js dan logika Rust WASM
// Komputasi berat dijalankan di Web Worker agar tidak memblokir main thread UI.

import {getSlicedData, getVarDefs} from "@/hooks/useVariable"; // getSlicedData: Mengambil hanya data variabel yang dipilih oleh pengguna dari dataset besar di UI.
import {FactorAnalysisType} from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor-worker";
import {transformFactorAnalysisResult} from "./factor-analysis-formatter";
import {resultFactorAnalysis} from "./factor-analysis-output";

type FactorWorkerAction = "warmup_factor_analysis" | "run_factor_analysis";

type PendingWorkerRequest = {
    action: FactorWorkerAction;
    resolve: (payload: any) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
};

let factorWorker: Worker | null = null;
let requestCounter = 0;
let warmupPromise: Promise<void> | null = null;
const pendingRequests = new Map<string, PendingWorkerRequest>();
const workerCacheBuster = Date.now().toString();

// Fungsi memastikan kolom seperti columnIndex, width, dan decimals benar-benar bertipe Number. 
// Tanpa ini, jika JavaScript mengirimkan angka dalam bentuk string, Rust akan mengalami error karena Rust sangat ketat terhadap tipe data (strongly typed).

function sanitizeVarDefs(varDefs: any[][]): any[][] {
    return varDefs.map((varDefGroup) =>
        varDefGroup.map((varDef: any) => ({
            ...varDef,
            columnIndex: Number(varDef.columnIndex ?? 0),
            width: Number(varDef.width ?? 0),
            decimals: Number(varDef.decimals ?? 0),
            columns: Number(varDef.columns ?? 0),
            id: varDef.id ? Number(varDef.id) : undefined,
            // Ensure enum-like fields are strings in the correct format
            type: String(varDef.type ?? "STRING"),
            align: String(varDef.align ?? "left").toLowerCase(),
            measure: String(varDef.measure ?? "unknown").toLowerCase(),
            role: String(varDef.role ?? "none").toLowerCase(),
        }))
    );
}

// Helper function to create synthetic variable definitions when metadata is missing
// This parses variable names like "VAR1", "VAR2", etc. to extract the column index
function createSyntheticVariables(varNames: string[]): { name: string; columnIndex: number; type: string; width: number; decimals: number; label: string; values: any[]; missing: any; columns: number; align: string; measure: string; role: string }[] {
    return varNames.map((name) => {
        // Try to extract column index from variable name (e.g., "VAR1" -> 0, "VAR2" -> 1)
        const match = name.match(/^VAR(\d+)$/i);
        // columnIndex is 0-based, so VAR1 -> 0, VAR2 -> 1, etc.
        const columnIndex = match ? parseInt(match[1], 10) - 1 : 0;
        
        return {
            name,
            columnIndex,
            type: "NUMERIC",
            width: 8,
            decimals: 2,
            label: "",
            values: [],
            missing: null,
            columns: 64,
            align: "right",
            measure: "unknown",
            role: "input",
        };
    });
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message || fallback;
    if (typeof (error as any).message === "string") return (error as any).message;
    try {
        return JSON.stringify(error);
    } catch {
        return fallback;
    }
}

function buildRequestId(action: FactorWorkerAction): string {
    requestCounter += 1;
    return `${action}-${Date.now()}-${requestCounter}`;
}

function clearPendingRequest(requestId: string): PendingWorkerRequest | undefined {
    const pendingRequest = pendingRequests.get(requestId);
    if (!pendingRequest) return undefined;

    clearTimeout(pendingRequest.timeoutId);
    pendingRequests.delete(requestId);
    return pendingRequest;
}

function rejectAllPendingRequests(message: string) {
    pendingRequests.forEach((pendingRequest) => {
        clearTimeout(pendingRequest.timeoutId);
        pendingRequest.reject(new Error(message));
    });
    pendingRequests.clear();
}

function terminateFactorWorker() {
    if (!factorWorker) return;

    factorWorker.terminate();
    factorWorker = null;
    warmupPromise = null;
}

function handleWorkerMessage(event: MessageEvent) {
    const { type, payload, requestId } = event.data || {};

    if (!requestId || !pendingRequests.has(requestId)) {
        return;
    }

    if (type === "PROGRESS") {
        return;
    }

    const pendingRequest = clearPendingRequest(requestId);
    if (!pendingRequest) return;

    if (type === "SUCCESS") {
        pendingRequest.resolve(payload);
        return;
    }

    const errorMessage = toErrorMessage(
        payload,
        `Factor analysis worker failed during ${pendingRequest.action}.`
    );
    pendingRequest.reject(new Error(errorMessage));
}

function handleWorkerError(error: ErrorEvent) {
    const errorMessage = toErrorMessage(
        error,
        "Factor analysis worker encountered an unrecoverable error."
    );

    rejectAllPendingRequests(errorMessage);
    terminateFactorWorker();
}

function getOrCreateWorker(): Worker {
    if (factorWorker) return factorWorker;

    const workerUrl = new URL(
        "/workers/FactorAnalysis/factorAnalysis.worker.js",
        window.location.origin
    );
    workerUrl.searchParams.set("v", workerCacheBuster);

    factorWorker = new Worker(
        workerUrl,
        { type: "module" }
    );

    factorWorker.onmessage = handleWorkerMessage;
    factorWorker.onerror = handleWorkerError;

    return factorWorker;
}

function runWorkerAction(
    action: FactorWorkerAction,
    payload: Record<string, unknown> = {},
    timeoutMs = 120000
): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = getOrCreateWorker();
        const requestId = buildRequestId(action);

        const timeoutId = setTimeout(() => {
            clearPendingRequest(requestId);
            reject(new Error(`Factor analysis worker timed out while running '${action}'.`));
            terminateFactorWorker();
        }, timeoutMs);

        pendingRequests.set(requestId, {
            action,
            resolve,
            reject,
            timeoutId,
        });

        try {
            worker.postMessage({
                action,
                requestId,
                ...payload,
            });
        } catch (postMessageError) {
            clearPendingRequest(requestId);
            reject(
                new Error(
                    toErrorMessage(
                        postMessageError,
                        `Failed to post message '${action}' to factor analysis worker.`
                    )
                )
            );
        }
    });
}

export async function warmupFactorAnalysisWorker(): Promise<void> {
    if (warmupPromise) return warmupPromise;

    warmupPromise = runWorkerAction("warmup_factor_analysis", {}, 60000)
        .then(() => undefined)
        .catch((error) => {
            warmupPromise = null;
            throw error;
        });

    return warmupPromise;
}

export async function analyzeFactor({
    configData,
    dataVariables,
    variables,
}: FactorAnalysisType) {
    // Development guard: force fresh worker so updated WASM artifacts are picked immediately.
    if (process.env.NODE_ENV !== "production") {
        terminateFactorWorker();
    }

    const targetVariables = configData.main.TargetVar || [];
    const valueTarget = configData.main.ValueTarget
        ? [configData.main.ValueTarget]
        : [];

    // If variables metadata is missing, create synthetic variables from the target variable names
    // This handles the case when variables table in IndexedDB is empty but data exists
    let effectiveVariables = variables;
    if (!variables || variables.length === 0) {
        console.warn("[analyzeFactor] Variables metadata is empty! Creating synthetic variables from target variable names.");
        const allVarNames = [...targetVariables, ...(valueTarget.length > 0 ? valueTarget : [])];
        effectiveVariables = createSyntheticVariables(allVarNames) as any;
    }

    const slicedDataForTarget = getSlicedData({
        dataVariables: dataVariables,
        variables: effectiveVariables,
        selectedVariables: targetVariables,
    });

    const slicedDataForValue = getSlicedData({
        dataVariables: dataVariables,
        variables: effectiveVariables,
        selectedVariables: valueTarget,
    });

    const varDefsForTarget = sanitizeVarDefs(
        getVarDefs(effectiveVariables, targetVariables)
    );
    const varDefsForValue = sanitizeVarDefs(
        getVarDefs(effectiveVariables, valueTarget)
    );

    // Validation before WASM call
    if (!slicedDataForTarget || slicedDataForTarget.length === 0) {
        throw new Error("No data available for selected variables. Please ensure data is loaded and variables are selected.");
    }
    
    if (slicedDataForTarget[0]?.length === 0) {
        throw new Error("Selected variables have no valid data records. Please check if data is loaded correctly.");
    }

    // Komputasi WASM dijalankan di Web Worker agar tidak memblokir main thread UI.
    // Worker file: public/workers/FactorAnalysis/factorAnalysis.worker.js
    try {
        if (!warmupPromise) {
            warmupPromise = warmupFactorAnalysisWorker();
        }
        await warmupPromise;
    } catch {
        // Tetap lanjutkan eksekusi. Action run_factor_analysis akan mencoba init ulang di worker.
    }

    const { results } = await runWorkerAction(
        "run_factor_analysis",
        {
            slicedDataForTarget,
            slicedDataForValue,
            varDefsForTarget,
            varDefsForValue,
            configData,
        },
        180000
    );

    // Teruskan configData ke formatter agar bisa mengakses extraction.Method
    const formattedResults = transformFactorAnalysisResult(results, configData);

    /*
     * Final Result Process 
     * */
    await resultFactorAnalysis({
        formattedResult: formattedResults ?? [],
        configData,
    });
}
