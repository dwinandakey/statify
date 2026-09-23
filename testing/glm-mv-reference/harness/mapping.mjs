// Where each SPSS value lives in Statify's output (shared by compare-spss.mjs
// and make-fixture.mjs, so the Jest reference test reads the same cells).
//
// locate(entry) returns one of
//   { path: [...] }                 a path into the raw WASM results
//                                   (get_formatted_results()); an object step
//                                   such as { test_basis: "Based on Mean" }
//                                   selects the array element with that field
//   { formatter: { title, match, key } }
//                                   a cell the formatter derives itself
//                                   (transformMultivariateResult), read from
//                                   the formatted table (4 decimals); none
//                                   since step 4 (Total comes from Rust)
//   { missing: "<reason>" }         no Statify counterpart
export const MAP = {
    mv1: { dv: { "mpg - 20": "mpg", "disp - 200": "disp", "hp - 150": "hp", "wt - 3": "wt" }, level: {} },
    mv2: { dv: {}, level: { "laki-laki": "1", perempuan: "2" } },
    mv3: { dv: { "kedalaman1 - kedalaman2": "d_kedalaman1_minus_kedalaman2", "ukuran1 - ukuran2": "d_ukuran1_minus_ukuran2" }, level: {} },
    mv4: { dv: {}, level: { "treatment 1": "1", "treatment 2": "2", "treatment 3": "3" } },
    mv5: { dv: { "ultimate torque": "Y1A1", "ultimate strain": "Y2A1" }, level: { A1: "1", A2: "2", B1: "1", B2: "2", B3: "3", B4: "4" } },
    mv6: { dv: { "ultimate torque": "Y1A1", "ultimate strain": "Y2A1" }, level: { A1: "1", A2: "2", B1: "1", B2: "2", B3: "3", B4: "4" } },
    mv7: { dv: {}, level: { "laki-laki": "1", perempuan: "2" } },
};
const MV_FIELD = { Value: "value", F: "f", "Hypothesis df": "hypothesis_df", "Error df": "error_df", "Sig.": "significance", "Partial Eta Squared": "partial_eta_squared", "Noncent. Parameter": "noncent_parameter", "Observed Power": "observed_power" };
const BSE_FIELD = { "Type III Sum of Squares": "sum_of_squares", df: "df", "Mean Square": "mean_square", F: "f_value", "Sig.": "significance", "Partial Eta Squared": "partial_eta_squared", "Noncent. Parameter": "noncent_parameter", "Observed Power": "observed_power" };
const LEV_FIELD = { "Levene Statistic": "levene_statistic", df1: "df1", df2: "df2", "Sig.": "significance" };
const BOX_FIELD = { "Box's M": "box_m", F: "f", df1: "df1", df2: "df2", "Sig.": "significance" };
const DESC_FIELD = { Mean: "mean", "Std. Deviation": "std_deviation", N: "n" };

const dvOf = (cfg, label) => MAP[cfg].dv[label] ?? label;
const levelOf = (cfg, label) => MAP[cfg].level[label] ?? label;
/** Statify shows the paired variables as "v1 − v2" in the formatted tables. */
export const uiDv = (dv) => dv.replace(/^d_(.+)_minus_(.+)$/, "$1 − $2");
const effectOf = (label) => label.replace(/ \* /g, "*");

export function locate(e) {
    const L = e.labels;
    switch (e.table) {
        case "Report": // mv1: MEANS of the original variables ↔ Statify Descriptive Statistics
            return { path: ["descriptive_statistics", L[0], "groups", { factor_value: "" }, "stats", DESC_FIELD[e.field]] };
        case "Descriptive Statistics": {
            if (e.config === "mv1") return { missing: "SPSS GLM: statistik selisih x − μ₀; Statify menampilkan variabel asli (dibandingkan lewat tabel Report)" };
            const dv = dvOf(e.config, L[0]);
            if (L.length === 1) return { path: ["descriptive_statistics", dv, "groups", { factor_value: "" }, "stats", DESC_FIELD[e.field]] };
            if (L.length === 2) {
                const lv = L[1] === "Total" ? "Total" : levelOf(e.config, L[1]);
                return { path: ["descriptive_statistics", dv, "groups", { factor_value: lv }, "stats", DESC_FIELD[e.field]] };
            }
            // Two factors: groups of the first factor, each with the groups of
            // the second factor (and Total) as subgroups, as SPSS nests them.
            const lvA = L[1] === "Total" ? "Total" : levelOf(e.config, L[1]);
            const lvB = L[2] === "Total" ? "Total" : levelOf(e.config, L[2]);
            return { path: ["descriptive_statistics", dv, "groups", { factor_value: lvA }, "subgroups", { factor_value: lvB }, "stats", DESC_FIELD[e.field]] };
        }
        case "Between-Subjects Factors":
            return { path: ["between_subjects_factors", L[0], "value_counts", L[1]] };
        case "Box's Test of Equality of Covariance Matrices":
            return { path: ["box_test", BOX_FIELD[e.field]] };
        case "Levene's Test of Equality of Error Variances":
            return { path: ["levene_test", { dependent_variable: dvOf(e.config, L[0]) }, "levene", { test_basis: L[1] }, LEV_FIELD[e.field]] };
        case "Multivariate Tests":
            return { path: ["multivariate_tests", "effects", effectOf(L[0]), L[1], MV_FIELD[e.field]] };
        case "Tests of Between-Subjects Effects": {
            const src = effectOf(L[0]);
            const dv = dvOf(e.config, L[1]);
            return { path: ["tests_of_between_subjects_effects", "effects", dv, src, BSE_FIELD[e.field]] };
        }
        default:
            return { missing: "tabel tidak dipetakan" };
    }
}

export function getPath(obj, path) {
    let cur = obj;
    for (const step of path) {
        if (cur === undefined || cur === null) return undefined;
        if (typeof step === "object") {
            if (!Array.isArray(cur)) return undefined;
            const [k, v] = Object.entries(step)[0];
            // factor_value "" also matches the no-factor "Overall" group.
            cur = cur.find((x) => x[k] === v || (k === "factor_value" && v === "" && x.factor_name === "Overall"));
        } else {
            cur = cur[step];
        }
    }
    return cur;
}

/** Rows of a formatted table with the blank (merged) label cells filled down. */
export function formattedCell(tables, spec) {
    const t = tables.find((x) => x.title === spec.title);
    if (!t) return undefined;
    const labelKeys = Object.keys(spec.match);
    const carry = {};
    for (const r of t.rows) {
        const row = { ...r };
        labelKeys.forEach((k, i) => {
            if (r[k] !== "" && r[k] !== undefined) { carry[k] = r[k]; labelKeys.slice(i + 1).forEach((kk) => delete carry[kk]); }
            row[k] = carry[k];
        });
        if (labelKeys.every((k) => row[k] === spec.match[k])) {
            const v = row[spec.key];
            return v === "" || v === undefined ? undefined : Number(v);
        }
    }
    return undefined;
}
