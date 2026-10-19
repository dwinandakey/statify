// make_payload_golden.mjs — membuat payload_golden.json: masukan kecil + payload NB/AM yang dibentuk pustaka headless
// + prediksi wasm. Dipakai tes Jest (frontend/.../__tests__/eval/payload_equivalence.*.test.ts) untuk membuktikan
// bahwa pembangun payload headless menghasilkan payload IDENTIK dengan kode TypeScript aplikasi.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  logWasmInfo, makeVariables, naiveBayesDefault, stwvOverride, buildNaiveBayesPayload, naiveBayesRun, exportModel,
  buildApplyModelPayload, applyModelRun,
} from "./statify_wasm.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
logWasmInfo();

const header = ["Id", "Kategori", "Teks", "Label"];
const rows = [
  ["1", "A", "Saya suka makan nasi goreng yang enak sekali", "pos"],
  ["2", "B", "3 kucing lucu bermain di taman, senang sekali!", "pos"],
  ["3", "A", "Pelayanan buruk dan makanan tidak enak", "neg"],
  ["4", "B", "   ", "pos"],
  ["5", "A", "Menunggu lama, pelayan tidak ramah; sangat mengecewakan.", "neg"],
  ["6", "B", "Tempatnya nyaman, harga murah (recommended)?", "pos"],
  ["7", "A", "", "neg"],
  ["8", "B", "Rasanya hambar & mahal. Kecewa berat!", ""],
  ["9", "A", "Makanan enak, pelayan ramah, pasti kembali lagi", "pos"],
  ["10", "B", "Kotor, bau, dan sangat mengecewakan sekali", "neg"],
  ["11", "A", "Nasi goreng enak sekali, murah, dan nyaman", "pos"],
  ["12", "B", "Pelayanan lama dan tidak ramah, tidak akan kembali", "neg"],
];
const variables = makeVariables(header, rows, { Teks: { type: "STRING", measure: "nominal" }, Label: { type: "STRING", measure: "nominal" } });

const configData = naiveBayesDefault();
configData.main.TargetVar = "Label";
configData.main.RawTextVar = "Teks";
configData.main.TextSource = "raw";
configData.main.ExcludedVar = ["Id", "Kategori"];
configData.options.TextLikelihood = "multinomial";
configData.options.TextAlpha = 1;
configData.validation.RandomSeed = 42;
configData.text = stwvOverride({
  stopwords: { method: "indonesian" }, stemming: { method: "indonesian" }, wordsToKeep: 0,
  vectorization: { tfMethod: "log1p", idfMethod: "standard", normalization: "doc_length" },
});

const nbPayload = buildNaiveBayesPayload({ data: rows, variables, configData });
const nb = await naiveBayesRun(nbPayload);
const { model } = exportModel(nb.data);

const amMapping = { FeatureMapping: {}, ActualTargetVar: "Label", RawTextVar: "Teks", VectorMapping: {} };
const amPayload = buildApplyModelPayload({ model, data: rows, variables, mapping: amMapping });
const am = await applyModelRun(amPayload);

const golden = {
  note: "Dibuat oleh make_payload_golden.mjs (pustaka headless). JANGAN diedit tangan; regenerasi dengan node make_payload_golden.mjs.",
  inputs: { header, rows, variables, configData, amMapping },
  nbPayload, model, amPayload,
  amPredicted: am.data.predictions.predicted,
  amClassProbabilities: am.data.predictions.class_probabilities,
  amClasses: am.data.prediction_distribution.classes,
};
fs.writeFileSync(path.join(HERE, "payload_golden.json"), JSON.stringify(golden));
console.log(`payload_golden.json ditulis; prediksi AM: ${JSON.stringify(golden.amPredicted)}; vocab=${model.text.terms.length}`);
