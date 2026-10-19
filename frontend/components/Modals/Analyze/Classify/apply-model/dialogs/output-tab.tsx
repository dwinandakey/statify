// AGENTS.md §3.3 (ApplyModelOutputTabType) dan §6.5 (Tab Output) — Fase 14.
// Komponen terkontrol: lima checkbox Output Viewer. "Evaluation metrics" dan
// "Confusion matrix" tetap terlihat tetapi disabled bila tidak ada actual
// target. Tidak menulis ke dataset, tidak memanggil worker.

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getEffectiveOutputFlags,
  normalizeCheckboxValue,
} from "@/components/Modals/Analyze/Classify/apply-model/hooks/useApplyModelOutputRules";
import { getOutputRowTourId } from "@/components/Modals/Analyze/Classify/apply-model/hooks/tourConfig";
import type { ApplyModelOutputTabType } from "@/components/Modals/Analyze/Classify/apply-model/types/apply-model";

export type OutputTabProps = {
  data: ApplyModelOutputTabType;
  hasActualTarget: boolean;
  onChange: (next: ApplyModelOutputTabType) => void;
};

type OutputOption = {
  field: keyof ApplyModelOutputTabType;
  label: string;
  requiresActual: boolean;
};

const OUTPUT_OPTIONS: readonly OutputOption[] = [
  {
    field: "ModelSummary",
    label: "Model summary",
    requiresActual: false,
  },
  {
    field: "CaseProcessingSummary",
    label: "Case processing summary",
    requiresActual: false,
  },
  {
    field: "PredictionDistribution",
    label: "Prediction distribution",
    requiresActual: false,
  },
  {
    field: "EvaluationMetrics",
    label: "Evaluation metrics",
    requiresActual: true,
  },
  {
    field: "ConfusionMatrix",
    label: "Confusion matrix",
    requiresActual: true,
  },
];

const REQUIRES_ACTUAL_TEXT =
  "Requires an actual target variable (Variables tab).";

export function OutputTab({
  data,
  hasActualTarget,
  onChange,
}: OutputTabProps) {
  // Nilai yang ditampilkan = flag efektif; nilai tersimpan tidak diubah
  // sehingga pilihan pengguna kembali bila actual target diisi lagi.
  const effective = getEffectiveOutputFlags(data, hasActualTarget);

  return (
    <div className="flex flex-col gap-3">
      <Label className="font-semibold">Output Viewer</Label>
      {OUTPUT_OPTIONS.map((option) => {
        const disabled = option.requiresActual && !hasActualTarget;
        const id = `output-${option.field}`;

        return (
          <div
            key={option.field}
            id={getOutputRowTourId(option.field)}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={effective[option.field]}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange({
                    ...data,
                    [option.field]: normalizeCheckboxValue(checked) === true,
                  })
                }
              />
              <Label htmlFor={id}>{option.label}</Label>
            </div>
            {disabled && (
              <p className="text-xs text-muted-foreground">
                {REQUIRES_ACTUAL_TEXT}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default OutputTab;
