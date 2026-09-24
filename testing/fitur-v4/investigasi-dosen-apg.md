# Investigasi masukan dosen APG (demo versi ter-deploy)

## Lingkup dan cara kerja

- **Versi yang diperiksa:**
  - `skripsi-final-v4` = `d2545117`, branch `ilham`;
  - main ter-deploy = `487bbcfe`.
  - `origin/main` sekarang `1466a8c8`, tetapi isi folder `general-linear-model` identik dengan `487bbcfe` (`git diff 487bbcfe 1466a8c8 -- …/general-linear-model` kosong).
  - Kode main dibaca dengan `git show 487bbcfe:<path>`, tanpa checkout.
- **Build yang dijalankan:** build produksi v4 yang sama dengan `step19-v4` (`BUILD_ID 1IBznO-olYCW5GfFOKskp`). Server dijalankan di port 3101, dan analisis dilakukan lewat antarmuka asli dalam mode worker (bawaan).
  - Port 3001 sudah dipakai proses `next start -p 3001` dari repo ini, yang dimulai 24/09 pukul 23:50 dan bukan oleh saya. Proses itu tidak dihentikan, dan build yang dilayaninya tidak diketahui.
- **Worktree `../statify-v3-investigasi`:** tidak ada, jadi tidak ada bahan dari `investigasi-effect-size.md` atau `investigasi-kovarians.md`.
- **Tidak ada kode aplikasi yang diubah.**
- **Path:**
  - `MV/` = `frontend/components/Modals/Analyze/general-linear-model/multivariate/`
  - `RM/` = `…/repeated-measures/`
  - Nomor baris mengacu ke v4 kecuali ditandai "main".
- **Skrip R (R 4.3.2, car 3.1.3):** `testing/fitur-v4/r/dosen_apg_bagian1.R`, `dosen_apg_bagian2.R`, `dosen_apg_bagian3.R`, dengan keluaran `*_r.csv`.
- **Harness UI:** `testing/fitur-v4/harness/dosen-apg-hr.cjs` dan `dosen-apg-sstype.cjs`.
- **Bukti:** `testing/fitur-v4/bukti/dosen-apg/` (tangkapan layar, `hr.json`, `sstype.json`, `sstype-vs-r.txt`).
- **Data IBM HR:** tidak ada di repo. Yang dipakai adalah `<folder skripsi>/dataset/WA_Fn-UseC_-HR-Employee-Attrition.csv` (1470 baris, md5 `ad8207459e5732574372cf8ff619883f`), sesuai konfirmasi penulis. Berkas ini tidak disalin ke repo.

**Tanda status yang dipakai:**
- **[BENAR di v4]:** sesuai SPSS/R di v4.
- **[KELIRU di main saja]:** salah di versi ter-deploy dan sudah diperbaiki di v4.
- **[MASIH KELIRU di v4]:** belum diperbaiki.

---

## Bagian 1. Effect size dan observed power

### 1.1 Asal 0.9091 dan 0.9999 di main — [KELIRU di main saja]

**Rumus di main.** Observed Power pada Multivariate Tests bukan dihitung dari distribusi F nonsentral, melainkan dari rumus heuristik:
- `MV/rust/src/stats/multivariate_tests.rs` (main) baris 993–996:
  `power = if F > 1 { min(1 − 0.1/F, 1) } else { 0.5 }` untuk keempat statistik.
- Baris 998: `let _ = alpha;`, yaitu α tidak dipakai.
- Uji Welch (baris 330–334) memakai rumus yang sama.

**Cocok dengan angka yang dilihat dosen:**
- Gender F = 1.100 → 1 − 0.1/1.1 = **0.9091**.
- Intercept F = 1116.315 → 1 − 0.1/1116.3 = **0.99991**, tampil 0.9999.
- Dihitung ulang di `dosen_apg_bagian1.R` (kolom `main_power`: 0.909092 dan 0.999910).

**Tests of Between-Subjects Effects di main** memakai rumus heuristik lain:
- `common.rs` (main) baris 96–104: `1 − exp(−λ/2)`, dengan λ = F·df₁.
- Dipanggil dari `between_subjects_effects.rs` (main) baris 113, 181, 278, dan 364. Baris 113 memakai α = 0.05 yang dipaku.

**Commit perbaikan** (ada di `skripsi-final-v1` sampai `v4`, tidak ada di main):
- `d0862fa7` "fix(glm-mv): Observed Power dari distribusi F nonsentral seperti SPSS" (2026-09-23): Multivariate Tests dan Tests of Between-Subjects Effects.
- `1c7335d8` "fix(glm-mv): Observed Power Welch dari distribusi F nonsentral": uji Welch.

**Implementasi v4:**
- `common.rs:99-109` `calculate_observed_power`: 1 − P(F′ ≤ F_crit) dengan F′ ~ F nonsentral(df₁, df₂, λ = F·df₁) dan F_crit = F(df₁, df₂; α).
- `common.rs:114` `noncentral_f_cdf`: jumlah Poisson dari beta tak lengkap, gaya AS 226.
- α diambil dari Options → Significance Level (`multivariate_tests.rs:796-802`).

### 1.2 Data IBM HR di build v4 lewat antarmuka asli — [BENAR di v4]

**Konfigurasi:** DV YearsAtCompany, TotalWorkingYears, MonthlyIncome; Fixed Factor Gender; Full factorial, Type III.

Keempat statistik memberi nilai yang sama karena s = 1 (statistik eksak).

| Efek | Kolom | Statify v4 tampil | Statify v4 mentah (worker) | R (`dosen_apg_bagian1.R`) | Harapan SPSS |
|---|---|---|---|---|---|
| Gender | F | 1.1 | 1.1000125366 | 1.100013 | 1.100 |
| Gender | Sig. | 0.348 | 0.3479973485 | 0.347997 | .348 |
| Gender | Partial Eta Squared | 0.0022 | 0.0022459930 | 0.002246 | .002 |
| Gender | Noncent. Parameter | 3.3 | 3.3000376098 | 3.300038 | 3.300 |
| Gender | Observed Power | 0.2991 | 0.2990897312 | 0.299090 | .299 |
| Intercept | F | 1116.3154 | 1116.3153728922 | 1116.315373 | 1116.315 |
| Intercept | Partial Eta Squared | 0.6955 | 0.6955313800 | 0.695531 | .696 |
| Intercept | Noncent. Parameter | 3348.9461 | 3348.9461186765 | 3348.946119 | 3348.946 |
| Intercept | Observed Power | 1 | 1 | 1.000000 | 1.000 |

**Hasil:**
- Semua nilai v4 sama dengan R. R menghitung Type III dengan kontras sum-to-zero; power = 1 − `pf(qf(.95, 3, 1466), 3, 1466, ncp = λ)`.
- Nilai v4 juga sama dengan harapan SPSS sampai digit yang ditampilkan SPSS.
- Hanya format tampilannya yang berbeda (lihat 1.4).

**Bukti:** `bukti/dosen-apg/hr-b-multivariate-tests.png` (opsi dicentang), `hr-a-multivariate-tests.png` (opsi tidak dicentang), dan `hr.json`.

### 1.3 Kolom effect size/power hanya bila opsi dicentang? — [MASIH KELIRU di v4, sama dengan main]

**Tidak.** Ketiga kolom (Partial Eta Squared, Noncent. Parameter, Observed Power) selalu tampil.
- Jalan A (kedua opsi tidak dicentang; payload worker `EstEffectSize: false`, `ObsPower: false`) memberi tabel yang identik dengan jalan B (keduanya dicentang).
- Bukti: `hr-a-*.png` vs `hr-b-*.png`, dan `hr.json` → `optionsSent`.

**Field config:**
- `MV/rust/src/models/config.rs:290-293` (sama di main): `est_effect_size` (`EstEffectSize`) dan `obs_power` (`ObsPower`).
- Di kedua versi, field ini **tidak pernah dibaca** oleh Rust maupun formatter.

**Dialog:**
- `MV/dialogs/options.tsx` baris 104–140 (main: 92–128).
- Tipe: `MV/types/multivariate.ts:210-211` (main: 203–204).

**Formatter selalu menambahkan kolom:**
- Multivariate Tests: `MV/services/multivariate-analysis-formatter.ts:831-833` (header) dan `:967-969` (nilai); main `:572-574` dan `:703-705`.
- Tests of Between-Subjects Effects: `:1086-1088`; main `:842-844`.

**SPSS** hanya menampilkan kolom itu bila `/PRINT = ETASQ OPOWER`.

### 1.4 Pemangkasan nol di belakang koma — [MASIH KELIRU di v4, sama dengan main]

**Sumber:** `frontend/hooks/useFormatter.ts:96` (`formatDisplayNumber`), identik di main.
- Kode: `num.toFixed(4).replace(/\.?0+$/, "")`.
- Akibatnya 1.1000 → "1.1", 3.3000 → "3.3", 268.1180 → "268.118", dan 1.0000 → "1".
- `formatSig` (baris 3–16) memanggil fungsi yang sama untuk Sig. ≥ .001, sehingga tampil "0.348", bukan ".348".
- `formatCorrelationValue` (baris 54) memakai pola yang sama.

**Tabel yang terdampak:** semua tabel MV, karena formatter MV memanggil `formatDisplayNumber` di 61 tempat. Contohnya:
- Descriptive Statistics, Box's M, Bartlett, Levene;
- Multivariate Tests, Tests of Between-Subjects Effects, Parameter Estimates;
- SSCP, kontras (K Matrix, Multivariate/Univariate Test Results), General Estimable Function;
- Simultaneous Confidence Intervals. Contohnya "268.118" pada batas atas Bonferroni d1 sleeping dog; nilai mentahnya 268.1180.

Kolom df juga terdampak, misalnya "3" (bukan "3.000" seperti SPSS), dan Observed Power "1".

**Tabel RM** yang utama memakai `fmt3` (`RM/services/repeated-measures-analysis-formatter.ts:34-36`, `toFixed(3)`), sehingga tampil "3.000" dan "16.000". Beberapa tabel RM (Descriptive Statistics, Box's M) memakai `formatDisplayNumber` dan ikut terpangkas.

### 1.5 Catatan kaki Multivariate Tests — [MASIH KELIRU di v4]

| Unsur catatan SPSS | v4 | main (dari kode) |
|---|---|---|
| "a. Design: Intercept + Gender" | Tidak ada | Tidak ada |
| "b. Exact statistic" / keterangan aproksimasi | Tidak ada. Field `is_exact_statistic` dihitung Rust (`multivariate_tests.rs:813,825,…`) tetapi tidak dipakai formatter | Tidak ada |
| "Computed using alpha = .05" (bila power dicentang) | Tidak ada | Tidak ada |
| Catatan yang tampil | "Type III sum of squares" | "Type TypeIII sum of squares" |

**Asal catatan:**
- v4: `multivariate_tests.rs:238-251` membentuk `design`, dan formatter `:870` memakainya (`tableNote = mt.design`).
- main: `multivariate_tests.rs` (main) baris 217–231 membentuk label dari bentuk Debug enum, dan formatter main baris 606 memakainya.
- Label "Type TypeIII" diperbaiki di `1519d1e2`.

**Beda dengan pengamatan dosen.** Dosen melaporkan tabel main "tanpa catatan kaki", sedangkan menurut kode main seharusnya tampil "Type TypeIII sum of squares". Perbedaan ini tidak diverifikasi lewat build main (main tidak di-checkout).

**Catatan pada tabel lain:** Levene di v4 sudah memuat "Design: …" (v3, BB-KF10-02), tetapi Multivariate Tests belum.

### 1.6 Rumus Partial Eta Squared — [BENAR di v4]

Rumus di `multivariate_tests.rs` v4, dengan s = min(p, df_h):

| Statistik | v4 (baris) | Rujukan |
|---|---|---|
| Pillai V | η² = V/s (679) | V/s |
| Wilks Λ | η² = 1 − Λ^(1/s) (711–715) | 1 − Λ^(1/s) |
| Hotelling T | η² = (T/s)/(T/s + 1) (733–737) | (T/s)/(T/s + 1) = T/(T + s) |
| Roy θ | η² = θ/(1 + θ) (755) | θ/(1 + θ) |

**Keterbatasan rujukan:**
- PDF *IBM SPSS Statistics Algorithms* tidak dapat diunduh dari situs IBM, karena melebihi 10 MB untuk alat saya. Rumus di kolom "Rujukan" diambil dari dokumentasi `heplots::etasq` (CRAN) dan catatan Real Statistics bahwa SPSS memakai s pada rumus Wilks.
- **Perlu dicocokkan penulis dengan bagian "GLM Multivariate" di PDF Algorithms.**

**Bukti numerik:**
- 2339 nilai acuan SPSS 27 (`step19-v4/compare-spss.json`) memuat 180 Partial Eta Squared, 180 Noncent. Parameter, dan 170 Observed Power dari mv1–mv8 dan mv4ph. Semuanya lulus dengan toleransi 0.001, termasuk mv4 (s = 2).
- Keterbatasannya: untuk p ≤ 2 atau df_h ≤ 2, eksponen Wilks versi Rao (t) sama dengan s, sehingga data acuan tidak membedakan 1 − Λ^(1/s) dari 1 − Λ^(1/t).

**Riwayat:**
- Hotelling di main memakai T/(1 + T) (main baris 936).
- Diperbaiki di `58d18c65` menjadi (T/s)/(T/s + 1). Untuk s = 1, seperti pada data HR, keduanya sama.

### 1.7 Observed Power Welch dengan df dibulatkan — [MASIH KELIRU di v4, dampak kecil]

**Lokasi:** `MV/rust/src/stats/multivariate_tests.rs:355-360`, yaitu `calculate_observed_power(df1.round(), df2.round(), F, α)`. Fungsi ini menerima `usize`.
- Sig. uji Welch sudah memakai df pecahan sejak revisi v4 (`91cc8e34`).

| Konfigurasi | ν (KY) | df₂ | Power v4 (df₂ = 55) | Power df pecahan (R) | Selisih |
|---|---|---|---|---|---|
| mv2wci (data asli) | 58.268 | 55.268 | 0.99999999993 | 0.99999999993 | 9.2e-13 |
| mv2wd = mv2ws (data geser) | 58.268 | 55.268 | 0.1334213 | 0.1334590 | 3.8e-5 |

Dampak ke tampilan 4 desimal:
- mv2wci: tetap "1".
- mv2wd/mv2ws: berubah dari "0.1334" (df dibulatkan) menjadi "0.1335" bila df pecahan dipakai (0.133459).

Sumber: `dosen_apg_bagian1.R`.

**Pembulatan df lain (di luar pertanyaan, dicatat):** Sig. dan Observed Power keempat statistik juga membulatkan df:
- Sig.: `multivariate_tests.rs:674-677`, `706-710`, `728-732`, `750-754`, `771-775`;
- Power: `:796-798`.

Df₂ Pillai dan Hotelling selalu bulat, tetapi df₂ Wilks (Rao) pecahan bila p ≥ 3 dan df_h ≥ 3. Pada kasus itu Sig./Power Wilks sedikit berbeda dari SPSS. Konfigurasi acuan belum mencakup kasus ini.

### 1.8 Perbedaan kode MV main (`487bbcfe`) vs v4 yang memengaruhi angka keluaran

**Arah perbedaan:** tidak ada commit MV yang hanya ada di main. Ada 24 commit yang hanya ada di v4 (`git log 487bbcfe..HEAD`). Yang memengaruhi angka:

- `d0862fa7`: Observed Power dari F nonsentral dengan α dari Options (main: 1 − 0.1/F dan 1 − e^(−λ/2)).
- `58d18c65`: Partial Eta Squared Hotelling (T/s)/(T/s + 1) (main: T/(1 + T)).
- `23c73a5e`: F dan Sig. Box's M seperti SPSS saat ρ₂ < ρ₁², Sig. dengan df₂ pecahan.
- `5c90a5c7`: baris Total = Σy² (terhadap μ₀) dengan df = n.
- `1519d1e2`: tampilan df Corrected Model = 0 dan catatan jenis SS ("Type III", bukan "Type TypeIII").
- `94165e9a`: SS Type III dari desain berkode deviasi; SS Intercept dan Type II.
- `e6874140`: listwise deletion kasus dengan nilai hilang seperti SPSS.
- `d94a148f`: H uji multivariat efek utama dan interaksi untuk desain tak seimbang.
- `a9fb2414`: df₂ Levene "Based on Median and with adjusted df" seperti SPSS.
- `ab21928c`: Descriptive Statistics dua faktor (sel dan marginal) seperti SPSS.
- `1c7335d8`: Observed Power Welch dari F nonsentral.
- `59fe397e`: model efek utama (Two-Way tanpa interaksi) dari dialog Model.
- `d78df40b`: Levene model efek utama seperti SPSS; validasi mv8 dan mv4-posthoc.
- `53f1a978`: post hoc MV hanya LSD/Bonferroni/Sidak.
- `b24c22ea`: catatan Design pada tabel Levene.
- `2c4e994b`, `8751e76c`, `22a8be47`, `91cc8e34` (v4): δ₀ dua populasi, CI simultan, Sig. Welch dengan df pecahan.

**Commit lain di daftar itu** (`8e2ddbd2`, `28b942db`, `d4dfd820`, `3494ea5c`, `fa286c6c`) hanya menyangkut dialog, pesan, atau struktur kode, dan tidak mengubah angka.

---

## Bagian 2. Matriks kovarians pada uji T²

### 2.1 Uji satu populasi (Test Values μ₀) — [BENAR di v4]

Jalur: `calculate_hypothesis_error_matrices`, cabang `Intercept`, tanpa faktor (`MV/rust/src/stats/multivariate_tests.rs`).

- **H** = n (x̄ − μ₀)(x̄ − μ₀)ᵀ (baris 423–445 dan 524–530).
- **E** = Σᵢ (yᵢ − x̄)(yᵢ − x̄)ᵀ, yaitu SSCP residual satu sel (baris 560–577). Jadi **E = (n − 1)S**, dengan S kovarians sampel berpembagi n − 1.
- **df error** = n − 1 (baris 579–580: n − jumlah sel).
- **Hotelling's Trace** = tr(HE⁻¹) = n(x̄ − μ₀)ᵀ[(n − 1)S]⁻¹(x̄ − μ₀) = T²/(n − 1).
- **F eksak** (s = 1): df₁ = p, df₂ = df_error − p + 1 = n − p, F = θ·(n − p)/p (baris 763–770). Jadi F = (n − p)/((n − 1)p)·T².

**Kovarians lain yang dipakai di kode:**
- Kovarians per kelompok (`compute_per_group_covariances`, `common.rs:1158`: `cov /= (n − 1)`) memakai pembagi n − 1. Ini dipakai CI simultan dan uji Welch.
- **Tidak ada pemakaian MLE (pembagi n).**

### 2.2 T² = (n − 1)·Hotelling's Trace dan F = (n − p)/((n − 1)p)·T²

Nilai mentah Statify diambil dari respons worker: `step19-v4/worker/mv1.raw.json` dan `bukti/sleeping-dog/hasil.json`. Nilai R dari `dosen_apg_bagian2.R`.

| Data | n, p | Hotelling's Trace (Statify) | (n − 1)·HT | T² (R, n·dᵀS⁻¹d) | F Statify | (n − p)/((n − 1)p)·T² |
|---|---|---|---|---|---|---|
| mv1 (divalidasi SPSS 27; μ₀ = 20, 200, 150, 3) | 32, 4 | 0.3479313499 | 10.7858718481 | 10.7858718481 | 2.4355194496 | 2.4355194496 |
| sleeping-dog-kontras (μ₀ = 0) | 19, 3 | 6.4453511778 | 116.0163212010 | 116.0163212010 | 34.3752062818 | 34.3752062818 |

Untuk mv1, F dan Sig. Statify (2.4355, 0.070583) sama dengan SPSS 27 (`compare-spss.json`: F 2.436, Sig. 0.0705833).

### 2.3 Dua populasi Pooled dan berpasangan — [BENAR di v4]

**Pooled (Multivariate Tests):**
- H efek faktor diambil dari desain (`effect_hypothesis_sscps`).
- E adalah SSCP residual model penuh (`multivariate_tests.rs:930-947`: Σ (y − ȳ_sel)(y − ȳ_sel)ᵀ), dengan df error n − jumlah sel (`:950-951`).
- Untuk satu faktor dua level: E = (n₁ − 1)S₁ + (n₂ − 1)S₂ = (n₁ + n₂ − 2)·S_pooled, dengan df n₁ + n₂ − 2.

**Pooled (CI simultan):** S_pooled dihitung eksplisit dengan pembagi n₁ + n₂ − 2 (`MV/rust/src/wasm/constructor.rs:538-544`).

**Berpasangan:**
- TypeScript membentuk selisih d = X₁ − X₂ (`MV/services/multivariate-analysis.ts:99-127`, `buildDifferenceData`).
- Selisih itu dianalisis sebagai uji satu populasi dengan μ₀ = δ₀ (`TestValues`).
- Jadi E = (n − 1)S_d, dengan S_d berpembagi n − 1 dan df n − 1 (lihat 2.1).

### 2.4 Jalur Σ diketahui (uji khi-kuadrat) — belum ada

Pencarian `known`, `sigma`, `Σ`, `ChiSquared`, dan `chi_square` di `MV/rust/src`, `MV/services`, `MV/dialogs`, dan `MV/types` hanya menemukan:
- uji Bartlett (`bartlett_test.rs`);
- Box's M;
- homogeneous subsets (`homogeneous_subsets.rs`);
- `chi_square_cdf` (`common.rs:185`).

Tidak ada field config, dialog, atau cabang perhitungan untuk Σ diketahui. Fitur ini direncanakan untuk `skripsi-final-v5`.

### 2.5 T² (Σ tak diketahui) vs χ² (Σ dianggap diketahui) dengan R dasar

Sumber: `dosen_apg_bagian2.R`, ambang 5%.

| Data | T² | F (df) | p (T², F) | χ² = n(x̄ − μ₀)ᵀS⁻¹(x̄ − μ₀) | p (χ²_p) | χ² dengan Σ̂ MLE (pembagi n) | p | Batas kritis T² / χ² |
|---|---|---|---|---|---|---|---|---|
| mv1 (n = 32, p = 4) | 10.7859 | 2.4355 (4, 28) | **0.0706** | 10.7859 | **0.0291** | 11.1338 | 0.0251 | 12.0195 / 9.4877 |
| sleeping dog (n = 19, p = 3) | 116.0163 | 34.3752 (3, 16) | 3.3e−7 | 116.0163 | 5.6e−25 | 122.4617 | 2.3e−26 | 10.9312 / 7.8147 |

**Kesimpulan:**
- Nilai statistiknya sama, tetapi rujukannya berbeda. T² dibandingkan dengan (n − 1)p/(n − p)·F(p, n − p), sedangkan χ² dibandingkan dengan χ²_p.
- **Pada mv1 (n = 32), keputusan berubah di α = 5%:**
  - uji T² tidak menolak H₀ (p = 0.071);
  - bila S diperlakukan sebagai Σ yang diketahui, uji χ² menolak H₀ (p = 0.029).
- Batas kritis χ² (9.49) jauh lebih kecil daripada batas T² (12.02), karena χ²_p mengabaikan ketidakpastian taksiran S.

---

## Bagian 3. Sum of squares Type I, II, III, IV

### 3.1 Apakah tipe SS benar-benar dihitung berbeda di Rust?

#### GLM Multivariate — efek dihitung berbeda; Intercept tidak

**SS efek pada Tests of Between-Subjects Effects** (`MV/rust/src/stats/between_subjects_effects.rs`):
- Type I (`calculate_type_i_ss`, 321–372): berurutan, pada desain berkode dummy.
- Type II (`calculate_type_ii_ss`, 374–398): disesuaikan untuk efek yang tidak memuatnya.
- Type III (`calculate_type_iii_ss`, 400–433): pada desain berkode deviasi.
- Type IV (`calculate_type_iv_ss`, 435–446): hanya memanggil Type III, dengan komentar "This is a simplification". Akibatnya Type IV **tidak menangani sel kosong**.
- Pemilihnya `effect_ss`, 460–469.

**H efek pada Multivariate Tests:** `multivariate_tests.rs:999-1011`. Rumusnya sama: Type I berurutan, Type II, lalu Type III/IV pada desain deviasi.

**Intercept selalu Type III** (rata-rata sel tak tertimbang), apa pun pilihannya:
- Tests of Between-Subjects Effects: `between_subjects_effects.rs:130-160`.
- Multivariate Tests, faktorial penuh: `multivariate_tests.rs:518-558`.
- Multivariate Tests, model efek utama: `:1019-1031`.

#### GLM Repeated Measures — pilihan tidak dipakai

- **Dialog:** pilihan SS aktif (`RM/dialogs/model.tsx:701-726`) dan nilainya ikut dikirim ke worker (payload `SumOfSquareMethod: "typeI"`).
- **Model RM:** semua tabel utama berasal dari `RmModel` (`RM/rust/src/stats/rm_model.rs`), yang selalu menghitung Type III ("Type III hypothesis SSCP", baris 9, 463, dan 847).
  - Field `sum_of_squares` hanya disimpan (baris 443) dan tidak pernah dibaca.
  - Fungsi Type I–IV di `RM/rust/src/stats/univariate_tests.rs:150-215` dan `sscp_matrix.rs:328-352` hanya dipakai bila `RmModel` gagal dibangun (`RM/rust/src/wasm/function.rs:341-346`).
- **Judul kolom** "Type III Sum of Squares" dipaku di formatter RM (`RM/services/repeated-measures-analysis-formatter.ts:361`, `443`, `507`) dan di keterangan Rust (`rm_model.rs:1384`).

### 3.2 Validasi terhadap SPSS — hanya Type III

- **Sintaks acuan:** ke-17 berkas `.sps` (`testing/glm-mv-reference/spss/` mv1–mv8 dan mv4_posthoc; `testing/glm-rm-reference/spss/` gambar51 dan rm_a–rm_e; `testing/fitur-v4/spss/`) semuanya memakai `/METHOD=SSTYPE(3)`.
- **Harness:** `ui-run.cjs` MV dan `ui-main-worker.cjs` RM tidak pernah mengubah Sum of Squares dari bawaan.
- **Kesimpulan:** Type I, II, dan IV belum pernah divalidasi terhadap SPSS.

### 3.3 mv6 (tak seimbang) dengan Type I–IV di build v4 vs R

**Data dan cara:**
- Ukuran sel faktorA × faktorB: A1 = 3, 4, 2, 4; A2 = 4, 3, 3, 3 (n = 26, tanpa sel kosong).
- Jalannya lewat dialog Model, dan payload worker memuat `typeI` sampai `typeIV`.
- Bukti: `bukti/dosen-apg/sstype-mv6-*.png`, `sstype.json`, dan `sstype-vs-r.txt` (nilai mentah vs R, 17 digit).

**SS yang tampil** (baris Y1A1 dan Y2A1):

| DV | Sumber | Type I | Type II | Type III | Type IV | R Type I (`anova`) | R Type II (car) | R Type III (car, `contr.sum`) |
|---|---|---|---|---|---|---|---|---|
| Y1A1 | faktorA | 1.2496 | 1.1479 | 1.2265 | 1.2265 | 1.249615 | 1.147865 | 1.226477 |
| Y1A1 | faktorB | 1.4507 | 1.4507 | 1.4256 | 1.4256 | 1.450669 | 1.450669 | 1.425556 |
| Y1A1 | faktorA*faktorB | 0.1356 | 0.1356 | 0.1356 | 0.1356 | 0.135634 | 0.135634 | 0.135634 |
| Y1A1 | Intercept | **1447.6375** | **1447.6375** | 1447.6375 | 1447.6375 | **1513.334215 (n·ȳ²)** | — | 1447.637488 |
| Y2A1 | faktorA | 366.3754 | 356.2288 | 363.2520 | 363.2520 | 366.375385 | 356.228789 | 363.252043 |
| Y2A1 | faktorB | 27.2287 | 27.2287 | 20.7484 | 20.7484 | 27.228657 | 27.228657 | 20.748423 |
| Y2A1 | faktorA*faktorB | 27.9875 | 27.9875 | 27.9875 | 27.9875 | 27.987497 | 27.987497 | 27.987497 |
| Y2A1 | Intercept | **174243.5511** | **174243.5511** | 174243.5511 | 174243.5511 | **183187.298462 (n·ȳ²)** | — | 174243.551075 |

**Hasil:**
- **SS efek** (faktorA, faktorB, interaksi) Type I, II, dan III sama dengan R. Selisih mentah maksimum 8.5e−13 (`sstype-vs-r.txt`).
- **Type IV** sama dengan Type III, sesuai harapan karena mv6 tidak punya sel kosong.
- **Error:** SS Error sama untuk semua tipe (Y1A1 4.4625).
- **Keterangan jenis SS di tampilan:**
  - judul kolom mengikuti pilihan ("Type I Sum of Squares", …);
  - catatan Multivariate Tests juga mengikuti pilihan ("Type I sum of squares", …).

### 3.4 Tipe yang hasilnya salah (dilaporkan, tidak diperbaiki)

1. **[MASIH KELIRU di v4] SS Intercept pada Type I (dan kemungkinan Type II) di GLM Multivariate.**
   - **Masalah:** Statify selalu menampilkan Intercept Type III (Y1A1 1447.6375). Menurut R, Intercept Type I pada data tak seimbang adalah n·ȳ² = 1513.3342 (Y2A1: 183187.2985 vs 174243.5511).
   - **Type II:** menurut definisinya (disesuaikan hanya untuk efek yang tidak memuat Intercept), Intercept Type II juga seharusnya n·ȳ². car tidak mencetak Intercept Type II, jadi **perlu dipastikan dengan SPSS**.
   - **Cakupan:** kekeliruan yang sama ada di baris Intercept Multivariate Tests.
   - **Yang tidak terdampak:** efek dan Error sudah benar. Pada data seimbang, Type I = Type III untuk Intercept, sehingga kekeliruan tidak terlihat.
2. **[MASIH KELIRU di v4] Pilihan Sum of Squares di Repeated Measures diabaikan.**
   - **Uji:** data `testing/fitur-v4/data/rm-c-tak-seimbang.csv` (rm_c tanpa tiga subjek pertama metode 1; ukuran kelompok 7 dan 10) dijalankan dengan Type I dan Type III.
   - **Hasil Statify:** identik (Intercept 185457.804, metode 1.334, sesi 230.738), dan kolom tetap berjudul "Type III Sum of Squares".
   - **Nilai benar menurut R** (`dosen_apg_bagian3.R`): Type I seharusnya memberi Intercept 191237.824 dan sesi 254.471. Nilai Type III dari R (185457.804 dan 230.738) sama dengan Statify.
   - **Bukti:** `sstype-rm-c-i-between.png` dan `sstype-rm-c-iii-between.png`.
3. **[MASIH KELIRU di v4, belum teruji] Type IV = Type III** di GLM Multivariate (dan di RM, lihat butir 2). Pada desain dengan sel kosong, Type IV SPSS berbeda dari Type III, tetapi Statify akan menampilkan Type III dengan label Type IV. Belum diuji karena tidak ada data acuan dengan sel kosong.

---

## Ringkasan per bagian

**Bagian 1.**
- **Angka yang dilihat dosen:** Observed Power 0.9091/0.9999 berasal dari rumus heuristik 1 − 0.1/F di main. Di v4 sudah diganti distribusi F nonsentral (`d0862fa7`), dan nilai HR di v4 (power .299/1.000, η² .002/.696, λ 3.300/3348.946) sama dengan R dan SPSS.
- **Yang masih keliru di v4 (sama dengan main):**
  - kolom effect size/power selalu tampil walaupun opsi tidak dicentang;
  - angka dipangkas nolnya ("1.1", "3.3", "1", "0.348" bukan ".348");
  - catatan kaki Multivariate Tests belum memuat Design, keterangan statistik eksak, dan α power.
- **Rumus η²** keempat statistik sesuai rujukan dan acuan SPSS (perlu dicocokkan dengan PDF Algorithms).
- **Power Welch** masih memakai df dibulatkan, dengan selisih ≤ 3.8e−5.

**Bagian 2.**
- Uji satu populasi memakai S berpembagi n − 1 lewat E = (n − 1)S, sehingga T² = (n − 1)·Hotelling's Trace dan F = (n − p)/((n − 1)p)·T². Terbukti numerik pada mv1 (tervalidasi SPSS) dan sleeping dog.
- Pooled memakai E = (n₁ + n₂ − 2)S_pooled; berpasangan memakai S_d berpembagi n − 1.
- Jalur Σ diketahui belum ada.
- Pada mv1, uji χ² (Σ dianggap diketahui) menolak H₀ (p = 0.029), sedangkan uji T² tidak (p = 0.071).

**Bagian 3.**
- **MV:** SS efek Type I, II, dan III dihitung berbeda dan sama dengan R. Type IV = Type III, sesuai pada mv6 tanpa sel kosong tetapi berupa penyederhanaan. SS Intercept tetap Type III pada Type I (dan II).
- **RM:** pilihan SS diabaikan (selalu Type III).
- **Validasi SPSS:** hanya Type III yang pernah divalidasi.

---

## Jawaban singkat untuk dosen

1. **Observed Power 0.9091 dan 0.9999 — keliru di versi ter-deploy saja.** Versi yang didemokan memakai rumus pendekatan 1 − 0,1/F, bukan distribusi F nonsentral. Versi skripsi (v4) sudah memakai F nonsentral seperti SPSS. Pada data HR hasilnya 0,299 untuk Gender dan 1,000 untuk Intercept, sama dengan SPSS dan R.
2. **Partial Eta Squared dan Noncent. Parameter — sudah benar**, juga di versi ter-deploy untuk data ini. Pada data HR, v4 menampilkan 0,0022/0,6955 dan 3,3/3348,9461, sama dengan SPSS (.002/.696 dan 3,300/3348,946). Rumus η² keempat statistik (V/s, 1 − Λ^(1/s), (T/s)/(T/s + 1), θ/(1 + θ)) sesuai rujukan dan lulus uji terhadap 180 nilai SPSS.
3. **Kolom effect size dan power selalu tampil — masih keliru di v4.** Di SPSS, ketiga kolom ini hanya muncul bila opsinya dicentang. Di Statify, pilihan di Options belum dipakai untuk menyembunyikan kolom.
4. **Tampilan "1.1", "3.3", "1", "0.348" — masih keliru di v4.** Angkanya benar, tetapi format tampilan membuang nol di belakang koma dan menulis nol di depan titik. SPSS menampilkan 1.100, 3.300, 1.000, dan .348.
5. **Catatan kaki Multivariate Tests — masih keliru di v4.** Tabel baru memuat "Type III sum of squares". Keterangan "Design: Intercept + Gender", "Exact statistic", dan "Computed using alpha = .05" seperti SPSS belum ada.
6. **Matriks kovarians uji T² — sudah benar.** Statify memakai kovarians sampel S (pembagi n − 1), sehingga T² = (n − 1) × Hotelling's Trace dan F = (n − p)/((n − 1)p) × T². Ini sudah dicocokkan dengan SPSS dan contoh sleeping dog. Uji dengan Σ diketahui (khi-kuadrat) belum tersedia. Pada data satu populasi (n = 32), uji khi-kuadrat memberi p = 0,029, sedangkan uji T² memberi p = 0,071, sehingga keputusannya berbeda.
7. **Sum of squares Type I/II/III/IV — sebagian masih keliru di v4.**
   - Di GLM Multivariate, SS efek Type I, II, dan III sudah benar (sama dengan R), dan Type IV disamakan dengan Type III (benar bila tidak ada sel kosong).
   - SS Intercept selalu dihitung sebagai Type III, sehingga baris Intercept pada Type I (dan kemungkinan Type II) keliru untuk data tak seimbang.
   - Di Repeated Measures, pilihan jenis SS belum dipakai dan hasilnya selalu Type III.
   - Hanya Type III yang pernah divalidasi terhadap SPSS.
8. **Observed Power uji Welch (kovarians tidak sama) — masih keliru di v4, dampaknya sangat kecil.** Derajat bebas masih dibulatkan saat menghitung power, sehingga nilainya berbeda paling banyak sekitar 0,00004. Nilai Sig. uji Welch sudah memakai derajat bebas pecahan.

**Status:** tidak ada yang diperbaiki. Menunggu persetujuan penulis.
