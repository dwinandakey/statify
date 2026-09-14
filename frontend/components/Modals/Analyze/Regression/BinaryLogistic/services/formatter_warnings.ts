/**
 * Format Fitting Warnings for Output Viewer (SPSS-Style Warnings Block)
 *
 * SPSS always displays warnings/notes when the model encounters issues like:
 * - Singular/ill-conditioned Hessian matrix (multicollinearity)
 * - Complete or quasi-complete separation
 * - Step-halving used during estimation
 * - Non-convergence
 *
 * These are displayed as a "Warnings" block in the output viewer, typically
 * appearing at the top of the output (before the main tables).
 */

import type {
  LogisticResult,
  AnalysisSection,
  FittingWarnings,
} from "../types/binary-logistic";
import { createSection } from "./formatter_utils";

/**
 * Check if result has fitting warnings that should be displayed
 */
export const hasFittingWarnings = (result: LogisticResult): boolean => {
  const fw = result.fitting_warnings;
  if (!fw) return false;

  return !!(
    fw.possible_separation ||
    fw.quasi_separation ||
    fw.near_singular_hessian ||
    fw.ridge_increased ||
    fw.step_halving_used ||
    (fw.messages && fw.messages.length > 0)
  );
};

/**
 * Generate human-readable description from warning flags
 */
const generateWarningDescription = (fw: FittingWarnings): string => {
  const parts: string[] = [];

  if (fw.near_singular_hessian) {
    parts.push(
      "The Hessian matrix was found to be singular or severely ill-conditioned during estimation. " +
      "This often indicates perfect or near-perfect multicollinearity among the predictors. " +
      "Parameter estimates and standard errors may be unreliable. " +
      "Consider removing redundant variables or checking for linear dependencies."
    );
  }

  if (fw.possible_separation) {
    parts.push(
      "A possible complete separation was detected: one or more predictor combinations " +
      "perfectly predict the outcome. Parameter estimates may be inflated and standard errors unreliable."
    );
  }

  if (fw.quasi_separation && !fw.possible_separation) {
    parts.push(
      "A quasi-complete separation was detected: a large proportion of predicted probabilities " +
      "are extremely close to 0 or 1. Results should be interpreted with caution."
    );
  }

  if (fw.ridge_increased) {
    parts.push(
      "Ridge regularization was applied to stabilize the estimation. " +
      "This is a numerical correction and may slightly affect parameter estimates."
    );
  }

  if (fw.step_halving_used) {
    parts.push(
      `Step-halving was used during estimation (${fw.step_halving_count || 0} times) ` +
      "to ensure convergence. This may indicate difficulty in finding the maximum likelihood estimates."
    );
  }

  return parts.join(" ");
};

/**
 * Format Fitting Warnings as an AnalysisSection for the output viewer
 *
 * Creates a "Warnings" table similar to SPSS, listing each warning
 * message with a numbered row.
 */
export const formatFittingWarnings = (
  result: LogisticResult
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const fw = result.fitting_warnings;

  if (!fw) return { sections };

  // Collect all warning messages
  const warningMessages: string[] = [];

  if (fw.near_singular_hessian) {
    warningMessages.push(
      "The Hessian matrix is singular or severely ill-conditioned. " +
      "This often indicates multicollinearity among predictors. " +
      "Validity of the model fit is uncertain."
    );
  }

  if (fw.possible_separation) {
    warningMessages.push(
      "There are predicted values that are either very close to zero or very close to one. " +
      "Complete or quasi-complete separation may exist. Maximum likelihood estimates may not exist."
    );
  } else if (fw.quasi_separation) {
    warningMessages.push(
      "A high proportion of predicted probabilities are extreme (near 0 or 1). " +
      "Quasi-complete separation may exist."
    );
  }

  if (fw.step_halving_used) {
    warningMessages.push(
      `Step-halving was used ${fw.step_halving_count || 0} time(s) during the iterative estimation process.`
    );
  }

  if (fw.ridge_increased) {
    warningMessages.push(
      "A ridge parameter was increased to stabilize the estimation due to numerical difficulties."
    );
  }

  // Add any custom messages from Rust that aren't already covered
  if (fw.messages && fw.messages.length > 0) {
    for (const msg of fw.messages) {
      // Avoid duplicate messages
      const isDuplicate = warningMessages.some(
        (existing) => msg.includes(existing.substring(0, 40)) || existing.includes(msg.substring(0, 40))
      );
      if (!isDuplicate) {
        warningMessages.push(msg);
      }
    }
  }

  if (warningMessages.length === 0) return { sections };

  // Build table structure (SPSS-style Warnings table)
  const columnHeaders = [
    { header: "", key: "icon", align: "center" as const },
    { header: "Status", key: "message", align: "left" as const },
  ];

  const rows = warningMessages.map((msg, index) => ({
    icon: "⚠️",
    message: msg,
    _rowIndex: index + 1,
  }));

  const description = generateWarningDescription(fw);

  sections.push(
    createSection(
      "fitting_warnings",
      "Warnings",
      { columnHeaders, rows },
      {
        description,
        note: warningMessages.length > 1
          ? `a. ${warningMessages.length} warnings were generated during model estimation.`
          : undefined,
      }
    )
  );

  return { sections };
};
