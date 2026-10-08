/**
 * Evaluasi skripsi — Track C3 (black-box), skenario BB-36 (F41): "Tutup dan buka kembali menu NB
 * -> pengaturan terakhir pulih".
 *
 * Pendekatan: dialog `NaiveBayesContainer` yang ASLI dirender di jsdom bersama IndexedDB sungguhan
 * (fake-indexeddb dari jest.setup.ts; `@/hooks/useIndexedDB` TIDAK di-mock). Yang di-mock hanya batas luar:
 * store variabel/dataset, modal, toast, dan service analisis (Worker/WASM). "Menutup dan membuka kembali"
 * ditiru dengan unmount lalu render ulang komponen yang sama.
 *
 * Perilaku yang diverifikasi dari sumber (dialogs/naive-bayes-main.tsx):
 *  - Pengaturan disimpan ke IndexedDB (key "NaiveBayes") HANYA saat OK ditekan dan validasi lolos.
 *  - Cancel/tutup tanpa OK tidak menyimpan apa pun.
 *  - Fingerprint dataset (name|type|measure) ikut disimpan; bila berbeda saat dibuka, seluruh form direset
 *    dan penyimpanan dihapus. Reset menghapus penyimpanan. Data lama digabung dengan default.
 *
 * Nama `describe`/`it` memuat ID skenario agar status bisa dipetakan dari log Jest.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NaiveBayesContainer from "@/components/Modals/Analyze/Classify/naive-bayes/dialogs/naive-bayes-main";
import { getFormData, saveFormData, clearFormData } from "@/hooks/useIndexedDB";
import { NaiveBayesDefault } from "@/components/Modals/Analyze/Classify/naive-bayes/constants/naive-bayes-default";
import type { Variable, VariableMeasure, VariableType } from "@/types/Variable";

// jsdom (Jest) tidak menyediakan structuredClone; fake-indexeddb memakainya.
if (typeof globalThis.structuredClone === "undefined") {
    globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------------------------
// Mock batas luar (IndexedDB TIDAK di-mock)
// ---------------------------------------------------------------------------------------------
const mockStoreState: { variables: Variable[]; data: unknown[][] } = { variables: [], data: [] };
const mockAnalyze = jest.fn();
const mockCloseModal = jest.fn();
const mockToast = {
    error: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
};

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
jest.mock("sonner", () => ({
    toast: {
        error: (...a: unknown[]) => mockToast.error(...a),
        info: (...a: unknown[]) => mockToast.info(...a),
        success: (...a: unknown[]) => mockToast.success(...a),
        warning: (...a: unknown[]) => mockToast.warning(...a),
        promise: (p: Promise<unknown>) => p,
    },
}));
jest.mock("@/components/Modals/Analyze/Classify/naive-bayes/services/naive-bayes-analysis", () => ({
    analyzeNaiveBayes: (...args: unknown[]) => mockAnalyze(...args),
}));

// ---------------------------------------------------------------------------------------------
// Dataset tiruan: D3 (cuaca) 6 baris. Referensi array variabel dijaga STABIL (store sungguhan juga stabil
// selama dataset tidak berubah), supaya efek pengamat dataset tidak salah mengira dataset berubah.
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

const D3_VARIABLES: Variable[] = [
    makeVar("Outlook", 0, "STRING", "nominal"),
    makeVar("Temp", 1, "NUMERIC", "scale"),
    makeVar("Play", 2, "STRING", "nominal"),
];
const D3_DATA: unknown[][] = [
    ["sunny", 30, "no"],
    ["sunny", 28, "no"],
    ["overcast", 26, "yes"],
    ["rainy", 20, "yes"],
    ["rainy", 18, "yes"],
    ["overcast", 22, "yes"],
];
const OTHER_VARIABLES: Variable[] = [
    makeVar("Umur", 0, "NUMERIC", "scale"),
    makeVar("Kelas", 1, "STRING", "nominal"),
];

/** Fingerprint sama dengan definisi produksi: `name|type|measure`, diurutkan, digabung ";". */
const fingerprintOf = (vars: Variable[]): string =>
    vars
        .map((v) => `${v.name}|${v.type ?? ""}|${v.measure}`)
        .sort()
        .join(";");

// ---------------------------------------------------------------------------------------------
// Pembantu interaksi
// ---------------------------------------------------------------------------------------------
type Rendered = ReturnType<typeof render>;

/** Buka menu (render) dan tunggu hidrasi dari IndexedDB selesai (tab muncul menggantikan "Loading..."). */
const openMenu = async (): Promise<Rendered> => {
    const view = render(<NaiveBayesContainer onClose={jest.fn()} />);
    await screen.findByRole("tab", { name: /Variables/i });
    return view;
};

const item = (name: string) => screen.getByTestId(`nb-available-item-${name}`);
const openTab = (name: RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
const okButton = () => screen.getByRole("button", { name: "OK" });
const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

/** Isi tab Variables, Options, Validation, Output dengan nilai non-default (cara pengguna di aplikasi). */
const fillNonDefaultSettings = () => {
    // Variables: Play sebagai target (dobel-klik pada daftar variabel tersedia)
    fireEvent.doubleClick(item("Play"));
    // Options: Smoothing Alpha 1 -> 0.5
    openTab(/Options/i);
    fireEvent.change(byId("smoothing-alpha"), { target: { value: "0.5" } });
    // Validation: Cross-Validation Folds, 5 lipatan, seed 42
    openTab(/Validation/i);
    fireEvent.click(screen.getByRole("radio", { name: "Cross-Validation Folds" }));
    fireEvent.change(byId("k-folds"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Use random seed" }));
    fireEvent.change(byId("random-seed"), { target: { value: "42" } });
    // Output: matikan Confusion Matrix
    openTab(/Output/i);
    fireEvent.click(screen.getByRole("checkbox", { name: "Confusion Matrix" }));
};

type SavedForm = typeof NaiveBayesDefault & { _variablesFingerprint?: string };
const readSaved = async (): Promise<SavedForm | null> => (await getFormData("NaiveBayes")) as SavedForm | null;

beforeEach(async () => {
    jest.clearAllMocks();
    mockAnalyze.mockResolvedValue({});
    mockStoreState.variables = D3_VARIABLES;
    mockStoreState.data = D3_DATA;
    await clearFormData("NaiveBayes");
});

// =============================================================================================
// BB-36 — Tutup dan buka kembali menu NB: pengaturan terakhir pulih
// =============================================================================================
describe("BB-36 Persistensi pengaturan menu Naive Bayes", () => {
    it("BB-36-a pembukaan pertama tanpa data tersimpan: seluruh nilai = default", async () => {
        await openMenu();
        expect(await readSaved()).toBeNull();

        openTab(/Validation/i);
        expect(screen.getByRole("radio", { name: "Training and Holdout Partition" })).toBeChecked();
        expect(byId("training-percent").value).toBe("70");
        openTab(/Options/i);
        expect(byId("smoothing-alpha").value).toBe("1");
        openTab(/Output/i);
        expect(screen.getByRole("checkbox", { name: "Confusion Matrix" })).toBeChecked();
    });

    it("BB-36-b setelah OK: IndexedDB berisi target, validasi, opsi, output, dan fingerprint dataset", async () => {
        await openMenu();
        fillNonDefaultSettings();
        await waitFor(() => expect(okButton()).toBeEnabled());
        fireEvent.click(okButton());

        await waitFor(async () => expect(await readSaved()).not.toBeNull());
        const saved = (await readSaved()) as SavedForm;
        expect(saved.main.TargetVar).toBe("Play");
        expect(saved.validation.ValidationMethod).toBe("kfold");
        expect(saved.validation.KFolds).toBe(5);
        expect(saved.validation.RandomSeed).toBe(42);
        expect(saved.options.SmoothingAlpha).toBe(0.5);
        expect(saved.output.ConfusionMatrix).toBe(false);
        expect(saved._variablesFingerprint).toBe(fingerprintOf(D3_VARIABLES));
        // Dialog ditutup dan analisis dipanggil sekali dengan konfigurasi yang sama.
        expect(mockCloseModal).toHaveBeenCalled();
        await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
    });

    it("BB-36-c tutup lalu buka kembali (dataset sama): semua pengaturan terakhir pulih di setiap tab", async () => {
        const first = await openMenu();
        fillNonDefaultSettings();
        await waitFor(() => expect(okButton()).toBeEnabled());
        fireEvent.click(okButton());
        await waitFor(async () => expect(await readSaved()).not.toBeNull());

        // Tutup (unmount) lalu buka kembali.
        first.unmount();
        await openMenu();

        // Variables: Play sudah menjadi target -> tidak lagi ada di daftar tersedia.
        expect(screen.queryByTestId("nb-available-item-Play")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();

        openTab(/Options/i);
        expect(byId("smoothing-alpha").value).toBe("0.5");
        openTab(/Validation/i);
        expect(screen.getByRole("radio", { name: "Cross-Validation Folds" })).toBeChecked();
        expect(byId("k-folds").value).toBe("5");
        expect(screen.getByRole("checkbox", { name: "Use random seed" })).toBeChecked();
        expect(byId("random-seed").value).toBe("42");
        openTab(/Output/i);
        expect(screen.getByRole("checkbox", { name: "Confusion Matrix" })).not.toBeChecked();
        expect(screen.getByRole("checkbox", { name: "Model Evaluation Metrics" })).toBeChecked();
    });

    it("BB-36-d menutup dengan Cancel tanpa OK: tidak ada yang tersimpan, pembukaan berikutnya kembali ke default", async () => {
        const first = await openMenu();
        fillNonDefaultSettings();
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mockCloseModal).toHaveBeenCalled();
        expect(await readSaved()).toBeNull();
        expect(mockAnalyze).not.toHaveBeenCalled();

        first.unmount();
        await openMenu();
        openTab(/Validation/i);
        expect(screen.getByRole("radio", { name: "Training and Holdout Partition" })).toBeChecked();
        expect(byId("training-percent").value).toBe("70");
        openTab(/Options/i);
        expect(byId("smoothing-alpha").value).toBe("1");
    });

    it("BB-36-e dataset berubah sejak penyimpanan: seluruh form direset ke default dan penyimpanan dihapus", async () => {
        const first = await openMenu();
        fillNonDefaultSettings();
        await waitFor(() => expect(okButton()).toBeEnabled());
        fireEvent.click(okButton());
        await waitFor(async () => expect(await readSaved()).not.toBeNull());
        first.unmount();

        // Pengguna memuat dataset lain (daftar variabel berbeda), lalu membuka menu lagi.
        mockStoreState.variables = OTHER_VARIABLES;
        await openMenu();

        await waitFor(async () => expect(await readSaved()).toBeNull());
        openTab(/Validation/i);
        expect(screen.getByRole("radio", { name: "Training and Holdout Partition" })).toBeChecked();
        expect(byId("training-percent").value).toBe("70");
        openTab(/Options/i);
        expect(byId("smoothing-alpha").value).toBe("1");
        // Target lama tidak dipulihkan: OK tidak aktif karena belum ada target.
        expect(okButton()).toBeDisabled();
    });

    it("BB-36-f Reset: form kembali ke default dan penyimpanan dihapus sehingga pembukaan berikutnya default", async () => {
        const first = await openMenu();
        fillNonDefaultSettings();
        await waitFor(() => expect(okButton()).toBeEnabled());
        fireEvent.click(okButton());
        await waitFor(async () => expect(await readSaved()).not.toBeNull());
        first.unmount();

        await openMenu();
        fireEvent.click(screen.getByRole("button", { name: "Reset" }));
        await waitFor(async () => expect(await readSaved()).toBeNull());
        expect(mockToast.success).toHaveBeenCalledWith("The Naive Bayes settings have been reset.");
        expect(okButton()).toBeDisabled();
        openTab(/Options/i);
        expect(byId("smoothing-alpha").value).toBe("1");
    });

    it("BB-36-g data tersimpan versi lama (tanpa field v2) dimuat dan digabung dengan default tanpa galat", async () => {
        // Muatan v1: tanpa `text`, tanpa field v2 pada main/options/output.
        await saveFormData("NaiveBayes", {
            main: { TargetVar: "Play", CandidateFactors: null, CandidateCovariates: null, ExcludedVar: null },
            options: { MissingValuePolicy: "exclude", UnseenCategoryPolicy: "smoothing", SmoothingAlpha: 2, VarianceFloor: 1e-9 },
            validation: { ValidationMethod: "kfold", TrainingPercentage: 70, KFolds: 7, RandomSeed: 42 },
            output: { CaseProcessingSummary: true, AttributeDistributionTable: true, ModelEvaluationMetrics: true, ConfusionMatrix: true },
            _variablesFingerprint: fingerprintOf(D3_VARIABLES),
        });

        await openMenu();
        expect(mockToast.error).not.toHaveBeenCalled();
        openTab(/Options/i);
        expect(byId("smoothing-alpha").value).toBe("2");
        // Field v2 yang tidak ada pada data lama terisi default.
        expect(screen.getByRole("radio", { name: "Gaussian" })).toBeChecked();
        openTab(/Validation/i);
        expect(screen.getByRole("radio", { name: "Cross-Validation Folds" })).toBeChecked();
        expect(byId("k-folds").value).toBe("7");
        expect(byId("random-seed").value).toBe("42");
    });

    it("BB-36-h OK ditolak (target kosong): tidak ada penyimpanan dan analisis tidak dipanggil", async () => {
        await openMenu();
        openTab(/Validation/i);
        fireEvent.click(screen.getByRole("radio", { name: "Cross-Validation Folds" }));
        fireEvent.change(byId("k-folds"), { target: { value: "5" } });

        expect(okButton()).toBeDisabled();
        fireEvent.click(okButton());
        expect(await readSaved()).toBeNull();
        expect(mockAnalyze).not.toHaveBeenCalled();
    });
});
