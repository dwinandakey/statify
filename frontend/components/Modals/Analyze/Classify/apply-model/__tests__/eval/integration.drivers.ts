// Pengemudi alur aplikasi untuk tes integrasi Track F: memanggil KODE ASLI menu STWV, Naive Bayes, dan Apply Model
// dengan wasm sungguhan (lihat integration.helpers.ts). Berkas ini mengimpor modul aplikasi, jadi berkas tes yang
// memakainya WAJIB mendeklarasikan jest.mock untuk "@/stores/useResultStore" dan "@/stores/useVariableStore"
// (lihat integration.mocks.ts) sebelum mengimpor berkas ini.
import { getSlicedData } from "@/hooks/useVariable";
import type { Variable } from "@/types/Variable";
import type { Table } from "@/types/Table";
import { analyzeNaiveBayes } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis";
import type { NaiveBayesRawResult } from "@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis-formatter";
import {
  getEffectivePredictors,
  getEffectiveTextSource,
  getTextColumnNames,
} from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import { mergeWithDefaults } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { NaiveBayesType, NaiveBayesMainType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import { STWV_DEFAULT_CONFIG, toRustConfig, type StwvConfig } from "@/components/Modals/Transform/StringToWordVector/config";
import { applyModel } from "@/components/Modals/Analyze/Classify/apply-model/services/apply-model-analysis";
import { loadModelFromFile, type ModelLoadSuccess } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";
import { ApplyModelDefault } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-default";
import type { ApplyModelType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";
import {
  PILKADA,
  fileLike,
  loadWasm,
  pilkadaOverrides,
  makeVariables,
  type AddVariablesCall,
  type CellUpdate,
  type Csv,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.helpers";
import { resultStore, variableState } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.mocks";

// ---------------------------------------------------------------------------
// Konfigurasi K1..K5 (sama dengan headless/statify_wasm.mjs KONFIGURASI, dibangun di atas STWV_DEFAULT_CONFIG ASLI)
// ---------------------------------------------------------------------------
export type KName = "K1" | "K2" | "K3" | "K4" | "K5";
const cfg = (v: Partial<StwvConfig["vectorization"]> = {}, formulaStandard: StwvConfig["formulaStandard"] = "weka"): StwvConfig => ({
  ...STWV_DEFAULT_CONFIG,
  stopwords: { ...STWV_DEFAULT_CONFIG.stopwords },
  stemming: { ...STWV_DEFAULT_CONFIG.stemming },
  tokenizer: { ...STWV_DEFAULT_CONFIG.tokenizer },
  formulaStandard,
  vectorization: { ...STWV_DEFAULT_CONFIG.vectorization, ...v },
});
export const KCONFIG: Record<KName, { stwv: StwvConfig; likelihood: "multinomial" | "bernoulli" | "complement" }> = {
  K1: { stwv: cfg(), likelihood: "multinomial" },
  K2: { stwv: cfg(), likelihood: "bernoulli" },
  K3: { stwv: cfg(), likelihood: "complement" },
  K4: { stwv: cfg({ tfMethod: "raw", idfMethod: "smooth", normalization: "l2" }, "sklearn"), likelihood: "multinomial" },
  K5: { stwv: cfg({ tfMethod: "log1p", idfMethod: "standard", normalization: "doc_length" }), likelihood: "multinomial" },
};

// ---------------------------------------------------------------------------
// STWV
// ---------------------------------------------------------------------------
export type StwvOutput = { vocabulary: string[]; matrix: number[][]; stats: Record<string, unknown> };
/** Menjalankan process_text_data wasm persis seperti stringToWord.processor.ts (config lewat toRustConfig ASLI). */
export function runStwv(docs: string[], config: StwvConfig): StwvOutput {
  return loadWasm("stwv").process_text_data(docs, toRustConfig(config)) as StwvOutput;
}

// ---------------------------------------------------------------------------
// Naive Bayes
// ---------------------------------------------------------------------------
/** NaiveBayesType untuk jalur Raw Text pada pilkada (seperti form NB: Target=Sentiment, Raw Text=Text Tweet, Exclude Id & Pasangan Calon). */
export function nbRawConfig(k: KName): NaiveBayesType {
  return mergeWithDefaults({
    main: { TargetVar: PILKADA.labelCol, SpecificationMode: "exclude", ExcludedVar: [...PILKADA.excluded], TextSource: "raw", RawTextVar: PILKADA.textCol },
    options: { TextLikelihood: KCONFIG[k].likelihood, TextAlpha: 1 },
    validation: { RandomSeed: 42 },
    text: KCONFIG[k].stwv,
  });
}

/** Meniru container NB (naive-bayes-main.tsx): slice target + prediktor (+ kolom vektor) lewat getSlicedData; teks mentah dari sel asli. */
export async function runNaiveBayesApp(params: { data: string[][]; variables: Variable[]; configData: NaiveBayesType }): Promise<NaiveBayesRawResult> {
  const { data, variables, configData } = params;
  const main: NaiveBayesMainType = configData.main;
  const vectorColumns = getEffectiveTextSource(main) === "vector" ? getTextColumnNames(main) : [];
  const selected = main.TargetVar ? [main.TargetVar, ...getEffectivePredictors(main, variables), ...vectorColumns] : [];
  const dataVariables = getSlicedData({ dataVariables: data, variables, selectedVariables: selected });
  let rawTextValues: (string | null)[] | undefined;
  if (getEffectiveTextSource(main) === "raw" && main.RawTextVar) {
    const column = variables.find((v) => v.name === main.RawTextVar)?.columnIndex;
    const rowCount = Array.isArray(dataVariables[0]) ? dataVariables[0].length : 0;
    if (column !== undefined) rawTextValues = Array.from({ length: rowCount }, (_, i) => data[i]?.[column] ?? null);
  }
  return analyzeNaiveBayes({ configData, dataVariables, variables, rawTextValues });
}

/** Latih NB (Raw Text) pada pilkada_train lewat alur aplikasi. */
export async function trainPilkadaRaw(train: Csv, k: KName) {
  const variables = makeVariables(train.header, train.rows, pilkadaOverrides());
  const configData = nbRawConfig(k);
  const raw = await runNaiveBayesApp({ data: train.rows, variables, configData });
  return { raw, configData, variables };
}

/** Teks berkas Export Model: persis export-model-output.tsx#downloadJson. */
export const exportModelText = (raw: NaiveBayesRawResult): string => JSON.stringify(raw.trained_model, null, 2);

// ---------------------------------------------------------------------------
// Apply Model
// ---------------------------------------------------------------------------
/** Memuat model lewat loadModelFromFile ASLI (adapter validateAnyModel); melempar bila gagal. */
export async function loadModel(fileName: string, text: string): Promise<ModelLoadSuccess> {
  const res = await loadModelFromFile(fileLike(fileName, text));
  if (!res.ok) throw new Error("loadModelFromFile gagal: " + JSON.stringify(res.errors));
  return res;
}

export type ApplyResult = {
  summary: Awaited<ReturnType<typeof applyModel>>;
  definitions: AddVariablesCall[0];
  updates: CellUpdate[];
  statistics: Array<{ title: string; description: string; components: string; tables: Table[] }>;
};

/** Menjalankan applyModel ASLI untuk model Raw Text (pemetaan seperti hasil auto-map tab Variables: RawTextVar = kolom teks). */
export async function applyRawModelApp(params: {
  loaded: ModelLoadSuccess;
  data: string[][];
  variables: Variable[];
  actual?: string | null;
  rawTextVar?: string;
  saveClassProbabilities?: boolean;
}): Promise<ApplyResult> {
  const { loaded, data, variables } = params;
  variableState.variables = variables;
  variableState.addVariables.mockClear();
  const form = JSON.parse(JSON.stringify(ApplyModelDefault)) as ApplyModelType;
  form.model = { SourceKind: "file", SourceRef: loaded.sourceRef, SourceLabel: loaded.sourceLabel, ModelJson: loaded.model };
  form.variables = {
    FeatureMapping: {},
    ActualTargetVar: params.actual === undefined ? PILKADA.labelCol : params.actual,
    RawTextVar: params.rawTextVar ?? PILKADA.textCol,
    VectorMapping: {},
  };
  form.save.SaveClassProbabilities = params.saveClassProbabilities ?? true;
  const before = resultStore.statistics().length;
  const summary = await applyModel({ formData: form, variables, dataVariables: data });
  const calls = variableState.addVariables.mock.calls as unknown as AddVariablesCall[];
  const [definitions, updates] = calls[calls.length - 1];
  const statistics = resultStore.statistics().slice(before).map((s) => ({
    title: s.title,
    description: s.description,
    components: s.components,
    tables: (JSON.parse(s.output_data) as { tables: Table[] }).tables,
  }));
  return { summary, definitions, updates, statistics };
}

export const rowOf = (table: Table, header: string) => table.rows.find((r) => r.rowHeader?.[0] === header);
export const valueOf = (table: Table, header: string) => rowOf(table, header)?.value;
export const rowsOf = (table: Table, header: string) => table.rows.filter((r) => r.rowHeader?.[0] === header);
