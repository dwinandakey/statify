# Eksperimen kedua, sel Repeated Measures dijalankan ulang (2026-09-22 17:45–18:24 WIB)

Keempat sel Repeated Measures (RM) eksperimen kedua (`../experiment-2026-09-22-cpu1-clean/`) dijalankan ulang **setelah perbaikan kebenaran modul RM** (branch `fix/rm-correctness`, commit `5fc6dc2c`). Alasannya ada di `testing/glm-rm-reference/results/stage5/README.md`: perbaikan menyentuh jalur yang diukur dan beberapa nilai keluaran berubah.

Data eksperimen kedua **tidak diubah dan tidak dihapus**. Sel Multivariate tidak dijalankan ulang, karena kode Multivariate, `glm-execution.ts`, dan worker tidak berubah (hash sama di `environment-*.json`).

**Perhatian:** sel 20000 dan 40000 di folder ini terkena episode perlambatan mesin (lihat di bawah). Kedua sel itu dijalankan ulang lagi di `../experiment-2026-09-22-cpu1-clean-rm-rerun-b/`. Sel 5000 dan 10000 di folder ini bersih.

## Sama dengan eksperimen kedua

- Protokol dan skrip sama (`run-detached.ps1` → `run-experiment.cjs`), dengan argumen:
  `--modules=repeated-measures --cpu=1 --runs=31 --clean=true --loaf=true --rm-levels=10 --rm-measures=1 --rm-options=DescStats,EstEffectSize,ObsPower --sizes-repeated-measures=5000,10000,20000,40000`
- Chromium Playwright *headless* 143.0.7499.4, CPU 1×, satu *context* per sel, run bergantian A/B sampai 31 run per mode, dengan pasangan pertama sebagai startup.
- Dataset byte-identik dengan `../experiment-2026-09-22-cpu1-clean/data/repeated-measures-*-L10-M1.csv` (md5 di `data-md5.txt`). Karena itu salinan CSV tidak disimpan di sini.

## Berbeda

- **Kode:** `gitHead` `5fc6dc2c`, build produksi `RrP5IPwIQNPBSbRur3Hj6`.
  - Berubah: RM WASM, `repeated-measures-analysis.ts`, pemformat, modul output, dan dialog.
  - Tetap: `glm-execution.ts` dan worker (hash di `environment-*.json`).
- **Keluaran per run: 16 tabel** (sebelumnya 17) dan **2 pesan di Errors Logs** (sebelumnya 0), sama di semua 248 run dan kedua mode:
  - *Multivariate Tests* tidak dihitung, karena matriks SSCP galat singular. Data sintetis `datasets.cjs` hanya punya variasi within-subject berpangkat 2: 10 + 1,5·l + efek subjek + 0,7·sin(s + l). Kode lama tetap mencetak angka yang tidak bermakna (Pillai 1, F 1,4·10²¹) tanpa peringatan.
  - *Mauchly's W* = 0, dengan Chi-Square dan Sig. kosong, karena alasan yang sama. Kode lama mencetak W 6,6·10⁻¹⁰².

## Kualitas data

- **Run: 248** (4 sel × 62). **Dibuang: 0.** Status `ok` di semua run. Mode tidak sesuai: 0. `data_rows` = ukuran sel.
- **Pemeriksaan sebelum OK:** 248/248 run tercatat 0 log, 0 analytics, 0 statistics, dan 0 log dirender (`analysis/clean-check.csv`). `clean_method`: `button` 244, `none` 4 (run 1 tiap sel).
- **Episode perlambatan mesin** (lihat `timestamp` dan `total_time_ms` di `runs.csv`): semua run, **mode A maupun B**, sekitar 2× lebih lambat pada
  - 18:08:32–18:09:30 WIB (sel 20000, run 35–41), dan
  - 18:11:19–18:18:34 WIB (sel 20000 run 53–62, dan sel 40000 run 1–30 termasuk pasangan startup).

  Di luar episode itu, waktu kembali ke tingkat eksperimen kedua. Log Windows tidak menunjukkan penyebabnya: laptop tersambung ke listrik (baterai 100%), tidak ada event perubahan daya, dan tidak ada pemindaian Defender. Kemungkinan penyebabnya *throttling* termal atau aktivitas lain di mesin. Selama episode itu, runner bekerja normal (0 error, 0 log tersisa).
  - Karena A dan B bergantian, episode ini mengenai kedua mode secara seimbang. Uji A vs B tetap jelas (p ≤ 1,5·10⁻¹¹, Â₁₂ = 1), tetapi median/IQR dan *drift* sel 20000 dan 40000 tercemar (IQR A 40000: 904–1.740 ms).
  - Karena itu sel 20000 dan 40000 **dijalankan ulang** di `../experiment-2026-09-22-cpu1-clean-rm-rerun-b/`, tanpa episode serupa. Folder ini tidak diubah.

## Ringkasan (median [IQR], steady-state, n = 30 per mode)

Lengkapnya ada di `analysis/tables.md`. Kolom "Berpengaruh?" dan "Tujuan 2 tercapai?" tidak diisi.

| n | Long task terpanjang A (ms) | B (ms) | Waktu total A (ms) | B (ms) | p satu arah (LT) | Â₁₂ |
|---|---|---|---|---|---|---|
| 5000 | 121,5 [120,0–123,8] | 0,0 [0,0–0,0] | 214,9 [212,8–228,8] | 224,4 [216,7–230,4] | 5,6·10⁻¹³ | 1,000 |
| 10000 | 228,0 [225,0–231,0] | 0,0 [0,0–0,0] | 326,1 [324,6–329,7] | 341,8 [339,0–345,5] | 5,9·10⁻¹³ | 1,000 |
| 20000 ⚠ | 467,0 [455,5–865,5] | 0,0 [0,0–0,0] | 570,9 [563,9–1.054,2] | 586,5 [574,8–946,0] | 3,9·10⁻¹² | 1,000 |
| 40000 ⚠ | 942,0 [904,2–1.739,8] | 84,0 [80,0–128,5] | 1.049,8 [1.009,9–1.931,8] | 1.095,2 [1.056,1–2.041,0] | 1,5·10⁻¹¹ | 1,000 |

⚠ = terkena episode perlambatan; gunakan `../experiment-2026-09-22-cpu1-clean-rm-rerun-b/`.

## Isi folder

Sama dengan eksperimen kedua: `runs.csv`, `runs-raw.jsonl`, `environment-*.json` (dengan peta chunk), `analysis/` (keluaran `analyze.py --raw --env`), `log.txt`, `pagelog-*.txt`, `server.log`, `detached-status.txt`, `stdout.txt`, `stderr.txt`, dan `data-md5.txt`.
