// Step checks of the fixes (validation/mv-spss):
//  1. SPSS comparison before vs after: no value that passed before may fail
//     now (key: config | table | labels | field).
//  2. Main thread vs Web Worker: the stored output tables (title + output_data)
//     of every configuration must be byte-identical.
//
// Usage (repo root):
//   node testing/glm-mv-reference/harness/regress.mjs --before=<compare-spss.json> --after=<compare-spss.json> \
//        --main=<ui-run out dir, mode main> --worker=<ui-run out dir, mode worker> [--out=<file>]
import fs from "fs";
import path from "path";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const key = (r) => `${r.config} | ${r.table} | ${r.labels.join(" / ")} | ${r.field}`;
const lines = [];

const before = new Map(read(args.before).results.map((r) => [key(r), r]));
const after = new Map(read(args.after).results.map((r) => [key(r), r]));
const count = (m) => [...m.values()].filter((r) => r.pass).length;
const regressions = [...before.entries()].filter(([k, r]) => r.pass && !after.get(k)?.pass);
const fixed = [...after.entries()].filter(([k, r]) => r.pass && before.has(k) && !before.get(k).pass);
lines.push(`SPSS: lulus sebelum ${count(before)}, sesudah ${count(after)} (dari ${after.size} nilai); diperbaiki ${fixed.length}; REGRESI ${regressions.length}`);
for (const [k, r] of regressions) lines.push(`  REGRESI ${k}: SPSS ${r.spss}, sebelum ${r.statify}, sesudah ${after.get(k)?.statify}`);

let identical = true;
if (args.main && args.worker) {
    for (const f of fs.readdirSync(args.worker).filter((x) => /^mv\d+\.json$/.test(x))) {
        const w = read(path.join(args.worker, f));
        const m = read(path.join(args.main, f));
        const sig = (o) => JSON.stringify(o.tables.map((t) => [t.title, t.output_data]));
        const same = sig(w) === sig(m);
        identical &&= same;
        lines.push(`main vs worker ${f}: mode ${m.modeActual}/${w.modeActual}, ${w.tables.length} tabel, byte-identik ${same}`);
    }
}
lines.push(`HASIL: regresi ${regressions.length}, main=worker ${identical}`);
const text = lines.join("\n") + "\n";
if (args.out) fs.writeFileSync(args.out, text);
process.stdout.write(text);
process.exit(regressions.length === 0 && identical ? 0 : 1);
