# Track A - Pengujian unit tambahan (modul Text Analytics Statify)

Dokumen ini dibangkitkan oleh `testing/thesis-eval/unit/build_A_unit.py` dari `unit/A_unit.template.md`, `logs/jest_A_vm.json`, dan fungsi `#[test]` pada `tests/thesis_*.rs`. Kolom Status berisi penanda `⟦jest:...⟧` dan `⟦rust:...⟧` yang diganti oleh `tools/apply_results.py` dari log; status tidak diketik manual.

## 1. Ringkasan

| Hal | Hasil |
|---|---|
| Tes Jest Track A (4 berkas) | **105 kasus, 105 lulus, 0 gagal** (VM Linux, `logs/jest_A_vm.json`, `logs/jest_A_vm.txt`) |
| Tes Rust Track A (4 target) | **{{RUST_N}} fungsi tes ditulis; BELUM DIJALANKAN** (toolchain Rust tidak dapat dipakai di sesi penulisan; perintah ada di `run_A.ps1`) |
| Nilai acuan independen | `unit/reference_values.py` (Python + numpy, 80 kombinasi TF x IDF x normalisasi, 16 skenario Words to Keep/Min term frequency, 5 skenario stopword, 18 skenario n-gram); log `logs/reference_values.txt`. Kombinasi sah-sklearn (27) dibandingkan langsung dengan scikit-learn: selisih maksimum 0. Nilai golden lama PLAN_FIX 3.6 cocok. |
| Cakupan Jest | Diukur di VM per menu, sebelum dan sesudah Track A (bagian 4). STWV 51,37% menjadi 53,39%; Naive Bayes 87,01% (tidak berubah); Apply Model 97,50% menjadi 97,77% (cakupan baris). |
| Cakupan Rust | **Tidak terukur**, lihat `run_A.ps1` (`cargo llvm-cov` bila terpasang). Hanya ada estimasi statis celah (bagian 4.2), bukan cakupan terukur. |
| Temuan | `BUGS_A.md`: A-1 `KFolds = 1` diterima dan menghasilkan evaluasi tanpa data latih (sisi TS terverifikasi dengan tes yang dijalankan; sisi Rust menunggu `cargo test`); tiga catatan informasional (A-2 sampai A-4). |

Catatan lingkungan: Jest dijalankan dengan `jest.thesis.config.js` (ts-jest, `isolatedModules`, diagnostik TypeScript dimatikan) melalui `tools/run_jest_linux.sh` di VM Linux; `run_A.ps1` menjalankan ulang empat berkas yang sama dengan konfigurasi produksi repo di Windows (`logs/jest_A_win.json`), sehingga hasil Windows tetap harus dicek pengguna. Seed acak 42 dan toleransi 1e-6 dipakai di semua tes numerik.

## 2. Cakupan tugas dan berkas yang dibuat

| Butir | Isi | Berkas |
|---|---|---|
| a | Rumus TF (5), IDF (3 variabel + none), normalisasi (L1, L2, doc_length), grid 80 kombinasi, preset Weka (12 sah) dan sklearn (27 sah), definisi T(d) | `statify-text-core/tests/thesis_formulas.rs`, `tests/thesis_data/formula_grid.json`; Jest `StringToWordVector/__tests__/thesis/formula-output.thesis.test.ts` |
| b | Words to Keep dan Min term frequency pada nilai seri | `statify-text-core/tests/thesis_vocab_limit.rs`, `tests/thesis_data/vocab_limit_cases.json` |
| c | Stopword Indonesia, Inggris, kustom; Sastrawi; Porter; n-gram 1-5 | `statify-text-core/tests/thesis_text_pipeline.rs`, `tests/thesis_data/{pipeline_cases,stopwords_id,stopwords_en}.json`; Jest `StringToWordVector/__tests__/thesis/stopwords.thesis.test.ts` |
| d | Stratified holdout 70/30 dan k-fold (selisih per kelas <= 1) | `naive-bayes/rust/tests/thesis_partition.rs` |
| e | `KFolds = 1`: jalur kode, tes, laporan bug | `thesis_partition.rs` (bagian e); Jest `naive-bayes/hooks/__tests__/thesis/kfold.thesis.test.ts`; `BUGS_A.md` |
| f | Pemuatan model Apply Model: >10 MB, JSON rusak, schema tidak dikenal, kelas kosong, kosakata kosong | Jest `apply-model/services/__tests__/thesis/model-loader.thesis.test.ts` |
| tambahan | Skrip dan log | `unit/reference_values.py`, `unit/static_gap_rust.py`, `unit/cov_table.js`, `unit/sklearn_kfold_check.py`, `unit/build_A_unit.py`, `run_A.ps1`, `logs/*` |

Tes TypeScript lain di luar butir a sampai f (butir 3 tugas) dimasukkan ke dalam berkas Jest di atas (pemetaan opsi UI terhadap validator Rust, tooltip rumus, `buildStwvOutput` pada korpus D, batas 200 istilah, penerusan `KFolds` ke konfigurasi worker, pemetaan pesan galat fold) karena semuanya fungsi murni dan masing-masing kecil.

## 3. Tes yang ditambahkan

### 3.1 Jest ({{JEST_N}} kasus; DIJALANKAN di VM)

{{JEST_TABLE}}

### 3.2 Rust ({{RUST_N}} fungsi tes; BELUM DIJALANKAN)

Seluruh tes Rust di bawah ditulis tanpa dapat dikompilasi. Pengecekan yang dilakukan sebagai pengganti: `rustfmt --check` (hanya parse sintaks, tanpa galat pada semua berkas `thesis_*.rs`; `logs/audit_rustfmt_syntax_cloud.txt`; ini BUKAN kompilasi), pembacaan ulang setiap berkas baris demi baris terhadap signature sumber (nama impor, tipe argumen, nama field `VectorizerOutput`, `TextVectorizerModel`, `HoldoutSplit`, `StratifiedKFold`, `PredictionScores`, `EvaluationMetrics`), dan penyalinan pola `cfg`/`run` dari `s3_formulas.rs` yang sudah terbukti kompil. Kesalahan kompilasi tetap mungkin; bila ada, perbaiki di berkas tes saja.

{{RUST_TABLE}}

Pernyataan harapan yang tidak berasal dari nilai acuan Python independen (jujur dicatat):
- Stemmer Indonesia (Sastrawi): hanya `memakan` menjadi `makan` dan `makan` menjadi `makan` yang diperiksa persis (pasangan pertama sudah terbukti oleh tes lama `characterization.rs`). Untuk kata lain hanya properti (tidak kosong, tidak lebih panjang, huruf kecil, deterministik) dan bahwa `dimakan`, `berlari`, `membanggakan` berubah.
- Stemmer Inggris (Porter2/Snowball): sembilan pasangan klasik (`running`, `cats`, `dogs`, `jumped`, `caresses`, `ponies`, `ties`, `cries`, `caress`) berasal dari dokumentasi algoritma Snowball English langkah 1a/1b, bukan dari eksekusi di sesi ini. Bila `cargo test` menunjukkan keluaran lain, periksa dulu versi crate `rust-stemmers` sebelum menyimpulkan ada bug.
- Tes `k1_*` pada `thesis_partition.rs` menegaskan PERILAKU SAAT INI kode sumber (bukan perilaku yang seharusnya; lihat `BUGS_A.md` A-1): data latih kosong, semua prediksi jatuh ke kelas alfabetis pertama, akurasi 3/9, kappa 0. Klaim itu HIPOTESIS dari pembacaan kode: percobaan `rustc` di sandbox yang pernah dicatat penulis tidak punya skrip/log yang tersimpan di `logs/`, sehingga tidak dihitung; status resmi menunggu `cargo test` di Windows.
- Ukuran fold [9, 6, 6, 6, 6] dan [2, 2, 2, 0, 0, 0] pada `thesis_partition.rs` diturunkan dari algoritma round-robin di kode dan belum dieksekusi pada jalur yang terdokumentasi (menunggu `cargo test` di Windows). Tiga tes tambahan mengunci keluaran awal MT19937 seed 42 (sama dengan `numpy.random.RandomState(42)`) dan indeks eksak partisi holdout/k-fold seed 42 terhadap replika Python independen.

## 4. Celah cakupan

### 4.1 Jest (TERUKUR di VM, cakupan baris istanbul/babel; `logs/coverage_jest_summary_vm.txt`, `logs/coverage_jest_<menu>_vm.json`, `logs/coverage_jest_<menu>_A_vm.json`)

Pengukuran memakai tes lama masing-masing menu (baseline) dan tes lama ditambah berkas `*.thesis.test` milik Track A (sesudah). Tes thesis milik track lain sengaja dikecualikan dari kedua pengukuran agar angka Track A tidak tercampur.

| Menu | Kasus (baseline -> sesudah) | Baris baseline | Baris sesudah | Fungsi | Cabang |
|---|---|---|---|---|---|
| Text Analytics: String to Word Vector | 111 -> 133 | 280/545 = 51,37% | 291/545 = 53,39% | 48,00% -> 48,66% | 56,70% -> 63,40% |
| Naive Bayes | 292 -> 321 | 1146/1317 = 87,01% | 1146/1317 = 87,01% | 82,11% (tetap) | 79,16% (tetap) |
| Apply Model | 466 -> 520 | 1444/1481 = 97,50% | 1448/1481 = 97,77% | 97,04% (tetap) | 88,80% -> 88,95% |

Berkas dengan cakupan baris < 70% (hanya dari data terukur; tidak berubah oleh Track A karena Track A menguji fungsi murni, bukan komponen React):

| Menu | Berkas | Baris | Catatan |
|---|---|---|---|
| STWV | `StringToWordVector/OptionsTab.tsx` | 0/58 = 0% | komponen UI; tidak ada tes render |
| STWV | `StringToWordVector/StringToWordVectorModal.tsx` | 0/37 = 0% | komponen UI |
| STWV | `StringToWordVector/VariablesTab.tsx` | 0/15 = 0% | komponen UI |
| STWV | `StringToWordVector/stringToWord.processor.ts` | 0/14 = 0% | pembungkus pemanggilan worker |
| STWV | `StringToWordVector/hooks/useStringToWordVector.ts` | 0/128 = 0% | hook orkestrasi (banyak efek samping) |
| Naive Bayes | `naive-bayes/components/export-model-output.tsx` | 0/22 = 0% | komponen UI |
| Naive Bayes | `naive-bayes/dialogs/validation.tsx` | 7/39 = 17,94% | dialog validasi |
| Apply Model | (tidak ada) | | semua berkas >= 70%; terendah `model-tab.tsx` 87,32% dan `apply-model-output.ts` 85,36% |

Berkas Naive Bayes yang di atas 70% tetapi relatif lemah: `naive-bayes-main.tsx` 76,16%, `naive-bayes-analysis.ts` 70,00%, `dataset-variable-list.tsx` 82,69%. Catatan: cakupan dihitung atas berkas sumber yang tercantum pada `coverage_jest_<menu>_vm.json` (berkas yang tidak pernah dimuat tes pun tercantum dengan 0%); angka ini per menu, bukan seluruh aplikasi.

### 4.2 Rust (ESTIMASI STATIS, BUKAN cakupan terukur)

Metode (rinci di docstring `unit/static_gap_rust.py`, keluaran `logs/static_gap_rust.txt`): daftar `pub fn` tiap crate (di luar blok `#[cfg(test)]`), lalu cari nama itu sebagai kata utuh pada teks tes (berkas `tests/*.rs` dan blok `#[cfg(test)]` pada `src/`). Crate inti juga dicari pada tes crate yang bergantung padanya (Naive Bayes, Apply Model, wrapper STWV). Fungsi `#[wasm_bindgen]` dan nama umum (`new`, `default`, `from`, ...) tidak dihitung sebagai celah.

**Batasan:** rujukan nama bukan cakupan baris. Fungsi yang dirujuk tes bisa hanya sebagian cabangnya dieksekusi; fungsi yang tidak dirujuk bisa saja tereksekusi tak langsung (contoh di bawah: `validate_config` dan `vectorize` dipanggil dari `run_pipeline`). Cakupan Rust terukur: **tidak terukur, lihat `run_A.ps1` (`cargo llvm-cov` bila terpasang)**.

| Crate | `pub fn` terdeteksi | dihitung | `wasm_bindgen` | Tidak dirujuk tes sebelum Track A | Tidak dirujuk tes sesudah Track A |
|---|---|---|---|---|---|
| statify-text-core | 34 | 27 | 0 | 12 | 10 |
| naive-bayes (crate `wasm`) | 86 | 83 | 1 | 13 | 13 |
| apply-model (crate `wasm`) | 45 | 42 | 1 | 16 | 16 |
| StringToWordVector/rust (wrapper) | 2 | 0 | 2 | 0 | 0 |

Penutupan celah oleh Track A (estimasi statis, komentar tidak dihitung): `stemmer::stem_batch` dan `stopwords::build_set` (inti). Crate Naive Bayes tidak berubah menurut metode ini karena `thesis_partition.rs` memakai fungsi yang sudah dirujuk tes inline; nilainya terletak pada kasus uji, bukan pada nama baru.

Celah tersisa menurut estimasi (nama fungsi, bukan baris):
- statify-text-core: `config.rs` (`v1_label` untuk `TfMethod` dan `IdfMethod`), `error.rs::to_json_string`, `stopwords.rs::filter_with_set`, `tokenizer.rs` (`tokenize`, `compile_regex`), `validator.rs` (`validate`, `validate_config`, `validate_formula`), `vectorizer.rs::vectorize`. Kecuali `v1_label` dan `to_json_string`, fungsi lainnya dijalankan tak langsung oleh `run_pipeline`/`prepare` (jalur yang diuji semua tes di atas), jadi "tidak dirujuk" tidak berarti "tidak tereksekusi". Kandidat tes langsung berikutnya: `tokenize` dengan delimiter kustom/regex tidak valid, `validate_formula` (matriks kombinasi sah per standar), dan `to_json_string`.
- naive-bayes: `stats/save.rs` (`export_validation_config`, `retrain_final_model`, `build_export_text`, `build_exported_model_v2`), `stats/text_feature_table.rs` (`likelihood_name`, `top_as_map`), `stats/text_features.rs::build_text_feature_data_with_config`, `utils/converter.rs::string_to_js_error`, `utils/error.rs::add_error`, serta pembungkus `wasm/{constructor,function}.rs` (`get_formatted_results`, `get_all_errors`) yang hanya dapat diuji lewat wasm-bindgen-test.
- apply-model: `scoring/text.rs` (`likelihood_name`, `is_v2`, `has_text_block`, `validate_feature_likelihoods`, `validate_text_block`, `extract_text_model`), `stats/value_label.rs::format_number_label`, `utils/{converter,error}.rs`, dan pembungkus `wasm/*`.

Berkas yang tidak satu pun `pub fn`-nya dirujuk tes (estimasi): core `config.rs`, `error.rs`, `tokenizer.rs`, `validator.rs`; naive-bayes `utils/converter.rs`, `wasm/constructor.rs`; apply-model `utils/converter.rs`, `utils/error.rs`, `wasm/constructor.rs`.

## 5. Sudah tercakup oleh tes lama (tidak diulang)

Tes baru sengaja tidak menduplikasi hal berikut; rujukan ke berkas dan nama tes lama.

| Butir | Tes lama | Isi yang sudah tercakup |
|---|---|---|
| a. Rumus | `statify-text-core/tests/s3_formulas.rs`: `golden_weka_raw_none_none_sama_dengan_raw_count`, `golden_weka_log1p_standard_none`, `golden_weka_raw_standard_doc_length`, `golden_sklearn_raw_smooth_l2`, `golden_sklearn_raw_plus1_l2`, `golden_sklearn_raw_smooth_none_dan_nilai_idf`, `golden_lama_sublinear_smooth_none_custom`, `normalisasi_l1_menjumlah_satu_per_baris`, `normalisasi_l2_menghasilkan_norma_satu`, `custom_menerima_semua_kombinasi_termasuk_normalized`, `kombinasi_sah_per_standar_diterima`, `kombinasi_tidak_sah_menghasilkan_invalid_config`, `dokumen_kosong_tetap_baris_nol_tanpa_nan_pada_l1_l2_doc_length`, `df_satu_pass_sama_dengan_hitungan_naif`; `characterization.rs::{golden_lama_log_smooth_none_pada_korpus_d, raw_none_menghasilkan_raw_count}`; `s2_pipeline.rs::tf_log1p_dan_idf_plus1_dihitung_sesuai_rumus` | Golden PLAN_FIX 3.6 untuk beberapa kombinasi, norma baris, validitas kombinasi per standar, dokumen kosong tanpa NaN. Track A menambahkan seluruh 80 kombinasi pada korpus D, nilai tiap rumus TF/IDF, T(d) dengan n-gram, dan nilai acuan Python independen. |
| b. Kosakata | `s3_formulas.rs`: `min_term_freq_2_membuang_tidak`, `min_term_freq_diterapkan_sebelum_words_to_keep`, `min_term_freq_terlalu_besar_menghasilkan_empty_vocabulary`, `words_to_keep_1_weka_adalah_makan_dengan_count_4`, `words_to_keep_0_menyimpan_semua_kata`, `words_to_keep_tie_break_alfabetis_weka_dan_sklearn` (korpus D, keep = 2), `words_to_keep_custom_memakai_skor_tf_idf_cara_lama`, `words_to_keep_custom_idf_standar_membuang_kata_yang_ada_di_semua_dokumen`; `characterization.rs::words_to_keep_2_pada_korpus_d_cara_lama` | Keep 0/1/2, mtf 2, urutan mtf lalu keep, kasus seri pada korpus D. Catatan: pernyataan seri tiga arah pada `words_to_keep_tie_break_alfabetis_weka_dan_sklearn` berbentuk tautologi (`BUGS_A.md` A-4); kasus itu dijaga ulang di `thesis_vocab_limit.rs`. |
| c. Pipeline NLP | `characterization.rs`: `ngram_unigram_vs_bigram`, `stopwords_custom_tidak_peka_huruf_besar_kecil`, `stemming_indonesia_memakan_menjadi_makan`, `stemming_inggris_running_menjadi_run`, `stemming_selalu_lowercase_walau_opsi_lowercase_mati`, `validator_ngram_tidak_valid_ditolak`, `semua_token_terbuang_menghasilkan_empty_vocabulary`; `s2_pipeline.rs`: `t6_stopwords_json_rusak_menghasilkan_invalid_stopwords`, `stopwords_json_rusak_diabaikan_bila_metode_none`, `stopwords_metode_bawaan_dengan_daftar_dari_frontend_memfilter`, `stopwords_tanpa_daftar_lanjut_tanpa_filter`, `pipeline_stopwords_dan_stemming_inggris`, `validasi_rentang_config` | Satu contoh per perilaku. Track A menambahkan daftar bawaan utuh (758 dan 1298 entri), acuan Python stopword/n-gram, 15 rentang n-gram, urutan stopword terhadap stemming, dan sifat stemmer. |
| c. TS STWV | `StringToWordVector/__tests__/config.test.ts`: default, preset sklearn, `words_to_keep` 0, `min_term_freq`, mode word memaksa n-gram 1..1, daftar kustom di-trim, validasi n-gram min > max dan ukuran 6, n-gram 1..5 (satu contoh); `buildStwvOutput.test.ts` | Konfigurasi dan pembuatan keluaran dasar. |
| d. Partisi | tes inline `naive-bayes/rust/src/stats/partition.rs` (blok `#[cfg(test)]` setelah baris 280): holdout 80/20 (56/14), setiap indeks tepat sekali, determinisme per seed, `validate_fold_count` (0 dan negatif diblok, folds > instance diblok, peringatan, tanpa peringatan), k-fold menyekat tiap indeks tepat sekali, 3 kelas x 20 pada 5 fold = 4 per kelas per fold, peringatan bila fold > kelas terkecil, `training_test_split_for_fold` | Track A menambahkan 70/30 dan 60/40, properti selisih per kelas <= 1 pada beberapa komposisi kelas dan seed, kelas beranggota satu, serta karakterisasi ukuran fold. |
| e. KFolds | Jest `whitebox.getNumericInputError.test.ts` (jalur 20-23 dan catatan "KFolds = 1 masih diterima"), `useNaiveBayesValidation.test.ts` ("menolak jumlah fold < 1 pada mode kfold"); Rust `partition.rs::folds_less_than_one_is_hard_blocked` | Hanya batas "< 1". Track A menambahkan tabel batas lengkap, penerusan ke worker, dan jalur Rust untuk k = 1 (latih kosong). |
| f. Model loader | Jest `apply-model/services/__tests__/model-loader.test.ts`: `ukuran 11 MB -> AM_E_FILE_TOO_LARGE`, `ukuran tepat 10 MB masih diterima`, `isi "{bad" -> AM_E_PARSE`, `file .txt -> AM_E_PARSE`, `file.text() gagal dibaca -> AM_E_PARSE`, `JSON valid tetapi bukan objek -> AM_E_NOT_OBJECT`, `model_type "decision_tree" -> AM_E_MODEL_TYPE_UNSUPPORTED` | Satu contoh per jenis. Track A menambahkan batas +/- 1 byte tanpa membaca isi, urutan pemeriksaan, 10 varian JSON rusak, schema tidak dikenal, kelas kosong, kosakata kosong, dan lima fixture ekspor nyata. |

## 6. Baseline pengujian

Angka Jest berasal dari eksekusi di VM Linux (log disebut di kolom Lokasi; label [VM], bukan perangkat skripsi). Rust: baris "tes lama" berasal dari eksekusi nyata `cargo test` di Windows pengguna (`logs/unit_core.txt`, `logs/unit_nb.txt`, `logs/unit_am.txt`, 7 Oktober 2026 12:43 UTC; label [Win], sama dengan `01_baseline.md`). Baris Rust "Track A": jumlah dihitung statis dari kemunculan `#[test]` (bukan hasil eksekusi); Lulus/Gagal BELUM DIJALANKAN karena berkas tes baru belum pernah dikompilasi; cakupan Rust tidak terukur.

| Lapisan | Lokasi pengujian | Jumlah kasus | Lulus | Gagal | Cakupan baris |
|---|---|---|---|---|---|
| Jest STWV (sebelum Track A) | `Transform/StringToWordVector/**/__tests__` (9 suite; `logs/coverage_jest_stwv_vm.txt`) | 111 | 111 | 0 | 51,37% (280/545) |
| Jest STWV (sesudah Track A) | idem + 2 berkas `*.thesis.test.ts` Track A (11 suite; `logs/jest_covA_stwv_run.json`) | 133 | 133 | 0 | 53,39% (291/545) |
| Jest Naive Bayes (sebelum) | `Classify/naive-bayes/**/__tests__` (15 suite; `logs/coverage_jest_nb_vm.txt`) | 292 | 292 | 0 | 87,01% (1146/1317) |
| Jest Naive Bayes (sesudah) | idem + `kfold.thesis.test.ts` (16 suite; `logs/jest_covA_nb_run.json`) | 321 | 321 | 0 | 87,01% (1146/1317) |
| Jest Apply Model (sebelum) | `Classify/apply-model/**/__tests__` (26 suite; `logs/coverage_jest_am_vm.txt`) | 466 | 466 | 0 | 97,50% (1444/1481) |
| Jest Apply Model (sesudah) | idem + `model-loader.thesis.test.ts` (27 suite; `logs/jest_covA_am_run.json`) | 520 | 520 | 0 | 97,77% (1448/1481) |
| Jest Track A saja | 4 berkas `*.thesis.test.ts` (4 suite; `logs/jest_A_vm.json`) | 105 | 105 | 0 | (tidak diukur terpisah) |
| Rust statify-text-core (tes lama) [Win] | `statify-text-core/tests/{characterization,nb_text,s2_pipeline,s3_formulas,s4_fit_transform}.rs` (`logs/unit_core.txt`) | 91 | 91 | 0 | tidak terukur, lihat `run_A.ps1` |
| Rust statify-text-core (Track A) | `tests/thesis_{formulas,vocab_limit,text_pipeline}.rs` | {{CORE_NEW}} (hitungan statis) | BELUM DIJALANKAN | BELUM DIJALANKAN | tidak terukur, lihat `run_A.ps1` |
| Rust naive-bayes (tes lama inline) [Win] | `naive-bayes/rust/src/**` blok `#[cfg(test)]` (`logs/unit_nb.txt`) | 203 | 203 | 0 | tidak terukur, lihat `run_A.ps1` |
| Rust naive-bayes (Track A) | `naive-bayes/rust/tests/thesis_partition.rs` | {{NB_NEW}} (hitungan statis) | BELUM DIJALANKAN | BELUM DIJALANKAN | tidak terukur, lihat `run_A.ps1` |
| Rust apply-model (tes lama) [Win] | `apply-model/rust/src/**` blok `#[cfg(test)]` (117) + `rust/tests/text_scoring.rs` (39) (`logs/unit_am.txt`) | 156 | 156 | 0 | tidak terukur, lihat `run_A.ps1` |
| Rust wrapper STWV | `StringToWordVector/rust` | 0 | tidak ada tes | tidak ada tes | tidak terukur |

Catatan baseline: kolom Jest "sebelum" memuat hanya tes lama tiap menu pada konfigurasi tesis (tes thesis track lain dikecualikan). Berkas `logs/jest_A_vm_part1.json` dan `logs/jest_A_vm_part2.json` adalah salinan identik `jest_A_vm.json` (berkas pecahan lama tidak dapat dihapus dari sandbox karena penghapusan tidak diizinkan); jangan dijumlahkan.

## 7. Temuan

Rincian, lokasi file:baris, langkah reproduksi, dampak, usulan, dan label keyakinan ada di `BUGS_A.md`. Ringkas:
- **A-1 (sedang):** `KFolds = 1` diterima di TS (`useNaiveBayesValidation.ts:255`) dan Rust (`partition.rs:179`); satu fold berarti data latih kosong dan hasil evaluasi tidak bermakna tanpa peringatan. Usulan: batas minimum 2 di kedua lapisan. TS terverifikasi dengan tes yang dijalankan; Rust menunggu `cargo test`.
- **A-2 (informasi):** ukuran total fold k-fold tidak seimbang ([9, 6, 6, 6, 6] untuk 3 kelas x 11 pada k = 5, pembanding scikit-learn [7, 7, 7, 6, 6]); syarat selisih per kelas <= 1 tetap terpenuhi.
- **A-3 (informasi):** k lebih besar dari kelas terbesar menghasilkan fold uji kosong; peringatan tetap muncul.
- **A-4 (informasi):** asersi tautologi pada tes lama `s3_formulas.rs:277`.

## 8. Cara menjalankan ulang

Di Windows (dari akar repo): `powershell -ExecutionPolicy Bypass -File testing\thesis-eval\run_A.ps1`. Skrip menjalankan nilai acuan Python (bila `python` ada), empat target `cargo test`, `cargo llvm-cov` (bila terpasang; bila tidak, mencatat "tidak terpasang" ke `logs/rust_llvm_cov_*.txt`), dan Jest standar untuk empat berkas Track A (`logs/jest_A_win.json`). Skrip idempoten dan tidak menghapus apa pun. Setelah itu jalankan `tools/apply_results.py` untuk mengganti penanda status.

Di VM Linux (sudah dilakukan): `timeout 170 testing/thesis-eval/tools/run_jest_linux.sh --runInBand --json --outputFile=<ABSOLUT> <path tes>`; ringkasan cakupan: `node testing/thesis-eval/unit/cov_table.js [A]` dari folder `logs`.
