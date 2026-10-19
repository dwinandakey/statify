// it04_train_test.mjs — IT-04: latih di pilkada_train, terapkan di pilkada_test -> prediksi 270 baris;
// metrik sama dengan scikit-learn (Track D).
//
// Alur dijalankan ULANG di sini (bukan membaca keluaran lama): NB (wasm) pada pilkada_train -> Export Model ->
// Apply Model (wasm) pada pilkada_test. Hasil dibandingkan dengan keluaran Track D:
//   accuracy/out/pred_sklearn_<K>.csv   (scikit-learn 1.9.1, probabilitas presisi penuh)
//   accuracy/out/pred_statify_<K>.csv   (alur Track D yang dijalankan lebih dahulu; harus identik byte demi byte
//                                        dengan CSV yang dibangun ulang di sini)
// Probabilitas Apply Model dibulatkan 4 desimal (round4) sehingga selisih terhadap scikit-learn <= 5e-5 (+ eps).
import fs from "node:fs";
import path from "node:path";
import { logWasmInfo, readCsv, toCsv, KONFIGURASI, PIL, check, finish, trainRaw, applyRaw, classificationMetrics,
  readPredCsv, EVAL_DIR, OUT_DIR, ensureDir, sha256 } from "./it_util.mjs";

logWasmInfo();
const train = readCsv(PIL.train);
const test = readCsv(PIL.test);
const idIdx = test.header.indexOf(PIL.idCol), labIdx = test.header.indexOf(PIL.labelCol);
check(`pilkada_train = 630 baris, pilkada_test = 270 baris`, train.rows.length === 630 && test.rows.length === 270, `${train.rows.length} / ${test.rows.length}`);

const configs = (process.argv[2] ?? "K1,K2,K3,K4,K5").split(",");
const accOut = path.join(EVAL_DIR, "accuracy", "out");
ensureDir(OUT_DIR);
const summary = [];
for (const k of configs) {
  console.log(`\n--- ${k}: ${KONFIGURASI[k].desc}`);
  const t0 = performance.now();
  const { nb, model } = await trainRaw({ train, kconfig: KONFIGURASI[k] });
  const am = await applyRaw({ model, data: test });
  const ms = performance.now() - t0;
  const pr = am.data.predictions;
  const classes = am.data.prediction_distribution.classes;

  // Kolom keluaran (NB_PredictedValue, NB_PredictedProbability, NB_Probability_<kelas>) = 270 baris, tanpa null
  const nonNull = pr.predicted.filter((v) => v !== null).length;
  check(`${k} jumlah baris prediksi = 270 dan tidak ada baris tak-diskor: ${nonNull}/${pr.predicted.length}`, pr.predicted.length === 270 && nonNull === 270 && pr.max_probability.length === 270 && pr.class_probabilities.every((c) => c.length === 270));
  check(`${k} kesalahan/peringatan wasm kosong: NB errors=${JSON.stringify(nb.errors)} AM errors=${JSON.stringify(am.errors)} warnings=${JSON.stringify(am.data.warnings)}`, am.data.warnings.length === 0);

  // CSV Statify yang dibangun ulang (format sama dengan run_statify.mjs)
  const rows = [["Id", "kelas_aktual", "kelas_prediksi", ...classes.map((c) => `prob_${c}`)]];
  test.rows.forEach((r, i) => rows.push([r[idIdx], r[labIdx], pr.predicted[i] ?? "", ...classes.map((_, c) => String(pr.class_probabilities[c][i]))]));
  const mine = toCsv(rows);
  fs.writeFileSync(path.join(OUT_DIR, `pred_it04_${k}.csv`), mine);

  // (1) terhadap keluaran Track D (Statify)
  const oldFile = path.join(accOut, `pred_statify_${k}.csv`);
  const old = fs.readFileSync(oldFile, "utf8");
  check(`${k} CSV hasil ulang IDENTIK byte demi byte dengan accuracy/out/pred_statify_${k}.csv (sha256 ${sha256(mine).slice(0, 12)}…)`, mine === old);

  // (2) terhadap scikit-learn
  const sk = readPredCsv(path.join(accOut, `pred_sklearn_${k}.csv`));
  const actual = test.rows.map((r) => r[labIdx]);
  check(`${k} urutan Id sklearn == pilkada_test`, sk.ids.join(",") === test.rows.map((r) => r[idIdx]).join(","));
  let same = 0; pr.predicted.forEach((p, i) => { if (p === sk.pred[i]) same++; });
  check(`${k} kelas prediksi sama dengan scikit-learn: ${same}/270`, same === 270);
  let maxAbs = 0; classes.forEach((c, ci) => { const j = sk.classes.indexOf(c); pr.class_probabilities[ci].forEach((v, i) => { maxAbs = Math.max(maxAbs, Math.abs(v - sk.prob[j][i])); }); });
  check(`${k} galat absolut maksimum probabilitas terhadap scikit-learn = ${maxAbs.toExponential(3)} <= 5e-5 (batas round4)`, maxAbs <= 5e-5 + 1e-12);
  const ms_ = classificationMetrics(actual, pr.predicted);
  const mk = classificationMetrics(actual, sk.pred);
  const dAcc = Math.abs(ms_.accuracy - mk.accuracy), dKap = Math.abs(ms_.kappa - mk.kappa), dF1 = Math.abs(ms_.macroF1 - mk.macroF1);
  check(`${k} metrik sama dengan scikit-learn: akurasi ${ms_.accuracy.toFixed(6)} vs ${mk.accuracy.toFixed(6)}, kappa ${ms_.kappa.toFixed(6)} vs ${mk.kappa.toFixed(6)}, macro-F1 ${ms_.macroF1.toFixed(6)} vs ${mk.macroF1.toFixed(6)}`, Math.max(dAcc, dKap, dF1) < 1e-6, `selisih maks ${Math.max(dAcc, dKap, dF1)}`);

  // (3) metrik yang DILAPORKAN Apply Model sendiri (evaluation) vs metrik hitung-sendiri dari prediksinya
  const ev = am.data.evaluation;
  const evAcc = ev?.evaluation_metrics?.overall_accuracy ?? ev?.metrics?.overall_accuracy;
  if (ev) {
    const keys = Object.keys(ev);
    const em = ev.evaluation_metrics ?? ev.metrics ?? null;
    const evAcc2 = em?.overall_accuracy, evKap = em?.cohens_kappa, evF1 = em?.macro_avg?.f1;
    console.log(`INFO  ${k} evaluation keys=${JSON.stringify(keys)}; AM melaporkan akurasi=${evAcc2}, kappa=${evKap}, macroF1=${evF1}; evaluated_rows=${ev.evaluated_rows}`);
    if (em) check(`${k} metrik laporan Apply Model == hitung-sendiri (toleransi 1e-9): akurasi ${evAcc2}, kappa ${evKap}, macro-F1 ${evF1}`,
      Math.abs(evAcc2 - ms_.accuracy) < 1e-9 && Math.abs(evKap - ms_.kappa) < 1e-9 && Math.abs(evF1 - ms_.macroF1) < 1e-9);
  }
  summary.push({ k, same, maxAbs, acc: ms_.accuracy, kappa: ms_.kappa, f1: ms_.macroF1, accSk: mk.accuracy, ms: Math.round(ms) });
}
console.log("\nRINGKASAN_IT04 " + JSON.stringify(summary));
finish("IT-04");
