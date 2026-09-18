/** @jest-environment jsdom */

/**
 * UT-OUT-08: output WASM minimal/kosong tidak crash, hasilkan default aman.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-08: output WASM minimal/kosong tidak crash, hasilkan default aman", () => {
    it("objek kosong -> labels=[], medoids=[], cost=0, avgCost=0, converged=false", () => {
        const result = mapWasmOutputToResult({});
        expect(result.labels).toEqual([]);
        expect(result.medoids).toEqual([]);
        expect(result.cost).toBe(0);
        expect(result.avgCost).toBe(0);
        expect(result.converged).toBe(false);
    });
});
