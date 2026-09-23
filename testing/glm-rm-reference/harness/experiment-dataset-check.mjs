// Checks a Repeated Measures dataset of the Web Worker experiment in Node:
// which result tables are computed and which messages the Errors Logs get.
// Configuration of the experiment's RM cells: within-only, time with L levels,
// M measures, DescStats + EstEffectSize + ObsPower, default contrast.
//   node experiment-dataset-check.mjs [--n=5000] [--levels=10] [--measures=1] [--variant=noise] [--out=<file.json>]
import fs from "fs";
import { createRequire } from "module";
import { loadRm, buildPayload, run } from "./statify-rm.mjs";

const require = createRequire(import.meta.url);
const { repeatedMeasuresRows, repeatedMeasuresRowsNoise, repeatedMeasuresColumns } = require("../../glm-web-worker/experiment/datasets.cjs");
const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const n = Number(opts.n ?? 5000), L = Number(opts.levels ?? 10), M = Number(opts.measures ?? 1);
const variant = opts.variant ?? "";
const { rows } = variant === "noise" ? repeatedMeasuresRowsNoise(n, L, M) : repeatedMeasuresRows(n, L, M);
const cols = repeatedMeasuresColumns(L, M);
const design = {
    factors: [{ name: "time", levels: L }],
    measures: Array.from({ length: M }, (_, i) => ({ name: i === 0 ? "score" : `score${i + 1}`, columns: cols.slice(i * L, (i + 1) * L) })),
    options: { DescStats: true, EstEffectSize: true, ObsPower: true },
};
const out = run(await loadRm(), buildPayload({ rows, design }));
const results = out.results ?? {};
const tables = Object.entries(results).filter(([k, v]) => k !== "executed_functions" && v != null).map(([k]) => k);
const mauchly = Object.values(results.mauchly_test?.tests ?? {})[0];
const report = {
    n, levels: L, measures: M, variant: variant || "(default)",
    errors: String(out.errors),
    noErrors: String(out.errors).trim() === "No errors occurred.",
    tables,
    mauchly: mauchly && { W: mauchly.mauchly_w, chiSquare: mauchly.chi_square, df: mauchly.df, sig: mauchly.significance, gg: mauchly.greenhouse_geisser_epsilon },
    multivariate: Object.keys(results.multivariate_tests?.effects ?? {}),
    contrasts: [...new Set((Object.values(results.tests_of_within_subjects_contrasts?.measures ?? {})[0]?.sources ?? []).map((s) => Object.values(s.factor_values)[0]))],
};
console.log(JSON.stringify(report, null, 1));
if (opts.out) fs.writeFileSync(opts.out, JSON.stringify(report, null, 2) + "\n");
