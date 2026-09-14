import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  HierClusSaveProps,
  HierClusSaveType,
} from "@/components/Modals/Analyze/Classify/hierarchical-cluster/types/hierarchical-cluster";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

export const HierClusSave = ({
  isSaveOpen,
  setIsSaveOpen,
  updateFormData,
  data,
}: HierClusSaveProps) => {
  const [saveState, setSaveState] = useState<HierClusSaveType>({ ...data });
  const [isContinueDisabled, setIsContinueDisabled] = useState(false);

  useEffect(() => {
    if (isSaveOpen) {
      setSaveState({ ...data });
    }
  }, [isSaveOpen, data]);

  const handleChange = (
    field: keyof HierClusSaveType,
    value: CheckedState | boolean | number | string | null
  ) => {
    setSaveState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleMembersGrp = (value: string) => {
    setSaveState((prevState) => ({
      ...prevState,
      NoneSol: value === "NoneSol",
      SingleSol: value === "SingleSol",
      RangeSol: value === "RangeSol",
    }));
  };

  const handleContinue = () => {
    Object.entries(saveState).forEach(([key, value]) => {
      updateFormData(key as keyof HierClusSaveType, value);
    });
    setIsSaveOpen(false);
  };
  if (!isSaveOpen) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-start gap-2 p-4">
          <ResizablePanelGroup
            direction="vertical"
            className="min-h-[250px] max-w-md rounded-lg border md:min-w-[200px]"
          >
            <ResizablePanel defaultSize={100}>
              <div className="flex flex-col gap-2 w-full p-2">
                <Label className="font-bold">Cluster Membership</Label>
                <RadioGroup
                  value={
                    saveState.NoneSol
                      ? "NoneSol"
                      : saveState.SingleSol
                      ? "SingleSol"
                      : saveState.RangeSol
                      ? "RangeSol"
                      : "NoneSol"
                  }
                  onValueChange={handleMembersGrp}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NoneSol" id="NoneSol" />
                      <Label htmlFor="NoneSol">None</Label>
                    </div>
                    <div className="flex flex-col gap-2 space-x-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SingleSol" id="SingleSol" />
                        <Label htmlFor="SingleSol">Single Solution</Label>
                      </div>
                      <div className="flex items-center pl-4 space-x-2">
                        <label
                          htmlFor="NoOfCluster"
                          className="w-[200px] text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Number of Cluster:
                        </label>
                        <div className="w-[100px]">
                          <Input
                            id="NoOfCluster"
                            type="number"
                            placeholder=""
                            value={saveState.NoOfCluster ?? ""}
                            disabled={!saveState.SingleSol}
                            onChange={(e) =>
                              handleChange(
                                "NoOfCluster",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 space-x-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="RangeSol" id="RangeSol" />
                        <Label htmlFor="RangeSol">Range of Solutions</Label>
                      </div>
                      <div className="flex items-center pl-4 space-x-2">
                        <label
                          htmlFor="MinCluster"
                          className="w-[200px] text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Minimum number of Clusters:
                        </label>
                        <div className="w-[100px]">
                          <Input
                            id="MinCluster"
                            type="number"
                            placeholder=""
                            value={saveState.MinCluster ?? ""}
                            disabled={!saveState.RangeSol}
                            onChange={(e) =>
                              handleChange("MinCluster", Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center pl-4 space-x-2">
                        <label
                          htmlFor="MaxCluster"
                          className="w-[200px] text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Maximum number of Clusters:
                        </label>
                        <div className="w-[100px]">
                          <Input
                            id="MaxCluster"
                            type="number"
                            placeholder=""
                            value={saveState.MaxCluster ?? ""}
                            disabled={!saveState.RangeSol}
                            onChange={(e) =>
                              handleChange("MaxCluster", Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
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
            onClick={() => setIsSaveOpen(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            id="hierclus-save-continue-button"
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
