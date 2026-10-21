# Laporan uji ulang menyeluruh dengan toolchain terkini (22 Oktober 2026)

Atas keputusan Lewis ("Ulang semua"), seluruh pengujian Modul Text Analytics dijalankan ulang dengan satu set toolchain setelah dua perbaikan kode. Laporan ini menggantikan angka di `LAPORAN_PEMBERSIHAN_TES_21Okt.md`. Log ada di `logs/` (berkas `*_win.*` yang ditulis ulang oleh `run_all.ps1`, `rust_final_win_*`, `jest_final_win_*`, `coverage_final_win_*`, `versi_final_win.txt`, `perf_*`).

## Perubahan kode sebelum uji ulang

- Naive Bayes: jumlah fold minimal 2 (`hooks/useNaiveBayesValidation.ts:255-256`, `rust/src/stats/partition.rs:179-181`, tur, panduan Help, AGENTS.md). Pesan UI "The number of folds must be at least 2."; pesan Rust "Number of folds must be at least 2 (got {})."
- Naive Bayes: Smoothing Alpha, Text Alpha, dan Top-k yang tidak sah kini disimpan di form dan menahan analisis (OK menampilkan toast galat; pindah tab ditahan), sesuai UC-03 alur 4a. Teks di bawah kolom sama persis dengan `getNumericInputError`.
- String to Word Vector: matriks hasil dikirim dari Worker sebagai `Float64Array` yang di-transfer dan disusun ulang di main thread per potongan ≤ 20 ms (`utils/packedMatrix.ts`), sehingga tidak ada lagi long task saat hasil diterima. Nilai hasil identik. Harness performa (`perf/harness.js`, `perf/stwv_bench.worker.js`) disamakan.
- String to Word Vector: label stemming Inggris menjadi "English (Snowball/Porter2)" di UI, tur, panduan Help, dan teks output.
- Ketiga WASM dibangun ulang di WSL; versi cache-busting worker dinaikkan (`naive-bayes-v3-20261022a`, `apply-model-v3-20261022a`). Build dengan wasm-pack 0.13.1 dan 0.15.0 menghasilkan berkas identik byte-per-byte (sha256 STWV `5c202402…`, NB `79ed2e20…`, AM `9298d334…`).

## Tabel 24 (versi yang dipakai seluruh pengujian)

| Komponen | Versi |
|---|---|
| Sistem operasi | Windows 11 Pro 10.0.26300 (64-bit); build WASM di WSL Ubuntu |
| Perangkat | Lenovo 82EY, AMD Ryzen 5 4600H (6 inti/12 thread), RAM 16 GB (15,37 GiB terbaca) |
| Rust (rustc / cargo) | 1.99.1 (Windows dan WSL sama) |
| wasm-pack / wasm-bindgen | 0.15.0 / 0.2.129 |
| Node.js / npm | 24.20.0 / 11.19.0 |
| Jest | 30.0.5 (paket terpasang; `jest --version` mencetak 30.0.4 karena bug upstream) |
| Next.js / React / TypeScript | 15.5.9 / 18.3.1 / 5.9.2 (tidak di-upgrade) |
| sastrawi-rs / rust-stemmers | 0.5.3 / 1.2.0 |
| Python / scikit-learn / numpy / scipy / pandas | 3.13.15 / 1.9.1 / 2.5.4 / 1.18.1 / 3.0.6 |
| Peramban pengukuran performa | Google Chrome 155.0.8059.85 (headless, Playwright) |

Angka performa berasal dari run terakhir setelah perbaikan long task STWV (run `browser_skripsi_20261022T012433`, RAM bebas ±6,9 GB, daya AC). Run sebelumnya (RAM bebas ~951 MB, lalu run bersih sebelum perbaikan) tidak dipakai.

# Perbandingan Buku v19 dengan Hasil Eksekusi Ulang 22 Oktober 2026

Sumber buku: `C:\Data\KULIAH\Skripsi\REVISI SIDANG\audit_v19\buku_v19_teks.md`
Sumber baru: `...\naive-bayes\text_analytics_eval\logs\*` (dibuat 22 Okt 2026 pukul 00.09–00.39), `perf\tables_generated.md`, `accuracy\out\*`. Pembanding lama untuk performa diambil dari versi HEAD git `logs/perf_browser_skripsi.txt` (run 8 Okt 2026 dengan Chrome 154), yang cocok persis dengan Tabel 44 di buku.
Lingkungan baru: Windows 11 Pro 10.0.26300, Node v24.20.0, rustc/cargo 1.99.1, wasm-pack 0.15.0, Jest 30.0.5 (`jest --version` mencetak 30.0.4 karena bug upstream), Python 3.13.15 (numpy 2.5.4, scipy 1.18.1, pandas 3.0.6, scikit-learn 1.9.1), Chrome 155.0.8059.85 headless, WEKA 3.9.6.

Perbedaan ditandai **tebal**.

## Status umum log baru

| Log | Hasil | Gagal / dilewati |
|---|---|---|
| jest_A_win (unit eval) | 107/107 lulus, 4 suite | 0 / 0 |
| jest_B_win (white-box) | 54/54 lulus, 4 suite | 0 / 0 |
| jest_C1_win (BB STWV) | 35/35 lulus | 0 / 0 |
| jest_C2_win (BB NB) | 64/64 lulus | 0 / 0 |
| jest_C3_win (BB AM) | 95/95 lulus | 0 / 0 |
| jest_D_win (payload) | 3/3 lulus | 0 / 0 |
| jest_F_win (integrasi) | 98/98 lulus, 5 suite | 0 / 0 |
| rust_eval_* (9 berkas) | 129 lulus (12+24+31+1+15+2+15+20+9) | 0 gagal, 0 ignored |
| integration_it01–05 | 24/24, 36/36, 45/45, 41/41, 18/18 pemeriksaan lulus | 0 |
| perf_browser / perf_headless (run terbaru 01.24 setelah perubahan kode STWV; menggantikan run 00.29 dan 00.54) | seluruh sel "OK" | 0 galat (run lama: SMS & Gabungan stopword+stemming GALAT "unreachable"; **kini berhasil**) |
| rust_llvm_cov_* | cargo-llvm-cov tidak terpasang, cakupan Rust tidak diukur | sama dengan buku |

Tidak ada tes yang gagal atau di-skip (numPendingTests = 0, numTodoTests = 0 pada semua track).

## Jumlah test case (Tabel 28 dan Kesimpulan butir 2)

Sumber: run lengkap per modul dengan cakupan (`logs/rust_final_win_*.txt`, `logs/jest_final_win_*.json`, `logs/coverage_final_win_*.json`), ditambah run ulang Jest STWV setelah perbaikan long task (4 tes baru `__tests__/packedMatrix.test.ts`). Semua lulus.

| Besaran | Buku v19 | Baru | Status |
|---|---|---|---|
| Rust core library | 155 | 155 (78 lama + 77 eval) | sama |
| Rust Naive Bayes | 243 | **242** (203 + 39 eval; eval_partition 16 → 15) | **beda** |
| Rust Apply Model | 167 | 167 (154 + 13 eval) | sama |
| Total Rust | 565 | **564** (435 lama + 129 eval) | **beda** |
| Jest STWV | 167 (15 suite) | **171 (16 suite)** (106 lama + 65 eval) | **beda** |
| Jest Naive Bayes | 385 | **388** (241 + 147 eval) | **beda** |
| Jest Apply Model | 691 | 691 (447 + 244 eval) | sama |
| Total Jest | 1.243 (79 suite) | **1.250 (80 suite)** (794 lama + 456 eval) | **beda** |
| Cakupan baris STWV / NB / AM | 72,45 / 94,75 / 97,80 | **72,18** / **94,43** / 97,80 | **beda** |

## Tabel 29 Integration testing

| Besaran | Buku (baris 2023–2027, 2029) | Baru (integration_it0x_win.txt) | Status |
|---|---|---|---|
| IT-01 | Berhasil | 24/24 lulus | sama |
| IT-01: kolom VEC_ → term model | 1.000 → 1.000; 1 kolom bernama "VEC" tanpa garis bawah | 1.000 → 1.000; notPrefixed = 1 (token "&" → "VEC"), 999 terjaring filter | sama |
| IT-01: catatan data leakage | tampil | leakage_note terisi | sama |
| IT-02 | Berhasil | 36/36 lulus | sama |
| IT-02: jumlah angka model | 6.017 sampai 8.017, identik bit | K1 6.017, K2 8.017, K5 6.018; 0 selisih | sama |
| IT-03 | Berhasil dengan catatan | 45/45 lulus; kriteria 1e-9 tetap "TIDAK terpenuhi langsung" (round4) | sama |
| IT-03: kelas sama | 630/630 untuk 5 konfigurasi | 630/630 K1–K5 | sama |
| IT-03: selisih probabilitas maks | ≤ 5 × 10⁻⁵ | maks 5,000e-5 (K2); K1/K3/K4 4,994e-5; K5 4,992e-5 | sama |
| IT-04 | Berhasil; NB_ di 270 baris; metrik = scikit-learn | 41/41 lulus; 270/270; selisih metrik 0; CSV identik byte dengan accuracy/out | sama |
| IT-05 | Berhasil; file prediksi identik byte | 18/18 lulus; K1 & K5 identik byte; 6.017/6.018 angka 0 selisih bit | sama |
| Rust eval_integration | — | 2/2 lulus | — |

## Tabel 30 Black-box testing (56 skenario)

Rekap otomatis per menu (seluruhnya lulus):

| Menu | BB buku | Skenario eval (dokumen C) | Jest | Rust | Status |
|---|---|---|---|---|---|
| String to Word Vector | BB-01–BB-19 (19) | BB-01–13 (C1) | 35/35 | 31/31 | lulus |
| Naive Bayes | BB-20–BB-43 (24) | BB-14–28 (C2) | 64/64 | 24/24 | lulus |
| Apply Model | BB-44–BB-56 (13) | BB-29–36 (C3) | 95/95 | 12/12 | lulus |
| Total | 56 Berhasil (2603) | 36 skenario eval | 194/194 | 67/67 | sama (seluruh lulus) |

Skenario yang teks "Hasil yang diharapkan" berubah karena perbaikan kode:

| BB buku (baris) | Isi buku | Perilaku baru (sumber log) | Status |
|---|---|---|---|
| BB-07 (2051) | Skenario "Stemming Indonesian (Sastrawi) dan English (Porter)" | Label opsi kini **"English (Snowball/Porter2)"** (jest_C1_win: "BB-08 stemming Sastrawi dan Snowball/Porter2 … English (Snowball/Porter2) mengirim stemming_method=english"). Hasil kata dasar tidak berubah | **beda (label)** |
| BB-27 (2071) | Text Alpha 0 / 1000 → dua pesan | Pesan sama, **ditambah: OK ditolak (toast error, analisis tidak dijalankan) dan perpindahan tab ditahan** (blackbox.nb.container "BB-18: Text Alpha 0 dan 1000 … OK menolak menjalankan analisis") | **beda (tambahan perilaku)** |
| BB-32 (2076) | Smoothing Alpha 0 → "Smoothing Alpha must be greater than 0." | Pesan sama, **ditambah OK menolak menjalankan analisis** (… "BB-18: Smoothing Alpha 0 dan 1000 …") | **beda (tambahan perilaku)** |
| BB-36 (2080) | Number of Folds 0 → "The number of folds must be at least 1." | **"The number of folds must be at least 2."**; fold 1 kini juga ditolak (UI dan Rust "Number of folds must be at least 2 (got 1).") | **beda** |
| BB-40 (2084) | Top-k 0 → pesan; setelah diperbaiki CM tidak muncul | Pesan sama, **ditambah OK menolak menjalankan analisis selama Top-k tidak sah** (… "BB-18: Top-k 0 / kosong …") | **beda (tambahan perilaku)** |
| BB-24 (2068) | N-gram min 3 > max 2 pada tab Text Preprocessing | Tidak berubah; tes eval BB-24 (fold vs kelas terkecil) hanya berganti nama "fold >= 2" | sama |

Dokumen yang belum ikut diperbarui (log lebih baru): `C_blackbox_C1.md` baris 23 masih "English (Porter)"; `C_manual_checklist*.md` masih "at least 1" untuk Folds 0; `A_unit.md`/`templates/A_unit.md` baris 117 masih nama tes lama "at least 1 (got 0)".

## Tabel 31–39 White-box testing

| Besaran | Buku (baris) | Baru (jest_B_win, B_whitebox.md) | Status |
|---|---|---|---|
| Total path diuji dan lulus | 54 lulus, Jest 21 Okt (2330) | 54/54 lulus, 22 Okt | sama (tanggal beda) |
| validateColumnPrefix V(G), path | 7, 7 dari 7 | 7, 7/7 | sama |
| getNumericInputError V(G), path | 29, 29 dari 29; 44 node, 71 edge, 28 predikat | 29, 29/29; struktur graf tidak berubah (dok. menghitung S dan X: N 45, E 72) | sama |
| useNaiveBayesValidation | 13, 12 dari 12 (1 infeasible) | 13, 12/12, path 13 infeasible | sama |
| loadModelFromFile | 6, 6 dari 6 | 6, 6/6 | sama |
| Tabel 33 node 35 (2180) | "\|\| folds < 1) (kondisi 3)" | **"\|\| folds < 2)"** | **beda** |
| Tabel 33 node 36 (2181) | return "The number of folds must be at least 1." | **"The number of folds must be at least 2."** | **beda** |
| Tabel 34 path 20 (2221) | KFolds = "10" → "…at least 1." | KFolds = "10" → **"…at least 2."** | **beda (pesan)** |
| Tabel 34 path 21 (2222) | KFolds = 2,5 → "…at least 1." | KFolds = 2,5 → **"…at least 2."** | **beda (pesan)** |
| Tabel 34 path 22 (2223) | KFolds = 0 → "…at least 1." | **KFolds = 1** → **"…at least 2."** | **beda (input dan pesan)** |
| Teks temuan fold 1 lolos validasi (2195) | dicatat sebagai saran perbaikan | **Sudah diperbaiki** (UI `folds < 2`, Rust `validate_fold_count` `folds < 2`); kalimat temuan/saran perlu diubah | **beda** |
| Gambar 32 (flow graph WB-2) | label node 35/36 lama | WB-2_getNumericInputError.dot diregenerasi (hanya label) | **beda (label)** |

## Tabel 40 Nilai acuan korpus

Tidak ada log baru yang memuat ulang seluruh baris Tabel 40; nilai TF-IDF dari `reference_values.txt` (22 Okt) dan tes golden Rust (baseline_rust_am/core/nb, 22 Okt) lulus.

| Besaran | Buku (2352–2357) | Baru | Status |
|---|---|---|---|
| TF-IDF sklearn "tidak" D2 | 0,604652 | 0,604652 (reference_values Norm l2) | sama |
| TF-IDF sklearn "nasi" D2 | 0,459854 | 0,459854 | sama |
| Weka ln(1+c)·ln(N/df) "makan" D1 | 0,281047 | golden_weka_log1p_standard_none lulus | sama (tes lulus) |
| P(pos) Multinomial | 0,849057 | golden_raw_multinomial_p_pos_dokumen_makan_nasi_enak_0_849057 lulus | sama (tes lulus) |
| P(pos) Bernoulli / Complement | 0,944708 / 0,737705 | golden_bernoulli, golden_complement_tanpa_prior, golden_raw_ketiga_likelihood lulus | sama (tes lulus) |

## Tabel 41 Akurasi Pilkada (accuracy_compare_pilkada_win.txt)

| Konfigurasi | Perangkat | Buku Akurasi/Kappa/Macro F1 (2366–2380) | Baru | Status |
|---|---|---|---|---|
| K1 | scikit-learn | 0,762963 / 0,525926 / 0,762963 | 0,762963 / 0,525926 / 0,762963 | sama |
| K1 | Statify | 0,762963 / 0,525926 / 0,762963 | 0,762963 / 0,525926 / 0,762963 | sama |
| K1 | WEKA | 0,762963 / 0,525926 / 0,762846 | 0,762963 / 0,525926 / 0,762846 | sama |
| K2 | scikit-learn | 0,729630 / 0,459259 / 0,729537 | sama | sama |
| K2 | Statify | 0,729630 / 0,459259 / 0,729537 | sama | sama |
| K2 | WEKA | 0,740741 / 0,481481 / 0,740513 | sama | sama |
| K3 | scikit-learn | 0,762963 / 0,525926 / 0,762963 | sama | sama |
| K3 | Statify | 0,762963 / 0,525926 / 0,762963 | sama | sama |
| K3 | WEKA | 0,762963 / 0,525926 / 0,762846 | sama | sama |
| K4 | scikit-learn | 0,766667 / 0,533333 / 0,766510 | sama | sama |
| K4 | Statify | 0,766667 / 0,533333 / 0,766510 | sama | sama |
| K5 | scikit-learn | 0,755556 / 0,511111 / 0,755556 | sama | sama |
| K5 | Statify | 0,755556 / 0,511111 / 0,755556 | sama | sama |
| K5 | WEKA | 0,748148 / 0,496296 / 0,748148 | sama | sama |
| K6 (teks, 2425) | Statify | akurasi 0,722222 | 0,722222 (Kappa 0,444444; F1 0,721577) | sama |
| Confusion matrix K1 (2402) | Statify & sklearn | 103/103 benar, 32 salah per kelas | [103, 32]; [32, 103] | sama |
| Keterangan versi | Python 3.13.12 (Tabel 24) | **Python 3.13.15, numpy 2.5.4, scipy 1.18.1, pandas 3.0.6**; scikit-learn 1.9.1 tetap | **beda (versi)** |

## Tabel 42 Kesamaan prediksi

| Konfigurasi | Pembanding | Buku: kelas / AE maks / LRE min (2388–2399) | Baru | Status |
|---|---|---|---|---|
| K1 | sklearn | 270/270 / 4,996e-5 / 15,66 | 270/270 / 4,996e-5 / 15,66 | sama |
| K2 | sklearn | 270/270 / 4,979e-5 / 15,21 | 270/270 / 4,979e-5 / 15,21 | sama |
| K3 | sklearn | 270/270 / 4,996e-5 / ≥ 15 | 270/270 / 4,996e-5 / identik (galat 0) | sama |
| K4 | sklearn | 270/270 / 4,940e-5 / 15,75 | 270/270 / 4,940e-5 / 15,75 | sama |
| K5 | sklearn | 270/270 / 4,960e-5 / 15,33 | 270/270 / 4,960e-5 / 15,33 | sama |
| K1 / K2 / K3 / K5 | WEKA | 264 / 267 / 264 / 264 dari 270 | 264 / 267 / 264 / 264 | sama |
| K1, vocab 1.042 | WEKA | 270/270 / 4,962e-5 | 270/270 / 4,962e-5 | sama |
| K2, vocab 1.042 | WEKA | 270/270 / 4,983e-5 | 270/270 / 4,983e-5 | sama |
| K5, vocab 1.042 | WEKA | 270/270 / 4,989e-5 | 270/270 / 4,989e-5 | sama |
| Galat parameter maks (2402) | — | 2,665 × 10⁻¹⁵, LRE min 15,21 | 2,665e-15 (K5), LRE min 15,21 (K2) | sama |
| Rust eval_compare (pendukung) | — | — | 14 konfigurasi, 0 beda kelas, 0 beda round4 | — |

## Tabel 43 Dataset tambahan

| Dataset / Konfigurasi | Buku: kelas sama / akurasi Statify=sklearn / WEKA (2414–2419) | Baru | Status |
|---|---|---|---|
| SMS Spam K1 | 1.673/1.673 / 0,982666 / 0,983264 | 1.673/1.673 / 0,982666 / 0,983264 | sama |
| SMS Spam K2 | 1.673/1.673 / 0,987448 / 0,988643 | 1.673/1.673 / 0,987448 / 0,988643 | sama |
| SMS Spam K3 | 1.673/1.673 / 0,967723 / 0,967723 | 1.673/1.673 / 0,967723 / 0,967723 | sama |
| SMS Spam K4 | 1.673/1.673 / 0,973102 / — | 1.673/1.673 / 0,973102 / — | sama |
| SmSA K1 | 500/500 / 0,598000 / 0,600000 | 500/500 / 0,598000 / 0,600000 | sama |
| SmSA K4 | 500/500 / 0,624000 / — | 500/500 / 0,624000 / — | sama |
| Varian vocab penuh vs WEKA (2425) | 1.673/1.673 dan 500/500 | K1w SMS 1.673/1.673, K1w SmSA 500/500 | sama |
| Total (2425) | 24 konfigurasi, 17.221/17.221 | 13×270 + 7×1.673 + 4×500 = 17.221, seluruhnya sama | sama |

## Tabel 44 Execution time (jalur peramban, Chrome headless) — DIPERBARUI: run bersih setelah perubahan kode STWV

Sumber terbaru:
- `perf_browser_skripsi.txt`, run_id `browser_skripsi_20261022T012433` (Chrome 155.0.8059.85 headless, selesai 01.33).
- `perf_headless_skripsi.txt` (01.24).
- `perf_aggregate.txt` dan `perf/tables_generated.md` (01.33).
- `perf/raw/browser_skripsi.csv` (nilai per run).

Kondisi perangkat (`perf_device_info.txt`, 22 Okt 2026 01.18): **memori fisik tersedia 6.913 MB**, tersambung daya AC (baterai 59%), paket daya "Seimbang".

Perubahan kode sejak run bersih sebelumnya: worker STWV kini mengirim matriks hasil sebagai Float64Array (transfer). Thread utama lalu membangun ulang `number[][]` dalam irisan waktu ≤ 20 ms dengan jeda setTimeout. Harness (`perf/harness.js`, `perf/stwv_bench.worker.js`) mengikuti alur yang sama, dan t1 diambil setelah pembangunan ulang selesai. Akibatnya waktu STWV naik, tetapi long task hilang.

Kolom tabel: buku v19 | run bersih sebelumnya (00.54, sebelum perubahan kode) | **run terbaru (01.24)** | perubahan terbaru vs buku | perubahan terbaru vs run sebelumnya | koefisien variasi (CV) run terbaru.

| Menu dan konfigurasi | Dataset | Buku v19 rata-rata / SB (ms) | Run bersih sebelumnya | **Run terbaru** | Terbaru vs buku | Terbaru vs sebelumnya | CV terbaru |
|---|---|---|---|---|---|---|---|
| STWV default | Pilkada (900) | 61,1 / 4,3 | 56,3 / 9,8 | **71,1 / 9,2** | **+16,4%** | +26,3% | 12,9% |
| STWV default | SMS Spam (5.574) | 376,2 / 28,3 | 341,7 / 14,8 | **464,1 / 5,2** | **+23,4%** | +35,8% | 1,1% |
| STWV default | SmSA (11.000) | 769,1 / 15,5 | 737,9 / 4,0 | **964,1 / 46,1** | **+25,4%** | +30,7% | 4,8% |
| STWV default | Gabungan (17.974) | 1.229,6 / 22,6 | 1.035,0 / 12,2 | **1.503,9 / 30,3** | **+22,3%** | +45,3% | 2,0% |
| STWV stopword+stemming | Pilkada (900) | 62,5 / 2,6 | 60,5 / 1,5 | **87,7 / 7,2** | **+40,3%** | +45,0% | 8,2% |
| STWV stopword+stemming | SmSA (11.000) | 825,5 / 2,5 | 704,8 / 8,9 | **973,9 / 16,0** | **+18,0%** | +38,2% | 1,6% |
| NB holdout 70% | Pilkada (900) | 113,6 / 12,9 | 105,1 / 8,4 | **96,6 / 3,2** | **−15,0%** | −8,1% | 3,3% |
| NB holdout 70% | SMS Spam (5.574) | 239,7 / 20,0 | 218,2 / 19,1 | **192,2 / 3,0** | **−19,8%** | −11,9% | 1,6% |
| NB holdout 70% | SmSA (11.000) | 533,2 / 41,5 | 475,6 / 37,4 | **420,4 / 6,8** | **−21,2%** | −11,6% | 1,6% |
| NB holdout 70% | Gabungan (17.974) | 809,8 / 42,7 | 677,5 / 40,0 | **597,3 / 13,6** | **−26,2%** | −11,8% | 2,3% |
| NB 10-fold | Pilkada (900) | 178,1 / 10,7 | 168,4 / 18,9 | **146,7 / 3,1** | **−17,6%** | −12,9% | 2,1% |
| NB 10-fold | SMS Spam (5.574) | 591,5 / 17,6 | 515,0 / 26,3 | **476,3 / 8,1** | **−19,5%** | −7,5% | 1,7% |
| NB 10-fold | SmSA (11.000) | 1.752,6 / 39,8 | 1.474,1 / 14,9 | **1.354,2 / 17,0** | **−22,7%** | −8,1% | 1,3% |
| NB 10-fold | Gabungan (17.974) | 2.493,9 / 52,9 | 2.060,1 / 30,7 | **1.900,2 / 18,5** | **−23,8%** | −7,8% | 1,0% |
| Apply Model | Pilkada (900) | 81,9 / 7,7 | 76,2 / 4,8 | **73,7 / 3,4** | **−10,0%** | −3,3% | 4,6% |
| Apply Model | SMS Spam (5.574) | 173,5 / 14,4 | 167,6 / 7,6 | **152,3 / 4,2** | **−12,2%** | −9,1% | 2,8% |
| Apply Model | SmSA (11.000) | 388,7 / 38,7 | 352,8 / 27,5 | **304,1 / 7,3** | **−21,8%** | −13,8% | 2,4% |
| Apply Model | Gabungan (17.974) | 600,8 / 40,0 | 508,2 / 43,9 | **428,0 / 13,7** | **−28,8%** | −15,8% | 3,2% |

Ringkasan:
- STWV (6 sel di buku) kini **16–40% lebih lambat daripada buku** dan 26–45% lebih lambat daripada run bersih sebelumnya. Penyebabnya, jeda irisan waktu saat matriks dibangun ulang di thread utama kini ikut terukur.
- NB dan Apply Model (12 sel) **10–29% lebih cepat daripada buku** dan 3–16% lebih cepat daripada run sebelumnya, dengan SB kecil (CV ≤ 4,6%).
- SB yang relatif besar hanya pada STWV default Pilkada (71,1 / 9,2 ms; CV 12,9%) dan STWV stopword+stemming Pilkada (87,7 / 7,2 ms; CV 8,2%). STWV default SmSA (964,1 / 46,1 ms; CV 4,8%) besar secara absolut. Di luar buku: NB holdout 36.305 dok 8.606,8 / 978,2 ms (CV 11,4%) dan STWV stopword+stemming 36.305 dok 5.709,8 / 231,7 ms.
- Keterangan Tabel 44: **Chrome 154.0.8037.98, 8 Okt 2026 → Chrome 155.0.8059.85, 22 Okt 2026**. Waktu STWV kini juga mencakup pembangunan ulang matriks di thread utama.

Baris tambahan di luar buku (run terbaru): STWV stopword+stemming SMS Spam 465,0 / 21,6 ms dan Gabungan 1.648,9 / 50,7 ms. Pada run 8 Okt, keduanya GALAT "unreachable". Jalur headless (Node, tanpa Worker): STWV default Gabungan 875,6 ms dan NB 10-fold Gabungan 1.754,5 ms.

## Long task STWV per sel dan per run (run terbaru, perf/raw/browser_skripsi.csv)

Run 0 adalah pemanasan, run 1–5 adalah pengukuran. Format: jumlah long task / durasi terpanjang (ms).

| Sel STWV | Buku v19 (maks) | Run bersih sebelumnya (maks) | Run terbaru per run | **Maks terbaru** |
|---|---|---|---|---|
| Default, Pilkada 900 | 0 | 0 | semua run 0/0 | **0** |
| Stopword+stemming, Pilkada 900 | 0 | 0 | semua run 0/0 | **0** |
| Default, SMS 5.574 | 64 | 0 | semua run 0/0 | **0** |
| Stopword+stemming, SMS 5.574 | galat | 0 | semua run 0/0 | **0** |
| Default, SmSA 11.000 | 101 | 98 | semua run 0/0 | **0** |
| Stopword+stemming, SmSA 11.000 | 97 | 107 | semua run 0/0 | **0** |
| Default, Gabungan 17.974 | **195** | **226** | semua run 0/0 | **0** |
| Stopword+stemming, Gabungan 17.974 | galat | 199 | semua run 0/0 | **0** |
| Stopword+stemming ASCII, SMS 5.574 | 53 | 0 | semua run 0/0 | **0** |
| Stopword+stemming ASCII, Gabungan 17.974 | 214 | 236 | semua run 0/0 | **0** |
| Default, 36.305 | 441 | 420 | r0 1/52; r4 1/57; run lain 0 | **57** |
| Stopword+stemming, 36.305 | galat | 399 | r2 1/72; run lain 0 | **72** |
| Stopword+stemming ASCII, 36.305 | 449 | 404 | r2 1/67; run lain 0 | **67** |

Kesimpulan: **tidak ada lagi long task ≥ 200 ms di sel mana pun**. Pada data ≤ 17.974 dokumen tidak ada long task sama sekali. Pada 36.305 dokumen hanya muncul satu long task pendek (52–72 ms) pada 1–2 dari 6 run. Kolom agregat "UI responsif (long task < 200 ms)" bernilai Ya untuk semua sel.

## Teks performa sekitar Tabel 44 (baris 2457–2461), Abstrak, dan Kesimpulan — DIPERBARUI

| Pernyataan | Buku v19 | Run bersih sebelumnya | **Run terbaru** | Terbaru vs buku |
|---|---|---|---|---|
| STWV 900 dok / 17.974 dok | 61,1 ms / 1.229,6 ms | 56,3 / 1.035,0 | **71,1 ms / 1.503,9 ms** | **+16,4% / +22,3%** |
| Rentang NB holdout | 113,6 sampai 809,8 ms | 105,1 sampai 677,5 | **96,6 sampai 597,3 ms** | **−15,0% / −26,2%** |
| Rasio 10-fold / holdout | sekitar 1,6 sampai 3,3 kali (1,57; 2,47; 3,29; 3,08) | 1,60; 2,36; 3,10; 3,04 | **sekitar 1,5 sampai 3,2 kali** (1,52; 2,48; 3,22; 3,18) | **beda (1,5–3,2)** |
| Apply Model 17.974 dok | 600,8 ms | 508,2 | **428,0 ms** | **−28,8%** |
| Waktu terlama hingga 17.974 dok | 2.493,9 ms (NB 10-fold Gabungan) | 2.060,1 | **1.900,2 ms (NB 10-fold Gabungan)**; STWV terlama 1.503,9 ms; di luar buku, stopword+stemming Gabungan 1.648,9 ms | **−23,8%** |
| "di bawah / kurang dari 2,5 detik" (baris 2459, Abstrak 153, Kesimpulan 2603) | berlaku | berlaku (2,06 detik) | **berlaku (maks 1,90 detik untuk semua sel ≤ 17.974)** | sama (margin lebih longgar) |
| Long task NB dan Apply Model | tidak ada | tidak ada | tidak ada pada semua ukuran, termasuk 36.305 | sama |
| Long task STWV pada data besar | "satu long task …, terpanjang 195 ms pada 17.974 dokumen, masih di bawah batas 200 ms" | 226 ms (melebihi batas) | **tidak ada long task pada ≤ 17.974 dok; maks 72 ms pada 36.305 dok** | **beda — kalimat perlu ditulis ulang** |
| Jeda frame p95 NB/AM saat komputasi | 10,1 sampai 10,4 ms | 10,1–10,6 | **10,1 sampai 10,3 ms** (termasuk 36.305; ≤ 17.974: 10,1–10,2) | **beda kecil (10,3 vs 10,4)** |
| Jeda frame p95 NB/AM saat diam | 10,1 sampai 10,3 ms | 10,1–10,3 | 10,1 sampai 10,3 ms | sama |
| Jeda frame STWV saat komputasi (tidak disebut di buku) | lama: p95 ≈ 10,1–10,3, maks hingga 190 ms | p95 10,1–10,3, maks hingga 230 ms | **p95 ≈ 20 ms (19,9–20,0) pada SMS, SmSA, Gabungan; 10,1–10,2 pada Pilkada; maks 30–50 ms (≤ 17.974) dan 70–80 ms (36.305)** | baru: frame turun ke sekitar 50 fps selama pembangunan ulang, tetapi tidak membeku |
| Overhead Worker 40 dok (NB dan Apply Model) | sekitar 55 sampai 75 ms (AM 54,6; NB holdout 64,3; NB 10-fold 74,5) | 52,7; 59,2; 69,3 | **sekitar 49 sampai 65 ms** (AM 49,4 / −9,5%; NB holdout 55,7 / −13,4%; NB 10-fold 64,5 / −13,4%) | **beda (rentang 49–65 ms)** |
| Overhead STWV 40 dok (tidak di buku) | lama 2,6 / 3,9 ms | 2,5 / 3,2 | 3,1 / 4,0 ms | — |
| Kesimpulan butir 2: "interface tetap responsif" | ya | meragukan untuk STWV (226 ms) | **ya, dan kini didukung penuh: tidak ada long task ≥ 200 ms di sel mana pun** | sama |
| Tabel 24: Node v24.13.1, rustc 1.93.0, Chrome 154.0.8037.98, wasm-pack 0.14.0, Python 3.13.12 | — | — | **Node v24.20.0, rustc 1.99.1, Chrome 155.0.8059.85, wasm-pack 0.15.0, Python 3.13.15** | **beda (versi)** |

Bagian buku yang perlu diubah:
- Kalimat tentang *execution time* STWV, karena nilainya naik.
- Kalimat long task STWV 195 ms. Penggantinya: tidak ada long task, karena matriks dibangun ulang bertahap dalam irisan ≤ 20 ms.
- Rasio 10-fold/holdout 1,6–3,3 menjadi 1,5–3,2.
- Apply Model pada 17.974 dokumen: 600,8 ms menjadi 428,0 ms.
- Rentang overhead 55–75 ms menjadi 49–65 ms.

## Abstrak dan Kesimpulan (rangkuman)

| Klaim | Buku (baris) | Baru | Status |
|---|---|---|---|
| Seluruh unit, white-box, black-box berhasil | 153 | semua lulus, 0 gagal | sama |
| Prediksi Pilkada sama dengan scikit-learn | 153, 2603 | 270/270 K1–K5 | sama |
| < 2,5 detik hingga 17.974 dok | 153, 2603 | maks 1.900,2 ms (run terbaru 01.24) | sama |
| 565 test case Rust, 1.243 Jest | 2603 | **564 Rust, 1.250 Jest (80 suite)** | **beda** |
| 54 path white-box lulus | 2603 | 54/54 | sama |
| Sama dengan WEKA pada K1, K2, K5 setelah vocab disamakan | 2603 | 270/270 | sama |
| 56 skenario black-box berhasil | 2603 | semua tes otomatis lulus; teks harapan BB-07/27/32/36/40 perlu disesuaikan | sama (jumlah), teks beda |
