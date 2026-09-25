type Row = Record<string, unknown>;

const missing = (v: unknown) => v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));

/**
 * Empty cells of the full cross of the fixed factors (v5 B3), over the cases
 * that are complete on every analysis variable (listwise, as the analysis).
 * `slices` are the sliced data columns (one array of `{ name: value }` rows
 * per variable) of the dependent variables, factors and covariates;
 * `factors` names the fixed factors. Returns null with fewer than two
 * factors (a single factor has no empty cells).
 */
export function emptyFactorCells(
    factorSlices: Row[][],
    factors: string[],
    otherSlices: { slice: Row[]; name: string }[]
): { empty: number; total: number } | null {
    if (factors.length < 2) return null;
    const n = Math.min(...factorSlices.map((s) => s.length), ...otherSlices.map((o) => o.slice.length));
    const cells = new Set<string>();
    const levels = factors.map(() => new Set<string>());
    for (let i = 0; i < n; i++) {
        const values = factors.map((f, k) => factorSlices[k][i]?.[f]);
        if (values.some(missing)) continue;
        if (otherSlices.some((o) => missing(o.slice[i]?.[o.name]))) continue;
        values.forEach((v, k) => levels[k].add(String(v)));
        cells.add(JSON.stringify(values.map(String)));
    }
    const total = levels.reduce((acc, s) => acc * s.size, 1);
    return { empty: total - cells.size, total };
}

export function typeIvEmptyCellsMessage(empty: number, total: number): string {
    return `Type IV sums of squares are not available for designs with empty cells (${empty} of ${total} factor-level combinations have no cases). Choose Type III or remove the empty cells.`;
}
