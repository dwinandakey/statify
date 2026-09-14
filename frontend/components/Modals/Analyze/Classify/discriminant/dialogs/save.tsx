import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { normalizeXmlFileName } from "@/components/Modals/Analyze/Classify/discriminant/services/discriminant-xml-export";
import type { DiscriminantSaveType } from "@/components/Modals/Analyze/Classify/discriminant/types/discriminant";
import type { CheckedState } from "@radix-ui/react-checkbox";

type Props = {
    updateFormData: (field: keyof DiscriminantSaveType, value: boolean | string | null) => void;
    data: DiscriminantSaveType;
};

const SAVE_OPTIONS: Array<{
    field: keyof DiscriminantSaveType;
    label: string;
    hint: string;
}> = [
    {
        field: "Predicted",
        label: "Predicted Group Membership",
        hint: "Dis_1 — the group each case is classified into.",
    },
    {
        field: "Discriminant",
        label: "Discriminant Scores",
        hint: "Dis1_1, Dis2_1, … — one column per discriminant function.",
    },
    {
        field: "Probabilities",
        label: "Probabilities of Group Membership",
        hint: "Dis1_2, Dis2_2, … — one column per group.",
    },
];

export const DiscriminantSave = ({ updateFormData, data }: Props) => {
    const saveState = data;

    const handleChanges = (
        field: keyof DiscriminantSaveType,
        value: CheckedState | boolean | string | null
    ) => {
        updateFormData(field, value === "indeterminate" ? false : value);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                {SAVE_OPTIONS.map(({ field, label, hint }) => (
                    <div key={field} className="flex items-start space-x-2">
                        <Checkbox
                            id={field}
                            checked={Boolean(saveState[field])}
                            onCheckedChange={(checked) => handleChanges(field, checked)}
                            className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                            <label
                                htmlFor={field}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {label}
                            </label>
                            <span className="text-xs text-muted-foreground">{hint}</span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">
                New variables are appended to the dataset when the analysis runs. Cases left out
                of the analysis — a grouping value outside the defined range, or a missing
                predictor — stay blank.
            </p>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="ExportXml"
                        checked={saveState.ExportXml}
                        onCheckedChange={(checked) => handleChanges("ExportXml", checked)}
                    />
                    <Label htmlFor="ExportXml" className="font-bold">
                        Export Model Information to XML File
                    </Label>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="XmlFile" className="text-sm font-normal">
                        File name
                    </Label>
                    <Input
                        id="XmlFile"
                        type="text"
                        placeholder="discriminant_model.xml"
                        value={saveState.XmlFile ?? ""}
                        disabled={!saveState.ExportXml}
                        onChange={(e) => handleChanges("XmlFile", e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">
                        Saved as{" "}
                        <code>{normalizeXmlFileName(saveState.XmlFile)}</code> to your downloads
                        when the analysis finishes. Contains the discriminant functions, group
                        centroids, priors, and classification coefficients.
                    </span>
                </div>
            </div>
        </div>
    );
};
