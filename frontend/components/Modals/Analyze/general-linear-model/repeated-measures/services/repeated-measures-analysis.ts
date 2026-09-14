import { getSlicedData, getVarDefs } from "@/hooks/useVariable";
import type {
    RepeatedMeasuresAnalysisType
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measures-worker";
import { transformRepeatedMeasureResult } from "./repeated-measures-analysis-formatter";
import { resultRepeatedMeasures } from "./repeated-measures-analysis-output";
import init, {
    RepeatedMeasureAnalysis,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/rust/pkg/wasm";

export async function analyzeRepeatedMeasures({
    configData,
    dataVariables,
    variables,
}: RepeatedMeasuresAnalysisType) {
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

    const slicedDataForSubjectReal = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: realSubjectNames,
    });
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

    // Between-subjects factors and covariates: also reshape per-subject so the
    // same record_group iteration pattern lets Rust look up everything for a
    // single subject from one place.
    const slicedDataForFactorsRaw = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: FactorsVariables,
    });
    const slicedDataForFactors: Record<string, unknown>[][] = [];
    if (FactorsVariables.length > 0) {
        const fSubjectCount = slicedDataForFactorsRaw[0]?.length ?? 0;
        for (let s = 0; s < fSubjectCount; s++) {
            const merged: Record<string, unknown> = {};
            slicedDataForFactorsRaw.forEach((records, vIdx) => {
                const real = FactorsVariables[vIdx];
                const rec = records[s];
                if (rec && real in rec) merged[real] = rec[real];
            });
            slicedDataForFactors.push([merged]);
        }
    }

    const slicedDataForCovariateRaw = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: CovariateVariables,
    });
    const slicedDataForCovariate: Record<string, unknown>[][] = [];
    if (CovariateVariables.length > 0) {
        const cSubjectCount = slicedDataForCovariateRaw[0]?.length ?? 0;
        for (let s = 0; s < cSubjectCount; s++) {
            const merged: Record<string, unknown> = {};
            slicedDataForCovariateRaw.forEach((records, vIdx) => {
                const real = CovariateVariables[vIdx];
                const rec = records[s];
                if (rec && real in rec) merged[real] = rec[real];
            });
            slicedDataForCovariate.push([merged]);
        }
    }

    const varDefsForSubjectReal = getVarDefs(variables, realSubjectNames);
    const varDefsForSubject = varDefsForSubjectReal.map((defs, idx) =>
        defs.map((d: Record<string, unknown>) => ({
            ...d,
            name: subjectMap[idx].encoded,
        }))
    );
    const varDefsForFactors = getVarDefs(variables, FactorsVariables);
    const varDefsForCovariate = getVarDefs(variables, CovariateVariables);

    await init();

    const repeatedMeasure = new RepeatedMeasureAnalysis(
        slicedDataForSubject,
        slicedDataForFactors,
        slicedDataForCovariate,
        varDefsForSubject,
        varDefsForFactors,
        varDefsForCovariate,
        configData
    );

    const results = repeatedMeasure.get_formatted_results();
    const errorsString = repeatedMeasure.get_all_errors();

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
}
