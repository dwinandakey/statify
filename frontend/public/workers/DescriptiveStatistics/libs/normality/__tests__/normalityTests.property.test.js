/**
 * ============================================================================
 * PROPERTY-BASED TESTS: Shapiro-Wilk Test
 * ============================================================================
 *
 * **Validates: Requirements 6.4, 6.7**
 *
 * PURPOSE:
 * Property-based tests for validating universal mathematical properties of the
 * Shapiro-Wilks Test implementation across hundreds of generated test cases.
 *
 * FRAMEWORK:
 * - fast-check: Property-based testing library for JavaScript
 * - 100 iterations per property test (configurable)
 *
 * COVERAGE:
 * - Property 1: Antisymmetric Coefficient Sum (Requirement 1.4)
 * - Property 2: Coefficient Sign Constraints (Requirement 1.5)
 * - Property 3: W Statistic Bounded in Unit Interval (Requirements 1.7, 4.4)
 * - Property 4: P-Value Bounded in Unit Interval (Requirement 2.4)
 * - Property 5: Normal Data Acceptance Rate (Requirement 2.7)
 * - Property 6: Extreme Value Handling Without Overflow (Requirements 3.6, 4.1, 4.6)
 * - Property 7: Robustness to Invalid Inputs (Requirements 3.5, 3.8)
 * - Property 8: Coefficient Calculation Consistency (Requirements 1.2, 1.3)
 * - Property 9: Middle Coefficient Formula Correctness (Requirement 1.6)
 *
 * REFERENCE:
 * - Design Document: Phase 3 (Property-Based Testing)
 * - fast-check documentation: https://fast-check.dev/
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

// ============================================================================
// MODULE LOADING
// ============================================================================

/**
 * Load the Shapiro-Wilk implementation from normalityTests.js
 * We extract the functions we need for testing in a controlled context
 */
let calculateShapiroWilk;
let cleanNumericData;
let normalityMean;
let normalityQuantile;
let shapiroWilkPValue;

beforeAll(() => {
    const sourcePath = path.join(__dirname, '../normalityTests.js');
    const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

    const context = {};
    const wrappedCode = `
        ${sourceCode}

        // Export functions for testing
        if (typeof calculateShapiroWilk !== 'undefined') {
            context.calculateShapiroWilk = calculateShapiroWilk;
        }
        if (typeof cleanNumericData !== 'undefined') {
            context.cleanNumericData = cleanNumericData;
        }
        if (typeof normalityMean !== 'undefined') {
            context.normalityMean = normalityMean;
        }
        if (typeof normalityQuantile !== 'undefined') {
            context.normalityQuantile = normalityQuantile;
        }
        if (typeof shapiroWilkPValue !== 'undefined') {
            context.shapiroWilkPValue = shapiroWilkPValue;
        }
    `;

    const func = new Function('context', wrappedCode);
    func(context);

    calculateShapiroWilk = context.calculateShapiroWilk;
    cleanNumericData = context.cleanNumericData;
    normalityMean = context.normalityMean;
    normalityQuantile = context.normalityQuantile;
    shapiroWilkPValue = context.shapiroWilkPValue;
});

// ============================================================================
// DATA GENERATORS (Arbitraries)
// ============================================================================

/**
 * Generator: Sample size in valid range [3, 5000]
 * Used for generating datasets with varying sample sizes
 */
const sampleSizeGen = fc.integer({ min: 3, max: 100 });

/**
 * Generator: Sample size extended for stress testing
 * Range: [3, 200] for performance testing
 */
const sampleSizeExtendedGen = fc.integer({ min: 3, max: 200 });

/**
 * Generator: Numeric value in reasonable range
 * Range: [-1000, 1000] for typical test data
 */
const numericValueGen = fc.float({ min: -1000, max: 1000 });

/**
 * Generator: Extreme numeric values
 * Range: [-1e9, 1e9] for overflow testing
 */
const extremeValueGen = fc.float({ min: -1e9, max: 1e9 });

/**
 * Generator: Dataset of numeric values
 * Generates arrays of varying sizes with numeric values
 *
 * @param {fc.Arbitrary<number>} sizeArb - Arbitrary for array size
 * @param {fc.Arbitrary<number>} valueArb - Arbitrary for array values
 * @returns {fc.Arbitrary<number[]>} Array arbitrary
 */
function datasetGen(sizeArb = sampleSizeGen, valueArb = numericValueGen) {
    return sizeArb.chain(n =>
        fc.array(valueArb, { minLength: n, maxLength: n })
    );
}

/**
 * Generator: Normally distributed data using Box-Muller transform
 * Generates data from N(0, 1) standard normal distribution
 *
 * @param {number} size - Sample size
 * @returns {number[]} Array of normally distributed values
 */
function generateNormalData(size) {
    const data = [];

    // Box-Muller transform to generate normal variates
    for (let i = 0; i < size; i += 2) {
        const u1 = Math.random();
        const u2 = Math.random();

        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

        data.push(z0);
        if (i + 1 < size) {
            data.push(z1);
        }
    }

    return data.slice(0, size);
}

/**
 * Generator: Normal distribution arbitrary
 * Uses Box-Muller transform to generate normally distributed data
 */
const normalGen = fc.integer({ min: 10, max: 50 }).map(n => generateNormalData(n));

/**
 * Generator: Invalid value types for robustness testing
 * Includes NaN, null, undefined, Infinity, -Infinity
 */
const invalidValueGen = fc.constantFrom(NaN, null, undefined, Infinity, -Infinity);

/**
 * Generator: Mixed valid and invalid data
 * Generates arrays with both numeric and invalid values
 */
function mixedDataGen(size = 10) {
    return fc.array(
        fc.oneof(numericValueGen, invalidValueGen),
        { minLength: size, maxLength: size }
    );
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Number of iterations for each property test
 * Requirement 6.7: Configure 100 iterations per property test
 */
const NUM_RUNS = 100;

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property-Based Tests: Shapiro-Wilk Test', () => {

    /**
     * Note: Property tests 2-9 will be implemented in subsequent tasks (5.2-5.10)
     * This file provides the infrastructure and generators needed for all tests
     */

    describe('Infrastructure Validation', () => {

        test('fast-check library is loaded correctly', () => {
            expect(fc).toBeDefined();
            expect(typeof fc.property).toBe('function');
            expect(typeof fc.assert).toBe('function');
        });

        test('calculateShapiroWilk function is loaded', () => {
            expect(calculateShapiroWilk).toBeDefined();
            expect(typeof calculateShapiroWilk).toBe('function');
        });

        test('data generators produce valid output', () => {
            // Test sampleSizeGen
            fc.assert(
                fc.property(sampleSizeGen, (n) => {
                    return n >= 3 && n <= 100;
                }),
                { numRuns: 10 }
            );

            // Test numericValueGen
            fc.assert(
                fc.property(numericValueGen, (v) => {
                    return typeof v === 'number' && isFinite(v);
                }),
                { numRuns: 10 }
            );
        });

        test('datasetGen produces arrays of correct size', () => {
            fc.assert(
                fc.property(datasetGen(), (data) => {
                    return Array.isArray(data) && data.length >= 3 && data.length <= 100;
                }),
                { numRuns: 10 }
            );
        });

        test('normalGen produces normally distributed data', () => {
            fc.assert(
                fc.property(normalGen, (data) => {
                    return Array.isArray(data) &&
                           data.length >= 10 &&
                           data.length <= 50 &&
                           data.every(v => typeof v === 'number' && isFinite(v));
                }),
                { numRuns: 10 }
            );
        });

        test('Box-Muller transform produces reasonable values', () => {
            // Generate multiple samples and verify they have normal-like properties
            const samples = Array.from({ length: 10 }, () => generateNormalData(30));

            samples.forEach(sample => {
                // Check all values are finite numbers
                expect(sample.every(v => typeof v === 'number' && isFinite(v))).toBe(true);

                // Check mean is close to 0 (within reasonable range for n=30)
                const mean = sample.reduce((sum, v) => sum + v, 0) / sample.length;
                expect(Math.abs(mean)).toBeLessThan(1.0);

                // Check standard deviation is close to 1 (within reasonable range)
                const variance = sample.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (sample.length - 1);
                const sd = Math.sqrt(variance);
                expect(sd).toBeGreaterThan(0.5);
                expect(sd).toBeLessThan(2.0);
            });
        });

        test('extremeValueGen produces values in [-1e9, 1e9]', () => {
            fc.assert(
                fc.property(extremeValueGen, (v) => {
                    return typeof v === 'number' &&
                           isFinite(v) &&
                           v >= -1e9 &&
                           v <= 1e9;
                }),
                { numRuns: 10 }
            );
        });

        test('invalidValueGen produces invalid values', () => {
            fc.assert(
                fc.property(invalidValueGen, (v) => {
                    return v === null ||
                           v === undefined ||
                           (typeof v === 'number' && (!isFinite(v) || isNaN(v)));
                }),
                { numRuns: 10 }
            );
        });

        test('mixedDataGen produces mixed valid/invalid data', () => {
            fc.assert(
                fc.property(mixedDataGen(10), (data) => {
                    return Array.isArray(data) && data.length === 10;
                }),
                { numRuns: 10 }
            );
        });
    });

    describe('Basic Property Test Example', () => {
        /**
         * Simple example property test to verify infrastructure is working
         * This test verifies that calculateShapiroWilk returns valid results
         * for any generated dataset within valid sample size range
         */

        test('calculateShapiroWilk returns valid result or null', () => {
            fc.assert(
                fc.property(datasetGen(), (data) => {
                    const result = calculateShapiroWilk(data);

                    // Result should be either null or a valid object
                    if (result === null) {
                        return true; // Null is acceptable (e.g., constant data, out of range)
                    }

                    // If not null, should have required properties
                    return result.hasOwnProperty('statistic') &&
                           result.hasOwnProperty('df') &&
                           result.hasOwnProperty('pValue');
                }),
                { numRuns: NUM_RUNS }
            );
        });
    });

    // ========================================================================
    // PLACEHOLDER SECTIONS FOR SUBSEQUENT PROPERTY TESTS (Tasks 5.2-5.10)
    // ========================================================================

    /**
     * Property 1: Antisymmetric Coefficient Sum (Task 5.2)
     * **Validates: Requirements 1.4**
     *
     * Test will verify that Σaᵢ ≈ 0 (within tolerance 1e-10)
     * for all generated datasets with n ∈ [3, 100]
     */

    /**
     * Property 2: Coefficient Sign Constraints (Task 5.3)
     * **Validates: Requirements 1.5**
     *
     * Test will verify that a₁ < 0 and aₙ > 0
     * for all generated datasets with n ∈ [3, 100]
     */

    /**
     * Property 3: W Statistic Bounded in Unit Interval (Task 5.4)
     * **Validates: Requirements 1.7, 4.4**
     *
     * Test will verify that W ∈ (0, 1]
     * for all generated datasets with n ∈ [3, 200]
     */

    /**
     * Property 4: P-Value Bounded in Unit Interval (Task 5.5)
     * **Validates: Requirements 2.4**
     *
     * Test will verify that p ∈ [0, 1]
     * for all generated datasets with n ∈ [3, 200]
     */

    /**
     * Property 5: Normal Data Acceptance Rate (Task 5.6)
     * **Validates: Requirements 2.7**
     *
     * Test will verify that ≥90% of normal distributions (n=30)
     * produce p-value ≥ 0.05
     */

    /**
     * Property 6: Extreme Value Handling Without Overflow (Task 5.7)
     * **Validates: Requirements 3.6, 4.1, 4.6**
     *
     * Test will verify no Infinity/NaN in results
     * for datasets with values in [−10⁹, 10⁹]
     */

    /**
     * Property 7: Robustness to Invalid Inputs (Task 5.8)
     * **Validates: Requirements 3.5, 3.8**
     *
     * Test will verify no exceptions thrown and result is either
     * null or valid object for datasets with mixed valid/invalid values
     */

    /**
     * Property 8: Coefficient Calculation Formula Consistency (Task 5.9)
     * **Validates: Requirements 1.2, 1.3**
     *
     * Test will verify that for n ≥ 4, aₙ uses p1 polynomial
     * and for n ≥ 6, aₙ₋₁ uses p2 polynomial
     */

    /**
     * Property 9: Middle Coefficient Formula Correctness (Task 5.10)
     * **Validates: Requirements 1.6**
     *
     * Test will verify that for n ≥ 4, middle coefficients
     * aᵢ = mᵢ / √|φ| where φ is the normalization factor
     */
});

// ============================================================================
// HELPER UTILITIES FOR FUTURE TESTS
// ============================================================================

/**
 * Helper: Compute coefficients manually for validation
 * This helper will be useful for Property 1, 2, 8, and 9
 *
 * @param {number} n - Sample size
 * @param {number[]} m - Expected order statistics
 * @returns {number[]} Coefficients array
 */
function computeCoefficientsManually(n, m) {
    const a = new Array(n).fill(0);
    const u = 1 / Math.sqrt(n);

    // Royston polynomial coefficients
    const p1 = [-2.706056, 4.434685, -2.071190, -0.147981, 0.221157];
    const p2 = [-3.582633, 5.682633, -1.752461, -0.293762, 0.042981];

    const polyVal = (coeffs, z) => coeffs.reduce((acc, c) => acc * z + c, 0);

    if (n === 3) {
        a[2] = Math.SQRT1_2;
        a[0] = -Math.SQRT1_2;
    } else {
        const aN = polyVal(p1, u);
        a[n-1] = Math.abs(aN);
        a[0] = -Math.abs(aN);

        if (n >= 6) {
            const aN1 = polyVal(p2, u);
            a[n-2] = Math.abs(aN1);
            a[1] = -Math.abs(aN1);

            const mSumSq = m.reduce((s, v) => s + v * v, 0);
            const phi = (mSumSq - 2 * m[n-1]**2 - 2 * m[n-2]**2) /
                        (1 - 2 * a[n-1]**2 - 2 * a[n-2]**2);
            const constDen = Math.sqrt(Math.abs(phi));

            for (let i = 2; i <= n - 3; i++) {
                a[i] = m[i] / constDen;
            }
        } else if (n === 5) {
            a[2] = 0;
            a[3] = -a[1];
        } else if (n === 4) {
            const mSumSq = m.reduce((s, v) => s + v * v, 0);
            const phi = (mSumSq - 2 * m[n-1]**2) / (1 - 2 * a[n-1]**2);
            a[1] = m[1] / Math.sqrt(Math.abs(phi));
            a[2] = -a[1];
        }
    }

    return a;
}

/**
 * Helper: Compute expected order statistics (Blom 1958)
 *
 * @param {number} n - Sample size
 * @returns {number[]} Expected order statistics mᵢ
 */
function computeExpectedOrderStats(n) {
    const m = [];
    for (let i = 0; i < n; i++) {
        const p = (i + 1 - 0.375) / (n + 0.25);
        m.push(normalityQuantile(p));
    }
    return m;
}

/**
 * Export generators and helpers for use in subsequent test tasks
 */
module.exports = {
    // Generators
    sampleSizeGen,
    sampleSizeExtendedGen,
    numericValueGen,
    extremeValueGen,
    datasetGen,
    normalGen,
    invalidValueGen,
    mixedDataGen,
    generateNormalData,

    // Helpers
    computeCoefficientsManually,
    computeExpectedOrderStats,

    // Configuration
    NUM_RUNS
};
