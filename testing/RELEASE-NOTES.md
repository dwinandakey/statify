# Release notes: build final skripsi (branch `ilham`, tag `skripsi-final-v4`)

Tanggal: 2026-09-24. Tidak di-merge ke `main` dan tidak di-deploy.

- **Versi berlaku:** **`skripsi-final-v4`**, yaitu commit terakhir `ilham` yang memuat pembaruan berkas ini (`git rev-parse skripsi-final-v4^{commit}`).
- **Tag lama:** `skripsi-final-v1` (`e365897d`), `skripsi-final-v2` (`d863de09`), dan `skripsi-final-v3` (`426429d8`) tetap ada.
- **Isi:** bagian v4 langsung di bawah, lalu v3 dan v2; §0–§5 adalah catatan v1. Semuanya tetap berlaku kecuali disebut lain.

## v4. Perubahan dan pemeriksaan skripsi-final-v3 → skripsi-final-v4

Dasar perubahan: dua fitur dari masukan dosen pengampu mata kuliah APG. Investigasi awal (Langkah 0), rumus, dan keputusan desain ada di `testing/fitur-v4/investigasi.md`. Dampak ke API dan diagram naskah ada di `testing/fitur-v4/thesis-impact-v4.md`.

1. **δ₀ untuk uji dua populasi.**
   - H₀: μ₁ − μ₂ = δ₀ untuk Pooled dan Unequal.
   - μ₁ adalah level pertama dan μ₂ level kedua Fixed Factor, sesuai urutan tabel Descriptive Statistics.
   - Bila δ₀ ≠ 0, δ₀ dikurangkan dari setiap pengamatan level pertama di TypeScript sebelum WASM.
   - Descriptive Statistics tetap pada data asli.
   - Catatan H₀ dan δ₀ ditambahkan pada Multivariate Tests dan tabel terpengaruh.
   - δ₀ berpasangan (H₀: μd = δ₀) sudah ada sejak v3; v4 menambah kalimat H₀ di catatan.
2. **Selang kepercayaan simultan T² dan Bonferroni.**
   - Diaktifkan lewat Options → "Simultaneous CI (T² & Bonferroni)", bawaan tidak dicentang; tingkat kepercayaan = 1 − Significance Level.
   - Rumus dari Johnson & Wichern ed. 6, dirujuk per subbab (`testing/fitur-v4/rujukan-jw.md`): satu populasi §5.4, berpasangan §6.2, dua populasi §6.3.
   - Unequal: T² Krishnamoorthy–Yu (ν sama dengan uji Welch) dan Bonferroni Welch t per variabel.
   - Dihitung oleh method WASM baru `get_simultaneous_ci()`, dan hanya dipanggil bila opsi dicentang.
3. **Sig. uji Welch dengan df pecahan** (sebelumnya df dibulatkan). Rinciannya di §v4.7.

### v4.1 Commit (di `ilham`, sesudah `426429d8`)

Path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/multivariate/`.

| Commit | Isi |
|---|---|
| `2c4e994b` | Fitur 1, δ₀ dua populasi: `dialogs/two-sample-delta.tsx` (baru), `services/two-sample-delta.ts` (baru), `dialogs/dialog.tsx`, `dialogs/multivariate-main.tsx`, `services/multivariate-analysis.ts`, `services/multivariate-analysis-formatter.ts`, `types/multivariate.ts` |
| `8751e76c` | Fitur 2, CI simultan: `dialogs/options.tsx`, service, worker, formatter, output, types, `rust/src/models/result.rs`, `rust/src/wasm/constructor.rs`, `rust/pkg/*` (glue bertambah satu method) |
| `22a8be47` | Perbaikan: catatan δ₀ disambung sebagai kalimat baru ("Type III sum of squares. H₀: …"; sebelumnya menempel tanpa titik). Ditemukan saat memeriksa tangkapan layar `step17-v4`. |
| `5da17f3a` | Tes dan dokumen: `testing/fitur-v4/` (investigasi, dampak, data geser, sintaks SPSS, skrip R, harness, bukti), `check-step.sh` (`RUST_API_ALLOWED`), `ui-run.cjs` (13 konfigurasi baru), skenario black-box v4 (belum dieksekusi), `pemetaan-kebutuhan.md` §Perubahan v4, hasil `step17-v4` dan `step18-v4`. Tag `skripsi-final-v4` pertama kali dipasang di sini (belum di-push), lalu dipindah. |
| `91cc8e34` | Revisi sebelum push: CI Unequal T² Krishnamoorthy–Yu dan Bonferroni Welch t; Sig. Welch dengan df pecahan; rujukan J&W hanya per subbab (`rust/src/wasm/constructor.rs`, `rust/src/stats/multivariate_tests.rs`, `rust/src/models/result.rs`, `rust/pkg/wasm_bg.wasm`, `services/multivariate-analysis-formatter.ts`) |
| commit berikutnya | Tes dan dokumen revisi: `rujukan-jw.md`, `r/welch_sig.R`, `r/ci_simultan.R` (Unequal baru), `r/sleeping_dog.R`, data dan tangkapan sleeping dog, `harness/sleeping-dog.cjs`, `v4-check.mjs` bagian E, skenario v4 (revisi R3–R5), usulan redaksi Tabel 5, hasil `step19-v4`, bagian v4 berkas ini. **Tag `skripsi-final-v4`.** |

Tidak ada merge dan tidak ada push di v4 sampai disetujui.

### v4.2 Perubahan API publik Rust (crate MV)

Tiga perubahan, sama persis dengan `testing/fitur-v4/rust-api-allowed.json` (diperiksa `check-step.sh` lewat `RUST_API_ALLOWED`):

1. method `MultivariateAnalysis::get_simultaneous_ci(&mut self) -> Result<JsValue, JsValue>`;
2. struct `SimultaneousConfidenceIntervals`;
3. struct `SimultaneousInterval`.

**Tetap sama:** `MultivariateResult`, `OptionsConfig`, fungsi bebas, dan crate RM.

**Mengapa method terpisah, bukan field baru `MultivariateResult`.** Field baru mengubah urutan kunci HashMap di wasm32 dan nilai floating-point respons worker jalur lama, bahkan sebagai `Option<Box<…>>` yang selalu `None`. Rinciannya ada di `thesis-impact-v4.md` §1.

### v4.3 Hasil pemeriksaan (kode `91cc8e34`; commit sesudahnya hanya tes dan dokumen)

Hasil `step18-v4` (kode `22a8be47`, sebelum revisi) tetap tersimpan sebagai pembanding "sebelum" di §v4.7.

| Pemeriksaan | Hasil | Bukti (`testing/glm-mv-reference/results/fix-steps/step19-v4/`) |
|---|---|---|
| WASM dan API | wasm-pack MV md5 `398a7b46…` (sama dengan `rust/pkg` yang di-commit); glue tidak berubah terhadap commit; 3 perubahan API publik sesuai daftar yang diperbarui (field Bonferroni per baris) | `api-check.txt`, `rust-api.txt` |
| Uji acuan SPSS MV | 2339 lulus (12 todo); regresi 0 terhadap v3 | `compare-spss.txt`, `regress.txt`, `jest-reference.log` |
| Jalur lama = v3 | mv1–mv8, mv4ph: tabel (main dan worker), payload worker, dan respons worker byte-identik dengan v3 | `v4-check.txt` bagian A |
| δ₀ = data geser | mv2d = mv2s dan mv2wd = mv2ws: payload dan respons worker identik; Descriptive Statistics = data asli; mv3d vs mv3s selisih maks 2.04e-17 | `v4-check.txt` bagian B |
| CI vs R | 216 nilai vs R dasar (`testing/fitur-v4/r/ci_simultan.R`), selisih maks 1.31e-12. Unequal: 36 nilai (termasuk df Welch per variabel) vs R (ν dihitung ulang; Bonferroni dari `t.test(var.equal = FALSE, conf.level = 1 − α/p)`), selisih maks 5.77e-14. Batas T² vs MVTests 2.3.1 < 1e-8 (Unequal tidak ada padanan). | `v4-check.txt` bagian C |
| Uji Welch vs R | T², F, df2 = ν − p + 1, dan Sig. (df pecahan, `pf`) vs `r/welch_sig.R`: selisih absolut maks 2.13e-14. ν di tabel CI = ν uji (identik). | `v4-check.txt` bagian E |
| Main = worker | 22 konfigurasi MV byte-identik (9 lama + 13 baru) | `regress.txt`, `v4-check.txt` bagian D |
| Contoh sleeping dog (J&W §6.2) | Nilai tampil sama dengan nilai yang diharapkan dan dengan `r/sleeping_dog.R` (§v4.7) | `testing/fitur-v4/bukti/sleeping-dog/` |
| Main = worker, RM | 9 desain × 4 run byte-identik; hash tabel sama dengan v3 | `rm/rm-ui-main-worker*.json`, `rm/rm-hash-v3-v4.txt` |
| Sel eksperimen Web Worker final | 8/8 sel: payload dan respons worker lewat dialog asli build v4 identik dengan v1, v2, dan v3 | `experiment-output-check.txt` |
| Uji acuan RM | **1681 lulus, 0 todo** (sama dengan v3) | `rm/rm-reference.log` |
| Jest penuh | 49 suite gagal dari 276 = baseline 49; tidak ada kegagalan baru | `jest-summary.txt` |

**Catatan eksekusi.**
- **`step17-v4` (kode `8751e76c`):** UI run pertama terhenti dua kali di impor CSV. Mode worker berhenti di `mv2wci` karena `#csv-file-input-content` tidak muncul; mode main berhenti di `mv1` karena menu "not stable". Keduanya kendala alat uji, dan analisis belum dijalankan. Log disimpan sebagai `ui-*-percobaan1.log`, dan UI run ulang lulus.
- **`step18-v4`:** dijalankan penuh pada kode `22a8be47` tanpa kendala.
- **`step19-v4`:** dijalankan penuh pada kode revisi `91cc8e34` tanpa kendala.
- **Kriteria bagian E.** Semula Sig. mv2wci juga diuji dengan selisih relatif < 1e-6. Nilainya 1.83e-6: Sig. Statify 2.549860e-11 vs R 2.549865e-11, dengan selisih absolut 4.7e-17. Sumbernya presisi fungsi beta statrs di ekor ekstrem; Sig. lama dengan df dibulatkan juga berbeda 6.9e-7 relatif dari R. Kriteria bagian E disamakan dengan pemeriksaan lain (|selisih| < 1e-8), dan selisih relatif tetap dilaporkan.
- **`step16-v4`:** hasil rancangan pertama (field di `MultivariateResult`), yang respons worker jalur lamanya tidak identik dengan v3. Rancangan ini ditinggalkan, dan hasilnya tidak di-commit. Temuan yang sama dapat diulang dengan `testing/fitur-v4/harness/replay-v3.mjs`.
- **Kesalahan argumen alat uji sebelum `step18`:**
  - Tangkapan sel eksperimen RM tanpa `--rm-levels=10` memakai 5 level bawaan, sehingga payload berbeda. Setelah ditangkap ulang dengan argumen v3, hasilnya identik.
  - Desain `exp5000*` perlu `--expDir`.
  - Keduanya dijalankan dengan argumen yang benar di `step18`.

### v4.4 Build produksi v4

| Item | Nilai |
|---|---|
| `BUILD_ID` | `1IBznO-olYCW5GfFOKskp` |
| WASM MV di build | `.next/static/media/wasm_bg.aeff7f82.wasm` (baru; v3: `wasm_bg.4c7b0023.wasm`) |
| WASM RM di build | `.next/static/media/wasm_bg.2bc2b212.wasm` (sama dengan v2/v3) |

### v4.5 Validasi yang menunggu penulis

1. **SPSS untuk δ₀.**
   - Sintaks: `testing/fitur-v4/spss/mv2_delta0.sps` (Pooled: geser jk = 1 sebesar δ₀, lalu GLM) dan `mv3_delta0.sps` (berpasangan: d − δ₀, GLM intercept-only).
   - Keluaran disimpan di `testing/fitur-v4/spss-output/`.
   - Unequal (Welch) tidak punya padanan di SPSS GLM.
   - Sebelum ada keluaran SPSS, bukti kesetaraan adalah bagian B: Statify dengan δ₀ identik dengan Statify δ₀ = 0 pada data geser.
2. **Rujukan J&W.** Nomor Result/persamaan dan halaman diisi penulis di `testing/fitur-v4/rujukan-jw.md` (12 rumus). Sampai terverifikasi, kode, catatan tabel, dan dokumen hanya menyebut §5.4, §6.2, dan §6.3.
3. **Usulan redaksi Tabel 5 (KF2–KF4)** ada di `testing/black-box/pemetaan-kebutuhan.md` §Perubahan v4 dan menunggu konfirmasi pembimbing.
4. **Skenario black-box v4** (17 skenario) belum dieksekusi. Hasil yang diharapkan sudah direvisi (R3–R5 di "Revisi skenario").
5. **Observed Power uji Welch** masih memakai df dibulatkan (`calculate_observed_power` menerima `usize`), dan tidak diubah di v4.

### v4.7 Revisi sebelum push: Welch dan contoh sleeping dog

**Sig. uji Welch, sebelum (df dibulatkan, `step18-v4`) dan sesudah (df pecahan, `step19-v4`).**
- df₁ = 4, df₂ = ν − p + 1 = 55.268 (ν = 58.268).
- Kolom Error df tetap menampilkan 55.268.
- Observed Power tidak berubah.

| Konfigurasi | Data | Sig. sebelum (df 4, 55) | Sig. sesudah (df 4, 55.268) | Tampil sebelum → sesudah |
|---|---|---|---|---|
| mv2wci, BB-KF03-02, BB-KF03-11 | asli | 2.668632e-11 | 2.549860e-11 | <.001 → <.001 |
| mv2wd = mv2ws, BB-KF03-05 | geser δ₀ = (3, 2, 10, 1) | 0.8138157 | 0.8138206 | 0.8138 → 0.8138 |

Hasil yang diharapkan di skenario BB-KF03-* tidak menyebut angka Sig. atau df Welch, jadi tidak perlu direvisi karena perubahan ini. Hasil pemeriksaan ada di Revisi skenario R5. BB-KF03-11 direvisi karena metode CI Unequal berubah (R3).

**Contoh sleeping dog (J&W §6.2), build `step19-v4`, lewat UI.**
- Data: `testing/fitur-v4/data/sleeping-dog.csv` (19 anjing, y1–y4) dan `sleeping-dog-kontras.csv` (d1 halotan, d2 CO2, d3 interaksi).

| Analisis | Nilai yang diharapkan | Nilai tampil di Statify | R dasar (`r/sleeping_dog.R`) |
|---|---|---|---|
| RM, faktor within perlakuan (4 level), measure "anjing" | Hotelling's Trace 6.4454; F(3, 16) = 34.375; Sig. < .001 | Hotelling's Trace 6.445; F 34.375; df 3.000 dan 16.000; Sig. <.001 (tampilan RM 3 desimal) | 6.445351; 34.375206; Sig. 3.32e-07 |
| MV satu populasi, DV d1–d3, μ₀ = 0 | T² = 116.02; Hotelling's Trace 6.4454 | T² 116.0163; Hotelling's Trace 6.4454; F 34.3752; df 3, 16; Sig. <.001 | T² 116.016321 |
| CI T² 95% | d1 209.32 ± 73.67; d2 −60.05 ± 54.67; d3 −12.79 ± 65.94 | d1 209.3158 [135.6503, 282.9813]; d2 −60.0526 [−114.7271, −5.3782]; d3 −12.7895 [−78.7286, 53.1496] (setengah lebar mentah 73.6655, 54.6745, 65.9391) | setengah lebar 73.665492, 54.674451, 65.939111 |

Semua nilai tampil sama dengan nilai yang diharapkan. Tidak ada kode yang diubah untuk contoh ini.

### v4.6 Menjalankan build v4 secara lokal

```
git checkout skripsi-final-v4        # atau: git checkout ilham
cd frontend
npx next build
npx next start -p 3001               # http://localhost:3001/dashboard/data
```

---

## v3. Perubahan dan pemeriksaan skripsi-final-v2 → skripsi-final-v3

Dasar perubahan: iterasi 1 pengujian black-box terhadap v2 (commit `4bb3124b`): 45 Sesuai dan 5 Tidak Sesuai. Kelima skenario Tidak Sesuai diperbaiki di frontend. Crate Rust MV dan RM tidak berubah.

### v3.1 Commit (di `ilham`, sesudah `4bb3124b`)

Path relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/`.

| Commit | Isi |
|---|---|
| `2ac13488` | Hasil iterasi 1 dipindah ke `testing/black-box/{bukti,hasil-eksekusi}/iterasi-1/` tanpa perubahan isi; harness menerima `--iter` |
| `3494ea5c` | BB-KF03-02: pilihan varians (Pooled/Unequal) tidak lagi ter-reset saat dialog utama MV dipasang ulang setelah subdialog ditutup. Reset hanya saat pengguna mengubah Fixed Factor(s) (`multivariate/dialogs/dialog.tsx`) |
| `fa286c6c` | BB-KF04-02: Paired melaporkan pasangan belum lengkap sebelum "Tambahkan minimal satu pasangan variabel." (`multivariate/dialogs/paired.tsx`) |
| `b24c22ea` | BB-KF10-02: catatan tabel Levene MV diakhiri "Design: …" dari field `design` Rust, ditambah suku interaksi pada faktorial penuh seperti SPSS (`multivariate/services/multivariate-analysis-formatter.ts`) |
| `5017948c` | BB-KF07-02: slot within RM tetap bila Define diklik tanpa perubahan definisi (`repeated-measures/dialogs/repeated-measures-main.tsx`) |
| `37e0e15b` | BB-KF08-02: Number of Levels kosong atau bukan angka menampilkan "Number of levels must be a valid number." (`repeated-measures/dialogs/define/repeated-measures-dialog.tsx`) |
| `851321f9` | Pemeriksaan regresi v3 (`testing/glm-mv-reference/results/fix-steps/step15-v3/`) |
| `4ea1e16f` | Iterasi 2 black-box, dokumen skenario, pemetaan kebutuhan, bagian v3 berkas ini |
| commit berikutnya | Catatan integritas eksekusi iterasi 2 (`testing/black-box/integritas-iterasi-2.txt`, `harness/bb-integritas.mjs`), keterangan BB-KF08-02, catatan keterbatasan §v3.6, bahan Bab V (`testing/black-box/ringkasan-bab5.md`). **Tag `skripsi-final-v3`** (sebelumnya di `4ea1e16f`, dipindah sebelum push; kode frontend sama). |

Tidak ada merge dan tidak ada push di v3 sampai disetujui.

### v3.2 Hasil pemeriksaan (kode `37e0e15b`; commit sesudahnya hanya dokumen dan hasil uji)

| Pemeriksaan | Hasil | Bukti (`…/step15-v3/`) |
|---|---|---|
| Jest penuh | 49 suite gagal dari 276 = baseline 49; tidak ada kegagalan baru | `jest-summary.txt` |
| Main = worker, MV | mv1–mv8 dan mv4ph byte-identik | `regress.txt` |
| Main = worker, RM | 9 desain × 4 run byte-identik; hash tabel sama dengan v2 | `rm/rm-ui-main-worker*.json`, `rm/rm-hash-v2-v3.txt` |
| Sel eksperimen Web Worker final | 8/8 sel: payload dan respons worker lewat dialog asli build v3 identik dengan v1 dan v2. Hasil `result_compare.md` §11–§12 tetap berlaku | `experiment-output-check.txt` |
| WASM | Build v3 memuat `wasm_bg.4c7b0023.wasm` (MV) dan `wasm_bg.2bc2b212.wasm` (RM), sama dengan v2; wasm-pack MV md5 `81ee712d0eba…`; API publik Rust sama dengan `82a63b45` | `api-check.txt` |
| Uji acuan SPSS | MV 2339 lulus (12 todo), regresi 0; RM 1681 lulus | `compare-spss.txt`, `jest-reference.log`, `rm/rm-reference.log` |
| Perubahan keluaran | Hanya catatan tabel Levene MV (kini diakhiri "Design: …"). Baris dan nilai Levene serta tabel lain identik dengan v2 | `ringkasan.txt` |

### v3.3 Build produksi v3

| Item | Nilai |
|---|---|
| `BUILD_ID` | `LHuNzRz16C8sj4tUeFT-j` |
| WASM MV di build | `.next/static/media/wasm_bg.4c7b0023.wasm` (sama dengan v2) |
| WASM RM di build | `.next/static/media/wasm_bg.2bc2b212.wasm` (sama dengan v2) |

### v3.4 Pengujian black-box iterasi 2

- **Cakupan:** ke-50 skenario dijalankan ulang terhadap build v3 dengan harness dan aturan yang sama seperti iterasi 1 (`testing/black-box/harness/bb-run.cjs --iter=2`).
- **Hasil:** 50 Sesuai, 0 Tidak Sesuai, 0 kendala alat uji.
- **Nilai tampil vs SPSS 27:** 1536/1536 cocok (MV 1063, RM 473).
- **Rincian:** `testing/black-box/skenario-black-box.md` (ringkasan kedua iterasi, revisi skenario R1–R2).

### v3.6 Catatan keterbatasan

1. **Catatan Design pada Levene MV (faktorial penuh).** Field `design` dari Rust hanya memuat efek utama. Karena itu, pada model faktorial penuh catatan Design di tabel Levene disusun di frontend dengan menambahkan suku interaksi dari efek Multivariate Tests. Bila Multivariate Tests gagal dihitung (misalnya matriks galat singular), suku interaksi tidak ikut tercantum.
2. **Number of Levels (Define RM).** Input bertipe number tidak dapat membedakan "bukan angka" dari "kosong": browser tidak memasukkan huruf, sehingga isian bukan angka terbaca kosong. Keduanya menampilkan "Number of levels must be a valid number."; angka di luar 2–99 menampilkan "Number of levels must be between 2 and 99."

### v3.5 Menjalankan build v3 secara lokal

```
git checkout skripsi-final-v3        # atau: git checkout ilham
cd frontend
npx next build
npx next start -p 3001               # http://localhost:3001/dashboard/data
```

---


## v2. Perubahan dan pemeriksaan skripsi-final-v1 → skripsi-final-v2

Dasar perubahan: keputusan atas `testing/black-box/pemetaan-kebutuhan.md` (Tabel 5 direvisi).

### v2.1 Commit (di `ilham`, sesudah `e365897d`)

| Commit | Isi |
|---|---|
| `db546515` | Dokumen pemetaan kebutuhan Tabel 5 ke kode |
| `59fe397e` | KF6: Two-Way MANOVA tanpa interaksi. Rust MV membaca dialog Model (Full Factorial, Build Terms, Build Custom Terms); `normalize_model_spec` di awal `run_analysis`; suku interaksi hanya pada faktorial penuh; sintaks SPSS mv8 |
| `53f1a978` | KF11: Post hoc MV hanya LSD/Bonferroni/Sidak (satu baris per metode, CI Sidak seperti SPSS, label Scheffe dihapus); Post Hoc RM dinonaktifkan; sintaks SPSS mv4-posthoc; harness mv8/mv4ph |
| `d4dfd820` | Opsi yang tidak berfungsi dinonaktifkan (Plots MV/RM; Options RM: spread-vs-level, residual plot, lack of fit); toast galat Define/OK/analisis RM |
| `d1b3ab15` | Pemeriksaan lengkap sebelum SPSS; `regress.mjs` membaca mv4ph |
| `d78df40b` | Keluaran SPSS mv8 dan mv4-posthoc; Levene model efek utama seperti SPSS (ANOVA atas sel dari \|residual model\|) |
| commit berikutnya | Dokumen: laporan validasi MV, `thesis-impact.md` MV §e, `thesis-diagram-facts.md` MV (bagian v2), berkas ini. **Tag `skripsi-final-v2`.** |

Tidak ada merge dan tidak ada push di v2 sampai disetujui. Crate Rust RM tidak berubah (WASM RM identik dengan v1).

### v2.2 Hasil pemeriksaan (kode `d78df40b`; commit sesudahnya hanya dokumen)

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| API publik Rust (MV) | Sama dengan `82a63b45`: 0 perubahan publik; 79 fungsi pub (34 di `common.rs`), 40 struct `result.rs`, 7 method `MultivariateAnalysis`. Fungsi privat baru di v2: `normalize_model_spec`, `model_residual_levene` | `testing/glm-mv-reference/results/fix-steps/step14-spss-v2/api-check.txt`, `rust-api.json` |
| Uji acuan SPSS MV | **2339 lulus, 0 gagal, 12 todo**, dari 2351 nilai (v1: 1686/1698). Baru: mv8 283 nilai, mv4ph 370 nilai (termasuk Multiple Comparisons 180) | `…/step14-spss-v2/compare-spss.txt`, `jest-reference.log` |
| Regresi | 0 (semua nilai yang lulus di v1 tetap lulus) | `…/step14-spss-v2/regress.txt` |
| Uji acuan RM | **1681 lulus, 0 todo** (1318 SPSS + 353 R + 10 fungsional) | `…/step14-spss-v2/rm/rm-reference.log` |
| Jest penuh | 49 suite gagal = baseline 49 | `…/step14-spss-v2/jest-summary.txt` |
| Main = worker, MV | Byte-identik untuk mv1–mv8 dan mv4ph | `…/step14-spss-v2/regress.txt` |
| Main = worker, RM | 9 desain byte-identik di 4 run; hash tabel sama dengan v1 | `…/step14-spss-v2/rm/rm-ui-main-worker*.json` |
| Sel eksperimen Web Worker final | 8/8 sel (MV 100–2000, RM 5000–40000): payload dan respons worker lewat dialog asli build v2 **identik** dengan build v1; replay WASM identik dengan `e365897d`. Hasil eksperimen `result_compare.md` §11–§12 tetap berlaku. | `…/step14-spss-v2/experiment-output-check.txt` |
| Jalur Full Factorial | Keluaran WASM mv1–mv7 dan sel eksperimen MV byte-identik dengan v1 | `…/step11-main-effects/full-factorial-byte-check.txt` |
| UI | Tombol/opsi nonaktif dan toast baru tampil sesuai rancangan | `…/step13-ui-options/ui-smoke.txt` |

### v2.3 Build produksi v2

| Item | Nilai |
|---|---|
| `BUILD_ID` (build pemeriksaan step 14) | `da2MPL8uMDzMEA8FyYFr9` |
| WASM MV di build | `.next/static/media/wasm_bg.4c7b0023.wasm` (md5 `81ee712d0eba…` = `rust/pkg/wasm_bg.wasm`; **baru** di v2) |
| WASM RM di build | `.next/static/media/wasm_bg.2bc2b212.wasm` (md5 `f4c34490f7fe…`; sama dengan v1) |

`BUILD_ID` acak di setiap `next build`. Build dengan isi yang sama dikenali dari kedua nama berkas WASM di atas.

### v2.4 Catatan

1. **Toast tampil dua kali di seluruh aplikasi**, karena ada dua `<Toaster>` (`frontend/app/layout.tsx` dan `frontend/app/dashboard/layout.tsx`). Ini bawaan dan di luar modul GLM, sehingga tidak diubah.
2. **Pilihan Type di Build Terms:** Build Terms memakai faktor yang di-drag ke Model; pilihan Type di dialog tidak dipakai. Model efek utama didapat dengan men-drag setiap faktor.
3. **Urutan baris Multiple Comparisons:** Statify menyimpan pasangan I < J dan mengurutkan per pasangan lalu per metode. SPSS menampilkan (I, J) dan (J, I) per metode. Nilainya sama.
4. **Keterbatasan (redaksi Tabel 5 lama):**
   - uji normalitas multivariat tidak ada;
   - Mauchly RM selalu dihitung (tidak opsional);
   - post hoc hanya LSD, Bonferroni, dan Sidak di MV, sedangkan RM memakai EM Means > Compare main effects;
   - grafik hanya residual plot MV (Scatter Plot Matrix);
   - analisis profil lewat desain RM dengan faktor between, tanpa grafik profil.

   Rinciannya ada di `testing/black-box/pemetaan-kebutuhan.md`.

### v2.5 Menjalankan build v2 secara lokal

```
git checkout skripsi-final-v2        # atau: git checkout ilham
cd frontend
npx next build
npx next start -p 3001               # http://localhost:3001/dashboard/data
```

Selama `frontend/.next/` belum ditimpa, `npx next start -p 3001` langsung menjalankan build pemeriksaan v2.

---

# Catatan skripsi-final-v1 (tetap berlaku kecuali disebut di v2)

## 0. Branch rilis: `ilham`

**Branch rilis adalah `ilham`** (branch kerja penulis), bukan `release/skripsi-final`.

| Commit di `ilham` | Isi |
|---|---|
| `3836f94c` | Basis: ujung `ilham` sebelum rilis (= induk `fix/rm-correctness`) |
| `55a83973` | `Merge branch 'fix/rm-correctness' into ilham` (`--no-ff`, tanpa konflik) |
| `d86bf88f` | `Merge branch 'validation/mv-spss' into ilham` (`--no-ff`, tanpa konflik) |
| `ac5ea4fe` | Cherry-pick `5b6c7e93`: bukti pemeriksaan release dan berkas ini (hanya `testing/`) |
| commit berikutnya | Berkas ini diperbarui untuk `ilham` dan ralat §11.2 `result_compare.md`. **Tag `skripsi-final-v1` dipasang pada commit ini**, yaitu commit terakhir `ilham` saat rilis (`git rev-parse skripsi-final-v1^{commit}`). |

**Bukti isi sama dengan release yang diperiksa (§2):**
- `git diff release/skripsi-final ilham` setelah kedua merge (sebelum cherry-pick): **0 berkas berbeda di `frontend/`**, dengan tree `frontend/` identik (`ee7a7c04…`) di kedua branch. 0 berkas berbeda di luar `testing/`.
  - Berkas guide dari commit `main` `4cb3507d` juga tidak berbeda, karena isinya identik dengan `9bff42c6` yang ada di riwayat `ilham`. Jadi `ilham` tidak memuat `4cb3507d` sebagai commit, tetapi memuat isinya.
  - Satu-satunya selisih adalah 60 berkas `testing/` dari commit bukti `5b6c7e93` (`RELEASE-NOTES.md`, `testing/release-skripsi-final/`, `testing/glm-mv-reference/results/fix-steps/release-skripsi-final/`) yang belum ada di `ilham`.
- Setelah cherry-pick `ac5ea4fe`: `git diff release/skripsi-final ilham` **kosong**, dan tree seluruh repo identik (`a721d6c8…`).
- **Build ulang di `ilham`:**
  - WASM MV (md5 `403447c4…`) dan RM (md5 `f4c34490…`) identik dengan yang ter-commit dan dengan release. Glue hanya berbeda akhir baris dan dikembalikan ke versi ter-commit sebelum `next build`.
  - `next build` memberi `BUILD_ID` `ype9BtloOSwA9xB6vEncj`, dengan berkas WASM **`static/media/wasm_bg.2ee22d6a.wasm`** (MV) dan **`wasm_bg.2bc2b212.wasm`** (RM), sama dengan build release yang diperiksa.
- **Kesimpulan:** karena kode identik dan berkas WASM di build identik, hasil pemeriksaan §2 berlaku untuk `ilham`.

**Status branch lain:**
- `release/skripsi-final` dihapus setelah rilis (belum pernah di-push). Isinya sama dengan `ilham` sebelum commit pembaruan berkas ini.
- `fix/rm-correctness` dan `validation/mv-spss` dipertahankan dan di-push sebagai cadangan riwayat per langkah.
- `origin/main` sudah bergerak jauh melewati `4cb3507d` (commit anggota tim lain). Rilis ini sengaja tidak memuat commit-commit itu.

## 1. Asal perubahan dan commit yang digabung

Pemeriksaan §2 semula dijalankan di `release/skripsi-final`, yang dibuat dari **`main` `4cb3507d`** dengan dua merge `--no-ff` yang sama. Isi akhirnya identik dengan `ilham` (§0). Uraian di bawah memakai hash merge di branch itu. Commit yang digabung sama dengan yang digabung ke `ilham`.

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

## 2. Hasil pemeriksaan di `release/skripsi-final` (berlaku untuk `ilham`, §0)

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
2. **Jumlah uji acuan RM.** `testing/glm-rm-reference/results/spss-validation-de/README.md` dan §11.2 `result_compare.md` menyebut "1687 lulus". Uji, fixture, dan WASM RM di release identik dengan `182b6f05` (tempat angka itu ditulis), dan jumlah uji menurut fixture adalah 1318 + 353 + 10 = **1681**. Angka 1687 adalah salah hitung di dokumen lama. README itu tidak diubah, dan ralatnya ditambahkan di awal §11.2 `result_compare.md`. Jumlah nilai SPSS (1318/1318) tidak terpengaruh.

## 3. Build produksi

| Item | Nilai |
|---|---|
| `BUILD_ID` build yang diperiksa (`release/skripsi-final`) | `FOT4ctswQVT0EgK-b84KH` |
| `BUILD_ID` build final dari `ilham` (§0) | `ype9BtloOSwA9xB6vEncj` (di `frontend/.next/BUILD_ID` saat rilis) |
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

Dari root repo, pada tag `skripsi-final-v1` (atau branch `ilham`):

```
git checkout skripsi-final-v1        # atau: git checkout ilham
cd frontend
npx next build                       # = npm run build
npx next start -p 3001               # = npm run start (port 3001); buka http://localhost:3001/dashboard/data
```

- **WASM tidak perlu di-build ulang:** `rust/pkg` kedua modul sudah ter-commit dan identik dengan hasil build (§2a).
- **Memakai build final `ilham`:** selama `frontend/.next/` belum ditimpa, `npx next start -p 3001` langsung menjalankan build final dari `ilham` (`BUILD_ID` `ype9BtloOSwA9xB6vEncj`) tanpa `next build`.
- **Mode eksekusi:** bawaan aplikasi adalah worker. Mode dapat diganti lewat `localStorage["glm-execution-mode"]` (`"worker"` atau `"main"`) di konsol browser.
