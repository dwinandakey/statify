// Deterministic datasets for the A/B experiment (compare_web_workers.md §4.2).
//  - Multivariate: 5 DV × 3 fixed factors (4 × 3 × 2 levels), n = cases.
//    NOT the Jest performance generator: there F3 = i mod 2 is fully determined
//    by F1 = i mod 4, so only 12 of 24 cells exist and the dialog's default
//    full-factorial model fails ("Matrix is singular", pilot 2026-09-22).
//    Here the factors are crossed and balanced (the 24 cells repeat every 24
//    rows) and each DV = cell effects + shared noise + own noise from a seeded
//    PRNG, so the data are deterministic but not degenerate.
//  - Repeated Measures: repeated-measures.performance.test.ts generator
//    (5 within-subject levels t1..t5; column "group" is written but only used
//    when the between factor is enabled), n = subjects.
const fs = require("fs");
const path = require("path");

// mulberry32: small deterministic PRNG; Box–Muller for standard normal draws.
function mulberry32(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function multivariateRows(n, seed = 20260922) {
    const rand = mulberry32(seed);
    const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const mu = [10, 14, 18, 11, 9];
    const rows = [];
    for (let i = 0; i < n; i += 1) {
        const a = i % 4, b = Math.floor(i / 4) % 3, c = Math.floor(i / 12) % 2;
        const shared = normal();
        const row = { F1: `A${a + 1}`, F2: `B${b + 1}`, F3: `C${c + 1}` };
        for (let k = 0; k < 5; k += 1) {
            const effect = 0.4 * a * (k % 2 ? 1 : -0.5) + 0.3 * b * (k - 2) + 0.5 * c;
            row[`Y${k + 1}`] = Number((mu[k] + effect + 0.5 * shared + normal()).toFixed(6));
        }
        rows.push(row);
    }
    return { columns: ["Y1", "Y2", "Y3", "Y4", "Y5", "F1", "F2", "F3"], rows };
}

// Column names of the within-subject variables: t1..tL for one measure,
// m1t1..m1tL, m2t1.. for several measures (the order the dialog's slots use).
function repeatedMeasuresColumns(L = 5, M = 1) {
    const cols = [];
    for (let m = 1; m <= M; m += 1) for (let l = 1; l <= L; l += 1) cols.push(M === 1 ? `t${l}` : `m${m}t${l}`);
    return cols;
}

// Defaults (L = 5, M = 1) reproduce the first experiment's data exactly.
function repeatedMeasuresRows(n, L = 5, M = 1) {
    const within = repeatedMeasuresColumns(L, M);
    const rows = [];
    for (let s = 0; s < n; s += 1) {
        const subjectEffect = (s % 50) * 0.1;
        const row = {};
        within.forEach((col, i) => {
            const l = i % L, m = Math.floor(i / L);
            // For M = 1 this is exactly 10 + l·1.5 + subjectEffect + sin(s + l)·0.7.
            row[col] = 10 + l * 1.5 + subjectEffect + Math.sin(s + l + m * 3) * 0.7 + m * 3;
        });
        row.group = s % 2 === 0 ? "G1" : "G2";
        rows.push(row);
    }
    return { columns: [...within, "group"], rows };
}

function toCsv({ columns, rows }) {
    // Full double precision (shortest round-trip form) so the imported values
    // equal the generator's values.
    return [columns.join(","), ...rows.map((r) => columns.map((c) => String(r[c])).join(","))].join("\n") + "\n";
}

// rm = { levels, measures } for Repeated Measures; the default file name is
// unchanged for the first experiment's design (5 levels, 1 measure).
function writeDataset(module, n, dir, rm = { levels: 5, measures: 1 }) {
    const data = module === "multivariate" ? multivariateRows(n) : repeatedMeasuresRows(n, rm.levels, rm.measures);
    const suffix = module === "repeated-measures" && (rm.levels !== 5 || rm.measures !== 1) ? `-L${rm.levels}-M${rm.measures}` : "";
    const file = path.join(dir, `${module}-${n}${suffix}.csv`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, toCsv(data));
    return file;
}

module.exports = { multivariateRows, repeatedMeasuresRows, repeatedMeasuresColumns, toCsv, writeDataset };

if (require.main === module) {
    const dir = process.argv[2] || path.join(__dirname, "data");
    for (const m of ["multivariate", "repeated-measures"]) {
        for (const n of [100, 500, 1000, 2000]) console.log(writeDataset(m, n, dir));
    }
}
