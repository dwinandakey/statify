// build_payloads.mjs — Track E: membangun payload JSON (persis yang di-postMessage ke worker) per dataset, memakai pustaka
// headless (PORT pembangun payload aplikasi). Payload yang SAMA dipakai oleh jalur peramban (di-fetch halaman harness) dan
// jalur headless, sehingga yang diukur murni worker + wasm + serialisasi pesan.
//   perf/data/payloads/<dataset>.stwv.json : { n, data:[teks...], configs:{stwv_default, stwv_sw_stem} }     (pesan {data, config})
//   perf/data/payloads/<dataset>.nb.json   : { n, target, predictors, targetDefs, predictorsDefs, text, configs:{nb_holdout70, nb_kfold10} }
//   perf/data/payloads/<dataset>.am.json   : payload Apply Model + model hasil Export Model (NB Multinomial K1 pada dataset yang sama)
//   perf/data/payloads_index.json          : ukuran, sha256, waktu bangun payload (ms; SATU pengukuran, bukan bagian tabel utama)
// Pemakaian: node testing/thesis-eval/perf/build_payloads.mjs [--datasets pilkada_900,sms_5574,...]
import fs from "node:fs";
import path from "node:path";
import {
  logWasmInfo, readCsv, makeVariables, naiveBayesDefault, buildNaiveBayesPayload, buildNaiveBayesWorkerConfig,
  naiveBayesRun, exportModel, buildApplyModelPayload, KONFIGURASI, toRustConfig,
} from "../headless/statify_wasm.mjs";
import { repoRoot, dataDir, payloadDir, datasetCsv, availableDatasets, argOf, sha256File, DATASET_ORDER } from "./common.mjs";

const argv = process.argv.slice(2);
const wanted = argOf(argv, "--datasets", null);
const list = wanted ? wanted.split(",").map((s) => s.trim()).filter(Boolean) : availableDatasets();
fs.mkdirSync(payloadDir, { recursive: true });
logWasmInfo();

const indexFile = path.join(dataDir, "payloads_index.json");
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : {};
const ordered = DATASET_ORDER.filter((d) => list.includes(d));

const nbConfig = (validation) => {
  const cfg = naiveBayesDefault();
  cfg.main.TargetVar = "Label";
  cfg.main.RawTextVar = "Text";
  cfg.main.TextSource = "raw";
  cfg.main.ExcludedVar = ["Id"];
  cfg.options.TextLikelihood = KONFIGURASI.K1.likelihood;
  cfg.options.TextAlpha = KONFIGURASI.K1.alpha;
  cfg.validation.RandomSeed = 42;
  cfg.validation.ValidationMethod = validation;
  cfg.validation.TrainingPercentage = 70;
  cfg.validation.KFolds = 10;
  cfg.text = JSON.parse(JSON.stringify(KONFIGURASI.K1.stwv));
  return cfg;
};

function save(ds, kind, obj, buildMs) {
  const f = path.join(payloadDir, `${ds}.${kind}.json`);
  fs.writeFileSync(f, JSON.stringify(obj), "utf8");
  index[ds] ??= {};
  index[ds][kind] = { file: path.relative(repoRoot, f).split(path.sep).join("/"), bytes: fs.statSync(f).size, sha256: sha256File(f), build_ms: buildMs };
  console.log(`  ${ds}.${kind}.json  ${(index[ds][kind].bytes / 1e6).toFixed(2)} MB  build=${buildMs.toFixed(0)} ms  sha256=${index[ds][kind].sha256.slice(0, 12)}`);
}

for (const ds of ordered) {
  if (!fs.existsSync(datasetCsv(ds))) { console.log(`${ds}: berkas CSV tidak ada, dilewati`); continue; }
  const { header, rows } = readCsv(datasetCsv(ds));
  console.log(`== ${ds}: ${rows.length} dokumen`);
  index[ds] ??= {};
  index[ds].n = rows.length;
  const textIdx = header.indexOf("Text");
  const variables = makeVariables(header, rows, { Text: { type: "STRING", measure: "nominal" }, Label: { type: "STRING", measure: "nominal" } });

  // STWV: pesan {data: string[], config} (stringToWord.processor.ts); dokumen = nilai sel kolom (null -> "")
  let t0 = performance.now();
  const docs = rows.map((r) => r[textIdx] ?? "");
  const stwvCfg = (id) => toRustConfig(KONFIGURASI[id].stwv);
  save(ds, "stwv", { n: rows.length, data: docs, configs: { stwv_default: stwvCfg("K1"), stwv_sw_stem: stwvCfg("K6") } }, performance.now() - t0);

  if (ds.endsWith("_ascii")) continue;   // varian ASCII: hanya STWV (lihat prepare_datasets.mjs)

  // NB
  t0 = performance.now();
  const hold = nbConfig("holdout");
  const nbPayload = buildNaiveBayesPayload({ data: rows, variables, configData: hold });
  const nbMs = performance.now() - t0;
  const kf = buildNaiveBayesWorkerConfig(nbConfig("kfold"));
  const { config: holdCfg, ...nbRest } = nbPayload;
  save(ds, "nb", { n: rows.length, ...nbRest, configs: { nb_holdout70: holdCfg, nb_kfold10: kf } }, nbMs);

  // AM: model = Export Model dari NB holdout (model akhir dilatih pada SELURUH data, AGENTS.md NB §182)
  const nbRes = await naiveBayesRun(nbPayload);
  const { model } = exportModel(nbRes.data);
  t0 = performance.now();
  const amPayload = buildApplyModelPayload({
    model, data: rows, variables,
    mapping: { FeatureMapping: {}, ActualTargetVar: "Label", RawTextVar: "Text", VectorMapping: {} },
  });
  const amMs = performance.now() - t0;
  save(ds, "am", { n: rows.length, jumlah_term_model: model.text.terms.length, ...amPayload }, amMs);
  index[ds].nb_errors = nbRes.errors;
}
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), "utf8");
console.log("index ->", path.relative(repoRoot, indexFile));
