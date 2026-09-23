# Hasil Eksperimen A/B: Main Thread vs Web Worker

> **Tanggal eksperimen:** 2026-09-22, 03:23–06:28 WIB · **Rancangan:** [compare_web_workers.md §4](compare_web_workers.md)
> **Skrip dan data mentah:** [testing/glm-web-worker/](../../../../../testing/glm-web-worker/README.md)

Dokumen ini merangkum eksperimen perbandingan **mode A** (perhitungan WASM di main thread) dan **mode B** (perhitungan WASM di Web Worker) untuk GLM Multivariate dan GLM Repeated Measures.

Angka disajikan apa adanya. Dokumen ini **tidak** menyimpulkan apakah tujuan penelitian tercapai. Kolom keputusan pada tabel §4.6 sengaja dibiarkan kosong, dan bagian 6 hanya memuat nilai-nilai yang relevan dengan kriteria §4.5.

---

## 1. Lingkungan

| Komponen | Nilai |
|---|---|
| Mesin | Intel Core i7-12700H (20 *logical core*), RAM 23,6 GB |
| Sistem operasi | Windows 11 Home Single Language (build 10.0.26200) |
| Browser | Chromium 143.0.7499.4 (bawaan Playwright, *headless*) |
| Node.js / Playwright / Next.js | v20.19.0 / 1.57.0 / 15.5.9 |
| Build | Produksi (`next build` lalu `next start`) |
| Kode yang diuji | HEAD `3836f94c` ditambah perubahan yang belum di-commit, termasuk `free()` di jalur main. Hash isi setiap berkas tercatat di `environment-*.json`. |
| Statistik | Python 3.11.0, NumPy 2.0.2, SciPy 1.14.1 |

---

## 2. Desain yang dijalankan

**Alur per run.** Eksperimen menjalankan **UI aplikasi yang asli**, bukan harness:

1. Impor CSV.
2. Buka dialog GLM dan isi variabel.
3. Klik OK.

Jendela pengukuran dimulai saat klik OK (dicatat di fase *capture* halaman) dan berakhir pada `performance.mark("glm-analysis-end")`.

**Sel dan urutan run.**

| Aspek | Pengaturan |
|---|---|
| Modul | Multivariate, Repeated Measures |
| Ukuran data | 100, 500, 1000, 2000 kasus (Multivariate) / subjek (Repeated Measures) |
| CPU | 1× |
| Per sel (modul × ukuran) | Satu *context* dan halaman baru, lalu run bergantian A, B, A, B, … sampai masing-masing mode mendapat 31 run |
| Startup vs steady-state | Pasangan pertama dilaporkan terpisah sebagai **startup** (mencakup inisialisasi WASM di main thread untuk A dan pembuatan worker untuk B). Sisanya, 30 run per mode, adalah data **steady-state**. |

**Metrik per run.**

| Metrik | Definisi |
|---|---|
| Long task terpanjang | Long task terlama yang tumpang tindih dengan jendela (0 bila tidak ada) |
| Total blocking | Σ(durasi − 50 ms) dari semua long task di jendela |
| Jeda frame terpanjang | Selisih terbesar antar callback `requestAnimationFrame` |
| Waktu total | Dari klik OK sampai *mark* akhir |
| Mode aktual | Dari `detail.mode` pada *mark* akhir |

**Analisis.**
- Deskriptif: median dan IQR (`numpy.percentile`, interpolasi linear), serta mean dengan CI 95% (z, karena n = 30).
- Uji beda: Mann–Whitney U satu arah (H₁: B < A), memakai `scipy.stats.mannwhitneyu(B, A, alternative="less")`. Karena ada *ties*, SciPy memakai pendekatan normal dengan koreksi *ties* dan koreksi kontinuitas.
- Effect size: Vargha–Delaney Â₁₂ = P(A > B) + 0,5·P(A = B).

### Keputusan yang diambil dari pilot

Pilot dijalankan lebih dulu, dan hasilnya tersimpan di `results/experiment-pilot-*` dan `results/experiment-inspect*`. Keputusan berikut diambil sebelum eksperimen penuh:

1. **Dataset Multivariate tidak memakai generator test Jest.** Di generator itu, `F3 = i mod 2` sepenuhnya ditentukan oleh `F1 = i mod 4`. Akibatnya hanya 12 dari 24 sel yang terisi, dan model *full factorial* bawaan dialog gagal dengan *"Matrix is singular"*.
   - Generator eksperimen memakai 5 DV dengan 3 faktor (4 × 3 × 2) yang tersilang dan seimbang.
   - Nilainya terdiri atas efek sel, *noise* bersama, dan *noise* per DV dari PRNG ber-*seed* tetap.
2. **Repeated Measures memakai desain within-subject saja** (faktor `time`, 5 level, measure `score`). Dengan faktor between `group`, dua masalah muncul:
   - setiap run mencatat error *"Empty matrices provided for multiplication"*;
   - tabel between-subjects berubah setelah run pertama.

   Keduanya adalah perilaku aplikasi di luar cakupan penelitian ini.
3. **Opsi dialog lainnya memakai nilai bawaan.**
4. **CPU 4× tidak dijalankan**, karena dua alasan:
   - Throttling CDP `Emulation.setCPUThrottlingRate` di Chromium 143 **hanya memperlambat main thread, tidak worker**, sehingga kondisi 4× bias menguntungkan mode B. Buktinya dari MV-500 steady:

     | | A | B |
     |---|---|---|
     | 1× | 5.882 ms | 6.030 ms |
     | 4× | 29.733 ms | 6.887 ms |

   - Perkiraan waktunya 7–9 jam tambahan.
5. **Setiap run memeriksa keluaran analisisnya** di IndexedDB setelah metrik dikumpulkan (di luar jendela pengukuran): jumlah baris data, jumlah tabel, dan isi tabel "Errors Logs".

---

## 3. Kualitas data

| Pemeriksaan | Hasil |
|---|---|
| Jumlah run | **496** (8 sel × 62): per mode per sel, 1 startup + 30 steady-state |
| Run dibuang (error atau mode tidak sesuai) | **0** |
| Run yang jatuh ke `main-fallback` | **0** |
| Error tercatat di tabel "Errors Logs" keluaran | **0** |
| Baris data terbaca = ukuran sel | Ya, di semua run |
| Konsol halaman | Hanya peringatan yang tidak berbahaya (CSS *preload*, *upgrade* IndexedDB, "DataTable slow update") |

---

## 4. Hasil steady-state

### 4.1 Ringkasan metrik (median [IQR], n = 30 per sel, CPU 1×)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) |
|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 415,5 [355,2–549,0] | 738,0 [449,8–908,8] | 408,3 [337,5–533,3] | 1.453,7 [982,6–1.867,1] |
| Multivariate | 100 | B | 407,5 [224,2–602,8] | 419,0 [183,5–686,0] | 391,6 [220,8–591,6] | 1.354,2 [965,0–1.792,0] |
| Multivariate | 500 | A | 5.930,0 [5.837,5–6.013,2] | 6.339,5 [6.147,0–6.579,8] | 5.924,8 [5.824,8–5.999,8] | 7.042,9 [6.684,7–7.564,9] |
| Multivariate | 500 | B | 399,0 [245,8–624,0] | 450,0 [221,5–790,2] | 391,6 [233,3–608,3] | 7.080,4 [6.693,0–7.513,3] |
| Multivariate | 1000 | A | 21.722,5 [21.617,8–22.111,8] | 22.085,5 [21.797,0–22.750,2] | 21.707,5 [21.603,3–22.086,6] | 22.814,6 [22.278,3–23.478,0] |
| Multivariate | 1000 | B | 412,5 [234,8–590,5] | 453,5 [193,8–787,8] | 416,6 [229,2–579,1] | 22.941,5 [22.453,1–23.385,0] |
| Multivariate | 2000 | A | 85.918,0 [84.128,0–86.547,0] | 86.426,5 [84.378,2–87.167,5] | 85.913,2 [84.109,1–86.525,7] | 86.819,4 [85.185,1–87.896,9] |
| Multivariate | 2000 | B | 398,0 [245,0–593,8] | 461,0 [202,0–825,5] | 400,0 [233,3–591,6] | 86.774,3 [85.950,2–87.209,9] |
| Repeated Measures | 100 | A | 200,5 [81,8–383,5] | 156,5 [31,8–376,0] | 300,0 [116,7–545,8] | 877,6 [466,2–1.263,0] |
| Repeated Measures | 100 | B | 192,0 [88,8–379,8] | 149,5 [38,8–360,5] | 283,3 [137,5–541,6] | 789,7 [459,0–1.207,6] |
| Repeated Measures | 500 | A | 186,0 [76,8–379,2] | 155,5 [26,8–374,5] | 258,4 [108,3–512,5] | 787,0 [468,1–1.240,5] |
| Repeated Measures | 500 | B | 188,5 [81,0–428,0] | 153,5 [31,0–418,5] | 275,0 [120,9–591,6] | 818,2 [496,2–1.177,8] |
| Repeated Measures | 1000 | A | 196,5 [83,8–378,5] | 163,0 [33,8–384,2] | 291,6 [120,9–525,0] | 787,5 [491,8–1.190,8] |
| Repeated Measures | 1000 | B | 192,5 [82,0–363,2] | 145,0 [32,0–341,5] | 283,4 [120,9–512,5] | 784,9 [492,3–1.180,0] |
| Repeated Measures | 2000 | A | 177,0 [76,0–362,8] | 141,0 [26,0–365,2] | 266,6 [91,7–525,0] | 799,0 [489,6–1.203,9] |
| Repeated Measures | 2000 | B | 190,5 [81,2–379,2] | 146,0 [31,2–359,5] | 275,0 [125,0–516,6] | 798,2 [491,1–1.210,9] |

### 4.2 Long task terpanjang: mean (CI 95%), ms

| Modul | n data | Mode A | Mode B |
|---|---|---|---|
| Multivariate | 100 | 471,1 (421,1–521,0) | 413,4 (329,6–497,1) |
| Multivariate | 500 | 5.928,7 (5.886,1–5.971,2) | 405,4 (328,0–482,8) |
| Multivariate | 1000 | 21.856,1 (21.735,6–21.976,6) | 411,8 (332,8–490,8) |
| Multivariate | 2000 | 85.575,2 (85.039,7–86.110,6) | 409,2 (328,6–489,8) |
| Repeated Measures | 100 | 266,4 (167,8–365,0) | 241,7 (176,5–307,0) |
| Repeated Measures | 500 | 245,0 (165,5–324,6) | 259,5 (179,5–339,5) |
| Repeated Measures | 1000 | 248,7 (168,5–328,9) | 241,6 (170,9–312,2) |
| Repeated Measures | 2000 | 256,9 (160,8–353,1) | 241,1 (172,1–310,1) |

Mean dan CI untuk metrik lainnya ada di [analysis/tables.md](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1/analysis/tables.md).

### 4.3 Uji statistik (long task terpanjang, H₁: B < A, α = 0,05)

| Modul | n data | CPU | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | 30 / 30 | 389,5 | 0,1875 | 0,567 | tidak diisi | tidak diisi |
| Multivariate | 500 | 1× | 30 / 30 | 0,0 | 1,51·10⁻¹¹ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 1000 | 1× | 30 / 30 | 0,0 | 1,51·10⁻¹¹ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 2000 | 1× | 30 / 30 | 0,0 | 1,51·10⁻¹¹ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 100 | 1× | 30 / 30 | 453,0 | 0,5207 | 0,497 | tidak diisi | tidak diisi |
| Repeated Measures | 500 | 1× | 30 / 30 | 466,0 | 0,5965 | 0,482 | tidak diisi | tidak diisi |
| Repeated Measures | 1000 | 1× | 30 / 30 | 453,0 | 0,5207 | 0,497 | tidak diisi | tidak diisi |
| Repeated Measures | 2000 | 1× | 30 / 30 | 460,0 | 0,5618 | 0,489 | tidak diisi | tidak diisi |

---

## 5. Run startup (pasangan pertama, n = 1 per mode)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) |
|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 207,0 | 157,0 | 416,6 | 774,2 |
| Multivariate | 100 | B | 0,0 | 0,0 | 16,7 | 473,8 |
| Multivariate | 500 | A | 247,0 | 197,0 | 5.816,4 | 6.210,2 |
| Multivariate | 500 | B | 0,0 | 0,0 | 16,7 | 5.930,5 |
| Multivariate | 1000 | A | 301,0 | 251,0 | 21.749,1 | 22.244,0 |
| Multivariate | 1000 | B | 0,0 | 0,0 | 16,7 | 21.852,1 |
| Multivariate | 2000 | A | 193,0 | 143,0 | 84.263,3 | 84.674,1 |
| Multivariate | 2000 | B | 0,0 | 0,0 | 33,3 | 85.103,2 |
| Repeated Measures | 100 | A | 0,0 | 0,0 | 83,3 | 285,0 |
| Repeated Measures | 100 | B | 0,0 | 0,0 | 16,7 | 139,9 |
| Repeated Measures | 500 | A | 0,0 | 0,0 | 83,3 | 287,1 |
| Repeated Measures | 500 | B | 0,0 | 0,0 | 16,7 | 158,2 |
| Repeated Measures | 1000 | A | 0,0 | 0,0 | 100,0 | 292,6 |
| Repeated Measures | 1000 | B | 0,0 | 0,0 | 16,7 | 154,9 |
| Repeated Measures | 2000 | A | 0,0 | 0,0 | 133,3 | 325,5 |
| Repeated Measures | 2000 | B | 0,0 | 0,0 | 16,7 | 171,8 |

Pada run startup mode A, long task yang tercatat jauh lebih pendek daripada jeda frame. Penjelasannya ada di anomali 7.2.

---

## 6. Nilai yang relevan dengan kriteria §4.5

**(a) Uji beda.** Ambang yang dipakai: p < 0,05 dan Â₁₂ ≥ 0,71.

| Sel | p | Â₁₂ |
|---|---|---|
| Multivariate 500, 1000, 2000 | 1,51·10⁻¹¹ | 1,000 |
| Multivariate 100 | 0,1875 | 0,567 |
| Repeated Measures 100–2000 | 0,52–0,60 | 0,48–0,50 |

**(b) Mode B.** Ambang yang dipakai: median long task terpanjang < 100 ms di semua ukuran, dan tidak ada long task yang bersumber dari WASM.

1. **Median long task terpanjang mode B:**
   - Multivariate: 398,0–412,5 ms.
   - Repeated Measures: 188,5–192,5 ms.
2. **Median 5 run steady-state pertama → 5 run terakhir, mode B** (untuk konteks *drift*, lihat 7.1):

   | Modul | 100 | 500 | 1000 | 2000 |
   |---|---|---|---|---|
   | Multivariate | 75 → 758 ms | 83 → 684 ms | 102 → 731 ms | 101 → 752 ms |
   | Repeated Measures | 0 → 532 ms | 0 → 527 ms | 0 → 520 ms | 0 → 533 ms |

3. **Posisi long task mode B di dalam jendela** (Multivariate 500–2000; berkas `lt-phases.txt`):

   | Fase jendela | Mode B | Mode A (pembanding) |
   |---|---|---|
   | ≤ 1 detik setelah klik | Median 147–149 ms, maks 747–774 ms | Median 5.745 / 21.483 / 83.415 ms |
   | Tengah, saat worker menghitung 5–86 detik | 1–4 long task per sel, maks 189–195 ms | — |
   | ≤ 3 detik sebelum *mark* akhir | Median 57–66 ms, maks 176–189 ms | — |

   Long task mode A pada fase awal memuat seluruh perhitungan.
4. **Bukti pendukung lain:**
   - Semua run mode B tercatat dengan mode aktual `worker`.
   - Verifikasi terpisah sebelumnya menunjukkan 0 instansiasi WASM di main thread pada mode worker ([results/2026-09-22-free-main](../../../../../testing/glm-web-worker/results/2026-09-22-free-main/)).
   - Long Tasks API tidak menyediakan atribusi ke WASM, jadi poin 3 dan 4 ini adalah bukti tidak langsung.

---

## 7. Anomali dan keterbatasan

1. **Drift di kedua mode.** Long task dan waktu total naik seiring nomor run di dalam satu sel.
   - Untuk long task terpanjang mode B, ρ Spearman = 0,97–1,00 dengan kemiringan sekitar 10–13 ms per run.
   - **Penyebab:** `ResultNavigationObserver` memindahkan aplikasi ke `/dashboard/result` pada setiap analisis, dan halaman itu merender **semua** keluaran yang sudah terkumpul. Peringatan konsol *"Handsontable instance … destroyed"* mengonfirmasi perpindahan halaman ini.
   - **Dampaknya:** karena A dan B berselang-seling, efek ini terbagi rata ke kedua mode. Tetapi nilai absolut mode B ikut membesar seiring jumlah analisis dalam satu sesi, dan nilai ini relevan langsung dengan kriteria (b).
   - Rincian per sel ada di [analysis/drift.csv](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1/analysis/drift.csv).
2. **Long Tasks API melewatkan blokir di run startup mode A.**
   - Contoh MV-2000: long task tercatat 193 ms, padahal jeda frame 84.263 ms.
   - Pada Repeated Measures, long task tercatat 0 ms dengan jeda frame 83–133 ms.
   - Pada run steady-state, kedua metrik konsisten.
   - **Dugaan penyebab (belum dibuktikan):** perhitungan pertama berjalan sebagai lanjutan dari *promise* `WebAssembly.instantiateStreaming`, di *task* yang tidak dipantau Long Tasks API.
3. **Perhitungan Repeated Measures dengan opsi bawaan sangat kecil** (puluhan ms). Metriknya didominasi oleh render UI hasil, sehingga nilai A dan B hampir sama di semua ukuran.
4. **Waktu total A dan B praktis sama** di semua sel. Contoh MV-2000: median 86.819 ms (A) dan 86.774 ms (B).
5. **Hanya CPU 1× dan hanya Chromium.** Long Tasks API hanya tersedia di browser berbasis Chromium. Alasan tidak menjalankan 4× ada di §2, poin 4.
6. **Pengujian bersifat sintetis dan otomatis**, pada satu mesin, dengan dataset sintetis.
7. **Temuan aplikasi di luar cakupan** yang muncul selama pilot:
   - Repeated Measures dengan faktor between mencatat error *"Empty matrices provided for multiplication"*, dan tabel between-subjects berubah setelah run pertama.
   - Generator dataset test performa Jest Multivariate ter-*confound*.

---

## 8. Langkah berikutnya (perlu persetujuan)

**Eksperimen tambahan** dengan protokol yang **mengosongkan hasil di antara run**, supaya halaman Result tidak menumpuk. Tujuannya memisahkan *drift* (7.1) dari efek mode eksekusi. Rancangan urutan run (A, B bergantian, 31 run per mode) tetap sama. Protokol ini mengubah rancangan eksperimen, jadi belum dijalankan.

---

## 9. Lokasi berkas

| Isi | Lokasi |
|---|---|
| Data per run (CSV) | [runs.csv](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1/runs.csv) |
| Data mentah per run (long task dan frame) | `runs-raw.jsonl` di folder yang sama |
| Hasil analisis | [analysis/](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1/analysis/) (`tables.md`, `summary.csv`, `tests.csv`, `drift.csv`, `excluded-runs.csv`) |
| Lingkungan | `environment-*.json` di folder hasil |
| Catatan folder hasil | [README](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1/README.md) |
| Skrip | [testing/glm-web-worker/experiment/](../../../../../testing/glm-web-worker/experiment/) (`datasets.cjs`, `run-experiment.cjs`, `run-detached.ps1`, `inspect-output.cjs`, `analyze.py`) |
| Pilot dan pemeriksaan validitas | `testing/glm-web-worker/results/experiment-pilot-*`, `experiment-inspect*` |
---

## 10. Tambahan 2026-09-22: diagnosis, pilot, dan eksperimen kedua

Langkah yang diusulkan di §8 telah dijalankan sebagai eksperimen kedua (10.3–10.10).

Bagian 1–9 di atas adalah laporan eksperimen pertama. Isinya **tidak diubah**, dan datanya tetap di `results/experiment-2026-09-22-cpu1/`.

Eksperimen kedua **dirancang setelah eksperimen pertama selesai**. Tujuannya menghilangkan *confounder* yang ditemukan di sana: halaman Result merender semua keluaran yang menumpuk, sehingga terjadi *drift* (7.1). Eksperimen kedua **bukan pengganti** eksperimen pertama. Keduanya dilaporkan berdampingan, dan angkanya disajikan apa adanya tanpa kesimpulan tentang tujuan penelitian.

### 10.1 Diagnosis: Repeated Measures dengan faktor between

Rincian dan bukti ada di [results/diagnosis-rm-between-2026-09-22/README.md](../../../../../testing/glm-web-worker/results/diagnosis-rm-between-2026-09-22/README.md). Skrip ada di `testing/glm-web-worker/diagnosis/rm-between/`.

**Reproduksi.** UI asli di build produksi, 12 subjek seimbang, faktor within `time` (5 level), `group` 2 atau 3 level, dengan urutan run worker, worker, main, main.

| Pemeriksaan | Hasil |
|---|---|
| Error *"Failed to calculate tests for t1_(1,score): Error computing X'X: Empty matrices provided for multiplication"* | Muncul di **semua** run, di kedua mode, untuk 2 dan 3 grup. Juga muncul saat payload yang sama diputar ulang di Node, tanpa browser dan tanpa worker. |
| Jalur error | `wasm/function.rs:207` → `stats/univariate_tests.rs:21/100` → `stats/common.rs:714` (`build_design_matrix_and_response`) → `stats/common.rs:568` (`matrix_multiply`) |
| Sebab 1: kontrak tata letak `factors_data` | TypeScript (`repeated-measures-analysis.ts:108–126`) mengirim data **per subjek** (12 *array* × 1 rekaman). Rust (`get_factor_levels`, `common.rs:200–224`) membaca `factors_data[i]` sebagai **per faktor**, sehingga hanya menemukan 1 level. Akibatnya tidak ada kolom *dummy* dan baris X kosong. |
| Sebab 2: matriks desain | Dengan tata letak per variabel, error berubah menjadi *"Matrix is singular"*. Nilai faktor dicari di rekaman within (`common.rs:734–737`), dan matriksnya tidak punya intercept. |
| Tabel between berubah setelah run 1 | **Konfigurasi, bukan state.** Data identik, dan replay di instance yang sama memberi hasil identik. Yang berubah hanya `model.BetSubVar` `[]` → `["group"]` (serta `SrcList` plots/posthoc/emmeans), karena `executeRepeatedMeasures` (`repeated-measures-main.tsx:248–259`) memakai `formData.model` yang belum diperbarui oleh `useEffect` `:160–182`. Run 1 menghitung model intercept saja (df Error = n − 1). Mulai run 2, nilai kategorik dikodekan `0.0` (`between_subjects_effects.rs:164–165`), dan tabel `effects` kosong tanpa error. |
| Tabel lain | *Tests of Within-Subjects Effects* identik dengan desain tanpa `group` (tidak ada `time × group`). *Multivariate Tests* hanya berisi Intercept dan `group` yang degenerate (Wilks = 1, df 0, F kosong), dan efek `time` hilang. |

**Penilaian.** Hasil desain campuran **bukan sekadar gagal sebagian**. Tabel yang tampil dihitung dengan model yang berbeda dari yang diminta, tanpa pesan error.

**Perkiraan ukuran perbaikan:**
- **Kecil:** `BetSubVar` yang basi di TypeScript.
- **Besar:** dukungan desain campuran di Rust, minimal di `common.rs`, `univariate_tests.rs`, `between_subjects_effects.rs`, `within_subjects_effects.rs`, dan `multivariate_tests.rs`, dengan acuan SPSS.

Tidak ada kode yang diubah.

### 10.2 Pilot: beban Repeated Measures yang lebih berat

Rincian ada di [results/pilot-rm-heavier-2026-09-22/README.md](../../../../../testing/glm-web-worker/results/pilot-rm-heavier-2026-09-22/README.md). Desain campuran tidak dipakai karena temuan 10.1.

| Langkah (urutan instruksi) | Waktu komputasi (Node, n = 2000 / 5000 / 10000 / 20000) | Keluaran |
|---|---|---|
| Opsi default, 5 level × 1 measure | 77 / 123 / 208 / 381 ms | tanpa error |
| + Descriptive statistics, Estimates of effect size, Observed power | 77 / 174 / 370 / 668 ms | tanpa error |
| + Homogeneity tests | 122 / 215 / 373 / 692 ms | error Bartlett: *"At least two dependent variables are required"* |
| + EMMeans (`time`; dengan/tanpa *compare main effects*) | — | panic Rust (`RuntimeError: unreachable`) di semua ukuran |
| EMMeans lewat dialog asli | — | Dialog hanya menawarkan `(OVERALL)` untuk desain within-only, dan pilihan itu juga panic di kedua mode, tanpa output tersimpan |
| 3 opsi di atas, 8 level | 98 / 169 / 300 / 550 ms | tanpa error |
| 3 opsi di atas, 10 level | 174 / 338 / 611 / 1.110 ms | tanpa error |
| 3 opsi di atas, 10 level × 2 measure | 311 / 633 / 1.179 / 2.334 ms | tanpa error tercatat, tetapi **nilainya tidak stabil** (lihat di bawah) |

**Stabilitas keluaran.** Aplikasi memakai ulang instance WASM: worker yang sama di mode B, modul yang sama di main thread pada mode A. Komputasi berulang dengan payload yang sama di satu instance menunjukkan:
- **1 measure** (termasuk desain eksperimen pertama, 5 × 1 opsi default): hanya **urutan** entri tabel yang berubah (urutan `HashMap` Rust); nilainya identik.
- **2 measure:** **nilai** tabel Mauchly, Multivariate Tests, dan Tests of Within-Subjects Effects berubah antar-komputasi. Contohnya, `chi_square` Mauchly berbeda 5,78·10⁵.
- Instance baru selalu memberi hasil yang sama.

Karena itu measure kedua tidak dipakai.

**Pilot browser** (UI asli, protokol bersih, 3 pasangan A/B per ukuran), 10 level × 1 measure dengan 3 opsi. Median komputasi mode A (`glm-analysis-start` → `glm-analysis-end`):

| n | Komputasi A (ms) | Long task terpanjang A (ms) |
|---|---|---|
| 5000 | 239 | 130 |
| 10000 | 653 | 450 |
| 20000 | 1.066 | 844 |
| 40000 | 1.858 | 1.613 |

- Sesi sebelumnya dengan konfigurasi yang sama sekitar 2× lebih cepat: n = 20000 butuh 530–843 ms dan n = 40000 butuh 967–1.422 ms.
- Di semua ukuran, output identik antar-run dan antar-mode, dan 0 error tercatat.

**Konfigurasi terpilih untuk eksperimen kedua:**
- Desain: within-only, `time` 10 level, 1 measure (`score`, kolom `t1..t10`).
- Opsi dialog: Descriptive statistics, Estimates of effect size, Observed power.
- Ukuran: **n = 5000, 10000, 20000, 40000**.

Alasannya:
- Semua opsi yang berjalan tanpa error sudah dipakai, dan level dinaikkan ke 10.
- Measure kedua ditolak karena nilainya tidak stabil.
- Ukuran terbesar 40000 melewati contoh n di instruksi (5000/10000/20000). Pada sesi yang lebih cepat, n = 20000 belum mencapai ≥ ~1 s untuk mode A.

### 10.3 Eksperimen kedua: desain

> **Tanggal:** 2026-09-22, 10:33–14:03 WIB · **Data:** [results/experiment-2026-09-22-cpu1-clean/](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/README.md)

**Yang sama dengan eksperimen pertama:**
- Mesin, OS, Chromium, Node.js, Playwright, dan Next.js sama (§1).
- **Build produksi yang sama** (`BUILD_ID` `Jpi92C2uGyVNgnqAiqObA`), dengan hash isi kode yang diuji sama.
- CPU 1×, satu *context* dan halaman per sel, run bergantian A, B sampai 31 run per mode, pasangan pertama sebagai startup.
- Jendela pengukuran, metrik, dan statistik sama (§2).
- Dataset Multivariate 100/500/1000/2000 (byte-identik dengan eksperimen pertama).
- Urutan modul: Repeated Measures, lalu Multivariate.

**Yang berbeda:**

| Aspek | Eksperimen pertama | Eksperimen kedua |
|---|---|---|
| Hasil analisis sebelumnya | Menumpuk sepanjang sel | **Dihapus sebelum setiap run**, di luar jendela, dengan tombol hapus-semua halaman Result (`clearAll()`), tanpa *reload*. Runner menunggu sampai *toast* hilang. |
| Verifikasi sebelum OK | — | Jumlah log/analytics/statistics di IndexedDB dan log yang dirender dicek **= 0 tepat sebelum OK** di setiap run, dan dicatat di `runs.csv` (`pre_*`). Run ditolak kalau tidak 0. |
| Observer | Long Tasks, rAF | Long Tasks, rAF, dan **Long Animation Frames** (LoAF, dengan atribusi skrip: `sourceURL`, `sourceFunctionName`, `invoker`, `invokerType`, `duration`; entri disimpan di `runs-raw.jsonl`) |
| Repeated Measures | 5 level × 1 measure, opsi default, n = 100/500/1000/2000 | **10 level × 1 measure, 3 opsi (10.2), n = 5000/10000/20000/40000** |

Chunk build diberi tag agar URL skrip LoAF bisa dikenali (`environment-*.json` dan `chunk-map.json`):

| Chunk | Isi |
|---|---|
| `2965.*` / `8520.*` | Glue WASM Multivariate / Repeated Measures di main thread |
| `3910.*` / `4918.*` | Service GLM Multivariate / Repeated Measures |
| `2609.*` / `6745.*` | Entri worker |
| `c7879cf7-*` | react-dom |
| `9919.*` | Chunk dashboard bersama: registry modal Analyze, Handsontable, dan glue WASM **modul lain** (bukan GLM) |

### 10.4 Kualitas data eksperimen kedua

| Pemeriksaan | Hasil |
|---|---|
| Jumlah run | **496** (8 sel × 62) |
| Run dibuang | **1**: Repeated Measures 10000, run 7 (mode A, steady). Setelah diisi, dialog hanya berisi 5 dari 10 slot within, jadi run ditolak sebelum OK. Sel itu punya 29 run steady-state mode A. |
| Mode tidak sesuai / `main-fallback` | **0 / 0** |
| Error tercatat di "Errors Logs" | **0** |
| Baris data terbaca = ukuran sel | Ya, di semua run. Jumlah tabel: 4 (Multivariate) dan 17 (Repeated Measures) di semua run. |
| Tersimpan = 0 tepat sebelum OK | **495 dari 495** run yang sampai ke OK |
| Metode pembersihan | `none` 9 (run pertama dan run setelah run yang ditolak) · `button` 464 · `renav+button` 23 |
| Konsol halaman | Hanya peringatan (CSS *preload*, `DialogContent` tanpa `Description`, Handsontable *destroyed*, *upgrade* IndexedDB, "DataTable slow update") |

**Log yang dirender setelah run (`post_dom_logs`):**

| Modul | n data | Run | Tersimpan = 0 sebelum OK | Log tersimpan = 1 setelah run | Log dirender = 1 setelah run |
|---|---|---|---|---|---|
| Multivariate | 100 | 62 | 62 | 62 | 48 |
| Multivariate | 500 | 62 | 62 | 62 | 57 |
| Multivariate | 1000 | 62 | 62 | 62 | 61 |
| Multivariate | 2000 | 62 | 62 | 62 | 59 |
| Repeated Measures | 5000 | 62 | 62 | 62 | 62 |
| Repeated Measures | 10000 | 62 | 61 | 61 | 61 |
| Repeated Measures | 20000 | 62 | 62 | 62 | 62 |
| Repeated Measures | 40000 | 62 | 62 | 62 | 62 |

- Ke-23 run dengan "log dirender = 0" semuanya run **Multivariate mode A**. Log sudah tersimpan di IndexedDB, tetapi halaman Result tidak menampilkannya dalam 10 detik, dan tombol hapus-semua nonaktif karena store halaman kosong.
- Run berikutnya dibersihkan dengan memasang ulang halaman Result lewat tab footer Variable → Result (`renav+button`), lalu tombol hapus-semua dipakai.
- **Dugaan urutan (belum dibuktikan):** dialog Multivariate ditutup saat OK, halaman Result dipasang ulang, lalu `loadResults()` membaca IndexedDB sebelum hasil ditulis. Hasil baca yang kosong itu baru diterapkan ke store setelah `addLog`, karena main thread terblokir oleh perhitungan. Di Repeated Measures dialog tetap terbuka sampai selesai, dan hal ini tidak terjadi.

### 10.5 Hasil steady-state eksperimen kedua

#### 10.5.1 Ringkasan metrik (median [IQR], CPU 1×)

| Modul | n data | Mode | n run | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 30 | 348,5 [346,2–352,8] | 298,5 [296,2–302,8] | 333,3 [333,3–333,3] | 381,6 [374,9–399,8] | 353,3 [350,6–357,8] |
| Multivariate | 100 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 406,1 [396,1–412,4] | 0,0 [0,0–0,0] |
| Multivariate | 500 | A | 30 | 6.162,0 [6.084,8–6.189,8] | 6.112,0 [6.034,8–6.139,8] | 6.141,5 [6.062,3–6.166,4] | 6.210,6 [6.130,4–6.241,7] | 6.166,9 [6.089,2–6.194,1] |
| Multivariate | 500 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 6.279,8 [6.202,8–6.330,6] | 0,0 [0,0–0,0] |
| Multivariate | 1000 | A | 30 | 23.752,5 [23.635,0–23.924,5] | 23.702,5 [23.585,0–23.874,5] | 23.732,4 [23.619,9–23.911,5] | 23.796,2 [23.696,1–23.979,2] | 23.756,5 [23.639,6–23.928,9] |
| Multivariate | 1000 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 23.999,8 [23.910,0–24.128,4] | 0,0 [0,0–0,0] |
| Multivariate | 2000 | A | 30 | 87.752,5 [86.891,0–91.566,5] | 87.702,5 [86.841,0–91.516,5] | 87.729,8 [86.875,7–91.550,5] | 87.801,6 [86.925,4–91.623,7] | 87.757,7 [86.895,8–91.570,9] |
| Multivariate | 2000 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 88.161,6 [87.628,6–92.710,8] | 0,0 [0,0–0,0] |
| Repeated Measures | 5000 | A | 30 | 130,5 [128,0–134,8] | 80,5 [78,0–84,8] | 100,0 [100,0–116,7] | 243,2 [230,5–246,4] | 131,5 [129,3–135,4] |
| Repeated Measures | 5000 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 245,6 [234,2–254,4] | 0,0 [0,0–0,0] |
| Repeated Measures | 10000 | A | 29 | 228,0 [225,0–231,0] | 178,0 [175,0–181,0] | 200,0 [200,0–216,6] | 335,3 [329,6–347,6] | 229,3 [225,8–232,2] |
| Repeated Measures | 10000 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 345,8 [341,6–352,4] | 0,0 [0,0–0,0] |
| Repeated Measures | 20000 | A | 30 | 437,5 [433,0–442,0] | 387,5 [383,0–392,0] | 416,6 [416,6–416,7] | 548,0 [546,2–554,1] | 438,5 [433,6–443,1] |
| Repeated Measures | 20000 | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 571,0 [561,8–576,2] | 0,0 [0,0–0,0] |
| Repeated Measures | 40000 | A | 30 | 874,0 [869,2–885,5] | 824,0 [819,2–835,5] | 850,0 [850,0–866,6] | 979,5 [971,3–996,7] | 874,8 [870,8–886,4] |
| Repeated Measures | 40000 | B | 30 | 103,0 [86,5–107,8] | 53,0 [36,5–57,8] | 83,3 [66,7–83,3] | 1.020,7 [1.005,1–1.040,3] | 104,2 [87,8–108,7] |

#### 10.5.2 Long task dan LoAF terpanjang: mean (CI 95%), ms

CI memakai z untuk n ≥ 30 dan t untuk n = 29 (Repeated Measures 10000, A).

| Modul | n data | Long task A | Long task B | LoAF A | LoAF B |
|---|---|---|---|---|---|
| Multivariate | 100 | 350,1 (347,8–352,4) | 0,0 (0,0–0,0) | 354,7 (352,4–357,0) | 0,0 (0,0–0,0) |
| Multivariate | 500 | 6.165,7 (6.045,9–6.285,5) | 0,0 (0,0–0,0) | 6.170,5 (6.050,6–6.290,3) | 0,0 (0,0–0,0) |
| Multivariate | 1000 | 23.780,3 (23.714,6–23.846,0) | 0,0 (0,0–0,0) | 23.784,9 (23.719,1–23.850,7) | 5,9 (−2,3–14,0) |
| Multivariate | 2000 | 88.670,4 (87.846,7–89.494,0) | 0,0 (0,0–0,0) | 88.675,0 (87.851,4–89.498,6) | 15,9 (−2,6–34,5) |
| Repeated Measures | 5000 | 135,5 (128,2–142,8) | 0,0 (0,0–0,0) | 136,5 (129,2–143,8) | 0,0 (0,0–0,0) |
| Repeated Measures | 10000 | 228,8 (226,7–230,9) | 0,0 (0,0–0,0) | 230,0 (227,7–232,2) | 0,0 (0,0–0,0) |
| Repeated Measures | 20000 | 438,8 (434,9–442,7) | 0,0 (0,0–0,0) | 439,9 (435,9–443,9) | 0,0 (0,0–0,0) |
| Repeated Measures | 40000 | 874,1 (867,7–880,6) | 99,2 (95,4–102,9) | 875,2 (868,8–881,6) | 100,2 (96,4–104,0) |

Mean dan CI untuk metrik lainnya ada di [analysis/tables.md](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/analysis/tables.md).

#### 10.5.3 Uji statistik (long task terpanjang, H₁: B < A, α = 0,05)

Uji dan paket statistiknya sama dengan §4.3. Nilai B yang semuanya 0 menghasilkan *ties*, sehingga SciPy memakai pendekatan normal dengan koreksi *ties* dan koreksi kontinuitas.

| Modul | n data | CPU | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | 30 / 30 | 0,0 | 5,93·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 500 | 1× | 30 / 30 | 0,0 | 6,05·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 1000 | 1× | 30 / 30 | 0,0 | 6,06·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 2000 | 1× | 30 / 30 | 0,0 | 6,06·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 5,90·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 10000 | 1× | 29 / 30 | 0,0 | 7,67·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 5,99·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,48·10⁻¹¹ | 1,000 | tidak diisi | tidak diisi |

#### 10.5.4 Uji tambahan: LoAF terpanjang (H₁: B < A)

Uji ini tambahan dan **bukan kriteria §4.5**.

| Modul | n data | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 30 / 30 | 0,0 | 6,05·10⁻¹³ | 1,000 | 353,3 | 0,0 | 0,0 |
| Multivariate | 500 | 30 / 30 | 0,0 | 6,06·10⁻¹³ | 1,000 | 6.166,9 | 0,0 | 0,0 |
| Multivariate | 1000 | 30 / 30 | 0,0 | 1,18·10⁻¹² | 1,000 | 23.756,5 | 0,0 | 105,4 |
| Multivariate | 2000 | 30 / 30 | 0,0 | 1,58·10⁻¹² | 1,000 | 87.757,7 | 0,0 | 228,7 |
| Repeated Measures | 5000 | 30 / 30 | 0,0 | 6,05·10⁻¹³ | 1,000 | 131,5 | 0,0 | 0,0 |
| Repeated Measures | 10000 | 29 / 30 | 0,0 | 7,81·10⁻¹³ | 1,000 | 229,3 | 0,0 | 0,0 |
| Repeated Measures | 20000 | 30 / 30 | 0,0 | 6,06·10⁻¹³ | 1,000 | 438,5 | 0,0 | 0,0 |
| Repeated Measures | 40000 | 30 / 30 | 0,0 | 1,51·10⁻¹¹ | 1,000 | 874,8 | 104,2 | 114,4 |

### 10.6 Run startup eksperimen kedua (pasangan pertama, n = 1 per mode)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 196,0 | 146,0 | 433,3 | 776,7 | 449,1 |
| Multivariate | 100 | B | 0,0 | 0,0 | 16,7 | 464,6 | 0,0 |
| Multivariate | 500 | A | 254,0 | 204,0 | 6.083,1 | 6.487,7 | 6.111,7 |
| Multivariate | 500 | B | 0,0 | 0,0 | 16,7 | 6.021,6 | 0,0 |
| Multivariate | 1000 | A | 326,0 | 276,0 | 23.815,7 | 24.326,8 | 23.837,9 |
| Multivariate | 1000 | B | 0,0 | 0,0 | 16,7 | 24.258,2 | 0,0 |
| Multivariate | 2000 | A | 201,0 | 151,0 | 91.996,3 | 92.442,6 | 92.011,8 |
| Multivariate | 2000 | B | 0,0 | 0,0 | 200,0 | 91.133,7 | 211,6 |
| Repeated Measures | 5000 | A | 0,0 | 0,0 | 233,3 | 537,8 | 255,0 |
| Repeated Measures | 5000 | B | 0,0 | 0,0 | 16,7 | 303,3 | 0,0 |
| Repeated Measures | 10000 | A | 0,0 | 0,0 | 366,7 | 658,5 | 395,1 |
| Repeated Measures | 10000 | B | 0,0 | 0,0 | 16,7 | 414,5 | 0,0 |
| Repeated Measures | 20000 | A | 0,0 | 0,0 | 583,3 | 896,1 | 600,1 |
| Repeated Measures | 20000 | B | 0,0 | 0,0 | 16,7 | 608,7 | 0,0 |
| Repeated Measures | 40000 | A | 68,0 | 18,0 | 1.033,3 | 1.477,2 | 1.056,3 |
| Repeated Measures | 40000 | B | 90,0 | 40,0 | 66,7 | 1.119,2 | 91,2 |

**LoAF dan blok startup mode A** (anomali 7.2 eksperimen pertama):
- Di semua sel, LoAF terpanjang pada startup mode A mendekati jeda frame terpanjang, sedangkan Long Tasks API mencatat nilai yang jauh lebih kecil. Contoh: MV-2000 long task 201 ms vs LoAF 92.011,8 ms; RM-20000 long task 0 ms vs LoAF 600,1 ms.
- Frame panjang itu **tidak punya skrip teratribusi** (`scripts` kosong) di 8 dari 8 sel. `blockingDuration`-nya 91.962 ms di MV-2000 dan 547 ms di RM-20000.
- Pada Multivariate ada frame lain yang lebih pendek (200–331 ms). Frame ini teratribusi ke `#document.onclick` (`event-listener`, react-dom), dan durasinya sesuai dengan long task yang tercatat (196–326 ms).

### 10.7 Nilai yang relevan dengan kriteria §4.5 (eksperimen kedua)

**(a) Uji beda.** Ambang yang dipakai: p < 0,05 dan Â₁₂ ≥ 0,71.

| Sel | p | Â₁₂ |
|---|---|---|
| Multivariate 100, 500, 1000, 2000 | 5,93·10⁻¹³ – 6,06·10⁻¹³ | 1,000 |
| Repeated Measures 5000, 10000, 20000 | 5,90·10⁻¹³ – 7,67·10⁻¹³ | 1,000 |
| Repeated Measures 40000 | 1,48·10⁻¹¹ | 1,000 |

**(b) Mode B.** Ambang yang dipakai: median long task terpanjang < 100 ms di semua ukuran, dan tidak ada long task yang bersumber dari WASM.

1. **Median long task terpanjang mode B (steady-state):**

   | Modul | Ukuran 1 | Ukuran 2 | Ukuran 3 | Ukuran 4 |
   |---|---|---|---|---|
   | Multivariate (100 / 500 / 1000 / 2000) | 0,0 ms | 0,0 ms | 0,0 ms | 0,0 ms |
   | Repeated Measures (5000 / 10000 / 20000 / 40000) | 0,0 ms | 0,0 ms | 0,0 ms | **103,0 ms** (maks 113,0; 19 dari 30 run ≥ 100 ms) |

   Di semua sel lain, 0 dari 30 run mode B punya long task.
2. **Median 5 run steady-state pertama → 5 terakhir, mode B:**
   - Multivariate: 0 → 0 ms di keempat ukuran.
   - Repeated Measures: 0 → 0 ms (5000–20000) dan 103 → 102 ms (40000).
3. **Sumber long task / LoAF mode B** (atribusi LoAF, rincian di 10.8):
   - **0 run** mode B, di semua sel, punya skrip teratribusi ke chunk glue WASM GLM (`2965.*`/`8520.*`) atau chunk service GLM (`3910.*`/`4918.*`).
   - Frame ~100 ms pada Repeated Measures 40000 teratribusi ke `IDBRequest.onsuccess` (`event-listener`) di chunk dashboard bersama `9919.*`.
   - **Keterbatasan:** LoAF hanya mengatribusi **titik masuk** skrip. Pada mode A, frame yang memuat perhitungan WASM juga teratribusi ke `IDBRequest.onsuccess` di `9919.*`, bukan ke chunk glue. Jadi "0 skrip glue" tidak dengan sendirinya membuktikan tidak ada eksekusi WASM di main thread.
   - Bukti pendukung lain tetap sama seperti §6 poin 4: mode aktual `worker` di semua run mode B, dan 0 instansiasi WASM di main thread pada verifikasi terpisah.

### 10.8 Atribusi LoAF

Tabel memuat frame LoAF (≥ 50 ms) yang tumpang tindih dengan jendela pengukuran, dijumlahkan per modul × mode × fase.

| Modul | Mode | Fase | Frame | Frame tanpa skrip | Titik masuk skrip (invoker · invokerType · chunk) | Durasi skrip total (ms) |
|---|---|---|---|---|---|---|
| Multivariate | A | startup | 8 (4 run) | 4 | `#document.onclick` · event-listener · react-dom (4) | 962 |
| Multivariate | A | steady | 120 (120 run) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (120) | 3.568.992 |
| Multivariate | B | startup | 1 (MV-2000) | 1 | — (`blockingDuration` 0) | — |
| Multivariate | B | steady | 6 (5 run; MV-1000 dan MV-2000; 51–229 ms) | 6 | — (`blockingDuration` 0 di keenamnya) | — |
| Repeated Measures | A | startup | 5 (4 run) | 4 | `IDBRequest.onsuccess` · event-listener · `9919.*` (1, RM-40000) | 68 |
| Repeated Measures | A | steady | 119 (119 run) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (119) | 50.085 |
| Repeated Measures | B | startup | 1 (RM-40000) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (1) | 90 |
| Repeated Measures | B | steady | 30 (30 run, semuanya RM-40000) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (30) | 2.974 |

- **Sumber dominan di frame panjang mode B:**
  - Repeated Measures 40000: callback `IDBRequest.onsuccess` di `9919.*` (rata-rata 99 ms per run). Tidak ada entri dari react-dom, halaman Result, service GLM, atau glue WASM GLM.
  - Multivariate: frame tanpa skrip dan tanpa waktu blokir.
- Chunk glue WASM GLM dan chunk service GLM **tidak pernah muncul** sebagai sumber skrip di mode A maupun B (`loaf_glue_scripts` = `loaf_service_scripts` = 0 di 495 run).
- Rincian per run dan per sumber: [analysis/loaf-runs.csv](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/analysis/loaf-runs.csv) dan `loaf-attribution.csv`. Data mentah per frame ada di `runs-raw.jsonl`.

### 10.9 Drift: eksperimen pertama vs kedua

Tabel memakai data steady-state: ρ Spearman terhadap nomor run, dan median 5 run pertama → 5 run terakhir. Sel dipasangkan menurut urutan ukuran. Ukuran Repeated Measures berbeda antara kedua eksperimen (100–2000 vs 5000–40000), jadi pasangan sel Repeated Measures tidak setara bebannya.

**Long task terpanjang**

| Modul | Mode | n data (eks. 1) | ρ eks. 1 | awal → akhir eks. 1 (ms) | n data (eks. 2) | ρ eks. 2 | awal → akhir eks. 2 (ms) |
|---|---|---|---|---|---|---|---|
| Multivariate | A | 100 | 0,88 | 355,0 → 715,0 | 100 | −0,65 | 359,0 → 344,0 |
| Multivariate | A | 500 | 0,37 | 5.753,0 → 5.929,0 | 500 | 0,51 | 5.863,0 → 6.186,0 |
| Multivariate | A | 1000 | 0,45 | 21.753,0 → 22.321,0 | 1000 | 0,02 | 23.733,0 → 23.832,0 |
| Multivariate | A | 2000 | 0,12 | 84.321,0 → 86.336,0 | 2000 | 0,46 | 86.927,0 → 87.081,0 |
| Multivariate | B | 100 | 1,00 | 75,0 → 758,0 | 100 | — (semua 0) | 0,0 → 0,0 |
| Multivariate | B | 500 | 0,97 | 83,0 → 684,0 | 500 | — (semua 0) | 0,0 → 0,0 |
| Multivariate | B | 1000 | 0,99 | 102,0 → 731,0 | 1000 | — (semua 0) | 0,0 → 0,0 |
| Multivariate | B | 2000 | 1,00 | 101,0 → 752,0 | 2000 | — (semua 0) | 0,0 → 0,0 |
| Repeated Measures | A | 100 | 0,98 | 0,0 → 559,0 | 5000 | −0,44 | 140,0 → 129,0 |
| Repeated Measures | A | 500 | 1,00 | 0,0 → 567,0 | 10000 | −0,64 | 233,0 → 223,0 |
| Repeated Measures | A | 1000 | 0,98 | 0,0 → 552,0 | 20000 | −0,14 | 438,0 → 429,0 |
| Repeated Measures | A | 2000 | 0,99 | 0,0 → 545,0 | 40000 | −0,01 | 878,0 → 890,0 |
| Repeated Measures | B | 100 | 1,00 | 0,0 → 532,0 | 5000 | — (semua 0) | 0,0 → 0,0 |
| Repeated Measures | B | 500 | 0,97 | 0,0 → 527,0 | 10000 | — (semua 0) | 0,0 → 0,0 |
| Repeated Measures | B | 1000 | 0,99 | 0,0 → 520,0 | 20000 | — (semua 0) | 0,0 → 0,0 |
| Repeated Measures | B | 2000 | 1,00 | 0,0 → 533,0 | 40000 | −0,01 | 103,0 → 102,0 |

**Waktu total**

| Modul | Mode | n data (eks. 1) | ρ eks. 1 | awal → akhir eks. 1 (ms) | n data (eks. 2) | ρ eks. 2 | awal → akhir eks. 2 (ms) |
|---|---|---|---|---|---|---|---|
| Multivariate | A | 100 | 0,95 | 598,1 → 2.307,3 | 100 | −0,19 | 395,5 → 380,0 |
| Multivariate | A | 500 | 0,99 | 6.015,3 → 7.941,3 | 500 | 0,51 | 5.893,3 → 6.228,1 |
| Multivariate | A | 1000 | 0,84 | 21.968,1 → 24.082,3 | 1000 | 0,01 | 23.793,9 → 23.898,3 |
| Multivariate | A | 2000 | 0,46 | 84.451,3 → 87.535,6 | 2000 | 0,46 | 86.983,6 → 87.125,7 |
| Multivariate | B | 100 | 1,00 | 597,5 → 2.191,1 | 100 | −0,44 | 411,3 → 394,0 |
| Multivariate | B | 500 | 0,84 | 6.124,0 → 7.588,5 | 500 | 0,45 | 6.043,2 → 6.279,5 |
| Multivariate | B | 1000 | 0,95 | 22.035,0 → 23.737,1 | 1000 | −0,32 | 24.015,9 → 23.913,6 |
| Multivariate | B | 2000 | 0,72 | 85.484,7 → 86.874,5 | 2000 | 0,47 | 87.508,8 → 87.835,6 |
| Repeated Measures | A | 100 | 0,96 | 245,6 → 1.439,3 | 5000 | −0,63 | 261,9 → 229,5 |
| Repeated Measures | A | 500 | 1,00 | 216,3 → 1.441,1 | 10000 | −0,61 | 355,6 → 327,8 |
| Repeated Measures | A | 1000 | 1,00 | 257,1 → 1.527,0 | 20000 | −0,47 | 553,2 → 542,4 |
| Repeated Measures | A | 2000 | 1,00 | 276,3 → 1.430,1 | 40000 | 0,00 | 988,8 → 997,0 |
| Repeated Measures | B | 100 | 1,00 | 245,8 → 1.392,1 | 5000 | −0,58 | 263,6 → 242,3 |
| Repeated Measures | B | 500 | 1,00 | 263,1 → 1.430,7 | 10000 | −0,45 | 356,4 → 343,9 |
| Repeated Measures | B | 1000 | 0,99 | 278,4 → 1.417,5 | 20000 | −0,20 | 575,0 → 569,5 |
| Repeated Measures | B | 2000 | 1,00 | 262,1 → 1.459,2 | 40000 | 0,24 | 1.017,8 → 1.036,8 |

"—" berarti ρ tidak terdefinisi karena semua nilai sama (0).

Sumber: [analysis/drift-vs-exp1.md](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/analysis/drift-vs-exp1.md) (`compare-drift.py`) dan `drift.csv` kedua eksperimen.

### 10.10 Anomali dan keterbatasan eksperimen kedua

1. **Race render hasil Multivariate mode A** (10.4): pada 23 run halaman Result tidak merender log yang sudah tersimpan. Pada run itu, render hasil tidak terjadi di dalam jendela.
2. **1 run ditolak** karena pengisian dialog Repeated Measures tidak lengkap (drag tidak terdaftar). Sel RM-10000 mode A punya 29 run steady-state.
3. **Kecepatan mesin berbeda antar-sesi.** Pilot 10.2 mencatat perbedaan sekitar 2× untuk konfigurasi yang sama pada hari yang sama. Karena A dan B berselang-seling di dalam sel, keduanya mengalami kondisi yang sama. Tetapi nilai absolut antar-eksperimen atau antar-sesi tidak sepenuhnya sebanding.
4. **Atribusi LoAF terbatas pada titik masuk skrip** (10.7 poin 3). Frame startup mode A tidak punya skrip teratribusi sama sekali.
5. **Frame LoAF mode B Multivariate tanpa skrip** (6 steady-state, 1 startup; 51–229 ms, `blockingDuration` 0). Tidak ada long task yang menyertainya.
6. **Beban Repeated Measures berbeda dari eksperimen pertama** (10 level, 3 opsi, n 5000–40000). Hasil RM kedua eksperimen tidak membandingkan beban yang sama.
7. Hanya CPU 1× dan Chromium; pengujian sintetis pada satu mesin (sama dengan §7 poin 5–6).

### 10.11 Lokasi berkas (tambahan)

| Isi | Lokasi |
|---|---|
| Diagnosis Repeated Measures dengan faktor between | [results/diagnosis-rm-between-2026-09-22/](../../../../../testing/glm-web-worker/results/diagnosis-rm-between-2026-09-22/README.md), skrip `testing/glm-web-worker/diagnosis/rm-between/` |
| Pilot beban Repeated Measures | [results/pilot-rm-heavier-2026-09-22/](../../../../../testing/glm-web-worker/results/pilot-rm-heavier-2026-09-22/README.md), skrip `testing/glm-web-worker/diagnosis/rm-heavier/` |
| Eksperimen kedua: data per run | [runs.csv](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/runs.csv), `runs-raw.jsonl` (long task, frame, dan LoAF dengan skrip) |
| Eksperimen kedua: analisis | [analysis/](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/analysis/) (`tables.md`, `summary.csv`, `tests.csv`, `drift.csv`, `drift-vs-exp1.md`, `clean-check.csv`, `loaf-runs.csv`, `loaf-attribution.csv`, `excluded-runs.csv`, `analysis.json`) |
| Eksperimen kedua: lingkungan dan peta chunk | `environment-*.json`, `chunk-map.json` di folder hasil |
| Skrip | `experiment/run-experiment.cjs` (opsi `--clean`, `--loaf`, `--rm-levels`, `--rm-measures`, `--rm-options`, `--sizes-<modul>`), `run-detached.ps1 -Extra`, `analyze.py --raw --env`, `compare-drift.py` |

---

## 11. Tambahan 2026-09-23: perbaikan kebenaran Repeated Measures, validasi SPSS, dan sel RM final

Bagian 1–10 tidak diubah (kecuali satu kalimat di awal §10). Datanya tetap di foldernya masing-masing.

### 11.1 Ringkasan perbaikan kebenaran modul Repeated Measures

Perbaikan dilakukan di branch `fix/rm-correctness` (commit per tahap, dari baseline `8e2ddbd2`). Rincian per tahap ada di `testing/glm-rm-reference/results/stage1`–`stage5`, `spss-validation`, `spss-validation-de`, dan `contrast-default`. Daftar perubahan kode untuk naskah ada di [thesis-impact.md](../../../../../testing/glm-rm-reference/results/thesis-impact.md).

| Masalah (sebelum perbaikan) | Perbaikan |
|---|---|
| Keluaran berubah antar-komputasi di instance WASM yang sama (dua measure; urutan baris satu measure), 10.2 | `HashMap` crate → `IndexMap` (urutan deterministik). Mauchly dan epsilon dikunci per measure. Uji *doubly multivariate* untuk > 1 measure. |
| Desain campuran salah atau error (10.1): tata letak `factors_data`, matriks desain, `BetSubVar` basi | Satu tata letak per variabel (`factors_data[f][s]`). Mesin GLM multivariat baru `RmModel` (`stats/rm_model.rs`): intercept, kovariat, kode efek, interaksi faktorial penuh, SS tipe III, galat model penuh, listwise. `BetSubVar` diturunkan dari data dialog yang dikirim. |
| EMMeans *panic* (`RuntimeError: unreachable`) | `RmModel::emmeans`: (OVERALL), faktor between/within, dan interaksi. Perbandingan berpasangan LSD, Bonferroni, dan Sidak. Target tak valid → pesan. |
| Homogeneity tests menghitung Bartlett's test of sphericity pada variabel faktor (error bila < 2 faktor) | Box's M dan Levene (4 baris) seperti SPSS. Bartlett dipindah ke Residual SSCP, dengan rumus diperbaiki. |
| Nilai yang berbeda dari SPSS | Sig. Mauchly dengan koreksi ω₂; Likelihood Ratio Bartlett W^(N/2); *observed power* eksak (F nonsentral); noncentrality baris koreksi = F × df terkoreksi; SS between pada skala SPSS (Σy/√k untuk Polynomial, Σy/k untuk Repeated) |
| Tabel yang tidak ada | Tests of Within-Subjects Effects (Multivariate) untuk > 1 measure. Residual SSCP Matrix dengan Covariance dan Correlation. |
| Pilihan kontras dialog diabaikan | Polynomial (bawaan, seperti SPSS) dan Repeated. Jenis lain tidak ditawarkan. |
| Matriks galat singular menghasilkan angka tak bermakna tanpa peringatan | Pesan di Errors Logs; Mauchly W = 0 dengan χ² dan Sig. kosong |
| Desain > 1 faktor within: modul lama tidak cocok dengan SPSS | **Diblokir** di dialog Define dan di mesin, dengan pesan "Designs with more than one within-subjects factor are not supported in this version." |

Modul Multivariate, `shared/glm-execution.ts`, dan kontrak pesan worker tidak diubah. WASM Multivariate di build baru (`wasm_bg.6c6ecfdf.wasm`) sama dengan eksperimen kedua.

### 11.2 Validasi terhadap SPSS 27

Acuan: keluaran SPSS 27 yang dijalankan pengguna dari `testing/glm-rm-reference/spss/*.sps`, diekspor ke `spss-output/*.xlsx`. Nilainya dibaca `harness/spss_extract.py` dan diuji di `__test__/repeated-measures-reference.test.ts` dengan toleransi |Statify − SPSS| ≤ 0,001.

| Dataset | Desain | Nilai SPSS | Hasil |
|---|---|---|---|
| Gambar 51, (a), (b), (c) | Within-only 1 dan 2 measure; campuran; campuran dengan EMMeans, Homogeneity, dan RSSCP (kontras Polynomial) | 1047 | Semua lulus |
| (d) `rm_d.sps` | Data (b) dengan kontras Repeated | 271 | Semua lulus (setelah skala Between untuk Repeated disesuaikan) |
| (e) `rm_e.sps` | Dua faktor within (kondisi 2 × waktu 3) | 332 (disimpan di fixture `spss_blocked`) | Tidak cocok, sehingga desainnya diblokir (11.1) |

- **Total 1318 nilai SPSS lulus.** Pada presisi penuh, selisih maksimum 4,4·10⁻⁴, dan hanya berasal dari nilai F yang disimpan SPSS dengan tiga desimal. Nilai lainnya ≤ 4,9·10⁻¹⁰.
- Tabel yang tercakup:
  - Descriptive Statistics, Box's M, Levene, Bartlett, dan Residual SSCP;
  - Multivariate Tests, Mauchly, Tests of Within-Subjects Effects (dengan Multivariate), dan Contrasts (Polynomial dan Repeated);
  - Tests of Between-Subjects Effects;
  - EM Means (Estimates, Pairwise Comparisons).
- Belum dibuat: tabel Univariate/Multivariate Tests di bawah EM Means.
- Jest penuh setelah setiap perubahan kode aplikasi: 49 suite gagal, sama dengan baseline. Satu kali ada tambahan test performa Multivariate yang melewati batas waktu karena beban mesin; test itu lulus bila dijalankan sendiri. Test acuan RM terakhir: 1687 lulus.

### 11.3 Alasan sel RM dijalankan ulang

1. **Perubahan kode di jalur yang diukur.** WASM RM, service (payload), pemformat, output, dan dialog berada di dalam jendela klik OK → `glm-analysis-end`.
2. **Kontras bawaan kini Polynomial**, seperti SPSS. Konfigurasi sel RM memakai kontras bawaan, sehingga tabel kontrasnya berubah.
3. **Dataset nonsingular.** Dataset RM lama (`repeatedMeasuresRows`) punya variasi within berpangkat 2. Dengan kode terperbaiki, Mauchly dan Multivariate Tests tidak terhitung, dan 2 pesan muncul di Errors Logs. Varian baru `repeatedMeasuresRowsNoise` (noise normal independen per sel, seed 20260927) menghasilkan 17 tabel dan 0 pesan.
   - Dataset Multivariate dan dataset RM lama tidak berubah (md5 sama).

**Perubahan protokol: pin P-core.**
- Run penuh pertama dengan kode dan dataset baru ([experiment-2026-09-22-cpu1-rm-noise](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-rm-noise/README.md)) mengalami episode perlambatan ~1,7–2× yang berselang-seling di kedua mode, walaupun mode daya Windows sudah *Best performance* dan tidak ada proses berat lain.
- CPU i7-12700H bersifat hibrida: loop satu thread butuh ~1,4 s di CPU logis 0–11 (P-core) dan ~4,1 s di CPU 12–19 (E-core) (`cpu-core-bench.ps1`).
- Sel RM final dijalankan dengan `run-detached.ps1 -Affinity FFF`. Server, node, dan Chromium mewarisi *affinity* ke P-core, sama untuk mode A dan B.
- Sel Multivariate eksperimen kedua tidak dijalankan dengan pin.

### 11.4 Desain dan kualitas data sel RM final

> **Data:** [experiment-2026-09-23-cpu1-rm-noise-pcore](../../../../../testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/README.md) · 2026-09-23 00:09–00:48 WIB · build `MHninJmEe45iPpG1SPYZ3` (kode aplikasi commit `182b6f05`)

- Sama dengan eksperimen kedua: protokol bersih, LoAF, CPU 1×, 31 run per mode bergantian dengan pasangan pertama sebagai startup, within-only `time` 10 level, 1 measure, 3 opsi (Descriptive statistics, Estimates of effect size, Observed power), dan n = 5000, 10000, 20000, 40000.
- Berbeda: kode terperbaiki, kontras bawaan Polynomial, dataset `-noise`, pin P-core, dan mode daya *Best performance*.
- **Kualitas:**
  - 248 run, **0 dibuang**, status `ok` di semua run, mode tidak sesuai 0;
  - **17 tabel dan 0 pesan Errors Logs** di semua run;
  - tersimpan = 0 tepat sebelum OK di 248/248 run, dan log dirender = 1 di semua run.
- **Pengecekan perlambatan:** median long task mode A tiap sel dibandingkan dengan pilot ber-pin (3 run per mode). Selisihnya −10,1%, −13,3%, −7,3%, dan −15,2%, semuanya di bawah batas 30%, sehingga tidak ada sel yang diulang.

### 11.5 Hasil steady-state sel RM final

#### 11.5.1 Ringkasan metrik (median [IQR], CPU 1×, n = 30 per mode)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | A | 147,0 [144,0–153,0] | 97,0 [94,0–103,0] | 133,3 [116,7–133,3] | 267,1 [258,0–281,3] | 148,4 [145,0–154,2] |
| Repeated Measures | 5000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 290,4 [275,9–311,4] | 0,0 [0,0–0,0] |
| Repeated Measures | 10000 | A | 284,0 [247,2–291,8] | 234,0 [197,2–241,8] | 266,6 [216,7–266,7] | 404,9 [351,6–421,6] | 285,1 [248,0–293,2] |
| Repeated Measures | 10000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 417,2 [363,0–438,1] | 0,0 [0,0–0,0] |
| Repeated Measures | 20000 | A | 547,5 [473,0–565,5] | 497,5 [423,0–515,5] | 525,0 [450,0–550,0] | 674,2 [580,5–689,8] | 548,2 [473,9–566,9] |
| Repeated Measures | 20000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 730,1 [604,9–758,7] | 0,0 [0,0–0,0] |
| Repeated Measures | 40000 | A | 987,5 [965,5–1.102,8] | 937,5 [915,5–1.052,8] | 966,6 [950,0–1.075,0] | 1.095,7 [1.070,0–1.232,1] | 988,2 [966,8–1.103,5] |
| Repeated Measures | 40000 | B | 80,0 [73,5–91,5] | 30,0 [23,5–41,5] | 58,4 [50,0–66,7] | 1.160,3 [1.105,3–1.320,0] | 80,9 [74,3–92,7] |

#### 11.5.2 Long task dan LoAF terpanjang: mean (CI 95%), ms

| Modul | n data | Long task A | Long task B | LoAF A | LoAF B |
|---|---|---|---|---|---|
| Repeated Measures | 5000 | 150,4 (146,5–154,3) | 0,0 (0,0–0,0) | 151,7 (147,7–155,8) | 0,0 (0,0–0,0) |
| Repeated Measures | 10000 | 274,4 (263,9–284,9) | 0,0 (0,0–0,0) | 275,4 (264,8–285,9) | 0,0 (0,0–0,0) |
| Repeated Measures | 20000 | 526,8 (507,6–546,0) | 1,8 (−1,7–5,2) | 527,9 (508,7–547,1) | 3,5 (−1,3–8,2) |
| Repeated Measures | 40000 | 1.029,0 (998,0–1.060,0) | 84,8 (79,9–89,7) | 1.030,1 (999,1–1.061,1) | 85,8 (80,9–90,8) |

#### 11.5.3 Uji statistik (long task terpanjang, H₁: B < A, α = 0,05)

| Modul | n data | CPU | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 5,98·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 6,03·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 8,56·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,49·10⁻¹¹ | 1,000 | tidak diisi | tidak diisi |

#### 11.5.4 Uji tambahan: LoAF terpanjang (H₁: B < A; bukan kriteria §4.5)

| Modul | n data | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 30 / 30 | 0,0 | 6,05·10⁻¹³ | 1,000 | 148,4 | 0,0 | 0,0 |
| Repeated Measures | 10000 | 30 / 30 | 0,0 | 6,06·10⁻¹³ | 1,000 | 285,1 | 0,0 | 0,0 |
| Repeated Measures | 20000 | 30 / 30 | 0,0 | 1,18·10⁻¹² | 1,000 | 548,2 | 0,0 | 53,8 |
| Repeated Measures | 40000 | 30 / 30 | 0,0 | 1,51·10⁻¹¹ | 1,000 | 988,2 | 80,9 | 118,9 |

### 11.6 Run startup sel RM final (pasangan pertama, n = 1 per mode)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | A | 0,0 | 0,0 | 300,0 | 671,3 | 320,1 |
| Repeated Measures | 5000 | B | 0,0 | 0,0 | 16,7 | 354,6 | 0,0 |
| Repeated Measures | 10000 | A | 0,0 | 0,0 | 516,6 | 851,9 | 536,8 |
| Repeated Measures | 10000 | B | 0,0 | 0,0 | 16,7 | 518,1 | 0,0 |
| Repeated Measures | 20000 | A | 0,0 | 0,0 | 750,0 | 1.095,1 | 777,2 |
| Repeated Measures | 20000 | B | 0,0 | 0,0 | 16,7 | 792,0 | 0,0 |
| Repeated Measures | 40000 | A | 63,0 | 13,0 | 1.166,6 | 1.520,0 | 1.195,2 |
| Repeated Measures | 40000 | B | 74,0 | 24,0 | 50,0 | 1.162,9 | 74,4 |

Pola startup mode A sama dengan 10.6: LoAF terpanjang mendekati jeda frame terpanjang, Long Tasks API mencatat nilai kecil atau 0, dan 4 dari 5 frame startup mode A tidak punya skrip teratribusi.

### 11.7 Nilai yang relevan dengan kriteria §4.5 (sel RM final)

Bagian ini hanya menyajikan angka. Kolom keputusan tidak diisi.

**(a) Uji beda.** Ambang yang dipakai: p < 0,05 dan Â₁₂ ≥ 0,71.

| Sel | p | Â₁₂ |
|---|---|---|
| Repeated Measures 5000, 10000, 20000 | 5,98·10⁻¹³ – 8,56·10⁻¹³ | 1,000 |
| Repeated Measures 40000 | 1,49·10⁻¹¹ | 1,000 |

Keempat sel memenuhi ambang (a) secara angka.

**(b) Mode B.** Ambang yang dipakai: median long task terpanjang < 100 ms di semua ukuran, dan tidak ada long task yang bersumber dari WASM.

1. **Median long task terpanjang mode B (steady-state):**

   | Modul | 5000 | 10000 | 20000 | 40000 |
   |---|---|---|---|---|
   | Repeated Measures | 0,0 ms | 0,0 ms | 0,0 ms | **80,0 ms** (maks 118,0; 6 dari 30 run ≥ 100 ms) |

   Median < 100 ms di keempat ukuran, sehingga angka ini memenuhi ambang (b). Di sel 20000, 1 dari 30 run mode B punya long task (53 ms); di sel 5000 dan 10000 tidak ada.
2. **Median 5 run steady-state pertama → 5 terakhir, mode B:** 0 → 0 ms (5000–20000), 78 → 87 ms (40000).
3. **Sumber long task / LoAF mode B:**
   - 0 run (A maupun B) punya skrip teratribusi ke chunk glue WASM GLM (`2965.*`/`8520.*`) atau chunk service GLM (`3910.*`/`4918.*`).
   - Frame mode B pada RM-40000 (30 run) dan RM-20000 (2 run) teratribusi ke `IDBRequest.onsuccess` di `9919.*`.
   - Keterbatasannya sama dengan 10.7 poin 3: atribusi hanya pada titik masuk skrip.
4. **Pada kondisi tanpa pin** (run yang terganggu, 11.9), median long task mode B RM-40000 = **111,5 ms**, sehingga ambang (b) tidak terpenuhi pada run itu.

### 11.8 Atribusi LoAF (sel RM final)

| Modul | Mode | Fase | Frame | Frame tanpa skrip | Titik masuk skrip (invoker · invokerType · chunk) | Durasi skrip total (ms) |
|---|---|---|---|---|---|---|
| Repeated Measures | A | startup | 5 (4 run) | 4 | `IDBRequest.onsuccess` · event-listener · `9919.*` (1) | 63 |
| Repeated Measures | A | steady | 120 (120 run) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (120) | 59.412 |
| Repeated Measures | B | startup | 1 (RM-40000) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (1) | 73 |
| Repeated Measures | B | steady | 32 (32 run; RM-40000 30, RM-20000 2) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (32) | 2.644 |

Rincian ada di `analysis/loaf-runs.csv`, `loaf-attribution.csv`, dan `runs-raw.jsonl` folder final.

### 11.9 Anomali dan keterbatasan

1. **Perlambatan berselang tanpa pin P-core.**
   - Dua pilot (mode daya *Best power efficiency*, lalu *Best performance*) dan satu run penuh tanpa pin mengalami episode ~1,7–2× di kedua mode. Contohnya RM-40000 mode A median 1.449 ms, dibanding 988 ms dengan pin.
   - Data itu disimpan sebagai catatan: `experiment-2026-09-22-cpu1-rm-noise-pilot`, `-pilot2`, dan `experiment-2026-09-22-cpu1-rm-noise`.
2. **Pin P-core hanya pada sel RM final.** Sel Multivariate final (eksperimen kedua) dijalankan tanpa pin. Nilai absolut kedua modul tidak diukur pada kondisi CPU yang sama.
3. **Sisa variasi dengan pin.** Rentang maks/min long task mode A 1,3–1,4 per sel. Sel 10000 dan 20000 punya dua sub-level dengan *drift* turun (ρ −0,81 dan −0,70). Karena A dan B berselang-seling, keduanya mengalami kondisi yang sama.
4. **Beban tidak setara dengan eksperimen sebelumnya.** Kode, kontras, dan dataset berbeda. Angka RM 11.5 tidak dapat dibandingkan langsung dengan 10.5 (misalnya median long task B RM-40000: 103,0 ms di 10.5 dan 80,0 ms di sini).
5. Sama dengan 10.10 poin 4 dan 7: atribusi LoAF terbatas pada titik masuk skrip; hanya CPU 1× dan Chromium; satu mesin.

### 11.10 Data yang menjadi hasil final

| Modul | Hasil final | Lokasi |
|---|---|---|
| **Multivariate** (100 / 500 / 1000 / 2000) | Eksperimen kedua (10.3–10.8) | [results/experiment-2026-09-22-cpu1-clean/](../../../../../testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean/README.md), sel Multivariate |
| **Repeated Measures** (5000 / 10000 / 20000 / 40000) | Sel RM final (11.4–11.8) | [results/experiment-2026-09-23-cpu1-rm-noise-pcore/](../../../../../testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/README.md) |

Sel RM eksperimen pertama, sel RM eksperimen kedua, eksperimen ulang RM sebelum perubahan kontras dan dataset (`experiment-2026-09-22-cpu1-clean-rm-rerun`, `-rm-rerun-b`), serta run tanpa pin (11.9) **bukan** hasil final. Semuanya tetap disimpan sebagai catatan.

### 11.11 Lokasi berkas (tambahan)

| Isi | Lokasi |
|---|---|
| Validasi SPSS dan bukti per tahap | `testing/glm-rm-reference/results/` (`stage1`–`stage5`, `spss-validation`, `spss-validation-de`, `contrast-default`, `experiment-dataset`) |
| Keluaran SPSS dan sintaks | `testing/glm-rm-reference/spss-output/`, `testing/glm-rm-reference/spss/` |
| Perubahan kode untuk naskah | `testing/glm-rm-reference/results/thesis-impact.md` |
| Sel RM final | `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/` (`runs.csv`, `runs-raw.jsonl`, `analysis/`, `data/`) |
| Pilot ber-pin dan benchmark core | `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore-pilot/` (`pilot-medians.json`, `core-bench.json`) |
| Skrip | `experiment/datasets.cjs` (`repeatedMeasuresRowsNoise`), `run-experiment.cjs --rm-data=noise`, `run-detached.ps1 -Affinity`, `cpu-core-bench.ps1` |

## 12. Tambahan 2026-09-23: sel Multivariate final setelah perbaikan dan validasi SPSS

Bagian 1–11 tidak diubah. Datanya tetap di foldernya masing-masing. Mulai bagian ini, pernyataan di 11.10 tentang sel Multivariate final digantikan oleh 12.8.

### 12.1 Alasan sel Multivariate dijalankan ulang

1. **Jalur komputasi MV berubah.** Modul Multivariate diperbaiki dan divalidasi terhadap SPSS 27 di branch `validation/mv-spss` (baseline `82a63b45`). Hasilnya 1686 dari 1686 nilai SPSS yang punya padanan lulus (toleransi 0,001), untuk tujuh konfigurasi (satu/dua populasi, berpasangan, One-Way, Two-Way seimbang dan tak seimbang, nilai hilang). Rincian ada di [spss-validation/README.md](../../../../../testing/glm-mv-reference/results/spss-validation/README.md), dan daftar perubahan kode untuk naskah di [thesis-impact.md](../../../../../testing/glm-mv-reference/results/thesis-impact.md).

   Isi fungsi WASM dan formatter yang berubah berada di dalam jendela klik OK → `glm-analysis-end`. Perubahan yang paling berpengaruh pada waktu adalah builder desain (`build_design_matrix_and_response`): level faktor kini dihitung sekali per build, bukan per baris. Sebelumnya waktunya kuadratik terhadap n, dan fungsi ini dipanggil per DV di beberapa tabel.

   API publik WASM, `run_analysis`, `shared/glm-execution.ts`, kontrak pesan worker, dan modul Repeated Measures tidak berubah.
2. **Protokol disamakan dengan sel RM final (11.3).** Sel MV eksperimen kedua dijalankan tanpa pin P-core. Sel MV final dijalankan dengan `run-detached.ps1 -Affinity FFF` dan mode daya *Best performance*, sehingga kedua modul final diukur pada kondisi CPU yang sama.

### 12.2 Desain dan kualitas data sel MV final

> **Data:** [experiment-2026-09-23-cpu1-mv-pcore](../../../../../testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore/README.md) · 2026-09-23 22:30–23:34 WIB · build `omPbTrx0Tb3XkYhgNYbYW` (kode aplikasi commit `ab21928c`)

- **Sama dengan eksperimen kedua (10.3):**
  - protokol bersih dan LoAF, CPU 1×, Chromium *headless* 143.0.7499.4;
  - 31 run per mode bergantian, dengan pasangan pertama sebagai startup;
  - konfigurasi dialog Y1..Y5 → Dependent, F1..F3 → Fixed Factor(s), opsi bawaan;
  - dataset `multivariate-100/500/1000/2000.csv` **byte-identik** (md5 sama).
- **Berbeda:** kode MV terperbaiki, pin P-core, mode daya *Best performance*. SPSS, Chrome, dan Word ditutup sebelum mulai.
- **Kualitas:**
  - 248 run, **0 dibuang**, status `ok` di semua run, mode tidak sesuai 0;
  - **4 tabel dan 0 pesan Errors Logs** di semua run;
  - tersimpan = 0 tepat sebelum OK di 248/248 run.
- **Log dirender = 1 setelah run:** 183/248. Semua 65 run dengan log tidak dirender adalah run mode A, dan setiap run itu diikuti `clean_method` = `renav+button`. Gejalanya sama dengan 10.4 (23 kali di eksperimen kedua).
- **Pengecekan perlambatan:** median long task mode A dibanding run pemeriksaan singkat ber-pin: −15,8% (100) dan −5,0% (2000), di bawah batas 30%. Rentang maks/min long task mode A per sel 1,03–1,19, dan tidak ada episode perlambatan seperti 11.9 poin 1.

### 12.3 Hasil steady-state sel MV final

#### 12.3.1 Ringkasan metrik (median [IQR], CPU 1×, n = 30 per mode)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 141,5 [140,0–144,0] | 91,5 [90,0–94,0] | 116,7 [116,7–133,3] | 170,4 [167,6–180,2] | 146,2 [144,6–148,2] |
| Multivariate | 100 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 192,2 [187,2–195,6] | 0,0 [0,0–0,0] |
| Multivariate | 500 | A | 611,0 [608,0–614,8] | 561,0 [558,0–564,8] | 600,0 [587,5–600,0] | 643,9 [639,6–650,0] | 616,6 [613,1–619,4] |
| Multivariate | 500 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 663,3 [659,8–675,8] | 0,0 [0,0–0,0] |
| Multivariate | 1000 | A | 1.239,5 [1.230,5–1.246,2] | 1.189,5 [1.180,5–1.196,2] | 1.216,6 [1.216,6–1.233,3] | 1.278,4 [1.271,8–1.293,7] | 1.244,3 [1.235,7–1.251,2] |
| Multivariate | 1000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 1.277,2 [1.262,0–1.287,5] | 0,0 [0,0–0,0] |
| Multivariate | 2000 | A | 2.403,5 [2.396,2–2.416,5] | 2.353,5 [2.346,2–2.366,5] | 2.383,2 [2.383,2–2.399,9] | 2.444,3 [2.431,3–2.456,5] | 2.408,9 [2.401,8–2.421,8] |
| Multivariate | 2000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 2.429,6 [2.411,6–2.445,8] | 0,0 [0,0–0,0] |

#### 12.3.2 Long task dan LoAF terpanjang: mean (CI 95%), ms

| Modul | n data | Long task A | Long task B | LoAF A | LoAF B |
|---|---|---|---|---|---|
| Multivariate | 100 | 143,2 (141,3–145,0) | 0,0 (0,0–0,0) | 147,6 (145,8–149,4) | 0,0 (0,0–0,0) |
| Multivariate | 500 | 611,6 (610,0–613,3) | 0,0 (0,0–0,0) | 616,5 (614,8–618,1) | 0,0 (0,0–0,0) |
| Multivariate | 1000 | 1.239,5 (1.234,3–1.244,6) | 0,0 (0,0–0,0) | 1.244,3 (1.239,2–1.249,5) | 0,0 (0,0–0,0) |
| Multivariate | 2000 | 2.408,3 (2.401,9–2.414,7) | 0,0 (0,0–0,0) | 2.413,0 (2.406,6–2.419,3) | 0,0 (0,0–0,0) |

#### 12.3.3 Uji statistik (long task terpanjang, H₁: B < A, α = 0,05)

| Modul | n data | CPU | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | 30 / 30 | 0,0 | 5,56·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 500 | 1× | 30 / 30 | 0,0 | 5,88·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 1000 | 1× | 30 / 30 | 0,0 | 5,96·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |
| Multivariate | 2000 | 1× | 30 / 30 | 0,0 | 6,02·10⁻¹³ | 1,000 | tidak diisi | tidak diisi |

#### 12.3.4 Uji tambahan: LoAF terpanjang (H₁: B < A; bukan kriteria §4.5)

| Modul | n data | n A / n B | U (B) | p satu arah | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 30 / 30 | 0,0 | 6,05·10⁻¹³ | 1,000 | 146,2 | 0,0 | 0,0 |
| Multivariate | 500 | 30 / 30 | 0,0 | 6,04·10⁻¹³ | 1,000 | 616,6 | 0,0 | 0,0 |
| Multivariate | 1000 | 30 / 30 | 0,0 | 6,05·10⁻¹³ | 1,000 | 1.244,3 | 0,0 | 0,0 |
| Multivariate | 2000 | 30 / 30 | 0,0 | 6,06·10⁻¹³ | 1,000 | 2.408,9 | 0,0 | 0,0 |

#### 12.3.5 Perbandingan dengan sel MV eksperimen kedua (median long task terpanjang mode A)

| n data | Eksperimen kedua (10.5.1; kode `82a63b45`, tanpa pin) | Sel MV final (kode `ab21928c`, pin P-core) | Rasio |
|---|---|---|---|
| 100 | 348,5 ms | 141,5 ms | 2,5× lebih singkat |
| 500 | 6.162,0 ms | 611,0 ms | 10,1× |
| 1000 | 23.752,5 ms | 1.239,5 ms | 19,2× |
| 2000 | 87.752,5 ms | 2.403,5 ms | 36,5× |

- **Pola pertumbuhan:** dari n = 1000 ke 2000, mode A naik 3,7× di eksperimen kedua (mendekati kuadratik) dan 1,9× di sel final (mendekati linear).
- **Pengaruh pin:** kode dan pin berubah bersamaan, sehingga pengaruh masing-masing tidak dipisahkan. Pada sel RM, pin hanya mengubah median mode A dalam orde puluhan persen (11.9 poin 1), jauh lebih kecil daripada rasio di atas.
- **Mode B tidak berubah:** 0,0 ms di kedua eksperimen dan keempat ukuran.

### 12.4 Run startup sel MV final (pasangan pertama, n = 1 per mode)

| Modul | n data | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 197,0 | 147,0 | 216,7 | 570,2 | 233,6 |
| Multivariate | 100 | B | 0,0 | 0,0 | 16,7 | 226,4 | 0,0 |
| Multivariate | 500 | A | 232,0 | 182,0 | 716,6 | 1.107,7 | 732,7 |
| Multivariate | 500 | B | 0,0 | 0,0 | 16,7 | 707,4 | 0,0 |
| Multivariate | 1000 | A | 293,0 | 243,0 | 1.333,3 | 1.757,4 | 1.347,7 |
| Multivariate | 1000 | B | 0,0 | 0,0 | 16,7 | 1.349,8 | 0,0 |
| Multivariate | 2000 | A | 181,0 | 131,0 | 2.449,9 | 2.792,4 | 2.466,7 |
| Multivariate | 2000 | B | 0,0 | 0,0 | 16,7 | 2.458,0 | 0,0 |

Pola startup mode A sama dengan 10.6:
- LoAF terpanjang mendekati jeda frame terpanjang, sedangkan Long Tasks API hanya mencatat frame pendek (181–293 ms). Frame pendek ini teratribusi ke `#document.onclick` (react-dom).
- Tiap run startup mode A punya 2 frame LoAF (8 frame dari 4 run). Frame terpanjangnya tidak punya skrip teratribusi.
- Mode B startup tanpa long task dan tanpa frame LoAF.

### 12.5 Nilai yang relevan dengan kriteria §4.5 (sel MV final)

Bagian ini hanya menyajikan angka. Kolom keputusan tidak diisi.

**(a) Uji beda.** Ambang yang dipakai: p < 0,05 dan Â₁₂ ≥ 0,71.

| Sel | p | Â₁₂ |
|---|---|---|
| Multivariate 100, 500, 1000, 2000 | 5,56·10⁻¹³ – 6,02·10⁻¹³ | 1,000 |

Keempat sel memenuhi ambang (a) secara angka.

**(b) Mode B.** Ambang yang dipakai: median long task terpanjang < 100 ms di semua ukuran, dan tidak ada long task yang bersumber dari WASM.

1. **Median long task terpanjang mode B (steady-state):**

   | Modul | 100 | 500 | 1000 | 2000 |
   |---|---|---|---|---|
   | Multivariate | 0,0 ms | 0,0 ms | 0,0 ms | 0,0 ms |

   Maks mode B juga 0,0 ms di keempat sel: 0 dari 120 run steady-state dan 0 dari 4 run startup mode B punya long task. Angka ini memenuhi ambang (b).
2. **Median 5 run steady-state pertama → 5 terakhir, mode B:** 0 → 0 ms di keempat ukuran.
3. **Sumber long task / LoAF:** 0 run (A maupun B) punya skrip teratribusi ke chunk glue WASM GLM atau chunk service GLM. Mode B tidak punya frame LoAF sama sekali, sedangkan di eksperimen kedua ada 6 frame steady-state tanpa skrip dan tanpa waktu blokir (10.8). Keterbatasannya sama dengan 10.7 poin 3.

### 12.6 Atribusi LoAF (sel MV final)

| Modul | Mode | Fase | Frame | Frame tanpa skrip | Titik masuk skrip (invoker · invokerType · chunk) | Durasi skrip total (ms) |
|---|---|---|---|---|---|---|
| Multivariate | A | startup | 8 (4 run) | 4 | `#document.onclick` · event-listener · react-dom (4) | 892 |
| Multivariate | A | steady | 120 (120 run) | 0 | `IDBRequest.onsuccess` · event-listener · `9919.*` (120) | 132.075 |
| Multivariate | B | startup | 0 | — | — | — |
| Multivariate | B | steady | 0 | — | — | — |

Rincian ada di `analysis/loaf-runs.csv`, `loaf-attribution.csv`, dan `runs-raw.jsonl` folder final.

### 12.7 Anomali dan keterbatasan

1. **Kode dan kondisi CPU berubah bersamaan** terhadap sel MV eksperimen kedua (12.3.5), sehingga selisih mode A tidak dapat diatribusikan ke satu penyebab. Perbandingan A vs B di dalam sel final tidak terpengaruh, karena A dan B berselang-seling pada kode dan kondisi yang sama.
2. **Log tidak dirender setelah run mode A** (65 run). Gejalanya sama dengan 10.4, dan terjadi di luar jendela pengukuran. Protokol bersih memastikan kondisi awal tiap run tetap 0.
3. **Proses latar:** 7 proses `msedge` yang menganggur masih berjalan selama run (CPU kumulatif < 5 s sebelum mulai). Run pemeriksaan singkat sebelum run penuh (`experiment-2026-09-23-cpu1-mv-pcore-check`, 8 run) dijalankan saat SPSS masih terbuka, jadi bukan data hasil.
4. Sama dengan 10.10 poin 4 dan 7: atribusi LoAF terbatas pada titik masuk skrip; hanya CPU 1× dan Chromium; satu mesin.

### 12.8 Data yang menjadi hasil final

**Hasil final eksperimen Web Worker sekarang adalah sel Multivariate dari 12.2–12.6 dan sel Repeated Measures dari `experiment-2026-09-23-cpu1-rm-noise-pcore` (11.4–11.8).** Keduanya diukur dengan pin P-core (`-Affinity FFF`), mode daya *Best performance*, protokol bersih, LoAF, dan CPU 1×.

| Modul | Hasil final | Lokasi |
|---|---|---|
| **Multivariate** (100 / 500 / 1000 / 2000) | Sel MV final (12.2–12.6) | [results/experiment-2026-09-23-cpu1-mv-pcore/](../../../../../testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore/README.md) |
| **Repeated Measures** (5000 / 10000 / 20000 / 40000) | Sel RM final (11.4–11.8) | [results/experiment-2026-09-23-cpu1-rm-noise-pcore/](../../../../../testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/README.md) |

Sel MV eksperimen pertama dan kedua (10.3–10.8) **bukan lagi** hasil final. Datanya tetap disimpan sebagai catatan, begitu juga data lain yang disebut di 11.10.

### 12.9 Lokasi berkas (tambahan)

| Isi | Lokasi |
|---|---|
| Validasi SPSS MV, hasil per langkah perbaikan | `testing/glm-mv-reference/results/spss-validation/`, `testing/glm-mv-reference/results/fix-steps/` |
| Perubahan kode MV untuk naskah | `testing/glm-mv-reference/results/thesis-impact.md` |
| Sel MV final | `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore/` (`runs.csv`, `runs-raw.jsonl`, `analysis/`, `data/`) |
| Run pemeriksaan singkat (bukan hasil) | `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore-check/` |
