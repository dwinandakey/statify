import { getSlicedData, getVarDefs } from "@/hooks/useVariable";
import type {
    RepeatedMeasuresAnalysisType
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measures-worker";
import { transformRepeatedMeasureResult } from "./repeated-measures-analysis-formatter";
import { resultRepeatedMeasures } from "./repeated-measures-analysis-output";
import type { RepeatedMeasuresWorkerPayload } from "./repeated-measures-analysis-worker";
import {
    executeGlmComputation,
    GlmWorkerClient,
    markGlmAnalysisEnd,
    markGlmAnalysisStart,
} from "@/components/Modals/Analyze/general-linear-model/shared/glm-execution";
import init, {
    RepeatedMeasureAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg/wasm";

// Reused across analyses so WASM is initialised once per worker.
const repeatedMeasuresWorker = new GlmWorkerClient<RepeatedMeasuresWorkerPayload, any>(
    "repeated-measures",
    () =>
        new Worker(new URL("./repeated-measures-analysis-worker.ts", import.meta.url), {
            type: "module",
        })
);

// Main-thread computation (mode "main" and "main-fallback"). Mirrors the
// worker: the Rust-side object is released with free() right after the
// results are read, instead of whenever the JS garbage collector finalises it.
async function runRepeatedMeasuresOnMainThread(payload: RepeatedMeasuresWorkerPayload) {
    await init();

    const repeatedMeasure = new RepeatedMeasureAnalysis(
        payload.subject_data,
        payload.factors_data,
        payload.covar_data,
        payload.subject_data_defs,
        payload.factors_data_defs,
        payload.covar_data_defs,
        payload.config_data
    );

    try {
        const results = repeatedMeasure.get_formatted_results();
        const errors = repeatedMeasure.get_all_errors();
        return { results, errors };
    } finally {
        repeatedMeasure.free();
    }
}

/**
 * Runs the WASM computation in the mode selected by localStorage
 * "glm-execution-mode" and reports the mode actually used.
 */
export function computeRepeatedMeasures(payload: RepeatedMeasuresWorkerPayload) {
    return executeGlmComputation({
        module: "repeated-measures",
        client: repeatedMeasuresWorker,
        payload,
        runOnMainThread: runRepeatedMeasuresOnMainThread,
    });
}

export async function analyzeRepeatedMeasures({
    configData,
    dataVariables,
    variables,
}: RepeatedMeasuresAnalysisType) {
    markGlmAnalysisStart();

    const SubjectVariables = configData.main.SubVar || [];
    const FactorsVariables = configData.main.FactorsVar || [];
    const CovariateVariables = configData.main.Covariates || [];

    // Subject variables come in encoded form: "perlakuan1_(1,perlakuan_anjing)"
    // Real column name (for store lookup) is "perlakuan1"; the encoded form is
    // what Rust's `parse_within_subject_factors` regex expects in var_def.name.
    const subjectMap = SubjectVariables.map((encoded: string) => {
        // Greedy match up to the last "_(" — variable names may contain "_".
        const match = encoded.match(/^(.+)_\(/);
        return { encoded, real: match?.[1] ?? encoded };
    });
    const realSubjectNames = subjectMap.map((s) => s.real);

    // One slice for all variables, so dependent variables, factors and
    // covariates have the same number of rows (subjects). Within-only designs
    // slice exactly the dependent variables, as before.
    const slicedAll = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: [...realSubjectNames, ...FactorsVariables, ...CovariateVariables],
    });
    const nSubjectVars = realSubjectNames.length;
    const slicedDataForSubjectReal = slicedAll.slice(0, nSubjectVars);
    // Reshape from variable-major (outer=var, inner=subject) to subject-major
    // (outer=subject, inner=record). Each subject becomes one DataRecord with
    // all dependent variables merged under their encoded names — this matches
    // Rust's Mauchly/WS-effects expectation that each `record_group` is one
    // subject's set of records.
    const subjectCount = slicedDataForSubjectReal[0]?.length ?? 0;
    const slicedDataForSubject: Record<string, unknown>[][] = [];
    for (let s = 0; s < subjectCount; s++) {
        const merged: Record<string, unknown> = {};
        slicedDataForSubjectReal.forEach((records, vIdx) => {
            const { real, encoded } = subjectMap[vIdx];
            const rec = records[s];
            if (rec && real in rec) merged[encoded] = rec[real];
        });
        slicedDataForSubject.push([merged]);
    }

    // Between-subjects factors and covariates use the VARIABLE-MAJOR layout
    // expected by Rust (models/data.rs, stats/rm_model.rs):
    //   factors_data[f][s] = { <factor f>: value of subject s }
    //   covar_data[c][s]   = { <covariate c>: value of subject s }
    // with f / c in the order of factors_data_defs / covar_data_defs and s in
    // the same subject order as subject_data. This is exactly the layout
    // getSlicedData returns, so the slices are passed through unchanged.
    const slicedDataForFactors = slicedAll.slice(nSubjectVars, nSubjectVars + FactorsVariables.length);
    const slicedDataForCovariate = slicedAll.slice(nSubjectVars + FactorsVariables.length);

    const varDefsForSubjectReal = getVarDefs(variables, realSubjectNames);
    const varDefsForSubject = varDefsForSubjectReal.map((defs, idx) =>
        defs.map((d: Record<string, unknown>) => ({
            ...d,
            name: subjectMap[idx].encoded,
        }))
    );
    const varDefsForFactors = getVarDefs(variables, FactorsVariables);
    const varDefsForCovariate = getVarDefs(variables, CovariateVariables);

    const {
        results,
        errors: errorsString,
        mode,
    } = await computeRepeatedMeasures({
        subject_data: slicedDataForSubject,
        factors_data: slicedDataForFactors,
        covar_data: slicedDataForCovariate,
        subject_data_defs: varDefsForSubject,
        factors_data_defs: varDefsForFactors,
        covar_data_defs: varDefsForCovariate,
        config_data: configData,
    });

    // Parse error string and suppress non-requested posthoc warnings
    const ph = configData.posthoc;
    const userRequestedPosthoc =
        (ph?.FixFactorVars?.length ?? 0) > 0;

    let errors: string[] = ["No errors occurred."];
    if (errorsString && errorsString.trim() !== "No errors occurred.") {
        type ErrGroup = { context: string; messages: string[] };
        const groups: ErrGroup[] = [];
        let current: ErrGroup | null = null;

        errorsString.split("\n").forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "Error Summary:") return;
            if (trimmed.startsWith("Context: ")) {
                current = { context: trimmed.replace("Context: ", "").trim(), messages: [] };
                groups.push(current);
            } else if (current) {
                current.messages.push(trimmed.replace(/^\d+\.\s*/, ""));
            }
        });

        const filtered = groups.filter((g) =>
            userRequestedPosthoc || g.context !== "calculate_posthoc_tests"
        );

        if (filtered.length === 0) {
            errors = ["No errors occurred."];
        } else {
            const lines: string[] = ["Error Summary:"];
            filtered.forEach((g) => {
                lines.push(`Context: ${g.context}`);
                g.messages.forEach((m, i) => lines.push(`${i + 1}. ${m}`));
            });
            errors = lines;
        }
    } else if (errorsString) {
        errors = [errorsString.trim()];
    }

    const formattedResults = transformRepeatedMeasureResult(results, errors);

    /*
     * 🎉 Final Result Process 🎯
     * */
    await resultRepeatedMeasures({
        formattedResult: formattedResults,
    });

    markGlmAnalysisEnd("repeated-measures", mode);
}
