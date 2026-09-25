// Bantu penilaian iterasi baru: untuk setiap skenario, bandingkan pengamatan
// (status, langkah, toast, checks, judul tabel, catatan, baris tabel) dengan
// pengamatan iterasi sebelumnya dan tulis ringkasan perbedaan. Tidak menilai
// Sesuai/Tidak Sesuai; penilaian tetap dilakukan terhadap Hasil yang
// Diharapkan di skenario-black-box.md.
//
// Pemakaian (root repo):
//   node testing/black-box/harness/bb-diff-iter.mjs <dir lama> <dir baru> <out.txt> [ID,...]
import fs from "fs";
import path from "path";

const [oldDir, newDir, outFile, only] = process.argv.slice(2);
const ids = only ? only.split(",") : fs.readdirSync(newDir).filter((f) => /^BB-.*\.json$/.test(f)).map((f) => f.replace(".json", "")).sort();
const tablesOf = (o) => (o.runs || []).map((r) => ({ label: r.label, toast: r.toast, newLog: r.newLog, outcome: r.outcome, tables: (r.output || []).flatMap((s) => s.tables.map((t) => ({ title: t.title, columns: t.columns, rows: t.rows, note: t.footnote }))) }));
const short = (v) => { const s = JSON.stringify(v); return s && s.length > 400 ? `${s.slice(0, 400)}…` : s; };
const lines = [];
for (const id of ids) {
    const nf = path.join(newDir, `${id}.json`);
    const of = path.join(oldDir, `${id}.json`);
    if (!fs.existsSync(nf)) { lines.push(`## ${id}: tidak ada di iterasi baru`); continue; }
    const n = JSON.parse(fs.readFileSync(nf, "utf8"));
    if (!fs.existsSync(of)) { lines.push(`## ${id}: skenario baru (tanpa pembanding), status ${n.status}`); continue; }
    const o = JSON.parse(fs.readFileSync(of, "utf8"));
    const diffs = [];
    if (o.status !== n.status) diffs.push(`status ${o.status} → ${n.status}${n.error ? ` (${n.error})` : ""}`);
    if (JSON.stringify(o.steps) !== JSON.stringify(n.steps)) diffs.push(`langkah berbeda:\n    lama ${short(o.steps)}\n    baru ${short(n.steps)}`);
    const tt = (x) => (x.toasts || []).map((t) => t.texts);
    if (JSON.stringify(tt(o)) !== JSON.stringify(tt(n))) diffs.push(`toast:\n    lama ${short(tt(o))}\n    baru ${short(tt(n))}`);
    for (const k of new Set([...Object.keys(o.checks || {}), ...Object.keys(n.checks || {})])) {
        if (JSON.stringify(o.checks?.[k]) !== JSON.stringify(n.checks?.[k])) diffs.push(`checks.${k}:\n    lama ${short(o.checks?.[k])}\n    baru ${short(n.checks?.[k])}`);
    }
    const to = tablesOf(o), tn = tablesOf(n);
    if (to.length !== tn.length) diffs.push(`jumlah run ${to.length} → ${tn.length}`);
    tn.forEach((r, i) => {
        const p = to[i] || { tables: [] };
        const titlesO = p.tables.map((t) => t.title), titlesN = r.tables.map((t) => t.title);
        if (JSON.stringify(titlesO) !== JSON.stringify(titlesN)) diffs.push(`run ${i + 1} judul tabel:\n    lama ${short(titlesO)}\n    baru ${short(titlesN)}`);
        r.tables.forEach((t) => {
            const q = p.tables.find((x) => x.title === t.title);
            if (!q) return;
            if (JSON.stringify(q.columns) !== JSON.stringify(t.columns)) diffs.push(`run ${i + 1} "${t.title}" kolom:\n    lama ${short(q.columns)}\n    baru ${short(t.columns)}`);
            if (JSON.stringify(q.note) !== JSON.stringify(t.note)) diffs.push(`run ${i + 1} "${t.title}" catatan:\n    lama ${short(q.note)}\n    baru ${short(t.note)}`);
            if (JSON.stringify(q.rows) !== JSON.stringify(t.rows)) diffs.push(`run ${i + 1} "${t.title}" baris berbeda (contoh baris 1):\n    lama ${short(q.rows?.[0])}\n    baru ${short(t.rows?.[0])}`);
        });
    });
    lines.push(`## ${id}: status ${n.status}; ${diffs.length ? `${diffs.length} perbedaan` : "identik dengan iterasi lama"}`);
    for (const d of diffs) lines.push(`  - ${d}`);
}
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(lines.filter((l) => l.startsWith("## ")).join("\n"));
