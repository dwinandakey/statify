import type { Variable } from "@/types/Variable";
import type { DataRow } from "@/types/Data";

export type DiffSlicedData = Record<string, string | number | null>[][];
export type DiffVarDefs = unknown[][];

export type BuildDifferenceResult = {
    slicedData: DiffSlicedData;
    varDefs: DiffVarDefs;
    diffNames: string[];
};

export type DifferencePreview = {
    columns: string[];
    rows: (number | string | null)[][];
};

export function makeDiffName(v1: string, v2: string): string {
    return `d_${v1}_minus_${v2}`;
}

function parseCell(raw: string | number | null | undefined): number | null {
    if (raw === undefined || raw === null || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    const num = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(num) ? num : null;
}

function validatePairs(
    variables: Variable[],
    pairs: [string, string][]
): void {
    if (!pairs || pairs.length === 0) {
        throw new Error("No variable pairs provided for paired Hotelling T².");
    }
    pairs.forEach(([v1, v2], idx) => {
        if (!v1 || !v2) {
            throw new Error(
                `Pair ${idx + 1} is incomplete — both Variable 1 and Variable 2 must be selected.`
            );
        }
        if (v1 === v2) {
            throw new Error(
                `Pair ${idx + 1} uses the same variable ("${v1}") on both sides; pairs must contain two different variables.`
            );
        }
        if (!variables.find((v) => v.name === v1)) {
            throw new Error(`Variable "${v1}" (pair ${idx + 1}) was not found in the active dataset.`);
        }
        if (!variables.find((v) => v.name === v2)) {
            throw new Error(`Variable "${v2}" (pair ${idx + 1}) was not found in the active dataset.`);
        }
    });
}

// Determine the last row index that has any data for the paired variables.
// Matches the semantics of useVariable.getMaxIndex so the row count fed to
// Rust matches what the standard pipeline would produce.
function computeMaxIndex(
    dataRows: DataRow[],
    variables: Variable[],
    pairs: [string, string][]
): number {
    const seen = new Set<string>();
    const allNames: string[] = [];
    pairs.forEach(([v1, v2]) => {
        if (!seen.has(v1)) { seen.add(v1); allNames.push(v1); }
        if (!seen.has(v2)) { seen.add(v2); allNames.push(v2); }
    });
    let maxIndex = -1;
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        for (const name of allNames) {
            const def = variables.find((v) => v.name === name);
            if (!def) continue;
            const raw = row?.[def.columnIndex];
            if (raw !== undefined && raw !== null && raw !== "") {
                if (i > maxIndex) maxIndex = i;
                break;
            }
        }
    }
    return maxIndex < 0 ? 0 : maxIndex;
}

/**
 * Build the synthetic difference-column data for paired Hotelling T².
 *
 * For each pair (v1, v2), produces a "d_v1_minus_v2" column with row values
 * d_i = v1_i − v2_i (null where either side is missing). The output shape
 * matches getSlicedData/getVarDefs so the existing WASM pipeline can consume
 * it as if it were a normal set of dependent variables.
 */
export function buildDifferenceData(
    dataRows: DataRow[],
    variables: Variable[],
    pairs: [string, string][]
): BuildDifferenceResult {
    validatePairs(variables, pairs);

    const maxIndex = computeMaxIndex(dataRows, variables, pairs);
    const diffNames = pairs.map(([v1, v2]) => makeDiffName(v1, v2));
    const slicedData: DiffSlicedData = [];
    const varDefs: DiffVarDefs = [];

    pairs.forEach(([v1, v2], pairIdx) => {
        const diffName = diffNames[pairIdx];
        const v1Def = variables.find((v) => v.name === v1)!;
        const v2Def = variables.find((v) => v.name === v2)!;

        const rows: Record<string, number | null>[] = [];
        for (let i = 0; i <= maxIndex; i++) {
            const row = dataRows[i];
            const a = parseCell(row?.[v1Def.columnIndex]);
            const b = parseCell(row?.[v2Def.columnIndex]);
            const d = a !== null && b !== null ? a - b : null;
            rows.push({ [diffName]: d });
        }
        slicedData.push(rows);

        varDefs.push([
            {
                id: undefined,
                columnIndex: pairIdx,
                name: diffName,
                type: "NUMERIC",
                width: 8,
                decimals: 4,
                label: `${v1} − ${v2}`,
                values: [],
                missing: [],
                columns: 0,
                align: "left",
                measure: "scale",
                role: "input",
            },
        ]);
    });

    return { slicedData, varDefs, diffNames };
}

/**
 * Build a preview table of the difference vector for display in the dialog
 * before the analysis runs. Returns up to `maxRows` rows.
 */
export function computeDifferencePreview(
    dataRows: DataRow[],
    variables: Variable[],
    pairs: [string, string][],
    maxRows: number = 10
): DifferencePreview {
    if (!pairs || pairs.length === 0) {
        return { columns: ["Row"], rows: [] };
    }
    // Soft validation: skip pairs whose variables don't exist instead of throwing,
    // so the preview can show partial state while the user is mid-selection.
    const validPairs: [string, string][] = pairs.filter(([v1, v2]) => {
        if (!v1 || !v2) return false;
        if (!variables.find((v) => v.name === v1)) return false;
        if (!variables.find((v) => v.name === v2)) return false;
        return true;
    });

    const columns: string[] = ["Row"];
    validPairs.forEach(([v1, v2]) => {
        columns.push(v1, v2, `${v1} − ${v2}`);
    });

    const numRows = Math.min(dataRows.length, maxRows);
    const rows: (number | string | null)[][] = [];
    for (let i = 0; i < numRows; i++) {
        const row: (number | string | null)[] = [i + 1];
        validPairs.forEach(([v1, v2]) => {
            const v1Def = variables.find((v) => v.name === v1)!;
            const v2Def = variables.find((v) => v.name === v2)!;
            const a = parseCell(dataRows[i]?.[v1Def.columnIndex]);
            const b = parseCell(dataRows[i]?.[v2Def.columnIndex]);
            const d = a !== null && b !== null ? a - b : null;
            row.push(a, b, d);
        });
        rows.push(row);
    }
    return { columns, rows };
}
