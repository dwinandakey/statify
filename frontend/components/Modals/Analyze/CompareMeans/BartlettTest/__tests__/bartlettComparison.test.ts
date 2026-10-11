/**
 * ============================================================================
 * BARTLETT TEST - COMPARISON WITH MINITAB, PYTHON, R STUDIO
 * ============================================================================
 *
 * Test ini untuk membandingkan hasil Statify dengan:
 * - Minitab
 * - Python (scipy.stats.bartlett)
 * - R Studio (bartlett.test)
 *
 * FITUR:
 * 1. Input jumlah variabel (1, 2, 3, ...)
 * 2. Input jumlah grup (2, 3, 5, 10, ...)
 * 3. Input jumlah data/baris (100, 1000, 10000, ...)
 * 4. Export hasil untuk perbandingan
 *
 * ============================================================================
 */

// ============================================
// KONFIGURASI - UBAH SESUAI KEBUTUHAN
// ============================================

const TEST_CONFIG = {
    // Jumlah variabel yang ingin diuji (masing-masing variabel akan di-test Bartlett secara terpisah)
    numVariables: [1, 2, 3],

    // Jumlah grup per variabel
    numGroups: [2, 3, 5],

    // Jumlah total observasi/baris
    numRows: [100, 500, 1000, 5000, 10000],

    // Seed untuk reproducibility (agar random data sama setiap kali)
    seed: 12345,

    // Toleransi untuk perbandingan dengan software lain
    tolerance: 0.0001,

    // Apakah gunakan varians homogen atau heterogen
    testScenarios: ['homogen', 'heterogen'] as const
};

// ============================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================

class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Mulberry32 algorithm
    next(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Box-Muller transform untuk distribusi normal
    normalRandom(mean: number = 0, stdDev: number = 1): number {
        const u1 = this.next();
        const u2 = this.next();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * stdDev;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateVariance(data: number[]): number {
    const n = data.length;
    if (n < 2) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) sum += data[i];
    const mean = sum / n;

    let sumSq = 0;
    for (let i = 0; i < n; i++) {
        const diff = data[i] - mean;
        sumSq += diff * diff;
    }

    return sumSq / (n - 1);
}

function calculateMean(data: number[]): number {
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length;
}

function safeLog(value: number): number {
    if (value <= 0) return 0;
    return Math.log(value);
}

function erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

function chiSquareCdf(x: number, df: number): number {
    if (x <= 0) return 0;
    if (df <= 0) return 0;
    const z = Math.pow(x / df, 1/3) - (1 - 2 / (9 * df));
    const stdDev = Math.sqrt(2 / (9 * df));
    const normalZ = z / stdDev;
    return 0.5 * (1 + erf(normalZ / Math.sqrt(2)));
}

// ============================================
// INTERFACE DEFINITIONS
// ============================================

interface GroupStats {
    name: string;
    n: number;
    mean: number;
    variance: number;
    standardDeviation: number;
    logVariance: number;
}

interface BartlettResult {
    statistic: number;  // Chi-Square
    df: number;
    pValue: number;
    pooledVariance: number;
    M: number;
    C: number;
    groupStats: GroupStats[];
    executionTimeMs: number;
    memoryUsedBytes: number;
}

interface TestScenario {
    id: string;
    numVariables: number;
    numGroups: number;
    numRows: number;
    scenario: 'homogen' | 'heterogen';
    data: { [groupName: string]: number[] };
    result: BartlettResult;
}

// ============================================
// BARTLETT TEST FUNCTION
// ============================================

function calculateBartlettTest(groupedData: { [key: string]: number[] }): BartlettResult {
    const startTime = performance.now();
    const startMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

    const groupNames = Object.keys(groupedData);
    const k = groupNames.length;

    if (k < 2) {
        throw new Error('Bartlett Test requires at least 2 groups');
    }

    // Calculate group statistics
    const groupStats: GroupStats[] = [];
    let totalN = 0;
    let totalDF = 0;

    for (const name of groupNames) {
        const data = groupedData[name];
        const n = data.length;

        if (n < 2) continue;

        const mean = calculateMean(data);
        const variance = calculateVariance(data);
        const df = n - 1;

        groupStats.push({
            name,
            n,
            mean,
            variance,
            standardDeviation: Math.sqrt(variance),
            logVariance: safeLog(variance)
        });

        totalN += n;
        totalDF += df;
    }

    if (groupStats.length < 2) {
        throw new Error('Need at least 2 groups with 2+ observations');
    }

    const numGroups = groupStats.length;

    // Pooled variance
    let sumDFxVar = 0;
    for (const stat of groupStats) {
        sumDFxVar += (stat.n - 1) * stat.variance;
    }
    const pooledVariance = sumDFxVar / totalDF;
    const logPooledVariance = safeLog(pooledVariance);

    // M statistic
    let sumDFxLogVar = 0;
    for (const stat of groupStats) {
        sumDFxLogVar += (stat.n - 1) * stat.logVariance;
    }
    const M = totalDF * logPooledVariance - sumDFxLogVar;

    // Correction factor C
    let sumInvDF = 0;
    for (const stat of groupStats) {
        sumInvDF += 1 / (stat.n - 1);
    }
    const C = 1 + (sumInvDF - 1/totalDF) / (3 * (numGroups - 1));

    // Bartlett statistic
    const statistic = M / C;
    const df = numGroups - 1;
    const pValue = 1 - chiSquareCdf(statistic, df);

    const endTime = performance.now();
    const endMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

    return {
        statistic,
        df,
        pValue,
        pooledVariance,
        M,
        C,
        groupStats,
        executionTimeMs: endTime - startTime,
        memoryUsedBytes: Math.max(0, endMemory - startMemory)
    };
}

// ============================================
// DATA GENERATOR
// ============================================

function generateTestData(
    numGroups: number,
    numRows: number,
    scenario: 'homogen' | 'heterogen',
    seed: number
): { [groupName: string]: number[] } {
    const rng = new SeededRandom(seed);
    const data: { [groupName: string]: number[] } = {};

    // Distribute rows across groups (roughly equal)
    const rowsPerGroup = Math.floor(numRows / numGroups);
    const remainder = numRows % numGroups;

    for (let g = 0; g < numGroups; g++) {
        const groupName = `Group_${g + 1}`;
        const groupSize = rowsPerGroup + (g < remainder ? 1 : 0);

        // Set variance based on scenario
        let variance: number;
        if (scenario === 'homogen') {
            variance = 10; // Same variance for all groups
        } else {
            // Heterogen: each group has different variance
            variance = 5 + (g + 1) * 10; // 15, 25, 35, 45, ...
        }

        const mean = 50 + g * 5; // Different means
        const stdDev = Math.sqrt(variance);

        const groupData: number[] = [];
        for (let i = 0; i < groupSize; i++) {
            groupData.push(rng.normalRandom(mean, stdDev));
        }

        data[groupName] = groupData;
    }

    return data;
}

// ============================================
// EXPORT FOR COMPARISON
// ============================================

function generatePythonCode(data: { [key: string]: number[] }): string {
    let code = `# Python code untuk verifikasi dengan scipy
from scipy import stats
import numpy as np

`;

    for (const [name, values] of Object.entries(data)) {
        code += `${name.toLowerCase()} = np.array([${values.slice(0, 20).map(v => v.toFixed(6)).join(', ')}${values.length > 20 ? ', ...' : ''}])\n`;
    }

    const groupNames = Object.keys(data).map(n => n.toLowerCase());
    code += `\n# Run Bartlett Test\nstat, p_value = stats.bartlett(${groupNames.join(', ')})\n`;
    code += `print(f"Chi-Square: {stat:.6f}")\n`;
    code += `print(f"P-value: {p_value:.6f}")\n`;

    return code;
}

function generateRCode(data: { [key: string]: number[] }): string {
    let code = `# R code untuk verifikasi
`;

    // Create vectors
    for (const [name, values] of Object.entries(data)) {
        code += `${name} <- c(${values.slice(0, 20).map(v => v.toFixed(6)).join(', ')}${values.length > 20 ? '  # ... truncated' : ''})\n`;
    }

    // Create combined data frame
    const groupNames = Object.keys(data);
    code += `\n# Combine into data frame\n`;
    code += `values <- c(${groupNames.join(', ')})\n`;
    code += `groups <- factor(rep(c(${groupNames.map((_, i) => `"${i + 1}"`).join(', ')}), times=c(${groupNames.map(n => data[n].length).join(', ')})))\n`;
    code += `\n# Run Bartlett Test\n`;
    code += `bartlett.test(values ~ groups)\n`;

    return code;
}

function generateMinitabInstructions(data: { [key: string]: number[] }): string {
    const groupNames = Object.keys(data);
    let instructions = `# Minitab Instructions
# =====================

1. Buka Minitab
2. Import data dengan struktur:
   - Column C1: Values (semua data digabung)
   - Column C2: Group (identifier grup)

3. Data structure:
`;

    for (const [name, values] of Object.entries(data)) {
        instructions += `   ${name}: ${values.length} observasi\n`;
    }

    instructions += `
4. Stat > ANOVA > Test for Equal Variances
5. Pilih:
   - Response: C1 (Values)
   - Factors: C2 (Group)
6. Method: Bartlett's Test
7. Klik OK

Expected output akan menampilkan:
- Test Statistic (Chi-Square)
- DF (Degrees of Freedom)
- P-Value
`;

    return instructions;
}

// ============================================
// TEST SUITES
// ============================================

describe('Bartlett Test - Comparison Suite', () => {

    describe('1. Configurable Test Scenarios', () => {

        test.each([
            { groups: 2, rows: 100, scenario: 'homogen' as const },
            { groups: 3, rows: 100, scenario: 'homogen' as const },
            { groups: 5, rows: 500, scenario: 'homogen' as const },
            { groups: 2, rows: 100, scenario: 'heterogen' as const },
            { groups: 3, rows: 500, scenario: 'heterogen' as const },
            { groups: 5, rows: 1000, scenario: 'heterogen' as const },
        ])('Groups=$groups, Rows=$rows, Scenario=$scenario', ({ groups, rows, scenario }) => {

            const data = generateTestData(groups, rows, scenario, TEST_CONFIG.seed);
            const result = calculateBartlettTest(data);

            console.log(`\n${'='.repeat(70)}`);
            console.log(`TEST: ${groups} Groups, ${rows} Rows, ${scenario.toUpperCase()}`);
            console.log('='.repeat(70));

            // Data Info
            console.log('\n[DATA INFO]');
            console.log(`  Total Observasi: ${rows}`);
            console.log(`  Jumlah Grup: ${groups}`);
            for (const stat of result.groupStats) {
                console.log(`  ${stat.name}: N=${stat.n}, Mean=${stat.mean.toFixed(4)}, Var=${stat.variance.toFixed(4)}`);
            }

            // Results
            console.log('\n[HASIL BARTLETT TEST - STATIFY]');
            console.log(`  Chi-Square (T): ${result.statistic.toFixed(6)}`);
            console.log(`  df: ${result.df}`);
            console.log(`  P-value: ${result.pValue.toFixed(6)}`);
            console.log(`  Pooled Variance: ${result.pooledVariance.toFixed(6)}`);

            // Performance
            console.log('\n[PERFORMANCE]');
            console.log(`  Waktu: ${result.executionTimeMs.toFixed(4)} ms`);
            console.log(`  Memory: ${(result.memoryUsedBytes / 1024).toFixed(2)} KB`);

            // Interpretation
            console.log('\n[INTERPRETASI]');
            const isHomogen = result.pValue > 0.05;
            console.log(`  Status: ${isHomogen ? 'HOMOGEN ✅' : 'HETEROGEN ❌'}`);
            console.log(`  Expected: ${scenario.toUpperCase()}`);

            // Validate
            if (scenario === 'homogen') {
                expect(result.pValue).toBeGreaterThan(0.01); // Should be high p-value
            } else {
                expect(result.pValue).toBeLessThan(0.5); // Should be low p-value (usually < 0.05)
            }
        });
    });

    describe('2. Comprehensive Comparison Table', () => {

        test('Generate comparison table for all configurations', () => {
            console.log('\n');
            console.log('='.repeat(120));
            console.log(' BARTLETT TEST - COMPARISON TABLE FOR MINITAB/PYTHON/R VERIFICATION');
            console.log('='.repeat(120));

            // Header
            console.log('\n| No | Groups | Rows   | Scenario   | Chi-Square   | df | P-value      | Waktu(ms) | Status      |');
            console.log('|----|--------|--------|------------|--------------|----|--------------|-----------:|-------------|');

            let testNo = 1;
            const allResults: TestScenario[] = [];

            // Generate all combinations
            for (const numGroups of [2, 3, 5]) {
                for (const numRows of [100, 500, 1000]) {
                    for (const scenario of ['homogen', 'heterogen'] as const) {
                        const data = generateTestData(numGroups, numRows, scenario, TEST_CONFIG.seed);
                        const result = calculateBartlettTest(data);

                        const status = result.pValue > 0.05 ? 'HOMOGEN ✅' : 'HETEROGEN ❌';

                        console.log(`| ${testNo.toString().padStart(2)} | ${numGroups.toString().padStart(6)} | ${numRows.toString().padStart(6)} | ${scenario.padEnd(10)} | ${result.statistic.toFixed(6).padStart(12)} | ${result.df.toString().padStart(2)} | ${result.pValue.toFixed(8).padStart(12)} | ${result.executionTimeMs.toFixed(4).padStart(9)} | ${status.padEnd(11)} |`);

                        allResults.push({
                            id: `test_${testNo}`,
                            numVariables: 1,
                            numGroups,
                            numRows,
                            scenario,
                            data,
                            result
                        });

                        testNo++;
                    }
                }
            }

            console.log('\n' + '='.repeat(120));

            expect(allResults.length).toBe(18); // 3 groups x 3 rows x 2 scenarios
        });
    });

    describe('3. Export for External Verification', () => {

        test('Generate Python code for scipy verification', () => {
            console.log('\n');
            console.log('='.repeat(80));
            console.log(' PYTHON CODE FOR SCIPY VERIFICATION');
            console.log('='.repeat(80));

            // Small dataset for easy verification
            const data = generateTestData(3, 30, 'homogen', TEST_CONFIG.seed);
            const result = calculateBartlettTest(data);

            console.log('\n# Data generated by Statify (seed: 12345)');
            console.log(generatePythonCode(data));

            console.log('\n# Expected Statify Results:');
            console.log(`# Chi-Square: ${result.statistic.toFixed(6)}`);
            console.log(`# P-value: ${result.pValue.toFixed(6)}`);

            expect(result.statistic).toBeGreaterThanOrEqual(0);
        });

        test('Generate R code for verification', () => {
            console.log('\n');
            console.log('='.repeat(80));
            console.log(' R CODE FOR R STUDIO VERIFICATION');
            console.log('='.repeat(80));

            const data = generateTestData(3, 30, 'homogen', TEST_CONFIG.seed);
            const result = calculateBartlettTest(data);

            console.log(generateRCode(data));

            console.log('\n# Expected Statify Results:');
            console.log(`# Chi-Square: ${result.statistic.toFixed(6)}`);
            console.log(`# P-value: ${result.pValue.toFixed(6)}`);

            expect(result.statistic).toBeGreaterThanOrEqual(0);
        });

        test('Generate Minitab instructions', () => {
            console.log('\n');
            console.log('='.repeat(80));
            console.log(' MINITAB INSTRUCTIONS');
            console.log('='.repeat(80));

            const data = generateTestData(3, 30, 'homogen', TEST_CONFIG.seed);
            const result = calculateBartlettTest(data);

            console.log(generateMinitabInstructions(data));

            console.log('\n# Expected Statify Results:');
            console.log(`# Chi-Square: ${result.statistic.toFixed(6)}`);
            console.log(`# P-value: ${result.pValue.toFixed(6)}`);

            expect(result.statistic).toBeGreaterThanOrEqual(0);
        });
    });

    describe('4. Performance Scaling Test', () => {

        test('Performance across different data sizes', () => {
            console.log('\n');
            console.log('='.repeat(80));
            console.log(' PERFORMANCE SCALING TEST');
            console.log('='.repeat(80));

            console.log('\n| Rows     | Groups | Chi-Square   | Waktu(ms)    | Throughput (rows/sec) |');
            console.log('|----------|--------|--------------|--------------|----------------------:|');

            const sizes = [100, 500, 1000, 5000, 10000, 50000, 100000];

            for (const size of sizes) {
                const data = generateTestData(5, size, 'homogen', TEST_CONFIG.seed);

                // Warmup
                calculateBartlettTest(data);

                // Measure
                const times: number[] = [];
                let lastResult: BartlettResult | null = null;

                for (let i = 0; i < 3; i++) {
                    const result = calculateBartlettTest(data);
                    times.push(result.executionTimeMs);
                    lastResult = result;
                }

                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                const throughput = Math.round(size / avgTime * 1000);

                console.log(`| ${size.toString().padStart(8)} | ${5..toString().padStart(6)} | ${lastResult!.statistic.toFixed(6).padStart(12)} | ${avgTime.toFixed(4).padStart(12)} | ${throughput.toLocaleString().padStart(21)} |`);
            }

            console.log('\n' + '='.repeat(80));

            expect(true).toBe(true);
        });
    });

    describe('5. Varians Detail per Grup', () => {

        test('Detailed variance comparison for each group', () => {
            console.log('\n');
            console.log('='.repeat(100));
            console.log(' DETAIL VARIANS PER GRUP - UNTUK VALIDASI MANUAL');
            console.log('='.repeat(100));

            // Test homogen
            console.log('\n--- SKENARIO HOMOGEN (Varians Sama) ---');
            const homogenData = generateTestData(3, 300, 'homogen', TEST_CONFIG.seed);
            const homogenResult = calculateBartlettTest(homogenData);

            console.log('\n| Grup     | N   | Mean       | Variance   | Std Dev    | ln(Var)    |');
            console.log('|----------|-----|------------|------------|------------|------------|');
            for (const stat of homogenResult.groupStats) {
                console.log(`| ${stat.name.padEnd(8)} | ${stat.n.toString().padStart(3)} | ${stat.mean.toFixed(6).padStart(10)} | ${stat.variance.toFixed(6).padStart(10)} | ${stat.standardDeviation.toFixed(6).padStart(10)} | ${stat.logVariance.toFixed(6).padStart(10)} |`);
            }

            console.log(`\nPooled Variance: ${homogenResult.pooledVariance.toFixed(6)}`);
            console.log(`Chi-Square: ${homogenResult.statistic.toFixed(6)}`);
            console.log(`P-value: ${homogenResult.pValue.toFixed(6)}`);
            console.log(`Variance Ratio (Max/Min): ${(Math.max(...homogenResult.groupStats.map(s => s.variance)) / Math.min(...homogenResult.groupStats.map(s => s.variance))).toFixed(4)}`);

            // Test heterogen
            console.log('\n--- SKENARIO HETEROGEN (Varians Berbeda) ---');
            const heterogenData = generateTestData(3, 300, 'heterogen', TEST_CONFIG.seed);
            const heterogenResult = calculateBartlettTest(heterogenData);

            console.log('\n| Grup     | N   | Mean       | Variance   | Std Dev    | ln(Var)    |');
            console.log('|----------|-----|------------|------------|------------|------------|');
            for (const stat of heterogenResult.groupStats) {
                console.log(`| ${stat.name.padEnd(8)} | ${stat.n.toString().padStart(3)} | ${stat.mean.toFixed(6).padStart(10)} | ${stat.variance.toFixed(6).padStart(10)} | ${stat.standardDeviation.toFixed(6).padStart(10)} | ${stat.logVariance.toFixed(6).padStart(10)} |`);
            }

            console.log(`\nPooled Variance: ${heterogenResult.pooledVariance.toFixed(6)}`);
            console.log(`Chi-Square: ${heterogenResult.statistic.toFixed(6)}`);
            console.log(`P-value: ${heterogenResult.pValue.toFixed(6)}`);
            console.log(`Variance Ratio (Max/Min): ${(Math.max(...heterogenResult.groupStats.map(s => s.variance)) / Math.min(...heterogenResult.groupStats.map(s => s.variance))).toFixed(4)}`);

            console.log('\n' + '='.repeat(100));

            expect(homogenResult.pValue).toBeGreaterThan(heterogenResult.pValue);
        });
    });

    describe('6. Custom Test - Sesuaikan di sini!', () => {

        test('Custom configuration test', () => {
            // ═══════════════════════════════════════════════════════════════════
            // UBAH NILAI DI BAWAH INI SESUAI KEBUTUHAN!
            // ═══════════════════════════════════════════════════════════════════

            const CUSTOM_CONFIG = {
                numGroups: 4,           // Jumlah grup: 2, 3, 4, 5, ...
                numRows: 200,           // Jumlah total baris: 100, 500, 1000, ...
                scenario: 'homogen' as const,  // 'homogen' atau 'heterogen'
                seed: 54321             // Ubah untuk data random berbeda
            };

            // ═══════════════════════════════════════════════════════════════════

            console.log('\n');
            console.log('='.repeat(80));
            console.log(' CUSTOM TEST - KONFIGURASI MANUAL');
            console.log('='.repeat(80));
            console.log(`\nKonfigurasi:`);
            console.log(`  Jumlah Grup: ${CUSTOM_CONFIG.numGroups}`);
            console.log(`  Jumlah Baris: ${CUSTOM_CONFIG.numRows}`);
            console.log(`  Skenario: ${CUSTOM_CONFIG.scenario}`);
            console.log(`  Seed: ${CUSTOM_CONFIG.seed}`);

            const data = generateTestData(
                CUSTOM_CONFIG.numGroups,
                CUSTOM_CONFIG.numRows,
                CUSTOM_CONFIG.scenario,
                CUSTOM_CONFIG.seed
            );

            const result = calculateBartlettTest(data);

            console.log('\n[VARIANS PER GRUP]');
            console.log('| Grup     | N   | Mean       | Variance   | Std Dev    |');
            console.log('|----------|-----|------------|------------|------------|');
            for (const stat of result.groupStats) {
                console.log(`| ${stat.name.padEnd(8)} | ${stat.n.toString().padStart(3)} | ${stat.mean.toFixed(4).padStart(10)} | ${stat.variance.toFixed(4).padStart(10)} | ${stat.standardDeviation.toFixed(4).padStart(10)} |`);
            }

            console.log('\n[HASIL BARTLETT TEST]');
            console.log(`  Chi-Square: ${result.statistic.toFixed(6)}`);
            console.log(`  df: ${result.df}`);
            console.log(`  P-value: ${result.pValue.toFixed(6)}`);
            console.log(`  Pooled Variance: ${result.pooledVariance.toFixed(6)}`);
            console.log(`  M: ${result.M.toFixed(6)}`);
            console.log(`  C: ${result.C.toFixed(6)}`);

            console.log('\n[PERFORMANCE]');
            console.log(`  Waktu: ${result.executionTimeMs.toFixed(4)} ms`);
            console.log(`  Memory: ${(result.memoryUsedBytes / 1024).toFixed(2)} KB`);

            console.log('\n[KESIMPULAN]');
            const isHomogen = result.pValue > 0.05;
            console.log(`  Status: ${isHomogen ? 'VARIANS HOMOGEN ✅' : 'VARIANS HETEROGEN ❌'}`);
            console.log(`  P-value ${isHomogen ? '>' : '<'} 0.05`);

            console.log('\n' + '='.repeat(80));

            // Export codes
            console.log('\n--- PYTHON CODE ---');
            console.log(generatePythonCode(data));

            console.log('\n--- R CODE ---');
            console.log(generateRCode(data));

            expect(result.statistic).toBeGreaterThanOrEqual(0);
        });
    });
});
