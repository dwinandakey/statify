// Penampung state tiruan untuk tes integrasi Track F. Dimuat DI DALAM pabrik jest.mock pada berkas tes:
//
//   jest.mock("@/stores/useResultStore", () => {
//     const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.mocks");
//     return { useResultStore: { getState: () => m.resultStore.state } };
//   });
//   jest.mock("@/stores/useVariableStore", () => {
//     const m = require("@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.mocks");
//     return { useVariableStore: { getState: () => m.variableState }, processVariableName: m.realProcessVariableName };
//   });
//
// `realProcessVariableName` = fungsi processVariableName ASLI dari stores/useVariableStore.ts (potongan sumber
// ditranspilasi; lihat blackbox.am.helpers.ts), sehingga penamaan kolom VEC_ dan NB_ memakai logika produksi.
import type { Variable } from "@/types/Variable";
import { createFakeResultStore } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/integration.helpers";
import { loadRealProcessVariableName } from "@/components/Modals/Analyze/Classify/apply-model/__tests__/eval/blackbox.am.helpers";

export const resultStore = createFakeResultStore();
export const variableState: { variables: Variable[]; addVariables: jest.Mock } = {
  variables: [],
  addVariables: jest.fn(async () => undefined),
};
export const realProcessVariableName = loadRealProcessVariableName();
