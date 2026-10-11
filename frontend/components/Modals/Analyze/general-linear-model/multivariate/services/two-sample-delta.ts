// Hypothesised difference δ₀ for the two-population Hotelling T² test
// (H₀: μ₁ − μ₂ = δ₀, Pooled or Unequal).
//
// Implemented as a data transformation before the analysis: δ₀ₖ is
// subtracted from every observation of dependent variable k in the FIRST
// level of the Fixed Factor. Testing μ₁ − μ₂ = 0 on the shifted data is the
// same as testing μ₁ − μ₂ = δ₀ on the original data; covariance matrices are
// unchanged. Level order is the one of the output tables (Descriptive
// Statistics, Between-Subjects Factors): numeric when both levels parse as
// numbers, otherwise lexicographic (rust/src/stats/descriptive_statistics.rs,
// sort_levels).

type Cell = string | number | null | undefined;
type SlicedData = Record<string, Cell>[][];

/** Level string as Rust's data_value_to_string produces it (Number → "1",
 *  Text → as is); null and empty cells are not levels. */
export function levelKey(value: Cell): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    const s = String(value);
    return s === "" ? null : s;
}

// A decimal number as Rust's str::parse::<f64> accepts it (no surrounding
// spaces, no trailing text).
const RUST_F64 = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** Same ordering as sort_levels in descriptive_statistics.rs. */
export function compareLevels(a: string, b: string): number {
    if (RUST_F64.test(a) && RUST_F64.test(b)) return Number(a) - Number(b);
    return a < b ? -1 : a > b ? 1 : 0;
}

/** Distinct levels of one factor column (sliced data of that factor), in
 *  output-table order. */
export function factorLevels(factorColumn: Record<string, Cell>[], factor: string): string[] {
    const set = new Set<string>();
    for (const row of factorColumn ?? []) {
        const k = levelKey(row?.[factor]);
        if (k !== null) set.add(k);
    }
    return [...set].sort(compareLevels);
}

/** True when δ₀ has at least one non-zero finite component. */
export function hasNonZeroDelta(delta0: number[] | null | undefined): boolean {
    return Array.isArray(delta0) && delta0.some((v) => Number.isFinite(v) && v !== 0);
}

/** δ₀ resized to the number of dependent variables (missing/NaN → 0). */
export function normalizeDelta(delta0: number[] | null | undefined, p: number): number[] {
    return Array.from({ length: p }, (_, i) =>
        Array.isArray(delta0) && Number.isFinite(delta0[i]) ? delta0[i] : 0
    );
}

/**
 * Subtract δ₀ₖ from dependent variable k in every row whose factor value is
 * `firstLevel`. Returns a new sliced-data array; the input is not changed.
 * Non-numeric and missing cells are left as they are (listwise deletion in
 * Rust still drops those rows).
 */
export function shiftFirstLevel(
    depData: SlicedData,
    depVars: string[],
    factorColumn: Record<string, Cell>[],
    factor: string,
    firstLevel: string,
    delta0: number[]
): SlicedData {
    return depData.map((column, k) => {
        const name = depVars[k];
        const d = delta0[k] ?? 0;
        if (!d) return column.map((row) => ({ ...row }));
        return column.map((row, i) => {
            const out = { ...row };
            if (levelKey(factorColumn?.[i]?.[factor]) !== firstLevel) return out;
            const v = out[name];
            if (typeof v === "number" && Number.isFinite(v)) {
                out[name] = v - d;
            } else if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
                out[name] = Number(v) - d;
            }
            return out;
        });
    });
}

/**
 * Descriptive Statistics of the original data from those of the shifted
 * data: the first level's mean gets δ₀ₖ back; group SDs and n are unchanged
 * by a shift; the Total row is recomputed from the groups
 * (mean = Σ nᵍ m̄ᵍ / N, variance = [Σ (nᵍ − 1) sᵍ² + Σ nᵍ (m̄ᵍ − m̄)²] / (N − 1)).
 */
export function restoreDescriptiveStatistics(
    descriptive: Record<string, any> | null | undefined,
    depVars: string[],
    firstLevel: string,
    delta0: number[]
): Record<string, any> | null | undefined {
    if (!descriptive) return descriptive;
    const out: Record<string, any> = {};
    for (const [key, entry] of Object.entries(descriptive)) {
        const k = depVars.indexOf(entry?.dependent_variable ?? key);
        const d = k >= 0 ? delta0[k] ?? 0 : 0;
        if (!d || !Array.isArray(entry?.groups)) {
            out[key] = entry;
            continue;
        }
        const groups = entry.groups.map((g: any) => ({ ...g, stats: { ...g.stats } }));
        const levelGroups = groups.filter((g: any) => g.factor_value !== "Total");
        for (const g of levelGroups) {
            if (g.factor_value === firstLevel) g.stats.mean = g.stats.mean + d;
        }
        const total = groups.find((g: any) => g.factor_value === "Total");
        if (total && levelGroups.length > 0) {
            const N = levelGroups.reduce((s: number, g: any) => s + g.stats.n, 0);
            const mean = levelGroups.reduce((s: number, g: any) => s + g.stats.n * g.stats.mean, 0) / N;
            const ss = levelGroups.reduce(
                (s: number, g: any) =>
                    s + (g.stats.n - 1) * g.stats.std_deviation ** 2 + g.stats.n * (g.stats.mean - mean) ** 2,
                0
            );
            total.stats.mean = mean;
            total.stats.std_deviation = N > 1 ? Math.sqrt(ss / (N - 1)) : 0;
        }
        out[key] = { ...entry, groups };
    }
    return out;
}
