## Ringkasan metrik (steady-state; median [IQR])

| Modul | n data | CPU | Mode | n run | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 30 | 129,5 [124,0–140,5] | 79,5 [74,0–90,5] | 100,0 [100,0–116,7] | 239,4 [228,4–253,4] | 130,6 [125,0–141,4] |
| Repeated Measures | 5000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 240,9 [227,7–267,8] | 0,0 [0,0–0,0] |
| Repeated Measures | 10000 | 1× | A | 30 | 356,0 [321,5–405,8] | 306,0 [271,5–355,8] | 333,3 [300,0–383,3] | 527,9 [463,7–571,4] | 357,1 [322,3–406,7] |
| Repeated Measures | 10000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–33,3] | 555,5 [525,6–605,3] | 0,0 [0,0–0,0] |
| Repeated Measures | 20000 | 1× | A | 30 | 492,5 [477,2–518,0] | 442,5 [427,2–468,0] | 466,6 [450,0–495,8] | 606,2 [590,4–628,2] | 494,1 [478,4–519,3] |
| Repeated Measures | 20000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 627,5 [609,7–682,3] | 0,0 [0,0–0,0] |
| Repeated Measures | 40000 | 1× | A | 30 | 1.449,0 [1.379,5–1.492,0] | 1.399,0 [1.329,5–1.442,0] | 1.424,9 [1.354,1–1.466,6] | 1.618,9 [1.560,2–1.678,8] | 1.450,1 [1.380,4–1.493,0] |
| Repeated Measures | 40000 | 1× | B | 30 | 111,5 [102,5–125,5] | 61,5 [52,5–75,5] | 83,3 [83,3–100,0] | 1.590,5 [1.542,0–1.651,1] | 112,8 [103,5–126,4] |

## Mean dan CI 95% (steady-state)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 146,2 (132,0–160,5) | 96,2 (82,0–110,5) | 123,9 (109,4–138,4) | 265,7 (241,9–289,5) | 147,2 (133,0–161,4) |
| Repeated Measures | 5000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 17,8 (16,3–19,3) | 273,2 (248,7–297,6) | 1,9 (-1,8–5,5) |
| Repeated Measures | 10000 | 1× | A | 351,8 (328,8–374,8) | 301,8 (278,8–324,8) | 328,9 (306,0–351,7) | 518,0 (484,6–551,5) | 353,2 (330,0–376,4) |
| Repeated Measures | 10000 | 1× | B | 1,9 (-1,8–5,6) | 0,2 (-0,2–0,7) | 25,0 (20,9–29,1) | 558,0 (526,1–590,0) | 11,8 (3,1–20,5) |
| Repeated Measures | 20000 | 1× | A | 553,2 (507,2–599,2) | 503,2 (457,2–549,2) | 530,5 (484,5–576,6) | 682,9 (627,3–738,5) | 554,3 (508,3–600,3) |
| Repeated Measures | 20000 | 1× | B | 18,5 (2,0–35,0) | 8,5 (-2,9–19,9) | 28,4 (15,9–40,8) | 810,5 (560,8–1.060,2) | 18,7 (2,1–35,4) |
| Repeated Measures | 40000 | 1× | A | 1.435,7 (1.366,9–1.504,4) | 1.385,7 (1.316,9–1.454,4) | 1.412,2 (1.343,8–1.480,5) | 1.610,1 (1.535,4–1.684,7) | 1.436,8 (1.368,1–1.505,6) |
| Repeated Measures | 40000 | 1× | B | 115,5 (107,5–123,5) | 65,5 (57,5–73,5) | 91,7 (83,3–100,1) | 1.566,1 (1.504,5–1.627,8) | 116,7 (108,6–124,7) |

## Uji statistik (long task terpanjang, H₁: B < A)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 5,946e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 8,581e-13 | 1,000 | 0,0 | 57,0 | tidak diisi | tidak diisi |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 3,228e-12 | 1,000 | 0,0 | 222,0 | tidak diisi | tidak diisi |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,503e-11 | 1,000 | 111,5 | 176,0 | tidak diisi | tidak diisi |

## Uji tambahan (LoAF terpanjang, H₁: B < A; bukan kriteria §4.5)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 8,588e-13 | 1,000 | 130,6 | 0,0 | 55,5 |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 3,237e-12 | 1,000 | 357,1 | 0,0 | 80,2 |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 3,239e-12 | 1,000 | 494,1 | 0,0 | 222,4 |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,509e-11 | 1,000 | 1.450,1 | 112,8 | 177,2 |

## Run startup (pasangan pertama; n = 1 per mode)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 0,0 | 0,0 | 400,0 | 839,8 | 421,9 |
| Repeated Measures | 5000 | 1× | B | 0,0 | 0,0 | 16,7 | 517,9 | 0,0 |
| Repeated Measures | 10000 | 1× | A | 0,0 | 0,0 | 550,0 | 1.023,0 | 573,2 |
| Repeated Measures | 10000 | 1× | B | 0,0 | 0,0 | 16,7 | 639,9 | 0,0 |
| Repeated Measures | 20000 | 1× | A | 0,0 | 0,0 | 866,6 | 1.337,1 | 890,2 |
| Repeated Measures | 20000 | 1× | B | 0,0 | 0,0 | 16,7 | 1.091,1 | 0,0 |
| Repeated Measures | 40000 | 1× | A | 71,0 | 21,0 | 1.916,6 | 2.460,5 | 1.932,5 |
| Repeated Measures | 40000 | 1× | B | 151,0 | 101,0 | 133,3 | 2.152,3 | 151,7 |

## Drift terhadap nomor run (steady-state; Spearman ρ, kemiringan ms/run, median 5 run pertama → 5 terakhir)

| Modul | n data | Mode | Metrik | ρ | kemiringan (ms/run) | median awal → akhir (ms) |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | A | Long task terpanjang (ms) | -0,65 | -1,5 | 220,0 → 129,0 |
| Repeated Measures | 5000 | A | Waktu total (ms) | -0,78 | -2,7 | 395,9 → 230,1 |
| Repeated Measures | 5000 | A | LoAF terpanjang (ms) | -0,66 | -1,5 | 221,0 → 129,5 |
| Repeated Measures | 5000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 5000 | B | Waktu total (ms) | -0,54 | -2,4 | 398,7 → 230,3 |
| Repeated Measures | 5000 | B | LoAF terpanjang (ms) | -0,29 | -0,2 | 0,0 → 0,0 |
| Repeated Measures | 10000 | A | Long task terpanjang (ms) | 0,09 | -0,1 | 343,0 → 365,0 |
| Repeated Measures | 10000 | A | Waktu total (ms) | -0,13 | -0,6 | 524,0 → 531,7 |
| Repeated Measures | 10000 | A | LoAF terpanjang (ms) | 0,09 | -0,0 | 344,4 → 366,2 |
| Repeated Measures | 10000 | B | Long task terpanjang (ms) | 0,23 | 0,1 | 0,0 → 0,0 |
| Repeated Measures | 10000 | B | Waktu total (ms) | -0,26 | -1,0 | 559,7 → 539,2 |
| Repeated Measures | 10000 | B | LoAF terpanjang (ms) | -0,05 | -0,0 | 0,0 → 0,0 |
| Repeated Measures | 20000 | A | Long task terpanjang (ms) | 0,11 | 0,3 | 729,0 → 681,0 |
| Repeated Measures | 20000 | A | Waktu total (ms) | 0,15 | 0,4 | 902,4 → 835,2 |
| Repeated Measures | 20000 | A | LoAF terpanjang (ms) | 0,11 | 0,3 | 730,3 → 682,3 |
| Repeated Measures | 20000 | B | Long task terpanjang (ms) | -0,20 | -0,8 | 63,0 → 0,0 |
| Repeated Measures | 20000 | B | Waktu total (ms) | 0,23 | -9,7 | 881,7 → 870,9 |
| Repeated Measures | 20000 | B | LoAF terpanjang (ms) | -0,20 | -0,8 | 64,4 → 0,0 |
| Repeated Measures | 40000 | A | Long task terpanjang (ms) | 0,19 | 3,4 | 1.190,0 → 1.490,0 |
| Repeated Measures | 40000 | A | Waktu total (ms) | 0,18 | 4,0 | 1.306,6 → 1.679,1 |
| Repeated Measures | 40000 | A | LoAF terpanjang (ms) | 0,19 | 3,4 | 1.191,0 → 1.490,7 |
| Repeated Measures | 40000 | B | Long task terpanjang (ms) | 0,51 | 0,6 | 96,0 → 124,0 |
| Repeated Measures | 40000 | B | Waktu total (ms) | 0,24 | 4,1 | 1.158,5 → 1.590,5 |
| Repeated Measures | 40000 | B | LoAF terpanjang (ms) | 0,51 | 0,6 | 96,9 → 125,4 |

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
| Repeated Measures | 5000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (29); lainnya: 4583-ded7dd835bf408f0.js (1) |
| Repeated Measures | 10000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 10000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (24); lainnya: 4583-ded7dd835bf408f0.js (5); chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (1) |
| Repeated Measures | 20000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 20000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (24); chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (5); lainnya: 4583-ded7dd835bf408f0.js (1) |
| Repeated Measures | 40000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 40000 | B | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |

## Atribusi skrip LoAF mode B (steady-state; total durasi skrip per sumber, 5 teratas per sel)

| Modul | n data | Sumber | invokerType | Skrip | Durasi skrip total (ms) | Run |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | lainnya: 4583-ded7dd835bf408f0.js | event-listener | 2 | 34,0 | 1 |
| Repeated Measures | 10000 | lainnya: 4583-ded7dd835bf408f0.js | event-listener | 8 | 162,0 | 5 |
| Repeated Measures | 10000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 1 | 57,0 | 1 |
| Repeated Measures | 10000 | react-dom (c7879cf7-fabe25011515220e.js) | event-listener | 1 | 11,0 | 1 |
| Repeated Measures | 20000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 5 | 333,0 | 5 |
| Repeated Measures | 20000 | lainnya: 4583-ded7dd835bf408f0.js | event-listener | 1 | 222,0 | 1 |
| Repeated Measures | 40000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 30 | 3.460,0 | 30 |

Run yang dibuang: 0 (lihat excluded-runs.csv).

Pustaka: Python 3.11.0, NumPy 2.0.2, SciPy 1.14.1.
