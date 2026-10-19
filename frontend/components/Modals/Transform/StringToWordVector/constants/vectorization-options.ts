/**
 * Opsi rumus vektorisasi STWV: TF, IDF, dan normalisasi dipilih bebas (revisi pasca-sidang,
 * pilihan "Formula standard" dihapus). File murni (tanpa React/hook) agar bisa dipakai ulang di NB v2.
 */

/** Metode TF (opsi "none" v1 sudah dihapus karena identik dengan "binary", F22). */
export type TfMethod = "binary" | "raw" | "log1p" | "sublinear" | "normalized";

/** Metode IDF. */
export type IdfMethod = "none" | "standard" | "smooth" | "plus1";

/** Normalisasi baris. */
export type Normalization = "none" | "l1" | "l2" | "doc_length";

export interface FormulaOption<T extends string> {
    value: T;
    /** Label UI (Bahasa Inggris). */
    label: string;
    /** Rumus singkat (teks biasa) untuk tooltip. */
    formula: string;
    /** Rumus dalam notasi LaTeX untuk ditampilkan seperti di buku (KaTeX). */
    latex: string;
}

/**
 * Nilai field `formula_standard` di mesin Rust. Field ini internal (tidak tampil di UI) dan tetap
 * ada karena file model lama menyimpannya. Mode "weka"/"sklearn" hanya menerima sebagian kombinasi
 * dan merangking Words to Keep dengan total kemunculan kata; "custom" menerima semua kombinasi
 * dan merangking dengan jumlah TF × IDF.
 */
export type EngineFormulaMode = "weka" | "sklearn" | "custom";

export interface VectorizationChoice {
    tfMethod: TfMethod;
    idfMethod: IdfMethod;
    normalization: Normalization;
}

/** Kelompok kombinasi yang diterima mesin dengan perangkingan total kemunculan kata. */
const COUNT_RANKED_MODES: ReadonlyArray<{
    mode: Exclude<EngineFormulaMode, "custom">;
    tf: readonly TfMethod[];
    idf: readonly IdfMethod[];
    norm: readonly Normalization[];
}> = [
    { mode: "weka", tf: ["binary", "raw", "log1p"], idf: ["none", "standard"], norm: ["none", "doc_length"] },
    { mode: "sklearn", tf: ["binary", "raw", "sublinear"], idf: ["none", "smooth", "plus1"], norm: ["none", "l2", "l1"] },
];

/**
 * Mode mesin untuk kombinasi pilihan pengguna: kombinasi yang dapat dirangking dengan total
 * kemunculan kata memakai mode itu (hasil sama dengan sebelum revisi), sisanya "custom".
 */
export function engineFormulaMode(v: VectorizationChoice): EngineFormulaMode {
    const hit = COUNT_RANKED_MODES.find(
        (m) => m.tf.includes(v.tfMethod) && m.idf.includes(v.idfMethod) && m.norm.includes(v.normalization)
    );
    return hit ? hit.mode : "custom";
}

/** true bila Words to Keep merangking kata dengan total kemunculan kata (bukan jumlah TF × IDF). */
export function ranksByWordCount(v: VectorizationChoice): boolean {
    return engineFormulaMode(v) !== "custom";
}

// Label memakai istilah umum di literatur temu kembali informasi (nama ganda dipisah "/");
// rumus ditampilkan terpisah dengan teks kecil di UI.
export const TF_OPTIONS: readonly FormulaOption<TfMethod>[] = [
    { value: "binary", label: "Binary / Boolean", formula: "1 if f > 0, else 0", latex: "\\mathrm{tf} = \\begin{cases} 1, & f > 0 \\\\ 0, & f = 0 \\end{cases}" },
    { value: "raw", label: "Raw count / Raw frequency", formula: "f", latex: "\\mathrm{tf} = f" },
    { value: "log1p", label: "Logarithmic / Log-scaled", formula: "ln(1 + f)", latex: "\\mathrm{tf} = \\ln(1 + f)" },
    { value: "sublinear", label: "Sublinear", formula: "1 + ln(f) if f > 0, else 0", latex: "\\mathrm{tf} = \\begin{cases} 1 + \\ln f, & f > 0 \\\\ 0, & f = 0 \\end{cases}" },
    { value: "normalized", label: "Relative frequency / Length-normalized", formula: "f / (number of tokens in document)", latex: "\\mathrm{tf} = \\dfrac{f}{\\lvert d \\rvert}" },
];

export const IDF_OPTIONS: readonly FormulaOption<IdfMethod>[] = [
    { value: "none", label: "None", formula: "1", latex: "\\mathrm{idf} = 1" },
    { value: "standard", label: "Standard IDF", formula: "ln(N / df)", latex: "\\mathrm{idf} = \\ln \\dfrac{N}{\\mathrm{df}}" },
    { value: "smooth", label: "Smooth IDF", formula: "ln((1 + N) / (1 + df)) + 1", latex: "\\mathrm{idf} = \\ln \\dfrac{1 + N}{1 + \\mathrm{df}} + 1" },
    { value: "plus1", label: "IDF + 1", formula: "ln(N / df) + 1", latex: "\\mathrm{idf} = \\ln \\dfrac{N}{\\mathrm{df}} + 1" },
];

export const NORM_OPTIONS: readonly FormulaOption<Normalization>[] = [
    { value: "none", label: "None", formula: "no normalization", latex: "v' = v" },
    { value: "l2", label: "L2 / Cosine / Euclidean", formula: "v / ‖v‖₂", latex: "v' = \\dfrac{v}{\\lVert v \\rVert_2}" },
    { value: "l1", label: "L1 / Manhattan", formula: "v / Σ|v|", latex: "v' = \\dfrac{v}{\\lVert v \\rVert_1}" },
    { value: "doc_length", label: "Document length / Average-length", formula: "v · (average vector length) / ‖v‖₂", latex: "v' = v \\cdot \\dfrac{\\overline{\\lVert v \\rVert_2}}{\\lVert v \\rVert_2}" },
];

/** Apakah nilai `value` ada di daftar opsi sah. */
export function isOptionAllowed<T extends string>(options: readonly FormulaOption<T>[], value: T): boolean {
    return options.some((o) => o.value === value);
}
