## Ringkasan metrik (steady-state; median [IQR])

| Modul | n data | CPU | Mode | n run | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | A | 30 | 141,5 [140,0–144,0] | 91,5 [90,0–94,0] | 116,7 [116,7–133,3] | 170,4 [167,6–180,2] | 146,2 [144,6–148,2] |
| Multivariate | 100 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 192,2 [187,2–195,6] | 0,0 [0,0–0,0] |
| Multivariate | 500 | 1× | A | 30 | 611,0 [608,0–614,8] | 561,0 [558,0–564,8] | 600,0 [587,5–600,0] | 643,9 [639,6–650,0] | 616,6 [613,1–619,4] |
| Multivariate | 500 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 663,3 [659,8–675,8] | 0,0 [0,0–0,0] |
| Multivariate | 1000 | 1× | A | 30 | 1.239,5 [1.230,5–1.246,2] | 1.189,5 [1.180,5–1.196,2] | 1.216,6 [1.216,6–1.233,3] | 1.278,4 [1.271,8–1.293,7] | 1.244,3 [1.235,7–1.251,2] |
| Multivariate | 1000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 1.277,2 [1.262,0–1.287,5] | 0,0 [0,0–0,0] |
| Multivariate | 2000 | 1× | A | 30 | 2.403,5 [2.396,2–2.416,5] | 2.353,5 [2.346,2–2.366,5] | 2.383,2 [2.383,2–2.399,9] | 2.444,3 [2.431,3–2.456,5] | 2.408,9 [2.401,8–2.421,8] |
| Multivariate | 2000 | 1× | B | 30 | 0,0 [0,0–0,0] | 0,0 [0,0–0,0] | 16,7 [16,7–16,7] | 2.429,6 [2.411,6–2.445,8] | 0,0 [0,0–0,0] |

## Mean dan CI 95% (steady-state)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | A | 143,2 (141,3–145,0) | 93,2 (91,3–95,0) | 123,3 (120,0–126,7) | 177,3 (172,0–182,7) | 147,6 (145,8–149,4) |
| Multivariate | 100 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 191,6 (188,5–194,7) | 0,0 (0,0–0,0) |
| Multivariate | 500 | 1× | A | 611,6 (610,0–613,3) | 561,6 (560,0–563,3) | 595,5 (592,9–598,2) | 647,5 (642,7–652,3) | 616,5 (614,8–618,1) |
| Multivariate | 500 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 667,6 (663,1–672,1) | 0,0 (0,0–0,0) |
| Multivariate | 1000 | 1× | A | 1.239,5 (1.234,3–1.244,6) | 1.189,5 (1.184,3–1.194,6) | 1.221,1 (1.215,7–1.226,5) | 1.281,8 (1.275,5–1.288,0) | 1.244,3 (1.239,2–1.249,5) |
| Multivariate | 1000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 1.276,1 (1.269,3–1.283,0) | 0,0 (0,0–0,0) |
| Multivariate | 2000 | 1× | A | 2.408,3 (2.401,9–2.414,7) | 2.358,3 (2.351,9–2.364,7) | 2.391,6 (2.385,0–2.398,2) | 2.446,1 (2.438,0–2.454,2) | 2.413,0 (2.406,6–2.419,3) |
| Multivariate | 2000 | 1× | B | 0,0 (0,0–0,0) | 0,0 (0,0–0,0) | 16,7 (16,7–16,7) | 2.440,2 (2.421,1–2.459,3) | 0,0 (0,0–0,0) |

## Uji statistik (long task terpanjang, H₁: B < A)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median B (ms) | Maks B (ms) | Berpengaruh? | Tujuan 2 tercapai? |
|---|---|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | 30 / 30 | 0,0 | 5,555e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Multivariate | 500 | 1× | 30 / 30 | 0,0 | 5,878e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Multivariate | 1000 | 1× | 30 / 30 | 0,0 | 5,961e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |
| Multivariate | 2000 | 1× | 30 / 30 | 0,0 | 6,019e-13 | 1,000 | 0,0 | 0,0 | tidak diisi | tidak diisi |

## Uji tambahan (LoAF terpanjang, H₁: B < A; bukan kriteria §4.5)

| Modul | n data | CPU | n A / n B | U (B) | p (satu arah) | Â₁₂ (A vs B) | Median A (ms) | Median B (ms) | Maks B (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | 30 / 30 | 0,0 | 6,049e-13 | 1,000 | 146,2 | 0,0 | 0,0 |
| Multivariate | 500 | 1× | 30 / 30 | 0,0 | 6,044e-13 | 1,000 | 616,6 | 0,0 | 0,0 |
| Multivariate | 1000 | 1× | 30 / 30 | 0,0 | 6,049e-13 | 1,000 | 1.244,3 | 0,0 | 0,0 |
| Multivariate | 2000 | 1× | 30 / 30 | 0,0 | 6,059e-13 | 1,000 | 2.408,9 | 0,0 | 0,0 |

## Run startup (pasangan pertama; n = 1 per mode)

| Modul | n data | CPU | Mode | Long task terpanjang (ms) | Total blocking (ms) | Jeda frame terpanjang (ms) | Waktu total (ms) | LoAF terpanjang (ms) |
|---|---|---|---|---|---|---|---|---|
| Multivariate | 100 | 1× | A | 197,0 | 147,0 | 216,7 | 570,2 | 233,6 |
| Multivariate | 100 | 1× | B | 0,0 | 0,0 | 16,7 | 226,4 | 0,0 |
| Multivariate | 500 | 1× | A | 232,0 | 182,0 | 716,6 | 1.107,7 | 732,7 |
| Multivariate | 500 | 1× | B | 0,0 | 0,0 | 16,7 | 707,4 | 0,0 |
| Multivariate | 1000 | 1× | A | 293,0 | 243,0 | 1.333,3 | 1.757,4 | 1.347,7 |
| Multivariate | 1000 | 1× | B | 0,0 | 0,0 | 16,7 | 1.349,8 | 0,0 |
| Multivariate | 2000 | 1× | A | 181,0 | 131,0 | 2.449,9 | 2.792,4 | 2.466,7 |
| Multivariate | 2000 | 1× | B | 0,0 | 0,0 | 16,7 | 2.458,0 | 0,0 |

## Drift terhadap nomor run (steady-state; Spearman ρ, kemiringan ms/run, median 5 run pertama → 5 terakhir)

| Modul | n data | Mode | Metrik | ρ | kemiringan (ms/run) | median awal → akhir (ms) |
|---|---|---|---|---|---|---|
| Multivariate | 100 | A | Long task terpanjang (ms) | -0,63 | -0,1 | 146,0 → 140,0 |
| Multivariate | 100 | A | Waktu total (ms) | -0,28 | -0,1 | 172,1 → 173,8 |
| Multivariate | 100 | A | LoAF terpanjang (ms) | -0,68 | -0,2 | 150,8 → 144,2 |
| Multivariate | 100 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 100 | B | Waktu total (ms) | -0,55 | -0,3 | 198,3 → 180,5 |
| Multivariate | 100 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 500 | A | Long task terpanjang (ms) | -0,52 | -0,1 | 616,0 → 608,0 |
| Multivariate | 500 | A | Waktu total (ms) | -0,15 | -0,1 | 649,5 → 639,6 |
| Multivariate | 500 | A | LoAF terpanjang (ms) | -0,47 | -0,1 | 620,6 → 612,3 |
| Multivariate | 500 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 500 | B | Waktu total (ms) | -0,06 | -0,0 | 676,3 → 663,2 |
| Multivariate | 500 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 1000 | A | Long task terpanjang (ms) | -0,42 | -0,3 | 1.241,0 → 1.236,0 |
| Multivariate | 1000 | A | Waktu total (ms) | -0,10 | -0,2 | 1.277,6 → 1.293,5 |
| Multivariate | 1000 | A | LoAF terpanjang (ms) | -0,40 | -0,3 | 1.245,7 → 1.240,2 |
| Multivariate | 1000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 1000 | B | Waktu total (ms) | -0,37 | -0,4 | 1.296,4 → 1.287,7 |
| Multivariate | 1000 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 2000 | A | Long task terpanjang (ms) | 0,27 | 0,2 | 2.402,0 → 2.424,0 |
| Multivariate | 2000 | A | Waktu total (ms) | 0,20 | 0,3 | 2.441,8 → 2.464,5 |
| Multivariate | 2000 | A | LoAF terpanjang (ms) | 0,25 | 0,2 | 2.407,3 → 2.428,7 |
| Multivariate | 2000 | B | Long task terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |
| Multivariate | 2000 | B | Waktu total (ms) | -0,14 | -0,3 | 2.444,5 → 2.427,2 |
| Multivariate | 2000 | B | LoAF terpanjang (ms) | — | 0,0 | 0,0 → 0,0 |

## Verifikasi protokol bersih (semua run sel, termasuk startup)

| Modul | n data | Run | Dicek sebelum OK | Tersimpan = 0 sebelum OK | Log tersimpan = 1 setelah run | Log dirender = 1 setelah run |
|---|---|---|---|---|---|---|
| Multivariate | 100 | 62 | 62 | 62 | 62 | 41 |
| Multivariate | 500 | 62 | 62 | 62 | 62 | 44 |
| Multivariate | 1000 | 62 | 62 | 62 | 62 | 52 |
| Multivariate | 2000 | 62 | 62 | 62 | 62 | 46 |

## LoAF per run: skrip glue WASM / service GLM di main thread (steady-state)

| Modul | n data | Mode | Run | Run dgn skrip glue WASM | Run dgn skrip service GLM | Sumber skrip terlama di LoAF terpanjang (jumlah run) |
|---|---|---|---|---|---|---|
| Multivariate | 100 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Multivariate | 100 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |
| Multivariate | 500 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Multivariate | 500 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |
| Multivariate | 1000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Multivariate | 1000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |
| Multivariate | 2000 | A | 30 | 0 | 0 | chunk dashboard bersama (registry modal, Handsontable) (9919.04d6baa4c37d6f10.js) (30) |
| Multivariate | 2000 | B | 30 | 0 | 0 | (tanpa LoAF/skrip) (30) |

## Atribusi skrip LoAF mode B (steady-state; total durasi skrip per sumber, 5 teratas per sel)

| Modul | n data | Sumber | invokerType | Skrip | Durasi skrip total (ms) | Run |
|---|---|---|---|---|---|---|

Run yang dibuang: 0 (lihat excluded-runs.csv).

Pustaka: Python 3.11.0, NumPy 2.0.2, SciPy 1.14.1.
