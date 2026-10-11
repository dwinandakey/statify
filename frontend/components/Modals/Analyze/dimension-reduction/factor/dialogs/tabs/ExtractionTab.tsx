"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FactorExtractionType } from "@/components/Modals/Analyze/dimension-reduction/factor/types/factor";
import { EXTRACTIONMETHOD } from "@/components/Modals/Analyze/dimension-reduction/factor/constants/factor-method";
import { CheckedState } from "@radix-ui/react-checkbox";

// Metode yang membatasi pemilihan matriks kovarians
const RESTRICTED_METHODS = [
    "UnweightLeastSqr",
    "GeneralizedLeastSqr",
    "MaxLikelihood",
];

interface ExtractionTabProps {
    data: FactorExtractionType;
    onChange: (field: keyof FactorExtractionType, value: CheckedState | number | string | null) => void;
    variableCount: number;
}

export const ExtractionTab: React.FC<ExtractionTabProps> = ({
    data,
    onChange,
    variableCount,
}) => {
    const [validationMessages, setValidationMessages] = useState<
        Partial<Record<"EigenVal" | "MaxFactors" | "MaxIter", string>>
    >({});
    const isRestrictedMethod = RESTRICTED_METHODS.includes(data.Method ?? "");

    const handleNumericChange = (
        field: "EigenVal" | "MaxFactors" | "MaxIter",
        rawValue: string
    ) => {
        if (rawValue === "") {
            setValidationMessages((previous) => ({
                ...previous,
                [field]: undefined,
            }));
            onChange(field, null);
            return;
        }

        const value = Number(rawValue);
        let message: string | null = null;

        if (field === "MaxFactors" && data.Factor) {
            if (!Number.isInteger(value) || value < 1) {
                message = "The Fixed Number of Factors value cannot be less than 1";
            } else if (value > variableCount) {
                message = "The number of factors should not exceed the dimensions of the matrix";
            }
        } else if (field === "EigenVal" && data.Eigen && value <= 0) {
            message = "The threshold value of Eigenvalues must be greater than 0";
        } else if (field === "MaxIter" && (!Number.isInteger(value) || value < 1)) {
            message = "The Maximum Iterations for Convergence value is at least 1";
        }

        setValidationMessages((previous) => ({
            ...previous,
            [field]: message ?? undefined,
        }));
        if (!message) onChange(field, value);
    };

    const handleMethodChange = (value: string) => {
        const shouldRestrict = RESTRICTED_METHODS.includes(value);
        onChange("Method", value);
        if (shouldRestrict) {
            onChange("Correlation", true);
            onChange("Covariance", false);
        }
    };

    const handleAnalyzeGrp = (value: string) => {
        onChange("Correlation", value === "Correlation");
        onChange("Covariance", value === "Covariance");
    };

    const handleExtractGrp = (value: string) => {
        onChange("Eigen", value === "Eigen");
        onChange("Factor", value === "Factor");
    };

    return (
        <div className="py-4 flex flex-col gap-4">
            {/* Method Selection */}
            <div className="w-full">
                <Label className="font-bold">Growing Method</Label>
                <Select
                    value={data.Method ?? "PrincipalComp"}
                    onValueChange={handleMethodChange}
                >
                    <SelectTrigger className="mt-2">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectGroup>
                        {EXTRACTIONMETHOD.map((method, index) => (
                            <SelectItem 
                                key={index} 
                                value={method.value}
                                disabled={method.isDisabled}
                                className={
                                    method.isDisabled
                                        ? "opacity-50 pointer-events-none cursor-not-allowed"
                                        : "cursor-pointer"
                                }
                            >
                                {method.name}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
                </Select>
            </div>

            <ResizablePanelGroup
                direction="vertical"
                className="min-h-[280px] rounded-lg border"
            >
                <ResizablePanel defaultSize={35}>
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={50}>
                            <div className="flex flex-col gap-2 p-3">
                                <Label className="font-bold">Analyze</Label>
                                <RadioGroup
                                    value={data.Correlation ? "Correlation" : "Covariance"}
                                    onValueChange={handleAnalyzeGrp}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Correlation" id="Correlation" />
                                        <Label htmlFor="Correlation">Correlation Matrix</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value="Covariance"
                                            id="Covariance"
                                            disabled={isRestrictedMethod}
                                        />
                                        <Label
                                            htmlFor="Covariance"
                                            className={isRestrictedMethod ? "text-muted-foreground" : ""}
                                        >
                                            Covariance Matrix
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle />

                        <ResizablePanel defaultSize={50}>
                            <div className="flex flex-col gap-2 p-3">
                                <Label className="font-bold">Display</Label>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="Unrotated"
                                        checked={data.Unrotated}
                                        onCheckedChange={(checked) => onChange("Unrotated", checked)}
                                    />
                                    <Label htmlFor="Unrotated">Unrotated Factor Solution</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="Scree"
                                        checked={data.Scree}
                                        onCheckedChange={(checked) => onChange("Scree", checked)}
                                    />
                                    <Label htmlFor="Scree">Scree Plot</Label>
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={65}>
                    <div className="flex flex-col gap-3 p-3">
                        <Label className="font-bold">Extract</Label>

                        <RadioGroup
                            value={data.Eigen ? "Eigen" : "Factor"}
                            onValueChange={handleExtractGrp}
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Eigen" id="Eigen" />
                                    <Label htmlFor="Eigen">Based on Eigenvalues</Label>
                                </div>

                                <div className="flex items-center space-x-2 pl-6">
                                    <Label className="w-[160px]">Eigenvalues Greater than:</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="w-[80px]"
                                            value={data.EigenVal ?? ""}
                                            disabled={!data.Eigen}
                                            onChange={(e) => handleNumericChange("EigenVal", e.target.value)}
                                        />
                                        {validationMessages.EigenVal && (
                                            <p role="alert" className="text-sm text-destructive">
                                                {validationMessages.EigenVal}
                                            </p>
                                        )}
                                        {/* Teks tambahan hanya muncul jika Covariance dipilih */}
                                        {data.Covariance && (
                                            <span className="text-sm">times the mean eigenvalue</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Factor" id="Factor" />
                                    <Label htmlFor="Factor">Fixed Number of Factors</Label>
                                </div>

                                <div className="flex items-center space-x-2 pl-6">
                                    <Label className="w-[160px]">Factors to Extract:</Label>
                                    <Input
                                        type="number"
                                        className="w-[80px]"
                                        value={data.MaxFactors ?? ""}
                                        disabled={!data.Factor}
                                        onChange={(e) => handleNumericChange("MaxFactors", e.target.value)}
                                    />
                                    {validationMessages.MaxFactors && (
                                        <p role="alert" className="text-sm text-destructive">
                                            {validationMessages.MaxFactors}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            <div className="flex items-center gap-4">
                <Label className="w-[260px]">Maximum Iterations for Convergence:</Label>
                <Input
                    type="number"
                    className="w-[80px]"
                    value={data.MaxIter ?? ""}
                    onChange={(e) => handleNumericChange("MaxIter", e.target.value)}
                />
                {validationMessages.MaxIter && (
                    <p role="alert" className="text-sm text-destructive">
                        {validationMessages.MaxIter}
                    </p>
                )}
            </div>
        </div>
    );
};
