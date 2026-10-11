// Pemeriksaan regresi v5 dari keluaran ui-run.cjs (dialog asli, build
// produksi worktree):
//  A. respons worker mentah (nilai) v5 vs v4 per konfigurasi; setiap nilai
//     yang berubah dicantumkan (yang disengaja: B1 power Welch);
//  B. payload worker v5 = v4 per konfigurasi;
//  C. mv9 (baru) vs R (results/mv9-r/mv9_r.csv);
//  D. tabel tampil v5: tidak ada "Error: Error:"; kolom effect size/power
//     tampil (ui-run mencentang EstEffectSize dan ObsPower); catatan kaki
//     Multivariate Tests memuat "Design:".
// Pemakaian (root repo):
//   node testing/fitur-v5/harness/v5-check.mjs --run=<step20-v5> --v4=<step19-v4> --out=<file>
import fs from "fs";
import path from "path";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const RUN = path.resolve(args.run), V4 = path.resolve(args.v4);
const lines = [];
let failures = 0;
const log = (ok, text) => { if (!ok) failures += 1; lines.push(`${ok ? "OK  " : "GAGAL"} ${text}`); };
const raw = (dir, cfg) => JSON.parse(fs.readFileSync(path.join(dir, "worker", `${cfg}.raw.json`), "utf8"));
function diff(a, b, p, out) {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push([p, a, b]); return; }
    if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${p}.${k}`, out); return; }
    if (a !== b) out.push([p, a, b]);
}
const INTENDED = {
    mv2wd: /multivariate_tests\.effects\.jk\.Hotelling's Trace\.observed_power$/,
    mv2ws: /multivariate_tests\.effects\.jk\.Hotelling's Trace\.observed_power$/,
    mv2wci: /multivariate_tests\.effects\.jk\.Hotelling's Trace\.observed_power$/,
};
const cfgs = fs.readdirSync(path.join(V4, "worker")).filter((f) => f.endsWith(".raw.json")).map((f) => f.replace(".raw.json", "")).sort();
lines.push("A/B. v5 vs v4: payload dan nilai respons worker");
for (const cfg of cfgs) {
    const a = raw(V4, cfg), b = raw(RUN, cfg);
    log(JSON.stringify(a.request?.payload) === JSON.stringify(b.request?.payload), `${cfg}: payload identik`);
    const d = [];
    diff(a.response?.results, b.response?.results, "results", d);
    const unintended = d.filter(([p]) => !(INTENDED[cfg] && INTENDED[cfg].test(p)));
    const byteSame = JSON.stringify(a.response) === JSON.stringify(b.response);
    log(unintended.length === 0, `${cfg}: respons ${d.length === 0 ? (byteSame ? "identik (byte)" : "nilai identik") : `${d.length} nilai berubah, ${unintended.length} di luar perubahan disengaja`}`);
    for (const [p, x, y] of d) lines.push(`      ${p}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
}

lines.push("", "C. mv9 vs R dasar (manova, R 4.3.2)");
{
    const e = raw(RUN, "mv9").response.results.multivariate_tests.effects.kelompok;
    const [h, ...rs] = fs.readFileSync("testing/glm-mv-reference/results/mv9-r/mv9_r.csv", "utf8").trim().split(/\r?\n/);
    const cols = h.split(",").map((s) => s.replace(/"/g, ""));
    const R = Object.fromEntries(rs.map((l) => { const c = l.split(",").map((s) => s.replace(/"/g, "")); const o = Object.fromEntries(cols.map((k, i) => [k, c[i]])); return [o.test, o]; }));
    const map = { "Pillai's Trace": "Pillai", "Wilks' Lambda": "Wilks", "Hotelling's Trace": "Hotelling-Lawley", "Roy's Largest Root": "Roy" };
    let worst = 0;
    for (const [s, rn] of Object.entries(map)) for (const [k, rk] of [["value", "value"], ["f", "f"], ["hypothesis_df", "df1"], ["error_df", "df2"], ["significance", "sig"], ["noncent_parameter", "noncent"], ["observed_power", "power"]]) {
        worst = Math.max(worst, Math.abs(e[s][k] - Number(R[rn][rk])));
    }
    log(worst < 1e-8, `mv9: 28 nilai Multivariate Tests vs R, selisih maks ${worst.toExponential(2)}; df2 Wilks ${e["Wilks' Lambda"].error_df}, Sig. Wilks ${e["Wilks' Lambda"].significance}`);
}

lines.push("", "D. Tampilan v5");
for (const cfg of cfgs.concat(["mv9"])) {
    const j = JSON.parse(fs.readFileSync(path.join(RUN, "worker", `${cfg}.json`), "utf8"));
    const text = JSON.stringify(j.tables);
    if (text.includes("Error: Error:")) log(false, `${cfg}: "Error: Error:" di tabel`);
    const mt = j.tables.find((t) => t.title.startsWith("Multivariate Tests"));
    if (mt) {
        const o = JSON.parse(mt.output_data).tables[0];
        const cols = JSON.stringify(o.columnHeaders);
        log(/Design: Intercept/.test(o.note || "") && /Observed Power/.test(cols) && /Computed using alpha = \.\d+/.test(o.note || ""), `${cfg}: catatan Multivariate Tests ${JSON.stringify((o.note || "").split("\n").filter((l) => /^[a-z]\. /.test(l)))}`);
    }
}
lines.push("", `HASIL: ${failures === 0 ? "semua pemeriksaan lulus" : `${failures} gagal`}`);
fs.writeFileSync(path.resolve(args.out), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(failures ? 1 : 0);
