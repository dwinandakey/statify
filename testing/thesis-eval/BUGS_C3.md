# BUGS_C3 — temuan Track C3 (black-box Apply Model dan persistensi Naive Bayes, BB-29 sampai BB-36)

Tidak ada tes thesis Track C3 yang gagal (95 dari 95 lulus di Windows, `logs/jest_C3_win.json`; tes Rust `thesis_blackbox_am` 12 dari 12 lulus, `logs/rust_thesis_blackbox_am.txt`). Tiga temuan berikut berasal dari pembacaan kode sumber dan perilaku yang diamati lewat tes, dan seluruhnya berkeparahan rendah (ketidaksesuaian dokumen atau pesan, bukan perhitungan salah).

## C3-01 (rendah): dokumentasi menyebut penyimpanan "otomatis", kode menyimpan hanya saat OK
- Lokasi: `frontend/components/Modals/Analyze/Classify/naive-bayes/DOKUMENTASI.md`, baris 44 ("Pengaturan terakhir disimpan otomatis (IndexedDB, key `"NaiveBayes"`)"); perilaku sebenarnya di `frontend/components/Modals/Analyze/Classify/naive-bayes/dialogs/naive-bayes-main.tsx`, `handleOK` (penyimpanan di baris 426, `saveFormData("NaiveBayes", payload)`), dan tidak ada penyimpanan pada perubahan nilai maupun pada Cancel.
- Reproduksi: ubah beberapa pengaturan (mis. Smoothing Alpha 0,5), klik Cancel, buka menu lagi: pengaturan kembali ke nilai sebelumnya atau default. Tes: `BB-36-d` (`blackbox.nb.persistence.test.tsx`).
- Dampak: pengguna yang membaca dokumentasi mengira perubahan yang dibatalkan tetap tersimpan; skenario BB-36 pada prompt ("tutup dan buka kembali menu NB, pengaturan terakhir pulih") hanya benar bila penutupan dilakukan lewat OK.
- Usulan: ubah kalimat dokumentasi menjadi "disimpan saat OK ditekan", atau, bila perilaku otomatis memang diinginkan, simpan juga saat Cancel/penutupan.

## C3-02 (rendah): berkas non-.json dilaporkan sebagai "isi bukan JSON yang sah"
- Lokasi: `frontend/components/Modals/Analyze/Classify/apply-model/services/model-loader.ts`, baris 166–167 (`if (!file.name.toLowerCase().endsWith(".json")) return fail("AM_E_PARSE", file.name)`); pesan di `constants/apply-model-codes.ts`, baris 71.
- Reproduksi: pilih `c3_bukan_model.txt` pada Apply Model, sumber Upload file. Tes: `BB-29a` (`blackbox.am.loader.test.ts`) dan `BB-29-UI-b` (`blackbox.am.model-tab.test.tsx`).
- Dampak: pesan "The model content could not be read as valid JSON. (AM_E_PARSE)" menyesatkan untuk berkas yang sebenarnya hanya salah ekstensi (isinya mungkin JSON model yang sah). Kontrol pilih berkas sudah memfilter `.json`, sehingga hanya terlihat bila pengguna memilih "All files".
- Usulan: kode atau pesan terpisah, mis. "The model file must have a .json extension."

## C3-03 (informasi): batas ukuran 10 MiB, pesan dan spesifikasi menyebut 10 MB
- Lokasi: `model-loader.ts`, baris 44 (`MAX_MODEL_FILE_BYTES = 10 * 1024 * 1024`); pesan `AM_E_FILE_TOO_LARGE` ("... larger than the 10 MB limit."); spesifikasi `apply-model/AGENTS.md` baris 384 ("≤ 10 MB").
- Dampak: berkas 10.000.001 sampai 10.485.760 byte diterima walaupun lebih dari 10 MB desimal. Tidak berpengaruh praktis; dicatat agar batas yang diuji (tes `BB-29j`, `BB-29k`) tidak disalahbaca.
- Usulan: tulis "10 MiB" pada pesan dan spesifikasi, atau samakan konstanta dengan 10.000.000.

## Pengamatan non-bug (penyimpangan tabel prompt yang sudah dicatat di `C_blackbox_C3.md`)
- Pesan antarmuka berbahasa Inggris dengan kode di akhir kalimat (bukan bahasa Indonesia).
- Model Word-Vector dengan kolom `VEC_` yang hilang tidak memblokir OK (hanya peringatan `AM_W_TEXT_ALL_ZERO_FILLED` dan info `AM_I_TEXT_ZERO_FILLED`), berbeda dari fitur kategorikal/numerik dan variabel teks Raw yang memblokir.
- Bentrok nama kolom hasil dengan variabel dataset adalah penyesuaian otomatis (`AM_W_NAME_ADJUSTED`), bukan galat; hanya nama kustom kembar yang menjadi galat (`AM_E_NAME_DUPLICATE`).
