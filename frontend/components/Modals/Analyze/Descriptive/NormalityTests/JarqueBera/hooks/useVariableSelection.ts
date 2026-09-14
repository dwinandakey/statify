import { useState, useCallback, useMemo } from 'react';
import { useVariableStore } from '@/stores/useVariableStore';
import type { Variable } from '@/types/Variable';

interface HighlightedVariable {
    tempId: string;
    source: string;
}

/**
 * Hook untuk mengelola pemilihan variabel di Jarque-Bera Test
 *
 * Jarque-Bera Test hanya memerlukan test variables (variabel numerik),
 * tidak memerlukan grouping/factor variable seperti Bartlett Test.
 */
export function useVariableSelection() {
    const variables = useVariableStore((state: any) => state.variables);
    const [testVariables, setTestVariables] = useState<Variable[]>([]);
    const [highlightedVariable, setHighlightedVariable] = useState<HighlightedVariable | null>(null);

    // Variabel yang tersedia (belum dipilih)
    // Hanya tampilkan tipe NUMERIC untuk Jarque-Bera Test
    const availableVariables = useMemo(() => {
        return variables.filter((v: Variable) => {
            // Hanya tampilkan tipe NUMERIC (Scale)
            const validType = v.type && ['NUMERIC', 'DOT', 'COMMA', 'SCIENTIFIC'].includes(v.type);
            if (!validType) return false;

            // Exclude variabel yang sudah dipilih
            const isInTestVars = testVariables.some(tv => tv.name === v.name);
            return !isInTestVars;
        });
    }, [variables, testVariables]);

    /**
     * Pindahkan variabel ke daftar test variables
     */
    const moveToTestVariables = useCallback((variable: Variable, targetIndex?: number) => {
        setTestVariables(prev => {
            if (targetIndex !== undefined) {
                const newList = [...prev];
                newList.splice(targetIndex, 0, variable);
                return newList;
            }
            return [...prev, variable];
        });
        setHighlightedVariable(null);
    }, []);

    /**
     * Hapus variabel dari test variables
     */
    const removeFromTestVariables = useCallback((variable: Variable) => {
        setTestVariables(prev => prev.filter(v => v.name !== variable.name));
    }, []);

    /**
     * Pindahkan variabel kembali ke daftar yang tersedia
     */
    const moveToAvailableVariables = useCallback((variable: Variable) => {
        removeFromTestVariables(variable);
        setHighlightedVariable(null);
    }, [removeFromTestVariables]);

    /**
     * Urutkan ulang variabel
     */
    const reorderVariables = useCallback((source: 'available' | 'test', variables: Variable[]) => {
        if (source === 'test') {
            setTestVariables(variables);
        }
    }, []);

    /**
     * Reset semua pilihan variabel
     */
    const resetVariableSelection = useCallback(() => {
        setTestVariables([]);
        setHighlightedVariable(null);
    }, []);

    return {
        availableVariables,
        testVariables,
        highlightedVariable,
        setHighlightedVariable,
        moveToTestVariables,
        moveToAvailableVariables,
        removeFromTestVariables,
        reorderVariables,
        resetVariableSelection,
    };
}
