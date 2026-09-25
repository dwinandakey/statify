// Runs the five validation configurations through the REAL GLM Multivariate
// dialog of a production build (Web Worker mode by default) and stores the
// output tables the app wrote to IndexedDB.
//
// Per configuration: fresh browser context, CSV import (File > Import > CSV),
// execution mode set in localStorage, dialog filled as in README section 2
// (Dependent Variables, Fixed Factor(s), Options, Test Values or Paired),
// OK, wait for the "glm-analysis-end" mark, read the tables of the last log.
//
// Usage (repo root, production server running):
//   node testing/glm-mv-reference/harness/ui-run.cjs --base=http://localhost:3101 \
//        --configs=mv1,mv2,mv3,mv4,mv5 --mode=worker \
//        --out=testing/glm-mv-reference/results/spss-validation/statify-output
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const runner = require("../../glm-web-worker/experiment/run-experiment.cjs");

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = args.base || "http://localhost:3101";
const MODE = args.mode || "worker";
const OUT = path.resolve(args.out || "testing/glm-mv-reference/results/spss-validation/statify-output");
const DATA = path.resolve(__dirname, "../data");

const OPT = ["DescStats", "EstEffectSize", "ObsPower"];
const CONFIGS = {
    mv1: { csv: "hotelling 1 populasi.csv", dep: ["mpg", "disp", "hp", "wt"], fix: [], options: OPT, testValues: [20, 200, 150, 3] },
    mv2: { csv: "hotelling 2 populasi independen.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "HomogenTest"], variance: "variance-pooled" },
    mv3: { csv: "hotelling berpasangan (data asli).csv", dep: [], fix: [], options: OPT, pairs: [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]] },
    mv4: { csv: "one-way manova.csv", dep: ["y1", "y2"], fix: ["treatment"], options: [...OPT, "HomogenTest"] },
    mv5: { csv: "two-way manova.csv", dep: ["Y1A1", "Y2A1"], fix: ["faktorA", "faktorB"], options: [...OPT, "HomogenTest"] },
    // Validasi lanjutan (Langkah 7, make_derived.R).
    mv6: { csv: "two-way manova tak seimbang.csv", dep: ["Y1A1", "Y2A1"], fix: ["faktorA", "faktorB"], options: [...OPT, "HomogenTest"] },
    mv7: { csv: "hotelling 2 populasi independen dengan nilai hilang.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "HomogenTest"], variance: "variance-pooled" },
    // skripsi-final-v2: model efek utama (dialog Model, Build Terms) dan post hoc.
    mv8: { csv: "two-way manova.csv", dep: ["Y1A1", "Y2A1"], fix: ["faktorA", "faktorB"], options: [...OPT, "HomogenTest"], buildTerms: ["faktorA", "faktorB"] },
    mv4ph: { csv: "one-way manova.csv", dep: ["y1", "y2"], fix: ["treatment"], options: [...OPT, "HomogenTest"], posthoc: { factors: ["treatment"], methods: ["Lsd", "Bonfe", "Sidak"] } },
    // skripsi-final-v4 (testing/fitur-v4): δ₀ dua populasi dan berpasangan
    // (d = data asli dengan δ₀, s = data tergeser manual dengan δ₀ = 0; hasil
    // uji d harus sama dengan s), dan CI simultan (ci).
    mv2d: { csv: "hotelling 2 populasi independen.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "HomogenTest"], variance: "variance-pooled", twoSampleDelta: [3, 2, 10, 1] },
    mv2s: { csvPath: "testing/fitur-v4/data/mv2-geser.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "HomogenTest"], variance: "variance-pooled" },
    mv2wd: { csv: "hotelling 2 populasi independen.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "HomogenTest"], variance: "variance-welch", twoSampleDelta: [3, 2, 10, 1] },
    mv2ws: { csvPath: "testing/fitur-v4/data/mv2-geser.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "HomogenTest"], variance: "variance-welch" },
    mv3d: { csv: "hotelling berpasangan (data asli).csv", dep: [], fix: [], options: OPT, pairs: [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]], delta0: [8, 3] },
    mv3s: { csvPath: "testing/fitur-v4/data/mv3-geser.csv", dep: [], fix: [], options: OPT, pairs: [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]] },
    mv1ci: { csv: "hotelling 1 populasi.csv", dep: ["mpg", "disp", "hp", "wt"], fix: [], options: [...OPT, "SimultaneousCI"], testValues: [20, 200, 150, 3] },
    mv1ci10: { csv: "hotelling 1 populasi.csv", dep: ["mpg", "disp", "hp", "wt"], fix: [], options: [...OPT, "SimultaneousCI"], testValues: [20, 200, 150, 3], sigLevel: 0.1 },
    mv2ci: { csv: "hotelling 2 populasi independen.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "SimultaneousCI"], variance: "variance-pooled" },
    mv2wci: { csv: "hotelling 2 populasi independen.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "SimultaneousCI"], variance: "variance-welch" },
    mv2dci: { csv: "hotelling 2 populasi independen.csv", dep: ["x1", "x2", "x3", "x4"], fix: ["jk"], options: [...OPT, "SimultaneousCI"], variance: "variance-pooled", twoSampleDelta: [3, 2, 10, 1] },
    mv3ci: { csv: "hotelling berpasangan (data asli).csv", dep: [], fix: [], options: [...OPT, "SimultaneousCI"], pairs: [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]] },
    mv3dci: { csv: "hotelling berpasangan (data asli).csv", dep: [], fix: [], options: [...OPT, "SimultaneousCI"], pairs: [["kedalaman1", "kedalaman2"], ["ukuran1", "ukuran2"]], delta0: [8, 3] },
    // skripsi-final-v5 (B1): 3 DV, faktor 4 level tak seimbang, df2 Wilks pecahan (make_mv9.R).
    mv9: { csv: "one-way manova tiga dv empat level.csv", dep: ["y1", "y2", "y3"], fix: ["kelompok"], options: [...OPT, "HomogenTest"] },
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The Multivariate list shows "name [label]" when a label exists.
const nameWithLabel = (s) => new RegExp(`^\\s*${esc(s)}(\\s*\\[.*\\])?\\s*$`);
const available = (page, name) =>
    page.locator('[data-testid^="variable-item-available-"]', {
        has: page.locator('[data-testid^="variable-name-available-"]').filter({ hasText: nameWithLabel(name) }),
    }).first();
const inList = (page, list) => page.locator(`[data-testid^="variable-name-${list}-"]`);

// Sub-dialog by its title, and a drag of one of its draggable badges onto the
// drop area holding the given label (Model: / Post Hoc Tests for:).
const dialogTitled = (page, title) => page.getByRole("dialog").filter({ has: page.getByText(title, { exact: true }) });
async function dragBadge(dlg, name, dropLabel) {
    const source = dlg.locator('[draggable="true"]').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) }).first();
    const target = dlg.locator("div.flex-col", { has: dlg.page().getByText(new RegExp(`^\\s*${esc(dropLabel)}\\s*$`)) }).last();
    await source.dragTo(target);
    if ((await target.innerText()).split(String.fromCharCode(10)).some((line) => line.trim() === name)) return;
    // Fallback: the dialog's own HTML5 handlers (dragstart sets "text",
    // drop reads it), dispatched with one DataTransfer.
    const dt = await dlg.page().evaluateHandle(() => new DataTransfer());
    await source.dispatchEvent("dragstart", { dataTransfer: dt });
    await target.dispatchEvent("dragover", { dataTransfer: dt });
    await target.dispatchEvent("drop", { dataTransfer: dt });
    await source.dispatchEvent("dragend", { dataTransfer: dt });
}

async function fillDialog(page, c) {
    await page.locator('[data-testid="analyze-menu-trigger"]').click();
    await page.getByRole("menuitem", { name: "General Linear Model" }).click();
    await page.getByRole("menuitem", { name: "Multivariate", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    for (const v of c.dep) await available(page, v).dblclick();
    for (const v of c.fix) await available(page, v).dragTo(page.locator('[data-testid="FixFactor-variables-list-container"]'));
    if (c.variance) await page.locator(`#${c.variance}`).click();
    if (c.twoSampleDelta) {
        await page.locator("#two-sample-delta-button").click();
        await page.locator("#delta0-2s-0").waitFor({ state: "visible", timeout: 30000 });
        for (let i = 0; i < c.twoSampleDelta.length; i++) await page.locator(`#delta0-2s-${i}`).fill(String(c.twoSampleDelta[i]));
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    }

    await page.getByRole("button", { name: "Options", exact: true }).click();
    await page.locator(`#${c.options[0]}`).waitFor({ state: "visible", timeout: 30000 });
    for (const id of c.options) {
        const box = page.locator(`#${id}`);
        if ((await box.getAttribute("data-state")) !== "checked") await box.click();
        if ((await box.getAttribute("data-state")) !== "checked") throw new Error(`Options: ${id} not checked`);
    }
    if (c.sigLevel !== undefined) await page.locator("#SigLevel").fill(String(c.sigLevel));
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });

    if (c.buildTerms) {
        await page.getByRole("button", { name: "Model", exact: true }).click();
        const dlg = dialogTitled(page, "Multivariate: Model");
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        await dlg.locator("#Custom").click();
        for (const term of c.buildTerms) await dragBadge(dlg, term, "Model:");
        const model = dlg.locator("div.flex-col", { has: page.getByText(/^\s*Model:\s*$/) }).last();
        for (const term of c.buildTerms) {
            if (!(await model.getByText(term, { exact: true }).count())) throw new Error(`Model: term "${term}" not added`);
        }
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    }
    if (c.posthoc) {
        await page.getByRole("button", { name: "Post Hoc", exact: true }).click();
        const dlg = dialogTitled(page, "Multivariate: Post Hoc");
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        for (const f of c.posthoc.factors) await dragBadge(dlg, f, "Post Hoc Tests for:");
        const phList = dlg.locator("div.flex-col", { has: page.getByText("Post Hoc Tests for:", { exact: true }) }).last();
        const phText = await phList.innerText();
        for (const f of c.posthoc.factors) {
            if (!phText.split(/\r?\n/).some((line) => line.trim() === f)) throw new Error(`Post Hoc: factor "${f}" not added (list: ${JSON.stringify(phText)})`);
        }
        for (const id of c.posthoc.methods) {
            const box = dlg.locator(`#${id}`);
            if ((await box.getAttribute("data-state")) !== "checked") await box.click();
            if ((await box.getAttribute("data-state")) !== "checked") throw new Error(`Post Hoc: ${id} not checked`);
        }
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    }
    if (c.testValues) {
        await page.getByRole("button", { name: "Test Values", exact: true }).click();
        for (let i = 0; i < c.testValues.length; i++) await page.locator(`#mu0-${i}`).fill(String(c.testValues[i]));
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    }
    if (c.pairs) {
        await page.getByRole("button", { name: "Paired", exact: true }).click();
        const dlg = page.getByRole("dialog").filter({ hasText: "Paired (Hotelling T²)" });
        await dlg.waitFor({ state: "visible", timeout: 30000 });
        const avail = dlg.locator("#multivariate-paired-available-variables");
        // Double-click fills Variable 1, then Variable 2 of the same pair.
        for (const [v1, v2] of c.pairs) {
            for (const v of [v1, v2]) await avail.getByText(v, { exact: true }).first().dblclick();
        }
        for (let i = 0; i < c.pairs.length; i++) {
            const label = `d${i + 1} = ${c.pairs[i][0]} − ${c.pairs[i][1]}`;
            if (!(await dlg.getByText(label, { exact: true }).count())) throw new Error(`Paired: missing "${label}"`);
        }
        for (let i = 0; i < (c.delta0 ?? []).length; i++) await dlg.locator(`#delta0-${i}`).fill(String(c.delta0[i]));
        await dlg.getByRole("button", { name: "Continue", exact: true }).click();
        await page.locator("#multivariate-ok-button").waitFor({ state: "visible", timeout: 60000 });
    }

    const dep = await inList(page, "DepVar").allTextContents();
    const fix = await inList(page, "FixFactor").allTextContents();
    if (dep.length !== c.dep.length || fix.length !== c.fix.length) throw new Error(`dialog: DV ${JSON.stringify(dep)}, factors ${JSON.stringify(fix)}`);
    const variance = c.variance ? await page.locator(`#${c.variance}`).getAttribute("data-state") : null;
    return { dep, fix, variance };
}

// Records every Worker request and response of the page (test-side only; the
// app is unchanged): the GLM worker answers with the raw WASM results
// ({ id, ok, results, errors }) before the formatter rounds them for display.
const WORKER_TAP = () => {
    window.__workerTap = [];
    const Native = window.Worker;
    window.Worker = class extends Native {
        constructor(url, opts) {
            super(url, opts);
            const src = String(url);
            const post = this.postMessage.bind(this);
            this.postMessage = (msg, ...rest) => { window.__workerTap.push({ src, dir: "request", msg }); return post(msg, ...rest); };
            this.addEventListener("message", (e) => window.__workerTap.push({ src, dir: "response", msg: e.data }));
        }
    };
};

async function outputTables(page) {
    return page.evaluate(async () => {
        const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const db = await req(indexedDB.open("Statify"));
        const store = (n) => db.transaction(n, "readonly").objectStore(n);
        const last = (await req(store("logs").openCursor(null, "prev"))).value;
        const out = [];
        for (const a of await req(store("analytics").index("logId").getAll(IDBKeyRange.only(last.id)))) {
            for (const s of await req(store("statistics").index("analyticId").getAll(IDBKeyRange.only(a.id)))) out.push({ title: s.title, output_data: s.output_data });
        }
        db.close();
        return { log: last.log, tables: out };
    });
}

(async () => {
    const browser = await chromium.launch();
    fs.mkdirSync(OUT, { recursive: true });
    const report = { base: BASE, mode: MODE, chromium: browser.version(), startedAt: new Date().toISOString(), configs: {} };
    for (const key of (args.configs || Object.keys(CONFIGS).join(",")).split(",")) {
        const c = CONFIGS[key];
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        await context.addInitScript(WORKER_TAP);
        const page = await context.newPage();
        await page.goto(`${BASE}/dashboard/data`, { timeout: 300000 });
        await page.locator('[data-testid="main-navbar"]').waitFor({ timeout: 300000 });
        await runner.importCsv(page, c.csvPath ? path.resolve(c.csvPath) : path.join(DATA, c.csv));
        await runner.clearResults(page);
        await page.evaluate((m) => localStorage.setItem("glm-execution-mode", m), MODE);
        const dialog = await fillDialog(page, c);
        const dataRows = await page.evaluate(async () => {
            const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
            const db = await req(indexedDB.open("Statify"));
            try { return await req(db.transaction("dataRows", "readonly").objectStore("dataRows").count()); } finally { db.close(); }
        });
        const before = await page.evaluate(() => performance.getEntriesByName("glm-analysis-end", "mark").length);
        await page.locator("#multivariate-ok-button").click({ timeout: 10 * 60 * 1000 });
        await page.waitForFunction((n) => performance.getEntriesByName("glm-analysis-end", "mark").length > n, before, { timeout: 10 * 60 * 1000 });
        await page.waitForTimeout(500);
        const modeActual = await page.evaluate(() => { const e = performance.getEntriesByName("glm-analysis-end", "mark"); return e[e.length - 1].detail?.mode; });
        const { log, tables } = await outputTables(page);
        const summary = await runner.readOutputSummary(page);
        // Last GLM request/response pair (the payload carries the sliced data).
        const tap = await page.evaluate(() => window.__workerTap.filter((t) => t.msg && typeof t.msg === "object" && "id" in t.msg && (t.dir === "request" ? "payload" in t.msg : "ok" in t.msg)));
        const response = tap.filter((t) => t.dir === "response").pop() || null;
        const request = response ? tap.find((t) => t.dir === "request" && t.msg.id === response.msg.id && t.src === response.src) || null : null;
        fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify({ config: key, mode: MODE, modeActual, log, dataRows, dialog, tables }, null, 1));
        fs.writeFileSync(path.join(OUT, `${key}.raw.json`), JSON.stringify({ config: key, worker: response?.src ?? null, request: request?.msg ?? null, response: response?.msg ?? null }, null, 1));
        report.configs[key] = { modeActual, dataRows, dialog, titles: tables.map((t) => t.title), loggedErrors: summary.loggedErrors, rawCaptured: Boolean(response?.msg?.ok) };
        console.log(`${key} ${MODE}->${modeActual} rows=${dataRows} tables=${tables.length} errors=${JSON.stringify(summary.loggedErrors).slice(0, 200)}`);
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, "run-report.json"), JSON.stringify(report, null, 2) + "\n");
})().catch((e) => { console.error("UI RUN FAILED:", e); process.exit(1); });
