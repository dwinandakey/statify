import init, { plum_fit, plum_validate } from "./Ordinal/pkg/statify_ordinal.js";

let wasmReady = false;

function postSuccess(result) {
  self.postMessage({ type: "SUCCESS", payload: result });
  console.log("[ORDINAL][WORKER][SUCCESS_SENT]");
}

function postError(error, stage, details) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[ORDINAL][WORKER][ERROR]", {
    stage,
    message,
    details,
  });
  self.postMessage({
    type: "ERROR",
    payload: {
      message,
      stage,
      details,
    },
  });
}

async function ensureWasmReady(wasmPath) {
  if (wasmReady) return;
  const path = wasmPath || new URL("./Ordinal/pkg/statify_ordinal_bg.wasm", self.location.href).href;
  await init(path);
  wasmReady = true;
  console.log("[ORDINAL][WORKER][WASM_READY]");
}

function parseMaybeJson(value, stage) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (err) {
      throw new Error(`WASM returned invalid JSON string at ${stage}.`);
    }
  }
  return value;
}

function toFiniteNumber(value, context) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${context} is not a finite number.`);
  }
  return num;
}

function validateMainPlumPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload PLUM tidak valid: payload bukan object.");
  }
  if (payload.analysisType !== "ORDINAL_REGRESSION_PLUM") {
    throw new Error("Payload PLUM tidak valid: analysisType harus ORDINAL_REGRESSION_PLUM.");
  }
  if (payload.procedure !== "PLUM") {
    throw new Error("Payload PLUM tidak valid: procedure harus PLUM.");
  }
  if (payload.version !== "plum-v1") {
    throw new Error("Payload PLUM tidak valid: version harus plum-v1.");
  }

  if (!payload.dependent || typeof payload.dependent !== "object") {
    throw new Error("Payload PLUM tidak valid: dependent tidak tersedia.");
  }
  if (!Array.isArray(payload.factors)) {
    throw new Error("Payload PLUM tidak valid: factors harus array.");
  }
  if (!Array.isArray(payload.covariates)) {
    throw new Error("Payload PLUM tidak valid: covariates harus array.");
  }

  const dependentName = payload.dependent?.name;
  if (payload.factors.some((v) => v.name === dependentName)) {
    throw new Error("Payload PLUM tidak valid: dependent tidak boleh masuk factors.");
  }
  if (payload.covariates.some((v) => v.name === dependentName)) {
    throw new Error("Payload PLUM tidak valid: dependent tidak boleh masuk covariates.");
  }

  const factorNames = new Set(payload.factors.map((v) => v.name));
  for (const covariate of payload.covariates) {
    if (factorNames.has(covariate.name)) {
      throw new Error("Payload PLUM tidak valid: variabel tidak boleh muncul di factors dan covariates.");
    }
  }

  const responseVector = payload?.response?.responseVector;
  const responseCategories = payload?.response?.responseCategories;
  const weights = Array.isArray(payload?.weights) ? payload.weights : null;
  if (!Array.isArray(responseVector) || responseVector.length === 0) {
    throw new Error("Payload PLUM tidak valid: missing response.responseVector.");
  }
  if (!Array.isArray(responseCategories) || responseCategories.length < 2) {
    throw new Error("Payload PLUM tidak valid: response.responseCategories minimal 2.");
  }
  if (payload?.response?.categoryCount !== responseCategories.length) {
    throw new Error("Payload PLUM tidak valid: response.categoryCount mismatch.");
  }

  const locationDesignMatrix = payload?.locationModel?.locationDesignMatrix;
  const locationTermNames = payload?.locationModel?.locationTermNames;
  if (!Array.isArray(locationDesignMatrix) || locationDesignMatrix.length === 0) {
    throw new Error("Payload PLUM tidak valid: locationDesignMatrix kosong.");
  }
  if (!Array.isArray(locationTermNames) || locationTermNames.length === 0) {
    throw new Error("Payload PLUM tidak valid: locationTermNames kosong.");
  }

  if (locationDesignMatrix.length !== responseVector.length) {
    throw new Error("Payload PLUM tidak valid: jumlah baris X != panjang responseVector.");
  }
  if (weights && weights.length !== responseVector.length) {
    throw new Error("Payload PLUM tidak valid: panjang weights tidak sama dengan responseVector.");
  }

  const expectedColumns = locationDesignMatrix[0].length;
  if (expectedColumns !== locationTermNames.length) {
    throw new Error("Payload PLUM tidak valid: jumlah kolom X != jumlah locationTermNames.");
  }

  locationDesignMatrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== expectedColumns) {
      throw new Error(`Payload PLUM tidak valid: row length mismatch at row ${rowIndex}.`);
    }
    row.forEach((value, colIndex) => {
      toFiniteNumber(value, `locationDesignMatrix[${rowIndex}][${colIndex}]`);
    });
  });

  responseVector.forEach((value, index) => {
    const numeric = toFiniteNumber(value, `responseVector[${index}]`);
    const upper = responseCategories.length;
    if (numeric < 1 || numeric > upper) {
      throw new Error("responseVector contains values outside 1..J.");
    }
  });
  if (weights) {
    weights.forEach((value, index) => {
      const numeric = toFiniteNumber(value, `weights[${index}]`);
      if (numeric <= 0) {
        throw new Error("weights must be positive for valid cases.");
      }
    });
  }

  const scaleEnabled = Boolean(payload?.scaleModel?.enabled);
  const scaleDesignMatrix = payload?.scaleModel?.scaleDesignMatrix || [];
  const scaleTermNames = payload?.scaleModel?.scaleTermNames || [];
  if (scaleEnabled) {
    if (!Array.isArray(scaleDesignMatrix) || scaleDesignMatrix.length === 0) {
      throw new Error("Payload PLUM tidak valid: scaleDesignMatrix kosong.");
    }
    if (!Array.isArray(scaleTermNames) || scaleTermNames.length === 0) {
      throw new Error("Payload PLUM tidak valid: scaleTermNames kosong.");
    }
    if (scaleDesignMatrix.length !== responseVector.length) {
      throw new Error("Payload PLUM tidak valid: jumlah baris Z != panjang responseVector.");
    }
    const expectedScaleCols = scaleDesignMatrix[0].length;
    if (expectedScaleCols !== scaleTermNames.length) {
      throw new Error("Payload PLUM tidak valid: jumlah kolom Z != jumlah scaleTermNames.");
    }
    scaleDesignMatrix.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== expectedScaleCols) {
        throw new Error(`Payload PLUM tidak valid: scale row length mismatch at row ${rowIndex}.`);
      }
      row.forEach((value, colIndex) => {
        toFiniteNumber(value, `scaleDesignMatrix[${rowIndex}][${colIndex}]`);
      });
    });
  }

  const estimation = payload?.estimationOptions || {};
  if (!(estimation.maxIterations > 0)) {
    throw new Error("Payload PLUM tidak valid: maxIterations harus > 0.");
  }
  if (estimation.maxStepHalving < 0) {
    throw new Error("Payload PLUM tidak valid: maxStepHalving harus >= 0.");
  }
  if (!(estimation.parameterTolerance > 0)) {
    throw new Error("Payload PLUM tidak valid: parameterTolerance harus > 0.");
  }
  if (!(estimation.logLikelihoodTolerance >= 0)) {
    throw new Error("Payload PLUM tidak valid: logLikelihoodTolerance harus >= 0.");
  }
  if (!(estimation.singularityTolerance > 0)) {
    throw new Error("Payload PLUM tidak valid: singularityTolerance harus > 0.");
  }
  if (!(estimation.confidenceLevel >= 50 && estimation.confidenceLevel <= 99.99)) {
    throw new Error("Payload PLUM tidak valid: confidenceLevel harus 50..99.99.");
  }

  const metadata = payload?.metadata || {};
  if (typeof metadata.totalRows !== "number" || typeof metadata.validRows !== "number") {
    throw new Error("Payload PLUM tidak valid: metadata rows missing.");
  }

  payload.factors.forEach((factor) => {
    if (Array.isArray(factor?.valueLabels) && factor.valueLabels.length > 0) return;
  });
}

function normalizeOutputOptionsForCompatibility(payload) {
  if (!payload || typeof payload !== "object") return;
  const outputOptions = payload.outputOptions || {};
  if (
    outputOptions.test_of_multicolinearity === undefined
    && outputOptions.multicolinearity !== undefined
  ) {
    outputOptions.test_of_multicolinearity = Boolean(outputOptions.multicolinearity);
  }
  payload.outputOptions = outputOptions;
}

function normalizeParameterEstimate(row, index) {
  if (!row || typeof row !== "object") {
    return {
      parameter: `param_${index + 1}`,
      estimate: Number.NaN,
      standardError: null,
      waldStatistic: null,
      degreesOfFreedom: 1,
      significance: null,
      confidenceIntervalLower: null,
      confidenceIntervalUpper: null,
    };
  }

  const estimate = typeof row.estimate === "number" ? row.estimate : Number(row.estimate);
  const stdError = typeof row.stdError === "number"
    ? row.stdError
    : (typeof row.std_error === "number" ? row.std_error : null);
  const waldStatistic = typeof row.wald === "number" ? row.wald : (typeof row.waldStatistic === "number" ? row.waldStatistic : null);
  const significance = typeof row.sig === "number" ? row.sig : (typeof row.significance === "number" ? row.significance : null);
  const confidenceIntervalLower = typeof row.lower === "number"
    ? row.lower
    : (typeof row.confidenceIntervalLower === "number" ? row.confidenceIntervalLower : null);
  const confidenceIntervalUpper = typeof row.upper === "number"
    ? row.upper
    : (typeof row.confidenceIntervalUpper === "number" ? row.confidenceIntervalUpper : null);
  const parameter = row.parameter || row.variable || `param_${index + 1}`;
  const degreesOfFreedom = row.degreesOfFreedom ?? row.df ?? (row.isRedundant ? 0 : 1);

  return {
    parameter,
    estimate,
    standardError: stdError ?? null,
    waldStatistic: waldStatistic ?? null,
    degreesOfFreedom,
    significance: significance ?? null,
    confidenceIntervalLower: confidenceIntervalLower ?? null,
    confidenceIntervalUpper: confidenceIntervalUpper ?? null,
    isRedundant: Boolean(row.isRedundant ?? row.is_redundant ?? false),
    group: row.group,
    variable: row.variable ?? parameter,
    stdError: stdError ?? null,
    wald: waldStatistic ?? null,
    sig: significance ?? null,
    lower: confidenceIntervalLower ?? null,
    upper: confidenceIntervalUpper ?? null,
    df: degreesOfFreedom,
  };
}

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function normalizeModelSummaryRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    ...row,
    minus2LogLikelihood: pickNumber(row.minus2LogLikelihood, row.minus2_log_likelihood),
    logLikelihood: pickNumber(row.logLikelihood, row.log_likelihood),
    converged: Boolean(row.converged),
    iterations: pickNumber(row.iterations),
    method: row.method,
  };
}

function normalizeInterceptOnlyRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    ...row,
    minus2LogLikelihood: pickNumber(row.minus2LogLikelihood, row.minus2_log_likelihood),
    logLikelihood: pickNumber(row.logLikelihood, row.log_likelihood),
  };
}

function normalizeFitStat(row) {
  if (!row || typeof row !== "object") return null;
  return {
    ...row,
    chiSquare: pickNumber(row.chiSquare, row.chi_square),
    df: pickNumber(row.df),
    sig: pickNumber(row.sig),
  };
}

function normalizePseudoRSquare(row) {
  if (!row || typeof row !== "object") return null;
  return {
    ...row,
    coxSnell: pickNumber(row.coxSnell, row.cox_snell),
    nagelkerke: pickNumber(row.nagelkerke),
    mcfadden: pickNumber(row.mcfadden),
  };
}

function normalizeSummaryStatistics(summary) {
  if (!summary || typeof summary !== "object") return null;
  return {
    ...summary,
    model: normalizeModelSummaryRow(summary.model),
    interceptOnly: normalizeInterceptOnlyRow(summary.interceptOnly || summary.intercept_only),
    modelChiSquare: normalizeFitStat(summary.modelChiSquare || summary.model_chi_square),
    pseudoRSquare: normalizePseudoRSquare(summary.pseudoRSquare || summary.pseudo_r_square),
  };
}

function normalizeGoodnessOfFit(gof) {
  if (!gof || typeof gof !== "object") return null;
  return {
    ...gof,
    pearson: normalizeFitStat(gof.pearson),
    deviance: normalizeFitStat(gof.deviance),
  };
}

function normalizeParallelLinesTest(test) {
  if (!test || typeof test !== "object") return null;
  return {
    ...test,
    minus2LogLikelihoodParallel: pickNumber(
      test.minus2LogLikelihoodParallel,
      test.minus2_log_likelihood_parallel
    ),
    minus2LogLikelihoodNonParallel: pickNumber(
      test.minus2LogLikelihoodNonParallel,
      test.minus2_log_likelihood_non_parallel
    ),
    chiSquare: pickNumber(test.chiSquare, test.chi_square),
    df: pickNumber(test.df),
    sig: pickNumber(test.sig),
    converged: Boolean(test.converged),
  };
}

function normalizeCollinearityDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== "object") return null;
  const rawRows = Array.isArray(diagnostics.rows) ? diagnostics.rows : [];
  const rows = rawRows
    .map((row) => {
      const gvif = pickNumber(row.gvif);
      const adjustedGvif = pickNumber(row.adjustedGvif, row.adjusted_gvif);
      const df = pickNumber(row.df);
      if (gvif === null || adjustedGvif === null || df === null) return null;
      return {
        predictor: String(row.predictor ?? ""),
        predictorType: String(row.predictorType ?? row.predictor_type ?? ""),
        predictor_type: String(row.predictorType ?? row.predictor_type ?? ""),
        df,
        gvif,
        adjustedGvif,
        adjusted_gvif: adjustedGvif,
        interpretation: String(row.interpretation ?? ""),
      };
    })
    .filter(Boolean);

  return {
    ...diagnostics,
    rows,
    warnings: Array.isArray(diagnostics.warnings) ? diagnostics.warnings : [],
  };
}

function normalizeWasmResult(result, mainPayload) {
  const base = result && typeof result === "object" ? result : {};
  const rawParameterEstimates = Array.isArray(base.parameterEstimates)
    ? base.parameterEstimates
    : (Array.isArray(base.parameter_estimates) ? base.parameter_estimates : []);
  const parameterEstimates = rawParameterEstimates.map(normalizeParameterEstimate);

  const thresholdFromGroup = rawParameterEstimates.filter((row) => row?.group === "Threshold");
  const locationFromGroup = rawParameterEstimates.filter((row) => row?.group === "Location");
  const scaleFromGroup = rawParameterEstimates.filter((row) => row?.group === "Scale");

  const thresholdEstimates = Array.isArray(base.thresholdEstimates)
    ? base.thresholdEstimates.map(normalizeParameterEstimate)
    : thresholdFromGroup.map(normalizeParameterEstimate);
  const locationParameterEstimates = Array.isArray(base.locationParameterEstimates)
    ? base.locationParameterEstimates.map(normalizeParameterEstimate)
    : locationFromGroup.map(normalizeParameterEstimate);
  const scaleParameterEstimates = Array.isArray(base.scaleParameterEstimates)
    ? base.scaleParameterEstimates.map(normalizeParameterEstimate)
    : scaleFromGroup.map(normalizeParameterEstimate);

  const iterations = typeof base.iterations === "number" ? base.iterations : 0;
  const logLikelihood = typeof base.logLikelihood === "number"
    ? base.logLikelihood
    : (typeof base.log_likelihood === "number" ? base.log_likelihood : null);
  const minus2LogLikelihood = typeof base.minus2LogLikelihood === "number"
    ? base.minus2LogLikelihood
    : (typeof base.minus2_log_likelihood === "number" ? base.minus2_log_likelihood : null);

  const logLikelihoodConstant = typeof base.logLikelihoodConstant === "number"
    ? base.logLikelihoodConstant
    : (typeof base.log_likelihood_constant === "number" ? base.log_likelihood_constant : null);
  const logLikelihoodKernel = typeof base.logLikelihoodKernel === "number"
    ? base.logLikelihoodKernel
    : (typeof base.log_likelihood_kernel === "number" ? base.log_likelihood_kernel : null);
  const logLikelihoodComplete = typeof base.logLikelihoodComplete === "number"
    ? base.logLikelihoodComplete
    : (typeof base.log_likelihood_complete === "number" ? base.log_likelihood_complete : null);
  const logLikelihoodDisplayed = typeof base.logLikelihoodDisplayed === "number"
    ? base.logLikelihoodDisplayed
    : (typeof base.log_likelihood_displayed === "number" ? base.log_likelihood_displayed : null);
  const minus2LogLikelihoodDisplayed = typeof base.minus2LogLikelihoodDisplayed === "number"
    ? base.minus2LogLikelihoodDisplayed
    : (typeof base.minus2_log_likelihood_displayed === "number" ? base.minus2_log_likelihood_displayed : null);
  const logLikelihoodDisplayMode = typeof base.logLikelihoodDisplayMode === "string"
    ? base.logLikelihoodDisplayMode
    : (typeof base.log_likelihood_display_mode === "string" ? base.log_likelihood_display_mode : null);

  const metadata = {
    modelType: mainPayload?.metadata?.modelType,
    totalRows: mainPayload?.metadata?.totalRows,
    validRows: mainPayload?.metadata?.validRows,
    droppedRows: mainPayload?.metadata?.droppedRows,
    responseCategoryCount: mainPayload?.metadata?.responseCategoryCount,
    locationParameterCount: mainPayload?.metadata?.locationParameterCount,
    scaleParameterCount: mainPayload?.metadata?.scaleParameterCount,
    caseProcessingSummary: mainPayload?.metadata?.caseProcessingSummary,
  };

  const iterationHistoryMeta = base.iterationHistoryMeta
    || base.iteration_history_meta
    || null;
  const summaryStatistics = normalizeSummaryStatistics(
    base.summaryStatistics || base.summary_statistics
  );
  const goodnessOfFit = normalizeGoodnessOfFit(base.goodnessOfFit || base.goodness_of_fit);
  const testOfParallelLines = normalizeParallelLinesTest(
    base.testOfParallelLines || base.test_of_parallel_lines
  );
  const collinearityDiagnostics = normalizeCollinearityDiagnostics(
    base.collinearityDiagnostics || base.collinearity_diagnostics
  );
  const savedVariables = base.savedVariables || base.saved_variables || null;

  return {
    ...base,
    converged: Boolean(base.converged ?? base.convergence ?? false),
    iterations,
    logLikelihood,
    minus2LogLikelihood,
    logLikelihoodConstant,
    logLikelihoodKernel,
    logLikelihoodComplete,
    logLikelihoodDisplayed,
    minus2LogLikelihoodDisplayed,
    logLikelihoodDisplayMode,
    parameterEstimates,
    thresholdEstimates,
    locationParameterEstimates,
    scaleParameterEstimates,
    summaryStatistics,
    goodnessOfFit,
    testOfParallelLines,
    collinearityDiagnostics,
    estimationOptions: mainPayload?.estimationOptions || {},
    outputOptions: mainPayload?.outputOptions || {},
    savedVariableOptions: mainPayload?.savedVariables || {},
    savedVariables,
    iterationHistory: Array.isArray(base.iterationHistory) ? base.iterationHistory : (base.iteration_history || []),
    iterationHistoryMeta,
    warnings: Array.isArray(base.warnings) ? base.warnings : [],
    metadata,
  };
}

function validateNormalizedResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Worker result missing.");
  }
  if (typeof result.converged !== "boolean") {
    throw new Error("Worker result missing converged.");
  }
  if (!Array.isArray(result.parameterEstimates)) {
    throw new Error("Worker result missing parameterEstimates.");
  }
  result.parameterEstimates.forEach((estimate, index) => {
    if (estimate && typeof estimate === "object" && "estimate" in estimate) {
      toFiniteNumber(estimate.estimate, `parameterEstimates[${index}].estimate`);
    }
  });
}

self.onmessage = async (event) => {
  console.log("[ORDINAL][WORKER][RECEIVED]", event.data);
  try {
    const mainPayload = event.data;
    normalizeOutputOptionsForCompatibility(mainPayload);
    const wasmPath = event.data?.wasmPath || mainPayload?.wasmPath;
    const outputOptions = mainPayload?.outputOptions || {};
    const printIterationHistory = Boolean(
      outputOptions?.printIterationHistory ?? outputOptions?.iterationHistory
    );
    const iterationHistoryEvery = Number(
      outputOptions?.iterationHistoryEvery ?? outputOptions?.iterationHistoryStep ?? 1
    );

    console.log("[ORDINAL][WORKER][ITERATION_HISTORY_OPTIONS]", {
      printIterationHistory,
      iterationHistoryEvery,
    });
    if (Boolean(outputOptions?.test_of_multicolinearity ?? outputOptions?.multicolinearity)) {
      console.log("[ORDINAL][MULTICOLLINEARITY][START]");
      console.log("[ORDINAL][MULTICOLLINEARITY][PAYLOAD]", {
        rows: mainPayload?.locationModel?.locationDesignMatrix?.length ?? 0,
        columns: mainPayload?.locationModel?.locationTermNames?.length ?? 0,
        predictors: mainPayload?.locationModel?.predictors?.map((predictor) => ({
          name: predictor.name,
          role: predictor.role,
        })) ?? [],
      });
    }

    validateMainPlumPayload(mainPayload);
    console.log("[ORDINAL][WORKER][PAYLOAD_VALID]", {
      rows: mainPayload.response.responseVector.length,
      categories: mainPayload.response.responseCategories,
      terms: mainPayload.locationModel.locationTermNames,
    });

    await ensureWasmReady(wasmPath);

    if (typeof plum_validate === "function") {
      const rawValidation = await Promise.resolve(plum_validate(mainPayload));
      console.log("[ORDINAL][WORKER][PLUM_VALIDATE_RAW]", rawValidation);
      const validation = parseMaybeJson(rawValidation, "plum_validate");
      console.log("[ORDINAL][WORKER][PLUM_VALIDATE_PARSED]", validation);
      if (validation && validation.valid === false) {
        const errors = Array.isArray(validation.errors) ? validation.errors.join(" ") : "Input tidak valid.";
        throw new Error(errors);
      }
    }

    const rawResult = await Promise.resolve(plum_fit(mainPayload));
    console.log("[ORDINAL][WORKER][PLUM_FIT_RAW]", rawResult);
    const parsedResult = parseMaybeJson(rawResult, "plum_fit");
    console.log("[ORDINAL][WORKER][PLUM_FIT_PARSED]", parsedResult);

    if (parsedResult?.errors && Array.isArray(parsedResult.errors) && parsedResult.errors.length > 0) {
      throw new Error(parsedResult.errors.join(" "));
    }

    const normalizedResult = normalizeWasmResult(parsedResult, mainPayload);
    if (Boolean(outputOptions?.test_of_multicolinearity ?? outputOptions?.multicolinearity)) {
      console.log("[ORDINAL][MULTICOLLINEARITY][RUST_RESULT]", normalizedResult.collinearityDiagnostics);
    }
    console.log("[ORDINAL][WORKER][NORMALIZED_RESULT]", normalizedResult);
    console.log("[ORDINAL][PLUM_ESTIMATION]", {
      converged: normalizedResult.converged,
      iterations: normalizedResult.iterations,
      minus2LogLikelihood: normalizedResult.minus2LogLikelihoodDisplayed ?? normalizedResult.minus2LogLikelihood,
      thresholdParameters: normalizedResult.thresholdEstimates?.length ?? 0,
      locationParameters: normalizedResult.locationParameterEstimates?.length ?? 0,
    });
    console.log("[ORDINAL][WORKER][ITERATION_HISTORY_RESULT]", {
      rows: Array.isArray(normalizedResult.iterationHistory) ? normalizedResult.iterationHistory.length : 0,
      meta: normalizedResult.iterationHistoryMeta || null,
    });

    validateNormalizedResult(normalizedResult);

    postSuccess(normalizedResult);
  } catch (error) {
    const outputOptions = event.data?.outputOptions || {};
    if (Boolean(outputOptions?.test_of_multicolinearity ?? outputOptions?.multicolinearity)) {
      console.error("[ORDINAL][MULTICOLLINEARITY][ERROR]", error);
    }
    postError(error, "worker", { receivedKeys: Object.keys(event.data || {}) });
  }
};
