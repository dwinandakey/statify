"use client";

import React, { useEffect, useState } from "react";
import { NormalizationMethod } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import type {
    KMedoidsClusterOptionsProps,
    KMedoidsClusterOptionsType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CheckedState } from "@radix-ui/react-checkbox";

export const KMedoidsClusterOptions = ({
    updateFormData,
    data,
    missingStats,
}: KMedoidsClusterOptionsProps) => {
    const [optionsState, setOptionsState] = useState<KMedoidsClusterOptionsType>({
        ...data,
        NormalizationMethod:
            data.NormalizationMethod ?? (data.Standardize ? "zscore" : "none"),
    });

    useEffect(() => {
        setOptionsState({
            ...data,
            NormalizationMethod:
                data.NormalizationMethod ?? (data.Standardize ? "zscore" : "none"),
        });
    }, [data]);

    const handleChange = (
        field: keyof KMedoidsClusterOptionsType,
        value: CheckedState | boolean | null
    ) => {
        const normalizedValue = value === true;
        setOptionsState((prevState) => ({
            ...prevState,
            [field]: normalizedValue,
        }));
        updateFormData(field, normalizedValue);
    };

    const handleNormalizationChange = (value: string) => {
        const normalizedValue = (value || "none") as NormalizationMethod;
        const shouldStandardize = normalizedValue === "zscore";

        setOptionsState((prevState) => ({
            ...prevState,
            NormalizationMethod: normalizedValue,
            Standardize: shouldStandardize,
        }));

        updateFormData("NormalizationMethod", normalizedValue);
        updateFormData("Standardize", shouldStandardize);
    };

    // Listwise dan pairwise saling eksklusif — satu radio group, dua flag.
    const handleMissingValueChange = (value: string) => {
        const useListWise = value === "ExcludeListWise";

        setOptionsState((prevState) => ({
            ...prevState,
            ExcludeListWise: useListWise,
            ExcludePairWise: !useListWise,
        }));

        updateFormData("ExcludeListWise", useListWise);
        updateFormData("ExcludePairWise", !useListWise);
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="flex flex-col gap-4">
                {/* ========== VISUALISASI ========== */}
                <div className="flex flex-col gap-2">
                    <Label className="font-bold">Visualization</Label>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ShowPCAProjection"
                            checked={optionsState.ShowPCAProjection}
                            onCheckedChange={(checked) =>
                                handleChange("ShowPCAProjection", checked)
                            }
                        />
                        <label
                            htmlFor="ShowPCAProjection"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            PCA Projection
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ShowClusterScatterPlot"
                            checked={optionsState.ShowClusterScatterPlot}
                            onCheckedChange={(checked) =>
                                handleChange("ShowClusterScatterPlot", checked)
                            }
                        />
                        <label
                            htmlFor="ShowClusterScatterPlot"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Cluster Scatter Plot
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ShowClusterSizeDistribution"
                            checked={optionsState.ShowClusterSizeDistribution}
                            onCheckedChange={(checked) =>
                                handleChange("ShowClusterSizeDistribution", checked)
                            }
                        />
                        <label
                            htmlFor="ShowClusterSizeDistribution"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Cluster Size Distribution
                        </label>
                    </div>
                </div>

                {/* ========== MATRIKS JARAK ========== */}
                <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="font-bold">Matriks Jarak</Label>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ShowDistanceMatrixBetweenMedoids"
                            checked={optionsState.ShowDistanceMatrixBetweenMedoids}
                            onCheckedChange={(checked) =>
                                handleChange("ShowDistanceMatrixBetweenMedoids", checked)
                            }
                        />
                        <label
                            htmlFor="ShowDistanceMatrixBetweenMedoids"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Matriks Jarak Antar Medoid
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ShowDistanceMatrixTable"
                            checked={optionsState.ShowDistanceMatrixTable}
                            onCheckedChange={(checked) =>
                                handleChange("ShowDistanceMatrixTable", checked)
                            }
                        />
                        <label
                            htmlFor="ShowDistanceMatrixTable"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Matriks Jarak Semua Objek
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Tabel semua objek dipaginasi untuk menjaga performa.
                    </p>
                </div>

                {/* ========== PREPROCESSING ========== */}
                <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="font-bold">Preprocessing</Label>
                    <RadioGroup
                        value={optionsState.NormalizationMethod ?? "none"}
                        onValueChange={handleNormalizationChange}
                        className="gap-3"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="NormalizationNone" value="none" />
                            <Label
                                htmlFor="NormalizationNone"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Tanpa Normalisasi
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="NormalizationZScore" value="zscore" />
                            <Label
                                htmlFor="NormalizationZScore"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Standarisasi Data (Z-score)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="NormalizationMinMax" value="minmax" />
                            <Label
                                htmlFor="NormalizationMinMax"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Normalisasi Min-Max (0-1)
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* ========== MISSING VALUES ========== */}
                <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="font-bold">Missing Values</Label>

                    {/* Dampak nyata pada data yang dipilih, ditampilkan tepat di tempat
                        strateginya dipilih. Rekap lengkap tetap ada di Case Processing Summary. */}
                    {missingStats && (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                            <p className="text-xs text-foreground">
                                <span className="font-medium">
                                    {missingStats.rowsWithMissing} dari {missingStats.totalRows} baris
                                    ({missingStats.missingPercent}%)
                                </span>{" "}
                                mengandung missing value
                                {missingStats.topVariables ? ` — ${missingStats.topVariables}` : ""}
                                {missingStats.remainingVariables > 0
                                    ? `, +${missingStats.remainingVariables} variabel lain`
                                    : ""}
                            </p>
                        </div>
                    )}

                    <RadioGroup
                        value={
                            optionsState.ExcludePairWise && !optionsState.ExcludeListWise
                                ? "ExcludePairWise"
                                : "ExcludeListWise"
                        }
                        onValueChange={handleMissingValueChange}
                        className="gap-3"
                    >
                        <div className="flex items-start space-x-2">
                            <RadioGroupItem
                                id="ExcludeListWise"
                                value="ExcludeListWise"
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <Label
                                    htmlFor="ExcludeListWise"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Exclude Cases Listwise
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Baris yang punya missing value pada variabel mana pun dihapus
                                    dari analisis.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-2">
                            <RadioGroupItem
                                id="ExcludePairWise"
                                value="ExcludePairWise"
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <Label
                                    htmlFor="ExcludePairWise"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Exclude Cases Pairwise
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Baris dipertahankan selama ada minimal satu nilai valid; sel yang
                                    kosong diisi rata-rata variabelnya agar matriks jarak tetap numerik.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </div>
        </div>
    );
};
