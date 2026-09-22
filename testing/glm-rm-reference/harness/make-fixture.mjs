// Builds the Jest fixture of reference values for the Repeated Measures
// reference test (repeated-measures/__test__/fixtures/rm-reference-values.json):
//  - "r_car": values printed directly by R car (r-output/car-values.json),
//    each with its R source (interim reference);
//  - "spss": one slot per value SPSS prints for the validated tables, value
//    null and status "menunggu SPSS" until the user's SPSS 27 output is
//    entered (primary reference). Existing SPSS values in the fixture are kept.
// Usage: node make-fixture.mjs --datasets=b,c [--tables=...]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../../..");
const OUT = path.join(REPO, "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/__test__/fixtures/rm-reference-values.json");
const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const datasets = (opts.datasets || "b,c").split(",");
const rTables = (opts["r-tables"] || "within_effects,between_effects,mauchly,multivariate,univariate").split(",");

const car = JSON.parse(fs.readFileSync(path.join(here, "../r-output/car-values.json"), "utf8"));
// EM Means of dataset (c) from afex (r/emmeans-afex.R).
const afexFile = path.join(here, "../r-output/afex-emmeans-c.json");
const afex = fs.existsSync(afexFile) ? JSON.parse(fs.readFileSync(afexFile, "utf8")) : [];
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { spss: [] };
const spssKey = (e) => [e.dataset, e.table, e.measure, e.source, e.correction ?? "", e.field].join("|");
const kept = new Map(previous.spss.filter((e) => e.value !== null).map((e) => [spssKey(e), e]));

// SPSS layout of the validated tables per dataset (measure, within factor, between factor).
const LAYOUT = {
    gambar51: { measures: ["anjing"], factor: "perlakuan", between: null },
    a: { measures: ["cemas", "stres"], factor: "waktu", between: null },
    b: { measures: ["skor"], factor: "waktu", between: "kelompok" },
    c: { measures: ["nilai"], factor: "sesi", between: "metode" },
};
const CORR = ["Sphericity Assumed", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound"];
const TESTS = ["Pillai's Trace", "Wilks' Lambda", "Hotelling's Trace", "Roy's Largest Root"];

const spss = [];
const slot = (e) => spss.push(kept.get(spssKey(e)) ?? { ...e, value: null, status: "menunggu SPSS" });
for (const ds of datasets) {
    const L = LAYOUT[ds];
    const withinSources = [L.factor, ...(L.between ? [`${L.factor} * ${L.between}`] : [])];
    const betweenSources = ["Intercept", ...(L.between ? [L.between] : [])];
    for (const m of L.measures) {
        for (const f of ["Mauchly's W", "Approx. Chi-Square", "df", "Sig.", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound"]) {
            slot({ dataset: ds, table: "mauchly", measure: m, source: L.factor, field: f });
        }
        for (const s of withinSources) for (const c of CORR) {
            for (const f of ["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"]) {
                slot({ dataset: ds, table: "within_effects", measure: m, source: s, correction: c, field: f });
            }
        }
        for (const c of CORR) for (const f of ["SS", "df", "Mean Square"]) {
            slot({ dataset: ds, table: "within_effects", measure: m, source: `Error(${L.factor})`, correction: c, field: f });
        }
        for (const s of [...betweenSources, "Error"]) {
            const fields = s === "Error" ? ["SS", "df", "Mean Square"] : ["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"];
            for (const f of fields) slot({ dataset: ds, table: "between_effects", measure: m, source: s, field: f });
        }
    }
    if (ds === "c") {
        // EM Means slots as requested in spss/rm_c.sps (Estimates + Pairwise Comparisons).
        const targets = { "(OVERALL)": ["(OVERALL)"], metode: ["1", "2"], sesi: ["1", "2", "3"], "metode * sesi": ["1 · 1", "1 · 2", "1 · 3", "2 · 1", "2 · 2", "2 · 3"] };
        for (const [t, levels] of Object.entries(targets)) for (const l of levels) {
            for (const f of ["Mean", "Std. Error", "Lower Bound", "Upper Bound"]) slot({ dataset: ds, table: "emmeans", measure: "nilai", source: `${t} | ${l}`, field: f });
        }
        for (const [t, levels] of [["metode", ["1", "2"]], ["sesi", ["1", "2", "3"]]]) for (const i of levels) for (const j of levels) if (i !== j) {
            for (const f of ["Mean Difference", "Std. Error", "Sig.", "Lower Bound", "Upper Bound"]) slot({ dataset: ds, table: "emmeans_pairwise", measure: "nilai", source: `${t} | ${i} - ${j}`, field: f });
        }
    }
    const mvEffects = [...(L.measures.length > 1 ? betweenSources : []), ...withinSources];
    for (const eff of mvEffects) for (const t of TESTS) {
        for (const f of ["Value", "F", "Hypothesis df", "Error df", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"]) {
            slot({ dataset: ds, table: "multivariate", measure: "", source: `${eff} | ${t}`, field: f });
        }
    }
}

const fixture = {
    _note: [
        "Nilai acuan test Repeated Measures (dibuat oleh testing/glm-rm-reference/harness/make-fixture.mjs).",
        "spss: acuan UTAMA, keluaran SPSS 27 yang dijalankan pengguna (testing/glm-rm-reference/spss/*.sps). value null = menunggu SPSS.",
        "  Isi value dengan angka seperti yang ditampilkan SPSS (3 desimal); untuk Sig. '<.001' tulis \"<.001\". Toleransi |Statify - SPSS| <= 0.001.",
        "r_car: pembanding SEMENTARA, nilai langsung dari R car / afex (sumber di r_source). Toleransi 1e-6.",
    ],
    datasets,
    config_template: JSON.parse(fs.readFileSync(path.join(here, "config-template.json"), "utf8")),
    // "Univariate Tests" are produced only for designs with between-subjects
    // factors or covariates (as before), so within-only datasets skip them.
    r_car: car.filter((e) => datasets.includes(e.dataset) && rTables.includes(e.table)
        && !(e.table === "univariate" && !LAYOUT[e.dataset].between))
        .concat(afex.filter((e) => datasets.includes(e.dataset))),
    spss,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(fixture, null, 2) + "\n");
console.log(`fixture: ${fixture.r_car.length} nilai R (car), ${spss.length} slot SPSS (${spss.filter((e) => e.value !== null).length} terisi) → ${path.relative(REPO, OUT)}`);
