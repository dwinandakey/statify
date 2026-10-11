// Tangkapan layar build final untuk naskah (testing/bab5/gambar/), lewat UI
// asli: dialog dipotret selebar viewport (1600 px), kartu hasil dipotret
// dengan klip selebar halaman (1600 px), sehingga lebar gambar ≥ 1400 px.
// Setiap bagian memakai profil browser bersih; mode worker (bawaan).
//
// Pemakaian (root repo, server build final berjalan):
//   node testing/final/harness/bab5-gambar.cjs --base=http://localhost:3101
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");
const { buildEnv } = require("../../black-box/harness/bb-env.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(REPO, "testing/bab5/gambar");
const MVD = path.join(REPO, "testing/glm-mv-reference/data");
const RMD = path.join(REPO, "testing/glm-rm-reference/data");
const W = 1600;
const H = 1000;
const LONG = 10 * 60 * 1000;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const MVOK = "#multivariate-ok-button";
const index = [];

async function newPage(browser) {
    const context = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    return { context, page };
}
async function shot(page, file, caption) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, file) });
    index.push({ file, caption });
    console.log(file);
}
// Kartu hasil (judul, catatan, tabel) dengan klip selebar halaman.
async function shotCard(page, title, file, caption) {
    const log = page.locator('[data-testid^="result-log-"]').last();
    const inner = page.locator('[data-testid^="result-table-"]').filter({ hasText: title });
    const card = log.locator('[data-testid^="result-analytic-"]').filter({ has: inner }).first();
    const out = log.locator('[data-testid^="result-output-"]').filter({ has: inner }).first();
    const toggle = out.locator('[data-testid^="toggle-table-"]').filter({ hasText: /Show Full/ });
    if (await toggle.count()) await toggle.first().click().catch(() => {});
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box = await card.boundingBox();
    const scrollY = await page.evaluate(() => window.scrollY);
    await page.screenshot({ path: path.join(OUT, file), fullPage: true, clip: { x: 0, y: box.y + scrollY - 8, width: W, height: box.height + 16 } });
    index.push({ file, caption });
    console.log(file);
}
async function openGlm(page, item) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: item, exact: true }).click();
}
const avail = (page, name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
async function cont(page) {
    await page.getByRole("button", { name: "Continue", exact: true }).last().click();
    await page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
}
async function checks(page, ids) {
    for (const id of ids) { const b = page.locator(`#${id}`); if ((await b.getAttribute("data-state")) !== "checked") await b.click(); }
}
async function fillSigma(page, prefix, upper) {
    for (let i = 0; i < upper.length; i++) for (let j = i; j < upper.length; j++) await page.locator(`#${prefix}-${i}-${j}`).fill(String(upper[i][j - i]));
}
async function mvRunAndResult(page) {
    const before = await page.evaluate(() => performance.getEntriesByName("glm-analysis-end", "mark").length);
    await page.locator(MVOK).click();
    await page.waitForFunction((n) => performance.getEntriesByName("glm-analysis-end", "mark").length > n, before, { timeout: LONG });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
}

// 1. MV satu populasi: dialog utama, Test Values + Σ, Options; hasil χ² dan CI.
async function mvOne(browser) {
    const { context, page } = await newPage(browser);
    await runner.importCsv(page, path.join(MVD, "hotelling 1 populasi.csv"));
    await openGlm(page, "Multivariate");
    await page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
    for (const v of ["mpg", "disp", "hp", "wt"]) await avail(page, v).dblclick();
    await shot(page, "mv-01-dialog-utama.png", "Dialog utama GLM Multivariate (satu populasi: DV mpg, disp, hp, wt)");
    await page.getByRole("button", { name: "Test Values", exact: true }).click();
    await page.locator("#mu0-0").waitFor();
    for (const [i, v] of [20, 200, 150, 3].entries()) await page.locator(`#mu0-${i}`).fill(String(v));
    await shot(page, "mv-02-test-values.png", "Subdialog Test Values (μ₀), kotak Σ diketahui belum dicentang");
    await page.locator("#known-sigma-checkbox").click();
    await fillSigma(page, "known-sigma", [[36, -630, -320, -5], [15000, 6700, 107], [4700, 44], [1]]);
    await shot(page, "mv-03-sigma-diketahui-satu-populasi.png", "Subdialog Test Values dengan Σ diketahui (segitiga bawah terisi otomatis)");
    await cont(page);
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator("#DescStats").waitFor();
    await checks(page, ["DescStats", "EstEffectSize", "ObsPower", "SimultaneousCI"]);
    await shot(page, "mv-04-options.png", "Subdialog Options (Descriptive statistics, Estimates of effect size, Observed power, Simultaneous CI)");
    await cont(page);
    await mvRunAndResult(page);
    await shotCard(page, "Chi-Square Test (Known Covariance Matrix)", "hasil-03-uji-khi-kuadrat.png", "Tabel Chi-Square Test (Known Covariance Matrix), satu populasi");
    await shotCard(page, "Simultaneous Confidence Intervals (Known Covariance Matrix)", "hasil-04-ci-sigma-diketahui.png", "Tabel Simultaneous Confidence Intervals (Known Covariance Matrix)");
    await context.close();
}

// 2. MV dua populasi: δ₀, Σ₁/Σ₂; hasil Multivariate Tests (catatan kaki) dan CI simultan.
async function mvTwo(browser) {
    const { context, page } = await newPage(browser);
    await runner.importCsv(page, path.join(MVD, "hotelling 2 populasi independen.csv"));
    await openGlm(page, "Multivariate");
    await page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
    for (const v of ["x1", "x2", "x3", "x4"]) await avail(page, v).dblclick();
    await avail(page, "jk").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
    await page.locator("#variance-pooled").click();
    await page.locator("#two-sample-delta-button").click();
    await page.locator("#delta0-2s-0").waitFor();
    for (const [i, v] of [3, 2, 10, 1].entries()) await page.locator(`#delta0-2s-${i}`).fill(String(v));
    await shot(page, "mv-05-delta0.png", "Subdialog Test Values (δ₀) dua populasi");
    await page.locator("#two-sample-known-sigma-checkbox").click();
    await page.locator("#known-sigma-separate").click();
    await fillSigma(page, "two-sample-known-sigma1", [[5, 4.5, 6.5, 5], [13, 7, 6], [29, 14], [17]]);
    await fillSigma(page, "two-sample-known-sigma2", [[9, 7.5, 4.5, 4], [19, 9.5, 5.5], [29, 13], [28]]);
    await shot(page, "mv-06-sigma-diketahui-dua-populasi.png", "Subdialog Test Values (δ₀) dengan Σ₁ dan Σ₂ diketahui (berlabel level faktor)");
    await cont(page);
    await page.locator("#two-sample-delta-summary").scrollIntoViewIfNeeded();
    await shot(page, "mv-07-dialog-utama-dua-populasi.png", "Dialog utama dua populasi: panel Covariance Matrices dan ringkasan δ₀ · Σ₁, Σ₂ known");
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator("#DescStats").waitFor();
    await checks(page, ["EstEffectSize", "ObsPower", "SimultaneousCI"]);
    await cont(page);
    await mvRunAndResult(page);
    await shotCard(page, "Multivariate Tests", "hasil-01-multivariate-tests-catatan-kaki.png", "Tabel Multivariate Tests dua populasi dengan catatan H₀ δ₀ dan catatan kaki gaya SPSS");
    await shotCard(page, "Simultaneous Confidence Intervals", "hasil-02-ci-simultan.png", "Tabel Simultaneous Confidence Intervals (T² dan Bonferroni)");
    await context.close();
}

// 3. MV Two-Way: Model dan Post Hoc.
async function mvModelPosthoc(browser) {
    const { context, page } = await newPage(browser);
    await runner.importCsv(page, path.join(MVD, "two-way manova.csv"));
    await openGlm(page, "Multivariate");
    await page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
    for (const v of ["Y1A1", "Y2A1"]) await avail(page, v).dblclick();
    for (const v of ["faktorA", "faktorB"]) await avail(page, v).dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
    await page.getByRole("button", { name: "Model", exact: true }).click();
    await page.getByRole("dialog").filter({ has: page.getByText("Multivariate: Model", { exact: true }) }).waitFor();
    await shot(page, "mv-08-model.png", "Subdialog Model (Full Factorial, Build Terms, Build Custom Terms; Sum of Squares)");
    await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await page.locator(MVOK).waitFor({ state: "visible", timeout: 60000 });
    await page.getByRole("button", { name: "Post Hoc", exact: true }).click();
    const dlg = page.getByRole("dialog").filter({ has: page.getByText("Multivariate: Post Hoc", { exact: true }) });
    await dlg.waitFor();
    const source = dlg.locator('[draggable="true"]').filter({ hasText: exact("faktorB") }).first();
    const target = dlg.locator("div.flex-col", { has: page.getByText(/^\s*Post Hoc Tests for:\s*$/) }).last();
    await source.dragTo(target);
    await checks(page, ["Lsd", "Bonfe", "Sidak"]);
    await shot(page, "mv-09-post-hoc.png", "Subdialog Post Hoc (LSD, Bonferroni, Sidak aktif; metode lain nonaktif)");
    await context.close();
}

// 4. RM: Define, dialog utama; hasil Mauchly dan Tests of Within-Subjects Effects.
async function rm(browser) {
    const { context, page } = await newPage(browser);
    await runner.importCsv(page, path.join(RMD, "rm_b.csv"));
    await openGlm(page, "Repeated Measures");
    await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
    await page.locator("#factorName").fill("waktu");
    await page.locator("#factorLevels").fill("");
    await page.locator("#factorLevels").pressSequentially("4");
    await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
    await page.locator("#measureName").fill("skor");
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
    await shot(page, "rm-01-define.png", "Dialog Define GLM Repeated Measures (faktor waktu 4 level, measure skor)");
    await page.getByRole("button", { name: "Define", exact: true }).click();
    const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
    await within.waitFor({ state: "visible", timeout: 60000 });
    const badge = (v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
    for (const v of ["w1", "w2", "w3", "w4"]) await badge(v).dragTo(within);
    const between = page.locator("div", { has: page.getByText("Between-Subjects Factor(s):", { exact: true }) }).last();
    await badge("kelompok").dragTo(between);
    await shot(page, "rm-02-dialog-utama.png", "Dialog utama GLM Repeated Measures (w1–w4, faktor between kelompok)");
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator("#DescStats").waitFor();
    await checks(page, ["DescStats", "EstEffectSize", "ObsPower"]);
    await page.getByRole("button", { name: "Continue", exact: true }).last().click();
    await within.waitFor({ state: "visible", timeout: 60000 });
    const before = await page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return db.objectStoreNames.contains("logs") ? await req(db.transaction("logs", "readonly").objectStore("logs").count()) : 0; } finally { db.close(); }
    });
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page.waitForFunction(async (n) => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        try { return (await req(db.transaction("logs", "readonly").objectStore("logs").count())) > n; } finally { db.close(); }
    }, before, { timeout: LONG, polling: 250 });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
    await shotCard(page, "Mauchly's Test of Sphericity", "hasil-05-mauchly.png", "Tabel Mauchly's Test of Sphericity (rm_b)");
    await shotCard(page, "Tests of Within-Subjects Effects", "hasil-06-within-subjects-effects.png", "Tabel Tests of Within-Subjects Effects (rm_b) dengan catatan kaki alpha");
    await context.close();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const env = await buildEnv(BASE);
    const browser = await chromium.launch();
    for (const part of [mvOne, mvTwo, mvModelPosthoc, rm]) await part(browser);
    await browser.close();
    fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ env, createdAt: new Date().toISOString(), viewport: { width: W, height: H }, images: index }, null, 1));
})().catch((e) => { console.error("BAB5 GAMBAR FAILED:", e); process.exit(1); });
