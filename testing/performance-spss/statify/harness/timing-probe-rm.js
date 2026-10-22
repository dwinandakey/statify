// TIMING PROBE WORKER, Repeated Measures: same as timing-probe-mv.js, around
// the UNMODIFIED production Repeated Measures worker module.
import "@/components/Modals/Analyze/general-linear-model/repeated-measures/services/repeated-measures-analysis-worker";

const handler = self.onmessage;
let t0 = 0;
self.onmessage = (event) => {
    t0 = performance.now();
    return handler.call(self, event);
};
const postReply = self.postMessage.bind(self);
self.postMessage = (message) => postReply({ ...message, __probe: { ms: performance.now() - t0 } });
