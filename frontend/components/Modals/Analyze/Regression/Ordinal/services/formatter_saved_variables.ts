import { AnalysisSection } from "../types/ordinal";
import { OrdinalFormatterContext } from "./formatter_context";
import { createSection } from "./formatter_utils";

export const formatSavedVariables = (
  context: OrdinalFormatterContext
): AnalysisSection[] => {
  const { hasSavedVariableRequest, hasSavedVariableResult, savedVariableColumns } = context;
  if (!hasSavedVariableRequest || !hasSavedVariableResult) {
    return [];
  }

  const rows = savedVariableColumns.map((column: any) => {
    const columnName = String(column.name);
    return {
      rowHeader: [columnName],
      variable: columnName,
      label: column.label ? String(column.label) : ".",
      status: "Berhasil disimpan",
    };
  });

  return [
    createSection(
      "ordinal_saved_variables",
      "Saved Variables",
      {
        columnHeaders: [
          { header: "Variable", key: "variable" },
          { header: "Label", key: "label" },
          { header: "Status", key: "status" },
        ],
        rows,
      },
      {
        description: "Status penyimpanan saved variables.",
      }
    ),
  ];
};
