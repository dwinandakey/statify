# Catatan pilot (2026-10-16)

- `pilot`: data faktor string, n = 100 dan 100.000, 3 run. Blok SPSS n=100 dan Statify n=100 selesai. Blok Statify n=100.000 **macet di impor CSV** (dihentikan setelah ±10 menit, tidak ada baris tersimpan). Bukti: `impor-csv-100k-macet-240dtk.png` (tombol Import tetap nonaktif 240 dtk setelah diklik) dan `../../statify/diagnosis/csv-import-limit.cjs` (worker CSV produksi: kolom string gagal di atas ±63.600 baris, "Maximum call stack size exceeded"; kode numerik lolos sampai 200.000).
- `pilot-kode`: data yang sama dengan kode faktor numerik (`data/kode`), n = 100.000, 3 run, fase 1 + fase 2.
- `pilot-v2`: verifikasi setelah perbaikan afinitas (GPU process Chromium tidak mewarisi afinitas) dan hash kanonis, n = 100, 3 run, fase 1 + fase 2.
