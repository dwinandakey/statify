// Bagian B (pilot, browser): the candidate heavier Repeated Measures
// configuration through the REAL UI of the production build, both modes.
// Per size: one fresh context, CSV import, then runs in --sequence order with
// the clean protocol (results cleared before every run). Records the compute
// time (glm-analysis-start → glm-analysis-end), the click → end time, the
// longest long task / LoAF, logged errors and a hash of every output table so
// modes A and B can be compared. Also checks what the EM Means dialog offers.
//
// Usage (repo root, server running):
//   node testing/glm-web-worker/diagnosis/rm-heavier/pilot-ui.cjs --base=http://localhost:3101 \
//        --levels=10 --measures=2 --options=DescStats,EstEffectSize,ObsPower \
//        --sizes=2500,5000,10000,20000 --sequence=main,worker,main,worker --out=<folder>
const earlyArgs = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
// The runner reads these at load time.
process.env.RM_LEVELS = earlyArgs.levels || "10";
process.env.RM_MEASURES = earlyArgs.measures || "2";
process.env.RM_OPTIONS = earlyArgs.options ?? "DescStats,EstEffectSize,ObsPower";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("@playwright/test");
const runner = require("../../experiment/run-experiment.cjs");
const { writeDataset } = require("../../experiment/datasets.cjs");

const BASE = earlyArgs.base || "http://localhost:3101";
const SIZES = (earlyArgs.sizes || "2500,20000").split(",").map(Number);
const SEQUENCE = (earlyArgs.sequence || "main,worker,main,worker").split(",");
const OUT = path.resolve(earlyArgs.out || path.join(__dirname, "out"));
const L = Number(process.env.RM_LEVELS), M = Number(process.env.RM_MEASURES);
// Row order of some tables follows Rust HashMap iteration order, which changes
// between computations in the same WASM instance (output-stability.mjs). The
// canonical hash (every array sorted, numbers to 12 significant digits) compares
// the values only.
const canon = (v) => {
    if (Array.isArray(v)) return v.map(canon).map((x) => JSON.stringify(x)).sort().map((x) => JSON.parse(x));
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
    return typeof v === "number" ? Number(v.toPrecision(12)) : v;
};
const md5 = (x) => crypto.createHash("md5").update(x).digest("hex").slice(0, 12);
const canonicalHash = (outputData) => { try { return md5(JSON.stringify(canon(JSON.parse(outputData)))); } catch { return md5(String(outputData)); } };

async function outputTables(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        const store = (n) => db.transaction(n, "readonly").objectStore(n);
        const last = (await req(store("logs").openCursor(null, "prev"))).value;
        const out = [];
        for (const a of await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id)))) {
            for (const s of await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))) out.push({ title: s.title, output_data: s.output_data });
        }
        db.close();
        return out;
    });
}

// What the EM Means dialog lists as available factors (read only, then Cancel).
async function emmeansAvailable(page) {
    await runner.openRepeatedMeasures(page, false);
    await page.getByRole("button", { name: "EM Means", exact: true }).click();
    await page.locator("#CompMainEffect").waitFor({ state: "visible", timeout: 30000 });
    const texts = await page.locator('[draggable="true"]').allInnerTexts();
    const compareDisabled = await page.locator("#CompMainEffect").isDisabled();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.keyboard.press("Escape").catch(() => {});
    return { draggableItems: texts.map((t) => t.trim()).filter(Boolean), compareDisabled };
}

// --emmeans=overall: put "(OVERALL)" into "Display Means for:" (the only entry
// the dialog offers for a within-only design) before clicking OK.
const EMMEANS = earlyArgs.emmeans || "";
async function setEmmeansOverall(page) {
    await page.getByRole("button", { name: "EM Means", exact: true }).click();
    await page.locator("#CompMainEffect").waitFor({ state: "visible", timeout: 30000 });
    const zone = page.locator("div", { has: page.getByText(/^Display Means for:/) }).last();
    await page.locator('[draggable="true"]').filter({ hasText: /^\s*\(OVERALL\)\s*$/ }).first().dragTo(zone);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
    await within.waitFor({ state: "visible", timeout: 60000 });
    let filled = 0;
    for (const slot of runner.RM_SLOTS) if (await within.getByText(slot.text, { exact: true }).count()) filled += 1;
    if (filled !== runner.RM_SLOTS.length) throw new Error(`after EM Means: ${filled} within slots filled`);
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const env = { chromium: browser.version(), base: BASE, levels: L, measures: M, options: process.env.RM_OPTIONS, emmeans: EMMEANS || null, sizes: SIZES, sequence: SEQUENCE, startedAt: new Date().toISOString() };
    const tags = runner.chunkMap().tags;
    const results = [];
    for (const n of SIZES) {
        const csvFile = writeDataset("repeated-measures", n, path.join(OUT, "data"), { levels: L, measures: M });
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        await context.addInitScript({ content: runner.buildProbe(true) });
        const page = await context.newPage();
        const pageLog = [];
        page.on("console", (msg) => { if (msg.type() === "error") pageLog.push(msg.text().slice(0, 300)); });
        page.on("pageerror", (e) => pageLog.push(`[pageerror] ${e.message}`.slice(0, 300)));
        const tImport = Date.now();
        await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
        await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
        await runner.importCsv(page, csvFile);
        console.log(`n=${n}: imported ${path.basename(csvFile)} in ${Math.round((Date.now() - tImport) / 1000)} s`);
        let first = true;
        for (const mode of SEQUENCE) {
          pageLog.length = 0;
          try {
            await runner.clearResults(page);
            await page.evaluate((m) => localStorage.setItem("glm-execution-mode", m), mode);
            const clickOk = await runner.openRepeatedMeasures(page, first);
            first = false;
            if (EMMEANS === "overall") await setEmmeansOverall(page);
            await page.waitForTimeout(1000);
            const pre = await runner.countStored(page);
            const prevEnds = await page.evaluate(() => {
                const exp = window.__glmExp;
                exp.longtasks = []; exp.frames = []; exp.loafs = []; exp.t0 = null; exp.armed = true;
                return performance.getEntriesByName("glm-analysis-end", "mark").length;
            });
            await clickOk();
            await page.waitForFunction((k) => performance.getEntriesByName("glm-analysis-end", "mark").length > k, prevEnds, { timeout: Number(earlyArgs.waitMs || 30 * 60 * 1000), polling: 100 });
            await page.waitForTimeout(500);
            const m = await page.evaluate(runner.COLLECT, prevEnds);
            const computeMs = await page.evaluate(() => {
                const s = performance.getEntriesByName("glm-analysis-start", "mark"), e = performance.getEntriesByName("glm-analysis-end", "mark");
                return e[e.length - 1].startTime - s[s.length - 1].startTime;
            });
            const summary = await runner.readOutputSummary(page);
            const tables = await outputTables(page);
            const post = await runner.countStored(page);
            // Several tables can share a title (one "Descriptive Statistics" table per
            // dependent variable), and their order follows the HashMap order, so the
            // outputs are compared as sorted lists of "title|hash" (multisets).
            const hashes = tables.map((t) => `${t.title}|${md5(String(t.output_data))}`).sort();
            const canonicalHashes = tables.map((t) => `${t.title}|${canonicalHash(t.output_data)}`).sort();
            // --save-tables=<title>[,<title>]: keep those output tables of every run.
            const keep = (earlyArgs["save-tables"] || "").split(",").filter(Boolean);
            const r = {
                n, mode, modeActual: m.detail?.mode, computeMs: Math.round(computeMs), clickToEndMs: Math.round(m.tEnd - m.t0),
                longestLongtaskMs: Math.round(m.longest), longestLoafMs: Math.round(m.loafs.reduce((x, f) => Math.max(x, f.duration), 0)),
                loaf: runner.loafSummary(m.loafs, "repeated-measures", tags), loafSupported: m.loafSupported,
                pre, post, dataRows: summary.dataRows, tables: summary.titles, loggedErrors: summary.loggedErrors, errorLines: summary.errorLines, hashes, canonicalHashes,
                ...(keep.length ? { savedTables: tables.filter((t) => keep.includes(t.title)) } : {}),
            };
            results.push(r);
            console.log(`n=${n} ${mode}->${r.modeActual} compute=${r.computeMs} ms click→end=${r.clickToEndMs} ms longest LT=${r.longestLongtaskMs} LoAF=${r.longestLoafMs} pre=${JSON.stringify(pre)} post=${post.logs}/${post.domLogs} tables=${summary.statCount} errors=${JSON.stringify(summary.loggedErrors)}`);
            await page.getByRole("button", { name: "OK", exact: true }).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
          } catch (err) {
            // No end mark (e.g. the analysis failed): record what the page showed.
            const stored = await runner.countStored(page).catch(() => null);
            const summary = stored && stored.logs ? await runner.readOutputSummary(page).catch(() => null) : null;
            const r = { n, mode, error: String(err.message || err).split(/\r?\n/)[0], stored, loggedErrors: summary?.loggedErrors ?? null, pageErrors: [...pageLog] };
            results.push(r);
            console.log(`n=${n} ${mode} FAILED: ${r.error} | stored=${JSON.stringify(stored)} | page errors: ${JSON.stringify(r.pageErrors.slice(0, 3))}`);
            await page.keyboard.press("Escape").catch(() => {});
          }
        }
        if (n === SIZES[0] && !EMMEANS) {
            env.emmeansDialog = await emmeansAvailable(page).catch((e) => ({ error: String(e.message || e).split("\n")[0] }));
            console.log("EM Means dialog:", JSON.stringify(env.emmeansDialog));
        }
        await context.close();
    }
    await browser.close();
    // Output identity: every table hash of every run equals the first main run of that size.
    env.identical = Object.fromEntries(SIZES.map((n) => {
        const runs = results.filter((r) => r.n === n && r.hashes);
        if (!runs.length) return [n, null];
        const ref = JSON.stringify(runs[0].hashes);
        return [n, runs.every((r) => JSON.stringify(r.hashes) === ref)];
    }));
    env.identicalValues = Object.fromEntries(SIZES.map((n) => {
        const runs = results.filter((r) => r.n === n && r.canonicalHashes);
        if (!runs.length) return [n, null];
        const ref = JSON.stringify(runs[0].canonicalHashes);
        return [n, runs.every((r) => JSON.stringify(r.canonicalHashes) === ref)];
    }));
    // Within each A,B pair (same number of earlier computations in each instance).
    env.identicalWithinPairs = Object.fromEntries(SIZES.map((n) => {
        const runs = results.filter((r) => r.n === n && r.hashes);
        const pairs = [];
        for (let i = 0; i + 1 < runs.length; i += 2) pairs.push(JSON.stringify(runs[i].hashes) === JSON.stringify(runs[i + 1].hashes));
        return [n, pairs];
    }));
    console.log("outputs byte-identical across runs/modes per size:", JSON.stringify(env.identical));
    console.log("output values identical (row order ignored) per size:", JSON.stringify(env.identicalValues));
    console.log("byte-identical within each A,B pair:", JSON.stringify(env.identicalWithinPairs));
    const file = path.join(OUT, `pilot-ui-L${L}-M${M}${EMMEANS ? `-emmeans-${EMMEANS}` : ""}.json`);
    fs.writeFileSync(file, JSON.stringify({ env, results }, null, 2));
    console.log("written:", file);
})().catch((e) => { console.error("PILOT FAILED:", e); process.exit(1); });
