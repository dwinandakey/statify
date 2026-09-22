// A/B responsiveness experiment for GLM Multivariate and Repeated Measures
// (compare_web_workers.md §4). Drives the REAL application UI of a production
// build: CSV import → GLM dialog → click OK.
//
// Per cell (module × size × CPU): one fresh browser context and page, then runs
// alternating A (main thread), B (Web Worker), A, B, ... until each mode has
// `--runs` runs. Pair 1 = startup, the rest = steady-state.
//
// Measurement window per run: from the OK click (captured in the page, capture
// phase) to performance.mark("glm-analysis-end").
//
// Usage (from repo root, server already running):
//   node testing/glm-web-worker/experiment/run-experiment.cjs --base=http://localhost:3101 \
//        --modules=multivariate,repeated-measures --sizes=100,500,1000,2000 --cpu=1 --runs=31 \
//        --out=testing/glm-web-worker/results/<folder>
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const { chromium } = require("@playwright/test"); // hoisted to the repo-root node_modules
const crypto = require("crypto");
const { writeDataset, repeatedMeasuresColumns } = require("./datasets.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const MODULES = (args.modules || "multivariate,repeated-measures").split(",");
const SIZES = (args.sizes || "100,500,1000,2000").split(",").map(Number);
const CPUS = (args.cpu || "1").split(",").map(Number);
const RUNS = Number(args.runs || 31); // per mode
const OUT = path.resolve(args.out || path.join(__dirname, "..", "results", "experiment-latest"));
const RUN_TIMEOUT_MS = Number(args.timeoutMs || 30 * 60 * 1000);
const SETTLE_MS = Number(args.settleMs || 1000);
const HEADLESS = args.headless !== "false";

// Options added for the second (clean-protocol) experiment. Every default
// reproduces the first experiment. Each can also come from the environment
// (e.g. RM_LEVELS) so helper scripts that require() this module can use them.
const setting = (name, fallback) => args[name] ?? process.env[name.toUpperCase().replace(/-/g, "_")] ?? fallback;
const CLEAN = setting("clean", "false") === "true"; // clear all stored results before every run
const LOAF = setting("loaf", "false") === "true"; // also observe long-animation-frame entries
const RM_LEVELS = Number(setting("rm-levels", 5));
const RM_MEASURES = Number(setting("rm-measures", 1));
const RM_OPTIONS = String(setting("rm-options", "")).split(",").filter(Boolean); // checkbox ids in the Options dialog
const sizesFor = (module) => (args[`sizes-${module}`] ? args[`sizes-${module}`].split(",").map(Number) : SIZES);

const REPO = path.resolve(__dirname, "../../..");
const DATA_DIR = path.join(OUT, "data");

// ───────────── page probes (installed before any app script) ─────────────
// - Long tasks of the page's main thread (workers are never reported).
// - requestAnimationFrame timestamps.
// - t0 = performance.now() in the capture phase of the first click after the
//   runner "arms" the probe (the runner's own OK click).
// - With loaf = true: long-animation-frame entries with their script attribution.
function buildProbe(loaf) {
    return `(() => {
  const exp = (window.__glmExp = { longtasks: [], frames: [], loafs: [], armed: false, t0: null });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) exp.longtasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: "longtask", buffered: true });
    exp.longtaskSupported = true;
  } catch (e) { exp.longtaskSupported = false; }
  ${loaf ? `try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) exp.loafs.push({
        start: e.startTime, duration: e.duration, blockingDuration: e.blockingDuration,
        renderStart: e.renderStart, styleAndLayoutStart: e.styleAndLayoutStart,
        scripts: (e.scripts || []).map((s) => ({
          invoker: s.invoker, invokerType: s.invokerType, sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName, sourceCharPosition: s.sourceCharPosition,
          startTime: s.startTime, executionStart: s.executionStart, duration: s.duration,
          forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration, pauseDuration: s.pauseDuration,
        })),
      });
    }).observe({ type: "long-animation-frame", buffered: true });
    exp.loafSupported = true;
  } catch (e) { exp.loafSupported = false; }` : ""}
  const loop = (ts) => { exp.frames.push(ts); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  document.addEventListener("click", () => {
    if (exp.armed) { exp.t0 = performance.now(); exp.armed = false; }
  }, true);
})();`;
}
const PROBE = buildProbe(false);

// ───────────── helpers ─────────────
const CSV_HEADER = [
    "module", "size", "cpu", "run_index", "pair_index", "phase", "mode_intended", "mode_actual",
    "valid", "status", "longest_longtask_ms", "total_blocking_ms", "longtask_count",
    "max_frame_gap_ms", "frames_in_window", "total_time_ms", "t0_ms", "t_end_ms",
    "data_rows", "output_tables", "logged_errors", "timestamp",
    // Clean protocol: stored results counted right before the OK click, and the
    // result logs rendered on the Result page before and after the run.
    // clean_method: none (nothing stored) | button | renav+button (see clearResults).
    ...(CLEAN ? ["clean_method", "pre_logs", "pre_analytics", "pre_statistics", "pre_dom_logs", "post_logs", "post_dom_logs"] : []),
    // Long animation frames overlapping the window; *_scripts = attributed
    // scripts from the module's WASM glue chunk / GLM service chunk.
    ...(LOAF ? ["longest_loaf_ms", "loaf_count", "loaf_blocking_ms", "loaf_glue_scripts", "loaf_service_scripts"] : []),
];
const csvPath = path.join(OUT, "runs.csv");
const appendCsv = (row) => fs.appendFileSync(csvPath, CSV_HEADER.map((h) => row[h] ?? "").join(",") + "\n");
const rawPath = path.join(OUT, "runs-raw.jsonl");
const logPath = path.join(OUT, "log.txt");
const log = (...m) => {
    const line = `[${new Date().toISOString()}] ${m.join(" ")}`;
    console.log(line);
    fs.appendFileSync(logPath, line + "\n");
};

function environment(browserVersion) {
    const sh = (cmd) => { try { return execSync(cmd, { cwd: REPO, encoding: "utf8" }).trim(); } catch { return null; } };
    const md5 = (rel) => sh(`git hash-object "${rel}"`);
    const svc = "frontend/components/Modals/Analyze/general-linear-model";
    return {
        startedAt: new Date().toISOString(),
        os: `${os.type()} ${os.release()} (${os.platform()} ${os.arch()})`,
        osVersion: typeof os.version === "function" ? os.version() : null,
        cpu: os.cpus()[0]?.model, logicalCores: os.cpus().length,
        totalMemGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
        node: process.version,
        playwright: require("@playwright/test/package.json").version,
        chromium: browserVersion,
        next: require(path.join(REPO, "node_modules/next/package.json")).version,
        gitHead: sh("git rev-parse HEAD"),
        gitDirtyFiles: sh("git status --short")?.split("\n").length ?? null,
        // Content hashes of the code under test (uncommitted changes included).
        codeHashes: Object.fromEntries([
            `${svc}/shared/glm-execution.ts`,
            `${svc}/multivariate/services/multivariate-analysis.ts`,
            `${svc}/multivariate/services/multivariate-analysis-worker.ts`,
            `${svc}/repeated-measures/services/repeated-measures-analysis.ts`,
            `${svc}/repeated-measures/services/repeated-measures-analysis-worker.ts`,
        ].map((f) => [f, md5(f)])),
        config: { BASE, MODULES, SIZES, CPUS, RUNS, RUN_TIMEOUT_MS, SETTLE_MS, HEADLESS },
        ...(CLEAN || LOAF || RM_LEVELS !== 5 || RM_MEASURES !== 1 || RM_OPTIONS.length ? {
            config2: {
                CLEAN, LOAF, RM_LEVELS, RM_MEASURES, RM_OPTIONS, RM_BETWEEN,
                sizesPerModule: Object.fromEntries(MODULES.map((m) => [m, sizesFor(m)])),
            },
            buildId: (() => { try { return fs.readFileSync(path.join(REPO, "frontend/.next/BUILD_ID"), "utf8").trim(); } catch { return null; } })(),
            chunks: chunkMap(),
        } : {}),
    };
}

// Which production chunks hold the GLM WASM glue, the GLM services and a few
// big UI libraries, so long-animation-frame script URLs can be attributed.
// The glue chunk of a module is the one that references that module's .wasm
// file (matched by content with rust/pkg/wasm_bg.wasm).
function chunkMap() {
    const next = path.join(REPO, "frontend/.next/static");
    const hash = (file) => crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");
    const svc = path.join(REPO, "frontend/components/Modals/Analyze/general-linear-model");
    const pkgHash = { multivariate: hash(path.join(svc, "multivariate/rust/pkg/wasm_bg.wasm")), "repeated-measures": hash(path.join(svc, "repeated-measures/rust/pkg/wasm_bg.wasm")) };
    const mediaModule = {};
    for (const f of fs.readdirSync(path.join(next, "media")).filter((f) => f.endsWith(".wasm"))) {
        const h = hash(path.join(next, "media", f));
        mediaModule[f] = Object.keys(pkgHash).find((m) => pkgHash[m] === h) || "other";
    }
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const tags = {};
    for (const file of walk(path.join(next, "chunks")).filter((f) => f.endsWith(".js"))) {
        const rel = path.relative(next, file).split(path.sep).join("/");
        const text = fs.readFileSync(file, "utf8");
        const t = [];
        if (/__wbindgen|__wbg_/.test(text)) {
            const wasm = [...new Set(text.match(/[\w-]+\.[0-9a-f]{8}\.wasm/g) || [])];
            t.push(...wasm.map((w) => `wasm-glue:${mediaModule[w] || "other"}`));
        }
        // GlmWorkerClient("<module>", () => new Worker(...)) in the service chunk.
        const service = text.includes("glm-analysis-start") && text.match(/\("(multivariate|repeated-measures)",\(\)=>new Worker/);
        if (service) t.push(`glm-service:${service[1]}`);
        if (/\.x=\(\)=>\{var e=\w\.O\(void 0,\[\d+\]/.test(text)) t.push("worker-entry");
        if (/handsontable/i.test(text)) t.push("handsontable");
        if (text.includes("MultivariateContainer") && text.includes("RepeatedMeasuresContainer")) t.push("modal-registry");
        if (text.includes("__reactContainer$") && !/^chunks\/framework-/.test(rel)) t.push("react-dom");
        if (/^chunks\/framework-/.test(rel)) t.push("react-framework");
        if (/^chunks\/(main-app|main|webpack)-/.test(rel)) t.push("next-runtime");
        if (/^chunks\/app\/dashboard\/result\//.test(rel)) t.push("result-page");
        if (t.length) tags[`/_next/static/${rel}`] = t;
    }
    return { mediaModule, tags };
}

async function importCsv(page, file) {
    await page.locator('[data-testid="file-menu-trigger"]').click();
    await page.locator('[data-testid="file-menu-import-trigger"]').click();
    await page.locator('[data-testid="file-menu-import-csv"]').click();
    await page.locator("#csv-file-input-content").setInputFiles(file);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.locator('[data-testid="import-csv-modal"]').waitFor({ state: "detached", timeout: 120000 });
}

async function openAnalyzeItem(page, item) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: item, exact: true }).click();
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
// The Multivariate list shows "name [label]" (e.g. "Y1 [Y1]").
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const mvAvailable = (page, name) =>
    page.locator('[data-testid^="variable-item-available-"]', {
        has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }),
    }).first();

// Multivariate: Y1..Y5 → Dependent (double-click, as the dialog's hint says),
// F1..F3 → Fixed Factor(s) (drag). All other options stay at the dialog defaults.
async function openMultivariate(page, first) {
    await openAnalyzeItem(page, "Multivariate");
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const countIn = (list) => page.locator(`[data-testid^="variable-name-${list}-"]`).count();
    if (!first) {
        // The dialog restores the saved selection from IndexedDB asynchronously
        // (slower under CPU throttling): give it time before filling anything in.
        await page.waitForFunction(() => document.querySelectorAll('[data-testid^="variable-name-DepVar-"]').length >= 5, null, { timeout: 30000 }).catch(() => {});
    }
    // Idempotent: move only what is still in the available list.
    for (const v of ["Y1", "Y2", "Y3", "Y4", "Y5"]) {
        if (await mvAvailable(page, v).count()) await mvAvailable(page, v).dblclick();
    }
    for (const v of ["F1", "F2", "F3"]) {
        if (await mvAvailable(page, v).count()) {
            await mvAvailable(page, v).dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        }
    }
    const dep = await countIn("DepVar");
    const fix = await countIn("FixFactor");
    if (dep !== 5 || fix !== 3) throw new Error(`Multivariate dialog has ${dep} DV / ${fix} factors (expected 5 / 3)`);
    // In mode A the main thread blocks right after the click, so Playwright gets the
    // input acknowledgement only after the analysis: the click needs the run timeout.
    return () => page.locator("#multivariate-ok-button").click({ timeout: RUN_TIMEOUT_MS });
}

// Repeated Measures: within factor "time" (5 levels), measure "score";
// t1..t5 → within-subject slots (group → between-subjects factor only when RM_BETWEEN=true).
// Within-only design by default: with the between factor "group" the analysis
// reported "Failed to calculate tests … Empty matrices" on every run and the
// between-subjects table changed after the first run (pilot, 2026-09-22).
// RM_BETWEEN=true (env) adds "group" as between-subjects factor.
const RM_BETWEEN = process.env.RM_BETWEEN === "true";
// Within factor "time" with RM_LEVELS levels and RM_MEASURES measures
// ("score", "score2", …); slot k shows "<column>_(<level>,<measure>)", the
// slots are grouped by measure, then level (datasets.cjs uses the same order).
const RM_MEASURE_NAMES = Array.from({ length: RM_MEASURES }, (_, m) => (m === 0 ? "score" : `score${m + 1}`));
const RM_SLOTS = repeatedMeasuresColumns(RM_LEVELS, RM_MEASURES).map((col, i) => ({
    col, text: `${col}_(${(i % RM_LEVELS) + 1},${RM_MEASURE_NAMES[Math.floor(i / RM_LEVELS)]})`,
}));
async function openRepeatedMeasures(page, first) {
    await openAnalyzeItem(page, "Repeated Measures");
    await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
    // Idempotent: the saved factor "time(L)" and the measures are restored
    // asynchronously (slower under CPU throttling); add them only if missing.
    const factorBadge = page.getByText(`time(${RM_LEVELS})`, { exact: true });
    if (!first) await factorBadge.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
    if (!(await factorBadge.count())) {
        await page.locator("#factorName").fill("time");
        await page.locator("#factorLevels").fill(String(RM_LEVELS));
        await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
    }
    for (const measure of RM_MEASURE_NAMES) {
        if (!(await page.getByText(measure, { exact: true }).count())) {
            await page.locator("#measureName").fill(measure);
            await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
        }
    }
    await page.getByRole("button", { name: "Define", exact: true }).click();
    const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
    const between = page.locator("div", { has: page.getByText("Between-Subjects Factor(s):", { exact: true }) }).last();
    await within.waitFor({ state: "visible", timeout: 60000 });
    // Options dialog (checkbox ids, e.g. DescStats): set before the slots, as
    // the main dialog remounts when a sub-dialog closes. Idempotent.
    if (RM_OPTIONS.length) {
        await page.getByRole("button", { name: "Options", exact: true }).click();
        await page.locator(`#${RM_OPTIONS[0]}`).waitFor({ state: "visible", timeout: 30000 });
        for (const id of RM_OPTIONS) {
            const box = page.locator(`#${id}`);
            if ((await box.getAttribute("data-state")) !== "checked") await box.click();
            if ((await box.getAttribute("data-state")) !== "checked") throw new Error(`Options: ${id} is not checked`);
        }
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await within.waitFor({ state: "visible", timeout: 60000 });
    }
    // Clicking "Define" turns the within-subject slots back into placeholders
    // ("?_(1,score)", …) on every opening, while "group" stays assigned. So the
    // slots are refilled before every run (outside the measurement window).
    // Only the dialog's variable badges are draggable (the grid header also shows "t1" etc.).
    const badge = (v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
    for (const slot of RM_SLOTS) {
        const placed = await within.getByText(slot.text, { exact: true }).count();
        if (!placed) await badge(slot.col).dragTo(within);
    }
    if (RM_BETWEEN && !(await between.getByText("group", { exact: true }).count())) await badge("group").dragTo(between);
    let filled = 0;
    for (const slot of RM_SLOTS) if (await within.getByText(slot.text, { exact: true }).count()) filled += 1;
    const grp = await between.getByText("group", { exact: true }).count();
    const expectedGroup = RM_BETWEEN ? 1 : 0;
    if (filled !== RM_SLOTS.length || grp !== expectedGroup) throw new Error(`Repeated Measures dialog has ${filled} within slots / ${grp} group (expected ${RM_SLOTS.length} / ${expectedGroup})`);
    return () => page.getByRole("button", { name: "OK", exact: true }).click({ timeout: RUN_TIMEOUT_MS });
}

// Clean protocol: delete every stored result with the Result page's own
// "clear all" button (useResultStore.clearAll(): logs, analytics, statistics),
// without a reload. The button exists only on the Result page, where the app
// navigates after every analysis (the first run has nothing stored yet). If
// results are stored, waits for the button, clicks it, confirms, and waits
// until nothing is stored or rendered any more. Then waits until the toasts are gone.
// The button is disabled when the page's result store is empty although
// IndexedDB holds a log: in Multivariate mode A the Result page's mount-time
// loadResults() can resolve after the new log was added and overwrite the
// store (pilot 2026-09-22). Then the Result page is mounted again through the
// footer tabs (Variable → Result, client-side, no reload) so that it loads
// the stored results, and the button is used. Returns the method used.
async function clearResults(page) {
    const stored = await countStored(page);
    let method = "none";
    if (stored.logs + stored.analytics + stored.statistics > 0) {
        const button = page.locator('[data-testid="clear-all-results-button"]');
        const enabled = (timeout) => page.waitForFunction(() => { const b = document.querySelector('[data-testid="clear-all-results-button"]'); return b && !b.disabled; }, null, { timeout }).then(() => true, () => false);
        method = "button";
        if (!(await enabled(5000))) {
            await page.locator('[data-testid="variable-tab"]').click();
            await page.waitForURL(/\/dashboard\/variable/, { timeout: 60000 });
            await page.locator('[data-testid="result-tab"]').click();
            await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
            if (!(await enabled(60000))) throw new Error(`clean protocol: clear-all button unavailable with ${JSON.stringify(stored)} stored`);
            method = "renav+button";
        }
        await button.click();
        await page.locator('[data-testid="clear-all-confirm"]').click();
        await page.locator('[data-testid="clear-all-results-dialog"]').waitFor({ state: "detached", timeout: 30000 });
        await page.waitForFunction(async () => {
            if (document.querySelectorAll('[data-testid^="result-log-"]').length) return false;
            const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
            const db = await req(indexedDB.open("Statify"));
            try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) === 0; } finally { db.close(); }
        }, null, { timeout: 30000, polling: 200 });
    }
    await page.waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0, null, { timeout: 20000, polling: 200 }).catch(() => {});
    return method;
}

// Stored results in IndexedDB "Statify" and result logs rendered in the page.
async function countStored(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try {
            const count = (name) => req(db.transaction(name, "readonly").objectStore(name).count());
            return {
                logs: await count("logs"), analytics: await count("analytics"), statistics: await count("statistics"),
                domLogs: document.querySelectorAll('[data-testid^="result-log-"]').length,
            };
        } finally {
            db.close();
        }
    });
}

// Output check (read after the metrics, outside the measurement window): what
// the last analysis wrote to the app's IndexedDB "Statify", so every run can be
// shown to have processed the whole dataset and not ended in an error.
async function readOutputSummary(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try {
            const store = (name) => db.transaction(name, "readonly").objectStore(name);
            const dataRows = await req(store("dataRows").count());
            const cursor = await req(store("logs").openCursor(null, "prev"));
            const last = cursor ? cursor.value : null;
            const analytics = last ? await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id))) : [];
            const statistics = [];
            for (const a of analytics) statistics.push(...(await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))));
            const text = statistics.map((s) => (typeof s.output_data === "string" ? s.output_data : JSON.stringify(s.output_data))).join("\n");
            const errStat = statistics.find((s) => s.title === "Errors Logs");
            let loggedErrors = [];
            try {
                const rows = JSON.parse(errStat.output_data).tables[0].rows || [];
                loggedErrors = rows.map((r) => r.message).filter((m) => m && m !== "No errors occurred.");
            } catch { loggedErrors = errStat ? ["(Errors Logs table unreadable)"] : []; }
            const errorLines = [...new Set((text.match(/[^"\\]{0,80}(error|Error|failed|Failed)[^"\\]{0,80}/g) || []).map((x) => x.trim()))].slice(0, 5);
            return {
                dataRows, logId: last?.id ?? null, log: last?.log ?? null,
                titles: statistics.map((s) => s.title), statCount: statistics.length,
                outputBytes: text.length, errorLines, loggedErrors,
            };
        } finally {
            db.close();
        }
    });
}

// Metrics for the window [t0, glm-analysis-end]. A long task counts when it
// overlaps the window; a frame gap counts when the frame interval overlaps it.
const COLLECT = (prevEnds) => {
    const exp = window.__glmExp;
    const ends = performance.getEntriesByName("glm-analysis-end", "mark");
    if (ends.length <= prevEnds) return null;
    const end = ends[ends.length - 1];
    const t0 = exp.t0, tEnd = end.startTime;
    const lts = exp.longtasks.filter((t) => t.start < tEnd && t.start + t.duration > t0);
    const frames = exp.frames.slice().sort((a, b) => a - b);
    let maxGap = 0, framesIn = 0;
    const windowFrames = [];
    for (let i = 0; i + 1 < frames.length; i++) {
        if (frames[i + 1] > t0 && frames[i] < tEnd) {
            maxGap = Math.max(maxGap, frames[i + 1] - frames[i]);
            windowFrames.push(frames[i]);
        }
        if (frames[i] >= t0 && frames[i] <= tEnd) framesIn++;
    }
    const lastFrame = frames[frames.length - 1];
    const loafs = (exp.loafs || []).filter((f) => f.start < tEnd && f.start + f.duration > t0);
    return {
        t0, tEnd, detail: end.detail, endCount: ends.length,
        longtasks: lts,
        longest: lts.reduce((m, t) => Math.max(m, t.duration), 0),
        tbt: lts.reduce((s, t) => s + Math.max(0, t.duration - 50), 0),
        maxGap, framesIn, windowFrames, frameAfterEnd: lastFrame > tEnd,
        longtaskSupported: exp.longtaskSupported,
        loafs, loafSupported: exp.loafSupported,
    };
};

// LoAF summary for one run; chunkTags from chunkMap() (URL path → tags).
function loafSummary(loafs, module, chunkTags) {
    const tagsOf = (url) => { try { return chunkTags[new URL(url).pathname] || []; } catch { return []; } };
    const scripts = loafs.flatMap((f) => f.scripts || []);
    return {
        longest_loaf_ms: loafs.reduce((m, f) => Math.max(m, f.duration), 0).toFixed(1),
        loaf_count: loafs.length,
        loaf_blocking_ms: loafs.reduce((s, f) => s + (f.blockingDuration || 0), 0).toFixed(1),
        loaf_glue_scripts: scripts.filter((s) => tagsOf(s.sourceURL).includes(`wasm-glue:${module}`)).length,
        loaf_service_scripts: scripts.filter((s) => tagsOf(s.sourceURL).includes(`glm-service:${module}`)).length,
    };
}

async function runCell(browser, module, size, cpu, chunkTags) {
    const cell = `${module}-${size}-cpu${cpu}`;
    const csvFile = writeDataset(module, size, DATA_DIR, { levels: RM_LEVELS, measures: RM_MEASURES });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript({ content: LOAF ? buildProbe(true) : PROBE });
    const page = await context.newPage();
    const pageLog = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") pageLog.push(`[${m.type()}] ${m.text()}`.slice(0, 400)); });
    page.on("pageerror", (e) => pageLog.push(`[pageerror] ${e.message}`.slice(0, 400)));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

    log(`cell ${cell}: loading ${path.basename(csvFile)}`);
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ state: "visible", timeout: 300000 });
    await importCsv(page, csvFile);

    const open = module === "multivariate" ? openMultivariate : openRepeatedMeasures;
    const total = RUNS * 2;
    let configured = false; // configure the dialog until it has worked once; later runs reuse the saved dialog state
    for (let i = 1; i <= total; i++) {
        const intended = i % 2 === 1 ? "main" : "worker"; // A, B, A, B, ...
        const pair = Math.ceil(i / 2);
        const phase = pair === 1 ? "startup" : "steady";
        const row = { module, size, cpu, run_index: i, pair_index: pair, phase, mode_intended: intended, timestamp: new Date().toISOString() };
        try {
            if (CLEAN) row.clean_method = await clearResults(page);
            await page.evaluate((m) => localStorage.setItem("glm-execution-mode", m), intended);
            const clickOk = await open(page, !configured);
            configured = true;
            await page.waitForTimeout(SETTLE_MS);
            if (CLEAN) {
                // Verified immediately before the OK click (outside the window).
                const pre = await countStored(page);
                Object.assign(row, { pre_logs: pre.logs, pre_analytics: pre.analytics, pre_statistics: pre.statistics, pre_dom_logs: pre.domLogs });
                if (pre.logs + pre.analytics + pre.statistics + pre.domLogs !== 0) throw new Error(`clean protocol: ${JSON.stringify(pre)} stored results before OK`);
            }
            const prevEnds = await page.evaluate(() => {
                const exp = window.__glmExp;
                exp.longtasks = []; exp.frames = []; exp.loafs = []; exp.t0 = null; exp.armed = true;
                return performance.getEntriesByName("glm-analysis-end", "mark").length;
            });
            await clickOk();
            await page.waitForFunction((n) => performance.getEntriesByName("glm-analysis-end", "mark").length > n, prevEnds, { timeout: RUN_TIMEOUT_MS, polling: 100 });
            await page.waitForTimeout(500); // let the long-task observer and one more frame arrive
            const m = await page.evaluate(COLLECT, prevEnds);
            if (!m || m.t0 == null) throw new Error("no t0 or no end mark");
            const actual = m.detail?.mode ?? null;
            Object.assign(row, {
                mode_actual: actual,
                valid: actual === intended ? 1 : 0,
                status: m.detail?.module === module ? "ok" : `module-mismatch:${m.detail?.module}`,
                longest_longtask_ms: m.longest.toFixed(1),
                total_blocking_ms: m.tbt.toFixed(1),
                longtask_count: m.longtasks.length,
                max_frame_gap_ms: m.maxGap.toFixed(1),
                frames_in_window: m.framesIn,
                total_time_ms: (m.tEnd - m.t0).toFixed(1),
                t0_ms: m.t0.toFixed(1),
                t_end_ms: m.tEnd.toFixed(1),
            });
            const out = await readOutputSummary(page);
            Object.assign(row, { data_rows: out.dataRows, output_tables: out.statCount, logged_errors: out.loggedErrors.length });
            if (LOAF) Object.assign(row, loafSummary(m.loafs, module, chunkTags));
            if (CLEAN) {
                // After the metrics: give the Result page up to 10 s to render this
                // run's output (post_dom_logs = 0 records the loadResults race).
                await page.waitForFunction(() => document.querySelectorAll('[data-testid^="result-log-"]').length > 0, null, { timeout: 10000, polling: 200 }).catch(() => {});
                const post = await countStored(page);
                Object.assign(row, { post_logs: post.logs, post_dom_logs: post.domLogs });
            }
            fs.appendFileSync(rawPath, JSON.stringify({ cell, ...row, output: { titles: out.titles, outputBytes: out.outputBytes, loggedErrors: out.loggedErrors }, longtasks: m.longtasks, frames: m.windowFrames, frameAfterEnd: m.frameAfterEnd, longtaskSupported: m.longtaskSupported, ...(LOAF ? { loafs: m.loafs, loafSupported: m.loafSupported } : {}) }) + "\n");
            // Repeated Measures keeps its dialog open until the analysis finishes; make sure it is gone.
            if (module === "repeated-measures") await page.getByRole("button", { name: "OK", exact: true }).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
        } catch (err) {
            Object.assign(row, { valid: 0, status: `error:${String(err.message || err).split("\n")[0].replace(/,/g, ";").slice(0, 150)}` });
            await page.screenshot({ path: path.join(OUT, `error-${cell}-run${i}.png`) }).catch(() => {});
            await page.keyboard.press("Escape").catch(() => {});
        }
        appendCsv(row);
        log(`${cell} run ${i}/${total} ${row.phase} ${intended}->${row.mode_actual ?? "-"} status=${row.status} tables=${row.output_tables ?? "-"} errors=${row.logged_errors ?? "-"} longest=${row.longest_longtask_ms ?? "-"} total=${row.total_time_ms ?? "-"}`);
    }
    fs.writeFileSync(path.join(OUT, `pagelog-${cell}.txt`), pageLog.join("\n"));
    await context.close();
}

async function main() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, CSV_HEADER.join(",") + "\n");
    const browser = await chromium.launch({ headless: HEADLESS });
    const env = environment(browser.version());
    fs.writeFileSync(path.join(OUT, `environment-${Date.now()}.json`), JSON.stringify(env, null, 2));
    const cells = CPUS.length * MODULES.reduce((s, m) => s + sizesFor(m).length, 0);
    log(`start: chromium ${env.chromium}, node ${env.node}, playwright ${env.playwright}; cells=${cells}, runs/mode=${RUNS}${CLEAN ? ", clean" : ""}${LOAF ? ", loaf" : ""}`);
    const chunkTags = LOAF ? env.chunks.tags : {};
    for (const cpu of CPUS) for (const module of MODULES) for (const size of sizesFor(module)) {
        const t = Date.now();
        await runCell(browser, module, size, cpu, chunkTags);
        log(`cell ${module}-${size}-cpu${cpu} done in ${Math.round((Date.now() - t) / 1000)} s`);
    }
    await browser.close();
    log("finished");
}

module.exports = { PROBE, buildProbe, COLLECT, loafSummary, chunkMap, importCsv, openMultivariate, openRepeatedMeasures, clearResults, countStored, readOutputSummary, RM_SLOTS };

if (require.main === module) {
    main().catch((e) => { log("EXPERIMENT FAILED:", e.stack || e); process.exit(1); });
}
