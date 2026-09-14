# Architecture — GLM Repeated Measures

Analisis General Linear Model (GLM) Repeated Measures (pengukuran berulang): menguji efek within-subjects (antar level pengukuran pada subjek yang sama) dan between-subjects (antar kelompok). Target output numerik identik dengan SPSS.

---

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| UI | React 18, TypeScript, Next.js 15 (App Router) |
| Komponen UI | shadcn/ui (`Dialog`, `ResizablePanelGroup`, `Badge`, `Button`, `ScrollArea`) |
| State management | Zustand (`useResultStore`, `useVariableStore`, `useDataStore`) |
| Persistensi | IndexedDB via hook `useIndexedDB` (dua key: `"RepeatedMeasures"` + `"RepeatedMeasuresDefine"`) |
| Komputasi statistik | Rust → WebAssembly (`wasm-pack --target web`) |

---

## Struktur Folder

```
repeated-measures/
├── constants/          # Konfigurasi default & konstanta UI
├── dialogs/            # Komponen dialog
│   ├── dialog.tsx                          # Wrapper dialog utama (shadcn Dialog)
│   ├── repeated-measures-main.tsx          # Layout sidebar + ResizablePanelGroup
│   ├── define/                             # Fase 1 — Definisi faktor
│   │   ├── repeated-measures-define.tsx    # Form pendefinisian within-subject factor
│   │   └── repeated-measures-dialog.tsx    # Dialog wrapper untuk fase Define
│   ├── contrast.tsx    # Sub-dialog Contrast
│   ├── emmeans.tsx     # Sub-dialog Estimated Marginal Means
│   ├── model.tsx       # Sub-dialog Model
│   ├── options.tsx     # Sub-dialog Options
│   ├── plots.tsx       # Sub-dialog Plots
│   ├── posthoc.tsx     # Sub-dialog Post Hoc
│   └── save.tsx        # Sub-dialog Save
├── rust/               # Crate Rust/WASM (engine komputasi)
│   └── src/
│       ├── lib.rs              # Entry point #[wasm_bindgen]
│       ├── models/             # Struct data: config.rs, data.rs, result.rs
│       ├── stats/              # Modul-modul statistik (lihat di bawah)
│       ├── utils/              # converter.rs, error.rs, log.rs
│       ├── wasm/               # constructor.rs, function.rs (JS API)
│       └── test/               # Unit test & validation data
├── services/           # Orkestrasi WASM dari sisi JS/TS
│   ├── repeated-measures-analysis.ts           # Inisialisasi & run WASM
│   ├── repeated-measures-analysis-formatter.ts # Transform result → tabel HTML
│   └── repeated-measures-analysis-output.ts    # Render output ke resultStore
└── types/              # TypeScript type definitions
```

---

## UI Two-Phase (Alur Dialog)

Repeated Measures memiliki dua fase dialog yang harus dilalui berurutan:

```
[Fase 1] Define Repeated Measures Factors
  repeated-measures-define.tsx
    • User mendefinisikan nama faktor within-subjects dan jumlah level
    • User mendefinisikan nama measure (variabel dependen)
    • Konfigurasi disimpan ke IndexedDB ("RepeatedMeasuresDefine")
        │
        ▼ (klik "Define" / OK)
[Fase 2] Main Dialog
  repeated-measures-main.tsx
    • Panel kiri : daftar variabel + assignment to cells
    • Panel kanan: sidebar tombol (Model, Contrast, Options, ...)
    • Konfigurasi lengkap disimpan ke IndexedDB ("RepeatedMeasures")
        │
        ▼ (klik OK / Run)
  repeated-measures-analysis.ts → WASM
```

---

## Encoded Variable Name (Konvensi Data)

Karena setiap sel repeated measures merupakan satu variabel, nama variabel diencode sebagai:

```
<realName>_(<level>,<measureName>)
```

Contoh: faktor `perlakuan` dengan 3 level dan measure `anjing` menghasilkan variabel:
- `perlakuan_(1,anjing)`, `perlakuan_(2,anjing)`, `perlakuan_(3,anjing)`

Mapping real ↔ encoded dilakukan di sisi JavaScript (dalam `repeated-measures-analysis.ts`) sebelum data dikirim ke WASM. Di sisi Rust, modul `parse_factors.rs` memecah nama ini menggunakan regex untuk mendapatkan nama faktor, level, dan measure.

---

## Alur Analisis (Data Flow)

```
Data spreadsheet (useDataStore)
        │
        ▼
repeated-measures-analysis.ts
  reshapeToSubjectMajor()     — pivot baris ke format subject-major
  encodeVariableNames()       — rename kolom ke pola encoded
  new RepeatedMeasureAnalysis(data, config, ...)
        │
        ▼
Rust/WASM — run_analysis()
  ├── parse_within_subject_factors()       — always
  ├── calculate_descriptive_statistics()   [jika options.desc_stats]
  ├── calculate_bartlett_test()            [jika options.homogen_test]
  ├── calculate_multivariate_tests()       — within-subjects multivariate
  ├── calculate_mauchly_test()             — uji sferitas
  ├── calculate_tests_within_subjects_effects()
  ├── calculate_tests_within_subjects_contrasts()
  ├── calculate_between_subjects_effects()
  ├── calculate_parameter_estimates()      [jika options.param_est]
  ├── calculate_general_estimable_function()[jika options.general_fun]
  ├── calculate_between_subjects_sscp()   [jika options.sscp_mat]
  ├── calculate_residual_matrix()          [jika options.res_sscp_mat]
  ├── calculate_sscp_matrix()              [jika options.sscp_mat]
  ├── calculate_univariate_tests()         [jika ada faktor/kovariat BS]
  ├── calculate_posthoc_tests()            [jika posthoc dikonfigurasi]
  └── calculate_emmeans()                  [jika emmeans dikonfigurasi]
        │
        ▼
repeated-measures-analysis-formatter.ts
  transformRepeatedMeasuresResult() → tabel output
        │
        ▼
repeated-measures-analysis-output.ts
  resultRepeatedMeasures() → push ke useResultStore (tab output)
```

---

## Modul Statistik Rust

| Modul | Fungsi |
|---|---|
| `core.rs` | Pengurai faktor, builder matriks desain, dispatcher ke modul lain |
| `parse_factors.rs` | Parsing nama variabel encoded `realName_(level,measure)` via regex |
| `mauchly_test.rs` | Uji sferitas Mauchly: Helmert orthonormal contrast, SymmetricEigen, χ², ε GG, ε HF |
| `multivariate_tests.rs` | Within-subjects multivariate: Pillai, Wilks, Hotelling-Lawley, Roy |
| `within_subjects_effects.rs` | SS/MS/F within-subjects (sphericity-assumed, GG, HF, lower-bound) |
| `between_subjects_effects.rs` | SS/MS/F untuk efek antar-subjek |
| `descriptive_statistics.rs` | Mean, SD, N per sel |
| `bartlett_test.rs` | Uji homogenitas varians Bartlett |
| `parameter_estimates.rs` | Koefisien regresi, SE, t, CI |
| `estimable_function.rs` | General estimable function (L matriks) |
| `sscp_matrix.rs` | SSCP matriks hipotesis |
| `between_subjects_sscp.rs` | SSCP antar-subjek |
| `residual_sscp_matrix.rs` | SSCP residual (error) |
| `emmeans.rs` | Estimated Marginal Means + CI |
| `posthoc.rs` | Post-hoc pairwise tests |
| `profile_plots.rs` | Data titik untuk profile/interaction plots |
| `univariate_tests.rs` | F-test univariat (saat ada prediktor between-subjects) |
| `summary_processing.rs` | Agregasi ringkasan hasil |
| `common.rs` | Fungsi utilitas bersama (invers, RM error SS, dll.) |

---

## Algoritma Statistik Kunci

### Mauchly's Test of Sphericity
```
1. Bangun matriks Helmert orthonormal M berukuran (k-1)×k
     M[(i-1, j)] = -1/√(i(i+1))  untuk j < i
     M[(i-1, i)] =  i/√(i(i+1))
2. Hitung covariance Σ dari data, lalu transform:
     Σ_t = M · Σ · Mᵀ          → matrix (k-1)×(k-1)
3. Mauchly's W = |Σ_t| / (tr(Σ_t)/(k-1))^(k-1)
4. χ² = -(n - 1 - (2p²+p+2)/(6p)) · ln(W),   p = k-1
5. df  = p(p+1)/2 - 1
6. Greenhouse-Geisser ε = (Σλᵢ)² / (p · Σλᵢ²)   (eigenvalues Σ_t)
7. Huynh-Feldt ε = (n·p·ε_GG - 2) / (p·(n-1-p·ε_GG)), max 1.0
```

### RM Error Sum of Squares
```
SS_error = Σᵢ Σⱼ (yᵢⱼ − ȳᵢ. − ȳ.ⱼ + ȳ..)²
```
(digunakan dalam `within_subjects_effects.rs` dan `common.rs`)

### Between-Subjects Average Transform
Data within-subjects di-average per subjek untuk mendapatkan satu skor per subjek, kemudian digunakan untuk menghitung efek between-subjects.

---

## Dependensi Rust (Cargo.toml)

| Crate | Versi | Kegunaan |
|---|---|---|
| `wasm-bindgen` | 0.2 | Bridge JS ↔ Rust |
| `serde` + `serde-wasm-bindgen` | 1.0 / 0.6 | Serialisasi struct → JsValue |
| `serde_json` | 1.0 | JSON parsing/serializing |
| `nalgebra` | 0.33.2 | Aljabar matriks (LU, SymmetricEigen, invers) |
| `statrs` | 0.18.0 | Distribusi statistik (F, χ², t, Beta, dll.) |
| `ndarray` | 0.16.1 | Array N-dimensi pendukung |
| `regex` | 1.x | Parsing nama variabel encoded (hanya di fitur ini) |
| `itertools` | 0.14.0 | Iterator utilities |
| `rayon` | 1.10.0 | Paralelisme data |
| `rand` + `rand_mt` | 0.8 / 5.0 | RNG (Mersenne Twister) |
| `getrandom` | 0.2.15 | Entropy seed di WASM (feature `js`) |
| `js-sys` | 0.3 | Tipe JS dasar dari Rust |
| `web-sys` | 0.3 | `console.log` dari Rust |

---

## Tabel Output yang Dihasilkan

| Tabel | Keterangan |
|---|---|
| Within-Subjects Factors | Peta variabel → level faktor |
| Descriptive Statistics | Mean, SD, N per sel |
| Multivariate Tests | Pillai/Wilks/Hotelling/Roy per efek WS |
| Mauchly's Test | W, χ², df, Sig., ε GG, ε HF, ε LB |
| Tests of Within-Subjects Effects | F dengan koreksi sferitas |
| Tests of Within-Subjects Contrasts | F kontras level-by-level |
| Tests of Between-Subjects Effects | F efek antar-kelompok |
| Parameter Estimates | Koefisien, SE, t, CI (opsional) |
| Errors Logs | Kesalahan per langkah analisis |

---

## Pola Arsitektur Utama

- **WASM class pattern**: Struct `RepeatedMeasureAnalysis` di-expose ke JS sebagai class dengan 7-parameter constructor.
- **Serialize maps as objects**: `serialize_maps_as_objects(true)` agar `HashMap` Rust menjadi plain JS object.
- **Error collector**: Kegagalan tiap langkah dikumpulkan tanpa menghentikan langkah lain.
- **Regex factor parsing**: Satu-satunya fitur GLM yang menggunakan crate `regex` untuk memecah nama variabel encoded.
- **Two-key IndexedDB**: Konfigurasi Define Factor (`"RepeatedMeasuresDefine"`) dan konfigurasi Main Dialog (`"RepeatedMeasures"`) disimpan secara terpisah untuk menjaga state lintas sesi.
