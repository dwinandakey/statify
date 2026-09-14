/**
 * ============================================================================
 * JARQUE-BERA TEST WEB WORKER
 * ============================================================================
 *
 * TUJUAN:
 * Menguji normalitas data menggunakan statistik skewness dan kurtosis.
 *
 * KONSEP DASAR:
 * Jarque-Bera Test memeriksa apakah data mengikuti distribusi normal dengan
 * menganalisis bentuk distribusi (skewness dan kurtosis).
 * - Skewness: Mengukur ketidaksimetrisan distribusi
 *   - Skewness = 0: Simetris (normal)
 *   - Skewness > 0: Ekor kanan lebih panjang (right-skewed)
 *   - Skewness < 0: Ekor kiri lebih panjang (left-skewed)
 *
 * - Kurtosis: Mengukur "keruncingan" atau "ketebalan ekor" distribusi
 *   - Kurtosis = 3: Mesokurtic (normal)
 *   - Kurtosis > 3: Leptokurtic (ekor lebih tebal, puncak lebih runcing)
 *   - Kurtosis < 3: Platykurtic (ekor lebih tipis, puncak lebih datar)
 *
 * HIPOTESIS:
 * H₀: Data berdistribusi normal (skewness=0 dan kurtosis=3)
 * H₁: Data tidak berdistribusi normal
 *
 * KAPAN DIGUNAKAN:
 * - Sebelum analisis parametrik (t-test, ANOVA, regresi)
 * - Untuk dataset besar (n > 30, optimal n > 2000)
 * - Validasi asumsi normalitas dalam penelitian
 *
 * CATATAN PENTING:
 * - Jarque-Bera adalah tes ASYMPTOTIC, paling akurat untuk sampel besar (n > 2000)
 * - Untuk sampel kecil, gunakan Shapiro-Wilk Test sebagai alternatif
 * - Tes ini sensitif terhadap outlier karena menggunakan momen ke-3 dan ke-4
 *
 * RUMUS JARQUE-BERA:
 *
 * 1. Hitung Skewness (√b₁):
 *    S = √b₁ = m₃ / m₂^(3/2)
 *    di mana:
 *    - m₂ = Σ(xᵢ - x̄)² / n (momen sentral ke-2)
 *    - m₃ = Σ(xᵢ - x̄)³ / n (momen sentral ke-3)
 *
 * 2. Hitung Kurtosis (b₂):
 *    K = b₂ = m₄ / m₂²
 *    di mana:
 *    - m₄ = Σ(xᵢ - x̄)⁴ / n (momen sentral ke-4)
 *
 * 3. Hitung Excess Kurtosis:
 *    EK = b₂ - 3
 *
 * 4. Hitung Statistik Jarque-Bera:
 *    JB = n × [(√b₁)² / 6 + (b₂ - 3)² / 24]
 *    atau equivalently:
 *    JB = n × [S² / 6 + EK² / 24]
 *
 * 5. Statistik JB mengikuti distribusi chi-square dengan df = 2
 *
 * INTERPRETASI:
 * - p-value < α: Tolak H₀, data TIDAK berdistribusi normal
 * - p-value ≥ α: Terima H₀, data berdistribusi normal
 *
 * REFERENSI:
 * Jarque, C. M.; Bera, A. K. (1987). "A test for normality of observations
 * and regression residuals". International Statistical Review. 55 (2): 163–172.
 * ============================================================================
 */

import chiSquareCdf from 'https://cdn.jsdelivr.net/npm/@stdlib/stats-base-dists-chisquare-cdf@0.2.2/+esm';

/**
 * Menghitung statistik deskriptif dasar dari array data
 *
 * @param {Float64Array|number[]} data - Array berisi nilai-nilai numerik
 * @returns {Object} Objek berisi mean, variance, std, min, max, count
 */
function calculateDescriptiveStats(data) {
    const n = data.length;
    if (n === 0) {
        return {
            n: 0,
            mean: NaN,
            variance: NaN,
            std: NaN,
            min: NaN,
            max: NaN
        };
    }

    // Konversi ke Float64Array jika belum
    const values = data instanceof Float64Array ? data : new Float64Array(data);

    // Hitung sum, min, max dalam satu pass
    let sum = 0;
    let min = values[0];
    let max = values[0];

    for (let i = 0; i < n; i++) {
        sum += values[i];
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
    }

    const mean = sum / n;

    // Hitung variance (sample variance dengan n-1)
    let sumSquaredDeviations = 0;
    for (let i = 0; i < n; i++) {
        const diff = values[i] - mean;
        sumSquaredDeviations += diff * diff;
    }
    const variance = n > 1 ? sumSquaredDeviations / (n - 1) : 0;
    const std = Math.sqrt(variance);

    return {
        n,
        mean,
        variance,
        std,
        min,
        max
    };
}

/**
 * ============================================================================
 * Menghitung Momen Sentral
 * ============================================================================
 *
 * Momen sentral ke-k adalah rata-rata dari (xᵢ - mean)^k
 *
 * @param {Float64Array|number[]} data - Array berisi nilai-nilai numerik
 * @param {number} k - Orde momen (2, 3, atau 4)
 * @param {number} mean - Nilai rata-rata data
 * @returns {number} Momen sentral ke-k
 */
function calculateCentralMoment(data, k, mean) {
    const n = data.length;
    if (n === 0) return 0;

    const values = data instanceof Float64Array ? data : new Float64Array(data);

    let sum = 0;
    for (let i = 0; i < n; i++) {
        const diff = values[i] - mean;
        sum += Math.pow(diff, k);
    }

    // Momen sentral menggunakan pembagi n (bukan n-1)
    return sum / n;
}

/**
 * ============================================================================
 * Menghitung Skewness
 * ============================================================================
 *
 * Skewness mengukur ketidaksimetrisan distribusi.
 * Formula: S = m₃ / m₂^(3/2) = m₃ / σ³
 *
 * Di mana:
 * - m₃ = Σ(xᵢ - x̄)³ / n (momen sentral ke-3)
 * - m₂ = Σ(xᵢ - x̄)² / n (momen sentral ke-2, atau varians populasi)
 * - σ = √m₂ (standar deviasi populasi)
 *
 * Interpretasi:
 * - S ≈ 0: Distribusi simetris
 * - S > 0: Positive skew (ekor kanan lebih panjang)
 * - S < 0: Negative skew (ekor kiri lebih panjang)
 *
 * @param {Float64Array|number[]} data - Array berisi nilai-nilai numerik
 * @param {number} mean - Nilai rata-rata data
 * @returns {number} Nilai skewness
 */
function calculateSkewness(data, mean) {
    const n = data.length;
    if (n < 3) return NaN;

    const m2 = calculateCentralMoment(data, 2, mean); // Variance (populasi)
    const m3 = calculateCentralMoment(data, 3, mean); // Momen ke-3

    if (m2 === 0) return NaN; // Semua data sama (tidak ada variasi)

    // Skewness = m3 / m2^(3/2) = m3 / σ³
    const skewness = m3 / Math.pow(m2, 1.5);

    return skewness;
}

/**
 * ============================================================================
 * Menghitung Kurtosis
 * ============================================================================
 *
 * Kurtosis mengukur "keruncingan" atau "ketebalan ekor" distribusi.
 * Formula: K = m₄ / m₂² = m₄ / σ⁴
 *
 * Di mana:
 * - m₄ = Σ(xᵢ - x̄)⁴ / n (momen sentral ke-4)
 * - m₂ = Σ(xᵢ - x̄)² / n (momen sentral ke-2)
 *
 * CATATAN: Ini mengembalikan KURTOSIS (bukan excess kurtosis)
 * - Kurtosis normal = 3
 * - Excess Kurtosis = Kurtosis - 3
 *
 * Interpretasi Kurtosis:
 * - K = 3: Mesokurtic (seperti normal)
 * - K > 3: Leptokurtic (ekor lebih tebal, puncak lebih tajam)
 * - K < 3: Platykurtic (ekor lebih tipis, puncak lebih datar)
 *
 * @param {Float64Array|number[]} data - Array berisi nilai-nilai numerik
 * @param {number} mean - Nilai rata-rata data
 * @returns {number} Nilai kurtosis
 */
function calculateKurtosis(data, mean) {
    const n = data.length;
    if (n < 4) return NaN;

    const m2 = calculateCentralMoment(data, 2, mean); // Variance (populasi)
    const m4 = calculateCentralMoment(data, 4, mean); // Momen ke-4

    if (m2 === 0) return NaN; // Semua data sama (tidak ada variasi)

    // Kurtosis = m4 / m2²
    const kurtosis = m4 / (m2 * m2);

    return kurtosis;
}

/**
 * ============================================================================
 * Menghitung Statistik Uji Jarque-Bera
 * ============================================================================
 *
 * Ini adalah fungsi utama yang menghitung statistik Jarque-Bera untuk menguji
 * normalitas data.
 *
 * RUMUS JARQUE-BERA:
 *
 * JB = n × [(√b₁)² / 6 + (b₂ - 3)² / 24]
 *
 * Di mana:
 * - n = jumlah observasi
 * - √b₁ = skewness (coeffisien of skewness)
 * - b₂ = kurtosis
 * - (b₂ - 3) = excess kurtosis
 *
 * Statistik JB mengikuti distribusi chi-square dengan df = 2
 * (karena ada 2 komponen: skewness dan kurtosis)
 *
 * CONTOH PERHITUNGAN:
 *
 * Data normal (n=100):
 *   Skewness (S) ≈ 0.1
 *   Kurtosis (K) ≈ 2.9
 *   Excess Kurtosis (EK) = 2.9 - 3 = -0.1
 *
 *   JB = 100 × [(0.1)² / 6 + (-0.1)² / 24]
 *      = 100 × [0.01/6 + 0.01/24]
 *      = 100 × [0.00167 + 0.000417]
 *      = 100 × 0.00208
 *      = 0.208
 *
 *   p-value = P(χ² > 0.208, df=2) ≈ 0.901
 *   Kesimpulan: p > 0.05 → Data normal ✅
 *
 * Data tidak normal (n=100):
 *   Skewness (S) = 1.5 (sangat skewed)
 *   Kurtosis (K) = 7 (sangat leptokurtic)
 *   Excess Kurtosis (EK) = 7 - 3 = 4
 *
 *   JB = 100 × [(1.5)² / 6 + (4)² / 24]
 *      = 100 × [2.25/6 + 16/24]
 *      = 100 × [0.375 + 0.667]
 *      = 100 × 1.042
 *      = 104.2
 *
 *   p-value = P(χ² > 104.2, df=2) ≈ 0.000
 *   Kesimpulan: p < 0.05 → Data TIDAK normal ❌
 *
 * @param {Float64Array|number[]} data - Array berisi nilai-nilai numerik
 * @returns {Object} Hasil uji Jarque-Bera dengan statistik, df, p-value, skewness, kurtosis
 * ============================================================================
 */
function calculateJarqueBeraTest(data) {
    const n = data.length;

    // Validasi: minimal 4 observasi diperlukan
    // (untuk menghitung kurtosis butuh minimal n=4)
    if (n < 4) {
        return {
            error: 'Jarque-Bera Test requires at least 4 observations',
            insufficientType: 'insufficientSampleSize'
        };
    }

    // Konversi ke Float64Array untuk performa optimal
    const values = data instanceof Float64Array ? data : new Float64Array(data);

    // ========================================================================
    // LANGKAH 1: Hitung statistik deskriptif
    // ========================================================================
    const stats = calculateDescriptiveStats(values);
    const mean = stats.mean;

    // ========================================================================
    // LANGKAH 2: Hitung Skewness
    // ========================================================================
    const skewness = calculateSkewness(values, mean);

    if (isNaN(skewness)) {
        return {
            error: 'Cannot calculate skewness (possibly all values are identical)',
            insufficientType: 'zeroVariance'
        };
    }

    // ========================================================================
    // LANGKAH 3: Hitung Kurtosis
    // ========================================================================
    const kurtosis = calculateKurtosis(values, mean);

    if (isNaN(kurtosis)) {
        return {
            error: 'Cannot calculate kurtosis (possibly all values are identical)',
            insufficientType: 'zeroVariance'
        };
    }

    // ========================================================================
    // LANGKAH 4: Hitung Excess Kurtosis
    // ========================================================================
    // Excess Kurtosis = Kurtosis - 3
    // Distribusi normal memiliki kurtosis = 3, jadi excess = 0
    const excessKurtosis = kurtosis - 3;

    // ========================================================================
    // LANGKAH 5: Hitung Statistik Jarque-Bera
    // ========================================================================
    // JB = n × [S² / 6 + EK² / 24]
    //
    // - S² / 6: Kontribusi skewness (bobotnya 1/6)
    // - EK² / 24: Kontribusi excess kurtosis (bobotnya 1/24)
    //
    // Bobot berbeda karena variance dari skewness = 6/n dan variance dari
    // excess kurtosis = 24/n untuk distribusi normal

    const skewnessContribution = (skewness * skewness) / 6;
    const kurtosisContribution = (excessKurtosis * excessKurtosis) / 24;
    const jbStatistic = n * (skewnessContribution + kurtosisContribution);

    console.log('[DEBUG] Worker - Jarque-Bera calculation:', {
        n,
        mean,
        skewness,
        kurtosis,
        excessKurtosis,
        skewnessContribution,
        kurtosisContribution,
        jbStatistic
    });

    // ========================================================================
    // LANGKAH 6: Hitung Degrees of Freedom dan P-value
    // ========================================================================
    // df = 2 (karena ada 2 komponen: skewness dan kurtosis)
    const df = 2;

    // P-value = P(χ² > JB)
    // Menggunakan fungsi CDF dari distribusi chi-square
    // p-value = 1 - CDF(JB, df=2)
    const pValue = 1 - chiSquareCdf(jbStatistic, df);

    console.log('[DEBUG] Worker - Final result:', {
        statistic: jbStatistic,
        df,
        pValue,
        skewness,
        kurtosis,
        excessKurtosis
    });

    return {
        statistic: jbStatistic,
        df: df,
        pValue: pValue,
        skewness: skewness,
        kurtosis: kurtosis,
        excessKurtosis: excessKurtosis,
        sampleSize: n,
        descriptiveStats: stats
    };
}

/**
 * Filter dan validasi data numerik
 * Menghapus nilai null, undefined, dan NaN
 *
 * @param {number[]} data - Array data mentah
 * @returns {Float64Array} Array data yang sudah difilter
 */
function filterValidData(data) {
    const validValues = [];

    for (let i = 0; i < data.length; i++) {
        const value = data[i];

        // Skip null, undefined, atau string kosong
        if (value === null || value === undefined || value === '') continue;

        const numValue = Number(value);

        // Skip jika bukan angka valid
        if (isNaN(numValue)) continue;

        validValues.push(numValue);
    }

    return new Float64Array(validValues);
}

/**
 * Main message handler
 */
self.onmessage = function(e) {
    try {
        const { type, data } = e.data;

        if (type === 'CALCULATE') {
            const {
                testVariables,
                variablesData,
                options
            } = data;

            // Validate chiSquareCdf is loaded
            if (!chiSquareCdf) {
                throw new Error('Chi-square CDF library not loaded');
            }

            const results = [];

            // Process each test variable
            for (let i = 0; i < testVariables.length; i++) {
                const testVariable = testVariables[i];
                const rawData = variablesData[i];

                // Filter valid numeric data
                const validData = filterValidData(rawData);

                console.log('[DEBUG] Worker - Processing variable:', {
                    variable: testVariable,
                    rawDataLength: rawData.length,
                    validDataLength: validData.length
                });

                // Calculate Jarque-Bera test
                const jbResult = calculateJarqueBeraTest(validData);

                // Format result
                const result = {
                    variable: testVariable,
                    ...jbResult
                };

                results.push(result);
            }

            self.postMessage({
                type: 'JARQUE_BERA_RESULT',
                data: results
            });

        } else {
            self.postMessage({
                type: 'ERROR',
                error: `Unknown message type: ${type}`
            });
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error.message,
            stack: error.stack
        });
    }
};
