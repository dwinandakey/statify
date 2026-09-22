# Eksperimen A/B GLM kedua, protokol bersih, CPU 1× (2026-09-22 10:33–14:03 WIB)

Eksperimen ini dirancang **setelah** eksperimen pertama (`../experiment-2026-09-22-cpu1/`) untuk menghilangkan *confounder* yang ditemukan di sana: halaman Result merender semua keluaran yang menumpuk, sehingga terjadi *drift*. Eksperimen ini **tidak menggantikan** eksperimen pertama, dan data eksperimen pertama tidak diubah.

Protokol dan skrip ada di [../../experiment](../../experiment) dan [../../README.md](../../README.md). Ringkasan hasil ada di `frontend/components/Modals/Analyze/general-linear-model/result_compare.md` §10.

## Yang sama dengan eksperimen pertama

- Build produksi yang sama (`BUILD_ID` di `environment-*.json`), dan hash kode yang diuji sama.
- Chromium Playwright *headless* dengan CPU 1×.
- Satu *context* dan halaman per sel, run bergantian A, B sampai 31 run per mode, dan pasangan pertama sebagai startup.
- Jendela pengukuran dari klik OK sampai `glm-analysis-end`, dengan metrik dan statistik yang sama.
- Dataset Multivariate 100/500/1000/2000 (byte-identik dengan eksperimen pertama).
- Urutan modul: Repeated Measures, lalu Multivariate.

## Yang berbeda

1. **Protokol bersih** (`--clean=true`). Sebelum setiap run, di luar jendela:
   - semua hasil dihapus dengan tombol hapus-semua milik halaman Result (`clearAll()`: logs, analytics, statistics), tanpa *reload*;
   - runner menunggu sampai *toast* hilang;
   - tepat sebelum OK, IndexedDB (logs/analytics/statistics) dan log yang dirender dicek = 0 dan dicatat di `runs.csv` (`pre_*`). Kalau tidak 0, run ditolak.

   Kolom `clean_method` berisi:
   - `none`: tidak ada yang tersimpan (run 1);
   - `button`: dihapus dengan tombol;
   - `renav+button`: store halaman kosong padahal IndexedDB berisi log, jadi halaman Result dipasang ulang lewat tab footer Variable → Result lalu tombol dipakai (lihat catatan).

   `post_logs`/`post_dom_logs` adalah jumlah log tersimpan dan dirender setelah run, dicatat setelah halaman diberi waktu ≤ 10 s untuk merender.
2. **LoAF** (`--loaf=true`). `PerformanceObserver("long-animation-frame")` berjalan bersama Long Tasks. Entri yang tumpang tindih dengan jendela, beserta atribusi skripnya, ada di `runs-raw.jsonl`. `runs.csv` mendapat `longest_loaf_ms`, `loaf_count`, `loaf_blocking_ms`, `loaf_glue_scripts`, dan `loaf_service_scripts`.
3. **Repeated Measures lebih berat** (pilot di `../pilot-rm-heavier-2026-09-22/`):
   - within-only, `time` 10 level, 1 measure, opsi Descriptive statistics + Estimates of effect size + Observed power;
   - n = 5000/10000/20000/40000 subjek;
   - dataset dari `datasets.cjs` (`repeated-measures-<n>-L10-M1.csv`).

## Isi folder

| Berkas | Isi |
|---|---|
| `runs.csv` | Satu baris per run (8 sel × 62), berisi kolom eksperimen pertama ditambah kolom protokol bersih dan LoAF |
| `runs-raw.jsonl` | Long task, frame rAF, dan entri LoAF (dengan `scripts`: `invoker`, `invokerType`, `sourceURL`, `sourceFunctionName`, `duration`, …) per run |
| `environment-*.json` | Lingkungan, hash kode, `BUILD_ID`, `config2`, dan peta chunk build saat eksperimen dimulai |
| `chunk-map.json` | Peta chunk yang dihitung ulang dari build yang sama setelah eksperimen, dengan dua tag tambahan (`react-dom`, `modal-registry`) untuk label atribusi |
| `analysis/` | Keluaran `analyze.py` (`tables.md`, `summary.csv`, `tests.csv`, `drift.csv`, `excluded-runs.csv`, `clean-check.csv`, `loaf-attribution.csv`, `loaf-runs.csv`, `analysis.json`) dan `drift-vs-exp1.md` (`compare-drift.py`) |
| `data/` | CSV dataset yang diimpor |
| `log.txt`, `pagelog-*.txt`, `server.log`, `detached-status.txt`, `error-*.png` | Log runner, konsol halaman, server, skrip *detached*, dan *screenshot* run yang gagal |

## Catatan untuk membaca data

- **Run: 496** (8 sel × 62). **Dibuang: 1** (`analysis/excluded-runs.csv`): Repeated Measures 10000, run 7 (A). Dialog hanya berisi 5 dari 10 slot within setelah diisi (drag tidak terdaftar, `error-repeated-measures-10000-cpu1-run7.png`), jadi run ditolak sebelum OK. Sel itu punya 29 run steady-state mode A.
- Mode tidak sesuai: 0. `main-fallback`: 0. Error pada keluaran analisis: 0. `data_rows` = ukuran sel di semua run. Jumlah tabel: 4 (Multivariate) dan 17 (Repeated Measures) di semua run.
- **Pemeriksaan sebelum OK:** 495/495 run yang sampai ke OK tercatat 0 log, 0 analytics, 0 statistics, dan 0 log dirender (`analysis/clean-check.csv`).
- **`clean_method`:**
  - `none` 9 kali: run 1 tiap sel, dan run setelah run yang ditolak;
  - `button` 464 kali;
  - `renav+button` 23 kali, **semuanya tepat setelah run Multivariate mode A**. Di run-run mode A itu (`post_dom_logs` = 0: MV-100 14, MV-500 5, MV-1000 1, MV-2000 3), log tersimpan di IndexedDB tetapi halaman Result tidak merendernya.
  - Dugaan urutannya: dialog Multivariate ditutup saat OK, halaman Result dipasang ulang, lalu `loadResults()` membaca IndexedDB sebelum perhitungan main thread selesai. Hasil baca yang kosong itu menimpa store setelah `addLog`. Di Repeated Measures (dialog tetap terbuka sampai selesai) hal ini tidak terjadi.
- **LoAF mode B Multivariate:** 6 frame steady-state (MV-1000: 3, MV-2000: 3; 51–229 ms) dan 1 frame startup (MV-2000, 212 ms) berdurasi ≥ 50 ms dengan `blockingDuration` 0 dan tanpa skrip teratribusi. Long task mode B di sel yang sama: 0.
- **Atribusi LoAF** hanya menyebut **titik masuk** skrip (callback), bukan fungsi di dalamnya.
  - Pada mode A steady-state, frame panjang yang memuat perhitungan WASM teratribusi ke `IDBRequest.onsuccess` (`event-listener`) di chunk dashboard bersama `9919.*.js`, bukan ke chunk glue WASM (`2965.*`/`8520.*`) atau chunk service GLM (`3910.*`/`4918.*`). Jadi kolom `loaf_glue_scripts`/`loaf_service_scripts` = 0 juga berlaku untuk mode A.
  - Pada mode B Repeated Measures 40000, frame ~100 ms memiliki atribusi yang sama (`IDBRequest.onsuccess`, 9919).
- **Startup mode A:** LoAF mencatat blok yang tidak tercatat oleh Long Tasks API (mis. MV-2000: long task 201 ms, LoAF 92.012 ms; RM-20000: long task 0, LoAF 600 ms). Frame itu tidak punya skrip teratribusi. Pada Multivariate, frame lain yang lebih pendek teratribusi ke `#document.onclick` (react-dom, `c7879cf7-*.js`), dan durasinya sesuai dengan long task yang tercatat.
- **Konsol halaman:** hanya peringatan (CSS *preload*, `DialogContent` tanpa `Description`, Handsontable *destroyed*, *upgrade* IndexedDB, "DataTable slow update"). Tidak ada error.
