/** @jest-environment node */

import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import init, {
    MultivariateAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg/wasm";

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

const buildPerformanceInputs = (rows: number) => {
    const depVars = ["Y1", "Y2", "Y3", "Y4", "Y5"];
    const factors = ["F1", "F2", "F3"];

    const records: Array<Record<string, string | number>> = [];

    for (let i = 0; i < rows; i += 1) {
        const g1 = `A${(i % 4) + 1}`;
        const g2 = `B${(i % 3) + 1}`;
        const g3 = `C${(i % 2) + 1}`;

        records.push({
            F1: g1,
            F2: g2,
            F3: g3,
            Y1: 10 + i * 0.001 + (i % 7) * 0.15,
            Y2: 14 + i * 0.0015 + (i % 5) * 0.2,
            Y3: 18 + i * 0.0009 + (i % 3) * 0.25,
            Y4: 11 + i * 0.0012 + (i % 6) * 0.18,
            Y5: 9 + i * 0.0011 + (i % 4) * 0.22,
        });
    }

    const config = {
        main: {
            DepVar: depVars,
            FixFactor: factors,
            Covar: null,
            WlsWeight: null,
        },
        model: {
            NonCust: true,
            Custom: false,
            BuildCustomTerm: false,
            FactorsVar: factors,
            BuildTermMethod: "mainEffects",
            FactorsModel: factors,
            TermsVar: null,
            CovModel: null,
            RandomModel: null,
            TermText: null,
            SumOfSquareMethod: "typeIII",
            Intercept: true,
        },
        contrast: {
            FactorList: factors,
            ContrastMethod: "none",
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
            LineChartType: false,
            BarChartType: false,
            IncludeErrorBars: false,
            ConfidenceInterval: false,
            StandardError: false,
            Multiplier: 2,
            IncludeRefLineForGrandMean: false,
            YAxisStart0: false,
        },
        posthoc: {
            SrcList: null,
            FixFactorVars: null,
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
            Waller: false,
            ErrorRatio: 100,
            Dunnett: false,
            CategoryMethod: "last",
            Twosided: true,
            LtControl: false,
            GtControl: false,
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
            DatasetName: null,
            WriteNewDataSet: false,
            FilePath: null,
        },
        options: {
            DescStats: true,
            EstEffectSize: true,
            ObsPower: true,
            ParamEst: true,
            SscpMat: false,
            ResSscpMat: false,
            HomogenTest: true,
            SprVsLevel: false,
            ResPlot: false,
            LackOfFit: false,
            GeneralFun: false,
            SigLevel: 0.05,
            CoefficientMatrix: false,
            TransformMat: false,
        },
        bootstrap: {
            PerformBootStrapping: false,
            NumOfSamples: 100,
            Seed: true,
            SeedValue: 1234,
            Level: 95,
            Percentile: true,
            BCa: false,
            Simple: true,
            Stratified: false,
            Variables: null,
            StrataVariables: null,
        },
    };

    return {
        depData: [records],
        fixFactorData: factors.map(() => [ ...records ]),
        covarData: null,
        wlsData: null,
        depDefs: [depVars.map((v, i) => numericDef(v, i))],
        fixFactorDefs: factors.map((f, i) => [nominalDef(f, depVars.length + i)]),
        covarDefs: null,
        wlsDefs: null,
        config,
    };
};

describe("GLM Multivariate performance", () => {
    beforeAll(async () => {
        const wasmPath = path.join(__dirname, "../rust/pkg/wasm_bg.wasm");
        const wasmBuffer = fs.readFileSync(wasmPath);
        await init({ module_or_path: wasmBuffer });
    });

    it("runs 500 x 5DV x 3factor analysis under 5 seconds", () => {
        const inputs = buildPerformanceInputs(500);
        const start = performance.now();

        const analysis = new MultivariateAnalysis(
            inputs.depData,
            inputs.fixFactorData,
            inputs.covarData,
            inputs.wlsData,
            inputs.depDefs,
            inputs.fixFactorDefs,
            inputs.covarDefs,
            inputs.wlsDefs,
            inputs.config
        );

        const result = analysis.get_formatted_results();
        const elapsed = performance.now() - start;

        expect(result).toBeDefined();
        expect(elapsed).toBeLessThan(5000);
    });
});
