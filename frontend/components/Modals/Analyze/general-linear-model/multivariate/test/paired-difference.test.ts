/** @jest-environment node */

import {
    buildDifferenceData,
    computeDifferencePreview,
    makeDiffName,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/paired-difference";
import type { Variable } from "@/types/Variable";
import type { DataRow } from "@/types/Data";

const numericVar = (name: string, columnIndex: number): Variable => ({
    columnIndex,
    name,
    type: "NUMERIC",
    width: 8,
    decimals: 2,
    label: name,
    values: [],
    missing: null,
    columns: 8,
    align: "right",
    measure: "scale",
    role: "input",
});

// Modul 4A APG STIS — pelapis anti karat. 15 lokasi, 2 jenis pelapis,
// 2 variabel (kedalaman, ukuran) per jenis. Layout kolom:
//   0: kedalaman_jenis1
//   1: kedalaman_jenis2
//   2: ukuran_jenis1
//   3: ukuran_jenis2
const apgModul4aVariables: Variable[] = [
    numericVar("kedalaman_jenis1", 0),
    numericVar("kedalaman_jenis2", 1),
    numericVar("ukuran_jenis1", 2),
    numericVar("ukuran_jenis2", 3),
];

const apgModul4aData: DataRow[] = [
    [73, 51, 31.6, 35.5],
    [43, 41, 9.0, 34.2],
    [47, 43, 30.5, 27.6],
    [53, 41, 25.1, 22.0],
    [58, 47, 28.4, 26.2],
    [47, 32, 24.9, 32.5],
    [52, 24, 31.6, 24.3],
    [38, 43, 27.7, 31.0],
    [61, 53, 34.6, 30.4],
    [56, 52, 21.7, 24.3],
    [56, 57, 17.4, 13.7],
    [34, 44, 24.6, 21.5],
    [55, 57, 28.3, 26.8],
    [65, 40, 27.6, 22.4],
    [75, 68, 36.5, 30.5],
];

describe("paired-difference: makeDiffName", () => {
    it("produces a deterministic synthetic name", () => {
        expect(makeDiffName("a", "b")).toBe("d_a_minus_b");
        expect(makeDiffName("kedalaman_jenis1", "kedalaman_jenis2")).toBe(
            "d_kedalaman_jenis1_minus_kedalaman_jenis2"
        );
    });
});

describe("paired-difference: buildDifferenceData", () => {
    it("builds synthetic columns matching getSlicedData shape", () => {
        const pairs: [string, string][] = [
            ["kedalaman_jenis1", "kedalaman_jenis2"],
            ["ukuran_jenis1", "ukuran_jenis2"],
        ];
        const { slicedData, varDefs, diffNames } = buildDifferenceData(
            apgModul4aData,
            apgModul4aVariables,
            pairs
        );

        expect(diffNames).toEqual([
            "d_kedalaman_jenis1_minus_kedalaman_jenis2",
            "d_ukuran_jenis1_minus_ukuran_jenis2",
        ]);

        // Outer array length = number of pairs (DVs).
        expect(slicedData).toHaveLength(2);
        // Inner array length = number of data rows.
        expect(slicedData[0]).toHaveLength(15);
        expect(slicedData[1]).toHaveLength(15);

        // Each row is keyed by the synthetic name with the right delta.
        // Integer-only pairs are exact (73-51, 43-41); float pairs use toBeCloseTo
        // because IEEE 754 turns 31.6-35.5 into -3.8999999...
        expect(
            (slicedData[0][0] as Record<string, number | null>)[
                "d_kedalaman_jenis1_minus_kedalaman_jenis2"
            ]
        ).toBe(22);
        expect(
            (slicedData[0][1] as Record<string, number | null>)[
                "d_kedalaman_jenis1_minus_kedalaman_jenis2"
            ]
        ).toBe(2);
        const diff10 = (slicedData[1][0] as Record<string, number | null>)[
            "d_ukuran_jenis1_minus_ukuran_jenis2"
        ];
        expect(diff10).not.toBeNull();
        expect(diff10 as number).toBeCloseTo(-3.9, 10);

        // VarDefs mirror getVarDefs shape: outer per-DV, inner length 1.
        expect(varDefs).toHaveLength(2);
        expect(varDefs[0]).toHaveLength(1);
        const def = varDefs[0][0] as { name: string; type: string; label: string };
        expect(def.name).toBe("d_kedalaman_jenis1_minus_kedalaman_jenis2");
        expect(def.type).toBe("NUMERIC");
        expect(def.label).toBe("kedalaman_jenis1 − kedalaman_jenis2");
    });

    it("emits null for rows where either side is missing", () => {
        const rows: DataRow[] = [
            [10, 5, "", 1],
            [null, 5, 2, 1],
            [10, null, 2, 1],
            [10, 5, 2, 1],
        ];
        const variables = [
            numericVar("a", 0),
            numericVar("b", 1),
            numericVar("c", 2),
            numericVar("d", 3),
        ];

        const { slicedData } = buildDifferenceData(rows, variables, [["a", "b"]]);
        const series = slicedData[0];

        expect(series[0]).toEqual({ d_a_minus_b: 5 });
        expect(series[1]).toEqual({ d_a_minus_b: null });
        expect(series[2]).toEqual({ d_a_minus_b: null });
        expect(series[3]).toEqual({ d_a_minus_b: 5 });
    });

    it("parses comma decimal separators (Indonesian locale)", () => {
        const rows: DataRow[] = [["10,5", "2,5", "", ""]];
        const variables = [
            numericVar("a", 0),
            numericVar("b", 1),
            numericVar("c", 2),
            numericVar("d", 3),
        ];

        const { slicedData } = buildDifferenceData(rows, variables, [["a", "b"]]);
        expect(slicedData[0][0]).toEqual({ d_a_minus_b: 8 });
    });

    it("rejects an empty pair list", () => {
        expect(() =>
            buildDifferenceData(apgModul4aData, apgModul4aVariables, [])
        ).toThrow(/No variable pairs/);
    });

    it("rejects pairs using the same variable on both sides", () => {
        expect(() =>
            buildDifferenceData(apgModul4aData, apgModul4aVariables, [
                ["kedalaman_jenis1", "kedalaman_jenis1"],
            ])
        ).toThrow(/same variable/);
    });

    it("rejects pairs with unknown variables", () => {
        expect(() =>
            buildDifferenceData(apgModul4aData, apgModul4aVariables, [
                ["kedalaman_jenis1", "tidak_ada"],
            ])
        ).toThrow(/not found/);
    });

    it("rejects pairs with empty variable names", () => {
        expect(() =>
            buildDifferenceData(apgModul4aData, apgModul4aVariables, [
                ["", "kedalaman_jenis2"],
            ])
        ).toThrow(/incomplete/);
    });
});

describe("paired-difference: computeDifferencePreview", () => {
    it("returns the first N rows with V1, V2, and diff columns", () => {
        const pairs: [string, string][] = [
            ["kedalaman_jenis1", "kedalaman_jenis2"],
            ["ukuran_jenis1", "ukuran_jenis2"],
        ];
        const preview = computeDifferencePreview(
            apgModul4aData,
            apgModul4aVariables,
            pairs,
            5
        );

        expect(preview.columns).toEqual([
            "Row",
            "kedalaman_jenis1",
            "kedalaman_jenis2",
            "kedalaman_jenis1 − kedalaman_jenis2",
            "ukuran_jenis1",
            "ukuran_jenis2",
            "ukuran_jenis1 − ukuran_jenis2",
        ]);

        expect(preview.rows).toHaveLength(5);
        const row0 = preview.rows[0];
        expect(row0[0]).toBe(1); // Row number
        expect(row0[1]).toBe(73);
        expect(row0[2]).toBe(51);
        expect(row0[3]).toBe(22); // 73 - 51 exact
        expect(row0[4]).toBe(31.6);
        expect(row0[5]).toBe(35.5);
        expect(row0[6] as number).toBeCloseTo(-3.9, 10); // 31.6 - 35.5 with IEEE 754 noise
        // Floating-point math: 9.0 - 34.2 = -25.2 within tolerance.
        expect(preview.rows[1][3]).toBe(2);
        expect(preview.rows[1][6] as number).toBeCloseTo(-25.2, 10);
    });

    it("respects the maxRows cap", () => {
        const preview = computeDifferencePreview(
            apgModul4aData,
            apgModul4aVariables,
            [["kedalaman_jenis1", "kedalaman_jenis2"]],
            10
        );
        expect(preview.rows).toHaveLength(10);
    });

    it("returns just a Row column when no pairs are provided", () => {
        const preview = computeDifferencePreview(
            apgModul4aData,
            apgModul4aVariables,
            []
        );
        expect(preview.columns).toEqual(["Row"]);
        expect(preview.rows).toEqual([]);
    });

    it("silently skips invalid pairs instead of throwing (preview is partial-state safe)", () => {
        const preview = computeDifferencePreview(
            apgModul4aData,
            apgModul4aVariables,
            [
                ["kedalaman_jenis1", "kedalaman_jenis2"],
                ["bogus", "kedalaman_jenis2"],
            ],
            3
        );
        // Only one (valid) pair survives, so 3 d-columns total (Row + V1 + V2 + d).
        expect(preview.columns).toEqual([
            "Row",
            "kedalaman_jenis1",
            "kedalaman_jenis2",
            "kedalaman_jenis1 − kedalaman_jenis2",
        ]);
        expect(preview.rows).toHaveLength(3);
    });
});
