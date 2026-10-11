import { useState, useCallback, useMemo } from 'react';
import { useVariableStore } from '@/stores/useVariableStore';
import type { Variable } from '@/types/Variable';

interface HighlightedVariable {
    tempId: string;
    source: string;
}

/**
 * Hook untuk mengelola pemilihan variabel di Bartlett Test
 */
export function useVariableSelection() {
    const variables = useVariableStore((state: any) => state.variables);
    const [testVariables, setTestVariables] = useState<Variable[]>([]);
    const [factorVariable, setFactorVariable] = useState<Variable | null>(null);
    const [highlightedVariable, setHighlightedVariable] = useState<HighlightedVariable | null>(null);

    // Variabel yang tersedia (belum dipilih)
    // Termasuk NUMERIC untuk test variables dan STRING untuk grouping variables
    const availableVariables = useMemo(() => {
        return variables.filter((v: Variable) => {
            // Hanya tampilkan tipe NUMERIC dan STRING
            const validType = v.type && ['NUMERIC', 'DOT', 'COMMA', 'SCIENTIFIC', 'STRING'].includes(v.type);
            if (!validType) return false;

            // Exclude variabel yang sudah dipilih
            const isInTestVars = testVariables.some(tv => tv.name === v.name);
            const isFactorVar = factorVariable?.name === v.name;
            return !isInTestVars && !isFactorVar;
        });
    }, [variables, testVariables, factorVariable]);

    /**
     * Pindahkan variabel ke daftar test variables
     */
    const moveToTestVariables = useCallback((variable: Variable) => {
        setTestVariables(prev => [...prev, variable]);
        setHighlightedVariable(null);
    }, []);

    /**
     * Set variabel faktor/pengelompokan
     */
    const moveToFactorVariable = useCallback((variable: Variable) => {
        setFactorVariable(variable);
        setHighlightedVariable(null);
    }, []);

    /**
     * Hapus variabel dari test variables
     */
    const removeFromTestVariables = useCallback((variable: Variable) => {
        setTestVariables(prev => prev.filter(v => v.name !== variable.name));
    }, []);

    /**
     * Hapus variabel faktor
     */
    const clearFactorVariable = useCallback(() => {
        setFactorVariable(null);
    }, []);

    /**
     * Pindahkan variabel kembali ke daftar yang tersedia
     */
    const moveToAvailableVariables = useCallback((variable: Variable, source: 'test' | 'factor') => {
        if (source === 'test') {
            removeFromTestVariables(variable);
        } else if (source === 'factor') {
            clearFactorVariable();
        }
        setHighlightedVariable(null);
    }, [removeFromTestVariables, clearFactorVariable]);

    /**
     * Urutkan ulang test variables
     */
    const reorderVariables = useCallback((fromIndex: number, toIndex: number) => {
        setTestVariables(prev => {
            const result = [...prev];
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result;
        });
    }, []);

    /**
     * Reset semua pilihan variabel
     */
    const resetVariableSelection = useCallback(() => {
        setTestVariables([]);
        setFactorVariable(null);
        setHighlightedVariable(null);
    }, []);

    return {
        availableVariables,
        testVariables,
        factorVariable,
        highlightedVariable,
        setHighlightedVariable,
        moveToTestVariables,
        moveToFactorVariable,
        moveToAvailableVariables,
        removeFromTestVariables,
        clearFactorVariable,
        reorderVariables,
        resetVariableSelection,
    };
}
