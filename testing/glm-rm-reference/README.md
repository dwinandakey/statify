# Acuan GLM Repeated Measures (Tahap 0 perbaikan `fix/rm-correctness`)

Folder ini menyiapkan nilai acuan untuk memperbaiki modul GLM Repeated Measures.

- **Acuan utama: keluaran SPSS 27** yang dijalankan pengguna dengan sintaks di `spss/`.
- **Pembanding sementara:** R 4.3.2 (car 3.1.3, emmeans). Dipakai sampai keluaran SPSS tersedia, dan tidak menggantikan SPSS.

**Status (2026-09-22): keluaran SPSS 27 sudah diterima** di `spss-output/` (rm_a, rm_b, rm_c, gambar51). Semua 1047 nilai tabel yang dicek cocok dengan Statify (toleransi 0,001). Rinciannya ada di `results/spss-validation/README.md`. Setelah SPSS dijalankan ulang, perbarui nilai acuan dengan:

```bash
cd testing/glm-rm-reference/harness
python spss_extract.py                                  # spss-output/*.xlsx -> spss-tables.json, spss-values.json
node make-fixture.mjs --datasets=gambar51,a,b,c         # isi slot SPSS di fixture Jest
cd ../ && node harness/compare-spss.mjs --out=results/spss-validation/compare-spss.txt
```

## Isi folder

| Path | Isi |
|---|---|
| `data/rm_a.csv`, `rm_b.csv`, `rm_c.csv` | Dataset acuan (a), (b), (c) untuk diimpor ke Statify |
| `data/gambar51.csv` | Dataset validasi Gambar 51, diekspor dari `dataset/repeated measures.sav` |
| `spss/rm_a.sps`, `rm_b.sps`, `rm_c.sps`, `gambar51.sps` | Sintaks SPSS 27 dengan data *inline* (tanpa path berkas) |
| `spss/rm_d.sps`, `rm_e.sps` | Sintaks tambahan untuk validasi kontras Repeated (d) dan desain dua faktor within (e). Masing-masing membuka jendela output sendiri (`OUTPUT NEW`), dan export ke `spss-output/` sudah aktif. |
| `generate.py` | Pembuat CSV dan sintaks. Deterministik: Python `random.Random` dengan seed tetap, nilai dibulatkan ke bilangan bulat. |
| `r/reference.R` → `r-output/reference-r.{json,txt}` | Pembanding sementara di R |
| `harness/` | Menjalankan WASM Repeated Measures (`rust/pkg` yang sama dengan aplikasi) di Node dengan payload berbentuk sama seperti yang dibuat `repeated-measures-analysis.ts` |
| `statify-baseline/` | Keluaran Statify **sebelum** perbaikan (branch `fix/rm-correctness`, commit baseline `8e2ddbd2`) |
| `spss-output/` | Keluaran SPSS 27 dari pengguna (`*.xlsx`, `*.spv`) dan hasil ekstraksinya (`spss-tables.json`, `spss-values.json`) |
| `results/spss-validation/` | Perbandingan Statify vs SPSS 27 dan perbaikan setelahnya |

## Dataset

| Kode | Desain | Subjek | Variabel |
|---|---|---|---|
| (a) | Within-only, **dua measure** (`cemas`, `stres`) × faktor `waktu` 3 level | 16 | `cemas1..3`, `stres1..3` |
| (b) | Campuran: within `waktu` 4 level × between `kelompok` 3 grup (8 per grup) | 24 | `w1..w4`, `kelompok` (1, 2, 3) |
| (c) | Campuran dengan EMMeans dan homogeneity tests: within `sesi` 3 level × between `metode` 2 grup (10 per grup, sebaran berbeda) | 20 | `p1..p3`, `metode` (1, 2) |
| Gambar 51 | Within-only, `perlakuan` 4 level, 1 measure | 15 | `perlakuan1..4` |
| (d) | Data (b) dengan kontras **Repeated** (`/WSFACTOR=waktu 4 Repeated`), memakai `data/rm_b.csv` | 24 | seperti (b) |
| (e) | Within-only dengan **dua faktor within**: `kondisi` 2 level × `waktu` 3 level, 1 measure `skor`, tanpa faktor between | 15 | `k1w1, k1w2, k1w3, k2w1, k2w2, k2w3` (urutan SPSS: faktor terakhir berubah paling cepat) |

Kolom `subjek` hanya penanda dan tidak dipakai dalam analisis.

## Langkah di SPSS 27

1. Buka `spss/rm_a.sps` di *Syntax Editor*, lalu **Run → All**. Ulangi untuk `rm_b.sps`, `rm_c.sps`, dan `gambar51.sps`. Setiap berkas membuat datasetnya sendiri (`NEW FILE` + `DATA LIST`), jadi tidak ada data yang perlu dibuka lebih dulu.
2. Opsi yang diminta sintaks:
   - Semua dataset: `WSFACTOR … Polynomial`, `METHOD=SSTYPE(3)`, `ALPHA(.05)`.
   - (a), (b), (c): `PRINT=DESCRIPTIVE ETASQ OPOWER` (opsi Statify: Descriptive statistics, Estimates of effect size, Observed power).
   - (c): tambahan `HOMOGENEITY RSSCP`, dan `EMMEANS` untuk `OVERALL`, `metode` (COMPARE, Bonferroni), `sesi` (COMPARE, Bonferroni), dan `metode*sesi`.
3. Simpan keluaran ke `testing/glm-rm-reference/spss-output/`. Cara yang disarankan:
   - Hapus tanda `*` pada dua baris `OUTPUT EXPORT` di akhir setiap sintaks.
   - Ganti foldernya bila perlu, lalu jalankan lagi. Hasilnya berkas `rm_a.xlsx`, `rm_b.xlsx`, `rm_c.xlsx`, `rm_gambar51.xlsx`.
   - Alternatif: klik kanan tiap tabel → *Copy*, tempel ke Excel, lalu simpan dengan nama yang sama. Berkas `.spv` juga boleh ikut dikirim.

### Tabel yang perlu disalin

| Dataset | Tabel |
|---|---|
| (a) | Within-Subjects Factors · Descriptive Statistics · **Multivariate Tests** (Between Subjects: Intercept; Within Subjects: waktu) · **Mauchly's Test of Sphericity** (baris cemas dan stres) · **Tests of Within-Subjects Effects** (per measure, keempat koreksi) · Tests of Within-Subjects Contrasts · Tests of Between-Subjects Effects |
| (b) | Within-Subjects Factors · Between-Subjects Factors · Descriptive Statistics · **Multivariate Tests** (waktu, waktu * kelompok) · **Mauchly's Test of Sphericity** · **Tests of Within-Subjects Effects** (waktu, waktu * kelompok, Error(waktu)) · Tests of Within-Subjects Contrasts · **Tests of Between-Subjects Effects** (Intercept, kelompok, Error) |
| (c) | Semua tabel (b) untuk `sesi` × `metode`, ditambah: **Box's Test of Equality of Covariance Matrices** · **Levene's Test of Equality of Error Variances** (semua baris "Based on …") · Residual SSCP Matrix dan Bartlett's Test of Sphericity · **Estimated Marginal Means**: Grand Mean; metode (Estimates, Pairwise Comparisons, Univariate Tests); sesi (Estimates, Pairwise Comparisons, Multivariate Tests); metode * sesi |
| Gambar 51 | **Mauchly's Test of Sphericity**, untuk memastikan Approx. Chi-Square dan Sig. (lihat catatan 1) |
| (d) | **Tests of Within-Subjects Contrasts** (Repeated: Level 1 vs. Level 2, Level 2 vs. Level 3, Level 3 vs. Level 4, untuk `waktu` dan `waktu * kelompok`). Tabel lain sama dengan (b) dan ikut terekspor sebagai pengecekan. |
| (e) | Within-Subjects Factors · Descriptive Statistics · **Multivariate Tests** (kondisi, waktu, kondisi * waktu) · **Mauchly's Test of Sphericity** (ketiga efek) · **Tests of Within-Subjects Effects** (kondisi, waktu, kondisi * waktu dan Error-nya, keempat koreksi) · **Tests of Within-Subjects Contrasts** · **Tests of Between-Subjects Effects** |

**Cara menjalankan (d) dan (e):** buka `spss/rm_d.sps` lalu **Run → All**, kemudian `spss/rm_e.sps` lalu **Run → All**. Setiap sintaks membuka jendela output baru, dan berkas `spss-output/rm_d.xlsx` serta `rm_e.xlsx` langsung tersimpan. Kalau repositori ada di folder lain, ganti path di baris `OUTPUT EXPORT` di akhir sintaks. Berkas `.spv` boleh ikut disimpan ke folder yang sama.

Jangan jalankan eksperimen Web Worker bersamaan dengan SPSS (mesin yang sama).

Tabel bercetak tebal dipakai untuk validasi Tahap 2 (b), Tahap 3 (c), dan Tahap 4 (c). Toleransinya: selisih mutlak ≤ 0,001 untuk nilai yang ditampilkan SPSS dengan tiga desimal.

## Pembanding R (sementara)

```bash
"C:\Program Files\R\R-4.3.2\bin\Rscript.exe" r/reference.R data r-output
```

Cara perhitungan di `reference.R`:
- Aljabar matriks GLM multivariat dengan kontras polinomial ortonormal (setara `WSFACTOR … Polynomial`):
  - Matriks hipotesis H dan galat E pada variabel tertransformasi.
  - Uji multivariat dengan aproksimasi F dan η² parsial sesuai rumus GLM SPSS; untuk dua measure, uji *doubly multivariate*.
  - Mauchly dan epsilon dihitung dari E / (N − r).
  - Tipe III dengan kode *sum-to-zero*.
  - Box's M dengan aproksimasi F (Box 1949).
  - Levene berbasis *mean* dan *median*.
  - EMMeans dengan paket emmeans (Bonferroni).
- **Cek silang dengan `car::Anova`** (tipe III, per measure) ada di tabel `car_crosscheck` pada `r-output/reference-r.txt`. Selisih SS within, F within, Mauchly W, ε Greenhouse-Geisser, dan SS intercept between semuanya ≤ 2·10⁻¹⁰.
- **Perbedaan yang disengaja: epsilon Huynh-Feldt.** car memakai koreksi Lecoutre (N − g + 1). `reference.R` memakai rumus Huynh-Feldt asli, (N·p·ε − 2)/(p·(N − r − p·ε)) dibatasi 1, yang diperkirakan dipakai SPSS.
  - Tanpa faktor between (r = 1), kedua rumus sama.
  - Pada (b) dan (c) hasilnya berbeda (c: car 0,909, rumus asli 0,960). Nilai SPSS yang akan menentukan.

## Catatan

1. **Gambar 51 dan chi-square Mauchly.** Keluaran Statify saat ini (baseline) adalah W = 0,619, **Approx. Chi-Square = 6,104**, df = 5, **Sig. = 0,296**, GG = 0,747, HF = 0,896, LB = 0,333.
   - Nilai acuan pengguna adalah chi-square 6,164 dan Sig. 0,298. Dua nilai itu **tidak** dihasilkan Statify saat ini.
   - Build ulang dari `src` menghasilkan `wasm_bg.wasm` yang byte-identik dengan `pkg` ter-commit, jadi selisih ini bukan karena build lama.
   - R dengan rumus standar −(ν − (2p² + p + 2)/(6p))·ln W juga memberi 6,104. p-value dengan koreksi orde-2 Anderson (seperti `mauchly.test` di R) adalah 0,2975, yang dibulatkan menjadi 0,298.
   - `spss/gambar51.sps` disiapkan untuk memastikan angka SPSS. Sampai ada konfirmasi, regresi Gambar 51 memakai keluaran baseline Statify di atas dengan presisi penuh.
2. **Baseline Statify** (`statify-baseline/`) mereproduksi masalah yang sudah didiagnosis:
   - (b): error *"Empty matrices provided for multiplication"* pada `calculate_univariate_tests`.
   - (c): panic `unreachable` karena EMMeans.
   - (a): tidak ada error tercatat, tetapi nilainya tidak deterministik (Tahap 1).
