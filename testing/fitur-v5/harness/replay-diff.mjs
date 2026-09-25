// Replay payload worker yang ditangkap (ui-run.cjs, *.raw.json) ke paket WASM
// MV lain dan laporkan setiap nilai yang berbeda (path JSON, sebelum,
// sesudah). Bila respons asli memuat simultaneous_confidence_intervals,
// get_simultaneous_ci() ikut dipanggil seperti worker.
//
// Pemakaian (root repo):
//   node testing/fitur-v5/harness/replay-diff.mjs <dir raw> <dir pkg> cfg1,cfg2,... [out.txt]
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const [rawDir, pkgDir, list, outFile] = process.argv.slice(2);
const bytes = fs.readFileSync(path.resolve(pkgDir, "wasm_bg.wasm"));
const plain = (x) =>
    x instanceof Map ? Object.fromEntries([...x].map(([k, v]) => [k, plain(v)]))
        : Array.isArray(x) ? x.map(plain)
            : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)])) : x;
function diff(a, b, p, out) {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push([p, a, b]); return; }
    if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${p}.${k}`, out); return; }
    if (a !== b) out.push([p, a, b]);
}
const lines = [];
for (const cfg of list.split(",")) {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir, `${cfg}.raw.json`), "utf8"));
    const p = raw.request.payload;
    const mod = await import(pathToFileURL(path.resolve(pkgDir, "wasm.js")).href + `?i=${cfg}`);
    await mod.default({ module_or_path: bytes });
    const a = new mod.MultivariateAnalysis(p.dep_data, p.fix_factor_data, p.covar_data, p.wls_data, p.dep_data_defs, p.fix_factor_data_defs, p.covar_data_defs, p.wls_data_defs, p.config_data);
    const results = plain(a.get_formatted_results());
    if (raw.response.results.simultaneous_confidence_intervals !== undefined) {
        results.simultaneous_confidence_intervals = plain(a.get_simultaneous_ci());
    }
    a.free();
    // Seperti postMessage → JSON tangkapan: NaN menjadi null.
    const normalized = JSON.parse(JSON.stringify(results));
    Object.keys(results).forEach((k) => delete results[k]);
    Object.assign(results, normalized);
    const d = [];
    diff(raw.response.results, results, "results", d);
    const keyOrderSame = JSON.stringify(raw.response.results) === JSON.stringify(results);
    lines.push(`${cfg}: ${d.length === 0 ? (keyOrderSame ? "identik (byte)" : "nilai identik, urutan kunci berbeda") : `${d.length} nilai berbeda`}`);
    for (const [pp, x, y] of d) lines.push(`   ${pp}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
}
const text = lines.join("\n") + "\n";
process.stdout.write(text);
if (outFile) fs.writeFileSync(outFile, text);
