# Architecture — GLM Multivariate

Analisis General Linear Model (GLM) Multivariate: menguji pengaruh satu atau lebih faktor kategorik dan kovariat terhadap beberapa variabel dependen secara bersamaan. Target output numerik identik dengan SPSS.

---

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| UI | React 18, TypeScript, Next.js 15 (App Router) |
| Komponen UI | shadcn/ui (`Dialog`, `ResizablePanelGroup`, `Badge`, `Button`, `ScrollArea`) |
| State management | Zustand (`useResultStore`, `useVariableStore`, `useDataStore`) |
| Persistensi | IndexedDB via hook `useIndexedDB` (key: `"Multivariate"`) |
| Komputasi statistik | Rust → WebAssembly (`wasm-pack --target web`) |

---

## Struktur Folder

```
multivariate/
├── constants/          # Konfigurasi default & konstanta UI
├── dialogs/            # Komponen dialog (sub-panel)
│   ├── dialog.tsx              # Dialog utama: VariableListManager + sidebar tombol + radio VarianceMode
│   ├── multivariate-main.tsx   # Orkestrasi state seluruh sub-dialog (IndexedDB load/save)
│   ├── bootstrap.tsx           # Sub-dialog Bootstrap
│   ├── contrast.tsx            # Sub-dialog Contrast
│   ├── emmeans.tsx             # Sub-dialog Estimated Marginal Means
│   ├── model.tsx               # Sub-dialog Model
│   ├── options.tsx             # Sub-dialog Options
│   ├── paired.tsx              # Sub-dialog Paired (Hotelling T² Berpasangan): pasangan variabel + δ₀ + preview
│   ├── plots.tsx               # Sub-dialog Plots
│   ├── posthoc.tsx             # Sub-dialog Post Hoc
│   ├── save.tsx                # Sub-dialog Save
│   └── test-values.tsx         # Sub-dialog Test Values (μ₀ Hotelling T² Satu Populasi)
├── hooks/              # Custom React hooks
├── rust/               # Crate Rust/WASM (engine komputasi)
│   └── src/
│       ├── lib.rs              # Entry point #[wasm_bindgen]
│       ├── models/             # Struct data: config.rs, data.rs, result.rs
│       ├── stats/              # Modul-modul statistik (lihat di bawah)
│       ├── utils/              # converter.rs, error.rs, log.rs
│       ├── wasm/               # constructor.rs, function.rs (JS API)
│       └── test/               # Unit test & validation data
├── services/           # Orkestrasi WASM dari sisi JS/TS
│   ├── multivariate-analysis.ts           # Inisialisasi & run WASM; intercepts PairedMode
│   ├── multivariate-analysis-formatter.ts # Transform result → tabel HTML
│   ├── multivariate-analysis-output.ts    # Render output ke resultStore
│   └── paired-difference.ts               # Sintesis kolom d_k = v1_k − v2_k; preview tabel
├── types/              # TypeScript type definitions
└── __test__/           # Integration / snapshot tests
```

---

## Alur Analisis (Data Flow)

```
Data spreadsheet (useDataStore)
        │
        ▼
multivariate-analysis.ts
  ┌─ if PairedMode active ──────────────────────────────────────────────────────┐
  │  buildDifferenceData(dataRows, variables, pairs)                            │
  │    → slicedData berupa kolom d_k = v1_k − v2_k per pasangan                │
  │    → effectiveConfig.main.DepVar = diffNames                                │
  │    → effectiveConfig.main.TestValues = δ₀ (atau zeros)                     │
  │    → FixFactor/Covar/WlsWeight dikosongkan                                 │
  └─ else ──────────────────────────────────────────────────────────────────────┘
  getSlicedData() → menyiapkan AnalysisData (subject rows)
  PairedMode & VarianceMode=null di-strip sebelum crossing WASM boundary
  new MultivariateAnalysis(data, config, ...)
        │
        ▼
Rust/WASM — run_analysis()
  ├── calculate_descriptive_statistics()   [jika options.desc_stats]
  ├── calculate_bartlett_test()            [jika options.homogen_test]
  ├── calculate_box_m_test()
  ├── calculate_multivariate_tests()       — Pillai, Wilks, Hotelling, Roy
  │                                          + Hotelling T² Satu Populasi
  │                                          jika config.main.TestValues ≠ null
  │                                          + Hotelling T² Dua Populasi
  │                                          (Welch-Satterthwaite) jika
  │                                          VarianceMode == Welch + 1 faktor
  │                                          dengan 2 level
  ├── calculate_between_subjects_effects() — ANOVA tabel F
  ├── calculate_levene_test()
  ├── calculate_univariate_tests()
  ├── calculate_parameter_estimates()      [jika options.param_est]
  ├── calculate_estimable_function()       [jika options.general_fun]
  ├── calculate_sscp_matrix()              [jika options.sscp_mat]
  ├── calculate_between_subjects_sscp()
  ├── calculate_residual_sscp_matrix()     [jika options.res_sscp_mat]
  ├── calculate_posthoc_tests()            [jika posthoc dikonfigurasi]
  ├── calculate_emmeans()                  [jika emmeans dikonfigurasi]
  └── calculate_bootstrap()               [jika bootstrap diaktifkan]
        │
        ▼
multivariate-analysis-formatter.ts
  transformMultivariateResult() → memetakan JsValue ke tabel output
  pairedMode context → relabel kolom T² dan baris "Intercept" → "Hotelling T² Berpasangan"
        │
        ▼
multivariate-analysis-output.ts
  resultMultivariate() → push ke useResultStore (tab output)
```

---

## Modul Statistik Rust

| Modul | Fungsi |
|---|---|
| `core.rs` | Pengurai faktor, pembangun matriks desain X, kalkulasi SS |
| `multivariate_tests.rs` | Pillai's trace, Wilks' lambda, Hotelling-Lawley trace, Roy's largest root, **Hotelling T² Satu Populasi** (Intercept H = n·(x̄−μ₀)(x̄−μ₀)ᵀ saat `test_values` di-set), **Hotelling T² Dua Populasi Welch-Satterthwaite** (Krishnamoorthy-Yu df) saat `variance_mode = Welch` + 1 faktor 2-level |
| `between_subjects_effects.rs` | SS/MS/F untuk setiap efek antar-subjek |
| `univariate_tests.rs` | F-test univariat per variabel dependen |
| `descriptive_statistics.rs` | Mean, SD, N per sel |
| `bartlett_test.rs` | Uji homogenitas varians Bartlett |
| `box_m_test.rs` | Uji homogenitas matriks kovarians Box's M — menggunakan helper `compute_per_group_covariances` di `common.rs` |
| `levene_test.rs` | Uji Levene |
| `parameter_estimates.rs` | Koefisien regresi, SE, t, CI |
| `estimable_function.rs` | General estimable function (L matriks) |
| `contrast_coefficients.rs` | Matriks kontras antar level faktor |
| `sscp_matrix.rs` | Sum of Squares & Cross Products (hipotesis) |
| `between_subjects_sscp.rs` | SSCP antar-subjek |
| `residual_sscp_matrix.rs` | SSCP residual (error) |
| `emmeans.rs` | Estimated Marginal Means + CI |
| `posthoc.rs` | Post-hoc pairwise tests |
| `bootstrap.rs` | Bootstrap sampling (rand_mt Mersenne Twister) |
| `homogeneous_subsets.rs` | Pengelompokan subset homogen |
| `generate_plots.rs` | Data titik untuk profile plots |
| `residual_plots.rs` | Data residual plot |
| `spread_vs_level.rs` | Spread-vs-level diagnostics |
| `save.rs` | Perhitungan nilai tersimpan (predicted, residual) |
| `summary_processing.rs` | Agregasi ringkasan hasil |
| `common.rs` | Fungsi utilitas bersama (invers matriks, LU, dll.) — termasuk `GroupCovariance` struct + `compute_per_group_covariances()` yang menghasilkan (S_i, x̄_i, n_i) per kombinasi level, dipakai oleh Box's M dan Welch T² |

---

## Dependensi Rust (Cargo.toml)

| Crate | Versi | Kegunaan |
|---|---|---|
| `wasm-bindgen` | 0.2 | Bridge JS ↔ Rust |
| `serde` + `serde-wasm-bindgen` | 1.0 / 0.6 | Serialisasi struct → JsValue |
| `serde_json` | 1.0 | JSON parsing/serializing |
| `nalgebra` | 0.33.2 | Aljabar matriks (invers, dekomposisi LU/QR/EVD) |
| `statrs` | 0.18.0 | Distribusi statistik (F, χ², t, Beta, dll.) |
| `ndarray` | 0.16.1 | Array N-dimensi pendukung |
| `itertools` | 0.14.0 | Iterator utilities |
| `rayon` | 1.10.0 | Paralelisme data (multi-core via wasm-bindgen-rayon) |
| `rand` + `rand_mt` | 0.8 / 5.0 | RNG untuk bootstrap (Mersenne Twister) |
| `getrandom` | 0.2.15 | Entropy seed di lingkungan WASM (feature `js`) |
| `js-sys` | 0.3 | Tipe JS dasar dari Rust |
| `web-sys` | 0.3 | `console.log` dari Rust |

---

## Fitur Hotelling T² Satu Populasi

Sub-dialog **Test Values** memparameterisasi efek Intercept MANOVA menjadi uji Hotelling T² satu populasi terhadap vektor hipotesis μ₀.

### Statistik
```
T² = n · (x̄ − μ₀)ᵀ S⁻¹ (x̄ − μ₀)
F  = ((n − p) / (p(n − 1))) · T²   ~   F(p, n − p)
```

### Identitas Matematis
Secara internal merupakan uji Intercept MANOVA dengan H diparameterisasi:
```
H = n · (x̄ − μ₀)(x̄ − μ₀)ᵀ
```
Default (`TestValues = null`) → μ₀ = 0 → kembali ke perilaku Intercept lama, sehingga 100% backward-compatible.

### Alur Aktivasi
```
User mengisi μ₀ di sub-dialog Test Values
        │
        ▼
formData.main.TestValues = number[] | null  (disimpan di IndexedDB)
        │
        ▼ executeMultivariate()
Auto-resize length TestValues agar = DepVar.length (pad 0 / truncate)
        │
        ▼ serde_wasm_bindgen
Rust: config.main.test_values: Option<Vec<f64>>
        │
        ▼ constructor.rs validasi
Panjang ≡ DepVar.length, tidak ada NaN
        │
        ▼ multivariate_tests.rs cabang Intercept
centered = grand_means − μ₀
H = n · centered · centeredᵀ
HE⁻¹ → eigenvalue → hotelling_trace = T²/(n − 1)
        │
        ▼ formatter
Label "Intercept" → "Hotelling T² (vs μ₀)"
Kolom T² = hotelling_trace · (n − 1) hanya pada baris Hotelling's Trace
```

### Persistensi
- IndexedDB key `"Multivariate"` — field `main.TestValues` di-hydrate dengan default `null` untuk state lama (`formDataWithoutId.main?.TestValues ?? null`).

### Validasi (APG Modul 3, dataset mtcars, μ₀=[20,200,150,3])
| Metrik | Expected | Computed |
|---|---|---|
| T² | 10.78587 | 10.78587 |
| F | 2.4355 | 2.4355 |
| df(p, n−p) | (4, 28) | (4, 28) |
| Sig. | 0.07058 | 0.07058 |

Test: [`rust/src/test/multivariate_validation.rs`](rust/src/test/multivariate_validation.rs) — `hotelling_t2_one_population_mtcars_matches_apg_modul_3`, `hotelling_t2_with_zero_mu0_matches_default_intercept`, `hotelling_t2_length_mismatch_returns_error`.

---

## Fitur Hotelling T² Dua Populasi Independen

Toggle **Covariance Matrices** di dialog utama menyediakan dua mode uji dua sampel dengan H₀: μ₁ = μ₂.

### Mode Pooled (default — Σ₁ = Σ₂)

Berlaku otomatis melalui pipeline MANOVA generik untuk **setiap faktor 2-level**. Tidak butuh flag — pipeline existing menghitung pooled SSCP across-level via cabang "Main effect" di `multivariate_tests.rs`.

```
T² = (n₁n₂/(n₁+n₂)) · (x̄₁ − x̄₂)ᵀ Sp⁻¹ (x̄₁ − x̄₂)
F  = ((n₁+n₂−p−1)/(p(n₁+n₂−2))) · T²   ~   F(p, n₁+n₂−p−1)
```

### Mode Welch-Satterthwaite (Σ₁ ≠ Σ₂)

Aktif hanya saat `VarianceMode = Welch` **DAN** 1 Fixed Factor dengan tepat 2 level. Menggunakan formula Krishnamoorthy-Yu (2004):

```
V       = S₁/n₁ + S₂/n₂
d       = x̄₁ − x̄₂
T²      = dᵀ V⁻¹ d
1/ν     = Σ_{i=1,2} [1/(nᵢ−1)] · {tr((VᵢV⁻¹)²) + tr(VᵢV⁻¹)²} / (p²+p)
F       = ((ν − p + 1)/(pν)) · T²   ~   F(p, ν − p + 1)
```

### Alur Aktivasi
```
UI dialog.tsx (radio Equal/Unequal, hanya muncul saat fixFactor.length === 1)
        │ auto-reset ke null saat count ≠ 1
        ▼
formData.main.VarianceMode = "Pooled" | "Welch" | null
        │ (disimpan di IndexedDB key "Multivariate")
        ▼ serde_wasm_bindgen
Rust: config.main.variance_mode: VarianceMode (default Pooled)
        │
        ▼ multivariate_tests.rs setelah dispatcher generik
deteksi variance_mode == Welch && factors.len() == 1 && levels == 2
        │ jika syarat tak terpenuhi → Err dengan pesan explicit
        ▼
calculate_welch_two_sample_t2(data, config, factor)
  → compute_per_group_covariances() (helper di common.rs)
  → V, d, T², ν Krishnamoorthy-Yu, F
        │
        ▼ override entry faktor di effects HashMap
MultivariateTestEntry { value: T², f, hypothesis_df: p, error_df: ν−p+1, ... }
        │ (hanya Hotelling's Trace — Pillai/Wilks/Roy tidak emit di mode Welch)
        ▼ formatter
Label "{factor}" → "{factor} — Welch-Satterthwaite"
Kolom T² (= entry.value langsung)
Note: "Computed using Welch-Satterthwaite approximation for unequal covariance matrices."
df2 menampilkan ν pecahan
```

### Refactor Helper

`box_m_test.rs` dan Welch sama-sama butuh (S_i, n_i) per grup. Untuk eliminasi duplikasi, helper publik di `common.rs`:

```rust
pub struct GroupCovariance {
    pub label: HashMap<String, String>,
    pub covariance: DMatrix<f64>,
    pub mean: DVector<f64>,
    pub n: usize,
}

pub fn compute_per_group_covariances(
    data: &AnalysisData,
    config: &MultivariateConfig,
    factors: &[String],
) -> Result<Vec<GroupCovariance>, String>;
```

Memakai `merge_records()` sebagai data source dan menyaring grup dengan `n > p`. Box's M memanggil dengan seluruh `fix_factor`, Welch memanggil dengan satu faktor target.

### Validasi (3 unit test baru)

| Test | Verifikasi |
|---|---|
| `hotelling_t2_two_sample_pooled_matches_manual` | Pipeline pooled = T² manual `(n₁n₂/(n₁+n₂))·dᵀSp⁻¹d` (tol 1e-6) |
| `hotelling_t2_two_sample_welch_matches_manual_krishnamoorthy_yu` | T², F, ν Welch = komputasi manual (tol 1e-6); hanya 1 statistik emit |
| `welch_mode_requires_exactly_two_groups_returns_error` | Welch + 3-level factor → Err dengan pesan "two levels" |

Existing Box's M tests (dataset_a/b/c) tetap pass setelah refactor — output numerik identik.

### Persistensi
- IndexedDB key `"Multivariate"` — field `main.VarianceMode` di-hydrate dengan default `null` (`formDataWithoutId.main?.VarianceMode ?? null`).
- UI auto-reset VarianceMode ke `null` saat factor count berubah ≠ 1, mencegah leak Welch state ke design multi-faktor atau no-factor.

---

## Fitur Hotelling T² Berpasangan (Paired)

Sub-dialog **Paired** mengaktifkan uji Hotelling T² untuk dua pengukuran berulang pada subjek yang sama (repeated measurements / matched pairs multivariate). Tidak memerlukan perubahan Rust — seluruh logik diimplementasikan di TypeScript dengan merouting data melalui pipeline Test Values existing.

### Statistik
```
d_k = v1_k − v2_k  (per baris, per pasangan)
T² = n · (d̄ − δ₀)ᵀ Sd⁻¹ (d̄ − δ₀)
F  = ((n − p) / (p(n − 1))) · T²   ~   F(p, n − p)
```
di mana `p` = jumlah pasangan (dimensi vektor selisih), `n` = jumlah baris lengkap.

### Implementasi: "Zero-Rust" Approach
Paired mode tidak menambahkan kode Rust baru. Alih-alih, `paired-difference.ts` men-sintesis kolom virtual `d_k = v1_k − v2_k` dan kemudian `multivariate-analysis.ts` mengirimkan kolom-kolom tersebut ke WASM seolah-olah merupakan DepVar biasa dengan `TestValues = δ₀`. Pipeline Intercept MANOVA existing (H = n·(d̄−δ₀)(d̄−δ₀)ᵀ) menangani sisanya.

### Alur Aktivasi
```
User membuka sub-dialog Paired → pilih pasangan (V1, V2) + input δ₀
        │
        ▼
PairedModeType = { pairs: [string, string][], delta0: number[] | null }
disimpan di formData.main.PairedMode (IndexedDB key "Multivariate")
        │
        ▼ executeMultivariate() → analyzeMultivariate()
paired-difference.ts: buildDifferenceData(dataRows, variables, pairs)
  → kolom d_k row-wise; missing jika salah satu sisi null
  → varDefs sintetis: name="d_v1_minus_v2", label="v1 − v2"
        │
        ▼
effectiveConfig override:
  DepVar   ← diffNames
  TestValues ← δ₀ (atau zeros jika delta0 = null)
  FixFactor / Covar / WlsWeight ← dikosongkan
        │
        ▼ strip PairedMode & normalise VarianceMode sebelum WASM boundary
Rust: Intercept H = n·(d̄−δ₀)(d̄−δ₀)ᵀ  (cabang yang sama dengan T² Satu Populasi)
        │
        ▼ formatter pairedMode context
Label "Intercept" → "Hotelling T² Berpasangan"
Baris Hotelling's Trace: tampil kolom T², F, df, Sig.
Note: daftar pasangan (v1 − v2) ditampilkan di header tabel
```

### Sub-dialog Paired (paired.tsx)
Dialog dengan tiga bagian:
1. **A — Pemilihan Pasangan Variabel**: `PairedVariablesTab` (komponen bersama `/Common/PairedVariablesTab.tsx`) untuk memasangkan V1 ↔ V2 dengan dukungan reorder, swap, remove.
2. **B — Preview Vektor Selisih**: tabel 10 baris pertama kolom d_k = V1−V2 dari data aktual, dirender secara live saat pasangan berubah (`computeDifferencePreview`).
3. **C — Nilai Selisih Hipotesis (δ₀)**: input numerik per pasangan; default 0 (H₀: tidak ada perbedaan).

Tombol **Disable Paired Mode** (`onSave(null)`) menghapus konfigurasi paired sepenuhnya tanpa menutup dialog utama.

### Guard Validasi
- `handleContinue` di `dialog.tsx` memeriksa `PairedMode?.pairs?.length > 0` — jika paired aktif, persyaratan `DepVar ≥ 2` dan `FixFactor/Covar ≥ 1` di-bypass karena paired menyediakan vektor dependen sendiri.
- `buildDifferenceData` melempar error jika: pasangan kosong, pair incomplete (salah satu nama kosong), v1 === v2, atau variabel tidak ditemukan di dataset.
- `computeDifferencePreview` menggunakan validasi lunak (skip pair invalid) agar preview dapat ditampilkan selama user masih memilih variabel.

### Shared Component
`/frontend/components/Common/PairedVariablesTab.tsx` — diekstrak dari PairedSamplesTTest. Diterima `idPrefix` prop sehingga DOM id dapat diparameterisasi; default `"paired-samples-t-test"` menjaga backward compat dengan test PairedSamplesTTest.

### Persistensi
- IndexedDB key `"Multivariate"` — field `main.PairedMode` di-hydrate dengan `formDataWithoutId.main?.PairedMode ?? null`.
- `PairedMode` di-strip dari payload sebelum melewati WASM boundary (Rust tidak mengenal field ini).

---

## Pola Arsitektur Utama

- **WASM class pattern**: Semua state analisis disimpan dalam satu struct `MultivariateAnalysis` yang di-expose ke JS sebagai `#[wasm_bindgen]` class (constructor + method chaining).
- **Error collector**: Kegagalan pada satu langkah analisis dikumpulkan di `ErrorCollector` tanpa menghentikan langkah lain — ditampilkan sebagai tabel "Errors Logs" di output.
- **Lazy step execution**: Setiap langkah komputasi bersyarat pada flag opsi (desc_stats, homogen_test, param_est, dll.) dari konfigurasi yang dikirim JS.
- **Serialize maps as objects**: `serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true)` agar `HashMap` Rust terbaca sebagai plain JS object, bukan `Map`.
- **ResizablePanelGroup**: Layout dialog utama menggunakan panel kiri (variabel input) dan panel kanan (pengaturan) yang dapat digeser.
- **Optional config field pattern**: Field opsional di `MainConfig` (mis. `test_values: Option<Vec<f64>>`) di-mark `#[serde(default)]` agar state JSON lama tanpa field tersebut tetap dapat dideserialisasi (`None`) — pola yang aman untuk evolusi schema.
- **Enum with `#[derive(Default)]`**: Enum config seperti `VarianceMode { Pooled (default), Welch }` dipadu `#[serde(default)]` di field-nya memberi backward compat tanpa boilerplate — state lama otomatis dideserialisasi sebagai variant default.
- **Branch-and-override pattern**: Cabang khusus (Welch) di akhir `calculate_multivariate_tests` tidak menggantikan dispatcher generik — ia hanya menimpa entry tertentu di `effects` HashMap setelah pipeline normal selesai. Memudahkan reuse machinery existing + isolasi blast radius.
- **Shared per-group helper**: Logika "kumpulkan rows per kombinasi level → hitung S_i, x̄_i, n_i" dipakai oleh ≥ 2 tempat (Box's M, Welch T²) → diekstrak ke `common.rs` sebagai `compute_per_group_covariances` untuk eliminasi duplikasi.
- **Zero-Rust extension pattern**: Fitur baru yang secara matematika setara dengan fitur existing dapat diimplementasikan seluruhnya di TS dengan mentransformasi input sebelum melewati WASM boundary — seperti Paired T² yang merouting melalui pipeline Test Values tanpa menambah kode Rust. Biaya: overhead baris invalid (null diff) di data sintetis; manfaat: zero Rust churn.
