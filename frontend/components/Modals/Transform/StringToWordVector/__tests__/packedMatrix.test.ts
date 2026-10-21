import { packMatrix, unpackMatrix } from "../utils/packedMatrix";

describe("packMatrix / unpackMatrix", () => {
    it("pulang-pergi menghasilkan matriks yang identik (termasuk pecahan dan nol)", async () => {
        const matrix = [
            [0, 1, 2.5],
            [0.1 + 0.2, 0, 1 / 3],
            [0, 0, 0],
        ];
        const packed = packMatrix(matrix, 3);
        expect(packed.rows).toBe(3);
        expect(packed.cols).toBe(3);
        expect(packed.data).toBeInstanceOf(Float64Array);
        expect(await unpackMatrix(packed)).toEqual(matrix);
    });

    it("kosakata kosong: setiap baris menjadi larik kosong", async () => {
        const packed = packMatrix([[], []], 0);
        expect(packed.data.length).toBe(0);
        expect(await unpackMatrix(packed)).toEqual([[], []]);
    });

    it("baris yang lebih pendek dari jumlah kolom diisi 0", async () => {
        expect(await unpackMatrix(packMatrix([[5], [1, 2]], 2))).toEqual([
            [5, 0],
            [1, 2],
        ]);
    });

    it("matriks besar tetap identik walau disusun dalam beberapa potongan", async () => {
        const rows = 3000;
        const cols = 50;
        const matrix = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i * cols + j) / 7));
        const result = await unpackMatrix(packMatrix(matrix, cols));
        expect(result).toEqual(matrix);
    });
});
