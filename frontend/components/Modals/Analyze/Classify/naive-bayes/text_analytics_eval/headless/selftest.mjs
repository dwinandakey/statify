// selftest.mjs — uji kecil pustaka statify_wasm.mjs: memuat ketiga wasm dan menjalankan data mini
// (dataset dari fixture Apply Model: "makan nasi enak" dst.). Keluar dengan kode 1 bila ada yang gagal.
import { logWasmInfo, stwvTransform, toRustConfig, STWV_DEFAULT_CONFIG, runTrainApply, KONFIGURASI } from "./statify_wasm.mjs";

let fail = 0;
const ok = (c, msg) => { console.log(`${c ? "LULUS " : "GAGAL "} ${msg}`); if (!c) fail++; };

logWasmInfo();

// 1. STWV
const docs = ["makan nasi enak", "Saya tidak suka nasi!", "", "Makan, makan, makan"];
const out = await stwvTransform(docs, toRustConfig(STWV_DEFAULT_CONFIG));
ok(JSON.stringify(out.vocabulary) === JSON.stringify(["enak", "makan", "nasi", "saya", "suka", "tidak"]), `STWV kosakata = ${JSON.stringify(out.vocabulary)}`);
ok(out.matrix[3][1] === 3 && out.matrix[0][1] === 1, "STWV TF hitungan: 'makan' x3 di dokumen 4");
ok(out.stats.empty_documents === 1, `STWV dokumen kosong = ${out.stats.empty_documents}`);

// 2. NB -> Export -> AM (alur penuh, data mini)
const header = ["Id", "Teks", "Sentimen"];
const train = { header, rows: [
  ["1", "makan nasi enak", "pos"], ["2", "enak sekali makan nasi", "pos"], ["3", "saya suka nasi", "pos"],
  ["4", "tidak suka makan", "neg"], ["5", "saya tidak suka", "neg"], ["6", "tidak enak sama sekali", "neg"],
] };
const test = { header, rows: [["7", "nasi enak sekali", "pos"], ["8", "saya tidak suka nasi", "neg"], ["9", "", "pos"]] };
const r = await runTrainApply({ train, test, textCol: "Teks", labelCol: "Sentimen", excluded: ["Id"], kconfig: KONFIGURASI.K1 });
ok(r.nb.errors === "" || r.nb.errors === undefined || (Array.isArray(r.nb.errors) && r.nb.errors.length === 0) || typeof r.nb.errors === "string", `NB errors = ${JSON.stringify(r.nb.errors)}`);
ok(r.model.schema_version === "2.0" && r.model.text.source === "raw", `model ekspor schema ${r.model.schema_version}, text.source=${r.model.text?.source}`);
ok(JSON.stringify(r.classes) === JSON.stringify(["neg", "pos"]), `kelas = ${JSON.stringify(r.classes)}`);
console.log("prediksi:", JSON.stringify(r.predicted), "maxProb:", JSON.stringify(r.maxProb));
ok(r.predicted[0] === "pos" && r.predicted[1] === "neg", "prediksi dok. 7 = pos, dok. 8 = neg");
ok(r.predicted[2] === null, "dokumen kosong -> NotScored (null)");
console.log(fail === 0 ? "SEMUA LULUS" : `${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
