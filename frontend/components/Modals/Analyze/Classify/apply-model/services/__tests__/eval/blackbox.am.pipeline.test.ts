/** @jest-environment node */
// Track C3 — Black-box BB-33 (Apply Model dengan Actual target -> kolom prediksi + metrik), BB-35 (output setelah
// prediksi: Model Summary, Case Processing Summary, Prediction Distribution) dan BB-34 (nama kolom bentrok pada
// jalur penuh), tingkat service/pipeline `applyModel`.
//
// KOMPUTASI NYATA: `Worker` diganti pengganti yang menjalankan biner WASM Apply Model yang sudah dibangun
// (public/workers/Classify/ApplyModel/pkg/wasm_bg.wasm, hasil kompilasi crate Rust apply-model/rust) lewat
// `new ApplyModelAnalysis(...)` dengan payload persis seperti yang dikirim `applyModel` ke worker produksi.
// Sisanya nyata: getSlicedData/getVarDefs, pembentukan nama kolom, formatter tabel, penulisan Output Viewer
// (mock store, penulisan dicatat), penulisan kolom ke dataset (mock addVariables, argumen dicatat).
//
// Nilai harapan dihitung INDEPENDEN dengan Python murni (testing/text_analytics_eval/tools/c3_am_oracle.py), bukan
// disalin dari keluaran Rust. Bila biner WASM tidak ada di salinan repo, seluruh berkas ini dilewati.

import type { Variable } from "@/types/Variable";
import { ApplyModelDefault } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-default";
import type { ApplyModelType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";
import type { ApplyModelWorkerPayload } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model-worker";
import type { Table } from "@/types/Table";

const mockAddVariables = jest.fn();
const mockVariableState: { variables: Variable[]; addVariables: jest.Mock } = {
  variables: [],
  addVariables: mockAddVariables,
};
jest.mock("@/stores/useVariableStore", () => {
  const helpers = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/blackbox.am.helpers");
  return {
    useVariableStore: { getState: jest.fn(() => mockVariableState) },
    processVariableName: helpers.loadRealProcessVariableName(),
  };
});

const mockAddLog = jest.fn();
const mockAddAnalytic = jest.fn();
const mockAddStatistic = jest.fn();
jest.mock("@/stores/useResultStore", () => ({
  useResultStore: {
    getState: jest.fn(() => ({
      addLog: mockAddLog,
      addAnalytic: mockAddAnalytic,
      addStatistic: mockAddStatistic,
    })),
  },
}));

import { applyModel } from "@/components/Modals/Analyze/Classify/apply-model/services/apply-model-analysis";
import {
  applyModelWasmAvailable,
  applyModelWasmSha256,
  loadApplyModelWasm,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/blackbox.am.helpers";

const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as unknown;
const nbModelRaw = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-raw.json") as unknown;

const wasmReady = applyModelWasmAvailable();
const describeIfWasm = wasmReady ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Pengganti Worker yang menjalankan WASM sungguhan
// ---------------------------------------------------------------------------

type WorkerReply =
  | { success: true; data: unknown; errors: unknown }
  | { success: false; error: string };

const workerCalls: { payloads: ApplyModelWorkerPayload[] } = { payloads: [] };

class WasmBackedWorker {
  onmessage: ((event: { data: WorkerReply }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  postMessage(payload: ApplyModelWorkerPayload & { text?: unknown }): void {
    workerCalls.payloads.push(payload);
    let reply: WorkerReply;
    try {
      const Analysis = loadApplyModelWasm();
      const analysis = new Analysis(
        payload.predictors,
        payload.predictorDefs,
        payload.mapping,
        payload.actual,
        payload.actualDefs,
        payload.model,
        payload.text
      );
      reply = { success: true, data: analysis.get_formatted_results(), errors: analysis.get_all_errors() };
      analysis.free();
    } catch (err) {
      reply = { success: false, error: err instanceof Error ? err.message : String(err) };
    }
    setTimeout(() => this.onmessage?.({ data: reply }), 0);
  }
  terminate(): void {}
}

// ---------------------------------------------------------------------------
// Data uji
// ---------------------------------------------------------------------------

function makeVariable(
  name: string,
  columnIndex: number,
  measure: Variable["measure"],
  type: Variable["type"]
): Variable {
  return {
    columnIndex,
    name,
    type,
    width: 8,
    decimals: 0,
    values: [],
    missing: null,
    columns: 8,
    align: "right",
    measure,
    role: "input",
  };
}

const d3Variables = (): Variable[] => [
  makeVariable("Outlook", 0, "nominal", "STRING"),
  makeVariable("Temp", 1, "scale", "NUMERIC"),
  makeVariable("Play", 2, "nominal", "STRING"),
];

// Dataset D3 (apply-model/AGENTS.md §5.6; sel kosong = "").
const D3_DATA: string[][] = [
  ["Overcast", "85", "No"],
  ["Sunny", "71", "Yes"],
  ["Foggy", "72", "Yes"],
  ["Sunny", "", "No"],
  ["", "", "Yes"],
  ["", "80", "Maybe"],
];

const textVariables = (): Variable[] => [
  makeVariable("Teks", 0, "nominal", "STRING"),
  makeVariable("Sentimen", 1, "nominal", "STRING"),
];
const TEXT_DATA: string[][] = [
  ["makan nasi enak", "pos"],
  ["Saya tidak suka nasi!", "pos"],
  ["", "pos"],
  ["Makan, makan, makan", "neg"],
];

function formD1(overrides: { actual?: string | null; classProbabilities?: boolean; output?: Partial<ApplyModelType["output"]> } = {}): ApplyModelType {
  const form = JSON.parse(JSON.stringify(ApplyModelDefault)) as ApplyModelType;
  form.model = { SourceKind: "file", SourceRef: "nb-model-v1_1.json", SourceLabel: "File: nb-model-v1_1.json", ModelJson: nbModelV11 };
  form.variables = {
    FeatureMapping: { Outlook: "Outlook", Temp: "Temp" },
    ActualTargetVar: overrides.actual === undefined ? "Play" : overrides.actual,
  };
  form.save.SaveClassProbabilities = overrides.classProbabilities ?? true;
  form.output = { ...form.output, ...(overrides.output ?? {}) };
  return form;
}

function formText(): ApplyModelType {
  const form = JSON.parse(JSON.stringify(ApplyModelDefault)) as ApplyModelType;
  form.model = { SourceKind: "file", SourceRef: "nb-model-v2_0-raw.json", SourceLabel: "File: nb-model-v2_0-raw.json", ModelJson: nbModelRaw };
  form.variables = { FeatureMapping: {}, ActualTargetVar: "Sentimen", RawTextVar: "Teks", VectorMapping: {} };
  form.save.SaveClassProbabilities = true;
  return form;
}

type CellUpdate = { row: number; col: number; value: string | number };
type AddVariablesCall = [Array<Partial<Variable>>, CellUpdate[]];

function columnValues(updates: CellUpdate[], col: number, rows: number): Array<string | number | null> {
  const out: Array<string | number | null> = Array(rows).fill(null);
  for (const u of updates) if (u.col === col) out[u.row] = u.value;
  return out;
}

type RecordedStatistic = { title: string; description: string; components: string; tables: Table[] };

function recordedStatistics(): RecordedStatistic[] {
  return mockAddStatistic.mock.calls.map(([, stat]) => {
    const s = stat as { title: string; description: string; components: string; output_data: string };
    return {
      title: s.title,
      description: s.description,
      components: s.components,
      tables: (JSON.parse(s.output_data) as { tables: Table[] }).tables,
    };
  });
}

const rowOf = (table: Table, header: string) => table.rows.find((r) => r.rowHeader?.[0] === header);
const valueOf = (table: Table, header: string) => rowOf(table, header)?.value;

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as unknown as { Worker: unknown }).Worker = WasmBackedWorker;
  workerCalls.payloads = [];
  mockVariableState.variables = d3Variables();
  mockAddLog.mockResolvedValue(1);
  mockAddAnalytic.mockResolvedValue(10);
  mockAddStatistic.mockResolvedValue(undefined);
  mockAddVariables.mockResolvedValue(undefined);
});

if (!wasmReady) {
  // eslint-disable-next-line no-console
  console.warn("[blackbox.am.pipeline] wasm_bg.wasm tidak ditemukan: seluruh berkas dilewati.");
}

describeIfWasm("BB-33 Apply Model dengan Actual target (komputasi WASM nyata)", () => {
  it("BB-33-a biner WASM yang dipakai tercatat (SHA-256 64 heksadesimal)", () => {
    const sha = applyModelWasmSha256();
    // Dicetak agar masuk log uji sebagai bukti provenans biner.
    // eslint-disable-next-line no-console
    console.log(`[blackbox.am.pipeline] wasm_bg.wasm sha256=${sha}`);
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
  });

  it("BB-33-b payload ke worker memuat slice Actual (Play) dan definisinya; prediktor dikirim sesuai pemetaan", async () => {
    await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });
    expect(workerCalls.payloads).toHaveLength(1);
    const payload = workerCalls.payloads[0];
    expect(payload.mapping).toEqual([
      { feature: "Outlook", variable: "Outlook" },
      { feature: "Temp", variable: "Temp" },
    ]);
    expect(payload.actual).toHaveLength(1);
    expect(payload.actual[0].map((r) => r.Play)).toEqual(["No", "Yes", "Yes", "No", "Yes", "Maybe"]);
    expect(payload.actualDefs).toHaveLength(1);
    expect(payload.actualDefs[0]).toHaveLength(1);
    expect((payload.actualDefs[0][0] as { name: string }).name).toBe("Play");
  });

  it("BB-33-c kolom prediksi tertulis ke dataset: nama, urutan kolom, tipe, dan nilai sama dengan oracle independen", async () => {
    const summary = await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });

    expect(mockAddVariables).toHaveBeenCalledTimes(1);
    const [definitions, updates] = mockAddVariables.mock.calls[0] as AddVariablesCall;
    expect(definitions.map((d) => d.name)).toEqual([
      "NB_PredictedValue",
      "NB_PredictedProbability",
      "NB_Probability_No",
      "NB_Probability_Yes",
    ]);
    expect(definitions.map((d) => d.columnIndex)).toEqual([3, 4, 5, 6]);
    expect(definitions[0]).toMatchObject({ type: "STRING", measure: "nominal" });
    expect(definitions[1]).toMatchObject({ type: "NUMERIC", measure: "scale", decimals: 4 });

    // Oracle Python (c3_am_oracle.py, kasus A).
    expect(columnValues(updates, 3, 6)).toEqual(["No", "Yes", "Yes", "Yes", null, "No"]);
    expect(columnValues(updates, 4, 6)).toEqual([1, 0.9967, 0.9921, 0.6, null, 1]);
    expect(columnValues(updates, 5, 6)).toEqual([1, 0.0033, 0.0079, 0.4, null, 1]);
    expect(columnValues(updates, 6, 6)).toEqual([0, 0.9967, 0.9921, 0.6, null, 0]);

    expect(summary.scoredRows).toBe(5);
    expect(summary.finalNames).toEqual([
      "NB_PredictedValue",
      "NB_PredictedProbability",
      "NB_Probability_No",
      "NB_Probability_Yes",
    ]);
    expect(summary.warnings.map((w) => [w.code, w.count])).toEqual([
      ["AM_W_ROWS_NOT_SCORED", 1],
      ["AM_W_UNSEEN_CATEGORY", 2],
      ["AM_W_ACTUAL_UNKNOWN_CLASS", 1],
    ]);
  });

  it("BB-33-d metrik evaluasi (matriks konfusi, akurasi, presisi/recall/F1, makro/berbobot/mikro, kappa) sama dengan oracle", async () => {
    await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });
    const stats = recordedStatistics();

    const metrics = stats.find((s) => s.components === "Apply Model Evaluation Metrics")!.tables[0];
    // Dibulatkan 3 desimal oleh formatter NB (formatNumber).
    expect(rowOf(metrics, "No")).toMatchObject({ accuracy: 0.75, precision: 1, recall: 0.5, f1: 0.667 });
    expect(rowOf(metrics, "Yes")).toMatchObject({ accuracy: 0.75, precision: 0.667, recall: 1, f1: 0.8 });
    expect(rowOf(metrics, "Macro Average")).toMatchObject({ precision: 0.833, recall: 0.75, f1: 0.733 });
    expect(rowOf(metrics, "Weighted Average")).toMatchObject({ precision: 0.833, recall: 0.75, f1: 0.733 });
    expect(rowOf(metrics, "Micro Average")).toMatchObject({ precision: 0.75, recall: 0.75, f1: 0.75 });
    expect(rowOf(metrics, "Overall Accuracy")).toMatchObject({ accuracy: 0.75 });

    const kappa = stats.find((s) => s.components === "Apply Model Cohen's Kappa")!.tables[0];
    expect(valueOf(kappa, "Cohen's Kappa (overall)")).toBe(0.5);

    const confusion = stats.find((s) => s.components === "Apply Model Confusion Matrix")!.tables[0];
    expect(rowOf(confusion, "No")).toMatchObject({ No: "1 (25%)", Yes: "1 (25%)", total: 2 });
    expect(rowOf(confusion, "Yes")).toMatchObject({ No: "0 (0%)", Yes: "2 (50%)", total: 2 });
    expect(rowOf(confusion, "Total")).toMatchObject({ No: 1, Yes: 3, total: 4 });
  });

  it("BB-33-e model teks Raw + Actual: prediksi dan metrik sama dengan oracle (satu dokumen kosong tidak diskor)", async () => {
    mockVariableState.variables = textVariables();
    const summary = await applyModel({ formData: formText(), variables: textVariables(), dataVariables: TEXT_DATA });

    const [definitions, updates] = mockAddVariables.mock.calls[0] as AddVariablesCall;
    expect(definitions.map((d) => d.columnIndex)).toEqual([2, 3, 4, 5]);
    expect(columnValues(updates, 2, 4)).toEqual(["pos", "neg", null, "pos"]);
    expect(columnValues(updates, 3, 4)).toEqual([0.8491, 0.7596, null, 0.9906]);
    expect(columnValues(updates, 4, 4)).toEqual([0.1509, 0.7596, null, 0.0094]); // P(neg)
    expect(columnValues(updates, 5, 4)).toEqual([0.8491, 0.2404, null, 0.9906]); // P(pos)
    expect(summary.scoredRows).toBe(3);

    const stats = recordedStatistics();
    const metrics = stats.find((s) => s.components === "Apply Model Evaluation Metrics")!.tables[0];
    expect(rowOf(metrics, "neg")).toMatchObject({ accuracy: 0.333, precision: 0, recall: 0, f1: 0 });
    expect(rowOf(metrics, "pos")).toMatchObject({ accuracy: 0.333, precision: 0.5, recall: 0.5, f1: 0.5 });
    expect(rowOf(metrics, "Macro Average")).toMatchObject({ precision: 0.25, recall: 0.25, f1: 0.25 });
    expect(rowOf(metrics, "Weighted Average")).toMatchObject({ precision: 0.333, recall: 0.333, f1: 0.333 });
    const kappa = stats.find((s) => s.components === "Apply Model Cohen's Kappa")!.tables[0];
    expect(valueOf(kappa, "Cohen's Kappa (overall)")).toBe(-0.5);
    const confusion = stats.find((s) => s.components === "Apply Model Confusion Matrix")!.tables[0];
    expect(rowOf(confusion, "neg")).toMatchObject({ neg: "0 (0%)", pos: "1 (33.3%)", total: 1 });
    expect(rowOf(confusion, "pos")).toMatchObject({ neg: "1 (33.3%)", pos: "1 (33.3%)", total: 2 });
  });

  it("BB-33-f tanpa Actual target: kolom prediksi tetap ditulis, payload actual kosong, tidak ada tabel metrik/kappa/confusion", async () => {
    await applyModel({ formData: formD1({ actual: null }), variables: d3Variables(), dataVariables: D3_DATA });

    const payload = workerCalls.payloads[0];
    expect(payload.actual).toEqual([]);
    expect(payload.actualDefs).toEqual([]);

    const [, updates] = mockAddVariables.mock.calls[0] as AddVariablesCall;
    expect(columnValues(updates, 3, 6)).toEqual(["No", "Yes", "Yes", "Yes", null, "No"]);

    const components = recordedStatistics().map((s) => s.components);
    expect(components).toEqual([
      "Apply Model Summary",
      "Apply Model Case Processing Summary",
      "Apply Model Prediction Distribution",
      "Apply Model Saved Variables",
    ]);
  });

  it("BB-33-g Actual target dipetakan tetapi 'Evaluation metrics' dan 'Confusion matrix' dimatikan di tab Output: tabel metrik tidak dibuat", async () => {
    await applyModel({
      formData: formD1({ output: { EvaluationMetrics: false, ConfusionMatrix: false } }),
      variables: d3Variables(),
      dataVariables: D3_DATA,
    });
    const components = recordedStatistics().map((s) => s.components);
    expect(components).not.toContain("Apply Model Evaluation Metrics");
    expect(components).not.toContain("Apply Model Cohen's Kappa");
    expect(components).not.toContain("Apply Model Confusion Matrix");
  });
});

describeIfWasm("BB-35 Output Viewer setelah prediksi (komputasi WASM nyata)", () => {
  it("BB-35-a statistic yang dipasang: urutan dan kunci komponen unik; log 'Apply Model' / analytic 'Apply Model Result'", async () => {
    await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });

    expect(mockAddLog).toHaveBeenCalledWith({ log: "Apply Model" });
    expect(mockAddAnalytic).toHaveBeenCalledWith(1, { title: "Apply Model Result", note: "" });

    const stats = recordedStatistics();
    expect(stats.map((s) => [s.title, s.components])).toEqual([
      ["Model Summary", "Apply Model Summary"],
      ["Case Processing Summary", "Apply Model Case Processing Summary"],
      ["Prediction Distribution", "Apply Model Prediction Distribution"],
      ["Saved Variables", "Apply Model Saved Variables"],
      ["Model Evaluation Metrics", "Apply Model Evaluation Metrics"],
      ["Cohen's Kappa", "Apply Model Cohen's Kappa"],
      ["Confusion Matrix", "Apply Model Confusion Matrix"],
    ]);
    // Komponen khusus yang sudah terdaftar di Output Viewer tidak boleh dipakai ulang (AGENTS.md §6.6).
    expect(stats.map((s) => s.components)).not.toContain("Case Processing Summary");
    expect(stats.map((s) => s.components)).not.toContain("Export Model");
    expect(new Set(stats.map((s) => s.components)).size).toBe(stats.length);
    // Setiap statistic membawa interpretasi otomatis (deskripsi) yang tidak kosong.
    for (const s of stats) expect(s.description.trim().length).toBeGreaterThan(0);
  });

  it("BB-35-b tabel Model Summary: sumber, algoritma, skema, waktu latih, target, kelas, pemetaan fitur, parameter model", async () => {
    await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });
    const table = recordedStatistics().find((s) => s.components === "Apply Model Summary")!.tables[0];

    expect(table.key).toBe("apply_model_summary");
    expect(valueOf(table, "Source")).toBe("File: nb-model-v1_1.json");
    expect(valueOf(table, "Algorithm")).toBe("Naive Bayes");
    expect(valueOf(table, "Schema Version")).toBe("1.1");
    expect(valueOf(table, "Trained At")).toBe("2026-10-01T00:00:00.000Z");
    expect(valueOf(table, "Target")).toBe("Play");
    expect(valueOf(table, "Classes")).toBe("No, Yes");
    expect(table.rows.filter((r) => r.rowHeader?.[0] === "Feature").map((r) => r.value)).toEqual([
      "Outlook → Outlook (categorical)",
      "Temp → Temp (numerical)",
    ]);
    expect(valueOf(table, "Smoothing alpha")).toBe("1");
    expect(valueOf(table, "Variance floor")).toBe("0.000000001");
    expect(valueOf(table, "Validation (training)")).toBe("Holdout 70% / 30%, seed 42");
  });

  it("BB-35-c Case Processing Summary: total, diskor, tidak diskor, baris dengan prediktor hilang / kategori asing, dan blok evaluasi", async () => {
    await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });
    const table = recordedStatistics().find((s) => s.components === "Apply Model Case Processing Summary")!.tables[0];

    expect(table.key).toBe("apply_model_case_processing_summary");
    expect(valueOf(table, "Total Rows")).toBe(6);
    expect(valueOf(table, "Scored")).toBe(5);
    expect(valueOf(table, "Not Scored (All Predictors Missing)")).toBe(1);
    expect(valueOf(table, "Scored with ≥1 Missing Predictor")).toBe(2);
    expect(valueOf(table, "Scored with ≥1 Unseen Category")).toBe(2);
    expect(valueOf(table, "Evaluated")).toBe(4);
    expect(valueOf(table, "Excluded (Actual Missing)")).toBe(0);
    expect(valueOf(table, "Excluded (Actual Class Not in Model)")).toBe(1);
  });

  it("BB-35-d Prediction Distribution: cacah dan persen per kelas, baris Not scored dan Total", async () => {
    await applyModel({ formData: formD1(), variables: d3Variables(), dataVariables: D3_DATA });
    const table = recordedStatistics().find((s) => s.components === "Apply Model Prediction Distribution")!.tables[0];

    expect(table.key).toBe("apply_model_prediction_distribution");
    expect(rowOf(table, "No")).toMatchObject({ count: 2, percent: 40 });
    expect(rowOf(table, "Yes")).toMatchObject({ count: 3, percent: 60 });
    expect(rowOf(table, "Not scored")).toMatchObject({ count: 1, percent: null });
    expect(rowOf(table, "Total")).toMatchObject({ count: 6, percent: null });
  });

  it("BB-35-e model teks Raw: Model Summary memuat baris variabel teks, sumber/likelihood teks, dan jumlah dokumen kosong; CPS dan distribusi sesuai oracle", async () => {
    mockVariableState.variables = textVariables();
    await applyModel({ formData: formText(), variables: textVariables(), dataVariables: TEXT_DATA });
    const stats = recordedStatistics();

    const summary = stats.find((s) => s.components === "Apply Model Summary")!.tables[0];
    expect(valueOf(summary, "Target")).toBe("Sentimen");
    expect(valueOf(summary, "Classes")).toBe("neg, pos");
    expect(valueOf(summary, "Text Variable")).toBe("Teks → Teks (raw text)");
    expect(valueOf(summary, "Text source")).toBe("raw");
    expect(valueOf(summary, "Text likelihood")).toBe("multinomial");
    expect(valueOf(summary, "Rows with empty text")).toBe("1");

    const cps = stats.find((s) => s.components === "Apply Model Case Processing Summary")!.tables[0];
    expect(valueOf(cps, "Total Rows")).toBe(4);
    expect(valueOf(cps, "Scored")).toBe(3);
    expect(valueOf(cps, "Not Scored (All Predictors Missing)")).toBe(1);

    const distribution = stats.find((s) => s.components === "Apply Model Prediction Distribution")!.tables[0];
    expect(rowOf(distribution, "neg")).toMatchObject({ count: 1, percent: 33.333 });
    expect(rowOf(distribution, "pos")).toMatchObject({ count: 2, percent: 66.667 });
    expect(rowOf(distribution, "Not scored")).toMatchObject({ count: 1 });
  });

  it("BB-35-f kotak centang tab Output mengatur tabel yang dipasang; 'Saved Variables' selalu dipasang", async () => {
    await applyModel({
      formData: formD1({
        output: {
          ModelSummary: false,
          CaseProcessingSummary: false,
          PredictionDistribution: false,
          EvaluationMetrics: false,
          ConfusionMatrix: false,
        },
      }),
      variables: d3Variables(),
      dataVariables: D3_DATA,
    });
    expect(recordedStatistics().map((s) => s.components)).toEqual(["Apply Model Saved Variables"]);

    mockAddStatistic.mockClear();
    await applyModel({
      formData: formD1({ output: { ModelSummary: true, CaseProcessingSummary: false, PredictionDistribution: true } }),
      variables: d3Variables(),
      dataVariables: D3_DATA,
    });
    expect(recordedStatistics().map((s) => s.components)).toEqual([
      "Apply Model Summary",
      "Apply Model Prediction Distribution",
      "Apply Model Saved Variables",
      "Apply Model Evaluation Metrics",
      "Apply Model Cohen's Kappa",
      "Apply Model Confusion Matrix",
    ]);
  });
});

describeIfWasm("BB-34 nama kolom bentrok pada jalur penuh (komputasi WASM nyata)", () => {
  it("BB-34-P1 dataset sudah punya NB_PredictedValue dan NB_Probability_Yes: kolom baru bersufiks _1, nama akhir dilaporkan di toast, tabel Saved Variables, dan definisi kolom", async () => {
    const existing = [
      ...d3Variables(),
      makeVariable("NB_PredictedValue", 3, "nominal", "STRING"),
      makeVariable("nb_probability_yes", 4, "scale", "NUMERIC"),
    ];
    mockVariableState.variables = existing;

    const summary = await applyModel({ formData: formD1(), variables: existing, dataVariables: D3_DATA });

    const expectedNames = [
      "NB_PredictedValue_1",
      "NB_PredictedProbability",
      "NB_Probability_No",
      "NB_Probability_Yes_1",
    ];
    expect(summary.finalNames).toEqual(expectedNames);

    const [definitions, updates] = mockAddVariables.mock.calls[0] as AddVariablesCall;
    expect(definitions.map((d) => d.name)).toEqual(expectedNames);
    // Kolom baru dimulai setelah kolom terakhir yang ada (indeks 4) -> 5..8.
    expect(definitions.map((d) => d.columnIndex)).toEqual([5, 6, 7, 8]);
    expect(columnValues(updates, 5, 6)).toEqual(["No", "Yes", "Yes", "Yes", null, "No"]);

    const saved = recordedStatistics().find((s) => s.components === "Apply Model Saved Variables")!.tables[0];
    expect(saved.rows.map((r) => [r.rowHeader?.[0], r.finalName])).toEqual([
      ["Predicted value", "NB_PredictedValue_1"],
      ["Max probability", "NB_PredictedProbability"],
      ["Probability of No", "NB_Probability_No"],
      ["Probability of Yes", "NB_Probability_Yes_1"],
    ]);
  });

  it("BB-34-P2 variabel yang sudah ada tidak diubah: tidak ada pembaruan sel pada kolom lama (hanya variabel baru ditambahkan)", async () => {
    const existing = [...d3Variables(), makeVariable("NB_PredictedValue", 3, "nominal", "STRING")];
    mockVariableState.variables = existing;
    await applyModel({ formData: formD1(), variables: existing, dataVariables: D3_DATA });

    const [definitions, updates] = mockAddVariables.mock.calls[0] as AddVariablesCall;
    expect(definitions.every((d) => (d.columnIndex as number) >= 4)).toBe(true);
    expect(updates.every((u) => u.col >= 4)).toBe(true);
    expect(mockAddVariables).toHaveBeenCalledTimes(1);
  });
});
