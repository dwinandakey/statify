import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChartHorizontal, ChevronRight, Ruler, Shapes } from "lucide-react";
import type { Variable } from "@/types/Variable";
import type { LocationInteraction, LocationModelTerm, OrdinalLocationParams } from "../types/ordinal";

interface Props {
    factors: Variable[];
    covariates: Variable[];
    params: OrdinalLocationParams;
    onChange: (params: OrdinalLocationParams) => void;
}

const isInteraction = (term: LocationModelTerm): term is LocationInteraction =>
    typeof term === "object" && "kind" in term && term.kind === "interaction";

const getVariableKey = (variable: Variable) => `${variable.id ?? "no-id"}-${variable.columnIndex}`;

const buildInteractionId = (variables: Variable[]) => {
    const keys = variables.map(getVariableKey).sort();
    return `interaction-${keys.join("::")}`;
};

const buildInteractionName = (variables: Variable[], allVars: Variable[]) => {
    const indexByKey = new Map(allVars.map((v, index) => [getVariableKey(v), index]));
    const ordered = [...variables].sort((a, b) => {
        const aIndex = indexByKey.get(getVariableKey(a)) ?? 0;
        const bIndex = indexByKey.get(getVariableKey(b)) ?? 0;
        return aIndex - bIndex;
    });
    return ordered.map((v) => v.name).join("*");
};

const buildInteractionTerm = (variables: Variable[], allVars: Variable[]): LocationInteraction => {
    const name = buildInteractionName(variables, allVars);
    return {
        kind: "interaction",
        id: buildInteractionId(variables),
        name,
        variables,
    };
};

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

const getDisplayName = (variable: Variable) => variable.label ?? variable.name;

const scrollableListContentClass = "min-w-full w-max p-2 pr-4 pb-4";
const scrollableItemClass = "w-full min-w-max";
const scrollableNameClass = "whitespace-nowrap";

export const LocationTab: React.FC<Props> = ({ factors, covariates, params, onChange }) => {
    const allVars = useMemo(() => [...factors, ...covariates], [factors, covariates]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [interactionMode, setInteractionMode] = useState(false);

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
            setInteractionMode(nextKeys.size >= 2);
        } else {
            const nextKeys = new Set<string>();
            nextKeys.add(key);
            setSelectedKeys(nextKeys);
            setInteractionMode(false);
        }
    };

    const handleAddSelection = () => {
        if (selectedVariables.length === 0) return;

        const existingKeys = new Set(
            params.locationModel.map((term) => (isInteraction(term) ? term.id : getVariableKey(term)))
        );

        if (interactionMode && selectedVariables.length >= 2) {
            const interaction = buildInteractionTerm(selectedVariables, allVars);
            if (!existingKeys.has(interaction.id)) {
                onChange({ locationModel: [...params.locationModel, interaction] });
            }
        } else {
            const variable = selectedVariables[0];
            const key = getVariableKey(variable);
            if (!existingKeys.has(key)) {
                onChange({ locationModel: [...params.locationModel, variable] });
            }
        }
    };

    const handleRemove = (term: LocationModelTerm) => {
        if (isInteraction(term)) {
            onChange({ locationModel: params.locationModel.filter((item) => !isInteraction(item) || item.id !== term.id) });
            return;
        }
        onChange({ locationModel: params.locationModel.filter((item) => isInteraction(item) || getVariableKey(item) !== getVariableKey(term)) });
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
                                    className={`${scrollableItemClass} mb-1 flex cursor-pointer items-center rounded-md border p-1.5 text-sm transition-colors ${
                                        isSelected
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
                <label className="mb-2 block text-sm font-semibold">Location model:</label>
                <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
                    <ScrollArea className="h-full">
                        <div className={scrollableListContentClass}>
                        {params.locationModel.length === 0 ? (
                            <span className="text-xs italic text-muted-foreground">Select variable...</span>
                        ) : (
                            params.locationModel.map((term) => {
                                const variableTerm = !isInteraction(term) ? term : null;
                                return (
                                    <div
                                        key={isInteraction(term) ? term.id : getVariableKey(term)}
                                        className={`${scrollableItemClass} mb-1 flex cursor-pointer items-center rounded-md border border-transparent p-1.5 text-sm transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive`}
                                        onClick={() => handleRemove(term)}
                                        title="Click to remove"
                                    >
                                        {variableTerm ? getVariableIcon(variableTerm) : null}
                                        <span className={scrollableNameClass}>{term.name}</span>
                                    </div>
                                );
                            })
                        )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};
