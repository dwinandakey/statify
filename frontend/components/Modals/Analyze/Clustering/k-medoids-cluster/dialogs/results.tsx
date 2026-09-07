"use client";

import React, { useEffect, useState } from "react";
import type {
    KMedoidsClusterResultsProps,
    KMedoidsClusterResultsType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Label } from "@/components/ui/label";

/**
 * ========================================
 * RESULTS DIALOG
 * ========================================
 * Konfigurasi output hasil clustering:
 * - Final medoids (setara Final Cluster Centers SPSS)
 * - Cluster membership
 * - Case count per cluster
 * - Iteration history
 * - Total cost/dissimilarity
 */
export const KMedoidsClusterResults = ({
    updateFormData,
    data,
    iterateData,
}: KMedoidsClusterResultsProps) => {
    const [resultsState, setResultsState] = useState<KMedoidsClusterResultsType>({
        ...data,
    });

    useEffect(() => {
        setResultsState({ ...data });
    }, [data]);

    const handleChange = (
        field: keyof KMedoidsClusterResultsType,
        value: CheckedState | boolean | null
    ) => {
        const normalizedValue = value === true;
        setResultsState((prevState) => {
            const nextState: KMedoidsClusterResultsType = {
                ...prevState,
                [field]: normalizedValue,
            };

            // Tampilan konvergensi selalu menyertakan detail histori iterasi.
            if (field === "ShowConvergenceAlgorithm" && normalizedValue) {
                nextState.ShowIterationHistory = true;
            }

            return nextState;
        });

        updateFormData(field, normalizedValue);
        if (field === "ShowConvergenceAlgorithm" && normalizedValue) {
            updateFormData("ShowIterationHistory", true);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="space-y-4">
                <div className="w-full">
                    <Label className="font-bold text-base mb-3 block">
                        Clustering Results Output
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        Select which clustering results to display in the output
                    </p>
                </div>

                {/* ========== OUTPUT UTAMA (WAJIB) ========== */}
                <div className="flex flex-col gap-3 w-full border-b pb-4">
                    <Label className="font-semibold">Core Outputs (Recommended)</Label>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowClusterMembership"
                            checked={resultsState.ShowClusterMembership}
                            onCheckedChange={(checked) =>
                                handleChange("ShowClusterMembership", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowClusterMembership"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Cluster Membership
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Show which cluster each case belongs to (per-case assignment).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowCaseCount"
                            checked={resultsState.ShowCaseCount}
                            onCheckedChange={(checked) =>
                                handleChange("ShowCaseCount", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowCaseCount"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Number of Cases per Cluster
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Summary table showing count of cases in each cluster.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowClusterMedoids"
                            checked={resultsState.ShowClusterMedoids}
                            onCheckedChange={(checked) =>
                                handleChange("ShowClusterMedoids", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowClusterMedoids"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Cluster Medoids
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Show medoid cases for each cluster in Data Tables.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========== OUTPUT TAMBAHAN ========== */}
                <div className="flex flex-col gap-3 w-full">
                    <Label className="font-semibold">Additional Information (Optional)</Label>

                    {iterateData?.Method !== "CLARA" && (
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="ShowConvergenceAlgorithm"
                                checked={resultsState.ShowConvergenceAlgorithm}
                                onCheckedChange={(checked) =>
                                    handleChange("ShowConvergenceAlgorithm", checked)
                                }
                            />
                            <div className="flex-1">
                                <label
                                    htmlFor="ShowConvergenceAlgorithm"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Konvergensi Algoritma
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tampilkan output konvergensi algoritma: panel status konvergensi, grafik biaya per iterasi,
                                    dan tabel histori iterasi.
                                </p>
                            </div>
                        </div>
                    )}

                    {iterateData?.Method === "CLARA" && (
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="ShowSamplingHistory"
                                checked={resultsState.ShowSamplingHistory}
                                onCheckedChange={(checked) =>
                                    handleChange("ShowSamplingHistory", checked)
                                }
                            />
                            <div className="flex-1">
                                <label
                                    htmlFor="ShowSamplingHistory"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Histori Sampling (CLARA)
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tampilkan grafik dan tabel histori biaya (cost) untuk setiap sampel yang diambil pada metode CLARA.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            

        </div>
    );
};
