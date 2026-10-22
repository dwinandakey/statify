# BUGS_C2 — Temuan Track C2 (black-box menu Naive Bayes, BB-14 s.d. BB-28)

Seluruh temuan di bawah **belum diperbaiki**: sesuai aturan paket evaluasi, kode produksi tidak diubah. Bukti otomatis berupa tes karakterisasi yang lulus pada log `logs/jest_C2_vm.json` (tes itu mengunci perilaku yang ada sekarang, bukan perilaku yang diharapkan). Nomor baris merujuk kondisi berkas saat evaluasi.

Folder dasar: `frontend/components/Modals/Analyze/Classify/naive-bayes/` (selanjutnya `nb/`).

| ID | Skenario | Ringkasan | Keparahan |
|---|---|---|---|
| C2-01 | BB-24 | Galat/peringatan fold tidak berkode dan, pada run tanpa fitur Text, tidak sampai ke pengguna | Sedang |
| C2-02 | BB-14 | Pesan validasi (`validation.errors`) tidak pernah ditampilkan; tombol OK nonaktif tanpa penjelasan | Sedang |
| C2-03 | BB-18, BB-21 | Validasi numerik tidak menonaktifkan OK; Alpha tidak sah dibuang diam-diam sehingga analisis memakai nilai lama | Sedang |
| C2-04 | BB-17 | Tiga kalimat berbeda untuk konflik Complement; yang terlihat pengguna tidak berkode | Rendah |
| C2-05 | BB-19 | Nilai negatif Word-Vector baru terdeteksi setelah analisis dijalankan | Rendah (saran) |

---

## C2-01 — Galat fold tidak berkode dan tidak sampai ke pengguna (BB-24)

**Perilaku yang diamati (dikunci oleh tes).**

1. `folds` lebih besar dari anggota kelas terkecil bukan galat: hanya `Some(warning)` dari `validate_fold_count` yang dicatat ke `ErrorCollector` dengan konteks `validation.kfold` lalu analisis berlanjut.
2. `folds` lebih besar dari jumlah instance valid adalah `Err(String)` tanpa kode `NB_E_*`: `Number of folds (40) cannot be greater than the number of valid instances (30). Choose a smaller number of folds.`
3. Pada run **tanpa** fitur Text, galat (2) tidak sampai ke pengguna: konstruktor tetap `Ok` dengan `result = None`, `get_formatted_results()` melempar `"No analysis results available"`, worker mengirim pesan itu, dan `getUserFriendlyNaiveBayesError` tidak mengenalinya sehingga yang tampil adalah `The Naive Bayes analysis could not be completed. Check the selected variables and settings, then try again.`
4. Peringatan (1) juga tidak tampil: worker mengirim `errors` hanya pada pesan sukses dan `services/naive-bayes-analysis.ts` membuang `e.data.errors`.
5. Run ber-Text membawa ringkasan galat konstruktor sehingga pesan fold sampai, tetapi dipetakan ke kalimat generik `Check the cross-validation settings. …` tanpa kode dan tanpa angka.

**Lokasi.**

- `nb/rust/src/stats/partition.rs:174-217` (`validate_fold_count`, pesan tanpa kode).
- `nb/rust/src/wasm/function.rs:535-575` (peringatan dicatat di baris 538; galat dicatat dan `return None` di baris 573) dan `:762` (pesan generik).
- `nb/rust/src/wasm/constructor.rs:211-218` (ringkasan galat hanya untuk `TextPayload` bukan `None`).
- `frontend/public/workers/Classify/NaiveBayes/naive-bayes.worker.js:40-47` (`errors` hanya pada `success: true`).
- `nb/services/naive-bayes-analysis.ts:271-277` (`e.data.errors` tidak dipakai).
- `nb/services/naive-bayes-error-messages.ts` (satu cabang `fold`, tanpa kode, tanpa nilai).

**Reproduksi.**

1. Impor `dataset_untuk_text/uji_a2.csv` (5 baris; kelas A = 3, B = 2). Target = `kelas`; Validation → Cross-Validation Folds.
2. Number of Folds = `6`, klik OK: toast generik `The Naive Bayes analysis could not be completed. …` (tanpa kata fold, tanpa kode).
3. Number of Folds = `3` (> kelas terkecil 2): analisis selesai tanpa peringatan apa pun, padahal Rust menyatakan `Number of folds (3) exceeds the smallest class size (2). … The analysis will still run.`

Otomatis: Jest `blackbox.nb.validation.test.ts` (BB-24, tiga tes, termasuk karakterisasi pesan generik); Rust `bb24_*` (lulus di Windows, `logs/rust_eval_blackbox_nb.txt`).

**Dampak.** Pengguna tidak dapat mengetahui bahwa jumlah fold penyebab kegagalan atau bahwa fold per kelas tidak seimbang. Menyimpang dari AGENTS.md §4.2 ("tampilkan peringatan") dan dari harapan prompt (pesan kesalahan berkode).

**Usulan perbaikan.**

- Beri kode pada galat: mis. `NB_E_FOLD_COUNT` (fold < 1 atau > jumlah instance) dan `NB_W_FOLD_SMALL_CLASS` (peringatan), sertakan angka pada pesan.
- Konstruktor: kembalikan `Err(error_summary)` untuk **semua** run saat `result` kosong (hapus syarat Text), atau bawa `errors` pada pesan gagal di worker.
- Worker/service: teruskan `errors` pada pesan sukses dan tampilkan peringatan lewat `toast.warning`.
- `naive-bayes-error-messages.ts`: petakan kode baru ke kalimat ramah dengan angka dan kode di akhir (pola E3).
- Pencegahan di TS: karena jumlah baris dataset diketahui, `getNumericInputError` dapat menolak fold > jumlah baris sebelum worker dipanggil.

---

## C2-02 — Pesan validasi tidak pernah ditampilkan (BB-14)

**Perilaku.** `useNaiveBayesValidation` membangun `validation.errors` (mis. `Select a target variable.`, `Select at least one predictor variable …`, kalimat Complement, galat Text Preprocessing). Daftar itu hanya dibaca di `handleOK`, padahal tombol OK sudah `disabled={!validation.isValid}` sehingga cabang itu tidak dapat dicapai lewat klik. Akibatnya semua pesan itu tidak pernah terlihat. Tes karakterisasi `BB-14 (karakterisasi): teks pesan validasi tidak dirender di layar, hanya OK nonaktif` lulus.

**Lokasi.**

- `nb/hooks/useNaiveBayesValidation.ts:124` (pesan target), `:146` (pesan prediktor), `:158` (Complement), `:169` (`isValid`).
- `nb/dialogs/naive-bayes-main.tsx:412-414` (pembaca `validation.errors`) dan `:521` (`disabled={!validation.isValid}`).

**Reproduksi.** Buka Analyze → Classify → Naive Bayes pada dataset apa pun tanpa memilih Target: OK abu-abu, tidak ada kalimat penjelas di semua tab.

**Dampak.** Pengguna baru tidak tahu apa yang kurang. Menyimpang dari AGENTS.md §2 (daftar galat di bawah panel dengan ikon `AlertCircle`) dan dari harapan BB-14 ("pesan validasi").

**Usulan perbaikan.** Tampilkan `validation.errors[0]` di bawah panel/footer (atau sebagai tooltip pada OK yang nonaktif) memakai pola `AlertCircle` yang dipakai KNN; satukan kalimat dengan yang dipakai `options.tsx` (lihat C2-04).

---

## C2-03 — Validasi numerik tidak menonaktifkan OK; Alpha tidak sah dibuang diam-diam (BB-18, BB-21)

**Perilaku.**

1. `validation.isValid` tidak memuat `getNumericInputError`; validasi numerik hanya dijalankan saat meninggalkan tab dan saat OK diklik (sesuai AGENTS.md §4.4, tetapi OK tetap tampak aktif). Training Percentage = 0 atau 100 hanya muncul sebagai toast (`Training percentage must be a whole number between 1 and 99.`), tidak ada pesan inline dan tidak ada gaya galat pada kolom.
2. Pada Smoothing Alpha dan Text Alpha, nilai tidak sah hanya menghasilkan galat inline dan **tidak** diteruskan ke `formData` (`updateFormData` hanya dipanggil bila sah). Akibatnya `getNumericInputError` tidak pernah melihat nilai itu, jadi tidak ada toast saat pindah tab atau saat OK. Setelah pindah tab, kolom kembali ke nilai sah terakhir (tes `BB-18: Text Alpha 0 dan 1000 …` menunjukkan nilai kembali ke 999). Berdasarkan pembacaan kode (belum diuji otomatis), mengklik OK saat galat inline masih tampak akan menjalankan analisis dengan alpha sah terakhir tanpa peringatan.
3. Input Number of Folds memakai `min={2}` pada elemen HTML, sedangkan `getNumericInputError` menerima fold ≥ 1 (sesuai AGENTS.md §4.2 "minimum 1"). Panah naik/turun peramban berhenti di 2, sehingga nilai 1 hanya bisa diketik.

**Lokasi.**

- `nb/dialogs/options.tsx:99-125` (`validateAlpha`/`handleAlphaChange`) dan `:127-141` (`handleTextAlphaChange`).
- `nb/dialogs/validation.tsx:31-37` (`handleTrainingPercentChange` tanpa validasi), `:151-152` (`min={2}`, `max={25}`).
- `nb/hooks/useNaiveBayesValidation.ts:106-169` (`isValid` tanpa validasi numerik), `:186-275` (`getNumericInputError`).
- `nb/dialogs/naive-bayes-main.tsx:107-130` (`getTabLeaveError`), `:407-415` (`handleOK`).

**Reproduksi.**

1. Konfigurasi teks (DS-1) → Options → Text Alpha ketik `0` (galat inline), lalu klik OK langsung: OK aktif dan (menurut kode) analisis berjalan dengan alpha 1 (nilai bawaan) tanpa pesan.
2. Validation → Training Percentage `0`: tidak ada pesan inline; OK aktif; toast baru muncul saat klik OK atau pindah tab.

**Dampak.** Pengguna dapat mengira analisis memakai alpha yang diketik padahal nilai lama dipakai; pesan galat sebagian inline dan sebagian toast sehingga tidak konsisten.

**Usulan perbaikan.** Simpan nilai mentah (termasuk yang tidak sah) di `formData` agar `getNumericInputError` dan `isValid` melihatnya, atau tambahkan `getNumericInputError(formData) === null` ke `validation.isValid` dan tampilkan pesannya inline; samakan `min` input fold dengan aturan TS (`min={1}`) atau ubah aturan TS.

---

## C2-04 — Tiga kalimat berbeda untuk konflik Complement (BB-17)

**Perilaku.** Konflik Complement + prediktor numerik/kategorik punya tiga redaksi: hook (`Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors.`, tidak pernah terlihat, lihat C2-02), tab Options (`Complement is selected, but the model also contains numeric or categorical variables. Choose Multinomial or Bernoulli.`, satu-satunya yang terlihat, tanpa kode), dan Rust/pesan ramah (`… (NB_E_COMPLEMENT_MIXED)`). Harapan prompt BB-17 ("Pesan NB_E_COMPLEMENT_MIXED") hanya terpenuhi pada lapis Rust.

**Lokasi.** `nb/hooks/useNaiveBayesValidation.ts:157-159`; `nb/dialogs/options.tsx:350-355`; `nb/rust/src/stats/text_features.rs:165-168`; `nb/services/naive-bayes-error-messages.ts`.

**Dampak.** Rendah: perilaku fungsional benar (OK diblokir, jalan keluar jelas); hanya konsistensi pesan dan kode.

**Usulan perbaikan.** Satu konstanta pesan dipakai bersama dan, bila diinginkan, tambahkan `(NB_E_COMPLEMENT_MIXED)` di akhir sesuai pola E3.

---

## C2-05 — Nilai negatif Word-Vector baru terdeteksi setelah analisis (BB-19)

**Perilaku.** Antarmuka tidak memeriksa nilai negatif pada kolom Word-Vector Variables walau datanya sudah ada di klien; galat `NB_E_TEXT_NEGATIVE` baru muncul setelah worker dan WASM dimuat dan dijalankan. Pesan akhirnya benar dan menyebut kolom pertama serta jumlah kolom lain.

**Lokasi.** `nb/hooks/useNaiveBayesValidation.ts` (tidak ada pemeriksaan); `nb/rust/src/models/data.rs:197-201,299`; tes `BB-19: UI tidak memblokir kolom negatif sebelum analisis`.

**Dampak.** Rendah (umpan balik terlambat, beberapa detik pada dataset besar).

**Usulan perbaikan (opsional).** Pemeriksaan ringan di TS saat Word-Vector Variables terisi atau saat OK, memakai `text_negative_message` yang sama; Rust tetap menjadi lapis akhir.

---

## Catatan (bukan bug)

- **BB-28**: resep (`text.recipe`) hanya ada pada ekspor jalur Raw Text. Jalur Word-Vector menghasilkan schema 2.0 tanpa resep (`text.recipe = null`, hanya `columns`) karena vektorisasi terjadi di luar Naive Bayes; model tanpa Text dan tanpa Gaussian min-std tetap schema 1.1. Rumusan prompt "schema 2.0 berisi resep" berlaku untuk jalur Raw Text.
- **BB-24**: istilah "pesan kesalahan berkode" pada prompt tidak sesuai kode; tidak ada kode `NB_E_*` untuk fold (lihat C2-01).
- **Batas lingkungan**: tes Rust paket ini ditulis tanpa kompiler dan baru dikompilasi di Windows; `cargo test --test eval_blackbox_nb` lulus 24 dari 24 (`logs/rust_eval_blackbox_nb.txt`).
