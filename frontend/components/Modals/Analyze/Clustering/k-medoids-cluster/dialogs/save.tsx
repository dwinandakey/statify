"use client";

import React, { useEffect, useState } from "react";
import type {
    KMedoidsClusterSaveProps,
    KMedoidsClusterSaveType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";

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
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ClusterMembership"
                        checked={saveState.ClusterMembership}
                        onCheckedChange={(checked) =>
                            handleChange("ClusterMembership", checked)
                        }
                    />
                    <label
                        htmlFor="ClusterMembership"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Cluster membership
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="DistanceClusterCenter"
                        checked={saveState.DistanceClusterCenter}
                        onCheckedChange={(checked) =>
                            handleChange("DistanceClusterCenter", checked)
                        }
                    />
                    <label
                        htmlFor="DistanceClusterCenter"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Distance from medoid
                    </label>
                </div>
            </div>
        </div>
    );
};
