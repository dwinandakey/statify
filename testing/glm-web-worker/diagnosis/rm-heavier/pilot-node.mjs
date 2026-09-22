// Bagian B (pilot): heavier but in-scope GLM Repeated Measures workloads.
// Builds payloads with the SAME config shape the dialog sends (template
// captured from the real UI) and times the WASM computation in Node with the
// same rust/pkg binary. Within-subject designs only (mixed designs error, see
// results/diagnosis-rm-between-2026-09-22).
// Usage: node pilot-node.mjs <template-capture.json> [outFile]
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "../../../../frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg");
// A Rust panic leaves the WASM instance unusable, so each panic loads a fresh module instance.
let RepeatedMeasureAnalysis, generation = 0;
async function load() {
    const mod = await import(pathToFileURL(path.join(pkg, "wasm.js")).href + `?instance=${generation++}`);
    await mod.default({ module_or_path: fs.readFileSync(path.join(pkg, "wasm_bg.wasm")) });
    RepeatedMeasureAnalysis = mod.RepeatedMeasureAnalysis;
}
await load();

const template = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).payloads[0].payload;
const OUT = process.argv[3] || path.join(path.dirname(process.argv[2]), "..", "pilot-node.json");

const numericDef = (name, columnIndex) => ({
    ...template.subject_data_defs[0][0], name, label: name, columnIndex,
});

// n subjects, L within levels, M measures; value = level trend + subject effect + deterministic noise.
function payload({ n, L, M, options, emmeans }) {
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
    cfg.emmeans = { ...cfg.emmeans, ...emmeans };
    return {
        subject_data, factors_data: [], covar_data: [],
        subject_data_defs: names.map((nm, i) => [numericDef(nm, i)]), factors_data_defs: [], covar_data_defs: [],
        config_data: cfg,
    };
}

const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));
function time(p, reps = 3) {
    const ms = [];
    let errors = "", keys = [];
    for (let r = 0; r < reps; r++) {
        const t0 = performance.now();
        const a = new RepeatedMeasureAnalysis(p.subject_data, p.factors_data, p.covar_data, p.subject_data_defs, p.factors_data_defs, p.covar_data_defs, p.config_data);
        const res = a.get_formatted_results();
        errors = a.get_all_errors();
        ms.push(performance.now() - t0);
        keys = Object.keys(plain(res)).filter((k) => plain(res)[k] != null);
        a.free();
    }
    ms.sort((x, y) => x - y);
    return { medianMs: Math.round(ms[Math.floor(ms.length / 2)]), errors: String(errors).replace(/\s+/g, " ").trim(), keys };
}

const OPT = { DescStats: true, EstEffectSize: true, ObsPower: true };
const EMM = { TargetList: ["time"], CompMainEffect: false, ConfiIntervalMethod: "lsdNone" };
const EMM_COMPARE = { TargetList: ["time"], CompMainEffect: true, ConfiIntervalMethod: "bonferroni" };
// Second round (PILOT_ROUND=2): EMMeans panicked in round 1, so levels and
// measures are varied with the 1a option set only.
const round2 = [
    { step: "2a' 1a, levels 8", L: 8, M: 1, options: OPT, emmeans: {} },
    { step: "2b' 1a, levels 10", L: 10, M: 1, options: OPT, emmeans: {} },
    { step: "3' 1a, levels 10, 2 measures", L: 10, M: 2, options: OPT, emmeans: {} },
];
const round1 = [
    { step: "0 default options", L: 5, M: 1, options: {}, emmeans: {} },
    { step: "1a desc+effect size+power", L: 5, M: 1, options: OPT, emmeans: {} },
    { step: "1b 1a + homogeneity tests", L: 5, M: 1, options: { ...OPT, HomogenTest: true }, emmeans: {} },
    { step: "1c 1a + EMMeans (no compare)", L: 5, M: 1, options: OPT, emmeans: EMM },
    { step: "1d 1a + EMMeans compare (bonf)", L: 5, M: 1, options: OPT, emmeans: EMM_COMPARE },
    { step: "2a 1c, levels 8", L: 8, M: 1, options: OPT, emmeans: EMM },
    { step: "2b 1c, levels 10", L: 10, M: 1, options: OPT, emmeans: EMM },
    { step: "3 1c, levels 10, 2 measures", L: 10, M: 2, options: OPT, emmeans: EMM },
];
// Third round (PILOT_ROUND=3): in a within-only design the UI's EM Means
// dialog offers only "(OVERALL)" (pilot-ui), so that is the reachable EMMeans option.
const EMM_OVERALL = { TargetList: ["(OVERALL)"], CompMainEffect: false, ConfiIntervalMethod: "lsdNone" };
const EMM_OVERALL_COMPARE = { TargetList: ["(OVERALL)"], CompMainEffect: true, ConfiIntervalMethod: "bonferroni" };
const round3 = [
    { step: "4a 3' + EMMeans (OVERALL)", L: 10, M: 2, options: OPT, emmeans: EMM_OVERALL },
    { step: "4b 3' + EMMeans (OVERALL) compare", L: 10, M: 2, options: OPT, emmeans: EMM_OVERALL_COMPARE },
];
const steps = { 2: round2, 3: round3 }[process.env.PILOT_ROUND] || round1;
const sizes = [2000, 5000, 10000, 20000];
const rows = [];
for (const s of steps) {
    for (const n of sizes) {
        let r;
        try { r = time(payload({ n, ...s })); }
        catch (e) {
            r = { medianMs: null, errors: `PANIC/exception: ${String(e.message || e).split(/\r?\n/)[0]}`, keys: [] };
            await load();
        }
        rows.push({ ...s, n, ...r });
        console.log(`${s.step.padEnd(30)} n=${String(n).padEnd(6)} ${String(r.medianMs).padStart(7)} ms  errors: ${r.errors.slice(0, 120)}`);
    }
}
fs.writeFileSync(OUT, JSON.stringify(rows, null, 2));
console.log("written:", OUT);
