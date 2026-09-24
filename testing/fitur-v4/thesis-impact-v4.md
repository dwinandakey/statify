# Dampak fitur v4 ke naskah skripsi (diagram kelas, sequence, teks)

- **Fitur:** (1) nilai hipotesis selisih δ₀ untuk uji dua populasi (Pooled dan Unequal) dan berpasangan; (2) selang kepercayaan simultan T² dan Bonferroni. Keduanya berasal dari masukan dosen pengampu APG.
- **Basis:** `skripsi-final-v3` (`426429d8`), branch `ilham`.
- **Path:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/multivariate/`.

## 1. Perubahan API publik Rust (crate MV)

Diperiksa dengan `testing/glm-mv-reference/harness/rust_api.py` terhadap `82a63b45`. Daftar persisnya ada di `testing/fitur-v4/rust-api-allowed.json`, dan `check-step.sh` hanya lulus bila perubahannya sama persis dengan daftar itu. **Tidak ada `pub fn` bebas yang baru, `MultivariateResult` dan `OptionsConfig` tidak berubah, dan crate RM tidak berubah.**

| Berkas | Perubahan | Alasan |
|---|---|---|
| `rust/src/wasm/constructor.rs` | Method publik baru `MultivariateAnalysis::get_simultaneous_ci(&mut self) -> Result<JsValue, JsValue>` (diekspor wasm-bindgen; glue `pkg/wasm.js`/`wasm.d.ts` bertambah satu method) | CI dihitung sesuai permintaan dari data yang sudah disimpan objek (setelah listwise), sesudah `get_formatted_results()`. Galat masuk error collector (konteks `calculate_simultaneous_ci`) dan method mengembalikan `null`. |
| `rust/src/models/result.rs` | Struct baru `SimultaneousConfidenceIntervals` (design, confidence_level, p, sample_sizes, factor, levels, t2_critical, t2_reference, t2_df, bonferroni_reference, intervals) | Hasil method di atas: metode, tingkat kepercayaan, nilai kritis T², derajat bebas. |
| `rust/src/models/result.rs` | Struct baru `SimultaneousInterval` (dependent_variable, estimate, std_error, t2_lower, t2_upper, bonferroni_critical, bonferroni_df, bonferroni_lower, bonferroni_upper) | Satu baris per DV atau per pasangan. Nilai kritis dan df Bonferroni ada per baris, karena pada Σ₁ ≠ Σ₂ tiap variabel punya df Welch sendiri. |

**Revisi v4 (sebelum push).**
- Field `bonferroni_critical`/`bonferroni_df` dipindah dari `SimultaneousConfidenceIntervals` ke `SimultaneousInterval`.
- Jumlah perubahan API tetap 3 (method + 2 struct baru); hanya daftar field yang berubah, dan `rust-api-allowed.json` diperbarui.
- `calculate_welch_two_sample_t2` (privat, `stats/multivariate_tests.rs`) kini menghitung Sig. dengan df pecahan. Fungsi publik `calculate_f_significance` tidak berubah.

**Fungsi privat baru di `rust/src/wasm/constructor.rs`** (tidak mengubah API):
- `calculate_simultaneous_ci`, yang memuat rumus J&W dan rujukan subbab (§5.4, §6.2, §6.3) di komentarnya;
- `krishnamoorthy_yu_nu`, dengan rumus ν yang sama dengan uji Welch (fungsi uji privat di modul `stats`);
- `polish_quantile`;
- `upper_quantile_f`, `quantile_t`.

**Mengapa bukan field baru di `MultivariateResult`.**
- **Rancangan pertama:** field `simultaneous_confidence_intervals` di `MultivariateResult` dan `OptionsConfig.simultaneous_ci`.
- **Masalahnya:** respons worker untuk mv1–mv8 dan mv4ph tidak lagi byte-identik dengan v3. Urutan kunci HashMap berubah, dan pada beberapa konfigurasi nilai berubah di tingkat pembulatan floating-point karena urutan penjumlahan ikut berubah.
- **Hasil bisection** (replay payload v3 ke WASM baru, instance baru per payload, `testing/fitur-v4/harness/replay-v3.mjs`):
  - field di `OptionsConfig` saja: tidak berpengaruh;
  - field di `MultivariateResult`: tetap berubah, **bahkan sebagai `Option<Box<…>>` yang selalu `None`**.
- **Penjelasan:** di wasm32, kunci hash `std::HashMap` bergantung pada alamat stack, dan ukuran struct hasil yang dibuat di konstruktor menggeser alamat itu.
- **Rancangan akhir:** method terpisah. Dengan ini respons 9 konfigurasi validasi dan 4 sel eksperimen MV kembali byte-identik dengan v3.

## 2. Perubahan frontend

| Berkas | Perubahan | Fitur |
|---|---|---|
| `types/multivariate.ts` | `MultivariateMainType.TwoSampleTestValues?: number[] \| null`; `MultivariateOptionsType.SimultaneousCI?: boolean`; props baru `MultivariateTwoSampleDeltaProps`; `MultivariateDialogProps.setIsTwoSampleDeltaOpen` | 1, 2 |
| `dialogs/two-sample-delta.tsx` (baru) | Subdialog "Test Values (δ₀) — Hotelling T² Dua Populasi": satu isian per DV, bawaan 0, tombol Continue/Cancel/Reset to 0, jumlah isian mengikuti DV, arah H₀ ditampilkan | 1 |
| `dialogs/dialog.tsx` | Tombol "Test Values (δ₀)" dan ringkasan δ₀ di panel Covariance Matrices (hanya tampil bila Fixed Factor tepat satu); δ₀ di-reset bila Fixed Factor(s) diubah | 1 |
| `dialogs/multivariate-main.tsx` | State dan bagian `twoSampleDelta`; penyesuaian panjang δ₀ saat OK | 1 |
| `services/two-sample-delta.ts` (baru) | `factorLevels`, `compareLevels` (urutan level seperti tabel keluaran), `shiftFirstLevel` (geser level pertama sebesar δ₀), `restoreDescriptiveStatistics` | 1 |
| `services/multivariate-analysis.ts` | Pergeseran data sebelum WASM bila δ₀ ≠ 0; `TwoSampleTestValues` tidak dikirim ke Rust; Descriptive Statistics dikembalikan ke data asli; `SimultaneousCI` hanya dikirim bila dicentang; jalur main-thread memanggil `get_simultaneous_ci()` bila diminta | 1, 2 |
| `services/multivariate-analysis-worker.ts` | Worker memanggil `get_simultaneous_ci()` sesudah `get_formatted_results()` bila `SimultaneousCI` ada di payload, dan menaruh hasilnya di `results.simultaneous_confidence_intervals`; bentuk respons tetap | 2 |
| `services/multivariate-analysis-formatter.ts` | Catatan H₀ dan δ₀ pada Multivariate Tests dan catatan "data geser" pada tabel yang terpengaruh (`annotateTwoSampleDelta`); catatan H₀ berpasangan bila δ₀ ≠ 0; tabel baru "Simultaneous Confidence Intervals" (`formatSimultaneousCI`) | 1, 2 |
| `services/multivariate-analysis-output.ts` | Tabel CI simultan disimpan sebagai analytic sendiri, sesudah Multivariate Tests | 2 |
| `dialogs/options.tsx` | Checkbox "Simultaneous CI (T² & Bonferroni)" (`SimultaneousCI`, bawaan tidak dicentang); validasi Significance Level di rentang (0, 1) bila dicentang | 2 |

**δ₀ berpasangan tidak butuh perubahan kode baru.** Bagian C dialog Paired sudah ada sejak v3. v4 hanya menambah kalimat H₀ di catatan tabel bila δ₀ ≠ 0.

## 3. Dampak ke diagram naskah (BAB IV)

**Class diagram 4.8.2 (dua populasi):**
- tambah `MultivariateTwoSampleDelta` (dialog) dan `TwoSampleDeltaService` (`services/two-sample-delta.ts`);
- field `TwoSampleTestValues` di `MultivariateMainType`;
- relasi service → formatter (`twoSampleDelta`).

**Sequence Eksekusi 4.8.2:** sebelum WASM ada langkah TypeScript "geser level pertama sebesar δ₀" (pola yang sama dengan transformasi selisih di 4.8.3). Setelah WASM ada langkah "kembalikan Descriptive Statistics ke data asli".

**Class diagram 4.8.1, 4.8.2, 4.8.3:**
- field `SimultaneousCI` di `MultivariateOptionsType`;
- method `get_simultaneous_ci()` di kelas WASM `MultivariateAnalysis`, dengan struct hasil `SimultaneousConfidenceIntervals` dan `SimultaneousInterval`.

**Sequence Pemformatan 4.8.1–4.8.3:** blok opsional "Simultaneous Confidence Intervals", ditampilkan bila opsi dicentang.

**4.9 (Rust-Wasm) MV:** `run_analysis` tidak berubah. Setelah `get_formatted_results()`, worker memanggil `get_simultaneous_ci()` (yang menjalankan `calculate_simultaneous_ci`) bila opsi dicentang, lalu `get_all_errors()`.

**Tabel 5 / kebutuhan fungsional:** kedua fitur belum ada di Tabel 5. Perlu keputusan penulis apakah ditambahkan sebagai kebutuhan baru atau diperluas ke KF2–KF4.
