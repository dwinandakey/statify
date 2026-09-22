// Regression: Gambar 51 dataset (within-only, 1 measure) — Mauchly's test.
// Checks the current rust/pkg against
//  (1) the pre-fix Statify output (statify-baseline/gambar51.json), full precision (tol 1e-12),
//      except the intended change of Sig. (ω₂ correction, validation against SPSS);
//  (2) the SPSS 27 output of spss/gambar51.sps (spss-output/spss-values.json), tol 1e-9;
//  (3) the values listed by the user for Gambar 51, rounded to 3 decimals.
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
// Sig. before the SPSS validation: χ² tail without the ω₂ correction (0.2963); SPSS 27: 0.2975.
const INTENDED = new Set(["significance"]);
const spssFile = path.join(here, "../spss-output/spss-values.json");
const FIELD = { mauchly_w: "Mauchly's W", chi_square: "Approx. Chi-Square", df: "df", significance: "Sig.",
    greenhouse_geisser_epsilon: "Greenhouse-Geisser", huynh_feldt_epsilon: "Huynh-Feldt", lower_bound_epsilon: "Lower-bound" };
const spss = fs.existsSync(spssFile)
    ? Object.fromEntries(JSON.parse(fs.readFileSync(spssFile, "utf8"))
        .filter((e) => e.dataset === "gambar51" && e.table === "mauchly").map((e) => [e.field, e.value]))
    : {};
let fail = 0;
console.log("field                        now                  baseline(pre-fix)    |Δ| base   SPSS 27              |Δ| SPSS   user(3dp) now(3dp)");
for (const f of Object.keys(user)) {
    const d = Math.abs(now[f] - base[f]);
    const s = spss[FIELD[f]];
    const ds = typeof s === "number" ? Math.abs(now[f] - s) : NaN;
    const r3 = Number(now[f].toFixed(3));
    const okBase = d <= 1e-12 || INTENDED.has(f);
    const okSpss = !(ds > 1e-9);
    if (!okBase || !okSpss) fail++;
    console.log(`${f.padEnd(28)} ${String(now[f]).padEnd(20)} ${String(base[f]).padEnd(20)} ${d.toExponential(1).padEnd(10)} ${String(s ?? "-").padEnd(20)} ${(Number.isNaN(ds) ? "-" : ds.toExponential(1)).padEnd(10)} ${String(user[f]).padEnd(9)} ${r3}`
        + `${r3 === user[f] ? "" : "  ≠ nilai pengguna"}${d <= 1e-12 ? "" : INTENDED.has(f) ? "  (berubah sengaja: koreksi ω₂ seperti SPSS)" : "  ✗ BERUBAH"}${okSpss ? "" : "  ✗ ≠ SPSS"}`);
}
console.log(fail
    ? `REGRESI GAGAL: ${fail} nilai berubah dari baseline atau berbeda dari SPSS`
    : "regresi Gambar 51: semua nilai sama dengan baseline (presisi penuh; Sig. berubah sengaja) dan dengan SPSS 27 (tol 1e-9)");
process.exitCode = fail ? 1 : 0;
