import type { BartlettTestResult, BartlettTestTable, TableColumnHeader } from '../types';

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
 * Format tabel hasil Bartlett Test
 *
 * Memformat hasil Bartlett Test untuk ditampilkan di output table.
 * Struktur mengikuti format DataTableRenderer yang memerlukan:
 * - columnHeaders: array of { header, key }
 * - rows: array of objects dengan rowHeader (array of strings) dan data columns
 *
 * PENTING: Setiap row HARUS punya rowHeader sebagai array non-empty
 */
export function formatBartlettTestTable(results: BartlettTestResult[]): BartlettTestTable {
    // Validasi input
    if (!results || results.length === 0) {
        console.warn('[WARN] formatBartlettTestTable: No results provided');
        return {
            title: "Bartlett's Test of Homogeneity of Variances",
            columnHeaders: [{ header: "No Data", key: "noData" }],
            rows: [],
            note: "No results available"
        };
    }

    console.log('[INFO] formatBartlettTestTable: Processing', results.length, 'results');

    const table: BartlettTestTable = {
        title: "Bartlett's Test of Homogeneity of Variances",
        columnHeaders: [
            { header: '', key: 'rowHeader' },
            { header: 'Chi-Square', key: 'chiSquare' },
            { header: 'df', key: 'df' },
            { header: 'Sig.', key: 'sig' },
        ],
        rows: [],
        footer: "Tests the null hypothesis that variances are equal across groups. " +
                "A significant result (p < 0.05) indicates variances are not equal. " +
                "Note: Bartlett's Test is sensitive to departures from normality."
    };

    for (const result of results) {
        // Validasi result memiliki variable
        if (!result || !result.variable) {
            console.error('[ERROR] formatBartlettTestTable: Invalid result', result);
            continue;
        }

        const variableName = result.variable.label || result.variable.name || 'Unknown';

        if (result.error) {
            // Tambahkan baris error - pastikan rowHeader adalah array non-empty
            const errorRow = {
                rowHeader: [variableName],  // HARUS array of strings, non-empty
                chiSquare: 'N/A',
                df: 'N/A',
                sig: 'N/A'
            };
            console.log('[INFO] Adding error row:', errorRow);
            table.rows.push(errorRow);
        } else {
            // Debug: Log nilai mentah sebelum formatting
            console.log('[INFO] Raw values - statistic:', result.statistic, 'df:', result.df, 'pValue:', result.pValue);

            // Tambahkan baris data normal - pastikan rowHeader adalah array non-empty
            const dataRow = {
                rowHeader: [variableName],  // HARUS array of strings, non-empty
                chiSquare: formatNumber(result.statistic, 3),
                df: formatDF(result.df),
                sig: formatPValue(result.pValue)
            };
            console.log('[INFO] Adding data row:', dataRow);
            table.rows.push(dataRow);
        }
    }

    console.log('[INFO] formatBartlettTestTable: Final table has', table.rows.length, 'rows');

    // Validasi akhir - pastikan semua row punya rowHeader array
    const invalidRows = table.rows.filter(row => !row.rowHeader || !Array.isArray(row.rowHeader) || row.rowHeader.length === 0);
    if (invalidRows.length > 0) {
        console.error('[ERROR] formatBartlettTestTable: Found invalid rows without rowHeader:', invalidRows);
    }

    return table;
}

/**
 * Format tabel statistik deskriptif
 *
 * Memformat statistik deskriptif untuk setiap kelompok.
 * Menampilkan N (ukuran sampel) dan Variance untuk setiap grup,
 * plus pooled variance di akhir.
 *
 * PENTING: Setiap row HARUS punya rowHeader sebagai array non-empty
 */
export function formatDescriptiveStatisticsTable(results: BartlettTestResult[]): BartlettTestTable {
    // Validasi input
    if (!results || results.length === 0) {
        console.warn('[WARN] formatDescriptiveStatisticsTable: No results provided');
        return {
            title: "Descriptive Statistics",
            columnHeaders: [{ header: "No Data", key: "noData" }],
            rows: []
        };
    }

    console.log('[INFO] formatDescriptiveStatisticsTable: Processing', results.length, 'results');

    const table: BartlettTestTable = {
        title: "Descriptive Statistics",
        subtitle: "Group variances and sample sizes",
        columnHeaders: [
            { header: '', key: 'rowHeader' },  // Untuk row header
            { header: 'Group', key: 'group' },
            { header: 'N', key: 'n' },
            { header: 'Variance', key: 'variance' },
        ],
        rows: []
    };

    for (const result of results) {
        if (result.error || !result.groupNames || !result.groupVariances) {
            console.log('[INFO] Skipping result due to error or missing data:', result.error);
            continue;
        }

        // Validasi result memiliki variable
        if (!result || !result.variable) {
            console.error('[ERROR] formatDescriptiveStatisticsTable: Invalid result', result);
            continue;
        }

        const variableName = result.variable.label || result.variable.name || 'Unknown';

        // Tambahkan baris untuk setiap kelompok
        for (let i = 0; i < result.groupNames.length; i++) {
            const groupRow = {
                rowHeader: [variableName],  // HARUS array of strings, non-empty
                group: result.groupNames[i],
                n: result.groupSizes?.[i]?.toString() || '',
                variance: formatNumber(result.groupVariances[i], 4)
            };
            console.log('[INFO] Adding group row:', groupRow);
            table.rows.push(groupRow);
        }

        // Tambahkan baris pooled variance
        const pooledRow = {
            rowHeader: [variableName],  // HARUS array of strings, non-empty
            group: 'Pooled',
            n: result.totalSampleSize?.toString() || '',
            variance: formatNumber(result.pooledVariance, 4)
        };
        console.log('[INFO] Adding pooled row:', pooledRow);
        table.rows.push(pooledRow);
    }

    console.log('[INFO] formatDescriptiveStatisticsTable: Final table has', table.rows.length, 'rows');

    // Validasi akhir - pastikan semua row punya rowHeader array
    const invalidRows = table.rows.filter(row => !row.rowHeader || !Array.isArray(row.rowHeader) || row.rowHeader.length === 0);
    if (invalidRows.length > 0) {
        console.error('[ERROR] formatDescriptiveStatisticsTable: Found invalid rows without rowHeader:', invalidRows);
    }

    return table;
}
