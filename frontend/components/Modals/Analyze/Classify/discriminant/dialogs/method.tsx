import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import type { DiscriminantMethodType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import type { CheckedState } from "@radix-ui/react-checkbox";

type Props = {
    updateFormData: (field: keyof DiscriminantMethodType, value: number | boolean | null) => void;
    data: DiscriminantMethodType;
};

export const DiscriminantMethod = ({ updateFormData, data }: Props) => {
    const methodState = data;

    const handleChange = (
        field: keyof DiscriminantMethodType,
        value: CheckedState | number | boolean | null
    ) => {
        updateFormData(field, value === "indeterminate" ? false : value);
    };

    const handleGrpMethod = (value: string) => {
        updateFormData("Wilks", value === "Wilks");
        updateFormData("Unexplained", value === "Unexplained");
        updateFormData("Mahalonobis", value === "Mahalanobis");
        updateFormData("FRatio", value === "FRatio");
        updateFormData("Raos", value === "Raos");
    };

    const handleCriteria = (value: string) => {
        updateFormData("FValue", value === "FValue");
        updateFormData("FProbability", value === "FProbability");
    };

    return (
        <div className="flex flex-col gap-3">
            <ResizablePanelGroup
                direction="vertical"
                className="min-h-[300px] rounded-lg border"
            >
                <ResizablePanel defaultSize={80}>
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={55}>
                            <div className="flex flex-col h-full gap-2 p-2">
                                <Label className="font-bold">Method</Label>
                                <div className="flex flex-col gap-1">
                                    <RadioGroup
                                        value={methodState.Wilks ? "Wilks" : methodState.Unexplained ? "Unexplained" : methodState.Mahalonobis ? "Mahalanobis" : methodState.FRatio ? "FRatio" : methodState.Raos ? "Raos" : "Wilks"}
                                        onValueChange={handleGrpMethod}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Wilks" id="Wilks" />
                                            <Label htmlFor="Wilks">Wilks&apos; Lambda</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Unexplained" id="Unexplained" />
                                            <Label htmlFor="Unexplained">Unexplained Variance</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Mahalanobis" id="Mahalanobis" />
                                            <Label htmlFor="Mahalanobis">Mahalanobis Distance</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="FRatio" id="FRatio" />
                                            <Label htmlFor="FRatio">Smallest F Ratio</Label>
                                        </div>
                                        <div className="flex flex-col items-start space-x-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Raos" id="Raos" />
                                                <Label htmlFor="Raos">Rao&apos;s V</Label>
                                            </div>
                                            <div className="flex items-center space-x-2 pl-4 gap-2">
                                                <Label>V-to-enter:</Label>
                                                <div className="w-[100px]">
                                                    <Input
                                                        id="VEnter"
                                                        type="number"
                                                        placeholder=""
                                                        value={methodState.VEnter ?? ""}
                                                        disabled={!methodState.Raos}
                                                        onChange={(e) => handleChange("VEnter", Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={45}>
                            <div className="flex flex-col h-full gap-2 p-2">
                                <Label className="font-bold">Criteria</Label>
                                <div className="flex flex-col gap-1">
                                    <RadioGroup
                                        value={methodState.FValue ? "FValue" : methodState.FProbability ? "FProbability" : ""}
                                        onValueChange={handleCriteria}
                                    >
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-col">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="FValue" id="FValue" />
                                                    <Label htmlFor="FValue">Use F Value</Label>
                                                </div>
                                                <div className="flex flex-row items-center space-x-2 pl-4 gap-4">
                                                    <div className="pl-2">
                                                        <Label>Entry:</Label>
                                                        <div className="w-[75px]">
                                                            <Input
                                                                id="FEntry"
                                                                type="number"
                                                                placeholder=""
                                                                value={methodState.FEntry ?? ""}
                                                                onChange={(e) => handleChange("FEntry", Number(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label>Removal:</Label>
                                                        <div className="w-[75px]">
                                                            <Input
                                                                type="number"
                                                                placeholder=""
                                                                value={methodState.FRemoval ?? ""}
                                                                onChange={(e) => handleChange("FRemoval", Number(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="FProbability" id="FProbability" />
                                                    <Label htmlFor="FProbability">Use Probability of F</Label>
                                                </div>
                                                <div className="flex flex-row items-center space-x-2 pl-4 gap-4">
                                                    <div className="pl-2">
                                                        <Label>Entry:</Label>
                                                        <div className="w-[75px]">
                                                            <Input
                                                                id="PEntry"
                                                                type="number"
                                                                placeholder=""
                                                                value={methodState.PEntry ?? ""}
                                                                onChange={(e) => handleChange("PEntry", Number(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label>Removal:</Label>
                                                        <div className="w-[75px]">
                                                            <Input
                                                                type="number"
                                                                placeholder=""
                                                                value={methodState.PRemoval ?? ""}
                                                                onChange={(e) => handleChange("PRemoval", Number(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={20}>
                    <div className="flex flex-col h-full gap-2 p-2">
                        <Label className="font-bold">Display</Label>
                        <div className="flex flex-row gap-10">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="Summary"
                                    checked={methodState.Summary}
                                    onCheckedChange={(checked) => handleChange("Summary", checked)}
                                />
                                <label
                                    htmlFor="Summary"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Summary of Steps
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="Pairwise"
                                    checked={methodState.Pairwise}
                                    onCheckedChange={(checked) => handleChange("Pairwise", checked)}
                                />
                                <label
                                    htmlFor="Pairwise"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    F for Pairwise Distances
                                </label>
                            </div>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};
