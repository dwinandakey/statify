// Track C3 — Black-box BB-31 (tombol "Auto-map by name") dan BB-32 (variabel teks model tidak ada ->
// pemetaan belum lengkap, OK nonaktif), tingkat komponen: VariablesTab dan kontainer ApplyModelMain.
// Pola mock mengikuti dialogs/__tests__/variables-tab-v2.test.tsx dan apply-model-main.test.tsx.

import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Variable } from "@/types/Variable";
import { VariablesTab } from "@/components/Modals/Analyze/Classify/apply-model/dialogs/variables-tab";
import ApplyModelMain from "@/components/Modals/Analyze/Classify/apply-model/dialogs/apply-model-main";
import { validateAnyModel } from "@/components/Modals/Analyze/Classify/apply-model/adapters/registry";
import type { ModelDescriptor } from "@/components/Modals/Analyze/Classify/apply-model/adapters/types";
import type { ApplyModelVariablesTabType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";
import { clearFormData } from "@/hooks/useIndexedDB";

jest.mock("@/stores/useResultStore", () => ({
  useResultStore: { getState: jest.fn(() => ({ logs: [], loadResults: jest.fn() })) },
}));

let mockCurrentVariables: Variable[] = [];
jest.mock("@/stores/useVariableStore", () => {
  const helpers = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/blackbox.am.helpers");
  return {
    useVariableStore: jest.fn((selector: (state: { variables: Variable[] }) => unknown) =>
      selector({ variables: mockCurrentVariables })
    ),
    processVariableName: helpers.loadRealProcessVariableName(),
  };
});

jest.mock("@/stores/useDataStore", () => ({
  useDataStore: { getState: jest.fn(() => ({ data: [] })) },
}));

jest.mock(
  "@/components/Modals/Analyze/Classify/apply-model/services/apply-model-analysis",
  () => ({ applyModel: jest.fn() })
);

jest.mock("@/hooks/useModal", () => ({ useModal: () => ({ closeModal: jest.fn() }) }));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), promise: jest.fn() },
}));

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}

const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;
const nbModelRaw = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-raw.json") as Record<string, unknown>;
const nbModelVector = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v2_0-vector.json") as Record<string, unknown>;

function makeVariable(name: string, measure: Variable["measure"], type: Variable["type"], columnIndex = 0): Variable {
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

function descriptorOf(model: Record<string, unknown>): ModelDescriptor {
  const validation = validateAnyModel(model);
  if (!validation.ok) throw new Error("Fixture harus valid");
  return validation.descriptor;
}

function Harness({
  descriptor,
  variables,
  initial,
  spy,
}: {
  descriptor: ModelDescriptor;
  variables: Variable[];
  initial: ApplyModelVariablesTabType;
  spy?: (next: ApplyModelVariablesTabType) => void;
}) {
  const [data, setData] = useState<ApplyModelVariablesTabType>(initial);
  return (
    <VariablesTab
      data={data}
      descriptor={descriptor}
      variables={variables}
      onChange={(next) => {
        spy?.(next);
        setData(next);
      }}
      showFieldHelp={false}
    />
  );
}

const d3Variables = (): Variable[] => [
  makeVariable("Outlook", "nominal", "STRING", 0),
  makeVariable("Temp", "scale", "NUMERIC", 1),
  makeVariable("Play", "nominal", "STRING", 2),
];

function upload(model: Record<string, unknown>, name = "model.json"): void {
  const content = JSON.stringify(model);
  const file = { name, size: content.length, text: async () => content } as unknown as File;
  fireEvent.change(screen.getByTestId("model-file-input"), { target: { files: [file] } });
}

async function flushHydration(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockCurrentVariables = d3Variables();
  await clearFormData("ApplyModel");
});

// ---------------------------------------------------------------------------
// BB-31
// ---------------------------------------------------------------------------

describe("BB-31 tombol Auto-map by name (VariablesTab)", () => {
  const unmapped: ApplyModelVariablesTabType = {
    FeatureMapping: { Outlook: null, Temp: null },
    ActualTargetVar: null,
  };

  it("BB-31-UI-a pemetaan kosong: kedua baris menampilkan galat AM_E_MAP_UNMAPPED; setelah klik Auto-map semua fitur terpetakan dan berstatus valid", async () => {
    const user = userEvent.setup();
    const spy = jest.fn();
    render(<Harness descriptor={descriptorOf(nbModelV11)} variables={d3Variables()} initial={unmapped} spy={spy} />);

    expect(screen.getByTestId("mapping-status-Outlook")).toHaveTextContent(
      'Feature "Outlook" is not mapped to a dataset variable. (AM_E_MAP_UNMAPPED)'
    );
    expect(screen.getByTestId("mapping-status-Temp")).toHaveTextContent("(AM_E_MAP_UNMAPPED)");

    await user.click(screen.getByRole("button", { name: "Auto-map by name" }));

    expect(spy).toHaveBeenLastCalledWith({
      FeatureMapping: { Outlook: "Outlook", Temp: "Temp" },
      ActualTargetVar: "Play",
    });
    expect(screen.getByRole("combobox", { name: "Dataset variable for Outlook" })).toHaveTextContent("Outlook");
    expect(screen.getByRole("combobox", { name: "Dataset variable for Temp" })).toHaveTextContent("Temp");
    expect(screen.getByRole("combobox", { name: "Actual target variable" })).toHaveTextContent("Play");
    expect(screen.getByTestId("mapping-status-Outlook")).toHaveTextContent("✓");
    expect(screen.getByTestId("mapping-status-Temp")).toHaveTextContent("✓");
    expect(screen.queryByTestId("actual-target-errors")).not.toBeInTheDocument();
  });

  it("BB-31-UI-b Auto-map menimpa pilihan manual yang salah (Outlook -> Play diganti kembali ke Outlook)", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        descriptor={descriptorOf(nbModelV11)}
        variables={d3Variables()}
        initial={{ FeatureMapping: { Outlook: "Play", Temp: "Temp" }, ActualTargetVar: null }}
      />
    );
    expect(screen.getByRole("combobox", { name: "Dataset variable for Outlook" })).toHaveTextContent("Play");

    await user.click(screen.getByRole("button", { name: "Auto-map by name" }));
    expect(screen.getByRole("combobox", { name: "Dataset variable for Outlook" })).toHaveTextContent("Outlook");
  });

  it("BB-31-UI-c nama dataset berbeda huruf (outlook, TEMP): tetap terpetakan; nama yang ambigu dibiarkan 'Not mapped'", async () => {
    const user = userEvent.setup();
    const variables = [
      makeVariable("outlook", "nominal", "STRING", 0),
      makeVariable("OUTLOOK", "nominal", "STRING", 1),
      makeVariable("TEMP", "scale", "NUMERIC", 2),
    ];
    render(<Harness descriptor={descriptorOf(nbModelV11)} variables={variables} initial={unmapped} />);

    await user.click(screen.getByRole("button", { name: "Auto-map by name" }));
    expect(screen.getByRole("combobox", { name: "Dataset variable for Temp" })).toHaveTextContent("TEMP");
    // Dua kandidat "outlook"/"OUTLOOK" -> tidak ditebak.
    expect(screen.getByRole("combobox", { name: "Dataset variable for Outlook" })).toHaveTextContent("— Not mapped —");
    expect(screen.getByTestId("mapping-status-Outlook")).toHaveTextContent("(AM_E_MAP_UNMAPPED)");
  });

  it("BB-31-UI-d fitur numerik yang namanya cocok tetapi measure-nya nominal: terpetakan lalu ditandai AM_E_MAP_ROLE_MISMATCH", async () => {
    const user = userEvent.setup();
    const variables = [
      makeVariable("Outlook", "nominal", "STRING", 0),
      makeVariable("Temp", "nominal", "NUMERIC", 1),
    ];
    render(<Harness descriptor={descriptorOf(nbModelV11)} variables={variables} initial={unmapped} />);
    await user.click(screen.getByRole("button", { name: "Auto-map by name" }));

    expect(screen.getByTestId("mapping-status-Temp")).toHaveTextContent(
      'Feature "Temp" does not match the measurement level of the selected variable. (AM_E_MAP_ROLE_MISMATCH)'
    );
    expect(screen.getByTestId("mapping-status-Outlook")).toHaveTextContent("✓");
  });

  it("BB-31-UI-e model Word-Vector: Auto-map menampilkan ringkasan '3 of 5 vector columns found; 2 treated as 0.'", async () => {
    const user = userEvent.setup();
    const variables = [
      makeVariable("VEC_makan", "scale", "NUMERIC", 0),
      makeVariable("VEC_nasi", "scale", "NUMERIC", 1),
      makeVariable("VEC_saya", "scale", "NUMERIC", 2),
      makeVariable("Sentimen", "nominal", "STRING", 3),
    ];
    render(
      <Harness
        descriptor={descriptorOf(nbModelVector)}
        variables={variables}
        initial={{ FeatureMapping: {}, ActualTargetVar: null, RawTextVar: null, VectorMapping: {} }}
      />
    );
    expect(screen.getByTestId("vector-mapping-summary")).toHaveTextContent("0 of 5 vector columns found; 5 treated as 0.");

    await user.click(screen.getByRole("button", { name: "Auto-map by name" }));
    expect(screen.getByTestId("vector-mapping-summary")).toHaveTextContent("3 of 5 vector columns found; 2 treated as 0.");
    expect(screen.getByRole("combobox", { name: "Actual target variable" })).toHaveTextContent("Sentimen");
  });

  it("BB-31-UI-f kontainer: memuat model D1 langsung mengisi pemetaan (auto-map saat model dimuat), tanpa klik tombol", async () => {
    const user = userEvent.setup();
    render(<ApplyModelMain onClose={jest.fn()} />);
    await flushHydration();
    upload(nbModelV11, "nb-model-v1_1.json");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Variables" })).toBeEnabled());

    await user.click(screen.getByRole("tab", { name: "Variables" }));
    expect(await screen.findByRole("combobox", { name: "Dataset variable for Outlook" })).toHaveTextContent("Outlook");
    expect(screen.getByRole("combobox", { name: "Dataset variable for Temp" })).toHaveTextContent("Temp");
    expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// BB-32
// ---------------------------------------------------------------------------

describe("BB-32 variabel teks model tidak ada di dataset", () => {
  const rawNoMatch: Variable[] = [
    makeVariable("Catatan", "nominal", "STRING", 0),
    makeVariable("Sentimen", "nominal", "STRING", 1),
  ];

  it("BB-32-UI-a VariablesTab: Raw Text Variable 'Not mapped' menampilkan AM_E_MAP_RAW_TEXT_UNMAPPED dengan nama variabel model ('Teks')", () => {
    render(
      <Harness
        descriptor={descriptorOf(nbModelRaw)}
        variables={rawNoMatch}
        initial={{ FeatureMapping: {}, ActualTargetVar: "Sentimen", RawTextVar: null, VectorMapping: {} }}
      />
    );
    expect(screen.getByRole("combobox", { name: "Raw text variable" })).toHaveTextContent("— Not mapped —");
    expect(screen.getByTestId("raw-text-errors")).toHaveTextContent(
      'The raw text variable "Teks" is not mapped to a dataset variable. (AM_E_MAP_RAW_TEXT_UNMAPPED)'
    );
  });

  it("BB-32-UI-b Auto-map tidak menemukan 'Teks' -> galat tetap ada; memilih variabel STRING lain menghilangkannya", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        descriptor={descriptorOf(nbModelRaw)}
        variables={rawNoMatch}
        initial={{ FeatureMapping: {}, ActualTargetVar: null, RawTextVar: null, VectorMapping: {} }}
      />
    );
    await user.click(screen.getByRole("button", { name: "Auto-map by name" }));
    expect(screen.getByTestId("raw-text-errors")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Raw text variable" }));
    await user.click(screen.getByRole("option", { name: "Catatan" }));
    expect(screen.queryByTestId("raw-text-errors")).not.toBeInTheDocument();
  });

  it("BB-32-UI-c kontainer: model Raw Text dimuat ke dataset tanpa variabel 'Teks' -> tombol OK nonaktif; setelah variabel dipilih -> OK aktif", async () => {
    const user = userEvent.setup();
    mockCurrentVariables = rawNoMatch;
    render(<ApplyModelMain onClose={jest.fn()} />);
    await flushHydration();
    upload(nbModelRaw, "nb-raw.json");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Variables" })).toBeEnabled());

    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();

    await user.click(screen.getByRole("tab", { name: "Variables" }));
    const errors = await screen.findByTestId("raw-text-errors");
    expect(within(errors).getByText(/\(AM_E_MAP_RAW_TEXT_UNMAPPED\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Raw text variable" }));
    await user.click(screen.getByRole("option", { name: "Catatan" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "OK" })).toBeEnabled());
  });

  it("BB-32-UI-d kontainer: model fitur biasa (D1) dimuat ke dataset tanpa 'Temp' -> OK nonaktif dan baris Temp berstatus AM_E_MAP_UNMAPPED", async () => {
    const user = userEvent.setup();
    mockCurrentVariables = [makeVariable("Outlook", "nominal", "STRING", 0), makeVariable("Play", "nominal", "STRING", 1)];
    render(<ApplyModelMain onClose={jest.fn()} />);
    await flushHydration();
    upload(nbModelV11, "nb-model-v1_1.json");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Variables" })).toBeEnabled());

    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    await user.click(screen.getByRole("tab", { name: "Variables" }));
    expect(await screen.findByTestId("mapping-status-Temp")).toHaveTextContent("(AM_E_MAP_UNMAPPED)");
    expect(screen.getByTestId("mapping-status-Outlook")).toHaveTextContent("✓");
  });
});
