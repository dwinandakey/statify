import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Activity, LineChart } from "lucide-react";
import type { BinaryLogisticSaveParams } from "../types/binary-logistic";

interface SaveCheckboxRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const SaveCheckboxRow: React.FC<SaveCheckboxRowProps> = ({
  id,
  label,
  checked,
  onCheckedChange,
}) => (
  <div
    className="flex items-center space-x-2.5 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-accent/60 cursor-pointer"
    onClick={() => onCheckedChange(!checked)}
  >
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(!!c)}
      onClick={(e) => e.stopPropagation()}
    />
    <Label htmlFor={id} className="font-normal cursor-pointer select-none">
      {label}
    </Label>
  </div>
);

export const SaveTab = ({
  params,
  onChange,
}: {
  params: BinaryLogisticSaveParams;
  onChange: (p: Partial<BinaryLogisticSaveParams>) => void;
}) => (
  <div className="grid grid-cols-2 gap-5 py-4 h-full overflow-y-auto pr-1">
    {/* KOLOM KIRI */}
    <div className="space-y-5">
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            Predicted Values
          </CardTitle>
          <CardDescription className="text-xs">
            Saves model-based predictions as new dataset variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-1">
          <SaveCheckboxRow
            id="prob"
            label="Probabilities"
            checked={params.predictedProbabilities}
            onCheckedChange={(c) => onChange({ predictedProbabilities: c })}
          />
          <SaveCheckboxRow
            id="group"
            label="Group membership"
            checked={params.predictedGroup}
            onCheckedChange={(c) => onChange({ predictedGroup: c })}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-primary" />
            Influence
          </CardTitle>
          <CardDescription className="text-xs">
            Diagnostics that flag cases with disproportionate effect on the model.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-1">
          <SaveCheckboxRow
            id="cook"
            label="Cook's distance"
            checked={params.influenceCooks}
            onCheckedChange={(c) => onChange({ influenceCooks: c })}
          />
          <SaveCheckboxRow
            id="leverage"
            label="Leverage values"
            checked={params.influenceLeverage}
            onCheckedChange={(c) => onChange({ influenceLeverage: c })}
          />
          <SaveCheckboxRow
            id="dfbeta"
            label="DfBeta(s)"
            checked={params.influenceDfBeta}
            onCheckedChange={(c) => onChange({ influenceDfBeta: c })}
          />
        </CardContent>
      </Card>
    </div>

    {/* KOLOM KANAN */}
    <div className="space-y-5">
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <LineChart className="h-4 w-4 text-primary" />
            Residuals
          </CardTitle>
          <CardDescription className="text-xs">
            Difference between observed and predicted outcomes, in several scalings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-1">
          <SaveCheckboxRow
            id="res_un"
            label="Unstandardized"
            checked={params.residualsUnstandardized}
            onCheckedChange={(c) => onChange({ residualsUnstandardized: c })}
          />
          <SaveCheckboxRow
            id="res_logit"
            label="Logit"
            checked={params.residualsLogit}
            onCheckedChange={(c) => onChange({ residualsLogit: c })}
          />
          <SaveCheckboxRow
            id="res_stud"
            label="Studentized"
            checked={params.residualsStudentized}
            onCheckedChange={(c) => onChange({ residualsStudentized: c })}
          />
          <SaveCheckboxRow
            id="res_std"
            label="Standardized"
            checked={params.residualsStandardized}
            onCheckedChange={(c) => onChange({ residualsStandardized: c })}
          />
          <SaveCheckboxRow
            id="res_dev"
            label="Deviance"
            checked={params.residualsDeviance}
            onCheckedChange={(c) => onChange({ residualsDeviance: c })}
          />
        </CardContent>
      </Card>
    </div>
  </div>
);
