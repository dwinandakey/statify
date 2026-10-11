// MEMORY PROBE WORKER (diagnosis, see ../README.md). Copy next to the harness
// page in frontend/app/glm-worker-verify/ only while verifying.
//
// Runs the UNMODIFIED production Multivariate worker module and reports the
// size of its WASM linear memory. It captures the WebAssembly.Memory created
// by wasm-bindgen's init() and adds `__probe` to every reply the production
// worker posts, so the size is read after the analysis (and free()) finished.
//
// Deliberately plain JavaScript: it is loaded through `new URL(...)`, so the
// frontend type check never sees it. As a .ts file its import of the worker
// module changed the TypeScript resolution order of the "wasm@0.1.0" GLM
// packages and made univariate-analysis.ts fail `next build` (2026-09-22).
import "@/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis-worker";

const memories = [];

function captureMemory(result) {
    const instance = (result && result.instance) || result;
    const memory = instance && instance.exports && instance.exports.memory;
    if (memory instanceof WebAssembly.Memory) memories.push(memory);
    return result;
}

for (const fn of ["instantiate", "instantiateStreaming"]) {
    const original = WebAssembly[fn];
    WebAssembly[fn] = (...args) => original.apply(WebAssembly, args).then(captureMemory);
}

// The production worker calls self.postMessage(response) at reply time, so
// replacing it here (after the import has registered self.onmessage) is enough.
const postReply = self.postMessage.bind(self);
self.postMessage = (message) =>
    postReply({
        ...message,
        __probe: {
            wasmBytes: memories.length ? memories[memories.length - 1].buffer.byteLength : null,
            instantiations: memories.length,
        },
    });
