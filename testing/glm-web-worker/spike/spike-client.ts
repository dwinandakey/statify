// SPIKE (compare_web_workers.md §3.5), kept in testing/glm-web-worker/spike (see ../README.md).
// Creates each spike worker with the literal `new Worker(new URL(...))`
// pattern (webpack 5 needs it at the call site) and runs one small
// Multivariate analysis (24 cases × 2 DV × 1 factor, 3 levels).

export type SpikeVariant = "dotworker" | "plain";

export type SpikeOutcome = {
    variant: SpikeVariant;
    ok: boolean;
    detail: unknown;
};

const numericDef = (name: string, columnIndex: number) => ({
    id: null, columnIndex, name, type: "NUMERIC", width: 8, decimals: 3,
    label: name, values: [], missing: [], columns: 8, align: "right",
    measure: "scale", role: "input",
});

const nominalDef = (name: string, columnIndex: number) => ({
    id: null, columnIndex, name, type: "STRING", width: 16, decimals: 0,
    label: name, values: [], missing: [], columns: 16, align: "left",
    measure: "nominal", role: "input",
});

export function buildSpikePayload() {
    const depVars = ["Y1", "Y2"];
    const factors = ["F1"];
    const records: Record<string, string | number>[] = [];
    for (let i = 0; i < 24; i++) {
        records.push({
            F1: `A${(i % 3) + 1}`,
            Y1: 10 + (i % 3) * 1.5 + (i % 5) * 0.3,
            Y2: 20 + (i % 3) * 0.8 + (i % 7) * 0.4,
        });
    }
    const config = {
        main: { DepVar: depVars, FixFactor: factors, Covar: null, WlsWeight: null, VarianceMode: "Pooled" },
        model: {
            NonCust: true, Custom: false, BuildCustomTerm: false, FactorsVar: factors,
            BuildTermMethod: "mainEffects", FactorsModel: factors, TermsVar: null, CovModel: null,
            RandomModel: null, TermText: null, SumOfSquareMethod: "typeIII", Intercept: true,
        },
        contrast: { FactorList: factors, ContrastMethod: "none", Last: true, First: false },
        plots: {
            SrcList: null, AxisList: null, LineList: null, PlotList: null, FixFactorVars: null,
            RandFactorVars: null, LineChartType: false, BarChartType: false, IncludeErrorBars: false,
            ConfidenceInterval: false, StandardError: false, Multiplier: 2,
            IncludeRefLineForGrandMean: false, YAxisStart0: false,
        },
        posthoc: {
            SrcList: null, FixFactorVars: null, Lsd: false, Bonfe: false, Sidak: false, Scheffe: false,
            Regwf: false, Regwq: false, Snk: false, Tu: false, Tub: false, Dun: false, Hoc: false,
            Gabriel: false, Waller: false, ErrorRatio: 100, Dunnett: false, CategoryMethod: "last",
            Twosided: true, LtControl: false, GtControl: false, Tam: false, Dunt: false, Games: false,
            Dunc: false,
        },
        emmeans: { SrcList: null, TargetList: null, CompMainEffect: false, ConfiIntervalMethod: "lsdNone" },
        save: {
            ResWeighted: false, PreWeighted: false, StdStatistics: false, CooksD: false, Leverage: false,
            UnstandardizedRes: false, WeightedRes: false, StandardizedRes: false, StudentizedRes: false,
            DeletedRes: false, CoeffStats: false, NewDataSet: false, DatasetName: null,
            WriteNewDataSet: false, FilePath: null,
        },
        options: {
            DescStats: true, EstEffectSize: true, ObsPower: true, ParamEst: true, SscpMat: false,
            ResSscpMat: false, HomogenTest: true, SprVsLevel: false, ResPlot: false, LackOfFit: false,
            GeneralFun: false, SigLevel: 0.05, CoefficientMatrix: false, TransformMat: false,
        },
        bootstrap: {
            PerformBootStrapping: false, NumOfSamples: 100, Seed: true, SeedValue: 1234, Level: 95,
            Percentile: true, BCa: false, Simple: true, Stratified: false, Variables: null,
            StrataVariables: null,
        },
    };
    return {
        depData: [records],
        fixFactorData: [[...records]],
        covarData: null,
        wlsData: null,
        depDefs: [depVars.map((v, i) => numericDef(v, i))],
        fixFactorDefs: [[nominalDef("F1", depVars.length)]],
        covarDefs: null,
        wlsDefs: null,
        config,
    };
}

function createSpikeWorker(variant: SpikeVariant): Worker {
    if (variant === "dotworker") {
        return new Worker(new URL("./spike.worker.ts", import.meta.url), { type: "module" });
    }
    return new Worker(new URL("./spike-plain.ts", import.meta.url), { type: "module" });
}

export function runSpike(variant: SpikeVariant, timeoutMs = 30000): Promise<SpikeOutcome> {
    return new Promise((resolve) => {
        let worker: Worker;
        try {
            worker = createSpikeWorker(variant);
        } catch (err) {
            resolve({ variant, ok: false, detail: `constructor threw: ${String(err)}` });
            return;
        }
        const timer = setTimeout(() => {
            worker.terminate();
            resolve({ variant, ok: false, detail: `no reply within ${timeoutMs} ms` });
        }, timeoutMs);
        worker.onmessage = (e) => {
            clearTimeout(timer);
            worker.terminate();
            resolve({ variant, ok: Boolean(e.data?.ok), detail: e.data });
        };
        worker.onerror = (e) => {
            clearTimeout(timer);
            worker.terminate();
            resolve({ variant, ok: false, detail: `onerror: ${e.message || "(no message)"} @ ${e.filename}:${e.lineno}` });
        };
        worker.postMessage({ payload: buildSpikePayload() });
    });
}
