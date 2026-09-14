"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ChevronRight,
    Ruler,
    Shapes,
    BarChartHorizontal,
    Info
} from "lucide-react";
import type { Variable } from "@/types/Variable";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MultinomialOptions {
    dependent: Variable | null;
    factors: Variable[];
    covariates: Variable[];
}

interface VariablesTabProps {
    variables: Variable[];
    options: MultinomialOptions & Record<string, any>;
    setOptions: React.Dispatch<React.SetStateAction<any>>;
}

export const VariablesTab: React.FC<VariablesTabProps> = ({
    variables,
    options,
    setOptions,
}) => {
    const [selectedVarIds, setSelectedVarIds] = useState<string[]>([]);
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

    const availableVariables = variables.filter(
        (v) =>
            v.id !== options.dependent?.id &&
            !options.factors.some((f) => f.id === v.id) &&
            !options.covariates.some((c) => c.id === v.id)
    );

    const selectedVars = availableVariables.filter((v) =>
        selectedVarIds.includes(String(v.id))
    );

    const handleSelect = (v: Variable, e: React.MouseEvent<HTMLDivElement>) => {
        const multiSelect = e.ctrlKey || e.metaKey;
        const useRangeSelect = e.shiftKey && lastSelectedIndex !== null;
        const varId = String(v.id);

        const currentIndex = availableVariables.findIndex((item) => String(item.id) === varId);
        if (currentIndex < 0) return;

        if (useRangeSelect) {
            const start = Math.min(lastSelectedIndex, currentIndex);
            const end = Math.max(lastSelectedIndex, currentIndex);
            const rangeIds = availableVariables.slice(start, end + 1).map((item) => String(item.id));

            setSelectedVarIds((prev) => {
                if (multiSelect) {
                    const merged = new Set([...prev, ...rangeIds]);
                    return Array.from(merged);
                }
                return rangeIds;
            });
            setLastSelectedIndex(currentIndex);
            return;
        }

        if (multiSelect) {
            setSelectedVarIds((prev) =>
                prev.includes(varId)
                    ? prev.filter((id) => id !== varId)
                    : [...prev, varId]
            );
            setLastSelectedIndex(currentIndex);
            return;
        }

        setSelectedVarIds((prev) => (prev.length === 1 && prev[0] === varId ? [] : [varId]));
        setLastSelectedIndex(currentIndex);
    };

    const moveSelection = (target: "dependent" | "factors" | "covariates") => {
        if (selectedVars.length === 0) return;

        setOptions((prev: MultinomialOptions & Record<string, any>) => {
            if (target === "dependent") {
                return { ...prev, dependent: selectedVars[0] };
            }

            const existingIds = new Set(prev[target].map((v: Variable) => String(v.id)));
            const additions = selectedVars.filter((v) => !existingIds.has(String(v.id)));
            return {
                ...prev,
                [target]: [...prev[target], ...additions],
            };
        });

        setSelectedVarIds([]);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, draggedVar: Variable) => {
        const draggedId = String(draggedVar.id);
        const idsToDrag = selectedVarIds.includes(draggedId)
            ? selectedVarIds
            : [draggedId];

        if (!selectedVarIds.includes(draggedId)) {
            setSelectedVarIds([draggedId]);
        }

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/statify-variable-ids", JSON.stringify(idsToDrag));
    };

    const handleDropToTarget = (
        e: React.DragEvent<HTMLDivElement>,
        target: "dependent" | "factors" | "covariates"
    ) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData("application/statify-variable-ids");
        if (!raw) return;

        try {
            const ids = JSON.parse(raw) as string[];
            const validIds = ids.filter((id) =>
                availableVariables.some((v) => String(v.id) === id)
            );
            if (validIds.length === 0) return;
            setSelectedVarIds(validIds);
            moveSelection(target);
        } catch {
            // Ignore invalid payload.
        }
    };

    // Fungsi pemindahan variabel
    const moveToDependent = () => {
        moveSelection("dependent");
    };

    const moveToFactors = () => {
        moveSelection("factors");
    };

    const moveToCovariates = () => {
        moveSelection("covariates");
    };

    const removeFromList = (id: string, key: "factors" | "covariates" | "dependent") => {
        setOptions((prev: any) => ({
            ...prev,
            [key]: key === "dependent" ? null : prev[key].filter((v: Variable) => String(v.id) !== id),
        }));
    };

    const getVariableIcon = (measure: string) => {
        switch (measure?.toLowerCase()) {
            case "scale": return <Ruler className="h-4 w-4 text-blue-500" />;
            case "ordinal": return <BarChartHorizontal className="h-4 w-4 text-orange-500" />;
            case "nominal": return <Shapes className="h-4 w-4 text-green-500" />;
            default: return <Ruler className="h-4 w-4 opacity-50" />;
        }
    };

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 h-full min-h-[440px] overflow-y-auto p-1">

            {/* 1. Source List (Kiri) */}
            <div className="flex flex-col border rounded-md bg-card overflow-hidden h-full">
                <div className="p-2 border-b bg-muted/30 text-[10px] font-bold uppercase flex items-center justify-between shrink-0">
                    Variables
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 opacity-40 hover:opacity-100 cursor-help transition-opacity" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-blue-600 dark:bg-blue-700 text-white border-blue-500 shadow-md">
                                <p className="max-w-xs text-xs normal-case font-normal">
                                    Daftar variabel yang tersedia. Pilih variabel lalu seret (drag) ke kolom target di sebelah kanan atau gunakan tombol panah.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="px-2 py-1 text-[10px] text-muted-foreground border-b bg-muted/10">
                    Ctrl/Cmd + click untuk pilih banyak, lalu drag sekali.
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {availableVariables.map((v) => (
                            <div
                                key={v.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, v)}
                                onClick={(e) => handleSelect(v, e)}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-xs transition-colors",
                                    selectedVarIds.includes(String(v.id))
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-accent"
                                )}
                            >
                                {getVariableIcon(v.measure || "")}
                                <span className="truncate">{v.name}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* 2. Middle Column & 3. Target Lists (Digabung untuk sinkronisasi posisi) */}
            <div className="col-span-2 grid grid-cols-[40px_1fr] gap-y-3 items-start">

                {/* --- Row 1: Dependent --- */}
                <div className="flex items-center justify-center h-[70px]">
                    <Button
                        variant="outline" size="icon" className="h-7 w-7"
                        onClick={moveToDependent} disabled={selectedVars.length === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div
                    className="border rounded-md bg-card h-[70px] overflow-hidden flex flex-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropToTarget(e, "dependent")}
                >
                    <div className="p-1.5 border-b bg-muted/20 text-[9px] font-bold uppercase">Dependent Variable</div>
                    <div className="p-1.5 flex-grow flex items-center justify-center min-h-[40px]">
                        {options.dependent ? (
                            <div
                                onDoubleClick={() => removeFromList(String(options.dependent!.id), "dependent")}
                                className="w-full flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-sm text-xs border border-primary/20"
                            >
                                {getVariableIcon(options.dependent.measure || "")}
                                <span className="truncate font-medium">{options.dependent.name}</span>
                            </div>
                        ) : (
                            <span className="text-[9px] text-muted-foreground italic text-center leading-tight">Drag var di sini<br />(Double click untuk hapus)</span>
                        )}
                    </div>
                </div>

                {/* --- Row 2: Factors --- */}
                <div className="flex items-center justify-center h-[145px]">
                    <Button
                        variant="outline" size="icon" className="h-7 w-7"
                        onClick={moveToFactors} disabled={selectedVars.length === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div
                    className="flex flex-col border rounded-md bg-card overflow-hidden h-[145px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropToTarget(e, "factors")}
                >
                    <div className="p-1.5 border-b bg-muted/20 text-[9px] font-bold uppercase text-orange-600">Factors (Fixed)</div>
                    <ScrollArea className="flex-1">
                        {options.factors.length > 0 ? (
                            <div className="p-1.5 space-y-1">
                                {options.factors.map((f) => (
                                    <div
                                        key={f.id}
                                        onDoubleClick={() => removeFromList(String(f.id), "factors")}
                                        className="flex items-center gap-2 px-2 py-0.5 hover:bg-accent rounded-sm text-xs cursor-default"
                                    >
                                        {getVariableIcon(f.measure || "")}
                                        <span className="truncate">{f.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[105px] flex items-center justify-center p-3 text-center">
                                <span className="text-[9px] text-muted-foreground italic leading-tight">Drag var di sini<br />(Double click untuk hapus)</span>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* --- Row 3: Covariates --- */}
                <div className="flex items-center justify-center h-[145px]">
                    <Button
                        variant="outline" size="icon" className="h-7 w-7"
                        onClick={moveToCovariates} disabled={selectedVars.length === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div
                    className="flex flex-col border rounded-md bg-card overflow-hidden h-[145px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropToTarget(e, "covariates")}
                >
                    <div className="p-1.5 border-b bg-muted/20 text-[9px] font-bold uppercase text-blue-600">Covariates</div>
                    <ScrollArea className="flex-1">
                        {options.covariates.length > 0 ? (
                            <div className="p-1.5 space-y-1">
                                {options.covariates.map((c) => (
                                    <div
                                        key={c.id}
                                        onDoubleClick={() => removeFromList(String(c.id), "covariates")}
                                        className="flex items-center gap-2 px-2 py-0.5 hover:bg-accent rounded-sm text-xs cursor-default"
                                    >
                                        {getVariableIcon(c.measure || "")}
                                        <span className="truncate">{c.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[105px] flex items-center justify-center p-3 text-center">
                                <span className="text-[9px] text-muted-foreground italic leading-tight">Drag var di sini<br />(Double click untuk hapus)</span>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};