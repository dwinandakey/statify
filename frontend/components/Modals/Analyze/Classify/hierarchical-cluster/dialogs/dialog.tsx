import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type {
  HierClusDialogProps,
  HierClusMainType,
} from "@/components/Modals/Analyze/Classify/hierarchical-cluster/types/hierarchical-cluster";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useModal } from "@/hooks/useModal";
import { toast } from "sonner";
import type { TargetListConfig } from "@/components/Common/VariableListManager";
import VariableListManager from "@/components/Common/VariableListManager";
import { TourPopup } from "@/components/Common/TourComponents";
import type { Variable } from "@/types/Variable";
// import { useTourGuide } from "../hooks/useTourGuide";
// import { dialogTourSteps } from "../hooks/tourConfig";

export const HierClusDialog = ({
  isMainOpen,
  setIsMainOpen,
  setIsStatisticsOpen,
  setIsSaveOpen,
  setIsPlotsOpen,
  setIsMethodOpen,
  updateFormData,
  data,
  globalVariables,
  onContinue,
  onReset,
}: HierClusDialogProps) => {
  const [mainState, setMainState] = useState<HierClusMainType>({
    ...data,
  });
  const [availableVars, setAvailableVars] = useState<Variable[]>([]);
  const [targetVars, setTargetVars] = useState<Variable[]>([]);
  const [caseVars, setCaseVars] = useState<Variable[]>([]);
  const [highlightedVariable, setHighlightedVariable] = useState<{
    id: string;
    source: string;
  } | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(
    undefined
  );

  // const {
  //     tourActive,
  //     currentStep,
  //     tourSteps,
  //     currentTargetElement,
  //     startTour,
  //     nextStep,
  //     prevStep,
  //     endTour,
  // } = useTourGuide(dialogTourSteps);

  // useEffect(() => {
  //     if (tourActive) {
  //         const currentTourStep = tourSteps[currentStep];
  //         if (currentTourStep.targetId === "kmeans-number-of-clusters") {
  //             setOpenAccordion("item-1");
  //         }
  //     }
  // }, [tourActive, currentStep, tourSteps]);

  const { closeModal } = useModal();

  const listStateSetters: Record<
    string,
    React.Dispatch<React.SetStateAction<Variable[]>>
  > = useMemo(
    () => ({
      available: setAvailableVars,
      Variables: setTargetVars,
      LabelCases: setCaseVars,
    }),
    [setAvailableVars, setTargetVars, setCaseVars]
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
      [...(data.Variables || []), data.LabelCases].filter(Boolean)
    );

    const varsMap = new Map(allVariables.map((v) => [v.name, v]));

    setTargetVars(
      (data.Variables || [])
        .map((name) => varsMap.get(name))
        .filter(Boolean) as Variable[]
    );

    setCaseVars(
      data.LabelCases
        ? ([varsMap.get(data.LabelCases)].filter(Boolean) as Variable[])
        : []
    );

    setAvailableVars(allVariables.filter((v) => !initialUsedNames.has(v.name)));
  }, [data, globalVariables]);

  useEffect(() => {
    setMainState((prevState) => ({
      ...prevState,
      Variables: targetVars.map((v) => v.name),
      LabelCases: caseVars[0]?.name || null,
    }));
  }, [targetVars, caseVars]);

  const handleChange = (
    field: keyof HierClusMainType,
    value: CheckedState | number | boolean | string | string[] | null
  ) => {
    setMainState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const targetListsConfig: TargetListConfig[] = useMemo(
    () => [
      {
        id: "Variables",
        title: "Variables:",
        variables: targetVars,
        height: "225px",
        containerId: "hierclus-variables",
      },
      {
        id: "LabelCases",
        title: "Label Cases by:",
        variables: caseVars,
        height: "auto",
        maxItems: 1,
        containerId: "hierclus-label-cases",
      },
    ],
    [targetVars, caseVars]
  );

  const handleMoveVariable = useCallback(
    (variable: Variable, fromListId: string, toListId: string) => {
      const fromSetter = listStateSetters[fromListId];
      const toSetter = listStateSetters[toListId];
      const toListConfig = targetListsConfig.find((l) => l.id === toListId);

      if (fromSetter) {
        fromSetter((prev) => prev.filter((v) => v.name !== variable.name));
      }

      if (toSetter) {
        if (toListConfig?.maxItems === 1) {
          toSetter((prev) => {
            if (prev.length > 0) {
              const existingVar = prev[0];
              setAvailableVars((avail) => [...avail, existingVar]);
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

  const handleMethodGrp = (value: string) => {
    setMainState((prevState) => ({
      ...prevState,
      IterateClassify: value === "IterateClassify",
      ClassifyOnly: value === "ClassifyOnly",
    }));
  };

  const handleReadGrp = (value: string) => {
    setMainState((prevState) => ({
      ...prevState,
      OpenDataset: value === "OpenDataset",
      ExternalDatafile: value === "ExternalDatafile",
    }));
  };

  const handleWriteGrp = (value: string) => {
    setMainState((prevState) => ({
      ...prevState,
      NewDataset: value === "NewDataset",
      DataFile: value === "DataFile",
    }));
  };

  const handleContinue = () => {
    if (targetVars.length === 0) {
      toast.warning("Please select at least one variable.");
      return;
    }

    Object.entries(mainState).forEach(([key, value]) => {
      updateFormData(key as keyof HierClusMainType, value);
    });

    setIsMainOpen(false);
    onContinue(mainState);
  };

  const openDialog =
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
      Object.entries(mainState).forEach(([key, value]) => {
        updateFormData(key as keyof HierClusMainType, value);
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
      {/* <AnimatePresence>
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
      </AnimatePresence> */}
      <div className="flex flex-col items-center gap-2 p-4 flex-grow">
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[350px] rounded-lg border md:min-w-[200px]"
        >
          <ResizablePanel defaultSize={75}>
            <div id="hierclus-available-variables" className="p-2 h-full">
              <VariableListManager
                availableVariables={availableVars}
                targetLists={targetListsConfig}
                variableIdKey="name"
                highlightedVariable={highlightedVariable}
                setHighlightedVariable={setHighlightedVariable}
                onMoveVariable={handleMoveVariable}
                onReorderVariable={handleReorderVariable}
                showArrowButtons={true}
                availableListHeight="310px"
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25}>
            <div className="flex flex-col h-full w-full items-center justify-start gap-1 p-2">
              <Button
                className="w-full truncate"
                type="button"
                variant="outline"
                onClick={openDialog(setIsStatisticsOpen)}
              >
                Statistics
              </Button>
              <Button
                className="w-full truncate"
                type="button"
                variant="outline"
                onClick={openDialog(setIsPlotsOpen)}
              >
                Plots
              </Button>
              <Button
                className="w-full truncate"
                type="button"
                variant="outline"
                onClick={openDialog(setIsMethodOpen)}
              >
                Method
              </Button>
              <Button
                className="w-full truncate"
                type="button"
                variant="outline"
                onClick={openDialog(setIsSaveOpen)}
              >
                Save
              </Button>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* <Button
                  variant="ghost"
                  size="icon"
                  onClick={startTour}
                  className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button> */}
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
          <Button id="hierclus-ok-button" type="button" onClick={handleContinue}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
