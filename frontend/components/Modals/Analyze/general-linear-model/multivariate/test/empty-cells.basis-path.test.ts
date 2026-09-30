// Basis path testing (McCabe) untuk emptyFactorCells (services/empty-cells.ts).
// Flow graph, V(G) = 5, dan jalur EFC-J1..EFC-J5:
// testing/whitebox/basis-path/basis_paths.py. Nilai harapan dihitung tangan
// dari spesifikasi (JSDoc: sel kosong faktorial penuh atas kasus lengkap;
// null untuk kurang dari dua faktor), tidak dari keluaran fungsi.
import { emptyFactorCells } from "@/components/Modals/Analyze/general-linear-model/multivariate/services/empty-cells";

const col = (name: string, values: unknown[]) => values.map((v) => ({ [name]: v }));

describe("emptyFactorCells — basis path (V(G) = 5)", () => {
    it("EFC-J1: kurang dari dua faktor -> null (P1 benar)", () => {
        expect(emptyFactorCells([col("A", [1, 2])], ["A"], [])).toBeNull();
    });

    it("EFC-J2: dua faktor, nol baris -> {empty: 0, total: 0} (loop nol kali)", () => {
        expect(emptyFactorCells([col("A", []), col("B", [])], ["A", "B"], [])).toEqual({ empty: 0, total: 0 });
    });

    it("EFC-J3: nilai faktor hilang -> kasus dilewati (P3 benar)", () => {
        const r = emptyFactorCells([col("A", [null]), col("B", [1])], ["A", "B"], [{ slice: col("y", [5]), name: "y" }]);
        expect(r).toEqual({ empty: 0, total: 0 });
    });

    it("EFC-J4: nilai variabel dependen hilang -> kasus dilewati (P4 benar)", () => {
        const r = emptyFactorCells([col("A", [1]), col("B", [1])], ["A", "B"], [{ slice: col("y", [""]), name: "y" }]);
        expect(r).toEqual({ empty: 0, total: 0 });
    });

    it("EFC-J5: 2 x 2 dengan tiga sel terisi -> {empty: 1, total: 4} (P3, P4 salah)", () => {
        const r = emptyFactorCells([col("A", [1, 1, 2]), col("B", [1, 2, 1])], ["A", "B"], [{ slice: col("y", [5, 6, 7]), name: "y" }]);
        expect(r).toEqual({ empty: 1, total: 4 });
    });
});
