# Laporan uji performa waktu komputasi: Statify vs IBM SPSS Statistics 27

Tanggal pengukuran: 16 Oktober 2026. Satu laptop untuk kedua perangkat lunak. Cara mengulang ada di [../README.md](../README.md).

## Ringkasan

- **Pembanding utama** adalah Statify komputasi saja (waktu di dalam Web Worker, fase 2) terhadap Elapsed Time SPSS. Waktu ujung ke ujung Statify dilaporkan terpisah, tanpa rasio terhadap SPSS.
- **Build produksi Statify lebih lambat daripada SPSS di semua sel.** Untuk n ≥ 10.000, yang berada di atas resolusi SPSS, rasio median Statify/SPSS adalah:

  | Prosedur | n = 10.000 | n = 100.000 |
  |---|---:|---:|
  | One-Way MANOVA | 14,9× | 13,9× |
  | Two-Way MANOVA | 21,1× | 17,9× |
  | Pengukuran Berulang (RM) | 2,6× | 2,2× |

  Pada n = 100.000, waktunya 14,6 / 33,2 / 2,4 detik di Statify dan 1,05 / 1,86 / 1,08 detik di SPSS (urutan: One-Way, Two-Way, RM).
- **Penyebab utamanya ada di dalam komputasi WASM, bukan di antarmuka.** Pada n = 100.000, porsi worker mencapai 92–99% waktu ujung ke ujung. Analisis penyebab (fase 3 dan profil) menemukan dua sebab terukur:
  - WASM GLM di-*build* tanpa optimasi (`opt-level = 0`, `wasm-opt = false`). Sebagai analisis penyebab, bukan angka utama: build eksperimen teroptimasi (fase 3) 3,6–4,3× lebih cepat untuk MANOVA dan 6,4–7,0× untuk RM. **Hanya pada build teroptimasi dan hanya untuk waktu komputasi saja**, RM lebih singkat daripada SPSS (0,3–0,4×); MANOVA masih 3,9–5,5× lebih lambat. Build ini belum menjadi bagian dari produk.
  - MANOVA Statify mengerjakan banyak hal yang tidak diminta. Pada n = 10.000 porsinya 46–49% waktu worker: *homogeneous subsets* post hoc, data plot, uji univariat, dan Bartlett. Profil juga menunjukkan bahwa aljabar matriks hanya sekitar 5% waktu, sedangkan *hashing*/HashMap, `merge_records`, dan alokasi memori menyerap sekitar 76% (build produksi).
- **Hasil statistik setara.** Wilks' Lambda (nilai, F, Sig.) semua efek dan F faktor *between* RM selalu sama dengan SPSS dalam toleransi 0,001. Totalnya 208 perbandingan untuk seri utama, 64 untuk seri RM teks, dan 104 untuk build teroptimasi. Tidak ada satu pun yang gagal.
- **Sebaran pengukuran kecil.** Pada n ≥ 10.000, IQR/median Statify komputasi saja ≤ 3,2% dan SPSS ≤ 13,6% (≤ 3,0% pada n = 100.000). Tidak ada lonjakan pada kedua ukuran utama (T5, §2).
- **Batas kemampuan:** impor CSV Statify gagal tanpa pesan untuk kolom teks lebih dari ±63.600 baris. Karena itu seri utama memakai faktor berkode angka. Dengan kode itu, RM Statify berjalan di jalur yang lebih cepat, sehingga rasio RM di atas adalah **batas bawah**. Data berfaktor teks 13–50% lebih lambat (§2, T2).

## 1. Rancangan dan kondisi pengukuran

| Hal | Isi |
|---|---|
| Prosedur | One-Way MANOVA (Y1–Y4, A 3 level); Two-Way MANOVA (Y1–Y4, A 3 × B 2, faktorial penuh); Pengukuran Berulang (t1–t4 = faktor *within* `time` 4 level, measure `score`; faktor *between* `group` 3 level) |
| Data | Sintetis, deterministik (`data/generate.cjs`, mulberry32 + Box–Muller, *seed* tetap), efek moderat. Seri utama: n = 100, 1.000, 10.000, 100.000, faktor berkode angka (`data/kode`). Seri pelengkap RM: faktor teks, n = 100, 1.000, 10.000, 50.000. CSV yang sama dibaca SPSS dan Statify. |
| Opsi | Type III, *Descriptive statistics*, *Estimates of effect size*, *Observed power*, *Homogeneity tests*, α = 0,05. SPSS: `/PRINT=DESCRIPTIVE ETASQ OPOWER HOMOGENEITY`. Statify: checkbox `DescStats`, `EstEffectSize`, `ObsPower`, `HomogenTest`. Tanpa post hoc, plot, maupun save. |
| SPSS | IBM SPSS Statistics 27.0.1.0, *production facility* (`stats.exe <job>.spj -production silent`). `GET DATA` CSV → `CACHE` + `EXECUTE` (pembacaan data tidak masuk GLM pertama) → GLM 11× (run 1 pemanasan). OMS → OXML. Elapsed Time dan Processor Time diambil dari tabel Notes. |
| Statify, komputasi saja (pembanding utama) | Waktu *handler* worker produksi yang tidak diubah: inisialisasi WASM (hanya run 1), `MultivariateAnalysis`/`RepeatedMeasureAnalysis`, `get_formatted_results`, `get_all_errors`, `free`. Payload-nya persis yang dikirim UI di fase 1. Diukur di harness pada build worktree terpisah. |
| Statify, ujung ke ujung (informasi tambahan) | UI asli build produksi (Next.js 15.5.9), Playwright 1.57.0, Chromium 143.0.7499.4 *headless*. `performance.measure(glm-analysis-start → glm-analysis-end)`, `detail.mode = worker` diperiksa di setiap run. Waktu impor CSV tidak dihitung. Hasil lama dihapus sebelum setiap run, di luar jendela ukur. |
| Run | 1 pemanasan + 10 terukur per sel, untuk ketiga ukuran waktu dan kedua perangkat lunak |
| Urutan | Fase 1 berselang-seling per n (100: SPSS→Statify; 1.000: Statify→SPSS; dst.), pendinginan 120 dtk antarblok. Lalu seri RM teks (fase 1), fase 2 utama, fase 2 RM teks, dan fase 3. Jam mulai dan selesai setiap blok ada di `results/utama/blocks.csv`, `results/rm-teks/blocks.csv`, `results/opt/blocks.csv`. |
| Waktu | Fase 1 utama 13.12–14.03 WIB; seri RM teks 14.05–14.26; fase 2 utama 14.28–14.47; fase 2 RM teks 14.49–14.57; fase 3 15.08–15.20 |
| Mesin | Intel Core i7-12700H (14 core, 20 thread), RAM 23,6 GB, Windows 11 Home 10.0.26300, Node 20.19.0, charger tersambung, skema daya "Performance", mode *Best performance* (`results/*/machine-*.json`) |
| Afinitas | P-core, CPU logis 0–11 (`0xFFF`), untuk SPSS (`stats.exe`, `spssengine.exe`) dan Statify (server, Node, semua proses Chromium). Proses GPU Chromium tidak mewarisi afinitas, sehingga dipasang ulang di awal setiap sel. Terverifikasi di `spss/*/affinity.tsv` dan `statify/*/affinity.jsonl`. |
| Layanan latar | Dijeda oleh pengguna: Defender *real-time*, Windows Update, OneDrive, Windows Search; Edge dan SPSS GUI ditutup. Rekaman setelah run: Defender *real-time* off, Windows Update berhenti, tetapi WSearch *Running* dan ada 7 proses `msedge` (CPU 7,5 dtk). VS Code tetap terbuka untuk memantau. |
| Statistik | Median, Q1–Q3, min, maks (detik), dan rasio median. Tanpa uji statistik: 10 run per sel adalah pengulangan pengukuran, bukan sampel populasi. |
| Resolusi SPSS | Waktu dibaca dari OXML. Atribut `duration` dibulatkan ke 2 angka penting (langkah 1 ms di bawah 0,1 dtk); teks `hh:mm:ss.ss` berlangkah 10 ms. Yang lebih teliti yang dipakai. Processor Time berlangkah 1 *tick* (15,625 ms). Sel dengan median SPSS < 3 *tick* (≈ 0,047 dtk) ditandai "di bawah resolusi pengukuran": semua sel n = 100 dan 1.000. |

## 2. Hasil

Tabel dihasilkan oleh `report_tables.py` dari berkas CSV (`results/tabel-laporan.md`); T5 berisi koefisien variasi. Grafik: [utama/waktu-vs-n.png](utama/waktu-vs-n.png) (SPSS, Statify komputasi saja, Statify ujung ke ujung) dan [opt/waktu-vs-n-opt.png](opt/waktu-vs-n-opt.png) (SPSS, build produksi, build teroptimasi). Keduanya log–log, PNG 300 dpi, lebar 14 cm, huruf 8 pt.

### T1. Waktu komputasi (detik), median [min–maks] dari 10 run terukur, faktor berkode angka

| Prosedur | n | SPSS Elapsed Time | Statify komputasi saja | Rasio Statify/SPSS | Statify ujung ke ujung (informasi tambahan) |
|---|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 0,006 [0,000–0,006] | 0,021 [0,019–0,028] | 3,5×* | 0,063 [0,058–0,072] |
| One-Way MANOVA | 1.000 | 0,013 [0,000–0,017] | 0,156 [0,152–0,170] | 12,0×* | 0,208 [0,196–0,211] |
| One-Way MANOVA | 10.000 | 0,100 [0,084–0,110] | 1,483 [1,461–1,516] | 14,9× | 1,564 [1,512–1,590] |
| One-Way MANOVA | 100.000 | 1,050 [1,030–1,110] | 14,56 [14,49–14,69] | 13,9× | 14,93 [14,74–31,09] |
| Two-Way MANOVA | 100 | 0,009 [0,000–0,013] | 0,044 [0,041–0,053] | 5,1×* | 0,093 [0,089–0,110] |
| Two-Way MANOVA | 1.000 | 0,018 [0,009–0,031] | 0,346 [0,339–0,368] | 18,7×* | 0,399 [0,381–0,432] |
| Two-Way MANOVA | 10.000 | 0,160 [0,150–0,170] | 3,369 [3,324–3,402] | 21,1× | 3,479 [3,411–3,545] |
| Two-Way MANOVA | 100.000 | 1,855 [1,820–1,940] | 33,22 [33,06–33,45] | 17,9× | 33,86 [33,60–34,35] |
| Pengukuran Berulang | 100 | 0,006 [0,002–0,014] | 0,016 [0,015–0,028] | 2,7×* | 0,130 [0,120–0,144] |
| Pengukuran Berulang | 1.000 | 0,013 [0,008–0,023] | 0,040 [0,037–0,058] | 3,0×* | 0,158 [0,140–0,179] |
| Pengukuran Berulang | 10.000 | 0,099 [0,083–0,110] | 0,255 [0,251–0,282] | 2,6× | 0,390 [0,378–0,427] |
| Pengukuran Berulang | 100.000 | 1,080 [1,060–1,130] | 2,424 [2,382–2,530] | 2,2× | 2,691 [2,664–2,730] |

\* Median SPSS di bawah 3 *tick* jam Windows (≈ 0,047 detik): rasio di bawah resolusi pengukuran.

### T2. Pengukuran Berulang: faktor teks vs kode angka (detik), median [min–maks]

| n | SPSS, teks | SPSS, kode | Statify komputasi, teks | Statify komputasi, kode | Selisih Statify (teks/kode) | Rasio Statify/SPSS, teks | Rasio, kode |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 0,006 [0,004–0,007] | 0,006 [0,002–0,014] | 0,018 [0,015–0,027] | 0,016 [0,015–0,028] | +12,9% | 3,1× | 2,7× |
| 1.000 | 0,014 [0,012–0,020] | 0,013 [0,008–0,023] | 0,052 [0,049–0,072] | 0,040 [0,037–0,058] | +30,2% | 3,7× | 3,0× |
| 10.000 | 0,095 [0,093–0,120] | 0,099 [0,083–0,110] | 0,382 [0,368–0,408] | 0,255 [0,251–0,282] | +49,5% | 4,0× | 2,6× |
| 50.000 | 0,500 [0,480–0,540] | – | 1,836 [1,801–1,862] | – | – | 3,7× | – |

n = 50.000 hanya ada pada seri teks; n = 100.000 hanya pada seri kode (impor CSV teks gagal di atas ±63.600 baris).

### T3. Build teroptimasi (opt-level = 3, wasm-opt -O3): komputasi saja (detik), median [min–maks]

| Prosedur | n | SPSS | Statify build produksi | Statify build teroptimasi | *Speedup* | Rasio teroptimasi/SPSS |
|---|---:|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 0,006 | 0,021 [0,019–0,028] | 0,005 [0,005–0,006] | 4,1× | 0,8×* |
| One-Way MANOVA | 1.000 | 0,013 | 0,156 [0,152–0,170] | 0,040 [0,039–0,049] | 3,9× | 3,1×* |
| One-Way MANOVA | 10.000 | 0,100 | 1,483 [1,461–1,516] | 0,385 [0,378–0,399] | 3,8× | 3,9× |
| One-Way MANOVA | 100.000 | 1,050 | 14,56 [14,49–14,69] | 4,051 [3,958–4,134] | 3,6× | 3,9× |
| Two-Way MANOVA | 100 | 0,009 | 0,044 [0,041–0,053] | 0,010 [0,010–0,012] | 4,3× | 1,2×* |
| Two-Way MANOVA | 1.000 | 0,018 | 0,346 [0,339–0,368] | 0,088 [0,086–0,093] | 3,9× | 4,8×* |
| Two-Way MANOVA | 10.000 | 0,160 | 3,369 [3,324–3,402] | 0,874 [0,857–0,922] | 3,9× | 5,5× |
| Two-Way MANOVA | 100.000 | 1,855 | 33,22 [33,06–33,45] | 8,892 [8,773–9,438] | 3,7× | 4,8× |
| Pengukuran Berulang | 100 | 0,006 | 0,016 [0,015–0,028] | 0,003 [0,002–0,004] | 6,4× | 0,4×* |
| Pengukuran Berulang | 1.000 | 0,013 | 0,040 [0,037–0,058] | 0,006 [0,005–0,008] | 7,0× | 0,4×* |
| Pengukuran Berulang | 10.000 | 0,099 | 0,255 [0,251–0,282] | 0,036 [0,035–0,042] | 7,0× | 0,4× |
| Pengukuran Berulang | 100.000 | 1,080 | 2,424 [2,382–2,530] | 0,364 [0,354–0,378] | 6,7× | 0,3× |

### T4. Rincian waktu ujung ke ujung Statify (ms, median)

| Prosedur | n | Persiapan data | Serialisasi | Worker | Pemformatan dan penyimpanan | Total | Porsi worker |
|---|---:|---:|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 0,2 | 0,1 | 22,0 | 39,1 | 62,6 | 35,1% |
| One-Way MANOVA | 1.000 | 0,9 | 0,4 | 160,8 | 41,6 | 207,9 | 77,3% |
| One-Way MANOVA | 10.000 | 4,6 | 3,8 | 1.503,2 | 42,0 | 1.564,1 | 96,1% |
| One-Way MANOVA | 100.000 | 51,1 | 53,0 | 14.790,7 | 38,8 | 14.933,2 | 99,0% |
| Two-Way MANOVA | 100 | 0,2 | 0,1 | 46,1 | 47,5 | 93,4 | 49,4% |
| Two-Way MANOVA | 1.000 | 1,1 | 0,5 | 351,5 | 51,6 | 399,3 | 88,0% |
| Two-Way MANOVA | 10.000 | 5,6 | 5,3 | 3.409,7 | 48,3 | 3.479,5 | 98,0% |
| Two-Way MANOVA | 100.000 | 75,8 | 61,9 | 33.665,0 | 48,1 | 33.864,8 | 99,4% |
| Pengukuran Berulang | 100 | 0,2 | 0,1 | 17,6 | 112,8 | 130,0 | 13,5% |
| Pengukuran Berulang | 1.000 | 1,1 | 0,3 | 41,9 | 114,2 | 158,3 | 26,5% |
| Pengukuran Berulang | 10.000 | 6,4 | 3,2 | 262,5 | 117,2 | 390,1 | 67,3% |
| Pengukuran Berulang | 100.000 | 65,7 | 34,8 | 2.481,8 | 103,4 | 2.690,6 | 92,2% |

### T5. Sebaran relatif per sel: IQR/median dan SD/rata-rata (10 run terukur)

| Prosedur | n | SPSS IQR/median | SPSS SD/rata-rata | Statify komputasi IQR/median | Statify komputasi SD/rata-rata |
|---|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 29,2%* | 39,0%* | 13,4% | 12,4% |
| One-Way MANOVA | 1.000 | 23,1%* | 44,8%* | 4,0% | 3,5% |
| One-Way MANOVA | 10.000 | 13,6% | 8,9% | 1,6% | 1,1% |
| One-Way MANOVA | 100.000 | 2,6% | 2,3% | 0,6% | 0,4% |
| Two-Way MANOVA | 100 | 32,4%* | 49,4%* | 10,8% | 8,1% |
| Two-Way MANOVA | 1.000 | 54,0%* | 35,3%* | 3,4% | 2,8% |
| Two-Way MANOVA | 10.000 | 0,0% | 3,6% | 1,1% | 0,8% |
| Two-Way MANOVA | 100.000 | 3,0% | 2,4% | 0,4% | 0,4% |
| Pengukuran Berulang | 100 | 45,8%* | 54,7%* | 16,3% | 22,2% |
| Pengukuran Berulang | 1.000 | 40,7%* | 33,3%* | 19,4% | 16,1% |
| Pengukuran Berulang | 10.000 | 5,1% | 7,2% | 2,5% | 3,5% |
| Pengukuran Berulang | 100.000 | 1,6% | 2,1% | 0,9% | 1,7% |
| Pengukuran Berulang (teks) | 100 | 25,0%* | 16,9%* | 21,5% | 18,5% |
| Pengukuran Berulang (teks) | 1.000 | 28,6%* | 20,4%* | 12,9% | 13,8% |
| Pengukuran Berulang (teks) | 10.000 | 11,8% | 9,4% | 3,2% | 2,9% |
| Pengukuran Berulang (teks) | 50.000 | 2,0% | 3,5% | 1,6% | 1,1% |

\* Median SPSS di bawah resolusi pengukuran; sebaran relatif di sel ini terutama mencerminkan langkah waktu 1–10 ms.

**Uji pengodean faktor (n = 10.000).**

| | Validasi (sesi terpisah, 3 run) | Satu sesi, pola teks–kode–teks–kode (10 run per blok) |
|---|---|---|
| SPSS | −1,0% (One-Way), 0,0% (Two-Way), −14,5% (RM; 16 ms ≈ 1 *tick*) | – |
| Statify komputasi, MANOVA | −1,3%, −1,6% | Teks lebih lambat **+4,3%** (One-Way) dan **+3,5%** (Two-Way) |
| Statify komputasi, RM | Teks lebih lambat 42% (kode −29,8%) | – (lihat T2) |

Data: `results/validasi-teks-vs-kode/perbandingan.csv` dan `results/utama/sesi-sama-mv-teks-vs-kode.csv`.

**Sebaran relatif (T5).** Pada n ≥ 10.000, sebaran Statify komputasi saja kecil: IQR/median 0,4–3,2% dan SD/rata-rata 0,4–3,5%. Sebaran SPSS 0–13,6% (IQR/median), dan nilai tertinggi pada n = 10.000 (0,1–0,16 dtk) sejalan dengan langkah waktu 10 ms. Pada n ≤ 1.000 sebaran relatif besar di kedua perangkat lunak: untuk SPSS sebagai akibat resolusi, untuk Statify sebagai derau tingkat milidetik pada waktu 16–350 ms. Kalau WSearch atau proses Edge yang masih aktif sempat mengganggu, gangguan sesaat akan tampak sebagai pencilan di run tertentu. Pencilan seperti itu tidak ditemukan pada SPSS Elapsed Time maupun Statify komputasi saja (`results/*/spikes.csv`). Pengaruh yang merata ke semua run (pergeseran konstan) tidak dapat dideteksi dengan cara ini.

**Lonjakan.** Sebuah run ditandai melonjak kalau nilai salah satu tahapnya ≥ 2× median run-run lain di sel yang sama dan selisihnya ≥ 100 ms (SPSS: ≥ 3 *tick*). Daftarnya ada di `results/*/spikes.csv`, dan kolom `lonjakan` di `results/*/*-runs-annotated.csv` menandai tahap serta nomor run-nya.
- Satu-satunya lonjakan Statify: `mv1-n100000` **run 2**, tahap pemformatan dan penyimpanan (`post_ms`) 16.111 ms, sedangkan median run lain 39 ms. Ujung ke ujung run itu menjadi 31,09 dtk, padahal median selnya 14,93 dtk. Pola yang sama muncul di pilot, juga pada run 2 (10,6 dtk). Run ini tetap masuk statistik, dan nilai maksimumnya terlihat di T1. Ukuran komputasi saja tidak terpengaruh.
- Penyelidikan singkat (±15 menit, `results/diagnosis-spike/README.md`) mereproduksi lonjakan di run 2 pada dua varian, dengan dan tanpa perekaman payload: 8,9 dtk, 15,4 dtk, dan 15,7 dtk. Run 1 dan run 3 tetap normal. Temuannya:
  - GC di jendela itu ≤ 0,36 dtk dan *heap* JS tidak naik, jadi tekanan memori tidak menjelaskannya;
  - *storage* IndexedDB bertambah 5,6–13,5 MB hanya pada run 2;
  - selama 15,7 dtk, semua *thread* yang terekam hanya sibuk ±3 dtk (main thread 2,3 dtk), jadi aplikasi sedang menunggu operasi asinkron, bukan menghitung.

  **Penyebabnya tidak dapat dipastikan.** Dugaan yang belum diuji: penulisan hasil tertahan oleh pemeliharaan basis data IndexedDB (berisi 100.000 baris) setelah penghapusan hasil yang pertama.
- SPSS: Processor Time `mv2-n1000` run 3, 6, dan 11 = 63 ms (4 *tick*), sedangkan median run lain 16 ms (1 *tick*). Ini kuantisasi jam Windows; Elapsed Time-nya normal.

## 3. Temuan teknis

### 3.1 Batas impor CSV teks (temuan tersendiri)

- **Gejala.** CSV dengan kolom teks lebih dari ±63.600 baris tidak bisa diimpor. Setelah tombol Import diklik, tombol itu tetap nonaktif, tidak ada data yang tersimpan, dan tidak ada pesan galat. Bukti: [pilot/impor-csv-100k-macet-240dtk.png](pilot/impor-csv-100k-macet-240dtk.png) diambil 240 dtk setelah klik; pada pilot impor dihentikan setelah ±10 menit.
- **Sebab.** Di `frontend/public/workers/DataManagement/csvWorker.js` baris 85, lebar kolom teks dihitung dengan `Math.max(8, ...colData.map(v => String(v ?? '').length), …)`. *Spread* ini menjadikan setiap baris satu argumen fungsi, sehingga melampaui batas *call stack* worker dengan galat `RangeError: Maximum call stack size exceeded`. Worker mengirim galat itu, tetapi UI tidak menampilkannya; jalur tampilannya tidak ditelusuri. Kolom angka tidak melewati baris ini, dan kode angka lolos sampai 200.000 baris.
- **Langkah reproduksi.**
  1. `node testing/performance-spss/data/generate.cjs`, lalu jalankan Statify (`cd frontend && npx next build && npx next start -p 3101`).
  2. File → Import → CSV → pilih `testing/performance-spss/data/mv1-n100000.csv` → Continue → Import. Tombol Import tetap nonaktif dan tidak ada data yang masuk.
  3. Untuk ambang angkanya: `node testing/performance-spss/statify/diagnosis/csv-import-limit.cjs http://localhost:3101`. Skrip ini memanggil worker produksi langsung dengan bisection. Hasil 16-10-2026, Chromium 143: kolom teks lolos sampai 63.437 baris dan gagal di 63.788. n = 50.000 lolos dan 100.000 gagal; kode angka lolos di 50.000, 100.000, dan 200.000.
- **Status.** `csvWorker.js` tidak diubah, sesuai instruksi. Perbaikan yang wajar, untuk keputusan Anda: ganti *spread* dengan perulangan atau `reduce`, lalu tampilkan galat worker di dialog impor.

### 3.2 `opt-level = 0` dan `wasm-opt = false` pada GLM Multivariate dan Repeated Measures

- **Asal.** Pola profil ini pertama kali muncul di commit `da1f4eeab` ("Discriminant : Backend", Umar Hadi Pranoto, 12-05-2025). Pola yang sama lalu dipakai Hierarchical Cluster, K-Means, dan GLM. Pada GLM Multivariate, profil ini sudah ada setidaknya sejak commit `722ef70cb` ("Restructure", Umar Hadi Pranoto, 24-06-2025). Riwayat cabang saat ini baru dimulai dari unggahan massal `1900d375a` (29-11-2025), sehingga *blame* menunjuk ke sana. Satu-satunya perubahan sesudahnya, `cc96f24c` (22-09-2026), hanya menambah `indexmap` dan baris baru di akhir berkas.
- **Alasan.** Tidak ada komentar di `Cargo.toml` maupun pesan commit yang menjelaskannya. Modul lain kemudian mengaktifkan optimasi:
  - Univariate mengomentari ketiga baris itu di commit "Optimization" `ee88f7453` dan `d384544b7` (Umar Hadi Pranoto, Juli 2025); K-Means juga dalam keadaan dikomentari (tercatat sejak unggahan `1900d375a`);
  - beberapa modul Classify (Naive Bayes, Nearest Neighbor, Discriminant, Apply Model) memakai `opt-level = 3` dan `wasm-opt = ["-O3"]`.

  Dugaan (tidak terdokumentasi): pengaturan ini disalin dari templat pengembangan, untuk kompilasi yang lebih cepat dan *debugging*, lalu tidak pernah dikembalikan untuk Multivariate dan Repeated Measures.
- **Dampak (fase 3, analisis penyebab).** Build eksperimen dengan `opt-level = 3` dan `wasm-opt -O3` (ditambah `-g`, hanya agar *name section* tetap ada untuk profil) dibuat di worktree terpisah dengan `--locked`:
  - ukuran WASM turun dari 2,6 MB ke 0,88 MB (MANOVA) dan dari 4,8 MB ke 1,84 MB (RM);
  - komputasi 3,6–4,3× lebih cepat (MANOVA) dan 6,4–7,0× (RM) (T3);
  - nilai RM identik bit per bit di semua 507 nilai numerik; nilai MANOVA identik kecuali statistik Levene, dengan selisih ≤ 7,3 × 10⁻¹¹ (`results/opt/numeric-diff-opt.csv`);
  - Wilks terhadap SPSS: 104/104 lolos.

  Produksi tidak diubah. Angka utama laporan tetap build produksi; fase 3 hanya menunjukkan seberapa besar selisih terhadap SPSS yang berasal dari pengaturan kompilasi. Klaim "RM lebih cepat daripada SPSS" hanya berlaku untuk build teroptimasi dan waktu komputasi saja; waktu ujung ke ujung build teroptimasi tidak diukur.

### 3.3 Biaya pengodean faktor teks: `DataValue` *untagged*

- **Mekanisme.** `models/data.rs` di kedua modul mendefinisikan `#[serde(untagged)] enum DataValue { Number(f64), Text(String), … }`. Setiap nilai pertama-tama dicoba dibaca sebagai `f64`. Untuk teks seperti "G1" percobaan itu gagal, dan `serde_wasm_bindgen` membuat satu objek `Error` JavaScript lewat `__wbg_Error` sebelum mencoba `Text`. Biayanya per sel bernilai teks, sehingga naik linear dengan n.
- **RM n = 10.000.** `__wbg_Error` = 127 ms dari 424 ms (30%) waktu worker. Pada data kode, pemanggilan ini tidak muncul sama sekali (`results/validasi-teks-vs-kode/profil-rm-n10000-*.csv`).
- **MANOVA tidak terbebas, hanya porsinya kecil.** Jalur deserialisasinya sama. Pada n = 10.000, profil teks menunjukkan `__wbg_Error` 110 ms (One-Way, 6,5%) dan 225 ms (Two-Way, dua faktor, 6,1%). Tahap pembacaan input naik dari 120 ke 257 ms dan dari 157 ke 413 ms. Pengukuran satu sesi tanpa profiler: +4,3% dan +3,5%. Porsinya kecil karena komputasi MANOVA 6–13× lebih berat daripada RM pada n = 10.000, sehingga biaya yang sama besarnya tertutup.
- **Klaim yang bisa dipertahankan.** "Pengodean faktor tidak memengaruhi waktu" hanya berlaku untuk SPSS: selisihnya tidak terdeteksi, paling besar 1 *tick*. Untuk MANOVA pengaruhnya kecil (3,5–4,3%, di bawah ambang 5%). Untuk RM pengaruhnya besar, dan rasio dengan kode angka adalah batas bawah (T2).

### 3.4 Ke mana waktu worker MANOVA pergi (profil DevTools, n = 10.000)

Profil direkam pada satu run tambahan di luar 11 run terukur. Berkasnya di `statify/utama-compute/profiles/*.json` dan `statify/opt-compute/profiles/*.json`, dan bisa dibuka di Chrome DevTools → Performance. Ringkasannya dibuat dengan `statify/profile-summary.py` dan disimpan di `results/utama/profil-*.csv` serta `results/opt/profil-*.csv`.

**Tahap tingkat teratas, build produksi.** Setiap sampel dihitung ke fungsi `calculate_*` terluar, sehingga porsinya saling lepas dan berjumlah 100%. Baris bertanda tebal adalah kerja yang tidak diminta SPSS.

| Tahap | One-Way | Two-Way |
|---|---:|---:|
| ***Homogeneous subsets*** (post hoc, tidak diminta) | 27,5% | 34,5% |
| Levene | 13,7% | 13,6% |
| **Data plot** (`generate_plots`) | 13,1% | 4,6% |
| Uji multivariat | 12,3% | 14,4% |
| *Between-subjects effects* | 11,8% | 16,6% |
| Pembacaan input dan *setup* | 7,8% | 4,4% |
| **Uji univariat** | 7,0% | 6,6% |
| Statistik deskriptif | 3,6% | 3,3% |
| Box's M | 2,0% | 1,3% |
| **Bartlett** | 1,3% | 0,6% |
| **Total kerja yang tidak diminta** | **48,9%** | **46,3%** |

**Menurut jenis fungsi (*self time*, perkiraan berdasarkan nama fungsi; `results/opt/profil-kategori-self-time.csv`).**

| Jenis fungsi | Produksi | Teroptimasi |
|---|---:|---:|
| *Hashing* dan HashMap (SipHash, hashbrown) | 53–55% | 36% |
| `merge_records` | 11–13% | 10–12% |
| Alokasi memori | 9–12% | 17–20% |
| Format angka→teks | 2–3% | 10–14% |
| Aljabar matriks (nalgebra) | 5% | < 1% |

Waktu didominasi oleh cara data disimpan, yaitu per baris sebagai HashMap berkunci teks, bukan oleh aljabar matriks. Pada build teroptimasi, fungsi `calculate_*` di-*inline* sehingga tahapnya tidak bisa dipisahkan lagi; *self time* menunjukkan pola yang sama.

### 3.5 Lain-lain

- **Afinitas.** Proses GPU Chromium tidak mewarisi afinitas induknya (0xFFFFF di bawah pohon 0xFFF). Runner memasang ulang afinitas seluruh pohon proses di awal setiap sel.
- **Determinisme.** Hasil RM identik di semua run. Hasil MANOVA berbeda antar-run hanya pada statistik Levene, ≤ 1,1 × 10⁻¹³, akibat urutan iterasi HashMap Rust di WASM yang berubah tiap run. Urutan hash per run identik antara fase 1 dan fase 2 (`results/*/determinism.csv`).
- **Impor CSV** (tidak dihitung): 1,8–2,9 dtk untuk n ≤ 10.000, 10,2 dtk untuk 50.000 (teks), dan 14,6–23,8 dtk untuk 100.000 (kode).

### 3.6 Dasar saran (tidak dikerjakan dalam uji ini)

Saran berikut berasal dari analisis penyebab di atas. Urutannya berdasarkan dampak yang terukur.
1. Aktifkan optimasi kompilasi untuk modul WASM Multivariate dan Repeated Measures (`opt-level = 3`, `wasm-opt`). Efek terukur di fase 3: 3,6–7,0× lebih cepat tanpa perubahan hasil yang berarti. Sebelum diterapkan, suite uji perlu dijalankan ulang di build tersebut.
2. Jangan menghitung keluaran yang tidak diminta di MANOVA, terutama *homogeneous subsets* tanpa post hoc, data plot tanpa plot, dan uji univariat; porsinya 46–49% waktu worker.
3. Kurangi biaya struktur data per baris (HashMap berkunci teks, `merge_records`), yang mendominasi waktu di kedua build.
4. Perbaiki impor CSV teks (§3.1) dan tampilkan galat worker di dialog impor.
5. Baca nilai faktor teks tanpa jalur galat `DataValue` *untagged* (§3.3), terutama untuk RM.

## 4. Draf teks skripsi

Catatan pemindahan ke Word: kata yang diapit tanda bintang (*…*) adalah istilah asing dan dicetak miring.

### 4a. Bab III, subbab evaluasi: metode uji performa

Uji performa membandingkan waktu komputasi modul GLM Multivariate dan GLM *Repeated Measures* pada Statify dengan IBM SPSS Statistics 27. Prosedur yang diuji adalah *One-Way* MANOVA, *Two-Way* MANOVA, dan pengukuran berulang dengan satu faktor *within* dan satu faktor *between*. Data dibangkitkan secara deterministik untuk ukuran 100, 1.000, 10.000, dan 100.000 kasus. Berkas CSV yang sama dipakai oleh kedua perangkat lunak, dengan opsi analisis yang sama. Faktor ditulis sebagai kode angka karena impor CSV Statify tidak dapat memuat kolom teks di atas sekitar 63.600 baris. Sebagai pelengkap, pengukuran berulang juga diuji dengan faktor teks hingga 50.000 kasus.

Waktu SPSS diambil dari *Elapsed Time* pada tabel Notes yang dikeluarkan melalui OMS. Waktu Statify yang dibandingkan adalah waktu komputasi saja, yaitu waktu eksekusi WASM di dalam Web Worker untuk *payload* yang sama dengan yang dikirim antarmuka. Waktu ujung ke ujung, dari awal hingga akhir analisis di antarmuka, dilaporkan terpisah sebagai informasi tambahan dan tidak dirasiokan terhadap SPSS. Setiap sel diukur dengan satu run pemanasan dan sepuluh run terukur. Blok SPSS dan Statify dijalankan bergantian per ukuran data, dengan jeda pendinginan dua menit, pada laptop yang sama dan pada *core* performa yang sama. Kesetaraan hasil diperiksa melalui Wilks' Lambda (nilai, F, dan Sig.) dengan toleransi 0,001. Hasil diringkas dengan median, kuartil, minimum, maksimum, dan rasio median. Median SPSS di bawah sekitar 0,047 detik dinyatakan berada di bawah resolusi pengukuran.

### 4b. Bab V: hasil uji performa

Pada semua sel, hasil Wilks' Lambda Statify sama dengan SPSS dalam toleransi 0,001, sehingga waktu yang dibandingkan berasal dari perhitungan yang setara. Waktu komputasi Statify lebih lama daripada SPSS pada semua ukuran data (Tabel V.x). Pada 100.000 kasus, *One-Way* MANOVA membutuhkan 14,56 detik di Statify dan 1,05 detik di SPSS (13,9 kali). *Two-Way* MANOVA membutuhkan 33,22 detik dan 1,86 detik (17,9 kali). Pengukuran berulang membutuhkan 2,42 detik dan 1,08 detik (2,2 kali). Pada 100 dan 1.000 kasus, waktu SPSS berada di bawah resolusi pengukuran, sehingga rasionya hanya bersifat indikatif.

Hampir seluruh waktu Statify dihabiskan di dalam Web Worker, yaitu 92–99% dari waktu ujung ke ujung pada 100.000 kasus. Analisis penyebab menemukan dua faktor. Pertama, modul WASM GLM pada build produksi dikompilasi tanpa optimasi. Pada build eksperimen yang dikompilasi dengan optimasi, waktu komputasi MANOVA 3,6–4,3 kali lebih singkat dan pengukuran berulang 6,4–7,0 kali lebih singkat, tanpa perubahan hasil yang berarti. Pada build eksperimen tersebut, waktu komputasi pengukuran berulang lebih singkat daripada SPSS, sedangkan MANOVA masih 3,9–5,5 kali lebih lama. Hasil ini menjadi dasar saran dan bukan bagian dari perbandingan utama. Kedua, MANOVA Statify juga menghitung keluaran yang tidak diminta, terutama *homogeneous subsets*, data plot, dan uji univariat, yaitu sekitar 46–49% waktu worker pada 10.000 kasus. Rasio pengukuran berulang dengan faktor kode angka merupakan batas bawah, karena data berfaktor teks 13–50% lebih lambat.

**Tabel V.x Waktu komputasi (detik, median dari 10 run terukur)**

| Prosedur | n | SPSS | Statify (komputasi saja) | Rasio |
|---|---:|---:|---:|---:|
| *One-Way* MANOVA | 100 | 0,006 | 0,021 | 3,5\* |
| | 1.000 | 0,013 | 0,156 | 12,0\* |
| | 10.000 | 0,100 | 1,483 | 14,9 |
| | 100.000 | 1,050 | 14,562 | 13,9 |
| *Two-Way* MANOVA | 100 | 0,009 | 0,044 | 5,1\* |
| | 1.000 | 0,018 | 0,346 | 18,7\* |
| | 10.000 | 0,160 | 3,369 | 21,1 |
| | 100.000 | 1,855 | 33,222 | 17,9 |
| Pengukuran berulang | 100 | 0,006 | 0,016 | 2,7\* |
| | 1.000 | 0,013 | 0,040 | 3,0\* |
| | 10.000 | 0,099 | 0,255 | 2,6 |
| | 100.000 | 1,080 | 2,424 | 2,2 |

\* Median SPSS di bawah resolusi pengukuran (≈ 0,047 detik).

### 4c. Keterbatasan pengukuran

1. Resolusi waktu SPSS terbatas. Pada 100 dan 1.000 kasus, median SPSS berada di bawah tiga *tick* jam Windows, sehingga rasio pada ukuran tersebut hanya indikatif.
2. Cakupan waktu kedua perangkat lunak tidak identik. *Elapsed Time* SPSS mencakup pembentukan tabel di dalam prosedur. Waktu komputasi Statify mencakup pembentukan objek hasil di WASM, tetapi tidak mencakup pemformatan tabel di antarmuka.
3. Keluaran kedua perangkat lunak tidak sepenuhnya setara. MANOVA Statify menghitung *homogeneous subsets*, data plot, uji univariat, dan uji Bartlett walaupun tidak ditampilkan; porsinya sekitar 46–49% waktu worker pada 10.000 kasus. Pengukuran berulang Statify menampilkan empat tabel *Univariate Tests* tambahan dan memecah *Descriptive Statistics* menjadi empat tabel, tetapi tidak menampilkan tabel *Between-Subjects Factors*.
4. Faktor dikodekan sebagai angka. Untuk pengukuran berulang, data berfaktor teks 13–50% lebih lambat, sehingga rasionya merupakan batas bawah. Untuk MANOVA selisihnya 3,5–4,3%. Data teks di atas sekitar 63.600 baris tidak dapat diimpor.
5. Statify diukur dengan build produksi yang dikompilasi tanpa optimasi. Build teroptimasi hanya diukur untuk waktu komputasi saja, sebagai analisis penyebab, dan belum menjadi bagian dari produk. Suite uji belum dijalankan pada build tersebut.
6. Pengukuran dilakukan pada satu laptop, satu sistem operasi, dan satu peramban (Chromium 143 *headless* melalui Playwright), dengan afinitas pada *core* performa. Hasil dapat berbeda pada perangkat atau peramban lain.
7. Sepuluh run per sel merupakan pengulangan pengukuran, bukan sampel dari populasi. Karena itu tidak dilakukan uji inferensial.
8. Layanan latar dijeda secara manual. Pada rekaman setelah pengukuran, layanan pengindeksan Windows dan beberapa proses Edge masih aktif, dan VS Code tetap terbuka. Sebaran relatif pada 10.000 dan 100.000 kasus kecil (IQR/median Statify ≤ 3,2%, SPSS ≤ 13,6%) dan tidak ada pencilan pada waktu komputasi. Gangguan sesaat karena itu tidak terlihat, tetapi pengaruh yang merata ke semua run tidak dapat disingkirkan.
9. Satu run ujung ke ujung *One-Way* MANOVA 100.000 kasus (selalu run kedua) mengalami lonjakan 16 detik pada tahap pemformatan dan penyimpanan hasil. Penyebabnya tidak dapat dipastikan: GC dan tekanan memori tidak menjelaskannya, dan aplikasi tampak menunggu operasi asinkron. Run tersebut tetap dimasukkan ke dalam statistik; median tidak terpengaruh, tetapi nilai maksimumnya ikut dilaporkan.
