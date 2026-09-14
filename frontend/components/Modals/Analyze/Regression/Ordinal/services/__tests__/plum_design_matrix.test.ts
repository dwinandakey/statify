import { buildOrdinalPlumDesignMatrix } from "../plum_design_matrix";
import { Variable } from "@/types/Variable";

const buildVariable = (name: string, columnIndex: number): Variable => ({
  id: columnIndex,
  columnIndex,
  name,
  width: 8,
  decimals: 0,
  values: [],
  missing: null,
  columns: 1,
  align: "right",
  measure: "scale",
  role: "input",
});

describe("buildOrdinalPlumDesignMatrix", () => {
  it("treats numeric factor as categorical with reference last", () => {
    const rows = [
      { 0: "rendah", 1: 1, 2: 10 },
      { 0: "sedang", 1: 2, 2: 20 },
      { 0: "tinggi", 1: 3, 2: 30 },
    ];

    const factor = buildVariable("X1", 1);
    const covariate = buildVariable("X2", 2);

    const result = buildOrdinalPlumDesignMatrix({
      rows,
      factors: [factor],
      covariates: [covariate],
      interactions: [],
      getRowValue: (row, index) => row?.[index],
      toNumberOrThrow: (value, label) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          throw new Error(`Invalid numeric ${label}`);
        }
        return numeric;
      },
    });

    expect(result.locationTermNames).toEqual(["X2", "X1=1", "X1=2"]);
    expect(result.factorLevelMetadata).toHaveLength(3);

    const reference = result.factorLevelMetadata.find((entry) => entry.isReference);
    expect(reference?.levelValue).toBe("3");
    expect(reference?.activeColumnIndex).toBeNull();
  });

  it("expands factor by factor interactions into active treatment-contrast columns", () => {
    const rows = [
      { 0: "rendah", 1: "A", 2: "X" },
      { 0: "sedang", 1: "A", 2: "Y" },
      { 0: "tinggi", 1: "B", 2: "X" },
      { 0: "tinggi", 1: "B", 2: "Y" },
    ];
    const f1 = buildVariable("F1", 1);
    const f2 = buildVariable("F2", 2);

    const result = buildOrdinalPlumDesignMatrix({
      rows,
      factors: [f1, f2],
      covariates: [],
      interactions: [{ kind: "interaction", id: "F1-F2", name: "F1*F2", variables: [f1, f2] }],
      getRowValue: (row, index) => row?.[index],
      toNumberOrThrow: (value, label) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) throw new Error(`Invalid numeric ${label}`);
        return numeric;
      },
    });

    expect(result.locationTermNames).toEqual(["F1=A", "F2=X", "F1=A*F2=X"]);
    expect(result.interactionColumnCounts["F1-F2"]).toBe(1);
    expect(result.locationDesignMatrix.map((row) => row[2])).toEqual([1, 0, 0, 0]);
  });

  it("supports factor by covariate interactions", () => {
    const rows = [
      { 0: "rendah", 1: "A", 2: 10 },
      { 0: "sedang", 1: "B", 2: 20 },
    ];
    const factor = buildVariable("F1", 1);
    const covariate = buildVariable("X1", 2);

    const result = buildOrdinalPlumDesignMatrix({
      rows,
      factors: [factor],
      covariates: [covariate],
      interactions: [{ kind: "interaction", id: "F1-X1", name: "F1*X1", variables: [factor, covariate] }],
      getRowValue: (row, index) => row?.[index],
      toNumberOrThrow: (value, label) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) throw new Error(`Invalid numeric ${label}`);
        return numeric;
      },
    });

    expect(result.locationTermNames).toEqual(["X1", "F1=A", "F1=A*X1"]);
    expect(result.interactionColumnCounts["F1-X1"]).toBe(1);
    expect(result.locationDesignMatrix.map((row) => row[2])).toEqual([10, 0]);
  });

  it("keeps covariate by covariate interactions as one product column", () => {
    const rows = [
      { 0: "rendah", 1: 2, 2: 10 },
      { 0: "sedang", 1: 3, 2: 20 },
    ];
    const x1 = buildVariable("X1", 1);
    const x2 = buildVariable("X2", 2);

    const result = buildOrdinalPlumDesignMatrix({
      rows,
      factors: [],
      covariates: [x1, x2],
      interactions: [{ kind: "interaction", id: "X1-X2", name: "X1*X2", variables: [x1, x2] }],
      getRowValue: (row, index) => row?.[index],
      toNumberOrThrow: (value, label) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) throw new Error(`Invalid numeric ${label}`);
        return numeric;
      },
    });

    expect(result.locationTermNames).toEqual(["X1", "X2", "X1*X2"]);
    expect(result.interactionColumnCounts["X1-X2"]).toBe(1);
    expect(result.locationDesignMatrix.map((row) => row[2])).toEqual([20, 60]);
  });
});
