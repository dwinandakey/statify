// run_browser.mjs — Track E, jalur (a): waktu eksekusi DI PERAMBAN lewat harness statis (tanpa `npm run dev`).
// Menyajikan frontend/public (worker ASLI NB dan AM) + harness lewat serve.mjs, membuka halaman dengan Playwright, dan memanggil
// window.__bench.runCell(...) (harness.js). Yang diukur: performance.now() di main thread dari postMessage sampai onmessage,
// plus Long Tasks dan jeda frame requestAnimationFrame selama komputasi. Protokol: 1 pemanasan + 5 pengukuran.
//
// Pemakaian (dari akar repo):
//   node testing/thesis-eval/perf/run_browser.mjs [--device sandbox|vm|skripsi] [--browser chromium|chrome|msedge]
//        [--executable <path>] [--headed] [--datasets a,b] [--scenarios x,y] [--runs 5] [--run-timeout 900] [--out <csv>]
//   --browser chrome  => Playwright channel 'chrome' (Google Chrome terpasang; dipakai di perangkat skripsi/Windows).
//   --browser chromium => Chromium bawaan Playwright (PLAYWRIGHT_BROWSERS_PATH; dipakai di sandbox cloud).
// Playwright dicari di: playwright, @playwright/test (cwd, frontend/, akar repo), lalu paket global (`npm root -g`).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import {
  SCENARIOS, DATASET_ORDER, allowed, payloadFile, rawDir, repoRoot, mean, sd, argOf, appendRawCsv, makeRunId, deviceLabel, envString,
  datasetCsv,
} from "./common.mjs";
import { startServer } from "./serve.mjs";
import { wasmInfo } from "../headless/statify_wasm.mjs";

const argv = process.argv.slice(2);
const deviceKey = argOf(argv, "--device", "sandbox");
const browserKind = argOf(argv, "--browser", "chromium");
const executable = argOf(argv, "--executable", null);
const headed = argv.includes("--headed");
const runs = Number(argOf(argv, "--runs", "5"));
const runTimeout = Number(argOf(argv, "--run-timeout", "900")) * 1000;
const dsList = (argOf(argv, "--datasets", null)?.split(",").map((s) => s.trim()).filter(Boolean)) ?? DATASET_ORDER;
const scList = (argOf(argv, "--scenarios", null)?.split(",").map((s) => s.trim()).filter(Boolean)) ?? SCENARIOS.map((s) => s.id);
const runId = argOf(argv, "--run-id", makeRunId(`browser_${deviceKey}`));
const outFile = path.resolve(argOf(argv, "--out", path.join(rawDir, `browser_${deviceKey}.csv`)));

function loadPlaywright() {
  const tries = [];
  const roots = [path.join(process.cwd(), "x"), path.join(repoRoot, "frontend", "x"), path.join(repoRoot, "x"), path.join(repoRoot, "testing", "x")];
  try { roots.push(path.join(execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), "x")); } catch { /* npm tidak ada */ }
  for (const root of roots) {
    const req = createRequire(root);
    for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
      try { const m = req(name); if (m.chromium) return { chromium: m.chromium, from: `${name} @ ${path.dirname(root)}` }; } catch (e) { tries.push(`${name}@${path.dirname(root)}`); }
    }
  }
  throw new Error("Playwright tidak ditemukan. Coba: cd frontend && npm install (atau npm i -g playwright). Dicoba: " + tries.slice(0, 6).join(", "));
}

function workerUrls() {
  const read = (rel, re, dflt) => {
    try { return re.exec(fs.readFileSync(path.join(repoRoot, rel), "utf8"))?.[1] ?? dflt; } catch { return dflt; }
  };
  const nbV = read("frontend/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis.ts", /NAIVE_BAYES_WASM_VERSION\s*=\s*"([^"]+)"/, "naive-bayes-v3-20261005a");
  const amV = read("frontend/components/Modals/Analyze/Classify/apply-model/services/apply-model-analysis.ts", /APPLY_MODEL_WASM_VERSION\s*=\s*"([^"]+)"/, "apply-model-v3-20261005a");
  return {
    nbWorkerUrl: `/workers/Classify/NaiveBayes/naive-bayes.worker.js?v=${nbV}`,
    amWorkerUrl: `/workers/Classify/ApplyModel/apply-model.worker.js?v=${amV}`,
  };
}

const { chromium, from } = loadPlaywright();
const urls = workerUrls();
const { server, url: base } = await startServer({ port: 0 });
console.log(`=== run_browser.mjs run_id=${runId} device=${deviceKey} (${deviceLabel(deviceKey)})`);
console.log(`env: ${envString()}`);
console.log(`playwright: ${from}; server statis: ${base}; worker NB: ${urls.nbWorkerUrl}; worker AM: ${urls.amWorkerUrl}`);
const winfo = wasmInfo();
console.log(`wasm sha256: stwv=${winfo.stwv.sha256} nb=${winfo.nb.sha256} am=${winfo.am.sha256}`);

const launchOpts = {
  headless: !headed,
  args: ["--disable-dev-shm-usage", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
};
if (executable) launchOpts.executablePath = executable;
else if (browserKind === "chrome" || browserKind === "msedge") launchOpts.channel = browserKind;
let browser;
try {
  browser = await chromium.launch(launchOpts);
} catch (e) {
  console.error(`GAGAL meluncurkan peramban (${browserKind}${executable ? ", " + executable : ""}): ${String(e.message).split("\n")[0]}`);
  server.close();
  process.exit(3);
}
const browserVersion = browser.version();
const browserLabel = `${executable ? "executable" : browserKind === "chromium" ? "Chromium bawaan Playwright" : browserKind} ${browserVersion} ${headed ? "headed" : "headless"}`;
console.log(`peramban: ${browserLabel}`);
if (argv.includes("--check")) {   // hanya memastikan Playwright + peramban bisa diluncurkan (dipakai run_E.ps1)
  await browser.close().catch(() => {});
  server.closeAllConnections?.(); server.close();
  console.log("CHECK_OK");
  process.exit(0);
}
console.log(`keluaran mentah: ${path.relative(repoRoot, outFile)}`);

let envPrinted = false;
const noOverhead = argv.includes("--no-overhead");

/** Menjalankan satu sel (skenario x dataset) di halaman baru. `tinyN` > 0: subsampel merata N dokumen (pengukur overhead tetap). */
async function runCell({ ds, sc, tinyN = 0 }) {
  const dsLabel = tinyN ? `${ds}__overhead${tinyN}doc` : ds;
  const row0 = { run_id: runId, perangkat_label: deviceLabel(deviceKey), jalur: "peramban-worker-asli (Playwright)", lingkungan: envString(), menu_konfigurasi: sc.label, skenario_id: sc.id, dataset: dsLabel, peramban: browserLabel, wasm_sha256_12: winfo[sc.kind].sha256.slice(0, 12) };
  if (!fs.existsSync(payloadFile(ds, sc.kind)) || !fs.existsSync(datasetCsv(ds))) {
    console.log(`[${dsLabel} | ${sc.id}] NOT RUN: payload/dataset tidak ada (lihat perf/data/PREPARE_STATUS.json)`);
    appendRawCsv(outFile, [{ ...row0, n_dokumen: "", jumlah_term: "", run: "", ms: "", status: "NOT RUN", pesan_galat: "dataset tidak tersedia", timestamp: new Date().toISOString() }]);
    return;
  }
  const t0 = Date.now();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  let crashed = null;
  page.on("crash", () => { crashed = "renderer crash"; });
  page.on("pageerror", (e) => console.log(`   pageerror: ${String(e.message).slice(0, 200)}`));
  let cellRes = null, failure = null;
  try {
    await page.goto(`${base}/__perf/harness.html`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__benchReady === true, null, { timeout: 30000 });
    if (!envPrinted) { console.log("halaman:", JSON.stringify(await page.evaluate(() => window.__bench.env()))); envPrinted = true; }
    const cell = { scenarioId: sc.id, kind: sc.kind, payloadUrl: `/__perf/data/payloads/${ds}.${sc.kind}.json`, runs, timeoutMs: runTimeout, tinyN, ...urls };
    const work = page.evaluate((c) => window.__bench.runCell(c), cell);
    const crashWatch = new Promise((_, rej) => { page.once("crash", () => rej(new Error("renderer crash (kemungkinan kehabisan memori)"))); });
    const hard = new Promise((_, rej) => setTimeout(() => rej(new Error("batas waktu sel terlampaui")), runTimeout * (runs + 2) + 120000));
    cellRes = await Promise.race([work, crashWatch, hard]);
  } catch (e) {
    failure = String(e && e.message ? e.message : e).split("\n")[0];
  }
  await context.close().catch(() => {});
  const stamp = new Date().toISOString();
  if (!cellRes) {
    console.log(`[${dsLabel} | ${sc.id}] GAGAL: ${crashed ?? failure}`);
    appendRawCsv(outFile, [{ ...row0, n_dokumen: "", jumlah_term: "", run: "", ms: "", status: "GAGAL", pesan_galat: crashed ?? failure, timestamp: stamp }]);
    return;
  }
  const rows = cellRes.results.map((o) => ({
    ...row0, n_dokumen: cellRes.n, jumlah_term: o.terms ?? "", run: o.run, ms: o.ms.toFixed(3), status: o.status, pesan_galat: o.err,
    longtask_count: o.longtask_count, longtask_max_ms: o.longtask_max_ms.toFixed(1), longtask_total_ms: o.longtask_total_ms.toFixed(1),
    frame_p95_ms: Number.isNaN(o.frame_p95_ms) ? "" : o.frame_p95_ms.toFixed(1), frame_max_ms: Number.isNaN(o.frame_max_ms) ? "" : o.frame_max_ms.toFixed(1),
    frame_count: o.frame_count, idle_frame_p95_ms: Number.isNaN(o.idle_frame_p95_ms) ? "" : o.idle_frame_p95_ms.toFixed(1),
    rss_mb: "", payload_sha256_12: cellRes.payloadSha, timestamp: stamp,
  }));
  appendRawCsv(outFile, rows);
  const ok = cellRes.results.filter((o) => o.run >= 1 && o.status === "OK");
  const bad = cellRes.results.find((o) => o.status !== "OK");
  const lt = ok.map((o) => o.longtask_count), ltm = ok.map((o) => o.longtask_max_ms), fp = ok.map((o) => o.frame_max_ms);
  console.log(`[${dsLabel} | ${sc.id}] n=${cellRes.n} term=${cellRes.results.find((o) => o.status === "OK")?.terms ?? "-"} warmup=${cellRes.results[0]?.ms.toFixed(0)} ms  mean=${mean(ok.map((o) => o.ms)).toFixed(1)} sd=${sd(ok.map((o) => o.ms)).toFixed(1)} ms  longtask(rata2 jml/maks)=${mean(lt).toFixed(1)}/${Math.max(...ltm, 0).toFixed(0)} ms  frame_maks=${Math.max(...fp, 0).toFixed(0)} ms idle_p95=${cellRes.idle_frame_p95_ms.toFixed(1)}  (${bad ? bad.status + ": " + bad.err : "OK"})  wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

for (const ds of DATASET_ORDER.filter((d) => dsList.includes(d))) {
  for (const sc of SCENARIOS.filter((s) => scList.includes(s.id) && allowed(ds, s.id))) await runCell({ ds, sc });
}
// Overhead tetap Worker (boot + fetch/kompilasi wasm + serialisasi), diukur dengan 40 dokumen dari pilkada_900:
if (!noOverhead && dsList.includes("pilkada_900")) {
  for (const sc of SCENARIOS.filter((s) => scList.includes(s.id))) await runCell({ ds: "pilkada_900", sc, tinyN: 40 });
}
await browser.close().catch(() => {});
server.closeAllConnections?.();
server.close();
console.log("=== selesai ===");
process.exit(0);
