// Nilai mentah build sesudah perbaikan temuan Bagian 2 vs v5: setiap path
// yang berbeda (payload dan respons worker) harus tepat sama dengan daftar
// perubahan dari replay payload v5 ke WASM baru (replay-diff.mjs), dengan
// nilai sesudah yang sama. Tidak boleh ada perbedaan lain.
//
// Pemakaian (root repo):
//   node testing/final/harness/raw-vs-v5-diharapkan.mjs <dir v5> <dir baru> <replay.txt> <out.txt>
import fs from "fs";
import path from "path";

const [v5Dir, newDir, replayFile, outFile] = process.argv.slice(2);
// replay.txt: "<cfg>: n nilai berbeda" lalu baris "   <path>: <lama> → <baru>".
const expected = {};
let cur = null;
for (const line of fs.readFileSync(replayFile, "utf8").split(/\r?\n/)) {
    const h = line.match(/^(\S+): /);
    if (h) { cur = h[1]; expected[cur] ??= {}; continue; }
    const m = line.match(/^\s+(results\.\S.*?): (.*) → (.*)$/);
    if (m && cur) expected[cur][m[1]] = m[3];
}
function diff(a, b, p, out) {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push([p, a, b]); return; }
    if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${p}.${k}`, out); return; }
    if (a !== b) out.push([p, a, b]);
}
const lines = [];
let bad = 0;
for (const f of fs.readdirSync(v5Dir).filter((f) => f.endsWith(".raw.json")).sort()) {
    const cfg = f.replace(".raw.json", "");
    const a = JSON.parse(fs.readFileSync(path.join(v5Dir, f), "utf8"));
    const b = JSON.parse(fs.readFileSync(path.join(newDir, f), "utf8"));
    const payloadSame = JSON.stringify(a.request?.payload) === JSON.stringify(b.request?.payload);
    const d = [];
    diff(a.response?.results, b.response?.results, "results", d);
    const exp = expected[cfg] || {};
    const unexpected = d.filter(([p, , nv]) => !(p in exp) || String(nv) !== exp[p]);
    const missing = Object.keys(exp).filter((p) => !d.some(([q]) => q === p));
    const ok = payloadSame && unexpected.length === 0 && missing.length === 0;
    if (!ok) bad += 1;
    lines.push(`${cfg}: payload identik ${payloadSame} | path berubah ${d.length} (diharapkan ${Object.keys(exp).length}) | tak terduga ${unexpected.length} | hilang ${missing.length}${ok ? "" : " GAGAL"}`);
    for (const [p, o, n] of unexpected) lines.push(`   tak terduga ${p}: ${JSON.stringify(o)} → ${JSON.stringify(n)}`);
}
lines.push(`konfigurasi: ${lines.filter((l) => !l.startsWith("   ")).length}, tidak sesuai harapan: ${bad}`);
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(bad ? 1 : 0);
