# Acuan SPSS untuk GLM Multivariate

Folder ini menyiapkan validasi numerik modul GLM Multivariate Statify terhadap IBM SPSS Statistics 27. Isinya lima prosedur: satu populasi, dua populasi, berpasangan, One-Way MANOVA, dan Two-Way MANOVA. Pola kerjanya sama dengan `testing/glm-rm-reference/`.

Selama validasi, kode modul Multivariate dibekukan. Folder ini hanya berisi data, sintaks SPSS, keluaran SPSS, dan (nanti) harness pembanding.

```
data/          lima .sav asli (salinan byte-identik) + versi .csv
sav_to_csv.R   konversi .sav -> .csv tanpa mengubah nilai
make_derived.R dataset turunan mv6 dan mv7 (.sav + .csv) untuk validasi lanjutan
spss/          sintaks SPSS per prosedur (mv1..mv5; mv6, mv7 validasi lanjutan)
spss-output/   keluaran SPSS .xlsx (diisi oleh pengguna)
results/       hasil perbandingan (Langkah 3-5)
```

## 1. Dataset

Kelima berkas berasal dari folder `topik baru statify/dataset/`. Berkas di `data/` adalah salinan byte-identik (diperiksa dengan `cmp`). Setiap berkas CSV dibuat oleh `sav_to_csv.R`:

- setiap nilai ditulis dalam representasi desimal terpendek yang kembali tepat ke nilai double aslinya;
- skrip memverifikasi round-trip (`stopifnot`);
- sel system-missing ditulis kosong;
- tidak ada nilai yang diubah, dan tidak ada baris yang dihapus.

Tidak ada berkas yang memiliki definisi user-missing.

| Berkas | Prosedur | Baris (lengkap) | Variabel | Sumber tercatat |
|---|---|---|---|---|
| `hotelling 1 populasi.sav` | Uji Vektor Rata-rata Satu Populasi | 32 (32) | mpg, disp, hp, wt, d_mpg, d_disp, d_hp, d_wt | mtcars (Motor Trend 1974), Modul 3 APG |
| `hotelling 2 populasi independen.sav` | Uji Perbedaan Vektor Rata-rata Dua Populasi | 67 (64) | x1, x2, x3, x4, jk (1 = laki-laki, 2 = perempuan) | Modul 4 APG bagian C |
| `hotelling berpasangan (data asli).sav` | Uji Berpasangan | 15 (15) | lokasi, kedalaman1, ukuran1, kedalaman2, ukuran2, kd, uk | Modul 4 APG |
| `one-way manova.sav` | One-Way MANOVA | 8 (8) | treatment (1-3, label "treatment k"), y1, y2 | Modul 5 APG Contoh 2 (lihat pemeriksaan di bawah) |
| `two-way manova.sav` | Two-Way MANOVA | 32 (32) | Y1A1 ("ultimate torque"), Y2A1 ("ultimate strain"), faktorA (1 = A1, 2 = A2), faktorB (1-4 = B1-B4) | Modul 6 APG; sumber asli Posten (1962), dianalisis oleh Kramer dan Jensen (1970) |

Catatan per berkas:

- **Satu populasi.** Kolom `d_*` bernilai x − (20, 200, 150, 3,0). Kolom ini tidak dipakai sebagai input Statify, karena Statify menerima variabel asli beserta Test Values.
- **Berpasangan.** Kolom `kd` = kedalaman1 − kedalaman2 dan `uk` = ukuran1 − ukuran2 (selisih yang sudah dihitung di berkas). Tidak dipakai sebagai input.
- **One-way.** Isinya diperiksa terhadap daftar pengamatan (treatment; y1, y2) 1;9,3 | 1;6,2 | 1;9,7 | 2;0,4 | 2;2,0 | 3;3,8 | 3;1,9 | 3;2,7. Kedelapan pengamatan **cocok persis**, dalam urutan dan nilai yang sama. Ukuran grup: n = 3, 2, 3.

### Baris kosong pada data dua populasi

Berkas dua populasi berisi 3 baris kosong di akhir, yaitu baris 65-67 (semua sel system-missing). Baris itu **tidak dihapus**, baik di .sav maupun di .csv. Di .csv ketiganya tertulis sebagai `,,,,`.

- **SPSS.** `GET FILE` membaca 67 kasus, dan ketiga baris itu bernilai system-missing. GLM memakai `/MISSING=EXCLUDE` (bawaan): kasus dengan nilai hilang pada DV atau faktor dikeluarkan secara listwise, sehingga N = 64.
- **Statify, impor CSV.** Baris `,,,,` tetap dimuat sebagai baris sel kosong ([csvWorker.js:47](../../frontend/public/workers/DataManagement/csvWorker.js#L47) hanya melewati baris yang kosong setelah di-trim). Saat analisis dijalankan, `getSlicedData` ([useVariable.ts:73](../../frontend/hooks/useVariable.ts#L73)) hanya mengirim baris sampai `getMaxIndex`, yaitu baris terakhir yang masih punya data pada variabel terpilih. Baris 65-67 tidak ikut dikirim ke WASM, sehingga N = 64.
- **Batas mekanisme ini.** Perlakuan di Statify ini adalah **pemotongan baris kosong di ujung**, bukan listwise deletion. Rust MV (`merge_records`, `rust/src/stats/common.rs`) tidak membuang kasus yang hilang di tengah data. Untuk berkas ini hasilnya tetap sama dengan SPSS, karena ketiga baris kosong berada di akhir. N = 64 akan diverifikasi pada Langkah 3 lewat tabel Between-Subjects Factors dan Descriptive Statistics.

### Format data berpasangan

Yang dipakai adalah format **lebar** (`hotelling berpasangan (data asli).sav`): satu baris per lokasi, dengan pengukuran pelapis 1 dan pelapis 2 sebagai kolom terpisah. Alasannya:

- Dialog **Paired** di Statify menerima pasangan variabel [v1, v2].
- `buildDifferenceData` (`services/paired-difference.ts`) menghitung d = v1 − v2 **per baris**, lalu menjalankan uji Test Values (intercept-only) pada d. Karena itu, kedua anggota pasangan harus berada di baris yang sama.

Versi bertumpuk (`(data edit).sav`, 30 baris dengan kolom jenis pelapis) tidak bisa dimasukkan ke dialog Paired. Versi itu juga akan diperlakukan sebagai dua sampel independen, bukan berpasangan. Berkas itu tidak disalin.

### Dataset turunan untuk validasi lanjutan (mv6, mv7)

Dua dataset dibuat dari dataset di atas dengan `make_derived.R` (haven; `.sav` dengan label variabel dan label nilai, `.csv` dengan nilai persis). Skrip memverifikasi bahwa hanya baris atau sel yang disebut di bawah yang berubah.

| Berkas | Prosedur | Baris (lengkap) | Diturunkan dari | Perubahan |
|---|---|---|---|---|
| `two-way manova tak seimbang.sav` | Two-Way MANOVA tak seimbang (mv6) | 26 (26) | `two-way manova.sav` | Kasus 4, 11, 12, 21, 26, 31 (nomor kasus asli) dihapus. Ukuran sel faktorA × faktorB: A1 = 3, 4, 2, 4; A2 = 4, 3, 3, 3. Tidak ada sel kosong. |
| `hotelling 2 populasi independen dengan nilai hilang.sav` | One-Way MANOVA dua grup dengan nilai hilang di tengah (mv7) | 67 (62) | `hotelling 2 populasi independen.sav` | x2 kasus 15 (jk = 1, semula 18) dan x4 kasus 45 (jk = 2, semula 28) dikosongkan (system-missing). Baris lain tidak berubah, termasuk 3 baris kosong di akhir. |

Kasus yang dihapus pada mv6 (Y1A1, Y2A1, faktorA, faktorB):

| Kasus | Y1A1 | Y2A1 | faktorA | faktorB |
|---|---|---|---|---|
| 4 | 7,82 | 88,8 | 1 | 1 |
| 11 | 7,75 | 90,2 | 1 | 3 |
| 12 | 7,8 | 88 | 1 | 3 |
| 21 | 8,19 | 66 | 2 | 2 |
| 26 | 7,15 | 72 | 2 | 3 |
| 31 | 7,52 | 86,4 | 2 | 4 |

mv4 tidak dipakai sebagai dasar mv7 karena hanya 8 baris, dan grup 2-nya berisi n = 2: satu sel kosong akan menyisakan satu kasus di grup itu.

## 2. Pemetaan konfigurasi Statify ↔ SPSS

Pengaturan yang sama untuk kelima prosedur:

| | Statify | SPSS |
|---|---|---|
| Model | Model = Full factorial, Sum of squares = Type III, Include intercept aktif | `/METHOD=SSTYPE(3) /INTERCEPT=INCLUDE` |
| Options | Descriptive statistics, Estimates of effect size, Observed power, dan Homogeneity tests dicentang. Significance level 0,05. | `/PRINT=DESCRIPTIVE ETASQ OPOWER [HOMOGENEITY] /CRITERIA=ALPHA(.05)` |

Homogeneity tests hanya dicentang, dan `HOMOGENEITY` hanya diminta, untuk desain yang punya faktor (mv2, mv4, mv5, mv6, mv7). Pada desain intercept-only tidak ada grup untuk diuji.

| # | Prosedur | Konfigurasi Statify | Perintah SPSS setara | Sintaks |
|---|---|---|---|---|
| 1 | Satu populasi | Dependent Variables: mpg, disp, hp, wt. Fixed Factor: kosong. Tombol **Test Values**: μ₀ = 20, 200, 150, 3 | Model intercept-only pada selisih terhadap vektor uji: `COMPUTE x_mu0 = x − μ₀`, lalu `GLM mpg_mu0 disp_mu0 hp_mu0 wt_mu0`. Intercept menguji H0: E[x − μ₀] = 0. Mean mentah diambil dari `MEANS TABLES=mpg disp hp wt`. | `spss/mv1_satu_populasi.sps` |
| 2 | Dua populasi | Dependent Variables: x1, x2, x3, x4. Fixed Factor: jk. Varians: **Equal (Pooled estimate of Σ)** (bawaan) | `GLM x1 x2 x3 x4 BY jk /DESIGN=jk`. Efek jk adalah uji T² dua sampel, karena dengan 2 grup keempat statistik multivariat setara. | `spss/mv2_dua_populasi.sps` |
| 3 | Berpasangan | Tombol **Paired**: pasangan (kedalaman1, kedalaman2) dan (ukuran1, ukuran2), δ₀ = 0, 0. Fixed Factor: kosong. | Model intercept-only pada variabel selisih: `COMPUTE d_kedalaman = kedalaman1 − kedalaman2`, `d_ukuran = ukuran1 − ukuran2`, lalu `GLM d_kedalaman d_ukuran` | `spss/mv3_berpasangan.sps` |
| 4 | One-Way MANOVA | Dependent Variables: y1, y2. Fixed Factor: treatment | `GLM y1 y2 BY treatment /DESIGN=treatment` | `spss/mv4_one_way.sps` |
| 5 | Two-Way MANOVA | Dependent Variables: Y1A1, Y2A1. Fixed Factor: faktorA, faktorB | `GLM Y1A1 Y2A1 BY faktorA faktorB /DESIGN=faktorA faktorB faktorA*faktorB` | `spss/mv5_two_way.sps` |
| 6 | Two-Way MANOVA tak seimbang | sama dengan 5, data `two-way manova tak seimbang` | sama dengan 5 | `spss/mv6_two_way_tak_seimbang.sps` |
| 7 | One-Way MANOVA, nilai hilang | sama dengan 2 (Fixed Factor jk, Pooled), data `hotelling 2 populasi independen dengan nilai hilang` | `GLM x1 x2 x3 x4 BY jk /DESIGN=jk` (listwise: N = 62) | `spss/mv7_one_way_nilai_hilang.sps` |

Mode varians **Unequal (Welch-Satterthwaite)** (Krishnamoorthy-Yu) tidak punya padanan di SPSS GLM, jadi tidak divalidasi di sini.

### Tabel yang dibandingkan

Tabel yang dihasilkan Statify:

1. Between-Subjects Factors
2. Descriptive Statistics
3. Box's Test of Equality of Covariance Matrices
4. Levene's Test of Equality of Error Variances
5. Multivariate Tests
6. Tests of Between-Subjects Effects

Padanannya di SPSS diminta lewat sintaks di atas:

| Tabel | Opsi SPSS |
|---|---|
| Between-Subjects Factors | otomatis bila ada faktor |
| Descriptive Statistics | `DESCRIPTIVE` |
| Box's Test, Levene's Test | `HOMOGENEITY` |
| Multivariate Tests | otomatis untuk ≥ 2 DV |
| Tests of Between-Subjects Effects | otomatis; eta kuadrat parsial dari `ETASQ`, noncentrality dan observed power dari `OPOWER` |

Perbedaan penyajian yang sudah diketahui sebelum perbandingan (bukan hasil uji):

- **Satu populasi dan berpasangan.** SPSS tidak menampilkan Between-Subjects Factors karena tidak ada faktor. Descriptive Statistics GLM SPSS memuat mean selisih (x − μ₀), sedangkan Statify menampilkan mean variabel asli. Karena itu, mean dan SD variabel asli diambil dari tabel `MEANS`. Baris *Total* pada Tests of Between-Subjects Effects SPSS dihitung dari selisih, jadi perlu diperiksa apakah Statify menghitungnya dari data asli atau dari selisih.
- **One-way.** Grup terkecil n = 2 dengan p = 2. Box's M kemungkinan tidak dapat dihitung SPSS, karena matriks kovarians grup 2 singular. Keluarannya dicatat apa adanya.

## 3. Cara menjalankan di SPSS

1. Buka setiap berkas `spss/mv*.sps` di SPSS 27 (File > Open > Syntax), lalu **Run > All**.
2. Setiap sintaks melakukan `GET FILE` pada .sav di `data/`, membuat jendela output baru, lalu mengekspor seluruh output ke `spss-output/<nama>.xlsx`:
   - `mv1_satu_populasi.xlsx`
   - `mv2_dua_populasi.xlsx`
   - `mv3_berpasangan.xlsx`
   - `mv4_one_way.xlsx`
   - `mv5_two_way.xlsx`
   - `mv6_two_way_tak_seimbang.xlsx`
   - `mv7_one_way_nilai_hilang.xlsx`
3. Path di sintaks adalah path absolut repositori ini (`D:\0.POLTSTAT STIS\...\statify64\...`). Sesuaikan bila repositori ada di tempat lain.
4. Jangan menyimpan dataset yang dibuka sintaks. Variabel `*_mu0` dan `d_*` hanya dibuat di sesi SPSS, dan berkas .sav di `data/` harus tetap identik dengan aslinya.

## 4. Hasil

Hasil validasi ada di [`results/spss-validation/README.md`](results/spss-validation/README.md). Isinya: alur, hasil per tabel, selisih maksimum, diagnosis selisih, dan bagian yang belum dicakup.

Harness yang dipakai:

| Berkas | Fungsi |
|---|---|
| `harness/ui-run.cjs` | Menjalankan konfigurasi lewat dialog asli (mode worker, build produksi) |
| `harness/spss_extract.py` | Mengekstrak nilai acuan dari xlsx SPSS |
| `harness/compare-spss.mjs` + `harness/mapping.mjs` | Membandingkan Statify dengan SPSS |
| `harness/make-fixture.mjs` | Membuat fixture uji acuan Jest `multivariate/__test__/multivariate-reference.test.ts` |
