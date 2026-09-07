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

    const handleNormalizationToggle = (value: NormalizationMethod) => {
        if (optionsState.NormalizationMethod === value) {
            handleNormalizationChange("none");
            return;
        }

        handleNormalizationChange(value);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 flex-grow">
                <div className="flex flex-col gap-4">
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Cluster Size Distribution
                            </label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="ShowClusterAttributeProfile"
                                checked={optionsState.ShowClusterAttributeProfile}
                                onCheckedChange={(checked) =>
                                    handleChange("ShowClusterAttributeProfile", checked)
                                }
                            />
                            <label
                                htmlFor="ShowClusterAttributeProfile"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Profil Atribut Klaster
                            </label>
                        </div>
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Distance Matrix Between Medoids
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                        <Label className="font-bold">Data Tables</Label>
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Tabel Matriks Jarak (Semua Objek)
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Tabel dipaginasi untuk menjaga performa.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                        <Label className="font-bold">Preprocessing</Label>
                        <RadioGroup
                            value={optionsState.NormalizationMethod}
                            onValueChange={handleNormalizationChange}
                            className="gap-3"
                        >
                            <div
                                className="flex items-center space-x-2"
                                onClick={() =>
                                    handleNormalizationToggle(NormalizationMethod.ZScore)
                                }
                            >
                                <RadioGroupItem id="NormalizationZScore" value="zscore" />
                                <Label
                                    htmlFor="NormalizationZScore"
                                    className="text-sm font-medium leading-none"
                                >
                                    Standarisasi Data (Z-score)
                                </Label>
                            </div>
                            <div
                                className="flex items-center space-x-2"
                                onClick={() =>
                                    handleNormalizationToggle(NormalizationMethod.MinMax)
                                }
                            >
                                <RadioGroupItem id="NormalizationMinMax" value="minmax" />
                                <Label
                                    htmlFor="NormalizationMinMax"
                                    className="text-sm font-medium leading-none"
                                >
                                    Normalisasi Min-Max (0-1)
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
            </div>
        </div>
    );
};
