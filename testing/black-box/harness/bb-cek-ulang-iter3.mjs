// Pemeriksaan ulang offline (tanpa browser) untuk iterasi 3 atas pengamatan
// tersimpan (hasil-eksekusi/iterasi-3), untuk dua pemeriksaan harness v4 yang
// masih memakai aturan tampilan v4:
//   1. ciVsR: tampilan v5 memakai 4 desimal tetap ("22.9160"); pembanding
//      harness v4 membuang nol di belakang ("22.916"). Di sini dibandingkan
//      secara numerik pada 4 desimal (|tampil − R dibulatkan 4 desimal| = 0).
//   2. BB-KF02-06: pembanding "tabel lain sama dengan BB-KF02-01" adalah
//      BB-KF02-01 iterasi yang sama (iterasi 3), bukan iterasi 2.
// Pemakaian (root repo): node testing/black-box/harness/bb-cek-ulang-iter3.mjs
import fs from "fs";
import path from "path";

const OBS = "testing/black-box/hasil-eksekusi/iterasi-3";
const readRcsv = (f) => {
    const [head, ...body] = fs.readFileSync(f, "utf8").trim().split(/\r?\n/);
    const cols = head.split(",").map((s) => s.replace(/"/g, ""));
    return body.map((l) => Object.fromEntries(l.split(",").map((s, i) => [cols[i], s.replace(/"/g, "")])));
};
const R = readRcsv("testing/fitur-v4/r/ci_simultan_r.csv");
const obs = (id) => JSON.parse(fs.readFileSync(path.join(OBS, `${id}.json`), "utf8"));
const tableOf = (run, title) => { for (const s of run.output || []) for (const t of s.tables) if (t.title === title) return t; return null; };
const out = {};
// Skenario, konfigurasi R, run ke-, urutan DV dan pergeseran δ₀ (sama dengan bb-run-v4.cjs).
const CI = [["BB-KF02-04", "mv1ci", 0], ["BB-KF02-05", "mv1ci10", 0], ["BB-KF03-10", "mv2ci", 0], ["BB-KF03-11", "mv2wci", 0], ["BB-KF03-12", "mv2dci", 0], ["BB-KF04-04", "mv3dci", 0]];
let total = 0, beda = 0;
for (const [id, cfg, runIdx] of CI) {
    const o = obs(id);
    const run = (o.runs || []).filter((r) => r.output)[runIdx];
    const t = run && tableOf(run, "Simultaneous Confidence Intervals");
    const rows = R.filter((r) => r.config === cfg);
    const diffs = [];
    let n = 0;
    (t?.rows || []).forEach((row, i) => {
        const r = rows[i];
        const keys = ["estimate", "std_error", "t2_lower", "t2_upper", "bonferroni_lower", "bonferroni_upper", ...(row.bonferroni_df !== undefined ? ["bonferroni_df"] : [])];
        for (const k of keys) {
            n += 1;
            const shown = Number(row[k]);
            const want = Number(Number(r[k]).toFixed(4));
            if (!(Math.abs(shown - want) < 1e-9)) diffs.push({ dv: row.dependent_variable, kolom: k, tampil: row[k], R: r[k] });
        }
    });
    total += n; beda += diffs.length;
    out[`${id} ${cfg}`] = { tabel: Boolean(t), nilaiDibandingkan: n, beda: diffs };
}
out.ringkasanCI = { nilaiDibandingkan: total, beda };
// BB-KF02-06 vs BB-KF02-01 iterasi 3 (tanpa Errors Logs).
const strip = (o) => ((o.runs || []).find((r) => r.output)?.output || []).filter((s) => s.title !== "Errors Logs").map((s) => ({ title: s.title, tables: s.tables.map((t) => ({ title: t.title, rows: t.rows, footnote: t.footnote })) }));
out["BB-KF02-06 sama dengan BB-KF02-01 iterasi 3"] = JSON.stringify(strip(obs("BB-KF02-06"))) === JSON.stringify(strip(obs("BB-KF02-01")));
fs.writeFileSync(path.join(OBS, "cek-ulang-offline.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
