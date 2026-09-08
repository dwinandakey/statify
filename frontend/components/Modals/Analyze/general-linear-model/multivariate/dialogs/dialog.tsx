import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { TargetListConfig } from "@/components/Common/VariableListManager";
import VariableListManager from "@/components/Common/VariableListManager";
import type { Variable } from "@/types/Variable";
import type {
    MultivariateDialogProps,
    MultivariateMainType,
    VarianceMode,
} from "@/components/Modals/Analyze/general-linear-model/multivariate/types/multivariate";
import { useModal } from "@/hooks/useModal";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import {
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { TourPopup } from "@/components/Common/TourComponents";
import { useTourGuide } from "../hooks/useTourGuide";
import { multivariateTourSteps } from "../hooks/tourConfig";

export const MultivariateDialog = ({
    isMainOpen,
    setIsMainOpen,
    setIsModelOpen,
    setIsContrastOpen,
    setIsPlotsOpen,
    setIsPostHocOpen,
    setIsEMMeansOpen,
    setIsSaveOpen,
    setIsOptionsOpen,
    setIsBootstrapOpen,
    setIsTestValuesOpen,
    setIsPairedOpen,
    updateFormData,
    data,
    globalVariables,
    onContinue,
    onReset,
}: MultivariateDialogProps) => {
    const [mainState, setMainState] = useState<MultivariateMainType>({
        ...data,
    });
    const { closeModal } = useModal();

    const {
        tourActive,
        currentStep,
        tourSteps,
        currentTargetElement,
        startTour,
        nextStep,
        prevStep,
        endTour,
    } = useTourGuide(multivariateTourSteps);

    const [availableVars, setAvailableVars] = useState<Variable[]>([]);
    const [depVar, setDepVar] = useState<Variable[]>([]);
    const [fixFactor, setFixFactor] = useState<Variable[]>([]);
    const [covar, setCovar] = useState<Variable[]>([]);
    const [wlsWeight, setWlsWeight] = useState<Variable[]>([]);
    const [highlightedVariable, setHighlightedVariable] = useState<{
        id: string;
        source: string;
    } | null>(null);

    const listStateSetters: Record<
        string,
        React.Dispatch<React.SetStateAction<Variable[]>>
    > = useMemo(
        () => ({
            available: setAvailableVars,
            DepVar: setDepVar,
            FixFactor: setFixFactor,
            Covar: setCovar,
            WlsWeight: setWlsWeight,
        }),
        [setAvailableVars, setDepVar, setFixFactor, setCovar, setWlsWeight]
    );

    useEffect(() => {
        setMainState({ ...data });

        const allVariables: Variable[] = globalVariables.map((name, index) => ({
            name,
            tempId: name,
            label: name,
            columnIndex: index,
            type: "NUMERIC",
            width: 8,
            decimals: 2,
            align: "left",
            missing: null,
            measure: "unknown",
            role: "input",
            values: [],
            columns: 0,
        }));

        const initialUsedNames = new Set(
            [
                ...(data.DepVar || []),
                ...(data.FixFactor || []),
                ...(data.Covar || []),
                data.WlsWeight,
            ].filter(Boolean) as string[]
        );

        const varsMap = new Map(allVariables.map((v) => [v.name, v]));

        setDepVar(
            (data.DepVar || [])
                .map((name) => varsMap.get(name))
                .filter(Boolean) as Variable[]
        );
        setFixFactor(
            (data.FixFactor || [])
                .map((name) => varsMap.get(name))
                .filter(Boolean) as Variable[]
        );
        setCovar(
            (data.Covar || [])
                .map((name) => varsMap.get(name))
                .filter(Boolean) as Variable[]
        );
        setWlsWeight(
            data.WlsWeight
                ? ([varsMap.get(data.WlsWeight)].filter(Boolean) as Variable[])
                : []
        );
        setAvailableVars(
            allVariables.filter((v) => !initialUsedNames.has(v.name))
        );
    }, [data, globalVariables]);

    useEffect(() => {
        setMainState((prevState) => ({
            ...prevState,
            DepVar: depVar.map((v) => v.name),
            FixFactor: fixFactor.map((v) => v.name),
            Covar: covar.map((v) => v.name),
            WlsWeight: wlsWeight[0]?.name || null,
            // The Welch radio is only visible with exactly one Fixed Factor.
            // Reset to default (null → Pooled in Rust) when the user moves
            // away from that shape, so stale Welch state can't leak into a
            // multi-factor or no-factor analysis.
            VarianceMode:
                fixFactor.length === 1 ? prevState.VarianceMode : null,
        }));
    }, [depVar, fixFactor, covar, wlsWeight]);

    const targetListsConfig = useMemo(
        () =>
            [
                {
                    id: "DepVar",
                    title: "Dependent Variables:",
                    variables: depVar,
                    height: "100px",
                    containerId: "multivariate-dependent-variables",
                },
                {
                    id: "FixFactor",
                    title: "Fixed Factor(s):",
                    variables: fixFactor,
                    height: "100px",
                    containerId: "multivariate-fixed-factors",
                },
                {
                    id: "Covar",
                    title: "Covariate(s):",
                    variables: covar,
                    height: "100px",
                    containerId: "multivariate-covariates",
                },
                {
                    id: "WlsWeight",
                    title: "WLS Weight:",
                    variables: wlsWeight,
                    height: "auto",
                    maxItems: 1,
                    containerId: "multivariate-wls-weight",
                },
            ] as unknown as TargetListConfig[],
        [depVar, fixFactor, covar, wlsWeight]
    );

    const handleMoveVariable = useCallback(
        (variable: Variable, fromListId: string, toListId: string) => {
            const fromSetter = listStateSetters[fromListId];
            const toSetter = listStateSetters[toListId];
            const toListConfig = targetListsConfig.find(
                (l) => l.id === toListId
            );

            if (fromSetter) {
                fromSetter((prev) =>
                    prev.filter((v) => v.tempId !== variable.tempId)
                );
            }

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
                        return [variable];
                    });
                } else {
                    toSetter((prev) => [...prev, variable]);
                }
            }
        },
        [listStateSetters, targetListsConfig, setAvailableVars]
    );

    const handleReorderVariable = useCallback(
        (listId: string, newVariables: Variable[]) => {
            const setter = listStateSetters[listId];
            if (setter) {
                setter(newVariables);
            }
        },
        [listStateSetters]
    );

    const handleContinue = () => {
        // Paired (Hotelling T²) mode supplies its own dependent vector built
        // from variable pairs and runs as a one-population test on the
        // difference vector — so the standard DepVar/FixFactor guards do not
        // apply.
        const pairedActive =
            (mainState.PairedMode?.pairs?.length ?? 0) > 0;

        // One-sample Hotelling T² mode: when the user supplies Test Values
        // (μ₀) the analysis tests H₀: E[X − μ₀] = 0 on an intercept-only
        // GLM Multivariate model — exactly the SPSS workaround. Requiring a
        // fixed factor or covariate would block the canonical one-sample
        // procedure, so we treat a populated TestValues vector the same way
        // we treat PairedMode.
        const testValuesActive =
            Array.isArray(mainState.TestValues) &&
            mainState.TestValues.length > 0;

        if (!pairedActive) {
            if (depVar.length < 2) {
                toast.warning(
                    "Please select at least two dependent variables for multivariate analysis."
                );
                return;
            }

            if (
                !testValuesActive &&
                fixFactor.length === 0 &&
                covar.length === 0
            ) {
                toast.warning(
                    "Please select at least one fixed factor or covariate."
                );
                return;
            }
        }

        Object.entries(mainState).forEach(([key, value]) => {
            updateFormData(key as keyof MultivariateMainType, value);
        });

        setIsMainOpen(false);
        onContinue(mainState);
    };

    const openDialog =
        (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
            Object.entries(mainState).forEach(([key, value]) => {
                updateFormData(key as keyof MultivariateMainType, value);
            });
            setter(true);
        };

    const handleDialog = () => {
        setIsMainOpen(false);
        closeModal();
    };

    if (!isMainOpen) return null;

    return (
        <div className="flex flex-col h-full">
            <AnimatePresence>
                {tourActive &&
                    tourSteps.length > 0 &&
                    currentStep < tourSteps.length && (
                        <TourPopup
                            step={tourSteps[currentStep]}
                            currentStep={currentStep}
                            totalSteps={tourSteps.length}
                            onNext={nextStep}
                            onPrev={prevStep}
                            onClose={endTour}
                            targetElement={currentTargetElement}
                        />
                    )}
            </AnimatePresence>
            <div className="p-4 flex-grow min-h-0 overflow-y-auto">
                <ResizablePanelGroup
                    direction="horizontal"
                    className="min-h-[400px] rounded-lg border md:min-w-[200px]"
                >
                    <ResizablePanel defaultSize={75}>
                        <div
                            id="multivariate-available-variables"
                            className="p-2 h-full"
                        >
                            <VariableListManager
                                availableVariables={availableVars}
                                targetLists={targetListsConfig}
                                variableIdKey="tempId"
                                highlightedVariable={highlightedVariable}
                                setHighlightedVariable={setHighlightedVariable}
                                onMoveVariable={handleMoveVariable}
                                onReorderVariable={handleReorderVariable}
                                showArrowButtons={true}
                                availableListHeight="450px"
                            />
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={25}>
                        <div className="flex flex-col w-full h-full items-center justify-between p-2">
                            <div className="flex flex-col gap-2 w-full">
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsModelOpen)}
                                >
                                    Model
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsContrastOpen)}
                                >
                                    Contrasts
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsPlotsOpen)}
                                >
                                    Plots
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsPostHocOpen)}
                                >
                                    Post Hoc
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsEMMeansOpen)}
                                >
                                    EM Means
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsSaveOpen)}
                                >
                                    Save
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsOptionsOpen)}
                                >
                                    Options
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsBootstrapOpen)}
                                >
                                    Bootstrap
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsTestValuesOpen)}
                                >
                                    Test Values
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={openDialog(setIsPairedOpen)}
                                >
                                    Paired
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>

                {fixFactor.length === 1 && (
                    <div className="mt-3 rounded-md border p-3 bg-background">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">
                                Covariance Matrices
                            </Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full"
                                        >
                                            <HelpCircle className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="left"
                                        className="max-w-sm"
                                    >
                                        <p className="text-xs">
                                            Pilih <b>Unequal</b>{" "}
                                            (Welch-Satterthwaite) jika
                                            asumsi Σ₁ = Σ₂ tidak terpenuhi
                                            — misal saat Box's M test
                                            signifikan. Hanya berlaku
                                            untuk Fixed Factor dengan
                                            tepat 2 level.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <RadioGroup
                            value={mainState.VarianceMode ?? "Pooled"}
                            onValueChange={(v) =>
                                setMainState((prev) => ({
                                    ...prev,
                                    VarianceMode: v as VarianceMode,
                                }))
                            }
                            className="flex flex-col gap-1"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="Pooled"
                                    id="variance-pooled"
                                />
                                <Label
                                    htmlFor="variance-pooled"
                                    className="text-sm cursor-pointer"
                                >
                                    Equal (Pooled estimate of Σ)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="Welch"
                                    id="variance-welch"
                                />
                                <Label
                                    htmlFor="variance-welch"
                                    className="text-sm cursor-pointer"
                                >
                                    Unequal (Welch-Satterthwaite)
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}
            </div>
            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
                <div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={startTour}
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="text-xs">Start feature tour</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div>
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
                        onClick={handleDialog}
                        className="mr-2"
                    >
                        Cancel
                    </Button>
                    <Button
                        id="multivariate-ok-button"
                        type="button"
                        onClick={handleContinue}
                    >
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
};
