# Ringkasan pengujian black-box (bahan BAB V)

- **Cakupan:** GLM Multivariate dan GLM Repeated Measures, 78 skenario: 50 skenario asli (Tabel 7 dan 8), 17 skenario fitur v4 (δ₀ dan CI simultan), dan 11 skenario fitur final (uji khi-kuadrat dengan Σ diketahui).
- **Iterasi 5:** 10 skenario yang mengutip teks tampilan yang dirapikan (revisi R9) dijalankan ulang pada build final, dan semuanya Sesuai: BB-KF03-02, BB-KF03-04, BB-KF03-05, BB-KF03-14, BB-KF03-15, BB-KF04-01, BB-KF04-03, BB-KF11-02, BB-KF11-03, BB-KF14-01.
- **Iterasi 6:** 4 skenario yang mengutip teks yang diseragamkan ke bahasa Inggris (revisi R10) dijalankan ulang pada build final, dan semuanya Sesuai: BB-KF03-08, BB-KF04-01, BB-KF04-02, BB-KF04-03. Tabel a di bawah masih mengutip teks tampilan pada iterasi 1 sampai 3; teks yang berlaku sekarang ada di `thesis-impact-final.md` §7 dan §8.
- **Hasil per skenario:** "Sesuai" atau "Tidak Sesuai" terhadap Hasil yang Diharapkan; "—" berarti skenario tidak dijalankan pada iterasi itu.
- **Sumber rinci:** langkah, data uji, dan keterangan per skenario ada di `testing/black-box/skenario-black-box.md` dan salinan CSV-nya.

## a. Tabel per kebutuhan fungsional

### Tabel 7. GLM Multivariate (50 skenario asli: 32 di tabel ini)

| No | Kebutuhan Fungsional | Skenario | Hasil yang Diharapkan | Hasil Iterasi 1 | Hasil Iterasi 2 | Hasil Iterasi 3 |
|---|---|---|---|---|---|---|
| 1 | KF1 | Membuka menu Analyze → General Linear Model → Multivariate | Dialog Multivariate terbuka; tombol Model, Contrasts, Post Hoc, EM Means, Save, Options, Bootstrap, Test Values, Paired aktif; Plots nonaktif | Sesuai | Sesuai | Sesuai |
| 2 | KF1 | Perilaku dialog: OK menyimpan konfigurasi, Cancel tidak menyimpan, Reset mengosongkan | Isian terakhir muncul kembali; perubahan setelah Cancel tidak tersimpan; Reset mengembalikan ke bawaan | Sesuai | Sesuai | Sesuai |
| 3 | KF2 | Hotelling T² satu populasi (DV mpg, disp, hp, wt; Test Values μ₀ = 20, 200, 150, 3) | Multivariate Tests berbaris "Hotelling T² (vs μ₀)"; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 4 | KF2 | Jumlah μ₀ menyesuaikan jumlah DV saat DV dihapus dan ditambah | Isian μ₀ menjadi 3 lalu 4; isian baru bernilai 0; analisis tanpa galat | Sesuai | Sesuai | Sesuai |
| 5 | KF2 | OK dengan satu DV | Toast "Please select at least two dependent variables for multivariate analysis." | Sesuai | Sesuai | Sesuai |
| 6 | KF3 | Hotelling T² dua populasi, Covariance Matrices: Equal (Pooled estimate of Σ) | Radio hanya tampil untuk satu Fixed Factor; Box's Test, Levene's Test, Multivariate Tests tampil; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 7 | KF3 | Hotelling T² dua populasi, Covariance Matrices: Unequal (Welch-Satterthwaite) | Multivariate Tests berbaris "jk — Welch-Satterthwaite" (Hotelling's Trace) | Tidak Sesuai | Sesuai | Sesuai |
| 8 | KF3 | Unequal untuk faktor dengan 3 level | Errors Logs: "VarianceMode = Welch requires the Fixed Factor to have exactly two levels; 'treatment' has 3." | Sesuai | Sesuai | Sesuai |
| 9 | KF4 | Hotelling T² berpasangan lewat Paired (dua pasangan) | Tabel "Multivariate Tests — Hotelling T² Berpasangan"; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 10 | KF4 | Validasi Paired: tanpa pasangan, pasangan belum lengkap, variabel yang sama* | Toast "Tambahkan minimal satu pasangan variabel." dan "Terdapat pasangan yang belum lengkap. …"; variabel yang sudah dipakai tidak dapat dipilih lagi* | Tidak Sesuai | Sesuai | Sesuai |
| 11 | KF5 | One-Way MANOVA (DV y1, y2; faktor treatment) | Multivariate Tests (Intercept, treatment) dan Tests of Between-Subjects Effects; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 12 | KF5 | OK tanpa faktor, kovariat, maupun Test Values | Toast "Please select at least one fixed factor or covariate." | Sesuai | Sesuai | Sesuai |
| 13 | KF6 | Two-Way MANOVA dengan interaksi (Model: Full Factorial) | Baris faktorA*faktorB di Multivariate Tests dan Tests of Between-Subjects Effects; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 14 | KF6 | Two-Way MANOVA tanpa interaksi (Model: Build Terms faktorA, faktorB) | Tanpa baris faktorA*faktorB; Levene "Based on Model Residuals"; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 15 | KF6 | Model lewat Build Custom Terms, tanpa lalu dengan faktorA * faktorB | Hasil sama dengan model efek utama, lalu sama dengan Full Factorial | Sesuai | Sesuai | Sesuai |
| 16 | KF6 | Model kustom tanpa suku | Toast galat "The custom model has no terms. …"; tidak ada tabel hasil | Sesuai | Sesuai | Sesuai |
| 17 | KF6 | Suku model bukan faktor terpilih | Toast galat "Model term 'faktorB' is not a selected fixed factor or covariate." | Sesuai | Sesuai | Sesuai |
| 18 | KF6 | Interaksi faktor dengan kovariat | Toast galat "Interaction terms with covariates are not supported in this version." | Sesuai | Sesuai | Sesuai |
| 19 | KF6 | Faktor tidak dimasukkan sebagai efek utama | Toast galat "The custom model must include every fixed factor and covariate as a main effect ('faktorB' is missing)." | Sesuai | Sesuai | Sesuai |
| 20 | KF6 | Suku bersarang (tombol Within) | Toast galat "Nested terms are not supported in this version." | Sesuai | Sesuai | Sesuai |
| 21 | KF6 | Sebagian interaksi pada tiga faktor | Toast galat "Only the full factorial model and the main-effects model are supported in this version." | Sesuai | Sesuai | Sesuai |
| 22 | KF10 | Options: Homogenity Tests tidak dicentang lalu dicentang | Box's Test dan Levene's Test hanya tampil bila dicentang; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 23 | KF10 | Levene pada model efek utama | 1 baris per DV "Based on Model Residuals" (df1 7, df2 24), catatan "Design: Intercept + faktorA + faktorB"; nilai sesuai SPSS | Tidak Sesuai | Sesuai | Sesuai |
| 24 | KF11 | Dialog Multivariate: Post Hoc | Hanya LSD, Bonferroni, Sidak aktif; keterangan "Only LSD, Bonferroni, and Sidak are supported in this version." | Sesuai | Sesuai | Sesuai |
| 25 | KF11 | Post Hoc LSD, Bonferroni, Sidak masing-masing | "Multiple Comparisons — treatment (<metode>)" 6 baris; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 26 | KF11 | Post Hoc LSD, Bonferroni, Sidak sekaligus | Satu tabel "Multiple Comparisons — treatment" dengan kolom Test, 18 baris; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 27 | KF13 | Data dengan nilai hilang | Errors Logs: "2 case(s) with missing values were excluded (listwise)."; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 28 | KF13 | Setiap kasus punya nilai hilang | Toast galat "No complete cases: every case has a missing value." | Sesuai | Sesuai | Sesuai |
| 29 | KF13 | DV yang merupakan kombinasi linear DV lain | Errors Logs: "… Matrix is singular and cannot be inverted"; Multivariate Tests tidak tampil | Sesuai | Sesuai | Sesuai |
| 30 | KF13 | Data besar (2000 kasus) dengan Web Worker | Toast "Running Multivariate analysis..."; halaman tetap dapat digulir dan menu dapat dibuka | Sesuai | Sesuai | Sesuai |
| 31 | KF14 | Options: Residual Plots | Grafik Scatter Plot Matrix "Observed × Predicted × Std. Residual" per DV | Sesuai | Sesuai | Sesuai |
| 32 | KF14 | Tombol Plots | Nonaktif, keterangan "Plots are not supported in this version." | Sesuai | Sesuai | Sesuai |

\* No. 10 dinilai terhadap revisi R2 (bagian e) mulai iterasi 2.

### Tabel 8. GLM Repeated Measures (18 skenario)

| No | Kebutuhan Fungsional | Skenario | Hasil yang Diharapkan | Hasil Iterasi 1 | Hasil Iterasi 2 | Hasil Iterasi 3 |
|---|---|---|---|---|---|---|
| 1 | KF7 | Membuka menu Analyze → General Linear Model → Repeated Measures | Dialog Define lalu dialog utama; Plots dan Post Hoc nonaktif | Sesuai | Sesuai | Sesuai |
| 2 | KF7 | Perilaku dialog: Back to Define, konfigurasi tersimpan, Cancel, Reset | Definisi dan isian terakhir muncul kembali; Cancel tidak menyimpan; Reset mengosongkan | Tidak Sesuai | Sesuai | Sesuai |
| 3 | KF8 | Define: faktor waktu (4 level), measure skor | Empat slot Within-Subjects Variables dapat diisi w1–w4 | Sesuai | Sesuai | Sesuai |
| 4 | KF8 | Validasi isian Define (nama, level, measure) | Tujuh pesan persis, antara lain "Number of levels must be a valid number." dan "A measure with this name already exists." | Tidak Sesuai | Sesuai | Sesuai |
| 5 | KF8 | Define tanpa faktor atau tanpa measure | Toast "Add a within-subjects factor (name and number of levels) before clicking Define." dan "Add a measure name before clicking Define." | Sesuai | Sesuai | Sesuai |
| 6 | KF8 | Menambah faktor within kedua | Toast "Designs with more than one within-subjects factor are not supported in this version." | Sesuai | Sesuai | Sesuai |
| 7 | KF8 | OK dengan slot within belum lengkap | Toast "Please assign a variable to every within-subjects slot." | Sesuai | Sesuai | Sesuai |
| 8 | KF9 | Satu faktor within 4 level (gambar51) | Multivariate Tests, Mauchly's Test of Sphericity, Tests of Within-Subjects Effects/Contrasts; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 9 | KF9 | Satu faktor within 3 level, dua measure (rm_a) | Tests of Within-Subjects Effects (Multivariate) dan hasil per measure; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 10 | KF9 | Contrasts: Repeated | Pilihan Polynomial dan Repeated; baris Level 1 vs. Level 2, …; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 11 | KF10 | Asumsi pada Repeated Measures | Mauchly's Test of Sphericity selalu tampil; Box's Test dan Levene's Test hanya bila Homogenity Tests dicentang; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 12 | KF11 | Tombol Post Hoc Repeated Measures | Nonaktif, keterangan "… Use EM Means > Compare main effects for pairwise comparisons." | Sesuai | Sesuai | Sesuai |
| 13 | KF11 | EM Means: Compare Main Effects dengan LSD(None), Bonferroni, Sidak | Pairwise Comparisons untuk sesi dan metode; nilai Bonferroni sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 14 | KF12 | Analisis profil: faktor within waktu dan faktor between kelompok | Kesejajaran "waktu * kelompok", kesamaan level "kelompok", kerataan "waktu"; nilai sesuai SPSS | Sesuai | Sesuai | Sesuai |
| 15 | KF13 | Data Repeated Measures dengan nilai hilang | Errors Logs: "2 subject(s) with missing values were excluded (listwise)." | Sesuai | Sesuai | Sesuai |
| 16 | KF13 | Variabel within yang bergantung linear | Errors Logs: dua pesan matriks singular; Multivariate Tests tidak tampil; Mauchly W = 0 | Sesuai | Sesuai | Sesuai |
| 17 | KF13 | Data besar (40000 subjek) dengan Web Worker | Hasil tampil; halaman tetap dapat digulir dan menu dapat dibuka | Sesuai | Sesuai | Sesuai |
| 18 | KF14 | Tombol Plots dan opsi grafik di Options | Plots, Spread-Vs.-Level Plots, Residual Plots, Lack of Fit Test nonaktif dengan keterangan | Sesuai | Sesuai | Sesuai |

### Tabel 7 lanjutan. Fitur δ₀ dan CI simultan (17 skenario)

| No | Kebutuhan Fungsional | Skenario | Hasil yang Diharapkan | Hasil eksekusi v4 | Hasil Iterasi 3 | Hasil Iterasi 4 |
|---|---|---|---|---|---|---|
| 1 | KF2 | CI simultan T² dan Bonferroni satu populasi (Options → Simultaneous CI) | Tabel Simultaneous Confidence Intervals sesudah Multivariate Tests; mpg: T² 16.3969–23.7844, Bonferroni 17.2652–22.9160; nilai = R | Sesuai | Sesuai | — |
| 2 | KF2 | CI simultan dengan Significance Level 0,10 | Kolom "90% Simultaneous T² Interval" dan "90% Bonferroni Interval"; nilai = R | Sesuai | Sesuai | — |
| 3 | KF2 | CI tidak dicentang | Tidak ada tabel CI; tabel lain sama dengan uji satu populasi tanpa CI | Sesuai | Sesuai | — |
| 4 | KF2 | CI dengan Significance Level 0 atau 1,5 | Toast "Significance Level must be greater than 0 and less than 1 …"; dialog Options tetap terbuka | Sesuai | Sesuai | — |
| 5 | KF3 | δ₀ dua populasi, kovarians sama | Subdialog Test Values (δ₀); catatan H₀ μ(jk = 1) − μ(jk = 2) = δ₀; nilai sama dengan data yang digeser dan dengan SPSS | Sesuai | Sesuai | Sesuai |
| 6 | KF3 | δ₀ dua populasi, kovarians tidak sama | Baris "jk — Welch-Satterthwaite" sama dengan data yang digeser; catatan Welch dan H₀ δ₀ | Sesuai | Sesuai | Sesuai |
| 7 | KF3 | Perilaku subdialog δ₀ (jumlah isian, Cancel, Reset to 0) | Isian mengikuti DV; Cancel tidak menyimpan; Reset mengembalikan 0 | Sesuai | Sesuai | — |
| 8 | KF3 | Isian δ₀ dikosongkan | Dianggap 0; hasil sama dengan uji standar | Sesuai | Sesuai | — |
| 9 | KF3 | δ₀ pada faktor 3 level | Pesan subdialog; toast "Error: Test Values (δ₀) for two populations require … exactly two levels …" | Tidak Sesuai | Sesuai | — |
| 10 | KF3 | δ₀ saat Fixed Factor diubah | δ₀ dibuang; ringkasan "δ₀ = 0 (H₀: μ₁ = μ₂)" | Sesuai | Sesuai | — |
| 11 | KF3 | CI dua populasi, kovarians sama | Kolom Mean Difference (jk = 1 − jk = 2); catatan §6.3; nilai = R dan MVTests | Sesuai | Sesuai | — |
| 12 | KF3 | CI dua populasi, kovarians tidak sama (Krishnamoorthy–Yu, Welch t) | Kolom Bonferroni (Welch t) dengan df per variabel; ν = 58.268; nilai = R | Sesuai | Sesuai | — |
| 13 | KF3 | CI dengan δ₀ pada skala data asli | Estimasi dan batas sama dengan tanpa δ₀; kolom δ₀ dan Contains δ₀ | Sesuai | Sesuai | Sesuai |
| 14 | KF3 | CI pada faktor 3 level | Errors Logs calculate_simultaneous_ci; tabel CI tidak tampil | Sesuai | Sesuai | — |
| 15 | KF4 | δ₀ berpasangan | Catatan H₀: μd = δ₀; nilai sama dengan data yang digeser dan dengan SPSS | Sesuai | Sesuai | Sesuai |
| 16 | KF4 | CI simultan berpasangan dengan δ₀ | Baris per pasangan, kolom Mean Difference (d̄) dan δ₀; catatan §6.2; nilai = R | Sesuai | Sesuai | Sesuai |
| 17 | KF6 | CI pada Two-Way MANOVA | Errors Logs calculate_simultaneous_ci; tabel CI tidak tampil | Sesuai | Sesuai | — |

### Tabel 7 lanjutan. Uji khi-kuadrat dengan Σ diketahui (11 skenario)

| No | Kebutuhan Fungsional | Skenario | Hasil yang Diharapkan | Hasil Iterasi 3 | Hasil Iterasi 4 |
|---|---|---|---|---|---|
| 1 | KF2 | Uji khi-kuadrat μ = μ₀ dengan Σ diketahui dan CI simultan | Kotak "Population covariance matrix (Σ) known" tidak dicentang di awal; matriks 4 × 4 dengan segitiga bawah otomatis; χ² 11.2494, df 4, Sig. 0.0239; CI χ² dan Bonferroni (z) = R | Sesuai | — |
| 2 | KF2 | Kotak Σ tidak dicentang | Tanpa tabel χ²; keluaran sama dengan uji satu populasi | Sesuai | — |
| 3 | KF2 | Mencoba mengisi segitiga bawah dengan nilai berbeda | Sel bawah nonaktif dan menampilkan cerminan; matriks asimetris tidak dapat dimasukkan | Sesuai | — |
| 4 | KF2 | Σ tidak definit positif | Pesan "Known covariance matrix Σ is not positive definite."; subdialog tetap terbuka | Sesuai | — |
| 5 | KF2 | Sel Σ kosong | Pesan "… every entry on and above the diagonal must be a number."; subdialog tetap terbuka | Sesuai | — |
| 6 | KF2 | Diagonal Σ 0 atau negatif | Pesan "… the diagonal entries (variances) must be greater than 0."; subdialog tetap terbuka | Sesuai | — |
| 7 | KF3 | Uji khi-kuadrat dua populasi, Σ₁ = Σ₂ diketahui, dengan δ₀ | Ringkasan "δ₀ = [3, 2, 10, 1] · Σ known"; χ² 1.7971, df 4, Sig. 0.7730; CI pada skala data asli = R | Sesuai | Sesuai |
| 8 | KF3 | Uji khi-kuadrat dua populasi, Σ₁ dan Σ₂ diketahui | Matriks berjudul Σ₁ (jk = 1) dan Σ₂ (jk = 2); χ² 1.6497, df 4, Sig. 0.7998; CI = R | Sesuai | Sesuai |
| 9 | KF3 | Σ₂ tidak definit positif | Pesan "Known covariance matrix Σ₂ (jk = 2) is not positive definite."; subdialog tetap terbuka | Sesuai | — |
| 10 | KF4 | Uji khi-kuadrat berpasangan, Σd diketahui | Matriks berlabel pasangan; χ² 0.0034, df 2, Sig. 0.9983; CI = R | Sesuai | Sesuai |
| 11 | KF4 | Sel Σd kosong | Pesan "Known covariance matrix Σd: every entry …"; subdialog Paired tetap terbuka | Sesuai | — |

## b. Rekap per iterasi

| Eksekusi | Build | Skenario | Sesuai | Tidak Sesuai | Kendala alat uji |
|---|---|---|---|---|---|
| Iterasi 1 | v2 | 50 asli | 45 | 5 | 0 (7 kendala diselesaikan dengan eksekusi ulang) |
| Iterasi 2 | v3 | 50 asli | 50 | 0 | 0 |
| Eksekusi v4 | v4 | 17 fitur v4 | 16 | 1 | 0 |
| Iterasi 3 | final sebelum perbaikan temuan SPSS | 78 (50 + 17 + 11) | 78 | 0 | 3 (harness; diperiksa ulang offline) |
| Iterasi 4 | final sebelum perapian teks | 8 terdampak perbaikan temuan SPSS | 8 | 0 | 0 |
| Iterasi 5 | final sebelum penyeragaman bahasa | 10 yang mengutip teks yang dirapikan (R9) | 10 | 0 | 0 |
| Iterasi 6 | final | 4 yang mengutip teks yang diseragamkan ke bahasa Inggris (R10) | 4 | 0 | 0 |

| KF | Kebutuhan fungsional | Jumlah skenario | Iterasi 1 (Sesuai/Tidak) | Iterasi 2 | Eksekusi v4 | Iterasi 3 | Iterasi 4 |
|---|---|---|---|---|---|---|---|
| KF1 | Pemilihan analisis GLM Multivariate | 2 | 2/0 | 2/0 | — | 2/0 | — |
| KF2 | Uji satu populasi | 13 | 3/0 | 3/0 | 4/0 | 13/0 | — |
| KF3 | Uji dua populasi | 16 | 2/1 | 3/0 | 9/1 | 16/0 | 5/0 |
| KF4 | Uji berpasangan | 6 | 1/1 | 2/0 | 2/0 | 6/0 | 3/0 |
| KF5 | One-Way MANOVA | 2 | 2/0 | 2/0 | — | 2/0 | — |
| KF6 | Two-Way MANOVA | 10 | 9/0 | 9/0 | 1/0 | 10/0 | — |
| KF7 | Pemilihan analisis GLM Repeated Measures | 2 | 1/1 | 2/0 | — | 2/0 | — |
| KF8 | Pendefinisian faktor within | 5 | 4/1 | 5/0 | — | 5/0 | — |
| KF9 | Desain pengukuran berulang | 3 | 3/0 | 3/0 | — | 3/0 | — |
| KF10 | Pemeriksaan asumsi | 3 | 2/1 | 3/0 | — | 3/0 | — |
| KF11 | Uji lanjut | 5 | 5/0 | 5/0 | — | 5/0 | — |
| KF12 | Analisis profil | 1 | 1/0 | 1/0 | — | 1/0 | — |
| KF13 | Hasil sesuai data dan konfigurasi | 7 | 7/0 | 7/0 | — | 7/0 | — |
| KF14 | Tabel dan grafik | 3 | 3/0 | 3/0 | — | 3/0 | — |
| **Total** | | **78** | **45/5** | **50/0** | **16/1** | **78/0** | **8/0** |

Pencocokan nilai yang tampil dengan SPSS 27 (toleransi 0,001) pada skenario bertanda "nilai sesuai SPSS": 1536/1536 cocok di iterasi 1, 2, dan 3 (1063 GLM Multivariate, 473 GLM Repeated Measures).

## c. Temuan dan perbaikan

| No | Asal | Skenario | Temuan | Perbaikan |
|---|---|---|---|---|
| 1 | Iterasi 1 | BB-KF03-02 | Pilihan "Unequal (Welch-Satterthwaite)" kembali ke "Equal" setelah subdialog dibuka dan ditutup. | Pilihan varians hanya dikembalikan ke bawaan bila Fixed Factor(s) diubah sehingga jumlahnya bukan satu. |
| 2 | Iterasi 1 | BB-KF04-02 | Pasangan yang baru berisi Variable 1 menampilkan pesan "Tambahkan minimal satu pasangan variabel.". | Pasangan belum lengkap diperiksa lebih dulu dengan pesannya sendiri. |
| 3 | Iterasi 1 | BB-KF10-02 | Tabel Levene tidak menampilkan catatan Design. | Catatan tabel Levene diakhiri catatan Design. |
| 4 | Iterasi 1 | BB-KF07-02 | Slot Within-Subjects Variables kosong kembali setiap kali Define diklik. | Slot hanya dikosongkan bila faktor atau measure berubah. |
| 5 | Iterasi 1 | BB-KF08-02 | Number of Levels bukan angka menampilkan pesan rentang. | Isian kosong atau bukan angka menampilkan "Number of levels must be a valid number.". |
| 6 | Eksekusi v4 | BB-KF03-08 | Baris kedua toast galat berawalan "Error:" dua kali. | Pesan galat diambil dari isi galat, sehingga awalan hanya satu. |
| 7 | Pembanding SPSS (sebelum iterasi 4) | — | Noncent. Parameter dan Observed Power Wilks' Lambda berbeda dari SPSS bila jumlah DV dan df hipotesis sama-sama ≥ 3. | Noncentrality Wilks dihitung dari Partial Eta Squared seperti SPSS pada kasus itu. |
| 8 | Pembanding SPSS (sebelum iterasi 4) | — | Observed Power bernilai 0 bila statistik F = 0. | Observed Power pada F = 0 bernilai α seperti SPSS. |

Temuan 7 dan 8 tidak memengaruhi hasil skenario mana pun, karena kolom yang berubah tidak tampil di skenario yang terdampak. Kedelapan skenario yang respons perhitungannya berubah dijalankan ulang sebagai iterasi 4, dan hasilnya tetap Sesuai.

## e. Revisi skenario

| Kode | Skenario | Revisi | Alasan |
|---|---|---|---|
| R1 | BB-KF02-02 | Langkah 3 diperjelas menjadi "Buka Test Values, periksa isian, lalu tutup subdialog dengan Continue." Hasil yang diharapkan tidak berubah. | Langkah semula tidak menyebut cara menutup subdialog. Cancel membuang isian, sehingga hasil langkah 4 bergantung pada tombol yang dipilih, padahal hasil yang diharapkan mengandaikan Continue. |
| R2 | BB-KF04-02 | Langkah 3 ("Isi pasangan (kedalaman1, kedalaman1)") diganti dengan pemeriksaan bahwa kedalaman1 tidak lagi tersedia di Available Variables setelah dipakai sebagai Variable 1. Hasil yang diharapkan tidak lagi memuat pesan "Pasangan harus berisi dua variabel yang berbeda.". | Rancangan awal menuntut pasangan variabel dengan dirinya sendiri dapat dibentuk. Uji berpasangan suatu variabel terhadap dirinya sendiri tidak bermakna (selisihnya selalu 0), dan aplikasi mencegahnya dengan mengeluarkan variabel yang sudah dipakai dari Available Variables. |
| R3 | BB-KF03-11 | Skenario dan Hasil yang Diharapkan diganti: CI Krishnamoorthy–Yu dan Welch t (sebelumnya CI χ² sampel besar). | Metode CI untuk kovarians tidak sama diganti sebelum rilis v4 agar konsisten dengan uji Welch di aplikasi. |
| R4 | BB-KF02-04, BB-KF03-10, BB-KF04-04 | Rujukan "Result 5.3/6.2" diganti subbab "§5.4/§6.3/§6.2". | Nomor Result buku rujukan belum diverifikasi; rujukan hanya menyebut subbab. |
| R5 | BB-KF03-02, BB-KF03-05 | Diperiksa, tidak direvisi. | Sig. uji Welch kini memakai df pecahan; Hasil yang Diharapkan tidak menyebut angka Sig. atau df Welch. |
| R6 | BB-KF03-06 | Langkah 4 dilengkapi tombol penutup subdialog (Continue). | Hasil yang diharapkan langkah berikutnya mengandaikan Continue. |
| R7 | BB-KF03-02 | Catatan tabel tidak lagi "diakhiri" kalimat Welch, tetapi memuatnya, diikuti catatan kaki gaya SPSS. | Catatan kaki gaya SPSS ditambahkan sesudah catatan yang sudah ada. |
| R10 | BB-KF03-08, BB-KF04-01, BB-KF04-02, BB-KF04-03 | Kutipan teks berbahasa Indonesia diganti dengan teks bahasa Inggris yang tampil ("δ₀ applies only when the Fixed Factor has exactly 2 levels (…)", "Hotelling T² (Paired)", "Add at least one variable pair.", "Some pairs are incomplete. …", "Computed on the difference vector …"); perilaku yang diharapkan tidak berubah. | Teks tampilan GLM Multivariate diseragamkan ke bahasa Inggris seperti modul Statify lain. |
| R9 | BB-KF03-02, BB-KF03-04, BB-KF03-05, BB-KF03-14, BB-KF03-15, BB-KF04-01, BB-KF04-03, BB-KF11-02, BB-KF11-03, BB-KF14-01 | Kutipan judul, label, dan catatan disesuaikan dengan teks tampilan baru (misalnya "Multivariate: Test Values (δ₀)", "jk (Welch-Satterthwaite)", "Multiple Comparisons: treatment", "Residual Plots: y1"); perilaku yang diharapkan tidak berubah. | Teks tampilan dirapikan sesudah iterasi 4 (tanda "—" dan deskripsi generik diganti). |
| R8 | Skenario dengan nilai SPSS | Catatan umum, teks tidak diubah. | Angka tampil dengan 4 desimal tetap, dan kolom effect size/power hanya tampil bila opsinya dicentang; pencocokan nilai kolom itu hanya berlaku bila opsinya dicentang. |

## f. Fakta metode

| Eksekusi | Tanggal | Build (BUILD_ID) | WASM MV / RM | Tangkapan layar |
|---|---|---|---|---|
| Iterasi 1 | 2026-09-24 | v2 (`da2MPL8uMDzMEA8FyYFr9`) | `wasm_bg.4c7b0023.wasm` / `wasm_bg.2bc2b212.wasm` | 146 |
| Iterasi 2 | 2026-09-24 | v3 (`LHuNzRz16C8sj4tUeFT-j`) | `wasm_bg.4c7b0023.wasm` / `wasm_bg.2bc2b212.wasm` | 145 |
| Eksekusi v4 | 2026-09-25 | v4 (`1IBznO-olYCW5GfFOKskp`) | `wasm_bg.aeff7f82.wasm` / `wasm_bg.2bc2b212.wasm` | 54 |
| Iterasi 3 | 2026-09-25, 20:18–20:42 WIB | final sebelum perbaikan temuan SPSS (`LIBUcskLZhw3iEIArOeUX`) | `wasm_bg.f735bd9b.wasm` / `wasm_bg.2bc2b212.wasm` | 233 |
| Iterasi 4 | 2026-09-25, 21:18–21:21 WIB | final sebelum perapian teks (`IdywReo5MTivt50HHa3VO`) | `wasm_bg.6145c2bf.wasm` / `wasm_bg.2bc2b212.wasm` | 40 |
| Iterasi 5 | 2026-09-26 | final sebelum penyeragaman bahasa (`OrpyJfBOluV37xa0aqmFr`) | `wasm_bg.6145c2bf.wasm` / `wasm_bg.2bc2b212.wasm` | 46 |
| Iterasi 6 | 2026-09-26 | final (`JyX0CCEXNcyYSCxSLCIPP`) | `wasm_bg.6145c2bf.wasm` / `wasm_bg.2bc2b212.wasm` | 14 |

- **Alat:** Playwright 1.57.0 dengan Chromium 143.0.7499.4 bawaan Playwright.
- **Cara eksekusi:** lewat antarmuka aplikasi build produksi (`next build`, `next start`): impor data dari menu File, menu Analyze, isi dialog, klik tombol. Service, WASM, dan worker tidak dipanggil langsung.
- **Lingkungan browser:** profil bersih (IndexedDB dan localStorage kosong) untuk setiap skenario; langkah "ulangi pada data lain" memakai profil bersih kedua. Mode eksekusi GLM bawaan (Web Worker).
- **Pencatatan:** mulai iterasi 3, setiap berkas hasil mencatat BUILD_ID berkas build dan BUILD_ID yang dilayani server (harness berhenti bila berbeda), nama dan md5 berkas WASM, serta berkas WASM yang diminta halaman. Iterasi 3 dan 4 dijalankan dengan hanya satu server yang aktif.
- **Pencocokan nilai:** nilai tampil vs SPSS 27 (toleransi 0,001), serta nilai tampil fitur v4/final vs R (4 desimal seperti tampilan).
- **Jenis skenario:** 78 skenario, terdiri atas 47 positif dan 31 negatif (asli 31/19, v4 11/6, final 5/6).
