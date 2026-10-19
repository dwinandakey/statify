# BUGS_B — pengamatan Track B (white-box)

Tidak ada tes evaluasi Track B yang gagal (54 dari 54 lulus di VM, `logs/jest_B_vm.json`). Dua pengamatan berikut berasal dari analisis jalur, bukan dari kegagalan tes.

## B-1 (rendah): `ValidationMethod` di luar union lolos validasi tanpa pemeriksaan
- Lokasi: `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts`, `getNumericInputError`, baris 240 dan 253 (`if (... === "holdout")`, `if (... === "kfold")`).
- Reproduksi: `f.validation.ValidationMethod = "none" as unknown as "holdout"` lalu `getNumericInputError(f)`. Tes: `WB-2 jalur 27` (`whitebox.getNumericInputError.test.ts`).
- Dampak: bila `ValidationMethod` bernilai selain `"holdout"`/`"kfold"` (mis. data lama atau rusak di IndexedDB), `TrainingPercentage` dan `KFolds` tidak divalidasi dan fungsi mengembalikan `null` (dianggap sah). Tidak terjangkau lewat tipe TypeScript; hanya relevan untuk data tersimpan yang rusak.
- Usulan: tambahkan cabang `else` yang mengembalikan pesan galat, atau normalisasi `ValidationMethod` di `mergeWithDefaults`.

## B-2 (informasi): `KFolds = 1` diterima
- Lokasi: baris 253–258 yang sama. Sesuai AGENTS.md §4.2 (minimum 1), sehingga bukan penyimpangan dari spesifikasi.
- Catatan: k-fold dengan satu fold secara metodologis degenerate (tidak ada data uji). Tes lama (`whitebox.getNumericInputError.test.ts`, "Catatan temuan") sudah mencatatnya; di sini hanya dirujuk. Batas atas fold terhadap ukuran data memang sengaja diserahkan ke engine Rust (komentar baris 181–184).
