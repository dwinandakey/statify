# Diagnosis: GLM Repeated Measures dengan faktor between (2026-09-22)

Diagnosis saja, tanpa perbaikan. Skrip ada di [../../diagnosis/rm-between](../../diagnosis/rm-between).

| Berkas | Isi |
|---|---|
| `capture-n12-g{2,3}-worker-worker-main-main.json` | UI asli (build produksi), urutan run worker, worker, main, main. Berisi payload yang dikirim aplikasi ke worker dan keluaran lengkap setiap run. |
| `rm-mixed-n12-g{2,3}.csv` | Dataset: 12 subjek seimbang, 5 level within (`t1..t5`), `group` 2 atau 3 level |
| `diagnose-report.json` | Replay payload di Node (binary `rust/pkg` yang sama): payload apa adanya, versi `factors_data` per variabel, dan diff `config_data` antara run 1 dan run 2 |
| `compare-within-only-*.json` | Tabel desain campuran dibandingkan dengan payload yang sama tanpa faktor between |

## Temuan

1. **Error muncul di semua run, di mode main dan worker, dan juga di Node tanpa browser atau worker.** Pesannya: *"Failed to calculate tests for t1_(1,score): Error computing X'X: Empty matrices provided for multiplication"*.
   - Jalur: `wasm/function.rs:207` → `stats/univariate_tests.rs:21/100` → `stats/common.rs:714` (`build_design_matrix_and_response`) → `stats/common.rs:568` (`matrix_multiply`).
2. **Sebab pertama: kontrak tata letak `factors_data` berbeda antara TypeScript dan Rust.**
   - `analyzeRepeatedMeasures` (`repeated-measures-analysis.ts:108–126`) mengirim `factors_data` **per subjek**: 12 *array*, masing-masing berisi 1 rekaman.
   - `get_factor_levels` (`common.rs:200–224`) membaca `factors_data[i]` sebagai **semua rekaman faktor ke-i**, sehingga hanya melihat subjek pertama dan menemukan **1 level**.
   - *Dummy coding* `levels[0..len-1]` lalu tidak menghasilkan kolom, dan tanpa intercept atau kovariat setiap baris X kosong.
3. **Sebab kedua: pembangunan matriks desain yang salah.** Dengan `factors_data` per variabel (seperti test Jest), error berubah menjadi *"Matrix is singular"*. Penyebabnya, `build_design_matrix_and_response` mencari nilai faktor between di rekaman **within** (`record.values.get(factor)` pada `subject_data`, `common.rs:734–737`), di mana nilainya tidak ada, sehingga semua kolom *dummy* bernilai 0. Matriks itu juga tidak punya kolom intercept.
4. **Tabel between-subjects berubah setelah run pertama karena konfigurasi, bukan state.** Data dan *defs* run 1 dan run 2 identik, dan replay payload yang sama di instance yang sama memberi keluaran identik.
   - Yang berbeda hanya `config_data`: `model.BetSubVar` `[]` → `["group"]`, dan `plots/posthoc/emmeans.SrcList` `null`/`[]` → `["group"]`.
   - `BetSubVar` diisi oleh `useEffect` di `repeated-measures-main.tsx:160–182`, yang bergantung pada `formData.main.FactorsVar`. Tetapi `executeRepeatedMeasures` (`:248–259`) membentuk `newFormData` dari `formData.model` yang belum diperbarui, dengan `main: mainData`. Karena itu run 1 mengirim `FactorsVar: ["group"]` bersama `BetSubVar: []`.
   - **Run 1** (`BetSubVar` kosong): `between_subjects_effects.rs:26` mengambil cabang "tanpa faktor between" dan menghitung model intercept saja (df Error = n − 1). Faktor `group` tidak ada di tabel.
   - **Run 2 dan seterusnya:** cabang `:110–170` mengodekan nilai kategorik ("G1", "G2") sebagai `0.0` (lihat komentar di baris 164–165), sehingga matriksnya singular dan tabel `effects` kosong tanpa error.
5. **Tabel lain yang tampil juga tidak sesuai model yang diminta.**
   - *Tests of Within-Subjects Effects* **identik** dengan hasil tanpa faktor between: tidak ada baris `time × group`, dan Error(time) tidak dipartisi.
   - *Multivariate Tests* hanya berisi "Intercept" dan "group" dengan nilai degenerate (Wilks = 1, df hipotesis 0, F kosong), sedangkan efek `time` hilang.

## Penilaian

- Hasil desain campuran selama ini **bukan sekadar gagal sebagian**. Satu tabel gagal dengan error (uji univariat). Tabel lain tampil tetapi **dihitung dengan model yang berbeda dari yang diminta**, atau kosong, tanpa pesan error.
- Test Jest Repeated Measures (Dataset B, desain campuran) lolos karena hanya memeriksa keberadaan tabel, bukan nilainya.
- **Perkiraan ukuran perbaikan:**
  - **Kecil:** masalah `BetSubVar` yang basi di TypeScript, beberapa baris di `executeRepeatedMeasures`.
  - **Besar:** dukungan desain campuran di Rust. Perlu kontrak tata letak `factors_data` yang satu dan konsisten, matriks desain dengan intercept dan pengodean faktor yang benar, efek between bertipe Type III, interaksi within × between dan partisi Error(time), serta uji multivariat untuk efek within dan interaksinya. Ini menyentuh setidaknya `common.rs`, `univariate_tests.rs`, `between_subjects_effects.rs`, `within_subjects_effects.rs`, dan `multivariate_tests.rs`, dan membutuhkan acuan SPSS untuk validasi.
