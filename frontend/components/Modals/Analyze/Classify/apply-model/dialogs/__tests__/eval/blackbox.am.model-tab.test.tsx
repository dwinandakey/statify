// Track C3 — Black-box BB-29 (berkas bukan model / > 10 MB) dan BB-30 (model dari Output Viewer -> Model Summary),
// tingkat komponen: ModelTab dan kontainer ApplyModelMain (React Testing Library, jsdom).
// Pola mock mengikuti dialogs/__tests__/model-tab.test.tsx dan apply-model-main.test.tsx.

import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Log } from "@/types/Result";
import type { Variable } from "@/types/Variable";
import { ModelTab } from "@/components/Modals/Analyze/Classify/apply-model/dialogs/model-tab";
import ApplyModelMain from "@/components/Modals/Analyze/Classify/apply-model/dialogs/apply-model-main";
import { APPLY_MODEL_MESSAGES } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-codes";
import { ApplyModelModelDefault } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-default";
import type { ModelLoadSuccess } from "@/components/Modals/Analyze/Classify/apply-model/services/model-loader";
import type {
  ApplyModelModelTabType,
  ApplyModelSourceKind,
} from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";
import { clearFormData } from "@/hooks/useIndexedDB";

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

jest.mock("@/hooks/useModal", () => ({ useModal: () => ({ closeModal: jest.fn() }) }));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), promise: jest.fn() },
}));

// jsdom (Jest) tidak menyediakan structuredClone; fake-indexeddb memakainya.
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}

const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;

const TEN_MB = 10 * 1024 * 1024;

function makeFile(name: string, content: string, size?: number): File {
  return {
    name,
    size: size ?? content.length,
    text: async () => content,
  } as unknown as File;
}

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

const d3Variables = (): Variable[] => [
  makeVariable("Outlook", "nominal", "STRING", 0),
  makeVariable("Temp", "scale", "NUMERIC", 1),
  makeVariable("Play", "nominal", "STRING", 2),
];

const onLoaded = jest.fn();

function Harness() {
  const [data, setData] = useState<ApplyModelModelTabType>(ApplyModelModelDefault);
  return (
    <ModelTab
      data={data}
      showFieldHelp={false}
      onModelLoaded={(result: ModelLoadSuccess, kind: ApplyModelSourceKind) => {
        onLoaded(result, kind);
        setData({
          SourceKind: kind,
          SourceRef: result.sourceRef,
          SourceLabel: result.sourceLabel,
          ModelJson: result.model,
        });
      }}
    />
  );
}

function upload(file: File): void {
  fireEvent.change(screen.getByTestId("model-file-input"), { target: { files: [file] } });
}

async function flushHydration(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockStoreState.logs = [];
  mockCurrentVariables = d3Variables();
  await clearFormData("ApplyModel");
});

// ---------------------------------------------------------------------------
// BB-29
// ---------------------------------------------------------------------------

describe("BB-29 Tab Model: berkas bukan model / terlalu besar", () => {
  it("BB-29-UI-a kontrol file hanya menawarkan .json (accept) dan label radio 'Upload file (.json)' terpilih", () => {
    render(<Harness />);
    expect(screen.getByTestId("model-file-input")).toHaveAttribute("accept", ".json,application/json");
    expect(screen.getByRole("radio", { name: "Upload file (.json)" })).toBeChecked();
  });

  it("BB-29-UI-b berkas .txt: pesan AM_E_PARSE tampil, model tidak dipakai (tanpa kartu Model Summary)", async () => {
    render(<Harness />);
    upload(makeFile("catatan.txt", JSON.stringify(nbModelV11)));

    const alert = await screen.findByTestId("model-load-errors");
    expect(alert).toHaveTextContent(APPLY_MODEL_MESSAGES.AM_E_PARSE);
    expect(alert).toHaveTextContent("(AM_E_PARSE)");
    expect(onLoaded).not.toHaveBeenCalled();
    expect(screen.queryByTestId("model-summary-card")).not.toBeInTheDocument();
  });

  it("BB-29-UI-c berkas > 10 MB: pesan AM_E_FILE_TOO_LARGE, model tidak dipakai", async () => {
    render(<Harness />);
    upload(makeFile("besar.json", JSON.stringify(nbModelV11), TEN_MB + 1));

    const alert = await screen.findByTestId("model-load-errors");
    expect(alert).toHaveTextContent("The model file is larger than the 10 MB limit. (AM_E_FILE_TOO_LARGE)");
    expect(onLoaded).not.toHaveBeenCalled();
    expect(screen.queryByTestId("model-summary-card")).not.toBeInTheDocument();
  });

  it("BB-29-UI-d JSON bukan model: [..] -> AM_E_NOT_OBJECT; objek tanpa model_type -> AM_E_MODEL_TYPE_MISSING; model_type asing -> AM_E_MODEL_TYPE_UNSUPPORTED (dengan nama jenis)", async () => {
    render(<Harness />);

    upload(makeFile("array.json", "[1,2,3]"));
    expect(await screen.findByTestId("model-load-errors")).toHaveTextContent("(AM_E_NOT_OBJECT)");

    upload(makeFile("objek.json", '{"foo":1}'));
    await waitFor(() =>
      expect(screen.getByTestId("model-load-errors")).toHaveTextContent("(AM_E_MODEL_TYPE_MISSING)")
    );

    upload(makeFile("svm.json", JSON.stringify({ ...nbModelV11, model_type: "svm" })));
    await waitFor(() =>
      expect(screen.getByTestId("model-load-errors")).toHaveTextContent(
        'The model type "svm" is not supported by Apply Model. (AM_E_MODEL_TYPE_UNSUPPORTED)'
      )
    );
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("BB-29-UI-e berkas yang ditolak tidak menggantikan model valid yang sudah dimuat", async () => {
    render(<Harness />);
    upload(makeFile("nb.json", JSON.stringify(nbModelV11)));
    await screen.findByTestId("model-summary-card");

    upload(makeFile("besar.json", "{}", TEN_MB + 1));
    expect(await screen.findByTestId("model-load-errors")).toHaveTextContent("(AM_E_FILE_TOO_LARGE)");
    expect(screen.getByTestId("model-summary-card")).toBeInTheDocument();
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });

  it("BB-29-UI-f kontainer: setelah berkas ditolak, tab Variables/Save/Output tetap nonaktif dan tombol OK nonaktif", async () => {
    render(<ApplyModelMain onClose={jest.fn()} />);
    await flushHydration();

    upload(makeFile("besar.json", JSON.stringify(nbModelV11), TEN_MB + 1));
    await screen.findByTestId("model-load-errors");

    expect(screen.getByRole("tab", { name: "Variables" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Output" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// BB-30
// ---------------------------------------------------------------------------

function makeResultStoreLogs(): Log[] {
  return [
    {
      id: 1,
      log: "Naive Bayes",
      analytics: [
        {
          id: 1,
          title: "Naive Bayes Result",
          statistics: [
            { id: 3, title: "Case Processing Summary", description: "", components: "Case Processing Summary", output_data: "{}" },
            {
              id: 4,
              title: "Export Model",
              description: "",
              components: "Export Model",
              output_data: JSON.stringify({ naiveBayesTrainedModel: nbModelV11 }),
            },
          ],
        },
      ],
    },
  ] as unknown as Log[];
}

describe("BB-30 Tab Model: model dari Output Viewer -> Model Summary", () => {
  const OPTION_LABEL = "Naive Bayes › Naive Bayes Result — 2026-10-01T00:00:00.000Z";

  it("BB-30-UI-a tanpa model di Output Viewer: tampil pesan AM_W_NO_RESULT_STORE_MODELS (tanpa Select)", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: "From Output Viewer" }));
    expect(await screen.findByText(APPLY_MODEL_MESSAGES.AM_W_NO_RESULT_STORE_MODELS)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Output Viewer model" })).not.toBeInTheDocument();
  });

  it("BB-30-UI-b memilih model dari daftar menampilkan kartu Model Summary lengkap (algoritma, skema, target, kelas, fitur, sumber)", async () => {
    const user = userEvent.setup();
    mockStoreState.logs = makeResultStoreLogs();
    render(<Harness />);

    fireEvent.click(screen.getByRole("radio", { name: "From Output Viewer" }));
    const trigger = await screen.findByRole("combobox", { name: "Output Viewer model" });
    await user.click(trigger);
    // Hanya statistic "Export Model" yang masuk daftar (Case Processing Summary diabaikan).
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(screen.getByRole("option", { name: OPTION_LABEL }));

    const card = await screen.findByTestId("model-summary-card");
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded.mock.calls[0][1]).toBe("resultStore");
    expect(within(card).getByText("Model Summary")).toBeInTheDocument();
    expect(within(card).getByText("Output Viewer: Naive Bayes › Naive Bayes Result (#4)")).toBeInTheDocument();
    expect(within(card).getByText("Naive Bayes")).toBeInTheDocument();
    expect(within(card).getByText("1.1")).toBeInTheDocument();
    expect(within(card).getByText("Play")).toBeInTheDocument();
    expect(within(card).getByText("No, Yes")).toBeInTheDocument();
    expect(within(card).getByText("Outlook")).toBeInTheDocument();
    expect(within(card).getByText("categorical")).toBeInTheDocument();
    expect(within(card).getByText("Temp")).toBeInTheDocument();
    expect(within(card).getByText("numerical")).toBeInTheDocument();
  });

  it("BB-30-UI-c kontainer: model dari Output Viewer mengaktifkan tab lain, memetakan variabel otomatis, dan OK aktif", async () => {
    const user = userEvent.setup();
    mockStoreState.logs = makeResultStoreLogs();
    render(<ApplyModelMain onClose={jest.fn()} />);
    await flushHydration();

    fireEvent.click(screen.getByRole("radio", { name: "From Output Viewer" }));
    await user.click(await screen.findByRole("combobox", { name: "Output Viewer model" }));
    await user.click(screen.getByRole("option", { name: OPTION_LABEL }));

    await screen.findByTestId("model-summary-card");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Variables" })).toBeEnabled());
    expect(screen.getByRole("tab", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Output" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();

    await user.click(screen.getByRole("tab", { name: "Variables" }));
    expect(await screen.findByRole("combobox", { name: "Dataset variable for Outlook" })).toHaveTextContent("Outlook");
    expect(screen.getByRole("combobox", { name: "Dataset variable for Temp" })).toHaveTextContent("Temp");
    expect(screen.getByRole("combobox", { name: "Actual target variable" })).toHaveTextContent("Play");
  });
});
