# Repeated Measures General Linear Model (GLM) Analysis

## Deskripsi

Komponen Repeated Measures General Linear Model Analysis adalah implementasi lengkap untuk analisis model linear umum pengukuran berulang dalam aplikasi Statify. Modul ini menganalisis data di mana **setiap subjek diukur beberapa kali** (across level dari satu atau lebih within-subjects factor), menguji efek within-subjects (antar level pengukuran pada subjek yang sama) sekaligus efek between-subjects (antar kelompok). Berbeda dari Univariate/Multivariate, alurnya **dua fase**: user wajib mendefinisikan struktur within-subjects factor (Define) sebelum masuk ke dialog utama. Arsitektur tetap konsisten: frontend TypeScript + backend statistik Rust/WASM. Target output numerik identik dengan SPSS.

> Dokumentasi teknis mendalam (data flow, algoritma, dependensi Rust) ada di [architecture.md](architecture.md). Roadmap pengerjaan ada di [development-step.md](development-step.md).

## Perbedaan dengan Univariate & Multivariate

| Aspek | Univariate | Multivariate | **Repeated Measures** |
|---|---|---|---|
| Variabel dependen | 1 | ≥1 (independen) | ≥1 measure × beberapa level pengukuran |
| Alur dialog | 1 fase | 1 fase | **2 fase (Define → Main)** |
| Signature output | ANOVA table | Multivariate tests | **Mauchly's Test + Within-Subjects Effects** |
| Konstruktor WASM | 11 params | 9 params | **7 params (tanpa WLS Weight)** |
| Khas | — | SSCP, T² berpasangan | Sferitas + koreksi epsilon (GG/HF/LB) |

## Fitur Utama

### 🧮 Analisis Pengukuran Berulang
- **One-Way Within-Subjects**: Satu within-subjects factor (mis. waktu: pre/post/follow-up)
- **Mixed Design**: Within-subjects factor + between-subjects factor
- **With Covariates**: Penambahan kovariat kontinu
- **Doubly Multivariate**: Lebih dari satu measure dengan within-subjects factor yang sama

### 📊 Konfigurasi Model (Dua Fase)
- **Fase Define**: Nama within-subjects factor, jumlah level, dan nama measure (variabel dependen)
- **Fase Main**:
  - **Within-Subjects Variables**: Pemetaan variabel ke kombinasi (level × measure)
  - **Between-Subjects Factors**: Faktor kelompok antar-subjek
  - **Covariates**: Kovariat kontinu

### 🔍 Analisis Lanjutan
- **Contrasts**: Polynomial / Helmert / Difference / Repeated / Simple / Deviation
- **Post Hoc Tests**: Perbandingan berpasangan antar level/grup
- **Estimated Marginal Means**: Rata-rata terestimasi marginal + CI
- **Profile Plots**: Data titik untuk profile/interaction plots

### 📈 Output dan Visualisasi
- **Mauchly's Test of Sphericity**: W, χ², df, Sig., dan tiga epsilon (Greenhouse-Geisser, Huynh-Feldt, Lower-bound) — **signature RM**
- **Tests of Within-Subjects Effects**: 4 baris koreksi sferitas (Sphericity Assumed / GG / HF / LB)
- **Tests of Within-Subjects Contrasts**: F kontras level-by-level
- **Multivariate Tests**: Pillai / Wilks / Hotelling / Roy untuk efek within-subjects

## Struktur Komponen

```
repeated-measures/
├── constants/                            # Konstanta dan konfigurasi default
│   ├── repeated-measures-default.ts
│   └── repeated-measures-define-default.ts
├── dialogs/                              # Komponen dialog UI
│   ├── dialog.tsx                       # Dialog controller utama
│   ├── repeated-measures-main.tsx      # Dialog konfigurasi utama (Fase 2)
│   ├── define/                         # Fase 1 — Definisi within-subjects factor
│   │   ├── repeated-measures-define.tsx  # Form pendefinisian faktor + measure
│   │   └── repeated-measures-dialog.tsx  # Dialog wrapper fase Define
│   ├── model.tsx                      # Dialog pengaturan model
│   ├── contrast.tsx                 # Dialog kontras
│   ├── plots.tsx                  # Dialog plotting (profile plots)
│   ├── posthoc.tsx              # Dialog post-hoc tests
│   ├── emmeans.tsx           # Dialog estimated marginal means
│   ├── save.tsx            # Dialog penyimpanan
│   └── options.tsx       # Dialog opsi lanjutan
├── hooks/                                # Custom hooks
│   ├── tourConfig.ts                   # Konfigurasi tur (Define + Main + sub-dialog)
│   └── useTourGuide.ts                # Hook untuk panduan tur
├── rust/                                 # Implementasi Rust/WASM
│   └── src/
│       ├── lib.rs                       # Entry point #[wasm_bindgen]
│       ├── models/                    # Struct data (config, data, result)
│       ├── stats/                   # Modul-modul statistik (mauchly_test, dll.)
│       ├── utils/                 # converter, error, log
│       ├── wasm/                # constructor.rs, function.rs (JS API)
│       └── test/             # Unit test & validation data
├── services/                             # Layanan analisis
│   ├── repeated-measures-analysis.ts          # Logika analisis utama + encoding
│   ├── repeated-measures-analysis-formatter.ts # Formatter hasil
│   └── repeated-measures-analysis-output.ts    # Output handler
├── types/                                # Definisi TypeScript
│   ├── repeated-measures.ts            # Tipe data utama
│   ├── repeated-measure-define.ts     # Tipe untuk fase Define
│   └── repeated-measures-worker.ts   # Tipe untuk worker
└── __test__/                             # Unit tests
    ├── repeated-measures.test.ts             # Smoke & struktur output (vs WASM)
    └── repeated-measures.performance.test.ts # Benchmark dataset besar
```

## Alur Dialog (Two-Phase)

```
[Fase 1] Define Repeated Measures Factors
  define/repeated-measures-define.tsx
    • Definisikan nama within-subjects factor + jumlah level
    • Definisikan nama measure (variabel dependen)
    • Disimpan ke IndexedDB ("RepeatedMeasuresDefine")
        │
        ▼ (klik Define)
[Fase 2] Main Dialog
  repeated-measures-main.tsx
    • Panel kiri : daftar variabel + assignment ke sel (level × measure)
    • Panel kanan: sidebar (Model, Contrast, Plots, PostHoc, EMMeans, Save, Options)
    • Disimpan ke IndexedDB ("RepeatedMeasures")
        │
        ▼ (klik OK)
  repeated-measures-analysis.ts → WASM
```

## Penggunaan

### 1. Konfigurasi (setelah Define)

```typescript
import { RepeatedMeasuresMainDefault } from './constants/repeated-measures-default';

const config = {
    ...RepeatedMeasuresMainDefault,
    // Variabel within-subjects dalam bentuk encoded: "<realName>_(<level>,<measure>)"
    SubVar: [
        'time_(1,score)', 'time_(2,score)', 'time_(3,score)'
    ],
    FactorsVar: ['group'],   // between-subjects factor (opsional)
    Covariates: ['age']      // kovariat (opsional)
};
```

### 2. Menjalankan Analisis

```typescript
import { analyzeRepeatedMeasures } from './services/repeated-measures-analysis';

const results = await analyzeRepeatedMeasures({
    configData: {
        main: mainConfig,
        model: modelConfig,
        contrast: contrastConfig,
        plots: plotsConfig,
        posthoc: posthocConfig,
        emmeans: emmeansConfig,
        save: saveConfig,
        options: optionsConfig
    },
    dataVariables: yourDataVariables,
    variables: yourVariables
});
```

### 3. Konvensi Encoded Variable Name

Karena tiap sel pengukuran berulang adalah satu variabel, namanya diencode:

```
<realName>_(<level>,<measureName>)
```

Contoh faktor `time` (3 level) dengan measure `score`:
`time_(1,score)`, `time_(2,score)`, `time_(3,score)`. Mapping real ↔ encoded
dilakukan di `repeated-measures-analysis.ts`; di sisi Rust, `parse_factors.rs`
memecah nama ini dengan regex.

## API Reference

### RepeatedMeasureAnalysis Class

> **Catatan:** Struct WASM bernama `RepeatedMeasureAnalysis` (singular "Measure"), sementara folder & tipe TS memakai jamak `repeated-measures`. Patuhi nama singular saat import dari `rust/pkg`.

Konstruktor **7 parameter** (subject, factors, covariate + var defs masing-masing + config). **Tidak ada WLS Weight.**

```typescript
class RepeatedMeasureAnalysis {
    constructor(
        subjectData: any[][],
        factorsData: any[][],
        covariateData: any[][],
        subjectVarDefs: any[],
        factorsVarDefs: any[],
        covariateVarDefs: any[],
        config: RepeatedMeasuresConfigType
    );

    get_formatted_results(): string;
    get_all_errors(): string;
    get_executed_functions(): string;
}
```

### analyzeRepeatedMeasures Function

```typescript
async function analyzeRepeatedMeasures({
    configData,
    dataVariables,
    variables,
}: RepeatedMeasuresAnalysisType): Promise<any>
```

## Hasil Output

### 1. **Within-Subjects Factors**
- Peta variabel → level faktor (KHAS RM)

### 2. **Descriptive Statistics**
- Mean, SD, N per kombinasi level within × between

### 3. **Multivariate Tests**
- Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root untuk efek within-subjects

### 4. **Mauchly's Test of Sphericity** (KHAS RM)
- Mauchly's W, Approx. Chi-Square, df, Sig.
- Tiga epsilon: Greenhouse-Geisser, Huynh-Feldt, Lower-bound — menentukan koreksi df yang dipakai

### 5. **Tests of Within-Subjects Effects** (KHAS RM)
- Per effect **4 baris**: Sphericity Assumed / GG / HF / Lower-bound
- SS, df (corrected = df × ε), MS, F, Sig., partial η², noncentrality, observed power

### 6. **Tests of Within-Subjects Contrasts**
- Polynomial / Helmert / Difference / Repeated / Simple / Deviation per level

### 7. **Tests of Between-Subjects Effects**
- F efek antar-kelompok (menggunakan subject-mean across timepoints)

### 8. **Parameter Estimates, SSCP & EM Means**
- Koefisien/SE/t/CI, SSCP matrices, estimated marginal means (sesuai opsi)

## Algoritma Kunci

### Mauchly's Test of Sphericity
```
1. Bangun matriks Helmert orthonormal M berukuran (k-1)×k
2. Transform covariance: Σ_t = M · Σ · Mᵀ
3. Mauchly's W = |Σ_t| / (tr(Σ_t)/(k-1))^(k-1)
4. χ² = -(n - 1 - (2p²+p+2)/(6p)) · ln(W),   p = k-1
5. df = p(p+1)/2 - 1
6. Greenhouse-Geisser ε = (Σλᵢ)² / (p · Σλᵢ²)
7. Huynh-Feldt ε = (n·p·ε_GG - 2) / (p·(n-1-p·ε_GG)),  max 1.0
8. Lower-bound ε = 1/(k-1)
```
Epsilon hanya mengoreksi **df**, bukan SS/MS/F. Detail di [architecture.md](architecture.md#algoritma-statistik-kunci).

## Testing

Test berada di `__test__/` dan dijalankan dengan **konfigurasi Jest frontend** (`frontend/jest.config.js`) — alias `@/` di-resolve ke folder `frontend`. Karena tiap suite memuat WASM, jalankan secara serial (`--runInBand`) agar tidak terjadi worker crash saat beberapa suite WASM berjalan paralel.

### Unit Tests

```bash
# dari folder frontend/
# Semua test repeated measures (serial, disarankan untuk suite WASM)
npx jest --config jest.config.js --runInBand "repeated-measures/__test__"

# Hanya smoke & struktur output
npx jest --config jest.config.js "repeated-measures.test"

# Hanya benchmark performa
npx jest --config jest.config.js --runInBand "repeated-measures.performance"
```

> **Catatan toolchain:** repo saat ini menyetel `"ignoreDeprecations": "6.0"` di `tsconfig.json`, sementara TypeScript terpasang versi 5.x yang hanya menerima `"5.0"`. Jika `ts-jest` gagal dengan `TS5103`, sesuaikan nilai tersebut sementara saat menjalankan test.

### Rust Validation Tests

Dari folder `repeated-measures/rust`:

```bash
cargo test --lib
```

### Test Coverage

Test smoke/struktur (`repeated-measures.test.ts`) memvalidasi terhadap engine WASM nyata:

- ✅ Tabel signature muncul: Within-Subjects Factors, Mauchly's Test, Tests of Within-Subjects Effects, Multivariate Tests
- ✅ Struktur within-subjects factor ter-decode benar dari nama variabel encoded (jumlah sel = jumlah level)
- ✅ Mauchly's Test menghasilkan nilai epsilon yang valid (bukan null)
- ✅ Mixed design (within + between) menghasilkan Tests of Between-Subjects Effects + Descriptive Statistics
- ✅ Pipeline berjalan tanpa fatal error (`executed_functions` terisi)

Benchmark (`repeated-measures.performance.test.ts`):

- ✅ 1000 subjek × 5 timepoint + 1 between factor selesai < 5 detik

> **Tahap berikutnya (validasi numerik vs SPSS):** lihat [development-step.md](development-step.md) Tahap 2 — menambahkan assertion angka hardcoded dari output SPSS (Mauchly W/χ²/ε, 4 baris epsilon di Within-Subjects Effects, kontras polynomial) dengan toleransi 1e-6.

## Performance

### Optimisasi

- **WebAssembly**: Core algoritma dalam Rust untuk performa tinggi
- **Parallel Processing**: Paralelisme data via `rayon`
- **Memory Management**: Optimisasi eigen-decomposition Σ̂ (nalgebra `SymmetricEigen`) pada `mauchly_test.rs`
- **Subject-major reshape**: Data dipivot ke format subject-major sekali di TS sebelum dikirim ke WASM

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build Rust/WASM:
   ```bash
   cd rust
   wasm-pack build --target web
   ```
   Output build dihasilkan ke `repeated-measures/rust/pkg` (ekspor class `RepeatedMeasureAnalysis`).

3. Run tests:
   ```bash
   npm test
   ```

### Code Style

- Ikuti TypeScript strict mode
- Gunakan ESLint dan Prettier
- Tulis comprehensive unit tests
- Dokumentasi JSDoc untuk public functions
- Follow statistical computing best practices

## Referensi Statistik

- IBM SPSS Statistics Algorithms (bagian "GLM Repeated Measures" / "GLM Within-Subjects")
- Maxwell, S. E. & Delaney, H. D. — *Designing Experiments and Analyzing Data* (bab Repeated Measures)
- Rencher, A. C. — *Methods of Multivariate Analysis* (bab Profile Analysis)
- Field, A. — *Discovering Statistics Using IBM SPSS Statistics* (chapter Repeated-Measures ANOVA)
