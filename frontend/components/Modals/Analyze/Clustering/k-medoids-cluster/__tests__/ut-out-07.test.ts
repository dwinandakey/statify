/** @jest-environment jsdom */

/**
 * UT-OUT-07: distances_to_medoids dari Float64Array dikonversi ke array biasa.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-07: distances_to_medoids dari Float64Array dikonversi ke array biasa", () => {
    it("Float64Array (typed array WASM) dikonversi jadi number[]", () => {
        const result = mapWasmOutputToResult({
            labels: [0, 1],
            distances_to_medoids: new Float64Array([1.5, 2.5]),
        });
        expect(Array.isArray(result.distances_to_medoids)).toBe(true);
        expect(result.distances_to_medoids).toEqual([1.5, 2.5]);
    });

    it("array biasa diteruskan apa adanya", () => {
        const result = mapWasmOutputToResult({ labels: [0, 1], distances_to_medoids: [3, 4] });
        expect(result.distances_to_medoids).toEqual([3, 4]);
    });
});
