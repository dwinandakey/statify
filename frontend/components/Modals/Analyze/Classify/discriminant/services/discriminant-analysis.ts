import {getSlicedData, getVarDefs} from "@/hooks/useVariable";
import type {DiscriminantAnalysisType} from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant-worker";
import init, { DiscriminantAnalysis } from "../rust/pkg/wasm";

export async function analyzeDiscriminant({
    configData,
    dataVariables,
    variables,
}: DiscriminantAnalysisType) {
    const GroupingVariable = configData.main.GroupingVariable
        ? [configData.main.GroupingVariable]
        : [];
    const IndependentVariables = configData.main.IndependentVariables || [];
    const SelectionVariable = configData.main.SelectionVariable
        ? [configData.main.SelectionVariable]
        : [];

    const slicedDataForGrouping = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: GroupingVariable,
    });

    const slicedDataForIndependent = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: IndependentVariables,
    });

    const slicedDataForSelection = getSlicedData({
        dataVariables,
        variables,
        selectedVariables: SelectionVariable,
    });

    const varDefsForGrouping = getVarDefs(variables, GroupingVariable);
    const varDefsForIndependent = getVarDefs(variables, IndependentVariables);
    const varDefsForSelection = getVarDefs(variables, SelectionVariable);
    console.log(configData);

    await init();
    const da = new DiscriminantAnalysis(
        slicedDataForGrouping,
        slicedDataForIndependent,
        slicedDataForSelection,
        varDefsForGrouping,
        varDefsForIndependent,
        varDefsForSelection,
        configData
    );

    const results = da.get_formatted_results();

    const executed = da.get_all_log();
    const errors = da.get_all_errors();

    console.log("executed", executed);
    console.log("errors", errors);
    console.log("results", results);
}
