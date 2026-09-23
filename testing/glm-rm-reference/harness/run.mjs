// Runs one reference design through the RM WASM in Node and writes the plain
// result (and errors) as JSON. Usage:
//   node run.mjs <design: gambar51|a|b|c> [outFile] [--layout=subject-major|variable-major] [--pkg=<dir>]
import fs from "fs";
import { loadRm, readCsv, buildPayload, run } from "./statify-rm.mjs";
import { DESIGNS, csvPath } from "./designs.mjs";

const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const [key, outFile] = args.filter((a) => !a.startsWith("--"));
if (!DESIGNS[key]) throw new Error(`unknown design ${key}`);
const rm = await loadRm(opts.pkg);
const payload = buildPayload({ rows: readCsv(csvPath(key)), design: DESIGNS[key].design, layout: opts.layout });
const out = run(rm, payload);
const text = JSON.stringify(out, null, 2);
if (outFile) fs.writeFileSync(outFile, text + "\n");
else process.stdout.write(text + "\n");
