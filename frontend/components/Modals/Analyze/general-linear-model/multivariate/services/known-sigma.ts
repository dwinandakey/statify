// Known population covariance matrix Σ ("Population covariance matrix (Σ)
// known" in Test Values, Test Values (δ₀) and Paired). The dialogs keep the
// p × p grid as text; the user fills the upper triangle including the
// diagonal and the lower triangle mirrors it, so the matrix is symmetric by
// construction. The chi-square test itself is computed in Rust
// (MultivariateAnalysis::get_known_covariance_test).

export type SigmaCells = string[][];

/** Rust KnownCovarianceInput (wasm/constructor.rs). */
export type KnownCovarianceInput = {
    design: "one_sample" | "two_sample_common" | "two_sample_separate";
    sigma?: number[][];
    sigma1?: number[][];
    sigma2?: number[][];
};

export const knownSigmaMessages = {
    notNumber: (label: string) =>
        `${label}: every entry on and above the diagonal must be a number.`,
    diagonal: (label: string) =>
        `${label}: the diagonal entries (variances) must be greater than 0.`,
    notPositiveDefinite: (label: string) =>
        `${label} is not positive definite.`,
};

/** p × p grid of empty cells. */
export function emptySigmaCells(p: number): SigmaCells {
    return Array.from({ length: p }, () => Array.from({ length: p }, () => ""));
}

/** Grid from a stored matrix; empty when the stored matrix is not p × p
 *  (e.g. the dependent variables changed since it was entered). */
export function sigmaCellsFrom(matrix: number[][] | null | undefined, p: number): SigmaCells {
    if (!isSquare(matrix, p)) return emptySigmaCells(p);
    return matrix!.map((row) => row.map((v) => String(v)));
}

/** Upper-triangle edit (j ≥ i); the lower triangle is read from the upper
 *  one when rendered and parsed. */
export function setSigmaCell(cells: SigmaCells, i: number, j: number, value: string): SigmaCells {
    const [r, c] = j >= i ? [i, j] : [j, i];
    return cells.map((row, k) => (k === r ? row.map((v, l) => (l === c ? value : v)) : row));
}

/** Value shown in cell (i, j): the upper-triangle entry for both halves. */
export function sigmaCell(cells: SigmaCells, i: number, j: number): string {
    return j >= i ? cells[i]?.[j] ?? "" : cells[j]?.[i] ?? "";
}

export function isSquare(matrix: number[][] | null | undefined, p: number): boolean {
    return Array.isArray(matrix) && matrix.length === p && matrix.every((row) => Array.isArray(row) && row.length === p);
}

/** Cholesky factorisation succeeds ⇔ the symmetric matrix is positive
 *  definite. */
export function isPositiveDefinite(m: number[][]): boolean {
    const p = m.length;
    const L = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < p; i++) {
        for (let j = 0; j <= i; j++) {
            let s = m[i][j];
            for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
            if (i === j) {
                if (!(s > 0) || !Number.isFinite(s)) return false;
                L[i][i] = Math.sqrt(s);
            } else {
                L[i][j] = s / L[j][j];
            }
        }
    }
    return true;
}

function parseNumber(raw: string): number | null {
    const t = String(raw ?? "").trim();
    if (t === "") return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : null;
}

/**
 * Validate the grid (Continue of the dialog): every entry on and above the
 * diagonal is a number, the diagonal is positive, and the symmetric matrix
 * is positive definite. Returns the full symmetric matrix or the message.
 */
export function parseKnownSigma(
    cells: SigmaCells,
    p: number,
    label: string
): { matrix: number[][]; error?: undefined } | { matrix?: undefined; error: string } {
    const upper: number[][] = [];
    for (let i = 0; i < p; i++) {
        upper.push([]);
        for (let j = 0; j < p; j++) {
            if (j < i) {
                upper[i].push(0);
                continue;
            }
            const v = parseNumber(cells[i]?.[j] ?? "");
            if (v === null) return { error: knownSigmaMessages.notNumber(label) };
            upper[i].push(v);
        }
    }
    const matrix = upper.map((row, i) => row.map((v, j) => (j >= i ? v : upper[j][i])));
    if (matrix.some((row, i) => !(row[i] > 0))) return { error: knownSigmaMessages.diagonal(label) };
    if (!isPositiveDefinite(matrix)) return { error: knownSigmaMessages.notPositiveDefinite(label) };
    return { matrix };
}

/** Grid resized to p × p, keeping the entries of the overlapping upper-left
 *  block (Paired: pairs added or removed). */
export function resizeSigmaCells(cells: SigmaCells, p: number): SigmaCells {
    if (cells.length === p && cells.every((row) => row.length === p)) return cells;
    return Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => cells[i]?.[j] ?? ""));
}

export const KNOWN_SIGMA_DESIGN_MESSAGE =
    "The chi-square test with a known covariance matrix is available for the one-sample, paired, and two-sample designs (no Fixed Factor, or one Fixed Factor with two levels, without covariates or WLS weight).";

/** Where the known Σ was entered (table notes). */
export type KnownCovarianceSource = "Test Values" | "Test Values (δ₀)" | "Paired";

/**
 * The known-Σ request of a run, or null when no Σ applies. Paired mode uses
 * Σd from the Paired dialog; otherwise Σ from Test Values (one population:
 * no Fixed Factor, covariate or WLS weight) or from Test Values (δ₀) (one
 * Fixed Factor with two levels). Throws when a stored Σ does not fit the
 * current design or number of dependent variables.
 */
export function resolveKnownCovariance(args: {
    paired: boolean;
    pairedSigma?: number[][] | null;
    p: number;
    factors: string[];
    hasCovariatesOrWls: boolean;
    oneSampleSigma?: number[][] | null;
    twoSample?: { mode: "common" | "separate"; sigma?: number[][] | null; sigma1?: number[][] | null; sigma2?: number[][] | null } | null;
    factorLevelCount?: number;
}): { input: KnownCovarianceInput; source: KnownCovarianceSource } | null {
    const { p } = args;
    const size = (m: number[][] | null | undefined, label: string, where: string, per: string) => {
        if (!isSquare(m, p)) {
            throw new Error(`Known covariance matrix ${label} must be ${p} × ${p} (one row and column per ${per}). Enter ${label} again in ${where}.`);
        }
        return m as number[][];
    };
    if (args.paired) {
        if (!args.pairedSigma) return null;
        return {
            input: { design: "one_sample", sigma: size(args.pairedSigma, "Σd", "Paired", "pair") },
            source: "Paired",
        };
    }
    if (args.oneSampleSigma) {
        if (args.factors.length > 0 || args.hasCovariatesOrWls) {
            throw new Error(
                "The known covariance matrix Σ entered in Test Values is for the one-population test (no Fixed Factor, covariate or WLS weight). Clear \"Population covariance matrix (Σ) known\" in Test Values or change the model."
            );
        }
        return {
            input: { design: "one_sample", sigma: size(args.oneSampleSigma, "Σ", "Test Values", "dependent variable") },
            source: "Test Values",
        };
    }
    const two = args.twoSample;
    if (!two || args.factors.length !== 1) return null;
    if (args.hasCovariatesOrWls) throw new Error(KNOWN_SIGMA_DESIGN_MESSAGE);
    if (args.factorLevelCount !== 2) {
        throw new Error(
            `The chi-square test with a known covariance matrix for two populations requires the Fixed Factor to have exactly two levels; '${args.factors[0]}' has ${args.factorLevelCount ?? 0}.`
        );
    }
    const where = "Test Values (δ₀)";
    const input: KnownCovarianceInput =
        two.mode === "separate"
            ? {
                  design: "two_sample_separate",
                  sigma1: size(two.sigma1, "Σ₁", where, "dependent variable"),
                  sigma2: size(two.sigma2, "Σ₂", where, "dependent variable"),
              }
            : { design: "two_sample_common", sigma: size(two.sigma, "Σ", where, "dependent variable") };
    return { input, source: where };
}
