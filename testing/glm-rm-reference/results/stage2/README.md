# Tahap 2: desain campuran (dan penyelarasan jalur within-only)

Status: **diperbaiki, tervalidasi terhadap R (car), menunggu SPSS**. Nilai SPSS untuk dataset (b) belum tersedia. Slot test-nya sudah disiapkan dengan status "menunggu SPSS" di `frontend/.../repeated-measures/__test__/fixtures/rm-reference-values.json`.

> **Pembaruan (setelah keluaran SPSS 27 diterima):** semua tabel tahap ini tervalidasi terhadap SPSS 27 (toleransi 0,001; pada presisi penuh selisih ≤ 4,4·10⁻⁴, hanya dari F tiga desimal SPSS). Lihat `../spss-validation/README.md`. Status di atas adalah catatan saat tahap ini selesai.

## 2a — commit `041ca05e`: desain dengan faktor between / kovariat

| Sebab (diagnosis) | Perbaikan |
|---|---|
| Tata letak `factors_data`: TS mengirim per subjek, Rust membaca per faktor | **Satu tata letak: VARIABLE-MAJOR** `factors_data[f][s]` / `covar_data[c][s]`, dengan f/c mengikuti `*_defs` dan s mengikuti urutan `subject_data`. Didokumentasikan di `rust/src/models/data.rs`, `rust/src/stats/rm_model.rs`, dan `services/repeated-measures-analysis.ts`. Service mengambil semua variabel (DV, faktor, kovariat) dalam **satu** panggilan `getSlicedData` agar jumlah barisnya sama. Rust menolak tata letak yang tidak cocok dengan pesan yang jelas. |
| Matriks desain: nilai faktor dicari di rekaman within, tanpa intercept | `stats/rm_model.rs` (baru) memakai pendekatan GLM multivariat SPSS: intercept + kovariat + faktor berkode efek + interaksi faktorial penuh, SS tipe III lewat matriks L, galat model penuh dengan v = N − rank(X), dan listwise. `build_design_matrix_and_response` (dipakai EMMeans/SSCP) diperbaiki: lookup per indeks subjek, intercept, kode efek, dan produk kolom untuk interaksi. Level faktor diurutkan seperti SPSS. |
| `BetSubVar` basi di run pertama | `executeRepeatedMeasures` menurunkan `model.BetSubVar` dan `emmeans/posthoc/plots.SrcList` dari `mainData` yang dikirim. Rust memakai `main.FactorsVar`/`main.Covariates` sebagai sumber kebenaran. |

Tabel dari mesin baru: Multivariate Tests (efek within dan within × between; untuk > 1 measure juga efek between secara doubly multivariate), Mauchly (dari galat model penuh, HF dengan N dan r = rank X), Tests of Within-Subjects Effects (4 koreksi), Tests of Within-Subjects Contrasts, Tests of Between-Subjects Effects (semua sumber), Univariate Tests (tipe III per variabel dependen, menggantikan modul lama yang membagi SS model "secara proporsional"), dan Descriptive Statistics per grup + Total.

Lainnya:
- *Observed power* eksak (F nonsentral; rekurensi AS 226 agar cepat untuk λ besar).
- Matriks galat singular dilaporkan sebagai pesan yang jelas, bukan angka sampah.
- Pemformat menampilkan semua sumber between dan baris interaksi pada tabel kontras.

## 2b: desain within-only juga memakai mesin yang sama

Desain within-only dengan **satu** faktor within kini memakai `rm_model.rs`. Desain dengan > 1 faktor within tanpa faktor between tetap memakai modul lama (lihat keterbatasan).

Nilai yang **berubah** pada desain within-only, termasuk konfigurasi eksperimen Web Worker. Semuanya kini cocok dengan R:
- **SS dan MS Tests of Between-Subjects Effects** sekarang pada skala SPSS (T = Σy/√k), sebelumnya rata-rata (Σy/k). Faktornya k; F, Sig., dan η² tidak berubah.
- **Noncent. Parameter** pada baris Greenhouse-Geisser/Huynh-Feldt/Lower-bound = F × df terkoreksi (sebelumnya F × df tak terkoreksi).
- **Observed Power** eksak di semua tabel (sebelumnya aproksimasi normal atau rumus semu `1 − 0,1/F`).
- Uji multivariat: SS, nilai, F, df, Sig., dan η² sama; power eksak; catatan desain kini "Intercept; Within Subjects Design: <faktor>".
- Tabel kontras: kolom *Source* kini nama faktor within (sebelumnya nama measure); nilainya sama kecuali power.
- Mauchly: sama dengan baseline (selisih ≤ 7·10⁻¹⁵, pembulatan floating point).

## Bukti

| Pemeriksaan | Berkas | Hasil |
|---|---|---|
| (b) vs R: Mauchly, Within, Multivariate, Between (termasuk η², noncent, power) | `compare-r-b-2a.txt`, `compare-r-b-2b.txt` | 7/7, 88/88, 64/64, 18/18 cocok (toleransi 1e-6) |
| Gambar 51 dan (a) vs R, setelah 2b | `compare-r-gambar51-2b.txt`, `compare-r-a-2b.txt` | 0 selisih di keempat tabel |
| Test Jest acuan (nilai langsung dari car) | `__test__/repeated-measures-reference.test.ts` | 271 lulus, 16 *todo* "menunggu SPSS" |
| UI asli, main vs worker, 4 run per desain | `ui-main-worker.json` (2a), `ui-main-worker-2b.json` | Gambar 51, (a), (b): byte-identik; run pertama (b) sama dengan run berikutnya (BetSubVar tidak lagi basi) |
| Regresi Gambar 51 | `regression-g51-2a.txt`, `regression-g51-2b.txt` | Sama dengan baseline |
| Determinisme 10× + 10× | `determinism-2a.json`, `determinism-2b.json` | 1 keluaran per desain |
| Jest penuh | `jest-summary-2a.txt`, `jest-failed-suites-2a.txt` (dan 2b) | 49 gagal = baseline |
| Performa (Jest, 1000 × 5 + faktor between) | log Jest | 346–510 ms (batas test 5.000 ms) |

## Keterbatasan (belum diperbaiki)

1. **Lebih dari satu faktor within** (mis. A × B within) belum didukung mesin baru.
   - Dengan faktor between: analisis berhenti dengan pesan "Designs with more than one within-subjects factor are not supported yet".
   - Tanpa faktor between: tetap memakai modul lama, yang memperlakukan semua sel sebagai satu faktor.
2. **Model kustom** (`Custom`/`BetSubModel` di dialog Model) belum dibaca. Model between selalu faktorial penuh + kovariat (bawaan SPSS).
3. **Kontras within** tetap memakai kontras berurutan Statify ("Level j vs. Level j+1"), bukan kontras polinomial bawaan SPSS. Tabel kontras SPSS (b) tidak bisa dibandingkan langsung.
4. **Chi-square Mauchly** memakai −(v − (2p² + p + 2)/(6p))·ln W dan p-value χ² tanpa koreksi. Untuk Gambar 51 hasilnya 6,104/0,296, sedangkan nilai acuan pengguna 6,164/0,298 (menunggu konfirmasi `spss/gambar51.sps`).
5. **Huynh-Feldt** memakai rumus asli (N, N − r), yang diperkirakan dipakai SPSS. car memakai koreksi Lecoutre, sehingga HF desain campuran berbeda dari car (dataset c: 0,960 vs 0,909). SPSS yang akan menentukan.
