// Runs the GLM worker spike page in headless Chromium and prints the outcome.
// Usage: node spike-run.cjs <baseURL>
const { chromium } = require("@playwright/test"); // hoisted to the repo-root node_modules

(async () => {
    const base = process.argv[2];
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const logs = [];
    page.on("console", (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
    page.on("worker", (w) => logs.push(`[worker created] ${w.url()}`));
    await page.goto(`${base}/glm-worker-spike`, { timeout: 600000 });
    await page.waitForSelector('#spike-result[data-done="1"]', { timeout: 600000 });
    const outcome = await page.evaluate(() => window.__spike);
    console.log(JSON.stringify(outcome, null, 2));
    console.log("---- browser logs ----");
    for (const l of logs) console.log(l.slice(0, 400));
    await browser.close();
})().catch((e) => {
    console.error("SPIKE RUNNER FAILED:", e);
    process.exit(1);
});
