import type {
  LogisticResult,
  AnalysisSection,
  VariableRow,
  StepDetail,
} from "../types/binary-logistic";
import {
  createSection,
  safeFixed,
  fmtSig,
  fmtPct,
  generateOmnibusDescription,
  generateModelSummaryDescription,
  generateClassificationDescription,
  generateVarsInEquationDescription,
} from "./formatter_utils";

/**
 * Options for formatting Block 1
 */
interface Block1FormatOptions {
  displayAtLastStep?: boolean;
  ciForExpB?: boolean;      // Whether to show CI columns for Exp(B)
  ciLevel?: number;         // Confidence level percentage (e.g., 95)
  cutoff?: number;          // Classification cutoff value
}

export const formatBlock1 = (
  result: LogisticResult,
  dependentName: string,
  options?: Block1FormatOptions
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const modelInfo = (result as any).model_info || {};
  const displayAtLastStep = options?.displayAtLastStep ?? false;
  const ciForExpB = options?.ciForExpB ?? false;
  const ciLevel = options?.ciLevel ?? 95;
  const cutoff = options?.cutoff ?? 0.5;

  // ======================================================================
  // 1. HELPERS & SETUP
  // ======================================================================
  const yMap = modelInfo.y_encoding || {};
  const labelLookup: Record<number, string> = Object.entries(yMap).reduce(
    (acc, [key, val]) => {
      acc[val as number] = key;
      return acc;
    },
    {} as Record<number, string>
  );

  const getLabel = (val: number): string => {
    return labelLookup[val] !== undefined ? labelLookup[val] : val.toString();
  };

  const label0 = getLabel(0);
  const label1 = getLabel(1);

  const method = result.method_used || "Enter";
  const isStepwise =
    method.toLowerCase().includes("forward") ||
    method.toLowerCase().includes("backward") ||
    method.toLowerCase().includes("stepwise");

  // Cek apakah include_constant dari model_info
  const includeConstant = modelInfo.include_constant !== false;

  // Helper untuk mendapatkan nama variabel asli dari label generic
  const variableNames = modelInfo.variables || [];
  const getRealVariableName = (label: string): string => {
    if (label.startsWith("Var_") || label.startsWith("Var ")) {
      const parts = label.split(/[ _]/);
      const indexStr = parts[1];
      const index = parseInt(indexStr, 10); // 0-based index from rust logic often matches
      // Note: Rust logic might return Var_0, Var_1. Frontend features are 0-indexed.
      if (!isNaN(index) && variableNames[index]) {
        return variableNames[index];
      }
    }
    return label;
  };

  // ======================================================================
  // LOGIKA A: METODE ENTER (Tampilan Standar / Single Step)
  // ======================================================================
  if (!isStepwise) {
    // 1. Omnibus Tests
    const omni = result.omni_tests;
    const omniDesc = generateOmnibusDescription(
      omni?.chi_square || 0,
      omni?.df || 1,
      omni?.sig || 1
    );

    const omnibusData = {
      columnHeaders: [
        {
          header: "",
          children: [
            { header: "", key: "rh1" },
            { header: "", key: "rh2" },
          ],
        },
        { header: "Chi-square", key: "chi" },
        { header: "df", key: "df" },
        { header: "Sig.", key: "sig" },
      ],
      rows: [
        {
          rowHeader: ["Step 1", "Step"],
          chi: safeFixed(omni?.chi_square),
          df: omni?.df?.toString() ?? "1",
          sig: fmtSig(omni?.sig),
        },
        {
          rowHeader: ["Step 1", "Block"],
          chi: safeFixed(omni?.chi_square),
          df: omni?.df?.toString() ?? "1",
          sig: fmtSig(omni?.sig),
        },
        {
          rowHeader: ["Step 1", "Model"],
          chi: safeFixed(omni?.chi_square),
          df: omni?.df?.toString() ?? "1",
          sig: fmtSig(omni?.sig),
        },
      ],
    };

    sections.push(
      createSection(
        "block1_omnibus",
        "Omnibus Tests of Model Coefficients",
        omnibusData,
        { description: omniDesc }
      )
    );

    // 2. Model Summary
    const summary = result.model_summary;
    const summaryDesc = generateModelSummaryDescription(
      summary?.nagelkerke_r_square
    );

    const modelSummaryData = {
      columnHeaders: [
        { header: "Step", key: "step" },
        { header: "-2 Log likelihood", key: "ll" },
        { header: "Cox & Snell R Square", key: "cox" },
        { header: "Nagelkerke R Square", key: "nagel" },
      ],
      rows: [
        {
          rowHeader: [],
          step: "1",
          ll: safeFixed(-2 * (summary?.log_likelihood || 0)), // Ensure -2LL
          cox: safeFixed(summary?.cox_snell_r_square),
          nagel: safeFixed(summary?.nagelkerke_r_square),
        },
      ],
    };

    sections.push(
      createSection("block1_summary", "Model Summary", modelSummaryData, {
        description: summaryDesc,
        note:
          `a. Estimation terminated at iteration number ${ 
          summary?.iterations || "?" 
          } because parameter estimates changed by less than .001.`,
      })
    );

    // 3. Classification Table
    const ct = result.classification_table;
    const classDesc = generateClassificationDescription(ct?.overall_percentage);

    const classificationData = {
      columnHeaders: [
        {
          header: "Observed",
          children: [
            { header: "", key: "rh1" },
            { header: "", key: "rh2" },
            { header: "", key: "rh3" },
          ],
        },
        {
          header: "Predicted",
          children: [
            {
              header: dependentName,
              children: [
                { header: label0, key: "pred_0" },
                { header: label1, key: "pred_1" },
              ],
            },
            { header: "Percentage Correct", key: "pct" },
          ],
        },
      ],
      rows: [
        {
          rowHeader: ["Step 1", dependentName, label0],
          pred_0: ct?.observed_0_predicted_0?.toString() || "0",
          pred_1: ct?.observed_0_predicted_1?.toString() || "0",
          pct: fmtPct(ct?.percentage_correct_0),
        },
        {
          rowHeader: ["Step 1", dependentName, label1],
          pred_0: ct?.observed_1_predicted_0?.toString() || "0",
          pred_1: ct?.observed_1_predicted_1?.toString() || "0",
          pct: fmtPct(ct?.percentage_correct_1),
        },
        {
          rowHeader: ["Step 1", "Overall Percentage", ""],
          pred_0: "",
          pred_1: "",
          pct: fmtPct(ct?.overall_percentage),
        },
      ],
    };

    sections.push(
      createSection(
        "block1_classification",
        "Classification Table",
        classificationData,
        {
          description: classDesc,
          note: includeConstant 
            ? `a. Constant is included in the model.\nb. The cut value is ${cutoff.toFixed(3)}`
            : `a. Constant is not included in the model.\nb. The cut value is ${cutoff.toFixed(3)}`,
        }
      )
    );

    // 4. Variables in the Equation
    const varsIn = result.variables_in_equation || [];

    // Prepare data for dynamic description
    const simpleVars = varsIn.map((v) => ({
      label: getRealVariableName(v.label),
      sig: v.sig,
      exp_b: v.exp_b,
    }));
    const varsDesc = generateVarsInEquationDescription(simpleVars);

    // Build column headers conditionally based on ciForExpB
    const varsInColumnHeaders: any[] = [
      {
        header: "",
        children: [
          { header: "", key: "rh1" },
          { header: "", key: "rh2" },
        ],
      },
      { header: "B", key: "b" },
      { header: "S.E.", key: "se" },
      { header: "Wald", key: "wald" },
      { header: "df", key: "df" },
      { header: "Sig.", key: "sig" },
      { header: "Exp(B)", key: "expb" },
    ];

    // Only add CI columns if ciForExpB is true
    if (ciForExpB) {
      varsInColumnHeaders.push({
        header: `${ciLevel}% C.I.for EXP(B)`,
        children: [
          { header: "Lower", key: "lo" },
          { header: "Upper", key: "up" },
        ],
      });
    }

    // Build rows - include CI values only if needed
    const varsInRows = varsIn.map((row: VariableRow) => {
      // Detect group omnibus row (categorical parent):
      // These have df > 1, and b/error/exp_b are all 0 (placeholder values)
      const isGroupRow = row.df > 1 && row.b === 0 && row.error === 0 && row.exp_b === 0;

      const baseRow: any = {
        rowHeader: ["Step 1", getRealVariableName(row.label)],
        b: isGroupRow ? "" : safeFixed(row.b),
        se: isGroupRow ? "" : safeFixed(row.error),
        wald: safeFixed(row.wald),
        df: row.df ? row.df.toString() : "1",
        sig: fmtSig(row.sig),
        expb: isGroupRow ? "" : safeFixed(row.exp_b),
      };

      if (ciForExpB) {
        baseRow.lo = isGroupRow ? "" : safeFixed(row.lower_ci);
        baseRow.up = isGroupRow ? "" : safeFixed(row.upper_ci);
      }

      return baseRow;
    });

    const varsInData = {
      columnHeaders: varsInColumnHeaders,
      rows: varsInRows,
    };

    sections.push(
      createSection("block1_vars_in", "Variables in the Equation", varsInData, {
        description: varsDesc,
      })
    );
  } else {
    // ======================================================================
    // LOGIKA B: METODE STEPWISE (Backward / Forward)
    // ======================================================================

    const steps = result.steps_detail || [];

    // NOTE: Untuk Backward, Step 0 (Start) itu penting karena itu Full Model.
    // Untuk Forward, Step 0 biasanya sama dengan Block 0 (Null), jadi sering di-skip di Block 1.
    // However, user feedback indicates Step 0 is not needed for Backward in this specific view.
    const isBackward = method.toLowerCase().includes("backward");
    let block1Steps = steps.filter((s) => s.step > 0); // Skip start/step 0 for both Forward and Backward as per request

    // --- BARU: Jika displayAtLastStep, filter sesuai metode ---
    if (displayAtLastStep && block1Steps.length > 0) {
      if (isBackward) {
        // Untuk Backward: tampilkan Step 1 dan Step terakhir (SPSS behavior)
        const firstStep = block1Steps.find((s) => s.step === 1);
        const lastStep = block1Steps[block1Steps.length - 1];
        
        if (firstStep && lastStep && firstStep.step !== lastStep.step) {
          block1Steps = [firstStep, lastStep];
        } else if (lastStep) {
          block1Steps = [lastStep];
        }
      } else {
        // Untuk Forward: hanya tampilkan step terakhir
        block1Steps = [block1Steps[block1Steps.length - 1]];
      }
    }

    // --- Prepare Last Step for Descriptions ---
    const lastStep = block1Steps[block1Steps.length - 1];

    // Accumulators
    let hasNegativeStepChi = false;
    const omnibusRows: any[] = [];
    const summaryRows: any[] = [];
    const classificationRows: any[] = [];
    const varsInRows: any[] = [];
    const varsOutRows: any[] = [];
    const modelIfTermRemovedRows: any[] = [];


    block1Steps.forEach((stepDetail: StepDetail) => {
      // Adjustment: Jika Backward, Step 0 ditampilkan sebagai "Step 0" atau "Step 1" tergantung selera.
      // Biasanya di SPSS Backward dimulai dari Step 1 (Entered All).
      // Kita pakai step number dari backend Rust.
      const currentStepNum = stepDetail.step;
      const currentStepLabel = `Step ${currentStepNum}`;

      const currentLL = stepDetail.summary.log_likelihood;

      // Hitung Step Chi Square (Current vs Prev)
      // Perlu handling khusus untuk Step pertama
      let stepChi = 0;
      let dfStep = 1;
      let stepSig = "";

      if (stepDetail.step_omni_tests) {
        stepChi = stepDetail.step_omni_tests.chi_square;
        dfStep = stepDetail.step_omni_tests.df;
        stepSig = fmtSig(stepDetail.step_omni_tests.sig);
      }

      const omniModel = stepDetail.omni_tests;
      const blockChi = omniModel ? omniModel.chi_square : 0;
      const blockDf = omniModel ? omniModel.df : 1;
      const blockSig = omniModel ? fmtSig(omniModel.sig) : "";

      // 1. Omnibus Rows
      if (stepChi < 0) hasNegativeStepChi = true;
      // Prevent "-0.000" display: if rounded value is 0, use absolute value
      const stepChiDisplay = safeFixed(stepChi) === "-0.000" ? "0.000" : safeFixed(stepChi);
      omnibusRows.push(
        {
          rowHeader: [currentStepLabel, "Step"],
          chi: stepChiDisplay,
          df: dfStep.toString(),
          sig: stepSig,
        },
        {
          rowHeader: [currentStepLabel, "Block"],
          chi: safeFixed(blockChi),
          df: blockDf.toString(),
          sig: blockSig,
        },
        {
          rowHeader: [currentStepLabel, "Model"],
          chi: safeFixed(blockChi),
          df: blockDf.toString(),
          sig: blockSig,
        }
      );

      // 2. Summary Rows
      summaryRows.push({
        rowHeader: [currentStepNum.toString()],
        // Rust mengirim LL negatif, SPSS menampilkan -2LL (positif)
        ll: safeFixed(Math.abs(-2 * currentLL)),
        cox: safeFixed(stepDetail.summary.cox_snell_r_square),
        nagel: safeFixed(stepDetail.summary.nagelkerke_r_square),
      });

      // 3. Classification Rows
      const ct = stepDetail.classification_table;
      classificationRows.push(
        {
          rowHeader: [currentStepLabel, dependentName, label0],
          pred_0: ct.observed_0_predicted_0.toString(),
          pred_1: ct.observed_0_predicted_1.toString(),
          pct: fmtPct(ct.percentage_correct_0),
        },
        {
          rowHeader: [currentStepLabel, dependentName, label1],
          pred_0: ct.observed_1_predicted_0.toString(),
          pred_1: ct.observed_1_predicted_1.toString(),
          pct: fmtPct(ct.percentage_correct_1),
        },
        {
          rowHeader: [currentStepLabel, "Overall Percentage", ""],
          pred_0: "",
          pred_1: "",
          pct: fmtPct(ct.overall_percentage),
        }
      );

      // 4. Variables In Rows
      stepDetail.variables_in_equation.forEach((row: VariableRow) => {
        // Detect group omnibus row (categorical parent)
        const isGroupRow = row.df > 1 && row.b === 0 && row.error === 0 && row.exp_b === 0;

        const rowData: any = {
          rowHeader: [currentStepLabel, getRealVariableName(row.label)],
          b: isGroupRow ? "" : safeFixed(row.b),
          se: isGroupRow ? "" : safeFixed(row.error),
          wald: safeFixed(row.wald),
          df: row.df.toString(),
          sig: fmtSig(row.sig),
          expb: isGroupRow ? "" : safeFixed(row.exp_b),
        };

        if (ciForExpB) {
          rowData.lo = isGroupRow ? "" : safeFixed(row.lower_ci);
          rowData.up = isGroupRow ? "" : safeFixed(row.upper_ci);
        }

        varsInRows.push(rowData);
      });

      // 5. Variables Out Rows
      const varsNotIn = stepDetail.variables_not_in_equation;
      if (varsNotIn && varsNotIn.length > 0) {
        varsNotIn.forEach((v) => {
          varsOutRows.push({
            rowHeader: [currentStepLabel, getRealVariableName(v.label)],
            score: safeFixed(v.score),
            df: v.df.toString(),
            sig: fmtSig(v.sig),
          });
        });

        // Add Overall Statistics for this step if available
        if (stepDetail.remainder_test) {
          varsOutRows.push({
            rowHeader: [currentStepLabel, "Overall Statistics"],
            score: safeFixed(stepDetail.remainder_test.chi_square),
            df: stepDetail.remainder_test.df.toString(),
            sig: fmtSig(stepDetail.remainder_test.sig),
          });
        }
      }

      // 6. Model If Term Removed (Critical for Backward)
      if (
        stepDetail.model_if_term_removed &&
        stepDetail.model_if_term_removed.length > 0
      ) {
        stepDetail.model_if_term_removed.forEach((item) => {
          modelIfTermRemovedRows.push({
            rowHeader: [currentStepLabel, getRealVariableName(item.label)],
            model_ll: safeFixed(item.model_log_likelihood),
            change: safeFixed(item.change_in_neg2ll),
            df: item.df.toString(),
            sig: fmtSig(item.sig_change),
          });
        });
      }
    });

    // --- RENDER SECTIONS FOR STEPWISE ---
    if (block1Steps.length > 0) {
      if (omnibusRows.length > 0) {
        // Dynamic description based on last step
        const omni = lastStep?.omni_tests;
        const omniDesc = omni
          ? generateOmnibusDescription(omni.chi_square, omni.df, omni.sig)
          : "Omnibus tests of model coefficients.";

        const omniNote = hasNegativeStepChi
          ? "A negative Chi-squares value indicates that the Chi-squares value has decreased from the previous step."
          : undefined;

        sections.push(
          createSection(
            "block1_omnibus",
            "Omnibus Tests of Model Coefficients",
            {
              columnHeaders: [
                {
                  header: "",
                  children: [
                    { header: "", key: "rh1" },
                    { header: "", key: "rh2" },
                  ],
                },
                { header: "Chi-square", key: "chi" },
                { header: "df", key: "df" },
                { header: "Sig.", key: "sig" },
              ],
              rows: omnibusRows,
            },
            {
              note: omniNote,
              description: `History of model fit significance. Final step: ${omniDesc}`,
            }
          )
        );
      }

      if (summaryRows.length > 0) {
        const summary = lastStep?.summary;
        const sumDesc = summary
          ? generateModelSummaryDescription(summary.nagelkerke_r_square)
          : "";

        sections.push(
          createSection(
            "block1_summary",
            "Model Summary",
            {
              columnHeaders: [
                { header: "Step", key: "rowHeader" },
                { header: "-2 Log likelihood", key: "ll" },
                { header: "Cox & Snell R Square", key: "cox" },
                { header: "Nagelkerke R Square", key: "nagel" },
              ],
              rows: summaryRows,
            },
            {
              description: `Model summary statistics for each step. Final step: ${sumDesc}`,
            }
          )
        );
      }

      if (classificationRows.length > 0) {
        const ct = lastStep?.classification_table;
        const classDesc = ct
          ? generateClassificationDescription(ct.overall_percentage)
          : "";

        sections.push(
          createSection(
            "block1_classification",
            "Classification Table",
            {
              columnHeaders: [
                {
                  header: "Observed",
                  children: [
                    { header: "", key: "rh1" },
                    { header: "", key: "rh2" },
                    { header: "", key: "rh3" },
                  ],
                },
                {
                  header: "Predicted",
                  children: [
                    {
                      header: dependentName,
                      children: [
                        { header: label0, key: "pred_0" },
                        { header: label1, key: "pred_1" },
                      ],
                    },
                    { header: "Percentage Correct", key: "pct" },
                  ],
                },
              ],
              rows: classificationRows,
            },
            {
              description: `Classification results at each step. Final step: ${classDesc}`,
              note: includeConstant 
                ? `a. Constant is included in the model.\nb. The cut value is ${cutoff.toFixed(3)}`
                : `a. Constant is not included in the model.\nb. The cut value is ${cutoff.toFixed(3)}`,
            }
          )
        );
      }

      if (varsInRows.length > 0) {
        const vars = lastStep?.variables_in_equation || [];
        const simpleVars = vars.map((v) => ({
          label: getRealVariableName(v.label),
          sig: v.sig,
          exp_b: v.exp_b,
        }));
        const varsDesc = generateVarsInEquationDescription(simpleVars);

        // Build column headers conditionally based on ciForExpB
        const stepwiseVarsInHeaders: any[] = [
          {
            header: "",
            children: [
              { header: "", key: "rh1" },
              { header: "", key: "rh2" },
            ],
          },
          { header: "B", key: "b" },
          { header: "S.E.", key: "se" },
          { header: "Wald", key: "wald" },
          { header: "df", key: "df" },
          { header: "Sig.", key: "sig" },
          { header: "Exp(B)", key: "expb" },
        ];

        // Only add CI columns if ciForExpB is true
        if (ciForExpB) {
          stepwiseVarsInHeaders.push({
            header: `${ciLevel}% C.I.for EXP(B)`,
            children: [
              { header: "Lower", key: "lo" },
              { header: "Upper", key: "up" },
            ],
          });
        }

        sections.push(
          createSection(
            "block1_vars_in",
            "Variables in the Equation",
            {
              columnHeaders: stepwiseVarsInHeaders,
              rows: varsInRows,
            },
            {
              description: `Coefficients for variables included in the model at each step. Final step: ${varsDesc}`,
            }
          )
        );
      }

      if (modelIfTermRemovedRows.length > 0) {
        sections.push(
          createSection(
            "block1_model_if_removed",
            "Model if Term Removed",
            {
              columnHeaders: [
                {
                  header: "Variable",
                  children: [
                    { header: "", key: "rh1" },
                    { header: "", key: "rh2" },
                  ],
                },
                { header: "Model Log Likelihood", key: "model_ll" },
                { header: "Change in -2 Log Likelihood", key: "change" },
                { header: "df", key: "df" },
                { header: "Sig. of the Change", key: "sig" },
              ],
              rows: modelIfTermRemovedRows,
            },
            {
              description:
                "Tests for removal of variables at each step.",
            }
          )
        );
      }

      if (varsOutRows.length > 0) {
        sections.push(
          createSection(
            "block1_vars_not_in",
            "Variables not in the Equation",
            {
              columnHeaders: [
                {
                  header: "",
                  children: [
                    { header: "", key: "rh1" },
                    { header: "", key: "rh2" },
                  ],
                },
                { header: "Score", key: "score" },
                { header: "df", key: "df" },
                { header: "Sig.", key: "sig" },
              ],
              rows: varsOutRows,
            },
            {
              description:
                "Score tests for predictors not included in the model at each step.",
            }
          )
        );
      }
    } else {
      // Fallback
      sections.push(
        createSection(
          "block1_status",
          "Block 1: Analysis Status",
          {
            columnHeaders: [
              {
                header: "",
                children: [{ header: "", key: "rh1" }],
              },
              { header: "Message", key: "msg" },
            ],
            rows: [
              {
                rowHeader: ["Result"],
                msg: "No variables entered or removed.",
              },
            ],
          },
          {}
        )
      );
    }
  }

  return { sections };
};
