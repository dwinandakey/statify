## Ringkasan metrik (steady-state; median [IQR])

| Modul | n data | CPU | Mode | n run | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 30 | 147,0 [144,0–153,0] | 97,0 [94,0–103,0] | 133,3 [116,7–133,3] | 267,1 [258,0–281,3] | 148,4 [145,0–154,2] |
| Repeated Measures | 5000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 290,4 [275,9–311,4] | 0,0 [0,0–0,0] |
| Repeated Measures | 10000 | 1× | A | 30 | 284,0 [247,2–291,8] | 234,0 [197,2–241,8] | 266,6 [216,7–266,7] | 404,9 [351,6–421,6] | 285,1 [248,0–293,2] |
| Repeated Measures | 10000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 417,2 [363,0–438,1] | 0,0 [0,0–0,0] |
| Repeated Measures | 20000 | 1× | A | 30 | 547,5 [473,0–565,5] | 497,5 [423,0–515,5] | 525,0 [450,0–550,0] | 674,2 [580,5–689,8] | 548,2 [473,9–566,9] |
| Repeated Measures | 20000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 730,1 [604,9–758,7] | 0,0 [0,0–0,0] |
| Repeated Measures | 40000 | 1× | A | 30 | 987,5 [965,5–1.102,8] | 937,5 [915,5–1.052,8] | 966,6 [950,0–1.075,0] | 1.095,7 [1.070,0–1.232,1] | 988,2 [966,8–1.103,5] |
| Repeated Measures | 40000 | 1× | B | 30 | 80,0 [73,5–91,5] | 30,0 [23,5–41,5] | 58,4 [50,0–66,7] | 1.160,3 [1.105,3–1.320,0] | 80,9 [74,3–92,7] |

## Mean dan CI 95% (steady-state)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 150,4 (146,5–154,3) | 100,4 (96,5–104,3) | 127,8 (123,3–132,3) | 271,0 (264,6–277,4) | 151,7 (147,7–155,8) |
| Repeated Measures | 5000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 292,8 (285,5–300,0) | 0,0 (0,0–0,0) |
| Repeated Measures | 10000 | 1× | A | 274,4 (263,9–284,9) | 224,4 (213,9–234,9) | 252,2 (241,3–263,2) | 391,6 (376,7–406,5) | 275,4 (264,8–285,9) |
| Repeated Measures | 10000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 405,3 (389,5–421,1) | 0,0 (0,0–0,0) |
| Repeated Measures | 20000 | 1× | A | 526,8 (507,6–546,0) | 476,8 (457,6–496,0) | 503,9 (483,8–523,9) | 646,3 (624,7–667,9) | 527,9 (508,7–547,1) |
| Repeated Measures | 20000 | 1× | B | 1,8 (-1,7–5,2) | 0,1 (-0,1–0,3) | 18,4 (16,5–20,2) | 691,1 (662,7–719,5) | 3,5 (-1,3–8,2) |
| Repeated Measures | 40000 | 1× | A | 1.029,0 (998,0–1.060,0) | 979,0 (948,0–1.010,0) | 1.006,6 (975,3–1.038,0) | 1.144,8 (1.111,5–1.178,2) | 1.030,1 (999,1–1.061,1) |
| Repeated Measures | 40000 | 1× | B | 84,8 (79,9–89,7) | 34,8 (29,9–39,7) | 63,3 (57,6–69,1) | 1.205,2 (1.161,7–1.248,6) | 85,8 (80,9–90,8) |

## Uji statistik (long task terpanjang, H₁: B < A)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 5,980e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 6,029e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 8,560e-13 | 1,000 | 0,0 | 53,0 | tidak diisi | tidak diisi |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,494e-11 | 1,000 | 80,0 | 118,0 | tidak diisi | tidak diisi |

## Uji tambahan (LoAF terpanjang, H₁: B < A; bukan kriteria §4.5)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 6,049e-13 | 1,000 | 148,4 | 0,0 | 0,0 |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 6,059e-13 | 1,000 | 285,1 | 0,0 | 0,0 |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 1,182e-12 | 1,000 | 548,2 | 0,0 | 53,8 |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,508e-11 | 1,000 | 988,2 | 80,9 | 118,9 |

## Run startup (pasangan pertama; n = 1 per mode)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 0,0 | 0,0 | 300,0 | 671,3 | 320,1 |
| Repeated Measures | 5000 | 1× | B | 0,0 | 0,0 | 16,7 | 354,6 | 0,0 |
| Repeated Measures | 10000 | 1× | A | 0,0 | 0,0 | 516,6 | 851,9 | 536,8 |
| Repeated Measures | 10000 | 1× | B | 0,0 | 0,0 | 16,7 | 518,1 | 0,0 |
| Repeated Measures | 20000 | 1× | A | 0,0 | 0,0 | 750,0 | 1.095,1 | 777,2 |
| Repeated Measures | 20000 | 1× | B | 0,0 | 0,0 | 16,7 | 792,0 | 0,0 |
| Repeated Measures | 40000 | 1× | A | 63,0 | 13,0 | 1.166,6 | 1.520,0 | 1.195,2 |
| Repeated Measures | 40000 | 1× | B | 74,0 | 24,0 | 50,0 | 1.162,9 | 74,4 |

## Drift terhadap nomor run (steady-state; Spearman ρ, kemiringan ms/run, median 5 run pertama → 5 terakhir)

| Modul | n data | Mode | Metrik | ρ | kemiringan (ms/run) | median awal → akhir (ms) |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | A | Long task terpanjang (ms) | -0,28 | -0,3 | 164,0 → 145,0 |
| Repeated Measures | 5000 | A | Waktu total (ms) | -0,50 | -0,6 | 299,7 → 264,5 |
| Repeated Measures | 5000 | A | LoAF terpanjang (ms) | -0,29 | -0,3 | 164,9 → 145,7 |
| Repeated Measures | 5000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 5000 | B | Waktu total (ms) | -0,61 | -0,7 | 318,1 → 277,9 |
| Repeated Measures | 5000 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 10000 | A | Long task terpanjang (ms) | -0,81 | -1,4 | 316,0 → 241,0 |
| Repeated Measures | 10000 | A | Waktu total (ms) | -0,82 | -2,0 | 440,6 → 345,0 |
| Repeated Measures | 10000 | A | LoAF terpanjang (ms) | -0,82 | -1,4 | 317,4 → 241,5 |
| Repeated Measures | 10000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 10000 | B | Waktu total (ms) | -0,70 | -1,9 | 455,5 → 366,8 |
| Repeated Measures | 10000 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 20000 | A | Long task terpanjang (ms) | -0,70 | -2,2 | 571,0 → 479,0 |
| Repeated Measures | 20000 | A | Waktu total (ms) | -0,63 | -2,4 | 705,0 → 590,4 |
| Repeated Measures | 20000 | A | LoAF terpanjang (ms) | -0,71 | -2,2 | 572,1 → 479,9 |
| Repeated Measures | 20000 | B | Long task terpanjang (ms) | 0,01 | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 20000 | B | Waktu total (ms) | -0,72 | -3,2 | 767,0 → 603,0 |
| Repeated Measures | 20000 | B | LoAF terpanjang (ms) | -0,18 | -0,1 | 0,0 → 0,0 |
| Repeated Measures | 40000 | A | Long task terpanjang (ms) | -0,05 | 0,5 | 977,0 → 1.116,0 |
| Repeated Measures | 40000 | A | Waktu total (ms) | -0,02 | 0,7 | 1.091,7 → 1.245,0 |
| Repeated Measures | 40000 | A | LoAF terpanjang (ms) | -0,05 | 0,5 | 978,3 → 1.116,8 |
| Repeated Measures | 40000 | B | Long task terpanjang (ms) | -0,11 | -0,1 | 78,0 → 87,0 |
| Repeated Measures | 40000 | B | Waktu total (ms) | -0,06 | 0,3 | 1.162,1 → 1.348,3 |
| Repeated Measures | 40000 | B | LoAF terpanjang (ms) | -0,11 | -0,1 | 79,3 → 87,6 |

## Verifikasi protokol bersih (semua run sel, termasuk startup)

| Modul | n data | Run | Dicek sebelum OK | Tersimpan = 0 sebelum OK | Log tersimpan = 1 setelah run | Log dirender = 1 setelah run |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 62 | 62 | 62 | 62 | 62 |
| Repeated Measures | 10000 | 62 | 62 | 62 | 62 | 62 |
| Repeated Measures | 20000 | 62 | 62 | 62 | 62 | 62 |
| Repeated Measures | 40000 | 62 | 62 | 62 | 62 | 62 |

## LoAF per run: skrip glue WASM / service GLM di main thread (steady-state)

| Modul | n data | Mode | Run | Run dgn skrip glue WASM | Run dgn skrip service GLM | Sumber skrip terlama di LoAF terpanjang (jumlah run) |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 5000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |
| Repeated Measures | 10000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 10000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |
| Repeated Measures | 20000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 20000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (28); chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (2) |
| Repeated Measures | 40000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 40000 | B | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |

## Atribusi skrip LoAF mode B (steady-state; total durasi skrip per sumber, 5 teratas per sel)

| Modul | n data | Sumber | invokerType | Skrip | Durasi skrip total (ms) | Run |
|---|---|---|---|---|---|---|
| Repeated Measures | 20000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 2 | 101,0 | 2 |
| Repeated Measures | 40000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 30 | 2.543,0 | 30 |

Run yang dibuang: 0 (lihat excluded-runs.csv).

Pustaka: Python 3.11.0, NumPy 2.0.2, SciPy 1.14.1.
