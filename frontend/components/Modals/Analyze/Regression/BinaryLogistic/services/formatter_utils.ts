import type {
  AnalysisSection,
  ModelSummary,
  TableResultContent,
} from "../types/binary-logistic";

/**
 * Helper untuk menggabungkan note dan description
 */
const mergeNoteAndDescription = (
  note?: string,
  description?: string
): string | undefined => {
  const parts: string[] = [];
  
  if (note?.trim()) {
    // Konversi \n menjadi <br> untuk HTML rendering
    const formattedNote = note.trim().replace(/\n/g, "<br>");
    parts.push(formattedNote);
  }
  
  if (description?.trim()) {
    parts.push(description.trim());
  }
  
  // Gabungkan dengan <br><br> agar ada spasi antara note dan interpretasi
  return parts.length > 0 ? parts.join("<br><br>") : undefined;
};

// Helper factory untuk membuat Section standard
export const createSection = (
  id: string,
  title: string,
  data: any, // Menggunakan any sementara karena struktur tabel handsontable kompleks
  options?: {
    description?: string;
    note?: string;
  }
): AnalysisSection => {
  // Gabungkan note ke dalam description (note di awal, interpretation di akhir)
  const mergedDescription = mergeNoteAndDescription(options?.note, options?.description);
  
  return {
    id,
    title,
    type: "table",
    data: data as TableResultContent,
    description: mergedDescription,
    // Note tidak lagi di-export sebagai field terpisah karena sudah digabung ke description
  };
};

// Format angka desimal biasa (default 3 digit)
// Menangani null, undefined, NaN, dan angka sangat kecil
export const safeFixed = (
  val: number | undefined | null,
  digits = 3
): string => {
  if (val === undefined || val === null || isNaN(val)) return ".";
  if (val === 0) return ".000";
  // Jika angka sangat kecil (misal 1e-10), anggap 0
  if (Math.abs(val) < 1e-9) return ".000";
  return val.toFixed(digits);
};

// Format p-value / Significance
// Jika < 0.001, tampilkan "< .001"
export const fmtSig = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return num < 0.001 ? "< .001" : num.toFixed(3);
};

// Format p-value for narrative descriptions as "p (Sig.)
export const fmtPSig = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return "p (Sig.) = .";
  return num < 0.001 ? "p (Sig.) < .001" : `p (Sig.) = ${num.toFixed(3)}`;
};

// Format persentase (1 digit desimal)
export const fmtPct = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return num.toFixed(1);
};

// Helper opsional untuk memformat angka integer dengan pemisah ribuan (jika diperlukan)
export const fmtInt = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return ".";
  return num.toString();
};

// DESCRIPTION GENERATORS

/**
 * Menghasilkan deskripsi untuk Omnibus Tests of Model Coefficients.
 */
export const generateOmnibusDescription = (
  chiSquare: number,
  df: number,
  sig: number
): string => {
  const isSignificant = sig < 0.05;
  const significanceText = isSignificant
    ? "statistically significant"
    : "not statistically significant";
  // Don't unconditionally claim a better fit - that contradicted a
  // "not significant" verdict whenever sig >= .05.
  const fitText = isSignificant
    ? "The model with the predictor(s) included fits significantly better than the null (intercept-only) model."
    : "The model with the predictor(s) included does not fit significantly better than the null (intercept-only) model.";

  return `The omnibus test of model coefficients was ${significanceText}, χ²(${df}) = ${chiSquare.toFixed(
    3
  )}, ${fmtPSig(sig)}. ${fitText}`;
};

/**
 * Menghasilkan deskripsi untuk Model Summary (-2 Log likelihood, Cox & Snell,
 * Nagelkerke).
 */
export const generateModelSummaryDescription = (
  summary: ModelSummary | undefined
): string => {
  if (!summary) return "";
  const { log_likelihood, cox_snell_r_square, nagelkerke_r_square } = summary;
  if (
    !Number.isFinite(log_likelihood) ||
    !Number.isFinite(cox_snell_r_square) ||
    !Number.isFinite(nagelkerke_r_square)
  ) {
    return "";
  }

  const neg2ll = safeFixed(-2 * log_likelihood);
  const lowPct = (Math.min(cox_snell_r_square, nagelkerke_r_square) * 100).toFixed(1);
  const highPct = (Math.max(cox_snell_r_square, nagelkerke_r_square) * 100).toFixed(1);

  return `The model has a -2 Log likelihood of ${neg2ll}. Pseudo R² (Cox & Snell = ${safeFixed(
    cox_snell_r_square
  )}, Nagelkerke = ${safeFixed(
    nagelkerke_r_square
  )}) suggests the predictors account for approximately ${lowPct}%–${highPct}% of the variation in the dependent variable; these are approximations, not exact variance explained.`;
};

/**
 * Menghasilkan deskripsi untuk Classification Table.
 */
export const generateClassificationDescription = (
  overallPct: number | undefined
): string => {
  if (overallPct === undefined) return "";
  return `The model correctly classified ${overallPct.toFixed(
    1
  )}% of cases overall.`;
};

/**
 * Menghasilkan deskripsi untuk Hosmer and Lemeshow Test.
 * Note: P > 0.05 indicates good fit.
 */
export const generateHosmerDescription = (sig: number): string => {
  const fitText =
    sig > 0.05
      ? "indicated a good fit to the data"
      : "indicated a poor fit to the data";
  const interpretation =
    sig > 0.05
      ? "meaning the observed and expected probabilities match well."
      : "suggesting significant differences between observed and predicted values.";

  return `The Hosmer and Lemeshow test ${fitText} (${fmtPSig(sig)}), ${interpretation}`;
};

/**
 * Menghasilkan teks footnote untuk status terminasi estimasi IRLS
 * (dipakai oleh tabel Model Summary & Iteration History).
 *
 * Tidak menyertakan prefix huruf (a./b./dst) - itu ditentukan oleh caller,
 * karena posisi footnote ini berbeda-beda di tiap tabel.
 */
export const generateConvergenceNote = (
  iterations: number | undefined,
  converged: boolean | undefined
): string => {
  const n = iterations ?? "?";
  return converged
    ? `Estimation terminated at iteration number ${n} because parameter estimates changed by less than .001.`
    : `Estimation terminated at iteration number ${n} because maximum iterations has been reached. Final solution cannot be found.`;
};

/**
 * Menghasilkan deskripsi singkat untuk Variables in the Equation.
 * Fokus pada variabel yang signifikan (p < 0.05).
 */
export const generateVarsInEquationDescription = (
  vars: { label: string; sig: number; exp_b: number }[]
): string => {
  const significantVars = vars.filter(
    (v) => v.sig < 0.05 && v.label !== "Constant"
  );

  if (significantVars.length === 0) {
    return "None of the predictor variables were statistically significant in the equation (p > .05).";
  }

  const varNames = significantVars.map((v) => v.label).join(", ");
  return `Of the predictors entered, the following were statistically significant: ${varNames}.`;
};
