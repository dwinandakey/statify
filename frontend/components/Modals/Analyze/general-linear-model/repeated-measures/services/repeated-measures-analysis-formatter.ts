import type { ResultJson, Row, Table } from "@/types/Table";
import { formatDisplayNumber, formatSig } from "@/hooks/useFormatter";

export function transformRepeatedMeasureResult(
    data: any,
    errors: string[] = []
): ResultJson {
    const resultJson: ResultJson = { tables: [] };
    if (!data) return resultJson;

    formatWithinSubjectsFactors(data, resultJson);
    formatDescriptiveStatistics(data, resultJson);
    formatHomogeneityTests(data, resultJson);
    formatBartlettTest(data, resultJson);
    formatMultivariateTests(data, resultJson);
    formatMauchlyTest(data, resultJson);
    formatWithinSubjectsMultivariate(data, resultJson);
    formatTestsWithinSubjectsEffects(data, resultJson);
    formatTestsWithinSubjectsContrasts(data, resultJson);
    formatTestsBetweenSubjectsEffects(data, resultJson);
    formatParameterEstimates(data, resultJson);
    formatGeneralEstimableFunction(data, resultJson);
    formatResidualMatrix(data, resultJson);
    formatSSCPMatrix(data, resultJson);
    formatUnivariateTests(data, resultJson);
    formatPosthocTests(data, resultJson);
    formatEmmeans(data, resultJson);
    formatEmmeansPairwise(data, resultJson);
    formatErrors(errors, resultJson);

    return resultJson;
}

function fmt3(v: number | null | undefined): string | null {
    if (v === null || v === undefined || isNaN(v as number)) return null;
    return (v as number).toFixed(3);
}

// ── 1. Within-Subjects Factors ───────────────────────────────────────────────
function formatWithinSubjectsFactors(data: any, resultJson: ResultJson) {
    if (!data.within_subjects_factors?.measures) return;
    const measures = data.within_subjects_factors.measures;

    Object.entries(measures).forEach(([measureName, factorList]: [string, any]) => {
        if (!Array.isArray(factorList) || factorList.length === 0) return;

        const factorKeys = Object.keys(factorList[0]?.factor_values || {});
        const factorHeader = factorKeys[0] || "Factor";

        const table: Table = {
            key: `within_subjects_factors_${measureName}`,
            title: "Within-Subjects Factors",
            columnHeaders: [
                { header: "Measure", key: "measure" },
                { header: factorHeader, key: "factor_level" },
                { header: "Dependent Variable", key: "dep_var" },
            ],
            rows: [],
            note: `Measure: ${measureName}`,
            interpretation:
                "This table lists the dependent variables associated with each level of the within-subjects factor.",
        };

        factorList.forEach((entry: any, idx: number) => {
            const levelVal = entry.factor_values?.[factorHeader] ?? String(idx + 1);
            table.rows.push({
                rowHeader: [],
                measure: idx === 0 ? measureName : "",
                factor_level: String(levelVal),
                dep_var: entry.dependent_variable ?? "",
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 2. Descriptive Statistics ─────────────────────────────────────────────────
function formatDescriptiveStatistics(data: any, resultJson: ResultJson) {
    if (!data.descriptive_statistics) return;

    Object.entries(data.descriptive_statistics).forEach(
        ([dvName, stat]: [string, any]) => {
            const table: Table = {
                key: `descriptive_statistics_${dvName}`,
                title: `Descriptive Statistics`,
                columnHeaders: [
                    { header: "", key: "label" },
                    { header: "Mean", key: "mean" },
                    { header: "Std. Deviation", key: "std_dev" },
                    { header: "N", key: "n" },
                ],
                rows: [],
                note: `Dependent Variable: ${dvName}`,
                interpretation:
                    "Descriptive statistics for each level of the within-subjects factor.",
            };

            (stat.groups || []).forEach((g: any) => {
                table.rows.push({
                    rowHeader: [],
                    label: g.factor_value || "",
                    mean: formatDisplayNumber(g.stats?.mean),
                    std_dev: formatDisplayNumber(g.stats?.std_deviation),
                    n: String(g.stats?.n ?? ""),
                });
            });

            resultJson.tables.push(table);
        }
    );
}

// ── 3a. Homogeneity tests (Box's M, Levene) ──────────────────────────────────
function formatHomogeneityTests(data: any, resultJson: ResultJson) {
    const h = data.homogeneity_tests;
    if (!h) return;
    const design = h.design ? `Design: ${h.design}` : "";

    if (h.box_m) {
        const b = h.box_m;
        resultJson.tables.push({
            key: "box_m_test",
            title: "Box's Test of Equality of Covariance Matrices",
            columnHeaders: [
                { header: "", key: "label" },
                { header: "", key: "value" },
            ],
            rows: [
                { rowHeader: [], label: "Box's M", value: fmt3(b.box_m) },
                { rowHeader: [], label: "F", value: fmt3(b.f) },
                { rowHeader: [], label: "df1", value: fmt3(b.df1) },
                { rowHeader: [], label: "df2", value: fmt3(b.df2) },
                { rowHeader: [], label: "Sig.", value: formatSig(b.significance) },
            ],
            note: `Tests the null hypothesis that the observed covariance matrices of the dependent variables are equal across groups. ${design}`.trim(),
            interpretation: "If significant (Sig. < .05), the covariance matrices of the dependent variables differ across the between-subjects groups.",
        });
    }

    const levene = h.levene || {};
    const dvs = Object.keys(levene);
    if (dvs.length) {
        const table: Table = {
            key: "levene_test",
            title: "Levene's Test of Equality of Error Variances",
            columnHeaders: [
                { header: "", key: "dv" },
                { header: "", key: "based_on" },
                { header: "Levene Statistic", key: "statistic" },
                { header: "df1", key: "df1" },
                { header: "df2", key: "df2" },
                { header: "Sig.", key: "sig" },
            ],
            rows: [],
            note: `Tests the null hypothesis that the error variance of the dependent variable is equal across groups. ${design}`.trim(),
            interpretation: "If significant (Sig. < .05), the error variances differ across the between-subjects groups.",
        };
        dvs.forEach((dv) => {
            (levene[dv] || []).forEach((e: any, idx: number) => {
                const integerDf = Number.isInteger(e.df2);
                table.rows.push({
                    rowHeader: [],
                    dv: idx === 0 ? dv : "",
                    based_on: e.based_on,
                    statistic: fmt3(e.statistic),
                    df1: String(e.df1),
                    df2: integerDf ? String(e.df2) : fmt3(e.df2),
                    sig: formatSig(e.significance),
                });
            });
        });
        resultJson.tables.push(table);
    }
}

// ── 3. Bartlett's Test ────────────────────────────────────────────────────────
function formatBartlettTest(data: any, resultJson: ResultJson) {
    if (!data.bartlett_test) return;
    const b = data.bartlett_test;
    const table: Table = {
        key: "bartlett_test",
        title: "Bartlett's Test of Sphericity",
        columnHeaders: [
            { header: "", key: "label" },
            { header: "", key: "value" },
        ],
        rows: [
            { rowHeader: [], label: "Likelihood Ratio", value: formatDisplayNumber(b.likelihood_ratio) },
            { rowHeader: [], label: "Approx. Chi-Square", value: formatDisplayNumber(b.approx_chi_square) },
            { rowHeader: [], label: "df", value: String(b.df) },
            { rowHeader: [], label: "Sig.", value: formatSig(b.significance) },
        ],
        note: b.description || "",
        interpretation:
            "Tests the null hypothesis that the residual covariance matrix is proportional to an identity matrix.",
    };
    resultJson.tables.push(table);
}

// ── 4. Multivariate Tests ─────────────────────────────────────────────────────
function formatMultivariateTests(data: any, resultJson: ResultJson) {
    if (!data.multivariate_tests?.effects) return;
    resultJson.tables.push(
        multivariateTable(
            data.multivariate_tests,
            "multivariate_tests",
            "Multivariate Tests",
            "",
            "Multivariate tests of within-subjects effects. Wilks' Lambda is commonly reported; a significant result indicates that repeated measures differ across levels."
        )
    );
}

// Tests of Within-Subjects Effects, "Multivariate" part (more than one
// measure), as SPSS prints it above the univariate tests. The key keeps the
// tests_within_subjects_effects_ prefix so the output module stores it with
// the within-subjects effects tables.
function formatWithinSubjectsMultivariate(data: any, resultJson: ResultJson) {
    if (!data.within_subjects_multivariate?.effects) return;
    resultJson.tables.push(
        multivariateTable(
            data.within_subjects_multivariate,
            "tests_within_subjects_effects__multivariate",
            "Tests of Within-Subjects Effects (Multivariate)",
            " Tests are based on averaged variables.",
            "Multivariate tests of the within-subjects effects over all measures, based on the averaged transformed variables."
        )
    );
}

function multivariateTable(tests: any, key: string, title: string, noteSuffix: string, interpretation: string): Table {
    const effects = tests.effects;

    const testOrder = [
        "Pillai's Trace",
        "Wilks' Lambda",
        "Hotelling's Trace",
        "Roy's Largest Root",
    ];

    const table: Table = {
        key,
        title,
        columnHeaders: [
            { header: "", key: "effect" },
            { header: "", key: "test_name" },
            { header: "Value", key: "value" },
            { header: "F", key: "f" },
            { header: "Hypothesis df", key: "hyp_df" },
            { header: "Error df", key: "err_df" },
            { header: "Sig.", key: "sig" },
            { header: "Partial Eta Squared", key: "eta2" },
            { header: "Noncent. Parameter", key: "noncent" },
            { header: "Observed Power", key: "power" },
        ],
        rows: [],
        note: tests.design
            ? (String(tests.design).includes("Within Subjects Design")
                ? `Design: ${tests.design}`
                : `Design: Intercept; Within Subjects Design: ${tests.design}`) + noteSuffix
            : undefined,
        interpretation,
    };

    Object.entries(effects).forEach(([effectName, testMap]: [string, any]) => {
        const tests = testOrder
            .map((t) => ({ name: t, entry: testMap[t] }))
            .filter((x) => x.entry != null);

        tests.forEach(({ name, entry }, idx) => {
            table.rows.push({
                rowHeader: [],
                effect: idx === 0 ? effectName : "",
                test_name: name,
                value: fmt3(entry.value),
                f: fmt3(entry.f),
                hyp_df: fmt3(entry.hypothesis_df),
                err_df: fmt3(entry.error_df),
                sig: formatSig(entry.significance),
                eta2: fmt3(entry.partial_eta_squared),
                noncent: fmt3(entry.noncent_parameter),
                power: fmt3(entry.observed_power),
            });
        });
    });

    return table;
}

// ── 5. Mauchly's Test ─────────────────────────────────────────────────────────
function formatMauchlyTest(data: any, resultJson: ResultJson) {
    if (!data.mauchly_test?.tests) return;
    const tests = data.mauchly_test.tests;

    const table: Table = {
        key: "mauchly_test",
        title: "Mauchly's Test of Sphericity",
        columnHeaders: [
            { header: "Measure", key: "measure" },
            { header: "Within Subjects Effect", key: "effect" },
            { header: "Mauchly's W", key: "w" },
            { header: "Approx. Chi-Square", key: "chi_sq" },
            { header: "df", key: "df" },
            { header: "Sig.", key: "sig" },
            { header: "Greenhouse-Geisser", key: "gg" },
            { header: "Huynh-Feldt", key: "hf" },
            { header: "Lower-bound", key: "lb" },
        ],
        rows: [],
        note:
            "Tests the null hypothesis that the error covariance matrix of the orthonormalized transformed dependent variables is proportional to an identity matrix." +
            (data.mauchly_test.design
                ? String(data.mauchly_test.design).includes("Within Subjects Design")
                    ? ` Design: ${data.mauchly_test.design}`
                    : ` Design: Intercept; Within Subjects Design: ${data.mauchly_test.design}`
                : ""),
        interpretation:
            "If significant (Sig. < .05), sphericity is violated and corrected degrees of freedom should be used.",
    };

    // Keyed by measure (one test per measure); the within-subjects effect
    // name is in entry.effect.
    Object.entries(tests).forEach(([measureName, entry]: [string, any]) => {
        table.rows.push({
            rowHeader: [],
            measure: measureName,
            effect: entry.effect ?? "",
            w: fmt3(entry.mauchly_w),
            chi_sq: fmt3(entry.chi_square),
            df: String(entry.df),
            sig: formatSig(entry.significance),
            gg: fmt3(entry.greenhouse_geisser_epsilon),
            hf: fmt3(entry.huynh_feldt_epsilon),
            lb: fmt3(entry.lower_bound_epsilon),
        });
    });

    resultJson.tables.push(table);
}

// ── 6. Tests of Within-Subjects Effects ──────────────────────────────────────
function formatTestsWithinSubjectsEffects(data: any, resultJson: ResultJson) {
    if (!data.tests_of_within_subjects_effects?.measures) return;
    const measures = data.tests_of_within_subjects_effects.measures;

    const assumptionOrder = [
        "Sphericity Assumed",
        "Greenhouse-Geisser",
        "Huynh-Feldt",
        "Lower-bound",
    ];

    Object.entries(measures).forEach(([measureName, result]: [string, any]) => {
        const table: Table = {
            key: `tests_within_subjects_effects_${measureName}`,
            title: "Tests of Within-Subjects Effects",
            columnHeaders: [
                { header: "Source", key: "source" },
                { header: "", key: "assumption" },
                { header: "Type III Sum of Squares", key: "ss" },
                { header: "df", key: "df" },
                { header: "Mean Square", key: "ms" },
                { header: "F", key: "f" },
                { header: "Sig.", key: "sig" },
                { header: "Partial Eta Squared", key: "eta2" },
                { header: "Noncent. Parameter", key: "noncent" },
                { header: "Observed Power", key: "power" },
            ],
            rows: [],
            note: `Measure: ${measureName}`,
            interpretation:
                "Tests whether repeated measures differ significantly across levels. Use Greenhouse-Geisser or Huynh-Feldt corrected p-values when sphericity is violated.",
        };

        const sources = result.sources as any[];
        if (!Array.isArray(sources)) {
            resultJson.tables.push(table);
            return;
        }

        // Group by source name, preserve order of first appearance
        const sourceOrder: string[] = [];
        const groupedSources: Record<string, any[]> = {};
        sources.forEach((s) => {
            if (!groupedSources[s.source]) {
                groupedSources[s.source] = [];
                sourceOrder.push(s.source);
            }
            groupedSources[s.source].push(s);
        });

        sourceOrder.forEach((sourceName) => {
            const rows = groupedSources[sourceName];
            const isError = sourceName.startsWith("Error(");

            assumptionOrder.forEach((assumption, idx) => {
                const row = rows.find((r: any) => r.assumption_type === assumption);
                if (!row) return;

                const isSphericity = assumption === "Sphericity Assumed";
                const dfVal = isSphericity
                    ? String(Math.round(row.df))
                    : fmt3(row.df);

                table.rows.push({
                    rowHeader: [],
                    source: idx === 0 ? sourceName : "",
                    assumption,
                    ss: fmt3(row.sum_of_squares),
                    df: dfVal,
                    ms: fmt3(row.mean_square),
                    f: isError ? null : fmt3(row.f),
                    sig: isError ? null : formatSig(row.significance),
                    eta2: isError ? null : fmt3(row.partial_eta_squared),
                    noncent: isError ? null : fmt3(row.noncent_parameter),
                    power: isError ? null : fmt3(row.observed_power),
                });
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 7. Tests of Within-Subjects Contrasts ────────────────────────────────────
function formatTestsWithinSubjectsContrasts(data: any, resultJson: ResultJson) {
    if (!data.tests_of_within_subjects_contrasts?.measures) return;
    const measures = data.tests_of_within_subjects_contrasts.measures;

    Object.entries(measures).forEach(([measureName, result]: [string, any]) => {
        const sources = result.sources as any[];
        if (!Array.isArray(sources) || sources.length === 0) return;

        const factorName = sources.find((s) => !s.source.startsWith("Error("))?.source ?? measureName;

        const table: Table = {
            key: `tests_within_subjects_contrasts_${measureName}`,
            title: "Tests of Within-Subjects Contrasts",
            columnHeaders: [
                { header: "Source", key: "source" },
                { header: factorName, key: "contrast" },
                { header: "Type III Sum of Squares", key: "ss" },
                { header: "df", key: "df" },
                { header: "Mean Square", key: "ms" },
                { header: "F", key: "f" },
                { header: "Sig.", key: "sig" },
            ],
            rows: [],
            note: `Measure: ${measureName}`,
            interpretation:
                "Pairwise contrasts between adjacent levels of the within-subjects factor.",
        };

        const effectSources = sources.filter((s) => !s.source.startsWith("Error("));
        const errorSources = sources.filter((s) => s.source.startsWith("Error("));

        effectSources.forEach((s: any, idx: number) => {
            const contrastLabel = Object.values(s.factor_values || {})[0] ?? "";
            const newSource = idx === 0 || effectSources[idx - 1].source !== s.source;
            table.rows.push({
                rowHeader: [],
                source: newSource ? s.source : "",
                contrast: String(contrastLabel),
                ss: fmt3(s.sum_of_squares),
                df: String(s.df),
                ms: fmt3(s.mean_square),
                f: fmt3(s.f),
                sig: formatSig(s.significance),
            });
        });

        errorSources.forEach((s: any, idx: number) => {
            const contrastLabel = Object.values(s.factor_values || {})[0] ?? "";
            table.rows.push({
                rowHeader: [],
                source: idx === 0 ? s.source : "",
                contrast: String(contrastLabel),
                ss: fmt3(s.sum_of_squares),
                df: String(s.df),
                ms: fmt3(s.mean_square),
                f: null,
                sig: null,
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 8. Tests of Between-Subjects Effects ─────────────────────────────────────
function formatTestsBetweenSubjectsEffects(data: any, resultJson: ResultJson) {
    if (!data.tests_of_between_subjects_effects?.effects) return;
    const effects = data.tests_of_between_subjects_effects.effects;

    // Several measures: one table with a Measure column, rows grouped by
    // source then measure (SPSS layout).
    const measureNames = Object.keys(effects);
    const multiMeasure = measureNames.length > 1;

    const table: Table = {
        key: "tests_between_subjects_effects",
        title: "Tests of Between-Subjects Effects",
        columnHeaders: [
            { header: "Source", key: "source" },
            ...(multiMeasure ? [{ header: "Measure", key: "measure" }] : []),
            { header: "Type III Sum of Squares", key: "ss" },
            { header: "df", key: "df" },
            { header: "Mean Square", key: "ms" },
            { header: "F", key: "f" },
            { header: "Sig.", key: "sig" },
            { header: "Partial Eta Squared", key: "eta2" },
            { header: "Noncent. Parameter", key: "noncent" },
            { header: "Observed Power", key: "power" },
        ],
        rows: [],
        interpretation:
            "Tests of between-subjects effects using the average of the repeated measurements as the transform variable.",
    };

    // All sources in result order (Intercept, covariates, factors,
    // interactions), Error last.
    const effectOrder = [
        ...Object.keys(effects[measureNames[0]] || {}).filter((e) => e !== "Error"),
        "Error",
    ];
    table.note = multiMeasure
        ? "Transformed Variable: Average"
        : `Measure: ${measureNames[0]}; Transformed Variable: Average`;

    effectOrder.forEach((effectName) => {
        measureNames.forEach((measureName, mIdx) => {
            const entry = effects[measureName]?.[effectName];
            if (!entry) return;
            const isError = effectName === "Error";
            table.rows.push({
                rowHeader: [],
                source: mIdx === 0 ? effectName : "",
                ...(multiMeasure ? { measure: measureName } : {}),
                ss: fmt3(entry.sum_of_squares),
                df: String(entry.df),
                ms: fmt3(entry.mean_square),
                f: isError ? null : fmt3(entry.f_value),
                sig: isError ? null : formatSig(entry.significance),
                eta2: isError ? null : fmt3(entry.partial_eta_squared),
                noncent: isError ? null : fmt3(entry.noncent_parameter),
                power: isError ? null : fmt3(entry.observed_power),
            });
        });
    });

    resultJson.tables.push(table);
}

// ── 9. Parameter Estimates ────────────────────────────────────────────────────
function formatParameterEstimates(data: any, resultJson: ResultJson) {
    if (!data.parameter_estimates?.estimates) return;
    const estimates = data.parameter_estimates.estimates;

    Object.entries(estimates).forEach(([dvName, entryList]: [string, any]) => {
        const table: Table = {
            key: `parameter_estimates_${dvName}`,
            title: "Parameter Estimates",
            columnHeaders: [
                { header: "Dependent Variable", key: "dv" },
                { header: "Parameter", key: "param" },
                { header: "B", key: "b" },
                { header: "Std. Error", key: "se" },
                { header: "t", key: "t" },
                { header: "Sig.", key: "sig" },
                {
                    header: "95% Confidence Interval",
                    children: [
                        { header: "Lower Bound", key: "ci_lower" },
                        { header: "Upper Bound", key: "ci_upper" },
                    ],
                },
                { header: "Partial Eta Squared", key: "eta2" },
                { header: "Noncent. Parameter", key: "noncent" },
                { header: "Observed Power", key: "power" },
            ],
            rows: [],
            note: `Dependent Variable: ${dvName}`,
            interpretation: "OLS parameter estimates for each predictor.",
        };

        (Array.isArray(entryList) ? entryList : []).forEach((e: any, idx: number) => {
            table.rows.push({
                rowHeader: [],
                dv: idx === 0 ? dvName : "",
                param: e.parameter,
                b: formatDisplayNumber(e.b),
                se: formatDisplayNumber(e.std_error),
                t: formatDisplayNumber(e.t_value),
                sig: formatSig(e.significance),
                ci_lower: formatDisplayNumber(e.confidence_interval?.lower_bound),
                ci_upper: formatDisplayNumber(e.confidence_interval?.upper_bound),
                eta2: fmt3(e.partial_eta_squared),
                noncent: fmt3(e.noncent_parameter),
                power: fmt3(e.observed_power),
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 10. General Estimable Function ────────────────────────────────────────────
function formatGeneralEstimableFunction(data: any, resultJson: ResultJson) {
    if (!data.general_estimable_function?.matrix) return;
    const matrix = data.general_estimable_function.matrix;
    const paramNames = Object.keys(matrix);
    if (paramNames.length === 0) return;
    const contrastKeys = Object.keys(matrix[paramNames[0]] || {});

    const table: Table = {
        key: "general_estimable_function",
        title: "General Estimable Function",
        columnHeaders: [
            { header: "", key: "param" },
            ...contrastKeys.map((k) => ({ header: k, key: k })),
        ],
        rows: [],
        note: data.general_estimable_function.design
            ? `Dependent: ${data.general_estimable_function.design}`
            : undefined,
        interpretation: "Contrast coefficients for each estimable function.",
    };

    paramNames.forEach((pName) => {
        const row: Row = { rowHeader: [], param: pName };
        contrastKeys.forEach((k) => { row[k] = String(matrix[pName][k] ?? 0); });
        table.rows.push(row);
    });

    resultJson.tables.push(table);
}

// ── 11. Residual SSCP Matrix ──────────────────────────────────────────────────
function formatResidualMatrix(data: any, resultJson: ResultJson) {
    if (!data.residual_matrix?.values) return;
    const rm = data.residual_matrix;
    const rowKeys = Object.keys(rm.values);
    if (rowKeys.length === 0) return;
    const colKeys = Object.keys(rm.values[rowKeys[0]] || {});
    // Encoded names "p1_(1,nilai)" are shown as the variable name "p1".
    const display = (k: string) => k.replace(/_\([^()]*\)$/, "");

    const table: Table = {
        key: "residual_sscp_matrix",
        title: "Residual SSCP Matrix",
        columnHeaders: [
            { header: "", key: "part" },
            { header: "", key: "row_label" },
            ...colKeys.map((k) => ({ header: display(k), key: k })),
        ],
        rows: [],
        note: rm.description || undefined,
        interpretation: "The residual sum of squares and cross-products matrix, with the residual covariance and correlation matrices.",
    };

    // SSCP, then (from the GLM engine) Covariance and Correlation, as SPSS.
    const parts: [string, any][] = [
        ["Sum-of-Squares and Cross-Products", rm.values],
        ["Covariance", rm.covariance],
        ["Correlation", rm.correlation],
    ];
    parts.forEach(([part, vals]) => {
        if (!vals) return;
        rowKeys.forEach((rk, i) => {
            const row: Row = { rowHeader: [], part: i === 0 ? part : "", row_label: display(rk) };
            colKeys.forEach((ck) => { row[ck] = formatDisplayNumber(vals[rk]?.[ck]); });
            table.rows.push(row);
        });
    });

    resultJson.tables.push(table);
}

// ── 12. SSCP Matrix ───────────────────────────────────────────────────────────
function formatSSCPMatrix(data: any, resultJson: ResultJson) {
    if (!data.sscp_matrix?.categories) return;
    const categories = data.sscp_matrix.categories;

    Object.entries(categories).forEach(([catName, catData]: [string, any]) => {
        const rowKeys = Object.keys(catData);
        if (rowKeys.length === 0) return;
        const colKeys = Object.keys(catData[rowKeys[0]] || {});

        const table: Table = {
            key: `sscp_matrix_${catName}`,
            title: `SSCP Matrix — ${catName}`,
            columnHeaders: [
                { header: "", key: "row_label" },
                ...colKeys.map((k) => ({ header: k, key: k })),
            ],
            rows: [],
            interpretation: `Sum of Squares and Cross-Products matrix for ${catName}.`,
        };

        rowKeys.forEach((rk) => {
            const row: Row = { rowHeader: [], row_label: rk };
            colKeys.forEach((ck) => { row[ck] = formatDisplayNumber(catData[rk][ck]); });
            table.rows.push(row);
        });

        resultJson.tables.push(table);
    });
}

// ── 13. Univariate Tests ──────────────────────────────────────────────────────
function formatUnivariateTests(data: any, resultJson: ResultJson) {
    if (!data.univariate_tests?.tests) return;
    const tests = data.univariate_tests.tests;

    Object.entries(tests).forEach(([dvName, entryList]: [string, any]) => {
        const table: Table = {
            key: `univariate_tests_${dvName}`,
            title: "Univariate Tests",
            columnHeaders: [
                { header: "Source", key: "source" },
                { header: "Sum of Squares", key: "ss" },
                { header: "df", key: "df" },
                { header: "Mean Square", key: "ms" },
                { header: "F", key: "f" },
                { header: "Sig.", key: "sig" },
                { header: "Partial Eta Squared", key: "eta2" },
                { header: "Noncent. Parameter", key: "noncent" },
                { header: "Observed Power", key: "power" },
            ],
            rows: [],
            note: `Dependent Variable: ${dvName}`,
            interpretation: "Univariate tests of between-subjects effects.",
        };

        (Array.isArray(entryList) ? entryList : []).forEach((e: any) => {
            const isError = e.source === "Error" || e.source === "Residual";
            table.rows.push({
                rowHeader: [],
                source: e.source,
                ss: fmt3(e.sum_of_squares),
                df: String(e.df),
                ms: e.mean_square != null ? fmt3(e.mean_square) : null,
                f: isError ? null : (e.f != null ? fmt3(e.f) : null),
                sig: isError ? null : formatSig(e.significance),
                eta2: isError ? null : (e.partial_eta_squared != null ? fmt3(e.partial_eta_squared) : null),
                noncent: isError ? null : (e.noncent_parameter != null ? fmt3(e.noncent_parameter) : null),
                power: isError ? null : (e.observed_power != null ? fmt3(e.observed_power) : null),
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 14. Post-Hoc Tests ────────────────────────────────────────────────────────
function formatPosthocTests(data: any, resultJson: ResultJson) {
    if (!data.posthoc_tests) return;

    Object.entries(data.posthoc_tests).forEach(([dvName, tests]: [string, any]) => {
        const table: Table = {
            key: `posthoc_tests_${dvName}`,
            title: `Post Hoc Tests`,
            columnHeaders: [
                { header: "Factor", key: "factor" },
                { header: "(I) Level", key: "i_level" },
                { header: "(J) Level", key: "j_level" },
                { header: "Mean Difference (I-J)", key: "mean_diff" },
                { header: "Std. Error", key: "se" },
                { header: "Sig.", key: "sig" },
                {
                    header: "95% Confidence Interval",
                    children: [
                        { header: "Lower Bound", key: "ci_lower" },
                        { header: "Upper Bound", key: "ci_upper" },
                    ],
                },
            ],
            rows: [],
            note: `Dependent Variable: ${dvName}`,
            interpretation: "Multiple comparison tests for between-subjects factors.",
        };

        (Array.isArray(tests) ? tests : []).forEach((t: any) => {
            table.rows.push({
                rowHeader: [],
                factor: t.factor_name,
                i_level: t.i_level,
                j_level: t.j_level,
                mean_diff: formatDisplayNumber(t.mean_difference),
                se: formatDisplayNumber(t.std_error),
                sig: formatSig(t.significance),
                ci_lower: formatDisplayNumber(t.confidence_interval?.lower_bound),
                ci_upper: formatDisplayNumber(t.confidence_interval?.upper_bound),
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 15. Estimated Marginal Means ──────────────────────────────────────────────
function formatEmmeans(data: any, resultJson: ResultJson) {
    if (!data.emmeans) return;

    // One table per target ("(OVERALL)", a factor or an interaction), rows per
    // level (and per measure when there are several), as SPSS EMMEANS TABLES.
    Object.entries(data.emmeans).forEach(([target, meanList]: [string, any]) => {
        const list = Array.isArray(meanList) ? meanList : [];
        const measures = [...new Set(list.map((m: any) => m.dependent_variable))];
        const multiMeasure = measures.length > 1;
        const table: Table = {
            key: `emmeans_${target}`,
            title: `Estimated Marginal Means`,
            columnHeaders: [
                { header: target === "(OVERALL)" ? "" : target, key: "factor" },
                ...(multiMeasure ? [{ header: "Measure", key: "measure" }] : []),
                { header: "Mean", key: "mean" },
                { header: "Std. Error", key: "se" },
                {
                    header: "95% Confidence Interval",
                    children: [
                        { header: "Lower Bound", key: "ci_lower" },
                        { header: "Upper Bound", key: "ci_upper" },
                    ],
                },
            ],
            rows: [],
            note: `${target === "(OVERALL)" ? "Grand Mean" : target}${multiMeasure ? "" : `; Measure: ${measures[0] ?? ""}`}`,
            interpretation: "Estimated marginal means for each level of the specified factor.",
        };

        list.forEach((m: any, idx: number) => {
            table.rows.push({
                rowHeader: [],
                factor: idx === 0 || list[idx - 1].factor_value !== m.factor_value ? m.factor_value : "",
                ...(multiMeasure ? { measure: m.dependent_variable } : {}),
                mean: formatDisplayNumber(m.mean),
                se: formatDisplayNumber(m.std_error),
                ci_lower: formatDisplayNumber(m.confidence_interval?.lower_bound),
                ci_upper: formatDisplayNumber(m.confidence_interval?.upper_bound),
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 15b. EM Means Pairwise Comparisons ───────────────────────────────────────
function formatEmmeansPairwise(data: any, resultJson: ResultJson) {
    if (!data.emmeans_pairwise) return;

    Object.entries(data.emmeans_pairwise).forEach(([factor, rows]: [string, any]) => {
        const list = Array.isArray(rows) ? rows : [];
        const measures = [...new Set(list.map((r: any) => r.dependent_variable))];
        const multiMeasure = measures.length > 1;
        const adjustment = list[0]?.adjustment ?? "";
        const table: Table = {
            key: `emmeans_pairwise_${factor}`,
            title: "Pairwise Comparisons",
            columnHeaders: [
                ...(multiMeasure ? [{ header: "Measure", key: "measure" }] : []),
                { header: `(I) ${factor}`, key: "level_i" },
                { header: `(J) ${factor}`, key: "level_j" },
                { header: "Mean Difference (I-J)", key: "diff" },
                { header: "Std. Error", key: "se" },
                { header: "Sig.", key: "sig" },
                {
                    header: "95% Confidence Interval for Difference",
                    children: [
                        { header: "Lower Bound", key: "ci_lower" },
                        { header: "Upper Bound", key: "ci_upper" },
                    ],
                },
            ],
            rows: [],
            note: `Based on estimated marginal means. Adjustment for multiple comparisons: ${adjustment}.${multiMeasure ? "" : ` Measure: ${measures[0] ?? ""}`}`,
            interpretation: "Pairwise comparisons of the estimated marginal means of the factor.",
        };

        list.forEach((r: any, idx: number) => {
            const newGroup = idx === 0 || list[idx - 1].level_i !== r.level_i || list[idx - 1].dependent_variable !== r.dependent_variable;
            table.rows.push({
                rowHeader: [],
                ...(multiMeasure ? { measure: newGroup ? r.dependent_variable : "" } : {}),
                level_i: newGroup ? r.level_i : "",
                level_j: r.level_j,
                diff: formatDisplayNumber(r.mean_difference),
                se: formatDisplayNumber(r.std_error),
                sig: formatSig(r.significance),
                ci_lower: formatDisplayNumber(r.confidence_interval?.lower_bound),
                ci_upper: formatDisplayNumber(r.confidence_interval?.upper_bound),
            });
        });

        resultJson.tables.push(table);
    });
}

// ── 16. Errors ────────────────────────────────────────────────────────────────
function formatErrors(errors: string[], resultJson: ResultJson) {
    if (!errors || errors.length === 0) return;

    if (errors.length === 1 && errors[0] === "No errors occurred.") {
        resultJson.tables.push({
            key: "error_table",
            title: "Errors Logs",
            columnHeaders: [{ header: "Message", key: "message" }],
            rows: [{ rowHeader: [], message: "No errors occurred." }],
            interpretation: "Errors logs from the analysis.",
        });
        return;
    }

    const table: Table = {
        key: "error_table",
        title: "Errors Logs",
        columnHeaders: [
            { header: "Context", key: "context" },
            { header: "Message", key: "message" },
        ],
        rows: [],
        interpretation: "Errors logs from the analysis.",
    };

    let currentContext = "";
    let isFirstRowForContext = true;

    const errorLines =
        errors[0] === "Error Summary:" ? errors.slice(1) : errors;

    errorLines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("Context: ")) {
            currentContext = trimmed.replace("Context: ", "").trim();
            isFirstRowForContext = true;
        } else if (trimmed) {
            const message = trimmed.replace(/^\d+\.\s*/, "");
            table.rows.push({
                rowHeader: [],
                context: isFirstRowForContext ? currentContext : "",
                message,
            });
            isFirstRowForContext = false;
        }
    });

    resultJson.tables.push(table);
}
