# Release notes: build final skripsi (`release/skripsi-final`, tag `skripsi-final-v1`)

Tanggal: 2026-09-24. Belum di-push dan belum di-deploy.

## 1. Asal branch dan commit yang digabung

`release/skripsi-final` dibuat dari **`main` `4cb3507d`** (= `origin/main`). Dua branch digabung dengan `git merge --no-ff`, tanpa squash, sehingga riwayat per langkah tetap terlihat.

| Urutan | Merge commit | Branch | Ujung branch | Commit baru terhadap basis |
|---|---|---|---|---|
| 1 | `af92dd9d` | `fix/rm-correctness` | `61940c6b` | 22 (terhadap `main`) |
| 2 | `29ca035a` | `validation/mv-spss` | `90fc8984` | 23 (terhadap `fix/rm-correctness`) |

**Konflik: tidak ada** di kedua merge, jadi tidak ada penyelesaian manual. Isi akhir release = isi `validation/mv-spss` + `testing/glm-rm-reference/results/thesis-diagram-facts.md` (`git diff validation/mv-spss release/skripsi-final` hanya berkas itu).

**Hubungan antar-branch:**
- `fix/rm-correctness` bercabang dari ujung branch `ilham` (`3836f94c`), yang berbasis `f5323118` (merge 'sopi' ke main).
- `validation/mv-spss` dibuat dari ujung `fix/rm-correctness` saat itu (`c8ed2984`).
- Satu-satunya commit `main` yang tidak ada di kedua branch adalah `4cb3507d` (guide GLM di help center). Isinya identik dengan `9bff42c6` yang ada di riwayat branch.
- **Implementasi Web Worker** ter-commit di `8e2ddbd2` dan masuk lewat `fix/rm-correctness`: `shared/glm-execution.ts`, `multivariate-analysis-worker.ts`, `repeated-measures-analysis-worker.ts`, dan `free()` di jalur main kedua service. Implementasi ini sebelumnya tidak ada di `main`.

**Disiapkan sebelum merge:**
- `61940c6b` (di `fix/rm-correctness`): commit fakta diagram RM.
- `90fc8984` (di `validation/mv-spss`): commit fakta diagram MV.

**Tidak ikut release:** perubahan lokal empat `.sps` RM (baris `OUTPUT EXPORT` dengan path absolut). Perubahan ini disimpan di `git stash` lalu dikembalikan ke working tree setelah release.

### Commit dari `fix/rm-correctness` (22)

```
9bff42c6 tambahin guide GLM Multivariate & Repeated Measures di help center
3836f94c Merge branch 'main' of https://git.stis.ac.id/222212887/statify64 into ilham
8e2ddbd2 chore(glm): baseline kondisi kerja sebelum perbaikan Repeated Measures   (implementasi Web Worker)
0374f71c test(glm-rm): tahap 0 - dataset acuan, sintaks SPSS, dan pembanding R
cc96f24c fix(glm-rm): tahap 1 - hasil deterministik dan uji per measure
041ca05e fix(glm-rm): tahap 2a - desain campuran (faktor between dan kovariat)
5de63fe8 fix(glm-rm): tahap 2b - jalur within-only memakai model GLM yang sama
f2b17f68 fix(glm-rm): tahap 3 - EMMeans tanpa panic, per measure seperti SPSS
fb5a087a fix(glm-rm): tahap 4 - homogeneity tests Box's M dan Levene seperti SPSS
5fc6dc2c fix(glm-rm): tahap 5 - Mauchly pada matriks galat singular, cek dampak eksperimen
a6985509 test(glm-rm): tahap 5 - eksperimen ulang sel Repeated Measures dan status perbaikan
f4a356bd fix(glm-rm): validasi terhadap keluaran SPSS 27 dan perbaikan selisihnya
73ac2ba2 fix(glm-rm): pilihan kontras None tetap tersedia sebagai bawaan dialog
b7321802 feat(glm-rm): kontras within bawaan Polynomial seperti SPSS
46a7a33f test(glm-rm): sintaks SPSS (d) kontras Repeated dan (e) dua faktor within
182b6f05 fix(glm-rm): validasi SPSS (d) kontras Repeated; blokir desain dua faktor within   (kode sel RM final)
02652a04 chore(glm-rm): jangan simpan __pycache__ harness
6ae4905e test(glm-web-worker): dataset RM eksperimen varian nonsingular (noise)
c8e4ed0b test(glm-web-worker): eksperimen ulang sel RM (kode terperbaiki, Polynomial, dataset noise, pin P-core)
79e039fd docs(glm): result_compare.md §11 perbaikan RM, validasi SPSS, dan sel RM final
c8ed2984 docs(glm-rm): thesis-impact.md, perubahan kode RM untuk naskah
61940c6b docs(glm-rm): fakta kode untuk class diagram dan sequence diagram
```

### Commit dari `validation/mv-spss` (23)

```
82a63b45 test(glm-mv): dataset dan sintaks SPSS acuan validasi GLM Multivariate   (baseline MV)
0386378b test(glm-mv): validasi SPSS lewat UI (worker, build produksi) dan uji acuan
c72167a6 docs(glm-mv): hasil validasi SPSS dan diagnosis selisih (belum diperbaiki)
466a296b test(glm-mv): pemeriksaan per langkah perbaikan (step0 baseline)
d0862fa7 fix(glm-mv): Observed Power dari distribusi F nonsentral seperti SPSS
58d18c65 fix(glm-mv): partial eta squared Hotelling's Trace (T/s)/(T/s+1)
23c73a5e fix(glm-mv): Box's M F seperti SPSS saat rho2 < rho1^2, Sig. dengan df2 pecahan
5c90a5c7 fix(glm-mv): baris Total = jumlah kuadrat y (terhadap mu0) dengan df = n
1519d1e2 fix(glm-mv): tampilan Corrected Model df = 0 dan catatan jenis SS
94165e9a fix(glm-mv): SS Type III dari desain berkode deviasi; Intercept dan Type II
bb606b40 test(glm-mv): dataset turunan mv6 (two-way tak seimbang) dan mv7 (nilai hilang) + sintaks SPSS
a0c2e531 test(glm-mv): keluaran SPSS mv6/mv7 dan baseline step8a sebelum perbaikan
e6874140 fix(glm-mv): listwise deletion kasus dengan nilai hilang seperti SPSS
d94a148f fix(glm-mv): H uji multivariat efek utama dan interaksi untuk desain tak seimbang
a9fb2414 fix(glm-mv): df2 Levene "Based on Median and with adjusted df" seperti SPSS
bdeeddec docs(glm-mv): laporan validasi SPSS setelah perbaikan step 1-8d
28b942db fix(glm-mv): fungsi pembantu step 8 dijadikan privat; alur run_analysis kembali seperti 82a63b45
ab21928c feat(glm-mv): Descriptive Statistics dua faktor (sel A x B dan marginal) seperti SPSS   (kode sel MV final)
37851d51 docs(glm-mv): thesis-impact.md dan laporan validasi setelah step 8e dan 9
6e4c5a89 test(glm-mv): sel Multivariate final eksperimen Web Worker (pin P-core) dan result_compare.md 12
1c7335d8 fix(glm-mv): Observed Power Welch dari distribusi F nonsentral
b33c10bd docs(glm-mv): Observed Power Welch (step 10) di thesis-impact.md dan laporan validasi
90fc8984 docs(glm-mv): fakta kode untuk sequence diagram Tahap 1 dan Tahap 2 Bagian 1
```

## 2. Hasil pemeriksaan di `release/skripsi-final`

Semua pemeriksaan dijalankan pada kode merge `29ca035a` (kode aplikasi tidak berubah sesudahnya).

| # | Pemeriksaan | Hasil | Bukti |
|---|---|---|---|
| a | Build WASM MV (`wasm-pack build --target web --out-dir pkg --out-name wasm`) | Berhasil. Glue JS dan `.d.ts` tidak berubah. `wasm_bg.wasm` hasil build **identik** dengan yang ter-commit (md5 `403447c4…`). API publik crate Rust = `82a63b45` (`rust_api.py`). | `testing/glm-mv-reference/results/fix-steps/release-skripsi-final/api-check.txt`, `wasm-build.log`, `rust-api.json` |
| a | Build WASM RM (perintah sama) | Berhasil. Glue JS dan `.d.ts` tidak berubah. `wasm_bg.wasm` hasil build **identik** dengan yang ter-commit (md5 `f4c34490…`). | `testing/release-skripsi-final/rm-wasm-build.log` |
| a | `next build` | Berhasil. `BUILD_ID` **`FOT4ctswQVT0EgK-b84KH`** (lihat §3). | `…/release-skripsi-final/next-build.log`, `testing/release-skripsi-final/BUILD_ID.txt` |
| b | Uji acuan SPSS RM (`repeated-measures-reference.test.ts`) | **1681 lulus, 0 gagal, 0 todo**: **1318** nilai SPSS 27 (semuanya berisi nilai; tidak ada slot kosong), **353** nilai R car/afex, dan 10 uji fungsional (5 "runs without errors", 4 jenis kontras, 1 blokir dua faktor within). | `testing/release-skripsi-final/rm-reference.json`, `rm-reference.log` |
| b | Uji acuan SPSS MV (`multivariate-reference.test.ts`) | **1686 lulus, 0 gagal**, 12 todo (nilai SPSS tanpa padanan: Descriptive Statistics GLM mv1). Perbandingan jalur UI: 1686/1686, 0 regresi terhadap step 10. | `…/release-skripsi-final/jest-reference.log`, `compare-spss.txt`, `regress.txt` |
| c | Jest penuh | **49 suite gagal dari 276 = baseline 49**. 0 suite gagal di luar baseline. | `…/release-skripsi-final/jest-summary.txt`, `jest-failed-suites.txt` (baseline: `testing/glm-web-worker/results/2026-09-22-implementation/jest-baseline-failed.txt`) |
| d | Main vs worker, MV (UI asli, build release) | mv1–mv7: **byte-identik** di ketujuh konfigurasi. | `…/release-skripsi-final/regress.txt`, `main/`, `worker/` |
| d | Main vs worker, RM (UI asli, build release; 4 run: main, worker, main, worker) | 9 desain **byte-identik** di 4 run: `gambar51`, `a`, `b`, `c`, `cEm`, `cPoly`, `cRep`, `exp5000n` (17 tabel, 0 pesan), `exp5000` (16 tabel, 2 pesan singular seperti sebelumnya). Hash tabel sama dengan validasi RM terakhir (`spss-validation-de`, `experiment-dataset`). | `testing/release-skripsi-final/rm-ui-main-worker.json`, `rm-ui-main-worker-exp5000.json` |
| e | Hasil eksperimen final tetap mewakili kode ini | Lihat uraian di bawah tabel: **8/8 sel byte-identik**. | `testing/release-skripsi-final/experiment-output-check.json` dan berkas lain di folder itu |

**Rincian pemeriksaan e.**
- **Payload:** payload worker ditangkap dari dialog asli build release, dengan konfigurasi sel eksperimen final lewat fungsi `run-experiment.cjs` yang sama. Selnya MV 100/500/1000/2000 dan RM 5000/10000/20000/40000 (dataset noise, 10 level, 3 opsi).
- **Pemutaran:** setiap sel diputar lewat WASM commit eksperimen (`ab21928c` untuk MV, `182b6f05` untuk RM) dan WASM release, di instance WASM baru per sel.
- **Hasil:** `get_formatted_results()` + `get_all_errors()` **byte-identik untuk 8/8 sel**, dan sama dengan respons worker UI build release.
- **Kondisi keluaran:** MV 4 tabel dan RM 17 tabel, 0 pesan, sama dengan eksperimen.
- **Kaitannya dengan `1c7335d8`:** commit itu mengubah WASM MV (md5 `d654d6e9` → `403447c4`), tetapi hanya jalur Welch yang tidak dipakai eksperimen, dan hasil ini membuktikannya.
- **WASM RM:** release sama persis dengan `182b6f05`. Kode modul RM dan `shared/` juga identik.

### Catatan dari pemeriksaan

1. **Urutan kunci di instance WASM MV yang dipakai ulang.** Bila satu instance WASM MV menjalankan beberapa analisis berturut-turut (misalnya worker yang dipakai ulang dalam satu sesi), urutan kunci objek hasil dan urutan konteks di teks Errors Logs bisa berbeda antar-run. Ini karena urutan iterasi `std::collections::HashMap` di crate MV.
   - Isi dan semua angkanya tetap identik: MV-500, 6 run berturut-turut, selisih numerik 0 (`mv-instance-reuse-check.txt`).
   - Perbandingan instance-bersama tetap memberi eksperimen = release untuk 8/8 sel (`experiment-output-check-shared-instance.json`).
   - Crate RM tidak terpengaruh, karena memakai `IndexMap`.
2. **Jumlah uji acuan RM.** `testing/glm-rm-reference/results/spss-validation-de/README.md` menyebut "1687 lulus". Uji, fixture, dan WASM RM di release identik dengan `182b6f05` (tempat angka itu ditulis), dan jumlah uji menurut fixture adalah 1318 + 353 + 10 = **1681**. Angka 1687 adalah salah hitung di dokumen lama; README itu tidak diubah. Jumlah nilai SPSS (1318/1318) tidak terpengaruh.

## 3. Build produksi

| Item | Nilai |
|---|---|
| `BUILD_ID` build yang diperiksa | `FOT4ctswQVT0EgK-b84KH` (di `frontend/.next/BUILD_ID`) |
| WASM MV di build | `.next/static/media/wasm_bg.2ee22d6a.wasm` (md5 `403447c485cd…` = `rust/pkg/wasm_bg.wasm`) |
| WASM RM di build | `.next/static/media/wasm_bg.2bc2b212.wasm` (md5 `f4c34490f7fe…` = `rust/pkg/wasm_bg.wasm`) |
| Next.js / Node | 15.5.9 / 20.19.0 |

`next.config.js` tidak mengatur `generateBuildId`, sehingga `BUILD_ID` acak di setiap `next build`. Build ulang dari kode yang sama akan punya `BUILD_ID` lain. Nama berkas WASM di `static/media/` adalah hash isi, jadi keduanya tetap `2ee22d6a` dan `2bc2b212` bila kodenya sama. Nama itu dapat dipakai untuk memastikan build sama isinya.

## 4. Folder bukti

| Isi | Lokasi |
|---|---|
| Validasi SPSS RM (per tahap, SPSS, R) | `testing/glm-rm-reference/results/` (`stage1`–`stage5`, `spss-validation`, `spss-validation-de`, `contrast-default`, `experiment-dataset`); keluaran SPSS `testing/glm-rm-reference/spss-output/`, R `testing/glm-rm-reference/r-output/` |
| Validasi SPSS MV (per langkah) | `testing/glm-mv-reference/results/spss-validation/README.md` (laporan), `testing/glm-mv-reference/results/fix-steps/step0-baseline` … `step10-welch-power`; keluaran SPSS `testing/glm-mv-reference/spss-output/` |
| Eksperimen Web Worker final, sel RM | `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-rm-noise-pcore/` |
| Eksperimen Web Worker final, sel MV | `testing/glm-web-worker/results/experiment-2026-09-23-cpu1-mv-pcore/` |
| Ringkasan eksperimen | `frontend/components/Modals/Analyze/general-linear-model/result_compare.md` (§11 sel RM final, §12 sel MV final; §12.8 menyatakan data final) |
| Perubahan kode untuk naskah | `testing/glm-rm-reference/results/thesis-impact.md`, `testing/glm-mv-reference/results/thesis-impact.md` |
| Fakta kode untuk diagram | `testing/glm-rm-reference/results/thesis-diagram-facts.md`, `testing/glm-mv-reference/results/thesis-diagram-facts.md` |
| Pemeriksaan release ini | `testing/release-skripsi-final/` (RM, pemeriksaan e, `BUILD_ID`), `testing/glm-mv-reference/results/fix-steps/release-skripsi-final/` (MV, `next build`, Jest penuh) |

## 5. Menjalankan build final secara lokal

Dari root repo, pada tag `skripsi-final-v1` (atau branch `release/skripsi-final`):

```
git checkout skripsi-final-v1        # atau: git checkout release/skripsi-final
cd frontend
npx next build                       # = npm run build
npx next start -p 3001               # = npm run start (port 3001); buka http://localhost:3001/dashboard/data
```

- **WASM tidak perlu di-build ulang:** `rust/pkg` kedua modul sudah ter-commit dan identik dengan hasil build (§2a).
- **Memakai build yang sudah diperiksa:** selama `frontend/.next/` belum ditimpa, `npx next start -p 3001` langsung menjalankan build yang diperiksa (`BUILD_ID` `FOT4ctswQVT0EgK-b84KH`) tanpa `next build`.
- **Mode eksekusi:** bawaan aplikasi adalah worker. Mode dapat diganti lewat `localStorage["glm-execution-mode"]` (`"worker"` atau `"main"`) di konsol browser.
