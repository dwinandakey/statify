// Bagian A (diagnosis): is the between factor silently ignored in the tables
// that DO appear for a mixed design? Runs the captured app payload (mixed
// design) and the same payload without the between factor, then compares the
// within-subjects effects and multivariate tests.
// Usage: node compare-within-only.mjs <capture.json>
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "../../../../frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg");
const { default: init, RepeatedMeasureAnalysis } = await import(pathToFileURL(path.join(pkg, "wasm.js")).href);
await init({ module_or_path: fs.readFileSync(path.join(pkg, "wasm_bg.wasm")) });
const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));
const run = (p) => {
    const a = new RepeatedMeasureAnalysis(p.subject_data, p.factors_data, p.covar_data, p.subject_data_defs, p.factors_data_defs, p.covar_data_defs, p.config_data);
    try { return plain(a.get_formatted_results()); } finally { a.free(); }
};

const cap = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const report = {};
for (const [label, p] of [["run1", cap.payloads[0].payload], ["run2", cap.payloads[1].payload]]) {
    const mixed = run(p);
    const withinOnlyCfg = JSON.parse(JSON.stringify(p.config_data));
    withinOnlyCfg.main.FactorsVar = null;
    withinOnlyCfg.model.BetSubVar = [];
    const withinOnly = run({ ...p, factors_data: [], factors_data_defs: [], config_data: withinOnlyCfg });
    const sameWithin = JSON.stringify(mixed.tests_of_within_subjects_effects) === JSON.stringify(withinOnly.tests_of_within_subjects_effects);
    const withinSources = (r) => JSON.stringify(r.tests_of_within_subjects_effects).match(/"source":"[^"]+"|"[A-Za-z()*_ ]+":\{"sum_of_squares/g)?.slice(0, 12);
    report[label] = {
        withinEffectsIdenticalToWithinOnly: sameWithin,
        mixedWithinSources: withinSources(mixed),
        mixedMultivariateEffects: Object.keys(mixed.multivariate_tests?.effects ?? {}),
        withinOnlyMultivariateEffects: Object.keys(withinOnly.multivariate_tests?.effects ?? {}),
        mixedMultivariateGroup: JSON.stringify(mixed.multivariate_tests?.effects?.group ?? null).slice(0, 400),
    };
    console.log(label, JSON.stringify(report[label], null, 1));
}
fs.writeFileSync(path.join(path.dirname(process.argv[2]), `compare-within-only-${path.basename(process.argv[2])}`), JSON.stringify(report, null, 2));
