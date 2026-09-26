# Fitur final per kebutuhan fungsional dan keterbatasan (bahan BAB V–VI)

- **Build:** branch `ilham`, tag `skripsi-final-v5` (build final `OrpyJfBOluV37xa0aqmFr`; WASM di `ringkasan-black-box.md`, bagian fakta metode).
- **Redaksi KF:** Tabel 5 revisi (`testing/black-box/pemetaan-kebutuhan.md`). Untuk KF2–KF4 dipakai **usulan redaksi final** (menunggu konfirmasi pembimbing), yang memuat uji T² dan uji khi-kuadrat.
- **Dokumen ini:** hanya memuat fakta dari kode dan hasil uji. Rincian pesan dan path ada di `pemetaan-kebutuhan.md`.

## Fitur per KF

| KF | Kebutuhan fungsional | Fitur di build final |
|---|---|---|
| KF1 | Pemilihan analisis pada kelompok GLM Multivariate | Menu Analyze → General Linear Model → Multivariate. Dialog berisi Dependent Variables, Fixed Factor(s), Covariate(s), WLS Weight; tombol Model, Contrasts, Post Hoc, EM Means, Save, Options, Bootstrap, Test Values, Paired (Plots nonaktif); panel Covariance Matrices (Equal/Unequal dan tombol Test Values (δ₀)) bila Fixed Factor tepat satu. Prosedur KF2–KF6 dipilih dari isian dialog yang sama. |
| KF2 | Uji vektor rata-rata satu populasi terhadap μ0, dengan Σ tidak diketahui (T²) maupun diketahui (khi-kuadrat), dilengkapi selang simultan dan Bonferroni (usulan) | Subdialog Test Values (μ₀), satu isian per DV. Multivariate Tests berbaris "Hotelling T² (vs μ₀)". Kotak "Population covariance matrix (Σ) known" menampilkan matriks Σ; keluaran tambahan "Chi-Square Test (Known Covariance Matrix)". Options → Simultaneous CI: selang T² dan Bonferroni t; dengan Σ diketahui juga selang χ² dan Bonferroni z. |
| KF3 | Uji dua populasi dengan kovarians sama dan tidak sama terhadap δ0, Σ tidak diketahui maupun diketahui, dilengkapi selang simultan dan Bonferroni (usulan) | Equal (Pooled) atau Unequal (Welch-Satterthwaite, ν Krishnamoorthy–Yu, Sig. dengan df pecahan). Subdialog Test Values (δ₀) dengan H₀: μ(level 1) − μ(level 2) = δ₀. Σ diketahui: satu Σ (Σ₁ = Σ₂) atau Σ₁ dan Σ₂ per level. Selang simultan Pooled, Unequal (T² Krishnamoorthy–Yu dan Welch t), dan Σ diketahui. |
| KF4 | Uji berpasangan terhadap δ0, Σ tidak diketahui maupun diketahui, dilengkapi selang simultan dan Bonferroni (usulan) | Subdialog Paired: pasangan variabel, pratinjau vektor selisih, isian δ₀ per pasangan, dan kotak Σd diketahui. Tabel "Multivariate Tests — Hotelling T² Berpasangan", uji khi-kuadrat, dan selang simultan pada vektor selisih. |
| KF5 | One-Way MANOVA | Satu Fixed Factor dengan > 2 level: Pillai's Trace, Wilks' Lambda (Rao F; df2 pecahan bila p ≥ 3 dan df_h ≥ 3), Hotelling's Trace, Roy's Largest Root, dan Tests of Between-Subjects Effects. |
| KF6 | Two-Way MANOVA dengan dan tanpa interaksi | Model: Full Factorial (dengan interaksi), Build Terms / Build Custom Terms efek utama (tanpa interaksi). Sum of Squares Type I, II, III, IV (Type I/II Intercept = R(μ)). Type IV ditolak bila ada sel kosong. |
| KF7 | Pemilihan analisis pada kelompok GLM Repeated Measures | Menu Analyze → General Linear Model → Repeated Measures → dialog Define → dialog utama (Within-Subjects Variables, Between-Subjects Factor(s), Covariates; Model, Contrasts, EM Means, Save, Options; Plots dan Post Hoc nonaktif). |
| KF8 | Antarmuka pendefinisian faktor within-subjects | Dialog Define: nama faktor dan jumlah level (2–99, divalidasi), measure (satu atau lebih), Add/Change/Remove, Reset, Cancel, Define. Slot within tetap bila Define tanpa perubahan. |
| KF9 | Desain pengukuran berulang | Within-Subjects Factors, Descriptive Statistics, Multivariate Tests, Mauchly's Test of Sphericity, Tests of Within-Subjects Effects (Sphericity Assumed, Greenhouse-Geisser, Huynh-Feldt, Lower-bound), Tests of Within-Subjects Contrasts (Polynomial bawaan, Repeated), Tests of Between-Subjects Effects; Tests of Within-Subjects Effects (Multivariate) untuk > 1 measure. Sum of Squares Type III. |
| KF10 | Pemeriksaan asumsi: Box's M dan Levene opsional, Mauchly otomatis | MV dan RM: Options → Homogeneity tests (Box's M, Levene); RM: Mauchly selalu dihitung. |
| KF11 | Uji lanjut LSD, Bonferroni, Sidak | MV: Post Hoc (tiga metode aktif). RM: EM Means → Compare main effects dengan penyesuaian LSD (None), Bonferroni, Sidak. |
| KF12 | Analisis profil lewat desain RM dengan faktor antarsubjek | Tabel RM dengan faktor between: kesejajaran (interaksi within × between), kesamaan level (efek between), kerataan (efek within). |
| KF13 | Hasil analisis sesuai data dan konfigurasi | Service → WASM (Web Worker bawaan, main thread tersedia) → formatter → IndexedDB → halaman Result. Angka 4 desimal; kolom effect size/power mengikuti Options; catatan kaki gaya SPSS. |
| KF14 | Tabel serta grafik diagnostik residual pada GLM Multivariate | Tabel di halaman Result (Show Full/Show Less); Options → Residual Plots → Scatter Plot Matrix per DV. |

## Keterbatasan (bahan BAB VI)

1. **Satu faktor within-subjects.** Desain RM dengan lebih dari satu faktor within diblokir di dialog Define dan di mesin ("Designs with more than one within-subjects factor are not supported in this version."), karena hasil modul lama tidak cocok dengan SPSS.
2. **Kontras RM:** hanya Polynomial (bawaan) dan Repeated. Kontras lain dan kontras kustom tidak ditawarkan.
3. **Sum of Squares RM:** hanya Type III.
4. **Type IV MV dengan sel kosong:** ditolak. Tanpa sel kosong, Type IV dihitung sama dengan Type III (sama dengan SPSS pada kondisi itu).
5. **Uji normalitas multivariat:** tidak tersedia di kedua modul.
6. **Grafik profil dan tombol Plots:** nonaktif di MV dan RM. Analisis profil dilakukan lewat tabel (KF12). RM tidak punya grafik diagnostik; Spread-vs-level, residual plots, dan lack-of-fit RM nonaktif.
7. **Post hoc:** hanya LSD, Bonferroni, dan Sidak. RM tidak punya Post Hoc between-subjects (diganti EM Means).
8. **Model kustom MV:** hanya faktorial penuh atau efek utama; bentuk lain ditolak.
9. **Uji Welch (Unequal), δ₀ dua populasi, selang simultan, dan uji khi-kuadrat Σ diketahui:** hanya untuk satu populasi, berpasangan, atau satu faktor dengan tepat dua level, tanpa kovariat atau WLS.
10. **Pembanding:** uji khi-kuadrat Σ diketahui dan uji Welch tidak punya padanan di SPSS GLM, sehingga divalidasi dengan R. Konfigurasi lain (termasuk Type I/II, Wilks df pecahan, dan δ₀) dibandingkan dengan SPSS 27.
11. **Tampilan:** Sig. ditulis dengan nol di depan ("0.3480", SPSS ".348"). Catatan kaki berupa baris berhuruf tanpa huruf superskrip di sel. Teks "Computed using alpha = …" untuk α selain .05 belum dicocokkan dengan SPSS.
12. **Tabel Univariate/Multivariate Tests di bawah EM Means (RM):** belum dibuat.
13. **Lingkungan uji responsivitas:** satu mesin, Chromium, dan CPU 1× (lihat `ringkasan-responsivitas.md`).
14. **Observed Power RM pada F = 0 dan noncentrality Wilks RM bila jumlah measure transformasi dan df hipotesis sama-sama ≥ 3:** crate RM tidak diubah pada finalisasi; kedua kasus tidak ada di data validasi RM, sehingga kesesuaiannya dengan SPSS belum diperiksa.
