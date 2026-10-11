"use client";
// VERIFICATION HARNESS for the GLM Web Worker implementation. Copy this file
// (and memory-probe-worker.js) to frontend/app/glm-worker-verify/ only while
// verifying, then delete the copies (see ../README.md). Driven by Playwright
// through window.__glmHarness.
//
// - runCompute(): calls the exported compute function of each service (the
//   exact code path analyze* uses) with the Jest-test datasets and returns the
//   serialised get_formatted_results() output.
// - runAnalyze(): calls analyze* end-to-end (data prep → WASM → formatter →
//   useResultStore) and returns what was written to the store plus the
//   glm-analysis-end mark.
import { useEffect, useState } from "react";
import {
    analyzeMultivariate,
    computeMultivariate,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/services/multivariate-analysis";
import {
    analyzeRepeatedMeasures,
    computeRepeatedMeasures,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/services/repeated-measures-analysis";
import { useResultStore } from "@/stores/useResultStore";
// Do NOT import a GLM rust/pkg directly here: every GLM package is named
// "wasm@0.1.0", and one extra directory import is enough to make the frontend
// type check resolve another GLM module to the wrong typings (seen on
// 2026-09-22: univariate-analysis.ts failed `next build`).

type Rec = Record<string, string | number | null>;
type Mode = "main" | "worker" | null;
type Mod = "multivariate" | "repeated-measures";

// ───────────── builders copied from multivariate/__test__/multivariate.test.ts ─────────────
const numericDef = (name: string, columnIndex: number) => ({
    id: null, columnIndex, name, type: "NUMERIC", width: 8, decimals: 3, label: name,
    values: [], missing: [], columns: 8, align: "right", measure: "scale", role: "input",
});
const nominalDef = (name: string, columnIndex: number) => ({
    id: null, columnIndex, name, type: "STRING", width: 16, decimals: 0, label: name,
    values: [], missing: [], columns: 16, align: "left", measure: "nominal", role: "input",
});

const mvConfig = (depVars: string[], factors: string[], covars: string[]): any => ({
    main: { DepVar: depVars, FixFactor: factors, Covar: covars.length ? covars : null, WlsWeight: null },
    model: {
        NonCust: true, Custom: false, BuildCustomTerm: false, FactorsVar: [...factors, ...covars],
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
        Twosided: true, LtControl: false, GtControl: false, Tam: false, Dunt: false, Games: false, Dunc: false,
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
        PerformBootStrapping: false, NumOfSamples: 200, Seed: true, SeedValue: 200000, Level: 95,
        Percentile: true, BCa: false, Simple: true, Stratified: false, Variables: null, StrataVariables: null,
    },
});

type MvData = { records: Rec[]; depVars: string[]; factors: string[]; covars: string[] };

const mvA = (): MvData => {
    const records: Rec[] = [];
    const noise1 = [-1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4];
    const noise2 = [1.1, 0.8, 0.5, 0.2, 0.0, -0.1, -0.3, -0.6, -0.9, -1.2];
    ["A", "B", "C"].forEach((group, gIdx) => {
        for (let i = 0; i < 10; i += 1) {
            records.push({ Group: group, Y1: 10 + gIdx * 4 + noise1[i], Y2: 20 + gIdx * 3 + noise2[i] });
        }
    });
    return { records, depVars: ["Y1", "Y2"], factors: ["Group"], covars: [] };
};

const mvB = (): MvData => {
    const records: Rec[] = [];
    const noise = [-0.7, -0.5, -0.2, -0.1, 0.0, 0.2, 0.3, 0.5, 0.7, 0.9];
    ["A", "B", "C"].forEach((group, gIdx) => {
        ["T1", "T2"].forEach((treatment, tIdx) => {
            for (let i = 0; i < 10; i += 1) {
                const cov1 = 0.5 + i * 0.3 + gIdx * 0.2;
                const base = 12 + gIdx * 2.2 + tIdx * 1.7;
                records.push({
                    Group: group, Treatment: treatment, Cov1: cov1,
                    Y1: base + 0.5 * cov1 + noise[i],
                    Y2: base * 1.25 - 0.4 * cov1 + noise[9 - i],
                    Y3: 6 + gIdx * 1.6 - tIdx * 1.1 + 0.8 * cov1 + noise[i] * 0.5,
                });
            }
        });
    });
    return { records, depVars: ["Y1", "Y2", "Y3"], factors: ["Group", "Treatment"], covars: ["Cov1"] };
};

const mvC = (): MvData => {
    const records: Rec[] = [];
    const counts: Array<[string, number]> = [["setosa", 8], ["versicolor", 11], ["virginica", 13]];
    counts.forEach(([species, n], speciesIdx) => {
        for (let i = 0; i < n; i += 1) {
            const phase = i * 0.25;
            records.push({
                Species: species,
                SepalLength: 5 + speciesIdx * 0.9 + Math.sin(phase) * 0.3 + i * 0.03,
                SepalWidth: 3.4 - speciesIdx * 0.25 + Math.cos(phase) * 0.2 - i * 0.01,
            });
        }
    });
    return { records, depVars: ["SepalLength", "SepalWidth"], factors: ["Species"], covars: [] };
};

// Same generator as multivariate.performance.test.ts (500 × 5 DV × 3 factors).
const mvPerf500 = (): MvData => {
    const records: Rec[] = [];
    for (let i = 0; i < 500; i += 1) {
        records.push({
            F1: `A${(i % 4) + 1}`, F2: `B${(i % 3) + 1}`, F3: `C${(i % 2) + 1}`,
            Y1: 10 + i * 0.001 + (i % 7) * 0.15,
            Y2: 14 + i * 0.0015 + (i % 5) * 0.2,
            Y3: 18 + i * 0.0009 + (i % 3) * 0.25,
            Y4: 11 + i * 0.0012 + (i % 6) * 0.18,
            Y5: 9 + i * 0.0011 + (i % 4) * 0.22,
        });
    }
    return { records, depVars: ["Y1", "Y2", "Y3", "Y4", "Y5"], factors: ["F1", "F2", "F3"], covars: [] };
};

const MV_DATA: Record<string, () => MvData> = { A: mvA, B: mvB, C: mvC, perf500: mvPerf500 };

// Raw WASM payload exactly as multivariate.test.ts builds it (buildInputs).
const mvPayload = ({ records, depVars, factors, covars }: MvData) => {
    const config = mvConfig(depVars, factors, covars);
    return {
        dep_data: [records],
        fix_factor_data: factors.map(() => [...records]),
        covar_data: covars.length > 0 ? covars.map(() => [...records]) : null,
        wls_data: null,
        dep_data_defs: [depVars.map((v, i) => numericDef(v, i))],
        fix_factor_data_defs: factors.map((f, i) => [nominalDef(f, depVars.length + i)]),
        covar_data_defs: covars.length > 0
            ? covars.map((c, i) => [numericDef(c, depVars.length + factors.length + i)])
            : null,
        wls_data_defs: null,
        config_data: config,
    };
};

// ───────────── builders copied from repeated-measures/__test__/repeated-measures.test.ts ─────────────
const encoded = (factor: string, level: number, measure: string) => `${factor}_(${level},${measure})`;

const rmConfig = (subVars: string[], defFactors: string, betFactors: string[], covars: string[]): any => ({
    main: { SubVar: subVars, FactorsVar: betFactors.length ? betFactors : null, Covariates: covars.length ? covars : null },
    model: {
        NonCust: true, Custom: false, BuildCustomTerm: false,
        BetSubVar: betFactors.length ? betFactors : null, BetSubModel: null,
        WithSubVar: defFactors, WithSubModel: null, DefFactors: defFactors,
        BetFactors: betFactors.length ? betFactors.join(";") : null,
        CovModel: covars.length ? covars.join(";") : null,
        BuildTermMethod: "interaction", SumOfSquareMethod: "typeIII", TermText: null,
    },
    contrast: { FactorList: null, ContrastMethod: "polynomial", Last: true, First: false },
    plots: {
        SrcList: null, AxisList: null, LineList: null, PlotList: null, FixFactorVars: null,
        RandFactorVars: null, LineChartType: true, BarChartType: false, IncludeErrorBars: false,
        ConfidenceInterval: true, StandardError: false, IncludeRefLineForGrandMean: false,
        YAxisStart0: false, Multiplier: 2,
    },
    posthoc: {
        SrcList: null, FixFactorVars: null, ErrorRatio: 100, Twosided: true, LtControl: false,
        GtControl: false, CategoryMethod: "last", Waller: false, Dunnett: false, Lsd: false,
        Bonfe: false, Sidak: false, Scheffe: false, Regwf: false, Regwq: false, Snk: false,
        Tu: false, Tub: false, Dun: false, Hoc: false, Gabriel: false, Tam: false, Dunt: false,
        Games: false, Dunc: false,
    },
    emmeans: { SrcList: null, TargetList: null, CompMainEffect: false, ConfiIntervalMethod: "lsdNone" },
    save: {
        ResWeighted: false, PreWeighted: false, StdStatistics: false, CooksD: false, Leverage: false,
        UnstandardizedRes: false, WeightedRes: false, StandardizedRes: false, StudentizedRes: false,
        DeletedRes: false, CoeffStats: false, NewDataSet: false, FilePath: null, DatasetName: null,
        WriteNewDataSet: false,
    },
    options: {
        DescStats: true, HomogenTest: true, EstEffectSize: true, SprVsLevel: false, ObsPower: true,
        ResPlot: false, ParamEst: true, LackOfFit: false, SscpMat: false, GeneralFun: false,
        ResSscpMat: false, CoefficientMatrix: false, TransformMat: false, SigLevel: 0.05,
    },
});

type RmData = { rows: number[][]; betCol: string[] | null; covCol: number[] | null };

const rmA = (): RmData => {
    const noise = [-1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4, -1.0, -0.7, -0.4, -0.1, 0.1, 0.3, 0.6, 0.9, 1.2, 1.5];
    const rows = noise.map((n, i) => [10 + n, 12 + n + Math.sin(i) * 0.4, 15 + n + Math.cos(i) * 0.3]);
    return { rows, betCol: null, covCol: null };
};

const rmB = (): RmData => {
    const rows: number[][] = [];
    const betCol: string[] = [];
    const covCol: number[] = [];
    ["G1", "G2"].forEach((g, gIdx) => {
        for (let i = 0; i < 15; i += 1) {
            const base = 8 + gIdx * 2 + i * 0.1;
            rows.push([
                base, base + 1.2 + Math.sin(i) * 0.3, base + 2.1 + Math.cos(i) * 0.25,
                base + 2.8 + Math.sin(i * 0.5) * 0.2,
            ]);
            betCol.push(g);
            covCol.push(1 + i * 0.2 + gIdx * 0.3);
        }
    });
    return { rows, betCol, covCol };
};

// Same generator as repeated-measures.performance.test.ts (1000 subjects × 5 levels, 2 groups).
const rmLarge = (): RmData => {
    const rows: number[][] = [];
    const betCol: string[] = [];
    for (let s = 0; s < 1000; s += 1) {
        const subjectEffect = (s % 50) * 0.1;
        rows.push(Array.from({ length: 5 }, (_, l) => 10 + l * 1.5 + subjectEffect + Math.sin(s + l) * 0.7));
        betCol.push(s % 2 === 0 ? "G1" : "G2");
    }
    return { rows, betCol, covCol: null };
};

const RM_DATA: Record<string, () => RmData> = { A: rmA, B: rmB, large: rmLarge };

// Raw WASM payload exactly as repeated-measures.test.ts builds it (buildInputs).
const rmPayload = ({ rows, betCol, covCol }: RmData) => {
    const nLevels = rows[0].length;
    const cellNames = Array.from({ length: nLevels }, (_, l) => encoded("time", l + 1, "score"));
    const subjectData = rows.map((row) => {
        const rec: Rec = {};
        row.forEach((v, l) => { rec[cellNames[l]] = v; });
        return [rec];
    });
    const betFactors = betCol ? ["group"] : [];
    const covars = covCol ? ["cov"] : [];
    return {
        subject_data: subjectData,
        factors_data: betCol ? [betCol.map((g) => ({ group: g }))] : [],
        covar_data: covCol ? [covCol.map((c) => ({ cov: c }))] : [],
        subject_data_defs: cellNames.map((name, i) => [numericDef(name, i)]),
        factors_data_defs: betCol ? [[nominalDef("group", nLevels)]] : [],
        covar_data_defs: covCol ? [[numericDef("cov", nLevels + 1)]] : [],
        config_data: rmConfig(cellNames, "time", betFactors, covars),
    };
};

// ───────────── end-to-end inputs in the dialog/store format used by analyze* ─────────────
const variableDef = (name: string, columnIndex: number, nominal: boolean) => ({
    id: columnIndex + 1, columnIndex, name, type: nominal ? "STRING" : "NUMERIC", width: 8,
    decimals: nominal ? 0 : 3, label: name, values: [], missing: null, columns: 8,
    align: nominal ? "left" : "right", measure: nominal ? "nominal" : "scale", role: "input",
});

const mvE2E = (d: MvData) => {
    const cols = [...d.depVars, ...d.factors, ...d.covars];
    const base = mvConfig(d.depVars, d.factors, d.covars);
    return {
        configData: { ...base, main: { ...base.main, TestValues: null, VarianceMode: null, PairedMode: null } },
        dataVariables: d.records.map((r) => cols.map((c) => r[c])),
        variables: cols.map((c, i) => variableDef(c, i, d.factors.includes(c))),
    };
};

const rmE2E = (d: RmData) => {
    const nLevels = d.rows[0].length;
    const real = Array.from({ length: nLevels }, (_, l) => `t${l + 1}`);
    const subVar = real.map((r, l) => `${r}_(${l + 1},score)`);
    const cols = [...real, ...(d.betCol ? ["group"] : []), ...(d.covCol ? ["cov"] : [])];
    return {
        configData: rmConfig(subVar, "time", d.betCol ? ["group"] : [], d.covCol ? ["cov"] : []),
        dataVariables: d.rows.map((row, s) => [
            ...row, ...(d.betCol ? [d.betCol[s]] : []), ...(d.covCol ? [d.covCol[s]] : []),
        ]),
        variables: cols.map((c, i) => variableDef(c, i, c === "group")),
    };
};

// ───────────── serialisation for exact comparison ─────────────
// Keeps Map vs object distinct and encodes values JSON would lose
// (NaN, ±Infinity, -0, undefined). sortKeys=false preserves key order.
function encode(v: unknown, sortKeys: boolean): unknown {
    if (v instanceof Map) {
        const entries = [...v.entries()].map(([k, x]) => [String(k), encode(x, sortKeys)] as [string, unknown]);
        if (sortKeys) entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        return { "§map": entries };
    }
    if (Array.isArray(v)) return v.map((x) => encode(x, sortKeys));
    if (typeof v === "number") {
        if (Number.isNaN(v)) return "§NaN";
        if (!Number.isFinite(v)) return v > 0 ? "§+Inf" : "§-Inf";
        if (Object.is(v, -0)) return "§-0";
        return v;
    }
    if (v === undefined) return "§undefined";
    if (v && typeof v === "object") {
        const keys = Object.keys(v as object);
        if (sortKeys) keys.sort();
        const out: Record<string, unknown> = {};
        for (const k of keys) out[k] = encode((v as Record<string, unknown>)[k], sortKeys);
        return out;
    }
    return v;
}

function setMode(mode: Mode) {
    try {
        if (mode === null) window.localStorage.removeItem("glm-execution-mode");
        else window.localStorage.setItem("glm-execution-mode", mode);
    } catch {
        // storage blocked (verification of the default path)
    }
}

async function runCompute(mod: Mod, dataset: string, mode: Mode) {
    setMode(mode);
    const t0 = performance.now();
    const out = mod === "multivariate"
        ? await computeMultivariate(mvPayload(MV_DATA[dataset]()))
        : await computeRepeatedMeasures(rmPayload(RM_DATA[dataset]()));
    return {
        mode: out.mode,
        ms: performance.now() - t0,
        exact: JSON.stringify(encode(out.results, false)),
        sorted: JSON.stringify(encode(out.results, true)),
        errors: out.errors,
    };
}

async function runAnalyze(mod: Mod, dataset: string, mode: Mode) {
    setMode(mode);
    const before = useResultStore.getState().logs.length;
    const t0 = performance.now();
    if (mod === "multivariate") await analyzeMultivariate(mvE2E(MV_DATA[dataset]()) as any);
    else await analyzeRepeatedMeasures(rmE2E(RM_DATA[dataset]()) as any);
    const ms = performance.now() - t0;
    const logs = useResultStore.getState().logs.slice(before);
    const outputs = logs.flatMap((l) =>
        (l.analytics ?? []).flatMap((a) =>
            (a.statistics ?? []).map((s) => ({
                analytic: a.title, title: s.title, description: s.description, output_data: s.output_data,
            }))
        )
    );
    const ends = performance.getEntriesByName("glm-analysis-end", "mark") as PerformanceMark[];
    return {
        ms,
        endDetail: ends.length ? ends[ends.length - 1].detail : null,
        nStarts: performance.getEntriesByName("glm-analysis-start", "mark").length,
        nEnds: ends.length,
        logsAdded: logs.length,
        nOutputs: outputs.length,
        outputs: JSON.stringify(outputs),
    };
}

// Error path: an invalid config makes the Rust constructor throw.
async function runBadCompute(mod: Mod, mode: Mode) {
    setMode(mode);
    try {
        if (mod === "multivariate") await computeMultivariate({ ...mvPayload(mvA()), config_data: null });
        else await computeRepeatedMeasures({ ...rmPayload(rmA()), config_data: null });
        return { threw: false };
    } catch (err: any) {
        return { threw: true, name: err?.name ?? null, asString: String(err) };
    }
}

// ───────────── memory diagnosis (compare_web_workers.md, Bagian B) ─────────────

// Main mode: the production path (compute… with mode "main"), then the size
// of the main-thread WASM memory. The memory object is captured by the init
// script in scripts/memory-diagnosis.cjs (window.__mainWasmMemories); run one
// module per page so the last captured memory belongs to that module.
async function runMemoryMain(mod: Mod, dataset: string, forceGc: boolean) {
    setMode("main");
    // Build the payload before timing, as in the earlier measurements.
    const mvInput = mod === "multivariate" ? mvPayload(MV_DATA[dataset]()) : null;
    const rmInput = mod === "repeated-measures" ? rmPayload(RM_DATA[dataset]()) : null;
    const gc = (window as any).gc;
    if (forceGc && typeof gc === "function") gc();
    const t0 = performance.now();
    const out = mvInput ? await computeMultivariate(mvInput) : await computeRepeatedMeasures(rmInput!);
    const ms = performance.now() - t0;
    const memories: WebAssembly.Memory[] = (window as any).__mainWasmMemories ?? [];
    return {
        mode: out.mode,
        ms,
        wasmBytes: memories.length ? memories[memories.length - 1].buffer.byteLength : null,
        instantiations: memories.length,
        gcCalled: forceGc && typeof gc === "function",
    };
}

// Worker mode: the production worker module inside memory-probe-worker.js,
// reused across runs like GlmWorkerClient does, with the same message contract.
let probeWorker: Worker | null = null;
let probeId = 0;

async function runMemoryWorkerProbe(dataset: string) {
    if (!probeWorker) {
        probeWorker = new Worker(new URL("./memory-probe-worker.js", import.meta.url), { type: "module" });
    }
    const worker = probeWorker;
    const payload = mvPayload(MV_DATA[dataset]());
    const id = ++probeId;
    const t0 = performance.now();
    const reply: any = await new Promise((resolve, reject) => {
        const onMessage = (e: MessageEvent) => {
            if (e.data?.id !== id) return;
            worker.removeEventListener("message", onMessage);
            resolve(e.data);
        };
        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", (e) => reject(new Error(e.message)), { once: true });
        worker.postMessage({ id, payload });
    });
    const ms = performance.now() - t0;
    return {
        ok: reply.ok,
        ms,
        wasmBytes: reply.__probe?.wasmBytes ?? null,
        instantiations: reply.__probe?.instantiations ?? null,
        error: reply.ok ? null : reply.error,
    };
}

export default function GlmWorkerVerifyPage() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        (window as any).__glmHarness = {
            runCompute, runAnalyze, runBadCompute, runMemoryMain, runMemoryWorkerProbe,
        };
        setReady(true);
    }, []);
    return <div id="harness" data-ready={ready ? "1" : "0"}>GLM worker verification harness</div>;
}
