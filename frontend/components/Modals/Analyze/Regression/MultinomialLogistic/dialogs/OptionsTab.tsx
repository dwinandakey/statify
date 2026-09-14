"use client";

import React, { useRef } from "react";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type MultinomialAdvancedOptions = {
    dispersionScale: "none" | "userDefined" | "pearson" | "deviance";
    dispersionValue: string;
    entryProbability: string;
    entryTest: "likelihoodRatio" | "score";
    removalProbability: string;
    removalTest: "likelihoodRatio" | "score";
    minimumSteppedEffects: string;
    maximumSteppedEffects: string;
    constrainHierarchy: boolean;
    hierarchyMode:
    | "treat_covariates_like_factors"
    | "consider_only_factorial_terms"
    | "within_covariate_effects";
};

interface OptionsTabProps {
    referenceCategory: string;
    advanced: MultinomialAdvancedOptions;
    onReferenceCategoryChange: (value: string) => void;
    onAdvancedChange: (patch: Partial<MultinomialAdvancedOptions>) => void;
    dependentVariable: any;
}

export const OptionsTab: React.FC<OptionsTabProps> = ({
    referenceCategory,
    advanced,
    onReferenceCategoryChange,
    onAdvancedChange,
    dependentVariable,
}) => {
    const selectTriggerRef = useRef<any>(null);
    const { data } = useAnalysisData();
    const handleAdvancedString = (
        key: keyof MultinomialAdvancedOptions,
        value: string
    ) => {
        onAdvancedChange({ [key]: value } as Partial<MultinomialAdvancedOptions>);
    };

    return (
        <div className="space-y-6 p-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">Reference Category</h4>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs text-xs">
                                    Kategori referensi dipakai sebagai pembanding untuk semua kategori lain.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <RadioGroup
                    value={["first", "last"].includes(referenceCategory) ? referenceCategory : "custom"}
                    onValueChange={(val) => {
                        if (val !== "custom") {
                            onReferenceCategoryChange(val);
                        } else {
                            onReferenceCategoryChange("");
                            // open the select immediately so user can pick the custom category
                            setTimeout(() => {
                                try {
                                    selectTriggerRef.current?.click();
                                } catch {
                                    // ignore
                                }
                            }, 0);
                        }
                    }}
                    className="grid gap-3"
                >
                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="first" id="first" />
                        <Label htmlFor="first" className="text-sm font-normal">
                            First category
                        </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="last" id="last" />
                        <Label htmlFor="last" className="text-sm font-normal">
                            Last category (Default)
                        </Label>
                    </div>

                    <div className="flex items-center space-x-3">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="text-sm font-normal mr-2">
                            Custom category:
                        </Label>
                        <Select
                            disabled={!dependentVariable}
                            onValueChange={(val) => onReferenceCategoryChange(val)}
                            value={!["first", "last"].includes(referenceCategory) ? referenceCategory : ""}
                        >
                            <SelectTrigger ref={selectTriggerRef} className="w-full h-8 text-xs">
                                <SelectValue placeholder="Pilih kategori..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(
                                    (Array.isArray(dependentVariable?.values) && dependentVariable!.values.length > 0
                                        ? dependentVariable!.values
                                        : (() => {
                                            // fallback: build distinct values from active data rows
                                            try {
                                                const col = dependentVariable?.columnIndex;
                                                if (col === undefined || !Array.isArray(data) || data.length === 0) return [];
                                                const seen = new Set<string>();
                                                const items: Array<{ value: string; label: string }> = [];
                                                for (const row of data) {
                                                    const raw = row?.[col];
                                                    const str = raw === null || raw === undefined ? "" : String(raw).trim();
                                                    if (str !== "" && !seen.has(str)) {
                                                        seen.add(str);
                                                        items.push({ value: str, label: str });
                                                    }
                                                }
                                                return items;
                                            } catch {
                                                return [];
                                            }
                                        })()) as any[]
                                )
                                .filter((cat: any) => cat && cat.value !== undefined && String(cat.value).trim() !== "")
                                .map((cat: any) => (
                                    <SelectItem key={String(cat.value)} value={String(cat.value)}>
                                        {cat.label ?? cat.value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-4">
                <h4 className="text-sm font-semibold">Dispersion Scale</h4>
                <div className="grid gap-3 rounded-md border bg-muted/10 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[64px_1fr_60px_auto] items-center gap-2">
                        <Label className="text-sm font-normal">Scale:</Label>
                        <Select
                            value={advanced.dispersionScale}
                            onValueChange={(val) =>
                                onAdvancedChange({
                                    dispersionScale: val as MultinomialAdvancedOptions["dispersionScale"],
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="userDefined">User defined</SelectItem>
                                <SelectItem value="pearson">Pearson</SelectItem>
                                <SelectItem value="deviance">Deviance</SelectItem>
                            </SelectContent>
                        </Select>
                        <Label className="text-sm font-normal ml-2">Value:</Label>
                        <Input
                            type="number"
                            step="0.01"
                            className="h-8 w-20"
                            value={advanced.dispersionValue}
                            onChange={(e) => handleAdvancedString("dispersionValue", e.target.value)}
                            disabled={advanced.dispersionScale !== "userDefined"}
                        />
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h4 className="text-sm font-semibold">Stepwise Options</h4>
                <div className="overflow-x-auto">
                    <div className="grid gap-4 rounded-md border bg-muted/10 p-4 md:grid-cols-2 min-w-0">
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] items-center gap-2">
                                <Label className="text-sm font-normal">Entry Probability:</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 w-full sm:w-20"
                                    value={advanced.entryProbability}
                                    onChange={(e) => handleAdvancedString("entryProbability", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] items-center gap-2">
                                <Label className="text-sm font-normal">Entry Test:</Label>
                                <Select
                                    value={advanced.entryTest}
                                    onValueChange={(val) => onAdvancedChange({ entryTest: val as MultinomialAdvancedOptions["entryTest"] })}
                                >
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="likelihoodRatio">Likelihood ratio</SelectItem>
                                        <SelectItem value="score">Score</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] items-center gap-2">
                                <Label className="text-sm font-normal">Removal Probability:</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 w-full sm:w-20"
                                    value={advanced.removalProbability}
                                    onChange={(e) => handleAdvancedString("removalProbability", e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] items-center gap-2">
                                <Label className="text-sm font-normal">Removal Test:</Label>
                                <Select
                                    value={advanced.removalTest}
                                    onValueChange={(val) => onAdvancedChange({ removalTest: val as MultinomialAdvancedOptions["removalTest"] })}
                                >
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="likelihoodRatio">Likelihood ratio</SelectItem>
                                        <SelectItem value="score">Score</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 md:border-l md:pl-4">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_96px] items-center gap-2">
                            <Label className="text-sm font-normal whitespace-normal">
                                Minimum Stepped Effects in Model (for backward methods)
                            </Label>
                            <Input
                                type="number"
                                step="1"
                                className="h-8 w-full sm:w-24"
                                value={advanced.minimumSteppedEffects}
                                onChange={(e) => handleAdvancedString("minimumSteppedEffects", e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_96px] items-center gap-2">
                            <Label className="text-sm font-normal whitespace-normal">
                                Maximum Stepped Effects in Model (for forward methods)
                            </Label>
                            <Input
                                type="number"
                                step="1"
                                className="h-8 w-full sm:w-24"
                                value={advanced.maximumSteppedEffects}
                                onChange={(e) => handleAdvancedString("maximumSteppedEffects", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <h4 className="text-sm font-semibold">Hierarchy</h4>
                <div className="space-y-4 rounded-md border bg-muted/10 p-4">
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="hierarchyConstraint"
                            checked={advanced.constrainHierarchy}
                            onCheckedChange={(checked) =>
                                onAdvancedChange({ constrainHierarchy: checked === true })
                            }
                            className="mt-1"
                        />
                        <div className="space-y-2">
                            <Label htmlFor="hierarchyConstraint" className="text-sm font-normal">
                                Hierarchically constrain entry and removal of terms
                            </Label>

                            <RadioGroup
                                value={advanced.hierarchyMode}
                                onValueChange={(value) =>
                                    onAdvancedChange({
                                        hierarchyMode: value as MultinomialAdvancedOptions["hierarchyMode"],
                                    })
                                }
                                disabled={!advanced.constrainHierarchy}
                                className="space-y-3 pl-1"
                            >
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem
                                        value="treat_covariates_like_factors"
                                        id="hierarchy-mode-1"
                                        className="mt-1"
                                    />
                                    <Label htmlFor="hierarchy-mode-1" className="text-sm font-normal leading-5 whitespace-normal">
                                        Treat covariates like factors for the purposes of determining hierarchy
                                    </Label>
                                </div>
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem
                                        value="consider_only_factorial_terms"
                                        id="hierarchy-mode-2"
                                        className="mt-1"
                                    />
                                    <Label htmlFor="hierarchy-mode-2" className="text-sm font-normal leading-5 whitespace-normal">
                                        Consider only factorial terms for determining hierarchy; any terms with covariates can be entered any time
                                    </Label>
                                </div>
                                <div className="flex items-start gap-3">
                                    <RadioGroupItem
                                        value="within_covariate_effects"
                                        id="hierarchy-mode-3"
                                        className="mt-1"
                                    />
                                    <Label htmlFor="hierarchy-mode-3" className="text-sm font-normal leading-5 whitespace-normal">
                                        Within covariate effects, consider only factorial terms for determining hierarchy
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </div>
            </div>

            {/* Note removed: backend hierarchy enforcement implemented in WASM */}

            {!dependentVariable && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-start gap-3">
                    <div className="text-amber-600 mt-0.5">⚠️</div>
                    <p className="text-[11px] text-amber-700 leading-tight">
                        Pilih <strong>Dependent Variable</strong> di tab Model/Vars terlebih dahulu untuk mengaktifkan opsi kategori referensi kustom.
                    </p>
                </div>
            )}
        </div>
    );
};