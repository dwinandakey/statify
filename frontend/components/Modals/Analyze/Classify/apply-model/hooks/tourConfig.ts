// Tur bantuan interaktif Apply Model (pola Ordinal Regression:
// Regression/Ordinal/hooks/tourConfig.ts). Menggantikan toggle Help lama
// (`helperMode`/`showFieldHelp`) — teks bantuan inline lama dipakai ulang
// sebagai isi pop-up dan kini dwibahasa (Indonesia/Inggris, mengikuti
// `useHelpLanguageStore`).
//
// Langkah dibangun dari state saat ini (`buildApplyModelTourSteps`):
// - tanpa model: hanya langkah Tab Model (tab lain disabled dan isinya belum
//   dirender, sehingga target langkahnya tidak ada);
// - dengan model: seluruh tab; langkah fitur teks hanya bila model memiliki
//   fitur Text (bagian Raw Text Variable / Word-Vector Columns dirender).

import type { TourStep } from "@/components/Modals/Analyze/Descriptive/Descriptive/hooks/useTourGuide";
import type { HelpLanguage } from "@/stores/useHelpLanguageStore";

export const APPLY_MODEL_TOUR_TABS = {
  MODEL: "model",
  VARIABLES: "variables",
  SAVE: "save",
  OUTPUT: "output",
} as const;

export type ApplyModelTourTab =
  (typeof APPLY_MODEL_TOUR_TABS)[keyof typeof APPLY_MODEL_TOUR_TABS];

/** `id` elemen target tur. Dipasang di dialogs/*.tsx folder ini. */
export const APPLY_MODEL_TOUR_IDS = {
  modelTab: "apply-model-model-tab-trigger",
  variablesTab: "apply-model-variables-tab-trigger",
  saveTab: "apply-model-save-tab-trigger",
  outputTab: "apply-model-output-tab-trigger",
  // Tab Model
  sourceSection: "apply-model-source-section",
  sourcePicker: "apply-model-source-picker",
  summaryCard: "apply-model-summary-card",
  // Tab Variables
  mappingSection: "apply-model-mapping-section",
  autoMapButton: "apply-model-automap-button",
  textSection: "apply-model-text-section",
  actualTargetSection: "apply-model-actual-target-section",
  // Tab Save
  savePredictedRow: "apply-model-save-predicted-row",
  saveMaxProbabilityRow: "apply-model-save-max-probability-row",
  saveClassProbabilitiesRow: "apply-model-save-class-probabilities-row",
  savePrefixSection: "apply-model-save-prefix-section",
  saveCustomNamesRow: "apply-model-save-custom-names-row",
  saveNamesTable: "apply-model-save-names-table",
  // Tab Output
  outputModelSummary: "apply-model-output-row-ModelSummary",
  outputCaseProcessingSummary: "apply-model-output-row-CaseProcessingSummary",
  outputPredictionDistribution: "apply-model-output-row-PredictionDistribution",
  outputEvaluationMetrics: "apply-model-output-row-EvaluationMetrics",
  outputConfusionMatrix: "apply-model-output-row-ConfusionMatrix",
} as const;

/** Id baris checkbox Output Viewer per field (dipakai output-tab.tsx). */
export const getOutputRowTourId = (field: string): string =>
  `apply-model-output-row-${field}`;

export type ApplyModelTourContext = {
  language: HelpLanguage;
  /** Model valid sudah dimuat (tab Variables/Save/Output aktif). */
  hasModel: boolean;
  /** Sumber fitur Text model yang dimuat; `null` bila tidak ada fitur Text. */
  textSource: "raw" | "vector" | null;
};

type Bilingual = { id: string; en: string };

type StepDefinition = {
  targetId: string;
  tab: ApplyModelTourTab;
  title: Bilingual;
  content: Bilingual;
  /** Langkah hanya dimasukkan bila kondisi ini benar. */
  when?: (ctx: ApplyModelTourContext) => boolean;
};

const needsModel = (ctx: ApplyModelTourContext) => ctx.hasModel;

const STEP_DEFINITIONS: readonly StepDefinition[] = [
  // ---------------------------------------------------------------- Model
  {
    targetId: APPLY_MODEL_TOUR_IDS.modelTab,
    tab: APPLY_MODEL_TOUR_TABS.MODEL,
    title: { id: "Tab Model", en: "Model Tab" },
    content: {
      id: "Mulai dari sini: muat model Naive Bayes yang sudah dilatih. Tab Variables, Save, dan Output baru aktif setelah model valid berhasil dimuat.",
      en: "Start here: load a trained Naive Bayes model. The Variables, Save and Output tabs become available once a valid model is loaded.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.sourceSection,
    tab: APPLY_MODEL_TOUR_TABS.MODEL,
    title: { id: "Sumber Model", en: "Model Source" },
    content: {
      id: "Pilih asal model: Upload file (.json) hasil ekspor menu Naive Bayes, From Output Viewer (model dari run Naive Bayes yang masih ada di Output Viewer), atau Statify built-in model (model bawaan Statify).",
      en: "Choose where the model comes from: Upload file (.json) exported from the Naive Bayes menu, From Output Viewer (a model from a Naive Bayes run still in the Output Viewer), or Statify built-in model.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.sourcePicker,
    tab: APPLY_MODEL_TOUR_TABS.MODEL,
    title: { id: "Memilih Model", en: "Picking the Model" },
    content: {
      id: "Upload file: tekan Choose file; hanya file .json maksimal 10 MB. From Output Viewer: pilih model dari daftar (terbaru di atas). Built-in: pilih dari katalog (saat ini masih kosong). Model baru menggantikan model lama hanya bila valid; bila tidak, daftar error ditampilkan.",
      en: "Upload file: press Choose file; only .json files up to 10 MB are accepted. From Output Viewer: pick a model from the list (newest first). Built-in: pick from the catalog (currently empty). A new model replaces the current one only if it is valid; otherwise the errors are listed.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.summaryCard,
    tab: APPLY_MODEL_TOUR_TABS.MODEL,
    when: needsModel,
    title: { id: "Ringkasan Model", en: "Model Summary" },
    content: {
      id: "Periksa sumber, algoritma, versi format, waktu pelatihan, target, kelas, dan fitur model (nama + peran) sebelum memetakan variabel. Peringatan kuning muncul misalnya untuk model format lama 1.0.",
      en: "Review the source, algorithm, format version, training time, target, classes and features (name + role) of the loaded model before mapping variables. Yellow warnings appear, for example, for old-format (1.0) models.",
    },
  },
  // ------------------------------------------------------------ Variables
  {
    targetId: APPLY_MODEL_TOUR_IDS.variablesTab,
    tab: APPLY_MODEL_TOUR_TABS.VARIABLES,
    when: needsModel,
    title: { id: "Tab Variables", en: "Variables Tab" },
    content: {
      id: "Hubungkan setiap fitur model dengan variabel di dataset aktif yang akan diprediksi.",
      en: "Connect every model feature to a variable of the active dataset that will be predicted.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.mappingSection,
    tab: APPLY_MODEL_TOUR_TABS.VARIABLES,
    when: needsModel,
    title: { id: "Pemetaan Variabel", en: "Variable Mapping" },
    content: {
      id: "Setiap fitur model wajib dipetakan ke satu variabel dataset. Fitur categorical menerima variabel nominal/ordinal; fitur numerical menerima variabel scale bertipe numerik. Satu variabel tidak boleh dipakai dua fitur. Kolom Status menunjukkan ✓ atau alasan kesalahannya.",
      en: "Every model feature must be mapped to one dataset variable. Categorical features accept nominal or ordinal variables; numerical features accept numeric scale variables. One variable cannot be used by two features. The Status column shows ✓ or the reason for the error.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.autoMapButton,
    tab: APPLY_MODEL_TOUR_TABS.VARIABLES,
    when: needsModel,
    title: { id: "Auto-map by name", en: "Auto-map by name" },
    content: {
      id: "Mencocokkan fitur dengan variabel dataset berdasarkan nama (persis dulu, lalu tanpa membedakan huruf besar/kecil bila hanya ada satu kandidat). Tombol ini menimpa pilihan manual Anda. Auto-map juga dijalankan otomatis saat model dimuat.",
      en: "Matches features to dataset variables by name (exact first, then case-insensitive if there is a single candidate). This overwrites your manual choices. Auto-map also runs automatically when a model is loaded.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.textSection,
    tab: APPLY_MODEL_TOUR_TABS.VARIABLES,
    when: (ctx) => ctx.hasModel && ctx.textSource === "raw",
    title: { id: "Fitur Teks: Raw Text Variable", en: "Text Features: Raw Text Variable" },
    content: {
      id: "Model ini dilatih dari teks mentah. Pilih variabel bertipe string yang berisi teks yang akan diklasifikasikan (wajib). Teks diproses ulang dengan pengaturan pra-pemrosesan teks yang tersimpan di model. Baris dengan teks kosong dianggap missing.",
      en: "This model was trained on raw text. Choose the string variable that holds the text to classify (required). The text is preprocessed again with the text preprocessing settings stored in the model. Rows with empty text count as missing.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.textSection,
    tab: APPLY_MODEL_TOUR_TABS.VARIABLES,
    when: (ctx) => ctx.hasModel && ctx.textSource === "vector",
    title: { id: "Fitur Teks: Kolom Vektor Kata", en: "Text Features: Word-Vector Columns" },
    content: {
      id: "Model ini dilatih dari kolom vektor kata. Kolom dicocokkan otomatis dengan variabel dataset berdasarkan nama; kolom yang tidak ditemukan dianggap bernilai 0 (tidak memblokir). Kolom yang ditemukan harus numerik. Daftar kolom yang dianggap 0 bisa dibuka di sini.",
      en: "This model was trained on word-vector columns. Columns are matched to dataset variables by name; columns that are not found are treated as 0 (this does not block). Found columns must be numeric. The list of columns treated as 0 can be expanded here.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.actualTargetSection,
    tab: APPLY_MODEL_TOUR_TABS.VARIABLES,
    when: needsModel,
    title: { id: "Target Sebenarnya (opsional)", en: "Actual Target (optional)" },
    content: {
      id: "Opsional. Pilih variabel nominal/ordinal berisi kelas sebenarnya (bukan prediktor) untuk menambahkan metrik evaluasi dan confusion matrix ke output. Biarkan — None — bila data baru belum memiliki label.",
      en: "Optional. Choose the nominal/ordinal variable holding the true class (not a predictor) to add evaluation metrics and a confusion matrix to the output. Leave it at — None — when the new data has no labels.",
    },
  },
  // ----------------------------------------------------------------- Save
  {
    targetId: APPLY_MODEL_TOUR_IDS.saveTab,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Tab Save", en: "Save Tab" },
    content: {
      id: "Atur kolom hasil prediksi yang ditambahkan sebagai variabel baru ke dataset aktif. Variabel yang sudah ada tidak pernah ditimpa.",
      en: "Set up the prediction columns that are added as new variables to the active dataset. Existing variables are never overwritten.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.savePredictedRow,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Predicted value", en: "Predicted value" },
    content: {
      id: "Kelas prediksi untuk setiap baris selalu disimpan (tidak bisa dimatikan). Kolom ini numerik bila semua nama kelas berupa angka, selain itu string.",
      en: "The predicted class of every row is always saved (it cannot be turned off). The column is numeric when all class names are numbers, otherwise string.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.saveMaxProbabilityRow,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Probabilitas Kelas Prediksi", en: "Predicted Class Probability" },
    content: {
      id: "Menyimpan probabilitas kelas yang diprediksi (probabilitas tertinggi) per baris, 4 desimal. Aktif secara bawaan.",
      en: "Saves the probability of the predicted class (the highest probability) for each row, with 4 decimals. On by default.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.saveClassProbabilitiesRow,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Probabilitas Setiap Kelas", en: "Probability for Each Class" },
    content: {
      id: "Menambahkan satu kolom probabilitas untuk setiap kelas model. Nonaktif secara bawaan.",
      en: "Adds one probability column for every class of the model. Off by default.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.savePrefixSection,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Name prefix", en: "Name prefix" },
    content: {
      id: "Teks di depan setiap nama kolom bawaan (mis. NB_PredictedValue). Kosongkan untuk memakai prefix bawaan algoritma (NB).",
      en: "Text placed before each default column name (e.g. NB_PredictedValue). Leave it empty to use the algorithm default (NB).",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.saveCustomNamesRow,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Use custom names", en: "Use custom names" },
    content: {
      id: "Bila dicentang, nama setiap kolom yang akan disimpan dapat diubah di tabel. Nama kosong tidak diganti nama bawaan dan dianggap error; nama harus valid, maksimal 64 karakter, dan tidak boleh kembar.",
      en: "When checked, the name of every column to be saved can be edited in the table. Empty names are not replaced by defaults and count as errors; names must be valid, at most 64 characters, and unique.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.saveNamesTable,
    tab: APPLY_MODEL_TOUR_TABS.SAVE,
    when: needsModel,
    title: { id: "Pratinjau Nama Akhir", en: "Final Name Preview" },
    content: {
      id: "Kolom Final name adalah nama yang benar-benar dipakai di dataset. Nama disesuaikan otomatis (ikon peringatan) bila tidak valid atau sudah dipakai variabel lain, misalnya diberi akhiran _1.",
      en: "Final name is what the column will actually be called in the dataset. It is adjusted automatically (warning icon) when the name is invalid or already used by another variable, e.g. by adding a _1 suffix.",
    },
  },
  // --------------------------------------------------------------- Output
  {
    targetId: APPLY_MODEL_TOUR_IDS.outputTab,
    tab: APPLY_MODEL_TOUR_TABS.OUTPUT,
    when: needsModel,
    title: { id: "Tab Output", en: "Output Tab" },
    content: {
      id: "Pilih tabel yang ditampilkan di Output Viewer. Tabel Saved Variables (daftar kolom yang disimpan) selalu ditampilkan.",
      en: "Choose the tables shown in the Output Viewer. The Saved Variables table (the list of saved columns) is always shown.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.outputModelSummary,
    tab: APPLY_MODEL_TOUR_TABS.OUTPUT,
    when: needsModel,
    title: { id: "Model summary", en: "Model summary" },
    content: {
      id: "Menampilkan sumber, algoritma, target, kelas, dan pemetaan fitur dari model yang diterapkan.",
      en: "Shows the source, algorithm, target, classes and feature mapping of the applied model.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.outputCaseProcessingSummary,
    tab: APPLY_MODEL_TOUR_TABS.OUTPUT,
    when: needsModel,
    title: { id: "Case processing summary", en: "Case processing summary" },
    content: {
      id: "Menampilkan jumlah baris yang diprediksi dan yang tidak dapat diprediksi (seluruh prediktor kosong), serta baris dengan prediktor kosong atau kategori yang tidak dikenal model.",
      en: "Shows how many rows were scored and how many could not be scored (all predictors missing), plus rows with a missing predictor or a category the model does not know.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.outputPredictionDistribution,
    tab: APPLY_MODEL_TOUR_TABS.OUTPUT,
    when: needsModel,
    title: { id: "Prediction distribution", en: "Prediction distribution" },
    content: {
      id: "Menampilkan jumlah dan persentase baris yang diprediksi ke setiap kelas.",
      en: "Shows how many rows (count and percent) were predicted into each class.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.outputEvaluationMetrics,
    tab: APPLY_MODEL_TOUR_TABS.OUTPUT,
    when: needsModel,
    title: { id: "Evaluation metrics", en: "Evaluation metrics" },
    content: {
      id: "Menampilkan akurasi, Cohen's Kappa, dan metrik per kelas dengan membandingkan prediksi dan target sebenarnya. Hanya aktif bila Actual target dipilih di Tab Variables.",
      en: "Shows accuracy, Cohen's Kappa and per-class metrics by comparing predictions with the actual target. Only available when an Actual target is chosen in the Variables tab.",
    },
  },
  {
    targetId: APPLY_MODEL_TOUR_IDS.outputConfusionMatrix,
    tab: APPLY_MODEL_TOUR_TABS.OUTPUT,
    when: needsModel,
    title: { id: "Confusion matrix", en: "Confusion matrix" },
    content: {
      id: "Menampilkan tabel kelas sebenarnya (baris) terhadap kelas prediksi (kolom). Juga memerlukan Actual target di Tab Variables.",
      en: "Shows actual classes (rows) against predicted classes (columns) in a table. Also requires an Actual target in the Variables tab.",
    },
  },
];

/**
 * Bangun langkah tur dari state saat ini. Panjang hasil tidak bergantung pada
 * bahasa (hanya pada `hasModel` dan `textSource`).
 */
export function buildApplyModelTourSteps(
  ctx: ApplyModelTourContext
): TourStep[] {
  const isEn = ctx.language === "en";
  return STEP_DEFINITIONS.filter((step) => step.when?.(ctx) ?? true).map(
    (step) => ({
      title: isEn ? step.title.en : step.title.id,
      content: isEn ? step.content.en : step.content.id,
      targetId: step.targetId,
      defaultPosition: "bottom",
      defaultHorizontalPosition: null,
      icon: null,
      requiredTab: step.tab,
    })
  );
}
