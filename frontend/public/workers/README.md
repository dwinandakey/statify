# Worker Architecture Patterns

This document describes the architecture patterns used across the statistical analysis workers in Statify.

## Standard Pattern: Calculator Class + Manager

Most modules follow this structure:
- `libs/*.js` defines `Calculator` classes
- `manager.js` routes requests via `calculators` map
- Examples: OneWayAnova, TTest, ChiSquare, Runs

### Standard Pattern Example

```javascript
// libs/exampleCalculator.js
export class ExampleCalculator {
  constructor() {
    // initialization
  }

  calculate(data) {
    // implementation
    return result;
  }
}

// manager.js
import { ExampleCalculator } from './libs/exampleCalculator.js';

const calculators = {
  'example': new ExampleCalculator()
};

self.onmessage = function(e) {
  const { type, data } = e.data;
  const calculator = calculators[type];

  if (calculator) {
    const result = calculator.calculate(data);
    self.postMessage(result);
  }
};
```

### Modules Using Standard Pattern

- **CompareMeans** (`OneWayAnova`, `TTest`)
  - `libs/oneWayAnova.js` - ANOVA calculations
  - `libs/tTest.js` - T-Test calculations
  - `manager.js` - Routes between test types

- **NonparametricTests** (`ChiSquare`, `Runs`, `Binomial`)
  - `libs/chiSquare.js` - Chi-square test calculations
  - `libs/runsTest.js` - Runs test calculations
  - `libs/binomialTest.js` - Binomial test calculations
  - `manager.js` - Routes between test types

- **Correlate** (`Pearson`, `Spearman`, `Kendall`)
  - `libs/pearson.js` - Pearson correlation
  - `libs/spearman.js` - Spearman rank correlation
  - `libs/kendall.js` - Kendall's tau correlation
  - `manager.js` - Routes between correlation types

## Exceptions to Standard Pattern

### 1. Normality Tests (Descriptive Statistics)

**Location:** `DescriptiveStatistics/libs/normality/`

**Pattern:** Pure functions instead of classes

**Why different:**
- Called via `importScripts()` by `examine.js`
- Not managed by manager pattern
- Functions are directly imported and executed

**Structure:**
```javascript
// normalityTests.js
export function calculateKolmogorovSmirnov(values) { ... }
export function calculateShapiroWilk(values) { ... }

// examine.worker.js
importScripts('./libs/normality/normalityTests.js');
const ksResult = calculateKolmogorovSmirnov(data);
```

### 2. Regression Normality (Separate Implementation)

**Location:** `Regression/Assumption Test/normality.js`

**Pattern:** Standalone worker with self-contained implementation

**Why different:**
- Separate implementation for residual analysis
- Uses asymptotic KS + includes Jarque-Bera
- Different p-value approximation methods tailored for regression context

**Key Differences from Descriptive Statistics Normality:**
- Includes Jarque-Bera test (not in descriptive stats version)
- Uses asymptotic Kolmogorov-Smirnov p-values
- Optimized for analyzing regression residuals

### 3. Bartlett Test (Legacy Pattern)

**Location:** `CompareMeans/bartlettTestWorker.js`

**Pattern:** Standalone worker (legacy pattern)

**Why different:**
- Historical implementation before Calculator pattern was standardized
- TODO: Refactor to Calculator class + integrate with manager

**Current Structure:**
```javascript
// bartlettTestWorker.js (standalone)
self.onmessage = function(e) {
  // Direct implementation without Calculator class
  const result = performBartlettTest(e.data);
  self.postMessage(result);
};
```

**Recommended Refactor:**
```javascript
// Future: libs/bartlett.js
export class BartlettCalculator {
  calculate(data) { ... }
}

// Future: integrate into CompareMeans/manager.js
import { BartlettCalculator } from './libs/bartlett.js';
const calculators = {
  'bartlett': new BartlettCalculator()
};
```

## Architecture Benefits

### Standard Pattern Benefits
1. **Modularity** - Each test is in its own file
2. **Testability** - Classes can be unit tested independently
3. **Maintainability** - Clear separation of concerns
4. **Scalability** - Easy to add new tests by adding new Calculator classes

### When to Use Exceptions
- **Pure Functions** (like normality tests in descriptive stats)
  - When functions need to be imported dynamically via `importScripts()`
  - When class overhead is not needed

- **Standalone Workers** (temporary, for legacy code)
  - Only during migration period
  - Should be refactored to standard pattern when possible

## Adding New Statistical Tests

### For Standard Pattern
1. Create a new Calculator class in `libs/yourTest.js`
2. Export the Calculator class
3. Import and register in `manager.js`
4. Add tests in `__tests__/yourTest.test.js`

### For Pure Function Pattern
1. Only if the function needs to be dynamically imported
2. Ensure comprehensive inline documentation
3. Add tests in `__tests__/yourTest.test.js`

## Testing Guidelines

All statistical calculations should have:
- ✅ Unit tests with known reference values
- ✅ Edge case handling (empty data, single value, constant data)
- ✅ Numerical stability tests
- ✅ SPSS/R/Python output validation (where applicable)

## Migration Notes

**In Progress:**
- Bartlett Test migration to Calculator pattern + manager integration

**Completed:**
- Chi-Square, Runs, Binomial → Calculator + manager pattern
- OneWayAnova, TTest → Calculator + manager pattern

## Related Documentation

- `DescriptiveStatistics/README.md` - Descriptive statistics implementation details
- `Regression/README.md` - Regression analysis architecture
- `shared/README.md` - Shared utility functions
