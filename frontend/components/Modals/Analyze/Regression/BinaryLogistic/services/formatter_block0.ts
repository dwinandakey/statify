import type { LogisticResult, AnalysisSection } from "../types/binary-logistic";
import {
  createSection,
  safeFixed,
  fmtSig,
  fmtPct,
  generateClassificationDescription,
} from "./formatter_utils";

/**
 * Options for formatting Block 0
 */
interface Block0FormatOptions {
  cutoff?: number;  // Classification cutoff value
}

export const formatBlock0 = (
  result: LogisticResult,
  dependentName: string,
  options?: Block0FormatOptions
): { sections: AnalysisSection[] } => {
  const sections: AnalysisSection[] = [];
  const cutoff = options?.cutoff ?? 0.5;

  const modelInfo = (result as any).model_info || {};
  const variableNames = modelInfo.variables || [];

  // Helper Name: Mengembalikan nama asli variabel jika formatnya "Var_X"
  const getRealVariableName = (label: string): string => {
    if (label.startsWith("Var_") || label.startsWith("Var ")) {
      const parts = label.split(/[ _]/);
      const indexStr = parts[1];
      const index = parseInt(indexStr, 10);
      // Note: Rust index might be 0-based.
      if (!isNaN(index) && variableNames[index]) {
        return variableNames[index];
      }
    }
    return label;
  };

  // ======================================================================
  // 1. HELPERS: LABEL DECODING
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

  // ======================================================================
  // 2. DATA PREPARATION (Classification Table - USE DATA FROM RUST)
  // ======================================================================
  // PERBAIKAN: Gunakan classification table dari steps_detail[0] (Block 0)
  // yang sudah dihitung dengan benar oleh Rust, bukan menghitung ulang di sini.
  // Ini penting untuk kasus include_constant = false dimana null model
  // memprediksi P = 0.5 untuk semua kasus (bukan prediksi mayoritas).

  // Cek apakah include_constant dari model_info
  const includeConstant = modelInfo.include_constant !== false;

  // Ambil classification table dari Block 0 (Step 0) jika tersedia
  const block0Step = result.steps_detail?.find(s => s.step === 0);
  const block0ClassTable = block0Step?.classification_table;

  // Fallback: jika tidak ada steps_detail, gunakan result.classification_table
  const ctRef = block0ClassTable || result.classification_table;

  // Hitung total observed dari data yang tersedia
  const totalObs0 =
    (ctRef?.observed_0_predicted_0 || 0) + (ctRef?.observed_0_predicted_1 || 0);
  const totalObs1 =
    (ctRef?.observed_1_predicted_0 || 0) + (ctRef?.observed_1_predicted_1 || 0);
  const totalN = totalObs0 + totalObs1;

  let obs0_pred0 = 0,
    obs0_pred1 = 0,
    obs1_pred0 = 0,
    obs1_pred1 = 0;

  // Jika ada classification table dari Rust (Block 0), gunakan langsung
  if (block0ClassTable) {
    obs0_pred0 = block0ClassTable.observed_0_predicted_0;
    obs0_pred1 = block0ClassTable.observed_0_predicted_1;
    obs1_pred0 = block0ClassTable.observed_1_predicted_0;
    obs1_pred1 = block0ClassTable.observed_1_predicted_1;
  } else {
    // Fallback: hitung berdasarkan logika (untuk backward compatibility)
    // Untuk kasus include_constant = false, null model memprediksi P = 0.5
    // Dengan cutoff 0.5, semua diprediksi sebagai 1 (TRUE) karena 0.5 >= 0.5
    if (!includeConstant) {
      // Null model tanpa constant: P = 0.5, semua diprediksi 1
      obs0_pred1 = totalObs0; // 0 salah diprediksi 1
      obs1_pred1 = totalObs1; // 1 benar diprediksi 1
    } else {
      // Null model dengan constant: prediksi mayoritas
      const predict1 = totalObs1 > totalObs0;
      if (predict1) {
        obs0_pred1 = totalObs0;
        obs1_pred1 = totalObs1;
      } else {
        obs0_pred0 = totalObs0;
        obs1_pred0 = totalObs1;
      }
    }
  }

  const b0_pct_0 = totalObs0 > 0 ? (obs0_pred0 / totalObs0) * 100 : 0;
  const b0_pct_1 = totalObs1 > 0 ? (obs1_pred1 / totalObs1) * 100 : 0;
  const b0_overall =
    totalN > 0 ? ((obs0_pred0 + obs1_pred1) / totalN) * 100 : 0;

  // ======================================================================
  // 3. TABLE: CLASSIFICATION TABLE
  // ======================================================================
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
        rowHeader: ["Step 0", dependentName, label0],
        pred_0: obs0_pred0.toString(),
        pred_1: obs0_pred1.toString(),
        pct: fmtPct(b0_pct_0),
      },
      {
        rowHeader: ["Step 0", dependentName, label1],
        pred_0: obs1_pred0.toString(),
        pred_1: obs1_pred1.toString(),
        pct: fmtPct(b0_pct_1),
      },
      {
        rowHeader: ["Step 0", "Overall Percentage", ""],
        pred_0: "",
        pred_1: "",
        pct: fmtPct(b0_overall),
      },
    ],
  };

  // Gunakan generator deskripsi dinamis
  const classDesc = generateClassificationDescription(b0_overall);

  const block0ConstVar = (result as any).block_0_constant as any;
  const hasConstantInBlock0 =
    includeConstant && (
      block0ConstVar?.label === "Constant" ||
      (result.steps_detail &&
        result.steps_detail.length > 0 &&
        (result.steps_detail[0].variables_in_equation || []).some(
          (v: any) => v.label === "Constant"
        ))
    );

  sections.push(
    createSection(
      "block0_classification",
      "Classification Table",
      classificationData,
      {
        description: `Initial classification (Null Model). ${classDesc}`,
        note: hasConstantInBlock0
          ? `a. Constant is included in the model.\nb. The cut value is ${cutoff.toFixed(3)}`
          : `a. No terms in the model.\nb. Initial Log-likelihood Function: -2 Log Likelihood = ${(block0Step?.summary?.log_likelihood != null ? (-2 * block0Step.summary.log_likelihood).toFixed(3) : 'N/A')}\nc. The cut value is ${cutoff.toFixed(3)}`,
      }
    )
  );

  // ======================================================================
  // 4. TABLE: VARIABLES IN EQUATION (Constant Only)
  // ======================================================================
  // LOGIKA PRIORITY:
  // 1. Jika include_constant = false, tidak tampilkan tabel ini.
  // 2. Cek field khusus `block_0_constant` (Metode Backward pakai ini).
  // 3. Jika tidak ada, cek `steps_detail[0]` (Metode Enter/Forward pakai ini).

  if (includeConstant) {
    let constVar = (result as any).block_0_constant;

    if (!constVar && result.steps_detail && result.steps_detail.length > 0) {
      const step0Vars = result.steps_detail[0].variables_in_equation || [];
      constVar = step0Vars.find((v: any) => v.label === "Constant");
    }

    const hasConstant = constVar?.label === "Constant";

    // Fallback safe object
    if (!constVar) {
      constVar = { b: 0, error: 0, wald: 0, df: 1, sig: 1, exp_b: 1 };
    }

    const varsInData = {
      columnHeaders: [
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
      ],
      rows: [
        {
          rowHeader: ["Step 0", "Constant"],
          b: safeFixed(constVar?.b),
          se: safeFixed(constVar?.error),
          wald: safeFixed(constVar?.wald),
          df: "1",
          sig: fmtSig(constVar?.sig),
          expb: safeFixed(constVar?.exp_b),
        },
      ],
    };

    if (hasConstant) {
      sections.push(
        createSection("block0_vars_in", "Variables in the Equation", varsInData, {
          description:
            "Intercept (constant) for the null model containing no predictors.",
        })
      );
    }
  }

  // ======================================================================
  // 5. TABLE: VARIABLES NOT IN EQUATION (Score Tests)
  // ======================================================================
  // LOGIKA PRIORITY:
  // 1. Cek field khusus `block_0_variables_not_in` (Backward).
  // 2. Jika tidak ada, cek `steps_detail[0].variables_not_in_equation` (Enter/Forward).
  // 3. Fallback ke `variables_not_in_equation` global (root).

  let varsNotIn = (result as any).block_0_variables_not_in;
  let remainderTest = null;

  if (!varsNotIn) {
    if (result.steps_detail && result.steps_detail.length > 0) {
      varsNotIn = result.steps_detail[0].variables_not_in_equation;
      remainderTest = result.steps_detail[0].remainder_test;
    }

    if (!varsNotIn) {
      // Sangat jarang, fallback terakhir
      varsNotIn = result.variables_not_in_equation;
    }
  }

  // FIX: Selalu coba ambil remainderTest dari steps_detail[0] (Block 0) terlebih dahulu.
  // Sebelumnya, jika block_0_variables_not_in ada (kasus stepwise methods),
  // remainderTest tetap null dan jatuh ke overall_remainder_test yang berisi
  // data dari FINAL step (bukan Block 0). Ini menyebabkan Overall Statistics
  // menampilkan df dan chi-square dari step terakhir, bukan dari joint score test
  // semua variabel kandidat di Block 0.
  if (!remainderTest && result.steps_detail && result.steps_detail.length > 0) {
    remainderTest = result.steps_detail[0].remainder_test;
  }

  // Fallback terakhir: ambil dari overall_remainder_test (root level)
  if (!remainderTest) {
    remainderTest = (result as any).overall_remainder_test;
  }

  // Pastikan array
  const varsNotInArray = varsNotIn ? [...varsNotIn] : [];

  // --- LOGIKA FIX OVERALL STATISTICS ---
  // Cek apakah di dalam list variabel sudah ada baris "Overall Statistics".
  // (Backward method biasanya sudah menyertakannya dari Rust).
  const hasOverall = varsNotInArray.some(
    (v: any) => v.label === "Overall Statistics"
  );

  // Jika belum ada (biasanya pada Enter/Forward), dan kita punya datanya, tambahkan manual.
  if (!hasOverall && remainderTest) {
    varsNotInArray.push({
      label: "Overall Statistics",
      score: remainderTest.chi_square,
      df: remainderTest.df,
      sig: remainderTest.sig,
    });
  }

  const varsNotInData = {
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
    rows: varsNotInArray.map((v: any) => ({
      rowHeader: ["Step 0", getRealVariableName(v.label)],
      score: safeFixed(v.score),
      df: v.df.toString(),
      sig: fmtSig(v.sig),
    })),
  };

  // Generate deskripsi dinamis untuk "Variables not in equation"
  let varsOutDesc = "Score tests for predictors not included in the model.";
  if (remainderTest) {
    const pVal = remainderTest.sig;
    const isSig = pVal < 0.05;
    const pText = pVal < 0.001 ? "< .001" : `= ${pVal.toFixed(3)}`;

    if (isSig) {
      varsOutDesc = `The overall residual Score statistic is statistically significant (p ${pText}), indicating that the addition of one or more predictors would significantly improve the model fit.`;
    } else {
      varsOutDesc = `The overall residual Score statistic is not statistically significant (p ${pText}), suggesting that adding predictors may not significantly improve the model.`;
    }
  }

  sections.push(
    createSection(
      "block0_vars_not_in",
      "Variables not in the Equation",
      varsNotInData,
      {
        description: varsOutDesc,
        note: "a. Residual Chi-Squares are computed based on the likelihood ratios.",
      }
    )
  );

  return { sections };
};
