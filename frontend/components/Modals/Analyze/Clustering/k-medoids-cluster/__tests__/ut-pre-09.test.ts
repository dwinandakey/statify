/** @jest-environment jsdom */

/**
 * UT-PRE-09: Median Imputation — nilai kosong diganti median kolom, BUKAN
 * mean, supaya tahan terhadap outlier. Menguji applyMissingHandling mode
 * Median di k-medoids-cluster-analysis.ts.
 */

import { applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-09: Median Imputation — nilai kosong diganti median kolom", () => {
    it("kolom [10, NaN, 20, 1000] -> NaN diisi median (20), bukan mean (yang akan condong ke 343.3 akibat outlier 1000)", () => {
        // Kolom kedua (selalu valid) diperlukan supaya baris dengan NaN tetap
        // "punya >=1 nilai valid" dan lolos filter untuk diimputasi, bukan
        // dibuang (dengan hanya 1 kolom, baris NaN dianggap tidak punya
        // nilai valid sama sekali dan tetap dibuang — lihat UT-PRE-07/08).
        const rows = [
            { source: { id: 1 }, numeric: [10, 1] },
            { source: { id: 2 }, numeric: [NaN, 2] },
            { source: { id: 3 }, numeric: [20, 3] },
            { source: { id: 4 }, numeric: [1000, 4] }, // outlier
        ];

        const result = applyMissingHandling(rows, MissingValueMethod.Median);

        // Tidak ada baris yang dibuang.
        expect(result.matrix.length).toBe(4);
        expect(result.removedCount).toBe(0);

        // median([10,20,1000]) = 20 (nilai tengah setelah diurutkan), BUKAN
        // mean([10,20,1000]) = 343.33 — median tahan terhadap outlier 1000.
        const targetColumn = result.matrix.map(row => row[0]);
        expect(targetColumn).toEqual([10, 20, 20, 1000]);

        const meanWouldBe = (10 + 20 + 1000) / 3;
        expect(targetColumn[1]).not.toBeCloseTo(meanWouldBe, 0);

        // Matriks hasil harus tetap numerik, tidak ada NaN.
        for (const row of result.matrix) {
            for (const value of row) {
                expect(Number.isNaN(value)).toBe(false);
            }
        }
    });
});
