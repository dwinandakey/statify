/**
 * Web Worker for GLM Repeated Measures (compare_web_workers.md §3.4): runs
 * init() → RepeatedMeasureAnalysis → get_formatted_results() / get_all_errors()
 * off the main thread. WASM is imported from the same rust/pkg that the
 * service's main-thread path and the Jest tests use (one binary).
 *
 * Named `*-worker.ts`, not `*.worker.ts`: next.config.js sends files matching
 * /\.worker\.(js|ts)$/ through worker-loader, which breaks the
 * `new Worker(new URL(...))` bundling used here.
 */
import type {
    GlmWorkerRequest,
    GlmWorkerResponse,
} from "@/components/Modals/Analyze/general-linear-model/shared/glm-execution";
import init, { RepeatedMeasureAnalysis } from "../rust/pkg/wasm";
import { errorMessage } from "../../shared/error-message";

/** RepeatedMeasureAnalysis constructor arguments, keyed by their Rust parameter names. */
export type RepeatedMeasuresWorkerPayload = {
    subject_data: unknown;
    factors_data: unknown;
    covar_data: unknown;
    subject_data_defs: unknown;
    factors_data_defs: unknown;
    covar_data_defs: unknown;
    config_data: unknown;
};

let wasmReady: Promise<unknown> | null = null;

self.onmessage = async (
    event: MessageEvent<GlmWorkerRequest<RepeatedMeasuresWorkerPayload>>
) => {
    const { id, payload } = event.data;
    let response: GlmWorkerResponse<unknown>;

    try {
        if (!wasmReady) wasmReady = init();
        await wasmReady;

        const repeatedMeasure = new RepeatedMeasureAnalysis(
            payload.subject_data,
            payload.factors_data,
            payload.covar_data,
            payload.subject_data_defs,
            payload.factors_data_defs,
            payload.covar_data_defs,
            payload.config_data
        );
        try {
            const results = repeatedMeasure.get_formatted_results();
            const errors = repeatedMeasure.get_all_errors();
            response = { id, ok: true, results, errors };
        } finally {
            // The worker is reused, so release the Rust-side object explicitly.
            repeatedMeasure.free();
        }
    } catch (err) {
        response = { id, ok: false, error: errorMessage(err) };
    }

    self.postMessage(response);
};
