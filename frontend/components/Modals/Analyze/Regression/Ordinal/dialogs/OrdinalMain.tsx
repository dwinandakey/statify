"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, HelpCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Variable } from "@/types/Variable";

// Stores & Hooks
import { useVariableStore } from "@/stores/useVariableStore";
import { useModalStore } from "@/stores/useModalStore";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { useResultStore } from "@/stores/useResultStore";
import { useDataStore, CellUpdate } from "@/stores/useDataStore";

// Tour Guide
import type { TabControlProps } from "@/components/Modals/Analyze/Descriptive/Descriptive/hooks/useTourGuide";
import { useTourGuide } from "@/components/Modals/Analyze/Descriptive/Descriptive/hooks/useTourGuide";
import { TourPopup, ActiveElementHighlight } from "@/components/Common/TourComponents";
import { baseTourSteps } from "../hooks/tourConfig";

// Components
import { VariablesTab } from "./VariablesTab";
import { LocationTab } from "./LocationTab";
import { ScaleTab } from "./ScaleTab";
import { OptionsTab } from "./OptionsTab";
import { OutputTab } from "./OutputTab";

// Services
import { formatOrdinalResult } from "../services/formatter";
import {
  buildOrdinalPlumDesignMatrix,
  extractOrdinalDependentCategories,
} from "../services/plum_design_matrix";

// Types
import {
  OrdinalOptions,
  OrdinalLocationParams,
  OrdinalScaleParams,
  OrdinalOptionsParams,
  OrdinalOutputParams,
  LocationInteraction,
  LocationModelTerm,
} from "../types/ordinal";

const OrdinalMain: React.FC = () => {
  const { closeModal } = useModalStore();
  const variablesFromStore = useVariableStore((state) => state.variables);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState("variables");
  const [isLoading, setIsLoading] = useState(false); // Tetap digunakan untuk UI loading
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tabControl = useMemo<TabControlProps>(
    () => ({
      setActiveTab: (tab: string) => setActiveTab(tab),
      currentActiveTab: activeTab,
    }),
    [activeTab]
  );

  const { tourActive, currentStep, tourSteps, currentTargetElement, startTour, nextStep, prevStep, endTour } =
    useTourGuide(baseTourSteps, "dialog", tabControl);

  // State untuk variabel yang dipilih
  const [options, setOptions] = useState<OrdinalOptions>({
    dependent: null,
    factors: [],
    covariates: [],
  });

  // State untuk setiap tab
  const [locationParams, setLocationParams] = useState<OrdinalLocationParams>({ locationModel: [] });
  const [scaleParams, setScaleParams] = useState<OrdinalScaleParams>({ scaleModel: [] });
  const [optParams, setOptParams] = useState<OrdinalOptionsParams>({
    maxIterations: 100,
    maxStepHalving: 5,
    logLikelihoodConvergence: 0,
    parameterConvergence: 0.000001,
    confidenceInterval: 95,
    delta: 0,
    singularityTolerance: 0.00000001,
    linkFunction: "Logit",
  });
  const [outputParams, setOutputParams] = useState<OrdinalOutputParams>({
    display: {
      goodnessOfFit: true,
      summaryStatistics: true,
      parameterEstimates: true,
      asymptoticCorrelation: false,
      cellInformation: false,
      testOfParallelLines: false,
      test_of_multicolinearity: false,
      iterationHistory: false,
      iterationHistoryStep: 1,
      printIterationHistory: false,
      iterationHistoryEvery: 1,
    },
    savedVariables: {
      predictedResponseCategory: false,
      estimatedResponseProbabilities: false,
      predictedCategoryProbability: false,
      actualCategoryProbability: false,
    },
    printLogLikelihood: "Including",
  });

  // Menghitung variabel yang tersedia (belum dipilih)
  const availableVariables = useMemo(() => {
    const selectedIds = new Set([
      options.dependent?.id,
      ...options.factors.map((v) => v.id),
      ...options.covariates.map((v) => v.id),
    ]);
    return variablesFromStore.filter((v) => !selectedIds.has(v.id));
  }, [variablesFromStore, options]);

  const { data, weights } = useAnalysisData();
  const { addLog, addAnalytic, addStatistic } = useResultStore();

  const addSavedVariableColumns = async (savedVariables: any) => {
    const columns = Array.isArray(savedVariables?.columns) ? savedVariables.columns : [];
    if (columns.length === 0) return;

    const currentVariables = useVariableStore.getState().variables;
    const startColumnIndex = currentVariables.length > 0
      ? Math.max(...currentVariables.map((variable) => variable.columnIndex)) + 1
      : 0;
    const variablesToAdd: Partial<Variable>[] = [];
    const updates: CellUpdate[] = [];

    columns.forEach((column: any, index: number) => {
      const columnIndex = startColumnIndex + index;
      const isString = column.type === "string";
      variablesToAdd.push({
        columnIndex,
        name: column.name,
        label: column.label,
        type: isString ? "STRING" : "NUMERIC",
        width: isString ? 32 : 12,
        decimals: isString ? 0 : (typeof column.decimals === "number" ? column.decimals : 6),
        values: [],
        missing: null,
        columns: isString ? 32 : 12,
        align: isString ? "left" : "right",
        measure: column.name?.startsWith("PRE_") ? "ordinal" : "scale",
        role: "input",
      });

      if (Array.isArray(column.values)) {
        column.values.forEach((value: string | number | null, rowIndex: number) => {
          if (value === null || value === undefined) return;
          updates.push({
            row: rowIndex,
            col: columnIndex,
            value,
          });
        });
      }
    });

    console.log("[ORDINAL][SAVED_VARIABLES][ADD_TO_DATASET]", {
      columns: variablesToAdd.map((variable) => variable.name),
      updates: updates.length,
    });

    await useVariableStore.getState().addVariables(variablesToAdd, []);
    if (updates.length > 0) {
      await useDataStore.getState().updateCells(updates);
      await useDataStore.getState().saveData();
    }
  };

  // ==================================================
  // HELPERS
  // ==================================================
  const isMissingValue = (value: unknown) => value === null || value === undefined || value === "";

  const isValidRow = (row: unknown) =>
    row !== null && row !== undefined && (Array.isArray(row) || typeof row === "object");

  const getRowValue = (row: any, columnIndex: number) => row?.[columnIndex];

  const toNumberOrThrow = (value: unknown, label: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || !Number.isFinite(numeric)) {
      throw new Error(`Covariate '${label}' contains non-numeric values.`);
    }
    return numeric;
  };

  const normalizeValueLabelKey = (value: unknown) => String(value);

  const getValueLabel = (variable: Variable, value: unknown) => {
    const key = normalizeValueLabelKey(value);
    const match = variable.values?.find((entry) => normalizeValueLabelKey(entry.value) === key);
    return match?.label ?? String(value);
  };

  const getVariableKey = (variable: Variable) => `${variable.columnIndex}-${variable.name}`;

  const getVariableIdentity = (variable: Variable) => {
    if (typeof variable.columnIndex === "number") {
      return `col:${variable.columnIndex}`;
    }
    return `name:${variable.name}`;
  };

  const isInteraction = (term: LocationModelTerm): term is LocationInteraction =>
    typeof term === "object" && "kind" in term && term.kind === "interaction";

  const buildInteractionKey = (variables: Variable[]) =>
    variables.map(getVariableKey).sort().join("::");

  const buildLocationPredictors = (responseVariable: Variable, predictors: LocationModelTerm[]) => {
    const variableTerms: Variable[] = [];
    const interactionTerms: LocationInteraction[] = [];
    const seenVariables = new Set<string>();
    const seenInteractions = new Set<string>();

    for (const term of predictors) {
      if (isInteraction(term)) {
        if (!Array.isArray(term.variables) || term.variables.length < 2) {
          throw new Error("Interaction term harus memiliki minimal 2 variabel.");
        }
        for (const variable of term.variables) {
          if (responseVariable?.id === variable?.id || responseVariable?.columnIndex === variable?.columnIndex) {
            throw new Error("Predictor cannot be the same as response variable.");
          }
        }
        const interactionKey = buildInteractionKey(term.variables);
        if (seenInteractions.has(interactionKey)) {
          throw new Error("Interaction tidak boleh duplicate.");
        }
        seenInteractions.add(interactionKey);
        interactionTerms.push(term);
      } else {
        const key = getVariableKey(term);
        if (responseVariable?.id === term?.id || responseVariable?.columnIndex === term?.columnIndex) {
          throw new Error("Predictor cannot be the same as response variable.");
        }
        if (seenVariables.has(key)) {
          throw new Error("Predictor tidak boleh duplicate.");
        }
        seenVariables.add(key);
        variableTerms.push(term);
      }
    }

    return { variableTerms, interactionTerms };
  };

  const validateWorkerResult = (payload: any) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Worker result is empty or invalid.");
    }
    if (typeof payload.converged !== "boolean") {
      throw new Error("Worker result missing converged status.");
    }
    if (payload.iterations !== null && typeof payload.iterations !== "number") {
      throw new Error("Worker result missing iterations.");
    }
    if (payload.logLikelihood !== null && typeof payload.logLikelihood !== "number") {
      throw new Error("Worker result missing logLikelihood.");
    }
    if (payload.minus2LogLikelihood !== null && typeof payload.minus2LogLikelihood !== "number") {
      throw new Error("Worker result missing minus2LogLikelihood.");
    }
    if (!Array.isArray(payload.parameterEstimates)) {
      throw new Error("Worker result missing parameter estimates.");
    }
    const invalidEstimate = payload.parameterEstimates.find((v: any) => {
      if (typeof v === "number") {
        return Number.isNaN(v) || !Number.isFinite(v);
      }
      if (v && typeof v === "object") {
        if ("estimate" in v) {
          return typeof v.estimate !== "number" || Number.isNaN(v.estimate) || !Number.isFinite(v.estimate);
        }
        if ("value" in v) {
          return typeof v.value !== "number" || Number.isNaN(v.value) || !Number.isFinite(v.value);
        }
      }
      return true;
    });
    if (invalidEstimate !== undefined) {
      throw new Error("Worker result contains invalid parameter estimates.");
    }
  };

  const getErrorMessage = (error: unknown) => {
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
      const errorObj = error as { message?: string; stage?: string };
      if (errorObj.message && errorObj.stage) {
        return `${errorObj.message} (stage: ${errorObj.stage})`;
      }
      if (errorObj.message) {
        return errorObj.message;
      }
      try {
        return JSON.stringify(errorObj);
      } catch {
        return "Terjadi error tidak dikenal.";
      }
    }
    return "Terjadi error tidak dikenal.";
  };

  // ==================================================
  // ORDINAL DEBUG CHECKLIST
  // 1. MAIN: cek [ORDINAL][MAIN][PAYLOAD_TO_WORKER]
  // 2. WORKER: cek [ORDINAL][WORKER][RECEIVED] & [ORDINAL][WORKER][PAYLOAD_VALID]
  // 3. RUST: cek hasil plum_validate (missing field => struct Rust belum sama)
  // 4. WORKER RESULT: cek [ORDINAL][WORKER][NORMALIZED_RESULT]
  // 5. MAIN FORMATTER: cek [ORDINAL][MAIN][FORMATTED_SECTIONS]
  // ==================================================
  // --- HANDLERS ---
  const handleAnalyze = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // ==================================================
      // VALIDATE USER INPUT
      // ==================================================
      if ((scaleParams.scaleModel ?? []).length > 0) {
        throw new Error("Fitur belum tersedia");
      }

      const responseVariable = options.dependent;
      if (!responseVariable) {
        throw new Error("Mohon pilih variabel dependen.");
      }
      if (typeof responseVariable.columnIndex !== "number") {
        throw new Error("Response variable tidak memiliki columnIndex yang valid.");
      }
      if (!data || data.length === 0) {
        throw new Error("Dataset kosong atau tidak tersedia.");
      }

      const factors = options.factors;
      const covariates = options.covariates;

      const factorIdentities = new Set(factors.map(getVariableIdentity));
      const covariateIdentities = new Set(covariates.map(getVariableIdentity));
      Array.from(factorIdentities).forEach((identity) => {
        if (covariateIdentities.has(identity)) {
          throw new Error("Variabel yang sama tidak boleh muncul di factors dan covariates.");
        }
      });
      const locationPredictorsRaw: LocationModelTerm[] = locationParams.locationModel.length > 0
        ? locationParams.locationModel
        : [...factors, ...covariates];

      if (locationPredictorsRaw.length === 0) {
        throw new Error("Minimal 1 variabel independen.");
      }

      const { variableTerms: locationPredictors, interactionTerms } = buildLocationPredictors(
        responseVariable,
        locationPredictorsRaw
      );

      const scalePredictors = scaleParams.scaleModel ?? [];

      for (const predictor of locationPredictors) {
        const identity = getVariableIdentity(predictor);
        if (!factorIdentities.has(identity) && !covariateIdentities.has(identity)) {
          throw new Error(`Predictor '${predictor.name}' harus berada di Factors atau Covariates.`);
        }
      }

      console.log("[ORDINAL][MAIN][USER_INPUT]", {
        responseVariable,
        factors,
        covariates,
        locationPredictors,
        interactionTerms,
      });

      // ==================================================
      // PREPARE RESPONSE VARIABLE
      // ==================================================
      const totalRows = data.length;
      const validRows: any[] = [];
      const validWeights: number[] = [];
      const originalRowIndices: number[] = [];
      const droppedRows: any[] = [];
      let totalWeightAll = 0;

      for (let rowIndex = 0; rowIndex < data.length; rowIndex += 1) {
        const row = data[rowIndex];
        const weight = weights[rowIndex] ?? 1;
        if (!isValidRow(row)) {
          droppedRows.push(row);
          continue;
        }
        if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
          droppedRows.push(row);
          continue;
        }
        totalWeightAll += weight;

        const responseValue = getRowValue(row, responseVariable.columnIndex);
        if (isMissingValue(responseValue)) {
          droppedRows.push(row);
          continue;
        }

        let rowValid = true;
        for (const predictor of locationPredictors) {
          const predictorIndex = predictor?.columnIndex;
          if (typeof predictorIndex !== "number") {
            throw new Error(`Predictor "${predictor?.name ?? ""}" does not have a valid columnIndex.`);
          }
          const predictorValue = getRowValue(row, predictorIndex);
          if (isMissingValue(predictorValue)) {
            rowValid = false;
            break;
          }
        }

        if (rowValid && Array.isArray(scalePredictors) && scalePredictors.length > 0) {
          for (const predictor of scalePredictors) {
            const predictorIndex = predictor?.columnIndex;
            if (typeof predictorIndex !== "number") {
              throw new Error(`Scale predictor "${predictor?.name ?? ""}" does not have a valid columnIndex.`);
            }
            const predictorValue = getRowValue(row, predictorIndex);
            if (isMissingValue(predictorValue)) {
              rowValid = false;
              break;
            }
          }
        }

        if (rowValid) {
          for (const interaction of interactionTerms) {
            for (const variable of interaction.variables) {
              const predictorIndex = variable?.columnIndex;
              if (typeof predictorIndex !== "number") {
                throw new Error(`Interaction variable "${variable?.name ?? ""}" does not have a valid columnIndex.`);
              }
              const predictorValue = getRowValue(row, predictorIndex);
              if (isMissingValue(predictorValue)) {
                rowValid = false;
                break;
              }
            }
            if (!rowValid) break;
          }
        }

        if (rowValid) {
          validRows.push(row);
          validWeights.push(weight);
          originalRowIndices.push(rowIndex);
        } else {
          droppedRows.push(row);
        }
      }

      console.log("[ORDINAL][MAIN][CASE_PROCESSING]", {
        totalRows,
        validRows: validRows.length,
        droppedRows: droppedRows.length,
      });

      if (validRows.length === 0) {
        throw new Error("All rows were dropped after listwise deletion.");
      }

      const responseValues = validRows.map((row) => getRowValue(row, responseVariable.columnIndex));
      const responseCategories = extractOrdinalDependentCategories(responseValues, responseVariable);

      console.log("[ORDINAL][CATEGORY_ORDER]", {
        responseVariable: responseVariable.name,
        categories: responseCategories,
      });

      if (responseCategories.length < 3) {
        throw new Error("Response variable harus memiliki minimal 3 kategori untuk ordinal regression.");
      }

      const responseCategoriesNumeric = responseCategories.every((value) => typeof value === "number");
      const responseCategoryMap = new Map<string | number, number>();
      responseCategories.forEach((category, index) => {
        const key = responseCategoriesNumeric ? (category as number) : String(category);
        responseCategoryMap.set(key, index + 1);
      });

      const responseVector = responseValues.map((value) => {
        const key = responseCategoriesNumeric ? (value as number) : String(value);
        return responseCategoryMap.get(key);
      });
      if (responseVector.some((value) => value === undefined)) {
        throw new Error("Response vector encoding failed due to invalid categories.");
      }
      responseVector.forEach((value, index) => {
        if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
          throw new Error(`Response vector contains invalid value at index ${index}.`);
        }
      });

      console.log("[ORDINAL][MAIN][RESPONSE]", {
        responseCategories,
        responseVector,
      });

      const validWeightTotal = validWeights.reduce((acc, w) => acc + w, 0);
      const missingWeightTotal = Math.max(0, totalWeightAll - validWeightTotal);
      const categoryCounts = Array(responseCategories.length).fill(0) as number[];
      responseVector.forEach((value, index) => {
        const categoryIndex = Math.round(Number(value)) - 1;
        if (categoryIndex >= 0 && categoryIndex < categoryCounts.length) {
          categoryCounts[categoryIndex] += validWeights[index] ?? 0;
        }
      });

      // ==================================================
      // BUILD LOCATION DESIGN MATRIX
      // ==================================================
      const factorPredictors = locationPredictors.filter((predictor) =>
        factorIdentities.has(getVariableIdentity(predictor))
      );
      const covariatePredictors = locationPredictors.filter((predictor) =>
        covariateIdentities.has(getVariableIdentity(predictor))
      );

      const designMatrixResult = buildOrdinalPlumDesignMatrix({
        rows: validRows,
        factors: factorPredictors,
        covariates: covariatePredictors,
        interactions: interactionTerms,
        getRowValue,
        toNumberOrThrow,
      });

      designMatrixResult.warnings.forEach((warning) => {
        console.warn("[ORDINAL][VALIDATION][WARNING]", warning);
      });

      const {
        locationDesignMatrix,
        locationTermNames,
        interactionColumnCounts,
        factorLevelMetadata,
        factorLevelSummaries,
        referenceCategories,
        activeParameterCount,
      } = designMatrixResult;

      if (activeParameterCount > validRows.length) {
        throw new Error("Jumlah parameter aktif melebihi jumlah observasi efektif.");
      }

      if (locationDesignMatrix.length === 0 || locationDesignMatrix[0]?.length === 0) {
        throw new Error("Location design matrix is empty.");
      }

      const expectedColumns = locationDesignMatrix[0].length;
      locationDesignMatrix.forEach((row, index) => {
        if (row.length !== expectedColumns) {
          throw new Error(`Location design matrix row length mismatch at row ${index}.`);
        }
        row.forEach((value) => {
          if (value === undefined || value === null) {
            throw new Error(`Location design matrix contains undefined at row ${index}.`);
          }
          if (Number.isNaN(value) || !Number.isFinite(value)) {
            throw new Error(`Location design matrix contains NaN at row ${index}.`);
          }
        });
      });

      if (locationDesignMatrix.length !== responseVector.length) {
        throw new Error("Location design matrix row count does not match response vector length.");
      }

      console.log("[ORDINAL][MAIN][LOCATION_MATRIX]", {
        rows: locationDesignMatrix.length,
        cols: locationDesignMatrix[0]?.length ?? 0,
        locationTermNames,
        parameterCount: activeParameterCount,
      });

      console.log("[ORDINAL][FACTOR_LEVELS]", {
        factors: factorLevelSummaries.map((summary) => ({
          name: summary.variableName,
          levels: summary.levels.length,
          reference: summary.referenceLevel,
        })),
      });

      const factorCaseSummaries = factorPredictors.map((factor) => {
        const summary = factorLevelSummaries.find((item) => item.variableName === factor.name);
        const levels = summary?.levels ?? [];
        const counts = new Map(levels.map((level) => [level, 0]));

        validRows.forEach((row, index) => {
          const level = String(getRowValue(row, factor.columnIndex));
          counts.set(level, (counts.get(level) ?? 0) + (validWeights[index] ?? 0));
        });

        return {
          variableName: factor.name,
          variableLabel: factor.label || factor.name,
          levels: levels.map((level) => {
            const n = counts.get(level) ?? 0;
            return {
              value: level,
              label: summary?.levelLabels?.[level] ?? level,
              n,
              percent: validWeightTotal > 0 ? n / validWeightTotal : 0,
            };
          }),
        };
      });

      const scaleDesignMatrix: number[][] = validRows.map((row) => {
        const rowValues: number[] = [];
        for (const predictor of scalePredictors) {
          const predictorValue = getRowValue(row, predictor.columnIndex);
          rowValues.push(toNumberOrThrow(predictorValue, predictor.name));
        }
        return rowValues;
      });
      const scaleTermNames = scalePredictors.map((predictor) => predictor.name);

      // ==================================================
      // BUILD WORKER PAYLOAD
      // ==================================================
      const modelType = scaleTermNames.length > 0 ? "general" : "location-only";
      const printIterationHistory = Boolean(
        outputParams.display.printIterationHistory ?? outputParams.display.iterationHistory
      );
      const iterationHistoryEvery = Number(
        outputParams.display.iterationHistoryEvery ?? outputParams.display.iterationHistoryStep ?? 1
      );

      console.log("[ORDINAL][MAIN][ITERATION_HISTORY_OPTIONS]", {
        printIterationHistory,
        iterationHistoryEvery,
      });

      const workerPayload = {
        analysisType: "ORDINAL_REGRESSION_PLUM",
        procedure: "PLUM",
        version: "plum-v1",
        dependent: {
          name: responseVariable.name,
          columnIndex: responseVariable.columnIndex,
          type: responseVariable.type,
          label: responseVariable.label,
          valueLabels: responseVariable.values?.map((value) => ({
            value: value.value,
            label: value.label,
          })),
        },
        factors: factorPredictors.map((factor) => ({
          name: factor.name,
          columnIndex: factor.columnIndex,
          type: factor.type,
          label: factor.label,
          valueLabels: factor.values?.map((value) => ({
            value: value.value,
            label: value.label,
          })),
        })),
        covariates: covariatePredictors.map((covariate) => ({
          name: covariate.name,
          columnIndex: covariate.columnIndex,
          type: covariate.type,
          label: covariate.label,
        })),
        factorLevelMetadata,
        weights: validWeights,
        response: {
          variableName: responseVariable.name,
          columnIndex: responseVariable.columnIndex,
          responseCategories,
          responseVector,
          categoryCount: responseCategories.length,
        },
        locationModel: {
          predictors: [
            ...covariatePredictors.map((predictor: any) => ({
              name: predictor.name,
              columnIndex: predictor.columnIndex,
              role: "covariate",
            })),
            ...factorPredictors.map((predictor: any) => {
              const summary = factorLevelSummaries.find((item) => item.variableName === predictor.name);
              return {
                name: predictor.name,
                columnIndex: predictor.columnIndex,
                role: "factor",
                levels: summary?.levels ?? [],
                referenceCategory: summary?.referenceLevel,
              };
            }),
            ...interactionTerms.map((interaction) => ({
              id: interaction.id,
              name: interaction.name,
              columnIndex: null,
              role: "interaction",
              encodedColumnCount: interactionColumnCounts[interaction.id] ?? 1,
              variables: interaction.variables.map((variable) => ({
                name: variable.name,
                columnIndex: variable.columnIndex,
              })),
            })),
          ],
          locationDesignMatrix,
          locationTermNames,
          parameterCount: locationTermNames.length,
          factorLevelMetadata,
        },
        scaleModel: {
          enabled: scaleTermNames.length > 0,
          predictors: scalePredictors.map((predictor: any) => ({
            name: predictor.name,
            columnIndex: predictor.columnIndex,
            role: "scale",
          })),
          scaleDesignMatrix,
          scaleTermNames,
          parameterCount: scaleTermNames.length,
        },
        estimationOptions: {
          linkFunction: optParams.linkFunction,
          maxIterations: optParams.maxIterations,
          maxStepHalving: optParams.maxStepHalving,
          logLikelihoodTolerance: optParams.logLikelihoodConvergence,
          parameterTolerance: optParams.parameterConvergence,
          singularityTolerance: optParams.singularityTolerance,
          confidenceLevel: optParams.confidenceInterval,
          zeroCellAdjustment: optParams.delta,
        },
        outputOptions: {
          goodnessOfFit: outputParams.display.goodnessOfFit,
          summaryStatistics: outputParams.display.summaryStatistics,
          parameterEstimates: outputParams.display.parameterEstimates,
          asymptoticCorrelation: outputParams.display.asymptoticCorrelation,
          cellInformation: outputParams.display.cellInformation,
          testOfParallelLines: outputParams.display.testOfParallelLines,
          test_of_multicolinearity: Boolean(
            outputParams.display.test_of_multicolinearity
            ?? (outputParams.display as any).multicolinearity
          ),
          iterationHistory: printIterationHistory,
          iterationHistoryStep: iterationHistoryEvery,
          printIterationHistory,
          iterationHistoryEvery,
          predictedResponseCategory: outputParams.savedVariables.predictedResponseCategory,
          estimatedResponseProbabilities: outputParams.savedVariables.estimatedResponseProbabilities,
          predictedCategoryProbability: outputParams.savedVariables.predictedCategoryProbability,
          actualCategoryProbability: outputParams.savedVariables.actualCategoryProbability,
          printLogLikelihood: outputParams.printLogLikelihood,
        },
        savedVariables: {
          predictedResponseCategory: outputParams.savedVariables.predictedResponseCategory,
          estimatedResponseProbabilities: outputParams.savedVariables.estimatedResponseProbabilities,
          predictedCategoryProbability: outputParams.savedVariables.predictedCategoryProbability,
          actualCategoryProbability: outputParams.savedVariables.actualCategoryProbability,
        },
        rowIndexMap: originalRowIndices,
        existingColumnNames: variablesFromStore.map((variable) => variable.name),
        metadata: {
          modelType,
          totalRows,
          validRows: validRows.length,
          droppedRows: droppedRows.length,
          responseCategoryCount: responseCategories.length,
          locationParameterCount: locationTermNames.length,
          scaleParameterCount: scaleTermNames.length,
          referenceCategories,
          factorLevelMetadata,
          caseProcessingSummary: {
            variableLabel: responseVariable.label || responseVariable.name,
            categories: responseCategories.map((category, index) => ({
              value: category,
              label: getValueLabel(responseVariable, category),
              n: categoryCounts[index] ?? 0,
              percent: validWeightTotal > 0 ? (categoryCounts[index] ?? 0) / validWeightTotal : 0,
            })),
            factors: factorCaseSummaries,
            validN: validWeightTotal,
            missingN: missingWeightTotal,
            totalN: totalWeightAll || validWeightTotal,
          },
        },
      };

      if (workerPayload.response.responseVector.length !== workerPayload.locationModel.locationDesignMatrix.length) {
        throw new Error("Response vector length does not match location design matrix rows.");
      }
      if (workerPayload.weights.length !== workerPayload.response.responseVector.length) {
        throw new Error("Weights length does not match response vector length.");
      }
      if (workerPayload.locationModel.locationTermNames.length !== workerPayload.locationModel.locationDesignMatrix[0].length) {
        throw new Error("Location term names length does not match design matrix columns.");
      }
      if (workerPayload.scaleModel.enabled) {
        if (workerPayload.scaleModel.scaleDesignMatrix.length !== workerPayload.response.responseVector.length) {
          throw new Error("Scale design matrix row count does not match response vector length.");
        }
        if (workerPayload.scaleModel.scaleTermNames.length !== workerPayload.scaleModel.scaleDesignMatrix[0]?.length) {
          throw new Error("Scale term names length does not match scale design matrix columns.");
        }
      }

      console.log("[ORDINAL][MAIN][PAYLOAD_TO_WORKER]", workerPayload);
      console.log("[ORDINAL][PAYLOAD]", {
        responseCategories: workerPayload.response.responseCategories.length,
        locationParameters: workerPayload.locationModel.parameterCount,
        scaleParameters: workerPayload.scaleModel.parameterCount,
        validRows: workerPayload.metadata.validRows,
      });

      const worker = new Worker(
        new URL("/workers/Regression/ordinal.worker.js", window.location.origin),
        { type: "module" }
      );

      worker.onmessage = async (event) => {
        const { type, payload } = event.data;
        console.log("[ORDINAL][MAIN][WORKER_RAW_RESULT]", event.data);
        if (type === "SUCCESS") {
          try {
            validateWorkerResult(payload);
            console.log("[ORDINAL][MAIN][WORKER_NORMALIZED_RESULT]", payload);

            await addSavedVariableColumns(payload.savedVariables);

            const formattedResult = formatOrdinalResult(payload);
            if (!formattedResult || !Array.isArray(formattedResult.sections)) {
              throw new Error("Formatter result is invalid or missing sections.");
            }

            console.log("[ORDINAL][MAIN][FORMATTED_SECTIONS]", formattedResult.sections);

            const logId = await addLog({
              log: `ORDINAL REGRESSION VARIABLES ${responseVariable.id}`,
            });

            const analyticId = await addAnalytic(logId, {
              title: "Ordinal Regression",
              note: `Link: ${optParams.linkFunction}`,
            });

            for (const section of formattedResult.sections) {
              const tableObjectForRenderer = {
                title: section.title,
                columnHeaders: section.data?.columnHeaders ?? [],
                rows: section.data?.rows ?? [],
                footer: section.note,
              };

              const payloadForRenderer = {
                tables: [tableObjectForRenderer],
              };

              await addStatistic(analyticId, {
                title: section.title,
                description: section.description || "",
                output_data: JSON.stringify(payloadForRenderer),
                components: section.title,
              });
            }

            worker.terminate();
            setIsLoading(false);
            closeModal("ORDINAL_REGRESSION");
          } catch (err) {
            console.error(err);
            setErrorMsg("Gagal menyimpan hasil.");
            setIsLoading(false);
            worker.terminate();
          }
        } else {
          console.error("[ORDINAL][MAIN][WORKER_ERROR]", payload);
          setErrorMsg(getErrorMessage(payload));
          setIsLoading(false);
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        console.error(err);
        setErrorMsg("Worker error");
        setIsLoading(false);
        worker.terminate();
      };

      worker.postMessage(workerPayload);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-background">
      <AnimatePresence>
        {tourActive && tourSteps.length > 0 && currentStep < tourSteps.length && (
          <TourPopup
            step={tourSteps[currentStep]}
            currentStep={currentStep}
            totalSteps={tourSteps.length}
            onNext={nextStep}
            onPrev={prevStep}
            onClose={endTour}
            targetElement={currentTargetElement}
          />
        )}
      </AnimatePresence>
      <ActiveElementHighlight active={tourActive} />

      <div className="px-6 py-4 flex-shrink-0">
        <h2 className="text-lg font-semibold tracking-tight">
          Ordinal Regression
        </h2>
      </div>
      <Separator />
      <div className="flex-grow px-6 overflow-y-auto min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="variables" id="ordinal-regression-variables-tab-trigger">Variables</TabsTrigger>
            <TabsTrigger value="location" id="ordinal-regression-location-tab-trigger">Location</TabsTrigger>
            <TabsTrigger value="scale" id="ordinal-regression-scale-tab-trigger">Scale</TabsTrigger>
            <TabsTrigger value="options" id="ordinal-regression-options-tab-trigger">Options</TabsTrigger>
            <TabsTrigger value="output" id="ordinal-regression-output-tab-trigger">Output</TabsTrigger>
          </TabsList>
          <div className="flex-grow min-h-0 overflow-hidden">
            <TabsContent value="variables" className="h-full mt-0">
              <VariablesTab
                availableVariables={availableVariables}
                selectedDependent={options.dependent}
                selectedFactors={options.factors}
                selectedCovariates={options.covariates}
                linkFunction={optParams.linkFunction}
                onLinkFunctionChange={(value) => setOptParams((prev) => ({ ...prev, linkFunction: value }))}
                onOptionsChange={setOptions}
              />
            </TabsContent>
            <TabsContent value="location" className="h-full mt-0">
              <LocationTab
                factors={options.factors}
                covariates={options.covariates}
                params={locationParams}
                onChange={setLocationParams}
              />
            </TabsContent>
            <TabsContent value="scale" className="h-full mt-0">
              <ScaleTab
                factors={options.factors}
                covariates={options.covariates}
                params={scaleParams}
                onChange={setScaleParams}
              />
            </TabsContent>
            <TabsContent value="options" className="h-full mt-0">
              <OptionsTab params={optParams} onChange={(p) => setOptParams(prev => ({ ...prev, ...p }))} />
            </TabsContent>
            <TabsContent value="output" className="h-full mt-0">
              <OutputTab params={outputParams} onChange={(p) => setOutputParams(prev => ({ ...prev, ...p }))} />
            </TabsContent>
          </div>
        </Tabs>
        {errorMsg && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-secondary flex-shrink-0">
        <div className="flex items-center text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="ordinal-regression-help-button"
                  variant="ghost"
                  size="icon"
                  onClick={startTour}
                  aria-label="Start feature tour"
                  className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Start feature tour</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handleAnalyze} disabled={isLoading || !options.dependent}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> OK</> : "OK"}
          </Button>
          <Button variant="outline" onClick={() => setOptions({ dependent: null, factors: [], covariates: [] })} disabled={isLoading}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => closeModal()} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrdinalMain;
