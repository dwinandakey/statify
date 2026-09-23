// Replays the captured worker payloads of the final experiment cells through
// the WASM package of the experiment build and of the release branch, and
// compares get_formatted_results() + get_all_errors() byte for byte (JSON).
// Also checks that the release replay equals the response the release build's
// worker actually sent in the dialog run.
//
//   node replay-exp.mjs <captureDir> <pkgDir label=dir> ...   (see main below)
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pathToFileURL } from "url";

const [captureDir, outFile, ...pkgSpecs] = process.argv.slice(2);
// pkgSpecs: "<label>:<module>:<dir>"
const pkgs = pkgSpecs.map((s) => { const [label, module, ...dir] = s.split(":"); return { label, module, dir: dir.join(":") }; });

const plain = (x) => x instanceof Map ? Object.fromEntries([...x].map(([k, v]) => [k, plain(v)])) : Array.isArray(x) ? x.map(plain) : (x && typeof x === "object") ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)])) : x;
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

const loaded = {};
async function load(p) {
    if (!loaded[p.dir]) {
        const mod = await import(pathToFileURL(path.join(p.dir, "wasm.js")).href + `?v=${encodeURIComponent(p.label)}`);
        const bytes = fs.readFileSync(path.join(p.dir, "wasm_bg.wasm"));
        await mod.default({ module_or_path: bytes });
        loaded[p.dir] = { mod, wasmMd5: md5(bytes) };
    }
    return loaded[p.dir];
}

function run(mod, module, pl) {
    const a = module === "multivariate"
        ? new mod.MultivariateAnalysis(pl.dep_data, pl.fix_factor_data, pl.covar_data, pl.wls_data, pl.dep_data_defs, pl.fix_factor_data_defs, pl.covar_data_defs, pl.wls_data_defs, pl.config_data)
        : new mod.RepeatedMeasureAnalysis(pl.subject_data, pl.factors_data, pl.covar_data, pl.subject_data_defs, pl.factors_data_defs, pl.covar_data_defs, pl.config_data);
    try {
        return JSON.stringify({ results: plain(a.get_formatted_results()), errors: plain(a.get_all_errors()) });
    } finally {
        a.free();
    }
}

const report = { rows: [] };
for (const f of fs.readdirSync(captureDir).filter((f) => /^(multivariate|repeated-measures)-\d+\.json$/.test(f)).sort()) {
    const cap = JSON.parse(fs.readFileSync(path.join(captureDir, f), "utf8"));
    const module = cap.cell.startsWith("multivariate") ? "multivariate" : "repeated-measures";
    const pl = cap.request.payload;
    const outs = {};
    for (const p of pkgs.filter((p) => p.module === module)) {
        const { mod, wasmMd5 } = await load(p);
        const s = run(mod, module, pl);
        outs[p.label] = { md5: md5(s), bytes: s.length, wasmMd5 };
    }
    const workerOut = JSON.stringify({ results: plain(cap.response.results), errors: plain(cap.response.errors) });
    const labels = Object.keys(outs);
    const row = {
        cell: cap.cell, modeActual: cap.modeActual, payloadMd5: md5(JSON.stringify(pl)),
        ...Object.fromEntries(labels.map((l) => [l, outs[l]])),
        experimentEqualsRelease: outs[labels[0]].md5 === outs[labels[1]].md5,
        releaseWorkerResponseMd5: md5(workerOut),
        releaseReplayEqualsWorkerResponse: md5(workerOut) === outs[labels[1]].md5,
    };
    report.rows.push(row);
    console.log(`${row.cell}: ${labels.map((l) => `${l} ${outs[l].md5.slice(0, 12)} (${outs[l].bytes} B, wasm ${outs[l].wasmMd5.slice(0, 8)})`).join(" | ")} | eksperimen=release ${row.experimentEqualsRelease} | replay release=respons worker UI ${row.releaseReplayEqualsWorkerResponse}`);
}
fs.writeFileSync(outFile, JSON.stringify(report, null, 1) + "\n");
