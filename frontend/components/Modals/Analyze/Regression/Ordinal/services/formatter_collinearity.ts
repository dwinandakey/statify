import { AnalysisSection } from "../types/ordinal";
import { OrdinalFormatterContext } from "./formatter_context";
import { createSection, safeFixed } from "./formatter_utils";

export const formatCollinearityDiagnostics = (
  context: OrdinalFormatterContext
): AnalysisSection[] => {
  const { result, wantTestOfMulticollinearity } = context;
  const collinearityDiagnostics = result.collinearityDiagnostics
    || result.collinearity_diagnostics
    || null;
  if (!wantTestOfMulticollinearity || !collinearityDiagnostics) {
    return [];
  }

  const diagnosticRows = Array.isArray(collinearityDiagnostics.rows)
    ? collinearityDiagnostics.rows
    : [];
  const rows = diagnosticRows.map((row: any) => ({
    rowHeader: [String(row.predictor ?? "")],
    predictor: String(row.predictor ?? ""),
    type: String(row.predictorType ?? row.predictor_type ?? ""),
    df: Number(row.df ?? 0).toFixed(0),
    gvif: safeFixed(row.gvif, 3),
    adjustedGvif: safeFixed(row.adjustedGvif ?? row.adjusted_gvif, 3),
    interpretation: String(row.interpretation ?? ""),
  }));
  const warnings = Array.isArray(collinearityDiagnostics.warnings)
    ? collinearityDiagnostics.warnings
    : [];
  const notes = [
    "GVIF is computed from the correlation matrix of the final encoded design matrix X, excluding intercept and threshold parameters.",
    "GVIF is independent of the selected link function.",
    ...warnings.map((warning: string) => `Warning: ${warning}`),
  ];

  console.log("[ORDINAL][MULTICOLLINEARITY][FORMAT_RESULT]", {
    rows: rows.length,
    warnings,
  });

  return [
    createSection(
      "ordinal_collinearity_diagnostics",
      "Collinearity Diagnostics",
      {
        columnHeaders: [
          { header: "Predictor", key: "predictor" },
          { header: "Type", key: "type" },
          { header: "df", key: "df" },
          { header: "GVIF", key: "gvif" },
          { header: "Adjusted GVIF", key: "adjustedGvif" },
          { header: "Interpretation", key: "interpretation" },
        ],
        rows,
      },
      {
        description: "GVIF-based multicollinearity diagnostics for encoded location-model predictors.",
        note: notes.join("\n"),
      }
    ),
  ];
};
