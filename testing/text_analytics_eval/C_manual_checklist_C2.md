# Daftar periksa manual — Menu Naive Bayes (BB-14 s.d. BB-28), Track C2

Dokumen ini dijalankan oleh Yedija di aplikasi Statify yang sedang berjalan (`npm run dev` pada `E:\KULIAH\Skripsi\statify64\frontend`). Kolom **Tangkapan layar** dan **Hasil (Lulus/Gagal)** sengaja dikosongkan; isi setelah menjalankan langkah. Semua skenario pada dokumen ini berstatus **MANUAL — belum dijalankan** sampai kolom Hasil diisi.

Tes otomatis untuk skenario yang sama (Jest dan Rust) dijelaskan pada `C_blackbox_C2.md`. Daftar ini menguji hal yang tidak dapat dipastikan otomatis: tampilan nyata di peramban, unduhan berkas, clipboard, dan alur pengguna dari awal.

## Persiapan umum

1. Jalankan aplikasi, buka di peramban (Chrome/Edge terbaru), dan buka DevTools (F12) tab Console. Catat setiap galat merah pada kolom Catatan.
2. Tersedia dua dataset. Impor lewat menu **File → Import Data → CSV Data**, lalu periksa **Variable View** (jangan lanjut bila tipe salah):

| Kode | Berkas | Isi | Tipe pengukuran yang harus tampil di Variable View |
|---|---|---|---|
| DS-1 | `Claude outputs\pilkada_train.csv` (630 baris; 315 `negative`, 315 `positive`) | `Id`, `Sentiment`, `Pasangan Calon`, `Text Tweet` | `Id` = Scale; `Sentiment` = Nominal; `Pasangan Calon` = Nominal; `Text Tweet` = Nominal (tipe String) |
| DS-2 | `dataset_untuk_text\uji_a2.csv` (5 baris: `x` = 1,1,1,3,5; `kelas` = A,A,A,B,B) | `x`, `kelas` | `x` = Scale (Numeric); `kelas` = Nominal |

3. Ubah pengukuran di Variable View bila impor menebak lain. Bila tipe/ukuran tidak bisa diubah sesuai tabel, hentikan dan catat.
4. Antara dua skenario, bila perlu mulai bersih: tutup panel Naive Bayes, tekan tombol **Reset** di panel, atau impor ulang dataset. Panel ini menyimpan isian terakhir antar-pembukaan.
5. Cara memindahkan variabel pada tab **Variables**: klik nama variabel pada daftar kiri (Ctrl/Shift untuk banyak), lalu klik tombol panah di blok tujuan (tooltip `Move selected to …`), atau seret ke blok tujuan, atau klik ganda variabel di daftar kiri. Tombol **Select All (filtered)** memilih semua variabel di daftar kiri. Tombol panah kiri di blok memindahkan kembali (`Move selected from … back to Available`).
6. Menu: **Analyze → Classify → Naive Bayes**. Tombol di bawah panel: **OK**, **Reset**, **Cancel**.
7. Tangkapan layar: simpan di `testing\text_analytics_eval\screenshots\C2\` (buat foldernya sendiri) dengan nama `BB-xx_<langkah>.png`, dan tulis nama berkas di kolom Tangkapan layar.

Konfigurasi dasar yang sering dipakai disingkat sebagai berikut.

- **Konfigurasi teks (DS-1)**: Target = `Sentiment`; Raw Text Variable = `Text Tweet`; blok Variables to Exclude = `Id` dan `Pasangan Calon` (pilih keduanya di daftar kiri, panah ke Variables to Exclude). Tab Options dan Output biarkan bawaan.
- **Konfigurasi numerik (DS-2)**: Target = `kelas`; blok lain kosong (otomatis `x` menjadi kovariat).

---

## BB-14 — Naive Bayes tanpa Target (F20)

Dataset: DS-2. Harapan prompt: OK nonaktif, pesan validasi. Catatan kode: pesan `Select a target variable.` dibuat oleh hook tetapi tidak dirender (C2-02), jadi pada layar yang diharapkan hanyalah OK nonaktif.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Impor DS-2, buka Analyze → Classify → Naive Bayes. Jangan isi apa pun. | Panel tampil di sidebar kanan dengan tab Variables, Options, Validation, Output (tab Text Preprocessing abu-abu). | | | |
| 2 | Perhatikan tombol OK di bawah panel. | OK nonaktif (abu-abu, tidak dapat diklik). | | | |
| 3 | Cari teks pesan validasi di seluruh panel (semua tab). | Catat apakah ada kalimat penjelas. Menurut kode: tidak ada teks `Select a target variable.` di layar. | | | |
| 4 | Pilih `kelas`, klik panah blok Target / Label. | OK menjadi aktif (`x` otomatis menjadi prediktor). | | | |
| 5 | Pindahkan `kelas` kembali ke daftar kiri. | OK kembali nonaktif. | | | |

## BB-15 — Candidate Factors / Covariates (F21)

Dataset: DS-1.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Target = `Sentiment`. Pindahkan `Id` ke Variables to Exclude. | Variables to Exclude berisi `Id`; `Id` hilang dari daftar kiri. | | | |
| 2 | Pindahkan `Pasangan Calon` ke Candidate Factors / Categorical Features. | Variables to Exclude **kosong**; `Id` kembali ke daftar kiri; Candidate Factors berisi `Pasangan Calon`. | | | |
| 3 | Coba pindahkan `Id` (Scale) ke Candidate Factors. | Ditolak (tidak masuk), biasanya tanpa pesan. | | | |
| 4 | Pindahkan `Id` ke Candidate Covariates / Numerical Features. | Diterima. Pindahkan `Pasangan Calon` ke Candidate Covariates: ditolak. | | | |
| 5 | Klik OK. Buka Output Viewer → Case Processing Summary. | Atribut (attribute variables) hanya `Pasangan Calon` dan `Id`; `Text Tweet` tidak ikut. | | | |

## BB-16 — Raw Text Variable mengaktifkan tab Text Preprocessing (F22, F23)

Dataset: DS-1.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Buka panel baru (Reset). Lihat tab **Text Preprocessing**. | Tab abu-abu (nonaktif); arahkan kursor: tooltip `Available when a Raw Text Variable is set on the Variables tab.` | | | |
| 2 | Pindahkan `Text Tweet` ke Raw Text Variable. | Blok Raw Text Variable berisi `Text Tweet`. | | | |
| 3 | Lihat tab Text Preprocessing lagi, lalu klik. | Tab aktif dan terbuka; isinya pengaturan prapemrosesan teks (sama jenisnya dengan String to Word Vector). | | | |
| 4 | Kembali ke Variables, kosongkan Raw Text Variable (panah kiri). | Tab Text Preprocessing nonaktif lagi dan tampilan kembali ke Variables bila sedang di tab itu. | | | |
| 5 | Isi Raw Text Variable lalu coba pindahkan `Id` (numerik) ke Raw Text Variable. | Ditolak: slot ini hanya untuk variabel String. | | | |

## BB-17 — Complement dengan prediktor numerik/kategorik (F24)

Dataset: DS-1. Catatan kode: pada UI pesan tidak berkode (lihat `C_blackbox_C2.md`); kode `NB_E_COMPLEMENT_MIXED` hanya muncul dari Rust.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Konfigurasi teks (Target `Sentiment`, Raw Text `Text Tweet`, Exclude `Id` dan `Pasangan Calon`). | OK aktif. | | | |
| 2 | Tab Options, bagian Text: pilih **Complement**. | Complement dapat dipilih (model hanya berisi Text Features). | | | |
| 3 | Tab Variables: pindahkan `Pasangan Calon` dari Variables to Exclude kembali ke daftar kiri (berarti menjadi prediktor kategorik). | OK **nonaktif**. | | | |
| 4 | Tab Options, bagian Text. | Teks merah: `Complement is selected, but the model also contains numeric or categorical variables. Choose Multinomial or Bernoulli.` Radio Complement nonaktif. | | | |
| 5 | Arahkan kursor ke Complement. | Tooltip: `Complement is only available when the model contains Text Features only (no numeric or categorical variables).` | | | |
| 6 | Pilih **Multinomial**. | Peringatan hilang; OK aktif lagi. | | | |

## BB-18 — Alpha di luar batas (F24)

Dataset: DS-1, konfigurasi teks.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Options, kolom **Text Alpha (smoothing)**: ketik `0`. | Pesan merah `Text Alpha must be greater than 0`. | | | |
| 2 | Ketik `1000`. | Pesan `Text Alpha must not exceed 999`. | | | |
| 3 | Ketik `999`. | Tidak ada pesan. | | | |
| 4 | Ketik `0` lagi, lalu klik tab Validation dan kembali ke Options. | Menurut kode: nilai tidak sah tidak tersimpan, kolom kembali menampilkan `999` (nilai sah terakhir). Catat apa yang terlihat. | | | |
| 5 | Kolom **Smoothing Alpha**: ketik `0`, lalu `1000`. | `Smoothing Alpha must be greater than 0` dan `Smoothing Alpha must not exceed 999`. | | | |
| 6 | Ketik `0` di Text Alpha lalu langsung klik OK tanpa pindah tab. | Catat: apakah OK aktif, apakah analisis berjalan, dan alpha mana yang dipakai (C2-03: menurut kode OK tetap aktif dan analisis memakai nilai sah terakhir tanpa peringatan). | | | |

## BB-19 — Word-Vector bernilai negatif (F22)

Dataset: DS-2 (`uji_a2.csv`).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Di **Data View**, ubah nilai `x` baris pertama dari `1` menjadi `-1`. | Sel menampilkan -1. | | | |
| 2 | Buka Naive Bayes; Target = `kelas`; pindahkan `x` ke **Word-Vector Variables**. | `x` masuk Word-Vector Variables. Panel menampilkan peringatan non-blokir tentang kebocoran (lihat BB-27). OK aktif (UI tidak memeriksa nilai negatif). | | | |
| 3 | Klik OK. Segera ambil tangkapan layar toast galat. | Toast galat: `Text vector column 'x' contains negative values. Text likelihoods require values >= 0; remove it from Word-Vector Variables. (NB_E_TEXT_NEGATIVE)` — menyebut kolom `x` dan kode. | | | |
| 4 | Periksa Output Viewer. | Tidak ada tabel hasil baru dari run ini. | | | |
| 5 | Kembalikan nilai `x` baris pertama menjadi `1` (diperlukan untuk BB-20 dan BB-27). | Data pulih. | | | |

## BB-20 — Gaussian (Weka min. std) (F25)

Dataset: DS-2 (nilai `x` asli 1,1,1,3,5). Catatan: nilai unik `x` = {1, 3, 5}, sehingga presisi = (5−1)/2 = 2, `min_std` = 1/3, `min_var` = 1/9. Kelas A (semua `x` = 1, varians 0) dinaikkan ke simpangan baku 1/3.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Target = `kelas`. Tab Options, bagian Numeric: pilih **Gaussian (Weka min. std)**. | Radio terpilih. | | | |
| 2 | Tab Validation: Training and Holdout Partition, Training Percentage `70`, centang **Use random seed**, Seed `42`. Klik OK. | Analisis berjalan; toast `Naive Bayes analysis completed. See the results in the Output Viewer.` | | | |
| 3 | Output Viewer → **Attribute Distribution Table**. | Baris `x` dengan Mean dan Std. Dev. per kelas: kelas A mean 1, std ≈ 0,3333; kelas B mean 4, std 1. Catatan di bawah tabel memuat `Numerical likelihood: x: Gaussian with a minimum standard deviation floor (Weka-style); minimum variance = 0.1111…`. | | | |
| 4 | Ulangi dengan opsi **Gaussian** biasa (Options). | Std kelas A hampir 0 (sangat kecil), tidak ada catatan min. std. | | | |
| 5 | Pada run Weka min. std, buka tabel lain. | Confusion Matrix dan Model Evaluation Metrics terisi tanpa NaN. | | | |

## BB-21 — Training Percentage 0 atau 100 (F26)

Dataset: DS-2 atau DS-1 (sembarang konfigurasi sah).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Validation, pilih Training and Holdout Partition. Ketik Training Percentage `0`. Kolom Holdout Percentage (baca saja) diperhatikan. | Perhatikan adanya pesan inline (menurut kode: tidak ada). | | | |
| 2 | Klik tab Options. | Tab **tidak berpindah**; toast `Training percentage must be a whole number between 1 and 99.` | | | |
| 3 | Klik OK. | Toast sama; panel tidak tertutup, analisis tidak berjalan. Catat apakah OK terlihat aktif (menurut kode: aktif; C2-03). | | | |
| 4 | Ulangi dengan `100`. | Hasil sama seperti langkah 2 dan 3. | | | |
| 5 | Ketik `70.5`, lalu `-5`, lalu `150`. | Masing-masing ditolak dengan pesan yang sama. | | | |
| 6 | Ketik `1`, lalu `99`, lalu pindah tab. | Diterima; tab berpindah tanpa pesan. | | | |

## BB-22 — Holdout 70% seed 42 dua kali (F26, F27)

Dataset: DS-1, konfigurasi teks.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Validation: Training and Holdout Partition, Training Percentage `70` (Holdout Percentage otomatis `30`), centang **Use random seed**, Seed `42`. | Kolom terisi sesuai. | | | |
| 2 | Klik OK. Tunggu hingga selesai. Catat dari Output Viewer: Case Processing Summary (baris skenario validasi), Confusion Matrix (empat sel, Total), Overall Accuracy, Cohen's Kappa, F1 per kelas. | Nilai-nilai tercatat (run pertama). | | | |
| 3 | Buka Naive Bayes lagi, konfigurasi tetap (Seed 42, 70%). Klik OK. | Run kedua. | | | |
| 4 | Bandingkan run pertama dan kedua pada semua angka di langkah 2. | **Identik** (sel Confusion Matrix, akurasi, kappa, F1 sama persis). | | | |
| 5 | Ganti Seed menjadi `43`, jalankan. | Angka boleh berbeda (bukan kriteria lulus; hanya konfirmasi seed berpengaruh). | | | |

## BB-23 — Validasi 10-fold (F26, F27)

Dataset: DS-1, konfigurasi teks.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Validation: pilih **Cross-Validation Folds**, Number of Folds `10`, Seed `42`. | Bagian Holdout Settings meredup; Cross-Validation Settings aktif. | | | |
| 2 | Klik OK; tunggu (lebih lama dari holdout karena 10 kali pelatihan). | Analisis selesai. | | | |
| 3 | Case Processing Summary: baris skenario validasi. | Menyebut cross-validation 10 fold dan seed 42. | | | |
| 4 | Confusion Matrix: lihat Total. | Total = **630** (seluruh baris diuji tepat satu kali, bukan sekitar 63); total baris kelas = 315 dan 315. | | | |
| 5 | Hitung manual: jumlah diagonal ÷ 630 dibandingkan Overall Accuracy. | Sama. | | | |

## BB-24 — Fold melebihi anggota kelas terkecil (F26)

Catatan kode: tidak ada kode `NB_E_*` untuk fold (C2-01). Hasil yang diharapkan di bawah mengikuti perilaku kode.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | DS-2 (kelas A = 3 baris, B = 2 baris). Target = `kelas`. Tab Validation: Cross-Validation Folds, Number of Folds `3` (lebih besar dari kelas terkecil = 2, tetapi tidak melebihi 5 baris). Klik OK. | Analisis tetap berjalan dan selesai. Peringatan fold tidak tampil di antarmuka (catat apakah ada). | | | |
| 2 | Ulangi dengan Number of Folds `6` (lebih besar dari 5 baris). Klik OK. | Analisis gagal. Toast galat generik: `The Naive Bayes analysis could not be completed. Check the selected variables and settings, then try again.` (pesan khusus fold tidak sampai ke pengguna pada run tanpa Text). Tidak ada kode `NB_E_`. | | | |
| 3 | DS-1, konfigurasi teks, Cross-Validation Folds, Number of Folds `700` (melebihi 630 baris), Seed `42`. Klik OK. | Analisis gagal dengan toast `Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class.` (run ber-Text membawa pesan fold). Tanpa kode `NB_E_`. | | | |
| 4 | Number of Folds `0`, lalu pindah tab atau klik OK. | Toast `The number of folds must be at least 1.` | | | |

## BB-25 — Output setelah pelatihan (F28)

Gunakan run BB-20 (DS-2, ada kovariat) dan run BB-22 (DS-1, hanya Text) yang sudah ada di Output Viewer.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Run BB-20: lihat seluruh daftar keluaran di Output Viewer. | Berurutan: Case Processing Summary, Attribute Distribution Table, Model Evaluation Metrics, Cohen's Kappa, Confusion Matrix, Export Model. | | | |
| 2 | Case Processing Summary. | Baris `Total Instances` (5), `Valid Instances` (5), `Excluded (Target Missing)` (0), `Target Variable` (`kelas`), `Attribute Variables` (`x`), `Validation Scenario` (holdout 70/30, seed 42). | | | |
| 3 | Confusion Matrix. | Baris = actual, kolom = predicted; ada Total per baris dan kolom, grand total, dan persentase; grand total sama dengan jumlah baris holdout (2 untuk 5 baris pada 70%). | | | |
| 4 | Model Evaluation Metrics. | Per kelas: Accuracy, Precision, Recall, F1-Score; baris macro, weighted, micro average; Overall Accuracy; Cohen's Kappa hanya satu angka. | | | |
| 5 | Run BB-22 (DS-1): Case Processing Summary. | Selain baris di atas, ada baris `Text features` (`Raw text: 'Text Tweet' (N terms)`), `Text likelihood` (Multinomial), dan `Text alpha` (1). | | | |
| 6 | Buka tab Output di panel, hilangkan centang **Confusion Matrix**, jalankan ulang. | Confusion Matrix tidak muncul; tabel lain tetap; Export Model tetap muncul. | | | |

## BB-26 — Download CSV dan Copy Text Feature Table (F29)

Dataset: DS-1, run BB-22 (Text Feature Table dicentang di tab Output; bawaan aktif).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Output Viewer → Text Feature Table. | Tabel per kelas dengan peringkat, term, dan skor (Top-k, bawaan 100), keterangan likelihood Multinomial. | | | |
| 2 | Klik **Download CSV**. | Peramban mengunduh `Naive_Bayes_Text_Features.csv`. | | | |
| 3 | Buka berkas di Excel/Notepad. | Baris pertama `term,class,count,log_weight,probability,score`; karakter Indonesia terbaca benar (BOM UTF-8); jumlah baris data = 2 kelas × jumlah term. | | | |
| 4 | Klik **Copy (TSV)**. | Toast `Table copied as tab-separated text.` | | | |
| 5 | Tempel (Ctrl+V) ke Excel/Notepad. | Kolom terpisah tab dengan enam kolom yang sama dan jumlah baris sama dengan CSV. | | | |

## BB-27 — Peringatan kebocoran jalur Word-Vector (F30)

Dataset: DS-2 dengan nilai `x` asli (1,1,1,3,5; pastikan sudah dikembalikan dari BB-19).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Target = `kelas`. Tab Variables: belum ada Word-Vector. | Tidak ada peringatan kebocoran. | | | |
| 2 | Pindahkan `x` ke **Word-Vector Variables**. | Di bawah panel kanan tampil peringatan: `The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic.` | | | |
| 3 | Klik OK. Buka Case Processing Summary. | Ada baris `Note` dengan kalimat yang sama. | | | |
| 4 | Buka panel lagi, kosongkan Word-Vector Variables. | Peringatan hilang. | | | |
| 5 | DS-1: konfigurasi teks (Raw Text Variable). | Tidak ada peringatan kebocoran pada jalur Raw Text. | | | |

## BB-28 — Export Model (F31)

Dataset: DS-1 (jalur Raw Text) dan DS-2 (jalur Word-Vector).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | DS-1: jalankan konfigurasi teks (holdout 70, seed 42). Di Output Viewer cari **Export Model**. | Kolom `File name` berisi `Naive_Bayes_Model_Export.json` dan tombol **Export Model** aktif. | | | |
| 2 | Klik **Export Model**. | Peramban mengunduh `Naive_Bayes_Model_Export.json`. | | | |
| 3 | Buka berkas di editor teks. Periksa kunci tingkat atas. | `schema_version` = `"2.0"`; `model_type` = `"naive_bayes"`; ada `trained_at`, `target`, `features`, `feature_order`, `validation_config`, `text`. | | | |
| 4 | Periksa blok `text`. | `source` = `"raw"`; `raw_variable` = `"Text Tweet"`; `recipe` berupa objek dengan `recipe_version` `"1.0"`, `vocabulary`, `idf`, `doc_freq` (panjang sama dengan jumlah term), dan `n_docs` = 630. | | | |
| 5 | Ubah nama berkas di kolom File name menjadi `uji_ekspor` lalu Export. | Berkas bernama `uji_ekspor.json` (ekstensi ditambahkan otomatis). | | | |
| 6 | DS-2: jalankan dengan `x` sebagai Word-Vector Variables lalu Export Model; buka JSON. | `schema_version` `"2.0"`, `text.source` = `"vector"`, `text.columns` = `["x"]`, `text.recipe` bernilai `null` (selisih dengan prompt: resep hanya pada jalur Raw Text). | | | |

---

## Rekap hasil

| ID | Hasil (Lulus/Gagal) | Ringkasan temuan |
|---|---|---|
| BB-14 | | |
| BB-15 | | |
| BB-16 | | |
| BB-17 | | |
| BB-18 | | |
| BB-19 | | |
| BB-20 | | |
| BB-21 | | |
| BB-22 | | |
| BB-23 | | |
| BB-24 | | |
| BB-25 | | |
| BB-26 | | |
| BB-27 | | |
| BB-28 | | |
