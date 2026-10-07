# Daftar periksa manual Track C3 — Apply Model (BB-29 sampai BB-35) dan persistensi Naive Bayes (BB-36)

Dokumen ini berisi langkah persis untuk Yedija. Bagian yang bisa diotomatiskan (pesan galat, pemetaan, penamaan kolom, perhitungan WASM, isi tabel Output Viewer, persistensi IndexedDB pada tingkat dialog) sudah diuji oleh `run_C3.ps1`. Yang tercantum di sini adalah bagian yang membutuhkan peramban sungguhan: kotak dialog pemilih berkas, tampilan Data Editor, tampilan Output Viewer, unduhan berkas, dan muat ulang halaman. Kolom Lulus dan Gagal sengaja dibiarkan kosong; isi dengan tanda centang setelah menjalankan. Nama berkas tangkapan layar mengikuti pola `C3-<ID langkah>.png` dan disimpan di `testing/thesis-eval/screenshots/C3/` (buat folder itu bila belum ada).

Semua status di sini adalah **MANUAL — belum dijalankan** sampai Anda mengisinya.

## 0. Persiapan

1. Buka terminal di folder `frontend`, jalankan `npm run dev`, lalu buka `http://localhost:3000` di Chrome (jendela biasa, bukan tamu: IndexedDB harus aktif).
2. Berkas data ada di `testing\thesis-eval\blackbox\data\` (awalan `c3_`):

| Berkas | Isi | Dipakai pada |
|---|---|---|
| `c3_cuaca_latih.csv` | 6 baris (Outlook, Temp, Play) untuk melatih model fitur biasa M1 | M-30, M-31 |
| `c3_cuaca_uji.csv` | dataset uji D3, 6 baris dengan sel kosong, kategori asing `Foggy`, dan kelas Actual asing `Maybe` | M-31, M-33, M-35 |
| `c3_cuaca_tanpa_temp.csv` | hanya kolom Outlook dan Play | M-32 |
| `c3_cuaca_bentrok.csv` | D3 tanpa baris kosong ditambah kolom `NB_PredictedValue` dan `NB_PredictedProbability` | M-34 |
| `c3_teks_latih.csv` | 6 dokumen (Teks, Sentimen) untuk melatih model teks mentah M2 | M-30, M-32 |
| `c3_teks_uji.csv` | 4 dokumen uji, dokumen ke-3 kosong | M-35 |
| `c3_bukan_model.txt`, `c3_bukan_objek.json`, `c3_tanpa_model_type.json`, `c3_model_type_asing.json` | berkas yang harus ditolak | M-29 |

3. Model acuan (sudah ada di repositori, tidak perlu diekspor): `frontend\components\Modals\Analyze\Classify\apply-model\services\__fixtures__\nb-model-v1_1.json` (disebut **D1**) dan `nb-model-v2_0-raw.json` (disebut **R1**, model teks mentah dengan variabel `Teks`, target `Sentimen`).
4. Jalur menu semua dialog: **Analyze → Classify → Naive Bayes** dan **Analyze → Classify → Apply Model**. Impor data: **File → Import Data → CSV Data**. Setiap kali berganti dataset, impor dataset baru (menggantikan yang lama) dan periksa di Variable View.
5. Dua model buatan sendiri, **M1** dan **M2**, diekspor lebih dulu lewat Naive Bayes (langkah 0.A dan 0.B). Letakkan hasil unduhan di folder Downloads dengan nama persis `M1_cuaca.json` dan `M2_teks.json`.

### 0.A Mengekspor M1 (model fitur biasa)

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| 0.A.1 | File → Import Data → CSV Data, pilih `c3_cuaca_latih.csv`, impor. Buka Variable View. | `Outlook` = String, Nominal; `Temp` = Numeric, Scale; `Play` = String, Nominal. | C3-0A1.png | | |
| 0.A.2 | Analyze → Classify → Naive Bayes. Tab Variables: klik dua kali `Play` di daftar variabel tersedia. | `Play` pindah ke Target Variable; `Outlook` dan `Temp` tetap sebagai prediktor bawaan; tombol OK aktif. | C3-0A2.png | | |
| 0.A.3 | Tab Validation: pilih Training and Holdout Partition, Training Percentage 70, centang Use random seed, Seed 42. Tab lain biarkan bawaan. Klik OK. | Dialog menutup; Output Viewer menampilkan hasil Naive Bayes dan tombol **Export Model**. Bila Naive Bayes menolak data sekecil ini, ubah Validation menjadi Cross-Validation Folds dengan 3 lipatan, seed 42, dan catat pesannya di kolom ini. | C3-0A3.png | | |
| 0.A.4 | Di Output Viewer, isi nama berkas `M1_cuaca.json` pada kotak nama, klik Export Model. | Peramban mengunduh `M1_cuaca.json`. Model ini setara D1 (data latih enam baris, kelas No dan Yes, prior 0,5 dan 0,5). | C3-0A4.png | | |

### 0.B Mengekspor M2 (model teks mentah)

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| 0.B.1 | Impor `c3_teks_latih.csv` (menggantikan dataset). | `Teks` dan `Sentimen` bertipe String, Nominal. | C3-0B1.png | | |
| 0.B.2 | Analyze → Classify → Naive Bayes. Tab Variables: klik dua kali `Sentimen` (Target). Klik `Teks` di daftar tersedia lalu klik tombol panah **Move selected to Raw Text Variable**. | `Teks` tampil di zona Raw Text Variable; tab Text Preprocessing menjadi aktif. | C3-0B2.png | | |
| 0.B.3 | Tab Validation: seed 42 (Use random seed dicentang). OK. | Hasil muncul di Output Viewer. Bila muncul galat berkode (misalnya `NB_E_TEXT_EMPTY_VOCAB`), catat teksnya dan lanjutkan memakai R1 sebagai pengganti M2. | C3-0B3.png | | |
| 0.B.4 | Nama berkas `M2_teks.json`, klik Export Model. | `M2_teks.json` terunduh. | C3-0B4.png | | |

## M-29 (BB-29) Berkas bukan model dan berkas lebih dari 10 MB

Prasyarat: dataset apa pun terimpor (mis. `c3_cuaca_uji.csv`). Buka Analyze → Classify → Apply Model, tab **Model**, pilih sumber **Upload file (.json)**.

Membuat berkas besar (di PowerShell, di luar repositori):

```
$p = "$env:TEMP\c3_model_besar.json"
$s = '{"model_type":"naive_bayes","pad":"' + ('x' * 11000000) + '"}'
[System.IO.File]::WriteAllText($p, $s)
```

| ID | Langkah persis | Berkas | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|---|
| M-29a | Klik kontrol pilih berkas. Di dialog Windows ganti filter ke "All files" bila perlu, pilih berkas. | `c3_bukan_model.txt` | Pesan merah "The model content could not be read as valid JSON. (AM_E_PARSE)". Tidak ada kartu Model Summary. Tab Variables, Save, Output tetap abu-abu; OK nonaktif. | C3-M29a.png | | |
| M-29b | Pilih berkas. | `c3_bukan_objek.json` (isi `[1, 2, 3]`) | "The model content must be a JSON object, not an array or a single value. (AM_E_NOT_OBJECT)". Model tidak dipakai. | C3-M29b.png | | |
| M-29c | Pilih berkas. | `c3_tanpa_model_type.json` | "The field "model_type" is missing from the model or is not text. (AM_E_MODEL_TYPE_MISSING)". | C3-M29c.png | | |
| M-29d | Pilih berkas. | `c3_model_type_asing.json` | `The model type "knn" is not supported by Apply Model. (AM_E_MODEL_TYPE_UNSUPPORTED)`. | C3-M29d.png | | |
| M-29e | Pilih berkas besar (sekitar 11 MB). | `%TEMP%\c3_model_besar.json` | "The model file is larger than the 10 MB limit. (AM_E_FILE_TOO_LARGE)". Model tidak dipakai. | C3-M29e.png | | |
| M-29f | Setelah M-29a sampai M-29e, pilih model sah. | D1 (`nb-model-v1_1.json`) | Kartu Model Summary tampil (Algorithm Naive Bayes, Target Play, Classes No, Yes); tab Variables, Save, Output aktif. Lalu ulangi M-29a: pesan galat tampil dan model D1 sebelumnya tidak ikut terpakai. | C3-M29f.png | | |

## M-30 (BB-30) Model dari Output Viewer

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-30a | Muat ulang halaman (F5) sehingga Output Viewer kosong. Impor `c3_cuaca_uji.csv`. Analyze → Classify → Apply Model, tab Model, pilih **From Output Viewer**. | Pesan "No Naive Bayes models are saved in the Output Viewer yet." Tidak ada daftar pilihan. | C3-M30a.png | | |
| M-30b | Lakukan 0.A.1 sampai 0.A.3 sampai Output Viewer berisi hasil Naive Bayes (tanpa harus mengunduh). Lalu impor `c3_cuaca_uji.csv` dan buka Apply Model, pilih **From Output Viewer**. | Kotak pilihan "Output Viewer model" berisi satu butir berlabel waktu latih. | C3-M30b.png | | |
| M-30c | Pilih butir itu. | Kartu Model Summary memuat: Source (Output Viewer), Algorithm Naive Bayes, Target Play, Classes No, Yes, dan fitur Outlook (categorical), Temp (numerical). Tab lain aktif. | C3-M30c.png | | |
| M-30d | Ulangi dengan model teks (lakukan 0.B.1 sampai 0.B.3 tanpa memuat ulang halaman, lalu impor `c3_teks_uji.csv`). | Daftar memuat dua butir (terbaru di atas). Memilih model teks menampilkan Model Summary dengan baris variabel teks `Teks` dan sumber teks `raw`. | C3-M30d.png | | |

## M-31 (BB-31) Auto-map by name

Model: D1 atau M1. Dataset: `c3_cuaca_uji.csv`.

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-31a | Muat D1 (Upload file). Buka tab Variables. | Karena pemetaan otomatis berjalan saat model dimuat, baris Outlook dan Temp sudah terisi; Actual target terisi `Play`. Tidak ada pesan galat. | C3-M31a.png | | |
| M-31b | Ubah manual pilihan baris Temp menjadi `Outlook`. | Variabel `Outlook` dipakai dua fitur sehingga muncul galat `The variable "Outlook" is mapped to more than one feature. (AM_E_MAP_DUPLICATE)`; baris Temp (fitur numerik dipetakan ke variabel nominal) juga dapat menampilkan `AM_E_MAP_ROLE_MISMATCH`. OK nonaktif. | C3-M31b.png | | |
| M-31c | Klik **Auto-map by name**. | Pemetaan menimpa pilihan manual: Temp kembali ke `Temp`, Outlook ke `Outlook`, galat hilang, OK aktif. | C3-M31c.png | | |
| M-31d | Impor `c3_cuaca_tanpa_temp.csv`, buka ulang Apply Model dengan D1, klik Auto-map by name. | Outlook terpetakan; Temp tetap "Not mapped" (galat `AM_E_MAP_UNMAPPED` pada fitur Temp). | C3-M31d.png | | |

## M-32 (BB-32) Variabel model tidak ada di dataset

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-32a | Impor `c3_cuaca_uji.csv`. Muat model teks (R1 atau M2). Tab Variables. | Raw Text Variable menunjukkan "Not mapped" dengan galat `The raw text variable "Teks" is not mapped to a dataset variable. (AM_E_MAP_RAW_TEXT_UNMAPPED)`; tombol OK nonaktif. | C3-M32a.png | | |
| M-32b | Pilih `Outlook` (variabel STRING) pada Raw Text Variable. | Galat hilang; OK aktif (nilai kategori diperlakukan sebagai teks). Pilih `Temp` (numerik) bila tersedia: pesan `AM_E_MAP_RAW_TEXT_TYPE` ("must be mapped to a string variable"). | C3-M32b.png | | |
| M-32c | Impor `c3_cuaca_tanpa_temp.csv`. Muat D1 atau M1. | Fitur Temp "Not mapped", pesan `Feature "Temp" is not mapped to a dataset variable. (AM_E_MAP_UNMAPPED)`; OK nonaktif. | C3-M32c.png | | |
| M-32d | Pada dataset yang sama, buka tab Save lalu kembali ke Variables. | OK tetap nonaktif sampai pemetaan lengkap; tidak ada kolom hasil yang bisa dihasilkan. | C3-M32d.png | | |

Catatan penyimpangan dari tabel prompt: model Word-Vector yang kolomnya tidak ditemukan **tidak** memblokir OK (hanya peringatan). Jika Anda memiliki model Word-Vector dan ingin mengamatinya, muat model itu pada dataset tanpa kolom `VEC_`; yang diharapkan adalah ringkasan "m of V vector columns found; V-m treated as 0." dan OK tetap aktif. Catat hasilnya pada kolom ini.

## M-33 (BB-33) Prediksi dengan Actual target, nilai numerik acuan

Model: D1 (`nb-model-v1_1.json`). Dataset: `c3_cuaca_uji.csv`. Angka acuan dihitung independen dengan `tools/c3_am_oracle.py` (bukan salinan keluaran aplikasi).

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-33a | Impor `c3_cuaca_uji.csv`. Apply Model → Model: Upload file, pilih D1. Variables: Outlook → Outlook, Temp → Temp, Actual target = `Play`. | OK aktif tanpa galat. | C3-M33a.png | | |
| M-33b | Tab Save: centang **Predicted probability for each class**. Klik OK. | Toast "Predictions complete: 5 rows scored. New columns: NB_PredictedValue, NB_PredictedProbability, NB_Probability_No, NB_Probability_Yes." (urutan nama di toast mengikuti urutan kolom). | C3-M33b.png | | |
| M-33c | Buka Data Editor, lihat empat kolom baru di ujung kanan. | Baris 1 sampai 6, `NB_PredictedValue`: No, Yes, Yes, Yes, (kosong), No. `NB_PredictedProbability`: 1, 0,9967, 0,9921, 0,6, (kosong), 1. `NB_Probability_No`: 1, 0,0033, 0,0079, 0,4, (kosong), 1. `NB_Probability_Yes`: 0, 0,9967, 0,9921, 0,6, (kosong), 0. Baris 5 kosong karena semua prediktornya hilang. | C3-M33c.png | | |
| M-33d | Variable View untuk empat kolom baru. | `NB_PredictedValue` bertipe String, Nominal; ketiga kolom probabilitas Numeric, Scale. | C3-M33d.png | | |
| M-33e | Output Viewer: buka tabel Case Processing Summary. | Total Rows 6; Scored 5; Not Scored (All Predictors Missing) 1; Scored with ≥1 Missing Predictor 2; Scored with ≥1 Unseen Category 2; Evaluated 4; Excluded (Actual Missing) 0; Excluded (Actual Class Not in Model) 1. | C3-M33e.png | | |
| M-33f | Tabel Evaluation Metrics dan Cohen's Kappa. | No: accuracy 0,75, precision 1, recall 0,5, F1 0,667. Yes: accuracy 0,75, precision 0,667, recall 1, F1 0,8. Macro Average: 0,833 / 0,75 / 0,733. Micro Average 0,75 / 0,75 / 0,75. Overall Accuracy 0,75. Cohen's Kappa (overall) 0,5. | C3-M33f.png | | |
| M-33g | Tabel Confusion Matrix. | Baris Actual No: 1 ke No, 1 ke Yes; baris Actual Yes: 0 ke No, 2 ke Yes; total kolom No 1, Yes 3, total 4. | C3-M33g.png | | |
| M-33h | Ulangi dari awal (impor ulang `c3_cuaca_uji.csv`) tetapi ubah Actual target menjadi "— None —". | Empat kolom prediksi tetap sama; Case Processing Summary tidak memuat baris Evaluated dan tabel Evaluation Metrics, Cohen's Kappa, Confusion Matrix tidak muncul. | C3-M33h.png | | |
| M-33i | Ulangi dengan **M1** (`M1_cuaca.json`) sebagai pengganti D1. | Seluruh angka M-33c sampai M-33g identik dengan D1 (M1 setara D1). Selisih apa pun, catat di kolom ini bersama baris Model Summary M1. | C3-M33i.png | | |

## M-34 (BB-34) Nama kolom hasil bentrok

Model: D1. Dataset: `c3_cuaca_bentrok.csv` (sudah memiliki `NB_PredictedValue` dan `NB_PredictedProbability`).

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-34a | Impor `c3_cuaca_bentrok.csv`. Apply Model, muat D1, tab Save. | Pada daftar Columns to save, nama akhir `NB_PredictedValue_1` dan `NB_PredictedProbability_1`, ikon peringatan di kedua baris, dan banner "Some column names were adjusted automatically because they conflict with existing names or are invalid." | C3-M34a.png | | |
| M-34b | Klik OK. | Toast "… New columns: NB_PredictedValue_1, NB_PredictedProbability_1." Data Editor memuat empat kolom: dua lama (nilai `x` dan `0` tidak berubah) dan dua baru. | C3-M34b.png | | |
| M-34c | Output Viewer, tabel Saved Variables. | Baris "Predicted value" dan "Max probability" menunjukkan Final Name `NB_PredictedValue_1` dan `NB_PredictedProbability_1`. | C3-M34c.png | | |
| M-34d | Buka Apply Model lagi pada dataset yang sama (setelah M-34b), muat ulang D1 (dataset berubah sehingga form direset), lalu OK. | Nama akhir bersufiks `_2`. Kolom lama dan hasil sebelumnya tidak ditimpa. | C3-M34d.png | | |
| M-34e | Tab Save: ubah Name prefix menjadi `HASIL`. | Nama akhir `HASIL_PredictedValue`, `HASIL_PredictedProbability`; banner peringatan hilang. | C3-M34e.png | | |
| M-34f | Tab Save: centang Use custom names, isi kedua kolom dengan `Hasil` dan `hasil`. | Galat `The column name "hasil" is used more than once among the result columns. (AM_E_NAME_DUPLICATE)` dan OK nonaktif. | C3-M34f.png | | |

## M-35 (BB-35) Isi Output Viewer setelah prediksi

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-35a | Setelah M-33b, buka Output Viewer. | Entri log "Apply Model", analytic "Apply Model Result", dan tabel berurutan: Model Summary, Case Processing Summary, Prediction Distribution, Saved Variables, Evaluation Metrics, Cohen's Kappa, Confusion Matrix. | C3-M35a.png | | |
| M-35b | Tabel Model Summary. | Source "File: nb-model-v1_1.json"; Algorithm Naive Bayes; Schema Version 1.1; Trained At 2026-10-01T00:00:00.000Z; Target Play; Classes No, Yes; dua baris Feature: "Outlook → Outlook (categorical)" dan "Temp → Temp (numerical)"; Smoothing alpha 1; Variance floor 1e-9; Validation (training) "Holdout 70% / 30%, seed 42". | C3-M35b.png | | |
| M-35c | Tabel Prediction Distribution. | No: 2 (40); Yes: 3 (60); Not scored 1; Total 6. | C3-M35c.png | | |
| M-35d | Pada dialog Apply Model tab Output, hilangkan centang Model summary, Evaluation metrics, Confusion matrix; jalankan ulang. | Hanya Case Processing Summary, Prediction Distribution, Saved Variables yang muncul; Saved Variables selalu ada. | C3-M35d.png | | |
| M-35e | Impor `c3_teks_uji.csv`, muat R1 (`nb-model-v2_0-raw.json`), Raw Text Variable `Teks`, Actual `Sentimen`, OK. | `NB_PredictedValue`: pos, neg, (kosong), pos. `NB_PredictedProbability`: 0,8491, 0,7596, (kosong), 0,9906. Model Summary memuat baris Text Variable "Teks → Teks (raw text)", Text source raw, Text likelihood multinomial, Rows with empty text 1. Case Processing Summary: Total Rows 4, Scored 3, Not Scored 1. Prediction Distribution: neg 1 (33,333), pos 2 (66,667), Not scored 1, Total 4. | C3-M35e.png | | |
| M-35f | Evaluasi pada M-35e. | Confusion Matrix: neg→pos 1; pos→neg 1, pos→pos 1. Macro Average 0,25 / 0,25 / 0,25; Overall Accuracy 0,333; Cohen's Kappa −0,5. | C3-M35f.png | | |

## M-36 (BB-36) Menutup dan membuka kembali menu Naive Bayes

Dasar: pengaturan hanya tersimpan saat **OK** ditekan dan validasi lolos (bukan otomatis saat diubah; lihat BUGS_C3.md, C3-01). Pengaturan dibaca lagi saat panel dibuka, dengan syarat daftar variabel (nama, tipe, measure) sama.

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-36a | Impor `c3_cuaca_latih.csv`. Buka Naive Bayes. Target `Play`; tab Options: Smoothing Alpha 0,5; tab Validation: Cross-Validation Folds, Number of Folds 5, Use random seed dicentang, Seed 42; tab Output: matikan Confusion Matrix. Klik OK. | Dialog menutup. Pengaturan disimpan sebelum analisis dijalankan; bila analisis menolak data sekecil ini (enam baris, lima lipatan), catat pesannya dan tetap lanjut ke M-36b. | C3-M36a.png | | |
| M-36b | Buka lagi Analyze → Classify → Naive Bayes (tanpa memuat ulang halaman). | Target `Play` terisi (tidak lagi di daftar tersedia); Smoothing Alpha 0,5; Validation = Cross-Validation Folds, 5, seed 42 dicentang; Confusion Matrix tidak dicentang. | C3-M36b.png | | |
| M-36c | Ubah Smoothing Alpha menjadi 2, klik **Cancel**, buka lagi. | Smoothing Alpha masih 0,5 (perubahan yang dibatalkan tidak tersimpan). | C3-M36c.png | | |
| M-36d | Muat ulang halaman (F5), periksa apakah dataset masih ada, buka Naive Bayes. | Catat dua kemungkinan: (1) dataset masih ada dan pengaturan pulih seperti M-36b; (2) dataset hilang atau berbeda sehingga form kembali ke bawaan (aturan fingerprint dataset). Keduanya sah menurut kode; tulis yang terjadi di kolom ini. | C3-M36d.png | | |
| M-36e | Impor `c3_cuaca_uji.csv` (dataset dengan daftar variabel sama: Outlook, Temp, Play), buka Naive Bayes. | Bila nama, tipe, dan measure variabel sama dengan saat OK terakhir, pengaturan tetap pulih. Lalu impor `c3_teks_latih.csv` dan buka lagi: form kembali ke bawaan (Target kosong, Smoothing Alpha 1, holdout 70). | C3-M36e.png | | |
| M-36f | Klik **Reset**, tutup dengan Cancel, buka lagi. | Seluruh pengaturan bawaan; Reset menghapus penyimpanan. | C3-M36f.png | | |
