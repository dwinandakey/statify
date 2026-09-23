/** @jest-environment jsdom */

/**
 * UT-OUT-05: avgCost dihitung totalCost/n kalau tidak ada field eksplisit.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-05: avgCost dihitung totalCost/n kalau tidak ada field eksplisit", () => {
    it("avgCost = total_distance / jumlah titik", () => {
        const result = mapWasmOutputToResult({
            cluster_assignments: [0, 0, 1, 1],
            total_distance: 20,
        });
        expect(result.avgCost).toBe(5); // 20/4
    });

    it("avg_cost eksplisit diprioritaskan di atas hitungan otomatis", () => {
        const result = mapWasmOutputToResult({
            cluster_assignments: [0, 0, 1, 1],
            total_distance: 20,
            avg_cost: 1.23,
        });
        expect(result.avgCost).toBe(1.23);
    });
});
