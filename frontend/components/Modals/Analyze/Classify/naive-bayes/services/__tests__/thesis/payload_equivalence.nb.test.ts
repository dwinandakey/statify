/** @jest-environment node */
// Track D — kesetaraan pembangun payload headless (testing/thesis-eval/headless/statify_wasm.mjs) dengan kode TypeScript
// aplikasi untuk Naive Bayes (jalur Raw Text). Berkas golden `payload_golden.json` dibuat oleh
// `node testing/thesis-eval/headless/make_payload_golden.mjs` (pustaka headless). Di sini kode TS ASLI
// (`analyzeNaiveBayes`, `getSlicedData`, `getVarDefs`, `toRustConfig`, `getEffectivePredictors`) membentuk payload dari
// masukan yang sama, lalu hasilnya dibandingkan dengan payload golden. Tidak ada komputasi wasm di tes ini.
import * as fs from "fs";
import * as path from "path";

import { analyzeNaiveBayes } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis";
import { getEffectivePredictors } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { getSlicedData } from "@/hooks/useVariable";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable } from "@/types/Variable";

jest.mock(
  "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-output",
  () => ({ resultNaiveBayes: jest.fn() })
);
jest.mock(
  "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-formatter",
  () => ({ transformNaiveBayesResult: jest.fn() })
);

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
const describeIfGolden = goldenPath ? describe : describe.skip;

let captured: Record<string, unknown> | null = null;
class CapturingWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  postMessage(payload: Record<string, unknown>): void {
    captured = JSON.parse(JSON.stringify(payload)); // seperti structured clone: buang undefined
    setTimeout(() => this.onmessage?.({ data: { success: true, data: {} } }), 0);
  }
  terminate(): void {}
}

describeIfGolden("Track D: payload NB headless == payload TS aplikasi (Raw Text)", () => {
  const golden = JSON.parse(fs.readFileSync(goldenPath as string, "utf8"));
  const rows: string[][] = golden.inputs.rows;
  const variables: Variable[] = golden.inputs.variables;
  const configData: NaiveBayesType = golden.inputs.configData;

  beforeEach(() => {
    captured = null;
    (globalThis as unknown as { Worker: unknown }).Worker = CapturingWorker;
  });

  it("payload yang dikirim ke worker identik dengan golden headless", async () => {
    const names = [configData.main.TargetVar as string, ...getEffectivePredictors(configData.main, variables)];
    const dataVariables = getSlicedData({ dataVariables: rows, variables, selectedVariables: names });
    const column = variables.find((v) => v.name === configData.main.RawTextVar)?.columnIndex as number;
    const rowCount = dataVariables[0].length;
    const rawTextValues = Array.from({ length: rowCount }, (_, i) => rows[i]?.[column] ?? null);

    await analyzeNaiveBayes({ configData, dataVariables, variables, rawTextValues });

    expect(captured).not.toBeNull();
    expect(captured).toEqual(golden.nbPayload);
  });

  it("konfigurasi Text (toRustConfig) memuat daftar stopword Indonesia lengkap dan semua opsi vektorisasi", () => {
    const cfg = (golden.nbPayload.config as { Text: Record<string, unknown> }).Text;
    expect(cfg.stopwords_method).toBe("indonesian");
    expect(cfg.stemming_method).toBe("indonesian");
    expect(cfg.tf_method).toBe("log1p");
    expect(cfg.idf_method).toBe("standard");
    expect(cfg.normalization).toBe("doc_length");
    expect(cfg.words_to_keep).toBe(0);
    expect(JSON.parse(cfg.custom_stopwords as string).length).toBeGreaterThan(700);
  });
});
