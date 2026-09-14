/**
 * Format Step Summary Table (SPSS Style)
 *
 * This table provides a compact summary of all steps in stepwise regression,
 * showing improvement statistics, model statistics, classification percentage,
 * and variable actions.
 *
 * SPSS Step Summary Table Format:
 * Step Summary
 *              Improvement           | Model                 | Correct | Variable
 * Step   Chi-square    df    Sig.   | Chi-square   df  Sig. | Class % |
 * 1      56.144        1     .000   | 56.144       1   .000 | 83.4%   | IN: age
 * 2       9.076        1     .003   | 65.220       2   .000 | 83.8%   | IN: trestbps
 */

import type { LogisticResult, AnalysisSection, StepSummaryRow } from "../types/binary-logistic";
import { createSection, safeFixed, fmtSig, fmtPct } from "./formatter_utils";

/**
 * Generate description based on step summary data
 */
const generateStepSummaryDescription = (stepSummary: StepSummaryRow[]): string => {
  if (!stepSummary || stepSummary.length === 0) {
    return "No steps recorded in the stepwise procedure.";
  }

  const lastStep = stepSummary[stepSummary.length - 1];
  const totalSteps = stepSummary.length;
  
  const enteredCount = stepSummary.filter(s => s.variable_action.startsWith("IN:")).length;
  const removedCount = stepSummary.filter(s => s.variable_action.startsWith("OUT:")).length;
  
  let desc = `Stepwise procedure completed in ${totalSteps} step(s). `;
  
  if (enteredCount > 0 && removedCount > 0) {
    desc += `${enteredCount} variable(s) entered and ${removedCount} removed. `;
  } else if (enteredCount > 0) {
    desc += `${enteredCount} variable(s) entered. `;
  } else if (removedCount > 0) {
    desc += `${removedCount} variable(s) removed. `;
  }
  
  desc += `Final model has ${lastStep.model_df} predictor(s) with ${fmtPct(lastStep.correct_pct)} correct classification.`;
  
  return desc;
};

/**
 * Format Step Summary for Stepwise Methods
 * 
 * This table appears at the end of Block 1 for stepwise methods only.
 */
export const formatStepSummary = (
  result: LogisticResult,
  dependentName: string
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];

  // Check if step_summary exists and has data
  const stepSummary = result.step_summary;
  if (!stepSummary || stepSummary.length === 0) {
    return { sections };
  }

  // Generate description
  const description = generateStepSummaryDescription(stepSummary);

  // Build column headers - SPSS style with nested headers
  const columnHeaders = [
    { header: "Step", key: "step" },
    {
      header: "Improvement",
      children: [
        { header: "Chi-square", key: "imp_chi" },
        { header: "df", key: "imp_df" },
        { header: "Sig.", key: "imp_sig" },
      ],
    },
    {
      header: "Model",
      children: [
        { header: "Chi-square", key: "model_chi" },
        { header: "df", key: "model_df" },
        { header: "Sig.", key: "model_sig" },
      ],
    },
    { header: "Correct Class %", key: "correct_pct" },
    { header: "Variable", key: "variable" },
  ];

  // Build rows
  const rows = stepSummary.map((row) => ({
    rowHeader: [],
    step: row.step.toString(),
    imp_chi: safeFixed(row.improvement_chi_square),
    imp_df: row.improvement_df.toString(),
    imp_sig: fmtSig(row.improvement_sig),
    model_chi: safeFixed(row.model_chi_square),
    model_df: row.model_df.toString(),
    model_sig: fmtSig(row.model_sig),
    correct_pct: fmtPct(row.correct_pct),
    variable: row.variable_action,
  }));

  const stepSummaryData = {
    columnHeaders,
    rows,
  };

  sections.push(
    createSection(
      "block1_step_summary",
      "Step Summary",
      stepSummaryData,
      {
        description,
      }
    )
  );

  return { sections };
};

/**
 * Check if result has step summary data
 */
export const hasStepSummary = (result: LogisticResult): boolean => {
  return !!result.step_summary && result.step_summary.length > 0;
};
