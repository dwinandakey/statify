// Main thread vs Web Worker through the REAL Repeated Measures dialog of a
// production build. For each design: fresh context, CSV import, then runs in
// --sequence order (default main,worker,main,worker). Before every run all
// results are cleared with the Result page's own button; after every run the
// output tables are read from IndexedDB. All runs of a design must produce
// byte-identical tables (compared as the multiset of "title|md5(output_data)").
//
// Usage (repo root, server running):
//   node testing/glm-rm-reference/harness/ui-main-worker.cjs --base=http://localhost:3101 \
//        --designs=gambar51,a --out=testing/glm-rm-reference/results/stage1/ui-main-worker.json
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const SEQUENCE = (args.sequence || "main,worker,main,worker").split(",");
const OUT = args.out ? path.resolve(args.out) : null;
const DATA = path.resolve(__dirname, "../data");
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex").slice(0, 12);

// Same designs as designs.mjs (kept here as CommonJS for Playwright).
const OPT = ["DescStats", "EstEffectSize", "ObsPower"];
const DESIGNS = {
    gambar51: { csv: "gambar51.csv", factor: "perlakuan", levels: 4, measures: [["anjing", ["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"]]], between: [], options: [] },
    a: { csv: "rm_a.csv", factor: "waktu", levels: 3, measures: [["cemas", ["cemas1", "cemas2", "cemas3"]], ["stres", ["stres1", "stres2", "stres3"]]], between: [], options: OPT },
    b: { csv: "rm_b.csv", factor: "waktu", levels: 4, measures: [["skor", ["w1", "w2", "w3", "w4"]]], between: ["kelompok"], options: OPT },
    c: { csv: "rm_c.csv", factor: "sesi", levels: 3, measures: [["nilai", ["p1", "p2", "p3"]]], between: ["metode"], options: [...OPT, "HomogenTest"] },
    // (c) with the EM Means of spss/rm_c.sps through the EM Means dialog (Tahap 3).
    cEm: {
        csv: "rm_c.csv", factor: "sesi", levels: 3, measures: [["nilai", ["p1", "p2", "p3"]]], between: ["metode"], options: OPT,
        emmeans: { targets: ["(OVERALL)", "metode", "sesi", "metode*sesi"], compare: true, method: "Bonferroni" },
    },
    // (c) as spss/rm_c.sps: Polynomial contrasts chosen in the Contrast dialog,
    // homogeneity tests and the residual SSCP matrix (validation against SPSS).
    cPoly: {
        csv: "rm_c.csv", factor: "sesi", levels: 3, measures: [["nilai", ["p1", "p2", "p3"]]], between: ["metode"],
        options: [...OPT, "HomogenTest", "ResSscpMat"], contrast: "Polynomial",
    },
    // (c) with Repeated contrasts chosen in the Contrast dialog (default: Polynomial).
    cRep: {
        csv: "rm_c.csv", factor: "sesi", levels: 3, measures: [["nilai", ["p1", "p2", "p3"]]], between: ["metode"],
        options: OPT, contrast: "Repeated",
    },
    // Repeated Measures cell of Web Worker experiment 2 (Tahap 5): the CSV of
    // datasets.cjs (repeated-measures-5000-L10-M1.csv) is read from --expDir.
    exp5000: {
        csv: "repeated-measures-5000-L10-M1.csv", external: true, factor: "time", levels: 10,
        measures: [["score", Array.from({ length: 10 }, (_, i) => `t${i + 1}`)]], between: [], options: OPT,
    },
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);

async function openDialog(page, d, first) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Repeated Measures", exact: true }).click();
    await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
    const factorBadge = page.getByText(`${d.factor}(${d.levels})`, { exact: true });
    if (!first) await factorBadge.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
    if (!(await factorBadge.count())) {
        await page.locator("#factorName").fill(d.factor);
        await page.locator("#factorLevels").fill(String(d.levels));
        await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
    }
    for (const [measure] of d.measures) {
        if (!(await page.getByText(measure, { exact: true }).count())) {
            await page.locator("#measureName").fill(measure);
            await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
        }
    }
    await page.getByRole("button", { name: "Define", exact: true }).click();
    const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
    const between = page.locator("div", { has: page.getByText("Between-Subjects Factor(s):", { exact: true }) }).last();
    await within.waitFor({ state: "visible", timeout: 60000 });
    if (d.options.length) {
        await page.getByRole("button", { name: "Options", exact: true }).click();
        await page.locator(`#${d.options[0]}`).waitFor({ state: "visible", timeout: 30000 });
        for (const id of d.options) {
            const box = page.locator(`#${id}`);
            if ((await box.getAttribute("data-state")) !== "checked") await box.click();
        }
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await within.waitFor({ state: "visible", timeout: 60000 });
    }
    const badge = (v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
    const slots = d.measures.flatMap(([m, cols]) => cols.map((c, i) => ({ col: c, text: `${c}_(${i + 1},${m})` })));
    for (const s of slots) if (!(await within.getByText(s.text, { exact: true }).count())) await badge(s.col).dragTo(within);
    for (const b of d.between) if (!(await between.getByText(b, { exact: true }).count())) await badge(b).dragTo(between);
    // EM Means after the variables: opening a sub-dialog saves the main
    // dialog, and the EM Means list offers the between factors only then.
    if (d.emmeans) {
        await page.getByRole("button", { name: "EM Means", exact: true }).click();
        await page.locator("#CompMainEffect").waitFor({ state: "visible", timeout: 30000 });
        const zone = page.locator("div", { has: page.getByText(/^Display Means for:/) }).last();
        for (const t of d.emmeans.targets) {
            if (!(await zone.getByText(t, { exact: true }).count())) {
                await page.locator('[draggable="true"]').filter({ hasText: exact(t) }).first().dragTo(zone);
            }
        }
        const box = page.locator("#CompMainEffect");
        if (d.emmeans.compare && (await box.getAttribute("data-state")) !== "checked") await box.click();
        if (d.emmeans.method) {
            await page.getByRole("combobox").last().click();
            await page.getByRole("option", { name: d.emmeans.method, exact: true }).click();
        }
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await within.waitFor({ state: "visible", timeout: 60000 });
    }
    // Contrast dialog: pick the factor, choose the contrast, Change, Continue.
    // The offered contrast types are returned for the report.
    let contrastOptions = null;
    if (d.contrast) {
        await page.getByRole("button", { name: "Contrasts", exact: true }).click();
        const dlg = page.getByRole("dialog").filter({ hasText: "Repeated Measures: Contrast" });
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        await dlg.getByText(new RegExp(`^\\s*${esc(d.factor)}\\s*\\(`)).first().click();
        await dlg.getByRole("combobox").click();
        contrastOptions = await page.getByRole("option").allTextContents();
        await page.getByRole("option", { name: d.contrast, exact: true }).click();
        await dlg.getByRole("button", { name: "Change", exact: true }).click();
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await within.waitFor({ state: "visible", timeout: 60000 });
    }
    let filled = 0;
    for (const s of slots) if (await within.getByText(s.text, { exact: true }).count()) filled += 1;
    let grp = 0;
    for (const b of d.between) if (await between.getByText(b, { exact: true }).count()) grp += 1;
    if (filled !== slots.length || grp !== d.between.length) throw new Error(`dialog: ${filled}/${slots.length} slots, ${grp}/${d.between.length} between`);
    const clickOk = () => page.getByRole("button", { name: "OK", exact: true }).click({ timeout: 10 * 60 * 1000 });
    clickOk.contrastOptions = contrastOptions;
    return clickOk;
}

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

(async () => {
    const browser = await chromium.launch();
    const report = { base: BASE, sequence: SEQUENCE, chromium: browser.version(), startedAt: new Date().toISOString(), designs: {} };
    for (const key of (args.designs || "gambar51,a").split(",")) {
        const d = DESIGNS[key];
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        const page = await context.newPage();
        await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
        await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
        await runner.importCsv(page, path.join(d.external ? path.resolve(args.expDir) : DATA, d.csv));
        const runs = [];
        let first = true;
        for (const mode of SEQUENCE) {
            await runner.clearResults(page);
            await page.evaluate((m) => localStorage.setItem("glm-execution-mode", m), mode);
            const clickOk = await openDialog(page, d, first);
            first = false;
            await page.waitForTimeout(800);
            const pre = await runner.countStored(page);
            const before = await page.evaluate(() => performance.getEntriesByName("glm-analysis-end", "mark").length);
            await clickOk();
            await page.waitForFunction((n) => performance.getEntriesByName("glm-analysis-end", "mark").length > n, before, { timeout: 10 * 60 * 1000 });
            await page.waitForTimeout(500);
            const markMode = await page.evaluate(() => { const e = performance.getEntriesByName("glm-analysis-end", "mark"); return e[e.length - 1].detail?.mode; });
            const tables = await outputTables(page);
            const summary = await runner.readOutputSummary(page);
            const set = tables.map((t) => `${t.title}|${md5(String(t.output_data))}`).sort();
            runs.push({ mode, modeActual: markMode, pre, tables: tables.length, loggedErrors: summary.loggedErrors, ...(clickOk.contrastOptions ? { contrastOptions: clickOk.contrastOptions } : {}), set });
            console.log(`${key} ${mode}->${markMode} tables=${tables.length} errors=${JSON.stringify(summary.loggedErrors).slice(0, 160)}`);
            if (args.saveTables) fs.writeFileSync(path.join(path.dirname(OUT), `ui-${key}-${runs.length}-${mode}.json`), JSON.stringify(tables, null, 1));
            await page.getByRole("button", { name: "OK", exact: true }).waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
        }
        const ref = JSON.stringify(runs[0].set);
        const identical = runs.every((r) => JSON.stringify(r.set) === ref);
        report.designs[key] = { identical, runs: runs.map(({ set, ...r }) => ({ ...r, hash: md5(JSON.stringify(set)) })) };
        console.log(`${key}: all ${runs.length} runs byte-identical (main and worker): ${identical}`);
        await context.close();
    }
    await browser.close();
    if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n"); }
})().catch((e) => { console.error("UI CHECK FAILED:", e); process.exit(1); });
