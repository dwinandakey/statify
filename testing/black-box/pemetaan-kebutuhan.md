# Pemetaan kebutuhan fungsional (Tabel 5 revisi) ke kode: GLM Multivariate dan GLM Repeated Measures

- **Versi yang dipetakan:** **skripsi-final-v2** (branch `ilham`, tag `skripsi-final-v2`, commit `d863de09`), diperbarui untuk **skripsi-final-v3** (tag `skripsi-final-v3`; lima perbaikan frontend hasil iterasi 1 black-box, lihat bagian "Perubahan v3"), lalu **skripsi-final-v4** (tag `skripsi-final-v4`; dua fitur dari masukan dosen pengampu APG, lihat bagian "Perubahan v4"). Pemetaan v1 (`skripsi-final-v1`, `e365897d`) ada di riwayat git berkas ini (commit `db546515`).
- **Metode:** penelusuran kode (dialog, subdialog, service, formatter, crate Rust). Semua pesan dalam dokumen ini disalin dari kode v2: huruf, tanda baca, dan titik di akhir.
- **Path singkatan:**
  - `MV/` = `frontend/components/Modals/Analyze/general-linear-model/multivariate/`
  - `RM/` = `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/`
  - `GLM/` = `frontend/components/Modals/Analyze/general-linear-model/`

## Redaksi Tabel 5 yang direvisi

Hanya KF10, KF11, KF12, dan KF14 yang berubah. KF lain memakai redaksi semula.

- **KF10:** Sistem dapat melakukan pemeriksaan asumsi, yaitu uji Box's M dan uji Levene secara opsional, serta uji sferisitas Mauchly yang dihitung otomatis pada desain pengukuran berulang.
- **KF11:** Sistem dapat melakukan uji lanjut secara opsional dengan metode LSD, Bonferroni, dan Sidak, melalui Post Hoc pada GLM Multivariate dan perbandingan berpasangan rata-rata marginal (EM Means, Compare main effects) pada GLM Repeated Measures.
- **KF12:** Sistem dapat melakukan analisis profil (uji kesejajaran, kesamaan level, dan kerataan) melalui desain pengukuran berulang dengan faktor antarsubjek.
- **KF14:** Sistem dapat menampilkan hasil analisis dalam bentuk tabel serta grafik diagnostik residual pada GLM Multivariate.

## Ringkasan status (v2, terhadap redaksi revisi)

| KF | Kebutuhan (ringkas) | Status v1 (redaksi lama) | Status v2 (redaksi revisi) |
|---|---|---|---|
| KF1 | Pemilihan analisis di kelompok GLM Multivariate | TERPENUHI | TERPENUHI |
| KF2 | Uji vektor rata-rata satu populasi | TERPENUHI | TERPENUHI |
| KF3 | Dua populasi, kovarians sama dan tidak sama | TERPENUHI | TERPENUHI |
| KF4 | Uji berpasangan | TERPENUHI | TERPENUHI |
| KF5 | One-Way MANOVA | TERPENUHI | TERPENUHI |
| KF6 | Two-Way MANOVA dengan dan tanpa interaksi | SEBAGIAN | **TERPENUHI** |
| KF7 | Pemilihan analisis di kelompok GLM Repeated Measures | TERPENUHI | TERPENUHI |
| KF8 | Antarmuka pendefinisian faktor within-subjects | TERPENUHI (catatan validasi) | TERPENUHI (catatan validasi diselesaikan) |
| KF9 | Desain pengukuran berulang | TERPENUHI | TERPENUHI |
| KF10 | Pemeriksaan asumsi: Box's M dan Levene opsional, Mauchly otomatis | SEBAGIAN | **TERPENUHI** |
| KF11 | Uji lanjut LSD, Bonferroni, Sidak (Post Hoc MV; EM Means RM) | SEBAGIAN | **TERPENUHI** |
| KF12 | Analisis profil lewat desain RM dengan faktor antarsubjek | BELUM | **TERPENUHI** |
| KF13 | Hasil analisis sesuai data dan konfigurasi | TERPENUHI | TERPENUHI |
| KF14 | Tabel serta grafik diagnostik residual di MV | SEBAGIAN | **TERPENUHI** |

Status yang berubah dari v1: KF6, KF10, KF11, KF12, dan KF14 menjadi TERPENUHI. KF6 berubah karena perubahan kode di v2; KF10, KF11, KF12, dan KF14 berubah karena redaksi Tabel 5 direvisi dan didukung perubahan kode v2. Keterbatasan terhadap redaksi lama dicatat di bagian akhir.

Status di v3 sama dengan v2. Perbaikan v3 menyangkut perilaku dialog dan catatan tabel; rinciannya di bagian "Perubahan v3".

Status di v4 sama dengan v3. Fitur v4 memperluas KF2, KF3, dan KF4 (belum ada di redaksi Tabel 5); rinciannya di bagian "Perubahan v4".

Status di build final sama dengan v4. Uji khi-kuadrat dengan Σ diketahui memperluas KF2, KF3, dan KF4; rinciannya di bagian "Perubahan final".

## Perubahan v3 (hasil iterasi 1 black-box)

Path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/`. Crate Rust MV dan RM tidak berubah.

| KF | Skenario | Perubahan | Berkas |
|---|---|---|---|
| KF3 | BB-KF03-02 | Pilihan Unequal (Welch-Satterthwaite) tidak lagi kembali ke Pooled setelah subdialog dibuka. Reset hanya terjadi bila pengguna mengubah Fixed Factor(s) sehingga jumlahnya bukan satu. | `multivariate/dialogs/dialog.tsx` (effect sinkronisasi daftar; `handleMoveVariable`) |
| KF4 | BB-KF04-02 | Baris pasangan yang baru berisi Variable 1 menampilkan "Terdapat pasangan yang belum lengkap. …" (sebelumnya "Tambahkan minimal satu pasangan variabel."). | `multivariate/dialogs/paired.tsx` (`handleContinue`) |
| KF10 | BB-KF10-02 | Catatan tabel Levene diakhiri catatan Design, misalnya "Design: Intercept + faktorA + faktorB". Pada faktorial penuh, suku interaksi ditambahkan seperti catatan SPSS. | `multivariate/services/multivariate-analysis-formatter.ts` (`formatLeveneTest`) |
| KF7 | BB-KF07-02 | Isian slot within tetap bila Define diklik tanpa mengubah definisi faktor atau measure. | `repeated-measures/dialogs/repeated-measures-main.tsx` (`handleDefineContinue`) |
| KF8 | BB-KF08-02 | Number of Levels yang kosong atau bukan angka menampilkan "Number of levels must be a valid number."; angka di luar 2–99 (termasuk 0) tetap menampilkan pesan rentang. | `repeated-measures/dialogs/define/repeated-measures-dialog.tsx` (`isFactorLevelsValid`, input `factorLevels`) |

## Perubahan v4 (fitur dari masukan dosen pengampu APG)

- **Path:** relatif terhadap `MV/`.
- **Crate RM:** tidak berubah.
- **Crate MV:** hanya menambah method `get_simultaneous_ci` dan dua struct hasil (`testing/fitur-v4/thesis-impact-v4.md`).
- **Keputusan redaksi:** kedua fitur belum tercantum di Tabel 5. Usulan redaksi KF2–KF4 ada di bawah (menunggu konfirmasi pembimbing).
- **Skenario:** kelompok baru di `skenario-black-box.md`, belum dieksekusi.

| KF | Fitur | Perilaku | Berkas | Skenario |
|---|---|---|---|---|
| KF3 | δ₀ dua populasi (Pooled dan Unequal) | Tombol "Test Values (δ₀)" di panel Covariance Matrices membuka subdialog "Test Values (δ₀) — Hotelling T² Dua Populasi". Subdialog berisi satu isian per DV (bawaan 0) dan tombol Continue, Cancel, dan Reset to 0. H₀: μ(faktor = level 1) − μ(faktor = level 2) = δ₀, dengan urutan level mengikuti tabel Descriptive Statistics. Bila δ₀ ≠ 0, δ₀ dikurangkan dari setiap pengamatan level pertama sebelum WASM. Descriptive Statistics tetap pada data asli, catatan Multivariate Tests memuat H₀ dan δ₀, dan tabel yang dihitung dari data geser diberi catatan. δ₀ dibuang bila Fixed Factor(s) diubah. | `dialogs/two-sample-delta.tsx`, `dialogs/dialog.tsx`, `dialogs/multivariate-main.tsx`, `services/two-sample-delta.ts`, `services/multivariate-analysis.ts`, `services/multivariate-analysis-formatter.ts` | BB-KF03-04 s.d. BB-KF03-09 |
| KF4 | δ₀ berpasangan | Isian δ₀ di dialog Paired sudah ada sejak v3. v4 menambah catatan "H₀: μd = δ₀ (d = M1 − M2)." pada Multivariate Tests bila δ₀ ≠ 0. | `services/multivariate-analysis-formatter.ts` | BB-KF04-03 |
| KF2, KF3, KF4 | CI simultan T² dan Bonferroni | Checkbox Options "Simultaneous CI (T² & Bonferroni)" (bawaan tidak dicentang) menampilkan tabel "Simultaneous Confidence Intervals" untuk satu populasi, berpasangan, dan dua populasi (Pooled/Unequal). Tingkat kepercayaan = 1 − Significance Level. Bila δ₀ ≠ 0, selang ditampilkan pada skala data asli dengan kolom Contains μ₀/δ₀. | `dialogs/options.tsx`, `services/multivariate-analysis*.ts`, `rust/src/wasm/constructor.rs`, `rust/src/models/result.rs` | BB-KF02-04 s.d. BB-KF02-07, BB-KF03-10 s.d. BB-KF03-13, BB-KF04-04, BB-KF06-10 |

**Usulan redaksi Tabel 5 untuk v4 (usulan penulis, menunggu konfirmasi pembimbing; belum menggantikan redaksi di atas):**

| KF | Redaksi yang berlaku | Usulan redaksi |
|---|---|---|
| KF2 | Uji vektor rata-rata satu populasi | Sistem dapat melakukan uji vektor rata-rata satu populasi terhadap vektor hipotesis μ0, dilengkapi selang kepercayaan simultan T² dan Bonferroni. |
| KF3 | Dua populasi, kovarians sama dan tidak sama | Sistem dapat melakukan uji vektor rata-rata dua populasi dengan matriks kovarians sama dan tidak sama terhadap selisih hipotesis δ0, dilengkapi selang kepercayaan simultan T² dan Bonferroni. |
| KF4 | Uji berpasangan | Sistem dapat melakukan uji vektor rata-rata berpasangan terhadap selisih hipotesis δ0, dilengkapi selang kepercayaan simultan T² dan Bonferroni. |

Bila usulan disetujui, status KF2–KF4 tetap TERPENUHI. Fiturnya ada di v4, dengan pengujian lewat skenario BB-KF02-04 s.d. BB-KF02-07, BB-KF03-04 s.d. BB-KF03-13, dan BB-KF04-03 s.d. BB-KF04-04 (belum dieksekusi).

**Revisi v4 sebelum rilis:**
- CI Unequal memakai T² Krishnamoorthy–Yu (ν sama dengan uji Welch) dan Bonferroni Welch t per variabel.
- Sig. uji Welch dihitung dengan df pecahan.
- Rujukan J&W hanya menyebut subbab (`testing/fitur-v4/rujukan-jw.md`).

**Pesan baru v4** (disalin dari kode v4):

| Pesan | Tempat | Pemicu |
|---|---|---|
| "δ₀ hanya berlaku bila Fixed Factor memiliki tepat 2 level (<faktor> memiliki <n> level)." | Subdialog δ₀ | Fixed Factor tidak tepat 2 level |
| "Test Values (δ₀) for two populations require the Fixed Factor to have exactly two levels; '<faktor>' has <n>." | Toast galat analisis | OK dengan δ₀ ≠ 0 dan faktor tidak 2 level |
| "Significance Level must be greater than 0 and less than 1 to compute simultaneous confidence intervals." | Toast Options (dan pengaman di Rust) | CI dicentang, Significance Level ≤ 0 atau ≥ 1 |
| "Simultaneous confidence intervals for two samples need the Fixed Factor to have exactly two levels; '<faktor>' has <n>." | Errors Logs, konteks `calculate_simultaneous_ci` | CI dicentang, satu faktor dengan ≠ 2 level |
| "Simultaneous confidence intervals are available for the one-sample, paired, and two-sample Hotelling T² designs (no Fixed Factor, or one Fixed Factor with two levels, without covariates or WLS weight)." | Errors Logs, konteks `calculate_simultaneous_ci` | CI dicentang pada desain lain (dua faktor, kovariat, WLS) |
| "Simultaneous confidence intervals need more cases than dependent variables (…)." dan "… need at least two cases (…)." | Errors Logs | Pengaman bila kasus terlalu sedikit (n ≤ p, atau kurang dari dua kasus); tidak dijadikan skenario |

## Perubahan final (uji khi-kuadrat dengan Σ diketahui)

- **Path:** relatif terhadap `MV/`.
- **Crate RM:** tidak berubah.
- **Crate MV:** hanya menambah method `get_known_covariance_test` dan tiga struct (`KnownCovarianceInput`, `KnownCovarianceTest`, `KnownCovarianceInterval`). Jalur lama byte-identik dengan v5 (`testing/final/bagian1/replay-old-path.txt`).
- **Rujukan:** Johnson & Wichern, ed. 6, §4.2 dan §4.4 (hanya subbab; `testing/fitur-v4/rujukan-jw.md`).
- **Skenario:** kelompok "fitur final" di `skenario-black-box.md` (BB-KF02-08 s.d. BB-KF02-13, BB-KF03-14 s.d. BB-KF03-16, BB-KF04-05, BB-KF04-06).

| KF | Fitur | Perilaku | Berkas | Skenario |
|---|---|---|---|---|
| KF2 | Σ diketahui satu populasi | Kotak "Population covariance matrix (Σ) known" di subdialog Test Values (bawaan tidak dicentang). Bila dicentang, tampil matriks p × p berlabel nama DV: pengguna mengisi segitiga atas termasuk diagonal, segitiga bawah terisi otomatis dan tidak dapat diubah. Continue memeriksa isian (angka, diagonal positif, definit positif lewat Cholesky); bila gagal, pesan tampil dan subdialog tetap terbuka. Keluaran: tabel "Chi-Square Test (Known Covariance Matrix)" (χ² = n(x̄ − μ₀)ᵀΣ⁻¹(x̄ − μ₀), df = p, Sig.) sesudah Multivariate Tests; tabel T² tetap ada. | `dialogs/test-values.tsx`, `dialogs/known-sigma-matrix.tsx`, `services/known-sigma.ts`, `services/multivariate-analysis*.ts`, `rust/src/wasm/constructor.rs`, `rust/src/models/result.rs` | BB-KF02-08 s.d. BB-KF02-13 |
| KF3 | Σ diketahui dua populasi | Kotak yang sama di subdialog Test Values (δ₀), dengan pilihan "Σ₁ = Σ₂ = Σ (one matrix)" atau "Σ₁ and Σ₂ (one matrix per level)" (matriks berjudul level faktor). χ² = (x̄₁ − x̄₂ − δ₀)ᵀV⁻¹(x̄₁ − x̄₂ − δ₀) dengan V = (1/n₁ + 1/n₂)Σ atau Σ₁/n₁ + Σ₂/n₂. Σ ikut dibuang bila Fixed Factor(s) diubah (sama dengan δ₀). | `dialogs/two-sample-delta.tsx`, `dialogs/dialog.tsx`, berkas KF2 | BB-KF03-14 s.d. BB-KF03-16 |
| KF4 | Σd diketahui berpasangan | Kotak yang sama di bagian C subdialog Paired, matriks berlabel pasangan (d1 = … − …). χ² = n(d̄ − δ₀)ᵀΣd⁻¹(d̄ − δ₀). | `dialogs/paired.tsx`, berkas KF2 | BB-KF04-05, BB-KF04-06 |
| KF2, KF3, KF4 | CI simultan Σ diketahui | Bila Options → Simultaneous CI dicentang, tabel "Simultaneous Confidence Intervals (Known Covariance Matrix)": selang χ² estimasiᵢ ± √χ²(p; α)·√Vᵢᵢ dan Bonferroni estimasiᵢ ± z(α/(2p))·√Vᵢᵢ, pada skala data asli bila δ₀ ≠ 0. | `services/multivariate-analysis-formatter.ts` | BB-KF02-08, BB-KF03-14, BB-KF03-15, BB-KF04-05 |

**Usulan redaksi Tabel 5 final (usulan penulis, menunggu konfirmasi pembimbing; menggabungkan usulan v4 dan menggantikannya bila disetujui):**

| KF | Redaksi yang berlaku | Usulan redaksi |
|---|---|---|
| KF2 | Uji vektor rata-rata satu populasi | Sistem dapat melakukan uji vektor rata-rata satu populasi terhadap vektor hipotesis μ0 dengan matriks kovarians populasi tidak diketahui (uji T²) maupun diketahui (uji khi-kuadrat), dilengkapi selang kepercayaan simultan dan Bonferroni. |
| KF3 | Dua populasi, kovarians sama dan tidak sama | Sistem dapat melakukan uji vektor rata-rata dua populasi dengan matriks kovarians sama dan tidak sama terhadap selisih hipotesis δ0, dengan matriks kovarians populasi tidak diketahui (uji T²) maupun diketahui (uji khi-kuadrat), dilengkapi selang kepercayaan simultan dan Bonferroni. |
| KF4 | Uji berpasangan | Sistem dapat melakukan uji vektor rata-rata berpasangan terhadap selisih hipotesis δ0 dengan matriks kovarians populasi tidak diketahui (uji T²) maupun diketahui (uji khi-kuadrat), dilengkapi selang kepercayaan simultan dan Bonferroni. |

Bila usulan disetujui, status KF2–KF4 tetap TERPENUHI. Frasa "selang kepercayaan simultan T² dan Bonferroni" pada usulan v4 diganti "selang kepercayaan simultan dan Bonferroni" karena dengan Σ diketahui selang simultannya berbasis χ², bukan T².

**Pesan baru final** (disalin dari kode; `<label>` = "Known covariance matrix Σ", "Known covariance matrix Σ₁ (<faktor> = <level>)", "Known covariance matrix Σ₂ (<faktor> = <level>)", atau "Known covariance matrix Σd"):

| Pesan | Tempat | Pemicu |
|---|---|---|
| "<label>: every entry on and above the diagonal must be a number." | Subdialog (di bawah matriks), subdialog tetap terbuka | Sel di atas diagonal atau diagonal kosong atau bukan angka |
| "<label>: the diagonal entries (variances) must be greater than 0." | Subdialog | Diagonal 0 atau negatif |
| "<label> is not positive definite." | Subdialog | Faktorisasi Cholesky gagal |
| "The known covariance matrix Σ entered in Test Values is for the one-population test (no Fixed Factor, covariate or WLS weight). Clear "Population covariance matrix (Σ) known" in Test Values or change the model." | Toast galat analisis | Σ satu populasi tersimpan, lalu model diberi faktor, kovariat, atau WLS |
| "Known covariance matrix <Σ, Σ₁, Σ₂, Σd> must be <p> × <p> (one row and column per <dependent variable/pair>). Enter <…> again in <subdialog>." | Toast galat analisis | Jumlah DV berubah sesudah Σ diisi |
| "The chi-square test with a known covariance matrix for two populations requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>." | Toast galat analisis | Σ dua populasi dengan faktor yang bukan 2 level |
| "The chi-square test with a known covariance matrix is available for the one-sample, paired, and two-sample designs (…)." | Toast galat analisis (dan pengaman di Rust, Errors Logs konteks `calculate_known_covariance_test`) | Σ dua populasi dengan kovariat atau WLS |
| Pesan Rust lain (`Known covariance matrix … must be symmetric.`, `… is missing.`, `Unknown design …`) | Errors Logs | Pengaman; tidak terjangkau lewat UI |

## Perubahan teks tampilan (2026-09-26)

Teks yang terlihat pengguna di MV dan RM dirapikan sesudah iterasi 4. Perilaku dan pesan validasi tidak berubah. Bagian lain dokumen ini masih mengutip teks sebelum perubahan; teks yang berlaku adalah kolom "Sesudah".

| Tempat | Sebelum | Sesudah |
|---|---|---|
| Judul subdialog μ₀ | Test Values (μ₀) — Hotelling T² Satu Populasi | Multivariate: Test Values (μ₀) |
| Judul subdialog δ₀ | Test Values (δ₀) — Hotelling T² Dua Populasi | Multivariate: Test Values (δ₀) |
| Judul subdialog Paired | Paired (Hotelling T²) — Vektor Selisih | Multivariate: Paired |
| Tooltip Covariance Matrices | … tidak terpenuhi — misal saat Box's M test signifikan. | … tidak terpenuhi, misalnya bila uji Box's M signifikan. |
| Ringkasan δ₀ dan Σ | δ₀ = [3, 2, 10, 1] · Σ known / · Σ₁, Σ₂ known | δ₀ = [3, 2, 10, 1]; Σ known / ; Σ₁ and Σ₂ known |
| Judul Multivariate Tests berpasangan | Multivariate Tests — Hotelling T² Berpasangan | Multivariate Tests (baris efek tetap "Hotelling T² Berpasangan") |
| Baris efek Welch | jk — Welch-Satterthwaite | jk (Welch-Satterthwaite) |
| Catatan Welch | … (Welch-Satterthwaite for jk) — Computed using Welch-Satterthwaite approximation for unequal covariance matrices. | … (Welch-Satterthwaite for jk). The jk effect is computed with the Welch-Satterthwaite approximation for unequal covariance matrices. |
| Catatan R Squared (Tests of Between-Subjects Effects) | a. R Squared = … (Adjusted R Squared = …) — x1 | a. R Squared = … (Adjusted R Squared = …) for x1 |
| Judul tabel lain | Multiple Comparisons — f (m), Estimated Marginal Means — f, Between-Subjects SSCP Matrix — t, SSCP Matrix — c (MV dan RM), &lt;uji&gt; — Dependent Variable: y, Spread vs. Level — Dependent Variable: y | Multiple Comparisons: f (m), Estimated Marginal Means: f, Between-Subjects SSCP Matrix: t, SSCP Matrix: c, &lt;uji&gt;, Dependent Variable: y, Spread vs. Level, Dependent Variable: y |
| Grafik residual | Observed × Predicted × Std. Residual — y1 (entri "Observed × Predicted × Std. Residual Plots") | Residual Plots: y1 (entri "Residual Plots") |
| Label K-Matrix | 95% Confidence Interval — Lower/Upper Bound | 95% Confidence Interval, Lower/Upper Bound |
| Catatan CI simultan | … (α = 0.05 from Options → Significance Level). Krishnamoorthy–Yu, Welch–Satterthwaite | … (α = 0.05, the Significance Level in Options). Krishnamoorthy-Yu, Welch-Satterthwaite |
| Deskripsi tabel (halaman Result) | Kalimat generik, misalnya "A significant Sig. (< .05) indicates that the effect significantly influences …", "Useful for interpreting …", "— pure visual convention …", "Errors logs from the analysis." | Kalimat pendek yang menyebut isi tabel; batas Sig. merujuk ke Significance Level di Options (bukan ".05" tetap); "Messages and warnings produced during the analysis." (MV 24 deskripsi, RM 9) |
| Pesan pasangan belum lengkap (service) | Pair n is incomplete — both … | Pair n is incomplete: both … |
| Teks tur panduan RM/MV | (e.g. "time"), (e.g. 3 for pre / post / follow-up), (level × measure), analysed | such as "time", such as 3 for pre, post, and follow-up, one slot per level and measure, analyzed |

## Penyeragaman teks ke bahasa Inggris (2026-09-26)

Teks tampilan GLM Multivariate yang masih berbahasa Indonesia, termasuk pesan validasi subdialog Paired dan Test Values (δ₀), diganti dengan bahasa Inggris. Kapan pesan muncul tidak berubah. Kutipan berbahasa Indonesia di bagian lain dokumen ini adalah teks sebelum perubahan; teks yang berlaku adalah kolom "Sesudah".

| Tempat | Sebelum | Sesudah |
|---|---|---|
| Subdialog Test Values (μ₀): keterangan | Masukkan vektor rata-rata hipotesis (μ₀) untuk uji Hotelling T² satu populasi. Biarkan 0 untuk menguji terhadap vektor nol. | Enter the hypothesized mean vector (μ₀) for the one-sample Hotelling T² test. Leave 0 to test against the zero vector. |
| Subdialog Test Values (μ₀) dan (δ₀): tanpa DV | Pilih Dependent Variables terlebih dahulu di dialog utama. | Select the Dependent Variables in the main dialog first. |
| Subdialog Test Values (δ₀): keterangan | Masukkan selisih vektor rata-rata hipotesis (δ₀) untuk uji Hotelling T² dua populasi (Equal maupun Unequal). Biarkan 0 untuk menguji μ₁ = μ₂. | Enter the hypothesized difference of the mean vectors (δ₀) for the two-sample Hotelling T² test (Equal or Unequal). Leave 0 to test μ₁ = μ₂. |
| Subdialog Test Values (δ₀): urutan level | μ₁ adalah level pertama jk (1) dan μ₂ level kedua (2), sesuai urutan pada tabel Descriptive Statistics. | μ₁ is the first level of jk (1) and μ₂ the second level (2), in the order of the Descriptive Statistics table. |
| Subdialog Test Values (δ₀): faktor bukan 2 level | δ₀ hanya berlaku bila Fixed Factor memiliki tepat 2 level (treatment memiliki 3 level). | δ₀ applies only when the Fixed Factor has exactly 2 levels (treatment has 3 levels). |
| Subdialog Paired: keterangan | Pilih pasangan variabel (Measurement 1 dan Measurement 2) untuk membentuk vektor selisih d = M1 − M2. Uji Hotelling T² berpasangan dijalankan sebagai uji satu populasi pada vektor d terhadap δ₀. | Select pairs of variables (Measurement 1 and Measurement 2) to form the difference vector d = M1 − M2. The paired Hotelling T² test is run as a one-sample test of d against δ₀. |
| Subdialog Paired: judul bagian | A. Pemilihan Pasangan Variabel; B. Preview Vektor Selisih (10 baris pertama); C. Nilai Selisih Hipotesis (δ₀) | A. Variable Pairs; B. Difference Vector Preview (first 10 rows); C. Hypothesized Difference (δ₀) |
| Subdialog Paired: teks bantu | Pilih minimal satu pasangan lengkap untuk menampilkan preview. / Tidak ada data pada dataset. / Masukkan nilai selisih hipotesis (δ₀) untuk setiap pasangan. Biarkan 0 untuk menguji tidak ada perbedaan. / Tambahkan pasangan lengkap untuk mengatur δ₀. | Select at least one complete pair to show the preview. / The dataset has no data. / Enter the hypothesized difference (δ₀) for each pair. Leave 0 to test for no difference. / Add a complete pair to set δ₀. |
| Toast Paired | Tambahkan minimal satu pasangan variabel. / Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris. / Pasangan harus berisi dua variabel yang berbeda. | Add at least one variable pair. / Some pairs are incomplete. Select Variable 1 and Variable 2 in every row. / A pair must contain two different variables. |
| Kotak Σ diketahui (tiga subdialog) | Uji khi-kuadrat χ² = … dengan df = p ditampilkan di samping uji Hotelling T². / Isi segitiga atas termasuk diagonal; segitiga bawah terisi otomatis (Σ simetris). Diagonal (varians) harus positif dan Σ definit positif. | The chi-square test χ² = …, df = p, is shown next to the Hotelling T² test. / Fill in the upper triangle including the diagonal; the lower triangle is filled in automatically (Σ is symmetric). The diagonal entries (variances) must be positive and Σ must be positive definite. |
| Tooltip Covariance Matrices | Pilih Unequal (Welch-Satterthwaite) bila asumsi Σ₁ = Σ₂ tidak terpenuhi, misalnya bila uji Box's M signifikan. Hanya berlaku untuk Fixed Factor dengan tepat 2 level. | Choose Unequal (Welch-Satterthwaite) when the assumption Σ₁ = Σ₂ does not hold, for example when Box's M test is significant. Applies only to a Fixed Factor with exactly 2 levels. |
| Baris efek uji berpasangan (Multivariate Tests) | Hotelling T² Berpasangan | Hotelling T² (Paired) |
| Catatan uji berpasangan | Analisis dilakukan pada vektor selisih d1 = …; d2 = …. δ₀ = [8, 3]. | Computed on the difference vector d1 = …; d2 = …. δ₀ = [8, 3]. |

---

## KF1. Pemilihan analisis pada kelompok GLM Multivariate — TERPENUHI

**Fitur:** menu Analyze → General Linear Model → **Multivariate** (`GLM/general-linear-model-menu.tsx`). Dialog utama `MV/dialogs/dialog.tsx` berisi:
- daftar Dependent Variables, Fixed Factor(s), Covariate(s), dan WLS Weight;
- tombol Model, Contrasts, Plots (nonaktif), Post Hoc, EM Means, Save, Options, Bootstrap, Test Values, dan Paired;
- radio Covariance Matrices, yang hanya muncul bila Fixed Factor tepat satu;
- tombol Reset, Cancel, dan OK.

Prosedur dipilih lewat isian dialog (keputusan: TERPENUHI):

| Prosedur | Isian |
|---|---|
| Satu populasi | Test Values |
| Dua populasi | Satu faktor dengan 2 level, plus radio Covariance Matrices |
| Berpasangan | Paired |
| One-Way | Satu faktor |
| Two-Way | Dua faktor, plus dialog Model |

## KF2. Uji vektor rata-rata satu populasi — TERPENUHI

- **Fitur:** subdialog **Test Values** ("Test Values (μ₀) — Hotelling T² Satu Populasi", isian `mu0-0`, `mu0-1`, …).
- **Keluaran:** Multivariate Tests dengan baris efek **"Hotelling T² (vs μ₀)"**.
- **Penyesuaian otomatis (keputusan 4):** jumlah μ₀ selalu sama dengan jumlah DV.
  - Subdialog membuat satu isian per DV (`resizeTestValues`, `MV/dialogs/test-values.tsx`).
  - Saat OK, vektor dipotong atau ditambah 0 (`MV/dialogs/multivariate-main.tsx`, `normalizedTestValues`).
  - Pesan Rust "TestValues must have the same length …" tidak terjangkau lewat UI.

## KF3. Dua populasi, kovarians sama dan tidak sama — TERPENUHI

- **Fitur:** radio **Covariance Matrices**, muncul hanya bila Fixed Factor tepat satu:
  - **Equal (Pooled estimate of Σ)** (`variance-pooled`);
  - **Unequal (Welch-Satterthwaite)** (`variance-welch`).
- **Keluaran Unequal:** baris efek "<faktor> — Welch-Satterthwaite" dengan hanya Hotelling's Trace. Catatan tabel diakhiri "— Computed using Welch-Satterthwaite approximation for unequal covariance matrices.".
- **v3:** pilihan Unequal tetap tersimpan setelah subdialog (misalnya Options) dibuka dan ditutup.
- **Faktor dengan ≠ 2 level:** Errors Logs, konteks `calculate_multivariate_tests`, pesan `VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>.`.

## KF4. Uji berpasangan — TERPENUHI

- **Fitur:** subdialog **Paired** ("Paired (Hotelling T²) — Vektor Selisih").
- **Keluaran:** tabel "Multivariate Tests — Hotelling T² Berpasangan", dengan baris efek "Hotelling T² Berpasangan".
- **Pesan (toast):**
  - "Tambahkan minimal satu pasangan variabel." (belum ada baris pasangan);
  - "Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris." (ada baris yang baru berisi satu variabel; v3: diperiksa lebih dulu);
  - "Pasangan harus berisi dua variabel yang berbeda." (pengaman; tidak terjangkau lewat UI, lihat "Pesan yang tidak bisa dipicu dari UI").

## KF5. One-Way MANOVA — TERPENUHI

Satu Fixed Factor (> 2 level). Keluaran: Between-Subjects Factors, Descriptive Statistics, Multivariate Tests (Intercept dan faktor; Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root), dan Tests of Between-Subjects Effects.

## KF6. Two-Way MANOVA dengan dan tanpa interaksi — TERPENUHI (v2)

- **Dengan interaksi:** dialog Model → **Full Factorial** (bawaan). Multivariate Tests dan Tests of Between-Subjects Effects memuat baris `faktorA*faktorB`.
- **Tanpa interaksi:**
  - Dialog Model → **Build Terms**, lalu drag setiap faktor satu per satu ke kotak Model (pilihan Type tidak dipakai).
  - Atau **Build Custom Terms** tanpa suku `*`.
  - Tidak ada baris interaksi. Levene tampil satu baris per DV ("Based on Model Residuals").
- **Kode:** `normalize_model_spec` (privat, awal `run_analysis`, `MV/rust/src/wasm/function.rs`), dan penjaga `config.model.non_cust` di builder desain, BSE, uji multivariat, SSCP, parameter, dan residual plot.
- **Validasi:** SPSS mv5 (dengan interaksi) dan mv8 (tanpa interaksi, `/DESIGN=faktorA faktorB`).
- **Penolakan model kustom:** toast galat analisis (tabel "Temuan" di bawah).

## KF7. Pemilihan analisis pada kelompok GLM Repeated Measures — TERPENUHI

Menu Analyze → General Linear Model → **Repeated Measures** membuka dialog **Define**, lalu dialog utama RM (`RM/dialogs/dialog.tsx`). Dialog utama berisi:
- Within-Subjects Variables, Between-Subjects Factor(s), dan Covariates;
- tombol Model, Contrasts, Plots (nonaktif), Post Hoc (nonaktif), EM Means, Save, dan Options;
- tombol Back to Define, Reset, Cancel, dan OK.

## KF8. Pendefinisian faktor within-subjects — TERPENUHI

- **Dialog Define** (`RM/dialogs/define/repeated-measures-dialog.tsx`):
  - Within-Subject Factor Name dan Number of Levels, dengan tombol Add, Change, dan Remove;
  - Measure Name, dengan tombol Add, Change, dan Remove;
  - tombol Reset, Cancel, dan Define.
- **v2:** Define dan OK kini memvalidasi dengan toast (sebelumnya dialog tertutup tanpa pesan).
- **v3:** Define tanpa perubahan definisi mempertahankan isian slot within; slot dikosongkan hanya bila faktor atau measure berubah.

Pesan persis (toast):

| Kondisi | Pesan |
|---|---|
| Add faktor, nama kosong | `Factor name cannot be empty.` |
| Add faktor, nama berspasi/simbol | `Factor name cannot contain spaces or special characters. Use only letters, numbers, and underscores.` |
| Add faktor, level kosong atau bukan angka (v3) | `Number of levels must be a valid number.` |
| Add faktor, level di luar 2–99 | `Number of levels must be between 2 and 99.` |
| Add measure, nama kosong | `Measure name cannot be empty.` |
| Add measure, nama berspasi/simbol | `Measure name cannot contain spaces or special characters. Use only letters, numbers, and underscores.` |
| Add measure, nama sudah ada | `A measure with this name already exists.` |
| Add faktor kedua, atau Define dengan > 1 faktor | `Designs with more than one within-subjects factor are not supported in this version.` |
| Define tanpa faktor (v2) | `Add a within-subjects factor (name and number of levels) before clicking Define.` |
| Define tanpa measure (v2) | `Add a measure name before clicking Define.` |
| OK dengan slot within yang belum diisi (v2) | `Please assign a variable to every within-subjects slot.` |

`A factor with this name already exists.` tidak terjangkau lewat Add, karena faktor kedua sudah ditolak lebih dulu dengan pesan multi-faktor. `No within-subjects variables are defined. Go back to Define and add a within-subjects factor and a measure.` juga tidak terjangkau, karena Define kini menolak konfigurasi tanpa faktor atau measure.

## KF9. Desain pengukuran berulang — TERPENUHI

Keluaran:
- Within-Subjects Factors;
- Descriptive Statistics (opsional);
- Multivariate Tests;
- Mauchly's Test of Sphericity;
- Tests of Within-Subjects Effects (Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, Lower-bound);
- Tests of Within-Subjects Contrasts (bawaan Polynomial; Repeated lewat Contrasts);
- Tests of Between-Subjects Effects;
- untuk > 1 measure: Tests of Within-Subjects Effects (Multivariate).

Divalidasi SPSS (1318 nilai; gambar51, a, b, c, d).

## KF10. Pemeriksaan asumsi — TERPENUHI (redaksi revisi)

| Uji | MV | RM |
|---|---|---|
| Box's M | Opsional: Options → **Homogenity Tests** → "Box's Test of Equality of Covariance Matrices" | Opsional: Options → **Homogenity Tests** → "Box's Test of Equality of Covariance Matrices" |
| Levene | Opsional, dengan pengaturan yang sama → "Levene's Test of Equality of Error Variances". Faktorial penuh: 4 baris per DV (Based on Mean, Based on Median, Based on Median and with adjusted df, Based on trimmed mean). Model efek utama: 1 baris per DV "Based on Model Residuals" (v2, seperti SPSS). Catatan tabel memuat Design (v3). | Opsional, dengan pengaturan yang sama (4 baris per measure dan level) |
| Mauchly | — (tidak ada faktor within) | **Otomatis** (selalu dihitung): "Mauchly's Test of Sphericity" |

Bukti: MV `MV/rust/src/wasm/function.rs` (Box, Bartlett, dan Levene bila `options.homogen_test`); RM `RM/rust/src/wasm/function.rs` (homogeneity bila `homogen_test`; Mauchly tanpa syarat).

## KF11. Uji lanjut LSD, Bonferroni, Sidak — TERPENUHI (redaksi revisi)

- **MV Post Hoc** (`MV/dialogs/posthoc.tsx`):
  - Hanya LSD, Bonferroni, dan Sidak yang aktif. 15 metode lain nonaktif, dengan catatan "Only LSD, Bonferroni, and Sidak are supported in this version."
  - Tabel "Multiple Comparisons — <faktor>" berisi satu baris per metode per pasangan. Bila hanya satu metode, judulnya "Multiple Comparisons — <faktor> (<metode>)" dengan catatan "Based on observed means. <metode> adjustment."; bila lebih dari satu metode, ada kolom Test.
  - Divalidasi SPSS (mv4ph, 180 nilai).
- **RM:**
  - Tombol **Post Hoc** nonaktif, dengan keterangan "Post Hoc is not supported in this version. Use EM Means > Compare main effects for pairwise comparisons."
  - Uji lanjut lewat **EM Means** → **Compare Main Effects** dan **Confidence Interval Adjustment** (LSD(None), Bonferroni, Sidak).
  - Menghasilkan tabel "Pairwise Comparisons" dengan catatan "Based on estimated marginal means. Adjustment for multiple comparisons: <LSD (none) | Bonferroni | Sidak>. …".
  - Divalidasi SPSS (EM Means rm_c, Bonferroni).

## KF12. Analisis profil — TERPENUHI (redaksi revisi, keputusan 3)

Desain RM dengan satu faktor between, misalnya `rm_b`: `waktu` 4 level dan `kelompok` between.

| Uji profil | Baris keluaran |
|---|---|
| Kesejajaran | `waktu * kelompok` di Multivariate Tests dan di Tests of Within-Subjects Effects |
| Kesamaan level | `kelompok` di Tests of Between-Subjects Effects |
| Kerataan | `waktu` di Multivariate Tests dan di Tests of Within-Subjects Effects |

Tidak ada grafik profil (Plots nonaktif).

## KF13. Hasil analisis sesuai data dan konfigurasi — TERPENUHI

- **Jalur:** OK → service → WASM (Web Worker bawaan, atau main thread) → formatter → IndexedDB → halaman Result.
- **Kesesuaian dengan SPSS 27:** MV 2339/2339, RM 1318.
- **Toast MV:** "Running Multivariate analysis..." lalu "Multivariate analysis has been completed successfully."
- **Galat analisis MV:** toast "An error occurred during Multivariate analysis." dan baris kedua "Error: <pesan>"; tidak ada log hasil.
- **Galat analisis RM (v2):** toast `An error occurred during Repeated Measures analysis. Error: <pesan>`.
- **Toast dobel:** setiap toast tampil dua kali di seluruh aplikasi, karena ada dua `<Toaster>` (bawaan, di luar GLM).

## KF14. Tabel serta grafik diagnostik residual di MV — TERPENUHI (redaksi revisi)

- **Tabel:** halaman Result (`frontend/app/dashboard/result/components/ResultOutput.tsx`), dengan tombol Show Full/Show Less untuk tabel panjang.
- **Grafik:** MV Options → **Residual Plots** → entri grafik **"Scatter Plot Matrix"** per DV (Observed × Predicted × Std. Residual).
- **Plots:** tombol Plots MV dan RM nonaktif, dengan keterangan "Plots are not supported in this version."
- **Options RM:** Spread-Vs.-Level Plots, Residual Plots, dan Lack of Fit Test nonaktif, dengan keterangan "Spread-vs.-level plots, residual plots, and the lack-of-fit test are not supported in this version."

---

## Temuan untuk skenario negatif (diperiksa terhadap kode v2)

"Toast galat MV" = toast "An error occurred during Multivariate analysis." dengan baris kedua "Error: <pesan>", dan tidak ada log hasil. Semua toast tampil dua kali (dua `<Toaster>`).

| Kondisi | Tempat tampil | Pesan persis |
|---|---|---|
| MV: DV < 2 (tanpa Paired) | Toast peringatan; dialog tetap terbuka (OK tidak dinonaktifkan) | `Please select at least two dependent variables for multivariate analysis.` |
| MV: tanpa faktor, kovariat, maupun Test Values | Toast peringatan | `Please select at least one fixed factor or covariate.` |
| MV: jumlah μ₀ ≠ jumlah DV | Tidak terjadi: disesuaikan otomatis (KF2) | — |
| MV: Paired tanpa pasangan / pasangan belum lengkap | Toast | `Tambahkan minimal satu pasangan variabel.` / `Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris.` |
| MV: Paired, variabel yang sama pada kedua sisi | Tidak dapat dibentuk: variabel yang sudah dipakai hilang dari Available Variables | — (pesan pengaman `Pasangan harus berisi dua variabel yang berbeda.` tidak terjangkau) |
| MV: model kustom tanpa suku (Build Terms, kotak Model kosong) | Toast galat MV (konteks `config.validation.model_terms` tidak tampil karena tidak ada log) | `The custom model has no terms. Add terms in the Model dialog or choose Full Factorial.` |
| MV: suku model bukan faktor atau kovariat terpilih (faktor dihapus dari Fixed Factor setelah dimasukkan ke Model) | Toast galat MV | `Model term '<nama>' is not a selected fixed factor or covariate.` |
| MV: interaksi dengan kovariat (Build Custom Terms) | Toast galat MV | `Interaction terms with covariates are not supported in this version.` |
| MV: faktor atau kovariat tidak dimasukkan sebagai efek utama | Toast galat MV | `The custom model must include every fixed factor and covariate as a main effect ('<nama>' is missing).` |
| MV: suku bersarang (Build Custom Terms, tombol Within) | Toast galat MV | `Nested terms are not supported in this version.` |
| MV: sebagian interaksi (≥ 3 faktor, misalnya F1, F2, F3, F1 * F2) | Toast galat MV | `Only the full factorial model and the main-effects model are supported in this version.` |
| MV: Unequal dengan faktor ≠ 2 level | Errors Logs, konteks `calculate_multivariate_tests`; Multivariate Tests tidak tampil | `VarianceMode = Welch requires the Fixed Factor to have exactly two levels; '<faktor>' has <n>.` |
| MV: nilai hilang (mv7) | Errors Logs, konteks `listwise_deletion` | `2 case(s) with missing values were excluded (listwise).` |
| MV: semua kasus punya nilai hilang (`bb-mv-no-complete.csv`) | Toast galat MV | `No complete cases: every case has a missing value.` |
| MV: matriks galat singular (`bb-mv-singular.csv`, y3 = y1 + y2) | Errors Logs, konteks `calculate_multivariate_tests`; Multivariate Tests tidak tampil; tabel lain tampil | `Failed to calculate test statistics for intercept: Failed to invert error matrix: Matrix is singular and cannot be inverted` |
| RM: Define tanpa faktor / tanpa measure | Toast (v2) | `Add a within-subjects factor (name and number of levels) before clicking Define.` / `Add a measure name before clicking Define.` |
| RM: faktor within kedua | Toast | `Designs with more than one within-subjects factor are not supported in this version.` |
| RM: OK dengan slot within kosong | Toast (v2) | `Please assign a variable to every within-subjects slot.` |
| RM: nilai hilang (`bb-rm-listwise.csv`) | Errors Logs, konteks `build_rm_model` | `2 subject(s) with missing values were excluded (listwise).` |
| RM: matriks galat singular (`repeated-measures-5000-L10-M1.csv`) | Errors Logs; 16 tabel (tanpa Multivariate Tests); Mauchly W = 0 dengan χ² dan Sig. kosong | `time: The error SSCP matrix is singular (the transformed dependent variables are linearly dependent), so multivariate statistics cannot be computed` dan `score: the error covariance matrix of the transformed variables is singular, so Mauchly's W = 0 and its chi-square and significance cannot be computed` |
| Data besar (MV 2000, RM 40000) | Web Worker (bawaan): halaman tetap responsif selama perhitungan | — (`result_compare.md` §11–§12) |

Perubahan dari pemetaan v1:
- Baris "RM: Define tanpa faktor/measure lalu OK" (dulu: dialog tertutup tanpa pesan) kini menjadi toast di Define dan OK.
- Toast galat analisis RM ditambahkan.
- Model kustom yang ditolak dan Levene model efek utama adalah perilaku baru v2.
- Pesan singular MV dan "No complete cases" diperiksa pada WASM v2 dengan dataset baru (`testing/black-box/data/`).

## Pesan yang tidak bisa dipicu dari UI

Pesan berikut ada di kode v2, tetapi validasi di dialog selalu berjalan lebih dulu, sehingga kondisinya tidak pernah sampai ke kode tersebut. Karena itu pesan ini tidak dijadikan skenario black-box. Path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/`.

| Pesan | Lokasi pesan | Alasan tidak terjangkau |
|---|---|---|
| `TestValues must have the same length as Dependent Variables. Got <n> values for <m> dependent variables.` | `multivariate/rust/src/wasm/constructor.rs:171-183` | Saat subdialog dibuka, jumlah isian μ₀ disesuaikan dengan jumlah DV (`multivariate/dialogs/test-values.tsx:18-42`, `resizeTestValues`). Saat OK, vektor μ₀ dipotong atau ditambah 0 sampai sama panjang dengan DV (`multivariate/dialogs/multivariate-main.tsx:185-202`, `normalizedTestValues`). Konfigurasi yang dikirim ke WASM selalu sama panjang. |
| `Dependent variable must be selected for multivariate analysis` | `multivariate/rust/src/wasm/constructor.rs:137-141` | OK ditolak bila DV kurang dari dua, kecuali pada mode Paired (`multivariate/dialogs/dialog.tsx:247-262`). Pada mode Paired, service mengisi DepVar dengan nama variabel selisih (`multivariate/services/multivariate-analysis.ts:108`). |
| `Model specification method must be selected` | `multivariate/rust/src/wasm/constructor.rs:144-148` | Dialog Model memakai radio: tepat satu dari NonCust, Custom, dan BuildCustomTerm bernilai true (`multivariate/dialogs/model.tsx:68-74`). Bawaannya NonCust = true (`multivariate/constants/multivariate-default.ts:25-27`). |
| `Fixed factors must be specified for post-hoc tests` | `multivariate/rust/src/wasm/constructor.rs:151-157` | Daftar sumber Post Hoc (`SrcList`) selalu disalin dari Fixed Factor(s) di dialog utama (`multivariate/dialogs/multivariate-main.tsx:112-115`). Daftar itu tidak pernah terisi bila Fixed Factor kosong. |
| `Pasangan harus berisi dua variabel yang berbeda.` | `multivariate/dialogs/paired.tsx:172-181`, `207-216`, `297-304` | Variabel yang sudah dipakai sebagai Variable 1 atau Variable 2 dikeluarkan dari Available Variables (`multivariate/dialogs/paired.tsx:115-125`), sehingga pasangan dengan variabel yang sama tidak dapat dibentuk. Pertukaran Variable 1 dan 2 hanya menukar dua variabel yang sudah berbeda. Pesan ini adalah pengaman. |
| `A factor with this name already exists.` | `repeated-measures/dialogs/define/repeated-measures-dialog.tsx:72-81` | Penolakan faktor within kedua dijalankan lebih dulu: `handleAddFactor` berhenti di baris 150-153 bila sudah ada satu faktor, sebelum `isFactorNameValid` di baris 156. Pada Change (baris 171-183), satu-satunya faktor adalah faktor yang sedang diubah, dan faktor itu dikecualikan dari pemeriksaan duplikat (baris 76). |
| `No within-subjects variables are defined. Go back to Define and add a within-subjects factor and a measure.` | `repeated-measures/dialogs/dialog.tsx:183-188` | Define menolak konfigurasi tanpa faktor atau tanpa measure (`repeated-measures/dialogs/define/repeated-measures-dialog.tsx:342-349`). Karena itu dialog utama selalu dibuka dengan minimal satu slot. |
| `At least one subject variable must be selected for repeated measures analysis` | `repeated-measures/rust/src/wasm/constructor.rs:111-116` | Slot selalu ada (baris sebelumnya), dan OK ditolak bila ada slot yang belum diisi (`repeated-measures/dialogs/dialog.tsx:190-193`). |
| `Designs with more than one within-subjects factor are not supported in this version` (Rust, tanpa titik) | `repeated-measures/rust/src/stats/rm_model.rs:270-273` | Faktor within kedua sudah ditolak di Define, dengan pesan versi UI yang diakhiri titik (`repeated-measures/dialogs/define/repeated-measures-dialog.tsx:150-153` dan `338-341`). |
| `Estimated marginal means are not supported for designs with more than one within-subjects factor yet` | `repeated-measures/rust/src/wasm/function.rs:400-404` | Sama dengan baris sebelumnya: desain dengan lebih dari satu faktor within tidak dapat dibuat dari UI. |

## Keterbatasan terhadap redaksi Tabel 5 lama (dicatat, bukan skenario)

- Uji normalitas multivariat tidak ada di kedua modul.
- Mauchly tidak dapat dinonaktifkan (redaksi revisi: dihitung otomatis).
- Post hoc selain LSD, Bonferroni, dan Sidak tidak tersedia. RM tidak punya Post Hoc between-subjects (diganti EM Means).
- Tidak ada uji profil bernama sendiri maupun grafik profil. Analisis profil dilakukan lewat tabel RM (KF12).
- Grafik hanya Scatter Plot Matrix residual di MV. RM tidak punya grafik. Spread vs. level MV tampil sebagai tabel.
- Model kustom hanya faktorial penuh atau efek utama. Bentuk lain ditolak (KF6).
