/** @jest-environment jsdom */

/**
 * Kasus tambahan untuk applyMissingHandling di luar tabel UT-PRE resmi
 * (median multi-kolom, baris seluruhnya NaN, input kosong).
 */

import { applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("Preprocessing - Missing Value Handling (kasus tambahan)", () => {
    it("median dengan banyak kolom harus mengimputasi per kolom secara independen", () => {
        const rows = [
            { source: {}, numeric: [1, 100] },
            { source: {}, numeric: [NaN, 200] },
            { source: {}, numeric: [3, NaN] },
        ];
        // kolom0 valid: [1,3] -> median=2; kolom1 valid: [100,200] -> median=150
        const result = applyMissingHandling(rows, MissingValueMethod.Median);
        expect(result.matrix).toEqual([[1, 100], [2, 200], [3, 150]]);
        expect(result.removedCount).toBe(0);
    });

    it("baris yang seluruh nilainya NaN tetap dibuang walau mode median", () => {
        const rows = [
            { source: {}, numeric: [10] },
            { source: {}, numeric: [NaN] }, // seluruh kolom NaN -> tidak punya nilai valid sama sekali
            { source: {}, numeric: [30] },
        ];
        const result = applyMissingHandling(rows, MissingValueMethod.Median);
        expect(result.matrix).toEqual([[10], [30]]);
        expect(result.removedCount).toBe(1);
    });

    it("harus mengembalikan matrix kosong jika input kosong", () => {
        const result = applyMissingHandling([], MissingValueMethod.Listwise);
        expect(result.matrix).toEqual([]);
        expect(result.removedCount).toBe(0);
    });
});
