// prepare_datasets.mjs — Track E: membangun CSV dataset seragam (Id,Label,Text) untuk uji waktu eksekusi di perf/data/.
//
// Sumber (semuanya berkas NYATA yang sudah ada; tidak ada dokumen yang digandakan):
//   pilkada_900   = "Claude outputs/pilkada_train.csv" (630) + "pilkada_test.csv" (270); kolom Sentiment -> Label,
//                   "Text Tweet" -> Text; kolom "Pasangan Calon" tidak dipakai (di aplikasi dikeluarkan lewat mode Exclude,
//                   sehingga hasil setara).
//   sms_5574      = accuracy/datasets/sms_spam_all.csv
//   smsa_11000    = accuracy/datasets/smsa_train.csv (pembagian latih resmi IndoNLU)
//   gabungan      = pilkada_900 + sms_5574 + SmSA (latih + uji, ditambah validasi bila valid_preprocess.tsv ditemukan:
//                   weka/data/valid_preprocess.tsv atau accuracy/datasets/valid_preprocess.tsv)
//   20ng          = (opsional) sklearn.datasets.fetch_20newsgroups(subset='all', remove=headers/footers/quotes), dokumen kosong dibuang.
//                   Butuh python + scikit-learn + jaringan; bila gagal dicatat di PREPARE_STATUS.json.
//   besar_ge20000 = gabungan + 20ng, HANYA dibuat bila jumlahnya >= 20.000 (sumber nyata). Bila tidak, berkas tidak dibuat dan
//                   baris tabel ">= 20.000" ditandai NOT RUN. Baris "gabungan" tetap diukur dengan jumlah dokumen apa adanya.
// Pemakaian:  node testing/text_analytics_eval/perf/prepare_datasets.mjs [--no-20ng]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { readCsv, parseCsv, toCsv } from "../headless/statify_wasm.mjs";
import { repoRoot, dataDir, datasetCsv, sha256File } from "./common.mjs";

const argv = process.argv.slice(2);
const try20ng = !argv.includes("--no-20ng");
fs.mkdirSync(dataDir, { recursive: true });
const status = { generated: new Date().toISOString(), datasets: {}, notes: [] };

const ACC = path.join(repoRoot, "testing", "text_analytics_eval", "accuracy", "datasets");
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function writeDs(id, rows, note) {
  const out = [["Id", "Label", "Text"], ...rows.map((r, i) => [String(i + 1), r[0], r[1]])];
  const f = datasetCsv(id);
  fs.writeFileSync(f, toCsv(out), "utf8");
  const labels = {};
  rows.forEach((r) => { labels[r[0]] = (labels[r[0]] ?? 0) + 1; });
  status.datasets[id] = { n: rows.length, file: path.relative(repoRoot, f).split(path.sep).join("/"), sha256: sha256File(f), labels, note };
  console.log(`${id}: ${rows.length} dokumen -> ${path.relative(repoRoot, f)}  ${JSON.stringify(labels)}`);
}
const need = (p) => { if (!fs.existsSync(p)) throw new Error(`berkas sumber tidak ada: ${p}`); return p; };

// --- Pilkada
const pTrain = readCsv(need(path.join(repoRoot, "Claude outputs", "pilkada_train.csv")));
const pTest = readCsv(need(path.join(repoRoot, "Claude outputs", "pilkada_test.csv")));
const pk = (d) => { const l = d.header.indexOf("Sentiment"), t = d.header.indexOf("Text Tweet"); return d.rows.map((r) => [r[l], r[t]]); };
const pilkada = [...pk(pTrain), ...pk(pTest)];
writeDs("pilkada_900", pilkada, `train ${pTrain.rows.length} + test ${pTest.rows.length}`);

// --- SMS Spam
const sms = readCsv(need(path.join(ACC, "sms_spam_all.csv")));
const smsRows = sms.rows.map((r) => [r[sms.header.indexOf("Label")], r[sms.header.indexOf("Text")]]);
writeDs("sms_5574", smsRows, "UCI SMS Spam Collection, seluruh dokumen");

// --- SmSA
const sTrain = readCsv(need(path.join(ACC, "smsa_train.csv")));
const sTest = readCsv(need(path.join(ACC, "smsa_test.csv")));
const sm = (d) => d.rows.map((r) => [r[d.header.indexOf("Label")], r[d.header.indexOf("Text")]]);
const smsaTrain = sm(sTrain);
writeDs("smsa_11000", smsaTrain, "IndoNLU SmSA, berkas latih");
let smsaAll = [...smsaTrain, ...sm(sTest)];
let smsaNote = `latih ${smsaTrain.length} + uji ${sTest.rows.length}`;
const validCands = [path.join(repoRoot, "testing", "text_analytics_eval", "weka", "data", "valid_preprocess.tsv"), path.join(ACC, "valid_preprocess.tsv")];
const validFile = validCands.find((p) => fs.existsSync(p));
if (validFile) {
  const lines = fs.readFileSync(validFile, "utf8").split("\n").filter((l) => l.trim());
  const valid = lines.map((l) => { const i = l.lastIndexOf("\t"); return [l.slice(i + 1).trim(), norm(l.slice(0, i))]; });
  smsaAll = [...smsaAll, ...valid];
  smsaNote += ` + validasi ${valid.length} (${path.basename(validFile)})`;
} else {
  status.notes.push("valid_preprocess.tsv (SmSA validasi, 1.260 dokumen) tidak ditemukan: SmSA gabungan = latih + uji = 11.500, bukan 12.760.");
}
console.log(`SmSA gabungan: ${smsaAll.length} (${smsaNote})`);

// --- Gabungan nyata
const gab = [...pilkada, ...smsRows, ...smsaAll];
writeDs("gabungan", gab, `pilkada ${pilkada.length} + sms ${smsRows.length} + smsa ${smsaAll.length} (${smsaNote}). Label campuran; hanya untuk beban waktu, bukan akurasi.`);

// --- 20 Newsgroups (opsional)
let ng = null;
if (try20ng) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "statify20ng_")), "ng.csv");
  const code = [
    "import csv,re,sys",
    "from sklearn.datasets import fetch_20newsgroups",
    "d=fetch_20newsgroups(subset='all',remove=('headers','footers','quotes'))",
    "w=csv.writer(open(sys.argv[1],'w',encoding='utf-8',newline=''))",
    "n=0",
    "for t,y in zip(d.data,d.target):",
    "    t=re.sub(r'\\s+',' ',t).strip()",
    "    if t: w.writerow([d.target_names[y],t]); n+=1",
    "print('20ng_ok',len(d.data),n)",
  ].join("\n");
  let done = false;
  for (const exe of process.platform === "win32" ? ["python", "py"] : ["python3", "python"]) {
    const r = spawnSync(exe, ["-c", code, out], { encoding: "utf8", timeout: 600000 });
    if (r.status === 0 && fs.existsSync(out)) {
      console.log((r.stdout ?? "").trim());
      const lines = fs.readFileSync(out, "utf8");
      ng = readCsvNoHeader(lines);
      done = true;
      break;
    }
    const tail = ((r.stderr ?? "") + (r.error ? String(r.error) : "")).trim().split("\n").slice(-1)[0] ?? "";
    status.notes.push(`20 Newsgroups tidak tersedia via ${exe}: ${tail.slice(0, 200)}`);
  }
  if (!done) console.log("20 Newsgroups: TIDAK tersedia (" + status.notes[status.notes.length - 1] + ")");
}
function readCsvNoHeader(text) {
  return parseCsv(text).map((r) => [r[0], r[1]]);
}
if (ng) {
  writeDs("newsgroups20", ng, "scikit-learn fetch_20newsgroups(subset='all', remove=headers/footers/quotes), dokumen kosong dibuang");
}
const big = ng ? [...gab, ...ng] : gab;
if (big.length >= 20000) {
  writeDs("besar_ge20000", big, ng ? "gabungan + 20 Newsgroups (semua sumber nyata, tanpa duplikasi)" : "gabungan");
} else {
  const f = datasetCsv("besar_ge20000");
  status.datasets.besar_ge20000 = { n: 0, note: `NOT RUN: seluruh sumber nyata yang tersedia hanya ${big.length} dokumen (< 20.000). Berkas tidak dibuat; tidak ada penggandaan data.` };
  console.log(status.datasets.besar_ge20000.note);
  if (fs.existsSync(f)) console.log(`(berkas lama ${f} dibiarkan; hapus manual bila tidak berlaku)`);
}

// --- Varian ASCII (tambahan, HANYA untuk skenario STWV + Sastrawi): wasm STWV memakai sastrawi-rs 0.5.1 yang panik
// ("byte index 2 is not a char boundary", affixation.rs:24) pada token yang karakter keduanya multibita (mis. "I‘m", "résumé").
// Varian ini mengganti tanda kutip tipografis dengan ASCII, membuang diakritik (NFKD) dan karakter non-ASCII sisanya, agar
// WAKTU STWV + Sastrawi tetap dapat diukur. Dokumen TIDAK ditambah/dikurangi. Lihat BUGS_E.md (E-01).
const asciiFold = (t) => t
  .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
  .replace(/[\u2013\u2014\u2212]/g, "-").replace(/\u2026/g, "...")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "");
const nonAscii = (rows) => rows.filter((r) => /[^\x00-\x7F]/.test(r[1])).length;
const variants = { sms_5574_ascii: smsRows, gabungan_ascii: gab };
if (big.length >= 20000) variants.besar_ge20000_ascii = big;
for (const [id, rows] of Object.entries(variants)) {
  writeDs(id, rows.map((r) => [r[0], asciiFold(r[1])]), `varian ASCII (non-ASCII dilipat/dibuang; ${nonAscii(rows)} dari ${rows.length} dokumen asli memuat karakter non-ASCII). Hanya untuk STWV + Sastrawi.`);
}
fs.writeFileSync(path.join(dataDir, "PREPARE_STATUS.json"), JSON.stringify(status, null, 2), "utf8");
console.log("status ->", path.relative(repoRoot, path.join(dataDir, "PREPARE_STATUS.json")));
