# Daftar periksa manual Track F: pengujian integrasi antarmenu (IT-01 sampai IT-05)

Bagian yang dapat diotomatiskan sudah diuji oleh `run_F.ps1` (service, wasm, dan tab Variables Naive Bayes di jsdom; lihat `F_integration.md`). Daftar ini hanya memuat yang membutuhkan peramban sungguhan: dialog menu, pemilih berkas, kartu Model Summary, Output Viewer, unduhan berkas, dan memulai sesi baru. Kolom Lulus dan Gagal sengaja kosong; isi dengan tanda centang setelah menjalankan. Tangkapan layar disimpan di `testing/thesis-eval/screenshots/F/` dengan nama `F-<ID langkah>.png` (buat folder bila belum ada).

Semua status di sini adalah **MANUAL, belum dijalankan** sampai Anda mengisinya.

## 0. Persiapan

1. Terminal di folder `frontend`: `npm run dev`; buka `http://localhost:3000` di Chrome (jendela biasa, IndexedDB aktif).
2. Data: `Claude outputs\pilkada_train.csv` (630 baris) dan `Claude outputs\pilkada_test.csv` (270 baris); kolom `Id`, `Sentiment`, `Pasangan Calon`, `Text Tweet`. Impor lewat File → Import Data → CSV Data. Setiap kali berganti dataset, impor dataset baru (menggantikan yang lama) dan periksa Variable View: `Sentiment`, `Pasangan Calon`, `Text Tweet` bertipe String; `Id` sesuai hasil impor.
3. Pengaturan Naive Bayes untuk jalur teks mentah (K1, bawaan): Target `Sentiment`; `Id`, `Pasangan Calon` dipindah ke Variables to Exclude; `Text Tweet` ke Raw Text Variable; tab Options: likelihood Multinomial, alpha 1; tab Validation: Use random seed dicentang, seed 42. Tab Text Preprocessing tetap bawaan (Words to Keep 1.000).
4. Nilai acuan K1 dari log VM: IT-04 akurasi 0,762963, Kappa 0,525926, Macro F1 0,762963 (`logs/integration_it04_vm.txt`); resubstitusi pada pilkada_train akurasi 0,907937, Kappa 0,815873 (`logs/integration_it03_vm.txt`).

## MF-01 (IT-01): kolom VEC_ dari STWV dipakai sebagai Word-Vector Variables

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| MF-01.1 | Impor `pilkada_train.csv`. Menu Transform → String to Word Vector; pilih `Text Tweet` sebagai variabel teks; biarkan opsi bawaan (Words to Keep 1.000, awalan kolom `VEC_`); OK. | Data Editor bertambah 1.000 kolom (total 1.004). Hampir semua bernama `VEC_<kata>`; satu kolom bernama `VEC` (dari token `&`). | F-MF011.png | | |
| MF-01.2 | Analyze → Classify → Naive Bayes. Tab Variables: ketik `VEC_` pada kotak filter variabel. | Daftar menampilkan 999 variabel (bukan 1.000); kolom `VEC` tidak tampil (temuan F-01). | F-MF012.png | | |
| MF-01.3 | Klik Select All (filtered), lalu tombol panah **Move selected to Word-Vector Variables**. | Zona Word-Vector Variables berisi 999 butir. Di bawah panel tampil peringatan: "The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic." Peringatan tidak memblokir tombol OK. | F-MF013.png | | |
| MF-01.4 | Hapus filter, pindahkan `VEC` ke Word-Vector Variables (agar 1.000 kolom). Target `Sentiment`; `Id`, `Pasangan Calon`, `Text Tweet` ke Variables to Exclude; seed 42; OK. | Output Viewer menampilkan Case Processing Summary dengan baris "Text features" = "Word vectors: 1000 columns" dan baris "Note" yang memuat peringatan di atas. Jumlah term model sama dengan jumlah kolom yang dipindahkan (1.000; bila `VEC` tidak dipindahkan, 999). | F-MF014.png | | |

## MF-02 (IT-02): model Raw Text diekspor dari Naive Bayes lalu dimuat di Apply Model

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| MF-02.1 | Impor `pilkada_train.csv`. Jalankan Naive Bayes dengan pengaturan K1 (Persiapan butir 3). Di Output Viewer, isi nama berkas `F_K1.json`, klik **Export Model**. | Peramban mengunduh `F_K1.json` (sekitar 137 KB). Catat Target, kelas, Text source, Raw text variable dari tabel Naive Bayes. | F-MF021.png | | |
| MF-02.2 | Analyze → Classify → Apply Model, tab Model, pilih **Upload file (.json)**, pilih `F_K1.json`. | Kartu Model Summary tampil: Source "File: F_K1.json", Algorithm Naive Bayes, Schema version 2.0, Target `Sentiment`, Classes `negative, positive`, "Raw text variable: Text Tweet". Semua sama dengan catatan MF-02.1. Tab Variables, Save, Output aktif. | F-MF022.png | | |
| MF-02.3 | Ulangi dengan sumber **From Output Viewer** (tanpa memuat ulang halaman). | Daftar berisi model hasil latih tadi; Model Summary sama dengan MF-02.2 (Source berlabel Output Viewer). | F-MF023.png | | |
| MF-02.4 | Buka tab Variables Apply Model. | Raw Text Variable terisi `Text Tweet` otomatis (auto-map), tidak ada pesan galat. | F-MF024.png | | |

## MF-03 (IT-03): model diterapkan ke data latih yang sama

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| MF-03.1 | Lanjutkan dari MF-02.4 (dataset masih `pilkada_train`). Actual target = `Sentiment`. Tab Save: centang predicted value, max probability, dan class probabilities; OK. | Data Editor menampilkan kolom `NB_PredictedValue`, `NB_PredictedProbability`, `NB_Probability_negative`, `NB_Probability_positive` pada 630 baris. | F-MF031.png | | |
| MF-03.2 | Lihat tabel Apply Model Evaluation Metrics dan Case Processing Summary. | Total Rows, Scored, Evaluated = 630. Overall Accuracy 0,908, Cohen's Kappa 0,816 (3 desimal; nilai K1 resubstitusi). Probabilitas pada Data Editor berupa 4 desimal (pembulatan round4; lihat F-02). | F-MF032.png | | |

## MF-04 (IT-04): latih di pilkada_train, terapkan di pilkada_test

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| MF-04.1 | Sesudah MF-02.1 (model K1 ada di Output Viewer), impor `pilkada_test.csv` (menggantikan dataset). Apply Model: From Output Viewer (atau `F_K1.json`), Actual target `Sentiment`, class probabilities dicentang; OK. | Kolom NB_ terisi pada 270 baris. | F-MF041.png | | |
| MF-04.2 | Lihat tabel evaluasi. | Total Rows, Scored, Evaluated = 270. Overall Accuracy 0,763, Cohen's Kappa 0,526, Macro Average F1 0,763 (3 desimal), sama dengan scikit-learn (Track D `D_accuracy.md`) dan `logs/integration_it04_vm.txt`. Catatan: akurasi holdout 30% yang dilaporkan Naive Bayes saat melatih (sekitar 0,697) adalah angka lain. | F-MF042.png | | |
| MF-04.3 | Bandingkan kelas prediksi dengan `testing/thesis-eval/accuracy/out/pred_statify_K1.csv` (urutan baris sama). | Kolom `NB_PredictedValue` sama pada 270 baris (boleh dicek dengan mengekspor dataset ke CSV dan membandingkan di Excel). | F-MF043.png | | |

## MF-05 (IT-05): simpan model ke berkas, buka sesi baru, muat, terapkan

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| MF-05.1 | Simpan hasil MF-04.2 (catat akurasi, Kappa, dan lima baris pertama kolom NB_PredictedValue serta NB_Probability_positive). Tutup tab peramban seluruhnya. | - | F-MF051.png | | |
| MF-05.2 | Buka peramban baru (jendela baru), `http://localhost:3000`, impor `pilkada_test.csv`. Apply Model → Upload file (.json) → `F_K1.json` (berkas hasil MF-02.1, tanpa melatih ulang). Pengaturan seperti MF-04.1. | Model Summary sama dengan MF-02.2. Satu-satunya pembawa model antar-sesi adalah berkas. | F-MF052.png | | |
| MF-05.3 | Bandingkan dengan MF-05.1. | Kelas dan probabilitas identik dengan MF-04: akurasi 0,763 dan Kappa 0,526 sama, lima baris pertama sama persis. | F-MF053.png | | |
