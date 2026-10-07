/** @jest-environment node */
// Track D — kesetaraan pembangun payload headless dengan kode TypeScript Apply Model (`applyModel`), jalur Raw Text.
// Kode TS ASLI (`applyModel`, getSlicedData, getVarDefs, readRawTextValues) membentuk payload dari masukan golden
// (`testing/thesis-eval/headless/payload_golden.json`, dibuat pustaka headless); payload yang ditangkap di Worker
// dibandingkan dengan golden, dan prediksi dari wasm AM yang dijalankan lewat jalur TS dibandingkan dengan prediksi
// golden (dari pustaka headless). Pola mock sama dengan blackbox.am.pipeline.test.ts.
import * as fs from "fs";
import * as path from "path";

import type { Variable } from "@/types/Variable";
import { ApplyModelDefault } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-default";
import type { ApplyModelType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";
import type { ApplyModelWorkerPayload } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model-worker";

const mockAddVariables = jest.fn();
const mockVariableState: { variables: Variable[]; addVariables: jest.Mock } = {
  variables: [],
  addVariables: mockAddVariables,
};
jest.mock("@/stores/useVariableStore", () => {
  const helpers = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/blackbox.am.helpers");
  return {
    useVariableStore: { getState: jest.fn(() => mockVariableState) },
    processVariableName: helpers.loadRealProcessVariableName(),
  };
});
jest.mock("@/stores/useResultStore", () => ({
  useResultStore: {
    getState: jest.fn(() => ({
      addLog: jest.fn().mockResolvedValue(1),
      addAnalytic: jest.fn().mockResolvedValue(10),
      addStatistic: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

import { applyModel } from "@/components/Modals/Analyze/Classify/apply-model/services/apply-model-analysis";
import {
  applyModelWasmAvailable,
  loadApplyModelWasm,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/blackbox.am.helpers";

function findGolden(start: string = __dirname): string | null {
  let dir = start;
  for (let i = 0; i < 16; i += 1) {
    const p = path.join(dir, "testing", "thesis-eval", "headless", "payload_golden.json");
    if (fs.existsSync(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
const goldenPath = findGolden();
const describeIfReady = goldenPath && applyModelWasmAvailable() ? describe : describe.skip;

const captured: { payloads: ApplyModelWorkerPayload[] } = { payloads: [] };
class WasmBackedWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  postMessage(payload: ApplyModelWorkerPayload & { text?: unknown }): void {
    captured.payloads.push(JSON.parse(JSON.stringify(payload)));
    let reply: unknown;
    try {
      const Analysis = loadApplyModelWasm();
      const analysis = new Analysis(
        payload.predictors, payload.predictorDefs, payload.mapping, payload.actual, payload.actualDefs, payload.model, payload.text
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

describeIfReady("Track D: payload AM headless == payload TS aplikasi (Raw Text) dan prediksi sama", () => {
  const golden = JSON.parse(fs.readFileSync(goldenPath as string, "utf8"));
  const rows: string[][] = golden.inputs.rows;
  const variables: Variable[] = golden.inputs.variables;

  beforeEach(() => {
    captured.payloads = [];
    mockAddVariables.mockReset();
    mockAddVariables.mockResolvedValue(undefined);
    mockVariableState.variables = variables;
    (globalThis as unknown as { Worker: unknown }).Worker = WasmBackedWorker;
  });

  it("payload ke worker identik dengan golden headless; kolom prediksi sama dengan prediksi golden", async () => {
    const form = JSON.parse(JSON.stringify(ApplyModelDefault)) as ApplyModelType;
    form.model = { SourceKind: "file", SourceRef: "golden.json", SourceLabel: "File: golden.json", ModelJson: golden.model };
    form.variables = { FeatureMapping: {}, ActualTargetVar: "Label", RawTextVar: "Teks", VectorMapping: {} };
    form.save.SaveClassProbabilities = true;

    await applyModel({ formData: form, variables, dataVariables: rows });

    expect(captured.payloads).toHaveLength(1);
    expect(captured.payloads[0]).toEqual(golden.amPayload);

    const [, updates] = mockAddVariables.mock.calls[0] as [unknown, Array<{ row: number; col: number; value: string | number }>];
    const predictedCol = variables.length; // kolom pertama yang ditambahkan = NB_PredictedValue
    const predicted: Array<string | null> = Array(rows.length).fill(null);
    for (const u of updates) if (u.col === predictedCol) predicted[u.row] = String(u.value);
    expect(predicted).toEqual(golden.amPredicted);
  });
});
