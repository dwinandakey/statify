// it01_stwv_to_nb.mjs — IT-01: kolom VEC_ keluaran STWV dipakai sebagai Word-Vector Variables di Naive Bayes.
//
// Alur (wasm yang sama dengan aplikasi; pustaka headless Track D):
//   1. STWV (wasm) pada kolom "Text Tweet" pilkada_train -> kosakata + matriks (fit pada seluruh 630 baris).
//   2. Penamaan kolom dataset seperti aplikasi: awalan "VEC_" + kata, lalu processVariableName (SALINAN logika
//      useVariableStore.ts baris 29-60; versi ASLI diuji oleh tes Jest integration.it01.* lewat pemuat sumber).
//   3. Naive Bayes jalur Word-Vector (TextVectorVars = semua kolom VEC_; Id/Pasangan Calon/Text Tweet dikeluarkan).
// Yang diperiksa: jumlah term model = jumlah kolom VEC_, ringkasan teks Rust (n_terms, deskripsi, catatan W-LEAK),
// kesamaan parameter model dengan jalur Raw Text pada kosakata yang sama, dan keterlacakan nama kolom.
// Peringatan kebocoran pada ANTARMUKA (Variables tab) dan pada Output Viewer diuji oleh Jest/RTL dan daftar periksa manual.
import { logWasmInfo, readCsv, makeVariables, naiveBayesDefault, buildNaiveBayesPayload, naiveBayesRun, exportModel,
  stwvTransform, toRustConfig, KONFIGURASI, PIL, check, finish, trainRaw, deepBitCompare, stwvOverride } from "./it_util.mjs";

logWasmInfo();

// SALINAN processVariableName (frontend/stores/useVariableStore.ts:29-60), hanya dipakai di skrip Node ini.
const RESERVED = new Set(["ALL", "AND", "BY", "EQ", "GE", "GT", "LE", "LT", "NE", "NOT", "OR", "TO", "WITH"]);
function processVariableName(name, existingNames) {
  let p = name.trim().replace(/\s+/g, "_");
  p = p.replace(/[^A-Za-z0-9._@#$]/g, "_");
  if (!/^[A-Za-z@#$]/.test(p)) p = "VAR_" + p;
  p = p.replace(/[._]+$/g, "");
  if (p.length > 64) p = p.slice(0, 64);
  if (RESERVED.has(p.toUpperCase())) p = "VAR_" + p;
  const lower = existingNames.map((n) => n.toLowerCase());
  if (lower.includes(p.toLowerCase())) {
    let counter = 1; const base = p.slice(0, 60); let u = p;
    while (lower.includes(u.toLowerCase())) { u = `${base}_${counter}`; counter++; }
    p = u;
  }
  return p;
}

const train = readCsv(PIL.train);
const tcol = train.header.indexOf(PIL.textCol);
const docs = train.rows.map((r) => r[tcol] ?? "");
console.log(`data latih ${train.rows.length} baris; kolom ${JSON.stringify(train.header)}`);

const summary = [];
for (const W of [1000, 200]) {
  console.log(`\n--- STWV Words to Keep = ${W} -> kolom VEC_ -> Naive Bayes (Word-Vector Variables)`);
  const stwvCfg = stwvOverride({ wordsToKeep: W });
  const out = await stwvTransform(docs, toRustConfig(stwvCfg));
  const nVec = out.vocabulary.length;
  // nama kolom seperti aplikasi (buildColumnData + processVariableName terhadap variabel yang sudah ada)
  const existing = [...train.header];
  const claimed = [];
  const vecNames = out.vocabulary.map((term, i) => {
    const name = processVariableName(`VEC_${term}`, [...existing, ...claimed]) || `VEC_VAR_${i}`;
    claimed.push(name);
    return name;
  });
  check(`W=${W}: STWV menghasilkan ${nVec} kolom VEC_ (kosakata) dan semua nama unik`, nVec === (W === 1000 ? out.vocabulary.length : W) && new Set(vecNames.map((n) => n.toLowerCase())).size === nVec, `kosakata=${nVec}`);
  // Catatan (BUGS_F F-01): kata yang seluruh karakternya tidak sah (mis. "&") menjadi "VEC__" lalu garis bawah di ujung
  // dibuang oleh processVariableName -> nama "VEC" (tanpa garis bawah). Kolom itu tidak terjaring filter "VEC_" di NB.
  const notPrefixed = vecNames.map((n, i) => [out.vocabulary[i], n]).filter(([, n]) => !n.startsWith("VEC_"));
  const viaFilter = vecNames.filter((n) => n.toLowerCase().includes("vec_")).length;
  console.log(`INFO  W=${W}: nama kolom tanpa awalan "VEC_" = ${notPrefixed.length} ${JSON.stringify(notPrefixed)}; kolom yang terjaring filter teks "VEC_" di daftar variabel NB = ${viaFilter} dari ${nVec}`);

  // dataset gabungan: kolom asli + kolom VEC_ (sel sebagai string, seperti data aplikasi)
  const header = [...train.header, ...vecNames];
  const rows = train.rows.map((r, i) => [...r, ...out.matrix[i].map((v) => String(v))]);
  const variables = makeVariables(header, rows, { [PIL.textCol]: { type: "STRING", measure: "nominal" }, [PIL.labelCol]: { type: "STRING", measure: "nominal" } });
  const cfg = naiveBayesDefault();
  cfg.main.TargetVar = PIL.labelCol;
  cfg.main.ExcludedVar = [...PIL.excluded, PIL.textCol];
  cfg.main.TextVectorVars = vecNames;
  cfg.main.TextSource = "vector";
  cfg.options.TextLikelihood = "multinomial";
  cfg.validation.RandomSeed = 42;
  const payload = buildNaiveBayesPayload({ data: rows, variables, configData: cfg });
  check(`W=${W}: payload NB: text.source="vector", ${payload.text.columns?.length} kolom, ${payload.text.values?.length} baris, predictor non-teks=${payload.predictors.length}`,
    payload.text.source === "vector" && payload.text.columns.length === nVec && payload.text.values.length === 630 && payload.predictors.length === 0);
  const nb = await naiveBayesRun(payload);
  check(`W=${W}: NB tanpa galat: ${JSON.stringify(nb.errors)}`, typeof nb.errors === "string" && /no errors/i.test(nb.errors));
  const { model } = exportModel(nb.data);
  const t = model.text;
  check(`W=${W}: model.text.source = "vector"`, t.source === "vector");
  check(`W=${W}: JUMLAH TERM MODEL (text.terms) = ${t.terms.length} = jumlah kolom VEC_ = ${nVec}`, t.terms.length === nVec);
  check(`W=${W}: text.columns (${Array.isArray(t.columns) ? t.columns.length : "-"}) memuat nama kolom VEC_ persis dan urutan sama`, Array.isArray(t.columns) && JSON.stringify(t.columns) === JSON.stringify(vecNames));
  check(`W=${W}: log_weights per kelas berukuran ${nVec} (${Object.entries(t.log_weights).map(([c, a]) => `${c}:${a.length}`).join(", ")})`, Object.values(t.log_weights).every((a) => a.length === nVec));
  const tf = nb.data.case_processing_summary.text_features;
  check(`W=${W}: ringkasan Rust: n_terms=${tf.n_terms}, deskripsi "${tf.description}"`, tf.n_terms === nVec && tf.description === `Word vectors: ${nVec} columns` && tf.source === "vector");
  check(`W=${W}: catatan kebocoran (leakage_note) dari Rust terisi`, typeof tf.leakage_note === "string" && tf.leakage_note.length > 0, JSON.stringify(tf.leakage_note));
  check(`W=${W}: model vektor TIDAK membawa resep (recipe tidak ada) — AM harus menerima kolom vektor jadi`, t.recipe === undefined || t.recipe === null);
  check(`W=${W}: jumlah fitur non-teks model = 0 (Id, Pasangan Calon, Text Tweet dikeluarkan)`, model.features.length === 0 && model.feature_order.length === 0);

  // kesamaan dengan jalur Raw Text (kosakata sama; hitungan sama) — bukti bahwa kolom VEC_ membawa informasi yang sama
  const raw = await trainRaw({ train, kconfig: { ...KONFIGURASI.K1, stwv: stwvCfg } });
  const rt = raw.model.text;
  const sameTerms = JSON.stringify(rt.terms) === JSON.stringify(out.vocabulary);
  let maxLw = 0; for (const c of Object.keys(rt.log_weights)) rt.log_weights[c].forEach((v, i) => { maxLw = Math.max(maxLw, Math.abs(v - t.log_weights[c][i])); });
  const priorsSame = JSON.stringify(raw.model.target.class_priors) === JSON.stringify(model.target.class_priors);
  check(`W=${W}: model Raw Text (kosakata ${rt.terms.length}) sama dengan model Word-Vector: kosakata ${sameTerms ? "sama" : "BEDA"}, prior ${priorsSame ? "sama" : "BEDA"}, selisih log_weights maksimum ${maxLw}`, sameTerms && priorsSame && maxLw === 0);
  const em = (r) => r.data.evaluation_metrics?.overall_accuracy;
  console.log(`INFO  W=${W}: akurasi holdout 30% — Word-Vector (kosakata & bobot dari SEMUA baris, berpotensi optimistis) ${em(nb)} vs Raw Text (resep dari baris latih saja) ${em(raw.nb)}`);
  summary.push({ W, nVec, notPrefixed: notPrefixed.length, viaFilter, terms: t.terms.length, columns: t.columns.length, accVec: em(nb), accRaw: em(raw.nb), leakage_note: tf.leakage_note });
}
console.log("\nRINGKASAN_IT01 " + JSON.stringify(summary));
finish("IT-01 (tingkat wasm)");
