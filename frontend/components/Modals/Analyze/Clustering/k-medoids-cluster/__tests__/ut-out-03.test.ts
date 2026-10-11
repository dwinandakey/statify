/** @jest-environment jsdom */

/**
 * UT-OUT-03: converged default false kalau field tidak ada.
 * Menguji mapWasmOutputToResult di k-medoids-cluster-analysis.ts.
 */

import { mapWasmOutputToResult } from "../services/k-medoids-cluster-analysis";

describe("UT-OUT-03: converged default false kalau field tidak ada", () => {
    it("converged=false ketika field absen dari output WASM", () => {
        const result = mapWasmOutputToResult({ labels: [0, 1] });
        expect(result.converged).toBe(false);
    });

    it("converged=true diteruskan apa adanya kalau ada", () => {
        const result = mapWasmOutputToResult({ labels: [0, 1], converged: true });
        expect(result.converged).toBe(true);
    });
});
