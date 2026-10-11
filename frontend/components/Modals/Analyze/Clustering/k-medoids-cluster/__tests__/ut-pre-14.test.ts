/** @jest-environment jsdom */

/**
 * UT-PRE-14: Konsistensi pemilihan metode penanganan missing value
 * (listwise/median/knn) sesuai parameter pengguna. Parameter method="knn"
 * pada dataset dengan missing value campuran harus memanggil jalur KNN
 * imputation — BUKAN listwise atau median.
 */

import { applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-14: Konsistensi pemilihan metode missing value sesuai parameter", () => {
    it("method=\"knn\" harus memanggil jalur KNN, bukan listwise atau median (dibuktikan lewat hasil yang berbeda-beda)", () => {
        // Kolom [X, Y]. X target imputasi berisi outlier (1000) supaya
        // median([10,20,1000])=20 jelas berbeda dari rata-rata KNN
        // ([10,20,1000]/3 ≈ 343.33) -- perbedaan angka inilah yang
        // membuktikan jalur mana yang benar-benar terpanggil, bukan cuma
        // nama variannya benar.
        const rows = [
            { source: {}, numeric: [NaN, 5] },   // baris target
            { source: {}, numeric: [10, 4] },
            { source: {}, numeric: [20, 6] },
            { source: {}, numeric: [1000, 1000] }, // outlier
        ];

        const listwiseResult = applyMissingHandling(rows, MissingValueMethod.Listwise);
        const medianResult = applyMissingHandling(rows, MissingValueMethod.Median);
        const knnResult = applyMissingHandling(rows, MissingValueMethod.Knn);

        // Listwise: baris target (X=NaN) dibuang -> cuma 3 baris tersisa.
        expect(listwiseResult.matrix.length).toBe(3);

        // Median & KNN: baris target dipertahankan (4 baris), tapi nilai
        // imputasinya berbeda satu sama lain.
        expect(medianResult.matrix.length).toBe(4);
        expect(knnResult.matrix.length).toBe(4);

        expect(medianResult.matrix[0][0]).toBeCloseTo(20, 10);
        expect(knnResult.matrix[0][0]).toBeCloseTo((10 + 20 + 1000) / 3, 10);

        // Bukti utama: hasil KNN BUKAN hasil median (jalur yang benar-benar
        // terpanggil adalah KNN, bukan median yang kebetulan mirip).
        expect(knnResult.matrix[0][0]).not.toBeCloseTo(medianResult.matrix[0][0], 0);
    });

    it("dengan dataset UT-PRE-11 (tanpa outlier), method=\"knn\" harus menghasilkan angka sesuai temuan UT-PRE-11 (k=5 default, X=20)", () => {
        const rows = [
            { source: {}, numeric: [NaN, 5] },
            { source: {}, numeric: [10, 4] },
            { source: {}, numeric: [20, 6] },
            { source: {}, numeric: [30, 50] },
        ];

        const result = applyMissingHandling(rows, MissingValueMethod.Knn);

        // Sesuai UT-PRE-11 (jalur produksi, k=5 default -> pakai semua 3
        // tetangga): X = (10+20+30)/3 = 20.
        expect(result.matrix[0][0]).toBeCloseTo(20, 10);
        expect(result.removedCount).toBe(0);
    });
});
