
## 4. Peta penempatan ke Bab V

Usulan struktur. Sesuaikan dengan template buku Yedija; yang tidak boleh diubah adalah **kolom tabel** dan **angkanya**. "Lampiran A §n" berarti bagian bernomor n di `REPORT.md` yang disalin di Lampiran A.

| Usulan subbab | Isi | Format kolom tabel (persis) | Sumber |
|---|---|---|---|
| V.1 Lingkungan dan baseline | Perangkat, versi alat, hasil tes yang sudah ada | `\| Lapisan \| Lokasi pengujian \| Jumlah kasus \| Lulus \| Gagal \| Cakupan baris \|` | Lampiran A §2–3, Lampiran C |
| V.2 Pengujian unit (Track A) | Cakupan unit baru, tes karakterisasi, estimasi celah | tabel baseline sesudah Track A; daftar tes per area | Lampiran A §4 |
| V.3 Pengujian white-box (Track B) | Flow graph, V(G), basis set jalur | `\| Simpul \| Pernyataan \|`; `\| Jalur \| Simpul \| Masukan \| Keluaran yang diharapkan \| Hasil \|`; rekap `\| Fungsi \| Menu \| V(G) \| Jalur independen \| Kasus lulus \|` | Lampiran A §5 |
| V.4 Pengujian black-box (Track C) | 36 skenario | `\| ID \| Fitur \| Skenario \| Hasil yang diharapkan \| Hasil aktual \| Status \| Cara uji (otomatis/manual) \| Bukti \|` | Lampiran A §6 |
| V.5 Akurasi numerik (Track D) | Perbandingan dengan scikit-learn dan WEKA | `\| Konfigurasi \| Perangkat \| Akurasi \| Kappa \| Macro F1 \|` (6 desimal); `\| Konfigurasi \| Pembanding \| Kelas prediksi sama (x/270) \| Galat absolut maksimum probabilitas \| LRE minimum \|` | Lampiran A §7, Lampiran D |
| V.6 Waktu eksekusi (Track E) | Skalabilitas menurut ukuran data | `\| Menu dan konfigurasi \| Dataset \| Jumlah term \| Rata-rata (ms) \| Simpangan baku (ms) \|` | Lampiran A §8, Lampiran E |
| V.7 Integrasi antarmenu (Track F) | IT-01..IT-05 | `\| ID \| Skenario \| Hasil yang diharapkan \| Hasil aktual \| Status \| Bukti \|` | Lampiran A §9, Lampiran F |
| V.8 Temuan dan pembahasan | Daftar temuan, dampak, usulan | tabel indeks temuan (ID, tingkat, judul) | Lampiran A §10, Lampiran B |
| V.9 Keterbatasan | Ancaman validitas, NOT RUN | daftar bernomor | Lampiran A §11–12, Bagian 8–9 di sini |

Catatan tata letak. Tabel BB (8 kolom) lebar; pecah per menu (BB-01..13, BB-14..28, BB-29..36) atau pindahkan ke lampiran buku dan beri ringkasan di badan bab. Tabel simpul WB-2 punya puluhan baris; letakkan di lampiran buku dan kutip flow graph serta rekap di badan bab. Tabel Track E ada dua jalur (peramban dan headless): buku boleh memuat keduanya, dengan syarat label jalurnya tetap ditulis.

## 5. Buku klaim: apa yang boleh ditulis

### 5.1 Boleh ditulis tegas (didukung bukti [Win])

1. Seluruh tes lama (Rust 450, Jest 830) lulus sebelum paket evaluasi, sehingga evaluasi dimulai dari baseline hijau. Pustaka STWV Rust tidak memiliki tes sendiri.
2. 453 tes Jest dan 136 fungsi tes Rust baru lulus; jumlah per track seperti pada Bagian 3.
3. Kompleksitas siklomatik keempat fungsi white-box: 7, 29, 13, 6, diverifikasi dengan skrip (jumlah sisi, simpul, predikat, dan rank matriks jalur). 54 dari 55 jalur struktural layak dan semuanya lulus; satu jalur WB-3 tidak layak karena `TargetVar` tidak berubah antara dua pemeriksaan.
4. Kelas prediksi Statify sama dengan scikit-learn 1.9.1 pada 17.221 dari 17.221 prediksi (24 konfigurasi; pilkada, SMS Spam, SmSA); akurasi, Kappa, dan Macro F1 identik sampai 6 desimal; parameter model cocok sampai galat absolut maksimum 2,665e-15 (Windows; 1,776e-15 di VM).
5. Selisih probabilitas keluaran Apply Model terhadap scikit-learn paling besar sekitar 5,0e-5 dan seluruhnya dijelaskan oleh pembulatan 4 desimal (`round4`) pada wasm Apply Model, bukan oleh galat rumus.
6. Pada pilkada, kelas prediksi sama dengan WEKA 3.9.6 pada 264–267 dari 270 dokumen dengan Words to Keep bawaan (1.000); selisihnya berasal dari perbedaan definisi (WEKA mempertahankan semua kata seri di batas, 1.042 kata, sedangkan Statify memotong tepat 1.000), dan bila kosakata disamakan hasilnya 270 dari 270.
7. IT-01, IT-02, IT-04, IT-05 terpenuhi: jumlah term model sama dengan jumlah kolom `VEC_`; Model Summary sama dengan model asal (6.017 angka model sama bit demi bit); kelas prediksi sama dengan scikit-learn pada 270/270 dokumen; prediksi identik byte demi byte setelah tulis-baca berkas.
8. Waktu eksekusi seperti pada tabel Track E Windows (Lampiran A §8). Contoh kalimat yang aman: "STWV default di peramban memerlukan 61,1 ms untuk 900 dokumen dan 4.138,3 ms untuk 36.305 dokumen (rata-rata lima pengukuran setelah satu pemanasan, Chrome 154 headless, Windows 11)".
9. Temuan E-01: STWV dengan stemming Sastrawi membatalkan seluruh proses (panic wasm `unreachable`) pada SMS Spam, gabungan 17.974, dan dataset 36.305 dokumen; varian ASCII berjalan. Reproduksi ada di `BUGS.md` E-01.

### 5.2 Boleh ditulis dengan catatan wajib

| Klaim | Catatan wajib |
|---|---|
| "Perilaku `KFolds = 1` terdokumentasi" (A-1) | Tes `k1_*` adalah tes karakterisasi: data latih kosong, semua prediksi jatuh ke kelas alfabetis pertama, akurasi 3/9, Kappa 0. Itu perilaku saat ini yang dinilai sebagai cacat validasi, bukan perilaku yang dikehendaki. |
| "IT-03 lulus" | Tulis **"Lulus dengan catatan"**. Kriteria asli (selisih ≤ 1e-9) tidak terpenuhi secara harfiah pada kolom probabilitas keluaran karena `round4` pada desain; terpenuhi pada kelas (630/630), parameter model (selisih 0, 6.017–8.017 angka), dan skor acuan. Kriteria tidak dilonggarkan diam-diam; kontrol negatif membuktikan keluaran tidak dapat membedakan 1e-9 dari 5e-5. |
| "Statify sama dengan WEKA" | Hanya untuk pilkada, hanya K1, K2, K3, K5 yang punya pembanding WEKA, dan harus menyebut perbedaan definisi (aturan seri Words to Keep, prior ber-Laplace, keluaran Complement WEKA berupa distribusi 0/1). OpenJDK 11 dipakai pada sebagian run WEKA di VM, bukan JRE Zulu 17 bawaan WEKA. Tidak ada pembanding WEKA untuk K4 dan K6, dan stemming Sastrawi (K6) tidak punya pembanding eksternal. |
| "Akurasi konfigurasi X lebih baik dari Y" | Data uji pilkada hanya 270 dokumen (galat baku akurasi sekitar 2,6 poin persentase), satu pembagian data, tanpa uji signifikansi. Tulis sebagai pengamatan, jangan sebagai peringkat. Contoh: K6 (0,722222) lebih rendah dari K1 (0,762963) pada data ini. |
| "Peramban lebih lambat daripada headless" | Rasio peramban/headless: STWV default 1,2–1,4×, NB holdout 1,6–4,1×, NB 10-fold 1,2–2,2×, AM 1,8–3,9×. Overhead tetap Worker hanya 54,6–74,5 ms (STWV 2,6 ms). Selisih 4,8–8,7 detik pada 36.305 dokumen **tidak** dijelaskan oleh overhead tetap; penyebabnya tidak diisolasi. Jangan menyebut sebab tanpa data. |
| "Waktu tumbuh linear" | Hanya STWV default hampir linear terhadap dokumen (sekitar 0,07 ms/dokumen sampai 17.974 dokumen; 0,114 ms/dokumen pada 36.305 karena dokumennya lebih panjang: rata-rata 114,0 token vs 14,8–29,1). NB 10-fold headless hampir proporsional dengan jumlah **token** (4,34–4,72 ms per 1.000 token). Hubungkan dengan token, bukan hanya dokumen. |
| "UI responsif" | Hanya STWV menghasilkan Long Task di main thread (101 ms pada 11.000 dokumen, 195 ms pada 17.974, 441 ms pada 36.305; ambang 200 ms terlewati pada ukuran terbesar). NB dan AM tidak menghasilkan Long Task. Pengukuran hanya mencakup Worker dan wasm, bukan klik sampai Output Viewer. |
| "Tidak ada regresi" | Berlaku untuk tes otomatis (Jest dan Rust) yang ada. Antarmuka nyata belum diuji manual. |
| "Cakupan kode" | Cakupan Jest sesudah Track A diukur hanya di VM (STWV 51,37 → 53,39%; NB 87,01 → 87,01%; AM 97,50 → 97,77%); cakupan baseline Windows STWV 52,24%, NB 86,64%, AM 97,21%. Cakupan Rust **tidak terukur**; yang ada hanya estimasi statis celah (A_unit §4.2, yaitu bagian 4 di Lampiran A). Jangan menulis persentase cakupan Rust. |
| "Dataset 36.305 dokumen" | Hanya untuk beban waktu. Label campuran (25 kelas), bukan untuk akurasi. Lisensi 20 Newsgroups belum diverifikasi. |
| "Kesetaraan biner wasm dengan sumber" | Biner `pkg/*.wasm` yang sudah ada di repo dipakai apa adanya; kesesuaiannya dengan sumber Rust terkini diperiksa oleh tes `eval_compare.rs` (lulus di Windows), bukan oleh build ulang. |

### 5.3 Jangan ditulis (tidak didukung data)

1. Persentase cakupan Rust, atau klaim "semua baris Rust teruji".
2. Hasil pengujian manual dan end-to-end di peramban nyata (M-01..M-36, MF-01..MF-05, Playwright aplikasi penuh): belum dijalankan.
3. Kesimpulan bahwa Statify "lebih akurat" atau "lebih cepat" dari scikit-learn atau WEKA. Yang diukur: kesetaraan numerik terhadap scikit-learn; kesamaan terbatas terhadap WEKA; waktu Statify saja (scikit-learn dan WEKA tidak diukur waktunya).
4. Waktu eksekusi Rust native (tidak diukur) dan waktu pada perangkat selain perangkat skripsi.
5. Penyebab pasti selisih peramban vs headless, dan penyebab pasti E-01 di dalam pustaka `sastrawi-rs` (yang tercatat: gejala, reproduksi, dan pemicu token berkarakter kedua multibita).
6. Bahwa 36.305 dokumen mewakili korpus Indonesia: sebagian besar tambahan berbahasa Inggris (20 Newsgroups).
7. Hasil WEKA untuk SMS Spam dan SmSA di Windows: hanya dijalankan di VM (OpenJDK 11); di Windows hanya pilkada yang diulang.
8. Klaim tentang pengalaman pengguna (kemudahan, kepuasan): tidak ada pengujian pengguna.
