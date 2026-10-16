import { useState } from "react";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore, CellUpdate } from "@/stores/useDataStore";
import { Variable } from "@/types/Variable";
import { toast } from "sonner";

export type SplitMode = "holdout" | "rolling";
export type RollingType = "expanding" | "fixed";

export interface TimeSeriesSplitState {
    splitEnabled: boolean;
    splitMode: SplitMode;
    rollingType: RollingType;
    trainRatio: number;
    saveSplitVariable: boolean;
    savePredictions: boolean;
}

export const useTimeSeriesSplit = (initialTrainRatio = 0.8) => {
    const [splitEnabled, setSplitEnabled] = useState(false);
    const [splitMode, setSplitMode] = useState<SplitMode>("holdout");
    const [rollingType, setRollingType] = useState<RollingType>("expanding");
    const [trainRatio, setTrainRatio] = useState<number>(initialTrainRatio);
    const [saveSplitVariable, setSaveSplitVariable] = useState(false);
    const [savePredictions, setSavePredictions] = useState(false);

    const calculateSplitCounts = (totalObs: number) => {
        if (totalObs <= 0) return { trainSize: 0, testSize: 0, splitIndex: 0 };
        const trainSize = Math.max(2, Math.floor(totalObs * trainRatio));
        const testSize = Math.max(1, totalObs - trainSize);
        return {
            trainSize,
            testSize,
            splitIndex: trainSize
        };
    };

    const resetSplit = () => {
        setSplitEnabled(false);
        setSplitMode("holdout");
        setRollingType("expanding");
        setTrainRatio(initialTrainRatio);
        setSaveSplitVariable(false);
        setSavePredictions(false);
    };

    /**
     * Helper to save split indicator and/or out-of-sample predictions into Statify Data View
     */
    const saveSplitToDataView = async ({
        totalRows,
        validRowIndices,
        splitIndex,
        testPredictions,
        modelLabel = "TS"
    }: {
        totalRows: number;
        validRowIndices?: number[]; // If listwise deletion was applied
        splitIndex: number;
        testPredictions?: number[];
        modelLabel?: string;
    }) => {
        if (!saveSplitVariable && (!savePredictions || !testPredictions)) {
            return;
        }

        try {
            const existingVars = useVariableStore.getState().variables;
            const existingNames = existingVars.map(v => v.name);

            const findNextNumber = (prefix: string) => {
                const pattern = new RegExp(`^${prefix}_(\\d+)$`, "i");
                let maxNum = 0;
                existingNames.forEach(name => {
                    const match = name.match(pattern);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                });
                return maxNum + 1;
            };

            const currentVarCount = existingVars.length;
            const varsForStore: Partial<Variable>[] = [];
            const aggregatedUpdates: CellUpdate[] = [];
            let addedIndex = 0;

            // 1. Save Split Variable (TRAIN / TEST)
            if (saveSplitVariable) {
                const splitNum = findNextNumber("SPLIT");
                const splitColIdx = currentVarCount + addedIndex;
                addedIndex++;

                varsForStore.push({
                    name: `SPLIT_${splitNum}`,
                    label: `Train-Test Partition (${modelLabel})`,
                    type: "STRING",
                    width: 8,
                    decimals: 0,
                    measure: "nominal",
                    columnIndex: splitColIdx
                });

                if (validRowIndices && validRowIndices.length > 0) {
                    validRowIndices.forEach((actualRowIdx, i) => {
                        const tag = i < splitIndex ? "TRAIN" : "TEST";
                        aggregatedUpdates.push({
                            row: actualRowIdx,
                            col: splitColIdx,
                            value: tag
                        });
                    });
                } else {
                    for (let r = 0; r < totalRows; r++) {
                        const tag = r < splitIndex ? "TRAIN" : "TEST";
                        aggregatedUpdates.push({
                            row: r,
                            col: splitColIdx,
                            value: tag
                        });
                    }
                }
            }

            // 2. Save Out-of-Sample Predictions
            if (savePredictions && testPredictions && testPredictions.length > 0) {
                const predNum = findNextNumber("PRED_TEST");
                const predColIdx = currentVarCount + addedIndex;
                addedIndex++;

                varsForStore.push({
                    name: `PRED_TEST_${predNum}`,
                    label: `Out-of-Sample Forecast (${modelLabel})`,
                    type: "NUMERIC",
                    width: 12,
                    decimals: 5,
                    measure: "scale",
                    columnIndex: predColIdx
                });

                if (validRowIndices && validRowIndices.length > 0) {
                    const testValidRows = validRowIndices.slice(splitIndex);
                    testPredictions.forEach((val, i) => {
                        if (i < testValidRows.length) {
                            aggregatedUpdates.push({
                                row: testValidRows[i],
                                col: predColIdx,
                                value: typeof val === "number" ? Number(val.toFixed(5)) : val
                            });
                        }
                    });
                } else {
                    testPredictions.forEach((val, i) => {
                        const r = splitIndex + i;
                        if (r < totalRows) {
                            aggregatedUpdates.push({
                                row: r,
                                col: predColIdx,
                                value: typeof val === "number" ? Number(val.toFixed(5)) : val
                            });
                        }
                    });
                }
            }

            if (varsForStore.length > 0) {
                await useVariableStore.getState().addVariables(varsForStore, aggregatedUpdates);
                toast.success(`Data partition variables successfully saved to Data View (${varsForStore.map(v => v.name).join(", ")})`);
            }
        } catch (err) {
            console.error("Error saving split variables to Data View:", err);
            toast.error("Gagal menyimpan variabel partisi ke Data View");
        }
    };

    return {
        splitEnabled,
        setSplitEnabled,
        splitMode,
        setSplitMode,
        rollingType,
        setRollingType,
        trainRatio,
        setTrainRatio,
        saveSplitVariable,
        setSaveSplitVariable,
        savePredictions,
        setSavePredictions,
        calculateSplitCounts,
        saveSplitToDataView,
        resetSplit
    };
};
