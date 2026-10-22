/** @jest-environment node */
// B9 (LAPORAN_PERBAIKAN_12Okt): peringatan dan galat mesin Rust Naive Bayes harus sampai ke pengguna.
// Worker (`public/workers/Classify/NaiveBayes/naive-bayes.worker.js`) mengirim
// `{ success: true, data, errors }` dengan `errors` = string `get_all_errors()` Rust
// (`"No errors occurred."` atau `"Error Summary:\nContext: ...\n  1. ...\n"`), atau
// `{ success: false, error }` dengan ringkasan galat konstruktor (run ber-Text).
// Teks pesan di bawah disalin dari `rust/src/stats/partition.rs::validate_fold_count`.
import { readFileSync } from "fs";
import { join } from "path";

import {
  analyzeNaiveBayes,
  getNaiveBayesEngineWarnings,
} from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis";
import { getUserFriendlyNaiveBayesError } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-error-messages";
import { resultNaiveBayes } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-output";
import type { NaiveBayesRawResult } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-formatter";
import { mergeWithDefaults } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { Table } from "@/types/Table";

jest.mock(
  "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-output",
  () => ({ resultNaiveBayes: jest.fn().mockResolvedValue(undefined) })
);

const mockResult = resultNaiveBayes as jest.MockedFunction<typeof resultNaiveBayes>;

const stub = JSON.parse(
  readFileSync(join(__dirname, "..", "__fixtures__", "naive-bayes-stub-result.json"), "utf8")
) as NaiveBayesRawResult;

const FOLD_WARNING =
  "Number of folds (6) exceeds the smallest class size (5). Some folds will not contain any instance of that class, so class proportions across folds will not be perfectly balanced. The analysis will still run.";
const FOLD_ERROR =
  "Number of folds (11) cannot be greater than the number of valid instances (10). Choose a smaller number of folds.";
const summaryOf = (context: string, message: string) =>
  `Error Summary:\nContext: ${context}\n  1. ${message}\n`;

let workerResponse: unknown = null;
class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  postMessage(): void {
    setTimeout(() => this.onmessage?.({ data: workerResponse }), 0);
  }
  terminate(): void {}
}

const run = () =>
  analyzeNaiveBayes({ configData: mergeWithDefaults(null), dataVariables: [], variables: [] });

const lastCall = () => mockResult.mock.calls[mockResult.mock.calls.length - 1][0];
const caseSummaryRows = (): Table["rows"] =>
  lastCall().formattedResult.tables.find((t) => t.key === "case_processing_summary")!.rows;
const noteValues = () =>
  caseSummaryRows()
    .filter((row) => row.rowHeader[0] === "Note")
    .map((row) => row.value);

beforeEach(() => {
  mockResult.mockClear();
  workerResponse = null;
  (globalThis as unknown as { Worker: unknown }).Worker = FakeWorker;
});

describe("B9: getNaiveBayesEngineWarnings (format get_all_errors Rust)", () => {
  it("mengambil setiap pesan bernomor dari ringkasan", () => {
    expect(getNaiveBayesEngineWarnings(summaryOf("validation.kfold", FOLD_WARNING))).toEqual([FOLD_WARNING]);
  });

  it("'No errors occurred.', undefined, dan non-string -> daftar kosong", () => {
    expect(getNaiveBayesEngineWarnings("No errors occurred.")).toEqual([]);
    expect(getNaiveBayesEngineWarnings(undefined)).toEqual([]);
    expect(getNaiveBayesEngineWarnings({ errors: [] })).toEqual([]);
  });
});

describe("B9: analyzeNaiveBayes meneruskan peringatan mesin (BB-37)", () => {
  it("(a) respons sukses dengan warning -> catatan tampil dan hasil tetap ditulis", async () => {
    workerResponse = { success: true, data: stub, errors: summaryOf("validation.kfold", FOLD_WARNING) };

    await expect(run()).resolves.toBe(stub);

    expect(mockResult).toHaveBeenCalledTimes(1);
    expect(lastCall().rawResult).toBe(stub);
    expect(lastCall().engineWarnings).toEqual([FOLD_WARNING]);
    expect(noteValues()).toEqual([FOLD_WARNING]);
    // Tabel lain tetap dibangun.
    const keys = lastCall().formattedResult.tables.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(["evaluation_metrics", "confusion_matrix"]));
  });

  it("(c) respons normal tanpa warning -> tidak ada catatan, tabel identik dengan respons tanpa field errors", async () => {
    workerResponse = { success: true, data: stub, errors: "No errors occurred." };
    await run();
    const withSummary = lastCall();
    expect(withSummary.engineWarnings).toEqual([]);
    expect(noteValues()).toEqual([]);

    workerResponse = { success: true, data: stub };
    await run();
    expect(lastCall().formattedResult).toEqual(withSummary.formattedResult);
  });
});

describe("B9: galat mesin sampai ke pengguna lewat getUserFriendlyNaiveBayesError (BB-38)", () => {
  it("(b) galat berkode -> pesan berkode dari naive-bayes-error-messages.ts", async () => {
    workerResponse = {
      success: false,
      error: summaryOf(
        "text_features",
        "NB_E_TEXT_NEGATIVE: Text vector column 'w_a' contains negative values (1 column(s) affected). Text likelihoods require values >= 0."
      ),
    };
    const error = await run().catch((e: unknown) => e);
    expect(mockResult).not.toHaveBeenCalled();
    expect(getUserFriendlyNaiveBayesError(error)).toBe(
      "Text vector column 'w_a' contains negative values. Text likelihoods require values >= 0; remove it from Word-Vector Variables. (NB_E_TEXT_NEGATIVE)"
    );
  });

  it("galat fold tanpa kode (folds > jumlah kasus) -> pesan pengaturan cross-validation, analisis tidak ditulis", async () => {
    workerResponse = { success: false, error: summaryOf("validation.kfold", FOLD_ERROR) };
    const error = await run().catch((e: unknown) => e);
    expect(mockResult).not.toHaveBeenCalled();
    expect(getUserFriendlyNaiveBayesError(error)).toBe(
      "Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class."
    );
  });
});
