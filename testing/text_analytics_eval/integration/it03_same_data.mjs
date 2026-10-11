// it03_same_data.mjs — IT-03: model diterapkan ke data latih yang sama -> prediksi identik dengan model final.
//
// KRITERIA ASLI (prompt Track F): "Prediksi identik dengan model final (galat <= 1e-9)".
// KENDALA (temuan Track D, D-02): wasm Apply Model membulatkan probabilitas keluaran ke 4 desimal (round4),
// sehingga selisih probabilitas keluaran terhadap nilai presisi penuh bisa sampai 5e-5 oleh pembulatan saja.
// Karena itu kriteria 1e-9 TIDAK dapat diperiksa langsung pada probabilitas keluaran Apply Model. Skrip ini
// melaporkan empat tingkat bukti secara terpisah (tidak ada yang dilonggarkan diam-diam):
//   (a) kelas prediksi: Apply Model == skor acuan presisi penuh (harus identik pada semua baris);
//   (b) probabilitas keluaran: round4(acuan presisi penuh) == keluaran Apply Model (harus identik);
//       dan |acuan - keluaran| <= 5e-5 (batas pembulatan; BUKAN 1e-9);
//   (c) parameter model yang diterima Apply Model == parameter model yang dihasilkan Naive Bayes (bit-per-bit;
//       selisih 0 <= 1e-9) — termasuk setelah melewati Export Model (JSON.stringify/parse);
//   (d) kokohnya keputusan: selisih skor-log terkecil antara kelas teratas dan kedua (di luar seri persis)
//       dibandingkan dengan 1e-9 — bila jauh lebih besar, galat numerik <= 1e-9 tidak mungkin membalik kelas.
// "Acuan presisi penuh" = skor log dihitung ulang di JavaScript (Float64) dari parameter hasil Export Model dan
// matriks bobot dari wasm STWV (jalur kode berbeda dari transform di dalam Apply Model).
import fs from "node:fs";
import { logWasmInfo, readCsv, KONFIGURASI, stwvTransform, toRustConfig, PIL, check, finish, trainRaw, applyRaw,
  referenceScores, round4, deepBitCompare, classificationMetrics } from "./it_util.mjs";

logWasmInfo();
const train = readCsv(PIL.train);
const tcol = train.header.indexOf(PIL.textCol);
const docs = train.rows.map((r) => r[tcol] ?? "");
console.log(`IT-03: data latih ${train.rows.length} baris (${PIL.train})`);

const configs = (process.argv[2] ?? "K1,K2,K3,K4,K5").split(",");
const summary = [];
for (const k of configs) {
  console.log(`\n--- ${k}: ${KONFIGURASI[k].desc}`);
  const { nb, model, modelJson } = await trainRaw({ train, kconfig: KONFIGURASI[k] });
  // (c) parameter: model langsung dari wasm NB vs model setelah Export Model (JSON) — bit per bit
  const direct = nb.data.trained_model;
  const cmp = deepBitCompare(direct, model);
  check(`${k} (c) model Export Model == trained_model wasm (bit-per-bit, ${cmp.numbers} angka)`, cmp.diffs.length === 0, `selisih maksimum = ${cmp.maxAbs}`);

  // Terapkan model pada data latih yang SAMA (semua kolom, dengan Actual target)
  const am = await applyRaw({ model, data: train });
  const pr = am.data.predictions;
  const classes = am.data.prediction_distribution.classes;
  const N = train.rows.length;

  // Skor acuan presisi penuh
  const stwv = await stwvTransform(docs, toRustConfig(KONFIGURASI[k].stwv));
  const sameVocab = JSON.stringify(stwv.vocabulary) === JSON.stringify(model.text.terms) && JSON.stringify(stwv.vocabulary) === JSON.stringify(model.text.recipe.vocabulary);
  check(`${k} kosakata STWV(train) == model.text.terms == model.text.recipe.vocabulary (${stwv.vocabulary.length} term)`, sameVocab);
  const ref = referenceScores(model, stwv.matrix);
  check(`${k} urutan kelas Apply Model == model.target.classes`, JSON.stringify(classes) === JSON.stringify(model.target.classes), JSON.stringify(classes));

  let samePred = 0, notScored = 0, exactTies = 0, minGap = Infinity, maxAbsRaw = 0, maxAbsR4 = 0, sameR4 = 0, nProb = 0, maxAbsMax = 0, r4Mismatch = [];
  for (let i = 0; i < N; i++) {
    const p = pr.predicted[i];
    if (p === null) { notScored++; continue; }
    const rw = ref[i];
    if (classes[rw.predictedIndex] === p) samePred++;
    if (rw.gap === 0) exactTies++; else minGap = Math.min(minGap, rw.gap);
    classes.forEach((c, ci) => {
      const out = pr.class_probabilities[ci][i];
      const exact = rw.probs[ci];
      nProb++;
      maxAbsRaw = Math.max(maxAbsRaw, Math.abs(out - exact));
      const d4 = Math.abs(out - round4(exact));
      maxAbsR4 = Math.max(maxAbsR4, d4);
      if (d4 === 0) sameR4++; else r4Mismatch.push(`baris ${i} kelas ${c}: keluaran ${out} vs round4(acuan) ${round4(exact)} (acuan ${exact})`);
    });
    maxAbsMax = Math.max(maxAbsMax, Math.abs(pr.max_probability[i] - round4(Math.max(...rw.probs))));
  }
  const scored = N - notScored;
  check(`${k} (a) kelas prediksi Apply Model == acuan presisi penuh: ${samePred}/${scored} baris diskor (tidak diskor ${notScored})`, samePred === scored && scored === N);
  check(`${k} (b1) round4(acuan) == keluaran Apply Model: ${sameR4}/${nProb} probabilitas; selisih maksimum ${maxAbsR4}`, sameR4 === nProb, r4Mismatch.slice(0, 3).join(" | "));
  check(`${k} (b2) max_probability == round4(maks acuan): selisih maksimum ${maxAbsMax}`, maxAbsMax === 0);
  check(`${k} (b3) |acuan presisi penuh - keluaran| <= 5e-5 (batas pembulatan): maksimum ${maxAbsRaw.toExponential(3)}`, maxAbsRaw <= 5e-5 + 1e-15);
  // Informasi (bukan lulus/gagal): kriteria 1e-9 pada probabilitas keluaran
  const meets1e9 = maxAbsRaw <= 1e-9;
  console.log(`INFO  ${k} kriteria asli 1e-9 pada probabilitas keluaran Apply Model: selisih maksimum ${maxAbsRaw.toExponential(3)} -> ${meets1e9 ? "terpenuhi" : "TIDAK terpenuhi secara langsung (akibat round4, bukan rumus)"}`);
  check(`${k} (d) selisih skor-log terkecil (di luar seri persis) = ${minGap.toExponential(3)} >> 1e-9; seri persis: ${exactTies} baris`, minGap > 1e-6, "galat <= 1e-9 tidak dapat membalik kelas pada baris tak-seri");

  // Evaluasi bawaan Apply Model pada data latih (resubstitusi) vs metrik hitung-sendiri
  const mine = classificationMetrics(train.rows.map((r) => r[train.header.indexOf(PIL.labelCol)]), pr.predicted);
  const ev = am.data.evaluation;
  console.log(`INFO  ${k} resubstitusi: akurasi ${mine.accuracy.toFixed(6)}, kappa ${mine.kappa.toFixed(6)}, macro-F1 ${mine.macroF1.toFixed(6)}; evaluated_rows(AM)=${ev?.evaluated_rows}`);
  check(`${k} evaluated_rows Apply Model == ${scored}`, ev?.evaluated_rows === scored);
  summary.push({ k, N, scored, samePred, sameR4, nProb, maxAbsRaw, maxAbsR4, minGap, exactTies, params: cmp.numbers, acc: mine.accuracy });
}
console.log("\nRINGKASAN_IT03 " + JSON.stringify(summary));
finish("IT-03");
