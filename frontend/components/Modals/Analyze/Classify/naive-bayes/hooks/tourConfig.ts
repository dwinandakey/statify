import type { TourStep as BaseTourStep } from "@/types/tourTypes";
import type { HelpLanguage } from "@/stores/useHelpLanguageStore";

/**
 * Tur bantuan interaktif menu Naive Bayes (pola modul Ordinal Regression):
 * satu langkah per tab ditambah satu langkah per field/bagian. Teks tersedia
 * dalam Bahasa Indonesia dan Inggris; bahasa dipilih dari `useHelpLanguageStore`.
 * Langkah tab Text Preprocessing hanya disertakan bila Raw Text Variable terisi
 * (tab itu nonaktif tanpa Raw Text Variable).
 */

export const TABS = {
    VARIABLES: "variables" as const,
    TEXT: "text" as const,
    OPTIONS: "options" as const,
    VALIDATION: "validation" as const,
    OUTPUT: "output" as const,
};

export type TabType = (typeof TABS)[keyof typeof TABS];

export type TourStep = BaseTourStep & {
    requiredTab?: TabType;
    forceChangeTab?: boolean;
};

/** Id elemen yang menjadi sasaran tur (dipasang di komponen folder ini). */
export const NAIVE_BAYES_TOUR_IDS = {
    variablesTab: "naive-bayes-variables-tab-trigger",
    textTab: "naive-bayes-text-tab-trigger",
    optionsTab: "naive-bayes-options-tab-trigger",
    validationTab: "naive-bayes-validation-tab-trigger",
    outputTab: "naive-bayes-output-tab-trigger",
    availableVariables: "naive-bayes-available-variables",
    targetZone: "naive-bayes-zone-target",
    excludedZone: "naive-bayes-zone-excluded",
    factorsZone: "naive-bayes-zone-factors",
    covariatesZone: "naive-bayes-zone-covariates",
    textFeatures: "naive-bayes-text-features",
    rawTextZone: "naive-bayes-zone-rawText",
    wordVectorZone: "naive-bayes-zone-wordVector",
    textPreprocessingContent: "naive-bayes-text-preprocessing-content",
    optionsNumeric: "naive-bayes-options-numeric",
    optionsCategorical: "naive-bayes-options-categorical",
    optionsText: "naive-bayes-options-text",
    validationMethod: "naive-bayes-validation-method",
    validationHoldout: "naive-bayes-validation-holdout",
    validationKFold: "naive-bayes-validation-kfold",
    validationSeed: "naive-bayes-validation-seed",
    outputViewer: "naive-bayes-output-viewer",
    outputText: "naive-bayes-output-text",
    okButton: "naive-bayes-ok-button",
} as const;

type StepText = { titleId: string; titleEn: string; contentId: string; contentEn: string };
type StepDef = StepText & {
    targetId: string;
    requiredTab: TabType;
    position?: "top" | "bottom";
};

const ids = NAIVE_BAYES_TOUR_IDS;

const VARIABLES_STEPS: StepDef[] = [
    {
        targetId: ids.variablesTab,
        requiredTab: TABS.VARIABLES,
        titleId: "Tab Variables",
        titleEn: "Variables Tab",
        contentId:
            "Tentukan variabel Target (kelas yang ingin diprediksi) dan variabel prediktor. Naive Bayes di sini menggabungkan prediktor kategorik, numerik, dan teks dalam satu model.",
        contentEn:
            "Choose the Target variable (the class to predict) and the predictor variables. This Naive Bayes model can combine categorical, numeric, and text predictors in one model.",
    },
    {
        targetId: ids.availableVariables,
        requiredTab: TABS.VARIABLES,
        titleId: "Daftar Variabel",
        titleEn: "Available Variables",
        contentId:
            "Semua variabel dataset yang belum dipakai. Gunakan kotak Filter (nama atau label, mis. VEC_), tombol urut Name/Measurement, serta Select All (filtered), Select All Nominal, dan Select All Continuous untuk menyorot banyak variabel. Shift+klik memilih rentang, Ctrl+klik menambah/mengurangi pilihan. Pindahkan dengan drag & drop atau tombol panah.",
        contentEn:
            "All dataset variables that are not yet used. Use the Filter box (name or label, e.g. VEC_), the Name/Measurement sort buttons, and Select All (filtered), Select All Nominal, and Select All Continuous to highlight many variables. Shift+click selects a range, Ctrl+click adds/removes items. Move them with drag and drop or the arrow buttons.",
    },
    {
        targetId: ids.targetZone,
        requiredTab: TABS.VARIABLES,
        titleId: "Target / Label",
        titleEn: "Target / Label",
        contentId:
            "Satu variabel kelas dengan measurement nominal atau ordinal (diperlakukan sebagai kategori biasa, boleh lebih dari dua kelas). Klik ganda variabel pertama di daftar kiri juga mengisi Target. Baris dengan target kosong dibuang dari analisis.",
        contentEn:
            "One class variable with a nominal or ordinal measurement level (treated as plain categories; more than two classes are allowed). Double-clicking a variable on the left while Target is empty also fills it. Rows with a missing target are excluded from the analysis.",
    },
    {
        targetId: ids.excludedZone,
        requiredTab: TABS.VARIABLES,
        titleId: "Variables to Exclude",
        titleEn: "Variables to Exclude",
        contentId:
            "Mode bawaan: semua variabel lain (selain Target, Text Features, dan variabel bermeasurement unknown) otomatis menjadi prediktor, kecuali yang Anda masukkan ke sini (mis. kolom ID). Variabel scale menjadi numerik, nominal/ordinal menjadi kategorik.",
        contentEn:
            "Default mode: every other variable (except the Target, Text Features, and variables with an unknown measurement level) automatically becomes a predictor, except those you put here (e.g. an ID column). Scale variables become numeric; nominal/ordinal variables become categorical.",
    },
    {
        targetId: ids.factorsZone,
        requiredTab: TABS.VARIABLES,
        titleId: "Candidate Factors",
        titleEn: "Candidate Factors",
        contentId:
            "Alternatif dari Variables to Exclude: hanya variabel yang Anda pilih yang menjadi prediktor. Kotak ini menerima variabel nominal/ordinal (fitur kategorik). Mode ini dan Variables to Exclude saling eksklusif: mengisi salah satunya mengembalikan isi yang lain ke daftar kiri.",
        contentEn:
            "Alternative to Variables to Exclude: only the variables you pick become predictors. This box accepts nominal/ordinal variables (categorical features). This mode and Variables to Exclude are mutually exclusive: filling one returns the other's contents to the list on the left.",
    },
    {
        targetId: ids.covariatesZone,
        requiredTab: TABS.VARIABLES,
        titleId: "Candidate Covariates",
        titleEn: "Candidate Covariates",
        contentId:
            "Pasangan Candidate Factors untuk variabel numerik (measurement scale). Variabel ini dimodelkan dengan distribusi Gaussian per kelas.",
        contentEn:
            "The counterpart of Candidate Factors for numeric variables (scale measurement). These variables are modeled with a Gaussian distribution per class.",
    },
    {
        targetId: ids.textFeatures,
        requiredTab: TABS.VARIABLES,
        titleId: "Text Features",
        titleEn: "Text Features",
        contentId:
            "Fitur teks opsional dengan dua sumber yang saling eksklusif: Raw Text Variable atau Word-Vector Variables. Satu variabel hanya boleh berada di satu tempat. Peringatan (tidak memblokir) muncul di bawah bila ada kolom yang tampak seperti vektor kata atau teks bebas/ID.",
        contentEn:
            "Optional text features with two mutually exclusive sources: Raw Text Variable or Word-Vector Variables. A variable can only be in one place. Non-blocking warnings appear below when columns look like word vectors or free text/IDs.",
    },
    {
        targetId: ids.rawTextZone,
        requiredTab: TABS.VARIABLES,
        titleId: "Raw Text Variable",
        titleEn: "Raw Text Variable",
        contentId:
            "Maksimal satu variabel STRING berisi teks mentah. Teks diubah menjadi vektor kata di dalam analisis sesuai tab Text Preprocessing (tab itu aktif setelah kolom ini terisi).",
        contentEn:
            "At most one STRING variable containing raw text. The text is converted to word vectors inside the analysis using the Text Preprocessing tab (that tab becomes available once this box is filled).",
    },
    {
        targetId: ids.wordVectorZone,
        requiredTab: TABS.VARIABLES,
        titleId: "Word-Vector Variables",
        titleEn: "Word-Vector Variables",
        contentId:
            "Kolom NUMERIC yang sudah berupa vektor kata (mis. hasil Transform > String to Word Vector). Nilai harus ≥ 0. Karena kosakata dan bobotnya dihitung di luar Naive Bayes dari seluruh data, hasil evaluasi bisa sedikit optimis.",
        contentEn:
            "NUMERIC columns that already hold word vectors (e.g. from Transform > String to Word Vector). Values must be ≥ 0. Because their vocabulary and weights were computed outside Naive Bayes on all data, evaluation results can be slightly optimistic.",
    },
];

const TEXT_STEPS: StepDef[] = [
    {
        targetId: ids.textTab,
        requiredTab: TABS.TEXT,
        titleId: "Tab Text Preprocessing",
        titleEn: "Text Preprocessing Tab",
        contentId:
            "Hanya aktif bila Raw Text Variable terisi. Pengaturan di sini mengubah teks mentah menjadi vektor kata. Pada holdout dan k-fold, kosakata dipelajari hanya dari data latih tiap split, sehingga data uji tidak bocor ke model.",
        contentEn:
            "Only available when a Raw Text Variable is set. These settings turn the raw text into word vectors. With holdout and k-fold, the vocabulary is learned from the training data of each split only, so test data does not leak into the model.",
    },
    {
        targetId: ids.textPreprocessingContent,
        requiredTab: TABS.TEXT,
        titleId: "Pembersihan & Tokenisasi",
        titleEn: "Cleaning & Tokenizing",
        contentId:
            "Atur huruf kecil (lowercase), penghapusan stopwords (Indonesia, Inggris, atau daftar sendiri), stemming, tokenizer (kata atau n-gram), dan pola pemisah (delimiters).",
        contentEn:
            "Set lowercasing, stopword removal (Indonesian, English, or a custom list), stemming, the tokenizer (word or n-gram), and the delimiter pattern.",
        position: "top",
    },
    {
        targetId: ids.textPreprocessingContent,
        requiredTab: TABS.TEXT,
        titleId: "Pembobotan & Kosakata",
        titleEn: "Weighting & Vocabulary",
        contentId:
            "Pilih Term Frequency (TF), Inverse Document Frequency (IDF), dan Normalization secara bebas. Words to Keep membatasi jumlah kata di kosakata (0 = semua kata); Min term frequency membuang kata yang total kemunculannya di bawah nilai tersebut sebelum Words to Keep diterapkan.",
        contentEn:
            "Choose Term Frequency (TF), Inverse Document Frequency (IDF), and Normalization freely. Words to Keep limits the vocabulary size (0 = all words); Min term frequency drops words whose total count is below that value before Words to Keep is applied.",
        position: "top",
    },
];

const OPTIONS_STEPS: StepDef[] = [
    {
        targetId: ids.optionsTab,
        requiredTab: TABS.OPTIONS,
        titleId: "Tab Options",
        titleEn: "Options Tab",
        contentId:
            "Pilih fungsi likelihood dan parameter smoothing untuk tiap kelompok fitur: Numeric, Categorical, dan Text.",
        contentEn:
            "Choose the likelihood function and smoothing parameters for each feature group: Numeric, Categorical, and Text.",
    },
    {
        targetId: ids.optionsNumeric,
        requiredTab: TABS.OPTIONS,
        titleId: "Likelihood Numeric",
        titleEn: "Numeric Likelihood",
        contentId:
            "Variabel numerik (Covariates) selalu dimodelkan dengan distribusi Gaussian (normal) memakai mean dan varians tiap kelas.",
        contentEn:
            "Numeric variables (Covariates) are always modeled with a Gaussian (normal) distribution using the mean and variance of each class.",
    },
    {
        targetId: ids.optionsCategorical,
        requiredTab: TABS.OPTIONS,
        titleId: "Categorical & Smoothing Alpha",
        titleEn: "Categorical & Smoothing Alpha",
        contentId:
            "Fitur kategorik memakai likelihood Categorical dengan Laplace smoothing: P = (count + α) / (total kelas + α·jumlah kategori). Smoothing Alpha harus > 0 dan ≤ 999 (bawaan 1), sehingga kategori yang tidak pernah muncul tetap mendapat peluang kecil.",
        contentEn:
            "Categorical features use the Categorical likelihood with Laplace smoothing: P = (count + α) / (class total + α·number of categories). Smoothing Alpha must be > 0 and ≤ 999 (default 1), so unseen categories still get a small probability.",
    },
    {
        targetId: ids.optionsText,
        requiredTab: TABS.OPTIONS,
        titleId: "Likelihood Text",
        titleEn: "Text Likelihood",
        contentId:
            "Aktif bila Text Features terisi. Multinomial (bawaan) memakai jumlah/bobot kata; Bernoulli hanya melihat ada/tidaknya kata; Complement memakai statistik kelas lain dan hanya boleh bila model berisi Text Features saja. Text Alpha (> 0, ≤ 999, bawaan 1) adalah smoothing untuk likelihood teks.",
        contentEn:
            "Available when Text Features are set. Multinomial (default) uses word counts/weights; Bernoulli only looks at whether a word is present; Complement uses the statistics of the other classes and is only allowed when the model contains Text Features only. Text Alpha (> 0, ≤ 999, default 1) smooths the text likelihood.",
        position: "top",
    },
];

const VALIDATION_STEPS: StepDef[] = [
    {
        targetId: ids.validationTab,
        requiredTab: TABS.VALIDATION,
        titleId: "Tab Validation",
        titleEn: "Validation Tab",
        contentId:
            "Menentukan cara mengukur performa model. Setelah validasi selesai, model akhir (tabel distribusi dan model yang diekspor) selalu dilatih ulang pada seluruh data valid.",
        contentEn:
            "Defines how model performance is measured. After validation, the final model (distribution table and exported model) is always retrained on all valid data.",
    },
    {
        targetId: ids.validationMethod,
        requiredTab: TABS.VALIDATION,
        titleId: "Metode Validasi",
        titleEn: "Validation Method",
        contentId:
            "Pilih salah satu: Training and Holdout Partition atau Cross-Validation Folds. Bagian milik metode yang tidak dipilih tampil redup.",
        contentEn:
            "Choose one: Training and Holdout Partition or Cross-Validation Folds. The section of the method that is not selected is dimmed.",
    },
    {
        targetId: ids.validationHoldout,
        requiredTab: TABS.VALIDATION,
        titleId: "Training dan Holdout",
        titleEn: "Training and Holdout",
        contentId:
            "Isi Training Percentage (bilangan bulat 1–99, bawaan 70). Holdout Percentage dihitung otomatis (100 − training). Pembagian dilakukan secara stratified agar proporsi kelas terjaga; metrik dihitung dari data holdout.",
        contentEn:
            "Enter the Training Percentage (a whole number 1–99, default 70). The Holdout Percentage is computed automatically (100 − training). The split is stratified to keep class proportions; metrics are computed on the holdout data.",
    },
    {
        targetId: ids.validationKFold,
        requiredTab: TABS.VALIDATION,
        titleId: "Cross-Validation Folds",
        titleEn: "Cross-Validation Folds",
        contentId:
            "Number of Folds bawaan 10 (minimal 1). Fold dibentuk secara stratified dan metrik dihitung dari gabungan prediksi semua fold. Jumlah fold tidak boleh melebihi jumlah kasus; bila melebihi ukuran kelas terkecil, analisis tetap berjalan dengan peringatan.",
        contentEn:
            "Number of Folds defaults to 10 (minimum 1). Folds are stratified and metrics are computed from the pooled predictions of all folds. The number of folds must not exceed the number of cases; if it exceeds the smallest class size, the analysis still runs with a warning.",
        position: "top",
    },
    {
        targetId: ids.validationSeed,
        requiredTab: TABS.VALIDATION,
        titleId: "Random Seed",
        titleEn: "Random Seed",
        contentId:
            "Centang Use random seed lalu isi Seed (bilangan bulat 0–4294967295) agar pembagian holdout/fold dapat diulang dengan hasil yang sama. Tanpa seed, pembagian berbeda di setiap run.",
        contentEn:
            "Tick Use random seed and enter a Seed (a whole number 0–4294967295) so the holdout/fold split can be reproduced exactly. Without a seed, the split differs on every run.",
        position: "top",
    },
];

const OUTPUT_STEPS: StepDef[] = [
    {
        targetId: ids.outputTab,
        requiredTab: TABS.OUTPUT,
        titleId: "Tab Output",
        titleEn: "Output Tab",
        contentId: "Pilih tabel yang ditampilkan di Output Viewer setelah analisis dijalankan.",
        contentEn: "Choose which tables are shown in the Output Viewer after the analysis runs.",
    },
    {
        targetId: ids.outputViewer,
        requiredTab: TABS.OUTPUT,
        titleId: "Viewer Output",
        titleEn: "Viewer Output",
        contentId:
            "Empat tabel (semua tercentang secara bawaan): Case Processing Summary (jumlah kasus, target, atribut, skenario validasi), Attribute Distribution Table (frekuensi/peluang kategori dan mean/std. dev. per kelas), Model Evaluation Metrics (accuracy, precision, recall, F1, rata-rata macro/weighted/micro, overall accuracy, dan Cohen's Kappa), serta Confusion Matrix (aktual vs prediksi).",
        contentEn:
            "Four tables (all ticked by default): Case Processing Summary (case counts, target, attributes, validation scenario), Attribute Distribution Table (category frequencies/probabilities and mean/std. dev. per class), Model Evaluation Metrics (accuracy, precision, recall, F1, macro/weighted/micro averages, overall accuracy, and Cohen's Kappa), and Confusion Matrix (actual vs. predicted).",
    },
    {
        targetId: ids.outputText,
        requiredTab: TABS.OUTPUT,
        titleId: "Text Feature Table",
        titleEn: "Text Feature Table",
        contentId:
            "Aktif bila Text Features terisi: tabel kata paling berpengaruh per kelas. Top-k terms per class adalah bilangan bulat 1–1000 (bawaan 100). Di Output Viewer tersedia tombol Download CSV dan Copy (TSV) untuk tabel lengkap.",
        contentEn:
            "Available when Text Features are set: a table of the most influential terms per class. Top-k terms per class is a whole number 1–1000 (default 100). The Output Viewer offers Download CSV and Copy (TSV) for the full table.",
        position: "top",
    },
    {
        targetId: ids.okButton,
        requiredTab: TABS.OUTPUT,
        titleId: "Menjalankan & Export Model",
        titleEn: "Running & Export Model",
        contentId:
            "Klik OK untuk melatih dan mengevaluasi model (aktif bila Target dan minimal satu prediktor atau Text Feature terisi). Setelah berhasil, tombol Export Model muncul di Output Viewer untuk mengunduh model sebagai file JSON (bawaan Naive_Bayes_Model_Export.json) yang dapat dipakai di Analyze > Classify > Apply Model.",
        contentEn:
            "Click OK to train and evaluate the model (enabled once a Target and at least one predictor or Text Feature are set). After a successful run, an Export Model button appears in the Output Viewer to download the model as a JSON file (default Naive_Bayes_Model_Export.json) for use in Analyze > Classify > Apply Model.",
        position: "top",
    },
];

function toTourStep(def: StepDef, isEn: boolean): TourStep {
    return {
        title: isEn ? def.titleEn : def.titleId,
        content: isEn ? def.contentEn : def.contentId,
        targetId: def.targetId,
        defaultPosition: def.position ?? "bottom",
        defaultHorizontalPosition: null,
        icon: null,
        requiredTab: def.requiredTab,
    };
}

/**
 * Langkah tur sesuai bahasa bantuan dan keadaan form saat ini.
 * `hasRawText` false → langkah tab Text Preprocessing dilewati (tab nonaktif).
 */
export function getNaiveBayesTourSteps(
    language: HelpLanguage,
    options: { hasRawText: boolean } = { hasRawText: false }
): TourStep[] {
    const isEn = language === "en";
    const defs = [
        ...VARIABLES_STEPS,
        ...(options.hasRawText ? TEXT_STEPS : []),
        ...OPTIONS_STEPS,
        ...VALIDATION_STEPS,
        ...OUTPUT_STEPS,
    ];
    return defs.map((def) => toTourStep(def, isEn));
}

/** Langkah lengkap (termasuk Text Preprocessing) per bahasa, untuk pengujian & dokumentasi. */
export const baseTourStepsId: TourStep[] = getNaiveBayesTourSteps("id", { hasRawText: true });
export const baseTourStepsEn: TourStep[] = getNaiveBayesTourSteps("en", { hasRawText: true });
