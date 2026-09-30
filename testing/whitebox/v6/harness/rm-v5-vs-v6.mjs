// Membandingkan SELURUH keluaran WASM GLM Repeated Measures v5 dan v6 pada
// desain acuan (konfigurasi sama dengan testing/glm-rm-reference/harness/
// compare-spss.mjs: kontras Polynomial, dataset c dengan semua target EM Means
// dan Residual SSCP). Bila keluaran identik, setiap perbandingan terhadap
// SPSS 27 (1.318 nilai) dan R (353 nilai) pada v6 sama persis dengan v5.
//
// Pemakaian (akar repositori):
//   node testing/whitebox/v6/harness/rm-v5-vs-v6.mjs --v5=<pkg v5> --v6=<pkg v6> --out=<txt>
import fs from "fs";
import path from "path";
import { loadRm, readCsv, buildPayload, run } from "../../../glm-rm-reference/harness/statify-rm.mjs";
import { DESIGNS, csvPath } from "../../../glm-rm-reference/harness/designs.mjs";

const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const design = (key) => {
    const d = JSON.parse(JSON.stringify(DESIGNS[key].design));
    d.contrast = d.contrast ?? "Polynomial";
    if (key === "c") {
        d.emmeans = { ...d.emmeans, TargetList: ["(OVERALL)", "metode", "sesi", "metode*sesi"] };
        d.options = { ...d.options, ResSscpMat: true };
    }
    return d;
};

// Daun (path, nilai) dari objek hasil.
function leaves(o, prefix = "", out = new Map()) {
    if (o !== null && typeof o === "object") {
        for (const [k, v] of Object.entries(o)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
    } else out.set(prefix, o);
    return out;
}

const pkgs = { v5: opts.v5, v6: opts.v6 };
const results = {};
for (const [tag, dir] of Object.entries(pkgs)) {
    const rm = await loadRm(path.resolve(dir));
    results[tag] = {};
    for (const key of Object.keys(DESIGNS)) {
        results[tag][key] = run(rm, buildPayload({ rows: readCsv(csvPath(key)), design: design(key) }));
    }
}

const lines = [`Keluaran WASM RM v5 (${opts.v5}) vs v6 (${opts.v6})`, ""];
let differ = 0;
for (const key of Object.keys(DESIGNS)) {
    const a = leaves(results.v5[key]);
    const b = leaves(results.v6[key]);
    const keys = new Set([...a.keys(), ...b.keys()]);
    const diffs = [...keys].filter((k) => !Object.is(a.get(k), b.get(k)));
    if (diffs.length) differ++;
    lines.push(`${key}: ${keys.size} nilai, ${diffs.length === 0 ? "IDENTIK" : `${diffs.length} berbeda`}`);
    for (const k of diffs.slice(0, 30)) lines.push(`    ${k}: v5 ${a.get(k)} | v6 ${b.get(k)}`);
}
lines.push("", `desain: ${Object.keys(DESIGNS).length}, berbeda: ${differ}`);
fs.writeFileSync(opts.out, lines.join("\n") + "\n");
console.log(lines.join("\n"));
