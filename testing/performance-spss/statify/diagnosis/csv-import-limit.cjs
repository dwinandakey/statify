// Diagnosis (pilot 2026-10-16): the Statify CSV import worker
// (frontend/public/workers/DataManagement/csvWorker.js, unchanged) on a
// STRING column. Its width rule Math.max(8, ...colData.map(...)) spreads one
// argument per row, which exceeds the worker's call stack above about 63 600
// rows ("Maximum call stack size exceeded"); in the UI the Import button then
// stays disabled and nothing is stored, without an error message.
// Calls the production worker directly with a synthetic CSV (y, g) and
// bisects the largest row count that still parses.
// Usage (production server running): node csv-import-limit.cjs [base]
const { chromium } = require("@playwright/test");
const BASE = process.argv[2] || "http://localhost:3101";
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`${BASE}/dashboard/data`);
    const ok = (n, numeric) => page.evaluate(([n, numeric]) => new Promise((res) => {
        let csv = "y,g\n";
        for (let i = 0; i < n; i++) csv += `${i % 7}.5,${numeric ? (i % 3) + 1 : "G" + ((i % 3) + 1)}\n`;
        const w = new Worker("/workers/DataManagement/csvWorker.js");
        w.onmessage = (e) => { res(e.data.error ?? "ok"); w.terminate(); };
        w.postMessage({ fileContent: csv, options: { firstLineContains: true, delimiter: "comma", decimal: "period", textQualifier: "doubleQuote" } });
    }), [n, numeric]);
    let lo = 10000, hi = 100000;
    while (hi - lo > 500) { const mid = Math.floor((lo + hi) / 2); if ((await ok(mid, false)) === "ok") lo = mid; else hi = mid; }
    console.log(`string column: parses up to ~${lo} rows, fails at ~${hi}`);
    for (const n of [50000, 100000, 200000]) console.log(`n=${n} string: ${await ok(n, false)} | numeric codes: ${await ok(n, true)}`);
    console.log(`chromium ${browser.version()}`);
    await browser.close();
})();
