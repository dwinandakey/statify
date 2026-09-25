import { Table } from "@/types/Table";

export function formatSig(value: any) {
    // If already a formatted string (from WASM output), return as-is
    if (typeof value === "string") {
        return value;
    }

    if (value === null || typeof value === "undefined" || isNaN(value)) {
        return "";
    }
    if (value < 0.001) {
        return "<.001";
    }
    return formatDisplayNumber(value);
}

/**
 * Format correlation matrix values with 4 decimal places
 * Very small values (< 1e-4) are shown as "0.0000" not scientific notation
 */
export function formatCorrelationValue(num: number | string | undefined | null): string | null {
    // If already a formatted string (from WASM output), return as-is
    if (typeof num === "string") {
        return num;
    }

    if (typeof num === "undefined") return "";
    if (num === null || typeof num === "undefined" || isNaN(num)) {
        return "";
    }
    if (!isFinite(num)) return num > 0 ? "Infinity" : "-Infinity";

    // exact zero
    if (num === 0) {
        return "0.0000";
    }

    // Treat values very close to zero as 0.0000 (NOT scientific notation)
    if (Math.abs(num) < 1e-4) {
        return "0.0000";
    }

    // Handle integers
    if (Number.isInteger(num)) {
        // Special case for 100
        if (num === 100) {
            return "100.0";
        }
        return num.toString();
    }

    // For regular decimal numbers - format with 4 decimals for correlation
    return num.toFixed(4).replace(/\.?0+$/, "");
}

export function formatDisplayNumber(
    num: number | string | undefined | null
): string | null {
    // If already a formatted string (from WASM output), return as-is
    if (typeof num === "string") {
        return num;
    }

    if (typeof num === "undefined") return "";
    if (num === null || typeof num === "undefined" || isNaN(num)) {
        return "";
    }
    if (!isFinite(num)) return num > 0 ? "Infinity" : "-Infinity";

    // exact zero
    if (num === 0) {
        return "0";
    }

    // Treat values very close to zero as 0
    if (Math.abs(num) < 1e-20) {
        return "0.000";
    }

    // Show scientific notation for very small or very large numbers
    if (Math.abs(num) < 1e-4 || Math.abs(num) >= 1e16) {
        return num.toExponential(3).toUpperCase();
    }

    // Handle integers
    if (Number.isInteger(num)) {
        // Special case for 100
        if (num === 100) {
            return "100.0";
        }
        return num.toString();
    }

    // For regular decimal numbers
    return num.toFixed(4).replace(/\.?0+$/, "");
}

// ── GLM Multivariate / Repeated Measures (v5) ─────────────────────────────
// Fixed decimals per column as SPSS: statistics always with 4 decimals
// ("1.1" → "1.1000", 1 → "1.0000"); df, counts and coefficients keep integers
// as they are and show fractional values with 4 decimals. Scientific
// notation for very small or very large values as formatDisplayNumber. Other
// modules keep formatDisplayNumber.
function glmSpecial(num: number | string | undefined | null): string | null | undefined {
    if (typeof num === "string") return num;
    if (typeof num === "undefined" || num === null || isNaN(num as number)) return "";
    if (!isFinite(num as number)) return (num as number) > 0 ? "Infinity" : "-Infinity";
    if (num !== 0 && (Math.abs(num as number) < 1e-4 || Math.abs(num as number) >= 1e16)) {
        return (num as number).toExponential(3).toUpperCase();
    }
    return undefined;
}

/** Statistic cells (Value, F, SS, MS, η², λ, power, means, bounds): 4 decimals. */
export function formatGlmStat(num: number | string | undefined | null): string | null {
    const special = glmSpecial(num);
    if (special !== undefined) return special;
    return (num as number).toFixed(4);
}

/** df, n, coefficients and entered values: integers unchanged, else 4 decimals. */
export function formatGlmNumber(num: number | string | undefined | null): string | null {
    const special = glmSpecial(num);
    if (special !== undefined) return special;
    return Number.isInteger(num) ? String(num) : (num as number).toFixed(4);
}

/** Sig.: "<.001" or 4 decimals (not trimmed). */
export function formatGlmSig(value: any): string | null {
    if (typeof value === "string") return value;
    if (value === null || typeof value === "undefined" || isNaN(value)) return "";
    if (value < 0.001) return "<.001";
    return formatGlmStat(value);
}

// Helper function to ensure columnHeaders are sufficient for all rows
export function ensureEnoughHeaders(table: Table): Table {
    if (!table.rows || table.rows.length === 0) return table;

    // Get all unique column keys from all rows
    const allKeys = new Set<string>();
    table.rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (key !== "rowHeader") allKeys.add(key);
        });
    });

    // Check current column headers (excluding rowHeader columns)
    let headerCount = table.columnHeaders.length;
    const rowHeaderCount = table.rows[0].rowHeader
        ? Array.isArray(table.rows[0].rowHeader)
            ? table.rows[0].rowHeader.length
            : 1
        : 0;

    // Calculate how many non-rowHeader columns we have
    const dataColumnCount = allKeys.size;

    // Add empty headers if needed
    while (headerCount < rowHeaderCount + dataColumnCount) {
        table.columnHeaders.push({ header: "" });
        headerCount++;
    }

    return table;
}
