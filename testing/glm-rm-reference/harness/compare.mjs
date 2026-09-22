// Compares two RM result objects value by value, independent of key order:
// every object is compared by key (keys sorted), arrays by index (optionally
// sorted by their JSON), numbers with a tolerance. Used for the Gambar 51
// regression and for Tahap 5.
//   node compare.mjs <a.json> <b.json> [--tol=1e-9] [--sort-arrays]
import fs from "fs";
import path from "path";

export function canonical(v, sortArrays = false) {
    if (Array.isArray(v)) {
        const items = v.map((x) => canonical(x, sortArrays));
        return sortArrays ? items.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)) : items;
    }
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k], sortArrays)]));
    return v;
}

/** Returns a list of differences { path, a, b }. */
export function diffValues(a, b, { tol = 1e-9, sortArrays = false } = {}) {
    const out = [];
    const walk = (x, y, path) => {
        if (typeof x === "number" && typeof y === "number") {
            const ok = x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y)));
            if (!ok) out.push({ path, a: x, b: y });
            return;
        }
        if (Array.isArray(x) && Array.isArray(y)) {
            if (x.length !== y.length) out.push({ path: `${path}.length`, a: x.length, b: y.length });
            for (let i = 0; i < Math.min(x.length, y.length); i++) walk(x[i], y[i], `${path}[${i}]`);
            return;
        }
        if (x && y && typeof x === "object" && typeof y === "object") {
            for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
                if (!(k in x) || !(k in y)) out.push({ path: `${path}.${k}`, a: k in x ? "(present)" : "(missing)", b: k in y ? "(present)" : "(missing)" });
                else walk(x[k], y[k], `${path}.${k}`);
            }
            return;
        }
        if (x !== y) out.push({ path, a: x, b: y });
    };
    walk(canonical(a, sortArrays), canonical(b, sortArrays), "");
    return out;
}

if (process.argv[1] && path.basename(process.argv[1]) === "compare.mjs") {
    const args = process.argv.slice(2);
    const opts = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
    const [fa, fb] = args.filter((a) => !a.startsWith("--"));
    const d = diffValues(JSON.parse(fs.readFileSync(fa, "utf8")), JSON.parse(fs.readFileSync(fb, "utf8")),
        { tol: Number(opts.tol ?? 1e-9), sortArrays: "sort-arrays" in opts });
    console.log(d.length ? `${d.length} differences` : "no differences");
    for (const x of d.slice(0, Number(opts.max || 40))) console.log(`  ${x.path}: ${JSON.stringify(x.a)} vs ${JSON.stringify(x.b)}`);
    process.exitCode = d.length ? 1 : 0;
}
