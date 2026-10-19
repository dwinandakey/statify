import type { TourStep as BaseTourStep } from "@/types/tourTypes";
import type { HelpLanguage } from "@/stores/useHelpLanguageStore";

/**
 * Konfigurasi tur bantuan interaktif dialog String to Word Vector (STWV).
 * Pola mengikuti modul Ordinal Regression; isi tersedia dalam Bahasa Indonesia dan Inggris,
 * dipilih dari bahasa halaman Help (useHelpLanguageStore).
 */

export const STWV_TABS = {
    VARIABLES: "variables" as const,
    OPTIONS: "options" as const,
};

export type StwvTabType = (typeof STWV_TABS)[keyof typeof STWV_TABS];

export type StwvTourStep = BaseTourStep & {
    requiredTab?: StwvTabType;
    forceChangeTab?: boolean;
};

/** Id elemen target tur (dipasang di StringToWordVectorModal, VariablesTab, dan OptionsTab). */
export const STWV_TOUR_IDS = {
    variablesTab: "stwv-variables-tab-trigger",
    optionsTab: "stwv-options-tab-trigger",
    availableList: "stwv-available-variables",
    moveButton: "stwv-move-to-target-button",
    targetVariable: "stwv-target-variable",
    columnPrefix: "stwv-column-prefix-section",
    lowercase: "stwv-lowercase-section",
    stopwords: "stwv-stopwords-section",
    stemming: "stwv-stemming-section",
    tokenizer: "stwv-tokenizer-section",
    delimiters: "stwv-delimiters-section",
    tf: "stwv-tf-section",
    idf: "stwv-idf-section",
    normalization: "stwv-normalization-section",
    wordsToKeep: "stwv-words-to-keep-section",
    minTermFreq: "stwv-min-term-freq-section",
} as const;

interface StepText {
    title: string;
    id: string;
    en: string;
}

interface StepDef {
    targetId: string;
    requiredTab: StwvTabType;
    defaultPosition: "top" | "bottom";
    forceChangeTab?: boolean;
    text: StepText;
}

const STEP_DEFS: StepDef[] = [
    // ── Tab Variables ───────────────────────────────────────────────────────
    {
        targetId: STWV_TOUR_IDS.variablesTab,
        requiredTab: STWV_TABS.VARIABLES,
        defaultPosition: "bottom",
        text: {
            title: "Variables Tab",
            id: "Pilih satu variabel teks yang akan diubah menjadi kolom vektor kata. Setiap baris dataset dianggap satu dokumen.",
            en: "Choose one text variable to turn into word-vector columns. Each row of the dataset is treated as one document.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.availableList,
        requiredTab: STWV_TABS.VARIABLES,
        defaultPosition: "bottom",
        text: {
            title: "Variables",
            id: "Daftar variabel yang dapat dipakai: variabel bertipe String atau berukuran nominal. Klik satu variabel untuk menandainya (klik lagi untuk membatalkan).",
            en: "The variables you can use: variables of type String or with a nominal measure. Click a variable to highlight it (click again to clear).",
        },
    },
    {
        targetId: STWV_TOUR_IDS.moveButton,
        requiredTab: STWV_TABS.VARIABLES,
        defaultPosition: "bottom",
        text: {
            title: "Move Button",
            id: "Tekan tombol panah untuk memindahkan variabel yang ditandai ke kotak Target Variable. Tombol nonaktif bila belum ada variabel yang ditandai atau target sudah terisi.",
            en: "Press the arrow button to move the highlighted variable into the Target Variable box. It is disabled when nothing is highlighted or the target is already filled.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.targetVariable,
        requiredTab: STWV_TABS.VARIABLES,
        defaultPosition: "bottom",
        forceChangeTab: true,
        text: {
            title: "Target Variable",
            id: "Variabel teks yang akan diproses (tepat satu). Klik variabel di kotak ini untuk mengeluarkannya. Tombol OK baru aktif setelah kotak ini terisi.",
            en: "The text variable to process (exactly one). Click the variable in this box to remove it. The OK button is enabled only after this box is filled.",
        },
    },

    // ── Tab Options ─────────────────────────────────────────────────────────
    {
        targetId: STWV_TOUR_IDS.optionsTab,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "bottom",
        forceChangeTab: true,
        text: {
            title: "Options Tab",
            id: "Atur nama kolom hasil, langkah pra-pemrosesan teks (huruf kecil, stopwords, stemming, tokenisasi), rumus pembobotan (TF, IDF, normalisasi), dan jumlah kata yang disimpan.",
            en: "Set the output column name, the text preprocessing steps (lowercase, stopwords, stemming, tokenizing), the weighting formulas (TF, IDF, normalization), and how many words to keep.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.columnPrefix,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "bottom",
        text: {
            title: "Vector Column Name",
            id: "Awalan nama kolom baru. Nama kolom = awalan + kata, mis. VEC_makan. Default VEC_, maksimal 32 karakter, tanpa spasi, diawali huruf/@/#/$, dan hanya berisi huruf, angka, titik, garis bawah, @, #, $. Bila nama sudah dipakai, ditambah akhiran _1, _2, dst.",
            en: "Prefix of the new column names. Column name = prefix + term, e.g. VEC_food. Default VEC_, at most 32 characters, no spaces, must start with a letter/@/#/$ and may only contain letters, digits, periods, underscores, @, # and $. If a name is already taken, a suffix _1, _2, ... is added.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.lowercase,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "bottom",
        text: {
            title: "Lowercase",
            id: "Bila dicentang (default), semua huruf diubah menjadi huruf kecil sebelum teks dipecah, sehingga \"Makan\" dan \"makan\" dihitung sebagai kata yang sama. Bila tidak dicentang, huruf besar/kecil dibedakan.",
            en: "When checked (default), all letters are converted to lowercase before the text is split, so \"Food\" and \"food\" count as the same word. When unchecked, upper and lower case are treated as different.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.stopwords,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "bottom",
        text: {
            title: "Stopwords Removal",
            id: "Membuang kata umum yang kurang bermakna (mis. \"dan\", \"yang\"). None = tidak dibuang (default); Indonesian/English = daftar bawaan (ditampilkan di kotak); Custom = daftar sendiri, satu kata per baris. Mengubah isi kotak otomatis memilih Custom. Pencocokan tidak membedakan huruf besar/kecil.",
            en: "Removes common words with little meaning (e.g. \"and\", \"the\"). None = keep all words (default); Indonesian/English = built-in list (shown in the box); Custom = your own list, one word per line. Editing the box switches to Custom automatically. Matching ignores upper/lower case.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.stemming,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "bottom",
        text: {
            title: "Stemming",
            id: "Mengubah kata ke bentuk dasarnya agar variasi kata dihitung sebagai satu kata (mis. \"makanan\" menjadi \"makan\"). None (default), Indonesian (Sastrawi), atau English (Porter). Dilakukan setelah stopwords dibuang dan selalu menghasilkan huruf kecil.",
            en: "Reduces words to their root form so word variations count as one word (e.g. \"running\" becomes \"run\"). None (default), Indonesian (Sastrawi), or English (Porter). Applied after stopword removal and always produces lowercase words.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.tokenizer,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "bottom",
        text: {
            title: "Tokenizer",
            id: "Word (default) = setiap kata menjadi satu term. N-gram = term berupa rangkaian kata berurutan dengan panjang dari min size sampai max size (bilangan bulat 1–5, min ≤ max); mis. min 1, max 2 menghasilkan \"makan\", \"nasi\", dan \"makan nasi\". N-gram dibentuk setelah stopwords dan stemming.",
            en: "Word (default) = each word becomes one term. N-gram = terms are runs of consecutive words whose length goes from min size to max size (whole numbers 1–5, min ≤ max); e.g. min 1, max 2 gives \"fried\", \"rice\", and \"fried rice\". N-grams are built after stopwords and stemming.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.delimiters,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "top",
        text: {
            title: "Delimiters",
            id: "Pola regular expression (regex) pemisah kata: teks dipotong di setiap bagian yang cocok dengan pola. Default [\\s.,;:'\"()?!]+ memisahkan pada spasi dan tanda baca umum. Tidak boleh kosong; regex yang tidak sah menampilkan pesan galat.",
            en: "A regular expression (regex) for the word separators: the text is split wherever the pattern matches. The default [\\s.,;:'\"()?!]+ splits on spaces and common punctuation. It cannot be empty; an invalid regex shows an error message.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.tf,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "top",
        text: {
            title: "Term Frequency (TF)",
            id: "Cara menghitung bobot kata dalam satu dokumen, f = jumlah kemunculan kata di dokumen. Binary / Boolean = 1 bila muncul, 0 bila tidak; Raw count / Raw frequency = f (default); Logarithmic / Log-scaled = ln(1 + f); Sublinear = 1 + ln(f) (0 bila tidak muncul); Relative frequency / Length-normalized = f dibagi jumlah token dokumen.",
            en: "How a word is weighted within one document, where f = how many times the word appears in the document. Binary / Boolean = 1 if it appears, else 0; Raw count / Raw frequency = f (default); Logarithmic / Log-scaled = ln(1 + f); Sublinear = 1 + ln(f) (0 if absent); Relative frequency / Length-normalized = f divided by the number of tokens in the document.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.idf,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "top",
        text: {
            title: "Inverse Document Frequency (IDF)",
            id: "Pengali yang menurunkan bobot kata yang muncul di banyak dokumen. Nilai akhir = TF × IDF. N = jumlah dokumen, df = jumlah dokumen yang memuat kata. None = 1 (default); Standard IDF = ln(N/df); Smooth IDF = ln((1+N)/(1+df)) + 1; IDF + 1 = ln(N/df) + 1.",
            en: "A multiplier that lowers the weight of words found in many documents. Final value = TF × IDF. N = number of documents, df = number of documents containing the word. None = 1 (default); Standard IDF = ln(N/df); Smooth IDF = ln((1+N)/(1+df)) + 1; IDF + 1 = ln(N/df) + 1.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.normalization,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "top",
        text: {
            title: "Normalization",
            id: "Menyetarakan skala tiap baris (dokumen) setelah TF × IDF. None = tanpa normalisasi (default); L2 / Cosine / Euclidean = dibagi panjang Euklides baris (panjang menjadi 1); L1 / Manhattan = dibagi jumlah nilai mutlak baris; Document length / Average-length = baris diskalakan ke rata-rata panjang L2 seluruh dokumen yang tidak kosong.",
            en: "Puts each row (document) on a common scale after TF × IDF. None = no normalization (default); L2 / Cosine / Euclidean = divided by the row's Euclidean length (length becomes 1); L1 / Manhattan = divided by the sum of absolute values; Document length / Average-length = the row is scaled to the average L2 length of all non-empty documents.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.wordsToKeep,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "top",
        text: {
            title: "Words to Keep",
            id: "Jumlah maksimum kata (kolom) yang disimpan; bilangan bulat ≥ 0, default 1000, 0 = simpan semua kata. Kata dirangking menurut total kemunculan di semua dokumen, atau untuk sebagian kombinasi rumus menurut jumlah TF × IDF; catatan di bawah kolom menunjukkan cara yang berlaku. Nilai seri diurutkan alfabetis.",
            en: "Maximum number of words (columns) to keep; a whole number ≥ 0, default 1000, 0 = keep all words. Words are ranked by their total count across all documents, or for some formula combinations by the sum of TF × IDF; the note below the field shows which applies. Ties are broken alphabetically.",
        },
    },
    {
        targetId: STWV_TOUR_IDS.minTermFreq,
        requiredTab: STWV_TABS.OPTIONS,
        defaultPosition: "top",
        text: {
            title: "Min term frequency",
            id: "Kata yang total kemunculannya di semua dokumen lebih kecil dari nilai ini dibuang sebelum Words to Keep diterapkan. Bilangan bulat ≥ 1, default 1 (tidak ada kata yang dibuang).",
            en: "Words whose total count across all documents is below this value are dropped before Words to Keep is applied. A whole number ≥ 1, default 1 (no word is dropped).",
        },
    },
];

/** Langkah tur dalam bahasa yang dipilih ('en' = Inggris, selain itu Indonesia). */
export function getStwvTourSteps(lang: HelpLanguage | string): StwvTourStep[] {
    const isEn = lang === "en";
    return STEP_DEFS.map((def) => ({
        title: def.text.title,
        content: isEn ? def.text.en : def.text.id,
        targetId: def.targetId,
        defaultPosition: def.defaultPosition,
        defaultHorizontalPosition: null,
        icon: null,
        requiredTab: def.requiredTab,
        ...(def.forceChangeTab ? { forceChangeTab: true } : {}),
    }));
}
