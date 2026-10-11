// Bagian A (diagnosis): replay the payloads captured from the app in Node with
// the SAME rust/pkg binary, outside any browser or worker.
//  1. payload as sent by the app                  → does the error reproduce?
//  2. same data, factors_data in variable-major layout (as the Jest tests build it)
//  3. config_data of run 1 vs run 2 (what changes between the first and later runs)
//  4. same payload twice in one WASM instance      → any state kept between analyses?
// Usage: node diagnose.mjs <capture.json> [<capture.json> ...]
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "../../../../frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg");
const { default: init, RepeatedMeasureAnalysis } = await import(pathToFileURL(path.join(pkg, "wasm.js")).href);
await init({ module_or_path: fs.readFileSync(path.join(pkg, "wasm_bg.wasm")) });

const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));

function run(p) {
    const a = new RepeatedMeasureAnalysis(p.subject_data, p.factors_data, p.covar_data, p.subject_data_defs, p.factors_data_defs, p.covar_data_defs, p.config_data);
    try {
        return { results: plain(a.get_formatted_results()), errors: a.get_all_errors() };
    } finally {
        a.free();
    }
}

function describe(label, out) {
    const r = out.results;
    const bse = r.tests_of_between_subjects_effects;
    const bseSources = bse ? Object.keys(bse.sources ?? bse.effects ?? bse) : [];
    const within = r.tests_of_within_subjects_effects;
    const withinKeys = within ? Object.keys(within.measures ?? within) : [];
    const mv = r.multivariate_tests;
    console.log(`  ${label}`);
    console.log(`    errors: ${String(out.errors).replace(/\s+/g, " ").slice(0, 220)}`);
    console.log(`    result keys: ${Object.keys(r).filter((k) => r[k] != null).join(", ")}`);
    console.log(`    between-subjects effects: ${JSON.stringify(bse)?.slice(0, 300)}`);
    console.log(`    multivariate effects: ${mv ? JSON.stringify(Object.keys(mv.effects ?? mv)).slice(0, 200) : "-"}`);
    console.log(`    univariate tests present: ${r.univariate_tests != null}`);
    return { bseSources, withinKeys };
}

function diff(a, b, p = "") {
    const out = [];
    if (JSON.stringify(a) === JSON.stringify(b)) return out;
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out.push(...diff(a[k], b[k], p ? `${p}.${k}` : k));
        return out;
    }
    return [`${p}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
}

const report = {};
for (const file of process.argv.slice(2)) {
    const cap = JSON.parse(fs.readFileSync(file, "utf8"));
    const [p1, p2] = cap.payloads.map((m) => m.payload);
    console.log(`\n=== ${path.basename(file)} (n=${cap.n}, groups=${cap.groups})`);
    console.log(`  factors_data shape: outer=${p1.factors_data.length}, inner lengths=${[...new Set(p1.factors_data.map((g) => g.length))]}`);
    console.log(`  factors_data_defs: ${JSON.stringify(p1.factors_data_defs.map((g) => g.map((d) => d.name)))}`);
    console.log(`  subject_data shape: outer=${p1.subject_data.length}, first record keys=${Object.keys(p1.subject_data[0][0]).join(",")}`);
    console.log(`  config.main: ${JSON.stringify(p1.config_data.main)}`);

    const asSent = run(p1);
    describe("1. run-1 payload as sent by the app", asSent);
    const variableMajor = { ...p1, factors_data: [p1.factors_data.map((g) => g[0])] };
    const vm = run(variableMajor);
    describe("2. same data, factors_data variable-major ([[all subjects]])", vm);

    const cfgDiff = diff(p1.config_data, p2.config_data);
    console.log(`  3. config_data run 1 → run 2: ${cfgDiff.length ? "\n     " + cfgDiff.join("\n     ") : "identical"}`);
    const dataSame = JSON.stringify({ ...p1, config_data: null }) === JSON.stringify({ ...p2, config_data: null });
    console.log(`     data/defs run 1 vs run 2 identical: ${dataSame}`);
    const run2 = run(p2);
    describe("   run-2 payload as sent", run2);

    const again = run(p1);
    console.log(`  4. run-1 payload replayed in the same instance: identical output (keys sorted) = ${JSON.stringify(sortKeys(again.results)) === JSON.stringify(sortKeys(asSent.results))}`);
    report[path.basename(file)] = { asSent, variableMajor: vm, run2, cfgDiff, dataSame };
}

function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
    return v;
}

const outFile = path.join(path.dirname(process.argv[2]), "diagnose-report.json");
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log("\nreport:", outFile);
