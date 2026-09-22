// Memory diagnosis: N consecutive runs per scenario, recording total time and
// the WASM linear-memory size (memory.buffer.byteLength) after each run.
// Each scenario runs on a fresh page (fresh WASM instance).
//
// Usage: node memory-diagnosis.cjs <baseURL> [runs=10] [scenario,scenario,...]
//   scenarios: mv-main, mv-worker-probe, mv-worker-service-timing,
//              mv-main-forced-gc, rm-main (default: the four mv-* scenarios)
// Needs the harness page (and memory-probe-worker.js) served at /glm-worker-verify.
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test"); // hoisted to the repo-root node_modules

const base = process.argv[2];
const RUNS = Number(process.argv[3] || 10);
const OUT_DIR = process.env.GLM_VERIFY_OUT || path.join(__dirname, "..", "results", "latest");

const MB = (b) => (b == null ? null : Math.round((b / (1024 * 1024)) * 100) / 100);

// Captures every WebAssembly.Memory instantiated on the page's MAIN thread
// (init scripts never run inside workers). Only the Multivariate module is
// instantiated on these pages, so the last entry is its linear memory.
const CAPTURE_MAIN_MEMORY = `(() => {
  const memories = (window.__mainWasmMemories = []);
  const capture = (result) => {
    const instance = (result && result.instance) || result;
    const memory = instance && instance.exports && instance.exports.memory;
    if (memory instanceof WebAssembly.Memory) memories.push(memory);
    return result;
  };
  for (const fn of ["instantiate", "instantiateStreaming"]) {
    const original = WebAssembly[fn];
    WebAssembly[fn] = (...args) => original.apply(WebAssembly, args).then(capture);
  }
})();`;

async function scenario(browser, name, fn, args) {
    const context = await browser.newContext();
    await context.addInitScript({ content: CAPTURE_MAIN_MEMORY });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto(`${base}/glm-worker-verify`, { timeout: 600000 });
    await page.waitForSelector('#harness[data-ready="1"]', { timeout: 600000 });
    const rows = [];
    for (let i = 1; i <= RUNS; i++) {
        const r = await page.evaluate(([fn, args]) => window.__glmHarness[fn](...args), [fn, args]);
        const row = {
            run: i,
            ms: Math.round(r.ms),
            wasmBytes: r.wasmBytes ?? null,
            wasmMB: MB(r.wasmBytes),
            mode: r.mode ?? null,
            ok: r.ok ?? null,
            instantiations: r.instantiations ?? null,
            gcCalled: r.gcCalled ?? null,
        };
        rows.push(row);
        console.log(name, JSON.stringify(row));
    }
    await context.close();
    return { name, fn, args, rows, pageErrors };
}

// name → [harness function, args, needs --expose-gc]
const SCENARIOS = {
    "mv-main": ["runMemoryMain", ["multivariate", "perf500", false], false],
    "mv-worker-probe": ["runMemoryWorkerProbe", ["perf500"], false],
    "mv-worker-service-timing": ["runCompute", ["multivariate", "perf500", "worker"], false],
    "mv-main-forced-gc": ["runMemoryMain", ["multivariate", "perf500", true], true],
    "rm-main": ["runMemoryMain", ["repeated-measures", "large", false], false],
};
// Default = the four Multivariate scenarios of the first diagnosis (2026-09-22).
const DEFAULT = ["mv-main", "mv-worker-probe", "mv-worker-service-timing", "mv-main-forced-gc"];
const selected = (process.argv[4] ? process.argv[4].split(",") : DEFAULT).map((s) => s.trim());
for (const s of selected) if (!SCENARIOS[s]) throw new Error(`unknown scenario "${s}" (known: ${Object.keys(SCENARIOS).join(", ")})`);

(async () => {
    const report = { base, runs: RUNS, startedAt: new Date().toISOString(), scenarios: [] };
    const browser = await chromium.launch();
    // Separate browser: the V8 flag exposes window.gc so a full GC can run before each run.
    const gcBrowser = selected.some((s) => SCENARIOS[s][2])
        ? await chromium.launch({ args: ["--js-flags=--expose-gc"] })
        : null;
    report.browserVersion = browser.version();
    for (const name of selected) {
        const [fn, args, needsGc] = SCENARIOS[name];
        report.scenarios.push(await scenario(needsGc ? gcBrowser : browser, name, fn, args));
    }
    await browser.close();
    if (gcBrowser) await gcBrowser.close();

    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const out = path.join(OUT_DIR, "memory-diagnosis-report.json");
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log("report written:", out);
})().catch((e) => {
    console.error("MEMORY DIAGNOSIS FAILED:", e);
    process.exit(1);
});
