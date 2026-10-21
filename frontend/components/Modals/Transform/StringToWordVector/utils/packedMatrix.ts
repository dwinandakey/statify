/**
 * Pengiriman matriks hasil vektorisasi dari Worker ke main thread.
 *
 * Matriks `number[][]` berukuran besar (mis. 17.974 dokumen × 1.000 term) membuat deserialisasi
 * structured clone di main thread menjadi satu long task. Worker mengirimnya sebagai satu
 * `Float64Array` row-major yang di-transfer (tanpa salin), lalu main thread menyusun ulang
 * `number[][]` secara bertahap dengan jeda antar-potongan. Nilai float64 disalin apa adanya,
 * sehingga hasil identik dengan matriks asli.
 */

export interface PackedMatrix {
    rows: number;
    cols: number;
    /** Nilai row-major; panjang = rows × cols. */
    data: Float64Array;
}

/** Ubah `number[][]` menjadi PackedMatrix (dipanggil di Worker). Baris pendek diisi 0. */
export function packMatrix(matrix: number[][], cols: number): PackedMatrix {
    const rows = matrix.length;
    const data = new Float64Array(rows * cols);
    for (let i = 0; i < rows; i++) {
        const row = matrix[i];
        const base = i * cols;
        for (let j = 0; j < cols; j++) data[base + j] = row[j] ?? 0;
    }
    return { rows, cols, data };
}

/** Batas waktu kerja per potongan sebelum memberi jeda ke event loop (di bawah ambang long task 50 ms). */
const SLICE_BUDGET_MS = 20;

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Susun ulang `number[][]` dari PackedMatrix secara bertahap (dipanggil di main thread). */
export async function unpackMatrix(packed: PackedMatrix): Promise<number[][]> {
    const { rows, cols, data } = packed;
    const matrix: number[][] = new Array(rows);
    let sliceStart = performance.now();
    for (let i = 0; i < rows; i++) {
        matrix[i] = Array.from(data.subarray(i * cols, (i + 1) * cols));
        if (performance.now() - sliceStart > SLICE_BUDGET_MS) {
            await yieldToEventLoop();
            sliceStart = performance.now();
        }
    }
    return matrix;
}
