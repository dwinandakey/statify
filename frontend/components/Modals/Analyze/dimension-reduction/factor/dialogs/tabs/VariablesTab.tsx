"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Variable } from "@/types/Variable";
import MultiSelectVariableList, {
    type MultiSelectTargetList,
    type MultiSelection,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/components/MultiSelectVariableList";

interface VariablesTabProps {
    availableVariables: Variable[];
    targetVariables: Variable[];
    selectionVariable: Variable[];
    onMoveVariables: (
        variables: Variable[],
        fromListId: string,
        toListId: string
    ) => void;
    onReorderVariable: (listId: string, variables: Variable[]) => void;
    onOpenValue: () => void;
}

export const VariablesTab: React.FC<VariablesTabProps> = ({
    availableVariables,
    targetVariables,
    selectionVariable,
    onMoveVariables,
    onReorderVariable,
    onOpenValue,
}) => {
    const [selection, setSelection] = useState<MultiSelection | null>(null);

    const targetLists = useMemo<MultiSelectTargetList[]>(
        () => [
            {
                id: "TargetVar",
                title: "Variables:",
                variables: targetVariables,
                height: "145px",
            },
            {
                id: "ValueTarget",
                title: "Selection Variable:",
                variables: selectionVariable,
                height: "auto",
                maxItems: 1,
            },
        ],
        [selectionVariable, targetVariables]
    );

    return (
        <div className="px-6 py-4">
            <div className="rounded-2xl border border-border p-4">
                <MultiSelectVariableList
                    availableVariables={availableVariables}
                    targetLists={targetLists}
                    selection={selection}
                    setSelection={setSelection}
                    onMoveVariables={onMoveVariables}
                    onReorderVariable={onReorderVariable}
                    availableListHeight="320px"
                    availableTitle="Variables:"
                    showHelperText={false}
                    forceHorizontal
                    targetListFooters={{
                        ValueTarget: (
                            <div className="mt-2 flex items-center" key="value-target-footer">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    disabled={selectionVariable.length === 0}
                                    onClick={onOpenValue}
                                >
                                    Value...
                                </Button>
                            </div>
                        ),
                    }}
                />
            </div>
        </div>
    );
};
