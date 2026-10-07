# Daftar periksa manual Track C (M-01 sampai M-36)

Gabungan `C_manual_checklist_C1.md`, `C_manual_checklist_C2.md`, `C_manual_checklist_C3.md` (digenerate oleh `tools/merge_docs.py`). Kolom hasil dan tangkapan layar sengaja dikosongkan: diisi Yedija saat menjalankan langkah di aplikasi nyata. Daftar periksa integrasi antarmenu (Track F) ada di `F_manual_checklist.md`.


<!-- sumber: C_manual_checklist_C1.md -->

## Daftar periksa manual Track C1 — String to Word Vector (BB-01 sampai BB-13)

Daftar ini dijalankan sendiri oleh Yedija pada aplikasi Statify yang sungguhan (WASM nyata, Data Editor, Variable View, Output Viewer). Seluruh sel "Tangkapan layar" dan "Lulus/Gagal" sengaja dikosongkan. Nilai yang tertulis pada kolom "Hasil yang harus terlihat" berasal dari kode sumber dan dari acuan independen Python (`logs/reference_bb02.txt`, `logs/reference_bb_c1_extra.txt`); bila yang terlihat berbeda, tulis apa adanya pada kolom Catatan dan jangan disesuaikan. Status semua butir saat ini: **MANUAL — belum dijalankan**.

### Identitas pengujian

| Isian | Nilai |
|---|---|
| Tanggal dan jam | |
| Penguji | Yedija |
| Perangkat | Lenovo IdeaPad Gaming 3 15ARH05, Ryzen 5 4600H, RAM 16 GB, Windows 11 Home 64-bit |
| Peramban (nama dan versi lengkap) | |
| Commit/branch yang diuji | |
| Hasil `run_C1.ps1` (rust_exit, jest_exit) | |

### Persiapan (sekali di awal)

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

### M-01 (BB-01) Membuka Transform → String to Word Vector

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

### M-02 (BB-02) Default Weka pada korpus acuan

Data: `c1_korpus_D.csv` (variabel `teks`, 3 baris).

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Impor `c1_korpus_D.csv`. | — | Data Editor memuat 3 baris pada kolom `teks`. | | | |
| 2. **Transform → String to Word Vector**, pilih `teks` sebagai Target Variable. | `teks` | OK aktif. | | | |
| 3. Biarkan semua opsi bawaan (jangan ubah apa pun di tab Options). | — | Weka, Word count, IDF None, Normalization None, Words to Keep 1000, Min term frequency 1. | | | |
| 4. Klik **OK**. | — | Muncul indikator "Processing..." sebentar, notifikasi "5 vector columns were added to the dataset.", dan panel tertutup. | | | |
| 5. Lihat Data Editor. | — | Lima kolom baru di sebelah kanan `teks`, berurutan: `VEC_makan`, `VEC_nasi`, `VEC_saya`, `VEC_suka`, `VEC_tidak`. Baris 1: 1, 1, 1, 1, 0. Baris 2: 0, 1, 1, 1, 1. Baris 3: 3, 0, 0, 0, 0. | | | |
| 6. Buka Variable View untuk lima kolom itu. | — | Type Numeric, Decimals 0, Measure Scale, Label berbentuk `Vector of "makan"` dan seterusnya. | | | |

### M-03 (BB-03) Vector Column Name tidak sah

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

### M-04 (BB-04) n-gram min=1 max=2

Data: `c1_korpus_D.csv`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks`; Options → Tokenizer: pilih **N-gram**. | — | Kolom "max size" dan "min size" menjadi aktif (tidak lagi redup). | | | |
| 2. Isi max size dan min size. | max size `2`, min size `1` | Tidak ada pesan galat; OK aktif. | | | |
| 3. Klik **OK**. | — | Notifikasi "12 vector columns were added to the dataset." | | | |
| 4. Lihat nama kolom di Data Editor. | — | Berurutan: `VEC_makan`, `VEC_makan_makan`, `VEC_makan_nasi`, `VEC_nasi`, `VEC_saya`, `VEC_saya_suka`, `VEC_saya_tidak`, `VEC_suka`, `VEC_suka_makan`, `VEC_suka_nasi`, `VEC_tidak`, `VEC_tidak_suka`. (Spasi pada bigram diganti garis bawah oleh aplikasi; catat bila namanya berbeda.) | | | |
| 5. Lihat nilai baris. | — | Baris 1: 1 0 1 1 1 1 0 1 1 0 0 0. Baris 2: 0 0 0 1 1 0 1 1 0 1 1 1. Baris 3: 3 2 0 0 0 0 0 0 0 0 0 0. | | | |
| 6. Buka Output Viewer, tabel Vocabulary. | — | Kolom Term memuat 12 term (5 unigram, 7 bigram dengan spasi, mis. "makan makan"); kolom Dataset Column memuat nama yang sama dengan langkah 4. | | | |

### M-05 (BB-05) n-gram tidak sah

Data: `c1_korpus_D.csv`; pilih `teks`, Options → Tokenizer **N-gram**.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Isi max size lalu min size. | max size `2`, min size `3` | Kotak merah "Some options are invalid:" berisi "N-gram min size cannot be greater than max size." OK nonaktif. | | | |
| 2. Perbaiki min size. | min size `1` | Pesan hilang, OK aktif. | | | |
| 3. Isi max size lebih dari 5. | max size `6` | Kolom berubah menjadi `5` (dipotong otomatis); tidak ada pesan; OK aktif. (Berbeda dari tabel prompt, yang mengharapkan pesan; catat apa yang terlihat.) | | | |
| 4. Isi max size `0`, lalu `-3`, lalu kosongkan. | `0`, `-3`, (kosong) | Kolom berubah menjadi `1` untuk setiap kasus (dipotong ke batas bawah); tidak ada pesan. | | | |

### M-06 (BB-06) Delimiters regex tidak valid

Data: `c1_korpus_D.csv`; pilih `teks`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Options → kolom Delimiters: hapus isi, ketik regex tak lengkap. | `[(` | Tidak ada pesan galat selama mengetik; OK tetap aktif. | | | |
| 2. Klik **OK**. | — | Kotak merah di bawah panel berisi kalimat yang diawali "The delimiter regex pattern is invalid: regex parse error: ..." dan berakhir " (INVALID_REGEX)". Panel tetap terbuka; tidak ada kolom `VEC_` baru; tidak ada item baru di Output Viewer. Salin kalimat lengkapnya ke Catatan. | | | |
| 3. Ulangi dengan delimiter `(` lalu `*`. | `(`, `*` | Kalimat galat serupa berkode INVALID_REGEX. | | | |
| 4. Kosongkan Delimiters. | (kosong) | "Delimiters cannot be empty." di kotak merah; OK nonaktif. | | | |
| 5. (Opsional, temuan C1-01) Isi Delimiters satu spasi lalu klik OK pada korpus yang berisi tanda hubung (mis. dataset_indonesia_testing.csv, kata "berlari-lari"). | ` ` (satu spasi) | Perhatikan apakah "berlari-lari" dipecah menjadi "berlari" dan "lari" (menandakan pola bawaan inti dipakai karena delimiter hanya spasi). Catat hasilnya. | | | |

### M-07 (BB-07) Stopword Indonesian, lalu Custom

Data: `c1_korpus_D.csv`. Kerjakan dua kali dengan dataset segar.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks`; Options → Stopwords Removal: pilih **Indonesian**. | — | Kotak teks di kanan menampilkan daftar kata (satu per baris, diawali "ada", "adalah", ...). | | | |
| 2. Klik **OK**. | — | Notifikasi "3 vector columns were added to the dataset." Kolom: `VEC_makan`, `VEC_nasi`, `VEC_suka` (`saya` dan `tidak` hilang). Baris 1: 1 1 1. Baris 2: 0 1 1. Baris 3: 3 0 0. | | | |
| 3. Impor ulang dataset. Pilih `teks`; Stopwords → **Custom**. | — | Kotak teks berisi daftar contoh bawaan Custom (11 kata, diawali "ada"). | | | |
| 4. Pilih semua isi kotak teks dan ganti dengan satu kata. | `suka` | Pilihan tetap Custom. | | | |
| 5. Klik **OK**. | — | Notifikasi "4 vector columns were added to the dataset." Kolom: `VEC_makan`, `VEC_nasi`, `VEC_saya`, `VEC_tidak` (`suka` hilang, `saya` dan `tidak` kembali muncul). Baris 1: 1 1 1 0. Baris 2: 0 1 1 1. Baris 3: 3 0 0 0. | | | |
| 6. Buka Output Viewer → tabel Settings. | — | Baris Stopwords berbunyi "Custom (1 word)" untuk langkah 5. | | | |

### M-08 (BB-08) Stemming Sastrawi dan Porter

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

### M-09 (BB-09) Formula standard scikit-learn

Data: `c1_korpus_D.csv`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Pilih `teks`; Options → Vectorization Method. Catat pilihan awal. | — | Formula standard = Weka; TF = Word count; IDF = None; Normalization = None. | | | |
| 2. Klik radio **scikit-learn**. | — | Pilihan TF berubah otomatis menjadi **Count**, IDF menjadi **Smooth ln((1+N)/(1+df)) + 1**, Normalization menjadi **L2**. Daftar TF kini: Binary, Count, Sublinear (tanpa log(1+f)). | | | |
| 3. Klik **OK**. | — | Kolom `VEC_makan, VEC_nasi, VEC_saya, VEC_suka, VEC_tidak` dengan 4 desimal. | | | |
| 4. Periksa nilai (toleransi tampilan 4 desimal). | — | Baris 1: 0,5000 0,5000 0,5000 0,5000 0,0000. Baris 2: 0,0000 0,4599 0,4599 0,4599 0,6047. Baris 3: 1,0000 0,0000 0,0000 0,0000 0,0000. | | | |
| 5. Variable View. | — | Decimals = 4 untuk kolom `VEC_`. | | | |
| 6. Output Viewer → Settings. | — | Formula Standard "scikit-learn"; TF "Count"; IDF "Smooth ln((1+N)/(1+df)) + 1"; Normalization "L2". | | | |

### M-10 (BB-10) Words to Keep = 10, Min term frequency = 2

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

### M-11 (BB-11) Stopword + Min term frequency membuang semua kata

Data: `c1_korpus_D.csv`; pilih `teks`.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Stopwords → **Custom**; ganti isi kotak teks dengan lima baris. | `saya`, `suka`, `makan`, `nasi`, `tidak` (satu per baris) | — | | | |
| 2. Klik **OK**. | — | Kotak merah: "The vocabulary is empty after text preprocessing. Try using fewer stopwords or changing the stemming setting. (EMPTY_VOCABULARY)". Panel tetap terbuka; tidak ada kolom baru; tidak ada item baru di Output Viewer. | | | |
| 3. Reset. Isi Min term frequency `5` (Stopwords None), **OK**. | `5` | Kotak merah: "The vocabulary is empty after applying the minimum term frequency. Try lowering the minimum term frequency. (EMPTY_VOCABULARY)". | | | |
| 4. Reset. Stopwords Custom berisi `makan`, Min term frequency `3`, **OK**. | `makan`; `3` | Kalimat yang sama seperti langkah 3 (min term frequency), kode EMPTY_VOCABULARY. | | | |
| 5. Reset. Min term frequency `4`, **OK**. | `4` | Berhasil: satu kolom `VEC_makan` bernilai 1, 0, 3. | | | |

### M-12 (BB-12) Sel kosong

Data: `c1_korpus_D_sel_kosong.csv` (kolom `id`, `teks`; baris 2 kosong, baris 4 hanya spasi). Setelah impor, catat apakah baris 4 masih berisi spasi atau sudah kosong, dan apakah variabel `teks` terdeteksi bertipe String.

| Langkah | Input | Hasil yang harus terlihat | Tangkapan layar | Lulus/Gagal | Catatan |
|---|---|---|---|---|---|
| 1. Impor berkas; pastikan 5 baris dan `teks` bertipe String (ubah di Variable View bila perlu). | — | Baris 2 dan 4 pada `teks` tampak kosong. | | | |
| 2. Transform → String to Word Vector, pilih `teks`, opsi bawaan, **OK**. | — | Lima kolom `VEC_makan ... VEC_tidak` ditambahkan. | | | |
| 3. Periksa nilai. | — | 5 baris. Baris 1: 1 1 1 1 0. Baris 2: 0 0 0 0 0. Baris 3: 0 1 1 1 1. Baris 4: 0 0 0 0 0. Baris 5: 3 0 0 0 0. Jumlah baris tetap 5 (tidak ada baris yang hilang atau bergeser). | | | |
| 4. Output Viewer → Processing Summary. | — | Documents (Rows) = 5; Documents with Zero Vector = 2. | | | |
| 5. Dataset segar: kosongkan semua sel `teks` (hapus isinya) lalu jalankan OK. | — | Kotak merah: "The selected variable has no text data. Select a variable that contains text and try again. (EMPTY_DATA)". Tidak ada kolom baru. | | | |

### M-13 (BB-13) Output Viewer setelah transformasi

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

### Ringkasan akhir (diisi setelah semua butir dijalankan)

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


<!-- sumber: C_manual_checklist_C2.md -->

## Daftar periksa manual — Menu Naive Bayes (BB-14 s.d. BB-28), Track C2

Dokumen ini dijalankan oleh Yedija di aplikasi Statify yang sedang berjalan (`npm run dev` pada `E:\KULIAH\Skripsi\statify64\frontend`). Kolom **Tangkapan layar** dan **Hasil (Lulus/Gagal)** sengaja dikosongkan; isi setelah menjalankan langkah. Semua skenario pada dokumen ini berstatus **MANUAL — belum dijalankan** sampai kolom Hasil diisi.

Tes otomatis untuk skenario yang sama (Jest dan Rust) dijelaskan pada `C_blackbox_C2.md`. Daftar ini menguji hal yang tidak dapat dipastikan otomatis: tampilan nyata di peramban, unduhan berkas, clipboard, dan alur pengguna dari awal.

### Persiapan umum

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
7. Tangkapan layar: simpan di `testing\thesis-eval\screenshots\C2\` (buat foldernya sendiri) dengan nama `BB-xx_<langkah>.png`, dan tulis nama berkas di kolom Tangkapan layar.

Konfigurasi dasar yang sering dipakai disingkat sebagai berikut.

- **Konfigurasi teks (DS-1)**: Target = `Sentiment`; Raw Text Variable = `Text Tweet`; blok Variables to Exclude = `Id` dan `Pasangan Calon` (pilih keduanya di daftar kiri, panah ke Variables to Exclude). Tab Options dan Output biarkan bawaan.
- **Konfigurasi numerik (DS-2)**: Target = `kelas`; blok lain kosong (otomatis `x` menjadi kovariat).

---

### BB-14 — Naive Bayes tanpa Target (F20)

Dataset: DS-2. Harapan prompt: OK nonaktif, pesan validasi. Catatan kode: pesan `Select a target variable.` dibuat oleh hook tetapi tidak dirender (C2-02), jadi pada layar yang diharapkan hanyalah OK nonaktif.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Impor DS-2, buka Analyze → Classify → Naive Bayes. Jangan isi apa pun. | Panel tampil di sidebar kanan dengan tab Variables, Options, Validation, Output (tab Text Preprocessing abu-abu). | | | |
| 2 | Perhatikan tombol OK di bawah panel. | OK nonaktif (abu-abu, tidak dapat diklik). | | | |
| 3 | Cari teks pesan validasi di seluruh panel (semua tab). | Catat apakah ada kalimat penjelas. Menurut kode: tidak ada teks `Select a target variable.` di layar. | | | |
| 4 | Pilih `kelas`, klik panah blok Target / Label. | OK menjadi aktif (`x` otomatis menjadi prediktor). | | | |
| 5 | Pindahkan `kelas` kembali ke daftar kiri. | OK kembali nonaktif. | | | |

### BB-15 — Candidate Factors / Covariates (F21)

Dataset: DS-1.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Target = `Sentiment`. Pindahkan `Id` ke Variables to Exclude. | Variables to Exclude berisi `Id`; `Id` hilang dari daftar kiri. | | | |
| 2 | Pindahkan `Pasangan Calon` ke Candidate Factors / Categorical Features. | Variables to Exclude **kosong**; `Id` kembali ke daftar kiri; Candidate Factors berisi `Pasangan Calon`. | | | |
| 3 | Coba pindahkan `Id` (Scale) ke Candidate Factors. | Ditolak (tidak masuk), biasanya tanpa pesan. | | | |
| 4 | Pindahkan `Id` ke Candidate Covariates / Numerical Features. | Diterima. Pindahkan `Pasangan Calon` ke Candidate Covariates: ditolak. | | | |
| 5 | Klik OK. Buka Output Viewer → Case Processing Summary. | Atribut (attribute variables) hanya `Pasangan Calon` dan `Id`; `Text Tweet` tidak ikut. | | | |

### BB-16 — Raw Text Variable mengaktifkan tab Text Preprocessing (F22, F23)

Dataset: DS-1.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Buka panel baru (Reset). Lihat tab **Text Preprocessing**. | Tab abu-abu (nonaktif); arahkan kursor: tooltip `Available when a Raw Text Variable is set on the Variables tab.` | | | |
| 2 | Pindahkan `Text Tweet` ke Raw Text Variable. | Blok Raw Text Variable berisi `Text Tweet`. | | | |
| 3 | Lihat tab Text Preprocessing lagi, lalu klik. | Tab aktif dan terbuka; isinya pengaturan prapemrosesan teks (sama jenisnya dengan String to Word Vector). | | | |
| 4 | Kembali ke Variables, kosongkan Raw Text Variable (panah kiri). | Tab Text Preprocessing nonaktif lagi dan tampilan kembali ke Variables bila sedang di tab itu. | | | |
| 5 | Isi Raw Text Variable lalu coba pindahkan `Id` (numerik) ke Raw Text Variable. | Ditolak: slot ini hanya untuk variabel String. | | | |

### BB-17 — Complement dengan prediktor numerik/kategorik (F24)

Dataset: DS-1. Catatan kode: pada UI pesan tidak berkode (lihat `C_blackbox_C2.md`); kode `NB_E_COMPLEMENT_MIXED` hanya muncul dari Rust.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Konfigurasi teks (Target `Sentiment`, Raw Text `Text Tweet`, Exclude `Id` dan `Pasangan Calon`). | OK aktif. | | | |
| 2 | Tab Options, bagian Text: pilih **Complement**. | Complement dapat dipilih (model hanya berisi Text Features). | | | |
| 3 | Tab Variables: pindahkan `Pasangan Calon` dari Variables to Exclude kembali ke daftar kiri (berarti menjadi prediktor kategorik). | OK **nonaktif**. | | | |
| 4 | Tab Options, bagian Text. | Teks merah: `Complement is selected, but the model also contains numeric or categorical variables. Choose Multinomial or Bernoulli.` Radio Complement nonaktif. | | | |
| 5 | Arahkan kursor ke Complement. | Tooltip: `Complement is only available when the model contains Text Features only (no numeric or categorical variables).` | | | |
| 6 | Pilih **Multinomial**. | Peringatan hilang; OK aktif lagi. | | | |

### BB-18 — Alpha di luar batas (F24)

Dataset: DS-1, konfigurasi teks.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Options, kolom **Text Alpha (smoothing)**: ketik `0`. | Pesan merah `Text Alpha must be greater than 0`. | | | |
| 2 | Ketik `1000`. | Pesan `Text Alpha must not exceed 999`. | | | |
| 3 | Ketik `999`. | Tidak ada pesan. | | | |
| 4 | Ketik `0` lagi, lalu klik tab Validation dan kembali ke Options. | Menurut kode: nilai tidak sah tidak tersimpan, kolom kembali menampilkan `999` (nilai sah terakhir). Catat apa yang terlihat. | | | |
| 5 | Kolom **Smoothing Alpha**: ketik `0`, lalu `1000`. | `Smoothing Alpha must be greater than 0` dan `Smoothing Alpha must not exceed 999`. | | | |
| 6 | Ketik `0` di Text Alpha lalu langsung klik OK tanpa pindah tab. | Catat: apakah OK aktif, apakah analisis berjalan, dan alpha mana yang dipakai (C2-03: menurut kode OK tetap aktif dan analisis memakai nilai sah terakhir tanpa peringatan). | | | |

### BB-19 — Word-Vector bernilai negatif (F22)

Dataset: DS-2 (`uji_a2.csv`).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Di **Data View**, ubah nilai `x` baris pertama dari `1` menjadi `-1`. | Sel menampilkan -1. | | | |
| 2 | Buka Naive Bayes; Target = `kelas`; pindahkan `x` ke **Word-Vector Variables**. | `x` masuk Word-Vector Variables. Panel menampilkan peringatan non-blokir tentang kebocoran (lihat BB-27). OK aktif (UI tidak memeriksa nilai negatif). | | | |
| 3 | Klik OK. Segera ambil tangkapan layar toast galat. | Toast galat: `Text vector column 'x' contains negative values. Text likelihoods require values >= 0; remove it from Word-Vector Variables. (NB_E_TEXT_NEGATIVE)` — menyebut kolom `x` dan kode. | | | |
| 4 | Periksa Output Viewer. | Tidak ada tabel hasil baru dari run ini. | | | |
| 5 | Kembalikan nilai `x` baris pertama menjadi `1` (diperlukan untuk BB-20 dan BB-27). | Data pulih. | | | |

### BB-20 — Gaussian (Weka min. std) (F25)

Dataset: DS-2 (nilai `x` asli 1,1,1,3,5). Catatan: nilai unik `x` = {1, 3, 5}, sehingga presisi = (5−1)/2 = 2, `min_std` = 1/3, `min_var` = 1/9. Kelas A (semua `x` = 1, varians 0) dinaikkan ke simpangan baku 1/3.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Target = `kelas`. Tab Options, bagian Numeric: pilih **Gaussian (Weka min. std)**. | Radio terpilih. | | | |
| 2 | Tab Validation: Training and Holdout Partition, Training Percentage `70`, centang **Use random seed**, Seed `42`. Klik OK. | Analisis berjalan; toast `Naive Bayes analysis completed. See the results in the Output Viewer.` | | | |
| 3 | Output Viewer → **Attribute Distribution Table**. | Baris `x` dengan Mean dan Std. Dev. per kelas: kelas A mean 1, std ≈ 0,3333; kelas B mean 4, std 1. Catatan di bawah tabel memuat `Numerical likelihood: x: Gaussian with a minimum standard deviation floor (Weka-style); minimum variance = 0.1111…`. | | | |
| 4 | Ulangi dengan opsi **Gaussian** biasa (Options). | Std kelas A hampir 0 (sangat kecil), tidak ada catatan min. std. | | | |
| 5 | Pada run Weka min. std, buka tabel lain. | Confusion Matrix dan Model Evaluation Metrics terisi tanpa NaN. | | | |

### BB-21 — Training Percentage 0 atau 100 (F26)

Dataset: DS-2 atau DS-1 (sembarang konfigurasi sah).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Validation, pilih Training and Holdout Partition. Ketik Training Percentage `0`. Kolom Holdout Percentage (baca saja) diperhatikan. | Perhatikan adanya pesan inline (menurut kode: tidak ada). | | | |
| 2 | Klik tab Options. | Tab **tidak berpindah**; toast `Training percentage must be a whole number between 1 and 99.` | | | |
| 3 | Klik OK. | Toast sama; panel tidak tertutup, analisis tidak berjalan. Catat apakah OK terlihat aktif (menurut kode: aktif; C2-03). | | | |
| 4 | Ulangi dengan `100`. | Hasil sama seperti langkah 2 dan 3. | | | |
| 5 | Ketik `70.5`, lalu `-5`, lalu `150`. | Masing-masing ditolak dengan pesan yang sama. | | | |
| 6 | Ketik `1`, lalu `99`, lalu pindah tab. | Diterima; tab berpindah tanpa pesan. | | | |

### BB-22 — Holdout 70% seed 42 dua kali (F26, F27)

Dataset: DS-1, konfigurasi teks.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Validation: Training and Holdout Partition, Training Percentage `70` (Holdout Percentage otomatis `30`), centang **Use random seed**, Seed `42`. | Kolom terisi sesuai. | | | |
| 2 | Klik OK. Tunggu hingga selesai. Catat dari Output Viewer: Case Processing Summary (baris skenario validasi), Confusion Matrix (empat sel, Total), Overall Accuracy, Cohen's Kappa, F1 per kelas. | Nilai-nilai tercatat (run pertama). | | | |
| 3 | Buka Naive Bayes lagi, konfigurasi tetap (Seed 42, 70%). Klik OK. | Run kedua. | | | |
| 4 | Bandingkan run pertama dan kedua pada semua angka di langkah 2. | **Identik** (sel Confusion Matrix, akurasi, kappa, F1 sama persis). | | | |
| 5 | Ganti Seed menjadi `43`, jalankan. | Angka boleh berbeda (bukan kriteria lulus; hanya konfirmasi seed berpengaruh). | | | |

### BB-23 — Validasi 10-fold (F26, F27)

Dataset: DS-1, konfigurasi teks.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Tab Validation: pilih **Cross-Validation Folds**, Number of Folds `10`, Seed `42`. | Bagian Holdout Settings meredup; Cross-Validation Settings aktif. | | | |
| 2 | Klik OK; tunggu (lebih lama dari holdout karena 10 kali pelatihan). | Analisis selesai. | | | |
| 3 | Case Processing Summary: baris skenario validasi. | Menyebut cross-validation 10 fold dan seed 42. | | | |
| 4 | Confusion Matrix: lihat Total. | Total = **630** (seluruh baris diuji tepat satu kali, bukan sekitar 63); total baris kelas = 315 dan 315. | | | |
| 5 | Hitung manual: jumlah diagonal ÷ 630 dibandingkan Overall Accuracy. | Sama. | | | |

### BB-24 — Fold melebihi anggota kelas terkecil (F26)

Catatan kode: tidak ada kode `NB_E_*` untuk fold (C2-01). Hasil yang diharapkan di bawah mengikuti perilaku kode.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | DS-2 (kelas A = 3 baris, B = 2 baris). Target = `kelas`. Tab Validation: Cross-Validation Folds, Number of Folds `3` (lebih besar dari kelas terkecil = 2, tetapi tidak melebihi 5 baris). Klik OK. | Analisis tetap berjalan dan selesai. Peringatan fold tidak tampil di antarmuka (catat apakah ada). | | | |
| 2 | Ulangi dengan Number of Folds `6` (lebih besar dari 5 baris). Klik OK. | Analisis gagal. Toast galat generik: `The Naive Bayes analysis could not be completed. Check the selected variables and settings, then try again.` (pesan khusus fold tidak sampai ke pengguna pada run tanpa Text). Tidak ada kode `NB_E_`. | | | |
| 3 | DS-1, konfigurasi teks, Cross-Validation Folds, Number of Folds `700` (melebihi 630 baris), Seed `42`. Klik OK. | Analisis gagal dengan toast `Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class.` (run ber-Text membawa pesan fold). Tanpa kode `NB_E_`. | | | |
| 4 | Number of Folds `0`, lalu pindah tab atau klik OK. | Toast `The number of folds must be at least 1.` | | | |

### BB-25 — Output setelah pelatihan (F28)

Gunakan run BB-20 (DS-2, ada kovariat) dan run BB-22 (DS-1, hanya Text) yang sudah ada di Output Viewer.

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Run BB-20: lihat seluruh daftar keluaran di Output Viewer. | Berurutan: Case Processing Summary, Attribute Distribution Table, Model Evaluation Metrics, Cohen's Kappa, Confusion Matrix, Export Model. | | | |
| 2 | Case Processing Summary. | Baris `Total Instances` (5), `Valid Instances` (5), `Excluded (Target Missing)` (0), `Target Variable` (`kelas`), `Attribute Variables` (`x`), `Validation Scenario` (holdout 70/30, seed 42). | | | |
| 3 | Confusion Matrix. | Baris = actual, kolom = predicted; ada Total per baris dan kolom, grand total, dan persentase; grand total sama dengan jumlah baris holdout (2 untuk 5 baris pada 70%). | | | |
| 4 | Model Evaluation Metrics. | Per kelas: Accuracy, Precision, Recall, F1-Score; baris macro, weighted, micro average; Overall Accuracy; Cohen's Kappa hanya satu angka. | | | |
| 5 | Run BB-22 (DS-1): Case Processing Summary. | Selain baris di atas, ada baris `Text features` (`Raw text: 'Text Tweet' (N terms)`), `Text likelihood` (Multinomial), dan `Text alpha` (1). | | | |
| 6 | Buka tab Output di panel, hilangkan centang **Confusion Matrix**, jalankan ulang. | Confusion Matrix tidak muncul; tabel lain tetap; Export Model tetap muncul. | | | |

### BB-26 — Download CSV dan Copy Text Feature Table (F29)

Dataset: DS-1, run BB-22 (Text Feature Table dicentang di tab Output; bawaan aktif).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Output Viewer → Text Feature Table. | Tabel per kelas dengan peringkat, term, dan skor (Top-k, bawaan 100), keterangan likelihood Multinomial. | | | |
| 2 | Klik **Download CSV**. | Peramban mengunduh `Naive_Bayes_Text_Features.csv`. | | | |
| 3 | Buka berkas di Excel/Notepad. | Baris pertama `term,class,count,log_weight,probability,score`; karakter Indonesia terbaca benar (BOM UTF-8); jumlah baris data = 2 kelas × jumlah term. | | | |
| 4 | Klik **Copy (TSV)**. | Toast `Table copied as tab-separated text.` | | | |
| 5 | Tempel (Ctrl+V) ke Excel/Notepad. | Kolom terpisah tab dengan enam kolom yang sama dan jumlah baris sama dengan CSV. | | | |

### BB-27 — Peringatan kebocoran jalur Word-Vector (F30)

Dataset: DS-2 dengan nilai `x` asli (1,1,1,3,5; pastikan sudah dikembalikan dari BB-19).

| No | Langkah | Hasil yang diharapkan | Tangkapan layar | Hasil | Catatan |
|---|---|---|---|---|---|
| 1 | Target = `kelas`. Tab Variables: belum ada Word-Vector. | Tidak ada peringatan kebocoran. | | | |
| 2 | Pindahkan `x` ke **Word-Vector Variables**. | Di bawah panel kanan tampil peringatan: `The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic.` | | | |
| 3 | Klik OK. Buka Case Processing Summary. | Ada baris `Note` dengan kalimat yang sama. | | | |
| 4 | Buka panel lagi, kosongkan Word-Vector Variables. | Peringatan hilang. | | | |
| 5 | DS-1: konfigurasi teks (Raw Text Variable). | Tidak ada peringatan kebocoran pada jalur Raw Text. | | | |

### BB-28 — Export Model (F31)

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

### Rekap hasil

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


<!-- sumber: C_manual_checklist_C3.md -->

## Daftar periksa manual Track C3 — Apply Model (BB-29 sampai BB-35) dan persistensi Naive Bayes (BB-36)

Dokumen ini berisi langkah persis untuk Yedija. Bagian yang bisa diotomatiskan (pesan galat, pemetaan, penamaan kolom, perhitungan WASM, isi tabel Output Viewer, persistensi IndexedDB pada tingkat dialog) sudah diuji oleh `run_C3.ps1`. Yang tercantum di sini adalah bagian yang membutuhkan peramban sungguhan: kotak dialog pemilih berkas, tampilan Data Editor, tampilan Output Viewer, unduhan berkas, dan muat ulang halaman. Kolom Lulus dan Gagal sengaja dibiarkan kosong; isi dengan tanda centang setelah menjalankan. Nama berkas tangkapan layar mengikuti pola `C3-<ID langkah>.png` dan disimpan di `testing/thesis-eval/screenshots/C3/` (buat folder itu bila belum ada).

Semua status di sini adalah **MANUAL — belum dijalankan** sampai Anda mengisinya.

### 0. Persiapan

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

#### 0.A Mengekspor M1 (model fitur biasa)

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| 0.A.1 | File → Import Data → CSV Data, pilih `c3_cuaca_latih.csv`, impor. Buka Variable View. | `Outlook` = String, Nominal; `Temp` = Numeric, Scale; `Play` = String, Nominal. | C3-0A1.png | | |
| 0.A.2 | Analyze → Classify → Naive Bayes. Tab Variables: klik dua kali `Play` di daftar variabel tersedia. | `Play` pindah ke Target Variable; `Outlook` dan `Temp` tetap sebagai prediktor bawaan; tombol OK aktif. | C3-0A2.png | | |
| 0.A.3 | Tab Validation: pilih Training and Holdout Partition, Training Percentage 70, centang Use random seed, Seed 42. Tab lain biarkan bawaan. Klik OK. | Dialog menutup; Output Viewer menampilkan hasil Naive Bayes dan tombol **Export Model**. Bila Naive Bayes menolak data sekecil ini, ubah Validation menjadi Cross-Validation Folds dengan 3 lipatan, seed 42, dan catat pesannya di kolom ini. | C3-0A3.png | | |
| 0.A.4 | Di Output Viewer, isi nama berkas `M1_cuaca.json` pada kotak nama, klik Export Model. | Peramban mengunduh `M1_cuaca.json`. Model ini setara D1 (data latih enam baris, kelas No dan Yes, prior 0,5 dan 0,5). | C3-0A4.png | | |

#### 0.B Mengekspor M2 (model teks mentah)

| Langkah | Tindakan persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| 0.B.1 | Impor `c3_teks_latih.csv` (menggantikan dataset). | `Teks` dan `Sentimen` bertipe String, Nominal. | C3-0B1.png | | |
| 0.B.2 | Analyze → Classify → Naive Bayes. Tab Variables: klik dua kali `Sentimen` (Target). Klik `Teks` di daftar tersedia lalu klik tombol panah **Move selected to Raw Text Variable**. | `Teks` tampil di zona Raw Text Variable; tab Text Preprocessing menjadi aktif. | C3-0B2.png | | |
| 0.B.3 | Tab Validation: seed 42 (Use random seed dicentang). OK. | Hasil muncul di Output Viewer. Bila muncul galat berkode (misalnya `NB_E_TEXT_EMPTY_VOCAB`), catat teksnya dan lanjutkan memakai R1 sebagai pengganti M2. | C3-0B3.png | | |
| 0.B.4 | Nama berkas `M2_teks.json`, klik Export Model. | `M2_teks.json` terunduh. | C3-0B4.png | | |

### M-29 (BB-29) Berkas bukan model dan berkas lebih dari 10 MB

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

### M-30 (BB-30) Model dari Output Viewer

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-30a | Muat ulang halaman (F5) sehingga Output Viewer kosong. Impor `c3_cuaca_uji.csv`. Analyze → Classify → Apply Model, tab Model, pilih **From Output Viewer**. | Pesan "No Naive Bayes models are saved in the Output Viewer yet." Tidak ada daftar pilihan. | C3-M30a.png | | |
| M-30b | Lakukan 0.A.1 sampai 0.A.3 sampai Output Viewer berisi hasil Naive Bayes (tanpa harus mengunduh). Lalu impor `c3_cuaca_uji.csv` dan buka Apply Model, pilih **From Output Viewer**. | Kotak pilihan "Output Viewer model" berisi satu butir berlabel waktu latih. | C3-M30b.png | | |
| M-30c | Pilih butir itu. | Kartu Model Summary memuat: Source (Output Viewer), Algorithm Naive Bayes, Target Play, Classes No, Yes, dan fitur Outlook (categorical), Temp (numerical). Tab lain aktif. | C3-M30c.png | | |
| M-30d | Ulangi dengan model teks (lakukan 0.B.1 sampai 0.B.3 tanpa memuat ulang halaman, lalu impor `c3_teks_uji.csv`). | Daftar memuat dua butir (terbaru di atas). Memilih model teks menampilkan Model Summary dengan baris variabel teks `Teks` dan sumber teks `raw`. | C3-M30d.png | | |

### M-31 (BB-31) Auto-map by name

Model: D1 atau M1. Dataset: `c3_cuaca_uji.csv`.

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-31a | Muat D1 (Upload file). Buka tab Variables. | Karena pemetaan otomatis berjalan saat model dimuat, baris Outlook dan Temp sudah terisi; Actual target terisi `Play`. Tidak ada pesan galat. | C3-M31a.png | | |
| M-31b | Ubah manual pilihan baris Temp menjadi `Outlook`. | Variabel `Outlook` dipakai dua fitur sehingga muncul galat `The variable "Outlook" is mapped to more than one feature. (AM_E_MAP_DUPLICATE)`; baris Temp (fitur numerik dipetakan ke variabel nominal) juga dapat menampilkan `AM_E_MAP_ROLE_MISMATCH`. OK nonaktif. | C3-M31b.png | | |
| M-31c | Klik **Auto-map by name**. | Pemetaan menimpa pilihan manual: Temp kembali ke `Temp`, Outlook ke `Outlook`, galat hilang, OK aktif. | C3-M31c.png | | |
| M-31d | Impor `c3_cuaca_tanpa_temp.csv`, buka ulang Apply Model dengan D1, klik Auto-map by name. | Outlook terpetakan; Temp tetap "Not mapped" (galat `AM_E_MAP_UNMAPPED` pada fitur Temp). | C3-M31d.png | | |

### M-32 (BB-32) Variabel model tidak ada di dataset

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-32a | Impor `c3_cuaca_uji.csv`. Muat model teks (R1 atau M2). Tab Variables. | Raw Text Variable menunjukkan "Not mapped" dengan galat `The raw text variable "Teks" is not mapped to a dataset variable. (AM_E_MAP_RAW_TEXT_UNMAPPED)`; tombol OK nonaktif. | C3-M32a.png | | |
| M-32b | Pilih `Outlook` (variabel STRING) pada Raw Text Variable. | Galat hilang; OK aktif (nilai kategori diperlakukan sebagai teks). Pilih `Temp` (numerik) bila tersedia: pesan `AM_E_MAP_RAW_TEXT_TYPE` ("must be mapped to a string variable"). | C3-M32b.png | | |
| M-32c | Impor `c3_cuaca_tanpa_temp.csv`. Muat D1 atau M1. | Fitur Temp "Not mapped", pesan `Feature "Temp" is not mapped to a dataset variable. (AM_E_MAP_UNMAPPED)`; OK nonaktif. | C3-M32c.png | | |
| M-32d | Pada dataset yang sama, buka tab Save lalu kembali ke Variables. | OK tetap nonaktif sampai pemetaan lengkap; tidak ada kolom hasil yang bisa dihasilkan. | C3-M32d.png | | |

Catatan penyimpangan dari tabel prompt: model Word-Vector yang kolomnya tidak ditemukan **tidak** memblokir OK (hanya peringatan). Jika Anda memiliki model Word-Vector dan ingin mengamatinya, muat model itu pada dataset tanpa kolom `VEC_`; yang diharapkan adalah ringkasan "m of V vector columns found; V-m treated as 0." dan OK tetap aktif. Catat hasilnya pada kolom ini.

### M-33 (BB-33) Prediksi dengan Actual target, nilai numerik acuan

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

### M-34 (BB-34) Nama kolom hasil bentrok

Model: D1. Dataset: `c3_cuaca_bentrok.csv` (sudah memiliki `NB_PredictedValue` dan `NB_PredictedProbability`).

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-34a | Impor `c3_cuaca_bentrok.csv`. Apply Model, muat D1, tab Save. | Pada daftar Columns to save, nama akhir `NB_PredictedValue_1` dan `NB_PredictedProbability_1`, ikon peringatan di kedua baris, dan banner "Some column names were adjusted automatically because they conflict with existing names or are invalid." | C3-M34a.png | | |
| M-34b | Klik OK. | Toast "… New columns: NB_PredictedValue_1, NB_PredictedProbability_1." Data Editor memuat empat kolom: dua lama (nilai `x` dan `0` tidak berubah) dan dua baru. | C3-M34b.png | | |
| M-34c | Output Viewer, tabel Saved Variables. | Baris "Predicted value" dan "Max probability" menunjukkan Final Name `NB_PredictedValue_1` dan `NB_PredictedProbability_1`. | C3-M34c.png | | |
| M-34d | Buka Apply Model lagi pada dataset yang sama (setelah M-34b), muat ulang D1 (dataset berubah sehingga form direset), lalu OK. | Nama akhir bersufiks `_2`. Kolom lama dan hasil sebelumnya tidak ditimpa. | C3-M34d.png | | |
| M-34e | Tab Save: ubah Name prefix menjadi `HASIL`. | Nama akhir `HASIL_PredictedValue`, `HASIL_PredictedProbability`; banner peringatan hilang. | C3-M34e.png | | |
| M-34f | Tab Save: centang Use custom names, isi kedua kolom dengan `Hasil` dan `hasil`. | Galat `The column name "hasil" is used more than once among the result columns. (AM_E_NAME_DUPLICATE)` dan OK nonaktif. | C3-M34f.png | | |

### M-35 (BB-35) Isi Output Viewer setelah prediksi

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-35a | Setelah M-33b, buka Output Viewer. | Entri log "Apply Model", analytic "Apply Model Result", dan tabel berurutan: Model Summary, Case Processing Summary, Prediction Distribution, Saved Variables, Evaluation Metrics, Cohen's Kappa, Confusion Matrix. | C3-M35a.png | | |
| M-35b | Tabel Model Summary. | Source "File: nb-model-v1_1.json"; Algorithm Naive Bayes; Schema Version 1.1; Trained At 2026-10-01T00:00:00.000Z; Target Play; Classes No, Yes; dua baris Feature: "Outlook → Outlook (categorical)" dan "Temp → Temp (numerical)"; Smoothing alpha 1; Variance floor 1e-9; Validation (training) "Holdout 70% / 30%, seed 42". | C3-M35b.png | | |
| M-35c | Tabel Prediction Distribution. | No: 2 (40); Yes: 3 (60); Not scored 1; Total 6. | C3-M35c.png | | |
| M-35d | Pada dialog Apply Model tab Output, hilangkan centang Model summary, Evaluation metrics, Confusion matrix; jalankan ulang. | Hanya Case Processing Summary, Prediction Distribution, Saved Variables yang muncul; Saved Variables selalu ada. | C3-M35d.png | | |
| M-35e | Impor `c3_teks_uji.csv`, muat R1 (`nb-model-v2_0-raw.json`), Raw Text Variable `Teks`, Actual `Sentimen`, OK. | `NB_PredictedValue`: pos, neg, (kosong), pos. `NB_PredictedProbability`: 0,8491, 0,7596, (kosong), 0,9906. Model Summary memuat baris Text Variable "Teks → Teks (raw text)", Text source raw, Text likelihood multinomial, Rows with empty text 1. Case Processing Summary: Total Rows 4, Scored 3, Not Scored 1. Prediction Distribution: neg 1 (33,333), pos 2 (66,667), Not scored 1, Total 4. | C3-M35e.png | | |
| M-35f | Evaluasi pada M-35e. | Confusion Matrix: neg→pos 1; pos→neg 1, pos→pos 1. Macro Average 0,25 / 0,25 / 0,25; Overall Accuracy 0,333; Cohen's Kappa −0,5. | C3-M35f.png | | |

### M-36 (BB-36) Menutup dan membuka kembali menu Naive Bayes

Dasar: pengaturan hanya tersimpan saat **OK** ditekan dan validasi lolos (bukan otomatis saat diubah; lihat BUGS_C3.md, C3-01). Pengaturan dibaca lagi saat panel dibuka, dengan syarat daftar variabel (nama, tipe, measure) sama.

| ID | Langkah persis | Hasil yang diharapkan | Tangkapan layar | Lulus | Gagal |
|---|---|---|---|---|---|
| M-36a | Impor `c3_cuaca_latih.csv`. Buka Naive Bayes. Target `Play`; tab Options: Smoothing Alpha 0,5; tab Validation: Cross-Validation Folds, Number of Folds 5, Use random seed dicentang, Seed 42; tab Output: matikan Confusion Matrix. Klik OK. | Dialog menutup. Pengaturan disimpan sebelum analisis dijalankan; bila analisis menolak data sekecil ini (enam baris, lima lipatan), catat pesannya dan tetap lanjut ke M-36b. | C3-M36a.png | | |
| M-36b | Buka lagi Analyze → Classify → Naive Bayes (tanpa memuat ulang halaman). | Target `Play` terisi (tidak lagi di daftar tersedia); Smoothing Alpha 0,5; Validation = Cross-Validation Folds, 5, seed 42 dicentang; Confusion Matrix tidak dicentang. | C3-M36b.png | | |
| M-36c | Ubah Smoothing Alpha menjadi 2, klik **Cancel**, buka lagi. | Smoothing Alpha masih 0,5 (perubahan yang dibatalkan tidak tersimpan). | C3-M36c.png | | |
| M-36d | Muat ulang halaman (F5), periksa apakah dataset masih ada, buka Naive Bayes. | Catat dua kemungkinan: (1) dataset masih ada dan pengaturan pulih seperti M-36b; (2) dataset hilang atau berbeda sehingga form kembali ke bawaan (aturan fingerprint dataset). Keduanya sah menurut kode; tulis yang terjadi di kolom ini. | C3-M36d.png | | |
| M-36e | Impor `c3_cuaca_uji.csv` (dataset dengan daftar variabel sama: Outlook, Temp, Play), buka Naive Bayes. | Bila nama, tipe, dan measure variabel sama dengan saat OK terakhir, pengaturan tetap pulih. Lalu impor `c3_teks_latih.csv` dan buka lagi: form kembali ke bawaan (Target kosong, Smoothing Alpha 1, holdout 70). | C3-M36e.png | | |
| M-36f | Klik **Reset**, tutup dengan Cancel, buka lagi. | Seluruh pengaturan bawaan; Reset menghapus penyimpanan. | C3-M36f.png | | |
