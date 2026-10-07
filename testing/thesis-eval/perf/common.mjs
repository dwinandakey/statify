// common.mjs — definisi bersama Track E (waktu eksekusi): skenario, dataset, statistik, penulisan CSV.
// Hanya modul bawaan Node. Dipakai oleh prepare_datasets.mjs, build_payloads.mjs, run_headless.mjs, run_browser.mjs.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { repoRoot } from "../headless/statify_wasm.mjs";

export { repoRoot };
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const perfDir = HERE;
export const evalDir = path.resolve(HERE, "..");
export const dataDir = path.join(HERE, "data");
export const payloadDir = path.join(dataDir, "payloads");
export const rawDir = path.join(HERE, "raw");
export const logDir = path.join(evalDir, "logs");

// ---------------------------------------------------------------------------
// Skenario (lima, urutan tabel buku)
// ---------------------------------------------------------------------------
export const SCENARIOS = [
  { id: "stwv_default", kind: "stwv", label: "String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi)", kconfig: "K1" },
  { id: "stwv_sw_stem", kind: "stwv", label: "String to Word Vector, stopword Indonesia + stemming Sastrawi", kconfig: "K6" },
  { id: "nb_holdout70", kind: "nb", label: "Naive Bayes, Raw Text, holdout 70% (seed 42)", kconfig: "K1", validation: "holdout" },
  { id: "nb_kfold10", kind: "nb", label: "Naive Bayes, Raw Text, 10-fold CV (seed 42)", kconfig: "K1", validation: "kfold" },
  { id: "am_raw", kind: "am", label: "Apply Model, Raw Text (model NB Multinomial, data yang sama)", kconfig: "K1" },
];

// ---------------------------------------------------------------------------
// Dataset. File CSV seragam (Id,Label,Text) dibangun oleh prepare_datasets.mjs ke perf/data/.
// `order` = urutan kecil -> besar (urutan eksekusi dan tabel).
// ---------------------------------------------------------------------------
export const DATASET_ORDER = ["pilkada_900", "sms_5574", "smsa_11000", "gabungan", "besar_ge20000", "sms_5574_ascii", "gabungan_ascii", "besar_ge20000_ascii"];
// Varian ASCII (tambahan) hanya dijalankan untuk skenario yang tercantum (lihat BUGS_E.md E-01).
export const ONLY_SCENARIOS = { sms_5574_ascii: ["stwv_sw_stem"], gabungan_ascii: ["stwv_sw_stem"], besar_ge20000_ascii: ["stwv_sw_stem"] };
export const allowed = (ds, sc) => !ONLY_SCENARIOS[ds] || ONLY_SCENARIOS[ds].includes(sc);
export const DATASET_LABEL = {
  pilkada_900: "Pilkada 900 (train 630 + test 270)",
  sms_5574: "SMS Spam 5.574",
  smsa_11000: "SmSA 11.000 (IndoNLU, berkas latih)",
  gabungan: "Gabungan nyata (Pilkada + SMS + SmSA), jumlah dokumen sesuai berkas",
  besar_ge20000: ">= 20.000 dokumen",
  sms_5574_ascii: "SMS Spam 5.574, varian ASCII (hanya STWV + Sastrawi)",
  gabungan_ascii: "Gabungan, varian ASCII (hanya STWV + Sastrawi)",
  besar_ge20000_ascii: ">= 20.000 dokumen, varian ASCII (hanya STWV + Sastrawi)",
};
export const datasetCsv = (id) => path.join(dataDir, `${id}.csv`);

// ---------------------------------------------------------------------------
// Statistik: rata-rata dan simpangan baku sampel (n-1)
// ---------------------------------------------------------------------------
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
export function sd(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
}
export function percentile(a, p) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

// ---------------------------------------------------------------------------
// CSV mentah
// ---------------------------------------------------------------------------
export const RAW_COLUMNS = [
  "run_id", "perangkat_label", "jalur", "lingkungan", "menu_konfigurasi", "skenario_id", "dataset", "n_dokumen",
  "jumlah_term", "run", "ms", "status", "pesan_galat",
  "longtask_count", "longtask_max_ms", "longtask_total_ms", "frame_p95_ms", "frame_max_ms", "frame_count", "idle_frame_p95_ms", "rss_mb",
  "payload_sha256_12", "wasm_sha256_12", "peramban", "timestamp",
];
export function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function appendRawCsv(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const exists = fs.existsSync(file);
  const lines = [];
  if (!exists) lines.push(RAW_COLUMNS.join(","));
  for (const r of rows) lines.push(RAW_COLUMNS.map((c) => csvCell(r[c])).join(","));
  fs.appendFileSync(file, lines.join("\n") + "\n", "utf8");
}

export const sha256Text = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

export function makeRunId(prefix) {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${prefix}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function argOf(argv, name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}

export function hostInfoLine() {
  return `${os.type()} ${os.release()} ${process.platform}/${process.arch}; CPU ${os.cpus()[0]?.model ?? "?"} x${os.cpus().length}; RAM ${(os.totalmem() / 2 ** 30).toFixed(1)} GiB; Node ${process.version}`;
}

export function payloadFile(dsId, kind) { return path.join(payloadDir, `${dsId}.${kind}.json`); }
export function availableDatasets() {
  return DATASET_ORDER.filter((id) => fs.existsSync(datasetCsv(id)));
}

export const DEVICE_LABELS = {
  sandbox: "SANDBOX-CLOUD (UJI ASAP, BUKAN PERANGKAT SKRIPSI)",
  vm: "VM-LOKAL (UJI ASAP, BUKAN PERANGKAT SKRIPSI)",
  skripsi: "PERANGKAT-SKRIPSI (Lenovo IdeaPad Gaming 3 15ARH05, Ryzen 5 4600H, 16 GB, Windows 11)",
};
export function deviceLabel(key) { return DEVICE_LABELS[key] ?? key; }
export function envString() {
  return `${os.cpus()[0]?.model?.trim() ?? "?"} x${os.cpus().length}; RAM ${(os.totalmem() / 2 ** 30).toFixed(1)} GiB; ${os.type()} ${os.release()}; Node ${process.version}`;
}
export function scenarioById(id) { return SCENARIOS.find((s) => s.id === id); }
