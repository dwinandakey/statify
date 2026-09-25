import {
    isPositiveDefinite,
    parseKnownSigma,
    resizeSigmaCells,
    resolveKnownCovariance,
    setSigmaCell,
    sigmaCell,
    sigmaCellsFrom,
} from "../services/known-sigma";

const L = "Known covariance matrix Σ";
const grid = (upper: string[][]) =>
    upper.map((row, i) => [...Array(i).fill(""), ...row]);

describe("known Σ grid", () => {
    it("mirrors the upper triangle into the lower one", () => {
        let cells = sigmaCellsFrom(null, 2);
        cells = setSigmaCell(cells, 0, 1, "17");
        expect(sigmaCell(cells, 1, 0)).toBe("17");
        // An edit addressed to the lower triangle lands in the upper one.
        cells = setSigmaCell(cells, 1, 0, "5");
        expect(sigmaCell(cells, 0, 1)).toBe("5");
    });

    it("keeps the overlapping block when resized", () => {
        const cells = resizeSigmaCells(grid([["1", "2"], ["3"]]), 3);
        expect(cells[0]).toEqual(["1", "2", ""]);
        expect(cells[2]).toEqual(["", "", ""]);
    });

    it("ignores a stored matrix of another size", () => {
        expect(sigmaCellsFrom([[1]], 2)).toEqual([["", ""], ["", ""]]);
    });
});

describe("parseKnownSigma", () => {
    it("returns the full symmetric matrix", () => {
        expect(parseKnownSigma(grid([["120", "17"], ["22"]]), 2, L)).toEqual({ matrix: [[120, 17], [17, 22]] });
    });

    it("rejects an empty or non-numeric cell", () => {
        expect(parseKnownSigma(grid([["120", ""], ["22"]]), 2, L).error).toBe(
            "Known covariance matrix Σ: every entry on and above the diagonal must be a number."
        );
        expect(parseKnownSigma(grid([["abc", "1"], ["22"]]), 2, L).error).toBe(
            "Known covariance matrix Σ: every entry on and above the diagonal must be a number."
        );
    });

    it("rejects a zero or negative diagonal", () => {
        const msg = "Known covariance matrix Σ: the diagonal entries (variances) must be greater than 0.";
        expect(parseKnownSigma(grid([["0", "1"], ["22"]]), 2, L).error).toBe(msg);
        expect(parseKnownSigma(grid([["4", "1"], ["-1"]]), 2, L).error).toBe(msg);
    });

    it("rejects a matrix that is not positive definite", () => {
        expect(parseKnownSigma(grid([["1", "2"], ["1"]]), 2, L).error).toBe(
            "Known covariance matrix Σ is not positive definite."
        );
        expect(isPositiveDefinite([[4, 2], [2, 1]])).toBe(false); // singular
        expect(isPositiveDefinite([[4, 1], [1, 1]])).toBe(true);
    });
});

describe("resolveKnownCovariance", () => {
    const S = [[2, 0], [0, 3]];
    const base = { p: 2, factors: [] as string[], hasCovariatesOrWls: false, paired: false };

    it("is null without a known Σ", () => {
        expect(resolveKnownCovariance(base)).toBeNull();
    });

    it("uses Σd in paired mode and ignores the other matrices", () => {
        expect(resolveKnownCovariance({ ...base, paired: true, pairedSigma: S, oneSampleSigma: [[9]] })).toEqual({
            input: { design: "one_sample", sigma: S },
            source: "Paired",
        });
    });

    it("refuses the one-population Σ in a design with a factor", () => {
        expect(() => resolveKnownCovariance({ ...base, factors: ["g"], oneSampleSigma: S })).toThrow(/one-population test/);
    });

    it("refuses a Σ of the wrong size", () => {
        expect(() => resolveKnownCovariance({ ...base, p: 3, oneSampleSigma: S })).toThrow(
            "Known covariance matrix Σ must be 3 × 3 (one row and column per dependent variable). Enter Σ again in Test Values."
        );
    });

    it("builds the two-population request", () => {
        const two = { mode: "separate" as const, sigma1: S, sigma2: S };
        expect(resolveKnownCovariance({ ...base, factors: ["g"], twoSample: two, factorLevelCount: 2 })?.input).toEqual({
            design: "two_sample_separate",
            sigma1: S,
            sigma2: S,
        });
        expect(() => resolveKnownCovariance({ ...base, factors: ["g"], twoSample: two, factorLevelCount: 3 })).toThrow(
            /exactly two levels; 'g' has 3/
        );
    });
});
