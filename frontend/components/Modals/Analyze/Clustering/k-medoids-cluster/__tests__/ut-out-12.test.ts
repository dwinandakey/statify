/** @jest-environment jsdom */

/**
 * UT-OUT-12: validateSaveData menolak data yang panjangnya tidak cocok
 * dengan jumlah baris dataset.
 * Menguji k-medoids-cluster-save.ts.
 */

import { validateSaveData } from "../services/k-medoids-cluster-save";

describe("UT-OUT-12: validateSaveData menolak data yang panjangnya tidak cocok dengan jumlah baris dataset", () => {
    it("panjang array beda dari expectedRowCount -> invalid dengan pesan jelas", () => {
        const result = validateSaveData({ CLU_1: [1, 2, 3] }, 5);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("CLU_1");
        expect(result.error).toContain("3");
        expect(result.error).toContain("5");
    });

    it("panjang cocok -> valid", () => {
        const result = validateSaveData({ CLU_1: [1, 2, 3] }, 3);
        expect(result.valid).toBe(true);
    });
});
