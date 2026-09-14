/**
 * Factor Analysis Formatter Utils
 * 
 * Inspired by Binary Logistic Regression formatter_utils.ts
 * Provides helper functions for creating sections with descriptions,
 */

import { Table, ResultJson } from "@/types/Table";

// ============================================================================
// TYPE DEFINITIONS (Compatible with existing Table structure)
// ============================================================================

export type AnalysisSection = Table & {
  id: string;
  type?: "table" | "text" | "chart";
  chartData?: any;
};

export type TableResultContent = {
  columnHeaders: any[];
  rows: any[];
};

// ============================================================================
// SECTION BUILDER HELPER
// ============================================================================


const mergeNoteAndDescription = (
  note?: string,
  description?: string
): string | undefined => {
  const parts: string[] = [];
  
  if (note && note.trim()) {
    // Konversi \n menjadi <br> untuk HTML rendering
    const formattedNote = note.trim().replace(/\n/g, "<br>");
    parts.push(formattedNote);
  }
  
  if (description && description.trim()) {
    parts.push(description.trim());
  }
  
  // Gabungkan dengan <br><br> biar ada spasi antara note dan interpretasi
  return parts.length > 0 ? parts.join("<br><br>") : undefined;
};

/**
 * Helper factory untuk membuat Section standard
 * Kompatibel dengan struktur Table yang existing
 */
export const createSection = (
  id: string,
  title: string,
  data: TableResultContent,
  options?: {
    description?: string;
    note?: string;
  }
): AnalysisSection => {
  // Gabungkan note ke dalam field interpretation (mengikuti pattern Table)
  const mergedInterpretation = mergeNoteAndDescription(
    options?.note,
    options?.description
  );
  
  return {
    id,
    key: id,
    title,
    type: "table",
    columnHeaders: data.columnHeaders || [],
    rows: data.rows || [],
    interpretation: mergedInterpretation,
  };
};

// ============================================================================
// NUMBER FORMATTERS (SPSS Style)
// ============================================================================

/**
 * Format angka desimal dengan presisi default 3 digit
 * Menangani null, undefined, NaN dengan "." 
 * Nilai sangat kecil (< 1e-9) dianggap 0
 */
export const safeFixed = (
  val: number | undefined | null,
  digits = 3
): string => {
  if (val === undefined || val === null || isNaN(val)) return ".";
  if (val === 0 || Math.abs(val) < 1e-9) return ".000";
  return val.toFixed(digits);
};

/**
 * Format p-value / Significance
 * Jika < 0.001, tampilkan "< .001"
 */
export const fmtSig = (num: number | undefined | null, digits = 3): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return num < 0.001 ? "< .001" : num.toFixed(digits);
};

/**
 * Format persentase dengan 1 digit desimal
 */
export const fmtPct = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return num.toFixed(1);
};

/**
 * Format persentase dengan 2 digit desimal (untuk lebih presisi)
 */
export const fmtPctPrecise = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return num.toFixed(2);
};

/**
 * Format angka integer
 * Untuk counts, n, df, dll
 */
export const fmtInt = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return Math.round(num).toString();
};

/**
 * Format eigenvalue dengan presisi tinggi
 * Eigenvalues perlu ditampilkan dengan detail karena penting untuk keputusan berapa faktor
 */
export const fmtEigenvalue = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return ".";
  if (val < 0) return (val).toFixed(4); // Bisa negative untuk component lanjutan
  return val.toFixed(4);
};

/**
 * Used to extract numeric values from already-formatted WASM output
 */
export const parseFormattedValue = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 1; // Default fallback
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 1;

  // Handle special cases
  if (value === "<.001" || value === "< .001") return 0.0001; // Treat as very small
  if (value === "1.000") return 1.0;

  // Remove leading dot and parse
  const cleanValue = value.replace(/^\./g, "0.").trim();
  const parsed = parseFloat(cleanValue);

  return isNaN(parsed) ? 1 : parsed;
};

/**
 * Format factor loading dengan presisi yang sesuai
 * Loadings biasanya -1 hingga 1, perlu precision 3 digit
 */
export const fmtLoading = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return ".";
  // Highlight loadings yang mendekati ±0.3 atau lebih (threshold praktis)
  return val.toFixed(3);
};


export const generateKMODescription = (
  isCovariance: boolean = false
): string => {
  if (isCovariance) {
    return "KMO and Bartlett's Test are calculated based on correlations.";
  }
  return "KMO and Bartlett's Test.";
};


/**
 * Menghasilkan deskripsi untuk Communalities
 * 
 * Communalities menunjukkan proporsi variance dari setiap variabel
 * yang dijelaskan oleh faktor yang diextract.
 * 
 * Nilai rendah (< 0.5) mengindikasikan variabel tidak fit dengan good solution
 */
/**
 * Menghasilkan deskripsi untuk Communalities
 */
export const generateCommunalitiesDescription = (
  extractionMethod: string = "Principal Component Analysis"
): string => {
  return `Extraction Method: ${extractionMethod}.`;
};


/**
 * Menghasilkan deskripsi baku untuk Total Variance Explained
 * Menghilangkan narasi dan menggunakan format footnote vertikal.
 */
export const generateTotalVarianceRefinedDescription = (
  extractionMethod: string,
  isOblique: boolean = false,
  isCovariance: boolean = false 
): string => {
  let footnote = `Extraction Method: ${extractionMethod}.`;
  
  if (isCovariance) {
    footnote += `<br>Initial eigenvalues remain identical for both raw and rescaled solutions in covariance matrix analysis.`;
  }
  
  if (isOblique) {
    footnote += `When components are correlated, sums of squared loadings cannot be added to obtain a total variance.`;
  }
  
  return footnote;
};

/**
 * Menghasilkan deskripsi untuk Total Variance Explained
 * 
 * Menjelaskan berapa component diextract dan berapa % variance yang dijelaskan
 * Rekomendasi umum: 60-80% untuk sustainable solution
 */
export const generateTotalVarianceDescription = (
  numComponents: number,
  cumulativeVariancePct: number,
  extractionMethod?: string
): string => {
  const normalizedVariancePct = cumulativeVariancePct <= 1 ? cumulativeVariancePct * 100 : cumulativeVariancePct;
  const componentText = numComponents === 1 ? "1 component" : `${numComponents} components`;
  
  let qualityAssessment = "";
  if (normalizedVariancePct >= 80) {
    qualityAssessment = "This represents a high-quality factor solution.";
  } else if (normalizedVariancePct >= 60) {
    qualityAssessment = "This represents an acceptable factor solution.";
  } else if (normalizedVariancePct >= 50) {
    qualityAssessment = "While explaining more than 50% of variance is often regarded as reasonable, this solution may benefit from retaining additional components.";
  } else {
    qualityAssessment = "This solution explains only a modest amount of variance; consider retaining additional components.";
  }

  const methodNote = extractionMethod 
    ? ` using ${extractionMethod}`
    : "";

  return `The factor extraction process${methodNote} resulted in ${componentText}, cumulatively explaining ${normalizedVariancePct.toFixed(1)}% of the total variance in the data. ${qualityAssessment}`;
};

/**
 * deskripsi untuk Component Matrix (Unrotated)
 */
/**
 * deskripsi untuk Component Matrix (Unrotated)
 */
export const generateComponentMatrixDescription = (
  numComponents: number,
  isPCA: boolean = true
): string => {
  const entity = isPCA ? "component" : "factor";
  const entityPlural = numComponents === 1 ? entity : `${entity}s`;
  
  return `The ${entity} matrix displays the loadings of each variable on the ${numComponents} extracted ${entityPlural}.`;
};

/**
 *  deskripsi untuk kasus ekstraksi yang terhenti sebelum konvergen
 */
export const generateExtractionTerminationDescription = (
  extractedFactors?: number,
  terminationReason?: string
): string => {
  const factorText = extractedFactors && extractedFactors > 0
    ? ` ${extractedFactors} factor${extractedFactors === 1 ? "" : "s"} were retained before termination,`
    : " no factors were retained,";

  const reasonText = terminationReason && terminationReason.trim()
    ? ` ${terminationReason.trim()}`
    : " extraction terminated before a stable factor solution was obtained.";

  return `The extraction process did not converge.${factorText}${reasonText} Later-stage tables are suppressed.`;
};

/**
 *  deskripsi untuk Goodness-of-fit Test
 */
export const generateGoodnessOfFitDescription = (
  chiSquare: number | string,
  df: number,
  significance: number | string,
  methodName?: string,
  extractedFactors?: number
): string => {
  const chiSquareValue = typeof chiSquare === "string" ? parseFormattedValue(chiSquare) : chiSquare;
  const significanceValue = typeof significance === "string" ? parseFormattedValue(significance) : significance;
  const pValueText = significanceValue < 0.001
    ? "< .001"
    : `= ${significanceValue.toFixed(3)}`;
  const methodText = methodName ? ` for the ${methodName} solution` : "";
  const factorText = extractedFactors && extractedFactors > 0
    ? ` using ${extractedFactors} extracted factor${extractedFactors === 1 ? "" : "s"}`
    : "";

  return `The goodness-of-fit test${methodText}${factorText} indicates whether the reproduced correlations adequately match the observed matrix. Chi-Square = ${chiSquareValue.toFixed(3)}, df = ${df}, Sig. ${pValueText}.`;
};

/**
 * Menghasilkan deskripsi untuk Rotated Component Matrix
 */
export const generateRotatedMatrixDescription = (
  extractionMethod: string,
  rotationMethod: string,
  iterations: number
): string => {
  // Menggunakan tag <br> agar teks turun baris saat dirender di antarmuka
  return `Extraction Method: ${extractionMethod}.<br>Rotation Method: ${rotationMethod} with Kaiser Normalization.<br>Rotation converged in ${iterations} iterations.`;
};


/**
 * Menghasilkan deskripsi untuk Scree Plot Interpretation
 */
export const generateScreePlotDescription = (
  numComponentsRetained: number,
  numComponentsTotal: number,
  explainedVarianceAt?: number
): string => {
  const varianceNote = explainedVarianceAt !== undefined
    ? ` explaining approximately ${explainedVarianceAt.toFixed(1)}% of total variance`
    : "";

  return `The scree plot displays eigenvalues in descending order. An "elbow" or point of inflection suggests the number of factors to retain. Based on visual inspection, ${numComponentsRetained} component(s) were retained from the ${numComponentsTotal} possible${varianceNote}.`;
};

/**
 * Menghasilkan deskripsi untuk Factor Scores Information
 * Penjelasan tentang factor scores dan metode saving
 */
export const generateFactorScoresDescription = (
  method: string = "Regression",
  numComponents?: number
): string => {
  let methodDescription = "";
  
  switch (method.toLowerCase()) {
    case "regression":
      methodDescription = "Factor scores were computed using regression method, which produces scores with mean 0 and variance equal to R².";
      break;
    case "bartlett":
      methodDescription = "Factor scores were computed using Bartlett's method, a maximum likelihood estimation approach that minimizes correlations with other factors.";
      break;
    case "anderson":
      methodDescription = "Factor scores were computed using Anderson-Rubin method, which produces uncorrelated scores with mean 0 and unit variance.";
      break;
    default:
      methodDescription = `Factor scores were computed using the ${method} method.`;
  }

  const componentNote = numComponents 
    ? ` for each of the ${numComponents} component(s)`
    : "";

  return `${methodDescription} These scores allow subsequent analysis or classification based on the factor structure${componentNote}.`;
};

/**
 * Menghasilkan deskripsi umum untuk interpretation section
 */
export const generateFactorAnalysisOverviewDescription = (
  extractionMethod?: string,
  rotationMethod?: string
): string => {
  const methodInfo = extractionMethod 
    ? `using ${extractionMethod} for extraction`
    : "";
  
  const rotationInfo = rotationMethod && rotationMethod.toLowerCase() !== "none"
    ? ` and ${rotationMethod} for rotation`
    : "";

  return `Factor analysis was conducted ${methodInfo}${rotationInfo}. The results include tests of data adequacy, communalities, variance explained, and component loadings. Review the Scree plot and variance explained to assess solution quality.`;
};

/**
 * Menghasilkan deskripsi untuk Anti-Image Correlation Matrix (MSA per variable)
 */
export const generateAntiImageDescription = (): string => {
  return `The anti-image correlation matrix displays the Measure of Sampling Adequacy (MSA) for each variable on the diagonal. Variables with low MSA values (< 0.5) may be problematic and should be considered for removal. Off-diagonal values represent the partial correlations among variables.`;
};

/**
 * Menghasilkan deskripsi untuk Reproduced Correlation Matrix
 */
export const generateReproducedCorrelationDescription = (
  numComponents?: number
): string => {
  const componentInfo = numComponents 
    ? ` using the ${numComponents} extracted component(s)`
    : "";

  return `The reproduced correlation matrix shows the correlations among variables as predicted by the factor model${componentInfo}. Residuals (observed minus reproduced correlations) indicate goodness of fit; small residuals suggest an adequate model.`;
};



/**
 * Menghasilkan deskripsi untuk Descriptive Statistics
 * Memberikan konteks jumlah variabel dan sampel (N).
 */
export const generateDescriptiveDescription = (
  numVariables?: number,
  n?: number
): string => {
  // const varInfo = numVariables ? ` for the ${numVariables} variables` : "";
  // const nInfo = n ? ` based on a valid sample size of N = ${n}` : "";
  return 'Descriptive Statistics.';
};

/**
 * Format notasi 
 * Export: Dapat digunakan untuk formatting determinant dll
 */
export const formatScientificNotationSPSSStyle = (num: number): string => {
  if (num === 0 || !isFinite(num)) return "0";
  
  // Hitung exponent
  const exponent = Math.floor(Math.log10(Math.abs(num)));
  const mantissa = num / Math.pow(10, exponent);
  
  // Format mantissa dengan 2 digit desimal (untuk presisi)
  const mantissaStr = mantissa.toFixed(2).replace(".", ",");
  
  // Format exponent dengan 3-digit (±XXX) - jangan lupakan minus sign untuk negative exponent
  const expSign = exponent >= 0 ? "+" : "-";
  const expStr = String(Math.abs(exponent)).padStart(3, "0");
  
  return `${mantissaStr}E${expSign}${expStr}`;
};

/**
 * Menghasilkan deskripsi untuk Correlation Matrix
 */
export const generateCorrelationMatrixDescription = (
  determinant?: number
): string => {
  let fullDescription = "";
  
  // Tampilkan determinant info jika nilai tersedia
  if (determinant !== undefined) {
    console.log("[DESC] Correlation Matrix Determinant:", determinant);
    // Format scientific notation jika angkanya sangat kecil  
    const detStr = determinant < 0.001 
      ? formatScientificNotationSPSSStyle(determinant)
      : determinant.toFixed(5);
    
    // Hanya menampilkan nilai determinan
    fullDescription = `The determinant of the correlation matrix is ${detStr}.`;
  } else {
    console.log("[DESC] No determinant provided for correlation matrix");
    // Kosongkan deskripsi jika tidak ada determinan
    fullDescription = "";
  }

  return fullDescription;
};

/**
 * Menghasilkan deskripsi untuk Covariance Matrix
 */
export const generateCovarianceMatrixDescription = (
  determinant?: number
): string => {
  let fullDescription = "";
  
  if (determinant !== undefined) {
    console.log("[DESC] Covariance Matrix Determinant:", determinant);
    const detStr = determinant < 0.001 
      ? formatScientificNotationSPSSStyle(determinant)
      : determinant.toFixed(5);
    
    // Hanya menampilkan nilai determinan
    fullDescription = `The determinant of the covariance matrix is ${detStr}.`;
  } else {
    console.log("[DESC] No determinant provided for covariance matrix");
    fullDescription = "";
  }

  return fullDescription;
};

/**
 * Menghasilkan deskripsi untuk Inverse of Correlation Matrix
 * Fokus pada nilai diagonal yang bertindak sebagai pengukur multikolinearitas.
 */
export const generateInverseCorrelationDescription = (): string => {
  return "Inverse Correlation Matrix.";
};

/**
 * Menghasilkan deskripsi yang lebih tajam untuk Anti-image Matrices
 * Fokus pada MSA values untuk individual variable adequacy
 */
export const generateAntiImageRefinedDescription = (): string => {
return "a. Measures of Sampling Adequacy (MSA).";
};

/**
 * Menghasilkan deskripsi untuk Reproduced Correlations
 * Fokus pada residual count dan goodness of fit assessment
 */

export const generateReproducedRefinedDescription = (
  residualCount?: number,
  residualPct?: number,
  extractionMethod: string = "Principal Component Analysis",
  isCovariance: boolean = false
): string => {
  
  if (isCovariance) {
    // Format horizontal, DENGAN abjad a. dan b. agar sinkron dengan superscript di tabel
    return `Extraction Method: ${extractionMethod}.<br>a. Reproduced communalities.<br>b. Residual values reflect the differences between the observed and the reproduced covariances.`;
  }

  // Format vertikal 
  let bFootnote = "b. Residuals are computed between observed and reproduced correlations.";
  
  if (residualCount !== undefined && residualPct !== undefined) {
    const pctFormatted = residualPct.toFixed(1);
    bFootnote += ` There are ${residualCount} (${pctFormatted}%) nonredundant residuals with absolute values greater than 0.05.`;
  }

  return `Extraction Method: ${extractionMethod}.<br>a. Reproduced communalities<br>${bFootnote}`;
};


/**
 * Menghasilkan deskripsi untuk Component Transformation Matrix
 */
export const generateComponentTransformationDescription = (
  extractionMethod: string,
  rotationMethod: string
): string => {
  let footnote = `Extraction Method: ${extractionMethod}.`;
  if (rotationMethod && rotationMethod !== "None") {
    footnote += `<br>Rotation Method: ${rotationMethod} with Kaiser Normalization.`;
  }
  return footnote;
};

/**
 * Menghasilkan deskripsi untuk Component Score Coefficient / Covariance Matrix
 */
export const generateScoreMatrixDescription = (
  extractionMethod: string,
  rotationMethod: string,
  isCovariance: boolean = false
): string => {
  let footnote = `Extraction Method: ${extractionMethod}.`;
  if (rotationMethod && rotationMethod !== "None") {
    footnote += `<br>Rotation Method: ${rotationMethod} with Kaiser Normalization.`;
  }
  if (isCovariance) {
    footnote += `<br>Coefficients are standardized.`;
  }
  return footnote;
};

// ============================================================================
// UTILITY HELPER FUNCTIONS
// ============================================================================

/**
 * Helper untuk membuat abbreviation dari extraction method
 */
export const getExtractionMethodAbbr = (method: string): string => {
  const abbrs: Record<string, string> = {
    "Principal Component Analysis": "PCA",
    "PrincipalComp": "PCA",
    "Principal Axis Factoring": "PAF",
    "PrincipalAxisFactoring": "PAF",
    "Maximum Likelihood": "ML",
    "MaxLikelihood": "ML",
    "Generalized Least Squares": "GLS",
    "GeneralizedLeastSqr": "GLS",
    "Unweighted Least Squares": "ULS",
    "UnweightLeastSqr": "ULS",
    "Alpha Factoring": "Alpha",
    "AlphaFactoring": "Alpha",
    "Image Factoring": "Image",
    "ImageFactoring": "Image",
  };
  
  return abbrs[method] || method;
};

/**
 * Helper untuk membuat interpretasi KMO value (verbose label)
 */
export const interpretKMOValue = (kmo: number): string => {
  if (kmo >= 0.9) return "Marvelous";
  if (kmo >= 0.8) return "Meritorious";
  if (kmo >= 0.7) return "Middling";
  if (kmo >= 0.6) return "Mediocre";
  if (kmo >= 0.5) return "Miserable";
  return "Unacceptable";
};

/**
 * Helper untuk interpretasi communality rendah vs tinggi
 */
export const interpretCommunality = (comm: number): string => {
  if (comm >= 0.9) return "Excellent fit";
  if (comm >= 0.7) return "Good fit";
  if (comm >= 0.5) return "Acceptable fit";
  if (comm >= 0.3) return "Questionable fit";
  return "Poor fit";
};

/**
 * Helper untuk interpretasi loading strength
 */
export const interpretLoadingStrength = (loading: number): string => {
  const absLoading = Math.abs(loading);
  if (absLoading >= 0.9) return "Very strong";
  if (absLoading >= 0.7) return "Strong";
  if (absLoading >= 0.5) return "Moderate";
  if (absLoading >= 0.3) return "Weak";
  return "Very weak";
};
