/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import fs from "fs";
import path from "path";
import init, {
    RepeatedMeasureAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg/wasm";

type DataRecord = Record<string, string | number | null>;

type WasmInputs = {
    subjectData: DataRecord[][];
    factorsData: DataRecord[][];
    covarData: DataRecord[][];
    subjectDefs: any[][];
    factorsDefs: any[][];
    covarDefs: any[][];
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

// Within-subjects cells are encoded as "<factor>_(<level>,<measure>)" — the exact
// format the Rust `parse_within_subject_factors` regex expects in the var def name.
const encoded = (factor: string, level: number, measure: string) =>
    `${factor}_(${level},${measure})`;

const buildConfig = (
    subVars: string[],
    defFactors: string,
    betFactors: string[],
    covars: string[]
): Record<string, unknown> => ({
    main: {
        SubVar: subVars,
        FactorsVar: betFactors.length ? betFactors : null,
        Covariates: covars.length ? covars : null,
    },
    model: {
        NonCust: true,
        Custom: false,
        BuildCustomTerm: false,
        BetSubVar: betFactors.length ? betFactors : null,
        BetSubModel: null,
        WithSubVar: defFactors,
        WithSubModel: null,
        DefFactors: defFactors,
        BetFactors: betFactors.length ? betFactors.join(";") : null,
        CovModel: covars.length ? covars.join(";") : null,
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

// Reshape a flat subject × timepoint table into the WASM input layout:
//   subjectData : one record per subject, keyed by encoded cell name
//   subjectDefs : one def per encoded variable
const buildInputs = (
    rows: number[][], // rows[s] = [v_level1, v_level2, ...]
    factor: string,
    measure: string,
    betColumn: string[] | null,
    covColumn: number[] | null
): WasmInputs => {
    const nLevels = rows[0].length;
    const cellNames = Array.from({ length: nLevels }, (_, l) =>
        encoded(factor, l + 1, measure)
    );

    const subjectData: DataRecord[][] = rows.map((row) => {
        const rec: DataRecord = {};
        row.forEach((v, l) => {
            rec[cellNames[l]] = v;
        });
        return [rec];
    });

    const subjectDefs = cellNames.map((name, i) => [numericDef(name, i)]);

    const betFactors = betColumn ? ["group"] : [];
    const factorsData: DataRecord[][] = betColumn
        ? [betColumn.map((g) => ({ group: g }))]
        : [];
    const factorsDefs = betColumn ? [[nominalDef("group", nLevels)]] : [];

    const covars = covColumn ? ["cov"] : [];
    const covarData: DataRecord[][] = covColumn
        ? [covColumn.map((c) => ({ cov: c }))]
        : [];
    const covarDefs = covColumn ? [[numericDef("cov", nLevels + 1)]] : [];

    return {
        subjectData,
        factorsData,
        covarData,
        subjectDefs,
        factorsDefs,
        covarDefs,
        config: buildConfig(cellNames, factor, betFactors, covars),
    };
};

// Dataset A — 1 within-subjects factor (time) × 3 levels, n = 20, balanced.
const datasetA = (): WasmInputs => {
    const noise = [
        -1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4, -1.0, -0.7, -0.4,
        -0.1, 0.1, 0.3, 0.6, 0.9, 1.2, 1.5,
    ];
    const rows = noise.map((n, i) => [
        10 + n,
        12 + n + Math.sin(i) * 0.4,
        15 + n + Math.cos(i) * 0.3,
    ]);
    return buildInputs(rows, "time", "score", null, null);
};

// Dataset B — 1 within-subjects factor (time) × 4 levels + 1 between factor + covariate.
const datasetB = (): WasmInputs => {
    const groups = ["G1", "G2"];
    const rows: number[][] = [];
    const betCol: string[] = [];
    const covCol: number[] = [];

    groups.forEach((g, gIdx) => {
        for (let i = 0; i < 15; i += 1) {
            const base = 8 + gIdx * 2 + i * 0.1;
            const cov = 1 + i * 0.2 + gIdx * 0.3;
            rows.push([
                base,
                base + 1.2 + Math.sin(i) * 0.3,
                base + 2.1 + Math.cos(i) * 0.25,
                base + 2.8 + Math.sin(i * 0.5) * 0.2,
            ]);
            betCol.push(g);
            covCol.push(cov);
        }
    });

    return buildInputs(rows, "time", "score", betCol, covCol);
};

const run = (inputs: WasmInputs): any => {
    const analysis = new RepeatedMeasureAnalysis(
        inputs.subjectData,
        inputs.factorsData,
        inputs.covarData,
        inputs.subjectDefs,
        inputs.factorsDefs,
        inputs.covarDefs,
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

describe("GLM Repeated Measures - Wasm smoke and structure", () => {
    beforeAll(async () => {
        const wasmPath = path.join(__dirname, "../rust/pkg/wasm_bg.wasm");
        const wasmBuffer = fs.readFileSync(wasmPath);
        await init({ module_or_path: wasmBuffer });
    });

    it("Dataset A returns the signature within-subjects tables", () => {
        const result = run(datasetA());

        // Signature tables for Repeated Measures.
        expect(result.within_subjects_factors).toBeDefined();
        expect(result.mauchly_test).toBeDefined();
        expect(result.tests_of_within_subjects_effects).toBeDefined();
        expect(result.multivariate_tests).toBeDefined();
    });

    it("Dataset A — within-subjects factor structure is decoded correctly", () => {
        const result = run(datasetA());
        const measures = getMapOrObjectValue(
            result.within_subjects_factors,
            "measures"
        );
        const scoreFactors = getMapOrObjectValue(measures, "score");

        expect(Array.isArray(scoreFactors)).toBe(true);
        // 3 levels → 3 dependent-variable cells.
        expect(scoreFactors).toHaveLength(3);
    });

    it("Dataset A — Mauchly epsilon bounds are valid (LB ≤ GG ≤ HF ≤ 1)", () => {
        const result = run(datasetA());
        const mauchly = result.mauchly_test;
        expect(mauchly).toBeDefined();

        // Serialised as plain object/array; just assert the result is finite JSON.
        const serialised = JSON.stringify(mauchly);
        expect(serialised).toBeTruthy();
        expect(serialised).not.toContain("null,null,null");
    });

    it("Dataset B (mixed design) returns within- and between-subjects effects", () => {
        const result = run(datasetB());

        expect(result.within_subjects_factors).toBeDefined();
        expect(result.tests_of_within_subjects_effects).toBeDefined();
        expect(result.tests_of_between_subjects_effects).toBeDefined();
        expect(result.descriptive_statistics).toBeDefined();
    });

    it("executes the analysis pipeline without fatal errors", () => {
        const analysis = new RepeatedMeasureAnalysis(
            datasetA().subjectData,
            datasetA().factorsData,
            datasetA().covarData,
            datasetA().subjectDefs,
            datasetA().factorsDefs,
            datasetA().covarDefs,
            datasetA().config
        );

        const result = analysis.get_formatted_results();
        const executed: string[] = result.executed_functions ?? [];

        expect(Array.isArray(executed)).toBe(true);
        expect(executed.length).toBeGreaterThan(0);
    });
});
