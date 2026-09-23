# Multivariate General Linear Model (GLM) Analysis

## Deskripsi

Komponen Multivariate General Linear Model Analysis adalah implementasi lengkap untuk analisis model linear umum multivariat (MANOVA / MANCOVA) dalam aplikasi Statify. Modul ini menyediakan antarmuka komprehensif untuk menganalisis **lebih dari satu variabel dependen secara simultan** dengan berbagai faktor dan kovariat, dilengkapi opsi analisis lanjutan seperti uji multivariat (Pillai, Wilks, Hotelling, Roy), post-hoc tests, contrasts, dan **Hotelling's T² berpasangan**. Arsitektur mengikuti pola modul `univariate`: frontend TypeScript + backend statistik Rust/WASM dengan alur sidebar (konfigurasi utama + sub-dialog).

## Fitur Utama

### 🧮 Analisis Model Linear Multivariat
- **One-Way MANOVA**: Analisis varians multivariat satu faktor
- **Two-Way MANOVA**: MANOVA faktorial dengan efek interaksi
- **MANCOVA**: Analisis kovarians multivariat dengan kovariat kontinu
- **Paired Hotelling's T²**: Uji T² berpasangan (disintesis dari kolom selisih d = v1 − v2)
- **Custom Models**: Pembuatan model kustom dengan term-term tertentu
- **WLS (Weighted Least Squares)**: Analisis dengan bobot

### 📊 Konfigurasi Model
- **Dependent Variables**: Beberapa variabel dependen (outcome) yang dianalisis bersamaan
- **Fixed Factors**: Faktor-faktor tetap (kategorikal)
- **Covariates**: Kovariat kontinu
- **Weight Variable**: Variabel bobot untuk WLS
- **Test Values / Paired Mode**: Nilai uji intercept (μ₀) dan pasangan variabel untuk T² berpasangan

### 🔍 Analisis Lanjutan
- **Contrasts**: Kontras yang direncanakan (planned contrasts)
- **Post Hoc Tests**: Perbandingan berpasangan antar level faktor
- **Estimated Marginal Means**: Rata-rata terestimasi marginal
- **Bootstrap**: Simple, stratified, percentile CI, dan BCa CI (acceleration via jackknife)

### 📈 Output dan Visualisasi
- **Multivariate Tests**: Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root
- **Tests of Between-Subjects Effects**: Tabel efek antar-subjek per variabel dependen
- **Parameter Estimates**: Estimasi parameter dan signifikansi
- **SSCP Matrices**: Between-Subjects SSCP, Residual SSCP, dan SSCP Matrix
- **Box's M & Levene's Test**: Uji asumsi homogenitas matriks kovarians dan varians

## Struktur Komponen

```
multivariate/
├── constants/                        # Konstanta dan konfigurasi default
│   ├── multivariate-default.ts
│   └── multivariate-method.ts
├── dialogs/                          # Komponen dialog UI
│   ├── dialog.tsx                   # Dialog controller utama
│   ├── multivariate-main.tsx       # Dialog konfigurasi utama (sidebar flow)
│   ├── model.tsx                   # Dialog pengaturan model
│   ├── contrast.tsx               # Dialog kontras
│   ├── plots.tsx                  # Dialog plotting
│   ├── posthoc.tsx               # Dialog post-hoc tests
│   ├── emmeans.tsx              # Dialog estimated marginal means
│   ├── save.tsx                 # Dialog penyimpanan
│   ├── options.tsx             # Dialog opsi lanjutan
│   ├── bootstrap.tsx          # Dialog bootstrap
│   ├── paired.tsx            # Dialog Hotelling T² berpasangan
│   └── test-values.tsx      # Dialog nilai uji (μ₀)
├── hooks/                            # Custom hooks
│   ├── tourConfig.ts               # Konfigurasi tur aplikasi
│   └── useTourGuide.ts            # Hook untuk panduan tur
├── rust/                             # Implementasi Rust/WASM
│   ├── src/
│   │   ├── models/                # Struct data (config, data, result)
│   │   ├── stats/               # Modul-modul statistik
│   │   ├── wasm/              # constructor.rs, function.rs (JS API)
│   │   └── test/            # Validation tests
│   │       └── multivariate_validation.rs
│   └── pkg/                       # Package WebAssembly
├── services/                         # Layanan analisis
│   ├── multivariate-analysis.ts          # Logika analisis utama
│   ├── multivariate-analysis-formatter.ts # Formatter hasil
│   ├── multivariate-analysis-output.ts    # Output handler
│   └── paired-difference.ts             # Builder data selisih (paired T²)
├── types/                            # Definisi TypeScript
│   ├── multivariate.ts             # Tipe data utama
│   └── multivariate-worker.ts     # Tipe untuk worker
└── __test__/                         # Unit tests
    ├── multivariate.test.ts        # Test utama
    └── multivariate.performance.test.ts # Test performa
```

## Penggunaan

### 1. Konfigurasi Dasar

```typescript
import { MultivariateMainDefault } from './constants/multivariate-default';

const config = {
    ...MultivariateMainDefault,
    DepVar: ['math', 'reading', 'writing'], // beberapa dependen sekaligus
    FixFactor: ['group', 'gender'],
    Covar: ['age']
};
```

### 2. Menjalankan Analisis

```typescript
import { analyzeMultivariate } from './services/multivariate-analysis';

const results = await analyzeMultivariate({
    configData: {
        main: mainConfig,
        model: modelConfig,
        contrast: contrastConfig,
        plots: plotsConfig,
        posthoc: posthocConfig,
        emmeans: emmeansConfig,
        save: saveConfig,
        options: optionsConfig,
        bootstrap: bootstrapConfig
    },
    dataVariables: yourDataVariables,
    variables: yourVariables
});
```

### 3. Hotelling's T² Berpasangan

```typescript
const config = {
    ...MultivariateMainDefault,
    PairedMode: {
        pairs: [['pre_a', 'post_a'], ['pre_b', 'post_b']],
        delta0: [0, 0] // nilai uji selisih (default 0)
    }
};
// Diproses sepenuhnya di TS: kolom selisih d = v1 − v2 disintesis
// lalu dirutekan melalui pipeline Test Values (cabang Intercept, μ₀ = δ₀).
```

## API Reference

### MultivariateAnalysis Class

Struct Rust `MultivariateAnalysis` di-expose ke JS sebagai class dengan konstruktor **9 parameter** (dependent, fixed factor, covariate, weight + var defs masing-masing + config).

```typescript
class MultivariateAnalysis {
    constructor(
        dependentData: any[][],
        fixedFactorData: any[][],
        covariateData: any[][],
        weightData: any[][],
        dependentVarDefs: any[],
        fixedFactorVarDefs: any[],
        covariateVarDefs: any[],
        weightVarDefs: any[],
        config: MultivariateConfigType
    );

    get_formatted_results(): string;
    get_all_log(): string;
}
```

### analyzeMultivariate Function

```typescript
async function analyzeMultivariate({
    configData,
    dataVariables,
    variables,
}: MultivariateAnalysisType): Promise<any>
```

## Hasil Output

Analisis multivariate menghasilkan:

### 1. **Between-Subjects Factors**
- Daftar faktor dan jumlah observasi per level

### 2. **Descriptive Statistics**
- Means, standard deviations, dan N per dependent variable × kombinasi level

### 3. **Uji Asumsi**
- Box's M Test of Equality of Covariance Matrices
- Levene's Test of Equality of Error Variances
- Bartlett's Test of Sphericity

### 4. **Multivariate Tests**
- Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root
- F-statistic, df hipotesis & error, p-value, partial eta-squared

### 5. **Tests of Between-Subjects Effects**
- Sum of squares (Type I/II/III), df, mean squares, F, p-value per dependen

### 6. **Parameter Estimates**
- Estimasi koefisien, standard errors, t-statistics, p-values, confidence intervals

### 7. **SSCP Matrices**
- Between-Subjects SSCP, Residual SSCP Matrix, SSCP Matrix

### 8. **Post-Hoc Tests, Contrasts & EM Means**
- Pairwise comparisons, contrast coefficients, estimated marginal means + CI

## Testing

### Unit Tests

```bash
# Menjalankan semua test multivariate
npm test multivariate

# Test khusus
npm test multivariate.test.ts

# Test performa
npm test multivariate.performance.test.ts
```

### Rust Validation Tests

Dari folder `multivariate/rust`:

```bash
cargo test --lib
```

Test yang tersedia saat ini mencakup:
- Validasi komputasi tabel inti untuk dataset A/B/C
- Smoke numeric checks: Multivariate tests, Box's M, Tests of between-subjects effects, Parameter estimates
- Basic performance guard (threshold 5 detik pada dataset menengah)

### Test Coverage

- ✅ One-Way & Two-Way MANOVA (termasuk efek interaksi)
- ✅ MANCOVA dengan kovariat
- ✅ Paired Hotelling's T²
- ✅ Uji asumsi (Box's M, Levene, Bartlett)
- ✅ Multivariate tests (4 statistik)
- ✅ Post-hoc tests & contrasts
- ✅ Output formatting & interpretation
- ✅ Performance benchmarks

## Performance

### Optimisasi

- **WebAssembly**: Implementasi core algoritma dalam Rust untuk performa tinggi
- **Parallel Processing**: Paralelisme data via `rayon` untuk dataset besar
- **Memory Management**: Optimisasi penggunaan memori pada operasi matriks (nalgebra)
- **Deterministic mapping**: Pemetaan kolom interaction di between-subjects effects dibangun deterministik dari konstruksi design matrix

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
   Output build dihasilkan ke `multivariate/rust/pkg`.

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

- IBM SPSS Statistics Algorithms (bagian "GLM Multivariate")
- Rencher, A. C. — *Methods of Multivariate Analysis*
- Johnson, R. A. & Wichern, D. W. — *Applied Multivariate Statistical Analysis*
