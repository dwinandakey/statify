/**
 * Tur bantuan interaktif menu Naive Bayes (hooks/tourConfig.ts + tombol bantuan di container).
 *
 * - Kedua bahasa memiliki jumlah langkah, target, dan tab yang sama.
 * - Tombol bantuan di footer memulai tur (judul langkah pertama tampil).
 * - Setiap langkah: elemen `targetId` ada di DOM ketika tur berada di tab `requiredTab`
 *   (tur sendiri yang memindah tab). Langkah Text Preprocessing hanya ada bila
 *   Raw Text Variable terisi.
 *
 * Mock batas luar sama dengan blackbox.nb.container.test.tsx.
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import NaiveBayesContainer from "@/components/Modals/Analyze/Classify/naive-bayes/dialogs/naive-bayes-main";
import {
    baseTourStepsEn,
    baseTourStepsId,
    getNaiveBayesTourSteps,
    TABS,
    type TourStep,
} from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/tourConfig";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";
import type { Variable, VariableMeasure, VariableType } from "@/types/Variable";

const mockStoreState: { variables: Variable[]; data: unknown[][] } = { variables: [], data: [] };

jest.mock("@/stores/useVariableStore", () => ({
    useVariableStore: (selector: (state: { variables: Variable[] }) => unknown) =>
        selector({ variables: mockStoreState.variables }),
}));
jest.mock("@/stores/useDataStore", () => ({
    useDataStore: (selector: (state: { data: unknown[][] }) => unknown) =>
        selector({ data: mockStoreState.data }),
}));
jest.mock("@/hooks/useModal", () => ({
    useModal: () => ({ closeModal: jest.fn() }),
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
    analyzeNaiveBayes: jest.fn(),
}));

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
];

const DATA: unknown[][] = [
    [1, "pos", "Bandung", 20, "makan nasi enak"],
    [2, "neg", "Jakarta", 31, "tidak suka makan"],
    [3, "pos", "Bandung", 25, "nasi enak sekali"],
    [4, "neg", "Jakarta", 40, "tidak enak"],
];

const renderContainer = async () => {
    render(<NaiveBayesContainer onClose={jest.fn()} />);
    await screen.findByRole("tab", { name: /Variables/i });
};

const helpButton = () => screen.getByRole("button", { name: /start feature tour/i });

/** Jalankan seluruh tur: setiap langkah harus menampilkan judulnya dan target harus ada di DOM. */
async function walkTour(expected: TourStep[]) {
    fireEvent.click(helpButton());
    for (let i = 0; i < expected.length; i++) {
        const step = expected[i];
        await waitFor(() => expect(screen.getByTestId("tour-popup-title")).toHaveTextContent(step.title));
        expect(screen.getByTestId("tour-popup-step-counter")).toHaveTextContent(
            `Step ${i + 1} of ${expected.length}`
        );
        await waitFor(() => {
            const target = document.getElementById(step.targetId);
            if (!target) throw new Error(`Step ${i + 1} (${step.title}): #${step.targetId} not found`);
        });
        if (step.requiredTab) {
            const tab = screen.getByRole("tab", { selected: true });
            expect(tab).toHaveAttribute("data-state", "active");
            expect(tab).toHaveAttribute("id", `naive-bayes-${step.requiredTab}-tab-trigger`);
        }
        if (i < expected.length - 1) {
            fireEvent.click(screen.getByTestId("tour-popup-next-button"));
        } else {
            fireEvent.click(screen.getByTestId("tour-popup-finish-button"));
        }
    }
    await waitFor(() => expect(screen.queryByTestId("tour-popup-title")).not.toBeInTheDocument());
}

beforeEach(() => {
    mockStoreState.variables = VARIABLES;
    mockStoreState.data = DATA;
    act(() => {
        useHelpLanguageStore.setState({ language: "id" });
    });
});

describe("tourConfig Naive Bayes", () => {
    it("bahasa Indonesia dan Inggris memiliki langkah yang sejajar (jumlah, target, tab)", () => {
        expect(baseTourStepsId.length).toBe(baseTourStepsEn.length);
        expect(baseTourStepsId.length).toBeGreaterThan(5);
        baseTourStepsId.forEach((step, i) => {
            expect(step.targetId).toBe(baseTourStepsEn[i].targetId);
            expect(step.requiredTab).toBe(baseTourStepsEn[i].requiredTab);
            expect(step.title.length).toBeGreaterThan(0);
            expect(step.content.length).toBeGreaterThan(0);
            expect(baseTourStepsEn[i].content.length).toBeGreaterThan(0);
        });
    });

    it("tanpa Raw Text Variable, langkah tab Text Preprocessing dilewati", () => {
        for (const language of ["id", "en"] as const) {
            const withText = getNaiveBayesTourSteps(language, { hasRawText: true });
            const withoutText = getNaiveBayesTourSteps(language, { hasRawText: false });
            expect(withoutText.some((s) => s.requiredTab === TABS.TEXT)).toBe(false);
            expect(withText.some((s) => s.requiredTab === TABS.TEXT)).toBe(true);
            expect(withoutText.length).toBe(withText.filter((s) => s.requiredTab !== TABS.TEXT).length);
        }
    });

    it("setiap tab punya satu langkah pemicu tab", () => {
        const tabSteps = baseTourStepsEn.filter((s) => s.targetId.endsWith("-tab-trigger"));
        expect(tabSteps.map((s) => s.requiredTab)).toEqual([
            TABS.VARIABLES,
            TABS.TEXT,
            TABS.OPTIONS,
            TABS.VALIDATION,
            TABS.OUTPUT,
        ]);
    });

    it("tidak menyebut nama produk lain", () => {
        const text = [...baseTourStepsId, ...baseTourStepsEn]
            .map((s) => `${s.title} ${s.content}`)
            .join(" ");
        expect(text).not.toMatch(/weka|scikit|sklearn/i);
    });
});

describe("tombol bantuan container Naive Bayes", () => {
    it("klik tombol bantuan menampilkan judul langkah pertama (Indonesia)", async () => {
        await renderContainer();
        fireEvent.click(helpButton());
        expect(await screen.findByTestId("tour-popup-title")).toHaveTextContent(
            getNaiveBayesTourSteps("id")[0].title
        );
    });

    it("mengikuti bahasa bantuan (Inggris)", async () => {
        act(() => {
            useHelpLanguageStore.setState({ language: "en" });
        });
        await renderContainer();
        fireEvent.click(helpButton());
        expect(await screen.findByTestId("tour-popup-title")).toHaveTextContent("Variables Tab");
    });

    it("tanpa Raw Text: setiap target langkah ada di tab yang diminta", async () => {
        await renderContainer();
        await walkTour(getNaiveBayesTourSteps("id", { hasRawText: false }));
    });

    it("dengan Raw Text: langkah Text Preprocessing ikut dan targetnya ada", async () => {
        act(() => {
            useHelpLanguageStore.setState({ language: "en" });
        });
        await renderContainer();
        fireEvent.click(screen.getByTestId("nb-available-item-Teks"));
        fireEvent.click(screen.getByTestId("nb-move-to-rawText"));
        expect(screen.getByTestId("nb-zone-item-rawText-Teks")).toBeInTheDocument();
        await walkTour(getNaiveBayesTourSteps("en", { hasRawText: true }));
    });
});
