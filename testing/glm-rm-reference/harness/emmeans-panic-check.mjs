// Tahap 3: EM Means configurations that used to panic (pilot-rm-heavier:
// "RuntimeError: unreachable") and unsupported inputs. Each case must finish
// without a panic; unsupported cases must report a readable error.
// Usage: node emmeans-panic-check.mjs [--pkg=<dir>]
import { loadRm, readCsv, buildPayload, run } from "./statify-rm.mjs";
import { DESIGNS, csvPath } from "./designs.mjs";
import { heavyDesign } from "./heavy.mjs";

const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const EMM = (targets, compare = false, method = "lsdNone") => ({ TargetList: targets, CompMainEffect: compare, ConfiIntervalMethod: method });
const base = (key) => (DESIGNS[key] ? { rows: readCsv(csvPath(key)), design: JSON.parse(JSON.stringify(DESIGNS[key].design)) } : heavyDesign(key, 500));
const cases = [
    ["L10M2 (OVERALL)", "L10M2", EMM(["(OVERALL)"])],
    ["L10M2 (OVERALL) compare bonf", "L10M2", EMM(["(OVERALL)"], true, "bonferroni")],
    ["L5M1 time (payload)", "L5M1", EMM(["time"])],
    ["L5M1 time compare bonf", "L5M1", EMM(["time"], true, "bonferroni")],
    ["gambar51 (OVERALL)+perlakuan sidak", "gambar51", EMM(["(OVERALL)", "perlakuan"], true, "sidak")],
    ["b kelompok*waktu compare lsd", "b", EMM(["kelompok", "waktu", "kelompok*waktu"], true, "lsdNone")],
    ["c unknown target", "c", EMM(["tidak_ada"])],
    ["c empty target list", "c", EMM([])],
    ["two within factors (A×B)", "twoWithin", EMM(["(OVERALL)"])],
];
let panics = 0;
for (const [label, key, emm] of cases) {
    let rows, design;
    if (key === "twoWithin") {
        ({ rows } = heavyDesign("L6M1", 60));
        design = { factors: [{ name: "a", levels: 2 }, { name: "b", levels: 3 }], measures: [{ name: "score", columns: ["t1", "t2", "t3", "t4", "t5", "t6"] }], options: {} };
    } else ({ rows, design } = base(key));
    design.emmeans = emm;
    const out = run(await loadRm(opts.pkg), buildPayload({ rows, design }));
    if (out.panic) panics++;
    const emmKeys = out.results ? Object.keys(out.results.emmeans || {}) : [];
    const pairKeys = out.results ? Object.keys(out.results.emmeans_pairwise || {}) : [];
    console.log(`${label.padEnd(38)} ${out.panic ? `PANIC ${out.panic}` : `ok | emmeans ${JSON.stringify(emmKeys)} pairwise ${JSON.stringify(pairKeys)} | ${out.errors.replace(/\s+/g, " ").slice(0, 150)}`}`);
}
console.log(panics ? `${panics} PANIC` : "tidak ada panic");
process.exitCode = panics ? 1 : 0;
