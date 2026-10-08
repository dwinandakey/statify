/**
 * Evaluasi skripsi — Track C2 (black-box menu Naive Bayes), lapisan keluaran (Output Viewer).
 *
 * Skenario: BB-25 (tabel keluaran), BB-26 (Download CSV & Copy), BB-27 (catatan kebocoran pada
 * keluaran), BB-28 (Export Model, sisi TS), BB-20 (catatan Gaussian min-std pada tabel atribut).
 *
 * Rantai yang diuji meniru Output Viewer: hasil mentah Rust -> `transformNaiveBayesResult` ->
 * `resultNaiveBayes` (mengisi store) -> komponen khusus ("Text Feature Table", "Export Model")
 * yang menerima `output_data` string persis seperti dari store. Hasil mentah v1 memakai fixture
 * stub proyek; hasil mentah v2 dibangun dari berkas ekspor model yang ada di fixture Apply Model.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { toast } from "sonner";
import {
    transformNaiveBayesResult,
    type NaiveBayesRawResult,
} from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-formatter";
import { resultNaiveBayes } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-output";
import { mergeWithDefaults } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import { TextFeatureTableOutput } from "@/components/Modals/Analyze/Classify/naive-bayes/components/text-feature-table-output";
import { ExportModelOutput } from "@/components/Modals/Analyze/Classify/naive-bayes/components/export-model-output";
import { WARNING_LEAKAGE } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesTextRules";

const mockAddStatistic = jest.fn();
jest.mock("@/stores/useResultStore", () => ({
    useResultStore: {
        getState: () => ({
            addLog: jest.fn().mockResolvedValue(1),
            addAnalytic: jest.fn().mockResolvedValue(2),
            addStatistic: (...args: unknown[]) => mockAddStatistic(...args),
        }),
    },
}));
jest.mock("sonner", () => ({
    toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// ---------------------------------------------------------------------------------------------
// Fixture (dibaca lewat fs)
// ---------------------------------------------------------------------------------------------
const NB_ROOT = join(__dirname, "..", "..");
const stub = JSON.parse(
    readFileSync(join(NB_ROOT, "services", "__fixtures__", "naive-bayes-stub-result.json"), "utf8")
) as NaiveBayesRawResult;
const AM_FIXTURES = join(NB_ROOT, "..", "apply-model", "services", "__fixtures__");
const rawExport = JSON.parse(readFileSync(join(AM_FIXTURES, "nb-model-v2_0-raw.json"), "utf8")) as Record<string, unknown>;
const vectorExport = JSON.parse(readFileSync(join(AM_FIXTURES, "nb-model-v2_0-vector.json"), "utf8")) as Record<string, unknown>;

type Stat = { title: string; description: string; components: string; output_data: string };
type TableJson = { tables: Array<{ key: string; title: string; columnHeaders: Array<{ header: string }>; rows: Array<Record<string, unknown>>; note?: string }> };

const runResult = async (raw: NaiveBayesRawResult, patch: Parameters<typeof mergeWithDefaults>[0] = null): Promise<Stat[]> => {
    mockAddStatistic.mockReset();
    const configData = mergeWithDefaults(patch);
    const formattedResult = transformNaiveBayesResult(raw, configData.output);
    await resultNaiveBayes({ formattedResult, rawResult: raw, configData });
    return mockAddStatistic.mock.calls.map((c) => c[1] as Stat);
};

const readBlob = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });

// Unduhan: jsdom belum mengimplementasikan createObjectURL / navigasi anchor.
let downloadedFiles: string[] = [];
let createdBlobs: Blob[] = [];
beforeEach(() => {
    jest.clearAllMocks();
    downloadedFiles = [];
    createdBlobs = [];
    Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: jest.fn((blob: Blob) => {
            createdBlobs.push(blob);
            return "blob:text_analytics_eval";
        }),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: jest.fn() });
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFiles.push(this.download);
    });
});
afterEach(() => {
    jest.restoreAllMocks();
});

// =============================================================================================
// BB-25 — Output setelah pelatihan
// =============================================================================================
describe("BB-25 Output setelah pelatihan", () => {
    it("BB-25: statistic yang dipasang: Case Processing Summary, Attribute Distribution, Model Evaluation Metrics, Cohen's Kappa, Confusion Matrix, Export Model (urutan)", async () => {
        const stats = await runResult(stub);
        expect(stats.map((s) => s.title)).toEqual([
            "Case Processing Summary",
            "Attribute Distribution Table",
            "Model Evaluation Metrics",
            "Cohen's Kappa",
            "Confusion Matrix",
            "Export Model",
        ]);
    });

    it("BB-25: Case Processing Summary memuat total/valid/dibuang, target, atribut, skenario validasi", async () => {
        const stats = await runResult(stub);
        const table = (JSON.parse(stats[0].output_data) as TableJson).tables[0];
        const byHeader = Object.fromEntries(
            table.rows.map((r) => [String((r.rowHeader as string[])[0]), r.value])
        );
        expect(byHeader["Total Instances"]).toBe(150);
        expect(byHeader["Valid Instances"]).toBe(148);
        expect(byHeader["Excluded (Target Missing)"]).toBe(2);
        expect(byHeader["Target Variable"]).toBe("Species");
        expect(byHeader["Attribute Variables"]).toBe("SoilType, PetalLength, PetalWidth");
        expect(byHeader["Validation Scenario"]).toBe("Training/Holdout split (70% / 30%), seed 12345");
    });

    it("BB-25: Model Evaluation Metrics memuat per kelas, macro/weighted/micro, overall accuracy; Kappa satu angka", async () => {
        const stats = await runResult(stub);
        const metrics = (JSON.parse(stats[2].output_data) as TableJson).tables[0];
        expect(metrics.columnHeaders.map((h) => h.header)).toEqual(["", "Accuracy", "Precision", "Recall", "F1-Score"]);
        const rowNames = metrics.rows.map((r) => (r.rowHeader as string[])[0]);
        expect(rowNames).toEqual([
            "setosa",
            "versicolor",
            "virginica",
            "Macro Average",
            "Weighted Average",
            "Micro Average",
            "Overall Accuracy",
        ]);
        const kappa = (JSON.parse(stats[3].output_data) as TableJson).tables[0];
        expect(kappa.rows).toHaveLength(1);
        expect((kappa.rows[0].rowHeader as string[])[0]).toBe("Cohen's Kappa (overall)");
    });

    it("BB-25: Confusion Matrix: baris=actual, kolom=predicted, baris/kolom Total, grand total, persentase", async () => {
        const stats = await runResult(stub);
        const cm = (JSON.parse(stats[4].output_data) as TableJson).tables[0];
        expect(cm.columnHeaders.map((h) => h.header)).toEqual([
            "Actual \\ Predicted",
            "setosa",
            "versicolor",
            "virginica",
            "Total",
        ]);
        // matriks fixture [[16,0,0],[0,14,1],[0,1,13]]
        expect(cm.rows[0]).toMatchObject({ setosa: "16 (100%)", versicolor: "0 (0%)", total: 16 });
        expect(cm.rows[1]).toMatchObject({ versicolor: "14 (93.3%)", virginica: "1 (6.7%)", total: 15 });
        const totalRow = cm.rows[cm.rows.length - 1];
        expect((totalRow.rowHeader as string[])[0]).toBe("Total");
        expect(totalRow.total).toBe(45);
    });

    it("BB-25: tabel yang tidak dicentang tidak dipasang", async () => {
        const stats = await runResult(stub, {
            output: { CaseProcessingSummary: false, AttributeDistributionTable: false, ModelEvaluationMetrics: true, ConfusionMatrix: false },
        });
        expect(stats.map((s) => s.title)).toEqual(["Model Evaluation Metrics", "Cohen's Kappa", "Export Model"]);
    });

    it("BB-25: statistic 'Export Model' selalu dipasang bila model berhasil dilatih (tidak tergantung centang Output)", async () => {
        const stats = await runResult(stub, {
            output: { CaseProcessingSummary: false, AttributeDistributionTable: false, ModelEvaluationMetrics: false, ConfusionMatrix: false },
        });
        expect(stats.map((s) => s.title)).toEqual(["Export Model"]);
    });
});

// =============================================================================================
// BB-20 — catatan Gaussian (Weka min. std) pada Attribute Distribution Table
// =============================================================================================
describe("BB-20 Attribute Distribution Table untuk Gaussian min-std (sisi TS)", () => {
    it("BB-20: atribut numerik dengan likelihood_note menambah keterangan pada tabel", async () => {
        const raw = JSON.parse(JSON.stringify(stub)) as NaiveBayesRawResult & {
            attribute_distribution: Array<Record<string, unknown>>;
        };
        const numerical = raw.attribute_distribution.find((a) => a.role === "numerical");
        expect(numerical).toBeDefined();
        (numerical as Record<string, unknown>).likelihood = "gaussian_minstd";
        (numerical as Record<string, unknown>).likelihood_note =
            "Gaussian with a minimum standard deviation floor (Weka-style); minimum variance = 0.111";
        const stats = await runResult(raw as NaiveBayesRawResult);
        const table = (JSON.parse(stats[1].output_data) as TableJson).tables[0];
        expect(table.note).toContain("Numerical likelihood:");
        expect(table.note).toContain("minimum standard deviation floor (Weka-style)");
        // Baris Mean/Std. Dev. tetap ada untuk atribut numerik.
        const labels = table.rows.map((r) => (r.rowHeader as string[]).join("|"));
        expect(labels.some((l) => l.endsWith("|Mean"))).toBe(true);
        expect(labels.some((l) => l.endsWith("|Std. Dev."))).toBe(true);
    });

    it("BB-20: tanpa likelihood_note (Gaussian biasa) catatan dasar tidak berubah", async () => {
        const stats = await runResult(stub);
        const table = (JSON.parse(stats[1].output_data) as TableJson).tables[0];
        expect(table.note).not.toContain("Numerical likelihood:");
    });
});

// =============================================================================================
// BB-26 — Download CSV dan Copy Text Feature Table
// =============================================================================================
const TEXT_TABLE = {
    likelihood: "multinomial" as const,
    classes: ["neg", "pos"],
    k: 1,
    top: {
        neg: [{ term: "tidak", score: 0.98083, log_weight: -1.504077, count: 1 }],
        pos: [{ term: "makan", score: 1.321756, log_weight: -0.875469, count: 4 }],
    },
    full: [
        { term: "tidak", class: "neg", count: 1, log_weight: -1.504077, probability: 0.222222, score: 0.98083 },
        { term: "makan", class: "pos", count: 4, log_weight: -0.875469, probability: 0.416667, score: 1.321756 },
        { term: "kata, koma", class: "pos", count: 2, log_weight: -1.7, probability: 0.1, score: 0.5 },
    ],
};

describe("BB-26 Download CSV dan Copy Text Feature Table", () => {
    const statisticOutput = async (): Promise<string> => {
        const stats = await runResult({ ...stub, text_feature_table: TEXT_TABLE }, { main: { RawTextVar: "Teks" } });
        const stat = stats.find((s) => s.title === "Text Feature Table");
        expect(stat).toBeDefined();
        return (stat as Stat).output_data;
    };

    it("BB-26: Download CSV mengunduh 'Naive_Bayes_Text_Features.csv' (BOM UTF-8, CRLF, kolom terkunci)", async () => {
        render(<TextFeatureTableOutput data={await statisticOutput()} />);
        fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
        expect(downloadedFiles).toEqual(["Naive_Bayes_Text_Features.csv"]);
        expect(createdBlobs).toHaveLength(1);
        const content = await readBlob(createdBlobs[0]);
        // FileReader.readAsText membuang BOM; periksa isi tabel dan tanda CRLF.
        const lines = content.replace(/^﻿/, "").split("\r\n");
        expect(lines[0]).toBe("term,class,count,log_weight,probability,score");
        expect(lines).toHaveLength(4);
        // BOM UTF-8 (3 byte) ikut dalam berkas yang diunduh: ukuran Blob = byte isi + 3.
        expect(createdBlobs[0].size).toBe(Buffer.byteLength(content, "utf8") + 3);
        expect(lines[1]).toBe("tidak,neg,1,-1.504077,0.222222,0.98083");
        // Sel berkoma dibungkus kutip (RFC 4180).
        expect(lines[3]).toBe('"kata, koma",pos,2,-1.7,0.1,0.5');
    });

    it("BB-26: Copy (TSV) menulis tabel lengkap bertab ke clipboard dan menampilkan toast sukses", async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
        render(<TextFeatureTableOutput data={await statisticOutput()} />);
        fireEvent.click(screen.getByRole("button", { name: "Copy (TSV)" }));
        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
        const tsv = writeText.mock.calls[0][0] as string;
        const lines = tsv.split("\n");
        expect(lines[0]).toBe("term\tclass\tcount\tlog_weight\tprobability\tscore");
        expect(lines).toHaveLength(4);
        expect(lines[2]).toBe("makan\tpos\t4\t-0.875469\t0.416667\t1.321756");
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Table copied as tab-separated text."));
    });

    it("BB-26: tabel tampil per kelas (peringkat, term, score) di komponen", async () => {
        render(<TextFeatureTableOutput data={await statisticOutput()} />);
        expect(screen.getByTestId("text-feature-class-neg")).toHaveTextContent("tidak");
        expect(screen.getByTestId("text-feature-class-pos")).toHaveTextContent("makan");
        expect(screen.getByTestId("text-feature-class-pos")).toHaveTextContent("1.3218");
    });

    it("BB-26: gagal menyalin -> toast galat yang mengarahkan ke Download CSV", async () => {
        const writeText = jest.fn().mockRejectedValue(new Error("ditolak"));
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
        render(<TextFeatureTableOutput data={await statisticOutput()} />);
        fireEvent.click(screen.getByRole("button", { name: "Copy (TSV)" }));
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith("The table could not be copied. Use Download CSV instead.")
        );
    });
});

// =============================================================================================
// BB-27 — catatan kebocoran pada keluaran jalur Word-Vector
// =============================================================================================
describe("BB-27 Peringatan kebocoran pada keluaran", () => {
    it("BB-27: Case Processing Summary jalur vector memuat baris Note kebocoran; jalur raw tidak", async () => {
        const vectorRaw = {
            ...stub,
            case_processing_summary: {
                ...stub.case_processing_summary,
                text_features: {
                    source: "vector" as const,
                    description: "Word vectors: 4 columns",
                    variable: null,
                    n_terms: 4,
                    likelihood: "multinomial" as const,
                    alpha: 1,
                    uses_class_prior: true,
                    leakage_note: "ditimpa sumber kanonik TS",
                    class_prior_note: null,
                },
            },
        } as NaiveBayesRawResult;
        const stats = await runResult(vectorRaw);
        const table = (JSON.parse(stats[0].output_data) as TableJson).tables[0];
        const notes = table.rows.filter((r) => (r.rowHeader as string[])[0] === "Note").map((r) => r.value);
        expect(notes).toEqual([WARNING_LEAKAGE]);
        expect(WARNING_LEAKAGE).toBe(
            "The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic."
        );

        const rawPath = {
            ...vectorRaw,
            case_processing_summary: {
                ...vectorRaw.case_processing_summary,
                text_features: {
                    ...(vectorRaw.case_processing_summary.text_features as NonNullable<typeof vectorRaw.case_processing_summary.text_features>),
                    source: "raw" as const,
                    description: "Raw text: 'Teks' (10 terms)",
                    variable: "Teks",
                    leakage_note: null,
                },
            },
        } as NaiveBayesRawResult;
        const rawStats = await runResult(rawPath);
        const rawTable = (JSON.parse(rawStats[0].output_data) as TableJson).tables[0];
        expect(rawTable.rows.filter((r) => (r.rowHeader as string[])[0] === "Note")).toHaveLength(0);
    });
});

// =============================================================================================
// BB-28 — Export Model (JSON schema 2.0 berisi resep), sisi TS
// =============================================================================================
describe("BB-28 Export Model (sisi TS)", () => {
    const exportOutput = async (model: Record<string, unknown>, patch: Parameters<typeof mergeWithDefaults>[0]): Promise<string> => {
        const raw = { ...stub, trained_model: model } as unknown as NaiveBayesRawResult;
        const stats = await runResult(raw, patch);
        const stat = stats.find((s) => s.title === "Export Model");
        expect(stat).toBeDefined();
        expect((stat as Stat).components).toBe("Export Model");
        return (stat as Stat).output_data;
    };

    it("BB-28: unduhan 'Naive_Bayes_Model_Export.json' berisi model schema 2.0 jalur Raw Text lengkap dengan resep", async () => {
        render(<ExportModelOutput data={await exportOutput(rawExport, { main: { RawTextVar: "Text Tweet" } })} />);
        fireEvent.click(screen.getByRole("button", { name: /Export Model/i }));
        expect(downloadedFiles).toEqual(["Naive_Bayes_Model_Export.json"]);
        const downloaded = JSON.parse(await readBlob(createdBlobs[0])) as Record<string, any>;

        expect(downloaded).toEqual(rawExport); // isi file = model dari hasil analisis, tanpa perubahan
        expect(downloaded.schema_version).toBe("2.0");
        expect(downloaded.model_type).toBe("naive_bayes");
        expect(downloaded.text.source).toBe("raw");
        expect(typeof downloaded.text.raw_variable).toBe("string");
        // Resep pra-pemrosesan teks (Apply Model memakainya untuk data baru).
        expect(Object.keys(downloaded.text.recipe).sort()).toEqual(
            ["avg_doc_norm", "config", "doc_freq", "idf", "n_docs", "recipe_version", "resolved_stopwords", "vocabulary"].sort()
        );
        expect(downloaded.text.recipe.vocabulary).toEqual(downloaded.text.terms);
        expect(downloaded.text.recipe.idf).toHaveLength(downloaded.text.terms.length);
    });

    it("BB-28: nama berkas dapat diubah; '.json' ditambahkan bila belum ada", async () => {
        render(<ExportModelOutput data={await exportOutput(rawExport, { main: { RawTextVar: "Text Tweet" } })} />);
        fireEvent.change(screen.getByLabelText(/file name/i), { target: { value: "model_pilkada" } });
        fireEvent.click(screen.getByRole("button", { name: /Export Model/i }));
        expect(downloadedFiles).toEqual(["model_pilkada.json"]);
    });

    it("BB-28: jalur Word-Vector tetap schema 2.0 tetapi TANPA resep (recipe null/tidak ada)", async () => {
        render(<ExportModelOutput data={await exportOutput(vectorExport, { main: { TextVectorVars: ["VEC_makan"] } })} />);
        fireEvent.click(screen.getByRole("button", { name: /Export Model/i }));
        const downloaded = JSON.parse(await readBlob(createdBlobs[0])) as Record<string, any>;
        expect(downloaded.schema_version).toBe("2.0");
        expect(downloaded.text.source).toBe("vector");
        expect(downloaded.text.recipe ?? null).toBeNull();
        expect(Array.isArray(downloaded.text.columns)).toBe(true);
    });

    it("BB-28: model rusak/kosong -> tombol Export Model nonaktif; data bukan JSON -> pesan galat", () => {
        const { unmount } = render(<ExportModelOutput data={{ naiveBayesTrainedModel: null }} />);
        expect(screen.getByRole("button", { name: /Export Model/i })).toBeDisabled();
        unmount();
        render(<ExportModelOutput data={"{bukan json"} />);
        expect(screen.getByText(/cannot be loaded for export because its data is not valid/i)).toBeInTheDocument();
    });
});
