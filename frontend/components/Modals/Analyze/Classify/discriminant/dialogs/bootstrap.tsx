import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import type { DiscriminantBootstrapType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
    updateFormData: (
        field: keyof DiscriminantBootstrapType,
        value: string[] | string | number | boolean | null
    ) => void;
    data: DiscriminantBootstrapType;
};

export const DiscriminantBootstrap = ({ updateFormData, data }: Props) => {
    const bootstrapState = data;

    const usedStrata = bootstrapState.StrataVariables || [];
    const availableVariables = (bootstrapState.Variables || []).filter(
        (variable) => !usedStrata.includes(variable)
    );

    const handleChange = (
        field: keyof DiscriminantBootstrapType,
        value: CheckedState | string | number | boolean | null
    ) => {
        updateFormData(field, value === "indeterminate" ? false : value);
    };

    const handleCIGrp = (value: string) => {
        updateFormData("Percentile", value === "Percentile");
        updateFormData("BCa", value === "BCa");
    };

    const handleSamplingGrp = (value: string) => {
        updateFormData("Simple", value === "Simple");
        updateFormData("Stratified", value === "Stratified");
    };

    const handleDrop = (target: string, variable: string) => {
        if (target === "StrataVariables") {
            updateFormData("StrataVariables", [...usedStrata, variable]);
        }
    };

    const handleRemoveVariable = (target: string, variable?: string) => {
        if (target === "StrataVariables") {
            updateFormData(
                "StrataVariables",
                usedStrata.filter((item) => item !== variable)
            );
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="PerformBootStrapping"
                        checked={bootstrapState.PerformBootStrapping}
                        onCheckedChange={(checked) => handleChange("PerformBootStrapping", checked)}
                    />
                    <label
                        htmlFor="PerformBootStrapping"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Perform Bootstrapping
                    </label>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2 pl-6 gap-2">
                        <Label>Number of Samples:</Label>
                        <div className="w-[100px]">
                            <Input
                                type="number"
                                id="NumOfSamples"
                                placeholder=""
                                value={bootstrapState.NumOfSamples ?? ""}
                                disabled={!bootstrapState.PerformBootStrapping}
                                onChange={(e) => handleChange("NumOfSamples", Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 pl-6">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="Seed"
                                checked={bootstrapState.Seed}
                                disabled={!bootstrapState.PerformBootStrapping}
                                onCheckedChange={(checked) => handleChange("Seed", checked)}
                            />
                            <label
                                htmlFor="Seed"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Set Seed for Mersenne Twister
                            </label>
                        </div>
                        <div className="flex items-center space-x-2 pl-6 gap-2">
                            <Label>Seed:</Label>
                            <div className="w-[200px]">
                                <Input
                                    id="SeedValue"
                                    type="number"
                                    placeholder=""
                                    value={bootstrapState.SeedValue ?? ""}
                                    disabled={!bootstrapState.Seed}
                                    onChange={(e) => handleChange("SeedValue", Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ResizablePanelGroup
                direction="vertical"
                className="min-h-[330px] rounded-lg border"
            >
                <ResizablePanel defaultSize={30}>
                    <div className="flex flex-col h-full gap-2 p-2">
                        <Label className="font-bold">Confidence Intervals</Label>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center space-x-2">
                                <Label className="w-[100px]">Level (%):</Label>
                                <div className="w-[100px]">
                                    <Input
                                        id="Level"
                                        type="number"
                                        placeholder=""
                                        value={bootstrapState.Level ?? ""}
                                        disabled={!bootstrapState.PerformBootStrapping}
                                        onChange={(e) => handleChange("Level", Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <RadioGroup
                                value={bootstrapState.Percentile ? "Percentile" : "BCa"}
                                disabled={!bootstrapState.PerformBootStrapping}
                                onValueChange={handleCIGrp}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Percentile" id="Percentile" />
                                    <Label htmlFor="Percentile">Percentile</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="BCa" id="BCa" />
                                    <Label htmlFor="BCa">Bias Corrected Accelerated (BCa)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={55}>
                    <div className="flex flex-col h-full gap-2 p-2">
                        <Label className="font-bold">Sampling</Label>
                        <RadioGroup
                            value={bootstrapState.Simple ? "Simple" : "Stratified"}
                            disabled={!bootstrapState.PerformBootStrapping}
                            onValueChange={handleSamplingGrp}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Simple" id="Simple" />
                                <Label htmlFor="Simple">Simple</Label>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Stratified" id="Stratified" />
                                    <Label htmlFor="Stratified">Stratified</Label>
                                </div>
                                <ResizablePanelGroup direction="horizontal">
                                    <ResizablePanel defaultSize={50}>
                                        <div className="flex flex-col gap-2 p-2">
                                            <Label>Variables:</Label>
                                            <div className="border rounded">
                                                <ScrollArea>
                                                    <div className="flex flex-col gap-1 justify-start items-start h-[100px] w-full p-2">
                                                        {availableVariables.map((variable: string, index: number) => (
                                                            <Badge
                                                                key={index}
                                                                className="w-full text-start text-sm font-light p-2 cursor-pointer"
                                                                variant="outline"
                                                                draggable
                                                                onDragStart={(e) =>
                                                                    e.dataTransfer.setData("text", variable)
                                                                }
                                                            >
                                                                {variable}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </ResizablePanel>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel defaultSize={50}>
                                        <div className="flex flex-col gap-2 p-2">
                                            <div
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    const variable = e.dataTransfer.getData("text");
                                                    handleDrop("StrataVariables", variable);
                                                }}
                                            >
                                                <Label>Strata Variables:</Label>
                                                <div className="border rounded h-[100px]">
                                                    <ScrollArea>
                                                        {usedStrata.length > 0 ? (
                                                            <div className="flex flex-col gap-1 justify-start items-start w-full p-2">
                                                                {usedStrata.map((variable, index) => (
                                                                    <Badge
                                                                        key={index}
                                                                        className="text-start text-sm font-light p-2 cursor-pointer"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            handleRemoveVariable("StrataVariables", variable)
                                                                        }
                                                                    >
                                                                        {variable}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm font-light text-gray-500 p-2">
                                                                Drop variables here.
                                                            </span>
                                                        )}
                                                    </ScrollArea>
                                                </div>
                                            </div>
                                        </div>
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            </div>
                        </RadioGroup>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};
