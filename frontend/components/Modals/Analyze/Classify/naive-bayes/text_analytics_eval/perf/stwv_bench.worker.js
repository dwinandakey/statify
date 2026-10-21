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
    // Sama dengan stringToWord.processor.ts: matriks dikirim sebagai Float64Array row-major yang di-transfer
    // (utils/packedMatrix.ts packMatrix), bukan number[][].
    const { matrix, ...rest } = result;
    const rows = matrix.length, cols = result.vocabulary.length;
    const buf = new Float64Array(rows * cols);
    for (let i = 0; i < rows; i++) { const row = matrix[i], base = i * cols; for (let j = 0; j < cols; j++) buf[base + j] = row[j] ?? 0; }
    self.postMessage({ status: "success", payload: { ...rest, packedMatrix: { rows, cols, data: buf } } }, [buf.buffer]);
  } catch (error) {
    self.postMessage({ status: "error", payload: { code: "WORKER_ERROR", message: String(error && error.message ? error.message : error) } });
  }
};
