// Compares Statify RM results with a reference (R interim now, SPSS later)
// cell by cell for Mauchly, Tests of Within-Subjects Effects, Multivariate
// Tests and Tests of Between-Subjects Effects.
//   node compare-reference.mjs <design> <statify.json> [--ref=../r-output/reference-r.json] [--tol=1e-6]
// Exit code 1 when any compared value differs by more than tol (absolute).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Returns rows { table, key, field, statify, reference, diff, ok }. */
export function compareWithR(key, statify, ref, tol = 1e-6) {
    const r = ref[key];
    const s = statify.results || statify;
    const rows = [];
    const cmp = (table, k, field, a, b) => {
        const diff = typeof a === "number" && typeof b === "number" ? Math.abs(a - b) : null;
        const ok = diff !== null ? diff <= tol || (b === 1 && a === 1) : a === b;
        rows.push({ table, key: k, field, statify: a, reference: b, diff, ok });
    };
    const missing = (table, k) => rows.push({ table, key: k, field: "(row)", statify: "(missing)", reference: "(present)", diff: null, ok: false });

    // Mauchly (per measure)
    for (const m of r.mauchly) {
        const e = s.mauchly_test?.tests?.[m.measure];
        if (!e) { missing("Mauchly", m.measure); continue; }
        cmp("Mauchly", m.measure, "W", e.mauchly_w, m.mauchly_w);
        cmp("Mauchly", m.measure, "Approx. Chi-Square", e.chi_square, m.approx_chi_square);
        cmp("Mauchly", m.measure, "df", e.df, m.df);
        // Sig. with the ω₂ correction (sig_anderson), as SPSS 27 prints it (Gambar 51: .2975).
        cmp("Mauchly", m.measure, "Sig. (χ² + ω₂, as SPSS)", e.significance, m.sig_anderson);
        cmp("Mauchly", m.measure, "Greenhouse-Geisser", e.greenhouse_geisser_epsilon, m.greenhouse_geisser);
        cmp("Mauchly", m.measure, "Huynh-Feldt", e.huynh_feldt_epsilon, m.huynh_feldt);
        cmp("Mauchly", m.measure, "Lower-bound", e.lower_bound_epsilon, m.lower_bound);
    }
    // Tests of Within-Subjects Effects
    for (const w of r.within_effects) {
        const src = s.tests_of_within_subjects_effects?.measures?.[w.measure]?.sources || [];
        const e = src.find((x) => x.source === w.source && x.assumption_type === w.correction);
        const k = `${w.measure} | ${w.source} | ${w.correction}`;
        if (!e) { missing("Within-Subjects Effects", k); continue; }
        cmp("Within-Subjects Effects", k, "SS", e.sum_of_squares, w.type_III_ss);
        cmp("Within-Subjects Effects", k, "df", e.df, w.df);
        cmp("Within-Subjects Effects", k, "Mean Square", e.mean_square, w.mean_square);
        cmp("Within-Subjects Effects", k, "F", e.f, w.F);
        cmp("Within-Subjects Effects", k, "Sig.", e.significance, w.sig);
        cmp("Within-Subjects Effects", k, "Partial Eta Squared", e.partial_eta_squared, w.partial_eta_sq);
        cmp("Within-Subjects Effects", k, "Noncent.", e.noncent_parameter, w.noncent);
        cmp("Within-Subjects Effects", k, "Observed Power", e.observed_power, w.observed_power);
        const errName = `Error(${w.source.split(" * ")[0]})`;
        const err = src.find((x) => x.source === errName && x.assumption_type === w.correction);
        if (err) {
            cmp("Within-Subjects Effects", `${w.measure} | ${errName} | ${w.correction}`, "SS", err.sum_of_squares, w.error_ss);
            cmp("Within-Subjects Effects", `${w.measure} | ${errName} | ${w.correction}`, "df", err.df, w.error_df);
            cmp("Within-Subjects Effects", `${w.measure} | ${errName} | ${w.correction}`, "Mean Square", err.mean_square, w.error_ms);
        } else missing("Within-Subjects Effects", `${w.measure} | ${errName} | ${w.correction}`);
    }
    // Multivariate Tests
    for (const t of r.multivariate_tests) {
        const effect = t.effect.replace(/^(Between|Within) Subjects: /, "");
        const e = s.multivariate_tests?.effects?.[effect]?.[t.test];
        const k = `${t.effect} | ${t.test}`;
        if (!e) { missing("Multivariate Tests", k); continue; }
        cmp("Multivariate Tests", k, "Value", e.value, t.value);
        cmp("Multivariate Tests", k, "F", e.f, t.F);
        cmp("Multivariate Tests", k, "Hypothesis df", e.hypothesis_df, t.hypothesis_df);
        cmp("Multivariate Tests", k, "Error df", e.error_df, t.error_df);
        cmp("Multivariate Tests", k, "Sig.", e.significance, t.sig);
        cmp("Multivariate Tests", k, "Partial Eta Squared", e.partial_eta_squared, t.partial_eta_sq);
        cmp("Multivariate Tests", k, "Noncent.", e.noncent_parameter, t.noncent);
        cmp("Multivariate Tests", k, "Observed Power", e.observed_power, t.observed_power);
    }
    // Tests of Between-Subjects Effects
    for (const b of r.between_effects) {
        const eff = s.tests_of_between_subjects_effects?.effects?.[b.measure];
        const e = eff?.[b.source];
        const k = `${b.measure} | ${b.source}`;
        if (!e) { missing("Between-Subjects Effects", k); continue; }
        cmp("Between-Subjects Effects", k, "SS", e.sum_of_squares, b.type_III_ss);
        cmp("Between-Subjects Effects", k, "df", e.df, b.df);
        cmp("Between-Subjects Effects", k, "Mean Square", e.mean_square, b.mean_square);
        cmp("Between-Subjects Effects", k, "F", e.f_value, b.F);
        cmp("Between-Subjects Effects", k, "Sig.", e.significance, b.sig);
        cmp("Between-Subjects Effects", k, "Partial Eta Squared", e.partial_eta_squared, b.partial_eta_sq);
        cmp("Between-Subjects Effects", k, "Noncent.", e.noncent_parameter, b.noncent);
        cmp("Between-Subjects Effects", k, "Observed Power", e.observed_power, b.observed_power);
        const er = eff?.Error;
        if (er && b.source === "Intercept") {
            cmp("Between-Subjects Effects", `${b.measure} | Error`, "SS", er.sum_of_squares, b.error_ss);
            cmp("Between-Subjects Effects", `${b.measure} | Error`, "df", er.df, b.error_df);
        }
    }
    return rows;
}

if (process.argv[1] && process.argv[1].endsWith("compare-reference.mjs")) {
    const args = process.argv.slice(2);
    const opts = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
    const [key, file] = args.filter((a) => !a.startsWith("--"));
    const ref = JSON.parse(fs.readFileSync(opts.ref || path.join(here, "../r-output/reference-r.json"), "utf8"));
    const rows = compareWithR(key, JSON.parse(fs.readFileSync(file, "utf8")), ref, Number(opts.tol ?? 1e-6));
    const byTable = {};
    for (const r of rows) (byTable[r.table] ??= []).push(r);
    for (const [t, rs] of Object.entries(byTable)) {
        const bad = rs.filter((r) => !r.ok);
        console.log(`${t.padEnd(26)} ${rs.length - bad.length}/${rs.length} cocok`);
        const shown = "all" in opts ? bad : bad.slice(0, Number(opts.max || 12));
        for (const b of shown) console.log(`    ✗ ${b.key} · ${b.field}: Statify ${b.statify} vs ref ${b.reference}${b.diff !== null ? ` (Δ ${b.diff.toExponential(2)})` : ""}`);
        if (bad.length > shown.length) console.log(`    … ${bad.length - shown.length} lagi`);
    }
    process.exitCode = rows.every((r) => r.ok) ? 0 : 1;
}
