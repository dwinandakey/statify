/** @jest-environment jsdom */
/**
 * GLM Repeated Measures against reference values (perbaikan fix/rm-correctness).
 *
 * Datasets: testing/glm-rm-reference/data (see README there). Expected values:
 * __test__/fixtures/rm-reference-values.json
 *  - spss: PRIMARY reference, SPSS 27 output run by the user
 *    (testing/glm-rm-reference/spss/*.sps). Empty slots are "menunggu SPSS"
 *    (it.todo). Tolerance |Statify − SPSS| ≤ 0.001 (SPSS shows 3 decimals).
 *  - r_car: INTERIM reference, values printed directly by R car, and EM Means
 *    from R afex (each entry carries its R source). Tolerance 1e-6 (relative
 *    for large values).
 * No expected value in this file is computed by Statify itself.
 */
import fs from "fs";
import path from "path";
import init, {
    RepeatedMeasureAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg/wasm";

const REF_DIR = path.resolve(__dirname, "../../../../../../../testing/glm-rm-reference");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/rm-reference-values.json"), "utf8"));

type Row = Record<string, number | string | null>;
type Design = {
    csv: string;
    factor: string;
    levels: number;
    measures: [string, string[]][];
    between: string[];
    options: Record<string, boolean>;
    emmeans?: Record<string, unknown>;
};

const OPT = { DescStats: true, EstEffectSize: true, ObsPower: true };
const DESIGNS: Record<string, Design> = {
    gambar51: { csv: "gambar51.csv", factor: "perlakuan", levels: 4, measures: [["anjing", ["perlakuan1", "perlakuan2", "perlakuan3", "perlakuan4"]]], between: [], options: {} },
    a: { csv: "rm_a.csv", factor: "waktu", levels: 3, measures: [["cemas", ["cemas1", "cemas2", "cemas3"]], ["stres", ["stres1", "stres2", "stres3"]]], between: [], options: OPT },
    b: { csv: "rm_b.csv", factor: "waktu", levels: 4, measures: [["skor", ["w1", "w2", "w3", "w4"]]], between: ["kelompok"], options: OPT },
    c: {
        // spss/rm_c.sps: /PRINT=… HOMOGENEITY RSSCP.
        csv: "rm_c.csv", factor: "sesi", levels: 3, measures: [["nilai", ["p1", "p2", "p3"]]], between: ["metode"], options: { ...OPT, HomogenTest: true, ResSscpMat: true },
        emmeans: { TargetList: ["(OVERALL)", "metode", "sesi", "metode*sesi"], CompMainEffect: true, ConfiIntervalMethod: "bonferroni" },
    },
};

const readCsv = (file: string): Row[] => {
    const [head, ...lines] = fs.readFileSync(path.join(REF_DIR, "data", file), "utf8").trim().split(/\r?\n/);
    const cols = head.split(",");
    return lines.map((l) => {
        const v = l.split(",");
        return Object.fromEntries(cols.map((c, i) => [c, v[i] === "" ? null : Number(v[i])]));
    });
};

const def = (name: string, columnIndex: number, nominal = false) => ({
    id: columnIndex + 1, columnIndex, name, type: "NUMERIC", width: 8, decimals: nominal ? 0 : 2, label: "",
    values: [], missing: [], columns: 72, align: "right", measure: nominal ? "nominal" : "scale", role: "input",
});

/** Payload in the layout of repeated-measures-analysis.ts (factors_data[f][s]). */
function payload(d: Design) {
    const rows = readCsv(d.csv);
    const encoded: string[] = [];
    const cols: string[] = [];
    d.measures.forEach(([m, columns]) => columns.forEach((c, i) => { encoded.push(`${c}_(${i + 1},${m})`); cols.push(c); }));
    const cfg = JSON.parse(JSON.stringify(fixture.config_template));
    cfg.main.SubVar = encoded;
    cfg.main.FactorsVar = d.between.length ? d.between : null;
    cfg.model.DefFactors = d.factor;
    cfg.model.BetSubVar = [...d.between];
    cfg.emmeans.SrcList = [...d.between];
    cfg.options = { ...cfg.options, ...d.options };
    cfg.emmeans = { ...cfg.emmeans, ...(d.emmeans || {}) };
    // Polynomial contrasts, as /WSFACTOR=<factor> <k> Polynomial in spss/*.sps.
    cfg.contrast = { ...cfg.contrast, FactorList: [`${d.factor}(Polynomial)`] };
    return {
        subject: rows.map((r) => [Object.fromEntries(cols.map((c, i) => [encoded[i], r[c]]))]),
        factors: d.between.map((b) => rows.map((r) => ({ [b]: r[b] }))),
        subjectDefs: encoded.map((n, i) => [def(n, i)]),
        factorDefs: d.between.map((b, i) => [def(b, cols.length + i, true)]),
        cfg,
    };
}

function run(key: string) {
    const p = payload(DESIGNS[key]);
    const a = new RepeatedMeasureAnalysis(p.subject, p.factors, [], p.subjectDefs, p.factorDefs, [], p.cfg);
    try {
        return { results: a.get_formatted_results(), errors: String(a.get_all_errors()) };
    } finally {
        a.free();
    }
}

const get = (container: any, key: string) => (container instanceof Map ? container.get(key) : container?.[key]);

/** Statify value for one reference entry (table/measure/source/correction/field). */
function pick(results: any, key: string, e: any): number | undefined {
    const d = DESIGNS[key];
    switch (e.table) {
        case "mauchly": {
            const t = get(get(results.mauchly_test, "tests"), e.measure);
            return ({
                W: t?.mauchly_w, "Mauchly's W": t?.mauchly_w, "Approx. Chi-Square": t?.chi_square, df: t?.df,
                "Sig.": t?.significance, "Greenhouse-Geisser": t?.greenhouse_geisser_epsilon,
                "Huynh-Feldt": t?.huynh_feldt_epsilon, "Lower-bound": t?.lower_bound_epsilon,
            } as Record<string, number>)[e.field];
        }
        case "within_effects": {
            const sources: any[] = get(get(get(results.tests_of_within_subjects_effects, "measures"), e.measure), "sources") ?? [];
            const errorName = `Error(${d.factor})`;
            const find = (src: string, corr: string) => sources.find((s) => s.source === src && s.assumption_type === corr);
            if (e.field === "error SS") return find(errorName, "Sphericity Assumed")?.sum_of_squares;
            if (e.field === "error df") return find(errorName, "Sphericity Assumed")?.df;
            if (e.field === "Sig. Greenhouse-Geisser") return find(e.source, "Greenhouse-Geisser")?.significance;
            const row = find(e.source, e.correction ?? "Sphericity Assumed");
            return ({
                SS: row?.sum_of_squares, df: row?.df, "Mean Square": row?.mean_square, F: row?.f, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power,
            } as Record<string, number>)[e.field];
        }
        case "between_effects": {
            const eff = get(get(results.tests_of_between_subjects_effects, "effects"), e.measure);
            if (e.field === "error SS") return get(eff, "Error")?.sum_of_squares;
            if (e.field === "error df") return get(eff, "Error")?.df;
            const row = get(eff, e.source);
            return ({
                SS: row?.sum_of_squares, df: row?.df, "Mean Square": row?.mean_square, F: row?.f_value, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power,
            } as Record<string, number>)[e.field];
        }
        case "multivariate": {
            const [effect, test] = String(e.source).split(" | ");
            const row = get(get(get(results.multivariate_tests, "effects"), effect), test);
            return ({
                Value: row?.value, F: row?.f, "Hypothesis df": row?.hypothesis_df, "Error df": row?.error_df, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power,
            } as Record<string, number>)[e.field];
        }
        case "within_contrasts": {
            const [src, contrast] = String(e.source).split(" | ");
            const sources: any[] = get(get(get(results.tests_of_within_subjects_contrasts, "measures"), e.measure), "sources") ?? [];
            const row = sources.find((s) => s.source === src && Object.values(s.factor_values ?? {})[0] === contrast);
            return ({
                SS: row?.sum_of_squares, df: row?.df, "Mean Square": row?.mean_square, F: row?.f, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power,
            } as Record<string, number>)[e.field];
        }
        case "within_multivariate": {
            const [effect, test] = String(e.source).split(" | ");
            const row = get(get(get(results.within_subjects_multivariate, "effects"), effect), test);
            return ({
                Value: row?.value, F: row?.f, "Hypothesis df": row?.hypothesis_df, "Error df": row?.error_df, "Sig.": row?.significance,
                "Partial Eta Squared": row?.partial_eta_squared, "Noncent. Parameter": row?.noncent_parameter, "Observed Power": row?.observed_power,
            } as Record<string, number>)[e.field];
        }
        case "bartlett": {
            const b = results.bartlett_test;
            return ({ "Likelihood Ratio": b?.likelihood_ratio, "Approx. Chi-Square": b?.approx_chi_square, df: b?.df, "Sig.": b?.significance } as Record<string, number>)[e.field];
        }
        case "descriptives": {
            // measure = dependent variable column, source = between-subjects level ("" without between factors).
            const [m, cols] = d.measures.find(([, c]) => c.includes(e.measure))!;
            const j = cols.indexOf(e.measure) + 1;
            const groups: any[] = get(get(results.descriptive_statistics, `${e.measure}_(${j},${m})`), "groups") ?? [];
            const g = e.source === "" ? groups[0] : groups.find((x) => x.factor_value === e.source);
            return ({ Mean: g?.stats?.mean, "Std. Deviation": g?.stats?.std_deviation, N: g?.stats?.n } as Record<string, number>)[e.field];
        }
        case "residual_sscp": {
            // measure = part of the table, source = "<row DV> | <column DV>".
            const part = ({ "Sum-of-Squares and Cross-Products": "values", Covariance: "covariance", Correlation: "correlation" } as Record<string, string>)[e.measure];
            const [a, b] = String(e.source).split(" | ");
            const enc = (col: string) => {
                const [m, cols] = d.measures.find(([, c]) => c.includes(col))!;
                return `${col}_(${cols.indexOf(col) + 1},${m})`;
            };
            return get(get(get(results.residual_matrix, part), enc(a)), enc(b));
        }
        case "univariate": {
            const [m, j] = String(e.measure).split("|");
            const cols = d.measures.find(([name]) => name === m)![1];
            const dv = `${cols[Number(j) - 1]}_(${j},${m})`;
            const row = (get(get(results.univariate_tests, "tests"), dv) ?? []).find((x: any) => x.source === e.source);
            return ({ SS: row?.sum_of_squares, df: row?.df, F: row?.f } as Record<string, number>)[e.field];
        }
        case "levene": {
            const [m, j] = String(e.measure).split("|");
            const cols = d.measures.find(([name]) => name === m)![1];
            const dv = `${cols[Number(j) - 1]}_(${j},${m})`;
            const row = (get(get(results.homogeneity_tests, "levene"), dv) ?? []).find((x: any) => x.based_on === e.source);
            return ({ "Levene Statistic": row?.statistic, df1: row?.df1, df2: row?.df2, "Sig.": row?.significance } as Record<string, number>)[e.field];
        }
        case "box_m": {
            const b = get(results.homogeneity_tests, "box_m");
            return ({ "Box's M": b?.box_m, F: b?.f, df1: b?.df1, df2: b?.df2, "Sig.": b?.significance } as Record<string, number>)[e.field];
        }
        case "emmeans": {
            const [target, level] = String(e.source).split(" | ");
            const row = (get(results.emmeans, target) ?? []).find((x: any) => x.factor_value === level && x.dependent_variable === e.measure);
            return ({
                Mean: row?.mean, "Std. Error": row?.std_error,
                "Lower Bound": row?.confidence_interval?.lower_bound, "Upper Bound": row?.confidence_interval?.upper_bound,
            } as Record<string, number>)[e.field];
        }
        case "emmeans_pairwise": {
            const [target, pair] = String(e.source).split(" | ");
            const [li, lj] = pair.split(" - ");
            const row = (get(results.emmeans_pairwise, target) ?? []).find(
                (x: any) => x.level_i === li && x.level_j === lj && x.dependent_variable === e.measure
            );
            return ({
                "Mean Difference": row?.mean_difference, "Std. Error": row?.std_error, "Sig.": row?.significance,
                "Lower Bound": row?.confidence_interval?.lower_bound, "Upper Bound": row?.confidence_interval?.upper_bound,
            } as Record<string, number>)[e.field];
        }
        default:
            return undefined;
    }
}

const label = (e: any) => [e.table, e.measure, e.source, e.correction, e.field].filter(Boolean).join(" · ");

beforeAll(async () => {
    await init({ module_or_path: fs.readFileSync(path.join(__dirname, "../rust/pkg/wasm_bg.wasm")) });
});

describe.each(fixture.datasets as string[])("Repeated Measures dataset %s", (key) => {
    let out: { results: any; errors: string };
    beforeAll(() => {
        out = run(key);
    });

    it("runs without errors", () => {
        expect(out.errors).toBe("No errors occurred.");
    });

    const rEntries = (fixture.r_car as any[]).filter((e) => e.dataset === key);
    if (rEntries.length) {
        it.each(rEntries.map((e) => [label(e), e]))("R car/afex (sementara): %s", (_l, e: any) => {
            const v = pick(out.results, key, e);
            expect(typeof v).toBe("number");
            expect(Math.abs((v as number) - e.value)).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(e.value)));
        });
    }

    const spss = (fixture.spss as any[]).filter((e) => e.dataset === key);
    const filled = spss.filter((e) => e.value !== null);
    if (filled.length) {
        it.each(filled.map((e) => [label(e), e]))("SPSS 27: %s", (_l, e: any) => {
            const v = pick(out.results, key, e) as number;
            if (typeof e.value === "string" && e.value.startsWith("<")) {
                expect(v).toBeLessThan(Number(e.value.slice(1)));
            } else {
                expect(Math.abs(v - Number(e.value))).toBeLessThanOrEqual(0.001 + 1e-9);
            }
        });
    }
    const pendingTables = [...new Set(spss.filter((e) => e.value === null).map((e) => e.table))];
    pendingTables.forEach((t) => it.todo(`SPSS 27: ${t} (${spss.filter((e) => e.table === t && e.value === null).length} nilai) — menunggu SPSS`));
});
