// stwv_bench.worker.js — PENGGANTI worker STWV untuk harness Track E.
// Setara dengan frontend/components/Modals/Transform/StringToWordVector/stringToWord.processor.ts:
//   - memuat glue + wasm STWV yang SAMA (statify_string_to_word.js / _bg.wasm; disajikan di /__stwv/ oleh serve.mjs),
//   - init() dipanggil sekali per umur Worker (flag wasmReady), process_text_data(data, config), balasan {status, payload}.
// Perbedaan (dicatat di E_performance.md): (1) tanpa bundler webpack/Next (aplikasi memuat worker lewat
// `new Worker(new URL('../stringToWord.processor.ts', import.meta.url))` yang dibundel); (2) galat dinormalkan sederhana
// (tanpa normalizeWorkerError) — tidak memengaruhi waktu jalur sukses.
import init, { process_text_data } from "/__stwv/statify_string_to_word.js";

let wasmReady = false;
const initWasm = async () => {
  if (!wasmReady) { await init(); wasmReady = true; }
};

self.onmessage = async (event) => {
  const { data, config } = event.data;
  try {
    await initWasm();
    const result = process_text_data(data, config);
    self.postMessage({ status: "success", payload: result });
  } catch (error) {
    self.postMessage({ status: "error", payload: { code: "WORKER_ERROR", message: String(error && error.message ? error.message : error) } });
  }
};
