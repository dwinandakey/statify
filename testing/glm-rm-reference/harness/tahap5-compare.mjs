// Tahap 5: result values of the Web Worker experiment's Repeated Measures cells
// (within-only, time 10 levels, 1 measure, DescStats + EstEffectSize + ObsPower,
// n = 5000/10000/20000/40000) computed by the RM WASM measured in experiment 2
// (commit 8e2ddbd2) and by the current one, compared value by value after
// sorting arrays (tol 1e-9).
//   node tahap5-compare.mjs --old=<old pkg dir> --outDir=<dir> [--sizes=5000,10000]
import fs from "fs";
import path from "path";
import { loadRm, buildPayload, run, PKG } from "./statify-rm.mjs";
import { heavyDesign } from "./heavy.mjs";
import { diffValues } from "./compare.mjs";

const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const sizes = (opts.sizes || "5000,10000,20000,40000").split(",").map(Number);
fs.mkdirSync(opts.outDir, { recursive: true });
const summary = {};
for (const n of sizes) {
    const { rows, design } = heavyDesign(`L10M1n${n}`);
    const payload = buildPayload({ rows, design });
    const out = {};
    for (const [tag, dir] of [["old", opts.old], ["new", PKG]]) {
        out[tag] = run(await loadRm(dir), payload);
        fs.writeFileSync(path.join(opts.outDir, `L10M1-n${n}-${tag}.json`), JSON.stringify(out[tag], null, 1) + "\n");
    }
    const d = diffValues(out.old.results, out.new.results, { tol: 1e-9, sortArrays: true });
    const byTable = {};
    for (const x of d) {
        const t = x.path.split(/[.[]/)[1];
        byTable[t] = (byTable[t] || 0) + 1;
    }
    summary[n] = { differences: d.length, byTable, errorsOld: out.old.errors, errorsNew: out.new.errors, sample: d.slice(0, 60) };
    console.log(`n=${n}: ${d.length} differences ${JSON.stringify(byTable)}`);
    console.log(`  errors old: ${JSON.stringify(out.old.errors).slice(0, 300)}`);
    console.log(`  errors new: ${JSON.stringify(out.new.errors).slice(0, 300)}`);
}
fs.writeFileSync(path.join(opts.outDir, "value-compare.json"), JSON.stringify(summary, null, 1) + "\n");
