// Eksekusi skenario black-box kelompok fitur v4 (δ₀ dua populasi dan CI
// simultan; testing/black-box/skenario-black-box.md, "Kelompok baru: fitur
// v4") lewat antarmuka asli build produksi skripsi-final-v4: impor CSV dari
// menu File, menu Analyze, isi dialog, klik tombol. Tidak memanggil service,
// WASM, atau worker. Mode eksekusi GLM dibiarkan bawaan (worker).
//
// Setiap skenario memakai browser context baru (profil bersih). Langkah
// "ulangi pada <data lain>" memakai profil bersih kedua di skenario yang sama.
// Helper diambil dari bb-run.cjs (aturan iterasi 2: tangkapan seluruh kartu
// hasil). Setiap berkas hasil mencatat port dan BUILD_ID (berkas .next dan
// BUILD_ID yang dilayani server, dibaca dari HTML).
//
// Pemakaian (root repo, server build v4 berjalan):
//   node testing/black-box/harness/bb-run-v4.cjs --base=http://localhost:3102 [--only=BB-KF03-04,...]
//
// Finalisasi: kelompok "fitur final" (uji khi-kuadrat dengan Σ diketahui)
// ditambahkan di berkas ini. --set=v4 (bawaan), final, atau all memilih
// kelompok; --iter=N menulis ke bukti/iterasi-N dan hasil-eksekusi/iterasi-N
// (tanpa --iter: folder v4 seperti eksekusi v4).
//   node testing/black-box/harness/bb-run-v4.cjs --base=http://localhost:3101 --iter=3 --set=all
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3102";
const PORT = new URL(BASE).port;
const REPO = path.resolve(__dirname, "../../..");
const BB = path.resolve(__dirname, "..");
const ITER = 2; // gaya tangkapan iterasi 2 (seluruh kartu hasil)
const RUN_DIR = args.iter ? `iterasi-${args.iter}` : "v4";
const SHOTS = path.join(BB, "bukti", RUN_DIR);
const OBS = path.join(BB, "hasil-eksekusi", RUN_DIR);
const MVD = path.join(REPO, "testing/glm-mv-reference/data");
const LONG = 10 * 60 * 1000;
const BUILD_ID_FILE = fs.readFileSync(path.join(REPO, "frontend/.next/BUILD_ID"), "utf8").trim();

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
    // Iterasi 2: seluruh kartu hasil (judul, catatan analitik, tabel).
    // (Locator di dalam `has` harus relatif: dibuat dari page, bukan dari log.)
    const inner = page.locator('[data-testid^="result-table-"], [data-testid^="result-chart-"]').filter({ hasText: title });
    const target = ITER >= 2 ? log.locator('[data-testid^="result-analytic-"]').filter({ has: inner }).first() : tbl;
    await target.scrollIntoViewIfNeeded();
    return c.snap(target, label || title);
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

async function pairedOpen(c) {
    const p = c.page;
    await p.getByRole("button", { name: "Paired", exact: true }).click();
    const dlg = p.getByRole("dialog").filter({ hasText: "Paired (Hotelling T²)" });
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    return dlg;
}
async function mvTwoWay(c) {
    await importCsv(c, path.join(MVD, "two-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["Y1A1", "Y2A1"]); await mvTo(c, ["faktorA", "faktorB"], "FixFactor");
}

// ── Fitur v4: δ₀ dua populasi dan CI simultan ───────────────────────────────
const FV4 = path.join(REPO, "testing/fitur-v4");
const DLG_DELTA = "Test Values (δ₀) — Hotelling T² Dua Populasi";
const readRcsv = (f) => {
    const [head, ...body] = fs.readFileSync(f, "utf8").trim().split(/\r?\n/);
    const cols = head.split(",").map((s) => s.replace(/"/g, ""));
    return body.map((l) => Object.fromEntries(l.split(",").map((s, i) => [cols[i], s.replace(/"/g, "")])));
};
const R_CI = readRcsv(path.join(FV4, "r/ci_simultan_r.csv"));
// Tampilan Statify (formatDisplayNumber): 4 desimal, nol di belakang dibuang.
const disp = (v) => { const n = Number(v); return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, ""); };

// Profil kedua di dalam skenario yang sama (langkah "ulangi pada …").
async function secondProfile(c) {
    const { context, page } = await newPage(c.browser);
    c.extraContexts.push(context);
    c.page = page;
    c.log("profil browser baru (bersih) untuk langkah berikutnya");
}
async function deltaOpen(c) {
    const p = c.page;
    await p.locator("#two-sample-delta-button").click();
    const dlg = dialogTitled(p, DLG_DELTA);
    await dlg.waitFor({ state: "visible", timeout: 30000 });
    await p.waitForTimeout(600);
    const inputs = dlg.locator('[id^="delta0-2s-"]');
    const n = await inputs.count();
    const values = [];
    for (let i = 0; i < n; i++) values.push(await inputs.nth(i).inputValue());
    const labels = await dlg.locator("label").allInnerTexts().catch(() => []);
    const hyp = await dlg.locator("#two-sample-delta-hypothesis").innerText().catch(() => null);
    return { dlg, n, values, hyp, text: (await dlg.innerText()).replace(/\s+/g, " ").trim(), labels };
}
async function deltaFill(c, dlg, values) {
    for (let i = 0; i < values.length; i++) await dlg.locator(`#delta0-2s-${i}`).fill(String(values[i]));
}
async function deltaClose(c, dlg, button) {
    await dlg.getByRole("button", { name: button, exact: true }).click();
    await c.page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
}
const deltaSummary = (c) => c.page.locator("#two-sample-delta-summary").innerText().then((s) => s.replace(/\s+/g, " ").trim()).catch(() => null);
// Ringkasan δ₀ ada di panel Covariance Matrices di bagian bawah dialog utama:
// gulir ke sana sebelum memotret agar teksnya terlihat.
async function snapSummary(c, label) {
    await c.page.locator("#two-sample-delta-summary").scrollIntoViewIfNeeded().catch(() => {});
    await c.page.waitForTimeout(300);
    return c.snap(c.page, label);
}
async function optionsCI(c, sig) {
    const p = c.page;
    await p.getByRole("button", { name: "Options", exact: true }).click();
    await p.locator("#SimultaneousCI").waitFor({ state: "visible", timeout: 30000 });
    if ((await p.locator("#SimultaneousCI").getAttribute("data-state")) !== "checked") await p.locator("#SimultaneousCI").click();
    if (sig !== undefined) await p.locator("#SigLevel").fill(String(sig));
    c.log(`Options: Simultaneous CI dicentang${sig !== undefined ? `; Significance Level ${sig}` : ""}`);
}
const tableOf = (run, title) => {
    for (const s of run.output || []) for (const t of s.tables) if (t.title === title) return t;
    return null;
};
const titlesOf = (run) => (run.output || []).flatMap((s) => s.tables.map((t) => t.title));
const noteOf = (t) => (t ? (Array.isArray(t.footnote) ? t.footnote.join(" ") : t.footnote) : null);
const colHeaders = (run, title) => {
    // Kolom bertingkat dibaca dari IndexedDB mentah (lastTables menyimpan components/output_data).
    return tableOf(run, title)?.columns ?? null;
};
// Bandingkan baris tabel CI yang tampil dengan R (4 desimal seperti tampilan).
function ciVsR(c, run, cfg, dvOrder, shift) {
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    if (!t) { c.note(`ciVsR_${cfg}`, "tabel tidak ada"); return false; }
    const rows = R_CI.filter((r) => r.config === cfg);
    const diffs = [];
    t.rows.forEach((row, i) => {
        const r = rows[dvOrder ? dvOrder[i] : i];
        const s = shift ? shift[i] : 0;
        const pairs = [["estimate", Number(r.estimate)], ["std_error", Number(r.std_error)], ["t2_lower", Number(r.t2_lower)], ["t2_upper", Number(r.t2_upper)], ["bonferroni_lower", Number(r.bonferroni_lower)], ["bonferroni_upper", Number(r.bonferroni_upper)]];
        if (row.bonferroni_df !== undefined) pairs.push(["bonferroni_df", Number(r.bonferroni_df)]);
        for (const [k, v] of pairs) {
            const expect = disp(k === "std_error" || k === "bonferroni_df" ? v : v); // R sudah pada skala data asli
            if (String(row[k]) !== expect) diffs.push({ dv: row.dependent_variable, kolom: k, tampil: row[k], R: expect });
        }
    });
    c.note(`ciVsR_${cfg}`, { baris: t.rows.length, nilaiDibandingkan: t.rows.length * 6 + (t.rows[0]?.bonferroni_df !== undefined ? t.rows.length : 0), beda: diffs });
    return diffs.length === 0;
}
const stripNotes = (run) => (run.output || []).map((s) => ({ title: s.title, tables: s.tables.map((t) => ({ title: t.title, rows: t.rows })) }));

async function mv2Setup(c, variance) {
    await importCsv(c, path.join(MVD, "hotelling 2 populasi independen.csv"));
    await mvOpen(c); await mvDV(c, ["x1", "x2", "x3", "x4"]); await mvTo(c, ["jk"], "FixFactor");
    if (variance) { await c.page.locator(`#${variance}`).click(); c.log(`Covariance Matrices: ${variance}`); }
}
async function mv2GeserSetup(c, variance) {
    await importCsv(c, path.join(FV4, "data/mv2-geser.csv"));
    await mvOpen(c); await mvDV(c, ["x1", "x2", "x3", "x4"]); await mvTo(c, ["jk"], "FixFactor");
    if (variance) { await c.page.locator(`#${variance}`).click(); c.log(`Covariance Matrices: ${variance}`); }
}

S["BB-KF03-04"] = async (c) => {
    const p = c.page;
    await mv2Setup(c, "variance-pooled");
    await c.snap(p, "dialog utama: tombol Test Values (δ₀) di panel Covariance Matrices");
    const d = await deltaOpen(c);
    c.note("dialogDelta", { judulAda: d.text.includes(DLG_DELTA), hipotesis: d.hyp, isian: d.n, nilaiAwal: d.values });
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await c.snap(d.dlg, "subdialog δ₀ terisi 3, 2, 10, 1");
    await deltaClose(c, d.dlg, "Continue");
    c.note("ringkasan", await deltaSummary(c));
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    const run1 = await mvRun(c, "OK dengan δ₀ = (3, 2, 10, 1)");
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
    await snapTable(c, "Tests of Between-Subjects Effects");
    await snapTable(c, "Descriptive Statistics");
    await secondProfile(c);
    await mv2GeserSetup(c, "variance-pooled");
    await setChecks(c, "Options", ["DescStats", "HomogenTest"], MVOK);
    const run2 = await mvRun(c, "langkah 7: mv2-geser.csv, δ₀ = 0");
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests", "langkah 7: Multivariate Tests (data geser)");
    const mt1 = tableOf(run1, "Multivariate Tests"), mt2 = tableOf(run2, "Multivariate Tests");
    const bs1 = tableOf(run1, "Tests of Between-Subjects Effects"), bs2 = tableOf(run2, "Tests of Between-Subjects Effects");
    c.note("catatanMT", noteOf(mt1));
    c.note("mtSamaDenganLangkah7", JSON.stringify(mt1?.rows) === JSON.stringify(mt2?.rows));
    c.note("bseSamaDenganLangkah7", JSON.stringify(bs1?.rows) === JSON.stringify(bs2?.rows));
    const desc = tableOf(run1, "Descriptive Statistics");
    c.note("descJk1X1", desc?.rows?.filter((r) => JSON.stringify(r).includes("x1")).slice(0, 3));
    c.note("spss", "keluaran SPSS spss/mv2_delta0.sps belum tersedia (testing/fitur-v4/spss-output/ kosong)");
};

S["BB-KF03-05"] = async (c) => {
    const p = c.page;
    await mv2Setup(c, "variance-welch");
    const d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await deltaClose(c, d.dlg, "Continue");
    c.note("ringkasan", await deltaSummary(c));
    c.note("radioWelchSetelahSubdialog", await p.locator("#variance-welch").getAttribute("data-state"));
    const run1 = await mvRun(c, "OK Unequal dengan δ₀ = (3, 2, 10, 1)");
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
    await secondProfile(c);
    await mv2GeserSetup(c, "variance-welch");
    const run2 = await mvRun(c, "langkah 6: mv2-geser.csv, Unequal, δ₀ = 0");
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests", "langkah 6: Multivariate Tests (data geser)");
    const w = (run) => tableOf(run, "Multivariate Tests")?.rows?.filter((r) => /Welch/.test(r.effect || ""));
    c.note("barisWelch", w(run1));
    c.note("barisWelchSamaDenganLangkah6", JSON.stringify(w(run1)) === JSON.stringify(w(run2)) && (w(run1) || []).length > 0);
    c.note("catatanMT", noteOf(tableOf(run1, "Multivariate Tests")));
};

S["BB-KF03-06"] = async (c) => {
    const p = c.page;
    await mv2Setup(c);
    let d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await deltaClose(c, d.dlg, "Continue");
    await mvRemove(c, "DepVar", "x4");
    d = await deltaOpen(c);
    c.note("langkah4", { isian: d.n, nilai: d.values });
    await c.snap(d.dlg, "langkah 4: δ₀ setelah x4 dihapus");
    // Langkah 4 ditutup dengan Continue (seperti revisi R1 pada Test Values μ₀).
    await deltaClose(c, d.dlg, "Continue");
    await mvDV(c, ["x4"]);
    d = await deltaOpen(c);
    c.note("langkah5", { isian: d.n, nilai: d.values });
    await c.snap(d.dlg, "langkah 5: δ₀ setelah x4 ditambah lagi");
    await deltaFill(c, d.dlg, [99, 98, 97, 96]);
    await deltaClose(c, d.dlg, "Cancel");
    d = await deltaOpen(c);
    c.note("langkah6", { isianSetelahCancel: d.values });
    await c.snap(d.dlg, "langkah 6: dibuka lagi setelah perubahan dan Cancel");
    await d.dlg.getByRole("button", { name: "Reset to 0", exact: true }).click();
    await p.waitForTimeout(300);
    const afterReset = [];
    for (let i = 0; i < d.n; i++) afterReset.push(await d.dlg.locator(`#delta0-2s-${i}`).inputValue());
    c.note("langkah7Isian", afterReset);
    await deltaClose(c, d.dlg, "Continue");
    c.note("langkah7Ringkasan", await deltaSummary(c));
    await snapSummary(c, "langkah 7: ringkasan δ₀ di panel Covariance Matrices");
};

S["BB-KF03-07"] = async (c) => {
    const p = c.page;
    await mv2Setup(c);
    const d = await deltaOpen(c);
    for (let i = 0; i < d.n; i++) await d.dlg.locator(`#delta0-2s-${i}`).fill("");
    await c.snap(d.dlg, "semua isian δ₀ dikosongkan");
    await deltaClose(c, d.dlg, "Continue");
    c.note("ringkasan", await deltaSummary(c));
    await snapSummary(c, "ringkasan δ₀ setelah Continue");
    const run1 = await mvRun(c, "OK dengan isian δ₀ kosong");
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
    await secondProfile(c);
    await mv2Setup(c);
    const run2 = await mvRun(c, "pembanding: konfigurasi sama tanpa membuka δ₀ (mv2)");
    c.note("catatanMT", noteOf(tableOf(run1, "Multivariate Tests")));
    c.note("catatanMTMemuatDelta", /δ₀/.test(noteOf(tableOf(run1, "Multivariate Tests")) || ""));
    c.note("tabelSamaDenganTanpaDelta", JSON.stringify(run1.output) === JSON.stringify(run2.output));
};

S["BB-KF03-08"] = async (c) => {
    const p = c.page;
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    const d = await deltaOpen(c);
    c.note("pesanSubdialog", d.text.match(/δ₀ hanya berlaku[^.]*\)?\./)?.[0] ?? null);
    await deltaFill(c, d.dlg, [1, 1]);
    await c.snap(d.dlg, "subdialog δ₀ dengan faktor 3 level, isian 1, 1");
    await deltaClose(c, d.dlg, "Continue");
    const run = await mvRun(c, "OK dengan δ₀ pada faktor 3 level");
    c.note("logBaru", run.newLog);
};

S["BB-KF03-09"] = async (c) => {
    const p = c.page;
    await mv2Setup(c);
    const d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await deltaClose(c, d.dlg, "Continue");
    c.note("ringkasanSebelum", await deltaSummary(c));
    await mvRemove(c, "FixFactor", "jk");
    await mvTo(c, ["jk"], "FixFactor");
    c.note("ringkasanSesudah", await deltaSummary(c));
    await snapSummary(c, "ringkasan δ₀ setelah jk dihapus dan ditambah lagi");
    const run = await mvRun(c, "OK setelah faktor diubah");
    c.note("catatanMT", noteOf(tableOf(run, "Multivariate Tests")));
    c.note("catatanMTMemuatDelta", /δ₀/.test(noteOf(tableOf(run, "Multivariate Tests")) || ""));
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
};

async function pairedSetup(c, csv, delta0) {
    await importCsv(c, csv);
    await mvOpen(c);
    const dlg = await pairedOpen(c);
    const avail = dlg.locator("#multivariate-paired-available-variables");
    for (const v of ["kedalaman1", "kedalaman2", "ukuran1", "ukuran2"]) await avail.getByText(v, { exact: true }).first().dblclick();
    if (delta0) for (let i = 0; i < delta0.length; i++) await dlg.locator(`#delta0-${i}`).fill(String(delta0[i]));
    await c.snap(dlg, `subdialog Paired, δ₀ = ${delta0 ? delta0.join(", ") : "0 (bawaan)"}`);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await c.page.locator(MVOK).waitFor();
    c.log(`Paired (kedalaman1, kedalaman2), (ukuran1, ukuran2); δ₀ = ${delta0 ? delta0.join(", ") : "0"}`);
}
const MT_PAIRED = "Multivariate Tests — Hotelling T² Berpasangan";
S["BB-KF04-03"] = async (c) => {
    await pairedSetup(c, path.join(MVD, "hotelling berpasangan (data asli).csv"), [8, 3]);
    const run1 = await mvRun(c, "OK Paired δ₀ = (8, 3)");
    await gotoResult(c.page);
    await snapTable(c, "Hotelling T² Berpasangan");
    await secondProfile(c);
    await pairedSetup(c, path.join(FV4, "data/mv3-geser.csv"), null);
    const run2 = await mvRun(c, "langkah 4: mv3-geser.csv, δ₀ = 0");
    await gotoResult(c.page);
    await snapTable(c, "Hotelling T² Berpasangan", "langkah 4: data geser");
    const t1 = tableOf(run1, MT_PAIRED), t2 = tableOf(run2, MT_PAIRED);
    c.note("catatan", noteOf(t1));
    c.note("nilaiSamaDenganLangkah4", JSON.stringify(t1?.rows) === JSON.stringify(t2?.rows));
    c.note("spss", "keluaran SPSS spss/mv3_delta0.sps belum tersedia (testing/fitur-v4/spss-output/ kosong)");
};

async function mv1Setup(c) {
    await importCsv(c, path.join(MVD, "hotelling 1 populasi.csv"));
    await mvOpen(c); await mvDV(c, ["mpg", "disp", "hp", "wt"]);
    await mvTestValues(c, [20, 200, 150, 3]); await continueTo(c, MVOK);
    c.log("Test Values μ₀ = 20, 200, 150, 3");
}
S["BB-KF02-04"] = async (c) => {
    await mv1Setup(c);
    await optionsCI(c);
    await c.snap(c.page, "Options: Simultaneous CI dicentang");
    await continueTo(c, MVOK);
    const run = await mvRun(c, "OK dengan CI simultan");
    c.note("urutanTabel", titlesOf(run));
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    c.note("kolom", t?.columns);
    c.note("barisMpg", t?.rows?.[0]);
    c.note("catatan", noteOf(t));
    c.note("nilaiSamaR", ciVsR(c, run, "mv1ci"));
    await gotoResult(c.page);
    await snapTable(c, "Simultaneous Confidence Intervals");
};
S["BB-KF02-05"] = async (c) => {
    await mv1Setup(c);
    await optionsCI(c, 0.1);
    await continueTo(c, MVOK);
    const run = await mvRun(c, "OK dengan CI simultan, α = 0.1");
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    c.note("kolom", t?.columns);
    c.note("catatan", noteOf(t));
    c.note("nilaiSamaR", ciVsR(c, run, "mv1ci10"));
    await gotoResult(c.page);
    await snapTable(c, "Simultaneous Confidence Intervals");
};
S["BB-KF02-06"] = async (c) => {
    await mv1Setup(c);
    await setChecks(c, "Options", OPT, MVOK, ["SimultaneousCI"]);
    const run = await mvRun(c, "OK tanpa CI (konfigurasi BB-KF02-01)");
    c.note("judulTabel", titlesOf(run));
    c.note("adaTabelCI", titlesOf(run).includes("Simultaneous Confidence Intervals"));
    const ref = JSON.parse(fs.readFileSync(path.join(BB, "hasil-eksekusi/iterasi-2/BB-KF02-01.json"), "utf8"));
    const refRun = ref.runs[ref.runs.length - 1];
    c.note("samaDenganBBKF0201Iterasi2", JSON.stringify(stripNotes(run)) === JSON.stringify(stripNotes(refRun)));
    c.note("catatanSamaDenganBBKF0201Iterasi2", JSON.stringify(run.output) === JSON.stringify(refRun.output));
    await gotoResult(c.page);
    await snapTable(c, "Multivariate Tests");
};
S["BB-KF02-07"] = async (c) => {
    const p = c.page;
    await mv1Setup(c);
    for (const sig of [0, 1.5]) {
        await optionsCI(c, sig);
        await p.getByRole("button", { name: "Continue", exact: true }).last().click();
        await waitToast(c, /Significance Level must be greater than 0 and less than 1/, `Continue dengan Significance Level ${sig}`);
        c.note(`optionsMasihTerbuka_${sig}`, await p.locator("#SimultaneousCI").isVisible());
        await dismissToasts(p);
        if (sig === 0) {
            // Kembalikan ke dialog utama lewat Cancel sebelum langkah 4.
            await p.getByRole("button", { name: "Cancel", exact: true }).last().click();
            await p.locator(MVOK).waitFor({ state: "visible", timeout: 30000 });
        }
    }
};
S["BB-KF03-10"] = async (c) => {
    await mv2Setup(c, "variance-pooled");
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK Equal dengan CI simultan");
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    c.note("kolom", t?.columns); c.note("catatan", noteOf(t));
    c.note("kolomDelta0", t?.rows?.map((r) => r.hypothesized));
    c.note("nilaiSamaR", ciVsR(c, run, "mv2ci"));
    await gotoResult(c.page);
    await snapTable(c, "Simultaneous Confidence Intervals");
};
S["BB-KF03-11"] = async (c) => {
    await mv2Setup(c, "variance-welch");
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK Unequal dengan CI simultan");
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    c.note("kolom", t?.columns); c.note("catatan", noteOf(t));
    c.note("barisDf", t?.rows?.map((r) => [r.dependent_variable, r.bonferroni_df]));
    c.note("nilaiSamaR", ciVsR(c, run, "mv2wci"));
    const welch = tableOf(run, "Multivariate Tests")?.rows?.find((r) => /Welch/.test(r.effect || ""));
    c.note("errorDfWelch", welch?.error_df);
    await gotoResult(c.page);
    await snapTable(c, "Simultaneous Confidence Intervals");
};
S["BB-KF03-12"] = async (c) => {
    await mv2Setup(c, "variance-pooled");
    const d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await deltaClose(c, d.dlg, "Continue");
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK Equal, δ₀ = (3, 2, 10, 1), CI simultan");
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    c.note("kolom", t?.columns); c.note("catatan", noteOf(t));
    c.note("baris", t?.rows);
    c.note("nilaiSamaR_mv2ci", ciVsR(c, run, "mv2ci"));
    const containsOk = (t?.rows || []).every((r) => {
        const h = Number(r.hypothesized);
        const inT2 = Number(r.t2_lower) <= h && h <= Number(r.t2_upper);
        const inB = Number(r.bonferroni_lower) <= h && h <= Number(r.bonferroni_upper);
        return (r.t2_contains === (inT2 ? "Yes" : "No")) && (r.bonferroni_contains === (inB ? "Yes" : "No"));
    });
    c.note("containsKonsisten", containsOk);
    await gotoResult(c.page);
    await snapTable(c, "Simultaneous Confidence Intervals");
};
S["BB-KF04-04"] = async (c) => {
    await pairedSetup(c, path.join(MVD, "hotelling berpasangan (data asli).csv"), [8, 3]);
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK Paired δ₀ = (8, 3), CI simultan");
    const t = tableOf(run, "Simultaneous Confidence Intervals");
    c.note("kolom", t?.columns); c.note("catatan", noteOf(t));
    c.note("baris", t?.rows?.map((r) => [r.dependent_variable, r.estimate, r.hypothesized]));
    c.note("nilaiSamaR", ciVsR(c, run, "mv3dci"));
    await gotoResult(c.page);
    await snapTable(c, "Simultaneous Confidence Intervals");
};
S["BB-KF03-13"] = async (c) => {
    await importCsv(c, path.join(MVD, "one-way manova.csv"));
    await mvOpen(c); await mvDV(c, ["y1", "y2"]); await mvTo(c, ["treatment"], "FixFactor");
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK faktor 3 level dengan CI simultan");
    c.note("judulTabel", titlesOf(run));
    c.note("errorsLogs", tableOf(run, "Errors Logs")?.rows);
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    await snapTable(c, "Errors Logs");
};
S["BB-KF06-10"] = async (c) => {
    await mvTwoWay(c);
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK Two-Way dengan CI simultan");
    c.note("judulTabel", titlesOf(run));
    c.note("errorsLogs", tableOf(run, "Errors Logs")?.rows);
    await gotoResult(c.page);
    c.note("judulTampil", await visibleTitles(c.page));
    await snapTable(c, "Errors Logs");
};

// ── Fitur final: uji khi-kuadrat dengan Σ diketahui ─────────────────────────
const V4_IDS = Object.keys(S);
// Σ sebagai segitiga atas termasuk diagonal (per baris), seperti diisi pengguna.
const SA = [[36, -630, -320, -5], [15000, 6700, 107], [4700, 44], [1]];
const SB = [[7, 6, 5, 5], [16, 8, 6], [29, 14], [22]];
const S1 = [[5, 4.5, 6.5, 5], [13, 7, 6], [29, 14], [17]];
const S2 = [[9, 7.5, 4.5, 4], [19, 9.5, 5.5], [29, 13], [28]];
const SD = [[120, 17], [22]];
const T_CHI = "Chi-Square Test (Known Covariance Matrix)";
const T_KCI = "Simultaneous Confidence Intervals (Known Covariance Matrix)";
const DLG_MU0 = "Test Values (μ₀) — Hotelling T² Satu Populasi";
const R_KNOWN = readRcsv(path.join(REPO, "testing/final/bagian1/known-sigma-r.csv"));
const CHK = { tv: "#known-sigma-checkbox", two: "#two-sample-known-sigma-checkbox", paired: "#paired-known-sigma-checkbox" };

async function sigmaFill(scope, prefix, upper, skip = []) {
    for (let i = 0; i < upper.length; i++) for (let j = i; j < upper.length; j++) {
        if (skip.includes(`${i}-${j}`)) continue;
        await scope.locator(`#${prefix}-${i}-${j}`).fill(String(upper[i][j - i]));
    }
}
// Isi sel dan status (nonaktif) seluruh matriks, plus label baris/kolom.
async function sigmaRead(scope, prefix, p) {
    const cells = [];
    for (let i = 0; i < p; i++) {
        const row = [];
        for (let j = 0; j < p; j++) {
            const cell = scope.locator(`#${prefix}-${i}-${j}`);
            row.push({ value: await cell.inputValue(), disabled: await cell.isDisabled() });
        }
        cells.push(row);
    }
    const table = scope.locator(`table#${prefix}`);
    const heads = (await table.locator("thead th").allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    const rows = (await table.locator("tbody th").allInnerTexts()).map((t) => t.trim());
    const title = await table.locator("xpath=../preceding-sibling::span[1]").innerText().catch(() => null);
    return { title, columns: heads, rows, cells };
}
const checkState = (page, sel) => page.locator(sel).getAttribute("data-state");
const errText = (page, id) => page.locator(`#${id}`).innerText().catch(() => null);
// Nilai tampil tabel χ² dan CI Σ diketahui dibandingkan dengan R (4 desimal).
function knownVsR(c, run, rCase) {
    const r = Object.fromEntries(R_KNOWN.filter((x) => x.case === rCase).map((x) => [x.key, Number(x.r)]));
    const f4 = (v) => Number(v).toFixed(4);
    const sig = (v) => (v < 0.001 ? "<.001" : f4(v));
    const diffs = [];
    let n = 0;
    const chi = tableOf(run, T_CHI)?.rows?.[0];
    const cmp = (label, shown, expect) => { n += 1; if (String(shown) !== expect) diffs.push({ nilai: label, tampil: shown, R: expect }); };
    if (chi) { cmp("Chi-Square", chi.chi_square, f4(r.chi)); cmp("Sig.", chi.significance, sig(r.sig)); }
    else diffs.push({ nilai: T_CHI, tampil: "tidak ada" });
    const ci = tableOf(run, T_KCI);
    (ci?.rows || []).forEach((row, i) => {
        const k = i + 1;
        cmp(`${row.dependent_variable} estimate`, row.estimate, f4(r[`est${k}`]));
        cmp(`${row.dependent_variable} std_error`, row.std_error, f4(r[`se${k}`]));
        cmp(`${row.dependent_variable} chi_square_lower`, row.chi_square_lower, f4(r[`chiL${k}`]));
        cmp(`${row.dependent_variable} chi_square_upper`, row.chi_square_upper, f4(r[`chiU${k}`]));
        cmp(`${row.dependent_variable} bonferroni_lower`, row.bonferroni_lower, f4(r[`bonL${k}`]));
        cmp(`${row.dependent_variable} bonferroni_upper`, row.bonferroni_upper, f4(r[`bonU${k}`]));
    });
    c.note(`nilaiVsR_${rCase}`, { nilaiDibandingkan: n, beda: diffs });
    return diffs.length === 0;
}
async function knownResult(c, run, rCase) {
    c.note("urutanTabel", titlesOf(run));
    const chi = tableOf(run, T_CHI);
    c.note("tabelChi", { kolom: chi?.columns, baris: chi?.rows, catatan: noteOf(chi) });
    const ci = tableOf(run, T_KCI);
    c.note("tabelCiSigma", { kolom: ci?.columns, baris: ci?.rows, catatan: noteOf(ci) });
    c.note("nilaiSamaR", knownVsR(c, run, rCase));
    await gotoResult(c.page);
    await snapTable(c, T_CHI);
    if (ci) await snapTable(c, T_KCI);
    await snapTable(c, "Multivariate Tests");
}
async function mv1Open(c) {
    await importCsv(c, path.join(MVD, "hotelling 1 populasi.csv"));
    await mvOpen(c); await mvDV(c, ["mpg", "disp", "hp", "wt"]);
    await mvTestValues(c, [20, 200, 150, 3]);
    c.log("Test Values μ₀ = 20, 200, 150, 3");
    return dialogTitled(c.page, DLG_MU0);
}
// Subdialog tetap terbuka sesudah Continue yang ditolak?
async function stillOpen(c, dlg) { await c.page.waitForTimeout(600); return dlg.isVisible(); }

S["BB-KF02-08"] = async (c) => {
    const p = c.page;
    const dlg = await mv1Open(c);
    c.note("kotakAwal", await checkState(p, CHK.tv));
    c.note("matriksTampilSebelumDicentang", await p.locator("#known-sigma-0-0").count());
    await c.snap(dlg, "subdialog Test Values: kotak Σ belum dicentang");
    await p.locator(CHK.tv).click();
    await sigmaFill(p, "known-sigma", SA);
    c.note("matriks", await sigmaRead(p, "known-sigma", 4));
    await c.snap(dlg, "Σ diketahui terisi (segitiga bawah otomatis)");
    await continueTo(c, MVOK);
    c.log("Σ diketahui dicentang dan diisi → Continue");
    await setChecks(c, "Options", ["DescStats", "SimultaneousCI"], MVOK);
    const run = await mvRun(c, "OK dengan Σ diketahui dan CI simultan");
    c.note("multivariateTests", tableOf(run, "Multivariate Tests")?.rows);
    await knownResult(c, run, "K1");
};
S["BB-KF02-09"] = async (c) => {
    const p = c.page;
    const dlg = await mv1Open(c);
    c.note("kotakAwal", await checkState(p, CHK.tv));
    c.note("matriksTampil", await p.locator("#known-sigma-0-0").count());
    await c.snap(dlg, "subdialog Test Values: kotak Σ tidak dicentang");
    await continueTo(c, MVOK);
    await setChecks(c, "Options", OPT, MVOK);
    const run = await mvRun(c, "OK tanpa Σ diketahui");
    c.note("urutanTabel", titlesOf(run));
    const ref = path.join(OBS, "BB-KF02-01.json");
    if (fs.existsSync(ref)) {
        const r = JSON.parse(fs.readFileSync(ref, "utf8"));
        const refRun = (r.runs || []).find((x) => x.output) || null;
        const strip = (o) => (o || []).filter((s) => s.title !== "Errors Logs").map((s) => ({ title: s.title, tables: s.tables.map((t) => ({ title: t.title, rows: t.rows, footnote: t.footnote })) }));
        c.note("samaDenganBBKF0201", refRun ? JSON.stringify(strip(refRun.output)) === JSON.stringify(strip(run.output)) : "BB-KF02-01 tanpa keluaran");
    } else c.note("samaDenganBBKF0201", "BB-KF02-01 iterasi ini belum ada");
    await gotoResult(p);
    await snapTable(c, "Multivariate Tests");
};
S["BB-KF03-14"] = async (c) => {
    const p = c.page;
    await mv2Setup(c, "variance-pooled");
    const d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    c.note("kotakAwal", await checkState(p, CHK.two));
    await p.locator(CHK.two).click();
    await p.locator("#known-sigma-common").click();
    await sigmaFill(p, "two-sample-known-sigma", SB);
    c.note("matriks", await sigmaRead(p, "two-sample-known-sigma", 4));
    await c.snap(d.dlg, "subdialog δ₀: Σ₁ = Σ₂ = Σ diketahui");
    await deltaClose(c, d.dlg, "Continue");
    c.note("ringkasan", await deltaSummary(c));
    await snapSummary(c, "ringkasan δ₀ dan Σ");
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK dua populasi, Σ diketahui");
    await knownResult(c, run, "K2-d");
};
S["BB-KF03-15"] = async (c) => {
    const p = c.page;
    await mv2Setup(c, "variance-pooled");
    const d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await p.locator(CHK.two).click();
    await p.locator("#known-sigma-separate").click();
    await sigmaFill(p, "two-sample-known-sigma1", S1);
    await sigmaFill(p, "two-sample-known-sigma2", S2);
    c.note("matriks1", await sigmaRead(p, "two-sample-known-sigma1", 4));
    c.note("matriks2", await sigmaRead(p, "two-sample-known-sigma2", 4));
    await c.snap(d.dlg, "subdialog δ₀: Σ₁ dan Σ₂ diketahui");
    await deltaClose(c, d.dlg, "Continue");
    c.note("ringkasan", await deltaSummary(c));
    await snapSummary(c, "ringkasan δ₀ dan Σ₁, Σ₂");
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK dua populasi, Σ₁ dan Σ₂ diketahui");
    await knownResult(c, run, "K3-d");
};
async function pairedKnown(c, fill) {
    await importCsv(c, path.join(MVD, "hotelling berpasangan (data asli).csv"));
    await mvOpen(c);
    const dlg = await pairedOpen(c);
    const avail = dlg.locator("#multivariate-paired-available-variables");
    for (const v of ["kedalaman1", "kedalaman2", "ukuran1", "ukuran2"]) await avail.getByText(v, { exact: true }).first().dblclick();
    for (const [i, v] of [8, 3].entries()) await dlg.locator(`#delta0-${i}`).fill(String(v));
    c.log("Paired (kedalaman1, kedalaman2), (ukuran1, ukuran2); δ₀ = 8, 3");
    c.note("kotakAwal", await checkState(c.page, CHK.paired));
    await dlg.locator(CHK.paired).click();
    await fill(dlg);
    await dlg.locator("table#paired-known-sigma").scrollIntoViewIfNeeded();
    return dlg;
}
S["BB-KF04-05"] = async (c) => {
    const dlg = await pairedKnown(c, (d) => sigmaFill(d, "paired-known-sigma", SD));
    c.note("matriks", await sigmaRead(dlg, "paired-known-sigma", 2));
    await c.snap(dlg, "subdialog Paired: Σd diketahui");
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    await c.page.locator(MVOK).waitFor();
    await optionsCI(c); await continueTo(c, MVOK);
    const run = await mvRun(c, "OK berpasangan, Σd diketahui");
    await knownResult(c, run, "K4");
};
S["BB-KF02-10"] = async (c) => {
    const p = c.page;
    const dlg = await mv1Open(c);
    await p.locator(CHK.tv).click();
    await p.locator("#known-sigma-0-1").fill("-630");
    const lower = p.locator("#known-sigma-1-0");
    c.note("selBawah", { disabled: await lower.isDisabled(), editable: await lower.isEditable(), nilai: await lower.inputValue() });
    // Upaya mengetik 999 di sel bawah diagonal seperti pengguna (klik lalu ketik).
    await lower.click({ force: true, timeout: 3000 }).catch((e) => c.note("klikSelBawah", String(e.message).split(NL)[0]));
    await p.keyboard.type("999");
    c.note("selBawahSesudahKetik", await lower.inputValue());
    c.note("selAtasSesudahKetik", await p.locator("#known-sigma-0-1").inputValue());
    await c.snap(dlg, "sel disp–mpg nonaktif, menampilkan −630");
    await sigmaFill(p, "known-sigma", SA, ["0-1"]);
    await continueTo(c, MVOK);
    await mvTestValues(c, null);
    c.note("kotakSesudahDibukaLagi", await checkState(p, CHK.tv));
    c.note("matriksSesudahDibukaLagi", await sigmaRead(p, "known-sigma", 4));
    await c.snap(dialogTitled(p, DLG_MU0), "Test Values dibuka lagi");
};
S["BB-KF02-11"] = async (c) => {
    const p = c.page;
    const dlg = await mv1Open(c);
    await p.locator(CHK.tv).click();
    await sigmaFill(p, "known-sigma", [[1, 2, 2, 2], [1, 2, 2], [1, 2], [1]]);
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    c.note("pesan", await errText(p, "known-sigma-error"));
    c.note("subdialogTetapTerbuka", await stillOpen(c, dlg));
    await c.snap(dlg, "Σ tidak definit positif");
};
S["BB-KF02-12"] = async (c) => {
    const p = c.page;
    const dlg = await mv1Open(c);
    await p.locator(CHK.tv).click();
    await sigmaFill(p, "known-sigma", SA);
    await p.locator("#known-sigma-2-3").fill("");
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    c.note("pesan", await errText(p, "known-sigma-error"));
    c.note("subdialogTetapTerbuka", await stillOpen(c, dlg));
    await c.snap(dlg, "sel hp–wt kosong");
};
S["BB-KF02-13"] = async (c) => {
    const p = c.page;
    const dlg = await mv1Open(c);
    await p.locator(CHK.tv).click();
    await sigmaFill(p, "known-sigma", SA);
    for (const v of ["0", "-1"]) {
        await p.locator("#known-sigma-3-3").fill(v);
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        c.note(`pesanDiagonal${v}`, await errText(p, "known-sigma-error"));
        c.note(`subdialogTetapTerbuka${v}`, await stillOpen(c, dlg));
        await c.snap(dlg, `diagonal wt = ${v}`);
    }
};
S["BB-KF03-16"] = async (c) => {
    const p = c.page;
    await mv2Setup(c, "variance-pooled");
    const d = await deltaOpen(c);
    await deltaFill(c, d.dlg, [3, 2, 10, 1]);
    await p.locator(CHK.two).click();
    await p.locator("#known-sigma-separate").click();
    await sigmaFill(p, "two-sample-known-sigma1", S1);
    await sigmaFill(p, "two-sample-known-sigma2", S2);
    await p.locator("#two-sample-known-sigma2-0-0").fill("1");
    await d.dlg.getByRole("button", { name: "Continue", exact: true }).click();
    c.note("pesan", await errText(p, "two-sample-known-sigma-error"));
    c.note("subdialogTetapTerbuka", await stillOpen(c, d.dlg));
    await p.locator("#two-sample-known-sigma-error").scrollIntoViewIfNeeded().catch(() => {});
    await c.snap(d.dlg, "Σ₂ tidak definit positif");
};
S["BB-KF04-06"] = async (c) => {
    const dlg = await pairedKnown(c, async (d) => {
        await d.locator("#paired-known-sigma-0-0").fill("120");
        await d.locator("#paired-known-sigma-1-1").fill("22");
    });
    await dlg.getByRole("button", { name: "Continue", exact: true }).click();
    c.note("pesan", await errText(c.page, "paired-known-sigma-error"));
    c.note("subdialogTetapTerbuka", await stillOpen(c, dlg));
    await dlg.locator("#paired-known-sigma-error").scrollIntoViewIfNeeded().catch(() => {});
    await c.snap(dlg, "sel d1–d2 kosong");
};
const FINAL_IDS = Object.keys(S).filter((id) => !V4_IDS.includes(id));

(async () => {
    fs.mkdirSync(SHOTS, { recursive: true });
    fs.mkdirSync(OBS, { recursive: true });
    const html = await (await fetch(`${BASE}/dashboard/data`)).text();
    // App Router: BUILD_ID ada di payload RSC HTML sebagai \"b\":\"<BUILD_ID>\".
    const served = html.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]+)/)?.[1] ?? null;
    const env = { base: BASE, port: PORT, buildIdFile: BUILD_ID_FILE, buildIdServed: served };
    if (served !== BUILD_ID_FILE) throw new Error(`BUILD_ID server ${served} != berkas ${BUILD_ID_FILE}`);
    const browser = await chromium.launch();
    const set = args.set || "v4";
    const ids = args.only ? args.only.split(",") : set === "final" ? FINAL_IDS : set === "all" ? [...V4_IDS, ...FINAL_IDS] : V4_IDS;
    const report = { ...env, chromium: browser.version(), playwright: require("@playwright/test/package.json").version, startedAt: new Date().toISOString(), scenarios: {} };
    for (const id of ids) {
        for (const f of fs.readdirSync(SHOTS)) if (f === `${id}.png` || f.startsWith(`${id}-`)) fs.unlinkSync(path.join(SHOTS, f));
        const { context, page } = await newPage(browser);
        const consoleErrors = [];
        page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
        page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 300)}`));
        const c = new Ctx(id, page);
        c.browser = browser;
        c.extraContexts = [];
        c.obs.env = { ...env };
        c.obs.startedAt = new Date().toISOString();
        const t0 = Date.now();
        try {
            await S[id](c);
            c.obs.status = "selesai";
        } catch (e) {
            c.obs.status = "kendala";
            c.obs.error = String(e && e.message || e).split(NL).slice(0, 6).join(" ");
            try { await c.snap(c.page, "keadaan saat kendala"); } catch { /* abaikan */ }
        }
        if (c.shot === 1 && fs.existsSync(path.join(SHOTS, `${id}-1.png`))) {
            fs.renameSync(path.join(SHOTS, `${id}-1.png`), path.join(SHOTS, `${id}.png`));
            c.obs.notes = c.obs.notes.map((n) => n.replace(`${id}-1.png`, `${id}.png`));
            c.obs.toasts.forEach((t) => { if (t.file === `${id}-1.png`) t.file = `${id}.png`; });
        }
        c.obs.consoleErrors = consoleErrors.slice(0, 20);
        c.obs.finishedAt = new Date().toISOString();
        c.obs.durationS = Math.round((Date.now() - t0) / 1000);
        fs.writeFileSync(path.join(OBS, `${id}.json`), JSON.stringify(c.obs, null, 1));
        report.scenarios[id] = { status: c.obs.status, error: c.obs.error, shots: c.shot, startedAt: c.obs.startedAt, finishedAt: c.obs.finishedAt };
        console.log(`${id} ${c.obs.status} shots=${c.shot}${c.obs.error ? ` ERR ${c.obs.error.slice(0, 200)}` : ""}`);
        for (const x of c.extraContexts) await x.close().catch(() => {});
        await context.close();
    }
    report.finishedAt = new Date().toISOString();
    const rp = path.join(OBS, "run-report.json");
    const prev = fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, "utf8")) : { scenarios: {} };
    fs.writeFileSync(rp, JSON.stringify({ ...report, scenarios: { ...prev.scenarios, ...report.scenarios } }, null, 2) + "\n");
    await browser.close();
})().catch((e) => { console.error("BB RUN V4 FAILED:", e); process.exit(1); });
