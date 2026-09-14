import { getSlicedData, getVarDefs } from "@/hooks/useVariable";
import type {
    MultivariateAnalysisType
} from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate-worker";
import { transformMultivariateResult } from "./multivariate-analysis-formatter";
import { resultMultivariateAnalysis } from "./multivariate-analysis-output";
import { buildDifferenceData } from "./paired-difference";
// @ts-ignore
import init, { MultivariateAnalysis } from "@/components/Modals/Analyze/general-linear-model/multivariate/rust/pkg";

export async function analyzeMultivariate({
    configData,
    dataVariables,
    variables,
}: MultivariateAnalysisType) {
    // Paired Hotelling T² is implemented entirely in TS by synthesising
    // difference columns (d_k = v1_k − v2_k) and routing them through the
    // existing Test Values pipeline (cabang Intercept dengan μ₀ = δ₀).
    // No Rust changes are required.
    const pairedMode = configData.main.PairedMode;
    const pairedActive =
        (pairedMode?.pairs?.length ?? 0) > 0;

    let slicedDataForDependent;
    let varDefsForDependent;
    let effectiveConfig = configData;

    if (pairedActive && pairedMode) {
        const built = buildDifferenceData(
            dataVariables,
            variables,
            pairedMode.pairs
        );
        slicedDataForDependent = built.slicedData;
        varDefsForDependent = built.varDefs;

        const delta0: number[] = pairedMode.delta0
            ? built.diffNames.map((_, i) =>
                  Number.isFinite(pairedMode.delta0![i])
                      ? pairedMode.delta0![i]
                      : 0
              )
            : new Array(built.diffNames.length).fill(0);

        effectiveConfig = {
            ...configData,
            main: {
                ...configData.main,
                DepVar: built.diffNames,
                FixFactor: [],
                Covar: [],
                WlsWeight: null,
                TestValues: delta0,
                VarianceMode: null,
            },
        };
    } else {
        const DependentVariables = configData.main.DepVar || [];
        slicedDataForDependent = getSlicedData({
            dataVariables,
            variables,
            selectedVariables: DependentVariables,
        });
        varDefsForDependent = getVarDefs(variables, DependentVariables);
    }

    const FixFactorVariables = effectiveConfig.main.FixFactor || [];
    const CovariateVariables = effectiveConfig.main.Covar || [];
    const WlsWeightVariable = effectiveConfig.main.WlsWeight
        ? [effectiveConfig.main.WlsWeight]
        : [];

    const slicedDataForFixFactor = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: FixFactorVariables,
    });

    const slicedDataForCovariate = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: CovariateVariables,
    });

    const slicedDataForWlsWeight = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: WlsWeightVariable,
    });

    const varDefsForFixFactor = getVarDefs(variables, FixFactorVariables);
    const varDefsForCovariate = getVarDefs(variables, CovariateVariables);
    const varDefsForWlsWeight = getVarDefs(variables, WlsWeightVariable);

    await init();

    // Rust's MainConfig deserializes VarianceMode as a non-optional enum with
    // #[serde(default)] (config.rs:110-111). serde's `default` only fires when
    // the field is MISSING — a `null` payload still attempts deserialization
    // and fails with "invalid type: unit value, expected enum VarianceMode".
    // The dialog persists VarianceMode = null whenever the design isn't
    // exactly one Fixed Factor, so we normalise here before crossing the WASM
    // boundary. PairedMode is also stripped defensively because Rust doesn't
    // know about it.
    const { PairedMode: _stripPaired, ...mainForRust } = effectiveConfig.main;
    const configForRust = {
        ...effectiveConfig,
        main: {
            ...mainForRust,
            VarianceMode: mainForRust.VarianceMode ?? "Pooled",
        },
    };

    const multivariate = new MultivariateAnalysis(
        slicedDataForDependent,
        slicedDataForFixFactor,
        slicedDataForCovariate,
        slicedDataForWlsWeight,
        varDefsForDependent,
        varDefsForFixFactor,
        varDefsForCovariate,
        varDefsForWlsWeight,
        configForRust
    );

    const results = multivariate.get_formatted_results();
    const errorsString = multivariate.get_all_errors();

    // Determine whether the user actually requested post-hoc tests so we can
    // suppress non-failure warnings when they didn't (Rust always runs
    // homogeneous_subsets regardless of config, and posthoc may run when
    // SrcList is auto-populated even if no test method is selected).
    const ph = configData.posthoc;
    const userRequestedPosthoc =
        (ph.FixFactorVars?.length ?? 0) > 0 &&
        Boolean(
            ph.Lsd || ph.Bonfe || ph.Sidak || ph.Scheffe || ph.Regwf ||
            ph.Regwq || ph.Snk || ph.Tu || ph.Tub || ph.Dun || ph.Hoc ||
            ph.Gabriel || ph.Waller || ph.Dunnett || ph.Tam || ph.Dunt ||
            ph.Games || ph.Dunc
        );

    // Homogeneous Subsets are only produced by a specific subset of post-hoc
    // methods (see homogeneous_subsets.rs:87-207). Pairwise methods like
    // Bonferroni, LSD, Sidak, Scheffé, Dunnett, etc. do NOT produce subsets,
    // so the homogeneous_subsets module fails with "Failed to calculate
    // homogeneous subsets for any variable-factor combination". That failure
    // is benign — it just means no subset-producing method was selected —
    // and SPSS itself never shows a warning in this case (it simply omits
    // the table). Suppress the message in exactly that scenario.
    const userRequestedHomogeneousSubsets =
        (ph.FixFactorVars?.length ?? 0) > 0 &&
        Boolean(
            ph.Tu || ph.Snk || ph.Dun || ph.Regwf || ph.Regwq || ph.Tub ||
            ph.Waller
        );

    // Plots are only "requested" when the user added at least one entry to
    // PlotList via the Plots dialog. Without that, Rust still runs the plot
    // generator and emits "No plots generated" — a benign warning we hide.
    // In paired mode FixFactor is forced empty, so plots are never possible.
    const plotList = configData.plots?.PlotList?.trim() ?? "";
    const userRequestedPlots = !pairedActive && plotList.length > 0;

    const isSuppressibleContext = (ctx: string, _userRequestedPlots: boolean): boolean => {
        const lower = ctx.toLowerCase();
        if (lower === "calculate_posthoc_tests") {
            return !userRequestedPosthoc;
        }
        if (lower === "calculate_homogeneous_subsets") {
            // Suppress when no subset-producing method was selected, even if
            // the user did pick a pairwise method like Bonferroni.
            return !userRequestedHomogeneousSubsets;
        }
        if (lower === "generate_plots") {
            return !_userRequestedPlots;
        }
        return false;
    };

    // Parse the Rust error string into context-grouped messages, drop
    // suppressible groups, then re-serialize for the formatter.
    let errors: string[] = ["No errors occurred."];
    if (errorsString && errorsString.trim() !== "No errors occurred.") {
        type ErrGroup = { context: string; messages: string[] };
        const groups: ErrGroup[] = [];
        let current: ErrGroup | null = null;

        errorsString.split("\n").forEach((line: string) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "Error Summary:") return;
            if (trimmed.startsWith("Context: ")) {
                current = {
                    context: trimmed.replace("Context: ", "").trim(),
                    messages: [],
                };
                groups.push(current);
            } else if (current) {
                current.messages.push(trimmed.replace(/^\d+\.\s*/, ""));
            }
        });

        const filtered = groups.filter(
            (g) => !isSuppressibleContext(g.context, userRequestedPlots)
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

    // Build contrastInfo when the user selected a non-"none" method against
    // a single Fixed Factor — drives the K-Matrix + Multivariate/Univariate
    // contrast result tables.
    const contrastMethodNormalized = (
        configData.contrast?.ContrastMethod ?? "none"
    ).toLowerCase();
    const factorsForContrast = effectiveConfig.main.FixFactor ?? [];
    const contrastInfo =
        !pairedActive &&
        contrastMethodNormalized !== "none" &&
        factorsForContrast.length === 1
            ? {
                  factor: factorsForContrast[0],
                  method: contrastMethodNormalized,
                  first: Boolean(configData.contrast?.First),
              }
            : null;

    const formattedResults = transformMultivariateResult(results, errors, {
        testValues: effectiveConfig.main.TestValues,
        varianceMode: effectiveConfig.main.VarianceMode,
        factor:
            (effectiveConfig.main.FixFactor?.length ?? 0) === 1
                ? effectiveConfig.main.FixFactor?.[0] ?? null
                : null,
        pairedMode: pairedActive && pairedMode
            ? {
                  pairs: pairedMode.pairs,
                  delta0: effectiveConfig.main.TestValues ?? [],
              }
            : null,
        contrastInfo,
        sumOfSquareMethod: configData.model?.SumOfSquareMethod ?? null,
        // Pass the user's DV selection order so per-DV tables (Descriptive
        // Statistics, Parameter Estimates) render in dialog order instead
        // of the non-deterministic Rust HashMap order. In paired mode the
        // DepVar list is rewritten to synthetic diff names; we forward the
        // effective list so the order still matches what's actually shown.
        depVarOrder: effectiveConfig.main.DepVar ?? null,
        // Forward variable-label map so formatter can show SPSS-style labels
        // (e.g. "ultimate torque") instead of raw variable names ("Y1A1").
        variableLabels: (Array.isArray(variables) ? variables : []).reduce(
            (acc: Record<string, string>, v: any) => {
                if (v?.name && v?.label) acc[v.name] = v.label;
                return acc;
            },
            {} as Record<string, string>
        ),
    });

    // SPSS only shows the "Contrast Coefficients" table when the user
    // explicitly picks a contrast method (Deviation/Simple/etc.). Drop it
    // here if the method is "none" (default) so our output matches SPSS.
    const contrastMethod = configData.contrast.ContrastMethod;
    if (!contrastMethod || contrastMethod.toLowerCase() === "none") {
        formattedResults.tables = formattedResults.tables.filter(
            (t) => t.key !== "contrast_coefficients"
        );
    }

    /*
     * 🎉 Final Result Process 🎯
     * */
    await resultMultivariateAnalysis({
        formattedResult: formattedResults ?? [],
    });
}
