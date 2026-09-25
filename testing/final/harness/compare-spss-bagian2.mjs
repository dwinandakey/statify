// Bagian 2: bandingkan keluaran SPSS 27 sintaks di testing/SPSS-TODO.md
// (testing/final/bagian2/spss-values-bagian2.json, dari spss_bagian2.py)
// dengan nilai mentah Statify build final (respons worker lewat dialog asli).
// Letak sel memakai locate()/getPath() mapping.mjs (sama dengan uji acuan
// SPSS); peta DV/level ditambahkan di sini tanpa mengubah mapping.mjs.
// Kriteria: |Statify − SPSS| ≤ 0,001.
//
// Pemakaian (root repo): node testing/final/harness/compare-spss-bagian2.mjs
import fs from "fs";
import path from "path";
import { MAP, locate, getPath } from "../../glm-mv-reference/harness/mapping.mjs";

const TOL = 0.001;
const OUT = "testing/final/bagian2";
const spss = JSON.parse(fs.readFileSync(path.join(OUT, "spss-values-bagian2.json"), "utf8"));
const raw = (dir, cfg) => JSON.parse(fs.readFileSync(path.join(dir, `${cfg}.raw.json`), "utf8")).response.results;

// Konfigurasi SPSS → run Statify (dan peta label SPSS → nama Statify).
const B3 = "testing/final/bagian3/worker";
const SRC = {
    mv9: { run: () => raw(B3, "mv9"), statify: "mv9 (build final)", map: { dv: {}, level: {} } },
    "mv6-typeI-II#1": { run: () => raw(path.join(OUT, "worker"), "mv6t1"), statify: "mv6t1 (Type I, lewat UI)", map: MAP.mv6 },
    "mv6-typeI-II#2": { run: () => raw(path.join(OUT, "worker"), "mv6t2"), statify: "mv6t2 (Type II, lewat UI)", map: MAP.mv6 },
    "mv2-delta0": { run: () => raw(B3, "mv2d"), statify: "mv2d (δ₀ = 3, 2, 10, 1, Pooled)", map: MAP.mv2 },
    "mv3-delta0": {
        run: () => raw(B3, "mv3d"),
        statify: "mv3d (berpasangan, δ₀ = 8, 3)",
        map: { dv: { "kedalaman1 - kedalaman2 - 8": "d_kedalaman1_minus_kedalaman2", "ukuran1 - ukuran2 - 3": "d_ukuran1_minus_ukuran2" }, level: {} },
        // DV SPSS = d − δ₀; Statify menyimpan statistik deskriptif d. Mean
        // dibandingkan sebagai Mean SPSS + δ₀ (SD dan N tidak terpengaruh).
        meanShift: { "kedalaman1 - kedalaman2 - 8": 8, "ukuran1 - ukuran2 - 3": 3 },
    },
};
const keyOf = (e) => (e.config === "mv6-typeI-II" ? `${e.config}#${e.occurrence}` : e.config);
for (const [k, s] of Object.entries(SRC)) MAP[k] = s.map;
const runs = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, s.run()]));

// Kolom SS Type I/II memakai sel yang sama dengan Type III di Statify.
const normField = (f) => (/^Type (I|II|III|IV) Sum of Squares$/.test(f) ? "Type III Sum of Squares" : f);

const rows = [];
for (const e of spss) {
    const k = keyOf(e);
    const entry = { ...e, config: k, field: normField(e.field) };
    const loc = locate(entry);
    let statify;
    let note = "";
    if (loc.missing) note = loc.missing;
    else statify = getPath(runs[k], loc.path);
    if (typeof statify === "number" && loc.scale) statify *= loc.scale;
    let expected = e.value;
    if (SRC[k].meanShift && e.table === "Descriptive Statistics" && e.field === "Mean") {
        expected = e.value + SRC[k].meanShift[e.labels[0]];
        note = "Mean SPSS + δ₀";
    }
    const diff = typeof statify === "number" ? Math.abs(statify - expected) : null;
    rows.push({ config: k, table: e.table, labels: e.labels, field: e.field, spss: e.value, expected, statify: statify ?? null, diff, pass: diff !== null && diff <= TOL, note, source: e.source });
}

const lines = [`Statify (build final, respons worker lewat UI) vs SPSS 27, toleransi ${TOL}`, ""];
lines.push("config | Statify | tabel | nilai | dibandingkan | lulus | gagal | tanpa padanan | selisih maks | di");
const groups = {};
for (const r of rows) (groups[`${r.config}|${r.table}`] ??= []).push(r);
let tot = { n: 0, cmp: 0, pass: 0, fail: 0, miss: 0 };
for (const [g, rs] of Object.entries(groups)) {
    const [cfg, table] = g.split("|");
    const cmp = rs.filter((r) => r.diff !== null);
    const fail = cmp.filter((r) => !r.pass);
    const worst = cmp.reduce((a, r) => (a && a.diff >= r.diff ? a : r), null);
    tot = { n: tot.n + rs.length, cmp: tot.cmp + cmp.length, pass: tot.pass + cmp.length - fail.length, fail: tot.fail + fail.length, miss: tot.miss + rs.length - cmp.length };
    lines.push(`${cfg} | ${SRC[cfg].statify} | ${table} | ${rs.length} | ${cmp.length} | ${cmp.length - fail.length} | ${fail.length} | ${rs.length - cmp.length} | ${worst ? worst.diff.toExponential(2) : "-"} | ${worst ? `${worst.labels.join(" / ")} · ${worst.field}` : ""}`);
}
lines.push("", `Total: ${tot.n} nilai SPSS; dibandingkan ${tot.cmp}; lulus ${tot.pass}; gagal ${tot.fail}; tanpa padanan ${tot.miss}`);
const fails = rows.filter((r) => r.diff !== null && !r.pass);
if (fails.length) {
    lines.push("", "Gagal:");
    for (const r of fails) lines.push(`  ${r.config} | ${r.table} | ${r.labels.join(" / ")} · ${r.field}: SPSS ${r.spss} Statify ${r.statify} (selisih ${r.diff})`);
}
const miss = rows.filter((r) => r.diff === null);
if (miss.length) {
    lines.push("", "Tanpa padanan (alasan):");
    const why = {};
    for (const r of miss) { const w = `${r.config} | ${r.table} | ${r.note || "sel Statify tidak ditemukan"}`; why[w] = (why[w] || 0) + 1; }
    for (const [w, n] of Object.entries(why)) lines.push(`  ${w}: ${n}`);
}
fs.writeFileSync(path.join(OUT, "compare-spss-bagian2.txt"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "compare-spss-bagian2.json"), JSON.stringify(rows, null, 1));
console.log(lines.join("\n"));
