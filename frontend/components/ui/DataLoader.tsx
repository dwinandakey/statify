"use client";

import { useEffect } from "react";
import { useDataStore } from "@/stores/useDataStore";
import { useResultStore } from "@/stores/useResultStore";
import { useVariableStore, createDefaultVariable } from "@/stores/useVariableStore";
import { useMetaStore } from "@/stores/useMetaStore";
import { Variable } from "@/types/Variable";
import { variableService } from "@/services/data";

// This component remains at the application level to ensure all data is loaded
export default function DataLoader() {
    const loadData = useDataStore((state) => state.loadData);
    const data = useDataStore((state) => state.data);
    const loadVariables = useVariableStore((state) => state.loadVariables);
    const variables = useVariableStore((state) => state.variables);
    const setVariables = useVariableStore((state) => state.setVariables);
    const loadResults = useResultStore((state) => state.loadResults);
    const loadMeta = useMetaStore((state) => state.loadMeta);

    useEffect(() => {
        // Load all required data in parallel
        const loadAllData = async () => {
            try {
                await Promise.all([
                    loadData(),
                    loadVariables(),
                    loadResults(),
                    loadMeta()
                ]);
            } catch (error) {
                console.error("Failed to load application data:", error);
            }
        };

        loadAllData();
    }, [loadData, loadVariables, loadResults, loadMeta]);

    // Auto-regenerate variable metadata if data exists but variables are missing
    useEffect(() => {
        const regenerateVariables = async () => {
            // Check if we have data rows but no variable metadata
            if (data && data.length > 0 && (!variables || variables.length === 0)) {
                const firstRow = data[0];
                if (firstRow && firstRow.length > 0) {
                    console.warn("[DataLoader] Data exists but variables are missing. Auto-generating variable metadata...");
                    
                    // Create variable definitions for each column in the data
                    const generatedVariables: Variable[] = [];
                    for (let i = 0; i < firstRow.length; i++) {
                        const newVar = createDefaultVariable(i, generatedVariables);
                        generatedVariables.push(newVar);
                        
                        // Save to IndexedDB
                        try {
                            await variableService.saveVariable(newVar);
                        } catch (err) {
                            console.error(`[DataLoader] Failed to save variable at index ${i}:`, err);
                        }
                    }
                    
                    // Update the store with the generated variables
                    setVariables(generatedVariables);
                    console.log(`[DataLoader] Auto-generated ${generatedVariables.length} variable definitions.`);
                }
            }
        };

        regenerateVariables();
    }, [data, variables, setVariables]);

    return null;
}