/** @jest-environment jsdom */

/**
 * UT-OUT-01: cluster_assignments dipakai kalau ada, fallback ke labels.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-01: cluster_assignments dipakai kalau ada, fallback ke labels", () => {
    it("cluster_assignments diprioritaskan di atas labels", () => {
        const result = mapWasmOutputToResult({
            cluster_assignments: [0, 1, 0],
            labels: [9, 9, 9], // seharusnya diabaikan
        });
        expect(result.labels).toEqual([0, 1, 0]);
    });

    it("fallback ke labels kalau cluster_assignments tidak ada", () => {
        const result = mapWasmOutputToResult({ labels: [1, 0, 1] });
        expect(result.labels).toEqual([1, 0, 1]);
    });
});
