/** @jest-environment jsdom */

/**
 * UT-PRE-08: Listwise Deletion — seluruh baris memiliki minimal 1 missing
 * value, sehingga dataset habis (0 baris) setelah listwise exclusion.
 * Membuktikan sistem menangani kondisi ini dengan hasil error informatif,
 * bukan crash.
 */

import { applyMissingHandling, analyzeKMedoidsCluster } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-08: Listwise Deletion — seluruh baris punya missing value (dataset habis)", () => {
    it("dataset 5 baris, tiap baris punya >=1 kolom kosong -> matrix hasil kosong (0 baris)", () => {
        const rows = [
            { source: {}, numeric: [NaN, 10] },
            { source: {}, numeric: [5, NaN] },
            { source: {}, numeric: [NaN, 20] },
            { source: {}, numeric: [7, NaN] },
            { source: {}, numeric: [NaN, NaN] },
        ];
        const result = applyMissingHandling(rows, MissingValueMethod.Listwise);
        expect(result.matrix).toEqual([]);
        expect(result.removedCount).toBe(5);
    });

    it("sistem harus menangani dataset kosong dengan hasil error informatif, bukan crash", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const variables = [
            { columnIndex: 0, name: "varA" },
            { columnIndex: 1, name: "varB" },
        ] as any;

        const dataVariables = [
            { 0: null, 1: 10 },
            { 0: 5, 1: null },
            { 0: null, 1: 20 },
            { 0: 7, 1: null },
            { 0: null, 1: null },
        ];

        const configData = {
            main: { Cluster: 2 },
            iterate: {},
            options: { MissingValueMethod: MissingValueMethod.Listwise },
        } as any;

        const result: any = await analyzeKMedoidsCluster({
            configData,
            dataVariables,
            variables,
            useWorker: false,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toMatch(/not enough valid data points/i);
        expect(result.message).toContain("Analysis failed");

        consoleErrorSpy.mockRestore();
    });
});
