// Pemeriksaan fitur v4 dari keluaran ui-run.cjs (dialog asli, build produksi):
//  A. jalur lama byte-identik dengan v3 (mv1–mv8, mv4ph): tabel yang disimpan
//     aplikasi, payload dan respons worker, main dan worker;
//  B. δ₀ = data geser: payload dan respons worker mv2d = mv2s dan mv2wd = mv2ws
//     (identik), mv3d ≈ mv3s (uji pada d − δ₀; selisih ≤ 1e-9); tabel yang
//     sama kecuali catatan dan Descriptive Statistics; Descriptive Statistics
//     mv2d = mv2 (data asli, δ₀ = 0);
//  C. CI simultan Statify (nilai mentah dari worker) vs R dasar dan MVTests,
//     |selisih| < 1e-8;
//  D. main = worker byte-identik untuk konfigurasi baru.
//
// Pemakaian (root repo): node testing/fitur-v4/harness/v4-check.mjs --run=<step18-v4> --v3=<step15-v3> --out=<file>
import fs from "fs";
import path from "path";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const RUN = path.resolve(args.run);
const V3 = path.resolve(args.v3);
const lines = [];
let failures = 0;
const log = (ok, text) => { if (!ok) failures += 1; lines.push(`${ok ? "OK  " : "GAGAL"} ${text}`); };
const load = (dir, mode, cfg) => JSON.parse(fs.readFileSync(path.join(dir, mode, `${cfg}.json`), "utf8"));
const loadRaw = (dir, mode, cfg) => JSON.parse(fs.readFileSync(path.join(dir, mode, `${cfg}.raw.json`), "utf8"));
const tablesKey = (j) => JSON.stringify(j.tables.map((t) => [t.title, t.output_data]));

// ── A. Jalur lama = v3 ──────────────────────────────────────────────────────
lines.push("A. Jalur lama (δ₀ = 0, CI tidak dicentang) vs v3");
for (const cfg of ["mv1", "mv2", "mv3", "mv4", "mv5", "mv6", "mv7", "mv8", "mv4ph"]) {
    for (const mode of ["worker", "main"]) {
        const a = load(V3, mode, cfg), b = load(RUN, mode, cfg);
        log(tablesKey(a) === tablesKey(b), `${cfg} ${mode}: tabel byte-identik dengan v3 (${b.tables.length} tabel)`);
    }
    const ra = loadRaw(V3, "worker", cfg), rb = loadRaw(RUN, "worker", cfg);
    log(JSON.stringify(ra.request?.payload) === JSON.stringify(rb.request?.payload), `${cfg}: payload worker identik dengan v3`);
    log(JSON.stringify(ra.response?.results) === JSON.stringify(rb.response?.results), `${cfg}: respons worker identik dengan v3`);
}

// ── B. δ₀ = data geser ──────────────────────────────────────────────────────
lines.push("", "B. δ₀ vs data yang digeser manual (δ₀ = 0)");
const rowsOf = (j, title) => j.tables.filter((t) => t.title !== "Descriptive Statistics").map((t) => {
    const o = JSON.parse(t.output_data);
    return [t.title, (o.tables || []).map((x) => x.rows)];
});
for (const [d, s] of [["mv2d", "mv2s"], ["mv2wd", "mv2ws"]]) {
    const rd = loadRaw(RUN, "worker", d), rs = loadRaw(RUN, "worker", s);
    log(JSON.stringify(rd.request?.payload) === JSON.stringify(rs.request?.payload), `${d} vs ${s}: payload worker identik (data geser di TS = data geser manual; δ₀ tidak dikirim ke Rust)`);
    log(JSON.stringify(rd.response?.results) === JSON.stringify(rs.response?.results), `${d} vs ${s}: respons worker identik`);
    const jd = load(RUN, "worker", d), js = load(RUN, "worker", s);
    log(JSON.stringify(rowsOf(jd, "")) === JSON.stringify(rowsOf(js, "")), `${d} vs ${s}: baris semua tabel selain Descriptive Statistics identik`);
    const desc = (j) => JSON.parse(j.tables.find((t) => t.title === "Descriptive Statistics").output_data).tables[0].rows;
    const orig = load(RUN, "worker", "mv2");
    log(JSON.stringify(desc(jd)) === JSON.stringify(desc(orig)), `${d}: Descriptive Statistics = data asli (mv2, δ₀ = 0)`);
    const mt = JSON.parse(jd.tables.find((t) => t.title.startsWith("Multivariate Tests")).output_data).tables[0];
    log(/H₀: μ\(jk = 1\) − μ\(jk = 2\) = δ₀, δ₀ = \[3, 2, 10, 1\]/.test(mt.note || ""), `${d}: catatan Multivariate Tests memuat hipotesis dan δ₀ ("${(mt.note || "").slice(-160)}")`);
}
{
    // Paired: mv3d kirim d dengan μ₀ = δ₀; mv3s kirim d − δ₀ dengan μ₀ = 0.
    const a = loadRaw(RUN, "worker", "mv3d").response.results.multivariate_tests.effects;
    const b = loadRaw(RUN, "worker", "mv3s").response.results.multivariate_tests.effects;
    let maxDiff = 0, n = 0;
    for (const eff of Object.keys(a)) for (const test of Object.keys(a[eff])) for (const k of ["value", "f", "hypothesis_df", "error_df", "significance", "partial_eta_squared", "noncent_parameter", "observed_power"]) {
        const x = a[eff][test][k], y = b[eff]?.[test]?.[k];
        if (typeof x === "number") { n += 1; maxDiff = Math.max(maxDiff, Math.abs(x - y)); }
    }
    log(maxDiff <= 1e-9, `mv3d vs mv3s: ${n} nilai Multivariate Tests, selisih maks ${maxDiff.toExponential(2)} (≤ 1e-9)`);
    const tableRows = (cfg) => JSON.parse(load(RUN, "worker", cfg).tables.find((t) => t.title.startsWith("Multivariate Tests")).output_data).tables[0].rows;
    log(JSON.stringify(tableRows("mv3d")) === JSON.stringify(tableRows("mv3s")), "mv3d vs mv3s: baris Multivariate Tests yang tampil identik");
    const note = JSON.parse(load(RUN, "worker", "mv3d").tables.find((t) => t.title.startsWith("Multivariate Tests")).output_data).tables[0].note;
    log(/δ₀ = \[8, 3\]\. H₀: μd = δ₀/.test(note || ""), `mv3d: catatan memuat δ₀ dan H₀ ("${note}")`);
}

// ── C. CI simultan vs R ─────────────────────────────────────────────────────
lines.push("", "C. CI simultan Statify vs R (|selisih| < 1e-8)");
const readCsv = (f) => {
    const [head, ...body] = fs.readFileSync(f, "utf8").trim().split(/\r?\n/);
    const cols = head.split(",").map((c) => c.replace(/"/g, ""));
    return body.map((line) => {
        const cells = line.match(/("[^"]*"|[^,]+)/g).map((c) => c.replace(/"/g, ""));
        return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
    });
};
const rBase = readCsv("testing/fitur-v4/r/ci_simultan_r.csv");
const rMv = readCsv("testing/fitur-v4/r/ci_mvtests_r.csv");
const SHIFT = { mv2dci: [3, 2, 10, 1] };
const ciCfgs = ["mv1ci", "mv1ci10", "mv2ci", "mv2wci", "mv2dci", "mv3ci", "mv3dci"];
let maxAll = 0, nAll = 0;
for (const cfg of ciCfgs) {
    const ci = loadRaw(RUN, "worker", cfg).response.results.simultaneous_confidence_intervals;
    if (!ci) { log(false, `${cfg}: tidak ada simultaneous_confidence_intervals di respons`); continue; }
    const shift = SHIFT[cfg] ?? ci.intervals.map(() => 0);
    let maxDiff = 0, n = 0, maxMv = 0, nMv = 0;
    ci.intervals.forEach((iv, i) => {
        const r = rBase.find((x) => x.config === cfg && x.dv === iv.dependent_variable);
        const s = shift[i];
        const pairs = [["estimate", iv.estimate + s], ["std_error", iv.std_error], ["t2_lower", iv.t2_lower + s], ["t2_upper", iv.t2_upper + s], ["bonferroni_lower", iv.bonferroni_lower + s], ["bonferroni_upper", iv.bonferroni_upper + s], ["t2_critical", ci.t2_critical], ["bonferroni_critical", ci.bonferroni_critical]];
        for (const [k, v] of pairs) { n += 1; maxDiff = Math.max(maxDiff, Math.abs(v - Number(r?.[k]))); }
        const m = rMv.find((x) => x.config === cfg && x.dv === iv.dependent_variable);
        if (m) for (const [k, v] of [["t2_lower", iv.t2_lower + s], ["t2_upper", iv.t2_upper + s]]) { nMv += 1; maxMv = Math.max(maxMv, Math.abs(v - Number(m[k]))); }
    });
    maxAll = Math.max(maxAll, maxDiff); nAll += n;
    log(maxDiff < 1e-8, `${cfg} (${ci.design}, ${Math.round(ci.confidence_level * 100)}%): ${n} nilai vs R dasar, selisih maks ${maxDiff.toExponential(2)}` + (nMv ? `; ${nMv} batas T² vs MVTests, selisih maks ${maxMv.toExponential(2)}` : "; MVTests: tidak ada padanan (metode Statify = Result 6.4)"));
    if (nMv) log(maxMv < 1e-8, `${cfg}: batas T² vs MVTests < 1e-8`);
}
lines.push(`   total ${nAll} nilai vs R dasar, selisih maks ${maxAll.toExponential(2)}`);
{
    const t = JSON.parse(load(RUN, "worker", "mv2dci").tables.find((x) => x.title === "Simultaneous Confidence Intervals").output_data).tables[0];
    lines.push(`   mv2dci tabel tampil: ${JSON.stringify(t.rows.map((r) => [r.dependent_variable, r.estimate, r.hypothesized, r.t2_lower, r.t2_upper, r.t2_contains, r.bonferroni_contains]))}`);
}

// ── D. main = worker (konfigurasi baru) ─────────────────────────────────────
lines.push("", "D. main = worker, konfigurasi baru");
for (const cfg of ["mv2d", "mv2s", "mv2wd", "mv2ws", "mv3d", "mv3s", ...ciCfgs]) {
    const a = load(RUN, "main", cfg), b = load(RUN, "worker", cfg);
    log(tablesKey(a) === tablesKey(b), `${cfg}: main = worker byte-identik (${b.tables.length} tabel)`);
}

lines.push("", `HASIL: ${failures === 0 ? "semua pemeriksaan lulus" : `${failures} gagal`}`);
fs.writeFileSync(path.resolve(args.out), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(failures ? 1 : 0);
