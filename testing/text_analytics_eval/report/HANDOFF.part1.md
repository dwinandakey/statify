# HANDOFF — Paket evaluasi modul Text Analytics Statify untuk penulisan skripsi (Bab V)

| Butir | Isi |
|---|---|
| Penerima | Agen penulis skripsi (model Opus, penalaran tinggi) yang bekerja untuk Yedija Lewi Suryadi |
| Pemilik skripsi | Yedija Lewi Suryadi (yedijalewisuryadi@gmail.com) |
| Objek evaluasi | Modul Text Analytics aplikasi Statify: String to Word Vector (STWV), Naive Bayes (NB), Apply Model (AM), dan pustaka inti Rust `statify-text-core` |
| Repo | `E:\KULIAH\Skripsi\statify64`; paket evaluasi di `testing/text_analytics_eval/` |
| Cabang kerja | Dikerjakan di `text-analytics-eval` (semula `thesis-eval`). Per 8 Oktober 2026 cabang itu sudah digabung ke `dija-v2` (merge `5bcdd914`; hanya menambah file, perbandingan sebelum digabung: 702 berkas, semuanya Added, tanpa perubahan kode produksi), lalu `dija-v2` diperbarui dengan `origin/main` (merge `e85f90d9`; tanpa konflik). Perubahan dari `main` tidak menyentuh empat folder modul yang dievaluasi (STWV, NB, AM, `statify-text-core`): `git diff --stat` pada keempat folder itu kosong, sehingga hasil evaluasi tetap berlaku. `33b1b7e02cf6f47209020be61fdcd460f6817de1` adalah commit yang tercatat saat lingkungan Windows dicatat; hash commit akhir tidak dicantumkan di sini karena akan berubah setiap kali berkas ini di-commit (lihat `git log`). **Cakupan berlakunya hasil:** semua angka diperoleh dengan kode produksi pada commit basis `f82ddf0c85aaf69d5618baaee274b01b3ab8e4a9` (HEAD `dija-v2` saat baseline direkam, 7 Oktober 2026). Bila kode di empat folder modul berubah kemudian, eksekusi ulang `run_all.ps1` diperlukan sebelum angka dipakai di buku |
| Dibangun | 8 Oktober 2026, oleh `tools/build_handoff.py` dari berkas-berkas paket evaluasi (tidak ada angka diketik ulang di lampiran) |
| Status paket | Semua track A–F sudah dieksekusi penuh di perangkat uji skripsi (Windows 11). Yang belum: pengujian manual di antarmuka nyata (M-01..M-36, MF-01..MF-05) dan beberapa butir pada Bagian 9 |

## 0. Cara memakai dokumen ini

Dokumen ini punya dua lapis. **Bagian 1 sampai 11** adalah arahan ringkas yang ditulis tangan: aturan, hasil, peta penempatan ke Bab V, daftar klaim yang boleh dan tidak boleh ditulis, temuan, keterbatasan, serta tugas yang tersisa. **Lampiran A sampai F** menyalin utuh dokumen sumber (laporan gabungan, temuan, lingkungan, dan dokumen track) sehingga semua angka dapat diperiksa tanpa membuka berkas lain. Cari lampiran dengan mencari judul `# LAMPIRAN A`, `# LAMPIRAN B`, dan seterusnya. Gambar flow graph (`whitebox/*.png`) tidak ikut tertanam; tabel simpul dan daftar sisi sudah ada dalam teks.

Urutan kepercayaan bila ada angka yang tampak bertentangan: (1) log mentah di `logs/` berlabel Windows, (2) `REPORT.md` (Lampiran A), (3) dokumen track (Lampiran D sampai F), (4) arahan di Bagian 1 sampai 11. Bila Anda menemukan konflik yang tidak terjelaskan, **jangan memilih sendiri**: catat dan tanyakan kepada Yedija.

## 1. Aturan integritas data (wajib dipatuhi)

1. **Jangan mengarang atau membulatkan sendiri angka.** Setiap angka di buku harus dapat ditelusuri ke tabel di Lampiran A atau log yang disebut di sana. Bila suatu angka tidak ada, tulis "belum diukur" dan tanyakan.
2. **Yang tidak dieksekusi ditulis NOT RUN beserta alasannya**, tidak dilunakkan menjadi "diperkirakan lulus". Daftar lengkapnya ada di Bagian 9 dan Lampiran A bagian 11.
3. **Label perangkat.** Hanya hasil berlabel **[Win]** (Lenovo IdeaPad Gaming 3, Ryzen 5 4600H, Windows 11, konfigurasi Jest produksi) yang boleh menjadi angka resmi di buku. Label **[VM]** (VM Linux, ts-jest, 2 vCPU) dan sandbox cloud hanya pembanding atau uji asap; angka waktu dari keduanya tidak boleh masuk tabel buku.
4. **Kode produksi tidak diubah** oleh paket ini. Perbandingan cabang evaluasi dengan `dija-v2` (diserahkan Yedija) menunjukkan 702 berkas, seluruhnya berstatus Added, tanpa berkas produksi yang dimodifikasi. Temuan hanya dilaporkan, perbaikannya tidak diterapkan.
5. **Seed acak 42** di semua tempat; toleransi numerik 1e-6 kecuali ditentukan lain.
6. **Format tabel.** Kolom tabel buku harus persis seperti spesifikasi asli (Bagian 4). Angka memakai **koma desimal** dan titik pemisah ribuan pada tabel buku (contoh `4.138,3`). Angka di log mentah tetap memakai titik desimal; jangan mencampur.
7. **Perilaku saat ini bukan berarti perilaku yang benar.** Beberapa tes Rust (misalnya `k1_*` untuk A-1) mengunci perilaku kode apa adanya (tes karakterisasi). Tes itu lulus berarti perilaku tersebut terjadi, bukan berarti perilaku itu diinginkan. Jangan menulis "terbukti benar" untuk hal seperti ini.
8. **Kesetaraan dengan pembanding bukan bukti kebenaran mutlak.** "Sama dengan scikit-learn" berarti keluaran Statify cocok dengan implementasi acuan itu pada data dan konfigurasi yang diuji.
9. **Jangan menjalankan atau menyarankan perintah git** kepada Yedija atas nama agen lain; commit dan push dilakukan Yedija sendiri.

## 2. Konteks singkat

**Statify** adalah aplikasi statistik berbasis web (Next.js 15 dan TypeScript) dengan komputasi Rust yang dikompilasi ke WebAssembly dan dijalankan di Web Worker. Modul Text Analytics terdiri dari tiga menu dan satu pustaka:

- **String to Word Vector (STWV)**: mengubah kolom teks menjadi kolom vektor kata `VEC_<kata>` (pembersihan, n-gram, stopword, stemming Sastrawi untuk Indonesia atau Porter untuk Inggris, TF/IDF/normalisasi, Words to Keep, Min term frequency). Sasaran perbandingan: preset "Default Weka" dan preset "scikit-learn".
- **Naive Bayes (NB)**: Multinomial, Bernoulli, Complement, dan Gaussian; dapat memakai Raw Text (pipeline STWV tertanam) atau kolom Word-Vector; evaluasi holdout atau k-fold; ekspor model JSON.
- **Apply Model (AM)**: memuat model JSON, memetakan variabel, memprediksi data baru, membulatkan probabilitas keluaran ke 4 desimal (`round4`).
- **`statify-text-core`**: crate Rust yang dipakai bersama oleh NB dan AM (pipeline teks, formula, model). Versi `sastrawi-rs` berbeda antar-crate (0.5.1 pada STWV; 0.5.3 pada core, NB, AM), lihat temuan D-01.

**Tujuan evaluasi (Bab V skripsi).** Menunjukkan, dengan bukti yang dapat diulang, bahwa modul ini (A) teruji pada tingkat unit, (B) teruji pada tingkat jalur logika, (C) berperilaku sesuai spesifikasi dari sisi pengguna, (D) menghasilkan angka yang sama dengan scikit-learn dan dapat dibandingkan dengan WEKA, (E) berjalan dalam waktu wajar pada ukuran data realistis, dan (F) konsisten ketika ketiga menu dipakai berantai; sekaligus mencatat temuan dan keterbatasannya apa adanya.

**Perangkat uji skripsi.** Lenovo IdeaPad Gaming 3 15ARH05 (kode model 82EY), AMD Ryzen 5 4600H (6 inti, 12 thread), RAM 15,4 GB, Windows 11 Home 10.0.26300, rustc/cargo 1.93.0, Node 24.13.1, Jest 30.0.4, scikit-learn 1.9.1 (Python 3.13.12), WEKA 3.9.6, Chrome 154.0.8037.98, paket daya Balanced, adaptor tersambung. Rincian di Lampiran C.

**Dataset.** `pilkada_train.csv` (630 dokumen) dan `pilkada_test.csv` (270 dokumen), korpus acuan; SMS Spam (5.574 dokumen; 3.901 latih dan 1.673 uji pada Track D); SmSA (11.000 latih dan 500 uji pada Track D; tiga kelas); gabungan ketiganya 17.974 dokumen; dan dataset 36.305 dokumen (gabungan 17.974 ditambah 20 Newsgroups 18.331 dokumen, label campuran 25 kelas) yang **hanya dipakai untuk beban waktu pada Track E**, bukan untuk akurasi. Asal dan lisensi SMS Spam, SmSA, dan 20 Newsgroups belum diverifikasi (Bagian 8).

## 3. Hasil dalam satu halaman

| Track | Apa yang dikerjakan | Hasil utama (semua [Win] kecuali disebut) | Sumber (Lampiran A) |
|---|---|---|---|
| Baseline | Menjalankan tes yang sudah ada sebelum paket ini | Rust 450 lulus (inti 91, NB 203, AM 156, STWV 0 tes); Jest 830 lulus (STWV 111, NB 253, AM 466); 0 gagal. Cakupan baris Jest: STWV 52,24%, NB 86,64%, AM 97,21%. Cakupan Rust tidak terukur (`cargo-llvm-cov` tidak terpasang) | Bagian 3 |
| A. Unit | Tes unit tambahan | 105 tes Jest dan 66 fungsi tes Rust, semua lulus. Mengunci formula (TF, IDF, normalisasi), batas kosakata, pipeline teks, partisi holdout/k-fold MT19937 seed 42, pemuat model | Bagian 4 |
| B. White-box | Basis path pada 4 fungsi | V(G): WB-1 = 7, WB-2 = 29, WB-3 = 13, WB-4 = 6 (jumlah 55). 54 jalur layak, 54 tes Jest lulus. WB-3 hanya 12 jalur layak independen (rank 12) karena dua predikat membaca variabel yang sama | Bagian 5 |
| C. Black-box | BB-01..BB-36 | 36 skenario punya pemeriksaan otomatis yang lulus (Jest 35 + 63 + 95 = 193 tes; Rust 31 + 24 + 12 = 67 tes). Komponen manual (M-01..M-36) **belum dijalankan** | Bagian 6 |
| D. Akurasi | Statify vs scikit-learn vs WEKA | Kelas prediksi Statify = scikit-learn pada **17.221 dari 17.221** prediksi (24 konfigurasi, 3 dataset); metrik identik sampai 6 desimal. WEKA: 264–267 dari 270 pada W=1.000, **270 dari 270** bila kosakata disamakan. Selisih probabilitas ≤ 5,0e-5 dijelaskan seluruhnya oleh pembulatan `round4` | Bagian 7 |
| E. Waktu | Peramban (Worker asli) dan headless (Node) | STWV default di peramban: 61,1 ms (900 dok) sampai 4.138,3 ms (36.305 dok). NB 10-fold 36.305 dok: 26.624,7 ms (peramban), 17.960,9 ms (headless). Sastrawi gagal pada 3 dataset (E-01) | Bagian 8 |
| F. Integrasi | IT-01..IT-05 | IT-01, 02, 04, 05 terpenuhi; IT-03 **Lulus dengan catatan** (kriteria 1e-9 tidak terpenuhi secara harfiah pada probabilitas keluaran karena `round4`; terpenuhi pada parameter dan skor acuan) | Bagian 9 |
| Temuan | `BUGS.md` | 25 butir: 1 tinggi (E-01), 5 sedang (A-1, C2-01, C2-02, C2-03, D-01), sisanya rendah atau informasi | Bagian 10 |

Eksekusi penuh Jest di Windows: 1.283 tes (baseline 830 + evaluasi 453), 75 suite, semua lulus. Seluruh 136 fungsi tes Rust baru (`eval_*.rs`) dikompilasi pada percobaan pertama dan lulus. Eksekusi ulang menyeluruh `run_all.ps1` di Windows pada 8 Oktober 2026 selesai dengan kode keluar 0 pada setiap langkah.

Angka tes per track (Jest [Win] / fungsi tes Rust [Win]): A 105 / 66; B 54 / –; C1 35 / 31; C2 63 / 24; C3 95 / 12; D 3 / 1; F 98 / 2. Jumlah: 453 / 136.
