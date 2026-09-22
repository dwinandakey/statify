// Builds the Jest fixture of reference values for the Repeated Measures
// reference test (repeated-measures/__test__/fixtures/rm-reference-values.json):
//  - "r_car": values printed directly by R car (r-output/car-values.json),
//    each with its R source (interim reference);
//  - "spss": one slot per value SPSS prints for the validated tables
//    (primary reference). Values come from spss-output/spss-values.json
//    (harness/spss_extract.py, read from the user's SPSS 27 export), with the
//    file and table in "spss_source"; values already entered in the fixture
//    by hand are kept; other slots stay null with status "menunggu SPSS".
// Usage: node make-fixture.mjs --datasets=b,c [--tables=...]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../../..");
const OUT = path.join(REPO, "frontend/components/Modals/Analyze/general-linear-model/repeated-measures/__test__/fixtures/rm-reference-values.json");
const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const datasets = (opts.datasets || "b,c").split(",");
const rTables = (opts["r-tables"] || "within_effects,between_effects,mauchly,multivariate,univariate,levene").split(",");

const car = JSON.parse(fs.readFileSync(path.join(here, "../r-output/car-values.json"), "utf8"));
// EM Means of dataset (c) from afex (r/emmeans-afex.R).
const afexFile = path.join(here, "../r-output/afex-emmeans-c.json");
const afex = fs.existsSync(afexFile) ? JSON.parse(fs.readFileSync(afexFile, "utf8")) : [];
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { spss: [] };
const spssKey = (e) => [e.dataset, e.table, e.measure, e.source, e.correction ?? "", e.field].join("|");
const kept = new Map(previous.spss.filter((e) => e.value !== null).map((e) => [spssKey(e), e]));
const spssFile = path.join(here, "../spss-output/spss-values.json");
const fromSpss = new Map((fs.existsSync(spssFile) ? JSON.parse(fs.readFileSync(spssFile, "utf8")) : [])
    .filter((e) => e.value !== null).map((e) => [spssKey(e), e]));

// SPSS layout of the validated tables per dataset (measure, within factor, between factor).
const LAYOUT = {
    // Gambar 51 as in the original figure: no /PRINT=ETASQ OPOWER.
    gambar51: { measures: ["anjing"], factor: "perlakuan", between: null, effectSize: false },
    a: { measures: ["cemas", "stres"], factor: "waktu", between: null },
    b: { measures: ["skor"], factor: "waktu", between: "kelompok" },
    c: { measures: ["nilai"], factor: "sesi", between: "metode" },
    // (d): the data of (b) with Repeated contrasts (spss/rm_d.sps).
    d: { measures: ["skor"], factor: "waktu", between: "kelompok" },
};
// (e): two within-subjects factors; blocked in Statify (does not match SPSS),
// its SPSS values are kept as reference in "spss_blocked".
const BLOCKED = { e: "Designs with more than one within-subjects factor are not supported in this version" };
const CORR = ["Sphericity Assumed", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound"];
const TESTS = ["Pillai's Trace", "Wilks' Lambda", "Hotelling's Trace", "Roy's Largest Root"];

const spss = [];
const slot = (e) => {
    const s = fromSpss.get(spssKey(e));
    spss.push(s ? { ...e, value: s.value, status: "SPSS 27", spss_source: s.spss_source }
        : kept.get(spssKey(e)) ?? { ...e, value: null, status: "menunggu SPSS" });
};
const EFFECT_SIZE = ["Partial Eta Squared", "Noncent. Parameter", "Observed Power"];
for (const ds of datasets) {
    const L = LAYOUT[ds];
    const fields = (list) => (L.effectSize === false ? list.filter((f) => !EFFECT_SIZE.includes(f)) : list);
    const withinSources = [L.factor, ...(L.between ? [`${L.factor} * ${L.between}`] : [])];
    const betweenSources = ["Intercept", ...(L.between ? [L.between] : [])];
    for (const m of L.measures) {
        for (const f of ["Mauchly's W", "Approx. Chi-Square", "df", "Sig.", "Greenhouse-Geisser", "Huynh-Feldt", "Lower-bound"]) {
            slot({ dataset: ds, table: "mauchly", measure: m, source: L.factor, field: f });
        }
        for (const s of withinSources) for (const c of CORR) {
            for (const f of fields(["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"])) {
                slot({ dataset: ds, table: "within_effects", measure: m, source: s, correction: c, field: f });
            }
        }
        for (const c of CORR) for (const f of ["SS", "df", "Mean Square"]) {
            slot({ dataset: ds, table: "within_effects", measure: m, source: `Error(${L.factor})`, correction: c, field: f });
        }
        for (const s of [...betweenSources, "Error"]) {
            const list = s === "Error" ? ["SS", "df", "Mean Square"] : fields(["SS", "df", "Mean Square", "F", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"]);
            for (const f of list) slot({ dataset: ds, table: "between_effects", measure: m, source: s, field: f });
        }
    }
    if (ds === "c") {
        // Homogeneity tests (spss/rm_c.sps: /PRINT=HOMOGENEITY).
        for (const f of ["Box's M", "F", "df1", "df2", "Sig."]) slot({ dataset: ds, table: "box_m", measure: "", source: "Box's M", field: f });
        for (const j of [1, 2, 3]) for (const b of ["Based on Mean", "Based on Median", "Based on Median and with adjusted df", "Based on trimmed mean"]) {
            for (const f of ["Levene Statistic", "df1", "df2", "Sig."]) slot({ dataset: ds, table: "levene", measure: `nilai|${j}`, source: b, field: f });
        }
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
        for (const f of fields(["Value", "F", "Hypothesis df", "Error df", "Sig.", "Partial Eta Squared", "Noncent. Parameter", "Observed Power"])) {
            slot({ dataset: ds, table: "multivariate", measure: "", source: `${eff} | ${t}`, field: f });
        }
    }
}

// Further SPSS tables checked at full precision: one slot per value SPSS printed.
const EXTRA = ["within_contrasts", "within_multivariate", "bartlett", "descriptives", "residual_sscp"];
for (const e of fromSpss.values()) {
    if (!EXTRA.includes(e.table) || !datasets.includes(e.dataset)) continue;
    const { dataset, table, measure, source, correction, field } = e;
    slot({ dataset, table, measure, source, ...(correction !== undefined ? { correction } : {}), field });
}

const fixture = {
    _note: [
        "Nilai acuan test Repeated Measures (dibuat oleh testing/glm-rm-reference/harness/make-fixture.mjs).",
        "spss: acuan UTAMA, keluaran SPSS 27 yang dijalankan pengguna (testing/glm-rm-reference/spss/*.sps, diekspor ke spss-output/*.xlsx",
        "  lalu dibaca harness/spss_extract.py; sumber tiap nilai di spss_source). value null = menunggu SPSS. Toleransi |Statify - SPSS| <= 0.001.",
        "  Nilai yang diisi manual: angka seperti yang ditampilkan SPSS (3 desimal); untuk Sig. '<.001' tulis \"<.001\".",
        "r_car: pembanding SEMENTARA, nilai langsung dari R car / afex (sumber di r_source). Toleransi 1e-6.",
    ],
    datasets,
    config_template: JSON.parse(fs.readFileSync(path.join(here, "config-template.json"), "utf8")),
    // "Univariate Tests" are produced only for designs with between-subjects
    // factors or covariates (as before), so within-only datasets skip them.
    r_car: car.filter((e) => datasets.includes(e.dataset) && rTables.includes(e.table)
        && !(e.table === "univariate" && !LAYOUT[e.dataset].between)
        // Levene: only for (c), the dataset the test runs with homogeneity tests.
        && !(e.table === "levene" && e.dataset !== "c"))
        .concat(afex.filter((e) => datasets.includes(e.dataset))),
    spss,
    spss_blocked: Object.fromEntries(Object.entries(BLOCKED).map(([ds, reason]) => [ds, {
        reason,
        values: [...fromSpss.values()].filter((e) => e.dataset === ds),
    }])),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(fixture, null, 2) + "\n");
console.log(`fixture: ${fixture.r_car.length} nilai R (car), ${spss.length} slot SPSS (${spss.filter((e) => e.value !== null).length} terisi) → ${path.relative(REPO, OUT)}`);
