/**
 * Format Iteration History Tables (SPSS Style)
 *
 * This module generates iteration history tables showing the convergence
 * progress of the IRLS algorithm at each step.
 *
 * SPSS displays iteration history in the following format:
 * - Block 0: Initial Model (Constant only)
 * - Block 1: With covariates (may have multiple steps for stepwise methods)
 *
 * Each table shows:
 * - Iteration number
 * - -2 Log Likelihood
 * - Coefficients for each variable in the model
 *
 * For stepwise methods, all steps within Block 1 are combined into ONE table
 * with Step column as row header (SPSS format).
 */

import type {
  LogisticResult,
  AnalysisSection,
  IterationHistoryBlock,
} from "../types/binary-logistic";
import { createSection, safeFixed } from "./formatter_utils";

/**
 * Options for formatting Iteration History tables
 */
interface IterationHistoryFormatOptions {
  displayAtLastStep?: boolean;
}

// Helper to generate description for iteration history
const generateIterationDescription = (
  block: number,
  converged: boolean,
  iterations: number
): string => {
  const blockName = block === 0 ? "constant only" : "covariates";
  if (converged) {
    return `Estimation terminated at iteration number ${iterations} because parameter estimates changed by less than .001.`;
  } else {
    return `Maximum iterations (${iterations}) reached. Model may not have fully converged.`;
  }
};

/**
 * Format Iteration History for Block 0 (Constant Only)
 * 
 * SPSS Format:
 * | Iteration       | -2 Log likelihood | Coefficients |
 * |                 |                   | Constant     |
 * | Step 0 | 1      | 832.343           | -1.343       |
 * |        | 2      | 821.549           | -1.604       |
 * 
 * rowHeader is used for the "Step X" and iteration number columns.
 * Step X spans all iterations within that step using rowSpan.
 * 
 * NOTE: SPSS starts iteration numbering from 1, not 0.
 * We filter out iteration 0 (initial state) and renumber.
 */
const formatBlock0IterationHistory = (
  iterHistory: IterationHistoryBlock
): AnalysisSection | null => {
  if (!iterHistory?.rows || iterHistory.rows.length === 0) {
    return null;
  }

  const varNames = iterHistory.variable_names && iterHistory.variable_names.length > 0
    ? iterHistory.variable_names
    : [];
  const hasConstant = varNames.includes("Constant");

  // Build column headers
  // "Iteration" dengan colSpan 2 untuk mencakup kolom Step dan nomor iterasi
  // rowSpan akan otomatis 2 karena Coefficients punya children (maxLevel = 2)
  // Placeholder column (rh2) diperlukan untuk data binding meski header kosong
  const columnHeaders: any[] = [
    { header: "Iteration", key: "rh1", colSpan: 2 },
    { header: "", key: "rh2", isPlaceholder: true },
    { header: "-2 Log likelihood", key: "neg2ll" },
  ];

  // Add coefficients header with children for each variable
  if (varNames.length > 0) {
    const coeffChildren = varNames.map((name, idx) => ({
      header: name,
      key: `coef_${idx}`,
    }));
    columnHeaders.push({
      header: "Coefficients",
      children: coeffChildren,
    });
  }

  // Filter out iteration 0 (initial state) - SPSS shows iterations starting from 1
  // Also handles case where iteration already starts from 1
  const filteredRows = iterHistory.rows.filter((row) => row.iteration >= 1);
  
  // If no valid iterations, try using all rows but renumbering
  const rowsToUse = filteredRows.length > 0 ? filteredRows : iterHistory.rows;

  // Build rows using rowHeader for Step and Iteration columns
  // Format: rowHeader: ["Step 0", "1"], ["Step 0", "2"], dst.
  // DataTableRenderer akan otomatis merge "Step 0" dengan rowSpan
  const rows = rowsToUse.map((row, idx) => {
    // Use 1-based iteration number for display (SPSS style)
    const iterNum = row.iteration >= 1 ? row.iteration : idx + 1;
    
    const rowData: Record<string, any> = {
      rowHeader: ["Step 0", iterNum.toString()],
      neg2ll: safeFixed(row.neg2_log_likelihood, 3),
    };

    // Add coefficient values
    row.coefficients.forEach((coef, coefIdx) => {
      rowData[`coef_${coefIdx}`] = safeFixed(coef, 3);
    });

    return rowData;
  });

  if (rows.length === 0) {
    return null;
  }

  // Add footnote about initial value
  const description = generateIterationDescription(
    0,
    iterHistory.converged,
    iterHistory.final_iteration
  );

  return createSection(
    "block0_iteration_history",
    "Iteration History",
    {
      columnHeaders,
      rows,
    },
    {
      description,
      note: hasConstant
        ? `a. Constant is included in the model.\nb. Initial -2 Log Likelihood: ${safeFixed(iterHistory.initial_neg2ll, 3)}`
        : `a. Constant is not included in the model.\nb. Initial -2 Log Likelihood: ${safeFixed(iterHistory.initial_neg2ll, 3)}`,
    }
  );
};

/**
 * Format Iteration History for Block 1 - Enter Method (Single Step)
 * 
 * SPSS Format:
 * | Iteration       | -2 Log likelihood | Coefficients                              |
 * |                 |                   | Constant | age | sex(1) | trestbps | ... |
 * | Step 1 | 1      | 782.296           | -4.667   | .037| -.263  | .007     | ... |
 * |        | 2      | 750.887           | -7.481   | .065| -.497  | .013     | ... |
 * 
 * NOTE: SPSS starts iteration numbering from 1, not 0.
 */
const formatBlock1EnterIterationHistory = (
  iterHistory: IterationHistoryBlock,
  dependentName: string
): AnalysisSection | null => {
  if (!iterHistory?.rows || iterHistory.rows.length === 0) {
    return null;
  }

  const varNames = iterHistory.variable_names && iterHistory.variable_names.length > 0
    ? iterHistory.variable_names
    : [];
  const hasConstant = varNames.includes("Constant");

  // Build column headers - "Iteration" dengan colSpan 2
  // Placeholder column (rh2) diperlukan untuk data binding meski header kosong
  const columnHeaders: any[] = [
    { header: "Iteration", key: "rh1", colSpan: 2 },
    { header: "", key: "rh2", isPlaceholder: true },
    { header: "-2 Log likelihood", key: "neg2ll" },
  ];

  // Add coefficients header with children for each variable
  if (varNames.length > 0) {
    const coeffChildren = varNames.map((name, idx) => ({
      header: name,
      key: `coef_${idx}`,
    }));
    columnHeaders.push({
      header: "Coefficients",
      children: coeffChildren,
    });
  }

  // Filter out iteration 0 (initial state) - SPSS shows iterations starting from 1
  const filteredRows = iterHistory.rows.filter((row) => row.iteration >= 1);
  const rowsToUse = filteredRows.length > 0 ? filteredRows : iterHistory.rows;

  // Build rows using rowHeader for Step and Iteration columns
  // rowHeader: ["Step 1", "1"] - Step 1 will be merged across all iterations
  const rows = rowsToUse.map((row, idx) => {
    const iterNum = row.iteration >= 1 ? row.iteration : idx + 1;
    
    const rowData: Record<string, any> = {
      rowHeader: ["Step 1", iterNum.toString()],
      neg2ll: safeFixed(row.neg2_log_likelihood, 3),
    };

    // Add coefficient values
    row.coefficients.forEach((coef, coefIdx) => {
      rowData[`coef_${coefIdx}`] = safeFixed(coef, 3);
    });

    return rowData;
  });

  if (rows.length === 0) {
    return null;
  }

  const description = generateIterationDescription(
    1,
    iterHistory.converged,
    iterHistory.final_iteration
  );

  return createSection(
    "block1_iteration_history",
    "Iteration History",
    {
      columnHeaders,
      rows,
    },
    {
      description,
      note: hasConstant
        ? `a. Method: Enter\nb. Constant is included in the model.\nc. Initial -2 Log Likelihood: ${safeFixed(iterHistory.initial_neg2ll, 3)}`
        : `a. Method: Enter\nb. Constant is not included in the model.\nc. Initial -2 Log Likelihood: ${safeFixed(iterHistory.initial_neg2ll, 3)}`,
    }
  );
};

/**
 * Format Iteration History for Block 1 - Stepwise Methods (Multiple Steps)
 * All steps are combined into ONE table with Step column as rowHeader parent
 */
const formatBlock1StepwiseIterationHistory = (
  result: LogisticResult,
  method: string,
  displayAtLastStep: boolean = false
): AnalysisSection | null => {
  const stepsDetail = result.steps_detail || [];

  // Collect all steps with iteration history (Block 1, step > 0)
  let stepsWithHistory: { step: number; history: IterationHistoryBlock }[] =
    [];

  for (const stepDetail of stepsDetail) {
    if (stepDetail.step > 0 && stepDetail.iteration_history) {
      stepsWithHistory.push({
        step: stepDetail.step,
        history: stepDetail.iteration_history,
      });
    }
  }

  if (stepsWithHistory.length === 0) {
    return null;
  }

  // ======================================================================
  // FILTER BERDASARKAN displayAtLastStep
  // Forward: hanya step terakhir
  // Backward: step 1 dan step terakhir
  // ======================================================================
  const isBackward = method.toLowerCase().includes("backward");

  if (displayAtLastStep && stepsWithHistory.length > 1) {
    const firstStep = stepsWithHistory[0];
    const lastStep = stepsWithHistory[stepsWithHistory.length - 1];

    if (isBackward) {
      // Backward: tampilkan step 1 dan step terakhir
      if (firstStep.step === lastStep.step) {
        stepsWithHistory = [firstStep]; // Jika hanya satu step
      } else {
        stepsWithHistory = [firstStep, lastStep];
      }
    } else {
      // Forward: hanya tampilkan step terakhir
      stepsWithHistory = [lastStep];
    }
  }

  // Get all unique variable names across all steps
  // For stepwise, variables may differ per step
  const allVarNames = new Set<string>();
  stepsWithHistory.forEach(({ history }) => {
    history.variable_names.forEach((name) => allVarNames.add(name));
  });
  const hasConstant = Array.from(allVarNames).includes("Constant");
  const sortedVarNames = Array.from(allVarNames);

  // Build column headers - "Iteration" dengan colSpan 2
  // Placeholder column (rh2) diperlukan untuk data binding meski header kosong
  const columnHeaders: any[] = [
    { header: "Iteration", key: "rh1", colSpan: 2 },
    { header: "", key: "rh2", isPlaceholder: true },
    { header: "-2 Log likelihood", key: "neg2ll" },
  ];

  // Add coefficients header with children for each variable
  if (sortedVarNames.length > 0) {
    const coeffChildren = sortedVarNames.map((name, idx) => ({
      header: name,
      key: `coef_${idx}`,
    }));
    columnHeaders.push({
      header: "Coefficients",
      children: coeffChildren,
    });
  }

  // Build rows - for each step, add all iterations (skip iteration 0)
  // rowHeader: ["Step X", "iter_num"] - Step X spans all its iterations
  const rows: Record<string, any>[] = [];

  stepsWithHistory.forEach(({ step, history }) => {
    const stepVarNames = history.variable_names || [];

    // Filter out iteration 0 (initial state) - SPSS shows iterations starting from 1
    const filteredRows = history.rows.filter((row) => row.iteration >= 1);
    const rowsToUse = filteredRows.length > 0 ? filteredRows : history.rows;

    rowsToUse.forEach((row, idx) => {
      const iterNum = row.iteration >= 1 ? row.iteration : idx + 1;
      
      const rowData: Record<string, any> = {
        rowHeader: [`Step ${step}`, iterNum.toString()],
        neg2ll: safeFixed(row.neg2_log_likelihood, 3),
      };

      // Map coefficients to the correct column
      sortedVarNames.forEach((varName, varIdx) => {
        const varIndex = stepVarNames.indexOf(varName);
        if (varIndex >= 0 && row.coefficients[varIndex] !== undefined) {
          rowData[`coef_${varIdx}`] = safeFixed(row.coefficients[varIndex], 3);
        } else {
          rowData[`coef_${varIdx}`] = "."; // Variable not in this step
        }
      });

      rows.push(rowData);
    });
  });

  if (rows.length === 0) {
    return null;
  }

  // Get final step info for description
  const lastStep = stepsWithHistory[stepsWithHistory.length - 1];
  const description = generateIterationDescription(
    1,
    lastStep.history.converged,
    lastStep.history.final_iteration
  );

  return createSection(
    "block1_iteration_history",
    `Iteration History`,
    {
      columnHeaders,
      rows,
    },
    {
      description,
      note: hasConstant
        ? `a. Method: ${method}\nb. Constant is included in the model.\nc. Initial -2 Log Likelihood: ${safeFixed(stepsWithHistory[0].history.initial_neg2ll, 3)}`
        : `a. Method: ${method}\nb. Constant is not included in the model.\nc. Initial -2 Log Likelihood: ${safeFixed(stepsWithHistory[0].history.initial_neg2ll, 3)}`,
    }
  );
};

/**
 * Main formatter for Iteration History
 * Generates tables for Block 0 and Block 1
 */
export const formatIterationHistory = (
  result: LogisticResult,
  dependentName: string,
  options?: IterationHistoryFormatOptions
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const displayAtLastStep = options?.displayAtLastStep ?? false;

  const stepsDetail = result.steps_detail || [];
  if (stepsDetail.length === 0) {
    return { sections };
  }

  const method = result.method_used || "Enter";
  const isStepwise =
    method.toLowerCase().includes("forward") ||
    method.toLowerCase().includes("backward");

  // ======================================================================
  // BLOCK 0: Beginning Block (Null Model)
  // ======================================================================
  const step0 = stepsDetail.find((s) => s.step === 0);
  if (step0?.iteration_history) {
    const block0Section = formatBlock0IterationHistory(step0.iteration_history);
    if (block0Section) {
      sections.push(block0Section);
    }
  }

  // ======================================================================
  // BLOCK 1: With Covariates
  // ======================================================================
  if (!isStepwise) {
    // Enter method - single step
    const step1 = stepsDetail.find((s) => s.step === 1);
    if (step1?.iteration_history) {
      const block1Section = formatBlock1EnterIterationHistory(
        step1.iteration_history,
        dependentName
      );
      if (block1Section) {
        sections.push(block1Section);
      }
    }
  } else {
    // Stepwise methods - multiple steps combined
    const block1Section = formatBlock1StepwiseIterationHistory(result, method, displayAtLastStep);
    if (block1Section) {
      sections.push(block1Section);
    }
  }

  return { sections };
};

/**
 * Check if iteration history is available in the result
 */
export const hasIterationHistory = (result: LogisticResult): boolean => {
  const stepsDetail = result.steps_detail || [];
  return stepsDetail.some((s) => s.iteration_history !== null && s.iteration_history !== undefined);
};
