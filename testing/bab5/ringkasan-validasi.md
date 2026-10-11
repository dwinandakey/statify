# Ringkasan validasi numerik (bahan BAB V)

- **Build:** angka diperoleh pada build `IdywReo5MTivt50HHa3VO`. Build final `JyX0CCEXNcyYSCxSLCIPP` (dan build `OrpyJfBOluV37xa0aqmFr` sebelumnya) memakai WASM yang sama dan hanya berbeda pada teks tampilan (respons WASM identik; WASM MV `wasm_bg.6145c2bf.wasm`, RM `wasm_bg.2bc2b212.wasm`). Nilai mentah Statify MV diambil dari respons worker yang dihasilkan lewat dialog asli (`testing/final/iterasi4/regresi/worker/`; konfigurasi tambahan: `testing/final/bagian2/`). Angka §1 identik pada build sebelum perbaikan temuan SPSS (`testing/final/bagian3/`).
- **Kriteria SPSS:** |Statify − SPSS| ≤ 0,001 (presisi penuh Statify vs nilai SPSS di berkas .xlsx).
- **Kriteria R:** selisih mutlak < 1·10⁻⁸.
- **Pembanding:**
  - IBM SPSS Statistics 27;
  - R 4.3.2 (R dasar; car 3.1.3 dan afex untuk RM; MVTests 2.3.1 untuk batas T²).
- **Asal data:** kolom "Sumber data asli" menyalin catatan di `testing/glm-mv-reference/README.md` §1 dan `testing/glm-rm-reference/README.md`. "Tidak diketahui" dipakai bila tidak tercatat.

## 1. GLM Multivariate vs SPSS 27

| Konfigurasi | Prosedur | Dataset | Sumber data asli | n | Nilai SPSS | Dibandingkan | Lulus | Selisih maks | Pembanding |
|---|---|---|---|---|---|---|---|---|---|
| mv1 | Satu populasi (μ₀ = 20, 200, 150, 3) | `hotelling 1 populasi.csv` | mtcars (Motor Trend 1974), Modul 3 APG | 32 | 132 | 120 | 120 | 4,81·10⁻⁴ | SPSS 27 |
| mv2 | Dua populasi (Pooled) | `hotelling 2 populasi independen.csv` | Modul 4 APG bagian C | 64 | 295 | 295 | 295 | 5,00·10⁻⁴ | SPSS 27 |
| mv3 | Berpasangan | `hotelling berpasangan (data asli).csv` | Modul 4 APG | 15 | 76 | 76 | 76 | 6,00·10⁻⁵ | SPSS 27 |
| mv4 | One-Way MANOVA | `one-way manova.csv` | Modul 5 APG Contoh 2 | 8 | 190 | 190 | 190 | 1,40·10⁻⁴ | SPSS 27 |
| mv4ph | One-Way + Post Hoc LSD, Bonferroni, Sidak | `one-way manova.csv` | Modul 5 APG Contoh 2 | 8 | 370 | 370 | 370 | 1,40·10⁻⁴ | SPSS 27 |
| mv5 | Two-Way MANOVA (faktorial penuh) | `two-way manova.csv` | Modul 6 APG; asal Posten (1962), dianalisis Kramer dan Jensen (1970) | 32 | 355 | 355 | 355 | 4,37·10⁻⁴ | SPSS 27 |
| mv6 | Two-Way MANOVA tak seimbang | `two-way manova tak seimbang.csv` | Turunan mv5 (6 kasus dihapus, `make_derived.R`) | 26 | 355 | 355 | 355 | 4,62·10⁻⁴ | SPSS 27 |
| mv7 | Dua grup dengan nilai hilang (listwise) | `hotelling 2 populasi independen dengan nilai hilang.csv` | Turunan mv2 (2 sel dikosongkan, `make_derived.R`) | 62 | 295 | 295 | 295 | 4,19·10⁻⁴ | SPSS 27 |
| mv8 | Two-Way MANOVA efek utama (tanpa interaksi) | `two-way manova.csv` | seperti mv5 | 32 | 283 | 283 | 283 | 4,08·10⁻⁴ | SPSS 27 |
| **Total MV (validasi awal)** | | | | | **2351** | **2339** | **2339** | 5,00·10⁻⁴ | |

- **12 nilai SPSS tanpa padanan (mv1):** Descriptive Statistics GLM SPSS berisi mean selisih (x − μ₀), sedangkan Statify menampilkan variabel asli. Mean variabel asli dicocokkan dengan tabel Report SPSS (12 nilai, termasuk dalam 120).
- **Selisih terbesar** (orde 10⁻⁴) berasal dari nilai F/SS yang disimpan SPSS dengan tiga desimal.
- **Rincian per tabel:** `testing/final/bagian3/compare-spss.txt` (diulang pada build sesudah perbaikan: `testing/final/iterasi4/regresi/compare-spss.txt`).
- **Konfigurasi tambahan** (mv9, mv6 Type I/II, δ₀): §5. **Total MV vs SPSS 27: 2339 + 1086 = 3425 nilai, semuanya lulus.**

## 2. GLM Repeated Measures vs SPSS 27 dan R

| Dataset | Desain | Sumber data asli | n | Nilai SPSS dibandingkan | Lulus | Selisih maks | Pembanding |
|---|---|---|---|---|---|---|---|
| Gambar 51 | Within-only, `perlakuan` 4 level, 1 measure | `dataset/repeated measures.sav`; asal di luar itu tidak diketahui | 15 | 91 | 91 | 3,85·10⁻⁴ | SPSS 27 |
| (a) | Within-only, 2 measure × `waktu` 3 level | Sintetis (`generate.py`, seed tetap) | 16 | 282 | 282 | 4,41·10⁻⁴ | SPSS 27 |
| (b) | Campuran: `waktu` 4 level × `kelompok` 3 grup | Sintetis (`generate.py`, seed tetap) | 24 | 271 | 271 | 2,95·10⁻⁴ | SPSS 27 |
| (c) | Campuran + EM Means, Box's M, Levene, Residual SSCP | Sintetis (`generate.py`, seed tetap) | 20 | 403 | 403 | 4,26·10⁻⁴ | SPSS 27 |
| (d) | Data (b), kontras Repeated | seperti (b) | 24 | 271 | 271 | 2,95·10⁻⁴ | SPSS 27 |
| **Total RM (SPSS)** | | | | **1318** | **1318** | 4,41·10⁻⁴ | |
| Pembanding R | Dataset yang sama | — | — | 353 | 353 | — | R 4.3.2 (car 3.1.3, afex) |

- **Uji acuan RM di build final:** 1681 lulus (1318 SPSS + 353 R + 10 uji fungsional), `testing/final/bagian3/rm/rm-reference.log`.
- **Desain (e) (dua faktor within):** 332 nilai SPSS disimpan tetapi tidak cocok dengan modul lama, sehingga desain ini diblokir. Nilai ini tidak termasuk dalam total.
- **Rincian:** `testing/glm-rm-reference/results/spss-validation-de/compare-spss.txt`.

## 3. Fitur tambahan vs R

| Fitur | Konfigurasi / data | Nilai dibandingkan | Selisih maks | Pembanding | Bukti |
|---|---|---|---|---|---|
| δ₀ dua populasi (Pooled, Unequal) | mv2d vs mv2s, mv2wd vs mv2ws (data geser manual) | Seluruh respons worker | identik byte | Kesetaraan dengan data geser (SPSS menunggu) | `testing/glm-mv-reference/results/fix-steps/step19-v4/v4-check.txt` B |
| δ₀ berpasangan | mv3d vs mv3s | Seluruh respons | 2,04·10⁻¹⁷ | Kesetaraan dengan data geser (SPSS menunggu) | idem |
| CI simultan T² dan Bonferroni | mv1ci, mv1ci10, mv2ci, mv2dci, mv3ci, mv3dci, mv2wci | 216 | 1,31·10⁻¹² | R dasar (`testing/fitur-v4/r/ci_simultan.R`) | idem C |
| CI Unequal (Krishnamoorthy–Yu, Welch t) | mv2wci | 36 (bagian dari 216) | 5,77·10⁻¹⁴ | R dasar, `t.test(var.equal = FALSE)` | idem C |
| Batas T² | CI Pooled dan satu populasi | — | < 1·10⁻⁸ | MVTests 2.3.1 | idem C |
| Uji Welch (T², F, df2, Sig. df pecahan) | mv2wci, mv2wd, mv2ws | T², F, df2, Sig. per konfigurasi | 2,13·10⁻¹⁴ | R dasar (`welch_sig.R`, `pf`) | idem E |
| Wilks' Lambda df2 pecahan | mv9 (3 DV, faktor 4 level tak seimbang, n = 26; data sintetis deterministik `make_mv9.R`) | 28 | 2,71·10⁻¹⁰ | R dasar (`make_mv9.R`) | `testing/fitur-v5/results/b1-mv9-vs-r.txt` |
| SS Intercept Type I/II = R(μ) | mv6 (Type I–IV) | 32 SS + 8 baris Multivariate Tests Intercept | 8,73·10⁻¹¹ | R `summary(manova, intercept = TRUE)`, n·ȳ² | `testing/fitur-v5/results/b2-mv6-vs-r.txt` |
| Uji khi-kuadrat Σ diketahui dan CI χ²/Bonferroni z | 12 kasus: satu populasi (α 0,05 dan 0,10), dua populasi Σ₁ = Σ₂ dan Σ₁, Σ₂ (δ₀ = 0 dan ≠ 0), berpasangan (δ₀ = 0 dan [8, 3]), sifat Σ = S dan Σ = I | 300 | 3,64·10⁻¹⁰ | R dasar (`n*mahalanobis`, `pchisq`, `qchisq`, `qnorm`) | `testing/final/bagian1/known-sigma-vs-r.txt` |

- **Berlaku untuk build final:** payload konfigurasi di atas identik dengan v5. Nilai mentah identik byte dengan v5 kecuali perubahan yang disengaja: Observed Power baris F = 0 pada konfigurasi δ₀/data geser (0 → 0,05) dan Noncent. Parameter/Observed Power Wilks mv9 (§5). Nilai yang dibandingkan dengan R di tabel ini tidak berubah (`testing/final/iterasi4/regresi/raw-vs-v5-diharapkan.txt`). Respons v5 sama dengan v4 kecuali Observed Power Welch (df pecahan).
- **Konfigurasi Σ diketahui lewat UI** (mvK1–mvK4): nilai mentah `known_covariance_test` identik dengan harness yang divalidasi R (`testing/final/bagian3/known-vs-r.txt`, `testing/final/iterasi4/regresi/known-vs-r.txt`).
- **Sifat:** Σ = S memberi χ² = T² pada satu populasi, dua populasi (S_pooled), dan berpasangan (selisih < 10⁻¹²). Σ = I memberi χ² = n·Σ(x̄ − μ₀)² (selisih relatif 1,8·10⁻¹⁵).

## 4. Contoh sleeping dog (Johnson & Wichern, ed. 6, §6.2)

Data `testing/fitur-v4/data/sleeping-dog.csv` (19 anjing, y1–y4) dan kontras `sleeping-dog-kontras.csv` (d1 halotan, d2 CO2, d3 interaksi). Nilai yang diharapkan diambil dari contoh J&W §6.2. Nilai tampil diambil dari build final lewat UI (`testing/bab5/sleeping-dog/`, 7 tangkapan, `hasil.json`), dan pembanding R dari `testing/fitur-v4/r/sleeping_dog.R`.

| Analisis | Nilai yang diharapkan | Tampil di Statify (build final) | R dasar |
|---|---|---|---|
| RM, faktor within perlakuan (4 level), measure "anjing" | Hotelling's Trace 6.4454; F(3, 16) = 34.375; Sig. < .001 | Hotelling's Trace 6.4454; F 34.3752; df 3 dan 16; Sig. <.001 | 6.445351; 34.375206; Sig. 3.32·10⁻⁷ |
| MV satu populasi, DV d1–d3, μ₀ = 0 | T² = 116.02; Hotelling's Trace 6.4454 | T² 116.0163; Hotelling's Trace 6.4454; F 34.3752; df 3, 16; Sig. <.001 | T² 116.016321 |
| CI T² 95% | d1 209.32 ± 73.67; d2 −60.05 ± 54.67; d3 −12.79 ± 65.94 | d1 209.3158 [135.6503, 282.9813]; d2 −60.0526 [−114.7271, −5.3782]; d3 −12.7895 [−78.7286, 53.1496] | setengah lebar 73.665492, 54.674451, 65.939111 |

Semua nilai tampil sama dengan nilai yang diharapkan. Bonferroni d1: 150.5136–268.1180.

## 5. Konfigurasi tambahan vs SPSS 27 (sintaks yang semula tertunda)

Keluaran SPSS dijalankan penulis pada 2026-09-25 (`testing/SPSS-TODO.md`) dan dibandingkan dengan nilai mentah Statify build final (respons worker lewat UI). Rincian: `testing/final/bagian2/`.

| Konfigurasi | Prosedur | Dataset | Sumber data asli | n | Nilai SPSS | Lulus | Selisih maks | Pembanding |
|---|---|---|---|---|---|---|---|---|
| mv9 | One-Way MANOVA, 3 DV, faktor 4 level tak seimbang (Wilks df2 pecahan) | `one-way manova tiga dv empat level.csv` | Sintetis deterministik (`make_mv9.R`) | 26 | 259 | 259 | 4,97·10⁻⁴ | SPSS 27 |
| mv6 Type I | Two-Way tak seimbang, Sum of Squares Type I | `two-way manova tak seimbang.csv` | Turunan mv5 (`make_derived.R`) | 26 | 228 | 228 | 4,62·10⁻⁴ | SPSS 27 |
| mv6 Type II | Two-Way tak seimbang, Sum of Squares Type II | `two-way manova tak seimbang.csv` | Turunan mv5 (`make_derived.R`) | 26 | 228 | 228 | 4,62·10⁻⁴ | SPSS 27 |
| mv2 δ₀ | Dua populasi, δ₀ = (3, 2, 10, 1), Pooled | `hotelling 2 populasi independen.csv` | Modul 4 APG bagian C | 64 | 295 | 295 | 5,00·10⁻⁴ | SPSS 27 (data digeser di sintaks) |
| mv3 δ₀ | Berpasangan, δ₀ = (8, 3) | `hotelling berpasangan (data asli).csv` | Modul 4 APG | 15 | 76 | 76 | 4,03·10⁻⁴ | SPSS 27 (DV = d − δ₀) |
| **Total** | | | | | **1086** | **1086** | | |

- **Status "menunggu SPSS" SS Intercept Type II:** selesai; nilainya cocok dengan SPSS (R(μ) = n·ȳ²).
- **Dua temuan sebelum perbaikan** (1081/1086), keduanya diperbaiki di crate MV sesudah iterasi 3 black-box:
  1. Noncent. Parameter dan Observed Power Wilks' Lambda bila p ≥ 3 dan df_h ≥ 3 (mv9): Statify memakai F·df₁, sedangkan SPSS memakai df₂·η²/(1 − η²).
  2. Observed Power bila F = 0 (baris dengan δ₀ tepat sama dengan selisih rata-rata): Statify 0, sedangkan SPSS 0,05 (= α).
- Uji χ² Σ diketahui dan uji Welch tidak punya padanan di SPSS GLM, sehingga keduanya divalidasi dengan R (§3).
