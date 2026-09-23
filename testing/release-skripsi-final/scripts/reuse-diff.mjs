import fs from "fs"; import { pathToFileURL } from "url";
const G = "D:/0.POLTSTAT STIS/Tugas Kuliah/Skripsi/topik baru statify/statify64/frontend/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg";
const mod = await import(pathToFileURL(G + "/wasm.js").href);
await mod.default({ module_or_path: fs.readFileSync(G + "/wasm_bg.wasm") });
const plain = (x) => x instanceof Map ? Object.fromEntries([...x].map(([k, v]) => [k, plain(v)])) : Array.isArray(x) ? x.map(plain) : (x && typeof x === "object") ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)])) : x;
const pl = JSON.parse(fs.readFileSync("D:/claude-tmp-statify/exp-capture/multivariate-500.json", "utf8")).request.payload;
const run = () => { const a = new mod.MultivariateAnalysis(pl.dep_data, pl.fix_factor_data, pl.covar_data, pl.wls_data, pl.dep_data_defs, pl.fix_factor_data_defs, pl.covar_data_defs, pl.wls_data_defs, pl.config_data); try { return { results: plain(a.get_formatted_results()), errors: a.get_all_errors() }; } finally { a.free(); } };
const outs = Array.from({ length: 6 }, run);
const canon = (x) => Array.isArray(x) ? x.map(canon) : (x && typeof x === "object") ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
function walk(a, b, p, acc) { if (typeof a === "number" && typeof b === "number") { if (a !== b) acc.push([p, Math.abs(a - b), Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b))]); return; }
  if (a && b && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], p + "/" + k, acc); return; } if (a !== b) acc.push([p, NaN, NaN]); }
for (let i = 1; i < outs.length; i++) {
  const byteEq = JSON.stringify(outs[i]) === JSON.stringify(outs[0]); const semEq = JSON.stringify(canon(outs[i])) === JSON.stringify(canon(outs[0]));
  const acc = []; walk(outs[0], outs[i], "", acc); const maxAbs = Math.max(0, ...acc.map((x) => x[1]).filter(Number.isFinite)); const maxRel = Math.max(0, ...acc.map((x) => x[2]).filter(Number.isFinite));
  console.log(`run ${i + 1} vs run 1: byte ${byteEq} | isi (kunci diurutkan) ${semEq} | angka berbeda ${acc.length} | selisih abs maks ${maxAbs.toExponential(2)} | relatif maks ${maxRel.toExponential(2)} | area ${[...new Set(acc.map((x) => x[0].split("/").slice(1, 3).join("/")))].slice(0, 4).join(", ")}`);
}
