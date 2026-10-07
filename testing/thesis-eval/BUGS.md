# BUGS — temuan paket evaluasi modul Text Analytics

Seluruh temuan dari Track A sampai F. Setiap temuan memuat lokasi (berkas:baris), langkah reproduksi, dampak, usulan perbaikan, dan tingkat keyakinan. Kode produksi TIDAK diubah. Digenerate oleh `tools/merge_docs.py` dari `BUGS_A.md` .. `BUGS_F.md`.

## Indeks temuan

| ID | Tingkat | Judul | Berkas sumber |
|---|---|---|---|
| A-1 | sedang | `KFolds = 1` lolos validasi dan menghasilkan evaluasi tanpa data latih | `BUGS_A.md` |
| A-2 | informasi | ukuran fold total tidak seimbang pada k-fold bertingkat | `BUGS_A.md` |
| A-3 | informasi | peringatan fold kosong tidak terpicu untuk k > ukuran kelas terbesar | `BUGS_A.md` |
| A-4 | informasi, tes lama | asersi tautologi pada `s3_formulas.rs` | `BUGS_A.md` |
| B-1 | rendah | `ValidationMethod` di luar union lolos validasi tanpa pemeriksaan | `BUGS_B.md` |
| B-2 | informasi | `KFolds = 1` diterima | `BUGS_B.md` |
| C1-01 | rendah | Delimiter yang hanya berisi spasi diam-diam diganti pola bawaan inti | `BUGS_C1.md` |
| C1-02 | rendah | Galat awalan kolom tidak tercantum di kotak galat bawah panel | `BUGS_C1.md` |
| C2-01 | sedang | Galat fold tidak berkode dan tidak sampai ke pengguna (BB-24) | `BUGS_C2.md` |
| C2-02 | sedang | Pesan validasi tidak pernah ditampilkan (BB-14) | `BUGS_C2.md` |
| C2-03 | sedang | Validasi numerik tidak menonaktifkan OK; Alpha tidak sah dibuang diam-diam (BB-18, BB-21) | `BUGS_C2.md` |
| C2-04 | rendah | Tiga kalimat berbeda untuk konflik Complement (BB-17) | `BUGS_C2.md` |
| C2-05 | rendah (saran) | Nilai negatif Word-Vector baru terdeteksi setelah analisis (BB-19) | `BUGS_C2.md` |
| C3-01 | rendah | dokumentasi menyebut penyimpanan "otomatis", kode menyimpan hanya saat OK | `BUGS_C3.md` |
| C3-02 | rendah | berkas non-.json dilaporkan sebagai "isi bukan JSON yang sah" | `BUGS_C3.md` |
| C3-03 | informasi | batas ukuran 10 MiB, pesan dan spesifikasi menyebut 10 MB | `BUGS_C3.md` |
| D-01 | sedang | kosakata STWV mandiri berbeda dari resep Naive Bayes/Apply Model bila stemming Indonesia aktif | `BUGS_D.md` |
| D-02 | informasi | probabilitas Apply Model dibulatkan 4 desimal | `BUGS_D.md` |
| D-03 | informasi | K1 dan K3 identik pada dua kelas seimbang; Complement tanpa prior | `BUGS_D.md` |
| D-04 | informasi | perbedaan definisi dengan WEKA yang menimbulkan selisih prediksi, bukan galat | `BUGS_D.md` |
| E-01 | tinggi | STWV dengan stemming Sastrawi membatalkan seluruh proses (wasm panic "unreachable") bila ada token yang karakter keduanya multibita | `BUGS_E.md` |
| E-02 | informasi | hasil STWV berupa matriks padat dikirim lewat `postMessage`, sehingga main thread terblokir seiring jumlah dokumen | `BUGS_E.md` |
| E-03 | informasi | Worker Naive Bayes dan Apply Model dibuat baru pada setiap analisis sehingga tiap analisis menanggung overhead tetap ±75–100 ms | `BUGS_E.md` |
| F-01 | rendah | kolom STWV untuk kata tanpa karakter sah bernama `VEC`, sehingga lolos dari filter `VEC_` pada tab Variables Naive Bayes | `BUGS_F.md` |
| F-02 | informasi | probabilitas Apply Model dibulatkan 4 desimal, sehingga kriteria 1e-9 pada IT-03 tidak dapat diukur langsung | `BUGS_F.md` |

Tingkat mengikuti catatan masing-masing temuan (sedang/tinggi = memengaruhi hasil atau menghentikan proses; rendah/informasi = ketidaksesuaian pesan, dokumentasi, atau karakterisasi perilaku). Tidak ada kode produksi yang diubah; semua usulan perbaikan menunggu persetujuan pemilik kode.


<!-- sumber: BUGS_A.md -->

## BUGS_A - pengamatan Track A (pengujian unit tambahan)

Seluruh 105 tes Jest Track A lulus di Windows (`logs/jest_A_win.json`) dan di VM (`logs/jest_A_vm.json`). Seluruh 66 fungsi tes Rust Track A dikompilasi dan lulus pada `cargo test` di Windows (`logs/rust_thesis_formulas.txt` 15, `rust_thesis_vocab_limit.txt` 13, `rust_thesis_text_pipeline.txt` 20, `rust_thesis_partition.txt` 18; 8 Oktober 2026). Percobaan `rustc` awal pada harness sandbox tidak punya log yang dapat ditelusuri dan tidak dihitung sebagai hasil; yang dipakai hanya log Windows.

Skala keyakinan yang dipakai: **terverifikasi dengan tes yang dijalankan** (Jest dan `cargo test` di Windows), **analisis kode** (dibaca baris demi baris, tidak ada tes yang mengeksekusinya), **dugaan** (inferensi tanpa pembuktian).

### A-1 (sedang): `KFolds = 1` lolos validasi dan menghasilkan evaluasi tanpa data latih

Ringkas: formulir Naive Bayes dan engine Rust sama-sama menerima jumlah fold 1. Satu fold berarti seluruh data menjadi data uji dan data latih kosong, sehingga metrik "cross-validation" yang dilaporkan tidak bermakna dan tidak disertai galat atau peringatan.

#### Lokasi (file:baris)
| Lapisan | Lokasi | Isi relevan |
|---|---|---|
| TS validasi | `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts:254-256` | `if (typeof folds !== "number" \|\| !Number.isInteger(folds) \|\| folds < 1) return "The number of folds must be at least 1."` |
| Rust validasi | `.../naive-bayes/rust/src/stats/partition.rs:174-185` (`validate_fold_count`, cabang `folds < 1` di baris 179) | k = 1 lolos; tidak ada peringatan karena `1 <= ukuran kelas terkecil` (baris 201-206) |
| Rust pembagian | `.../rust/src/stats/partition.rs:219-250` (`stratified_k_fold`) dan `:260-272` (`training_test_split_for_fold`) | satu bucket berisi semua indeks; indeks latih = gabungan bucket lain = kosong |
| Rust evaluasi | `.../rust/src/wasm/function.rs:535-575` (loop fold), `:425-465` (`evaluate_split`, jalur setara-v1 memanggil `train_and_predict`) dan `:378-420` (`train_and_predict`) | `train_naive_bayes_model` dipanggil dengan 0 baris latih |
| Rust prior | `.../rust/src/stats/class_prior.rs:34-52` | `total = 0` menghasilkan prior 0.0 untuk semua kelas (tidak panik; sudah ada tes lama `empty_cases_gives_zero_priors_without_panicking`) |
| Rust prediksi | `.../rust/src/stats/prediction.rs:163-169` (`safe_ln`) dan `:207-290` (`predict_case_inner`, argmax `score > best_score`) | `ln(0)` dinaikkan ke `ln(MIN_POSITIVE)`; skor tiap kelas sama dan berhingga |
| Spesifikasi | `AGENTS.md` bagian 4.2 (minimum 1) menurut `BUGS_B.md` B-2 | perilaku saat ini sesuai spesifikasi tertulis, tetapi spesifikasinya yang perlu ditinjau |

#### Langkah reproduksi
1. Antarmuka: buka Naive Bayes, pilih Validation = K-Fold, isi Number of folds = 1, jalankan analisis pada dataset kelas biner mana pun. Tidak ada pesan galat; hasil muncul.
2. Sisi TS (tanpa antarmuka): `getNumericInputError` dengan `ValidationMethod = "kfold"`, `KFolds = 1` mengembalikan `null`. Tes: `kfold.thesis.test.ts` > "thesis A(e): batas jumlah fold pada getNumericInputError KARAKTERISASI TEMUAN: KFolds = 1 DITERIMA (hanya nilai < 1 yang ditolak)". DIJALANKAN dan lulus.
3. Sisi Rust: `cargo test --test thesis_partition` di `.../naive-bayes/rust` (`k1_lolos_validate_fold_count_tanpa_peringatan`, `k1_menghasilkan_satu_fold_berisi_semua_indeks`, `k1_fold_latih_kosong_dan_fold_uji_adalah_seluruh_data`, `k1_evaluasi_end_to_end_tanpa_panic_tanpa_nan_tetapi_semua_prediksi_kelas_alfabetis_pertama`). Dijalankan di Windows dan lulus (`logs/rust_thesis_partition.txt`, 18 dari 18); ekspektasinya dinyatakan sebagai "PERILAKU SAAT INI" (bukan perilaku yang seharusnya) di komentar tes, sehingga lulusnya tes membuktikan bahwa perilaku itu benar-benar terjadi.

#### Dampak
- Data latih tiap evaluasi k = 1 kosong. Terverifikasi oleh tes Rust yang dijalankan (jalur numerik/kategorik): semua kelas mendapat prior 0, skor sama, argmax memakai `score > best` pada kelas terurut alfabetis sehingga SEMUA prediksi jatuh ke kelas alfabetis pertama. Akurasi yang dilaporkan sama dengan proporsi kelas itu (mis. 3/9 pada fixture tes) dan Kappa 0, tanpa galat. Pengguna bisa menyalin angka itu sebagai hasil validasi silang.
- Jalur teks mentah (Raw text): kosakata data latih kosong sehingga galat `NB_E_TEXT_EMPTY_VOCAB_FOLD` muncul (`raw_text.rs:105`). Galat itu benar menghentikan analisis, tetapi petunjuknya "or use fewer folds" menyesatkan untuk k = 1 (penyebabnya terlalu sedikit fold, bukan terlalu banyak). Pemeta pesan (`naive-bayes-error-messages.ts:57-77`) meneruskan petunjuk yang sama.
- Pesan batas minimum yang ditampilkan ("at least 1") justru menyatakan 1 sah, sehingga pengguna tidak punya petunjuk.
- Koreksi catatan `BUGS_B.md` B-2: pada k = 1 yang kosong adalah data LATIH (seluruh data menjadi data uji), bukan data uji.

#### Usulan
Batas minimum 2 di kedua lapisan, dengan pesan diperbarui:
- TS: `useNaiveBayesValidation.ts:255` ubah `folds < 1` menjadi `folds < 2`; pesan menjadi "The number of folds must be at least 2.".
- Rust: `partition.rs:179` ubah `folds < 1` menjadi `folds < 2`; pesan menjadi "Number of folds must be at least 2 (got {}).".
- Sesuaikan tes yang mengkarakterisasi perilaku lama: `kfold.thesis.test.ts` (KFolds = 1 menjadi ditolak), `thesis_partition.rs` (k1_* menjadi `Err`), tes lama `folds_less_than_one_is_hard_blocked`, `whitebox.getNumericInputError`, `useNaiveBayesValidation.test.ts`, dan teks AGENTS.md 4.2.
- Tidak mengubah kode produksi dalam paket ini (aturan Track A).

#### Keyakinan
- Sisi TS (k = 1 diterima): **terverifikasi dengan tes yang dijalankan**.
- Sisi Rust (partisi satu fold dengan latih kosong, prediksi seragam, akurasi 3/9, kappa 0 pada fixture 9 baris): **terverifikasi dengan tes yang dijalankan** (`cargo test --test thesis_partition` di Windows, 18 dari 18 lulus). Jalur teks mentah (`NB_E_TEXT_EMPTY_VOCAB_FOLD`) tetap **analisis kode**: `fit_split` memanggil `fit_transform` dengan daftar dokumen kosong, galat `EMPTY_INPUT` pemeta `map_core_error` menjadi kode itu (tidak dieksekusi).

### A-2 (informasi): ukuran fold total tidak seimbang pada k-fold bertingkat

- Lokasi: `partition.rs:236-244` (loop `offset % folds_count`). Tiap kelas dibagi round-robin mulai dari fold 0, sehingga sisa tiap kelas selalu jatuh pada fold-fold awal.
- Contoh terkarakterisasi di `thesis_partition.rs` (`kfold_karakterisasi_ukuran_fold_tidak_seimbang_pada_tiga_kelas_sama_besar`): 3 kelas x 11 data pada k = 5 menghasilkan ukuran fold [9, 6, 6, 6, 6] (dijalankan di Windows, `logs/rust_thesis_partition.txt`); `StratifiedKFold` scikit-learn (shuffle, seed 42) memberi [7, 7, 7, 6, 6] untuk data yang sama (DIJALANKAN: `unit/sklearn_kfold_check.py`, `logs/sklearn_kfold_check.txt`). Selisih per kelas tetap <= 1 (properti yang diminta terpenuhi), hanya selisih total antarfold bisa mencapai jumlah kelas.
- Dampak: kecil; evaluasi gabungan (pooled) tidak terpengaruh. Hanya relevan bila fold dilaporkan satu per satu.
- Keyakinan: terverifikasi dengan tes yang dijalankan (Windows). Usulan opsional: geser fold awal per kelas (offset berputar).

### A-3 (informasi): peringatan fold kosong tidak terpicu untuk k > ukuran kelas terbesar

- Lokasi: `partition.rs:201-206` hanya membandingkan dengan kelas TERKECIL; blokir keras hanya untuk `folds > n_instance` (`:194-199`).
- Contoh terkarakterisasi: 6 instance dengan k = 6 menghasilkan fold [2, 2, 2, 0, 0, 0] (tiga fold uji kosong) dengan peringatan, bukan galat. Untuk k = n tiap fold seharusnya satu instance; round-robin per kelas tidak menjamin itu.
- Dampak: fold uji kosong menyumbang nol prediksi; model tetap dilatih ulang untuk fold itu (sia-sia) dan akurasi gabungan tetap terdefinisi. Peringatan sudah muncul (karena k > kelas terkecil), jadi dampak praktis rendah.
- Keyakinan: terverifikasi dengan tes yang dijalankan (`kfold_k_sama_dengan_jumlah_instance_menghasilkan_fold_kosong_dan_peringatan`: ukuran [2, 2, 2, 0, 0, 0] dan peringatan ada; lulus di Windows).

### A-4 (informasi, tes lama): asersi tautologi pada `s3_formulas.rs`

- Lokasi: `frontend/public/workers/TextAnalytics/statify-text-core/tests/s3_formulas.rs:277`, tes `words_to_keep_tie_break_alfabetis_weka_dan_sklearn`.
- Pengamatan: argumen kedua `assert_eq!` dirangkai dari rantai iterator yang berakhir dengan `.chain(out.vocabulary.clone())` setelah beberapa `take(0)`/`filter(|_| false)`, sehingga ekspektasi selalu sama dengan `out.vocabulary`. Asersi seri tiga arah itu selalu benar dan tidak menguji apa pun.
- Penanganan: tidak diubah (tes lama). Skenario yang sama diuji sungguhan di `thesis_vocab_limit.rs` (`tie_tiga_arah...`), dengan nilai acuan dari `unit/reference_values.py`.
- Keyakinan: analisis kode (bacaan sintaks), tidak memerlukan eksekusi.


<!-- sumber: BUGS_B.md -->

## BUGS_B — pengamatan Track B (white-box)

Tidak ada tes thesis Track B yang gagal (54 dari 54 lulus di VM, `logs/jest_B_vm.json`). Dua pengamatan berikut berasal dari analisis jalur, bukan dari kegagalan tes.

### B-1 (rendah): `ValidationMethod` di luar union lolos validasi tanpa pemeriksaan
- Lokasi: `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts`, `getNumericInputError`, baris 240 dan 253 (`if (... === "holdout")`, `if (... === "kfold")`).
- Reproduksi: `f.validation.ValidationMethod = "none" as unknown as "holdout"` lalu `getNumericInputError(f)`. Tes: `WB-2 jalur 27` (`whitebox.getNumericInputError.test.ts`).
- Dampak: bila `ValidationMethod` bernilai selain `"holdout"`/`"kfold"` (mis. data lama atau rusak di IndexedDB), `TrainingPercentage` dan `KFolds` tidak divalidasi dan fungsi mengembalikan `null` (dianggap sah). Tidak terjangkau lewat tipe TypeScript; hanya relevan untuk data tersimpan yang rusak.
- Usulan: tambahkan cabang `else` yang mengembalikan pesan galat, atau normalisasi `ValidationMethod` di `mergeWithDefaults`.

### B-2 (informasi): `KFolds = 1` diterima
- Lokasi: baris 253–258 yang sama. Sesuai AGENTS.md §4.2 (minimum 1), sehingga bukan penyimpangan dari spesifikasi.
- Catatan: k-fold dengan satu fold secara metodologis degenerate (tidak ada data uji). Tes lama (`whitebox.getNumericInputError.test.ts`, "Catatan temuan") sudah mencatatnya; di sini hanya dirujuk. Batas atas fold terhadap ukuran data memang sengaja diserahkan ke engine Rust (komentar baris 181–184).


<!-- sumber: BUGS_C1.md -->

## BUGS_C1 — Temuan Track C1 (black-box String to Word Vector, BB-01 s.d. BB-13)

Format: lokasi, langkah reproduksi, dampak, usulan perbaikan. Kode produksi tidak diubah. Tingkat keparahan: Low, kecuali dinyatakan lain. Bukti perilaku saat ini ada pada tes yang dinamai "temuan C1-xx" (tes itu mengunci perilaku sekarang, sehingga akan gagal bila perilakunya diperbaiki; ubah tesnya bersamaan dengan perbaikan).

### C1-01 — Delimiter yang hanya berisi spasi diam-diam diganti pola bawaan inti

- **Lokasi**: `frontend/public/workers/TextAnalytics/statify-text-core/src/tokenizer.rs:25-26` (`compile_regex`: `delimiter_pattern.trim().is_empty()` → `r"[\s\p{P}]+"`); validasi antarmuka hanya memeriksa `delimiters.length === 0` di `frontend/components/Modals/Transform/StringToWordVector/config.ts:120`.
- **Reproduksi**: pada Options isi Delimiters dengan satu spasi (` `), jalankan pada teks yang memuat tanda hubung, mis. "a-b c". Panjang string 1 sehingga lolos validasi antarmuka, tetapi inti menganggapnya kosong.
- **Hasil**: token menjadi `a`, `b`, `c` (dipecah juga pada tanda baca) padahal pengguna meminta pemisah spasi saja, yang seharusnya menghasilkan `a-b`, `c`. Pemakai tidak diberi tahu bahwa pola diganti.
- **Dampak**: kosakata berbeda dari yang diminta; hanya muncul bila pengguna memasukkan delimiter yang seluruhnya spasi (nilai bawaan tidak terpengaruh). Tidak mengubah hasil BB-01..BB-13 pada pengaturan normal.
- **Bukti**: tes Rust `bb06_temuan_c1_01_delimiter_hanya_spasi_jatuh_ke_pola_bawaan_inti` (dijalankan dan lulus di Windows, `logs/rust_thesis_blackbox_stwv.txt`). Langkah manual: M-06 langkah 5.
- **Usulan**: validasi antarmuka memakai `config.delimiters.trim().length === 0` agar pola yang seluruhnya spasi ditolak dengan "Delimiters cannot be empty.", atau inti menolak pola kosong-setelah-trim dengan galat yang jelas (bukan fallback diam-diam) bila `delimiters` tidak kosong.

### C1-02 — Galat awalan kolom tidak tercantum di kotak galat bawah panel

- **Lokasi**: `frontend/components/Modals/Transform/StringToWordVector/StringToWordVectorModal.tsx:43` (`hasValidationErrors` menyertakan `prefixError`) dan `:105-114` (kotak hanya memetakan `validationErrors`, bukan `prefixError`).
- **Reproduksi**: pilih variabel teks, buka tab Options, isi Vector Column Name `1VEC_`, lalu pindah ke tab Variables.
- **Hasil**: kotak merah di bawah panel menampilkan judul "Some options are invalid:" tanpa satu pun rincian; pesan "Vector column name must start with a letter, @, # or $." hanya ada di tab Options. Tombol OK nonaktif tanpa penjelasan di tab Variables. Jika diklik saat nonaktif, tidak terjadi apa-apa (tombol disabled).
- **Dampak**: kebingungan pengguna (OK nonaktif tanpa alasan yang terlihat); fungsi tetap benar.
- **Bukti**: tes Jest "temuan C1-02: bila hanya awalan yang tidak sah, kotak galat di bawah memuat judul tanpa rincian ..." (lulus di VM; lihat `logs/jest_C1_vm.json`). Langkah manual: M-03 langkah 2.
- **Usulan**: sertakan `prefixError` pada daftar yang ditampilkan, mis. `[...validationErrors, ...(prefixError ? [prefixError] : [])].map(...)`.

### Observasi (bukan bug; dicatat agar penulisan Bab V akurat)

- **O-1 (BB-03)**: kolom Vector Column Name memakai `maxLength={32}` sehingga skenario "lebih dari 32 karakter" tidak dapat dicapai lewat antarmuka; yang terjadi adalah pemotongan tanpa pesan. Pesan panjang maksimum hanya tercapai bila nilai melewati batas secara terprogram.
- **O-2 (BB-05)**: ukuran n-gram di luar 1..5 dipotong (clamp) di kolom isian; pesan "N-gram min and max sizes must be whole numbers between 1 and 5." tidak pernah terlihat lewat antarmuka biasa, tetapi tetap berfungsi sebagai jaring pengaman, dan inti Rust menolak ukuran > 5 dengan `INVALID_CONFIG`.
- **O-3 (BB-06)**: regex delimiter tidak divalidasi di antarmuka; galat `INVALID_REGEX` baru muncul setelah OK, dan pesan memuat rincian multibaris dari crate `regex`.
- **O-4 (hanya pembacaan kode, belum diuji)**: mengosongkan kolom Words to Keep menghasilkan 0 (`parseNumberInput("")`), yang berarti "simpan semua kata" tanpa peringatan (`OptionsTab.tsx:55-58, 372`).
- **O-5 (infrastruktur uji)**: `hooks/useStringToWordVector.ts:66` memakai `import.meta.url`, yang tidak dapat di-parse oleh ts-jest (keluaran CommonJS) sehingga modal tidak bisa diimpor langsung pada konfigurasi `jest.thesis.config.js`. Tes C1 mengatasinya dengan pemuat `__tests__/thesis/helpers/loadStwvHook.ts` tanpa mengubah kode produksi. Pemuat yang sama dipakai pula pada konfigurasi produksi `frontend/jest.config.js` (SWC lewat next/jest) sehingga hasilnya tidak bergantung pada cara `import.meta` ditangani; eksekusi di konfigurasi produksi itu belum dilakukan di sandbox (dijalankan oleh `run_C1.ps1` di Windows).


<!-- sumber: BUGS_C2.md -->

## BUGS_C2 — Temuan Track C2 (black-box menu Naive Bayes, BB-14 s.d. BB-28)

Seluruh temuan di bawah **belum diperbaiki**: sesuai aturan paket evaluasi, kode produksi tidak diubah. Bukti otomatis berupa tes karakterisasi yang lulus pada log `logs/jest_C2_vm.json` (tes itu mengunci perilaku yang ada sekarang, bukan perilaku yang diharapkan). Nomor baris merujuk kondisi berkas saat evaluasi.

Folder dasar: `frontend/components/Modals/Analyze/Classify/naive-bayes/` (selanjutnya `nb/`).

| ID | Skenario | Ringkasan | Keparahan |
|---|---|---|---|
| C2-01 | BB-24 | Galat/peringatan fold tidak berkode dan, pada run tanpa fitur Text, tidak sampai ke pengguna | Sedang |
| C2-02 | BB-14 | Pesan validasi (`validation.errors`) tidak pernah ditampilkan; tombol OK nonaktif tanpa penjelasan | Sedang |
| C2-03 | BB-18, BB-21 | Validasi numerik tidak menonaktifkan OK; Alpha tidak sah dibuang diam-diam sehingga analisis memakai nilai lama | Sedang |
| C2-04 | BB-17 | Tiga kalimat berbeda untuk konflik Complement; yang terlihat pengguna tidak berkode | Rendah |
| C2-05 | BB-19 | Nilai negatif Word-Vector baru terdeteksi setelah analisis dijalankan | Rendah (saran) |

---

### C2-01 — Galat fold tidak berkode dan tidak sampai ke pengguna (BB-24)

**Perilaku yang diamati (dikunci oleh tes).**

1. `folds` lebih besar dari anggota kelas terkecil bukan galat: hanya `Some(warning)` dari `validate_fold_count` yang dicatat ke `ErrorCollector` dengan konteks `validation.kfold` lalu analisis berlanjut.
2. `folds` lebih besar dari jumlah instance valid adalah `Err(String)` tanpa kode `NB_E_*`: `Number of folds (40) cannot be greater than the number of valid instances (30). Choose a smaller number of folds.`
3. Pada run **tanpa** fitur Text, galat (2) tidak sampai ke pengguna: konstruktor tetap `Ok` dengan `result = None`, `get_formatted_results()` melempar `"No analysis results available"`, worker mengirim pesan itu, dan `getUserFriendlyNaiveBayesError` tidak mengenalinya sehingga yang tampil adalah `The Naive Bayes analysis could not be completed. Check the selected variables and settings, then try again.`
4. Peringatan (1) juga tidak tampil: worker mengirim `errors` hanya pada pesan sukses dan `services/naive-bayes-analysis.ts` membuang `e.data.errors`.
5. Run ber-Text membawa ringkasan galat konstruktor sehingga pesan fold sampai, tetapi dipetakan ke kalimat generik `Check the cross-validation settings. …` tanpa kode dan tanpa angka.

**Lokasi.**

- `nb/rust/src/stats/partition.rs:174-217` (`validate_fold_count`, pesan tanpa kode).
- `nb/rust/src/wasm/function.rs:535-575` (peringatan dicatat di baris 538; galat dicatat dan `return None` di baris 573) dan `:762` (pesan generik).
- `nb/rust/src/wasm/constructor.rs:211-218` (ringkasan galat hanya untuk `TextPayload` bukan `None`).
- `frontend/public/workers/Classify/NaiveBayes/naive-bayes.worker.js:40-47` (`errors` hanya pada `success: true`).
- `nb/services/naive-bayes-analysis.ts:271-277` (`e.data.errors` tidak dipakai).
- `nb/services/naive-bayes-error-messages.ts` (satu cabang `fold`, tanpa kode, tanpa nilai).

**Reproduksi.**

1. Impor `dataset_untuk_text/uji_a2.csv` (5 baris; kelas A = 3, B = 2). Target = `kelas`; Validation → Cross-Validation Folds.
2. Number of Folds = `6`, klik OK: toast generik `The Naive Bayes analysis could not be completed. …` (tanpa kata fold, tanpa kode).
3. Number of Folds = `3` (> kelas terkecil 2): analisis selesai tanpa peringatan apa pun, padahal Rust menyatakan `Number of folds (3) exceeds the smallest class size (2). … The analysis will still run.`

Otomatis: Jest `blackbox.nb.validation.test.ts` (BB-24, tiga tes, termasuk karakterisasi pesan generik); Rust `bb24_*` (lulus di Windows, `logs/rust_thesis_blackbox_nb.txt`).

**Dampak.** Pengguna tidak dapat mengetahui bahwa jumlah fold penyebab kegagalan atau bahwa fold per kelas tidak seimbang. Menyimpang dari AGENTS.md §4.2 ("tampilkan peringatan") dan dari harapan prompt (pesan kesalahan berkode).

**Usulan perbaikan.**

- Beri kode pada galat: mis. `NB_E_FOLD_COUNT` (fold < 1 atau > jumlah instance) dan `NB_W_FOLD_SMALL_CLASS` (peringatan), sertakan angka pada pesan.
- Konstruktor: kembalikan `Err(error_summary)` untuk **semua** run saat `result` kosong (hapus syarat Text), atau bawa `errors` pada pesan gagal di worker.
- Worker/service: teruskan `errors` pada pesan sukses dan tampilkan peringatan lewat `toast.warning`.
- `naive-bayes-error-messages.ts`: petakan kode baru ke kalimat ramah dengan angka dan kode di akhir (pola E3).
- Pencegahan di TS: karena jumlah baris dataset diketahui, `getNumericInputError` dapat menolak fold > jumlah baris sebelum worker dipanggil.

---

### C2-02 — Pesan validasi tidak pernah ditampilkan (BB-14)

**Perilaku.** `useNaiveBayesValidation` membangun `validation.errors` (mis. `Select a target variable.`, `Select at least one predictor variable …`, kalimat Complement, galat Text Preprocessing). Daftar itu hanya dibaca di `handleOK`, padahal tombol OK sudah `disabled={!validation.isValid}` sehingga cabang itu tidak dapat dicapai lewat klik. Akibatnya semua pesan itu tidak pernah terlihat. Tes karakterisasi `BB-14 (karakterisasi): teks pesan validasi tidak dirender di layar, hanya OK nonaktif` lulus.

**Lokasi.**

- `nb/hooks/useNaiveBayesValidation.ts:124` (pesan target), `:146` (pesan prediktor), `:158` (Complement), `:169` (`isValid`).
- `nb/dialogs/naive-bayes-main.tsx:412-414` (pembaca `validation.errors`) dan `:521` (`disabled={!validation.isValid}`).

**Reproduksi.** Buka Analyze → Classify → Naive Bayes pada dataset apa pun tanpa memilih Target: OK abu-abu, tidak ada kalimat penjelas di semua tab.

**Dampak.** Pengguna baru tidak tahu apa yang kurang. Menyimpang dari AGENTS.md §2 (daftar galat di bawah panel dengan ikon `AlertCircle`) dan dari harapan BB-14 ("pesan validasi").

**Usulan perbaikan.** Tampilkan `validation.errors[0]` di bawah panel/footer (atau sebagai tooltip pada OK yang nonaktif) memakai pola `AlertCircle` yang dipakai KNN; satukan kalimat dengan yang dipakai `options.tsx` (lihat C2-04).

---

### C2-03 — Validasi numerik tidak menonaktifkan OK; Alpha tidak sah dibuang diam-diam (BB-18, BB-21)

**Perilaku.**

1. `validation.isValid` tidak memuat `getNumericInputError`; validasi numerik hanya dijalankan saat meninggalkan tab dan saat OK diklik (sesuai AGENTS.md §4.4, tetapi OK tetap tampak aktif). Training Percentage = 0 atau 100 hanya muncul sebagai toast (`Training percentage must be a whole number between 1 and 99.`), tidak ada pesan inline dan tidak ada gaya galat pada kolom.
2. Pada Smoothing Alpha dan Text Alpha, nilai tidak sah hanya menghasilkan galat inline dan **tidak** diteruskan ke `formData` (`updateFormData` hanya dipanggil bila sah). Akibatnya `getNumericInputError` tidak pernah melihat nilai itu, jadi tidak ada toast saat pindah tab atau saat OK. Setelah pindah tab, kolom kembali ke nilai sah terakhir (tes `BB-18: Text Alpha 0 dan 1000 …` menunjukkan nilai kembali ke 999). Berdasarkan pembacaan kode (belum diuji otomatis), mengklik OK saat galat inline masih tampak akan menjalankan analisis dengan alpha sah terakhir tanpa peringatan.
3. Input Number of Folds memakai `min={2}` pada elemen HTML, sedangkan `getNumericInputError` menerima fold ≥ 1 (sesuai AGENTS.md §4.2 "minimum 1"). Panah naik/turun peramban berhenti di 2, sehingga nilai 1 hanya bisa diketik.

**Lokasi.**

- `nb/dialogs/options.tsx:99-125` (`validateAlpha`/`handleAlphaChange`) dan `:127-141` (`handleTextAlphaChange`).
- `nb/dialogs/validation.tsx:31-37` (`handleTrainingPercentChange` tanpa validasi), `:151-152` (`min={2}`, `max={25}`).
- `nb/hooks/useNaiveBayesValidation.ts:106-169` (`isValid` tanpa validasi numerik), `:186-275` (`getNumericInputError`).
- `nb/dialogs/naive-bayes-main.tsx:107-130` (`getTabLeaveError`), `:407-415` (`handleOK`).

**Reproduksi.**

1. Konfigurasi teks (DS-1) → Options → Text Alpha ketik `0` (galat inline), lalu klik OK langsung: OK aktif dan (menurut kode) analisis berjalan dengan alpha 1 (nilai bawaan) tanpa pesan.
2. Validation → Training Percentage `0`: tidak ada pesan inline; OK aktif; toast baru muncul saat klik OK atau pindah tab.

**Dampak.** Pengguna dapat mengira analisis memakai alpha yang diketik padahal nilai lama dipakai; pesan galat sebagian inline dan sebagian toast sehingga tidak konsisten.

**Usulan perbaikan.** Simpan nilai mentah (termasuk yang tidak sah) di `formData` agar `getNumericInputError` dan `isValid` melihatnya, atau tambahkan `getNumericInputError(formData) === null` ke `validation.isValid` dan tampilkan pesannya inline; samakan `min` input fold dengan aturan TS (`min={1}`) atau ubah aturan TS.

---

### C2-04 — Tiga kalimat berbeda untuk konflik Complement (BB-17)

**Perilaku.** Konflik Complement + prediktor numerik/kategorik punya tiga redaksi: hook (`Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors.`, tidak pernah terlihat, lihat C2-02), tab Options (`Complement is selected, but the model also contains numeric or categorical variables. Choose Multinomial or Bernoulli.`, satu-satunya yang terlihat, tanpa kode), dan Rust/pesan ramah (`… (NB_E_COMPLEMENT_MIXED)`). Harapan prompt BB-17 ("Pesan NB_E_COMPLEMENT_MIXED") hanya terpenuhi pada lapis Rust.

**Lokasi.** `nb/hooks/useNaiveBayesValidation.ts:157-159`; `nb/dialogs/options.tsx:350-355`; `nb/rust/src/stats/text_features.rs:165-168`; `nb/services/naive-bayes-error-messages.ts`.

**Dampak.** Rendah: perilaku fungsional benar (OK diblokir, jalan keluar jelas); hanya konsistensi pesan dan kode.

**Usulan perbaikan.** Satu konstanta pesan dipakai bersama dan, bila diinginkan, tambahkan `(NB_E_COMPLEMENT_MIXED)` di akhir sesuai pola E3.

---

### C2-05 — Nilai negatif Word-Vector baru terdeteksi setelah analisis (BB-19)

**Perilaku.** Antarmuka tidak memeriksa nilai negatif pada kolom Word-Vector Variables walau datanya sudah ada di klien; galat `NB_E_TEXT_NEGATIVE` baru muncul setelah worker dan WASM dimuat dan dijalankan. Pesan akhirnya benar dan menyebut kolom pertama serta jumlah kolom lain.

**Lokasi.** `nb/hooks/useNaiveBayesValidation.ts` (tidak ada pemeriksaan); `nb/rust/src/models/data.rs:197-201,299`; tes `BB-19: UI tidak memblokir kolom negatif sebelum analisis`.

**Dampak.** Rendah (umpan balik terlambat, beberapa detik pada dataset besar).

**Usulan perbaikan (opsional).** Pemeriksaan ringan di TS saat Word-Vector Variables terisi atau saat OK, memakai `text_negative_message` yang sama; Rust tetap menjadi lapis akhir.

---

### Catatan (bukan bug)

- **BB-28**: resep (`text.recipe`) hanya ada pada ekspor jalur Raw Text. Jalur Word-Vector menghasilkan schema 2.0 tanpa resep (`text.recipe = null`, hanya `columns`) karena vektorisasi terjadi di luar Naive Bayes; model tanpa Text dan tanpa Gaussian min-std tetap schema 1.1. Rumusan prompt "schema 2.0 berisi resep" berlaku untuk jalur Raw Text.
- **BB-24**: istilah "pesan kesalahan berkode" pada prompt tidak sesuai kode; tidak ada kode `NB_E_*` untuk fold (lihat C2-01).
- **Batas lingkungan**: tes Rust paket ini ditulis tanpa kompiler dan baru dikompilasi di Windows; `cargo test --test thesis_blackbox_nb` lulus 24 dari 24 (`logs/rust_thesis_blackbox_nb.txt`).


<!-- sumber: BUGS_C3.md -->

## BUGS_C3 — temuan Track C3 (black-box Apply Model dan persistensi Naive Bayes, BB-29 sampai BB-36)

Tidak ada tes thesis Track C3 yang gagal (95 dari 95 lulus di Windows, `logs/jest_C3_win.json`; tes Rust `thesis_blackbox_am` 12 dari 12 lulus, `logs/rust_thesis_blackbox_am.txt`). Tiga temuan berikut berasal dari pembacaan kode sumber dan perilaku yang diamati lewat tes, dan seluruhnya berkeparahan rendah (ketidaksesuaian dokumen atau pesan, bukan perhitungan salah).

### C3-01 (rendah): dokumentasi menyebut penyimpanan "otomatis", kode menyimpan hanya saat OK
- Lokasi: `frontend/components/Modals/Analyze/Classify/naive-bayes/DOKUMENTASI.md`, baris 44 ("Pengaturan terakhir disimpan otomatis (IndexedDB, key `"NaiveBayes"`)"); perilaku sebenarnya di `frontend/components/Modals/Analyze/Classify/naive-bayes/dialogs/naive-bayes-main.tsx`, `handleOK` (penyimpanan di baris 426, `saveFormData("NaiveBayes", payload)`), dan tidak ada penyimpanan pada perubahan nilai maupun pada Cancel.
- Reproduksi: ubah beberapa pengaturan (mis. Smoothing Alpha 0,5), klik Cancel, buka menu lagi: pengaturan kembali ke nilai sebelumnya atau default. Tes: `BB-36-d` (`blackbox.nb.persistence.test.tsx`).
- Dampak: pengguna yang membaca dokumentasi mengira perubahan yang dibatalkan tetap tersimpan; skenario BB-36 pada prompt ("tutup dan buka kembali menu NB, pengaturan terakhir pulih") hanya benar bila penutupan dilakukan lewat OK.
- Usulan: ubah kalimat dokumentasi menjadi "disimpan saat OK ditekan", atau, bila perilaku otomatis memang diinginkan, simpan juga saat Cancel/penutupan.

### C3-02 (rendah): berkas non-.json dilaporkan sebagai "isi bukan JSON yang sah"
- Lokasi: `frontend/components/Modals/Analyze/Classify/apply-model/services/model-loader.ts`, baris 166–167 (`if (!file.name.toLowerCase().endsWith(".json")) return fail("AM_E_PARSE", file.name)`); pesan di `constants/apply-model-codes.ts`, baris 71.
- Reproduksi: pilih `c3_bukan_model.txt` pada Apply Model, sumber Upload file. Tes: `BB-29a` (`blackbox.am.loader.test.ts`) dan `BB-29-UI-b` (`blackbox.am.model-tab.test.tsx`).
- Dampak: pesan "The model content could not be read as valid JSON. (AM_E_PARSE)" menyesatkan untuk berkas yang sebenarnya hanya salah ekstensi (isinya mungkin JSON model yang sah). Kontrol pilih berkas sudah memfilter `.json`, sehingga hanya terlihat bila pengguna memilih "All files".
- Usulan: kode atau pesan terpisah, mis. "The model file must have a .json extension."

### C3-03 (informasi): batas ukuran 10 MiB, pesan dan spesifikasi menyebut 10 MB
- Lokasi: `model-loader.ts`, baris 44 (`MAX_MODEL_FILE_BYTES = 10 * 1024 * 1024`); pesan `AM_E_FILE_TOO_LARGE` ("... larger than the 10 MB limit."); spesifikasi `apply-model/AGENTS.md` baris 384 ("≤ 10 MB").
- Dampak: berkas 10.000.001 sampai 10.485.760 byte diterima walaupun lebih dari 10 MB desimal. Tidak berpengaruh praktis; dicatat agar batas yang diuji (tes `BB-29j`, `BB-29k`) tidak disalahbaca.
- Usulan: tulis "10 MiB" pada pesan dan spesifikasi, atau samakan konstanta dengan 10.000.000.

### Pengamatan non-bug (penyimpangan tabel prompt yang sudah dicatat di `C_blackbox_C3.md`)
- Pesan antarmuka berbahasa Inggris dengan kode di akhir kalimat (bukan bahasa Indonesia).
- Model Word-Vector dengan kolom `VEC_` yang hilang tidak memblokir OK (hanya peringatan `AM_W_TEXT_ALL_ZERO_FILLED` dan info `AM_I_TEXT_ZERO_FILLED`), berbeda dari fitur kategorikal/numerik dan variabel teks Raw yang memblokir.
- Bentrok nama kolom hasil dengan variabel dataset adalah penyesuaian otomatis (`AM_W_NAME_ADJUSTED`), bukan galat; hanya nama kustom kembar yang menjadi galat (`AM_E_NAME_DUPLICATE`).


<!-- sumber: BUGS_D.md -->

## BUGS_D — temuan Track D (perbandingan akurasi numerik Statify, scikit-learn, WEKA)

Tidak ada selisih numerik antara Statify dan scikit-learn: kelas prediksi sama pada 17.221 dari 17.221 prediksi (24 konfigurasi pada tiga dataset), parameter model dan matriks bobot STWV cocok sampai sekitar 1e-15 (`D_accuracy.md`). Satu ketidakkonsistenan antarmodul (D-01) ditemukan, ditambah tiga catatan informasi yang menjelaskan selisih terhadap WEKA dan keterbatasan keluaran. Tidak ada kode produksi yang diubah.

### D-01 (sedang): kosakata STWV mandiri berbeda dari resep Naive Bayes/Apply Model bila stemming Indonesia aktif
- Lokasi (dugaan penyebab, belum diverifikasi karena kode Rust tidak dapat dibangun di sandbox): versi pustaka stemmer pada `Cargo.lock` berbeda antarmodul. `frontend/components/Modals/Transform/StringToWordVector/rust/Cargo.lock` baris 194–195: `sastrawi-rs` **0.5.1**; `frontend/components/Modals/Analyze/Classify/naive-bayes/rust/Cargo.lock` baris 183–184, `.../apply-model/rust/Cargo.lock` baris 183–184, dan `frontend/public/workers/TextAnalytics/statify-text-core/Cargo.lock` baris 130–131: **0.5.3**.
- Reproduksi: `node testing/thesis-eval/accuracy/run_statify.mjs --dataset pilkada --configs K6` (konfigurasi: bawaan Weka + stopword Indonesia + stemming Indonesia, W = 1.000). Log memuat `STWV(train) vocab=1000 identik dengan resep NB: false`; sebaliknya `true` untuk K1 sampai K5, varian `w` dan `m`. Berkas pembanding: `accuracy/out/stwv_train_statify_K6.json` (kosakata STWV) dan `accuracy/out/model_statify_K6.json` (`text.terms`, kosakata Naive Bayes).
- Hasil terukur pada `pilkada_train.csv`: kedua kosakata berukuran 1.000 tetapi berbeda 8 kata. Hanya di STWV: `#mencaripemimpin, #menolaklupa, anggap, apa, ilu, tua, ubah, uji`. Hanya di Naive Bayes: `malu, milu, nanti, nilai, rubah, sadar, sapa, tunjuk`. Contoh: kata `sapa` ada pada data latih satu kali, hasilnya `sapa` pada Naive Bayes tetapi `apa` pada STWV; `apa` termasuk dalam daftar stopword resep, jadi kemunculannya di kosakata STWV tampaknya hasil stemming yang terjadi setelah penyaringan stopword (belum diverifikasi di kode).
- Dampak: pengguna yang membentuk kolom vektor lewat menu STWV (konfigurasi K6) lalu memakai kolom itu pada Naive Bayes mode Word-Vector atau Apply Model mendapat kosakata yang berbeda dari jalur Raw Text pada data dan konfigurasi yang sama. Pengaruh pada akurasi tidak diukur. Jalur Raw Text (Naive Bayes ke Apply Model) konsisten satu sama lain karena keduanya memakai versi 0.5.3. Pada konfigurasi tanpa stemming tidak ada selisih.
- Usulan: samakan versi `sastrawi-rs` pada keempat `Cargo.lock` (atau gunakan satu crate bersama), bangun ulang wasm STWV, lalu ulangi perintah di atas; harapannya `identik dengan resep NB: true` untuk K6. Bila selisih tetap ada, bandingkan urutan penyaringan stopword dan stemming pada `pipeline.rs` STWV dan resep Naive Bayes.

### D-02 (informasi): probabilitas Apply Model dibulatkan 4 desimal
- Lokasi: `frontend/components/Modals/Analyze/Classify/apply-model/rust/src/stats/posterior.rs` baris 65–67 (`round4`), dipakai di `stats/summary.rs` baris 115 dan 118; sesuai spesifikasi (komentar menyebut AGENTS.md §5.5).
- Dampak: probabilitas dan probabilitas maksimum keluaran hanya akurat sampai 5,0e-5; galat absolut terhadap scikit-learn pada tabel `D_accuracy.md` mencapai 5,000e-05 sebagai akibatnya, bukan karena rumus. Dokumen yang probabilitasnya berbeda di bawah 1e-4 tampak seri. Metrik berbasis peringkat probabilitas (mis. AUC, log-loss) tidak dapat dihitung teliti dari keluaran ini.
- Usulan: tidak perlu diubah bila pembulatan memang dikehendaki; catat batas ini di bab hasil dan, bila presisi penuh diperlukan, sediakan opsi tanpa pembulatan. Tes `thesis_compare.rs` (lulus di Windows, `logs/rust_thesis_compare.txt`) membaca probabilitas presisi penuh dari sumber Rust.

### D-03 (informasi): K1 dan K3 identik pada dua kelas seimbang; Complement tanpa prior
- Lokasi: `frontend/public/workers/TextAnalytics/statify-text-core/src/nb_text.rs` (bobot dan skor Complement `Σ x·L`, tanpa prior untuk K ≥ 2; baris 127–152 menurut catatan agen WEKA) dan `apply-model/rust/src/stats/posterior.rs` baris 16 (`normalize_log_scores`, normalisasi log-sum-exp seluruh skor).
- Pengamatan: pada pilkada (315/315) `pred_statify_K1.csv` dan `pred_statify_K3.csv` identik byte demi byte, begitu juga K1w dan K3w. Ini konsekuensi matematis (dengan dua kelas, selisih skor Complement sama dengan selisih log-likelihood Multinomial dan prior sama), bukan bug. Pada SMS Spam (kelas tak seimbang) keduanya berbeda.
- Dampak: tabel K1 dan K3 pada pilkada tidak memberi informasi pembeda; pembeda baru terlihat pada data tak seimbang atau lebih dari dua kelas. Probabilitas Complement adalah softmax skor (sama dengan `ComplementNB.predict_proba` scikit-learn), bukan peluang terkalibrasi; WEKA hanya mengeluarkan vektor satu-nol sehingga probabilitasnya tidak dapat dibandingkan.
- Usulan: sebutkan hal ini di naskah agar K3 tidak dibaca sebagai bukti independen pada data dua kelas seimbang.

### D-04 (informasi): perbedaan definisi dengan WEKA yang menimbulkan selisih prediksi, bukan galat
- **Words to Keep**: Statify memotong tepat W kata (urut total kemunculan menurun, seri menurut alfabet byte). WEKA mempertahankan semua kata yang hitungannya sama dengan ambang (`DictionaryBuilder.java`, ambang `>=`), sehingga pada pilkada `-W 1000` menghasilkan 1.042 kata. Akibat pada bawaan W = 1.000: kelas prediksi berbeda pada 3 sampai 6 dari 270 dokumen (pilkada), 1 sampai 4 dari 1.673 (SMS Spam), 1 dari 500 (SmSA). Dengan W yang disamakan (varian `m`) atau seluruh kosakata (`w`) selisihnya nol dan probabilitas sama (pilkada). `max_features` scikit-learn memakai aturan seri lain lagi (berbeda 26 kata pada W = 1.000), karena itu `sk_compare.py` memilih kosakata dengan aturan Statify.
- **Prior kelas**: Statify `count/N`; WEKA `(n_c + 1)/(N + K)`. Sama hanya pada kelas seimbang.
- **Keluaran Complement WEKA**: satu-nol (tidak menimpa `distributionForInstance`).
- Usulan: tidak ada perubahan kode; jelaskan perbedaan ini di naskah ketika membandingkan Statify dengan WEKA pada pengaturan bawaan.

### Pengamatan non-bug
- Berkas model hasil Export Model berisi `trained_at`; model dari dua eksekusi (Node 22.22 cloud dan Node 22.23 VM) sama persis selain bidang itu (diperiksa untuk K1 dan K6). Prediksi seluruh konfigurasi identik byte antar-mesin.
- Satu dokumen uji pilkada (Id 212) tidak berisi kata kosakata; posteriornya 0,5/0,5 pada model Multinomial/Complement dan kedua perangkat memilih kelas pertama (`negative`) sehingga salah klasifikasi; tidak ada perbedaan antarperangkat.


<!-- sumber: BUGS_E.md -->

## BUGS_E — temuan Track E (pengujian waktu eksekusi)

Satu cacat fungsional (E-01) ditemukan saat mengukur skenario "STWV + stopword Indonesia + stemming Sastrawi", ditambah dua catatan informasi tentang perilaku waktu eksekusi (E-02, E-03). Tidak ada kode produksi yang diubah. Semua angka di bawah berasal dari eksekusi nyata di sandbox cloud (lihat `E_performance.md` untuk spesifikasi sandbox dan `logs/perf_*` untuk lognya); angka waktu itu BUKAN waktu perangkat skripsi.

### E-01 (tinggi): STWV dengan stemming Sastrawi membatalkan seluruh proses (wasm panic "unreachable") bila ada token yang karakter keduanya multibita
- Lokasi: pustaka pihak ketiga `sastrawi-rs 0.5.1`, `src/affixation.rs:24:46` (pesan panik tercetak di konsol: `byte index 2 is not a char boundary; it is inside '‘' (bytes 1..4) of `i‘m``). Versi itu dipakai wasm STWV: `frontend/components/Modals/Transform/StringToWordVector/rust/Cargo.toml` baris 22 (`sastrawi-rs = "0.5.1"`) dan `.../rust/Cargo.lock` baris 194–195 (lihat juga D-01 di `BUGS_D.md`). Wasm Naive Bayes dan Apply Model memakai 0.5.3 (`naive-bayes/rust/Cargo.lock` baris 183–184) dan TIDAK panik pada masukan yang sama.
- Reproduksi (headless, wasm yang sama dengan aplikasi):
  1. `node testing/thesis-eval/perf/prepare_datasets.mjs` lalu `node testing/thesis-eval/perf/run_headless.mjs --datasets sms_5574 --scenarios stwv_sw_stem` → sel berstatus `GALAT: unreachable` pada pemanasan (log: `logs/perf_headless_sandbox.txt`, baris `[sms_5574 | stwv_sw_stem]`).
  2. Minimal: `process_text_data(["I‘m going"], {...toRustConfig(KONFIGURASI.K6.stwv)})` → `RuntimeError: unreachable`; `["café résumé"]` → panik (kata `résumé`: huruf pertama ASCII, huruf kedua `é` berukuran 2 bita); `["makan nasi"]`, `["3x£150pw"]`, `["makanan‘nya"]` berhasil. Dengan stopword saja (tanpa stemming) atau tanpa keduanya semua masukan berhasil, jadi pemicunya stemmer.
  3. Di peramban: Worker mengirim `{status:"error", payload}`; `normalizeWorkerError` menampilkan pesan mentah `unreachable` (kode `WASM_ERROR`) kepada pengguna — pesan tidak informatif.
- Cakupan terukur (per dokumen tunggal, `words_to_keep = 0`, konfigurasi K6): SMS Spam 5.574 dokumen → **34 dokumen** memicu panik (483 dokumen memuat karakter non-ASCII; contoh `I‘m going to try for 2 months ha ha only joking`, tanda petik tipografis U+2018); Gabungan 17.974 → 34 dokumen; Pilkada 900 (14 dokumen non-ASCII) dan SmSA 11.000 (0 non-ASCII) → 0. Satu dokumen saja cukup membatalkan seluruh korpus (fungsi memproses semua dokumen dalam satu panggilan).
- Dampak: pada korpus berisi teks Inggris atau aksara bertanda (SMS Spam UCI, 20 Newsgroups, tweet dengan petik tipografis), pengguna tidak dapat memakai opsi "Indonesian (Sastrawi)" sama sekali dan mendapat galat tanpa petunjuk. Instans wasm sesudah panik tetap dapat dipakai lagi (diuji headless di Node: panggilan berikutnya dengan masukan sah berhasil; belum diuji di Worker peramban), jadi tidak ada keadaan rusak yang menetap. Pengukuran waktu skenario ini pada SMS Spam dan Gabungan karena itu dicatat GAGAL; sebagai gantinya disediakan varian ASCII (non-ASCII dilipat/dibuang) hanya untuk keperluan waktu.
- Usulan: (1) samakan versi `sastrawi-rs` STWV ke ≥ 0.5.3 dan bangun ulang wasm STWV (sekaligus menutup D-01), lalu jalankan ulang langkah 1; (2) bila 0.5.3 pun rawan pada masukan lain, bungkus pemanggilan stemmer per token dengan `std::panic::catch_unwind` atau lewati stemming bila `!word.is_char_boundary(2)`; (3) tangkap panik di Worker dan tampilkan pesan yang berarti (mis. "Stemming gagal pada kata '…'").

### E-02 (informasi): hasil STWV berupa matriks padat dikirim lewat `postMessage`, sehingga main thread terblokir seiring jumlah dokumen
- Lokasi: `frontend/components/Modals/Transform/StringToWordVector/stringToWord.processor.ts` (`self.postMessage({ status: 'success', payload: result })`, `result.matrix` = n × V angka) dan `hooks/useStringToWordVector.ts#runWorker`.
- Pengukuran sandbox (harness peramban, `logs/perf_browser_sandbox.txt`): Long Task terpanjang pada main thread 110 ms (SMS Spam 5.574), 197 ms (SmSA 11.000), 285 ms (Gabungan 17.974) — melewati ambang 200 ms pada ±18 ribu dokumen; jeda frame terpanjang mengikuti (100/183/267 ms). Naive Bayes dan Apply Model tidak menghasilkan Long Task sama sekali (hasilnya ringkas). Biaya `structuredClone` hasil STWV di Node: 45,6 / 185,3 / 385,9 ms untuk Pilkada / SMS Spam / SmSA (`logs/perf_clone_cost_sandbox.txt`).
- Dampak: untuk korpus ≥ ±18 ribu dokumen antarmuka membeku ratusan ms saat hasil STWV diterima, belum termasuk penambahan ~1.000 kolom ke DataStore (tidak diukur di harness). Angka ini dari CPU sandbox; pada perangkat skripsi harus diukur ulang (`run_E.ps1`).
- Usulan (opsional): kirim matriks sebagai `Float64Array` yang ditransfer (transferable) atau bentuk sparse, dan tulis kolom ke DataStore bertahap.

### E-03 (informasi): Worker Naive Bayes dan Apply Model dibuat baru pada setiap analisis sehingga tiap analisis menanggung overhead tetap ±75–100 ms
- Lokasi: `naive-bayes/services/naive-bayes-analysis.ts` baris 257 (`new Worker(...)` per analisis, `worker.terminate()` setelah hasil) dan `apply-model/services/apply-model-analysis.ts` baris 104; STWV memakai ulang Worker (`workerRef`).
- Pengukuran sandbox (40 dokumen, sehingga komputasi ≈ 0): NB holdout rata-rata 98,3 ms, NB 10-fold 139,2 ms, Apply Model 75,5 ms, STWV 3,1 ms (Worker dipakai ulang). Berasal dari boot Worker, revalidasi berkas (304) dan kompilasi wasm 1,6–1,8 MB. Akibatnya sel kecil (Pilkada 900) NB dan Apply Model di peramban 3–5 kali lebih lama daripada headless (213,7 vs 46,3 ms; 322,0 vs 103,5 ms; 121,3 vs 32,2 ms), sedangkan sel besar didominasi komputasi.
- Dampak: kecil secara absolut; relevan hanya untuk interpretasi tabel (selisih peramban − headless pada dataset kecil bukan komputasi). Usulan (opsional): simpan `WebAssembly.Module` terkompilasi atau pakai ulang Worker.


<!-- sumber: BUGS_F.md -->

## BUGS_F — temuan Track F (pengujian integrasi antarmenu IT-01..IT-05)

Alur STWV, Naive Bayes, Export Model, Apply Model, dan penyimpanan model ke berkas berjalan konsisten pada seluruh pemeriksaan otomatis (`F_integration.md`). Ditemukan satu cacat kecil pada pertemuan antara STWV dan Naive Bayes (F-01) serta satu catatan informasi (F-02) yang menjelaskan mengapa kriteria 1e-9 pada IT-03 tidak dapat diukur langsung pada keluaran. Tidak ada kode produksi yang diubah.

### F-01 (rendah): kolom STWV untuk kata tanpa karakter sah bernama `VEC`, sehingga lolos dari filter `VEC_` pada tab Variables Naive Bayes
- Lokasi: `frontend/stores/useVariableStore.ts` baris 36–42 (`processVariableName`: karakter tidak sah diganti `_`, lalu baris 42 `processedName.replace(/[._]+$/g, '')` membuang garis bawah di ujung nama) dan `frontend/components/Modals/Analyze/Classify/naive-bayes/components/dataset-variable-list.tsx` baris 46–54 (`filterVariablesByText`: pencocokan substring `includes`). Nama kolom dibentuk oleh `buildColumnData` (STWV, `utils/buildColumnData.ts`) dengan awalan `VEC_` yang diteruskan ke `processVariableName`.
- Reproduksi (otomatis): `node testing/thesis-eval/integration/it01_stwv_to_nb.mjs` (baris INFO "kolom bernama tanpa 'VEC_'") dan tes Jest `integration.it01.leakage-ui.test.tsx` (IT-01-h dan IT-01-i). Data: `pilkada_train.csv`, kolom `Text Tweet`, konfigurasi STWV bawaan (Words to Keep 1.000). Kosakata memuat token `&`; nama kolomnya menjadi `VEC` (bukan `VEC_…`). Pada W = 1.000 terdapat 1.000 kolom STWV dan hanya 999 yang mengandung `VEC_`.
- Dampak: pengguna yang memilih kolom vektor dengan mengetik `VEC_` pada kotak filter, memilih Select All (filtered), lalu menekan panah ke Word-Vector Variables hanya memindahkan 999 kolom; kolom `VEC` tertinggal di daftar Available dan tetap menjadi prediktor biasa (numerik) pada model. Model yang terbentuk memuat 999 term teks, bukan 1.000, ditambah satu prediktor numerik. Tidak ada galat atau peringatan. Pada tes IT-01 jumlah term model sama dengan jumlah kolom yang DIPINDAHKAN (999 pada skenario filter; 1.000 bila seluruh kolom dipindahkan), sehingga kriteria IT-01 terpenuhi; cacat ini hanya memengaruhi cara pengguna memilih kolom. Pengaruh pada akurasi tidak diukur.
- Usulan: (a) STWV memberi nama cadangan yang tetap berawalan, misalnya `VEC_sym1`, bila hasil `processVariableName` tidak lagi mengandung awalan; atau (b) `processVariableName` tidak memangkas garis bawah ujung bila nama tersebut hanya awalan; atau (c) tambahkan tombol "pilih semua kolom hasil STWV" pada tab Variables. Setelah perbaikan, ulangi perintah di atas; harapannya semua nama kolom berawalan `VEC_`.

### F-02 (informasi): probabilitas Apply Model dibulatkan 4 desimal, sehingga kriteria 1e-9 pada IT-03 tidak dapat diukur langsung
- Lokasi: sama dengan D-02 pada `BUGS_D.md` (`apply-model/rust/src/stats/posterior.rs` baris 65–67, `round4`).
- Pengamatan Track F: pada lima konfigurasi (K1..K5) dan 630 baris, `round4(skor acuan presisi penuh)` sama persis dengan kolom `NB_Probability_*` pada 1.260 dari 1.260 sel per konfigurasi, selisih absolut maksimum antara 4,992e-05 dan 5,000e-05 menurut konfigurasi (batas pembulatan 5e-05), kelas sama 630 dari 630. Parameter model yang diterima Apply Model identik bit demi bit dengan model Naive Bayes (selisih 0). Satu `log_weight` yang sengaja digeser 1e-9 terdeteksi oleh pembanding bit, tetapi keluaran Apply Model tidak berubah (0 dari 2.520 sel), sehingga kriteria 1e-9 hanya dapat diuji pada parameter model dan skor acuan, tidak pada kolom keluaran.
- Dampak: IT-03 diberi status "Lulus dengan catatan". Kriteria asli (selisih keluaran ≤ 1e-9) tidak dipenuhi secara harfiah karena pembulatan 4 desimal pada desain; keputusan kelas dan parameter tidak terdampak.
- Usulan: tidak perlu mengubah kode; jelaskan di naskah, atau sediakan opsi keluaran tanpa pembulatan bila kriteria 1e-9 pada keluaran memang diperlukan.
