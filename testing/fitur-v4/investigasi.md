# Investigasi fitur v4: δ₀ dua populasi/berpasangan dan CI simultan

- **Basis kode:** tag `skripsi-final-v3` (`426429d8`), branch `ilham`.
- **Path:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/multivariate/`, kecuali disebut lain.
- **Sumber:** semua pernyataan diambil dari kode; baris yang dikutip adalah baris di v3.

## 0a. Test Values (μ₀) satu populasi

**Diimplementasikan di Rust**, bukan dengan menggeser data di TypeScript. TypeScript hanya mengirim vektor μ₀ sebagai `main.TestValues`, dan Rust memakainya di empat tempat:

| Bagian | Lokasi | Cara |
|---|---|---|
| Validasi | `rust/src/wasm/constructor.rs:171-190` | Panjang μ₀ = jumlah DV; tidak boleh NaN |
| Multivariate Tests, faktorial penuh | `rust/src/stats/multivariate_tests.rs:420-436` | Cabang `Intercept`: vektor tersentral x̄ − μ₀; H Intercept = n·(x̄ − μ₀)(x̄ − μ₀)ᵀ (tanpa faktor) |
| Multivariate Tests, model efek utama | `rust/src/stats/multivariate_tests.rs:1025-1030` | H Intercept dihitung pada y − μ₀ |
| Tests of Between-Subjects Effects | `rust/src/stats/between_subjects_effects.rs:42-50` | SS Intercept per DV memakai μ₀ₖ |
| Parameter Estimates | `rust/src/stats/parameter_estimates.rs:90-108` | B Intercept dikurangi μ₀ₖ; SE tidak berubah |

Sisi TypeScript:
- `dialogs/test-values.tsx:16-27` menyesuaikan jumlah isian dengan jumlah DV.
- `dialogs/multivariate-main.tsx:185-202` menyesuaikan vektor saat OK.

Descriptive Statistics tidak tersentuh, sehingga selalu menampilkan data asli.

## 0b. Uji dua populasi dan uji berpasangan

**Pooled (Equal).**
- **Cara kerja:** tidak ada kode khusus. Uji ini adalah GLM Multivariate biasa dengan satu Fixed Factor dua level. Baris faktor di Multivariate Tests memakai H dan E faktorial penuh (`rust/src/stats/multivariate_tests.rs`, `calculate_hypothesis_error_matrices`).
- **Hubungan dengan T²:** untuk dua kelompok, Hotelling's Trace = T²/(n₁ + n₂ − 2). T² ditampilkan di kolom T² oleh formatter (`services/multivariate-analysis-formatter.ts:618-635`).

**Unequal (Welch).**
- **Lokasi:** `rust/src/stats/multivariate_tests.rs:211-234` (cabang) dan `:270-376` (`calculate_welch_two_sample_t2`).
- **Aproksimasi:** **Krishnamoorthy–Yu (2004)**, sesuai komentar di baris 270-280 dan kode baris 314-343:
  - V = S₁/n₁ + S₂/n₂, d = x̄₁ − x̄₂, T² = dᵀV⁻¹d.
  - 1/ν = Σᵢ [1/(nᵢ − 1)]·{tr((VᵢV⁻¹)²) + (tr(VᵢV⁻¹))²}/(p² + p), dengan Vᵢ = Sᵢ/nᵢ.
  - F = (ν − p + 1)/(pν)·T² ~ F(p, ν − p + 1); **df₁ = p, df₂ = ν − p + 1** (tidak bulat).
- **Catatan temuan (tidak diubah di v4):** Sig. dihitung dengan df yang **dibulatkan** ke bilangan bulat (`calculate_f_significance(df1.round(), df2.round(), F)`, baris 344-348; `rust/src/stats/common.rs:40-48` menerima `usize`). Kolom "Error df" menampilkan ν − p + 1 yang tidak bulat.
- **Keluaran:** hanya Hotelling's Trace.
- **Urutan kelompok:** `compute_per_group_covariances` (`rust/src/stats/common.rs:1058`) memakai `get_factor_levels` (`common.rs:337-361`), yang mengurutkan level menurut **kemunculan pertama** di data. T² tidak bergantung pada urutan ini karena berbentuk kuadratik.

**Berpasangan.**
- **Cara kerja:** seluruhnya di TypeScript.
  - `services/paired-difference.ts:94` (`buildDifferenceData`) membentuk kolom selisih dₖ = M1ₖ − M2ₖ.
  - `services/multivariate-analysis.ts:83-116` mengirimnya sebagai `DepVar` sintetis dengan `FixFactor = []` dan **`TestValues = δ₀`** (baris 112).
  - Uji berjalan lewat jalur Test Values satu populasi (0a).
- **δ₀ berpasangan sudah ada sejak v3:** bagian C dialog Paired (`dialogs/paired.tsx`) menyediakan satu isian per pasangan, bawaan 0, tombol "Reset δ₀ to 0", dan penyesuaian jumlah isian (`resizeDelta0`, baris 48-57).
- **Catatan tabel:** Multivariate Tests menampilkan "δ₀ = [...]" (`services/multivariate-analysis-formatter.ts:653-660`).

**Urutan level yang dilihat pengguna.**
- Descriptive Statistics mengurutkan level secara numerik bila dapat diurai sebagai angka, dan leksikografis bila tidak (`rust/src/stats/descriptive_statistics.rs:137-141`, `sort_levels`).
- **Di v4, "level pertama" (μ₁) didefinisikan dengan urutan ini**, sama dengan urutan baris Descriptive Statistics dan Between-Subjects Factors.

## 0c. Tabel keluaran yang sudah memuat CI

| Tabel | Jenis CI | Tingkat | Lokasi |
|---|---|---|---|
| Parameter Estimates | CI t per parameter, B ± t(df_error; α/2)·SE | **Dipaku 95%** (α = 0,05; tidak membaca Significance Level) | `rust/src/stats/parameter_estimates.rs:113-116` |
| Estimated Marginal Means | CI t per rata-rata marginal | **Dipaku 95%** | `rust/src/stats/emmeans.rs:166-169` |
| Multiple Comparisons (Post Hoc) | LSD: t(α/2); Bonferroni: t(α/(2c)); Sidak: t((1 − (1 − α)^{1/c})/2), c = jumlah perbandingan | 1 − Significance Level (Options) | `rust/src/stats/posthoc.rs:171-207` |
| Contrast Results (K Matrix) | CI t per kontras | **Dipaku 95%**; dihitung di formatter TS dengan aproksimasi distribusi t sendiri | `services/multivariate-analysis-formatter.ts:1243`, `:1279-1293` |
| Bootstrap | Persentil atau BCa | Level dari dialog Bootstrap (bawaan 95%) | `rust/src/stats/bootstrap.rs:35-36`, `:202-250` |

**Kesimpulan 0c:**
- Belum ada CI simultan untuk komponen vektor rata-rata (T² maupun Bonferroni).
- Options tidak punya isian "confidence level"; yang ada hanya **Significance Level** (`dialogs/options.tsx:319-334`, bawaan 0,05, tanpa validasi rentang).
- Karena itu, tingkat kepercayaan CI simultan di v4 = 1 − Significance Level, konvensi yang sama dengan SPSS ("Confidence intervals are 95.0%").

## Keputusan desain v4

1. **δ₀ dua populasi: transformasi data di TypeScript** sebelum WASM, dengan pola yang sama seperti Paired.
   - **Cara:** setiap pengamatan level pertama dikurangi δ₀ₖ.
   - **Mengapa tidak lewat jalur μ₀ Rust:** jalur itu hanya menggeser H Intercept, bukan H faktor, sehingga butuh perubahan API Rust. Transformasi data setara secara matematis dengan GLM pada data geser.
   - **Kovarians kelompok tidak berubah.**
   - **Descriptive Statistics dikembalikan ke data asli** di TS: rata-rata level pertama + δ₀; rata-rata dan SD Total dihitung ulang dari statistik kelompok. SD per kelompok tidak berubah oleh pergeseran.
   - **Tabel yang dipengaruhi pergeseran** (Multivariate Tests, Tests of Between-Subjects Effects, Parameter Estimates, EM Means, Multiple Comparisons, Contrast, SSCP, Spread vs. Level, grafik residual) diberi catatan tentang data geser.
   - **Tabel yang invarian terhadap pergeseran per kelompok:** Box's M, Levene, Bartlett, Residual SSCP. Ini dicek di validasi.
2. **δ₀ berpasangan:** jalur v3 tetap dipakai. Teks hipotesis H₀: μ_d = δ₀ ditambahkan ke catatan tabel **hanya bila δ₀ ≠ 0**, agar mv3 tetap byte-identik.
3. **CI simultan dihitung di Rust** (statrs untuk kuantil F, t, χ², dan z, dipoles dengan langkah Newton agar tepat sampai presisi ganda). Alasan:
   - Seluruh komputasi statistik aplikasi ada di Rust.
   - Formatter TS hanya punya aproksimasi t, dan `jstat` memakai toleransi iterasi sekitar 1e-8, sehingga tidak cukup untuk syarat selisih < 1e-8 terhadap R.
   - **Rancangan akhir:** method WASM baru `MultivariateAnalysis::get_simultaneous_ci()`. Worker atau jalur main-thread memanggilnya sesudah `get_formatted_results()`, hanya bila Options → Simultaneous CI dicentang.
   - **Rancangan pertama ditinggalkan:** field baru di `MultivariateResult` membuat respons worker jalur lama tidak lagi byte-identik dengan v3, karena urutan kunci HashMap wasm32 bergantung pada alamat stack. Rinciannya ada di `thesis-impact-v4.md` §1.
   - Perubahan API dicatat di `thesis-impact-v4.md`.

## Rumus CI simultan (Johnson & Wichern, *Applied Multivariate Statistical Analysis*, edisi 6)

Salinan buku tidak ada di repo. Nomor Result dan bagian di bawah mengikuti instruksi pengujian dan ingatan saya tentang edisi 6. **Nomor persamaan untuk selang Bonferroni perlu dicek ulang di buku sebelum dikutip di naskah.**

| Uji | Selang T² simultan | Selang Bonferroni | Rujukan |
|---|---|---|---|
| Satu populasi | x̄ᵢ ± √(p(n−1)/(n−p)·F(p, n−p; α))·√(sᵢᵢ/n) | x̄ᵢ ± t(n−1; α/(2p))·√(sᵢᵢ/n) | Bab 5.4, Result 5.3 (T²); selang Bonferroni di bab 5.4 |
| Berpasangan | Sama dengan satu populasi, diterapkan pada d (n pasangan) | Sama, pada d | Bab 6.2 |
| Dua populasi, Σ₁ = Σ₂ | (x̄₁ᵢ − x̄₂ᵢ) ± c·√((1/n₁ + 1/n₂)·s_pooled,ᵢᵢ), c² = (n₁+n₂−2)p/(n₁+n₂−p−1)·F(p, n₁+n₂−p−1; α) | (x̄₁ᵢ − x̄₂ᵢ) ± t(n₁+n₂−2; α/(2p))·√((1/n₁ + 1/n₂)·s_pooled,ᵢᵢ) | Bab 6.3, Result 6.2 |
| Dua populasi, Σ₁ ≠ Σ₂ | (x̄₁ᵢ − x̄₂ᵢ) ± √(χ²(p; α))·√(s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂) | (x̄₁ᵢ − x̄₂ᵢ) ± z(α/(2p))·√(s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂) | Bab 6.3, **Result 6.4** (sampel besar) |

**Alasan memakai Result 6.4 untuk Σ₁ ≠ Σ₂.**
- Uji Welch aplikasi memakai aproksimasi Krishnamoorthy–Yu.
- Saya tidak dapat memastikan J&W edisi 6 memberi selang simultan baku yang diturunkan dari aproksimasi itu. Sesuai instruksi, dipakai Result 6.4 (khi-kuadrat, sampel besar).
- Keterbatasannya ditulis di catatan tabel: selang ini aproksimasi sampel besar dan bukan turunan KY, sehingga dapat tidak selaras dengan Sig. uji Welch pada sampel kecil.
- Selang Bonferroni sampel besar memakai kuantil normal z(α/(2p)), padanan sampel besar dari t.

**Pembanding untuk Σ₁ ≠ Σ₂ (perlu keputusan).**
- **Temuan:** paket CRAN MVTests 2.3.1, `TwoSamplesHT2(..., Homogenity = FALSE)`, membangun selang simultan dari aproksimasi F ujinya sendiri: (x̄₁ᵢ − x̄₂ᵢ) ± √(νp/(ν−p+1)·F(p, ν−p+1; α))·√(s₁ᵢᵢ/n₁ + s₂ᵢᵢ/n₂), dengan ν versi **Nel–van der Merwe** (bukan Krishnamoorthy–Yu seperti uji Welch aplikasi).
- **Artinya:** selang yang "konsisten dengan aproksimasi uji" memang dipakai di paket mapan.
- **Opsi bila buku J&W edisi 6 ternyata memuat selang serupa untuk aproksimasi Krishnamoorthy–Yu:** selang Σ₁ ≠ Σ₂ dapat diganti menjadi c² = νp/(ν−p+1)·F(p, ν−p+1; α), dengan ν yang sama dengan uji. Perubahan ini kecil dan hanya di `calculate_simultaneous_ci`.
- **Sampai ada keputusan:** Statify memakai Result 6.4 sesuai instruksi, dan keterbatasannya ditulis di catatan tabel.
