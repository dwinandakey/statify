# Validasi terhadap keluaran SPSS 27 (2026-09-22)

Acuan: keluaran SPSS 27 yang dijalankan pengguna dari `spss/rm_a.sps`, `rm_b.sps`, `rm_c.sps`, dan `gambar51.sps`, diekspor ke `spss-output/*.xlsx` (beserta `.spv`).

- `rm_a.xlsx` juga memuat keluaran rm_b di awal, karena `OUTPUT EXPORT` mengekspor seluruh isi Viewer. Salinan itu identik dengan `rm_b.xlsx`.
- Tabel dipisahkan per dataset lewat baris `[rm_a]`, `[rm_b]`, dan seterusnya.

## Alur

1. `harness/spss_extract.py` membaca xlsx dengan pustaka standar Python (`harness/read_xlsx.py`) dan menulis:
   - `spss-output/spss-tables.json`: semua tabel;
   - `spss-output/spss-values.json`: 1047 nilai dari tabel yang dicek, dengan kunci sama seperti slot fixture dan `spss_source` (berkas + tabel).
2. `harness/make-fixture.mjs --datasets=gambar51,a,b,c` mengisi slot SPSS di `__test__/fixtures/rm-reference-values.json`: **1047 slot, semuanya terisi, 0 "menunggu SPSS"**.
   - Slot η², noncentrality, dan power Gambar 51 dihapus, karena `gambar51.sps` tidak memintanya (sama dengan Gambar 51 asli) dan Statify juga tidak menghitungnya pada desain itu.
3. `__test__/repeated-measures-reference.test.ts` membandingkan tiap nilai dengan toleransi |Statify − SPSS| ≤ 0,001.
   - Semua desain memakai kontras **Polynomial** seperti sintaks SPSS.
   - Dataset (c) juga memakai Residual SSCP.
4. `harness/compare-spss.mjs` membuat perbandingan presisi penuh (`compare-spss.txt`, `compare-spss.json`).

Nilai F yang dicetak SPSS dengan huruf catatan kaki (mis. "24.593b") disimpan SPSS sebagai teks tiga desimal. Karena itu selisih maksimum di tabel Multivariate sekitar 4·10⁻⁴; nilai lain dibandingkan pada presisi penuh.

## Hasil pertama (kode commit `a6985509`)

- Test acuan dengan 728 slot SPSS awal: **1084 lulus, 1 gagal**, yaitu Sig. Mauchly Gambar 51 (Statify 0,29628, SPSS 0,29750).
- Perbandingan presisi penuh menemukan satu selisih lagi: Likelihood Ratio pada Bartlett's Test of Sphericity (Statify 0,0868, SPSS 2,43·10⁻¹¹).
- Tabel atau bagian tabel SPSS yang tidak ada padanannya di Statify:
  - Tests of Within-Subjects Contrasts **Polynomial** (Statify selalu menghitung *repeated*, pilihan kontras di dialog diabaikan);
  - sub-tabel **Multivariate** pada Tests of Within-Subjects Effects untuk dua measure (dataset a);
  - bagian **Covariance** dan **Correlation** pada Residual SSCP Matrix;
  - Univariate Tests / Multivariate Tests di bawah EM Means.

## Perbaikan

| Temuan | Perbaikan | Bukti |
|---|---|---|
| Sig. Mauchly tanpa koreksi orde kedua | `glm_tests::sphericity_significance`: P = P(χ²_f > c) + ω₂·[P(χ²_{f+4} > c) − P(χ²_f > c)], dengan ω₂ = (p+2)(p−1)(p−2)(2p³+6p²+3p+2)/(288p²v²ρ²), rumus yang juga dipakai `mauchly.test` di R. Dipakai di `rm_model.rs` dan modul lama `mauchly_test.rs`. Untuk p = 2 (3 level), ω₂ = 0 sehingga (a) dan (c) tidak berubah. | Gambar 51: 0,2975045146266828 vs SPSS 0,29750451462668587. (b): selisih 3,6·10⁻⁴ → 5·10⁻¹⁵ |
| Likelihood Ratio Bartlett | SPSS mencetak W^(N/2) (N = jumlah kasus), bukan W. Label pemformat diubah menjadi "Likelihood Ratio" seperti SPSS. | (c): 2,432075063293607·10⁻¹¹ vs 2,4320750632936687·10⁻¹¹. χ², df, dan Sig. sudah sama sebelumnya. Hanya (c) yang tersedia, sehingga eksponen N/2 dan (N − r + 2)/2 tidak bisa dibedakan (sama-sama 10). |
| Pilihan kontras dialog diabaikan | `RmModel` membaca `FactorList` ("sesi(Repeated)" atau "sesi (polynomial, Ref: Last)"). **Polynomial**: kontras polinomial ortonormal (Linear, Quadratic, Cubic, Order 4, …) seperti `WSFACTOR … Polynomial`. **Repeated**: seperti sebelumnya, dan tetap menjadi bawaan dialog. Jenis lain → pesan di Errors Logs, dan di dialog Contrast hanya Polynomial dan Repeated yang ditawarkan, dengan catatan "Only Polynomial and Repeated contrasts are supported in this version." | Kontras polinomial keempat dataset: 163 nilai, selisih maksimum 4,9·10⁻¹⁰ |
| Sub-tabel Multivariate (averaged) tidak ada | `RmModel::averaged_multivariate` untuk > 1 measure: H*_ml = Σ_c H_(m,c)(l,c), E* sama, df hipotesis = df(sumber)·p, df galat = v·p. Tabel baru "Tests of Within-Subjects Effects (Multivariate)" dengan catatan "Tests are based on averaged variables." | (a): 32 nilai (Pillai, Wilks, Hotelling, Roy), selisih maksimum 4,4·10⁻⁴ (F catatan kaki SPSS) |
| Residual SSCP tanpa Covariance/Correlation | `RmModel::residual_matrix`: SSCP, Covariance (SSCP/(N − r)), dan Correlation dari matriks galat model. Pemformat menampilkan tiga blok seperti SPSS dengan nama variabel asli. | (c): 27 nilai, selisih maksimum 1,1·10⁻¹³ |

## Hasil akhir (`compare-spss.txt`)

Semua 1047 nilai SPSS dibandingkan, dan **tidak ada selisih > 0,001**. Selisih maksimum per tabel:

| Tabel | gambar51 | a | b | c |
|---|---|---|---|---|
| Descriptive Statistics | — | 3,6·10⁻¹⁵ | 7,1·10⁻¹⁵ | 7,1·10⁻¹⁵ |
| Box's M | — | — | — | 4,6·10⁻¹² |
| Bartlett's Test of Sphericity | — | — | — | 5,0·10⁻¹⁴ |
| Multivariate Tests | 3,9·10⁻⁴ ¹ | 4,1·10⁻⁴ ¹ | 3,0·10⁻⁴ ¹ | 4,3·10⁻⁴ ¹ |
| Mauchly's Test of Sphericity | 8,9·10⁻¹⁵ | 2,1·10⁻¹⁴ | 5,3·10⁻¹⁵ | 7,6·10⁻¹⁵ |
| Tests of Within-Subjects Effects: Multivariate | — | 4,4·10⁻⁴ ¹ | — | — |
| Tests of Within-Subjects Effects (Univariate) | 5,8·10⁻¹¹ | 7,1·10⁻¹³ | 1,5·10⁻¹¹ | 1,2·10⁻¹¹ |
| Tests of Within-Subjects Contrasts (Polynomial) | 4,9·10⁻¹⁰ | 2,4·10⁻¹² | 1,3·10⁻¹¹ | 1,2·10⁻¹¹ |
| Levene's Test (4 baris per variabel) | — | — | — | 3,1·10⁻¹⁴ |
| Tests of Between-Subjects Effects | 2,9·10⁻¹¹ | 2,9·10⁻¹¹ | 1,2·10⁻¹⁰ | 2,9·10⁻¹¹ |
| Residual SSCP Matrix | — | — | — | 1,1·10⁻¹³ |
| EM Means (Estimates) | — | — | — | 6,4·10⁻¹⁴ |
| EM Means (Pairwise Comparisons) | — | — | — | 6,1·10⁻¹⁴ |

¹ Hanya dari nilai F yang disimpan SPSS dengan tiga desimal (catatan kaki "Exact statistic"/"upper bound"); nilai lain di tabel ini sama pada presisi ~10⁻¹³.

Temuan tambahan:
- **Gambar 51:** SPSS memberi Approx. Chi-Square **6,104** (6,103523…), sama dengan Statify. Angka 6,164 di daftar nilai Gambar 51 kemungkinan salah ketik. Sig. SPSS 0,2975 = ".298", dan kini sama dengan Statify.
- **Huynh-Feldt:** SPSS 27 memakai rumus asli (c: 0,9602), sama dengan Statify, bukan varian Lecoutre di car (0,909).

## Bug dialog Contrast yang ditemukan di pemeriksaan UI

Saat Polynomial dipilih lewat dialog asli, `FactorList` menjadi `sesi(None) (polynomial, Ref: Last)`, dan pada pembukaan berikutnya `sesi(polynomial) (polynomial, …)`. Mesin menolaknya, dan keluaran run pertama berbeda dari run berikutnya. Masalah ini sudah ada sebelumnya dan sebelumnya tidak terlihat, karena mesin mengabaikan kontras.

Penyebabnya, nama faktor dipisah dengan `" ("`, padahal format bawaannya `sesi(None)` tanpa spasi. Selain itu, `repeated-measures-main.tsx` mencocokkan entri tanpa `trim()`, sehingga pilihan pengguna ter-reset.

Perbaikan:
- `contrast.tsx` dan `repeated-measures-main.tsx` memakai `split("(")[0].trim()`.
- Parser Rust membaca kelompok kurung terakhir.

Setelah perbaikan, desain `cPoly` (UI asli) menghasilkan 17 tabel, 0 error, dan byte-identik di 4 run main/worker. Dialog hanya menawarkan Repeated dan Polynomial.

## Pemeriksaan

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| Build WASM RM, `next build` | — | Berhasil |
| Test acuan RM (1047 nilai SPSS + 353 nilai R) | `__test__/repeated-measures-reference.test.ts` | 3 suite RM, 1410 test lulus, 0 *todo* |
| Jest penuh | `jest-summary.txt`, `jest-failed-suites.txt` | Putaran 1: 49 gagal = baseline. Putaran final (setelah perbaikan dialog Contrast): 50, yaitu 49 baseline + `multivariate.performance.test.ts` (5197 ms > batas 5000 ms). Dijalankan sendiri lulus (4219 ms); kode Multivariate tidak berubah. |
| Regresi Gambar 51 | `regression-g51.txt` | W, χ², df, dan ε sama dengan baseline (presisi penuh) dan SPSS. Sig. berubah sengaja 0,29628 → 0,29750 = SPSS |
| Determinisme (10× instance sama + 10× instance baru) | `determinism.json` | gambar51, a, b, c, L10M1, L10M2: 1 keluaran per desain |
| Tabel inti vs R (Mauchly Sig. kini dibandingkan dengan versi ω₂ di `reference.R`), EMMeans vs afex, panic | `compare-r-*.txt` | 0 selisih; 68/68; tidak ada panic |
| Main vs worker, UI asli, build produksi | `ui-main-worker.json`, `ui-cPoly-1-main.json`, `ui-a-1-main.json` | gambar51, a, b, c, cEm, **cPoly** (Contrast Polynomial + Residual SSCP), exp5000: byte-identik di 4 run |

## Dampak ke eksperimen Web Worker

Konfigurasi sel RM eksperimen: within-only, 1 measure, 10 level, kontras bawaan (Repeated).
- **Keluaran WASM byte-identik** dengan pkg commit `a6985509`, yang dipakai eksperimen ulang (`harness/tahap5-compare.mjs --old=<pkg a6985509>`, n = 5000/10000/20000/40000).
- **Tabel UI exp5000 identik** (`output_data` 16 tabel sama dengan `../stage5/ui-exp5000-1-main.json`).

Pada data eksperimen, perubahan kode di jalur yang diukur terbatas pada:
- membaca satu entri `FactorList`;
- satu `match` jenis kontras per baris kontras.

Sig. Mauchly memakai cabang singular (tidak berubah), sedangkan Bartlett, Residual, dan Multivariate averaged tidak dijalankan. Data eksperimen ulang (`experiment-2026-09-22-cpu1-clean-rm-rerun` dan `-rm-rerun-b`) tetap mewakili keluaran kode sekarang.

## Belum dicakup

- **Univariate Tests** (target between) dan **Multivariate Tests** (target within) di bawah EM Means belum dibuat. Nilai F, Sig., η², dan power-nya sama dengan tabel utama; SS tabel univariat SPSS = SS between / k.
- **Kontras Repeated** (bawaan dialog Statify) belum divalidasi terhadap SPSS. Untuk itu perlu sintaks dengan `/WSFACTOR=… Repeated`.
- **Bawaan dialog tetap Repeated**, sedangkan bawaan SPSS Polynomial. Mengganti bawaan ke Polynomial akan mengubah tabel kontras sel RM eksperimen, sehingga keempat sel perlu dijalankan ulang lagi (sekitar 1 jam). Keputusan ini diserahkan ke pengguna.
- Desain dengan lebih dari satu faktor within tetap memakai modul lama. Tidak ada keluaran SPSS untuknya.
