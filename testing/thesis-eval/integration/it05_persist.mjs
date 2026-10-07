// it05_persist.mjs — IT-05: simpan model ke berkas, muat ulang setelah sesi baru -> prediksi identik.
//
// DUA PROSES Node terpisah (bukan dua panggilan dalam satu proses):
//   fase 1 (proses A): latih NB pada pilkada_train, Export Model (JSON.stringify(trained_model, null, 2)) ke berkas,
//                      terapkan model DI MEMORI pada pilkada_test, tulis prediksi + jejak bit seluruh angka model.
//   fase 2 (proses B): proses baru (wasm baru, memori baru, tanpa melatih apa pun): baca berkas model dari disk,
//                      JSON.parse, terapkan pada pilkada_test, tulis prediksi + jejak bit angka model hasil muat.
//   orkestrator:       menjalankan A lalu B (spawnSync), lalu membandingkan BYTE-PER-BYTE berkas prediksi dan baris
//                      per baris jejak bit angka model (setiap double diwakili 16 digit heksadesimal IEEE-754).
// Pemakaian:  node it05_persist.mjs [K1,K5]           (orkestrator)
//             node it05_persist.mjs phase1 <dir> <K>  (dipanggil orkestrator)
//             node it05_persist.mjs phase2 <dir> <K>
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { logWasmInfo, readCsv, KONFIGURASI, PIL, check, finish, trainRaw, applyRaw, bitsOf, sha256, OUT_DIR, ensureDir,
  wasmInfo } from "./it_util.mjs";

const SELF = fileURLToPath(import.meta.url);
const [, , mode, dirArg, kArg] = process.argv;

/** Semua angka dalam struktur, urutan penelusuran tetap (kunci menurut urutan penyisipan), sebagai jejak heksadesimal. */
function collectNumberBits(x, out = []) {
  if (typeof x === "number") out.push(bitsOf(x));
  else if (Array.isArray(x)) x.forEach((v) => collectNumberBits(v, out));
  else if (x && typeof x === "object") Object.keys(x).forEach((k) => collectNumberBits(x[k], out));
  return out;
}

/** Prediksi dalam bentuk teks deterministik: kelas, 3 kolom probabilitas (nilai desimal terpendek + jejak bit). */
function predictionDump(am) {
  const pr = am.data.predictions;
  const classes = am.data.prediction_distribution.classes;
  return JSON.stringify({
    classes,
    predicted: pr.predicted,
    max_probability: pr.max_probability,
    class_probabilities: pr.class_probabilities,
    bits: {
      max_probability: pr.max_probability.map((v) => (v === null ? null : bitsOf(v))),
      class_probabilities: pr.class_probabilities.map((col) => col.map((v) => (v === null ? null : bitsOf(v)))),
    },
    model_summary: am.data.model_summary,
    case_processing_summary: am.data.case_processing_summary,
    prediction_distribution: am.data.prediction_distribution,
    evaluation: am.data.evaluation,
  }, null, 1);
}

async function phase1(dir, k) {
  logWasmInfo();
  console.log(`[fase 1] pid=${process.pid} node=${process.version} K=${k}`);
  const train = readCsv(PIL.train), test = readCsv(PIL.test);
  const { model, modelJson, nb } = await trainRaw({ train, kconfig: KONFIGURASI[k] });
  fs.writeFileSync(path.join(dir, `model_${k}.json`), modelJson);
  // model di memori (objek yang sama dengan yang dipakai Apply Model bila pengguna tidak menyimpan berkas)
  const am = await applyRaw({ model, data: test });
  fs.writeFileSync(path.join(dir, `pred_phase1_${k}.json`), predictionDump(am));
  // jejak bit: objek model langsung dari wasm NB (sebelum JSON apa pun)
  fs.writeFileSync(path.join(dir, `bits_phase1_${k}.txt`), collectNumberBits(nb.data.trained_model).join("\n") + "\n");
  fs.writeFileSync(path.join(dir, `info_phase1_${k}.json`), JSON.stringify({ pid: process.pid, node: process.version, wasm: wasmInfo(), started: new Date().toISOString() }, null, 1));
  console.log(`[fase 1] model ${Buffer.byteLength(modelJson)} B ditulis; ${collectNumberBits(model).length} angka; prediksi ${am.data.predictions.predicted.length} baris`);
}

async function phase2(dir, k) {
  logWasmInfo();
  console.log(`[fase 2] pid=${process.pid} node=${process.version} K=${k} (proses baru; tidak melatih)`);
  const test = readCsv(PIL.test);
  const text = fs.readFileSync(path.join(dir, `model_${k}.json`), "utf8");
  const model = JSON.parse(text);
  const am = await applyRaw({ model, data: test });
  fs.writeFileSync(path.join(dir, `pred_phase2_${k}.json`), predictionDump(am));
  fs.writeFileSync(path.join(dir, `bits_phase2_${k}.txt`), collectNumberBits(model).join("\n") + "\n");
  fs.writeFileSync(path.join(dir, `info_phase2_${k}.json`), JSON.stringify({ pid: process.pid, node: process.version, wasm: wasmInfo(), started: new Date().toISOString() }, null, 1));
  console.log(`[fase 2] model dimuat dari berkas (${Buffer.byteLength(text)} B); ${collectNumberBits(model).length} angka; prediksi ${am.data.predictions.predicted.length} baris`);
}

if (mode === "phase1") { await phase1(dirArg, kArg); }
else if (mode === "phase2") { await phase2(dirArg, kArg); }
else {
  const configs = (mode ?? "K1,K5").split(",");
  // Folder kerja sementara di luar repo (berkas model 0,1-0,2 MB dan dump prediksi tidak perlu masuk repo).
  const dir = ensureDir(process.env.IT05_DIR ?? fs.mkdtempSync(path.join(os.tmpdir(), "statify-it05-")));
  console.log(`IT-05 orkestrator pid=${process.pid}; folder kerja sementara: ${dir}`);
  for (const k of configs) {
    console.log(`\n--- ${k}: ${KONFIGURASI[k].desc}`);
    const r1 = spawnSync(process.execPath, ["--no-warnings", SELF, "phase1", dir, k], { encoding: "utf8", maxBuffer: 1 << 28 });
    process.stdout.write((r1.stdout ?? "").split("\n").filter((l) => l.startsWith("[")).map((l) => "  " + l).join("\n") + "\n");
    check(`${k} proses 1 (latih + ekspor ke berkas) keluar dengan kode 0`, r1.status === 0, (r1.stderr ?? "").slice(0, 300));
    const r2 = spawnSync(process.execPath, ["--no-warnings", SELF, "phase2", dir, k], { encoding: "utf8", maxBuffer: 1 << 28 });
    process.stdout.write((r2.stdout ?? "").split("\n").filter((l) => l.startsWith("[")).map((l) => "  " + l).join("\n") + "\n");
    check(`${k} proses 2 (muat dari berkas + terapkan) keluar dengan kode 0`, r2.status === 0, (r2.stderr ?? "").slice(0, 300));
    if (r1.status !== 0 || r2.status !== 0) continue;

    const i1 = JSON.parse(fs.readFileSync(path.join(dir, `info_phase1_${k}.json`), "utf8"));
    const i2 = JSON.parse(fs.readFileSync(path.join(dir, `info_phase2_${k}.json`), "utf8"));
    check(`${k} dua proses berbeda: pid ${i1.pid} != ${i2.pid}`, i1.pid !== i2.pid && i1.pid !== process.pid && i2.pid !== process.pid);
    check(`${k} sha256 wasm sama pada kedua proses (NB/AM/STWV)`, JSON.stringify(i1.wasm) === JSON.stringify(i2.wasm));

    const p1 = fs.readFileSync(path.join(dir, `pred_phase1_${k}.json`));
    const p2 = fs.readFileSync(path.join(dir, `pred_phase2_${k}.json`));
    check(`${k} berkas prediksi proses 1 dan 2 IDENTIK byte-per-byte (${p1.length} B; sha256 ${sha256(p1).slice(0, 16)}… vs ${sha256(p2).slice(0, 16)}…)`, Buffer.compare(p1, p2) === 0);
    const d1 = JSON.parse(p1.toString("utf8"));
    const n = d1.predicted.length;
    check(`${k} 270 baris prediksi, tidak ada baris tak-diskor`, n === 270 && d1.predicted.every((v) => v !== null), `${n} baris`);

    const b1 = fs.readFileSync(path.join(dir, `bits_phase1_${k}.txt`), "utf8").split("\n").filter(Boolean);
    const b2 = fs.readFileSync(path.join(dir, `bits_phase2_${k}.txt`), "utf8").split("\n").filter(Boolean);
    let diff = 0, first = -1;
    for (let i = 0; i < Math.max(b1.length, b2.length); i++) if (b1[i] !== b2[i]) { diff++; if (first < 0) first = i; }
    check(`${k} ${b1.length} angka model: jejak bit IEEE-754 proses 1 (langsung dari wasm NB) == proses 2 (setelah tulis/baca berkas JSON): ${diff} selisih`, b1.length === b2.length && diff === 0, first >= 0 ? `selisih pertama di indeks ${first}: ${b1[first]} vs ${b2[first]}` : "");

    // juga: berkas model dibaca ulang lalu ditulis ulang -> byte identik (kestabilan serialisasi)
    const mtxt = fs.readFileSync(path.join(dir, `model_${k}.json`), "utf8");
    console.log(`  INFO ${k} berkas model: ${Buffer.byteLength(mtxt)} B, sha256 ${sha256(mtxt)}`);
    check(`${k} berkas model: JSON.stringify(JSON.parse(berkas), null, 2) == isi berkas (stabil)`, JSON.stringify(JSON.parse(mtxt), null, 2) === mtxt);
  }

  // Batas jaminan JavaScript: JSON.stringify/JSON.parse adalah round-trip eksak untuk setiap double hingga (ECMAScript
  // Number::toString = representasi terpendek yang kembali ke double yang sama; JSON.parse membulatkan dengan benar).
  // Diuji secara acak (seed tetap 42) pada 2.000.000 double + nilai-nilai tepi.
  let s = 42 >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
  const buf = new DataView(new ArrayBuffer(8));
  let bad = 0, tested = 0;
  const edge = [Number.MIN_VALUE, Number.MAX_VALUE, Number.EPSILON, 5e-324, -0.5, 1 / 3, 0.1, 0.2, 0.30000000000000004, 1.1104084639816971, 1.1104084639816973, Math.log(0.5), -Math.LN2];
  const examine = (x) => { if (!Number.isFinite(x)) return; tested++; if (!Object.is(JSON.parse(JSON.stringify(x)), x)) bad++; };
  edge.forEach(examine);
  for (let i = 0; i < 2_000_000; i++) { buf.setUint32(0, rnd()); buf.setUint32(4, rnd()); examine(buf.getFloat64(0)); }
  check(`JS: JSON.parse(JSON.stringify(x)) === x untuk ${tested.toLocaleString("en-US")} double acak/tepi: ${bad} selisih`, bad === 0);
  const ulpPair = [1.1104084639816971, 1.1104084639816973];
  check(`contoh pergeseran 1 ulp dari catatan S4 (avg_doc_norm ...6971 vs ...6973) dibedakan oleh JSON JS: ${bitsOf(ulpPair[0])} vs ${bitsOf(ulpPair[1])}`,
    Object.is(JSON.parse(JSON.stringify(ulpPair[0])), ulpPair[0]) && Object.is(JSON.parse(JSON.stringify(ulpPair[1])), ulpPair[1]) && ulpPair[0] !== ulpPair[1]);
  finish("IT-05");
}
