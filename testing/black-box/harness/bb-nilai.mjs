// Mencocokkan nilai yang TAMPIL di halaman Result (tabel yang disimpan aplikasi,
// dibaca oleh bb-run.cjs ke hasil-eksekusi/<ID>.json) dengan keluaran SPSS 27
// (spss-output/spss-values.json di glm-mv-reference dan glm-rm-reference).
// Toleransi |Statify − SPSS| ≤ 0,001; nilai Sig. "<.001" cocok bila SPSS < 0,001.
//
// Pemakaian (root repo): node testing/black-box/harness/bb-nilai.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, "../../..");
const OBS = path.resolve(here, "../hasil-eksekusi");
const TOL = 0.001;
const mvSpss = JSON.parse(fs.readFileSync(path.join(REPO, "testing/glm-mv-reference/spss-output/spss-values.json"), "utf8"));
const rmSpss = JSON.parse(fs.readFileSync(path.join(REPO, "testing/glm-rm-reference/spss-output/spss-values.json"), "utf8"));

const num = (s) => {
    if (s === null || s === undefined) return null;
    const t = String(s).trim();
    if (t === "" || t === ".") return null;
    if (/^<\s*\.?0*\.?001$/.test(t) || t === "<.001") return "<.001";
    const v = Number(t.replace(/[a-z*]+$/i, ""));
    return Number.isFinite(v) ? v : null;
};
const close = (ui, spss) => {
    const u = num(ui);
    if (u === "<.001") return spss < 0.001;
    return u !== null && Math.abs(u - spss) <= TOL;
};
const tablesOf = (run) => (run?.output || []).flatMap((s) => s.tables || []);
const findTable = (run, re) => tablesOf(run).find((t) => re.test(t.title));
// Baris dengan sel kosong mewarisi label baris sebelumnya (tampilan SPSS).
const carry = (rows, keys) => {
    const last = {};
    return rows.map((r) => {
        const o = { ...r };
        for (const k of keys) { if (o[k] !== undefined && o[k] !== "") last[k] = o[k]; else o[k] = last[k]; }
        return o;
    });
};
const uniq = (a) => [...new Set(a)];

// ── MV ──────────────────────────────────────────────────────────────────────
const MV_FIELD = { Value: "value", F: "f", "Hypothesis df": "hypothesis_df", "Error df": "error_df", "Sig.": "significance" };
const LEV_FIELD = { "Levene Statistic": "levene_statistic", F: "levene_statistic", df1: "df1", df2: "df2", "Sig.": "significance" };
const MC_FIELD = { "Mean Difference (I-J)": "mean_difference", "Std. Error": "std_error", "Sig.": "significance", "Lower Bound": "ci_lower", "Upper Bound": "ci_upper" };

function mvCompare(run, cfg, parts) {
    const res = { config: cfg, checked: 0, passed: 0, failures: [] };
    const spss = mvSpss.filter((e) => e.config === cfg);
    const add = (ok, what) => { res.checked += 1; if (ok) res.passed += 1; else res.failures.push(what); };
    if (parts.includes("mt")) {
        const t = findTable(run, /^Multivariate Tests/);
        const rows = t ? carry(t.rows, ["effect"]) : [];
        const effects = uniq(rows.map((r) => r.effect));
        for (const e of spss.filter((x) => x.table === "Multivariate Tests" && MV_FIELD[x.field])) {
            let eff = e.labels[0].replace(/ \* /g, "*");
            if (eff === "Intercept" && !effects.includes("Intercept")) eff = effects[0];
            const row = rows.find((r) => r.effect === eff && r.test_name === e.labels[1]);
            add(row && close(row[MV_FIELD[e.field]], e.value), `MT ${e.labels.join("/")} ${e.field}: SPSS ${e.value}, UI ${row ? row[MV_FIELD[e.field]] : "(tidak ada)"}`);
        }
    }
    const dvMap = (labels, uiDvs) => { const m = {}; uniq(labels).forEach((l, i) => { m[l] = uiDvs.includes(l) ? l : uiDvs[i]; }); return m; };
    if (parts.includes("lev")) {
        const t = findTable(run, /^Levene/);
        const rows = t ? carry(t.rows, ["dv_name"]) : [];
        const entries = spss.filter((x) => x.table.startsWith("Levene") && LEV_FIELD[x.field]);
        const map = dvMap(entries.map((e) => e.labels[0]), uniq(rows.map((r) => r.dv_name)));
        for (const e of entries) {
            const basis = e.labels[1] || "Based on Model Residuals";
            const row = rows.find((r) => r.dv_name === map[e.labels[0]] && r.function === basis);
            add(row && close(row[LEV_FIELD[e.field]], e.value), `Levene ${e.labels.join("/")} ${e.field}: SPSS ${e.value}, UI ${row ? row[LEV_FIELD[e.field]] : "(tidak ada)"}`);
        }
    }
    if (parts.includes("box")) {
        const t = findTable(run, /^Box's Test/);
        for (const e of spss.filter((x) => x.table.startsWith("Box's Test"))) {
            const row = t?.rows.find((r) => r.stat_label === e.field);
            add(row && close(row.stat_value, e.value), `Box ${e.field}: SPSS ${e.value}, UI ${row ? row.stat_value : "(tidak ada)"}`);
        }
    }
    if (parts.includes("mc")) {
        const t = findTable(run, /^Multiple Comparisons/);
        const rows = t ? carry(t.rows, ["dependent_variable"]) : [];
        const methods = uniq(rows.map((r) => r.test_type || null));
        const single = t && methods.length === 1 && !methods[0] ? (t.title.match(/\((LSD|Bonferroni|Sidak)\)/) || [])[1] : null;
        for (const e of spss.filter((x) => x.table === "Multiple Comparisons" && MC_FIELD[x.field])) {
            const [dv, method, iLab, jLab] = e.labels;
            if (single && method !== single) continue;
            if (!single && !methods.includes(method)) continue;
            const i = iLab.split(" ").pop(), j = jLab.split(" ").pop();
            const pick = (a, b) => rows.find((r) => r.dependent_variable === dv && (single || r.test_type === method) && r.i_level === a && r.j_level === b);
            let row = pick(i, j), sign = 1;
            if (!row) { row = pick(j, i); sign = -1; } // Statify menyimpan pasangan I < J
            let ui = row ? row[MC_FIELD[e.field]] : undefined;
            let spssV = e.value;
            if (row && sign === -1) {
                if (e.field === "Mean Difference (I-J)") spssV = -spssV;
                if (e.field === "Lower Bound") { spssV = -e.value; ui = row.ci_upper; }
                if (e.field === "Upper Bound") { spssV = -e.value; ui = row.ci_lower; }
            }
            add(row && close(ui, spssV), `MC ${e.labels.join("/")} ${e.field}: SPSS ${e.value}, UI ${ui ?? "(tidak ada)"}`);
        }
    }
    return res;
}

// ── RM ──────────────────────────────────────────────────────────────────────
// Nilai utama per tabel (field SPSS → kunci kolom tabel yang disimpan).
const RM_FIELD = {
    Value: "value", F: "f", "Hypothesis df": "hyp_df", "Error df": "err_df", "Sig.": "sig",
    SS: "ss", df: "df", "Mean Square": "ms",
    "Mauchly's W": "w", "Approx. Chi-Square": "chi_sq", "Greenhouse-Geisser": "gg", "Huynh-Feldt": "hf", "Lower-bound": "lb",
    "Mean Difference": "diff", "Std. Error": "se", "Lower Bound": "ci_lower", "Upper Bound": "ci_upper",
    "Box's M": "box_m", "Levene Statistic": "levene_statistic", df1: "df1", df2: "df2",
};
const RM_TITLE = {
    multivariate: /^Multivariate Tests$/, mauchly: /^Mauchly/, within_effects: /^Tests of Within-Subjects Effects$/,
    within_contrasts: /^Tests of Within-Subjects Contrasts/, between_effects: /^Tests of Between-Subjects Effects/,
    emmeans_pairwise: /^Pairwise Comparisons/, within_multivariate: /^Tests of Within-Subjects Effects \(Multivariate\)/,
    box_m: /^Box's Test/, levene: /^Levene/,
};
const isLabel = (v) => typeof v === "string" && v !== "" && !/^-?[\d.]+$/.test(v) && !/^<\.?0*1$|^<\.001$/.test(v);
const norm = (s) => String(s ?? "").replace(/\s*\*\s*/g, " * ").replace(/\s+/g, " ").trim();

// Semua baris tabel (label kosong diwarisi dari baris sebelumnya) beserta
// measure dari catatan tabel "Measure: x" bila tabel dipisah per measure.
function rmRows(run, re) {
    const out = [];
    for (const t of tablesOf(run).filter((x) => re.test(x.title))) {
        const rows = t.rows || [];
        const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== "rowHeader");
        // level_i (Pairwise Comparisons) berisi angka level, tetapi tetap label baris.
        const labelKeys = keys.filter((k) => k === "level_i" || rows.some((r) => isLabel(r[k])));
        const measure = (String(t.footnote ?? "").match(/Measure:\s*([^;\s]+)/) || [])[1] || null;
        for (const r of carry(rows, labelKeys)) out.push({ row: r, labelKeys, measure, title: t.title, factorI: (String((t.columns || [])[0] || "").match(/^\(I\)\s*(.+)$/) || [])[1] || null });
    }
    return out;
}
function rmCompare(run, dataset, parts) {
    const res = { config: `rm_${dataset}`, checked: 0, passed: 0, failures: [] };
    const add = (ok, what) => { res.checked += 1; if (ok) res.passed += 1; else res.failures.push(what); };
    for (const e of rmSpss.filter((x) => x.dataset === dataset && parts.includes(x.table) && RM_FIELD[x.field])) {
        const rows = rmRows(run, RM_TITLE[e.table]);
        // Box's M RM: satu baris per statistik (label | value).
        if (e.table === "box_m") {
            const hit = rows.find(({ row }) => row.label === e.field);
            add(hit && close(hit.row.value, e.value), `box_m ${e.field}: SPSS ${e.value}, UI ${hit ? hit.row.value : "(tidak ada)"}`);
            continue;
        }
        // Levene RM: baris per variabel slot "<var>_(<level>,<measure>)" dan dasar uji.
        if (e.table === "levene") {
            const [m, lvl] = String(e.measure).split("|");
            const key = { "Levene Statistic": "statistic", df1: "df1", df2: "df2", "Sig.": "sig" }[e.field];
            const hit = rows.find(({ row }) => String(row.dv).endsWith(`_(${lvl},${m})`) && row.based_on === e.source);
            add(hit && close(hit.row[key], e.value), `levene ${e.measure}|${e.source} ${e.field}: SPSS ${e.value}, UI ${hit ? hit.row[key] : "(tidak ada)"}`);
            continue;
        }
        const labels = [...e.source.split(" | "), ...(e.correction ? [e.correction] : [])].map(norm);
        // Pairwise SPSS "1 - 2" → kolom (I)/(J) Statify.
        const want = e.table === "emmeans_pairwise" ? [labels[0], ...labels[1].split(" - ")] : labels;
        const measureParts = String(e.measure || "").split("|").filter(Boolean);
        const cand = rows.filter(({ row, labelKeys, measure, factorI }) => {
            const vals = labelKeys.map((k) => norm(row[k]));
            const allVals = Object.values(row).map(norm);
            if (e.table === "emmeans_pairwise") {
                if (measure && measureParts[0] && measure !== measureParts[0]) return false;
                return norm(factorI) === want[0] && norm(row.level_i) === want[1] && norm(row.level_j) === want[2];
            }
            if (measureParts[0] && (row.measure !== undefined || measure)) {
                const m = row.measure !== undefined ? norm(row.measure) : measure;
                if (m && m !== measureParts[0]) return false;
            }
            if (measureParts[1] && !allVals.includes(measureParts[1])) return false;
            return want.every((w) => vals.includes(w));
        });
        const key = RM_FIELD[e.field];
        const hit = cand.find(({ row }) => row[key] !== undefined && row[key] !== null);
        const ui = hit ? hit.row[key] : undefined;
        add(hit && close(ui, e.value), `${e.table} ${e.measure}|${e.source}|${e.correction ?? ""} ${e.field}: SPSS ${e.value}, UI ${ui ?? "(tidak ada)"}`);
    }
    return res;
}

// ── Pemetaan skenario → konfigurasi validasi ────────────────────────────────
const PLAN = [
    ["BB-KF02-01", 0, "mv", "mv1", ["mt"]],
    ["BB-KF03-01", 0, "mv", "mv2", ["mt", "lev", "box"]],
    ["BB-KF04-01", 0, "mv", "mv3", ["mt"]],
    ["BB-KF05-01", 0, "mv", "mv4", ["mt"]],
    ["BB-KF06-01", 0, "mv", "mv5", ["mt", "lev"]],
    ["BB-KF06-02", 0, "mv", "mv8", ["mt", "lev"]],
    ["BB-KF06-03", 0, "mv", "mv8", ["mt"]],
    ["BB-KF06-03", 1, "mv", "mv5", ["mt"]],
    ["BB-KF10-01", 1, "mv", "mv4", ["mt", "lev", "box"]],
    ["BB-KF10-02", 0, "mv", "mv8", ["lev"]],
    ["BB-KF11-02", 0, "mv", "mv4ph", ["mc"]],
    ["BB-KF11-02", 1, "mv", "mv4ph", ["mc"]],
    ["BB-KF11-02", 2, "mv", "mv4ph", ["mc"]],
    ["BB-KF11-03", 0, "mv", "mv4ph", ["mc"]],
    ["BB-KF13-01", 0, "mv", "mv7", ["mt", "lev", "box"]],
    ["BB-KF09-01", 0, "rm", "gambar51", ["multivariate", "mauchly", "within_effects", "within_contrasts", "between_effects"]],
    ["BB-KF09-02", 0, "rm", "a", ["multivariate", "mauchly", "within_effects", "within_multivariate"]],
    ["BB-KF09-03", 0, "rm", "d", ["within_contrasts"]],
    ["BB-KF10-03", 1, "rm", "c", ["box_m", "levene", "mauchly"]],
    ["BB-KF11-05", 0, "rm", "c", ["emmeans_pairwise"]],
    ["BB-KF12-01", 0, "rm", "b", ["multivariate", "within_effects", "between_effects"]],
];

const out = {};
for (const [id, runIdx, kind, cfg, parts] of PLAN) {
    const f = path.join(OBS, `${id}.json`);
    if (!fs.existsSync(f)) continue;
    const obs = JSON.parse(fs.readFileSync(f, "utf8"));
    const run = obs.runs[runIdx];
    const r = kind === "mv" ? mvCompare(run, cfg, parts) : rmCompare(run, cfg, parts);
    (out[id] ||= []).push({ run: runIdx, ...r });
    console.log(`${id} run${runIdx} ${r.config} [${parts.join(",")}]: ${r.passed}/${r.checked} cocok${r.failures.length ? `  contoh beda: ${r.failures.slice(0, 3).join(" || ")}` : ""}`);
}
fs.writeFileSync(path.join(OBS, "nilai-spss.json"), JSON.stringify(out, null, 1));
