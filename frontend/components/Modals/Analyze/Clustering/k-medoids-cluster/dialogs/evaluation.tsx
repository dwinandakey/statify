"use client";

import React from "react";
import type {
    KMedoidsClusterEvaluationType,
    KMedoidsClusterEvaluationProps,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Label } from "@/components/ui/label";

/**
 * ========================================
 * EVALUATION DIALOG
 * ========================================
 * Metrik evaluasi kualitas clustering:
 * - Silhouette (plot per objek + ringkasan kualitas)
 * - K Optimal (grafik + tabel, satu grup)
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
            <div className="space-y-4">
                <div className="w-full">
                    <Label className="font-bold text-base mb-3 block">
                        Cluster Quality Evaluation
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        Choose the evaluation metrics and charts shown in the output.
                    </p>
                </div>

                {/* ========== SILHOUETTE ========== */}
                <div className="flex flex-col gap-3 w-full border-b pb-4">
                    <Label className="font-semibold">Silhouette</Label>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowSilhouettePlot"
                            checked={data.ShowSilhouettePlot}
                            onCheckedChange={(checked) =>
                                handleChange("ShowSilhouettePlot", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowSilhouettePlot"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Silhouette Plot (per object)
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Silhouette bar chart for each object, grouped by cluster.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowOverallQualityAssessment"
                            checked={data.ShowOverallQualityAssessment}
                            onCheckedChange={(checked) =>
                                handleChange("ShowOverallQualityAssessment", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowOverallQualityAssessment"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Overall Quality Assessment
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Summary of the average silhouette score along with an interpretation
                                of the cluster structure strength.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========== OPTIMAL K ========== */}
                <div className="flex flex-col gap-3 w-full">
                    <Label className="font-semibold">Optimal K</Label>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowOptimalKChart"
                            checked={data.ShowOptimalKChart}
                            onCheckedChange={(checked) =>
                                handleChange("ShowOptimalKChart", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowOptimalKChart"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Optimal K Chart
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Silhouette / elbow curve for each candidate k.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="ShowOptimalKTable"
                            checked={data.ShowOptimalKTable}
                            onCheckedChange={(checked) =>
                                handleChange("ShowOptimalKTable", checked)
                            }
                        />
                        <div className="flex-1">
                            <label
                                htmlFor="ShowOptimalKTable"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Optimal K Table
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Cost and silhouette values per k in table form.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        In manual k mode, enabling either of these makes the system still evaluate
                        the k range to produce comparison data.
                    </p>
                </div>
            </div>
        </div>
    );
};
