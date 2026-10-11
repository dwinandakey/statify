// Investigasi dosen APG, Bagian 3: pilihan Sum of Squares (dialog Model)
// lewat antarmuka asli build produksi (mode eksekusi bawaan: worker).
//   MV: data mv6 (two-way manova tak seimbang), DV Y1A1, Y2A1, Fixed Factor
//       faktorA, faktorB, Full factorial, Type I, II, III, IV;
//   RM: data rm-c-tak-seimbang (rm_c tanpa tiga subjek pertama metode 1;
//       faktor within sesi 3 level, measure nilai, between metode), Type I dan
//       Type III, untuk memeriksa apakah pilihan SS dipakai.
// Keluaran: testing/fitur-v4/bukti/dosen-apg/sstype-*.png dan sstype.json
// (baris Tests of Between-Subjects Effects dan nilai mentah SS dari worker).
//
// Pemakaian (root repo, server berjalan):
//   node testing/fitur-v4/harness/dosen-apg-sstype.cjs --base=http://localhost:3101 [--only=mv6|rm]
// (--only mengulang satu bagian dan mempertahankan bagian lain di sstype.json)
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(REPO, "testing/fitur-v4/bukti/dosen-apg");
const LONG = 10 * 60 * 1000;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const report = { base: BASE, shots: [], mv6: {}, rm_c: {} };

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
async function waitNewLog(page, before) {
    await page.waitForFunction(async (n) => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) > n; } finally { db.close(); }
    }, before, { timeout: LONG, polling: 250 });
    await page.waitForTimeout(1500);
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
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
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
// Pilih Sum of Squares di dialog Model yang sedang terbuka.
async function chooseSS(page, dlg, typeName) {
    const row = dlg.locator("div.flex.items-center", { has: page.getByText("Sum of Squares:", { exact: true }) }).first();
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: typeName, exact: true }).click();
    const shown = (await row.getByRole("combobox").innerText()).trim();
    if (shown !== typeName) throw new Error(`Sum of Squares: ${shown} (ingin ${typeName})`);
}
const lastResponse = (page) => page.evaluate(() => {
    const r = window.__workerTap.filter((t) => t.dir === "response" && t.msg && typeof t.msg === "object" && "ok" in t.msg).pop();
    return r ? r.msg : null;
});

async function mv6(browser, typeName) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(WORKER_TAP);
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    await runner.importCsv(page, path.join(REPO, "testing/glm-mv-reference/data/two-way manova tak seimbang.csv"));
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const avail = (name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
    for (const v of ["Y1A1", "Y2A1"]) await avail(v).dblclick();
    for (const f of ["faktorA", "faktorB"]) await avail(f).dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
    await page.getByRole("button", { name: "Model", exact: true }).click();
    const dlg = page.getByRole("dialog").filter({ has: page.getByText("Multivariate: Model", { exact: true }) });
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    await chooseSS(page, dlg, typeName);
    const tag = typeName.replace("Type ", "").toLowerCase();
    await snap(page, `sstype-mv6-${tag}-model.png`, `mv6: dialog Model, Sum of Squares ${typeName}`);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    const before = await logCount(page);
    await page.locator("#multivariate-ok-button").click();
    await waitNewLog(page, before);
    const tables = await lastTables(page);
    const resp = await lastResponse(page);
    const sent = await page.evaluate(() => {
        const r = window.__workerTap.filter((t) => t.dir === "request" && t.msg && t.msg.payload).pop();
        return r ? r.msg.payload.config_data.model.SumOfSquareMethod : null;
    });
    report.mv6[typeName] = {
        sent,
        between: tables.find((t) => t.title === "Tests of Between-Subjects Effects") ?? null,
        multivariate: tables.find((t) => t.title === "Multivariate Tests") ?? null,
        raw_between: resp?.results?.tests_of_between_subjects_effects ?? null,
    };
    await snapCard(page, "Tests of Between-Subjects Effects", `sstype-mv6-${tag}-between.png`, `mv6 ${typeName}: Tests of Between-Subjects Effects`);
    await context.close();
}

async function rmC(browser, typeName) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    await context.addInitScript(WORKER_TAP);
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    // rm_c seimbang (10 dan 10); rm-c-tak-seimbang.csv = rm_c tanpa tiga subjek
    // pertama metode 1 (7 dan 10), agar Type I dan Type III berbeda.
    await runner.importCsv(page, path.join(REPO, "testing/fitur-v4/data/rm-c-tak-seimbang.csv"));
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Repeated Measures", exact: true }).click();
    await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
    await page.locator("#factorName").fill("sesi");
    await page.locator("#factorLevels").fill("3");
    await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
    await page.locator("#measureName").fill("nilai");
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
    await page.getByRole("button", { name: "Define", exact: true }).click();
    const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
    const between = page.locator("div", { has: page.getByText("Between-Subjects Factor(s):", { exact: true }) }).last();
    await within.waitFor({ state: "visible", timeout: 60000 });
    const badge = (v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
    for (const [i, c] of ["p1", "p2", "p3"].entries()) {
        if (!(await within.getByText(`${c}_(${i + 1},nilai)`, { exact: true }).count())) await badge(c).dragTo(within);
    }
    if (!(await between.getByText("metode", { exact: true }).count())) await badge("metode").dragTo(between);
    await page.getByRole("button", { name: "Model", exact: true }).click();
    const dlg = page.getByRole("dialog").filter({ has: page.getByText("Model", { exact: true }) });
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    await chooseSS(page, dlg, typeName);
    const tag = typeName.replace("Type ", "").toLowerCase();
    await snap(page, `sstype-rm-c-${tag}-model.png`, `rm_c: dialog Model, Sum of Squares ${typeName}`);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await within.waitFor({ state: "visible", timeout: 60000 });
    const before = await logCount(page);
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await waitNewLog(page, before);
    const tables = await lastTables(page);
    const sent = await page.evaluate(() => {
        const r = window.__workerTap.filter((t) => t.dir === "request" && t.msg && t.msg.payload).pop();
        return r ? r.msg.payload.config_data?.model?.SumOfSquareMethod ?? null : null;
    });
    report.rm_c[typeName] = {
        sent,
        between: tables.find((t) => t.title === "Tests of Between-Subjects Effects") ?? null,
        within: tables.find((t) => t.title === "Tests of Within-Subjects Effects") ?? null,
    };
    await snapCard(page, "Tests of Between-Subjects Effects", `sstype-rm-c-${tag}-between.png`, `rm_c ${typeName}: Tests of Between-Subjects Effects`);
    await context.close();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    report.chromium = browser.version();
    const prev = path.join(OUT, "sstype.json");
    if (args.only && fs.existsSync(prev)) {
        const old = JSON.parse(fs.readFileSync(prev, "utf8"));
        report.mv6 = old.mv6 ?? {}; report.rm_c = old.rm_c ?? {};
        report.shots = (old.shots ?? []).filter((s) => !s.file.startsWith(args.only === "rm" ? "sstype-rm-c" : "sstype-mv6"));
    }
    if (!args.only || args.only === "mv6") for (const t of ["Type I", "Type II", "Type III", "Type IV"]) await mv6(browser, t);
    if (!args.only || args.only === "rm") for (const t of ["Type I", "Type III"]) await rmC(browser, t);
    await browser.close();
    fs.writeFileSync(path.join(OUT, "sstype.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("SSTYPE GAGAL:", e); fs.writeFileSync(path.join(OUT, "sstype.json"), JSON.stringify(report, null, 2) + "\n"); process.exit(1); });
