import React, { useMemo, useState } from "react";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useVariableStore } from "@/stores/useVariableStore";
import type { KNNDialogProps } from "@/components/Modals/Analyze/Classify/nearest-neighbor/types/nearest-neighbor";

import type { Variable } from "@/types/Variable";

import VariableListManager from "@/components/Common/VariableListManager";
import type { TargetListConfig } from "@/components/Common/VariableListManager";
import { HelperIcon } from "./helper-icon";

const helperText = {
  target: "Select the variable that the KNN model will predict.",
  features: "Select the predictor variables used to find the nearest neighbors.",
  focalCaseIdentifier:
    "Optional variable used to mark specific cases of interest. Cases with positive values will be treated as focal cases.",
  caseLabel:
    "Optional variable used as a readable label for identifying cases in tables and charts.",
};

export const KNNDialog = ({
  updateFormData,
  data,
  externalErrors,
  showFieldHelp = false,
}: KNNDialogProps) => {
  const [highlightedVariable, setHighlightedVariable] = useState<{
    id: string;
    source: string;
  } | null>(null);

  const variables = useVariableStore((state) => state.variables);

  const allVariables = variables;

  const targetVar = useMemo(() => data.TargetVar ? [data.TargetVar] : [], [data.TargetVar]);
  const featureVars = useMemo(() => data.FeatureVar ?? [], [data.FeatureVar]);
  const focalVars = useMemo(
    () => data.FocalCaseIdenVar ? [data.FocalCaseIdenVar] : [],
    [data.FocalCaseIdenVar],
  );
  const caseLabelVars = useMemo(
    () => data.CaseIdenVar ? [data.CaseIdenVar] : [],
    [data.CaseIdenVar],
  );

  const variableMap = useMemo(() => {
    return new Map(allVariables.map((v) => [v.name, v]));
  }, [allVariables]);

  const availableVars = useMemo(() => {
    const used = new Set([
      data.TargetVar,
      ...(data.FeatureVar ?? []),
      data.FocalCaseIdenVar,
      data.CaseIdenVar,
    ]);

    return allVariables.filter((v) => !used.has(v.name));
  }, [allVariables, data]);

  const isNumericVariable = (v: Variable) =>
    [
      "NUMERIC",
      "COMMA",
      "DOT",
      "SCIENTIFIC",
      "DOLLAR",
      "RESTRICTED_NUMERIC",
    ].includes(v.type ?? "");

  const handleMoveVariable = (
    variable: Variable,
    fromListId: string,
    toListId: string,
  ) => {
    if (toListId === "TargetVar") {
      updateFormData("TargetVar", variable.name);
    }

    if (toListId === "FeatureVar") {
      if (!featureVars.includes(variable.name)) {
        updateFormData("FeatureVar", [...featureVars, variable.name]);
      }
    }

    if (toListId === "FocalCaseIdenVar") {
      if (isNumericVariable(variable)) {
        updateFormData("FocalCaseIdenVar", variable.name);
      }
    }

    if (toListId === "CaseIdenVar") {
      updateFormData("CaseIdenVar", variable.name);
    }

    // =========================
    // REMOVE
    // =========================
    if (fromListId === "FeatureVar") {
      updateFormData(
        "FeatureVar",
        featureVars.filter((v) => v !== variable.name),
      );
    }

    if (fromListId === "TargetVar") {
      updateFormData("TargetVar", null);
    }

    if (fromListId === "FocalCaseIdenVar") {
      updateFormData("FocalCaseIdenVar", null);
    }

    if (fromListId === "CaseIdenVar") {
      updateFormData("CaseIdenVar", null);
    }
  };

  const handleReorderVariable = (listId: string, newVariables: Variable[]) => {
    if (listId === "FeatureVar") {
      updateFormData(
        "FeatureVar",
        newVariables.map((v) => v.name),
      );
    }
  };

  const errors = externalErrors ?? [];

  const targetListsConfig: TargetListConfig[] = useMemo(
    () => {
      const mapToVariables = (names: string[]) =>
        names
          .map((name) => variableMap.get(name))
          .filter((v): v is Variable => Boolean(v));

      return [
      {
        id: "TargetVar",
        title: "Target:",
        titleAction: showFieldHelp ? <HelperIcon text={helperText.target} /> : null,
        variables: mapToVariables(targetVar),
        maxItems: 1,
        height: "80px",
      },
      {
        id: "FeatureVar",
        title: "Features:",
        titleAction: showFieldHelp ? <HelperIcon text={helperText.features} /> : null,
        variables: mapToVariables(featureVars),
        height: "200px",
      },
      {
        id: "FocalCaseIdenVar",
        title: "Focal Case Identifier (Optional):",
        titleAction: showFieldHelp ? (
          <HelperIcon text={helperText.focalCaseIdentifier} />
        ) : null,
        variables: mapToVariables(focalVars),
        maxItems: 1,
        height: "80px",
        allowedTypes: [
          "NUMERIC",
          "COMMA",
          "DOT",
          "SCIENTIFIC",
          "DOLLAR",
          "RESTRICTED_NUMERIC",
        ],
      },
      {
        id: "CaseIdenVar",
        title: "Case Label (Optional):",
        titleAction: showFieldHelp ? <HelperIcon text={helperText.caseLabel} /> : null,
        variables: mapToVariables(caseLabelVars),
        maxItems: 1,
        height: "80px",
      },
      ];
    },
    [targetVar, featureVars, focalVars, caseLabelVars, variableMap, showFieldHelp],
  );

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      <div className="flex flex-col flex-1 min-h-0 w-full p-4 space-y-3">
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 min-h-0 w-full max-w-2xl rounded-lg border"
        >
          <ResizablePanel defaultSize={100}>
            <div className="p-2 h-full min-h-0 overflow-y-auto hide-available-scrollbar">
              <VariableListManager
                availableVariables={availableVars}
                targetLists={targetListsConfig}
                variableIdKey="name"
                highlightedVariable={highlightedVariable}
                setHighlightedVariable={setHighlightedVariable}
                onMoveVariable={handleMoveVariable}
                onReorderVariable={handleReorderVariable}
                showArrowButtons
                availableListHeight="300px"
                renderListFooter={(listId) => {
                  if (listId !== "FeatureVar") return null;

                  return (
                    <div className="mt-2 px-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="normalize"
                          checked={data.NormCovar ?? true}
                          onChange={(e) =>
                            updateFormData("NormCovar", e.target.checked)
                          }
                        />
                        <label htmlFor="normalize" className="text-sm">
                          Normalize scale features
                        </label>
                      </div>
                    </div>
                  );
                }}
              />
              <div className="mt-3 space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="text-xs text-red-500">
                    {err}
                  </div>
                ))}

                {errors.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Select variables for analysis.
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
