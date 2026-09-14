import type { ResultJson, Row, Table } from "@/types/Table";
import { formatDisplayNumber, formatSig } from "@/hooks/useFormatter";

export type MultivariateFormatterOptions = {
    testValues?: number[] | null;
    varianceMode?: "Pooled" | "Welch" | null;
    factor?: string | null;
    /** When set, the analysis ran in paired Hotelling T² mode. The formatter
     *  uses this to relabel the Intercept effect, rewrite synthetic diff
     *  variable names back to "v1 − v2" form, and adjust interpretation
     *  copy to match Modul 4A APG STIS conventions. */
    pairedMode?: {
        pairs: [string, string][];
        delta0: number[];
    } | null;
    /** When a non-"none" contrast method is selected, the formatter emits the
     *  SPSS-style Custom Hypothesis Tests output: K-Matrix (Contrast Results),
     *  Multivariate Test Results, and Univariate Test Results. */
    contrastInfo?: {
        factor: string;
        method: string;
        first: boolean;
    } | null;
    /** Sum-of-Squares method the user picked in the Model dialog
     *  ("typeI" | "typeII" | "typeIII" | "typeIV"). Drives the column header
     *  of the Tests of Between-Subjects Effects table — SPSS prints
     *  "Type I Sum of Squares" / "Type III Sum of Squares" etc. so the user
     *  can confirm at a glance which decomposition is being shown. */
    sumOfSquareMethod?: string | null;
    /** Name → user-defined label map for the dependent variables in the
     *  analysis. SPSS displays the variable LABEL ("ultimate torque")
     *  wherever a DV appears in output; without this map Statify falls
     *  back to the raw NAME ("Y1A1"), which looks alien next to the
     *  reference SPSS output. */
    variableLabels?: Record<string, string> | null;
    /** DV names in the order the user dragged them into the dialog. The
     *  Rust HashMap iteration order is non-deterministic and the formatter
     *  previously sorted alphabetically, which made the Descriptive
     *  Statistics block read "disp / hp / mpg / wt" even when the user
     *  picked "mpg / disp / hp / wt". Tables that group rows by DV
     *  (Descriptive Statistics, Parameter Estimates) honor this order to
     *  match the user's mental model and SPSS's behavior. */
    depVarOrder?: string[] | null;
};

const sumOfSquaresLabel = (method?: string | null): string => {
    const m = (method ?? "typeIII").toLowerCase();
    if (m === "typei" || m === "type1") return "Type I Sum of Squares";
    if (m === "typeii" || m === "type2") return "Type II Sum of Squares";
    if (m === "typeiv" || m === "type4") return "Type IV Sum of Squares";
    return "Type III Sum of Squares";
};

// ── Student-t helpers (self-contained — no jstat import needed) ───────────────
function _lnGamma(x: number): number {
    const c = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5,
    ];
    let y = x;
    const t = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
    let sum = 1.000000000190015;
    for (let i = 0; i < 6; i++) sum += c[i] / ++y;
    return -t + Math.log((2.5066282746310005 * sum) / x);
}

function _regIncBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    if (x > (a + 1) / (a + b + 2)) return 1 - _regIncBeta(1 - x, b, a);
    const lbeta = _lnGamma(a) + _lnGamma(b) - _lnGamma(a + b);
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;
    const EPS = 1e-15;
    const FPMIN = 1e-300;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 200; m++) {
        const m2 = 2 * m;
        let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        h *= d * c;
        aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < EPS) break;
    }
    return front * h;
}

function studentTPValueTwoSided(t: number, df: number): number {
    if (!Number.isFinite(t) || df <= 0) return NaN;
    const absT = Math.abs(t);
    const x = df / (df + absT * absT);
    return _regIncBeta(x, df / 2, 0.5);
}

function studentTCriticalTwoSided(alpha: number, df: number): number {
    if (df <= 0 || alpha <= 0 || alpha >= 1) return NaN;
    let lo = 0;
    let hi = 100;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const p = studentTPValueTwoSided(mid, df);
        if (p < alpha) hi = mid;
        else lo = mid;
        if (hi - lo < 1e-10) break;
    }
    return (lo + hi) / 2;
}

// ── Contrast row generator ────────────────────────────────────────────────────
type ContrastRow = { label: string; coefficients: number[] };

/** Build the L-matrix rows (excluding the intercept column) for a given SPSS
 *  contrast method. Returned coefficients are aligned with `levels`. */
function generateContrastRows(
    method: string,
    levels: string[],
    first: boolean
): ContrastRow[] {
    const k = levels.length;
    if (k < 2) return [];
    const rows: ContrastRow[] = [];
    const m = method.toLowerCase();
    if (m === "difference") {
        for (let i = 1; i < k; i++) {
            const c = new Array(k).fill(0);
            for (let j = 0; j < i; j++) c[j] = -1 / i;
            c[i] = 1;
            const lbl =
                i === 1
                    ? `Level ${i + 1} vs. Level ${i}`
                    : `Level ${i + 1} vs. Previous`;
            rows.push({ label: lbl, coefficients: c });
        }
    } else if (m === "simple") {
        const refIdx = first ? 0 : k - 1;
        for (let i = 0; i < k; i++) {
            if (i === refIdx) continue;
            const c = new Array(k).fill(0);
            c[refIdx] = -1;
            c[i] = 1;
            rows.push({
                label: `Level ${i + 1} vs. Level ${refIdx + 1}`,
                coefficients: c,
            });
        }
    } else if (m === "repeated") {
        for (let i = 0; i < k - 1; i++) {
            const c = new Array(k).fill(0);
            c[i] = 1;
            c[i + 1] = -1;
            rows.push({
                label: `Level ${i + 1} vs. Level ${i + 2}`,
                coefficients: c,
            });
        }
    } else if (m === "deviation") {
        const refIdx = first ? 0 : k - 1;
        for (let i = 0; i < k; i++) {
            if (i === refIdx) continue;
            const c = new Array(k).fill(-1 / k);
            c[i] = (k - 1) / k;
            rows.push({
                label: `Level ${i + 1} vs. Mean`,
                coefficients: c,
            });
        }
    } else if (m === "helmert") {
        for (let i = 0; i < k - 1; i++) {
            const c = new Array(k).fill(0);
            c[i] = 1;
            const w = -1 / (k - i - 1);
            for (let j = i + 1; j < k; j++) c[j] = w;
            rows.push({
                label: `Level ${i + 1} vs. Subsequent`,
                coefficients: c,
            });
        }
    }
    return rows;
}

// Resolves a Dependent Variable identifier for display:
//   1. If paired mode synthesised a "d_v1_minus_v2" column, render as "v1 − v2".
//   2. If the user attached a label to the underlying variable (the
//      `variableLabels` map carries name → label pairs from useVariableStore),
//      render the label. SPSS shows "ultimate torque" instead of "y1" in
//      every table this way.
//   3. Otherwise fall back to the raw name.
function makeDvDisplayMap(
    pairedMode: MultivariateFormatterOptions["pairedMode"],
    variableLabels: Record<string, string> | null | undefined
): (name: string) => string {
    const diffMap = new Map<string, string>();
    if (pairedMode && pairedMode.pairs.length > 0) {
        pairedMode.pairs.forEach(([v1, v2]) => {
            diffMap.set(`d_${v1}_minus_${v2}`, `${v1} − ${v2}`);
        });
    }
    return (name) => {
        if (diffMap.has(name)) return diffMap.get(name)!;
        if (variableLabels && variableLabels[name]) return variableLabels[name];
        return name;
    };
}

// Order `[dvName, ...]` entries by the user's dialog selection order so
// per-DV tables (Descriptive Statistics, Parameter Estimates) read in the
// same sequence the user dragged variables in. Any DV present in the
// result but missing from the selection list is appended in numeric-aware
// alphabetical order so unexpected keys do not silently drop.
function orderEntriesByDvSelection<T>(
    entries: [string, T][],
    depVarOrder: string[] | null
): [string, T][] {
    if (!depVarOrder || depVarOrder.length === 0) {
        return [...entries].sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        );
    }
    const rank = new Map<string, number>();
    depVarOrder.forEach((name, idx) => rank.set(name, idx));
    const ranked = entries
        .filter(([k]) => rank.has(k))
        .sort(([a], [b]) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    const leftover = entries
        .filter(([k]) => !rank.has(k))
        .sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        );
    return [...ranked, ...leftover];
}

export function transformMultivariateResult(
    data: any,
    errors: string[] = [],
    options: MultivariateFormatterOptions = {}
): ResultJson {
    const resultJson: ResultJson = { tables: [] };

    if (!data) return resultJson;

    const pairedMode = options.pairedMode ?? null;
    const relabelDv = makeDvDisplayMap(pairedMode, options.variableLabels);

    const depVarOrder = options.depVarOrder ?? null;

    formatBetweenSubjectsFactors(data, resultJson);
    formatDescriptiveStatistics(data, resultJson, relabelDv, depVarOrder);
    formatBoxTest(data, resultJson);
    // Bartlett's Test of Sphericity belongs to Factor Analysis, not GLM Multivariate.
    // Kept computed in Rust for potential reuse by a future Factor Analysis module.
    // formatBartlettTest(data, resultJson);
    formatLeveneTest(data, resultJson, relabelDv);
    formatMultivariateTests(
        data,
        resultJson,
        options.testValues ?? null,
        options.varianceMode === "Welch" ? options.factor ?? null : null,
        pairedMode
    );
    formatTestsBetweenSubjectsEffects(
        data,
        resultJson,
        options.sumOfSquareMethod ?? null,
        relabelDv,
        depVarOrder
    );
    formatParameterEstimates(data, resultJson, relabelDv, depVarOrder);
    formatBetweenSubjectsSSCP(data, resultJson);
    formatResidualMatrix(data, resultJson);
    formatSSCPMatrix(data, resultJson);
    formatContrastCoefficients(data, resultJson);
    formatCustomHypothesisTests(data, resultJson, options.contrastInfo ?? null);
    formatGeneralEstimableFunction(data, resultJson);
    formatPosthocTests(data, resultJson, relabelDv);
    formatHomogeneousSubsets(data, resultJson, relabelDv);
    formatEmmeans(data, resultJson, relabelDv);
    formatSpreadVsLevel(data, resultJson);
    formatResidualPlots(data, resultJson, relabelDv);
    formatSavedVariables(data, resultJson);
    formatErrors(errors, resultJson);

    return resultJson;
}

// ── 1. Between-Subjects Factors ──────────────────────────────────────────────
function formatBetweenSubjectsFactors(data: any, resultJson: ResultJson) {
    if (!data.between_subjects_factors) return;

    const table: Table = {
        key: "between_subjects_factors",
        title: "Between-Subjects Factors",
        columnHeaders: [
            { header: "", key: "factor" },
            { header: "", key: "level" },
            { header: "Value Label", key: "value_label" },
            { header: "N", key: "n" },
        ],
        rows: [],
        interpretation:
            "This table displays the levels of each between-subjects factor and the number of cases (N) at each level. It provides a summary of the categorical structure of the data used in the analysis.",
    };

    // Sort factor entries alphabetically with numeric awareness so the
    // display order is deterministic (faktorA before faktorB), not whatever
    // the Rust HashMap iteration happened to yield (the screenshots showed
    // faktorB-first which confused users comparing side-by-side with SPSS).
    const sortedFactorEntries = Object.entries(
        data.between_subjects_factors
    ).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
    sortedFactorEntries.forEach(
        ([factorName, factorData]: [string, any]) => {
            const valueCounts: Record<string, number> = factorData.value_counts || {};
            const valueLabels: Record<string, string> = factorData.value_labels || {};
            const entries = Object.entries(valueCounts);
            entries.forEach(([levelValue, count], idx) => {
                table.rows.push({
                    rowHeader: [],
                    factor: idx === 0 ? factorName : "",
                    level: levelValue,
                    value_label: valueLabels[levelValue] ?? "",
                    n: String(count),
                });
            });
        }
    );

    // Suppress empty table — happens in paired mode (no FixFactor) or any
    // analysis where Rust emits the factors container but has no entries.
    if (table.rows.length === 0) return;
    resultJson.tables.push(table);
}

// ── 2. Descriptive Statistics ─────────────────────────────────────────────────
function formatDescriptiveStatistics(
    data: any,
    resultJson: ResultJson,
    relabelDiff: (name: string) => string = (n) => n,
    depVarOrder: string[] | null = null
) {
    if (!data.descriptive_statistics) return;

    // Prefer the user's selection order from the dialog when available so
    // the rows read "mpg / disp / hp / wt" in the same order the user
    // dragged them in. Fall back to alphabetical (numeric-aware) sort if
    // the order vector is missing or doesn't match the result keys —
    // that preserves the previous deterministic behavior for legacy paths.
    const entries = orderEntriesByDvSelection(
        Object.entries(data.descriptive_statistics) as [string, any][],
        depVarOrder
    );
    if (entries.length === 0) return;

    const hasData = entries.some(([, stat]: [string, any]) =>
        Array.isArray(stat.groups) && stat.groups.length > 0
    );
    if (!hasData) return;

    // Single combined table matching SPSS layout: DV | factor level | Mean | SD | N
    const table: Table = {
        key: "descriptive_statistics",
        title: "Descriptive Statistics",
        columnHeaders: [
            { header: "", key: "dv_name" },
            { header: "", key: "group_label" },
            { header: "Mean", key: "mean" },
            { header: "Std. Deviation", key: "std_deviation" },
            { header: "N", key: "n" },
        ],
        rows: [],
        interpretation:
            "This table displays the mean, standard deviation, and count (N) for each dependent variable, broken down by each level of the specified factors.",
    };

    entries.forEach(([dvName, stat]: [string, any]) => {
        const displayDvName = relabelDiff(dvName);
        const groups: any[] = stat.groups || [];
        groups.forEach((g: any, idx: number) => {
            if (g.stats) {
                table.rows.push({
                    rowHeader: [],
                    dv_name: idx === 0 ? displayDvName : "",
                    group_label: g.factor_value || "Total",
                    mean: formatDisplayNumber(g.stats.mean),
                    std_deviation: formatDisplayNumber(g.stats.std_deviation),
                    n: String(g.stats.n),
                });
            }
        });
    });

    if (table.rows.length > 0) {
        resultJson.tables.push(table);
    }
}

// ── 3. Box's M Test ───────────────────────────────────────────────────────────
function formatBoxTest(data: any, resultJson: ResultJson) {
    if (!data.box_test) return;

    const b = data.box_test;
    const table: Table = {
        key: "box_m_test",
        title: "Box's Test of Equality of Covariance Matrices",
        columnHeaders: [
            { header: "", key: "stat_label" },
            { header: "", key: "stat_value" },
        ],
        rows: [
            { rowHeader: [], stat_label: "Box's M", stat_value: formatDisplayNumber(b.box_m) },
            { rowHeader: [], stat_label: "F",       stat_value: formatDisplayNumber(b.f) },
            { rowHeader: [], stat_label: "df1",     stat_value: String(b.df1) },
            { rowHeader: [], stat_label: "df2",     stat_value: formatDisplayNumber(b.df2) },
            { rowHeader: [], stat_label: "Sig.",    stat_value: formatSig(b.significance) },
        ],
        note: b.description || "Tests the null hypothesis that the observed covariance matrices of the dependent variables are equal across groups.",
        interpretation:
            "Tests the assumption of homogeneity of covariance matrices across groups. A non-significant result (Sig. > .05) supports the multivariate assumption that the variance-covariance matrices are equal across groups.",
    };

    resultJson.tables.push(table);
}

// ── 4. Bartlett's Test ────────────────────────────────────────────────────────
function formatBartlettTest(data: any, resultJson: ResultJson) {
    if (!data.bartlett_test) return;

    const b = data.bartlett_test;
    const table: Table = {
        key: "bartlett_test",
        title: "Bartlett's Test of Sphericity",
        columnHeaders: [
            { header: "", key: "stat_label" },
            { header: "", key: "stat_value" },
        ],
        rows: [
            { rowHeader: [], stat_label: "Likelihood Ratio",   stat_value: formatDisplayNumber(b.likelihood_ratio) },
            { rowHeader: [], stat_label: "Approx. Chi-Square", stat_value: formatDisplayNumber(b.approx_chi_square) },
            { rowHeader: [], stat_label: "df",                 stat_value: String(b.df) },
            { rowHeader: [], stat_label: "Sig.",               stat_value: formatSig(b.significance) },
        ],
        note: b.description,
        interpretation:
            "Tests the sphericity of the residual covariance matrix. A significant result (Sig. < .05) indicates that the dependent variables are sufficiently correlated to justify a multivariate analysis.",
    };

    resultJson.tables.push(table);
}

// ── 5. Levene's Test ──────────────────────────────────────────────────────────
function formatLeveneTest(
    data: any,
    resultJson: ResultJson,
    relabelDv: (name: string) => string = (n) => n
) {
    if (!data.levene_test) return;

    const tests: any[] = Array.isArray(data.levene_test)
        ? data.levene_test
        : [data.levene_test];

    const hasData = tests.some((lt: any) =>
        Array.isArray(lt.levene) && lt.levene.length > 0
    );
    if (!hasData) return;

    // Single combined table matching SPSS layout: DV | basis | Levene Statistic | df1 | df2 | Sig.
    const table: Table = {
        key: "levene_test",
        title: "Levene's Test of Equality of Error Variances",
        columnHeaders: [
            { header: "", key: "dv_name" },
            { header: "", key: "function" },
            { header: "Levene Statistic", key: "levene_statistic" },
            { header: "df1", key: "df1" },
            { header: "df2", key: "df2" },
            { header: "Sig.", key: "significance" },
        ],
        rows: [],
        note: "Tests the null hypothesis that the error variance of the dependent variable is equal across groups.",
        interpretation:
            "Tests the assumption of homogeneity of variance. A non-significant result (Sig. > .05) supports the assumption that error variances are equal across groups.",
    };

    tests.forEach((lt: any) => {
        const leveneList: any[] = lt.levene || [];
        leveneList.forEach((entry: any, idx: number) => {
            const df2Raw = Number(entry.df2);
            const df2Str = Number.isInteger(df2Raw)
                ? String(df2Raw)
                : formatDisplayNumber(df2Raw);
            table.rows.push({
                rowHeader: [],
                dv_name: idx === 0 ? relabelDv(lt.dependent_variable) : "",
                function: entry.test_basis || entry.function || "Mean",
                levene_statistic: formatDisplayNumber(entry.levene_statistic),
                df1: String(entry.df1),
                df2: df2Str,
                significance: formatSig(entry.significance),
            });
        });
    });

    if (table.rows.length > 0) {
        resultJson.tables.push(table);
    }
}
// ── 6. Multivariate Tests (Pillai / Wilks / Hotelling / Roy) ─────────────────
function formatMultivariateTests(
    data: any,
    resultJson: ResultJson,
    testValues: number[] | null,
    welchFactor: string | null,
    pairedMode: MultivariateFormatterOptions["pairedMode"] = null
) {
    if (!data.multivariate_tests) return;

    const mt = data.multivariate_tests;
    const effects: Record<string, Record<string, any>> = mt.effects || {};

    // Paired Hotelling T² runs the Test Values pipeline against the difference
    // vector, so `testValues` is also set in this mode. Detect paired first to
    // pick the right Intercept label and interpretation copy.
    const pairedActive = (pairedMode?.pairs?.length ?? 0) > 0;

    // Hotelling T² one-population mode: when the user supplied a μ₀ vector
    // (even an explicit zero vector), relabel the Intercept effect and
    // surface an extra T² column derived from Hotelling-Lawley trace.
    const hotellingT2Mode = testValues !== null;
    const interceptLabel = pairedActive
        ? "Hotelling T² Berpasangan"
        : hotellingT2Mode
        ? "Hotelling T² (vs μ₀)"
        : "Intercept";

    // Welch-Satterthwaite two-sample mode: Rust already replaces the factor
    // entry with a single Hotelling's Trace whose `value` holds T² directly.
    const welchMode = welchFactor !== null;

    const showTSquaredColumn = hotellingT2Mode || welchMode;
    const columnHeaders = [
        { header: "Effect", key: "effect" },
        { header: "", key: "test_name" },
        { header: "Value", key: "value" },
        { header: "F", key: "f" },
        { header: "Hypothesis df", key: "hypothesis_df" },
        { header: "Error df", key: "error_df" },
        { header: "Sig.", key: "significance" },
        { header: "Partial Eta Squared", key: "partial_eta_squared" },
        { header: "Noncent. Parameter", key: "noncent_parameter" },
        { header: "Observed Power", key: "observed_power" },
    ];
    if (showTSquaredColumn) {
        columnHeaders.splice(2, 0, { header: "T²", key: "t_squared" });
    }

    let interpretation: string;
    if (pairedActive) {
        interpretation =
            "Paired Hotelling's T² tests H₀: δ = δ₀ on the difference vector d = M1 − M2. T² = n · (d̄ − δ₀)ᵀ Sd⁻¹ (d̄ − δ₀), and F = ((n − p) / (p(n − 1))) · T² ~ F(p, n − p). Reject H₀ when Sig. < α.";
    } else if (welchMode) {
        interpretation = `Two-Sample Hotelling's T² under unequal covariances Σ₁ ≠ Σ₂ (Welch-Satterthwaite). T² = dᵀV⁻¹d with V = S₁/n₁ + S₂/n₂; F = ((ν − p + 1)/(pν))·T² ~ F(p, ν − p + 1) where ν is the Krishnamoorthy-Yu degrees of freedom. Reject H₀: μ₁ = μ₂ when Sig. < α.`;
    } else if (hotellingT2Mode) {
        interpretation =
            "One-Sample Hotelling's T² tests H₀: μ = μ₀. For the intercept-only model (no between-subjects factors), T² = (n − 1) × Hotelling's Trace, and F = ((n − p) / (p(n − 1))) · T² ~ F(p, n − p). Reject H₀ when Sig. < α.";
    } else {
        interpretation =
            "Tests the joint effect of each predictor on the combined dependent variables using four multivariate statistics (Pillai's Trace, Wilks' Lambda, Hotelling's Trace, Roy's Largest Root). A significant Sig. (< .05) indicates that the effect significantly influences the joint distribution of the dependent variables.";
    }

    let tableNote: string | undefined;
    if (pairedActive && pairedMode) {
        const pairList = pairedMode.pairs
            .map(([v1, v2], i) => `d${i + 1} = ${v1} − ${v2}`)
            .join("; ");
        const delta0Str = `[${pairedMode.delta0
            .map((v) => Number(v.toFixed(4)).toString())
            .join(", ")}]`;
        tableNote = `Analisis dilakukan pada vektor selisih ${pairList}. δ₀ = ${delta0Str}.`;
    } else if (welchMode) {
        tableNote = `${mt.design ?? ""} — Computed using Welch-Satterthwaite approximation for unequal covariance matrices.`;
    } else {
        tableNote = mt.design;
    }

    const table: Table = {
        key: "multivariate_tests",
        title: pairedActive
            ? "Multivariate Tests — Hotelling T² Berpasangan"
            : "Multivariate Tests",
        columnHeaders,
        rows: [],
        note: tableNote,
        interpretation,
    };

    const testOrder = [
        "Pillai's Trace",
        "Wilks' Lambda",
        "Hotelling's Trace",
        "Roy's Largest Root",
    ];

    // Order effects to match SPSS Multivariate Tests layout:
    //   Intercept → main effects (alphabetical) → 2-way interactions →
    //   3-way interactions → … (alphabetical within the same order).
    // Without this sort the iteration order is whatever the Rust HashMap
    // yields, which can look random (faktorA → faktorA*faktorB → faktorB →
    // Intercept on the Posten dataset) and confuses users when comparing
    // side-by-side with SPSS output.
    const effectOrderRank = (name: string): number => {
        if (name === "Intercept") return 0;
        const parts = name.split("*").map((p) => p.trim()).filter(Boolean);
        // Main effect = 1 part, 2-way = 2 parts, …
        return 10 + (parts.length - 1) * 1000;
    };
    const orderedEffectEntries = Object.entries(effects).sort(
        ([a], [b]) => {
            const oa = effectOrderRank(a);
            const ob = effectOrderRank(b);
            if (oa !== ob) return oa - ob;
            return a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: "base",
            });
        }
    );
    orderedEffectEntries.forEach(([effectName, testMap]: [string, any]) => {
        const isWelchEffect = welchMode && effectName === welchFactor;

        let displayedEffectName: string;
        if (effectName === "Intercept") {
            displayedEffectName = interceptLabel;
        } else if (isWelchEffect) {
            displayedEffectName = `${effectName} — Welch-Satterthwaite`;
        } else {
            displayedEffectName = effectName;
        }

        // Two T² derivations:
        //   • One-population (hotellingT2Mode, Intercept): T² = (n − 1) · hotelling_trace
        //   • Welch two-sample (factor entry): T² is stored directly in `value`.
        let tSquared: number | null = null;
        if (hotellingT2Mode && effectName === "Intercept") {
            const hotelling = testMap["Hotelling's Trace"];
            if (hotelling) {
                const n =
                    Number(hotelling.error_df) +
                    Number(hotelling.hypothesis_df);
                if (Number.isFinite(n) && n > 1) {
                    tSquared = Number(hotelling.value) * (n - 1);
                }
            }
        } else if (isWelchEffect) {
            const hotelling = testMap["Hotelling's Trace"];
            if (hotelling && Number.isFinite(Number(hotelling.value))) {
                tSquared = Number(hotelling.value);
            }
        }

        // In Welch mode, the factor row only emits Hotelling's Trace —
        // Pillai/Wilks/Roy are undefined under unequal covariance and Rust
        // omits them. We must not synthesise blank rows.
        const order = isWelchEffect ? ["Hotelling's Trace"] : testOrder;

        let isFirstRow = true;
        order.forEach((testName) => {
            const entry = testMap[testName];
            if (!entry) return;

            const row: Row = {
                rowHeader: [],
                effect: isFirstRow ? displayedEffectName : "",
                test_name: testName,
                value: formatDisplayNumber(entry.value),
                f: formatDisplayNumber(entry.f),
                hypothesis_df: formatDisplayNumber(entry.hypothesis_df),
                error_df: formatDisplayNumber(entry.error_df),
                significance: formatSig(entry.significance),
                partial_eta_squared: formatDisplayNumber(entry.partial_eta_squared),
                noncent_parameter: formatDisplayNumber(entry.noncent_parameter),
                observed_power: formatDisplayNumber(entry.observed_power),
            };
            if (showTSquaredColumn) {
                row.t_squared =
                    testName === "Hotelling's Trace" && tSquared !== null
                        ? formatDisplayNumber(tSquared)
                        : "";
            }
            table.rows.push(row);
            isFirstRow = false;
        });
    });

    resultJson.tables.push(table);
}

// ── 7. Tests of Between-Subjects Effects ─────────────────────────────────────
function formatTestsBetweenSubjectsEffects(
    data: any,
    resultJson: ResultJson,
    sumOfSquareMethod: string | null,
    relabelDv: (name: string) => string = (n) => n,
    depVarOrder: string[] | null = null
) {
    if (!data.tests_of_between_subjects_effects) return;

    const tbs = data.tests_of_between_subjects_effects;
    // Structure from Rust: effects: { [dvName]: { [sourceName]: entry } }
    const effects: Record<string, Record<string, any>> = tbs.effects || {};

    // Order DV names by the user's dialog selection so this table groups
    // rows in the same sequence as Descriptive Statistics and Parameter
    // Estimates. Falls back to alphanumeric sort when depVarOrder is
    // unavailable (legacy paths).
    const dvNames: string[] = orderEntriesByDvSelection(
        Object.keys(effects).map((k) => [k, null] as [string, null]),
        depVarOrder
    ).map(([k]) => k);

    // Source names are the inner keys; collect across all DVs preserving order.
    const sourceNames: string[] = [];
    const seenSrc = new Set<string>();
    dvNames.forEach((dv) => {
        Object.keys(effects[dv] || {}).forEach((src) => {
            if (!seenSrc.has(src)) {
                seenSrc.add(src);
                sourceNames.push(src);
            }
        });
    });

    // Order sources to match SPSS canonical layout:
    //   Corrected Model → Intercept → [main effects in entry order] →
    //   [interactions by ascending order: 2-way before 3-way, alphabetical
    //   within the same order] → Error → Total → Corrected Total.
    //
    // The previous comparator collapsed every factor + interaction into a
    // single bucket (return 2), so the within-bucket order was whatever
    // Rust HashMap iteration happened to yield. For Posten 2×4 that
    // produced faktorB → faktorA*faktorB → faktorA, which doesn't match
    // SPSS's faktorA → faktorB → faktorA*faktorB.
    const sourceOrder = (name: string): number => {
        const n = name.toLowerCase();
        if (n === "corrected model") return 0;
        if (n === "intercept") return 1;
        if (n === "error") return 1_000_000;
        if (n === "total") return 1_000_001;
        if (n === "corrected total") return 1_000_002;
        // Interaction terms: "*" separator counts the order (k-way).
        // Sort all 2-way after every main effect, all 3-way after every 2-way, etc.
        const parts = name.split("*").map((p) => p.trim()).filter(Boolean);
        return 10 + (parts.length - 1) * 1000;
    };
    sourceNames.sort((a, b) => {
        const oa = sourceOrder(a);
        const ob = sourceOrder(b);
        if (oa !== ob) return oa - ob;
        // Within the same order bucket (main effects together, 2-way
        // interactions together, …) sort lexicographically. For users
        // who entered faktorA before faktorB in the dialog, "faktorA" <
        // "faktorB" by string comparison, so this also reproduces the
        // SPSS dialog-entry order in practice.
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });

    // Synthesize "Total" source (uncorrected): SS_total = SS_intercept + SS_corrected_total,
    // df_total = df_corrected_total + 1. Rust currently doesn't compute it.
    const totalEntries: Record<string, { sum_of_squares: number; df: number }> = {};
    dvNames.forEach((dv) => {
        const intercept = effects[dv]?.["Intercept"];
        const correctedTotal = effects[dv]?.["Corrected Total"];
        if (intercept && correctedTotal) {
            totalEntries[dv] = {
                sum_of_squares:
                    (intercept.sum_of_squares ?? 0) +
                    (correctedTotal.sum_of_squares ?? 0),
                df: (correctedTotal.df ?? 0) + 1,
            };
        }
    });
    if (Object.keys(totalEntries).length > 0 && !seenSrc.has("Total")) {
        const ctIdx = sourceNames.indexOf("Corrected Total");
        if (ctIdx >= 0) {
            sourceNames.splice(ctIdx, 0, "Total");
        } else {
            sourceNames.push("Total");
        }
    }

    // Build R Squared footnote for each DV (matches SPSS a/b/c suffixes).
    const noteLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const noteLines: string[] = [];
    dvNames.forEach((dvName, idx) => {
        const rSq = tbs.r_squared?.[dvName];
        const adjRSq = tbs.adjusted_r_squared?.[dvName];
        if (rSq === undefined && adjRSq === undefined) return;
        const letter = noteLetters[idx] || "";
        const parts: string[] = [];
        if (rSq !== undefined) parts.push(`R Squared = ${formatDisplayNumber(rSq)}`);
        if (adjRSq !== undefined)
            parts.push(`(Adjusted R Squared = ${formatDisplayNumber(adjRSq)})`);
        noteLines.push(
            `${letter ? letter + ". " : ""}${parts.join(" ")} — ${relabelDv(dvName)}`
        );
    });

    const table: Table = {
        key: "tests_between_subjects_effects",
        title: "Tests of Between-Subjects Effects",
        columnHeaders: [
            { header: "Source", key: "source" },
            { header: "Dependent Variable", key: "dependent_variable" },
            { header: sumOfSquaresLabel(sumOfSquareMethod), key: "sum_of_squares" },
            { header: "df", key: "df" },
            { header: "Mean Square", key: "mean_square" },
            { header: "F", key: "f_value" },
            { header: "Sig.", key: "significance" },
            { header: "Partial Eta Squared", key: "partial_eta_squared" },
            { header: "Noncent. Parameter", key: "noncent_parameter" },
            { header: "Observed Power", key: "observed_power" },
        ],
        rows: [],
        note: noteLines.join("\n"),
        interpretation:
            "This table tests the hypothesis that each effect (e.g., factor or interaction) in the model is null. A significant F-value (Sig. < .05) suggests that the effect significantly contributes to explaining the variance in the dependent variable. The Partial Eta Squared indicates the proportion of variance uniquely explained by that effect.",
    };

    sourceNames.forEach((sourceName) => {
        const lower = sourceName.toLowerCase();
        // SPSS leaves these stats blank for Error, Total, and Corrected Total.
        const blankInferential =
            lower === "error" || lower === "total" || lower === "corrected total";
        // Mean Square is also blank for Total and Corrected Total (but shown for Error).
        const blankMeanSquare = lower === "total" || lower === "corrected total";

        dvNames.forEach((dvName, dvIdx) => {
            const entry =
                sourceName === "Total"
                    ? totalEntries[dvName]
                    : effects[dvName]?.[sourceName];
            if (!entry) return;
            table.rows.push({
                rowHeader: [],
                // Show source label only on the first DV row of the group (SPSS merges).
                source: dvIdx === 0 ? sourceName : "",
                dependent_variable: relabelDv(dvName),
                sum_of_squares: formatDisplayNumber(entry.sum_of_squares),
                df: entry.df !== undefined && entry.df !== null ? String(entry.df) : "",
                mean_square: blankMeanSquare ? "" : formatDisplayNumber(entry.mean_square),
                f_value: blankInferential ? "" : formatDisplayNumber(entry.f_value),
                significance: blankInferential ? "" : formatSig(entry.significance),
                partial_eta_squared: blankInferential
                    ? ""
                    : formatDisplayNumber(entry.partial_eta_squared),
                noncent_parameter: blankInferential
                    ? ""
                    : formatDisplayNumber(entry.noncent_parameter),
                observed_power: blankInferential
                    ? ""
                    : formatDisplayNumber(entry.observed_power),
            });
        });
    });

    resultJson.tables.push(table);
}

// ── 8. Parameter Estimates ────────────────────────────────────────────────────
// One combined table keyed by `parameter_estimates_combined` with the
// Dependent Variable column at position 0, matching the post-Multiple-
// Comparisons convention. The DV column collapses to "" for non-first
// rows of each block so the table reads like SPSS's multi-DV print-out.
// Output-layer (multivariate-analysis-output.ts) emits ONE "Parameter
// Estimates" parent navbar entry with per-DV children — both children
// render this same combined table; the subnavbar serves as a TOC for the
// DV blocks.
function formatParameterEstimates(
    data: any,
    resultJson: ResultJson,
    relabelDv: (name: string) => string = (n) => n,
    depVarOrder: string[] | null = null
) {
    if (!data.parameter_estimates) return;

    const pe = data.parameter_estimates;
    const estimates: Record<string, any[]> = pe.estimates || {};
    const orderedEntries = orderEntriesByDvSelection(
        Object.entries(estimates) as [string, any[]][],
        depVarOrder
    );
    if (orderedEntries.length === 0) return;

    const table: Table = {
        key: "parameter_estimates_combined",
        title: "Parameter Estimates",
        columnHeaders: [
            { header: "Dependent Variable", key: "dv_name" },
            { header: "Parameter", key: "parameter" },
            { header: "B", key: "b" },
            { header: "Std. Error", key: "std_error" },
            { header: "t", key: "t_value" },
            { header: "Sig.", key: "significance" },
            {
                header: "95% Confidence Interval",
                children: [
                    { header: "Lower Bound", key: "ci_lower" },
                    { header: "Upper Bound", key: "ci_upper" },
                ],
            },
            { header: "Partial Eta Squared", key: "partial_eta_squared" },
            { header: "Noncent. Parameter", key: "noncent_parameter" },
            { header: "Observed Power", key: "observed_power" },
        ],
        rows: [],
        interpretation:
            "Displays the regression coefficient (B), standard error, t-statistic, significance, and 95% confidence interval for each model parameter, grouped by dependent variable. A significant Sig. (< .05) indicates that the parameter contributes significantly to predicting the dependent variable.",
    };

    orderedEntries.forEach(([dvName, entries]: [string, any[]]) => {
        const displayDvName = relabelDv(dvName);
        entries.forEach((entry: any, idx: number) => {
            table.rows.push({
                rowHeader: [],
                dv_name: idx === 0 ? displayDvName : "",
                parameter: entry.parameter,
                b: formatDisplayNumber(entry.b),
                std_error: formatDisplayNumber(entry.std_error),
                t_value: formatDisplayNumber(entry.t_value),
                significance: formatSig(entry.significance),
                ci_lower: formatDisplayNumber(entry.confidence_interval?.lower_bound),
                ci_upper: formatDisplayNumber(entry.confidence_interval?.upper_bound),
                partial_eta_squared: entry.partial_eta_squared !== null
                    ? formatDisplayNumber(entry.partial_eta_squared)
                    : "",
                noncent_parameter: entry.noncent_parameter !== null
                    ? formatDisplayNumber(entry.noncent_parameter)
                    : "",
                observed_power: entry.observed_power !== null
                    ? formatDisplayNumber(entry.observed_power)
                    : "",
            });
        });
    });

    if (table.rows.length > 0) {
        resultJson.tables.push(table);
    }
}

// ── 9. Between-Subjects SSCP ──────────────────────────────────────────────────
function formatBetweenSubjectsSSCP(data: any, resultJson: ResultJson) {
    if (!data.between_subjects_sscp) return;

    const sscp = data.between_subjects_sscp;
    const matrices: Record<string, any> = sscp.matrices || {};

    Object.entries(matrices).forEach(([termName, matrixData]: [string, any]) => {
        const values: Record<string, Record<string, number>> = matrixData.values || {};
        const dvNames = Object.keys(values);

        const table: Table = {
            key: `between_subjects_sscp_${termName}`,
            title: `Between-Subjects SSCP Matrix — ${termName}`,
            columnHeaders: [
                { header: "", key: "row_dv" },
                ...dvNames.map((dv) => ({ header: dv, key: `col_${dv}` })),
            ],
            rows: [],
            note: sscp.based_on,
            interpretation:
                "Sums-of-squares-and-cross-products (SSCP) matrix for the specified effect. Diagonal entries are sums of squares; off-diagonal entries are cross-products between dependent variables. These matrices form the basis of the multivariate test statistics.",
        };

        dvNames.forEach((rowDv) => {
            const row: Row = { rowHeader: [], row_dv: rowDv };
            dvNames.forEach((colDv) => {
                row[`col_${colDv}`] = formatDisplayNumber(values[rowDv]?.[colDv]);
            });
            table.rows.push(row);
        });

        resultJson.tables.push(table);
    });
}

// ── 10. Residual SSCP Matrix ──────────────────────────────────────────────────
function formatResidualMatrix(data: any, resultJson: ResultJson) {
    if (!data.residual_matrix) return;

    const rm = data.residual_matrix;
    const values: Record<string, Record<string, number>> = rm.values || {};
    const dvNames = Object.keys(values);

    const table: Table = {
        key: "residual_sscp_matrix",
        title: "Residual SSCP Matrix",
        columnHeaders: [
            { header: "", key: "row_dv" },
            ...dvNames.map((dv) => ({ header: dv, key: `col_${dv}` })),
        ],
        rows: [],
        note: rm.description,
        interpretation:
            "Sums-of-squares-and-cross-products matrix of the residuals (the E matrix). It serves as the error term for multivariate test statistics and provides the basis for examining correlations among the dependent variables after fitting the model.",
    };

    dvNames.forEach((rowDv) => {
        const row: Row = { rowHeader: [], row_dv: rowDv };
        dvNames.forEach((colDv) => {
            row[`col_${colDv}`] = formatDisplayNumber(values[rowDv]?.[colDv]);
        });
        table.rows.push(row);
    });

    resultJson.tables.push(table);
}

// ── 11. SSCP Matrix ───────────────────────────────────────────────────────────
function formatSSCPMatrix(data: any, resultJson: ResultJson) {
    if (!data.sscp_matrix) return;

    const sscp = data.sscp_matrix;
    const categories: Record<string, Record<string, Record<string, number>>> =
        sscp.categories || {};

    Object.entries(categories).forEach(([categoryName, matrixData]: [string, any]) => {
        const dvNames = Object.keys(matrixData);

        const table: Table = {
            key: `sscp_matrix_${categoryName}`,
            title: `SSCP Matrix — ${categoryName}`,
            columnHeaders: [
                { header: "", key: "row_dv" },
                ...dvNames.map((dv) => ({ header: dv, key: `col_${dv}` })),
            ],
            rows: [],
            interpretation:
                "Sums-of-squares-and-cross-products matrix per effect category, showing how the variability for that effect is distributed across and between the dependent variables.",
        };

        dvNames.forEach((rowDv) => {
            const row: Row = { rowHeader: [], row_dv: rowDv };
            dvNames.forEach((colDv) => {
                row[`col_${colDv}`] = formatDisplayNumber(matrixData[rowDv]?.[colDv]);
            });
            table.rows.push(row);
        });

        resultJson.tables.push(table);
    });
}

// ── 12. Contrast Coefficients ─────────────────────────────────────────────────
function formatContrastCoefficients(data: any, resultJson: ResultJson) {
    if (!data.contrast_coefficients) return;

    const cc = data.contrast_coefficients;
    const table: Table = {
        key: "contrast_coefficients",
        title: "Contrast Coefficients",
        columnHeaders: [
            { header: "Parameter", key: "parameter" },
            { header: "Coefficient", key: "coefficient" },
        ],
        rows: [],
        interpretation:
            "This matrix provides the coefficients for the linear combinations of model parameters that form the basis for testing the hypothesis for the chosen contrast. Each row corresponds to a specific contrast.",
    };

    const params: string[] = cc.parameter || [];
    const coefficients: number[] = cc.coefficients || [];
    params.forEach((param: string, idx: number) => {
        table.rows.push({
            rowHeader: [],
            parameter: param,
            coefficient: formatDisplayNumber(coefficients[idx]),
        });
    });

    if (table.rows.length > 0) resultJson.tables.push(table);
}

// ── 12b. Custom Hypothesis Tests (K-Matrix, Multivariate, Univariate) ────────
// `serde_wasm_bindgen` returns Rust HashMaps as either plain Objects or `Map`
// instances depending on the serializer config (and on nested depth). The
// existing test helper has to handle both — so do we, defensively.
function getEntry(container: unknown, key: string): unknown {
    if (container === null || container === undefined) return undefined;
    if (container instanceof Map) return container.get(key);
    return (container as Record<string, unknown>)[key];
}
function getKeys(container: unknown): string[] {
    if (container === null || container === undefined) return [];
    if (container instanceof Map) return Array.from(container.keys()).map(String);
    return Object.keys(container as Record<string, unknown>);
}

// Collect the shared inputs once so the three tables stay numerically aligned.
type ContrastInputs = {
    factor: string;
    method: string;
    methodTitle: string;
    levels: string[];
    ns: number[];
    dvNames: string[];
    means: Record<string, number[]>; // means[dv][levelIdx]
    msError: Record<string, number>;
    errorDf: number;
    rows: ContrastRow[];
};

function gatherContrastInputs(
    data: any,
    contrastInfo: NonNullable<MultivariateFormatterOptions["contrastInfo"]>
): ContrastInputs | null {
    const factorData = getEntry(data.between_subjects_factors, contrastInfo.factor);
    if (!factorData) return null;
    const valueCounts = (factorData as any).value_counts;
    const levels = getKeys(valueCounts);
    if (levels.length < 2) return null;
    const ns = levels.map((l) => Number(getEntry(valueCounts, l)) || 0);

    const desc = data.descriptive_statistics;
    const dvNames = getKeys(desc).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
    if (dvNames.length === 0) return null;

    const means: Record<string, number[]> = {};
    dvNames.forEach((dv) => {
        const dvDesc = getEntry(desc, dv) as any;
        const groups: any[] = Array.isArray(dvDesc?.groups) ? dvDesc.groups : [];
        means[dv] = levels.map((lvl) => {
            const g = groups.find((g) => String(g.factor_value) === String(lvl));
            return g?.stats?.mean !== undefined ? Number(g.stats.mean) : NaN;
        });
    });

    const tbsEffects = data.tests_of_between_subjects_effects?.effects;
    const msError: Record<string, number> = {};
    let errorDf = 0;
    dvNames.forEach((dv) => {
        const err = getEntry(getEntry(tbsEffects, dv), "Error") as any;
        msError[dv] = err?.mean_square ?? NaN;
        if (err?.df !== undefined && err?.df !== null) errorDf = Number(err.df);
    });

    const rows = generateContrastRows(
        contrastInfo.method,
        levels,
        contrastInfo.first
    );
    if (rows.length === 0) return null;

    const methodTitle =
        contrastInfo.method.charAt(0).toUpperCase() +
        contrastInfo.method.slice(1).toLowerCase();

    return {
        factor: contrastInfo.factor,
        method: contrastInfo.method,
        methodTitle,
        levels,
        ns,
        dvNames,
        means,
        msError,
        errorDf,
        rows,
    };
}

/** Contrast Results (K Matrix) — per-DV estimate, SE, Sig., 95% CI. */
function formatContrastResultsKMatrix(
    inputs: ContrastInputs,
    resultJson: ResultJson
) {
    const { factor, methodTitle, dvNames, means, ns, msError, errorDf, rows } = inputs;
    const tCrit = errorDf > 0 ? studentTCriticalTwoSided(0.05, errorDf) : NaN;

    const table: Table = {
        key: "contrast_results_k_matrix",
        title: "Contrast Results (K Matrix)",
        columnHeaders: [
            { header: `${factor} ${methodTitle} Contrast`, key: "contrast_label" },
            { header: "", key: "stat_label" },
            {
                header: "Dependent Variable",
                children: dvNames.map((dv) => ({ header: dv, key: `dv_${dv}` })),
            },
        ],
        rows: [],
        interpretation:
            "K-Matrix table: for each user-specified contrast row, shows the per-DV contrast estimate (linear combination of group means), hypothesised value (0), standard error using pooled MSE, two-sided p-value from the Student-t distribution, and 95% confidence interval.",
    };

    rows.forEach((cr) => {
        const c = cr.coefficients;
        const estimates = dvNames.map((dv) =>
            c.reduce((s, ci, i) => s + ci * means[dv][i], 0)
        );
        const ses = dvNames.map((dv) => {
            const factorTerm = c.reduce(
                (s, ci, i) => s + (ci * ci) / (ns[i] || 1),
                0
            );
            const v = msError[dv] * factorTerm;
            return v > 0 ? Math.sqrt(v) : NaN;
        });
        const pVals = estimates.map((e, i) =>
            ses[i] > 0 && Number.isFinite(e)
                ? studentTPValueTwoSided(e / ses[i], errorDf)
                : NaN
        );
        const ciLower = estimates.map((e, i) =>
            Number.isFinite(tCrit) ? e - tCrit * ses[i] : NaN
        );
        const ciUpper = estimates.map((e, i) =>
            Number.isFinite(tCrit) ? e + tCrit * ses[i] : NaN
        );

        const block: Array<{ label: string; values: number[]; sig?: boolean }> = [
            { label: "Contrast Estimate", values: estimates },
            { label: "Hypothesized Value", values: dvNames.map(() => 0) },
            { label: "Difference (Estimate − Hypothesized)", values: estimates },
            { label: "Std. Error", values: ses },
            { label: "Sig.", values: pVals, sig: true },
            { label: "95% Confidence Interval — Lower Bound", values: ciLower },
            { label: "95% Confidence Interval — Upper Bound", values: ciUpper },
        ];

        block.forEach((b, bIdx) => {
            const row: Row = {
                rowHeader: [],
                contrast_label: bIdx === 0 ? cr.label : "",
                stat_label: b.label,
            };
            dvNames.forEach((dv, dvIdx) => {
                row[`dv_${dv}`] = b.sig
                    ? formatSig(b.values[dvIdx])
                    : formatDisplayNumber(b.values[dvIdx]);
            });
            table.rows.push(row);
        });
    });

    if (table.rows.length > 0) resultJson.tables.push(table);
}

/** Multivariate Test Results for the contrast — reuses the factor's
 *  Pillai/Wilks/Hotelling/Roy entries since the joint test of all k−1 contrast
 *  rows equals the factor's overall multivariate test. */
function formatContrastMultivariateTests(
    data: any,
    inputs: ContrastInputs,
    resultJson: ResultJson
) {
    const mt = data.multivariate_tests;
    if (!mt) return;
    const factorTests = getEntry(mt.effects, inputs.factor) as any;
    if (!factorTests) return;

    const table: Table = {
        key: "contrast_multivariate_tests",
        title: "Multivariate Test Results (Contrast)",
        columnHeaders: [
            { header: "", key: "test_name" },
            { header: "Value", key: "value" },
            { header: "F", key: "f" },
            { header: "Hypothesis df", key: "hypothesis_df" },
            { header: "Error df", key: "error_df" },
            { header: "Sig.", key: "significance" },
        ],
        rows: [],
        interpretation:
            "Multivariate test of the joint null hypothesis defined by all contrast rows for this factor. Equivalent to the factor's main multivariate test for between-subjects effects.",
    };

    const order: [string, string][] = [
        ["Pillai's Trace", "Pillai's trace"],
        ["Wilks' Lambda", "Wilks' lambda"],
        ["Hotelling's Trace", "Hotelling's trace"],
        ["Roy's Largest Root", "Roy's largest root"],
    ];
    order.forEach(([key, label]) => {
        const e = getEntry(factorTests, key) as any;
        if (!e) return;
        table.rows.push({
            rowHeader: [],
            test_name: label,
            value: formatDisplayNumber(e.value),
            f: formatDisplayNumber(e.f),
            hypothesis_df: formatDisplayNumber(e.hypothesis_df),
            error_df: formatDisplayNumber(e.error_df),
            significance: formatSig(e.significance),
        });
    });

    if (table.rows.length > 0) resultJson.tables.push(table);
}

/** Univariate Test Results for the contrast — per-DV SS_contrast, MS, F, Sig.
 *  Computed from group means + n + MSE so it handles k>2 contrast rows
 *  correctly (per-row SS adds up to SS_factor). */
function formatContrastUnivariateTests(
    data: any,
    inputs: ContrastInputs,
    resultJson: ResultJson
) {
    const { factor, dvNames, means, ns, msError, errorDf, rows } = inputs;

    const tbsEffects = data.tests_of_between_subjects_effects?.effects;

    const table: Table = {
        key: "contrast_univariate_tests",
        title: "Univariate Test Results (Contrast)",
        columnHeaders: [
            { header: "Source", key: "source" },
            { header: "Dependent Variable", key: "dependent_variable" },
            { header: "Sum of Squares", key: "sum_of_squares" },
            { header: "df", key: "df" },
            { header: "Mean Square", key: "mean_square" },
            { header: "F", key: "f_value" },
            { header: "Sig.", key: "significance" },
        ],
        rows: [],
        interpretation:
            "Per-dependent-variable univariate F-test for each contrast row, partitioning the contrast SSCP per DV against pooled error.",
    };

    // For 2-level (single contrast row), the contrast equals the factor effect
    // and SS_contrast = SS_factor — reuse Rust's tbs values for exact agreement.
    const isSingleRow = rows.length === 1;

    rows.forEach((cr, rowIdx) => {
        const c = cr.coefficients;
        dvNames.forEach((dv, dvIdx) => {
            let ss: number;
            let f: number;
            let p: number;
            if (isSingleRow) {
                const fac = getEntry(getEntry(tbsEffects, dv), factor) as any;
                if (!fac) return;
                ss = Number(fac.sum_of_squares);
                f = Number(fac.f_value);
                p = Number(fac.significance);
            } else {
                const estimate = c.reduce(
                    (s, ci, i) => s + ci * means[dv][i],
                    0
                );
                const denom = c.reduce(
                    (s, ci, i) => s + (ci * ci) / (ns[i] || 1),
                    0
                );
                ss = denom > 0 ? (estimate * estimate) / denom : NaN;
                f = ss / msError[dv];
                p = studentTPValueTwoSided(Math.sqrt(f), errorDf);
            }
            const ms = ss; // df_contrast = 1
            table.rows.push({
                rowHeader: [],
                source: dvIdx === 0 ? (isSingleRow ? "Contrast" : cr.label) : "",
                dependent_variable: dv,
                sum_of_squares: formatDisplayNumber(ss),
                df: "1",
                mean_square: formatDisplayNumber(ms),
                f_value: formatDisplayNumber(f),
                significance: formatSig(p),
            });
        });
        // Suppress unused row index warning.
        void rowIdx;
    });

    // Error block (one row per DV)
    dvNames.forEach((dv, dvIdx) => {
        const err = getEntry(getEntry(tbsEffects, dv), "Error") as any;
        if (!err) return;
        table.rows.push({
            rowHeader: [],
            source: dvIdx === 0 ? "Error" : "",
            dependent_variable: dv,
            sum_of_squares: formatDisplayNumber(err.sum_of_squares),
            df: String(err.df),
            mean_square: formatDisplayNumber(err.mean_square),
            f_value: "",
            significance: "",
        });
    });

    if (table.rows.length > 0) resultJson.tables.push(table);
}

function formatCustomHypothesisTests(
    data: any,
    resultJson: ResultJson,
    contrastInfo: MultivariateFormatterOptions["contrastInfo"]
) {
    if (!contrastInfo) return;
    if (!contrastInfo.method || contrastInfo.method.toLowerCase() === "none") return;
    const inputs = gatherContrastInputs(data, contrastInfo);
    if (!inputs) return;
    formatContrastResultsKMatrix(inputs, resultJson);
    formatContrastMultivariateTests(data, inputs, resultJson);
    formatContrastUnivariateTests(data, inputs, resultJson);
}

// ── 14. General Estimable Function ───────────────────────────────────────────
function formatGeneralEstimableFunction(data: any, resultJson: ResultJson) {
    if (!data.general_estimable_function) return;

    const gef = data.general_estimable_function;
    const matrix: Record<string, Record<string, number>> = gef.matrix || {};
    const rowKeys = Object.keys(matrix);
    if (rowKeys.length === 0) return;

    const colKeys = Object.keys(matrix[rowKeys[0]] || {});

    const table: Table = {
        key: "general_estimable_function",
        title: "General Estimable Function",
        columnHeaders: [
            { header: "Parameter", key: "param_name" },
            ...colKeys.map((k) => ({ header: k, key: `col_${k}` })),
        ],
        rows: [],
        note: gef.design,
        interpretation:
            "Displays the linear combinations of model parameters that are estimable, given the chosen model and Sum of Squares method. Each row defines an estimable function used in hypothesis testing.",
    };

    rowKeys.forEach((rowKey) => {
        const row: Row = { rowHeader: [], param_name: rowKey };
        colKeys.forEach((colKey) => {
            row[`col_${colKey}`] = String(matrix[rowKey]?.[colKey] ?? "");
        });
        table.rows.push(row);
    });

    resultJson.tables.push(table);
}

// ── 15. Post Hoc Tests ────────────────────────────────────────────────────────
function formatPosthocTests(
    data: any,
    resultJson: ResultJson,
    relabelDv: (name: string) => string = (n) => n
) {
    if (!data.posthoc_tests) return;

    // Rust delivers post-hoc rows keyed by Dependent Variable:
    //   data.posthoc_tests: { [dvName]: PostHocEntry[] }
    // Each PostHocEntry carries the factor it belongs to plus its (i, j)
    // level pair. SPSS prints one block per FACTOR (not per DV), with the
    // Dependent Variable as a column inside that block and the chosen
    // test method (Bonferroni / Sidak / …) noted in the title.
    //
    // We mirror that layout: collect every entry, group by factor first
    // and DV second, then emit one table per factor.
    const posthoc: Record<string, any[]> = data.posthoc_tests;

    // factor → DV → entries (ordered by insertion).
    const byFactor: Record<string, Record<string, any[]>> = {};
    const dvOrder: string[] = Object.keys(posthoc).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    dvOrder.forEach((dvName) => {
        (posthoc[dvName] || []).forEach((entry: any) => {
            const factor: string = entry.factor_name ?? "";
            if (!factor) return;
            if (!byFactor[factor]) byFactor[factor] = {};
            if (!byFactor[factor][dvName]) byFactor[factor][dvName] = [];
            byFactor[factor][dvName].push(entry);
        });
    });

    const factorOrder = Object.keys(byFactor).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    factorOrder.forEach((factor) => {
        const dvMap = byFactor[factor];

        // Determine which test method label(s) are present in this block.
        // For a single method (the common case in SPSS) we surface it in the
        // title; for mixed methods we keep a column so users can tell rows
        // apart.
        const testTypeSet = new Set<string>();
        Object.values(dvMap).forEach((rows) =>
            rows.forEach((e: any) => testTypeSet.add(String(e.test_type ?? "")))
        );
        const singleTestType =
            testTypeSet.size === 1 ? Array.from(testTypeSet)[0] : null;

        // Count unique levels of this factor by scanning (I, J) values
        // from any DV's entries (they share the same level set per factor).
        const levelSet = new Set<string>();
        Object.values(dvMap).forEach((rows) =>
            rows.forEach((e: any) => {
                if (e.i_level !== undefined && e.i_level !== null)
                    levelSet.add(String(e.i_level));
                if (e.j_level !== undefined && e.j_level !== null)
                    levelSet.add(String(e.j_level));
            })
        );
        const levelCount = levelSet.size;
        // SPSS-style guidance for k=2 factors. We keep the table (the 95%
        // CI for the mean difference is the unique information not
        // available in Tests of Between-Subjects Effects) but warn the
        // user that the multiple comparison adjustment is essentially a
        // no-op here.
        const twoLevelNote =
            levelCount < 3
                ? `Note: with only ${levelCount} levels of ${factor} there is a single pairwise comparison (c = 1). Multiple comparison adjustments (Bonferroni, Sidak, Scheffé, …) produce the same p-value as the uncorrected LSD, and the p-value matches the main effect F-test in Tests of Between-Subjects Effects. The 95% Confidence Interval for the mean difference is the additional information that justifies keeping this table.`
                : null;

        const titleSuffix = singleTestType
            ? ` (${singleTestType})`
            : "";
        const table: Table = {
            key: `posthoc_tests_${factor}`,
            title: `Multiple Comparisons — ${factor}${titleSuffix}`,
            columnHeaders: [
                { header: "Dependent Variable", key: "dependent_variable" },
                ...(singleTestType
                    ? []
                    : [{ header: "Test", key: "test_type" }]),
                { header: `(I) ${factor}`, key: "i_level" },
                { header: `(J) ${factor}`, key: "j_level" },
                { header: "Mean Difference (I-J)", key: "mean_difference" },
                { header: "Std. Error", key: "std_error" },
                { header: "Sig.", key: "significance" },
                {
                    header: "95% Confidence Interval",
                    children: [
                        { header: "Lower Bound", key: "ci_lower" },
                        { header: "Upper Bound", key: "ci_upper" },
                    ],
                },
            ],
            rows: [],
            note: [
                singleTestType
                    ? `Based on observed means. ${singleTestType} adjustment.`
                    : null,
                twoLevelNote,
            ]
                .filter(Boolean)
                .join("\n") || undefined,
            interpretation:
                "Pairwise comparisons of factor level means with adjusted significance values and confidence intervals. A significant Sig. (< .05) indicates a statistically significant difference between the two means after correcting for multiple comparisons.",
        };

        dvOrder.forEach((dvName) => {
            const rows = dvMap[dvName];
            if (!rows || rows.length === 0) return;
            rows.forEach((entry: any, rowIdx: number) => {
                const row: Row = {
                    rowHeader: [],
                    // SPSS prints the DV label only on the first row of its
                    // group (merged cell). Mirror that for readability.
                    dependent_variable: rowIdx === 0 ? relabelDv(dvName) : "",
                    i_level: entry.i_level,
                    j_level: entry.j_level,
                    mean_difference: formatDisplayNumber(entry.mean_difference),
                    std_error: formatDisplayNumber(entry.std_error),
                    significance: formatSig(entry.significance),
                    ci_lower: formatDisplayNumber(
                        entry.confidence_interval?.lower_bound
                    ),
                    ci_upper: formatDisplayNumber(
                        entry.confidence_interval?.upper_bound
                    ),
                };
                if (!singleTestType) row.test_type = entry.test_type;
                table.rows.push(row);
            });
        });

        if (table.rows.length > 0) resultJson.tables.push(table);
    });
}

// ── 16. Homogeneous Subsets ───────────────────────────────────────────────────
function formatHomogeneousSubsets(
    data: any,
    resultJson: ResultJson,
    relabelDv: (name: string) => string = (n) => n
) {
    if (!data.homogeneous_subsets) return;

    const hs: Record<string, Record<string, any>> = data.homogeneous_subsets;

    Object.entries(hs).forEach(([dvName, testMap]: [string, any]) => {
        Object.entries(testMap).forEach(([testName, subsets]: [string, any]) => {
            const groups: any[] = subsets.groups || [];
            const subsetKeys = new Set<number>();
            groups.forEach((g: any) => {
                Object.keys(g.subsets || {}).forEach((k) => subsetKeys.add(Number(k)));
            });
            const sortedSubsetKeys = Array.from(subsetKeys).sort((a, b) => a - b);

            const table: Table = {
                key: `homogeneous_subsets_${dvName}_${testName}`,
                title: `${testName} — Dependent Variable: ${relabelDv(dvName)}`,
                columnHeaders: [
                    { header: subsets.test_name || testName, key: "factor_value" },
                    { header: "N", key: "n" },
                    ...sortedSubsetKeys.map((k) => ({
                        header: `Subset ${k}`,
                        key: `subset_${k}`,
                    })),
                ],
                rows: [],
                note: subsets.notes?.join(" "),
                interpretation:
                    "Groups factor levels into subsets whose means are not statistically different from one another. Levels appearing in the same subset are not significantly different at the chosen alpha level.",
            };

            groups.forEach((g: any) => {
                const row: Row = {
                    rowHeader: [],
                    factor_value: g.factor_value,
                    n: String(g.n),
                };
                sortedSubsetKeys.forEach((k) => {
                    row[`subset_${k}`] =
                        g.subsets[k] !== undefined
                            ? formatDisplayNumber(g.subsets[k])
                            : "";
                });
                table.rows.push(row);
            });

            if (table.rows.length > 0) resultJson.tables.push(table);
        });
    });
}

// ── 17. Estimated Marginal Means ──────────────────────────────────────────────
function formatEmmeans(
    data: any,
    resultJson: ResultJson,
    relabelDv: (name: string) => string = (n) => n
) {
    if (!data.emmeans) return;

    const emmeans: Record<string, any[]> = data.emmeans;

    Object.entries(emmeans).forEach(([factorKey, entries]: [string, any[]]) => {
        const table: Table = {
            key: `emmeans_${factorKey}`,
            title: `Estimated Marginal Means — ${factorKey}`,
            columnHeaders: [
                { header: "Dependent Variable", key: "dependent_variable" },
                { header: factorKey, key: "factor_value" },
                { header: "Mean", key: "mean" },
                { header: "Std. Error", key: "std_error" },
                {
                    header: "95% Confidence Interval",
                    children: [
                        { header: "Lower Bound", key: "ci_lower" },
                        { header: "Upper Bound", key: "ci_upper" },
                    ],
                },
            ],
            rows: [],
            interpretation:
                "This table shows the Estimated Marginal Means (EMMs) — the adjusted means for each level of the factor, controlling for other variables in the model. Useful for interpreting effects after accounting for covariates.",
        };

        entries.forEach((entry: any) => {
            table.rows.push({
                rowHeader: [],
                dependent_variable: relabelDv(entry.dependent_variable),
                factor_value: entry.factor_value,
                mean: formatDisplayNumber(entry.mean),
                std_error: formatDisplayNumber(entry.std_error),
                ci_lower: formatDisplayNumber(entry.confidence_interval?.lower_bound),
                ci_upper: formatDisplayNumber(entry.confidence_interval?.upper_bound),
            });
        });

        if (table.rows.length > 0) resultJson.tables.push(table);
    });
}

// ── 18. Spread vs. Level ──────────────────────────────────────────────────────
function formatSpreadVsLevel(data: any, resultJson: ResultJson) {
    if (!data.spread_vs_level_plots) return;

    const plots: Record<string, any> = data.spread_vs_level_plots;

    Object.entries(plots).forEach(([dvName, plotData]: [string, any]) => {
        const points: any[] = plotData.points || [];
        const table: Table = {
            key: `spread_vs_level_${dvName}`,
            title: `Spread vs. Level — Dependent Variable: ${dvName}`,
            columnHeaders: [
                { header: "Level Mean", key: "level_mean" },
                { header: "Spread (Std. Deviation)", key: "spread_standard_deviation" },
            ],
            rows: [],
            interpretation:
                "Pairs each group's mean against its standard deviation. A systematic relationship between spread and level suggests that variance differs by group, which violates the homogeneity-of-variance assumption.",
        };

        points.forEach((p: any) => {
            table.rows.push({
                rowHeader: [],
                level_mean: formatDisplayNumber(p.level_mean),
                spread_standard_deviation: formatDisplayNumber(p.spread_standard_deviation),
            });
        });

        if (table.rows.length > 0) resultJson.tables.push(table);
    });
}

// ── 18b. Residual Diagnostic Plot Matrix ──────────────────────────────────────
// SPSS's GLM Multivariate "Observed * Predicted * Std. Residual Plots" panel
// renders a 3×3 SPLOM per Dependent Variable: the diagonal carries variable
// labels, and the six off-diagonal cells show scatter plots with shared
// per-dimension axes. The lower and upper triangles are visually the same
// pair with axes swapped — pure ergonomic redundancy, no extra statistical
// information.
//
// We pack one Chart entry per DV using the custom chartType
// "Scatter Plot Matrix" (defined in scatterMatrixUtils.ts and registered
// in GeneralChartContainer). Each row of chartData carries the three
// values for a single observation; the matrix renderer consumes
// chartConfig.matrixDimensions to know which keys to pair off.
function formatResidualPlots(
    data: any,
    resultJson: ResultJson,
    relabelDv: (name: string) => string = (n) => n
) {
    if (!data.residual_plots) return;
    // Tolerate both Map and Object shapes from serde_wasm_bindgen.
    const entries: Array<[string, any]> = (() => {
        if (data.residual_plots instanceof Map) {
            return Array.from(data.residual_plots.entries()) as Array<
                [string, any]
            >;
        }
        return Object.entries(data.residual_plots);
    })();
    if (entries.length === 0) return;

    if (!resultJson.charts) resultJson.charts = [];

    const sortedEntries = entries.sort(([a], [b]) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    sortedEntries.forEach(([dvName, plotRaw]) => {
        const plot = plotRaw as {
            observed: number[];
            predicted: number[];
            std_residual: number[];
            model?: string;
            dependent_variable?: string;
        };
        const displayName = relabelDv(dvName);
        const modelNote = plot.model ?? "";

        const n = Math.min(
            plot.observed?.length ?? 0,
            plot.predicted?.length ?? 0,
            plot.std_residual?.length ?? 0
        );
        if (n === 0) return;

        // One row per observation, three numeric columns. The matrix
        // renderer picks pairs based on the `matrixDimensions` order.
        const chartData: Array<{
            observed: number;
            predicted: number;
            std_residual: number;
        }> = [];
        for (let i = 0; i < n; i++) {
            const o = plot.observed[i];
            const p = plot.predicted[i];
            const r = plot.std_residual[i];
            if (
                Number.isFinite(o) &&
                Number.isFinite(p) &&
                Number.isFinite(r)
            ) {
                chartData.push({ observed: o, predicted: p, std_residual: r });
            }
        }
        if (chartData.length === 0) return;

        const matrixDimensions = [
            { key: "observed", label: "Observed" },
            { key: "predicted", label: "Predicted" },
            { key: "std_residual", label: "Std. Residual" },
        ];

        resultJson.charts!.push({
            chartType: "Scatter Plot Matrix",
            chartMetadata: {
                axisInfo: { x: "", y: "", category: "" },
                description:
                    "Scatter plot matrix of Observed, Predicted, and Standardised Residual for the dependent variable. Diagonals are blank with axis labels; off-diagonal cells show each pair with shared axes. The lower and upper triangles are the same pairs with axes swapped — pure visual convention, no added statistical information. Use the Predicted × Std. Residual cell to check homoscedasticity, the Observed × Predicted cell to check fit/linearity, and the Observed × Std. Residual cell to spot outliers.",
                notes: modelNote,
                title: `Observed × Predicted × Std. Residual — ${displayName}`,
                subtitle: modelNote,
            },
            chartData,
            chartConfig: {
                width: 600,
                height: 600,
                useAxis: false,
                useLegend: false,
                // Used by the matrix renderer.
                matrixDimensions,
                // Required by ChartConfig interface but unused for this chart.
                axisLabels: { x: "", y: "" },
            } as any,
        });
    });
}

// ── 19. Saved Variables summary ───────────────────────────────────────────────
function formatSavedVariables(data: any, resultJson: ResultJson) {
    if (!data.saved_variables) return;

    const sv = data.saved_variables;
    const varValues: Record<string, number[]> = sv.variable_values || {};
    const varNames = Object.keys(varValues);
    if (varNames.length === 0) return;

    const n = varValues[varNames[0]]?.length || 0;

    const table: Table = {
        key: "saved_variables_table",
        title: "Saved Variables",
        columnHeaders: [
            { header: "Case", key: "case" },
            ...varNames.map((v) => ({ header: v, key: v })),
        ],
        rows: [],
        interpretation:
            "Per-case predicted values, residuals, and diagnostic measures saved as new variables based on the fitted model. Useful for inspecting the model's fit and identifying influential observations.",
    };

    for (let i = 0; i < n; i++) {
        const row: Row = { rowHeader: [], case: String(i + 1) };
        varNames.forEach((v) => {
            row[v] = formatDisplayNumber(varValues[v][i]);
        });
        table.rows.push(row);
    }

    resultJson.tables.push(table);
}

// ── 20. Errors ────────────────────────────────────────────────────────────────
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
