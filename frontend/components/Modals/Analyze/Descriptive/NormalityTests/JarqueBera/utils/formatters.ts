import type { JarqueBeraTestResult, JarqueBeraTestTable } from '../types';

/**
 * Format angka untuk ditampilkan
 */
function formatNumber(value: number | undefined, decimals: number = 3): string {
    if (value === undefined || value === null || isNaN(value)) return '';
    return value.toFixed(decimals);
}

/**
 * Format p-value untuk ditampilkan
 */
function formatPValue(value: number | undefined): string {
    if (value === undefined || value === null || isNaN(value)) return '';
    if (value < 0.001) return '<.001';
    return value.toFixed(3);
}

/**
 * Format derajat kebebasan
 */
function formatDF(value: number | undefined): number | string {
    if (value === undefined || value === null) return '';
    return Math.round(value);
}

/**
 * Format interpretasi hasil
 */
function formatInterpretation(isNormal: boolean | undefined): string {
    if (isNormal === undefined) return '';
    return isNormal ? 'Normal' : 'Not Normal';
}

/**
 * Format tabel hasil Jarque-Bera Test
 *
 * Struktur mengikuti format DataTableRenderer:
 * - columnHeaders: array of { header, key }
 * - rows: array of objects dengan rowHeader (array of strings) dan data columns
 */
export function formatJarqueBeraTestTable(
    results: JarqueBeraTestResult[],
    significanceLevel: number = 0.05
): JarqueBeraTestTable {
    if (!results || results.length === 0) {
        console.warn('[WARN] formatJarqueBeraTestTable: No results provided');
        return {
            title: "Jarque-Bera Test of Normality",
            columnHeaders: [{ header: "No Data", key: "noData" }],
            rows: [],
            footer: "No results available"
        };
    }

    console.log('[INFO] formatJarqueBeraTestTable: Processing', results.length, 'results');

    const table: JarqueBeraTestTable = {
        title: "Jarque-Bera Test of Normality",
        columnHeaders: [
            { header: '', key: 'rowHeader' },
            { header: 'N', key: 'n' },
            { header: 'JB Statistic', key: 'statistic' },
            { header: 'df', key: 'df' },
            { header: 'Sig.', key: 'sig' },
            { header: 'Decision', key: 'decision' },
        ],
        rows: [],
        footer: [
            `Tests the null hypothesis that data is normally distributed (α = ${significanceLevel}).`,
            "JB = n × [(S²/6) + ((K-3)²/24)] where S = skewness, K = kurtosis.",
            "If Sig. < α, reject H₀ (data is not normally distributed)."
        ]
    };

    for (const result of results) {
        if (!result || !result.variable) {
            console.error('[ERROR] formatJarqueBeraTestTable: Invalid result', result);
            continue;
        }

        const variableName = result.variable.label || result.variable.name || 'Unknown';

        if (result.error) {
            const errorRow = {
                rowHeader: [variableName],
                n: 'N/A',
                statistic: 'N/A',
                df: 'N/A',
                sig: 'N/A',
                decision: result.error
            };
            console.log('[INFO] Adding error row:', errorRow);
            table.rows.push(errorRow);
        } else {
            const isNormal = result.pValue !== undefined && result.pValue >= significanceLevel;
            const dataRow = {
                rowHeader: [variableName],
                n: result.n?.toString() || '',
                statistic: formatNumber(result.statistic, 3),
                df: formatDF(result.df),
                sig: formatPValue(result.pValue),
                decision: isNormal ? '✓ Normal' : '✗ Not Normal'
            };
            console.log('[INFO] Adding data row:', dataRow);
            table.rows.push(dataRow);
        }
    }

    console.log('[INFO] formatJarqueBeraTestTable: Final table has', table.rows.length, 'rows');
    return table;
}

/**
 * Format tabel statistik deskriptif untuk Jarque-Bera Test
 *
 * Menampilkan N, Mean, Std. Deviation, Skewness, dan Kurtosis
 */
export function formatDescriptiveStatisticsTable(results: JarqueBeraTestResult[]): JarqueBeraTestTable {
    if (!results || results.length === 0) {
        console.warn('[WARN] formatDescriptiveStatisticsTable: No results provided');
        return {
            title: "Descriptive Statistics",
            columnHeaders: [{ header: "No Data", key: "noData" }],
            rows: []
        };
    }

    console.log('[INFO] formatDescriptiveStatisticsTable: Processing', results.length, 'results');

    const table: JarqueBeraTestTable = {
        title: "Descriptive Statistics",
        subtitle: "Summary statistics for normality assessment",
        columnHeaders: [
            { header: '', key: 'rowHeader' },
            { header: 'N', key: 'n' },
            { header: 'Mean', key: 'mean' },
            { header: 'Std. Deviation', key: 'stdDev' },
            { header: 'Skewness', key: 'skewness' },
            { header: 'Kurtosis', key: 'kurtosis' },
        ],
        rows: [],
        footer: [
            "Normal distribution has Skewness = 0 and Kurtosis = 3.",
            "Excess Kurtosis = Kurtosis - 3 (shown in Kurtosis column is the excess value)."
        ]
    };

    for (const result of results) {
        if (result.error) {
            console.log('[INFO] Skipping result due to error:', result.error);
            continue;
        }

        if (!result || !result.variable) {
            console.error('[ERROR] formatDescriptiveStatisticsTable: Invalid result', result);
            continue;
        }

        const variableName = result.variable.label || result.variable.name || 'Unknown';

        const dataRow = {
            rowHeader: [variableName],
            n: result.n?.toString() || '',
            mean: formatNumber(result.mean, 4),
            stdDev: formatNumber(result.stdDev, 4),
            skewness: formatNumber(result.skewness, 4),
            kurtosis: formatNumber(result.excessKurtosis, 4)  // Tampilkan excess kurtosis
        };
        console.log('[INFO] Adding descriptive row:', dataRow);
        table.rows.push(dataRow);
    }

    console.log('[INFO] formatDescriptiveStatisticsTable: Final table has', table.rows.length, 'rows');
    return table;
}
