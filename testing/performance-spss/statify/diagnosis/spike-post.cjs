// Diagnosis of the end-to-end spike in mv1-n100000 run 2 (stage "post":
// worker reply -> glm-analysis-end; 16.1 s in the main run, 10.6 s in the
// pilot, otherwise ~40 ms). Production code unchanged.
//
// Repeats the run-e2e.cjs protocol for one cell (fresh context, CSV import,
// clean protocol, Multivariate dialog, OK) with RUNS runs, in two variants:
//   capture  the posted payload is kept and serialised after run 1, as in the study
//   nocapture  no payload capture
// Per run: JS heap (CDP Performance.getMetrics) and navigator.storage.estimate()
// before and after, and a Chromium trace of the run; the main-thread events
// of the post window (GC, IndexedDB, tasks) are summarised.
//
// Usage (production server running): node spike-post.cjs [base] [out] [runs] [cell data dir]
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const e2e = require("../run-e2e.cjs");

const BASE = process.argv[2] || "http://localhost:3101";
const OUT = path.resolve(process.argv[3] || path.join(__dirname, "..", "..", "results", "diagnosis-spike"));
const RUNS = Number(process.argv[4] || 3);
const DATA = path.resolve(process.argv[5] || path.join(__dirname, "..", "..", "data", "kode"));
const N = 100000;
const CFG = e2e.PROC.mv1;

function summariseTrace(file, t0, t1) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const events = Array.isArray(data) ? data : data.traceEvents;
    const names = {};
    for (const e of events) if (e.ph === "M" && e.name === "thread_name") names[`${e.pid}:${e.tid}`] = e.args.name;
    // Renderer main thread: CrRendererMain of the busiest renderer.
    const main = Object.entries(names).filter(([, n]) => n === "CrRendererMain").map(([k]) => k);
    // performance.now() origin: use the blink.user_timing marks to map times.
    const marks = events.filter((e) => e.cat && e.cat.includes("blink.user_timing") && (e.name === "glm-analysis-end" || e.name === "glm-analysis-start"));
    const end = marks.filter((e) => e.name === "glm-analysis-end").pop();
    const by = {};
    if (!end) return { error: "no end mark in trace" };
    // The trace clock is in µs; the window [t0, t1] is given in performance.now()
    // ms. Align on the end mark: trace_ts(end) <-> t1.
    const offset = end.ts - t1 * 1000;
    const w0 = t0 * 1000 + offset, w1 = t1 * 1000 + offset;
    for (const e of events) {
        if (e.ph !== "X" || !main.includes(`${e.pid}:${e.tid}`)) continue;
        const s = Math.max(e.ts, w0), f = Math.min(e.ts + (e.dur || 0), w1);
        if (f <= s) continue;
        const key = /GC|Collect|Sweep|Mark/.test(e.name) ? `gc:${e.name}` : /IndexedDB|IDB/i.test(e.name) || /IndexedDB/i.test(e.cat) ? `idb:${e.name}` : e.name;
        by[key] = (by[key] || 0) + (f - s) / 1000;
    }
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, Math.round(v)]);
    const gc = Object.entries(by).filter(([k]) => k.startsWith("gc:")).reduce((s, [, v]) => s + v, 0);
    const idb = Object.entries(by).filter(([k]) => k.startsWith("idb:")).reduce((s, [, v]) => s + v, 0);
    return { windowMs: Math.round(t1 - t0), gcMs: Math.round(gc), idbMs: Math.round(idb), top };
}

// Busy time per thread (all processes) inside the window: which thread works
// while the renderer main thread waits.
function busyThreads(file, t0, t1) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const events = Array.isArray(data) ? data : data.traceEvents;
    const names = {}, procs = {};
    for (const e of events) {
        if (e.ph === "M" && e.name === "thread_name") names[`${e.pid}:${e.tid}`] = e.args.name;
        if (e.ph === "M" && e.name === "process_name") procs[e.pid] = e.args.name;
    }
    const end = events.filter((e) => e.name === "glm-analysis-end").pop();
    const offset = end.ts - t1 * 1000, w0 = t0 * 1000 + offset, w1 = t1 * 1000 + offset;
    const busy = {};
    for (const e of events) {
        if (e.ph !== "X" || !(e.name === "ThreadControllerImpl::RunTask" || e.name === "RunTask" || /Compaction|LevelDB|IndexedDB/i.test(e.name))) continue;
        const s = Math.max(e.ts, w0), f = Math.min(e.ts + (e.dur || 0), w1);
        if (f <= s) continue;
        const k = `${procs[e.pid] || e.pid} / ${names[`${e.pid}:${e.tid}`] || e.tid} / ${/Compaction|LevelDB|IndexedDB/i.test(e.name) ? e.name : "tasks"}`;
        busy[k] = (busy[k] || 0) + (f - s) / 1000;
    }
    return Object.entries(busy).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, Math.round(v)]);
}

async function variant(browser, name, capture) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(e2e.PERF_TAP);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const heap = async () => {
        const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
        const st = await page.evaluate(() => navigator.storage.estimate().then((e) => e.usage));
        return { heapUsedMB: +(m.JSHeapUsedSize / 1e6).toFixed(1), heapTotalMB: +(m.JSHeapTotalSize / 1e6).toFixed(1), storageMB: +(st / 1e6).toFixed(1) };
    };
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ state: "visible", timeout: 300000 });
    await e2e.importCsv(page, path.join(DATA, `mv1-n${N}.csv`), N);
    const rows = [];
    for (let i = 1; i <= RUNS; i++) {
        const clean = await e2e.runner.clearResults(page);
        await page.evaluate(() => localStorage.setItem("glm-execution-mode", "worker"));
        const clickOk = await e2e.openMultivariate(page, CFG, i === 1);
        await page.waitForTimeout(1000);
        const before = await heap();
        const prevEnds = await page.evaluate((cap) => {
            window.__perf.events = []; window.__perf.capture = cap; window.__perf.captured = null; window.__perf.lastResponse = null;
            return performance.getEntriesByName("glm-analysis-end", "mark").length;
        }, capture && i === 1);
        const traceFile = path.join(OUT, `${name}-run${i}.json`);
        await browser.startTracing(page, { path: traceFile, screenshots: false, categories: ["-*", "devtools.timeline", "disabled-by-default-devtools.timeline", "toplevel", "v8", "disabled-by-default-v8.gc", "blink.user_timing", "IndexedDB", "leveldb", "disabled-by-default-leveldb", "__metadata"] });
        await clickOk();
        await page.waitForFunction((k) => performance.getEntriesByName("glm-analysis-end", "mark").length > k, prevEnds, { timeout: 30 * 60 * 1000, polling: 100 });
        await page.waitForTimeout(300);
        await browser.stopTracing();
        const m = await page.evaluate(e2e.COLLECT, prevEnds);
        const after = await heap();
        if (capture && i === 1) {
            // As in run-e2e.cjs: serialise the captured payload after run 1.
            const len = await page.evaluate(() => { const c = window.__perf.captured; window.__perf.captured = null; window.__perf.capture = false; return c ? JSON.stringify({ payload: c.payload }).length : 0; });
            after.capturedChars = len;
        }
        const post = m.reply ? m.end - m.reply.t : null;
        const tr = m.reply ? summariseTrace(traceFile, m.reply.t, m.end) : null;
        rows.push({ variant: name, run: i, clean, e2eMs: Math.round(m.e2e), workerMs: m.post && m.reply ? Math.round(m.reply.t - m.post.t1) : null, postMs: post && Math.round(post), before, after, postTrace: tr });
        console.log(JSON.stringify(rows[rows.length - 1]));
        if (tr) {
            tr.busyThreads = busyThreads(traceFile, m.reply.t, m.end);
            if (!process.env.KEEP_TRACE) fs.unlinkSync(traceFile); // keep only the summary (traces are large)
        }
    }
    await context.close();
    return rows;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const all = [];
    for (const [name, capture] of [["capture", true], ["nocapture", false]].filter(([n]) => !process.env.VARIANTS || process.env.VARIANTS.split(",").includes(n))) all.push(...(await variant(browser, name, capture)));
    await browser.close();
    fs.writeFileSync(path.join(OUT, "spike-post.json"), JSON.stringify(all, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
