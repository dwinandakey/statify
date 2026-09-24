/**
 * Web Worker for GLM Multivariate (compare_web_workers.md §3.4): runs
 * init() → MultivariateAnalysis → get_formatted_results() / get_all_errors()
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
// @ts-ignore -- same workaround as multivariate-analysis.ts: in the full-project
// type check this import resolves to another GLM package's typings (all GLM
// packages are named "wasm@0.1.0").
import init, { MultivariateAnalysis } from "../rust/pkg";

/** MultivariateAnalysis constructor arguments, keyed by their Rust parameter names. */
export type MultivariateWorkerPayload = {
    dep_data: unknown;
    fix_factor_data: unknown;
    covar_data: unknown;
    wls_data: unknown;
    dep_data_defs: unknown;
    fix_factor_data_defs: unknown;
    covar_data_defs: unknown;
    wls_data_defs: unknown;
    config_data: unknown;
};

let wasmReady: Promise<unknown> | null = null;

self.onmessage = async (
    event: MessageEvent<GlmWorkerRequest<MultivariateWorkerPayload>>
) => {
    const { id, payload } = event.data;
    let response: GlmWorkerResponse<unknown>;

    try {
        if (!wasmReady) wasmReady = init();
        await wasmReady;

        const multivariate = new MultivariateAnalysis(
            payload.dep_data,
            payload.fix_factor_data,
            payload.covar_data,
            payload.wls_data,
            payload.dep_data_defs,
            payload.fix_factor_data_defs,
            payload.covar_data_defs,
            payload.wls_data_defs,
            payload.config_data
        );
        try {
            const results = multivariate.get_formatted_results();
            // Simultaneous confidence intervals (Options → Simultaneous CI):
            // computed on demand, only when requested (the service sends
            // SimultaneousCI only when checked), after the analysis results
            // and before the errors so that a failure is logged.
            if ((payload.config_data as any)?.options?.SimultaneousCI) {
                const ci = multivariate.get_simultaneous_ci();
                if (ci) (results as any).simultaneous_confidence_intervals = ci;
            }
            const errors = multivariate.get_all_errors();
            response = { id, ok: true, results, errors };
        } finally {
            // The worker is reused, so release the Rust-side object explicitly.
            multivariate.free();
        }
    } catch (err) {
        response = { id, ok: false, error: String(err) };
    }

    self.postMessage(response);
};
