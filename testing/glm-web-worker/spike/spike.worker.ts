// SPIKE (compare_web_workers.md §3.5), kept in testing/glm-web-worker/spike (see ../README.md).
// Variant A: file name matches the `/\.worker\.(js|ts)$/` worker-loader rule
// in next.config.js. Content is identical to spike-plain.ts.
// @ts-ignore -- same workaround as multivariate-analysis.ts (full-project type check resolves this pkg to another GLM pkg typings)
import init, { MultivariateAnalysis } from "@/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg";

self.onmessage = async (event: MessageEvent) => {
    const t0 = performance.now();
    try {
        await init();
        const tInit = performance.now();
        const p = event.data.payload;
        const analysis = new MultivariateAnalysis(
            p.depData, p.fixFactorData, p.covarData, p.wlsData,
            p.depDefs, p.fixFactorDefs, p.covarDefs, p.wlsDefs, p.config
        );
        const results = analysis.get_formatted_results();
        const errors = analysis.get_all_errors();
        analysis.free();
        const keys = results instanceof Map ? [...results.keys()] : Object.keys(results ?? {});
        self.postMessage({
            ok: true,
            inWorkerScope: typeof document === "undefined",
            initMs: tInit - t0,
            totalMs: performance.now() - t0,
            resultKeys: keys,
            errorsHead: String(errors).slice(0, 200),
        });
    } catch (err) {
        self.postMessage({ ok: false, error: String((err as Error)?.stack ?? err) });
    }
};
