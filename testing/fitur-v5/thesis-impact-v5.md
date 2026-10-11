# Dampak v5 ke naskah skripsi (API, diagram, teks)

- **Dasar:** `skripsi-final-v4` (`d2545117`) + commit dokumen `0137236d`, `397e5e55`.
- **Pengerjaan:** worktree `../statify-v5` (HEAD terlepas, tanpa branch).
- **Path:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/`.

## 1. Perubahan API publik Rust (crate MV)

Diperiksa dengan `testing/glm-mv-reference/harness/rust_api.py` terhadap `82a63b45`. Daftar lengkap yang disetujui ada di `testing/fitur-v5/rust-api-allowed.json`: 3 item v4 dan 2 item v5.

| Berkas | Perubahan v5 | Alasan |
|---|---|---|
| `multivariate/rust/src/stats/common.rs` | Fungsi publik baru `calculate_f_significance_df(df1: f64, df2: f64, f_value: f64) -> f64` | Sig. dengan df pecahan (B1: Wilks' Lambda Rao, uji Welch) |
| `multivariate/rust/src/stats/common.rs` | Fungsi publik baru `calculate_observed_power_df(d1: f64, d2: f64, f_value: f64, alpha: f64) -> f64`; `calculate_observed_power` (usize) mendelegasikan ke fungsi ini | Observed Power dengan df pecahan (B1). Untuk df bulat hasilnya identik bit. |

**Tetap sama:**
- `MultivariateResult`, `OptionsConfig`, struct hasil, dan method WASM, sehingga glue `pkg/wasm.js` dan `wasm.d.ts` identik dengan v4.
- Crate RM.

**Fungsi privat baru:** `test_df` (`stats/multivariate_tests.rs`).

**Catatan teknis (B3).** Versi pertama pemeriksaan sel kosong Type IV ada di konstruktor Rust dan hanya dijalankan bila Type IV dipilih. Meski begitu, kode tambahan itu mengubah urutan kunci `HashMap` wasm32 dan beberapa nilai floating-point di jalur lama (replay mv2 dan mv4–mv7 tidak identik), dengan mekanisme yang sama seperti temuan v4 (`testing/fitur-v4/thesis-impact-v4.md` §1). Pemeriksaan itu dipindah ke TypeScript.

**Build WASM di worktree.** `Cargo.lock` di-gitignore. Di worktree, crate me-resolve wasm-bindgen 0.2.128, sehingga glue berbeda dari build repo utama (0.2.118). `Cargo.lock` repo utama (MV dan RM) disalin ke worktree, dan hasilnya glue identik dengan v4. Ini perlu diingat bila repo dikloning ulang.

## 2. Perubahan frontend

| Berkas | Perubahan | Butir |
|---|---|---|
| `shared/error-message.ts` (baru) | `errorMessage(err)`: `err.message` untuk `Error`, selain itu `String(err)` | A1 |
| `multivariate/dialogs/multivariate-main.tsx`, `repeated-measures/dialogs/repeated-measures-main.tsx` | Toast galat memakai `errorMessage` | A1 |
| `multivariate/services/multivariate-analysis-worker.ts`, `repeated-measures/services/repeated-measures-analysis-worker.ts`, `shared/glm-execution.ts` | Respons galat worker memakai `errorMessage` (respons sukses tidak berubah) | A1 |
| `frontend/hooks/useFormatter.ts` | Helper baru `formatGlmStat`, `formatGlmNumber`, `formatGlmSig`. `formatDisplayNumber` untuk modul lain tidak berubah. | A2 |
| `multivariate/services/multivariate-analysis-formatter.ts` | Jumlah desimal tetap (A2); `effectSizePower` → `applyEffectSizePowerColumns` (A3); `addSpssFootnotes` (A4) | A2–A4 |
| `repeated-measures/services/repeated-measures-analysis-formatter.ts` | 4 desimal (sebelumnya 3), df memakai `dfFmt` (A2); parameter `effectSizePower` (A3); `applyRmFootnotes` (A4) | A2–A4 |
| `shared/effect-size-columns.ts` (baru) + tes | Kolom Partial Eta Squared / Noncent. Parameter / Observed Power hanya bila opsinya dicentang | A3 |
| `shared/spss-footnotes.ts` (baru) | Catatan kaki gaya SPSS (teks dari keluaran SPSS 27 di repo) | A4 |
| `multivariate/services/multivariate-analysis.ts`, `repeated-measures/services/repeated-measures-analysis.ts` | Meneruskan opsi `EstEffectSize`/`ObsPower` ke formatter (A3); pemeriksaan sel kosong Type IV (B3, MV) | A3, B3 |
| `multivariate/services/empty-cells.ts` (baru) + tes | `emptyFactorCells`, `typeIvEmptyCellsMessage` | B3 |
| `repeated-measures/dialogs/model.tsx` | Sum of Squares RM hanya Type III (lainnya dinonaktifkan) + keterangan | B4 |

## 3. Dampak ke diagram dan teks naskah

**Sequence Pemformatan MV/RM (4.8.x):** tambah langkah pascaproses sesudah pemformatan tabel:
- catatan kaki SPSS;
- penyaringan kolom effect size/power menurut Options.

**Class diagram MV/RM:**
- modul utilitas `shared/effect-size-columns`, `shared/spss-footnotes`, dan `shared/error-message`;
- helper format GLM di `useFormatter`.

**Sequence Eksekusi MV:** sebelum WASM ada langkah TypeScript "periksa sel kosong bila Type IV" (pola yang sama dengan pemeriksaan level δ₀).

**Rust MV:**
- `calculate_multivariate_test_statistics` memakai df pecahan untuk Sig. dan Observed Power;
- SS/SSCP Intercept Type I dan II = R(μ).

**Tabel kebutuhan/teks Bab IV:** Sum of Squares RM hanya Type III, dan Type IV MV ditolak bila ada sel kosong.
