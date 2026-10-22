// Tur bantuan Apply Model (hooks/tourConfig.ts) — revisi pasca-sidang:
// (1) langkah dwibahasa Indonesia/Inggris dengan jumlah langkah sama;
// (2) tanpa model hanya langkah Tab Model, dengan model seluruh tab;
// (3) tombol Help container memunculkan langkah pertama dan setiap targetId
//     langkah ada di DOM pada tab-nya. Mock mengikuti
//     dialogs/__tests__/apply-model-main.test.tsx.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Log } from "@/types/Result";
import type { Variable } from "@/types/Variable";
import ApplyModelMain from "@/components/Modals/Analyze/Classify/apply-model/dialogs/apply-model-main";
import {
  APPLY_MODEL_TOUR_IDS,
  APPLY_MODEL_TOUR_TABS,
  buildApplyModelTourSteps,
  type ApplyModelTourContext,
} from "@/components/Modals/Analyze/Classify/apply-model/hooks/tourConfig";
import { clearFormData } from "@/hooks/useIndexedDB";
import { useHelpLanguageStore } from "@/stores/useHelpLanguageStore";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockStoreState: { logs: Log[]; loadResults: jest.Mock } = {
  logs: [],
  loadResults: jest.fn(),
};
jest.mock("@/stores/useResultStore", () => ({
  useResultStore: { getState: jest.fn(() => mockStoreState) },
}));

let mockCurrentVariables: Variable[] = [];
jest.mock("@/stores/useVariableStore", () => ({
  useVariableStore: jest.fn((selector: (state: { variables: Variable[] }) => unknown) =>
    selector({ variables: mockCurrentVariables })
  ),
  processVariableName: (name: string, existingVariables: Array<{ name: string }>) => {
    const existingNames = existingVariables.map((v) => v.name.toLowerCase());
    let processedName = name;
    let counter = 1;
    while (existingNames.includes(processedName.toLowerCase())) {
      processedName = `${name}_${counter}`;
      counter++;
    }
    return { isValid: true, processedName };
  },
}));

jest.mock("@/stores/useDataStore", () => ({
  useDataStore: { getState: jest.fn(() => ({ data: [] })) },
}));

jest.mock(
  "@/components/Modals/Analyze/Classify/apply-model/services/apply-model-analysis",
  () => ({ applyModel: jest.fn() })
);

jest.mock("@/hooks/useModal", () => ({
  useModal: () => ({ closeModal: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), promise: jest.fn() },
}));

const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;
const nbModelRaw = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-raw.json") as Record<string, unknown>;

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T,>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeVariable(
  name: string,
  measure: Variable["measure"],
  type: Variable["type"]
): Variable {
  return {
    columnIndex: 0,
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

function makeD3Variables(): Variable[] {
  return [
    makeVariable("Outlook", "nominal", "STRING"),
    makeVariable("Temp", "scale", "NUMERIC"),
    makeVariable("Play", "nominal", "STRING"),
    makeVariable("Text", "nominal", "STRING"),
  ];
}

async function flushHydration(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
}

function upload(name: string, model: Record<string, unknown>): void {
  const file = {
    name,
    size: 100,
    text: async () => JSON.stringify(model),
  } as unknown as File;
  fireEvent.change(screen.getByTestId("model-file-input"), {
    target: { files: [file] },
  });
}

async function renderContainer(model?: { name: string; json: Record<string, unknown> }) {
  render(<ApplyModelMain onClose={jest.fn()} />);
  await flushHydration();
  if (model) {
    upload(model.name, model.json);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Variables" })).toBeEnabled()
    );
  }
}

/**
 * Jalankan tur dari tombol Help sampai selesai; untuk tiap langkah pastikan
 * judul pop-up sesuai, tab yang dibutuhkan aktif, dan elemen targetId ada.
 */
async function walkTour(ctx: ApplyModelTourContext): Promise<void> {
  const steps = buildApplyModelTourSteps(ctx);
  fireEvent.click(screen.getByTestId("apply-model-help-button"));

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await waitFor(() => {
      expect(screen.getByTestId("tour-popup-title")).toHaveTextContent(step.title);
      expect(screen.getByTestId("tour-popup-step-counter")).toHaveTextContent(
        `Step ${i + 1} of ${steps.length}`
      );
      expect(
        screen.getByRole("tab", { selected: true })
      ).toHaveAttribute("id", `apply-model-${step.requiredTab}-tab-trigger`);
      expect(document.getElementById(step.targetId)).not.toBeNull();
    });
    if (i < steps.length - 1) {
      fireEvent.click(screen.getByTestId("tour-popup-next-button"));
    } else {
      fireEvent.click(screen.getByTestId("tour-popup-finish-button"));
    }
  }

  await waitFor(() =>
    expect(screen.queryByTestId("tour-popup-container")).not.toBeInTheDocument()
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockCurrentVariables = makeD3Variables();
  useHelpLanguageStore.setState({ language: "id" });
  await clearFormData("ApplyModel");
});

// ---------------------------------------------------------------------------
// Konfigurasi langkah (fungsi murni)
// ---------------------------------------------------------------------------

const CONTEXTS: Array<Omit<ApplyModelTourContext, "language">> = [
  { hasModel: false, textSource: null },
  { hasModel: true, textSource: null },
  { hasModel: true, textSource: "raw" },
  { hasModel: true, textSource: "vector" },
];

describe("buildApplyModelTourSteps", () => {
  it.each(CONTEXTS)(
    "Indonesia & Inggris punya jumlah langkah dan target yang sama (%o)",
    (ctx) => {
      const id = buildApplyModelTourSteps({ ...ctx, language: "id" });
      const en = buildApplyModelTourSteps({ ...ctx, language: "en" });
      expect(id.length).toBe(en.length);
      expect(id.map((s) => s.targetId)).toEqual(en.map((s) => s.targetId));
      expect(id.map((s) => s.requiredTab)).toEqual(en.map((s) => s.requiredTab));
      id.forEach((step, index) => {
        expect(step.title.trim()).not.toBe("");
        expect(step.content.trim()).not.toBe("");
        expect(en[index].content.trim()).not.toBe("");
        expect(step.content).not.toBe(en[index].content);
      });
    }
  );

  it("tanpa model hanya langkah Tab Model", () => {
    const steps = buildApplyModelTourSteps({
      language: "id",
      hasModel: false,
      textSource: null,
    });
    expect(steps.map((s) => s.targetId)).toEqual([
      APPLY_MODEL_TOUR_IDS.modelTab,
      APPLY_MODEL_TOUR_IDS.sourceSection,
      APPLY_MODEL_TOUR_IDS.sourcePicker,
    ]);
    expect(steps.every((s) => s.requiredTab === APPLY_MODEL_TOUR_TABS.MODEL)).toBe(true);
  });

  it("dengan model mencakup keempat tab; langkah teks hanya bila model punya fitur Text", () => {
    const plain = buildApplyModelTourSteps({
      language: "en",
      hasModel: true,
      textSource: null,
    });
    expect(new Set(plain.map((s) => s.requiredTab))).toEqual(
      new Set(Object.values(APPLY_MODEL_TOUR_TABS))
    );
    expect(plain.some((s) => s.targetId === APPLY_MODEL_TOUR_IDS.textSection)).toBe(false);
    expect(plain.some((s) => s.targetId === APPLY_MODEL_TOUR_IDS.summaryCard)).toBe(true);

    const raw = buildApplyModelTourSteps({ language: "en", hasModel: true, textSource: "raw" });
    const vector = buildApplyModelTourSteps({ language: "en", hasModel: true, textSource: "vector" });
    expect(raw.length).toBe(plain.length + 1);
    expect(vector.length).toBe(plain.length + 1);
    expect(raw.find((s) => s.targetId === APPLY_MODEL_TOUR_IDS.textSection)?.title).toMatch(/Raw Text/);
    expect(vector.find((s) => s.targetId === APPLY_MODEL_TOUR_IDS.textSection)?.title).toMatch(/Word-Vector/);
  });

  it("teks tur tidak menyebut produk lain", () => {
    for (const ctx of CONTEXTS) {
      for (const language of ["id", "en"] as const) {
        for (const step of buildApplyModelTourSteps({ ...ctx, language })) {
          expect(`${step.title} ${step.content}`).not.toMatch(/weka|scikit|sklearn/i);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Container: tombol Help memulai tur
// ---------------------------------------------------------------------------

describe("ApplyModelMain — tur bantuan", () => {
  it("tombol Help menampilkan langkah pertama (bahasa Indonesia bawaan)", async () => {
    await renderContainer();
    fireEvent.click(screen.getByRole("button", { name: "Start feature tour" }));

    expect(await screen.findByTestId("tour-popup-container")).toBeInTheDocument();
    expect(screen.getByTestId("tour-popup-title")).toHaveTextContent("Tab Model");
    expect(screen.getByTestId("tour-popup-step-counter")).toHaveTextContent("Step 1 of 3");
  });

  it("mengikuti bahasa bantuan Inggris", async () => {
    useHelpLanguageStore.setState({ language: "en" });
    await renderContainer();
    fireEvent.click(screen.getByTestId("apply-model-help-button"));
    expect(await screen.findByTestId("tour-popup-title")).toHaveTextContent("Model Tab");
  });

  it("tanpa model: hanya langkah Tab Model dan setiap target ada", async () => {
    await renderContainer();
    await walkTour({ language: "id", hasModel: false, textSource: null });
  });

  it("dengan model (v1.1): seluruh tab, setiap target ada pada tab-nya", async () => {
    await renderContainer({ name: "nb-model-v1_1.json", json: nbModelV11 });
    await walkTour({ language: "id", hasModel: true, textSource: null });
  });

  it("dengan model teks mentah (v2.0 raw): langkah Raw Text Variable ikut, bahasa Inggris", async () => {
    useHelpLanguageStore.setState({ language: "en" });
    await renderContainer({ name: "nb-model-v2_0-raw.json", json: nbModelRaw });
    await walkTour({ language: "en", hasModel: true, textSource: "raw" });
  });
});
