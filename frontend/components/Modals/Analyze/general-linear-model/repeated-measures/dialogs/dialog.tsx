import React, {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup,} from "@/components/ui/resizable";
import type {
    RepeatedMeasuresDialogProps,
    RepeatedMeasuresMainType,
} from "@/components/Modals/Analyze/general-linear-model/repeated-measures/types/repeated-measures";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useModal} from "@/hooks/useModal";
import { toast } from "sonner";

export const RepeatedMeasuresDialog = ({
    isMainOpen,
    setIsMainOpen,
    setIsModelOpen,
    setIsContrastOpen,
    setIsEMMeansOpen,
    setIsSaveOpen,
    setIsOptionsOpen,
    updateFormData,
    data,
    globalVariables,
    combinationVars,
    onBack,
    onContinue,
    onReset,
}: RepeatedMeasuresDialogProps) => {
    const [mainState, setMainState] = useState<RepeatedMeasuresMainType>({
        ...data,
    });
    const [availableVariables, setAvailableVariables] = useState<string[]>([]);

    const { closeModal } = useModal();

    useEffect(() => {
        setMainState((prevState) => {
            // Preserve the user's filled-in SubVar across sub-dialog
            // round-trips (Contrasts/Plots/Options/...). The main dialog
            // unmounts when one of those opens and remounts when it
            // closes; the previous version blindly re-applied
            // `combinationVars`, which is the *placeholder* list emitted
            // by the Define phase ("?_(1,factor)" etc.). That wiped out
            // every "perlakuan1_(1,factor)" entry the user had already
            // dragged in.
            //
            // Strategy: identify each slot by its trailing "(N,factor)"
            // suffix. If the suffix sequence of `data.SubVar` matches
            // `combinationVars`, the user is still editing the same
            // factor configuration — keep their entries. If suffixes
            // differ (typically because the user went back to Define
            // and changed the factor structure), reseed from
            // `combinationVars` so the new slots show up.
            const suffixOf = (s: string) => {
                const m = s.match(/_(\(.*\))$/);
                return m ? m[1] : null;
            };
            const dataSubVar = data.SubVar || [];
            const combList = combinationVars || [];
            const dataSuffixes = dataSubVar.map(suffixOf).filter(Boolean);
            const combSuffixes = combList.map(suffixOf).filter(Boolean);
            const suffixesAligned =
                dataSuffixes.length === combSuffixes.length &&
                dataSuffixes.length > 0 &&
                dataSuffixes.every((s, i) => s === combSuffixes[i]);

            const preservedSubVar = suffixesAligned
                ? dataSubVar
                : dataSubVar.length > 0 && combList.length === 0
                    ? dataSubVar
                    : combList;

            return {
                ...data,
                SubVar:
                    preservedSubVar.length > 0
                        ? preservedSubVar
                        : prevState.SubVar || [],
            };
        });
    }, [data, combinationVars]);

    useEffect(() => {
        const extractedSubVars = (mainState.SubVar || [])
            .map((item) => {
                if (item.includes("?_")) return null;
                const match = item.match(/^([^(]+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);

        const usedVariables = [
            ...extractedSubVars,
            ...(mainState.FactorsVar || []),
            ...(mainState.Covariates || []),
        ].filter(Boolean);

        const updatedVariables = globalVariables.filter(
            (variable) => !usedVariables.includes(variable)
        );

        setAvailableVariables(updatedVariables);
    }, [mainState, globalVariables]);

    const handleDrop = (target: string, variable: string) => {
        setMainState((prev) => {
            const updatedState = { ...prev };

            if (target === "SubVar") {
                const updatedSubVar = [...(updatedState.SubVar || [])];
                const placeholderIndex = updatedSubVar.findIndex((item) =>
                    item.includes("?_")
                );

                if (placeholderIndex >= 0) {
                    // Replace just "?" so the "_" separator is preserved,
                    // producing e.g. "perlakuan1_(1,perlakuan_anjing)" which
                    // matches the Rust factor-parsing regex.
                    updatedSubVar[placeholderIndex] = updatedSubVar[
                        placeholderIndex
                    ].replace("?", variable);
                    updatedState.SubVar = updatedSubVar;
                } else {
                    updatedState.SubVar = [...updatedSubVar, variable];
                }
            } else if (target === "FactorsVar") {
                updatedState.FactorsVar = [
                    ...(updatedState.FactorsVar || []),
                    variable,
                ];
            } else if (target === "Covariates") {
                updatedState.Covariates = [
                    ...(updatedState.Covariates || []),
                    variable,
                ];
            }

            return updatedState;
        });
    };

    const handleRemoveVariable = (target: string, variable?: string) => {
        setMainState((prev) => {
            const updatedState = { ...prev };

            if (target === "SubVar" && variable) {
                const updatedSubVar = [...(updatedState.SubVar || [])];
                const varIndex = updatedSubVar.findIndex(
                    (item) => item === variable
                );

                if (varIndex >= 0) {
                    const formatRegex = /(\(.*\))/;
                    const formatMatch = variable.match(formatRegex);

                    if (formatMatch) {
                        const format = formatMatch[0];
                        updatedSubVar[varIndex] = `?_${format}`;
                        updatedState.SubVar = updatedSubVar;
                    } else {
                        updatedSubVar.splice(varIndex, 1);
                        updatedState.SubVar = updatedSubVar;
                    }
                }
            } else if (target === "FactorsVar") {
                updatedState.FactorsVar = (
                    updatedState.FactorsVar || []
                ).filter((item) => item !== variable);
            } else if (target === "Covariates") {
                updatedState.Covariates = (
                    updatedState.Covariates || []
                ).filter((item) => item !== variable);
            }

            return updatedState;
        });
    };

    const handleContinue = () => {
        // Every within-subjects slot ("?_(level,measure)" until filled) needs
        // a variable before the analysis can run.
        const slots = mainState.SubVar ?? [];
        if (slots.length === 0) {
            toast.error(
                "No within-subjects variables are defined. Go back to Define and add a within-subjects factor and a measure."
            );
            return;
        }
        if (slots.some((slot) => slot.includes("?_"))) {
            toast.error("Please assign a variable to every within-subjects slot.");
            return;
        }

        Object.entries(mainState).forEach(([key, value]) => {
            updateFormData(key as keyof RepeatedMeasuresMainType, value);
        });

        setIsMainOpen(false);
        onContinue(mainState);
    };

    const openDialog =
        (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
            Object.entries(mainState).forEach(([key, value]) => {
                updateFormData(key as keyof RepeatedMeasuresMainType, value);
            });
            setter(true);
        };

    const handleCancel = () => {
        setIsMainOpen(false);
        closeModal();
    };

    if (!isMainOpen) return null;

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 flex-grow">
                <ResizablePanelGroup
                    direction="horizontal"
                    className="min-h-[400px] rounded-lg border md:min-w-[200px]"
                >
                    {/* Variable List */}
                    <ResizablePanel defaultSize={25}>
                        <ScrollArea>
                            <div className="flex flex-col gap-1 justify-start items-start h-[450px] w-full p-2">
                                {availableVariables.map(
                                    (variable: string, index: number) => (
                                        <Badge
                                            key={index}
                                            className="w-full text-start text-sm font-light p-2 cursor-pointer"
                                            variant="outline"
                                            draggable
                                            onDragStart={(e) =>
                                                e.dataTransfer.setData(
                                                    "text",
                                                    variable
                                                )
                                            }
                                        >
                                            {variable}
                                        </Badge>
                                    )
                                )}
                            </div>
                        </ScrollArea>
                    </ResizablePanel>
                    <ResizableHandle withHandle />

                    {/* Defining Variable */}
                    <ResizablePanel defaultSize={55}>
                        <div className="flex flex-col gap-2 p-2">
                            <div className="w-full">
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        const variable =
                                            e.dataTransfer.getData("text");
                                        handleDrop("SubVar", variable);
                                    }}
                                >
                                    <Label className="font-bold">
                                        Within-Subjects Variables:{" "}
                                    </Label>
                                    <div className="w-full h-[120px] p-2 border rounded overflow-hidden">
                                        <ScrollArea>
                                            <div className="w-full h-[100px]">
                                                {mainState.SubVar &&
                                                mainState.SubVar.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {mainState.SubVar.map(
                                                            (variable, index) => (
                                                                <Badge
                                                                    key={index}
                                                                    className="text-start text-sm font-light p-2 cursor-pointer"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        handleRemoveVariable(
                                                                            "SubVar",
                                                                            variable
                                                                        )
                                                                    }
                                                                >
                                                                    {variable}
                                                                </Badge>
                                                            )
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-light text-gray-500">
                                                        Drop variables here.
                                                    </span>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        const variable =
                                            e.dataTransfer.getData("text");
                                        handleDrop("FactorsVar", variable);
                                    }}
                                >
                                    <Label className="font-bold">
                                        Between-Subjects Factor(s):{" "}
                                    </Label>
                                    <div className="w-full h-[120px] p-2 border rounded overflow-hidden">
                                        <ScrollArea>
                                            <div className="w-full h-[100px]">
                                                {mainState.FactorsVar &&
                                                mainState.FactorsVar.length >
                                                    0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {mainState.FactorsVar.map(
                                                            (variable, index) => (
                                                                <Badge
                                                                    key={index}
                                                                    className="text-start text-sm font-light p-2 cursor-pointer"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        handleRemoveVariable(
                                                                            "FactorsVar",
                                                                            variable
                                                                        )
                                                                    }
                                                                >
                                                                    {variable}
                                                                </Badge>
                                                            )
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-light text-gray-500">
                                                        Drop variables here.
                                                    </span>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        const variable =
                                            e.dataTransfer.getData("text");
                                        handleDrop("Covariates", variable);
                                    }}
                                >
                                    <Label className="font-bold">
                                        Covariates:{" "}
                                    </Label>
                                    <div className="w-full h-[120px] p-2 border rounded overflow-hidden">
                                        <ScrollArea>
                                            <div className="w-full h-[100px]">
                                                {mainState.Covariates &&
                                                mainState.Covariates.length >
                                                    0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {mainState.Covariates.map(
                                                            (variable, index) => (
                                                                <Badge
                                                                    key={index}
                                                                    className="text-start text-sm font-light p-2 cursor-pointer"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        handleRemoveVariable(
                                                                            "Covariates",
                                                                            variable
                                                                        )
                                                                    }
                                                                >
                                                                    {variable}
                                                                </Badge>
                                                            )
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-light text-gray-500">
                                                        Drop variables here.
                                                    </span>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />

                    {/* Tools Area */}
                    <ResizablePanel defaultSize={20}>
                        <div className="flex flex-col h-full items-start justify-start gap-1 p-2">
                            <Button
                                className="w-full"
                                type="button"
                                variant="outline"
                                onClick={openDialog(setIsModelOpen)}
                            >
                                Model
                            </Button>
                            <Button
                                className="w-full"
                                type="button"
                                variant="outline"
                                onClick={openDialog(setIsContrastOpen)}
                            >
                                Contrasts
                            </Button>
                            <Button
                                id="repeated-measures-plots-button"
                                className="w-full"
                                type="button"
                                variant="outline"
                                disabled
                            >
                                Plots
                            </Button>
                            <p className="w-full text-[11px] leading-tight text-muted-foreground">
                                Plots are not supported in this version.
                            </p>
                            {/* Post hoc tests are not computed for Repeated
                                Measures; pairwise comparisons come from EM
                                Means > Compare main effects. */}
                            <Button
                                id="repeated-measures-posthoc-button"
                                className="w-full"
                                type="button"
                                variant="outline"
                                disabled
                            >
                                Post Hoc
                            </Button>
                            <p className="w-full text-[11px] leading-tight text-muted-foreground">
                                Post Hoc is not supported in this version. Use EM Means &gt; Compare main effects for pairwise comparisons.
                            </p>
                            <Button
                                className="w-full"
                                type="button"
                                variant="outline"
                                onClick={openDialog(setIsEMMeansOpen)}
                            >
                                EM Means
                            </Button>
                            <Button
                                className="w-full"
                                type="button"
                                variant="outline"
                                onClick={openDialog(setIsSaveOpen)}
                            >
                                Save
                            </Button>
                            <Button
                                className="w-full"
                                type="button"
                                variant="outline"
                                onClick={openDialog(setIsOptionsOpen)}
                            >
                                Options
                            </Button>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
                <div>
                    {onBack && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                        >
                            Back to Define
                        </Button>
                    )}
                </div>
                <div className="flex items-center">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onReset}
                    className="mr-2"
                >
                    Reset
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="mr-2"
                >
                    Cancel
                </Button>
                <Button type="button" onClick={handleContinue}>
                    OK
                </Button>
                </div>
            </div>
        </div>
    );
};
