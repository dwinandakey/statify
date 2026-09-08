// discriminant-analysis-formatter.ts
import { formatDisplayNumber } from "@/hooks/useFormatter";
import type { ResultJson, Table } from "@/types/Table";
import type { Chart } from "@/types/Chart";

export function transformDiscriminantResult(data: any): ResultJson {
  const resultJson: ResultJson = {
    tables: [],
  };

  // 1. Analysis Case Processing Summary
  if (data.processing_summary) {
    const table: Table = {
      key: "processing_summary",
      title: "Analysis Case Processing Summary",
      columnHeaders: [
        { header: "", key: "case_category" },
        { header: "", key: "sub_category" },
        { header: "N", key: "n" },
        { header: "Percent", key: "percent" },
      ],
      rows: [],
    };

    // Valid row
    table.rows.push({
      rowHeader: ["Valid"],
      n: formatDisplayNumber(data.processing_summary.valid_count),
      percent: formatDisplayNumber(data.processing_summary.valid_percent),
    });

    // Excluded rows - only add if defined
    if (data.processing_summary.missing_group_codes !== undefined) {
      table.rows.push({
        rowHeader: ["Excluded", "Missing or out-of-range group codes"],
        n: formatDisplayNumber(data.processing_summary.missing_group_codes),
        percent: formatDisplayNumber(
          data.processing_summary.missing_group_percent,
        ),
      });
    }

    if (data.processing_summary.missing_disc_vars !== undefined) {
      table.rows.push({
        rowHeader: ["", "At least one missing discriminating variable"],
        n: formatDisplayNumber(data.processing_summary.missing_disc_vars),
        percent: formatDisplayNumber(
          data.processing_summary.missing_disc_percent,
        ),
      });
    }

    if (data.processing_summary.both_missing !== undefined) {
      table.rows.push({
        rowHeader: [
          "",
          "Both missing or out-of-range group codes and at least one missing discriminating variable",
        ],
        n: formatDisplayNumber(data.processing_summary.both_missing),
        percent: formatDisplayNumber(
          data.processing_summary.both_missing_percent,
        ),
      });
    }

    // Total excluded
    table.rows.push({
      rowHeader: ["", "Total"],
      n: formatDisplayNumber(data.processing_summary.excluded_count),
      percent: formatDisplayNumber(
        data.processing_summary.total_excluded_percent,
      ),
    });

    // Grand total
    table.rows.push({
      rowHeader: ["Total"],
      n: formatDisplayNumber(data.processing_summary.total_count),
      percent: formatDisplayNumber(100.0),
    });

    resultJson.tables.push(table);
  }

  // 2. Classification Processing Summary
  if (data.processing_summary) {
    const table: Table = {
      key: "classification_processing_summary",
      title: "Classification Processing Summary",
      columnHeaders: [
        { header: "", key: "category" },
        { header: "", key: "subcategory" },
        { header: "", key: "value" },
      ],
      rows: [],
    };

    // Processed
    table.rows.push({
      rowHeader: ["Processed"],
      value: formatDisplayNumber(data.processing_summary.valid_count),
    });

    // Excluded rows
    if (data.processing_summary.missing_group_codes !== undefined) {
      table.rows.push({
        rowHeader: ["Excluded", "Missing or out-of-range group codes"],
        value: formatDisplayNumber(data.processing_summary.missing_group_codes),
      });
    }

    if (data.processing_summary.missing_disc_vars !== undefined) {
      table.rows.push({
        rowHeader: ["", "At least one missing discriminating variable"],
        value: formatDisplayNumber(data.processing_summary.missing_disc_vars),
      });
    }

    // Used in Output
    table.rows.push({
      rowHeader: ["Used in Output"],
      value: formatDisplayNumber(data.processing_summary.valid_count),
    });

    resultJson.tables.push(table);
  }

  // 3. Group Statistics
  if (data.group_statistics) {
    const table: Table = {
      key: "group_statistics",
      title: "Group Statistics",
      columnHeaders: [
        { header: "category", key: "category" },
        { header: "", key: "var" },
        { header: "Mean", key: "mean" },
        { header: "Std. Deviation", key: "std_deviation" },
        {
          header: "Valid N (listwise)",
          key: "valid_n",
          children: [
            { header: "Unweighted", key: "unweighted" },
            { header: "Weighted", key: "weighted" },
          ],
        },
      ],
      rows: [],
    };

    // Process each group
    data.group_statistics.groups.forEach(
      (group: string, groupIndex: number) => {
        // Process each variable's mean for this group
        data.group_statistics.means.forEach((meanEntry: any) => {
          const variableName = meanEntry.variable;

          // Find the corresponding std deviation entry
          const stdDevEntry = data.group_statistics.std_deviations.find(
            (entry: any) => entry.variable === variableName,
          );

          // Find the corresponding unweighted_n entry
          const unweightedNEntry = data.group_statistics.unweighted_n?.find(
            (entry: any) => entry.variable === variableName,
          );

          // Find the corresponding weighted_n entry
          const weightedNEntry = data.group_statistics.weighted_n?.find(
            (entry: any) => entry.variable === variableName,
          );

          if (stdDevEntry) {
            table.rows.push({
              rowHeader: [group, variableName],
              mean: formatDisplayNumber(meanEntry.values[groupIndex]),
              std_deviation: formatDisplayNumber(
                stdDevEntry.values[groupIndex],
              ),
              unweighted: unweightedNEntry
                ? formatDisplayNumber(unweightedNEntry.values[groupIndex])
                : "Invalid",
              weighted: weightedNEntry
                ? formatDisplayNumber(weightedNEntry.values[groupIndex])
                : "Invalid",
            });
          }
        });
      },
    );

    resultJson.tables.push(table);
  }

  // 4. Tests of Equality of Group Means
  if (data.equality_tests) {
    const table: Table = {
      key: "equality_tests",
      title: "Tests of Equality of Group Means",
      columnHeaders: [
        { header: "", key: "var" },
        { header: "Wilks' Lambda", key: "wilks_lambda" },
        { header: "F", key: "f" },
        { header: "df1", key: "df1" },
        { header: "df2", key: "df2" },
        { header: "Sig.", key: "sig" },
      ],
      rows: [],
    };

    // Iterate through variables
    for (let i = 0; i < data.equality_tests.variables.length; i++) {
      table.rows.push({
        rowHeader: [data.equality_tests.variables[i]],
        wilks_lambda: formatDisplayNumber(data.equality_tests.wilks_lambda[i]),
        f: formatDisplayNumber(data.equality_tests.f_values[i]),
        df1: formatDisplayNumber(data.equality_tests.df1[i]),
        df2: formatDisplayNumber(data.equality_tests.df2[i]),
        sig: formatDisplayNumber(data.equality_tests.significance[i]),
      });
    }

    resultJson.tables.push(table);
  }

  // 5a. Pooled Within-Groups Covariance Matrix
  if (data.pooled_matrices) {
    const table: Table = {
      key: "pooled_covariance_matrix",
      title: "Pooled Within-Groups Covariance Matrix",
      columnHeaders: [
        { header: "", key: "var" },
        ...data.pooled_matrices.variables.map(
          (variable: string, index: number) => ({
            header: variable,
            key: `var_${index}`,
          }),
        ),
      ],
      rows: [],
    };

    for (let i = 0; i < data.pooled_matrices.variables.length; i++) {
      const entry = data.pooled_matrices.covariance[i];
      const rowData: any = {
        rowHeader: [entry.variable],
      };

      for (let j = 0; j < entry.values.length; j++) {
        rowData[`var_${j}`] = formatDisplayNumber(entry.values[j].value);
      }

      table.rows.push(rowData);
    }

    resultJson.tables.push(table);
  }

  // 5b. Pooled Within-Groups Correlation Matrix
  if (data.pooled_matrices) {
    const table: Table = {
      key: "pooled_correlation_matrix",
      title: "Pooled Within-Groups Correlation Matrix",
      columnHeaders: [
        { header: "", key: "var" },
        ...data.pooled_matrices.variables.map(
          (variable: string, index: number) => ({
            header: variable,
            key: `var_${index}`,
          }),
        ),
      ],
      rows: [],
    };

    for (let i = 0; i < data.pooled_matrices.variables.length; i++) {
      const entry = data.pooled_matrices.correlation[i];
      const rowData: any = {
        rowHeader: [entry.variable],
      };

      for (let j = 0; j < entry.values.length; j++) {
        rowData[`var_${j}`] = formatDisplayNumber(entry.values[j].value);
      }

      table.rows.push(rowData);
    }

    resultJson.tables.push(table);
  }

  // 6. Covariance Matrices
  if (data.covariance_matrices) {
    const table: Table = {
      key: "covariance_matrices",
      title: "Covariance Matrices",
      columnHeaders: [
        { header: "category", key: "category" },
        { header: "", key: "var" },
        ...data.covariance_matrices.variables.map(
          (variable: string, index: number) => ({
            header: variable,
            key: `var_${index}`,
          }),
        ),
      ],
      rows: [],
    };

    // Iterate through groups and their matrices
    for (let g = 0; g < data.covariance_matrices.matrices.length; g++) {
      const groupEntry = data.covariance_matrices.matrices[g];

      // For each variable in the group's matrix
      for (let v = 0; v < groupEntry.matrix.length; v++) {
        const entry = groupEntry.matrix[v];

        const rowData: any = {
          rowHeader: [groupEntry.group, entry.variable],
        };

        // For each value in the variable's row
        for (let i = 0; i < entry.values.length; i++) {
          rowData[`var_${i}`] = formatDisplayNumber(entry.values[i].value);
        }

        table.rows.push(rowData);
      }
    }

    // Add footnote based on actual degrees of freedom (from Rust note_df)
    table.rows.push({
      rowHeader: [
        data.covariance_matrices.note_df ??
          "a. The total covariance matrix has N-1 degrees of freedom.",
      ],
    });

    resultJson.tables.push(table);
  }

  // 7. Log Determinants
  if (data.log_determinants) {
    const table: Table = {
      key: "log_determinants",
      title: "Log Determinants",
      columnHeaders: [
        { header: "category", key: "category" },
        { header: "Rank", key: "rank" },
        { header: "Log Determinant", key: "log_determinant" },
      ],
      rows: [],
    };

    // Group log determinants
    for (let i = 0; i < data.log_determinants.groups.length; i++) {
      table.rows.push({
        rowHeader: [data.log_determinants.groups[i]],
        rank: formatDisplayNumber(data.log_determinants.ranks[i]),
        log_determinant: formatDisplayNumber(
          data.log_determinants.log_determinants[i],
        ),
      });
    }

    // Pooled within-groups
    table.rows.push({
      rowHeader: ["Pooled within-groups"],
      rank: formatDisplayNumber(data.log_determinants.rank_pooled),
      log_determinant: formatDisplayNumber(
        data.log_determinants.pooled_log_determinant,
      ),
    });

    // Add footnote
    table.rows.push({
      rowHeader: [
        "The ranks and natural logarithms of determinants printed are those of the group covariance matrices.",
      ],
    });

    resultJson.tables.push(table);
  }

  // 8. Box's M Test Results
  if (data.box_m_test) {
    const table: Table = {
      key: "box_m_test",
      title: "Test Results",
      columnHeaders: [
        { header: "", key: "test" },
        { header: "" },
        { header: "", key: "value" },
      ],
      rows: [
        {
          rowHeader: ["Box's M"],
          value: formatDisplayNumber(data.box_m_test.box_m),
        },
        {
          rowHeader: ["F", "Approx."],
          value: formatDisplayNumber(data.box_m_test.f_approx),
        },
        {
          rowHeader: ["", "df1"],
          value: formatDisplayNumber(data.box_m_test.df1),
        },
        {
          rowHeader: ["", "df2"],
          value: formatDisplayNumber(data.box_m_test.df2),
        },
        {
          rowHeader: ["", "Sig."],
          value: formatDisplayNumber(data.box_m_test.p_value),
        },
        {
          rowHeader: [
            "Tests null hypothesis of equal population covariance matrices.",
          ],
        },
      ],
    };

    // Interpretation (homogeneity-of-covariance assumption), surfaced as the
    // section Description by store.ts.
    const boxMp = data.box_m_test.p_value;
    (table as Table & { footer?: string }).footer =
      typeof boxMp === "number" && boxMp < 0.05
        ? "Not met: Box's M is significant (p < 0.05), so the group covariance matrices are not equal. Consider separate-covariance (quadratic) classification."
        : "Met: Box's M is not significant (p ≥ 0.05), so equal group covariance matrices can be assumed.";

    resultJson.tables.push(table);
  }

  // 9. Prior Probabilities for Groups
  if (data.prior_probabilities) {
    const table: Table = {
      key: "prior_probabilities",
      title: "Prior Probabilities for Groups",
      columnHeaders: [
        { header: "Group", key: "group" },
        { header: "Prior", key: "prior" },
        {
          header: "Cases Used in Analysis",
          key: "cases_used",
          children: [
            { header: "Unweighted", key: "unweighted" },
            { header: "Weighted", key: "weighted" },
          ],
        },
      ],
      rows: [],
    };

    // Group prior probabilities
    for (let i = 0; i < data.prior_probabilities.groups.length; i++) {
      const unweightedData = data.prior_probabilities.cases_used.find(
        (c: any) => c.case_type === "Unweighted",
      );

      const weightedData = data.prior_probabilities.cases_used.find(
        (c: any) => c.case_type === "Weighted",
      );

      const unweightedCount = unweightedData ? unweightedData.counts[i] : 0;
      const weightedCount = weightedData ? weightedData.counts[i] : 0;

      table.rows.push({
        rowHeader: [data.prior_probabilities.groups[i].toString()],
        prior: formatDisplayNumber(
          data.prior_probabilities.prior_probabilities[i],
        ),
        unweighted: formatDisplayNumber(unweightedCount),
        weighted: formatDisplayNumber(weightedCount),
      });
    }

    // Total row
    const totalUnweighted =
      data.prior_probabilities.cases_used
        .find((c: any) => c.case_type === "Unweighted")
        ?.counts.reduce((sum: number, val: number) => sum + val, 0) || 0;

    const totalWeighted =
      data.prior_probabilities.cases_used
        .find((c: any) => c.case_type === "Weighted")
        ?.counts.reduce((sum: number, val: number) => sum + val, 0) || 0;

    table.rows.push({
      rowHeader: ["Total"],
      // Priors always sum to 1; the count columns sum to the total N.
      prior: formatDisplayNumber(
        data.prior_probabilities.prior_probabilities.reduce(
          (sum: number, val: number) => sum + val,
          0,
        ),
      ),
      unweighted: formatDisplayNumber(totalUnweighted),
      weighted: formatDisplayNumber(totalWeighted),
    });

    resultJson.tables.push(table);
  }

  // 10. Classification Function Coefficients
  if (data.classification_function_coefficients) {
    const table: Table = {
      key: "classification_function_coefficients",
      title: "Classification Function Coefficients",
      columnHeaders: [
        { header: "", key: "var" },
        ...data.classification_function_coefficients.groups.map(
          (group: number) => ({
            header: group.toString(),
            key: `group_${group}`,
          }),
        ),
      ],
      rows: [],
    };

    // Variable coefficients
    for (
      let v = 0;
      v < data.classification_function_coefficients.variables.length;
      v++
    ) {
      const variable = data.classification_function_coefficients.variables[v];
      const rowData: any = {
        rowHeader: [variable],
      };

      const coeff = data.classification_function_coefficients.coefficients.find(
        (c: any) => c.variable === variable,
      );

      if (coeff) {
        for (
          let g = 0;
          g < data.classification_function_coefficients.groups.length;
          g++
        ) {
          const group = data.classification_function_coefficients.groups[g];
          rowData[`group_${group}`] = formatDisplayNumber(coeff.values[g]);
        }
      }

      table.rows.push(rowData);
    }

    // Constant terms
    const constantRow: any = {
      rowHeader: ["(Constant)"],
    };

    for (
      let g = 0;
      g < data.classification_function_coefficients.groups.length;
      g++
    ) {
      const group = data.classification_function_coefficients.groups[g];
      constantRow[`group_${group}`] = formatDisplayNumber(
        data.classification_function_coefficients.constant_terms[g],
      );
    }

    table.rows.push(constantRow);

    // Add footnote
    table.rows.push({
      rowHeader: ["Fisher's linear discriminant functions"],
    });

    resultJson.tables.push(table);
  }

  // 11. Canonical Discriminant Function Coefficients
  if (data.canonical_functions?.coefficients) {
    // Get the number of functions from the first coefficient's values length
    const numFunctions =
      data.canonical_functions.coefficients.length > 0
        ? data.canonical_functions.coefficients[0].values.length
        : 0;

    if (numFunctions > 0) {
      // Create column headers dynamically based on number of functions
      const functionChildren = [];
      for (let i = 1; i <= numFunctions; i++) {
        functionChildren.push({
          header: i.toString(),
          key: `function_${i}`,
        });
      }

      const table: Table = {
        key: "canonical_discriminant_function_coefficients",
        title: "Canonical Discriminant Function Coefficients",
        columnHeaders: [
          { header: "", key: "var" },
          {
            header: "Function",
            key: "function",
            children: functionChildren,
          },
        ],
        rows: [],
      };

      // Variable coefficients
      for (let i = 0; i < data.canonical_functions.coefficients.length; i++) {
        const coeff = data.canonical_functions.coefficients[i];
        const rowData: any = {
          rowHeader: [coeff.variable],
        };

        // Add each function value dynamically
        for (let j = 0; j < numFunctions; j++) {
          rowData[`function_${j + 1}`] = formatDisplayNumber(coeff.values[j]);
        }

        table.rows.push(rowData);
      }

      // Add footnote
      table.rows.push({
        rowHeader: ["Unstandardized coefficients"],
      });

      resultJson.tables.push(table);
    }
  }

  // 12. Standardized Canonical Discriminant Function Coefficients
  if (
    data.canonical_functions?.standardized_coefficients &&
    data.canonical_functions.standardized_coefficients.length > 0
  ) {
    // Get the number of functions from the first coefficient's values length
    const numFunctions =
      data.canonical_functions.standardized_coefficients[0].values.length;

    // Create column headers dynamically based on number of functions
    const functionChildren = [];
    for (let i = 1; i <= numFunctions; i++) {
      functionChildren.push({
        header: i.toString(),
        key: `function_${i}`,
      });
    }

    const table: Table = {
      key: "standardized_coefficients",
      title: "Standardized Canonical Discriminant Function Coefficients",
      columnHeaders: [
        { header: "", key: "var" },
        {
          header: "Function",
          key: "function",
          children: functionChildren,
        },
      ],
      rows: [],
    };

    // Iterate through variables and their coefficients
    for (
      let i = 0;
      i < data.canonical_functions.standardized_coefficients.length;
      i++
    ) {
      const coeff = data.canonical_functions.standardized_coefficients[i];
      const rowData: any = {
        rowHeader: [coeff.variable],
      };

      // Add each function value dynamically
      for (let j = 0; j < numFunctions; j++) {
        rowData[`function_${j + 1}`] = formatDisplayNumber(coeff.values[j]);
      }

      table.rows.push(rowData);
    }

    resultJson.tables.push(table);
  }

  // 13. Functions at Group Centroids
  if (
    data.canonical_functions?.function_at_centroids &&
    data.canonical_functions.function_at_centroids.length > 0
  ) {
    // Get the number of functions from the first centroid's values length
    const numFunctions =
      data.canonical_functions.function_at_centroids[0].values.length;

    // Create column headers dynamically based on number of functions
    const functionChildren = [];
    for (let i = 1; i <= numFunctions; i++) {
      functionChildren.push({
        header: i.toString(),
        key: `function_${i}`,
      });
    }

    const table: Table = {
      key: "functions_at_group_centroids",
      title: "Functions at Group Centroids",
      columnHeaders: [
        { header: "Group", key: "group" },
        {
          header: "Function",
          key: "function",
          children: functionChildren,
        },
      ],
      rows: [],
    };

    // Group centroids
    for (
      let i = 0;
      i < data.canonical_functions.function_at_centroids.length;
      i++
    ) {
      const centroid = data.canonical_functions.function_at_centroids[i];
      const rowData: any = {
        rowHeader: [centroid.group],
      };

      // Add each function value dynamically
      for (let j = 0; j < numFunctions; j++) {
        rowData[`function_${j + 1}`] = formatDisplayNumber(centroid.values[j]);
      }

      table.rows.push(rowData);
    }

    // Add footnote
    table.rows.push({
      rowHeader: [
        "Unstandardized canonical discriminant functions evaluated at group means",
      ],
    });

    resultJson.tables.push(table);
  }

  // 14. Structure Matrix
  // converter.rs transforms HashMap to Vec<FunctionValue> where each entry has .variable and .values
  if (
    data.structure_matrix?.correlations &&
    data.structure_matrix.correlations.length > 0
  ) {
    const numFunctions = data.structure_matrix.correlations[0].values.length;

    const functionChildren = [];
    for (let i = 1; i <= numFunctions; i++) {
      functionChildren.push({
        header: i.toString(),
        key: `function_${i}`,
      });
    }

    const table: Table = {
      key: "structure_matrix",
      title: "Structure Matrix",
      columnHeaders: [
        { header: "", key: "var" },
        {
          header: "Function",
          key: "function",
          children: functionChildren,
        },
      ],
      rows: [],
    };

    // Iterate through variables (correlations is array of {variable, values})
    for (let i = 0; i < data.structure_matrix.correlations.length; i++) {
      const corr = data.structure_matrix.correlations[i];
      const rowData: any = {
        rowHeader: [corr.variable],
      };

      // Find the largest absolute correlation value for this variable
      let maxAbsValueIndex = 0;
      let maxAbsValue = Math.abs(corr.values[0]);

      for (let j = 1; j < numFunctions; j++) {
        if (Math.abs(corr.values[j]) > maxAbsValue) {
          maxAbsValue = Math.abs(corr.values[j]);
          maxAbsValueIndex = j;
        }
      }

      // Add each function value dynamically, marking the largest with superscript
      for (let j = 0; j < numFunctions; j++) {
        rowData[`function_${j + 1}`] =
          formatDisplayNumber(corr.values[j]) +
          (j === maxAbsValueIndex ? "ᵃ" : "");
      }

      table.rows.push(rowData);
    }

    // Add footnotes
    table.rows.push({
      rowHeader: [
        "Pooled within-groups correlations between discriminating variables and standardized canonical discriminant functions",
      ],
    });
    table.rows.push({
      rowHeader: [
        "Variables ordered by absolute size of correlation within function.",
      ],
    });
    table.rows.push({
      rowHeader: [
        "a. Largest absolute correlation between each variable and any discriminant function",
      ],
    });

    resultJson.tables.push(table);
  }

  // ==========================================
  // ROBUST METHOD DETECTION
  // ==========================================
  console.log(
    "[DEBUG] Full stepwise_statistics keys:",
    data.stepwise_statistics
      ? Object.keys(data.stepwise_statistics)
      : "TIDAK ADA",
  );
  console.log("[DEBUG] change_in_v:", data.stepwise_statistics?.change_in_v);
  console.log("[DEBUG] method field:", data.stepwise_statistics?.method);
  console.log(
    "[DEBUG] isRaosVMethod akan jadi:",
    Array.isArray(data.stepwise_statistics?.change_in_v) &&
      data.stepwise_statistics?.change_in_v.length > 0,
  );
  let isMahalanobis = false;
  let isRaosVMethod = false;
  // Detected via the explicit method field emitted by Rust.
  const isFRatio = data.stepwise_statistics?.method === "f_ratio";
  const isUnexplained = data.stepwise_statistics?.method === "unexplained";

  if (data.stepwise_statistics) {
    // 1. Rao's V — detected via the explicit method field from Rust
    isRaosVMethod = data.stepwise_statistics.method === "raos_v";

    // 2. Mahalanobis — ada min_d_squared > 0, dan bukan Rao's V / F-ratio / Unexplained
    if (!isRaosVMethod && !isFRatio && !isUnexplained) {
      const notInAnalysis = data.stepwise_statistics.variables_not_in_analysis;
      if (Array.isArray(notInAnalysis) && notInAnalysis.length > 0) {
        isMahalanobis = notInAnalysis.some(
          (step: any) =>
            Array.isArray(step.variables) &&
            step.variables.some(
              (v: any) => v.min_d_squared !== undefined && v.min_d_squared > 0,
            ),
        );
      }
    }
  }

  // Helper: back-calculate actual Rao's V from the proxy Wilks' lambda stored in VariableInAnalysis
  // proxy = 1 / (1 + v/n)  =>  v = n * (1/proxy - 1)
  const _raosN = data.processing_summary?.valid_count ?? 1;
  const raosVFromProxy = (proxy: number) =>
    proxy > 0 && proxy < 1 ? _raosN * (1 / proxy - 1) : 0;

  // 15. Stepwise Statistics
  if (data.stepwise_statistics?.variables_entered) {
    const columnHeaders = isRaosVMethod
      ? [
          { header: "", key: "step_header" },
          { header: "Step", key: "step" },
          { header: "Entered", key: "entered" },
          {
            header: "Rao's V",
            key: "raos_v",
            children: [
              { header: "Statistic", key: "raos_v_statistic" },
              { header: "df", key: "raos_v_df" },
              { header: "Approx. Sig.", key: "raos_v_sig" },
            ],
          },
          {
            header: "Change in V",
            key: "change_in_v",
            children: [
              { header: "Statistic", key: "change_statistic" },
              { header: "Sig.", key: "change_sig" },
            ],
          },
        ]
      : isFRatio
        ? [
            { header: "", key: "step_header" },
            { header: "Step", key: "step" },
            { header: "Entered", key: "entered" },
            { header: "Removed", key: "removed" },
            {
              header: "Min. F",
              key: "min_f",
              children: [
                { header: "Statistic", key: "f_statistic" },
                { header: "df1", key: "f_df1" },
                { header: "df2", key: "f_df2" },
                { header: "Sig.", key: "sig" },
                { header: "Between Groups", key: "between_groups" },
              ],
            },
          ]
      : isUnexplained
        ? [
            { header: "", key: "step_header" },
            { header: "Step", key: "step" },
            { header: "Entered", key: "entered" },
            { header: "Removed", key: "removed" },
            { header: "Residual Variance", key: "residual_variance" },
          ]
      : isMahalanobis
        ? [
            { header: "", key: "step_header" },
            { header: "Step", key: "step" },
            { header: "Entered", key: "entered" },
            { header: "Removed", key: "removed" },
            {
              header: "Min. D Squared",
              key: "min_d_squared",
              children: [
                { header: "Statistic", key: "d_statistic" },
                { header: "Between Groups", key: "between_groups" },
              ],
            },
            {
              header: "Exact F",
              key: "exact_f",
              children: [
                { header: "Statistic", key: "f_statistic" },
                { header: "df1", key: "f_df1" },
                { header: "df2", key: "f_df2" },
                { header: "Sig.", key: "sig" },
              ],
            },
          ]
        : [
            { header: "", key: "step_header" },
            { header: "Step", key: "step" },
            { header: "Entered", key: "entered" },
            { header: "Removed", key: "removed" },
            {
              header: "Wilks' Lambda",
              key: "wilks_lambda",
              children: [
                { header: "Statistic", key: "lambda_statistic" },
                { header: "df1", key: "lambda_df1" },
                { header: "df2", key: "lambda_df2" },
                { header: "df3", key: "lambda_df3" },
              ],
            },
            {
              header: "Exact F",
              key: "exact_f",
              children: [
                { header: "Statistic", key: "exact_f_statistic" },
                { header: "df1", key: "exact_f_df1" },
                { header: "df2", key: "exact_f_df2" },
                { header: "Sig.", key: "exact_f_sig" },
              ],
            },
          ];

    const table: Table = {
      key: "stepwise_statistics",
      title: "Variables Entered/Removed",
      columnHeaders,
      rows: [],
    };

    const stepsCount = data.stepwise_statistics.variables_entered.length;
    // Use num_groups from Rust output (authoritative k from dataset.num_groups)
    const numGroups = data.stepwise_statistics.num_groups ?? data.group_statistics?.groups?.length ?? 3;
    const raosVdf = numGroups - 1;
    const wilksN = data.processing_summary?.valid_count ?? 0;

    let wilksNumVars = 0;
    for (let i = 0; i < stepsCount; i++) {
      const stepNum = i + 1;

      if (isRaosVMethod) {
        table.rows.push({
          rowHeader: [""],
          step: formatDisplayNumber(stepNum),
          entered: data.stepwise_statistics.variables_entered[i] || "",
          raos_v_statistic: formatDisplayNumber(
            data.stepwise_statistics.raos_v?.[i] ?? 0,
          ),
          raos_v_df: formatDisplayNumber(raosVdf * stepNum),
          raos_v_sig: formatDisplayNumber(
            data.stepwise_statistics.raos_v_sig?.[i] ?? 1,
          ),
          change_statistic: formatDisplayNumber(
            data.stepwise_statistics.change_in_v?.[i] ?? 0,
          ),
          change_sig: formatDisplayNumber(
            data.stepwise_statistics.change_sig?.[i] ?? 1,
          ),
        });
      } else if (isFRatio) {
        table.rows.push({
          rowHeader: [""],
          step: formatDisplayNumber(stepNum),
          entered: data.stepwise_statistics.variables_entered[i] || "",
          removed: data.stepwise_statistics.variables_removed[i]
            ? data.stepwise_statistics.variables_removed[i]
            : "",
          f_statistic: formatDisplayNumber(
            data.stepwise_statistics.min_d_squared?.[i] ?? 0,
          ),
          f_df1: formatDisplayNumber(
            data.stepwise_statistics.f_to_enter_df1?.[i] ?? 0,
          ),
          f_df2: formatDisplayNumber(
            data.stepwise_statistics.f_to_enter_df2?.[i] ?? 0,
          ),
          sig: formatDisplayNumber(
            data.stepwise_statistics.significance?.[i] ?? 1,
          ),
          between_groups: data.stepwise_statistics.between_groups?.[i] ?? "",
        });
      } else if (isUnexplained) {
        table.rows.push({
          rowHeader: [""],
          step: formatDisplayNumber(stepNum),
          entered: data.stepwise_statistics.variables_entered[i] || "",
          removed: data.stepwise_statistics.variables_removed[i]
            ? data.stepwise_statistics.variables_removed[i]
            : "",
          residual_variance: formatDisplayNumber(
            data.stepwise_statistics.min_d_squared?.[i] ?? 0,
          ),
        });
      } else if (isMahalanobis) {
        table.rows.push({
          rowHeader: [""],
          step: formatDisplayNumber(stepNum),
          entered: data.stepwise_statistics.variables_entered[i] || "",
          removed: data.stepwise_statistics.variables_removed[i]
            ? data.stepwise_statistics.variables_removed[i]
            : "",
          d_statistic: formatDisplayNumber(
            data.stepwise_statistics.min_d_squared?.[i] ?? 0,
          ),
          between_groups: data.stepwise_statistics.between_groups?.[i] ?? "",
          f_statistic: formatDisplayNumber(
            data.stepwise_statistics.f_to_enter?.[i] ?? 0,
          ),
          f_df1: formatDisplayNumber(
            data.stepwise_statistics.f_to_enter_df1?.[i] ?? 0,
          ),
          f_df2: formatDisplayNumber(
            data.stepwise_statistics.f_to_enter_df2?.[i] ?? 0,
          ),
          sig: formatDisplayNumber(
            data.stepwise_statistics.significance?.[i] ?? 1,
          ),
        });
      } else {
        if (data.stepwise_statistics.variables_entered[i]) wilksNumVars++;
        if (data.stepwise_statistics.variables_removed?.[i]) wilksNumVars--;
        table.rows.push({
          rowHeader: [""],
          step: formatDisplayNumber(stepNum),
          entered: data.stepwise_statistics.variables_entered[i] || "",
          removed: data.stepwise_statistics.variables_removed[i]
            ? data.stepwise_statistics.variables_removed[i]
            : "",
          lambda_statistic: formatDisplayNumber(
            data.stepwise_statistics.wilks_lambda?.[i] ?? 1,
          ),
          lambda_df1: formatDisplayNumber(wilksNumVars),
          lambda_df2: formatDisplayNumber(numGroups - 1),
          lambda_df3: formatDisplayNumber(wilksN - numGroups),
          exact_f_statistic: formatDisplayNumber(
            data.stepwise_statistics.wilks_exact_f?.[i] ?? 0,
          ),
          exact_f_df1: formatDisplayNumber(
            data.stepwise_statistics.wilks_exact_df1?.[i] ?? 0,
          ),
          exact_f_df2: formatDisplayNumber(
            data.stepwise_statistics.wilks_exact_df2?.[i] ?? 0,
          ),
          exact_f_sig: formatDisplayNumber(
            data.stepwise_statistics.wilks_exact_sig?.[i] ?? 1,
          ),
        });
      }
    }

    if (isRaosVMethod) {
      table.rows.push({
        rowHeader: [
          "At each step, the variable that produces the largest increase in Rao's V is entered.",
        ],
      });
      table.rows.push({ rowHeader: ["a. Maximum number of steps is 18."] });
      table.rows.push({
        rowHeader: ["b. Minimum partial F to enter is 3.84."],
      });
      table.rows.push({
        rowHeader: ["c. Maximum partial F to remove is 2.71."],
      });
      table.rows.push({ rowHeader: ["d. Minimum Rao's V to enter is 1."] });
      table.rows.push({
        rowHeader: [
          "e. F level, tolerance, or VIN insufficient for further computation.",
        ],
      });
    } else if (isFRatio) {
      table.rows.push({
        rowHeader: [
          "At each step, the variable that maximizes the smallest F ratio between pairs of groups is entered.",
        ],
      });
      table.rows.push({ rowHeader: ["a. Maximum number of steps is 18."] });
      table.rows.push({
        rowHeader: ["b. Minimum partial F to enter is 3.84."],
      });
      table.rows.push({
        rowHeader: ["c. Maximum partial F to remove is 2.71."],
      });
      table.rows.push({
        rowHeader: [
          "d. F level, tolerance, or VIN insufficient for further computation.",
        ],
      });
    } else if (isUnexplained) {
      table.rows.push({
        rowHeader: [
          "At each step, the variable that minimizes the sum of the unexplained variation for all pairs of groups is entered.",
        ],
      });
      table.rows.push({ rowHeader: ["a. Maximum number of steps is 18."] });
      table.rows.push({
        rowHeader: ["b. Minimum partial F to enter is 3.84."],
      });
      table.rows.push({
        rowHeader: ["c. Maximum partial F to remove is 2.71."],
      });
      table.rows.push({
        rowHeader: [
          "d. F level, tolerance, or VIN insufficient for further computation.",
        ],
      });
    } else if (isMahalanobis) {
      table.rows.push({
        rowHeader: [
          "At each step, the variable that maximizes the Mahalanobis distance between the two closest groups is entered.",
        ],
      });
      table.rows.push({ rowHeader: ["a. Maximum number of steps is 18."] });
      table.rows.push({
        rowHeader: ["b. Minimum partial F to enter is 3.84."],
      });
      table.rows.push({
        rowHeader: ["c. Maximum partial F to remove is 2.71."],
      });
      table.rows.push({
        rowHeader: [
          "d. F level, tolerance, or VIN insufficient for further computation.",
        ],
      });
    } else {
      table.rows.push({
        rowHeader: [
          "At each step, the variable that minimizes the overall Wilks' Lambda is entered.",
        ],
      });
      table.rows.push({ rowHeader: ["a. Maximum number of steps is 18."] });
      table.rows.push({
        rowHeader: ["b. Minimum partial F to enter is 3.84."],
      });
      table.rows.push({
        rowHeader: ["c. Maximum partial F to remove is 2.71."],
      });
      table.rows.push({
        rowHeader: [
          "d. F level, tolerance, or VIN insufficient for further computation.",
        ],
      });
    }

    resultJson.tables.push(table);

    // Stepwise Wilks' Lambda — per-step model table (SPSS "Wilks' Lambda" in stepwise output).
    // Placed inside the same `if` block so it always renders when the stepwise table renders.
    {
      const swTable: Table = {
        key: "stepwise_wilks_lambda",
        title: "Wilks' Lambda",
        columnHeaders: [
          { header: "Step", key: "sw_step" },
          { header: "Number of Variables", key: "num_vars" },
          {
            header: "Lambda",
            key: "lambda_group",
            children: [
              { header: "Statistic", key: "lambda" },
              { header: "df1", key: "lambda_df1" },
              { header: "df2", key: "lambda_df2" },
              { header: "df3", key: "lambda_df3" },
            ],
          },
          {
            header: "Exact F",
            key: "exact_f_group",
            children: [
              { header: "Statistic", key: "f_stat" },
              { header: "df1", key: "f_df1" },
              { header: "df2", key: "f_df2" },
              { header: "Sig.", key: "f_sig" },
            ],
          },
        ],
        rows: [],
      };

      const swEntries: string[] = Array.isArray(
        data.stepwise_statistics.variables_entered,
      )
        ? data.stepwise_statistics.variables_entered
        : [];
      const swStepsCount = swEntries.length;

      const swNumGroups: number =
        data.stepwise_statistics.num_groups ??
        data.group_statistics?.groups?.length ??
        3;
      const swN: number = data.processing_summary?.valid_count ?? 0;
      const lambdaDf2 = swNumGroups - 1;
      const lambdaDf3 = swN - swNumGroups;

      const swWilks: number[] = Array.isArray(
        data.stepwise_statistics.wilks_lambda,
      )
        ? data.stepwise_statistics.wilks_lambda
        : [];
      // Use the model's exact Wilks F (Rao approx), which is correct for every
      // method — NOT f_to_enter, which holds the method-specific statistic
      // (Min F / closest-pair F) for Smallest-F and Mahalanobis.
      const swF: number[] = Array.isArray(data.stepwise_statistics.wilks_exact_f)
        ? data.stepwise_statistics.wilks_exact_f
        : [];
      const swFdf1: number[] = Array.isArray(
        data.stepwise_statistics.wilks_exact_df1,
      )
        ? data.stepwise_statistics.wilks_exact_df1
        : [];
      const swFdf2: number[] = Array.isArray(
        data.stepwise_statistics.wilks_exact_df2,
      )
        ? data.stepwise_statistics.wilks_exact_df2
        : [];
      const swSig: number[] = Array.isArray(data.stepwise_statistics.wilks_exact_sig)
        ? data.stepwise_statistics.wilks_exact_sig
        : [];
      const swRemoved: any[] = Array.isArray(
        data.stepwise_statistics.variables_removed,
      )
        ? data.stepwise_statistics.variables_removed
        : [];

      let numVarsInModel = 0;
      for (let i = 0; i < swStepsCount; i++) {
        if (swEntries[i]) numVarsInModel++;
        if (swRemoved[i]) numVarsInModel--;

        swTable.rows.push({
          rowHeader: [String(i + 1)],
          sw_step: String(i + 1),
          num_vars: formatDisplayNumber(numVarsInModel),
          lambda: formatDisplayNumber(swWilks[i] ?? 1),
          lambda_df1: formatDisplayNumber(numVarsInModel),
          lambda_df2: formatDisplayNumber(lambdaDf2),
          lambda_df3: formatDisplayNumber(lambdaDf3),
          f_stat: formatDisplayNumber(swF[i] ?? 0),
          f_df1: formatDisplayNumber(swFdf1[i] ?? 0),
          f_df2: formatDisplayNumber(swFdf2[i] ?? 0),
          f_sig: formatDisplayNumber(swSig[i] ?? 1),
        });
      }

      if (swTable.rows.length > 0) {
        resultJson.tables.push(swTable);
      }
    }
  }

  // 16. Variables in the Analysis
  if (data.stepwise_statistics?.variables_in_analysis) {
    const columnHeaders = isRaosVMethod
      ? [
          { header: "Step", key: "step" },
          { header: "", key: "var" },
          { header: "Tolerance", key: "tolerance" },
          { header: "Min. Tolerance", key: "min_tolerance" },
          { header: "F to Remove", key: "f_to_remove" },
          { header: "Rao's V", key: "raos_v" },
        ]
      : isFRatio
        ? [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "F to Remove", key: "f_to_remove" },
            { header: "Min. F", key: "min_f" },
            { header: "Between Groups", key: "between_groups" },
          ]
      : isUnexplained
        ? [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "F to Remove", key: "f_to_remove" },
            { header: "Residual Variance", key: "residual_variance" },
          ]
      : isMahalanobis
        ? [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "Min. Tolerance", key: "min_tolerance" },
            { header: "F to Remove", key: "f_to_remove" },
            { header: "Min. D Squared", key: "min_d_squared" },
            { header: "Between Groups", key: "between_groups" },
          ]
        : [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "Min. Tolerance", key: "min_tolerance" },
            { header: "F to Remove", key: "f_to_remove" },
            { header: "Wilks' Lambda", key: "wilks_lambda" },
          ];

    const table: Table = {
      key: "variables_in_analysis",
      title: "Variables in the Analysis",
      columnHeaders,
      rows: [],
    };

    const sortedSteps = [
      ...data.stepwise_statistics.variables_in_analysis,
    ].sort((a: any, b: any) => parseInt(a.step) - parseInt(b.step));

    // SPSS lists the variables within each step in the order they ENTERED the
    // model (Fe2O3, MgO, K2O, …), not most-recently-entered first.
    const entryOrder: string[] = Array.isArray(
      data.stepwise_statistics.variables_entered,
    )
      ? data.stepwise_statistics.variables_entered.filter(Boolean)
      : [];
    const entryRank = (name: string) => {
      const idx = entryOrder.indexOf(name);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    for (let i = 0; i < sortedSteps.length; i++) {
      const stepData = sortedSteps[i];
      const step = stepData.step;

      if (stepData.variables && stepData.variables.length > 0) {
        const stepVars = [...stepData.variables].sort(
          (a: any, b: any) => entryRank(a.variable) - entryRank(b.variable),
        );
        // Residual variance shown is the model WITHOUT this variable. With only
        // one variable in the model, removing it leaves nothing, so SPSS blanks it.
        const modelSize = stepVars.length;
        for (let j = 0; j < stepVars.length; j++) {
          const variable = stepVars[j];

          if (isRaosVMethod) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_remove: formatDisplayNumber(variable.f_to_remove),
              raos_v: formatDisplayNumber(raosVFromProxy(variable.wilks_lambda)),
            });
          } else if (isFRatio) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              f_to_remove: formatDisplayNumber(variable.f_to_remove),
              min_f: formatDisplayNumber(variable.min_d_squared || 0),
              between_groups: variable.between_groups || "",
            });
          } else if (isUnexplained) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              f_to_remove: formatDisplayNumber(variable.f_to_remove),
              residual_variance:
                modelSize <= 1
                  ? ""
                  : formatDisplayNumber(variable.min_d_squared || 0),
            });
          } else if (isMahalanobis) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_remove: formatDisplayNumber(variable.f_to_remove),
              min_d_squared: formatDisplayNumber(variable.min_d_squared || 0),
              between_groups: variable.between_groups || "",
            });
          } else {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_remove: formatDisplayNumber(variable.f_to_remove),
              wilks_lambda: formatDisplayNumber(variable.wilks_lambda),
            });
          }
        }
      }
    }

    resultJson.tables.push(table);
  }

  // 17. Variables Not in the Analysis
  if (data.stepwise_statistics?.variables_not_in_analysis) {
    const columnHeaders = isRaosVMethod
      ? [
          { header: "Step", key: "step" },
          { header: "", key: "var" },
          { header: "Tolerance", key: "tolerance" },
          { header: "Min. Tolerance", key: "min_tolerance" },
          { header: "F to Enter", key: "f_to_enter" },
          { header: "Rao's V", key: "raos_v" },
        ]
      : isFRatio
        ? [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "Min. Tolerance", key: "min_tolerance" },
            { header: "F to Enter", key: "f_to_enter" },
            { header: "Min. F", key: "min_f" },
            { header: "Between Groups", key: "between_groups" },
          ]
      : isUnexplained
        ? [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "Min. Tolerance", key: "min_tolerance" },
            { header: "F to Enter", key: "f_to_enter" },
            { header: "Residual Variance", key: "residual_variance" },
          ]
      : isMahalanobis
        ? [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "Min. Tolerance", key: "min_tolerance" },
            { header: "F to Enter", key: "f_to_enter" },
            { header: "Min. D Squared", key: "min_d_squared" },
            { header: "Between Groups", key: "between_groups" },
          ]
        : [
            { header: "Step", key: "step" },
            { header: "", key: "var" },
            { header: "Tolerance", key: "tolerance" },
            { header: "Min. Tolerance", key: "min_tolerance" },
            { header: "F to Enter", key: "f_to_enter" },
            { header: "Wilks' Lambda", key: "wilks_lambda" },
          ];

    const table: Table = {
      key: "variables_not_in_analysis",
      title: "Variables Not in the Analysis",
      columnHeaders,
      rows: [],
    };

    const sortedNotInSteps = [
      ...data.stepwise_statistics.variables_not_in_analysis,
    ].sort((a: any, b: any) => parseInt(a.step) - parseInt(b.step));

    // SPSS lists the not-in-analysis variables in the ORIGINAL predictor order
    // (as entered in the Independents list), not by the selection criterion.
    const notInOriginalOrder: string[] =
      (Array.isArray(data.equality_tests?.variables) &&
        data.equality_tests.variables) ||
      (Array.isArray(data.pooled_matrices?.variables) &&
        data.pooled_matrices.variables) ||
      (Array.isArray(data.group_statistics?.means)
        ? data.group_statistics.means.map((m: any) => m.variable)
        : []) ||
      [];
    const notInRank = (name: string) => {
      const idx = notInOriginalOrder.indexOf(name);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    for (let i = 0; i < sortedNotInSteps.length; i++) {
      const stepData = sortedNotInSteps[i];
      const step = stepData.step;

      if (stepData.variables && stepData.variables.length > 0) {
        const stepVars =
          notInOriginalOrder.length > 0
            ? [...stepData.variables].sort(
                (a: any, b: any) => notInRank(a.variable) - notInRank(b.variable),
              )
            : stepData.variables;
        for (let j = 0; j < stepVars.length; j++) {
          const variable = stepVars[j];

          if (isRaosVMethod) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_enter: formatDisplayNumber(variable.f_to_enter),
              raos_v: formatDisplayNumber(raosVFromProxy(variable.wilks_lambda)),
            });
          } else if (isFRatio) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_enter: formatDisplayNumber(variable.f_to_enter),
              min_f: formatDisplayNumber(variable.min_d_squared || 0),
              between_groups: variable.between_groups || "",
            });
          } else if (isUnexplained) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_enter: formatDisplayNumber(variable.f_to_enter),
              residual_variance: formatDisplayNumber(variable.min_d_squared || 0),
            });
          } else if (isMahalanobis) {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_enter: formatDisplayNumber(variable.f_to_enter),
              min_d_squared: formatDisplayNumber(variable.min_d_squared || 0),
              between_groups: variable.between_groups || "",
            });
          } else {
            table.rows.push({
              rowHeader: [step, variable.variable],
              tolerance: formatDisplayNumber(variable.tolerance),
              min_tolerance: formatDisplayNumber(
                variable.min_tolerance ?? variable.tolerance,
              ),
              f_to_enter: formatDisplayNumber(variable.f_to_enter),
              wilks_lambda: formatDisplayNumber(variable.wilks_lambda),
            });
          }
        }
      }
    }

    resultJson.tables.push(table);
  }

  // 18. Wilks' Lambda — Summary of Canonical Discriminant Functions
  // (the chi-square test of the discriminant functions). SPSS shows this for
  // both the enter and stepwise methods, under Eigenvalues. It is distinct from
  // the per-step stepwise table rendered above as "stepwise_wilks_lambda".
  if (data.wilks_lambda_test) {
    const testTable: Table = {
      key: "wilks_lambda_test",
      title: "Wilks' Lambda",
      columnHeaders: [
        { header: "Test of Function(s)", key: "test_functions" },
        { header: "Wilks' Lambda", key: "wilks_lambda" },
        { header: "Chi-square", key: "chi_square" },
        { header: "df", key: "df" },
        { header: "Sig.", key: "sig" },
      ],
      rows: [],
    };

    // Iterate through test of functions
    for (let i = 0; i < data.wilks_lambda_test.test_of_functions.length; i++) {
      testTable.rows.push({
        rowHeader: [data.wilks_lambda_test.test_of_functions[i]],
        wilks_lambda: formatDisplayNumber(
          data.wilks_lambda_test.wilks_lambda[i],
        ),
        chi_square: formatDisplayNumber(data.wilks_lambda_test.chi_square[i]),
        df: formatDisplayNumber(data.wilks_lambda_test.df[i]),
        sig: formatDisplayNumber(data.wilks_lambda_test.significance[i]),
      });
    }

    resultJson.tables.push(testTable);
  }

  // 19. Eigenvalues
  if (data.eigen_description) {
    const table: Table = {
      key: "eigenvalues",
      title: "Eigenvalues",
      columnHeaders: [
        { header: "Function", key: "function" },
        { header: "Eigenvalue", key: "eigenvalue" },
        { header: "% of Variance", key: "variance_percent" },
        { header: "Cumulative %", key: "cumulative_percent" },
        {
          header: "Canonical Correlation",
          key: "canonical_correlation",
        },
      ],
      rows: [],
    };

    // Iterate through functions
    for (let i = 0; i < data.eigen_description.functions.length; i++) {
      table.rows.push({
        rowHeader: [data.eigen_description.functions[i]],
        eigenvalue:
          formatDisplayNumber(data.eigen_description.eigenvalue[i]) +
          (i === 0 ? "ᵃ" : ""), // Add superscript for the first function
        variance_percent: formatDisplayNumber(
          data.eigen_description.variance_percentage[i],
        ),
        cumulative_percent: formatDisplayNumber(
          data.eigen_description.cumulative_percentage[i],
        ),
        canonical_correlation: formatDisplayNumber(
          data.eigen_description.canonical_correlation[i],
        ),
      });
    }

    // Add footnote
    table.rows.push({
      rowHeader: [
        "a. First 1 canonical discriminant functions were used in the analysis.",
      ],
    });

    resultJson.tables.push(table);
  }

  // 20. Casewise Statistics
  if (data.casewise_statistics) {
    // Debug: Log what we're receiving from WASM
    console.log("[Casewise] Raw data from WASM:", {
      case_number: data.casewise_statistics.case_number,
      case_number_length: data.casewise_statistics.case_number?.length,
      actual_group: data.casewise_statistics.actual_group,
      predicted_group: data.casewise_statistics.predicted_group,
      discriminant_scores: data.casewise_statistics.discriminant_scores,
      discriminant_scores_type:
        typeof data.casewise_statistics.discriminant_scores,
      discriminant_scores_keys: data.casewise_statistics.discriminant_scores
        ? Array.isArray(data.casewise_statistics.discriminant_scores)
          ? "Array with " +
            data.casewise_statistics.discriminant_scores.length +
            " items"
          : "Object with keys: " +
            Object.keys(data.casewise_statistics.discriminant_scores).join(", ")
        : "null/undefined",
      highest_group: data.casewise_statistics.highest_group,
    });

    // Check if discriminant_scores exists and has entries
    // discriminant_scores from WASM is a Vec<ScoreValue> array with {function, values} entries
    const discriminantScoreEntries = Array.isArray(
      data.casewise_statistics.discriminant_scores,
    )
      ? data.casewise_statistics.discriminant_scores
      : [];

    console.log(
      "[Casewise] Discriminant score entries:",
      discriminantScoreEntries,
    );

    const numFunctions = discriminantScoreEntries.length;

    // Create dynamic function headers - use function name from WASM data
    const functionChildren = [];
    for (let i = 0; i < discriminantScoreEntries.length; i++) {
      functionChildren.push({
        header: discriminantScoreEntries[i].function,
        key: `function_${i + 1}`,
      });
    }

    const table: Table = {
      key: "casewise_statistics",
      title: "Casewise Statistics",
      columnHeaders: [
        { header: "", key: "type" },
        { header: "Case Number", key: "case_number" },
        { header: "Actual Group", key: "actual_group" },
        { header: "Predicted Group", key: "predicted_group" },
        {
          header: "Highest Group",
          key: "highest_group",
          children: [
            // p & df are SPSS's "P(D>d | G=g)".
            { header: "p", key: "p" },
            { header: "df", key: "df" },
            { header: "P(G=g | D=d)", key: "p_d_g" },
            {
              header: "Squared Mahalanobis Distance to Centroid",
              key: "mahalanobis",
            },
            { header: "Group", key: "group" },
          ],
        },
        {
          header: "Second Highest Group",
          key: "second_highest_group",
          children: [
            { header: "P(G=g | D=d)", key: "p_g_d" },
            {
              header: "Squared Mahalanobis Distance to Centroid",
              key: "second_mahalanobis",
            },
            { header: "Group", key: "second_group" },
          ],
        },
        ...(numFunctions > 0
          ? [
              {
                header: "Discriminant Scores",
                key: "discriminant_scores",
                children: functionChildren,
              },
            ]
          : []),
      ],
      rows: [],
    };

    // Process each case (Original classification)
    for (let i = 0; i < data.casewise_statistics.case_number.length; i++) {
      // Check if this is a misclassified case (add asterisk)
      const predictedGroup = data.casewise_statistics.predicted_group[i];
      const actualGroup = data.casewise_statistics.actual_group[i];
      const isMisclassified = predictedGroup !== actualGroup;

      // Discriminant scores: discriminant_scores is a Vec<ScoreValue> array of
      // { function, values }, so read the per-case value from each entry's
      // `values` array (NOT by indexing the entry object itself).
      const scoreData: any = {};
      for (let j = 0; j < discriminantScoreEntries.length; j++) {
        scoreData[`function_${j + 1}`] = formatDisplayNumber(
          discriminantScoreEntries[j].values[i],
        );
      }

      table.rows.push({
        rowHeader: ["Original"],
        case_number: formatDisplayNumber(
          data.casewise_statistics.case_number[i],
        ),
        actual_group: data.casewise_statistics.actual_group[i],
        predicted_group:
          data.casewise_statistics.predicted_group[i] +
          (isMisclassified ? "**" : ""),
        p: formatDisplayNumber(
          data.casewise_statistics.highest_group.p_value[i],
        ),
        df: formatDisplayNumber(data.casewise_statistics.highest_group.df[i]),
        p_d_g: formatDisplayNumber(
          data.casewise_statistics.highest_group.p_g_equals_d[i],
        ),
        mahalanobis: formatDisplayNumber(
          data.casewise_statistics.highest_group.squared_mahalanobis_distance[
            i
          ],
        ),
        group: data.casewise_statistics.highest_group.group[i],
        p_g_d: formatDisplayNumber(
          data.casewise_statistics.second_highest_group.p_value[i],
        ),
        second_mahalanobis: formatDisplayNumber(
          data.casewise_statistics.second_highest_group
            .squared_mahalanobis_distance[i],
        ),
        second_group: data.casewise_statistics.second_highest_group.group[i],
        ...scoreData,
      });
    }

    // ---- CROSS-VALIDATED SECTION ----
    if (data.casewise_statistics.cross_validated) {
      const cvData = data.casewise_statistics.cross_validated;

      // Process each cross-validated case (each row now shows "Cross-validated" in the row header)
      for (let i = 0; i < cvData.case_number.length; i++) {
        const cvPredictedGroup = cvData.predicted_group[i];
        const cvActualGroup = cvData.actual_group[i];
        const isMisclassifiedCV = cvPredictedGroup !== cvActualGroup;

        // Cross-validated has NO discriminant scores (SPSS leaves them blank).
        const scoreDataCV: any = {};
        for (let j = 0; j < discriminantScoreEntries.length; j++) {
          scoreDataCV[`function_${j + 1}`] = "";
        }

        table.rows.push({
          rowHeader: ["Cross-validated"],
          case_number: formatDisplayNumber(cvData.case_number[i]),
          actual_group: cvData.actual_group[i],
          predicted_group:
            cvData.predicted_group[i] + (isMisclassifiedCV ? "**" : ""),
          p: formatDisplayNumber(cvData.highest_group.p_value[i]),
          df: formatDisplayNumber(cvData.highest_group.df[i]),
          p_d_g: formatDisplayNumber(cvData.highest_group.p_g_equals_d[i]),
          mahalanobis: formatDisplayNumber(
            cvData.highest_group.squared_mahalanobis_distance[i],
          ),
          group: cvData.highest_group.group[i],
          p_g_d: formatDisplayNumber(cvData.second_highest_group.p_value[i]),
          second_mahalanobis: formatDisplayNumber(
            cvData.second_highest_group.squared_mahalanobis_distance[i],
          ),
          second_group: cvData.second_highest_group.group[i],
          ...scoreDataCV,
        });
      }
    }

    resultJson.tables.push(table);
  }

  // 21. Classification Results
  if (
    data.classification_results?.original_classification &&
    data.classification_results.original_classification.length > 0
  ) {
    // Get the groups from original classification and sort them to ensure consistent ordering
    const groups = data.classification_results.original_classification
      .map((item: { group: string; counts: number[] }) => item.group)
      .sort((a: string, b: string) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      });

    const table: Table = {
      key: "classification_results",
      title: "Classification Results",
      columnHeaders: [
        // [PERBAIKAN 1]: Kita siapkan 3 kolom kosong di kiri untuk menampung rowHeader
        { header: "", key: "category" },
        { header: "", key: "subcategory" },
        { header: "Group", key: "group_label" },
        {
          header: "Predicted Group Membership",
          key: "predicted_groups",
          children: groups.map((group: string, i: number) => ({
            header: group,
            key: `group_${i}`,
          })),
        },
        { header: "Total", key: "total" },
      ],
      rows: [],
    };

    // --- 1. Original Classification Counts ---
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const classification =
        data.classification_results.original_classification.find(
          (item: { group: string; counts: number[] }) => item.group === group,
        );

      if (!classification) continue;

      const rowData: any = {
        // [PERBAIKAN 2]: Gabungkan 3 kolom kiri menjadi satu array.
        // Trik i === 0 akan mencetak tulisan hanya di baris pertama.
        rowHeader: [
          i === 0 ? "Original" : "",
          i === 0 ? "Count" : "",
          classification.group,
        ],
        total: formatDisplayNumber(
          classification.counts.reduce(
            (sum: number, count: number) => sum + count,
            0,
          ),
        ),
      };

      for (let j = 0; j < classification.counts.length; j++) {
        rowData[`group_${j}`] = formatDisplayNumber(classification.counts[j]);
      }
      table.rows.push(rowData);
    }

    // --- 2. Original Classification Percentages ---
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const percentage = data.classification_results.original_percentage.find(
        (item: { group: string; percentages: number[] }) =>
          item.group === group,
      );

      if (!percentage) continue;

      const rowData: any = {
        rowHeader: [
          "", // Kosongkan karena 'Original' sudah dicetak di bagian Count atasnya
          i === 0 ? "%" : "",
          percentage.group,
        ],
        total: "100.0", // Total persentase selalu 100%
      };

      for (let j = 0; j < percentage.percentages.length; j++) {
        rowData[`group_${j}`] = formatDisplayNumber(percentage.percentages[j]);
      }
      table.rows.push(rowData);
    }

    // --- 3. Cross-validated Classification (If Available) ---
    if (data.classification_results.cross_validated_classification) {
      // Counts
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const classification =
          data.classification_results.cross_validated_classification.find(
            (item: { group: string; counts: number[] }) => item.group === group,
          );

        if (!classification) continue;

        const rowData: any = {
          rowHeader: [
            i === 0 ? "Cross-validatedᵇ" : "", // Gunakan huruf b kecil superscript
            i === 0 ? "Count" : "",
            classification.group,
          ],
          total: formatDisplayNumber(
            classification.counts.reduce(
              (sum: number, count: number) => sum + count,
              0,
            ),
          ),
        };

        for (let j = 0; j < classification.counts.length; j++) {
          rowData[`group_${j}`] = formatDisplayNumber(classification.counts[j]);
        }
        table.rows.push(rowData);
      }

      // Percentages
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const percentage =
          data.classification_results.cross_validated_percentage.find(
            (item: { group: string; percentages: number[] }) =>
              item.group === group,
          );

        if (!percentage) continue;

        const rowData: any = {
          rowHeader: ["", i === 0 ? "%" : "", percentage.group],
          total: "100.0",
        };

        for (let j = 0; j < percentage.percentages.length; j++) {
          rowData[`group_${j}`] = formatDisplayNumber(
            percentage.percentages[j],
          );
        }
        table.rows.push(rowData);
      }
    }

    // --- FOOTNOTES & PERCENTAGE CALCULATION ---
    // Calculate original correct classification percentage
    let originalCorrect = 0;
    let classifiedCount = 0;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const classification =
        data.classification_results.original_classification.find(
          (item: { group: string; counts: number[] }) => item.group === group,
        );

      if (classification && classification.counts[i] > 0) {
        originalCorrect += classification.counts[i];
        classifiedCount += classification.counts.reduce(
          (sum: number, val: number) => sum + val,
          0,
        );
      }
    }

    const originalCorrectPct =
      classifiedCount > 0 ? (originalCorrect / classifiedCount) * 100 : 0;

    table.rows.push({
      rowHeader: [
        `a. ${formatDisplayNumber(originalCorrectPct)}% of original grouped cases correctly classified.`,
      ],
    });

    if (data.classification_results.cross_validated_classification) {
      table.rows.push({
        rowHeader: [
          "b. Cross validation is done only for those cases in the analysis. In cross validation, each case is classified by the functions derived from all cases other than that case.",
        ],
      });

      // Calculate cross-validated correct classification percentage
      let crossValidatedCorrect = 0;
      let crossValidatedCount = 0;
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const classification =
          data.classification_results.cross_validated_classification.find(
            (item: { group: string; counts: number[] }) => item.group === group,
          );

        if (classification && classification.counts[i] > 0) {
          crossValidatedCorrect += classification.counts[i];
          crossValidatedCount += classification.counts.reduce(
            (sum: number, val: number) => sum + val,
            0,
          );
        }
      }

      const crossValidatedCorrectPct =
        crossValidatedCount > 0
          ? (crossValidatedCorrect / crossValidatedCount) * 100
          : 0;

      table.rows.push({
        rowHeader: [
          `c. ${formatDisplayNumber(crossValidatedCorrectPct)}% of cross-validated grouped cases correctly classified.`,
        ],
      });
    }

    resultJson.tables.push(table);
  }

  // ── Scatter plots (Combined-Groups + Separate-Groups) ──────────────────────
  // scatter_data is populated when combine||sep_grp and case==false.
  // casewise_statistics has the same fields when case==true.
  const scatterSrc = data?.scatter_data ?? data?.casewise_statistics;
  // discriminant_scores is Vec<ScoreValue> = [{function, values}], not a keyed object
  const scoreArr: Array<{ function: string; values: number[] }> | undefined =
    scatterSrc?.discriminant_scores;
  const f1Scores: number[] | undefined = scoreArr?.find((s: any) => s.function === "Function 1")?.values;
  const f2Scores: number[] | undefined = scoreArr?.find((s: any) => s.function === "Function 2")?.values;
  const caseGroups: string[] | undefined = scatterSrc?.actual_group;
  // function_at_centroids is Vec<GroupCentroid> = [{group, values}], not a keyed object
  const centroidArr: Array<{ group: string; values: number[] }> | undefined =
    data?.canonical_functions?.function_at_centroids;

  const hasScatterData =
    Array.isArray(f1Scores) &&
    Array.isArray(f2Scores) &&
    Array.isArray(caseGroups) &&
    f1Scores.length > 0;

  if (hasScatterData) {
    const f1 = f1Scores as number[];
    const f2 = f2Scores as number[];
    const grps = caseGroups as string[];

    // Case data points: { category: group, x: Function1, y: Function2 }
    const casePoints = grps.map((g, i) => ({ category: g, x: f1[i], y: f2[i] }));

    // Centroid data points: { category: "GroupName ★", x, y }
    const centroidPoints: { category: string; x: number; y: number }[] = (
      centroidArr ?? []
    ).map(({ group, values }) => ({
      category: group + " ★",
      x: values[0] ?? 0,
      y: values[1] ?? 0,
    }));

    // Linear decision boundaries (perpendicular bisectors of centroid pairs, equal-prior LDA).
    // Each boundary is parameterised as a line segment extended far beyond the data range;
    // the renderer clips it to the plot area.
    const boundaryLines: Array<{ x1: number; y1: number; x2: number; y2: number; dashArray: string }> = [];
    const centroids = centroidArr ?? [];
    if (centroids.length >= 2) {
      const allX = casePoints.map((p) => p.x);
      const allY = casePoints.map((p) => p.y);
      const xSpan = Math.max(...allX) - Math.min(...allX);
      const ySpan = Math.max(...allY) - Math.min(...allY);
      const T = Math.max(xSpan, ySpan, 1) * 4; // extend well beyond data

      for (let i = 0; i < centroids.length; i++) {
        for (let j = i + 1; j < centroids.length; j++) {
          const c1x = centroids[i].values[0] ?? 0;
          const c1y = centroids[i].values[1] ?? 0;
          const c2x = centroids[j].values[0] ?? 0;
          const c2y = centroids[j].values[1] ?? 0;

          const mx = (c1x + c2x) / 2;
          const my = (c1y + c2y) / 2;
          const dx = c2x - c1x;
          const dy = c2y - c1y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1e-10) continue;

          // Perpendicular direction (normalised)
          const perpX = -dy / len;
          const perpY = dx / len;

          boundaryLines.push({
            x1: mx + T * perpX,
            y1: my + T * perpY,
            x2: mx - T * perpX,
            y2: my - T * perpY,
            dashArray: "6,3",
          });
        }
      }
    }

    // Combined-Groups Plot
    const combinedChart: Chart = {
      chartType: "Grouped Scatter Plot",
      chartData: [...casePoints, ...centroidPoints],
      chartMetadata: {
        axisInfo: { x: "Function 1", y: "Function 2", category: "Group" },
        description: "Combined-Groups Plot",
        title: "Combined-Groups Plot",
        subtitle: "Canonical Discriminant Functions",
        notes: "★ = Group Centroid  — — — = Decision Boundary",
      },
      chartConfig: {
        width: 600,
        height: 500,
        useAxis: true,
        useLegend: true,
        axisLabels: { x: "Function 1", y: "Function 2" },
        ...(boundaryLines.length > 0 && { boundaryLines }),
      },
    };

    // Separate-Groups Plots (one per group)
    const uniqueGroups = [...new Set(grps)];
    const separateCharts: Chart[] = uniqueGroups.map((group) => {
      const groupCases = casePoints.filter((p) => p.category === group);
      const groupCentroid = centroidPoints.find((p) => p.category === group + " ★");
      return {
        chartType: "Grouped Scatter Plot",
        chartData: groupCentroid ? [...groupCases, groupCentroid] : groupCases,
        chartMetadata: {
          axisInfo: { x: "Function 1", y: "Function 2", category: "Group" },
          description: `Separate-Groups Plot: Group ${group}`,
          title: "Separate-Groups Plot",
          subtitle: `Group ${group}`,
          notes: "★ = Group Centroid",
        },
        chartConfig: {
          width: 600,
          height: 500,
          useAxis: true,
          useLegend: true,
          axisLabels: { x: "Function 1", y: "Function 2" },
        },
      };
    });

    resultJson.charts = [combinedChart, ...separateCharts];
  }

  // ── Territorial Map (Classify → Plots → Territorial Map) ───────────────────
  // Partitions the discriminant space (Function 1 × Function 2) into the LDA
  // classification regions (nearest centroid, prior-adjusted) and shades each
  // region by group. Built from the centroids alone, so it works even when no
  // scatter/casewise data is present. Needs ≥ 2 discriminant functions.
  if (data?.territorial_map) {
    const cents = (centroidArr ?? []).filter(
      (c) => Array.isArray(c.values) && c.values.length >= 2,
    );

    if (cents.length >= 2) {
      // Prior probability per group (log), defaulting to equal priors.
      const priorLog: Record<string, number> = {};
      const pp = data?.prior_probabilities;
      if (pp && Array.isArray(pp.groups) && Array.isArray(pp.prior_probabilities)) {
        for (let i = 0; i < pp.groups.length; i++) {
          const v = pp.prior_probabilities[i];
          priorLog[String(pp.groups[i])] =
            typeof v === "number" && v > 0 ? Math.log(v) : 0;
        }
      }
      const lnPrior = (g: string) => priorLog[String(g)] ?? 0;

      // Plot range: cover the centroids (and case scores when available), padded.
      const xs = cents.map((c) => c.values[0]);
      const ys = cents.map((c) => c.values[1]);
      if (Array.isArray(f1Scores)) xs.push(...(f1Scores as number[]));
      if (Array.isArray(f2Scores)) ys.push(...(f2Scores as number[]));
      let xMin = Math.min(...xs);
      let xMax = Math.max(...xs);
      let yMin = Math.min(...ys);
      let yMax = Math.max(...ys);
      const padX = (xMax - xMin) * 0.25 || 1;
      const padY = (yMax - yMin) * 0.25 || 1;
      xMin -= padX;
      xMax += padX;
      yMin -= padY;
      yMax += padY;

      // Grid resolution (~2200 cells, kept roughly square).
      const aspect = (xMax - xMin) / (yMax - yMin || 1);
      const NY = Math.min(90, Math.max(34, Math.round(Math.sqrt(2200 / (aspect || 1)))));
      const NX = Math.min(90, Math.max(34, Math.round((2200 / NY) || 50)));

      // Classify each grid cell to the highest-scoring centroid.
      const regionPoints: { category: string; x: number; y: number }[] = [];
      for (let i = 0; i < NX; i++) {
        const gx = xMin + ((xMax - xMin) * i) / (NX - 1);
        for (let j = 0; j < NY; j++) {
          const gy = yMin + ((yMax - yMin) * j) / (NY - 1);
          let bestGroup = cents[0].group;
          let bestScore = -Infinity;
          for (const c of cents) {
            const dx = gx - c.values[0];
            const dy = gy - c.values[1];
            const score = -0.5 * (dx * dx + dy * dy) + lnPrior(c.group);
            if (score > bestScore) {
              bestScore = score;
              bestGroup = c.group;
            }
          }
          regionPoints.push({ category: bestGroup, x: gx, y: gy });
        }
      }

      // Centroids drawn last (on top), in their own category so they stand out.
      const centroidMarks = cents.map((c) => ({
        category: "Centroid ★",
        x: c.values[0],
        y: c.values[1],
      }));

      const territorialChart: Chart = {
        chartType: "Grouped Scatter Plot",
        chartData: [...regionPoints, ...centroidMarks],
        chartMetadata: {
          axisInfo: { x: "Function 1", y: "Function 2", category: "Group" },
          description: "Territorial Map",
          title: "Territorial Map",
          subtitle: "Classification regions in discriminant space",
          notes:
            "Each region is colored by the group a case there would be classified into (nearest centroid). ★ = group centroid.",
        },
        chartConfig: {
          width: 640,
          height: 520,
          useAxis: true,
          useLegend: true,
          axisLabels: { x: "Function 1", y: "Function 2" },
        },
      };

      resultJson.charts = [...(resultJson.charts ?? []), territorialChart];
    }
  }

  // Bootstrap for Standardized Canonical Discriminant Function Coefficients
  if (data.bootstrap_results?.standardized?.length) {
    const b = data.bootstrap_results;
    const ciLabel = `${b.level ?? 95}% ${b.ci_method ?? "Percentile"} Confidence Interval`;

    const table: Table = {
      key: "bootstrap_standardized_coefficients",
      title:
        "Bootstrap for Standardized Canonical Discriminant Function Coefficients",
      columnHeaders: [
        { header: "", key: "var" },
        { header: "Function", key: "function" },
        { header: "Coefficient", key: "coefficient" },
        { header: "Bias", key: "bias" },
        { header: "Std. Error", key: "std_error" },
        {
          header: ciLabel,
          key: "ci",
          children: [
            { header: "Lower", key: "ci_lower" },
            { header: "Upper", key: "ci_upper" },
          ],
        },
      ],
      rows: [],
    };

    const funcs: string[] = b.functions ?? [];
    for (const entry of b.standardized) {
      const numF = entry.original?.length ?? 0;
      for (let f = 0; f < numF; f++) {
        table.rows.push({
          rowHeader: [entry.variable, funcs[f] ?? `Function ${f + 1}`],
          coefficient: formatDisplayNumber(entry.original[f]),
          bias: formatDisplayNumber(entry.bias[f]),
          std_error: formatDisplayNumber(entry.std_error[f]),
          ci_lower: formatDisplayNumber(entry.ci_lower[f]),
          ci_upper: formatDisplayNumber(entry.ci_upper[f]),
        });
      }
    }

    table.rows.push({
      rowHeader: [
        `Bootstrap results are based on ${b.num_samples} ${(
          b.sampling ?? "Simple"
        ).toLowerCase()} bootstrap samples.`,
      ],
    });

    resultJson.tables.push(table);
  }

  // ── Assumption checks ───────────────────────────────────────────────────────
  // Display order is controlled by store.ts sections[]; the keys are registered
  // at the top there so these render before the main discriminant output.
  const assumptions = data.assumption_results;
  if (assumptions) {
    // Overview with PASS/VIOLATED status per assumption.
    if (Array.isArray(assumptions.summary) && assumptions.summary.length > 0) {
      const table: Table = {
        key: "assumption_summary",
        title: "Assumption Checks Summary",
        columnHeaders: [
          { header: "Assumption", key: "assumption" },
          { header: "Test", key: "test" },
          { header: "Finding", key: "finding" },
          { header: "Status", key: "status" },
        ],
        rows: [],
      };
      let anyViolated = false;
      for (const r of assumptions.summary) {
        if (r.violated) anyViolated = true;
        table.rows.push({
          rowHeader: [r.assumption],
          test: r.test,
          finding: r.finding,
          status: r.violated ? "⚠ Violated" : "Met",
        });
      }
      (table as Table & { footer?: string }).footer = anyViolated
        ? "⚠ One or more assumptions are not met — interpret the results with caution. See the detail tables below."
        : "All checked assumptions are met.";
      resultJson.tables.push(table);
    }

    // Multicollinearity: Tolerance / VIF + condition diagnostics.
    const mc = assumptions.multicollinearity;
    if (mc && Array.isArray(mc.variables) && mc.variables.length > 0) {
      const table: Table = {
        key: "assumption_multicollinearity",
        title: "Multicollinearity (Tolerance and VIF)",
        columnHeaders: [
          { header: "Variable", key: "variable" },
          { header: "Tolerance", key: "tolerance" },
          { header: "VIF", key: "vif" },
        ],
        rows: [],
      };
      for (let i = 0; i < mc.variables.length; i++) {
        table.rows.push({
          rowHeader: [mc.variables[i]],
          tolerance: formatDisplayNumber(mc.tolerance[i]),
          vif: formatDisplayNumber(mc.vif[i]),
        });
      }
      (table as Table & { footer?: string }).footer = mc.note;
      resultJson.tables.push(table);
    }

    // Multivariate normality (Henze–Zirkler) on the full dataset — single row,
    // matching R's MVN::mvn output (Test / HZ / p value / MVN).
    const mv = assumptions.multivariate_normality;
    if (mv && typeof mv.hz === "number") {
      const table: Table = {
        key: "assumption_multivariate_normality",
        title: "Multivariate Normality (Henze-Zirkler Test)",
        columnHeaders: [
          { header: "Test", key: "test" },
          { header: "HZ", key: "hz" },
          { header: "p value", key: "p_value" },
          { header: "MVN", key: "mvn" },
        ],
        rows: [
          {
            rowHeader: ["Henze-Zirkler"],
            hz: formatDisplayNumber(mv.hz),
            p_value: formatDisplayNumber(mv.p_value),
            mvn: mv.normal ? "YES" : "⚠ NO",
          },
        ],
      };
      (table as Table & { footer?: string }).footer = mv.note;
      resultJson.tables.push(table);
    }

    // Univariate normality (Anderson–Darling) per predictor on the full dataset,
    // matching R's MVN::mvn output (Test / Variable / Statistic / p value / Normality).
    const uv = assumptions.univariate_normality;
    if (uv && Array.isArray(uv.variables) && uv.variables.length > 0) {
      const table: Table = {
        key: "assumption_univariate_normality",
        title: "Univariate Normality (Anderson-Darling)",
        columnHeaders: [
          { header: "Test", key: "test" },
          { header: "Variable", key: "variable" },
          { header: "Statistic", key: "statistic" },
          { header: "p value", key: "p_value" },
          { header: "Normality", key: "normality" },
        ],
        rows: [],
      };
      for (let i = 0; i < uv.variables.length; i++) {
        table.rows.push({
          rowHeader: ["Anderson-Darling", uv.variables[i]],
          statistic: formatDisplayNumber(uv.statistic[i]),
          p_value: formatDisplayNumber(uv.p_value[i]),
          normality: uv.normal[i] ? "YES" : "⚠ NO",
        });
      }
      (table as Table & { footer?: string }).footer = uv.note;
      resultJson.tables.push(table);
    }
  }

  return resultJson;
}
