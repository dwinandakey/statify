import { AnalysisSection } from "../types/ordinal";
import { OrdinalFormatterContext } from "./formatter_context";
import { createSection, safeFixed } from "./formatter_utils";

// Helper untuk menentukan Concern Level berdasarkan nilai VIF
const getConcernLevel = (vif: number): string => {
  if (vif < 2) return "Low";
  if (vif >= 2 && vif < 5) return "Moderate";
  if (vif >= 5 && vif < 10) return "High";
  return "Very High";
};

// Helper untuk membuat deskripsi dinamis VIF & Korelasi (mengikuti binary logistic)
const generateAssumptionDescription = (
  vifData: any[],
  correlationMatrix: any
): string => {
  const descriptionParts = [];

  // Analisis VIF
  const highVif = vifData.filter((r) => Number(r.vif) >= 5);
  if (highVif.length > 0) {
    const vars = highVif
      .map((r) => `${r.variable} (VIF=${safeFixed(Number(r.vif))})`)
      .join(", ");
    descriptionParts.push(
      `Potential multicollinearity detected. The following variables have VIF values greater than 5: ${vars}. Values above 10 usually indicate serious multicollinearity.`
    );
  } else {
    descriptionParts.push(
      "No significant multicollinearity detected based on VIF values (all < 5)."
    );
  }

  // Analisis Korelasi (jika ada)
  if (Array.isArray(correlationMatrix) && correlationMatrix.length > 0) {
    let highCorrCount = 0;
    for (let i = 0; i < correlationMatrix.length; i++) {
      const rowVals = correlationMatrix[i].values;
      if (!Array.isArray(rowVals)) continue;

      for (let j = i + 1; j < correlationMatrix.length; j++) {
        const val = Math.abs(Number(rowVals[j]));
        if (val > 0.8) highCorrCount++;
      }
    }
    if (highCorrCount > 0) {
      descriptionParts.push(
        `Review of the correlation matrix shows ${highCorrCount} pair(s) of variables with strong correlations (|r| > 0.8), which supports the possibility of multicollinearity.`
      );
    }
  }

  return descriptionParts.join(" ");
};

export const formatCollinearityDiagnostics = (
  context: OrdinalFormatterContext
): AnalysisSection[] => {
  const { result, wantTestOfMulticollinearity } = context;
  const collinearityDiagnostics =
    result.collinearityDiagnostics ||
    result.collinearity_diagnostics ||
    null;

  if (!wantTestOfMulticollinearity || !collinearityDiagnostics) {
    return [];
  }

  const sections: AnalysisSection[] = [];
  const warnings = Array.isArray(collinearityDiagnostics.warnings)
    ? collinearityDiagnostics.warnings
    : [];

  // 1. Correlation Matrix
  const corrMatrixData = Array.isArray(collinearityDiagnostics.correlationMatrix)
    ? collinearityDiagnostics.correlationMatrix
    : (Array.isArray(collinearityDiagnostics.correlation_matrix)
        ? collinearityDiagnostics.correlation_matrix
        : []);

  if (corrMatrixData.length > 0) {
    const predictors = corrMatrixData.map((row: any) => row.variable);
    const corrHeaders = [
      { header: "Variable", key: "row_var" },
      ...predictors.map((name: string, idx: number) => ({
        header: name,
        key: `col_${idx}`,
      })),
    ];

    const corrRows = corrMatrixData.map((rowObj: any) => {
      const outputRow: any = {
        rowHeader: [rowObj.variable],
        row_var: rowObj.variable,
      };

      const values = rowObj.values;
      if (Array.isArray(values)) {
        values.forEach((val: number, colIdx: number) => {
          outputRow[`col_${colIdx}`] = safeFixed(val, 3);
        });
      }

      return outputRow;
    });

    sections.push(
      createSection(
        "ordinal_correlation_matrix",
        "Correlation Matrix",
        {
          columnHeaders: corrHeaders,
          rows: corrRows,
        },
        {
          description:
            "Pearson correlation coefficients between predictor variables. Coefficients close to 1 or -1 indicate strong linear relationships, suggesting potential multicollinearity.",
        }
      )
    );
  }

  // 2. Collinearity Statistics (VIF & Tolerance)
  let vifData = Array.isArray(collinearityDiagnostics.vif)
    ? collinearityDiagnostics.vif
    : [];

  // Fallback kompatibilitas dengan format rows lama jika data vif belum ada
  if (
    vifData.length === 0 &&
    Array.isArray(collinearityDiagnostics.rows) &&
    collinearityDiagnostics.rows.length > 0
  ) {
    vifData = collinearityDiagnostics.rows.map((r: any) => {
      const vifVal = Number(r.vif ?? r.gvif ?? 1.0);
      const tolVal = Number(r.tolerance ?? (vifVal > 0 ? 1.0 / vifVal : 0.0));
      return {
        variable: String(r.variable ?? r.predictor ?? ""),
        tolerance: tolVal,
        vif: vifVal,
      };
    });
  }

  if (vifData.length > 0) {
    const vifTableRows = vifData.map((row: any) => {
      const vifVal = Number(row.vif ?? 1.0);
      const tolVal = Number(row.tolerance ?? 1.0);
      return {
        rowHeader: [String(row.variable ?? "")],
        var: String(row.variable ?? ""),
        tol: safeFixed(tolVal),
        vif: safeFixed(vifVal),
        concern: getConcernLevel(vifVal),
      };
    });

    const dynamicDesc = generateAssumptionDescription(vifData, corrMatrixData);

    const notes =
      warnings.length > 0
        ? warnings.map((warning: string) => `Warning: ${warning}`).join("\n")
        : undefined;

    sections.push(
      createSection(
        "ordinal_collinearity_diagnostics",
        "Collinearity Statistics (VIF)",
        {
          columnHeaders: [
            { header: "Variable", key: "var" },
            { header: "Tolerance", key: "tol" },
            { header: "VIF", key: "vif" },
            { header: "Concern Level", key: "concern" },
          ],
          rows: vifTableRows,
        },
        {
          description: dynamicDesc,
          note: notes,
        }
      )
    );
  }

  console.log("[ORDINAL][MULTICOLLINEARITY][FORMAT_RESULT]", {
    sections: sections.length,
    vifRows: vifData.length,
    corrRows: corrMatrixData.length,
    warnings,
  });

  return sections;
};
