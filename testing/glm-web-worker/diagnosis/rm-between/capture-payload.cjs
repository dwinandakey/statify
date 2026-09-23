// Bagian A (diagnosis): GLM Repeated Measures with a between factor, via the
// REAL UI of the production build. Captures the exact payload the app sends to
// the worker (Worker.prototype.postMessage hook in the page, no app change)
// and the complete output of every run, for a run sequence that mixes modes.
//
// Usage: node capture-payload.cjs --base=http://localhost:3101 --groups=2 --n=12 --sequence=worker,worker,main,main [--between=false] --out=<folder>
const earlyArgs = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
process.env.RM_BETWEEN = earlyArgs.between === "false" ? "false" : "true"; // the runner reads it at load time
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { importCsv, openRepeatedMeasures, readOutputSummary } = require("../../experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const GROUPS = Number(args.groups || 2);
const N = Number(args.n || 12);
const SEQUENCE = (args.sequence || "worker,worker,main,main").split(",");
const OUT = path.resolve(args.out || path.join(__dirname, "out"));

// Small, balanced mixed design: 5 within levels, GROUPS between levels, N subjects.
function csv() {
    const rows = ["t1,t2,t3,t4,t5,group"];
    for (let s = 0; s < N; s++) {
        const g = s % GROUPS;
        const vals = Array.from({ length: 5 }, (_, l) => (10 + l * 1.5 + g * 2 + ((s * 7 + l * 3) % 5) * 0.3).toFixed(3));
        rows.push([...vals, `G${g + 1}`].join(","));
    }
    return rows.join("\n") + "\n";
}

const HOOK = `(() => {
  const store = (window.__glmPayloads = []);
  const original = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (message, ...rest) {
    try { if (message && message.payload) store.push(JSON.parse(JSON.stringify(message))); } catch (e) {}
    return original.call(this, message, ...rest);
  };
})();`;

async function fullOutput(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        const store = (n) => db.transaction(n, "readonly").objectStore(n);
        const last = (await req(store("logs").openCursor(null, "prev"))).value;
        const analytics = await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id)));
        const out = [];
        for (const a of analytics) for (const s of await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))) out.push({ title: s.title, output_data: s.output_data });
        db.close();
        return out;
    });
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const csvFile = path.join(OUT, `rm-mixed-n${N}-g${GROUPS}.csv`);
    fs.writeFileSync(csvFile, csv());
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript({ content: HOOK });
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`);
    await page.locator('[data-testid="main-navbar"]').waitFor();
    await importCsv(page, csvFile);
    const runs = [];
    let first = true;
    for (const mode of SEQUENCE) {
        await page.evaluate((m) => localStorage.setItem("glm-execution-mode", m), mode);
        const clickOk = await openRepeatedMeasures(page, first);
        first = false;
        const before = await page.evaluate(() => performance.getEntriesByName("glm-analysis-end", "mark").length);
        await clickOk();
        await page.waitForFunction((n) => performance.getEntriesByName("glm-analysis-end", "mark").length > n, before, { timeout: 120000 });
        await page.waitForTimeout(500);
        const mark = await page.evaluate(() => { const e = performance.getEntriesByName("glm-analysis-end", "mark"); return e[e.length - 1].detail; });
        const statistics = await fullOutput(page);
        const summary = await readOutputSummary(page);
        const rowsPerTable = statistics.map((s) => { try { return `${s.title}:${JSON.parse(s.output_data).tables[0].rows.length}`; } catch { return `${s.title}:?`; } });
        runs.push({ mode, mark, loggedErrors: summary.loggedErrors, rowsPerTable, statistics });
        console.log(mode, JSON.stringify(mark), "| errors:", JSON.stringify(summary.loggedErrors), "|", rowsPerTable.join(" | "));
        await page.getByRole("button", { name: "OK", exact: true }).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
    }
    const payloads = await page.evaluate(() => window.__glmPayloads);
    fs.writeFileSync(path.join(OUT, `capture-n${N}-g${GROUPS}-${SEQUENCE.join("-")}.json`), JSON.stringify({ n: N, groups: GROUPS, sequence: SEQUENCE, runs, payloads }, null, 2));
    console.log("captured worker payloads:", payloads.length);
    await browser.close();
})().catch((e) => { console.error("CAPTURE FAILED:", e); process.exit(1); });
