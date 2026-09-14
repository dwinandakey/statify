import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  HierClusPlotsProps,
  HierClusPlotsType,
} from "@/components/Modals/Analyze/Classify/hierarchical-cluster/types/hierarchical-cluster";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const HierClusPlots = ({
  isPlotsOpen,
  setIsPlotsOpen,
  updateFormData,
  data,
}: HierClusPlotsProps) => {
  const [plotsState, setPlotsState] = useState<HierClusPlotsType>({
    ...data,
  });
  const [isContinueDisabled, setIsContinueDisabled] = useState(false);

  useEffect(() => {
    if (isPlotsOpen) {
      setPlotsState({ ...data });
    }
  }, [isPlotsOpen, data]);

  const handleChange = (
    field: keyof HierClusPlotsType,
    value: CheckedState | boolean | number | string | null
  ) => {
    setPlotsState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleIcicleGrp = (value: string) => {
    setPlotsState((prevState) => ({
      ...prevState,
      AllClusters: value === "AllClusters",
      RangeClusters: value === "RangeClusters",
      NoneClusters: value === "NoneClusters",
    }));
  };

  const handleOrienGrp = (value: string) => {
    setPlotsState((prevState) => ({
      ...prevState,
      VertOrien: value === "VertOrien",
      HoriOrien: value === "HoriOrien",
    }));
  };

  const handleContinue = () => {
    Object.entries(plotsState).forEach(([key, value]) => {
      updateFormData(key as keyof HierClusPlotsType, value);
    });
    setIsPlotsOpen(false);
  };

  if (!isPlotsOpen) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center space-x-2 p-4">
          <Checkbox
            id="Dendrograms"
            checked={plotsState.Dendrograms}
            onCheckedChange={(checked) => handleChange("Dendrograms", checked)}
          />
          <label
            htmlFor="Dendrograms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Dendrogram
          </label>
        </div>
        <div className="flex flex-col items-start gap-2 p-4">
          <ResizablePanelGroup
            direction="vertical"
            className="min-h-[325px] max-w-md rounded-lg border md:min-w-[200px]"
          >
            <ResizablePanel defaultSize={75}>
              <div className="flex flex-col gap-2 w-full p-2">
                <Label className="font-bold">Icicle</Label>
                <RadioGroup
                  value={
                    plotsState.AllClusters
                      ? "AllClusters"
                      : plotsState.RangeClusters
                      ? "RangeClusters"
                      : "NoneClusters"
                  }
                  onValueChange={handleIcicleGrp}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AllClusters" id="AllClusters" />
                      <Label htmlFor="AllClusters">All Clusters</Label>
                    </div>
                    <div className="flex flex-col gap-2 space-x-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="RangeClusters"
                          id="RangeClusters"
                        />
                        <Label htmlFor="RangeClusters">
                          Specified Range of Clusters
                        </Label>
                      </div>
                      <div className="flex items-center pl-4 space-x-2">
                        <label
                          htmlFor="StartCluster"
                          className="w-[100px] text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Start Cluster:
                        </label>
                        <div className="w-[100px]">
                          <Input
                            id="StartCluster"
                            type="number"
                            placeholder=""
                            value={plotsState.StartCluster ?? ""}
                            disabled={!plotsState.RangeClusters}
                            onChange={(e) =>
                              handleChange(
                                "StartCluster",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center pl-4 space-x-2">
                        <label
                          htmlFor="StopCluster"
                          className="w-[100px] text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Stop Cluster:
                        </label>
                        <div className="w-[100px]">
                          <Input
                            id="StopCluster"
                            type="number"
                            placeholder=""
                            value={plotsState.StopCluster ?? ""}
                            disabled={!plotsState.RangeClusters}
                            onChange={(e) =>
                              handleChange(
                                "StopCluster",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center pl-4 space-x-2">
                        <label
                          htmlFor="StepByCluster"
                          className="w-[100px] text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          By:
                        </label>
                        <div className="w-[100px]">
                          <Input
                            id="StepByCluster"
                            type="number"
                            placeholder=""
                            value={plotsState.StepByCluster ?? ""}
                            disabled={!plotsState.RangeClusters}
                            onChange={(e) =>
                              handleChange(
                                "StepByCluster",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NoneClusters" id="NoneClusters" />
                      <Label htmlFor="NoneClusters">None</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={25}>
              <div className="flex flex-col gap-2 p-2">
                <RadioGroup
                  value={plotsState.VertOrien ? "VertOrien" : "HoriOrien"}
                  onValueChange={handleOrienGrp}
                >
                  <div className="flex flex-col gap-2">
                    <Label className="font-bold">Orientation</Label>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="VertOrien" id="VertOrien" />
                      <Label htmlFor="VertOrien">Vertical Orientation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="HoriOrien" id="HoriOrien" />
                      <Label htmlFor="HoriOrien">Horizontal Orientation</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
        <div>
          {/* <TooltipProvider>
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
                              </TooltipProvider> */}
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPlotsOpen(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            id="hierclus-plots-continue-button"
            disabled={isContinueDisabled}
            type="button"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
