/** @jest-environment jsdom */

/**
 * UT-PRE-07: Listwise Deletion — baris dengan missing value pada
 * salah satu variabel dibuang. Menguji applyMissingHandling di
 * k-medoids-cluster-analysis.ts (missing value handling tetap di
 * TypeScript, lihat catatan di rust/src/stats/mod.rs).
 */

import { applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-07: Listwise Deletion — baris dengan missing value pada salah satu variabel dibuang", () => {
    it("dataset 4 baris, baris ke-2 punya 1 nilai kosong -> baris ke-2 dihapus, hasil akhir 3 baris tanpa NaN", () => {
        const rows = [
            { source: { id: 1 }, numeric: [1, 10] },
            { source: { id: 2 }, numeric: [2, NaN] }, // baris ke-2: 1 nilai kosong
            { source: { id: 3 }, numeric: [3, 30] },
            { source: { id: 4 }, numeric: [4, 40] },
        ];

        const result = applyMissingHandling(rows, MissingValueMethod.Listwise);

        expect(result.matrix).toEqual([[1, 10], [3, 30], [4, 40]]);
        expect(result.matrix.length).toBe(3);
        expect(result.removedCount).toBe(1);
        for (const row of result.matrix) {
            for (const value of row) {
                expect(Number.isNaN(value)).toBe(false);
            }
        }
    });
});
