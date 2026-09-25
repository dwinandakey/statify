// Jalankan WASM GLM Multivariate langsung di Node (tanpa UI) untuk
// pemeriksaan v5 B1–B3: payload dibangun dari CSV dengan bentuk yang sama
// seperti payload worker aplikasi (lihat *.raw.json hasil ui-run.cjs), lalu
// MultivariateAnalysis dijalankan dengan instance WASM baru per kasus.
//
// Pemakaian (root repo):
//   node testing/fitur-v5/harness/wasm-direct.mjs <dir pkg> <kasus.json> [out.json]
// kasus.json: [{ "id", "csv", "dep": [...], "fix": [...], "ssType": "typeIII",
//               "sigLevel": 0.05, "testValues": null }]
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const [pkgDir, casesFile, outFile] = process.argv.slice(2);
const bytes = fs.readFileSync(path.resolve(pkgDir, "wasm_bg.wasm"));
async function freshModule(tag) {
    const mod = await import(pathToFileURL(path.resolve(pkgDir, "wasm.js")).href + `?instance=${encodeURIComponent(tag)}`);
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

function readCsv(file) {
    const [head, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
    const cols = head.split(",").map((s) => s.replace(/"/g, "").trim());
    return lines.map((l) => {
        const cells = l.split(",").map((s) => s.replace(/"/g, "").trim());
        return Object.fromEntries(cols.map((c, i) => [c, cells[i] === "" ? null : Number(cells[i])]));
    });
}
// Templat config: config_data payload worker mv4 (ui-run.cjs, step19-v4); bagian
// main, model dan options diganti per kasus.
const TEMPLATE = JSON.parse(fs.readFileSync("testing/glm-mv-reference/results/fix-steps/step19-v4/worker/mv4.raw.json", "utf8")).request.payload.config_data;
const def = (name, i) => ({ id: i + 1, columnIndex: i, name, type: "NUMERIC", width: 8, decimals: 1, label: "", values: [], missing: [], columns: 72, align: "right", measure: "scale", role: "input" });

function payloadOf(c) {
    const rows = readCsv(path.resolve(c.csv));
    const cols = Object.keys(rows[0]);
    const col = (v) => rows.map((r) => ({ [v]: r[v] }));
    return {
        dep_data: c.dep.map(col),
        fix_factor_data: c.fix.map(col),
        covar_data: [],
        wls_data: [],
        dep_data_defs: c.dep.map((v) => [def(v, cols.indexOf(v))]),
        fix_factor_data_defs: c.fix.map((v) => [def(v, cols.indexOf(v))]),
        covar_data_defs: [],
        wls_data_defs: [],
        config_data: {
            ...structuredClone(TEMPLATE),
            main: { DepVar: c.dep, FixFactor: c.fix, Covar: [], WlsWeight: null, TestValues: c.testValues ?? null, VarianceMode: c.varianceMode ?? "Pooled" },
            model: { ...TEMPLATE.model, NonCust: true, Custom: false, BuildCustomTerm: false, FactorsVar: c.fix, TermsVar: null, FactorsModel: null, CovModel: null, RandomModel: null, BuildTermMethod: "interaction", TermText: null, SumOfSquareMethod: c.ssType ?? "typeIII", Intercept: true },
            options: { ...TEMPLATE.options, DescStats: false, HomogenTest: false, EstEffectSize: true, SprVsLevel: false, ObsPower: true, ResPlot: false, ParamEst: false, LackOfFit: false, SscpMat: false, GeneralFun: false, ResSscpMat: false, CoefficientMatrix: false, TransformMat: false, SigLevel: c.sigLevel ?? 0.05 },
        },
    };
}

const cases = JSON.parse(fs.readFileSync(casesFile, "utf8"));
const out = {};
for (const c of cases) {
    const p = payloadOf(c);
    const mod = await freshModule(c.id);
    try {
        const a = new mod.MultivariateAnalysis(p.dep_data, p.fix_factor_data, p.covar_data, p.wls_data, p.dep_data_defs, p.fix_factor_data_defs, p.covar_data_defs, p.wls_data_defs, p.config_data);
        const r = plain(a.get_formatted_results());
        out[c.id] = { multivariate_tests: r.multivariate_tests ?? null, tests_between_subjects_effects: r.tests_between_subjects_effects ?? null, errors: plain(a.get_all_errors()) };
        a.free();
    } catch (e) {
        out[c.id] = { thrown: String(e && e.message ? e.message : e) };
    }
    console.log(c.id, out[c.id].thrown ? `THROWN: ${out[c.id].thrown}` : "ok");
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
