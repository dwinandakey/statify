/** @jest-environment node */
// Track F — IT-04: latih di pilkada_train, terapkan di pilkada_test.
//   Hasil yang diharapkan: kolom NB_ di 270 baris; metrik sama dengan scikit-learn (Track D).
//
// Alur dijalankan ULANG sepenuhnya di tes ini (NB wasm pada 630 baris -> Export Model -> loadModelFromFile ->
// applyModel pada 270 baris), lalu dibandingkan dengan keluaran Track D (accuracy/out/pred_sklearn_<K>.csv dan
// pred_statify_<K>.csv). Probabilitas Apply Model dibulatkan 4 desimal (round4) sehingga selisih terhadap
// scikit-learn (presisi penuh) paling besar 5e-5; kelas prediksi dan metrik harus sama persis.

jest.mock("@/stores/useResultStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks");
  return { useResultStore: { getState: () => m.resultStore.state } };
});
jest.mock("@/stores/useVariableStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks");
  return { useVariableStore: { getState: () => m.variableState }, processVariableName: m.realProcessVariableName };
});

import * as fs from "fs";
import * as path from "path";
import type { Table } from "@/types/Table";
import {
  PILKADA, classificationMetrics, columnValues, installWasmWorkers, makeVariables, pilkadaAvailable, pilkadaOverrides, readCsv,
  readPredCsv, wasmAvailable, workerCalls,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.helpers";
import { resultStore } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks";
import {
  KCONFIG, applyRawModelApp, exportModelText, loadModel, trainPilkadaRaw, valueOf, rowOf, type ApplyResult, type KName,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.drivers";

const ready = wasmAvailable() && pilkadaAvailable();
const describeIf = ready ? describe : describe.skip;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn("[integration.it04] wasm atau pilkada_*.csv tidak ditemukan: berkas dilewati.");
}

describeIf.each(["K1", "K2", "K3", "K4", "K5"] as KName[])("IT-04 %s: latih pilkada_train -> terapkan pilkada_test", (k) => {
  const train = readCsv(PILKADA.train());
  const test = readCsv(PILKADA.test());
  const testVars = makeVariables(test.header, test.rows, pilkadaOverrides());
  const idCol = test.header.indexOf(PILKADA.idCol);
  const labCol = test.header.indexOf(PILKADA.labelCol);
  let applied: ApplyResult;
  let classes: string[] = [];
  let nbEval: { overall_accuracy: number } | undefined;

  beforeAll(async () => {
    installWasmWorkers();
    resultStore.reset();
    workerCalls.length = 0;
    const { raw } = await trainPilkadaRaw(train, k);
    classes = (raw.trained_model as unknown as { target: { classes: string[] } }).target.classes;
    nbEval = raw.evaluation_metrics as unknown as { overall_accuracy: number };
    const loaded = await loadModel("model_pilkada_train.json", exportModelText(raw));
    applied = await applyRawModelApp({ loaded, data: test.rows, variables: testVars });
  }, 180000);

  const cols = () => ({
    pred: columnValues(applied.updates, 4, 270) as string[],
    maxP: columnValues(applied.updates, 5, 270) as number[],
    probs: classes.map((_, ci) => columnValues(applied.updates, 6 + ci, 270) as number[]),
  });

  it(`IT-04 ${k}-a data: 630 baris latih, 270 baris uji; kolom NB_PredictedValue, NB_PredictedProbability, NB_Probability_negative/positive terisi di 270 baris`, () => {
    expect(train.rows).toHaveLength(630);
    expect(test.rows).toHaveLength(270);
    expect(applied.definitions.map((d) => d.name)).toEqual(["NB_PredictedValue", "NB_PredictedProbability", "NB_Probability_negative", "NB_Probability_positive"]);
    expect(applied.definitions.map((d) => d.columnIndex)).toEqual([4, 5, 6, 7]);
    for (const col of [4, 5, 6, 7]) expect(columnValues(applied.updates, col, 270).filter((v) => v !== null)).toHaveLength(270);
    expect(applied.updates.length).toBe(270 * 4);
    expect(applied.summary.scoredRows).toBe(270);
    expect(applied.summary.warnings).toEqual([]);
    // setiap kelas prediksi ada di model; probabilitas dalam [0,1]; maks = probabilitas kelas terprediksi
    const { pred, maxP, probs } = cols();
    pred.forEach((p, i) => {
      expect(classes).toContain(p);
      expect(maxP[i]).toBe(Math.max(...probs.map((c) => c[i])));
    });
  });

  it(`IT-04 ${k}-b CSV hasil ulang tes ini == keluaran Track D accuracy/out/pred_statify_${k}.csv (kelas dan probabilitas, 270 baris)`, () => {
    const old = readPredCsv(path.join(PILKADA.accuracyOut(), `pred_statify_${k}.csv`));
    const { pred, probs } = cols();
    expect(old.ids).toEqual(test.rows.map((r) => r[idCol]));
    expect(pred).toEqual(old.pred);
    classes.forEach((c, ci) => {
      const j = old.classes.indexOf(c);
      expect(probs[ci]).toEqual(old.prob[j]);
    });
  });

  it(`IT-04 ${k}-c kelas prediksi sama dengan scikit-learn pada 270/270 baris; galat absolut maksimum probabilitas <= 5e-5 (batas round4)`, () => {
    const sk = readPredCsv(path.join(PILKADA.accuracyOut(), `pred_sklearn_${k}.csv`));
    expect(sk.ids).toEqual(test.rows.map((r) => r[idCol]));
    const { pred, probs } = cols();
    const same = pred.filter((p, i) => p === sk.pred[i]).length;
    let maxAbs = 0;
    classes.forEach((c, ci) => {
      const j = sk.classes.indexOf(c);
      probs[ci].forEach((v, i) => { maxAbs = Math.max(maxAbs, Math.abs(v - (sk.prob[j][i] as number))); });
    });
    // eslint-disable-next-line no-console
    console.log(`[integration.it04] ${k}: kelas sama dg scikit-learn ${same}/270; galat absolut maksimum probabilitas ${maxAbs.toExponential(3)}`);
    expect(same).toBe(270);
    expect(maxAbs).toBeLessThanOrEqual(5e-5 + 1e-12);
  });

  it(`IT-04 ${k}-d metrik (akurasi, Kappa, Macro F1) sama dengan scikit-learn, dan tabel Output Viewer Apply Model memuat nilai yang sama (3 desimal)`, () => {
    const sk = readPredCsv(path.join(PILKADA.accuracyOut(), `pred_sklearn_${k}.csv`));
    const actual = test.rows.map((r) => r[labCol]);
    const { pred } = cols();
    const mine = classificationMetrics(actual, pred);
    const ref = classificationMetrics(actual, sk.pred);
    // eslint-disable-next-line no-console
    console.log(`[integration.it04] ${k}: Statify akurasi ${mine.accuracy.toFixed(6)} kappa ${mine.kappa.toFixed(6)} macroF1 ${mine.macroF1.toFixed(6)} | scikit-learn akurasi ${ref.accuracy.toFixed(6)} kappa ${ref.kappa.toFixed(6)} macroF1 ${ref.macroF1.toFixed(6)}`);
    expect(Math.abs(mine.accuracy - ref.accuracy)).toBeLessThan(1e-9);
    expect(Math.abs(mine.kappa - ref.kappa)).toBeLessThan(1e-9);
    expect(Math.abs(mine.macroF1 - ref.macroF1)).toBeLessThan(1e-9);

    const get = (components: string): Table => (applied.statistics.find((s) => s.components === components) as { tables: Table[] }).tables[0];
    const metrics = get("Apply Model Evaluation Metrics");
    expect(rowOf(metrics, "Overall Accuracy")?.accuracy).toBe(Number(ref.accuracy.toFixed(3)));
    expect(rowOf(metrics, "Macro Average")?.f1).toBe(Number(ref.macroF1.toFixed(3)));
    expect(valueOf(get("Apply Model Cohen's Kappa"), "Cohen's Kappa (overall)")).toBe(Number(ref.kappa.toFixed(3)));
    const cps = get("Apply Model Case Processing Summary");
    expect(valueOf(cps, "Total Rows")).toBe(270);
    expect(valueOf(cps, "Scored")).toBe(270);
    expect(valueOf(cps, "Evaluated")).toBe(270);
    const dist = get("Apply Model Prediction Distribution");
    expect(rowOf(dist, "Total")?.count).toBe(270);
  });

  it(`IT-04 ${k}-e INFO: akurasi holdout 30% yang dilaporkan Naive Bayes saat melatih (bukan akurasi pilkada_test) dicatat sebagai pembeda`, () => {
    // eslint-disable-next-line no-console
    console.log(`[integration.it04] ${k}: akurasi holdout NB (validasi 70/30 di dalam 630 baris latih) = ${nbEval?.overall_accuracy}`);
    expect(typeof nbEval?.overall_accuracy).toBe("number");
    expect(fs.existsSync(path.join(PILKADA.accuracyOut(), `pred_sklearn_${k}.csv`))).toBe(true);
    expect(KCONFIG[k].likelihood).toBeDefined();
  });
});
