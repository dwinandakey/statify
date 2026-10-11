// Verification #4–#6 for the GLM Web Worker implementation.
// Usage: node verify-run.cjs <baseURL> <label>
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test"); // hoisted to the repo-root node_modules

const base = process.argv[2];
const label = process.argv[3] || "run";
const OUT_DIR = process.env.GLM_VERIFY_OUT || path.join(__dirname, "..", "results", "latest");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, `verify-report-${label}.json`);

// Records every WebAssembly compile/instantiate call made on the page's MAIN
// thread. Init scripts run only in the page's main world, never in workers.
const WASM_HOOK = `(() => {
  const calls = (window.__wasmMainThreadCalls = []);
  for (const fn of ["instantiate", "instantiateStreaming", "compile", "compileStreaming"]) {
    const orig = WebAssembly[fn];
    if (typeof orig !== "function") continue;
    WebAssembly[fn] = function (...args) {
      const entry = { fn, src: "?", stack: (new Error().stack || "").split("\\n").slice(2, 5).join(" | ") };
      try {
        const a = args[0];
        if (a && typeof a.url === "string") entry.src = a.url;
        else if (a && typeof a.then === "function") { entry.src = "(promise)"; Promise.resolve(a).then((r) => { if (r && r.url) entry.src = r.url; }, () => {}); }
        else if (a && (a instanceof ArrayBuffer || ArrayBuffer.isView(a))) entry.src = "bytes:" + a.byteLength;
      } catch (e) {}
      calls.push(entry);
      return orig.apply(this, args);
    };
  }
})();`;

const BLOCK_WORKER = `window.Worker = function BlockedWorker() { throw new Error("Worker blocked for fallback verification"); };`;

// Stores "main" first, then makes every localStorage.getItem throw, so the
// service can only reach the stored value if it ignores the failure.
const BREAK_GETITEM = `try { window.localStorage.setItem("glm-execution-mode", "main"); } catch (e) {}
Storage.prototype.getItem = function () { throw new DOMException("getItem blocked for verification", "SecurityError"); };`;

function firstDiff(a, b) {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    if (i === n && a.length === b.length) return null;
    return { index: i, main: a.slice(Math.max(0, i - 60), i + 60), worker: b.slice(Math.max(0, i - 60), i + 60) };
}

async function openHarness(browser, initScripts) {
    const context = await browser.newContext();
    for (const s of initScripts) await context.addInitScript({ content: s });
    const page = await context.newPage();
    const log = { console: [], pageErrors: [], workers: [] };
    page.on("console", (m) => log.console.push(`[${m.type()}] ${m.text()}`.slice(0, 500)));
    page.on("pageerror", (e) => log.pageErrors.push(e.message.slice(0, 500)));
    page.on("worker", (w) => log.workers.push(w.url()));
    await page.goto(`${base}/glm-worker-verify`, { timeout: 600000 });
    await page.waitForSelector('#harness[data-ready="1"]', { timeout: 600000 });
    return { context, page, log };
}

const call = (page, fn, mod, ds, mode) =>
    page.evaluate(([fn, mod, ds, mode]) => window.__glmHarness[fn](mod, ds, mode), [fn, mod, ds, mode]);

(async () => {
    const browser = await chromium.launch();
    const report = { base, label, startedAt: new Date().toISOString() };

    // ── #4: same inputs, main vs worker, identical call sequence per instance ──
    {
        const { context, page, log } = await openHarness(browser, []);
        const steps = [
            ["runCompute", "multivariate", "A"], ["runCompute", "multivariate", "B"],
            ["runCompute", "multivariate", "C"], ["runCompute", "multivariate", "perf500"],
            ["runCompute", "repeated-measures", "A"], ["runCompute", "repeated-measures", "B"],
            ["runCompute", "repeated-measures", "large"],
            ["runAnalyze", "multivariate", "A"], ["runAnalyze", "multivariate", "B"],
            ["runAnalyze", "repeated-measures", "A"], ["runAnalyze", "repeated-measures", "B"],
            ["runCompute", "multivariate", "A"], ["runCompute", "repeated-measures", "A"],
        ];
        const rows = [];
        const firstMain = {};
        for (const [fn, mod, ds] of steps) {
            const m = await call(page, fn, mod, ds, "main");
            const w = await call(page, fn, mod, ds, "worker");
            const key = `${fn}:${mod}:${ds}`;
            const row = { step: key, ms: { main: Math.round(m.ms), worker: Math.round(w.ms) } };
            if (fn === "runCompute") {
                row.modes = [m.mode, w.mode];
                row.bytes = m.exact.length;
                row.identicalExact = m.exact === w.exact;
                row.identicalSortedKeys = m.sorted === w.sorted;
                row.identicalErrors = m.errors === w.errors;
                if (!row.identicalExact) row.diff = firstDiff(m.exact, w.exact);
                if (firstMain[key]) row.sameAsFirstMainRun = firstMain[key] === m.exact;
                else firstMain[key] = m.exact;
            } else {
                row.modes = [m.endDetail && m.endDetail.mode, w.endDetail && w.endDetail.mode];
                row.endModules = [m.endDetail && m.endDetail.module, w.endDetail && w.endDetail.module];
                row.nOutputs = [m.nOutputs, w.nOutputs];
                row.bytes = m.outputs.length;
                row.identicalStoreOutput = m.outputs === w.outputs;
                if (!row.identicalStoreOutput) row.diff = firstDiff(m.outputs, w.outputs);
                row.marks = { starts: w.nStarts, ends: w.nEnds };
            }
            rows.push(row);
            console.log(JSON.stringify(row));
        }
        report.compare = { rows, log };
        await context.close();
    }

    // ── #5: worker mode (default, no key) — no WASM call on the main thread ──
    {
        const { context, page, log } = await openHarness(browser, [WASM_HOOK]);
        const results = [];
        for (const [fn, mod, ds] of [
            ["runCompute", "multivariate", "A"], ["runCompute", "repeated-measures", "A"],
            ["runAnalyze", "multivariate", "B"], ["runAnalyze", "repeated-measures", "B"],
            ["runCompute", "multivariate", "perf500"],
        ]) {
            const r = await call(page, fn, mod, ds, null);
            results.push({
                step: `${fn}:${mod}:${ds}`,
                mode: fn === "runCompute" ? r.mode : r.endDetail && r.endDetail.mode,
                nonEmpty: fn === "runCompute" ? r.exact.length > 2 : r.nOutputs > 0,
            });
        }
        const mainThreadWasmCalls = await page.evaluate(() => window.__wasmMainThreadCalls);
        report.workerOnly = { results, mainThreadWasmCalls, log };
        console.log("workerOnly:", JSON.stringify({ results, mainThreadWasmCalls, workers: log.workers }));
        await context.close();
    }

    // ── #6: Worker constructor fails → main-fallback, recorded ──
    {
        const { context, page, log } = await openHarness(browser, [BLOCK_WORKER]);
        const results = [];
        for (const [fn, mod, ds] of [
            ["runAnalyze", "multivariate", "A"], ["runAnalyze", "repeated-measures", "A"],
            ["runCompute", "multivariate", "A"],
        ]) {
            const r = await call(page, fn, mod, ds, null);
            results.push({
                step: `${fn}:${mod}:${ds}`,
                mode: fn === "runCompute" ? r.mode : r.endDetail && r.endDetail.mode,
                endDetail: r.endDetail || null,
                nonEmpty: fn === "runCompute" ? r.exact.length > 2 : r.nOutputs > 0,
            });
        }
        const warnings = log.console.filter((l) => l.startsWith("[warning]") && l.includes("main-fallback"));
        report.fallback = { results, warnings, log };
        console.log("fallback:", JSON.stringify({ results, warnings, workers: log.workers }));
        await context.close();
    }

    // ── extra: localStorage.getItem throws → default "worker" is used ──
    {
        const { context, page, log } = await openHarness(browser, [BREAK_GETITEM]);
        const r = await call(page, "runAnalyze", "multivariate", "A", null);
        report.storageFailure = { mode: r.endDetail && r.endDetail.mode, nOutputs: r.nOutputs, log };
        console.log("storageFailure:", JSON.stringify({ mode: report.storageFailure.mode, nOutputs: r.nOutputs, workers: log.workers, pageErrors: log.pageErrors }));
        await context.close();
    }

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log("report written:", OUT);
    await browser.close();
})().catch((e) => {
    console.error("VERIFY RUNNER FAILED:", e);
    process.exit(1);
});
