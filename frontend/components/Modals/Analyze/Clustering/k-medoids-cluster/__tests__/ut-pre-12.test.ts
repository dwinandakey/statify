/** @jest-environment jsdom */

/**
 * UT-PRE-12: KNN Imputation — k yang diminta (default k=5) melebihi jumlah
 * baris lengkap (tanpa missing) yang tersedia sebagai kandidat tetangga.
 * Sistem harus fallback memakai seluruh tetangga yang tersedia, tanpa error.
 *
 * Berbeda dari UT-PRE-11, di sini k=5 memang default aktual produksi
 * (applyMissingHandling memanggil imputeKnn(rawMatrix) tanpa k eksplisit),
 * jadi skenario ini bisa dites langsung lewat jalur produksi asli.
 */

import { imputeKnn, applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-12: KNN Imputation — k diminta melebihi jumlah tetangga lengkap tersedia", () => {
    it("imputeKnn(matrix, k=5) dengan hanya 2 tetangga lengkap -> fallback pakai 2 tetangga, tidak ada error", () => {
        const matrix = [
            [NaN, 5],  // baris target
            [10, 4],   // tetangga lengkap 1
            [20, 6],   // tetangga lengkap 2
        ];

        expect(() => imputeKnn(matrix, 5)).not.toThrow();

        const result = imputeKnn(matrix, 5);
        // Math.min(5, 2) = 2 -> kedua tetangga dipakai (bukan gagal/NaN).
        expect(result[0][0]).toBeCloseTo(15, 10); // (10+20)/2
        expect(Number.isNaN(result[0][0])).toBe(false);
    });

    it("lewat jalur produksi asli (applyMissingHandling, k=5 default) -> fallback sama, tidak crash", () => {
        const rows = [
            { source: {}, numeric: [NaN, 5] },
            { source: {}, numeric: [10, 4] },
            { source: {}, numeric: [20, 6] },
        ];

        expect(async () => applyMissingHandling(rows, MissingValueMethod.Knn)).not.toThrow();

        const result = applyMissingHandling(rows, MissingValueMethod.Knn);
        expect(result.matrix.length).toBe(3);
        expect(result.removedCount).toBe(0);
        expect(result.matrix[0][0]).toBeCloseTo(15, 10);
        for (const row of result.matrix) {
            for (const value of row) {
                expect(Number.isNaN(value)).toBe(false);
            }
        }
    });
});
