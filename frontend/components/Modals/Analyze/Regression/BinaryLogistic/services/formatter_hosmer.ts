import type {
  LogisticResult,
  AnalysisSection,
  HosmerLemeshowResult,
} from "../types/binary-logistic";
import {
  createSection,
  safeFixed,
  fmtSig,
  generateHosmerDescription,
} from "./formatter_utils";

/**
 * Options for formatting Hosmer-Lemeshow tables
 */
interface HosmerFormatOptions {
  displayAtLastStep?: boolean;
}

export const formatHosmerLemeshow = (
  result: LogisticResult,
  dependentName: string,
  options?: HosmerFormatOptions
): { sections: AnalysisSection[] } => {
  const displayAtLastStep = options?.displayAtLastStep ?? false;
  const sections: AnalysisSection[] = [];

  // Persiapan Label (Agar "Observed" sesuai label asli, misal "No/Yes")
  const modelInfo = (result as any).model_info || {};
  const yMap = modelInfo.y_encoding || {};

  // Buat lookup table: value (0/1) -> Label Asli (misal "Tidak"/"Ya")
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

  const label0 = getLabel(0); // Label untuk kelompok 0
  const label1 = getLabel(1); // Label untuk kelompok 1

  // Deteksi metode stepwise
  const method = result.method_used || "Enter";
  const isStepwise =
    method.toLowerCase().includes("forward") ||
    method.toLowerCase().includes("backward");

  // ======================================================================
  // LOGIKA A: METODE ENTER (Single Step)
  // ======================================================================
  if (!isStepwise) {
    // Ambil Hosmer-Lemeshow dari result utama atau step terakhir
    let hlResult = result.hosmer_lemeshow;
    if (!hlResult && result.steps_detail && result.steps_detail.length > 0) {
      const lastStep = result.steps_detail[result.steps_detail.length - 1];
      hlResult = lastStep.hosmer_lemeshow;
    }

    // Jika data tidak ada (opsi tidak dicentang), return kosong
    if (!hlResult) {
      return { sections: [] };
    }

    // Generate deskripsi dinamis (Fit vs Not Fit)
    const hlDesc = generateHosmerDescription(hlResult.sig);

    const summaryData = {
      columnHeaders: [
        { header: "Step", key: "step" },
        { header: "Chi-square", key: "chi" },
        { header: "df", key: "df" },
        { header: "Sig.", key: "sig" },
      ],
      rows: [
        {
          rowHeader: [],
          step: "1",
          chi: safeFixed(hlResult.chi_square),
          df: hlResult.df.toString(),
          sig: fmtSig(hlResult.sig),
        },
      ],
    };

    sections.push(
      createSection("hosmer_summary", "Hosmer and Lemeshow Test", summaryData, {
        description: hlDesc,
        note: "a. The Null Hypothesis states that the model fits the data. A significance value of less than .05 indicates a poor fit.",
      })
    );

    // Contingency Table
    const contingencyData = {
      columnHeaders: [
        {
          header: "",
          children: [{ header: "", key: "rh1" }],
        },
        {
          header: `${dependentName} = ${label0}`,
          children: [
            { header: "Observed", key: "obs0" },
            { header: "Expected", key: "exp0" },
          ],
        },
        {
          header: `${dependentName} = ${label1}`,
          children: [
            { header: "Observed", key: "obs1" },
            { header: "Expected", key: "exp1" },
          ],
        },
        { header: "Total", key: "total" },
      ],
      rows: hlResult.contingency_table.map((row) => ({
        rowHeader: [row.group.toString()],
        obs0: row.observed_0.toString(),
        exp0: safeFixed(row.expected_0),
        obs1: row.observed_1.toString(),
        exp1: safeFixed(row.expected_1),
        total: row.total_observed.toString(),
      })),
    };

    sections.push(
      createSection(
        "hosmer_contingency",
        "Contingency Table for Hosmer and Lemeshow Test",
        contingencyData,
        {
          description:
            "Comparison of observed and expected frequencies across probability deciles.",
        }
      )
    );

    return { sections };
  }

  // ======================================================================
  // LOGIKA B: METODE STEPWISE (Forward/Backward - Multiple Steps)
  // ======================================================================

  // Kumpulkan semua step yang memiliki Hosmer-Lemeshow data
  let stepsWithHL: { step: number; hl: HosmerLemeshowResult }[] = [];

  if (result.steps_detail && result.steps_detail.length > 0) {
    result.steps_detail.forEach((stepDetail) => {
      // Skip step 0 (Block 0 / null model) karena tidak punya predictor
      if (stepDetail.step > 0 && stepDetail.hosmer_lemeshow) {
        stepsWithHL.push({
          step: stepDetail.step,
          hl: stepDetail.hosmer_lemeshow,
        });
      }
    });
  }

  // Jika tidak ada step dengan Hosmer-Lemeshow, return kosong
  if (stepsWithHL.length === 0) {
    return { sections: [] };
  }

  // ======================================================================
  // FILTER BERDASARKAN displayAtLastStep
  // Forward: hanya step terakhir
  // Backward: step 1 dan step terakhir
  // ======================================================================
  const isBackward = method.toLowerCase().includes("backward");

  if (displayAtLastStep && stepsWithHL.length > 1) {
    const firstStep = stepsWithHL[0];
    const lastStep = stepsWithHL[stepsWithHL.length - 1];

    if (isBackward) {
      // Backward: tampilkan step 1 dan step terakhir
      if (firstStep.step === lastStep.step) {
        stepsWithHL = [firstStep]; // Jika hanya satu step
      } else {
        stepsWithHL = [firstStep, lastStep];
      }
    } else {
      // Forward: hanya tampilkan step terakhir
      stepsWithHL = [lastStep];
    }
  }

  // ======================================================================
  // TABEL 1: Hosmer and Lemeshow Test Summary (Semua Step)
  // ======================================================================

  // Generate deskripsi berdasarkan step terakhir
  const lastStepHL = stepsWithHL[stepsWithHL.length - 1].hl;
  const hlDesc = generateHosmerDescription(lastStepHL.sig);

  const summaryData = {
    columnHeaders: [
      { header: "Step", key: "step" },
      { header: "Chi-square", key: "chi" },
      { header: "df", key: "df" },
      { header: "Sig.", key: "sig" },
    ],
    rows: stepsWithHL.map(({ step, hl }) => ({
      rowHeader: [],
      step: step.toString(),
      chi: safeFixed(hl.chi_square),
      df: hl.df.toString(),
      sig: fmtSig(hl.sig),
    })),
  };

  sections.push(
    createSection("hosmer_summary", "Hosmer and Lemeshow Test", summaryData, {
      description: hlDesc,
      note: "a. The Null Hypothesis states that the model fits the data. A significance value of less than .05 indicates a poor fit.",
    })
  );

  // ======================================================================
  // TABEL 2: Contingency Table (Gabungan Semua Step dalam Satu Tabel)
  // ======================================================================

  // Flatten semua rows dari semua step ke dalam satu array
  const allContingencyRows: any[] = [];

  stepsWithHL.forEach(({ step, hl }) => {
    hl.contingency_table.forEach((row, idx) => {
      allContingencyRows.push({
        rowHeader:
          idx === 0
            ? [step.toString(), row.group.toString()]
            : ["", row.group.toString()],
        obs0: row.observed_0.toString(),
        exp0: safeFixed(row.expected_0),
        obs1: row.observed_1.toString(),
        exp1: safeFixed(row.expected_1),
        total: row.total_observed.toString(),
      });
    });
  });

  const contingencyData = {
    columnHeaders: [
      {
        header: "",
        children: [
          { header: "Step", key: "stepNum" },
          { header: "", key: "rh1" },
        ],
      },
      {
        header: `${dependentName} = ${label0}`,
        children: [
          { header: "Observed", key: "obs0" },
          { header: "Expected", key: "exp0" },
        ],
      },
      {
        header: `${dependentName} = ${label1}`,
        children: [
          { header: "Observed", key: "obs1" },
          { header: "Expected", key: "exp1" },
        ],
      },
      { header: "Total", key: "total" },
    ],
    rows: allContingencyRows,
  };

  sections.push(
    createSection(
      "hosmer_contingency",
      "Contingency Table for Hosmer and Lemeshow Test",
      contingencyData,
      {
        description:
          "Comparison of observed and expected frequencies across probability deciles for each step.",
      }
    )
  );

  return { sections };
};
