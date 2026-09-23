import type { FC } from "react";
import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { StatisticsTabProps } from "./types";
import { ActiveElementHighlight } from "@/components/Common/TourComponents";

const StatisticsTab: FC<StatisticsTabProps> = ({
    options,
    setOptions,
    tourActive = false,
    currentStep = 0,
    tourSteps = [],
}) => {
    const getStepIndex = (targetId: string) => tourSteps.findIndex(step => step.targetId === targetId);
    const chiSquareStep = getStepIndex('crosstabs-statistics-chi-square-section');

    const chiSquareChecked = options.statistics?.chiSquare ?? false;

    const handleChiSquareChange = (checked: boolean) => {
        setOptions(prev => ({
            ...prev,
            statistics: {
                ...(prev.statistics || { chiSquare: false }),
                chiSquare: checked,
            }
        }));
    };

    return (
        <div className="p-6 space-y-6" data-testid="crosstabs-statistics-tab-content">
            <div
                id="crosstabs-statistics-chi-square-section"
                className="bg-card border border-border rounded-md p-4 relative"
                data-testid="crosstabs-statistics-chi-square-section"
            >
                <div className="text-sm font-medium mb-3">Chi-Square</div>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <Checkbox
                            id="pearsonChiSquare"
                            checked={chiSquareChecked}
                            onCheckedChange={(checked) => handleChiSquareChange(!!checked)}
                            className="mr-2"
                            data-testid="crosstabs-chi-square-checkbox"
                        />
                        <Label htmlFor="pearsonChiSquare" className="text-sm cursor-pointer">
                            Pearson Chi-Square
                        </Label>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                        Uji asosiasi untuk proporsi lebih dari dua populasi (binomial/multinomial) melalui tabel kontingensi.
                    </p>
                </div>
                <ActiveElementHighlight active={tourActive && currentStep === chiSquareStep} />
            </div>
        </div>
    );
};

export default StatisticsTab;
