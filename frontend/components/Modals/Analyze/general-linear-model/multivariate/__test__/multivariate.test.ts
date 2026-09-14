/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import fs from "fs";
import path from "path";
import init, {
    MultivariateAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg/wasm";

type DataRecord = Record<string, string | number | null>;

type WasmInputs = {
    depData: DataRecord[][];
    fixFactorData: DataRecord[][];
    covarData: DataRecord[][] | null;
    wlsData: null;
    depDefs: any[][];
    fixFactorDefs: any[][];
    covarDefs: any[][] | null;
    wlsDefs: null;
    config: any;
};

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

const buildConfig = (
    depVars: string[],
    factors: string[],
    covars: string[]
): Record<string, unknown> => ({
    main: {
        DepVar: depVars,
        FixFactor: factors,
        Covar: covars.length ? covars : null,
        WlsWeight: null,
    },
    model: {
        NonCust: true,
        Custom: false,
        BuildCustomTerm: false,
        FactorsVar: [...factors, ...covars],
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
        NumOfSamples: 200,
        Seed: true,
        SeedValue: 200000,
        Level: 95,
        Percentile: true,
        BCa: false,
        Simple: true,
        Stratified: false,
        Variables: null,
        StrataVariables: null,
    },
});

const buildInputs = (
    records: DataRecord[],
    depVars: string[],
    factors: string[],
    covars: string[]
): WasmInputs => {
    const depDefs = [depVars.map((v, i) => numericDef(v, i))];
    const fixFactorDefs = factors.map((f, i) => [nominalDef(f, depVars.length + i)]);
    const covarDefs =
        covars.length > 0
            ? covars.map((c, i) => [numericDef(c, depVars.length + factors.length + i)])
            : null;

    return {
        depData: [records],
        fixFactorData: factors.map(() => [ ...records ]),
        covarData: covars.length > 0 ? covars.map(() => [ ...records ]) : null,
        wlsData: null,
        depDefs,
        fixFactorDefs,
        covarDefs,
        wlsDefs: null,
        config: buildConfig(depVars, factors, covars),
    };
};

const datasetA = (): WasmInputs => {
    const records: DataRecord[] = [];
    const noise1 = [-1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4];
    const noise2 = [1.1, 0.8, 0.5, 0.2, 0.0, -0.1, -0.3, -0.6, -0.9, -1.2];
    const groups = ["A", "B", "C"];

    groups.forEach((group, gIdx) => {
        for (let i = 0; i < 10; i += 1) {
            records.push({
                Group: group,
                Y1: 10 + gIdx * 4 + noise1[i],
                Y2: 20 + gIdx * 3 + noise2[i],
            });
        }
    });

    return buildInputs(records, ["Y1", "Y2"], ["Group"], []);
};

const datasetB = (): WasmInputs => {
    const records: DataRecord[] = [];
    const groups = ["A", "B", "C"];
    const treatments = ["T1", "T2"];
    const noise = [-0.7, -0.5, -0.2, -0.1, 0.0, 0.2, 0.3, 0.5, 0.7, 0.9];

    groups.forEach((group, gIdx) => {
        treatments.forEach((treatment, tIdx) => {
            for (let i = 0; i < 10; i += 1) {
                const cov1 = 0.5 + i * 0.3 + gIdx * 0.2;
                const base = 12 + gIdx * 2.2 + tIdx * 1.7;

                records.push({
                    Group: group,
                    Treatment: treatment,
                    Cov1: cov1,
                    Y1: base + 0.5 * cov1 + noise[i],
                    Y2: base * 1.25 - 0.4 * cov1 + noise[9 - i],
                    Y3: 6 + gIdx * 1.6 - tIdx * 1.1 + 0.8 * cov1 + noise[i] * 0.5,
                });
            }
        });
    });

    return buildInputs(records, ["Y1", "Y2", "Y3"], ["Group", "Treatment"], ["Cov1"]);
};

const datasetC = (): WasmInputs => {
    const records: DataRecord[] = [];
    const counts: Array<[string, number]> = [
        ["setosa", 8],
        ["versicolor", 11],
        ["virginica", 13],
    ];

    counts.forEach(([species, n], speciesIdx) => {
        for (let i = 0; i < n; i += 1) {
            const phase = i * 0.25;
            records.push({
                Species: species,
                SepalLength:
                    5 + speciesIdx * 0.9 + Math.sin(phase) * 0.3 + i * 0.03,
                SepalWidth:
                    3.4 - speciesIdx * 0.25 + Math.cos(phase) * 0.2 - i * 0.01,
            });
        }
    });

    return buildInputs(records, ["SepalLength", "SepalWidth"], ["Species"], []);
};

const run = (inputs: WasmInputs): any => {
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

    return analysis.get_formatted_results();
};

const getMapOrObjectValue = (container: any, key: string): any => {
    if (!container) return undefined;
    if (container instanceof Map) {
        return container.get(key);
    }

    return container[key];
};

const getNestedValue = (container: any, keys: string[]): any =>
    keys.reduce((acc, key) => getMapOrObjectValue(acc, key), container);

describe("GLM Multivariate - Wasm smoke and numeric regression", () => {
    beforeAll(async () => {
        const wasmPath = path.join(__dirname, "../rust/pkg/wasm_bg.wasm");
        const wasmBuffer = fs.readFileSync(wasmPath);
        await init({ module_or_path: wasmBuffer });
    });

    it("Dataset A returns core tables and stable structure", () => {
        const result = run(datasetA());

        expect(result.multivariate_tests).toBeDefined();
        expect(result.tests_of_between_subjects_effects).toBeDefined();
        expect(result.parameter_estimates).toBeDefined();
        expect(result.box_test).toBeDefined();

        expect(result.box_test.df1).toBe(6);
        expect(result.box_test.f).toBeGreaterThanOrEqual(0);

        const y1Group = getNestedValue(
            result.tests_of_between_subjects_effects?.effects,
            ["Y1", "Group"]
        );
        expect(y1Group).toBeDefined();
        expect(y1Group.df).toBe(2);

        const groupPillai = getNestedValue(result.multivariate_tests?.effects, [
            "Group",
            "Pillai's Trace",
        ]);
        expect(groupPillai).toBeDefined();
        expect(groupPillai.value).toBeCloseTo(0, 6);
    });

    it("Dataset B includes interaction effect and stable Box test dimensions", () => {
        const result = run(datasetB());

        const interaction = getMapOrObjectValue(
            result.multivariate_tests?.effects,
            "Group*Treatment"
        );
        expect(interaction).toBeDefined();

        const y3Group = getNestedValue(
            result.tests_of_between_subjects_effects?.effects,
            ["Y3", "Group"]
        );
        expect(y3Group).toBeDefined();
        expect(y3Group.df).toBe(2);

        expect(result.box_test.df1).toBe(30);
        expect(result.box_test.f).toBeGreaterThanOrEqual(0);

        const groupPillai = getNestedValue(result.multivariate_tests?.effects, [
            "Group",
            "Pillai's Trace",
        ]);
        expect(groupPillai).toBeDefined();
        expect(groupPillai.f).toBeCloseTo(0, 6);
    });

    it("Dataset C reproduces deterministic Box's M baseline", () => {
        const result = run(datasetC());

        const speciesEffect = getMapOrObjectValue(
            result.multivariate_tests?.effects,
            "Species"
        );
        expect(speciesEffect).toBeDefined();

        const sepalLengthSpecies = getNestedValue(
            result.tests_of_between_subjects_effects?.effects,
            ["SepalLength", "Species"]
        );
        expect(sepalLengthSpecies).toBeDefined();
        expect(sepalLengthSpecies.df).toBe(2);

        expect(result.box_test.box_m).toBeCloseTo(10.393282721313454, 6);
        expect(result.box_test.f).toBeCloseTo(1.5497442954550478, 6);
        expect(result.box_test.significance).toBeCloseTo(0.1975627435596765, 6);
    });
});
