# Tahap 3: EMMeans (panic `RuntimeError: unreachable`)

Status: **diperbaiki, tervalidasi terhadap R (afex), menunggu SPSS** dataset (c). EMMeans **tidak diblokir** di dialog.

> **Pembaruan (setelah keluaran SPSS 27 diterima):** semua tabel tahap ini tervalidasi terhadap SPSS 27 (toleransi 0,001; pada presisi penuh selisih ≤ 4,4·10⁻⁴, hanya dari F tiga desimal SPSS). Lihat `../spss-validation/README.md`. Tabel Univariate/Multivariate Tests di bawah EM Means belum dibuat. Status di atas adalah catatan saat tahap ini selesai.

## Diagnosis

`stats/emmeans.rs` (lama):
- Mengakses `x_matrix[0]` tanpa cek. Matriks desain lama bisa kosong (within-only tanpa kolom apa pun), sehingga terjadi panic indeks di luar batas.
- Menyusun vektor L dengan asumsi kode dummy tanpa intercept, sehingga dimensinya tidak cocok dengan X'X (panic `Mul` nalgebra, terlihat di pilot).
- Di wasm32 panic = `unreachable` trap: instance modul rusak dan analisis berhenti tanpa output.

Selain panic, perhitungannya juga salah:
- EMMeans dihitung per sel within (per variabel dependen), bukan per measure seperti SPSS;
- `(OVERALL)` dan faktor within tidak didukung;
- perbandingan berpasangan (Compare main effects) tidak pernah dihitung.

Setelah Tahap 2 (matriks desain diperbaiki), konfigurasi pilot sudah tidak panic lagi, tetapi nilainya tetap salah (lihat kolom "sebelum" di `emmeans-panic-check.txt` pada log sesi).

## Perbaikan

- `RmModel::emmeans` (di `stats/rm_model.rs`):
  - Target: `(OVERALL)`, faktor between, faktor within, dan interaksinya (mis. `metode*sesi`).
  - Rata-rata marginal per measure dengan bobot sama: faktor between yang tidak disebut dirata-ratakan (kode efek = 0), dan level within dirata-ratakan (respons = rata-rata level within, atau kolom level itu).
  - Kovariat dievaluasi di rata-ratanya.
  - SE = √(L(X'X)⁻¹L' · MSE respons), CI dengan t(v).
  - Perbandingan berpasangan untuk target efek utama, dengan penyesuaian LSD(none)/Bonferroni/Sidak untuk p dan CI. Faktor within memakai variabel selisih y_i − y_j (pendekatan multivariat seperti SPSS).
- Target yang bukan faktor desain dicatat di Errors Logs ("EM Means '<target>': '<x>' is not a factor of this design"). Desain dengan > 1 faktor within mendapat pesan "not supported yet". Tidak ada jalur yang bisa panic.
- Hasil baru `emmeans_pairwise`. Pemformat membuat tabel **Estimated Marginal Means** per target (kolom Measure bila > 1 measure) dan **Pairwise Comparisons** (I, J, Mean Difference, Std. Error, Sig., CI untuk selisih).
- Dialog EM Means kini juga menawarkan faktor within (dan interaksinya dengan faktor between), seperti SPSS.

## Bukti

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| Konfigurasi yang dulu panic + input tak valid | `emmeans-panic-check.txt` | Tidak ada panic. Target tak valid dan 2 faktor within → pesan terbaca. |
| EMMeans (c) vs afex (`r/emmeans-afex.R`, `afex_options(emmeans_model = "multivariate")`) | `compare-emmeans-afex.txt` | **68/68 cocok**: (OVERALL), metode, sesi, metode*sesi (mean, SE, CI); pairwise Bonferroni metode dan sesi (selisih, SE, Sig., CI) |
| UI asli: dialog EM Means (4 target, Compare, Bonferroni), main vs worker | `ui-main-worker.json`, `ui-cEm-1-main.json` | 19 tabel, 0 error, byte-identik di 4 run |
| Tabel inti (a), (b), (c), Gambar 51 vs R | `compare-r-*.txt` | 0 selisih |
| Regresi Gambar 51, determinisme | `regression-g51.txt`, `determinism.json` | Sama; 1 keluaran per desain |
| Test Jest acuan | `__test__/repeated-measures-reference.test.ts` | 339 lulus, 18 *todo* "menunggu SPSS" |

## Belum dicakup

- SPSS juga mencetak tabel "Univariate Tests" (efek between pada EMMeans) dan "Multivariate Tests" (efek within pada EMMeans) di bawah EM Means. Keduanya tidak dibuat ulang karena nilainya sama dengan uji efek pada Tests of Between-Subjects Effects dan Multivariate Tests.
- Perbandingan berpasangan untuk target interaksi (COMPARE(faktor) di dalam interaksi) belum didukung. Hanya efek utama.
