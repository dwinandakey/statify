import type {
  LogisticResult,
  BinaryLogisticOutput,
  AnalysisSection,
} from "../types/binary-logistic";
import { formatSummaryTables } from "./formatter_summary";
import { formatBlock0 } from "./formatter_block0";
import { formatBlock1 } from "./formatter_block1";
import { formatAssumptionTests } from "./formatter_assumptions";
import { formatHosmerLemeshow } from "./formatter_hosmer";
import { formatCasewiseListing } from "./formatter_casewise";
import { formatCorrelationOfEstimates } from "./formatter_correlation_estimates";
import { formatIterationHistory, hasIterationHistory } from "./formatter_iteration_history";
import { formatStepSummary, hasStepSummary } from "./formatter_step_summary";
import { formatClassificationPlot, hasClassificationPlot } from "./formatter_classification_plot";
import { formatFittingWarnings, hasFittingWarnings } from "./formatter_warnings";
import type { Variable } from "@/types/Variable";

/**
 * Options for formatting the result
 */
interface FormatOptions {
  displayAtLastStep?: boolean;
  ciForExpB?: boolean;      // Whether to show CI columns for Exp(B)
  ciLevel?: number;         // Confidence level percentage (e.g., 95)
  cutoff?: number;          // Classification cutoff value (e.g., 0.5)
  casewiseOutliers?: number; // Threshold for casewise outlier detection (default 2.0)
}

export const formatBinaryLogisticResult = (
  result: LogisticResult,
  dependentVariable: Variable,
  independentVariables: Variable[] = [],
  options?: FormatOptions
): BinaryLogisticOutput => {
  const allSections: AnalysisSection[] = [];
  const displayAtLastStep = options?.displayAtLastStep ?? false;
  const ciForExpB = options?.ciForExpB ?? false;
  const ciLevel = options?.ciLevel ?? 95;
  const cutoff = options?.cutoff ?? 0.5;
  const casewiseOutliers = options?.casewiseOutliers ?? 2.0;

  // 0. Fitting Warnings (SPSS displays warnings at the very top of output)
  // Jika ada warning kritis (singular Hessian, separation, dll),
  // hanya tampilkan tabel Warnings saja — hasil selanjutnya tidak relevan.
  if (hasFittingWarnings(result)) {
    const warningsOutput = formatFittingWarnings(result);
    if (warningsOutput.sections && warningsOutput.sections.length > 0) {
      allSections.push(...warningsOutput.sections);
      return { sections: allSections };
    }
  }

  // 1. Case Processing & Encoding
  const summaryOutput = formatSummaryTables(
    result,
    dependentVariable,
    independentVariables
  );
  if (summaryOutput.sections) {
    allSections.push(...summaryOutput.sections);
  }

  // 2. Iteration History (SPSS shows this before Block 0)
  // Check if iteration history is available and format it
  if (hasIterationHistory(result)) {
    const iterHistoryOutput = formatIterationHistory(result, dependentVariable.name, { displayAtLastStep });
    if (iterHistoryOutput.sections && iterHistoryOutput.sections.length > 0) {
      // Find Block 0 iteration history and add it before Block 0 stats
      const block0IterHistory = iterHistoryOutput.sections.find(
        (s) => s.id === "block0_iteration_history"
      );
      if (block0IterHistory) {
        allSections.push(block0IterHistory);
      }
    }
  }

  // 3. Block 0: Beginning Block
  const block0Output = formatBlock0(result, dependentVariable.name, { cutoff });
  if (block0Output.sections) {
    allSections.push(...block0Output.sections);
  }

  // 4. Block 1 Iteration History (before Block 1 stats)
  if (hasIterationHistory(result)) {
    const iterHistoryOutput = formatIterationHistory(result, dependentVariable.name, { displayAtLastStep });
    if (iterHistoryOutput.sections && iterHistoryOutput.sections.length > 0) {
      const block1IterHistory = iterHistoryOutput.sections.find(
        (s) => s.id === "block1_iteration_history"
      );
      if (block1IterHistory) {
        allSections.push(block1IterHistory);
      }
    }
  }

  // 5. Block 1: Method = Enter/Stepwise
  // Format standard Block 1 (Omnibus, Summary, Classification, Vars)
  const block1Output = formatBlock1(result, dependentVariable.name, { 
    displayAtLastStep, 
    ciForExpB, 
    ciLevel,
    cutoff 
  });

  if (block1Output.sections) {
    // Cari index Model Summary
    const summaryIndex = block1Output.sections.findIndex(
      (s) => s.id === "block1_summary"
    );

    // Generate Hosmer Tables
    const hosmerOutput = formatHosmerLemeshow(result, dependentVariable.name, { displayAtLastStep });

    // Generate Correlation of Estimates Tables
    const corrEstOutput = formatCorrelationOfEstimates(
      result,
      dependentVariable.name,
      { displayAtLastStep }
    );

    if (summaryIndex !== -1 && hosmerOutput.sections.length > 0) {
      // Masukkan Block 1 bagian awal (sampai summary)
      allSections.push(...block1Output.sections.slice(0, summaryIndex + 1));

      // Masukkan Hosmer Lemeshow (Tepat di tengah Block 1)
      allSections.push(...hosmerOutput.sections);

      // Cari index Variables in Equation dari sisa sections
      const remainingSections = block1Output.sections.slice(summaryIndex + 1);
      const varsInIndex = remainingSections.findIndex(
        (s) => s.id === "block1_vars_in"
      );

      if (varsInIndex !== -1) {
        // Masukkan sections sampai vars_in (termasuk vars_in)
        allSections.push(...remainingSections.slice(0, varsInIndex + 1));

        // Masukkan Correlation Matrix tepat setelah Variables in Equation
        if (corrEstOutput.sections && corrEstOutput.sections.length > 0) {
          allSections.push(...corrEstOutput.sections);
        }

        // Masukkan sisa sections setelah vars_in
        allSections.push(...remainingSections.slice(varsInIndex + 1));
      } else {
        // Jika tidak ketemu vars_in, masukkan normal
        allSections.push(...remainingSections);
        if (corrEstOutput.sections && corrEstOutput.sections.length > 0) {
          allSections.push(...corrEstOutput.sections);
        }
      }
    } else {
      // Jika tidak ketemu summary atau tidak ada Hosmer
      // Cari index Variables in Equation
      const varsInIndex = block1Output.sections.findIndex(
        (s) => s.id === "block1_vars_in"
      );

      if (varsInIndex !== -1) {
        // Masukkan sections sampai vars_in (termasuk vars_in)
        allSections.push(...block1Output.sections.slice(0, varsInIndex + 1));

        // Masukkan Correlation Matrix tepat setelah Variables in Equation
        if (corrEstOutput.sections && corrEstOutput.sections.length > 0) {
          allSections.push(...corrEstOutput.sections);
        }

        // Masukkan sisa sections setelah vars_in
        allSections.push(...block1Output.sections.slice(varsInIndex + 1));
      } else {
        // Fallback - masukkan semua normal
        allSections.push(...block1Output.sections);
        if (corrEstOutput.sections && corrEstOutput.sections.length > 0) {
          allSections.push(...corrEstOutput.sections);
        }
      }

      // Jika Hosmer ada tapi summary tidak ketemu, taruh setelah correlation
      if (hosmerOutput.sections.length > 0) {
        // Perlu reorder - tidak ideal, tapi fallback
      }
    }

    // 5b. Step Summary (SPSS Style)
    // Display only if "Display at last step" is selected, effectively summarizing the steps hidden from view.
    if (displayAtLastStep && hasStepSummary(result)) {
      const stepSummaryOutput = formatStepSummary(result, dependentVariable.name);
      if (stepSummaryOutput.sections && stepSummaryOutput.sections.length > 0) {
        allSections.push(...stepSummaryOutput.sections);
      }
    }

    // 5c. Classification Plot (last item in Block 1, after Step Summary)
    if (hasClassificationPlot(result)) {
      const classificationPlotOutput = formatClassificationPlot(result, dependentVariable.name, { displayAtLastStep });
      if (classificationPlotOutput.sections && classificationPlotOutput.sections.length > 0) {
        allSections.push(...classificationPlotOutput.sections);
      }
    }
  }

  // 6. Casewise Listing of Residuals (terpisah dari Block 1)
  const casewiseOutput = formatCasewiseListing(result, dependentVariable.name, casewiseOutliers);
  if (casewiseOutput.sections && casewiseOutput.sections.length > 0) {
    allSections.push(...casewiseOutput.sections);
  }

  // 7. Assumption Tests (VIF/Box-Tidwell) - Biasanya tabel terpisah di paling bawah
  const assumptionOutput = formatAssumptionTests(result);
  if (assumptionOutput.sections) {
    allSections.push(...assumptionOutput.sections);
  }

  return { sections: allSections };
};
