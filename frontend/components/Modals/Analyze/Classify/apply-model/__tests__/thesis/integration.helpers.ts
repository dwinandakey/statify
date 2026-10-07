// Pembantu bersama tes integrasi antarmenu Track F (IT-01..IT-05). Bukan berkas tes (tidak berakhiran .test.ts).
//
// Rantai yang dijalankan adalah KODE ASLI aplikasi + biner WASM ASLI:
//   STWV wasm (process_text_data)  ->  buildColumnData + processVariableName asli (penamaan kolom VEC_)
//   analyzeNaiveBayes asli (payload, transformNaiveBayesResult, resultNaiveBayes) dengan Worker pengganti yang
//     menjalankan wasm Naive Bayes sungguhan,
//   loadModelFromFile / loadModelFromResultStore asli (adapter validateAnyModel),
//   applyModel asli (payload, transformApplyModelResult, resultApplyModel, saveApplyModelVariables) dengan Worker
//     pengganti yang menjalankan wasm Apply Model sungguhan.
// Yang diganti HANYA: Worker (jalur pesan postMessage -> panggilan wasm langsung, persis isi worker produksi),
// store Zustand (pencatat), dan unduhan berkas (Blob). Rumus tidak ditulis ulang; satu-satunya perhitungan buatan
// sendiri adalah `referenceScores` (pembanding independen IT-03).
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { Variable } from "@/types/Variable";

// ---------------------------------------------------------------------------
// Lokasi repo
// ---------------------------------------------------------------------------
export function findFrontendRoot(start: string = __dirname): string {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, "stores", "useVariableStore.ts"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Folder frontend tidak ditemukan dari " + start);
}
export const repoRootDir = (): string => path.dirname(findFrontendRoot());
export const PILKADA = {
  train: () => path.join(repoRootDir(), "Claude outputs", "pilkada_train.csv"),
  test: () => path.join(repoRootDir(), "Claude outputs", "pilkada_test.csv"),
  accuracyOut: () => path.join(repoRootDir(), "testing", "thesis-eval", "accuracy", "out"),
  textCol: "Text Tweet",
  labelCol: "Sentiment",
  idCol: "Id",
  excluded: ["Id", "Pasangan Calon"],
};
export const pilkadaAvailable = (): boolean => {
  try {
    return fs.existsSync(PILKADA.train()) && fs.existsSync(PILKADA.test());
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// WASM generik (STWV, Naive Bayes, Apply Model): glue ES-module -> badan fungsi
// ---------------------------------------------------------------------------
export type WasmKey = "stwv" | "nb" | "am";
const SPEC: Record<WasmKey, { dir: string[]; glue: string; bin: string }> = {
  stwv: {
    dir: ["components", "Modals", "Transform", "StringToWordVector", "wasm-output"],
    glue: "statify_string_to_word.js",
    bin: "statify_string_to_word_bg.wasm",
  },
  nb: { dir: ["public", "workers", "Classify", "NaiveBayes", "pkg"], glue: "wasm.js", bin: "wasm_bg.wasm" },
  am: { dir: ["public", "workers", "Classify", "ApplyModel", "pkg"], glue: "wasm.js", bin: "wasm_bg.wasm" },
};
const dirOf = (key: WasmKey): string => path.join(findFrontendRoot(), ...SPEC[key].dir);

export function wasmAvailable(keys: WasmKey[] = ["stwv", "nb", "am"]): boolean {
  try {
    return keys.every((k) => fs.existsSync(path.join(dirOf(k), SPEC[k].glue)) && fs.existsSync(path.join(dirOf(k), SPEC[k].bin)));
  } catch {
    return false;
  }
}
export function wasmSha256(key: WasmKey): string {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(dirOf(key), SPEC[key].bin))).digest("hex");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WasmModule = Record<string, any>;
const wasmCache: Partial<Record<WasmKey, WasmModule>> = {};

/** Memuat (sekali) satu modul wasm. `resetWasm()` membuang cache supaya pemuatan berikutnya = instance baru (memori baru). */
export function loadWasm(key: WasmKey): WasmModule {
  const cached = wasmCache[key];
  if (cached) return cached;
  const glue = fs.readFileSync(path.join(dirOf(key), SPEC[key].glue), "utf8");
  const names = [...glue.matchAll(/^export (?:function|class) (\w+)/gm)].map((m) => m[1]);
  const body = glue
    .replace(/^export (function|class) /gm, "$1 ")
    .replace(/^export \{[^}]*\};?\s*$/m, "")
    .replace(/import\.meta\.url/g, "'file:///wasm.js'");
  if (/^\s*export\s/m.test(body) || /import\.meta/.test(body)) {
    throw new Error("Glue wasm memuat sintaks modul yang belum ditangani: " + key);
  }
  // eslint-disable-next-line no-new-func
  const factory = new Function(`"use strict";\n${body}\nreturn { ${[...names, "initSync"].join(", ")} };`);
  const mod = factory() as WasmModule;
  mod.initSync({ module: new Uint8Array(fs.readFileSync(path.join(dirOf(key), SPEC[key].bin))) });
  wasmCache[key] = mod;
  return mod;
}
export function resetWasm(): void {
  for (const k of Object.keys(wasmCache) as WasmKey[]) delete wasmCache[k];
}

// ---------------------------------------------------------------------------
// Worker pengganti (satu kelas untuk kedua worker; dipilih dari URL, seperti browser memilih berkas worker)
// ---------------------------------------------------------------------------
export type WorkerCall = { kind: "nb" | "am"; url: string; payload: Record<string, unknown> };
export const workerCalls: WorkerCall[] = [];

export class WasmBackedWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  private readonly kind: "nb" | "am";
  constructor(private readonly url: string) {
    this.kind = /NaiveBayes/i.test(String(url)) ? "nb" : "am";
  }
  postMessage(payload: Record<string, unknown>): void {
    workerCalls.push({ kind: this.kind, url: String(this.url), payload });
    let reply: unknown;
    try {
      if (this.kind === "nb") {
        const Analysis = loadWasm("nb").NaiveBayesAnalysis;
        const a = new Analysis(payload.target, payload.predictors, payload.targetDefs, payload.predictorsDefs, payload.config, payload.text);
        reply = { success: true, data: a.get_formatted_results(), errors: a.get_all_errors() };
        a.free();
      } else {
        const Analysis = loadWasm("am").ApplyModelAnalysis;
        const a = new Analysis(payload.predictors, payload.predictorDefs, payload.mapping, payload.actual, payload.actualDefs, payload.model, payload.text);
        reply = { success: true, data: a.get_formatted_results(), errors: a.get_all_errors() };
        a.free();
      }
    } catch (err) {
      reply = { success: false, error: err instanceof Error ? err.message : String(err) };
    }
    setTimeout(() => this.onmessage?.({ data: reply }), 0);
  }
  terminate(): void {}
}
export function installWasmWorkers(): void {
  (globalThis as unknown as { Worker: unknown }).Worker = WasmBackedWorker;
}

// ---------------------------------------------------------------------------
// Pencatat store (pengganti useResultStore / useVariableStore)
// ---------------------------------------------------------------------------
type FakeStatistic = { id: number; analyticId: number; title: string; description: string; components: string; output_data: string };
type FakeAnalytic = { id: number; logId: number; title: string; note?: string; statistics: FakeStatistic[] };
type FakeLog = { id: number; log: string; analytics: FakeAnalytic[] };

/** Result store dalam memori: cukup untuk resultNaiveBayes/resultApplyModel (menulis) dan loadModelFromResultStore (membaca). */
export function createFakeResultStore() {
  const logs: FakeLog[] = [];
  let nextId = 1;
  const state = {
    get logs() {
      return logs;
    },
    loadResults: async () => undefined,
    addLog: async ({ log }: { log: string }) => {
      const id = nextId++;
      logs.push({ id, log, analytics: [] });
      return id;
    },
    addAnalytic: async (logId: number, a: { title: string; note?: string }) => {
      const id = nextId++;
      logs.find((l) => l.id === logId)?.analytics.push({ id, logId, title: a.title, note: a.note, statistics: [] });
      return id;
    },
    addStatistic: async (analyticId: number, s: { title: string; description: string; components: string; output_data: string }) => {
      const id = nextId++;
      for (const l of logs) for (const an of l.analytics) if (an.id === analyticId) an.statistics.push({ id, analyticId, ...s });
      return id;
    },
  };
  const statistics = (): FakeStatistic[] => logs.flatMap((l) => l.analytics.flatMap((a) => a.statistics));
  return { state, statistics, reset: () => { logs.length = 0; nextId = 1; } };
}

export type CellUpdate = { row: number; col: number; value: string | number };
export type AddVariablesCall = [Array<Partial<Variable>>, CellUpdate[]];

/** Nilai satu kolom (indeks kolom dataset) dari daftar CellUpdate; sel tanpa update = null. */
export function columnValues(updates: CellUpdate[], col: number, rows: number): Array<string | number | null> {
  const out: Array<string | number | null> = Array(rows).fill(null);
  for (const u of updates) if (u.col === col) out[u.row] = u.value;
  return out;
}

// ---------------------------------------------------------------------------
// CSV dan variabel
// ---------------------------------------------------------------------------
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
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
export type Csv = { header: string[]; rows: string[][] };
export function readCsv(file: string): Csv {
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  return { header: rows[0], rows: rows.slice(1) };
}

export function makeVariables(header: string[], rows: string[][], overrides: Record<string, Partial<Variable>> = {}): Variable[] {
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
    } as Variable;
  });
}
export const pilkadaOverrides = (): Record<string, Partial<Variable>> => ({
  [PILKADA.textCol]: { type: "STRING", measure: "nominal" },
  [PILKADA.labelCol]: { type: "STRING", measure: "nominal" },
});

// ---------------------------------------------------------------------------
// Metrik, ketelitian, skor acuan
// ---------------------------------------------------------------------------
export function classificationMetrics(actual: string[], pred: Array<string | null>) {
  const classes = [...new Set([...actual, ...pred.filter((p): p is string => p !== null && p !== "")])].sort();
  const idx = new Map(classes.map((c, i) => [c, i]));
  const K = classes.length;
  const cm = Array.from({ length: K }, () => Array(K).fill(0) as number[]);
  let n = 0;
  actual.forEach((a, i) => {
    const p = pred[i];
    if (p === null || p === "" || a === "") return;
    cm[idx.get(a) as number][idx.get(p) as number]++;
    n++;
  });
  let correct = 0;
  for (let k = 0; k < K; k++) correct += cm[k][k];
  const po = correct / n;
  let pe = 0;
  for (let k = 0; k < K; k++) {
    const r = cm[k].reduce((s, v) => s + v, 0);
    let c = 0;
    for (let j = 0; j < K; j++) c += cm[j][k];
    pe += (r / n) * (c / n);
  }
  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  let f1sum = 0;
  for (let k = 0; k < K; k++) {
    const tp = cm[k][k];
    const r = cm[k].reduce((s, v) => s + v, 0);
    let c = 0;
    for (let j = 0; j < K; j++) c += cm[j][k];
    const prec = c === 0 ? 0 : tp / c;
    const rec = r === 0 ? 0 : tp / r;
    f1sum += prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
  }
  return { n, accuracy: po, kappa, macroF1: f1sum / K, classes, cm };
}

const f64 = new Float64Array(1);
const u64 = new BigUint64Array(f64.buffer);
export function bitsOf(x: number): string {
  f64[0] = x;
  return u64[0].toString(16).padStart(16, "0");
}
/** Semua angka dalam struktur JSON (urutan penelusuran tetap) sebagai jejak bit IEEE-754 heksadesimal. */
export function collectNumberBits(x: unknown, out: string[] = []): string[] {
  if (typeof x === "number") out.push(bitsOf(x));
  else if (Array.isArray(x)) x.forEach((v) => collectNumberBits(v, out));
  else if (x && typeof x === "object") Object.keys(x as object).forEach((k) => collectNumberBits((x as Record<string, unknown>)[k], out));
  return out;
}
export type DeepBitResult = { numbers: number; strings: number; nodes: number; diffs: string[]; maxAbs: number };
export function deepBitCompare(a: unknown, b: unknown, p = "$", acc: DeepBitResult = { numbers: 0, strings: 0, nodes: 0, diffs: [], maxAbs: 0 }): DeepBitResult {
  acc.nodes++;
  if (typeof a === "number" && typeof b === "number") {
    acc.numbers++;
    if (!Object.is(a, b)) { acc.diffs.push(`${p}: ${a} vs ${b}`); acc.maxAbs = Math.max(acc.maxAbs, Math.abs(a - b)); }
  } else if (typeof a === "string" && typeof b === "string") {
    acc.strings++;
    if (a !== b) acc.diffs.push(`${p}: "${a}" vs "${b}"`);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) acc.diffs.push(`${p}: panjang ${a.length} vs ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) deepBitCompare(a[i], b[i], `${p}[${i}]`, acc);
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.join("\u0000") !== kb.join("\u0000")) acc.diffs.push(`${p}: kunci ${JSON.stringify(ka.slice(0, 6))} vs ${JSON.stringify(kb.slice(0, 6))}`);
    for (const k of ka) if (k in (b as object)) deepBitCompare((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${p}.${k}`, acc);
  } else if (a !== b) {
    acc.diffs.push(`${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
  return acc;
}

/** round4 persis seperti apply-model/rust/src/stats/posterior.rs (nilai positif: Math.round == f64::round). */
export const round4 = (x: number): number => Math.round(x * 10000) / 10000;

type TextModelLike = {
  target: { classes: string[]; class_priors: number[] };
  text: { likelihood: string; uses_class_prior: boolean; log_weights: Record<string, number[]>; log_weights_absent?: Record<string, number[]> | null };
};
/**
 * Posterior presisi penuh (Float64) dari parameter model hasil Export Model dan matriks bobot `matrix` (baris x term,
 * urutan term = model.text.terms). Rumus dibaca dari nb_text.rs::score_rows dan posterior.rs::normalize_log_scores.
 */
export function referenceScores(model: TextModelLike, matrix: number[][]) {
  const t = model.text;
  const classes = model.target.classes;
  const K = classes.length;
  const prior = t.uses_class_prior ? model.target.class_priors.map((p) => Math.log(p)) : classes.map(() => 0);
  const W = classes.map((c) => t.log_weights[c]);
  const A = t.likelihood === "bernoulli" && t.log_weights_absent ? classes.map((c) => (t.log_weights_absent as Record<string, number[]>)[c]) : null;
  const absentSums = A ? A.map((row) => row.reduce((s, v) => s + v, 0)) : classes.map(() => 0);
  const order = classes.map((_, i) => i).sort((i, j) => (classes[i] < classes[j] ? -1 : classes[i] > classes[j] ? 1 : 0));
  return matrix.map((row) => {
    const scores = prior.map((p, c) => p + absentSums[c]);
    for (let j = 0; j < row.length; j++) {
      const x = row[j];
      if (x === 0) continue;
      if (t.likelihood === "bernoulli") {
        if (x > 0 && A) for (let c = 0; c < K; c++) scores[c] += W[c][j] - A[c][j];
      } else {
        for (let c = 0; c < K; c++) scores[c] += x * W[c][j];
      }
    }
    const m = Math.max(...scores);
    const ex = scores.map((s) => Math.exp(s - m));
    const sum = ex.reduce((s, v) => s + v, 0);
    const probs = ex.map((e) => e / sum);
    let best = -Infinity;
    let win = 0;
    for (const i of order) if (scores[i] > best) { best = scores[i]; win = i; }
    const sorted = [...scores].sort((a, b) => b - a);
    return { scores, probs, predictedIndex: win, gap: K > 1 ? sorted[0] - sorted[1] : Infinity };
  });
}

/** Berkas prediksi Track D (Id,kelas_aktual,kelas_prediksi,prob_<kelas>...). */
export function readPredCsv(file: string) {
  const { header, rows } = readCsv(file);
  const ix = (n: string) => header.indexOf(n);
  const classes = header.filter((h) => h.startsWith("prob_")).map((h) => h.slice(5));
  return {
    ids: rows.map((r) => r[ix("Id")]),
    actual: rows.map((r) => r[ix("kelas_aktual")]),
    pred: rows.map((r) => r[ix("kelas_prediksi")]),
    classes,
    prob: classes.map((c) => rows.map((r) => (r[ix("prob_" + c)] === "" ? null : Number(r[ix("prob_" + c)])))),
  };
}

/** Berkas model yang menyerupai objek File untuk loadModelFromFile (nama, ukuran, text()). */
export function fileLike(name: string, content: string): File {
  return { name, size: Buffer.byteLength(content), text: async () => content } as unknown as File;
}
