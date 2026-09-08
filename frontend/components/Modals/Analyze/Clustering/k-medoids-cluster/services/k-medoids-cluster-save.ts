/**
 * K-Medoids Clustering - Variable Save Service
 * Creates new variables for cluster membership and distance-to-medoid
 */

import type { Variable } from '@/types/Variable';
import type { KMedoidsClusterSaveType } from '../types/k-medoids-cluster';

interface SaveVariablesResult {
    variablesToCreate: Partial<Variable>[];
    variableData: Record<string, number[]>; // Map of variable name -> data array
}

/**
 * Creates a default variable definition compatible with useVariableStore
 */
const createClusteringVariable = (
    name: string,
    label: string,
    type: 'NUMERIC' | 'STRING' = 'NUMERIC'
): Partial<Variable> => ({
    name,
    label,
    type,
    width: type === 'STRING' ? 20 : 8,
    decimals: type === 'NUMERIC' ? 2 : 0,
    align: type === 'STRING' ? 'left' : 'right',
    measure: type === 'STRING' ? 'nominal' : 'scale',
    role: 'input',
});

/**
 * Prepares variables to save from K-Medoids clustering results
 * 
 * @param clusterLabels - Array of cluster assignments (0-based indices) per case
 * @param distancesToMedoid - Array of distances to medoid per case (optional)
 * @param saveOptions - User's save configuration
 * @param k - Number of clusters
 * @returns Object containing variable definitions and data arrays
 */
export const prepareKMedoidsSaveVariables = (
    clusterLabels: number[],
    distancesToMedoid: number[] | undefined,
    saveOptions: KMedoidsClusterSaveType,
    k: number
): SaveVariablesResult => {
    
    const variablesToCreate: Partial<Variable>[] = [];
    const variableData: Record<string, number[]> = {};

    // 1. Cluster Membership Variable
    if (saveOptions.ClusterMembership) {
        const varName = 'CLU_1';
        const varLabel = `Cluster Membership (k=${k})`;
        
        variablesToCreate.push(createClusteringVariable(varName, varLabel, 'NUMERIC'));
        
        // Convert 0-based cluster indices to 1-based for SPSS convention
        variableData[varName] = clusterLabels.map(label => label + 1);
    }

    // 2. Distance to Medoid Variable
    if (saveOptions.DistanceClusterCenter && distancesToMedoid && distancesToMedoid.length > 0) {
        const varName = 'DIS_1';
        const varLabel = `Distance from Medoid (k=${k})`;
        
        variablesToCreate.push(createClusteringVariable(varName, varLabel, 'NUMERIC'));
        
        // Store distances as-is (already in metric space from clustering algorithm)
        variableData[varName] = distancesToMedoid;
    }

    return {
        variablesToCreate,
        variableData,
    };
};

/**
 * Validates that save data is consistent with current dataset
 */
export const validateSaveData = (
    variableData: Record<string, number[]>,
    expectedRowCount: number
): { valid: boolean; error?: string } => {
    
    for (const [varName, data] of Object.entries(variableData)) {
        if (!Array.isArray(data)) {
            return {
                valid: false,
                error: `Variable ${varName} data is not an array`
            };
        }
        
        if (data.length !== expectedRowCount) {
            return {
                valid: false,
                error: `Variable ${varName} has ${data.length} rows but expected ${expectedRowCount}`
            };
        }
        
        if (!data.every(v => typeof v === 'number' && isFinite(v))) {
            return {
                valid: false,
                error: `Variable ${varName} contains non-numeric values`
            };
        }
    }
    
    return { valid: true };
};

/**
 * Format save data for direct integration with useDataStore
 * This converts prepared data into cell updates
 */
export const formatSaveDataForStore = (
    variableData: Record<string, number[]>,
    startColumnIndex: number,
    variables: Partial<Variable>[]
): Array<{ rowIndex: number; columnIndex: number; value: number }> => {
    
    const cellUpdates: Array<{ rowIndex: number; columnIndex: number; value: number }> = [];
    
    let currentColIndex = startColumnIndex;
    
    for (const variable of variables) {
        const varName = variable.name;
        if (!varName) continue;
        const data = variableData[varName];
        
        if (!data) continue;
        
        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            cellUpdates.push({
                rowIndex,
                columnIndex: currentColIndex,
                value: data[rowIndex],
            });
        }
        
        currentColIndex++;
    }
    
    return cellUpdates;
};
