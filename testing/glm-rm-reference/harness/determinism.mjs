// Tahap 1 proof: the same analysis N times in ONE module instance (as the app
// reuses its worker / main-thread module) and N times in N fresh instances.
// Output (results + errors, serialised) must be byte-identical everywhere.
// Usage: node determinism.mjs [--pkg=<dir>] [--n=10] [--designs=gambar51,a,b,c] [--out=<file>]
import fs from "fs";
import crypto from "crypto";
import { loadRm, readCsv, buildPayload, run } from "./statify-rm.mjs";
import { DESIGNS, csvPath } from "./designs.mjs";
import { heavyDesign } from "./heavy.mjs";

const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const N = Number(opts.n || 10);
const keys = (opts.designs || "gambar51,a,b,c,L10M1,L10M2").split(",");
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

const report = { pkg: opts.pkg || "rust/pkg", n: N, designs: {} };
for (const key of keys) {
    const { rows, design } = DESIGNS[key]
        ? { rows: readCsv(csvPath(key)), design: DESIGNS[key].design }
        : heavyDesign(key);
    const payload = buildPayload({ rows, design, layout: opts.layout });
    const same = [];
    const shared = await loadRm(opts.pkg);
    let sharedBroken = false;
    for (let i = 0; i < N; i++) {
        if (sharedBroken) { same.push("(instance unusable after panic)"); continue; }
        const out = run(shared, payload);
        if (out.panic) sharedBroken = true;
        same.push(JSON.stringify(out));
    }
    const fresh = [];
    for (let i = 0; i < N; i++) fresh.push(JSON.stringify(run(await loadRm(opts.pkg), payload)));
    const hashes = [...same, ...fresh].map(md5);
    const r = {
        sameInstance: new Set(same.map(md5)).size === 1,
        freshInstances: new Set(fresh.map(md5)).size === 1,
        sameEqualsFresh: md5(same[0]) === md5(fresh[0]),
        distinctOutputs: new Set(hashes).size,
        panic: JSON.parse(fresh[0]).panic || null,
        firstHash: hashes[0],
    };
    report.designs[key] = r;
    console.log(`${key.padEnd(9)} same-instance identical: ${r.sameInstance}  fresh identical: ${r.freshInstances}  same==fresh: ${r.sameEqualsFresh}  distinct outputs: ${r.distinctOutputs}${r.panic ? `  PANIC: ${r.panic}` : ""}`);
}
if (opts.out) fs.writeFileSync(opts.out, JSON.stringify(report, null, 2) + "\n");
