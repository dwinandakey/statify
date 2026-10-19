import { INDONESIAN_STOPWORDS, ENGLISH_STOPWORDS } from "./constants/stopwords";
import type { StemmingMethod, StopwordsMethod, TokenizerType, VectorizerConfigPayload } from "./types";
import {
    IDF_OPTIONS,
    NORM_OPTIONS,
    TF_OPTIONS,
    engineFormulaMode,
    isOptionAllowed,
    type IdfMethod,
    type Normalization,
    type TfMethod,
} from "./constants/vectorization-options";

export type { IdfMethod, Normalization, TfMethod };

/** State konfigurasi STWV di UI (bentuk bersarang, dipakai OptionsTab). */
export interface StwvConfig {
    lowercase: boolean;
    stopwords: {
        method: StopwordsMethod;
        customList: string;
    };
    stemming: {
        method: StemmingMethod;
    };
    tokenizer: {
        type: TokenizerType;
        minSize: number;
        maxSize: number;
    };
    delimiters: string;
    /** TF, IDF, dan normalisasi dipilih bebas (tanpa standar rumus). */
    vectorization: {
        tfMethod: TfMethod;
        idfMethod: IdfMethod;
        normalization: Normalization;
    };
    /** 0 = simpan semua kata (D7). */
    wordsToKeep: number;
    /** Kata dengan total kemunculan < nilai ini dibuang (D8), minimal 1. */
    minTermFreq: number;
}

/** Payload ke Rust sesuai kontrak PLAN_FIX §3.1 (snake_case, nilai enum baru bukan alias lama). */
export type StwvRustPayload = VectorizerConfigPayload;

/** Nilai default config (D6): Word count / IDF None / Norm None. */
export const STWV_DEFAULT_CONFIG: StwvConfig = {
    lowercase: true,
    stopwords: {
        method: "none",
        customList: "ada\nadalah\nadanya\nadapun\nagak\nagaknya\nagar\nakan\nakankah\nakhir\nakhiri",
    },
    stemming: {
        method: "none",
    },
    tokenizer: {
        type: "word",
        minSize: 1,
        maxSize: 2,
    },
    delimiters: "[\\s.,;:'\"()?!]+",
    vectorization: {
        tfMethod: "raw",
        idfMethod: "none",
        normalization: "none",
    },
    wordsToKeep: 1000,
    minTermFreq: 1,
};

/**
 * Jumlah desimal kolom vektor di dataset: 0 hanya bila nilainya pasti bilangan bulat
 * (TF binary/raw, tanpa IDF, tanpa normalisasi); selain itu 4.
 */
export function getVectorDecimals(config: StwvConfig): 0 | 4 {
    const { tfMethod, idfMethod, normalization } = config.vectorization;
    const isIntegerTf = tfMethod === "binary" || tfMethod === "raw";
    return isIntegerTf && idfMethod === "none" && normalization === "none" ? 0 : 4;
}

/**
 * Validasi config sebelum Run. Mengembalikan daftar pesan (Bahasa Inggris, PLAN_V3 §2);
 * array kosong = config sah.
 */
export function validateStwvConfig(config: StwvConfig): string[] {
    const errors: string[] = [];

    if (config.tokenizer.type === "ngram") {
        const { minSize, maxSize } = config.tokenizer;
        const isValidSize = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
        if (!isValidSize(minSize) || !isValidSize(maxSize)) {
            errors.push("N-gram min and max sizes must be whole numbers between 1 and 5.");
        } else if (minSize > maxSize) {
            errors.push("N-gram min size cannot be greater than max size.");
        }
    }

    if (!Number.isInteger(config.wordsToKeep) || config.wordsToKeep < 0) {
        errors.push("Words to Keep must be a whole number of 0 or more (0 keeps all words).");
    }

    if (!Number.isInteger(config.minTermFreq) || config.minTermFreq < 1) {
        errors.push("Min term frequency must be a whole number of 1 or more.");
    }

    if (config.delimiters.length === 0) {
        errors.push("Delimiters cannot be empty.");
    }

    const v = config.vectorization;
    if (
        !isOptionAllowed(TF_OPTIONS, v.tfMethod) ||
        !isOptionAllowed(IDF_OPTIONS, v.idfMethod) ||
        !isOptionAllowed(NORM_OPTIONS, v.normalization)
    ) {
        errors.push("Choose a valid Term Frequency, Inverse Document Frequency, and Normalization option.");
    }

    return errors;
}

/** Membentuk daftar stopwords final sebagai JSON array string, atau null bila method "none". */
function buildCustomStopwords(config: StwvConfig): string | null {
    switch (config.stopwords.method) {
        case "indonesian":
            return JSON.stringify(INDONESIAN_STOPWORDS);
        case "english":
            return JSON.stringify(ENGLISH_STOPWORDS);
        case "custom":
            return JSON.stringify(
                config.stopwords.customList
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
            );
        default:
            return null;
    }
}

/** Konversi config UI → payload kontrak §3.1 untuk Rust. */
export function toRustConfig(config: StwvConfig): StwvRustPayload {
    const isNgram = config.tokenizer.type === "ngram";
    return {
        lowercase: config.lowercase,
        stemming_method: config.stemming.method,
        stopwords_method: config.stopwords.method,
        custom_stopwords: buildCustomStopwords(config),
        // Regex dari UI dikirim apa adanya
        delimiters: config.delimiters,
        // Mode "word" (bukan n-gram): paksa min = max = 1
        ngram_min: isNgram ? config.tokenizer.minSize : 1,
        ngram_max: isNgram ? config.tokenizer.maxSize : 1,
        // Field internal mesin, diturunkan dari kombinasi pilihan (tidak dipilih pengguna)
        formula_standard: engineFormulaMode(config.vectorization),
        tf_method: config.vectorization.tfMethod,
        idf_method: config.vectorization.idfMethod,
        normalization: config.vectorization.normalization,
        // 0 = simpan semua kata (D7); tidak lagi dipaksa menjadi 1000
        words_to_keep: config.wordsToKeep,
        min_term_freq: config.minTermFreq,
    };
}
