import type { LogisticResult, AnalysisSection } from "../types/binary-logistic";
import { createSection, fmtPct } from "./formatter_utils";
import type { Variable } from "@/types/Variable";

export const formatSummaryTables = (
  result: LogisticResult,
  dependentVar?: Variable,
  independentVars: Variable[] = []
): {
  sections: AnalysisSection[];
  totalN: number;
  counts: { count_0: number; count_1: number };
} => {
  const sections: AnalysisSection[] = [];
  const ct = result.classification_table;
  const modelInfo = result.model_info || {};

  // ----------------------------------------------------------------------
  // 1. Hitung Total N dari Classification Table (Included Cases)
  // ----------------------------------------------------------------------
  const obs0_pred0 = ct.observed_0_predicted_0 || 0;
  const obs0_pred1 = ct.observed_0_predicted_1 || 0;
  const obs1_pred0 = ct.observed_1_predicted_0 || 0;
  const obs1_pred1 = ct.observed_1_predicted_1 || 0;

  const count_0 = obs0_pred0 + obs0_pred1;
  const count_1 = obs1_pred0 + obs1_pred1;
  const nIncluded = count_0 + count_1;

  // ----------------------------------------------------------------------
  // 2. Data Preparation untuk Case Processing
  // ----------------------------------------------------------------------
  const nMissing = modelInfo.n_missing || 0;
  const nTotal = nIncluded + nMissing;

  // Helper local untuk menghitung persentase lalu memformatnya
  const calcPct = (numerator: number, denominator: number): string => {
    const val = denominator === 0 ? 0 : (numerator / denominator) * 100;
    return fmtPct(val);
  };

  // ----------------------------------------------------------------------
  // 3. Section: Case Processing Summary
  // ----------------------------------------------------------------------
  const caseProcessingData = {
    columnHeaders: [
      { header: "Unweighted Cases", key: "rh1", colSpan: 2, rowSpan: 2 },
      { header: "", key: "rh2", isPlaceholder: true },
      { header: "N", key: "n", align: "right" as const },
      { header: "Percent", key: "percent", align: "right" as const },
    ],
    rows: [
      {
        rowHeader: ["Selected Cases", "Included in Analysis"],
        n: nIncluded.toString(),
        percent: calcPct(nIncluded, nTotal),
      },
      {
        rowHeader: ["Selected Cases", "Missing Cases"],
        n: nMissing.toString(),
        percent: calcPct(nMissing, nTotal),
      },
      {
        rowHeader: ["Selected Cases", "Total"],
        n: nTotal.toString(),
        percent: calcPct(nTotal, nTotal),
      },
      {
        rowHeader: ["Unselected Cases", null],
        n: "0",
        percent: ".0",
      },
      {
        rowHeader: ["Total", null],
        n: nTotal.toString(),
        percent: calcPct(nTotal, nTotal),
      },
    ],
  };

  const validPct = calcPct(nIncluded, nTotal);
  const caseDesc = `The analysis included ${nIncluded} cases (${validPct}%), while ${nMissing} cases were excluded due to missing values.`;

  sections.push(
    createSection(
      "summary_case_processing",
      "Case Processing Summary",
      caseProcessingData,
      {
        description: caseDesc,
        note: "a. If weight is in effect, see classification table for the total number of cases.",
      }
    )
  );

  // ----------------------------------------------------------------------
  // 4. Section: Dependent Variable Encoding
  // ----------------------------------------------------------------------
  const encodingMap = modelInfo.y_encoding || {};
  const encodingRows = Object.entries(encodingMap)
    .map(([originalKey, internalValue]) => {
      let displayLabel = originalKey;

      if (
        dependentVar?.values &&
        Array.isArray(dependentVar.values) &&
        dependentVar.values.length > 0
      ) {
        const found = dependentVar.values.find((vl) => {
          // Bandingkan loose (string "0" == number 0)
          return vl.value == originalKey;
        });
        if (found) {
          displayLabel = found.label;
        }
      }

      return {
        originalKey,
        displayLabel,
        internalValue: Number(internalValue),
      };
    })
    .sort((a, b) => a.internalValue - b.internalValue)
    .map((item) => ({
      rowHeader: [item.displayLabel],
      val: item.internalValue.toString(),
    }));

  if (encodingRows.length === 0) {
    encodingRows.push(
      { rowHeader: ["0"], val: "0" },
      { rowHeader: ["1"], val: "1" }
    );
  }

  const encodingData = {
    columnHeaders: [
      { header: "Original Value", key: "rowHeader" },
      { header: "Internal Value", key: "val" },
    ],
    rows: encodingRows,
  };

  sections.push(
    createSection(
      "summary_encoding",
      "Dependent Variable Encoding",
      encodingData,
      {
        description:
          "The mapping between the original dependent variable values and the internal values (0 and 1) used in the analysis.",
      }
    )
  );

  // ----------------------------------------------------------------------
  // 5. Section: Categorical Variables Codings
  // ----------------------------------------------------------------------
  if (result.categorical_codings && result.categorical_codings.length > 0) {
    // Cari jumlah kolom parameter coding maksimal (k - 1)
    let maxParamCols = 0;
    result.categorical_codings.forEach((coding) => {
      coding.categories.forEach((cat) => {
        if (
          cat.parameter_codings &&
          cat.parameter_codings.length > maxParamCols
        ) {
          maxParamCols = cat.parameter_codings.length;
        }
      });
    });

    if (maxParamCols > 0) {
      // Build Parameter Columns Headers: (1), (2), ...
      const paramHeaders = Array.from({ length: maxParamCols }, (_, i) => ({
        header: `(${i + 1})`,
        key: `param_${i}`,
        align: "right" as const,
      }));

      const catData = {
        columnHeaders: [
          {
            header: "",
            children: [
              { header: "", key: "var" }, // Variable Name
              { header: "", key: "cat" }, // Category Label
            ],
          },
          { header: "Frequency", key: "freq", align: "right" as const },
          { header: "Parameter coding", children: paramHeaders },
        ],
        rows: [] as any[],
      };

      // Ambil map encoding dari Worker (jika ada) untuk membalikkan angka ke label asli
      const xEncodings = (modelInfo as any).x_encodings || {};

      result.categorical_codings.forEach((coding) => {
        // Cari kamus encoding spesifik untuk variabel ini dari worker
        const varMap = xEncodings[coding.variable_label];
        // Cari variabel di store (sebagai cadangan)
        const matchingVar = independentVars.find(
          (v) => v.name === coding.variable_label
        );

        coding.categories.forEach((cat, idx) => {
          let categoryDisplay = cat.category_label;
          if (varMap) {
            const foundKey = Object.keys(varMap).find((originalLabel) => {
              // Bandingkan nilai internal (toleransi string/number)
              return varMap[originalLabel] == cat.category_label;
            });
            if (foundKey) {
              categoryDisplay = foundKey;
            }
          } else if (
            matchingVar?.values &&
            Array.isArray(matchingVar.values)
          ) {
            const foundVal = matchingVar.values.find(
              (vl) => vl.value == cat.category_label
            );
            if (foundVal) categoryDisplay = foundVal.label;
          }

          const row: any = {
            // Tampilkan nama variabel di setiap baris - renderer akan otomatis merge dengan rowSpan
            rowHeader: [coding.variable_label, categoryDisplay],
            freq: cat.frequency.toString(),
          };

          // Isi nilai parameter coding
          cat.parameter_codings.forEach((val, pIdx) => {
            row[`param_${pIdx}`] = val.toFixed(3);
          });

          // Isi sisa kolom dengan string kosong
          for (let i = cat.parameter_codings.length; i < maxParamCols; i++) {
            row[`param_${i}`] = "";
          }

          catData.rows.push(row);
        });
      });

      sections.push(
        createSection(
          "categorical_codings",
          "Categorical Variables Codings",
          catData,
          {
            description:
              "Frequencies and parameter coding for categorical predictor variables.",
          }
        )
      );
    }
  }

  return { sections, totalN: nIncluded, counts: { count_0, count_1 } };
};
