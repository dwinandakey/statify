/** @jest-environment jsdom */

/**
 * UT-PRE-11: KNN Imputation — nilai kosong diisi berdasarkan rata-rata k
 * tetangga terdekat, jarak dihitung dari variabel lain yang lengkap.
 * Menguji imputeKnn di k-medoids-cluster-analysis.ts.
 *
 * Data uji (dari tabel skenario):
 *   Baris target: Y=5, X=NaN
 *   Kandidat tetangga: (X=10,Y=4), (X=20,Y=6), (X=30,Y=50)
 *   k=2 -> tetangga terdekat berdasar jarak Y adalah Y=4 dan Y=6
 *   (masing-masing berjarak 1 dari Y=5, sedangkan Y=50 berjarak 45)
 *   -> X diisi rata-rata X kedua tetangga = (10+20)/2 = 15
 */

import { imputeKnn, applyMissingHandling } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-11: KNN Imputation — nilai kosong diisi rata-rata k tetangga terdekat", () => {
    it("imputeKnn(matrix, k=2) langsung -> X terisi 15 sesuai tabel", () => {
        // Kolom 0 = X (target, ada NaN), kolom 1 = Y (selalu lengkap, dipakai jarak).
        const matrix = [
            [NaN, 5],  // baris target
            [10, 4],   // kandidat 1: jarak |5-4|=1 -> terdekat
            [20, 6],   // kandidat 2: jarak |5-6|=1 -> terdekat
            [30, 50],  // kandidat 3: jarak |5-50|=45 -> jauh
        ];

        const result = imputeKnn(matrix, 2);

        expect(result[0][0]).toBeCloseTo(15, 10); // (10+20)/2, BUKAN (10+20+30)/3=20
        // Baris lain tidak berubah (tidak ada NaN di sana).
        expect(result[1]).toEqual([10, 4]);
        expect(result[2]).toEqual([20, 6]);
        expect(result[3]).toEqual([30, 50]);
    });

    it("TEMUAN: applyMissingHandling(..., MissingValueMethod.Knn) memanggil imputeKnn TANPA k eksplisit (default k=5), sehingga untuk dataset ini hasilnya BEDA dari tabel (k=2)", () => {
        // Dataset persis sama dengan skenario tabel, tapi lewat jalur produksi
        // asli (applyMissingHandling), yang tidak meneruskan k=2 ke imputeKnn.
        const rows = [
            { source: {}, numeric: [NaN, 5] },
            { source: {}, numeric: [10, 4] },
            { source: {}, numeric: [20, 6] },
            { source: {}, numeric: [30, 50] },
        ];

        const result = applyMissingHandling(rows, MissingValueMethod.Knn);

        // Karena cuma ada 3 kandidat tetangga dan k default=5, min(5,3)=3 ->
        // SEMUA 3 tetangga dipakai (bukan cuma 2 terdekat), jadi hasilnya
        // rata-rata (10+20+30)/3=20 -- BUKAN 15 seperti diharapkan tabel.
        expect(result.matrix[0][0]).toBeCloseTo(20, 10);
        expect(result.matrix[0][0]).not.toBeCloseTo(15, 10);
    });
});
