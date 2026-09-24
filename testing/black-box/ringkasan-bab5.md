# Bahan Bab V: pengujian black-box GLM Multivariate dan GLM Repeated Measures

Sumber rinci: `skenario-black-box.md` dan `skenario-black-box.csv` (langkah, data uji, dan keterangan lengkap per skenario). Kolom Hasil Iterasi berisi Sesuai atau Tidak Sesuai.

## a. Tabel 7. Skenario pengujian GLM Multivariate

| No | Kebutuhan Fungsional | Skenario | Hasil yang Diharapkan | Hasil Iterasi 1 | Hasil Iterasi 2 |
|---|---|---|---|---|---|
| 1 | KF1 | Membuka menu Analyze → General Linear Model → Multivariate | Dialog Multivariate terbuka; tombol Model, Contrasts, Post Hoc, EM Means, Save, Options, Bootstrap, Test Values, Paired aktif; Plots nonaktif | Sesuai | Sesuai |
| 2 | KF1 | Perilaku dialog: OK menyimpan konfigurasi, Cancel tidak menyimpan, Reset mengosongkan | Isian terakhir muncul kembali; perubahan setelah Cancel tidak tersimpan; Reset mengembalikan ke bawaan | Sesuai | Sesuai |
| 3 | KF2 | Hotelling T² satu populasi (DV mpg, disp, hp, wt; Test Values μ₀ = 20, 200, 150, 3) | Multivariate Tests berbaris "Hotelling T² (vs μ₀)"; nilai sesuai SPSS | Sesuai | Sesuai |
| 4 | KF2 | Jumlah μ₀ menyesuaikan jumlah DV saat DV dihapus dan ditambah | Isian μ₀ menjadi 3 lalu 4; isian baru bernilai 0; analisis tanpa galat | Sesuai | Sesuai |
| 5 | KF2 | OK dengan satu DV | Toast "Please select at least two dependent variables for multivariate analysis." | Sesuai | Sesuai |
| 6 | KF3 | Hotelling T² dua populasi, Covariance Matrices: Equal (Pooled estimate of Σ) | Radio hanya tampil untuk satu Fixed Factor; Box's Test, Levene's Test, Multivariate Tests tampil; nilai sesuai SPSS | Sesuai | Sesuai |
| 7 | KF3 | Hotelling T² dua populasi, Covariance Matrices: Unequal (Welch-Satterthwaite) | Multivariate Tests berbaris "jk — Welch-Satterthwaite" (Hotelling's Trace) | Tidak Sesuai | Sesuai |
| 8 | KF3 | Unequal untuk faktor dengan 3 level | Errors Logs: "VarianceMode = Welch requires the Fixed Factor to have exactly two levels; 'treatment' has 3." | Sesuai | Sesuai |
| 9 | KF4 | Hotelling T² berpasangan lewat Paired (dua pasangan) | Tabel "Multivariate Tests — Hotelling T² Berpasangan"; nilai sesuai SPSS | Sesuai | Sesuai |
| 10 | KF4 | Validasi Paired: tanpa pasangan, pasangan belum lengkap, variabel yang sama* | Toast "Tambahkan minimal satu pasangan variabel." dan "Terdapat pasangan yang belum lengkap. …"; variabel yang sudah dipakai tidak dapat dipilih lagi* | Tidak Sesuai | Sesuai |
| 11 | KF5 | One-Way MANOVA (DV y1, y2; faktor treatment) | Multivariate Tests (Intercept, treatment) dan Tests of Between-Subjects Effects; nilai sesuai SPSS | Sesuai | Sesuai |
| 12 | KF5 | OK tanpa faktor, kovariat, maupun Test Values | Toast "Please select at least one fixed factor or covariate." | Sesuai | Sesuai |
| 13 | KF6 | Two-Way MANOVA dengan interaksi (Model: Full Factorial) | Baris faktorA*faktorB di Multivariate Tests dan Tests of Between-Subjects Effects; nilai sesuai SPSS | Sesuai | Sesuai |
| 14 | KF6 | Two-Way MANOVA tanpa interaksi (Model: Build Terms faktorA, faktorB) | Tanpa baris faktorA*faktorB; Levene "Based on Model Residuals"; nilai sesuai SPSS | Sesuai | Sesuai |
| 15 | KF6 | Model lewat Build Custom Terms, tanpa lalu dengan faktorA * faktorB | Hasil sama dengan model efek utama, lalu sama dengan Full Factorial | Sesuai | Sesuai |
| 16 | KF6 | Model kustom tanpa suku | Toast galat "The custom model has no terms. …"; tidak ada tabel hasil | Sesuai | Sesuai |
| 17 | KF6 | Suku model bukan faktor terpilih | Toast galat "Model term 'faktorB' is not a selected fixed factor or covariate." | Sesuai | Sesuai |
| 18 | KF6 | Interaksi faktor dengan kovariat | Toast galat "Interaction terms with covariates are not supported in this version." | Sesuai | Sesuai |
| 19 | KF6 | Faktor tidak dimasukkan sebagai efek utama | Toast galat "The custom model must include every fixed factor and covariate as a main effect ('faktorB' is missing)." | Sesuai | Sesuai |
| 20 | KF6 | Suku bersarang (tombol Within) | Toast galat "Nested terms are not supported in this version." | Sesuai | Sesuai |
| 21 | KF6 | Sebagian interaksi pada tiga faktor | Toast galat "Only the full factorial model and the main-effects model are supported in this version." | Sesuai | Sesuai |
| 22 | KF10 | Options: Homogenity Tests tidak dicentang lalu dicentang | Box's Test dan Levene's Test hanya tampil bila dicentang; nilai sesuai SPSS | Sesuai | Sesuai |
| 23 | KF10 | Levene pada model efek utama | 1 baris per DV "Based on Model Residuals" (df1 7, df2 24), catatan "Design: Intercept + faktorA + faktorB"; nilai sesuai SPSS | Tidak Sesuai | Sesuai |
| 24 | KF11 | Dialog Multivariate: Post Hoc | Hanya LSD, Bonferroni, Sidak aktif; keterangan "Only LSD, Bonferroni, and Sidak are supported in this version." | Sesuai | Sesuai |
| 25 | KF11 | Post Hoc LSD, Bonferroni, Sidak masing-masing | "Multiple Comparisons — treatment (<metode>)" 6 baris; nilai sesuai SPSS | Sesuai | Sesuai |
| 26 | KF11 | Post Hoc LSD, Bonferroni, Sidak sekaligus | Satu tabel "Multiple Comparisons — treatment" dengan kolom Test, 18 baris; nilai sesuai SPSS | Sesuai | Sesuai |
| 27 | KF13 | Data dengan nilai hilang | Errors Logs: "2 case(s) with missing values were excluded (listwise)."; nilai sesuai SPSS | Sesuai | Sesuai |
| 28 | KF13 | Setiap kasus punya nilai hilang | Toast galat "No complete cases: every case has a missing value." | Sesuai | Sesuai |
| 29 | KF13 | DV yang merupakan kombinasi linear DV lain | Errors Logs: "… Matrix is singular and cannot be inverted"; Multivariate Tests tidak tampil | Sesuai | Sesuai |
| 30 | KF13 | Data besar (2000 kasus) dengan Web Worker | Toast "Running Multivariate analysis..."; halaman tetap dapat digulir dan menu dapat dibuka | Sesuai | Sesuai |
| 31 | KF14 | Options: Residual Plots | Grafik Scatter Plot Matrix "Observed × Predicted × Std. Residual" per DV | Sesuai | Sesuai |
| 32 | KF14 | Tombol Plots | Nonaktif, keterangan "Plots are not supported in this version." | Sesuai | Sesuai |

## Tabel 8. Skenario pengujian GLM Repeated Measures

| No | Kebutuhan Fungsional | Skenario | Hasil yang Diharapkan | Hasil Iterasi 1 | Hasil Iterasi 2 |
|---|---|---|---|---|---|
| 1 | KF7 | Membuka menu Analyze → General Linear Model → Repeated Measures | Dialog Define lalu dialog utama; Plots dan Post Hoc nonaktif | Sesuai | Sesuai |
| 2 | KF7 | Perilaku dialog: Back to Define, konfigurasi tersimpan, Cancel, Reset | Definisi dan isian terakhir muncul kembali; Cancel tidak menyimpan; Reset mengosongkan | Tidak Sesuai | Sesuai |
| 3 | KF8 | Define: faktor waktu (4 level), measure skor | Empat slot Within-Subjects Variables dapat diisi w1–w4 | Sesuai | Sesuai |
| 4 | KF8 | Validasi isian Define (nama, level, measure) | Tujuh pesan persis, antara lain "Number of levels must be a valid number." dan "A measure with this name already exists." | Tidak Sesuai | Sesuai |
| 5 | KF8 | Define tanpa faktor atau tanpa measure | Toast "Add a within-subjects factor (name and number of levels) before clicking Define." dan "Add a measure name before clicking Define." | Sesuai | Sesuai |
| 6 | KF8 | Menambah faktor within kedua | Toast "Designs with more than one within-subjects factor are not supported in this version." | Sesuai | Sesuai |
| 7 | KF8 | OK dengan slot within belum lengkap | Toast "Please assign a variable to every within-subjects slot." | Sesuai | Sesuai |
| 8 | KF9 | Satu faktor within 4 level (gambar51) | Multivariate Tests, Mauchly's Test of Sphericity, Tests of Within-Subjects Effects/Contrasts; nilai sesuai SPSS | Sesuai | Sesuai |
| 9 | KF9 | Satu faktor within 3 level, dua measure (rm_a) | Tests of Within-Subjects Effects (Multivariate) dan hasil per measure; nilai sesuai SPSS | Sesuai | Sesuai |
| 10 | KF9 | Contrasts: Repeated | Pilihan Polynomial dan Repeated; baris Level 1 vs. Level 2, …; nilai sesuai SPSS | Sesuai | Sesuai |
| 11 | KF10 | Asumsi pada Repeated Measures | Mauchly's Test of Sphericity selalu tampil; Box's Test dan Levene's Test hanya bila Homogenity Tests dicentang; nilai sesuai SPSS | Sesuai | Sesuai |
| 12 | KF11 | Tombol Post Hoc Repeated Measures | Nonaktif, keterangan "… Use EM Means > Compare main effects for pairwise comparisons." | Sesuai | Sesuai |
| 13 | KF11 | EM Means: Compare Main Effects dengan LSD(None), Bonferroni, Sidak | Pairwise Comparisons untuk sesi dan metode; nilai Bonferroni sesuai SPSS | Sesuai | Sesuai |
| 14 | KF12 | Analisis profil: faktor within waktu dan faktor between kelompok | Kesejajaran "waktu * kelompok", kesamaan level "kelompok", kerataan "waktu"; nilai sesuai SPSS | Sesuai | Sesuai |
| 15 | KF13 | Data Repeated Measures dengan nilai hilang | Errors Logs: "2 subject(s) with missing values were excluded (listwise)." | Sesuai | Sesuai |
| 16 | KF13 | Variabel within yang bergantung linear | Errors Logs: dua pesan matriks singular; Multivariate Tests tidak tampil; Mauchly W = 0 | Sesuai | Sesuai |
| 17 | KF13 | Data besar (40000 subjek) dengan Web Worker | Hasil tampil; halaman tetap dapat digulir dan menu dapat dibuka | Sesuai | Sesuai |
| 18 | KF14 | Tombol Plots dan opsi grafik di Options | Plots, Spread-Vs.-Level Plots, Residual Plots, Lack of Fit Test nonaktif dengan keterangan | Sesuai | Sesuai |

\* BB-KF04-02 (Tabel 7 no. 10): iterasi 2 dinilai terhadap revisi R2 (lihat bagian d). Menurut rancangan awal, pasangan (kedalaman1, kedalaman1) harus menampilkan "Pasangan harus berisi dua variabel yang berbeda.".

## b. Rekap per kebutuhan fungsional

| KF | Kebutuhan fungsional | Jumlah skenario | Iterasi 1: Sesuai | Iterasi 1: Tidak Sesuai | Iterasi 2: Sesuai | Iterasi 2: Tidak Sesuai |
|---|---|---|---|---|---|---|
| KF1 | Pemilihan analisis GLM Multivariate | 2 | 2 | 0 | 2 | 0 |
| KF2 | Uji satu populasi | 3 | 3 | 0 | 3 | 0 |
| KF3 | Uji dua populasi | 3 | 2 | 1 | 3 | 0 |
| KF4 | Uji berpasangan | 2 | 1 | 1 | 2 | 0 |
| KF5 | One-Way MANOVA | 2 | 2 | 0 | 2 | 0 |
| KF6 | Two-Way MANOVA | 9 | 9 | 0 | 9 | 0 |
| KF7 | Pemilihan analisis GLM Repeated Measures | 2 | 1 | 1 | 2 | 0 |
| KF8 | Pendefinisian faktor within | 5 | 4 | 1 | 5 | 0 |
| KF9 | Desain pengukuran berulang | 3 | 3 | 0 | 3 | 0 |
| KF10 | Pemeriksaan asumsi | 3 | 2 | 1 | 3 | 0 |
| KF11 | Uji lanjut | 5 | 5 | 0 | 5 | 0 |
| KF12 | Analisis profil | 1 | 1 | 0 | 1 | 0 |
| KF13 | Hasil sesuai data dan konfigurasi | 7 | 7 | 0 | 7 | 0 |
| KF14 | Tabel dan grafik | 3 | 3 | 0 | 3 | 0 |
| **Total** | | **50** | **45** | **5** | **50** | **0** |

## c. Temuan iterasi 1 dan perbaikannya (skripsi-final-v3)

| No | Skenario | Temuan iterasi 1 | Perbaikan |
|---|---|---|---|
| 1 | BB-KF03-02 | Pilihan Covariance Matrices "Unequal (Welch-Satterthwaite)" kembali ke "Equal (Pooled estimate of Σ)" setelah subdialog Options dibuka dan ditutup, sehingga baris Welch tidak tampil. | Pilihan varians kini hanya dikembalikan ke bawaan bila pengguna mengubah Fixed Factor(s) sehingga jumlahnya bukan satu. |
| 2 | BB-KF04-02 | Pada subdialog Paired, pasangan yang baru berisi Variable 1 menampilkan "Tambahkan minimal satu pasangan variabel.", bukan pesan pasangan belum lengkap. | Pasangan belum lengkap kini diperiksa lebih dulu, sehingga tampil "Terdapat pasangan yang belum lengkap. Isi Variable 1 dan Variable 2 untuk setiap baris.". |
| 3 | BB-KF10-02 | Tabel Levene's Test of Equality of Error Variances tidak menampilkan catatan Design. | Catatan tabel Levene kini diakhiri catatan Design, misalnya "Design: Intercept + faktorA + faktorB", dengan format sama seperti catatan Design pada Repeated Measures. |
| 4 | BB-KF07-02 | Isian slot Within-Subjects Variables kosong kembali setiap kali Define diklik, meskipun definisi faktor tidak berubah. | Slot kini hanya dikosongkan bila nama atau level faktor, atau nama measure, berubah. |
| 5 | BB-KF08-02 | Number of Levels berisi bukan angka menampilkan "Number of levels must be between 2 and 99.". | Isian kosong atau bukan angka kini menampilkan "Number of levels must be a valid number.". |

## d. Revisi skenario

| Kode | Skenario | Revisi | Alasan |
|---|---|---|---|
| R1 | BB-KF02-02 | Langkah 3 diperjelas menjadi "Buka Test Values, periksa isian, lalu tutup subdialog dengan Continue." Hasil yang diharapkan tidak berubah. | Langkah semula tidak menyebut cara menutup subdialog. Cancel membuang isian, sehingga hasil langkah 4 bergantung pada tombol yang dipilih, padahal hasil yang diharapkan mengandaikan Continue. |
| R2 | BB-KF04-02 | Langkah 3 ("Isi pasangan (kedalaman1, kedalaman1)") diganti dengan pemeriksaan bahwa kedalaman1 tidak lagi tersedia di Available Variables setelah dipakai sebagai Variable 1. Hasil yang diharapkan tidak lagi memuat pesan "Pasangan harus berisi dua variabel yang berbeda.". | Rancangan awal menuntut pasangan variabel dengan dirinya sendiri dapat dibentuk. Uji berpasangan suatu variabel terhadap dirinya sendiri tidak bermakna (selisihnya selalu 0), dan aplikasi mencegahnya dengan mengeluarkan variabel yang sudah dipakai dari Available Variables. |

## e. Fakta metode

- **Build yang diuji:** iterasi 1 memakai tag `skripsi-final-v2` (BUILD_ID `da2MPL8uMDzMEA8FyYFr9`); iterasi 2 memakai tag `skripsi-final-v3` (BUILD_ID `LHuNzRz16C8sj4tUeFT-j`). Kedua build memuat WASM yang sama (`wasm_bg.4c7b0023.wasm` untuk MV dan `wasm_bg.2bc2b212.wasm` untuk RM) dan dijalankan lokal dengan `next start`.
- **Alat dan cara eksekusi:** Playwright 1.57.0 dengan Chromium 143.0.7499.4 bawaan Playwright. Setiap skenario dieksekusi lewat antarmuka aplikasi: impor data dari menu File, menu Analyze, isi dialog, dan klik tombol.
- **Lingkungan browser:** setiap skenario memakai profil browser bersih (IndexedDB dan localStorage kosong) dengan mode eksekusi GLM bawaan, yaitu Web Worker.
- **Jumlah:** 50 skenario (32 GLM Multivariate, 18 GLM Repeated Measures; 31 positif, 19 negatif). Terkumpul 146 tangkapan layar pada iterasi 1 dan 145 tangkapan layar pada iterasi 2.
- **Pencocokan nilai:** nilai yang tampil di halaman Result dicocokkan dengan keluaran SPSS 27 pada toleransi 0,001. Pada kedua iterasi, 1536 dari 1536 nilai cocok (1063 GLM Multivariate, 473 GLM Repeated Measures).
- **Hasil:** 45 Sesuai dan 5 Tidak Sesuai pada iterasi 1; 50 Sesuai pada iterasi 2.
