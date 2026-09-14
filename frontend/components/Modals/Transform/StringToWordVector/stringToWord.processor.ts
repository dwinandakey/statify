/**
 * Web Worker: String to Word Vector
 * 
 * Menerima pesan dari UI dengan format:
 * { data: string[], config: VectorizerConfigPayload }
 * 
 * Mengirim balik ke UI:
 * - Sukses : { status: 'success', payload: VectorizerOutput }
 * - Error  : { status: 'error',   payload: { code: string, message: string } }
 */

import init, { process_text_data } from './wasm-output/statify_string_to_word.js';

// Flag agar init() hanya dipanggil sekali selama lifetime Worker
let wasmReady = false;

const initWasm = async (): Promise<void> => {
    if (!wasmReady) {
        await init();
        wasmReady = true;
    }
};

self.onmessage = async (event: MessageEvent) => {
    const { data, config } = event.data as {
        data: string[];
        config: VectorizerConfigPayload;
    };

    try {
        await initWasm();

        // Kirim ke Rust. Jika error, Rust melempar JsValue berisi { code, message }
        const result = process_text_data(data, config);

        self.postMessage({ status: 'success', payload: result });
    } catch (error: unknown) {
        // error adalah AppError JSON dari Rust
        self.postMessage({ status: 'error', payload: error });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// Type definitions (mirroring Rust VectorizerConfig)
// ──────────────────────────────────────────────────────────────────────────────

/** Payload yang dikirim ke Rust — harus cocok dengan struct VectorizerConfig di lib.rs */
export interface VectorizerConfigPayload {
    lowercase: boolean;
    /** "none" | "indonesian" | "english" */
    stemming_method: string;
    /** "none" | "indonesian" | "english" | "custom" */
    stopwords_method: string;
    /** JSON string: "[\"kata1\",\"kata2\",...]" atau null */
    custom_stopwords: string | null;
    /** Pola regex untuk delimiter tokenizer, contoh: r"[\s.,;:!?]+" */
    delimiters: string;
    ngram_min: number;
    ngram_max: number;
    /** "binary" | "raw" | "normalized" | "log" */
    tf_method: string;
    /** "none" | "idf" | "smooth" */
    idf_method: string;
    words_to_keep: number;
}

/** Output dari Rust process_text_data */
export interface VectorizerOutput {
    vocabulary: string[];
    matrix: number[][];
    stats: {
        total_documents: number;
        vocabulary_size: number;
        method: string;
    };
}

/** Error dari Rust AppError */
export interface AppError {
    code: string;
    message: string;
}
