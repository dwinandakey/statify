/**
 * Integration-test boundaries for the Discriminant dialog.
 *
 * Everything between the dialog and the Output Viewer runs for real: the dialog
 * handlers, validation, the state hook, the WASM engine, the formatter, the
 * interpretation, store.ts, Save and the XML builder. Only the outer boundaries
 * are replaced with in-memory stand-ins:
 * - the Zustand stores (their persistence layer),
 * - the Web Worker transport (replaced by an in-process copy of
 *   discriminant.worker.js that runs the same WASM build),
 * - sonner toasts and the browser file download (recorded).
 * IndexedDB (saved dialog settings) is real, via fake-indexeddb from jest.setup.ts.
 */
import fs from "fs";
import path from "path";
import v8 from "v8";
import { performance as nodePerformance } from "perf_hooks";
import { initSync, DiscriminantAnalysis } from "@/public/workers/Classify/Discriminant/pkg/wasm";

// jsdom lacks structuredClone, which fake-indexeddb needs.
(globalThis as any).structuredClone ??= (value: unknown) => v8.deserialize(v8.serialize(value));

// jsdom's performance has no marks or measures, which lib/analysisTiming uses.
for (const name of ["mark", "measure", "getEntriesByType", "getEntriesByName"]) {
    (performance as any)[name] ??= (nodePerformance as any)[name].bind(nodePerformance);
}

initSync({ module: fs.readFileSync(path.join(process.cwd(), "public/workers/Classify/Discriminant/pkg/wasm_bg.wasm")) });

type Toast = { type: "success" | "error" | "warning"; message: string; description?: string };

/** What reached the user: output statistics, toasts, saved variables, downloads. */
export const recorder = {
    statistics: [] as Array<{ title: string; description: string; output_data: string; components: string }>,
    toasts: [] as Toast[],
    addedVariables: [] as Array<{ definitions: any[]; updates: any[] }>,
    downloads: [] as string[],
    workersStarted: 0,
};

/** Switch for the "connection to the calculation module failed" branch. */
export const engine = { failConnection: false };

// ---- Stores --------------------------------------------------------------------------------
export const variableState: any = {
    variables: [] as any[],
    error: null,
    addVariables: async (definitions: any[], updates: any[]) => {
        recorder.addedVariables.push({ definitions, updates });
        variableState.variables = [...variableState.variables, ...definitions.map((d) => ({ ...d }))];
    },
};
export const dataState: any = { data: [] as string[][] };

export const variableStoreMock = {
    useVariableStore: Object.assign((selector?: (s: any) => unknown) => (selector ? selector(variableState) : variableState), {
        getState: () => variableState,
    }),
};
export const dataStoreMock = {
    useDataStore: Object.assign(() => dataState, { getState: () => dataState }),
};
export const modalStoreMock = { useModalStore: () => ({ closeModal: () => {} }) };
export const resultStoreMock = {
    useResultStore: {
        getState: () => ({
            addLog: async () => 1,
            addAnalytic: async () => 1,
            addStatistic: async (_analyticId: number, statistic: any) => {
                recorder.statistics.push(statistic);
                return recorder.statistics.length;
            },
        }),
    },
};
export const sonnerMock = {
    toast: {
        success: (message: string, o?: { description?: string }) => recorder.toasts.push({ type: "success", message, description: o?.description }),
        error: (message: string, o?: { description?: string }) => recorder.toasts.push({ type: "error", message, description: o?.description }),
        warning: (message: string, o?: { description?: string }) => recorder.toasts.push({ type: "warning", message, description: o?.description }),
    },
};

// ---- Web Worker: same steps as public/workers/Classify/Discriminant/discriminant.worker.js ----
class EngineWorker {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: ((e: { message: string; filename: string; lineno: number; colno: number }) => void) | null = null;

    constructor(private url: string) {
        recorder.workersStarted++;
    }

    postMessage(m: any) {
        setTimeout(() => {
            if (engine.failConnection) {
                this.onerror?.({ message: "Failed to load the worker script", filename: this.url, lineno: 0, colno: 0 });
                return;
            }
            let data: unknown;
            try {
                const analysis = new DiscriminantAnalysis(
                    m.group_data, m.independent_data, m.selection_data,
                    m.group_data_defs, m.independent_data_defs, m.selection_data_defs,
                    m.config_data, m.strata_data,
                );
                data = {
                    type: "SUCCESS",
                    payload: {
                        formattedResults: analysis.get_formatted_results(),
                        log: analysis.get_all_log(),
                        errors: analysis.get_all_errors(),
                    },
                };
                analysis.free();
            } catch (error: any) {
                data = { type: "ERROR", error: error?.message || String(error) };
            }
            this.onmessage?.({ data });
        }, 0);
    }

    terminate() {}
}
(globalThis as any).Worker = EngineWorker;

// ---- Browser download (XML export) ----------------------------------------------------------
(URL as any).createObjectURL = () => "blob:discriminant-model";
(URL as any).revokeObjectURL = () => {};
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    recorder.downloads.push(this.download);
};

export function resetRecorder() {
    recorder.statistics = [];
    recorder.toasts = [];
    recorder.addedVariables = [];
    recorder.downloads = [];
    recorder.workersStarted = 0;
    engine.failConnection = false;
}
