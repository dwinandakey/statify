# Verifikasi Web Worker GLM (Multivariate & Repeated Measures)

Skrip, harness, dan hasil verifikasi untuk implementasi Web Worker GLM. Latar belakang dan rancangan ada di [compare_web_workers.md](../../frontend/components/Modals/Analyze/general-linear-model/compare_web_workers.md).

Semua berkas di sini dibuat pada sesi 2026-09-21/22. Berkas-berkas itu **disalin** dari folder kerja sementara, tidak ditulis ulang. Perubahan yang dilakukan saat menyalin:
- path absolut ke mesin penulis dihapus;
- laporan ditulis ke `results/`;
- impor spike diubah ke alias atau path relatif;
- harness ditambah fungsi diagnosis memori;
- `memory-probe-worker.js` ditambahkan sebagai berkas baru.

## Kenapa folder ini ada di `testing/`, bukan di dalam `frontend/`

`next build` memeriksa tipe semua `**/*.ts(x)` di bawah `frontend/` (lihat `frontend/tsconfig.json`). Semua paket WASM GLM di `rust/pkg` bernama sama, `wasm@0.1.0`. TypeScript menganggap paket bernama sama sebagai satu paket, sehingga menambah **satu** impor ke folder `rust/pkg` sudah bisa mengubah paket mana yang "menang". Akibatnya, berkas lain yang tidak disentuh ikut gagal dicek tipenya.

Hal ini teramati pada 2026-09-22. Ketika harness pernah mengimpor `…/multivariate/rust/pkg` secara langsung, dan ketika probe masih berupa berkas `.ts`, `univariate-analysis.ts` gagal di `next build` dengan pesan *"has no exported member named 'UnivariateAnalysis'"*.

Karena itu:
- folder ini diletakkan di luar `frontend/`;
- harness **tidak boleh** mengimpor paket `rust/pkg` GLM mana pun secara langsung;
- probe worker ditulis sebagai `.js`. Berkas ini dimuat lewat `new URL(...)`, sehingga tidak pernah dilihat pemeriksa tipe.

## Isi folder

| Path | Isi |
|---|---|
| `harness/page.tsx` | Halaman harness, diakses lewat `window.__glmHarness`: `runCompute`, `runAnalyze`, `runBadCompute`, `runMemoryMain`, `runMemoryWorkerProbe` |
| `harness/memory-probe-worker.js` | Membungkus modul worker produksi **tanpa mengubahnya**, lalu melaporkan `memory.buffer.byteLength` WASM di dalam worker |
| `spike/` | Spike 3.5: `spike-plain.ts` (nama aman) dan `spike.worker.ts` (nama yang terkena aturan `worker-loader`, **diharapkan gagal**) |
| `scripts/verify-run.cjs` | Verifikasi 4–6: main vs worker identik, tidak ada WASM di main thread pada mode worker, `main-fallback`, dan kegagalan `localStorage` |
| `scripts/verify-extra.cjs` | Kontrol positif penyadap WASM, determinisme run ulang, dan sampel waktu |
| `scripts/verify-errorpath.cjs` | Jalur error: teks error sama dengan mode main, lalu worker dibuat ulang |
| `scripts/memory-diagnosis.cjs` | Diagnosis memori: N run berturut-turut per skenario, dengan waktu dan `memory.buffer.byteLength` WASM per run. Skenario: `mv-main`, `mv-worker-probe`, `mv-worker-service-timing`, `mv-main-forced-gc` (keempatnya default), dan `rm-main` |
| `scripts/spike-run.cjs` | Menjalankan halaman spike |
| `scripts/multivariate-test-diagnosis.mjs` | Diagnosis kegagalan `multivariate.test.ts`: tiap assertion dievaluasi dan dihitung ulang secara independen. **Tidak butuh server.** |
| `scripts/jest-summary.cjs`, `scripts/jest-failures.cjs` | Meringkas keluaran `jest --json` |
| `results/2026-09-22-*` | Hasil yang dikutip di laporan dan dokumen |

## Persiapan

```bash
npm install                       # di root repo; @playwright/test ter-hoist ke node_modules root
npx playwright install chromium   # sekali saja
```

## Menjalankan verifikasi (harness)

1. Salin harness ke rute **sementara**:
   ```bash
   mkdir -p frontend/app/glm-worker-verify
   cp testing/glm-web-worker/harness/page.tsx testing/glm-web-worker/harness/memory-probe-worker.js frontend/app/glm-worker-verify/
   ```
2. Jalankan aplikasi. Hasil yang dilaporkan diambil dari build produksi.
   ```bash
   cd frontend && npx next build && npx next start -p 3101
   ```
   Pastikan port kosong. Server lama yang masih hidup akan membuat skrip tersambung ke build yang salah (halaman harness merespons 404).
3. Dari `testing/glm-web-worker/scripts/`:
   ```bash
   node verify-run.cjs http://localhost:3101 prod
   node verify-extra.cjs http://localhost:3101
   node verify-errorpath.cjs http://localhost:3101
   node memory-diagnosis.cjs http://localhost:3101 10                  # 4 skenario Multivariate (default)
   node memory-diagnosis.cjs http://localhost:3101 10 rm-main,mv-main  # mode main kedua modul
   ```
   Laporan ditulis ke `results/latest/`. Ubah lokasinya dengan variabel `GLM_VERIFY_OUT=<folder>`.
4. **Bersihkan** sesudahnya:
   ```bash
   rm -rf frontend/app/glm-worker-verify
   git checkout -- frontend/next-env.d.ts   # Next.js menulis ulang berkas ini saat build/dev
   ```

## Menjalankan spike

Salin **seluruh** isi `spike/` ke `frontend/app/glm-worker-spike/`, jalankan `next dev` atau build produksi, lalu:
```bash
node testing/glm-web-worker/scripts/spike-run.cjs http://localhost:3100
```
Hapus salinannya sesudah selesai.

Yang perlu diperhatikan:
- Varian `spike.worker.ts` **memang diharapkan gagal**. Di `next dev`, halaman-halaman yang dikompilasi sesudahnya error 500 (*clientReferenceManifest invariant*). Di produksi, worker-nya kosong dan tidak pernah membalas.
- Berkas spike mengimpor `rust/pkg` Multivariate secara langsung, jadi bisa memicu masalah tipe `wasm@0.1.0` di atas. Kalau `next build` gagal karena hal itu, jalankan spike di `next dev` saja.

## Eksperimen A/B (compare_web_workers.md §4)

Eksperimen ini menjalankan **UI aplikasi yang asli** pada build produksi, bukan harness: impor CSV → dialog GLM → klik OK. Jendela pengukuran dimulai dari klik OK (ditangkap di fase *capture* halaman) dan berakhir di `performance.mark("glm-analysis-end")`.

| Berkas | Isi |
|---|---|
| `experiment/datasets.cjs` | Generator dataset deterministik (Multivariate: 5 DV × 3 faktor 4×3×2; Repeated Measures: L level within × M measure, bawaan 5 × 1) |
| `experiment/run-experiment.cjs` | Runner Playwright. Per sel (modul × ukuran × CPU) ada satu *context* dan halaman baru; run bergantian A, B, A, B, … sampai `--runs` per mode; pasangan pertama dicatat sebagai `startup`. Hasil: `runs.csv`, `runs-raw.jsonl` (long task dan frame per run), `environment-*.json`, `log.txt` |
| `experiment/run-detached.ps1` | Menjalankan server dan runner tanpa pengawasan, dan mencegah *sleep* selama berjalan |
| `experiment/inspect-output.cjs` | Pemeriksaan validitas: menyimpan keluaran lengkap analisis dari IndexedDB untuk urutan mode tertentu |
| `experiment/analyze.py` | Statistik (Python, NumPy, SciPy): median, IQR, mean ± CI 95%, Mann–Whitney U satu arah, Vargha–Delaney Â₁₂ |

Menjalankan (build produksi harus sudah ada, tanpa harness di `frontend/app/`):
```powershell
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "testing\glm-web-worker\experiment\run-detached.ps1" -OutDir "<folder hasil>"'
python testing/glm-web-worker/experiment/analyze.py "<folder hasil>/runs.csv" --out "<folder hasil>/analysis"
```

Keputusan desain yang diambil dari pilot (bukti di `results/experiment-pilot-*` dan `results/experiment-inspect*`):
- **Dataset Multivariate tidak memakai generator test performa Jest.** Di generator itu `F3 = i mod 2` ditentukan oleh `F1 = i mod 4`, sehingga model *full factorial* bawaan dialog gagal dengan *"Matrix is singular"*. Generator eksperimen memakai faktor yang tersilang dan seimbang, ditambah *noise* dari PRNG ber-*seed*.
- **Repeated Measures memakai desain within-subject saja** (faktor `time`, 5 level, measure `score`). Dengan faktor between `group`, setiap run mencatat error *"Empty matrices provided for multiplication"*, dan tabel between-subjects berubah setelah run pertama. Aktifkan lagi dengan `RM_BETWEEN=true`.
- **Opsi dialog lain memakai nilai bawaan.**
- **Hanya CPU 1×.** Throttling CDP `Emulation.setCPUThrottlingRate` di Chromium 143 hanya memperlambat main thread, tidak worker (MV-500, steady: A 5,9 → 29,7 detik; B 6,0 → 6,9 detik), sehingga kondisi 4× bias menguntungkan mode B. Selain itu, perkiraan waktunya 7–9 jam tambahan.
- **Setiap run memeriksa keluarannya** (jumlah baris data, jumlah tabel, dan isi tabel "Errors Logs") setelah metrik dikumpulkan, di luar jendela pengukuran.

### Eksperimen kedua: protokol bersih + LoAF

Semua opsi baru punya nilai bawaan yang mereproduksi eksperimen pertama. Opsi bisa diberikan sebagai argumen atau variabel lingkungan (mis. `RM_LEVELS`).

| Opsi runner | Arti |
|---|---|
| `--clean=true` | Sebelum setiap run (di luar jendela), semua hasil dihapus lewat tombol hapus-semua halaman Result (`clear-all-results-button` → `clear-all-confirm`, tanpa *reload*). Kalau store halaman kosong padahal IndexedDB masih berisi log, halaman Result dipasang ulang lewat tab footer Variable → Result. Tepat sebelum OK, jumlah log/analytics/statistics di IndexedDB dan log yang dirender dicek = 0 dan dicatat (`clean_method`, `pre_*`, `post_*` di `runs.csv`). |
| `--loaf=true` | `PerformanceObserver` `long-animation-frame` beserta atribusi skripnya. Entri yang tumpang tindih dengan jendela disimpan di `runs-raw.jsonl`. `runs.csv` mendapat `longest_loaf_ms`, `loaf_count`, `loaf_blocking_ms`, `loaf_glue_scripts`, `loaf_service_scripts`. `environment-*.json` mendapat peta chunk build (`chunks.tags`: glue WASM per modul, service GLM, React, Handsontable, halaman Result). |
| `--rm-levels`, `--rm-measures`, `--rm-options` | Desain Repeated Measures: jumlah level `time`, jumlah measure (`score`, `score2`, …), dan id checkbox dialog Options (mis. `DescStats,EstEffectSize,ObsPower`) |
| `--rm-data=noise` | Dataset Repeated Measures varian *noise* (`datasets.cjs` `repeatedMeasuresRowsNoise`): efek level dan subjek sama, ditambah noise normal independen per sel (seed tetap), sehingga matriks galat nonsingular. Berkas `repeated-measures-<n>-L<l>-M<m>-noise.csv`. Tanpa opsi ini dipakai dataset lama. |
| `--sizes-<modul>` | Ukuran per modul, mis. `--sizes-repeated-measures=5000,10000,20000,40000` |

`run-detached.ps1 -Extra "<opsi runner>"` meneruskan opsi ini. Untuk analisis:
```bash
python testing/glm-web-worker/experiment/analyze.py "<folder>/runs.csv" --out "<folder>/analysis" --raw "<folder>/runs-raw.jsonl" --env "<folder>/environment-<…>.json"
python testing/glm-web-worker/experiment/compare-drift.py <eks1>/analysis/drift.csv <eks2>/analysis/drift.csv
```

Diagnosis dan pilot pendukung:
- `diagnosis/rm-between/`: Repeated Measures dengan faktor between (tangkap payload dari UI asli, replay di Node). Hasil di `results/diagnosis-rm-between-2026-09-22/`.
- `diagnosis/rm-heavier/`: pilot beban Repeated Measures yang lebih berat (`pilot-node.mjs`, `pilot-ui.cjs`, `output-stability.mjs`, `descriptive-raw.mjs`, `summarize-ui.py`). Hasil di `results/pilot-rm-heavier-2026-09-22/`.

## Diagnosis `multivariate.test.ts` (tanpa server)

```bash
node testing/glm-web-worker/scripts/multivariate-test-diagnosis.mjs [folder-keluaran]
```
Skrip ini memuat binary `rust/pkg` Multivariate yang sama dengan Jest dan tidak mengubah test maupun Rust.

## Catatan

- Menjalankan seluruh suite Jest akan menulis ulang beberapa berkas `performance-results-*.json` di repo. Kembalikan dengan `git checkout -- <berkas>` kalau tidak ingin ikut ter-commit.
- Angka waktu di `results/` adalah observasi dari satu mesin (Windows 11, i7-12700H, RAM 24 GB, Chromium dari Playwright). Angka ini bukan hasil eksperimen terkontrol Bab 4.
