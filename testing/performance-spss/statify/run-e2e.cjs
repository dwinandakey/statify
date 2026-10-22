// Statify end-to-end timing (../README.md, measurement 3): drives the REAL UI
// of a production build with Playwright Chromium. Per cell (procedure × n):
// one fresh browser context, CSV import (File > Import > CSV, not timed),
// then RUNS analyses (run 1 = warm-up) with the data kept loaded.
//
// Per run: all stored results are cleared (clean protocol of
// ../../glm-web-worker/experiment/run-experiment.cjs, outside the window), the
// dialog is configured, OK is clicked, and the time is
//   performance.measure(glm-analysis-start → glm-analysis-end)
// (marks of shared/glm-execution.ts). detail.mode must be "worker".
//
// A Worker tap (init script, test side only; the app is unchanged) also
// records when the GLM request is posted to the worker and when the reply
// arrives, which splits the window into
//   prep      start mark → postMessage      (data slicing, payload)
//   serialize postMessage itself             (structured clone of the payload)
//   worker    after postMessage → reply      (worker: deserialise, WASM, reply)
//   post      reply → end mark               (formatting, result store)
// In the warm-up run the posted payload is saved (payload/<cell>.json) for the
// compute-only measurement (phase 2, harness/).
//
// Usage (repo root, production server running):
//   node testing/performance-spss/statify/run-e2e.cjs --base=http://localhost:3101 \
//        --procs=mv1,mv2,rm --sizes=100 --runs=11 --out=<dir> [--capture=true]
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, execSync } = require("child_process");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
// Repeated Measures dialog of run-experiment.cjs: time(4), measure "score",
// t1..t4, between factor "group", Options = the SPSS /PRINT keywords.
// Set before require(): run-experiment.cjs reads them at load time.
const OPTIONS = ["DescStats", "EstEffectSize", "ObsPower", "HomogenTest"];
Object.assign(process.env, { RM_LEVELS: "4", RM_MEASURES: "1", RM_BETWEEN: "true", RM_OPTIONS: OPTIONS.join(",") });
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");
const { chromium } = require("@playwright/test");

const BASE = args.base || "http://localhost:3101";
const PROCS = (args.procs || "mv1,mv2,rm").split(",");
const SIZES = (args.sizes || "100").split(",").map(Number);
const RUNS = Number(args.runs || 11);
const OUT = path.resolve(args.out || path.join(__dirname, "latest"));
const CAPTURE = args.capture !== "false";
const HEADLESS = args.headless !== "false";
const RUN_TIMEOUT_MS = Number(args.timeoutMs || 30 * 60 * 1000);
const SETTLE_MS = 1000;
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");
// --data=<dir>: e.g. data/kode (factor levels as numeric codes, see data/generate.cjs).
const DATA = path.resolve(args.data || path.join(ROOT, "data"));

const PROC = {
    mv1: { module: "multivariate", dep: ["Y1", "Y2", "Y3", "Y4"], fix: ["A"] },
    mv2: { module: "multivariate", dep: ["Y1", "Y2", "Y3", "Y4"], fix: ["A", "B"] },
    rm: { module: "repeated-measures" },
};

// ───────────── page probe: Worker tap (installed before any app script) ─────────────
const PERF_TAP = () => {
    const perf = (window.__perf = { events: [], capture: false, captured: null, lastResponse: null });
    const Native = window.Worker;
    window.Worker = class extends Native {
        constructor(url, opts) {
            super(url, opts);
            const src = String(url);
            const post = this.postMessage.bind(this);
            this.postMessage = (msg, ...rest) => {
                const isRequest = msg && typeof msg === "object" && "id" in msg && "payload" in msg;
                const t0 = performance.now();
                const r = post(msg, ...rest);
                const t1 = performance.now();
                if (isRequest) {
                    perf.events.push({ type: "post", id: msg.id, src, t0, t1 });
                    if (perf.capture) perf.captured = msg;
                }
                return r;
            };
            this.addEventListener("message", (e) => {
                const d = e.data;
                if (d && typeof d === "object" && "id" in d && "ok" in d) {
                    perf.events.push({ type: "reply", id: d.id, src, t: performance.now(), ok: d.ok });
                    perf.lastResponse = d;
                }
            });
        }
    };
};

// Window [last glm-analysis-start, last glm-analysis-end] and the worker
// request/reply inside it. Returns null until a new end mark exists.
const COLLECT = (prevEnds) => {
    const ends = performance.getEntriesByName("glm-analysis-end", "mark");
    if (ends.length <= prevEnds) return null;
    const starts = performance.getEntriesByName("glm-analysis-start", "mark");
    const end = ends[ends.length - 1];
    const start = starts[starts.length - 1];
    const m = performance.measure(`glm-run-${ends.length}`, { start: start.startTime, end: end.startTime });
    const ev = window.__perf.events.filter((e) => (e.t0 ?? e.t) >= start.startTime && (e.t0 ?? e.t) <= end.startTime);
    const posts = ev.filter((e) => e.type === "post");
    const post = posts[posts.length - 1] || null;
    const reply = post ? ev.find((e) => e.type === "reply" && e.id === post.id && e.src === post.src) || null : null;
    return {
        e2e: m.duration, start: start.startTime, end: end.startTime, detail: end.detail,
        nStarts: starts.length, nEnds: ends.length, nPosts: posts.length,
        post, reply, workerSrc: post?.src ?? null,
    };
};

// ───────────── helpers ─────────────
const CSV_HEADER = [
    "proc", "n", "cell", "run", "phase", "mode", "valid", "status",
    "e2e_ms", "prep_ms", "serialize_ms", "worker_ms", "post_ms",
    "data_rows", "output_tables", "logged_errors", "results_sha1", "results_sorted_sha1", "clean_method", "timestamp",
];
const fmt = (x) => (x == null ? "" : Number(x).toFixed(2));
let csvPath, logPath;
const appendCsv = (row) => fs.appendFileSync(csvPath, CSV_HEADER.map((h) => String(row[h] ?? "").replace(/,/g, ";")).join(",") + "\n");
const log = (...m) => {
    const line = `[${new Date().toISOString()}] ${m.join(" ")}`;
    console.log(line);
    fs.appendFileSync(logPath, line + "\n");
};

// Processor affinity of every process under this node process (Chromium and
// its children), via common.ps1. With --affinity=<hex> it is set on the whole
// tree first: Chromium's GPU process does not inherit the affinity of its
// parent (pilot 2026-10-16: gpu-process 0xFFFFF under a 0xFFF tree).
const AFFINITY = args.affinity || "";
function affinitySnapshot(enforce) {
    try {
        const fn = enforce && AFFINITY ? `Set-TreeAffinity ${process.pid} ${AFFINITY}` : `Get-TreeAffinity ${process.pid}`;
        const ps = `. '${path.join(ROOT, "common.ps1")}'; ${fn} | ConvertTo-Json -Compress`;
        return JSON.parse(execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" }));
    } catch (e) {
        return { error: String(e.message || e).slice(0, 200) };
    }
}

function environment(browserVersion) {
    const sh = (cmd) => { try { return execSync(cmd, { cwd: REPO, encoding: "utf8" }).trim(); } catch { return null; } };
    return {
        startedAt: new Date().toISOString(),
        os: `${os.type()} ${os.release()} (${os.platform()} ${os.arch()})`,
        osVersion: typeof os.version === "function" ? os.version() : null,
        cpu: os.cpus()[0]?.model, logicalCores: os.cpus().length,
        totalMemGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
        freeMemGB: Math.round((os.freemem() / 1024 ** 3) * 10) / 10,
        node: process.version,
        playwright: require("@playwright/test/package.json").version,
        chromium: browserVersion,
        next: require(path.join(REPO, "node_modules/next/package.json")).version,
        gitHead: sh("git rev-parse HEAD"),
        buildId: (() => { try { return fs.readFileSync(path.join(REPO, "frontend/.next/BUILD_ID"), "utf8").trim(); } catch { return null; } })(),
        config: { BASE, PROCS, SIZES, RUNS, CAPTURE, HEADLESS, OPTIONS, DATA, AFFINITY },
    };
}

// File > Import > CSV, as run-experiment.cjs importCsv, with a longer timeout
// for 100 000 rows; then waits until all rows are stored in IndexedDB.
async function importCsv(page, file, n) {
    await page.locator('[data-testid="file-menu-trigger"]').click();
    await page.locator('[data-testid="file-menu-import-trigger"]').click();
    await page.locator('[data-testid="file-menu-import-csv"]').click();
    await page.locator("#csv-file-input-content").setInputFiles(file);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.locator('[data-testid="import-csv-modal"]').waitFor({ state: "detached", timeout: 30 * 60 * 1000 });
    await page.waitForFunction(async (expected) => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return (await req(db.transaction("dataRows", "readonly").objectStore("dataRows").count())) === expected; } finally { db.close(); }
    }, n, { timeout: 30 * 60 * 1000, polling: 1000 });
}

async function openAnalyzeItem(page, item) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: item, exact: true }).click();
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const mvAvailable = (page, name) =>
    page.locator('[data-testid^="variable-item-available-"]', {
        has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }),
    }).first();

// Multivariate: DVs → Dependent Variables (double-click), factors → Fixed
// Factor(s) (drag), Options = OPTIONS. Model (full factorial, Type III) and
// everything else stay at the dialog defaults. Idempotent: the dialog
// restores the previous selection from IndexedDB.
async function openMultivariate(page, cfg, first) {
    await openAnalyzeItem(page, "Multivariate");
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const countIn = (list) => page.locator(`[data-testid^="variable-name-${list}-"]`).count();
    if (!first) {
        await page.waitForFunction((n) => document.querySelectorAll('[data-testid^="variable-name-DepVar-"]').length >= n, cfg.dep.length, { timeout: 30000 }).catch(() => {});
    }
    for (const v of cfg.dep) if (await mvAvailable(page, v).count()) await mvAvailable(page, v).dblclick();
    for (const v of cfg.fix) {
        if (await mvAvailable(page, v).count()) await mvAvailable(page, v).dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
    }
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator(`#${OPTIONS[0]}`).waitFor({ state: "visible", timeout: 30000 });
    for (const id of OPTIONS) {
        const box = page.locator(`#${id}`);
        if ((await box.getAttribute("data-state")) !== "checked") await box.click();
        if ((await box.getAttribute("data-state")) !== "checked") throw new Error(`Options: ${id} not checked`);
    }
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const dep = await countIn("DepVar");
    const fix = await countIn("FixFactor");
    if (dep !== cfg.dep.length || fix !== cfg.fix.length) throw new Error(`Multivariate dialog has ${dep} DV / ${fix} factors (expected ${cfg.dep.length} / ${cfg.fix.length})`);
    return () => page.locator("#multivariate-ok-button").click({ timeout: RUN_TIMEOUT_MS });
}

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
// Hash of the results with object keys sorted: the Multivariate results come
// from Rust HashMaps whose iteration order changes from run to run inside one
// WASM instance (pilot 2026-10-16), so the plain hash differs although the values do not.
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;

async function runCell(browser, proc, n) {
    const cell = `${proc}-n${n}`;
    const cfg = PROC[proc];
    const csv = path.join(DATA, `${cell}.csv`);
    if (!fs.existsSync(csv)) throw new Error(`missing ${csv} (run data/generate.cjs)`);
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(PERF_TAP);
    const page = await context.newPage();
    const pageLog = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") pageLog.push(`[${m.type()}] ${m.text()}`.slice(0, 400)); });
    page.on("pageerror", (e) => pageLog.push(`[pageerror] ${e.message}`.slice(0, 400)));

    log(`cell ${cell}: import ${path.basename(csv)}`);
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ state: "visible", timeout: 300000 });
    const tImport = Date.now();
    await importCsv(page, csv, n);
    const importMs = Date.now() - tImport;
    log(`cell ${cell}: imported ${n} rows in ${importMs} ms (not timed)`);
    const affinityLog = (when, enforce) => fs.appendFileSync(path.join(OUT, "affinity.jsonl"), JSON.stringify({ cell, when, at: new Date().toISOString(), processes: affinitySnapshot(enforce) }) + "\n");
    affinityLog("before-enforce", false);
    affinityLog("after-enforce", true);

    let configured = false;
    for (let i = 1; i <= RUNS; i++) {
        const phase = i === 1 ? "warmup" : "measured";
        const row = { proc, n, cell, run: i, phase, timestamp: new Date().toISOString() };
        try {
            row.clean_method = await runner.clearResults(page);
            await page.evaluate(() => localStorage.setItem("glm-execution-mode", "worker"));
            const clickOk = cfg.module === "multivariate" ? await openMultivariate(page, cfg, !configured) : await runner.openRepeatedMeasures(page, !configured);
            configured = true;
            await page.waitForTimeout(SETTLE_MS);
            const pre = await runner.countStored(page);
            if (pre.logs + pre.analytics + pre.statistics + pre.domLogs !== 0) throw new Error(`clean protocol: ${JSON.stringify(pre)} stored before OK`);
            const capture = CAPTURE && i === 1;
            const prevEnds = await page.evaluate((cap) => {
                window.__perf.events = []; window.__perf.capture = cap; window.__perf.captured = null; window.__perf.lastResponse = null;
                return performance.getEntriesByName("glm-analysis-end", "mark").length;
            }, capture);
            await clickOk();
            await page.waitForFunction((k) => performance.getEntriesByName("glm-analysis-end", "mark").length > k, prevEnds, { timeout: RUN_TIMEOUT_MS, polling: 100 });
            await page.waitForTimeout(300);
            const m = await page.evaluate(COLLECT, prevEnds);
            if (!m) throw new Error("no end mark");
            const mode = m.detail?.mode ?? null;
            Object.assign(row, {
                mode,
                e2e_ms: fmt(m.e2e),
                prep_ms: m.post ? fmt(m.post.t0 - m.start) : "",
                serialize_ms: m.post ? fmt(m.post.t1 - m.post.t0) : "",
                worker_ms: m.post && m.reply ? fmt(m.reply.t - m.post.t1) : "",
                post_ms: m.reply ? fmt(m.end - m.reply.t) : "",
            });
            // Outside the window: output checks, raw WASM results, payload.
            const out = await runner.readOutputSummary(page);
            const resultsJson = await page.evaluate(() => (window.__perf.lastResponse?.ok ? JSON.stringify(window.__perf.lastResponse.results) : null));
            Object.assign(row, { data_rows: out.dataRows, output_tables: out.statCount, logged_errors: out.loggedErrors.length, results_sha1: resultsJson ? sha1(resultsJson) : "", results_sorted_sha1: resultsJson ? sha1(JSON.stringify(canonical(JSON.parse(resultsJson)))) : "" });
            const problems = [];
            if (mode !== "worker") problems.push(`mode=${mode}`);
            if (m.detail?.module !== cfg.module) problems.push(`module=${m.detail?.module}`);
            if (out.dataRows !== n) problems.push(`rows=${out.dataRows}`);
            if (out.loggedErrors.length) problems.push(`errors=${out.loggedErrors.join("|").slice(0, 120)}`);
            if (!resultsJson) problems.push("no worker results");
            if (!m.post || !m.reply || m.nPosts !== 1) problems.push(`posts=${m.nPosts}`);
            row.valid = problems.length ? 0 : 1;
            row.status = problems.length ? problems.join(" ") : "ok";
            if (i === 2 && resultsJson) {
                fs.writeFileSync(path.join(OUT, "results", `${cell}.json`), JSON.stringify({ cell, titles: out.titles, results: JSON.parse(resultsJson) }, null, 1));
            }
            if (capture) {
                const payloadJson = await page.evaluate(() => {
                    const c = window.__perf.captured; window.__perf.captured = null; window.__perf.capture = false;
                    return c ? JSON.stringify({ workerSrc: null, payload: c.payload }) : null;
                });
                if (payloadJson) {
                    fs.writeFileSync(path.join(OUT, "payload", `${cell}.json`), payloadJson);
                    log(`cell ${cell}: payload saved (${(payloadJson.length / 1e6).toFixed(1)} MB, sha1 ${sha1(payloadJson).slice(0, 12)}), worker ${m.workerSrc}`);
                }
            }
            fs.appendFileSync(path.join(OUT, "runs-raw.jsonl"), JSON.stringify({ ...row, detail: m.detail, post: m.post, reply: m.reply, start: m.start, end: m.end, workerSrc: m.workerSrc, titles: out.titles, importMs }) + "\n");
            if (cfg.module === "repeated-measures") await page.getByRole("button", { name: "OK", exact: true }).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
        } catch (err) {
            Object.assign(row, { valid: 0, status: `error:${String(err.message || err).split("\n")[0].slice(0, 150)}` });
            await page.screenshot({ path: path.join(OUT, `error-${cell}-run${i}.png`) }).catch(() => {});
            await page.keyboard.press("Escape").catch(() => {});
        }
        appendCsv(row);
        log(`${cell} run ${i}/${RUNS} ${phase} mode=${row.mode ?? "-"} status=${row.status} e2e=${row.e2e_ms ?? "-"} (prep ${row.prep_ms ?? "-"} ser ${row.serialize_ms ?? "-"} worker ${row.worker_ms ?? "-"} post ${row.post_ms ?? "-"})`);
    }
    affinityLog("end-of-cell", false);
    fs.writeFileSync(path.join(OUT, `pagelog-${cell}.txt`), pageLog.join("\n"));
    await context.close();
}

async function main() {
    for (const d of ["", "results", "payload"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
    csvPath = path.join(OUT, "runs.csv");
    logPath = path.join(OUT, "log.txt");
    if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, CSV_HEADER.join(",") + "\n");
    const browser = await chromium.launch({ headless: HEADLESS });
    const env = environment(browser.version());
    fs.writeFileSync(path.join(OUT, `environment-${Date.now()}.json`), JSON.stringify(env, null, 2));
    log(`start: chromium ${env.chromium}, node ${env.node}, playwright ${env.playwright}; procs=${PROCS} sizes=${SIZES} runs=${RUNS}`);
    for (const n of SIZES) for (const proc of PROCS) {
        const t = Date.now();
        await runCell(browser, proc, n);
        log(`cell ${proc}-n${n} done in ${Math.round((Date.now() - t) / 1000)} s`);
    }
    await browser.close();
    log("finished");
}

module.exports = { PERF_TAP, COLLECT, importCsv, openMultivariate, PROC, runner };

if (require.main === module) {
    main().catch((e) => { log("E2E FAILED:", e.stack || e); process.exit(1); });
}
