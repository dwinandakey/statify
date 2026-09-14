import React, { useEffect, useMemo, useState } from "react";
import { HierClusDialog } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/dialogs/dialog";
import type {
  HierClusContainerProps,
  HierClusMainType,
  HierClusType,
} from "@/components/Modals/Analyze/Classify/hierarchical-cluster/types/hierarchical-cluster";
import { HierClusDefault } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/constants/hierarchical-cluster-default";
import { HierClusStatistics } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/dialogs/statistics";
import { HierClusPlots } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/dialogs/plots";
import { HierClusSave } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/dialogs/save";
import { HierClusMethod } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/dialogs/method";
import { useVariableStore } from "@/stores/useVariableStore";
import { useDataStore } from "@/stores/useDataStore";
import { analyzeHierClus } from "@/components/Modals/Analyze/Classify/hierarchical-cluster/services/hierarchical-cluster-analysis";
import { clearFormData, getFormData, saveFormData } from "@/hooks/useIndexedDB";

export const HierClusContainer = ({ onClose }: HierClusContainerProps) => {
  const variables = useVariableStore((state) => state.variables);
  const dataVariables = useDataStore((state) => state.data);
  const tempVariables = useMemo(
    () => variables.map((variable) => variable.name),
    [variables]
  );

  const [formData, setFormData] = useState<HierClusType>({
    ...HierClusDefault,
  });
  const [isMainOpen, setIsMainOpen] = useState(true);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isPlotsOpen, setIsPlotsOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isMethodOpen, setIsMethodOpen] = useState(false);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const savedData = await getFormData("HierarchicalCluster");
        if (savedData) {
          const { id, ...formDataWithoutId } = savedData;
          setFormData(formDataWithoutId);
        } else {
          setFormData({ ...HierClusDefault });
        }
      } catch (error) {
        console.error("Failed to load form data:", error);
      }
    };

    loadFormData();
  }, []);

  const updateFormData = <T extends keyof typeof formData>(
    section: T,
    field: keyof (typeof formData)[T],
    value: unknown
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const executeHierClus = async (mainData: HierClusMainType) => {
    try {
      const newFormData = {
        ...formData,
        main: mainData,
      };

      await saveFormData("HierarchicalCluster", newFormData);

      await analyzeHierClus({
        configData: newFormData,
        dataVariables,
        variables,
      });
    } catch (error) {
      console.error(error);
    }

    onClose();
  };

  const resetFormData = async () => {
    try {
      await clearFormData("HierarchicalCluster");
      setFormData({ ...HierClusDefault });
    } catch (error) {
      console.error("Failed to clear form data:", error);
    }
  };

  return (
    <div className="flex-grow overflow-y-auto flex flex-col h-full">
      {isMainOpen && (
        <HierClusDialog
          isMainOpen={isMainOpen}
          setIsMainOpen={(value) => {
            if (value) {
              setIsMainOpen(true);
            } else {
              setIsMainOpen(false);
            }
          }}
          setIsStatisticsOpen={(value) => {
            if (value) {
              setIsMainOpen(false);
              setIsStatisticsOpen(true);
            }
          }}
          setIsPlotsOpen={(value) => {
            if (value) {
              setIsMainOpen(false);
              setIsPlotsOpen(true);
            }
          }}
          setIsSaveOpen={(value) => {
            if (value) {
              setIsMainOpen(false);
              setIsSaveOpen(true);
            }
          }}
          setIsMethodOpen={(value) => {
            if (value) {
              setIsMainOpen(false);
              setIsMethodOpen(true);
            }
          }}
          updateFormData={(field, value) =>
            updateFormData("main", field, value)
          }
          data={formData.main}
          globalVariables={tempVariables}
          onContinue={(mainData) => executeHierClus(mainData)}
          onReset={resetFormData}
        />
      )}

      {isStatisticsOpen && (
        <HierClusStatistics
          isStatisticsOpen={isStatisticsOpen}
          setIsStatisticsOpen={(value) => {
            if (!value) {
              setIsStatisticsOpen(false);
              setIsMainOpen(true);
            }
          }}
          updateFormData={(field, value) =>
            updateFormData("statistics", field, value)
          }
          data={formData.statistics}
        />
      )}

      {isPlotsOpen && (
        <HierClusPlots
          isPlotsOpen={isPlotsOpen}
          setIsPlotsOpen={(value) => {
            if (!value) {
              setIsPlotsOpen(false);
              setIsMainOpen(true);
            }
          }}
          updateFormData={(field, value) =>
            updateFormData("plots", field, value)
          }
          data={formData.plots}
        />
      )}

      {isSaveOpen && (
        <HierClusSave
          isSaveOpen={isSaveOpen}
          setIsSaveOpen={(value) => {
            if (!value) {
              setIsSaveOpen(false);
              setIsMainOpen(true);
            }
          }}
          updateFormData={(field, value) =>
            updateFormData("save", field, value)
          }
          data={formData.save}
        />
      )}

      {isMethodOpen && (
        <HierClusMethod
          isMethodOpen={isMethodOpen}
          setIsMethodOpen={(value) => {
            if (!value) {
              setIsMethodOpen(false);
              setIsMainOpen(true);
            }
          }}
          updateFormData={(field, value) =>
            updateFormData("method", field, value)
          }
          data={formData.method}
        />
      )}
    </div>
  );
};
