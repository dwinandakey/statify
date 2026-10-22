/**
 * White-box integration test (basis path), Alur 3: Run Assumption Tests (Assumptions
 * tab). 4 independent paths (TC-14 to TC-17). Run command: see Alur 1.
 */
import { screen, waitFor } from "@testing-library/react";
import { engine, recorder } from "./harness-state";
import { BASE, iris, openAssumptionsTab, openDialog, outputTitles, runButton, settings } from "./harness-ui";

jest.mock("@/stores/useVariableStore", () => require("./harness-state").variableStoreMock);
jest.mock("@/stores/useDataStore", () => require("./harness-state").dataStoreMock);
jest.mock("@/stores/useModalStore", () => require("./harness-state").modalStoreMock);
jest.mock("@/stores/useResultStore", () => require("./harness-state").resultStoreMock);
jest.mock("sonner", () => require("./harness-state").sonnerMock);

jest.setTimeout(60000);

const HINT = /Select a grouping variable and at least one independent variable/;

describe("White-box integrasi · Alur 3: Run Assumption Tests (4 jalur)", () => {
    test("TC-14 | Jalur 14 | Isian lengkap: tabel uji asumsi ditampilkan", async () => {
        const user = await openDialog(iris(), settings(BASE), ["1", "3"]);
        await openAssumptionsTab(user);
        await user.click(runButton());
        await waitFor(() => expect(screen.getByText(/Assumption checks completed/)).toBeInTheDocument(), { timeout: 20000 });
        expect(outputTitles()).toEqual([
            "Assumption Checks Summary",
            "Multicollinearity (Tolerance and VIF)",
            "Multivariate Normality within Groups (Henze-Zirkler Test)",
            "Univariate Normality within Groups (Anderson-Darling)",
        ]);
    });

    test("TC-15 | Jalur 15 | Grouping Variable belum dipilih: tombol Run terkunci", async () => {
        const user = await openDialog(iris(), settings(BASE, { main: { GroupingVariable: null } }));
        await openAssumptionsTab(user);
        expect(runButton().disabled).toBe(true);
        expect(screen.getByText(HINT)).toBeInTheDocument();
    });

    test("TC-16 | Jalur 16 | Isian tidak valid (Define Range belum diisi)", async () => {
        const user = await openDialog(iris(), settings(BASE));
        await openAssumptionsTab(user);
        await user.click(runButton());
        await waitFor(() => expect(screen.getByText("Define Range must be set for the grouping variable.")).toBeInTheDocument());
        expect(recorder.workersStarted).toBe(0);
    });

    test("TC-17 | Jalur 17 | Gangguan koneksi ke modul perhitungan", async () => {
        const user = await openDialog(iris(), settings(BASE), ["1", "3"]);
        engine.failConnection = true;
        await openAssumptionsTab(user);
        await user.click(runButton());
        await waitFor(() => expect(screen.getByText("Failed to load the worker script")).toBeInTheDocument());
        expect(recorder.statistics).toEqual([]);
    });
});
