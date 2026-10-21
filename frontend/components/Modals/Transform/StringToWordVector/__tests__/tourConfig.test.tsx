// Tur bantuan interaktif STWV: konfigurasi langkah dwibahasa dan keberadaan target di dialog.
//
// Mocking store mengikuti __tests__/eval/blackbox.stwv.modal.test.tsx (hook asli dimuat lewat
// helpers/loadStwvHook karena `import.meta.url`).

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Variable } from "@/types/Variable";
import StringToWordVectorModal from "../StringToWordVectorModal";
import { STWV_TOUR_IDS, getStwvTourSteps } from "../hooks/tourConfig";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

jest.mock("../hooks/useStringToWordVector", () => require("./eval/helpers/loadStwvHook").loadStwvHook());

let mockVariables: Variable[] = [];

jest.mock("@/stores/useVariableStore", () => {
    const state = () => ({
        variables: mockVariables,
        registerVariableMetadata: async () => undefined,
        loadVariables: async () => undefined,
    });
    const hook = Object.assign((selector: (s: ReturnType<typeof state>) => unknown) => selector(state()), {
        getState: state,
    });
    return {
        useVariableStore: hook,
        processVariableName: (name: string) => ({ isValid: true, processedName: name }),
    };
});

jest.mock("@/stores/useDataStore", () => {
    const state = () => ({
        getVariableData: async () => ({ data: [] }),
        checkAndSave: async () => undefined,
        addVariableColumns: async () => ({ startColumnIndex: 0 }),
    });
    const hook = Object.assign((selector: (s: ReturnType<typeof state>) => unknown) => selector(state()), {
        getState: state,
    });
    return { useDataStore: hook };
});

jest.mock("@/stores/useResultStore", () => ({
    useResultStore: { getState: () => ({ addLog: jest.fn(), addAnalytic: jest.fn(), addStatistic: jest.fn() }) },
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

const mkVar = (v: Partial<Variable> & { name: string; columnIndex: number }): Variable =>
    ({
        type: "STRING",
        width: 8,
        decimals: 0,
        label: "",
        values: [],
        missing: null,
        columns: 64,
        align: "left",
        measure: "nominal",
        role: "input",
        ...v,
    }) as unknown as Variable;

beforeEach(() => {
    mockVariables = [mkVar({ id: 1, columnIndex: 0, name: "teks" })];
    act(() => useHelpLanguageStore.getState().setLanguage("id"));
});

describe("getStwvTourSteps", () => {
    const idSteps = getStwvTourSteps("id");
    const enSteps = getStwvTourSteps("en");

    it("has the same steps in Indonesian and English", () => {
        expect(idSteps.length).toBeGreaterThan(0);
        expect(enSteps).toHaveLength(idSteps.length);
        idSteps.forEach((step, i) => {
            expect(enSteps[i].targetId).toBe(step.targetId);
            expect(enSteps[i].requiredTab).toBe(step.requiredTab);
            expect(step.content.length).toBeGreaterThan(0);
            expect(enSteps[i].content.length).toBeGreaterThan(0);
        });
        expect(enSteps.map((s) => s.content)).not.toEqual(idSteps.map((s) => s.content));
    });

    it("covers every tour target id and never mentions other products", () => {
        const targets = new Set(idSteps.map((s) => s.targetId));
        Object.values(STWV_TOUR_IDS).forEach((id) => expect(targets.has(id)).toBe(true));
        [...idSteps, ...enSteps].forEach((s) => {
            expect(`${s.title} ${s.content}`).not.toMatch(/weka|scikit|sklearn/i);
        });
    });

    it("sets forceChangeTab on the step before a tab change", () => {
        idSteps.forEach((step, i) => {
            const next = idSteps[i + 1];
            if (next && next.requiredTab !== step.requiredTab) {
                expect(step.forceChangeTab).toBe(true);
            }
        });
    });
});

describe("STWV dialog tour", () => {
    const renderModal = () => render(<StringToWordVectorModal onClose={jest.fn()} containerType="sidebar" />);

    it("renders every step target on its required tab", async () => {
        renderModal();
        const steps = getStwvTourSteps("en");
        for (const tab of ["variables", "options"] as const) {
            await userEvent.click(screen.getByRole("tab", { name: tab === "variables" ? "Variables" : "Options" }));
            steps
                .filter((s) => s.requiredTab === tab)
                .forEach((s) => expect(document.getElementById(s.targetId)).not.toBeNull());
        }
    });

    it("shows the first step when the help button is clicked, in the help language", async () => {
        act(() => useHelpLanguageStore.getState().setLanguage("en"));
        renderModal();
        await userEvent.click(screen.getByTestId("stwv-help-button"));
        const first = getStwvTourSteps("en")[0];
        expect(await screen.findByTestId("tour-popup-title")).toHaveTextContent(first.title);
        expect(screen.getByTestId("tour-popup-description")).toHaveTextContent(first.content);
    });

    it("switches to the Options tab when the tour reaches an Options step", async () => {
        renderModal();
        await userEvent.click(screen.getByTestId("stwv-help-button"));
        const steps = getStwvTourSteps("id");
        const firstOptions = steps.findIndex((s) => s.requiredTab === "options");
        const target = firstOptions + 1;
        for (let i = 0; i < target; i++) {
            // Klik Next hanya setelah langkah ke-i selesai dirender (judul, target, dan tab aktif);
            // perpindahan tab memicu render ulang tertunda sehingga klik yang terlalu cepat bisa hilang.
            await waitFor(
                () => {
                    expect(screen.getByTestId("tour-popup-title")).toHaveTextContent(steps[i].title);
                    expect(document.getElementById(steps[i].targetId)).not.toBeNull();
                    expect(screen.getByRole("tab", { selected: true })).toHaveAttribute(
                        "id",
                        `stwv-${steps[i].requiredTab}-tab-trigger`
                    );
                },
                { timeout: 5000 }
            );
            fireEvent.click(screen.getByTestId("tour-popup-next-button"));
            await waitFor(
                () => expect(screen.getByTestId("tour-popup-step-counter")).toHaveTextContent(`Step ${i + 2} of`),
                { timeout: 5000 }
            );
        }
        expect(screen.getByTestId("tour-popup-title")).toHaveTextContent(steps[target].title);
        await waitFor(
            () => expect(screen.getByRole("tab", { name: "Options" })).toHaveAttribute("data-state", "active"),
            { timeout: 5000 }
        );
        expect(document.getElementById(steps[target].targetId)).not.toBeNull();
    });
});
