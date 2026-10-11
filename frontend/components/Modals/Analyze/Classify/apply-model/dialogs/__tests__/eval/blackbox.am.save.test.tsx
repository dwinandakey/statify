// Track C3 — Black-box BB-34 (nama kolom output bentrok -> akhiran otomatis + peringatan), tingkat komponen SaveTab.
// `processVariableName` memakai kode produksi dari stores/useVariableStore.ts (lihat blackbox.am.helpers.ts).

import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Variable } from "@/types/Variable";
import { SaveTab } from "@/components/Modals/Analyze/Classify/apply-model/dialogs/save-tab";
import { naiveBayesModelAdapter } from "@/components/Modals/Analyze/Classify/apply-model/adapters/naive-bayes-adapter";
import { validateAnyModel } from "@/components/Modals/Analyze/Classify/apply-model/adapters/registry";
import type { ModelDescriptor } from "@/components/Modals/Analyze/Classify/apply-model/adapters/types";
import { APPLY_MODEL_MESSAGES } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-codes";
import { ApplyModelSaveDefault } from "@/components/Modals/Analyze/Classify/apply-model/constants/apply-model-default";
import type { ApplyModelSaveTabType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";

jest.mock("@/stores/useResultStore", () => ({
  useResultStore: { getState: jest.fn(() => ({ logs: [], loadResults: jest.fn() })) },
}));
jest.mock("@/stores/useVariableStore", () => {
  const helpers = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/blackbox.am.helpers");
  return {
    useVariableStore: jest.fn(),
    processVariableName: helpers.loadRealProcessVariableName(),
  };
});

const nbModelV11 = require("@/components/Modals/Analyze/Classify/apply-model/services/__fixtures__/nb-model-v1_1.json") as Record<string, unknown>;

function makeVariable(name: string, measure: Variable["measure"], type: Variable["type"], columnIndex: number): Variable {
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

function descriptor(): ModelDescriptor {
  const validation = validateAnyModel(nbModelV11);
  if (!validation.ok) throw new Error("Fixture harus valid");
  return validation.descriptor;
}

function Harness({
  existing,
  initial,
}: {
  existing: Variable[];
  initial?: Partial<ApplyModelSaveTabType>;
}) {
  const [data, setData] = useState<ApplyModelSaveTabType>({
    ...(JSON.parse(JSON.stringify(ApplyModelSaveDefault)) as ApplyModelSaveTabType),
    ...initial,
  });
  return (
    <SaveTab
      data={data}
      descriptor={descriptor()}
      adapter={naiveBayesModelAdapter}
      existingVariables={existing}
      onChange={setData}
      showFieldHelp={false}
    />
  );
}

const d3Existing = (): Variable[] => [
  makeVariable("Outlook", "nominal", "STRING", 0),
  makeVariable("Temp", "scale", "NUMERIC", 1),
  makeVariable("Play", "nominal", "STRING", 2),
];

describe("BB-34 SaveTab: nama kolom output bentrok", () => {
  it("BB-34-UI-a tanpa bentrok: nama akhir = nama default, tanpa ikon dan tanpa banner peringatan", () => {
    render(<Harness existing={d3Existing()} />);
    expect(screen.getByTestId("final-name-predicted")).toHaveTextContent("NB_PredictedValue");
    expect(screen.getByTestId("final-name-maxProbability")).toHaveTextContent("NB_PredictedProbability");
    expect(screen.queryByTestId("name-adjusted-predicted")).not.toBeInTheDocument();
    expect(screen.queryByTestId("save-name-adjusted")).not.toBeInTheDocument();
  });

  it("BB-34-UI-b dataset sudah punya NB_PredictedValue: nama akhir NB_PredictedValue_1, ikon peringatan di baris itu, banner AM_W_NAME_ADJUSTED", () => {
    const existing = [...d3Existing(), makeVariable("NB_PredictedValue", "nominal", "STRING", 3)];
    render(<Harness existing={existing} />);

    expect(screen.getByTestId("final-name-predicted")).toHaveTextContent("NB_PredictedValue_1");
    const icon = screen.getByTestId("name-adjusted-predicted");
    expect(icon).toHaveAttribute("aria-label", APPLY_MODEL_MESSAGES.AM_W_NAME_ADJUSTED);
    expect(screen.getByTestId("save-name-adjusted")).toHaveTextContent(APPLY_MODEL_MESSAGES.AM_W_NAME_ADJUSTED);

    // Baris lain tidak terpengaruh.
    expect(screen.getByTestId("final-name-maxProbability")).toHaveTextContent("NB_PredictedProbability");
    expect(screen.queryByTestId("name-adjusted-maxProbability")).not.toBeInTheDocument();
    // Bentrok dengan variabel yang ada bukan galat validasi.
    expect(screen.queryByTestId("save-name-errors")).not.toBeInTheDocument();
  });

  it("BB-34-UI-c bentrok tidak peka huruf besar/kecil dan berlaku untuk kolom probabilitas per kelas", () => {
    const existing = [
      ...d3Existing(),
      makeVariable("nb_probability_yes", "scale", "NUMERIC", 3),
      makeVariable("NB_Probability_Yes_1", "scale", "NUMERIC", 4),
    ];
    render(<Harness existing={existing} initial={{ SaveClassProbabilities: true }} />);

    expect(screen.getByTestId("final-name-class:No")).toHaveTextContent("NB_Probability_No");
    expect(screen.getByTestId("final-name-class:Yes")).toHaveTextContent("NB_Probability_Yes_2");
    expect(screen.getByTestId("name-adjusted-class:Yes")).toBeInTheDocument();
  });

  it("BB-34-UI-d mengubah Name prefix menghilangkan bentrok: nama akhir berganti dan banner hilang", async () => {
    const existing = [...d3Existing(), makeVariable("NB_PredictedValue", "nominal", "STRING", 3)];
    render(<Harness existing={existing} />);
    expect(screen.getByTestId("save-name-adjusted")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name prefix"), { target: { value: "HASIL" } });
    expect(screen.getByTestId("final-name-predicted")).toHaveTextContent("HASIL_PredictedValue");
    expect(screen.queryByTestId("save-name-adjusted")).not.toBeInTheDocument();
  });

  it("BB-34-UI-e nama kustom sama dengan variabel yang ada: diberi akhiran (peringatan), bukan galat", async () => {
    const user = userEvent.setup();
    // Hanya satu kolom hasil (predicted) supaya tidak ada nama kustom kosong lain (AM_E_NAME_EMPTY).
    render(<Harness existing={d3Existing()} initial={{ SaveMaxProbability: false }} />);
    await user.click(screen.getByRole("checkbox", { name: "Use custom names" }));

    const input = screen.getByLabelText("Custom name for Predicted value");
    fireEvent.change(input, { target: { value: "Play" } });

    expect(screen.getByTestId("final-name-predicted")).toHaveTextContent("Play_1");
    expect(screen.getByTestId("save-name-adjusted")).toBeInTheDocument();
    expect(screen.queryByTestId("save-name-errors")).not.toBeInTheDocument();
  });

  it("BB-34-UI-f dua nama kustom kembar antar-kolom hasil: galat AM_E_NAME_DUPLICATE ditampilkan (tidak di-sufiks otomatis)", async () => {
    const user = userEvent.setup();
    render(<Harness existing={d3Existing()} />);
    await user.click(screen.getByRole("checkbox", { name: "Use custom names" }));

    fireEvent.change(screen.getByLabelText("Custom name for Predicted value"), { target: { value: "Hasil" } });
    fireEvent.change(screen.getByLabelText("Custom name for Predicted probability"), { target: { value: "HASIL" } });

    expect(screen.getByTestId("save-name-errors")).toHaveTextContent(
      'The column name "HASIL" is used more than once among the result columns. (AM_E_NAME_DUPLICATE)'
    );
  });
});
