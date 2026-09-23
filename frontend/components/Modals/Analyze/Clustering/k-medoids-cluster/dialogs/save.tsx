"use client";

import React, { useEffect, useState } from "react";
import type {
    KMedoidsClusterSaveProps,
    KMedoidsClusterSaveType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Label } from "@/components/ui/label";

export const KMedoidsClusterSave = ({
    updateFormData,
    data,
}: KMedoidsClusterSaveProps) => {
    const [saveState, setSaveState] = useState<KMedoidsClusterSaveType>({
        ...data,
    });

    useEffect(() => {
        setSaveState({ ...data });
    }, [data]);

    const handleChange = (
        field: keyof KMedoidsClusterSaveType,
        value: CheckedState | number | boolean | string | null
    ) => {
        const normalizedValue = value === true;
        setSaveState((prevState) => ({
            ...prevState,
            [field]: normalizedValue,
        }));

        // Keep parent form state in sync so Analyze uses the latest save options.
        updateFormData(field, normalizedValue);
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="space-y-4">
                <div className="w-full">
                    <Label className="font-bold text-base mb-3 block">
                        Save New Variables to Dataset
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        Adds new columns to the active dataset — unlike the Results tab, which
                        only displays results in the output.
                    </p>
                </div>

                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="ClusterMembership"
                        checked={saveState.ClusterMembership}
                        onCheckedChange={(checked) =>
                            handleChange("ClusterMembership", checked)
                        }
                    />
                    <div className="flex-1">
                        <label
                            htmlFor="ClusterMembership"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Cluster membership
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                            Save the cluster number of each case as a new variable (CLU_1, CLU_2, ...).
                        </p>
                    </div>
                </div>

                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="DistanceClusterCenter"
                        checked={saveState.DistanceClusterCenter}
                        onCheckedChange={(checked) =>
                            handleChange("DistanceClusterCenter", checked)
                        }
                    />
                    <div className="flex-1">
                        <label
                            htmlFor="DistanceClusterCenter"
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            Distance from medoid
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                            Save the distance of each case to its cluster medoid (DIS_1, DIS_2, ...).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
