import { AnalysisSection } from "../types/ordinal";
import { OrdinalFormatterContext, normalizeLinkFunctionLabel } from "./formatter_context";
import { createSection, safeFixed } from "./formatter_utils";

export const formatIterationHistory = (
  context: OrdinalFormatterContext
): AnalysisSection[] => {
  const { result, wantIterationHistory, linkFunctionLabel } = context;
  const iterationHistory = Array.isArray(result.iterationHistory)
    ? result.iterationHistory
    : (Array.isArray(result.iteration_history) ? result.iteration_history : []);
  const iterationHistoryMeta = result.iterationHistoryMeta || result.iteration_history_meta || null;

  if (!wantIterationHistory || iterationHistory.length === 0) {
    return [];
  }

  const thresholdNames = Array.isArray(iterationHistoryMeta?.thresholdNames)
    ? iterationHistoryMeta.thresholdNames
    : [];
  const locationNames = Array.isArray(iterationHistoryMeta?.locationNames)
    ? iterationHistoryMeta.locationNames
    : [];
  const scaleNames = Array.isArray(iterationHistoryMeta?.scaleNames)
    ? iterationHistoryMeta.scaleNames
    : [];
  const hasMaxAbsGradient = iterationHistory.some(
    (row: any) => typeof row?.maxAbsGradient === "number" || typeof row?.max_abs_gradient === "number"
  );

  const columnHeaders = [
    { header: "Iteration", key: "rh1" },
    { header: "Number of Step-Halvings", key: "stepHalvings" },
    { header: "-2 Log Likelihood", key: "neg2ll" },
    ...(hasMaxAbsGradient ? [{ header: "Max Absolute Gradient", key: "maxAbsGradient" }] : []),
    ...thresholdNames.map((name: string, index: number) => ({
      header: `Threshold: ${name}`,
      key: `threshold_${index}`,
    })),
    ...locationNames.map((name: string, index: number) => ({
      header: `Location: ${name}`,
      key: `location_${index}`,
    })),
    ...scaleNames.map((name: string, index: number) => ({
      header: `Scale: ${name}`,
      key: `scale_${index}`,
    })),
  ];

  const rows = iterationHistory.map((row: any) => {
    const thresholdValues = Array.isArray(row.threshold) ? row.threshold : [];
    const locationValues = Array.isArray(row.location) ? row.location : [];
    const scaleValues = Array.isArray(row.scale) ? row.scale : [];
    const iterationValue = Number(row.iteration ?? 0);
    const stepHalvings = Number(row.stepHalvings ?? row.step_halvings ?? 0);

    const rowMinus2 = typeof row.minus2LogLikelihoodDisplayed === "number"
      ? row.minus2LogLikelihoodDisplayed
      : (typeof row.minus2_log_likelihood_displayed === "number"
        ? row.minus2_log_likelihood_displayed
        : (typeof row.minus2LogLikelihood === "number"
          ? row.minus2LogLikelihood
          : (typeof row.minus2_log_likelihood === "number" ? row.minus2_log_likelihood : null)));

    const formatted: Record<string, any> = {
      rowHeader: [Number.isFinite(iterationValue) ? iterationValue.toString() : "0"],
      stepHalvings: Number.isFinite(stepHalvings) ? stepHalvings.toString() : "0",
      neg2ll: safeFixed(rowMinus2, 3),
    };

    const maxAbsGradient = typeof row.maxAbsGradient === "number"
      ? row.maxAbsGradient
      : (typeof row.max_abs_gradient === "number" ? row.max_abs_gradient : null);
    if (hasMaxAbsGradient) {
      formatted.maxAbsGradient = safeFixed(maxAbsGradient, 3);
    }

    thresholdNames.forEach((_: string, index: number) => {
      formatted[`threshold_${index}`] = safeFixed(thresholdValues[index], 6);
    });
    locationNames.forEach((_: string, index: number) => {
      formatted[`location_${index}`] = safeFixed(locationValues[index], 6);
    });
    scaleNames.forEach((_: string, index: number) => {
      formatted[`scale_${index}`] = safeFixed(scaleValues[index], 6);
    });

    return formatted;
  });

  const linkFunction = iterationHistoryMeta?.linkFunction || linkFunctionLabel;
  const lastChangeNeg2ll = safeFixed(
    iterationHistoryMeta?.lastAbsChangeMinus2LogLikelihood,
    3
  );
  const lastChangeParams = safeFixed(
    iterationHistoryMeta?.lastMaxAbsChangeParameters,
    6
  );
  const converged = Boolean(iterationHistoryMeta?.converged ?? result.converged);
  const note = `a. Link function: ${normalizeLinkFunctionLabel(linkFunction)}.\n`
    + `b. The parameter estimates ${converged ? "converged" : "did not converge"}. `
    + `Last absolute change in -2 Log Likelihood is ${lastChangeNeg2ll}, and last maximum absolute change in parameters is ${lastChangeParams}.`;

  console.log("[ORDINAL][FORMATTER][ITERATION_HISTORY]", {
    rows: iterationHistory.length,
    meta: iterationHistoryMeta,
  });

  return [
    createSection(
      "ordinal_iteration_history",
      "Iteration History",
      { columnHeaders, rows },
      {
        description: "Riwayat Iterasi Estimasi Parameter",
        note,
      }
    ),
  ];
};
