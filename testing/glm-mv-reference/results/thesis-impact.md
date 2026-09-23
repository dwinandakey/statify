# Perubahan kode GLM Multivariate untuk naskah: baseline `82a63b45` → branch `validation/mv-spss`

Isi dokumen:
- **Sumber:** daftar faktual perbedaan kode dari `git diff 82a63b45 HEAD` dan dua skrip:
  - `harness/rust_api.py`: inventaris API publik crate Rust (fungsi pub, struct/enum beserta field, method) dan fungsi privat;
  - `harness/fn_changes.py`: daftar fungsi yang ditambah, dihapus, atau isinya berubah (Rust dan `services/*.ts`).
- **Path:** relatif terhadap `frontend/components/Modals/Analyze/general-linear-model/multivariate/`, kecuali disebut lain.
- **Aturan yang berlaku selama perbaikan:**
  - tidak ada fungsi pub, struct, field, enum, atau method publik yang ditambah atau dihapus;
  - tidak ada signature yang berubah;
  - fungsi pembantu baru dibuat privat di berkas yang memakainya.

  Sejak step 8e, `check-step.sh` menolak langkah yang melanggar aturan ini (`rust_api.py 82a63b45 WORKTREE`).

Cara mengulang:

```
python testing/glm-mv-reference/harness/rust_api.py 82a63b45 HEAD
python testing/glm-mv-reference/harness/fn_changes.py 82a63b45 HEAD
```

## a. Konfirmasi: API publik dan alur tidak berubah

| Ukuran | Baseline `82a63b45` | HEAD |
|---|---|---|
| Fungsi pub di `rust/src/stats/common.rs` | 34 | 34 (nama dan signature sama) |
| Fungsi pub di seluruh crate | 79 | 79 |
| Struct di `rust/src/models/result.rs` | 40 | 40 |
| Struct di seluruh crate | 58 | 58 |
| Enum di seluruh crate | 11 | 11 |
| Field `MultivariateResult` | 24 | 24 (nama dan tipe sama) |
| Method `MultivariateAnalysis` (pub) | 7: `new`, `get_results`, `get_formatted_results`, `get_executed_functions`, `get_all_errors`, `get_all_log`, `clear_errors` | 7, sama |
| Method publik di seluruh crate | 15 | 15 |
| Perubahan publik menurut `rust_api.py` | — | **0** (`public_changes: []`) |
| `rust/src/wasm/function.rs` (termasuk `run_analysis`) | — | **identik** (`git diff 82a63b45 -- rust/src/wasm/function.rs` kosong) |
| `rust/src/models/` (`config.rs`, `data.rs`, `result.rs`) | — | identik |
| Glue JS dan `.d.ts` WASM (`rust/pkg/wasm.js`, `wasm.d.ts`) | — | identik (dicek tiap langkah) |

**Alur `run_analysis` tidak berubah.** Urutan langkah, kondisinya, nama di `executed_functions`, dan fungsi `core::…` yang dipanggil sama dengan baseline.

Satu-satunya perubahan di jalur masuk ada **di `MultivariateAnalysis::new`** (`rust/src/wasm/constructor.rs`), sebelum `run_analysis` dipanggil:

1. Setelah validasi konfigurasi dan pembentukan `AnalysisData`, data dilewatkan ke fungsi privat baru `listwise_complete_cases`.
2. Bila ada kasus yang dibuang, `error_collector` mendapat entri konteks `listwise_deletion` ("N case(s) with missing values were excluded (listwise).").
3. Bila tidak ada kasus lengkap sama sekali, konstruktor mengembalikan error "No complete cases: every case has a missing value.".
4. Struct `MultivariateAnalysis` menyimpan data yang sudah difilter, lalu `run_analysis` dipanggil seperti semula.

Di luar modul Multivariate: tidak ada perubahan di `repeated-measures/`, `shared/` (termasuk `shared/glm-execution.ts`), `frontend/hooks/`, maupun kontrak pesan worker.

## b. Fungsi yang ditambah atau dihapus (semuanya privat)

| Berkas | Ditambah (privat) | Dihapus |
|---|---|---|
| `rust/src/stats/common.rs` | `noncentral_f_cdf` | — |
| `rust/src/stats/box_m_test.rs` | `f_upper_tail` | — |
| `rust/src/stats/between_subjects_effects.rs` | `effect_ss`, `deviation_coded_design`, `sse_without_columns`, `containing_effect_columns` | — |
| `rust/src/stats/multivariate_tests.rs` | `ss_type_label`, `effect_hypothesis_sscps`, `residual_sscp`, `deviation_coded_design`¹, `containing_effect_columns`¹ | `generate_level_combinations`² |
| `rust/src/stats/descriptive_statistics.rs` | `level_groups`, `sort_levels` | — |
| `rust/src/wasm/constructor.rs` | `listwise_complete_cases` | — |

¹ Salinan privat dari fungsi bernama sama di `between_subjects_effects.rs`. Salinan ini diperlukan karena pembantu di sana privat dan aturan melarang menambah `pub` (termasuk `pub(crate)`).

² Fungsi privat *bersarang* di dalam `calculate_hypothesis_error_matrices`. Fungsi ini ikut terhapus bersama cabang H interaksi lama (step 8c). `rust_api.py` tidak mendaftarnya karena bukan item tingkat atas.

Total fungsi privat tingkat atas baru: 14. Tidak ada deklarasi modul, berkas `.rs`, atau dependensi `Cargo.toml` baru.

## c. Fungsi yang isinya berubah (nama dan signature tetap)

| Berkas | Fungsi | Perubahan isi | Langkah |
|---|---|---|---|
| `rust/src/stats/common.rs` | `calculate_observed_power` (pub) | Power = 1 − F_nc(F_crit(1 − α; df1, df2); df1, df2, λ = F·df1) lewat `noncentral_f_cdf` (sebelumnya 1 − exp(−λ/2)) | 1 |
| | `build_design_matrix_and_response` (pub) | Level faktor dihitung sekali per build (map `factor_levels`), bukan per baris. Kolom dan nilai desain sama. | 8c |
| `rust/src/stats/multivariate_tests.rs` | `calculate_multivariate_tests` (pub) | H faktor dan interaksi dihitung sekali untuk semua suku (`effect_hypothesis_sscps`) dan diteruskan ke `calculate_hypothesis_error_matrices`; catatan desain memakai `ss_type_label` ("Type III sum of squares") | 5, 8c |
| | `calculate_hypothesis_error_matrices` (privat) | Cabang efek utama (Σ n_k(ȳ_k − ȳ)(ȳ_k − ȳ)ᵀ) dan cabang interaksi (deviasi sel − marginal) diganti H dari `effect_hypothesis_sscps` dan E = SSCP residual model penuh. Signature privat mendapat parameter `term_sscp`, dan parameter `factors_in_effect` dihapus. Cabang Intercept tidak berubah. | 8c |
| | `calculate_multivariate_test_statistics` (privat) | Partial eta² Hotelling's Trace = (T/s)/(T/s + 1); Observed Power keempat statistik lewat `calculate_observed_power` dengan α konfigurasi (sebelumnya 1 − 0,1/F) | 1, 2 |
| | `calculate_welch_two_sample_t2` (privat) | Observed Power = `calculate_observed_power(df1, df2, F, alpha)` dengan df dan F yang sama dengan Sig. entri, alpha = `config.options.sig_level.unwrap_or(0.05)` (sebelumnya 1 − 0,1/F, atau 0,5 bila F ≤ 1). Hanya dipakai pada mode Unequal (Welch). | 10 |
| `rust/src/stats/between_subjects_effects.rs` | `calculate_tests_between_subjects_effects` (pub) | α dari konfigurasi; SS Intercept dari desain berkode deviasi pada y − μ₀; entri `Total` = Σ(y − μ₀)², df = n; SS faktor dan interaksi lewat `effect_ss` (Type III/IV dari desain berkode deviasi) | 1, 4, 6, 8c |
| | `calculate_type_ii_ss` (pub) | Efek disesuaikan terhadap efek yang tidak memuatnya (`containing_effect_columns`, `sse_without_columns`) | 6 |
| | `calculate_type_iii_ss` (pub) | Hanya komentar (kode sama; pemanggil kini mengirim desain berkode deviasi) | 6 |
| `rust/src/stats/box_m_test.rs` | `calculate_box_test` (pub) | F = (1 − ρ₁ − f₁/f₂)·M/f₁ untuk semua kasus (cabang χ²/f₁ dihapus); Sig. dari F(f₁, f₂) tanpa membulatkan f₂ (`f_upper_tail`) | 3 |
| `rust/src/stats/levene_test.rs` | `calculate_levene_test` (pub) | df2 "Based on Median and with adjusted df" = (Σ uᵢ)²/Σ[uᵢ²/(nᵢ − 1)] (sebelumnya bentuk Welch dengan s²ᵢ/nᵢ) | 8d |
| `rust/src/stats/descriptive_statistics.rs` | `calculate_descriptive_statistics` (pub) | Semua faktor dipakai. Grup bertingkat lewat field `StatGroup.subgroups` yang sudah ada (level faktor pertama → level faktor kedua + Total …). Level diurutkan menaik seperti SPSS. Satu faktor: struktur sama (subgroups `None`). | 9 |
| `rust/src/wasm/constructor.rs` | `MultivariateAnalysis::new` (pub) | Listwise deletion sebelum `run_analysis` (lihat a) | 8b, 8e |
| `services/multivariate-analysis-formatter.ts` | `formatTestsBetweenSubjectsEffects` (privat) | Baris Total dari entri `Total` hasil Rust (sebelumnya SS Intercept + SS Corrected Total); baris dengan df = 0 mengosongkan Mean Square, F, Sig., Observed Power | 4, 5 |
| | `formatDescriptiveStatistics` (privat) | Satu kolom label per tingkat grup (`group_label`, `group_label_2`, …) bila ada subgroups. Tabel satu faktor tidak berubah. | 9 |

Tidak ada fungsi lain yang isinya berubah, baik di `rust/src/` maupun di `services/*.ts`. Menurut `fn_changes.py`, berkas lain di modul ini identik atau hanya berubah di luar fungsi (import).

## d. Perubahan perilaku yang terlihat pengguna

- Angka yang berubah menjadi sama dengan SPSS 27. Rinciannya di `results/spss-validation/README.md` §3–§4.
- **Errors Logs:** muncul entri `listwise_deletion` bila ada kasus yang dibuang.
- **Descriptive Statistics** untuk dua faktor atau lebih: tabel bertingkat (A × B dan marginal), bukan lagi hanya faktor pertama.
- **Desain rank-deficient:** Multivariate Tests kini memberi error inversi X'X seperti Tests of Between-Subjects Effects, bukan angka dari rumus lama.
- **Waktu analisis:** berubah karena jalur komputasi berubah (builder desain lebih cepat, H dari fit matriks). Eksperimen Web Worker sel Multivariate diulang (`result_compare.md` §12).
