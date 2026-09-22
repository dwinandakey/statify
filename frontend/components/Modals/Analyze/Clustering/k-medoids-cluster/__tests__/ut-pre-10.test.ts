/** @jest-environment jsdom */

/**
 * UT-PRE-10: Median Imputation — variabel yang seluruh nilainya kosong
 * (tidak ada nilai valid sama sekali untuk menghitung median).
 *
 * Kode aktual (calculateFeatureMedians di k-medoids-cluster-analysis.ts,
 * `if (valid.length === 0) return 0;`) mengisi 0 untuk variabel yang
 * seluruh nilainya NaN, tanpa error maupun warning. Test ini
 * mendokumentasikan perilaku tsb.
 */

import { applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-10: Median Imputation — variabel yang seluruh nilainya kosong", () => {
    it("kolom [NaN, NaN, NaN, NaN] diisi 0 (tidak ada nilai valid untuk menghitung median)", () => {
        // Kolom kedua (selalu valid) diperlukan supaya baris tetap lolos
        // filter "punya >=1 nilai valid", sehingga eksekusi benar-benar
        // sampai ke perhitungan median kolom pertama — bukan berhenti lebih
        // awal di jalur "seluruh baris tidak valid" (sudah dicakup UT-PRE-08).
        const rows = [
            { source: {}, numeric: [NaN, 1] },
            { source: {}, numeric: [NaN, 2] },
            { source: {}, numeric: [NaN, 3] },
            { source: {}, numeric: [NaN, 4] },
        ];

        const result = applyMissingHandling(rows, MissingValueMethod.Median);

        // Baris tidak dibuang (karena kolom kedua selalu valid).
        expect(result.matrix.length).toBe(4);
        expect(result.removedCount).toBe(0);

        // Kolom pertama diisi 0 untuk semua baris — bukan NaN.
        const targetColumn = result.matrix.map(row => row[0]);
        expect(targetColumn).toEqual([0, 0, 0, 0]);

        // Tidak ada NaN di hasil akhir.
        for (const row of result.matrix) {
            for (const value of row) {
                expect(Number.isNaN(value)).toBe(false);
            }
        }
    });
});
