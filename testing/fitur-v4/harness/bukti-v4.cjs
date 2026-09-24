// Tangkapan layar fitur v4 (δ₀ dua populasi/berpasangan dan CI simultan)
// lewat antarmuka asli build produksi: impor CSV dari menu File, menu
// Analyze, isi dialog, klik tombol (mode eksekusi bawaan: worker). Setiap
// alur memakai browser context baru. Keluaran: testing/fitur-v4/bukti/*.png
// dan bukti.json (judul tabel, catatan, galat).
//
// Pemakaian (root repo, server berjalan):
//   node testing/fitur-v4/harness/bukti-v4.cjs --base=http://localhost:3101
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(REPO, "testing/fitur-v4/bukti");
const MVD = path.join(REPO, "testing/glm-mv-reference/data");
const LONG = 10 * 60 * 1000;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const avail = (page, name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
const OK = "#multivariate-ok-button";
const report = { base: BASE, shots: [] };

async function snap(target, file, label) {
    // Let the modal open animation (fade/zoom) finish first.
    await new Promise((r) => setTimeout(r, 1000));
    await target.screenshot({ path: path.join(OUT, file) });
    report.shots.push({ file, label });
    console.log(`${file}: ${label}`);
}

async function start(browser, csv) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    await runner.importCsv(page, csv);
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
    await page.locator(OK).waitFor({ state: "visible", timeout: 60000 });
    return { context, page };
}
async function continueMain(page, scope = page) {
    await scope.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator(OK).waitFor({ state: "visible", timeout: 60000 });
}
async function options(page, ids, shot) {
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator(`#${ids[0]}`).waitFor({ state: "visible", timeout: 30000 });
    for (const id of ids) {
        const box = page.locator(`#${id}`);
        if ((await box.getAttribute("data-state")) !== "checked") await box.click();
    }
    if (shot) await snap(page, shot, "Options: checkbox Simultaneous CI (T² & Bonferroni) dicentang; Significance Level menentukan tingkat kepercayaan");
    await continueMain(page);
}
async function run(page) {
    await page.locator(OK).click();
    await page.waitForFunction(() => [...document.querySelectorAll("[data-sonner-toast]")].some((t) => /completed successfully|An error occurred during Multivariate/.test(t.innerText)), null, { timeout: LONG, polling: 100 });
    const toast = await page.locator("[data-sonner-toast]").first().innerText();
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
    return toast.replace(/\s+/g, " ").trim();
}
// Seluruh kartu hasil (judul, catatan, tabel) yang memuat tabel berjudul title.
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

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    report.chromium = browser.version();

    // 1. Dua populasi, Pooled, δ₀ = (3, 2, 10, 1), CI simultan.
    {
        const { context, page } = await start(browser, path.join(MVD, "hotelling 2 populasi independen.csv"));
        for (const v of ["x1", "x2", "x3", "x4"]) await avail(page, v).dblclick();
        await avail(page, "jk").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        await page.locator("#variance-pooled").click();
        await snap(page, "01-dialog-utama-tombol-delta0.png", "Dialog utama: tombol Test Values (δ₀) dan ringkasan δ₀ = 0 di panel Covariance Matrices");
        await page.locator("#two-sample-delta-button").click();
        await page.locator("#delta0-2s-0").waitFor({ state: "visible", timeout: 30000 });
        for (const [i, v] of [3, 2, 10, 1].entries()) await page.locator(`#delta0-2s-${i}`).fill(String(v));
        await snap(page, "02-dialog-delta0-dua-populasi.png", "Subdialog Test Values (δ₀) — Hotelling T² Dua Populasi, arah H₀ μ(jk = 1) − μ(jk = 2) = δ₀, isian δ₀ = 3, 2, 10, 1");
        await continueMain(page);
        await snap(page, "03-dialog-utama-ringkasan-delta0.png", "Dialog utama sesudah Continue: ringkasan δ₀ = [3, 2, 10, 1]");
        await options(page, ["DescStats", "SimultaneousCI"], "04-options-simultaneous-ci.png");
        report.run1 = await run(page);
        await snapCard(page, "Multivariate Tests", "05-multivariate-tests-catatan-delta0.png", "Multivariate Tests dengan catatan H₀ dan δ₀ (data geser)");
        await snapCard(page, "Simultaneous Confidence Intervals", "06-tabel-ci-dua-populasi-pooled-delta0.png", "Tabel CI simultan dua populasi (Pooled), δ₀ ≠ 0, skala data asli, kolom Contains δ₀");
        await snapCard(page, "Descriptive Statistics", "07-descriptive-statistics-data-asli.png", "Descriptive Statistics tetap pada data asli");
        await context.close();
    }
    // 2. Satu populasi, μ₀ = (20, 200, 150, 3), CI simultan.
    {
        const { context, page } = await start(browser, path.join(MVD, "hotelling 1 populasi.csv"));
        for (const v of ["mpg", "disp", "hp", "wt"]) await avail(page, v).dblclick();
        await page.getByRole("button", { name: "Test Values", exact: true }).click();
        for (const [i, v] of [20, 200, 150, 3].entries()) await page.locator(`#mu0-${i}`).fill(String(v));
        await continueMain(page);
        await options(page, ["SimultaneousCI"]);
        report.run2 = await run(page);
        await snapCard(page, "Simultaneous Confidence Intervals", "08-tabel-ci-satu-populasi.png", "Tabel CI simultan satu populasi (§5.4: T² dan Bonferroni), kolom Contains μ₀");
        await context.close();
    }
    // 3. Dua populasi, Unequal (Welch), CI simultan.
    {
        const { context, page } = await start(browser, path.join(MVD, "hotelling 2 populasi independen.csv"));
        for (const v of ["x1", "x2", "x3", "x4"]) await avail(page, v).dblclick();
        await avail(page, "jk").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        await page.locator("#variance-welch").click();
        await options(page, ["SimultaneousCI"]);
        report.run3 = await run(page);
        await snapCard(page, "Simultaneous Confidence Intervals", "09-tabel-ci-dua-populasi-unequal.png", "Tabel CI simultan dua populasi Unequal (T² Krishnamoorthy–Yu, Bonferroni Welch t per variabel, kolom df)");
        await context.close();
    }
    // 4. Berpasangan, δ₀ = (8, 3), CI simultan.
    {
        const { context, page } = await start(browser, path.join(MVD, "hotelling berpasangan (data asli).csv"));
        await page.getByRole("button", { name: "Paired", exact: true }).click();
        const dlg = page.getByRole("dialog").filter({ hasText: "Paired (Hotelling T²)" });
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        const list = dlg.locator("#multivariate-paired-available-variables");
        for (const v of ["kedalaman1", "kedalaman2", "ukuran1", "ukuran2"]) await list.getByText(v, { exact: true }).first().dblclick();
        for (const [i, v] of [8, 3].entries()) await dlg.locator(`#delta0-${i}`).fill(String(v));
        await snap(page, "10-dialog-paired-delta0.png", "Dialog Paired: pasangan d1, d2 dan δ₀ = 8, 3 (H₀: μd = δ₀)");
        await continueMain(page, dlg);
        await options(page, ["SimultaneousCI"]);
        report.run4 = await run(page);
        await snapCard(page, "Multivariate Tests", "11-multivariate-tests-berpasangan-delta0.png", "Multivariate Tests berpasangan dengan catatan H₀: μd = δ₀");
        await snapCard(page, "Simultaneous Confidence Intervals", "12-tabel-ci-berpasangan-delta0.png", "Tabel CI simultan berpasangan, δ₀ = 8, 3, kolom Contains δ₀");
        await context.close();
    }
    // 5. Negatif: Fixed Factor dengan 3 level → pesan di subdialog δ₀.
    {
        const { context, page } = await start(browser, path.join(MVD, "one-way manova.csv"));
        for (const v of ["y1", "y2"]) await avail(page, v).dblclick();
        await avail(page, "treatment").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        await page.locator("#two-sample-delta-button").click();
        await page.getByText(/δ₀ hanya berlaku bila Fixed Factor memiliki tepat 2 level/).waitFor({ timeout: 30000 });
        await snap(page, "13-dialog-delta0-faktor-tiga-level.png", "Subdialog δ₀ dengan Fixed Factor 3 level: pesan δ₀ hanya berlaku untuk tepat 2 level");
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, "bukti.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("BUKTI V4 GAGAL:", e); fs.writeFileSync(path.join(OUT, "bukti.json"), JSON.stringify(report, null, 2) + "\n"); process.exit(1); });
