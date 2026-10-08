// Track C1 (Black-box STWV) — BB-01, BB-02 (sisi antarmuka), BB-03, BB-06, BB-11, BB-12, BB-13.
//
// StringToWordVectorModal (mode sidebar), VariablesTab, OptionsTab, hook useStringToWordVector,
// formatStwvError, buildStwvOutput, dan writeStwvOutput dijalankan APA ADANYA (kode produksi).
// Yang diganti hanya batas luar:
//   - Web Worker/WASM  → FakeWorker (balasan ditentukan tes). Angka/galat balasan disalin dari
//     acuan independen (logs/reference_bb02.txt) dan dari teks galat di statify-text-core;
//     kebenaran komputasinya diuji di Rust (tests/eval_blackbox_stwv.rs), bukan di sini.
//   - Zustand store (variabel, data, hasil) dan sonner → tiruan sederhana yang mencatat panggilan.
//   - processVariableName pada tiruan hanya meniru aturan keunikan nama; aturan penamaan
//     sesungguhnya diperiksa manual (C_manual_checklist_C1.md).

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Variable } from "@/types/Variable";
import StringToWordVectorModal from "../../StringToWordVectorModal";

// ── Tiruan batas luar ────────────────────────────────────────────────────────

// Hook asli dimuat lewat pemuat yang hanya mengganti teks `import.meta.url` (tidak dapat di-parse ts-jest);
// lihat helpers/loadStwvHook.ts. Logika hook tidak diubah.
jest.mock("../../hooks/useStringToWordVector", () => require("./helpers/loadStwvHook").loadStwvHook());

let mockVariables: Variable[] = [];
const mockRegisterMetadata = jest.fn(async (..._args: unknown[]) => undefined);
const mockLoadVariables = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock("@/stores/useVariableStore", () => {
    const state = () => ({
        variables: mockVariables,
        registerVariableMetadata: (...a: unknown[]) => mockRegisterMetadata(...a),
        loadVariables: (...a: unknown[]) => mockLoadVariables(...a),
    });
    const hook = Object.assign((selector: (s: ReturnType<typeof state>) => unknown) => selector(state()), {
        getState: state,
    });
    return {
        useVariableStore: hook,
        processVariableName: (name: string, existing: Array<{ name: string }>) => {
            let processedName = name.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._@#$]/g, "_");
            const used = existing.map((v) => v.name.toLowerCase());
            let counter = 1;
            const base = processedName;
            while (used.includes(processedName.toLowerCase())) {
                processedName = `${base}_${counter}`;
                counter++;
            }
            return { isValid: true, processedName };
        },
    };
});

const mockGetVariableData = jest.fn();
const mockCheckAndSave = jest.fn(async () => undefined);
const mockAddVariableColumns = jest.fn(async (..._args: unknown[]) => ({ startColumnIndex: 5 }));

jest.mock("@/stores/useDataStore", () => {
    const state = () => ({
        getVariableData: (...a: unknown[]) => mockGetVariableData(...a),
        checkAndSave: () => mockCheckAndSave(),
        addVariableColumns: (...a: unknown[]) => mockAddVariableColumns(...a),
    });
    const hook = Object.assign((selector: (s: ReturnType<typeof state>) => unknown) => selector(state()), {
        getState: state,
    });
    return { useDataStore: hook };
});

const mockAddLog = jest.fn(async (..._args: unknown[]) => 11);
const mockAddAnalytic = jest.fn(async (..._args: unknown[]) => 22);
const mockAddStatistic = jest.fn(async (..._args: unknown[]) => 33);

jest.mock("@/stores/useResultStore", () => ({
    useResultStore: {
        getState: () => ({
            addLog: (...a: unknown[]) => mockAddLog(...a),
            addAnalytic: (...a: unknown[]) => mockAddAnalytic(...a),
            addStatistic: (...a: unknown[]) => mockAddStatistic(...a),
        }),
    },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastWarning = jest.fn();
jest.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => mockToastSuccess(...a),
        error: (...a: unknown[]) => mockToastError(...a),
        warning: (...a: unknown[]) => mockToastWarning(...a),
    },
}));

type WorkerRequest = { data: string[]; config: Record<string, unknown> };
type WorkerReply = { status: "success" | "error"; payload: unknown };
let mockWorkerReply: (req: WorkerRequest) => WorkerReply = () => ({ status: "error", payload: { code: "X", message: "belum diatur" } });
const mockWorkerRequests: WorkerRequest[] = [];

class FakeWorker {
    onmessage: ((e: { data: WorkerReply }) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    postMessage(req: WorkerRequest): void {
        mockWorkerRequests.push(req);
        const reply = mockWorkerReply(req);
        setTimeout(() => this.onmessage?.({ data: reply }), 0);
    }
    terminate(): void {
        /* tidak ada */
    }
}

// ── Data uji ────────────────────────────────────────────────────────────────

const mkVar = (v: Partial<Variable> & { name: string; columnIndex: number }): Variable =>
    ({
        type: "NUMERIC",
        width: 8,
        decimals: 0,
        label: "",
        values: [],
        missing: null,
        columns: 64,
        align: "right",
        measure: "scale",
        role: "input",
        ...v,
    }) as unknown as Variable;

/** Dataset: dua variabel teks (STRING), satu numerik nominal, satu numerik ordinal, satu numerik skala. */
const VARIABLES: Variable[] = [
    mkVar({ id: 1, columnIndex: 0, name: "umur", type: "NUMERIC", measure: "scale" }),
    mkVar({ id: 2, columnIndex: 1, name: "teks", label: "Teks Ulasan", type: "STRING", measure: "nominal" }),
    mkVar({ id: 3, columnIndex: 2, name: "kelas", type: "NUMERIC", measure: "nominal" }),
    mkVar({ id: 4, columnIndex: 3, name: "tingkat", type: "NUMERIC", measure: "ordinal" }),
    mkVar({ id: 5, columnIndex: 4, name: "catatan", type: "STRING", measure: "ordinal" }),
];

/** Korpus acuan D (lihat logs/reference_bb02.txt). */
const CORPUS_D = ["Saya suka makan nasi", "Saya tidak suka nasi!", "Makan, makan, makan"];
const VOCAB_D = ["makan", "nasi", "saya", "suka", "tidak"];
const MATRIX_D = [
    [1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1],
    [3, 0, 0, 0, 0],
];

const successReply = (vocabulary: string[], matrix: number[][]): WorkerReply => ({
    status: "success",
    payload: {
        vocabulary,
        matrix,
        stats: { total_documents: matrix.length, vocabulary_size: vocabulary.length, method: "TF: raw, IDF: none, Norm: none, Keep: 1000, MinFreq: 1" },
    },
});

// ── Helper antarmuka ────────────────────────────────────────────────────────

const onClose = jest.fn();

function renderModal() {
    return render(<StringToWordVectorModal onClose={onClose} containerType="sidebar" />);
}

const okButton = (): HTMLElement => screen.getByRole("button", { name: "OK" });

async function pickVariable(displayName: string) {
    await userEvent.click(await screen.findByText(displayName));
    const arrow = document.querySelector('svg[data-icon="ChevronRight"]');
    const btn = arrow?.closest("button");
    if (!btn) throw new Error("Tombol pemindah variabel tidak ditemukan");
    await userEvent.click(btn);
}

async function openTab(name: "Variables" | "Options") {
    await userEvent.click(screen.getByRole("tab", { name }));
}

const lastStatisticPayloads = () =>
    mockAddStatistic.mock.calls.map(
        (c) => c[1] as { title: string; components: string; output_data: string; description: string }
    );

const tableOf = (title: string) => {
    const stat = lastStatisticPayloads().find((s) => s.title === title);
    if (!stat) throw new Error(`Statistic "${title}" tidak ditulis`);
    return (JSON.parse(stat.output_data) as { tables: Array<{ title: string; rows: Array<Record<string, unknown>>; columnHeaders: Array<{ header: string }> }> }).tables[0];
};

beforeAll(() => {
    (global as unknown as { Worker: unknown }).Worker = FakeWorker;
});

beforeEach(() => {
    jest.clearAllMocks();
    mockVariables = VARIABLES;
    mockWorkerRequests.length = 0;
    mockGetVariableData.mockResolvedValue({ data: CORPUS_D });
    mockWorkerReply = () => successReply(VOCAB_D, MATRIX_D);
});

// ═════════════════════════════════════════════════════════════════════════════

describe("BB-01 membuka panel String to Word Vector", () => {
    it("panel menampilkan tab Variables dan Options", async () => {
        renderModal();
        expect(screen.getByRole("tab", { name: "Variables" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Options" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Variables" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        expect(screen.getByText("Target Variable:")).toBeInTheDocument();
    });

    it("daftar variabel hanya memuat variabel STRING atau bersifat nominal", async () => {
        renderModal();
        // Terlihat: teks (label), kelas (numerik nominal), catatan (STRING walau ordinal)
        expect(await screen.findByText("Teks Ulasan")).toBeInTheDocument();
        expect(screen.getByText("kelas")).toBeInTheDocument();
        expect(screen.getByText("catatan")).toBeInTheDocument();
        // Tidak terlihat: numerik skala dan numerik ordinal
        expect(screen.queryByText("umur")).not.toBeInTheDocument();
        expect(screen.queryByText("tingkat")).not.toBeInTheDocument();
    });

    it("tab Options memuat bagian Vector Column Name, Stopwords, Stemming, Tokenizer, dan Vectorization Method", async () => {
        renderModal();
        await openTab("Options");
        for (const heading of [
            "Vector Column Name",
            "Text Preprocessing",
            "Stopwords Removal",
            "Stemming",
            "Tokenizer",
            "Vectorization Method",
        ]) {
            expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
        }
        expect(screen.getByText("Words to Keep")).toBeInTheDocument();
        expect(screen.getByText("Min term frequency")).toBeInTheDocument();
    });

    it("tanpa variabel terpilih tombol OK nonaktif; setelah memilih variabel OK aktif", async () => {
        renderModal();
        expect(okButton()).toBeDisabled();
        await pickVariable("Teks Ulasan");
        await waitFor(() => expect(okButton()).toBeEnabled());
        // Variabel yang dipilih pindah ke Target Variable dan hilang dari daftar kiri
        expect(screen.getAllByText("Teks Ulasan")).toHaveLength(1);
    });
});

describe("BB-03 Vector Column Name tidak sah (awalan kolom)", () => {
    async function prepare() {
        renderModal();
        await pickVariable("Teks Ulasan");
        await waitFor(() => expect(okButton()).toBeEnabled());
        await openTab("Options");
        return document.querySelector<HTMLInputElement>("#stwv-column-prefix") as HTMLInputElement;
    }

    it("awalan dimulai angka menampilkan pesan dan menonaktifkan OK", async () => {
        const input = await prepare();
        expect(input.value).toBe("VEC_");
        fireEvent.change(input, { target: { value: "1VEC_" } });
        expect(screen.getByText("Vector column name must start with a letter, @, # or $.")).toBeInTheDocument();
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(okButton()).toBeDisabled();
    });

    it("awalan 33 karakter (melewati batas isian) menampilkan pesan panjang maksimum 32 dan OK nonaktif", async () => {
        const input = await prepare();
        fireEvent.change(input, { target: { value: "A".repeat(33) } });
        expect(screen.getByText("Vector column name must be at most 32 characters long.")).toBeInTheDocument();
        expect(okButton()).toBeDisabled();
    });

    it("kolom isian dibatasi maxLength 32 sehingga mengetik 40 karakter hanya menyimpan 32 dan tidak ada galat", async () => {
        const input = await prepare();
        expect(input).toHaveAttribute("maxlength", "32");
        await userEvent.clear(input);
        await userEvent.type(input, "B".repeat(40));
        expect(input.value).toBe("B".repeat(32));
        expect(screen.queryByText(/at most 32 characters/)).not.toBeInTheDocument();
        expect(okButton()).toBeEnabled();
    });

    it("temuan C1-02: bila hanya awalan yang tidak sah, kotak galat di bawah memuat judul tanpa rincian (pesan hanya ada di tab Options)", async () => {
        const input = await prepare();
        fireEvent.change(input, { target: { value: "1VEC_" } });
        await openTab("Variables");
        expect(screen.getByText("Some options are invalid:")).toBeInTheDocument();
        expect(screen.queryByText("Vector column name must start with a letter, @, # or $.")).not.toBeInTheDocument();
        expect(okButton()).toBeDisabled();
    });

    it("awalan mengandung spasi atau simbol terlarang ditolak, awalan sah mengaktifkan kembali OK", async () => {
        const input = await prepare();
        fireEvent.change(input, { target: { value: "VEC kata" } });
        expect(screen.getByText("Vector column name cannot contain spaces.")).toBeInTheDocument();
        expect(okButton()).toBeDisabled();

        fireEvent.change(input, { target: { value: "VEC-" } });
        expect(
            screen.getByText("Vector column name can only contain letters, digits, periods, underscores, @, # and $.")
        ).toBeInTheDocument();
        expect(okButton()).toBeDisabled();

        fireEvent.change(input, { target: { value: "TKS_" } });
        expect(input).toHaveAttribute("aria-invalid", "false");
        expect(okButton()).toBeEnabled();
    });
});

describe("BB-06 Delimiters regex tidak valid (galat INVALID_REGEX dari inti)", () => {
    it("antarmuka tidak memvalidasi regex di muka; setelah OK galat INVALID_REGEX tampil lengkap dengan kodenya dan modal tetap terbuka", async () => {
        // Teks galat disalin dari statify-text-core/src/tokenizer.rs (compile_regex) + pesan crate regex.
        const regexMessage =
            "The delimiter regex pattern is invalid: regex parse error:\n    [(\n    ^\nerror: unclosed character class";
        mockWorkerReply = () => ({ status: "error", payload: { code: "INVALID_REGEX", message: regexMessage } });

        renderModal();
        await pickVariable("Teks Ulasan");
        await openTab("Options");
        fireEvent.change(document.querySelector("#delimiters") as HTMLInputElement, { target: { value: "[(" } });
        // Tidak ada pesan validasi sisi klien untuk regex: OK masih aktif
        expect(screen.queryByText("Some options are invalid:")).not.toBeInTheDocument();
        expect(okButton()).toBeEnabled();

        await userEvent.click(okButton());
        const message = await screen.findByText(/The delimiter regex pattern is invalid:/);
        expect(message).toHaveTextContent(/\(INVALID_REGEX\)$/);
        expect(mockWorkerRequests).toHaveLength(1);
        expect(mockWorkerRequests[0].config.delimiters).toBe("[(");
        expect(mockAddVariableColumns).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("delimiter dikosongkan ditolak di sisi klien dengan pesan dan OK nonaktif", async () => {
        renderModal();
        await pickVariable("Teks Ulasan");
        await openTab("Options");
        fireEvent.change(document.querySelector("#delimiters") as HTMLInputElement, { target: { value: "" } });
        expect(screen.getByText("Delimiters cannot be empty.")).toBeInTheDocument();
        expect(okButton()).toBeDisabled();
    });
});

describe("BB-11 kosakata kosong (galat EMPTY_VOCABULARY dari inti)", () => {
    it("galat EMPTY_VOCABULARY tampil dengan kalimat utama dan kode; tidak ada kolom ditambahkan", async () => {
        // Teks galat disalin dari statify-text-core/src/vectorizer.rs (fit_tokens).
        mockWorkerReply = () => ({
            status: "error",
            payload: {
                code: "EMPTY_VOCABULARY",
                message:
                    "The vocabulary is empty after text preprocessing. Try using fewer stopwords or changing the stemming setting.",
            },
        });
        renderModal();
        await pickVariable("Teks Ulasan");
        await openTab("Options");
        await userEvent.click(document.querySelector("#sw-id") as HTMLElement); // Stopwords Indonesian
        fireEvent.change(document.querySelector("#min-term-freq") as HTMLInputElement, { target: { value: "5" } });
        await userEvent.click(okButton());

        const box = await screen.findByText(/The vocabulary is empty after text preprocessing\./);
        expect(box).toHaveTextContent(
            "The vocabulary is empty after text preprocessing. Try using fewer stopwords or changing the stemming setting. (EMPTY_VOCABULARY)"
        );
        expect(mockWorkerRequests[0].config.stopwords_method).toBe("indonesian");
        expect(mockWorkerRequests[0].config.min_term_freq).toBe(5);
        expect(mockAddVariableColumns).not.toHaveBeenCalled();
        expect(mockAddStatistic).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("galat EMPTY_VOCABULARY akibat Min term frequency memakai kalimat utama yang berbeda", async () => {
        mockWorkerReply = () => ({
            status: "error",
            payload: {
                code: "EMPTY_VOCABULARY",
                message:
                    "The vocabulary is empty after applying the minimum term frequency. Try lowering the minimum term frequency.",
            },
        });
        renderModal();
        await pickVariable("Teks Ulasan");
        await userEvent.click(okButton());
        const box = await screen.findByText(/after applying the minimum term frequency/);
        expect(box).toHaveTextContent(
            "The vocabulary is empty after applying the minimum term frequency. Try lowering the minimum term frequency. (EMPTY_VOCABULARY)"
        );
    });
});

describe("BB-02 dan BB-13 alur OK pada korpus acuan (antarmuka dan Output Viewer)", () => {
    it("OK mengirim default Weka ke worker, menambahkan lima kolom VEC_ ke dataset, lalu menutup panel", async () => {
        renderModal();
        await pickVariable("Teks Ulasan");
        await userEvent.click(okButton());
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

        // Dokumen dan konfigurasi yang dikirim ke worker
        expect(mockWorkerRequests).toHaveLength(1);
        expect(mockWorkerRequests[0].data).toEqual(CORPUS_D);
        expect(mockWorkerRequests[0].config).toEqual({
            lowercase: true,
            stemming_method: "none",
            stopwords_method: "none",
            custom_stopwords: null,
            delimiters: "[\\s.,;:'\"()?!]+",
            ngram_min: 1,
            ngram_max: 1,
            formula_standard: "weka",
            tf_method: "raw",
            idf_method: "none",
            normalization: "none",
            words_to_keep: 1000,
            min_term_freq: 1,
        });

        // Lima kolom, nama = awalan + term (urut alfabetis), nilai = kolom matriks (baris sejajar dokumen)
        expect(mockAddVariableColumns).toHaveBeenCalledTimes(1);
        const columns = mockAddVariableColumns.mock.calls[0][0] as Array<{ variable_name: string; values: number[] }>;
        expect(columns.map((c) => c.variable_name)).toEqual(["VEC_makan", "VEC_nasi", "VEC_saya", "VEC_suka", "VEC_tidak"]);
        expect(columns.map((c) => c.values)).toEqual([
            [1, 0, 3],
            [1, 1, 0],
            [1, 1, 0],
            [1, 1, 0],
            [0, 1, 0],
        ]);

        // Metadata variabel: numerik skala, 0 desimal (TF raw tanpa IDF/normalisasi), mulai dari kolom ke-5
        expect(mockRegisterMetadata).toHaveBeenCalledTimes(1);
        const meta = mockRegisterMetadata.mock.calls[0][0] as Array<Record<string, unknown>>;
        expect(meta).toHaveLength(5);
        expect(meta.map((m) => m.columnIndex)).toEqual([5, 6, 7, 8, 9]);
        expect(meta.every((m) => m.decimals === 0 && m.type === "NUMERIC" && m.measure === "scale")).toBe(true);
        expect(meta[0].label).toBe('Vector of "makan"');
        expect(mockToastSuccess).toHaveBeenCalledWith("5 vector columns were added to the dataset.");
    });

    it("BB-13 Output Viewer menerima Processing Summary, Settings, dan Vocabulary dengan isi yang benar", async () => {
        renderModal();
        await pickVariable("Teks Ulasan");
        await userEvent.click(okButton());
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

        expect(mockAddLog).toHaveBeenCalledWith({ log: "STRING TO WORD VECTOR teks /PREFIX=VEC_" });
        expect(mockAddAnalytic).toHaveBeenCalledWith(11, { title: "String to Word Vector", note: "" });
        expect(lastStatisticPayloads().map((s) => s.title)).toEqual([
            "String to Word Vector",
            "Processing Summary",
            "Settings",
            "Vocabulary",
        ]);

        const executed = lastStatisticPayloads()[0];
        expect(executed.components).toBe("Executed");
        expect((JSON.parse(executed.output_data) as { text: Array<{ text: string }> }).text[0].text).toBe(
            "5 vector columns were created from variable `teks` and added as the last variables in the dataset (3 documents, 0 with a zero vector)."
        );

        const summary = tableOf("Processing Summary");
        const sv = (label: string) => summary.rows.find((r) => (r.rowHeader as string[])[0] === label)?.value;
        expect(sv("Source Variable")).toBe("teks");
        expect(sv("Documents (Rows)")).toBe(3);
        expect(sv("Documents with Zero Vector")).toBe(0);
        expect(sv("Vocabulary Size")).toBe(5);
        expect(sv("Columns Added to Dataset")).toBe(5);
        expect(sv("Column Name Prefix")).toBe("VEC_");
        expect(sv("First – Last Column")).toBe("VEC_makan – VEC_tidak");

        const settings = tableOf("Settings");
        const st = (label: string) => settings.rows.find((r) => (r.rowHeader as string[])[0] === label)?.value;
        expect(st("Formula Standard")).toBe("Weka");
        expect(st("Term Frequency (TF)")).toBe("Word count");
        expect(st("Inverse Document Frequency (IDF)")).toBe("None");
        expect(st("Normalization")).toBe("None");
        expect(st("Convert to Lowercase")).toBe("Yes");
        expect(st("Stopwords")).toBe("None");
        expect(st("Stemming")).toBe("None");
        expect(st("Tokenizer")).toBe("Word (unigram)");
        expect(st("Delimiters (Regex)")).toBe("[\\s.,;:'\"()?!]+");
        expect(st("Words to Keep")).toBe(1000);
        expect(st("Minimum Term Frequency")).toBe(1);

        const vocabulary = tableOf("Vocabulary");
        expect(vocabulary.columnHeaders.map((h) => h.header)).toEqual(["No", "Term", "Dataset Column", "Documents (Non-zero)"]);
        expect(vocabulary.rows.map((r) => [r.term, r.column, r.documents])).toEqual([
            ["makan", "VEC_makan", 2],
            ["nasi", "VEC_nasi", 2],
            ["saya", "VEC_saya", 2],
            ["suka", "VEC_suka", 2],
            ["tidak", "VEC_tidak", 1],
        ]);

        // Setiap statistic membawa interpretasi otomatis (bukan sekadar judul)
        for (const s of lastStatisticPayloads()) {
            expect(s.description.startsWith("<p><strong>What this shows.</strong>")).toBe(true);
        }
    });

    it("awalan kolom kustom TKS_ dipakai pada nama kolom dan ringkasan", async () => {
        renderModal();
        await pickVariable("Teks Ulasan");
        await openTab("Options");
        fireEvent.change(document.querySelector("#stwv-column-prefix") as HTMLInputElement, { target: { value: "TKS_" } });
        await userEvent.click(okButton());
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        const columns = mockAddVariableColumns.mock.calls[0][0] as Array<{ variable_name: string }>;
        expect(columns.map((c) => c.variable_name)).toEqual(["TKS_makan", "TKS_nasi", "TKS_saya", "TKS_suka", "TKS_tidak"]);
        const summary = tableOf("Processing Summary");
        expect(summary.rows.find((r) => (r.rowHeader as string[])[0] === "Column Name Prefix")?.value).toBe("TKS_");
    });
});

describe("BB-12 sel kosong menjadi vektor nol dan jumlah baris tetap", () => {
    const DOCS_WITH_EMPTY: Array<string | null> = [
        "Saya suka makan nasi",
        null,
        "Saya tidak suka nasi!",
        "   ",
        "Makan, makan, makan",
    ];
    const MATRIX_5 = [
        [1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0],
    ];

    it("sel kosong (null) dikirim sebagai string kosong pada indeks yang sama dan semua kolom tetap berisi 5 baris", async () => {
        mockGetVariableData.mockResolvedValue({ data: DOCS_WITH_EMPTY });
        mockWorkerReply = () => successReply(VOCAB_D, MATRIX_5);
        renderModal();
        await pickVariable("Teks Ulasan");
        await userEvent.click(okButton());
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

        expect(mockWorkerRequests[0].data).toEqual([
            "Saya suka makan nasi",
            "",
            "Saya tidak suka nasi!",
            "   ",
            "Makan, makan, makan",
        ]);
        const columns = mockAddVariableColumns.mock.calls[0][0] as Array<{ values: number[] }>;
        expect(columns).toHaveLength(5);
        for (const c of columns) {
            expect(c.values).toHaveLength(5);
            expect(c.values[1]).toBe(0);
            expect(c.values[3]).toBe(0);
        }
        const summary = tableOf("Processing Summary");
        const sv = (label: string) => summary.rows.find((r) => (r.rowHeader as string[])[0] === label)?.value;
        expect(sv("Documents (Rows)")).toBe(5);
        expect(sv("Documents with Zero Vector")).toBe(2);
    });

    it("bila seluruh sel kosong, worker tidak dipanggil dan galat EMPTY_DATA tampil", async () => {
        mockGetVariableData.mockResolvedValue({ data: [null, "", "   "] });
        renderModal();
        await pickVariable("Teks Ulasan");
        await userEvent.click(okButton());
        const box = await screen.findByText(/The selected variable has no text data\./);
        expect(box).toHaveTextContent(/\(EMPTY_DATA\)$/);
        expect(mockWorkerRequests).toHaveLength(0);
        expect(mockAddVariableColumns).not.toHaveBeenCalled();
    });
});

describe("Reset dan Cancel pada panel", () => {
    it("Cancel memanggil onClose dan Reset mengembalikan pilihan variabel serta awalan kolom", async () => {
        renderModal();
        await pickVariable("Teks Ulasan");
        await openTab("Options");
        fireEvent.change(document.querySelector("#stwv-column-prefix") as HTMLInputElement, { target: { value: "ZZ_" } });
        await userEvent.click(screen.getByRole("button", { name: "Reset" }));
        // Reset kembali ke tab Variables dan mengosongkan pilihan
        expect(screen.getByRole("tab", { name: "Variables" })).toHaveAttribute("aria-selected", "true");
        expect(okButton()).toBeDisabled();
        await openTab("Options");
        expect((document.querySelector("#stwv-column-prefix") as HTMLInputElement).value).toBe("VEC_");
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
