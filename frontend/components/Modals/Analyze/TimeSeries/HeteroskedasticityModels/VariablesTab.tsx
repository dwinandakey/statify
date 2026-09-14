import type { FC } from "react";
import React, { useCallback, useMemo, useEffect } from "react";
import type { Variable } from "@/types/Variable";
import type { TargetListConfig } from '@/components/Common/VariableListManager';
import VariableListManager from '@/components/Common/VariableListManager';
import { saveFormData } from "@/hooks/useIndexedDB";

interface VariablesTabProps {
    availableVariables: Variable[];
    selectedVariables: Variable[];
    highlightedVariable: { columnIndex: number, source: 'available' | 'selected' } | null;
    setAvailableVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
    setSelectedVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
    setHighlightedVariable: React.Dispatch<React.SetStateAction<{ columnIndex: number, source: 'available' | 'selected' } | null>>;
    containerType?: string;
}

const VariablesTab: FC<VariablesTabProps> = ({
    availableVariables,
    selectedVariables,
    highlightedVariable,
    setAvailableVariables,
    setSelectedVariables,
    setHighlightedVariable,
    containerType,
}) => {
    const variableIdKeyToUse: keyof Variable = 'columnIndex';

    useEffect(() => {
        if (selectedVariables.length > 0) {
            saveFormData("HeteroskedasticityModels", { selectedVariables }, "variables");
        }
    }, [selectedVariables]);

    const filteredAvailableVariables = useMemo(() => {
        return availableVariables.filter((variable) => variable.type === "NUMERIC");
    }, [availableVariables]);

    const targetLists: TargetListConfig[] = [
        {
            id: 'selected',
            title: 'Variable (Returns):',
            variables: selectedVariables,
            height: '100px',
            draggableItems: true,
            droppable: true,
            maxItems: 1,
        }
    ];

    const managerHighlightedVariable = highlightedVariable
        ? { id: highlightedVariable.columnIndex.toString(), source: highlightedVariable.source }
        : null;

    const setManagerHighlightedVariable = useCallback((value: { id: string, source: string } | null) => {
        const colIndex = value ? parseInt(value.id, 10) : null;
        if (value && (value.source === 'available' || value.source === 'selected') && colIndex !== null && !isNaN(colIndex)) {
            setHighlightedVariable({ columnIndex: colIndex, source: value.source as 'available' | 'selected' });
        } else {
            setHighlightedVariable(null);
        }
    }, [setHighlightedVariable]);

    const moveToSelectedVariables = useCallback((variable: Variable, targetIndex?: number) => {
        setAvailableVariables(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        setSelectedVariables(prev => {
            const newSelected = targetIndex !== undefined
                ? [...prev.slice(0, targetIndex), variable, ...prev.slice(targetIndex)]
                : [...prev, variable];
            return newSelected.slice(0, 1);
        });
    }, [setAvailableVariables, setSelectedVariables]);

    const moveToAvailableVariables = useCallback((variable: Variable, targetIndex?: number) => {
        setSelectedVariables(prev => prev.filter(v => v.columnIndex !== variable.columnIndex));
        setAvailableVariables(prev => {
            if (targetIndex !== undefined) {
                return [...prev.slice(0, targetIndex), variable, ...prev.slice(targetIndex)];
            }
            return [...prev, variable];
        });
    }, [setAvailableVariables, setSelectedVariables]);

    const handleMoveVariable = useCallback((variable: Variable, fromListId: string, toListId: string, targetIndex?: number) => {
        if (toListId === 'selected') {
            moveToSelectedVariables(variable, targetIndex);
        } else if (toListId === 'available') {
            moveToAvailableVariables(variable, targetIndex);
        }
    }, [moveToSelectedVariables, moveToAvailableVariables]);

    const reorderVariables = useCallback((source: 'available' | 'selected', variables: Variable[]) => {
        if (source === 'selected') {
            setSelectedVariables(variables);
        } else {
            setAvailableVariables(variables);
        }
    }, [setAvailableVariables, setSelectedVariables]);

    const handleReorderVariables = useCallback((listId: string, variables: Variable[]) => {
        if (listId === 'selected') {
            reorderVariables('selected', variables);
        }
    }, [reorderVariables]);

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
