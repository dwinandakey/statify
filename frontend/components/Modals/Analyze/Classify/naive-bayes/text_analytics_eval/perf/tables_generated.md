### Tabel perangkat skripsi (hasil yang masuk buku)

Label perangkat: PERANGKAT-SKRIPSI (Lenovo IdeaPad Gaming 3 15ARH05, Ryzen 5 4600H, 16 GB, Windows 11)

Lingkungan tercatat: AMD Ryzen 5 4600H with Radeon Graphics x12; RAM 15.4 GiB; Windows_NT 10.0.26300; Node v24.20.0

Peramban: chrome 155.0.8059.85 headless

**Jalur (a): di peramban (Worker asli aplikasi + harness statis)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 71,1 | 9,2 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 464,1 | 5,2 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 964,1 | 46,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 4.306,2 | 88,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 87,7 | 7,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | 1.000 | 465,0 | 21,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 973,9 | 16,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 5.709,8 | 231,7 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 96,6 | 3,2 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 192,2 | 3,0 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 420,4 | 6,8 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 8.606,8 | 978,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 146,7 | 3,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 476,3 | 8,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.354,2 | 17,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 20.366,8 | 324,8 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 73,7 | 3,4 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 152,3 | 4,2 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 304,1 | 7,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 5.034,3 | 80,6 |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.503,9 | 30,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.648,9 | 50,7 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 461,5 | 7,9 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.617,5 | 30,4 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII (36.305) | 1.000 | 5.612,8 | 72,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 597,3 | 13,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.900,2 | 18,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 428,0 | 13,7 |

**Jalur (b): headless (Node + wasm yang sama, tanpa Worker)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 43,8 | 4,4 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 250,0 | 6,8 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 592,0 | 7,9 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 2.864,9 | 24,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 52,4 | 4,9 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | 1.000 | 295,3 | 4,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 614,6 | 2,5 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 4.214,3 | 14,3 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 26,0 | 2,6 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 113,0 | 2,8 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 301,3 | 6,5 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 2.983,7 | 24,9 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 75,1 | 3,9 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 389,6 | 8,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.197,8 | 10,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 14.155,6 | 21,4 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 18,8 | 1,2 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 97,9 | 11,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 215,3 | 16,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen (36.305) | 1.000 | 1.498,8 | 8,3 |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 875,6 | 8,5 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.015,3 | 7,8 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 298,6 | 6,8 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 986,9 | 3,1 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII (36.305) | 1.000 | 4.272,5 | 50,3 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 445,1 | 3,3 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.754,5 | 8,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 318,1 | 6,5 |

**Responsivitas UI (jalur peramban)**

| Menu dan konfigurasi | Dataset | Long task (rata-rata jumlah per proses) | Long task terpanjang (ms) | Jeda frame p95 (ms) | Jeda frame terpanjang (ms) | Jeda frame p95 saat diam (ms) | UI responsif (long task < 200 ms)? |
|---|---|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,1 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 0,0 | 0 | 20,0 | 30 | 10,3 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 0,0 | 0 | 19,9 | 30 | 10,3 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen (36.305) | 0,2 | 57 | 10,3 | 80 | 10,2 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 20,0 | 40 | 10,2 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | 0,0 | 0 | 20,0 | 20 | 10,1 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 0,0 | 0 | 20,0 | 40 | 10,3 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen (36.305) | 0,2 | 72 | 10,2 | 70 | 10,1 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 19,9 | 50 | 10,2 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 0,0 | 0 | 20,0 | 30 | 10,3 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 0,0 | 0 | 17,2 | 50 | 10,3 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII (36.305) | 0,2 | 67 | 10,2 | 70 | 10,3 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 0,0 | 0 | 10,2 | 11 | 10,3 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 0,0 | 0 | 10,3 | 30 | 10,1 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 10,2 | 10 | 10,3 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 0,0 | 0 | 10,2 | 11 | 10,2 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen (36.305) | 0,0 | 0 | 10,2 | 13 | 10,1 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 10,2 | 10 | 10,2 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 0,0 | 0 | 10,2 | 10 | 10,3 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 0,0 | 0 | 10,1 | 10 | 10,2 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen (36.305) | 0,0 | 0 | 10,3 | 30 | 10,2 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 10,1 | 10 | 10,1 | Ya |

**Overhead tetap Worker (jalur peramban, 40 dokumen)**

| Menu dan konfigurasi | Dokumen | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | 40 (subsampel merata pilkada_900) | 393 | 3,1 | 0,4 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | 40 (subsampel merata pilkada_900) | 286 | 4,0 | 0,6 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 55,7 | 1,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 64,5 | 1,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | 40 (subsampel merata pilkada_900) | 1.000 | 49,4 | 0,9 |

**Run pemanasan (run 0) dibanding rata-rata run 1–5** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)

| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |
|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 95,7 | 43,8 | 142,4 | 71,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 433,5 | 250,0 | 612,5 | 464,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.345,0 | 592,0 | 1.431,1 | 964,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 3.546,7 | 875,6 | 3.040,3 | 1.503,9 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 113,6 | 52,4 | 171,9 | 87,7 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | 463,4 | 295,3 | 649,0 | 465,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.473,5 | 614,6 | 1.440,8 | 973,9 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | 3.561,7 | 1.015,3 | 3.207,3 | 1.648,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 95,9 | 26,0 | 101,9 | 96,6 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 200,5 | 113,0 | 215,4 | 192,2 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 449,8 | 301,3 | 423,0 | 420,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 617,3 | 445,1 | 581,0 | 597,3 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 153,7 | 75,1 | 160,1 | 146,7 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 493,7 | 389,6 | 478,7 | 476,3 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.451,2 | 1.197,8 | 1.347,7 | 1.354,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.949,4 | 1.754,5 | 1.971,7 | 1.900,2 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 69,4 | 18,8 | 82,2 | 73,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 167,8 | 97,9 | 164,8 | 152,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 331,1 | 215,3 | 302,6 | 304,1 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 479,6 | 318,1 | 425,0 | 428,0 |


### UJI ASAP — BUKAN HASIL PERANGKAT SKRIPSI: SANDBOX-CLOUD (UJI ASAP, BUKAN PERANGKAT SKRIPSI)

Lingkungan tercatat: Intel(R) Xeon(R) Processor @ 2.10GHz x2; RAM 7.8 GiB; Linux 6.18.44-fc-v77; Node v22.22.0

Peramban: Chromium bawaan Playwright 141.0.7390.37 headless

**Jalur (a): di peramban (Worker asli aplikasi + harness statis)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 60,6 | 4,8 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 351,0 | 15,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 741,1 | 34,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 67,1 | 7,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 808,3 | 18,7 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 213,7 | 40,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 373,1 | 38,8 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 626,9 | 21,3 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 322,0 | 15,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 800,2 | 38,7 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.796,0 | 32,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 121,3 | 16,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 281,7 | 24,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 501,6 | 50,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.205,3 | 34,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: {"code":"WORKER_ERROR","message":"unreachable"} | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 388,0 | 14,4 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.418,3 | 106,7 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 830,1 | 51,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.567,1 | 35,1 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 714,6 | 54,6 |

**Jalur (b): headless (Node + wasm yang sama, tanpa Worker)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 54,9 | 6,8 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 286,4 | 8,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 635,5 | 17,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 69,3 | 8,9 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 729,1 | 9,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 46,3 | 29,8 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 118,4 | 4,0 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 339,6 | 10,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 103,5 | 34,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 436,3 | 9,6 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.568,3 | 146,5 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 32,2 | 4,4 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 103,1 | 52,6 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 235,0 | 39,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.002,7 | 7,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 378,0 | 63,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.123,0 | 18,6 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | ≥ 20.000 dokumen, varian ASCII | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 515,2 | 62,4 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.126,2 | 67,2 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 304,3 | 8,0 |

**Responsivitas UI (jalur peramban)**

| Menu dan konfigurasi | Dataset | Long task (rata-rata jumlah per proses) | Long task terpanjang (ms) | Jeda frame p95 (ms) | Jeda frame terpanjang (ms) | Jeda frame p95 saat diam (ms) | UI responsif (long task < 200 ms)? |
|---|---|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1,0 | 110 | 16,8 | 100 | 16,7 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1,0 | 197 | 16,7 | 183 | 16,8 | Ya |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1,0 | 285 | 16,7 | 267 | 16,7 | Tidak (maks 285 ms) |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1,0 | 193 | 16,8 | 167 | 16,7 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 0,8 | 96 | 16,7 | 83 | 16,8 | Ya |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1,0 | 301 | 16,7 | 283 | 16,7 | Tidak (maks 301 ms) |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 0,0 | 0 | 16,8 | 17 | 16,8 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 0,0 | 0 | 16,7 | 17 | 16,8 | Ya |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 0,0 | 0 | 16,7 | 17 | 16,7 | Ya |

**Overhead tetap Worker (jalur peramban, 40 dokumen)**

| Menu dan konfigurasi | Dokumen | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | 40 (subsampel merata pilkada_900) | 393 | 3,1 | 1,0 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | 40 (subsampel merata pilkada_900) | 287 | 6,3 | 4,1 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 98,3 | 10,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | 40 (subsampel merata pilkada_900) | 393 | 139,2 | 22,9 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | 40 (subsampel merata pilkada_900) | 1.000 | 75,5 | 4,7 |

**Run pemanasan (run 0) dibanding rata-rata run 1–5** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)

| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |
|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 161,2 | 54,9 | 175,8 | 60,6 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 444,7 | 286,4 | 529,2 | 351,0 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.118,9 | 635,5 | 1.207,3 | 741,1 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.859,6 | 1.002,7 | 1.725,2 | 1.205,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 163,3 | 69,3 | 181,5 | 67,1 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.087,7 | 729,1 | 1.299,0 | 808,3 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 146,6 | 46,3 | 254,8 | 213,7 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 272,3 | 118,4 | 345,3 | 373,1 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 571,1 | 339,6 | 664,9 | 626,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 742,0 | 515,2 | 867,6 | 830,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 288,3 | 103,5 | 322,1 | 322,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 641,6 | 436,3 | 1.008,1 | 800,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.721,5 | 1.568,3 | 1.769,6 | 1.796,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.471,2 | 2.126,2 | 2.557,0 | 2.567,1 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 103,2 | 32,2 | 117,7 | 121,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 205,0 | 103,1 | 287,8 | 281,7 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 393,7 | 235,0 | 504,5 | 501,6 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 660,5 | 304,3 | 837,1 | 714,6 |


### UJI ASAP — BUKAN HASIL PERANGKAT SKRIPSI: VM-LOKAL (UJI ASAP, BUKAN PERANGKAT SKRIPSI)

Lingkungan tercatat: AMD Ryzen 5 4600H with Radeon Graphics x2; RAM 3.8 GiB; Linux 6.8.0-138-generic; Node v22.23.2

**Jalur (b): headless (Node + wasm yang sama, tanpa Worker)**

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 1.000 | 83,6 | 17,3 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 1.000 | 425,2 | 15,4 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.000 | 908,4 | 11,7 |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 1.000 | 84,9 | 11,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam (5.574) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.000 | 969,8 | 31,2 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 1.000 | 43,8 | 15,0 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 1.000 | 137,0 | 16,4 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 1.000 | 360,1 | 23,5 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 1.000 | 109,2 | 34,8 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 1.000 | 462,3 | 6,2 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.000 | 1.499,3 | 16,0 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 1.000 | 42,9 | 16,5 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 1.000 | 117,9 | 43,8 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 1.000 | 242,0 | 32,0 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Dataset ≥ 20.000 dokumen | NOT RUN | NOT RUN (dataset tidak tersedia) | - |

Baris tambahan (bukan baris utama buku):

| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |
|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 1.476,9 | 32,4 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan Pilkada+SMS+SmSA (17.974) | - | GALAT: unreachable | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SMS Spam, varian ASCII (5.574) | 1.000 | 461,6 | 6,3 |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Gabungan, varian ASCII (17.974) | 1.000 | 1.541,0 | 56,9 |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 543,0 | 27,1 |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 2.290,1 | 110,3 |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 1.000 | 344,0 | 17,6 |

**Run pemanasan (run 0) dibanding rata-rata run 1–5** (pemanasan bukan bagian tabel buku; pada headless run 0 = panggilan pertama pada proses baru)

| Menu dan konfigurasi | Dataset | Headless: pemanasan (ms) | Headless: rata-rata (ms) | Peramban: pemanasan (ms) | Peramban: rata-rata (ms) |
|---|---|---|---|---|---|
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Pilkada (900) | 231,2 | 83,6 | - | - |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SMS Spam (5.574) | 721,2 | 425,2 | - | - |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | SmSA (11.000) | 1.379,1 | 908,4 | - | - |
| String to Word Vector, default Weka (W=1000, TF hitungan, tanpa IDF/normalisasi) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.185,5 | 1.476,9 | - | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | Pilkada (900) | 227,8 | 84,9 | - | - |
| String to Word Vector, stopword Indonesia + stemming Sastrawi | SmSA (11.000) | 1.347,1 | 969,8 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Pilkada (900) | 154,0 | 43,8 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SMS Spam (5.574) | 352,9 | 137,0 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | SmSA (11.000) | 601,7 | 360,1 | - | - |
| Naive Bayes, Raw Text, holdout 70% (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 815,8 | 543,0 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Pilkada (900) | 304,3 | 109,2 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SMS Spam (5.574) | 764,7 | 462,3 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | SmSA (11.000) | 1.785,2 | 1.499,3 | - | - |
| Naive Bayes, Raw Text, 10-fold CV (seed 42) | Gabungan Pilkada+SMS+SmSA (17.974) | 2.779,5 | 2.290,1 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Pilkada (900) | 129,0 | 42,9 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SMS Spam (5.574) | 240,1 | 117,9 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | SmSA (11.000) | 476,5 | 242,0 | - | - |
| Apply Model, Raw Text (model NB Multinomial, data yang sama) | Gabungan Pilkada+SMS+SmSA (17.974) | 749,5 | 344,0 | - | - |

