import type { FC } from "react";
import React, { useCallback, useMemo, useEffect } from "react";
import type { Variable } from "@/types/Variable";
import type { TargetListConfig } from '@/components/Common/VariableListManager';
import VariableListManager from '@/components/Common/VariableListManager';
import { saveFormData } from "@/hooks/useIndexedDB";

interface VariablesTabProps {
    availableVariables: Variable[];
    dependentVariable: Variable[];
    independentVariables: Variable[];
    highlightedVariable: { columnIndex: number, source: string } | null;
    setAvailableVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
    setDependentVariable: React.Dispatch<React.SetStateAction<Variable[]>>;
    setIndependentVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
    setHighlightedVariable: React.Dispatch<React.SetStateAction<{ columnIndex: number, source: string } | null>>;
    containerType?: string;
}

const VariablesTab: FC<VariablesTabProps> = ({
    availableVariables,
    dependentVariable,
    independentVariables,
    highlightedVariable,
    setAvailableVariables,
    setDependentVariable,
    setIndependentVariables,
    setHighlightedVariable,
    containerType,
}) => {
    const variableIdKeyToUse: keyof Variable = 'columnIndex';

    useEffect(() => {
        if (dependentVariable.length > 0 || independentVariables.length > 0) {
            saveFormData("ARDL", { dependentVariable, independentVariables }, "variables");
        }
    }, [dependentVariable, independentVariables]);

    const filteredAvailableVariables = useMemo(() => {
        return availableVariables.filter((variable) => variable.type === "NUMERIC");
    }, [availableVariables]);

    const targetLists: TargetListConfig[] = [
        {
            id: 'dependent',
            title: 'Dependent Variable (Y):',
            variables: dependentVariable,
            height: '100px',
            draggableItems: true,
            droppable: true,
            maxItems: 1,
        },
        {
            id: 'independent',
            title: 'Independent Variables (X₁, X₂, ...):',
            variables: independentVariables,
            height: '150px',
            draggableItems: true,
            droppable: true,
            maxItems: 5, // Allow multiple X variables (max 5)
        }
    ];

    const managerHighlightedVariable = highlightedVariable
        ? { id: highlightedVariable.columnIndex.toString(), source: highlightedVariable.source }
        : null;

    const setManagerHighlightedVariable = useCallback((value: { id: string, source: string } | null) => {
        const colIndex = value ? parseInt(value.id, 10) : null;
        if (value && colIndex !== null && !isNaN(colIndex)) {
            setHighlightedVariable({ columnIndex: colIndex, source: value.source });
        } else {
            setHighlightedVariable(null);
        }
    }, [setHighlightedVariable]);

    const handleMoveVariable = useCallback((variable: Variable, fromListId: string, toListId: string, targetIndex?: number) => {
        // Remove from source
        if (fromListId === 'dependent') {
            setDependentVariable(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        } else if (fromListId === 'independent') {
            setIndependentVariables(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        } else if (fromListId === 'available') {
            setAvailableVariables(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        }

        // Add to target
        if (toListId === 'dependent') {
            setDependentVariable([variable]); // Only one Y
        } else if (toListId === 'independent') {
            setIndependentVariables(prev => {
                const newVars = targetIndex !== undefined
                    ? [...prev.slice(0, targetIndex), variable, ...prev.slice(targetIndex)]
                    : [...prev, variable];
                return newVars.slice(0, 5); // Max 5 X variables
            });
        } else if (toListId === 'available') {
            setAvailableVariables(prev => [...prev, variable]);
        }
    }, [setAvailableVariables, setDependentVariable, setIndependentVariables]);

    const handleReorderVariables = useCallback((listId: string, variables: Variable[]) => {
        if (listId === 'dependent') {
            setDependentVariable(variables);
        } else if (listId === 'independent') {
            setIndependentVariables(variables);
        }
    }, [setDependentVariable, setIndependentVariables]);

    return (
        <VariableListManager
            availableVariables={filteredAvailableVariables}
            targetLists={targetLists}
            variableIdKey={variableIdKeyToUse}
            highlightedVariable={managerHighlightedVariable}
            setHighlightedVariable={setManagerHighlightedVariable}
            onMoveVariable={handleMoveVariable}
            onReorderVariable={handleReorderVariables}
            onVariableDoubleClick={() => {}}
        />
    );
};

export default VariablesTab;
