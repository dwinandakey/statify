// Validity check before the experiment: run one analysis in mode A and one in
// mode B through the real UI and dump the COMPLETE output written to IndexedDB,
// so it can be checked that the whole dataset was analysed without errors.
//
// Usage: node inspect-output.cjs --base=http://localhost:3101 --module=repeated-measures --size=2000 --out=<folder>
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { writeDataset } = require("./datasets.cjs");
const { importCsv, openMultivariate, openRepeatedMeasures, readOutputSummary } = require("./run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const MODULE = args.module;
const SIZE = Number(args.size);
const OUT = path.resolve(args.out || path.join(__dirname, "..", "results", "inspect"));
const SEQUENCE = (args.sequence || "main,worker").split(",");

async function fullOutput(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        const store = (n) => db.transaction(n, "readonly").objectStore(n);
        const last = (await req(store("logs").openCursor(null, "prev"))).value;
        const analytics = await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id)));
        const out = [];
        for (const a of analytics) {
            for (const s of await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))) {
                out.push({ analytic: a.title, title: s.title, output_data: s.output_data });
            }
        }
        db.close();
        return { log: last.log, statistics: out };
    });
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const csv = writeDataset(MODULE, SIZE, path.join(OUT, "data"));
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`);
    await page.locator('[data-testid="main-navbar"]').waitFor();
    await importCsv(page, csv);
    const open = MODULE === "multivariate" ? openMultivariate : openRepeatedMeasures;
    const result = { sequence: SEQUENCE, primeCancel: args["prime-cancel"] === "true", runs: [] };
    let first = true;
    if (result.primeCancel) {
        // Configure the dialog, then leave it with Cancel (no analysis runs).
        await open(page, true);
        first = false;
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await page.waitForTimeout(500);
    }
    for (const mode of SEQUENCE) {
        await page.evaluate((m) => localStorage.setItem("glm-execution-mode", m), mode);
        const clickOk = await open(page, first);
        first = false;
        const before = await page.evaluate(() => performance.getEntriesByName("glm-analysis-end", "mark").length);
        await clickOk();
        await page.waitForFunction((n) => performance.getEntriesByName("glm-analysis-end", "mark").length > n, before, { timeout: 30 * 60 * 1000 });
        await page.waitForTimeout(500);
        const entry = {
            mark: await page.evaluate(() => { const e = performance.getEntriesByName("glm-analysis-end", "mark"); return e[e.length - 1].detail; }),
            summary: await readOutputSummary(page),
            full: await fullOutput(page),
        };
        if (MODULE === "repeated-measures") await page.getByRole("button", { name: "OK", exact: true }).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
        result.runs.push(entry);
        const rowsPerTable = entry.full.statistics.map((s) => { try { const t = JSON.parse(s.output_data).tables?.[0]; return (s.title + ":" + (t?.rows?.length ?? "?")); } catch { return s.title + ":?"; } });
        console.log(mode, JSON.stringify(entry.mark), "rows per table:", rowsPerTable.join(" | "));
    }
    const key = (e) => JSON.stringify(e.full.statistics);
    result.identicalToFirst = result.runs.map((e) => key(e) === key(result.runs[0]));
    fs.writeFileSync(path.join(OUT, `inspect-${MODULE}-${SIZE}-${SEQUENCE.join("-")}.json`), JSON.stringify(result, null, 2));
    console.log("identical to run 1:", result.identicalToFirst.join(","));
    await browser.close();
})().catch((e) => { console.error("INSPECT FAILED:", e); process.exit(1); });
