// run_headless.mjs — Track E, jalur (b): waktu eksekusi HEADLESS (Node + biner wasm yang SAMA dengan aplikasi).
// Protokol: 1 pemanasan (run=0, dicatat tetapi tidak dipakai agregasi) + 5 pengukuran (run=1..5). Satuan ms (performance.now()).
// Yang diukur: pemanggilan wasm sinkron setara isi worker (STWV: process_text_data; NB: new NaiveBayesAnalysis + get_formatted_results
// + get_all_errors; AM: new ApplyModelAnalysis + get_formatted_results + get_all_errors). Pembentukan payload dan serialisasi pesan
// worker TIDAK termasuk (lihat E_performance.md). Rust native BELUM diukur.
// Tiap sel (skenario x dataset) dijalankan di PROSES Node terpisah agar kegagalan memori satu sel tidak merusak sel lain.
//
// Pemakaian (dari akar repo):
//   node testing/text_analytics_eval/perf/run_headless.mjs [--device sandbox|vm|skripsi] [--datasets a,b] [--scenarios x,y]
//        [--runs 5] [--cell-timeout 1800] [--out perf/raw/headless_<device>.csv]
// Prasyarat: node perf/prepare_datasets.mjs dan node perf/build_payloads.mjs (run_E.ps1 menjalankannya).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  SCENARIOS, DATASET_ORDER, allowed, DATASET_LABEL, scenarioById, payloadFile, perfDir, rawDir, logDir, repoRoot,
  mean, sd, argOf, appendRawCsv, makeRunId, deviceLabel, envString, sha256File, datasetCsv,
} from "./common.mjs";

const argv = process.argv.slice(2);
const here = fileURLToPath(import.meta.url);

// ===================== MODE SEL (proses anak) =====================
if (argv[0] === "--cell") {
  const [, scId, dsId] = argv;
  const runs = Number(argOf(argv, "--runs", "5"));
  const { logWasmInfo, stwvTransform, naiveBayesRun, applyModelRun, wasmInfo } = await import("../headless/statify_wasm.mjs");
  const sc = scenarioById(scId);
  const file = payloadFile(dsId, sc.kind);
  const payloadSha = sha256File(file).slice(0, 12);
  const P = JSON.parse(fs.readFileSync(file, "utf8"));
  const info = wasmInfo();
  const wasmSha = { stwv: info.stwv.sha256, nb: info.nb.sha256, am: info.am.sha256 }[sc.kind].slice(0, 12);

  let exec;
  if (sc.kind === "stwv") {
    exec = async () => { const out = await stwvTransform(P.data, P.configs[scId]); return out.vocabulary.length; };
  } else if (sc.kind === "nb") {
    const payload = { target: P.target, predictors: P.predictors, targetDefs: P.targetDefs, predictorsDefs: P.predictorsDefs, config: P.configs[scId], text: P.text };
    exec = async () => {
      const r = await naiveBayesRun(payload);
      if (!r.data?.trained_model) throw new Error("trained_model kosong: " + JSON.stringify(r.errors).slice(0, 300));
      return r.data.trained_model.text.terms.length;
    };
  } else {
    const payload = { predictors: P.predictors, predictorDefs: P.predictorDefs, mapping: P.mapping, actual: P.actual, actualDefs: P.actualDefs, model: P.model, text: P.text };
    exec = async () => {
      const r = await applyModelRun(payload);
      if (!r.data?.predictions) throw new Error("predictions kosong: " + JSON.stringify(r.errors).slice(0, 300));
      return P.jumlah_term_model;
    };
  }
  const out = [];
  for (let run = 0; run <= runs; run++) {
    if (global.gc) global.gc();
    const t0 = performance.now();
    try {
      const terms = await exec();
      const ms = performance.now() - t0;
      out.push({ run, ms, terms, status: "OK", rss_mb: process.memoryUsage().rss / 2 ** 20 });
    } catch (e) {
      const msg = e && e.message ? e.message : JSON.stringify(e);
      out.push({ run, ms: performance.now() - t0, terms: "", status: "GALAT", err: String(msg).slice(0, 300), rss_mb: process.memoryUsage().rss / 2 ** 20 });
      break; // gagal: hentikan sel ini, catat, lanjut ke sel berikutnya
    }
  }
  process.stdout.write("\n@@CELL@@" + JSON.stringify({ n: P.n, payloadSha, wasmSha, out }) + "\n");
  process.exit(0);
}

// ===================== MODE ORKESTRATOR =====================
const deviceKey = argOf(argv, "--device", "sandbox");
const runs = Number(argOf(argv, "--runs", "5"));
const cellTimeout = Number(argOf(argv, "--cell-timeout", "1800")) * 1000;
const dsList = (argOf(argv, "--datasets", null)?.split(",").map((s) => s.trim()).filter(Boolean)) ?? DATASET_ORDER;
const scList = (argOf(argv, "--scenarios", null)?.split(",").map((s) => s.trim()).filter(Boolean)) ?? SCENARIOS.map((s) => s.id);
const runId = argOf(argv, "--run-id", makeRunId(`headless_${deviceKey}`));
const outFile = path.resolve(argOf(argv, "--out", path.join(rawDir, `headless_${deviceKey}.csv`)));
const nodeFlags = ["--expose-gc", "--max-old-space-size=8192", "--no-warnings"];

console.log(`=== run_headless.mjs run_id=${runId} device=${deviceKey} (${deviceLabel(deviceKey)})`);
console.log(`env: ${envString()}`);
console.log(`protokol: 1 pemanasan + ${runs} pengukuran; ms; simpangan baku sampel (n-1)`);
console.log(`keluaran mentah: ${path.relative(repoRoot, outFile)}`);
const { logWasmInfo } = await import("../headless/statify_wasm.mjs");
logWasmInfo();

const summary = [];
for (const ds of DATASET_ORDER.filter((d) => dsList.includes(d))) {
  for (const sc of SCENARIOS.filter((s) => scList.includes(s.id) && allowed(ds, s.id))) {
    const row0 = { run_id: runId, perangkat_label: deviceLabel(deviceKey), jalur: "headless-wasm-node", lingkungan: envString(), menu_konfigurasi: sc.label, skenario_id: sc.id, dataset: ds, peramban: "-" };
    if (!fs.existsSync(payloadFile(ds, sc.kind)) || !fs.existsSync(datasetCsv(ds))) {
      console.log(`[${ds} | ${sc.id}] NOT RUN: payload/dataset tidak ada (lihat perf/data/PREPARE_STATUS.json)`);
      appendRawCsv(outFile, [{ ...row0, n_dokumen: "", jumlah_term: "", run: "", ms: "", status: "NOT RUN", pesan_galat: "dataset tidak tersedia", timestamp: new Date().toISOString() }]);
      summary.push({ ds, sc: sc.id, status: "NOT RUN" });
      continue;
    }
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [...nodeFlags, here, "--cell", sc.id, ds, "--runs", String(runs)], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: cellTimeout });
    const stdout = r.stdout ?? "";
    const marker = stdout.lastIndexOf("@@CELL@@");
    const stamp = new Date().toISOString();
    if (marker < 0) {
      const why = r.error ? `${r.error.code ?? r.error.message}` : `exit=${r.status} signal=${r.signal}`;
      const tail = ((r.stderr ?? "") + stdout).trim().split("\n").slice(-3).join(" | ").slice(0, 300);
      console.log(`[${ds} | ${sc.id}] GAGAL (${why}) ${tail}`);
      appendRawCsv(outFile, [{ ...row0, n_dokumen: "", jumlah_term: "", run: "", ms: "", status: r.error?.code === "ETIMEDOUT" ? "TIMEOUT" : "GAGAL", pesan_galat: `${why} ${tail}`, timestamp: stamp }]);
      summary.push({ ds, sc: sc.id, status: "GAGAL" });
      continue;
    }
    const cell = JSON.parse(stdout.slice(marker + 8));
    const rows = cell.out.map((o) => ({
      ...row0, n_dokumen: cell.n, jumlah_term: o.terms, run: o.run, ms: o.ms.toFixed(3), status: o.status, pesan_galat: o.err ?? "",
      longtask_count: "", longtask_max_ms: "", longtask_total_ms: "", frame_p95_ms: "", frame_max_ms: "", frame_count: "", idle_frame_p95_ms: "",
      rss_mb: o.rss_mb.toFixed(0), payload_sha256_12: cell.payloadSha, wasm_sha256_12: cell.wasmSha, timestamp: stamp,
    }));
    appendRawCsv(outFile, rows);
    const ok = cell.out.filter((o) => o.run >= 1 && o.status === "OK").map((o) => o.ms);
    const bad = cell.out.find((o) => o.status !== "OK");
    summary.push({ ds, sc: sc.id, n: cell.n, terms: cell.out[1]?.terms ?? cell.out[0]?.terms, mean: mean(ok), sd: sd(ok), status: bad ? "GALAT" : "OK" });
    console.log(`[${ds} | ${sc.id}] n=${cell.n} term=${cell.out.find((o) => o.status === "OK")?.terms ?? "-"} warmup=${cell.out[0]?.ms.toFixed(0)} ms  mean=${mean(ok).toFixed(1)} sd=${sd(ok).toFixed(1)} ms  (${bad ? "GALAT: " + bad.err : "OK"})  wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
console.log("=== selesai ===");
