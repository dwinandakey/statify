// Nilai mentah build final vs v5: untuk setiap konfigurasi yang ada di kedua
// run, bandingkan payload worker (request.payload) dan respons (response.results)
// byte demi byte (JSON.stringify, termasuk urutan kunci).
//
// Pemakaian (root repo):
//   node testing/final/harness/raw-vs-v5.mjs <dir v5> <dir final> <out.txt>
import fs from "fs";
import path from "path";

const [v5Dir, finalDir, outFile] = process.argv.slice(2);
const raws = fs.readdirSync(v5Dir).filter((f) => f.endsWith(".raw.json")).sort();
const lines = [];
let bad = 0;
for (const f of raws) {
    const other = path.join(finalDir, f);
    if (!fs.existsSync(other)) { lines.push(`${f.replace(".raw.json", "")}: tidak ada di run final`); bad += 1; continue; }
    const a = JSON.parse(fs.readFileSync(path.join(v5Dir, f), "utf8"));
    const b = JSON.parse(fs.readFileSync(other, "utf8"));
    const payload = JSON.stringify(a.request?.payload) === JSON.stringify(b.request?.payload);
    const results = JSON.stringify(a.response?.results) === JSON.stringify(b.response?.results);
    const errors = JSON.stringify(a.response?.errors) === JSON.stringify(b.response?.errors);
    if (!(payload && results && errors)) bad += 1;
    lines.push(`${f.replace(".raw.json", "")}: payload identik ${payload} | respons (results) identik ${results} | errors identik ${errors}`);
}
lines.push(`konfigurasi: ${raws.length}, tidak identik: ${bad}`);
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(bad ? 1 : 0);
