## Ringkasan metrik (steady-state; median [IQR])

| Modul | n data | CPU | Mode | n run | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | 1× | A | 30 | 460,0 [458,2–465,0] | 410,0 [408,2–415,0] | 433,3 [433,3–450,0] | 574,8 [562,8–578,5] | 460,9 [459,3–466,2] |
| Repeated Measures | 20000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 577,2 [571,6–592,5] | 0,0 [0,0–0,0] |
| Repeated Measures | 40000 | 1× | A | 30 | 893,0 [886,5–901,0] | 843,0 [836,5–851,0] | 866,6 [866,6–883,3] | 995,3 [993,4–1.008,5] | 894,1 [888,3–901,9] |
| Repeated Measures | 40000 | 1× | B | 30 | 82,0 [80,0–85,0] | 32,0 [30,0–35,0] | 66,7 [50,0–66,7] | 1.055,3 [1.042,0–1.060,4] | 83,2 [81,0–85,9] |

## Mean dan CI 95% (steady-state)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | 1× | A | 478,8 (449,8–507,9) | 428,8 (399,8–457,9) | 456,1 (426,8–485,4) | 588,4 (555,3–621,5) | 479,8 (450,8–508,8) |
| Repeated Measures | 20000 | 1× | B | 3,4 (-1,2–8,1) | 0,1 (-0,0–0,2) | 17,8 (16,3–19,3) | 581,4 (575,7–587,0) | 4,3 (-1,6–10,2) |
| Repeated Measures | 40000 | 1× | A | 895,2 (889,6–900,8) | 845,2 (839,6–850,8) | 872,7 (867,0–878,5) | 1.000,6 (994,5–1.006,7) | 896,2 (890,7–901,8) |
| Repeated Measures | 40000 | 1× | B | 84,3 (81,8–86,8) | 34,3 (31,8–36,8) | 62,2 (58,4–66,1) | 1.057,4 (1.045,1–1.069,8) | 85,3 (82,7–87,9) |

## Uji statistik (long task terpanjang, H₁: B < A)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 1,153e-12 | 1,000 | 0,0 | 52,0 | tidak diisi | tidak diisi |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,464e-11 | 1,000 | 82,0 | 107,0 | tidak diisi | tidak diisi |

## Uji tambahan (LoAF terpanjang, H₁: B < A; bukan kriteria §4.5)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 1,181e-12 | 1,000 | 460,9 | 0,0 | 65,0 |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,504e-11 | 1,000 | 894,1 | 83,2 | 108,1 |

## Run startup (pasangan pertama; n = 1 per mode)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | 1× | A | 0,0 | 0,0 | 650,0 | 946,8 | 668,3 |
| Repeated Measures | 20000 | 1× | B | 0,0 | 0,0 | 16,7 | 640,4 | 0,0 |
| Repeated Measures | 40000 | 1× | A | 71,0 | 21,0 | 1.133,3 | 1.504,5 | 1.161,6 |
| Repeated Measures | 40000 | 1× | B | 108,0 | 58,0 | 83,3 | 1.188,6 | 108,7 |

## Drift terhadap nomor run (steady-state; Spearman ρ, kemiringan ms/run, median 5 run pertama → 5 terakhir)

| Modul | n data | Mode | Metrik | ρ | kemiringan (ms/run) | median awal → akhir (ms) |
|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | A | Long task terpanjang (ms) | -0,32 | 1,2 | 464,0 → 459,0 |
| Repeated Measures | 20000 | A | Waktu total (ms) | -0,56 | 1,2 | 578,0 → 562,8 |
| Repeated Measures | 20000 | A | LoAF terpanjang (ms) | -0,31 | 1,2 | 464,9 → 460,1 |
| Repeated Measures | 20000 | B | Long task terpanjang (ms) | -0,02 | -0,0 | 0,0 → 0,0 |
| Repeated Measures | 20000 | B | Waktu total (ms) | -0,47 | -0,3 | 596,2 → 574,5 |
| Repeated Measures | 20000 | B | LoAF terpanjang (ms) | -0,04 | -0,0 | 0,0 → 0,0 |
| Repeated Measures | 40000 | A | Long task terpanjang (ms) | -0,46 | -0,5 | 902,0 → 880,0 |
| Repeated Measures | 40000 | A | Waktu total (ms) | -0,50 | -0,6 | 1.008,4 → 979,5 |
| Repeated Measures | 40000 | A | LoAF terpanjang (ms) | -0,46 | -0,5 | 903,2 → 881,0 |
| Repeated Measures | 40000 | B | Long task terpanjang (ms) | -0,32 | -0,1 | 84,0 → 81,0 |
| Repeated Measures | 40000 | B | Waktu total (ms) | -0,49 | -0,7 | 1.060,9 → 1.029,0 |
| Repeated Measures | 40000 | B | LoAF terpanjang (ms) | -0,31 | -0,1 | 85,3 → 82,1 |

## Verifikasi protokol bersih (semua run sel, termasuk startup)

| Modul | n data | Run | Dicek sebelum OK | Tersimpan = 0 sebelum OK | Log tersimpan = 1 setelah run | Log dirender = 1 setelah run |
|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | 62 | 62 | 62 | 62 | 62 |
| Repeated Measures | 40000 | 62 | 62 | 62 | 62 | 62 |

## LoAF per run: skrip glue WASM / service GLM di main thread (steady-state)

| Modul | n data | Mode | Run | Run dgn skrip glue WASM | Run dgn skrip service GLM | Sumber skrip terlama di LoAF terpanjang (jumlah run) |
|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 20000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (28); chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (2) |
| Repeated Measures | 40000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 40000 | B | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |

## Atribusi skrip LoAF mode B (steady-state; total durasi skrip per sumber, 5 teratas per sel)

| Modul | n data | Sumber | invokerType | Skrip | Durasi skrip total (ms) | Run |
|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 2 | 103,0 | 2 |
| Repeated Measures | 20000 | (tanpa sourceURL) | user-callback | 2 | 23,0 | 2 |
| Repeated Measures | 40000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 30 | 2.528,0 | 30 |

Run yang dibuang: 0 (lihat excluded-runs.csv).

Pustaka: Python 3.11.0, NumPy 2.0.2, SciPy 1.14.1.
