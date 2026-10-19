// B9 (LAPORAN_PERBAIKAN_12Okt): peringatan mesin tetap terlihat di Output Viewer walau
// Case Processing Summary (tempat baris "Note") tidak dicentang — cadangan lewat catatan analytic.
import { readFileSync } from "fs";
import { join } from "path";

import {
    transformNaiveBayesResult,
    type NaiveBayesRawResult,
} from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-formatter";
import { resultNaiveBayes } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-output";
import { mergeWithDefaults } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";

const mockAddAnalytic = jest.fn().mockResolvedValue(2);
jest.mock("@/stores/useResultStore", () => ({
    useResultStore: {
        getState: () => ({
            addLog: jest.fn().mockResolvedValue(1),
            addAnalytic: (...args: unknown[]) => mockAddAnalytic(...args),
            addStatistic: jest.fn(),
        }),
    },
}));

const stub = JSON.parse(
    readFileSync(join(__dirname, "..", "__fixtures__", "naive-bayes-stub-result.json"), "utf8")
) as NaiveBayesRawResult;

const WARNING = "Number of folds (6) exceeds the smallest class size (5). The analysis will still run.";

const analyticNote = async (caseProcessingSummary: boolean, engineWarnings?: string[]) => {
    mockAddAnalytic.mockClear();
    const configData = mergeWithDefaults(null);
    configData.output.CaseProcessingSummary = caseProcessingSummary;
    const formattedResult = transformNaiveBayesResult(stub, configData.output, engineWarnings);
    await resultNaiveBayes({ formattedResult, rawResult: stub, configData, engineWarnings });
    return (mockAddAnalytic.mock.calls[0][1] as { note: string }).note;
};

describe("B9: resultNaiveBayes dan peringatan mesin", () => {
    it("Case Processing Summary aktif: peringatan cukup di baris Note, catatan analytic kosong", async () => {
        expect(await analyticNote(true, [WARNING])).toBe("");
    });

    it("Case Processing Summary mati: peringatan tampil sebagai catatan analytic", async () => {
        expect(await analyticNote(false, [WARNING])).toBe(WARNING);
    });

    it("tanpa peringatan: catatan analytic tetap kosong (perilaku lama)", async () => {
        expect(await analyticNote(false)).toBe("");
        expect(await analyticNote(true, [])).toBe("");
    });
});
