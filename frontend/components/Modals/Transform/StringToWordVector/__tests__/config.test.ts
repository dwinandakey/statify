import {
    STWV_DEFAULT_CONFIG,
    getVectorDecimals,
    toRustConfig,
    validateStwvConfig,
    type StwvConfig,
    type TfMethod,
} from "../config";

/** Salinan config default dengan override sebagian (tanpa mengubah default). */
const withOverrides = (patch: Partial<StwvConfig>): StwvConfig => ({ ...STWV_DEFAULT_CONFIG, ...patch });

describe("STWV_DEFAULT_CONFIG (D6)", () => {
    it("default = raw / none / none, tanpa pilihan standar rumus", () => {
        expect(STWV_DEFAULT_CONFIG).not.toHaveProperty("formulaStandard");
        expect(STWV_DEFAULT_CONFIG.vectorization).toEqual({
            tfMethod: "raw",
            idfMethod: "none",
            normalization: "none",
        });
    });

    it("opsi lain tetap default lama", () => {
        expect(STWV_DEFAULT_CONFIG.lowercase).toBe(true);
        expect(STWV_DEFAULT_CONFIG.stopwords.method).toBe("none");
        expect(STWV_DEFAULT_CONFIG.stemming.method).toBe("none");
        expect(STWV_DEFAULT_CONFIG.tokenizer.type).toBe("word");
        expect(STWV_DEFAULT_CONFIG.delimiters).toBe("[\\s.,;:'\"()?!]+");
        expect(STWV_DEFAULT_CONFIG.wordsToKeep).toBe(1000);
        expect(STWV_DEFAULT_CONFIG.minTermFreq).toBe(1);
    });

    it("default lolos validasi", () => {
        expect(validateStwvConfig(STWV_DEFAULT_CONFIG)).toEqual([]);
    });
});

describe("toRustConfig (kontrak §3.1)", () => {
    it("default menghasilkan nilai enum baru snake_case", () => {
        expect(toRustConfig(STWV_DEFAULT_CONFIG)).toEqual({
            lowercase: true,
            stemming_method: "none",
            stopwords_method: "none",
            custom_stopwords: null,
            delimiters: "[\\s.,;:'\"()?!]+",
            ngram_min: 1,
            ngram_max: 1,
            formula_standard: "weka",
            tf_method: "raw",
            idf_method: "none",
            normalization: "none",
            words_to_keep: 1000,
            min_term_freq: 1,
        });
    });

    it("mode mesin internal diturunkan dari kombinasi pilihan (bukan dipilih pengguna)", () => {
        const mode = (tfMethod: TfMethod, idfMethod: StwvConfig["vectorization"]["idfMethod"], normalization: StwvConfig["vectorization"]["normalization"]) =>
            toRustConfig(withOverrides({ vectorization: { tfMethod, idfMethod, normalization } })).formula_standard;
        expect(mode("raw", "none", "none")).toBe("weka");
        expect(mode("log1p", "standard", "doc_length")).toBe("weka");
        expect(mode("raw", "smooth", "l2")).toBe("sklearn");
        expect(mode("sublinear", "plus1", "l1")).toBe("sklearn");
        expect(mode("normalized", "none", "none")).toBe("custom");
        expect(mode("raw", "standard", "l2")).toBe("custom");
        expect(mode("log1p", "smooth", "doc_length")).toBe("custom");
        const p = toRustConfig(withOverrides({ vectorization: { tfMethod: "raw", idfMethod: "smooth", normalization: "l2" } }));
        expect([p.tf_method, p.idf_method, p.normalization]).toEqual(["raw", "smooth", "l2"]);
    });

    it("words_to_keep 0 dikirim apa adanya (0 = semua), tidak dipaksa 1000", () => {
        expect(toRustConfig(withOverrides({ wordsToKeep: 0 })).words_to_keep).toBe(0);
    });

    it("min_term_freq diteruskan", () => {
        expect(toRustConfig(withOverrides({ minTermFreq: 3 })).min_term_freq).toBe(3);
    });

    it("mode word memaksa n-gram 1..1; mode ngram memakai min/max", () => {
        const word = toRustConfig(withOverrides({ tokenizer: { type: "word", minSize: 2, maxSize: 4 } }));
        expect([word.ngram_min, word.ngram_max]).toEqual([1, 1]);
        const ngram = toRustConfig(withOverrides({ tokenizer: { type: "ngram", minSize: 1, maxSize: 3 } }));
        expect([ngram.ngram_min, ngram.ngram_max]).toEqual([1, 3]);
    });

    it("custom stopwords di-trim dan baris kosong dibuang", () => {
        const p = toRustConfig(withOverrides({ stopwords: { method: "custom", customList: " a \n\nb\n" } }));
        expect(p.custom_stopwords).toBe('["a","b"]');
    });
});

describe("validateStwvConfig", () => {
    const ngram = (minSize: number, maxSize: number): StwvConfig =>
        withOverrides({ tokenizer: { type: "ngram", minSize, maxSize } });

    it("menolak n-gram min > max", () => {
        expect(validateStwvConfig(ngram(3, 2))).toHaveLength(1);
    });

    it("menolak n-gram 6", () => {
        expect(validateStwvConfig(ngram(1, 6))).toHaveLength(1);
    });

    it("menerima n-gram 1..5", () => {
        expect(validateStwvConfig(ngram(1, 5))).toEqual([]);
        expect(validateStwvConfig(ngram(2, 2))).toEqual([]);
    });

    it("mode word tidak memvalidasi ukuran n-gram (nilainya tidak dipakai)", () => {
        expect(validateStwvConfig(withOverrides({ tokenizer: { type: "word", minSize: 3, maxSize: 2 } }))).toEqual([]);
    });

    it("menolak wordsToKeep negatif atau non-bulat; menerima 0", () => {
        expect(validateStwvConfig(withOverrides({ wordsToKeep: -1 }))).toHaveLength(1);
        expect(validateStwvConfig(withOverrides({ wordsToKeep: 1.5 }))).toHaveLength(1);
        expect(validateStwvConfig(withOverrides({ wordsToKeep: 0 }))).toEqual([]);
    });

    it("menolak minTermFreq 0, negatif, atau non-bulat", () => {
        expect(validateStwvConfig(withOverrides({ minTermFreq: 0 }))).toHaveLength(1);
        expect(validateStwvConfig(withOverrides({ minTermFreq: -2 }))).toHaveLength(1);
        expect(validateStwvConfig(withOverrides({ minTermFreq: 2.5 }))).toHaveLength(1);
        expect(validateStwvConfig(withOverrides({ minTermFreq: 2 }))).toEqual([]);
    });

    it("menolak delimiter kosong", () => {
        expect(validateStwvConfig(withOverrides({ delimiters: "" }))).toHaveLength(1);
    });

    it("semua 5 × 4 × 4 kombinasi TF / IDF / normalisasi sah", () => {
        const tfs: TfMethod[] = ["binary", "raw", "log1p", "sublinear", "normalized"];
        const idfs: StwvConfig["vectorization"]["idfMethod"][] = ["none", "standard", "smooth", "plus1"];
        const norms: StwvConfig["vectorization"]["normalization"][] = ["none", "l2", "l1", "doc_length"];
        for (const tfMethod of tfs)
            for (const idfMethod of idfs)
                for (const normalization of norms)
                    expect(validateStwvConfig(withOverrides({ vectorization: { tfMethod, idfMethod, normalization } }))).toEqual([]);
    });

    it("menolak TF 'none' sisa v1 dan nilai yang tidak dikenal", () => {
        const v = STWV_DEFAULT_CONFIG.vectorization;
        expect(validateStwvConfig(withOverrides({ vectorization: { ...v, tfMethod: "none" as unknown as TfMethod } }))).toHaveLength(1);
        expect(
            validateStwvConfig(
                withOverrides({ vectorization: { ...v, idfMethod: "idf" as unknown as StwvConfig["vectorization"]["idfMethod"] } })
            )
        ).toHaveLength(1);
    });

    it("mengumpulkan beberapa pesan sekaligus", () => {
        expect(validateStwvConfig(withOverrides({ wordsToKeep: -1, minTermFreq: 0 }))).toHaveLength(2);
    });
});

describe("getVectorDecimals", () => {
    const vec = (tfMethod: TfMethod, idfMethod: StwvConfig["vectorization"]["idfMethod"], normalization: StwvConfig["vectorization"]["normalization"]): StwvConfig =>
        withOverrides({ vectorization: { tfMethod, idfMethod, normalization } });

    it("default (raw/none/none) → 0 desimal; binary/none/none → 0", () => {
        expect(getVectorDecimals(STWV_DEFAULT_CONFIG)).toBe(0);
        expect(getVectorDecimals(vec("binary", "none", "none"))).toBe(0);
    });

    it("IDF aktif, normalisasi aktif, atau TF non-bulat → 4 desimal", () => {
        expect(getVectorDecimals(vec("raw", "standard", "none"))).toBe(4);
        expect(getVectorDecimals(vec("raw", "none", "l2"))).toBe(4);
        expect(getVectorDecimals(vec("raw", "none", "doc_length"))).toBe(4);
        expect(getVectorDecimals(vec("log1p", "none", "none"))).toBe(4);
    });
});
