// Render flow graph (.dot) ke SVG dan PNG secara offline: viz.js (Graphviz
// versi JavaScript, dari paket R DiagrammeR) di Chromium headless (Playwright).
// Pemakaian (akar repositori): node testing/whitebox/basis-path/render.cjs <path viz.js>
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
    const vizJs = process.argv[2];
    const dir = __dirname;
    const browser = await chromium.launch();
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.setContent("<html><body style='margin:0;background:#fff'><div id='g'></div></body></html>");
    await page.addScriptTag({ content: fs.readFileSync(vizJs, "utf8") });
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".dot")).sort()) {
        const dot = fs.readFileSync(path.join(dir, file), "utf8");
        const svg = await page.evaluate((src) => Viz(src, { format: "svg", engine: "dot" }), dot);
        const base = file.replace(/\.dot$/, "");
        fs.writeFileSync(path.join(dir, `${base}.svg`), svg);
        await page.evaluate((s) => { document.getElementById("g").innerHTML = s; }, svg);
        const el = await page.$("#g svg");
        await el.screenshot({ path: path.join(dir, `${base}.png`) });
        console.log(`${base}.png`);
    }
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
