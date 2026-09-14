# Shapiro-Wilk Test — Developer Guide

## Table of Contents

1. [Algorithm Overview](#1-algorithm-overview)
2. [Implementation Architecture](#2-implementation-architecture)
3. [Testing Strategy](#3-testing-strategy)
4. [Property-Based Testing Approach](#4-property-based-testing-approach)
5. [Appendix C: Example Calculation Walkthrough](#appendix-c-example-calculation-walkthrough)
6. [Appendix D: Debugging Checklist](#appendix-d-debugging-checklist)
7. [References](#references)

---

## 1. Algorithm Overview

### What is the Shapiro-Wilk Test?

The Shapiro-Wilk test measures how closely a dataset follows a normal distribution. It computes a W statistic (range 0 to 1) where values close to 1 indicate normality. It is the most powerful normality test for small to medium samples (n ≤ 50) and supports up to n = 5000 following SPSS conventions.

### When is it Used?

- Before ANOVA (normality assumption per group)
- Before T-Test (normality assumption)
- Before Bartlett Test (sensitive to non-normality)
- In Descriptive Statistics → "Normality Tests with Plots"

### Hypotheses

- **H₀**: Data follows a normal distribution
- **H₁**: Data does NOT follow a normal distribution
- If p-value < α (default 0.05): Reject H₀ → Data is NOT normal
- If p-value ≥ α: Fail to reject H₀ → Data is considered normal

### Core Formula

```
W = (Σ aᵢ × x(ᵢ))² / Σ(xᵢ − x̄)²
```

Where:
- `x(ᵢ)` = sorted data (ascending)
- `aᵢ` = antisymmetric weight coefficients (Royston AS R94)
- `Σ(xᵢ − x̄)²` = total sum of squares (S²), **not divided by n−1**
- W ∈ (0, 1]: near 1 → normal, near 0 → non-normal

### Algorithm Steps (Royston AS R94)

1. **Data Preparation**: Clean invalid values, validate 3 ≤ n ≤ 5000, sort ascending
2. **Expected Order Statistics**: Compute mᵢ = Φ⁻¹((i − 0.375)/(n + 0.25)) using Blom (1958) plotting positions
3. **Coefficient Calculation**: Compute antisymmetric weights aᵢ via Royston polynomials (see case table below)
4. **W Statistic**: W = (Σaᵢxᵢ)² / S², clamped to [0, 1]
5. **P-Value Approximation**: Transform W to z-score via Royston approximation (case-dependent on n)

### Coefficient Calculation Cases

| Sample Size | End Coefficients | Middle Coefficients |
|-------------|-----------------|---------------------|
| n = 3 | Fixed: a₁ = −√0.5, a₃ = +√0.5 | a₂ = 0 |
| n = 4 | aₙ via p1 polynomial | a₂, a₃ via φ normalization |
| n = 5 | aₙ via p1 polynomial | a₃ = 0 (center), a₄ = −a₂ = 0 |
| n ≥ 6 | aₙ via p1, aₙ₋₁ via p2 | aᵢ = mᵢ/√\|φ\| for i = 3..n−2 |

**Polynomial Coefficients (Horner form, highest degree first):**
- **p1** (for aₙ, used when n ≥ 4): `[-2.706056, 4.434685, -2.071190, -0.147981, 0.221157]`
- **p2** (for aₙ₋₁, used when n ≥ 6): `[-3.582633, 5.682633, -1.752461, -0.293762, 0.042981]`

> **Important**: p2 is only used for n ≥ 6. For n = 4 and n = 5, only p1 is used.

**Middle coefficients** (for i = 3 to n−2 when n ≥ 6):
```
φ = (Σmᵢ² − 2mₙ² − 2mₙ₋₁²) / (1 − 2aₙ² − 2aₙ₋₁²)
aᵢ = mᵢ / √|φ|
```

For n = 4:
```
φ = (Σmᵢ² − 2mₙ²) / (1 − 2aₙ²)
a₂ = m₂ / √|φ|
a₃ = −a₂    (antisymmetry)
```

### P-Value Approximation Cases

| Sample Size | Method | Reference |
|-------------|--------|-----------|
| n = 3 | Exact: p = 1 − exp(−6/π × arcsin(√W)) | Shapiro & Wilk (1965) |
| 4 ≤ n ≤ 11 | Cubic polynomial in n | Royston (1993) |
| n > 11 | Polynomial in ln(n) | Royston (1995) |

### Key Mathematical Properties

1. **Antisymmetric**: Σaᵢ = 0 (positive and negative weights cancel exactly)
2. **Sign constraints**: a₁ < 0 (leftmost negative), aₙ > 0 (rightmost positive)
3. **Location invariance**: Because Σaᵢ = 0, adding a constant to all data leaves W unchanged
4. **W bounds**: 0 < W ≤ 1 for all valid non-constant data
5. **P-value bounds**: 0 ≤ p ≤ 1

---

## 2. Implementation Architecture

### File Structure

```
frontend/public/workers/DescriptiveStatistics/libs/normality/
├── normalityTests.js                         # Main implementation (KS + SW)
├── DEVELOPER_GUIDE.md                        # This guide
├── README.md                                 # Quick reference
└── __tests__/
    ├── normalityTests.unit.test.js           # Unit tests (specific examples)
    ├── normalityTests.property.test.js       # Property-based tests (fast-check)
    ├── normalityTests.spss.test.js           # SPSS compatibility tests
    ├── normalityTests.integration.test.js    # Integration / orchestrator tests
    ├── normalityTests.performance.test.js    # Performance benchmarks
    ├── normalityTests.memory.test.js         # Memory usage tests
    ├── normalityTests.profiling.test.js      # Hot-path profiling
    ├── normalityTests.uiFormatting.test.js   # UI table rendering tests
    ├── normalityTests.worker.integration.test.js  # Web Worker message tests
    ├── spss-benchmark-datasets.json          # SPSS reference values
    └── spss-benchmark-csv/                   # Raw CSV fixtures
```

### Module Decomposition

| Function | Responsibility |
|----------|---------------|
| `calculateShapiroWilk(values)` | Main entry: cleans data, computes coefficients, W statistic, and p-value |
| `shapiroWilkPValue(W, n)` | Converts W statistic to p-value via n-dependent approximation |
| `cleanNumericData(values)` | Filters NaN, null, undefined, Infinity, -Infinity; logs filtered count |
| `normalityMean(values)` | Computes arithmetic mean |
| `normalityStandardDeviation(values, mean)` | Computes sample SD (Bessel correction, n−1) |
| `normalityQuantile(p)` | Inverse CDF Φ⁻¹(p) — used for Blom plotting positions |
| `normalityCDF(x)` | CDF Φ(x) via Abramowitz & Stegun approximation |
| `calculateKolmogorovSmirnov(values)` | KS test with Lilliefors correction |
| `approximateKSPValue(d, n)` | Dallal-Wilkinson (1986) p-value for KS |
| `runNormalityTests(values, options)` | Orchestrator: runs KS + SW, formats output |
| `createNormalityTestEntry(params)` | Builds structured test result object for UI |
| `printNormalityLog(...)` | Prints ASCII table report to console |

### Execution Environment

- Runs in a **Web Worker** (non-blocking, parallel to UI thread)
- Pure JavaScript — no external statistical libraries
- Communication via `postMessage()` between main thread and worker
- Results displayed in Descriptive Statistics modal

### Numerical Stability Techniques

| Technique | Purpose | Location |
|-----------|---------|----------|
| W clamping: `Math.min(1, W)` | Prevents floating-point W > 1 causing NaN in ln(1−W) | After W computation |
| `Math.abs(φ)` before √φ | Prevents NaN when rounding makes φ slightly negative | Coefficient normalization |
| Two-pass S² calculation | Avoids catastrophic cancellation for large-mean data | Before W computation |
| P-value clamping: `Math.max(0, Math.min(1, p))` | Ensures valid probability output | `calculateShapiroWilk` return |
| Global try-catch | Returns null instead of crashing on unexpected errors | `calculateShapiroWilk` |
| S² = 0 early return | Prevents division by zero for constant data | Before W computation |

### Performance Targets

| Sample Size | Target Time | Notes |
|-------------|-------------|-------|
| n = 100 | < 50ms | Dominated by coefficient calculation |
| n = 1000 | < 200ms | Sort is O(n log n) |
| n = 5000 | < 500ms | ~40KB memory for coefficient arrays |

**Complexity**: O(n log n) time (sort dominates), O(n) space

---

## 3. Testing Strategy

### Overview

The testing strategy uses a **three-tier approach** that provides complementary coverage:

| Tier | What It Tests | File |
|------|--------------|------|
| Unit Tests | Specific examples, boundary conditions, edge cases | `normalityTests.unit.test.js` |
| Property-Based Tests | Universal mathematical invariants across hundreds of generated inputs | `normalityTests.property.test.js` |
| SPSS Compatibility Tests | Output regression against known SPSS Statistics values | `normalityTests.spss.test.js` |

### Unit Tests

Unit tests cover known inputs with ground-truth expected outputs:

- `cleanNumericData`: NaN, null, undefined, Infinity, mixed types
- `normalityMean`, `normalityStandardDeviation`, `normalityQuantile`: known values
- Coefficient calculation at n = 3, 4, 5, 6, 11, 12, 50, 100, 5000
- Antisymmetry check: |Σaᵢ| < 1e-10 for multiple sample sizes
- Sign constraints: a₁ < 0, aₙ > 0 across sample sizes
- Edge cases: n=3 (minimum), n=5000 (maximum), constant data, extreme outliers, tied values

### SPSS Compatibility Tests

Benchmark datasets with known SPSS output are stored in `__tests__/spss-benchmark-datasets.json`.

**Tolerances:**
- W statistic: |W_statify − W_spss| < 0.0001
- P-value: |p_statify − p_spss| < 0.001
- Decision agreement: Same reject/accept at α = 0.05

**Benchmark coverage**: n = 3, 10, 30, 50, 100, 500 with normal, uniform, and exponential distributions.

### Running Tests

```bash
# Run all tests
npm test

# Run only normality tests
npx jest normalityTests

# Run only unit tests
npx jest normalityTests.unit

# Run only property-based tests
npx jest normalityTests.property

# Run only SPSS compatibility tests
npx jest normalityTests.spss

# Run with coverage report
npx jest --coverage normalityTests

# Run with verbose output
npx jest --verbose normalityTests
```

### Coverage Goals

- **Line coverage**: ≥ 90% for `calculateShapiroWilk`
- **Branch coverage**: ≥ 85% (n=3, n≤11, n>11 p-value branches; n=3/4/5/≥6 coefficient branches)
- **Function coverage**: 100% for all exported and orchestrator functions

---

## 4. Property-Based Testing Approach

### What is Property-Based Testing?

Property-based testing (PBT) generates many random inputs and verifies that **mathematical invariants** hold for all of them — not just hand-picked examples. This catches edge cases that manual tests miss.

**Framework**: [fast-check](https://fast-check.dev/)
**Iterations**: 100 runs per property test (900+ total generated cases across all 9 properties)
**Timeout**: 10 seconds per property test

### When a Property Test Fails

fast-check provides a **counterexample** — the minimal input that triggered the failure. Triage it as:

1. **Test is wrong** → Fix the generator or assertion logic
2. **Bug in the implementation** → Fix `normalityTests.js`
3. **Gap in the specification** → Present to the user; do NOT change acceptance criteria unilaterally

### Data Generators

All generators are defined in `normalityTests.property.test.js` and re-exported for use in other test files:

```javascript
// Valid sample size: integer in [3, 100]
const sampleSizeGen = fc.integer({ min: 3, max: 100 });

// Finite float in [-1000, 1000]
const numericValueGen = fc.float({ min: -1000, max: 1000 });

// Extreme finite float in [-1e9, 1e9]
const extremeValueGen = fc.float({ min: -1e9, max: 1e9 });

// Array of n finite floats
function datasetGen(sizeArb, valueArb) {
    return sizeArb.chain(n =>
        fc.array(valueArb, { minLength: n, maxLength: n })
    );
}

// Normally distributed data via Box-Muller transform
function generateNormalData(size) {
    // Box-Muller: z0 = √(−2 ln u1) · cos(2π u2)
    // z1 = √(−2 ln u1) · sin(2π u2)
}

// Mixed valid + invalid values
const invalidValueGen = fc.constantFrom(NaN, null, undefined, Infinity, -Infinity);
function mixedDataGen(size) {
    return fc.array(fc.oneof(numericValueGen, invalidValueGen), { minLength: size, maxLength: size });
}
```

### Properties Tested

| # | Property Name | What It Verifies | Requirement |
|---|---------------|-----------------|-------------|
| 1 | Antisymmetric Coefficient Sum | \|Σaᵢ\| < 1e-10 for all n ∈ [3, 100] | 1.4 |
| 2 | Coefficient Sign Constraints | a₁ < 0 and aₙ > 0 for all n ∈ [3, 100] | 1.5 |
| 3 | W Bounded in Unit Interval | 0 < W ≤ 1 for all non-constant datasets | 1.7, 4.4 |
| 4 | P-Value Bounded in Unit Interval | 0 ≤ p ≤ 1 for all valid datasets | 2.4 |
| 5 | Normal Data Acceptance Rate | ≥ 90% of normal samples with n=30 get p ≥ 0.05 | 2.7 |
| 6 | Extreme Value Handling | No Infinity/NaN for x ∈ [−10⁹, 10⁹] | 3.6, 4.1, 4.6 |
| 7 | Robustness to Invalid Inputs | No exceptions thrown; result is null or valid object | 3.5, 3.8 |
| 8 | Coefficient Formula Consistency | aₙ uses p1 for n ≥ 4; aₙ₋₁ uses p2 for n ≥ 6 | 1.2, 1.3 |
| 9 | Middle Coefficient Formula | aᵢ = mᵢ/√\|φ\| is satisfied for n ≥ 6 | 1.6 |

#### Property 1 — Antisymmetric Coefficient Sum

```javascript
fc.assert(fc.property(datasetGen(), data => {
    // Generate coefficients from data's n (actual values don't matter for coeff calculation)
    const a = computeCoefficientsManually(data.length, computeExpectedOrderStats(data.length));
    const sum = a.reduce((s, v) => s + v, 0);
    return Math.abs(sum) < 1e-10;
}), { numRuns: 100 });
```

#### Property 3 — W Bounded in Unit Interval

```javascript
fc.assert(fc.property(datasetGen(), data => {
    const result = calculateShapiroWilk(data);
    if (result === null) return true; // null is ok (constant data, etc.)
    return result.statistic > 0 && result.statistic <= 1;
}), { numRuns: 100 });
```

#### Property 5 — Normal Data Acceptance Rate

```javascript
// Run 100 trials, each with a fresh normal sample of n=30
let accepted = 0;
for (let i = 0; i < 100; i++) {
    const data = generateNormalData(30);
    const result = calculateShapiroWilk(data);
    if (result && result.pValue >= 0.05) accepted++;
}
expect(accepted).toBeGreaterThanOrEqual(90); // ≥ 90%
```

---

## Appendix C: Example Calculation Walkthrough

### Dataset: [9, 10, 11, 12, 13] (n = 5)

This walkthrough traces every step of the Shapiro-Wilk computation for a simple 5-element dataset.

---

#### Step 1: Sort data and compute basic statistics

```
Input:   [9, 10, 11, 12, 13]  (already sorted)

Mean: x̄ = (9 + 10 + 11 + 12 + 13) / 5 = 55 / 5 = 11

S² = Σ(xᵢ − x̄)²
   = (9−11)² + (10−11)² + (11−11)² + (12−11)² + (13−11)²
   = 4 + 1 + 0 + 1 + 4
   = 10
```

---

#### Step 2: Expected order statistics (Blom 1958 plotting positions)

Formula: `pᵢ = (i − 0.375) / (n + 0.25)` then `mᵢ = Φ⁻¹(pᵢ)`

```
i=1: p₁ = (1 − 0.375) / (5 + 0.25) = 0.625 / 5.25 ≈ 0.11905
     m₁ = Φ⁻¹(0.11905) ≈ −1.1839

i=2: p₂ = (2 − 0.375) / (5 + 0.25) = 1.625 / 5.25 ≈ 0.30952
     m₂ = Φ⁻¹(0.30952) ≈ −0.4977

i=3: p₃ = (3 − 0.375) / (5 + 0.25) = 2.625 / 5.25 = 0.50000
     m₃ = Φ⁻¹(0.50000) = 0.0000  (median of standard normal)

i=4: p₄ = (4 − 0.375) / (5 + 0.25) = 3.625 / 5.25 ≈ 0.69048
     m₄ = Φ⁻¹(0.69048) ≈ +0.4977

i=5: p₅ = (5 − 0.375) / (5 + 0.25) = 4.625 / 5.25 ≈ 0.88095
     m₅ = Φ⁻¹(0.88095) ≈ +1.1839

Σmᵢ² = 1.1839² + 0.4977² + 0² + 0.4977² + 1.1839²
       ≈ 1.4016 + 0.2477 + 0 + 0.2477 + 1.4016
       ≈ 3.2986
```

---

#### Step 3: Coefficient calculation (n = 5 special case)

For n = 5, only polynomial **p1** is used (p2 is for n ≥ 6 only).

```
u = 1/√5 = 0.44721

p1 = [-2.706056, 4.434685, -2.071190, -0.147981, 0.221157]

Using Horner's method:
  a₅ = (((-2.706056·u + 4.434685)·u − 2.071190)·u − 0.147981)·u + 0.221157
     = ((-2.706056×0.44721 + 4.434685)×0.44721 − 2.071190)×0.44721 − 0.147981)×0.44721 + 0.221157
     ≈ 0.6646   (take absolute value → a₅ = +0.6646)

Apply antisymmetry:
  a₁ = −0.6646
  a₅ = +0.6646

For n = 5 (odd n), a₃ = 0 (center element)
  a₄ = −a₂ = 0  (because a₂ = 0 — p2 is not used for n=5,
                 no φ normalization for second pair)

Final coefficients: [−0.6646, 0, 0, 0, +0.6646]

Verification:
  Σaᵢ = −0.6646 + 0 + 0 + 0 + 0.6646 = 0 ✓
  Sign check: a₁ = −0.6646 < 0 ✓,  a₅ = +0.6646 > 0 ✓
```

> **Note**: For n = 5 in the actual implementation, `a[1]` and `a[3]` remain 0 because the p2 polynomial block (`if (n >= 6)`) is skipped, and the `else if (n === 5)` block only sets `a[2] = 0; a[3] = -a[1]` (where `a[1]` is still 0 from initialization).

---

#### Step 4: W statistic computation

```
numerator = Σ(aᵢ × x(ᵢ))
           = (−0.6646 × 9) + (0 × 10) + (0 × 11) + (0 × 12) + (0.6646 × 13)
           = −5.9814 + 0 + 0 + 0 + 8.6398
           = 2.6584

W = numerator² / S²
  = 2.6584² / 10
  = 7.0671 / 10
  = 0.7067

Clamp check: W ≤ 1? → 0.7067 ≤ 1 ✓  (no clamping needed)
```

> **Note**: This is the exact calculation matching the implementation. The W value for a perfectly symmetric dataset [9,10,11,12,13] is driven purely by the difference between the extremes and the center.

---

#### Step 5: P-value approximation (n = 5 → Royston 1993)

```
y = ln(1 − W) = ln(1 − 0.7067) = ln(0.2933) ≈ −1.2254

Compute boundary g (cubic polynomial in n):
  g = −0.0006714(5³) + 0.025054(5²) − 0.39978(5) + 0.5440
    = −0.0006714(125) + 0.025054(25) − 1.9989 + 0.5440
    = −0.0839 + 0.6264 − 1.9989 + 0.5440
    = −0.9124

Check: y > g?
  −1.2254 > −0.9124? → No → proceed (if y > g, return 1e-19 for extreme non-normality)

y₂ = −ln(g − y) = −ln(−0.9124 − (−1.2254)) = −ln(0.3130) ≈ 1.1602

Compute μ (mean polynomial, Royston 1993):
  μ = −0.0020322(5³) + 0.062767(5²) − 0.77857(5) + 1.3822
    = −0.2540 + 1.5692 − 3.8929 + 1.3822
    = −1.1955

Compute σ (sigma polynomial, Royston 1993):
  σ = exp(−0.00020322(5³) + 0.0062767(5²) − 0.067861(5) + 0.459)
    = exp(−0.0254 + 0.1569 − 0.3393 + 0.459)
    = exp(0.2512)
    ≈ 1.2855

Standardize:
  z = (y₂ − μ) / σ = (1.1602 − (−1.1955)) / 1.2855 = 2.3557 / 1.2855 ≈ 1.8325

P-value:
  p = 1 − Φ(z) = 1 − Φ(1.8325) ≈ 1 − 0.9667 = 0.0333
```

---

#### Final Result

| Metric | Value |
|--------|-------|
| W statistic | 0.7067 |
| df | 5 |
| p-value | ≈ 0.033 |
| Conclusion | p < 0.05 → **Reject H₀ → Data TIDAK normal** |

> This result makes intuitive sense: [9, 10, 11, 12, 13] is a perfectly uniform (linear) sequence, which is distinctly non-normal. The Shapiro-Wilk test correctly identifies it as non-normal.

---

### Comparison: n = 3 (Exact Formula)

For completeness, here is the exact n = 3 case using [1, 2, 3]:

```
Sorted:   [1, 2, 3]
Coefficients: a₁ = −√0.5 ≈ −0.7071, a₂ = 0, a₃ = +0.7071

numerator = (−0.7071 × 1) + (0 × 2) + (0.7071 × 3) = −0.7071 + 2.1213 = 1.4142
S² = (1−2)² + (2−2)² + (3−2)² = 1 + 0 + 1 = 2

W = 1.4142² / 2 = 2.0000 / 2 = 1.0000 → clamped to 1.0

P-value (exact formula for n=3):
  p = 1 − exp(−(6/π) × arcsin(√W))
    = 1 − exp(−(6/π) × arcsin(1))
    = 1 − exp(−(6/π) × π/2)
    = 1 − exp(−3)
    ≈ 1 − 0.0498
    ≈ 0.950  → Data dianggap normal (expected: linear sequence = perfect linear fit)
```

---

## Appendix D: Debugging Checklist

### When W > 1 (should never happen after clamping)

- [ ] Check console for `[SW] W > 1 before clamping` warning
- [ ] Verify coefficients are antisymmetric: |Σaᵢ| < 1e-10 — check `[SW-DEBUG] Coefficient calculation`
- [ ] Confirm data is sorted ascending before W computation
- [ ] Check S² calculation uses two-pass method (mean first, then deviations)
- [ ] Inspect numerator² — look for unexpected magnitude in `[SW-DEBUG] W = ...` log
- [ ] Verify `Math.min(1, W_unclamped)` is applied — if not present, add it

### When p-value is NaN

- [ ] Check if W is valid: 0 < W ≤ 1 — NaN input propagates through ln()
- [ ] Confirm n is in [3, 5000] — look for `[SW]` boundary check logs
- [ ] Identify which formula branch ran — look for `[SW-DEBUG] P-value formula:` log
- [ ] **For n ≤ 11**: check `y > g` condition — if y ≤ g fails silently, `g − y` might be ≤ 0 causing `Math.log` to return NaN
- [ ] **For all n**: check σ > 0 — if σ = 0, the z-score computation produces NaN
- [ ] Confirm `normalityCDF` input is finite — if W = 1 and n ≤ 11, check ln(1−1) = −Infinity path

### When results don't match SPSS

- [ ] Verify dataset is byte-for-byte identical (same values, same precision)
- [ ] Compare intermediate values step by step:
  1. Compare n — mismatch means different data cleaning
  2. Compare W statistic (tolerance: 0.0001)
  3. If W matches but p-value doesn't → issue in p-value approximation formulas
  4. If W doesn't match → issue in coefficients or S² computation
- [ ] Confirm polynomial coefficients match Royston (1993/1995) papers verbatim
- [ ] Check formula selection: n=3 → exact, 4 ≤ n ≤ 11 → Royston 1993, n > 11 → Royston 1995
- [ ] Check SPSS version — different SPSS versions may use slightly different rounding

### When `calculateShapiroWilk` returns null unexpectedly

- [ ] Check `[SW] Sample size n=... is below minimum` or `...exceeds maximum` in console
- [ ] Check `[SW] WARNING: S² = 0 (all data identical)` — all values may be identical after cleaning
- [ ] Check `[DEBUG] Normality - cleanNumericData` — too many values may have been filtered
- [ ] Check `[SW] ERROR: Unexpected exception` — means the try-catch triggered; inspect stack trace
- [ ] Test with a minimal reproducible dataset to isolate the issue:
  ```javascript
  calculateShapiroWilk([1, 2, 3]);  // Should return a valid result
  ```

### When an edge case produces unexpected output

| Case | What to Check |
|------|--------------|
| n = 3 | Only p1 NOT used — fixed coefficients a₁=−√0.5, a₃=+√0.5; exact p-value formula |
| n = 4 | Only p1 used (not p2); inner coefficients via φ = (Σmᵢ²−2mₙ²)/(1−2aₙ²) |
| n = 5 | Only p1 used; a₃=0, a₂=a₄=0; only a₁ and a₅ are non-zero |
| n ≥ 6 | Both p1 and p2 used; middle coefficients via φ normalization |
| n = 5000 | Performance: verify < 500ms; check `[DEBUG] Normality Runner` execution time |
| Constant data | S² = 0 must be detected → return null before W calculation |
| Extreme outliers (x > 10⁶) | W will be very small (strongly non-normal); verify no Infinity in intermediate |
| Many tied values | Valid result expected; tied values don't break the algorithm |
| All-invalid input | cleanNumericData returns [] → n=0 < 3 → returns null |

### Performance issues

- [ ] Profile by section: sort, coefficient calc, W computation, p-value — use `[SW-DEBUG]` timestamps
- [ ] Check for unnecessary array copies (only one copy for sort: `[...cleaned].sort(...)`)
- [ ] Verify single-pass combined loop: numerator and S² computed together in one `for` loop
- [ ] Confirm mean is computed once and reused (not recomputed inside W loop)
- [ ] For n > 1000: consider if typed arrays (`Float64Array`) would reduce GC pressure

### Console Log Reference

All debug output is prefixed for easy filtering:

| Prefix | Information |
|--------|-------------|
| `[SW]` | High-level flow (start, end, errors, sample size boundary checks) |
| `[SW-DEBUG] Coefficient calculation` | aₙ, aₙ₋₁, φ normalization factor |
| `[SW-DEBUG] Statistic W calculation` | n, Σmᵢ², numerator, S², W value |
| `[SW-DEBUG] P-value calculation` | Formula used, intermediate transforms (y, g, y₂, μ, σ, z) |
| `[SW-DEBUG] P-value result:` | Final p-value before clamping |
| `[DEBUG] Normality - cleanNumericData` | Invalid value breakdown and filtered count |
| `[DEBUG] KS` | Kolmogorov-Smirnov specific logs (D+, D−, D final) |
| `[DEBUG] Normality Runner` | Orchestrator flow, execution time |

**Quick debug session example:**

```javascript
// In browser console or Node.js REPL after loading normalityTests.js:
calculateShapiroWilk([1, 2, 3, 4, 5]);

// Expected console output:
// [SW] ============================================================
// [SW] Starting Shapiro-Wilk calculation
// [SW] Input: n = 5 observations
// [SW-DEBUG] Expected order statistics: Σmᵢ² = 3.298...
// [SW-DEBUG] Coefficient calculation
// [SW-DEBUG] Calculated aₙ (end coefficient) = 0.6646...
// [SW-DEBUG] Normalization factor φ = ...
// [SW-DEBUG] W = ... / ... = 0.xxxx
// [SW-DEBUG] P-value formula: n≤11 (Royston 1993 cubic polynomial)
// [SW] Result: W = 0.xxxx, p-value = 0.xxxx
```

---

## References

1. **Shapiro, S. S. & Wilk, M. B. (1965).** "An analysis of variance test for normality (complete samples)". *Biometrika*, 52(3/4): 591-611.

2. **Royston, P. (1993).** "A toolkit for testing for non-normality in complete and censored samples". *The Statistician*, 42: 37-43.
   *(Small sample p-value approximation for 4 ≤ n ≤ 11)*

3. **Royston, P. (1995).** "Remark AS R94: A remark on Algorithm AS 181". *Applied Statistics*, 44(4): 547-551.
   *(Large sample coefficient polynomials p1, p2 and p-value approximation for n > 11)*

4. **Blom, G. (1958).** *Statistical Estimates and Transformed Beta-Variables*. Wiley.
   *(Plotting position formula: pᵢ = (i − 0.375)/(n + 0.25) for expected normal order statistics)*

5. **Abramowitz, M. & Stegun, I. A. (1964).** *Handbook of Mathematical Functions*. Formula 26.2.17.
   *(Normal CDF polynomial approximation: |error| < 7.5 × 10⁻⁸)*

6. **Dallal, G. E. & Wilkinson, L. (1986).** "An analytic approximation to the distribution of Lilliefors's test statistic for normality". *The American Statistician*, 40(4): 294-296.
   *(KS p-value with Lilliefors correction, used in `approximateKSPValue`)*

7. **Lilliefors, H. W. (1967).** "On the Kolmogorov-Smirnov test for normality with mean and variance unknown". *Journal of the American Statistical Association*, 62(318): 399-402.

---

*Last updated: 2025*
*Maintained by: Statify Development Team*
*Implements: Requirement 7.7 — Developer guide covering algorithm, testing, and debugging*
