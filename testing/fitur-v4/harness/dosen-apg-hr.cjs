// Investigasi dosen APG, Bagian 1.2–1.5: data IBM HR (1470 baris) lewat
// antarmuka asli build produksi (mode eksekusi bawaan: worker). GLM
// Multivariate, DV YearsAtCompany, TotalWorkingYears, MonthlyIncome; Fixed
// Factor Gender. Dua jalan, masing-masing dengan browser context baru:
//   A. Options bawaan (Estimates of effect size dan Observed power TIDAK
//      dicentang);
//   B. Options → Estimates of effect size dan Observed power dicentang.
// Keluaran: testing/fitur-v4/bukti/dosen-apg/*.png dan hr.json (kolom, baris,
// catatan tabel yang tampil, dan nilai mentah respons worker).
//
// Pemakaian (root repo, server berjalan):
//   node testing/fitur-v4/harness/dosen-apg-hr.cjs --base=http://localhost:3001 --csv=<path CSV HR>
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3001";
const CSV = path.resolve(args.csv);
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(REPO, "testing/fitur-v4/bukti/dosen-apg");
const LONG = 10 * 60 * 1000;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const report = { base: BASE, csv: path.basename(CSV), shots: [], runs: {} };

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

async function runOnce(browser, key, options, prefix) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(WORKER_TAP);
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    await runner.importCsv(page, CSV);
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const avail = (name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
    for (const v of ["YearsAtCompany", "TotalWorkingYears", "MonthlyIncome"]) await avail(v).dblclick();
    await avail("Gender").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator("#EstEffectSize").waitFor({ state: "visible", timeout: 30000 });
    const state = {};
    for (const id of ["EstEffectSize", "ObsPower"]) {
        const box = page.locator(`#${id}`);
        const want = options.includes(id);
        if (((await box.getAttribute("data-state")) === "checked") !== want) await box.click();
        state[id] = (await box.getAttribute("data-state")) === "checked";
    }
    await snap(page, `${prefix}-options.png`, `Options: EstEffectSize ${state.EstEffectSize ? "dicentang" : "tidak dicentang"}, ObsPower ${state.ObsPower ? "dicentang" : "tidak dicentang"}`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const before = await logCount(page);
    await page.locator("#multivariate-ok-button").click();
    await page.waitForFunction(async (n) => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) > n; } finally { db.close(); }
    }, before, { timeout: LONG, polling: 250 });
    await page.waitForTimeout(1500);
    const tables = await lastTables(page);
    const resp = await page.evaluate(() => {
        const r = window.__workerTap.filter((t) => t.dir === "response" && t.msg && typeof t.msg === "object" && "ok" in t.msg).pop();
        return r ? r.msg : null;
    });
    const cfg = await page.evaluate(() => {
        const r = window.__workerTap.filter((t) => t.dir === "request" && t.msg && t.msg.payload).pop();
        return r ? r.msg.payload.config_data.options : null;
    });
    report.runs[key] = {
        optionsChecked: state,
        optionsSent: cfg ? { EstEffectSize: cfg.EstEffectSize, ObsPower: cfg.ObsPower, SigLevel: cfg.SigLevel } : null,
        tables: tables.filter((t) => /Multivariate Tests|Tests of Between-Subjects Effects/.test(t.title)),
        raw: resp?.results?.multivariate_tests ?? null,
    };
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
    await snapCard(page, "Multivariate Tests", `${prefix}-multivariate-tests.png`, `Multivariate Tests (${key})`);
    await snapCard(page, "Tests of Between-Subjects Effects", `${prefix}-between-subjects.png`, `Tests of Between-Subjects Effects (${key})`);
    await context.close();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    report.chromium = browser.version();
    await runOnce(browser, "A: tanpa effect size/power", [], "hr-a");
    await runOnce(browser, "B: effect size dan power dicentang", ["EstEffectSize", "ObsPower"], "hr-b");
    await browser.close();
    fs.writeFileSync(path.join(OUT, "hr.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("HR GAGAL:", e); fs.writeFileSync(path.join(OUT, "hr.json"), JSON.stringify(report, null, 2) + "\n"); process.exit(1); });
