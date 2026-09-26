# Ringkasan pengujian responsivitas: main thread vs Web Worker (bahan BAB V)

Sumber: `frontend/components/Modals/Analyze/general-linear-model/result_compare.md` §11–§12 (angka disalin dari dokumen itu). Data mentah:
- MV: `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore/`;
- RM: `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/`.

## 1. Rancangan

| Aspek | Nilai |
|---|---|
| Rancangan | Eksperimen A/B dalam subjek. Mode A: komputasi WASM di main thread. Mode B: komputasi WASM di Web Worker. |
| Alur per run | UI aplikasi asli (build produksi): impor CSV, isi dialog GLM, klik OK. Jendela pengukuran dari klik OK sampai `performance.mark("glm-analysis-end")`. |
| Sel | MV: n = 100, 500, 1000, 2000 kasus (5 DV, 3 faktor 4 × 3 × 2). RM: n = 5000, 10000, 20000, 40000 subjek (faktor within `time` 10 level, 1 measure; Descriptive statistics, Estimates of effect size, Observed power). |
| Urutan run | Per sel satu halaman baru; A dan B bergantian sampai 31 run per mode. Pasangan pertama = startup (dilaporkan terpisah); 30 run per mode = steady-state. |
| Perangkat | Intel Core i7-12700H (20 logical core), RAM 23,6 GB, Windows 11 Home Single Language 10.0.26200; Chromium 143.0.7499.4 (Playwright 1.57.0, headless); Node.js v20.19.0; Next.js 15.5.9 (`next build` + `next start`). |
| Kondisi CPU | CPU 1× (tanpa throttling). Server, Node, dan Chromium di-pin ke P-core (`run-detached.ps1 -Affinity FFF`); mode daya Windows *Best performance*. |
| Waktu dan build | MV: 2026-09-23 22:30–23:34 WIB, build `omPbTrx0Tb3XkYhgNYbYW` (kode `ab21928c`). RM: 2026-09-23 00:09–00:48 WIB, build `MHninJmEe45iPpG1SPYZ3` (kode `182b6f05`). |
| Kualitas data | MV: 248 run, 0 dibuang, 4 tabel dan 0 pesan Errors Logs di semua run. RM: 248 run, 0 dibuang, 17 tabel dan 0 pesan Errors Logs di semua run. Mode aktual sesuai di semua run. |

## 2. Metrik

| Metrik | Definisi |
|---|---|
| Long task terpanjang | Long task (Long Tasks API) terlama yang tumpang tindih dengan jendela; 0 bila tidak ada. Metrik utama. |
| LoAF terpanjang | Long Animation Frame terlama di jendela (metrik tambahan). |
| Jeda frame terpanjang | Selisih terbesar antar callback `requestAnimationFrame`. |
| Total blocking | Σ(durasi − 50 ms) semua long task di jendela. |
| Waktu total | Dari klik OK sampai mark akhir. |

## 3. Analisis dan kriteria

- **Uji beda:** Mann–Whitney U satu arah, H₁: B < A (long task terpanjang), α = 0,05: `scipy.stats.mannwhitneyu(B, A, alternative="less")`, pendekatan normal dengan koreksi ties dan kontinuitas.
- **Ukuran efek:** Vargha–Delaney Â₁₂ = P(A > B) + 0,5·P(A = B).
- **Kriteria (a):** p < 0,05 dan Â₁₂ ≥ 0,71.
- **Kriteria (b):** median long task terpanjang mode B < 100 ms di semua ukuran, dan tidak ada long task yang bersumber dari WASM.
- Kolom keputusan di dokumen sumber tidak diisi; ringkasan ini hanya memuat angka.

## 4. Hasil 8 sel final (steady-state, n = 30 per mode)

| Modul | n data | Median long task A (ms) | Median long task B (ms) | Median LoAF A (ms) | Median LoAF B (ms) | U (B) | p satu arah | Â₁₂ |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 141,5 | 0,0 | 146,2 | 0,0 | 0,0 | 5,56·10⁻¹³ | 1,000 |
| Multivariate | 500 | 611,0 | 0,0 | 616,6 | 0,0 | 0,0 | 5,88·10⁻¹³ | 1,000 |
| Multivariate | 1000 | 1.239,5 | 0,0 | 1.244,3 | 0,0 | 0,0 | 5,96·10⁻¹³ | 1,000 |
| Multivariate | 2000 | 2.403,5 | 0,0 | 2.408,9 | 0,0 | 0,0 | 6,02·10⁻¹³ | 1,000 |
| Repeated Measures | 5000 | 147,0 | 0,0 | 148,4 | 0,0 | 0,0 | 5,98·10⁻¹³ | 1,000 |
| Repeated Measures | 10000 | 284,0 | 0,0 | 285,1 | 0,0 | 0,0 | 6,03·10⁻¹³ | 1,000 |
| Repeated Measures | 20000 | 547,5 | 0,0 | 548,2 | 0,0 | 0,0 | 8,56·10⁻¹³ | 1,000 |
| Repeated Measures | 40000 | 987,5 | 80,0 | 988,2 | 80,9 | 0,0 | 1,49·10⁻¹¹ | 1,000 |

- **Kriteria (a):** kedelapan sel memenuhi secara angka (p ≤ 1,49·10⁻¹¹, Â₁₂ = 1,000).
- **Kriteria (b):**
  - median mode B < 100 ms di kedelapan sel;
  - RM-40000: maks mode B 118 ms, dan 6 dari 30 run ≥ 100 ms;
  - MV: maks mode B 0,0 ms di keempat sel.
- **Sumber long task:** 0 run (A maupun B) punya skrip yang teratribusi ke chunk glue WASM GLM atau chunk service GLM. Frame mode B pada RM-40000 (30 run) dan RM-20000 (2 run) teratribusi ke `IDBRequest.onsuccess` (penyimpanan hasil). Atribusi LoAF terbatas pada titik masuk skrip.
- **Waktu total (median, ms):**
  - MV: A 170,4 / 643,9 / 1.278,4 / 2.444,3; B 192,2 / 663,3 / 1.277,2 / 2.429,6;
  - RM: A 267,1 / 404,9 / 674,2 / 1.095,7; B 290,4 / 417,2 / 730,1 / 1.160,3.

## 5. Catatan

1. **Pengaruh kode dan pin tidak dapat dipisahkan.** Terhadap sel MV eksperimen kedua (kode `82a63b45`, tanpa pin), kode MV yang diperbaiki dan pin P-core berubah bersamaan. Median long task mode A turun 2,5× (n = 100) sampai 36,5× (n = 2000). Perbandingan A vs B di dalam sel final tidak terpengaruh, karena A dan B berselang-seling pada kode dan kondisi yang sama.
2. **Tanpa pin P-core**, run RM mengalami episode perlambatan ~1,7–2× di kedua mode. Pada run tanpa pin, median long task mode B RM-40000 = 111,5 ms. Run itu bukan hasil final.
3. **Keterbatasan lingkungan:** satu mesin, Chromium, CPU 1×. Throttling CPU CDP tidak memperlambat worker, sehingga kondisi 4× tidak dijalankan.

## 6. Konsistensi build

Eksperimen dijalankan pada build 2026-09-23. Sesudah itu kode berubah di v3, v4, v5, dan final. Untuk memeriksa bahwa beban yang diukur masih mewakili build final (`IdywReo5MTivt50HHa3VO`; build `OrpyJfBOluV37xa0aqmFr` sesudahnya hanya mengubah teks tampilan, dengan WASM, payload, dan respons worker identik), 8 sel eksperimen dijalankan ulang lewat dialog asli build final dengan konfigurasi dialog yang sama, dan payload serta respons worker ditangkap. Hasilnya di `testing/final/iterasi4/regresi/`.

| Pemeriksaan | Hasil |
|---|---|
| Payload worker (data dan konfigurasi yang dikirim ke WASM) | Identik byte di 8/8 sel untuk v1 (build eksperimen), v2, v3, v4, v5, dan final |
| Respons worker RM (4 sel) | Identik byte v1 = final |
| Respons worker MV (4 sel) | v1 vs final hanya berbeda pada tiga kolom Wilks' Lambda: Sig., Noncent. Parameter, dan Observed Power. Totalnya 34 nilai, misalnya multivariate-100 F1: Sig. 9,149637·10⁻⁵ → 9,141166·10⁻⁵, Noncent. 48,167 → 43,928. Sig. berubah karena df2 Rao pecahan tidak lagi dibulatkan (v5). Noncent. Parameter dan Observed Power berubah karena noncentrality kini dihitung seperti SPSS untuk efek dengan df hipotesis ≥ 3 (final). |

Tidak ada perubahan pada data, konfigurasi, atau langkah komputasi yang dijalankan. Perubahan di atas hanya mengganti rumus beberapa angka di dalam langkah yang sama, dan uji khi-kuadrat Σ diketahui serta selang simultan hanya dihitung bila diminta (tidak dipakai di sel eksperimen). Pengaruhnya terhadap waktu komputasi tidak diukur ulang. Rincian: `experiment-output-check.txt` dan `experiment-response-diff-v1-final.txt`.
