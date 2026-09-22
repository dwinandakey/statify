# Tahap 5: dampak perbaikan ke eksperimen Web Worker

Status: **jalur yang diukur berubah dan sebagian nilai keluaran berubah.** Karena itu data sel Repeated Measures (RM) eksperimen kedua tidak lagi mewakili kode sekarang. Keempat sel RM dijalankan ulang dengan protokol bersih di folder baru. Data lama tidak diubah.

Sel **Multivariate** eksperimen kedua tetap berlaku. Kode Multivariate, `shared/glm-execution.ts`, dan kedua worker tidak berubah: `git diff 8e2ddbd2 HEAD` kosong untuk `multivariate/` dan `shared/`, dan hash di `environment-*.json` sama.

## 1. Apakah jalur yang diukur berubah?

Jendela pengukuran berjalan dari klik OK sampai mark `glm-analysis-end` (`repeated-measures-analysis.ts:196`). Isinya:

| Bagian | Berubah? |
|---|---|
| `executeRepeatedMeasures` di `dialogs/repeated-measures-main.tsx` (menyusun config) | Ya (Tahap 2a: `BetSubVar`/`SrcList`; Tahap 3: `SrcList` EM Means) |
| `services/repeated-measures-analysis.ts` (ambil dan susun data) | Ya (Tahap 2a: satu `getSlicedData`, tata letak variable-major) |
| `shared/glm-execution.ts`, `services/repeated-measures-analysis-worker.ts` | Tidak (hash sama dengan eksperimen kedua) |
| RM WASM (`rust/pkg/wasm_bg.wasm`) | Ya (Tahap 1–5) |
| `services/repeated-measures-analysis-formatter.ts`, `-output.ts` | Ya (Tahap 1–4) |

Baseline `8e2ddbd2` punya hash service, worker, dan `glm-execution.ts` yang sama persis dengan `environment-1790047981374.json` eksperimen kedua. Jadi WASM di commit itu adalah WASM yang diukur.

## 2. Perbandingan nilai: WASM yang diukur vs sekarang

`harness/tahap5-compare.mjs`:
- konfigurasi sel RM eksperimen: `time` 10 level, 1 measure, DescStats + EstEffectSize + ObsPower;
- data `datasets.cjs`, n = 5000/10000/20000/40000;
- `rust/pkg` dari commit `8e2ddbd2` vs sekarang;
- dibandingkan per nilai: objek per kunci, *array* diurutkan dengan kunci yang sama, toleransi relatif 1e-9.

Hasil lengkapnya di `values/`. Pola yang sama muncul di keempat ukuran: **74 selisih, 8 di antaranya numerik**.

| Tabel | Selisih | Keterangan |
|---|---|---|
| Tests of Between-Subjects Effects | SS dan MS Intercept dan Error **×10 (= k)**; Sig. baris Error 1 → kosong | Skala SPSS T = Σy/√k (Tahap 2b, cocok dengan car). F, Sig., η², dan power tidak berubah. |
| Tests of Within-Subjects Effects | Noncent. Parameter baris GG/HF/LB (×ε) | SPSS memakai F × df terkoreksi (Tahap 2b). SS, df, MS, F, Sig., η², dan power sama. |
| Mauchly's Test | W 6,6·10⁻¹⁰² → 0; χ² 1.163.928,7 → kosong; Sig. 0 → kosong; kunci `time` → `score` | Matriks galat singular, lihat §3. ε GG/HF/LB sama (selisih < 1e-9). |
| Multivariate Tests | Tabel lama (Pillai 1, F 1,4·10²¹, Hotelling 2,5·10¹⁸) → tidak dihitung, dengan pesan | Matriks galat singular, lihat §3 |
| Tests of Within-Subjects Contrasts | Hanya label: *Source* `score` → `time`, `Error(score)` → `Error(time)` | Nilai sama |
| Descriptive Statistics | Tidak ada | — |
| `executed_functions` | Ditambah `build_rm_model` | Metadata |

Kesimpulannya, perubahan menyentuh jalur yang diukur dan tidak semua nilai numerik sama. Syarat "eksperimen tetap berlaku" tidak terpenuhi, sehingga keempat sel RM dijalankan ulang.

## 3. Temuan: data sintetis eksperimen menghasilkan matriks galat singular

Nilai sel eksperimen dibentuk sebagai 10 + 1,5·l + efek subjek + 0,7·sin(s + l). Karena sin(s + l) = sin s·cos l + cos s·sin l, variasi within-subject hanya berpangkat 2. Akibatnya matriks galat 9 × 9 dari kontras ortonormal singular, dan Mauchly serta uji multivariat tidak terdefinisi.
- **Sebelum perbaikan:** kode lama mencetak angka yang tidak bermakna tanpa peringatan (lihat §2), dan eksperimen kedua mencatat "0 error".
- **Setelah Tahap 2b:** Multivariate Tests menolak menghitung dan mencatat pesan. Mauchly masih mencetak W negatif (−1,6·10⁻¹⁰⁹) dengan χ² 0 dan Sig. 0, karena determinan matriks singular dibulatkan menjadi sedikit negatif.
- **Perbaikan Tahap 5 (commit `5fc6dc2c`, `RmModel::mauchly`):** kriteria singularitas disamakan dengan uji multivariat (nilai eigen minimum ≤ 1e-10·maksimum). W = 0, Chi-Square dan Sig. dikosongkan, ε tetap dihitung, dan pesannya dicatat di Errors Logs. Desain non-singular tidak berubah: regresi Gambar 51 identik pada presisi penuh.

Keluaran UI eksperimen kini berisi **16 tabel** (sebelumnya 17, karena Multivariate Tests hilang) dan **2 pesan Errors Logs**. Jumlah ini sama di semua run dan kedua mode (`ui-exp5000-1-main.json`, `ui-main-worker.json`).

Dataset eksperimen tidak diubah, karena mengganti desain data adalah keputusan eksperimen, bukan perbaikan kode.

## 4. Pemeriksaan setelah tahap ini

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| Build WASM RM, `next build` | — | Berhasil |
| Jest penuh (tanpa beban lain) | `jest-summary.txt`, `jest-failed-suites.txt` | 275 suite, **49 gagal = baseline** |
| Test acuan RM | — | 363 lulus, 20 *todo* (menunggu SPSS) |
| Regresi Gambar 51 | `regression-g51.txt` | Semua nilai sama dengan baseline (presisi penuh) |
| Determinisme (10× instance sama + 10× instance baru) | `determinism.json` | gambar51, a, b, c, L10M1, L10M2: 1 keluaran per desain |
| Tabel inti vs R, EMMeans vs afex, panic | `compare-r-*.txt` | 0 selisih; 68/68; tidak ada panic |
| Main vs worker, UI asli, build produksi | `ui-main-worker.json` | gambar51, a, b, c, cEm, dan **exp5000** (konfigurasi sel eksperimen, n = 5000): byte-identik di 4 run |

Catatan Jest:
- Putaran penuh sebelumnya (pada commit Tahap 4) berjalan bersamaan dengan perbandingan nilai di Node dan `cargo check`. Hasilnya ada 2 suite tambahan yang gagal: `multivariate.performance.test.ts` (`__test__` dan `test`), karena melewati batas 5 detik (7,08 s dan 5,54 s).
- Saat dijalankan sendiri, keduanya lulus (4,2 s dan 4,3 s), dan putaran penuh terakhir kembali 49 = baseline.
- Kedua test itu dekat batasnya dan peka terhadap beban mesin. Kode Multivariate tidak berubah.

## 5. Eksperimen ulang sel RM

Folder baru:
- `testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean-rm-rerun/`: keempat sel, 248 run.
- `testing/glm-web-worker/results/experiment-2026-09-22-cpu1-clean-rm-rerun-b/`: sel 20000 dan 40000, 124 run.

Protokolnya sama dengan eksperimen kedua (`--clean=true --loaf=true`, CPU 1×, 31 run per mode, bergantian). Dataset byte-identik. Semua run `ok` dan tidak ada run yang dibuang. Pemeriksaan sebelum OK tercatat 0 di semua run.

Sel 20000 dan 40000 di folder `-rm-rerun` terkena episode perlambatan mesin: kedua mode sekitar 2× lebih lambat pada 18:08–18:09 dan 18:11–18:18 WIB, dan penyebabnya tidak terlihat di log Windows. Karena itu kedua sel dijalankan ulang di `-rm-rerun-b`, tanpa episode serupa. Rinciannya ada di README masing-masing folder.

Median [IQR] steady-state, n = 30 per mode. LT = long task terpanjang (ms). Uji: Mann–Whitney satu arah B < A. Kolom §4.6 tidak diisi.

| n | Sumber | LT A | LT B | Waktu total A | Waktu total B | p (LT) | Â₁₂ |
|---|---|---|---|---|---|---|---|
| 5000 | eksperimen 2 (kode lama) | 130,5 [128,0–134,8] | 0,0 [0,0–0,0] | 243,2 [230,5–246,4] | 245,6 [234,2–254,4] | 5,9·10⁻¹³ | 1,000 |
| 5000 | **ulang** | 121,5 [120,0–123,8] | 0,0 [0,0–0,0] | 214,9 [212,8–228,8] | 224,4 [216,7–230,4] | 5,6·10⁻¹³ | 1,000 |
| 10000 | eksperimen 2 (kode lama) | 228,0 [225,0–231,0] | 0,0 [0,0–0,0] | 335,3 [329,6–347,6] | 345,8 [341,6–352,4] | 7,7·10⁻¹³ | 1,000 |
| 10000 | **ulang** | 228,0 [225,0–231,0] | 0,0 [0,0–0,0] | 326,1 [324,6–329,7] | 341,8 [339,0–345,5] | 5,9·10⁻¹³ | 1,000 |
| 20000 | eksperimen 2 (kode lama) | 437,5 [433,0–442,0] | 0,0 [0,0–0,0] | 548,0 [546,2–554,1] | 571,0 [561,8–576,2] | 6,0·10⁻¹³ | 1,000 |
| 20000 | ulang (terganggu) | 467,0 [455,5–865,5] | 0,0 [0,0–0,0] | 570,9 [563,9–1.054,2] | 586,5 [574,8–946,0] | 3,9·10⁻¹² | 1,000 |
| 20000 | **ulang-b** | 460,0 [458,2–465,0] | 0,0 [0,0–0,0] | 574,8 [562,8–578,5] | 577,2 [571,6–592,5] | 1,2·10⁻¹² | 1,000 |
| 40000 | eksperimen 2 (kode lama) | 874,0 [869,2–885,5] | 103,0 [86,5–107,8] | 979,5 [971,3–996,7] | 1.020,7 [1.005,1–1.040,3] | 1,5·10⁻¹¹ | 1,000 |
| 40000 | ulang (terganggu) | 942,0 [904,2–1.739,8] | 84,0 [80,0–128,5] | 1.049,8 [1.009,9–1.931,8] | 1.095,2 [1.056,1–2.041,0] | 1,5·10⁻¹¹ | 1,000 |
| 40000 | **ulang-b** | 893,0 [886,5–901,0] | 82,0 [80,0–85,0] | 995,3 [993,4–1.008,5] | 1.055,3 [1.042,0–1.060,4] | 1,5·10⁻¹¹ | 1,000 |

Baris tebal adalah data bersih yang mewakili kode sekarang. Dibandingkan eksperimen kedua:
- Pola tidak berubah:
  - long task terpanjang mode B = 0 sampai n = 20000;
  - pada n = 40000, mode B punya frame ~80 ms. Frame ini teratribusi ke `IDBRequest.onsuccess` di chunk dashboard bersama, bukan ke glue WASM atau service GLM, sama seperti sebelumnya;
  - semua uji p ≤ 1,5·10⁻¹¹ dengan Â₁₂ = 1.
- Besarannya bergeser beberapa persen:
  - LT A: −7% (5000), 0% (10000), +5% (20000), +2% (40000);
  - LT B pada 40000 turun dari 103 ke 82 ms;
  - waktu total mode B turun di 5000 dan 10000, naik 1–3% di 20000 dan 40000.
- Pergeseran ini gabungan dari perubahan kode dan kondisi mesin, dan tidak dipisahkan di sini.

`frontend/.../general-linear-model/result_compare.md` §10 masih merujuk ke data RM eksperimen kedua dan **tidak diubah** di tahap ini.
