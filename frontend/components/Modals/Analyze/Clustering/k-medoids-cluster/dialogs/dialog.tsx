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
import type { TargetListConfig } from "@/components/Common/VariableListManager";
import VariableListManager from "@/components/Common/VariableListManager";
import type { Variable } from "@/types/Variable";
import {
    getKMedoidsVariableIcon,
    getKMedoidsVariableIconByType,
} from "@/components/Modals/Analyze/Clustering/k-medoids-cluster/utils/iconHelper";
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
    const [highlightedVariable, setHighlightedVariable] = useState<{
        id: string;
        source: string;
    } | null>(null);

    // Gunakan ref agar callback tidak dibuat ulang saat updateFormData berubah
    const updateFormDataRef = useRef(updateFormData);
    useEffect(() => {
        updateFormDataRef.current = updateFormData;
    }, [updateFormData]);

    const listStateSetters: Record<
        string,
        React.Dispatch<React.SetStateAction<Variable[]>>
    > = useMemo(
        () => ({
            available: setAvailableVars,
            TargetVar: setTargetVars,
            CaseTarget: setCaseVars,
        }),
        [setAvailableVars, setTargetVars, setCaseVars]
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
            return getKMedoidsVariableIconByType(false);
        }
        return getKMedoidsVariableIcon(variable);
    }, [numericSampleByName]);

    useEffect(() => {
        setMainState({ ...data });
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

    const targetListsConfig: TargetListConfig[] = useMemo(
        () => [
            {
                id: "TargetVar",
                title: "Variables:",
                variables: targetVars,
                height: "225px",
                containerId: "kmedoids-analysis-variables",
            },
            {
                id: "CaseTarget",
                title: "Label Cases by:",
                variables: caseVars,
                height: "auto",
                maxItems: 1,
                containerId: "kmedoids-label-cases-by",
            },
        ],
        [targetVars, caseVars]
    );

    const handleMoveVariable = useCallback(
        (variable: Variable, fromListId: string, toListId: string) => {
            if (toListId === "TargetVar" && !isNumericVariable(variable)) {
                toast.error("variabel harus bertipe numerik");
                return;
            }

            const fromSetter = listStateSetters[fromListId];
            const toSetter = listStateSetters[toListId];
            const toListConfig = targetListsConfig.find(
                (l) => l.id === toListId
            );

            let updatedTargetVars: Variable[] | null = null;
            let updatedCaseTarget: string | null = null;
            let shouldUpdateTargetVars = false;
            let shouldUpdateCaseTarget = false;

            // Hapus dari daftar sumber
            if (fromSetter) {
                if (fromListId === "TargetVar") {
                    fromSetter((prev) => {
                        const newVars = prev.filter((v) => v.name !== variable.name);
                        updatedTargetVars = newVars;
                        shouldUpdateTargetVars = true;
                        return newVars;
                    });
                } else if (fromListId === "CaseTarget") {
                    fromSetter((prev) => {
                        updatedCaseTarget = null;
                        shouldUpdateCaseTarget = true;
                        return prev.filter((v) => v.name !== variable.name);
                    });
                } else {
                    fromSetter((prev) => prev.filter((v) => v.name !== variable.name));
                }
            }

            // Tambahkan ke daftar tujuan
            if (toSetter) {
                if (toListConfig?.maxItems === 1) {
                    toSetter((prev) => {
                        if (prev.length > 0) {
                            const existingVar = prev[0];
                            setAvailableVars((avail) => [
                                ...avail,
                                existingVar,
                            ]);
                        }
                        if (toListId === "CaseTarget") {
                            updatedCaseTarget = variable.name;
                            shouldUpdateCaseTarget = true;
                        }
                        return [variable];
                    });
                } else {
                    if (toListId === "TargetVar") {
                        toSetter((prev) => {
                            const newVars = [...prev, variable];
                            updatedTargetVars = newVars;
                            shouldUpdateTargetVars = true;
                            return newVars;
                        });
                    } else {
                        toSetter((prev) => [...prev, variable]);
                    }
                }
            }

            // Perbarui induk setelah semua pembaruan state diantrikan
            queueMicrotask(() => {
                if (shouldUpdateTargetVars && updatedTargetVars !== null) {
                    updateFormDataRef.current("TargetVar", updatedTargetVars.map(v => v.name));
                }
                if (shouldUpdateCaseTarget) {
                    updateFormDataRef.current("CaseTarget", updatedCaseTarget);
                }
            });
        },
        [isNumericVariable, listStateSetters, targetListsConfig, setAvailableVars]
    );

    const handleReorderVariable = useCallback(
        (listId: string, newVariables: Variable[]) => {
            const setter = listStateSetters[listId];
            if (setter) {
                setter(newVariables);
                // Perbarui induk setelah pembaruan state diantrikan
                if (listId === "TargetVar") {
                    queueMicrotask(() => {
                        updateFormDataRef.current("TargetVar", newVariables.map(v => v.name));
                    });
                }
            }
        },
        [listStateSetters]
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
                {/* Legenda Tipe Data */}
                <div className="bg-muted/40 border rounded-md p-3">
                    <div className="flex items-center gap-4 text-xs">
                        <span className="font-semibold text-muted-foreground">Data Type Icons:</span>
                        <div className="flex items-center gap-1">
                            <span className="text-green-600 font-semibold text-xs">123</span>
                            <span className="text-muted-foreground">Numeric</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-blue-500 font-semibold text-xs">ABC</span>
                            <span className="text-muted-foreground">Categorical/String</span>
                        </div>
                    </div>
                </div>

                <div className="min-h-[400px]">
                    <VariableListManager
                        availableVariables={availableVars}
                        targetLists={targetListsConfig}
                        variableIdKey="name"
                        highlightedVariable={highlightedVariable}
                        setHighlightedVariable={setHighlightedVariable}
                        onMoveVariable={handleMoveVariable}
                        onReorderVariable={handleReorderVariable}
                        getVariableIcon={getVariableIconWithData}
                        showArrowButtons={true}
                        availableListHeight="350px"
                    />
                </div>

                <div className="w-full border rounded-md">
                    <div className="px-4 py-2 border-b bg-muted/40">
                        <Label className="font-bold">Medoid Configuration</Label>
                    </div>
                    <div className="space-y-4 p-4">

                        {/* ===== PEMILIH MODE ===== */}
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
                                    <div className="flex items-center gap-3 ml-6">
                                        <Label className="text-sm text-muted-foreground w-20">k =</Label>
                                        <Input
                                            id="kmedoids-number-of-clusters"
                                            type="number"
                                            placeholder="2"
                                            value={mainState.Cluster ?? ""}
                                            min={2}
                                            onChange={(e) =>
                                                handleChange("Cluster", Number(e.target.value))
                                            }
                                            className="w-24"
                                        />
                                        <span className="text-xs text-muted-foreground">(min: 2)</span>
                                    </div>
                                )}

                                {/* --- OTOMATIS --- */}
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={ClusterMode.Automatic} id="mode-auto" />
                                    <Label htmlFor="mode-auto" className="cursor-pointer font-normal">
                                        Automatic (find optimal k)
                                    </Label>
                                </div>

                                {mainState.ClusterMode === ClusterMode.Automatic && (
                                    <div className="space-y-3 ml-6 border-l-2 border-muted pl-4">
                                        {/* Rentang k */}
                                        <div className="flex items-center gap-3">
                                            <Label className="text-sm text-muted-foreground w-20">k range:</Label>
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
                                                className="w-20"
                                            />
                                            <span className="text-xs text-muted-foreground">to</span>
                                            <Input
                                                id="kmedoids-auto-kmax"
                                                type="number"
                                                placeholder="10"
                                                value={mainState.AutoKMax ?? ""}
                                                min={(mainState.AutoKMin ?? 2) + 1}
                                                onChange={(e) =>
                                                    handleChange("AutoKMax", Number(e.target.value))
                                                }
                                                className="w-20"
                                            />
                                        </div>
                                        {/* Metode */}
                                        <div className="flex items-center gap-3">
                                            <Label className="text-sm text-muted-foreground w-20">Method:</Label>
                                            <Select
                                                value={mainState.AutoKMethod}
                                                onValueChange={(val) =>
                                                    handleChange("AutoKMethod", val as AutoKMethod)
                                                }
                                            >
                                                <SelectTrigger className="w-52">
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
                                            Sistem akan mengevaluasi setiap k dari kMin
                                            hingga kMax dan memilih k dengan skor terbaik.
                                        </p>
                                    </div>
                                )}
                            </RadioGroup>
                        </div>

                        {/* ===== UKURAN JARAK ===== */}
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