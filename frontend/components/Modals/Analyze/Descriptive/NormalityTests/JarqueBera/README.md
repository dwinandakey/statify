# Jarque-Bera Test of Normality

## Overview

Jarque-Bera Test adalah uji statistik untuk menentukan apakah data mengikuti distribusi normal. Tes ini menganalisis **skewness** (kemiringan) dan **kurtosis** (keruncingan) dari distribusi data.

## Konsep Dasar

### Skewness (Kemiringan)
- **Skewness = 0**: Distribusi simetris (normal)
- **Skewness > 0**: Ekor kanan lebih panjang (right-skewed / positive skew)
- **Skewness < 0**: Ekor kiri lebih panjang (left-skewed / negative skew)

### Kurtosis (Keruncingan)
- **Kurtosis = 3**: Mesokurtic (seperti distribusi normal)
- **Kurtosis > 3**: Leptokurtic (ekor lebih tebal, puncak lebih runcing)
- **Kurtosis < 3**: Platykurtic (ekor lebih tipis, puncak lebih datar)

## Formula

### Statistik Jarque-Bera

$$JB = n \times \left[ \frac{S^2}{6} + \frac{(K-3)^2}{24} \right]$$

Di mana:
- $n$ = jumlah observasi
- $S$ = skewness = $\frac{m_3}{m_2^{3/2}}$
- $K$ = kurtosis = $\frac{m_4}{m_2^2}$
- $m_k$ = momen sentral ke-k = $\frac{1}{n} \sum_{i=1}^{n} (x_i - \bar{x})^k$

### Distribusi
- Statistik JB mengikuti distribusi **chi-square** dengan **df = 2**
- df = 2 karena ada 2 komponen yang diuji (skewness dan kurtosis)

## Hipotesis

- **H₀**: Data berdistribusi normal (skewness = 0, kurtosis = 3)
- **H₁**: Data tidak berdistribusi normal

## Interpretasi

| p-value | Kesimpulan |
|---------|------------|
| p < α | Tolak H₀, data **TIDAK** berdistribusi normal |
| p ≥ α | Gagal tolak H₀, data berdistribusi normal |

Di mana α adalah significance level (biasanya 0.05)

## Kapan Menggunakan Jarque-Bera Test

### Ideal untuk:
- Dataset **besar** (n > 30, optimal n > 2000)
- Validasi asumsi normalitas sebelum analisis parametrik
- Analisis residual regresi

### Tidak ideal untuk:
- Sampel **kecil** (n < 30) - gunakan Shapiro-Wilk
- Data dengan banyak **outlier** (tes sensitif terhadap outlier)

## Struktur File

```
JarqueBera/
├── index.tsx                    # Komponen utama modal
├── types.ts                     # Definisi tipe TypeScript
├── README.md                    # Dokumentasi ini
├── hooks/
│   ├── index.ts                 # Export semua hooks
│   ├── useVariableSelection.ts  # Hook pemilihan variabel
│   ├── useTestSettings.ts       # Hook pengaturan opsi
│   ├── useJarqueBeraAnalysis.ts # Hook eksekusi analisis
│   ├── tourConfig.ts            # Konfigurasi tour guide
│   └── useTourGuide.ts          # Hook tour guide interaktif
├── components/
│   ├── VariablesTab.tsx         # Tab pemilihan variabel
│   └── OptionsTab.tsx           # Tab opsi analisis
└── utils/
    └── formatters.ts            # Formatter untuk hasil output
```

## Web Worker

Worker file: `/public/workers/DescriptiveStatistics/jarqueBeraWorker.js`

### Message Types

**Input (CALCULATE)**:
```javascript
{
    type: 'CALCULATE',
    data: {
        testVariables: string[],      // Nama variabel
        variablesData: number[][],    // Data per variabel
        options: {
            significanceLevel: number,
            includeDescriptives: boolean
        }
    }
}
```

**Output (JARQUE_BERA_RESULT)**:
```javascript
{
    type: 'JARQUE_BERA_RESULT',
    data: [{
        variable: string,
        statistic: number,       // JB statistic
        df: number,              // Degrees of freedom (selalu 2)
        pValue: number,
        skewness: number,
        kurtosis: number,
        excessKurtosis: number,  // kurtosis - 3
        sampleSize: number,
        descriptiveStats: {
            n: number,
            mean: number,
            variance: number,
            std: number,
            min: number,
            max: number
        }
    }]
}
```

## Contoh Output

### Jarque-Bera Test Results

| Variable | n | Skewness | Kurtosis | JB Statistic | df | p-value | Result |
|----------|---|----------|----------|--------------|----|---------|---------|
| Income | 1000 | 0.523 | 3.245 | 12.456 | 2 | 0.002 | Not Normal |
| Age | 1000 | -0.087 | 2.891 | 0.742 | 2 | 0.690 | Normal |

### Descriptive Statistics (optional)

| Variable | N | Mean | Std. Deviation | Minimum | Maximum |
|----------|---|------|----------------|---------|---------|
| Income | 1000 | 45230.50 | 12456.78 | 15000 | 125000 |
| Age | 1000 | 35.67 | 10.23 | 18 | 65 |

## Referensi

1. Jarque, C. M.; Bera, A. K. (1987). "A test for normality of observations and regression residuals". *International Statistical Review*. 55 (2): 163–172.

2. Jarque, C. M.; Bera, A. K. (1980). "Efficient tests for normality, homoscedasticity and serial independence of regression residuals". *Economics Letters*. 6 (3): 255–259.

## Tips Penggunaan

1. **Sample Size**: Untuk hasil akurat, gunakan sampel minimal 30 observasi
2. **Outliers**: Periksa dan tangani outlier sebelum tes karena JB sensitif terhadap nilai ekstrem
3. **Complementary Tests**: Kombinasikan dengan Q-Q plot untuk visualisasi
4. **Multiple Variables**: Tes dapat dijalankan untuk beberapa variabel sekaligus

## Troubleshooting

### Error: "Insufficient sample size"
- **Penyebab**: Data kurang dari 4 observasi
- **Solusi**: Gunakan data dengan minimal 4 observasi (idealnya n > 30)

### Error: "Zero variance"
- **Penyebab**: Semua nilai data sama (tidak ada variasi)
- **Solusi**: Periksa data, variabel dengan nilai konstan tidak bisa diuji normalitasnya

### Warning: "Small sample size"
- **Penyebab**: n < 30
- **Solusi**: Hasil mungkin tidak reliable, pertimbangkan Shapiro-Wilk untuk sampel kecil
