// Replay payload worker yang ditangkap dari build v3 (ui-run.cjs, *.raw.json)
// ke paket WASM MV lain (mis. rust/pkg hasil build v4), lalu bandingkan hasil
// get_formatted_results() dengan respons worker v3 secara byte (JSON), termasuk
// urutan kunci objek. Alat uji saja; aplikasi tidak dipanggil.
//
// Pemakaian (root repo):
//   node testing/fitur-v4/harness/replay-v3.mjs <dir raw v3> <dir pkg> [cfg,cfg,...]
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const [rawDir, pkgDir, only] = process.argv.slice(2);
// Instance WASM baru per payload, seperti ui-run.cjs yang memakai browser
// context baru per konfigurasi (state kunci hash maju per analisis).
const bytes = fs.readFileSync(path.resolve(pkgDir, "wasm_bg.wasm"));
async function freshModule(tag) {
    const mod = await import(pathToFileURL(path.resolve(pkgDir, "wasm.js")).href + `?instance=${tag}`);
    await mod.default({ module_or_path: bytes });
    return mod;
}

const plain = (x) =>
    x instanceof Map
        ? Object.fromEntries([...x].map(([k, v]) => [k, plain(v)]))
        : Array.isArray(x)
            ? x.map(plain)
            : x && typeof x === "object"
                ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]))
                : x;

const cfgs = only
    ? only.split(",")
    : fs.readdirSync(rawDir).filter((f) => f.endsWith(".raw.json")).map((f) => f.replace(".raw.json", ""));
let bad = 0;
for (const cfg of cfgs) {
    const raw = JSON.parse(fs.readFileSync(path.join(rawDir, `${cfg}.raw.json`), "utf8"));
    const p = raw.request.payload;
    const mod = await freshModule(cfg);
    const a = new mod.MultivariateAnalysis(
        p.dep_data, p.fix_factor_data, p.covar_data, p.wls_data,
        p.dep_data_defs, p.fix_factor_data_defs, p.covar_data_defs, p.wls_data_defs,
        p.config_data
    );
    const results = plain(a.get_formatted_results());
    a.free();
    const same = JSON.stringify(results) === JSON.stringify(raw.response.results);
    let valuesSame = same;
    if (!same) {
        const sortKeys = (x) => Array.isArray(x) ? x.map(sortKeys) : x && typeof x === "object"
            ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x;
        valuesSame = JSON.stringify(sortKeys(results)) === JSON.stringify(sortKeys(raw.response.results));
        bad += 1;
    }
    console.log(`${cfg}: byte-identik ${same}${same ? "" : ` (nilai sama bila urutan kunci diabaikan: ${valuesSame})`}`);
}
process.exit(bad ? 1 : 0);
