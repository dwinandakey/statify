import type { FC } from "react";
import React, { useCallback, useMemo, useEffect } from "react";
import type { Variable } from "@/types/Variable";
import type { DataRow } from "@/types/Data";
import type { TargetListConfig } from '@/components/Common/VariableListManager';
import VariableListManager from '@/components/Common/VariableListManager';
import { saveFormData } from "@/hooks/useIndexedDB";

interface VariablesTabProps {
    availableVariables: Variable[];
    dependentVariable: Variable[];
    independentVariable: Variable[];
    highlightedVariable: { columnIndex: number, source: string } | null;
    setAvailableVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
    setDependentVariable: React.Dispatch<React.SetStateAction<Variable[]>>;
    setIndependentVariable: React.Dispatch<React.SetStateAction<Variable[]>>;
    setHighlightedVariable: React.Dispatch<React.SetStateAction<{ columnIndex: number, source: string } | null>>;
    containerType?: string;
    data?: DataRow[];
}

const VariablesTab: FC<VariablesTabProps> = ({
    availableVariables,
    dependentVariable,
    independentVariable,
    highlightedVariable,
    setAvailableVariables,
    setDependentVariable,
    setIndependentVariable,
    setHighlightedVariable,
    containerType: _containerType,
    data,
}) => {
    const variableIdKeyToUse: keyof Variable = 'columnIndex';

    useEffect(() => {
        if (dependentVariable.length > 0 || independentVariable.length > 0) {
            saveFormData("ECM", { dependentVariable, independentVariable, prevDataRef: data }, "variables");
        }
    }, [dependentVariable, independentVariable, data]);

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
            title: 'Independent Variable (X):',
            variables: independentVariable,
            height: '100px',
            draggableItems: true,
            droppable: true,
            // maxItems: unlimited
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

    const handleMoveVariable = useCallback((variable: Variable, fromListId: string, toListId: string, _targetIndex?: number) => {
        // Remove from source
        if (fromListId === 'dependent') {
            setDependentVariable(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        } else if (fromListId === 'independent') {
            setIndependentVariable(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        } else if (fromListId === 'available') {
            setAvailableVariables(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        }

        // Add to target
        if (toListId === 'dependent') {
            setDependentVariable([variable]); // Only one item
        } else if (toListId === 'independent') {
            setIndependentVariable(prev => [...prev, variable]); // Allow multiple
        } else if (toListId === 'available') {
            setAvailableVariables(prev => [...prev, variable]);
        }
    }, [setAvailableVariables, setDependentVariable, setIndependentVariable]);

    const handleReorderVariables = useCallback((listId: string, variables: Variable[]) => {
        if (listId === 'dependent') {
            setDependentVariable(variables);
        } else if (listId === 'independent') {
            setIndependentVariable(variables);
        }
    }, [setDependentVariable, setIndependentVariable]);

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
