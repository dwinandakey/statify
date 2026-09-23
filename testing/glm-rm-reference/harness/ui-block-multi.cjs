// Checks in the REAL Repeated Measures dialog (production build) that a second
// within-subjects factor cannot be added (designs with more than one
// within-subjects factor are blocked, see results/spss-validation-de).
// Usage (repo root, server running):
//   node testing/glm-rm-reference/harness/ui-block-multi.cjs --base=http://localhost:3101 --out=<file.json>
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const MESSAGE = "Designs with more than one within-subjects factor are not supported in this version.";

(async () => {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
    await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
    await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
    await runner.importCsv(page, path.resolve(__dirname, "../data/rm_e.csv"));
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Repeated Measures", exact: true }).click();
    await page.locator("#factorName").waitFor({ state: "visible", timeout: 60000 });
    const add = async (name, levels) => {
        await page.locator("#factorName").fill(name);
        await page.locator("#factorLevels").fill(String(levels));
        await page.getByRole("button", { name: "Add", exact: true }).nth(0).click();
    };
    await add("kondisi", 2);
    const first = await page.getByText("kondisi(2)", { exact: true }).count();
    await add("waktu", 3);
    const toast = page.getByText(MESSAGE, { exact: true });
    await toast.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const report = {
        base: BASE,
        firstFactorAdded: first > 0,
        secondFactorAdded: (await page.getByText("waktu(3)", { exact: true }).count()) > 0,
        messageShown: (await toast.count()) > 0,
        message: MESSAGE,
    };
    report.blocked = report.firstFactorAdded && !report.secondFactorAdded && report.messageShown;
    console.log(JSON.stringify(report));
    if (args.out) fs.writeFileSync(path.resolve(args.out), JSON.stringify(report, null, 2) + "\n");
    await browser.close();
    process.exitCode = report.blocked ? 0 : 1;
})().catch((e) => { console.error("UI CHECK FAILED:", e); process.exit(1); });
