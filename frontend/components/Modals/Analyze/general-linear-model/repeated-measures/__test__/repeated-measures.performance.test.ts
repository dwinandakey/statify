/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import fs from "fs";
import path from "path";
import init, {
    RepeatedMeasureAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg/wasm";

type DataRecord = Record<string, string | number | null>;

const numericDef = (name: string, columnIndex: number) => ({
    id: null,
    columnIndex,
    name,
    type: "NUMERIC",
    width: 8,
    decimals: 3,
    label: name,
    values: [],
    missing: [],
    columns: 8,
    align: "right",
    measure: "scale",
    role: "input",
});

const nominalDef = (name: string, columnIndex: number) => ({
    id: null,
    columnIndex,
    name,
    type: "STRING",
    width: 16,
    decimals: 0,
    label: name,
    values: [],
    missing: [],
    columns: 16,
    align: "left",
    measure: "nominal",
    role: "input",
});

const encoded = (factor: string, level: number, measure: string) =>
    `${factor}_(${level},${measure})`;

const buildConfig = (subVars: string[]): Record<string, unknown> => ({
    main: { SubVar: subVars, FactorsVar: ["group"], Covariates: null },
    model: {
        NonCust: true,
        Custom: false,
        BuildCustomTerm: false,
        BetSubVar: ["group"],
        BetSubModel: null,
        WithSubVar: "time",
        WithSubModel: null,
        DefFactors: "time",
        BetFactors: "group",
        CovModel: null,
        BuildTermMethod: "interaction",
        SumOfSquareMethod: "typeIII",
        TermText: null,
    },
    contrast: {
        FactorList: null,
        ContrastMethod: "polynomial",
        Last: true,
        First: false,
    },
    plots: {
        SrcList: null,
        AxisList: null,
        LineList: null,
        PlotList: null,
        FixFactorVars: null,
        RandFactorVars: null,
        LineChartType: true,
        BarChartType: false,
        IncludeErrorBars: false,
        ConfidenceInterval: true,
        StandardError: false,
        IncludeRefLineForGrandMean: false,
        YAxisStart0: false,
        Multiplier: 2,
    },
    posthoc: {
        SrcList: null,
        FixFactorVars: null,
        ErrorRatio: 100,
        Twosided: true,
        LtControl: false,
        GtControl: false,
        CategoryMethod: "last",
        Waller: false,
        Dunnett: false,
        Lsd: false,
        Bonfe: false,
        Sidak: false,
        Scheffe: false,
        Regwf: false,
        Regwq: false,
        Snk: false,
        Tu: false,
        Tub: false,
        Dun: false,
        Hoc: false,
        Gabriel: false,
        Tam: false,
        Dunt: false,
        Games: false,
        Dunc: false,
    },
    emmeans: {
        SrcList: null,
        TargetList: null,
        CompMainEffect: false,
        ConfiIntervalMethod: "lsdNone",
    },
    save: {
        ResWeighted: false,
        PreWeighted: false,
        StdStatistics: false,
        CooksD: false,
        Leverage: false,
        UnstandardizedRes: false,
        WeightedRes: false,
        StandardizedRes: false,
        StudentizedRes: false,
        DeletedRes: false,
        CoeffStats: false,
        NewDataSet: false,
        FilePath: null,
        DatasetName: null,
        WriteNewDataSet: false,
    },
    options: {
        DescStats: true,
        HomogenTest: true,
        EstEffectSize: true,
        SprVsLevel: false,
        ObsPower: true,
        ResPlot: false,
        ParamEst: true,
        LackOfFit: false,
        SscpMat: false,
        GeneralFun: false,
        ResSscpMat: false,
        CoefficientMatrix: false,
        TransformMat: false,
        SigLevel: 0.05,
    },
});

// Large repeated-measures dataset: nSubjects × nLevels (one measure) + 1 between factor.
const buildLargeDataset = (nSubjects: number, nLevels: number) => {
    const cellNames = Array.from({ length: nLevels }, (_, l) =>
        encoded("time", l + 1, "score")
    );

    const subjectData: DataRecord[][] = [];
    const groupCol: DataRecord[] = [];

    for (let s = 0; s < nSubjects; s += 1) {
        const rec: DataRecord = {};
        const subjectEffect = (s % 50) * 0.1;
        for (let l = 0; l < nLevels; l += 1) {
            rec[cellNames[l]] =
                10 + l * 1.5 + subjectEffect + Math.sin(s + l) * 0.7;
        }
        subjectData.push([rec]);
        groupCol.push({ group: s % 2 === 0 ? "G1" : "G2" });
    }

    const subjectDefs = cellNames.map((name, i) => [numericDef(name, i)]);
    const factorsData: DataRecord[][] = [groupCol];
    const factorsDefs = [[nominalDef("group", nLevels)]];

    return {
        subjectData,
        factorsData,
        covarData: [] as DataRecord[][],
        subjectDefs,
        factorsDefs,
        covarDefs: [] as any[][],
        config: buildConfig(cellNames),
    };
};

describe("GLM Repeated Measures - performance", () => {
    beforeAll(async () => {
        const wasmPath = path.join(__dirname, "../rust/pkg/wasm_bg.wasm");
        const wasmBuffer = fs.readFileSync(wasmPath);
        await init({ module_or_path: wasmBuffer });
    });

    it("analyses 1000 subjects × 5 timepoints within the time budget", () => {
        const inputs = buildLargeDataset(1000, 5);

        const start = performance.now();
        const analysis = new RepeatedMeasureAnalysis(
            inputs.subjectData,
            inputs.factorsData,
            inputs.covarData,
            inputs.subjectDefs,
            inputs.factorsDefs,
            inputs.covarDefs,
            inputs.config
        );
        const result = analysis.get_formatted_results();
        const elapsed = performance.now() - start;

        expect(result.mauchly_test).toBeDefined();
        expect(result.tests_of_within_subjects_effects).toBeDefined();

        // Generous CI-friendly threshold; the engine should finish well under this.
        expect(elapsed).toBeLessThan(5000);
        // eslint-disable-next-line no-console
        console.log(`Repeated Measures 1000×5 analysed in ${elapsed.toFixed(1)} ms`);
    });
});
