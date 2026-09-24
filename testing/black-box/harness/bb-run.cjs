// Eksekusi skenario black-box (testing/black-box/skenario-black-box.md) lewat
// antarmuka asli build produksi: impor CSV dari menu File, menu Analyze,
// isi dialog, klik tombol. Tidak memanggil service, WASM, atau worker.
// Mode eksekusi GLM dibiarkan bawaan (worker): localStorage tidak disentuh.
//
// Setiap skenario memakai browser context baru (profil bersih: IndexedDB dan
// localStorage kosong). Pengamatan (toast, judul dan isi tabel yang disimpan
// aplikasi, status tombol) ditulis ke hasil-eksekusi/<ID>.json; tangkapan
// layar ke bukti/<ID>[-n].png.
//
// Pemakaian (root repo, server berjalan):
//   node testing/black-box/harness/bb-run.cjs --base=http://localhost:3001 [--only=BB-KF02-01,...]
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3001";
const REPO = path.resolve(__dirname, "../../..");
const BB = path.resolve(__dirname, "..");
const SHOTS = path.join(BB, "bukti");
const OBS = path.join(BB, "hasil-eksekusi");
const MVD = path.join(REPO, "testing/glm-mv-reference/data");
const RMD = path.join(REPO, "testing/glm-rm-reference/data");
const BBD = path.join(BB, "data");
const MVX = path.join(REPO, "testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore/data");
const RMX = path.join(REPO, "testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/data");
const RMS = path.join(REPO, "testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/data");
const LONG = 10 * 60 * 1000;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const NL = String.fromCharCode(10);

// ── Sesi skenario ────────────────────────────────────────────────────────────
class Ctx {
    constructor(id, page) {
        this.id = id; this.page = page; this.shot = 0; this.obs = { id, steps: [], toasts: [], runs: [], checks: {}, notes: [] };
    }
    note(k, v) { this.obs.checks[k] = v; }
    log(s) { this.obs.steps.push(s); }
    async snap(target, label) {
        this.shot += 1;
        const file = `${this.id}-${this.shot}.png`;
        if (target && target !== this.page) await target.screenshot({ path: path.join(SHOTS, file) });
        else await this.page.screenshot({ path: path.join(SHOTS, file) });
        this.obs.notes.push(`${file}: ${label}`);
        return file;
    }
}

const toastTexts = (page) => page.locator("[data-sonner-toast]").allInnerTexts().then((a) => a.map((t) => t.split(NL).map((x) => x.trim()).filter(Boolean).join(" | ")));
// Tunggu toast yang cocok, ambil tangkapan layar segera, kembalikan teksnya.
async function waitToast(c, re, label, timeout = 15000) {
    const page = c.page;
    await page.waitForFunction((src) => {
        const r = new RegExp(src);
        return [...document.querySelectorAll("[data-sonner-toast]")].some((t) => r.test(t.innerText));
    }, re.source, { timeout, polling: 50 });
    const texts = await toastTexts(page);
    const file = await c.snap(page, `toast: ${label}`);
    c.obs.toasts.push({ label, texts, file });
    return texts;
}
async function dismissToasts(page) {
    await page.waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0, null, { timeout: 20000, polling: 200 }).catch(() => {});
}

async function newPage(browser) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    return { context, page };
}
async function importCsv(c, file) {
    await runner.importCsv(c.page, file);
    c.log(`impor ${path.basename(file)}`);
}
async function openGlm(page, item) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: item, exact: true }).click();
}

// ── IndexedDB (dibaca, tidak ditulis) ───────────────────────────────────────
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
        const cur = await req(store("logs").openCursor(null, "prev"));
        if (!cur) { db.close(); return null; }
        const last = cur.value;
        const out = [];
        for (const a of await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id)))) {
            for (const s of await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))) out.push({ title: s.title, components: s.components, output_data: s.output_data });
        }
        db.close();
        return { logId: last.id, log: last.log, stats: out };
    });
}
// Ringkas: judul statistik, judul tabel di dalamnya, baris, jumlah grafik.
function digest(res) {
    if (!res) return null;
    return res.stats.map((s) => {
        let o = null;
        try { o = typeof s.output_data === "string" ? JSON.parse(s.output_data) : s.output_data; } catch { /* bukan JSON */ }
        return {
            title: s.title,
            tables: (o?.tables || []).map((t) => ({ title: t.title, columns: (t.columnHeaders || []).map((h) => h.header), rows: t.rows, footnote: t.footnote ?? t.footnotes ?? t.note ?? null })),
            charts: (o?.charts || []).map((ch) => ({ chartType: ch.chartType, title: ch.chartMetadata?.title ?? ch.title ?? null })),
        };
    });
}

// ── Menunggu hasil analisis ─────────────────────────────────────────────────
// MV: toast.promise → "completed successfully" atau "An error occurred".
async function mvRun(c, label) {
    const page = c.page;
    const before = await logCount(page);
    await page.locator("#multivariate-ok-button").click();
    const texts = await waitToast(c, /completed successfully|An error occurred during Multivariate/, label, LONG);
    await page.waitForTimeout(700);
    const after = await logCount(page);
    const res = after > before ? await lastTables(page) : null;
    const run = { label, toast: texts, newLog: after > before, output: digest(res) };
    c.obs.runs.push(run);
    await dismissToasts(page);
    return run;
}
// RM: tidak ada toast sukses; selesai ketika log baru tersimpan, galat → toast.error.
async function rmRun(c, label) {
    const page = c.page;
    const before = await logCount(page);
    await page.getByRole("button", { name: "OK", exact: true }).click();
    const outcome = await Promise.race([
        page.waitForFunction(async (n) => {
            const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
            const db = await req(indexedDB.open("Statify"));
            try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) > n; } finally { db.close(); }
        }, before, { timeout: LONG, polling: 250 }).then(() => "log"),
        page.waitForFunction(() => [...document.querySelectorAll("[data-sonner-toast]")].some((t) => /An error occurred|Please assign/.test(t.innerText)), null, { timeout: LONG, polling: 50 }).then(() => "toast"),
    ]);
    let texts = [];
    if (outcome === "toast") { texts = await toastTexts(page); c.obs.toasts.push({ label, texts, file: await c.snap(page, `toast: ${label}`) }); }
    await page.waitForTimeout(1500);
    const res = (await logCount(page)) > before ? await lastTables(page) : null;
    const run = { label, outcome, toast: texts, newLog: Boolean(res), output: digest(res) };
    c.obs.runs.push(run);
    return run;
}

// ── Halaman Result ──────────────────────────────────────────────────────────
async function gotoResult(page) {
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
}
async function gotoData(page) {
    await page.locator('[data-testid="data-tab"]').click();
    await page.waitForURL(/\/dashboard\/data/, { timeout: 60000 });
    await page.waitForTimeout(500);
}
// Tangkapan satu tabel (log terakhir) berdasarkan teks judul yang tampil.
async function snapTable(c, title, label, { expand = true } = {}) {
    const page = c.page;
    const log = page.locator('[data-testid^="result-log-"]').last();
    const tbl = log.locator('[data-testid^="result-table-"], [data-testid^="result-chart-"]').filter({ hasText: title }).first();
    if (!(await tbl.count())) { c.obs.notes.push(`tabel tidak ditemukan di halaman Result: ${title}`); return null; }
    if (expand) {
        const out = log.locator('[data-testid^="result-output-"]').filter({ has: tbl }).first();
        const toggle = out.locator('[data-testid^="toggle-table-"]').filter({ hasText: /Show Full/ });
        if (await toggle.count()) await toggle.first().click().catch(() => {});
    }
    await tbl.scrollIntoViewIfNeeded();
    return c.snap(tbl, label || title);
}
async function snapCharts(c, label) {
    const log = c.page.locator('[data-testid^="result-log-"]').last();
    const charts = log.locator('[data-testid^="result-chart-"]');
    const n = await charts.count();
    for (let i = 0; i < n; i++) { await charts.nth(i).scrollIntoViewIfNeeded(); await c.page.waitForTimeout(800); await c.snap(charts.nth(i), `${label} ${i + 1}`); }
    return n;
}
async function visibleTitles(page) {
    const log = page.locator('[data-testid^="result-log-"]').last();
    return log.locator('[data-testid^="result-output-"]').evaluateAll((els) => els.map((e) => (e.innerText || "").split(String.fromCharCode(10))[0].trim()));
}

// ── Dialog Multivariate ─────────────────────────────────────────────────────
const mvAvail = (page, name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
const mvInList = (page, list, name) => page.locator(`[data-testid^="variable-item-${list}-"]`, { has: page.locator(`[data-testid^="variable-name-${list}-"]`).filter({ hasText: nameWithLabel(name) }) }).first();
async function mvOpen(c) { await openGlm(c.page, "Multivariate"); await c.page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 }); c.log("buka Analyze → General Linear Model → Multivariate"); }
async function mvDV(c, names) { for (const v of names) await mvAvail(c.page, v).dblclick(); c.log(`DV: ${names.join(", ")}`); }
async function mvTo(c, names, list) {
    for (const v of names) await mvAvail(c.page, v).dragTo(c.page.locator(`[data-testid="${list}-variables-list-container"]`));
    c.log(`${list}: ${names.join(", ")}`);
}
async function mvRemove(c, list, name) { await mvInList(c.page, list, name).dblclick(); c.log(`hapus ${name} dari ${list}`); }
const listNames = (page, list) => page.locator(`[data-testid^="variable-name-${list}-"]`).allTextContents().then((a) => a.map((s) => s.trim()));
async function continueTo(c, okSel) {
    await c.page.getByRole("button", { name: "Continue", exact: true }).last().click();
    await c.page.locator(okSel).waitFor({ state: "visible", timeout: 60000 });
}
async function setChecks(c, dialogBtn, ids, okSel, uncheck = []) {
    await c.page.getByRole("button", { name: dialogBtn, exact: true }).click();
    await c.page.locator(`#${(ids[0] || uncheck[0])}`).waitFor({ state: "visible", timeout: 30000 });
    for (const id of ids) { const b = c.page.locator(`#${id}`); if ((await b.getAttribute("data-state")) !== "checked") await b.click(); }
    for (const id of uncheck) { const b = c.page.locator(`#${id}`); if ((await b.getAttribute("data-state")) === "checked") await b.click(); }
    await continueTo(c, okSel);
    c.log(`${dialogBtn}: centang ${ids.join(", ") || "-"}${uncheck.length ? `; tidak dicentang ${uncheck.join(", ")}` : ""}`);
}
const MVOK = "#multivariate-ok-button";
const dialogTitled = (page, title) => page.getByRole("dialog").filter({ has: page.getByText(title, { exact: true }) });
async function dragBadge(dlg, name, dropLabel) {
    const source = dlg.locator('[draggable="true"]').filter({ hasText: exact(name) }).first();
    const target = dlg.locator("div.flex-col", { has: dlg.page().getByText(new RegExp(`^\\s*${esc(dropLabel)}\\s*$`)) }).last();
    await source.dragTo(target);
    if ((await target.innerText()).split(NL).some((line) => line.trim() === name)) return;
    const dt = await dlg.page().evaluateHandle(() => new DataTransfer());
    await source.dispatchEvent("dragstart", { dataTransfer: dt });
    await target.dispatchEvent("dragover", { dataTransfer: dt });
    await target.dispatchEvent("drop", { dataTransfer: dt });
    await source.dispatchEvent("dragend", { dataTransfer: dt });
}
async function mvModel(c, mode, terms) {
    const page = c.page;
    await page.getByRole("button", { name: "Model", exact: true }).click();
    const dlg = dialogTitled(page, "Multivariate: Model");
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    if (mode === "full") await dlg.locator("#NonCust").click();
    if (mode === "build") {
        await dlg.locator("#Custom").click();
        for (const t of terms) await dragBadge(dlg, t, "Model:");
    }
    if (mode === "custom") {
        await dlg.locator("#BuildCustomTerm").click();
        const src = dlg.locator("div.w-full.p-2", { has: page.getByText(/^\s*Factor & Covariates:\s*$/) }).first();
        const pick = async (v) => { await src.locator("div,span").filter({ hasText: exact(v) }).last().click(); await dlg.getByTitle("Insert Variable").click(); };
        for (const t of terms) {
            // "A * B" → A, By, B; "A(B)" → A, Within, B.
            if (t.includes(" * ")) { const [a, b] = t.split(" * "); await pick(a); await dlg.getByTitle("By").click(); await pick(b); }
            else if (t.includes("(")) { const [a, b] = t.replace(")", "").split("("); await pick(a); await dlg.getByTitle("Within").click(); await pick(b); }
            else await pick(t);
            await dlg.getByTitle("Add", { exact: true }).click();
        }
    }
    const model = dlg.locator("div.flex-col", { has: page.getByText(/^\s*Model:\s*$/) }).last();
    const shown = (await model.innerText()).split(NL).map((s) => s.trim()).filter((s) => s && s !== "Model:");
    c.note(`model-${mode}-terms`, shown);
    const file = await c.snap(dlg, `dialog Model (${mode}): ${shown.join("; ")}`);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
    c.log(`Model: ${mode} ${JSON.stringify(terms || [])} → kotak Model: ${JSON.stringify(shown)} (${file})`);
    return shown;
}
async function mvTestValues(c, values) {
    const page = c.page;
    await page.getByRole("button", { name: "Test Values", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).last().waitFor({ timeout: 30000 });
    const inputs = page.locator('[id^="mu0-"]');
    const n = await inputs.count();
    const before = [];
    for (let i = 0; i < n; i++) before.push({ id: await inputs.nth(i).getAttribute("id"), value: await inputs.nth(i).inputValue() });
    if (values) for (let i = 0; i < values.length; i++) await page.locator(`#mu0-${i}`).fill(String(values[i]));
    return { n, before };
}
async function mvPosthoc(c, factor, methods) {
    const page = c.page;
    await page.getByRole("button", { name: "Post Hoc", exact: true }).click();
    const dlg = dialogTitled(page, "Multivariate: Post Hoc");
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    if (factor) await dragBadge(dlg, factor, "Post Hoc Tests for:");
    for (const id of methods) { const b = dlg.locator(`#${id}`); if ((await b.getAttribute("data-state")) !== "checked") await b.click(); }
    return dlg;
}

// ── Dialog Repeated Measures ────────────────────────────────────────────────
async function rmOpen(c) { await openGlm(c.page, "Repeated Measures"); await c.page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 }); c.log("buka Analyze → General Linear Model → Repeated Measures"); }
async function rmAddFactor(c, name, levels) {
    await c.page.locator("#factorName").fill(String(name));
    // Kolom level bertipe number: dikosongkan lalu diketik tombol demi tombol,
    // seperti pengguna (huruf diabaikan browser).
    await c.page.locator("#factorLevels").fill("");
    await c.page.locator("#factorLevels").pressSequentially(String(levels));
    await c.page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
}
async function rmAddMeasure(c, name) {
    await c.page.locator("#measureName").fill(name);
    await c.page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
}
const within = (page) => page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
const between = (page) => page.locator("div", { has: page.getByText("Between-Subjects Factor(s):", { exact: true }) }).last();
async function rmDefine(c, factor, levels, measures) {
    await rmAddFactor(c, factor, levels);
    for (const m of measures) await rmAddMeasure(c, m);
    await c.page.getByRole("button", { name: "Define", exact: true }).click();
    await within(c.page).waitFor({ state: "visible", timeout: 60000 });
    c.log(`Define: ${factor}(${levels}); measure ${measures.join(", ")}`);
}
const rmBadge = (page, v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
async function rmSlots(c, measures) {
    const page = c.page;
    for (const [m, cols] of measures) for (let i = 0; i < cols.length; i++) {
        const text = `${cols[i]}_(${i + 1},${m})`;
        if (!(await within(page).getByText(text, { exact: true }).count())) await rmBadge(page, cols[i]).dragTo(within(page));
    }
    c.log(`slot within: ${measures.map(([m, cols]) => `${m}=${cols.join(",")}`).join("; ")}`);
}
async function rmBetween(c, names) { for (const b of names) await rmBadge(c.page, b).dragTo(between(c.page)); c.log(`Between-Subjects Factor(s): ${names.join(", ")}`); }
const RMOK = "text=Within-Subjects Variables:";
async function rmOptions(c, ids, uncheck = []) { await setChecks(c, "Options", ids, RMOK, uncheck); }

// ── Skenario ────────────────────────────────────────────────────────────────
const OPT = ["DescStats", "EstEffectSize", "ObsPower"];
const S = {};

S["BB-KF01-01"] = async (c) => {
    await importCsv(c, path.join(MVD, "two-way manova.csv"));
    await c.page.locator('[data-testid="analyze-menu-trigger"]').click();
    await c.page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await c.page.getByRole("menuitem", { name: "Multivariate", exact: true }).waitFor();
    await c.snap(c.page, "menu Analyze → General Linear Model");
    await c.page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
    await c.page.locator(MVOK).waitFor();
    const p = c.page;
    const btns = {};
    for (const b of ["Model", "Contrasts", "Plots", "Post Hoc", "EM Means", "Save", "Options", "Bootstrap", "Test Values", "Paired", "Reset", "Cancel", "OK"]) {
        const l = p.getByRole("button", { name: b, exact: true });
        btns[b] = (await l.count()) ? (await l.first().isDisabled() ? "nonaktif" : "aktif") : "tidak ada";
    }
    c.note("tombol", btns);
    c.note("daftar", await p.locator('[data-testid$="-list-title"]').allInnerTexts());
    c.note("catatanPlots", await p.getByText("Plots are not supported in this version.", { exact: true }).count());
    await c.snap(c.page, "dialog Multivariate");
};

S["BB-KF01-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "two-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["Y1A1", "Y2A1"]); await mvTo(c, ["faktorA"], "FixFactor");
    await mvRun(c, "OK langkah 1");
    await mvOpen(c);
    c.note("langkah2", { dv: await listNames(p, "DepVar"), fix: await listNames(p, "FixFactor") });
    await c.snap(p, "langkah 2: dialog dibuka lagi");
    await mvTo(c, ["faktorB"], "FixFactor");
    await p.getByRole("button", { name: "Cancel", exact: true }).click();
    await p.locator(MVOK).waitFor({ state: "detached", timeout: 30000 });
    await mvOpen(c);
    c.note("langkah3", { dv: await listNames(p, "DepVar"), fix: await listNames(p, "FixFactor") });
    await c.snap(p, "langkah 3: setelah Cancel, dialog dibuka lagi");
    await p.getByRole("button", { name: "Reset", exact: true }).click();
    await p.waitForTimeout(800);
    const l4 = { dv: await listNames(p, "DepVar"), fix: await listNames(p, "FixFactor"), cov: await listNames(p, "Covar") };
    await c.snap(p, "langkah 4: setelah Reset");
    await p.getByRole("button", { name: "Model", exact: true }).click();
    const md = dialogTitled(p, "Multivariate: Model"); await md.waitFor();
    l4.fullFactorial = await md.locator("#NonCust").getAttribute("data-state");
    await md.getByRole("button", { name: "Cancel", exact: true }).click();
    await p.getByRole("button", { name: "Options", exact: true }).click();
    await p.locator("#DescStats").waitFor();
    l4.options = {};
    for (const id of ["DescStats", "EstEffectSize", "ObsPower", "HomogenTest", "ResPlot"]) l4.options[id] = await p.locator(`#${id}`).getAttribute("data-state");
    await c.snap(p, "langkah 4: Options setelah Reset");
    c.note("langkah4", l4);
};

S["BB-KF02-01"] = async (c) => {
    await importCsv(c, path.join(MVD, "hotelling 1 populasi.csv"));
    await mvOpen(c); await mvDV(c, ["mpg", "disp", "hp", "wt"]);
    const tv = await mvTestValues(c, [20, 200, 150, 3]); c.note("testValuesInputs", tv.n);
    await continueTo(c, MVOK);
    await setChecks(c, "Options", OPT, MVOK);
    await mvRun(c, "OK");
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests", "Multivariate Tests");
    await snapTable(c, "Descriptive Statistics");
};

S["BB-KF02-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "hotelling 1 populasi.csv"));
    await mvOpen(c); await mvDV(c, ["mpg", "disp", "hp", "wt"]);
    await mvTestValues(c, [20, 200, 150, 3]); await continueTo(c, MVOK);
    await mvRemove(c, "DepVar", "wt");
    const l3 = await mvTestValues(c); c.note("langkah3", l3);
    await c.snap(p, "langkah 3: Test Values setelah wt dihapus");
    // Langkah 3 ditutup dengan Continue (isian 3 nilai disimpan).
    await continueTo(c, MVOK);
    await mvDV(c, ["wt"]);
    const l4 = await mvTestValues(c); c.note("langkah4", l4);
    await c.snap(p, "langkah 4: Test Values setelah wt ditambah lagi");
    // Varian: langkah 3 ditutup dengan Cancel (hanya dicatat di Keterangan).
    await p.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await p.locator(MVOK).waitFor();
    await mvRemove(c, "DepVar", "wt");
    await mvTestValues(c);
    await p.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await p.locator(MVOK).waitFor();
    await mvDV(c, ["wt"]);
    c.note("variantCancelLangkah4", await mvTestValues(c));
    await continueTo(c, MVOK);
    await mvRun(c, "OK");
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
};

S["BB-KF02-03"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "hotelling 1 populasi.csv"));
    await mvOpen(c); await mvDV(c, ["mpg"]);
    await mvTestValues(c, [20]); await continueTo(c, MVOK);
    const before = await logCount(p);
    await p.locator(MVOK).click();
    await waitToast(c, /Please select/, "OK dengan 1 DV");
    await p.waitForTimeout(1500);
    c.note("dialogMasihTerbuka", await p.locator(MVOK).isVisible());
    c.note("logBaru", (await logCount(p)) > before);
};

async function mv2(c, variance) {
    await importCsv(c, path.join(MVD, "hotelling 2 populasi independen.csv"));
    await mvOpen(c); await mvDV(c, ["x1", "x2", "x3", "x4"]);
    c.note("radioSebelumFaktor", await c.page.locator("#variance-pooled").count());
    await mvTo(c, ["jk"], "FixFactor");
    c.note("radioSatuFaktor", await c.page.locator("#variance-pooled").count());
    await c.page.locator(`#${variance}`).click();
    c.log(`Covariance Matrices: ${variance}`);
}
S["BB-KF03-01"] = async (c) => {
    const p = c.page;
    await mv2(c, "variance-pooled");
    await c.snap(p, "dialog: radio Covariance Matrices dengan satu faktor");
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    await mvRun(c, "OK Equal");
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
    await snapTable(c, "Box's Test of Equality of Covariance Matrices");
    await snapTable(c, "Levene's Test of Equality of Error Variances");
    // Langkah 6: dataset ini hanya punya satu kandidat faktor (jk); radio diperiksa
    // dengan dua faktor memakai x4 sebagai faktor kedua (hanya tampilan dialog).
    await gotoData(p);
    await mvOpen(c);
    await mvRemove(c, "DepVar", "x4");
    await mvTo(c, ["x4"], "FixFactor");
    c.note("radioDuaFaktor", await p.locator("#variance-pooled").count());
    await c.snap(p, "langkah 6: dua Fixed Factor (jk, x4), radio tidak tampil");
    await p.getByRole("button", { name: "Cancel", exact: true }).click();
};
S["BB-KF03-02"] = async (c) => {
    await mv2(c, "variance-welch");
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    await mvRun(c, "OK Unequal");
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests");
};
S["BB-KF03-03"] = async (c) => {
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    await c.page.locator("#variance-welch").click();
    await mvRun(c, "OK Unequal, 3 level");
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    await snapTable(c, "Errors Logs");
};

async function pairedOpen(c) {
    const p = c.page;
    await p.getByRole("button", { name: "Paired", exact: true }).click();
    const dlg = p.getByRole("dialog").filter({ hasText: "Paired (Hotelling T²)" });
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    return dlg;
}
S["BB-KF04-01"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "hotelling berpasangan (data asli).csv"));
    await mvOpen(c);
    const dlg = await pairedOpen(c);
    const avail = dlg.locator("#multivariate-paired-available-variables");
    for (const v of ["kedalaman1", "kedalaman2", "ukuran1", "ukuran2"]) await avail.getByText(v, { exact: true }).first().dblclick();
    c.note("labelSelisih", await dlg.getByText(/^d\d = /).allInnerTexts());
    await c.snap(dlg, "subdialog Paired dengan preview vektor selisih");
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await p.locator(MVOK).waitFor();
    await setChecks(c, "Options", OPT, MVOK);
    await mvRun(c, "OK Paired");
    await gotoResult(p);
    await snapTable(c, "Hotelling T² Berpasangan");
};
S["BB-KF04-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "hotelling berpasangan (data asli).csv"));
    await mvOpen(c);
    let dlg = await pairedOpen(c);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await waitToast(c, /Tambahkan minimal/, "Continue tanpa pasangan");
    c.note("terbuka1", await dlg.isVisible());
    await dismissToasts(p);
    const avail = dlg.locator("#multivariate-paired-available-variables");
    await avail.getByText("kedalaman1", { exact: true }).first().dblclick();
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    // Toast apa pun yang benar-benar tampil dicatat (tidak diasumsikan).
    await waitToast(c, /Tambahkan minimal|belum lengkap|Pasangan harus/, "Continue dengan Variable 1 saja");
    c.note("terbuka2", await dlg.isVisible());
    await dismissToasts(p);
    // Langkah 3: kedalaman1 juga sebagai Variable 2. Double-click dari daftar
    // sumber bila masih ada; bila tidak, drag sel Variable 1 ke kolom Variable 2.
    const again = avail.getByText("kedalaman1", { exact: true });
    c.note("kedalaman1DiAvailableSetelahDipakai", await again.count());
    if (await again.count()) await again.first().dblclick();
    else {
        c.obs.notes.push("kedalaman1 tidak lagi tersedia di Available Variables setelah dipakai sebagai Variable 1; dicoba drag dari sel Variable 1 ke kolom Variable 2");
        const testArea = dlg.locator("#multivariate-paired-test-variables");
        const cell = testArea.getByText("kedalaman1", { exact: true }).first();
        const v2head = testArea.getByText("Variable 2", { exact: true }).first();
        const box = await v2head.boundingBox();
        await cell.dragTo(testArea, box ? { targetPosition: { x: box.x - (await testArea.boundingBox()).x + 20, y: box.y - (await testArea.boundingBox()).y + 45 } } : {}).catch((e) => c.obs.notes.push(`drag gagal: ${String(e.message).split(NL)[0]}`));
        await p.waitForTimeout(700);
        const t = await toastTexts(p);
        if (t.length) c.obs.toasts.push({ label: "drag kedalaman1 ke Variable 2", texts: t, file: await c.snap(p, "toast setelah drag") });
        await dismissToasts(p);
    }
    await p.waitForTimeout(300);
    c.note("isiPasangan", await dlg.locator("#multivariate-paired-test-variables").innerText());
    await c.snap(dlg, "pasangan (kedalaman1, kedalaman1)");
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await waitToast(c, /Pasangan harus|belum lengkap|Tambahkan/, "Continue dengan variabel sama", 5000).catch(() => c.obs.notes.push("tidak ada toast setelah Continue langkah 3"));
    c.note("terbuka3", await dlg.isVisible());
};

S["BB-KF05-01"] = async (c) => {
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    await setChecks(c, "Options", OPT, MVOK);
    await mvRun(c, "OK");
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests");
    await snapTable(c, "Tests of Between-Subjects Effects");
};
S["BB-KF05-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]);
    const before = await logCount(p);
    await p.locator(MVOK).click();
    await waitToast(c, /Please select/, "OK tanpa faktor/kovariat");
    await p.waitForTimeout(1500);
    c.note("logBaru", (await logCount(p)) > before);
};

async function mvTwoWay(c) {
    await importCsv(c, path.join(MVD, "two-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["Y1A1", "Y2A1"]); await mvTo(c, ["faktorA", "faktorB"], "FixFactor");
}
async function snapTwoWay(c) {
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests");
    await snapTable(c, "Tests of Between-Subjects Effects");
    await snapTable(c, "Levene's Test of Equality of Error Variances");
}
S["BB-KF06-01"] = async (c) => {
    await mvTwoWay(c); await mvModel(c, "full");
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    await mvRun(c, "OK Full Factorial"); await snapTwoWay(c);
};
S["BB-KF06-02"] = async (c) => {
    await mvTwoWay(c); await mvModel(c, "build", ["faktorA", "faktorB"]);
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    await mvRun(c, "OK Build Terms"); await snapTwoWay(c);
};
S["BB-KF06-03"] = async (c) => {
    const p = c.page;
    await mvTwoWay(c); await mvModel(c, "custom", ["faktorA", "faktorB"]);
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    await mvRun(c, "OK Build Custom Terms tanpa interaksi");
    await gotoResult(p); await snapTable(c, "Multivariate Tests", "langkah 2: Multivariate Tests");
    await gotoData(p); await mvOpen(c);
    await mvModel(c, "custom", ["faktorA * faktorB"]);
    await mvRun(c, "OK Build Custom Terms dengan faktorA * faktorB");
    await gotoResult(p); await snapTable(c, "Multivariate Tests", "langkah 3: Multivariate Tests");
};
async function rejected(c) {
    const p = c.page;
    const before = await logCount(p);
    const run = await mvRun(c, "OK model kustom");
    c.note("logBaru", run.newLog);
    await gotoResult(p).catch(() => c.obs.notes.push("halaman Result: tidak ada log"));
    c.note("logDiHalamanResult", await p.locator('[data-testid^="result-log-"]').count());
    c.note("logSebelum", before);
}
S["BB-KF06-04"] = async (c) => { await mvTwoWay(c); await mvModel(c, "build", []); await rejected(c); };
S["BB-KF06-05"] = async (c) => {
    await mvTwoWay(c); await mvModel(c, "build", ["faktorA", "faktorB"]);
    await mvRemove(c, "FixFactor", "faktorB");
    await rejected(c);
};
S["BB-KF06-06"] = async (c) => {
    await importCsv(c, path.join(MVD, "hotelling 2 populasi independen.csv"));
    await mvOpen(c); await mvDV(c, ["x1", "x2", "x3"]); await mvTo(c, ["jk"], "FixFactor"); await mvTo(c, ["x4"], "Covar");
    await mvModel(c, "custom", ["jk", "x4", "jk * x4"]);
    await rejected(c);
};
S["BB-KF06-07"] = async (c) => { await mvTwoWay(c); await mvModel(c, "build", ["faktorA"]); await rejected(c); };
S["BB-KF06-08"] = async (c) => { await mvTwoWay(c); await mvModel(c, "custom", ["faktorA", "faktorB", "faktorA(faktorB)"]); await rejected(c); };
S["BB-KF06-09"] = async (c) => {
    await importCsv(c, path.join(MVX, "multivariate-100.csv"));
    await mvOpen(c); await mvDV(c, ["Y1", "Y2"]); await mvTo(c, ["F1", "F2", "F3"], "FixFactor");
    await mvModel(c, "custom", ["F1", "F2", "F3", "F1 * F2"]);
    await rejected(c);
};

S["BB-KF10-01"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    await setChecks(c, "Options", OPT, MVOK, ["HomogenTest"]);
    await mvRun(c, "langkah 3: Homogenity Tests tidak dicentang");
    await gotoResult(p); c.note("judulLangkah3", await visibleTitles(p));
    await c.snap(p, "langkah 3: halaman Result (tanpa Box/Levene)");
    await gotoData(p); await mvOpen(c);
    await setChecks(c, "Options", ["HomogenTest"], MVOK);
    await mvRun(c, "langkah 4: Homogenity Tests dicentang");
    await gotoResult(p); c.note("judulLangkah4", await visibleTitles(p));
    await snapTable(c, "Box's Test of Equality of Covariance Matrices", "langkah 4: Box's M");
    await snapTable(c, "Levene's Test of Equality of Error Variances", "langkah 4: Levene");
};
S["BB-KF10-02"] = async (c) => {
    await mvTwoWay(c); await mvModel(c, "build", ["faktorA", "faktorB"]);
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    await mvRun(c, "OK Build Terms + Homogenity Tests");
    await gotoResult(c.page);
    await snapTable(c, "Levene's Test of Equality of Error Variances");
};

S["BB-KF11-01"] = async (c) => {
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    const dlg = await mvPosthoc(c, null, []);
    const ids = await dlg.locator('button[role="checkbox"]').evaluateAll((els) => els.map((e) => ({ id: e.id, disabled: e.disabled })));
    c.note("checkbox", ids);
    c.note("catatan", await dlg.getByText("Only LSD, Bonferroni, and Sidak are supported in this version.", { exact: true }).count());
    await c.snap(dlg, "dialog Multivariate: Post Hoc");
};
S["BB-KF11-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    for (const [i, m] of ["Lsd", "Bonfe", "Sidak"].entries()) {
        if (i) await gotoData(p);
        await mvOpen(c);
        if (!i) { await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor"); }
        const dlg = await mvPosthoc(c, i ? null : "treatment", [m]);
        for (const o of ["Lsd", "Bonfe", "Sidak"].filter((x) => x !== m)) { const b = dlg.locator(`#${o}`); if ((await b.getAttribute("data-state")) === "checked") await b.click(); }
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await p.locator(MVOK).waitFor();
        c.log(`Post Hoc: treatment, ${m} saja`);
        await mvRun(c, `OK ${m}`);
        await gotoResult(p);
        await snapTable(c, "Multiple Comparisons", `Multiple Comparisons ${m}`);
    }
};
S["BB-KF11-03"] = async (c) => {
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    const dlg = await mvPosthoc(c, "treatment", ["Lsd", "Bonfe", "Sidak"]);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await c.page.locator(MVOK).waitFor();
    await mvRun(c, "OK LSD+Bonferroni+Sidak");
    await gotoResult(c.page);
    await snapTable(c, "Multiple Comparisons");
};

S["BB-KF13-01"] = async (c) => {
    await importCsv(c, path.join(MVD, "hotelling 2 populasi independen dengan nilai hilang.csv"));
    await mvOpen(c); await mvDV(c, ["x1", "x2", "x3", "x4"]); await mvTo(c, ["jk"], "FixFactor");
    await c.page.locator("#variance-pooled").click();
    await setChecks(c, "Options", [...OPT, "HomogenTest"], MVOK);
    await mvRun(c, "OK");
    await gotoResult(c.page);
    await snapTable(c, "Errors Logs");
    await snapTable(c, "Multivariate Tests");
};
S["BB-KF13-02"] = async (c) => {
    await importCsv(c, path.join(BBD, "bb-mv-no-complete.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    const run = await mvRun(c, "OK");
    c.note("logBaru", run.newLog);
};
S["BB-KF13-03"] = async (c) => {
    await importCsv(c, path.join(BBD, "bb-mv-singular.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2", "y3"]); await mvTo(c, ["treatment"], "FixFactor");
    await mvRun(c, "OK");
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    await snapTable(c, "Errors Logs");
    await c.snap(c.page, "halaman Result");
};

// Responsivitas selama analisis: gulir, buka menu, status toast/dialog.
async function responsiveProbe(c, isRunning, runningToast) {
    const p = c.page;
    const probes = [];
    for (let k = 0; k < 3 && (await isRunning()); k++) {
        const pr = { t: k };
        pr.running = true;
        if (runningToast) pr.runningToast = (await toastTexts(p)).some((t) => t.includes(runningToast));
        const scroller = await p.evaluate(() => {
            const els = [document.scrollingElement, ...document.querySelectorAll("*")].filter((e) => e && e.scrollHeight > e.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(e).overflowY || "") || e === document.scrollingElement);
            const best = els.filter(Boolean).sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
            if (!best) return null;
            best.setAttribute("data-bb-scroller", "1");
            return { top: best.scrollTop, max: best.scrollHeight - best.clientHeight };
        });
        const box = await p.locator("[data-bb-scroller]").first().boundingBox().catch(() => null);
        if (box) await p.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 400));
        await p.mouse.wheel(0, 400);
        await p.waitForTimeout(300);
        const after = await p.evaluate(() => { const e = document.querySelector("[data-bb-scroller]"); return e ? e.scrollTop : null; });
        pr.scrolled = scroller ? after !== scroller.top : null;
        // Buka menu File lalu tutup lagi.
        pr.menuOpened = await p.locator('[data-testid="file-menu-trigger"]').click({ timeout: 3000 }).then(async () => {
            const ok = await p.locator('[data-testid="file-menu-import-trigger"]').isVisible().catch(() => false);
            await p.keyboard.press("Escape");
            return ok;
        }, (e) => `gagal: ${String(e.message).split(NL)[0]}`);
        if (k === 0) await c.snap(p, "selama analisis: menu File terbuka / status toast");
        pr.stillRunning = await isRunning();
        probes.push(pr);
        await p.waitForTimeout(700);
    }
    return probes;
}
S["BB-KF13-04"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVX, "multivariate-2000.csv"));
    await mvOpen(c); await mvDV(c, ["Y1", "Y2", "Y3", "Y4", "Y5"]); await mvTo(c, ["F1", "F2", "F3"], "FixFactor");
    await setChecks(c, "Options", OPT, MVOK);
    const before = await logCount(p);
    await p.locator(MVOK).click();
    await p.waitForFunction(() => [...document.querySelectorAll("[data-sonner-toast]")].some((t) => /Running Multivariate/.test(t.innerText)), null, { timeout: 30000, polling: 50 });
    const running = async () => (await toastTexts(p)).some((t) => t.includes("Running Multivariate analysis..."));
    c.note("probe", await responsiveProbe(c, running, "Running Multivariate analysis..."));
    await waitToast(c, /completed successfully|An error occurred/, "hasil", LONG);
    await p.waitForTimeout(800);
    const res = (await logCount(p)) > before ? await lastTables(p) : null;
    c.obs.runs.push({ label: "OK 2000 kasus", output: digest(res), newLog: Boolean(res) });
    await dismissToasts(p);
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
};

S["BB-KF14-01"] = async (c) => {
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    await setChecks(c, "Options", ["ResPlot"], MVOK);
    await mvRun(c, "OK Residual Plots");
    await gotoResult(c.page);
    c.note("jumlahGrafik", await snapCharts(c, "grafik residual"));
};
S["BB-KF14-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c);
    const b = p.locator("#multivariate-plots-button");
    c.note("plotsDisabled", await b.isDisabled());
    await b.hover({ force: true }).catch(() => {});
    await b.click({ force: true, timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(600);
    c.note("dialogPlotsTerbuka", await p.getByText("Multivariate: Plots", { exact: true }).count());
    c.note("catatan", await p.getByText("Plots are not supported in this version.", { exact: true }).count());
    await c.snap(p, "tombol Plots nonaktif dengan keterangan");
};

// ── Repeated Measures ───────────────────────────────────────────────────────
S["BB-KF07-01"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c);
    const defBtns = {};
    for (const b of ["Add", "Change", "Remove", "Reset", "Cancel", "Define"]) defBtns[b] = await p.getByRole("button", { name: b, exact: true }).count();
    c.note("tombolDefine", defBtns);
    c.note("labelDefine", { factor: await p.getByText("Within-Subject Factor Name:").count(), levels: await p.getByText("Number of Levels:").count(), measure: await p.getByText("Measure Name:").count() });
    await c.snap(p, "dialog Define");
    await rmDefine(c, "waktu", 4, ["skor"]);
    const btns = {};
    for (const b of ["Model", "Contrasts", "Plots", "Post Hoc", "EM Means", "Save", "Options", "Back to Define", "Reset", "Cancel", "OK"]) {
        const l = p.getByRole("button", { name: b, exact: true });
        btns[b] = (await l.count()) ? (await l.first().isDisabled() ? "nonaktif" : "aktif") : "tidak ada";
    }
    c.note("tombolUtama", btns);
    c.note("daftar", { within: await p.getByText("Within-Subjects Variables:", { exact: true }).count(), between: await p.getByText("Between-Subjects Factor(s):", { exact: true }).count(), cov: await p.getByText(/^Covariates/).count() });
    await c.snap(p, "dialog utama Repeated Measures");
};
S["BB-KF07-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c); await rmDefine(c, "waktu", 4, ["skor"]);
    await p.getByRole("button", { name: "Back to Define", exact: true }).click();
    await p.locator("#factorName").waitFor();
    c.note("langkah2Define", { factor: await p.getByText("waktu(4)", { exact: true }).count(), measure: await p.getByText("skor", { exact: true }).count() });
    await c.snap(p, "langkah 2: Back to Define");
    await p.getByRole("button", { name: "Define", exact: true }).click();
    await within(p).waitFor();
    await rmSlots(c, [["skor", ["w1", "w2", "w3", "w4"]]]); await rmBetween(c, ["kelompok"]);
    await rmRun(c, "langkah 3: OK");
    await rmOpen(c);
    c.note("langkah4Define", { factor: await p.getByText("waktu(4)", { exact: true }).count(), measure: await p.getByText("skor", { exact: true }).count() });
    await p.getByRole("button", { name: "Define", exact: true }).click();
    await within(p).waitFor();
    c.note("langkah4Main", { slot: await within(p).getByText("w1_(1,skor)", { exact: true }).count(), between: await between(p).getByText("kelompok", { exact: true }).count() });
    await c.snap(p, "langkah 4: dialog dibuka lagi");
    await rmBadge(p, "subjek").dragTo(between(p));
    c.note("langkah5SebelumCancel", await between(p).getByText("subjek", { exact: true }).count());
    await p.getByRole("button", { name: "Cancel", exact: true }).click();
    await within(p).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
    await rmOpen(c); await p.getByRole("button", { name: "Define", exact: true }).click(); await within(p).waitFor();
    c.note("langkah5", { subjek: await between(p).getByText("subjek", { exact: true }).count(), kelompok: await between(p).getByText("kelompok", { exact: true }).count() });
    await c.snap(p, "langkah 5: setelah Cancel, dibuka lagi");
    await p.getByRole("button", { name: "Reset", exact: true }).click();
    await p.waitForTimeout(800);
    c.note("langkah6Main", { slotTerisi: await within(p).getByText("w1_(1,skor)", { exact: true }).count(), kelompok: await between(p).getByText("kelompok", { exact: true }).count() });
    await c.snap(p, "langkah 6: Reset di dialog utama");
    await p.getByRole("button", { name: "Back to Define", exact: true }).click();
    await p.locator("#factorName").waitFor();
    await p.getByRole("button", { name: "Reset", exact: true }).click();
    await p.waitForTimeout(800);
    c.note("langkah6Define", { factor: await p.getByText("waktu(4)", { exact: true }).count(), measure: await p.getByText("skor", { exact: true }).count() });
    await c.snap(p, "langkah 6: Reset di Define");
};
S["BB-KF08-01"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c);
    await rmAddFactor(c, "waktu", 4); await rmAddMeasure(c, "skor");
    c.note("daftarDefine", { factor: await p.getByText("waktu(4)", { exact: true }).count(), measure: await p.getByText("skor", { exact: true }).count() });
    await c.snap(p, "Define: waktu(4), skor");
    await p.getByRole("button", { name: "Define", exact: true }).click();
    await within(p).waitFor();
    c.note("slotKosong", await within(p).innerText());
    await c.snap(p, "dialog utama: 4 slot");
    await rmSlots(c, [["skor", ["w1", "w2", "w3", "w4"]]]);
    c.note("slotTerisi", await within(p).innerText());
    await c.snap(p, "slot terisi w1–w4");
};
S["BB-KF08-02"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c);
    const tries = [
        ["nama faktor kosong", () => rmAddFactor(c, "", 4)],
        ["nama faktor 'wak tu'", () => rmAddFactor(c, "wak tu", 4)],
        ["level 'abc'", () => rmAddFactor(c, "waktu", "abc")],
        ["level 1", () => rmAddFactor(c, "waktu", 1)],
        ["level 100", () => rmAddFactor(c, "waktu", 100)],
        ["measure kosong", () => rmAddMeasure(c, "")],
        ["measure 'sk-or'", () => rmAddMeasure(c, "sk-or")],
        ["measure skor pertama", () => rmAddMeasure(c, "skor")],
        ["measure skor kedua", () => rmAddMeasure(c, "skor")],
    ];
    const got = [];
    for (const [label, act] of tries) {
        await dismissToasts(p);
        await act();
        await p.waitForTimeout(700);
        const texts = await toastTexts(p);
        let file = null;
        if (texts.length) file = await c.snap(p, `toast: ${label}`);
        c.obs.toasts.push({ label, texts, file });
        got.push({ label, texts });
    }
    c.note("input level", await p.locator("#factorLevels").getAttribute("type"));
    c.note("daftarAkhir", { faktor: await p.getByText(/^\s*\S+\(\d+\)\s*$/).allInnerTexts(), skor: await p.getByText("skor", { exact: true }).count() });
};
S["BB-KF08-03"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c);
    await p.getByRole("button", { name: "Define", exact: true }).click();
    await waitToast(c, /Add a within-subjects factor/, "Define tanpa faktor");
    c.note("defineTerbuka1", await p.locator("#factorName").isVisible());
    await dismissToasts(p);
    await rmAddFactor(c, "waktu", 4);
    await p.getByRole("button", { name: "Define", exact: true }).click();
    await waitToast(c, /Add a measure name/, "Define tanpa measure");
    c.note("defineTerbuka2", await p.locator("#factorName").isVisible());
};
S["BB-KF08-04"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c);
    await rmAddFactor(c, "waktu", 4);
    await dismissToasts(p);
    await rmAddFactor(c, "kondisi", 2);
    await waitToast(c, /more than one within-subjects factor/, "Add faktor kedua");
    await p.waitForTimeout(400);
    c.note("faktorTerdaftar", { waktu: await p.getByText("waktu(4)", { exact: true }).count(), kondisi: await p.getByText("kondisi(2)", { exact: true }).count() });
};
S["BB-KF08-05"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c); await rmDefine(c, "waktu", 4, ["skor"]);
    await rmSlots(c, [["skor", ["w1", "w2", "w3"]]]);
    const before = await logCount(p);
    await p.getByRole("button", { name: "OK", exact: true }).click();
    await waitToast(c, /Please assign a variable/, "OK dengan slot ke-4 kosong");
    await p.waitForTimeout(1500);
    c.note("logBaru", (await logCount(p)) > before);
    c.note("dialogTerbuka", await within(p).isVisible());
};

async function rmDesign(c, csv, factor, levels, measures, betweenF = []) {
    await importCsv(c, path.join(RMD, csv));
    await rmOpen(c); await rmDefine(c, factor, levels, measures.map(([m]) => m));
    await rmSlots(c, measures);
    if (betweenF.length) await rmBetween(c, betweenF);
}
S["BB-KF09-01"] = async (c) => {
    await rmDesign(c, "gambar51.csv", "perlakuan", 4, [["anjing", ["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"]]]);
    await rmRun(c, "OK");
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    for (const t of ["Multivariate Tests", "Mauchly's Test of Sphericity", "Tests of Within-Subjects Effects", "Tests of Within-Subjects Contrasts"]) await snapTable(c, t);
};
S["BB-KF09-02"] = async (c) => {
    await rmDesign(c, "rm_a.csv", "waktu", 3, [["cemas", ["cemas1", "cemas2", "cemas3"]], ["stres", ["stres1", "stres2", "stres3"]]]);
    await rmOptions(c, OPT);
    await rmRun(c, "OK");
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    await snapTable(c, "Tests of Within-Subjects Effects (Multivariate)");
    await snapTable(c, "Multivariate Tests");
};
S["BB-KF09-03"] = async (c) => {
    const p = c.page;
    await rmDesign(c, "rm_b.csv", "waktu", 4, [["skor", ["w1", "w2", "w3", "w4"]]], ["kelompok"]);
    await rmOptions(c, OPT);
    await p.getByRole("button", { name: "Contrasts", exact: true }).click();
    const dlg = p.getByRole("dialog").filter({ hasText: "Repeated Measures: Contrast" });
    await dlg.waitFor();
    await dlg.getByText(/^\s*waktu\s*\(/).first().click();
    // Catatan dihitung sebelum dropdown dibuka (dropdown membuat isi dialog aria-hidden).
    c.note("catatanKontras", await dlg.getByText("Only Polynomial (default) and Repeated contrasts are supported in this version.", { exact: true }).count());
    await c.snap(dlg, "dialog Contrast dengan catatan");
    await dlg.getByRole("combobox").click();
    c.note("pilihanKontras", await p.getByRole("option").allTextContents());
    await c.snap(p, "dialog Contrast: pilihan kontras");
    await p.getByRole("option", { name: "Repeated", exact: true }).click();
    await dlg.getByRole("button", { name: "Change", exact: true }).click();
    c.note("daftarFaktorKontras", await dlg.getByText(/^\s*waktu\s*\(/).allInnerTexts());
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await within(p).waitFor();
    c.log("Contrasts: waktu → Repeated → Change → Continue");
    await rmRun(c, "OK");
    await gotoResult(p);
    await snapTable(c, "Tests of Within-Subjects Contrasts");
};
S["BB-KF10-03"] = async (c) => {
    const p = c.page;
    await rmDesign(c, "rm_c.csv", "sesi", 3, [["nilai", ["p1", "p2", "p3"]]], ["metode"]);
    await rmOptions(c, OPT, ["HomogenTest"]);
    await rmRun(c, "langkah 3: Homogenity Tests tidak dicentang");
    await gotoResult(p); c.note("judulLangkah3", await visibleTitles(p));
    await snapTable(c, "Mauchly's Test of Sphericity", "langkah 3: Mauchly");
    await gotoData(p);
    await rmOpen(c); await p.getByRole("button", { name: "Define", exact: true }).click(); await within(p).waitFor();
    // Define mengembalikan slot ke placeholder (lihat BB-KF07-02); slot diisi lagi.
    await rmSlots(c, [["nilai", ["p1", "p2", "p3"]]]);
    if (!(await between(p).getByText("metode", { exact: true }).count())) await rmBetween(c, ["metode"]);
    await rmOptions(c, ["HomogenTest"]);
    await rmRun(c, "langkah 4: Homogenity Tests dicentang");
    await gotoResult(p); c.note("judulLangkah4", await visibleTitles(p));
    await snapTable(c, "Box's Test of Equality of Covariance Matrices", "langkah 4: Box's M");
    await snapTable(c, "Levene's Test of Equality of Error Variances", "langkah 4: Levene");
    await snapTable(c, "Mauchly's Test of Sphericity", "langkah 4: Mauchly");
};
S["BB-KF11-04"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_c.csv"));
    await rmOpen(c); await rmDefine(c, "sesi", 3, ["nilai"]);
    const b = p.locator("#repeated-measures-posthoc-button");
    c.note("postHocDisabled", await b.isDisabled());
    await b.click({ force: true, timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(600);
    c.note("dialogPostHocTerbuka", await p.getByText("Repeated Measures: Post Hoc", { exact: true }).count());
    c.note("catatan", await p.getByText("Post Hoc is not supported in this version. Use EM Means > Compare main effects for pairwise comparisons.", { exact: true }).count());
    await c.snap(p, "tombol Post Hoc RM nonaktif");
};
S["BB-KF11-05"] = async (c) => {
    const p = c.page;
    await rmDesign(c, "rm_c.csv", "sesi", 3, [["nilai", ["p1", "p2", "p3"]]], ["metode"]);
    await rmOptions(c, OPT);
    for (const [i, method] of ["Bonferroni", "LSD(None)", "Sidak"].entries()) {
        if (i) {
            await gotoData(p); await rmOpen(c); await p.getByRole("button", { name: "Define", exact: true }).click(); await within(p).waitFor();
            // Define mengembalikan slot ke placeholder (lihat BB-KF07-02); slot diisi lagi.
            await rmSlots(c, [["nilai", ["p1", "p2", "p3"]]]);
            if (!(await between(p).getByText("metode", { exact: true }).count())) await rmBetween(c, ["metode"]);
        }
        await p.getByRole("button", { name: "EM Means", exact: true }).click();
        await p.locator("#CompMainEffect").waitFor();
        const zone = p.locator("div", { has: p.getByText(/^Display Means for:/) }).last();
        for (const t of ["sesi", "metode"]) if (!(await zone.getByText(t, { exact: true }).count())) await p.locator('[draggable="true"]').filter({ hasText: exact(t) }).first().dragTo(zone);
        const box = p.locator("#CompMainEffect");
        if ((await box.getAttribute("data-state")) !== "checked") await box.click();
        await p.getByRole("combobox").last().click();
        await p.getByRole("option", { name: method, exact: true }).click();
        if (!i) await c.snap(p, "dialog EM Means");
        await p.getByRole("button", { name: "Continue", exact: true }).click();
        await within(p).waitFor();
        c.log(`EM Means: sesi, metode; Compare Main Effects; ${method}`);
        await rmRun(c, `OK ${method}`);
        await gotoResult(p);
        await snapTable(c, "Pairwise Comparisons", `Pairwise Comparisons ${method}`);
    }
};
S["BB-KF12-01"] = async (c) => {
    await rmDesign(c, "rm_b.csv", "waktu", 4, [["skor", ["w1", "w2", "w3", "w4"]]], ["kelompok"]);
    await rmRun(c, "OK");
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    for (const t of ["Multivariate Tests", "Tests of Within-Subjects Effects", "Tests of Between-Subjects Effects"]) await snapTable(c, t);
};
S["BB-KF13-05"] = async (c) => {
    await importCsv(c, path.join(BBD, "bb-rm-listwise.csv"));
    await rmOpen(c); await rmDefine(c, "waktu", 4, ["skor"]);
    await rmSlots(c, [["skor", ["w1", "w2", "w3", "w4"]]]); await rmBetween(c, ["kelompok"]);
    await rmRun(c, "OK");
    await gotoResult(c.page);
    await snapTable(c, "Errors Logs");
    await snapTable(c, "Tests of Between-Subjects Effects");
};
const T10 = Array.from({ length: 10 }, (_, i) => `t${i + 1}`);
S["BB-KF13-06"] = async (c) => {
    await importCsv(c, path.join(RMS, "repeated-measures-5000-L10-M1.csv"));
    await rmOpen(c); await rmDefine(c, "time", 10, ["score"]);
    await rmSlots(c, [["score", T10]]);
    await rmRun(c, "OK");
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    await snapTable(c, "Errors Logs");
    await snapTable(c, "Mauchly's Test of Sphericity");
};
S["BB-KF13-07"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMX, "repeated-measures-40000-L10-M1-noise.csv"));
    await rmOpen(c); await rmDefine(c, "time", 10, ["score"]);
    await rmSlots(c, [["score", T10]]);
    const before = await logCount(p);
    await p.getByRole("button", { name: "OK", exact: true }).click();
    const running = async () => (await logCount(p)) === before;
    await p.waitForTimeout(300);
    c.note("toastSaatBerjalan", await toastTexts(p));
    c.note("probe", await responsiveProbe(c, running, null));
    await p.waitForFunction(async (n) => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) > n; } finally { db.close(); }
    }, before, { timeout: LONG, polling: 250 });
    await p.waitForTimeout(1500);
    c.obs.runs.push({ label: "OK 40000 subjek", output: digest(await lastTables(p)), newLog: true });
    await gotoResult(p);
    await snapTable(c, "Tests of Within-Subjects Effects");
};
S["BB-KF14-03"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(RMD, "rm_b.csv"));
    await rmOpen(c); await rmDefine(c, "waktu", 4, ["skor"]);
    const b = p.locator("#repeated-measures-plots-button");
    c.note("plotsDisabled", await b.isDisabled());
    await b.click({ force: true, timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(600);
    c.note("dialogPlotsTerbuka", await p.getByText("Repeated Measures: Plots", { exact: true }).count());
    c.note("catatanPlots", await p.getByText("Plots are not supported in this version.", { exact: true }).count());
    await c.snap(p, "tombol Plots RM nonaktif");
    await p.getByRole("button", { name: "Options", exact: true }).click();
    await p.locator("#LackOfFit").waitFor();
    const st = {};
    for (const id of ["SprVsLevel", "ResPlot", "LackOfFit", "HomogenTest"]) st[id] = await p.locator(`#${id}`).isDisabled();
    c.note("optionsDisabled", st);
    c.note("labelOptions", await p.locator('label[for="SprVsLevel"], label[for="ResPlot"], label[for="LackOfFit"]').allInnerTexts());
    c.note("catatanOptions", await p.getByText("Spread-vs.-level plots, residual plots, and the lack-of-fit test are not supported in this version.", { exact: true }).count());
    await c.snap(p, "Options RM: opsi grafik nonaktif");
};

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
    fs.mkdirSync(SHOTS, { recursive: true });
    fs.mkdirSync(OBS, { recursive: true });
    const browser = await chromium.launch();
    const ids = args.only ? args.only.split(",") : Object.keys(S);
    const report = { base: BASE, chromium: browser.version(), playwright: require("@playwright/test/package.json").version, startedAt: new Date().toISOString(), scenarios: {} };
    for (const id of ids) {
        for (const f of fs.readdirSync(SHOTS)) if (f === `${id}.png` || f.startsWith(`${id}-`)) fs.unlinkSync(path.join(SHOTS, f));
        const { context, page } = await newPage(browser);
        const consoleErrors = [];
        page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
        page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 300)}`));
        const c = new Ctx(id, page);
        const t0 = Date.now();
        try {
            await S[id](c);
            c.obs.status = "selesai";
        } catch (e) {
            c.obs.status = "kendala";
            c.obs.error = String(e && e.message || e).split(NL).slice(0, 6).join(" ");
            try { await c.snap(page, "keadaan saat kendala"); } catch { /* abaikan */ }
        }
        // Satu tangkapan: <ID>.png; lebih dari satu: <ID>-1.png, <ID>-2.png, ...
        if (c.shot === 1 && fs.existsSync(path.join(SHOTS, `${id}-1.png`))) {
            fs.renameSync(path.join(SHOTS, `${id}-1.png`), path.join(SHOTS, `${id}.png`));
            c.obs.notes = c.obs.notes.map((n) => n.replace(`${id}-1.png`, `${id}.png`));
            c.obs.toasts.forEach((t) => { if (t.file === `${id}-1.png`) t.file = `${id}.png`; });
        }
        c.obs.consoleErrors = consoleErrors.slice(0, 20);
        c.obs.durationS = Math.round((Date.now() - t0) / 1000);
        fs.writeFileSync(path.join(OBS, `${id}.json`), JSON.stringify(c.obs, null, 1));
        report.scenarios[id] = { status: c.obs.status, error: c.obs.error, shots: c.shot };
        console.log(`${id} ${c.obs.status} shots=${c.shot}${c.obs.error ? ` ERR ${c.obs.error.slice(0, 200)}` : ""}`);
        await context.close();
    }
    report.finishedAt = new Date().toISOString();
    const rp = path.join(OBS, "run-report.json");
    const prev = fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, "utf8")) : { scenarios: {} };
    fs.writeFileSync(rp, JSON.stringify({ ...report, scenarios: { ...prev.scenarios, ...report.scenarios } }, null, 2) + "\n");
    await browser.close();
})().catch((e) => { console.error("BB RUN FAILED:", e); process.exit(1); });
