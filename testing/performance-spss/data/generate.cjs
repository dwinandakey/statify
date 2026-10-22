// Deterministic datasets for the Statify vs IBM SPSS Statistics 27 timing
// comparison (../README.md). One CSV per procedure × size; the same file is
// imported by Statify (UI) and read by SPSS (GET DATA /TYPE=TXT).
//
//  - mv1: One-Way MANOVA. Y1..Y4, factor A (A1..A3), A = i mod 3 (balanced).
//  - mv2: Two-Way MANOVA. Y1..Y4, A (A1..A3) × B (B1, B2), full factorial;
//         the 6 cells repeat every 6 rows (balanced, crossed).
//  - rm:  Repeated Measures. t1..t4 (within factor "time", 4 levels, measure
//         "score"), between factor group (G1..G3), group = s mod 3.
//
// Each value = mean + effects + shared/subject component + own noise, drawn
// from a seeded PRNG (mulberry32 + Box–Muller, as in
// ../../glm-web-worker/experiment/datasets.cjs), 6 decimals. The effects are
// moderate (univariate partial eta squared roughly 0.03–0.10), so the data
// are not degenerate.
//
// --codes=numeric writes the factor levels as numeric codes (1, 2, 3) instead
// of strings (A1, G1, ...); every other value is identical (same seeds). Used
// for n = 100 000: the Statify CSV import worker fails on a string column with
// more than about 63 600 rows ("Maximum call stack size exceeded",
// public/workers/DataManagement/csvWorker.js, Math.max(...colData) for the
// width), while numeric columns import (pilot 2026-10-16).
//
// Usage: node generate.cjs [outDir] [sizes] [--codes=numeric]
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SEED = { mv1: 20261016, mv2: 20261017, rm: 20261018 };
const SIZES = [100, 1000, 10000, 100000];

function mulberry32(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const normalFrom = (rand) => () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
const fmt = (x) => x.toFixed(6);

const NUMERIC_CODES = process.argv.includes("--codes=numeric");
const level = (prefix, i) => (NUMERIC_CODES ? String(i + 1) : `${prefix}${i + 1}`);

const MU = [50, 40, 30, 20];
const EFFECT_A = [0.4, -0.3, 0.25, 0.1]; // per DV, multiplied by (a - 1) ∈ {-1, 0, 1}
const EFFECT_B = [0.3, 0.2, -0.25, 0.15]; // per DV, multiplied by ±0.5
const EFFECT_AB = [0.2, 0, -0.15, 0]; // per DV, cell A3·B2 only

function mv1Rows(n) {
    const normal = normalFrom(mulberry32(SEED.mv1));
    const rows = [];
    for (let i = 0; i < n; i += 1) {
        const a = i % 3;
        const shared = normal();
        const ys = MU.map((mu, k) => mu + EFFECT_A[k] * (a - 1) + 0.6 * shared + normal());
        rows.push([...ys.map(fmt), level("A", a)]);
    }
    return { columns: ["Y1", "Y2", "Y3", "Y4", "A"], rows };
}

function mv2Rows(n) {
    const normal = normalFrom(mulberry32(SEED.mv2));
    const rows = [];
    for (let i = 0; i < n; i += 1) {
        const a = i % 3, b = Math.floor(i / 3) % 2;
        const shared = normal();
        const ys = MU.map((mu, k) => mu + EFFECT_A[k] * (a - 1) + EFFECT_B[k] * (b - 0.5)
            + (a === 2 && b === 1 ? EFFECT_AB[k] : 0) + 0.6 * shared + normal());
        rows.push([...ys.map(fmt), level("A", a), level("B", b)]);
    }
    return { columns: ["Y1", "Y2", "Y3", "Y4", "A", "B"], rows };
}

// y(s, l) = 50 + 0.5·l + 0.6·(g - 1) + 0.15·l·(g - 1) + subject + e,
// l = 0..3, g = 0..2, subject ~ N(0, 2²), e ~ N(0, 1.5²) per cell.
function rmRows(n) {
    const normal = normalFrom(mulberry32(SEED.rm));
    const rows = [];
    for (let s = 0; s < n; s += 1) {
        const g = s % 3;
        const subject = 2 * normal();
        const ts = [0, 1, 2, 3].map((l) => 50 + 0.5 * l + 0.6 * (g - 1) + 0.15 * l * (g - 1) + subject + 1.5 * normal());
        rows.push([...ts.map(fmt), level("G", g)]);
    }
    return { columns: ["t1", "t2", "t3", "t4", "group"], rows };
}

const GENERATORS = { mv1: mv1Rows, mv2: mv2Rows, rm: rmRows };

function toCsv({ columns, rows }) {
    return [columns.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";
}

const fileName = (proc, n) => `${proc}-n${n}.csv`;

function writeAll(dir, sizes = SIZES) {
    fs.mkdirSync(dir, { recursive: true });
    // Merge with an existing manifest (e.g. one size added later).
    const manifestPath = path.join(dir, "manifest.json");
    const manifest = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).filter((m) => !sizes.includes(m.n))
        : [];
    for (const proc of Object.keys(GENERATORS)) {
        for (const n of sizes) {
            const text = toCsv(GENERATORS[proc](n));
            const file = path.join(dir, fileName(proc, n));
            fs.writeFileSync(file, text);
            manifest.push({ file: fileName(proc, n), proc, n, seed: SEED[proc], factorCodes: NUMERIC_CODES ? "numeric" : "string", bytes: Buffer.byteLength(text), sha256: crypto.createHash("sha256").update(text).digest("hex") });
            console.log(file);
        }
    }
    manifest.sort((a, b) => a.proc.localeCompare(b.proc) || a.n - b.n);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    return manifest;
}

module.exports = { GENERATORS, SIZES, SEED, fileName, writeAll };

if (require.main === module) {
    const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const dir = pos[0] || __dirname;
    const sizes = pos[1] ? pos[1].split(",").map(Number) : SIZES;
    writeAll(dir, sizes);
}
