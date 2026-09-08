import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChartHorizontal, ChevronRight, Ruler, Shapes } from "lucide-react";
import type { Variable } from "@/types/Variable";
import type { OrdinalScaleParams } from "../types/ordinal";

interface Props { factors: Variable[], covariates: Variable[], params: OrdinalScaleParams, onChange: (params: OrdinalScaleParams) => void; }

const getVariableIcon = (variable: Variable) => {
    switch (variable.measure) {
        case "scale":
            return <Ruler size={14} className="mr-1.5 flex-shrink-0 text-muted-foreground" />;
        case "ordinal":
            return <BarChartHorizontal size={14} className="mr-1.5 flex-shrink-0 text-muted-foreground" />;
        case "nominal":
        default:
            return <Shapes size={14} className="mr-1.5 flex-shrink-0 text-muted-foreground" />;
    }
};

const getDisplayName = (variable: Variable) => variable.name || variable.label || "";

const scrollableListContentClass = "min-w-full w-max p-2 pr-4 pb-4";
const scrollableItemClass = "w-full min-w-max";
const scrollableNameClass = "whitespace-nowrap";

export const ScaleTab: React.FC<Props> = ({ factors, covariates, params, onChange }) => {
    const allVars = useMemo(() => [...factors, ...covariates], [factors, covariates]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const getVariableKey = (variable: Variable) => `${variable.id ?? "no-id"}-${variable.columnIndex}`;

    const selectedVariables = useMemo(
        () => allVars.filter((v) => selectedKeys.has(getVariableKey(v))),
        [allVars, selectedKeys]
    );

    const handleVariableClick = (event: React.MouseEvent<HTMLDivElement>, variable: Variable) => {
        const key = getVariableKey(variable);
        if (event.ctrlKey || event.shiftKey) {
            const nextKeys = new Set(selectedKeys);
            if (nextKeys.has(key)) {
                nextKeys.delete(key);
            } else {
                nextKeys.add(key);
            }
            setSelectedKeys(nextKeys);
        } else {
            const nextKeys = new Set<string>();
            nextKeys.add(key);
            setSelectedKeys(nextKeys);
        }
    };

    const handleAddSelection = () => {
        if (selectedVariables.length === 0) return;
        const existingKeys = new Set(params.scaleModel.map(getVariableKey));
        const nextScale = [...params.scaleModel];

        for (const variable of selectedVariables) {
            const key = getVariableKey(variable);
            if (!existingKeys.has(key)) {
                existingKeys.add(key);
                nextScale.push(variable);
            }
        }

        onChange({ scaleModel: nextScale });
    };

    const handleRemove = (variable: Variable) => {
        const key = getVariableKey(variable);
        onChange({ scaleModel: params.scaleModel.filter((item) => getVariableKey(item) !== key) });
    };
    return (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1.45fr)] gap-4 py-4">
            <div className="flex min-h-0 flex-col">
                <label className="mb-2 block text-sm font-semibold">Factors/covariates:</label>
                <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
                    <ScrollArea className="h-full">
                        <div className={scrollableListContentClass}>
                            {allVars.map((variable) => {
                                const key = getVariableKey(variable);
                                const isSelected = selectedKeys.has(key);
                                return (
                                    <div
                                        key={key}
                                        className={`${scrollableItemClass} mb-1 flex cursor-pointer items-center rounded-md border p-1.5 text-sm transition-colors ${isSelected
                                                ? "border-primary/50 bg-accent text-accent-foreground"
                                                : "border-transparent hover:bg-accent/50"
                                            }`}
                                        onClick={(event) => handleVariableClick(event, variable)}
                                    >
                                        {getVariableIcon(variable)}
                                        <span className={scrollableNameClass}>{getDisplayName(variable)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <div className="flex items-start pt-7">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleAddSelection}
                    disabled={selectedVariables.length === 0}
                >
                    <ChevronRight size={16} />
                </Button>
            </div>

            <div className="flex min-h-0 flex-col">
                <label className="mb-2 block text-sm font-semibold">Scale model:</label>
                <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
                    <ScrollArea className="h-full">
                        <div className={scrollableListContentClass}>
                            {params.scaleModel.length === 0 ? (
                                <span className="text-xs italic text-muted-foreground">Select variable...</span>
                            ) : (
                                params.scaleModel.map((variable) => (
                                    <div
                                        key={getVariableKey(variable)}
                                        className={`${scrollableItemClass} mb-1 flex cursor-pointer items-center rounded-md border border-transparent p-1.5 text-sm transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive`}
                                        onClick={() => handleRemove(variable)}
                                        title="Click to remove"
                                    >
                                        {getVariableIcon(variable)}
                                        <span className={scrollableNameClass}>{getDisplayName(variable)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};
