// it02_export_load.mjs — IT-02: model Raw Text diekspor dari Naive Bayes lalu dimuat di Apply Model.
//
// Tingkat wasm (tanpa adapter TypeScript): model hasil Export Model (JSON.stringify(trained_model, null, 2)) dibaca
// kembali (JSON.parse) seperti saat berkas diunggah di tab Model Apply Model, lalu diterapkan. "Model Summary"
// Apply Model (model_summary dari wasm AM) dibandingkan dengan model asal pada: target, kelas, parameter, dan
// RESEP teks (text.recipe: konfigurasi preprocessing, kosakata, IDF, doc_freq, n_docs, avg_doc_norm).
// Catatan: tabel "Model Summary" di UI TIDAK menampilkan seluruh resep (hanya sumber teks, likelihood, jumlah term,
// alpha, variabel teks); kesamaan resep penuh diperiksa pada tingkat JSON model (bit-per-bit). Adapter TS
// (validateAnyModel, descriptor) dan tabel Output Viewer diuji oleh Jest integration.it02.*.
import { logWasmInfo, readCsv, KONFIGURASI, PIL, check, finish, trainRaw, applyRaw, deepBitCompare, toRustConfig } from "./it_util.mjs";

logWasmInfo();
const train = readCsv(PIL.train), test = readCsv(PIL.test);
const configs = (process.argv[2] ?? "K1,K2,K5").split(",");
for (const k of configs) {
  console.log(`\n--- ${k}: ${KONFIGURASI[k].desc}`);
  const { nb, model: exported, modelJson, configData } = await trainRaw({ train, kconfig: KONFIGURASI[k] });
  const orig = nb.data.trained_model; // model asal NB (objek langsung dari wasm NB)
  const loaded = JSON.parse(modelJson); // "dimuat di AM" dari teks berkas
  const cmp = deepBitCompare(orig, loaded);
  check(`${k} model termuat == model asal NB (bit-per-bit; ${cmp.numbers} angka, ${cmp.strings} string, ${cmp.nodes} simpul): ${cmp.diffs.length} selisih`, cmp.diffs.length === 0, cmp.diffs.slice(0, 3).join(" | "));

  const am = await applyRaw({ model: loaded, data: test });
  const ms = am.data.model_summary;
  const params = Object.fromEntries(ms.parameters.map((p) => [p.label, p.value]));
  const likelihoodLabel = { multinomial: "multinomial", bernoulli: "bernoulli", complement: "complement" };
  check(`${k} Model Summary: model_type = ${ms.model_type}, schema_version = ${ms.schema_version} (asal ${orig.schema_version})`, ms.model_type === orig.model_type && ms.schema_version === orig.schema_version);
  check(`${k} Model Summary: trained_at = ${ms.trained_at} sama dengan model asal`, ms.trained_at === orig.trained_at);
  check(`${k} Model Summary: TARGET "${ms.target_name}" sama dengan target NB "${orig.target.name}" (variabel target pada form NB: "${configData.main.TargetVar}")`, ms.target_name === orig.target.name && ms.target_name === configData.main.TargetVar);
  check(`${k} Model Summary: KELAS ${JSON.stringify(ms.classes)} sama dengan model asal ${JSON.stringify(orig.target.classes)}`, JSON.stringify(ms.classes) === JSON.stringify(orig.target.classes));
  check(`${k} Model Summary: fitur non-teks = ${ms.features.length} (model hanya-teks), asal ${orig.features.length}`, ms.features.length === orig.features.length);
  check(`${k} Model Summary: Text source = "${params["Text source"]}" (asal "${orig.text.source}"), Text likelihood = "${params["Text likelihood"]}" (asal "${orig.text.likelihood}")`, params["Text source"] === orig.text.source && String(params["Text likelihood"]).toLowerCase() === likelihoodLabel[orig.text.likelihood]);
  check(`${k} Model Summary: Smoothing alpha = ${params["Smoothing alpha"]}; Variance floor = ${params["Variance floor"]}; Validation = "${params["Validation (training)"]}"`, params["Smoothing alpha"] === String(orig.smoothing_alpha) && /Holdout 70% \/ 30%, seed 42/.test(params["Validation (training)"]));

  // RESEP: konfigurasi preprocessing yang dikirim NB (toRustConfig) tercermin di recipe.config pada model
  const sent = toRustConfig(KONFIGURASI[k].stwv);
  const rc = loaded.text.recipe.config;
  const keys = ["lowercase", "stemming_method", "stopwords_method", "delimiters", "ngram_min", "ngram_max", "formula_standard", "tf_method", "idf_method", "normalization", "words_to_keep", "min_term_freq"];
  const bad = keys.filter((x) => JSON.stringify(rc[x]) !== JSON.stringify(sent[x]));
  check(`${k} RESEP: recipe.config memuat ${keys.length} opsi preprocessing yang sama dengan yang dikirim NB: ${bad.length} berbeda`, bad.length === 0, bad.map((x) => `${x}: ${JSON.stringify(rc[x])} vs ${JSON.stringify(sent[x])}`).join("; "));
  const r = loaded.text.recipe;
  check(`${k} RESEP: kosakata ${r.vocabulary.length} == text.terms ${loaded.text.terms.length}, idf ${r.idf.length}, doc_freq ${r.doc_freq.length}, n_docs ${r.n_docs} (= 630 baris latih), recipe_version ${r.recipe_version}`,
    r.vocabulary.length === loaded.text.terms.length && r.idf.length === r.vocabulary.length && r.doc_freq.length === r.vocabulary.length && r.n_docs === 630 && JSON.stringify(r.vocabulary) === JSON.stringify(loaded.text.terms));
  check(`${k} RESEP: variabel teks model "${loaded.text.raw_variable}" == variabel teks form NB "${configData.main.RawTextVar}"`, loaded.text.raw_variable === configData.main.RawTextVar);
  check(`${k} Apply Model tanpa galat/peringatan: errors=${JSON.stringify(am.errors)}, warnings=${JSON.stringify(am.data.warnings)}`, am.data.warnings.length === 0);
}
finish("IT-02 (tingkat wasm)");
