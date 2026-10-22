// TIMING PROBE WORKER (compute-only measurement, see ../../README.md). Copied
// next to page.tsx into frontend/app/glm-perf-harness/ of the phase-2 git
// worktree only; never into the main working tree.
//
// Runs the UNMODIFIED production Multivariate worker module and adds
// `__probe.ms` to its reply: the time from the start of its onmessage handler
// (message already deserialised) to its self.postMessage(response) call
// (before the reply is serialised), i.e. WASM init (first run only) +
// MultivariateAnalysis + get_formatted_results + get_all_errors + free.
//
// Plain JavaScript loaded through `new URL(...)`, like
// ../../../glm-web-worker/harness/memory-probe-worker.js, so the frontend type
// check never sees it (all GLM rust/pkg packages are named "wasm@0.1.0").
import "@/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis-worker";

const handler = self.onmessage;
let t0 = 0;
self.onmessage = (event) => {
    t0 = performance.now();
    return handler.call(self, event);
};
const postReply = self.postMessage.bind(self);
self.postMessage = (message) => postReply({ ...message, __probe: { ms: performance.now() - t0 } });
