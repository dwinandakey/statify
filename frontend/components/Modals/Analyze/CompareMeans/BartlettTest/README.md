# Bartlett's Test of Homogeneity of Variances

## Overview
Bartlett's Test of Homogeneity of Variances adalah uji statistik untuk menguji homogenitas varians antar grup. Test ini menggunakan distribusi chi-square dan lebih powerful dibanding Levene's Test, namun lebih sensitif terhadap penyimpangan dari asumsi normalitas.

**CATATAN PENTING:** Test ini berbeda dengan "Bartlett's Test of Sphericity" yang digunakan dalam Factor Analysis (Dimension Reduction). Test homogeneity ini digunakan untuk memeriksa asumsi equal variances sebelum melakukan ANOVA.

## Formula
Bartlett's Test menggunakan statistik uji:

$$
T = \frac{(N - k) \ln(s_p^2) - \sum_{i=1}^{k}(N_i - 1)\ln(s_i^2)}{1 + \frac{1}{3(k-1)}\left(\sum_{i=1}^{k}\frac{1}{N_i-1} - \frac{1}{N-k}\right)}
$$

Di mana:
- $N$ = Total jumlah observasi
- $k$ = Jumlah grup
- $N_i$ = Jumlah observasi di grup ke-i
- $s_i^2$ = Varians dari grup ke-i
- $s_p^2$ = Pooled variance = $\frac{\sum_{i=1}^{k}(N_i-1)s_i^2}{N-k}$

Statistik T mengikuti distribusi chi-square dengan derajat bebas $df = k - 1$

## File Structure

```
BartlettTest/
├── index.tsx                    # Main modal component
├── types.ts                     # TypeScript type definitions
├── README.md                    # This file
├── components/
│   ├── VariablesTab.tsx        # Variable selection UI
│   └── OptionsTab.tsx          # Options configuration UI
├── hooks/
│   ├── index.ts                # Hook exports
│   ├── useVariableSelection.ts # Variable selection logic
│   ├── useTestSettings.ts      # Test settings management
│   └── useBartlettAnalysis.ts  # Main analysis orchestration
└── utils/
    └── formatters.ts           # Result formatting utilities
```

## Usage

### 1. Open Modal
Navigate to **Analyze > Compare Means > Bartlett's Test of Homogeneity...**

### 2. Variables Tab
- **Test Variables**: Select one or more numeric variables to test
- **Factor Variable**: Select one categorical variable for grouping
  - Must have at least 2 groups
  - Each group must have at least 2 observations

### 3. Options Tab
- **Descriptive Statistics**: Check to include descriptive statistics for each group

### 4. Run Analysis
Click **OK** to run the analysis. Results will be displayed in the Output window.

## Output Tables

### 1. Bartlett Test Table
Displays:
- Chi-square statistic (χ²)
- Degrees of freedom (df)
- P-value (Sig.)

**Interpretation**:
- If p-value < 0.05: Reject null hypothesis (variances are NOT equal)
- If p-value ≥ 0.05: Fail to reject null hypothesis (variances are equal)

### 2. Descriptive Statistics Table (Optional)
For each variable and group, shows:
- N (sample size)
- Mean
- Standard Deviation
- Variance
- Minimum
- Maximum

## Implementation Details

### Architecture
Uses **Web Worker** pattern for computation:
- Main thread: UI and state management
- Worker thread: Statistical calculations
- Benefits: Non-blocking UI, better performance

### Dependencies
- `@stdlib/stats-base-dists-chisquare-cdf`: Chi-square CDF calculation
- Zustand stores: `useVariableStore`, `useDataStore`, `useResultStore`
- React hooks for state and effects

### Key Components

#### `useVariableSelection.ts`
Manages variable selection with drag-and-drop:
- Test variables list (multiple selection)
- Factor variable list (single selection)
- Variable reordering
- Highlighted variable tracking

#### `useBartlettAnalysis.ts`
Orchestrates the analysis:
- Initializes Web Worker
- Validates inputs
- Sends data to worker
- Receives and processes results
- Saves to result store

#### `bartlettTestWorker.js`
Performs calculations:
- Groups data by factor
- Calculates group variances
- Computes Bartlett statistic
- Calculates p-value using chi-square distribution

### Validation Rules
1. **Test Variables**: At least 1 numeric variable required
2. **Factor Variable**: Exactly 1 categorical variable required
3. **Groups**: Minimum 2 groups with at least 2 observations each
4. **Maximum Groups**: 100 groups (configurable in worker)

## Testing Recommendations

### Test Cases
1. **Basic Case**: 2 groups with equal variances
2. **Multiple Groups**: 3+ groups
3. **Unequal Variances**: Groups with significantly different variances
4. **Multiple Variables**: Test multiple test variables at once
5. **Edge Cases**:
   - Minimum group sizes (n=2)
   - Many groups (approaching max)
   - Missing data handling

### Sample Data
Use `Data Penumpang.sav` from `/Dokumentasi/Data Testing/` for testing.

## Troubleshooting

### Common Issues

**Issue**: "Factor variable must have at least 2 groups"
- **Solution**: Select a factor variable with multiple distinct values

**Issue**: "Some groups have insufficient data (minimum 2 required)"
- **Solution**: Ensure each group has at least 2 observations

**Issue**: Modal doesn't open
- **Solution**: Check browser console for errors, verify modal is registered in `CompareMeansRegistry.tsx`

**Issue**: Worker fails to load
- **Solution**: Check that `bartlettTestWorker.js` exists in `/public/workers/CompareMeans/`

## References
- Bartlett, M. S. (1937). "Properties of sufficiency and statistical tests". Proceedings of the Royal Society of London, Series A, 160: 268-282.
- Snedecor, George W. and Cochran, William G. (1989), Statistical Methods, Eighth Edition, Iowa State University Press.

## Related Tests
- **Levene's Test**: More robust to departures from normality
- **One-Way ANOVA**: Tests means equality (assumes equal variances)
- **F-Test**: Tests variance equality for two groups only
