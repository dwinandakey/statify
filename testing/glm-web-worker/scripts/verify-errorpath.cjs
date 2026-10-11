// Error path: failed analysis in the worker → rejection with the same text as
// main mode, worker terminated, next analysis runs on a NEW worker.
// Usage: node verify-errorpath.cjs <baseURL>
const { chromium } = require("@playwright/test"); // hoisted to the repo-root node_modules
const base = process.argv[2];

(async () => {
    const browser = await chromium.launch();
    const out = {};
    for (const mod of ["multivariate", "repeated-measures"]) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const workers = [];
        page.on("worker", (w) => workers.push(w.url()));
        await page.goto(`${base}/glm-worker-verify`, { timeout: 600000 });
        await page.waitForSelector('#harness[data-ready="1"]', { timeout: 600000 });
        const h = (fn, ...args) => page.evaluate(([fn, args]) => window.__glmHarness[fn](...args), [fn, args]);

        const okBefore = await h("runCompute", mod, "A", "worker");
        const workersAfterFirst = workers.length;
        const badMain = await h("runBadCompute", mod, "main");
        const badWorker = await h("runBadCompute", mod, "worker");
        const workersAfterBad = workers.length;
        const okAfter = await h("runCompute", mod, "A", "worker");
        out[mod] = {
            firstOkMode: okBefore.mode,
            badMain,
            badWorker,
            sameErrorTextAsMain: badMain.asString === badWorker.asString,
            workerCreations: { afterFirstOk: workersAfterFirst, afterBad: workersAfterBad, afterRecovery: workers.length },
            recoveredMode: okAfter.mode,
            recoveredNonEmpty: okAfter.exact.length > 2,
        };
        console.log(mod, JSON.stringify(out[mod], null, 1));
        await ctx.close();
    }
    await browser.close();
})().catch((e) => { console.error("ERRORPATH FAILED:", e); process.exit(1); });
