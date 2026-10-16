/**
 * White-box integration test (basis path), Alur 2: Generate Split (Variables tab).
 * 4 independent paths (TC-10 to TC-13). Run command: see Alur 1.
 */
import { screen } from "@testing-library/react";
import { recorder } from "./harness-state";
import { generateSplit, openDialog, settings, sixCases, toasts } from "./harness-ui";

jest.mock("@/stores/useVariableStore", () => require("./harness-state").variableStoreMock);
jest.mock("@/stores/useDataStore", () => require("./harness-state").dataStoreMock);
jest.mock("@/stores/useModalStore", () => require("./harness-state").modalStoreMock);
jest.mock("@/stores/useResultStore", () => require("./harness-state").resultStoreMock);
jest.mock("sonner", () => require("./harness-state").sonnerMock);

jest.setTimeout(60000);

/** Grouping grp and predictor x1 (Generate Split does not use Define Range). */
const GRP = { main: { GroupingVariable: "grp", IndependentVariables: ["x1"] } };

const created = () => recorder.addedVariables.map((a) => a.definitions[0]);

describe("White-box integrasi · Alur 2: Generate Split (4 jalur)", () => {
    test("TC-10 | Jalur 10 | Persentase dan seed valid, stratified per grup", async () => {
        const user = await openDialog(sixCases(), settings(GRP));
        await generateSplit(user);
        expect(created().map((d) => d.name)).toEqual(["split_1"]);
        expect(created()[0].label).toContain("stratified by grp");
        expect(toasts("success")[0]).toMatch(/^Created split_1: 4 training and 2 testing cases/);
    });

    test("TC-11 | Jalur 11 | Persentase training di luar 1–99", async () => {
        const user = await openDialog(sixCases(), settings(GRP));
        await generateSplit(user, { percent: "0" });
        expect(screen.getByText("Training percentage must be between 1 and 99.")).toBeInTheDocument();
        expect(recorder.addedVariables).toEqual([]);
    });

    test("TC-12 | Jalur 12 | Stratify tidak dicentang", async () => {
        const user = await openDialog(sixCases(), settings(GRP));
        await generateSplit(user, { uncheckStratify: true });
        expect(created()[0].label).not.toContain("stratified");
        expect(toasts("success")[0]).toMatch(/^Created split_1: 4 training and 2 testing cases/);
    });

    test("TC-13 | Jalur 13 | Pembagian tidak menyisakan kasus training", async () => {
        const user = await openDialog(sixCases(), settings(GRP));
        await generateSplit(user, { percent: "1" });
        expect(screen.getByText("The split leaves no training cases. Increase the training percentage.")).toBeInTheDocument();
        expect(recorder.addedVariables).toEqual([]);
    });
});
