# BUGS_C1 — Temuan Track C1 (black-box String to Word Vector, BB-01 s.d. BB-13)

Format: lokasi, langkah reproduksi, dampak, usulan perbaikan. Kode produksi tidak diubah. Tingkat keparahan: Low, kecuali dinyatakan lain. Bukti perilaku saat ini ada pada tes yang dinamai "temuan C1-xx" (tes itu mengunci perilaku sekarang, sehingga akan gagal bila perilakunya diperbaiki; ubah tesnya bersamaan dengan perbaikan).

## C1-01 — Delimiter yang hanya berisi spasi diam-diam diganti pola bawaan inti

- **Lokasi**: `frontend/public/workers/TextAnalytics/statify-text-core/src/tokenizer.rs:25-26` (`compile_regex`: `delimiter_pattern.trim().is_empty()` → `r"[\s\p{P}]+"`); validasi antarmuka hanya memeriksa `delimiters.length === 0` di `frontend/components/Modals/Transform/StringToWordVector/config.ts:120`.
- **Reproduksi**: pada Options isi Delimiters dengan satu spasi (` `), jalankan pada teks yang memuat tanda hubung, mis. "a-b c". Panjang string 1 sehingga lolos validasi antarmuka, tetapi inti menganggapnya kosong.
- **Hasil**: token menjadi `a`, `b`, `c` (dipecah juga pada tanda baca) padahal pengguna meminta pemisah spasi saja, yang seharusnya menghasilkan `a-b`, `c`. Pemakai tidak diberi tahu bahwa pola diganti.
- **Dampak**: kosakata berbeda dari yang diminta; hanya muncul bila pengguna memasukkan delimiter yang seluruhnya spasi (nilai bawaan tidak terpengaruh). Tidak mengubah hasil BB-01..BB-13 pada pengaturan normal.
- **Bukti**: tes Rust `bb06_temuan_c1_01_delimiter_hanya_spasi_jatuh_ke_pola_bawaan_inti` (dijalankan dan lulus di Windows, `logs/rust_eval_blackbox_stwv.txt`). Langkah manual: M-06 langkah 5.
- **Usulan**: validasi antarmuka memakai `config.delimiters.trim().length === 0` agar pola yang seluruhnya spasi ditolak dengan "Delimiters cannot be empty.", atau inti menolak pola kosong-setelah-trim dengan galat yang jelas (bukan fallback diam-diam) bila `delimiters` tidak kosong.

## C1-02 — Galat awalan kolom tidak tercantum di kotak galat bawah panel

- **Lokasi**: `frontend/components/Modals/Transform/StringToWordVector/StringToWordVectorModal.tsx:43` (`hasValidationErrors` menyertakan `prefixError`) dan `:105-114` (kotak hanya memetakan `validationErrors`, bukan `prefixError`).
- **Reproduksi**: pilih variabel teks, buka tab Options, isi Vector Column Name `1VEC_`, lalu pindah ke tab Variables.
- **Hasil**: kotak merah di bawah panel menampilkan judul "Some options are invalid:" tanpa satu pun rincian; pesan "Vector column name must start with a letter, @, # or $." hanya ada di tab Options. Tombol OK nonaktif tanpa penjelasan di tab Variables. Jika diklik saat nonaktif, tidak terjadi apa-apa (tombol disabled).
- **Dampak**: kebingungan pengguna (OK nonaktif tanpa alasan yang terlihat); fungsi tetap benar.
- **Bukti**: tes Jest "temuan C1-02: bila hanya awalan yang tidak sah, kotak galat di bawah memuat judul tanpa rincian ..." (lulus di VM; lihat `logs/jest_C1_vm.json`). Langkah manual: M-03 langkah 2.
- **Usulan**: sertakan `prefixError` pada daftar yang ditampilkan, mis. `[...validationErrors, ...(prefixError ? [prefixError] : [])].map(...)`.

## Observasi (bukan bug; dicatat agar penulisan Bab V akurat)

- **O-1 (BB-03)**: kolom Vector Column Name memakai `maxLength={32}` sehingga skenario "lebih dari 32 karakter" tidak dapat dicapai lewat antarmuka; yang terjadi adalah pemotongan tanpa pesan. Pesan panjang maksimum hanya tercapai bila nilai melewati batas secara terprogram.
- **O-2 (BB-05)**: ukuran n-gram di luar 1..5 dipotong (clamp) di kolom isian; pesan "N-gram min and max sizes must be whole numbers between 1 and 5." tidak pernah terlihat lewat antarmuka biasa, tetapi tetap berfungsi sebagai jaring pengaman, dan inti Rust menolak ukuran > 5 dengan `INVALID_CONFIG`.
- **O-3 (BB-06)**: regex delimiter tidak divalidasi di antarmuka; galat `INVALID_REGEX` baru muncul setelah OK, dan pesan memuat rincian multibaris dari crate `regex`.
- **O-4 (hanya pembacaan kode, belum diuji)**: mengosongkan kolom Words to Keep menghasilkan 0 (`parseNumberInput("")`), yang berarti "simpan semua kata" tanpa peringatan (`OptionsTab.tsx:55-58, 372`).
- **O-5 (infrastruktur uji)**: `hooks/useStringToWordVector.ts:66` memakai `import.meta.url`, yang tidak dapat di-parse oleh ts-jest (keluaran CommonJS) sehingga modal tidak bisa diimpor langsung pada konfigurasi `jest.eval.config.js`. Tes C1 mengatasinya dengan pemuat `__tests__/eval/helpers/loadStwvHook.ts` tanpa mengubah kode produksi. Pemuat yang sama dipakai pula pada konfigurasi produksi `frontend/jest.config.js` (SWC lewat next/jest) sehingga hasilnya tidak bergantung pada cara `import.meta` ditangani; eksekusi di konfigurasi produksi itu belum dilakukan di sandbox (dijalankan oleh `run_C1.ps1` di Windows).
