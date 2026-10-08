# Pustaka headless Statify (`statify_wasm.mjs`)

Memanggil **biner WebAssembly yang sama dengan aplikasi** dari Node.js, tanpa menulis ulang rumus:

| Modul | Berkas wasm (relatif akar repo) | Dipakai aplikasi oleh |
|---|---|---|
| STWV | `frontend/components/Modals/Transform/StringToWordVector/wasm-output/statify_string_to_word{.js,_bg.wasm}` | `stringToWord.processor.ts` |
| Naive Bayes | `frontend/public/workers/Classify/NaiveBayes/pkg/wasm{.js,_bg.wasm}` | `naive-bayes.worker.js` |
| Apply Model | `frontend/public/workers/Classify/ApplyModel/pkg/wasm{.js,_bg.wasm}` | `apply-model.worker.js` |

Persyaratan: Node >= 18 (diuji Node 22.22 di cloud, 22.23 di VM Linux; Windows pengguna Node 24). Tanpa `npm install`.
Berjalan di Linux dan Windows; jalur dihitung dari lokasi berkas (`…/testing/text_analytics_eval/headless/` -> akar repo),
dapat ditimpa dengan variabel lingkungan `STATIFY_REPO_ROOT`.

Setiap skrip yang memakai pustaka ini memanggil `logWasmInfo()` sehingga **sha256 ketiga wasm tercetak di log**.
Nilai pada saat dokumen ini ditulis:

```
stwv sha256=94ef9c8b5693fb779112724225b297e2392a47ca0376ef1239d02332d7146669 (1.464.043 B)
nb   sha256=163a5b8f482ae84503cb81943dd958033be900dfbef05f8c242977e1615a1fd8 (1.843.034 B)
am   sha256=036c9fd9dbd9f14baf84dcb031c1fe5e452f3b990511a39cfb5c66ab6592e3fc (1.627.140 B)
```

## Cara memuat wasm

Glue `wasm-bindgen --target web` diimpor sebagai modul ES (`import(pathToFileURL(...))`), lalu
`initSync({ module: bytes })` dengan byte `.wasm` dibaca dari disk (tanpa `fetch`). Itu setara dengan
`init(WASM_URL)` di worker; bedanya hanya sumber byte-nya.

## API

Semua fungsi `async` kecuali yang disebut sinkron. Semua sel dataset berupa **string** (seperti data hasil impor CSV di aplikasi).

### Provenans dan utilitas
| Fungsi | Keterangan |
|---|---|
| `repoRoot` | akar repo yang dipakai |
| `wasmInfo()` (sync) | `{stwv,nb,am: {wasm, bytes, sha256, glue_sha256}}` |
| `envInfo()` (sync) | versi Node, OS, CPU |
| `logWasmInfo(logger=console.log)` (sync) | mencetak versi Node dan sha256 wasm; mengembalikan `wasmInfo()` |
| `readCsv(path)` / `parseCsv(text)` (sync) | `{header, rows}` / `string[][]`; RFC 4180 (kutip, `""`, baris baru dalam sel), BOM dibuang |
| `toCsv(rows)` (sync) | kebalikannya |
| `makeVariables(header, rows, overrides)` (sync) | `Variable[]` ala aplikasi (NUMERIC/scale bila semua sel numerik, selain itu STRING/nominal); `overrides[nama]={type,measure,role}` |

### STWV
| Fungsi | Keterangan |
|---|---|
| `stwvTransform(docs, rustConfig)` | `process_text_data(docs, config)` -> `{vocabulary, matrix, stats}` (matriks dense, fit + transform pada `docs` yang sama, seperti menu STWV) |
| `toRustConfig(stwvConfig)` (sync) | PORT `toRustConfig` (`STWV/config.ts`) termasuk daftar stopword dari `constants/stopwords.ts` |
| `STWV_DEFAULT_CONFIG`, `stwvOverride(over)` (sync) | default UI (Weka/raw/none/none, W=1000, delimiter default) dan penimpaan dangkal per bagian |

### Naive Bayes (jalur Raw Text)
| Fungsi | Keterangan |
|---|---|
| `naiveBayesDefault()` (sync) | salinan `NaiveBayesDefault` (`{main, options, validation, output, text}`) |
| `buildNaiveBayesPayload({data, variables, configData})` (sync) | meniru container NB + `analyzeNaiveBayes`: `{target, predictors, targetDefs, predictorsDefs, config, text}` yang di-`postMessage` ke worker. `data` = string[][] seluruh dataset. Jalur Raw Text: `main.RawTextVar` diisi. |
| `naiveBayesRun(payload)` | `new NaiveBayesAnalysis(...)` -> `{data: get_formatted_results(), errors: get_all_errors()}`. `data.trained_model` = model yang diekspor tombol Export Model. Melempar bila konstruktor gagal (kode `NB_E_*`). |
| `exportModel(rawResult)` (sync) | `{json, model}`: `JSON.stringify(trained_model, null, 2)` lalu `JSON.parse` (persis `export-model-output.tsx`) |
| `getSlicedData`, `getVarDefs`, `getEffective*`, `buildNaiveBayesWorkerConfig`, `buildNaiveBayesTextPayload`, `splitNaiveBayesDataVariables` | PORT fungsi TS asli dengan nama sama |

### Apply Model
| Fungsi | Keterangan |
|---|---|
| `buildApplyModelPayload({model, data, variables, mapping})` (sync) | PORT bagian pembentukan payload `applyModel`; `mapping = {FeatureMapping, ActualTargetVar, RawTextVar, VectorMapping}`. Deskriptor fitur diturunkan dari `model.feature_order` dan `model.text`. |
| `applyModelRun(payload)` | `new ApplyModelAnalysis(predictors, predictorDefs, mapping, actual, actualDefs, model, text)` -> `{data, errors}`. `data.predictions = {predicted[], max_probability[], class_probabilities[kelas][baris]}`; **probabilitas dibulatkan 4 desimal oleh wasm** (`round4`). |
| `readRawTextValues(...)` | PORT |

### Alur lengkap dan konfigurasi evaluasi
| Fungsi | Keterangan |
|---|---|
| `runTrainApply({train, test, textCol, labelCol, excluded, kconfig, seed=42})` | NB pada `train` (resep STWV dari data latih saja) -> Export Model -> Apply Model pada `test`. Mengembalikan `{nb, model, modelJson, am, predicted, maxProb, classes, classProb, timings}`. `excluded` = kolom yang dikeluarkan dari prediktor (mode Exclude), mis. `Id`. |
| `KONFIGURASI` | `K1..K6` dan varian `K1w,K2w,K3w,K4w,K5w` (Words to Keep = 0), `K1m,K2m,K5m` (W=1042; khusus pilkada). Tiap entri `{desc, stwv, likelihood, alpha}`. |

Contoh:

```js
import { logWasmInfo, readCsv, runTrainApply, KONFIGURASI } from "./statify_wasm.mjs";
logWasmInfo();
const train = readCsv("Claude outputs/pilkada_train.csv"), test = readCsv("Claude outputs/pilkada_test.csv");
const r = await runTrainApply({ train, test, textCol: "Text Tweet", labelCol: "Sentiment",
                                excluded: ["Id", "Pasangan Calon"], kconfig: KONFIGURASI.K1 });
console.log(r.predicted.slice(0, 5), r.classProb[0].slice(0, 5), r.timings);
```

Untuk pengukuran waktu (Track E) dan integrasi (Track F): `naiveBayesRun`/`applyModelRun`/`stwvTransform` bisa dipanggil
langsung dengan payload buatan sendiri; `runTrainApply().timings` memisahkan waktu latih (pembentukan payload + NB wasm) dan terap
(pembentukan payload + AM wasm) dalam milidetik (`performance.now()`), BUKAN pengukuran perangkat skripsi bila dijalankan di sandbox.

## Yang TIDAK dijalankan secara headless
- Validasi adapter TypeScript (`validateAnyModel`, kode `AM_E_*` sisi TS) — wasm AM memvalidasi modelnya sendiri.
- Penulisan Output Viewer, penamaan kolom hasil, penyimpanan variabel ke dataset (store Zustand/Dexie).
- Kesetaraan pembangun payload dengan TS diperiksa oleh tes Jest `naive-bayes/services/__tests__/eval/payload_equivalence.nb.test.ts` dan `apply-model/services/__tests__/eval/payload_equivalence.am.test.ts` (golden: `payload_golden.json` dari `make_payload_golden.mjs`).

## Uji kecil
`node testing/text_analytics_eval/headless/selftest.mjs` — memuat ketiga wasm dan menjalankan data mini (keluar kode 1 bila gagal).
