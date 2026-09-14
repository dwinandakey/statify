import type { FC } from "react";
import React, { useCallback } from "react";
import type { TargetListConfig } from '@/components/Common/VariableListManager';
import VariableListManager from '@/components/Common/VariableListManager';
import { ActiveElementHighlight } from "@/components/Common/TourComponents";
import type { Variable } from "@/types/Variable";
import type { TourStep } from "../types";

interface VariablesTabProps {
    availableVariables: Variable[];
    testVariables: Variable[];
    highlightedVariable: { tempId: string, source: string } | null;
    setHighlightedVariable: (value: { tempId: string, source: string } | null) => void;
    moveToTestVariables: (variable: Variable, targetIndex?: number) => void;
    moveToAvailableVariables: (variable: Variable) => void;
    reorderVariables: (source: 'available' | 'test', variables: Variable[]) => void;
    tourActive?: boolean;
    currentStep?: number;
    tourSteps?: TourStep[];
}

/**
 * Tab Variables untuk Jarque-Bera Test
 *
 * Jarque-Bera Test hanya memerlukan test variables (variabel numerik),
 * tidak memerlukan grouping variable.
 */
const VariablesTab: FC<VariablesTabProps> = ({
    availableVariables,
    testVariables,
    highlightedVariable,
    setHighlightedVariable,
    moveToTestVariables,
    moveToAvailableVariables,
    reorderVariables,
    tourActive = false,
    currentStep = 0,
    tourSteps = [],
}) => {
    const variableIdKeyToUse: keyof Variable = 'tempId';

    const getDisplayName = (variable: Variable) => {
        if (!variable.label) return variable.name;
        return `${variable.label} [${variable.name}]`;
    };

    /**
     * Menentukan apakah variabel di-disable
     * Jarque-Bera Test hanya menerima variabel numerik (scale)
     */
    const isVariableDisabled = useCallback((variable: Variable, targetList?: string): boolean => {
        // Untuk Test Variables: harus scale (numerik/kontinu)
        if (!targetList || targetList === 'test') {
            // Jika measure unknown, fallback ke pengecekan tipe - hanya NUMERIC yang diizinkan
            if (!variable.measure || variable.measure === 'unknown') {
                return !['NUMERIC', 'DOT', 'COMMA', 'SCIENTIFIC'].includes(variable.type || '');
            }
            // Jika measure sudah didefinisikan, harus scale
            return variable.measure !== 'scale';
        }

        return false;
    }, []);

    const handleDoubleClick = (variable: Variable, sourceListId: string) => {
        if (sourceListId === 'available') {
            if (isVariableDisabled(variable)) {
                return;
            }
            moveToTestVariables(variable);
            return;
        }

        if (sourceListId === 'test') {
            moveToAvailableVariables(variable);
        }
    };

    const targetLists: TargetListConfig[] = [
        {
            id: 'test',
            title: 'Test Variable(s):',
            variables: testVariables,
            height: '300px'  // Lebih tinggi karena tidak ada factor variable
        }
    ];

    const managerHighlightedVariable = highlightedVariable
        ? { id: highlightedVariable.tempId, source: highlightedVariable.source }
        : null;

    const setManagerHighlightedVariable = useCallback((value: { id: string, source: string } | null) => {
        if (value && ['available', 'test'].includes(value.source)) {
            setHighlightedVariable({ tempId: value.id, source: value.source });
        } else {
            setHighlightedVariable(null);
        }
    }, [setHighlightedVariable]);

    const handleMoveVariable = useCallback((variable: Variable, fromListId: string, toListId: string, targetIndex?: number) => {
        if (toListId !== 'available' && isVariableDisabled(variable, toListId)) {
            return;
        }

        if (toListId === 'test') {
            moveToTestVariables(variable, targetIndex);
        } else if (toListId === 'available') {
            if (fromListId === 'test') {
                moveToAvailableVariables(variable);
            }
        }
    }, [moveToTestVariables, moveToAvailableVariables, isVariableDisabled]);

    const handleReorderVariables = useCallback((listId: string, variables: Variable[]) => {
        if (listId === 'test') {
            reorderVariables('test', variables);
        }
    }, [reorderVariables]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <VariableListManager
                    availableVariables={availableVariables}
                    targetLists={targetLists}
                    variableIdKey={variableIdKeyToUse}
                    highlightedVariable={managerHighlightedVariable}
                    setHighlightedVariable={setManagerHighlightedVariable}
                    onMoveVariable={handleMoveVariable}
                    onReorderVariable={handleReorderVariables}
                    onVariableDoubleClick={handleDoubleClick}
                    getDisplayName={getDisplayName}
                    isVariableDisabled={isVariableDisabled}
                />

                {/* Tour Guide Highlight Overlays */}
                <div id="jarque-bera-available-variables" className="absolute top-0 left-0 w-[48%] h-full pointer-events-none rounded-md">
                    <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'jarque-bera-available-variables')} />
                </div>
                <div id="jarque-bera-test-variables" className="absolute top-0 right-0 w-[48%] h-full pointer-events-none rounded-md">
                    <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'jarque-bera-test-variables')} />
                </div>
            </div>

            {/* Info box tentang Jarque-Bera Test */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">ℹ️ About Jarque-Bera Test</p>
                <p className="text-xs">
                    Select numeric (Scale) variables to test their normality.
                    The test examines skewness and kurtosis to determine if data follows a normal distribution.
                    Recommended for large samples (n &gt; 30).
                </p>
            </div>
        </div>
    );
};

export default VariablesTab;
