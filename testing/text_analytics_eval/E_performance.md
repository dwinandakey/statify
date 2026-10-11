# E_performance — Pengujian waktu eksekusi modul Text Analytics Statify (Track E)

Skrip dan harness dibuat di sandbox cloud, lalu dijalankan pengguna di perangkat skripsi (Lenovo IdeaPad Gaming 3 15ARH05, Ryzen 5 4600H, 16 GB, Windows 11) lewat `run_E.ps1`. Hanya tabel "Tabel perangkat skripsi" (bagian 6) yang merupakan hasil perangkat skripsi dan masuk Bab V. Angka pada bagian "UJI ASAP" berasal dari sandbox cloud dan VM Linux lokal; fungsinya hanya membuktikan bahwa skrip bekerja dan memberi gambaran orde besaran.

## 1. Status ringkas

| Bagian | Status | Bukti |
|---|---|---|
| Harness peramban (Worker asli NB dan AM, worker pengganti STWV, server statis, Playwright) | Dijalankan di sandbox cloud (uji asap, Chromium 141) dan di perangkat skripsi (Windows 11, Chrome 154.0.8037.98 headless via Playwright; 5 pengukuran + 1 pemanasan per sel). | `logs/perf_browser_sandbox.txt`, `logs/perf_browser_skripsi.txt`, `perf/raw/browser_sandbox.csv`, `perf/raw/browser_skripsi.csv` |
| Jalur headless (Node + wasm yang sama) | Dijalankan di sandbox cloud, VM Linux lokal (uji asap), dan di perangkat skripsi (Windows 11, Node 24.13.1). | `logs/perf_headless_sandbox.txt`, `logs/perf_headless_vm_part1.txt`, `logs/perf_headless_vm_part2.txt`, `logs/perf_headless_skripsi.txt`, `perf/raw/headless_*.csv` |
| Peramban di VM lokal | NOT RUN: VM tidak punya Chromium/Chrome/Playwright dan tidak ada jaringan untuk memasangnya. | `logs/perf_device_info_vm.txt` |
| Skenario 5 x dataset Pilkada 900, SMS Spam 5.574, SmSA 11.000 | Terukur (kecuali STWV + Sastrawi pada SMS Spam: GAGAL, lihat BUGS_E.md E-01). | tabel bagian 6 |
| Dataset >= 20.000 dokumen | Terukur di perangkat skripsi: `besar_ge20000` = 36.305 dokumen (gabungan 17.974 + 20 Newsgroups 18.331 setelah dokumen kosong dibuang dari 18.846; diunduh lewat scikit-learn di Windows, `20ng_ok 18846 18331` pada log). **NOT RUN** di sandbox dan VM (20 Newsgroups tidak dapat diunduh: HTTP 403 pada proksi; sumber nyata di sana hanya 17.974 dokumen). | `logs/perf_prepare_datasets.txt`, `perf/data/PREPARE_STATUS.json`, `logs/perf_prepare_datasets_sandbox.txt` |
| Rust native | **Belum diukur** (tidak ada toolchain Rust di sandbox; aplikasi menjalankan wasm, bukan biner native). | - |
| Spesifikasi Playwright end-to-end aplikasi penuh (`e2e_full_app.spec.ts`) | Ditulis, **TIDAK DIVALIDASI DI SANDBOX** (server Next.js tidak dijalankan). | - |
| Tabel perangkat skripsi | Terisi dari eksekusi Windows (peramban dan headless) pada 8 Oktober 2026, termasuk baris dataset >= 20.000 dokumen (36.305); satu-satunya sel yang berisi GALAT adalah STWV + Sastrawi pada dataset yang memuat token non-ASCII (SMS Spam, gabungan, 36.305; BUGS_E.md E-01). | bagian 6.1 |

## 2. Skenario dan dataset

### 2.1 Lima skenario (urutan tabel buku)

| ID | Menu dan konfigurasi | Rincian |
|---|---|---|
| `stwv_default` | String to Word Vector, default Weka | Konfigurasi `K1` pustaka headless (`STWV_DEFAULT_CONFIG`): huruf kecil, pembatas bawaan, tanpa stopword/stemming, tokenisasi kata, Words to Keep 1.000, TF hitungan, tanpa IDF dan normalisasi. |
| `stwv_sw_stem` | STWV + stopword Indonesia + stemming Sastrawi | `K6`: `K1` + `stopwords.method = indonesian` + `stemming.method = indonesian`. |
| `nb_holdout70` | Naive Bayes, Raw Text, holdout 70% | Target `Label`, Raw Text Variable `Text`, mode Exclude (`Id` dikeluarkan), STWV `K1`, likelihood Multinomial, alpha 1, validasi holdout 70%, seed 42. |
| `nb_kfold10` | Naive Bayes, Raw Text, 10-fold CV | Sama, validasi `kfold`, `KFolds = 10`, seed 42. |
| `am_raw` | Apply Model, Raw Text | Model = hasil Export Model dari NB Multinomial `K1` yang dilatih pada **dataset yang sama** (model akhir NB dilatih pada seluruh data, `naive-bayes/AGENTS.md` baris 182), lalu diterapkan pada **seluruh dokumen dataset itu** (n dokumen). Yang diukur hanya Apply Model; pelatihan model tidak masuk waktu. Dipilih agar ukuran dokumen yang di-skor sama untuk semua dataset (untuk Pilkada berarti 900 dokumen, bukan 270 uji). Apply Model tidak membedakan dokumen yang pernah dilihat atau belum, sehingga waktunya tidak bergantung pada hal itu. |

Konfigurasi NB dan AM memakai teks `K1` (bukan Sastrawi), sehingga waktu NB/AM tidak terpengaruh E-01.

### 2.2 Dataset

Semua berkas CSV seragam (`Id,Label,Text`) dibangun oleh `perf/prepare_datasets.mjs` dari berkas yang sudah ada; tidak ada dokumen yang digandakan.

| ID | Dokumen | Sumber |
|---|---|---|
| `pilkada_900` | 900 | `Claude outputs/pilkada_train.csv` (630) + `pilkada_test.csv` (270), digabung agar 900 dokumen diproses sekaligus (kolom `Pasangan Calon` tidak dipakai; di aplikasi dikeluarkan lewat mode Exclude) |
| `sms_5574` | 5.574 | `accuracy/datasets/sms_spam_all.csv` (UCI SMS Spam Collection) |
| `smsa_11000` | 11.000 | `accuracy/datasets/smsa_train.csv` (IndoNLU SmSA, berkas latih) |
| `gabungan` | 17.974 | Pilkada 900 + SMS 5.574 + SmSA latih+uji 11.500. Label campuran, hanya untuk beban waktu. **Bukan** dataset >= 20.000 (kurang 2.026). Dilaporkan sebagai baris tambahan berlabel jelas. |
| `besar_ge20000` | 36.305 | Gabungan (17.974) + 20 Newsgroups (`fetch_20newsgroups`, 18.846 dokumen, 18.331 setelah dokumen kosong dibuang). Label campuran (25 kelas), hanya untuk beban waktu. Dibuat di perangkat skripsi (`logs/perf_prepare_datasets.txt`); **NOT RUN** di sandbox dan VM karena unduhan gagal (`Tunnel connection failed: 403 Forbidden`). Rata-rata 114,0 token per dokumen dan 220.477 kata unik, jauh lebih panjang daripada dataset lain (14,8 sampai 29,1 token per dokumen). |
| `*_ascii` | 5.574 / 17.974 | Varian ASCII untuk **hanya** skenario `stwv_sw_stem` (alasan: E-01). Tanda petik tipografis diganti ASCII, diakritik dilipat (NFKD), karakter non-ASCII sisanya dibuang. Jumlah dokumen sama dengan aslinya. |

Catatan ukuran: SmSA validasi (1.260 dokumen) tidak tersedia, sehingga SmSA gabungan latih+uji = 11.500, bukan 12.760 (`perf/data/PREPARE_STATUS.json`, `accuracy/datasets/MANIFEST.md`). Bila `valid_preprocess.tsv` diletakkan di `testing/text_analytics_eval/weka/data/`, `prepare_datasets.mjs` menambahkannya (gabungan menjadi 19.234, masih < 20.000). Dataset >= 20.000 praktis hanya tercapai dengan menambahkan 20 Newsgroups (jaringan diperlukan; `run_E.ps1` mencobanya otomatis bila Python + scikit-learn ada).

## 3. Metode

### 3.1 Jalur (a): peramban, harness statis (tanpa `npm run dev`)

- `perf/serve.mjs` (stdlib Node) menyajikan `frontend/public` sebagai akar, sehingga **Worker asli aplikasi** dipakai apa adanya: `/workers/Classify/NaiveBayes/naive-bayes.worker.js?v=<versi>` dan `/workers/Classify/ApplyModel/apply-model.worker.js?v=<versi>` (versi query diambil dari `naive-bayes-analysis.ts` dan `apply-model-analysis.ts` oleh `run_browser.mjs`). Header dirancang meniru berkas `public/` Next.js menurut pengetahuan penulis (`Cache-Control: public, max-age=0` + `ETag`, revalidasi 304; belum dibandingkan dengan respons server Next yang berjalan).
- STWV tidak punya worker JS murni (aplikasi membundel `stringToWord.processor.ts` lewat webpack). Pengganti: `perf/stwv_bench.worker.js` memuat glue dan wasm yang sama (`statify_string_to_word.js` dan `_bg.wasm`, disajikan di `/__stwv/`), memanggil `init()` sekali per umur Worker, `process_text_data(data, config)` lalu `postMessage({status:'success', payload})`, sama dengan pemrosesnya. Perbedaan: tanpa bundler dan tanpa `normalizeWorkerError` (tidak memengaruhi waktu jalur sukses).
- Payload dibangun di Node oleh pustaka headless (`buildNaiveBayesPayload`, `buildApplyModelPayload`, `toRustConfig`; `perf/build_payloads.mjs`), disimpan sebagai JSON (`perf/data/payloads/<dataset>.{stwv,nb,am}.json`), di-fetch oleh halaman lalu di-`postMessage` ke Worker. Yang diukur murni Worker + wasm + serialisasi pesan. Payload yang sama dibaca jalur headless (sha256 12 karakter pertama tercatat di CSV mentah kolom `payload_sha256_12`).
- `perf/harness.js`: `performance.now()` di main thread dari tepat sebelum `postMessage` (untuk NB/AM termasuk pembuatan `new Worker`, seperti di aplikasi) sampai baris pertama handler `onmessage` (deserialisasi hasil sudah selesai). NB dan AM: Worker baru tiap run lalu `terminate()` (seperti `naive-bayes-analysis.ts` dan `apply-model-analysis.ts`); STWV: satu Worker dipakai ulang (seperti `workerRef` di hook), sehingga inisialisasi wasm STWV hanya ada di run 0.
- Responsivitas UI selama komputasi: `PerformanceObserver({type:'longtask'})` (jumlah, terpanjang, total) dan jeda antar-frame `requestAnimationFrame` (p95 dan terpanjang), plus baseline p95 jeda frame saat halaman diam 1,2 detik. Halaman memuat spinner CSS agar frame terus digambar.
- Penggerak: `perf/run_browser.mjs` (Playwright). Tiap sel dijalankan di konteks dan halaman baru; kegagalan (galat, batas waktu, renderer crash) dicatat dan sel berikutnya tetap jalan. Nama dan versi peramban dari `browser.version()` tercatat di kolom `peramban`. Di Windows: `--browser chrome` (channel `chrome`, Google Chrome terpasang), cadangan `msedge`, lalu Chromium bawaan Playwright; `run_E.ps1` memilih otomatis.
- Overhead tetap Worker: skenario yang sama dengan subsampel merata 40 dokumen dari Pilkada 900 (komputasi mendekati nol), sehingga selisih peramban dan headless pada data kecil dapat dibaca.

### 3.2 Jalur (b): headless

`perf/run_headless.mjs` memanggil `stwvTransform`, `naiveBayesRun`, `applyModelRun` dari `headless/statify_wasm.mjs` (biner wasm yang sama; sha256 di log). Waktu = `performance.now()` di sekitar pemanggilan wasm sinkron (konstruktor + `get_formatted_results()` + `get_all_errors()`), tanpa Worker, tanpa `postMessage`, tanpa pembentukan payload. Tiap sel berjalan di proses Node tersendiri (`--expose-gc`, GC dipanggil sebelum tiap run). Run 0 pada headless = panggilan pertama pada proses baru (termasuk kompilasi wasm). **Rust native belum diukur**; jalur headless adalah wasm di V8, bukan biner native.

### 3.3 Protokol

1 pemanasan (run 0, dicatat tetapi tidak dipakai) + 5 pengukuran (run 1 sampai 5) per sel; satuan ms; **rata-rata dan simpangan baku sampel (n-1)** dihitung `perf/aggregate_perf.py` dari CSV mentah (`perf/raw/*.csv`; kolom: `run_id, perangkat_label, jalur, lingkungan, menu_konfigurasi, skenario_id, dataset, n_dokumen, jumlah_term, run, ms, status, pesan_galat, longtask_count, longtask_max_ms, longtask_total_ms, frame_p95_ms, frame_max_ms, frame_count, idle_frame_p95_ms, rss_mb, payload_sha256_12, wasm_sha256_12, peramban, timestamp`). Untuk tiap sel dipakai `run_id` terbaru. Urutan eksekusi dari dataset kecil ke besar. Jumlah term: STWV = panjang `vocabulary`; NB = `trained_model.text.terms.length`; AM = jumlah term pada model yang dimuat. Kriteria responsif: Long Task terpanjang < 200 ms (catatan: API Long Tasks hanya melaporkan tugas >= 50 ms).

## 4. Lingkungan uji asap (bukan perangkat skripsi)

Sandbox cloud (`logs/perf_device_info_sandbox.txt`): Intel Xeon (model 207) @ 2,10 GHz, 2 vCPU (KVM), RAM 7,8 GiB tanpa swap, Ubuntu 24.04.5, kernel 6.18.44, Node v22.22.0, Python 3.13.16, Playwright 1.56.0, Chromium 141.0.7390.37 headless.

VM Linux lokal (`logs/perf_device_info_vm.txt`): AMD Ryzen 5 4600H with Radeon Graphics (terlihat dari VM; hypervisor Microsoft), 2 vCPU, RAM 3,8 GiB, Ubuntu (kernel 6.8.0-138), Node v22.23.2, Python 3.10.12. Ini VM di atas perangkat skripsi, **bukan** Windows asli dan hanya 2 dari 12 thread yang terlihat.

Versi biner wasm yang diukur (sha256 tercetak di tiap log): STWV `94ef9c8b...6669`, NB `163a5b8f...1fd8`, AM `036c9fd9...e3fc` (identik dengan `headless/README.md`).

Perintah persis di sandbox (dari akar repo `/home/claude/statify64`):

```
node testing/text_analytics_eval/perf/prepare_datasets.mjs        > testing/text_analytics_eval/logs/perf_prepare_datasets_sandbox.txt
node testing/text_analytics_eval/perf/build_payloads.mjs          > testing/text_analytics_eval/logs/perf_build_payloads_sandbox.txt
node testing/text_analytics_eval/perf/run_headless.mjs --device sandbox                       > testing/text_analytics_eval/logs/perf_headless_sandbox.txt
node testing/text_analytics_eval/perf/run_browser.mjs  --device sandbox --browser chromium    > testing/text_analytics_eval/logs/perf_browser_sandbox.txt
python3 -I testing/text_analytics_eval/perf/aggregate_perf.py --inject testing/text_analytics_eval/E_performance.md
```

Di VM lokal: `build_payloads.mjs` lalu `run_headless.mjs --device vm --datasets pilkada_900,sms_5574,smsa_11000` dan `--datasets gabungan,besar_ge20000,sms_5574_ascii,gabungan_ascii` (dua panggilan karena batas waktu per panggilan).

## 5. Pembacaan hasil uji asap

Semua pernyataan berikut hanya untuk sandbox/VM dan dapat berubah pada perangkat skripsi.

1. **Skala linear terhadap jumlah dokumen.** STWV default di peramban sandbox: 60,6; 351,0; 741,1; 1.205,3 ms untuk 900; 5.574; 11.000; 17.974 dokumen, kira-kira 0,063 sampai 0,067 ms per dokumen. NB 10-fold pada jalur headless kira-kira 3,4 sampai 4,6 kali NB holdout untuk SMS Spam, SmSA, dan Gabungan (sandbox dan VM), dan 2,2 sampai 2,5 kali pada Pilkada 900 (sel terlalu kecil, didominasi tetapan awal).
2. **Peramban vs headless.** Pada STWV selisihnya kecil (peramban 60,6 vs headless 54,9 ms pada Pilkada 900). Pada NB dan Apply Model dataset kecil selisihnya besar (NB holdout 213,7 vs 46,3 ms; AM 121,3 vs 32,2 ms) karena Worker baru tiap analisis menanggung overhead tetap sekitar 75 sampai 140 ms (tabel "Overhead tetap Worker") dan kompilasi wasm pada isolat baru. Run pemanasan headless (panggilan pertama pada proses baru) berada dekat angka peramban, mis. NB holdout SmSA: pemanasan headless 571,1 ms dan peramban 626,9 ms vs rata-rata headless 339,6 ms (tabel "Run pemanasan"). Penjelasan "peramban = kondisi dingin" adalah dugaan yang sesuai data, belum diuji terpisah. Pengiriman pesan (structured clone) bukan penyebab utama untuk NB dan AM: di Node, median lima kali `structuredClone` pada SmSA 11.000 adalah 18,7 ms (payload NB), 3,6 ms (hasil NB), 10,8 ms (payload AM), 2,3 ms (hasil AM) (`perf/clone_cost.mjs`, `logs/perf_clone_cost_sandbox.txt`; ini V8 di Node, bukan pengukuran di peramban). Sebaliknya, hasil STWV (matriks padat) 385,9 ms pada SmSA, sejalan dengan Long Task STWV di poin 3.
3. **Responsivitas.** NB dan Apply Model tidak menghasilkan Long Task pada main thread di semua ukuran (hasilnya ringkas). STWV menghasilkan satu Long Task per proses karena hasilnya matriks padat n x V: terpanjang 110 ms (SMS Spam 5.574), 197 ms (SmSA 11.000, tepat di bawah ambang), 285 ms (Gabungan 17.974, melewati 200 ms), lihat BUGS_E.md E-02. P95 jeda frame tetap 16,7 ms (satu Long Task per ratusan frame tidak menggeser p95); jeda frame terpanjang mengikuti Long Task (100; 183; 267 ms).
4. **STWV + Sastrawi pada SMS Spam dan Gabungan GAGAL** (`unreachable`, panik wasm di `sastrawi-rs 0.5.1`): BUGS_E.md E-01. Varian ASCII dapat diukur (sandbox peramban: 388,0 ms untuk SMS Spam ASCII, 1.418,3 ms untuk Gabungan ASCII). Pada Pilkada dan SmSA (tidak ada token yang memicu) berhasil.
5. Simpangan baku sel kecil (puluhan ms) besar relatif terhadap rata-rata karena hanya lima pengukuran dan beban latar belakang sandbox; jangan membaca selisih beberapa ms sebagai perbedaan nyata.

### 5.1 Pembacaan hasil perangkat skripsi (Windows 11, Ryzen 5 4600H)

Dihitung dari tabel di bagian 6 (eksekusi 8 Oktober 2026; Chrome 154.0.8037.98 headless dan Node v24.13.1; 1 pemanasan + 5 pengukuran per sel). Rasio dan "ms per dokumen" adalah turunan dari tabel, bukan pengukuran terpisah.

1. **STWV default.** Peramban: 61,1; 376,2; 769,1; 1.229,6; 4.138,3 ms untuk 900; 5.574; 11.000; 17.974; 36.305 dokumen. Sekitar 0,067 sampai 0,070 ms per dokumen sampai 17.974 dokumen, lalu 0,114 ms per dokumen pada 36.305 dokumen (waktu 3,37 kali untuk 2,02 kali dokumen). Pada 36.305 dokumen rata-rata dokumen jauh lebih panjang (114,0 token versus 14,8 sampai 29,1), jadi kenaikan per dokumen sejalan dengan bertambahnya token, tetapi pengukuran ini tidak memisahkan faktor-faktor lain.
2. **Naive Bayes dan Apply Model.** Pada 36.305 dokumen: NB holdout 10.297,3 ms, NB 10-fold 26.624,7 ms, Apply Model 6.500,9 ms di peramban (headless: 3.710,3; 17.960,9; 1.661,5 ms). Dibanding 17.974 dokumen, waktunya 10,7 sampai 12,7 kali lipat untuk 2,02 kali dokumen (peramban). Pada headless, NB 10-fold hampir proporsional dengan jumlah token: 4,65; 4,68; 4,72; 4,34 ms per 1.000 token untuk SMS Spam, SmSA, gabungan, dan 36.305 dokumen.
3. **Peramban dibanding headless.** Rasio waktu peramban/headless pada lima ukuran dataset: STWV default 1,23 sampai 1,42; NB holdout 1,64 sampai 4,09; NB 10-fold 1,17 sampai 2,16; Apply Model 1,76 sampai 3,92. Overhead tetap Worker (40 dokumen) hanya 2,6 ms (STWV), 64,3 ms (NB holdout), 74,5 ms (NB 10-fold), dan 54,6 ms (Apply Model). Pada 36.305 dokumen selisih peramban − headless masih 6.587,0 ms (NB holdout), 8.663,8 ms (NB 10-fold), dan 4.839,4 ms (Apply Model), jadi bukan hanya overhead tetap; penyebabnya tidak diisolasi di Track E.
4. **Responsivitas.** NB dan Apply Model tidak menghasilkan Long Task pada semua ukuran (jeda frame terpanjang 20 ms). STWV menghasilkan satu Long Task per proses (matriks padat, BUGS_E.md E-02): terpanjang 101 ms (11.000), 195 ms (17.974), 441 ms (36.305); ambang 200 ms terlewati pada ukuran terbesar (dan 214 ms pada gabungan varian ASCII dengan Sastrawi).
5. **STWV + Sastrawi.** GALAT `unreachable` pada SMS Spam, gabungan, dan 36.305 dokumen (BUGS_E.md E-01); varian ASCII terukur: 411,1; 1.406,3; 6.166,2 ms di peramban, sekitar 1,49 kali STWV default pada 36.305 dokumen (headless: 303,5; 1.083,2; 4.907,5 ms).
6. **Pemanasan.** Panggilan pertama pada proses headless baru lebih lambat daripada rata-rata lima pengukuran berikutnya (mis. STWV gabungan 3.913,8 versus 999,1 ms); tabel utama memakai rata-rata run 1 sampai 5.
7. **Simpangan baku** (50 sel utama dan tambahan yang berisi waktu): median 3,0 persen dari rata-rata; 30 sel di bawah 5 persen dan 46 sel di bawah 10 persen. Terbesar pada sel kecil: NB holdout headless Pilkada (4,6 dari 27,8 ms; 16,5 persen), Apply Model headless SMS Spam (11,1 dari 94,6 ms; 11,7 persen), dan NB holdout peramban Pilkada (12,9 dari 113,6 ms; 11,4 persen). Dengan lima pengukuran, selisih beberapa persen tidak boleh dibaca sebagai perbedaan nyata.

## 6. Tabel hasil

### 6.1 Format yang masuk buku

Kolom persis: `| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |`. Tabel di bawah dibangkitkan oleh `perf/aggregate_perf.py` dan disuntikkan di antara penanda; **jangan menyunting tangan di antara penanda** (dibangkitkan ulang saat `run_E.ps1` selesai).

<!-- BEGIN:perf_tables -->

### Tabel perangkat skripsi (hasil yang masuk buku)

Label perangkat: PERANGKAT-SKRIPSI (Lenovo IdeaPad Gaming 3 15ARH05, Ryzen 5 4600H, 16 GB, Windows 11)

Lingkungan tercatat: AMD Ryzen 5 4600H with Radeon Graphics x12; RAM 15.4 GiB; Windows_NT 10.0.26300; Node v24.13.1

Peramban: chrome 154.0.8037.98 headless

**Jalur (a): di peramban (Worker asli aplikasi + harness statis)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 61,1 | 4,3 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 376,2 | 28,3 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 769,1 | 15,5 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 4.138,3 | 109,1 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 62,5 | 2,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 825,5 | 2,5 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen (36.305) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 113,6 | 12,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 239,7 | 20,0 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 533,2 | 41,5 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 10.297,3 | 312,8 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 178,1 | 10,7 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 591,5 | 17,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.752,6 | 39,8 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 26.624,7 | 1.143,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 81,9 | 7,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 173,5 | 14,4 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 388,7 | 38,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 6.500,9 | 161,7 |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.229,6 | 22,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 411,1 | 7,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.406,3 | 90,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII (36.305) | 1.000 | 6.166,2 | 54,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 809,8 | 42,7 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.493,9 | 52,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 600,8 | 40,0 |

**Jalur (b): headless (Node + wasm yang sama, tanpa Worker)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 45,5 | 4,0 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 265,7 | 6,4 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 595,9 | 17,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 3.288,6 | 51,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 63,7 | 7,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 676,8 | 9,5 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen (36.305) | - | GALAT: unreachable | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 27,8 | 4,6 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 118,4 | 3,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 325,9 | 5,1 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 3.710,3 | 245,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 82,4 | 4,9 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 418,2 | 4,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.500,1 | 139,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 17.960,9 | 317,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 20,9 | 1,8 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 94,6 | 11,1 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 221,1 | 3,4 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 1.661,5 | 6,5 |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 999,1 | 11,8 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 303,5 | 3,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.083,2 | 16,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII (36.305) | 1.000 | 4.907,5 | 69,1 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 484,5 | 15,8 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.050,5 | 38,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 322,2 | 6,1 |

**Responsivitas UI (jalur peramban)**

| Menu dan konfigurasi | Dataset | Long task (rata-rata jumlah per proses) | Long task terpanjang (ms) | Jeda frame p95 (ms) | Jeda frame terpanjang (ms) | Jeda frame p95 saat diam (ms) | UI responsif (long task < 200 ms)? |
|---|---|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,1 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 0,4 | 64 | 10,2 | 50 | 10,2 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1,0 | 101 | 10,2 | 90 | 10,2 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen (36.305) | 1,0 | 441 | 10,1 | 430 | 10,2 | Tidak (maks 441 ms) |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1,0 | 195 | 10,3 | 190 | 10,3 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1,0 | 97 | 10,2 | 90 | 10,2 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 0,2 | 53 | 10,2 | 40 | 10,2 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1,0 | 214 | 10,2 | 220 | 10,2 | Tidak (maks 214 ms) |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII (36.305) | 1,0 | 449 | 10,2 | 450 | 10,3 | Tidak (maks 449 ms) |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 0,0 | 0 | 10,4 | 20 | 10,3 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 10,2 | 10 | 10,3 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 0,0 | 0 | 10,2 | 12 | 10,3 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 0,0 | 0 | 10,2 | 20 | 10,2 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,3 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 0,0 | 0 | 10,1 | 10 | 10,3 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen (36.305) | 0,0 | 0 | 10,4 | 20 | 10,1 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |

**Overhead tetap Worker (jalur peramban, 40 dokumen)**

| Menu dan konfigurasi | Dokumen | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | 40 (subsampel merata pilkada_900) | 393 | 2,6 | 0,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | 40 (subsampel merata pilkada_900) | 287 | 3,9 | 0,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 64,3 | 3,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 74,5 | 7,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | 40 (subsampel merata pilkada_900) | 1.000 | 54,6 | 2,4 |

**Run pemanasan (run 0) dibanding rata-rata run 1–5** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)

| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |
|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 103,7 | 45,5 | 149,9 | 61,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 443,8 | 265,7 | 480,7 | 376,2 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.442,7 | 595,9 | 1.147,9 | 769,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 3.913,8 | 999,1 | 2.965,3 | 1.229,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 139,9 | 63,7 | 131,1 | 62,5 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.617,7 | 676,8 | 1.272,2 | 825,5 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 106,4 | 27,8 | 116,8 | 113,6 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 235,9 | 118,4 | 222,8 | 239,7 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 506,1 | 325,9 | 465,1 | 533,2 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 682,1 | 484,5 | 637,3 | 809,8 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 172,5 | 82,4 | 173,1 | 178,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 566,5 | 418,2 | 556,5 | 591,5 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.562,9 | 1.500,1 | 1.581,5 | 1.752,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.158,8 | 2.050,5 | 2.280,8 | 2.493,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 71,9 | 20,9 | 82,9 | 81,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 179,2 | 94,6 | 162,9 | 173,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 373,6 | 221,1 | 326,1 | 388,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 544,0 | 322,2 | 502,7 | 600,8 |


### UJI ASAP — BUKAN HASIL PERANGKAT SKRIPSI: SANDBOX-CLOUD (UJI ASAP, BUKAN PERANGKAT SKRIPSI)

Lingkungan tercatat: Intel(R) Xeon(R) Processor @ 2.10GHz x2; RAM 7.8 GiB; Linux 6.18.44-fc-v77; Node v22.22.0

Peramban: Chromium bawaan Playwright 141.0.7390.37 headless

**Jalur (a): di peramban (Worker asli aplikasi + harness statis)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 60,6 | 4,8 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 351,0 | 15,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 741,1 | 34,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 67,1 | 7,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 808,3 | 18,7 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 213,7 | 40,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 373,1 | 38,8 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 626,9 | 21,3 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 322,0 | 15,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 800,2 | 38,7 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.796,0 | 32,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 121,3 | 16,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 281,7 | 24,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 501,6 | 50,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.205,3 | 34,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 388,0 | 14,4 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.418,3 | 106,7 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 830,1 | 51,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.567,1 | 35,1 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 714,6 | 54,6 |

**Jalur (b): headless (Node + wasm yang sama, tanpa Worker)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 54,9 | 6,8 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 286,4 | 8,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 635,5 | 17,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 69,3 | 8,9 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 729,1 | 9,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 46,3 | 29,8 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 118,4 | 4,0 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 339,6 | 10,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 103,5 | 34,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 436,3 | 9,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.568,3 | 146,5 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 32,2 | 4,4 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 103,1 | 52,6 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 235,0 | 39,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.002,7 | 7,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 378,0 | 63,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.123,0 | 18,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 515,2 | 62,4 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.126,2 | 67,2 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 304,3 | 8,0 |

**Responsivitas UI (jalur peramban)**

| Menu dan konfigurasi | Dataset | Long task (rata-rata jumlah per proses) | Long task terpanjang (ms) | Jeda frame p95 (ms) | Jeda frame terpanjang (ms) | Jeda frame p95 saat diam (ms) | UI responsif (long task < 200 ms)? |
|---|---|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1,0 | 110 | 16,8 | 100 | 16,7 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1,0 | 197 | 16,7 | 183 | 16,8 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1,0 | 285 | 16,7 | 267 | 16,7 | Tidak (maks 285 ms) |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1,0 | 193 | 16,8 | 167 | 16,7 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 0,8 | 96 | 16,7 | 83 | 16,8 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1,0 | 301 | 16,7 | 283 | 16,7 | Tidak (maks 301 ms) |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 16,8 | 17 | 16,8 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 0,0 | 0 | 16,7 | 17 | 16,8 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |

**Overhead tetap Worker (jalur peramban, 40 dokumen)**

| Menu dan konfigurasi | Dokumen | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | 40 (subsampel merata pilkada_900) | 393 | 3,1 | 1,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | 40 (subsampel merata pilkada_900) | 287 | 6,3 | 4,1 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 98,3 | 10,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 139,2 | 22,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | 40 (subsampel merata pilkada_900) | 1.000 | 75,5 | 4,7 |

**Run pemanasan (run 0) dibanding rata-rata run 1–5** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)

| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |
|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 161,2 | 54,9 | 175,8 | 60,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 444,7 | 286,4 | 529,2 | 351,0 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.118,9 | 635,5 | 1.207,3 | 741,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.859,6 | 1.002,7 | 1.725,2 | 1.205,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 163,3 | 69,3 | 181,5 | 67,1 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.087,7 | 729,1 | 1.299,0 | 808,3 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 146,6 | 46,3 | 254,8 | 213,7 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 272,3 | 118,4 | 345,3 | 373,1 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 571,1 | 339,6 | 664,9 | 626,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 742,0 | 515,2 | 867,6 | 830,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 288,3 | 103,5 | 322,1 | 322,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 641,6 | 436,3 | 1.008,1 | 800,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.721,5 | 1.568,3 | 1.769,6 | 1.796,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.471,2 | 2.126,2 | 2.557,0 | 2.567,1 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 103,2 | 32,2 | 117,7 | 121,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 205,0 | 103,1 | 287,8 | 281,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 393,7 | 235,0 | 504,5 | 501,6 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 660,5 | 304,3 | 837,1 | 714,6 |


### UJI ASAP — BUKAN HASIL PERANGKAT SKRIPSI: VM-LOKAL (UJI ASAP, BUKAN PERANGKAT SKRIPSI)

Lingkungan tercatat: AMD Ryzen 5 4600H with Radeon Graphics x2; RAM 3.8 GiB; Linux 6.8.0-138-generic; Node v22.23.2

**Jalur (b): headless (Node + wasm yang sama, tanpa Worker)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 83,6 | 17,3 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 425,2 | 15,4 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 908,4 | 11,7 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 84,9 | 11,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 969,8 | 31,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 43,8 | 15,0 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 137,0 | 16,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 360,1 | 23,5 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 109,2 | 34,8 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 462,3 | 6,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.499,3 | 16,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 42,9 | 16,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 117,9 | 43,8 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 242,0 | 32,0 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.476,9 | 32,4 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 461,6 | 6,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.541,0 | 56,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 543,0 | 27,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.290,1 | 110,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 344,0 | 17,6 |

**Run pemanasan (run 0) dibanding rata-rata run 1–5** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)

| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |
|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 231,2 | 83,6 | - | - |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 721,2 | 425,2 | - | - |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.379,1 | 908,4 | - | - |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.185,5 | 1.476,9 | - | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 227,8 | 84,9 | - | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.347,1 | 969,8 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 154,0 | 43,8 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 352,9 | 137,0 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 601,7 | 360,1 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 815,8 | 543,0 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 304,3 | 109,2 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 764,7 | 462,3 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.785,2 | 1.499,3 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.779,5 | 2.290,1 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 129,0 | 42,9 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 240,1 | 117,9 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 476,5 | 242,0 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 749,5 | 344,0 | - | - |

<!-- END:perf_tables -->

## 7. Keterbatasan

1. Angka pada bagian "UJI ASAP" dan bagian 4 sampai 5 berasal dari sandbox cloud (Xeon 2 vCPU, Linux) dan VM Linux 2 vCPU; **bukan** perangkat skripsi. Jangan memindahkannya ke buku. Hanya "Tabel perangkat skripsi" yang berasal dari perangkat skripsi. CPU, jumlah inti, sistem operasi, versi peramban, dan beban latar belakang berbeda, sehingga hanya orde besaran dan bentuk skala yang dapat dipelajari.
2. Harness mengukur Worker + wasm + serialisasi pesan, **bukan** seluruh "klik OK sampai Output Viewer". Tidak termasuk: validasi form, pembacaan data dari IndexedDB (`getVariableData`), pembentukan payload di main thread (1 sampai 11 ms per payload pada sandbox, `perf/data/payloads_index.json`), penambahan ~1.000 kolom ke DataStore/VariableStore (STWV), `transformNaiveBayesResult` dan penulisan Output Viewer. Waktu aplikasi penuh karena itu lebih besar; `perf/e2e_full_app.spec.ts` (opsional, tidak divalidasi) mengukurnya untuk STWV.
3. Worker STWV di harness adalah pengganti (bagian 3.1), dan tidak melalui bundler Next.js. Worker NB/AM adalah berkas asli, tetapi disajikan oleh server statis, bukan Next.js (header cache ditiru, perilaku dev server dan produksi tidak diukur).
4. Pada Chromium headless di sandbox, jeda frame saat diam teramati 16,7 ms (60 Hz) dan bukan ritme layar nyata; pada perangkat skripsi gunakan `-Headed` bila ingin ritme layar sebenarnya (eksekusi 8 Oktober 2026 memakai Chrome headless: jeda frame p95 teramati 10,1 sampai 10,4 ms, bukan ritme layar nyata). Long Tasks hanya melaporkan tugas >= 50 ms dan hanya main thread; kerja di Worker tidak terlihat oleh API itu (memang tidak memblokir UI).
5. Lima pengukuran per sel; run 0 dibuang; tidak ada koreksi untuk pelambatan termal atau penyetelan daya (perangkat skripsi diukur dengan adaptor daya tersambung dan paket daya Balanced, `logs/perf_device_info.txt`; tidak ada pemeriksaan program latar belakang). Memori puncak peramban tidak diukur (kolom `rss_mb` hanya terisi pada jalur headless: RSS proses Node).
6. Dataset >= 20.000 dokumen (36.305) dan dataset gabungan memakai label campuran dan sumber berbeda (25 kelas pada 36.305); hanya untuk beban waktu. Dokumen 20 Newsgroups jauh lebih panjang (114,0 token per dokumen) sehingga ukuran terbesar tidak sebanding dengan dataset lain pada jumlah dokumen yang sama. Dataset ini NOT RUN di sandbox dan VM.
7. Waktu NB 10-fold mencakup seluruh siklus validasi di dalam wasm; tidak ada pemisahan per fold.
8. Rust native tidak diukur. Tidak ada pembanding eksternal (mis. scikit-learn atau WEKA) untuk waktu; Track E hanya mengukur Statify.

## 8. Instruksi satu perintah (perangkat skripsi, Windows)

Dari akar repo `E:\KULIAH\Skripsi\statify64`, setelah mencolokkan daya dan menutup aplikasi lain:

```
powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_E.ps1
```

Skrip: mencatat spesifikasi perangkat ke `logs\perf_device_info.txt`; memeriksa node, python (opsional), Playwright dan peramban (Chrome, lalu Edge, lalu Chromium bawaan); membangun dataset dan payload; menjalankan jalur headless dan peramban (log `logs\perf_headless_skripsi.txt`, `logs\perf_browser_skripsi.txt`; CSV `perf\raw\headless_skripsi.csv`, `perf\raw\browser_skripsi.csv`); lalu menjalankan `aggregate_perf.py` yang menulis ulang tabel di bagian 6.1 dokumen ini. Opsi: `-Quick` (hanya Pilkada dan SMS Spam), `-SkipBrowser`, `-SkipHeadless`, `-Skip20NG`, `-Headed`, `-Browser chrome|msedge|chromium`. Jika Playwright tidak ditemukan: `cd frontend; npm install; npx playwright install chromium`. Jika Python tidak ada: jalankan `python testing\text_analytics_eval\perf\aggregate_perf.py --inject testing\text_analytics_eval\E_performance.md` di mesin lain yang memiliki Python (hanya pustaka standar) setelah menyalin `perf\raw\*.csv`.

Agar baris ">= 20.000 dokumen" terisi: pastikan ada jaringan dan `pip install scikit-learn` (skrip mengunduh 20 Newsgroups), atau letakkan `valid_preprocess.tsv` di `testing\text_analytics_eval\weka\data\` (menambah SmSA validasi; total tetap 19.234 sehingga belum cukup tanpa 20 Newsgroups). Tanpa 20 Newsgroups, baris itu tetap `NOT RUN`.

Rekomendasi pengukuran: jalankan dua kali (dengan `-Headed` sekali) dan bandingkan; yang masuk buku cukup satu eksekusi lengkap yang `status`-nya OK pada semua sel, dengan peramban, versi, dan spesifikasi dari `logs\perf_device_info.txt`.

## 9. Berkas

| Berkas | Isi |
|---|---|
| `perf/common.mjs` | definisi skenario, urutan dataset, statistik, CSV mentah |
| `perf/prepare_datasets.mjs` | membangun `perf/data/*.csv` (+ percobaan 20 Newsgroups, varian ASCII) |
| `perf/build_payloads.mjs` | membangun payload JSON (pustaka headless) |
| `perf/serve.mjs`, `perf/harness.html`, `perf/harness.js`, `perf/stwv_bench.worker.js` | server statis dan harness peramban |
| `perf/run_browser.mjs`, `perf/run_headless.mjs` | penggerak jalur (a) dan (b) |
| `perf/clone_cost.mjs` | biaya `structuredClone` payload/hasil di Node (orde besaran, bukan peramban) |
| `perf/aggregate_perf.py` | agregasi CSV mentah ke tabel markdown (koma desimal) |
| `perf/e2e_full_app.spec.ts` | opsional, aplikasi penuh, TIDAK DIVALIDASI |
| `perf/raw/*.csv` | data mentah (sandbox, VM) |
| `perf/tables_generated.md` | salinan tabel yang disuntikkan |
| `run_E.ps1` | satu perintah di Windows |
| `BUGS_E.md` | E-01 (tinggi), E-02, E-03 (informasi) |
| `logs/perf_*` | log mentah dan spesifikasi perangkat |

Berkas `perf/data/` (dataset turunan dan payload, puluhan MB) dibangkitkan ulang oleh skrip dan sebaiknya tidak dimasukkan ke git.
