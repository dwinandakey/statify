import React from 'react';
import type { Variable } from "@/types/Variable";

/**
 * Custom numeric icon (123)
 */
const NumericIcon = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 14 14" 
        className="mr-1 flex-shrink-0"
        aria-label="Numeric data type"
    >
        <text 
            x="50%" 
            y="50%" 
            dominantBaseline="middle" 
            textAnchor="middle" 
            fontSize="8" 
            fontWeight="600" 
            fill="currentColor"
            className="text-green-600"
        >
            123
        </text>
    </svg>
);

/**
 * Custom categorical icon (ABC)
 */
const CategoricalIcon = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 14 14" 
        className="mr-1 flex-shrink-0"
        aria-label="Categorical/String data type"
    >
        <text 
            x="50%" 
            y="50%" 
            dominantBaseline="middle" 
            textAnchor="middle" 
            fontSize="7" 
            fontWeight="600" 
            fill="currentColor"
            className="text-blue-500"
        >
            ABC
        </text>
    </svg>
);

/**
 * Custom icon helper for K-Medoids Cluster
 * Shows different icons based on data type:
 * - Numeric types: "123" icon (green) - Represents numerical data
 * - Categorical/String types: "ABC" icon (blue) - Represents categorical/text data
 */
export const getKMedoidsVariableIcon = (variable: Variable) => {
    const numericTypes: Array<Variable["type"]> = [
        "NUMERIC",
        "COMMA",
        "DOT",
        "SCIENTIFIC",
        "DOLLAR",
        "CCA",
        "CCB",
        "CCC",
        "CCD",
        "CCE",
        "RESTRICTED_NUMERIC",
    ];
    const variableType = variable.type ?? "STRING";

    if (!numericTypes.includes(variableType)) {
        return <CategoricalIcon />;
    }

    return <NumericIcon />;
};

export const getKMedoidsVariableIconByType = (isNumeric: boolean) => {
    return isNumeric ? <NumericIcon /> : <CategoricalIcon />;
};
