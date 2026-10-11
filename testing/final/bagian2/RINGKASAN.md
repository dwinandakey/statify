# Bagian 2: pembanding SPSS 27 untuk sintaks yang tertunda

- **Sumber:** keluaran SPSS 27 yang dijalankan penulis dari `testing/SPSS-TODO.md` (2026-09-25):
  - `testing/glm-mv-reference/spss-output/mv9_tiga_dv_empat_level.xlsx`;
  - `testing/glm-mv-reference/spss-output/mv6_type_i_ii.xlsx` (dua GLM: SSTYPE(1) dan SSTYPE(2));
  - `testing/fitur-v4/spss-output/mv2_delta0.xlsx`;
  - `testing/fitur-v4/spss-output/mv3_delta0.xlsx`;
  - masing-masing dengan `.spv`.
- **Ekstraksi:** `testing/final/harness/spss_bagian2.py` → `spss-values-bagian2.json` (1086 nilai). Memakai `parse`/`cells` dari `spss_extract.py`. Berkas acuan regresi `spss-values.json` tidak disentuh.
- **Pembanding:** `testing/final/harness/compare-spss-bagian2.mjs`. Letak sel memakai `locate()`/`getPath()` dari `mapping.mjs` (sama dengan uji acuan SPSS). Nilai Statify diambil dari respons worker lewat dialog asli. Kriteria |Statify − SPSS| ≤ 0,001.

| SPSS | Konfigurasi Statify | Catatan pemetaan |
|---|---|---|
| mv9 | `mv9` | — |
| mv6 SSTYPE(1) / SSTYPE(2) | `mv6t1` / `mv6t2` (dialog Model → Sum of Squares Type I / Type II, Options: effect size, observed power) | Kolom "Type I/II Sum of Squares" = sel SS Statify |
| mv2_delta0 (data digeser di sintaks) | `mv2d` (δ₀ = 3, 2, 10, 1, Pooled) | Nilai mentah Statify dihitung dari data geser; Descriptive Statistics yang tampil dikembalikan ke data asli oleh service |
| mv3_delta0 (DV = d − δ₀) | `mv3d` (Paired, δ₀ = 8, 3) | Mean SPSS + δ₀ dibandingkan dengan Mean d Statify |

## Hasil sebelum perbaikan (build `LIBUcskLZhw3iEIArOeUX`)

1081 dari 1086 nilai cocok (`compare-spss-bagian2-sebelum-perbaikan.txt`). **Type I dan Type II mv6** (SS, termasuk Intercept = R(μ), dan Multivariate Tests) semuanya cocok. Status "menunggu SPSS" untuk SS Intercept Type II selesai.

**Temuan (5 nilai):**
1. **mv9, Wilks' Lambda, Noncent. Parameter dan Observed Power.**
   - Nilai: SPSS 48.6018 dan 0.99892; Statify 65.5915 dan 0.99997.
   - Statify memakai λ = F·df₁. SPSS memakai λ = df₂·η²/(1 − η²) dengan η² = 1 − Λ^(1/s) (kolom Partial Eta Squared).
   - Kedua rumus sama bila Rao t = s (p ≤ 2 atau df_h ≤ 2; semua data validasi sebelumnya). Pada mv9 (p = 3, df_h = 3), t = 2.43 ≠ s = 3.
2. **Observed Power saat F = 0.**
   - Terjadi pada mv2_delta0 x2 (Corrected Model, jk) dan mv3_delta0 Intercept d1, karena δ₀ tepat sama dengan selisih rata-rata.
   - SPSS 0.05 (= α, power pada λ = 0); Statify 0, karena `calculate_observed_power_df` mengembalikan 0 untuk F ≤ 0.

## Perbaikan (sesudah iterasi 3 black-box)

Hanya crate Rust MV yang diubah; API publik dan glue tidak berubah.
- **`stats/multivariate_tests.rs`:** blok Wilks mengembalikan Rao t. Bila t ≠ s, λ Wilks = df₂·η²/(1 − η²), dan Observed Power dihitung pada λ itu. Bila t = s, ekspresi lama (F·df₁) dipertahankan, sehingga bitnya tidak berubah.
- **`stats/common.rs`:** `calculate_observed_power_df` menerima F = 0, sehingga λ = 0 dan power = α.

**Replay payload v5 ke WASM baru** (`testing/final/iterasi4/replay-v5-payload.txt`): 15 dari 23 konfigurasi byte-identik. Perubahannya hanya:
- Observed Power baris F = 0 (0 → 0.05) pada mv2d, mv2dci, mv2s, mv2wd, mv2ws, mv3d, mv3dci, mv3s;
- Noncent. Parameter dan Observed Power Wilks mv9.

**Hasil sesudah perbaikan** (build `IdywReo5MTivt50HHa3VO`): **1086/1086 cocok** (`compare-spss-bagian2.txt`).
