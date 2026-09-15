import type { LogisticResult, AnalysisSection } from "../types/binary-logistic";
import { createSection, safeFixed, fmtSig } from "./formatter_utils";

// Helper untuk menentukan Concern Level berdasarkan nilai VIF.
// When the table is on the GVIF^(1/(2*Df)) scale (any term has df > 1),
// thresholds are sqrt-adjusted (e.g. VIF>10 <=> GVIF^(1/(2*Df)) > sqrt(10)),
// the standard adaptation since that value is already a square-root-scaled
// quantity - comparing it against the raw VIF thresholds would understate
// collinearity for every variable in the table, not just the multi-df ones.
const getConcernLevel = (vif: number, isGvif?: boolean): string => {
  const scale = isGvif ? Math.sqrt : (n: number) => n;
  if (vif < scale(2)) return "Low";
  if (vif < scale(5)) return "Moderate";
  if (vif < scale(10)) return "High";
  return "Very High";
};

// Helper untuk membuat deskripsi dinamis VIF
const generateAssumptionDescription = (vifData: any[]): string => {
  // Analisis VIF (GVIF^(1/(2*Df)) scale uses sqrt-adjusted thresholds - see getConcernLevel)
  const isGvif = vifData.some((r) => r.is_gvif);
  const metricLabel = isGvif ? "GVIF^(1/(2*Df))" : "VIF";
  const threshold = isGvif ? Math.sqrt(5) : 5;
  const highVif = vifData.filter((r) => r.vif >= threshold);
  if (highVif.length > 0) {
    const vars = highVif
      .map((r) => `${r.variable} (${metricLabel}=${safeFixed(r.vif)})`)
      .join(", ");
    return `Potential multicollinearity detected. The following variables have ${metricLabel} values greater than ${safeFixed(threshold, 2)}: ${vars}. Values above ${safeFixed(isGvif ? Math.sqrt(10) : 10, 2)} usually indicate serious multicollinearity.`;
  }
  return `No significant multicollinearity detected based on ${metricLabel} values (all < ${safeFixed(threshold, 2)}).`;
};

// Helper untuk membuat deskripsi dinamis Box-Tidwell
// References: Box & Tidwell (1962), Fox (1997), Fox & Weisberg (2011)
const generateBoxTidwellDescription = (boxTidwellData: any[]): string => {
  if (!boxTidwellData || boxTidwellData.length === 0) return "";

  const testedVars = boxTidwellData.filter((row: any) => !row.skipped);
  const skippedVars = boxTidwellData.filter((row: any) => row.skipped);

  const parts: string[] = [];

  if (testedVars.length > 0) {
    const violatedVars = testedVars.filter((row: any) => row.is_significant);
    if (violatedVars.length > 0) {
      const details = violatedVars
        .map((v: any) => {
          const lambdaStr =
            v.mle_lambda != null && isFinite(v.mle_lambda)
              ? `λ̂=${safeFixed(v.mle_lambda, 3)}`
              : "";
          return `${v.variable} (${lambdaStr}, p=${fmtSig(v.sig)})`;
        })
        .join(", ");
      parts.push(
        `Linearity assumption violated for: ${details}. ` +
          `The MLE of λ indicates the estimated power transformation; λ=1 implies linearity. ` +
          `Consider applying a power transformation or treating these variables as categorical.`
      );
    } else {
      parts.push(
        "Linearity assumption met for all tested continuous predictors (all p > 0.05). " +
          "The MLE of λ is close to 1 for all variables, consistent with a linear relationship in the logit."
      );
    }
  }

  if (skippedVars.length > 0) {
    const skippedNames = skippedVars.map((v: any) => v.variable).join(", ");
    parts.push(
      `Note: ${skippedVars.length} variable(s) were excluded (${skippedNames}). ` +
        `The Box-Tidwell test only applies to continuous predictors with sufficient variation.`
    );
  }

  if (parts.length === 0) {
    parts.push(
      "No continuous predictors were eligible for the Box-Tidwell test."
    );
  }

  return parts.join(" ");
};

export const formatAssumptionTests = (
  result: LogisticResult,
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const assumptions = result.assumption_tests;

  if (!assumptions) return { sections };

  // --- 1. Variance Inflation Factors (VIF) ---
  // (No separate raw predictor Correlation Matrix here - redundant with
  // the Correlation of Estimates table already shown in Block 1, and VIF/
  // GVIF already covers multicollinearity more directly.)
  if (assumptions.vif && assumptions.vif.length > 0) {
    // When any predictor has df > 1 (a 3+ category factor), values are
    // GVIF^(1/(2*Df)) for every row - R's car::vif() convention when the
    // model mixes single- and multi-df terms - so the column is relabeled
    // and a Df column is shown to make that scale explicit.
    const isGvif = assumptions.vif.some((row) => row.is_gvif);
    const vifHeader = isGvif ? "GVIF^(1/(2*Df))" : "VIF";

    const vifColumnHeaders: any[] = [
      { header: "Variable", key: "var" },
      { header: "Tolerance", key: "tol" },
      { header: vifHeader, key: "vif" },
    ];
    if (isGvif) {
      vifColumnHeaders.push({ header: "df", key: "df" });
    }
    vifColumnHeaders.push({ header: "Concern Level", key: "concern" });

    const vifData = {
      columnHeaders: vifColumnHeaders,
      rows: assumptions.vif.map((row) => ({
        rowHeader: [row.variable],
        var: row.variable,
        tol: safeFixed(row.tolerance),
        vif: safeFixed(row.vif),
        df: (row.df ?? 1).toString(),
        concern: getConcernLevel(row.vif, row.is_gvif),
      })),
    };

    // Buat Deskripsi Dinamis VIF
    const dynamicDesc = generateAssumptionDescription(assumptions.vif);

    sections.push(
      createSection(
        "assumption_vif",
        "Collinearity Statistics (VIF)",
        vifData,
        {
          description: isGvif
            ? `${dynamicDesc} Note: one or more predictors are categorical with 3+ categories, so values are reported as Generalized VIF adjusted for degrees of freedom (GVIF^(1/(2*Df))) rather than plain VIF - matching R's car::vif() convention - and are comparable across variables on that scale.`
            : dynamicDesc,
        },
      ),
    );

    // --- 2. Legend VIF ---
    // Ranges are sqrt-adjusted to match the GVIF^(1/(2*Df)) scale when applicable.
    const fmtRange = (n: number) => safeFixed(isGvif ? Math.sqrt(n) : n, isGvif ? 2 : 0);
    const legendData = {
      columnHeaders: [
        { header: "Level", key: "level" },
        { header: "Range", key: "range" },
        { header: "Interpretation", key: "interp" },
      ],
      rows: [
        {
          rowHeader: ["Low"],
          level: "Low",
          range: `< ${fmtRange(2)}`,
          interp: "No significant multicollinearity.",
        },
        {
          rowHeader: ["Moderate"],
          level: "Moderate",
          range: `${fmtRange(2)} - ${fmtRange(5)}`,
          interp: "Moderate multicollinearity; typically acceptable.",
        },
        {
          rowHeader: ["High"],
          level: "High",
          range: `${fmtRange(5)} - ${fmtRange(10)}`,
          interp: "High multicollinearity; verify coefficient stability.",
        },
        {
          rowHeader: ["Very High"],
          level: "Very High",
          range: `> ${fmtRange(10)}`,
          interp: "Severe multicollinearity; remedial action recommended.",
        },
      ],
    };

    sections.push(
      createSection(
        "assumption_vif_legend",
        "VIF Interpretation Guide",
        legendData,
        {
          description:
            "General guidelines for interpreting Variance Inflation Factors.",
        },
      ),
    );
  }

  // --- 3. Box-Tidwell Test (R-style output: Fox & Weisberg 2011) ---
  if (assumptions.box_tidwell && assumptions.box_tidwell.length > 0) {
    // Separate tested vs skipped for cleaner output
    const testedRows = assumptions.box_tidwell.filter(
      (row: any) => !row.skipped
    );
    const skippedRows = assumptions.box_tidwell.filter(
      (row: any) => row.skipped
    );

    // --- Main results table (matches R's car::boxTidwell output) ---
    if (testedRows.length > 0) {
      const btData = {
        columnHeaders: [
          { header: "Variable", key: "var" },
          { header: "Interaction Term", key: "interaction" },
          { header: "MLE of λ", key: "lambda" },
          { header: "Score Statistic (z)", key: "score_z" },
          { header: "df", key: "df" },
          { header: "Sig.", key: "sig" },
        ],
        rows: testedRows.map((row: any) => {
          const sig = row.sig ?? 1.0;

          const lambdaVal =
            row.mle_lambda != null && isFinite(row.mle_lambda)
              ? safeFixed(row.mle_lambda, 5)
              : "—";

          return {
            rowHeader: [row.variable],
            var: row.variable,
            interaction: row.interaction_term || `${row.variable} × ln(${row.variable})`,
            lambda: lambdaVal,
            score_z: safeFixed(row.score_z ?? 0, 4),
            df: String(row.df ?? 1),
            sig: fmtSig(sig),
          };
        }),
      };

      const btDescription = generateBoxTidwellDescription(
        assumptions.box_tidwell
      );

      sections.push(
        createSection(
          "assumption_box_tidwell",
          "Box-Tidwell Test for Linearity of the Logit",
          btData,
          {
            description: btDescription,
          }
        )
      );
    }

    // --- Skipped variables table ---
    if (skippedRows.length > 0) {
      const skippedData = {
        columnHeaders: [
          { header: "Variable", key: "var" },
          { header: "Reason", key: "reason" },
          { header: "Note", key: "note" },
        ],
        rows: skippedRows.map((row: any) => ({
          rowHeader: [row.variable],
          var: row.variable,
          reason: row.skip_reason || "Not Applicable",
          note: row.note || "",
        })),
      };

      sections.push(
        createSection(
          "assumption_box_tidwell_excluded",
          "Variables Excluded from Box-Tidwell Test",
          skippedData,
          {
            description:
              "The following variables were excluded because the Box-Tidwell test only applies to continuous predictors with sufficient variation.",
          }
        )
      );
    }
  }

  return { sections };
};
