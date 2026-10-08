// it_util.mjs — Track F (pengujian integrasi antarmenu IT-01..IT-05): pembantu bersama skrip Node.
//
// Memakai pustaka headless Track D (../headless/statify_wasm.mjs) yang memanggil BINER WASM YANG SAMA dengan
// aplikasi (STWV, Naive Bayes, Apply Model). Tidak ada rumus yang ditulis ulang di sini KECUALI "skor acuan"
// (referenceScores) yang sengaja dibuat sendiri sebagai pembanding independen untuk IT-03:
// skor log = ln(prior) + sum_t x_t * log_weights (Multinomial/Complement), lalu softmax. Rumus ini dibaca dari
// nb_text.rs::score_rows dan apply-model/rust/src/stats/posterior.rs; sumber kebenaran tetap kode Rust itu.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  repoRoot, readCsv, toCsv, makeVariables, naiveBayesDefault, buildNaiveBayesPayload, naiveBayesRun, exportModel,
  buildApplyModelPayload, applyModelRun, stwvTransform, toRustConfig, KONFIGURASI, logWasmInfo, wasmInfo, envInfo, stwvOverride,
} from "../headless/statify_wasm.mjs";

export { repoRoot, readCsv, toCsv, makeVariables, naiveBayesDefault, buildNaiveBayesPayload, naiveBayesRun, exportModel,
  buildApplyModelPayload, applyModelRun, stwvTransform, toRustConfig, KONFIGURASI, logWasmInfo, wasmInfo, envInfo, stwvOverride };

export const EVAL_DIR = path.join(repoRoot, "testing", "text_analytics_eval");
export const OUT_DIR = path.join(EVAL_DIR, "integration", "out");
export const PIL = {
  train: path.join(repoRoot, "Claude outputs", "pilkada_train.csv"),
  test: path.join(repoRoot, "Claude outputs", "pilkada_test.csv"),
  idCol: "Id", textCol: "Text Tweet", labelCol: "Sentiment", excluded: ["Id", "Pasangan Calon"],
};

let failures = 0;
const results = [];
/** Cetak satu pemeriksaan: LULUS/GAGAL + detail; hitung kegagalan. */
export function check(id, cond, detail) {
  const ok = !!cond;
  if (!ok) failures++;
  results.push({ id, ok, detail });
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${id}${detail ? "  :: " + detail : ""}`);
  return ok;
}
export function finish(title) {
  console.log(`\n=== ${title}: ${results.filter((r) => r.ok).length} lulus, ${failures} gagal dari ${results.length} pemeriksaan ===`);
  process.exitCode = failures === 0 ? 0 : 1;
  return failures;
}
export function sha256(bufOrString) {
  return crypto.createHash("sha256").update(bufOrString).digest("hex");
}

// --------------------------------------------------------------------------------------------------------
// Pelatihan dan penerapan (pecahan dari runTrainApply agar model bisa dipakai ulang)
// --------------------------------------------------------------------------------------------------------
const overridesFor = (textCol, labelCol) => ({ [textCol]: { type: "STRING", measure: "nominal" }, [labelCol]: { type: "STRING", measure: "nominal" } });

/** Latih NB (jalur Raw Text) pada `train`; mengembalikan {nb, model, modelJson}. Resep STWV hanya dari data latih. */
export async function trainRaw({ train, textCol = PIL.textCol, labelCol = PIL.labelCol, excluded = PIL.excluded, kconfig, seed = 42 }) {
  const vars = makeVariables(train.header, train.rows, overridesFor(textCol, labelCol));
  const cfg = naiveBayesDefault();
  cfg.main.TargetVar = labelCol;
  cfg.main.RawTextVar = textCol;
  cfg.main.TextSource = "raw";
  cfg.main.ExcludedVar = excluded.length ? [...excluded] : null;
  cfg.options.TextLikelihood = kconfig.likelihood;
  cfg.options.TextAlpha = kconfig.alpha;
  cfg.validation.RandomSeed = seed;
  cfg.text = JSON.parse(JSON.stringify(kconfig.stwv));
  const payload = buildNaiveBayesPayload({ data: train.rows, variables: vars, configData: cfg });
  const nb = await naiveBayesRun(payload);
  const { json, model } = exportModel(nb.data);
  return { nb, model, modelJson: json, configData: cfg };
}

/** Terapkan `model` (objek hasil Export Model / JSON.parse berkas) pada dataset `data` (jalur Raw Text). */
export async function applyRaw({ model, data, textCol = PIL.textCol, labelCol = PIL.labelCol, withActual = true }) {
  const vars = makeVariables(data.header, data.rows, overridesFor(textCol, labelCol));
  const payload = buildApplyModelPayload({
    model, data: data.rows, variables: vars,
    mapping: { FeatureMapping: {}, ActualTargetVar: withActual ? labelCol : null, RawTextVar: textCol, VectorMapping: {} },
  });
  return applyModelRun(payload);
}

// --------------------------------------------------------------------------------------------------------
// Metrik (dihitung sendiri dari pasangan aktual/prediksi; sama dengan definisi Track D)
// --------------------------------------------------------------------------------------------------------
export function classificationMetrics(actual, pred) {
  const classes = [...new Set([...actual, ...pred.filter((p) => p !== null && p !== "")])].sort();
  const idx = new Map(classes.map((c, i) => [c, i]));
  const K = classes.length;
  const cm = Array.from({ length: K }, () => Array(K).fill(0));
  let n = 0;
  actual.forEach((a, i) => { const p = pred[i]; if (p === null || p === "" || a === "" || a === null) return; cm[idx.get(a)][idx.get(p)]++; n++; });
  let correct = 0; for (let k = 0; k < K; k++) correct += cm[k][k];
  const po = correct / n;
  let pe = 0; for (let k = 0; k < K; k++) { const r = cm[k].reduce((s, v) => s + v, 0); let c = 0; for (let j = 0; j < K; j++) c += cm[j][k]; pe += (r / n) * (c / n); }
  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  let f1sum = 0;
  for (let k = 0; k < K; k++) {
    const tp = cm[k][k]; const r = cm[k].reduce((s, v) => s + v, 0); let c = 0; for (let j = 0; j < K; j++) c += cm[j][k];
    const prec = c === 0 ? 0 : tp / c, rec = r === 0 ? 0 : tp / r;
    f1sum += prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
  }
  return { n, accuracy: po, kappa, macroF1: f1sum / K, classes, cm };
}

// --------------------------------------------------------------------------------------------------------
// Presisi: jejak bit double dan perbandingan dalam
// --------------------------------------------------------------------------------------------------------
const _f = new Float64Array(1);
const _u = new BigUint64Array(_f.buffer);
export function bitsOf(x) { _f[0] = x; return _u[0].toString(16).padStart(16, "0"); }

/** Bandingkan dua struktur JSON secara dalam; angka dibandingkan BIT-per-BIT (Object.is + jejak heksadesimal). */
export function deepBitCompare(a, b, p = "$", acc = { numbers: 0, strings: 0, nodes: 0, diffs: [], maxAbs: 0 }) {
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
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join("\u0000") !== kb.join("\u0000")) acc.diffs.push(`${p}: kunci ${JSON.stringify(ka.slice(0, 6))} vs ${JSON.stringify(kb.slice(0, 6))}`);
    for (const k of ka) if (k in b) deepBitCompare(a[k], b[k], `${p}.${k}`, acc);
  } else if (a !== b) {
    acc.diffs.push(`${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
  return acc;
}

// --------------------------------------------------------------------------------------------------------
// Skor acuan independen (IT-03): posterior presisi penuh dari parameter model hasil Export Model
// --------------------------------------------------------------------------------------------------------
/** round4 persis seperti apply-model/rust/src/stats/posterior.rs (positif: Math.round == f64::round). */
export const round4 = (x) => Math.round(x * 10000) / 10000;

/**
 * Posterior presisi penuh untuk model teks (schema 2.0) pada matriks bobot `matrix` (dense, baris x term, urutan
 * term = model.text.terms). Rumus: lihat komentar kepala berkas. Mengembalikan {scores, probs, predictedIndex, gap}.
 */
export function referenceScores(model, matrix) {
  const t = model.text;
  const classes = model.target.classes;
  const K = classes.length;
  const prior = t.uses_class_prior ? model.target.class_priors.map((p) => Math.log(p)) : classes.map(() => 0);
  const absent = t.likelihood === "bernoulli" ? t.log_weights_absent : null;
  const W = classes.map((c) => t.log_weights[c]);
  const A = absent ? classes.map((c) => absent[c]) : null;
  const absentSums = A ? A.map((row) => row.reduce((s, v) => s + v, 0)) : classes.map(() => 0);
  const order = classes.map((c, i) => i).sort((i, j) => (classes[i] < classes[j] ? -1 : classes[i] > classes[j] ? 1 : 0));
  return matrix.map((row) => {
    const scores = prior.map((p, c) => p + absentSums[c]);
    for (let j = 0; j < row.length; j++) {
      const x = row[j];
      if (x === 0) continue;
      if (t.likelihood === "bernoulli") {
        if (x > 0) for (let c = 0; c < K; c++) scores[c] += W[c][j] - A[c][j];
      } else {
        for (let c = 0; c < K; c++) scores[c] += x * W[c][j];
      }
    }
    const m = Math.max(...scores);
    const ex = scores.map((s) => Math.exp(s - m));
    const sum = ex.reduce((s, v) => s + v, 0);
    const probs = ex.map((e) => e / sum);
    let best = -Infinity, win = 0;
    for (const i of order) if (scores[i] > best) { best = scores[i]; win = i; }
    const sorted = [...scores].sort((a, b) => b - a);
    return { scores, probs, predictedIndex: win, gap: K > 1 ? sorted[0] - sorted[1] : Infinity };
  });
}

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); return d; }
export function readPredCsv(file) {
  const { header, rows } = readCsv(file);
  const ix = (n) => header.indexOf(n);
  const classes = header.filter((h) => h.startsWith("prob_")).map((h) => h.slice(5));
  return {
    ids: rows.map((r) => r[ix("Id")]),
    actual: rows.map((r) => r[ix("kelas_aktual")]),
    pred: rows.map((r) => r[ix("kelas_prediksi")]),
    classes,
    prob: classes.map((c) => rows.map((r) => (r[ix("prob_" + c)] === "" ? null : Number(r[ix("prob_" + c)])))),
  };
}
