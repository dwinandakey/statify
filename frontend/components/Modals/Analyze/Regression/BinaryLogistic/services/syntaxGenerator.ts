/**
 * SPSS-Like Syntax Generator for Binary Logistic Regression
 *
 * This module generates a complete SPSS-compatible syntax log that includes
 * all options selected by the user, matching the format:
 *
 * LOGISTIC REGRESSION VARIABLES fbs
 *   /METHOD=ENTER age sex trestbps chol thalch oldpeak
 *   /CONTRAST (sex)=Indicator
 *   /SAVE=PRED COOK RESID
 *   /CLASSPLOT
 *   /CASEWISE OUTLIER(2)
 *   /PRINT=GOODFIT CORR ITER(1) SUMMARY CI(95)
 *   /CRITERIA=PIN(0.05) POUT(0.10) ITERATE(20) CUT(0.5).
 */

import type {
  BinaryLogisticOptions,
  BinaryLogisticCategoricalParams,
  BinaryLogisticSaveParams,
  BinaryLogisticOptionsParams,
} from "../types/binary-logistic";
import type { Variable } from "@/types/Variable";

interface SyntaxGeneratorOptions {
  dependent: Variable;
  covariates: Variable[];
  factors?: Variable[];
  method: BinaryLogisticOptions["method"];
  categoricalParams: BinaryLogisticCategoricalParams;
  saveParams: BinaryLogisticSaveParams;
  optionParams: BinaryLogisticOptionsParams;
}

/**
 * Generate complete SPSS-like syntax for Binary Logistic Regression
 *
 * @param options - All configuration options from the UI
 * @returns Complete syntax string matching SPSS format
 */
export const generateLogisticRegressionSyntax = (
  options: SyntaxGeneratorOptions
): string => {
  const lines: string[] = [];

  // 1. MAIN COMMAND - LOGISTIC REGRESSION VARIABLES
  const dependentName = options.dependent.name;
  lines.push(`LOGISTIC REGRESSION VARIABLES ${dependentName}`);

  // 2. /METHOD - Method and covariates/factors
  const allIndependentVars = [
    ...options.covariates.map((v) => v.name),
    ...(options.factors?.map((v) => v.name) || []),
  ];

  const methodName = mapMethodToSpssFormat(options.method);
  if (allIndependentVars.length > 0) {
    lines.push(`  /METHOD=${methodName} ${allIndependentVars.join(" ")}`);
  }

  // 3. /CONTRAST - For categorical variables
  const contrastStatements = generateContrastStatements(
    options.categoricalParams,
    options.covariates,
    options.factors
  );
  if (contrastStatements.length > 0) {
    contrastStatements.forEach((statement) => {
      lines.push(`  ${statement}`);
    });
  }

  // 4. /SAVE - Saved predictions and residuals
  const saveStatement = generateSaveStatement(options.saveParams);
  if (saveStatement) {
    lines.push(`  ${saveStatement}`);
  }

  // 5. /CLASSPLOT - Classification plot
  if (options.optionParams.classificationPlots) {
    lines.push("  /CLASSPLOT");
  }

  // 6. /CASEWISE - Casewise listing
  if (options.optionParams.casewiseListing) {
    if (options.optionParams.casewiseType === "outliers") {
      lines.push(
        `  /CASEWISE OUTLIER(${options.optionParams.casewiseOutliers})`
      );
    } else {
      lines.push("  /CASEWISE ALL");
    }
  }

  // 7. /PRINT - Print options
  const printStatement = generatePrintStatement(options.optionParams);
  if (printStatement) {
    lines.push(`  ${printStatement}`);
  }

  // 8. /CRITERIA - Analysis criteria
  const criteriaStatement = generateCriteriaStatement(options.optionParams);
  lines.push(`  ${criteriaStatement}`);

  // Add period at the end of last line
  const lastIndex = lines.length - 1;
  lines[lastIndex] = `${lines[lastIndex]  }.`;

  return lines.join("\n");
};

/**
 * Map Statify method names to SPSS format
 */
const mapMethodToSpssFormat = (method: BinaryLogisticOptions["method"]): string => {
  const methodMap: Record<BinaryLogisticOptions["method"], string> = {
    Enter: "ENTER",
    "Forward: Conditional": "FSTEP(COND)",
    "Forward: LR": "FSTEP(LR)",
    "Forward: Wald": "FSTEP(WALD)",
    "Backward: Conditional": "BSTEP(COND)",
    "Backward: LR": "BSTEP(LR)",
    "Backward: Wald": "BSTEP(WALD)",
  };
  return methodMap[method] || "ENTER";
};

/**
 * Generate /CONTRAST statements for categorical variables
 *
 * Format: /CONTRAST (varname)=Indicator(1)
 * where 1 = First reference, omit = Last reference
 * 
 * Now supports per-variable contrast & reference settings (SPSS style).
 */
const generateContrastStatements = (
  catParams: BinaryLogisticCategoricalParams,
  covariates: Variable[],
  factors?: Variable[]
): string[] => {
  const statements: string[] = [];

  if (catParams.covariates.length === 0) {
    return statements;
  }

  // Map contrast names to SPSS format
  const contrastMap: Record<string, string> = {
    Indicator: "Indicator",
    Simple: "Simple",
    Difference: "Difference",
    Helmert: "Helmert",
    Repeated: "Repeated",
    Polynomial: "Polynomial",
    Deviation: "Deviation",
  };

  // Contrasts that do not support a reference parameter
  const noRefContrasts = ["Difference", "Helmert", "Repeated", "Polynomial"];

  // Generate contrast statement for each categorical variable using its own settings
  catParams.covariates.forEach((varName) => {
    const setting = catParams.variableSettings[varName];
    const contrast = setting?.contrast ?? "Indicator";
    const reference = setting?.referenceCategory ?? "Last";

    const contrastName = contrastMap[contrast] || "Indicator";

    if (noRefContrasts.includes(contrast)) {
      statements.push(`/CONTRAST (${varName})=${contrastName}`);
    } else {
      const refParam = reference === "First" ? "(1)" : "";
      statements.push(`/CONTRAST (${varName})=${contrastName}${refParam}`);
    }
  });

  return statements;
};

/**
 * Generate /SAVE statement based on selected options
 *
 * Format: /SAVE=PRED COOK RESID LEVER DFBETA SRESID ZRESID DEV LRESID
 *
 * SPSS Save Options:
 * - PRED = Predicted probabilities
 * - PGROUP = Predicted group membership
 * - COOK = Cook's distance
 * - LEVER = Leverage values
 * - RESID = Unstandardized residuals
 * - ZRESID = Standardized (Pearson) residuals
 * - SRESID = Studentized residuals
 * - DEV = Deviance residuals
 * - LRESID = Logit residuals
 * - DFBETA = DfBeta values
 */
const generateSaveStatement = (
  saveParams: BinaryLogisticSaveParams
): string | null => {
  const saveOptions: string[] = [];

  // Predicted values
  if (saveParams.predictedProbabilities) saveOptions.push("PRED");
  if (saveParams.predictedGroup) saveOptions.push("PGROUP");

  // Influence statistics
  if (saveParams.influenceCooks) saveOptions.push("COOK");
  if (saveParams.influenceLeverage) saveOptions.push("LEVER");
  if (saveParams.influenceDfBeta) saveOptions.push("DFBETA");

  // Residuals
  if (saveParams.residualsUnstandardized) saveOptions.push("RESID");
  if (saveParams.residualsStandardized) saveOptions.push("ZRESID");
  if (saveParams.residualsStudentized) saveOptions.push("SRESID");
  if (saveParams.residualsDeviance) saveOptions.push("DEV");
  if (saveParams.residualsLogit) saveOptions.push("LRESID");

  if (saveOptions.length === 0) {
    return null;
  }

  return `/SAVE=${saveOptions.join(" ")}`;
};

/**
 * Generate /PRINT statement based on selected options
 *
 * Format: /PRINT=GOODFIT CORR ITER(1) SUMMARY CI(95)
 *
 * SPSS Print Options:
 * - GOODFIT = Hosmer-Lemeshow goodness-of-fit test
 * - CORR = Correlation matrix of parameter estimates
 * - ITER(n) = Iteration history every n iterations
 * - SUMMARY = Model summary (classification table at each step)
 * - CI(level) = Confidence interval for odds ratios
 */
const generatePrintStatement = (
  optParams: BinaryLogisticOptionsParams
): string | null => {
  const printOptions: string[] = [];

  // Hosmer-Lemeshow test
  if (optParams.hosmerLemeshow) {
    printOptions.push("GOODFIT");
  }

  // Correlation of estimates
  if (optParams.correlations) {
    printOptions.push("CORR");
  }

  // Iteration history
  if (optParams.iterationHistory) {
    printOptions.push("ITER(1)");
  }

  // Summary at each step
  if (optParams.displayAtEachStep) {
    printOptions.push("SUMMARY");
  }

  // CI for Exp(B)
  if (optParams.ciForExpB) {
    printOptions.push(`CI(${optParams.ciLevel})`);
  }

  if (printOptions.length === 0) {
    return null;
  }

  return `/PRINT=${printOptions.join(" ")}`;
};

/**
 * Generate /CRITERIA statement
 *
 * Format: /CRITERIA=PIN(0.05) POUT(0.10) ITERATE(20) CUT(0.5)
 *
 * This always appears as it contains essential analysis criteria
 */
const generateCriteriaStatement = (
  optParams: BinaryLogisticOptionsParams
): string => {
  const criteriaOptions: string[] = [];

  // Entry probability (PIN)
  criteriaOptions.push(`PIN(${optParams.probEntry})`);

  // Removal probability (POUT)
  criteriaOptions.push(`POUT(${optParams.probRemoval})`);

  // Maximum iterations
  criteriaOptions.push(`ITERATE(${optParams.maxIterations})`);

  // Classification cutoff
  criteriaOptions.push(`CUT(${optParams.classificationCutoff})`);

  return `/CRITERIA=${criteriaOptions.join(" ")}`;
};

/**
 * Generate a one-line summary for quick display (fallback)
 */
export const generateShortSyntax = (
  dependent: Variable,
  covariates: Variable[],
  method: BinaryLogisticOptions["method"]
): string => {
  const varNames = covariates.map((c) => c.name).join(" ");
  const methodName = mapMethodToSpssFormat(method);
  return `LOGISTIC REGRESSION VARIABLES ${dependent.name} /METHOD=${methodName} ${varNames}.`;
};

export default generateLogisticRegressionSyntax;
