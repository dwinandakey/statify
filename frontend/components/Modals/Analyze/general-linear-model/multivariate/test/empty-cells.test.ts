import { emptyFactorCells, typeIvEmptyCellsMessage } from "@/components/Modals/Analyze/general-linear-model/multivariate/services/empty-cells";

const col = (name: string, values: unknown[]) => values.map((v) => ({ [name]: v }));

describe("emptyFactorCells", () => {
    const A = [1, 1, 1, 2, 2, 2];
    const B = [1, 2, 3, 1, 2, 2];
    const y = [5, 6, 7, 8, 9, 10];

    it("counts the empty cells of the full cross (2 × 3 with cell A2 × B3 empty)", () => {
        const r = emptyFactorCells([col("A", A), col("B", B)], ["A", "B"], [{ slice: col("y", y), name: "y" }]);
        expect(r).toEqual({ empty: 1, total: 6 });
    });

    it("uses complete cases only (a case missing on y does not fill its cell)", () => {
        // Case 1 (A1 × B1) is missing on y: A1 × B1 becomes empty as well.
        const r = emptyFactorCells([col("A", A), col("B", B)], ["A", "B"], [{ slice: col("y", [null, 6, 7, 8, 9, 10]), name: "y" }]);
        expect(r).toEqual({ empty: 2, total: 6 });
    });

    it("drops a level whose only case is incomplete (as the listwise analysis)", () => {
        // B3 occurs only in case 3; with y missing there B has two levels.
        const r = emptyFactorCells([col("A", A), col("B", B)], ["A", "B"], [{ slice: col("y", [5, 6, null, 8, 9, 10]), name: "y" }]);
        expect(r).toEqual({ empty: 0, total: 4 });
    });

    it("finds no empty cell in a full design", () => {
        const r = emptyFactorCells([col("A", [1, 1, 2, 2]), col("B", [1, 2, 1, 2])], ["A", "B"], []);
        expect(r).toEqual({ empty: 0, total: 4 });
    });

    it("returns null for a single factor", () => {
        expect(emptyFactorCells([col("A", A)], ["A"], [])).toBeNull();
    });

    it("gives the refusal message", () => {
        expect(typeIvEmptyCellsMessage(1, 8)).toBe(
            "Type IV sums of squares are not available for designs with empty cells (1 of 8 factor-level combinations have no cases). Choose Type III or remove the empty cells."
        );
    });
});
