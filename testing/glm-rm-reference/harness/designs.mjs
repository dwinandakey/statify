// Designs of the reference datasets as the Statify dialog would configure them.
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA = path.resolve(here, "../data");
const OPT = { DescStats: true, EstEffectSize: true, ObsPower: true };

export const DESIGNS = {
    // Gambar 51 (validation dataset of the thesis): perlakuan 4 levels, 15 subjects.
    gambar51: {
        csv: "gambar51.csv",
        design: {
            factors: [{ name: "perlakuan", levels: 4 }],
            measures: [{ name: "anjing", columns: ["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"] }],
            options: {},
        },
    },
    // (a) within-only, two measures × waktu (3).
    a: {
        csv: "rm_a.csv",
        design: {
            factors: [{ name: "waktu", levels: 3 }],
            measures: [
                { name: "cemas", columns: ["cemas1", "cemas2", "cemas3"] },
                { name: "stres", columns: ["stres1", "stres2", "stres3"] },
            ],
            options: OPT,
        },
    },
    // (b) mixed: waktu (4) × kelompok (3).
    b: {
        csv: "rm_b.csv",
        design: {
            factors: [{ name: "waktu", levels: 4 }],
            measures: [{ name: "skor", columns: ["w1", "w2", "w3", "w4"] }],
            between: ["kelompok"],
            options: OPT,
        },
    },
    // (c) mixed with EMMeans and homogeneity tests: sesi (3) × metode (2).
    c: {
        csv: "rm_c.csv",
        design: {
            factors: [{ name: "sesi", levels: 3 }],
            measures: [{ name: "nilai", columns: ["p1", "p2", "p3"] }],
            between: ["metode"],
            options: { ...OPT, HomogenTest: true },
            emmeans: { TargetList: ["(OVERALL)", "metode"], CompMainEffect: true, ConfiIntervalMethod: "bonferroni" },
        },
    },
};

export const csvPath = (key) => path.join(DATA, DESIGNS[key].csv);
