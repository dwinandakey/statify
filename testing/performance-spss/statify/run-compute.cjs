// Statify compute-only timing (../README.md, measurement 4, phase 2). Drives
// harness/page.tsx (route /glm-perf-harness of the phase-2 worktree build).
// Per cell (procedure × n): one fresh browser context (fresh worker, so run 1
// includes WASM init and is the warm-up), the payload recorded from the real
// UI in phase 1 is loaded (not timed), then RUNS posts to the timing probe
// worker, 1 s apart.
//
// Times per run:
//   in_worker_ms  production worker handler: WASM analysis + result object
//                 (the compute-only figure compared with SPSS Elapsed Time)
//   post_ms       postMessage on the main thread (payload serialisation)
//   roundtrip_ms  postMessage → reply received (incl. both transfers)
//
// Usage (repo root, worktree server running):
//   node testing/performance-spss/statify/run-compute.cjs --base=http://localhost:3101 \
//        --payload=<phase-1 e2e dir>/payload --procs=mv1,mv2,rm --sizes=100 --runs=11 --out=<dir>
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { chromium } = require("@playwright/test");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const PROCS = (args.procs || "mv1,mv2,rm").split(",");
const SIZES = (args.sizes || "100").split(",").map(Number);
const RUNS = Number(args.runs || 11);
const PAYLOAD = path.resolve(args.payload);
const OUT = path.resolve(args.out || path.join(__dirname, "latest-compute"));
const PROFILE = (args.profile || "").split(",").filter(Boolean);
const ROOT = path.resolve(__dirname, "..");
const MODULE = { mv1: "multivariate", mv2: "multivariate", rm: "repeated-measures" };

const CSV_HEADER = ["proc", "n", "cell", "run", "phase", "valid", "status", "in_worker_ms", "post_ms", "roundtrip_ms", "results_sha1", "results_sorted_sha1", "timestamp"];
const csvPath = path.join(OUT, "runs.csv");
const logPath = path.join(OUT, "log.txt");
const fmt = (x) => (x == null ? "" : Number(x).toFixed(2));
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
// Hash of the results with object keys sorted: the Multivariate results come
// from Rust HashMaps whose iteration order changes from run to run inside one
// WASM instance (pilot 2026-10-16), so the plain hash differs although the values do not.
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
const log = (...m) => {
    const line = `[${new Date().toISOString()}] ${m.join(" ")}`;
    console.log(line);
    fs.appendFileSync(logPath, line + "\n");
};

// --affinity=<hex>: set on the whole tree (Chromium's GPU process does not
// inherit it), as in run-e2e.cjs.
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

async function runCell(browser, proc, n) {
    const cell = `${proc}-n${n}`;
    const file = path.join(PAYLOAD, `${cell}.json`);
    if (!fs.existsSync(file)) throw new Error(`missing payload ${file}`);
    const context = await browser.newContext();
    await context.route("**/__perf/payload/**", (route) => route.fulfill({ path: file, contentType: "application/json" }));
    const page = await context.newPage();
    await page.goto(`${BASE}/glm-perf-harness`, { timeout: 300000 });
    await page.locator('#harness[data-ready="1"]').waitFor({ timeout: 300000 });
    const loaded = await page.evaluate((c) => window.__perfHarness.load(c), cell);
    log(`cell ${cell}: payload loaded (${(loaded.chars / 1e6).toFixed(1)} MB)`);
    const affinityLog = (when, enforce) => fs.appendFileSync(path.join(OUT, "affinity.jsonl"), JSON.stringify({ cell, when, at: new Date().toISOString(), processes: affinitySnapshot(enforce) }) + "\n");
    affinityLog("before-enforce", false);
    affinityLog("after-enforce", true);
    for (let i = 1; i <= RUNS; i++) {
        const phase = i === 1 ? "warmup" : "measured";
        const row = { proc, n, cell, run: i, phase, timestamp: new Date().toISOString() };
        try {
            await page.waitForTimeout(1000);
            const r = await page.evaluate(([m, c, keep]) => window.__perfHarness.run(m, c, keep), [MODULE[proc], cell, true]);
            Object.assign(row, { in_worker_ms: fmt(r.inWorkerMs), post_ms: fmt(r.postMs), roundtrip_ms: fmt(r.roundTripMs), results_sha1: r.results ? sha1(r.results) : "", results_sorted_sha1: r.results ? sha1(JSON.stringify(canonical(JSON.parse(r.results)))) : "" });
            row.valid = r.ok && r.inWorkerMs != null ? 1 : 0;
            row.status = r.ok ? "ok" : `error:${String(r.error).slice(0, 150)}`;
            if (i === 2 && r.results) fs.writeFileSync(path.join(OUT, "results", `${cell}.json`), JSON.stringify({ cell, results: JSON.parse(r.results) }, null, 1));
        } catch (err) {
            Object.assign(row, { valid: 0, status: `error:${String(err.message || err).split("\n")[0].slice(0, 150)}` });
        }
        fs.appendFileSync(csvPath, CSV_HEADER.map((h) => String(row[h] ?? "").replace(/,/g, ";")).join(",") + "\n");
        log(`${cell} run ${i}/${RUNS} ${phase} status=${row.status} in-worker=${row.in_worker_ms ?? "-"} post=${row.post_ms ?? "-"} roundtrip=${row.roundtrip_ms ?? "-"}`);
    }
    // --profile=<cell,...>: one EXTRA run after the timed ones (not in runs.csv)
    // under a Chromium trace with the V8 CPU profiler, which records the
    // worker thread too; the file opens in DevTools > Performance and is
    // summarised by profile-summary.py.
    if (PROFILE.includes(cell)) {
        fs.mkdirSync(path.join(OUT, "profiles"), { recursive: true });
        const file = path.join(OUT, "profiles", `${cell}.json`);
        await page.waitForTimeout(1000);
        await browser.startTracing(page, {
            path: file, screenshots: false,
            categories: ["-*", "devtools.timeline", "v8.execute", "disabled-by-default-devtools.timeline", "toplevel",
                "blink.user_timing", "disabled-by-default-v8.cpu_profiler", "disabled-by-default-v8.cpu_profiler.hires", "__metadata"],
        });
        const r = await page.evaluate(([m, c]) => window.__perfHarness.run(m, c, false), [MODULE[proc], cell]);
        await browser.stopTracing();
        log(`cell ${cell}: profile run (not timed) in-worker=${fmt(r.inWorkerMs)} ok=${r.ok} -> ${path.relative(OUT, file)}`);
    }
    affinityLog("end-of-cell", false);
    await context.close();
}

async function main() {
    for (const d of ["", "results"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
    if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, CSV_HEADER.join(",") + "\n");
    const browser = await chromium.launch();
    fs.writeFileSync(path.join(OUT, `environment-${Date.now()}.json`), JSON.stringify({
        startedAt: new Date().toISOString(), cpu: os.cpus()[0]?.model, logicalCores: os.cpus().length,
        totalMemGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10, freeMemGB: Math.round((os.freemem() / 1024 ** 3) * 10) / 10,
        node: process.version, playwright: require("@playwright/test/package.json").version, chromium: browser.version(),
        config: { BASE, PROCS, SIZES, RUNS, PAYLOAD, AFFINITY },
    }, null, 2));
    log(`start: chromium ${browser.version()}; procs=${PROCS} sizes=${SIZES} runs=${RUNS}`);
    for (const n of SIZES) for (const proc of PROCS) {
        const t = Date.now();
        await runCell(browser, proc, n);
        log(`cell ${proc}-n${n} done in ${Math.round((Date.now() - t) / 1000)} s`);
    }
    await browser.close();
    log("finished");
}

main().catch((e) => { log("COMPUTE FAILED:", e.stack || e); process.exit(1); });
