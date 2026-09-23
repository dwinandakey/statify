"use client";

import React, { useEffect, useState } from "react";
import { NormalizationMethod, MissingValueMethod } from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
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

    const handleMissingValueChange = (value: string) => {
        const method = value as MissingValueMethod;

        setOptionsState((prevState) => ({
            ...prevState,
            MissingValueMethod: method,
        }));

        updateFormData("MissingValueMethod", method);
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

                {/* ========== DISTANCE MATRIX ========== */}
                <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="font-bold">Distance Matrix</Label>
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
                            Distance Matrix Between Medoids
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
                            Distance Matrix of All Objects
                        </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The all-objects table is paginated to maintain performance.
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
                                No Normalization
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="NormalizationZScore" value="zscore" />
                            <Label
                                htmlFor="NormalizationZScore"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Standardize Data (Z-score)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem id="NormalizationMinMax" value="minmax" />
                            <Label
                                htmlFor="NormalizationMinMax"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Min-Max Normalization (0-1)
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* ========== MISSING VALUES ========== */}
                <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="font-bold">Missing Values</Label>

                    {/* Real impact on the selected data, shown right where the strategy is
                        chosen. The full recap remains in the Case Processing Summary. */}
                    {missingStats && (
                        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                            <p className="text-xs text-foreground">
                                <span className="font-medium">
                                    {missingStats.rowsWithMissing} of {missingStats.totalRows} rows
                                    ({missingStats.missingPercent}%)
                                </span>{" "}
                                contain missing values
                                {missingStats.topVariables ? ` — ${missingStats.topVariables}` : ""}
                                {missingStats.remainingVariables > 0
                                    ? `, +${missingStats.remainingVariables} more variable(s)`
                                    : ""}
                            </p>
                        </div>
                    )}

                    <RadioGroup
                        value={optionsState.MissingValueMethod ?? MissingValueMethod.Listwise}
                        onValueChange={handleMissingValueChange}
                        className="gap-3"
                    >
                        <div className="flex items-start space-x-2">
                            <RadioGroupItem
                                id="MissingValueListwise"
                                value={MissingValueMethod.Listwise}
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <Label
                                    htmlFor="MissingValueListwise"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Listwise Deletion
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Rows with a missing value on any variable are removed from
                                    the analysis.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-2">
                            <RadioGroupItem
                                id="MissingValueMedian"
                                value={MissingValueMethod.Median}
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <Label
                                    htmlFor="MissingValueMedian"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Median Imputation
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Rows are kept; empty cells are filled with the variable&apos;s
                                    median so the distance matrix stays numeric and outlier-resistant.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-2">
                            <RadioGroupItem
                                id="MissingValueKnn"
                                value={MissingValueMethod.Knn}
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <Label
                                    htmlFor="MissingValueKnn"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    KNN Imputation
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Rows are kept; empty cells are filled with the average of the
                                    k nearest rows, based on the variables that are available.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>
            </div>
        </div>
    );
};
