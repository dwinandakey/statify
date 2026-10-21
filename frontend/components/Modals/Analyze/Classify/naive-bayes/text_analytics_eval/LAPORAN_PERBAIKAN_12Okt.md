# Laporan Perbaikan 12 Oktober 2026 — B9 (peringatan/galat Naive Bayes) dan uji demo

Disusun 12-10-2026 (malam sebelum sidang 13-10-2026, 13.30 WIB). Lingkup: hanya Modul Text Analytics. Tidak ada `git push`, tidak ada `npm audit fix`/`npm update`, tidak ada perubahan Rust/wasm/worker/rumus/format model, tidak ada perangkat lunak baru yang dipasang (selain dependensi proyek lewat `npm install` sesuai instruksi).

---

## A. Lingkungan

### Versi alat

| Alat | Terpasang di laptop | Versi di buku skripsi | Catatan |
|---|---|---|---|
| Node.js | **v22.23.2** | v24.13.1 | **Berbeda.** Semua uji (Jest dan peramban) lulus dengan v22. Tidak diganti malam ini (butuh izin pemasangan dan berisiko). |
| npm | 10.9.8 | — | |
| git | 2.55.0.windows.5 | — | |
| Jest | 30.0.4 | 30.0.4 | Sama. |
| Next.js | 15.5.9 | — | Dari log `npm run dev:frontend`. |
| cargo/rustc | cargo 1.99.0 | 1.93.0 | Berbeda; tidak dipakai (wasm tidak dibangun ulang, `cargo test` tidak dijalankan). |
| wasm-pack | **tidak terpasang** | 0.14.0 | Tidak diperlukan untuk demo. |
| Python | 3.13.15 | 3.13.12 | Hanya dipakai untuk menghitung baris CSV. |

### `npm install` (akar, workspaces)

- Berhasil: `added 1266 packages, and audited 1269 packages in 3m`; `postinstall` patch-package: `Applying patches... sav-reader@2.0.8 ✔`.
- Peringatan: paket usang (rimraf, glob, eslint 8, dll.) dan `124 vulnerabilities (6 low, 47 moderate, 66 high, 5 critical)`. **Tidak** di-`audit fix` (aturan 1).
- `npm install` mengubah `package-lock.json` (27 baris, hanya metadata: penanda `"dev": true` dan `patch-package` di blok `backend`, tanpa perubahan versi). Perubahan itu **dikembalikan** (`git checkout -- package-lock.json`); `node_modules` tetap utuh dan semua uji berjalan. Diff disimpan di luar repo (scratchpad sesi) untuk rujukan.

### Git

| | Nilai |
|---|---|
| Branch awal | `dija-v2` (bersih, sejajar `origin/dija-v2`) |
| HEAD awal | `741957f4fe40ca9e1de98902274ca1e09398c34b` ("sampah, lg back up, mungkin dihapus") |
| Branch kerja | `fix/b9-peringatan-nb-12okt` (dibuat dari HEAD awal) |
| Commit perbaikan B9 | `d6f2e12a3d3b725ba41ef9ca776cd9f764dd49ca` |
| Commit laporan + log | commit berikutnya di branch yang sama (lihat `git log`) |

### Penyesuaian lingkungan (bukan perubahan kode)

1. **Dataset tes integrasi.** Lima suite integrasi (IT-01..IT-05) membaca `statify64/frontend/components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/accuracy/datasets/pilkada_{train,test}.csv`, yang belum ada di laptop baru (`ENOENT`). Kedua berkas disalin dari `SIDANG\` (folder SIDANG hanya dibaca) dan folder itu dikecualikan lewat `.git/info/exclude` (lokal, tidak ter-commit).
2. **Cache Jest.** `jest.eval.config.js` memakai `cacheDirectory: process.env.JEST_CACHE_DIR`; tanpa variabel ini Jest 30 gagal dengan `TypeError [ERR_INVALID_ARG_TYPE] ... Received undefined`. Saat menjalankan Jest, set `JEST_CACHE_DIR` ke folder sementara (lihat perintah di bawah).
3. **Identitas git** belum diatur di laptop baru. Commit dibuat dengan `git -c user.name="Dija" -c user.email=...` (identitas yang sama dengan riwayat repo) tanpa mengubah konfigurasi global.
4. `.claude/launch.json` (konfigurasi pratinjau lokal) dibuat dan dikecualikan lewat `.git/info/exclude`.

Perintah Jest yang dipakai (dari folder `frontend`, PowerShell):

```powershell
$env:JEST_CACHE_DIR = "$env:TEMP\jestcache"
npx jest -c ..\frontend\components\Modals\Analyze\Classify\naive-bayes\text_analytics_eval\jest.eval.config.js components/Modals/Analyze/Classify/naive-bayes components/Modals/Analyze/Classify/apply-model
```

---

## B. Demo Fase 0 (peramban, `npm run dev:frontend`, http://localhost:3000)

CSV dimasukkan ke dialog **File → Import Data → CSV Data** yang asli (berkas dipilih ke input berkas dialog itu), lalu semua langkah lewat menu aplikasi. Opsi STWV dan NB memakai default kecuali disebut.

| Langkah | Sebelum perbaikan (HEAD `741957f4`) | Sesudah perbaikan (`d6f2e12a`) |
|---|---|---|
| a. Impor `pilkada_train.csv` | **Berhasil.** 630 baris, kolom Id, Sentiment, Pasangan Calon, Text Tweet. | **Berhasil.** Toast "Import Berhasil: File pilkada_train.csv berhasil diimpor ke dalam sistem." |
| b. Transform → String to Word Vector (Text Tweet) | **Berhasil.** 1000 kolom `VEC_` (VEC_#3 … VEC_6) di Data View; Output Viewer: "1000 vector columns were created from variable Text Tweet … (630 documents, 0 with a zero vector)", tabel Processing Summary, Settings, Vocabulary. | **Berhasil.** Toast "1000 vector columns were added to the dataset."; keluaran sama. |
| c1. Naive Bayes, Raw Text, holdout 70/30 | **Berhasil.** Case Processing Summary, Model Evaluation Metrics, Cohen's Kappa, Confusion Matrix, Text Feature Table, Export Model tampil. Overall Accuracy 0.761. | **Berhasil.** Tabel sama; tanpa baris Note (benar, tidak ada peringatan). Overall Accuracy 0.691.* |
| c2. Naive Bayes, Raw Text, 10-fold | **Berhasil.** Semua tabel di atas tampil. Overall Accuracy 0.719. | **Berhasil.** Semua tabel, tanpa Note. Overall Accuracy 0.729.* |
| d. Export Model → Apply Model pada `pilkada_test.csv` | **Berhasil.** Export menghasilkan `Naive_Bayes_Model_Export.json` (137.290 karakter, schema 2.0, raw text, 1000 term). Apply Model (Upload file) → toast "Predictions complete: 270 rows scored. New columns: NB_PredictedValue, NB_PredictedProbability."; probabilitas terisi (mis. 0.9411); Overall Accuracy 0.763. | **Berhasil.** Pesan dan angka identik (270 baris, akurasi 0.763). |

\* Selisih akurasi holdout/10-fold antar-run **bukan** akibat perubahan kode: "Use random seed" tidak dicentang (`RandomSeed: null`, model JSON mencatat `"seed": null`), sehingga pembagian data acak setiap run. Akurasi Apply Model identik (0.763) karena model akhir selalu dilatih pada seluruh data.

Catatan: berkas hasil Export diambil dari tautan unduhan yang dibuat aplikasi (blob) lalu dipakai pada opsi **Upload file (.json)** Apply Model, jadi jalur Export → Upload benar-benar teruji.

---

## C. B9 — peringatan/galat mesin Rust Naive Bayes

### Akar masalah (diverifikasi dari kode, bukan ditebak)

- Worker `frontend/public/workers/Classify/NaiveBayes/naive-bayes.worker.js` mengirim `{ success: true, data, errors }`; `errors` = **string** `get_all_errors()` Rust (`NB/rust/src/utils/error.rs`): `"No errors occurred."` atau `"Error Summary:\nContext: <ctx>\n  1. <pesan>\n"`. Pada kegagalan: `{ success: false, error }`.
- Pada run sukses, `ErrorCollector` hanya berisi peringatan non-fatal (galat fatal membuat `run_analysis` → `None` dan `get_formatted_results()` gagal). Peringatan yang ada: `validation.kfold` dari `validate_fold_count` (`NB/rust/src/stats/partition.rs`): "Number of folds (k) exceeds the smallest class size (m). … The analysis will still run."
- `NB/services/naive-bayes-analysis.ts` hanya membaca `success`, `error`, `data`; `errors` dibuang → BB-37 tanpa peringatan.
- BB-38 (Raw Text): konstruktor Rust melempar ringkasan galat ("Number of folds (11) cannot be greater than the number of valid instances (10). …"), worker meneruskannya sebagai `error`, dan `getUserFriendlyNaiveBayesError` sudah memetakannya ke pesan cross-validation. Mesin **tidak** mengirim kode `NB_E_*` untuk galat fold, sehingga pesan umum cross-validation adalah pesan yang benar menurut `naive-bayes-error-messages.ts`. Jalur galat tidak diubah.

### Berkas yang diubah (hanya `NB/services/`)

| Berkas | Ringkasan diff |
|---|---|
| `services/naive-bayes-analysis.ts` | + `getNaiveBayesEngineWarnings(errors)` (mengambil baris bernomor `  1. …` dari ringkasan Rust; non-string/`"No errors occurred."` → `[]`). Di `onmessage` sukses, peringatan disimpan lalu diteruskan ke `transformNaiveBayesResult` dan `resultNaiveBayes`. |
| `services/naive-bayes-analysis-formatter.ts` | Parameter opsional `engineWarnings: string[] = []` pada `transformNaiveBayesResult` dan `buildCaseProcessingSummaryTable`; tiap peringatan menjadi baris `Note` di akhir Case Processing Summary (pola catatan W-LEAK). |
| `services/naive-bayes-analysis-output.ts` | Field opsional `engineWarnings`; bila tabel Case Processing Summary tidak ada (output dimatikan), peringatan ditaruh di `note` analytic (ditampilkan Output Viewer di bawah judul). Tanpa peringatan, `note` tetap `""`. |

Total: 3 berkas, +45/−5 baris. Teks peringatan adalah teks Inggris asli dari Rust; tidak ada teks UI baru. Toast peringatan tidak ditambahkan (pola `toast.warning` di modul hanya dipakai untuk batas salin tabel, bukan hasil analisis).

### Tes Jest baru (`NB/services/__tests__/`)

| Berkas | Tes | Sebelum fix | Sesudah fix |
|---|---|---|---|
| `naive-bayes-analysis-engine-warnings.test.ts` | parser: ambil pesan bernomor | gagal | lulus |
| | parser: `"No errors occurred."`/undefined/non-string → kosong | gagal | lulus |
| | (a) respons sukses + warning → Note tampil, hasil tetap ditulis | gagal | lulus |
| | (c) respons normal tanpa warning → tanpa Note, tabel identik dengan respons tanpa field `errors` | gagal | lulus |
| | (b) galat berkode (`NB_E_TEXT_NEGATIVE`) → pesan berkode dari `naive-bayes-error-messages.ts` | lulus | lulus |
| | galat fold tanpa kode (BB-38) → pesan cross-validation, hasil tidak ditulis | lulus | lulus |
| `naive-bayes-analysis-output-warnings.test.ts` | CPS aktif → catatan analytic kosong | lulus | lulus |
| | CPS mati → peringatan jadi catatan analytic | gagal | lulus |
| | tanpa peringatan → catatan kosong (perilaku lama) | lulus | lulus |

Ringkas: **5 gagal / 4 lulus sebelum**, **9/9 lulus sesudah**. Empat tes yang sudah lulus sebelum perbaikan adalah tes penjaga regresi untuk perilaku yang memang tidak diubah (jalur galat dan perilaku tanpa peringatan); aturan "gagal sebelum" berlaku untuk tes perubahan perilaku (a, parser, catatan analytic). Tes (c) gagal sebelum perbaikan hanya karena field baru `engineWarnings` belum ada; tabelnya sendiri tidak berubah.

### Hasil Jest NB + AM (`jest.eval.config.js`)

| | Suite | Tes | Log |
|---|---|---|---|
| Sebelum | 63/63 lulus | 1147/1147 lulus | `logs/jest_B9_sebelum_12okt.{txt,json}` |
| Sesudah | 65/65 lulus | 1156/1156 lulus | `logs/jest_B9_sesudah_12okt.{txt,json}` |
| Tes baru saja | — | 4/9 → 9/9 | `logs/jest_B9_tesbaru_sebelum_12okt.txt`, `logs/jest_B9_tesbaru_sesudah_12okt.txt` |

`tsc --noEmit` (frontend): tidak ada galat di berkas yang diubah atau tes baru. Repo memiliki 40 galat tipe lama di berkas tes lain (mis. `naive-bayes/__tests__/eval/blackbox.nb.output.test.tsx`, `apply-model/.../integration.it01.vector-nb.test.ts`, modul tim lain); semuanya sudah ada sebelum perubahan ini dan tidak memengaruhi Jest (ts-jest `diagnostics: false`).

---

## D. Black-box manual (peramban)

Dataset: `SIDANG\_kerja_claude\dataset_blackbox\bb_pilkada_10baris.csv` (10 baris: 5 negative, 5 positive). Target = Sentiment; Raw Text Variable = Text Tweet; Id dan Pasangan Calon di Variables to Exclude; tanpa seed.

| ID | Skenario | Sebelum perbaikan | Sesudah perbaikan (teks persis) | Hasil |
|---|---|---|---|---|
| BB-36 | Cross-Validation, Number of Folds = 0 | — (tidak diuji sebelum) | Toast: `The number of folds must be at least 1.` Panel tetap terbuka, tidak ada log analisis baru. | **Berhasil** |
| BB-37 | Folds = 6 (> kelas terkecil 5, ≤ 10 kasus) | Analisis jalan; toast `Naive Bayes analysis completed. See the results in the Output Viewer.`; **tidak ada peringatan** (bug). | Analisis jalan; toast `Naive Bayes analysis completed. See the results in the Output Viewer.`; Case Processing Summary memuat baris **Note**: `Number of folds (6) exceeds the smallest class size (5). Some folds will not contain any instance of that class, so class proportions across folds will not be perfectly balanced. The analysis will still run.` | **Berhasil** |
| BB-38 | Folds = 11 (> 10 kasus) | Toast `Running Naive Bayes analysis...` lalu `Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class.`; tidak ada log baru. | Sama persis: `Check the cross-validation settings. The number of folds must not exceed the number of cases or the size of the smallest class.`; tidak ada log baru (analisis tidak dijalankan). Mesin tidak mengirim kode `NB_E_*` untuk galat ini, jadi tidak ada kode yang ditampilkan. | **Berhasil** |
| Holdout normal | Training and Holdout Partition 70/30 | — | Toast `Naive Bayes analysis completed. See the results in the Output Viewer.`; Validation Scenario `Training/Holdout split (70% / 30%)`; tanpa baris Note. | **Berhasil** |
| Tambahan | Folds = 5 (= kelas terkecil) | — | Analisis jalan, `5-fold cross-validation`, tanpa baris Note. | **Berhasil** |

---

## E. Belum selesai, risiko demo, dan cara kembali

### Belum selesai (sengaja tidak diubah)

1. **Jalur tanpa fitur Text (v1).** Bila fold > jumlah kasus pada model tanpa Text, konstruktor Rust tidak melempar; `get_formatted_results()` gagal dengan `No analysis results available` dan pengguna melihat pesan umum `The Naive Bayes analysis could not be completed. …` (BUGS.md C2-01 butir 3). Memperbaikinya butuh perubahan worker (menyertakan `get_all_errors()` saat gagal); tidak dikerjakan karena BB-38 di buku memakai Raw Text dan stabilitas diutamakan.
2. **Kode galat fold.** Galat/peringatan fold di Rust tidak berkode `NB_E_*` (C2-01 butir 2). Tidak diubah (Rust dilarang disentuh).
3. **Rust/`cargo test`** tidak dijalankan (wasm-pack tidak ada, cargo 1.99 ≠ 1.93, tidak diperlukan untuk demo).

### Risiko untuk demo besok

1. **Hasil acak tanpa seed.** Holdout dan k-fold tanpa "Use random seed" memberi akurasi berbeda tiap run (0.761 vs 0.691 pada holdout yang sama). Bila angka di layar harus sama dengan buku, centang **Use random seed** dengan seed yang dipakai di buku.
2. **Node v22 vs v24** (buku). Semua uji lulus dengan v22; jangan ganti versi malam ini.
3. **Jendela sempit.** Baris Note panjang membuat tabel Case Processing Summary bisa digulir horizontal, dan pada panel sempit halaman sesekali bergeser ke samping (tombol Reset bisa tertekan tanpa sengaja di dekat OK). Pakai peramban layar penuh saat demo.
4. **Mengecualikan kolom VEC_.** Setelah STWV, mode Exclude memakai semua kolom VEC_ sebagai prediktor. Filter `VEC_` + Select All (filtered) **tidak** menangkap satu kolom berlabel `Vector of "&"`. Cara aman: pindahkan Target dan Raw Text dulu, kosongkan filter, lalu **Select All (filtered)** → Variables to Exclude (semua sisa sekaligus).
5. **Data uji di peramban.** IndexedDB peramban pane pengujian berisi dataset uji dan 12 log hasil; peramban demo milik pemilik terpisah, tetapi bila memakai profil yang sama, bersihkan Output Viewer (ikon tempat sampah) dan muat ulang dataset demo.
6. Toast impor berbahasa Indonesia ("Import Berhasil: …") berasal dari modul impor (bukan modul Text Analytics); tidak diubah.

### Pertanyaan untuk pemilik (aturan 6)

- Penomoran BB berbeda antardokumen: di `C_blackbox.md` BB-36 adalah persistensi menu Naive Bayes (dan dokumen berhenti di BB-36), sedangkan instruksi ini memakai BB-36 = fold 0, BB-37 = fold > kelas terkecil, BB-38 = fold > kasus (kemungkinan penomoran buku). Laporan ini mengikuti penomoran instruksi; mohon pastikan cocok dengan tabel di buku.

### Cara kembali ke versi aman

Branch `dija-v2` tidak diubah (tetap di `741957f4`, sama dengan `origin/dija-v2`). Untuk kembali:

```powershell
git switch dija-v2
```

Dev server Next.js memuat ulang otomatis; bila tidak, hentikan dan jalankan lagi `npm run dev:frontend`. Alternatif tanpa pindah branch: `git revert d6f2e12a`. Tidak ada yang di-push.
