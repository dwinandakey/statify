import type { FC } from "react";
import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ActiveElementHighlight } from "@/components/Common/TourComponents";
import type { BartlettTestOptions, TourStep } from "../types";

interface OptionsTabProps {
    options: BartlettTestOptions;
    updateOption: <K extends keyof BartlettTestOptions>(
        key: K,
        value: BartlettTestOptions[K]
    ) => void;
    tourActive?: boolean;
    currentStep?: number;
    tourSteps?: TourStep[];
}

const OptionsTab: FC<OptionsTabProps> = ({
    options,
    updateOption,
    tourActive = false,
    currentStep = 0,
    tourSteps = [],
}) => {
    return (
        <div className="space-y-6 p-4">
            <div id="statistics-section" className="space-y-4 relative">
                <h3 className="text-sm font-semibold">Statistics</h3>
                <div className="space-y-2 pl-4">
                    <div className="flex items-center">
                        <Checkbox
                            id="include-descriptives"
                            checked={options.includeDescriptives}
                            onCheckedChange={(checked) =>
                                updateOption('includeDescriptives', !!checked)
                            }
                            className="mr-2"
                        />
                        <Label htmlFor="include-descriptives" className="text-sm cursor-pointer">
                            Descriptive statistics
                        </Label>
                    </div>
                </div>
                <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'statistics-section')} />
            </div>

            <div id="confidence-level-section" className="p-4 bg-muted/30 rounded-md border relative">
                <h4 className="text-sm font-semibold mb-2">About Bartlett&apos;s Test of Homogeneity</h4>
                <p className="text-xs text-muted-foreground">
                    Bartlett&apos;s Test of Homogeneity of Variances evaluates the equality of variances across groups using a chi-square distribution.
                    It is commonly used as a prerequisite check before performing ANOVA or other parametric tests that assume equal variances.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    <strong>Null Hypothesis (H₀):</strong> All group variances are equal (homogeneous).
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    <strong>Alternative (H₁):</strong> At least two group variances are different.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    A significant result (p &lt; 0.05) suggests the assumption of equal variances is violated.
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                    <strong>Note:</strong> This test is sensitive to departures from normality. For non-normal data, consider using Levene&apos;s Test instead.
                </p>
                <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'confidence-level-section')} />
            </div>
        </div>
    );
};

export default OptionsTab;
