// Tes tesis Track A (c), sisi TypeScript STWV: daftar stopword bawaan Indonesia/Inggris, kustom, dan rentang n-gram 1-5
// pada payload ke Rust.
//
// Tes Rust `statify-text-core/tests/eval_text_pipeline.rs` memakai SALINAN daftar ini
// (`tests/eval_data/stopwords_{id,en}.json`, dibuat oleh testing/text_analytics_eval/unit/reference_values.py).
// Tes di sini menjaga agar salinan itu tetap identik dengan konstanta TypeScript yang sungguh dikirim aplikasi.
//
// Sudah tercakup oleh __tests__/config.test.ts (tidak diulang): default config, preset sklearn, words_to_keep 0,
// min_term_freq, "mode word memaksa n-gram 1..1; mode ngram memakai min/max", "custom stopwords di-trim dan baris kosong
// dibuang", validasi n-gram min > max dan ukuran 6, serta n-gram 1..5 diterima (satu contoh).

import * as fs from "fs";
import * as path from "path";

import {
    INDONESIAN_STOPWORDS,
    ENGLISH_STOPWORDS,
} from "@/components/Modals/Transform/StringToWordVector/constants/stopwords";
import {
    STWV_DEFAULT_CONFIG,
    toRustConfig,
    validateStwvConfig,
    type StwvConfig,
} from "@/components/Modals/Transform/StringToWordVector/config";

const DATA_DIR = path.resolve(
    __dirname,
    "../../../../../../public/workers/TextAnalytics/statify-text-core/tests/eval_data"
);
const readJson = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));

const cfg = (patch: Partial<StwvConfig>): StwvConfig => ({
    ...JSON.parse(JSON.stringify(STWV_DEFAULT_CONFIG)),
    ...patch,
});

describe("eval A(c): daftar stopword bawaan", () => {
    it("Indonesia: 758 entri, string tak kosong, tanpa spasi tepi, huruf kecil, tanpa duplikat", () => {
        expect(INDONESIAN_STOPWORDS).toHaveLength(758);
        expect(new Set(INDONESIAN_STOPWORDS).size).toBe(758);
        for (const w of INDONESIAN_STOPWORDS) {
            expect(typeof w).toBe("string");
            expect(w.length).toBeGreaterThan(0);
            expect(w).toBe(w.trim());
            expect(w).toBe(w.toLowerCase());
        }
    });

    it("Inggris: 1298 entri, string tak kosong, tanpa spasi tepi, huruf kecil, tanpa duplikat", () => {
        expect(ENGLISH_STOPWORDS).toHaveLength(1298);
        expect(new Set(ENGLISH_STOPWORDS).size).toBe(1298);
        for (const w of ENGLISH_STOPWORDS) {
            expect(typeof w).toBe("string");
            expect(w.length).toBeGreaterThan(0);
            expect(w).toBe(w.trim());
            expect(w).toBe(w.toLowerCase());
        }
    });

    it("memuat kata fungsi umum dan (sesuai keputusan pemilik) kata negasi Indonesia", () => {
        for (const w of ["yang", "dan", "di", "ke", "dari", "saya", "tidak", "adalah", "akan"]) {
            expect(INDONESIAN_STOPWORDS).toContain(w);
        }
        for (const w of ["the", "and", "is", "of", "to", "not", "a"]) {
            expect(ENGLISH_STOPWORDS).toContain(w);
        }
        // Kata bermuatan isi tidak boleh ikut terbuang.
        for (const w of ["suka", "makan", "nasi", "enak", "pemerintah"]) {
            expect(INDONESIAN_STOPWORDS).not.toContain(w);
        }
        for (const w of ["dog", "fox", "quick", "product"]) {
            expect(ENGLISH_STOPWORDS).not.toContain(w);
        }
    });

    it("salinan data tes Rust identik dengan konstanta TypeScript (penjaga sinkronisasi)", () => {
        expect(readJson("stopwords_id.json")).toEqual(INDONESIAN_STOPWORDS);
        expect(readJson("stopwords_en.json")).toEqual(ENGLISH_STOPWORDS);
    });
});

describe("eval A(c): payload stopword ke Rust (toRustConfig)", () => {
    it("indonesian -> custom_stopwords = JSON array daftar bawaan Indonesia", () => {
        const payload = toRustConfig(cfg({ stopwords: { method: "indonesian", customList: "" } }));
        expect(payload.stopwords_method).toBe("indonesian");
        expect(JSON.parse(payload.custom_stopwords as string)).toEqual(INDONESIAN_STOPWORDS);
    });

    it("english -> custom_stopwords = JSON array daftar bawaan Inggris", () => {
        const payload = toRustConfig(cfg({ stopwords: { method: "english", customList: "" } }));
        expect(payload.stopwords_method).toBe("english");
        expect(JSON.parse(payload.custom_stopwords as string)).toEqual(ENGLISH_STOPWORDS);
    });

    it("none -> custom_stopwords null walau customList terisi", () => {
        const payload = toRustConfig(cfg({ stopwords: { method: "none", customList: "ada\nadalah" } }));
        expect(payload.stopwords_method).toBe("none");
        expect(payload.custom_stopwords).toBeNull();
    });

    it("custom -> satu kata per baris, di-trim, baris kosong/spasi dibuang, huruf asli dipertahankan", () => {
        const payload = toRustConfig(
            cfg({ stopwords: { method: "custom", customList: "  Ada \n\n   \nAdalah\r\nYANG  \n" } })
        );
        // Catatan: \r pada akhir baris ikut terpangkas oleh trim().
        expect(JSON.parse(payload.custom_stopwords as string)).toEqual(["Ada", "Adalah", "YANG"]);
    });

    it("custom dengan daftar kosong -> array kosong '[]' (bukan null)", () => {
        const payload = toRustConfig(cfg({ stopwords: { method: "custom", customList: "\n  \n" } }));
        expect(payload.custom_stopwords).toBe("[]");
    });

    it("keluaran custom_stopwords selalu JSON valid berupa array string (kontrak yang diparse Rust)", () => {
        for (const method of ["indonesian", "english", "custom"] as const) {
            const payload = toRustConfig(cfg({ stopwords: { method, customList: "a\nb" } }));
            const parsed = JSON.parse(payload.custom_stopwords as string);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.every((x: unknown) => typeof x === "string")).toBe(true);
        }
    });
});

describe("eval A(c): rentang n-gram 1-5 pada konfigurasi", () => {
    const pasangan: Array<[number, number]> = [];
    for (let lo = 1; lo <= 5; lo++) for (let hi = lo; hi <= 5; hi++) pasangan.push([lo, hi]);

    it("15 pasangan (min <= max) sah dan diteruskan ke payload sebagai ngram_min/ngram_max", () => {
        expect(pasangan).toHaveLength(15);
        for (const [lo, hi] of pasangan) {
            const c = cfg({ tokenizer: { type: "ngram", minSize: lo, maxSize: hi } });
            expect(validateStwvConfig(c)).toEqual([]);
            const payload = toRustConfig(c);
            expect(payload.ngram_min).toBe(lo);
            expect(payload.ngram_max).toBe(hi);
        }
    });

    it("pasangan min > max, nol, enam, dan non-bulat ditolak dengan pesan n-gram", () => {
        const tidakSah: Array<[number, number]> = [[2, 1], [5, 4], [0, 1], [1, 0], [1, 6], [6, 6], [1.5, 2], [1, 2.5], [-1, 2]];
        for (const [lo, hi] of tidakSah) {
            const galat = validateStwvConfig(cfg({ tokenizer: { type: "ngram", minSize: lo, maxSize: hi } }));
            expect(galat.some((m) => m.startsWith("N-gram"))).toBe(true);
        }
    });

    it("mode word selalu mengirim 1..1 walau minSize/maxSize bernilai lain", () => {
        const payload = toRustConfig(cfg({ tokenizer: { type: "word", minSize: 3, maxSize: 5 } }));
        expect(payload.ngram_min).toBe(1);
        expect(payload.ngram_max).toBe(1);
    });
});
