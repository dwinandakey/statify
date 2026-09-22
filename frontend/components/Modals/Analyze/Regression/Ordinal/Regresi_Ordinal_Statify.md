# Pendahuluan & Ringkasan Modul (Overview)

## Konsep Dasar Regresi Ordinal

Dalam analisis statistika terapan, riset klinis, epidemiologi, ekonometrika, dan ilmu perilaku, peneliti sering kali berhadapan dengan variabel dependen (respon) berskala **ordinal**. Skala ordinal adalah skala kategorik yang memiliki urutan hierarkis atau pemeringkatan alami (*natural ordering*), namun selisih atau jarak absolut (*metric distance*) antar kategori yang berdekatan tidak berjarak sama atau tidak dapat diukur secara eksak.

Contoh variabel berskala ordinal antara lain:

1. **Derajat Keparahan Penyakit Klinis**: Ringan (\(1\)), Sedang (\(2\)), Berat (\(3\)), Kritis (\(4\)).
2. **Skala Kepuasan / Sikap (Likert Scale)**: Sangat Tidak Setuju (\(1\)), Tidak Setuju (\(2\)), Netral (\(3\)), Setuju (\(4\)), Sangat Setuju (\(5\)).
3. **Peringkat Kinerja Pegawai**: Di Bawah Ekspektasi (\(1\)), Memenuhi Ekspektasi (\(2\)), Melampaui Ekspektasi (\(3\)).
4. **Tingkat Pendidikan Formal**: Dasar (\(1\)), Menengah (\(2\)), Sarjana (\(3\)), Pascasarjana (\(4\)).

Pendekatan parametrik klasik seperti **Regresi Linear Berganda (Ordinary Least Squares / OLS)** memperlakukan data ordinal seolah-olah kontinu dengan mengasumsikan jarak antar kategori konstan (misal: jarak antara kategori 1 dan 2 dianggap setara dengan jarak antara kategori 4 dan 5). Asumsi ini melanggar kaidah pengukuran statistik, dapat menghasilkan prediksi probabilitas di luar interval sah \([0, 1]\), serta memicu heteroskedastisitas berat. 

Di sisi lain, memperlakukan variabel ordinal menggunakan **Regresi Logistik Multinomial (Nominal Logistic)** membuang seluruh informasi pemeringkatan (*rank-ordering information*). Regresi logistik multinomial membutuhkan estimasi \(J-1\) set vektor koefisien slope yang independen satu sama lain terhadap satu kategori referensi, sehingga memboroskan derajat bebas (*degrees of freedom*), mengurangi kekuatan uji statistik (*statistical power*), dan menyulitkan interpretasi terpadu mengenai arah pengaruh variabel prediktor.

Sebagai solusi elegan dan parsimonius, modul ini mengimplementasikan **Cumulative Link Models (CLM)**, yang dalam literatur komputasi SPSS dan statistik modern dikenal sebagai **Polytomous Logit Universal Models (PLUM)** yang dipelopori oleh Peter McCullagh (1980). Model ini memanfaatkan peluang kumulatif (*cumulative probabilities*) untuk menghubungkan variabel respon bertingkat dengan matriks prediktor lokasi (*location predictors*) dan prediktor skala (*scale predictors*).

## Mengapa Pendekatan Cumulative Link (Proportional Odds)?

Model Cumulative Link beroperasi dengan membagi respons berordo \(J\) menjadi serangkaian \(J-1\) titik potong dikotomi kumulatif berurutan:

\[P(Y \le 1 \mid \mathbf{x}) \quad \text{vs} \quad P(Y > 1 \mid \mathbf{x})\]
\[P(Y \le 2 \mid \mathbf{x}) \quad \text{vs} \quad P(Y > 2 \mid \mathbf{x})\]
\[\dots\]
\[P(Y \le J-1 \mid \mathbf{x}) \quad \text{vs} \quad P(Y > J-1 \mid \mathbf{x})\]

Dengan asumsi **Parallel Lines** atau **Proportional Odds**, pengaruh suatu prediktor \(X\) diasumsikan konstan pada setiap titik belah (*cutpoint/threshold*) kumulatif tersebut. Artinya, kurva logit kumulatif bergerak sejajar satu sama lain dan hanya bergeser secara horizontal melalui parameter batas (*threshold/intercept*) \(\theta_j\). Hal ini menghasilkan model yang sangat efisien dengan satu set koefisien regresi \(\boldsymbol{\beta}\) untuk keseluruhan tingkatan respon ordinal.

## Keunggulan Komputasi Lokal Berbasis Rust WebAssembly (WASM)

Aplikasi analisis data tradisional berbasis web umumnya bergantung pada server backend (seperti klaster Python, R-Shiny, atau server API Java/C++) untuk menjalankan estimasi numerik berat. Pendekatan berbasis cloud-server tersebut memiliki kelemahan struktural:

1. **Isu Privasi dan Keamanan Data (Data Privacy & Compliance)**: Data sensitif (rekam medis pasien, identitas responden, data finansial) harus diunggah melalui jaringan publik ke server pihak ketiga, yang berisiko melanggar regulasi GDPR, HIPAA, dan UU Perlindungan Data Pribadi (PDP).
2. **Latensi Jaringan & Beban Biaya Infrastruktur**: Setiap eksekusi komputasi memakan bandwidth transfer data, menimbulkan latensi bolak-balik (round-trip network latency), dan membebani biaya sewa server komputasi berskala tinggi.
3. **Ketergantungan Koneksi Internet**: Aplikasi tidak dapat berfungsi apabila perangkat pengguna berada dalam kondisi offline (*air-gapped* atau jaringan terputus).

Modul Regresi Ordinal pada **Statify Engine** mengadopsi paradigma **Privacy-by-Design** dan **High-Performance Client-Side Computing** penuh:
- Komputasi matriks aljabar linier, evaluasi fungsi log-likelihood, inversi matriks Hessian, dan optimisasi iteratif Newton-Raphson dieksekusi secara instan **langsung di dalam browser pengguna** menggunakan engine biner terkompilasi **Rust WebAssembly (WASM)**.
- **Data Tidak Pernah Meninggalkan Browser Pengguna**: Seluruh siklus pembersihan data, pengkodean kontras dummy, iterasi konvergensi, hingga rendering tabel output berjalan secara lokal di memori RAM perangkat klien.
- **Multithreading Terisolasi (Web Worker)**: Proses kalkulasi numerik berat diisolasi ke dalam Web Worker background thread, sehingga antarmuka pengguna (UI React) tetap responsif pada 60 FPS tanpa mengalami freezing atau lag.

---

# Arsitektur Sistem & Alur Data (Architecture & Data Flow)

Sistem komputasi Modul Regresi Ordinal Statify dibangun di atas arsitektur 3-Tier yang terisolasi secara ketat dan berkomunikasi secara asinkron (*asynchronous message passing*).

## Deskripsi Rinci Tiap Lapisan Arsitektur

### Layer 1: Modal / UI (React / Next.js Component)

Lapisan antarmuka pengguna berada di direktori `frontend/components/Modals/Analyze/Regression/Ordinal/`.
- **Komponen Utama (`OrdinalMain.tsx`)**: Mengatur state dialog, interaksi antar-tab, validasi logika variabel (misal: memastikan variabel respon tidak dipilih ganda sebagai prediktor), pembersihan data hilang, pembentukan matriks desain melalui `plum_design_matrix.ts`, dan orkestrasi pemanggilan Web Worker.
- **Variables Tab (`VariablesTab.tsx`)**: Mengizinkan pengguna menentukan variabel Dependen (Ordinal), Faktor (Kategorik), Kovariat (Kontinu), dan Variabel Pembobot Kasus (*Case Weights*).
- **Location Model Tab (`LocationTab.tsx`)**: Mengatur spesifikasi efek prediktor lokasi, baik efek utama (*main effects*) maupun interaksi antar-faktor dan kovariat (*factorial interactions*).
- **Scale Model Tab (`ScaleTab.tsx`)**: Mengizinkan aktivasi model skala untuk memodelkan heteroskedastisitas varians error kumulatif dengan prediktor tertentu.
- **Options Tab (`OptionsTab.tsx`)**: Mengatur pemilihan fungsi link (*Logit, Probit, CLogLog, NegLogLog, Cauchit*), kriteria konvergensi (maksimum iterasi, batas toleransi parameter, toleransi log-likelihood, singularitas matriks), dan koreksi sel kosong (*zero-cell adjustment*).
- **Output Tab (`OutputTab.tsx`)**: Menentukan seksi tabel mana saja yang akan dicetak pada lembar kerja output (Goodness-of-Fit, Parameter Estimates, Parallel Lines Test, Summary Statistics, Cell Information, Asymptotic Correlations, dan Riwayat Iterasi).

### Layer 2: Web Worker (JavaScript Background Thread)

File pekerja latar belakang berlokasi di `frontend/public/workers/Regression/ordinal.worker.js`.
- **Isolasi Beban CPU**: Algoritma optimisasi nonlinear berbasis inversi matriks berulang dapat memakan waktu beberapa ratus milidetik hingga detik tergantung ukuran observasi. Web Worker memastikan thread rendering UI utama (DOM) tidak terblokir.
- **Serialisasi dan Validasi**: Worker memvalidasi kelengkapan payload JavaScript, memeriksa ketiadaan nilai `NaN` atau `Infinity`, dan memuat modul WebAssembly `statify_ordinal_bg.wasm`.
- **Transformasi Memori**: Mengonversi objek JavaScript terstruktur ke dalam buffer biner yang kompatibel dengan alokator memori WebAssembly melalui pustaka `serde-wasm-bindgen`.

### Layer 3: WASM Engine (Rust / Wasm-bindgen)

Engine inti komputasi ditulis dalam bahasa Rust berkecepatan tinggi dengan dependensi matematis linier `nalgebra` dan distribusi probabilitas `statrs`.
- **Zero-Cost Abstractions**: Rust mengompilasi kode matematis menjadi instruksi biner WebAssembly (`wasm32-unknown-unknown`) yang dieksekusi dengan kecepatan mendekati kode mesin C/C++ (*near-native speed*).
- **Agregasi Subpopulasi Cerdas**: Data \(N\) baris diubah menjadi \(M\) subpopulasi unik dengan memanfaatkan struktur `HashMap` teroptimasi untuk memangkas dimensi matriks Hessian dan mempercepat komputasi turunan hingga puluhan kali lipat.
- **Manajemen Alokasi Memori Aman**: Memanfaatkan sistem kepemilikan (*ownership & borrowing*) Rust sehingga terbebas dari kebocoran memori (*memory leaks*), pointer liar, atau *garbage collection pauses*.

---

# Dokumentasi Struktur File Proyek Modul Ordinal

Struktur pohon berkas proyek untuk Modul Regresi Ordinal terorganisir secara modular sebagai berikut:

```
frontend/components/Modals/Analyze/Regression/Ordinal/
├── Regresi_Ordinal.Rmd                 # Berkas Dokumentasi R Markdown Lengkap (File Ini)
├── dialogs/                            # Komponen Antarmuka Pengguna (React UI Dialogs)
│   ├── OrdinalMain.tsx                 # Modal Kontainer Utama, State Controller & Handler Worker
│   ├── VariablesTab.tsx                # Tab Konfigurasi Variabel Dependen, Faktor, Kovariat & Bobot
│   ├── LocationTab.tsx                 # Tab Spesifikasi Model Prediktor Lokasi & Interaksi
│   ├── ScaleTab.tsx                    # Tab Konfigurasi Komponen Model Skala (Heteroskedastisitas)
│   ├── OptionsTab.tsx                  # Tab Pengaturan Numerik (Link Function, Iterasi, Toleransi)
│   └── OutputTab.tsx                   # Tab Pemilihan Tabel & Statistik Luaran yang Dihasilkan
├── hooks/                              # React Custom Hooks
│   └── tourConfig.ts                   # Konfigurasi Panduan Interaktif Pengguna (Interactive Tour Guide)
├── services/                           # Logika Pembantu TypeScript & Formatter Hasil
│   ├── plum_design_matrix.ts           # Generator Matriks Desain X & Z, Dummy Coding & Treatment Contrast
│   ├── formatter.ts                    # Agregator Utama Formatter Output untuk Statify Output Viewer
│   ├── formatter_context.ts            # Penyusun Konteks Metadata Analisis & Catatan Kaki Tabel
│   ├── formatter_iteration_history.ts  # Format Tabel Riwayat Iterasi Algoritma Optimisasi
│   ├── formatter_model_summary.ts      # Format Tabel Model Fitting, Pseudo R-Square & Goodness-of-Fit
│   ├── formatter_parallel_lines.ts     # Format Tabel Uji Asumsi Kesetaraan Garis Paralel
│   ├── formatter_parameter.ts          # Format Tabel Estimasi Parameter, SE, Wald, p-value & CI 95%
│   ├── formatter_payload.ts            # Penataan Payload Mentah Sebelum Dikirimkan ke Web Worker
│   ├── formatter_saved_variables.ts    # Penataan Kolom Variabel Hasil Prediksi ke Dataset Utama
│   └── formatter_utils.ts              # Fungsi Utilitas Formatting Angka, Desimal & Notasi Ilmiah
├── types/                              # Definisi Tipe Data TypeScript
│   └── ordinal.ts                      # Interface State, Payload Worker, Opsi Estimasi & Struktur Hasil
└── rust/                               # Source Code Komputasi Matematika Inti (Rust WASM)
    ├── Cargo.toml                      # Metadata Paket Rust, Level Optimasi LTO & Dependensi Eksternal
    └── src/
        ├── lib.rs                      # Titik Masuk WASM (plum_version, plum_validate, plum_fit)
        ├── data/
        │   └── mod.rs                  # Agregasi Observasi ke Pola Kovariat Subpopulasi & Zero-Cell Fix
        ├── model/
        │   ├── mod.rs                  # Formulasi Prediktor Linier, Peluang Kumulatif & Peluang Sel
        │   ├── links.rs                # Definisi 5 Link Function beserta Turunan Pertama & Keduanya
        │   ├── derivatives.rs          # Komputasi Vektor Gradient & Matriks Informasi Fisher / Hessian
        │   └── likelihood.rs           # Evaluasi Fungsi Kernel Log-Likelihood Multinomial
        ├── optimizer/
        │   ├── mod.rs                  # Solver Newton-Raphson/Fisher Scoring, Step-Halving & Monotonisitas
        │   └── parallel.rs             # Solver Model Umum (Non-Parallel) & Uji Rasio Likelihood Paralel
        ├── stats/
        │   └── statistics.rs           # Kalkulasi Kovarians, SE, Wald, GOF, Pseudo R2, VIF, dan GVIF
        ├── io/
        │   ├── validation.rs           # Validasi Logika & Konsistensi Dimensi Payload Masukan
        │   └── output.rs               # Konstruksi Struct Akhir JSON Termasuk Kolom Saved Variables
        ├── types/
        │   └── mod.rs                  # Definisi Struct, Enum Matematis & Konversi Kategori Rust
        └── utils/
            └── mod.rs                  # Operasi Aljabar Vektor, Safe Exponential & Pencegahan Underflow
```

## Tugas Spesifik Tiap Modul Rust (`.rs`)

1. **`lib.rs`**: Berfungsi sebagai antarmuka jembatan (*foreign function interface*) `wasm-bindgen`. Mengekspor fungsi `plum_version()`, `plum_validate()` untuk verifikasi cepat tanpa komputasi, dan `plum_fit()` yang menjalankan pipeline fitting menyeluruh.
2. **`data/mod.rs`**: Bertanggung jawab menerima data baris individual, mengidentifikasi kombinasi unik vektor prediktor \(\mathbf{x}\) dan \(\mathbf{z}\), mengakumulasi frekuensi bersyarat tiap kategori \(n_{ij}\), menghitung frekuensi marjinal \(n_i\), serta mengaplikasikan koreksi sel nol (*zero cell adjustment*).
3. **`model/links.rs`**: Menyediakan kalkulasi presisi tinggi untuk lima link function: Logit, Probit, Complementary Log-Log, Negative Log-Log, dan Cauchit, lengkap dengan turunan pertama \(f(\eta) = F'(\eta)\) dan turunan kedua \(f'(\eta) = F''(\eta)\).
4. **`model/derivatives.rs`**: Menghitung vektor skor gradien \(\mathbf{g}(\boldsymbol{\theta})\) secara analitik, matriks informasi ekspektasi Fisher Information Matrix \(\mathcal{I}(\boldsymbol{\theta})\), serta Hessian numerik berbasis *central finite difference*.
5. **`model/likelihood.rs`**: Mengevaluasi nilai kernel log-likelihood dari parameter saat ini berdasarkan data agregat.
6. **`optimizer/mod.rs`**: Mengendalikan loop iterasi optimisasi numerik (Fisher Scoring atau Newton-Raphson), inisialisasi titik awal parameter berbasis proporsi marjinal, algoritma *step-halving* adaptif, serta pengamanan keterurutan threshold \(\theta_1 < \theta_2 < \dots < \theta_{J-1}\).
7. **`optimizer/parallel.rs`**: Mengimplementasikan estimasi model kumulatif umum (*non-parallel model*) di mana setiap belahan kategori memiliki koefisien kemiringan \(\boldsymbol{\beta}_j\) yang berbeda, guna memfasilitasi Uji Parallel Lines.
8. **`stats/statistics.rs`**: Menghitung statistik inferensi akhir: inversi Hessian untuk matriks kovarians, standard error, statistik Wald, nilai p, interval kepercayaan 95%, statistik kecocokan Chi-Square, Pearson Goodness-of-Fit, Deviance, Pseudo R-Square (Cox-Snell, Nagelkerke, McFadden), serta diagnostik multikolinearitas (VIF & GVIF).
9. **`io/validation.rs`**: Menjalankan pengecekan integritas payload, memastikan dimensi baris matriks sesuai panjang vektor respon, memeriksa nilai tak hingga, dan mengidentifikasi potensi multikolinearitas fatal sebelum komputasi dimulai.
10. **`io/output.rs`**: Merangkai semua hasil kalkulasi ke dalam struct keluaran terstruktur `PlumFitOutput`, menangani label parameter redundan (\(0.0\)), dan mengompilasi kolom variabel tersimpan (*saved variables*).

## Tugas Spesifik Tiap Modul TypeScript (`.ts` / `.tsx`)

1. **`plum_design_matrix.ts`**: Mengonversi baris raw data tabel menjadi matriks desain numerik. Mengatur pengkodean kontras treatment/indikator pada faktor kategorik, menentukan kategori referensi (default: level tertinggi), menyusun matriks interaksi, dan mencatat pemetaan baris valid `rowIndexMap`.
2. **`ordinal.ts`**: Menyediakan kontrak antarmuka statis (*type definitions*) yang menjamin konsistensi struktur data yang dikirim antara React UI, Web Worker, dan modul Rust.
3. **`formatter.ts` & Berkas Formatter Terkait**: Berfungsi membedah struct respon biner dari worker menjadi objek tabel terformat yang siap dirender pada sistem tabulasi laporan Statify (lengkap dengan judul tabel, format desimal dinamis, dan catatan kaki statistik).

---

# Dokumentasi Seluruh Algoritma & Rumus Matematika (Math & Algorithm Details)

Berikut adalah kajian matematika komprehensif dari setiap tahap algoritma yang diimplementasikan pada Modul Regresi Ordinal Statify Engine.

## Penanganan Missing Value (Missing Value Handling)

Sebelum data dikirimkan ke WebAssembly, modul melakukan sanitasi data secara ketat menggunakan metode **Listwise Deletion (Complete-Case Analysis)**.

### Alur Kerja Listwise Deletion

Diberikan dataset awal berukuran \(N_{\text{total}}\) baris dan sekumpulan variabel terpilih:
\[\mathcal{V} = \{ Y, X_1, \dots, X_p, F_1, \dots, F_k, Z_1, \dots, Z_q, W \}\]
di mana \(Y\) adalah variabel respon, \(X\) adalah kovariat kontinu, \(F\) adalah faktor kategorik, \(Z\) adalah prediktor skala, dan \(W\) adalah bobot kasus opsional.

Sebuah baris observasi ke-\(i\) dinyatakan **tidak valid** dan dieliminasi dari analisis jika memenuhi salah satu kondisi berikut:
1. \(Y_i \in \{ \text{null}, \text{undefined}, \text{""}, \text{NaN} \}\).
2. Terdapat setidaknya satu prediktor \(V \in \mathcal{V} \setminus \{W\}\) sedemikian sehingga \(V_i \in \{ \text{null}, \text{undefined}, \text{""}, \text{NaN} \}\).
3. Bobot kasus \(W_i\) ditentukan, namun bernilai \(W_i \le 0\), non-finite, atau missing.

### Perekaman Peta Indeks Baris (`rowIndexMap`)

Untuk mendukung fitur **Save Variables** (menyimpan variabel hasil prediksi kembali ke lembar data utama tanpa merusak urutan baris asli), modul membentuk vektor pemetaan indeks:

\[\mathbf{M} = [m_0, m_1, \dots, m_{N_{\text{valid}}-1}]\]

di mana \(m_k \in \{0, 1, \dots, N_{\text{total}}-1\}\) adalah indeks baris asli pada tabel data untuk observasi valid ke-\(k\). Apabila pengguna memilih opsi menyimpan probabilitas prediksi, modul akan mengalokasikan vektor berukuran \(N_{\text{total}}\) yang berisi nilai `null` untuk baris yang dieliminasi, dan mengisi nilai estimasi hanya pada posisi indeks \(\mathbf{M}\).

\[N_{\text{dropped}} = N_{\text{total}} - N_{\text{valid}}\]

Jumlah baris valid (\(N_{\text{valid}}\)) dan baris yang dibuang (\(N_{\text{dropped}}\)) disajikan pada tabel ringkasan pemrosesan kasus (*Case Processing Summary*).

---

## Pembentukan Design Matrix \(X\) & Pengkodean Kontras

### Pengkodean Faktor Kategorik (Indicator / Treatment Contrast)

Untuk variabel faktor kategorik \(F\) yang memiliki \(L\) level unik yang telah diurutkan:
\[\mathcal{L} = \{ \ell_1, \ell_2, \dots, \ell_L \}\]

Secara default, level terakhir \(\ell_L\) ditetapkan sebagai **Kategori Referensi** (*Reference Category / Baseline*). Modul membentuk \(L-1\) variabel indikator (dummy variables) \(D_1, D_2, \dots, D_{L-1}\) dengan aturan pengkodean:

\[D_{ik} = \begin{cases} 
1, & \text{jika } F_i = \ell_k \\ 
0, & \text{jika } F_i \ne \ell_k 
\end{cases} \quad \text{untuk } k = 1, 2, \dots, L-1\]

Untuk level referensi \(\ell_L\), seluruh variabel indikator bernilai nol:
\[D_{i1} = D_{i2} = \dots = D_{i, L-1} = 0\]

Pada tabel estimasi parameter keluaran, parameter untuk level referensi \(\ell_L\) secara eksplisit dicantumkan dengan nilai koefisien \(0.000\), standard error kosong, dan diberi catatan kaki khusus: *"This parameter is set to zero because it is redundant"*.

### Variabel Kovariat Kontinu

Variabel independen berskala kontinu dimasukkan langsung ke dalam matriks desain tanpa transformasi dummy:
\[X_{ij} = x_{ij}\]

### Pembentukan Efek Interaksi

Modul mendukung interaksi bertingkat tinggi (*factorial interactions*):
- **Interaksi Faktor \(\times\) Faktor (\(F_A \times F_B\))**: Hasil kali silang antar variabel dummy aktif masing-masing faktor, menghasilkan \((L_A - 1)(L_B - 1)\) kolom matriks desain.
- **Interaksi Faktor \(\times\) Kovariat (\(F_A \times X\))**: Perkalian masing-masing dummy \(F_A\) dengan nilai kontinu \(X\), menghasilkan \(L_A - 1\) kolom matriks desain.
- **Interaksi Kovariat \(\times\) Kovariat (\(X_1 \times X_2\))**: Perkalian langsung antar nilai numerik kontinu.

### Matriks Desain Lokasi (\(X\)) dan Skala (\(Z\))

Matriks desain akhir disusun tanpa kolom intersep eksplisit (karena intersep telah diakomodasi oleh sekumpulan parameter threshold \(\theta_j\)):
\[\mathbf{X} \in \mathbb{R}^{N_{\text{valid}} \times p}, \quad \mathbf{Z} \in \mathbb{R}^{N_{\text{valid}} \times q}\]
di mana \(p\) adalah jumlah parameter prediktor lokasi aktif, dan \(q\) adalah jumlah parameter skala aktif (jika model skala diaktifkan).

---

## Formulasi Model Cumulative Link (Proportional Odds)

Misalkan variabel respon ordinal \(Y\) memiliki \(J\) kategori terurut alami:
\[Y \in \{1, 2, \dots, J\}\]

### Probabilitas Kumulatif

Peluang kumulatif didefinisikan sebagai probabilitas bahwa respon \(Y_i\) berada pada atau di bawah kategori \(j\), terkondisi pada vektor prediktor:
\[\gamma_{ij} = P(Y_i \le j \mid \mathbf{x}_i, \mathbf{z}_i) = \sum_{k=1}^j \pi_{ik}, \quad j = 1, 2, \dots, J\]

Secara definisi:
\[0 < \gamma_{i1} < \gamma_{i2} < \dots < \gamma_{i, J-1} < \gamma_{iJ} \equiv 1\]

### Hubungan Link Linier (General Model PLUM)

Model menghubungkan fungsi inversi link \(F^{-1}(\cdot)\) dengan prediktor linier lokasi dan skala:
\[F^{-1}(\gamma_{ij}) = \eta_{ij} = \frac{\theta_j - \mathbf{x}_i^T \boldsymbol{\beta}}{\sigma_i}\]

di mana:
- \(\theta_j\) adalah parameter **Threshold** (titik potong/cutpoint) ke-\(j\), dengan kendala keterurutan \(\theta_1 < \theta_2 < \dots < \theta_{J-1}\).
- \(\boldsymbol{\beta} \in \mathbb{R}^p\) adalah vektor koefisien regresi lokasi (**Location Parameters**). Tanda negatif (\(-\mathbf{x}_i^T \boldsymbol{\beta}\)) mengikuti konvensi McCullagh (1980) dan SPSS PLUM, yang menjamin bahwa nilai koefisien \(\beta_k > 0\) berarti peningkatan nilai prediktor \(X_k\) meningkatkan kecenderungan observasi berada pada kategori respon yang lebih tinggi.
- \(\sigma_i\) adalah komponen **Skala** (*Scale Parameter*):
  \[\sigma_i = \exp(\mathbf{z}_i^T \boldsymbol{\tau})\]
  Pada **Model Lokasi Standar** (*Location-Only Model*), komponen skala bernilai konstan \(\sigma_i = 1\) (\(\boldsymbol{\tau} = \mathbf{0}\)).

### Fungsi Link Alternatif (\(F^{-1}\)) dan Invers Link (\(F\))

Statify Engine menyediakan lima fungsi link kumulatif matematis standar:

| Nama Link | Persamaan Link \(F^{-1}(p) = \eta\) | Persamaan Invers \(p = F(\eta)\) | Asumsi Distribusi Laten & Karakteristik |
| :--- | :--- | :--- | :--- |
| **Logit** (Default) | \(\ln\left(\frac{p}{1-p}\right)\) | \(\frac{1}{1 + e^{-\eta}}\) | Distribusi Logistik. Peluang relatif sama merata antar kategori (Proportional Odds). |
| **Probit** | \(\Phi^{-1}(p)\) | \(\Phi(\eta) = \int_{-\infty}^\eta \frac{1}{\sqrt{2\pi}} e^{-t^2/2} dt\) | Distribusi Normal Baku. Tepat untuk variabel laten yang berdistribusi normal kontinu. |
| **Complementary Log-Log (CLogLog)** | \(\ln(-\ln(1-p))\) | \(1 - \exp(-\exp(\eta))\) | Distribusi Nilai Ekstrem Tipe I (Gumbel). Asimetris; tepat jika kategori tinggi mendominasi. |
| **Negative Log-Log** | \(-\ln(-\ln(p))\) | \(\exp(-\exp(-\eta))\) | Asimetris; tepat jika kategori rendah mendominasi atau respon condong ke kiri. |
| **Cauchit** | \(\tan\left(\pi (p - 0.5)\right)\) | \(0.5 + \frac{1}{\pi} \arctan(\eta)\) | Distribusi Cauchy. Tepat jika terdapat ekor tebal (*heavy tails*) atau outlier ekstrem. |

### Perhitungan Probabilitas Sel Individual (\(\pi_{ij}\))

Setelah probabilitas kumulatif \(\gamma_{ij} = F(\eta_{ij})\) dihitung, probabilitas observasi jatuh tepat pada kategori \(j\) dihitung melalui selisih kumulatif:

\[\pi_{i1} = \gamma_{i1}\]
\[\pi_{ij} = \gamma_{ij} - \gamma_{i, j-1}, \quad \text{untuk } j = 2, 3, \dots, J-1\]
\[\pi_{iJ} = 1 - \gamma_{i, J-1}\]

Secara komputasi, modul menerapkan penstabil numerik berupa pemotongan batas (*probability clamping*):
\[\pi_{ij} \leftarrow \max(\varepsilon, \min(1 - \varepsilon, \pi_{ij})), \quad \varepsilon = 10^{-15}\]
diikuti dengan normalisasi penjumlahan: \(\sum_{j=1}^J \pi_{ij} = 1\).

---

## Agregasi Data Menjadi Subpopulasi Pola Kovariat Unik

Jika data memiliki banyak observasi dengan nilai prediktor identik, melakukan kalkulasi per-baris individual sangat tidak efisien. Modul mengelompokkan data menjadi \(M\) **Subpopulasi** unik.

Sebuah subpopulasi \(s\) (\(s = 1, \dots, M\)) didefinisikan oleh pasangan unik \((\mathbf{x}_s, \mathbf{z}_s)\). Vektor observasi frekuensi pada subpopulasi \(s\) adalah:
\[\mathbf{n}_s = [n_{s1}, n_{s2}, \dots, n_{sJ}]^T\]
di mana:
\[n_{sj} = \sum_{i \in \text{Subpop}_s} w_i \cdot \mathbb{I}(Y_i = j)\]
\[m_s = \sum_{j=1}^J n_{sj} \quad (\text{Ukuran Marjinal Subpopulasi } s)\]
\[N = \sum_{s=1}^M m_s \quad (\text{Total Bobot Observasi})\]

### Penanganan Sel Nol (*Zero-Cell Adjustment*)

Jika sebuah subpopulasi memiliki sel dengan frekuensi \(n_{sj} = 0\), dapat timbul ketidakstabilan pada deviance. Modul menyediakan opsi penambahan kuantitas pseudo-frekuensi kecil \(\delta \ge 0\):
\[n_{sj} \leftarrow n_{sj} + \delta \quad \text{jika } n_{sj} \le 10^{-12}\]
\[m_s \leftarrow m_s + \delta\]

---

## Inisialisasi Parameter Awal

Konvergensi cepat algoritma Newton-Raphson sangat bergantung pada titik awal parameter \(\boldsymbol{\theta}^{(0)}\).

1. **Koefisien Regresi Lokasi**:
   \[\boldsymbol{\beta}^{(0)} = [0, 0, \dots, 0]^T \in \mathbb{R}^p\]
2. **Koefisien Regresi Skala**:
   \[\boldsymbol{\tau}^{(0)} = [0, 0, \dots, 0]^T \in \mathbb{R}^q\]
3. **Threshold Awal (\(\theta_j^{(0)}\))**:
   Dihitung berdasarkan proporsi marjinal kumulatif sampel secara keseluruhan:
   \[\bar{\gamma}_j = \frac{\sum_{s=1}^M \sum_{k=1}^j n_{sk}}{N}, \quad j = 1, 2, \dots, J-1\]
   \[\theta_j^{(0)} = F^{-1}(\bar{\gamma}_j)\]
   Karena \(0 < \bar{\gamma}_1 < \bar{\gamma}_2 < \dots < \bar{\gamma}_{J-1} < 1\) dan fungsi link bersifat monoton meningkat ketat, maka inisialisasi ini secara otomatis menjamin kondisi awal yang valid:
   \[\theta_1^{(0)} < \theta_2^{(0)} < \dots < \theta_{J-1}^{(0)}\]

---

## Fungsi Log-Likelihood & Turunan Matematis

Vektor parameter gabungan yang akan diestimasi memiliki dimensi \(K = (J-1) + p + q\):
\[\boldsymbol{\psi} = [\theta_1, \dots, \theta_{J-1}, \beta_1, \dots, \beta_p, \tau_1, \dots, \tau_q]^T\]

### Formulasi Log-Likelihood

Fungsi Log-Likelihood kernel untuk data subpopulasi multivariat adalah:
\[\ell_{\text{kernel}}(\boldsymbol{\psi}) = \sum_{s=1}^M \sum_{j=1}^J n_{sj} \ln(\pi_{sj}(\boldsymbol{\psi}))\]

Untuk kesesuaian eksak dengan format keluaran SPSS PLUM, nilai log-likelihood lengkap memuat konstanta multinomial (*Multinomial Constant*):
\[C = \sum_{s=1}^M \left[ \ln \Gamma(m_s + 1) - \sum_{j=1}^J \ln \Gamma(n_{sj} + 1) \right]\]
\[\ell_{\text{complete}}(\boldsymbol{\psi}) = \ell_{\text{kernel}}(\boldsymbol{\psi}) + C\]

Statistik deviance \(-2\ell\) dihitung sebagai:
\[-2\ell = -2 \cdot \ell(\boldsymbol{\psi})\]

### Vektor Gradient (Score Function \(\mathbf{g}(\boldsymbol{\psi})\))

Turunan pertama log-likelihood terhadap sembarang elemen parameter \(\psi_k\) adalah:
\[g_k(\boldsymbol{\psi}) = \frac{\partial \ell}{\partial \psi_k} = \sum_{s=1}^M \sum_{j=1}^J \frac{n_{sj}}{\pi_{sj}} \frac{\partial \pi_{sj}}{\partial \psi_k}\]

Berdasarkan relasi \(\pi_{sj} = \gamma_{sj} - \gamma_{s, j-1}\), kita memiliki:
\[\frac{\partial \pi_{sj}}{\partial \psi_k} = \frac{\partial \gamma_{sj}}{\partial \psi_k} - \frac{\partial \gamma_{s, j-1}}{\partial \psi_k}\]

Melalui aturan rantai (*chain rule*):
\[\frac{\partial \gamma_{sj}}{\partial \psi_k} = f(\eta_{sj}) \cdot \frac{\partial \eta_{sj}}{\partial \psi_k}, \quad f(\eta) = \frac{d F(\eta)}{d\eta}\]

Turunan parsial dari linear predictor \(\eta_{sj} = \frac{\theta_j - \mathbf{x}_s^T \boldsymbol{\beta}}{\sigma_s}\) adalah:
1. **Terhadap Threshold \(\theta_r\)**:
   \[\frac{\partial \eta_{sj}}{\partial \theta_r} = \begin{cases} \frac{1}{\sigma_s}, & \text{jika } r = j \\ 0, & \text{jika } r \ne j \end{cases}\]
2. **Terhadap Slope Lokasi \(\beta_r\)**:
   \[\frac{\partial \eta_{sj}}{\partial \beta_r} = -\frac{x_{sr}}{\sigma_s}\]
3. **Terhadap Parameter Skala \(\tau_r\)** (jika \(\sigma_s = \exp(\mathbf{z}_s^T \boldsymbol{\tau})\)):
   \[\frac{\partial \eta_{sj}}{\partial \tau_r} = \frac{\partial}{\partial \tau_r} \left( (\theta_j - \mathbf{x}_s^T \boldsymbol{\beta}) e^{-\mathbf{z}_s^T \boldsymbol{\tau}} \right) = -\eta_{sj} \cdot z_{sr}\]

### Matriks Informasi Ekspektasi Fisher (\(\mathcal{I}(\boldsymbol{\psi})\))

Metode Fisher Scoring menggunakan nilai ekspektasi dari turunan parsial kedua:
\[\mathcal{I}_{ab}(\boldsymbol{\psi}) = \mathbb{E}\left[ -\frac{\partial^2 \ell}{\partial \psi_a \partial \psi_b} \right] = \sum_{s=1}^M m_s \sum_{j=1}^J \frac{1}{\pi_{sj}} \left( \frac{\partial \pi_{sj}}{\partial \psi_a} \right) \left( \frac{\partial \pi_{sj}}{\partial \psi_b} \right)\]

Matriks informasi \(\mathcal{I}(\boldsymbol{\psi}) \in \mathbb{R}^{K \times K}\) bersifat simetris dan semidefinit positif.

### Matriks Hessian Observasian (\(H(\boldsymbol{\psi})\))

Pada metode Newton-Raphson, digunakan matriks turunan parsial kedua empiris:
\[H_{ab}(\boldsymbol{\psi}) = \frac{\partial^2 \ell}{\partial \psi_a \partial \psi_b}\]

Modul mengimplementasikan kalkulasi Hessian melalui pendekatan **Central Finite Differences** berpresisi tinggi:
\[H_{ab}(\boldsymbol{\psi}) \approx \frac{g_a(\boldsymbol{\psi} + h_b \mathbf{e}_b) - g_a(\boldsymbol{\psi} - h_b \mathbf{e}_b)}{2 h_b}\]
dengan ukuran langkah adaptif: \(h_b = 10^{-5} \cdot (1 + |\psi_b|)\).

---

## Estimasi Parameter (Optimisasi Numerical Engine)

### Pembaharuan Vektor Parameter (Newton Step)

Pada iterasi ke-\(t\), arah pergerakan \(\boldsymbol{\delta}^{(t)}\) diperoleh dengan menyelesaikan sistem persamaan linier:
\[\mathbf{A}^{(t)} \boldsymbol{\delta}^{(t)} = \mathbf{g}^{(t)}\]
di mana \(\mathbf{A}^{(t)} = \mathcal{I}(\boldsymbol{\psi}^{(t)})\) untuk Fisher Scoring, atau \(\mathbf{A}^{(t)} = -H(\boldsymbol{\psi}^{(t)})\) untuk Newton-Raphson.

Penyelesaian dilakukan via **LU Decomposition** berkinerja tinggi dari pustaka `nalgebra`.

### Algoritma Step-Halving & Regularisasi Monotonik

Untuk mencegah divergensi (*overshooting*) pada permukaan log-likelihood yang non-kuadratik, modul menerapkan mekanisme pemotongan langkah secara adaptif:

\[\boldsymbol{\psi}_{\text{candidate}} = \boldsymbol{\psi}^{(t)} + \alpha \boldsymbol{\delta}^{(t)}, \quad \alpha \in \{1.0, 0.5, 0.25, 0.125, \dots\}\]

Langkah-langkah evaluasi tiap tahap halving:
1. **Penegakan Monotonisitas Threshold**:
   \[\text{Jika } \theta_j \le \theta_{j-1}, \quad \text{maka set } \theta_j = \theta_{j-1} + 10^{-6}\]
2. **Evaluasi Log-Likelihood**:
   Kandidat diterima jika dan hanya jika:
   \[\ell(\boldsymbol{\psi}_{\text{candidate}}) \ge \ell(\boldsymbol{\psi}^{(t)}) \quad \text{dan} \quad \ell(\boldsymbol{\psi}_{\text{candidate}}) \text{ bernilai finite (bukan NaN / }\pm\infty\text{)}\]
3. Jika kondisi di atas tidak terpenuhi, ukuran langkah dibagi dua (\(\alpha \leftarrow \alpha / 2\)) hingga batas `max_step_halving` (default: 5 kali).

### Kriteria Konvergensi

Algoritma berhenti dan dinyatakan **Konvergen** (*Successfully Converged*) jika pada akhir iterasi salah satu dari kriteria berikut terpenuhi:

1. **Perubahan Absolut Log-Likelihood**:
   \[|\ell^{(t+1)} - \ell^{(t)}| < \epsilon_{\text{LL}} \quad (\text{default: } 10^{-8})\]
2. **Norma Maksimum Perubahan Parameter**:
   \[\max_k |\psi_k^{(t+1)} - \psi_k^{(t)}| < \epsilon_{\text{param}} \quad (\text{default: } 10^{-6})\]
3. **Norma Tak Hingga Vektor Skor Gradien**:
   \[\|\mathbf{g}(\boldsymbol{\psi}^{(t+1)})\|_\infty = \max_k |g_k| < \epsilon_{\text{grad}} \quad (\text{default: } 10^{-6})\]

---

## Matriks Varians-Kovarians & Penanganan Singularitas

Setelah konvergensi tercapai pada solusi optimal \(\hat{\boldsymbol{\psi}}\), matriks varians-kovarians asimtotik diperoleh dari invers matriks informasi akhir:

\[\widehat{\boldsymbol{\Sigma}} = \operatorname{Var}(\hat{\boldsymbol{\psi}}) = \mathbf{A}(\hat{\boldsymbol{\psi}})^{-1}\]

### Strategi Pemulihan Kegagalan Inversi (Ridge Regularization)

Jika matriks \(\mathbf{A}\) mendekati singular (determinant \(\approx 0\) akibat multikolinearitas tinggi antar prediktor), modul menerapkan stabilisasi **Tikhonov / Ridge Regularization**:

\[\mathbf{A}_{\text{reg}} = \mathbf{A} + \lambda \mathbf{I}\]
di mana \(\lambda\) dimulai dari \(10^{-8}\) dan dinaikkan secara bertahap (\(\lambda \leftarrow \lambda \times 10\)) jika inversi gagal, dengan peringatan (*warning*) yang dicatat secara otomatis.

### Matriks Korelasi Asimtotik

Matriks korelasi parameter dihitung dari kovarians:
\[\operatorname{Corr}(\hat{\psi}_a, \hat{\psi}_b) = \frac{\widehat{\Sigma}_{ab}}{\sqrt{\widehat{\Sigma}_{aa} \cdot \widehat{\Sigma}_{bb}}}\]

---

## Statistik Inferensi & Parameter Output

Untuk setiap parameter \(\hat{\psi}_k\):

1. **Standard Error (SE)**:
   \[SE(\hat{\psi}_k) = \sqrt{\widehat{\Sigma}_{kk}}\]
2. **Statistik Uji Wald Chi-Square**:
   \[W_k = \left( \frac{\hat{\psi}_k}{SE(\hat{\psi}_k)} \right)^2 \sim \chi^2_1\]
3. **Nilai Signifikansi (\(p\)-value)**:
   \[p_k = 1 - F_{\chi^2_1}(W_k) = P(\chi^2_1 \ge W_k)\]
4. **Selang Kepercayaan 95% (Confidence Interval)**:
   \[\text{Lower}_k = \hat{\psi}_k - z_{1 - \alpha/2} \cdot SE(\hat{\psi}_k)\]
   \[\text{Upper}_k = \hat{\psi}_k + z_{1 - \alpha/2} \cdot SE(\hat{\psi}_k)\]
   di mana \(z_{0.975} \approx 1.95996\) untuk tingkat kepercayaan \(95\%\).
5. **Exponentiated Parameter / Odds Ratio (OR)**:
   Khusus untuk link logit, rasio odds kumulatif dihitung sebagai:
   \[\text{OR}_k = \exp(-\hat{\beta}_k) \quad \text{atau} \quad \text{OR}_k = \exp(\hat{\beta}_k)\]
   tergantung pada konvensi arah pemodelan kategori batas.

---

## Pengujian Asumsi Parallel Lines (Test of Parallel Lines)

Uji ini mengevaluasi apakah asumsi kemiringan yang sama (*equal slopes / proportional odds*) dapat dipertahankan di seluruh belahan ambang batas kumulatif \(J-1\).

### Hipotesis Statistik

\[H_0: \boldsymbol{\beta}_1 = \boldsymbol{\beta}_2 = \dots = \boldsymbol{\beta}_{J-1} = \boldsymbol{\beta} \quad (\text{Model Paralel / Proportional Odds Sah})\]
\[H_1: \exists j \ne j' \text{ sedemikian sehingga } \boldsymbol{\beta}_j \ne \boldsymbol{\beta}_{j'} \quad (\text{Model Umum Kumulatif})\]

### Model Umum Non-Paralel

Pada model umum, prediktor linier mengizinkan koefisien slope yang berbeda pada tiap belahan:
\[\eta_{sj} = \theta_j - \mathbf{x}_s^T \boldsymbol{\beta}_j, \quad j = 1, 2, \dots, J-1\]
Total parameter kemiringan meningkat menjadi \((J - 1) \times p\).

### Statistik Uji Rasio Likelihood (Likelihood Ratio Test)

Modul mengestimasi kedua model hingga konvergen, lalu menghitung deviasi deviance:
\[\chi^2_{\text{parallel}} = (-2\ell_{\text{parallel}}) - (-2\ell_{\text{general}}) = 2(\ell_{\text{general}} - \ell_{\text{parallel}})\]

Derajat bebas uji:
\[df = [(J - 1) - 1] \times p = (J - 2) \cdot p\]

Nilai p dihitung menggunakan distribusi Chi-Square:
\[p = 1 - F_{\chi^2_{df}}(\chi^2_{\text{parallel}})\]

**Kaidah Keputusan**:
- Jika \(p \ge 0.05\): Gagal tolak \(H_0\). Asumsi garis paralel terpenuhi; model regresi ordinal standar valid digunakan.
- Jika \(p < 0.05\): Tolak \(H_0\). Asumsi garis paralel dilanggar; dianjurkan mempertimbangkan model *Partial Proportional Odds*, *Generalized Ordinal Logistic Regression*, atau *Multinomial Logistic Regression*.

---

## Uji Kecocokan Model (Model Fitting & Goodness-of-Fit)

### Model Fitting Information

Membandingkan **Final Model** terhadap **Intercept-Only (Null) Model** (model tanpa prediktor yang hanya memuat parameter threshold \(\theta\)):

\[\chi^2_{\text{model}} = 2 \left( \ell_{\text{final}} - \ell_{\text{null}} \right)\]
\[df_{\text{model}} = K_{\text{final}} - K_{\text{null}} = p + q\]
\[p_{\text{model}} = 1 - F_{\chi^2_{df}}(\chi^2_{\text{model}})\]

Uji yang signifikan (\(p < 0.05\)) menandakan bahwa kombinasi variabel prediktor secara simultan berkontribusi nyata terhadap peningkatan kecocokan model dibandingkan model acak tanpa prediktor.

### Pearson Chi-Square Goodness-of-Fit

Mengukur selisih kuadrat antara frekuensi teramati (\(n_{sj}\)) dan frekuensi harapan (\(\hat{\mu}_{sj} = m_s \hat{\pi}_{sj}\)):

\[\chi^2_{\text{Pearson}} = \sum_{s=1}^M \sum_{j=1}^J \frac{(n_{sj} - m_s \hat{\pi}_{sj})^2}{m_s \hat{\pi}_{sj}}\]

### Deviance Goodness-of-Fit

Mengukur rasio log-likelihood antara model tersaturasi penuh (*saturated model*) dengan model yang diestimasi:

\[D = 2 \sum_{s=1}^M \sum_{j=1}^J n_{sj} \ln\left( \frac{n_{sj}}{m_s \hat{\pi}_{sj}} \right)\]

### Derajat Bebas Goodness-of-Fit

\[df_{\text{GOF}} = M \cdot (J - 1) - (p + q)\]
di mana \(M\) adalah jumlah subpopulasi kovariat unik.

Nilai signifikansi \(p > 0.05\) pada uji Pearson dan Deviance menunjukkan model cocok secara memadai dengan data empiris (*good fit*).

---

## Kriteria Informasi & Pseudo R-Square

Karena regresi ordinal diestimasi via Maximum Likelihood dan bukan meminimumkan jumlah kuadrat error, koefisien determinasi klasik \(R^2\) OLS tidak dapat digunakan. Modul menyediakan kriteria informasi dan tiga formulasi **Pseudo R-Square**:

### Kriteria Informasi AIC & BIC

\[\text{AIC} = -2\ell_{\text{displayed}} + 2K\]
\[\text{BIC} = -2\ell_{\text{displayed}} + K \ln(N)\]

### Cox & Snell Pseudo \(R^2\)

\[R^2_{\text{CS}} = 1 - \left( \frac{L_{\text{null}}}{L_{\text{final}}} \right)^{2/N} = 1 - \exp\left( \frac{2}{N} (\ell_{\text{null}} - \ell_{\text{final}}) \right)\]
Kelemahan ukuran ini adalah nilai maksimum teoritisnya tidak pernah mencapai \(1.0\) (dibatasi oleh \(1 - (L_{\text{null}})^{2/N}\)).

### Nagelkerke (Cragg & Uhler) Pseudo \(R^2\)

Menyesuaikan indeks Cox & Snell agar memiliki skala penuh \([0, 1]\):
\[R^2_{\text{Nagelkerke}} = \frac{R^2_{\text{CS}}}{1 - \exp\left( \frac{2}{N} \ell_{\text{null}} \right)}\]

### McFadden Pseudo \(R^2\)

Berbasis rasio deviasi log-likelihood kernel:
\[R^2_{\text{McFadden}} = 1 - \frac{\ell_{\text{final}}}{\ell_{\text{null}}}\]

---

## Matriks Klasifikasi & Prediksi Probabilitas

### Penentuan Kategori Prediksi

Untuk setiap subpopulasi \(s\) (atau observasi individual \(i\)), modul menghitung vektor peluang kategori:
\[\hat{\boldsymbol{\pi}}_s = [\hat{\pi}_{s1}, \hat{\pi}_{s2}, \dots, \hat{\pi}_{sJ}]\]

Kategori prediksi ditentukan melalui aturan probabilitas posterior maksimum (*maximum a posteriori / modal category rule*):
\[j^*_s = \arg\max_{j \in \{1, 2, \dots, J\}} \hat{\pi}_{sj}\]

### Tabel Informasi Sel & Residual (*Cell Information*)

Untuk setiap sel \((s, j)\), dihitung:
- Frekuensi Teramati: \(O_{sj} = n_{sj}\)
- Frekuensi Ekspektasi: \(E_{sj} = m_s \hat{\pi}_{sj}\)
- Residual Mentah: \(R_{sj} = O_{sj} - E_{sj}\)
- Standardized Residual (Pearson Residual):
  \[SR_{sj} = \frac{O_{sj} - E_{sj}}{\sqrt{E_{sj}}}\]

Nilai \(|SR_{sj}| > 2.0\) atau \(> 3.0\) mengindikasikan ketidaksesuaian model yang signifikan pada subpopulasi tersebut.

---

## Diagnostik Multikolinearitas (VIF & Generalized VIF)

Multikolinearitas antar variabel independen dapat menyebabkan inflasi varians koefisien regresi, menghasilkan standard error semu yang besar, dan memicu ketidakstabilan numerik.

### Variance Inflation Factor (VIF) untuk Kovariat Tunggal

Modul menjalankan regresi linear auxiliary untuk setiap kolom prediktor kontinu terhadap seluruh prediktor lainnya:
\[x_k = \alpha_0 + \sum_{j \ne k} \alpha_j x_j + \varepsilon\]
\[\text{Tolerance}_k = 1 - R_k^2\]
\[\text{VIF}_k = \frac{1}{\text{Tolerance}_k} = \frac{1}{1 - R_k^2}\]

Ambang batas standar:
- \(\text{VIF} < 5\): Tidak ada multikolinearitas yang mengkhawatirkan.
- \(\text{VIF} \ge 10\): Multikolinearitas parah.

### Generalized Variance Inflation Factor (GVIF) untuk Faktor Kategorik

Untuk variabel faktor dengan \(df = L - 1 > 1\), nilai VIF dummy individual tidak invarian terhadap pemilihan kategori referensi. Modul mengimplementasikan **Generalized VIF (Fox & Monette, 1992)**:

\[\text{GVIF} = \frac{\det(\mathbf{R}_{\text{block}}) \cdot \det(\mathbf{R}_{-\text{block}})}{\det(\mathbf{R})}\]
\[\text{Adjusted GVIF} = \text{GVIF}^{\frac{1}{2 \cdot df}}\]

di mana \(\mathbf{R}\) adalah matriks korelasi seluruh prediktor, \(\mathbf{R}_{\text{block}}\) adalah korelasi internal variabel dummy faktor tersebut, dan \(\mathbf{R}_{-\text{block}}\) adalah korelasi prediktor di luar faktor.

**Interpretasi Adjusted GVIF**:
- \(< 2.0\): **Safe** (Aman).
- \(2.0 - 5.0\): **Attention** (Perlu perhatian moderat).
- \(> 5.0\): **Serious Multicollinearity** (Multikolinearitas berat; pertimbangkan penggabungan kategori atau reduksi variabel).

---

# Panduan untuk Pengembang Selanjutnya (Developer Guide)

Bagian ini ditujukan bagi Software Engineer yang akan memelihara, memperluas fitur, atau mengoptimalkan performa modul di masa depan.

## Petunjuk Penambahan Fungsi Link Baru

Jika Anda ingin menambahkan link function baru (misalnya link **Log-Log Alternatif**, **Aranda-Ordaz**, atau **Scobit**), ikuti langkah-langkah berikut:

1. **Tambahkan Varian pada Enum Rust (`frontend/.../rust/src/types/mod.rs`)**:
   ```rust
   #[derive(Clone, Copy, Debug, PartialEq, Eq)]
   pub enum LinkFunction {
       Logit,
       Probit,
       ComplementaryLogLog,
       NegativeLogLog,
       Cauchit,
       CustomNewLink, // <-- Tambahkan varian baru di sini
   }
   ```
2. **Definisikan Formulasi Matematika (`frontend/.../rust/src/model/links.rs`)**:
   Implementasikan fungsi link, invers link, turunan pertama \(f(\eta)\), dan turunan kedua \(f'(\eta)\):
   ```rust
   pub fn link(p: f64, link: LinkFunction) -> f64 {
       match link {
           // ...
           LinkFunction::CustomNewLink => /* rumus g(p) */,
       }
   }

   pub fn inverse_link(eta: f64, link: LinkFunction) -> f64 {
       match link {
           // ...
           LinkFunction::CustomNewLink => /* rumus F(eta) */,
       }
   }

   pub fn d_inverse_link(eta: f64, link: LinkFunction) -> f64 {
       match link {
           // ...
           LinkFunction::CustomNewLink => /* turunan f(eta) */,
       }
   }

   pub fn d2_inverse_link(eta: f64, link: LinkFunction) -> f64 {
       match link {
           // ...
           LinkFunction::CustomNewLink => /* turunan kedua f'(eta) */,
       }
   }
   ```
3. **Daftarkan di Antarmuka TypeScript UI (`OptionsTab.tsx` dan `ordinal.ts`)**:
   Tambahkan opsi pada dropdown UI dan perbarui validasi skema tipe TypeScript.

## Penanganan Isu Stabilitas Numerik

### Pencegahan Overflow / Underflow pada Eksponensial

Fungsi eksponensial standar `x.exp()` dapat menghasilkan `Infinity` jika \(x > 709.78\) atau underflow menjadi \(0.0\) jika \(x < -708.4\). Selalu gunakan fungsi pembungkus aman `safe_exp` yang berlokasi di `frontend/.../rust/src/utils/mod.rs`:

```rust
pub fn safe_exp(x: f64) -> f64 {
    if x > 700.0 {
        1.0142320547350045e304 // e^700
    } else if x < -700.0 {
        0.0
    } else {
        x.exp()
    }
}
```

### Pencegahan Pembagian Nol pada Probabilitas Sel

Saat mengevaluasi \(\ln(\pi_{ij})\) atau pembagian dalam gradien \(\frac{n_{ij}}{\pi_{ij}}\), selalu lakukan pemotongan batas (*clamping*) probabilitas dengan konstanta epsilon \(\varepsilon = 10^{-15}\):

```rust
let prob = if pi[idx] > EPS { pi[idx] } else { EPS };
let term = count * (prob.ln());
```

## Langkah Kompilasi WASM Menggunakan `wasm-pack`

Untuk mengompilasi ulang source code Rust setelah melakukan modifikasi:

### Prasyarat

Pastikan Rust toolchain dan target `wasm32-unknown-unknown` telah terpasang:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### Eksekusi Kompilasi

Navigasi ke direktori Rust modul ordinal:
```bash
cd frontend/components/Modals/Analyze/Regression/Ordinal/rust
wasm-pack build --target web --out-dir pkg --release
```

### Sinkronisasi ke Web Worker

Salin berkas hasil build (`pkg/statify_ordinal.js` dan `pkg/statify_ordinal_bg.wasm`) ke direktori public worker agar dapat diakses oleh Web Worker browser:
```bash
cp -r pkg/* ../../../../../public/workers/Regression/Ordinal/pkg/
```

Untuk pengujian performa dan deteksi memory regression, modul telah dilengkapi dengan rangkaian unit testing komprehensif pada direktori `rust/tests` yang dapat dieksekusi melalui:
```bash
cargo test --release
```

---

# Ringkasan Eksekutif & Glosarium Istilah

| Istilah | Keterangan Singkat |
| :--- | :--- |
| **Cumulative Logit** | Logit dari peluang kumulatif bahwa respon \(Y \le j\). |
| **Cutpoint / Threshold** | Parameter titik belah \(\theta_j$ yang memisahkan kategori respon berdekatan pada kontinum laten. |
| **Proportional Odds** | Asumsi bahwa rasio odds adalah konstan untuk seluruh belahan kategori kumulatif. |
| **Parallel Lines Test** | Uji hipotesis statistik untuk menguji apakah slope prediktor identik di seluruh tingkatan threshold. |
| **Location Model** | Bagian model regresi yang memprediksi pergeseran rata-rata nilai respon laten. |
| **Scale Model** | Bagian model regresi yang memodelkan varians dispersi atau heteroskedastisitas error. |
| **Newton-Raphson** | Metode optimisasi iteratif berbasis turunan tingkat dua (Hessian). |
| **Fisher Scoring** | Varian Newton-Raphson yang mengganti Hessian dengan matriks informasi ekspektasi Fisher. |
| **Step-Halving** | Teknik backtracking untuk memperkecil langkah pembaharuan parameter demi menjamin monotonisitas konvergensi. |
| **Listwise Deletion** | Penanganan data hilang dengan membuang seluruh baris observasi yang memuat setidaknya satu nilai missing. |
| **GVIF** | Generalized Variance Inflation Factor untuk mendeteksi multikolinearitas pada prediktor kategorik bertingkat banyak. |
| **Web Worker** | Thread komputasi latar belakang pada browser untuk mencegah pembekuan antarmuka utama. |
| **WebAssembly (WASM)** | Format instruksi biner portabel berkecepatan tinggi yang memungkinkan eksekusi kode Rust di dalam browser. |

---

*Dokumentasi ini disusun secara komprehensif sebagai referensi rekayasa perangkat lunak dan keilmuan biostatistika Statify Engine.*
