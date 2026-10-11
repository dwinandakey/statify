# Sel Multivariate final: kode tervalidasi SPSS, pin P-core (2026-09-23 22:30–23:34 WIB)

Data ini adalah **hasil final sel Multivariate (MV)** eksperimen Web Worker. Sel Repeated Measures final tetap dari `../experiment-2026-09-23-cpu1-rm-noise-pcore/`. Data lama, termasuk sel MV eksperimen kedua di `../experiment-2026-09-22-cpu1-clean/`, tidak diubah atau dihapus. Ringkasannya ada di `frontend/components/Modals/Analyze/general-linear-model/result_compare.md` §12.

## Alasan dijalankan ulang

1. **Jalur komputasi MV berubah.** Perbaikan di branch `validation/mv-spss` (baseline `82a63b45`) mengubah isi fungsi WASM MV dan formatter, yang semuanya berada di dalam jendela klik OK → `glm-analysis-end`. Rinciannya ada di `testing/glm-mv-reference/results/thesis-impact.md`. Yang paling berpengaruh pada waktu:
   - Builder desain (`build_design_matrix_and_response`) kini menghitung level faktor sekali per build. Sebelumnya dihitung per baris, sehingga waktunya kuadratik terhadap n.
   - H uji multivariat kini dihitung dari fit matriks.
   - Listwise deletion dan Descriptive Statistics bertingkat ditambahkan.
2. **Protokol disamakan dengan sel RM final.** Pin P-core (`-Affinity FFF`) dan mode daya *Best performance*. Sel MV eksperimen kedua dijalankan tanpa pin.

## Protokol

Protokolnya sama dengan eksperimen kedua dan sel RM final:
- `--clean=true --loaf=true`;
- CPU 1×, Chromium *headless* 143.0.7499.4;
- 31 run per mode, bergantian A/B, pasangan pertama dihitung sebagai startup.

Argumen: `--modules=multivariate --sizes=100,500,1000,2000 --cpu=1 --runs=31`. Konfigurasi dialog: Y1..Y5 → Dependent, F1..F3 → Fixed Factor(s), opsi lain bawaan dialog (`openMultivariate` di `run-experiment.cjs`, tidak berubah).

- **Kode:** build produksi `omPbTrx0Tb3XkYhgNYbYW`, kode aplikasi = commit `ab21928c` (`gitHead` `37851d51`; commit sesudahnya hanya mengubah dokumen di `testing/`). WASM MV di build: `wasm_bg.93fac433.wasm` (eksperimen kedua: `wasm_bg.6c6ecfdf.wasm`).
- **Dataset:** `data/multivariate-<n>.csv`, **byte-identik** dengan eksperimen kedua. md5:
  - 100: `40a286f0…`
  - 500: `4a941b50…`
  - 1000: `ae8f0cfb…`
  - 2000: `8961ccba…`

  Desain faktorial 4 × 3 × 2, semua 24 sel terisi, tidak ada nilai hilang.
- **Mode daya Windows:** *Best performance* (overlay AC `ded574b5-…`), laptop tersambung listrik (baterai 100%).
- **Pin P-core:** `run-detached.ps1 -Affinity FFF`. `detached-status.txt` mencatat "processor affinity set to 0xFFF".
- **Proses lain:** SPSS, Chrome, dan Word ditutup sebelum mulai. Tersisa 7 proses `msedge` yang menganggur (CPU kumulatif < 5 s), dan beban CPU 1% sebelum mulai.

## Kualitas data

- **248 run** (4 sel × 62), **0 dibuang**.
  - Status `ok` dan `valid` di semua run, mode tidak sesuai 0.
  - `data_rows` = ukuran sel di semua run.
  - **4 tabel** dan **0 pesan Errors Logs** di semua run, sama dengan eksperimen kedua.
- **Pemeriksaan sebelum OK:** tersimpan = 0 (logs, analytics, statistics, log dirender) di 248/248 run (`analysis/clean-check.csv`). Log tersimpan = 1 setelah run di 248/248.
- **Log dirender = 1 setelah run:** 41/44/52/46 run (MV-100/500/1000/2000).
  - Semua 65 run dengan `post_dom_logs` = 0 adalah run mode A.
  - Semua 65 `clean_method` = `renav+button` terjadi tepat setelah run mode A tersebut.
  - Ini gejala yang sama dengan eksperimen kedua (§10.4 di `result_compare.md`: 23 kali, semuanya setelah MV mode A). Protokol bersih menangani gejala itu sebelum run berikutnya.
- **Pengecekan perlambatan.** Acuannya run pemeriksaan singkat (`../experiment-2026-09-23-cpu1-mv-pcore-check/`, n = 1 run steady per mode, dengan pin). Median LT A sel dibanding run itu:

  | n | LT A run pemeriksaan (ms) | Median LT A sel (ms) | Selisih |
  |---|---|---|---|
  | 100 | 168,0 | 141,5 | −15,8% |
  | 2000 | 2.529,0 | 2.403,5 | −5,0% |

  Tidak ada sel yang melewati 30%. Rentang maks/min long task mode A per sel adalah 1,19 / 1,03 / 1,05 / 1,04. Tidak ada episode perlambatan.

## Hasil steady-state (median [IQR], n = 30 per mode)

| n | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|
| 100 | A | 141,5 [140,0–144,0] | 91,5 [90,0–94,0] | 116,7 [116,7–133,3] | 170,4 [167,6–180,2] | 146,2 [144,6–148,2] |
| 100 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 192,2 [187,2–195,6] | 0,0 [0,0–0,0] |
| 500 | A | 611,0 [608,0–614,8] | 561,0 [558,0–564,8] | 600,0 [587,5–600,0] | 643,9 [639,6–650,0] | 616,6 [613,1–619,4] |
| 500 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 663,3 [659,8–675,8] | 0,0 [0,0–0,0] |
| 1000 | A | 1.239,5 [1.230,5–1.246,2] | 1.189,5 [1.180,5–1.196,2] | 1.216,6 [1.216,6–1.233,3] | 1.278,4 [1.271,8–1.293,7] | 1.244,3 [1.235,7–1.251,2] |
| 1000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 1.277,2 [1.262,0–1.287,5] | 0,0 [0,0–0,0] |
| 2000 | A | 2.403,5 [2.396,2–2.416,5] | 2.353,5 [2.346,2–2.366,5] | 2.383,2 [2.383,2–2.399,9] | 2.444,3 [2.431,3–2.456,5] | 2.408,9 [2.401,8–2.421,8] |
| 2000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 2.429,6 [2.411,6–2.445,8] | 0,0 [0,0–0,0] |

Uji (long task terpanjang, Mann–Whitney satu arah B < A): U (B) = 0,0 dan Â₁₂ = 1,000 di keempat sel. Nilai p: 5,56·10⁻¹³ (100), 5,88·10⁻¹³ (500), 5,96·10⁻¹³ (1000), 6,02·10⁻¹³ (2000). Median B dan maks B 0,0 ms di semua sel. Kolom "Berpengaruh?" dan "Tujuan 2 tercapai?" tidak diisi.

Tabel lengkap (mean/CI, startup, LoAF, *drift*) ada di `analysis/tables.md`.

## Angka terhadap kriteria §4.5 (tanpa keputusan)

- **(a)** p < 0,05 dan Â₁₂ ≥ 0,71: keempat sel memenuhi secara angka.
- **(b)** Median long task terpanjang mode B < 100 ms di semua ukuran: 0,0 ms di keempat sel. Mode B tidak punya long task maupun frame LoAF sama sekali, di steady-state maupun startup (0 dari 124 run).
- **Sumber:** 0 run (A maupun B) dengan skrip glue WASM atau service GLM di LoAF. Frame mode A steady-state (120) teratribusi ke `IDBRequest.onsuccess` di `9919.*` (keterbatasan atribusi titik masuk, sama dengan §10.7 poin 3).

## Isi folder

- Data mentah: `runs.csv`, `runs-raw.jsonl`, `environment-*.json`.
- Analisis: `analysis/` (`analyze.py runs.csv --raw runs-raw.jsonl --env environment-*.json`).
- Dataset: `data/` (CSV).
- Log: `log.txt`, `pagelog-*.txt`, `server.log`, `detached-status.txt`, `stdout.txt`, `stderr.txt`.
