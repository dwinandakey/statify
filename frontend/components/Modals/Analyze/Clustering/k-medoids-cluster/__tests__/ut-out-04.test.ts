/** @jest-environment jsdom */

/**
 * UT-OUT-04: total_cost_build/total_cost_swap diturunkan dari cost_history
 * (elemen pertama & terakhir) kalau tidak eksplisit ada.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-04: total_cost_build/total_cost_swap diturunkan dari cost_history", () => {
    it("diambil dari elemen pertama & terakhir cost_history kalau tidak eksplisit", () => {
        const result = mapWasmOutputToResult({
            labels: [0, 1],
            cost_history: [10.0, 7.5, 5.0],
        });
        expect(result.total_cost_build).toBe(10.0);
        expect(result.total_cost_swap).toBe(5.0);
    });

    it("field eksplisit diprioritaskan di atas turunan cost_history", () => {
        const result = mapWasmOutputToResult({
            labels: [0, 1],
            cost_history: [10.0, 7.5, 5.0],
            total_cost_build: 99,
            total_cost_swap: 1,
        });
        expect(result.total_cost_build).toBe(99);
        expect(result.total_cost_swap).toBe(1);
    });
});
