// Perbedaan respons worker 8 sel eksperimen antara dua tangkapan
// (capture-exp-payloads.cjs): setiap path JSON yang nilainya berbeda, dengan
// nilai sebelum/sesudah. Payload (request) juga dibandingkan.
//
// Pemakaian (root repo):
//   node testing/final/harness/exp-diff.mjs <dir A> <dir B> <label A> <label B> <out.txt>
import fs from "fs";
import path from "path";

const [dirA, dirB, la, lb, outFile] = process.argv.slice(2);
function diff(a, b, p, out) {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push([p, a, b]); return; }
    if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${p}.${k}`, out); return; }
    if (a !== b) out.push([p, a, b]);
}
const cells = fs.readdirSync(dirA).filter((f) => /^(multivariate|repeated-measures)-\d+\.json$/.test(f)).sort();
const lines = [`Respons worker ${la} vs ${lb} (path JSON, ${la} → ${lb})`, ""];
let total = 0;
for (const f of cells) {
    const A = JSON.parse(fs.readFileSync(path.join(dirA, f), "utf8"));
    const B = JSON.parse(fs.readFileSync(path.join(dirB, f), "utf8"));
    const req = [];
    diff(A.request, B.request, "request", req);
    const res = [];
    diff(A.response, B.response, "response", res);
    total += res.length;
    lines.push(`${f.replace(".json", "")}: payload beda ${req.length} path; respons beda ${res.length} path`);
    for (const [p, x, y] of res) lines.push(`  ${p}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
}
lines.push("", `total path respons berbeda: ${total}`);
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(lines.slice(0, 60).join("\n"));
