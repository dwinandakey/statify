import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LayoutList, GitCompareArrows, Target, Repeat, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OPTIONS_PARAM_RANGES,
  type BinaryLogisticOptionsParams,
} from "../types/binary-logistic";

interface OptionsTabProps {
  params: BinaryLogisticOptionsParams;
  onChange: (p: Partial<BinaryLogisticOptionsParams>) => void;
}

const FieldError: React.FC<{ show: boolean; message: string }> = ({ show, message }) =>
  show ? <p className="text-xs text-destructive mt-1">{message}</p> : null;

const SectionCard: React.FC<{
  id?: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, icon, title, children }) => (
  <Card id={id} className="shadow-sm">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="flex items-center gap-2 text-sm">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-1 space-y-2.5">{children}</CardContent>
  </Card>
);

export const OptionsTab: React.FC<OptionsTabProps> = ({ params, onChange }) => {
  const r = OPTIONS_PARAM_RANGES;
  const inRange = (value: number, range: { min: number; max: number }) =>
    !Number.isNaN(value) && value >= range.min && value <= range.max;

  const casewiseOutliersInvalid = !inRange(params.casewiseOutliers, r.casewiseOutliers);
  const ciLevelInvalid = !inRange(params.ciLevel, r.ciLevel);
  const probEntryInvalid = !inRange(params.probEntry, r.probEntry);
  const probRemovalInvalid = !inRange(params.probRemoval, r.probRemoval);
  const cutoffInvalid = !inRange(params.classificationCutoff, r.classificationCutoff);
  const maxIterInvalid =
    !inRange(params.maxIterations, r.maxIterations) || !Number.isInteger(params.maxIterations);

  return (
  <div className="grid grid-cols-2 gap-5 py-4 h-full overflow-y-auto pr-1">
    {/* KOLOM KIRI: Statistics and Plots */}
    <div className="space-y-5">
      <SectionCard
        id="binary-logistic-options-stats-card"
        icon={<BarChart3 className="h-4 w-4 text-primary" />}
        title="Statistics and Plots"
      >
        <div className="flex items-center space-x-2">
          <Checkbox
            id="class_plot"
            checked={params.classificationPlots}
            onCheckedChange={(c) => onChange({ classificationPlots: !!c })}
          />
          <Label htmlFor="class_plot" className="font-normal">
            Classification plots
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hosmer"
            checked={params.hosmerLemeshow}
            onCheckedChange={(c) => onChange({ hosmerLemeshow: !!c })}
          />
          <Label htmlFor="hosmer" className="font-normal">
            Hosmer-Lemeshow goodness-of-fit
          </Label>
        </div>

        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="casewise"
              checked={params.casewiseListing}
              onCheckedChange={(c) => onChange({ casewiseListing: !!c })}
            />
            <Label htmlFor="casewise" className="font-normal">
              Casewise listing of residuals
            </Label>
          </div>

          <div className="pl-6 pt-1.5">
            <RadioGroup
              disabled={!params.casewiseListing}
              value={params.casewiseType}
              onValueChange={(val: any) => onChange({ casewiseType: val })}
              className="space-y-1.5"
            >
              <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
                <RadioGroupItem value="outliers" id="cw_outliers" />
                <Label htmlFor="cw_outliers" className="text-xs font-normal whitespace-nowrap">
                  Outliers outside
                </Label>
                <Input
                  type="number"
                  min={r.casewiseOutliers.min}
                  max={r.casewiseOutliers.max}
                  step="0.1"
                  className={cn(
                    "w-12 h-6 text-xs px-1 shrink-0",
                    casewiseOutliersInvalid && "border-destructive focus-visible:ring-destructive"
                  )}
                  value={params.casewiseOutliers}
                  onChange={(e) =>
                    onChange({ casewiseOutliers: Number(e.target.value) })
                  }
                  disabled={
                    !params.casewiseListing ||
                    params.casewiseType !== "outliers"
                  }
                  aria-label="Outliers Standard Deviations"
                  aria-invalid={casewiseOutliersInvalid}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">std. dev.</span>
              </div>
              <FieldError
                show={casewiseOutliersInvalid && params.casewiseListing && params.casewiseType === "outliers"}
                message={`Must be between ${r.casewiseOutliers.min} and ${r.casewiseOutliers.max}.`}
              />
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="cw_all" />
                <Label htmlFor="cw_all" className="text-xs font-normal">
                  All cases
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="correlations"
            checked={params.correlations}
            onCheckedChange={(c) => onChange({ correlations: !!c })}
          />
          <Label htmlFor="correlations" className="font-normal">
            Correlations of estimates
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="iter_hist"
            checked={params.iterationHistory}
            onCheckedChange={(c) => onChange({ iterationHistory: !!c })}
          />
          <Label htmlFor="iter_hist" className="font-normal">
            Iteration history
          </Label>
        </div>

        <div className="pt-1 border-t border-border/60 mt-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ci_exp"
              checked={params.ciForExpB}
              onCheckedChange={(c) => onChange({ ciForExpB: !!c })}
            />
            <Label htmlFor="ci_exp" className="font-normal">
              CI for exp(B):
            </Label>
            <Input
              type="number"
              min={r.ciLevel.min}
              max={r.ciLevel.max}
              className={cn(
                "w-14 h-7 px-2",
                ciLevelInvalid && "border-destructive focus-visible:ring-destructive"
              )}
              value={params.ciLevel}
              onChange={(e) => onChange({ ciLevel: Number(e.target.value) })}
              disabled={!params.ciForExpB}
              aria-label="Confidence Interval Level"
              aria-invalid={ciLevelInvalid}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <FieldError
            show={ciLevelInvalid && params.ciForExpB}
            message={`Must be between ${r.ciLevel.min}% and ${r.ciLevel.max}%.`}
          />
        </div>
      </SectionCard>
    </div>

    {/* KOLOM KANAN */}
    <div className="space-y-5">
      <SectionCard id="binary-logistic-options-display-card" icon={<LayoutList className="h-4 w-4 text-primary" />} title="Display">
        <RadioGroup
          value={params.displayAtEachStep ? "each" : "last"}
          onValueChange={(val) =>
            onChange({ displayAtEachStep: val === "each" })
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="each" id="disp_each" />
            <Label htmlFor="disp_each" className="font-normal">
              At each step
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="last" id="disp_last" />
            <Label htmlFor="disp_last" className="font-normal">
              At last step
            </Label>
          </div>
        </RadioGroup>
      </SectionCard>

      <SectionCard
        id="binary-logistic-options-stepwise-card"
        icon={<GitCompareArrows className="h-4 w-4 text-primary" />}
        title="Probability for Stepwise"
      >
        <div className="grid grid-cols-[65px_1fr] gap-y-2.5 items-center">
          <Label htmlFor="prob_entry" className="font-normal text-sm">
            Entry:
          </Label>
          <Input
            id="prob_entry"
            type="number"
            min={r.probEntry.min}
            max={r.probEntry.max}
            step="0.01"
            className={cn("w-20 h-8", probEntryInvalid && "border-destructive focus-visible:ring-destructive")}
            value={params.probEntry}
            onChange={(e) => onChange({ probEntry: Number(e.target.value) })}
            aria-invalid={probEntryInvalid}
          />
          <div className="col-span-2 -mt-1.5">
            <FieldError show={probEntryInvalid} message={`Entry must be between ${r.probEntry.min} and ${r.probEntry.max}.`} />
          </div>
          <Label htmlFor="prob_rem" className="font-normal text-sm">
            Removal:
          </Label>
          <Input
            id="prob_rem"
            type="number"
            min={r.probRemoval.min}
            max={r.probRemoval.max}
            step="0.01"
            className={cn("w-20 h-8", probRemovalInvalid && "border-destructive focus-visible:ring-destructive")}
            value={params.probRemoval}
            onChange={(e) =>
              onChange({ probRemoval: Number(e.target.value) })
            }
            aria-invalid={probRemovalInvalid}
          />
          <div className="col-span-2 -mt-1.5">
            <FieldError show={probRemovalInvalid} message={`Removal must be between ${r.probRemoval.min} and ${r.probRemoval.max}.`} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="binary-logistic-options-cutoff-card"
        icon={<Target className="h-4 w-4 text-primary" />}
        title="Classification Cutoff"
      >
        <div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="cutoff_input" className="font-normal text-sm">
              Value:
            </Label>
            <Input
              id="cutoff_input"
              type="number"
              min={r.classificationCutoff.min}
              max={r.classificationCutoff.max}
              step="0.01"
              className={cn("w-20 h-8", cutoffInvalid && "border-destructive focus-visible:ring-destructive")}
              value={params.classificationCutoff}
              onChange={(e) =>
                onChange({ classificationCutoff: Number(e.target.value) })
              }
              aria-label="Classification Cutoff Value"
              aria-invalid={cutoffInvalid}
            />
          </div>
          <FieldError show={cutoffInvalid} message={`Must be between ${r.classificationCutoff.min} and ${r.classificationCutoff.max}.`} />
        </div>
      </SectionCard>

      <SectionCard
        id="binary-logistic-options-maxiter-card"
        icon={<Repeat className="h-4 w-4 text-primary" />}
        title="Maximum Iterations"
      >
        <div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="max_iter" className="font-normal text-sm">
              Value:
            </Label>
            <Input
              id="max_iter"
              type="number"
              min={r.maxIterations.min}
              max={r.maxIterations.max}
              step="1"
              className={cn("w-20 h-8", maxIterInvalid && "border-destructive focus-visible:ring-destructive")}
              value={params.maxIterations}
              onChange={(e) =>
                onChange({ maxIterations: Number(e.target.value) })
              }
              aria-label="Maximum Iterations"
              aria-invalid={maxIterInvalid}
            />
          </div>
          <FieldError show={maxIterInvalid} message={`Must be a whole number between ${r.maxIterations.min} and ${r.maxIterations.max}.`} />
        </div>
      </SectionCard>

      <SectionCard id="binary-logistic-options-model-card" icon={<Sigma className="h-4 w-4 text-primary" />} title="Model">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="constant"
            checked={params.includeConstant}
            onCheckedChange={(c) => onChange({ includeConstant: !!c })}
          />
          <Label htmlFor="constant" className="font-normal">
            Include constant in model
          </Label>
        </div>
      </SectionCard>
    </div>
  </div>
  );
};
