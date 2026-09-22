// Bagian B (pilot): are Repeated Measures results the same when the same
// payload is computed several times? Node, same rust/pkg binary as the app.
//  - "same instance": k computations in ONE WASM module instance (as the app
//    does: the worker and the main-thread module are both reused);
//  - "fresh instance": every computation in a newly loaded module instance.
// For every pair of results: exactly equal? equal after sorting arrays
// (order only)? largest absolute / relative numeric difference?
// Usage: node output-stability.mjs <template-capture.json> <outFile> [n=2500] [L=10] [M=2] [k=4]
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "../../../../frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg");
let generation = 0;
async function load() {
    const mod = await import(pathToFileURL(path.join(pkg, "wasm.js")).href + `?instance=${generation++}`);
    await mod.default({ module_or_path: fs.readFileSync(path.join(pkg, "wasm_bg.wasm")) });
    return mod.RepeatedMeasureAnalysis;
}

const [templateFile, outFile, nArg, lArg, mArg, kArg] = process.argv.slice(2);
const template = JSON.parse(fs.readFileSync(templateFile, "utf8")).payloads[0].payload;
const n = Number(nArg || 2500), L = Number(lArg || 10), M = Number(mArg || 2), K = Number(kArg || 4);
// DEFAULT_OPTIONS=1: the dialog defaults (first experiment); otherwise the Bagian B option set.
const options = process.env.DEFAULT_OPTIONS === "1" ? {} : { DescStats: true, EstEffectSize: true, ObsPower: true };

// Same payload shape as pilot-node.mjs.
function payload() {
    const measures = Array.from({ length: M }, (_, m) => (m === 0 ? "score" : `score${m + 1}`));
    const cells = [];
    measures.forEach((meas, m) => { for (let l = 1; l <= L; l++) cells.push({ real: M === 1 ? `t${l}` : `m${m + 1}t${l}`, l, meas }); });
    const names = cells.map((c) => `${c.real}_(${c.l},${c.meas})`);
    const subject_data = [];
    for (let s = 0; s < n; s++) {
        const rec = {};
        cells.forEach((c, i) => { rec[names[i]] = 10 + c.l * 1.5 + (s % 50) * 0.1 + Math.sin(s + i) * 0.7 + (c.meas === "score" ? 0 : 3); });
        subject_data.push([rec]);
    }
    const cfg = JSON.parse(JSON.stringify(template.config_data));
    cfg.main.SubVar = names;
    cfg.options = { ...cfg.options, ...options };
    const def = (nm, i) => ({ ...template.subject_data_defs[0][0], name: nm, label: nm, columnIndex: i });
    return { subject_data, factors_data: [], covar_data: [], subject_data_defs: names.map((nm, i) => [def(nm, i)]), factors_data_defs: [], covar_data_defs: [], config_data: cfg };
}

const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));
function compute(Cls, p) {
    const a = new Cls(p.subject_data, p.factors_data, p.covar_data, p.subject_data_defs, p.factors_data_defs, p.covar_data_defs, p.config_data);
    const res = plain(a.get_formatted_results());
    a.free();
    return res;
}

// Canonical form with every array sorted (by its JSON) and numbers rounded, to separate ordering from values.
const canon = (v, digits) => {
    if (Array.isArray(v)) return v.map((x) => canon(x, digits)).map((x) => JSON.stringify(x)).sort().map((x) => JSON.parse(x));
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k], digits)]));
    if (typeof v === "number" && digits != null) return Number(v.toPrecision(digits));
    return v;
};
// Largest numeric difference between two results at the same path (arrays by index).
function maxDiff(a, b, acc = { abs: 0, rel: 0, paths: 0, where: null }, p = "") {
    if (typeof a === "number" && typeof b === "number") {
        const d = Math.abs(a - b);
        if (d > 0) {
            acc.paths++;
            const rel = d / Math.max(Math.abs(a), Math.abs(b));
            if (d > acc.abs) { acc.abs = d; acc.where = p; }
            acc.rel = Math.max(acc.rel, rel);
        }
    } else if (a && b && typeof a === "object" && typeof b === "object") {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) maxDiff(a[k], b[k], acc, `${p}/${k}`);
    }
    return acc;
}
function compare(label, x, y) {
    const r = {
        label,
        exact: JSON.stringify(x) === JSON.stringify(y),
        sameAfterSortingArrays: JSON.stringify(canon(x)) === JSON.stringify(canon(y)),
        sameAfterSortingArrays12Digits: JSON.stringify(canon(x, 12)) === JSON.stringify(canon(y, 12)),
        numericDiffSamePositions: maxDiff(x, y),
        tablesDiffering: Object.keys(x).filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k])),
        // Tables whose values differ even after sorting every array (not only row order).
        tablesWithDifferentValues: Object.keys(x).filter((k) => JSON.stringify(canon(x[k], 12)) !== JSON.stringify(canon(y[k], 12))),
    };
    // Up to 5 differing leaves per such table after sorting arrays (full precision).
    r.valueDiffSamples = Object.fromEntries(r.tablesWithDifferentValues.map((k) => {
        const out = [];
        const walk = (u, v, p) => {
            if (out.length >= 5) return;
            if (u && v && typeof u === "object" && typeof v === "object") { for (const key of new Set([...Object.keys(u), ...Object.keys(v)])) walk(u[key], v[key], `${p}/${key}`); }
            else if (JSON.stringify(u) !== JSON.stringify(v)) out.push({ path: p, a: u, b: v });
        };
        walk(canon(x[k]), canon(y[k]), "");
        return [k, out];
    }));
    console.log(`${label.padEnd(34)} exact=${r.exact} sortedEqual=${r.sameAfterSortingArrays} sorted12=${r.sameAfterSortingArrays12Digits} maxAbsDiff=${r.numericDiffSamePositions.abs.toExponential(2)} order/values: ${r.tablesDiffering.length} tables, values: [${r.tablesWithDifferentValues.join(", ")}]`);
    return r;
}

const p = payload();
const Cls = await load();
const same = Array.from({ length: K }, () => compute(Cls, p));
const fresh = [];
for (let i = 0; i < 2; i++) fresh.push(compute(await load(), p));
const report = { n, L, M, K, options, comparisons: [] };
for (let i = 1; i < K; i++) report.comparisons.push(compare(`same instance: run 1 vs run ${i + 1}`, same[0], same[i]));
report.comparisons.push(compare("fresh instance 1 vs fresh 2", fresh[0], fresh[1]));
report.comparisons.push(compare("fresh 1 vs same-instance run 1", fresh[0], same[0]));
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log("written:", outFile);
