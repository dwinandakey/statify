// Bandingkan payload (request worker) dan respons 8 sel eksperimen Web Worker
// antar-versi. Masukan: direktori tangkapan (capture-exp-payloads.cjs, satu
// JSON per sel berisi request/response worker). Keluaran: hash sha256 (12
// karakter) per versi dan status identik byte (JSON.stringify, termasuk
// urutan kunci).
//
// Pemakaian (root repo):
//   node testing/fitur-v4/harness/exp-compare.mjs v1=<dir> v2=<dir> v3=<dir> v4=<dir> [--out=<file>]
import crypto from "crypto";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith("--out="))?.slice(6);
const versions = args.filter((a) => !a.startsWith("--")).map((a) => a.split("="));
const cells = fs.readdirSync(versions[0][1]).filter((f) => /^(multivariate|repeated-measures)-\d+\.json$/.test(f)).sort();
const h = (x) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 12);
const lines = [];
let bad = 0;
for (const f of cells) {
    const caps = versions.map(([v, dir]) => [v, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))]);
    const req = caps.map(([v, c]) => [v, h(c.request)]);
    const res = caps.map(([v, c]) => [v, h(c.response)]);
    const reqSame = new Set(req.map((x) => x[1])).size === 1;
    const resSame = new Set(res.map((x) => x[1])).size === 1;
    const modes = caps.map(([, c]) => c.modeActual);
    if (!reqSame || !resSame || modes.some((m) => m !== "worker")) bad += 1;
    lines.push(`${f.replace(".json", "")}: payload ${req.map(([v, x]) => `${v} ${x}`).join(" ")} identik ${reqSame} | respons ${res.map(([v, x]) => `${v} ${x}`).join(" ")} identik ${resSame} | mode ${[...new Set(modes)].join(",")}`);
}
lines.push(`sel: ${cells.length}, tidak identik: ${bad}`);
const text = lines.join("\n") + "\n";
process.stdout.write(text);
if (out) fs.writeFileSync(out, text);
process.exit(bad ? 1 : 0);
