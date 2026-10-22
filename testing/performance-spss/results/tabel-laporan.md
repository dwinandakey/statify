### T1. Waktu komputasi (detik), median [min–maks] dari 10 run terukur, faktor berkode angka

| Prosedur | n | SPSS Elapsed Time | Statify komputasi saja | Rasio Statify/SPSS | Statify ujung ke ujung (informasi tambahan) |
|---|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 0,006 [0,000–0,006] | 0,021 [0,019–0,028] | 3,5×* | 0,063 [0,058–0,072] |
| One-Way MANOVA | 1.000 | 0,013 [0,000–0,017] | 0,156 [0,152–0,170] | 12,0×* | 0,208 [0,196–0,211] |
| One-Way MANOVA | 10.000 | 0,100 [0,084–0,110] | 1,483 [1,461–1,516] | 14,9× | 1,564 [1,512–1,590] |
| One-Way MANOVA | 100.000 | 1,050 [1,030–1,110] | 14,56 [14,49–14,69] | 13,9× | 14,93 [14,74–31,09] |
| Two-Way MANOVA | 100 | 0,009 [0,000–0,013] | 0,044 [0,041–0,053] | 5,1×* | 0,093 [0,089–0,110] |
| Two-Way MANOVA | 1.000 | 0,018 [0,009–0,031] | 0,346 [0,339–0,368] | 18,7×* | 0,399 [0,381–0,432] |
| Two-Way MANOVA | 10.000 | 0,160 [0,150–0,170] | 3,369 [3,324–3,402] | 21,1× | 3,479 [3,411–3,545] |
| Two-Way MANOVA | 100.000 | 1,855 [1,820–1,940] | 33,22 [33,06–33,45] | 17,9× | 33,86 [33,60–34,35] |
| Pengukuran Berulang | 100 | 0,006 [0,002–0,014] | 0,016 [0,015–0,028] | 2,7×* | 0,130 [0,120–0,144] |
| Pengukuran Berulang | 1.000 | 0,013 [0,008–0,023] | 0,040 [0,037–0,058] | 3,0×* | 0,158 [0,140–0,179] |
| Pengukuran Berulang | 10.000 | 0,099 [0,083–0,110] | 0,255 [0,251–0,282] | 2,6× | 0,390 [0,378–0,427] |
| Pengukuran Berulang | 100.000 | 1,080 [1,060–1,130] | 2,424 [2,382–2,530] | 2,2× | 2,691 [2,664–2,730] |

\* Median SPSS di bawah 3 *tick* jam Windows (≈ 0,047 detik): rasio di bawah resolusi pengukuran.

### T2. Pengukuran Berulang: faktor teks vs kode angka (detik), median [min–maks]

| n | SPSS, teks | SPSS, kode | Statify komputasi, teks | Statify komputasi, kode | Selisih Statify (teks/kode) | Rasio Statify/SPSS, teks | Rasio, kode |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 0,006 [0,004–0,007] | 0,006 [0,002–0,014] | 0,018 [0,015–0,027] | 0,016 [0,015–0,028] | +12,9% | 3,1× | 2,7× |
| 1.000 | 0,014 [0,012–0,020] | 0,013 [0,008–0,023] | 0,052 [0,049–0,072] | 0,040 [0,037–0,058] | +30,2% | 3,7× | 3,0× |
| 10.000 | 0,095 [0,093–0,120] | 0,099 [0,083–0,110] | 0,382 [0,368–0,408] | 0,255 [0,251–0,282] | +49,5% | 4,0× | 2,6× |
| 50.000 | 0,500 [0,480–0,540] | – | 1,836 [1,801–1,862] | – | – | 3,7× | – |

n = 50.000 hanya ada pada seri teks; n = 100.000 hanya pada seri kode (impor CSV teks gagal di atas ±63.600 baris).

### T3. Build teroptimasi (opt-level = 3, wasm-opt -O3): komputasi saja (detik), median [min–maks]

| Prosedur | n | SPSS | Statify build produksi | Statify build teroptimasi | *Speedup* | Rasio teroptimasi/SPSS |
|---|---:|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 0,006 | 0,021 [0,019–0,028] | 0,005 [0,005–0,006] | 4,1× | 0,8×* |
| One-Way MANOVA | 1.000 | 0,013 | 0,156 [0,152–0,170] | 0,040 [0,039–0,049] | 3,9× | 3,1×* |
| One-Way MANOVA | 10.000 | 0,100 | 1,483 [1,461–1,516] | 0,385 [0,378–0,399] | 3,8× | 3,9× |
| One-Way MANOVA | 100.000 | 1,050 | 14,56 [14,49–14,69] | 4,051 [3,958–4,134] | 3,6× | 3,9× |
| Two-Way MANOVA | 100 | 0,009 | 0,044 [0,041–0,053] | 0,010 [0,010–0,012] | 4,3× | 1,2×* |
| Two-Way MANOVA | 1.000 | 0,018 | 0,346 [0,339–0,368] | 0,088 [0,086–0,093] | 3,9× | 4,8×* |
| Two-Way MANOVA | 10.000 | 0,160 | 3,369 [3,324–3,402] | 0,874 [0,857–0,922] | 3,9× | 5,5× |
| Two-Way MANOVA | 100.000 | 1,855 | 33,22 [33,06–33,45] | 8,892 [8,773–9,438] | 3,7× | 4,8× |
| Pengukuran Berulang | 100 | 0,006 | 0,016 [0,015–0,028] | 0,003 [0,002–0,004] | 6,4× | 0,4×* |
| Pengukuran Berulang | 1.000 | 0,013 | 0,040 [0,037–0,058] | 0,006 [0,005–0,008] | 7,0× | 0,4×* |
| Pengukuran Berulang | 10.000 | 0,099 | 0,255 [0,251–0,282] | 0,036 [0,035–0,042] | 7,0× | 0,4× |
| Pengukuran Berulang | 100.000 | 1,080 | 2,424 [2,382–2,530] | 0,364 [0,354–0,378] | 6,7× | 0,3× |

### T4. Rincian waktu ujung ke ujung Statify (ms, median)

| Prosedur | n | Persiapan data | Serialisasi | Worker | Pemformatan dan penyimpanan | Total | Porsi worker |
|---|---:|---:|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 0,2 | 0,1 | 22,0 | 39,1 | 62,6 | 35,1% |
| One-Way MANOVA | 1.000 | 0,9 | 0,4 | 160,8 | 41,6 | 207,9 | 77,3% |
| One-Way MANOVA | 10.000 | 4,6 | 3,8 | 1.503,2 | 42,0 | 1.564,1 | 96,1% |
| One-Way MANOVA | 100.000 | 51,1 | 53,0 | 14.790,7 | 38,8 | 14.933,2 | 99,0% |
| Two-Way MANOVA | 100 | 0,2 | 0,1 | 46,1 | 47,5 | 93,4 | 49,4% |
| Two-Way MANOVA | 1.000 | 1,1 | 0,5 | 351,5 | 51,6 | 399,3 | 88,0% |
| Two-Way MANOVA | 10.000 | 5,6 | 5,3 | 3.409,7 | 48,3 | 3.479,5 | 98,0% |
| Two-Way MANOVA | 100.000 | 75,8 | 61,9 | 33.665,0 | 48,1 | 33.864,8 | 99,4% |
| Pengukuran Berulang | 100 | 0,2 | 0,1 | 17,6 | 112,8 | 130,0 | 13,5% |
| Pengukuran Berulang | 1.000 | 1,1 | 0,3 | 41,9 | 114,2 | 158,3 | 26,5% |
| Pengukuran Berulang | 10.000 | 6,4 | 3,2 | 262,5 | 117,2 | 390,1 | 67,3% |
| Pengukuran Berulang | 100.000 | 65,7 | 34,8 | 2.481,8 | 103,4 | 2.690,6 | 92,2% |

### T5. Sebaran relatif per sel: IQR/median dan SD/rata-rata (10 run terukur)

| Prosedur | n | SPSS IQR/median | SPSS SD/rata-rata | Statify komputasi IQR/median | Statify komputasi SD/rata-rata |
|---|---:|---:|---:|---:|---:|
| One-Way MANOVA | 100 | 29,2%* | 39,0%* | 13,4% | 12,4% |
| One-Way MANOVA | 1.000 | 23,1%* | 44,8%* | 4,0% | 3,5% |
| One-Way MANOVA | 10.000 | 13,6% | 8,9% | 1,6% | 1,1% |
| One-Way MANOVA | 100.000 | 2,6% | 2,3% | 0,6% | 0,4% |
| Two-Way MANOVA | 100 | 32,4%* | 49,4%* | 10,8% | 8,1% |
| Two-Way MANOVA | 1.000 | 54,0%* | 35,3%* | 3,4% | 2,8% |
| Two-Way MANOVA | 10.000 | 0,0% | 3,6% | 1,1% | 0,8% |
| Two-Way MANOVA | 100.000 | 3,0% | 2,4% | 0,4% | 0,4% |
| Pengukuran Berulang | 100 | 45,8%* | 54,7%* | 16,3% | 22,2% |
| Pengukuran Berulang | 1.000 | 40,7%* | 33,3%* | 19,4% | 16,1% |
| Pengukuran Berulang | 10.000 | 5,1% | 7,2% | 2,5% | 3,5% |
| Pengukuran Berulang | 100.000 | 1,6% | 2,1% | 0,9% | 1,7% |
| Pengukuran Berulang (teks) | 100 | 25,0%* | 16,9%* | 21,5% | 18,5% |
| Pengukuran Berulang (teks) | 1.000 | 28,6%* | 20,4%* | 12,9% | 13,8% |
| Pengukuran Berulang (teks) | 10.000 | 11,8% | 9,4% | 3,2% | 2,9% |
| Pengukuran Berulang (teks) | 50.000 | 2,0% | 3,5% | 1,6% | 1,1% |

\* Median SPSS di bawah resolusi pengukuran; sebaran relatif di sel ini terutama mencerminkan langkah waktu 1–10 ms.

