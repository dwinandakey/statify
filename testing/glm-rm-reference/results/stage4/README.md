# Tahap 4: homogeneity tests

Status: **diperbaiki dan disesuaikan dengan SPSS**. Levene (mean, median) tervalidasi terhadap R car. Box's M menunggu SPSS: di R hanya dicek dengan rumus Box (1949) karena uji ini tidak ada di car/afex. Tidak diblokir di dialog.

## Uji yang diimplementasikan sebelumnya

Opsi **Homogeneity tests** memanggil `calculate_bartlett_test` (`stats/bartlett_test.rs`), yang:
- menghitung **Bartlett's Test of Sphericity**, yaitu uji bahwa matriks **korelasi** = identitas, **bukan** uji homogenitas;
- memakai **variabel faktor between** (`main.FactorsVar`) sebagai "variabel dependen", dengan kode faktornya sebagai angka;
- mensyaratkan ≥ 2 faktor between. Itulah sumber error "At least two dependent variables are required for Bartlett's test" pada hampir semua desain, termasuk semua desain within-only dan desain dengan satu faktor between.

SPSS 27 dengan `/PRINT=HOMOGENEITY` pada GLM Repeated Measures berfaktor between menampilkan:
- **Box's Test of Equality of Covariance Matrices**: kesamaan matriks kovarians semua variabel dependen antar-sel between;
- **Levene's Test of Equality of Error Variances**: per variabel dependen, dengan baris Based on Mean / Median / Median and with adjusted df / trimmed mean.

Bartlett's Test of Sphericity (matriks kovarians residual ∝ identitas) di SPSS muncul pada `/PRINT=RSSCP` (Residual SSCP matrix).

## Perbaikan

- Homogeneity tests → `RmModel::homogeneity_tests`:
  - **Box's M** dengan aproksimasi F (Box 1949: c1, c2, df1, df2). Bila ada sel yang tidak punya cukup kasus atau matriks kovariansnya singular, tabel Box's M tidak dibuat dan alasannya dicatat di Errors Logs, seperti catatan SPSS.
  - **Levene** per variabel dependen atas sel faktor between:
    - Based on Mean dan Based on Median;
    - Based on Median and with adjusted df (df2 = (Σu)²/Σ u²/(nᵢ − 1), u = SS dalam sel dari |y − median|);
    - Based on trimmed mean (trimmed mean 5% gaya SPSS EXAMINE, dengan pembobotan kasus pecahan).
  - Desain tanpa faktor between menghasilkan pesan "Homogeneity tests (Box's M, Levene) need at least one between-subjects factor".
- **Bartlett's Test of Sphericity** dipindah ke opsi **Residual SSCP matrix**, dihitung dari matriks galat model.
  - `calculate_bartlett_test_from_residual` diperbaiki dari dua bug: determinan korelasi dicampur dengan trace kovarians, dan W dipangkatkan (n − r)/2 lalu dikali (n − r) lagi.
  - Sekarang W = |S|/(tr S/p)^p dengan S = E/(n − r), χ² = −ρ(n − r)·ln W, df = p(p + 1)/2 − 1, p-value dengan koreksi ω₂.
- Pemformat dan modul output: tabel "Box's Test of Equality of Covariance Matrices" dan "Levene's Test of Equality of Error Variances" (disimpan sebelum Between-Subjects Effects, seperti urutan SPSS).
- `calculate_bartlett_test` lama tidak dipanggil lagi, tetapi dibiarkan di kode.

## Bukti

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| Levene (c) vs R car `leveneTest(center = mean / median)` | test Jest acuan | 24/24 cocok (statistik, df1, df2, Sig.) |
| Box's M (c) vs rumus Box (1949) di `r/reference.R` (cek pengembangan, bukan nilai test) | log sesi | M 13,5347; F 1,8427; df 6/2347,47; Sig. 0,0872: sama persis |
| Bartlett residual (c) vs perhitungan R dengan rumus yang sama | `bartlett-residual.txt` | W 0,0868; χ² 40,869; df 5: sama |
| UI asli: (c) dengan Homogeneity tests lewat dialog Options, main vs worker | `ui-main-worker.json`, `ui-c-1-main.json` | 15 tabel, 0 error (sebelumnya error Bartlett), byte-identik. Pemeriksaan UI ini dijalankan sebelum perbaikan Bartlett residual, yang hanya memengaruhi opsi Residual SSCP. |
| Within-only + Homogeneity tests | `other-paths.txt` | Pesan jelas, tidak ada panic |
| Regresi Gambar 51, determinisme, tabel inti vs R, EMMeans vs afex | `regression-g51.txt`, `determinism.json`, `compare-r-*.txt` | Semua sama/cocok |
| Jest penuh | `jest-summary.txt`, `jest-failed-suites.txt` | 49 gagal = baseline; test acuan 363 lulus, 20 *todo* SPSS |

## Menunggu SPSS

- Box's M (c): Box's M, F, df1, df2, Sig.
- Levene (c): baris *Median and with adjusted df* dan *trimmed mean*, karena bentuk persis SPSS tidak tersedia di car.
- Bartlett's Test of Sphericity (c, `/PRINT=RSSCP`): termasuk apakah "Likelihood Ratio" di SPSS adalah W atau W^((n−r)/2).
