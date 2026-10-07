# BUGS_A - pengamatan Track A (pengujian unit tambahan)

Seluruh 105 tes Jest Track A lulus di VM (`logs/jest_A_vm.json`). `cargo test` Rust Track A BELUM DIJALANKAN (crate serde/wasm-bindgen tidak dapat diunduh di sandbox). Catatan penulis tentang percobaan `rustc` langsung terhadap modul sumber (harness dengan stub serde) TIDAK dapat ditelusuri: skrip dan keluarannya tidak disimpan di `logs/`, dan jumlah tes yang disebut (18) tidak sama dengan angka di komentar berkas tes (15 dari 15). Karena itu percobaan itu tidak dihitung sebagai hasil; status tes Rust Track A tetap BELUM DIJALANKAN dan keyakinan sisi Rust adalah analisis kode, menunggu `cargo test` di Windows.

Skala keyakinan yang dipakai: **terverifikasi dengan tes yang dijalankan** (Jest di VM), **analisis kode, menunggu cargo test** (dibaca baris demi baris, belum dieksekusi), **dugaan** (inferensi tanpa pembuktian).

## A-1 (sedang): `KFolds = 1` lolos validasi dan menghasilkan evaluasi tanpa data latih

Ringkas: formulir Naive Bayes dan engine Rust sama-sama menerima jumlah fold 1. Satu fold berarti seluruh data menjadi data uji dan data latih kosong, sehingga metrik "cross-validation" yang dilaporkan tidak bermakna dan tidak disertai galat atau peringatan.

### Lokasi (file:baris)
| Lapisan | Lokasi | Isi relevan |
|---|---|---|
| TS validasi | `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts:254-256` | `if (typeof folds !== "number" \|\| !Number.isInteger(folds) \|\| folds < 1) return "The number of folds must be at least 1."` |
| Rust validasi | `.../naive-bayes/rust/src/stats/partition.rs:174-185` (`validate_fold_count`, cabang `folds < 1` di baris 179) | k = 1 lolos; tidak ada peringatan karena `1 <= ukuran kelas terkecil` (baris 201-206) |
| Rust pembagian | `.../rust/src/stats/partition.rs:219-250` (`stratified_k_fold`) dan `:260-272` (`training_test_split_for_fold`) | satu bucket berisi semua indeks; indeks latih = gabungan bucket lain = kosong |
| Rust evaluasi | `.../rust/src/wasm/function.rs:535-575` (loop fold), `:425-465` (`evaluate_split`, jalur setara-v1 memanggil `train_and_predict`) dan `:378-420` (`train_and_predict`) | `train_naive_bayes_model` dipanggil dengan 0 baris latih |
| Rust prior | `.../rust/src/stats/class_prior.rs:34-52` | `total = 0` menghasilkan prior 0.0 untuk semua kelas (tidak panik; sudah ada tes lama `empty_cases_gives_zero_priors_without_panicking`) |
| Rust prediksi | `.../rust/src/stats/prediction.rs:163-169` (`safe_ln`) dan `:207-290` (`predict_case_inner`, argmax `score > best_score`) | `ln(0)` dinaikkan ke `ln(MIN_POSITIVE)`; skor tiap kelas sama dan berhingga |
| Spesifikasi | `AGENTS.md` bagian 4.2 (minimum 1) menurut `BUGS_B.md` B-2 | perilaku saat ini sesuai spesifikasi tertulis, tetapi spesifikasinya yang perlu ditinjau |

### Langkah reproduksi
1. Antarmuka: buka Naive Bayes, pilih Validation = K-Fold, isi Number of folds = 1, jalankan analisis pada dataset kelas biner mana pun. Tidak ada pesan galat; hasil muncul.
2. Sisi TS (tanpa antarmuka): `getNumericInputError` dengan `ValidationMethod = "kfold"`, `KFolds = 1` mengembalikan `null`. Tes: `kfold.thesis.test.ts` > "thesis A(e): batas jumlah fold pada getNumericInputError KARAKTERISASI TEMUAN: KFolds = 1 DITERIMA (hanya nilai < 1 yang ditolak)". DIJALANKAN dan lulus.
3. Sisi Rust: `cargo test --test thesis_partition` di `.../naive-bayes/rust` (`k1_lolos_validate_fold_count_tanpa_peringatan`, `k1_menghasilkan_satu_fold_berisi_semua_indeks`, `k1_fold_latih_kosong_dan_fold_uji_adalah_seluruh_data`, `k1_evaluasi_end_to_end_tanpa_panic_tanpa_nan_tetapi_semua_prediksi_kelas_alfabetis_pertama`). Belum dieksekusi pada jalur yang terdokumentasi (lihat catatan di awal berkas): ekspektasinya kini dinyatakan sebagai "PERILAKU SAAT INI" (bukan perilaku yang seharusnya) di komentar tes. `cargo test` Windows BELUM DIJALANKAN.

### Dampak
- Data latih tiap evaluasi k = 1 kosong. Analisis kode, menunggu `cargo test` (jalur numerik/kategorik): semua kelas mendapat prior 0, skor sama, argmax memakai `score > best` pada kelas terurut alfabetis sehingga SEMUA prediksi jatuh ke kelas alfabetis pertama. Akurasi yang dilaporkan sama dengan proporsi kelas itu (mis. 3/9 pada fixture tes) dan Kappa 0, tanpa galat. Pengguna bisa menyalin angka itu sebagai hasil validasi silang.
- Jalur teks mentah (Raw text): kosakata data latih kosong sehingga galat `NB_E_TEXT_EMPTY_VOCAB_FOLD` muncul (`raw_text.rs:105`). Galat itu benar menghentikan analisis, tetapi petunjuknya "or use fewer folds" menyesatkan untuk k = 1 (penyebabnya terlalu sedikit fold, bukan terlalu banyak). Pemeta pesan (`naive-bayes-error-messages.ts:57-77`) meneruskan petunjuk yang sama.
- Pesan batas minimum yang ditampilkan ("at least 1") justru menyatakan 1 sah, sehingga pengguna tidak punya petunjuk.
- Koreksi catatan `BUGS_B.md` B-2: pada k = 1 yang kosong adalah data LATIH (seluruh data menjadi data uji), bukan data uji.

### Usulan
Batas minimum 2 di kedua lapisan, dengan pesan diperbarui:
- TS: `useNaiveBayesValidation.ts:255` ubah `folds < 1` menjadi `folds < 2`; pesan menjadi "The number of folds must be at least 2.".
- Rust: `partition.rs:179` ubah `folds < 1` menjadi `folds < 2`; pesan menjadi "Number of folds must be at least 2 (got {}).".
- Sesuaikan tes yang mengkarakterisasi perilaku lama: `kfold.thesis.test.ts` (KFolds = 1 menjadi ditolak), `thesis_partition.rs` (k1_* menjadi `Err`), tes lama `folds_less_than_one_is_hard_blocked`, `whitebox.getNumericInputError`, `useNaiveBayesValidation.test.ts`, dan teks AGENTS.md 4.2.
- Tidak mengubah kode produksi dalam paket ini (aturan Track A).

### Keyakinan
- Sisi TS (k = 1 diterima): **terverifikasi dengan tes yang dijalankan**.
- Sisi Rust (partisi satu fold dengan latih kosong, prediksi seragam, akurasi 3/9, kappa 0 pada fixture 9 baris): **analisis kode, menunggu `cargo test`** (percobaan harness `rustc` di sandbox tidak punya log yang dapat ditelusuri, jadi tidak dihitung). Jalur teks mentah (`NB_E_TEXT_EMPTY_VOCAB_FOLD`) tetap **analisis kode**: `fit_split` memanggil `fit_transform` dengan daftar dokumen kosong, galat `EMPTY_INPUT` pemeta `map_core_error` menjadi kode itu (tidak dieksekusi).

## A-2 (informasi): ukuran fold total tidak seimbang pada k-fold bertingkat

- Lokasi: `partition.rs:236-244` (loop `offset % folds_count`). Tiap kelas dibagi round-robin mulai dari fold 0, sehingga sisa tiap kelas selalu jatuh pada fold-fold awal.
- Contoh terkarakterisasi di `thesis_partition.rs` (`kfold_karakterisasi_ukuran_fold_tidak_seimbang_pada_tiga_kelas_sama_besar`): 3 kelas x 11 data pada k = 5 menghasilkan ukuran fold [9, 6, 6, 6, 6] (turunan dari kode; belum dieksekusi pada jalur yang terdokumentasi); `StratifiedKFold` scikit-learn (shuffle, seed 42) memberi [7, 7, 7, 6, 6] untuk data yang sama (DIJALANKAN: `unit/sklearn_kfold_check.py`, `logs/sklearn_kfold_check.txt`). Selisih per kelas tetap <= 1 (properti yang diminta terpenuhi), hanya selisih total antarfold bisa mencapai jumlah kelas.
- Dampak: kecil; evaluasi gabungan (pooled) tidak terpengaruh. Hanya relevan bila fold dilaporkan satu per satu.
- Keyakinan: analisis kode, menunggu `cargo test`. Usulan opsional: geser fold awal per kelas (offset berputar).

## A-3 (informasi): peringatan fold kosong tidak terpicu untuk k > ukuran kelas terbesar

- Lokasi: `partition.rs:201-206` hanya membandingkan dengan kelas TERKECIL; blokir keras hanya untuk `folds > n_instance` (`:194-199`).
- Contoh terkarakterisasi: 6 instance dengan k = 6 menghasilkan fold [2, 2, 2, 0, 0, 0] (tiga fold uji kosong) dengan peringatan, bukan galat. Untuk k = n tiap fold seharusnya satu instance; round-robin per kelas tidak menjamin itu.
- Dampak: fold uji kosong menyumbang nol prediksi; model tetap dilatih ulang untuk fold itu (sia-sia) dan akurasi gabungan tetap terdefinisi. Peringatan sudah muncul (karena k > kelas terkecil), jadi dampak praktis rendah.
- Keyakinan: analisis kode, menunggu `cargo test` (`kfold_k_sama_dengan_jumlah_instance_menghasilkan_fold_kosong_dan_peringatan`: ukuran [2, 2, 2, 0, 0, 0] dan peringatan ada, belum dieksekusi pada jalur yang terdokumentasi).

## A-4 (informasi, tes lama): asersi tautologi pada `s3_formulas.rs`

- Lokasi: `frontend/public/workers/TextAnalytics/statify-text-core/tests/s3_formulas.rs:277`, tes `words_to_keep_tie_break_alfabetis_weka_dan_sklearn`.
- Pengamatan: argumen kedua `assert_eq!` dirangkai dari rantai iterator yang berakhir dengan `.chain(out.vocabulary.clone())` setelah beberapa `take(0)`/`filter(|_| false)`, sehingga ekspektasi selalu sama dengan `out.vocabulary`. Asersi seri tiga arah itu selalu benar dan tidak menguji apa pun.
- Penanganan: tidak diubah (tes lama). Skenario yang sama diuji sungguhan di `thesis_vocab_limit.rs` (`tie_tiga_arah...`), dengan nilai acuan dari `unit/reference_values.py`.
- Keyakinan: analisis kode (bacaan sintaks), tidak memerlukan eksekusi.
