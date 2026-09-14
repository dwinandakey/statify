import type {
  LogisticResult,
  AnalysisSection,
  CorrelationOfEstimatesRow,
} from "../types/binary-logistic";
import { createSection, safeFixed } from "./formatter_utils";

/**
 * Format Correlation Matrix of Estimates (SPSS Style)
 *
 * This table shows the correlations between the parameter estimates.
 * It appears in Block 1 after Variables in the Equation when the
 * "Correlations of estimates" option is selected.
 *
 * For stepwise methods, all steps are combined into ONE table with
 * Step column as row header (SPSS format).
 *
 * Example SPSS output:
 * Correlation Matrix
 *                 Constant    age     trestbps
 * Step 1  Constant   1.000   -.990
 *         age        -.990   1.000
 * Step 2  Constant   1.000   -.636    -.661
 *         age        -.636   1.000    -.149
 *         trestbps   -.661   -.149    1.000
 */

/**
 * Options for formatting Correlation of Estimates tables
 */
interface CorrelationFormatOptions {
  displayAtLastStep?: boolean;
}

// Helper to generate description based on correlation patterns
const generateCorrDescription = (
  corrData: CorrelationOfEstimatesRow[]
): string => {
  if (!corrData || corrData.length <= 1) {
    return "Correlation matrix of parameter estimates.";
  }

  // Find highest absolute correlation (excluding diagonal)
  let maxAbsCorr = 0;
  let maxVar1 = "";
  let maxVar2 = "";

  for (let i = 0; i < corrData.length; i++) {
    for (let j = i + 1; j < corrData[i].values.length; j++) {
      const absCorr = Math.abs(corrData[i].values[j]);
      if (absCorr > maxAbsCorr) {
        maxAbsCorr = absCorr;
        maxVar1 = corrData[i].variable;
        maxVar2 = corrData[j]?.variable || `Var ${j + 1}`;
      }
    }
  }

  if (maxAbsCorr > 0.7) {
    return `Correlation matrix shows high correlation (${safeFixed(maxAbsCorr)}) between ${maxVar1} and ${maxVar2}. High correlations between estimates may indicate multicollinearity.`;
  } else if (maxAbsCorr > 0.5) {
    return `Correlation matrix shows moderate correlations between parameter estimates. Maximum absolute correlation: ${safeFixed(maxAbsCorr)}.`;
  } else {
    return `Low correlations observed between parameter estimates, suggesting independent contribution of predictors.`;
  }
};

/**
 * Format Correlation of Estimates (SPSS Style)
 * - For Enter method: Single table without step column
 * - For Stepwise methods: Combined table with all steps (Step as row header)
 */
export const formatCorrelationOfEstimates = (
  result: LogisticResult,
  dependentName: string,
  options?: CorrelationFormatOptions
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const displayAtLastStep = options?.displayAtLastStep ?? false;

  const method = result.method_used || "Enter";
  const isStepwise =
    method.toLowerCase().includes("forward") ||
    method.toLowerCase().includes("backward");

  // For non-stepwise methods (Enter), show single correlation table
  if (!isStepwise) {
    // Check if correlation_of_estimates exists and has data
    if (
      !result.correlation_of_estimates ||
      result.correlation_of_estimates.length === 0
    ) {
      return { sections };
    }

    const corrData = result.correlation_of_estimates;
    const singleTableSection = buildEnterCorrelationTable(
      corrData,
      "block1_correlation_matrix",
      "Correlation Matrix",
      generateCorrDescription(corrData)
    );
    if (singleTableSection) {
      sections.push(singleTableSection);
    }
  } else {
    // For stepwise methods, build SPSS-style combined table
    const combinedSection = buildStepwiseCombinedCorrelationTable(result, displayAtLastStep);
    if (combinedSection) {
      sections.push(combinedSection);
    }
  }

  return { sections };
};

/**
 * Build correlation table for Enter method (no step column)
 */
const buildEnterCorrelationTable = (
  corrData: CorrelationOfEstimatesRow[],
  sectionId: string,
  title: string,
  description: string
): AnalysisSection | null => {
  if (!corrData || corrData.length === 0) {
    return null;
  }

  const varNames = corrData.map((r) => r.variable);

  // Build column headers: Step column, Variable column, then each variable
  const columnHeaders = [
    {
      header: "",
      children: [
        { header: "", key: "rh1" },
        { header: "", key: "rh2" },
      ],
    },
    ...varNames.map((name) => ({
      header: name,
      key: name,
      align: "right" as const,
    })),
  ];

  // Build rows with Step 1 as row header
  const rows = corrData.map((row) => {
    const rowData: Record<string, string | string[]> = {
      rowHeader: ["Step 1", row.variable],
    };

    // Add correlation values for each column variable
    varNames.forEach((varName, idx) => {
      const corrValue = row.values[idx];
      if (varName === row.variable) {
        rowData[varName] = "1.000";
      } else {
        rowData[varName] = safeFixed(corrValue, 3);
      }
    });

    return rowData;
  });

  return createSection(
    sectionId,
    title,
    {
      columnHeaders,
      rows,
      style: "compact",
    },
    { description }
  );
};

/**
 * Build SPSS-style combined correlation table for stepwise methods
 * All steps in one table with Step as row header
 */
const buildStepwiseCombinedCorrelationTable = (
  result: LogisticResult,
  displayAtLastStep: boolean = false
): AnalysisSection | null => {
  if (!result.steps_detail || result.steps_detail.length === 0) {
    return null;
  }

  const method = result.method_used || "";
  const isBackward = method.toLowerCase().includes("backward");

  // Filter steps that have correlation data
  // For Backward: include all steps (including step 0 if it has data)
  // For Forward: only include steps > 0
  let stepsWithCorr = result.steps_detail.filter((step) => {
    if (!step.correlation_of_estimates || step.correlation_of_estimates.length === 0) {
      return false;
    }
    if (!isBackward && step.step === 0) {
      return false;
    }
    return true;
  });

  if (stepsWithCorr.length === 0) {
    return null;
  }

  // ======================================================================
  // FILTER BERDASARKAN displayAtLastStep
  // Forward: hanya step terakhir
  // Backward: step 1 dan step terakhir
  // ======================================================================
  if (displayAtLastStep && stepsWithCorr.length > 1) {
    const firstStep = stepsWithCorr[0];
    const lastStep = stepsWithCorr[stepsWithCorr.length - 1];

    if (isBackward) {
      // Backward: tampilkan step 1 dan step terakhir
      if (firstStep.step === lastStep.step) {
        stepsWithCorr = [firstStep]; // Jika hanya satu step
      } else {
        stepsWithCorr = [firstStep, lastStep];
      }
    } else {
      // Forward: hanya tampilkan step terakhir
      stepsWithCorr = [lastStep];
    }
  }

  // Collect all unique variable names across all steps (for column headers)
  const allVarNames = new Set<string>();
  stepsWithCorr.forEach((step) => {
    step.correlation_of_estimates?.forEach((row) => {
      allVarNames.add(row.variable);
    });
  });
  const varNamesArray = Array.from(allVarNames);

  // Build column headers: Step, Variable, then all variables
  const columnHeaders = [
    {
      header: "",
      children: [
        { header: "", key: "rh1" },
        { header: "", key: "rh2" },
      ],
    },
    ...varNamesArray.map((name) => ({
      header: name,
      key: name,
      align: "right" as const,
    })),
  ];

  // Build rows - all steps combined
  const rows: Record<string, string | string[]>[] = [];

  for (const stepDetail of stepsWithCorr) {
    const stepLabel = `Step ${stepDetail.step}`;
    const corrData = stepDetail.correlation_of_estimates || [];
    const stepVarNames = corrData.map((r) => r.variable);

    for (const row of corrData) {
      const rowData: Record<string, string | string[]> = {
        rowHeader: [stepLabel, row.variable],
      };

      // Add correlation values for each column variable
      varNamesArray.forEach((varName) => {
        // Find index of this variable in the step's variables
        const idx = stepVarNames.indexOf(varName);
        if (idx === -1) {
          // Variable not in this step, leave empty
          rowData[varName] = "";
        } else if (varName === row.variable) {
          rowData[varName] = "1.000";
        } else {
          const corrValue = row.values[idx];
          rowData[varName] = safeFixed(corrValue, 3);
        }
      });

      rows.push(rowData);
    }
  }

  // Generate description from final step
  const lastStep = stepsWithCorr[stepsWithCorr.length - 1];
  const description = generateCorrDescription(
    lastStep.correlation_of_estimates || []
  );

  return createSection(
    "block1_correlation_matrix",
    "Correlation Matrix",
    {
      columnHeaders,
      rows,
      style: "compact",
    },
    { description }
  );
};