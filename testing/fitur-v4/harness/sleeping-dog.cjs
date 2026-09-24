// Contoh sleeping dog (Johnson & Wichern, §6.2) lewat antarmuka asli build
// produksi (mode eksekusi bawaan: worker), untuk bahan diskusi dengan dosen:
//   a. Repeated Measures: faktor within "perlakuan" 4 level (y1–y4), measure
//      "anjing" (Statify mewajibkan nama measure; sama dengan desain acuan
//      gambar51, yang memakai data yang sama);
//   b. GLM Multivariate satu populasi: DV d1, d2, d3 (sleeping-dog-kontras.csv),
//      Test Values 0, Options → Simultaneous CI (95%).
// Keluaran: testing/fitur-v4/bukti/sleeping-dog/*.png dan hasil.json (baris
// tabel yang tampil dan nilai mentah respons worker).
//
// Pemakaian (root repo, server berjalan):
//   node testing/fitur-v4/harness/sleeping-dog.cjs --base=http://localhost:3101
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(REPO, "testing/fitur-v4/bukti/sleeping-dog");
const DATA = path.join(REPO, "testing/fitur-v4/data");
const LONG = 10 * 60 * 1000;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const report = { base: BASE, shots: [] };

const WORKER_TAP = () => {
    window.__workerTap = [];
    const Native = window.Worker;
    window.Worker = class extends Native {
        constructor(url, opts) {
            super(url, opts);
            const post = this.postMessage.bind(this);
            this.postMessage = (msg, ...rest) => { window.__workerTap.push({ dir: "request", msg }); return post(msg, ...rest); };
            this.addEventListener("message", (e) => window.__workerTap.push({ dir: "response", msg: e.data }));
        }
    };
};

async function snap(target, file, label) {
    await new Promise((r) => setTimeout(r, 1000));
    await target.screenshot({ path: path.join(OUT, file) });
    report.shots.push({ file, label });
    console.log(`${file}: ${label}`);
}
async function start(browser, csv) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(WORKER_TAP);
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    await runner.importCsv(page, csv);
    return { context, page };
}
async function logCount(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return db.objectStoreNames.contains("logs") ? await req(db.transaction("logs", "readonly").objectStore("logs").count()) : 0; } finally { db.close(); }
    });
}
async function lastTables(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        const store = (n) => db.transaction(n, "readonly").objectStore(n);
        const last = (await req(store("logs").openCursor(null, "prev"))).value;
        const out = [];
        for (const a of await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id)))) {
            for (const s of await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))) {
                const o = typeof s.output_data === "string" ? JSON.parse(s.output_data) : s.output_data;
                for (const t of o.tables || []) out.push({ title: t.title, note: t.note ?? null, columns: (t.columnHeaders || []).map((h) => h.header), rows: t.rows });
            }
        }
        db.close();
        return out;
    });
}
async function waitNewLog(page, before) {
    await page.waitForFunction(async (n) => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) > n; } finally { db.close(); }
    }, before, { timeout: LONG, polling: 250 });
    await page.waitForTimeout(1500);
}
async function gotoResult(page) {
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
}
async function snapCard(page, title, file, label) {
    const log = page.locator('[data-testid^="result-log-"]').last();
    const inner = page.locator('[data-testid^="result-table-"]').filter({ hasText: title });
    const out = log.locator('[data-testid^="result-output-"]').filter({ has: inner }).first();
    const toggle = out.locator('[data-testid^="toggle-table-"]').filter({ hasText: /Show Full/ });
    if (await toggle.count()) await toggle.first().click().catch(() => {});
    const card = log.locator('[data-testid^="result-analytic-"]').filter({ has: inner }).first();
    if (!(await card.count())) { report.shots.push({ file, label, missing: title }); console.log(`${file}: TIDAK DITEMUKAN ${title}`); return; }
    await card.scrollIntoViewIfNeeded();
    await snap(card, file, label);
}
const lastResponse = (page) => page.evaluate(() => {
    const r = window.__workerTap.filter((t) => t.dir === "response" && t.msg && typeof t.msg === "object" && "ok" in t.msg).pop();
    return r ? r.msg : null;
});

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    report.chromium = browser.version();

    // a. Repeated Measures.
    {
        const { context, page } = await start(browser, path.join(DATA, "sleeping-dog.csv"));
        await page.locator('[data-testid="analyze-menu-trigger"]').click();
        await page.getByRole("menuitem", { name: "General Linear Model" }).click();
        await page.getByRole("menuitem", { name: "Repeated Measures", exact: true }).click();
        await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
        await page.locator("#factorName").fill("perlakuan");
        await page.locator("#factorLevels").fill("4");
        await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
        await page.locator("#measureName").fill("anjing");
        await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
        await snap(page, "a1-rm-define.png", "RM Define: faktor within perlakuan(4), measure anjing");
        await page.getByRole("button", { name: "Define", exact: true }).click();
        const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
        await within.waitFor({ state: "visible", timeout: 60000 });
        const badge = (v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
        for (const [i, c] of ["y1", "y2", "y3", "y4"].entries()) {
            if (!(await within.getByText(`${c}_(${i + 1},anjing)`, { exact: true }).count())) await badge(c).dragTo(within);
        }
        for (const [i, c] of ["y1", "y2", "y3", "y4"].entries()) {
            if (!(await within.getByText(`${c}_(${i + 1},anjing)`, { exact: true }).count())) throw new Error(`slot ${c} tidak terisi`);
        }
        await snap(page, "a2-rm-dialog.png", "RM: y1–y4 di slot perlakuan 1–4");
        const before = await logCount(page);
        await page.getByRole("button", { name: "OK", exact: true }).click();
        await waitNewLog(page, before);
        const tables = await lastTables(page);
        report.rm = { tables: tables.filter((t) => /Multivariate Tests|Within-Subjects Factors/.test(t.title)) };
        await gotoResult(page);
        await snapCard(page, "Multivariate Tests", "a3-rm-multivariate-tests.png", "RM Multivariate Tests (Hotelling's Trace, F, df, Sig.)");
        await context.close();
    }
    // b. GLM Multivariate satu populasi pada kontras d1, d2, d3.
    {
        const { context, page } = await start(browser, path.join(DATA, "sleeping-dog-kontras.csv"));
        await page.locator('[data-testid="analyze-menu-trigger"]').click();
        await page.getByRole("menuitem", { name: "General Linear Model" }).click();
        await page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
        const avail = (name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
        for (const v of ["d1", "d2", "d3"]) await avail(v).dblclick();
        await page.getByRole("button", { name: "Test Values", exact: true }).click();
        for (let i = 0; i < 3; i++) await page.locator(`#mu0-${i}`).fill("0");
        await snap(page, "b1-mv-test-values.png", "MV: DV d1, d2, d3; Test Values μ₀ = 0, 0, 0");
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
        await page.getByRole("button", { name: "Options", exact: true }).click();
        await page.locator("#SimultaneousCI").waitFor({ state: "visible", timeout: 30000 });
        if ((await page.locator("#SimultaneousCI").getAttribute("data-state")) !== "checked") await page.locator("#SimultaneousCI").click();
        await snap(page, "b2-mv-options.png", "MV Options: Simultaneous CI dicentang, Significance Level 0.05 (95%)");
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
        const before = await logCount(page);
        await page.locator("#multivariate-ok-button").click();
        await waitNewLog(page, before);
        const tables = await lastTables(page);
        const resp = await lastResponse(page);
        report.mv = {
            tables: tables.filter((t) => /Multivariate Tests|Simultaneous Confidence Intervals/.test(t.title)),
            raw: {
                multivariate_tests: resp?.results?.multivariate_tests ?? null,
                simultaneous_confidence_intervals: resp?.results?.simultaneous_confidence_intervals ?? null,
            },
        };
        await gotoResult(page);
        await snapCard(page, "Multivariate Tests", "b3-mv-multivariate-tests.png", "MV satu populasi: Multivariate Tests (Hotelling T² vs μ₀ = 0)");
        await snapCard(page, "Simultaneous Confidence Intervals", "b4-mv-ci-simultan.png", "MV satu populasi: CI simultan T² dan Bonferroni 95% untuk d1, d2, d3");
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, "hasil.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("SLEEPING DOG GAGAL:", e); fs.writeFileSync(path.join(OUT, "hasil.json"), JSON.stringify(report, null, 2) + "\n"); process.exit(1); });
