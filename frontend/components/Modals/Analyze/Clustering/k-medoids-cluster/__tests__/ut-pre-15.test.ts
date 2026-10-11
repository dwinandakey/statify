/** @jest-environment jsdom */

/**
 * UT-PRE-15: Dataset dengan seluruh baris kosong (dataset asli tanpa data
 * sama sekali, 0 baris). Sistem harus menangani dengan error/exception
 * informatif, bukan crash.
 *
 * TEMUAN: applyMissingHandling([], method) itu SENDIRI tidak melempar
 * error/exception sama sekali -- dia diam-diam mengembalikan
 * { matrix: [], rows: [], removedCount: 0 } (lihat baris ~187-189
 * k-medoids-cluster-analysis.ts). Error informatif baru muncul satu
 * lapis di atasnya, di analyzeKMedoidsCluster (validasi
 * `standardizedMatrix.length < 2`), dengan teks "Not enough valid data
 * points..." -- BUKAN "empty dataset" seperti di tabel skenario.
 */

import { applyMissingHandling, analyzeKMedoidsCluster } from "../services/k-medoids-cluster-analysis";
import { MissingValueMethod } from "../types/k-medoids-cluster";

describe("UT-PRE-15: Dataset dengan seluruh baris kosong (0 baris)", () => {
    it("applyMissingHandling([], ...) TIDAK melempar error — diam-diam mengembalikan matrix kosong", () => {
        expect(() => applyMissingHandling([], MissingValueMethod.Listwise)).not.toThrow();

        const result = applyMissingHandling([], MissingValueMethod.Listwise);
        expect(result.matrix).toEqual([]);
        expect(result.rows).toEqual([]);
        expect(result.removedCount).toBe(0);
    });

    it("lewat analyzeKMedoidsCluster (jalur penuh), dataset kosong menghasilkan error informatif, bukan crash", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        const variables = [{ columnIndex: 0, name: "varA" }] as any;
        const dataVariables: any[] = []; // dataset asli 0 baris

        const configData = {
            main: { Cluster: 2 },
            iterate: {},
            options: { MissingValueMethod: MissingValueMethod.Listwise },
        } as any;

        const result: any = await analyzeKMedoidsCluster({
            configData,
            dataVariables,
            variables,
            useWorker: false,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        // CATATAN: pesan aktual "Not enough valid data points for clustering
        // (found 0)...", BUKAN "empty dataset" seperti di tabel skenario.
        // Substansinya sama (dataset kosong -> error informatif, bukan crash).
        expect(result.error.message).toMatch(/not enough valid data points/i);
        expect(result.message).toContain("Analysis failed");

        consoleErrorSpy.mockRestore();
    });
});
