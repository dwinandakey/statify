// Compares Statify EM Means (and pairwise comparisons) of dataset (c) with the
// interim afex reference (r-output/afex-emmeans-c.json).
//   node compare-emmeans.mjs [--pkg=<dir>] [--tol=1e-6]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadRm, readCsv, buildPayload, run } from "./statify-rm.mjs";
import { DESIGNS, csvPath } from "./designs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const tol = Number(opts.tol ?? 1e-6);
const ref = JSON.parse(fs.readFileSync(path.join(here, "../r-output/afex-emmeans-c.json"), "utf8"));
const design = JSON.parse(JSON.stringify(DESIGNS.c.design));
design.options = { DescStats: true };
design.emmeans = { TargetList: ["(OVERALL)", "metode", "sesi", "metode*sesi"], CompMainEffect: true, ConfiIntervalMethod: "bonferroni" };
const out = run(await loadRm(opts.pkg), buildPayload({ rows: readCsv(csvPath("c")), design }));
if (out.panic) { console.log("PANIC", out.panic); process.exit(1); }
console.log("errors:", out.errors.replace(/\s+/g, " ").slice(0, 200));
const means = out.results.emmeans || {};
const pairs = out.results.emmeans_pairwise || {};
let ok = 0, bad = 0;
for (const r of ref) {
    const [target, level] = r.source.split(" | ");
    let v;
    if (r.table === "emmeans") {
        const row = (means[target] || []).find((x) => x.factor_value === level && x.dependent_variable === r.measure);
        v = row && { Mean: row.mean, "Std. Error": row.std_error, "Lower Bound": row.confidence_interval.lower_bound, "Upper Bound": row.confidence_interval.upper_bound }[r.field];
    } else {
        const [li, lj] = level.split(" - ");
        const row = (pairs[target] || []).find((x) => x.level_i === li && x.level_j === lj && x.dependent_variable === r.measure);
        v = row && { "Mean Difference": row.mean_difference, "Std. Error": row.std_error, "Sig.": row.significance, "Lower Bound": row.confidence_interval.lower_bound, "Upper Bound": row.confidence_interval.upper_bound }[r.field];
    }
    const good = typeof v === "number" && Math.abs(v - r.value) <= tol * Math.max(1, Math.abs(r.value));
    if (good) ok++; else { bad++; if (bad <= 12) console.log(`  ✗ ${r.table} ${r.source} ${r.field}: Statify ${v} vs afex ${r.value}`); }
}
console.log(`EM Means vs afex: ${ok}/${ok + bad} cocok`);
process.exitCode = bad ? 1 : 0;
