// Tes tesis Track A (item 3, celah cakupan Jest): kesepadanan opsi rumus UI <-> aturan validator Rust, dan cabang
// buildStwvOutput yang belum tersentuh tes lama (cakupan terukur: buildStwvOutput.ts cabang 54,5%).
//
// Sudah tercakup oleh __tests__/buildStwvOutput.test.ts (tidak diulang): tiga tabel, angka processing summary,
// baris waktu opsional, settings default Weka, words_to_keep 0 = "All", tabel kosakata dengan jumlah dokumen
// non-nol (2 kata), pemotongan MAX_VOCABULARY_ROWS (+5) dengan catatan, teks ringkasan dan log, serialisasi JSON.

import * as fs from "fs";
import * as path from "path";

import { buildStwvOutput, MAX_VOCABULARY_ROWS } from "@/components/Modals/Transform/StringToWordVector/utils/buildStwvOutput";
import { STWV_DEFAULT_CONFIG, type StwvConfig } from "@/components/Modals/Transform/StringToWordVector/config";
import {
    FORMULA_STANDARDS,
    isOptionAllowed,
} from "@/components/Modals/Transform/StringToWordVector/constants/formula-standards";
import type { VectorizerOutput } from "@/components/Modals/Transform/StringToWordVector/types";

const GRID = JSON.parse(
    fs.readFileSync(
        path.resolve(
            __dirname,
            "../../../../../../public/workers/TextAnalytics/statify-text-core/tests/eval_data/formula_grid.json"
        ),
        "utf8"
    )
) as {
    vocabulary: string[];
    entries: Array<{ tf: string; idf: string; norm: string; matrix: number[][]; weka_ok: boolean; sklearn_ok: boolean }>;
};

const clone = (c: StwvConfig): StwvConfig => JSON.parse(JSON.stringify(c));

describe("eval A: opsi rumus UI sama dengan tabel kombinasi sah validator Rust", () => {
    it("Weka: 3 TF x 2 IDF x 2 normalisasi; sklearn: 3 x 3 x 3; custom: semua 5 x 4 x 4", () => {
        expect(FORMULA_STANDARDS.weka.tfOptions.map((o) => o.value)).toEqual(["binary", "raw", "log1p"]);
        expect(FORMULA_STANDARDS.weka.idfOptions.map((o) => o.value)).toEqual(["none", "standard"]);
        expect(FORMULA_STANDARDS.weka.normOptions.map((o) => o.value)).toEqual(["none", "doc_length"]);
        expect(FORMULA_STANDARDS.sklearn.tfOptions.map((o) => o.value)).toEqual(["binary", "raw", "sublinear"]);
        expect(FORMULA_STANDARDS.sklearn.idfOptions.map((o) => o.value)).toEqual(["none", "smooth", "plus1"]);
        expect(FORMULA_STANDARDS.sklearn.normOptions.map((o) => o.value)).toEqual(["none", "l2", "l1"]);
        expect(FORMULA_STANDARDS.custom.tfOptions).toHaveLength(5);
        expect(FORMULA_STANDARDS.custom.idfOptions).toHaveLength(4);
        expect(FORMULA_STANDARDS.custom.normOptions).toHaveLength(4);
    });

    it("untuk ke-80 kombinasi pada grid acuan: sah-Weka/sah-sklearn menurut UI = menurut validator Rust (weka_ok/sklearn_ok)", () => {
        expect(GRID.entries).toHaveLength(80);
        for (const e of GRID.entries) {
            const wekaUi =
                isOptionAllowed(FORMULA_STANDARDS.weka.tfOptions, e.tf as never) &&
                isOptionAllowed(FORMULA_STANDARDS.weka.idfOptions, e.idf as never) &&
                isOptionAllowed(FORMULA_STANDARDS.weka.normOptions, e.norm as never);
            const sklearnUi =
                isOptionAllowed(FORMULA_STANDARDS.sklearn.tfOptions, e.tf as never) &&
                isOptionAllowed(FORMULA_STANDARDS.sklearn.idfOptions, e.idf as never) &&
                isOptionAllowed(FORMULA_STANDARDS.sklearn.normOptions, e.norm as never);
            const customUi =
                isOptionAllowed(FORMULA_STANDARDS.custom.tfOptions, e.tf as never) &&
                isOptionAllowed(FORMULA_STANDARDS.custom.idfOptions, e.idf as never) &&
                isOptionAllowed(FORMULA_STANDARDS.custom.normOptions, e.norm as never);
            expect({ kombinasi: `${e.tf}/${e.idf}/${e.norm}`, weka: wekaUi }).toEqual({
                kombinasi: `${e.tf}/${e.idf}/${e.norm}`,
                weka: e.weka_ok,
            });
            expect({ kombinasi: `${e.tf}/${e.idf}/${e.norm}`, sklearn: sklearnUi }).toEqual({
                kombinasi: `${e.tf}/${e.idf}/${e.norm}`,
                sklearn: e.sklearn_ok,
            });
            expect(customUi).toBe(true);
        }
    });

    it("rumus yang ditampilkan di tooltip sesuai definisi yang diimplementasikan Rust", () => {
        const custom = FORMULA_STANDARDS.custom;
        const f = (opts: readonly { value: string; formula: string }[], v: string) => opts.find((o) => o.value === v)?.formula;
        expect(f(custom.tfOptions, "log1p")).toBe("ln(1 + f)");
        expect(f(custom.tfOptions, "sublinear")).toBe("1 + ln(f) if f > 0, else 0");
        expect(f(custom.tfOptions, "normalized")).toBe("f / (number of tokens in document)");
        expect(f(custom.idfOptions, "standard")).toBe("ln(N / df)");
        expect(f(custom.idfOptions, "smooth")).toBe("ln((1 + N) / (1 + df)) + 1");
        expect(f(custom.idfOptions, "plus1")).toBe("ln(N / df) + 1");
    });
});

describe("eval A: buildStwvOutput pada korpus D (acuan df dari reference_values.py)", () => {
    // Matriks raw/none/none korpus D (kosakata makan, nasi, saya, suka, tidak).
    const raw = GRID.entries.find((e) => e.tf === "raw" && e.idf === "none" && e.norm === "none")!.matrix;
    const result: VectorizerOutput = {
        vocabulary: GRID.vocabulary,
        matrix: raw,
        stats: { total_documents: 3, vocabulary_size: 5, method: "x" },
    };
    const names = GRID.vocabulary.map((w) => `VEC_${w}`);
    const build = (over: Partial<Parameters<typeof buildStwvOutput>[0]> = {}) =>
        buildStwvOutput({
            variableName: "teks",
            config: STWV_DEFAULT_CONFIG,
            result,
            columnPrefix: "VEC_",
            columnNames: names,
            ...over,
        });

    it("kolom 'Documents (Non-zero)' = document frequency acuan [2, 2, 2, 2, 1] dan tidak ada vektor nol", () => {
        const vocab = build().tables.find((t) => t.key === "stwv_vocabulary")!;
        expect(vocab.rows.map((r) => r.documents)).toEqual([2, 2, 2, 2, 1]);
        expect(vocab.rows.map((r) => r.term)).toEqual(["makan", "nasi", "saya", "suka", "tidak"]);
        const summary = build().tables.find((t) => t.key === "stwv_processing_summary")!;
        expect(summary.rows.find((r) => r.rowHeader[0] === "Documents with Zero Vector")?.value).toBe(0);
        expect(summary.rows.find((r) => r.rowHeader[0] === "First – Last Column")?.value).toBe("VEC_makan – VEC_tidak");
    });

    const settingValue = (out: ReturnType<typeof build>, label: string) =>
        out.tables.find((t) => t.key === "stwv_settings")!.rows.find((r) => r.rowHeader[0] === label)?.value;

    it("label pengaturan: tiga standar rumus dan opsinya", () => {
        const sk = clone(STWV_DEFAULT_CONFIG);
        sk.formulaStandard = "sklearn";
        sk.vectorization = { tfMethod: "sublinear", idfMethod: "plus1", normalization: "l1" };
        const out = build({ config: sk });
        expect(settingValue(out, "Formula Standard")).toBe("scikit-learn");
        expect(settingValue(out, "Term Frequency (TF)")).toBe("Sublinear 1 + ln(f)");
        expect(settingValue(out, "Inverse Document Frequency (IDF)")).toBe("ln(N/df) + 1");
        expect(settingValue(out, "Normalization")).toBe("L1");

        const cu = clone(STWV_DEFAULT_CONFIG);
        cu.formulaStandard = "custom";
        cu.vectorization = { tfMethod: "normalized", idfMethod: "smooth", normalization: "doc_length" };
        const out2 = build({ config: cu });
        expect(settingValue(out2, "Formula Standard")).toBe("Custom");
        expect(settingValue(out2, "Term Frequency (TF)")).toBe("Normalized  —  f / tokens");
        expect(settingValue(out2, "Normalization")).toBe("Normalize document length (Weka)");
    });

    it("label stopword, stemming, tokenizer, huruf kecil, dan min term frequency", () => {
        const c = clone(STWV_DEFAULT_CONFIG);
        c.lowercase = false;
        c.stopwords = { method: "custom", customList: "ada\n\n  adalah \n" };
        c.stemming = { method: "indonesian" };
        c.tokenizer = { type: "ngram", minSize: 2, maxSize: 4 };
        c.minTermFreq = 3;
        const out = build({ config: c });
        expect(settingValue(out, "Convert to Lowercase")).toBe("No");
        expect(settingValue(out, "Stopwords")).toBe("Custom (2 words)");
        expect(settingValue(out, "Stemming")).toBe("Indonesian");
        expect(settingValue(out, "Tokenizer")).toBe("N-gram (min 2, max 4)");
        expect(settingValue(out, "Minimum Term Frequency")).toBe(3);

        c.stopwords = { method: "custom", customList: "ada" };
        c.stemming = { method: "english" };
        const satu = build({ config: c });
        expect(settingValue(satu, "Stopwords")).toBe("Custom (1 word)");
        expect(settingValue(satu, "Stemming")).toBe("English");

        c.stopwords = { method: "indonesian", customList: "" };
        expect(settingValue(build({ config: c }), "Stopwords")).toBe("Indonesian");
        c.stopwords = { method: "english", customList: "" };
        expect(settingValue(build({ config: c }), "Stopwords")).toBe("English");
        c.stopwords = { method: "none", customList: "" };
        c.stemming = { method: "none" };
        const none = build({ config: c });
        expect(settingValue(none, "Stopwords")).toBe("None");
        expect(settingValue(none, "Stemming")).toBe("None");
    });

    it("kosakata kosong: tabel kosakata tidak dibuat dan kolom pertama-terakhir '-'", () => {
        const kosong: VectorizerOutput = {
            vocabulary: [],
            matrix: [[], []],
            stats: { total_documents: 2, vocabulary_size: 0, method: "x" },
        };
        const out = build({ result: kosong, columnNames: [] });
        expect(out.tables.map((t) => t.key)).toEqual(["stwv_processing_summary", "stwv_settings"]);
        const summary = out.tables[0];
        expect(summary.rows.find((r) => r.rowHeader[0] === "First – Last Column")?.value).toBe("-");
        expect(out.summaryText).toContain("0 vector columns were");
    });

    it("satu kolom: kalimat tunggal; tepat MAX_VOCABULARY_ROWS istilah tidak memunculkan catatan pemotongan", () => {
        const satu = build({
            result: { vocabulary: ["a"], matrix: [[1]], stats: { total_documents: 1, vocabulary_size: 1, method: "x" } },
            columnNames: ["VEC_a"],
        });
        expect(satu.summaryText).toContain("1 vector column was");

        const n = MAX_VOCABULARY_ROWS;
        const vocabulary = Array.from({ length: n }, (_, i) => `w${i}`);
        const pas = build({
            result: { vocabulary, matrix: [vocabulary.map(() => 1)], stats: { total_documents: 1, vocabulary_size: n, method: "x" } },
            columnNames: vocabulary.map((w) => `VEC_${w}`),
        });
        const vocab = pas.tables.find((t) => t.key === "stwv_vocabulary")!;
        expect(vocab.rows).toHaveLength(n);
        expect(vocab.note).toBeUndefined();
    });

    it("dokumen kosong dihitung sebagai vektor nol dan durasi dibulatkan", () => {
        const dengan0: VectorizerOutput = {
            vocabulary: ["a"],
            matrix: [[1], [0], [0]],
            stats: { total_documents: 3, vocabulary_size: 1, method: "x" },
        };
        const out = build({ result: dengan0, columnNames: ["VEC_a"], durationMs: 12.6 });
        const summary = out.tables[0];
        expect(summary.rows.find((r) => r.rowHeader[0] === "Documents with Zero Vector")?.value).toBe(2);
        expect(summary.rows.find((r) => r.rowHeader[0] === "Processing Time (ms)")?.value).toBe(13);
    });
});
