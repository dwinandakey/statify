// statify_wasm.mjs — pustaka headless Track D: memanggil BINER WASM YANG SAMA dengan aplikasi Statify
// (STWV, Naive Bayes, Apply Model) dari Node.js, tanpa menulis ulang rumus.
//
// - ESM murni, tanpa dependensi npm (hanya modul bawaan Node: fs, path, url, crypto, os).
// - Jalur wasm dihitung relatif terhadap posisi berkas ini (…/testing/thesis-eval/headless/ -> akar repo),
//   jadi berjalan di Linux dan Windows. Override: env STATIFY_REPO_ROOT.
// - Pembangun payload meniru persis kode TypeScript aplikasi (lihat komentar "PORT:" di tiap fungsi).
//   Yang DIPORT (bukan diimpor, karena TS dengan alias `@/` tidak bisa dimuat Node polos):
//     getSlicedData/getVarDefs (hooks/useVariable.ts), toRustConfig (STWV/config.ts),
//     buildNaiveBayesWorkerConfig/buildNaiveBayesTextPayload/splitNaiveBayesDataVariables
//     (naive-bayes/services/naive-bayes-analysis.ts), getEffective* (naive-bayes/hooks/useNaiveBayesValidation.ts),
//     bagian pembentukan payload dari apply-model/services/apply-model-analysis.ts.
//   Kesetaraan dengan TS diuji oleh tes Jest accuracy/__tests__ (payload_equivalence) bila dijalankan.
// - Yang TIDAK dijalankan headless: validasi adapter TS (validateAnyModel), penulisan Output Viewer/dataset.
//   Wasm AM melakukan validasi modelnya sendiri (kode AM_E_*).
//
// API ringkas (lihat README.md untuk detail):
//   repoRoot, wasmInfo(), logWasmInfo()
//   readCsv(path) / parseCsv(text)           -> string[][] (semua sel string, seperti data impor aplikasi)
//   makeVariables(header, rows, overrides)   -> Variable[] ala aplikasi
//   STWV_DEFAULT_CONFIG, toRustConfig(cfg), stwvConfigFor(name)
//   stwvTransform(docs, rustConfig)          -> { vocabulary, matrix, stats }   (wasm STWV)
//   buildNaiveBayesPayload({...})            -> payload worker NB
//   naiveBayesRun(payload)                   -> { data, errors }                 (wasm NB)
//   exportModel(rawResult)                   -> { json, model }                  (meniru tombol Export Model)
//   buildApplyModelPayload({...})            -> payload worker AM
//   applyModelRun(payload)                   -> { data, errors }                 (wasm AM)
//   runTrainApply({...})                     -> alur lengkap latih -> Export Model -> Apply Model
//   KONFIGURASI (K1..K6, varian w)           -> definisi konfigurasi evaluasi
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// Jalur & provenans wasm
// ---------------------------------------------------------------------------
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = process.env.STATIFY_REPO_ROOT
  ? path.resolve(process.env.STATIFY_REPO_ROOT)
  : path.resolve(HERE, "..", "..", "..");
const FE = path.join(repoRoot, "frontend");

export const WASM_PATHS = {
  stwv: {
    glue: path.join(FE, "components", "Modals", "Transform", "StringToWordVector", "wasm-output", "statify_string_to_word.js"),
    wasm: path.join(FE, "components", "Modals", "Transform", "StringToWordVector", "wasm-output", "statify_string_to_word_bg.wasm"),
  },
  nb: {
    glue: path.join(FE, "public", "workers", "Classify", "NaiveBayes", "pkg", "wasm.js"),
    wasm: path.join(FE, "public", "workers", "Classify", "NaiveBayes", "pkg", "wasm_bg.wasm"),
  },
  am: {
    glue: path.join(FE, "public", "workers", "Classify", "ApplyModel", "pkg", "wasm.js"),
    wasm: path.join(FE, "public", "workers", "Classify", "ApplyModel", "pkg", "wasm_bg.wasm"),
  },
};

export function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/** Provenans ketiga wasm: path relatif repo, ukuran, sha256 (biner dan glue JS). */
export function wasmInfo() {
  const out = {};
  for (const [k, v] of Object.entries(WASM_PATHS)) {
    out[k] = {
      wasm: path.relative(repoRoot, v.wasm).split(path.sep).join("/"),
      bytes: fs.statSync(v.wasm).size,
      sha256: sha256File(v.wasm),
      glue_sha256: sha256File(v.glue),
    };
  }
  return out;
}

export function envInfo() {
  return {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0]?.model ?? "?",
    cpus: os.cpus().length,
    repoRoot,
  };
}

/** Cetak sha256 wasm yang dipakai (dipanggil di awal setiap skrip agar masuk log). */
export function logWasmInfo(logger = console.log) {
  const info = wasmInfo();
  const env = envInfo();
  logger(`[statify_wasm] node=${env.node} ${env.platform} (${env.os}) repo=${env.repoRoot}`);
  for (const [k, v] of Object.entries(info)) {
    logger(`[statify_wasm] ${k.padEnd(4)} sha256=${v.sha256} bytes=${v.bytes} file=${v.wasm}`);
  }
  return info;
}

const loaded = {};
async function loadModule(key) {
  if (loaded[key]) return loaded[key];
  const { glue, wasm } = WASM_PATHS[key];
  if (!fs.existsSync(glue) || !fs.existsSync(wasm)) {
    throw new Error(`Berkas wasm '${key}' tidak ditemukan: ${wasm}`);
  }
  const mod = await import(pathToFileURL(glue).href);
  mod.initSync({ module: new Uint8Array(fs.readFileSync(wasm)) });
  loaded[key] = mod;
  return mod;
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180) — semua sel berupa string, seperti data impor aplikasi
// ---------------------------------------------------------------------------
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function readCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  return { header: rows[0], rows: rows.slice(1) };
}

/** Tulis CSV (kutip bila perlu). `rows` = array of array. */
export function toCsv(rows) {
  const q = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(q).join(",")).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Variabel dataset ala aplikasi
// ---------------------------------------------------------------------------
/**
 * Membentuk `Variable[]` (types/Variable.ts) dari header CSV. Tipe: NUMERIC/scale bila semua sel tak kosong
 * numerik, selain itu STRING/nominal. `overrides[nama] = {type?, measure?, role?}`.
 */
export function makeVariables(header, rows, overrides = {}) {
  return header.map((name, columnIndex) => {
    const cells = rows.map((r) => r[columnIndex]).filter((v) => v !== undefined && v !== "");
    const numeric = cells.length > 0 && cells.every((v) => Number.isFinite(Number(String(v).replace(",", "."))));
    const ov = overrides[name] ?? {};
    return {
      id: columnIndex,
      columnIndex,
      name,
      type: ov.type ?? (numeric ? "NUMERIC" : "STRING"),
      width: 8,
      decimals: 0,
      label: "",
      values: [],
      missing: null,
      columns: 8,
      align: "left",
      measure: ov.measure ?? (numeric ? "scale" : "nominal"),
      role: ov.role ?? "input",
    };
  });
}

// ---------------------------------------------------------------------------
// PORT: hooks/useVariable.ts (getSlicedData, getVarDefs)
// ---------------------------------------------------------------------------
function normalizeSelectedVariables(sel) {
  if (!sel) return [];
  return Array.isArray(sel) ? sel : [sel];
}
function parseCellValue(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw);
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isNaN(n) ? s : n;
}
export function getMaxIndex({ dataVariables, variables, selectedVariables }) {
  const names = normalizeSelectedVariables(selectedVariables);
  if (names.length === 0 || dataVariables.length === 0) return 0;
  const idx = new Map(variables.map((v) => [v.name, v.columnIndex]));
  let maxIndex = -1;
  dataVariables.forEach((row, rowIndex) => {
    if (!row) return;
    let hasData = false;
    for (const name of names) {
      const c = idx.get(name);
      if (c === undefined || c < 0) continue;
      const raw = row[c];
      if (raw !== undefined && raw !== null && raw !== "") { hasData = true; break; }
    }
    if (hasData) maxIndex = rowIndex;
  });
  if (maxIndex < 0) maxIndex = 0;
  return maxIndex;
}
export function getSlicedData({ dataVariables, variables, selectedVariables }) {
  const names = normalizeSelectedVariables(selectedVariables);
  if (names.length === 0 || dataVariables.length === 0) return [];
  const idx = new Map(variables.map((v) => [v.name, v.columnIndex]));
  const maxIndex = getMaxIndex({ dataVariables, variables, selectedVariables: names });
  return names.map((name) => {
    const c = idx.get(name);
    const col = [];
    for (let i = 0; i <= maxIndex; i++) {
      const row = dataVariables[i];
      const raw = c === undefined || !row ? null : row[c];
      col.push({ [name]: parseCellValue(raw) });
    }
    return col;
  });
}
export function getVarDefs(variables, selectedVariables) {
  if (!selectedVariables) return [];
  const names = Array.isArray(selectedVariables) ? selectedVariables : [selectedVariables];
  return names.map((name) => {
    const d = variables.find((v) => v.name === name);
    const values = Array.isArray(d?.values)
      ? d.values.map((vl) => ({
          id: vl?.id,
          variable_name: d?.name ?? name,
          value: vl?.value ?? null,
          label: vl?.label ?? String(vl?.value ?? ""),
        }))
      : [];
    const obj = {
      id: d?.id != null ? Number(d.id) : undefined,
      columnIndex: Number(d?.columnIndex ?? 0),
      name: d?.name ?? "",
      type: d?.type ?? "STRING",
      width: Number(d?.width ?? 0),
      decimals: Number(d?.decimals ?? 0),
      label: d?.label ?? "",
      values,
      missing: [],
      columns: Number(d?.columns ?? 0),
      align: d?.align ?? "left",
      measure: d?.measure ?? "unknown",
      role: d?.role ?? "none",
    };
    return [obj];
  });
}

// ---------------------------------------------------------------------------
// PORT: STWV/config.ts (STWV_DEFAULT_CONFIG, toRustConfig) + constants/stopwords.ts
// ---------------------------------------------------------------------------
export const STWV_DEFAULT_CONFIG = Object.freeze({
  lowercase: true,
  stopwords: { method: "none", customList: "ada\nadalah\nadanya\nadapun\nagak\nagaknya\nagar\nakan\nakankah\nakhir\nakhiri" },
  stemming: { method: "none" },
  tokenizer: { type: "word", minSize: 1, maxSize: 2 },
  delimiters: "[\\s.,;:'\"()?!]+",
  formulaStandard: "weka",
  vectorization: { tfMethod: "raw", idfMethod: "none", normalization: "none" },
  wordsToKeep: 1000,
  minTermFreq: 1,
});

let stopwordCache = null;
function loadStopwordLists() {
  if (stopwordCache) return stopwordCache;
  const file = path.join(FE, "components", "Modals", "Transform", "StringToWordVector", "constants", "stopwords.ts");
  const src = fs.readFileSync(file, "utf8");
  const grab = (name) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`));
    if (!m) throw new Error(`${name} tidak ditemukan di ${file}`);
    return JSON.parse(m[1]);
  };
  stopwordCache = { indonesian: grab("INDONESIAN_STOPWORDS"), english: grab("ENGLISH_STOPWORDS") };
  return stopwordCache;
}

function buildCustomStopwords(config) {
  switch (config.stopwords.method) {
    case "indonesian": return JSON.stringify(loadStopwordLists().indonesian);
    case "english": return JSON.stringify(loadStopwordLists().english);
    case "custom":
      return JSON.stringify(config.stopwords.customList.split("\n").map((s) => s.trim()).filter(Boolean));
    default: return null;
  }
}

/** PORT persis dari `toRustConfig` (STWV/config.ts). */
export function toRustConfig(config) {
  const isNgram = config.tokenizer.type === "ngram";
  return {
    lowercase: config.lowercase,
    stemming_method: config.stemming.method,
    stopwords_method: config.stopwords.method,
    custom_stopwords: buildCustomStopwords(config),
    delimiters: config.delimiters,
    ngram_min: isNgram ? config.tokenizer.minSize : 1,
    ngram_max: isNgram ? config.tokenizer.maxSize : 1,
    formula_standard: config.formulaStandard,
    tf_method: config.vectorization.tfMethod,
    idf_method: config.vectorization.idfMethod,
    normalization: config.vectorization.normalization,
    words_to_keep: config.wordsToKeep,
    min_term_freq: config.minTermFreq,
  };
}

/** Salinan dalam config STWV dengan penimpaan dangkal per-bagian: stwvOverride({wordsToKeep:0, vectorization:{tfMethod:"log1p"}}). */
export function stwvOverride(over = {}) {
  const base = JSON.parse(JSON.stringify(STWV_DEFAULT_CONFIG));
  const out = { ...base, ...over };
  for (const k of ["stopwords", "stemming", "tokenizer", "vectorization"]) out[k] = { ...base[k], ...(over[k] ?? {}) };
  return out;
}

// ---------------------------------------------------------------------------
// Definisi konfigurasi evaluasi (Track D)
// ---------------------------------------------------------------------------
/**
 * K1..K6 persis seperti prompt + varian "w" (wordsToKeep = 0 = seluruh kosakata) untuk menetralkan aturan
 * seri/pemotongan Words-to-Keep saat dibandingkan dengan WEKA (yang menyimpan semua kata seri di batas).
 * `likelihood` = NaiveBayesOptions.TextLikelihood. `alpha` = TextAlpha.
 */
export const KONFIGURASI = {
  K1: { desc: "Weka default (lowercase, delimiter default, W=1000, TF hitungan, tanpa IDF/normalisasi) + Multinomial, alpha 1", stwv: stwvOverride(), likelihood: "multinomial", alpha: 1 },
  K2: { desc: "K1 + Bernoulli", stwv: stwvOverride(), likelihood: "bernoulli", alpha: 1 },
  K3: { desc: "K1 + Complement", stwv: stwvOverride(), likelihood: "complement", alpha: 1 },
  K4: { desc: "scikit-learn standar (hitungan, IDF smooth, L2) + Multinomial", stwv: stwvOverride({ formulaStandard: "sklearn", vectorization: { tfMethod: "raw", idfMethod: "smooth", normalization: "l2" } }), likelihood: "multinomial", alpha: 1 },
  K5: { desc: "Weka: TF log(1+f), IDF ln(N/df), normalisasi panjang dokumen + Multinomial", stwv: stwvOverride({ vectorization: { tfMethod: "log1p", idfMethod: "standard", normalization: "doc_length" } }), likelihood: "multinomial", alpha: 1 },
  K6: { desc: "K1 + stopword Indonesia + stemming Sastrawi (hanya antarjalur Statify)", stwv: stwvOverride({ stopwords: { method: "indonesian" }, stemming: { method: "indonesian" } }), likelihood: "multinomial", alpha: 1 },
};
for (const k of ["K1", "K3", "K4", "K5"]) {
  const base = KONFIGURASI[k];
  KONFIGURASI[`${k}w`] = { ...base, desc: `${base.desc} [varian w: Words to Keep = 0 (seluruh kosakata)]`, stwv: { ...base.stwv, wordsToKeep: 0 } };
}
// Varian "m": Words to Keep = 1042 — KHUSUS pilkada. WEKA (-W 1000 -O) menyimpan semua kata berhitungan >= 2
// (1042 kata; weka/00_ENV_dan_pemetaan_opsi.md bagian 3.4). Karena batas 1042 jatuh tepat di ujung kelompok seri
// (601 kata berhitungan >= 3 + 441 kata berhitungan = 2), Statify dengan W=1042 memilih himpunan kata yang sama
// persis tanpa bergantung pada aturan pemutus seri.
for (const k of ["K1", "K2", "K5"]) {
  const base = KONFIGURASI[k];
  KONFIGURASI[`${k}m`] = { ...base, desc: `${base.desc} [varian m: Words to Keep = 1042 (= kosakata WEKA pada pilkada)]`, stwv: { ...base.stwv, wordsToKeep: 1042 } };
}
KONFIGURASI.K2w = { ...KONFIGURASI.K2, desc: `${KONFIGURASI.K2.desc} [varian w: Words to Keep = 0]`, stwv: { ...KONFIGURASI.K2.stwv, wordsToKeep: 0 } };

// ---------------------------------------------------------------------------
// STWV
// ---------------------------------------------------------------------------
/** Menjalankan `process_text_data` wasm STWV persis seperti worker `stringToWord.processor.ts`. */
export async function stwvTransform(docs, rustConfig) {
  const mod = await loadModule("stwv");
  return mod.process_text_data(docs, rustConfig);
}

// ---------------------------------------------------------------------------
// Naive Bayes
// ---------------------------------------------------------------------------
/** Salinan dari NaiveBayesDefault (constants/naive-bayes-default.ts); `text` = konfigurasi STWV UI. */
export function naiveBayesDefault() {
  return {
    main: {
      TargetVar: null, SpecificationMode: "exclude", ExcludedVar: null, CandidateFactors: null, CandidateCovariates: null,
      TextSource: "none", RawTextVar: null, TextVectorVars: null,
    },
    options: {
      MissingValuePolicy: "exclude", UnseenCategoryPolicy: "smoothing", SmoothingAlpha: 1, VarianceFloor: 1e-9,
      NumericLikelihood: "gaussian", NumericLikelihoodOverrides: {}, TextLikelihood: "multinomial", TextAlpha: 1,
    },
    validation: { ValidationMethod: "holdout", TrainingPercentage: 70, KFolds: 10, RandomSeed: null },
    output: {
      CaseProcessingSummary: true, AttributeDistributionTable: true, ModelEvaluationMetrics: true, ConfusionMatrix: true,
      TextFeatureTable: true, TextTopK: 100,
    },
    text: JSON.parse(JSON.stringify(STWV_DEFAULT_CONFIG)),
  };
}

// PORT: naive-bayes/hooks/useNaiveBayesValidation.ts
export function getEffectiveTextSource(main) {
  if (main.RawTextVar) return "raw";
  if ((main.TextVectorVars ?? []).length > 0) return "vector";
  return "none";
}
export function getTextColumnNames(main) {
  const s = getEffectiveTextSource(main);
  if (s === "raw") return [main.RawTextVar];
  if (s === "vector") return [...(main.TextVectorVars ?? [])];
  return [];
}
export function getEffectivePredictors(main, variables) {
  const target = main.TargetVar;
  const mode = main.SpecificationMode ?? "exclude";
  if (mode === "candidates") return [...(main.CandidateFactors ?? []), ...(main.CandidateCovariates ?? [])];
  const excluded = new Set(main.ExcludedVar ?? []);
  if (main.RawTextVar) excluded.add(main.RawTextVar);
  for (const n of main.TextVectorVars ?? []) excluded.add(n);
  return variables.filter((v) => v.measure !== "unknown").map((v) => v.name).filter((n) => n !== target && !excluded.has(n));
}

// PORT: naive-bayes/services/naive-bayes-analysis.ts
const TEXT_TOP_K_MIN = 1, TEXT_TOP_K_MAX = 1000, TEXT_TOP_K_DEFAULT = 100;
export function buildNaiveBayesWorkerConfig(configData) {
  const { text, ...rest } = configData;
  const effectiveSource = getEffectiveTextSource(rest.main);
  const topK = rest.output.TextTopK;
  const safeTopK = Number.isInteger(topK) && topK >= TEXT_TOP_K_MIN && topK <= TEXT_TOP_K_MAX ? topK : TEXT_TOP_K_DEFAULT;
  return {
    ...rest,
    main: { ...rest.main, TextSource: effectiveSource },
    output: { ...rest.output, TextTopK: safeTopK },
    Text: effectiveSource === "raw" ? toRustConfig(text) : null,
  };
}
export function buildNaiveBayesTextPayload(main, textSlices, rowCount, rawTextValues) {
  const source = getEffectiveTextSource(main);
  const names = getTextColumnNames(main);
  if (source === "none" || names.length === 0) return { source: "none" };
  if (source === "raw") {
    if (!rawTextValues) throw new Error("NB_E_TEXT_RAW_MISSING: The text of the Raw Text Variable was not provided.");
    const values = [];
    for (let r = 0; r < rowCount; r++) {
      const v = rawTextValues[r];
      const teks = v === null || v === undefined ? "" : String(v);
      values.push(teks.trim() === "" ? null : teks);
    }
    return { source: "raw", variable: names[0], values };
  }
  const cell = (col, row) => textSlices[col]?.[row]?.[names[col]] ?? null;
  const values = [];
  for (let r = 0; r < rowCount; r++) {
    const row = [];
    for (let c = 0; c < names.length; c++) {
      const v = cell(c, r);
      row.push(typeof v === "number" && Number.isFinite(v) ? v : null);
    }
    values.push(row);
  }
  return { source: "vector", columns: names, values };
}
export function splitNaiveBayesDataVariables(dataVariables, main, variables) {
  const targetNames = main.TargetVar ? [main.TargetVar] : [];
  const predictorNames = getEffectivePredictors(main, variables);
  const textNames = getEffectiveTextSource(main) === "vector" ? getTextColumnNames(main) : [];
  const columns = Array.isArray(dataVariables) ? dataVariables : [];
  const t = targetNames.length;
  const p = t + predictorNames.length;
  const targetSlices = columns.slice(0, t);
  return {
    targetNames, predictorNames, textNames, targetSlices,
    predictorSlices: columns.slice(t, p),
    textSlices: columns.slice(p, p + textNames.length),
    rowCount: Array.isArray(targetSlices[0]) ? targetSlices[0].length : 0,
  };
}

/**
 * Meniru container NB (`naive-bayes-main.tsx`) + `analyzeNaiveBayes`: membentuk payload yang dikirim ke worker.
 * @param {object} p
 * @param {string[][]} p.data       isi dataset (baris x kolom, semua string)
 * @param {object[]}   p.variables  Variable[] (lihat makeVariables)
 * @param {object}     p.configData NaiveBayesType (lihat naiveBayesDefault); `configData.text` = StwvConfig
 * @returns {{target, predictors, targetDefs, predictorsDefs, config, text}}
 */
export function buildNaiveBayesPayload({ data, variables, configData }) {
  const main = configData.main;
  const predictorNames = getEffectivePredictors(main, variables);
  const textVecNames = getEffectiveTextSource(main) === "vector" ? getTextColumnNames(main) : [];
  const selected = [...(main.TargetVar ? [main.TargetVar] : []), ...predictorNames, ...textVecNames];
  const dataVariables = getSlicedData({ dataVariables: data, variables, selectedVariables: selected });
  const split = splitNaiveBayesDataVariables(dataVariables, main, variables);
  // rawTextValues: nilai asli sel (tanpa parseFloat), sejajar baris target (container N7).
  let rawTextValues;
  if (getEffectiveTextSource(main) === "raw") {
    const col = variables.find((v) => v.name === main.RawTextVar)?.columnIndex;
    if (col === undefined) throw new Error(`Raw Text Variable '${main.RawTextVar}' tidak ada di dataset`);
    rawTextValues = data.map((r) => r[col]);
  }
  const textPayload = buildNaiveBayesTextPayload(main, split.textSlices, split.rowCount, rawTextValues);
  return {
    target: split.targetSlices,
    predictors: split.predictorSlices,
    targetDefs: getVarDefs(variables, split.targetNames),
    predictorsDefs: getVarDefs(variables, split.predictorNames),
    config: buildNaiveBayesWorkerConfig(configData),
    text: textPayload,
  };
}

/** Menjalankan `NaiveBayesAnalysis` wasm persis seperti `naive-bayes.worker.js`. Melempar bila konstruktor gagal. */
export async function naiveBayesRun(payload) {
  const mod = await loadModule("nb");
  const { target, predictors, targetDefs, predictorsDefs, config, text } = payload;
  const nb = new mod.NaiveBayesAnalysis(target, predictors, targetDefs, predictorsDefs, config, text);
  try {
    return { data: nb.get_formatted_results(), errors: nb.get_all_errors() };
  } finally {
    nb.free();
  }
}

/** Meniru tombol Export Model (`export-model-output.tsx#downloadJson`): JSON.stringify(trained_model, null, 2). */
export function exportModel(rawResult) {
  if (!rawResult || !rawResult.trained_model) throw new Error("trained_model tidak ada di hasil NB (model gagal dilatih)");
  const json = JSON.stringify(rawResult.trained_model, null, 2);
  return { json, model: JSON.parse(json) };
}

// ---------------------------------------------------------------------------
// Apply Model
// ---------------------------------------------------------------------------
/** PORT: apply-model-analysis.ts#readRawTextValues */
export function readRawTextValues(dataVariables, columnIndex, minLength) {
  const values = [];
  let lastFilled = -1;
  dataVariables.forEach((row, index) => {
    const cell = row?.[columnIndex];
    const text = cell === null || cell === undefined ? "" : String(cell);
    if (text.trim() === "") values.push(null);
    else { values.push(text); lastFilled = index; }
  });
  const length = Math.max(minLength, lastFilled + 1);
  values.length = Math.min(values.length, length);
  while (values.length < length) values.push(null);
  return values;
}
const toVectorCell = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * PORT bagian pembentukan payload dari `applyModel` (apply-model-analysis.ts). Deskriptor fitur diturunkan dari
 * `model.feature_order` dan blok `model.text` (setara `buildDescriptor` di naive-bayes-adapter.ts).
 * @param {object} p
 * @param {object}     p.model      objek model hasil Export Model (JSON.parse)
 * @param {string[][]} p.data       dataset yang akan diprediksi
 * @param {object[]}   p.variables
 * @param {object}     p.mapping    { FeatureMapping:{fitur->variabel}, ActualTargetVar, RawTextVar, VectorMapping }
 */
export function buildApplyModelPayload({ model, data, variables, mapping: form }) {
  const features = (model.feature_order ?? []).map((name) => ({ name }));
  const text = model.schema_version === "2.0" && model.text ? model.text : null;
  const mapping = features.map((f) => {
    const variable = form.FeatureMapping?.[f.name] ?? null;
    if (variable === null) throw new Error(`AM_E_MAP_UNMAPPED: ${f.name}`);
    return { feature: f.name, variable };
  });
  const mappedVariables = mapping.map((e) => e.variable);
  const actualVariable = form.ActualTargetVar ?? null;

  let rawTextColumnIndex = null;
  const vectorEntries = [];
  if (text?.source === "raw") {
    const rawVariable = form.RawTextVar ?? null;
    if (rawVariable === null) throw new Error(`AM_E_MAP_RAW_TEXT_UNMAPPED: ${text.raw_variable ?? ""}`);
    const def = variables.find((v) => v.name === rawVariable);
    if (!def) throw new Error(`AM_E_MAP_VAR_NOT_FOUND: ${rawVariable}`);
    rawTextColumnIndex = def.columnIndex;
  } else if (text?.source === "vector") {
    const vm = form.VectorMapping ?? {};
    (text.columns ?? []).forEach((column, modelIndex) => {
      const variable = vm[column] ?? null;
      if (variable !== null) vectorEntries.push({ modelIndex, variable });
    });
  }
  const vectorVariables = vectorEntries.map((e) => e.variable);
  const selectedVariables = [...mappedVariables, ...vectorVariables, ...(actualVariable === null ? [] : [actualVariable])];
  const rowCarrier = selectedVariables.length === 0 && text?.source === "vector" ? (variables[0]?.name ?? null) : null;
  const slices = getSlicedData({ dataVariables: data, variables, selectedVariables: rowCarrier === null ? selectedVariables : [rowCarrier] });
  if (slices.length === 0 && rawTextColumnIndex === null) throw new Error("AM_E_NO_ROWS");
  const sliceRows = slices[0]?.length ?? 0;

  let textPayload;
  if (text?.source === "raw" && rawTextColumnIndex !== null) {
    const values = readRawTextValues(data, rawTextColumnIndex, sliceRows);
    if (values.length === 0) throw new Error("AM_E_NO_ROWS");
    textPayload = { source: "raw", values };
  } else if (text?.source === "vector") {
    const vectorSlices = slices.slice(mappedVariables.length, mappedVariables.length + vectorVariables.length);
    const values = [];
    for (let row = 0; row < sliceRows; row++) {
      values.push(vectorEntries.map((entry, column) => toVectorCell(vectorSlices[column]?.[row]?.[entry.variable])));
    }
    textPayload = { source: "vector", mapped_columns: vectorEntries.map((e) => e.modelIndex), values };
  }
  const actualSliceIndex = mappedVariables.length + vectorVariables.length;
  return {
    predictors: slices.slice(0, mappedVariables.length),
    predictorDefs: getVarDefs(variables, mappedVariables),
    mapping,
    actual: actualVariable === null ? [] : [slices[actualSliceIndex]],
    actualDefs: actualVariable === null ? [] : getVarDefs(variables, [actualVariable]),
    model,
    ...(textPayload === undefined ? {} : { text: textPayload }),
  };
}

/** Menjalankan `ApplyModelAnalysis` wasm persis seperti `apply-model.worker.js`. */
export async function applyModelRun(payload) {
  const mod = await loadModule("am");
  const am = new mod.ApplyModelAnalysis(
    payload.predictors, payload.predictorDefs, payload.mapping, payload.actual, payload.actualDefs, payload.model, payload.text,
  );
  try {
    return { data: am.get_formatted_results(), errors: am.get_all_errors() };
  } finally {
    am.free();
  }
}

// ---------------------------------------------------------------------------
// Alur lengkap: latih (NB) -> Export Model -> Apply Model
// ---------------------------------------------------------------------------
/**
 * Alur utama Track D (jalur Raw Text, tanpa kebocoran: resep STWV dibentuk dari data latih saja).
 * @param {object} p
 * @param {{header:string[], rows:string[][]}} p.train
 * @param {{header:string[], rows:string[][]}} p.test
 * @param {string} p.textCol    nama kolom teks (Raw Text Variable)
 * @param {string} p.labelCol   nama kolom kelas
 * @param {string[]} [p.excluded]  kolom yang dikeluarkan dari prediktor (Id, dll.)
 * @param {object} p.kconfig    salah satu nilai KONFIGURASI
 * @param {number} [p.seed=42]
 * @param {object} [p.nbMainOverrides]
 * @returns {Promise<{nb, model, modelJson, am, predicted:string[], maxProb:number[], classes:string[], classProb:number[][], timings}>}
 */
export async function runTrainApply({ train, test, textCol, labelCol, excluded = [], kconfig, seed = 42 }) {
  const varsTrain = makeVariables(train.header, train.rows, { [textCol]: { type: "STRING", measure: "nominal" }, [labelCol]: { type: "STRING", measure: "nominal" } });
  const cfg = naiveBayesDefault();
  cfg.main.TargetVar = labelCol;
  cfg.main.RawTextVar = textCol;
  cfg.main.TextSource = "raw";
  cfg.main.ExcludedVar = excluded.length ? [...excluded] : null;
  cfg.options.TextLikelihood = kconfig.likelihood;
  cfg.options.TextAlpha = kconfig.alpha;
  cfg.validation.RandomSeed = seed;
  cfg.text = JSON.parse(JSON.stringify(kconfig.stwv));

  const t0 = performance.now();
  const nbPayload = buildNaiveBayesPayload({ data: train.rows, variables: varsTrain, configData: cfg });
  const nb = await naiveBayesRun(nbPayload);
  const t1 = performance.now();
  const { json, model } = exportModel(nb.data);

  const varsTest = makeVariables(test.header, test.rows, { [textCol]: { type: "STRING", measure: "nominal" }, [labelCol]: { type: "STRING", measure: "nominal" } });
  const amPayload = buildApplyModelPayload({
    model, data: test.rows, variables: varsTest,
    mapping: { FeatureMapping: {}, ActualTargetVar: labelCol, RawTextVar: textCol, VectorMapping: {} },
  });
  const am = await applyModelRun(amPayload);
  const t2 = performance.now();
  const pred = am.data.predictions;
  return {
    nb, model, modelJson: json, am,
    predicted: pred.predicted,
    maxProb: pred.max_probability,
    classes: am.data.prediction_distribution.classes,
    classProb: pred.class_probabilities, // [kelasIdx][baris], dibulatkan 4 desimal oleh AM (round4)
    timings: { train_ms: t1 - t0, apply_ms: t2 - t1 },
  };
}
