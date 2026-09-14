export interface CaseProcessingSummary {
    validN: number;
    validPercent: string;
    missingN: number;
    missingPercent: string;
    totalN: number;
    totalPercent: string;
    initialN: number;
    preprocessedN: number;
    missingRowsRemoved: number;
    outlierRowsRemoved: number;
    missingVariablesText: string;
}

export interface CaseProcessingDetails {
    initialN?: number;
    preprocessedN?: number;
    missingRowsRemoved?: number;
    outlierRowsRemoved?: number;
    missingByVariable?: Record<string, number>;
}

export function recoverMedoidsFromMismatch(
    rawMedoids: number[],
    labels: number[],
    nClusters: number,
    nRows: number
): number[] {
    const recovered: number[] = [];
    const used = new Set<number>();

    for (let cluster = 0; cluster < nClusters; cluster++) {
        const idx = labels.findIndex((label) => label === cluster);
        if (idx >= 0 && idx < nRows && !used.has(idx)) {
            recovered.push(idx);
            used.add(idx);
        }
    }

    for (const medoid of rawMedoids) {
        if (
            Number.isInteger(medoid) &&
            medoid >= 0 &&
            medoid < nRows &&
            !used.has(medoid)
        ) {
            recovered.push(medoid);
            used.add(medoid);
        }
        if (recovered.length === nClusters) break;
    }

    if (recovered.length < nClusters) {
        for (let i = 0; i < nRows && recovered.length < nClusters; i++) {
            if (!used.has(i)) {
                recovered.push(i);
                used.add(i);
            }
        }
    }

    while (recovered.length < nClusters) recovered.push(0);
    return recovered;
}

export function buildCaseProcessingSummary(
    nValid: number,
    nTotal: number,
    details?: CaseProcessingDetails
): CaseProcessingSummary {
    // `nTotal` (dataVariables.length as seen by the caller) is measured AFTER
    // missing-value rows have already been dropped upstream, so it is not a
    // reliable "original data" count. `details.initialN`, when supplied, is
    // captured before any preprocessing and is the true original row count —
    // prefer it for the Total row and for percentage denominators.
    const safeValid = Math.max(0, nValid);
    const outlierRowsRemoved = Math.max(0, details?.outlierRowsRemoved ?? 0);
    const missingRowsRemoved = Math.max(
        0,
        details?.missingRowsRemoved ?? Math.max(0, nTotal - safeValid)
    );
    const initialN = details?.initialN ??
        Math.max(nTotal, safeValid + missingRowsRemoved + outlierRowsRemoved);
    const safeTotal = Math.max(0, initialN);
    const preprocessedN = details?.preprocessedN ?? safeValid;
    const missingByVariable = details?.missingByVariable ?? {};
    const missingEntries = Object.entries(missingByVariable)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
    const missingVariablesText = missingEntries.length > 0
        ? missingEntries.map(([name, count]) => `${name} (${count})`).join(", ")
        : "None";

    return {
        validN: safeValid,
        validPercent: safeTotal > 0 ? ((safeValid / safeTotal) * 100).toFixed(1) : "0.0",
        missingN: missingRowsRemoved,
        missingPercent: safeTotal > 0 ? ((missingRowsRemoved / safeTotal) * 100).toFixed(1) : "0.0",
        totalN: safeTotal,
        totalPercent: "100.0",
        initialN,
        preprocessedN,
        missingRowsRemoved,
        outlierRowsRemoved,
        missingVariablesText,
    };
}
