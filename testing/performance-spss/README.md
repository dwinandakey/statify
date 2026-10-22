# Uji performa waktu komputasi: Statify vs IBM SPSS Statistics 27

Uji ini membandingkan waktu komputasi GLM Multivariate dan GLM Repeated Measures di Statify dengan Elapsed Time pada tabel Notes SPSS 27. Kedua perangkat lunak dijalankan di laptop yang sama, dengan data yang sama. Hasil, temuan, dan draf teks skripsi ada di [results/laporan.md](results/laporan.md).

| Prosedur | Kode | Desain data |
|---|---|---|
| One-Way MANOVA | `mv1` | Y1–Y4, faktor A (3 level) |
| Two-Way MANOVA | `mv2` | Y1–Y4, A (3) × B (2), faktorial penuh |
| Pengukuran Berulang | `rm` | t1–t4 (faktor *within* `time`, 4 level, measure `score`), faktor *between* `group` (3 level) |

- **Seri utama:** n = 100, 1.000, 10.000, 100.000, faktor berkode angka (`data/kode`).
- **Seri pelengkap RM:** faktor teks (`data`), n = 100, 1.000, 10.000, 50.000. Impor CSV teks Statify gagal di atas ±63.600 baris (laporan §3.1).
- **Opsi di kedua perangkat lunak:** Type III, *Descriptive statistics*, *Estimates of effect size*, *Observed power*, *Homogeneity tests*, α = 0,05.

## Apa yang diukur

| Ukuran | Sumber | Isi |
|---|---|---|
| SPSS Elapsed Time (**pembanding utama**) | Tabel Notes setiap GLM (OMS → OXML) | Waktu prosedur GLM. Data sudah di-*cache* (`CACHE`/`EXECUTE`) sebelum GLM pertama. |
| SPSS Processor Time | Tabel Notes | Waktu CPU, berlangkah satu *tick* jam Windows (15,625 ms) |
| Statify komputasi saja (**pembanding utama**, fase 2) | `statify/run-compute.cjs` + `statify/harness/` | Waktu *handler* worker produksi: init WASM (hanya run 1), analisis, `get_formatted_results`, `get_all_errors`, `free`. Payload-nya sama dengan yang dikirim UI di fase 1. |
| Statify komputasi + transfer | idem | `postMessage` sampai balasan diterima |
| Statify ujung ke ujung (informasi tambahan, tanpa rasio) | `statify/run-e2e.cjs` (fase 1) | `performance.measure(glm-analysis-start → glm-analysis-end)` lewat UI asli. Dipecah menjadi `prep`, `serialize`, `worker`, dan `post` lewat penyadap `Worker` di sisi tes. |
| Statify build teroptimasi (fase 3) | `statify/worktree.ps1 -Optimized` + `run-phase2.ps1` | Seperti komputasi saja, dengan WASM `opt-level = 3`, `wasm-opt -O3 -g`; hanya di worktree |

Setiap sel terdiri atas 1 run pemanasan dan 10 run terukur.

**Resolusi SPSS.** OXML menyimpan teks `hh:mm:ss.ss` (langkah 10 ms) dan atribut `duration` yang dibulatkan ke 2 angka penting. `spss/extract.py` memakai yang lebih teliti. Sel dengan median SPSS di bawah 3 *tick* (≈ 0,047 dtk) ditandai "di bawah resolusi pengukuran".

## Isi folder

| Path | Isi |
|---|---|
| `data/generate.cjs` | Generator deterministik (mulberry32 + Box–Muller, *seed* tetap). `--codes=numeric` → `data/kode/`. `manifest.json` berisi sha256 setiap CSV. CSV tidak disimpan di git. |
| `spss/make_jobs.py`, `spss/extract.py` | Sintaks `.sps` dan job `.spj` per sel (GLM 11×, OMS Notes semua run + semua tabel run 1); ekstraksi OXML → `spss-runs.csv`, `spss-stats.json` |
| `statify/run-e2e.cjs` | Playwright, UI asli. Memakai `importCsv`, `clearResults`, `openRepeatedMeasures` dari `../glm-web-worker/experiment/run-experiment.cjs`. Merekam payload pada run pemanasan. |
| `statify/harness/` | `page.tsx` dan `timing-probe-{mv,rm}.js`, yang membungkus modul worker produksi tanpa mengubahnya. Hanya disalin ke worktree. |
| `statify/run-compute.cjs` | Runner harness. `--profile=<sel>` merekam satu run tambahan (tidak dihitung) sebagai trace DevTools. |
| `statify/profile-summary.py` | Ringkasan trace: *self time*, tahap inklusif, dan tahap tingkat teratas |
| `statify/worktree.ps1` | Worktree fase 2 (`../statify64-perf`) dan fase 3 (`-Optimized`, `../statify64-opt`): junction `node_modules`, salinan `.env.local`, harness, build. `-Action teardown` membongkarnya. |
| `statify/diagnosis/csv-import-limit.cjs` | Reproduksi batas impor CSV teks (laporan §3.1) |
| `statify/diagnosis/spike-post.cjs` | Diagnosis lonjakan tahap `post` pada `mv1-n100000` run 2 (heap, storage, trace); hasil di `results/diagnosis-spike/` |
| `common.ps1` | Afinitas pohon proses (lihat + pasang), *keep-awake*, menjalankan job SPSS |
| `run-phase1.ps1` | Blok SPSS dan Statify ujung ke ujung berselang-seling per n, dengan pendinginan |
| `run-phase2.ps1` | Statify komputasi saja per n (juga dipakai untuk fase 3 dengan `-Worktree`) |
| `run-utama.ps1` | Rangkaian tanpa pengawasan: fase 1 utama → fase 1 RM teks → fase 2 utama (+profil) → fase 2 RM teks |
| `machine-info.ps1` | Spesifikasi mesin, versi, dan status layanan latar → `results/<label>/machine-*.json` |
| `analyze.py` | Ringkasan (median, Q1–Q3, min, maks, IQR/median, SD/rata-rata), rasio, rincian ujung ke ujung, kesetaraan Wilks, determinisme, lonjakan, dan grafik |
| `analyze_opt.py` | Fase 3: *speedup*, rasio, kesetaraan terhadap SPSS dan terhadap build produksi, grafik |
| `report_tables.py` | Tabel Markdown untuk laporan (`results/tabel-laporan.md`) |
| `spss/<label>/`, `statify/<label>-e2e/`, `statify/<label>-compute/` | Data mentah per label |
| `results/<label>/` | Keluaran analisis per label, `blocks.csv` (jam mulai dan selesai blok), `status.txt` |

**Label.**
- `utama`, `rm-teks`, `opt`: pengukuran yang dilaporkan.
- `validasi-teks`, `validasi-kode`, `validasi-teks-vs-kode`: uji pengodean n = 10.000.
- `sesi-sama-*`: MANOVA teks vs kode dalam satu sesi.
- `profil-teks`: profil MANOVA teks.
- `pilot*`: pilot.

## Mengulang dari awal

Prasyarat:
- SPSS 27 di `C:\Program Files\IBM\SPSS\Statistics\27`;
- `npm install` di akar repo, lalu `npx playwright install chromium`;
- Python 3 dengan `numpy` dan `matplotlib`;
- untuk fase 3: rustup dengan target `wasm32-unknown-unknown` dan `wasm-pack` di `~/.cargo/bin`.

Semua perintah dijalankan dari akar repo.

1. **Data**
   ```bash
   node testing/performance-spss/data/generate.cjs                                       # faktor teks, 4 ukuran
   node testing/performance-spss/data/generate.cjs testing/performance-spss/data 50000   # n = 50.000 untuk seri RM teks
   node testing/performance-spss/data/generate.cjs testing/performance-spss/data/kode 100,1000,10000,100000 --codes=numeric
   ```
2. **Build produksi** (tanpa harness), lalu kembalikan `next-env.d.ts`:
   ```bash
   cd frontend && npx next build && cd .. && git checkout -- frontend/next-env.d.ts
   powershell -File testing\performance-spss\statify\worktree.ps1 -Action setup   # worktree fase 2 + harness
   ```
3. **Siapkan mesin.**
   - Colokkan charger; mode *Best performance*.
   - Jeda Defender *real-time*, Windows Update, OneDrive, dan Windows Search (`Stop-Service WSearch`).
   - Tutup SPSS, Edge, dan aplikasi lain. Pastikan port 3101 kosong.
4. **Fase 1 + 2** (±1 jam 45 menit; afinitas P-core `FFF`, pendinginan 120 dtk):
   ```powershell
   Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "testing\performance-spss\run-utama.ps1"'
   ```
   Pantau `results/utama/driver.txt` dan `results/<label>/status.txt`.
5. **Fase 3**
   ```powershell
   powershell -File testing\performance-spss\statify\worktree.ps1 -Action setup -Optimized
   powershell -File testing\performance-spss\run-phase2.ps1 -Label opt -E2ELabel utama -Worktree "..\statify64-opt" -ProfileCells mv1-n10000,mv2-n10000
   ```
6. **Bongkar worktree dan periksa repo**
   ```powershell
   powershell -File testing\performance-spss\statify\worktree.ps1 -Action teardown -Optimized
   powershell -File testing\performance-spss\statify\worktree.ps1 -Action teardown
   git status --short; git worktree list
   ```
7. **Analisis**
   ```bash
   python testing/performance-spss/analyze.py utama
   python testing/performance-spss/analyze.py rm-teks
   python testing/performance-spss/analyze_opt.py
   python testing/performance-spss/report_tables.py
   python testing/performance-spss/statify/profile-summary.py testing/performance-spss/statify/utama-compute/profiles/mv1-n10000.json
   ```

## Batasan yang disengaja

- **Kode produksi tidak diubah.** Itu mencakup `frontend/components`, `rust/src`, `rust/pkg`, dan `csvWorker.js`. Waktu internal Statify diambil dari *performance mark* yang sudah ada, dari penyadap `Worker` di sisi tes, dan dari probe worker yang hanya ada di worktree.
- **Build teroptimasi hanya ada di worktree fase 3.** `Cargo.toml` di sana diubah, lalu worktree dihapus setelah pengukuran.
- **Harness tidak mengimpor `rust/pkg` GLM.** Alasannya ada di `../glm-web-worker/README.md`.
