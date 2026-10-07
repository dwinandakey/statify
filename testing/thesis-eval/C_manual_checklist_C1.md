# Daftar periksa manual Track C1 — String to Word Vector (BB-01 sampai BB-13)

Daftar ini dijalankan sendiri oleh Yedija pada aplikasi Statify yang sungguhan (WASM nyata, Data Editor, Variable View, Output Viewer). Seluruh sel "Tangkapan layar" dan "Lulus/Gagal" sengaja dikosongkan. Nilai yang tertulis pada kolom "Hasil yang harus terlihat" berasal dari kode sumber dan dari acuan independen Python (`logs/reference_bb02.txt`, `logs/reference_bb_c1_extra.txt`); bila yang terlihat berbeda, tulis apa adanya pada kolom Catatan dan jangan disesuaikan. Status semua butir saat ini: **MANUAL — belum dijalankan**.

## Identitas pengujian

| Isian | Nilai |
|---|---|
| Tanggal dan jam | |
| Penguji | Yedija |
| Perangkat | Lenovo IdeaPad Gaming 3 15ARH05, Ryzen 5 4600H, RAM 16 GB, Windows 11 Home 64-bit |
| Peramban (nama dan versi lengkap) | |
| Commit/branch yang diuji | |
| Hasil `run_C1.ps1` (rust_exit, jest_exit) | |

## Persiapan (sekali di awal)

| No | Langkah | Hasil yang harus terlihat | Selesai |
|---|---|---|---|
| P1 | Pastikan WASM STWV sudah dibangun: di PowerShell jalankan `cd frontend\components\Modals\Transform\StringToWordVector\rust` lalu `wasm-pack build --target web --out-dir ../wasm-output --release` (lewati bila `wasm-output\statify_string_to_word_bg.wasm` sudah ada). | Perintah selesai tanpa galat; berkas `statify_string_to_word_bg.wasm` ada di `wasm-output`. | |
| P2 | Jalankan aplikasi: `cd frontend` lalu `npm run dev`. | Terminal menampilkan alamat lokal (biasanya http://localhost:3000). | |
| P3 | Buka alamat itu di peramban, lalu masuk ke halaman dasbor (Data Editor di `/dashboard/data`, Variable View di `/dashboard/variable`, Output Viewer di `/dashboard/result`). | Data Editor kosong tampil dan menu File, Edit, ..., Transform, Analyze ada di bilah atas. | |
| P4 | Catat nama dan versi peramban pada tabel identitas. | | |

Berkas data yang dipakai (semua di dalam repo):

| Berkas | Isi | Dipakai untuk |
|---|---|---|
| `testing/thesis-eval/blackbox/data/c1_korpus_D.csv` | kolom `teks`, 3 baris: "Saya suka makan nasi", "Saya tidak suka nasi!", "Makan, makan, makan" | M-02, M-03, M-04, M-05, M-06, M-07, M-09, M-11, M-13 |
| `testing/thesis-eval/blackbox/data/c1_korpus_D_sel_kosong.csv` | kolom `id`, `teks`, 5 baris; baris 2 kosong, baris 4 hanya spasi | M-12 |
| `testing/thesis-eval/blackbox/data/c1_variabel_campuran.csv` | kolom `id`, `teks`, `jenis`, `kelas`, `skor` | M-01 |
| `dataset_untuk_text/dataset_indonesia_testing.csv` | kolom `teks_indo`, 10 baris (baris 8 hanya spasi) | M-08 (Sastrawi) |
| `dataset_untuk_text/dataset_inggris_testing.csv` | kolom `teks_en`, 10 baris | M-08 (Porter), M-10 |

Cara mengimpor: menu **File → Import Data → CSV Data**, pilih berkas, aktifkan pengaturan bahwa baris pertama berisi nama variabel (bila ada pilihannya), lalu selesaikan impor. Setiap butir di bawah dimulai dari dataset segar: impor ulang berkas (atau buka lembar baru) agar kolom `VEC_` dari butir sebelumnya tidak ikut terbawa; bila terbawa, nama kolom baru akan mendapat akhiran `_1` dan hasil sulit dibaca. Tangkapan layar diberi nama `M-xx-n.png` sesuai nomor langkah.

---

## M-01 (BB-01) Membuka Transform → String to Word Vector

Data: `c1_variabel_campuran.csv`. Setelah impor, buka Variable View dan atur: `id` = Scale, `teks` = tipe String (Nominal), `jenis` = tipe String (Nominal), `kelas` = Numeric dengan Measure **Nominal**, `skor` = Scale. Catat Type dan Measure tiap variabel pada kolom Catatan langkah 1.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Periksa Variable View untuk lima variabel di atas. | — | Tipe dan Measure sesuai pengaturan di atas. | | | |
| 2. Klik menu **Transform → String to Word Vector**. | — | Panel "String to Word Vector" terbuka (di sisi kanan atau sebagai dialog) dengan dua tab: **Variables** dan **Options**. Di bawahnya ada tombol OK, Reset, Cancel. | | | |
| 3. Pada tab Variables, lihat daftar "Variables:". | — | Hanya `teks`, `jenis`, dan `kelas` yang tampil. `id` dan `skor` (skala) tidak tampil. Kotak "Target Variable:" menampilkan "Select one variable...". | | | |
| 4. Periksa tombol OK sebelum memilih variabel. | — | OK nonaktif (abu-abu). | | | |
| 5. Klik `teks`, lalu klik tombol panah `>` di sebelah Target Variable. | `teks` | `teks` pindah ke Target Variable dan hilang dari daftar kiri; OK menjadi aktif. | | | |
| 6. Klik tab **Options**. | — | Bagian berikut terlihat berurutan: Vector Column Name (berisi `VEC_`), Text Preprocessing (Lowercase tercentang), Stopwords Removal, Stemming, Tokenizer, Delimiters, Vectorization Method (Formula standard Weka terpilih), Words to Keep (1000), Min term frequency (1). | | | |
| 7. Klik **Reset**. | — | Kembali ke tab Variables; Target Variable kosong; OK nonaktif. | | | |
| 8. Klik **Cancel**. | — | Panel tertutup tanpa menambah kolom. | | | |

## M-02 (BB-02) Default Weka pada korpus acuan

Data: `c1_korpus_D.csv` (variabel `teks`, 3 baris).

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Impor `c1_korpus_D.csv`. | — | Data Editor memuat 3 baris pada kolom `teks`. | | | |
| 2. **Transform → String to Word Vector**, pilih `teks` sebagai Target Variable. | `teks` | OK aktif. | | | |
| 3. Biarkan semua opsi bawaan (jangan ubah apa pun di tab Options). | — | Weka, Word count, IDF None, Normalization None, Words to Keep 1000, Min term frequency 1. | | | |
| 4. Klik **OK**. | — | Muncul indikator "Processing..." sebentar, notifikasi "5 vector columns were added to the dataset.", dan panel tertutup. | | | |
| 5. Lihat Data Editor. | — | Lima kolom baru di sebelah kanan `teks`, berurutan: `VEC_makan`, `VEC_nasi`, `VEC_saya`, `VEC_suka`, `VEC_tidak`. Baris 1: 1, 1, 1, 1, 0. Baris 2: 0, 1, 1, 1, 1. Baris 3: 3, 0, 0, 0, 0. | | | |
| 6. Buka Variable View untuk lima kolom itu. | — | Type Numeric, Decimals 0, Measure Scale, Label berbentuk `Vector of "makan"` dan seterusnya. | | | |

## M-03 (BB-03) Vector Column Name tidak sah

Data: `c1_korpus_D.csv`. Pilih `teks` sebagai Target Variable lalu buka tab **Options**; kolom "Vector Column Name" berisi `VEC_`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Hapus isi kolom, ketik awalan berangka. | `1VEC_` | Tulisan merah di bawah kolom: "Vector column name must start with a letter, @, # or $." Garis kolom merah. Tombol OK nonaktif. | | | |
| 2. Pindah ke tab Variables (tanpa memperbaiki awalan). | — | Di bagian bawah panel muncul kotak merah berjudul "Some options are invalid:" (temuan C1-02: kotak ini tidak memuat rincian pesan). OK tetap nonaktif. Catat apakah ada rincian pesan. | | | |
| 3. Kembali ke Options, hapus isi kolom, ketik 40 huruf `A` (atau tempel teks 40 karakter). | `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` | Kolom hanya menyimpan 32 karakter (sisanya tidak dapat diketik); tidak ada pesan galat; OK aktif. Hitung panjang teks yang tersisa. | | | |
| 4. Ketik awalan berspasi. | `VEC kata` | "Vector column name cannot contain spaces." OK nonaktif. | | | |
| 5. Ketik awalan bersimbol terlarang. | `VEC-` | "Vector column name can only contain letters, digits, periods, underscores, @, # and $." OK nonaktif. | | | |
| 6. Kosongkan kolom. | (kosong) | "Vector column name cannot be empty." OK nonaktif. | | | |
| 7. Ketik awalan sah lalu klik OK. | `TKS_` | Pesan merah hilang, OK aktif; setelah OK kolom bernama `TKS_makan`, `TKS_nasi`, `TKS_saya`, `TKS_suka`, `TKS_tidak`. | | | |

## M-04 (BB-04) n-gram min=1 max=2

Data: `c1_korpus_D.csv`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks`; Options → Tokenizer: pilih **N-gram**. | — | Kolom "max size" dan "min size" menjadi aktif (tidak lagi redup). | | | |
| 2. Isi max size dan min size. | max size `2`, min size `1` | Tidak ada pesan galat; OK aktif. | | | |
| 3. Klik **OK**. | — | Notifikasi "12 vector columns were added to the dataset." | | | |
| 4. Lihat nama kolom di Data Editor. | — | Berurutan: `VEC_makan`, `VEC_makan_makan`, `VEC_makan_nasi`, `VEC_nasi`, `VEC_saya`, `VEC_saya_suka`, `VEC_saya_tidak`, `VEC_suka`, `VEC_suka_makan`, `VEC_suka_nasi`, `VEC_tidak`, `VEC_tidak_suka`. (Spasi pada bigram diganti garis bawah oleh aplikasi; catat bila namanya berbeda.) | | | |
| 5. Lihat nilai baris. | — | Baris 1: 1 0 1 1 1 1 0 1 1 0 0 0. Baris 2: 0 0 0 1 1 0 1 1 0 1 1 1. Baris 3: 3 2 0 0 0 0 0 0 0 0 0 0. | | | |
| 6. Buka Output Viewer, tabel Vocabulary. | — | Kolom Term memuat 12 term (5 unigram, 7 bigram dengan spasi, mis. "makan makan"); kolom Dataset Column memuat nama yang sama dengan langkah 4. | | | |

## M-05 (BB-05) n-gram tidak sah

Data: `c1_korpus_D.csv`; pilih `teks`, Options → Tokenizer **N-gram**.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Isi max size lalu min size. | max size `2`, min size `3` | Kotak merah "Some options are invalid:" berisi "N-gram min size cannot be greater than max size." OK nonaktif. | | | |
| 2. Perbaiki min size. | min size `1` | Pesan hilang, OK aktif. | | | |
| 3. Isi max size lebih dari 5. | max size `6` | Kolom berubah menjadi `5` (dipotong otomatis); tidak ada pesan; OK aktif. (Berbeda dari tabel prompt, yang mengharapkan pesan; catat apa yang terlihat.) | | | |
| 4. Isi max size `0`, lalu `-3`, lalu kosongkan. | `0`, `-3`, (kosong) | Kolom berubah menjadi `1` untuk setiap kasus (dipotong ke batas bawah); tidak ada pesan. | | | |

## M-06 (BB-06) Delimiters regex tidak valid

Data: `c1_korpus_D.csv`; pilih `teks`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Options → kolom Delimiters: hapus isi, ketik regex tak lengkap. | `[(` | Tidak ada pesan galat selama mengetik; OK tetap aktif. | | | |
| 2. Klik **OK**. | — | Kotak merah di bawah panel berisi kalimat yang diawali "The delimiter regex pattern is invalid: regex parse error: ..." dan berakhir " (INVALID_REGEX)". Panel tetap terbuka; tidak ada kolom `VEC_` baru; tidak ada item baru di Output Viewer. Salin kalimat lengkapnya ke Catatan. | | | |
| 3. Ulangi dengan delimiter `(` lalu `*`. | `(`, `*` | Kalimat galat serupa berkode INVALID_REGEX. | | | |
| 4. Kosongkan Delimiters. | (kosong) | "Delimiters cannot be empty." di kotak merah; OK nonaktif. | | | |
| 5. (Opsional, temuan C1-01) Isi Delimiters satu spasi lalu klik OK pada korpus yang berisi tanda hubung (mis. dataset_indonesia_testing.csv, kata "berlari-lari"). | ` ` (satu spasi) | Perhatikan apakah "berlari-lari" dipecah menjadi "berlari" dan "lari" (menandakan pola bawaan inti dipakai karena delimiter hanya spasi). Catat hasilnya. | | | |

## M-07 (BB-07) Stopword Indonesian, lalu Custom

Data: `c1_korpus_D.csv`. Kerjakan dua kali dengan dataset segar.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks`; Options → Stopwords Removal: pilih **Indonesian**. | — | Kotak teks di kanan menampilkan daftar kata (satu per baris, diawali "ada", "adalah", ...). | | | |
| 2. Klik **OK**. | — | Notifikasi "3 vector columns were added to the dataset." Kolom: `VEC_makan`, `VEC_nasi`, `VEC_suka` (`saya` dan `tidak` hilang). Baris 1: 1 1 1. Baris 2: 0 1 1. Baris 3: 3 0 0. | | | |
| 3. Impor ulang dataset. Pilih `teks`; Stopwords → **Custom**. | — | Kotak teks berisi daftar contoh bawaan Custom (11 kata, diawali "ada"). | | | |
| 4. Pilih semua isi kotak teks dan ganti dengan satu kata. | `suka` | Pilihan tetap Custom. | | | |
| 5. Klik **OK**. | — | Notifikasi "4 vector columns were added to the dataset." Kolom: `VEC_makan`, `VEC_nasi`, `VEC_saya`, `VEC_tidak` (`suka` hilang, `saya` dan `tidak` kembali muncul). Baris 1: 1 1 1 0. Baris 2: 0 1 1 1. Baris 3: 3 0 0 0. | | | |
| 6. Buka Output Viewer → tabel Settings. | — | Baris Stopwords berbunyi "Custom (1 word)" untuk langkah 5. | | | |

## M-08 (BB-08) Stemming Sastrawi dan Porter

Dua bagian terpisah, masing-masing dengan dataset segar. Karena pembatasan metode (hasil stemming kata selain yang tertulis tidak dikunci), catat semua hasil lain sebagai observasi.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| A1. Impor `dataset_indonesia_testing.csv`; pilih `teks_indo`. | — | 10 baris. | | | |
| A2. Options → Stemming: **Indonesian (Sastrawi)**; sisanya bawaan; **OK**. | — | Kolom bertambah. | | | |
| A3. Output Viewer → tabel Vocabulary: cari "memakan" dan "dimakan". | — | Term "memakan" dan "dimakan" **tidak ada**; term "makan" **ada**. | | | |
| A4. Di Data Editor lihat kolom `VEC_makan`. | — | Bernilai ≥ 1 pada baris 1 ("memakan"), baris 5 ("MAKAN"), baris 9 ("makan"). Baris 3 dan 10 ("Dimakan", "dimakan") diharapkan 1 juga; catat nilai sebenarnya. | | | |
| A5. Catat term lain pada Vocabulary (mis. hasil untuk "makanan", "berlari", "mengejar", "peliharaan"). | — | Tidak ada nilai pasti; salin hasilnya ke Catatan sebagai observasi. | | | |
| B1. Impor ulang; ganti dataset ke `dataset_inggris_testing.csv`; pilih `teks_en`. | — | 10 baris. | | | |
| B2. Options → Stemming: **English (Porter)**; **OK**. | — | Kolom bertambah. | | | |
| B3. Vocabulary: cari "running", "parks", "played". | — | "running", "parks", dan "played" **tidak ada**; "run", "park", dan "play" **ada**; "ran" tetap "ran". | | | |
| B4. Periksa nilai kolom `VEC_run`, `VEC_park`, `VEC_play`. | — | `VEC_run` = 1 pada baris 1, 3, 9. `VEC_park` = 1 pada baris 1, 2, 8. `VEC_play` = 1 pada baris 5, 3 pada baris 6, 1 pada baris 10. Catat bila berbeda. | | | |
| B5. Baca catatan di bawah opsi Stemming. | — | Teks kecil: "Stemming always converts tokens to lowercase, so the Lowercase option has no effect while stemming is on." | | | |

## M-09 (BB-09) Formula standard scikit-learn

Data: `c1_korpus_D.csv`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks`; Options → Vectorization Method. Catat pilihan awal. | — | Formula standard = Weka; TF = Word count; IDF = None; Normalization = None. | | | |
| 2. Klik radio **scikit-learn**. | — | Pilihan TF berubah otomatis menjadi **Count**, IDF menjadi **Smooth ln((1+N)/(1+df)) + 1**, Normalization menjadi **L2**. Daftar TF kini: Binary, Count, Sublinear (tanpa log(1+f)). | | | |
| 3. Klik **OK**. | — | Kolom `VEC_makan, VEC_nasi, VEC_saya, VEC_suka, VEC_tidak` dengan 4 desimal. | | | |
| 4. Periksa nilai (toleransi tampilan 4 desimal). | — | Baris 1: 0,5000 0,5000 0,5000 0,5000 0,0000. Baris 2: 0,0000 0,4599 0,4599 0,4599 0,6047. Baris 3: 1,0000 0,0000 0,0000 0,0000 0,0000. | | | |
| 5. Variable View. | — | Decimals = 4 untuk kolom `VEC_`. | | | |
| 6. Output Viewer → Settings. | — | Formula Standard "scikit-learn"; TF "Count"; IDF "Smooth ln((1+N)/(1+df)) + 1"; Normalization "L2". | | | |

## M-10 (BB-10) Words to Keep = 10, Min term frequency = 2

Data: `dataset_inggris_testing.csv` (`teks_en`).

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks_en`; Options: isi Words to Keep dan Min term frequency. | Words to Keep `10`, Min term frequency `2` | Tidak ada pesan galat; OK aktif. | | | |
| 2. Klik **OK**. | — | Notifikasi "10 vector columns were added to the dataset." | | | |
| 3. Daftar kolom. | — | `VEC_a`, `VEC_are`, `VEC_be`, `VEC_beautiful`, `VEC_chess`, `VEC_games`, `VEC_is`, `VEC_running`, `VEC_the`, `VEC_to` (tepat 10, alfabetis). | | | |
| 4. Jumlahkan tiap kolom (pakai Descriptives atau hitung manual). | — | Total per kolom: a 2, are 2, be 2, beautiful 5, chess 2, games 3, is 3, running 3, the 4, to 3 (semuanya ≥ 2). | | | |
| 5. Output Viewer → Settings. | — | "Words to Keep" 10; "Minimum Term Frequency" 2. | | | |
| 6. Ulangi dengan dataset segar: Words to Keep `0`, Min term frequency `1`. | `0`, `1` | Semua term disimpan (41 kolom untuk dataset Inggris). | | | |
| 7. Ulangi dengan Min term frequency `0`. | `0` | "Min term frequency must be a whole number of 1 or more." dan OK nonaktif. | | | |

## M-11 (BB-11) Stopword + Min term frequency membuang semua kata

Data: `c1_korpus_D.csv`; pilih `teks`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Stopwords → **Custom**; ganti isi kotak teks dengan lima baris. | `saya`, `suka`, `makan`, `nasi`, `tidak` (satu per baris) | — | | | |
| 2. Klik **OK**. | — | Kotak merah: "The vocabulary is empty after text preprocessing. Try using fewer stopwords or changing the stemming setting. (EMPTY_VOCABULARY)". Panel tetap terbuka; tidak ada kolom baru; tidak ada item baru di Output Viewer. | | | |
| 3. Reset. Isi Min term frequency `5` (Stopwords None), **OK**. | `5` | Kotak merah: "The vocabulary is empty after applying the minimum term frequency. Try lowering the minimum term frequency. (EMPTY_VOCABULARY)". | | | |
| 4. Reset. Stopwords Custom berisi `makan`, Min term frequency `3`, **OK**. | `makan`; `3` | Kalimat yang sama seperti langkah 3 (min term frequency), kode EMPTY_VOCABULARY. | | | |
| 5. Reset. Min term frequency `4`, **OK**. | `4` | Berhasil: satu kolom `VEC_makan` bernilai 1, 0, 3. | | | |

## M-12 (BB-12) Sel kosong

Data: `c1_korpus_D_sel_kosong.csv` (kolom `id`, `teks`; baris 2 kosong, baris 4 hanya spasi). Setelah impor, catat apakah baris 4 masih berisi spasi atau sudah kosong, dan apakah variabel `teks` terdeteksi bertipe String.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Impor berkas; pastikan 5 baris dan `teks` bertipe String (ubah di Variable View bila perlu). | — | Baris 2 dan 4 pada `teks` tampak kosong. | | | |
| 2. Transform → String to Word Vector, pilih `teks`, opsi bawaan, **OK**. | — | Lima kolom `VEC_makan ... VEC_tidak` ditambahkan. | | | |
| 3. Periksa nilai. | — | 5 baris. Baris 1: 1 1 1 1 0. Baris 2: 0 0 0 0 0. Baris 3: 0 1 1 1 1. Baris 4: 0 0 0 0 0. Baris 5: 3 0 0 0 0. Jumlah baris tetap 5 (tidak ada baris yang hilang atau bergeser). | | | |
| 4. Output Viewer → Processing Summary. | — | Documents (Rows) = 5; Documents with Zero Vector = 2. | | | |
| 5. Dataset segar: kosongkan semua sel `teks` (hapus isinya) lalu jalankan OK. | — | Kotak merah: "The selected variable has no text data. Select a variable that contains text and try again. (EMPTY_DATA)". Tidak ada kolom baru. | | | |

## M-13 (BB-13) Output Viewer setelah transformasi

Lakukan sesudah M-02 (korpus D, opsi bawaan, awalan `VEC_`). Buka Output Viewer (`/dashboard/result`).

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Cari log dan analisis terbaru. | — | Log "STRING TO WORD VECTOR teks /PREFIX=VEC_" dan analisis berjudul "String to Word Vector". | | | |
| 2. Buka item "String to Word Vector" (Executed). | — | Teks: "5 vector columns were created from variable `teks` and added as the last variables in the dataset (3 documents, 0 with a zero vector)." beserta interpretasi berawalan "What this shows.". | | | |
| 3. Buka tabel **Processing Summary**. | — | Baris: Source Variable `teks`; Documents (Rows) 3; Documents with Zero Vector 0; Vocabulary Size 5; Columns Added to Dataset 5; Column Name Prefix `VEC_`; First – Last Column `VEC_makan – VEC_tidak`; Processing Time (ms) berupa angka. Ada catatan tentang vektor nol dan bahwa kosakata tidak disimpan. | | | |
| 4. Buka tabel **Settings**. | — | Formula Standard Weka; Term Frequency Word count; Inverse Document Frequency None; Normalization None; Convert to Lowercase Yes; Stopwords None; Stemming None; Tokenizer "Word (unigram)"; Delimiters (Regex) `[\s.,;:'"()?!]+`; Words to Keep 1000; Minimum Term Frequency 1. | | | |
| 5. Buka tabel **Vocabulary**. | — | Kolom No, Term, Dataset Column, Documents (Non-zero). Lima baris: makan / VEC_makan / 2; nasi / VEC_nasi / 2; saya / VEC_saya / 2; suka / VEC_suka / 2; tidak / VEC_tidak / 1. | | | |
| 6. Baca interpretasi di bawah tiap tabel. | — | Setiap item memiliki paragraf "What this shows.", "How to read it.", "Key findings." berbahasa Inggris dan tanpa tag HTML mentah yang tampak. | | | |
| 7. (Opsional) Ulangi dengan dataset besar (mis. `Claude outputs/pilkada_train.csv`, kolom teks) untuk melihat pembatasan tabel Vocabulary. | — | Tabel Vocabulary memuat paling banyak 200 baris dengan catatan "Showing the first 200 of N terms (alphabetical, same order as the dataset columns)."; semua N kolom tetap ada di Data Editor. | | | |

---

## Ringkasan akhir (diisi setelah semua butir dijalankan)

| Butir | Lulus | Gagal | Catatan singkat |
|---|---|---|---|
| M-01 (BB-01) | | | |
| M-02 (BB-02) | | | |
| M-03 (BB-03) | | | |
| M-04 (BB-04) | | | |
| M-05 (BB-05) | | | |
| M-06 (BB-06) | | | |
| M-07 (BB-07) | | | |
| M-08 (BB-08) | | | |
| M-09 (BB-09) | | | |
| M-10 (BB-10) | | | |
| M-11 (BB-11) | | | |
| M-12 (BB-12) | | | |
| M-13 (BB-13) | | | |
