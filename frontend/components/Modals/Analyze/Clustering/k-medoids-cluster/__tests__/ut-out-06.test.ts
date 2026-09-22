/** @jest-environment jsdom */

/**
 * UT-OUT-06: iterations diturunkan dari panjang cost_history kalau field
 * iterations tidak ada/0.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-06: iterations diturunkan dari panjang cost_history kalau field iterations tidak ada", () => {
    it("iterations = cost_history.length - 1 (init + N iterasi swap)", () => {
        const result = mapWasmOutputToResult({
            labels: [0, 1],
            cost_history: [10.0, 8.0, 6.0, 5.0], // 1 init + 3 iterasi
        });
        expect(result.iterations).toBe(3);
    });

    it("field iterations eksplisit (>0) diprioritaskan di atas turunan", () => {
        const result = mapWasmOutputToResult({
            labels: [0, 1],
            cost_history: [10.0, 8.0, 6.0],
            iterations: 99,
        });
        expect(result.iterations).toBe(99);
    });
});
