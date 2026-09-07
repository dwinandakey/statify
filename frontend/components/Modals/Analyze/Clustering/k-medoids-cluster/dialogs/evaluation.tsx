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
                        Pilih metrik dan grafik evaluasi yang ditampilkan pada output.
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
                                Silhouette Plot (per objek)
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Grafik batang silhouette untuk setiap objek, dikelompokkan per cluster.
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
                                Ringkasan skor silhouette rata-rata beserta interpretasi kekuatan
                                struktur cluster.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========== K OPTIMAL ========== */}
                <div className="flex flex-col gap-3 w-full">
                    <Label className="font-semibold">K Optimal</Label>

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
                                Grafik K Optimal
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Kurva silhouette / elbow untuk tiap kandidat k.
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
                                Tabel K Optimal
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                                Nilai cost dan silhouette per k dalam bentuk tabel.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Pada mode k manual, mengaktifkan salah satunya membuat sistem tetap
                        mengevaluasi rentang k untuk menghasilkan data pembanding.
                    </p>
                </div>
            </div>
        </div>
    );
};
