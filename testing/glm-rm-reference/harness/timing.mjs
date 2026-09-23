// Timing of one synthetic mixed design (the Jest performance test's design:
// n subjects × L levels, one measure, between factor "group" with 2 levels).
// Usage: node timing.mjs [--pkg=<dir>] [--n=1000] [--levels=5]
import { loadRm, buildPayload, run } from "./statify-rm.mjs";

const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const n = Number(opts.n || 1000), L = Number(opts.levels || 5);
const rows = [];
for (let s = 0; s < n; s++) {
    const r = { group: s % 2 === 0 ? "G1" : "G2" };
    for (let l = 0; l < L; l++) r[`t${l + 1}`] = 10 + l * 1.5 + (s % 50) * 0.1 + Math.sin(s + l) * 0.7;
    rows.push(r);
}
const design = {
    factors: [{ name: "time", levels: L }],
    measures: [{ name: "score", columns: Array.from({ length: L }, (_, l) => `t${l + 1}`) }],
    between: ["group"],
    options: {},
};
const rm = await loadRm(opts.pkg);
const t0 = performance.now();
const out = run(rm, buildPayload({ rows, design }));
console.log(`n=${n} L=${L}: ${(performance.now() - t0).toFixed(0)} ms`, out.panic || out.errors.replace(/\s+/g, " ").slice(0, 200));
