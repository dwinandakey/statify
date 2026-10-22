// harness.js — halaman harness Track E (jalur peramban). Memuat Worker ASLI aplikasi (NB, AM) dan worker pengganti STWV,
// mengirim payload yang sama dengan hook aplikasi, dan mengukur dari postMessage sampai onmessage dengan performance.now()
// DI MAIN THREAD (setara klik OK -> hasil diterima hook; bagian setelahnya — penulisan store/Output Viewer — tidak ada di harness).
// Responsivitas UI: PerformanceObserver('longtask') (>= 50 ms menurut spesifikasi) dan jeda antar-frame requestAnimationFrame.
// Dipanggil dari Playwright: await page.evaluate((cell) => window.__bench.runCell(cell), cell)

const statusEl = document.getElementById("status");
const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame((t) => r(t)));

function percentile(a, p) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

async function sha256Hex(text) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return ""; }
}

/** Perekam jeda frame + long task. start() -> stop() mengembalikan ringkasan. */
function startMonitor() {
  const gaps = [];
  const longtasks = [];
  let alive = true, last = null;
  let po = null;
  try {
    po = new PerformanceObserver((list) => { for (const e of list.getEntries()) longtasks.push(e.duration); });
    po.observe({ type: "longtask" });
  } catch { po = null; }
  const tick = (ts) => {
    if (last !== null) gaps.push(ts - last);
    last = ts;
    if (alive) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    async stop() {
      await nextFrame();            // satu frame lagi: menangkap jeda akibat deserialisasi hasil di main thread
      alive = false;
      await sleep(80);              // beri waktu PerformanceObserver mengirim entri longtask yang tertunda
      if (po) { for (const e of po.takeRecords()) longtasks.push(e.duration); po.disconnect(); }
      return {
        frame_count: gaps.length,
        frame_p95_ms: gaps.length ? percentile(gaps, 0.95) : NaN,
        frame_max_ms: gaps.length ? Math.max(...gaps) : NaN,
        longtask_supported: po !== null,
        longtask_count: longtasks.length,
        longtask_max_ms: longtasks.length ? Math.max(...longtasks) : 0,
        longtask_total_ms: longtasks.reduce((s, x) => s + x, 0),
      };
    },
  };
}

async function idleBaseline(ms = 1200) {
  const m = startMonitor();
  await sleep(ms);
  const r = await m.stop();
  return r.frame_p95_ms;
}

function waitWorker(worker, kind, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => finish({ t1: performance.now(), status: "TIMEOUT", err: `melebihi ${timeoutMs} ms` }), timeoutMs);
    worker.onmessage = (e) => {
      const t1 = performance.now();           // stempel waktu pertama di handler (deserialisasi hasil sudah selesai)
      const m = e.data;
      if (kind === "stwv") {
        if (m.status === "success") finish({ t1, status: "OK", terms: m.payload?.vocabulary?.length ?? "" });
        else finish({ t1, status: "GALAT", err: JSON.stringify(m.payload).slice(0, 300) });
      } else if (kind === "nb") {
        if (m.success && m.data?.trained_model) finish({ t1, status: "OK", terms: m.data.trained_model.text?.terms?.length ?? "" });
        else finish({ t1, status: "GALAT", err: String(m.error ?? JSON.stringify(m.errors ?? "").slice(0, 300)) });
      } else {
        if (m.success && m.data?.predictions) finish({ t1, status: "OK", terms: null });
        else finish({ t1, status: "GALAT", err: String(m.error ?? JSON.stringify(m.errors ?? "").slice(0, 300)) });
      }
    };
    worker.onerror = (ev) => finish({ t1: performance.now(), status: "GALAT", err: `worker.onerror: ${ev.message || "tanpa pesan"}` });
    worker.onmessageerror = () => finish({ t1: performance.now(), status: "GALAT", err: "messageerror" });
  });
}

/** Subsampel merata N dokumen (untuk mengukur overhead tetap Worker). Struktur payload dipertahankan. */
function subsample(P, kind, N) {
  const len = kind === "stwv" ? P.data.length : (kind === "nb" ? P.target[0].length : P.actual[0].length);
  const idx = Array.from({ length: N }, (_, i) => Math.floor((i * len) / N));
  const pick = (arr) => idx.map((i) => arr[i]);
  const Q = { ...P, n: N };
  if (kind === "stwv") { Q.data = pick(P.data); return Q; }
  if (kind === "nb") {
    Q.target = P.target.map(pick); Q.predictors = P.predictors.map(pick);
    Q.text = P.text.source === "raw" ? { ...P.text, values: pick(P.text.values) } : P.text;
    return Q;
  }
  Q.predictors = P.predictors.map(pick); Q.actual = P.actual.map(pick);
  Q.text = P.text?.source === "raw" ? { ...P.text, values: pick(P.text.values) } : P.text;
  return Q;
}

/**
 * cell = { scenarioId, kind: 'stwv'|'nb'|'am', payloadUrl, runs, timeoutMs, nbWorkerUrl, amWorkerUrl }
 * Protokol: run 0 = pemanasan, run 1..runs = pengukuran. NB/AM: Worker baru tiap run lalu terminate() (seperti
 * naive-bayes-analysis.ts / apply-model-analysis.ts). STWV: satu Worker dipakai ulang (seperti workerRef di hook).
 */
async function runCell(cell) {
  const { scenarioId, kind, payloadUrl, runs = 5, timeoutMs = 600000 } = cell;
  setStatus(`memuat ${payloadUrl}`);
  const text = await (await fetch(payloadUrl, { cache: "no-store" })).text();
  const payloadSha = (await sha256Hex(text)).slice(0, 12);
  let P = JSON.parse(text);
  if (cell.tinyN) P = subsample(P, kind, cell.tinyN);
  let message, makeWorker, persistent = null;
  if (kind === "stwv") {
    message = { data: P.data, config: P.configs[scenarioId] };
    makeWorker = () => new Worker("/__perf/stwv_bench.worker.js", { type: "module" });
  } else if (kind === "nb") {
    message = { target: P.target, predictors: P.predictors, targetDefs: P.targetDefs, predictorsDefs: P.predictorsDefs, config: P.configs[scenarioId], text: P.text };
    makeWorker = () => new Worker(cell.nbWorkerUrl, { type: "module" });
  } else {
    message = { predictors: P.predictors, predictorDefs: P.predictorDefs, mapping: P.mapping, actual: P.actual, actualDefs: P.actualDefs, model: P.model, text: P.text };
    makeWorker = () => new Worker(cell.amWorkerUrl, { type: "module" });
  }
  const n = P.n;
  const idle = await idleBaseline();
  const results = [];
  for (let run = 0; run <= runs; run++) {
    setStatus(`${scenarioId} run ${run}/${runs}`);
    await sleep(250);
    const monitor = startMonitor();
    await nextFrame(); await nextFrame();   // kondisi tunak sebelum t0
    let outcome;
    const t0 = performance.now();
    let worker;
    try {
      if (kind === "stwv") { persistent ??= makeWorker(); worker = persistent; } else { worker = makeWorker(); }
      const waiting = waitWorker(worker, kind, timeoutMs);
      worker.postMessage(message);          // serialisasi (structured clone) payload terjadi di sini, di main thread
      outcome = await waiting;
    } catch (e) {
      outcome = { t1: performance.now(), status: "GALAT", err: `pengecualian main thread: ${e && e.message ? e.message : e}` };
    }
    const ms = outcome.t1 - t0;
    const mon = await monitor.stop();
    if (kind !== "stwv" && worker) worker.terminate();
    if (kind === "stwv" && outcome.status !== "OK" && persistent) { persistent.terminate(); persistent = null; }
    const terms = kind === "am" ? P.jumlah_term_model : outcome.terms;
    results.push({ run, ms, status: outcome.status, err: outcome.err ?? "", terms, ...mon, idle_frame_p95_ms: idle });
    if (outcome.status !== "OK") break;
  }
  if (persistent) persistent.terminate();
  setStatus("selesai");
  return { n, payloadSha, idle_frame_p95_ms: idle, results };
}

window.__bench = {
  runCell,
  env: () => ({
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory ?? null,
    longtaskSupported: (PerformanceObserver.supportedEntryTypes || []).includes("longtask"),
    crossOriginIsolated: self.crossOriginIsolated,
  }),
};
window.__benchReady = true;
