// Statify (rust/pkg) vs the user's SPSS 27 output at full precision.
//  - every value of spss-output/spss-values.json (the slots of the Jest
//    fixture), with the same lookup as the Jest reference test;
//  - a list of the SPSS tables (or parts) Statify does not produce.
// Usage (from testing/glm-rm-reference): node harness/compare-spss.mjs [--out=<file>] [--pkg=<dir>]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadRm, readCsv, buildPayload, run } from "./statify-rm.mjs";
import { DESIGNS, csvPath } from "./designs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SPSS = path.join(here, "../spss-output");
const opts = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
// (e) two within-subjects factors: blocked in Statify, reported separately.
const BLOCKED = ["e"];
const allValues = JSON.parse(fs.readFileSync(path.join(SPSS, "spss-values.json"), "utf8"));
const values = allValues.filter((e) => !BLOCKED.includes(e.dataset));
const tables = JSON.parse(fs.readFileSync(path.join(SPSS, "spss-tables.json"), "utf8"));

// Designs as in spss/*.sps (dataset c: all EM Means targets and /PRINT=RSSCP).
const design = (key) => {
    const d = JSON.parse(JSON.stringify(DESIGNS[key].design));
    d.contrast = d.contrast ?? "Polynomial";
    if (key === "c") {
        d.emmeans = { ...d.emmeans, TargetList: ["(OVERALL)", "metode", "sesi", "metode*sesi"] };
        d.options = { ...d.options, ResSscpMat: true };
    }
    return d;
};
const get = (o, k) => (o ? o[k] : undefined);
const dvName = (d, measure, j) => {
    const m = d.measures.find((x) => x.name === measure);
    return `${m.columns[j - 1]}_(${j},${measure})`;
};

function pick(r, d, e) {
    const factor = d.factors[0].name;
    switch (e.table) {
        case "mauchly": {
            const t = get(get(r.mauchly_test, "tests"), e.measure);
            return { "Mauchly's W": t?.mauchly_w, "Approx. Chi-Square": t?.chi_square, df: t?.df, "Sig.": t?.significance,
                "Greenhouse-Geisser": t?.greenhouse_geisser_epsilon, "Huynh-Feldt": t?.huynh_feldt_epsilon, "Lower-bound": t?.lower_bound_epsilon }[e.field];
        }
        case "within_effects": {
            const sources = get(get(get(r.tests_of_within_subjects_effects, "measures"), e.measure), "sources") ?? [];
            const row = sources.find((s) => s.source === e.source && s.assumption_type === e.correction);
            return { SS: row?.sum_of_squares, df: row?.df, "Mean Square": row?.mean_square, F: row?.f, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power }[e.field];
        }
        case "between_effects": {
            const row = get(get(get(r.tests_of_between_subjects_effects, "effects"), e.measure), e.source);
            return { SS: row?.sum_of_squares, df: row?.df, "Mean Square": row?.mean_square, F: row?.f_value, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power }[e.field];
        }
        case "multivariate": {
            const [effect, test] = e.source.split(" | ");
            const row = get(get(get(r.multivariate_tests, "effects"), effect), test);
            return { Value: row?.value, F: row?.f, "Hypothesis df": row?.hypothesis_df, "Error df": row?.error_df, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power }[e.field];
        }
        case "levene": {
            const [m, j] = e.measure.split("|");
            const row = (get(get(r.homogeneity_tests, "levene"), dvName(d, m, Number(j))) ?? []).find((x) => x.based_on === e.source);
            return { "Levene Statistic": row?.statistic, df1: row?.df1, df2: row?.df2, "Sig.": row?.significance }[e.field];
        }
        case "box_m": {
            const b = get(r.homogeneity_tests, "box_m");
            return { "Box's M": b?.box_m, F: b?.f, df1: b?.df1, df2: b?.df2, "Sig.": b?.significance }[e.field];
        }
        case "emmeans": {
            const [target, level] = e.source.split(" | ");
            const key = target.replace(/ \* /g, "*");
            const lvl = level.replace(/ · /g, ", ");
            const rows = get(r.emmeans, key) ?? get(r.emmeans, target) ?? [];
            const row = rows.find((x) => (x.factor_value === level || x.factor_value === lvl) && x.dependent_variable === e.measure);
            return { Mean: row?.mean, "Std. Error": row?.std_error, "Lower Bound": row?.confidence_interval?.lower_bound, "Upper Bound": row?.confidence_interval?.upper_bound }[e.field];
        }
        case "emmeans_pairwise": {
            const [target, pair] = e.source.split(" | ");
            const [li, lj] = pair.split(" - ");
            const row = (get(r.emmeans_pairwise, target) ?? []).find((x) => x.level_i === li && x.level_j === lj && x.dependent_variable === e.measure);
            return { "Mean Difference": row?.mean_difference, "Std. Error": row?.std_error, "Sig.": row?.significance,
                "Lower Bound": row?.confidence_interval?.lower_bound, "Upper Bound": row?.confidence_interval?.upper_bound }[e.field];
        }
        case "within_contrasts": {
            const [src, contrast] = e.source.split(" | ");
            const sources = get(get(get(r.tests_of_within_subjects_contrasts, "measures"), e.measure), "sources") ?? [];
            const row = sources.find((s) => s.source === src && Object.values(s.factor_values ?? {})[0] === contrast);
            return { SS: row?.sum_of_squares, df: row?.df, "Mean Square": row?.mean_square, F: row?.f, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power }[e.field];
        }
        case "within_multivariate": {
            const [effect, test] = e.source.split(" | ");
            const row = get(get(get(r.within_subjects_multivariate, "effects"), effect), test);
            return { Value: row?.value, F: row?.f, "Hypothesis df": row?.hypothesis_df, "Error df": row?.error_df, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power }[e.field];
        }
        case "bartlett": {
            const b = r.bartlett_test;
            return { "Likelihood Ratio": b?.likelihood_ratio, "Approx. Chi-Square": b?.approx_chi_square, df: b?.df, "Sig.": b?.significance }[e.field];
        }
        case "descriptives": {
            const m = d.measures.find((x) => x.columns.includes(e.measure));
            const groups = get(get(r.descriptive_statistics, dvName(d, m.name, m.columns.indexOf(e.measure) + 1)), "groups") ?? [];
            const g = e.source === "" ? groups[0] : groups.find((x) => x.factor_value === e.source);
            return { Mean: g?.stats?.mean, "Std. Deviation": g?.stats?.std_deviation, N: g?.stats?.n }[e.field];
        }
        case "residual_sscp": {
            const part = { "Sum-of-Squares and Cross-Products": "values", Covariance: "covariance", Correlation: "correlation" }[e.measure];
            const [a, b2] = e.source.split(" | ");
            const m = d.measures.find((x) => x.columns.includes(a));
            const enc = (col) => dvName(d, m.name, m.columns.indexOf(col) + 1);
            return get(get(get(r.residual_matrix, part), enc(a)), enc(b2));
        }
        default:
            return undefined;
    }
}

const rm = await loadRm(opts.pkg);
const outputs = {};
for (const key of Object.keys(tables)) {
    outputs[key] = run(rm, buildPayload({ rows: readCsv(csvPath(key)), design: design(key) }));
}
const blockedLines = BLOCKED.filter((k) => outputs[k]).map((k) =>
    `  ${k}: ${allValues.filter((e) => e.dataset === k).length} nilai SPSS disimpan; Statify: ${String(outputs[k].errors).split(/\r?\n/).filter((l) => /not supported/.test(l)).join(" ").trim()}`);

const rows = [];
const add = (e, statify) => {
    const s = e.value;
    const diff = typeof statify === "number" && typeof s === "number" ? Math.abs(statify - s) : null;
    rows.push({ ...e, statify, diff });
};
for (const e of values) add(e, pick(outputs[e.dataset].results, design(e.dataset), e));

// SPSS tables (or parts) that Statify does not produce.
const missing = [];
for (const [key, x] of Object.entries(tables)) {
    for (const t of x.tables) {
        if (t.section === "emmeans" && (t.title === "Univariate Tests" || t.title === "Multivariate Tests")) {
            missing.push(`${key}: EM Means ${t.target}: ${t.title}`);
        }
    }
}
for (const r of rows) {
    if (r.table === "residual_sscp" && typeof r.statify !== "number") missing.push(`${r.dataset}: Residual SSCP Matrix, bagian ${r.measure}`);
}

// Report.
const tol = 0.001;
const groups = {};
for (const r of rows) {
    const k = `${r.dataset} | ${r.table}`;
    const g = (groups[k] ??= { n: 0, compared: 0, maxDiff: 0, fail: [], noValue: [] });
    g.n += 1;
    if (typeof r.statify !== "number") {
        if (r.table !== "residual_sscp") g.noValue.push(r);
    }
    else if (r.diff !== null) {
        g.compared += 1;
        g.maxDiff = Math.max(g.maxDiff, r.diff);
        if (r.diff > tol + 1e-9) g.fail.push(r);
    }
}
const lines = ["Statify vs SPSS 27 (presisi penuh; toleransi 0,001)", ""];
lines.push("dataset | tabel | nilai | dibandingkan | selisih maks | > 0,001 | Statify tidak ada");
for (const [k, g] of Object.entries(groups)) {
    lines.push(`${k} | ${g.n} | ${g.compared} | ${g.maxDiff.toExponential(2)} | ${g.fail.length} | ${g.noValue.length}`);
}
lines.push("", "Selisih > 0,001:");
for (const g of Object.values(groups)) for (const r of g.fail) {
    lines.push(`  ${r.dataset} ${r.table} ${r.measure} ${r.source} ${r.correction ?? ""} ${r.field}: Statify ${r.statify} vs SPSS ${r.value} (selisih ${r.diff.toExponential(3)})`);
}
lines.push("", "Tidak ada nilai Statify:");
for (const g of Object.values(groups)) for (const r of g.noValue) {
    lines.push(`  ${r.dataset} ${r.table} ${r.measure} ${r.source} ${r.correction ?? ""} ${r.field}: SPSS ${r.value}, Statify ${JSON.stringify(r.statify)}`);
}
lines.push("", "Desain yang diblokir di Statify:", ...blockedLines);
lines.push("", "Tabel (atau bagian tabel) SPSS yang tidak dibuat Statify:");
for (const m of [...new Set(missing)]) lines.push(`  ${m}`);
const text = lines.join("\n") + "\n";
process.stdout.write(text);
if (opts.out) {
    fs.writeFileSync(opts.out, text);
    fs.writeFileSync(opts.out.replace(/\.txt$/, ".json"), JSON.stringify(rows, null, 1) + "\n");
}
