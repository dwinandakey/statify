import type {
  LogisticResult,
  AnalysisSection,
  CasewiseRow,
} from "../types/binary-logistic";
import { createSection, safeFixed } from "./formatter_utils";

/**
 * Format Casewise Listing of Residuals (SPSS Style)
 * 
 * Generates a table showing individual case diagnostics including:
 * - Case Number
 * - Selected Status
 * - Observed (with ** for misclassified)
 * - Predicted Probability
 * - Predicted Group
 * - Temporary Variables: Resid, ZResid, SResid
 * 
 * SPSS Note:
 * - a: S = Selected, U = Unselected cases, and ** = Misclassified cases.
 * - b: Cases with studentized residuals greater than [threshold] are listed.
 */
export const formatCasewiseListing = (
  result: LogisticResult,
  dependentName: string,
  outlierThreshold: number = 2.0 // Default threshold for outlier detection
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];

  // Check if casewise_list exists and has data
  if (!result.casewise_list || result.casewise_list.length === 0) {
    return { sections };
  }

  const casewiseData = result.casewise_list;

  // Get Y encoding labels
  const modelInfo = (result as any).model_info || {};
  const yMap = modelInfo.y_encoding || {};
  
  // Build lookup for labels - get first character for short label
  const labelLookup: Record<number, string> = Object.entries(yMap).reduce(
    (acc, [key, val]) => {
      acc[val as number] = key;
      return acc;
    },
    {} as Record<number, string>
  );

  // Get short labels (first character) for display
  const getShortLabel = (value: number): string => {
    const fullLabel = labelLookup[value];
    if (fullLabel) {
      return fullLabel.charAt(0).toUpperCase();
    }
    return value.toString();
  };

  // Update casewise rows with actual Y labels from encoding
  const enhancedCasewise = casewiseData.map((row) => {
    const isMisclassified = row.predicted_group.startsWith("**");
    const obsShortLabel = getShortLabel(row.observed);
    const predShortLabel = getShortLabel(row.predicted);
    
    return {
      ...row,
      observed_short: isMisclassified ? `${obsShortLabel}**` : obsShortLabel,
      predicted_short: predShortLabel,
    };
  });

  // Sort by case number (ascending) for neater display
  enhancedCasewise.sort((a, b) => a.case_number - b.case_number);

  // Generate dynamic description based on content
  const misclassifiedCount = enhancedCasewise.filter(
    (r) => r.predicted_group.startsWith("**")
  ).length;
  const totalOutliers = enhancedCasewise.length;
  
  // Calculate statistics for description
  const sresidValues = enhancedCasewise
    .map((r) => r.resid_studentized)
    .filter((v): v is number => v !== undefined && v !== null);
  
  const maxSResid = sresidValues.length > 0 ? Math.max(...sresidValues.map(Math.abs)) : 0;
  const avgSResid = sresidValues.length > 0 
    ? sresidValues.reduce((a, b) => a + Math.abs(b), 0) / sresidValues.length 
    : 0;

  let description = "";
  if (totalOutliers === 0) {
    description = `No cases with studentized residuals greater than ${safeFixed(outlierThreshold, 1)} were found. This suggests the model fits the data well without significant outliers.`;
  } else {
    // Build informative description
    const parts: string[] = [];
    
    parts.push(`${totalOutliers} case(s) identified with studentized residuals exceeding ±${safeFixed(outlierThreshold, 1)}.`);
    
    if (misclassifiedCount > 0) {
      const pctMisclass = ((misclassifiedCount / totalOutliers) * 100).toFixed(1);
      parts.push(`${misclassifiedCount} case(s) (${pctMisclass}%) are misclassified (marked with **).`);
    } else {
      parts.push("All listed cases are correctly classified despite having extreme residuals.");
    }
    
    if (maxSResid > 3) {
      parts.push(`Maximum |SResid| = ${safeFixed(maxSResid, 3)}, indicating potentially influential outliers that warrant further investigation.`);
    } else {
      parts.push(`Maximum |SResid| = ${safeFixed(maxSResid, 3)}.`);
    }
    
    description = parts.join(" ");
  }

  // Build column headers - SPSS style with nested headers
  const columnHeaders = [
    { header: "Case", key: "case_number" },
    { header: "Selected Status", key: "selected", align: "center" as const },
    { header: `Observed ${dependentName}`, key: "observed_short" },
    { header: "Predicted", key: "pred_prob" },
    { header: "Predicted Group", key: "predicted_short" },
    { 
      header: "Temporary Variable", 
      children: [
        { header: "Resid", key: "resid" },
        { header: "ZResid", key: "zresid" },
        { header: "SResid", key: "sresid" },
      ]
    },
  ];

  // Build rows
  const rows = enhancedCasewise.map((row) => ({
    rowHeader: [],
    case_number: row.case_number.toString(),
    selected: row.selected,
    observed_short: row.observed_short,
    pred_prob: safeFixed(row.predicted_probability, 3),
    predicted_short: row.predicted_short,
    resid: row.resid_raw !== undefined ? safeFixed(row.resid_raw, 3) : "-",
    zresid: safeFixed(row.resid_zresid, 3),
    sresid: row.resid_studentized !== undefined ? safeFixed(row.resid_studentized, 3) : "-",
  }));

  // SPSS-style footnotes
  const footnotes = [
    "a. S = Selected, U = Unselected cases, and ** = Misclassified cases.",
    `b. Cases with studentized residuals greater than ${safeFixed(outlierThreshold, 3)} are listed.`
  ];

  const casewiseSection = createSection(
    "casewise_listing",
    "Casewise List",
    {
      columnHeaders,
      rows,
    },
    {
      description,
      note: footnotes.join("\n"),
    }
  );

  sections.push(casewiseSection);

  return { sections };
};

/**
 * Generate summary statistics for casewise diagnostics
 */
export const generateCasewiseSummary = (
  casewiseData: CasewiseRow[]
): { 
  totalCases: number;
  misclassified: number;
  maxZResid: number;
  minZResid: number;
} => {
  if (!casewiseData || casewiseData.length === 0) {
    return {
      totalCases: 0,
      misclassified: 0,
      maxZResid: 0,
      minZResid: 0,
    };
  }

  const zresids = casewiseData.map((r) => r.resid_zresid);
  const misclassified = casewiseData.filter(
    (r) => r.predicted_group.startsWith("**")
  ).length;

  return {
    totalCases: casewiseData.length,
    misclassified,
    maxZResid: Math.max(...zresids),
    minZResid: Math.min(...zresids),
  };
};
