// Diagnosis of the failing multivariate.test.ts (compare_web_workers.md, Bagian C).
// Evaluates EVERY assertion of the test individually against the current
// engine (rust/pkg, the binary Jest uses) and recomputes the failing
// statistics independently from textbook formulas. Changes nothing.
//
// Usage (from repo root): node testing/glm-web-worker/scripts/multivariate-test-diagnosis.mjs [outDir]
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const pkgDir = path.join(repo, "frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg");
const outDir = process.argv[2] || path.join(here, "..", "results", "latest");

const { default: init, MultivariateAnalysis } = await import(pathToFileURL(path.join(pkgDir, "wasm.js")).href);
await init({ module_or_path: fs.readFileSync(path.join(pkgDir, "wasm_bg.wasm")) });

// ───────── builders copied verbatim from multivariate/__test__/multivariate.test.ts ─────────
const numericDef = (name, columnIndex) => ({
    id: null, columnIndex, name, type: "NUMERIC", width: 8, decimals: 3, label: name,
    values: [], missing: [], columns: 8, align: "right", measure: "scale", role: "input",
});
const nominalDef = (name, columnIndex) => ({
    id: null, columnIndex, name, type: "STRING", width: 16, decimals: 0, label: name,
    values: [], missing: [], columns: 16, align: "left", measure: "nominal", role: "input",
});
const buildConfig = (depVars, factors, covars) => ({
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
const buildInputs = (records, depVars, factors, covars) => ({
    depData: [records],
    fixFactorData: factors.map(() => [...records]),
    covarData: covars.length > 0 ? covars.map(() => [...records]) : null,
    wlsData: null,
    depDefs: [depVars.map((v, i) => numericDef(v, i))],
    fixFactorDefs: factors.map((f, i) => [nominalDef(f, depVars.length + i)]),
    covarDefs: covars.length > 0 ? covars.map((c, i) => [numericDef(c, depVars.length + factors.length + i)]) : null,
    wlsDefs: null,
    config: buildConfig(depVars, factors, covars),
    // kept for the independent recomputation below
    _records: records, _depVars: depVars, _factors: factors, _covars: covars,
});
const datasetA = () => {
    const records = [];
    const noise1 = [-1.2, -0.9, -0.6, -0.3, 0.0, 0.2, 0.5, 0.8, 1.1, 1.4];
    const noise2 = [1.1, 0.8, 0.5, 0.2, 0.0, -0.1, -0.3, -0.6, -0.9, -1.2];
    ["A", "B", "C"].forEach((group, gIdx) => {
        for (let i = 0; i < 10; i += 1) records.push({ Group: group, Y1: 10 + gIdx * 4 + noise1[i], Y2: 20 + gIdx * 3 + noise2[i] });
    });
    return buildInputs(records, ["Y1", "Y2"], ["Group"], []);
};
const datasetB = () => {
    const records = [];
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
    return buildInputs(records, ["Y1", "Y2", "Y3"], ["Group", "Treatment"], ["Cov1"]);
};
const datasetC = () => {
    const records = [];
    [["setosa", 8], ["versicolor", 11], ["virginica", 13]].forEach(([species, n], speciesIdx) => {
        for (let i = 0; i < n; i += 1) {
            const phase = i * 0.25;
            records.push({
                Species: species,
                SepalLength: 5 + speciesIdx * 0.9 + Math.sin(phase) * 0.3 + i * 0.03,
                SepalWidth: 3.4 - speciesIdx * 0.25 + Math.cos(phase) * 0.2 - i * 0.01,
            });
        }
    });
    return buildInputs(records, ["SepalLength", "SepalWidth"], ["Species"], []);
};
const run = (inputs) => {
    const analysis = new MultivariateAnalysis(
        inputs.depData, inputs.fixFactorData, inputs.covarData, inputs.wlsData,
        inputs.depDefs, inputs.fixFactorDefs, inputs.covarDefs, inputs.wlsDefs, inputs.config
    );
    return analysis.get_formatted_results();
};
const get = (c, k) => (!c ? undefined : c instanceof Map ? c.get(k) : c[k]);
const nested = (c, keys) => keys.reduce((acc, k) => get(acc, k), c);
const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));

// ───────── every assertion of the test, evaluated individually ─────────
// toBeCloseTo(e, 6) passes when |actual - e| < 10^-6 / 2.
const closeTo = (a, e, p = 6) => typeof a === "number" && Math.abs(a - e) < Math.pow(10, -p) / 2;
const rows = [];
function check(dataset, statistic, matcher, expected, actual) {
    let pass;
    if (matcher === "toBeDefined") pass = actual !== undefined;
    else if (matcher === "toBe") pass = Object.is(actual, expected);
    else if (matcher === "toBeGreaterThanOrEqual") pass = actual >= expected;
    else if (matcher === "toBeCloseTo(6)") pass = closeTo(actual, expected);
    const numeric = typeof actual === "number" && typeof expected === "number";
    rows.push({
        dataset, statistic, matcher,
        expected: matcher === "toBeDefined" ? "defined" : expected,
        actual: matcher === "toBeDefined" ? (actual === undefined ? "undefined" : "defined") : actual,
        difference: numeric ? actual - expected : null,
        pass,
    });
}

const A = datasetA(); const rA = run(A);
check("A", "multivariate_tests", "toBeDefined", null, rA.multivariate_tests);
check("A", "tests_of_between_subjects_effects", "toBeDefined", null, rA.tests_of_between_subjects_effects);
check("A", "parameter_estimates", "toBeDefined", null, rA.parameter_estimates);
check("A", "box_test", "toBeDefined", null, rA.box_test);
check("A", "box_test.df1", "toBe", 6, rA.box_test?.df1);
check("A", "box_test.f", "toBeGreaterThanOrEqual", 0, rA.box_test?.f);
const aY1Group = nested(rA.tests_of_between_subjects_effects?.effects, ["Y1", "Group"]);
check("A", "between-subjects Y1 × Group", "toBeDefined", null, aY1Group);
check("A", "between-subjects Y1 × Group .df", "toBe", 2, aY1Group?.df);
const aPillai = nested(rA.multivariate_tests?.effects, ["Group", "Pillai's Trace"]);
check("A", "Group Pillai's Trace", "toBeDefined", null, aPillai);
check("A", "Group Pillai's Trace .value", "toBeCloseTo(6)", 0, aPillai?.value);

const B = datasetB(); const rB = run(B);
check("B", "multivariate_tests Group*Treatment", "toBeDefined", null, get(rB.multivariate_tests?.effects, "Group*Treatment"));
const bY3Group = nested(rB.tests_of_between_subjects_effects?.effects, ["Y3", "Group"]);
check("B", "between-subjects Y3 × Group", "toBeDefined", null, bY3Group);
check("B", "between-subjects Y3 × Group .df", "toBe", 2, bY3Group?.df);
check("B", "box_test.df1", "toBe", 30, rB.box_test?.df1);
check("B", "box_test.f", "toBeGreaterThanOrEqual", 0, rB.box_test?.f);
const bPillai = nested(rB.multivariate_tests?.effects, ["Group", "Pillai's Trace"]);
check("B", "Group Pillai's Trace", "toBeDefined", null, bPillai);
check("B", "Group Pillai's Trace .f", "toBeCloseTo(6)", 0, bPillai?.f);

const C = datasetC(); const rC = run(C);
check("C", "multivariate_tests Species", "toBeDefined", null, get(rC.multivariate_tests?.effects, "Species"));
const cSL = nested(rC.tests_of_between_subjects_effects?.effects, ["SepalLength", "Species"]);
check("C", "between-subjects SepalLength × Species", "toBeDefined", null, cSL);
check("C", "between-subjects SepalLength × Species .df", "toBe", 2, cSL?.df);
check("C", "box_test.box_m", "toBeCloseTo(6)", 10.393282721313454, rC.box_test?.box_m);
check("C", "box_test.f", "toBeCloseTo(6)", 1.5497442954550478, rC.box_test?.f);
check("C", "box_test.significance", "toBeCloseTo(6)", 0.1975627435596765, rC.box_test?.significance);

// ───────── independent recomputation (textbook formulas, no engine code) ─────────
const T = (M) => M[0].map((_, j) => M.map((r) => r[j]));
const mul = (X, Y) => X.map((r) => Y[0].map((_, j) => r.reduce((s, v, k) => s + v * Y[k][j], 0)));
const add = (X, Y) => X.map((r, i) => r.map((v, j) => v + Y[i][j]));
const trace = (M) => M.reduce((s, r, i) => s + r[i], 0);
function inv(M) {
    const n = M.length, A = M.map((r, i) => [...r, ...M.map((_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
        let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        [A[c], A[p]] = [A[p], A[c]];
        const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
        for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map((r) => r.slice(n));
}
function det(M) {
    const n = M.length, A = M.map((r) => [...r]); let d = 1;
    for (let c = 0; c < n; c++) {
        let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        if (p !== c) { [A[c], A[p]] = [A[p], A[c]]; d = -d; }
        d *= A[c][c];
        for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let j = c; j < n; j++) A[r][j] -= f * A[c][j]; }
    }
    return d;
}
// Regularised incomplete beta (Numerical Recipes betacf) → F upper tail.
function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015;
    for (const v of c) s += v / ++y;
    return -t + Math.log((2.5066282746310005 * s) / x);
}
function betacf(a, b, x) {
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap;
    d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d); let h = d;
    for (let m = 1; m <= 1000; m++) {
        const m2 = 2 * m; let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
        d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d); c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; h *= d * c;
        aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
        d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d); c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
        const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
}
function ibeta(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}
const fUpperTail = (F, d1, d2) => ibeta(d2 / 2, d1 / 2, d2 / (d2 + d1 * F));

function pillaiFromHE(H, E, p, q, dfe) {
    const V = trace(mul(H, inv(add(H, E))));
    const s = Math.min(p, q), m = (Math.abs(p - q) - 1) / 2, n = (dfe - p - 1) / 2;
    const F = ((2 * n + s + 1) / (2 * m + s + 1)) * (V / (s - V));
    return { value: V, f: F, df1: s * (2 * m + s + 1), df2: s * (2 * n + s + 1), significance: fUpperTail(F, s * (2 * m + s + 1), s * (2 * n + s + 1)) };
}

// Full-rank GLM with sigma-restricted (effect) coding → SPSS Type III hypothesis for one effect.
function effectCode(levels, value) { return levels.slice(0, -1).map((l) => (value === l ? 1 : value === levels[levels.length - 1] ? -1 : 0)); }
function typeIIIPillai(inputs, factorForHypothesis, { includeCovariates = true } = {}) {
    const { _records: recs, _depVars: dvs, _factors: fs_ } = inputs;
    const cvs = includeCovariates ? inputs._covars : [];
    const levels = Object.fromEntries(fs_.map((f) => [f, [...new Set(recs.map((r) => r[f]))]]));
    const cols = []; // [name, fn(record) -> number[]]
    cols.push(["Intercept", () => [1]]);
    for (const c of cvs) cols.push([c, (r) => [r[c]]]);
    for (const f of fs_) cols.push([f, (r) => effectCode(levels[f], r[f])]);
    if (fs_.length === 2) cols.push([fs_.join("*"), (r) => {
        const a = effectCode(levels[fs_[0]], r[fs_[0]]), b = effectCode(levels[fs_[1]], r[fs_[1]]);
        return a.flatMap((x) => b.map((y) => x * y));
    }]);
    const X = recs.map((r) => cols.flatMap(([, fn]) => fn(r)));
    const Y = recs.map((r) => dvs.map((d) => r[d]));
    const widths = cols.map(([, fn]) => fn(recs[0]).length);
    const XtXi = inv(mul(T(X), X));
    const Bh = mul(XtXi, mul(T(X), Y));
    const R = Y.map((y, i) => y.map((v, j) => v - X[i].reduce((s, x, k) => s + x * Bh[k][j], 0)));
    const E = mul(T(R), R);
    const start = widths.slice(0, cols.findIndex(([n]) => n === factorForHypothesis)).reduce((a, b) => a + b, 0);
    const q = widths[cols.findIndex(([n]) => n === factorForHypothesis)];
    const L = Array.from({ length: q }, (_, i) => X[0].map((_, j) => (j === start + i ? 1 : 0)));
    const LB = mul(L, Bh);
    const H = mul(T(LB), mul(inv(mul(L, mul(XtXi, T(L)))), LB));
    return pillaiFromHE(H, E, dvs.length, q, recs.length - X[0].length);
}

// Residual SSCP of the full model and its smallest eigenvalue (Jacobi, symmetric).
function residualMinEigen(inputs, includeCovariates) {
    const { _records: recs, _depVars: dvs, _factors: fs_ } = inputs;
    const cvs = includeCovariates ? inputs._covars : [];
    const levels = Object.fromEntries(fs_.map((f) => [f, [...new Set(recs.map((r) => r[f]))]]));
    const X = recs.map((r) => {
        const row = [1, ...cvs.map((c) => r[c])];
        const codes = fs_.map((f) => effectCode(levels[f], r[f]));
        row.push(...codes.flat());
        if (fs_.length === 2) row.push(...codes[0].flatMap((x) => codes[1].map((y) => x * y)));
        return row;
    });
    const Y = recs.map((r) => dvs.map((d) => r[d]));
    const Bh = mul(inv(mul(T(X), X)), mul(T(X), Y));
    const R = Y.map((y, i) => y.map((v, j) => v - X[i].reduce((s, x, k) => s + x * Bh[k][j], 0)));
    const A = mul(T(R), R).map((r) => [...r]);
    const n = A.length;
    for (let sweep = 0; sweep < 100; sweep++) {
        for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
            if (Math.abs(A[p][q]) < 1e-300) continue;
            const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
            const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
            const c = 1 / Math.sqrt(t * t + 1), s = t * c;
            for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
            for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        }
    }
    const eig = A.map((r, i) => r[i]).sort((a, b) => a - b);
    return { eigenvalues: eig, dfe: recs.length - X[0].length };
}

function boxM(inputs) {
    const { _records: recs, _depVars: dvs, _factors: [f] } = inputs;
    const p = dvs.length, groups = [...new Set(recs.map((r) => r[f]))];
    const cov = (rows) => {
        const n = rows.length, mean = dvs.map((_, j) => rows.reduce((s, r) => s + r[j], 0) / n);
        return dvs.map((_, i) => dvs.map((_, j) => rows.reduce((s, r) => s + (r[i] - mean[i]) * (r[j] - mean[j]), 0) / (n - 1)));
    };
    const g = groups.map((lv) => { const rows = recs.filter((r) => r[f] === lv).map((r) => dvs.map((d) => r[d])); return { n: rows.length, S: cov(rows) }; });
    const k = g.length, N = g.reduce((s, x) => s + x.n, 0);
    const Sp = dvs.map((_, i) => dvs.map((_, j) => g.reduce((s, x) => s + (x.n - 1) * x.S[i][j], 0) / (N - k)));
    const M = (N - k) * Math.log(det(Sp)) - g.reduce((s, x) => s + (x.n - 1) * Math.log(det(x.S)), 0);
    const df1 = ((k - 1) * p * (p + 1)) / 2;
    const c1 = (g.reduce((s, x) => s + 1 / (x.n - 1), 0) - 1 / (N - k)) * ((2 * p * p + 3 * p - 1) / (6 * (p + 1) * (k - 1)));
    const c2 = (g.reduce((s, x) => s + 1 / (x.n - 1) ** 2, 0) - 1 / (N - k) ** 2) * (((p - 1) * (p + 2)) / (6 * (k - 1)));
    // Old engine (box_m_test.rs @ 5773f1dfd): "F-like" = (1 - c1) M / df1, df2 = N - k.
    const oldF = ((1 - c1) * M) / df1;
    // Box (1949) F approximation (the two-case form documented for SPSS).
    let box;
    if (c2 > c1 * c1) {
        const df2 = (df1 + 2) / (c2 - c1 * c1), b = df1 / (1 - c1 - df1 / df2), F = M / b;
        box = { case: "c2 > c1^2", df2, F, significance: fUpperTail(F, df1, df2) };
    } else {
        const df2 = (df1 + 2) / (c1 * c1 - c2), b = df2 / (1 - c1 + 2 / df2), F = (df2 * M) / (df1 * (b - M));
        box = { case: "c2 <= c1^2", df2, F, significance: fUpperTail(F, df1, df2) };
    }
    return {
        M, c1, c2, df1,
        oldEngineFormula: { F: oldF, df2: N - k, significance: fUpperTail(oldF, df1, N - k) },
        box1949: box,
    };
}

const independent = {
    A_groupPillai: typeIIIPillai(A, "Group"),
    B_groupPillai: typeIIIPillai(B, "Group"),
    // Same model WITHOUT the covariate Cov1: tests whether the engine's error df
    // (106 → dfe 54) and value correspond to a model that ignores Cov1.
    B_groupPillai_withoutCovariate: typeIIIPillai(B, "Group", { includeCovariates: false }),
    // Smallest eigenvalue of the residual SSCP with Cov1 in the model: ~0 means
    // E is singular (Y1 − 2·Y3 is an exact linear function of cell and Cov1).
    B_residualSSCP_minEigen_withCovariate: residualMinEigen(B, true),
    B_residualSSCP_minEigen_withoutCovariate: residualMinEigen(B, false),
    C_boxM: boxM(C),
};
const engine = {
    A_groupEffect: plain(get(rA.multivariate_tests?.effects, "Group")),
    B_groupPillai: plain(bPillai),
    // Rows (and df) of the univariate table for Y1: shows whether Cov1 is part
    // of the model there, to compare with the multivariate test's error df.
    B_betweenSubjects_Y1: Object.fromEntries(
        Object.entries(plain(rB.tests_of_between_subjects_effects)?.effects?.Y1 ?? {}).map(([k, v]) => [k, { df: v.df, sum_of_squares: v.sum_of_squares }])
    ),
    B_multivariateEffects: Object.keys(plain(rB.multivariate_tests)?.effects ?? {}),
    B_boxTest: plain(rB.box_test),
    C_boxTest: plain(rC.box_test),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "multivariate-test-diagnosis.json"), JSON.stringify({ rows, engine, independent }, null, 2));
console.table(rows.map((r) => ({ ...r, difference: r.difference == null ? "" : r.difference })));
console.log("engine A Group effect:", JSON.stringify(engine.A_groupEffect));
console.log("engine B Group Pillai:", JSON.stringify(engine.B_groupPillai));
console.log("engine C box_test:", JSON.stringify(engine.C_boxTest));
console.log("independent:", JSON.stringify(independent, null, 1));
