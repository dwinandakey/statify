"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    KMedoidsClusterDialogProps,
    KMedoidsClusterMainType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import {
    ClusterMode,
    AutoKMethod,
    DistanceMetric,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/types/k-medoids-cluster";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    MultiSelectTargetList,
    MultiSelection,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/components/MultiSelectVariableList";
import MultiSelectVariableList from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/components/MultiSelectVariableList";
import type { Variable } from "@/types/Variable";
import { getVariableIcon as getCommonVariableIcon } from "@/components/Common/iconHelper";
import { HelpCircle } from "lucide-react";
import {
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useDataStore } from "@/stores/useDataStore";

export const KMedoidsClusterDialog = ({
    updateFormData,
    data,
    globalVariables,
}: KMedoidsClusterDialogProps) => {
    const [mainState, setMainState] = useState<KMedoidsClusterMainType>({
        ...data,
    });
    const dataVariables = useDataStore((state) => state.data);
    const [availableVars, setAvailableVars] = useState<Variable[]>([]);
    const [targetVars, setTargetVars] = useState<Variable[]>([]);
    const [caseVars, setCaseVars] = useState<Variable[]>([]);
    const [selection, setSelection] = useState<MultiSelection | null>(null);

    // Gunakan ref agar callback tidak dibuat ulang saat updateFormData berubah
    const updateFormDataRef = useRef(updateFormData);
    useEffect(() => {
        updateFormDataRef.current = updateFormData;
    }, [updateFormData]);

    const variableOrder = useMemo(() => {
        const order = new Map<string, number>();
        (globalVariables ?? []).forEach((variable, index) => order.set(variable.name, index));
        return order;
    }, [globalVariables]);

    // Daftar "Available Variables" selalu kembali ke urutan aslinya
    const sortByOriginalOrder = useCallback(
        (variables: Variable[]) =>
            [...variables].sort(
                (a, b) =>
                    (variableOrder.get(a.name) ?? 0) - (variableOrder.get(b.name) ?? 0)
            ),
        [variableOrder]
    );

    const numericSampleByName = useMemo(() => {
        const stats = new Map<string, { numeric: number; total: number }>();
        const allVars = globalVariables ?? [];

        for (const variable of allVars) {
            stats.set(variable.name, { numeric: 0, total: 0 });
        }

        if (!dataVariables || dataVariables.length === 0 || allVars.length === 0) {
            return stats;
        }

        const maxRows = Math.min(dataVariables.length, 200);

        for (let i = 0; i < maxRows; i++) {
            const row = dataVariables[i];
            for (const variable of allVars) {
                const rawValue = row[variable.columnIndex as number];
                if (rawValue === null || rawValue === undefined || rawValue === "") {
                    continue;
                }
                const parsed = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
                const stat = stats.get(variable.name);
                if (!stat) continue;
                stat.total += 1;
                if (Number.isFinite(parsed)) {
                    stat.numeric += 1;
                }
            }
        }

        return stats;
    }, [dataVariables, globalVariables]);

    const isNumericVariable = useCallback((variable: Variable) => {
        const numericTypes: Array<Variable["type"]> = [
            "NUMERIC",
            "COMMA",
            "DOT",
            "SCIENTIFIC",
            "DOLLAR",
            "CCA",
            "CCB",
            "CCC",
            "CCD",
            "CCE",
            "RESTRICTED_NUMERIC",
        ];
        const variableType = variable.type ?? "STRING";
        const typeIsNumeric = numericTypes.includes(variableType);
        const sampleStats = numericSampleByName.get(variable.name);

        if (sampleStats && sampleStats.total > 0 && sampleStats.numeric === 0) {
            return false;
        }

        return typeIsNumeric;
    }, [numericSampleByName]);

    const getVariableIconWithData = useCallback((variable: Variable) => {
        const sampleStats = numericSampleByName.get(variable.name);
        if (sampleStats && sampleStats.total > 0 && sampleStats.numeric === 0) {
            return getCommonVariableIcon({ ...variable, measure: "nominal" });
        }
        return getCommonVariableIcon(variable);
    }, [numericSampleByName]);

    useEffect(() => {
        setMainState({ ...data });
        setSelection(null);
        const allVariables: Variable[] = globalVariables;

        const initialUsedNames = new Set(
            [...(data.TargetVar ?? []), data.CaseTarget].filter(Boolean)
        );

        const varsMap = new Map(allVariables.map((v) => [v.name, v]));

        setTargetVars(
            (data.TargetVar ?? [])
                .map((name) => varsMap.get(name))
                .filter(Boolean) as Variable[]
        );

        setCaseVars(
            data.CaseTarget
                ? ([varsMap.get(data.CaseTarget)].filter(Boolean) as Variable[])
                : []
        );

        setAvailableVars(
            allVariables.filter((v) => !initialUsedNames.has(v.name))
        );
    }, [data, globalVariables]);

    const targetListsConfig: MultiSelectTargetList[] = useMemo(
        () => [
            {
                id: "TargetVar",
                title: "Variables:",
                variables: targetVars,
                height: "225px",
            },
            {
                id: "CaseTarget",
                title: "Label Cases by: (1 variable only)",
                variables: caseVars,
                height: "auto",
                maxItems: 1,
            },
        ],
        [targetVars, caseVars]
    );

    // Memindahkan satu atau banyak variabel sekaligus antar daftar
    const handleMoveVariables = useCallback(
        (variables: Variable[], fromListId: string, toListId: string) => {
            if (variables.length === 0 || fromListId === toListId) {
                return;
            }

            if (
                toListId === "TargetVar" &&
                variables.some((variable) => !isNumericVariable(variable))
            ) {
                toast.error("Variables must be numeric");
                return;
            }

            // "Label Cases by" hanya menampung satu variabel
            const accepted =
                toListId === "CaseTarget" ? variables.slice(0, 1) : variables;
            if (accepted.length === 0) {
                return;
            }
            if (toListId === "CaseTarget" && variables.length > 1) {
                toast.info(
                    "Label Cases by accepts only 1 variable; the first one will be used"
                );
            }

            const acceptedNames = new Set(accepted.map((variable) => variable.name));
            const withoutAccepted = (list: Variable[]) =>
                list.filter((variable) => !acceptedNames.has(variable.name));

            let nextAvailableVars = withoutAccepted(availableVars);
            let nextTargetVars = withoutAccepted(targetVars);
            let nextCaseVars = withoutAccepted(caseVars);

            if (toListId === "TargetVar") {
                nextTargetVars = [...nextTargetVars, ...accepted];
            } else if (toListId === "CaseTarget") {
                // Variabel label lama dikembalikan ke daftar tersedia
                nextAvailableVars = [...nextAvailableVars, ...nextCaseVars];
                nextCaseVars = accepted;
            } else {
                nextAvailableVars = [...nextAvailableVars, ...accepted];
            }

            setAvailableVars(sortByOriginalOrder(nextAvailableVars));
            setTargetVars(nextTargetVars);
            setCaseVars(nextCaseVars);

            updateFormDataRef.current(
                "TargetVar",
                nextTargetVars.map((variable) => variable.name)
            );
            updateFormDataRef.current("CaseTarget", nextCaseVars[0]?.name ?? null);
        },
        [availableVars, caseVars, isNumericVariable, sortByOriginalOrder, targetVars]
    );

    const handleReorderVariable = useCallback(
        (listId: string, newVariables: Variable[]) => {
            if (listId === "TargetVar") {
                setTargetVars(newVariables);
                updateFormDataRef.current(
                    "TargetVar",
                    newVariables.map((variable) => variable.name)
                );
                return;
            }
            if (listId === "CaseTarget") {
                setCaseVars(newVariables);
                return;
            }
            setAvailableVars(newVariables);
        },
        []
    );

    const handleChange = useCallback((
        field: keyof KMedoidsClusterMainType,
        value: number | boolean | string | string[] | null
    ) => {
        setMainState((prevState) => ({
            ...prevState,
            [field]: value,
        }));
        // Perbarui induk secara sinkron (bukan via queueMicrotask) agar
        // formData.main selalu mutakhir sebelum tombol OK membacanya.
        // Penggunaan queueMicrotask di sini menyebabkan race condition: setFormData
        // induk dijadwalkan sebagai macro-task render yang bisa dieksekusi SETELAH
        // pengguna klik OK — sehingga k yang basi dikirim ke worker.
        updateFormDataRef.current(field, value);
    }, []);

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="space-y-6">
                {/* Data type legend removed per request */}

                <div className="min-h-[400px]">
                    <MultiSelectVariableList
                        availableVariables={availableVars}
                        targetLists={targetListsConfig}
                        selection={selection}
                        setSelection={setSelection}
                        onMoveVariables={handleMoveVariables}
                        onReorderVariable={handleReorderVariable}
                        getVariableIcon={getVariableIconWithData}
                        availableListHeight="350px"
                    />
                </div>

                <div className="w-full border rounded-md">
                    <div className="px-4 py-2 border-b bg-muted/40">
                        <Label className="font-bold">Medoid Configuration</Label>
                    </div>
                    <div className="space-y-4 p-4">

                        {/* ===== MODE SELECTOR ===== */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-sm">Number of Clusters (k)</Label>
                            <RadioGroup
                                value={mainState.ClusterMode}
                                onValueChange={(val) =>
                                    handleChange("ClusterMode", val as ClusterMode)
                                }
                                className="flex flex-col gap-2"
                            >
                                {/* --- MANUAL --- */}
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={ClusterMode.Manual} id="mode-manual" />
                                    <Label htmlFor="mode-manual" className="cursor-pointer font-normal">
                                        Manual
                                    </Label>
                                </div>

                                {mainState.ClusterMode === ClusterMode.Manual && (
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 ml-6">
                                        <Label className="text-sm text-muted-foreground w-16 shrink-0">k =</Label>
                                        <Input
                                            id="kmedoids-number-of-clusters"
                                            type="number"
                                            placeholder="2"
                                            value={mainState.Cluster ?? ""}
                                            min={2}
                                            onChange={(e) =>
                                                handleChange("Cluster", Number(e.target.value))
                                            }
                                            className="w-20 shrink-0"
                                        />
                                        <span className="text-xs text-muted-foreground">(min: 2)</span>
                                    </div>
                                )}

                                {/* --- AUTOMATIC --- */}
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={ClusterMode.Automatic} id="mode-auto" />
                                    <Label htmlFor="mode-auto" className="cursor-pointer font-normal">
                                        Automatic (find optimal k)
                                    </Label>
                                </div>

                                {mainState.ClusterMode === ClusterMode.Automatic && (
                                    <div className="space-y-3 ml-6 border-l-2 border-muted pl-4">
                                        {/* k range */}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <Label className="text-sm text-muted-foreground w-16 shrink-0 whitespace-nowrap">k range:</Label>
                                            <Input
                                                id="kmedoids-auto-kmin"
                                                type="number"
                                                placeholder="2"
                                                value={mainState.AutoKMin ?? ""}
                                                min={2}
                                                max={(mainState.AutoKMax ?? 10) - 1}
                                                onChange={(e) =>
                                                    handleChange("AutoKMin", Number(e.target.value))
                                                }
                                                className="w-14 shrink-0"
                                            />
                                            <span className="text-xs text-muted-foreground shrink-0">to</span>
                                            <Input
                                                id="kmedoids-auto-kmax"
                                                type="number"
                                                placeholder="10"
                                                value={mainState.AutoKMax ?? ""}
                                                min={(mainState.AutoKMin ?? 2) + 1}
                                                onChange={(e) =>
                                                    handleChange("AutoKMax", Number(e.target.value))
                                                }
                                                className="w-14 shrink-0"
                                            />
                                        </div>
                                        {/* Method */}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <Label className="text-sm text-muted-foreground w-16 shrink-0 whitespace-nowrap">Method:</Label>
                                            <Select
                                                value={mainState.AutoKMethod}
                                                onValueChange={(val) =>
                                                    handleChange("AutoKMethod", val as AutoKMethod)
                                                }
                                            >
                                                <SelectTrigger className="w-full max-w-52">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={AutoKMethod.Silhouette}>
                                                        Silhouette Score
                                                    </SelectItem>
                                                    <SelectItem value={AutoKMethod.Elbow}>
                                                        Elbow Method
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            The system will evaluate every k from kMin
                                            to kMax and pick the k with the best score.
                                        </p>
                                    </div>
                                )}
                            </RadioGroup>
                        </div>

                        {/* ===== DISTANCE MEASURE ===== */}
                        <div className="space-y-2 border-t pt-4">
                            <div className="flex items-center gap-2">
                                <Label className="font-semibold text-sm">Distance Measure</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p className="text-xs">
                                                <strong>Euclidean:</strong> Geometric distance, magnitude-sensitive. Best for continuous numeric data.<br />
                                                <strong>Manhattan:</strong> City-block distance, more robust to outliers.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <RadioGroup
                                value={mainState.DistanceMetric}
                                onValueChange={(value) =>
                                    handleChange("DistanceMetric", value as DistanceMetric)
                                }
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={DistanceMetric.Euclidean} id="euclidean" />
                                    <Label htmlFor="euclidean" className="cursor-pointer font-normal">Euclidean distance</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={DistanceMetric.Manhattan} id="manhattan" />
                                    <Label htmlFor="manhattan" className="cursor-pointer font-normal">Manhattan distance (City-block)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};