import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { DiscriminantSaveType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import type { CheckedState } from "@radix-ui/react-checkbox";

type Props = {
    updateFormData: (field: keyof DiscriminantSaveType, value: boolean | string | null) => void;
    data: DiscriminantSaveType;
};

export const DiscriminantSave = ({ updateFormData, data }: Props) => {
    const saveState = data;
    const [xmlPreview, setXmlPreview] = useState<string>("");

    const handleChanges = (
        field: keyof DiscriminantSaveType,
        value: CheckedState | boolean | string | null
    ) => {
        updateFormData(field, value === "indeterminate" ? false : value);
    };

    const handleXMLFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setXmlPreview(result);
            updateFormData("XmlFile", result);
        };
        reader.onerror = () => {
            console.error("Failed to read file");
            setXmlPreview("Error loading file content.");
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="Predicted"
                    checked={saveState.Predicted}
                    onCheckedChange={(checked) => handleChanges("Predicted", checked)}
                />
                <label
                    htmlFor="Predicted"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Predicted Group Membership
                </label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="Discriminant"
                    checked={saveState.Discriminant}
                    onCheckedChange={(checked) => handleChanges("Discriminant", checked)}
                />
                <label
                    htmlFor="Discriminant"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Discriminant Scores
                </label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="Probabilities"
                    checked={saveState.Probabilities}
                    onCheckedChange={(checked) => handleChanges("Probabilities", checked)}
                />
                <label
                    htmlFor="Probabilities"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Probabilities of Group Membership
                </label>
            </div>
            <ResizablePanelGroup
                direction="vertical"
                className="min-h-[200px] rounded-lg border"
            >
                <ResizablePanel defaultSize={40}>
                    <div className="flex flex-col h-full gap-2 p-2">
                        <Label className="font-bold">Export Model Information to XML File</Label>
                        <Input
                            id="XmlFile"
                            type="file"
                            accept=".xml"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    handleXMLFile(file);
                                }
                            }}
                        />
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={60}>
                    <div className="flex flex-col h-full gap-2 p-2">
                        <Label className="font-bold">Preview</Label>
                        <Textarea
                            placeholder="Preview will appear here..."
                            value={xmlPreview}
                            readOnly
                        />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};
