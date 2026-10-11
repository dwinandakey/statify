// Bagian B (pilot): shape of the raw descriptive_statistics result of the
// Repeated Measures WASM (before the app's table formatter), for the same
// payload computed twice in one instance. Prints keys and entry counts only.
// Usage: node descriptive-raw.mjs <template-capture.json> [n=200] [L=10] [M=1]
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "../../../../frontend/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg");
const mod = await import(pathToFileURL(path.join(pkg, "wasm.js")).href);
await mod.default({ module_or_path: fs.readFileSync(path.join(pkg, "wasm_bg.wasm")) });

const [templateFile, nArg, lArg, mArg] = process.argv.slice(2);
const template = JSON.parse(fs.readFileSync(templateFile, "utf8")).payloads[0].payload;
const n = Number(nArg || 200), L = Number(lArg || 10), M = Number(mArg || 1);
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
cfg.options = { ...cfg.options, DescStats: true, EstEffectSize: true, ObsPower: true };
const def = (nm, i) => ({ ...template.subject_data_defs[0][0], name: nm, label: nm, columnIndex: i });
const plain = (v) => JSON.parse(JSON.stringify(v, (_, x) => (x instanceof Map ? Object.fromEntries(x) : x)));

const describe = (v, depth = 0) => {
    if (Array.isArray(v)) return `array(${v.length})` + (v.length && depth < 3 ? ` of ${describe(v[0], depth + 1)}` : "");
    if (v && typeof v === "object") {
        const keys = Object.keys(v);
        return `{${keys.slice(0, 12).map((k) => (depth < 2 ? `${k}: ${describe(v[k], depth + 1)}` : k)).join(", ")}${keys.length > 12 ? `, … (${keys.length} keys)` : ""}}`;
    }
    return typeof v;
};
for (let run = 1; run <= 2; run++) {
    const a = new mod.RepeatedMeasureAnalysis(subject_data, [], [], names.map((nm, i) => [def(nm, i)]), [], [], cfg);
    const d = plain(a.get_formatted_results()).descriptive_statistics;
    a.free();
    console.log(`run ${run}: descriptive_statistics = ${describe(d)}`);
    console.log(`        top-level keys in order: ${JSON.stringify(Object.keys(d || {}))}`);
}
