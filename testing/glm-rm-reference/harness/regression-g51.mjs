// Regression: Gambar 51 dataset (within-only, 1 measure) — Mauchly's test.
// Checks the current rust/pkg against
//  (1) the pre-fix Statify output (statify-baseline/gambar51.json), full precision (tol 1e-12);
//  (2) the values listed by the user for Gambar 51, rounded to 3 decimals.
// Usage: node regression-g51.mjs [--pkg=<dir>]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadRm, readCsv, buildPayload, run } from "./statify-rm.mjs";
import { DESIGNS, csvPath } from "./designs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const out = run(await loadRm(opts.pkg), buildPayload({ rows: readCsv(csvPath("gambar51")), design: DESIGNS.gambar51.design }));
const entry = (t) => t.anjing ?? t.perlakuan; // key: measure (after Tahap 1) or factor (before)
const now = entry(out.results.mauchly_test.tests);
const base = entry(JSON.parse(fs.readFileSync(path.join(here, "../statify-baseline/gambar51.json"), "utf8")).results.mauchly_test.tests);
const user = { mauchly_w: 0.619, chi_square: 6.164, df: 5, significance: 0.298, greenhouse_geisser_epsilon: 0.747, huynh_feldt_epsilon: 0.896, lower_bound_epsilon: 0.333 };
let fail = 0;
console.log("field                         now                  baseline(pre-fix)    |Δ|        user(3 dp)  now(3 dp)");
for (const f of Object.keys(user)) {
    const d = Math.abs(now[f] - base[f]);
    const r3 = Number(now[f].toFixed(3));
    const okBase = d <= 1e-12;
    if (!okBase) fail++;
    console.log(`${f.padEnd(28)} ${String(now[f]).padEnd(20)} ${String(base[f]).padEnd(20)} ${d.toExponential(1).padEnd(10)} ${String(user[f]).padEnd(11)} ${r3}${r3 === user[f] ? "" : "  ≠ nilai pengguna"}${okBase ? "" : "  ✗ BERUBAH"}`);
}
console.log(fail ? `REGRESI GAGAL: ${fail} nilai berubah dari baseline` : "regresi Gambar 51: semua nilai sama dengan baseline (presisi penuh)");
process.exitCode = fail ? 1 : 0;
