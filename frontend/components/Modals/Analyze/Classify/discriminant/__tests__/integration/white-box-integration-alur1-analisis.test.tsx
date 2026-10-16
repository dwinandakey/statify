/**
 * White-box integration test (basis path), Alur 1: running the discriminant analysis
 * (OK button). 9 independent paths (TC-01 to TC-09); the three flows together give
 * V(G) = 17.
 *
 * Run from frontend/:
 *   npx jest components/Modals/Analyze/Classify/discriminant/__tests__/integration --verbose --silent --no-coverage
 */
import { engine, recorder } from "./harness-state";
import { BASE, clickOk, iris, okButton, openDialog, outputTitles, settings, toasts } from "./harness-ui";

jest.mock("@/stores/useVariableStore", () => require("./harness-state").variableStoreMock);
jest.mock("@/stores/useDataStore", () => require("./harness-state").dataStoreMock);
jest.mock("@/stores/useModalStore", () => require("./harness-state").modalStoreMock);
jest.mock("@/stores/useResultStore", () => require("./harness-state").resultStoreMock);
jest.mock("sonner", () => require("./harness-state").sonnerMock);

jest.setTimeout(60000);

const FAILED = "Discriminant analysis failed: ";

describe("White-box integrasi · Alur 1: analisis diskriminan (9 jalur)", () => {
    test("TC-01 | Jalur 1 | Isian lengkap tanpa stepwise, bootstrap, peringatan, maupun Save", async () => {
        const user = await openDialog(iris(), settings(BASE), ["1", "3"]);
        await clickOk(user);
        expect(outputTitles()).toEqual(expect.arrayContaining(["Eigenvalues", "Wilks' Lambda", "Classification Results"]));
        expect(toasts("error")).toEqual([]);
        expect(toasts("warning")).toEqual([]);
        expect(recorder.addedVariables).toEqual([]);
        expect(recorder.downloads).toEqual([]);
    });

    test("TC-02 | Jalur 2 | Grouping Variable belum dipilih: tombol OK terkunci", async () => {
        await openDialog(iris(), settings(BASE, { main: { GroupingVariable: null } }));
        expect(okButton().disabled).toBe(true);
    });

    test("TC-03 | Jalur 3 | Selection Variable tanpa Value", async () => {
        const user = await openDialog(iris(), settings(BASE, { main: { SelectionVariable: "sel" }, setValue: { Value: null } }), ["1", "3"]);
        await clickOk(user);
        expect(toasts("error")).toEqual([
            "Set a Value for the Selection Variable (Value...), or remove the Selection Variable.",
        ]);
        expect(recorder.workersStarted).toBe(0);
    });

    test("TC-04 | Jalur 4 | Gangguan koneksi ke modul perhitungan", async () => {
        const user = await openDialog(iris(), settings(BASE), ["1", "3"]);
        engine.failConnection = true;
        await clickOk(user);
        expect(toasts("error")[0]).toMatch(new RegExp(`^${FAILED}Failed to load the worker script`));
        expect(recorder.statistics).toEqual([]);
    });

    test("TC-05 | Jalur 5 | Metode stepwise, variabel masuk ke model", async () => {
        const user = await openDialog(iris(), settings(BASE, { main: { Together: false, Stepwise: true } }), ["1", "3"]);
        await clickOk(user);
        expect(outputTitles()).toEqual(expect.arrayContaining(["Variables Entered/Removed", "Eigenvalues"]));
        expect(toasts("error")).toEqual([]);
        expect(toasts("warning")).toEqual([]);
    });

    test("TC-06 | Jalur 6 | Metode stepwise, tidak ada variabel yang memenuhi kriteria masuk", async () => {
        const user = await openDialog(iris(), settings(BASE, { main: { Together: false, Stepwise: true, IndependentVariables: ["noise"] } }), ["1", "3"]);
        await clickOk(user);
        expect(toasts("error")[0]).toMatch(/^Discriminant analysis failed: Stepwise selection: no variable met the entry criteria/);
        expect(recorder.statistics).toEqual([]);
    });

    test("TC-07 | Jalur 7 | Bootstrap dijalankan", async () => {
        const user = await openDialog(iris(), settings(BASE, {
            bootstrap: { PerformBootStrapping: true, NumOfSamples: 50, Seed: true, SeedValue: 2000000 },
        }), ["1", "3"]);
        await clickOk(user);
        expect(outputTitles()).toContain("Bootstrap for Standardized Canonical Discriminant Function Coefficients");
        expect(toasts("warning")).toEqual([]);
    });

    test("TC-08 | Jalur 8 | Hasil dengan peringatan (matriks singular)", async () => {
        const user = await openDialog(iris(), settings(BASE, {
            main: { IndependentVariables: ["sl", "pl", "combo"] },
            statistics: { BoxM: true },
        }), ["1", "3"]);
        await clickOk(user);
        expect(toasts("warning")).toEqual(["Discriminant analysis reported errors or warnings"]);
        expect(outputTitles()).toContain("Eigenvalues");
    });

    test("TC-09 | Jalur 9 | Save: variabel hasil disimpan ke dataset", async () => {
        const user = await openDialog(iris(), settings(BASE, { save: { Predicted: true } }), ["1", "3"]);
        await clickOk(user);
        expect(recorder.addedVariables).toHaveLength(1);
        expect(recorder.addedVariables[0].definitions.map((d: any) => d.name)).toEqual(["Dis_1"]);
        expect(toasts("success")).toContain("Saved to dataset: Dis_1");
        expect(toasts("warning")).toEqual([]);
    });
});
