/**
 * Evaluasi skripsi — Track C2 (black-box menu Naive Bayes), tingkat dialog.
 *
 * Skenario: BB-14, BB-15, BB-16, BB-17, BB-18, BB-20 (sisi UI), BB-21, BB-22 (sisi UI),
 * BB-23 (sisi UI), BB-27 (sisi UI).
 *
 * Pendekatan: seluruh dialog `NaiveBayesContainer` dirender (tab Variables, Text Preprocessing,
 * Options, Validation, Output yang ASLI) di jsdom. Yang di-mock hanya batas luar: store dataset,
 * modal, IndexedDB, toast, dan service analisis (`analyzeNaiveBayes`, karena memakai Worker/WASM).
 * Interaksi pengguna ditiru lewat klik/dobel-klik/ketik pada elemen yang sama seperti di aplikasi.
 *
 * Nama `describe`/`it` memuat ID skenario (BB-xx) agar status bisa dipetakan dari log Jest.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import NaiveBayesContainer from "@/components/Modals/Analyze/Classify/naive-bayes/dialogs/naive-bayes-main";
import {
    getEffectivePredictors,
    getEffectiveTextSource,
} from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesValidation";
import type { NaiveBayesType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import type { Variable, VariableMeasure, VariableType } from "@/types/Variable";

// ---------------------------------------------------------------------------------------------
// Mock batas luar
// ---------------------------------------------------------------------------------------------
const mockStoreState: { variables: Variable[]; data: unknown[][] } = { variables: [], data: [] };
const mockAnalyze = jest.fn();
const mockCloseModal = jest.fn();

jest.mock("@/stores/useVariableStore", () => ({
    useVariableStore: (selector: (state: { variables: Variable[] }) => unknown) =>
        selector({ variables: mockStoreState.variables }),
}));
jest.mock("@/stores/useDataStore", () => ({
    useDataStore: (selector: (state: { data: unknown[][] }) => unknown) =>
        selector({ data: mockStoreState.data }),
}));
jest.mock("@/hooks/useModal", () => ({
    useModal: () => ({ closeModal: mockCloseModal }),
}));
jest.mock("@/hooks/useIndexedDB", () => ({
    getFormData: async () => null,
    saveFormData: async () => undefined,
    clearFormData: async () => undefined,
}));
jest.mock("sonner", () => ({
    toast: {
        error: jest.fn(),
        info: jest.fn(),
        success: jest.fn(),
        warning: jest.fn(),
        promise: (p: Promise<unknown>) => p,
    },
}));
jest.mock("@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis", () => ({
    analyzeNaiveBayes: (...args: unknown[]) => mockAnalyze(...args),
}));

// ---------------------------------------------------------------------------------------------
// Dataset tiruan: 6 baris, 7 variabel. Kota hanya 2 nilai unik dan Teks selalu dipindah/dikeluarkan
// dalam skenario yang menghitung peringatan, supaya peringatan W-STR (teks bebas/ID) tidak ikut muncul.
// ---------------------------------------------------------------------------------------------
function makeVar(name: string, columnIndex: number, type: VariableType, measure: VariableMeasure): Variable {
    return {
        columnIndex,
        name,
        type,
        width: 8,
        decimals: 0,
        values: [],
        missing: null,
        columns: 8,
        align: "right",
        measure,
        role: "input",
    };
}

const VARIABLES: Variable[] = [
    makeVar("Id", 0, "NUMERIC", "scale"),
    makeVar("Kelas", 1, "STRING", "nominal"),
    makeVar("Kota", 2, "STRING", "nominal"),
    makeVar("Umur", 3, "NUMERIC", "scale"),
    makeVar("Teks", 4, "STRING", "nominal"),
    makeVar("VEC_a", 5, "NUMERIC", "scale"),
    makeVar("VEC_b", 6, "NUMERIC", "scale"),
];

const DATA: unknown[][] = [
    [1, "pos", "Bandung", 20, "makan nasi enak", 1, 0],
    [2, "neg", "Jakarta", 31, "tidak suka makan", 0, 1],
    [3, "pos", "Bandung", 25, "nasi enak sekali", 1, 0],
    [4, "neg", "Jakarta", 40, "tidak enak", 0, 2],
    [5, "pos", "Bandung", 22, "makan enak", 2, 0],
    [6, "neg", "Jakarta", 35, "suka tidak", 0, 1],
];

type AnalyzeArgs = {
    configData: NaiveBayesType;
    dataVariables: Array<Array<Record<string, unknown>>>;
    variables: Variable[];
    rawTextValues?: unknown[];
};

// ---------------------------------------------------------------------------------------------
// Pembantu interaksi
// ---------------------------------------------------------------------------------------------
const renderContainer = async () => {
    render(<NaiveBayesContainer onClose={jest.fn()} />);
    await screen.findByRole("tab", { name: /Variables/i });
};

const item = (name: string) => screen.getByTestId(`nb-available-item-${name}`);
/** Sorot variabel di panel kiri lalu klik tombol panah ke zona tujuan (cara pengguna di aplikasi). */
const moveTo = (name: string, zone: string) => {
    fireEvent.click(item(name));
    fireEvent.click(screen.getByTestId(`nb-move-to-${zone}`));
};
const setTarget = (name: string) => fireEvent.doubleClick(item(name));
/** Radix Tabs mengaktifkan tab pada mousedown tombol utama. */
const openTab = (name: RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
const okButton = () => screen.getByRole("button", { name: "OK" });
const lastAnalyzeArgs = (): AnalyzeArgs => {
    const calls = mockAnalyze.mock.calls;
    return calls[calls.length - 1][0] as AnalyzeArgs;
};
const columnName = (column: Array<Record<string, unknown>>): string => Object.keys(column[0])[0];

beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyze.mockResolvedValue({});
    mockStoreState.variables = VARIABLES;
    mockStoreState.data = DATA;
});

// =============================================================================================
// BB-14 — NB tanpa target
// =============================================================================================
describe("BB-14 NB tanpa target", () => {
    it("BB-14: tombol OK nonaktif selama target kosong, aktif setelah target diisi", async () => {
        await renderContainer();
        expect(okButton()).toBeDisabled();

        // Mengisi Text Features saja tidak cukup: target tetap wajib.
        moveTo("Teks", "rawText");
        expect(okButton()).toBeDisabled();

        // Double-click pertama pada variabel di panel kiri mengisi Target (perilaku v1).
        setTarget("Kelas");
        expect(okButton()).toBeEnabled();
    });

    it("BB-14: klik OK yang nonaktif tidak menjalankan analisis", async () => {
        await renderContainer();
        fireEvent.click(okButton());
        expect(mockAnalyze).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("BB-14 (karakterisasi): teks pesan validasi tidak dirender di layar, hanya OK nonaktif", async () => {
        await renderContainer();
        expect(okButton()).toBeDisabled();
        expect(screen.queryByText(/Select a target variable/i)).not.toBeInTheDocument();
    });
});

// =============================================================================================
// BB-15 — Candidate Factors / Covariates
// =============================================================================================
describe("BB-15 Candidate Factors/Covariates", () => {
    it("BB-15: mengisi Candidate memindahkan Exclude ke Available; hanya kandidat yang menjadi prediktor", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("Id", "excluded");
        expect(screen.getByTestId("nb-zone-item-excluded-Id")).toBeInTheDocument();
        expect(screen.queryByTestId("nb-available-item-Id")).not.toBeInTheDocument();

        // Candidate Covariates (scale) dan Candidate Factors (nominal).
        moveTo("Umur", "covariates");
        // Exclude otomatis dikosongkan; Id kembali ke panel kiri.
        expect(screen.queryByTestId("nb-zone-item-excluded-Id")).not.toBeInTheDocument();
        expect(screen.getByTestId("nb-available-item-Id")).toBeInTheDocument();
        moveTo("Kota", "factors");

        fireEvent.click(okButton());
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
        const args = lastAnalyzeArgs();

        expect(args.configData.main.SpecificationMode).toBe("candidates");
        expect(args.configData.main.ExcludedVar ?? []).toEqual([]);
        expect(args.configData.main.CandidateFactors).toEqual(["Kota"]);
        expect(args.configData.main.CandidateCovariates).toEqual(["Umur"]);
        expect(getEffectivePredictors(args.configData.main, VARIABLES)).toEqual(["Kota", "Umur"]);

        // Data yang dikirim ke worker: target + kandidat saja (Id, Teks, VEC_* tidak ikut).
        expect(args.dataVariables.map(columnName)).toEqual(["Kelas", "Kota", "Umur"]);
    });

    it("BB-15: aturan tipe: variabel numerik tidak dapat masuk Candidate Factors, nominal tidak dapat masuk Covariates", async () => {
        await renderContainer();
        fireEvent.click(item("Umur"));
        expect(screen.queryByTestId("nb-move-to-factors")).not.toBeInTheDocument();
        expect(screen.getByTestId("nb-move-to-covariates")).toBeInTheDocument();
        fireEvent.click(item("Kota"));
        expect(screen.queryByTestId("nb-move-to-covariates")).not.toBeInTheDocument();
        expect(screen.getByTestId("nb-move-to-factors")).toBeInTheDocument();
    });
});

// =============================================================================================
// BB-16 — Raw Text Variable mengaktifkan tab Text Preprocessing
// =============================================================================================
describe("BB-16 Raw Text Variable", () => {
    it("BB-16: tab Text Preprocessing nonaktif tanpa Raw Text dan aktif (dapat dibuka) setelah Raw Text diisi", async () => {
        await renderContainer();
        expect(screen.getByRole("tab", { name: /Text Preprocessing/i })).toBeDisabled();

        // Variabel numerik tidak boleh menjadi Raw Text Variable.
        fireEvent.click(item("Umur"));
        expect(screen.queryByTestId("nb-move-to-rawText")).not.toBeInTheDocument();

        moveTo("Teks", "rawText");
        const tab = screen.getByRole("tab", { name: /Text Preprocessing/i });
        expect(tab).toBeEnabled();

        openTab(/Text Preprocessing/i);
        await waitFor(() =>
            expect(
                screen.getByText(/These settings convert the Raw Text Variable into word vectors/i)
            ).toBeInTheDocument()
        );
        expect(screen.getByRole("tab", { name: /Text Preprocessing/i })).toHaveAttribute("data-state", "active");
    });

    it("BB-16: mengosongkan Raw Text menonaktifkan kembali tab dan mengembalikan tampilan ke Variables", async () => {
        await renderContainer();
        moveTo("Teks", "rawText");
        openTab(/Text Preprocessing/i);
        await waitFor(() =>
            expect(screen.getByRole("tab", { name: /Text Preprocessing/i })).toHaveAttribute("data-state", "active")
        );
        openTab(/Variables/i);
        await waitFor(() => expect(screen.getByTestId("nb-variables-tab")).toBeInTheDocument());
        fireEvent.click(screen.getByTestId("nb-zone-item-rawText-Teks"));
        fireEvent.click(screen.getByTestId("nb-move-back-rawText"));
        await waitFor(() => expect(screen.getByRole("tab", { name: /Text Preprocessing/i })).toBeDisabled());
    });
});

// =============================================================================================
// BB-17 — Complement + prediktor numerik/kategorik
// =============================================================================================
describe("BB-17 Complement dengan prediktor non-teks", () => {
    it("BB-17: Complement dipilih saat hanya Text Features, lalu prediktor ditambah -> OK nonaktif dan galat tampil di Options", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("Teks", "rawText");
        // Keluarkan semua variabel lain dari model agar hanya Text Features yang tersisa.
        fireEvent.click(screen.getByTestId("nb-select-all-filtered"));
        fireEvent.click(screen.getByTestId("nb-move-to-excluded"));
        expect(okButton()).toBeEnabled();

        // Options: Complement tersedia karena tidak ada prediktor lain.
        openTab(/^Options$/i);
        const complement = await screen.findByRole("radio", { name: "Complement" });
        expect(complement).toBeEnabled();
        fireEvent.click(complement);
        expect(screen.getByRole("radio", { name: "Complement" })).toHaveAttribute("aria-checked", "true");
        expect(okButton()).toBeEnabled();

        // Kembali ke Variables: satu variabel numerik dikembalikan sebagai prediktor.
        openTab(/Variables/i);
        await screen.findByTestId("nb-variables-tab");
        fireEvent.click(screen.getByTestId("nb-zone-item-excluded-Umur"));
        fireEvent.click(screen.getByTestId("nb-move-back-excluded"));

        expect(okButton()).toBeDisabled();

        // Options: Complement kini nonaktif untuk dipilih ulang dan galat ditampilkan.
        openTab(/^Options$/i);
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(/Complement is selected, but the model also contains numeric or categorical variables/i);
        expect(alert).toHaveTextContent(/Choose Multinomial or Bernoulli/i);
        expect(screen.getByRole("radio", { name: "Complement" })).toBeDisabled();

        // Memilih Multinomial menyelesaikan konflik dan OK aktif lagi.
        fireEvent.click(screen.getByRole("radio", { name: "Multinomial" }));
        await waitFor(() => expect(okButton()).toBeEnabled());
    });
});

// =============================================================================================
// BB-18 — Text alpha 0 atau > maksimum
// =============================================================================================
describe("BB-18 Alpha di luar batas", () => {
    it("BB-18: Text Alpha 0 dan 1000 menampilkan pesan angka; nilai tidak sah tidak diteruskan ke form", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("Teks", "rawText");
        openTab(/^Options$/i);
        const input = await screen.findByLabelText(/Text Alpha/i);

        fireEvent.change(input, { target: { value: "0" } });
        expect(screen.getByText("Text Alpha must be greater than 0")).toBeInTheDocument();

        fireEvent.change(input, { target: { value: "1000" } });
        expect(screen.getByText("Text Alpha must not exceed 999")).toBeInTheDocument();
        expect(screen.queryByText("Text Alpha must be greater than 0")).not.toBeInTheDocument();

        // Batas atas yang sah (999) tidak menampilkan pesan.
        fireEvent.change(input, { target: { value: "999" } });
        expect(screen.queryByText(/Text Alpha must/)).not.toBeInTheDocument();

        // Nilai tidak sah terakhir tidak pernah masuk ke form: setelah pindah tab nilai kembali ke nilai sah terakhir.
        fireEvent.change(input, { target: { value: "0" } });
        openTab(/Validation/i);
        await screen.findByLabelText(/Training Percentage/i);
        openTab(/^Options$/i);
        expect(await screen.findByLabelText(/Text Alpha/i)).toHaveValue(999);
    });

    it("BB-18: Smoothing Alpha 0 dan 1000 menampilkan pesan angka (alpha kategorik)", async () => {
        await renderContainer();
        openTab(/^Options$/i);
        const input = await screen.findByLabelText(/Smoothing Alpha/i);
        fireEvent.change(input, { target: { value: "0" } });
        expect(screen.getByText("Smoothing Alpha must be greater than 0")).toBeInTheDocument();
        fireEvent.change(input, { target: { value: "1000" } });
        expect(screen.getByText("Smoothing Alpha must not exceed 999")).toBeInTheDocument();
    });
});

// =============================================================================================
// BB-20 — Gaussian (Weka min. std), sisi UI
// =============================================================================================
describe("BB-20 Gaussian (Weka min. std) - sisi UI", () => {
    it("BB-20: memilih 'Gaussian (Weka min. std)' dan OK mengirim NumericLikelihood=gaussian_minstd ke analisis", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("Teks", "excluded");
        openTab(/^Options$/i);
        expect(screen.getByRole("radio", { name: "Gaussian" })).toHaveAttribute("aria-checked", "true");
        fireEvent.click(await screen.findByRole("radio", { name: "Gaussian (Weka min. std)" }));
        expect(screen.getByRole("radio", { name: "Gaussian (Weka min. std)" })).toHaveAttribute("aria-checked", "true");

        // Tabel override memuat variabel numerik efektif.
        expect(screen.getByLabelText("Likelihood for Umur")).toBeInTheDocument();

        fireEvent.click(okButton());
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
        expect(lastAnalyzeArgs().configData.options.NumericLikelihood).toBe("gaussian_minstd");
    });
});

// =============================================================================================
// BB-21 — Training Percentage 0 atau 100
// =============================================================================================
describe("BB-21 Training Percentage di luar 1-99", () => {
    const TRAINING_MESSAGE = "Training percentage must be a whole number between 1 and 99.";

    it.each(["0", "100"])(
        "BB-21: Training Percentage %s menahan perpindahan tab dengan toast pesan validasi",
        async (value) => {
            await renderContainer();
            openTab(/Validation/i);
            const input = await screen.findByLabelText(/Training Percentage/i);
            fireEvent.change(input, { target: { value } });

            openTab(/^Output$/i);
            expect(toast.error).toHaveBeenCalledWith(
                TRAINING_MESSAGE,
                expect.objectContaining({ id: "naive-bayes-validation-error" })
            );
            // Tab tidak berpindah: masih di Validation.
            expect(screen.getByLabelText(/Training Percentage/i)).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: /Validation/i })).toHaveAttribute("data-state", "active");
        }
    );

    it("BB-21: klik OK dengan Training Percentage 0 menolak menjalankan analisis (OK sendiri tetap aktif)", async () => {
        await renderContainer();
        setTarget("Kelas");
        openTab(/Validation/i);
        fireEvent.change(await screen.findByLabelText(/Training Percentage/i), { target: { value: "0" } });
        expect(okButton()).toBeEnabled();
        fireEvent.click(okButton());
        expect(toast.error).toHaveBeenCalledWith(TRAINING_MESSAGE, expect.anything());
        expect(mockAnalyze).not.toHaveBeenCalled();
    });

    it("BB-21: nilai 1 dan 99 (batas sah) diterima dan tab dapat ditinggalkan", async () => {
        await renderContainer();
        openTab(/Validation/i);
        const input = await screen.findByLabelText(/Training Percentage/i);
        fireEvent.change(input, { target: { value: "99" } });
        fireEvent.change(input, { target: { value: "1" } });
        openTab(/^Output$/i);
        await waitFor(() => expect(screen.getByRole("tab", { name: /^Output$/i })).toHaveAttribute("data-state", "active"));
        expect(toast.error).not.toHaveBeenCalled();
    });
});

// =============================================================================================
// BB-22 — Holdout 70% seed 42, dua kali (sisi UI)
// =============================================================================================
describe("BB-22 Holdout 70% seed 42 - sisi UI", () => {
    it("BB-22: konfigurasi holdout 70 dan seed 42 dikirim identik pada dua kali OK", async () => {
        await renderContainer();
        setTarget("Kelas");
        openTab(/Validation/i);
        // Default: holdout 70.
        expect(await screen.findByLabelText(/Training Percentage/i)).toHaveValue(70);
        expect(screen.getByLabelText(/Holdout Percentage/i)).toHaveValue(30);

        fireEvent.click(screen.getByRole("checkbox", { name: /Use random seed/i }));
        const seed = await screen.findByLabelText(/^Seed/i);
        fireEvent.change(seed, { target: { value: "42" } });
        expect(screen.getByLabelText(/^Seed/i)).toHaveValue(42);

        fireEvent.click(okButton());
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
        fireEvent.click(okButton());
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(2));

        const first = mockAnalyze.mock.calls[0][0] as AnalyzeArgs;
        const second = mockAnalyze.mock.calls[1][0] as AnalyzeArgs;
        expect(first.configData.validation).toEqual({
            ValidationMethod: "holdout",
            TrainingPercentage: 70,
            KFolds: 10,
            RandomSeed: 42,
        });
        // Dua pemanggilan menerima muatan yang sama persis (data + konfigurasi).
        expect(second.configData).toEqual(first.configData);
        expect(second.dataVariables).toEqual(first.dataVariables);
    });
});

// =============================================================================================
// BB-23 — 10-fold CV (sisi UI)
// =============================================================================================
describe("BB-23 10-fold CV - sisi UI", () => {
    it("BB-23: memilih Cross-Validation Folds dengan 10 fold mengirim ValidationMethod=kfold dan KFolds=10", async () => {
        await renderContainer();
        setTarget("Kelas");
        openTab(/Validation/i);
        fireEvent.click(await screen.findByRole("radio", { name: /Cross-Validation Folds/i }));
        const folds = await screen.findByLabelText(/Number of Folds/i);
        expect(folds).toHaveValue(10);
        // Kolom holdout dikosongkan saat k-fold aktif.
        expect(screen.getByLabelText(/Training Percentage/i)).toBeDisabled();

        fireEvent.click(okButton());
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
        const validation = lastAnalyzeArgs().configData.validation;
        expect(validation.ValidationMethod).toBe("kfold");
        expect(validation.KFolds).toBe(10);
    });
});

// =============================================================================================
// BB-27 — Peringatan kebocoran jalur Word-Vector (sisi UI)
// =============================================================================================
describe("BB-27 Peringatan kebocoran Word-Vector - sisi UI", () => {
    const LEAKAGE =
        "The vocabulary and IDF of these vector columns were computed outside Naive Bayes on all rows, so evaluation results may be slightly optimistic.";

    it("BB-27: peringatan tampil saat Word-Vector Variables terisi, hilang saat dikosongkan", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("Teks", "excluded");
        expect(screen.queryByTestId("nb-text-warnings")).not.toBeInTheDocument();

        moveTo("VEC_a", "wordVector");
        expect(screen.getByTestId("nb-text-warnings")).toHaveTextContent(LEAKAGE);

        // Peringatan tidak memblokir OK.
        expect(okButton()).toBeEnabled();

        fireEvent.click(screen.getByTestId("nb-zone-item-wordVector-VEC_a"));
        fireEvent.click(screen.getByTestId("nb-move-back-wordVector"));
        expect(screen.queryByTestId("nb-text-warnings")).not.toBeInTheDocument();
    });

    it("BB-27: jalur Raw Text TIDAK menampilkan peringatan kebocoran", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("Teks", "rawText");
        expect(screen.queryByTestId("nb-text-warnings")).not.toBeInTheDocument();
    });

    it("BB-27: jalur Word-Vector memengaruhi sumber teks efektif dan data yang dikirim (kolom vektor di ekor)", async () => {
        await renderContainer();
        setTarget("Kelas");
        moveTo("VEC_a", "wordVector");
        fireEvent.click(item("VEC_b"));
        fireEvent.click(screen.getByTestId("nb-move-to-wordVector"));
        fireEvent.click(okButton());
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
        const args = lastAnalyzeArgs();
        expect(getEffectiveTextSource(args.configData.main)).toBe("vector");
        expect(args.configData.main.TextVectorVars).toEqual(["VEC_a", "VEC_b"]);
        const names = args.dataVariables.map(columnName);
        expect(names[0]).toBe("Kelas");
        expect(names.slice(-2)).toEqual(["VEC_a", "VEC_b"]);
    });
});
