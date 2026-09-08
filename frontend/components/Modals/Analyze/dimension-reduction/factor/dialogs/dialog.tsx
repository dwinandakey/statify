"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    FactorDialogProps,
    FactorMainType,
    FactorDescriptivesType,
    FactorExtractionType,
    FactorRotationType,
    FactorScoresType,
    FactorOptionsType,
    FactorType,
} from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor";
import { useModal } from "@/hooks/useModal";
import { HelpCircle } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CheckedState } from "@radix-ui/react-checkbox";
import { TourPopup } from "@/components/Common/TourComponents";
import { useTourGuide } from "../hooks/useTourGuide";
import { factorTourSteps } from "../hooks/tourConfig";
import { toast } from "sonner";

// Import tab components
import {
    VariablesTab,
    DescriptivesTab,
    ExtractionTab,
    RotationTab,
    ScoresTab,
    OptionsTab,
} from "./tabs";

// perluas sidebar biar semua form nampak
interface FactorDialogExtendedProps extends Omit<FactorDialogProps, 'setIsValueOpen' | 'setIsDescriptivesOpen' | 'setIsExtractionOpen' | 'setIsRotationOpen' | 'setIsScoresOpen' | 'setIsOptionsOpen'> {
    containerType?: "dialog" | "sidebar";
    onClose?: () => void;
    formData: FactorType;
    isAnalyzing: boolean;
    setIsValueOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FactorDialog = ({
    isMainOpen,
    setIsMainOpen,
    setIsValueOpen,
    updateFormData,
    data,
    formData,
    isAnalyzing,
    globalVariables,
    onContinue,
    onReset,
    containerType = "dialog",
    onClose,
}: FactorDialogExtendedProps) => {
    const [activeTab, setActiveTab] = useState<'variables' | 'descriptive' | 'extraction' | 'rotation' | 'scores' | 'options'>('variables');
    const [mainState, setMainState] = useState<FactorMainType>({ ...data });
    const [availableVariables, setAvailableVariables] = useState<string[]>([]);

    // Local states di setiap tab (sinkron sama formData)
    const [descriptivesState, setDescriptivesState] = useState<FactorDescriptivesType>({ ...formData.descriptives });
    const [extractionState, setExtractionState] = useState<FactorExtractionType>({ ...formData.extraction });
    const [rotationState, setRotationState] = useState<FactorRotationType>({ ...formData.rotation });
    const [scoresState, setScoresState] = useState<FactorScoresType>({ ...formData.scores });
    const [optionsState, setOptionsState] = useState<FactorOptionsType>({ ...formData.options });

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
    } = useTourGuide(factorTourSteps);

    // Sync mainState sama data Prop
    useEffect(() => {
        setMainState({ ...data });
    }, [data]);

    // Sync semua states sama formData
    useEffect(() => {
        setDescriptivesState({ ...formData.descriptives });
        setExtractionState({ ...formData.extraction });
        setRotationState({ ...formData.rotation });
        setScoresState({ ...formData.scores });
        setOptionsState({ ...formData.options });
    }, [formData]);

    // Update variabel yang tersedia
    useEffect(() => {
        const usedVariables = [
            ...(mainState.TargetVar || []),
            mainState.ValueTarget,
        ].filter(Boolean);

        const updatedVariables = globalVariables.filter(
            (variable) => !usedVariables.includes(variable)
        );
        setAvailableVariables(updatedVariables);
    }, [mainState, globalVariables]);

    // Handler untuk perubahan main state 
    const handleDrop = (target: string, variable: string) => {
        if (target === "ValueTarget") {
            updateFormData("value", "Selection", null);
        }

        setMainState((prev) => {
            const updatedState = { ...prev };
            if (target === "TargetVar") {
                updatedState.TargetVar = [
                    ...(updatedState.TargetVar || []),
                    variable,
                ];
            } else if (target === "ValueTarget") {
                updatedState.ValueTarget = variable;
            }
            return updatedState;
        });
    };

    const handleRemoveVariable = (target: string, variable?: string) => {
        if (target === "ValueTarget") {
            updateFormData("value", "Selection", null);
        }

        setMainState((prev) => {
            const updatedState = { ...prev };
            if (target === "TargetVar") {
                updatedState.TargetVar = (updatedState.TargetVar || []).filter(
                    (item) => item !== variable
                );
            } else if (target === "ValueTarget") {
                updatedState.ValueTarget = "";
            }
            return updatedState;
        });
    };

    // Handlers untuk setiap tab
    const handleDescriptivesChange = (field: keyof FactorDescriptivesType, value: CheckedState) => {
        setDescriptivesState((prev) => ({ ...prev, [field]: value }));
        updateFormData("descriptives", field, value);
    };

    const handleExtractionChange = (field: keyof FactorExtractionType, value: CheckedState | number | string | null) => {
        setExtractionState((prev) => ({ ...prev, [field]: value }));
        updateFormData("extraction", field, value);

        // Inverse auto aktif pas pilih Covariance 
        if (field === "Covariance" && value === true) {
            setDescriptivesState((prev) => ({ ...prev, Inverse: true }));
            updateFormData("descriptives", "Inverse", true);
        }
    };

    const handleRotationChange = (field: keyof FactorRotationType, value: CheckedState | number | null) => {
        setRotationState((prev) => ({ ...prev, [field]: value }));
        updateFormData("rotation", field, value);
    };

    const handleScoresChange = (field: keyof FactorScoresType, value: CheckedState | null) => {
        setScoresState((prev) => ({ ...prev, [field]: value }));
        updateFormData("scores", field, value);
    };

    const handleOptionsChange = (field: keyof FactorOptionsType, value: CheckedState | number | null) => {
        setOptionsState((prev) => ({ ...prev, [field]: value }));
        updateFormData("options", field, value);
    };

    const handleContinue = () => {
        const variableCount = mainState.TargetVar?.length ?? 0;
        const { Eigen, EigenVal, Factor, MaxFactors, MaxIter } = extractionState;
        const { MaxIter: RotationMaxIter } = rotationState;
        const { SuppressValues, SuppressValuesNum } = optionsState;

        if (Factor && (!Number.isInteger(MaxFactors) || (MaxFactors ?? 0) < 1)) {
            toast.error("The Fixed Number of Factors value cannot be less than 1");
            setActiveTab("extraction");
            return;
        }
        if (Factor && (MaxFactors ?? 0) > variableCount) {
            toast.error("The number of factors should not exceed the dimensions of the matrix");
            setActiveTab("extraction");
            return;
        }
        if (Eigen && (EigenVal ?? 0) <= 0) {
            toast.error("The threshold value of Eigenvalues must be greater than 0");
            setActiveTab("extraction");
            return;
        }
        if (!Number.isInteger(MaxIter) || (MaxIter ?? 0) < 1) {
            toast.error("The Maximum Iterations for Convergence value is at least 1");
            setActiveTab("extraction");
            return;
        }
        if (
            !rotationState.None &&
            (!Number.isInteger(RotationMaxIter) || (RotationMaxIter ?? 0) < 1)
        ) {
            toast.error("The Maximum Iterations for Convergence value is at least 1");
            setActiveTab("rotation");
            return;
        }
        if (
            SuppressValues &&
            (SuppressValuesNum === null ||
                !Number.isFinite(SuppressValuesNum) ||
                SuppressValuesNum < 0 ||
                SuppressValuesNum > 1)
        ) {
            toast.error("Absolute value must be in the range 0 to 1");
            setActiveTab("options");
            return;
        }

        // simpan state utama
        Object.entries(mainState).forEach(([key, value]) => {
            updateFormData("main", key as keyof FactorMainType, value);
        });

        onContinue(mainState);
    };

    const handleDialog = () => {
        endTour();
        setIsMainOpen(false);
        closeModal();
    };

    const renderContent = () => (
        <div className="flex flex-col h-full">
            <div className="px-6 py-2">
                <Separator />
            </div>

            <div className="flex-grow px-6 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger id="factor-variables-tab" data-testid="factor-variables-tab" value="variables">Variables</TabsTrigger>
                        <TabsTrigger id="factor-descriptive-tab" data-testid="factor-descriptive-tab" value="descriptive">Descriptive</TabsTrigger>
                        <TabsTrigger id="factor-extraction-tab" data-testid="factor-extraction-tab" value="extraction">Extraction</TabsTrigger>
                        <TabsTrigger id="factor-rotation-tab" data-testid="factor-rotation-tab" value="rotation">Rotation</TabsTrigger>
                        <TabsTrigger id="factor-scores-tab" data-testid="factor-scores-tab" value="scores">Scores</TabsTrigger>
                        <TabsTrigger id="factor-options-tab" data-testid="factor-options-tab" value="options">Options</TabsTrigger>
                    </TabsList>

                    {/* Variables Tab */}
                    <TabsContent value="variables">
                        <VariablesTab
                            mainState={mainState}
                            availableVariables={availableVariables}
                            onDrop={handleDrop}
                            onRemove={handleRemoveVariable}
                            onOpenValue={() => {
                                // simppan main state saat ini sebelum buka dialog value 
                                Object.entries(mainState).forEach(([key, value]) => {
                                    updateFormData("main", key as keyof FactorMainType, value);
                                });
                                setIsValueOpen(true);
                            }}
                        />
                    </TabsContent>

                    {/* Descriptive Tab */}
                    <TabsContent value="descriptive">
                        <DescriptivesTab
                            data={descriptivesState}
                            onChange={handleDescriptivesChange}
                        />
                    </TabsContent>

                    {/* Extraction Tab */}
                    <TabsContent value="extraction">
                        <ExtractionTab
                            data={extractionState}
                            onChange={handleExtractionChange}
                            variableCount={mainState.TargetVar?.length ?? 0}
                        />
                    </TabsContent>

                    {/* Rotation Tab */}
                    <TabsContent value="rotation">
                        <RotationTab
                            data={rotationState}
                            onChange={handleRotationChange}
                        />
                    </TabsContent>

                    {/* Scores Tab */}
                    <TabsContent value="scores">
                        <ScoresTab
                            data={scoresState}
                            onChange={handleScoresChange}
                        />
                    </TabsContent>

                    {/* Options Tab */}
                    <TabsContent value="options">
                        <OptionsTab
                            data={optionsState}
                            onChange={handleOptionsChange}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
                {/* Left: Help button */}
                <div className="flex items-center text-muted-foreground">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    data-testid="factor-help-button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={startTour}
                                    aria-label="Start feature tour"
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p className="text-xs">Help</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Right: Action buttons */}
                <div className="flex items-center space-x-4">
                    <Button id="factor-ok-button" onClick={handleContinue} disabled={isAnalyzing}>
                        OK
                    </Button>
                    <Button variant="outline" onClick={onReset} disabled={isAnalyzing}>
                        Reset
                    </Button>
                    <Button
                        variant="outline"
                        disabled={isAnalyzing}
                        onClick={() => {
                            endTour();
                            setIsMainOpen(false);
                            if (onClose) onClose();
                        }}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {containerType === "sidebar" ? (
                <div className="flex flex-col overflow-hidden w-full h-full">
                    <AnimatePresence>
                        {tourActive && currentTargetElement && (
                            <TourPopup step={tourSteps[currentStep]} currentStep={currentStep} totalSteps={tourSteps.length} onNext={nextStep} onPrev={prevStep} onClose={endTour} targetElement={currentTargetElement} />
                        )}
                    </AnimatePresence>
                    {renderContent()}
                </div>
            ) : (
                <Dialog open={isMainOpen} onOpenChange={handleDialog}>
                    <DialogContent className="sm:max-w-4xl p-0 flex flex-col h-[85vh]">
                        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
                            <DialogTitle>Factor Analysis</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow overflow-hidden flex flex-col">
                            <AnimatePresence>
                                {tourActive && currentTargetElement && (
                                    <TourPopup step={tourSteps[currentStep]} currentStep={currentStep} totalSteps={tourSteps.length} onNext={nextStep} onPrev={prevStep} onClose={endTour} targetElement={currentTargetElement} />
                                )}
                            </AnimatePresence>
                            {renderContent()}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};
