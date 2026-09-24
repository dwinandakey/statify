// Statify (UI run, Web Worker, production build) vs the user's SPSS 27 output.
//
// Statify values come from harness/ui-run.cjs:
//  - raw:     the WASM results the GLM worker returned to the page
//             (statify-output/<cfg>.raw.json), full precision;
//  - ui:      the table the app stored and displays (statify-output/<cfg>.json,
//             4 decimals). Used where the formatter derives the cell itself
//             (Tests of Between-Subjects Effects "Total" row).
// Every SPSS value of spss-output/spss-values.json is looked up; the check is
// |Statify − SPSS| ≤ 0.001. SPSS cells stored as text with a footnote letter
// ("2.436b") only carry the printed decimals (display = true).
//
// Usage (repo root): node testing/glm-mv-reference/harness/compare-spss.mjs [--run=<dir>] [--out=<dir>]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MAP, locate, getPath, formattedCell } from "./mapping.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
// --run: folder of ui-run.cjs output (worker mode); --out: where compare-spss.* go.
const RUN = path.resolve(args.run || path.join(ROOT, "results/spss-validation/statify-output"));
const OUT = path.resolve(args.out || path.join(ROOT, "results/spss-validation"));
const TOL = 0.001;
const spss = JSON.parse(fs.readFileSync(path.join(ROOT, "spss-output/spss-values.json"), "utf8"));

const MV_FIELD = { Value: "value", F: "f", "Hypothesis df": "hypothesis_df", "Error df": "error_df", "Sig.": "significance", "Partial Eta Squared": "partial_eta_squared", "Noncent. Parameter": "noncent_parameter", "Observed Power": "observed_power" };
const BSE_FIELD = { "Type III Sum of Squares": "sum_of_squares", df: "df", "Mean Square": "mean_square", F: "f_value", "Sig.": "significance", "Partial Eta Squared": "partial_eta_squared", "Noncent. Parameter": "noncent_parameter", "Observed Power": "observed_power" };
const LEV_FIELD = { "Levene Statistic": "levene_statistic", df1: "df1", df2: "df2", "Sig.": "significance" };
const BOX_FIELD = { "Box's M": "box_m", F: "f", df1: "df1", df2: "df2", "Sig.": "significance" };
const DESC_FIELD = { Mean: "mean", "Std. Deviation": "std_deviation", N: "n" };
const UI_TITLE = { "Multivariate Tests": /^Multivariate Tests/ };

const load = (cfg) => ({
    raw: JSON.parse(fs.readFileSync(path.join(RUN, `${cfg}.raw.json`), "utf8")).response.results,
    ui: JSON.parse(fs.readFileSync(path.join(RUN, `${cfg}.json`), "utf8")).tables,
});
const CONFIGS = [...new Set(spss.map((e) => e.config))].filter((c) => fs.existsSync(path.join(RUN, `${c}.raw.json`)));
const runs = Object.fromEntries(CONFIGS.map((c) => [c, load(c)]));

// UI table rows with the blank (repeated) label cells filled down.
function uiRows(cfg, title, labelKeys) {
    const re = UI_TITLE[title] || new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
    const t = runs[cfg].ui.find((x) => re.test(x.title));
    if (!t) return [];
    const rows = JSON.parse(t.output_data).tables[0].rows;
    const carry = {};
    return rows.map((r) => {
        const out = { ...r };
        labelKeys.forEach((k, i) => {
            if (r[k] !== "" && r[k] !== undefined) { carry[k] = r[k]; labelKeys.slice(i + 1).forEach((kk) => delete carry[kk]); }
            out[k] = carry[k];
        });
        return out;
    });
}
const num = (s) => (s === "" || s === undefined || s === null ? null : /^<\.001$/.test(String(s)) ? "<.001" : Number(s));
const dvOf = (cfg, label) => MAP[cfg].dv[label] ?? label;
const levelOf = (cfg, label) => MAP[cfg].level[label] ?? label;
// Statify names the paired variables "v1 − v2" in the displayed tables.
const uiDv = (cfg, dv) => dv.replace(/^d_(.+)_minus_(.+)$/, "$1 − $2");
const effectOf = (label) => label.replace(/ \* /g, "*");

/** { raw, ui, note }: raw from mapping.mjs (the cells of the Jest fixture), ui = displayed cell. */
function lookup(e) {
    const loc = locate(e);
    const u = uiLookup(e);
    if (loc.missing) return { note: loc.missing };
    if (loc.formatter) {
        const tables = runs[e.config].ui.map((t) => JSON.parse(t.output_data).tables[0]);
        return { raw: undefined, ui: formattedCell(tables, loc.formatter) ?? u.ui };
    }
    const v = getPath(runs[e.config].raw, loc.path);
    return { raw: typeof v === "number" && loc.scale ? v * loc.scale : v, ui: u.ui };
}

/** Displayed (UI) cell for one SPSS value. */
function uiLookup(e) {
    const { raw } = runs[e.config];
    const L = e.labels;
    switch (e.table) {
        case "Report": { // mv1 MEANS of the original variables
            const g = raw.descriptive_statistics?.[L[0]]?.groups?.find((x) => x.factor_value === "" || x.factor_value === "Total");
            const ui = uiRows(e.config, "Descriptive Statistics", ["dv_name", "group_label"]).find((r) => r.dv_name === L[0]);
            return { raw: g?.stats?.[DESC_FIELD[e.field]], ui: num(ui?.[DESC_FIELD[e.field]]), statifyTable: "Descriptive Statistics" };
        }
        case "Descriptive Statistics": {
            if (e.config === "mv1") return { note: "SPSS: statistik selisih x − μ₀; Statify menampilkan variabel asli (dibandingkan lewat tabel Report)" };
            const dv = dvOf(e.config, L[0]);
            const groups = raw.descriptive_statistics?.[dv]?.groups || [];
            const lv = (label) => (label === "Total" ? "Total" : levelOf(e.config, label));
            let g;
            let ui = null;
            if (L.length === 1) g = groups.find((x) => x.factor_value === "" || x.factor_value === "Total");
            else g = groups.find((x) => x.factor_value === lv(L[1]));
            if (L.length <= 2) {
                const groupLabel = g ? (g.factor_value || "Total") : null;
                ui = g ? uiRows(e.config, e.table, ["dv_name", "group_label"]).find((r) => r.dv_name === uiDv(e.config, dv) && r.group_label === groupLabel) : null;
            } else {
                // Two factors: the second factor's groups nested in the first's.
                const outer = g;
                g = outer?.subgroups?.find((x) => x.factor_value === lv(L[2]));
                ui = g ? uiRows(e.config, e.table, ["dv_name", "group_label", "group_label_2"]).find((r) => r.dv_name === uiDv(e.config, dv) && r.group_label === outer.factor_value && r.group_label_2 === g.factor_value) : null;
            }
            return { raw: g?.stats?.[DESC_FIELD[e.field]], ui: num(ui?.[DESC_FIELD[e.field]]) };
        }
        case "Between-Subjects Factors": {
            const r = raw.between_subjects_factors?.[L[0]]?.value_counts?.[L[1]];
            const ui = uiRows(e.config, e.table, ["factor", "level"]).find((x) => x.factor === L[0] && x.level === L[1]);
            return { raw: r, ui: num(ui?.n) };
        }
        case "Box's Test of Equality of Covariance Matrices": {
            const label = { "Box's M": "Box's M", F: "F", df1: "df1", df2: "df2", "Sig.": "Sig." }[e.field];
            const ui = uiRows(e.config, e.table, ["stat_label"]).find((x) => x.stat_label === label);
            return { raw: raw.box_test?.[BOX_FIELD[e.field]], ui: num(ui?.stat_value) };
        }
        case "Levene's Test of Equality of Error Variances": {
            const dv = dvOf(e.config, L[0]);
            const r = raw.levene_test?.find((x) => x.dependent_variable === dv)?.levene?.find((x) => x.test_basis === L[1]);
            const ui = uiRows(e.config, e.table, ["dv_name", "function"]).find((x) => x.dv_name === dv && x.function === L[1]);
            return { raw: r?.[LEV_FIELD[e.field]], ui: num(ui?.[LEV_FIELD[e.field]]) };
        }
        case "Multivariate Tests": {
            const eff = effectOf(L[0]);
            const r = raw.multivariate_tests?.effects?.[eff]?.[L[1]];
            const rows = uiRows(e.config, e.table, ["effect", "test_name"]);
            // One-sample / paired: Statify labels the intercept row "Hotelling T² …".
            const ui = rows.find((x) => (x.effect === eff || (eff === "Intercept" && /^Hotelling T²/.test(x.effect ?? ""))) && x.test_name === L[1]);
            return { raw: r?.[MV_FIELD[e.field]], ui: num(ui?.[MV_FIELD[e.field]]) };
        }
        case "Tests of Between-Subjects Effects": {
            const src = effectOf(L[0]);
            const dv = dvOf(e.config, L[1]);
            const ui = uiRows(e.config, e.table, ["source", "dependent_variable"]).find((x) => x.source === src && x.dependent_variable === uiDv(e.config, dv));
            const key = BSE_FIELD[e.field];
            if (src === "Total") return { raw: undefined, ui: num(ui?.[key]), formatterOnly: true };
            return { raw: raw.tests_of_between_subjects_effects?.effects?.[dv]?.[src]?.[key], ui: num(ui?.[key]) };
        }
        case "Multiple Comparisons": {
            // Displayed table "Multiple Comparisons — <factor>[ (<method>)]":
            // one row per stored pair (I < J) and method.
            const loc = locate(e);
            if (!loc.path) return {};
            const [, dv, sel] = loc.path;
            const t = runs[e.config].ui.map((x) => JSON.parse(x.output_data).tables[0]).find((x) => /^Multiple Comparisons/.test(x.title ?? ""));
            if (!t) return {};
            let dvCarry = "";
            const row = t.rows.map((r) => ({ ...r, dependent_variable: (dvCarry = r.dependent_variable || dvCarry) })).find((r) =>
                r.dependent_variable === uiDv(e.config, dv) && (r.test_type === undefined ? t.title.endsWith(`(${sel.test_type})`) : r.test_type === sel.test_type) &&
                String(r.i_level) === sel.i_level && String(r.j_level) === sel.j_level);
            if (!row) return {};
            const key = { "Mean Difference (I-J)": "mean_difference", "Std. Error": "std_error", "Sig.": "significance" }[e.field]
                ?? (loc.path.at(-1) === "lower_bound" ? "ci_lower" : "ci_upper");
            const v = num(row[key]);
            return { ui: typeof v === "number" && loc.scale ? v * loc.scale : v };
        }
        default:
            return {};
    }
}

const results = spss.filter((e) => runs[e.config]).map((e) => {
    const s = lookup(e);
    const statify = s.raw !== undefined && s.raw !== null ? s.raw : typeof s.ui === "number" ? s.ui : undefined;
    const from = s.raw !== undefined && s.raw !== null ? "raw" : typeof s.ui === "number" ? "ui" : null;
    const diff = statify === undefined ? null : Math.abs(statify - e.value);
    // Displayed value as a second check (the table the user sees).
    let uiOk = null;
    if (s.ui === "<.001") uiOk = e.value < 0.001;
    else if (typeof s.ui === "number") uiOk = Math.abs(s.ui - e.value) <= TOL;
    return {
        config: e.config, table: e.table, labels: e.labels, field: e.field, spss: e.value, spssDisplay: e.display, source: e.source,
        statify: statify ?? null, from, ui: s.ui ?? null, diff, pass: diff === null ? null : diff <= TOL, uiOk, note: s.note ?? (statify === undefined ? "tidak ada padanan di Statify" : undefined),
    };
});

// Summary per config × table.
const sum = {};
for (const r of results) {
    const k = `${r.config}|${r.table}`;
    sum[k] ??= { config: r.config, table: r.table, n: 0, compared: 0, pass: 0, fail: 0, missing: 0, maxDiff: 0, maxAt: null, uiFail: 0 };
    const s = sum[k];
    s.n += 1;
    if (r.diff === null) { s.missing += 1; continue; }
    s.compared += 1;
    if (r.pass) s.pass += 1; else s.fail += 1;
    if (r.uiOk === false) s.uiFail += 1;
    if (r.diff > s.maxDiff) { s.maxDiff = r.diff; s.maxAt = `${r.labels.join(" / ")} · ${r.field}`; }
}
const lines = [];
lines.push(`Statify (UI, worker) vs SPSS 27 — toleransi ${TOL}`);
lines.push(`${results.length} nilai SPSS; dibandingkan ${results.filter((r) => r.diff !== null).length}; lulus ${results.filter((r) => r.pass).length}; gagal ${results.filter((r) => r.pass === false).length}; tanpa padanan ${results.filter((r) => r.diff === null).length}`);
lines.push("");
lines.push("config | tabel | nilai | dibandingkan | lulus | gagal | tanpa padanan | selisih maks | di | tampilan UI gagal");
for (const s of Object.values(sum)) lines.push([s.config, s.table, s.n, s.compared, s.pass, s.fail, s.missing, s.maxDiff, s.maxAt ?? "", s.uiFail].join(" | "));
lines.push("");
lines.push("GAGAL (|Statify − SPSS| > 0.001):");
for (const r of results.filter((x) => x.pass === false)) lines.push(`  ${r.config} | ${r.table} | ${r.labels.join(" / ")} | ${r.field} | SPSS ${r.spss}${r.spssDisplay ? " (teks)" : ""} | Statify ${r.statify} (${r.from}) | selisih ${r.diff}`);
lines.push("");
lines.push("LULUS pada nilai mentah tetapi tampilan UI tidak (|UI − SPSS| > 0.001 atau \"<.001\" untuk p ≥ .001):");
for (const r of results.filter((x) => x.pass && x.uiOk === false)) lines.push(`  ${r.config} | ${r.table} | ${r.labels.join(" / ")} | ${r.field} | SPSS ${r.spss} | UI ${r.ui}`);
lines.push("");
lines.push("TANPA PADANAN di Statify:");
const miss = {};
for (const r of results.filter((x) => x.diff === null)) {
    const k = `${r.config} | ${r.table} | ${r.labels.join(" / ")}`;
    (miss[k] ??= { fields: [], note: r.note }).fields.push(r.field);
}
for (const [k, v] of Object.entries(miss)) lines.push(`  ${k} :: ${v.fields.join(", ")} — ${v.note}`);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "compare-spss.txt"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "compare-spss.json"), JSON.stringify({ tolerance: TOL, summary: Object.values(sum), results }, null, 1) + "\n");
console.log(lines.join("\n"));
