# Prompt untuk AI Agent (Claude Sonnet, effort high) — Paket Evaluasi Modul Text Analytics Statify

> Salin seluruh isi di bawah garis ini ke agen. Jalankan agen dengan folder kerja `E:\KULIAH\Skripsi\statify64`.
> Fase 1 wajib selesai dulu. Setelah itu Track A–F bisa dikerjakan paralel (mis. dengan subagen atau beberapa sesi). Fase 9 dikerjakan terakhir.

---

## Peran dan konteks

Anda adalah *test engineer* untuk modul **Text Analytics** pada aplikasi web **Statify** (Next.js 15 + TypeScript, komputasi Rust → WebAssembly via wasm-pack, dijalankan di Web Worker). Modul ini terdiri atas tiga menu dan satu pustaka inti:

| Bagian | Lokasi (relatif terhadap `frontend/`) |
|---|---|
| String to Word Vector (STWV) | `components/Modals/Transform/StringToWordVector/` (Rust: `rust/`, util: `utils/`, tes: `__tests__/`) |
| Naive Bayes (NB) | `components/Modals/Analyze/Classify/naive-bayes/` (Rust: `rust/`, hooks: `hooks/`, services: `services/`) |
| Apply Model (AM) | `components/Modals/Analyze/Classify/apply-model/` (Rust: `rust/` + `rust/tests/`, `adapters/`, `services/`) |
| Pustaka inti | `public/workers/TextAnalytics/statify-text-core/` (tes: `tests/`) |
| Dokumentasi teknis | `DOKUMENTASI.md`, `AGENTS*.md`, `PLAN*.md` di masing-masing folder menu |
| E2E/performa yang sudah ada | `../testing/` (Playwright: `e2e/`, `performance/`) |
| Dataset uji | `../dataset_untuk_text/`, plus `E:\KULIAH\Skripsi\SIDANG\pilkada_train.csv` dan `pilkada_test.csv` |

Hasil kerja Anda akan ditulis ke **buku skripsi** (Bab V). Karena itu **kejujuran data adalah prioritas utama**.

## Aturan keras

1. **Jangan mengubah kode produksi** (selain berkas tes dan skrip evaluasi baru). Jika menemukan bug, catat di `BUGS.md` (lokasi, langkah reproduksi, dampak, usulan perbaikan), jangan diperbaiki tanpa persetujuan.
2. Kerjakan di branch baru `thesis-eval` (buat dari branch aktif; **jangan push**, **jangan force**, jangan menghapus berkas).
3. Semua keluaran ditaruh di `testing/thesis-eval/` (buat foldernya). Tes baru ditaruh di folder `__tests__/thesis/` (TypeScript) atau `tests/thesis_*.rs` (Rust) di dalam modul terkait.
4. **Jangan mengarang angka.** Setiap angka di laporan harus berasal dari keluaran perintah yang benar-benar dijalankan; simpan log mentahnya di `testing/thesis-eval/logs/`. Jika sesuatu tidak bisa dijalankan, tulis `NOT RUN` beserta alasannya.
5. Catat versi semua alat (node, npm, rustc, cargo, wasm-pack, python, scikit-learn, numpy, pandas, java, WEKA) ke `testing/thesis-eval/ENV.md`, serta spesifikasi perangkat dan peramban (nama dan versi) bila dipakai. Perangkat: Lenovo IdeaPad Gaming 3 15ARH05, AMD Ryzen 5 4600H (6 inti/12 thread), RAM 16 GB DDR4 3200 MHz, Windows 11 Home 64-bit; WEKA 3.9.6.
6. Gunakan seed tetap (42) untuk semua proses acak.
7. Semua tabel di laporan memakai **format kolom persis** seperti yang diminta di bawah, karena akan disalin ke buku.

---

## Fase 1 — Persiapan dan baseline (serial, wajib dulu)

1. `git status`, buat branch `thesis-eval`, catat commit hash.
2. Isi `ENV.md` (lihat aturan 5).
3. Jalankan baseline lalu simpan log:
   - `cargo test` di `statify-text-core`, `naive-bayes/rust`, `apply-model/rust`, dan `StringToWordVector/rust`.
   - `npx jest` (dari `frontend/`) untuk ketiga folder menu, dengan `--coverage --coverageReporters=json-summary text` dan `--collectCoverageFrom` yang dibatasi ke folder ketiga menu.
   - Coverage Rust bila memungkinkan (`cargo llvm-cov` atau `cargo tarpaulin`). Kalau alatnya tidak terpasang dan tidak bisa dipasang, tulis NOT RUN.
4. Hasilkan `testing/thesis-eval/01_baseline.md` dengan tabel:

| Lapisan | Lokasi pengujian | Jumlah kasus | Lulus | Gagal | Cakupan baris |

Barisnya: Rust pustaka inti; Rust Naive Bayes; Rust Apply Model; Rust STWV; Jest STWV; Jest Naive Bayes; Jest Apply Model. Lampirkan tanggal eksekusi.

---

## Track A — Pengujian unit tambahan (paralel)

Tujuan: menutup celah uji yang penting untuk klaim di buku.

1. Dari laporan coverage, daftar fungsi atau berkas dengan cakupan < 70% di ketiga menu dan pustaka inti.
2. Tambahkan tes unit untuk perilaku berikut bila belum ada:
   - Setiap rumus TF (binary, raw, log1p, sublinear, normalized), IDF (standard, smooth, plus1), dan normalisasi (L1, L2, doc_length) terhadap nilai acuan manual pada korpus D1 "Saya suka makan nasi", D2 "Saya tidak suka nasi!", D3 "Makan, makan, makan" (toleransi 1e-6).
   - *Words to Keep* dan *Min term frequency* pada kasus nilai seri.
   - Stopword Indonesia dan Inggris, stopword kustom, Sastrawi, Porter, n-gram 1–5.
   - Pembagian stratified: proporsi kelas pada holdout 70/30 dan setiap fold sama (selisih ≤ 1 data).
   - Validasi angka NB: `KFolds = 1`. Sudah diperiksa: `getNumericInputError` menerima fold ≥ 1 dan `validate_fold_count` (naive-bayes/rust/src/stats/partition.rs:179) juga hanya menolak fold < 1. Reproduksi apa yang terjadi bila k = 1 dijalankan (fold latih kosong?) dan catat di BUGS.md beserta usulan batas minimum 2.
   - Pemuatan model AM: berkas > 10 MB, JSON rusak, schema tidak dikenal, kelas kosong, kosakata kosong.
3. Keluaran: `testing/thesis-eval/A_unit.md` berisi daftar tes yang ditambahkan (berkas, nama tes, perilaku yang diuji, status), serta tabel baseline yang diperbarui.

## Track B — White-box testing dengan basis path (paralel)

Kerjakan untuk empat fungsi berikut:

| ID | Fungsi | Berkas |
|---|---|---|
| WB-1 | `validateColumnPrefix` | `StringToWordVector/utils/columnPrefix.ts` (sudah dianalisis: V(G)=7; verifikasi ulang dan jalankan) |
| WB-2 | `getNumericInputError` | `naive-bayes/hooks/useNaiveBayesValidation.ts` |
| WB-3 | Logika validasi di `useNaiveBayesValidation` (blok `useMemo`) | sama |
| WB-4 | `loadModelFromFile` (beserta `finalizeLoad` bila perlu) | `apply-model/services/model-loader.ts` |

Untuk setiap fungsi:

1. Tabel simpul: `| Simpul | Pernyataan |`, dengan pernyataan dikutip singkat dari kode. Kondisi majemuk (`||`, `&&`) dipecah menjadi simpul predikat terpisah.
2. Daftar sisi (edge list), lalu *flow graph* dalam format Graphviz DOT dan PNG (`dot -Tpng`; bila graphviz tidak ada, simpan DOT saja). Simpan di `testing/thesis-eval/whitebox/`.
3. Hitung N, E, P, dan V(G) = E − N + 2. Periksa bahwa hasilnya sama dengan P + 1.
4. Susun basis set jalur independen: `| Jalur | Simpul | Masukan | Keluaran yang diharapkan | Hasil |`.
5. Tulis satu tes Jest per jalur di `__tests__/thesis/whitebox.<fungsi>.test.ts`, lalu jalankan. Kolom Hasil diisi `Lulus` atau `Gagal` dari hasil eksekusi.
6. Rekap: `| Fungsi | Menu | V(G) | Jalur independen | Kasus lulus |`.

Keluaran: `testing/thesis-eval/B_whitebox.md` beserta gambar dan berkas tes.

## Track C — Black-box testing (paralel)

Skenario BB-01 sampai BB-36 tercantum di bawah. Otomatiskan sebanyak mungkin dengan React Testing Library (tingkat komponen atau dialog) atau Playwright (`testing/e2e/`, dijalankan terhadap `npm run dev`). Skenario yang tidak bisa diotomatiskan dijadikan **daftar periksa manual** berisi langkah persis yang bisa dijalankan Yedija, lengkap dengan kolom tangkapan layar.

| ID | Fitur | Skenario | Hasil yang diharapkan |
|---|---|---|---|
| BB-01 | F14 | Membuka Transform → String to Word Vector | Panel tampil dengan tab Variables dan Options; hanya variabel teks/nominal ditampilkan |
| BB-02 | F15, F18 | Default Weka pada korpus acuan | Lima kolom VEC_ dengan nilai sesuai korpus acuan |
| BB-03 | F17 | Vector Column Name diawali angka / > 32 karakter | Pesan validasi, OK nonaktif |
| BB-04 | F07 | n-gram min=1 max=2 | Kosakata memuat unigram dan bigram |
| BB-05 | F07 | n-gram min > max atau max > 5 | Pesan validasi, OK nonaktif |
| BB-06 | F02 | Delimiters regex tidak valid | Pesan INVALID_REGEX |
| BB-07 | F03, F04 | Stopword Indonesian, lalu Custom | Kata pada daftar tidak muncul di kosakata |
| BB-08 | F05, F06 | Stemming Sastrawi dan Porter | Kata berimbuhan menjadi kata dasar |
| BB-09 | F11, F08–F10 | Formula standard scikit-learn | TF/IDF/normalisasi otomatis menjadi hitungan, smooth, L2 |
| BB-10 | F12 | Words to Keep=10, Min term frequency=2 | ≤ 10 term dengan frekuensi ≥ 2 |
| BB-11 | F12 | Stopword + min freq membuang semua kata | Pesan EMPTY_VOCABULARY |
| BB-12 | F18 | Sel kosong | Vektor nol, jumlah baris tetap |
| BB-13 | F19 | Output Viewer setelah transformasi | Processing Summary, Settings, Vocabulary tampil |
| BB-14 | F20 | NB tanpa target | OK nonaktif, pesan validasi |
| BB-15 | F21 | Mengisi Candidate Factors/Covariates | Exclude dikosongkan, hanya kandidat yang menjadi prediktor |
| BB-16 | F22, F23 | Raw Text Variable diisi | Tab Text Preprocessing aktif |
| BB-17 | F24 | Complement + prediktor numerik/kategorik | Pesan NB_E_COMPLEMENT_MIXED |
| BB-18 | F24 | Text alpha 0 atau > maksimum | Pesan validasi angka |
| BB-19 | F22 | Word-Vector bernilai negatif | Pesan NB_E_TEXT_NEGATIVE menyebut kolom |
| BB-20 | F25 | Gaussian (Weka min. std) | Analisis berjalan, Attribute Distribution tampil |
| BB-21 | F26 | Training Percentage 0 atau 100 | Pesan validasi |
| BB-22 | F26, F27 | Holdout 70% seed 42, dijalankan dua kali | Keluaran identik |
| BB-23 | F26, F27 | 10-fold CV | Metrik dari gabungan prediksi semua fold |
| BB-24 | F26 | Fold > anggota kelas terkecil | Pesan kesalahan berkode |
| BB-25 | F28 | Output setelah pelatihan | CPS, metrik, confusion matrix tampil |
| BB-26 | F29 | Download CSV dan Copy Text Feature Table | CSV terunduh, tabel tersalin |
| BB-27 | F30 | Jalur Word-Vector | Peringatan kebocoran tampil |
| BB-28 | F31 | Export Model | JSON schema 2.0 berisi resep |
| BB-29 | F32, F34 | AM: berkas bukan model / > 10 MB | Pesan AM_E_, model tidak dipakai |
| BB-30 | F33 | AM: model dari Output Viewer | Model Summary tampil |
| BB-31 | F35 | AM: Auto-map by name | Fitur terpetakan |
| BB-32 | F35 | AM: variabel teks model tidak ada | Pesan pemetaan belum lengkap, OK nonaktif |
| BB-33 | F36, F38 | AM dengan Actual target | Kolom prediksi + metrik |
| BB-34 | F37 | AM: nama kolom bentrok | Akhiran otomatis + peringatan |
| BB-35 | F39 | Output setelah prediksi | Model Summary, CPS, Prediction Distribution |
| BB-36 | F41 | Tutup dan buka kembali menu NB | Pengaturan terakhir pulih |

**Verifikasi teks pesan dan kode galat terhadap kode sumber.** Kalau nama kode berbeda dari tabel (mis. INVALID_REGEX), pakai nama yang benar dan beri catatan.

Keluaran: `testing/thesis-eval/C_blackbox.md` dengan kolom `| ID | Fitur | Skenario | Hasil yang diharapkan | Hasil aktual | Status | Cara uji (otomatis/manual) | Bukti |`, plus `C_manual_checklist.md`.

## Track D — Perbandingan akurasi numerik (paralel)

Tujuan: membuktikan bahwa Statify identik dengan scikit-learn (dan sedekat mungkin dengan WEKA).

1. Buat jalur **headless** yang memakai kode komputasi yang sama dengan aplikasi, yaitu pustaka Rust (`statify-text-core` + crate NB/AM). Contohnya biner atau tes Rust `thesis_compare` yang membaca CSV, melatih pada `pilkada_train.csv`, memprediksi `pilkada_test.csv`, lalu menulis `pred_statify_<K>.csv` berisi kolom: id, kelas prediksi, dan probabilitas setiap kelas (format desimal penuh, `{:.17}`). **Jangan menulis ulang rumus**; panggil fungsi yang sama dengan yang dipakai WebAssembly.
2. Konfigurasi:
   - K1: standar Weka default (lowercase, delimiters default, tanpa stopword/stemming, unigram, Words to Keep 1000, TF hitungan, tanpa IDF, tanpa normalisasi) + Multinomial, alpha 1.
   - K2: K1 + Bernoulli.
   - K3: K1 + Complement.
   - K4: standar scikit-learn (hitungan, IDF smooth, L2) + Multinomial.
   - K5: standar Weka dengan TF log(1+f), IDF, dan normalisasi panjang dokumen + Multinomial (dibandingkan dengan WEKA).
   - K6 (opsional): K1 + stopword Indonesia + Sastrawi (hanya dibandingkan antarjalur Statify, karena scikit-learn tidak punya Sastrawi).
3. scikit-learn: perbarui `SIDANG/_kerja_claude` → `buku/eval/sk_compare.py` agar memakai kosakata dan vektor dari data latih saja. Catat versi.
4. WEKA 3.9.6: dikerjakan terpisah mengikuti `PANDUAN_WEKA_dan_Prompt_Agen_Paralel.md` (Fase 0, W1, W2, S, R). Di track ini cukup pastikan prediksi Statify untuk K1–K5 tersedia dengan format yang sama (kolom Id, kelas_aktual, kelas_prediksi, probabilitas setiap kelas).
5. Metrik per konfigurasi dan perangkat: Akurasi, Cohen's Kappa, Macro F1, confusion matrix.
   - Tabel buku: `| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |` (6 desimal, koma desimal).
   - Tabel kesamaan: `| Konfigurasi | Pembanding | Kelas prediksi sama (x/270) | Galat absolut maksimum probabilitas | LRE minimum |`, dengan LRE = −log10(|x−c|/|c|); bila x = c tulis "≥ 15 (identik)".
6. Dataset tambahan (unduh sendiri; catat URL, lisensi, dan jumlah baris):
   - **SMS Spam Collection** (UCI, 5.574 pesan, ham/spam tidak seimbang, CC BY 4.0, doi 10.24432/C5CC84): stratified 70/30 seed 42, konfigurasi K1–K4.
   - **IndoNLU SmSA** (11.000 latih / 1.260 validasi / 500 uji; positif/negatif/netral; MIT): pakai pembagian resmi train→test, K1 dan K4.
   - (Opsional) dataset kecil dari repositori `rizalespe/Dataset-Sentimen-Analisis-Bahasa-Indonesia`.
7. Keluaran: `testing/thesis-eval/D_accuracy.md`, CSV prediksi, dan skrip yang dapat dijalankan ulang.

## Track E — Pengujian waktu eksekusi (paralel)

1. Ukur dua jalur:
   - (a) **di peramban**: Playwright terhadap `npm run dev` atau build produksi, mengukur waktu antara klik OK dan munculnya hasil di Output Viewer, atau instrumen `performance.now()` di sekitar panggilan worker lewat hook uji tanpa mengubah kode produksi (gunakan `page.evaluate`/`performance` API).
   - (b) **headless WASM/Rust** sebagai pembanding.
2. Ukuran data: Pilkada 900; SMS Spam 5.574; SmSA 11.000; satu dataset ≥ 20.000 dokumen (gabungan SmSA atau 20 Newsgroups via scikit-learn `fetch_20newsgroups`; catat).
3. Skenario: STWV default Weka; STWV + stopword + Sastrawi; NB Raw Text holdout 70%; NB Raw Text 10-fold; AM Raw Text.
4. Protokol: 1 kali pemanasan + 5 kali pengukuran; laporkan rata-rata dan simpangan baku (ms), jumlah term, serta apakah UI tetap responsif (mis. *Long Tasks* di main thread < 200 ms selama komputasi).
5. Tabel buku: `| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |`.
6. Keluaran: `testing/thesis-eval/E_performance.md` dan data mentah CSV.

## Track F — Pengujian integrasi antarmenu (paralel)

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| IT-01 | Kolom VEC_ STWV dipakai sebagai Word-Vector Variables di NB | Jumlah term model = jumlah kolom VEC_, peringatan kebocoran tampil |
| IT-02 | Model Raw Text diekspor dari NB lalu dimuat AM | Model Summary sama dengan model asal (target, kelas, resep) |
| IT-03 | Model diterapkan ke data latih yang sama | Prediksi identik dengan model final (galat ≤ 1e-9) |
| IT-04 | Latih di pilkada_train, terapkan di pilkada_test | Kolom NB_ di 270 baris; metrik sama dengan scikit-learn (Track D) |
| IT-05 | Simpan model ke berkas, muat ulang setelah sesi baru | Prediksi identik (float_roundtrip) |

Otomatiskan di tingkat service/Rust bila memungkinkan; sisanya pakai Playwright atau daftar periksa manual. Keluaran: `testing/thesis-eval/F_integration.md` dengan kolom `| ID | Skenario | Hasil yang diharapkan | Hasil aktual | Status | Bukti |`.

---

## Fase 9 — Konsolidasi (serial, terakhir)

1. `testing/thesis-eval/REPORT.md` berisi:
   - Ringkasan eksekutif: jumlah tes, yang lulus/gagal, bug yang ditemukan.
   - Seluruh tabel dari Track A–F dengan **format kolom yang sama persis** seperti di atas, angka memakai koma desimal.
   - Interpretasi singkat 3–5 kalimat per bagian, faktual, tanpa melebih-lebihkan.
   - Daftar `NOT RUN` beserta alasannya.
   - Daftar keterbatasan (perbedaan opsi WEKA, dll.).
2. `BUGS.md` (bila ada).
3. Jalankan ulang seluruh tes sekali lagi dan pastikan tidak ada tes lama yang rusak.
4. **Jangan commit ke branch utama dan jangan push.** Cukup commit lokal di `thesis-eval` dengan pesan yang jelas, lalu tampilkan ringkasan `git diff --stat main...thesis-eval`.

## Kriteria selesai

- Semua tabel yang diminta ada, terisi dari eksekusi nyata (atau NOT RUN beserta alasannya).
- Tidak ada perubahan pada kode produksi.
- Semua skrip dapat dijalankan ulang dengan satu perintah yang tercantum di REPORT.md.
