/** @jest-environment jsdom */

/**
 * UT-OUT-02: field medoid punya urutan prioritas
 * medoids_indices > medoid_indices > medoids.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-02: field medoid punya urutan prioritas medoids_indices > medoid_indices > medoids", () => {
    it("medoids_indices diprioritaskan di atas yang lain", () => {
        const result = mapWasmOutputToResult({
            medoids_indices: [3, 7],
            medoid_indices: [1, 2],
            medoids: [9, 9],
        });
        expect(result.medoids).toEqual([3, 7]);
    });

    it("medoid_indices dipakai kalau medoids_indices tidak ada", () => {
        const result = mapWasmOutputToResult({ medoid_indices: [4, 8], medoids: [9, 9] });
        expect(result.medoids).toEqual([4, 8]);
    });

    it("medoids dipakai sebagai fallback terakhir", () => {
        const result = mapWasmOutputToResult({ medoids: [5, 6] });
        expect(result.medoids).toEqual([5, 6]);
    });
});
