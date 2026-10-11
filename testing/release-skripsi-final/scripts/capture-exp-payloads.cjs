// Captures the GLM worker request (payload) and response of the final Web
// Worker experiment cells through the REAL dialogs of a production build,
// using the experiment runner's own helpers (same dialog configuration).
//
//   node capture-exp-payloads.cjs --base=http://localhost:3101 --out=<dir> \
//        --rm-levels=10 --rm-measures=1 --rm-options=DescStats,EstEffectSize,ObsPower
const fs = require("fs");
const path = require("path");
const REPO = "D:/0.POLTSTAT STIS/Tugas Kuliah/Skripsi/topik baru statify/statify64";
const { chromium } = require(path.join(REPO, "node_modules/@playwright/test"));
const runner = require(path.join(REPO, "testing/glm-web-worker/experiment/run-experiment.cjs"));

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const OUT = path.resolve(args.out);
const RES = path.join(REPO, "testing/glm-web-worker/results");
const CELLS = [
    ...[100, 500, 1000, 2000].map((n) => ({ module: "multivariate", n, csv: path.join(RES, "experiment-2026-09-23-cpu1-mv-pcore/data", `multivariate-${n}.csv`) })),
    ...[5000, 10000, 20000, 40000].map((n) => ({ module: "repeated-measures", n, csv: path.join(RES, "experiment-2026-09-23-cpu1-rm-noise-pcore/data", `repeated-measures-${n}-L10-M1-noise.csv`) })),
].filter((c) => !args.only || args.only.split(",").includes(`${c.module}-${c.n}`));

const WORKER_TAP = () => {
    window.__workerTap = [];
    const Native = window.Worker;
    window.Worker = class extends Native {
        constructor(url, opts) {
            super(url, opts);
            const src = String(url);
            const post = this.postMessage.bind(this);
            this.postMessage = (msg, ...rest) => { window.__workerTap.push({ src, dir: "request", msg }); return post(msg, ...rest); };
            this.addEventListener("message", (e) => window.__workerTap.push({ src, dir: "response", msg: e.data }));
        }
    };
};

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const report = { base: BASE, chromium: browser.version(), cells: {} };
    for (const c of CELLS) {
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        await context.addInitScript(WORKER_TAP);
        const page = await context.newPage();
        await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
        await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
        await runner.importCsv(page, c.csv);
        await runner.clearResults(page);
        await page.evaluate(() => localStorage.setItem("glm-execution-mode", "worker"));
        const click = c.module === "multivariate" ? await runner.openMultivariate(page, true) : await runner.openRepeatedMeasures(page, true);
        const before = await page.evaluate(() => performance.getEntriesByName("glm-analysis-end", "mark").length);
        await click();
        await page.waitForFunction((k) => performance.getEntriesByName("glm-analysis-end", "mark").length > k, before, { timeout: 30 * 60 * 1000 });
        await page.waitForTimeout(500);
        const modeActual = await page.evaluate(() => { const e = performance.getEntriesByName("glm-analysis-end", "mark"); return e[e.length - 1].detail?.mode; });
        const summary = await runner.readOutputSummary(page);
        const tap = await page.evaluate(() => window.__workerTap.filter((t) => t.msg && typeof t.msg === "object" && "id" in t.msg && (t.dir === "request" ? "payload" in t.msg : "ok" in t.msg)));
        const response = tap.filter((t) => t.dir === "response").pop() || null;
        const request = response ? tap.find((t) => t.dir === "request" && t.msg.id === response.msg.id && t.src === response.src) || null : null;
        const key = `${c.module}-${c.n}`;
        fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify({ cell: key, csv: c.csv, modeActual, worker: response?.src ?? null, request: request?.msg ?? null, response: response?.msg ?? null }));
        report.cells[key] = { modeActual, ok: response?.msg?.ok ?? null, summary };
        console.log(`${key} mode=${modeActual} ok=${response?.msg?.ok} ${JSON.stringify(summary).slice(0, 200)}`);
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, "capture-report.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("CAPTURE FAILED:", e); process.exit(1); });
