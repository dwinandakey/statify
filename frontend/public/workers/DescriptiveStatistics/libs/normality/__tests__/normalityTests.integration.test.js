/**
 * ============================================================================
 * INTEGRATION TESTS: runNormalityTests Orchestrator
 * ============================================================================
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 6.8**
 *
 * PURPOSE:
 * Integration tests that verify the runNormalityTests orchestrator produces
 * correctly structured output containing both KS and SW results, handles
 * unavailableReason for n > 5000, and maintains backward compatibility.
 *
 * TEST COVERAGE:
 * - Requirement 8.1: Both KS and SW results returned together in structured output
 * - Requirement 8.2: Output contains tests[] array with proper TestEntry format
 * - Requirement 8.3: unavailableReason set correctly for n > 5000
 * - Requirement 6.8: Integration tests verify runNormalityTests() structured output
 *
 * REFERENCE:
 * - Design Document: Phase 5 (Integration and Performance) - Section 4
 * - normalityTests.js: runNormalityTests orchestrator function
 */

describe('runNormalityTests Orchestrator - Integration Tests', () => {

    let runNormalityTests;

    beforeAll(() => {
        const fs = require('fs');
        const path = require('path');

        const sourcePath = path.join(__dirname, '../normalityTests.js');
        const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

        const context = {};
        const wrappedCode = `
            ${sourceCode}
            if (typeof runNormalityTests !== 'undefined') {
                context.runNormalityTests = runNormalityTests;
            }
        `;

        const func = new Function('context', wrappedCode);
        func(context);

        runNormalityTests = context.runNormalityTests;
    });

    describe('Structured Output Format with tests[] Array (Req 8.1, 8.2)', () => {

        test('should return object with tests[] array containing exactly 2 entries', () => {
            const data = [4, 7, 3, 9, 5, 8, 2, 6, 10, 1];
            const result = runNormalityTests(data);

            expect(result).toHaveProperty('tests');
            expect(Array.isArray(result.tests)).toBe(true);
            expect(result.tests).toHaveLength(2);
        });

        test('should return tests[0] as kolmogorovSmirnov and tests[1] as shapiroWilk', () => {
            const data = [4, 7, 3, 9, 5, 8, 2, 6, 10, 1];
            const result = runNormalityTests(data);

            expect(result.tests[0].key).toBe('kolmogorovSmirnov');
            expect(result.tests[0].label).toBe('Kolmogorov-Smirnov');
            expect(result.tests[1].key).toBe('shapiroWilk');
            expect(result.tests[1].label).toBe('Shapiro-Wilk');
        });

        test('each test entry should have all required fields', () => {
            const data = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
            const result = runNormalityTests(data);

            const requiredFields = [
                'key', 'label', 'available', 'statistic', 'df',
                'pValue', 'isLowerBound', 'alpha', 'isSignificant', 'conclusion'
            ];

            result.tests.forEach((entry) => {
                requiredFields.forEach((field) => {
                    expect(entry).toHaveProperty(field);
                });
            });
        });

        test('should include sampleSize, alpha, and success in top-level output', () => {
            const data = [5, 10, 15, 20, 25];
            const result = runNormalityTests(data, { alpha: 0.05 });

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('sampleSize');
            expect(result).toHaveProperty('alpha');
            expect(typeof result.success).toBe('boolean');
            expect(result.sampleSize).toBe(5);
            expect(result.alpha).toBe(0.05);
        });

        test('test entry conclusion should be one of valid enum values', () => {
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const result = runNormalityTests(data);

            const validConclusions = ['reject-normality', 'fail-to-reject-normality', 'not-computed'];

            result.tests.forEach((entry) => {
                expect(validConclusions).toContain(entry.conclusion);
            });
        });

        test('should set isSignificant based on pValue < alpha', () => {
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const alpha = 0.05;
            const result = runNormalityTests(data, { alpha });

            result.tests.forEach((entry) => {
                if (entry.available && entry.pValue !== null) {
                    if (entry.pValue < alpha) {
                        expect(entry.isSignificant).toBe(true);
                        expect(entry.conclusion).toBe('reject-normality');
                    } else {
                        expect(entry.isSignificant).toBe(false);
                        expect(entry.conclusion).toBe('fail-to-reject-normality');
                    }
                }
            });
        });
    });

    describe('Both KS and SW Results Returned Together (Req 8.1)', () => {

        test('should return valid results for both KS and SW when n is within range', () => {
            const data = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
            const result = runNormalityTests(data);

            // Both tests should be available
            expect(result.tests[0].available).toBe(true);
            expect(result.tests[1].available).toBe(true);

            // Both should have numeric statistic values
            expect(typeof result.tests[0].statistic).toBe('number');
            expect(typeof result.tests[1].statistic).toBe('number');

            // Both should have numeric pValues
            expect(typeof result.tests[0].pValue).toBe('number');
            expect(typeof result.tests[1].pValue).toBe('number');

            // pValues should be in valid range
            expect(result.tests[0].pValue).toBeGreaterThanOrEqual(0);
            expect(result.tests[0].pValue).toBeLessThanOrEqual(1);
            expect(result.tests[1].pValue).toBeGreaterThanOrEqual(0);
            expect(result.tests[1].pValue).toBeLessThanOrEqual(1);
        });

        test('should return df matching sample size for both tests', () => {
            const data = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
            const result = runNormalityTests(data);

            expect(result.tests[0].df).toBe(12);
            expect(result.tests[1].df).toBe(12);
        });

        test('should set success to true when at least one test produces valid result', () => {
            const data = [1, 2, 3, 4, 5, 6, 7];
            const result = runNormalityTests(data);

            expect(result.success).toBe(true);
        });

        test('KS statistic should be in (0, 1) range and SW statistic in (0, 1]', () => {
            const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
            const result = runNormalityTests(data);

            // KS statistic D is in (0, 1)
            expect(result.tests[0].statistic).toBeGreaterThan(0);
            expect(result.tests[0].statistic).toBeLessThan(1);

            // SW statistic W is in (0, 1]
            expect(result.tests[1].statistic).toBeGreaterThan(0);
            expect(result.tests[1].statistic).toBeLessThanOrEqual(1);
        });
    });

    describe('unavailableReason for n > 5000 (Req 8.3)', () => {

        test('should set unavailableReason on SW when n > 5000', () => {
            // Generate array with 5001 elements
            const data = Array.from({ length: 5001 }, (_, i) => i + 1);
            const result = runNormalityTests(data);

            const swEntry = result.tests[1];
            expect(swEntry.available).toBe(false);
            expect(swEntry.unavailableReason).toBe(
                'Shapiro-Wilk is only reported for sample sizes up to 5000.'
            );
        });

        test('should still compute KS when n > 5000', () => {
            const data = Array.from({ length: 5001 }, (_, i) => i + 1);
            const result = runNormalityTests(data);

            const ksEntry = result.tests[0];
            expect(ksEntry.available).toBe(true);
            expect(typeof ksEntry.statistic).toBe('number');
            expect(typeof ksEntry.pValue).toBe('number');
        });

        test('should have null statistic, df, pValue for unavailable SW', () => {
            const data = Array.from({ length: 6000 }, (_, i) => i * 0.5);
            const result = runNormalityTests(data);

            const swEntry = result.tests[1];
            expect(swEntry.statistic).toBeNull();
            expect(swEntry.df).toBeNull();
            expect(swEntry.pValue).toBeNull();
            expect(swEntry.conclusion).toBe('not-computed');
        });

        test('should include unavailableReason in notes array for n > 5000', () => {
            const data = Array.from({ length: 5500 }, (_, i) => i);
            const result = runNormalityTests(data);

            expect(result.notes).toBeDefined();
            expect(result.notes).toContain(
                'Shapiro-Wilk is only reported for sample sizes up to 5000.'
            );
        });

        test('should NOT set unavailableReason on SW when n = 5000 (boundary)', () => {
            const data = Array.from({ length: 5000 }, (_, i) => i + 1);
            const result = runNormalityTests(data);

            const swEntry = result.tests[1];
            expect(swEntry.available).toBe(true);
            expect(swEntry.unavailableReason).toBeUndefined();
        });
    });

    describe('Success Flag and Backward Compatibility Keys (Req 6.8)', () => {

        test('should include backward compatibility key kolmogorovSmirnov', () => {
            const data = [5, 10, 15, 20, 25, 30, 35, 40];
            const result = runNormalityTests(data);

            expect(result).toHaveProperty('kolmogorovSmirnov');
            expect(result.kolmogorovSmirnov).not.toBeNull();
            expect(result.kolmogorovSmirnov).toHaveProperty('statistic');
            expect(result.kolmogorovSmirnov).toHaveProperty('df');
            expect(result.kolmogorovSmirnov).toHaveProperty('pValue');
        });

        test('should include backward compatibility key shapiroWilk', () => {
            const data = [5, 10, 15, 20, 25, 30, 35, 40];
            const result = runNormalityTests(data);

            expect(result).toHaveProperty('shapiroWilk');
            expect(result.shapiroWilk).not.toBeNull();
            expect(result.shapiroWilk).toHaveProperty('statistic');
            expect(result.shapiroWilk).toHaveProperty('df');
            expect(result.shapiroWilk).toHaveProperty('pValue');
        });

        test('backward compatibility shapiroWilk should be null when n > 5000', () => {
            const data = Array.from({ length: 5001 }, (_, i) => i + 1);
            const result = runNormalityTests(data);

            expect(result.shapiroWilk).toBeNull();
        });

        test('success should be false when data has fewer than 3 observations', () => {
            const result = runNormalityTests([1, 2]);

            expect(result.success).toBe(false);
            expect(result.tests[0].available).toBe(false);
            expect(result.tests[1].available).toBe(false);
        });

        test('success should be false for empty array', () => {
            const result = runNormalityTests([]);

            expect(result.success).toBe(false);
            expect(result.sampleSize).toBe(0);
        });

        test('should use default alpha of 0.05 when not specified', () => {
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const result = runNormalityTests(data);

            expect(result.alpha).toBe(0.05);
            result.tests.forEach((entry) => {
                expect(entry.alpha).toBe(0.05);
            });
        });

        test('should respect custom alpha value', () => {
            const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const result = runNormalityTests(data, { alpha: 0.01 });

            expect(result.alpha).toBe(0.01);
            result.tests.forEach((entry) => {
                expect(entry.alpha).toBe(0.01);
            });
        });

        test('backward compatibility values should match tests[] entry values', () => {
            const data = [3, 7, 12, 18, 25, 33, 42, 50];
            const result = runNormalityTests(data);

            // KS backward compat should match tests[0]
            expect(result.kolmogorovSmirnov.statistic).toBe(result.tests[0].statistic);
            expect(result.kolmogorovSmirnov.pValue).toBe(result.tests[0].pValue);
            expect(result.kolmogorovSmirnov.df).toBe(result.tests[0].df);

            // SW backward compat should match tests[1]
            expect(result.shapiroWilk.statistic).toBe(result.tests[1].statistic);
            expect(result.shapiroWilk.pValue).toBe(result.tests[1].pValue);
            expect(result.shapiroWilk.df).toBe(result.tests[1].df);
        });

        test('should handle constant data correctly (both tests unavailable)', () => {
            const data = [5, 5, 5, 5, 5, 5];
            const result = runNormalityTests(data);

            // Both KS and SW should fail for constant data (SD = 0)
            expect(result.tests[0].available).toBe(false);
            expect(result.tests[1].available).toBe(false);
            expect(result.success).toBe(false);
        });
    });
});
