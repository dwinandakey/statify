// run_statify.mjs — Track D: latih NB (wasm NB) pada data latih -> Export Model -> Apply Model (wasm AM) pada
// data uji, untuk konfigurasi K1..K6 (+ varian w). Menulis pred_statify_<K>.csv ke accuracy/out/ (pilkada) atau
// accuracy/out/<dataset>/ . Memakai BINER WASM YANG SAMA dengan aplikasi (lihat ../headless/README.md).
//
// Pemakaian:  node run_statify.mjs [--dataset pilkada|sms_spam|smsa] [--configs K1,K2,K3,K4,K5,K6,K1w,K3w,K4w,K5w]
//                                  [--save-intermediate]  (model ekspor + matriks STWV latih, hanya untuk pilkada)
// Probabilitas: yang dikeluarkan Apply Model dibulatkan 4 desimal oleh wasm AM (round4 di
// apply-model/rust/src/stats/posterior.rs); kolom prob_* berisi nilai itu apa adanya (String(x)).
import fs from "node:fs";
import path from "node:path";
import { logWasmInfo, readCsv, toCsv, runTrainApply, stwvTransform, toRustConfig, KONFIGURASI, exportModel } from "../headless/statify_wasm.mjs";
import { DATASETS } from "./datasets.mjs";

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const dsName = arg("--dataset", "pilkada");
const ds = DATASETS[dsName];
if (!ds) { console.error(`dataset tidak dikenal: ${dsName}`); process.exit(2); }
const defaultConfigs = dsName === "pilkada" ? "K1,K2,K3,K4,K5,K6,K1w,K2w,K3w,K4w,K5w,K1m,K2m,K5m" : (dsName === "smsa" ? "K1,K4,K1w,K4w" : "K1,K2,K3,K4,K1w,K3w,K4w");
const configs = arg("--configs", defaultConfigs).split(",").map((s) => s.trim()).filter(Boolean);
const saveIntermediate = argv.includes("--save-intermediate") || dsName === "pilkada";

console.log(`=== run_statify.mjs  dataset=${dsName}  configs=${configs.join(",")}  ${new Date().toISOString()}`);
const info = logWasmInfo();
fs.mkdirSync(ds.outDir, { recursive: true });

const train = readCsv(ds.train);
const test = readCsv(ds.test);
console.log(`train=${train.rows.length} baris (${path.basename(ds.train)})  test=${test.rows.length} baris (${path.basename(ds.test)})  header=${JSON.stringify(train.header)}`);
const idIdx = test.header.indexOf(ds.idCol);
const labIdx = test.header.indexOf(ds.labelCol);

const summary = [];
for (const k of configs) {
  const kc = KONFIGURASI[k];
  if (!kc) { console.error(`konfigurasi tidak dikenal: ${k}`); process.exit(2); }
  const t0 = performance.now();
  let r;
  try {
    r = await runTrainApply({ train, test, textCol: ds.textCol, labelCol: ds.labelCol, excluded: ds.excluded, kconfig: kc, seed: 42 });
  } catch (e) {
    console.log(`${k}: GALAT ${e && e.message ? e.message : JSON.stringify(e)}`);
    summary.push({ k, error: String(e && e.message ? e.message : JSON.stringify(e)) });
    continue;
  }
  const classes = r.classes;
  const rows = [["Id", "kelas_aktual", "kelas_prediksi", ...classes.map((c) => `prob_${c}`)]];
  let correct = 0, notScored = 0;
  test.rows.forEach((row, i) => {
    const pred = r.predicted[i];
    if (pred === null || pred === undefined) notScored++;
    if (pred === row[labIdx]) correct++;
    rows.push([row[idIdx], row[labIdx], pred ?? "", ...classes.map((_, c) => { const p = r.classProb[c][i]; return p === null || p === undefined ? "" : String(p); })]);
  });
  const file = path.join(ds.outDir, `pred_statify_${k}.csv`);
  fs.writeFileSync(file, toCsv(rows));
  const vocab = r.model.text.terms.length;
  const acc = correct / test.rows.length;
  console.log(`${k}: acc=${acc.toFixed(6)} (${correct}/${test.rows.length}) notScored=${notScored} vocab=${vocab} likelihood=${r.model.text.likelihood} train_ms=${r.timings.train_ms.toFixed(0)} apply_ms=${r.timings.apply_ms.toFixed(0)} NBerrors=${JSON.stringify(r.nb.errors)} AMerrors=${JSON.stringify(r.am.errors)} -> ${path.relative(process.cwd(), file)}`);
  const warnings = r.am.data.warnings;
  if (warnings && warnings.length) console.log(`   AM warnings: ${JSON.stringify(warnings)}`);
  summary.push({ k, acc, correct, notScored, vocab });

  if (saveIntermediate) {
    fs.writeFileSync(path.join(ds.outDir, `model_statify_${k}.json`), r.modelJson);
    // Matriks STWV latih (wasm STWV, fit pada data latih) disimpan sparse untuk dibandingkan dengan sklearn.
    const tcol = train.header.indexOf(ds.textCol);
    const docs = train.rows.map((x) => x[tcol] ?? "");
    const out = await stwvTransform(docs, toRustConfig(kc.stwv));
    const sparse = out.matrix.map((row) => { const e = []; row.forEach((v, j) => { if (v !== 0) e.push([j, v]); }); return e; });
    fs.writeFileSync(path.join(ds.outDir, `stwv_train_statify_${k}.json`), JSON.stringify({ config: k, stats: out.stats, vocabulary: out.vocabulary, rows: sparse }));
    const sameVocab = JSON.stringify(out.vocabulary) === JSON.stringify(r.model.text.recipe.vocabulary);
    console.log(`   STWV(train) vocab=${out.vocabulary.length} identik dengan resep NB: ${sameVocab}`);
  }
}
console.log("=== ringkasan ===");
for (const s of summary) console.log(s.error ? `${s.k}: GALAT ${s.error}` : `${s.k}\tacc=${s.acc.toFixed(6)}\t${s.correct}/${test.rows.length}\tnotScored=${s.notScored}\tvocab=${s.vocab}`);
