import { AnalysisSection } from "../types/ordinal";
import { OrdinalFormatterContext } from "./formatter_context";
import { createSection, fmtSig, safeFixed } from "./formatter_utils";

export const formatParallelLines = (
  context: OrdinalFormatterContext
): AnalysisSection[] => {
  const { result, wantTestOfParallelLines, linkFunctionNote } = context;
  if (!wantTestOfParallelLines || !result.testOfParallelLines) {
    return [];
  }

  const parallelTest = result.testOfParallelLines;
  return [
    createSection(
      "ordinal_test_of_parallel_lines",
      "Test of Parallel Lines",
      {
        columnHeaders: [
          { header: "Model", key: "rh1" },
          { header: "-2 Log Likelihood", key: "neg2ll" },
          { header: "Chi-Square", key: "chiSquare" },
          { header: "df", key: "df" },
          { header: "Sig.", key: "sig" },
        ],
        rows: [
          {
            rowHeader: ["Null Hypothesis"],
            neg2ll: safeFixed(parallelTest.minus2LogLikelihoodParallel),
            chiSquare: ".",
            df: ".",
            sig: ".",
          },
          {
            rowHeader: ["General"],
            neg2ll: safeFixed(parallelTest.minus2LogLikelihoodNonParallel),
            chiSquare: safeFixed(parallelTest.chiSquare),
            df: safeFixed(parallelTest.df, 0),
            sig: fmtSig(parallelTest.sig),
          },
        ],
      },
      {
        description: "Uji asumsi parallel lines.",
        note: `The null hypothesis states that the location parameters (slope coefficients) are the same across response categories.\n${linkFunctionNote}`,
      }
    ),
  ];
};
