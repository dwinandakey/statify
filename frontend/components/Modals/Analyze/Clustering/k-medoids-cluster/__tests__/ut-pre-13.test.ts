/** @jest-environment jsdom */

/**
 * UT-PRE-13: KNN Imputation — baris target dan sebagian kandidat tetangga
 * sama-sama memiliki missing value pada variabel lain (Z), yang juga
 * dipakai sebagai basis jarak. Perhitungan jarak harus menangani dimensi
 * yang hilang (dihitung parsial hanya dari variabel yang lengkap di kedua
 * baris), tidak menghasilkan NaN pada jarak.
 *
 * Data uji: 3 kolom [X, Y, Z]. X = target imputasi (baris 0 = NaN).
 * Y selalu lengkap (basis jarak utama). Z kosong pada baris target DAN
 * pada kandidat tetangga 1 (baris 1) -- dimensi Z jadi tidak bisa dipakai
 * untuk pasangan itu, tapi tidak boleh membuat jarak jadi NaN.
 */

import { imputeKnn } from "../services/k-medoids-cluster-analysis";

describe("UT-PRE-13: KNN Imputation — target & kandidat sama-sama missing di variabel Z", () => {
    it("perhitungan jarak mengabaikan dimensi Z yang hilang, jarak tetap numerik, tidak ada NaN", () => {
        const matrix = [
            [NaN, 5, NaN],  // baris target: X kosong, Z JUGA kosong
            [10, 4, NaN],   // kandidat 1: Z sama-sama kosong dengan target
            [20, 6, 50],    // kandidat 2: Z lengkap
        ];

        expect(() => imputeKnn(matrix)).not.toThrow();

        const result = imputeKnn(matrix);

        // Hasil imputasi X harus finite (bukan NaN) meskipun dimensi Z
        // tidak bisa dipakai untuk kandidat 1.
        expect(Number.isNaN(result[0][0])).toBe(false);
        expect(Number.isFinite(result[0][0])).toBe(true);

        // Kedua kandidat berjarak sama dari target berdasar Y saja (|5-4|=1,
        // |5-6|=1) karena Z tidak ikut dihitung (tidak lengkap di kedua sisi
        // untuk kandidat 1, dan target sendiri tidak punya Z sama sekali) ->
        // keduanya jadi tetangga terdekat -> X = rata-rata (10+20)/2 = 15.
        expect(result[0][0]).toBeCloseTo(15, 10);
    });
});
