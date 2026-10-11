// Extra checks: (1) positive control for the main-thread WASM hook,
// (2) repeat-run determinism inside one WASM instance, (3) small timing sample.
// Usage: node verify-extra.cjs <baseURL>
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test"); // hoisted to the repo-root node_modules
const base = process.argv[2];

const WASM_HOOK = `(() => {
  const calls = (window.__wasmMainThreadCalls = []);
  for (const fn of ["instantiate", "instantiateStreaming", "compile", "compileStreaming"]) {
    const orig = WebAssembly[fn];
    if (typeof orig !== "function") continue;
    WebAssembly[fn] = function (...args) { calls.push({ fn }); return orig.apply(this, args); };
  }
})();`;

function diff(a, b) {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    if (i === n && a.length === b.length) return null;
    return { index: i, first: a.slice(Math.max(0, i - 150), i + 150), second: b.slice(Math.max(0, i - 150), i + 150) };
}

// Numbers only, in document order: tells whether values differ or only structure/order.
const numbers = (s) => (s.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/gi) || []).map(Number).sort((x, y) => x - y);

async function open(browser, scripts) {
    const ctx = await browser.newContext();
    for (const s of scripts) await ctx.addInitScript({ content: s });
    const page = await ctx.newPage();
    await page.goto(`${base}/glm-worker-verify`, { timeout: 600000 });
    await page.waitForSelector('#harness[data-ready="1"]', { timeout: 600000 });
    return { ctx, page };
}
const call = (page, fn, mod, ds, mode) =>
    page.evaluate(([fn, mod, ds, mode]) => window.__glmHarness[fn](mod, ds, mode), [fn, mod, ds, mode]);

(async () => {
    const browser = await chromium.launch();
    const out = {};

    // (1) positive control: main mode MUST be seen by the hook.
    {
        const { ctx, page } = await open(browser, [WASM_HOOK]);
        await call(page, "runCompute", "multivariate", "A", "main");
        await call(page, "runCompute", "repeated-measures", "A", "main");
        out.positiveControl = await page.evaluate(() => window.__wasmMainThreadCalls);
        await ctx.close();
    }

    // (2) determinism of repeated runs within one instance, per mode.
    for (const mode of ["main", "worker"]) {
        for (const mod of ["multivariate", "repeated-measures"]) {
            const { ctx, page } = await open(browser, []);
            const r1 = await call(page, "runCompute", mod, "A", mode);
            const r2 = await call(page, "runCompute", mod, "A", mode);
            const n1 = numbers(r1.exact), n2 = numbers(r2.exact);
            out[`repeat:${mode}:${mod}`] = {
                exactEqual: r1.exact === r2.exact,
                sortedKeysEqual: r1.sorted === r2.sorted,
                sameMultisetOfNumbers: n1.length === n2.length && n1.every((v, i) => Object.is(v, n2[i])),
                firstDiffExact: diff(r1.exact, r2.exact),
                firstDiffSorted: diff(r1.sorted, r2.sorted),
            };
            await ctx.close();
        }
    }

    // (3) timing sample (observation only): perf500, alternating, 3 each.
    {
        const { ctx, page } = await open(browser, []);
        const t = { main: [], worker: [] };
        for (let i = 0; i < 3; i++) {
            for (const mode of ["main", "worker"]) {
                const r = await call(page, "runCompute", "multivariate", "perf500", mode);
                t[mode].push(Math.round(r.ms));
            }
        }
        out.timingPerf500 = t;
        await ctx.close();
    }

    const outDir = process.env.GLM_VERIFY_OUT || path.join(__dirname, "..", "results", "latest");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "verify-extra-report.json"), JSON.stringify(out, null, 2));
    for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v).slice(0, 1500));
    await browser.close();
})().catch((e) => { console.error("EXTRA FAILED:", e); process.exit(1); });
