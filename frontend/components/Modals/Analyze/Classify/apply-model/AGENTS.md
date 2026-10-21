# AGENTS.md — Apply Model (Analyze → Classify → Apply Model)

Kontrak kerja untuk agen AI yang mengubah folder ini. Penjelasan untuk manusia ada di `README.md`.
Hierarki dokumen bila bertentangan: `../naive-bayes/docs/AGENTS_V2.md` (§8 schema 2.0, §10 Apply Model v2) > dokumen ini >
`docs/PLAN.md`/`docs/DOKUMENTASI.md` (historis; `VERIFY-RESULT.md` v1 sudah dihapus, riwayat di git). Kode di working tree adalah sumber kebenaran fakta; bila dokumen
dan kode berbeda, laporkan dulu, jangan "memperbaiki" salah satunya diam-diam.

Versi kontrak lama yang panjang (v1, 817 baris, desain per fase) masih bisa dibaca lewat git:
`git show 2111b956:frontend/components/Modals/Analyze/Classify/apply-model/AGENTS.md`.

Singkatan path: `AM/` = folder ini, `NB/` = `../naive-bayes/`, `CORE/` = `frontend/public/workers/TextAnalytics/statify-text-core/`,
`FE/` = `frontend/`.

## 0. Aturan proyek (wajib)

- Jangan `git commit`, `git push`, `git add`, `git stash`, atau `git checkout` sendiri. Siapkan perubahan, lalu berikan perintah PowerShell (baris per baris) dan draf pesan commit untuk direview Lewis. Branch kerja `dija-v2`, identitas commit "Dija".
- Jangan deploy.
- Paket evaluasi hanya di `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/` (bukan `testing/`). Data uji di `text_analytics_eval/accuracy/datasets/` (lihat `MANIFEST.md`). Jangan merujuk folder "Claude outputs".
- Angka pengujian di dokumen harus sama dengan `text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md`: Rust 564 (core 155 / Naive Bayes 242 / Apply Model 167), Jest 1.250 dalam 80 suite (String to Word Vector 171 / Naive Bayes 388 / Apply Model 691), cakupan baris Jest 72,18% / 94,43% / 97,80%, white-box 54 jalur. Bila jumlah tes berubah, laporkan angka barunya.
- Penulisan: "WEKA", "Snowball/Porter2", "Client-Side Rendering (CSR)" pada penyebutan pertama, nama menu String to Word Vector, Naive Bayes, Apply Model. Teks UI berbahasa Inggris.
- Jangan menghapus berkas tanpa izin eksplisit. Jangan mengubah komponen/store bersama (`VariableListManager`,
  `components/ui/*`, `useModal`, `useIndexedDB`, `useVariableStore`, `useDataStore`, `useResultStore`,
  `Output/Statistics/index.tsx`) atau folder Classify lain demi kebutuhan Apply Model.

Build WASM:

- Smart App Control di laptop pengembang dapat memblokir build Rust/WASM di Windows; jangan mematikannya. Build WASM selalu di WSL Ubuntu: tulis skrip `.sh` dulu (kutip PowerShell ke bash rumit), jalankan `wsl -d Ubuntu -e bash <skrip>.sh`, dan di skrip `source $HOME/.cargo/env` serta set `CARGO_TARGET_DIR` di `$HOME`. Repo tidak menyimpan skrip build (`build-wasm.sh` sudah tidak ada).
- `cargo test` crate core, Naive Bayes, dan Apply Model bisa di Windows (`$env:CARGO_PROFILE_TEST_DEBUG = "0"` bila Application Control memblokir biner tes). Crate String to Word Vector hanya dapat dibangun di WSL.
- Build WASM dan `run_all.ps1` menulis berkas: jalankan hanya bila diminta Lewis dan tidak ada thread lain yang sedang menguji.
- Di skrip, dari folder `rust/`: `wasm-pack build --target web --release`; lalu salin empat berkas `pkg` (lihat §3).

## 1. Peta berkas kunci

| Berkas | Isi yang penting |
|---|---|
| `adapters/types.ts` | `ClassifierModelAdapter`, `ModelDescriptor` (`features[]` urut `feature_order`, `text?: ModelTextDescriptor`), `ModelValidationResult`. |
| `adapters/registry.ts` | `CLASSIFIER_MODEL_ADAPTERS = { naive_bayes }`, `getModelAdapter` (pakai `hasOwnProperty`), `validateAnyModel` (NOT_OBJECT → MODEL_TYPE_MISSING → MODEL_TYPE_UNSUPPORTED → adapter). |
| `adapters/naive-bayes-adapter.ts` | `naiveBayesModelAdapter`: versi `["1.0","1.1","2.0"]`, prefix `"NB"`, `resultStoreSource { componentKey: "Export Model", payloadKey: "naiveBayesTrainedModel" }`; validasi langkah 1–13; `buildDescriptor`. |
| `constants/apply-model-codes.ts` | Union `ApplyModelErrorCode`/`WarningCode`/`InfoCode`, `ALL_APPLY_MODEL_CODES`, `APPLY_MODEL_MESSAGES` (Inggris; error diberi akhiran ` (AM_E_...)` lewat `withCode`). |
| `constants/apply-model-default.ts` | `ApplyModelDefault` (SourceKind `"file"`, Save max prob ON / per kelas OFF, lima flag Output ON, `RawTextVar: null`, `VectorMapping: {}`). |
| `constants/builtin-models.ts` | `BUILTIN_MODELS = []` (sengaja kosong). |
| `types/model-schema.ts`, `types/apply-model.ts`, `types/apply-model-worker.ts` | Bentuk JSON model; state form; `ApplyModelWorkerPayload`, `ApplyModelTextPayload`, `ApplyModelRawResult`. |
| `hooks/useApplyModelMappingRules.ts` | `autoMapFeatures`, `validateMapping`, `summarizeVectorMapping`, `formatVectorMappingSummary`, `getEligibleVariablesForFeature`, `getEligibleActualTargetVariables`. |
| `hooks/useApplyModelSaveRules.ts` | `resolvePredictedColumnType`, `getOutputColumnSpecs`, `validateCustomOutputNames`, `validateNamePrefix`, `resolveFinalOutputNames`. |
| `hooks/useApplyModelValidation.ts` | `computeApplyModelValidation` (murni) dan `useApplyModelValidation` (memo), `formatApplyModelIssueMessage`. |
| `hooks/tourConfig.ts` | `buildApplyModelTourSteps` (tur Help dwibahasa; langkah fitur teks hanya bila model punya Text). |
| `dialogs/apply-model-main.tsx` | Default export `ApplyModelMain` (`BaseModalProps`); `applyLoadedModel`, `mergeWithDefaults`, `reconcileForDatasetChange`, `getVariablesFingerprint` (salinan NB), IndexedDB `"ApplyModel"`. |
| `services/model-loader.ts` | `loadModelFromFile`, `listResultStoreModels`, `loadModelFromResultStore`, `loadBuiltinModel`, `MAX_MODEL_FILE_BYTES = 10 MB`. |
| `services/apply-model-analysis.ts` | `applyModel`, `readRawTextValues`, `APPLY_MODEL_WASM_VERSION`, `APPLY_MODEL_WORKER_URL`. |
| `services/apply-model-formatter.ts`, `apply-model-interpretation.ts`, `apply-model-output.ts` | Tabel, interpretasi HTML (murni, tanpa LLM), penulisan ke result store. |
| `services/apply-model-save-variables.ts` | `buildOutputColumns`, `saveApplyModelVariables` (satu `addVariables`). |
| `services/apply-model-error-messages.ts` | `getUserFriendlyApplyModelError`. |
| `rust/src/scoring/mod.rs` | `RowScore`, `FeatureSpec`, `TextRowInput`, trait `ClassifierScorer` (default `text_model`/`score_row_with_text`), `build_scorer`. |
| `rust/src/scoring/naive_bayes.rs` | `NaiveBayesScorer::from_json`, `validate_model` (langkah 1–11), `log_gaussian_density`, `safe_ln`, scoring per baris. |
| `rust/src/scoring/text.rs` | `validate_feature_likelihoods` (langkah 12), `validate_text_block` (13), `extract_text_model`, `TextModel::prepare` (`prepare_raw` → `CORE::transform`; `prepare_vector` → CSR isi 0), `finish` → `CORE::nb_text::score_rows`. |
| `rust/src/stats/` | `value_label.rs` (salinan NB), `posterior.rs` (`normalize_log_scores`, `argmax_with_tie_break`, `round4`), `summary.rs`, `evaluation.rs`, `classification_table.rs` (salinan utuh NB). |
| `rust/src/wasm/constructor.rs`, `function.rs` | Kelas `ApplyModelAnalysis` (7 argumen), `run_apply_model_with_text`, `validate_payload`, `get_formatted_results`, `get_all_errors`. |
| `FE/public/workers/Classify/ApplyModel/apply-model.worker.js` + `pkg/` | Worker modul; konstanta versi cache sendiri. |

## 2. Invarian (jangan dilanggar)

### 2.1 Arsitektur
- Komputasi probabilitas hanya di Rust. TS hanya orkestrasi, penamaan kolom, dan penulisan ke store. Rust tidak
  menyentuh store.
- Dilarang menaruh `if (modelType === "naive_bayes")` di luar adapter/scorer NB dan berkas registry. Menambah algoritma
  = satu adapter TS + satu scorer Rust + satu baris registrasi di masing-masing sisi.
- Kode teks (tokenisasi, stopword, stemming, TF/IDF, normalisasi, likelihood teks) **tidak boleh** disalin ke crate ini;
  selalu panggil `statify-text-core` (path dependency di `rust/Cargo.toml`). Sebaliknya, salinan dari NB v1
  (`value_label.rs`, `classification_table.rs`, `log_gaussian_density`, `safe_ln`, tie-break, `utils/`,
  `models/data.rs`) harus tetap identik dengan sumber NB; jangan ubah satu sisi saja.
- Jangan menambah dependency npm atau crate.

### 2.2 Kontrak model (dibaca, tidak pernah ditulis oleh AM)
- Format = JSON hasil Export Model NB (`NB/rust/src/stats/save.rs`). Nama field tidak boleh diubah. Field tak dikenal
  diabaikan. Field `text` pada schema selain `2.0` diabaikan.
- Schema diterima: `1.0` (warning `AM_W_LEGACY_SCHEMA`, kategori tak dikenal dilewati), `1.1` dan `2.0`
  (wajib `target.class_counts` dan `class_totals` per fitur categorical; kategori tak dikenal = `α / (class_total + α·K)`).
- Validasi adapter, berurutan: (1) schema_version [stop], (2) field wajib [stop], (3) tipe, (4) kelas kosong/duplikat,
  (5) prior (panjang, [0,1], Σ = 1 ± 1e-6), (6) `smoothing_alpha`/`variance_floor` > 0, (7) `feature_order` (boleh kosong
  hanya untuk model 2.0 hanya-teks), (8) role, (9) distribusi categorical (0,1], Σ = 1 ± 1e-6, (10) Gaussian
  (varians > 0), (11) counts/class_totals untuk 1.1 dan 2.0, (12) `likelihood` per fitur 2.0 (`categorical`;
  `gaussian`/`gaussian_minstd` dengan `min_variance` > 0), (13) blok `text`. Langkah 3–13 mengumpulkan semua error.
- Blok `text` (langkah 13): `source` ∈ {raw, vector} (`AM_E_NB2_TEXT_SOURCE`); `likelihood` ∈ {multinomial, bernoulli,
  complement} (`AM_E_NB2_LIKELIHOOD`); `alpha` > 0; `uses_class_prior` harus `false` hanya untuk Complement dengan K ≥ 2;
  Complement tidak boleh bersama fitur lain (`AM_E_NB2_COMPLEMENT_MIXED`); `terms` tidak kosong dan unik; raw wajib
  `raw_variable` + `recipe` (`config`, `resolved_stopwords`, `vocabulary == terms`, panjang `idf` = jumlah term); vector
  wajib `columns == terms`; `log_weights`, `class_term_counts` (≥ 0), dan untuk Bernoulli `log_weights_absent`, per kelas
  sepanjang `terms` (`AM_E_NB2_TEXT_SHAPE`). Rust menambah cek tanda/finit bobot dan panjang `doc_freq`.
- TS (`naive-bayes-adapter.ts`) dan Rust (`naive_bayes.rs` + `text.rs`) harus memberi **kode yang sama** untuk model
  rusak yang sama. Mengubah satu sisi = mengubah sisi lain dan tes keduanya.

### 2.3 Memuat model
- Semua sumber lewat `validateAnyModel`. Model yang gagal validasi tidak boleh masuk `formData.model.ModelJson`;
  invarian: `ModelJson !== null` berarti lolos validasi (`mergeWithDefaults` membuang model tersimpan yang tidak lagi
  valid).
- File: akhiran `.json` (selain itu `AM_E_PARSE`), ≤ 10 MB (`AM_E_FILE_TOO_LARGE`), parse gagal `AM_E_PARSE`.
- Result store: statistic dengan `components === adapter.resultStoreSource.componentKey` (`"Export Model"`), model di
  `output_data[payloadKey]`; urut id menurun; `loadResults()` dipanggil tepat sekali bila `logs` kosong. Key
  `"Export Model"` dan `"naiveBayesTrainedModel"` milik NB; jangan di-rename.
- Built-in: `fetch(entry.path)`, `model_type` isi file harus sama dengan `entry.modelType`. Katalog tetap kosong kecuali
  diminta.

### 2.4 Pemetaan
- Auto-map: nama persis, lalu case-insensitive bila kandidat tepat satu; satu variabel tidak dipakai dua kali (fitur,
  Raw Text, dan kolom vektor berbagi himpunan `used`). Auto-map tidak memeriksa measure fitur; validasi yang menolaknya.
- Role ↔ measure: categorical ↔ nominal/ordinal; numerical ↔ scale dan bukan STRING. Measure `unknown` →
  `AM_E_MAP_MEASURE_UNKNOWN`.
- Raw Text: wajib dipetakan ke variabel STRING. Word-Vector: kolom model yang tidak ditemukan **diisi 0 dan tidak
  memblokir** (`AM_I_TEXT_ZERO_FILLED`, severity `info`); semua tak ditemukan + tanpa fitur lain → `AM_W_TEXT_ALL_ZERO_FILLED`
  (warning, tetap tidak memblokir). Pengecualian ini berlaku hanya untuk kolom vektor.
- Actual target: nominal/ordinal, bukan prediktor atau variabel teks. Opsional.
- `isValid` = model ada **dan** tidak ada issue `severity: "error"` (warning/info tidak memblokir OK).

### 2.5 Payload dan preprocessing data baru
- Satu `getSlicedData` untuk `[prediktor..., kolom vektor terpetakan..., actual?]` agar panjang baris identik.
- Teks Raw dibaca langsung dari `dataVariables` lewat `readRawTextValues` (tanpa `getSlicedData`/`parseFloat`, supaya
  "3 kucing lucu" tidak menjadi 3); kosong/spasi → `null`.
- Payload model tanpa Text **tidak boleh** punya key `text` (payload v1 identik). Model dengan Text tanpa payload →
  `AM_E_PAYLOAD`. Vector: `mapped_columns` = indeks ke `model.text.columns`, `values[row]` sejajar `mapped_columns`;
  non-angka/non-finit → `null` (Rust: 0); negatif → `AM_E_TEXT_NEGATIVE` sebelum scoring.
- Jalur raw: `CORE::transform(recipe, docs)` hanya membaca recipe; jangan pernah memanggil `fit`/`fit_transform` atau
  menghitung ulang vocabulary/IDF/norma dari data baru.
- Aturan baris missing ada di `scoring/text.rs`, bukan di CORE: semua prediktor missing (termasuk teks) → `NotScored`;
  bila masih ada prediktor lain, teks missing = vektor nol (Multinomial/Complement kontribusi 0, Bernoulli tetap Σ A).
  Complement hanya-teks dengan teks missing → `NotScored`. Vector: missing bila semua kolom **terpetakan** kosong; kolom
  yang diisi 0 tidak dihitung "ada nilai". Jangan menambah filter "baris nol".

### 2.6 Scoring (identik dengan NB)
- `s_c = safe_ln(prior_c) + Σ log N(x; μ, σ²) + Σ safe_ln(P(kategori|c)) + kontribusi teks`;
  `safe_ln(p) = ln p` bila p > 0, selain itu `ln(f64::MIN_POSITIVE)`; varians dijaga `max(f64::MIN_POSITIVE)`.
  Varians di model sudah melewati variance floor/min-std saat training; jangan diberi lantai lagi.
- Label kategori: `data_value_to_label` (trim; angka bulat tanpa desimal; missing → `"(Missing)"`), cocok
  case-sensitive. Missing: `Null`, teks kosong/spasi, angka non-finit.
- Posterior log-sum-exp; argmax dengan iterasi kelas urut byte-wise naik dan menang hanya bila **lebih besar**;
  probabilitas output `round4`, kelas prediksi dari skor mentah.
- Contoh acuan T1–T7 (model 6 baris, α = 1) di `docs/DOKUMENTASI.md` B.5 dan `docs/PLAN.md`; golden teks P(pos) Multinomial
  0,849057, Bernoulli 0,944708, Complement 0,737705. Tes yang memuat angka-angka ini tidak boleh diubah untuk
  "meloloskan" perubahan kode.

### 2.7 Output
- Kolom (urutan tetap): `${P}_PredictedValue` (NUMERIC bila semua kelas cocok `^-?\d+(\.\d+)?$`, selain itu STRING;
  measure nominal), `${P}_PredictedProbability`, `${P}_Probability_${kelas}` (NUMERIC, scale, 4 desimal); `P` = prefix
  atau `"NB"`. Nama akhir dihitung **sebelum** worker oleh `resolveFinalOutputNames` (`processVariableName`, identik
  dengan `addVariables`). Tulis lewat **satu** `addVariables`; jangan pernah `updateCells` variabel lama; sel `null`
  dilewati.
- Validasi nama kustom: kosong, pola `^[A-Za-z@#$][A-Za-z0-9._@#$]*$`, > 64, kata cadangan
  (`ALL AND BY EQ GE GT LE LT NE NOT OR TO WITH`), duplikat → `AM_E_NAME_*`. `UseCustomNames` dengan nama kosong tidak
  jatuh ke default.
- `components` statistic wajib unik dan berawalan `"Apply Model "`: Summary, Case Processing Summary, Prediction
  Distribution, Saved Variables (selalu), Evaluation Metrics, Cohen's Kappa, Confusion Matrix. Jangan memakai
  `"Case Processing Summary"` atau `"Export Model"`.

### 2.8 Kode error dan pesan
- Pesan Rust selalu `"AM_E_XXX: detail"`. Kode baru wajib ditambahkan ke union, `ALL_APPLY_MODEL_CODES`, dan
  `APPLY_MODEL_MESSAGES` (tes `constants/__tests__/apply-model-codes.test.ts` memeriksa kelengkapannya).
- UI dan pesan berbahasa Inggris (`../naive-bayes/docs/PLAN_V3_UI_EN.md`); pesan error diakhiri kode dalam kurung (`withCode`); warning/info
  tanpa kode. UI tidak boleh menyebut nama produk lain. (Kontrak v1 lama menyebut pesan bahasa Indonesia; itu usang.)

### 2.9 WASM dan worker
- Signature constructor `ApplyModelAnalysis(predictors, predictorDefs, mapping, actual, actualDefs, model, text)`;
  `text` `undefined`/`null` = tanpa Text. Respons worker `{ success: true, data, errors }` atau
  `{ success: false, error }`.
- Setiap kali `pkg/` diganti: naikkan `APPLY_MODEL_WASM_VERSION` (`services/apply-model-analysis.ts`) **dan** konstanta
  di `apply-model.worker.js` ke nilai yang sama (format sekarang `apply-model-v3-YYYYMMDD<huruf>`, terakhir
  `apply-model-v3-20261022a`).

## 3. Verifikasi perubahan

Jalankan dari folder yang disebut. Jangan menjalankan perintah yang menulis berkas (build, `--coverage`,
`eval_compare`, `run_all.ps1`) bila diminta bekerja read-only atau ada thread lain yang sedang menguji.

```powershell
# Rust (AM\rust)
cargo test --lib --test text_scoring        # 154 tes bawaan
cargo test --test eval_blackbox_am          # 12 tes black-box skripsi
# Jest (frontend)
npx jest components/Modals/Analyze/Classify/apply-model --coverage=false   # 691 tes (447 + 244 evaluasi)
npx eslint components/Modals/Analyze/Classify/apply-model --ext .ts,.tsx --max-warnings=0
npx tsc --noEmit -p .
```

- Mengubah `scoring/*`, `stats/*`, atau `wasm/*`: jalankan cargo test, build WASM di WSL, salin empat berkas `pkg`
  (`wasm.js`, `wasm_bg.wasm`, `wasm.d.ts`, `wasm_bg.wasm.d.ts`; jangan menimpa `pkg/.gitignore`/`package.json` di
  `public`), naikkan versi cache, lalu jalankan Jest dan uji manual di browser. Tes Jest unit memakai mock worker; hanya tes
  evaluasi (`services/__tests__/eval/blackbox.am.pipeline`, `integration.it0*`) yang memuat
  `public/.../ApplyModel/pkg/wasm_bg.wasm` sungguhan (dilewati bila berkas tidak ada). `cargo test --test eval_compare`
  mendeteksi wasm basi terhadap sumber (butuh `NB/text_analytics_eval/accuracy/out/model_statify_<K>.json`).
- Mengubah validasi model: perbarui tes adapter (`adapters/__tests__/`) dan tes Rust untuk kode yang sama.
- Mengubah sesuatu yang memengaruhi angka di laporan skripsi: uji ulang lewat
  `NB/text_analytics_eval/run_all.ps1` (performa saja: `-SkipBaseline -Only E`) dan perbarui
  `NB/text_analytics_eval/LAPORAN_UJI_ULANG_22Okt.md` (angka final ada di §0).

## 4. Jebakan yang diketahui

- Jest harus dijalankan dari `frontend` (alias `@/`).
- `AM_E_SERIALIZE` (Rust `rust/src/wasm/function.rs:55`) terdaftar di `constants/apply-model-codes.ts` (51 kode error). Kode error baru dari Rust wajib ditambahkan ke union, `ALL_APPLY_MODEL_CODES`, dan `APPLY_MODEL_MESSAGES` sekaligus.
- Label parameter validasi sama di kedua lapis: "Validation (training)" (tab Model dari TS adapter dan Output Viewer dari Rust). Bila diubah, ubah tes TS, tes Rust, dan `naive-bayes/text_analytics_eval/integration/browser/it_browser.spec.ts`.
- `AM_E_NO_ROWS` praktis hanya muncul bila dataset kosong; kolom terpetakan yang seluruhnya kosong menghasilkan baris
  Not scored, bukan error. Model vector hanya-teks tanpa kolom terpetakan meminjam satu kolom dataset untuk jumlah baris.
- Model JSON ikut disimpan di IndexedDB; model Word-Vector besar (fixture 2,8–3,4 MB) memperbesar data tersimpan.
  Payload vector padat `baris × kolom terpetakan`.
- `getUserFriendlyApplyModelError` menerima dua format detail `AM_E_TEXT_NEGATIVE` (Inggris baru dan Indonesia lama);
  pertahankan keduanya selama ada WASM lama.
- `services/__fixtures__/Naive_Bayes_Model_Export (*).json` adalah export nyata dari uji manual; nama berkas mengandung
  spasi dan kurung, kutip saat dipakai di shell.
- `NB/AGENTS.md` dan `NB/docs/AGENTS_V2.md` mengunci fungsi NB yang disalin ke sini; perubahan rumus harus disetujui
  pemilik dan diterapkan di kedua crate.
