/**
 * Tipe bersama untuk fitur String to Word Vector (STWV).
 * Ini adalah SATU-SATUNYA definisi VectorizerOutput, AppError, dan
 * VectorizerConfigPayload — hook, worker, dan util mengimpor dari sini.
 */

/** Metode stopwords yang dikenali UI & Rust. */
export type StopwordsMethod = "none" | "indonesian" | "english" | "custom";

/** Metode stemming yang dikenali UI & Rust. */
export type StemmingMethod = "none" | "indonesian" | "english";

/** Jenis tokenizer di UI. */
export type TokenizerType = "word" | "ngram";

// Tipe rumus didefinisikan di constants/vectorization-options.ts (satu sumber kebenaran).
import type { EngineFormulaMode, IdfMethod, Normalization, TfMethod } from "./constants/vectorization-options";
export type { IdfMethod, Normalization, TfMethod };

/** Payload yang dikirim ke Rust — harus cocok dengan struct config di sisi Rust. */
export interface VectorizerConfigPayload {
    lowercase: boolean;
    stemming_method: StemmingMethod;
    stopwords_method: StopwordsMethod;
    /** JSON string: "[\"kata1\",\"kata2\",...]" atau null */
    custom_stopwords: string | null;
    /** Pola regex untuk delimiter tokenizer, contoh: r"[\s.,;:!?]+" */
    delimiters: string;
    ngram_min: number;
    ngram_max: number;
    /** Internal, diturunkan dari TF/IDF/normalisasi oleh toRustConfig. */
    formula_standard: EngineFormulaMode;
    tf_method: TfMethod;
    idf_method: IdfMethod;
    normalization: Normalization;
    /** 0 = simpan semua kata */
    words_to_keep: number;
    /** >= 1 */
    min_term_freq: number;
}

/** Output dari Rust process_text_data. */
export interface VectorizerOutput {
    vocabulary: string[];
    matrix: number[][];
    stats: {
        total_documents: number;
        vocabulary_size: number;
        method: string;
        /** Diisi Rust setelah S3 (belum ada pada build WASM lama). */
        empty_documents?: number;
        formula_standard?: string;
    };
}

/** Error yang selalu terisi `code` dan `message` (untuk ditampilkan di UI). */
export interface AppError {
    code: string;
    message: string;
}
