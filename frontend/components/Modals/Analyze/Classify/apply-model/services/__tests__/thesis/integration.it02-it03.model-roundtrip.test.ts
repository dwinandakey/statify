/** @jest-environment node */
// Track F — IT-02 dan IT-03.
//
//   IT-02  Model Raw Text diekspor dari Naive Bayes lalu dimuat di Apply Model
//          -> Model Summary sama dengan model asal (target, kelas, resep).
//   IT-03  Model diterapkan ke data latih yang sama
//          -> prediksi identik dengan model final (kriteria asli: galat <= 1e-9).
//
// Rantai (kode ASLI + wasm ASLI): analyzeNaiveBayes -> teks berkas Export Model (JSON.stringify(trained_model, null, 2),
// persis export-model-output.tsx) -> loadModelFromFile / loadModelFromResultStore (adapter validateAnyModel) -> applyModel
// -> tabel "Model Summary" dan kolom NB_* yang ditulis ke dataset.
//
// CATATAN KRITERIA 1e-9 (IT-03): wasm Apply Model membulatkan probabilitas keluaran ke 4 desimal (round4,
// apply-model/rust/src/stats/posterior.rs). Karena itu galat 1e-9 tidak dapat diukur LANGSUNG pada kolom NB_Probability_*.
// Tes ini TIDAK melonggarkan kriteria diam-diam; yang diperiksa dan dilaporkan terpisah:
//   (a) kelas prediksi == skor acuan presisi penuh (Float64, dihitung ulang dari parameter model + matriks STWV);
//   (b) round4(acuan) == nilai kolom NB_Probability_* (identik) dan |acuan - kolom| <= 5e-5 (batas pembulatan);
//   (c) parameter model yang diterima Apply Model == trained_model keluaran Naive Bayes, bit-per-bit;
//   (d) selisih skor-log terkecil antar kelas >> 1e-9 (galat numerik <= 1e-9 tidak dapat membalik keputusan).

jest.mock("@/stores/useResultStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks");
  return { useResultStore: { getState: () => m.resultStore.state } };
});
jest.mock("@/stores/useVariableStore", () => {
  const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks");
  return { useVariableStore: { getState: () => m.variableState }, processVariableName: m.realProcessVariableName };
});

import type { Variable } from "@/types/Variable";
import { loadModelFromResultStore, type ModelLoadSuccess } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";
import { toRustConfig } from "@/components/Modals/Transform/StringToWordVector/config";
import {
  PILKADA, bitsOf, classificationMetrics, columnValues, deepBitCompare, installWasmWorkers, makeVariables, pilkadaAvailable,
  pilkadaOverrides, readCsv, referenceScores, round4, wasmAvailable, workerCalls,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.helpers";
import { resultStore } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks";
import {
  KCONFIG, applyRawModelApp, exportModelText, loadModel, runStwv, trainPilkadaRaw, valueOf, rowOf, type ApplyResult, type KName,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.drivers";

const ready = wasmAvailable() && pilkadaAvailable();
const describeIf = ready ? describe : describe.skip;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn("[integration.it02-it03] wasm atau pilkada_*.csv tidak ditemukan: berkas dilewati.");
}

const EXPORT_FILE = "Naive_Bayes_Model_Export.json";
const LIKELIHOOD_LABEL: Record<string, string> = { multinomial: "multinomial", bernoulli: "bernoulli", complement: "complement" };

type ModelShape = {
  schema_version: string; model_type: string; trained_at: string;
  target: { name: string; classes: string[]; class_priors: number[] };
  features: unknown[]; feature_order: string[];
  text: { source: string; likelihood: string; alpha: number; terms: string[]; raw_variable: string; recipe: { config: Record<string, unknown>; vocabulary: string[]; n_docs: number; recipe_version: string }; uses_class_prior: boolean; log_weights: Record<string, number[]>; log_weights_absent?: Record<string, number[]> | null };
};

describeIf.each(["K1", "K2", "K3", "K4", "K5"] as KName[])("%s: NB -> Export Model -> Apply Model pada data latih yang sama", (k) => {
  const train = readCsv(PILKADA.train());
  const trainVars: Variable[] = makeVariables(train.header, train.rows, pilkadaOverrides());
  let nbModel: ModelShape;
  let exportText: string;
  let loaded: ModelLoadSuccess;
  let applied: ApplyResult;
  let amModelPayload: unknown;
  let exportStatId: number;
  let nbExportedStat: { components: string; output_data: string } | undefined;

  beforeAll(async () => {
    installWasmWorkers();
    resultStore.reset();
    workerCalls.length = 0;
    const { raw } = await trainPilkadaRaw(train, k);
    nbModel = raw.trained_model as unknown as ModelShape;
    exportText = exportModelText(raw);
    const exportStat = resultStore.statistics().find((s) => s.components === "Export Model");
    nbExportedStat = exportStat;
    exportStatId = exportStat ? exportStat.id : -1;
    loaded = await loadModel(EXPORT_FILE, exportText);
    applied = await applyRawModelApp({ loaded, data: train.rows, variables: trainVars });
    amModelPayload = workerCalls.filter((c) => c.kind === "am").pop()?.payload.model;
  }, 180000);

  // ------------------------------------------------------------------ IT-02
  it(`IT-02 ${k}-a berkas Export Model = JSON.stringify(trained_model, null, 2) dan termuat kembali sama persis (bit-per-bit)`, () => {
    const parsed = JSON.parse(exportText);
    const cmp = deepBitCompare(nbModel, parsed);
    expect(cmp.diffs).toEqual([]);
    expect(cmp.numbers).toBeGreaterThan(5000);
    expect(JSON.stringify(parsed, null, 2)).toBe(exportText);
    // statistic "Export Model" di Output Viewer membawa model yang sama
    expect(nbExportedStat).toBeDefined();
    const inStore = (JSON.parse((nbExportedStat as { output_data: string }).output_data) as { naiveBayesTrainedModel: unknown }).naiveBayesTrainedModel;
    expect(deepBitCompare(nbModel, inStore).diffs).toEqual([]);
  });

  it(`IT-02 ${k}-b adapter Apply Model menerima model (loadModelFromFile) dan descriptor memuat target, kelas, skema, sumber teks dari model asal`, () => {
    const d = loaded.descriptor;
    expect(loaded.sourceLabel).toBe(`File: ${EXPORT_FILE}`);
    expect(d.modelType).toBe("naive_bayes");
    expect(d.algorithmLabel).toBe("Naive Bayes");
    expect(d.schemaVersion).toBe("2.0");
    expect(d.trainedAt).toBe(nbModel.trained_at);
    expect(d.targetName).toBe(nbModel.target.name);
    expect(d.targetName).toBe(PILKADA.labelCol);
    expect(d.classes).toEqual(nbModel.target.classes);
    expect(d.features).toEqual([]);
    expect(d.warnings).toEqual([]);
    expect(d.text).toEqual({
      source: "raw",
      likelihood: KCONFIG[k].likelihood,
      alpha: 1,
      termCount: nbModel.text.terms.length,
      rawVariable: PILKADA.textCol,
      columns: [],
    });
    const rows = Object.fromEntries(d.summaryRows.map((r) => [r.label, r.value]));
    expect(rows["Text terms"]).toBe(String(nbModel.text.terms.length));
  });

  it(`IT-02 ${k}-c Model Summary di Output Viewer Apply Model sama dengan model asal (sumber, algoritma, skema, target, kelas, variabel teks, likelihood)`, () => {
    const stat = applied.statistics.find((s) => s.components === "Apply Model Summary");
    expect(stat).toBeDefined();
    const table = (stat as { tables: Parameters<typeof valueOf>[0][] }).tables[0];
    expect(table.title).toBe("Model Summary");
    expect(valueOf(table, "Source")).toBe(`File: ${EXPORT_FILE}`);
    expect(valueOf(table, "Algorithm")).toBe("Naive Bayes");
    expect(valueOf(table, "Schema Version")).toBe("2.0");
    expect(valueOf(table, "Trained At")).toBe(nbModel.trained_at);
    expect(valueOf(table, "Target")).toBe(nbModel.target.name);
    expect(valueOf(table, "Classes")).toBe(nbModel.target.classes.join(", "));
    expect(valueOf(table, "Text Variable")).toBe(`${nbModel.text.raw_variable} → ${PILKADA.textCol} (raw text)`);
    expect(valueOf(table, "Text source")).toBe("raw");
    expect(String(valueOf(table, "Text likelihood")).toLowerCase()).toBe(LIKELIHOOD_LABEL[nbModel.text.likelihood]);
    expect(valueOf(table, "Smoothing alpha")).toBe(String(nbModel.text.alpha));
    expect(table.rows.filter((r) => r.rowHeader?.[0] === "Feature")).toHaveLength(0);
  });

  it(`IT-02 ${k}-d RESEP: objek model yang sampai ke wasm Apply Model identik dengan trained_model NB, dan recipe.config = konfigurasi preprocessing yang dikirim NB`, () => {
    expect(deepBitCompare(nbModel, amModelPayload).diffs).toEqual([]);
    const sent = toRustConfig(KCONFIG[k].stwv) as unknown as Record<string, unknown>;
    const cfg = nbModel.text.recipe.config;
    const keys = ["lowercase", "stemming_method", "stopwords_method", "delimiters", "ngram_min", "ngram_max", "formula_standard", "tf_method", "idf_method", "normalization", "words_to_keep", "min_term_freq"];
    for (const key of keys) expect({ key, v: cfg[key] }).toEqual({ key, v: sent[key] });
    expect(nbModel.text.recipe.vocabulary).toEqual(nbModel.text.terms);
    expect(nbModel.text.recipe.n_docs).toBe(630);
    expect(nbModel.text.recipe.recipe_version).toBe("1.0");
  });

  it(`IT-02 ${k}-e sumber Output Viewer: loadModelFromResultStore(statistic "Export Model") menghasilkan descriptor dan model yang sama dengan sumber berkas`, async () => {
    expect(exportStatId).toBeGreaterThan(0);
    const res = await loadModelFromResultStore(exportStatId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.descriptor).toEqual(loaded.descriptor);
    expect(deepBitCompare(loaded.model, res.model).diffs).toEqual([]);
    expect(res.sourceLabel).toMatch(/^Output Viewer: Naive Bayes Analysis › Naive Bayes Analysis Result \(#\d+\)$/);
  });

  // ------------------------------------------------------------------ IT-03
  it(`IT-03 ${k}-a kolom hasil tertulis ke dataset: NB_PredictedValue, NB_PredictedProbability, NB_Probability_<kelas>, 630 baris`, () => {
    expect(applied.definitions.map((d) => d.name)).toEqual(["NB_PredictedValue", "NB_PredictedProbability", "NB_Probability_negative", "NB_Probability_positive"]);
    expect(applied.definitions.map((d) => d.columnIndex)).toEqual([4, 5, 6, 7]);
    expect(applied.summary.scoredRows).toBe(630);
    for (const col of [4, 5, 6, 7]) expect(columnValues(applied.updates, col, 630).filter((v) => v !== null)).toHaveLength(630);
    expect(applied.summary.warnings).toEqual([]);
  });

  it(`IT-03 ${k}-b prediksi == skor acuan presisi penuh; round4(acuan) == kolom NB_Probability_*; selisih <= 5e-5 (batas round4); keputusan kokoh terhadap 1e-9`, () => {
    const tcol = train.header.indexOf(PILKADA.textCol);
    const stwv = runStwv(train.rows.map((r) => r[tcol] ?? ""), KCONFIG[k].stwv);
    expect(stwv.vocabulary).toEqual(nbModel.text.terms);
    const ref = referenceScores(loaded.model as never, stwv.matrix);
    const classes = nbModel.target.classes;
    const pred = columnValues(applied.updates, 4, 630) as string[];
    const maxP = columnValues(applied.updates, 5, 630) as number[];
    const probs = classes.map((_, ci) => columnValues(applied.updates, 6 + ci, 630) as number[]);

    let samePred = 0, sameR4 = 0, total = 0, maxAbsRaw = 0, maxAbsR4 = 0, maxAbsMax = 0, exactTies = 0, minGap = Infinity;
    for (let i = 0; i < 630; i++) {
      const r = ref[i];
      if (classes[r.predictedIndex] === pred[i]) samePred++;
      if (r.gap === 0) exactTies++; else minGap = Math.min(minGap, r.gap);
      classes.forEach((_, ci) => {
        total++;
        maxAbsRaw = Math.max(maxAbsRaw, Math.abs(probs[ci][i] - r.probs[ci]));
        const d4 = Math.abs(probs[ci][i] - round4(r.probs[ci]));
        maxAbsR4 = Math.max(maxAbsR4, d4);
        if (d4 === 0) sameR4++;
      });
      maxAbsMax = Math.max(maxAbsMax, Math.abs(maxP[i] - round4(Math.max(...r.probs))));
    }
    // eslint-disable-next-line no-console
    console.log(`[integration.it03] ${k}: kelas sama ${samePred}/630; round4(acuan)==kolom ${sameR4}/${total} (selisih maks ${maxAbsR4}); |acuan-kolom| maks ${maxAbsRaw.toExponential(3)}; kriteria 1e-9 langsung: ${maxAbsRaw <= 1e-9 ? "terpenuhi" : "tidak terpenuhi (round4)"}; selisih skor-log terkecil ${minGap.toExponential(3)}; seri persis ${exactTies}`);
    expect(samePred).toBe(630);
    expect(sameR4).toBe(total);
    expect(maxAbsMax).toBe(0);
    expect(maxAbsRaw).toBeLessThanOrEqual(5e-5 + 1e-15);
    expect(minGap).toBeGreaterThan(1e-6);
  });

  it(`IT-03 ${k}-c metrik evaluasi pada data latih (resubstitusi) di Output Viewer sama dengan perhitungan sendiri dari kolom NB_PredictedValue`, () => {
    const actual = train.rows.map((r) => r[train.header.indexOf(PILKADA.labelCol)]);
    const mine = classificationMetrics(actual, columnValues(applied.updates, 4, 630) as string[]);
    const cps = applied.statistics.find((s) => s.components === "Apply Model Case Processing Summary");
    expect(valueOf((cps as { tables: Parameters<typeof valueOf>[0][] }).tables[0], "Evaluated")).toBe(630);
    const metrics = applied.statistics.find((s) => s.components === "Apply Model Evaluation Metrics");
    const overall = rowOf((metrics as { tables: Parameters<typeof valueOf>[0][] }).tables[0], "Overall Accuracy");
    expect(overall?.accuracy).toBe(Number(mine.accuracy.toFixed(3)));
    const kappa = applied.statistics.find((s) => s.components === "Apply Model Cohen's Kappa");
    expect(valueOf((kappa as { tables: Parameters<typeof valueOf>[0][] }).tables[0], "Cohen's Kappa (overall)")).toBe(Number(mine.kappa.toFixed(3)));
  });

  it(`IT-03 ${k}-d parameter yang diterima Apply Model identik dengan trained_model NB (selisih 0 <= 1e-9, bit-per-bit pada ${k})`, () => {
    const cmp = deepBitCompare(nbModel, amModelPayload);
    expect(cmp.numbers).toBeGreaterThan(5000);
    expect(cmp.maxAbs).toBe(0);
    expect(cmp.diffs).toEqual([]);
    expect(bitsOf(1)).toBe("3ff0000000000000"); // pemeriksaan pembantu bitsOf
  });

  it(`IT-03 ${k}-e KONTROL NEGATIF: satu log_weight digeser 1e-9 TERDETEKSI oleh pembanding bit (deepBitCompare), sedangkan keluaran Apply Model (round4) tidak berubah -> bukti bahwa kriteria 1e-9 hanya dapat diuji pada parameter`, async () => {
    const tampered = JSON.parse(exportText) as ModelShape;
    const firstClass = Object.keys(tampered.text.log_weights)[0];
    const before = tampered.text.log_weights[firstClass][0];
    tampered.text.log_weights[firstClass][0] = before + 1e-9;
    expect(tampered.text.log_weights[firstClass][0]).not.toBe(before);
    const cmp = deepBitCompare(nbModel, tampered);
    expect(cmp.diffs.length).toBe(1);
    const reloaded = await loadModel(EXPORT_FILE, JSON.stringify(tampered, null, 2));
    const again = await applyRawModelApp({ loaded: reloaded, data: train.rows, variables: trainVars });
    let changed = 0;
    for (const col of [4, 5, 6, 7]) {
      const a = columnValues(applied.updates, col, 630);
      const b = columnValues(again.updates, col, 630);
      changed += a.filter((v, i) => !Object.is(v, b[i])).length;
    }
    // eslint-disable-next-line no-console
    console.log(`[integration.it03] ${k}: kontrol negatif (geser 1e-9 pada satu log_weight): deepBitCompare melaporkan ${cmp.diffs.length} selisih; sel keluaran AM yang berubah = ${changed}/${630 * 4}`);
    expect(changed).toBe(0);
  });
});
