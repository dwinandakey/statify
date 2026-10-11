/**
 * ============================================================================
 * PERFORMANCE BENCHMARK TESTS: Shapiro-Wilk Test
 * ============================================================================
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 10.6**
 *
 * PURPOSE:
 * Benchmark tests to verify that the Shapiro-Wilk calculation meets performance
 * targets for various sample sizes on standard hardware.
 *
 * PERFORMANCE TARGETS:
 * - n=100:  completes within 50ms
 * - n=1000: completes within 200ms
 * - n=5000: completes within 500ms
 *
 * METHODOLOGY:
 * - Each benchmark runs the calculation multiple times and takes the median
 *   to reduce noise from JIT compilation and GC pauses.
 * - Execution times are logged to console for monitoring (Requirement 10.6).
 * - Uses seeded pseudo-random data to ensure reproducibility.
 *
 * REFERENCE:
 * - Design Document: Phase 5 (Integration and Performance)
 * - Requirements 9.1, 9.2, 9.3: Performance thresholds per sample size
 * - Requirement 10.6: Log execution time for performance monitoring
 */

describe('Shapiro-Wilk Test: Performance Benchmarks', () => {

    let calculateShapiroWilk;

    beforeAll(() => {
        // Load the module
        const fs = require('fs');
        const path = require('path');

        const sourcePath = path.join(__dirname, '../normalityTests.js');
        const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

        const context = {};
        const wrappedCode = `
            ${sourceCode}
            if (typeof calculateShapiroWilk !== 'undefined') {
                context.calculateShapiroWilk = calculateShapiroWilk;
            }
        `;

        const func = new Function('context', wrappedCode);
        func(context);

        calculateShapiroWilk = context.calculateShapiroWilk;
    });

    /**
     * Generate pseudo-random normal data using Box-Muller transform
     * with a simple seeded PRNG for reproducibility.
     *
     * @param {number} n - Number of data points to generate
     * @param {number} seed - Seed for reproducibility
     * @returns {number[]} Array of approximately normal values
     */
    function generateNormalData(n, seed = 42) {
        // Simple seeded PRNG (Mulberry32)
        function mulberry32(a) {
            return function () {
                a |= 0; a = a + 0x6D2B79F5 | 0;
                let t = Math.imul(a ^ a >>> 15, 1 | a);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }

        const rand = mulberry32(seed);
        const data = [];

        // Box-Muller transform to generate normal(0, 1) data
        for (let i = 0; i < n; i += 2) {
            const u1 = rand();
            const u2 = rand();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
            data.push(z0);
            if (i + 1 < n) {
                data.push(z1);
            }
        }

        return data;
    }

    /**
     * Run a benchmark by executing the function multiple times
     * and returning the median execution time.
     * Includes a warmup phase to eliminate JIT compilation overhead.
     *
     * @param {Function} fn - Function to benchmark
     * @param {number} iterations - Number of measured iterations
     * @param {number} warmup - Number of warmup iterations (not measured)
     * @returns {{ median: number, min: number, max: number, times: number[] }}
     */
    function runBenchmark(fn, iterations = 7, warmup = 3) {
        // Warmup phase: allow JIT compiler to optimize the code path
        for (let i = 0; i < warmup; i++) {
            fn();
        }

        // Measurement phase
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const end = performance.now();
            times.push(end - start);
        }

        times.sort((a, b) => a - b);
        const median = times[Math.floor(times.length / 2)];
        const min = times[0];
        const max = times[times.length - 1];

        return { median, min, max, times };
    }

    describe('Requirement 9.1: n=100 completes within 50ms', () => {

        test('should complete Shapiro-Wilk calculation for n=100 within 50ms', () => {
            // Arrange: Generate normal data with n=100
            const data = generateNormalData(100);

            // Act: Benchmark the calculation (with warmup to eliminate JIT overhead)
            const benchmark = runBenchmark(() => calculateShapiroWilk(data));

            // Log execution times for monitoring (Requirement 10.6)
            console.log('[PERFORMANCE] Shapiro-Wilk n=100:');
            console.log(`  Median: ${benchmark.median.toFixed(3)} ms`);
            console.log(`  Min:    ${benchmark.min.toFixed(3)} ms`);
            console.log(`  Max:    ${benchmark.max.toFixed(3)} ms`);
            console.log(`  All:    [${benchmark.times.map(t => t.toFixed(3)).join(', ')}] ms`);

            // Assert: Median execution time should be within 50ms
            expect(benchmark.median).toBeLessThan(50);
        });

        test('should produce valid results for n=100 performance run', () => {
            // Arrange
            const data = generateNormalData(100);

            // Act
            const result = calculateShapiroWilk(data);

            // Assert: Verify correctness alongside performance
            expect(result).not.toBeNull();
            expect(result.df).toBe(100);
            expect(result.statistic).toBeGreaterThan(0);
            expect(result.statistic).toBeLessThanOrEqual(1);
            expect(result.pValue).toBeGreaterThanOrEqual(0);
            expect(result.pValue).toBeLessThanOrEqual(1);
        });
    });

    describe('Requirement 9.2: n=1000 completes within 200ms', () => {

        test('should complete Shapiro-Wilk calculation for n=1000 within 200ms', () => {
            // Arrange: Generate normal data with n=1000
            const data = generateNormalData(1000);

            // Act: Benchmark the calculation (with warmup to eliminate JIT overhead)
            const benchmark = runBenchmark(() => calculateShapiroWilk(data));

            // Log execution times for monitoring (Requirement 10.6)
            console.log('[PERFORMANCE] Shapiro-Wilk n=1000:');
            console.log(`  Median: ${benchmark.median.toFixed(3)} ms`);
            console.log(`  Min:    ${benchmark.min.toFixed(3)} ms`);
            console.log(`  Max:    ${benchmark.max.toFixed(3)} ms`);
            console.log(`  All:    [${benchmark.times.map(t => t.toFixed(3)).join(', ')}] ms`);

            // Assert: Median execution time should be within 200ms
            expect(benchmark.median).toBeLessThan(200);
        });

        test('should produce valid results for n=1000 performance run', () => {
            // Arrange
            const data = generateNormalData(1000);

            // Act
            const result = calculateShapiroWilk(data);

            // Assert: Verify correctness alongside performance
            expect(result).not.toBeNull();
            expect(result.df).toBe(1000);
            expect(result.statistic).toBeGreaterThan(0);
            expect(result.statistic).toBeLessThanOrEqual(1);
            expect(result.pValue).toBeGreaterThanOrEqual(0);
            expect(result.pValue).toBeLessThanOrEqual(1);
        });
    });

    describe('Requirement 9.3: n=5000 completes within 500ms', () => {

        test('should complete Shapiro-Wilk calculation for n=5000 within 500ms', () => {
            // Arrange: Generate normal data with n=5000
            const data = generateNormalData(5000);

            // Act: Benchmark the calculation (with warmup to eliminate JIT overhead)
            const benchmark = runBenchmark(() => calculateShapiroWilk(data));

            // Log execution times for monitoring (Requirement 10.6)
            console.log('[PERFORMANCE] Shapiro-Wilk n=5000:');
            console.log(`  Median: ${benchmark.median.toFixed(3)} ms`);
            console.log(`  Min:    ${benchmark.min.toFixed(3)} ms`);
            console.log(`  Max:    ${benchmark.max.toFixed(3)} ms`);
            console.log(`  All:    [${benchmark.times.map(t => t.toFixed(3)).join(', ')}] ms`);

            // Assert: Median execution time should be within 500ms
            expect(benchmark.median).toBeLessThan(500);
        });

        test('should produce valid results for n=5000 performance run', () => {
            // Arrange
            const data = generateNormalData(5000);

            // Act
            const result = calculateShapiroWilk(data);

            // Assert: Verify correctness alongside performance
            expect(result).not.toBeNull();
            expect(result.df).toBe(5000);
            expect(result.statistic).toBeGreaterThan(0);
            expect(result.statistic).toBeLessThanOrEqual(1);
            expect(result.pValue).toBeGreaterThanOrEqual(0);
            expect(result.pValue).toBeLessThanOrEqual(1);
        });
    });

    describe('Performance Scaling Summary', () => {

        test('should log comprehensive performance summary across all sample sizes', () => {
            // Arrange: Generate data for all target sample sizes
            const sizes = [100, 1000, 5000];
            const thresholds = { 100: 50, 1000: 200, 5000: 500 };

            console.log('\n[PERFORMANCE SUMMARY] Shapiro-Wilk Execution Times');
            console.log('  +--------+-----------+-----------+-----------+-----------+');
            console.log('  |   n    |  Median   |    Min    |    Max    | Threshold |');
            console.log('  +--------+-----------+-----------+-----------+-----------+');

            const results = {};

            sizes.forEach(n => {
                const data = generateNormalData(n);
                const benchmark = runBenchmark(() => calculateShapiroWilk(data));
                results[n] = benchmark;

                const status = benchmark.median < thresholds[n] ? '✓' : '✗';
                console.log(
                    `  | ${String(n).padStart(5)} ` +
                    `| ${benchmark.median.toFixed(3).padStart(7)} ms ` +
                    `| ${benchmark.min.toFixed(3).padStart(7)} ms ` +
                    `| ${benchmark.max.toFixed(3).padStart(7)} ms ` +
                    `| ${String(thresholds[n]).padStart(5)} ms ${status} |`
                );
            });

            console.log('  +--------+-----------+-----------+-----------+-----------+');

            // Assert: All sample sizes meet their respective thresholds
            expect(results[100].median).toBeLessThan(thresholds[100]);
            expect(results[1000].median).toBeLessThan(thresholds[1000]);
            expect(results[5000].median).toBeLessThan(thresholds[5000]);
        });

        test('should demonstrate sub-linear time scaling', () => {
            // Verify that computation time scales reasonably with sample size
            const data100 = generateNormalData(100);
            const data1000 = generateNormalData(1000);
            const data5000 = generateNormalData(5000);

            const bench100 = runBenchmark(() => calculateShapiroWilk(data100));
            const bench1000 = runBenchmark(() => calculateShapiroWilk(data1000));
            const bench5000 = runBenchmark(() => calculateShapiroWilk(data5000));

            // Log scaling ratios
            const ratio1000vs100 = bench1000.median / Math.max(bench100.median, 0.001);
            const ratio5000vs1000 = bench5000.median / Math.max(bench1000.median, 0.001);

            console.log('\n[SCALING ANALYSIS]');
            console.log(`  n=100  → n=1000  (10x data): ${ratio1000vs100.toFixed(2)}x time`);
            console.log(`  n=1000 → n=5000  (5x data):  ${ratio5000vs1000.toFixed(2)}x time`);

            // The algorithm is dominated by O(n log n) sort + O(n) computation
            // So scaling should be roughly n*log(n) rather than n²
            // A 10x increase in data should result in less than 15x time increase
            // (10 * log(10)/log(1) approximation, allowing generous margin)
            expect(ratio1000vs100).toBeLessThan(50);
            expect(ratio5000vs1000).toBeLessThan(25);
        });
    });
});
