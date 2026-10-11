/** @jest-environment jsdom */

/**
 * UT-OUT-13: validateSaveData menolak data yang mengandung nilai
 * non-finite (NaN/Inf).
 * Menguji k-medoids-cluster-save.ts.
 */

import { validateSaveData } from "../services/k-medoids-cluster-save";

describe("UT-OUT-13: validateSaveData menolak data yang mengandung nilai non-finite (NaN/Inf)", () => {
    it("ada NaN di data -> invalid", () => {
        const result = validateSaveData({ DIS_1: [1.0, NaN, 3.0] }, 3);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("DIS_1");
    });

    it("ada Infinity di data -> invalid", () => {
        const result = validateSaveData({ DIS_1: [1.0, Infinity, 3.0] }, 3);
        expect(result.valid).toBe(false);
    });
});
