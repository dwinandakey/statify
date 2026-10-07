// Track F — IT-01 (sisi antarmuka): kolom VEC_ hasil String to Word Vector (wasm STWV nyata, penamaan kolom oleh
// processVariableName ASLI) dipindahkan ke "Word-Vector Variables" pada tab Variables Naive Bayes; peringatan kebocoran
// (W-LEAK) tampil dan jumlah variabel pada zona = jumlah kolom VEC_ yang diseleksi.
// Lingkungan jsdom (default config) karena komponen React dirender dengan React Testing Library.
import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import VariablesTab from "../../variables-tab";
import type { NaiveBayesMainType } from "@/components/Modals/Analyze/Classify/naive-bayes/types/naive-bayes";
import { WARNING_LEAKAGE } from "@/components/Modals/Analyze/Classify/naive-bayes/hooks/useNaiveBayesTextRules";
import { buildColumnData } from "@/components/Modals/Transform/StringToWordVector/utils/buildColumnData";
import { DEFAULT_COLUMN_PREFIX } from "@/components/Modals/Transform/StringToWordVector/utils/columnPrefix";
import { STWV_DEFAULT_CONFIG, toRustConfig } from "@/components/Modals/Transform/StringToWordVector/config";
import type { Variable } from "@/types/Variable";
import {
  PILKADA, loadWasm, makeVariables, pilkadaAvailable, pilkadaOverrides, readCsv, wasmAvailable,
} from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.helpers";
import { realProcessVariableName } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/thesis/integration.mocks";

// Data dataset untuk peringatan W-VEC/W-STR (dibaca komponen lewat useDataStore).
let mockData: unknown[][] = [];
jest.mock("@/stores/useDataStore", () => ({
  useDataStore: (selector: (state: { data: unknown[][] }) => unknown) => selector({ data: mockData }),
}));

const ready = wasmAvailable(["stwv"]) && pilkadaAvailable();
const describeIf = ready ? describe : describe.skip;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn("[integration.it01.ui] wasm STWV atau pilkada_*.csv tidak ditemukan: berkas dilewati.");
}

const BASE_MAIN: NaiveBayesMainType = {
  TargetVar: PILKADA.labelCol,
  SpecificationMode: "exclude",
  ExcludedVar: [...PILKADA.excluded, PILKADA.textCol],
  CandidateFactors: [],
  CandidateCovariates: [],
  TextSource: "none",
  RawTextVar: null,
  TextVectorVars: null,
};

function Harness({ variables }: { variables: Variable[] }) {
  const [main, setMain] = useState<NaiveBayesMainType>(BASE_MAIN);
  return (
    <>
      <VariablesTab allVariables={variables} formData={main} onChange={(update) => setMain((prev) => ({ ...prev, ...update }))} />
      <pre data-testid="state">{JSON.stringify(main)}</pre>
    </>
  );
}
const readState = (): NaiveBayesMainType => JSON.parse(screen.getByTestId("state").textContent ?? "{}") as NaiveBayesMainType;

describeIf("IT-01 (UI) STWV -> tab Variables Naive Bayes: Word-Vector Variables dan peringatan kebocoran", () => {
  const train = readCsv(PILKADA.train());
  const tcol = train.header.indexOf(PILKADA.textCol);
  let variables: Variable[] = [];
  let vecNames: string[] = [];
  let prefixed: string[] = [];

  beforeAll(() => {
    const out = loadWasm("stwv").process_text_data(train.rows.map((r) => r[tcol] ?? ""), toRustConfig(STWV_DEFAULT_CONFIG)) as never;
    const existing = train.header.map((name, columnIndex) => ({ name, columnIndex }) as Variable);
    const columns = buildColumnData(out, (baseName, claimed) => {
      const stubs = claimed.map((name) => ({ name, columnIndex: 999 }) as unknown as Variable);
      return realProcessVariableName(baseName, [...existing, ...stubs]).processedName;
    }, DEFAULT_COLUMN_PREFIX);
    vecNames = columns.map((c) => c.variable_name);
    prefixed = vecNames.filter((n) => n.includes("VEC_"));
    const header = [...train.header, ...vecNames];
    const rows = train.rows.map((r, i) => [...r, ...columns.map((c) => String(c.values[i]))]);
    variables = makeVariables(header, rows, pilkadaOverrides());
    mockData = rows;
  }, 120000);

  it("IT-01-h filter 'VEC_' + Select All + panah: seluruh kolom VEC_ pindah ke Word-Vector Variables, peringatan W-LEAK tampil, TextSource = vector", () => {
    render(<Harness variables={variables} />);
    expect(vecNames.length).toBe(1000);
    // sebelum dipindah: tidak ada peringatan kebocoran
    expect(screen.queryByText(WARNING_LEAKAGE)).toBeNull();

    fireEvent.change(screen.getByTestId("nb-variable-filter"), { target: { value: "VEC_" } });
    fireEvent.click(screen.getByTestId("nb-select-all-filtered"));
    const shown = within(screen.getByTestId("nb-available-list")).queryAllByRole("option");
    expect(shown).toHaveLength(prefixed.length);
    fireEvent.click(screen.getByTestId("nb-move-to-wordVector"));

    const state = readState();
    expect(state.TextSource).toBe("vector");
    expect(state.RawTextVar).toBeNull();
    expect(state.TextVectorVars).toHaveLength(prefixed.length);
    expect(new Set(state.TextVectorVars)).toEqual(new Set(prefixed));
    const inZone = within(screen.getByTestId("nb-zone-list-wordVector")).queryAllByRole("option");
    expect(inZone).toHaveLength(prefixed.length);

    // PERINGATAN KEBOCORAN tampil di antarmuka
    expect(screen.getByTestId("nb-text-warnings")).toHaveTextContent(WARNING_LEAKAGE);
    // eslint-disable-next-line no-console
    console.log(`[integration.it01.ui] kolom STWV=${vecNames.length}; mengandung 'VEC_'=${prefixed.length}; terpindah ke Word-Vector Variables=${state.TextVectorVars?.length}; W-LEAK tampil=ya`);
  });

  it("IT-01-i temuan F-01: kolom STWV tanpa garis bawah (mis. 'VEC' dari token '&') tidak terjaring filter 'VEC_' dan tertinggal di Available", () => {
    const stray = vecNames.filter((n) => !n.includes("VEC_"));
    // eslint-disable-next-line no-console
    console.log(`[integration.it01.ui] kolom STWV yang tidak mengandung 'VEC_': ${JSON.stringify(stray)}`);
    expect(stray.length).toBe(vecNames.length - prefixed.length);
    if (stray.length === 0) return; // jika kelak diperbaiki, tes tetap lulus
    render(<Harness variables={variables} />);
    fireEvent.change(screen.getByTestId("nb-variable-filter"), { target: { value: "VEC_" } });
    fireEvent.click(screen.getByTestId("nb-select-all-filtered"));
    fireEvent.click(screen.getByTestId("nb-move-to-wordVector"));
    fireEvent.change(screen.getByTestId("nb-variable-filter"), { target: { value: "" } });
    const availableNames = within(screen.getByTestId("nb-available-list")).queryAllByRole("option")
      .map((el) => el.getAttribute("data-testid")?.replace("nb-available-item-", "") ?? "");
    for (const s of stray) expect(availableNames).toContain(s);
  });
});
