"use client";

import React from "react";
import type {
    KMedoidsClusterEvaluationType,
    KMedoidsClusterEvaluationProps,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";

/**
 * ========================================
 * EVALUATION DIALOG
 * ========================================
 * Metrik evaluasi kualitas clustering:
 * - Silhouette Coefficient (WAJIB - pengganti ANOVA)
 * - Silhouette Plot (Visualization)
 */
export const KMedoidsClusterEvaluation = ({
    data,
    updateFormData,
}: KMedoidsClusterEvaluationProps) => {
    const handleChange = (
        field: keyof KMedoidsClusterEvaluationType,
        value: CheckedState | boolean | null
    ) => {
        updateFormData(field, value === true);
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ShowSilhouettePlot"
                        checked={data.ShowSilhouettePlot}
                        onCheckedChange={(checked) =>
                            handleChange("ShowSilhouettePlot", checked)
                        }
                    />
                    <label
                        htmlFor="ShowSilhouettePlot"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Silhouette Score per Objek
                    </label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ShowSilhouetteByCluster"
                        checked={data.ShowSilhouetteByCluster}
                        onCheckedChange={(checked) =>
                            handleChange("ShowSilhouetteByCluster", checked)
                        }
                    />
                    <label
                        htmlFor="ShowSilhouetteByCluster"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Silhouette Scores by Cluster
                    </label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ShowOptimalKChart"
                        checked={data.ShowOptimalKChart}
                        onCheckedChange={(checked) =>
                            handleChange("ShowOptimalKChart", checked)
                        }
                    />
                    <label
                        htmlFor="ShowOptimalKChart"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Grafik K Optimal
                    </label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ShowOverallQualityAssessment"
                        checked={data.ShowOverallQualityAssessment}
                        onCheckedChange={(checked) =>
                            handleChange("ShowOverallQualityAssessment", checked)
                        }
                    />
                    <label
                        htmlFor="ShowOverallQualityAssessment"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Overall Quality Assessment
                    </label>
                </div>
            </div>

        </div>
    );
};
