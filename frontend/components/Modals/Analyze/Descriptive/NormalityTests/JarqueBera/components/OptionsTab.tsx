import type { FC } from "react";
import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActiveElementHighlight } from "@/components/Common/TourComponents";
import type { JarqueBeraTestOptions, TourStep } from "../types";

interface OptionsTabProps {
    options: JarqueBeraTestOptions;
    updateOption: <K extends keyof JarqueBeraTestOptions>(
        key: K,
        value: JarqueBeraTestOptions[K]
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
            {/* Statistics Options */}
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
                            Descriptive statistics (Mean, Std. Dev, Skewness, Kurtosis)
                        </Label>
                    </div>
                </div>
                <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'statistics-section')} />
            </div>

            {/* Significance Level */}
            <div id="significance-level-section" className="space-y-4 relative">
                <h3 className="text-sm font-semibold">Significance Level (α)</h3>
                <div className="pl-4">
                    <Select
                        value={options.significanceLevel.toString()}
                        onValueChange={(value) => updateOption('significanceLevel', parseFloat(value))}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select significance level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0.01">0.01 (99% Confidence)</SelectItem>
                            <SelectItem value="0.05">0.05 (95% Confidence)</SelectItem>
                            <SelectItem value="0.10">0.10 (90% Confidence)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                        If p-value &lt; α, reject the null hypothesis (data is not normal)
                    </p>
                </div>
                <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'significance-level-section')} />
            </div>

            {/* About Section */}
            <div id="about-section" className="p-4 bg-muted/30 rounded-md border relative">
                <h4 className="text-sm font-semibold mb-2">About Jarque-Bera Test</h4>
                <p className="text-xs text-muted-foreground">
                    The Jarque-Bera Test is a goodness-of-fit test that determines whether sample data have the
                    skewness and kurtosis matching a normal distribution.
                </p>

                <div className="mt-3 p-2 bg-background/50 rounded border font-mono text-xs">
                    <p className="font-semibold">Formula:</p>
                    <p className="mt-1">JB = n × [(S²/6) + ((K-3)²/24)]</p>
                    <p className="mt-1 text-muted-foreground">
                        Where: n = sample size, S = skewness, K = kurtosis
                    </p>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                    <strong>Null Hypothesis (H₀):</strong> Data follows a normal distribution (S=0, K=3)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    <strong>Alternative (H₁):</strong> Data does not follow a normal distribution
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                    The JB statistic follows a chi-square distribution with df=2.
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                    <strong>Note:</strong> This test is most suitable for large samples (n &gt; 30).
                    For smaller samples, consider using Shapiro-Wilk test instead.
                </p>
                <ActiveElementHighlight active={tourActive && currentStep === tourSteps.findIndex(step => step.targetId === 'about-section')} />
            </div>
        </div>
    );
};

export default OptionsTab;
