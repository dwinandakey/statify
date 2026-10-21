# REPORT — Evaluasi modul Text Analytics Statify (String to Word Vector, Naive Bayes, Apply Model)

Dokumen ini digenerate oleh `tools/build_report.py` dari `report/REPORT.template.md`. Tabel disalin dari dokumen track yang sudah diisi `tools/apply_results.py`; angka jumlah tes dihitung dari `logs/`. Jangan menyunting `REPORT.md` langsung: ubah templat atau dokumen sumber, lalu jalankan ulang perintah di Bagian 1. Angka memakai koma desimal; angka di dalam log mentah tetap titik desimal.

## Ringkasan eksekutif

Paket evaluasi menambahkan tes unit (Track A), white-box basis path (B), black-box BB-01..BB-36 (C), perbandingan numerik dengan scikit-learn dan WEKA (D), pengukuran waktu (E), dan tes integrasi IT-01..IT-05 (F) tanpa mengubah satu baris pun kode produksi. Seluruh pengerjaan dilakukan di lingkungan tanpa akses jaringan (tidak ada crates.io, npm, PyPI), sehingga pembagian hasil sebagai berikut harus dibaca apa adanya.

{{auto:status}}

- **Yang sudah dijalankan dan lulus di perangkat skripsi (Windows 11).** Seluruh 453 tes Jest baru lulus dengan konfigurasi Jest produksi, dan seluruh 136 fungsi tes Rust baru (`eval_*.rs`) dikompilasi pada percobaan pertama dan lulus (rustc 1.93.0, 8 Okt); setelah enam tes duplikat dihapus 21 Oktober 2026 dan dua tes karakterisasi `k1_*` diganti tes penolakan (fold minimal 2) tersisa 129 fungsi, semuanya lulus pada uji ulang Windows 22 Oktober 2026 (rustc 1.99.1); paket Jest evaluasi kini 456 tes. Lima skrip integrasi Node IT-01..IT-05 dan alur perbandingan numerik Track D (scikit-learn 1.9.1 dan WEKA 3.9.6) dijalankan ulang di Windows dengan hasil yang sama dengan VM. Pengukuran waktu Track E dijalankan di perangkat skripsi. Eksekusi penuh ulang di VM (tes lama dan baru) tidak menunjukkan regresi (tabel "Eksekusi penuh Jest").
- **Yang belum dijalankan.** Daftar periksa manual (M-01..M-36 dan MF-01..MF-05) dan butir lain pada Bagian 11, serta pengukuran Track E di luar perangkat skripsi (Rust native tidak diukur; spesifikasi Playwright aplikasi penuh tidak divalidasi).
- **Baseline Windows 7–8 Okt (tes yang sudah ada sebelum paket ini).** Rust 450 tes lulus (inti 91, Naive Bayes 203, Apply Model 156; STWV tidak punya tes) dan Jest 830 tes lulus (STWV 111, Naive Bayes 253, Apply Model 466), tanpa kegagalan (Bagian 3); eksekusi ulang di Windows pada 8 Oktober 2026 memberi angka yang sama. **Keadaan terkini (uji ulang Windows 22 Oktober 2026, rustc/cargo 1.99.1, Node 24.20.0, Jest 30.0.5; `LAPORAN_UJI_ULANG_22Okt.md`):** Rust 564 lulus (inti 155, Naive Bayes 242, Apply Model 167; 435 lama + 129 evaluasi) dan Jest 1.250 lulus dalam 80 suite (STWV 171, Naive Bayes 388, Apply Model 691; 794 lama + 456 evaluasi); cakupan baris Jest dengan semua tes STWV 72,18%, Naive Bayes 94,43%, Apply Model 97,80%.
- **Temuan.** 25 butir di `BUGS.md` (Bagian 10): satu berkategori tinggi (E-01, panic wasm pada stemming Sastrawi dengan token berkarakter kedua multibita), lima berkategori sedang (A-1 `KFolds = 1`; C2-01..C2-03 pada antarmuka Naive Bayes; D-01 beda versi `sastrawi-rs` antar-crate), sisanya rendah atau informasi.
- **Kesetaraan numerik.** Pada 24 konfigurasi dan tiga dataset, kelas prediksi Statify sama dengan scikit-learn pada 17.221 dari 17.221 prediksi; selisih probabilitas keluaran Apply Model sepenuhnya akibat pembulatan 4 desimal (Track D, Bagian 7).

### Jumlah tes per track

{{auto:counts}}

Kolom "Sumber Jest" menunjukkan asal angka: Windows bila `jest_<track>_win.json` ada, jika tidak VM Linux. Tes Rust: kolom "Fungsi tes Rust ditulis" menghitung `#[test]` pada berkas `eval_*.rs`; hasilnya hanya tercatat bila ada `logs/rust_<target>.txt` dari Windows. Angka Jest per track berasal dari run 8 Okt; per 22 Okt 2026 Track A berisi 107 tes (satu tes rumus baru di `formula-output.eval.test.ts` dan satu tes penolakan fold 1 di `kfold.eval.test.ts`) dan Track C2 64 tes (BB-18 dipecah), sehingga paket evaluasi Jest berjumlah 456; angka Rust dari uji ulang 22 Okt 2026 (`logs/rust_final_win_*.txt`, `logs/rust_eval_*.txt`).

### Eksekusi penuh Jest (regresi)

{{auto:jestfull}}

Baris Windows dihitung dari log `baseline_jest_*_win.json` dan `jest_<track>_win.json` yang ditulis sebelum 4 tes `packedMatrix.test.ts` (STWV) ditambahkan; angka terkini uji ulang 22 Okt 2026 adalah 1.250 tes dalam 80 suite (794 lama + 456 evaluasi), semuanya lulus. Eksekusi penuh = semua berkas tes di tiga menu (tes lama dan tes baru) dalam potongan `tools/vm_chunk.sh`. Konfigurasi VM: ts-jest dan penyesuaian resolver (lihat `ENV.md`); bukan konfigurasi produksi. Di Windows tes lama (baseline: 830 lulus) dan tes baru (453 lulus) dijalankan terpisah dengan konfigurasi produksi oleh `run_all.ps1`, sehingga baris Windows di atas dijumlahkan dari dua kelompok itu (`baseline_jest_*_win.json` dan `jest_<track>_win.json`). Selisih 39 tes terhadap baris VM (1.322) berasal dari dua berkas whitebox lama milik pengguna (`hooks/__tests__/whitebox.getNumericInputError.test.ts` 29 tes dan `whitebox.useNaiveBayesValidation.test.ts` 10 tes; kedua berkas lama itu dihapus 21 Okt 2026) yang ikut dihitung di VM tetapi dikecualikan dari baseline Windows (`--testPathIgnorePatterns=hooks/__tests__/whitebox`); angka itu dicocokkan per berkas dari log. Yang berlaku untuk buku adalah baris Windows.

## 1. Cara menjalankan ulang (satu perintah)

Di Windows, dari akar repo `statify64`:

```
powershell -ExecutionPolicy Bypass -File frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\run_all.ps1
```

Skrip mencatat lingkungan, menjalankan baseline (Rust, Jest, cakupan), Track A, B, C1, C2, C3, D, F, lalu E (terakhir; jangan memakai komputer selama pengukuran), dan mengisi status dengan `python frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\tools\apply_results.py`. Opsi: `-SkipE`, `-SkipRust`, `-SkipBaseline`, `-SkipTracks`, `-Only A,B,C1,C2,C3,D,E,F`. Setelah selesai, bangun ulang dokumen akhir:

```
python frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\tools\apply_results.py
python frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\tools\merge_docs.py
python frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\tools\build_report.py
```

Skrip tidak menghapus berkas, tidak mengubah kode produksi, dan tidak melakukan commit atau push. Seed acak 42 dan toleransi numerik 1e-6 kecuali ditentukan lain. Perintah per track ada di `run_A.ps1` .. `run_F.ps1`.

**Catatan penamaan.** Paket ini semula bernama `thesis-eval`. Penamaan sekarang mengikuti cakupannya (khusus modul Text Analytics, karena modul lain memiliki evaluasi sendiri): folder `frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/`, folder tes `__tests__/eval/`, berkas Rust `tests/eval_*.rs` beserta data `tests/eval_data/`, konfigurasi `jest.eval.config.js`, dan variabel lingkungan berawalan `TA_EVAL_`. Log yang dibuat sebelum penggantian nama masih memuat nama lama; `tools/apply_results.py` memetakannya ke nama baru saat dibaca (fungsi `_legacy`, berkas log tidak diubah). Eksekusi ulang penuh akan menghasilkan log bernama baru, setelah itu pemetaan tersebut boleh dihapus.

## 2. Lingkungan

Perangkat uji skripsi: Lenovo IdeaPad Gaming 3, Ryzen 5 4600H, RAM 16 GB, Windows 11, rustc 1.93.0 (uji ulang 22 Okt 2026: rustc 1.99.1, Node 24.20.0, Chrome 155.0.8059.85), WEKA 3.9.6. Pengerjaan, scikit-learn, dan graphviz dijalankan di sandbox cloud; Jest dan skrip headless di VM Linux (Ryzen 5 4600H terlihat dari VM, 2 vCPU, 3,9 GB). Hanya perangkat Windows yang boleh dipakai untuk angka waktu di buku. Daftar versi lengkap, termasuk penyimpangan dari prompt (tanpa jaringan; ts-jest menggantikan SWC pada VM; biner wasm yang sudah dibangun dipakai apa adanya), ada di `ENV.md`.

## 3. Baseline (tes yang sudah ada)

{{include: 01_baseline.md | # 01 | 3}}

Interpretasi. Seluruh tes lama lulus pada eksekusi Windows baseline 7–8 Okt (Rust 450, Jest 830, tidak ada kegagalan), sehingga paket evaluasi dimulai dari baseline hijau. Pustaka STWV Rust tidak punya satu pun tes, dan cakupan Rust tidak terukur karena `cargo-llvm-cov` belum terpasang. Cakupan baris Jest paling rendah ada pada menu STWV (52,24%) karena komponen UI (`OptionsTab.tsx`, `VariablesTab.tsx`, `StringToWordVectorModal.tsx`, `useStringToWordVector.ts`) tidak punya tes; Naive Bayes 86,64% dan Apply Model 97,21%. Pengukuran VM (cakupan 51,37 / 87,01 / 97,50%) berbeda tipis karena instrumen dan himpunan berkas berbeda, dan hanya dipakai sebagai pembanding.

## 4. Track A — Pengujian unit tambahan

Kolom tabel: `| Berkas | Nama tes | Perilaku yang diuji | Status |`. Status [Win] adalah hasil eksekusi di Windows (perangkat skripsi); [VM] hasil di VM Linux; BELUM DIJALANKAN berarti belum ada log eksekusi.

{{include: A_unit.md | ### 3.1 | 3 | Track A — }}

{{include: A_unit.md | ### 3.2 | 3 | Track A — }}

{{include: A_unit.md | ### 4.1 | 3 | Track A — }}

Interpretasi. Tes Jest baru Track A seluruhnya lulus pada VM dan menutup celah yang terukur: cakupan baris STWV naik dari 51,37% ke 53,39%, Apply Model dari 97,50% ke 97,77%, Naive Bayes tidak berubah (87,01%) karena tes baru menyasar fungsi murni, bukan komponen React. Nilai harapan numerik dihitung independen dengan Python (80 kombinasi TF × IDF × normalisasi, 16 skenario batas kosakata, 5 skenario stopword, 18 skenario n-gram); 27 kombinasi yang sah menurut scikit-learn dibandingkan langsung dengan `TfidfVectorizer` tanpa selisih. Tes Rust Track A (66 fungsi pada 8 Okt; 60 sejak 21 Okt 2026 setelah 6 tes duplikat dihapus; 59 per 22 Okt 2026 setelah fold minimal 2) lulus di Windows. Temuan utama: `KFolds = 1` diterima oleh antarmuka dan validator Rust (BUGS.md A-1); kedua sisi terbukti oleh tes yang dijalankan (tes karakterisasi `k1_*` lulus, artinya perilaku itu benar-benar terjadi).

## 5. Track B — White-box basis path

Kolom tabel rekap: `| Fungsi | Menu | V(G) | Jalur independen | Kasus lulus |`. Tabel simpul, daftar sisi, dan basis set jalur per fungsi diambil dari `B_whitebox.md`; graf alir (DOT dan PNG) ada di `whitebox/`.

{{include: B_whitebox.md | ## Rekap | 3 | Track B — }}

{{include: B_whitebox.md | ## WB-* | 3 | Track B — }}

Interpretasi. Empat fungsi dianalisis: `validateColumnPrefix` (V(G) = 7), `getNumericInputError` (29), `useNaiveBayesValidation` (13), dan `loadModelFromFile` (6), dengan V(G) diverifikasi lewat jumlah sisi, simpul, dan rank matriks jalur. Dari 55 jalur basis, 54 layak dan seluruhnya lulus sebagai tes Jest [Win] (konfigurasi produksi); satu jalur pada WB-3 tidak layak (infeasible) dan ditandai eksplisit. Setiap kondisi majemuk dipecah per operan agar jalur mencerminkan pencabangan nyata. Tidak ada kegagalan tes; dua pengamatan berprioritas rendah dicatat pada BUGS.md B-1 dan B-2.

## 6. Track C — Pengujian black-box (BB-01 sampai BB-36)

Kolom tabel: `| ID | Fitur | Skenario | Hasil yang diharapkan | Hasil aktual | Status | Cara uji (otomatis/manual) | Bukti |`. Kolom "Hasil yang diharapkan" adalah versi yang sudah dicocokkan dengan kode sumber (kode galat dan pesan dibaca dari kode, bukan dari tabel prompt); selisihnya dijelaskan pada "Catatan penyesuaian" di `C_blackbox.md`. Skenario yang butuh antarmuka nyata berstatus MANUAL dan ada di `C_manual_checklist.md`.

### 6.1 String to Word Vector (BB-01..BB-13)

{{include: C_blackbox_C1.md | ## Tabel hasil | 4}}

### 6.2 Naive Bayes (BB-14..BB-28)

{{include: C_blackbox_C2.md | ## Tabel hasil | 4}}

### 6.3 Apply Model dan persistensi Naive Bayes (BB-29..BB-36)

{{include: C_blackbox_C3.md | ## Tabel hasil | 4}}

Interpretasi. Skenario diuji pada tiga lapis: komponen React asli dirender di jsdom, fungsi inti dipanggil lewat Jest atau Rust native, dan langkah manual di aplikasi. Seluruh tes Jest Track C lulus di Windows (35 untuk C1, 63 untuk C2, 95 untuk C3) dan tes Rust C1/C2/C3 lulus (31, 24, 12); semua langkah manual belum dijalankan. Kode galat yang diperiksa terhadap sumber (mis. `INVALID_REGEX`, `EMPTY_VOCABULARY`) sesuai tabel prompt; selisih lain dicatat pada bagian "Catatan penyesuaian" di `C_blackbox.md`. Temuan antarmuka yang terkonfirmasi lewat tes Jest: pesan validasi Naive Bayes tidak pernah dirender (C2-02), validasi numerik tidak menonaktifkan tombol OK (C2-03), dan galat fold tidak berkode (C2-01).

## 7. Track D — Akurasi numerik terhadap scikit-learn dan WEKA

Kolom tabel metrik: `| Konfigurasi | Perangkat | Akurasi | Kappa | Macro F1 |`. Statify dijalankan lewat biner wasm yang sama dengan aplikasi (pustaka headless `headless/statify_wasm.mjs`), tanpa menulis ulang rumus. scikit-learn 1.9.1 dijalankan di sandbox cloud; WEKA 3.9.6 pada OpenJDK 11 di VM.

{{include: D_accuracy.md | ### 4.1 | 3 | Track D — }}

{{include: D_accuracy.md | ### 5.1 | 3 | Track D — }}

{{include: D_accuracy.md | ### 5.2 | 3 | Track D — }}

Interpretasi. Pada seluruh 24 konfigurasi dan tiga dataset, kelas yang diprediksi Statify sama dengan scikit-learn (17.221 dari 17.221 prediksi); akurasi, Kappa, dan Macro F1 identik sampai 6 desimal, dan parameter model cocok sampai galat absolut maksimum 1,776e-15 pada VM dan 2,665e-15 pada Windows (selisih urutan operasi floating-point di numpy). Eksekusi ulang di Windows memberi kelas prediksi dan metrik yang identik. Probabilitas keluaran Apply Model dibulatkan 4 desimal oleh wasm (`round4`), sehingga selisih probabilitas terhadap scikit-learn paling besar 5,0e-5 dan sepenuhnya dijelaskan oleh pembulatan. Terhadap WEKA 3.9.6 pada Words to Keep bawaan (1.000), kelas prediksi sama pada 264 sampai 267 dari 270 dokumen pilkada karena WEKA mempertahankan semua kata yang seri pada batas (1.042 kata) sedangkan Statify memotong tepat 1.000; bila kosakata disamakan, 270 dari 270 sama. Data uji 270 dokumen terlalu kecil untuk memeringkat konfigurasi (galat baku akurasi sekitar 2,6 poin persentase).

## 8. Track E — Waktu eksekusi

Kolom tabel: `| Menu dan konfigurasi | Dataset | Jumlah term | Rata-rata (ms) | Simpangan baku (ms) |`. Protokol: 1 pemanasan dan 5 pengukuran. Hanya tabel perangkat skripsi (Windows 11, Ryzen 5 4600H) yang masuk buku; tabel uji asap di bawahnya berasal dari VM Linux dan tidak mewakili perangkat skripsi.

{{include: E_performance.md | ### Tabel perangkat skripsi | 3 | Track E — }}

{{include: E_performance.md | ### UJI ASAP — BUKAN HASIL PERANGKAT SKRIPSI: VM-LOKAL | 3 | Track E — }}

Interpretasi. Pengukuran di perangkat skripsi (Ryzen 5 4600H, Windows 11, Chrome 155.0.8059.85 headless dan Node 24.20.0; eksekusi ulang 22 Oktober 2026 sesudah perbaikan long task STWV; 1 pemanasan dan 5 pengukuran per sel; adaptor daya tersambung, paket daya Balanced) mencakup dataset hingga 36.305 dokumen (gabungan 17.974 dokumen ditambah 20 Newsgroups 18.331 dokumen; label campuran, hanya untuk beban waktu). Waktu STWV default di peramban 71,1; 464,1; 964,1; 4.306,2 ms untuk 900; 5.574; 11.000; 36.305 dokumen: sekitar 0,08 ms per dokumen sampai 17.974 dokumen (1.503,9 ms), lalu 0,119 ms per dokumen pada 36.305 dokumen, yang dokumennya jauh lebih panjang (rata-rata 114,0 token dibanding 14,8 sampai 29,1). Waktu STWV kini mencakup pembangunan ulang matriks bertahap di main thread, sehingga lebih lambat daripada eksekusi 8 Oktober 2026 (Chrome 154, Node 24.13.1: 61,1; 1.229,6; 4.138,3 ms untuk 900; 17.974; 36.305 dokumen). Naive Bayes dan Apply Model tumbuh lebih cepat daripada jumlah dokumen pada ukuran terbesar (10,7 sampai 14,4 kali lipat untuk 2,02 kali dokumen dibanding 17.974 dokumen, di peramban). Pada 36.305 dokumen, NB 10-fold memakan 20.366,8 ms di peramban (14.155,6 ms headless), NB holdout 8.606,8 ms, dan Apply Model 5.034,3 ms (8 Oktober: 26.624,7 ms; 17.960,9 ms headless; 10.297,3 ms; 6.500,9 ms). Hingga 17.974 dokumen waktu terlama 1.900,2 ms (NB 10-fold gabungan). Peramban lebih lambat daripada headless 1,5 sampai 1,9 kali untuk STWV default, 1,3 sampai 3,7 kali untuk NB holdout, 1,1 sampai 2,0 kali untuk NB 10-fold, dan 1,4 sampai 3,9 kali untuk Apply Model; selisih pada dataset terbesar masih 3,5 sampai 6,2 detik sehingga tidak hanya overhead tetap Worker (49,4 sampai 64,5 ms; BUGS.md E-03), dan penyebabnya tidak diisolasi di sini. NB dan Apply Model tidak menghasilkan Long Task. STWV tidak menghasilkan Long Task pada data ≤ 17.974 dokumen dan hanya satu Long Task pendek pada 1–2 dari 6 run pada 36.305 dokumen (maksimum 72 ms), di bawah ambang 200 ms (BUGS.md E-02, diperbaiki dengan transfer `Float64Array` dan penyusunan ulang bertahap; pada 8 Oktober terpanjang 195 ms pada 17.974 dokumen dan 441 ms pada 36.305 dokumen). STWV dengan stemming Sastrawi kini terukur pada semua dataset: 465,0; 1.648,9; 5.709,8 ms untuk SMS Spam, gabungan, dan 36.305 dokumen di peramban (BUGS.md E-01, diperbaiki dengan `sastrawi-rs` 0.5.3; pada 8 Oktober selnya GALAT). Keterbatasan: satu perangkat, lima pengukuran per sel (median simpangan baku 2,0 persen, terbesar 12,9 persen pada sel kecil), Chrome headless, harness hanya mengukur Worker dan wasm (bukan klik sampai Output Viewer), dan program latar belakang tidak diperiksa.

## 9. Track F — Integrasi antarmenu

Kolom tabel: `| ID | Skenario | Hasil yang diharapkan | Hasil aktual | Status | Bukti |`. Tes memanggil kode asli aplikasi (penamaan kolom STWV, `analyzeNaiveBayes`, `loadModelFromFile`, `applyModel`) dengan wasm sungguhan; hanya store dan kelas `Worker` yang diganti.

{{include: F_integration.md | ## 3. | 3 | Track F — }}

{{include: F_integration.md | ## 4. | 3 | Track F — }}

Interpretasi. IT-01, IT-02, IT-04, dan IT-05 memenuhi kriteria (VM dan Windows): jumlah term sama dengan jumlah kolom `VEC_`, Model Summary sama dengan model asal (6.017 angka model sama bit demi bit), kelas prediksi sama dengan scikit-learn pada 270/270 dokumen, dan prediksi identik byte demi byte setelah tulis-baca berkas. IT-03 berstatus Lulus dengan catatan: kelas prediksi sama pada 630/630 baris, tetapi probabilitas keluaran dibulatkan 4 desimal sehingga kriteria 1e-9 tidak terpenuhi secara harfiah pada kolom probabilitas (selisih 4,992e-5 sampai 5,000e-5); parameter model identik bit demi bit. Satu kolom STWV bernama `VEC` lolos dari filter `VEC_` di antarmuka (F-01). Tes Rust `eval_integration.rs` lulus di Windows; pemeriksaan di peramban nyata (`F_manual_checklist.md`) belum dijalankan.

## 10. Temuan (BUGS.md)

{{auto:bugs}}

Detail (lokasi file:baris, langkah reproduksi, dampak, usulan perbaikan) ada di `BUGS.md`. Usulan perbaikan tidak diterapkan karena aturan paket ini melarang perubahan kode produksi.

## 11. Daftar NOT RUN

Daftar dibangkitkan dari keberadaan log saat REPORT.md dibangun.

{{auto:notrun}}

## 12. Keterbatasan

1. Tes Rust baru ditulis tanpa kompiler dan baru dikompilasi di Windows; semuanya lulus pada percobaan pertama. Sebagian nilai harapan bersifat karakterisasi perilaku kode saat ini (mis. `k1_*` untuk BUGS.md A-1), sehingga lulusnya tes membuktikan perilaku itu terjadi, bukan bahwa perilaku itu benar.
2. Hasil Jest berlabel [VM] memakai ts-jest dan resolver pengganti, bukan konfigurasi produksi (next/jest dengan SWC); hasil Windows (konfigurasi produksi) yang berlaku untuk buku.
3. Hanya waktu eksekusi dari perangkat skripsi (Windows) yang berlaku untuk buku; uji asap sandbox/VM bukan. Pengukuran Windows memakai Chrome headless dan 5 pengulangan per sel, sehingga simpangan baku sel kecil besar relatif terhadap rata-rata dan selisih beberapa ms tidak bermakna.
4. Akurasi pada data uji 270 dokumen (pilkada) tidak cukup untuk menyimpulkan konfigurasi terbaik; satu pembagian data, tanpa uji signifikansi.
5. Perbandingan dengan WEKA terbatas oleh perbedaan definisi (aturan seri Words to Keep, prior ber-Laplace, keluaran Complement), versi Java (OpenJDK 11, bukan Zulu 17 bawaan WEKA), dan presisi cetak WEKA (16 desimal; ARFF K5 menulis 6 desimal). Stemming Sastrawi (K6) tidak punya pembanding eksternal.
6. Dataset SMS Spam dan SmSA berasal dari salinan di `weka/data`; asal dan lisensi korpus belum diverifikasi. Dataset >= 20.000 dokumen (36.305) dibentuk dari gabungan sumber di atas dan 20 Newsgroups (diunduh lewat scikit-learn) dengan label campuran; lisensi 20 Newsgroups belum diverifikasi.
7. Biner wasm yang diuji adalah yang sudah ada di repo; kesesuaiannya dengan sumber Rust saat ini diperiksa oleh tes `eval_compare.rs`, yang lulus di Windows. Versi `sastrawi-rs` berbeda antar-crate (0.5.1 pada STWV, 0.5.3 pada Naive Bayes, Apply Model, dan inti; BUGS.md D-01).
8. Probabilitas Apply Model hanya tersedia pada 4 desimal, sehingga kriteria 1e-9 pada probabilitas keluaran tidak dapat diukur langsung (parameter dan vektor diperiksa pada presisi penuh).
9. Pengujian antarmuka memakai jsdom dengan batas luar ditiru (store, modal, Worker); perilaku peramban nyata (WASM, Data Editor, Output Viewer) hanya tercakup oleh daftar periksa manual yang belum dijalankan.

## 13. Berkas

`ENV.md`, `01_baseline.md`, `A_unit.md`, `B_whitebox.md`, `C_blackbox.md`, `C_manual_checklist.md`, `D_accuracy.md`, `E_performance.md`, `F_integration.md`, `F_manual_checklist.md`, `BUGS.md`; laporan final `LAPORAN_UJI_ULANG_22Okt.md`; log mentah di `logs/`; skrip di `run_*.ps1` dan `tools/`; tes di `__tests__/eval/` (Jest) dan `tests/eval_*.rs` (Rust) pada masing-masing menu.
