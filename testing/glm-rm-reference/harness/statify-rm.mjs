// Node harness for the GLM Repeated Measures WASM (the same rust/pkg the app
// loads). Builds the payload the way repeated-measures-analysis.ts does and
// returns the plain result object, so reference datasets can be run without
// the browser.
//
//   const rm = await loadRm();                       // fresh module instance
//   const payload = buildPayload({ csv, design });   // see designs.mjs
//   const { results, errors } = run(rm, payload);
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, "../../..");
export const PKG = path.join(REPO, "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg");
const TEMPLATE = JSON.parse(fs.readFileSync(path.join(here, "config-template.json"), "utf8"));

let generation = 0;
/** Loads rust/pkg as a NEW module instance (own WASM memory and state). */
export async function loadRm(pkgDir = PKG) {
    const mod = await import(pathToFileURL(path.join(pkgDir, "wasm.js")).href + `?instance=${generation++}`);
    await mod.default({ module_or_path: fs.readFileSync(path.join(pkgDir, "wasm_bg.wasm")) });
    return mod;
}

export function readCsv(file) {
    const [head, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
    const cols = head.split(",");
    return lines.map((l) => {
        const v = l.split(",");
        return Object.fromEntries(cols.map((c, i) => [c, v[i] === "" ? null : Number.isFinite(Number(v[i])) ? Number(v[i]) : v[i]]));
    });
}

const varDef = (name, i, { nominal = false, string = false } = {}) => ({
    id: i + 1, columnIndex: i, name, type: string ? "STRING" : "NUMERIC", width: 8, decimals: string ? 0 : 2,
    label: "", values: [], missing: [], columns: 72, align: string ? "left" : "right",
    measure: nominal ? "nominal" : "scale", role: "input",
});

/**
 * design = {
 *   factors: [{ name: "waktu", levels: 3 }],            // within factors (DefFactors)
 *   measures: [{ name: "cemas", columns: ["cemas1", …] }], // one column per cell, factor levels in order
 *   between: ["kelompok"], covariates: [],
 *   options: { DescStats: true, … }, emmeans: { TargetList: [...], … },
 * }
 * Layout of factors_data / covar_data: "variable-major" (default) is the
 * layout of the service since Tahap 2 (factors_data[f][s]); "subject-major"
 * reproduces the service before Tahap 2 (one array per subject).
 */
export function buildPayload({ rows, design, layout = "variable-major" }) {
    const cfg = JSON.parse(JSON.stringify(TEMPLATE));
    const levelTuples = cellLevels(design.factors);
    const encoded = [];
    const subjectCols = [];
    for (const m of design.measures) {
        m.columns.forEach((col, c) => {
            encoded.push(`${col}_(${levelTuples[c].join(",")},${m.name})`);
            subjectCols.push(col);
        });
    }
    const between = design.between || [];
    const covariates = design.covariates || [];
    cfg.main.SubVar = encoded;
    cfg.main.FactorsVar = between.length ? between : null;
    cfg.main.Covariates = covariates.length ? covariates : null;
    cfg.model.DefFactors = design.factors.map((f) => f.name).join(";");
    cfg.model.BetSubVar = design.betSubVar ?? [...between, ...covariates];
    cfg.emmeans.SrcList = [...between];
    if (design.plotsSrc !== false) cfg.plots.SrcList = between.length ? [...between] : null;
    if (between.length) cfg.posthoc.SrcList = [...between];
    cfg.options = { ...cfg.options, ...(design.options || {}) };
    cfg.emmeans = { ...cfg.emmeans, ...(design.emmeans || {}) };

    const subject_data = rows.map((r) => [Object.fromEntries(subjectCols.map((col, i) => [encoded[i], r[col]]))]);
    const perSubject = (names) => rows.map((r) => [Object.fromEntries(names.map((n) => [n, r[n]]))]);
    const perVariable = (names) => names.map((n) => rows.map((r) => ({ [n]: r[n] })));
    const shape = layout === "subject-major" ? perSubject : perVariable;
    const isString = (n) => rows.some((r) => typeof r[n] === "string");
    return {
        subject_data,
        factors_data: between.length ? shape(between) : [],
        covar_data: covariates.length ? shape(covariates) : [],
        subject_data_defs: encoded.map((n, i) => [varDef(n, i)]),
        factors_data_defs: between.map((n, i) => [varDef(n, subjectCols.length + i, { nominal: true, string: isString(n) })]),
        covar_data_defs: covariates.map((n, i) => [varDef(n, subjectCols.length + between.length + i)]),
        config_data: cfg,
    };
}

// Level tuples of all within cells in the order the Define dialog lists them
// (last factor changes fastest): 2 factors a(2) × b(3) → [1,1],[1,2],[1,3],[2,1]…
function cellLevels(factors) {
    let tuples = [[]];
    for (const f of factors) {
        const next = [];
        for (const t of tuples) for (let l = 1; l <= f.levels; l++) next.push([...t, l]);
        tuples = next;
    }
    return tuples;
}

export const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));

/** Runs one analysis; a panic is returned as { panic } (the instance is unusable afterwards). */
export function run(mod, p) {
    let a;
    try {
        a = new mod.RepeatedMeasureAnalysis(p.subject_data, p.factors_data, p.covar_data, p.subject_data_defs, p.factors_data_defs, p.covar_data_defs, p.config_data);
        return { results: plain(a.get_formatted_results()), errors: String(a.get_all_errors()) };
    } catch (e) {
        return { panic: String(e && e.message ? e.message : e).split(/\r?\n/)[0] };
    } finally {
        try { a?.free(); } catch { /* ignore */ }
    }
}
