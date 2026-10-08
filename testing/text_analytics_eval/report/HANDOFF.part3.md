
## 6. Metode per track (ringkas, untuk Bab IV atau pembuka tiap subbab Bab V)

**Prinsip umum.** Tes memanggil kode asli aplikasi; yang ditiru hanya batas luar (store, modal, kelas `Worker`). Komputasi inti diuji lewat wasm yang sama dengan aplikasi atau lewat crate Rust yang sama. Tidak ada kode produksi yang diubah; semua berkas baru berada di folder `__tests__/eval/` (Jest), `tests/eval_*.rs` (Rust), dan `testing/text_analytics_eval/`.

**Baseline.** `cargo test` untuk empat crate (inti, NB, AM, STWV) dan `npx jest` untuk tiga menu dengan `--testPathIgnorePatterns=__tests__/eval` serta pengecualian dua berkas whitebox lama (`hooks/__tests__/whitebox`), sehingga yang dihitung hanyalah tes yang sudah ada. Cakupan baris Jest diukur dengan `--collectCoverageFrom` terbatas pada folder tiga menu. Angka diekstrak dari log oleh `tools/build_baseline.py`, bukan diketik.

**Track A (unit).** Empat berkas Jest (`model-loader`, `kfold`, `stopwords`, `formula-output`; 105 tes) dan empat berkas Rust (`eval_formulas` 15, `eval_vocab_limit` 13, `eval_text_pipeline` 20, `eval_partition` 18). Nilai harapan dihitung mandiri (tangan atau replika Python independen), termasuk keluaran awal MT19937 seed 42 yang sama dengan `numpy.random.RandomState(42)`, dan indeks partisi holdout/k-fold seed 42. Estimasi statis celah cakupan Rust ada di `unit/static_gap_rust.py` (bukan pengukuran).

**Track B (white-box basis path).** Untuk WB-1 `validateColumnPrefix`, WB-2 `getNumericInputError`, WB-3 blok `useMemo` validasi pada `useNaiveBayesValidation`, WB-4 `loadModelFromFile` (dengan `finalizeLoad` diperluas): graf alir ditulis tangan dari kode sumber, kondisi majemuk (`||`, `&&`, `??`) dipecah menjadi simpul predikat per operan; V(G) = E − N + 2 dan P + 1 dihitung dan dicocokkan oleh skrip (`tools/wb_core.py`, `wb_graphs.py`, `wb_synth.py`), jalur independen dipilih dan **rank matriks vektor-sisi** diperiksa; satu tes Jest per jalur (nama tes memuat ID jalur). Flow graph dibangkitkan dengan Graphviz. Jalur infeasible ditandai eksplisit.

**Track C (black-box).** BB-01..BB-36 dari spesifikasi. Tiap skenario diotomatiskan semaksimal mungkin: React Testing Library (antarmuka dan dialog), hook, service dengan wasm sungguhan di Jest, dan tes Rust untuk komputasi inti. Setiap baris memisahkan komponen otomatis (hasil [Win]) dari komponen yang butuh antarmuka nyata (MANUAL, rujukan M-01..M-36 di `C_manual_checklist.md`). Kolom "Hasil yang diharapkan" adalah versi yang diverifikasi terhadap kode sumber; selisih terhadap spesifikasi dicatat pada "Catatan penyesuaian" per bagian C1, C2, C3. Temuan perilaku dikunci sebagai tes karakterisasi dan diberi ID temuan.

**Track D (akurasi numerik).** Jalur headless `headless/statify_wasm.mjs` memakai wasm yang sama dengan aplikasi: Naive Bayes dengan Raw Text dan resep STWV dari data latih saja, Export Model, lalu Apply Model pada data uji; keluaran `pred_statify_<K>.csv`. Pembanding scikit-learn 1.9.1 (`accuracy/sk_compare.py`) memakai kosakata eksplisit dengan aturan Statify, tokenisasi disamakan, dan fungsi `assert_no_leak`. WEKA 3.9.6 dikerjakan terpisah (`weka/`). Konfigurasi: K1 Weka bawaan Multinomial; K2 Bernoulli; K3 Complement; K4 standar scikit-learn (hitungan, IDF smooth, L2); K5 TF log(1+f) × IDF ln(N/df) × normalisasi panjang dokumen; K6 K1 + stopword Indonesia + stemming Sastrawi (tanpa pembanding). Varian `w` (seluruh kosakata) dan `m` (W = 1.042) menyamakan kosakata dengan WEKA. Empat tingkat perbandingan: kelas prediksi, probabilitas Apply Model, parameter model presisi penuh, dan vektor. Metrik: akurasi, Kappa Cohen, Macro F1 (6 desimal) dan LRE = −log10(|x−c|/|c|).

**Track E (waktu).** Dua jalur. (a) **Peramban**: harness statis menyajikan Worker asli aplikasi (NB, AM) dan Worker pengganti yang memuat wasm yang sama untuk STWV (aplikasi membundel prosesornya lewat webpack); waktu diukur dengan `performance.now()` dari sebelum `postMessage` sampai `onmessage`; NB dan AM membuat Worker baru tiap run seperti di aplikasi, STWV memakai ulang satu Worker. (b) **Headless**: wasm dipanggil sinkron di Node, satu proses per sel, GC sebelum tiap run. Protokol 1 pemanasan + 5 pengukuran, rata-rata dan simpangan baku sampel (n−1). Lima skenario (STWV default, STWV stopword + Sastrawi, NB holdout 70%, NB 10-fold, Apply Model) pada empat dataset utama buku (900; 5.574; 11.000; 36.305 dokumen), ditambah "baris tambahan" yang bukan baris utama buku: dataset gabungan 17.974 dokumen dan varian ASCII untuk STWV + Sastrawi. Responsivitas UI: Long Task dan jeda frame. Skenario NB memakai Raw Text, seed 42; Apply Model memakai model NB Multinomial dan data yang sama.

**Track F (integrasi).** IT-01..IT-05 diotomatiskan di tingkat service dan Rust: lima skrip Node (`integration/it0N_*.mjs`), lima berkas Jest (98 tes) dengan wasm sungguhan, dan dua tes Rust `eval_integration.rs` (`float_roundtrip` pada f64 acak seed 42 dan model K1, K4, K5). Pemeriksaan di peramban nyata (MF-01..MF-05) manual dan belum dijalankan. IT-03 diperlakukan khusus karena `round4` (Bagian 5.2).

## 7. Temuan

Indeks lengkap 25 butir ada di Lampiran A §10 dan rincian (lokasi `file:baris`, reproduksi, dampak, usulan, tingkat keyakinan) di Lampiran B. Usulan perbaikan **tidak diterapkan** karena paket ini dilarang mengubah kode produksi. Untuk buku, kelompokkan sebagai berikut.

| ID | Tingkat | Inti temuan | Saran penempatan |
|---|---|---|---|
| E-01 | Tinggi | `sastrawi-rs 0.5.1` pada wasm STWV panik (`unreachable`) bila ada token yang karakter keduanya multibita (contoh `I‘m` dengan petik tipografis, `résumé`). Satu dokumen membatalkan seluruh korpus. Terukur: 34 dokumen memicu panik pada SMS Spam 5.574 dan pada gabungan 17.974; 0 pada pilkada dan SmSA. NB/AM (0.5.3) tidak panik pada masukan yang sama. Pesan ke pengguna hanya `unreachable` | Pembahasan Track E (sel GALAT) dan Bab saran |
| D-01 | Sedang | Versi `sastrawi-rs` berbeda antar-crate (0.5.1 STWV vs 0.5.3 lainnya); pada K6 kosakata STWV mandiri berbeda 8 kata dari resep NB/AM (1.000 vs 1.000 kata). Penyebab mekanisme belum diverifikasi di kode; pengaruh pada akurasi tidak diukur | Pembahasan Track D |
| A-1 | Sedang | `KFolds = 1` diterima di TS dan Rust; data latih kosong, semua prediksi ke kelas alfabetis pertama, akurasi 3/9 pada fixture, Kappa 0, tanpa galat. Terverifikasi dengan tes yang dijalankan di Windows | Pembahasan Track A/B |
| C2-01 | Sedang | Galat/peringatan jumlah fold tidak berkode dan tidak sampai ke pengguna (BB-24) | Pembahasan Track C |
| C2-02 | Sedang | Pesan validasi NB tidak pernah ditampilkan; OK hanya nonaktif (BB-14) | Pembahasan Track C |
| C2-03 | Sedang | Validasi numerik tidak menonaktifkan OK; Alpha tidak sah dibuang diam-diam (BB-18, BB-21). Klaim "analisis berjalan dengan alpha sah terakhir saat OK diklik" berasal dari pembacaan kode, bukan dari tes | Pembahasan Track C |
| lainnya | Rendah atau informasi | A-2..A-4, B-1, B-2, C1-01, C1-02, C2-04, C2-05, C3-01..C3-03, D-02..D-04, E-02, E-03, F-01, F-02. Antara lain: `round4` pada Apply Model (D-02/F-02), matriks padat melalui `postMessage` yang memblokir main thread (E-02), Worker NB/AM dibuat baru tiap analisis dengan overhead tetap 54,6–74,5 ms (E-03), kolom STWV bernama `VEC` lolos filter `VEC_` (F-01) | Lampiran temuan |

Tingkat keyakinan tiap temuan dicatat di `BUGS.md`: ada yang **terverifikasi dengan tes yang dijalankan** (A-1 sisi TS dan Rust, E-01 lewat skrip reproduksi) dan ada yang **analisis kode** (misalnya jalur teks mentah A-1 `NB_E_TEXT_EMPTY_VOCAB_FOLD` dan sebagian C2-03). Pertahankan pembedaan itu saat menulis.

## 8. Keterbatasan dan ancaman validitas (tulis di Bab V.9)

1. **Tes Rust baru ditulis tanpa kompiler dan baru dikompilasi di Windows**; semuanya lulus pada percobaan pertama. Sebagian nilai harapan bersifat karakterisasi perilaku saat ini (`k1_*`), sehingga lulus berarti perilaku itu terjadi, bukan benar.
2. **Hasil [VM] memakai ts-jest dan resolver pengganti**, bukan konfigurasi produksi (next/jest dengan SWC); hanya hasil [Win] yang berlaku. Cakupan Jest sesudah Track A hanya terukur di VM.
3. **Satu perangkat, lima pengukuran per sel.** Median simpangan baku 3,0% terhadap rata-rata (30 dari 50 sel di bawah 5%; 46 dari 50 di bawah 10%; maksimum 16,5% pada sel kecil). Selisih beberapa ms pada sel kecil tidak bermakna. Chrome headless; harness mengukur Worker dan wasm saja; program latar belakang tidak diperiksa; paket daya Balanced.
4. **Data uji pilkada 270 dokumen**: tidak cukup untuk memeringkat konfigurasi (galat baku akurasi ± 2,6 poin persentase); satu pembagian data; tanpa uji signifikansi.
5. **Perbandingan WEKA terbatas**: perbedaan definisi (aturan seri Words to Keep, prior ber-Laplace, keluaran Complement), versi Java (OpenJDK 11 di VM, bukan Zulu 17 bawaan WEKA), presisi cetak WEKA (16 desimal; ARFF K5 menulis 6 desimal). K6 tidak punya pembanding eksternal.
6. **Dataset**: SMS Spam dan SmSA berasal dari salinan di `weka/data`; asal dan lisensi belum diverifikasi (URL unduhan tidak dapat diperiksa dari sandbox tanpa jaringan). Dataset 36.305 dokumen bercampur bahasa dan label (25 kelas) dan hanya sah untuk beban waktu; lisensi 20 Newsgroups belum diverifikasi.
7. **Biner wasm** yang diuji adalah yang sudah ada di repo; kesesuaiannya dengan sumber Rust terkini hanya diperiksa lewat `eval_compare.rs`. Versi `sastrawi-rs` berbeda antar-crate (D-01).
8. **Probabilitas Apply Model hanya 4 desimal** sehingga kriteria 1e-9 pada probabilitas keluaran tidak dapat diukur langsung; parameter dan skor acuan diperiksa pada presisi penuh.
9. **Pengujian antarmuka memakai jsdom** dengan batas luar ditiru; perilaku peramban nyata (WASM, Data Editor, Output Viewer) hanya tercakup oleh daftar periksa manual yang belum dijalankan.
10. **Cakupan Rust tidak terukur** (`cargo-llvm-cov` tidak terpasang); STWV Rust tidak punya tes sendiri sehingga diuji lewat jalur NB/AM dan headless.
11. **Waktu**: tidak ada pembanding waktu dengan scikit-learn atau WEKA; Rust native tidak diukur; Playwright aplikasi penuh tidak dijalankan.
12. **Penyebab selisih peramban vs headless pada dataset besar tidak diisolasi** (E-03 dikoreksi: tidak hanya overhead tetap).

## 9. Yang belum dijalankan dan tugas Yedija (NOT RUN)

| Butir | Status | Catatan untuk penulisan |
|---|---|---|
| Pengujian manual M-01..M-36 (`C_manual_checklist.md`) dan MF-01..MF-05 (`F_manual_checklist.md`) | MANUAL, belum dijalankan | Tulis sebagai "komponen manual belum dilaksanakan" pada kolom Status BB dan IT. Bila Yedija menjalankannya, minta tangkapan layar dan hasilnya, lalu perbarui kolom Hasil aktual dan Status. |
| Playwright end-to-end aplikasi penuh (`perf/e2e_full_app.spec.ts`) | NOT RUN | Ditulis tetapi tidak pernah dijalankan; tidak dipanggil `run_E.ps1`. |
| Cakupan Rust (`cargo llvm-cov`) | NOT RUN | Alat tidak terpasang. Opsi: Yedija memasangnya (`cargo install cargo-llvm-cov`) lalu `run_all.ps1 -Only A`. Sampai itu terjadi, jangan menulis persentase. |
| WEKA SMS Spam dan SmSA di Windows | NOT RUN | Hanya dijalankan di VM (OpenJDK 11); pilkada diulang di Windows dengan hasil sama (`weka/logs/09_bandingkan_windows_vs_linux_pilkada.log`). |
| STWV + Sastrawi pada SMS Spam, gabungan, 36.305 dokumen | GAGAL (bukan NOT RUN) | Panic wasm (E-01); varian ASCII (non-ASCII dilipat atau dibuang) terukur hanya untuk waktu: 411,1 / 1.406,3 / 6.166,2 ms di peramban (sekitar 1,49× STWV default pada 36.305 dokumen). |
| Verifikasi asal dan lisensi dataset | Belum | Yedija perlu mencatat sumber dan lisensi SMS Spam (UCI id 228), SmSA (IndoNLU), 20 Newsgroups sebelum dicantumkan di buku. |
| Eksekusi ulang VM dengan nama berkas baru | Opsional | Log VM lama masih bernama `thesis`; `tools/apply_results.py` memetakannya (`_legacy`). Tidak memengaruhi angka. |
| Commit dan push | Tugas Yedija | Agen mana pun dilarang menjalankan perintah git di repo ini. |
| Penggabungan `text-analytics-eval` ke `dija-v2`, `main` ke `dija-v2`, lalu `dija-v2` ke `main` | Selesai (8 Oktober 2026) | Ketiganya dilakukan langsung oleh Yedija (merge `--no-ff`, tanpa konflik pada dua merge pertama). Paket evaluasi kini ada di `main`. Data pihak ketiga di `weka/data/` (SMS Spam, SmSA, turunan 20 Newsgroups) ikut berada di `main` dan lisensinya belum diverifikasi; ini tetap tugas Yedija sebelum dicantumkan di buku. Dua tes whitebox lama di `naive-bayes/hooks/__tests__/` masih belum dilacak git. |

Tugas lain untuk Yedija yang memengaruhi buku: memutuskan apakah temuan E-01, D-01, A-1, C2-01..C2-03 hanya dilaporkan atau juga diperbaiki di versi aplikasi berikutnya; menyediakan tangkapan layar untuk daftar periksa manual; menyetujui penempatan tabel panjang di lampiran buku.

## 10. Peta berkas dan cara mengulang

Semua jalur relatif terhadap `testing/text_analytics_eval/` di repo.

| Berkas atau folder | Isi |
|---|---|
| `REPORT.md` | Laporan gabungan (Lampiran A di dokumen ini). Dibangkitkan; jangan disunting langsung |
| `BUGS.md`, `BUGS_A..F.md` | Temuan (Lampiran B) |
| `ENV.md` | Lingkungan dan penyimpangan (Lampiran C) |
| `01_baseline.md`, `A_unit.md`, `B_whitebox.md`, `C_blackbox.md`, `D_accuracy.md`, `E_performance.md`, `F_integration.md` | Dokumen per track; D, E, F disalin sebagian di Lampiran D–F |
| `C_manual_checklist.md`, `F_manual_checklist.md` | Daftar periksa manual (belum dijalankan) |
| `AUDIT_DOCS.md` | Audit konsistensi dokumen |
| `PROMPT_Evaluasi_Modul_Text_Analytics.md` | Spesifikasi asli (sengaja tidak diubah; masih memakai nama lama `thesis-eval`) |
| `logs/` | Log mentah. Nama berakhiran `_win` atau berkas `rust_*.txt`, `baseline_*`, `integration_*_win.txt` adalah Windows; `_vm` adalah VM |
| `perf/raw/*.csv` | Pengukuran waktu mentah per run (Track E) |
| `accuracy/out/`, `weka/out/` | Prediksi dan model per konfigurasi (Track D) |
| `whitebox/` | DOT, PNG, CSV sisi untuk Track B |
| `tools/` | `apply_results.py`, `merge_docs.py`, `build_report.py`, `build_handoff.py`, dan generator track |
| Tes di repo | `frontend/components/Modals/{Transform/StringToWordVector, Analyze/Classify/naive-bayes, Analyze/Classify/apply-model}/**/__tests__/eval/`; `rust/tests/eval_*.rs` pada NB dan AM; `frontend/public/workers/TextAnalytics/statify-text-core/tests/eval_*.rs` dan `tests/eval_data/` |

**Satu perintah (Windows, dari akar repo):**

```
powershell -ExecutionPolicy Bypass -File testing\text_analytics_eval\run_all.ps1
```

Opsi: `-SkipE`, `-SkipRust`, `-SkipBaseline`, `-SkipTracks`, `-Only A,B,C1,C2,C3,D,E,F`. Track E dijalankan terakhir dan tidak boleh ada kegiatan berat di komputer selama pengukuran. Setelah selesai, bangun ulang dokumen:

```
python testing\text_analytics_eval\tools\apply_results.py
python testing\text_analytics_eval\tools\merge_docs.py
python testing\text_analytics_eval\tools\build_report.py
python testing\text_analytics_eval\tools\build_handoff.py
```

Penanda berbentuk `⟦jest:<berkas>::<nama tes>⟧` dan `⟦rust:<target>::<fungsi>⟧` di dokumen diganti menjadi Lulus, Gagal, atau BELUM DIJALANKAN oleh `apply_results.py` dari `logs/jest_*.json` dan `logs/rust_*.txt` (Windows menimpa VM). Karena itu status tidak pernah diketik manual.

## 11. Panduan penulisan

1. Bahasa Indonesia baku-akademik, kalimat pasif atau netral seperti lazimnya skripsi. Hindari bahasa promosi ("sangat baik", "unggul") dan hindari klaim mutlak ("terbukti benar", "bebas bug").
2. Selalu sebut perangkat dan label: "pada perangkat uji skripsi (Windows 11, Ryzen 5 4600H)". Angka [VM] hanya dengan label eksplisit sebagai pembanding.
3. Tulis angka dengan koma desimal dan titik ribuan; satuan waktu ms; metrik akurasi 6 desimal pada tabel, 4 desimal di kalimat.
4. Pisahkan **fakta terukur**, **interpretasi**, dan **dugaan**. Setiap dugaan (misalnya mekanisme D-01, penyebab selisih peramban vs headless) diberi kata "diduga" dan dicatat belum diverifikasi.
5. Setiap tabel diberi sumber (nama dokumen atau log) dan tanggal eksekusi (8 Oktober 2026 untuk eksekusi penuh Windows; baseline Windows awal 7 Oktober 2026).
6. Selisih terhadap spesifikasi asli (misalnya `BB` yang hasil harapannya diverifikasi ulang terhadap kode, dan IT-03) ditulis terbuka, tidak disembunyikan.
7. Jangan menambahkan butir baru ke tabel dari ingatan. Bila perlu data tambahan, minta Yedija menjalankan skrip yang relevan.

### Pertanyaan yang mungkin diajukan penguji, dan jawaban berbasis data

| Pertanyaan | Jawaban yang didukung data |
|---|---|
| Mengapa hasil Statify sama persis dengan scikit-learn? | Rumus Multinomial, Bernoulli, dan Complement sama; kosakata dan tokenisasi disamakan; 17.221 dari 17.221 kelas prediksi sama; parameter cocok sampai ~1e-15 (selisih urutan operasi floating-point). Kesamaan ini bukti kesesuaian terhadap implementasi acuan, bukan bukti kebenaran mutlak. |
| Mengapa berbeda dengan WEKA? | Bukan galat: WEKA mempertahankan semua kata seri pada batas Words to Keep (1.042 kata), prior ber-Laplace berbeda, dan Complement WEKA mengeluarkan distribusi 0/1. Dengan kosakata disamakan, 270 dari 270 sama (pilkada). |
| Mengapa probabilitas tidak memenuhi 1e-9? | Apply Model membulatkan probabilitas ke 4 desimal secara desain (`round4`); selisih maksimum 5,0e-5. Parameter dan skor acuan memenuhi ketelitian jauh lebih baik; kontrol negatif membuktikan keluaran tidak dapat membedakan 1e-9 dari 5e-5. |
| Mengapa peramban lebih lambat dari headless? | Sebagian karena overhead tetap Worker (54,6–74,5 ms untuk NB/AM), tetapi selisih 4,8–8,7 detik pada 36.305 dokumen tidak dijelaskan oleh itu; penyebabnya tidak diisolasi. |
| Mengapa Sastrawi gagal pada sebagian dataset? | Panic di `sastrawi-rs 0.5.1` pada token yang karakter keduanya multibita (E-01). Versi 0.5.3 yang dipakai NB/AM tidak panik pada masukan yang sama. |
| Apakah semua fitur sudah diuji? | Semua skenario BB punya komponen otomatis yang lulus; komponen yang membutuhkan antarmuka nyata (navigasi menu, tampilan Output Viewer) belum diuji manual. |
| Mengapa jalur WB-3 hanya 12 padahal V(G) 13? | Dua predikat (`!TargetVar` pada dua tempat) membaca variabel yang sama, sehingga jalur independen ke-13 infeasible; rank vektor-sisi himpunan layak adalah 12. |
