// Menjelaskan perbedaan hash tabel RM build final vs step20-v5.
// Antara keduanya hanya commit 944238f0 (shared/spss-footnotes.ts) yang
// mengubah tampilan RM: catatan Statify yang sudah ada ditutup dengan "."
// sebelum baris catatan kaki berhuruf ("\na. …"). Skrip ini mengambil tabel
// final (ui-main-worker.cjs --saveTables), membalik perubahan itu (mencoba
// setiap catatan dengan dan tanpa "." tambahan), lalu menghitung hash seperti
// ui-main-worker.cjs dan mencocokkannya dengan hash step20-v5.
//
// Pemakaian (root repo):
//   node testing/final/harness/rm-hash-reconstruct.mjs <dir tabel> <out.txt>
import crypto from "crypto";
import fs from "fs";
import path from "path";

const [dir, outFile] = process.argv.slice(2);
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex").slice(0, 12);
const v5 = {
    ...JSON.parse(fs.readFileSync("testing/glm-mv-reference/results/fix-steps/step20-v5/rm/rm-ui-main-worker.json", "utf8")).designs,
    ...JSON.parse(fs.readFileSync("testing/glm-mv-reference/results/fix-steps/step20-v5/rm/rm-ui-main-worker-exp5000.json", "utf8")).designs,
};
const hashOf = (tables) => md5(JSON.stringify(tables.map((t) => `${t.title}|${crypto.createHash("md5").update(String(t.output_data)).digest("hex").slice(0, 12)}`).sort()));
const lines = [];
let bad = 0;
for (const key of Object.keys(v5)) {
    const file = path.join(dir, `ui-${key}-1-main.json`);
    if (!fs.existsSync(file)) { lines.push(`${key}: tabel final tidak ada`); bad += 1; continue; }
    const tables = JSON.parse(fs.readFileSync(file, "utf8"));
    const finalHash = hashOf(tables);
    // Kandidat: setiap catatan yang memuat ".\na. " (titik tepat sebelum baris berhuruf pertama).
    const spots = [];
    tables.forEach((t, ti) => {
        const od = JSON.parse(t.output_data);
        (od.tables || []).forEach((tb, bi) => { if (typeof tb.note === "string" && /\.\na\. /.test(tb.note)) spots.push([ti, bi]); });
    });
    let match = null;
    for (let mask = 0; mask < 1 << spots.length && !match; mask++) {
        const copy = tables.map((t) => ({ ...t }));
        const parsed = copy.map((t) => JSON.parse(t.output_data));
        spots.forEach(([ti, bi], k) => {
            if (mask & (1 << k)) parsed[ti].tables[bi].note = parsed[ti].tables[bi].note.replace(/\.\na\. /, "\na. ");
        });
        copy.forEach((t, i) => { t.output_data = JSON.stringify(parsed[i]); });
        if (hashOf(copy) === v5[key].runs[0].hash) match = { mask, removed: spots.filter((_, k) => mask & (1 << k)).length };
    }
    if (!match) bad += 1;
    lines.push(`${key}: hash v5 ${v5[key].runs[0].hash} | final ${finalHash} | catatan kandidat ${spots.length} | ` +
        (match ? `hash v5 terbentuk kembali setelah ${match.removed} titik tambahan 944238f0 dihapus${match.removed === 0 ? " (tidak ada catatan yang berubah)" : ""}` : "TIDAK dapat direkonstruksi"));
}
lines.push(`desain: ${Object.keys(v5).length}, tidak terjelaskan: ${bad}`);
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(lines.join("\n"));
