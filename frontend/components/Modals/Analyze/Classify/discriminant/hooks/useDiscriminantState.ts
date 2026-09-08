import { useCallback, useEffect, useState } from "react";
import { getSlicedData, getVarDefs } from "@/hooks/useVariable";
import type { DiscriminantAnalysisType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant-worker";
import type { DiscriminantType, DiscriminantMainType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import { DiscriminantDefault } from "@/components/Modals/Analyze/Classify/discriminant/constants/discriminant-default";
import { clearFormData, getFormData, saveFormData } from "@/hooks/useIndexedDB";
import { saveDiscriminantResult, saveDiscriminantAssumptions } from "@/components/Modals/Analyze/Classify/discriminant/services/store";
import { Variable } from "@/types/Variable";

export type DiscriminantValueUnion = string | number | boolean | string[] | null;

export interface UseDiscriminantStateResult {
    formData: DiscriminantType;
    updateFormData: <T extends keyof DiscriminantType>(
        section: T,
        field: keyof DiscriminantType[T],
        value: DiscriminantType[T][keyof DiscriminantType[T]] | DiscriminantValueUnion
    ) => void;
    executeAnalysis: (mainData: DiscriminantMainType) => Promise<void>;
    /** Run only the assumption checks and push their output immediately. */
    runAssumptions: (mainData: DiscriminantMainType) => Promise<void>;
    resetFormData: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export const useDiscriminantState = (
    variables: Variable[],
    dataVariables: string[][]
): UseDiscriminantStateResult => {
    const [formData, setFormData] = useState<DiscriminantType>({
        ...DiscriminantDefault,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load saved form data from IndexedDB on mount
    useEffect(() => {
        const loadFormData = async () => {
            try {
                const savedData = await getFormData("Discriminant");
                if (savedData) {
                    const { id, ...formDataWithoutId } = savedData;
                    // Merge with defaults so sections added after this data was
                    // saved (e.g. `assumptions`) are always present.
                    setFormData({
                        ...DiscriminantDefault,
                        ...(formDataWithoutId as DiscriminantType),
                    });
                } else {
                    setFormData({ ...DiscriminantDefault });
                }
            } catch (err) {
                console.error("Failed to load form data:", err);
            }
        };
        loadFormData();
    }, []);

    // Keep Bootstrap Variables up-to-date with current variables
    useEffect(() => {
        setFormData((prev) => {
            const independentVars = prev.main.IndependentVariables
                ? [...prev.main.IndependentVariables]
                : [];
            const usedVariables = [
                prev.main.GroupingVariable,
                ...independentVars,
                prev.main.SelectionVariable,
            ];
            const updatedVariables = variables
                .filter((v) => !usedVariables.includes(v.name))
                .map((v) => v.name);
            return {
                ...prev,
                bootstrap: { ...prev.bootstrap, Variables: updatedVariables },
            };
        });
    }, [
        formData.main.IndependentVariables,
        formData.main.GroupingVariable,
        formData.main.SelectionVariable,
        variables,
    ]);

    const updateFormData = useCallback(
        <T extends keyof DiscriminantType>(
            section: T,
            field: keyof DiscriminantType[T],
            value: DiscriminantType[T][keyof DiscriminantType[T]] | string | number | boolean | string[] | null
        ) => {
            setFormData((prev) => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value,
                },
            }));
        },
        []
    );

    const resetFormData = useCallback(async () => {
        try {
            await clearFormData("Discriminant");
            setFormData({ ...DiscriminantDefault });
        } catch (err) {
            console.error("Failed to clear form data:", err);
        }
    }, []);

    const executeAnalysis = useCallback(
        async (mainData: DiscriminantMainType) => {
            setIsLoading(true);
            setError(null);

            try {
                const newFormData: DiscriminantType = {
                    ...formData,
                    main: mainData,
                };

                await saveFormData("Discriminant", newFormData);

                const configData = newFormData;

                // DEBUG: Log method config before sending
                console.log("[Discriminant] Method config to send:", configData.method);

                const GroupingVariable = mainData.GroupingVariable
                    ? [mainData.GroupingVariable]
                    : [];
                const IndependentVariables = mainData.IndependentVariables || [];
                const SelectionVariable = mainData.SelectionVariable
                    ? [mainData.SelectionVariable]
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

                // Create WebWorker
                const worker = new Worker('/workers/Classify/Discriminant/discriminant.worker.js', { type: 'module' });

                // Send data to worker
                worker.postMessage({
                    group_data: slicedDataForGrouping,
                    independent_data: slicedDataForIndependent,
                    selection_data: slicedDataForSelection,
                    group_data_defs: varDefsForGrouping,
                    independent_data_defs: varDefsForIndependent,
                    selection_data_defs: varDefsForSelection,
                    config_data: configData
                });

                // Handle worker response
                worker.onmessage = async (e) => {
                    const { type, payload, error: workerError } = e.data;

                    if (type === "SUCCESS") {
                        const { formattedResults, log, errors } = payload;

                        console.log("executed", log);
                        console.log("errors", errors);
                        console.log("results", formattedResults);

                        if (errors && errors.length > 0) {
                            console.warn("Analysis warnings:", errors);
                        }

                        await saveDiscriminantResult(formattedResults);
                        setIsLoading(false);
                        worker.terminate();
                    } else {
                        console.error("[Discriminant] Worker Error:", workerError);
                        setError(workerError || "Unknown worker error");
                        setIsLoading(false);
                        worker.terminate();
                    }
                };

                // Handle worker errors
                worker.onerror = (err) => {
                    console.error("[Discriminant] Worker Execution Error:", err);
                    const detail = err.message
                        ? `${err.message} (${err.filename || "unknown"}:${err.lineno || 0}:${err.colno || 0})`
                        : String(err);
                    setError(`Worker Error: ${detail}`);
                    setIsLoading(false);
                    worker.terminate();
                };

            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                setError(message);
                console.error("Discriminant analysis failed:", err);
                setIsLoading(false);
            }
        },
        [formData, dataVariables, variables]
    );

    // Run ONLY the assumption checks and push their output to the result store,
    // without running (or saving) the full discriminant analysis. Resolves when
    // the worker finishes so the caller can drive its own loading/success state.
    const runAssumptions = useCallback(
        async (mainData: DiscriminantMainType) => {
            if (!mainData.GroupingVariable) {
                throw new Error("Please select a Grouping Variable first.");
            }
            if (!mainData.IndependentVariables || mainData.IndependentVariables.length === 0) {
                throw new Error("Please select at least one Independent Variable first.");
            }

            // Lightweight config: force all three assumption checks on and skip
            // the heavy/method-specific work (stepwise, bootstrap). Assumptions
            // are method-independent, so this is safe and fast.
            const configData: DiscriminantType = {
                ...formData,
                main: { ...mainData, Together: true, Stepwise: false },
                bootstrap: { ...formData.bootstrap, PerformBootStrapping: false },
                assumptions: {
                    Multicollinearity: true,
                    MultivariateNormality: true,
                    UnivariateNormality: true,
                },
            };

            const GroupingVariable = [mainData.GroupingVariable];
            const IndependentVariables = mainData.IndependentVariables || [];
            const SelectionVariable = mainData.SelectionVariable ? [mainData.SelectionVariable] : [];

            const slicedDataForGrouping = getSlicedData({ dataVariables, variables, selectedVariables: GroupingVariable });
            const slicedDataForIndependent = getSlicedData({ dataVariables, variables, selectedVariables: IndependentVariables });
            const slicedDataForSelection = getSlicedData({ dataVariables, variables, selectedVariables: SelectionVariable });
            const varDefsForGrouping = getVarDefs(variables, GroupingVariable);
            const varDefsForIndependent = getVarDefs(variables, IndependentVariables);
            const varDefsForSelection = getVarDefs(variables, SelectionVariable);

            await new Promise<void>((resolve, reject) => {
                const worker = new Worker('/workers/Classify/Discriminant/discriminant.worker.js', { type: 'module' });
                worker.postMessage({
                    group_data: slicedDataForGrouping,
                    independent_data: slicedDataForIndependent,
                    selection_data: slicedDataForSelection,
                    group_data_defs: varDefsForGrouping,
                    independent_data_defs: varDefsForIndependent,
                    selection_data_defs: varDefsForSelection,
                    config_data: configData,
                });

                worker.onmessage = async (e) => {
                    const { type, payload, error: workerError } = e.data;
                    if (type === "SUCCESS") {
                        try {
                            await saveDiscriminantAssumptions(payload.formattedResults);
                            resolve();
                        } catch (err) {
                            reject(err instanceof Error ? err : new Error(String(err)));
                        } finally {
                            worker.terminate();
                        }
                    } else {
                        worker.terminate();
                        reject(new Error(workerError || "Unknown worker error"));
                    }
                };

                worker.onerror = (err) => {
                    worker.terminate();
                    reject(new Error(err.message || "Worker error"));
                };
            });
        },
        [formData, dataVariables, variables]
    );

    return {
        formData,
        updateFormData,
        executeAnalysis,
        runAssumptions,
        resetFormData,
        isLoading,
        error,
    };
};