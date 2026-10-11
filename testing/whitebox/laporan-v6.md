# Laporan rilis skripsi-final-v6: perbaikan epsilon Mauchly (T1, T2)

- **Tanggal:** 30 September 2026
- **Build final (tag `skripsi-final-v6`):** branch `ilham`, yaitu v5 + dua commit teks tampilan (`a345ded6`, `ff9e9a03`) + perbaikan v6. `BUILD_ID` **`EXcw4k8lfhzpWjMN3Mjc7`**; hasil jalankan ulang di §7. Branch `ilham` belum di-push dan tidak di-merge ke `main`.
- **Commit di `ilham`** (cherry-pick, urutan):
  - `8d4e7179`: test white-box (dari `whitebox-testing`, `75f8df25`);
  - `14f6b116`: perbaikan T1 dan T2 (dari `04ab154c`);
  - `06928c80`: evaluasi v6 dan laporan (dari `e38a6c1d`);
  - `7b383f0c`: hasil black-box v6 dipindah ke `iterasi-7-uji-awal-v6`;
  - commit berikutnya: jalankan ulang pada build final (§7) dan laporan ini; tag `skripsi-final-v6` dipindah ke commit ini.
- **Uji awal v6** (§1–§5): branch `fix-epsilon-v6`, dibuat dari tag `skripsi-final-v5` (`8940ec0f`), commit `8831627e`, `04ab154c`, `e38a6c1d`; build `0aGhUdQPbhuxcAe295aG-` (`next build`, Next.js 15.5.9, server `next start -p 3101`). Tag `skripsi-final-v6` semula dipasang di `e38a6c1d` (tag belum pernah di-push).
- **Dasar perbaikan:** temuan T1 dan T2 white-box testing (`ringkasan-white-box.md` §8), dikonfirmasi oleh keluaran SPSS 27 dari penulis: `spss-tertunda/wb_rm_konfirmasi.xlsx` (dan `.spv`, dari `wb_rm_konfirmasi.sps`). Ada 78 nilai, diekstrak dengan presisi penuh oleh `spss-tertunda/ekstrak_konfirmasi.R` ke `wb_rm_konfirmasi-values.json`.

## 1. Perubahan kode

Hanya satu fungsi yang diubah: `RmModel::mauchly` di `frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/src/stats/rm_model.rs`, 11 baris ditambah dan 5 dihapus. Crate GLM Multivariate, modul lama RM (`mauchly_test.rs`, `within_subjects_effects.rs`, dan lainnya), frontend TypeScript, dan harness tidak diubah. Satu-satunya pengecualian di harness adalah `regress-final.sh`, yang folder tangkapan eksperimennya kini bisa diatur lewat `EXPDIR` (§4.4).

```diff
             let sum: f64 = eig.iter().sum();
             let sum_sq: f64 = eig.iter().map(|e| e * e).sum();
-            let gg = if sum_sq < 1e-12 { 1.0 } else { (sum * sum) / (p_f * sum_sq) };
-            // Huynh-Feldt: (n·p·ε − 2) / (p·(n − r − p·ε)), at most 1.
-            let hf = if self.n <= self.k {
-                gg.min(1.0)
+            // S is taken as zero (epsilons 1) only relative to the error
+            // covariance of the untransformed cells of the measure: with C
+            // orthonormal, tr S ≤ tr S_y, and both scale with c² when the data
+            // are multiplied by c, so the epsilons do not depend on the scale.
+            let scale = self.error(&m.y).trace() / v;
+            let (gg, hf) = if !(sum > 1e-12 * scale) {
+                (1.0, 1.0)
             } else {
+                let gg = (sum * sum) / (p_f * sum_sq);
+                // Huynh-Feldt as SPSS: min(1, (n·p·ε − 2) / (p·(n − r − p·ε))).
                 let den = p_f * (v - p_f * gg);
-                if den.abs() < 1e-12 { gg.min(1.0) } else { ((n * p_f * gg - 2.0) / den).min(1.0).max(gg) }
+                let hf = if den.abs() < 1e-12 { gg.min(1.0) } else { ((n * p_f * gg - 2.0) / den).min(1.0) };
+                (gg, hf)
             };
```

| Temuan | Sebelum (v5) | Sesudah (v6) |
|---|---|---|
| **T1**: ambang epsilon | GG = 1 bila Σλ² < 10⁻¹² (**absolut**). Data Gambar 51 × 10⁻⁵ memberi GG = HF = 1, sehingga df, MS, dan Sig. baris GG/HF di Tests of Within-Subjects Effects ikut salah. | GG = HF = 1 hanya bila tr(S) ≤ 10⁻¹² · tr(S_y), dengan S_y kovarians galat sel asli measure itu (**relatif**). Karena C ortonormal, tr(S) ≤ tr(S_y); keduanya berskala c² bila data dikali c, sehingga epsilon tidak bergantung pada skala. S = 0 tetap memberi GG = HF = 1. |
| **T2**: Huynh-Feldt pada n ≤ k | Bila n ≤ k, HF = min(GG, 1) (data n = k = 4: HF = .6520). | HF = min(1, (n·p·ε̂ − 2) / (p·(n − r − p·ε̂))) di semua kasus, seperti SPSS (n = k = 4: HF = 1). |

Catatan untuk T2:

- Batas bawah `.max(gg)` ikut dihapus agar rumusnya persis rumus SPSS (hanya dibatasi maksimum 1).
- Penghapusan ini tidak mengubah hasil apa pun. Untuk ε̂ ≥ 1/p dan r ≥ 1, rumus HF ≥ ε̂, karena pε̂·r + p²ε̂² ≥ 2. Karena itu batas bawah tersebut memang tidak pernah aktif.
- Penjaga `den.abs() < 1e-12` tidak diubah.

Hal yang sengaja tidak diubah:

- **Ambang W.** `mean_eig.abs() < 1e-12` untuk W di cabang non-singular masih absolut. Ambang ini hanya berpengaruh bila eigen rata-rata < 10⁻¹², yaitu data kira-kira ≤ 10⁻⁷ kali skala Gambar 51. Pada data × 10⁻⁵, W sudah cocok dengan SPSS.
- **Modul lama.** Pola T1 dan T2 juga ada di `mauchly_test.rs`, tetapi modul itu tidak dipanggil produksi (T5) dan sesuai instruksi tidak disentuh.

## 2. Test sebelum dan sesudah

Log lengkap:

- `v6/log/cargo-test-rm-sebelum.log` dan `cargo-test-rm-sesudah.log`;
- `cargo-test-mv-sebelum.log` dan `cargo-test-mv-sesudah.log`;
- `cargo-test-v6-baru-pada-kode-v5.log`: test baru v6 dijalankan pada `rm_model.rs` v5, lalu berkasnya dikembalikan.

Tangkapan: `ss/01`–`03` dan `ss/13` (test baru v6 pada kode v5).

| Crate | Sebelum (v5 + test white-box) | Sesudah (v6) |
|---|---|---|
| GLM Multivariate | 35 test: 35 lulus | 35 test: 35 lulus (crate tidak berubah) |
| GLM Repeated Measures | 31 test: 23 lulus, 8 gagal | 35 test: **29 lulus, 6 gagal** |

Rincian per test:

| Test | Oracle | Sebelum | Sesudah | Keterangan |
|---|---|---|---|---|
| `rm_model_epsilon_invarian_skala_1e_5` | R (tervalidasi SPSS) | GAGAL (GG 1, HF 1) | **LULUS** | T1, jalur produksi |
| `rm_model_hf_n_sama_k` | R (tervalidasi SPSS) | GAGAL (HF .6520) | **LULUS** | T2, jalur produksi |
| `v6_t1_skala_1e_5_sesuai_spss` (baru) | SPSS `wb_rm_konfirmasi.xlsx`, 39 nilai | GAGAL: 10 dari 39 (mis. df GG 3 vs 2,2400) | **LULUS** 39/39 | T1 |
| `v6_t1_epsilon_sama_pada_skala_1e_5_1_1e5` (baru) | SPSS Gambar 51 dan (b), 60 nilai | GAGAL: 9 dari 60 (GG 1 pada × 10⁻⁵, juga desain campuran b) | **LULUS** 60/60 | T1: data × 10⁻⁵, × 1, dan × 10⁵ memberi W, χ², Sig., GG, HF, dan LB yang sama (relatif ≤ 10⁻⁹) |
| `v6_t2_n_sama_k_sesuai_spss` (baru) | SPSS `wb_rm_konfirmasi.xlsx`, 39 nilai | GAGAL: 6 dari 39 (HF .6520 vs 1; Sig. HF .0131 vs .0032) | **LULUS** 39/39 | T2 |
| `v6_st_nol_epsilon_tetap_1` (baru) | Perilaku v5 dipertahankan | lulus | lulus | S = 0: GG = HF = 1 pada ketiga skala |
| `rm_model_gambar51/a/b_…_sesuai_spss`, `rm_model_epsilon_gg_hf_lb_dataset_b` | SPSS 27 | lulus (456 nilai) | lulus (456 nilai) | Tidak berubah |
| `mau_j20_skala_kecil`, `mau_j21_n_sama_k` | R (tervalidasi SPSS) | GAGAL | **GAGAL** | T1/T2 di modul lama `mauchly_test.rs`, yang di luar cakupan sesuai instruksi |
| `mau_j07`, `mau_j09`, `mau_t1` | R | GAGAL | GAGAL | T3 (modul lama) |
| `legacy_within_effects_observed_power_sesuai_spss` | SPSS | GAGAL | GAGAL | T4 (modul lama) |

Kriteria SPSS yang dipakai adalah |Statify − SPSS| ≤ 0,001. Pada data × 10⁻⁵, SS dan Mean Square berorde 10⁻⁵, sehingga untuk keduanya dipakai selisih relatif ≤ 10⁻⁶.

## 3. Hash WASM

Rincian di `v6/log/wasm-hash-v6.txt`; tangkapan `ss/04`.

| WASM | v5 (tag `skripsi-final-v5`) | v6 | Hasil |
|---|---|---|---|
| GLM Multivariate `wasm_bg.wasm` | md5 `43a77657bcd238bb949797c7dccea200`, sha256 `2b789774…8e0d1` | md5 `43a77657bcd238bb949797c7dccea200` (build ulang dari sumber v6 juga identik) | **Identik byte per byte** |
| GLM Repeated Measures `wasm_bg.wasm` | md5 `f4c34490f7fe4152b5ffb9a8cf9de4f8` (4.806.021 byte) | md5 **`889473e96259ef9e9f99cd8bba9c1d53`**, sha256 `b8db2820…2f8075` (4.806.161 byte) | Baru |
| Di build produksi (`.next/static/media`) | MV `wasm_bg.6145c2bf.wasm`, RM `wasm_bg.2bc2b212.wasm` | MV `wasm_bg.6145c2bf.wasm`, RM **`wasm_bg.241dc806.wasm`** | WASM lain (Univariate dan lainnya) identik |

Glue RM (`wasm.js`, `wasm.d.ts`, `wasm_bg.wasm.d.ts`, `package.json`) isinya identik dengan v5; API publik tidak berubah.

## 4. Evaluasi build produksi v6

Semua evaluasi dijalankan pada build `0aGhUdQPbhuxcAe295aG-`, dengan skrip v5 dan pembanding v5 final (`testing/final/iterasi4/regresi`, WASM MV `43a77657…`, WASM RM `f4c34490…`). Tidak ada nilai harapan yang disesuaikan.

### 4.1 Regresi GLM Repeated Measures terhadap SPSS 27 dan R

Sumber: `v6/regresi-rm/compare-spss-v6.txt` (tangkapan `ss/06`) dan `v6/regresi/rm/rm-reference.log`.

| Dataset | Desain | n | Nilai SPSS dibandingkan | Lulus | Selisih maks v6 | Selisih maks v5 | Pembanding |
|---|---|---|---|---|---|---|---|
| Gambar 51 | Within-only, `perlakuan` 4 level, 1 measure | 15 | 91 | 91 | 3,85·10⁻⁴ | 3,85·10⁻⁴ | SPSS 27 |
| (a) | Within-only, 2 measure × `waktu` 3 level | 16 | 282 | 282 | 4,41·10⁻⁴ | 4,41·10⁻⁴ | SPSS 27 |
| (b) | Campuran: `waktu` 4 level × `kelompok` 3 grup | 24 | 271 | 271 | 2,95·10⁻⁴ | 2,95·10⁻⁴ | SPSS 27 |
| (c) | Campuran + EM Means, Box's M, Levene, Residual SSCP | 20 | 403 | 403 | 4,26·10⁻⁴ | 4,26·10⁻⁴ | SPSS 27 |
| (d) | Data (b), kontras Repeated | 24 | 271 | 271 | 2,95·10⁻⁴ | 2,95·10⁻⁴ | SPSS 27 |
| **Total RM (SPSS)** | | | **1.318** | **1.318** | 4,41·10⁻⁴ | 4,41·10⁻⁴ | |
| Pembanding R | Gambar 51 (35), a (30), b (102), c (186) | — | 353 | 353 | — | — | R 4.3.2 (car 3.1.3, afex); toleransi relatif 10⁻⁶ |

- **Uji acuan RM** (`repeated-measures-reference.test.ts`) pada build v6: **1.681 lulus**, yaitu 1.318 SPSS + 353 R + 10 uji fungsional. Hasil ini sama dengan v5.
- **Tidak ada nilai regresi yang berubah.**
  - `compare-spss.mjs` dengan paket WASM v5 dan v6 menghasilkan `compare-spss.json` yang identik byte per byte, termasuk nilai Statify dan selisihnya pada 1.318 baris.
  - Seluruh keluaran WASM RM v5 dan v6 (2.584 nilai) identik pada keenam desain acuan (`v6/regresi-rm/rm-v5-vs-v6.txt`, tangkapan `ss/05`).
  - Lewat UI, hash tabel RM kesembilan desain (gambar51, a, b, c, cEm, cPoly, cRep, exp5000n, exp5000) sama dengan v5 final, dan main = worker (`v6/regresi/rm/rm-hash-v5final-v6.txt`).
- **Mengapa tidak berubah:** pada semua desain acuan, varians kontras jauh di atas ambang relatif dan n > k, sehingga cabang yang diubah memberi nilai yang sama.

### 4.2 Studi kasus sleeping dog (J&W §6.2)

Harness `testing/fitur-v4/harness/sleeping-dog.cjs --out=testing/whitebox/v6/sleeping-dog`, lewat UI build v6 (mode worker). Hasilnya dibandingkan dengan v5 final (`testing/bab5/sleeping-dog/hasil.json`):

| Bagian | Hasil |
|---|---|
| RM: faktor within `perlakuan` 4 level (tabel yang tampil dan respons worker) | **Identik** dengan v5 final |
| MV satu populasi: kontras d1–d3, Test Values 0, CI simultan T² dan Bonferroni 95% | **Identik** dengan v5 final |
| Tangkapan layar | 7 berkas di `v6/sleeping-dog/` (a1–a3 RM, b1–b4 MV) |

Tangkapan terminal: `ss/08` dan `ss/09`.

### 4.3 Regresi lain (`regress-final.sh`, keluaran di `v6/regresi/`)

Tangkapan: `ss/07`.

| Pemeriksaan | v5 final | v6 |
|---|---|---|
| MV lewat UI vs SPSS 27 (worker) | 2.339/2.339 lulus | **2.339/2.339 lulus**, regresi 0, main = worker |
| MV Σ diketahui (5 konfigurasi) | main = worker; = harness R | **sama** |
| Nilai mentah MV (payload dan respons worker, 23 konfigurasi) vs v5 final | — | **23/23 identik** (`raw-vs-v5final.txt`) |
| Uji acuan MV (fixture dari run v6) | 2.339 lulus, 12 todo; fixture diff 0 | **2.339 lulus, 12 todo; fixture diff 0** |
| Uji acuan RM | 1.681 lulus | **1.681 lulus** |
| Jest penuh | 49 suite gagal dari 279 (= baseline) | **47 suite gagal dari 280**; 0 di luar baseline. Dua suite baseline kini lulus: `multivariate/test/multivariate.test.ts` dan `multivariate/__test__/multivariate.test.ts`, hasil perbaikan white-box. Suite ke-280 adalah `empty-cells.basis-path.test.ts`. |
| RM main = worker dan hash tabel (9 desain) vs v5 final | — | **9/9 identik** |

Keluaran pembanding bawaan skrip v5 (`raw-vs-v5.txt`: 9 dari 23 tidak identik terhadap `step21-v5`; `experiment-output-check.txt`: 4 sel MV berbeda dari kolom v1–v4) sama dengan keluaran regresi v5 final. Penyebabnya perubahan Wilks sebelum v5 final, dan penjelasannya ada di `testing/bab5/ringkasan-responsivitas.md` §6.

### 4.4 Eksperimen responsivitas (8 sel)

Seperti pada v5 final, kedelapan sel dijalankan ulang lewat dialog asli build v6 dengan konfigurasi yang sama:

- MV: n = 100, 500, 1000, 2000;
- RM: n = 5000, 10000, 20000, 40000; 10 level, 1 measure; Descriptive, Effect size, Observed power.

Payload dan respons worker ditangkap lalu dibandingkan (`capture-exp-payloads.cjs`, `exp-compare.mjs`). Tangkapan v6 disimpan di `D:\claude-tmp-statify\exp-capture-v6` (`EXPDIR`), sehingga tangkapan v5 final (`exp-capture-final`) tidak tertimpa.

| Sel | Payload v5 final = v6 | Respons worker v5 final = v6 |
|---|---|---|
| multivariate-100 / 500 / 1000 / 2000 | identik (4/4) | identik (4/4) |
| repeated-measures-5000 / 10000 / 20000 / 40000 | identik (4/4) | identik (4/4) |

- Sumber: `v6/regresi/experiment-v5final-vs-v6.txt`; tangkapan `ss/10`.
- Data, konfigurasi, dan hasil komputasi di kedelapan sel sama persis dengan v5 final. Karena itu angka responsivitas final (`testing/bab5/ringkasan-responsivitas.md` §4) tetap mewakili v6.
- Waktu tidak diukur ulang, sama seperti pada v5. Perubahan RM hanya menambah satu SSCP galat k × k per measure pada `mauchly()`, yaitu 10 × 10 pada sel eksperimen.

## 5. Black-box uji awal v6 (78 skenario, Playwright)

Uji ini semula dijalankan sebagai "iterasi 7" (`--iter=7`) di branch `fix-epsilon-v6`, dengan harness v5 tanpa perubahan, terhadap build v6 (`BUILD_ID` `0aGhUdQPbhuxcAe295aG-`) lewat antarmuka asli. Setiap skenario memakai browser context baru dengan mode eksekusi bawaan (worker).

```
node testing/black-box/harness/bb-run.cjs    --base=http://localhost:3101 --iter=7            # 50 skenario
node testing/black-box/harness/bb-run-v4.cjs --base=http://localhost:3101 --iter=7 --set=all  # 28 skenario
node testing/black-box/harness/bb-nilai.mjs  --iter=7
```

- **Waktu dan lingkungan:** 30 September 2026, 20:22–20:46 WIB; Chromium 143.0.7499.4, Playwright 1.57.0.
- **WASM yang dilayani:** `run-report.json` mencatat MV `wasm_bg.6145c2bf.wasm` (md5 `43a77657…`) dan RM `wasm_bg.241dc806.wasm` (md5 `889473e9…`), sama dengan build v6.
- **Keluaran** (di `ilham` dipindahkan dari `iterasi-7/` agar iterasi 7 resmi dijalankan pada build gabungan, §7):
  - `testing/black-box/hasil-eksekusi/iterasi-7-uji-awal-v6/` (78 berkas pengamatan, `nilai-spss.json`, `run-report.json`);
  - `testing/black-box/bukti/iterasi-7-uji-awal-v6/` (233 tangkapan layar);
  - log `v6/bb-iter7.log`.
- **Tangkapan terminal:** `ss/11` dan `ss/12`.

**Pembanding.** Pengamatan iterasi 7 dibandingkan dengan pengamatan v5 final, yaitu iterasi 3 (78 skenario, build `LIBUcskLZhw3iEIArOeUX`) yang ditimpa iterasi 4 untuk 8 skenario yang diulang pada build final v5. Yang dibandingkan: status, langkah, toast, `checks`, dan seluruh tabel yang disimpan aplikasi (judul, kolom, baris, catatan kaki), berurutan (`v6/bb-iter7-verifikasi.txt`).

| KF | Skenario | Sesuai v5 final (iterasi 3/4) | Sesuai iterasi 7 | Pengamatan identik dengan v5 final |
|---|---|---|---|---|
| KF1 | 2 | 2 | 2 | 2 |
| KF2 | 13 | 13 | 13 | 13 |
| KF3 | 16 | 16 | 16 | 16 |
| KF4 | 6 | 6 | 6 | 6 |
| KF5 | 2 | 2 | 2 | 2 |
| KF6 | 10 | 10 | 10 | 10 |
| KF7 | 2 | 2 | 2 | 2 |
| KF8 | 5 | 5 | 5 | 5 |
| KF9 | 3 | 3 | 3 | 3 |
| KF10 | 3 | 3 | 3 | 3 |
| KF11 | 5 | 5 | 5 | 5 |
| KF12 | 1 | 1 | 1 | 1 |
| KF13 | 7 | 7 | 7 | 5 |
| KF14 | 3 | 3 | 3 | 3 |
| **Total** | **78** | **78** | **78** | **76** |

**Nilai tampil vs SPSS 27** (`bb-nilai.mjs`): semua baris cocok (toleransi 0,001).

| Data | Nilai cocok |
|---|---|
| MV: mv1, mv2, mv3, mv4, mv5, mv8, mv4ph, mv7 | 20/20, 109/109, 20/20, 40/40, 112/112, 68/68, 60/60, 80/80, 77/77, 8/8, 60/60 ×3, 180/180, 109/109 |
| RM: rm_gambar51, rm_a, rm_d, rm_c, rm_b | 91/91, 138/138, 39/39, 60/60, 40/40, 105/105 |

Di iterasi 3, BB-KF09-02 tercatat 74/138 dan BB-KF09-03 0/39. Nilai-nilai itu dicatat pada build sebelum v5 final, dan pada iterasi ini semuanya cocok.

**Dua skenario yang pengamatannya berbeda dari v5 final**

Keduanya tetap memenuhi Hasil yang Diharapkan. Penilaian di bawah ini penilaian saya dan perlu dikonfirmasi penguji.

| Skenario | Perbedaan | Penjelasan | Penilaian |
|---|---|---|---|
| BB-KF13-04 (MV 2000 kasus, Web Worker) | Multivariate Tests, baris Wilks' Lambda: Noncent. Parameter dan Observed Power. Contohnya F1 noncent 1026,6878 → 938,0746; F1*F2 power 0,7730 → 0,6416. Efek yang terdampak: F1, F1*F2, F1*F3, F1*F2*F3. | Pembandingnya iterasi 3 (build sebelum perbaikan noncentrality Wilks v5 final, commit `81921e12`); skenario ini tidak diulang di iterasi 4. Nilai iterasi 7 **sama dengan respons worker v5 final** untuk data yang sama (sel `multivariate-2000`, `exp-capture-final`), dan WASM MV v6 identik dengan v5. | **Sesuai**: toast "Running…" lalu "completed successfully", halaman dapat digulir dan menu dapat dibuka selama perhitungan, tabel memuat F1*F2*F3. |
| BB-KF13-07 (RM 40000 subjek, Web Worker) | `checks.probe` berisi dua sampel (v5 final: satu). Sampel pertama: `running` true, grid tergulir, menu terbuka, masih berjalan. Sampel kedua: analisis sudah selesai. | Analisis masih berjalan saat pengamatan kedua dimulai, sehingga harness mencatat satu sampel tambahan. Keluaran RM untuk data ini identik dengan v5 final (sel `repeated-measures-40000`). | **Sesuai**: selama perhitungan halaman dapat digulir dan menu dapat dibuka; hasil tampil. |

**Catatan alat pembanding.** `bb-diff-iter.mjs` melaporkan 9 skenario "berbeda" (`v6/bb-diff-v5final-iter7.txt`). Tujuh di antaranya adalah artefak alat: skenario dengan beberapa tabel berjudul sama (satu per DV atau measure) dicocokkan dengan tabel pertama yang judulnya sama. Buktinya, menjalankan alat itu pada baseline v5 final **terhadap dirinya sendiri** menghasilkan tujuh skenario yang sama dengan jumlah perbedaan yang sama (`v6/bb-diff-v5final-vs-v5final.txt`). Pembandingan berurutan di atas tidak memiliki kelemahan ini. Harness tidak diubah.


## 6. Ringkasan dan hal yang perlu diputuskan

1. **T1 dan T2 diperbaiki di jalur produksi** dan cocok dengan SPSS 27: 39 + 39 nilai konfirmasi dan 60 nilai uji skala.
2. **Tidak ada nilai regresi v5 yang berubah:** RM 1.318 SPSS + 353 R, MV 2.339, sleeping dog, 8 sel eksperimen, dan 9 hash tabel RM.
3. **Test modul lama `mau_j20` dan `mau_j21` tetap gagal (keputusan penulis).** Keduanya menguji pola T1/T2 yang sama di `mauchly_test.rs`, modul lama yang tidak dipanggil produksi: `run_analysis` selalu memakai `RmModel`, dan cabang fallback `None => core::calculate_mauchly_test(..)` di `wasm/function.rs` tidak dapat dicapai (temuan T5, `ringkasan-white-box.md` §8). Modul lama tidak disentuh dan test tidak diberi `#[ignore]`.
4. **Black-box uji awal v6:** 78 skenario Sesuai, 76 identik dengan v5 final. BB-KF13-04 dan BB-KF13-07 dinilai Sesuai oleh penguji (tangkapan: `testing/black-box/bukti/iterasi-7-uji-awal-v6/BB-KF13-04-1…3.png`, `BB-KF13-07-1…2.png`).
5. Ambang W (`mean_eig.abs() < 1e-12`) masih absolut (lihat §1). Ambang ini tidak memengaruhi epsilon dan hanya aktif pada skala data yang sangat kecil.

## 7. Jalankan ulang pada build final gabungan (`ilham`, iterasi 7 resmi)

**Build.**
- `next build` di `ilham` (commit `7b383f0c`): `BUILD_ID` **`EXcw4k8lfhzpWjMN3Mjc7`** (`v6-final/log/next-build.log`).
- WASM di `.next/static/media`: MV `wasm_bg.6145c2bf.wasm` md5 **`43a77657…`**, RM `wasm_bg.241dc806.wasm` md5 **`889473e9…`**. Keduanya sama dengan v6; WASM lain juga identik.

**Isi dua commit teks.** `a345ded6` dan `ff9e9a03` mengubah teks tampilan: judul subdialog dan tabel, catatan kaki, label efek, deskripsi tabel, toast, dan tur panduan. Perubahan yang mengikuti teks:
- pola judul di `multivariate-analysis-output.ts` (pengelompokan Multiple Comparisons dan Residual Plots);
- selector harness black-box dan `ui-run.cjs`;
- label di `contrast-results.test.ts`.

Penulis menerima kedua commit (opsi A); black-box memakai harness versi `ilham`.

### 7.1 Regresi (skrip v5, keluaran `v6-final/regresi/`)

Sumber: `v6-final/regresi-ringkas.txt`; tangkapan `ss/14`.

| Pemeriksaan | Uji awal v6 | Build final | Beda terhadap v6 |
|---|---|---|---|
| MV lewat UI vs SPSS 27 (worker) | 2.339/2.339 | **2.339/2.339**, regresi 0, main = worker | tidak ada (`regress-vs-v6.txt`) |
| Nilai mentah MV (payload dan respons worker, 23 konfigurasi) | — | 23/23 identik dengan v5 final **dan** dengan v6 | tidak ada |
| MV Σ diketahui (5 konfigurasi) | main = worker; = harness R | sama | tidak ada |
| Uji acuan MV / RM (1.318 SPSS + 353 R + 10) | 2.339 / 1.681 lulus | **2.339 / 1.681 lulus**, fixture diff 0 | tidak ada |
| RM langsung vs SPSS 27 (`compare-spss.mjs`, 1.318 nilai) | selisih maks per desain: gambar51 3,85·10⁻⁴; a 4,41·10⁻⁴; b 2,95·10⁻⁴; c 4,26·10⁻⁴; d 2,95·10⁻⁴ | sama | `compare-spss.json` identik isinya (`v6-final/regresi-rm/`) |
| Jest penuh | 47 suite gagal dari 280, 0 di luar baseline | **sama** (6.888 lulus, 204 gagal, 12 todo) | tidak ada |
| 8 sel eksperimen (payload dan respons worker) | identik dengan v5 final | identik dengan v5 final dan v6 | tidak ada |
| RM lewat UI: main = worker (9 desain) | 9/9 | 9/9 | — |
| RM lewat UI: hash tabel (9 desain) | = v5 final | berbeda dari v6 di 9/9 desain | **hanya teks**, lihat di bawah |

**Hash tabel RM.** Hash dihitung dari `output_data` tabel lengkap, termasuk teks deskripsi. Kesembilan desain ditangkap ulang dengan `--saveTables=1` pada build v6 dan build final (36 berkas per build, `v6-final/regresi/rm-tabel/`; tangkapan `ss/15`).
- **10.780 sel angka identik**; struktur dan judul tabel sama.
- Hash tangkapan ulang sama dengan hash regresi masing-masing build.
- Yang berbeda hanya 7 teks deskripsi (`interpretation`) dari `a345ded6`, misalnya "Errors logs from the analysis." → "Messages and warnings produced during the analysis." dan "If significant (Sig. < .05), sphericity is violated …" → "Sig. below the Significance Level in Options indicates that sphericity is violated; …".

Catatan eksekusi:
- `OUT` mula-mula diberikan sebagai path relatif, sehingga langkah 4–5 `regress-final.sh` (yang menulis log sesudah `cd frontend`) tidak menghasilkan keluaran. Kedua langkah diulang dengan blok perintah yang sama dan path absolut (`v6-final/regresi-langkah45.log`).
- Langkah 9 (hash RM vs v6) gagal karena galat sintaks di `run-v6.sh`. Skrip diperbaiki dan langkah itu dijalankan ulang (`rm-hash-v6-vs-final.txt`).
- Di langkah 8, teks "v6" pada `run-v6.sh` merujuk ke build yang sedang diuji (di sini build final).

### 7.2 Sleeping dog

Build final vs v6 (`v6-final/sleeping-dog/v6-vs-final.txt`; tangkapan `ss/16`):
- RM: 24 nilai angka identik, tanpa perubahan teks.
- MV: 105 nilai angka identik. Satu teks berubah: catatan CI simultan "(α = 0.05 from Options → Significance Level)" → "(α = 0.05 the Significance Level in Options)" (`a345ded6`).

### 7.3 Black-box iterasi 7 resmi (78 skenario)

Harness versi `ilham` dijalankan pada build final (`--iter=7`, 30 September 2026, 22:41–23:05 WIB):
- **Keluaran:** `testing/black-box/hasil-eksekusi/iterasi-7/`, `bukti/iterasi-7/` (233 tangkapan layar), log `v6-final/bb-iter7.log`.
- **WASM yang dilayani:** `run-report.json` mencatat MV `43a77657…` dan RM `889473e9…`.
- **Tangkapan terminal:** `ss/17`–`ss/19`.

| Pemeriksaan | Hasil |
|---|---|
| Nilai tampil vs SPSS 27 (`bb-nilai.mjs`) | semua cocok (MV 20/20 … 180/180; RM 91/91, 138/138, 39/39, 60/60, 40/40, 105/105) |
| **Nilai** tabel vs uji awal v6 (sel angka, berurutan) | **78/78 skenario identik** |
| **Teks** vs pengamatan terbaru `ilham` (iterasi 3 ditimpa 4, 5, 6) | 49 identik, termasuk ke-14 skenario yang diulang di iterasi 5/6 sesudah perubahan teks. 29 berbeda: skenario yang belum dijalankan ulang sejak kedua commit teks. |
| Asal perbedaan teks (`v6-final/bb-iter7-verifikasi-teks.txt`) | **57/57 perbedaan persis dijelaskan** oleh penggantian teks `a345ded6`/`ff9e9a03`, ditambah BB-KF13-07 (jumlah pengamatan saat analisis berjalan 1 → 2, keduanya halaman responsif) |

Penggantian teks yang teramati:

| Teks lama | Teks baru | Skenario |
|---|---|---|
| "R Squared = … (Adjusted R Squared = …) — y1" | "… for y1" | BB-KF01-02, KF02-01/02/04/05/06/08/09, KF03-01/03/07/09/10/11/12/13, KF04-04/05, KF05-01, KF06-01/02/03/10, KF10-01/02, KF13-01/03/04 |
| "(α = … from Options → Significance Level)" | "(α = … the Significance Level in Options)" | BB-KF02-04/05/08, KF03-10/12, KF04-04/05 |
| "Krishnamoorthy–Yu", "Welch–Satterthwaite" | "Krishnamoorthy-Yu", "Welch-Satterthwaite" | BB-KF03-11 |
| "jk — Welch-Satterthwaite"; "… — Computed using Welch-Satterthwaite approximation …" | "jk (Welch-Satterthwaite)"; "…. The jk effect is computed with the Welch-Satterthwaite approximation …" | BB-KF03-11 |
| "Multivariate Tests — Hotelling T² Berpasangan"; "Hotelling T² Berpasangan"; "Analisis dilakukan pada vektor selisih …" | "Multivariate Tests"; "Hotelling T² (Paired)"; "Computed on the difference vector …" | BB-KF04-04, KF04-05 |

**Kutipan teks di "Hasil yang Diharapkan"** (`skenario-black-box.md`). Ada 10 skenario yang mengutip teks lama:
- Sembilan sudah punya catatan revisi R9/R10 yang menyebut teks barunya: BB-KF03-02, KF03-04, KF03-05, KF03-08, KF04-01, KF04-02, KF04-03, KF11-03, KF14-01. Pengamatan teksnya identik dengan iterasi 5/6.
- Satu belum punya catatan revisi: **BB-KF03-11**. Kutipan "Krishnamoorthy–Yu" (tanda pisah en) kini tampil "Krishnamoorthy-Yu" (tanda hubung). Isi catatan lainnya (§6.3, ν = 58.268, c, Bonferroni Welch t, 95%) tetap.

**Penilaian.**
- Semua skenario memenuhi Hasil yang Diharapkan.
- BB-KF03-11 memenuhi isi hasil yang diharapkan; perbedaannya hanya tanda baca kutipan, sehingga dinilai **Sesuai dengan catatan** dan menunggu konfirmasi penguji (atau revisi R11 pada kutipan).
- BB-KF13-04 dan BB-KF13-07 Sesuai. Tangkapan: `testing/black-box/bukti/iterasi-7/BB-KF13-04-1…3.png`, `BB-KF13-07-1…2.png`.

### 7.4 Berkas milik penulis yang belum di-commit

`glm-rm-reference/spss/{gambar51,rm_a,rm_b,rm_c}.sps` dan `performance-results-univariate-all-runs.json` tidak di-stage.
- Jest penuh menulis ulang `performance-results-univariate-all-runs.json`, dan `regress-final.sh` langkah 5 menjalankan `git checkout` pada berkas itu.
- Karena itu kelima berkas dicadangkan sebelum regresi dan dipulihkan byte per byte sesudahnya (md5 cocok).

## 8. Berkas

```
testing/whitebox/
  laporan-v6.md                      laporan ini
  spss-tertunda/                     sintaks, data, keluaran SPSS (xlsx, spv), ekstraksi JSON
  ss/                                tangkapan terminal (PNG)
  v6/log/                            cargo test sebelum/sesudah, next build, hash WASM
  v6/harness/                        run-v6.sh, rm-v5-vs-v6.mjs, terminal-ss.cjs, spesifikasi tangkapan
  v6/regresi/                        keluaran regress-final.sh dan pembanding v5 final
  v6/regresi-rm/                     compare-spss v5 dan v6, keluaran penuh WASM RM v5 vs v6
  v6/sleeping-dog/                   tangkapan UI dan hasil.json
  v6/bb-iter7.log, bb-diff-*.txt     eksekusi dan pembanding black-box uji awal v6
  v6-final/                          jalankan ulang pada build final gabungan (§7): log build, regresi,
                                     rm-tabel (tabel RM lengkap v6 dan final), sleeping dog, black-box iterasi 7
  v6/harness/bb-banding-final.py     pembanding teks (vs iterasi 3/4/5/6) dan nilai (vs uji awal v6)
testing/black-box/bukti/iterasi-7-uji-awal-v6/, hasil-eksekusi/iterasi-7-uji-awal-v6/   uji awal v6 (branch fix-epsilon-v6)
testing/black-box/bukti/iterasi-7/, hasil-eksekusi/iterasi-7/                         iterasi 7 resmi (build final)
```
