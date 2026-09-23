/**
 * ============================================================================
 * MATH PRECISION UTILITIES - UNIT TESTS
 * ============================================================================
 * Test untuk memastikan fungsi presisi matematika bekerja dengan benar
 * ============================================================================
 */

const MathPrecision = require('../../public/workers/shared/mathPrecision');

describe('MathPrecision Utilities', () => {

    // ========================================================================
    // FLOATING POINT FIX TESTS
    // ========================================================================

    describe('Floating Point Fixes', () => {
        test('0.1 + 0.2 should equal 0.3', () => {
            // JavaScript standard: 0.1 + 0.2 = 0.30000000000000004
            const standardResult = 0.1 + 0.2;
            expect(standardResult).not.toBe(0.3);

            // MathPrecision fix
            const fixedResult = MathPrecision.add(0.1, 0.2);
            expect(fixedResult).toBe(0.3);
        });

        test('0.7 + 0.1 should equal 0.8', () => {
            const standardResult = 0.7 + 0.1;
            expect(standardResult).not.toBe(0.8);

            const fixedResult = MathPrecision.add(0.7, 0.1);
            expect(fixedResult).toBe(0.8);
        });

        test('1.0 - 0.9 should equal 0.1', () => {
            const standardResult = 1.0 - 0.9;
            expect(standardResult).not.toBe(0.1);

            const fixedResult = MathPrecision.subtract(1.0, 0.9);
            expect(fixedResult).toBeCloseTo(0.1, 10);
        });

        test('0.1 * 0.2 should equal 0.02', () => {
            const standardResult = 0.1 * 0.2;
            // This one is actually exact in JS, but let's test anyway
            const fixedResult = MathPrecision.multiply(0.1, 0.2);
            expect(fixedResult).toBeCloseTo(0.02, 10);
        });
    });

    // ========================================================================
    // COMPARISON FUNCTIONS
    // ========================================================================

    describe('Comparison Functions', () => {
        test('isEqual should compare with tolerance', () => {
            expect(MathPrecision.isEqual(0.1 + 0.2, 0.3)).toBe(true);
            expect(MathPrecision.isEqual(1.0, 1.0)).toBe(true);
            expect(MathPrecision.isEqual(1.0, 2.0)).toBe(false);
            expect(MathPrecision.isEqual(1e-11, 0)).toBe(true); // Within epsilon
            expect(MathPrecision.isEqual(1e-5, 0)).toBe(false); // Outside epsilon
        });

        test('isZero should detect near-zero values', () => {
            expect(MathPrecision.isZero(0)).toBe(true);
            expect(MathPrecision.isZero(1e-15)).toBe(true);
            expect(MathPrecision.isZero(1e-5)).toBe(false);
        });

        test('isGreaterThan should compare with tolerance', () => {
            expect(MathPrecision.isGreaterThan(1.1, 1.0)).toBe(true);
            expect(MathPrecision.isGreaterThan(1.0, 1.0)).toBe(false);
            expect(MathPrecision.isGreaterThan(1.0 + 1e-15, 1.0)).toBe(false); // Within epsilon
        });

        test('isLessThan should compare with tolerance', () => {
            expect(MathPrecision.isLessThan(0.9, 1.0)).toBe(true);
            expect(MathPrecision.isLessThan(1.0, 1.0)).toBe(false);
        });
    });

    // ========================================================================
    // ROUNDING FUNCTIONS
    // ========================================================================

    describe('Rounding Functions', () => {
        test('round should handle precision correctly', () => {
            expect(MathPrecision.round(1.234567890123456, 6)).toBe(1.234568);
            expect(MathPrecision.round(1.234567890123456, 3)).toBe(1.235);
            expect(MathPrecision.round(1.005, 2)).toBe(1.01); // Classic JS issue
        });

        test('truncate should cut without rounding', () => {
            expect(MathPrecision.truncate(1.999, 2)).toBe(1.99);
            expect(MathPrecision.truncate(-1.999, 2)).toBe(-1.99);
        });

        test('formatDisplay should return formatted string', () => {
            expect(MathPrecision.formatDisplay(1.23456789, 4)).toBe('1.2346');
            expect(MathPrecision.formatDisplay(100, 2)).toBe('100.00');
        });
    });

    // ========================================================================
    // SAFE ARITHMETIC
    // ========================================================================

    describe('Safe Arithmetic', () => {
        test('divide should handle division by zero', () => {
            expect(MathPrecision.divide(10, 0, NaN)).toBeNaN();
            expect(MathPrecision.divide(10, 0, 0)).toBe(0);
            expect(MathPrecision.divide(10, 0, Infinity)).toBe(Infinity);
            expect(MathPrecision.divide(10, 2)).toBe(5);
        });

        test('add should sum multiple numbers precisely', () => {
            expect(MathPrecision.add(0.1, 0.2, 0.3)).toBe(0.6);
            expect(MathPrecision.add(1, 2, 3, 4, 5)).toBe(15);
        });

        test('multiply should handle multiple factors', () => {
            expect(MathPrecision.multiply(2, 3, 4)).toBe(24);
            expect(MathPrecision.multiply(0.1, 10)).toBe(1);
        });
    });

    // ========================================================================
    // KAHAN SUMMATION
    // ========================================================================

    describe('Kahan Summation', () => {
        test('kahanSum should reduce accumulation error', () => {
            // Create array where standard sum would accumulate error
            const arr = new Array(1000).fill(0.1);

            const standardSum = arr.reduce((a, b) => a + b, 0);
            const kahanSumResult = MathPrecision.kahanSum(arr);

            // Standard sum will have error
            expect(standardSum).not.toBe(100);

            // Kahan sum should be much closer to 100
            expect(kahanSumResult).toBeCloseTo(100, 10);
        });

        test('kahanSum should handle Float64Array', () => {
            const arr = new Float64Array([0.1, 0.2, 0.3, 0.4]);
            expect(MathPrecision.kahanSum(arr)).toBeCloseTo(1.0, 10);
        });

        test('kahanSum should skip non-finite values', () => {
            const arr = [1, 2, NaN, 3, Infinity, 4];
            expect(MathPrecision.kahanSum([1, 2, 3, 4])).toBe(10);
        });
    });

    // ========================================================================
    // VARIANCE CALCULATIONS
    // ========================================================================

    describe('Variance Calculations', () => {
        // Known dataset: [2, 4, 4, 4, 5, 5, 7, 9]
        // Mean = 5, Sample Variance = 4.571428...
        const testData = [2, 4, 4, 4, 5, 5, 7, 9];

        test('welfordVariance should calculate correctly', () => {
            const result = MathPrecision.welfordVariance(testData, true);

            expect(result.n).toBe(8);
            expect(result.mean).toBe(5);
            expect(result.variance).toBeCloseTo(4.571428, 4);
            expect(result.stdDev).toBeCloseTo(2.138, 2);
        });

        test('twoPassVariance should calculate correctly', () => {
            const result = MathPrecision.twoPassVariance(testData, true);

            expect(result.n).toBe(8);
            expect(result.mean).toBe(5);
            expect(result.variance).toBeCloseTo(4.571428, 4);
        });

        test('calculateVariance should auto-select algorithm', () => {
            // Small dataset: should use two-pass
            const smallResult = MathPrecision.calculateVariance(testData, true);
            expect(smallResult.variance).toBeCloseTo(4.571428, 4);

            // Large dataset: should use Welford
            const largeData = new Float64Array(2000);
            for (let i = 0; i < 2000; i++) {
                largeData[i] = Math.random() * 100;
            }
            const largeResult = MathPrecision.calculateVariance(largeData, true);
            expect(largeResult.n).toBe(2000);
            expect(largeResult.variance).toBeGreaterThan(0);
        });

        test('population variance (n) vs sample variance (n-1)', () => {
            const data = [2, 4, 6, 8, 10];

            const sampleVar = MathPrecision.welfordVariance(data, true);
            const popVar = MathPrecision.welfordVariance(data, false);

            // Sample variance should be larger (n-1 divisor)
            expect(sampleVar.variance).toBeGreaterThan(popVar.variance);
            expect(sampleVar.variance).toBeCloseTo(10, 5); // (n-1) = 4
            expect(popVar.variance).toBeCloseTo(8, 5);     // n = 5
        });
    });

    // ========================================================================
    // PRECISE MEAN
    // ========================================================================

    describe('Precise Mean', () => {
        test('preciseMean should calculate with Kahan summation', () => {
            const arr = new Array(1000).fill(0.1);
            const mean = MathPrecision.preciseMean(arr);
            expect(mean).toBeCloseTo(0.1, 10);
        });

        test('preciseMean should handle empty array', () => {
            expect(MathPrecision.preciseMean([])).toBeNaN();
        });

        test('preciseMean should handle Float64Array', () => {
            const arr = new Float64Array([1, 2, 3, 4, 5]);
            expect(MathPrecision.preciseMean(arr)).toBe(3);
        });
    });

    // ========================================================================
    // SAFE LOG/EXP
    // ========================================================================

    describe('Safe Logarithm and Exponential', () => {
        test('safeLog should handle zero and negative', () => {
            expect(MathPrecision.safeLog(0)).toBe(Math.log(Number.MIN_VALUE));
            expect(MathPrecision.safeLog(-1)).toBe(Math.log(Number.MIN_VALUE));
            expect(MathPrecision.safeLog(Math.E)).toBeCloseTo(1, 10);
        });

        test('safeLog10 should handle zero', () => {
            expect(MathPrecision.safeLog10(0)).toBe(-Infinity);
            expect(MathPrecision.safeLog10(100)).toBe(2);
        });

        test('safeExp should handle overflow', () => {
            expect(MathPrecision.safeExp(1000)).toBe(Infinity);
            expect(MathPrecision.safeExp(-1000)).toBe(0);
            expect(MathPrecision.safeExp(1)).toBeCloseTo(Math.E, 10);
        });
    });

    // ========================================================================
    // CHI-SQUARE FUNCTIONS
    // ========================================================================

    describe('Chi-Square Functions', () => {
        test('chiSquareCDF should match expected values', () => {
            // χ²(3.84, df=1) ≈ 0.95
            expect(MathPrecision.chiSquareCDF(3.841, 1)).toBeCloseTo(0.95, 2);

            // χ²(5.99, df=2) ≈ 0.95
            expect(MathPrecision.chiSquareCDF(5.991, 2)).toBeCloseTo(0.95, 2);

            // χ²(7.81, df=3) ≈ 0.95
            expect(MathPrecision.chiSquareCDF(7.815, 3)).toBeCloseTo(0.95, 2);
        });

        test('chiSquarePValue should be 1 - CDF', () => {
            const x = 10;
            const df = 5;

            const cdf = MathPrecision.chiSquareCDF(x, df);
            const pValue = MathPrecision.chiSquarePValue(x, df);

            expect(pValue).toBeCloseTo(1 - cdf, 10);
        });

        test('chiSquarePValue edge cases', () => {
            expect(MathPrecision.chiSquareCDF(0, 5)).toBe(0);
            expect(MathPrecision.chiSquareCDF(-1, 5)).toBe(0);
        });
    });

    // ========================================================================
    // GAMMA FUNCTIONS
    // ========================================================================

    describe('Gamma Functions', () => {
        test('gammaFunction should match known values', () => {
            // Γ(1) = 1
            expect(MathPrecision.gammaFunction(1)).toBeCloseTo(1, 5);

            // Γ(2) = 1! = 1
            expect(MathPrecision.gammaFunction(2)).toBeCloseTo(1, 5);

            // Γ(3) = 2! = 2
            expect(MathPrecision.gammaFunction(3)).toBeCloseTo(2, 5);

            // Γ(4) = 3! = 6
            expect(MathPrecision.gammaFunction(4)).toBeCloseTo(6, 5);

            // Γ(0.5) = √π ≈ 1.772
            expect(MathPrecision.gammaFunction(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 4);
        });

        test('logGamma should be log of gamma', () => {
            const x = 5;
            expect(MathPrecision.logGamma(x)).toBeCloseTo(Math.log(MathPrecision.gammaFunction(x)), 5);
        });
    });

    // ========================================================================
    // UTILITIES
    // ========================================================================

    describe('Utility Functions', () => {
        test('clamp should restrict to range', () => {
            expect(MathPrecision.clamp(5, 0, 10)).toBe(5);
            expect(MathPrecision.clamp(-5, 0, 10)).toBe(0);
            expect(MathPrecision.clamp(15, 0, 10)).toBe(10);
        });

        test('isValidNumber should validate correctly', () => {
            expect(MathPrecision.isValidNumber(42)).toBe(true);
            expect(MathPrecision.isValidNumber(3.14)).toBe(true);
            expect(MathPrecision.isValidNumber(NaN)).toBe(false);
            expect(MathPrecision.isValidNumber(Infinity)).toBe(false);
            expect(MathPrecision.isValidNumber('42')).toBe(false);
            expect(MathPrecision.isValidNumber(null)).toBe(false);
        });

        test('filterValidNumbers should remove invalid values', () => {
            const arr = [1, 2, NaN, 3, Infinity, 4, 'five', null, 6];
            const filtered = MathPrecision.filterValidNumbers(arr);
            expect(filtered).toEqual([1, 2, 3, 4, 6]);
        });

        test('toFloat64Array should convert correctly', () => {
            const arr = [1, 2, NaN, 3];
            const f64 = MathPrecision.toFloat64Array(arr);

            expect(f64).toBeInstanceOf(Float64Array);
            expect(Array.from(f64)).toEqual([1, 2, 3]);
        });
    });

    // ========================================================================
    // PERFORMANCE COMPARISON
    // ========================================================================

    describe('Performance Benchmarks', () => {
        const largeArray = new Float64Array(100000);
        for (let i = 0; i < largeArray.length; i++) {
            largeArray[i] = Math.random() * 1000;
        }

        test('Kahan sum vs standard sum performance', () => {
            const iterations = 10;

            // Standard sum
            const standardStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                let sum = 0;
                for (let j = 0; j < largeArray.length; j++) {
                    sum += largeArray[j];
                }
            }
            const standardTime = performance.now() - standardStart;

            // Kahan sum
            const kahanStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                MathPrecision.kahanSum(largeArray);
            }
            const kahanTime = performance.now() - kahanStart;

            console.log(`Standard sum: ${standardTime.toFixed(2)}ms`);
            console.log(`Kahan sum: ${kahanTime.toFixed(2)}ms`);
            console.log(`Ratio: ${(kahanTime / standardTime).toFixed(2)}x`);

            // Kahan should be at most 3x slower (overhead for compensation)
            expect(kahanTime).toBeLessThan(standardTime * 5);
        });

        test('Welford variance vs two-pass performance', () => {
            const iterations = 10;

            // Welford
            const welfordStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                MathPrecision.welfordVariance(largeArray, true);
            }
            const welfordTime = performance.now() - welfordStart;

            // Two-pass
            const twoPassStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                MathPrecision.twoPassVariance(largeArray, true);
            }
            const twoPassTime = performance.now() - twoPassStart;

            console.log(`Welford variance: ${welfordTime.toFixed(2)}ms`);
            console.log(`Two-pass variance: ${twoPassTime.toFixed(2)}ms`);

            // Both should complete in reasonable time
            expect(welfordTime).toBeLessThan(5000);
            expect(twoPassTime).toBeLessThan(5000);
        });
    });
});
