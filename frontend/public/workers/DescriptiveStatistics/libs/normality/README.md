# Normality Tests Module

Implementation of the Shapiro-Wilk (SW) and Kolmogorov-Smirnov (KS) normality tests for the Statify platform. This module runs as a Web Worker for non-blocking computation and supports sample sizes from 3 to 5000.

## Overview

- **Algorithm**: Royston AS R94 (1995) with Blom (1958) plotting positions
- **Sample range**: n = 3 to 5000 (SPSS convention)
- **Output**: W statistic, p-value, and normality conclusion
- **Environment**: Browser Web Worker (pure JavaScript, no external libraries)

For a detailed algorithm walkthrough and debugging guide, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

---

## Quick Reference

All commands below must be run from the `frontend/` directory.

| Command | Description |
|---------|-------------|
| `npm test` | Run full test suite (all suites) |
| `npx jest normalityTests` | Run all normality module tests |
| `npx jest normalityTests.unit` | Unit tests only |
| `npx jest normalityTests.property` | Property-based tests only |
| `npx jest normalityTests.spss` | SPSS validation tests only |
| `npx jest normalityTests.integration` | Integration tests only |
| `npx jest normalityTests.performance` | Performance benchmarks only |
| `npx jest normalityTests.memory` | Memory usage tests only |
| `npx jest --coverage normalityTests` | Run with code coverage report |

---

## Running Tests

### Run All Tests

```bash
# From the frontend/ directory:
npm test
```

This runs the full Jest suite (unit, integration, property-based, SPSS validation, performance, and memory tests) and completes within 30 seconds. Heap usage is logged after each test file runs.

### Run Only Normality Module Tests

```bash
npx jest normalityTests
```

Matches all test files with `normalityTests` in the name.

---

## Test Suites

### Unit Tests

Validates specific examples, boundary conditions, edge cases, and helper functions.

```bash
npx jest normalityTests.unit
```

**Covers:**
- Coefficient calculation for n = 3, 4, 5, 6, 11, 12, 50, 100, 5000
- Antisymmetric property (Σaᵢ = 0)
- Coefficient sign constraints (a₁ < 0, aₙ > 0)
- P-value formula selection (n=3 exact, n≤11 Royston 1993, n>11 Royston 1995)
- Edge cases: constant data, extreme outliers, tied values, invalid inputs
- Helper functions: `cleanNumericData`, `normalityMean`, `normalityStandardDeviation`, `normalityQuantile`

**File:** `__tests__/normalityTests.unit.test.js`

---

### Property-Based Tests

Uses [fast-check](https://github.com/dubzzz/fast-check) to verify mathematical invariants across hundreds of randomly generated inputs. Each property runs 100 iterations.

```bash
npx jest normalityTests.property
```

> **Note:** Property-based tests may take up to 30 seconds due to the 100-iteration count per property. This is expected behaviour.

**Properties validated:**

| # | Property | Requirement |
|---|----------|-------------|
| 1 | Antisymmetric Coefficient Sum: \|Σaᵢ\| < 1e-10 | 1.4 |
| 2 | Coefficient Sign Constraints: a₁ < 0, aₙ > 0 | 1.5 |
| 3 | W Statistic Bounded in (0, 1] | 1.7, 4.4 |
| 4 | P-Value Bounded in [0, 1] | 2.4 |
| 5 | Normal Data Acceptance Rate ≥ 90% | 2.7 |
| 6 | Extreme Value Handling (no Infinity/NaN) | 3.6, 4.1 |
| 7 | Robustness to Invalid Inputs | 3.5, 3.8 |
| 8 | Coefficient Formula Consistency | 1.2, 1.3 |
| 9 | Middle Coefficient Formula Correctness | 1.6 |

**File:** `__tests__/normalityTests.property.test.js`

---

### SPSS Validation Tests

Compares Statify output against reference values from SPSS Statistics 28.0.

```bash
npx jest normalityTests.spss
```

**Tolerance thresholds:**
- W statistic: |W_statify − W_spss| < 0.0001
- P-value: |p_statify − p_spss| < 0.001
- Decision agreement: identical reject/accept at α = 0.05

**Benchmark datasets:** Stored in `__tests__/spss-benchmark-datasets.json`
Includes normal, uniform, and exponential distributions at n = 3, 10, 30, 50, 100, 500.

**File:** `__tests__/normalityTests.spss.test.js`

---

### Integration Tests

Validates the `runNormalityTests` orchestrator, structured output format, and backward compatibility.

```bash
npx jest normalityTests.integration
```

**Covers:**
- Structured output with `tests[]` array
- Both KS and SW results returned together
- `unavailableReason` for n > 5000
- Success flag and backward compatibility keys

**File:** `__tests__/normalityTests.integration.test.js`

---

### Performance Benchmarks

Measures execution time against defined performance targets. Each benchmark runs 7 measured iterations (plus 3 warmup iterations to eliminate JIT overhead) and reports the **median** time.

```bash
# Run benchmarks (use --verbose to see the timing table in console output)
npx jest normalityTests.performance --verbose
```

**Target thresholds:**

| Sample Size | Target | Notes |
|-------------|--------|-------|
| n = 100 | < 50ms | Typical interactive analysis |
| n = 1000 | < 200ms | Medium dataset |
| n = 5000 | < 500ms | Maximum supported size |

**Interpreting the output:**

When run with `--verbose`, each benchmark prints a timing breakdown to console:

```
[PERFORMANCE] Shapiro-Wilk n=5000:
  Median: 12.345 ms
  Min:    11.200 ms
  Max:    15.600 ms
  All:    [11.200, 11.500, 12.000, 12.345, 13.100, 14.200, 15.600] ms
```

A summary table is also printed showing all three sizes side by side with pass/fail (✓/✗) indicators:

```
[PERFORMANCE SUMMARY] Shapiro-Wilk Execution Times
  +--------+-----------+-----------+-----------+-----------+
  |   n    |  Median   |    Min    |    Max    | Threshold |
  +--------+-----------+-----------+-----------+-----------+
  |   100  |   0.512 ms|   0.487 ms|   0.621 ms|    50 ms ✓|
  |  1000  |   3.210 ms|   2.980 ms|   4.100 ms|   200 ms ✓|
  |  5000  |  12.345 ms|  11.200 ms|  15.600 ms|   500 ms ✓|
  +--------+-----------+-----------+-----------+-----------+
```

**Tips:**
- If any threshold is exceeded, check for background CPU load (close other tabs/processes and re-run).
- The test uses seeded pseudo-random data (Box-Muller transform) for reproducibility.
- Scaling analysis is also logged: a 10x increase in n should result in less than 15x time increase (O(n log n) sort dominates).

**File:** `__tests__/normalityTests.performance.test.js`

---

### Memory Tests

Validates memory usage stays within bounds.

```bash
npx jest normalityTests.memory
```

**Target:** Memory allocation < 10MB for n = 5000.

```bash
# Run with heap usage logging for more detail
npx jest normalityTests.memory --logHeapUsage
```

**File:** `__tests__/normalityTests.memory.test.js`

---

### Profiling Tests

Profiles execution time breakdown by computation phase (sort, coefficient calculation, W statistic, p-value).

```bash
npx jest normalityTests.profiling --verbose
```

**File:** `__tests__/normalityTests.profiling.test.js`

---

### Web Worker Integration Tests

Tests data transfer between main thread and worker, and message passing overhead.

```bash
npx jest normalityTests.worker.integration
```

**File:** `__tests__/normalityTests.worker.integration.test.js`

---

### UI Formatting Tests

Validates table rendering, decimal formatting, and conclusion display.

```bash
npx jest normalityTests.uiFormatting
```

**Covers:**
- W statistic formatted to 8 decimal places
- P-value formatted to 3 decimal places
- Conclusion text: "Data dianggap normal" / "Data TIDAK normal"
- Row highlighting when p < α

**File:** `__tests__/normalityTests.uiFormatting.test.js`

---

## Coverage Report

Generate a coverage report for the normality module:

```bash
npx jest --coverage normalityTests
```

Coverage reports are output to `frontend/coverage/` in text, lcov, and HTML formats.

**Target:** ≥ 90% line coverage on `calculateShapiroWilk`.

---

## Useful Options

```bash
# Watch mode (re-runs on file changes during development)
npx jest --watch normalityTests

# Run only previously failed tests
npx jest --onlyFailures

# Run with verbose output (shows console.log output from tests)
npx jest --verbose normalityTests

# Bail on first failure
npx jest --bail normalityTests

# Log heap usage after each test file (useful alongside memory tests)
npx jest --logHeapUsage normalityTests

# Run with verbose output and heap logging (recommended for benchmarking)
npx jest --verbose --logHeapUsage normalityTests.performance
```

---

## Project Structure

```
frontend/public/workers/DescriptiveStatistics/libs/normality/
├── normalityTests.js                    # Main implementation (KS + SW)
├── README.md                            # This file
├── DEVELOPER_GUIDE.md                   # Algorithm details & debugging
└── __tests__/
    ├── normalityTests.unit.test.js           # Unit tests
    ├── normalityTests.property.test.js       # Property-based tests (fast-check)
    ├── normalityTests.spss.test.js           # SPSS compatibility tests
    ├── normalityTests.integration.test.js    # Integration tests
    ├── normalityTests.performance.test.js    # Performance benchmarks
    ├── normalityTests.memory.test.js         # Memory usage tests
    ├── normalityTests.profiling.test.js      # Execution profiling
    ├── normalityTests.worker.integration.test.js  # Worker tests
    ├── normalityTests.uiFormatting.test.js   # UI formatting tests
    ├── spss-benchmark-datasets.json          # SPSS reference values
    ├── spss-benchmark-csv/                   # Raw CSV benchmark data
    ├── generate-spss-benchmarks.js           # Benchmark generation script
    └── verify_logging.js                     # Logging verification utility
```

---

## References

- Royston, P. (1993). "A toolkit for testing for non-normality in complete and censored samples". *The Statistician*, 42: 37-43.
- Royston, P. (1995). "Remark AS R94". *Applied Statistics*, 44(4): 547-551.
- Blom, G. (1958). *Statistical Estimates and Transformed Beta-Variables*. Wiley.
