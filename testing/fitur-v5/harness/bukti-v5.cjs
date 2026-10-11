// Pemeriksaan singkat v5 lewat antarmuka asli build produksi worktree (bukan
// eksekusi black-box penuh): A1 toast δ₀, A3 kolom effect size/power, A4
// catatan kaki, A2 angka RM, B3 Type IV sel kosong, B4 dialog Model RM.
// Keluaran: testing/fitur-v5/bukti/*.png dan bukti.json.
//
// Pemakaian (root repo worktree, server berjalan):
//   node testing/fitur-v5/harness/bukti-v5.cjs --base=http://localhost:3201
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3201";
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(REPO, "testing/fitur-v5/bukti");
const MVD = path.join(REPO, "testing/glm-mv-reference/data");
const RMD = path.join(REPO, "testing/glm-rm-reference/data");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const report = { base: BASE, buildId: fs.readFileSync(path.join(REPO, "frontend/.next/BUILD_ID"), "utf8").trim(), checks: {}, shots: [] };
const OK = "#multivariate-ok-button";

async function snap(target, file, label) {
    await new Promise((r) => setTimeout(r, 900));
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
    return { context, page };
}
async function openMv(page) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
    await page.locator(OK).waitFor({ state: "visible", timeout: 60000 });
}
const avail = (page, name) => page.locator('[data-testid^="variable-item-available-"]', { has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }) }).first();
async function options(page, ids) {
    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator("#EstEffectSize").waitFor({ state: "visible", timeout: 30000 });
    for (const id of ids) if ((await page.locator(`#${id}`).getAttribute("data-state")) !== "checked") await page.locator(`#${id}`).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator(OK).waitFor({ state: "visible", timeout: 60000 });
}
async function toastAfterOk(page) {
    await page.locator(OK).click();
    await page.waitForFunction(() => [...document.querySelectorAll("[data-sonner-toast]")].some((t) => /completed successfully|An error occurred/.test(t.innerText)), null, { timeout: 600000, polling: 50 });
    const texts = await page.locator("[data-sonner-toast]").allInnerTexts();
    return texts.map((t) => t.replace(/\s+/g, " ").trim());
}
async function resultCard(page, title, file, label) {
    await page.waitForTimeout(800);
    await page.locator('[data-testid="result-tab"]').click();
    await page.waitForURL(/\/dashboard\/result/, { timeout: 60000 });
    await page.locator('[data-testid^="result-log-"]').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1200);
    const log = page.locator('[data-testid^="result-log-"]').last();
    const inner = page.locator('[data-testid^="result-table-"]').filter({ hasText: title });
    const card = log.locator('[data-testid^="result-analytic-"]').filter({ has: inner }).first();
    await card.scrollIntoViewIfNeeded();
    const text = await card.innerText();
    await snap(card, file, label);
    return text;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    // A1: δ₀ pada faktor 3 level (BB-KF03-08) → toast tanpa "Error: Error:".
    {
        const { context, page } = await start(browser, path.join(MVD, "one-way manova.csv"));
        await openMv(page);
        for (const v of ["y1", "y2"]) await avail(page, v).dblclick();
        await avail(page, "treatment").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        await page.locator("#two-sample-delta-button").click();
        await page.locator("#delta0-2s-0").waitFor({ state: "visible", timeout: 30000 });
        for (let i = 0; i < 2; i++) await page.locator(`#delta0-2s-${i}`).fill("1");
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator(OK).waitFor({ state: "visible" });
        report.checks.a1Toast = await toastAfterOk(page);
        await snap(page, "a1-toast-delta0-faktor-tiga-level.png", "A1: toast δ₀ faktor 3 level (BB-KF03-08)");
        await context.close();
    }
    // A3/A4: mv2 tanpa opsi effect size/power, lalu dengan keduanya.
    for (const [tag, ids] of [["tanpa-opsi", []], ["dengan-opsi", ["EstEffectSize", "ObsPower"]]]) {
        const { context, page } = await start(browser, path.join(MVD, "hotelling 2 populasi independen.csv"));
        await openMv(page);
        for (const v of ["x1", "x2", "x3", "x4"]) await avail(page, v).dblclick();
        await avail(page, "jk").dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        await options(page, ids);
        report.checks[`a3Toast_${tag}`] = await toastAfterOk(page);
        report.checks[`a3a4MT_${tag}`] = await resultCard(page, "Multivariate Tests", `a3a4-mv2-multivariate-tests-${tag}.png`, `A3/A4: Multivariate Tests mv2 (${tag})`);
        report.checks[`a3a4BSE_${tag}`] = await resultCard(page, "Tests of Between-Subjects Effects", `a3a4-mv2-between-${tag}.png`, `A3/A4: Tests of Between-Subjects Effects mv2 (${tag})`);
        await context.close();
    }
    // B3: Type IV dengan sel kosong.
    {
        const { context, page } = await start(browser, path.join(REPO, "testing/fitur-v5/data/two-way-sel-kosong.csv"));
        await openMv(page);
        for (const v of ["Y1A1", "Y2A1"]) await avail(page, v).dblclick();
        for (const f of ["faktorA", "faktorB"]) await avail(page, f).dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
        await page.getByRole("button", { name: "Model", exact: true }).click();
        const dlg = page.getByRole("dialog").filter({ has: page.getByText("Multivariate: Model", { exact: true }) });
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        const row = dlg.locator("div.flex.items-center", { has: page.getByText("Sum of Squares:", { exact: true }) }).first();
        await row.getByRole("combobox").click();
        await page.getByRole("option", { name: "Type IV", exact: true }).click();
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator(OK).waitFor({ state: "visible" });
        report.checks.b3Toast = await toastAfterOk(page);
        await snap(page, "b3-type-iv-sel-kosong.png", "B3: Type IV ditolak pada desain dengan sel kosong");
        await context.close();
    }
    // B4 + A2 RM: dialog Model RM dan tabel RM (rm_b).
    {
        const { context, page } = await start(browser, path.join(RMD, "rm_b.csv"));
        await page.locator('[data-testid="analyze-menu-trigger"]').click();
        await page.getByRole("menuitem", { name: "General Linear Model" }).click();
        await page.getByRole("menuitem", { name: "Repeated Measures", exact: true }).click();
        await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
        await page.locator("#factorName").fill("waktu");
        await page.locator("#factorLevels").fill("4");
        await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
        await page.locator("#measureName").fill("skor");
        await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
        await page.getByRole("button", { name: "Define", exact: true }).click();
        const within = page.locator("div", { has: page.getByText("Within-Subjects Variables:", { exact: true }) }).last();
        const between = page.locator("div", { has: page.getByText("Between-Subjects Factor(s):", { exact: true }) }).last();
        await within.waitFor({ state: "visible", timeout: 60000 });
        const badge = (v) => page.locator('[draggable="true"]').filter({ hasText: exact(v) }).first();
        for (const [i, c] of ["w1", "w2", "w3", "w4"].entries()) if (!(await within.getByText(`${c}_(${i + 1},skor)`, { exact: true }).count())) await badge(c).dragTo(within);
        await badge("kelompok").dragTo(between);
        await page.getByRole("button", { name: "Model", exact: true }).click();
        const dlg = page.getByRole("dialog").filter({ has: page.getByText("Model", { exact: true }) });
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        const row = dlg.locator("div.flex.items-center", { has: page.getByText("Sum of Squares:", { exact: true }) }).first();
        await row.getByRole("combobox").click();
        await page.waitForTimeout(500);
        const opts = page.getByRole("option");
        const states = [];
        for (let i = 0; i < (await opts.count()); i++) states.push([(await opts.nth(i).innerText()).trim(), await opts.nth(i).getAttribute("data-disabled")]);
        report.checks.b4Options = states;
        await snap(page, "b4-rm-model-sum-of-squares.png", "B4: dialog Model RM, hanya Type III aktif");
        await page.keyboard.press("Escape");
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await within.waitFor({ state: "visible" });
        await page.getByRole("button", { name: "Options", exact: true }).click();
        await page.locator("#EstEffectSize").waitFor({ state: "visible", timeout: 30000 });
        for (const id of ["EstEffectSize", "ObsPower"]) if ((await page.locator(`#${id}`).getAttribute("data-state")) !== "checked") await page.locator(`#${id}`).click();
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await within.waitFor({ state: "visible" });
        await page.getByRole("button", { name: "OK", exact: true }).click();
        await page.waitForTimeout(8000);
        report.checks.rmMT = await resultCard(page, "Multivariate Tests", "a2a4-rm-b-multivariate-tests.png", "A2/A4 RM: Multivariate Tests rm_b (4 desimal, catatan kaki SPSS)");
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, "bukti.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("BUKTI V5 GAGAL:", e); fs.writeFileSync(path.join(OUT, "bukti.json"), JSON.stringify(report, null, 2) + "\n"); process.exit(1); });
