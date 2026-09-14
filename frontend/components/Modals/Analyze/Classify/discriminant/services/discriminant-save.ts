/**
 * Discriminant Analysis — Save Service
 *
 * Writes the per-case results the Save dialog asks for back into the dataset as
 * new variables, the way SPSS's DISCRIMINANT /SAVE subcommand does:
 *
 *   Dis_1   Predicted Group for Analysis 1
 *   Dis1_1  Discriminant Scores from Function 1 for Analysis 1
 *   Dis1_2  Probabilities of Group 1 Membership for Analysis 1
 *
 * Why the per-case values are recomputed here instead of being read out of the
 * WASM result: the Rust side returns its per-case output re-ordered by group and
 * numbered with a running counter (`casewise_statistics.case_number`), so there
 * is no way back to the dataset row a value came from. Walking the raw rows here
 * keeps the row index in hand. The arithmetic below mirrors `classify_case_safe`
 * in rust/src/stats/classification_result.rs exactly, so the saved columns agree
 * with the Classification Results and Casewise Statistics tables.
 */

import type { Variable } from "@/types/Variable";
import type { DiscriminantType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";

/** The slice of the WASM `get_formatted_results()` payload this service needs. */
export type DiscriminantModelInfo = {
    canonical_functions?: {
        coefficients?: Array<{ variable: string; values: number[] }>;
        function_at_centroids?: Array<{ group: string; values: number[] }>;
    } | null;
};

/** One dataset row's classification, or `null` when the row is not in the analysis. */
export type CaseResult = {
    /** Group label the case is assigned to (highest posterior probability). */
    predictedGroup: string;
    /** Canonical discriminant scores, one per function. */
    scores: number[];
    /** Posterior probability of membership, one per group, in `groupLabels` order. */
    probabilities: number[];
};

export type CaseResults = {
    /** Group labels in the same order Rust uses (lexicographic). */
    groupLabels: string[];
    /** Number of canonical discriminant functions. */
    numFunctions: number;
    /** One entry per dataset row; `null` for rows excluded from the analysis. */
    rows: Array<CaseResult | null>;
};

/** Mirrors `parseCellValue` in hooks/useVariable.ts so both read cells alike. */
function parseCell(raw: unknown): string | number | null {
    if (raw === null || raw === undefined || raw === "") return null;
    const text = String(raw);
    const parsed = Number.parseFloat(text.replace(",", "."));
    return Number.isNaN(parsed) ? text : parsed;
}

/**
 * Rust builds its group label with `f64::to_string()`. `String(n)` in JS agrees
 * with that for every value this path sees (integers print without a trailing
 * ".0" on both sides), so the labels line up with the ones in the result tables.
 */
function groupLabelOf(value: string | number): string {
    return typeof value === "number" ? String(value) : value;
}

/**
 * Recompute each dataset row's predicted group, discriminant scores, and
 * posterior probabilities from the fitted model.
 *
 * A row takes part only when its grouping value falls inside the defined range
 * and every analyzed predictor holds a number — the same listwise rule the
 * analysis itself applies. Everything else comes back as `null` and is left
 * blank in the saved columns.
 */
export function computeDiscriminantCaseResults(
    dataVariables: string[][],
    variables: Variable[],
    model: DiscriminantModelInfo,
    config: DiscriminantType,
): CaseResults | null {
    const canonical = model.canonical_functions;
    const coefficientRows = canonical?.coefficients ?? [];
    const centroidRows = canonical?.function_at_centroids ?? [];

    if (coefficientRows.length === 0 || centroidRows.length === 0) return null;

    const groupingName = config.main.GroupingVariable;
    if (!groupingName) return null;

    // The coefficient table already reflects stepwise selection, so it is the
    // authority on which predictors the fitted model actually uses.
    const predictors = coefficientRows.filter((c) => c.variable !== "(Constant)");
    const constants = coefficientRows.find((c) => c.variable === "(Constant)")?.values ?? [];
    if (predictors.length === 0) return null;

    const numFunctions = Math.min(
        ...predictors.map((p) => p.values.length),
        ...centroidRows.map((c) => c.values.length),
    );
    if (!Number.isFinite(numFunctions) || numFunctions < 1) return null;

    // Rust sorts its group labels as strings; match that so the probability
    // columns come out in the same order as the result tables' group columns.
    const groupLabels = centroidRows.map((c) => c.group).slice().sort();
    const centroidOf = new Map(centroidRows.map((c) => [c.group, c.values]));

    const columnOf = new Map<string, number>();
    for (const v of variables) columnOf.set(v.name, v.columnIndex);

    const groupingColumn = columnOf.get(groupingName);
    if (groupingColumn === undefined) return null;

    const predictorColumns: number[] = [];
    for (const p of predictors) {
        const col = columnOf.get(p.variable);
        if (col === undefined) return null;
        predictorColumns.push(col);
    }

    const { minRange, maxRange } = config.defineRange;

    // Pass 1 — decide which rows are in the analysis and score them.
    type Scored = { rowIndex: number; label: string; scores: number[] };
    const scored: Scored[] = [];

    for (let rowIndex = 0; rowIndex < dataVariables.length; rowIndex++) {
        const row = dataVariables[rowIndex];
        if (!row) continue;

        const groupValue = parseCell(row[groupingColumn]);
        if (groupValue === null) continue;
        if (typeof groupValue === "number") {
            if (minRange !== null && groupValue < minRange) continue;
            if (maxRange !== null && groupValue > maxRange) continue;
        }

        const label = groupLabelOf(groupValue);
        if (!centroidOf.has(label)) continue;

        const values: number[] = [];
        let complete = true;
        for (const col of predictorColumns) {
            const cell = parseCell(row[col]);
            if (typeof cell !== "number" || !Number.isFinite(cell)) {
                complete = false;
                break;
            }
            values.push(cell);
        }
        if (!complete) continue;

        const scores = new Array<number>(numFunctions).fill(0);
        for (let f = 0; f < numFunctions; f++) {
            let s = constants[f] ?? 0;
            for (let v = 0; v < predictors.length; v++) {
                s += values[v] * (predictors[v].values[f] ?? 0);
            }
            scores[f] = s;
        }

        scored.push({ rowIndex, label, scores });
    }

    if (scored.length === 0) return null;

    // Priors, following classify_case_safe.
    const priors: number[] = [];
    if (config.classify.AllGroupEqual) {
        priors.push(...new Array<number>(groupLabels.length).fill(1 / groupLabels.length));
    } else {
        const counts = new Map<string, number>(groupLabels.map((g) => [g, 0]));
        for (const c of scored) counts.set(c.label, (counts.get(c.label) ?? 0) + 1);
        for (const g of groupLabels) priors.push((counts.get(g) ?? 0) / scored.length);
    }

    // Pass 2 — distances, posterior probabilities, predicted group.
    const rows: Array<CaseResult | null> = new Array(dataVariables.length).fill(null);

    for (const c of scored) {
        // log P(g|x) up to a constant: ln(prior) - 0.5 * squared distance to the
        // group centroid in discriminant space.
        const logProbs = groupLabels.map((g, gIdx) => {
            const centroid = centroidOf.get(g) ?? [];
            let d2 = 0;
            for (let f = 0; f < numFunctions; f++) {
                const diff = c.scores[f] - (centroid[f] ?? 0);
                d2 += diff * diff;
            }
            if (Number.isNaN(d2)) d2 = Number.MAX_VALUE;
            const prior = priors[gIdx];
            return prior > 0 ? Math.log(prior) - 0.5 * d2 : -Infinity;
        });

        // Softmax with the max subtracted out, the same underflow guard Rust uses.
        const maxLog = Math.max(...logProbs);
        const exps = logProbs.map((lp) => Math.exp(lp - maxLog));
        const sumExp = exps.reduce((a, b) => a + b, 0);
        const probabilities = sumExp > 0 ? exps.map((e) => e / sumExp) : exps;

        let bestIdx = 0;
        for (let g = 1; g < logProbs.length; g++) {
            if (logProbs[g] > logProbs[bestIdx]) bestIdx = g;
        }

        rows[c.rowIndex] = {
            predictedGroup: groupLabels[bestIdx],
            scores: c.scores,
            probabilities,
        };
    }

    return { groupLabels, numFunctions, rows };
}

/** A variable to create plus the column of values that goes with it. */
export type PreparedSaveVariable = {
    definition: Partial<Variable>;
    /** One entry per dataset row; `null` leaves the cell blank. */
    values: Array<number | string | null>;
};

function numericVariable(name: string, label: string, decimals: number): Partial<Variable> {
    return {
        name,
        label,
        type: "NUMERIC",
        width: 8,
        decimals,
        align: "right",
        measure: decimals === 0 ? "nominal" : "scale",
        role: "input",
    };
}

/**
 * Pick the SPSS suffix set for this run.
 *
 * SPSS numbers the saved columns per set: the predicted group and the
 * discriminant scores share one suffix (Dis_1, Dis1_1, Dis2_1) and the
 * probabilities take the next (Dis1_2, Dis2_2). We search for the lowest
 * starting suffix whose whole name set is still free, so re-running the
 * analysis appends rather than colliding.
 */
function allocateNames(
    save: DiscriminantType["save"],
    numFunctions: number,
    numGroups: number,
    taken: Set<string>,
): { predicted: string | null; scores: string[]; probabilities: string[]; analysis: number } {
    for (let start = 1; start < 1000; start++) {
        let set = start;
        const predicted = save.Predicted ? `Dis_${set}` : null;

        const scores: string[] = [];
        if (save.Discriminant) {
            for (let k = 1; k <= numFunctions; k++) scores.push(`Dis${k}_${set}`);
            set += 1;
        }

        const probabilities: string[] = [];
        if (save.Probabilities) {
            for (let k = 1; k <= numGroups; k++) probabilities.push(`Dis${k}_${set}`);
        }

        const all = [...(predicted ? [predicted] : []), ...scores, ...probabilities];
        if (all.every((n) => !taken.has(n))) {
            return { predicted, scores, probabilities, analysis: start };
        }
    }
    throw new Error("Could not find free variable names for the saved discriminant columns.");
}

/**
 * Turn the per-case results into the variables the Save dialog asked for.
 * Returns an empty list when nothing is selected.
 */
export function prepareDiscriminantSaveVariables(
    results: CaseResults,
    save: DiscriminantType["save"],
    existingNames: Set<string>,
): PreparedSaveVariable[] {
    const { groupLabels, numFunctions, rows } = results;
    const names = allocateNames(save, numFunctions, groupLabels.length, existingNames);
    const prepared: PreparedSaveVariable[] = [];

    if (names.predicted) {
        prepared.push({
            definition: numericVariable(
                names.predicted,
                `Predicted Group for Analysis ${names.analysis}`,
                0,
            ),
            // The label is the grouping variable's own code, so a numeric code
            // goes back in as a number and a string code stays a string.
            values: rows.map((r) => {
                if (!r) return null;
                const asNumber = Number(r.predictedGroup);
                return Number.isNaN(asNumber) ? r.predictedGroup : asNumber;
            }),
        });
    }

    names.scores.forEach((name, f) => {
        prepared.push({
            definition: numericVariable(
                name,
                `Discriminant Scores from Function ${f + 1} for Analysis ${names.analysis}`,
                5,
            ),
            values: rows.map((r) => (r ? r.scores[f] ?? null : null)),
        });
    });

    names.probabilities.forEach((name, g) => {
        prepared.push({
            definition: numericVariable(
                name,
                `Probabilities of Group ${g + 1} Membership for Analysis ${names.analysis}`,
                5,
            ),
            values: rows.map((r) => (r ? r.probabilities[g] ?? null : null)),
        });
    });

    return prepared;
}

/**
 * Compute, build, and commit the saved columns in one go.
 *
 * Returns the names of the variables it created; an empty array means nothing
 * was requested or the model could not produce per-case results.
 */
export async function saveDiscriminantVariables(
    dataVariables: string[][],
    variables: Variable[],
    model: DiscriminantModelInfo,
    config: DiscriminantType,
): Promise<string[]> {
    const { save } = config;
    if (!save.Predicted && !save.Discriminant && !save.Probabilities) return [];

    const results = computeDiscriminantCaseResults(dataVariables, variables, model, config);
    if (!results) {
        throw new Error(
            "The analysis did not return canonical discriminant functions, so there is nothing to save.",
        );
    }

    // Imported lazily so this module stays usable from tests and workers, which
    // have no Zustand store to talk to.
    const { useVariableStore } = await import("@/stores/useVariableStore");

    const existing = useVariableStore.getState().variables;
    const existingNames = new Set(existing.map((v) => v.name));
    const prepared = prepareDiscriminantSaveVariables(results, save, existingNames);
    if (prepared.length === 0) return [];

    const nextColumnIndex =
        existing.length > 0 ? Math.max(...existing.map((v) => v.columnIndex)) + 1 : 0;

    const definitions = prepared.map((p, idx) => ({
        ...p.definition,
        columnIndex: nextColumnIndex + idx,
    }));

    const updates = prepared.flatMap((p, idx) =>
        p.values.flatMap((value, row) =>
            value === null ? [] : [{ row, col: nextColumnIndex + idx, value }],
        ),
    );

    await useVariableStore.getState().addVariables(definitions as Variable[], updates);

    return definitions.map((d) => d.name as string);
}
