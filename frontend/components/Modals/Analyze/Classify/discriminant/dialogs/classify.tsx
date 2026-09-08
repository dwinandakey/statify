import { Checkbox } from "@/components/ui/checkbox";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import type { DiscriminantClassifyType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import React from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";

type Props = {
    updateFormData: (field: keyof DiscriminantClassifyType, value: number | boolean | null) => void;
    data: DiscriminantClassifyType;
};

export const DiscriminantClassify = ({ updateFormData, data }: Props) => {
    const classifyState = data;

    const handleChange = (
        field: keyof DiscriminantClassifyType,
        value: CheckedState | number | boolean | null
    ) => {
        updateFormData(field, value === "indeterminate" ? false : value);
    };

    const handlePriorGrp = (value: string) => {
        updateFormData("AllGroupEqual", value === "AllGroupEqual");
        updateFormData("GroupSize", value === "GroupSize");
    };

    const handleMatrixGrp = (value: string) => {
        updateFormData("WithinGroup", value === "WithinGroup");
        updateFormData("SepGroup", value === "SepGroup");
    };

    return (
        <div className="flex flex-col gap-3">
            <ResizablePanelGroup
                direction="vertical"
                className="min-h-[260px] rounded-lg border"
            >
                <ResizablePanel defaultSize={35}>
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={60}>
                            <div className="flex flex-col h-full gap-2 p-2">
                                <Label className="font-bold">Prior Probabilities</Label>
                                <div className="flex flex-col gap-1">
                                    <RadioGroup
                                        value={classifyState.AllGroupEqual ? "AllGroupEqual" : "GroupSize"}
                                        onValueChange={handlePriorGrp}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="AllGroupEqual" id="AllGroupEqual" />
                                            <Label htmlFor="AllGroupEqual">All Groups Equal</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="GroupSize" id="GroupSize" />
                                            <Label htmlFor="GroupSize">Compute from Group Sizes</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={40}>
                            <div className="flex flex-col h-full gap-2 p-2">
                                <Label className="font-bold">Use Covariance Matrix</Label>
                                <div className="flex flex-col gap-1">
                                    <RadioGroup
                                        value={classifyState.WithinGroup ? "WithinGroup" : "SepGroup"}
                                        onValueChange={handleMatrixGrp}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="WithinGroup" id="WithinGroup" />
                                            <Label htmlFor="WithinGroup">Within-groups</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="SepGroup" id="SepGroup" />
                                            <Label htmlFor="SepGroup">Separate-groups</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={65}>
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={60}>
                            <div className="flex flex-col h-full gap-2 p-2">
                                <Label className="font-bold">Classify</Label>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="Case"
                                            checked={classifyState.Case}
                                            onCheckedChange={(checked) => handleChange("Case", checked)}
                                        />
                                        <label
                                            htmlFor="Case"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Casewise Results
                                        </label>
                                    </div>
                                    <div className="flex items-center pl-4 space-x-2">
                                        <Checkbox
                                            id="Limit"
                                            checked={classifyState.Limit}
                                            disabled={!classifyState.Case}
                                            onCheckedChange={(checked) => handleChange("Limit", checked)}
                                        />
                                        <label
                                            htmlFor="Limit"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Limit Cases to First:
                                        </label>
                                        <div className="w-[100px]">
                                            <Input
                                                id="LimitValue"
                                                type="number"
                                                placeholder=""
                                                value={classifyState.LimitValue ?? ""}
                                                disabled={!classifyState.Limit}
                                                onChange={(e) => handleChange("LimitValue", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="Summary"
                                            checked={classifyState.Summary}
                                            onCheckedChange={(checked) => handleChange("Summary", checked)}
                                        />
                                        <label
                                            htmlFor="Summary"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Summary Table
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="Leave"
                                            checked={classifyState.Leave}
                                            onCheckedChange={(checked) => handleChange("Leave", checked)}
                                        />
                                        <label
                                            htmlFor="Leave"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Leave-one-out Classification
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={40}>
                            <div className="flex flex-col h-full gap-2 p-2">
                                <Label className="font-bold">Plots</Label>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="Combined"
                                            checked={classifyState.Combine}
                                            onCheckedChange={(checked) => handleChange("Combine", checked)}
                                        />
                                        <label
                                            htmlFor="Combined"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Combined-groups
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="SepGrp"
                                            checked={classifyState.SepGrp}
                                            onCheckedChange={(checked) => handleChange("SepGrp", checked)}
                                        />
                                        <label
                                            htmlFor="SepGrp"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Separate-groups
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="Terr"
                                            checked={classifyState.Terr}
                                            onCheckedChange={(checked) => handleChange("Terr", checked)}
                                        />
                                        <label
                                            htmlFor="Terr"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Territorial Map
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="Replace"
                    checked={classifyState.Replace}
                    onCheckedChange={(checked) => handleChange("Replace", checked)}
                />
                <label
                    htmlFor="Replace"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Replace Missing Values with Mean
                </label>
            </div>
        </div>
    );
};
