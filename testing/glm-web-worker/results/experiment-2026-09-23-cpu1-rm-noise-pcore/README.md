# Sel Repeated Measures final: kode terperbaiki, kontras Polynomial, dataset nonsingular, pin P-core (2026-09-23 00:09–00:48 WIB)

Data ini adalah **hasil final sel Repeated Measures (RM)** eksperimen Web Worker. Sel Multivariate final tetap dari eksperimen kedua (`../experiment-2026-09-22-cpu1-clean/`). Data lama tidak diubah atau dihapus.

## Alasan dijalankan ulang

1. **Kode RM berubah** (branch `fix/rm-correctness`). WASM, service, pemformat, output, dan dialog sama-sama berada di jalur yang diukur. Rinciannya di `testing/glm-rm-reference/results/stage5/README.md` dan `thesis-impact.md`.
2. **Kontras bawaan kini Polynomial**, seperti SPSS (`testing/glm-rm-reference/results/contrast-default/`).
3. **Dataset nonsingular.** Dataset RM lama (`repeatedMeasuresRows`) punya variasi within berpangkat 2, sehingga Mauchly dan Multivariate Tests tidak terhitung dan ada 2 pesan di Errors Logs. Varian *noise* (`repeatedMeasuresRowsNoise`, seed 20260927) memastikan semua tabel dihitung (`testing/glm-rm-reference/results/experiment-dataset/`).

## Protokol

Protokolnya sama dengan eksperimen kedua:
- `--clean=true --loaf=true`;
- CPU 1×, Chromium *headless* 143.0.7499.4;
- 31 run per mode, bergantian A/B, pasangan pertama dihitung sebagai startup.

Argumen: `--modules=repeated-measures --rm-levels=10 --rm-measures=1 --rm-options=DescStats,EstEffectSize,ObsPower --rm-data=noise --sizes-repeated-measures=5000,10000,20000,40000`.

Tambahan dan perbedaannya:
- **Kode:** build produksi `MHninJmEe45iPpG1SPYZ3`, kode aplikasi = commit `182b6f05`. `gitHead` `6ae4905e`; commit sesudahnya hanya mengubah berkas `testing/`.
- **Mode daya Windows:** *Best performance* (overlay AC `ded574b5-…`), laptop tersambung listrik.
- **Pin P-core:** `run-detached.ps1 -Affinity FFF`. PowerShell detached dikunci ke CPU logis 0–11, dan server, node, serta Chromium mewarisinya, sama untuk mode A dan B.
  - Alasannya: i7-12700H adalah CPU hibrida. `experiment/cpu-core-bench.ps1` (`core-bench.json` di `../experiment-2026-09-23-cpu1-rm-noise-pcore-pilot/`) mengukur loop satu thread 1.363–1.453 ms di CPU 0–11 (P-core) dan 4.069–4.159 ms di CPU 12–19 (E-core), sekitar 3× lebih lambat.
  - Tanpa pin, run sebelumnya (`../experiment-2026-09-22-cpu1-rm-noise/`) menunjukkan episode perlambatan ~1,7–2× yang berselang-seling di kedua mode, walaupun mode daya sudah *Best performance*.
- **Dataset:** `data/repeated-measures-<n>-L10-M1-noise.csv`, md5 sama dengan folder pilot dan run tanpa pin.

## Kualitas data

- **248 run** (4 sel × 62), **0 dibuang**, status `ok` di semua run, mode tidak sesuai 0.
- Keluaran: **17 tabel**, **0 pesan Errors Logs** di semua run. Mauchly, Multivariate Tests, dan kontras Linear … Order 9 terisi.
- Pemeriksaan sebelum OK: 248/248 run tercatat 0 (`analysis/clean-check.csv`). Log dirender = 1 setelah semua run.
- **Pengecekan perlambatan** (instruksi: ulangi sel bila median mode A menyimpang > 30% dari pilot). Acuannya pilot ber-pin (`../experiment-2026-09-23-cpu1-rm-noise-pcore-pilot/pilot-medians.json`):

  | n | Median LT A pilot (ms) | Median LT A sel (ms) | Selisih | Rentang LT A sel (ms) |
  |---|---|---|---|---|
  | 5000 | 163,5 | 147,0 | −10,1% | 138–188 |
  | 10000 | 327,5 | 284,0 | −13,3% | 236–328 |
  | 20000 | 590,5 | 547,5 | −7,3% | 456–657 |
  | 40000 | 1.164,5 | 987,5 | −15,2% | 928–1.200 |

  Tidak ada sel yang melewati 30%, jadi tidak ada yang diulang. Rentang maks/min per sel 1,3–1,4, dibanding hingga ~2× tanpa pin. Di sel 10000 dan 20000 masih terlihat dua sub-level (misalnya ~290 dan ~245 ms), dengan *drift* turun (ρ −0,81 dan −0,70).

## Hasil steady-state (median [IQR], n = 30 per mode)

| n | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|
| 5000 | A | 147,0 [144,0–153,0] | 97,0 [94,0–103,0] | 133,3 [116,7–133,3] | 267,1 [258,0–281,3] | 148,4 [145,0–154,2] |
| 5000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 290,4 [275,9–311,4] | 0,0 [0,0–0,0] |
| 10000 | A | 284,0 [247,2–291,8] | 234,0 [197,2–241,8] | 266,6 [216,7–266,7] | 404,9 [351,6–421,6] | 285,1 [248,0–293,2] |
| 10000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 417,2 [363,0–438,1] | 0,0 [0,0–0,0] |
| 20000 | A | 547,5 [473,0–565,5] | 497,5 [423,0–515,5] | 525,0 [450,0–550,0] | 674,2 [580,5–689,8] | 548,2 [473,9–566,9] |
| 20000 | B | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 730,1 [604,9–758,7] | 0,0 [0,0–0,0] |
| 40000 | A | 987,5 [965,5–1.102,8] | 937,5 [915,5–1.052,8] | 966,6 [950,0–1.075,0] | 1.095,7 [1.070,0–1.232,1] | 988,2 [966,8–1.103,5] |
| 40000 | B | 80,0 [73,5–91,5] | 30,0 [23,5–41,5] | 58,4 [50,0–66,7] | 1.160,3 [1.105,3–1.320,0] | 80,9 [74,3–92,7] |

Uji (long task terpanjang, Mann–Whitney satu arah B < A):

| n | U (B) | p satu arah | Â₁₂ | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|
| 5000 | 0,0 | 5,98·10⁻¹³ | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| 10000 | 0,0 | 6,03·10⁻¹³ | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| 20000 | 0,0 | 8,56·10⁻¹³ | 1,000 | 0,0 | 53,0 | tidak diisi | tidak diisi |
| 40000 | 0,0 | 1,49·10⁻¹¹ | 1,000 | 80,0 | 118,0 | tidak diisi | tidak diisi |

Tabel lengkap (mean/CI, startup, LoAF, *drift*) ada di `analysis/tables.md`.

## Angka terhadap kriteria §4.5 (tanpa keputusan)

- **(a)** p < 0,05 dan Â₁₂ ≥ 0,71: keempat sel memenuhi secara angka (p ≤ 1,49·10⁻¹¹, Â₁₂ = 1,000).
- **(b)** Median long task terpanjang mode B < 100 ms di semua ukuran: 0,0 / 0,0 / 0,0 / 80,0 ms, sehingga **memenuhi secara angka**.
  - Di sel 40000, 30 dari 30 run B punya long task, 6 run ≥ 100 ms (maks 118 ms). Di sel 20000, 1 run B punya long task (53 ms).
- **Sumber long task mode B** (atribusi LoAF): 0 run dengan skrip glue WASM GLM atau service GLM di mode A maupun B. Frame mode B di sel 40000 (30 run) dan 20000 (2 run) teratribusi ke `IDBRequest.onsuccess` (`event-listener`) di chunk dashboard bersama `9919.*`.
  - Keterbatasannya sama dengan §10.7 poin 3: LoAF hanya mengatribusi titik masuk skrip. Frame WASM mode A juga teratribusi ke `IDBRequest.onsuccess`.

Kolom "Berpengaruh?" dan "Tujuan 2 tercapai?" tidak diisi.

## Isi folder

`runs.csv`, `runs-raw.jsonl`, `environment-*.json` (dengan `config2.RM_DATA = "noise"` dan peta chunk), `analysis/` (`analyze.py --raw --env`), `data/` (CSV dataset), `log.txt`, `pagelog-*.txt`, `server.log`, `detached-status.txt` (mencatat "processor affinity set to 0xFFF"), `stdout.txt`, `stderr.txt`.
