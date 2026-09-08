import { createSection, safeFixed, fmtSig } from "./formatter_utils";
import { AnalysisSection } from "../types/ordinal";

export const formatParameterEstimates = (
  payload: any[],
  options?: { linkFunctionNote?: string; confidenceInterval?: number },
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const confidenceInterval = Number.isFinite(options?.confidenceInterval)
    ? options?.confidenceInterval
    : 95;
  const confidenceIntervalLabel = Number.isInteger(confidenceInterval)
    ? `${confidenceInterval}% Confidence Interval`
    : `${safeFixed(confidenceInterval, 2)}% Confidence Interval`;

  const data = {
    columnHeaders: [
      {
        header: "",
        children: [
          { header: "", key: "rh1" },
          { header: "", key: "rh2" },
        ],
      },
      { header: "Estimate", key: "estimate" },
      { header: "Std. Error", key: "stdError" },
      { header: "Wald", key: "wald" },
      { header: "df", key: "df" },
      { header: "Sig.", key: "sig" },
      {
        header: confidenceIntervalLabel,
        children: [
          { header: "Lower", key: "lower" },
          { header: "Upper", key: "upper" },
        ],
      },
    ],

    rows: payload.map((r: any) => {
      const isRedundant = Boolean(
        r.isRedundant ??
        r.is_redundant ??
        (r.degreesOfFreedom === 0 || r.df === 0),
      );
      const dfValue = r.degreesOfFreedom ?? r.df;
      return {
        rowHeader: [r.group, r.variable],
        estimate: isRedundant ? "0.000" : safeFixed(r.estimate),
        stdError: isRedundant ? "." : safeFixed(r.stdError),
        wald: isRedundant ? "." : safeFixed(r.wald),
        df: isRedundant ? "0" : safeFixed(dfValue, 0),
        sig: isRedundant ? "." : fmtSig(r.sig),
        lower: isRedundant ? "." : safeFixed(r.lower),
        upper: isRedundant ? "." : safeFixed(r.upper),
      };
    }),
  };

  const hasRedundant = payload.some((r: any) =>
    Boolean(
      r.isRedundant ??
      r.is_redundant ??
      (r.degreesOfFreedom === 0 || r.df === 0),
    ),
  );
  const notes = [
    options?.linkFunctionNote,
    hasRedundant
      ? "0. This parameter is set to zero because it is redundant."
      : undefined,
  ].filter(Boolean);

  sections.push(
    createSection("ordinal_parameter_estimates", "Parameter Estimates", data, {
      description: "Estimasi parameter model",
      note: notes.length > 0 ? notes.join("\n") : undefined,
    }),
  );

  return { sections };
};
