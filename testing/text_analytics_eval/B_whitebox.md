# Track B — White-box testing dengan basis path (modul Text Analytics Statify)

Dokumen ini memuat analisis basis path untuk empat fungsi (WB-1 sampai WB-4). Seluruh angka (N, E, P, V(G), rank, jumlah jalur) dihitung oleh skrip `tools/wb_core.py`, `wb_graphs.py`, `wb_synth.py` (Python + numpy) dari edge list yang ditulis tangan dari kode sumber; DOT, PNG, CSV, dan berkas tes dihasilkan oleh `tools/wb_gen.py`, dokumen ini oleh `tools/wb_doc.py`. Status "Lulus/Gagal" pada kolom Hasil berasal dari penanda `⟦jest:...⟧` yang diisi dari `logs/jest_B_vm.json` (lihat bagian Hasil eksekusi).

## Konvensi dan keputusan metodologis

1. **Simpul awal/akhir.** S adalah simpul awal sintetis (masuk fungsi) dan X simpul akhir sintetis; setiap `return` memiliki sisi ke X. S dan X dihitung dalam N dan sisi dari/ke keduanya dalam E; rumus V(G) = E − N + 2 berlaku untuk graf terhubung dengan satu simpul awal dan satu simpul akhir.
2. **Pemecahan kondisi majemuk.** Operator `||`, `&&`, dan `??` dipecah menjadi simpul predikat tersendiri menurut urutan evaluasi hubung-singkat (short-circuit): operan kanan hanya dievaluasi bila operan kiri tidak menentukan hasil. Operator pembanding, `typeof`, dan `!` pada satu operan bukan percabangan. Ekspresi regex (`/.../.test(...)`) dihitung satu predikat.
3. **Pemanggilan fungsi tidak diperluas.** Pemanggilan `getEffectivePredictors`, `getEffectiveTextSource`, `validateStwvConfig`, `validateAnyModel`, dan `Number.isInteger/isFinite` dianggap satu pernyataan (percabangan di dalamnya bukan bagian V(G) fungsi yang dianalisis). Satu-satunya pengecualian adalah `finalizeLoad` pada WB-4 yang diperluas (inline) karena menentukan keluaran `loadModelFromFile`.
4. **Metode basis set.** Jalur dasar (baseline) dipilih sebagai jalur "normal" (masukan sah). Setiap jalur berikutnya dibangun dengan membalik satu predikat pada jalur yang sudah ada dan melanjutkan dengan penyelesaian layak terpendek (metode McCabe). Keindependenan diperiksa dengan rank matriks vektor-sisi (numpy `matrix_rank`) sampai rank sama dengan V(G) atau tidak ada lagi jalur layak yang independen. Kelayakan jalur diperiksa lewat pembacaan kode dan, pada WB-2/WB-3, lewat simulasi seluruh keadaan abstrak masukan.
5. **Nilai bertipe salah.** Predikat `typeof x !== "number"` pada fungsi bertipe `number` hanya bernilai benar untuk data yang melanggar tipe (mis. string dari input UI atau IndexedDB lama). Jalur-jalur itu *layak saat runtime*, sehingga dites dengan `as unknown as number`, sama seperti tes lama.
6. **Dua tingkat kelayakan.** "Layak" = ada masukan konkret yang melewati jalur itu dan sudah dites. "Infeasible" = tidak ada masukan apa pun yang dapat melewati jalur itu; jalur semacam ini tidak punya tes dan alasannya dijelaskan.

## WB-1 — `validateColumnPrefix` (String to Word Vector)

Sumber: `frontend/components/Modals/Transform/StringToWordVector/utils/columnPrefix.ts`. Berkas tes: `frontend/components/Modals/Transform/StringToWordVector/__tests__/eval/whitebox.validateColumnPrefix.test.ts`.

Fungsi memeriksa awalan nama kolom vektor dengan lima pemeriksaan berurutan (kosong, spasi, panjang, awal, karakter).

### Tabel simpul

Keputusan pemecahan: kondisi `prefix !== prefix.trim() || /\s/.test(prefix)` pada baris 16 dipecah menjadi dua simpul predikat (3 dan 4) karena `||` hubung-singkat; keempat pemeriksaan lain masing-masing satu predikat (regex dihitung satu predikat).

| Simpul | Pernyataan |
|---|---|
| S | Simpul awal (entry, sintetis): Mulai |
| 1 | `prefix.trim().length === 0` (predikat, baris 13) |
| 2 | `return "Vector column name cannot be empty."` (return, baris 14) |
| 3 | `prefix !== prefix.trim()  (operan kiri \|\|)` (predikat, baris 16) |
| 4 | `/\s/.test(prefix)  (operan kanan \|\|)` (predikat, baris 16) |
| 5 | `return "Vector column name cannot contain spaces."` (return, baris 17) |
| 6 | `prefix.length > MAX_COLUMN_PREFIX_LENGTH` (predikat, baris 19) |
| 7 | `return `Vector column name must be at most ${MAX_COLUMN_PREFIX_LENGTH} characters long.`` (return, baris 20) |
| 8 | `!/^[A-Za-z@#$]/.test(prefix)` (predikat, baris 22) |
| 9 | `return "Vector column name must start with a letter, @, # or $."` (return, baris 23) |
| 10 | `!/^[A-Za-z0-9._@#$]+$/.test(prefix)` (predikat, baris 25) |
| 11 | `return "Vector column name can only contain letters, digits, periods, underscores, @, # and $."` (return, baris 26) |
| 12 | `return null` (return, baris 28) |
| X | Simpul akhir (exit, sintetis): semua `return` bermuara ke sini |

### Daftar sisi (edge list)

S→1; 1→2 (T); 1→3 (F); 3→5 (T); 3→4 (F); 4→5 (T); 4→6 (F); 6→7 (T); 6→8 (F); 8→9 (T); 8→10 (F); 10→11 (T); 10→12 (F); 2→X; 5→X; 7→X; 9→X; 11→X; 12→X

Berkas CSV: [edges_WB-1_validateColumnPrefix.csv](whitebox/edges_WB-1_validateColumnPrefix.csv).

### Flow graph

DOT: [WB-1_validateColumnPrefix.dot](whitebox/WB-1_validateColumnPrefix.dot); PNG: [WB-1_validateColumnPrefix.png](whitebox/WB-1_validateColumnPrefix.png).

![Flow graph WB-1](whitebox/WB-1_validateColumnPrefix.png)

### Kompleksitas siklomatik

| N | E | P | V(G) = E − N + 2 | P + 1 | Verifikasi |
|---|---|---|---|---|---|
| 14 | 19 | 6 | 7 | 7 | sama |

V(G) = 7 sesuai klaim awal. Alasannya: ada 6 simpul predikat (1, 3, 4, 6, 8, 10) setelah `||` pada baris 16 dipecah menjadi dua; bila kondisi majemuk itu dihitung sebagai satu predikat, hasilnya 5 predikat dan V(G) = 6, jadi angka 7 bergantung pada keputusan pemecahan tersebut. Dengan pemecahan, E − N + 2 = P + 1 = 7.

### Basis set jalur independen

Semua 7 jalur layak. Jalur 3 dan 4 sama-sama berakhir di simpul 5 tetapi berbeda sisi (3→5 vs 4→5): jalur 3 diwakili awalan dengan spasi di tepi (`prefix !== prefix.trim()` benar), jalur 4 spasi di tengah saja (`/\s/` benar). Jalur 2 memakai string kosong; string hanya-spasi juga melewati jalur yang sama.

| Jalur | Simpul | Masukan | Keluaran yang diharapkan | Hasil |
|---|---|---|---|---|
| 1 | S-1-3-4-6-8-10-12-X | prefix = "VEC_" (awalan bawaan yang sah) | null | Lulus [Win] |
| 2 | S-1-2-X | prefix = "" (prefix kosong) | "Vector column name cannot be empty." | Lulus [Win] |
| 3 | S-1-3-5-X | prefix = " VEC_" (spasi di awal (prefix != trim)) | "Vector column name cannot contain spaces." | Lulus [Win] |
| 4 | S-1-3-4-5-X | prefix = "a b" (spasi di tengah (tanpa spasi di tepi)) | "Vector column name cannot contain spaces." | Lulus [Win] |
| 5 | S-1-3-4-6-7-X | prefix = "A" x 33 (33 karakter (> 32)) | "Vector column name must be at most 32 characters long." | Lulus [Win] |
| 6 | S-1-3-4-6-8-9-X | prefix = "1VEC_" (diawali angka) | "Vector column name must start with a letter, @, # or $." | Lulus [Win] |
| 7 | S-1-3-4-6-8-10-11-X | prefix = "VEC-" (memuat tanda hubung) | "Vector column name can only contain letters, digits, periods, underscores, @, # and $." | Lulus [Win] |

Hubungan dengan tes lama: `StringToWordVector/__tests__/columnPrefix.test.ts` menguji perilaku (nilai sah, tidak sah, batas 32) memakai `it.each`, tanpa pemetaan ke jalur; tes evaluasi ini mandiri dan memetakan satu tes ke satu jalur.

Hasil eksekusi di VM (`logs/jest_B_vm.json`, ts-jest, bukan perangkat uji skripsi): 7 dari 7 tes jalur lulus.

## WB-2 — `getNumericInputError` (Naive Bayes)

Sumber: `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts`. Berkas tes: `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/__tests__/eval/whitebox.getNumericInputError.test.ts`.

Fungsi memvalidasi angka lintas tab Options dan Validation dan mengembalikan pesan galat pertama atau `null`. Percabangan berurutan: Smoothing Alpha, Text Features (Text Alpha, Top-k), Training Percentage (holdout), jumlah fold (kfold), seed.

### Tabel simpul

Keputusan pemecahan: setiap `||` pada guard `typeof ... || !Number.isFinite(...)` / `typeof ... || !Number.isInteger(...) || x < a || x > b` dipecah per operan (2 predikat untuk Smoothing Alpha dan Text Alpha, 4 untuk Top-k, Training Percentage, dan seed, 3 untuk fold), sehingga setiap operan punya sisi sendiri. Pemanggilan `getEffectiveTextSource` pada baris 188 tidak diperluas.

| Simpul | Pernyataan |
|---|---|
| S | Simpul awal (entry, sintetis): Mulai |
| 1 | `const { options, validation } = formData; const hasTextFeatures = getEffectiveTextSource(formData.main) !== "none"  (pemanggilan fungsi tidak diperluas)` (pernyataan, baris 187-188) |
| 2 | `typeof options.SmoothingAlpha !== "number"  (operan kiri \|\|)` (predikat, baris 193) |
| 3 | `!Number.isFinite(options.SmoothingAlpha)  (operan kanan \|\|)` (predikat, baris 194) |
| 4 | `return "Enter a valid number for Smoothing Alpha."` (return, baris 196) |
| 5 | `options.SmoothingAlpha <= 0` (predikat, baris 198) |
| 6 | `return "Smoothing Alpha must be greater than 0."` (return, baris 199) |
| 7 | `options.SmoothingAlpha > 999` (predikat, baris 201) |
| 8 | `return "Smoothing Alpha must not exceed 999."` (return, baris 202) |
| 9 | `hasTextFeatures` (predikat, baris 208) |
| 10 | `typeof options.TextAlpha !== "number"  (operan kiri \|\|)` (predikat, baris 210) |
| 11 | `!Number.isFinite(options.TextAlpha)  (operan kanan \|\|)` (predikat, baris 211) |
| 12 | `return "Enter a valid number for Text smoothing alpha."` (return, baris 213) |
| 13 | `options.TextAlpha <= 0` (predikat, baris 215) |
| 14 | `return "Text smoothing alpha must be greater than 0."` (return, baris 216) |
| 15 | `options.TextAlpha > MAX_TEXT_ALPHA` (predikat, baris 218) |
| 16 | `return `Text smoothing alpha must not exceed ${MAX_TEXT_ALPHA}.`` (return, baris 219) |
| 17 | `formData.output.TextFeatureTable` (predikat, baris 221) |
| 18 | `const k = formData.output.TextTopK` (pernyataan, baris 222) |
| 19 | `typeof k !== "number"  (operan 1 \|\|)` (predikat, baris 224) |
| 20 | `!Number.isInteger(k)  (operan 2 \|\|)` (predikat, baris 225) |
| 21 | `k < MIN_TEXT_TOP_K  (operan 3 \|\|)` (predikat, baris 226) |
| 22 | `k > MAX_TEXT_TOP_K  (operan 4 \|\|)` (predikat, baris 227) |
| 23 | `return `Top-k terms per class must be a whole number between ${MIN_TEXT_TOP_K} and ${MAX_TEXT_TOP_K}.`` (return, baris 229) |
| 24 | `validation.ValidationMethod === "holdout"` (predikat, baris 240) |
| 25 | `const pct = validation.TrainingPercentage` (pernyataan, baris 241) |
| 26 | `typeof pct !== "number"  (operan 1 \|\|)` (predikat, baris 243) |
| 27 | `!Number.isInteger(pct)  (operan 2 \|\|)` (predikat, baris 244) |
| 28 | `pct < 1  (operan 3 \|\|)` (predikat, baris 245) |
| 29 | `pct > 99  (operan 4 \|\|)` (predikat, baris 246) |
| 30 | `return "Training percentage must be a whole number between 1 and 99."` (return, baris 248) |
| 31 | `validation.ValidationMethod === "kfold"` (predikat, baris 253) |
| 32 | `const folds = validation.KFolds` (pernyataan, baris 254) |
| 33 | `typeof folds !== "number"  (operan 1 \|\|)` (predikat, baris 255) |
| 34 | `!Number.isInteger(folds)  (operan 2 \|\|)` (predikat, baris 255) |
| 35 | `folds < 1  (operan 3 \|\|)` (predikat, baris 255) |
| 36 | `return "The number of folds must be at least 1."` (return, baris 256) |
| 37 | `validation.RandomSeed !== null` (predikat, baris 263) |
| 38 | `typeof validation.RandomSeed !== "number"  (operan 1 \|\|)` (predikat, baris 265) |
| 39 | `!Number.isInteger(validation.RandomSeed)  (operan 2 \|\|)` (predikat, baris 266) |
| 40 | `validation.RandomSeed < 0  (operan 3 \|\|)` (predikat, baris 267) |
| 41 | `validation.RandomSeed > MAX_SEED  (operan 4 \|\|)` (predikat, baris 268) |
| 42 | `return `The seed must be a whole number between 0 and ${MAX_SEED}.`` (return, baris 270) |
| 43 | `return null` (return, baris 274) |
| X | Simpul akhir (exit, sintetis): semua `return` bermuara ke sini |

### Daftar sisi (edge list)

S→1; 1→2; 2→4 (T); 2→3 (F); 3→4 (T); 3→5 (F); 5→6 (T); 5→7 (F); 7→8 (T); 7→9 (F); 9→10 (T); 9→24 (F); 10→12 (T); 10→11 (F); 11→12 (T); 11→13 (F); 13→14 (T); 13→15 (F); 15→16 (T); 15→17 (F); 17→18 (T); 17→24 (F); 18→19; 19→23 (T); 19→20 (F); 20→23 (T); 20→21 (F); 21→23 (T); 21→22 (F); 22→23 (T); 22→24 (F); 24→25 (T); 24→31 (F); 25→26; 26→30 (T); 26→27 (F); 27→30 (T); 27→28 (F); 28→30 (T); 28→29 (F); 29→30 (T); 29→31 (F); 31→32 (T); 31→37 (F); 32→33; 33→36 (T); 33→34 (F); 34→36 (T); 34→35 (F); 35→36 (T); 35→37 (F); 37→38 (T); 37→43 (F); 38→42 (T); 38→39 (F); 39→42 (T); 39→40 (F); 40→42 (T); 40→41 (F); 41→42 (T); 41→43 (F); 4→X; 6→X; 8→X; 12→X; 14→X; 16→X; 23→X; 30→X; 36→X; 42→X; 43→X

Berkas CSV: [edges_WB-2_getNumericInputError.csv](whitebox/edges_WB-2_getNumericInputError.csv).

### Flow graph

DOT: [WB-2_getNumericInputError.dot](whitebox/WB-2_getNumericInputError.dot); PNG: [WB-2_getNumericInputError.png](whitebox/WB-2_getNumericInputError.png).

![Flow graph WB-2](whitebox/WB-2_getNumericInputError.png)

### Kompleksitas siklomatik

| N | E | P | V(G) = E − N + 2 | P + 1 | Verifikasi |
|---|---|---|---|---|---|
| 45 | 72 | 28 | 29 | 29 | sama |

V(G) = 29 = P + 1 dengan P = 28 predikat. Dari 114 jalur struktural (enumerasi graf), 27 tidak layak karena menuntut `ValidationMethod` sekaligus `"holdout"` dan `"kfold"` (simpul 25 dan 32 pada satu jalur); sisanya 87 layak dan membentang rank 29.

### Basis set jalur independen

Jalur dasar (1) adalah nilai bawaan formulir. Jalur 2–29 dibangun dengan membalik predikat. Membalik simpul 31 (`method = kfold`) dari jalur dasar **infeasible** (menuntut holdout dan kfold bersamaan); sisi `kfold` dicapai lewat jalur 20–22 dan 28 (kfold sah/tidak sah), dan sisi "bukan holdout dan bukan kfold" lewat jalur 27 (lihat catatan). Jalur 27 adalah satu-satunya jalur yang hanya layak lewat pelanggaran tipe: `ValidationMethod` di luar union `"holdout" | "kfold"` (diberi `"none"` lewat type assertion) sehingga kedua cabang `if` dilewati dan fungsi mengembalikan `null`. Tanpa jalur 27 rank hanya 28 (tes lama memuat 28 jalur bernomor dan tidak punya jalur seperti ini).

| Jalur | Simpul | Masukan | Keluaran yang diharapkan | Hasil |
|---|---|---|---|---|
| 1 | S-1-2-3-5-7-9-24-25-26-27-28-29-31-37-43-X | nilai bawaan formulir (tanpa fitur teks, holdout 70%, seed tidak diatur) | null | Lulus [Win] |
| 2 | S-1-2-4-X | SmoothingAlpha = "1" (string) | "Enter a valid number for Smoothing Alpha." | Lulus [Win] |
| 3 | S-1-2-3-4-X | SmoothingAlpha = NaN | "Enter a valid number for Smoothing Alpha." | Lulus [Win] |
| 4 | S-1-2-3-5-6-X | SmoothingAlpha = 0 | "Smoothing Alpha must be greater than 0." | Lulus [Win] |
| 5 | S-1-2-3-5-7-8-X | SmoothingAlpha = 1000 | "Smoothing Alpha must not exceed 999." | Lulus [Win] |
| 6 | S-1-2-3-5-7-9-10-12-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextAlpha = "1" (string) | "Enter a valid number for Text smoothing alpha." | Lulus [Win] |
| 7 | S-1-2-3-5-7-9-10-11-12-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextAlpha = Infinity | "Enter a valid number for Text smoothing alpha." | Lulus [Win] |
| 8 | S-1-2-3-5-7-9-10-11-13-14-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextAlpha = 0 | "Text smoothing alpha must be greater than 0." | Lulus [Win] |
| 9 | S-1-2-3-5-7-9-10-11-13-15-16-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextAlpha = 1000 | "Text smoothing alpha must not exceed 999." | Lulus [Win] |
| 10 | S-1-2-3-5-7-9-10-11-13-15-17-18-19-23-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextTopK = "100" (string) | "Top-k terms per class must be a whole number between 1 and 1000." | Lulus [Win] |
| 11 | S-1-2-3-5-7-9-10-11-13-15-17-18-19-20-23-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextTopK = 10.5 | "Top-k terms per class must be a whole number between 1 and 1000." | Lulus [Win] |
| 12 | S-1-2-3-5-7-9-10-11-13-15-17-18-19-20-21-23-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextTopK = 0 | "Top-k terms per class must be a whole number between 1 and 1000." | Lulus [Win] |
| 13 | S-1-2-3-5-7-9-10-11-13-15-17-18-19-20-21-22-23-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextTopK = 1001 | "Top-k terms per class must be a whole number between 1 and 1000." | Lulus [Win] |
| 14 | S-1-2-3-5-7-9-24-25-26-30-X | TrainingPercentage = "70" (string) | "Training percentage must be a whole number between 1 and 99." | Lulus [Win] |
| 15 | S-1-2-3-5-7-9-24-25-26-27-30-X | TrainingPercentage = 70.5 | "Training percentage must be a whole number between 1 and 99." | Lulus [Win] |
| 16 | S-1-2-3-5-7-9-24-25-26-27-28-30-X | TrainingPercentage = 0 | "Training percentage must be a whole number between 1 and 99." | Lulus [Win] |
| 17 | S-1-2-3-5-7-9-24-25-26-27-28-29-30-X | TrainingPercentage = 100 | "Training percentage must be a whole number between 1 and 99." | Lulus [Win] |
| 18 | S-1-2-3-5-7-9-10-11-13-15-17-24-25-26-30-X | RawTextVar = "Text Tweet" (fitur teks aktif); TextFeatureTable = false; TrainingPercentage = "70" (string) | "Training percentage must be a whole number between 1 and 99." | Lulus [Win] |
| 19 | S-1-2-3-5-7-9-10-11-13-15-17-18-19-20-21-22-24-25-26-30-X | RawTextVar = "Text Tweet" (fitur teks aktif); TrainingPercentage = "70" (string) | "Training percentage must be a whole number between 1 and 99." | Lulus [Win] |
| 20 | S-1-2-3-5-7-9-24-31-32-33-36-X | ValidationMethod = "kfold"; KFolds = "10" (string) | "The number of folds must be at least 1." | Lulus [Win] |
| 21 | S-1-2-3-5-7-9-24-31-32-33-34-36-X | ValidationMethod = "kfold"; KFolds = 2.5 | "The number of folds must be at least 1." | Lulus [Win] |
| 22 | S-1-2-3-5-7-9-24-31-32-33-34-35-36-X | ValidationMethod = "kfold"; KFolds = 0 | "The number of folds must be at least 1." | Lulus [Win] |
| 23 | S-1-2-3-5-7-9-24-25-26-27-28-29-31-37-38-42-X | RandomSeed = "42" (string) | "The seed must be a whole number between 0 and 4294967295." | Lulus [Win] |
| 24 | S-1-2-3-5-7-9-24-25-26-27-28-29-31-37-38-39-42-X | RandomSeed = 4.2 | "The seed must be a whole number between 0 and 4294967295." | Lulus [Win] |
| 25 | S-1-2-3-5-7-9-24-25-26-27-28-29-31-37-38-39-40-42-X | RandomSeed = -1 | "The seed must be a whole number between 0 and 4294967295." | Lulus [Win] |
| 26 | S-1-2-3-5-7-9-24-25-26-27-28-29-31-37-38-39-40-41-42-X | RandomSeed = 4294967296 | "The seed must be a whole number between 0 and 4294967295." | Lulus [Win] |
| 27 | S-1-2-3-5-7-9-24-31-37-43-X | ValidationMethod = "none" (di luar union tipe; hanya lewat type assertion) | null | Lulus [Win] |
| 28 | S-1-2-3-5-7-9-24-31-32-33-34-35-37-43-X | ValidationMethod = "kfold" | null | Lulus [Win] |
| 29 | S-1-2-3-5-7-9-24-25-26-27-28-29-31-37-38-39-40-41-43-X | RandomSeed = 42 | null | Lulus [Win] |

Hubungan dengan tes lama: `naive-bayes/hooks/__tests__/whitebox.getNumericInputError.test.ts` (28 jalur bernomor + 1 catatan temuan `KFolds = 1`) memuat masukan serupa untuk jalur galat; perbedaan yang dapat diverifikasi dari berkasnya: tidak ada jalur dengan `ValidationMethod` di luar union (jalur 27 di sini), dan jalur galat Training Percentage setelah blok Text Features dilewati dengan dua cara berbeda (jalur 18 dan 19 di sini) tidak ada di tes lama.

Hasil eksekusi di VM (`logs/jest_B_vm.json`, ts-jest, bukan perangkat uji skripsi): 29 dari 29 tes jalur lulus.

## WB-3 — `useNaiveBayesValidation` (Naive Bayes)

Sumber: `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation.ts`. Berkas tes: `frontend/components/Modals/Analyze/Classify/naive-bayes/hooks/__tests__/eval/whitebox.useNaiveBayesValidation.test.ts`.

Blok `useMemo` pada `useNaiveBayesValidation` (baris 120–170) membangun daftar `errors` untuk tombol OK: target kosong, predictor kosong (dengan aturan N5-8), Complement bercampur predictor, dan konfigurasi Text Preprocessing.

### Tabel simpul

Keputusan pemecahan: (a) `!TargetVar && (SpecificationMode ?? "exclude") === "exclude"` (baris 139–140) dipecah menjadi simpul 5 (`!TargetVar`), simpul 6 (cabang `??`, dengan dua pernyataan penetapan 7 dan 8), simpul 9 (`=== "exclude"`), dan penetapan `predictorBelumBermakna` (10 dan 11); (b) `(len === 0 || belumBermakna) && !hasText` (baris 142–143) menjadi simpul 12, 13, 14; (c) `hasText && complement && len > 0` (baris 152–156) menjadi simpul 16, 17, 18; (d) `for...of` atas hasil `validateStwvConfig` menjadi simpul predikat loop 21 (jalur dibatasi paling banyak satu iterasi). Pemanggilan `getEffectivePredictors`, `getEffectiveTextSource`, dan `validateStwvConfig` tidak diperluas. `errors.length === 0` pada `return` hanya ekspresi nilai, bukan percabangan.

| Simpul | Pernyataan |
|---|---|
| S | Simpul awal (entry, sintetis): Mulai (callback useMemo) |
| 1 | `const errors: string[] = []` (pernyataan, baris 121) |
| 2 | `!formData.main.TargetVar` (predikat, baris 123) |
| 3 | `errors.push("Select a target variable.")` (pernyataan, baris 124) |
| 4 | `effectivePredictors = getEffectivePredictors(...); textSource = getEffectiveTextSource(...); hasText = textSource !== "none"  (pemanggilan fungsi tidak diperluas)` (pernyataan, baris 127-132) |
| 5 | `!formData.main.TargetVar  (operan kiri && pada predictorBelumBermakna)` (predikat, baris 139) |
| 6 | `formData.main.SpecificationMode ?? "exclude"  (cabang ??: operan kiri nullish?)` (predikat, baris 140) |
| 7 | `mode <- "exclude"  (cabang kanan ??)` (pernyataan, baris 140) |
| 8 | `mode <- formData.main.SpecificationMode  (cabang kiri ??)` (pernyataan, baris 140) |
| 9 | `(...) === "exclude"  (operan kanan &&)` (predikat, baris 140) |
| 10 | `predictorBelumBermakna <- true` (pernyataan, baris 138) |
| 11 | `predictorBelumBermakna <- false` (pernyataan, baris 138) |
| 12 | `effectivePredictors.length === 0  (operan 1 \|\|)` (predikat, baris 142) |
| 13 | `predictorBelumBermakna  (operan 2 \|\|)` (predikat, baris 142) |
| 14 | `!hasText  (operan && luar)` (predikat, baris 143) |
| 15 | `errors.push("Select at least one predictor variable ... or add Text Features.")` (pernyataan, baris 145) |
| 16 | `hasText  (operan 1 &&)` (predikat, baris 153) |
| 17 | `formData.options.TextLikelihood === "complement"  (operan 2 &&)` (predikat, baris 154) |
| 18 | `effectivePredictors.length > 0  (operan 3 &&)` (predikat, baris 155) |
| 19 | `errors.push("Complement Naive Bayes can only be used when ...")` (pernyataan, baris 157) |
| 20 | `textSource === "raw"` (predikat, baris 163) |
| 21 | `for (const message of validateStwvConfig(formData.text))  (kondisi iterasi)` (predikat, baris 164) |
| 22 | `errors.push(`Text Preprocessing: ${message}`)` (pernyataan, baris 165) |
| 23 | `return { isValid: errors.length === 0, errors }` (return, baris 169) |
| X | Simpul akhir (exit, sintetis): semua `return` bermuara ke sini |

### Daftar sisi (edge list)

S→1; 1→2; 2→3 (T); 2→4 (F); 3→4; 4→5; 5→6 (T); 5→11 (F); 6→7 (T); 6→8 (F); 7→9; 8→9; 9→10 (T); 9→11 (F); 10→12; 11→12; 12→14 (T); 12→13 (F); 13→14 (T); 13→16 (F); 14→15 (T); 14→16 (F); 15→16; 16→17 (T); 16→20 (F); 17→18 (T); 17→20 (F); 18→19 (T); 18→20 (F); 19→20; 20→21 (T); 20→23 (F); 21→22 (T); 21→23 (F); 22→21; 23→X

Berkas CSV: [edges_WB-3_useNaiveBayesValidation.csv](whitebox/edges_WB-3_useNaiveBayesValidation.csv).

### Flow graph

DOT: [WB-3_useNaiveBayesValidation.dot](whitebox/WB-3_useNaiveBayesValidation.dot); PNG: [WB-3_useNaiveBayesValidation.png](whitebox/WB-3_useNaiveBayesValidation.png).

![Flow graph WB-3](whitebox/WB-3_useNaiveBayesValidation.png)

### Kompleksitas siklomatik

| N | E | P | V(G) = E − N + 2 | P + 1 | Verifikasi |
|---|---|---|---|---|---|
| 25 | 36 | 12 | 13 | 13 | sama |

V(G) = 13 = P + 1 dengan P = 12. Dari 600 jalur struktural (loop ≤ 1 iterasi) hanya 56 yang layak (simulasi 2·2·2·2·3·2·2 = 192 keadaan abstrak masukan), dan rank vektor-sisi himpunan jalur layak itu adalah **12**, bukan 13. Penyebabnya: simpul 2 dan simpul 5 membaca nilai yang sama (`formData.main.TargetVar`) sehingga selalu bernilai sama. Uji tandingan dengan skrip: bila simpul 5 dianggap independen dari simpul 2, rank himpunan jalur layak menjadi 13; jadi korelasi inilah yang menghilangkan satu derajat kebebasan.

### Basis set jalur independen

Jalur dasar (1): target terisi, ada predictor, tanpa fitur teks. Jalur 2–12 dipilih secara greedy dari himpunan jalur layak (urut dari masukan paling sederhana) dan diperiksa rank-nya (12 jalur layak independen). **Jalur 13 infeasible**: jalur independen ke-13 secara struktural adalah membalik simpul 5 saja dari jalur dasar, yaitu `S-1-2-4-5-6-7-9-10-12-13-16-20-23-X` (simpul 2 salah, simpul 5 benar). Ini mustahil karena `TargetVar` tidak berubah di antara baris 123 dan 139: `!TargetVar` tidak mungkin salah di simpul 2 lalu benar di simpul 5. Dari jalur dasar ada 3 pembalikan tunggal yang infeasible (simpul 5, 13, 20: masing-masing memaksa nilai bertentangan dengan keadaan sebelumnya, mis. `belumBermakna` benar padahal target terisi, atau `textSource = raw` padahal `hasText` salah). Selama pembangkitan basis tercatat 33 pembalikan predikat infeasible dari seluruh jalur yang ditelusuri; semuanya berasal dari ketergantungan antarpredikat (target kosong pada simpul 2/5/9, `belumBermakna` pada simpul 13, `hasText` pada simpul 14/16/20, jumlah predictor pada simpul 12/18) dan hanya ketergantungan simpul 2 dan 5 yang menurunkan rank.

| Jalur | Simpul | Masukan | Keluaran yang diharapkan | Hasil |
|---|---|---|---|---|
| 1 | S-1-2-4-5-11-12-13-16-20-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), tanpa fitur teks | isValid = true; errors = [] | Lulus [Win] |
| 2 | S-1-2-4-5-11-12-13-16-17-20-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Word-Vector = VEC_baik, VEC_buruk | isValid = true; errors = [] | Lulus [Win] |
| 3 | S-1-2-4-5-11-12-14-15-16-20-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), tanpa prediktor efektif, tanpa fitur teks | isValid = false; errors = ["Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] | Lulus [Win] |
| 4 | S-1-2-4-5-11-12-14-16-17-20-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), tanpa prediktor efektif, Word-Vector = VEC_baik, VEC_buruk | isValid = true; errors = [] | Lulus [Win] |
| 5 | S-1-2-4-5-11-12-13-16-17-20-21-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Raw Text = Text Tweet | isValid = true; errors = [] | Lulus [Win] |
| 6 | S-1-2-4-5-11-12-14-16-17-18-20-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), tanpa prediktor efektif, Word-Vector = VEC_baik, VEC_buruk, TextLikelihood = complement | isValid = true; errors = [] | Lulus [Win] |
| 7 | S-1-2-4-5-11-12-13-16-17-18-19-20-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Word-Vector = VEC_baik, VEC_buruk, TextLikelihood = complement | isValid = false; errors = ["Complement Naive Bayes can only be used when the model contains Text Features only. Choose Multinomial or Bernoulli, or remove the numeric/categorical predictors."] | Lulus [Win] |
| 8 | S-1-2-3-4-5-6-8-9-11-12-13-16-20-23-X | TargetVar kosong (null), SpecificationMode = candidates, ada prediktor efektif (Pasangan Calon), tanpa fitur teks | isValid = false; errors = ["Select a target variable."] | Lulus [Win] |
| 9 | S-1-2-4-5-11-12-13-16-17-20-21-22-21-23-X | TargetVar = Sentiment, SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), Raw Text = Text Tweet, wordsToKeep = -1 | isValid = false; errors = ["Text Preprocessing: Words to Keep must be a whole number of 0 or more (0 keeps all words)."] | Lulus [Win] |
| 10 | S-1-2-3-4-5-6-8-9-10-12-14-15-16-20-23-X | TargetVar kosong (null), SpecificationMode = exclude (bawaan), tanpa prediktor efektif, tanpa fitur teks | isValid = false; errors = ["Select a target variable."; "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] | Lulus [Win] |
| 11 | S-1-2-3-4-5-6-7-9-10-12-13-14-15-16-20-23-X | TargetVar kosong (null), SpecificationMode tidak ada (undefined), ada prediktor efektif (Pasangan Calon), tanpa fitur teks | isValid = false; errors = ["Select a target variable."; "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] | Lulus [Win] |
| 12 | S-1-2-3-4-5-6-8-9-10-12-13-14-15-16-20-23-X | TargetVar kosong (null), SpecificationMode = exclude (bawaan), ada prediktor efektif (Pasangan Calon), tanpa fitur teks | isValid = false; errors = ["Select a target variable."; "Select at least one predictor variable (using Variables to Exclude or Candidate Factors / Covariates) or add Text Features."] | Lulus [Win] |

Hubungan dengan tes lama: `naive-bayes/hooks/__tests__/whitebox.useNaiveBayesValidation.test.ts` memuat 10 jalur (WB-3 lama) tanpa pemecahan `??` dan `&&` per operan; tes evaluasi ini memakai pemecahan yang lebih halus (V(G) = 13) dan membuktikan bahwa 12 jalur layak.

Hasil eksekusi di VM (`logs/jest_B_vm.json`, ts-jest, bukan perangkat uji skripsi): 12 dari 12 tes jalur lulus.

## WB-4 — `loadModelFromFile` (Apply Model)

Sumber: `frontend/components/Modals/Analyze/Classify/apply-model/services/model-loader.ts`. Berkas tes: `frontend/components/Modals/Analyze/Classify/apply-model/services/__tests__/eval/whitebox.loadModelFromFile.test.ts`.

`loadModelFromFile` memvalidasi ekstensi dan ukuran file, membaca dan mem-parse JSON, lalu memanggil `finalizeLoad` (validasi umum `validateAnyModel` dan penyusunan hasil).

### Tabel simpul

Keputusan pemecahan: blok `try/catch` dimodelkan dengan dua predikat eksepsi implisit (simpul 6: `file.text()` menolak; simpul 7: `JSON.parse` melempar) karena keduanya adalah sumber percabangan ke `catch` dengan sebab berbeda. `finalizeLoad` diperluas (inline) sehingga predikat `!validation.ok` menjadi simpul 10. `validateAnyModel` dan adapter tidak diperluas.

| Simpul | Pernyataan |
|---|---|
| S | Simpul awal (entry, sintetis): Mulai |
| 1 | `!file.name.toLowerCase().endsWith(".json")` (predikat, baris 166) |
| 2 | `return fail("AM_E_PARSE", file.name)` (return, baris 167) |
| 3 | `file.size > MAX_MODEL_FILE_BYTES` (predikat, baris 169) |
| 4 | `return fail("AM_E_FILE_TOO_LARGE", file.name)` (return, baris 170) |
| 5 | `let raw: unknown;  try {` (pernyataan, baris 173-174) |
| 6 | `const text = await file.text()  (cabang eksepsi implisit ke catch)` (predikat, baris 175) |
| 7 | `raw = JSON.parse(text)  (cabang eksepsi implisit ke catch)` (predikat, baris 176) |
| 8 | `} catch { return fail("AM_E_PARSE", file.name) }` (return, baris 178) |
| 9 | `return finalizeLoad(raw, file.name, `File: ${file.name}`) -> const validation = validateAnyModel(raw)  (pemanggilan fungsi tidak diperluas)` (pernyataan, baris 181 / 68) |
| 10 | `!validation.ok  (di finalizeLoad)` (predikat, baris 69) |
| 11 | `return { ok: false, errors: validation.errors }` (return, baris 70) |
| 12 | `return { ok: true, model, descriptor, sourceRef, sourceLabel }` (return, baris 72-77) |
| X | Simpul akhir (exit, sintetis): semua `return` bermuara ke sini |

### Daftar sisi (edge list)

S→1; 1→2 (T); 1→3 (F); 3→4 (T); 3→5 (F); 5→6; 6→8 (T); 6→7 (F); 7→8 (T); 7→9 (F); 9→10; 10→11 (T); 10→12 (F); 2→X; 4→X; 8→X; 11→X; 12→X

Berkas CSV: [edges_WB-4_loadModelFromFile.csv](whitebox/edges_WB-4_loadModelFromFile.csv).

### Flow graph

DOT: [WB-4_loadModelFromFile.dot](whitebox/WB-4_loadModelFromFile.dot); PNG: [WB-4_loadModelFromFile.png](whitebox/WB-4_loadModelFromFile.png).

![Flow graph WB-4](whitebox/WB-4_loadModelFromFile.png)

### Kompleksitas siklomatik

| N | E | P | V(G) = E − N + 2 | P + 1 | Verifikasi |
|---|---|---|---|---|---|
| 14 | 18 | 5 | 6 | 6 | sama |

V(G) = 6 = P + 1 dengan P = 5. Untuk perbandingan: `loadModelFromFile` saja (tanpa memperluas `finalizeLoad`) V(G) = 5 dan `finalizeLoad` sendiri V(G) = 2; hasil gabungan 5 + 2 − 1 = 6.

### Basis set jalur independen

Semua 6 jalur layak. Jalur 5 memakai `"[]"` (JSON sah tetapi bukan objek): `validateAnyModel` mengembalikan `AM_E_NOT_OBJECT` (tanpa `detail`). Jalur 6 memakai fixture NB asli `nb-model-v1_1.json`; `validateAnyModel` dan adapter dipakai asli (tidak dimock).

| Jalur | Simpul | Masukan | Keluaran yang diharapkan | Hasil |
|---|---|---|---|---|
| 1 | S-1-3-5-6-7-9-10-12-X | file "model.json" berisi fixture model NB sah (nb-model-v1_1.json), ukuran wajar | ok = true; sourceRef = "model.json"; sourceLabel = "File: model.json"; descriptor.modelType = "naive_bayes" | Lulus [Win] |
| 2 | S-1-2-X | file.name = "model.txt" (bukan .json) | ok = false; errors = [{code: "AM_E_PARSE", severity: "error", detail: "model.txt"}] | Lulus [Win] |
| 3 | S-1-3-4-X | file.name = "big.json", file.size = MAX_MODEL_FILE_BYTES + 1 | ok = false; errors = [{code: "AM_E_FILE_TOO_LARGE", severity: "error", detail: "big.json"}] | Lulus [Win] |
| 4 | S-1-3-5-6-8-X | file.text() ditolak (reject) pada "unreadable.json" | ok = false; errors = [{code: "AM_E_PARSE", severity: "error", detail: "unreadable.json"}] | Lulus [Win] |
| 5 | S-1-3-5-6-7-8-X | isi file "{bad" (JSON.parse melempar SyntaxError) | ok = false; errors = [{code: "AM_E_PARSE", severity: "error", detail: "bad.json"}] | Lulus [Win] |
| 6 | S-1-3-5-6-7-9-10-11-X | isi file "[]" (JSON sah, bukan objek; validateAnyModel gagal) | ok = false; errors = [{code: "AM_E_NOT_OBJECT", severity: "error"}] (tanpa detail) | Lulus [Win] |

Hubungan dengan tes lama: `apply-model/services/__tests__/model-loader.test.ts` memuat kasus fungsional (D1/D2, ekstensi, ukuran, parse, tipe model, dsb.) dan memberi pola mock `File`; tes evaluasi ini mengulang pola itu tetapi per jalur basis set.

Hasil eksekusi di VM (`logs/jest_B_vm.json`, ts-jest, bukan perangkat uji skripsi): 6 dari 6 tes jalur lulus.

## Rekap

| Fungsi | Menu | V(G) | Jalur independen | Kasus lulus |
|---|---|---|---|---|
| WB-1 `validateColumnPrefix` | String to Word Vector | 7 | 7 (rank 7) | 7 dari 7 [VM] |
| WB-2 `getNumericInputError` | Naive Bayes | 29 | 29 (rank 29) | 29 dari 29 [VM] |
| WB-3 `useNaiveBayesValidation` | Naive Bayes | 13 | 12 (rank 12) | 12 dari 12 [VM] |
| WB-4 `loadModelFromFile` | Apply Model | 6 | 6 (rank 6) | 6 dari 6 [VM] |
| Total | | 55 | 54 | 54 dari 54 [VM] |

Catatan rekap: "Jalur independen" adalah jumlah jalur layak yang dites (sama dengan rank). Pada WB-3 jumlah ini 12 < V(G) = 13 karena satu jalur basis infeasible. Angka "Kasus lulus" dibaca dari `logs/jest_B_vm.json` (eksekusi di VM Linux dengan ts-jest, 54 tes); angka dari perangkat Windows (config produksi) menunggu `run_B.ps1` dan akan ditulis ke `logs/jest_B_win.json`.

## Hubungan dengan tes whitebox lama

Tes lama milik pengguna tidak diubah dan tidak disalin: `naive-bayes/hooks/__tests__/whitebox.getNumericInputError.test.ts` (WB-2 lama, 28 jalur), `whitebox.useNaiveBayesValidation.test.ts` (WB-3 lama, 10 jalur), `StringToWordVector/__tests__/columnPrefix.test.ts` (WB-1, uji perilaku). Hasil jalannya ada di `logs/whitebox_nb.txt` dan `logs/whitebox_stwv.txt`. Perbedaan analisis: tes baru ini (i) memecah kondisi majemuk per operan secara konsisten, (ii) memverifikasi V(G) dengan skrip dan rank, (iii) menandai jalur infeasible secara eksplisit, dan (iv) menambahkan WB-4 yang belum ada di tes lama. Berkas baru berada di folder `__tests__/eval/` dan nama tesnya memuat ID jalur (mis. `WB-2 jalur 14: ...`).

## Temuan

Lihat `BUGS_B.md` (dua pengamatan berprioritas rendah; tidak ada kegagalan tes).
