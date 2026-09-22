## Ringkasan metrik (steady-state; median [IQR])

| Modul | n data | CPU | Mode | n run | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 30 | 121,5 [120,0–123,8] | 71,5 [70,0–73,8] | 100,0 [100,0–100,0] | 214,9 [212,8–228,8] | 122,3 [121,0–124,8] |
| Repeated Measures | 5000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 224,4 [216,7–230,4] | 0,0 [0,0–0,0] |
| Repeated Measures | 10000 | 1× | A | 30 | 228,0 [225,0–231,0] | 178,0 [175,0–181,0] | 200,0 [200,0–216,7] | 326,1 [324,6–329,7] | 229,1 [226,2–232,2] |
| Repeated Measures | 10000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 341,8 [339,0–345,5] | 0,0 [0,0–0,0] |
| Repeated Measures | 20000 | 1× | A | 30 | 467,0 [455,5–865,5] | 417,0 [405,5–815,5] | 450,0 [433,3–850,0] | 570,9 [563,9–1.054,2] | 468,2 [456,6–866,9] |
| Repeated Measures | 20000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–29,1] | 586,5 [574,8–946,0] | 0,0 [0,0–0,0] |
| Repeated Measures | 40000 | 1× | A | 30 | 942,0 [904,2–1.739,8] | 892,0 [854,2–1.689,8] | 916,6 [883,3–1.716,6] | 1.049,8 [1.009,9–1.931,8] | 943,0 [905,5–1.741,4] |
| Repeated Measures | 40000 | 1× | B | 30 | 84,0 [80,0–128,5] | 34,0 [30,0–78,5] | 66,7 [50,0–112,5] | 1.095,2 [1.056,1–2.041,0] | 84,9 [81,1–134,8] |

## Mean dan CI 95% (steady-state)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 122,6 (121,1–124,2) | 72,6 (71,1–74,2) | 100,6 (98,6–102,5) | 221,2 (217,0–225,3) | 123,6 (122,1–125,1) |
| Repeated Measures | 5000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 17,3 (16,2–18,3) | 233,4 (216,2–250,6) | 1,7 (-1,7–5,1) |
| Repeated Measures | 10000 | 1× | A | 229,1 (227,0–231,2) | 179,1 (177,0–181,2) | 205,6 (202,7–208,4) | 329,6 (326,4–332,8) | 230,1 (228,0–232,3) |
| Repeated Measures | 10000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 342,9 (339,7–346,1) | 0,0 (0,0–0,0) |
| Repeated Measures | 20000 | 1× | A | 603,3 (531,1–675,5) | 553,3 (481,1–625,5) | 580,5 (507,8–653,3) | 741,5 (653,8–829,1) | 604,5 (532,2–676,8) |
| Repeated Measures | 20000 | 1× | B | 14,8 (4,9–24,7) | 3,1 (0,7–5,6) | 22,2 (18,6–25,8) | 720,3 (635,2–805,4) | 15,1 (5,0–25,2) |
| Repeated Measures | 40000 | 1× | A | 1.297,0 (1.146,0–1.448,0) | 1.247,0 (1.096,0–1.398,0) | 1.275,5 (1.124,2–1.426,9) | 1.444,0 (1.277,0–1.611,0) | 1.298,7 (1.147,4–1.449,9) |
| Repeated Measures | 40000 | 1× | B | 105,7 (95,5–115,9) | 55,7 (45,5–65,9) | 85,6 (72,3–98,8) | 1.518,2 (1.339,9–1.696,6) | 109,6 (97,3–122,0) |

## Uji statistik (long task terpanjang, H₁: B < A)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 5,619e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 5,927e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 3,920e-12 | 1,000 | 0,0 | 79,0 | tidak diisi | tidak diisi |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,486e-11 | 1,000 | 84,0 | 158,0 | tidak diisi | tidak diisi |

## Uji tambahan (LoAF terpanjang, H₁: B < A; bukan kriteria §4.5)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | 30 / 30 | 0,0 | 8,581e-13 | 1,000 | 122,3 | 0,0 | 52,1 |
| Repeated Measures | 10000 | 1× | 30 / 30 | 0,0 | 6,034e-13 | 1,000 | 229,1 | 0,0 | 0,0 |
| Repeated Measures | 20000 | 1× | 30 / 30 | 0,0 | 3,937e-12 | 1,000 | 468,2 | 0,0 | 80,8 |
| Repeated Measures | 40000 | 1× | 30 / 30 | 0,0 | 1,507e-11 | 1,000 | 943,0 | 84,9 | 212,4 |

## Run startup (pasangan pertama; n = 1 per mode)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | 1× | A | 0,0 | 0,0 | 233,3 | 545,1 | 260,8 |
| Repeated Measures | 5000 | 1× | B | 0,0 | 0,0 | 16,7 | 274,1 | 0,0 |
| Repeated Measures | 10000 | 1× | A | 0,0 | 0,0 | 383,3 | 685,0 | 407,5 |
| Repeated Measures | 10000 | 1× | B | 0,0 | 0,0 | 16,7 | 395,8 | 0,0 |
| Repeated Measures | 20000 | 1× | A | 0,0 | 0,0 | 616,6 | 912,5 | 636,1 |
| Repeated Measures | 20000 | 1× | B | 0,0 | 0,0 | 16,7 | 637,3 | 0,0 |
| Repeated Measures | 40000 | 1× | A | 112,0 | 62,0 | 2.016,6 | 2.673,9 | 2.037,3 |
| Repeated Measures | 40000 | 1× | B | 133,0 | 83,0 | 116,7 | 2.211,0 | 133,9 |

## Drift terhadap nomor run (steady-state; Spearman ρ, kemiringan ms/run, median 5 run pertama → 5 terakhir)

| Modul | n data | Mode | Metrik | ρ | kemiringan (ms/run) | median awal → akhir (ms) |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | A | Long task terpanjang (ms) | -0,21 | -0,1 | 130,0 → 121,0 |
| Repeated Measures | 5000 | A | Waktu total (ms) | -0,18 | -0,2 | 243,3 → 215,4 |
| Repeated Measures | 5000 | A | LoAF terpanjang (ms) | -0,20 | -0,1 | 131,1 → 122,1 |
| Repeated Measures | 5000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 5000 | B | Waktu total (ms) | -0,02 | 0,1 | 236,5 → 221,7 |
| Repeated Measures | 5000 | B | LoAF terpanjang (ms) | 0,05 | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 10000 | A | Long task terpanjang (ms) | -0,23 | -0,1 | 239,0 → 228,0 |
| Repeated Measures | 10000 | A | Waktu total (ms) | -0,45 | -0,3 | 346,0 → 325,7 |
| Repeated Measures | 10000 | A | LoAF terpanjang (ms) | -0,24 | -0,1 | 240,3 → 228,7 |
| Repeated Measures | 10000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 10000 | B | Waktu total (ms) | -0,49 | -0,3 | 359,7 → 341,6 |
| Repeated Measures | 10000 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Repeated Measures | 20000 | A | Long task terpanjang (ms) | 0,57 | 6,7 | 453,0 → 871,0 |
| Repeated Measures | 20000 | A | Waktu total (ms) | 0,63 | 7,9 | 563,1 → 1.061,6 |
| Repeated Measures | 20000 | A | LoAF terpanjang (ms) | 0,57 | 6,7 | 453,6 → 872,2 |
| Repeated Measures | 20000 | B | Long task terpanjang (ms) | 0,50 | 0,8 | 0,0 → 59,0 |
| Repeated Measures | 20000 | B | Waktu total (ms) | 0,41 | 8,1 | 581,2 → 1.106,1 |
| Repeated Measures | 20000 | B | LoAF terpanjang (ms) | 0,50 | 0,8 | 0,0 → 60,4 |
| Repeated Measures | 40000 | A | Long task terpanjang (ms) | -0,80 | -20,8 | 1.767,0 → 904,0 |
| Repeated Measures | 40000 | A | Waktu total (ms) | -0,81 | -23,1 | 1.964,6 → 1.011,1 |
| Repeated Measures | 40000 | A | LoAF terpanjang (ms) | -0,79 | -20,9 | 1.768,1 → 905,5 |
| Repeated Measures | 40000 | B | Long task terpanjang (ms) | -0,81 | -1,3 | 127,0 → 79,0 |
| Repeated Measures | 40000 | B | Waktu total (ms) | -0,79 | -24,5 | 2.043,7 → 1.055,6 |
| Repeated Measures | 40000 | B | LoAF terpanjang (ms) | -0,83 | -1,5 | 128,1 → 79,8 |

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
| Repeated Measures | 10000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |
| Repeated Measures | 20000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 20000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (23); chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (7) |
| Repeated Measures | 40000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Repeated Measures | 40000 | B | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (29); (tanpa LoAF/skrip) (1) |

## Atribusi skrip LoAF mode B (steady-state; total durasi skrip per sumber, 5 teratas per sel)

| Modul | n data | Sumber | invokerType | Skrip | Durasi skrip total (ms) | Run |
|---|---|---|---|---|---|---|
| Repeated Measures | 5000 | lainnya: 4583-ded7dd835bf408f0.js | event-listener | 1 | 29,0 | 1 |
| Repeated Measures | 20000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 7 | 444,0 | 7 |
| Repeated Measures | 40000 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) | event-listener | 30 | 3.170,0 | 30 |

Run yang dibuang: 0 (lihat excluded-runs.csv).

Pustaka: Python 3.11.0, NumPy 2.0.2, SciPy 1.14.1.
